/** PUNCH_STRIKE (engagement.ts punch; experimental, off; with PUNCH): the punch's press into the man is a strike, not
 * a standing request. A protector who punched and then held the touch is not propped on his own drive, so a spin that
 * takes the load away does not pitch him over; a protector still propped on the man when he is swum does go down.
 * Fixtures: four verticals (nativeTraceSetup), on the engine defaults (the reference stack).
 *
 * The first two cases isolate PUNCH_STRIKE's own effect, so they pin ANCHOR_BASE (which bounds the protector's lean and
 * removes the spin fall the first case stages), PURSUIT_COMMIT (which shifts the second scene) and PASS_SET_SEEN (his
 * set on his picture of the rusher, a beat later, which shifts both) off. The third shows, on the full engine-59 stack
 * (PUNCH_STRIKE, ANCHOR_BASE, PURSUIT_COMMIT, PASS_SET_SEEN, QB_BODY_SEEN, RUSH_PROMISE on), that a propped fall still
 * happens: the left guard leans about 1215 N into a 1450 N press; his man goes from a club to a long-arm, the press
 * drops to about 355 N, and he falls forward onto the man (re-found on engine-59 by a native search: 7 OL falls in 864
 * staged scenes, 9 with PASS_SET_SEEN off; this is the one with the propped signature, lean near the press then the
 * press taken away). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** OL falls before the throw: slot, time, and the rusher's move on that blocker's rep at the time. */
async function falls(flags: Record<string, string>, roster: number, coverage = 'cover2', seed = 5) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  for (const [k, v] of Object.entries(flags)) vi.stubEnv(k, v);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster, formation: 'gun_doubles_11', flip: false }));
  const ol = new Set(sim.offense.filter((a: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot)).map((a: any) => a.idx));
  const moves = new Map<number, string>();
  while (sim.phase === 'live' && sim.t < 5) {
    for (const e of sim.engagements) if (e.type === 'pass') moves.set(e.blocker.idx, e.move);
    sim.tick();
  }
  const thr = sim.events.find((e: any) => e.type === 'throw')?.t ?? Infinity;
  return sim.events.filter((e: any) => e.type === 'fall' && ol.has(e.a) && e.t >= 0.5 && e.t <= thr)
    .map((e: any) => ({ slot: sim.agents[e.a].slot as string, t: e.t as number, move: moves.get(e.a) }));
}
/** PUNCH_STRIKE alone: the protector's lean bound, the pursuit change, the seen set, engine-60's four, engine-61's six and
 * engine-62's RUSH_BULL pinned off. */
const alone = (strike: string) => ({ PUNCH_STRIKE: strike, ANCHOR_BASE: '0', PURSUIT_COMMIT: '0', PASS_SET_SEEN: '0',
  THROW_HOLD: '0', POCKET_REACH: '0', REP_SEEN: '0', RUSH_LEAN_BOUND: '0',
  HONEST_READS: '0', INFO_HONEST: '0', HONEST_TACKLE: '0', RCV_SEEN: '0', TRACK_PURSUIT: '0', TRACK_TACKLE: '0', RUSH_BULL: '0' });

describe('PUNCH_STRIKE', () => {
  it('punched and held the touch: the right guard is not pitched over by the spin that drops the guard who keeps driving', async () => {
    const off = await falls(alone('0'), 2), on = await falls(alone('1'), 2);
    expect(off.some((f: any) => f.slot === 'RG' && f.move === 'spin')).toBe(true);
    expect(on.some((f: any) => f.slot === 'RG')).toBe(false);
  });

  it('a protector still propped on the man when he is swum goes down (the fall is not removed; search with a floor)', async () => {
    // A search, not a pinned scene (roster 7 cover 2 seed 5 until engine-62): scenes in a fixed order until, with
    // PUNCH_STRIKE alone, an interior lineman goes down while his man is swimming past him. Requirement: one exists.
    let found: string | null = null, scenes = 0;
    search: for (const coverage of ['cover2', 'cover1', 'cover3']) for (const seed of [5, 1, 2, 3, 4, 6, 7, 8]) for (let roster = 1; roster <= 12; roster++) {
      scenes++;
      const f = (await falls(alone('1'), roster, coverage, seed)).find((x: any) => ['LG', 'C', 'RG'].includes(x.slot) && x.move === 'swim');
      if (f) { found = `${coverage} roster ${roster} seed ${seed}: ${f.slot} at ${f.t.toFixed(2)} s`; break search; }
    }
    console.log(`propped protector swum and down: ${found ?? 'none'} after ${scenes} scenes`);
    expect(found).not.toBeNull();
  }, 600_000);

  it('on the full stack a propped fall still happens: a lineman leaning near the press goes down onto the man (search with a floor)', async () => {
    // A search, not a pinned scene (these moved on engine-59, 60 and 61): staged scenes in a fixed order until an
    // offensive lineman goes down forward, onto the man (his fall against the press he felt), having leaned at least
    // 0.6 of that press in the 0.3 s before. Requirement: at least one exists on the current stack.
    vi.resetModules();
    for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const OL = ['LT', 'LG', 'C', 'RG', 'RT'];
    let found: string | null = null, scenes = 0;
    search: for (const coverage of ['cover2', 'cover1', 'cover3']) for (let seed = 1; seed <= 24; seed++) for (let roster = 1; roster <= 12; roster++) {
      scenes++;
      const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster, formation: 'gun_doubles_11', flip: false }));
      const ol = sim.offense.filter((a: any) => OL.includes(a.slot));
      const hist = new Map<any, { t: number; ratio: number; u: { x: number; y: number } }[]>();
      while (sim.phase === 'live' && sim.t < 5 && sim.throwAt < 0) {
        for (const a of ol) {
          const sup = a.body.support; if (sup?.state !== 'up') continue;
          const fl = Math.hypot(sup.felt.x, sup.felt.y); if (fl < 300) continue;
          const u = { x: sup.felt.x / fl, y: sup.felt.y / fl }, h = hist.get(a) ?? [];
          h.push({ t: sim.t, ratio: -(sup.lean.x * u.x + sup.lean.y * u.y) / fl, u }); if (h.length > 7) h.shift(); hist.set(a, h);
        }
        sim.tick();
        for (const a of ol) {
          const sup = a.body.support, h = hist.get(a);
          if (!h?.length || !sup || sup.state === 'up' || sim.t - sup.since > sim.dt + 1e-9 || sim.t < 0.5) continue;
          const last = h[h.length - 1], forward = sup.fall.x * last.u.x + sup.fall.y * last.u.y < -0.3;
          if (forward && h.some((r) => sim.t - r.t <= 0.3 + 1e-9 && r.ratio >= 0.6)) { found = `${coverage} roster ${roster} seed ${seed}: ${a.slot} at ${sim.t.toFixed(2)} s`; break search; }
        }
      }
    }
    console.log(`propped OL fall: ${found ?? 'none'} after ${scenes} scenes`);
    expect(found).not.toBeNull();
  }, 480_000);

  it('needs PUNCH', async () => {
    vi.resetModules(); vi.stubEnv('PUNCH', '0'); vi.stubEnv('PUNCH_STRIKE', '1');
    expect((await import('../src/sim/engagement.js')).PUNCH_STRIKE).toBe(false);
  });
});
