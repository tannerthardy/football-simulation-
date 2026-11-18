/** RUSH_ARM_BALANCE (engagement.ts armBalance; experimental, off; with RUSH_HANDS): behind his own long-arm a rusher
 * commits as a protector does, so losing the arm does not pitch him over; a bull keeps its commitment, and an
 * over-committed bull who is dropped still falls. Fixtures: four verticals (nativeTraceSetup), on the engine defaults
 * (the reference stack) with RUSH_HANDS, PUNCH_STRIKE and ANCHOR_BASE. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** DL falls before the throw: slot, time, and his move then ('longarm-held' while his long-arm joint is on). */
async function falls(flag: string, roster: number, coverage: string, seed: number) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  for (const k of ['RUSH_HANDS', 'PUNCH_STRIKE', 'ANCHOR_BASE']) vi.stubEnv(k, '1');
  // RUSH_LEAN_BOUND (engine-61) bounds every engaged rusher, the long-arm case included: pinned off to isolate this one.
  vi.stubEnv('RUSH_LEAN_BOUND', '0');
  vi.stubEnv('RUSH_ARM_BALANCE', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster, formation: 'gun_doubles_11', flip: false }));
  const dl = new Set(sim.defense.filter((a: any) => /^(DE|DT|NT)/.test(a.slot)).map((a: any) => a.idx));
  const moves = new Map<number, string>();
  while (sim.phase === 'live' && sim.t < 5) {
    for (const e of sim.engagements) if (e.type === 'pass') moves.set(e.defender.idx, e.rusherHand ? 'longarm-held' : e.move);
    sim.tick();
  }
  const thr = sim.events.find((e: any) => e.type === 'throw')?.t ?? Infinity;
  return sim.events.filter((e: any) => e.type === 'fall' && dl.has(e.a) && e.t >= 0.5 && e.t <= thr)
    .map((e: any) => ({ slot: sim.agents[e.a].slot as string, move: moves.get(e.a) }));
}

describe('RUSH_ARM_BALANCE', () => {
  it('behind his own long-arm: an interior rusher no longer falls when the arm goes (paired search)', async () => {
    // A paired search, not a pinned scene (Cover 2, seed 5, roster 1 until engine-63): scenes in a fixed order; the
    // first in which an interior DL goes down while his long-arm is held, with RUSH_ARM_BALANCE off, is replayed with it
    // on, and that man must not go down behind his arm. Requirement: one is found, and the bound keeps him up there.
    let found: string | null = null, scenes = 0;
    search: for (const coverage of ['cover2', 'cover1', 'cover3']) for (const seed of [5, 1, 2, 3, 4, 6, 7, 8]) for (let roster = 1; roster <= 12; roster++) {
      scenes++;
      const f = (await falls('0', roster, coverage, seed)).find((x: any) => /^(DT|NT)/.test(x.slot) && x.move === 'longarm-held');
      if (!f) continue;
      const on = await falls('1', roster, coverage, seed);
      // The bound is on the long-arm: with it on, that man must not go down while his long-arm is held (a fall on
      // another move, a club say, is the World's and not this case: engine-63's scene shows one).
      found = `${coverage} roster ${roster} seed ${seed}: ${f.slot}; on: ${on.some((x: any) => x.slot === f.slot && x.move === 'longarm-held') ? 'still falls behind the arm' : 'stays up'}`;
      break search;
    }
    console.log(`paired long-arm fall after ${scenes} scenes: ${found ?? 'none'}`);
    expect(found).not.toBeNull();
    expect(found).toMatch(/stays up$/);
  }, 600_000);

  it('a bull keeps its commitment: an over-committed bull who is dropped still falls (search with a floor)', async () => {
    // A search, not a pinned scene (moved on engine-58, 59 and 61): staged scenes in a fixed order until a DL goes down
    // on a bull with RUSH_ARM_BALANCE on (the bull is outside its bound). Requirement: at least one exists.
    vi.resetModules();
    for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
    for (const k of ['RUSH_HANDS', 'PUNCH_STRIKE', 'ANCHOR_BASE', 'RUSH_ARM_BALANCE']) vi.stubEnv(k, '1');
    vi.stubEnv('QB_ROLE_PATH', '0'); // engine-88 (QB landing, pinned test-only): the searched bull fall was found with the old deep price; the throw's timing moves with it. Flex to re-search with it on
    vi.stubEnv('RUSH_LEAN_BOUND', '0');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    let found: string | null = null, scenes = 0;
    search: for (const coverage of ['cover1', 'cover2', 'cover3']) for (let seed = 1; seed <= 8; seed++) for (let roster = 1; roster <= 12; roster++) {
      scenes++;
      const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster, formation: 'gun_doubles_11', flip: false }));
      const dl = new Set(sim.defense.filter((a: any) => /^(DE|DT|NT)/.test(a.slot)).map((a: any) => a.idx));
      const moves = new Map<number, string>();
      while (sim.phase === 'live' && sim.t < 5 && sim.throwAt < 0) {
        for (const e of sim.engagements) if (e.type === 'pass') moves.set(e.defender.idx, e.rusherHand ? 'longarm-held' : e.move);
        sim.tick();
        const f = sim.events.find((e: any) => e.type === 'fall' && dl.has(e.a) && e.t >= 0.5 && moves.get(e.a) === 'bull');
        if (f) { found = `${coverage} roster ${roster} seed ${seed}: ${sim.agents[f.a].slot} at ${f.t.toFixed(2)} s`; break search; }
      }
    }
    console.log(`dropped bull: ${found ?? 'none'} after ${scenes} scenes`);
    expect(found).not.toBeNull();
  }, 480_000);

  it('is off unless set', async () => {
    vi.resetModules(); vi.stubEnv('RUSH_ARM_BALANCE', '0');
    expect((await import('../src/sim/engagement.js')).RUSH_ARM_BALANCE).toBe(false);
  });
});
