/** GAIT_STEP (src/physics/kinematics.ts): a player pushes as hard as the
 * force-velocity line of the speed he can reach in the wanted direction
 * allows, and levels off at a wanted speed over about two steps. Building
 * speed is eased; holding ground and braking are leg force. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { newSupport } from '../src/physics/support.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const DT = .05;
function body(): Body {
  return { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, spin: 0, energy: 1, support: newSupport(.2),
    profile: { massKg: 100, radius: .35, reach: 1, heightYd: 2, vmax: 8.5, tau: 1.1, brake: 6, lateral: 5.5,
      turnRate: 7, backpedal: .55, shuffle: .5, maxCatchHeight: 2.8, reactReach: 2.4, reactionTime: .25,
      power: 120, balance: .6, bend: .5, stepSpeed: 3, getUp: 1 } };
}
async function law(step: string) {
  vi.stubEnv('GAIT_STEP', step);
  vi.resetModules();
  return (await import('../src/physics/kinematics.js')).locomotionAccel;
}
/** Speed after `t` seconds of asking for `vel` from rest at this effort. */
async function speedUp(step: string, vel: { x: number; y: number }, effort = 1, t = .6) {
  const accel = await law(step), b = body();
  for (let k = 0; k < Math.round(t / DT); k++) {
    const a = accel(b, { vel, facing: 0, effort }, DT);
    b.vel = { x: b.vel.x + a.x * DT, y: b.vel.y + a.y * DT };
  }
  return Math.hypot(b.vel.x, b.vel.y);
}

describe('GAIT_STEP: speeding up levels off over the step', () => {
  it('reaches a wanted half speed within a second without overshoot', async () => {
    const want = 4, off = await speedUp('0', { x: want, y: 0 }, 1, 1), on = await speedUp('0.3', { x: want, y: 0 }, 1, 1);
    // The sprint lag approaches every wanted speed on the full-sprint time
    // constant; the stepped gait gets there as fast as the legs allow.
    expect(off).toBeLessThan(.65 * want);
    expect(on).toBeGreaterThan(.9 * want);
    expect(on).toBeLessThanOrEqual(want + 1e-9);
    expect(await speedUp('0.3', { x: want, y: 0 }, 1, 2)).toBeLessThanOrEqual(want + 1e-9);
  });

  it('drives on the line of the speed he can reach in that direction and effort', async () => {
    const forward = await speedUp('0.3', { x: 8, y: 0 }, 1, .2);
    const back = await speedUp('0.3', { x: -8, y: 0 }, 1, .2);
    const easy = await speedUp('0.3', { x: 8, y: 0 }, .5, .2);
    // A backpedal and a half-effort start do not accelerate like a sprint.
    expect(back).toBeLessThan(.7 * forward);
    expect(easy).toBeLessThan(.6 * forward);
  });

  it('answers a push while holding ground as fast as the legs allow', async () => {
    const accel = await law('0.3'), b = body();
    b.vel = { x: -.2, y: 0 };
    // Wanted: stay put. Recovering the lost ground is leg force, not a step.
    expect(accel(b, { vel: { x: 0, y: 0 }, facing: 0 }, DT).x).toBeCloseTo(.2 / DT, 9);
    // Wanted: a slow step forward. Only the speed built past zero is eased.
    expect(accel(b, { vel: { x: .3, y: 0 }, facing: 0 }, DT).x).toBeCloseTo(.2 / DT + .3 / .3, 9);
  });
});
