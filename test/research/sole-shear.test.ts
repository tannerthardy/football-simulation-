import { describe, expect, it } from 'vitest';
import { advanceSoleShear } from '../../src/physics/sole-shear.js';
import type { Vec2 } from '../../src/core/vec.js';

const v = (x: number, y: number): Vec2 => ({ x, y });
const near = (actual: number, expected: number, tolerance = 1e-9) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);

describe('persistent sole shear element', () => {
  it('integrates constant-capacity plastic turning against an independent oracle', () => {
    const k = 10;
    const R = 2;
    const h = .2;
    const speed = 1;
    const stretch = v(R / k, 0);
    const result = advanceSoleShear(stretch, v(0, speed * h), h,
      { stiffness: k, capacityBefore: R, capacityAfter: R },
      { absoluteTolerance: 1e-12, relativeTolerance: 1e-10 });

    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(result.report.branch).toBe('plastic');
    expect(result.report.onsetTime).toBe(0);
    // For n0=(1,0), v=(0,V), q=k*V*h/R. The exact primitive is
    // If=(R/a)[log(cosh(q))*e + atan(sinh(q))*perp(e)], a=kV/R.
    const q = k * speed * h / R;
    const expectedForceImpulse = v((R * Math.atan(Math.sinh(q))) / (k * speed / R),
      (R * Math.log(Math.cosh(q))) / (k * speed / R));
    near(result.report.forceIntegral.x, expectedForceImpulse.x, 1e-10);
    near(result.report.forceIntegral.y, expectedForceImpulse.y, 1e-10);
    near(result.report.plasticDissipation, speed * expectedForceImpulse.y, 1e-10);
    near(result.report.footImpulse.x, -expectedForceImpulse.x, 1e-10);
    near(result.report.footImpulse.y, -expectedForceImpulse.y, 1e-10);
    expect(result.report.quadratureErrorImpulse).toBeLessThan(1e-10);
    expect(result.report.quadratureErrorDissipation).toBeLessThan(1e-10);
    near(result.report.workResidual, 0, 1e-10);
  });

  it('resolves a narrow startup turning layer at very large constitutive phase', () => {
    const k = 1000;
    const R = 1;
    const speed = 1;
    const h = 1000;
    const result = advanceSoleShear(v(R / k, 0), v(0, speed * h), h,
      { stiffness: k, capacityBefore: R, capacityAfter: R });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    const q = k * speed * h / R;
    const prefactor = R * R / (k * speed);
    const expectedTangent = prefactor * Math.atan(Math.sinh(40));
    const expectedAlongMotion = prefactor * (q - Math.log(2));
    near(result.report.forceIntegral.x, expectedTangent, 1e-10);
    near(result.report.forceIntegral.y, expectedAlongMotion, 1e-9);
    near(result.report.plasticDissipation, expectedAlongMotion, 1e-9);
    expect(result.report.quadratureErrorImpulse).toBeLessThan(1e-9);
  });

  it('keeps an elastic patch below capacity and reports the exact chord impulse', () => {
    const result = advanceSoleShear(v(.01, 0), v(.002, .001), .1,
      { stiffness: 10, capacityBefore: 10, capacityAfter: 10 });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(result.report.branch).toBe('elastic');
    near(result.stretch.x, .012);
    near(result.stretch.y, .001);
    near(result.report.forceIntegral.x, 10 * .011 * .1);
    near(result.report.forceIntegral.y, 10 * .0005 * .1);
    near(result.report.plasticDissipation, 0);
  });

  it('isolates an interior yield root while the capacity ramps', () => {
    const result = advanceSoleShear(v(.05, 0), v(.1, 0), .1,
      { stiffness: 10, capacityBefore: 1, capacityAfter: 1.2 });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(result.report.branch).toBe('elastic-plastic');
    near(result.report.onsetTime!, .0625, 1e-10);
    near(result.stretch.x, .12, 1e-10);
    expect(result.report.plasticDissipation).toBeGreaterThan(0);
    near(result.report.workResidual, 0, 1e-9);
  });

  it('handles a tangent boundary departure as immediate yield', () => {
    const result = advanceSoleShear(v(0, .2), v(.1, 0), .1,
      { stiffness: 10, capacityBefore: 2, capacityAfter: 2 });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(result.report.onsetTime).toBe(0);
    expect(result.report.branch).toBe('plastic');
    near(Math.hypot(10 * result.stretch.x, 10 * result.stretch.y), 2, 1e-9);
  });

  it('returns over-cap initial stretch with explicit dissipation and no impulse', () => {
    const result = advanceSoleShear(v(.4, 0), v(0, 0), .1,
      { stiffness: 10, capacityBefore: 2, capacityAfter: 2 });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(result.report.branch).toBe('initial-return');
    near(result.stretch.x, .2);
    near(result.report.initialReturnDissipation, .6);
    near(result.report.footImpulse.x, -.2);
    near(result.report.workResidual, 0);
  });

  it('tracks radial plastic unloading at zero slip as capacity falls', () => {
    const result = advanceSoleShear(v(.2, 0), v(0, 0), .2,
      { stiffness: 10, capacityBefore: 2, capacityAfter: 1 });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(result.report.branch).toBe('plastic');
    near(result.stretch.x, .1);
    near(result.report.forceIntegral.x, .3);
    near(result.report.plasticDissipation, .15);
    near(result.report.workResidual, 0);
  });

  it('integrates a zero-capacity start without inventing force', () => {
    const result = advanceSoleShear(v(0, 0), v(.1, 0), .1,
      { stiffness: 10, capacityBefore: 0, capacityAfter: 2 });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(result.report.branch).toBe('elastic');
    near(result.report.forceIntegral.x, .05);
    near(result.stretch.x, .1);
  });

  it('uses the unique limiting direction when zero capacity immediately yields', () => {
    const result = advanceSoleShear(v(0, 0), v(.1, 0), .1,
      { stiffness: 10, capacityBefore: 0, capacityAfter: .5 });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(result.report.branch).toBe('plastic');
    expect(result.report.onsetTime).toBe(0);
    near(result.report.forceIntegral.x, .025);
    near(result.report.plasticDissipation, .0125);
    near(result.stretch.x, .05);
    near(result.report.workResidual, 0);
  });

  it('matches the affine-cap collinear plastic integral exactly', () => {
    const h = .1;
    const k = 10;
    const speed = .5;
    const result = advanceSoleShear(v(.2, 0), v(speed * h, 0), h,
      { stiffness: k, capacityBefore: 2, capacityAfter: 1 });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(result.report.branch).toBe('plastic');
    expect(result.report.onsetTime).toBe(0);
    const area = h * (2 + 1) / 2;
    near(result.report.forceIntegral.x, area);
    near(result.report.plasticDissipation, (speed - (-10) / k) * area);
    near(result.stretch.x, .1);
    near(result.report.workResidual, 0);
  });

  it('preserves the force-impulse disk bound for an almost constant affine capacity', () => {
    const result = advanceSoleShear(v(0, .75), v(1, 0), 1,
      { stiffness: 2, capacityBefore: 1.5, capacityAfter: 1.5000000000000002 });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(Math.hypot(result.report.forceIntegral.x, result.report.forceIntegral.y))
      .toBeLessThanOrEqual(result.report.capacityImpulse + 1e-12);
    near(result.report.forceIntegral.x, .79578217, 1e-7);
    near(result.report.forceIntegral.y, 1.18724332, 1e-7);
  });

  it('resolves a shrinking-capacity boundary layer at very small slip speed', () => {
    const capacity = .001;
    const k = 400;
    const speed = 1e-15;
    const initialDirection = 1 / Math.sqrt(2);
    const result = advanceSoleShear(
      v(capacity * initialDirection / k, capacity * initialDirection / k),
      v(speed, 0), 1,
      { stiffness: k, capacityBefore: capacity, capacityAfter: 0 },
    );
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    const area = capacity / 2;
    // For decreasing affine capacity, |n_dot| <= kV/R; therefore
    // |If - n0*area| <= kV*h^2/4 for the linear-to-zero cap.
    const independentBound = k * speed / 4;
    expect(Math.hypot(result.report.forceIntegral.x - initialDirection * area,
      result.report.forceIntegral.y - initialDirection * area)).toBeLessThanOrEqual(independentBound + 1e-14);
    near(result.report.plasticDissipation, result.report.forceIntegral.x * speed
      + capacity * capacity / (2 * k), 1e-18);
    expect(result.report.quadratureErrorImpulse).toBeLessThan(1e-12);
  });

  it('is invariant under normalized area splitting of stiffness and capacity', () => {
    const stretch = v(.2, 0);
    const displacement = v(0, .08);
    const h = .1;
    const single = advanceSoleShear(stretch, displacement, h,
      { stiffness: 10, capacityBefore: 2, capacityAfter: 1.5 });
    const patchA = advanceSoleShear(stretch, displacement, h,
      { stiffness: 4, capacityBefore: .8, capacityAfter: .6 });
    const patchB = advanceSoleShear(stretch, displacement, h,
      { stiffness: 6, capacityBefore: 1.2, capacityAfter: .9 });
    expect(single.report.accepted, single.report.reason ?? '').toBe(true);
    expect(patchA.report.accepted, patchA.report.reason ?? '').toBe(true);
    expect(patchB.report.accepted, patchB.report.reason ?? '').toBe(true);
    near(patchA.stretch.x, single.stretch.x);
    near(patchA.stretch.y, single.stretch.y);
    near(patchB.stretch.x, single.stretch.x);
    near(patchB.stretch.y, single.stretch.y);
    near(patchA.report.forceIntegral.x + patchB.report.forceIntegral.x, single.report.forceIntegral.x);
    near(patchA.report.forceIntegral.y + patchB.report.forceIntegral.y, single.report.forceIntegral.y);
    near(patchA.report.totalDissipation + patchB.report.totalDissipation, single.report.totalDissipation);
  });

  it('rejects a too-small integration budget atomically', () => {
    const input = v(.2, 0);
    const result = advanceSoleShear(input, v(0, .2), .2,
      { stiffness: 10, capacityBefore: 2, capacityAfter: 2 },
      { absoluteTolerance: 1e-30, relativeTolerance: 1e-30, maxEvaluations: 48, maxDepth: 0 });
    expect(result.report.accepted).toBe(false);
    expect(result.stretch).toEqual(input);
    expect(result.report.reason).toMatch(/budget|tolerance/i);
  });

  it('rejects invalid input without changing the supplied stretch', () => {
    const input = v(.2, -.1);
    const result = advanceSoleShear(input, v(1, 2), 0,
      { stiffness: 10, capacityBefore: 2, capacityAfter: 2 });
    expect(result.report.accepted).toBe(false);
    expect(result.stretch).toEqual(input);
  });
});
