/** PUNCH_STRIKE (engagement.ts punch; experimental, off; with PUNCH): the punch's press into the man is a strike, not
 * a standing request. A protector who punched and then held the touch is not propped on his own drive, so a spin that
 * takes the load away does not pitch him over; a protector still propped on the man when he is swum does go down.
 * Fixtures: four verticals (nativeTraceSetup), on the engine defaults (the reference stack).
 *
 * The first two cases isolate PUNCH_STRIKE's own effect, so they pin ANCHOR_BASE (which bounds the protector's lean and
 * removes the spin fall the first case stages) and PURSUIT_COMMIT (which shifts the second scene) off. The third shows,
 * on the full candidate stack (PUNCH_STRIKE, ANCHOR_BASE, PURSUIT_COMMIT on), that a propped fall still happens: a
 * poor technician leaning near the whole press goes down when his man rips through. */
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
/** PUNCH_STRIKE alone: the protector's lean bound and the pursuit change pinned off. */
const alone = (strike: string) => ({ PUNCH_STRIKE: strike, ANCHOR_BASE: '0', PURSUIT_COMMIT: '0' });

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

  it('on the full candidate stack a propped fall still happens: a poor technician leaning near the press goes down to a rip', async () => {
    const all = await falls({ PUNCH_STRIKE: '1', ANCHOR_BASE: '1', PURSUIT_COMMIT: '1' }, 3, 'cover2', 3);
    expect(all.some((f: any) => f.slot === 'LG' && f.move === 'rip')).toBe(true);
  });

  it('needs PUNCH', async () => {
    vi.resetModules(); vi.stubEnv('PUNCH', '0'); vi.stubEnv('PUNCH_STRIKE', '1');
    expect((await import('../src/sim/engagement.js')).PUNCH_STRIKE).toBe(false);
  });
});
