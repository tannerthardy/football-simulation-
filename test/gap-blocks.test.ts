/** Gap-scheme first-level blocks (docs/reviews/run-offense.md, gap schemes):
 * GAP_OUT     a playside man aligned outside his blocker is blocked out, not
 *             down across the blocker's face into the trap hole
 *             (src/sim/behaviors/blocking.ts planRunBlocking);
 * CUTOFF_SEAL a solo backside cutoff takes his rep from his man's play-side
 *             front, driving him away from the play (src/sim/engagement.ts
 *             createEngagement);
 * GAP_FIT     a first-level down block by a lineman or inline end closes on
 *             his man's near surface on the zone track's depth law instead of
 *             running through him (RunBlocker.attack);
 * TRAP_FIT    a trapper on the last leg of his pull fits his man, as the
 *             counter kicker does (RunBlocker.update). */
import { afterEach, describe, expect, it, vi } from 'vitest';
// These compare the flag on and off on plays recorded on the installed flat
// line (1.3 yd splits, 0.55 yd depth). The tracked line (OL_ALIGN) changes
// the plays themselves; it is judged by lab arms (docs/reviews/presnap.md).
vi.hoisted(() => { process.env.OL_ALIGN = '0'; });
// CUTOFF_SEAL's outcome (in front of his man a second after contact) was measured under the legacy push; PAD_LEVERAGE and DL_ANCHOR change the contact forces.
vi.hoisted(() => { process.env.PAD_LEVERAGE = '0'; process.env.DL_ANCHOR = '0'; });

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Each first-level block's planned drive and its pair one second after the
 * blocker first engaged his man (play-side frame: y > 0 toward the play). */
async function blocks(flags: Record<string, string>, id: string) {
  for (const k of ['GAP_OUT', 'CUTOFF_SEAL', 'GAP_FIT', 'TRAP_FIT']) vi.stubEnv(k, flags[k] ?? '0');
  // Witness bodies are the lab roster before FRONT_FIT (test/front-fit.test.ts).
  vi.stubEnv('FRONT_FIT', '0');
  vi.resetModules();
  const { makeSim, rosters } = await import('../scripts/diag/zone-lab/lab.js');
  const { RunBlocker, playSideSign } = await import('../src/sim/behaviors/blocking.js');
  const [concept, dir, formation, look] = id.split('/');
  const sim = makeSim({ concept, dir, formation, look, roster: 'pair11', seed: 77 } as never, rosters());
  const ps = playSideSign(sim, sim.offCall.run!), ad = sim.attackDir('O');
  const plans = new Map(sim.offense.filter(b => b.behavior instanceof RunBlocker)
    .map(b => [b.slot, { b, plan: (b.behavior as InstanceType<typeof RunBlocker>).plan }]));
  const y0 = new Map(sim.agents.map(a => [a, a.pos.y]));
  const out = new Map<string, { kind: string; target: string; drive: number; seal?: number; mid?: number; depth?: number; vx?: number; vy?: number;
    ahead?: number; side?: number; phi?: number; repDrive?: { x: number; y: number }; engaged?: number }>();
  const engaged = new Map<string, number>();
  for (const [slot, { plan }] of plans) if (plan.target) out.set(slot, { kind: plan.kind, target: plan.target.slot, drive: (plan.drive?.y ?? 0) * ps });
  while (sim.phase === 'live' && sim.t < 2.5) {
    sim.tick();
    for (const [slot, { b, plan }] of plans) {
      const d = plan.target, r = out.get(slot);
      if (!d || !r) continue;
      if (!engaged.has(slot) && b.engagement?.defender === d) {
        engaged.set(slot, sim.t);
        Object.assign(r, { engaged: sim.t, seal: b.engagement.sealTarget, vx: b.vel.x * ad, vy: b.vel.y * ps,
          repDrive: b.engagement.drive && { x: b.engagement.drive.x * ad, y: b.engagement.drive.y * ps } });
      }
      if (engaged.has(slot) && r.mid === undefined && sim.t >= engaged.get(slot)! + 1) {
        r.mid = ((b.pos.y + d.pos.y) - (y0.get(b)! + y0.get(d)!)) / 2 * ps;
        r.depth = (d.pos.x - sim.los) * ad;
        // Blocker relative to his man: ahead > 0 in front of him (toward our
        // backfield), side > 0 on his play side; phi in the rep's own frame.
        r.ahead = (d.pos.x - b.pos.x) * ad;
        r.side = (b.pos.y - d.pos.y) * ps;
        r.phi = b.engagement?.defender === d ? b.engagement.phi * ps : undefined;
      }
    }
  }
  return out;
}

