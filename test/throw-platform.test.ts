/** THROW_PLATFORM (behaviors/qb.ts): what moving costs a throw, read directly on a staged passer. He stands 8 yd behind
 * the line and throws at a point 20 yd downfield; only his velocity changes between cases. The mechanism is asserted,
 * not a game outcome: a set throw and the stride into it cost nothing; the cost orders set < stepping in < drifting
 * away < across the target line; it grows with the flight; a better thrower on the run pays less; and it is continuous
 * through the old 2.2 yd/s step. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function passer(flag: string, throwOnRun?: number) {
  vi.resetModules();
  vi.stubEnv('THROW_PLATFORM', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'curl_flat', seed: 1, roster: 1, formation: 'gun_doubles_11', flip: false }));
  const qb = sim.qb, beh: any = qb.behavior;
  expect(beh.kind).toBe('qb-pass');
  if (throwOnRun !== undefined) qb.player.ratings.throwOnRun = throwOnRun;
  const to = { x: qb.pos.x + 20, y: qb.pos.y };
  // Stage his velocity (downfield is +x, so the target is straight ahead): the scene, not the engine.
  const at = (vx: number, vy: number, T = 0.9) => { qb.body.vel = { x: vx, y: vy }; return { plat: beh.platform(qb, to, T), sigma: beh.missSigma(qb, sim, 20, 0, beh.platform(qb, to, T)) as number }; };
  return { at };
}

describe('THROW_PLATFORM', () => {
  it('on: a set throw and the stride into it cost nothing', async () => {
    const { at } = await passer('1');
    const set = at(0, 0);
    expect(set.plat.sigma).toBe(0);
    expect(set.plat.flick).toBe(0);
    expect(at(0.45, 0).sigma).toBe(set.sigma);
    expect(at(1.1, 0.2).sigma).toBe(set.sigma);
  });

  it('on: set < stepping in < drifting away < across the target line, at the same speed', async () => {
    const { at } = await passer('1');
    const set = at(0, 0).sigma, stepIn = at(4, 0), away = at(-4, 0), across = at(0, 4);
    expect(stepIn.sigma).toBeGreaterThan(set);
    expect(away.sigma).toBeGreaterThan(stepIn.sigma);
    expect(across.sigma).toBeGreaterThan(away.sigma);
    // Stepping in keeps his base; going away or across loses it.
    expect(stepIn.plat.flick).toBe(0);
    expect(away.plat.flick).toBeGreaterThan(0);
    expect(across.plat.flick).toBeGreaterThan(0);
    // The added miss lies along what the ball carries: sideways for a roll, back for a fade.
    expect(Math.abs(across.plat.dir.y)).toBeGreaterThan(0.99);
    expect(away.plat.dir.x).toBeLessThan(-0.99);
  });

  it('on: the cost grows with the flight and with speed, with no step at 2.2 yd/s', async () => {
    const { at } = await passer('1');
    expect(at(0, 4, 1.8).plat.sigma).toBeCloseTo(2 * at(0, 4, 0.9).plat.sigma, 9);
    const below = at(0, 2.15).sigma, above = at(0, 2.25).sigma;
    expect(above).toBeGreaterThan(below);
    expect(above / below).toBeLessThan(1.02);
  });

  it('on: a better thrower on the run pays less', async () => {
    const good = (await passer('1', 95)).at(0, 4), poor = (await passer('1', 30)).at(0, 4);
    expect(good.plat.sigma).toBeLessThan(poor.plat.sigma);
    expect(good.plat.flick).toBeLessThan(poor.plat.flick);
  });

  it('off: nothing below 2.2 yd/s and one step above it, whatever the direction', async () => {
    const { at } = await passer('0');
    const set = at(0, 0).sigma;
    expect(at(0, 2.15).sigma).toBe(set);
    expect(at(0, 2.25).sigma).toBeGreaterThan(1.14 * set);
    expect(at(2.5, 0).sigma).toBe(at(0, 2.5).sigma);
  });
});
