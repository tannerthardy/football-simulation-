/** RUSH_LEAN_BOUND (engagement.ts armBalance for every engaged pass rusher; experimental, off): a rusher leaning on a
 * man commits no more than his base could recover from if the press went, so having it taken away does not pitch him
 * onto the man; a fall the World earns otherwise (an edge's dip into a tackle) still happens. Fixtures: four verticals
 * (nativeTraceSetup) on the engine defaults (the reference stack, engine-59), found by a native search (288 scenes:
 * 46 DL falls off, 10 on, every interior fall gone). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function falls(flag: string, roster: number, coverage: string, seed: number) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('RUSH_LEAN_BOUND', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster, formation: 'gun_doubles_11', flip: false }));
  const dl = new Set(sim.defense.filter((a: any) => /^(DE|DT|NT)/.test(a.slot)).map((a: any) => a.idx));
  const moves = new Map<number, string>();
  while (sim.phase === 'live' && sim.t < 5) {
    for (const e of sim.engagements) if (e.type === 'pass') moves.set(e.defender.idx, e.move);
    sim.tick();
  }
  const thr = sim.events.find((e: any) => e.type === 'throw')?.t ?? Infinity;
  return sim.events.filter((e: any) => e.type === 'fall' && dl.has(e.a) && e.t >= 0.5 && e.t <= thr)
    .map((e: any) => ({ slot: sim.agents[e.a].slot as string, move: moves.get(e.a) }));
}

describe('RUSH_LEAN_BOUND', () => {
  it('a weak-side tackle leaning on his long-arm no longer goes down when the press goes (Cover 1, roster 10, seed 5)', async () => {
    const off = await falls('0', 10, 'cover1', 5), on = await falls('1', 10, 'cover1', 5);
    expect(off.some((f: any) => f.slot === 'DT_W' && f.move === 'longarm')).toBe(true);
    expect(on.some((f: any) => f.slot === 'DT_W')).toBe(false);
  });

  it('nor one swum past his press (Cover 2, roster 6, seed 5)', async () => {
    const off = await falls('0', 6, 'cover2', 5), on = await falls('1', 6, 'cover2', 5);
    expect(off.some((f: any) => f.slot === 'DT_W' && f.move === 'swim')).toBe(true);
    expect(on.some((f: any) => f.slot === 'DT_W')).toBe(false);
  });

  it('a fall the World earns otherwise still happens: the strong end dipping into the tackle (Cover 3, roster 11, seed 6)', async () => {
    const on = await falls('1', 11, 'cover3', 6);
    expect(on.some((f: any) => f.slot === 'DE_S' && f.move === 'dip')).toBe(true);
  });

  it('is off unless set', async () => {
    vi.resetModules(); vi.stubEnv('RUSH_LEAN_BOUND', '0');
    expect((await import('../src/sim/engagement.js')).RUSH_LEAN_BOUND).toBe(false);
  });
});
