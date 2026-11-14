/** RUSH_LEAN_BOUND (engagement.ts armBalance for every engaged pass rusher; experimental, off): a rusher leaning on a
 * man commits no more than his base could recover from if the press went, so having it taken away does not pitch him
 * onto the man; a fall the World earns otherwise (an edge going down on a dip or bend) still happens, asserted by a
 * search with a floor rather than one pinned scene (these move with every defaults change). Fixtures: four verticals
 * (nativeTraceSetup) on the engine defaults (the reference stack), re-found on engine-61 by a native search (288 scenes:
 * 32 DL falls off, 11 on; first found on engine-59, 46 / 10). */
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
  it('a weak-side tackle leaning on his long-arm no longer goes down when the press goes (Cover 1, roster 4, seed 6)', async () => {
    const off = await falls('0', 4, 'cover1', 6), on = await falls('1', 4, 'cover1', 6);
    expect(off.some((f: any) => f.slot === 'DT_W' && f.move === 'longarm')).toBe(true);
    expect(on.some((f: any) => f.slot === 'DT_W')).toBe(false);
  });

  it('nor one swum past his press (Cover 2, roster 6, seed 6)', async () => {
    const off = await falls('0', 6, 'cover2', 6), on = await falls('1', 6, 'cover2', 6);
    expect(off.some((f: any) => f.slot === 'DT_W' && f.move === 'swim')).toBe(true);
    expect(on.some((f: any) => f.slot === 'DT_W')).toBe(false);
  });

  it('a fall the World earns otherwise still happens: an edge going down on a dip or bend through the corner (search with a floor)', async () => {
    // A search, not a pinned scene: these native cases move with every defaults change (engine-59, 60, 61 twice). Staged
    // scenes in a fixed order until one shows the class: an end (DE) going down in his pass rep, before the throw,
    // while dipping, ripping or running the arc (speed) with the bound on. Requirement: at least one exists.
    vi.resetModules();
    for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
    vi.stubEnv('RUSH_LEAN_BOUND', '1');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    let found: string | null = null, scenes = 0;
    search: for (const coverage of ['cover2', 'cover3']) for (let seed = 1; seed <= 8; seed++) for (let roster = 1; roster <= 12; roster++) {
      scenes++;
      const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster, formation: 'gun_doubles_11', flip: false }));
      const ends = new Set(sim.defense.filter((a: any) => /^DE/.test(a.slot)).map((a: any) => a.idx));
      const moves = new Map<number, string>();
      while (sim.phase === 'live' && sim.t < 5 && sim.throwAt < 0) {
        for (const e of sim.engagements) if (e.type === 'pass') moves.set(e.defender.idx, e.move);
        sim.tick();
        const f = sim.events.find((e: any) => e.type === 'fall' && ends.has(e.a) && e.t >= 0.5 && ['dip', 'rip', 'speed'].includes(moves.get(e.a) ?? ''));
        if (f) { found = `${coverage} roster ${roster} seed ${seed}: ${sim.agents[f.a].slot} at ${f.t.toFixed(2)} s (${moves.get(f.a)})`; break search; }
      }
    }
    console.log(`earned edge fall: ${found ?? 'none'} after ${scenes} scenes`);
    expect(found).not.toBeNull();
  }, 240_000);

  it('is off unless set', async () => {
    vi.resetModules(); vi.stubEnv('RUSH_LEAN_BOUND', '0');
    expect((await import('../src/sim/engagement.js')).RUSH_LEAN_BOUND).toBe(false);
  });
});
