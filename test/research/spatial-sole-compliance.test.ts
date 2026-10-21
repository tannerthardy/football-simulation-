import { describe, expect, it } from 'vitest';
import {
  advanceSpatialSoleCompliance,
  type SpatialSoleComplianceMaterial,
} from '../../src/physics/spatial-sole-compliance.js';
import { advanceSpatialSupport, newSpatialSupport, type SpatialSupportState } from '../../src/physics/spatial-support.js';
import {
  identityRigidBasis,
  newMaterialRigid,
  v3Norm,
  v3Sub,
  type MaterialRigidState,
  type Vec3,
} from '../../src/physics/material-rigid.js';

const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });

const body = (mass: number, inertia: number, position: Vec3, velocity: Vec3 = zero()): MaterialRigidState =>
  newMaterialRigid({ mass, inertia, position, velocity, angularMomentum: zero(), basis: identityRigidBasis() });

function state(gapBefore = .02, footVerticalVelocity = 0): SpatialSupportState {
  return newSpatialSupport({
    torso: body(20, 2, { x: 0, y: 0, z: 3 }),
    feet: [
      body(1, .1, { x: 0, y: -.2, z: gapBefore }, { x: 0, y: 0, z: footVerticalVelocity }),
      body(1, .1, { x: 0, y: .2, z: .4 }),
    ],
    gravity: zero(),
    legs: [0, 1].map(i => ({
      hip: { x: 0, y: i ? .1 : -.1, z: 0 },
      ankle: zero(),
      compliance: { restLength: .5, stiffness: 10, forceCap: 0, damping: 0, dampingCap: 0 },
    })) as SpatialSupportState['legs'],
  });
}

const material = (stiffness = 1000, damping = 0, local: Vec3 = zero()): SpatialSoleComplianceMaterial => ({
  planeHeight: 0,
  points: [
    [{ id: 'p', local, areaWeight: 1 }],
    [{ id: 'q', local: zero(), areaWeight: 1 }],
  ],
  stiffness: [stiffness, 0],
  damping: [damping, 0],
});

function expectVectorNear(actual: Vec3, expected: Vec3, tolerance = 1e-8): void {
  expect(v3Norm(v3Sub(actual, expected))).toBeLessThan(tolerance);
}

