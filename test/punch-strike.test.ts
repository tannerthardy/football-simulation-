/** PUNCH_STRIKE (engagement.ts punch; experimental, off; with PUNCH): the punch's press into the man is a strike, not
 * a standing request. A protector who punched and then held the touch is not propped on his own drive, so a spin that
 * takes the load away does not pitch him over; a protector still propped on the man when he is swum does go down.
 * Fixtures: four verticals against Cover 2, seed 5 (nativeTraceSetup), on the engine defaults (the reference stack). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** OL falls before the throw: slot, time, and the rusher's move on that blocker's rep at the time. */
async function falls(strike: string, roster: number) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('PUNCH_STRIKE', strike);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'four_verts', seed: 5, roster, formation: 'gun_doubles_11', flip: false }));
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

describe('PUNCH_STRIKE', () => {
  it('punched and held the touch: the right guard is not pitched over by the spin that drops the guard who keeps driving', async () => {
    const off = await falls('0', 2), on = await falls('1', 2);
    expect(off.some((f) => f.slot === 'RG' && f.move === 'spin')).toBe(true);
    expect(on.some((f) => f.slot === 'RG')).toBe(false);
  });

  it('a protector still propped on the man when he is swum goes down (the fall is not removed)', async () => {
    const on = await falls('1', 7);
    expect(on.some((f) => f.slot === 'LG' && f.move === 'swim')).toBe(true);
  });

  it('needs PUNCH', async () => {
    vi.resetModules(); vi.stubEnv('PUNCH', '0'); vi.stubEnv('PUNCH_STRIKE', '1');
    expect((await import('../src/sim/engagement.js')).PUNCH_STRIKE).toBe(false);
  });
});
