/** The posture witness (Run Game's, docs/football-handbook/low-posture-cost-sources.md; Flex, 2026-11-14). Staged
 * four-vertical pass reps on the engine defaults; every offensive lineman's posture request is held at 0.7 or 1.0
 * (the World's intent, every tick from the snap); ground the line gives up (yd toward their own goal, from 0.8 s to
 * 2.5 s or the throw) and OL falls, pooled over rosters 1-6, seeds 1-2, Cover 1. Today the lower line gives up less
 * ground: posture grows his base, w0 and the lean his anchor may commit, and nothing in his legs shrinks. (In the World
 * alone the push does not depend on posture: two bodies driving chest to chest move identically at 0.7 and 1.0.)
 * POSTURE_FORCE (a leg-force factor by knee flexion) was built against it and changed nothing: by the stated mapping
 * the engine's posture 1 is a half squat (62-87 deg of knee flexion by bend), the force optimum, so the coached
 * 'too low' (past about 90-100 deg) is outside the posture range (docs/reviews/2026-11-14-stance-base-proposal.md). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
const OL = ['LT', 'LG', 'C', 'RG', 'RT'];

async function line(posture: number) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  let given = 0, falls = 0, reps = 0;
  for (let roster = 1; roster <= 6; roster++) for (const seed of [1, 2]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'four_verts', seed, roster, formation: 'gun_doubles_11', flip: false }));
    const ol = sim.offense.filter((a: any) => OL.includes(a.slot));
    const step = sim.world.step.bind(sim.world);
    sim.world.step = (intents: any[], dt: number) => {
      for (const a of ol) if (intents[a.idx]) intents[a.idx] = { ...intents[a.idx], posture };
      return step(intents, dt);
    };
    const x0 = new Map<any, number>();
    while (sim.phase === 'live' && sim.t < 2.5 && sim.throwAt < 0) {
      sim.tick();
      if (Math.abs(sim.t - 0.8) < 1e-9) for (const a of ol) x0.set(a, a.pos.x);
    }
    for (const a of ol) if (x0.has(a)) { given += x0.get(a)! - a.pos.x; reps++; }
    const thr = sim.throwAt >= 0 ? sim.throwAt : Infinity;
    falls += sim.events.filter((e: any) => e.type === 'fall' && ol.some((a: any) => a.idx === e.a) && e.t <= thr).length;
  }
  return { given: given / Math.max(1, reps), falls };
}

describe('posture witness', () => {
  it('today: the line at posture 1.0 gives up less ground than at 0.7', async () => {
    const low = await line(1.0), mid = await line(0.7);
    if (process.env.PF_PRINT) console.log('PF today mid', mid, 'low', low);
    expect(low.given).toBeLessThan(mid.given);
  }, 240_000);
});

