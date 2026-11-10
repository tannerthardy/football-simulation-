/** QB_FEEL (behaviors/qb.ts QBPass; experimental, off): the QB reads a rusher
 * still in a block from the blocker's body in the rusher's path, not the rep's
 * private score, and a rusher he feels closing moves him (up inside an edge
 * rusher, away from interior push) at a pace he can still throw from. Off, a
 * man within 2 yd read 1.6 s away and the QB stood (0.23 yd moved; NFL 0.72 at
 * 2.1 yd/s). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function pocket(flag: string) {
  vi.stubEnv('QB_FEEL', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  let moving = 0, near = 0;
  for (let seed = 1; seed <= 8; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip }));
    while (sim.phase === 'live' && sim.t < 4 && sim.throwAt < 0 && sim.ball.kind === 'held' && sim.ball.carrier === sim.qb) {
      sim.tick();
      const qb = sim.qb;
      if (sim.t < 1.5 || (qb.behavior as any).phase === 'windup') continue;
      if (!sim.defense.some((d: any) => Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) < 3)) continue;
      near++; if (Math.hypot(qb.vel.x, qb.vel.y) > 1.2) moving++;
    }
  }
  return { near, moving: moving / Math.max(1, near) };
}

describe('QB_FEEL', () => {
  it('on: the QB moves off a closing rusher, so rushers spend less time within 3 yd of the ball', async () => {
    const off = await pocket('0'), on = await pocket('1');
    // Legacy test engine, cover1 four verts, 16 snaps: ticks with a rusher within
    // 3 yd of the QB (ball in hand, not in his motion) 138 -> 98.
    expect(off.near).toBeGreaterThan(40);
    expect(on.near).toBeLessThan(off.near * 0.85);
  });
});
