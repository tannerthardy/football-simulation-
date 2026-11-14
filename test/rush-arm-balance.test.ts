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
  it('behind his own long-arm: the strong tackle no longer falls when the arm goes (Cover 2, seed 5, roster 1)', async () => {
    const off = await falls('0', 1, 'cover2', 5), on = await falls('1', 1, 'cover2', 5);
    expect(off.some((f: any) => f.slot === 'DT_S' && f.move === 'longarm-held')).toBe(true);
    expect(on.some((f: any) => f.slot === 'DT_S')).toBe(false);
  });

  it('a bull keeps its commitment: an over-committed bull who is dropped still falls (search with a floor)', async () => {
    // A search, not a pinned scene (moved on engine-58, 59 and 61): staged scenes in a fixed order until a DL goes down
    // on a bull with RUSH_ARM_BALANCE on (the bull is outside its bound). Requirement: at least one exists.
    vi.resetModules();
    for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
    for (const k of ['RUSH_HANDS', 'PUNCH_STRIKE', 'ANCHOR_BASE', 'RUSH_ARM_BALANCE']) vi.stubEnv(k, '1');
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
