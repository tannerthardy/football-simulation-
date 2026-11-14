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
/** PUNCH_STRIKE alone: the protector's lean bound, the pursuit change, the seen set and engine-61's four pinned off. */
const alone = (strike: string) => ({ PUNCH_STRIKE: strike, ANCHOR_BASE: '0', PURSUIT_COMMIT: '0', PASS_SET_SEEN: '0',
  THROW_HOLD: '0', POCKET_REACH: '0', REP_SEEN: '0', RUSH_LEAN_BOUND: '0' });

describe('PUNCH_STRIKE', () => {
  it('punched and held the touch: the right guard is not pitched over by the spin that drops the guard who keeps driving', async () => {
    const off = await falls(alone('0'), 2), on = await falls(alone('1'), 2);
    expect(off.some((f: any) => f.slot === 'RG' && f.move === 'spin')).toBe(true);
    expect(on.some((f: any) => f.slot === 'RG')).toBe(false);
  });

  it('a protector still propped on the man when he is swum goes down (the fall is not removed)', async () => {
    const on = await falls(alone('1'), 7);
    expect(on.some((f: any) => f.slot === 'LG' && f.move === 'swim')).toBe(true);
  });

  it('on the full engine-61 stack a propped fall still happens: a guard leaning near the press goes down when it is taken away', async () => {
    const all = await falls({}, 8, 'cover1', 9);
    expect(all.some((f: any) => f.slot === 'LG' && f.move === 'longarm')).toBe(true);
  });

  it('needs PUNCH', async () => {
    vi.resetModules(); vi.stubEnv('PUNCH', '0'); vi.stubEnv('PUNCH_STRIKE', '1');
    expect((await import('../src/sim/engagement.js')).PUNCH_STRIKE).toBe(false);
  });
});
