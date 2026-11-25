/** QB_TICK_PICTURE (behaviors/qb.ts): his pictures of the defense are taken as time passes, so asking him to score a
 * throw does not change the play. Staged: the same plays run plain and with an observer that calls his `evaluate` on
 * every receiver every tick before the throw (Rules' cov7 observer, generalized), on the reference stack in both arms
 * (its SIGHT_CARRIER visibility memo is the state the asking used to advance). Engine-72's SIGHT_PURE removes the same
 * order-dependence from the sight side, so: with SIGHT_PURE off (the engine before it), off some play differs and on none
 * does; on the current engine (SIGHT_PURE on), none does with QB_TICK_PICTURE either way. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const PLAYS: [string, string, number][] = [];
for (const concept of ['pa_shot', 'smash', 'four_verts', 'mesh']) for (const coverage of ['cover1', 'cover3', 'cover4']) for (const seed of [1, 2]) PLAYS.push([concept, coverage, seed]);

async function arm(flag: string, sightPure = '1'): Promise<number> {
  vi.resetModules();
  // The reference stack (the engine's default; the suite is pinned to the legacy engine), whose perception the asking advanced.
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('SIGHT_PURE', sightPure);
  vi.stubEnv('QB_TICK_PICTURE', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const run = (concept: string, coverage: string, seed: number, observe: boolean) => {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
    const qb: any = sim.qb.behavior, recv = sim.offense.filter((o: any) => o !== sim.qb && o.behavior?.passOption);
    const path: number[] = []; let thr: any = null;
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (p: any, target: any, ...rest: any[]) => { if (p === sim.qb && !thr) thr = [sim.t, target?.slot ?? null]; return tb(p, target, ...rest); };
    for (let i = 0; i < 600 && sim.phase === 'live'; i++) {
      sim.tick();
      path.push(sim.qb.pos.x, sim.qb.pos.y, sim.ball.pos?.x ?? 0);
      if (observe && !thr && sim.carrier === sim.qb && sim.qb.behavior === qb) for (const r of recv) qb.evaluate(sim.qb, sim, r, 0);
    }
    return JSON.stringify({ path, thr });
  };
  let differ = 0;
  for (const [concept, coverage, seed] of PLAYS) if (run(concept, coverage, seed, false) !== run(concept, coverage, seed, true)) differ++;
  return differ;
}

describe('QB_TICK_PICTURE: scoring a throw does not change the play', () => {
  it('without SIGHT_PURE: off, an observer that scores every receiver every tick changes some play; on, none', async () => {
    expect(await arm('0', '0')).toBeGreaterThan(0);
    expect(await arm('1', '0')).toBe(0);
  }, 600_000);
  it('on the current engine (SIGHT_PURE on): it changes none, with QB_TICK_PICTURE on or off', async () => {
    expect(await arm('1')).toBe(0);
    expect(await arm('0')).toBe(0);
  }, 600_000);
});
