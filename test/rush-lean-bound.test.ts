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
  for (const k of ['PA_HINGE', 'EDGE_SET', 'POCKET_DROP', 'POWER_AIM', 'END_KEY']) vi.stubEnv(k, '0'); // engine-73: scenes recorded before this group of the engine-73 landing; Flex to re-record with it on
  vi.stubEnv('SET_SPOT', '0'); // engine-72: the searched edge fall was found with the old pass set; Flex to re-record on the call's set spot
  vi.stubEnv('VERTS_QUICK', '0'); // engine-67: these four_verts scenes were recorded on the five-step set; the quick drop is a different play
  vi.stubEnv('RUSH_LEAN_BOUND', flag);
  vi.stubEnv('QB_WINDOW_ARRIVE', '0'); // engine-83 (QB landing, pinned test-only): the searched edge fall was found with the old window; the throw's timing moves with arrival momentum. Flex to re-search with it on
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
  // A paired search, not two pinned scenes: these moved with every defaults change (engine-59, 60, 61 twice, and 62 with
  // RUSH_BULL on). Scenes in a fixed order; the first scene in which an interior DL goes down off his long-arm with the
  // bound off is replayed with the bound on, and that man must not go down. Requirement: one is found, and the bound
  // removes it. (engine-62: found at cover1 roster 2 seed 2, DT_S. The swum-past-his-press class of the old second case
  // no longer occurs with the bound off: none in all 288 scenes, so there is nothing for it to guard.)
  it('an interior rusher leaning on his long-arm no longer goes down when the press goes (paired search)', async () => {
    const want = ['longarm'], found = new Map<string, string>();
    let scenes = 0;
    search: for (const coverage of ['cover1', 'cover2', 'cover3']) for (let seed = 1; seed <= 8; seed++) for (let roster = 1; roster <= 12; roster++) {
      if (found.size === want.length) break search;
      scenes++;
      const off = await falls('0', roster, coverage, seed);
      for (const move of want) {
        if (found.has(move)) continue;
        const f = off.find((x: any) => /^(DT|NT)/.test(x.slot) && x.move === move);
        if (!f) continue;
        const on = await falls('1', roster, coverage, seed);
        found.set(move, `${coverage} roster ${roster} seed ${seed}: ${f.slot}; on: ${on.some((x: any) => x.slot === f.slot) ? 'still falls' : 'stays up'}`);
      }
    }
    console.log(`paired lean-bound falls after ${scenes} scenes:`, Object.fromEntries(found));
    for (const move of want) {
      expect(found.get(move), move).toBeDefined();
      expect(found.get(move), move).toMatch(/stays up$/);
    }
  }, 600_000);

  it('a fall the World earns otherwise still happens: an edge going down on a dip or bend through the corner (search with a floor)', async () => {
    // A search, not a pinned scene: these native cases move with every defaults change (engine-59, 60, 61 twice). Staged
    // scenes in a fixed order until one shows the class: an end (DE) going down in his pass rep, before the throw,
    // while dipping, ripping or running the arc (speed) with the bound on. Requirement: at least one exists.
    vi.resetModules();
    for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
    for (const k of ['PA_HINGE', 'EDGE_SET', 'POCKET_DROP', 'POWER_AIM', 'END_KEY']) vi.stubEnv(k, '0'); // engine-73: scenes recorded before this group of the engine-73 landing; Flex to re-record with it on
    vi.stubEnv('QB_WINDOW_ARRIVE', '0'); // engine-83 (QB landing, pinned test-only): the searched edge fall was found with the old window; the throw's timing moves with arrival momentum. Flex to re-search with it on
    vi.stubEnv('SET_SPOT', '0'); // engine-72: the searched edge fall was found with the old pass set; Flex to re-record on the call's set spot
    vi.stubEnv('VERTS_QUICK', '0'); // engine-67: these four_verts scenes were recorded on the five-step set; the quick drop is a different play
    vi.stubEnv('RUSH_LEAN_BOUND', '1');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    let found: string | null = null, scenes = 0;
    // Seeds 1-24 (widened 2026-11-24, engine-98, Defense): with TRAIL_LEVERAGE on a second rusher converging on the QB
    // takes the other shoulder, and seeds 1-8 (192 scenes) hold no such fall; the first is now cover2 roster 8 seed 17
    // (DE_W, rip, 3.60 s, scene 200). With it off the first was cover2 roster 1 seed 2 (DE_S, dip, 3.95 s).
    search: for (const coverage of ['cover2', 'cover3']) for (let seed = 1; seed <= 24; seed++) for (let roster = 1; roster <= 12; roster++) {
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
  }, 900_000);

  it('is off unless set', async () => {
    vi.resetModules(); vi.stubEnv('RUSH_LEAN_BOUND', '0');
    expect((await import('../src/sim/engagement.js')).RUSH_LEAN_BOUND).toBe(false);
  });
});
