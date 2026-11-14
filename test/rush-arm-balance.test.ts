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

  it('a bull keeps its commitment: the over-committed bull who is dropped still falls (Cover 1, seed 4, roster 3)', async () => {
    // Re-found on the engine-59 stack (PASS_SET_SEEN, QB_BODY_SEEN, RUSH_PROMISE on) by a native search: 216 staged
    // scenes, 3 bull falls among 33 DL falls; this one (the strong tackle at about 1.65 s) falls under all three coverages.
    const on = await falls('1', 3, 'cover1', 4);
    expect(on.some((f: any) => f.slot === 'DT_S' && f.move === 'bull')).toBe(true);
  });

  it('is off unless set', async () => {
    vi.resetModules(); vi.stubEnv('RUSH_ARM_BALANCE', '0');
    expect((await import('../src/sim/engagement.js')).RUSH_ARM_BALANCE).toBe(false);
  });
});
