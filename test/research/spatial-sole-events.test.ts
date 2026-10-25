import { describe, expect, it } from 'vitest';
import { advanceSpatialSoleCompliance, advanceSpatialSoleSlipStop, createSpatialSoleShearState,
  type SpatialSoleComplianceMaterial, type SpatialSoleConstantForces,
  type SpatialSoleSlipStopOptions } from '../../src/physics/spatial-sole-compliance.js';
import { identityRigidBasis, type MaterialRigidState, type Vec3 } from '../../src/physics/material-rigid.js';
import type { SpatialSupportState } from '../../src/physics/spatial-support.js';

const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const body = (mass: number, inertia: number, position: Vec3): MaterialRigidState =>
  ({ mass, inertia, position, velocity: zero(), angularMomentum: zero(), basis: identityRigidBasis() });
function fixture(axis: 'x' | 'y' = 'x', sign = 1, count = 1, force = 0) {
  const state: SpatialSupportState = {
    torso: body(1, 1, { x: 0, y: 0, z: 10 }),
    feet: [body(2, .008, { x: 0, y: 0, z: -.01 }), body(2, .008, { x: 0, y: 0, z: 3 })],
    legs: [0, 1].map(() => ({ hip: zero(), ankle: zero(),
      compliance: { restLength: 1, stiffness: 1, forceCap: 0, damping: 0, dampingCap: 0 } })) as SpatialSupportState['legs'],
    gravity: { x: 0, y: 0, z: -10 },
  };
  state.feet[0].velocity[axis] = sign * .03;
  const patches = Array.from({ length: count }, (_, i) =>
    ({ id: `patch${i}`, local: zero(), areaWeight: 1 / count, friction: .2 }));
  const material: SpatialSoleComplianceMaterial = {
    points: [patches, [{ id: 'swing', local: zero(), areaWeight: 1 }]],
    stiffness: [50_000, 50_000], damping: [0, 0], shearStiffness: [4000, 0],
  };
  const shearState = createSpatialSoleShearState(material);
  for (const patch of shearState.points) if (patch.foot === 0) patch.stretch[axis] = sign * .025;
  const center = { x: 0, y: 0, z: -480 };
  center[axis] = sign * force;
  const externalForces: SpatialSoleConstantForces = [{}, { center }, {}];
  const direction = { x: 0, y: 0 }; direction[axis] = sign;
  const options: SpatialSoleSlipStopOptions = { shearState, foot: 0, patchId: 'patch0', direction,
    maxDuration: .0015, externalForces, tolerance: 1e-12 };
  return { state, material, options };
}