describe('spatial sole normal compliance research kernel', () => {
  it('couples the discrete-gradient normal force at the material point and closes energy/momentum', () => {
    const before = state(-.01);
    const result = advanceSpatialSoleCompliance(before, .001, material(1000, 0, { x: .12, y: 0, z: 0 }));
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);

    const point = result.report.solePoints[0];
    expect(point.mode).toBe('compressed');
    expect(point.springForce).toBeGreaterThan(0);
    expect(point.springWork + point.potentialAfter - point.potentialBefore).toBeCloseTo(0, 11);
    expect(point.springAttachmentWorkResidual).toBeCloseTo(0, 11);
    expect(result.report.workResidual).toBeCloseTo(0, 8);

    const normalImpulse = point.springImpulse + point.dampingImpulse;
    expect(result.state.feet[0].velocity.z - before.feet[0].velocity.z)
      .toBeCloseTo(normalImpulse / before.feet[0].mass, 8);
    expect(result.state.feet[0].angularMomentum.y).toBeLessThan(0);
    expectVectorNear(result.state.torso.position, before.torso.position);
  });

  it('keeps the spring unilateral and compression-only damping passive', () => {
    const slack = advanceSpatialSoleCompliance(state(.1), .001, material());
    expect(slack.report.accepted, slack.report.reason ?? '').toBe(true);
    expect(slack.report.solePoints[0].springForce).toBe(0);

    const compressed = advanceSpatialSoleCompliance(state(-.01, -1), .001, material(1000, 30));
    expect(compressed.report.accepted, compressed.report.reason ?? '').toBe(true);
    expect(compressed.report.solePoints[0].dampingForce).toBeGreaterThan(0);
    expect(compressed.report.soleDampingWork).toBeLessThanOrEqual(1e-12);
    expect(compressed.report.solePoints[0].springForce).toBeGreaterThanOrEqual(0);
  });

  it('preserves dynamics and guard status when collocated patch area is split', () => {
    const before = state(-.01);
    const single = advanceSpatialSoleCompliance(before, .001, material(1000, 20));
    const splitMaterial = material(1000, 20);
    splitMaterial.points[0] = [
      { id: 'a', local: zero(), areaWeight: .4 },
      { id: 'b', local: zero(), areaWeight: .6 },
    ];
    const split = advanceSpatialSoleCompliance(before, .001, splitMaterial);
    expect(single.report.accepted, single.report.reason ?? '').toBe(true);
    expect(split.report.accepted, split.report.reason ?? '').toBe(true);
    expectVectorNear(single.state.feet[0].velocity, split.state.feet[0].velocity, 1e-9);
    expectVectorNear(single.state.feet[0].angularMomentum, split.state.feet[0].angularMomentum, 1e-9);
    expect(split.report.solePotentialAfter).toBeCloseTo(single.report.solePotentialAfter, 11);

    const singleGuarded = advanceSpatialSoleCompliance(before, .001, material(1000, 20), { maxDampingNumber: .01 });
    const splitGuarded = advanceSpatialSoleCompliance(before, .001, splitMaterial, { maxDampingNumber: .01 });
    expect(singleGuarded.report.accepted).toBe(false);
    expect(splitGuarded.report.accepted).toBe(false);
  });

  it('matches the shared free-flight solve while every patch remains clear', () => {
    const before = state(.2);
    const sole = advanceSpatialSoleCompliance(before, .001, material());
    const freeFlight = advanceSpatialSupport(before, .001);
    expect(sole.report.accepted, sole.report.reason ?? '').toBe(true);
    expect(freeFlight.report.accepted, freeFlight.report.reason ?? '').toBe(true);
    expectVectorNear(sole.state.torso.velocity, freeFlight.state.torso.velocity);
    expectVectorNear(sole.state.feet[0].position, freeFlight.state.feet[0].position);
    expect(sole.report.solePotentialAfter).toBe(0);
    expect(sole.report.soleSpringWork).toBe(0);
  });

  it('accepts a certified endpoint onset and atomically rejects hidden plane crossings', () => {
    const onset = advanceSpatialSoleCompliance(state(0, -.1), .0001, material(1000));
    expect(onset.report.accepted, onset.report.reason ?? '').toBe(true);
    expect(onset.report.solePoints[0].gapBefore).toBe(0);

    const before = state(.001, -40);
    const crossing = advanceSpatialSoleCompliance(before, .001, material(100));
    expect(crossing.report.accepted).toBe(false);
    expect(crossing.state).toEqual(before);
  });

  it('rejects excessive elastic and damping response numbers without advancing state', () => {
    const before = state(-.01);
    const elastic = advanceSpatialSoleCompliance(before, .001, material(1000), { maxCombinedElasticPhase: 1e-6 });
    expect(elastic.report.accepted).toBe(false);
    expect(elastic.report.reason).toContain('elastic response');
    expect(elastic.state).toEqual(before);

    const damping = advanceSpatialSoleCompliance(state(-.01, -1), .001, material(100, 100), { maxDampingNumber: 1e-6 });
    expect(damping.report.accepted).toBe(false);
    expect(damping.report.reason).toContain('damping number');
  });

  it('rejects overflowed work or geometry ledgers instead of accepting NaN diagnostics', () => {
    const before = state(-1e155);
    before.feet[0].mass = 1e155;
    const result = advanceSpatialSoleCompliance(before, .001, material(1));
    expect(result.report.accepted).toBe(false);
    expect(result.state).toEqual(before);
  });
});
