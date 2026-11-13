import { expect, it } from 'vitest';
import { integrateFilteredFollow } from '../src/physics/filtered-follow.js';
import { followAccel, type Body } from '../src/physics/kinematics.js';
import type { Vec2 } from '../src/core/vec.js';
import { derivePhysical } from '../src/players/physical.js';
import { generatePlayer } from '../src/players/generator.js';
import { Rng } from '../src/core/rng.js';

const body: Body = { pos: { x: 0, y: 0 }, vel: { x: 7, y: 0 }, facing: 0, energy: 0.8,
  profile: derivePhysical(generatePlayer(new Rng(42), 'WR', { quality: 0.6 })) };
const tau = 0.08, dt = 0.37;
const at = (initial: Vec2, target: Vec2, t: number): Vec2 => ({
  x: target.x + (initial.x - target.x) * Math.exp(-t / tau),
  y: target.y + (initial.y - target.y) * Math.exp(-t / tau),
});
function reference(b: Body, initial: Vec2, target: Vec2): Vec2 {
  const sum = { x: 0, y: 0 }, n = 100000;
  for (let i = 0; i < n; i++) {
    const a = followAccel(b, at(initial, target, (i + 0.5) * dt / n), 0.8, 0.7);
    sum.x += a.x * dt / n; sum.y += a.y * dt / n;
  }
  return sum;
}
it('matches fine integration through saturation, reversal and elliptical direction changes', () => {
  for (const b of [body, { ...body, vel: { x: 0, y: 0 } }]) {
    for (const [initial, target] of [
      [{ x: 40, y: 0 }, { x: 0.2, y: 0 }],
      [{ x: -30, y: 14 }, { x: 20, y: -8 }],
      [{ x: 12, y: 35 }, { x: -2, y: 0.4 }],
    ]) {
      const result = integrateFilteredFollow(b, initial, target, tau, dt, 0.8, 0.7);
      const expected = reference(b, initial, target);
      expect(result.converged).toBe(true);
      expect(result.errorEstimate).toBeLessThanOrEqual(1e-9);
      expect(result.evaluations).toBeLessThan(4096);
      expect(Math.hypot(result.integral.x - expected.x, result.integral.y - expected.y)).toBeLessThan(2e-8);
      const split = 0.093;
      const left = integrateFilteredFollow(b, initial, target, tau, split, 0.8, 0.7).integral;
      const right = integrateFilteredFollow(b, at(initial, target, split), target, tau, dt - split, 0.8, 0.7).integral;
      expect(Math.hypot(left.x + right.x - result.integral.x, left.y + right.y - result.integral.y)).toBeLessThan(5e-9);
    }
  }
});
it('preserves reflection and rotation of the frozen velocity frame', () => {
  const initial = { x: -30, y: 14 }, target = { x: 20, y: -8 };
  const expected = integrateFilteredFollow(body, initial, target, tau, dt).integral;
  const mirror = (a: Vec2): Vec2 => ({ x: a.x, y: -a.y });
  const rotate = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });
  for (const transform of [mirror, rotate]) {
    const result = integrateFilteredFollow({ ...body, vel: transform(body.vel) }, transform(initial), transform(target), tau, dt).integral;
    expect(result.x).toBeCloseTo(transform(expected).x, 9);
    expect(result.y).toBeCloseTo(transform(expected).y, 9);
  }
});
it('integrates a long interval without losing its short initial transient', () => {
  const b = { ...body, vel: { x: 0, y: 0 } };
  const result = integrateFilteredFollow(b, { x: 1, y: 0 }, { x: 0, y: 0 }, 1e-4, 1);
  expect(result.converged).toBe(true);
  expect(result.integral.x).toBeCloseTo(1e-4, 9);
  expect(result.integral.y).toBe(0);
});
it('reports failure to meet an unrealistically small numerical tolerance', () => {
  const result = integrateFilteredFollow(body, { x: -30, y: 14 }, { x: 20, y: -8 }, tau, dt, 1, 1, 1e-30);
  expect(result.converged).toBe(false);
  expect(result.errorEstimate === null || result.errorEstimate > 1e-30).toBe(true);
  expect(result.evaluations).toBeLessThan(4200);
});