describe('force-balanced collinear sole slip-stop event', () => {
  it('solves duration and zero slip together, retaining strain for natural elastic unloading', () => {
    const f = fixture();
    const before = structuredClone(f.state), strain = structuredClone(f.options.shearState);
    const stopped = advanceSpatialSoleSlipStop(f.state, f.material, f.options);
    expect(stopped.report.accepted, stopped.report.reason ?? '').toBe(true);
    expect(stopped.duration).toBeCloseTo(.0006, 13);
    expect(stopped.event?.finalSlip).toBe(0);
    expect(stopped.state.feet[0].velocity.x).toBe(0);
    expect(stopped.state.feet[0].position.x).toBeCloseTo(.000009, 13);
    expect(stopped.shearState!.points[0].stretch.x).toBeCloseTo(.025, 13);
    expect(stopped.report.shearPotentialAfter).toBeCloseTo(1.25, 12);
    expect(stopped.report.soleShearDissipation).toBeCloseTo(.0009, 12);
    expect(stopped.report.residual).toBeLessThan(1e-12);
    expect(Math.abs(stopped.report.workResidual)).toBeLessThan(1e-10);
    expect(f.state).toEqual(before);
    expect(f.options.shearState).toEqual(strain);
    const dt = .0004;
    const unloaded = advanceSpatialSoleCompliance(stopped.state, dt, f.material,
      { shearState: stopped.shearState!, externalImpulses: [{}, { center: { x: 0, y: 0, z: -480 * dt } }, {}] });
    expect(unloaded.report.accepted, unloaded.report.reason ?? '').toBe(true);
    expect(unloaded.state.feet[0].velocity.x).toBeLessThan(0);
    expect(unloaded.report.soleShearWork).toBeGreaterThan(0);
    expect(unloaded.report.shearPotentialAfter).toBeLessThan(unloaded.report.shearPotentialBefore);
    expect(unloaded.report.soleShearDissipation).toBe(0);
  });

  it('doses constant center and material-point forces with the solved duration', () => {
    const f = fixture('x', 1, 1, 40);
    f.options.externalForces![1] = { center: { x: 0, y: 0, z: -480 },
      points: [{ id: 'pull', local: zero(), force: { x: 40, y: 0, z: 0 } }] };
    const result = advanceSpatialSoleSlipStop(f.state, f.material, f.options);
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(result.duration).toBeCloseTo(.001, 13);
    const known = result.report.external.find(load => load.id === 'pull')!;
    expect(known.impulse.x).toBeCloseTo(40 * result.duration, 13);
    expect(known.work).toBeCloseTo(40 * result.state.feet[0].position.x, 13);
    expect(result.report.knownExternalWork).toBeCloseTo(.0006, 12);
    expect(result.report.soleShearDissipation).toBeCloseTo(.0015, 12);
  });

  it('preserves reflected, axis-swapped and weighted split stop responses', () => {
    for (const axis of ['x', 'y'] as const) for (const sign of [-1, 1]) for (const count of [1, 2, 4, 8]) {
      const f = fixture(axis, sign, count);
      const result = advanceSpatialSoleSlipStop(f.state, f.material, f.options);
      expect(result.report.accepted, result.report.reason ?? '').toBe(true);
      expect(result.duration).toBeCloseTo(.0006, 12);
      expect(result.state.feet[0].velocity[axis]).toBe(0);
      expect(result.state.feet[0].position[axis]).toBeCloseTo(sign * .000009, 12);
      expect(result.report.soleShearDissipation).toBeCloseTo(.0009, 11);
      expect(result.report.shearPotentialAfter).toBeCloseTo(1.25, 11);
    }
  });

  it('does not manufacture a stop outside the horizon or when the force accelerates sliding', () => {
    for (const mode of ['short-horizon', 'no-stop', 'no-incoming-slip'] as const) {
      const f = fixture();
      if (mode === 'short-horizon') f.options.maxDuration = .0001;
      if (mode === 'no-stop') f.options.externalForces![1].center!.x = 120;
      if (mode === 'no-incoming-slip') f.state.feet[0].velocity.x = 0;
      const result = advanceSpatialSoleSlipStop(f.state, f.material, f.options);
      expect(result.report.accepted).toBe(false);
      expect(result.report.reason).toMatch(/outside|does not produce|no positive/i);
      expect(result.duration).toBe(0);
      expect(result.event).toBeNull();
      expect(result.state).toEqual(f.state);
      expect(result.shearState).toEqual(f.options.shearState);
    }
  });

  it('accepts a stop at or inside the horizon and rejects a bound just before it', () => {
    const exact = .0006;
    for (const maxDuration of [exact, exact + 1e-10, exact - 1e-10]) {
      const f = fixture();
      f.options.maxDuration = maxDuration;
      const original = structuredClone({ state: f.state, shear: f.options.shearState });
      const result = advanceSpatialSoleSlipStop(f.state, f.material, f.options);
      if (maxDuration < exact) {
        expect(result.report.accepted).toBe(false);
        expect(result.duration).toBe(0);
        expect(result.event).toBeNull();
        expect(result.state).toEqual(f.state);
        expect(result.shearState).toEqual(f.options.shearState);
      } else {
        expect(result.report.accepted, result.report.reason ?? '').toBe(true);
        expect(result.duration).toBeGreaterThan(0);
        expect(result.duration).toBeLessThanOrEqual(maxDuration);
        expect(result.duration).toBeCloseTo(exact, 13);
        expect(result.state.feet[0].velocity.x).toBe(0);
      }
      expect({ state: f.state, shear: f.options.shearState }).toEqual(original);
    }
  });

  it('rolls back body, strain and elapsed time when the shared phase audit rejects', () => {
    const f = fixture();
    f.options.maxCombinedElasticPhase = 1e-8;
    const result = advanceSpatialSoleSlipStop(f.state, f.material, f.options);
    expect(result.report.accepted).toBe(false);
    expect(result.report.reason).toMatch(/elastic response budget/i);
    expect(result.duration).toBe(0);
    expect(result.event).toBeNull();
    expect(result.state).toEqual(f.state);
    expect(result.shearState).toEqual(f.options.shearState);
  });

  it('uses the physical event time for conditioning even when the horizon is enormous', () => {
    const f = fixture();
    const ordinaryBound = advanceSpatialSoleSlipStop(f.state, f.material, f.options);
    const hugeBound = advanceSpatialSoleSlipStop(f.state, f.material,
      { ...f.options, maxDuration: 1e12 });
    expect(ordinaryBound.report.accepted, ordinaryBound.report.reason ?? '').toBe(true);
    expect(hugeBound.report.accepted, hugeBound.report.reason ?? '').toBe(true);
    expect(hugeBound.duration).toBe(ordinaryBound.duration);
    expect(hugeBound.state).toEqual(ordinaryBound.state);
    expect(hugeBound.shearState).toEqual(ordinaryBound.shearState);
    expect(hugeBound.report).toEqual(ordinaryBound.report);
  });

  it('rejects unsupported rotation, variable normal load and interval impulse input', () => {
    const rotating = fixture(); rotating.state.feet[0].angularMomentum.y = .001;
    expect(() => advanceSpatialSoleSlipStop(rotating.state, rotating.material, rotating.options)).toThrow(/no rotation/i);
    const rising = fixture(); rising.state.feet[0].velocity.z = .1;
    expect(() => advanceSpatialSoleSlipStop(rising.state, rising.material, rising.options)).toThrow(/normal equilibrium/i);
    const unbalanced = fixture(); unbalanced.options.externalForces![1].center!.z = -479;
    expect(() => advanceSpatialSoleSlipStop(unbalanced.state, unbalanced.material, unbalanced.options)).toThrow(/normal equilibrium/i);
    const impulses = fixture();
    expect(() => advanceSpatialSoleSlipStop(impulses.state, impulses.material,
      { ...impulses.options, externalImpulses: [{}, {}, {}] } as SpatialSoleSlipStopOptions))
      .toThrow(/not interval impulses/i);
  });

  it('leaves the raw near-zero-chord reversal rejection intact', () => {
    const f = fixture();
    const dt = .0012;
    const unresolved = advanceSpatialSoleCompliance(f.state, dt, f.material,
      { shearState: f.options.shearState, externalImpulses: [{}, { center: { x: 0, y: 0, z: -480 * dt } }, {}] });
    expect(unresolved.report.accepted).toBe(false);
    expect(unresolved.report.reason).toMatch(/velocity reversal/i);
    expect(unresolved.state).toEqual(f.state);
    expect(unresolved.shearState).toEqual(f.options.shearState);
  });

  it('retains roundoff normal and orthogonal motion instead of projecting them', () => {
    const f = fixture();
    f.state.feet[0].velocity.z = 2e-17;
    f.state.feet[0].velocity.y = 1e-17;
    f.state.feet[0].angularMomentum.z = 1e-18;
    f.options.shearState.points[0].stretch.y = 3e-19;
    const result = advanceSpatialSoleSlipStop(f.state, f.material, f.options);
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(result.state.feet[0].velocity.x).toBe(0);
    expect(result.state.feet[0].velocity.y).not.toBe(0);
    expect(result.state.feet[0].angularMomentum.z).toBe(1e-18);
    expect(result.shearState!.points[0].stretch.y).not.toBe(0);
    expect(Math.abs(result.report.workResidual)).toBeLessThan(1e-10);
    expect(f.state.feet[0].velocity.z).toBe(2e-17);
    expect(f.state.feet[0].velocity.y).toBe(1e-17);
  });

  it('rejects unsupported zero traction, noncollinear geometry and malformed physical forces', () => {
    const noTraction = fixture();
    noTraction.material.points[0][0].friction = 0;
    noTraction.options.shearState = createSpatialSoleShearState(noTraction.material);
    expect(() => advanceSpatialSoleSlipStop(noTraction.state, noTraction.material, noTraction.options))
      .toThrow(/positive normal equilibrium/i);
    const corner = fixture(); corner.material.points[0][0].local.x = .1;
    corner.options.shearState = createSpatialSoleShearState(corner.material);
    corner.options.shearState.points[0].stretch.x = .025;
    expect(() => advanceSpatialSoleSlipStop(corner.state, corner.material, corner.options))
      .toThrow(/center patches/i);
    const diagonal = fixture(); diagonal.options.direction = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
    expect(() => advanceSpatialSoleSlipStop(diagonal.state, diagonal.material, diagonal.options))
      .toThrow(/signed x\/y axis/i);
    const badForce = fixture();
    badForce.options.externalForces![1].center = { x: NaN, y: 0, z: -480 };
    expect(() => advanceSpatialSoleSlipStop(badForce.state, badForce.material, badForce.options))
      .toThrow(/finite.*force slots/i);
  });
});