describe('gap-scheme first-level blocks', () => {
  it('GAP_OUT: the trap-side tackle blocks the end outside him out, and only him', async () => {
    const id = 'trap/weak/i_pro_21/wide9';
    const off = await blocks({}, id), on = await blocks({ GAP_OUT: '1' }, id);
    const a = off.get('LT')!, b = on.get('LT')!;
    expect(a.kind).toBe('down');
    expect(b.kind).toBe('down');
    expect(b.target).toBe(a.target);
    expect(a.drive).toBeLessThan(0);
    expect(b.drive).toBeGreaterThan(0);
    // Driven out, the end ends up wider and no deeper than when washed down.
    expect(b.mid!).toBeGreaterThan(a.mid! + .4);
    expect(b.depth!).toBeLessThanOrEqual(a.depth! + .1);
    // The center's man is inside him: still a down block.
    expect(on.get('C')!.drive).toBe(off.get('C')!.drive);
    expect(on.get('C')!.drive).toBeLessThan(0);
  }, 60000);

  it('GAP_OUT: a man inside an off-tackle hole is still blocked down', async () => {
    // Power weak against odd3: the tackle's man is 0.78 yd outside him but
    // inside the C-gap hole; blocking him out would drive him across it.
    const on = await blocks({ GAP_OUT: '1' }, 'power/weak/i_pro_21/odd3');
    const lt = on.get('LT')!;
    expect(lt.kind).toBe('down');
    expect(lt.drive).toBeLessThan(0);
  }, 60000);

  it.each(['power/strong/i_pro_21/over3', 'counter/strong/ace_12/over3'])(
    'CUTOFF_SEAL: the backside cutoff works to his man\'s play-side front and walls him there (%s)', async id => {
      const off = await blocks({}, id), on = await blocks({ CUTOFF_SEAL: '1' }, id);
      const cut = [...on].find(([, r]) => r.kind === 'cutoff')!;
      const a = off.get(cut[0])!, b = cut[1];
      expect(b.target).toBe(a.target);
      // Same assignment and approach; the rep's drive line changes from the
      // installed play-side push to one through the man away from the play.
      expect(b.drive).toBe(a.drive);
      expect(a.repDrive!.y).toBeGreaterThan(0);
      expect(b.repDrive!.x).toBeGreaterThan(.8);
      expect(b.repDrive!.y).toBeLessThan(-.4);
      // A second after contact he is in front of his man, not on his
      // backside, and within 67 deg of the rep's axis: not beside or past him
      // (|phi| >= 1, where the earlier seal-only objective left him).
      expect(b.ahead!).toBeGreaterThan(.1);
      expect(b.side!).toBeGreaterThan(-.3);
      expect(Math.abs(b.phi!)).toBeLessThan(.75);
    }, 60000);

  it.each(['power/strong/ace_12/over3', 'trap/weak/i_pro_21/wide9', 'trap/strong/i_pro_21/wide9'])(
    'GAP_FIT: down blocks meet their man slower upfield, still working across (%s)', async id => {
      const off = await blocks({}, id), on = await blocks({ GAP_FIT: '1' }, id);
      let n = 0, slower = 0;
      for (const [slot, a] of off) {
        const b = on.get(slot)!;
        if (a.kind !== 'down' || a.vx === undefined || b.vx === undefined) continue;
        n++;
        slower += a.vx - b.vx;
        // A blocker coming in from well to the side may close to the man's
        // hip, so the law need not slow him; it never speeds him up.
        expect(b.vx).toBeLessThan(a.vx + .1);
        expect(Math.abs(b.vy!)).toBeGreaterThan(Math.abs(a.vy!) * .8);
      }
      expect(n).toBeGreaterThan(0);
      expect(slower / n).toBeGreaterThan(.05);
    }, 60000);

  it('GAP_FIT: an inline end on a down block approaches on the same law', async () => {
    const off = await blocks({}, 'trap/strong/i_pro_21/wide9'), on = await blocks({ GAP_FIT: '1' }, 'trap/strong/i_pro_21/wide9');
    expect(off.get('Y')!.kind).toBe('down');
    expect(on.get('Y')!.vx!).toBeLessThan(off.get('Y')!.vx! - .3);
  }, 60000);

  it('TRAP_FIT: on his last leg the trapper fits his man, never later than before', async () => {
    let earlier = 0;
    for (const look of ['over2', 'off1', 'over3']) {
      const id = `trap/weak/i_pro_21/${look}`;
      const off = await blocks({}, id), on = await blocks({ TRAP_FIT: '1' }, id);
      const trap = [...off].find(([, r]) => r.kind === 'pull')!;
      const a = trap[1], b = on.get(trap[0])!;
      expect(b.target).toBe(a.target);
      expect(b.engaged!).toBeLessThanOrEqual(a.engaged!);
      if (b.engaged! < a.engaged!) earlier++;
    }
    expect(earlier).toBeGreaterThan(0);
  }, 120000);
});
