/** Gap-scheme first-level blocks (docs/reviews/run-offense.md, gap schemes):
 * GAP_OUT     a playside man aligned outside his blocker is blocked out, not
 *             down across the blocker's face into the trap hole
 *             (src/sim/behaviors/blocking.ts planRunBlocking);
 * CUTOFF_SEAL a solo backside cutoff seals his man's play-side front, so the
 *             pair walls toward the play instead of drifting away from it
 *             (src/sim/engagement.ts createEngagement);
 * GAP_FIT     a first-level down block closes on his man's near surface on
 *             the zone track's depth law instead of running through him
 *             (RunBlocker.attack). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Each first-level block's planned drive and its pair one second after the
 * blocker first engaged his man (play-side frame: y > 0 toward the play). */
async function blocks(flags: Record<string, string>, id: string) {
  for (const k of ['GAP_OUT', 'CUTOFF_SEAL', 'GAP_FIT']) vi.stubEnv(k, flags[k] ?? '0');
  vi.resetModules();
  const { makeSim, rosters } = await import('../scripts/diag/zone-lab/lab.js');
  const { RunBlocker, playSideSign } = await import('../src/sim/behaviors/blocking.js');
  const [concept, dir, formation, look] = id.split('/');
  const sim = makeSim({ concept, dir, formation, look, roster: 'pair11', seed: 77 } as never, rosters());
  const ps = playSideSign(sim, sim.offCall.run!), ad = sim.attackDir('O');
  const plans = new Map(sim.offense.filter(b => b.behavior instanceof RunBlocker)
    .map(b => [b.slot, { b, plan: (b.behavior as InstanceType<typeof RunBlocker>).plan }]));
  const y0 = new Map(sim.agents.map(a => [a, a.pos.y]));
  const out = new Map<string, { kind: string; target: string; drive: number; seal?: number; mid?: number; depth?: number; vx?: number; vy?: number }>();
  const engaged = new Map<string, number>();
  for (const [slot, { plan }] of plans) if (plan.target) out.set(slot, { kind: plan.kind, target: plan.target.slot, drive: (plan.drive?.y ?? 0) * ps });
  while (sim.phase === 'live' && sim.t < 2.5) {
    sim.tick();
    for (const [slot, { b, plan }] of plans) {
      const d = plan.target, r = out.get(slot);
      if (!d || !r) continue;
      if (!engaged.has(slot) && b.engagement?.defender === d) {
        engaged.set(slot, sim.t);
        Object.assign(r, { seal: b.engagement.sealTarget, vx: b.vel.x * ad, vy: b.vel.y * ps });
      }
      if (engaged.has(slot) && r.mid === undefined && sim.t >= engaged.get(slot)! + 1) {
        r.mid = ((b.pos.y + d.pos.y) - (y0.get(b)! + y0.get(d)!)) / 2 * ps;
        r.depth = (d.pos.x - sim.los) * ad;
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

  it.each(['counter/weak/i_pro_21/wide9', 'power/strong/i_pro_21/over3', 'counter/strong/ace_12/over3'])(
    'CUTOFF_SEAL: the backside cutoff walls his man toward the play (%s)', async id => {
      const off = await blocks({}, id), on = await blocks({ CUTOFF_SEAL: '1' }, id);
      const cut = [...off].find(([, r]) => r.kind === 'cutoff')!;
      const a = cut[1], b = on.get(cut[0])!;
      expect(b.target).toBe(a.target);
      // Same assignment and drive; only the seal objective changes.
      expect(b.drive).toBe(a.drive);
      expect(Math.sign(b.seal!)).toBe(-Math.sign(a.seal!));
      expect(a.mid!).toBeLessThan(0);
      expect(b.mid!).toBeGreaterThan(0);
    }, 60000);

  it.each(['power/strong/ace_12/over3', 'trap/weak/i_pro_21/wide9'])(
    'GAP_FIT: down blocks meet their man slower upfield, still working across (%s)', async id => {
      const off = await blocks({}, id), on = await blocks({ GAP_FIT: '1' }, id);
      let n = 0;
      for (const [slot, a] of off) {
        const b = on.get(slot)!;
        if (a.kind !== 'down' || a.vx === undefined || b.vx === undefined) continue;
        n++;
        expect(b.vx).toBeLessThan(a.vx - .05);
        expect(Math.abs(b.vy!)).toBeGreaterThan(Math.abs(a.vy!) * .8);
      }
      expect(n).toBeGreaterThan(0);
    }, 60000);
});
