/** STEP_CREDIT: a man driven backward is stepping, not double-planted, so he does not hold his leg force continuously
 * (docs/reviews/2026-11-16-push-contest-law.md). Two bodies of one build, one pressing the other through a hands joint: with the flag off the one
 * driven back holds the full eccentric credit; with it on, the share of the time his feet are placed falls as he steps harder, so the pair settles differently
 * and the stronger of two resisters then holds more. Off by default: nothing changes without it. */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function pair(strengthB: number, run = 60): Promise<{ backed: number; dx: number }> {
  const { World } = await import('../src/physics/world.js');
  const mk = (x: number, power: number) => ({ pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing: x < 1 ? 0 : Math.PI, energy: 1,
    profile: { massKg: 140, radius: .3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
      maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power, balance: .5 } }) as never as import('../src/physics/kinematics.js').Body;
  const a = mk(0, 140 * (.55 + .75 * .6)), b = mk(.9, strengthB);
  const w = new World([a, b]);
  w.joints.push({ kind: 'hands', a, b, extension: 1, push: 1e6, hold: 1e6, steer: 1e6 } as never);
  for (let k = 0; k < run; k++) w.step([{ vel: { x: 4, y: 0 }, push: 1 }, { vel: { x: -1, y: 0 }, push: 1 }] as never, .05);
  return { backed: b.pos.x - .9, dx: a.pos.x };
}

describe('STEP_CREDIT', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it('on: the pair moves differently from off (the stepping share is read), off is the old law', async () => {
    vi.stubEnv('STEP_CREDIT', '0'); vi.resetModules();
    const off = await pair(140 * (.55 + .75 * .6));
    vi.stubEnv('STEP_CREDIT', '1'); vi.resetModules();
    const on = await pair(140 * (.55 + .75 * .6));
    expect(Math.abs(on.backed - off.backed)).toBeGreaterThan(0.05);
  });
  it('on: the resister\'s strength enters (a weaker one gives more ground); off it does less', async () => {
    const strong = 140 * (.55 + .75 * .6), weak = 140 * (.55 + .75 * .3);
    vi.stubEnv('STEP_CREDIT', '1'); vi.resetModules();
    const onStrong = await pair(strong), onWeak = await pair(weak);
    vi.stubEnv('STEP_CREDIT', '0'); vi.resetModules();
    const offStrong = await pair(strong), offWeak = await pair(weak);
    expect(onWeak.backed - onStrong.backed).toBeGreaterThan(0);
    expect(onWeak.backed - onStrong.backed).toBeGreaterThanOrEqual(offWeak.backed - offStrong.backed - 1e-9);
  });
});
