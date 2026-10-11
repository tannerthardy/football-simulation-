import { describe, expect, it } from 'vitest';
import {
  advanceSpatialSoleCompliance,
  createSpatialSoleShearState,
  type SpatialSoleComplianceMaterial,
  type SpatialSoleShearState,
} from '../../src/physics/spatial-sole-compliance.js';
import { newSpatialSupport, type SpatialSupportState } from '../../src/physics/spatial-support.js';
import {
  identityRigidBasis,
  newMaterialRigid,
  type MaterialRigidState,
  type Vec3,
} from '../../src/physics/material-rigid.js';

const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const body = (mass: number, inertia: number, position: Vec3, velocity: Vec3 = zero()): MaterialRigidState =>
  newMaterialRigid({ mass, inertia, position, velocity, angularMomentum: zero(), basis: identityRigidBasis() });

function state(footXVelocity = 20): SpatialSupportState {
  return newSpatialSupport({
    torso: body(20, 2, { x: 0, y: 0, z: 2 }),
    feet: [
      body(1, .1, { x: 0, y: 0, z: -.01 }, { x: footXVelocity, y: 0, z: 0 }),
      body(1, .1, { x: 0, y: .2, z: .5 }),
    ],
    gravity: zero(),
    legs: [0, 1].map(i => ({
      hip: { x: 0, y: i ? .1 : -.1, z: 0 },
      ankle: zero(),
      compliance: { restLength: .5, stiffness: 1, forceCap: 0, damping: 0, dampingCap: 0 },
    })) as SpatialSupportState['legs'],
  });
}

function material(friction = .5, shearStiffness = 100): SpatialSoleComplianceMaterial {
  return {
    planeHeight: 0,
    points: [
      [{ id: 'loaded', local: zero(), areaWeight: 1, friction }],
      [{ id: 'swing', local: zero(), areaWeight: 1 }],
    ],
    stiffness: [1000, 1000],
    damping: [0, 0],
    shearStiffness: [shearStiffness, 0],
  };
}

function setStretch(initial: SpatialSoleShearState, x: number, y = 0): SpatialSoleShearState {
  return {
    fingerprint: initial.fingerprint,
    points: initial.points.map(patch => patch.foot === 0
      ? { ...patch, stretch: { x, y } }
      : { ...patch, stretch: { ...patch.stretch } }),
  };
}

describe('coupled compliant sole shear research path', () => {
  it('persists elastic shear stretch and respects the actual normal-derived friction disk', () => {
    const input = state();
    const m = material(.5, 100);
    const shearState = setStretch(createSpatialSoleShearState(m), .04);
    const result = advanceSpatialSoleCompliance(input, .001, m, { shearState });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(result.shearState).not.toBeNull();
    const point = result.report.solePoints.find(item => item.id === 'loaded')!;
    expect(point.shear).not.toBeNull();
    expect(point.shear!.capacityBefore).toBeCloseTo(.5 * 10, 8);
    expect(point.shear!.capacityAfter).toBeGreaterThan(0);
    expect(Math.hypot(100 * result.shearState!.points[0].stretch.x,
      100 * result.shearState!.points[0].stretch.y))
      .toBeLessThanOrEqual(point.shear!.capacityAfter + 1e-8);
    expect(point.shear!.constitutive.branch).toBe('elastic-plastic');
    expect(point.shear!.constitutive.plasticDissipation).toBeGreaterThan(0);
    expect(Math.abs(point.shear!.attachmentWorkResidual)).toBeLessThan(1e-8);
    expect(Math.abs(point.shear!.energyResidual)).toBeLessThan(1e-8);
    expect(result.report.soleShearDissipation).toBeGreaterThan(0);
    expect(Math.abs(result.report.workResidual)).toBeLessThan(1e-8);
  });


  it('applies shear at the sole material point so its off-axis impulse carries torque', () => {
    const input = state();
    const m = material(.5, 100);
    m.points[0][0].local = { x: 0, y: .1, z: 0 };
    const shearState = setStretch(createSpatialSoleShearState(m), .04);
    const result = advanceSpatialSoleCompliance(input, .001, m, { shearState });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    const load = result.report.external.find(entry => entry.id === 'sole:0:loaded:shear');
    expect(load).toBeDefined();
    expect(Math.abs(load!.angularImpulse.z)).toBeGreaterThan(1e-8);
  });


  it('preserves the same saturated response when a patch is subdivided by area weight', () => {
    const run = (count: number) => {
      const m = material(.3, 10_000);
      m.stiffness = [1000, 1000];
      m.points[0] = Array.from({ length: count }, (_, i) => ({
        id: `loaded-${i}`,
        local: zero(),
        areaWeight: 1 / count,
        friction: .3,
      }));
      const result = advanceSpatialSoleCompliance(state(10), .001, m,
        { shearState: createSpatialSoleShearState(m) });
      return { result, m };
    };
    const one = run(1).result;
    expect(one.report.accepted, one.report.reason ?? '').toBe(true);
    for (const count of [2, 4, 8]) {
      const split = run(count).result;
      expect(split.report.accepted, split.report.reason ?? '').toBe(true);
      for (const key of ['x', 'y', 'z'] as const) {
        expect(split.state.feet[0].position[key]).toBeCloseTo(one.state.feet[0].position[key], 12);
        expect(split.state.feet[0].velocity[key]).toBeCloseTo(one.state.feet[0].velocity[key], 12);
        expect(split.state.feet[0].angularMomentum[key]).toBeCloseTo(one.state.feet[0].angularMomentum[key], 12);
      }
      expect(split.report.workResidual).toBeCloseTo(one.report.workResidual, 8);
      const oneImpulse = one.report.external.find(entry => entry.id === 'sole:0:loaded-0:shear')!.impulse;
      const splitImpulse = split.report.external
        .filter(entry => entry.id.startsWith('sole:0:loaded-') && entry.id.endsWith(':shear'))
        .reduce((sum, entry) => ({ x: sum.x + entry.impulse.x, y: sum.y + entry.impulse.y,
          z: sum.z + entry.impulse.z }), zero());
      expect(splitImpulse.x).toBeCloseTo(oneImpulse.x, 8);
      expect(splitImpulse.y).toBeCloseTo(oneImpulse.y, 8);
      expect(splitImpulse.z).toBeCloseTo(oneImpulse.z, 8);
    }
  });

  it('returns stored shear energy without traction when a compressed patch becomes free', () => {
    const m = material(.5, 100);
    m.points[1][0].friction = .5;
    m.shearStiffness = [100, 100];
    const initial = createSpatialSoleShearState(m);
    const stretched = {
      ...initial,
      points: initial.points.map(patch => patch.foot === 1
        ? { ...patch, stretch: { x: .02, y: 0 } }
        : patch),
    };
    const released = advanceSpatialSoleCompliance(state(0), .001, m, { shearState: stretched });
    const noStoredEnergy = advanceSpatialSoleCompliance(state(0), .001, m, { shearState: initial });
    expect(released.report.accepted, released.report.reason ?? '').toBe(true);
    expect(noStoredEnergy.report.accepted, noStoredEnergy.report.reason ?? '').toBe(true);
    expect(released.state).toEqual(noStoredEnergy.state);
    const free = released.report.solePoints.find(point => point.foot === 1)!;
    expect(free.shear!.capacityBefore).toBe(0);
    expect(free.shear!.capacityAfter).toBe(0);
    expect(free.shear!.constitutive.footImpulse).toEqual({ x: 0, y: 0 });
    expect(free.shear!.finalStretch).toEqual({ x: 0, y: 0 });
    expect(free.shear!.constitutive.initialReturnDissipation).toBeCloseTo(.5 * 100 * .02 ** 2, 10);
  });

  it('allows positive attachment work while a loaded patch elastically unloads', () => {
    const m = material(.5, 100);
    const initial = setStretch(createSpatialSoleShearState(m), .02);
    const result = advanceSpatialSoleCompliance(state(-1), .001, m, { shearState: initial });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    const shear = result.report.solePoints.find(point => point.foot === 0)!.shear!;
    expect(shear.actualAttachmentWork).toBeGreaterThan(0);
    expect(shear.potentialAfter).toBeLessThan(shear.potentialBefore);
    expect(shear.constitutive.totalDissipation).toBe(0);
    expect(Math.abs(shear.energyResidual)).toBeLessThan(1e-9);
  });

  it('keeps body and shear state atomic when a local shear phase guard rejects', () => {
    const input = state();
    const m = material(.5, 100);
    const shearState = setStretch(createSpatialSoleShearState(m), .04);
    const result = advanceSpatialSoleCompliance(input, .001, m,
      { shearState, maxShearElasticPhase: 1e-6 });
    expect(result.report.accepted).toBe(false);
    expect(result.state).toEqual(input);
    expect(result.shearState).toEqual(shearState);
  });

  it('requires a matching persistent state and rejects stale or malformed patch state', () => {
    const input = state();
    const m = material();
    expect(() => advanceSpatialSoleCompliance(input, .001, m)).toThrow(/shearState is required/i);
    const initial = createSpatialSoleShearState(m);
    const stale = material(.6, 100);
    expect(() => advanceSpatialSoleCompliance(input, .001, stale, { shearState: initial }))
      .toThrow(/fingerprint mismatch/i);
    const duplicate = { ...initial, points: [initial.points[0], initial.points[0]] };
    expect(() => advanceSpatialSoleCompliance(input, .001, m, { shearState: duplicate }))
      .toThrow(/fingerprint mismatch|patch IDs/i);
  });


  it('rejects an initial yield-and-stop hidden by a nearly zero net chord', () => {
    const m = material(.25, 4096);
    m.stiffness = [65_536, 1000];
    const input = state((1 - 1e-12) / 32);
    input.feet[0] = body(2, .008, { x: 0, y: 0, z: -1 / 128 },
      { x: (1 - 1e-12) / 32, y: 0, z: 0 });
    for (const stretch of [.03125, .03125 * 1.1]) {
      const shearState = setStretch(createSpatialSoleShearState(m), stretch);
      const result = advanceSpatialSoleCompliance(input, 1 / 1024, m, {
        shearState,
        externalImpulses: [{}, { center: { x: 0, y: 0, z: -.5 } }, {}],
      });
      expect(result.report.accepted).toBe(false);
      expect(result.report.reason).toMatch(/velocity reversal/i);
      expect(result.shearState).toEqual(shearState);
      expect(result.state).toEqual(newSpatialSupport(input));
    }
  });

  it('rejects unresolved plastic endpoint reversal but permits elastic rebound', () => {
    const m = material(.5, 100);
    const initial = setStretch(createSpatialSoleShearState(m), .049);
    const reversal = advanceSpatialSoleCompliance(state(10), .001, m, {
      shearState: initial,
      externalImpulses: [{}, { center: { x: -12, y: 0, z: 0 } }, {}],
    });
    expect(reversal.report.accepted).toBe(false);
    expect(reversal.report.reason).toMatch(/velocity reversal/i);
    expect(reversal.shearState).toEqual(initial);
    const elasticMaterial = material(.5, 10);
    const elasticState = setStretch(createSpatialSoleShearState(elasticMaterial), .02);
    const rebound = advanceSpatialSoleCompliance(state(1), .001, elasticMaterial, {
      shearState: elasticState,
      externalImpulses: [{}, { center: { x: -3, y: 0, z: 0 } }, {}],
    });
    expect(rebound.report.accepted, rebound.report.reason ?? '').toBe(true);
  });

  it('leaves normal-only callers unchanged when friction is zero', () => {
    const input = state(0);
    const normalOnly = advanceSpatialSoleCompliance(input, .001, material(0, 100));
    const explicitZero = advanceSpatialSoleCompliance(input, .001, material(0, 100), {
      shearState: createSpatialSoleShearState(material(0, 100)),
    });
    expect(normalOnly.report.accepted, normalOnly.report.reason ?? '').toBe(true);
    expect(explicitZero.report.accepted, explicitZero.report.reason ?? '').toBe(true);
    expect(normalOnly.state).toEqual(explicitZero.state);
    expect(normalOnly.report.solePoints.map(point => point.springImpulse))
      .toEqual(explicitZero.report.solePoints.map(point => point.springImpulse));
    expect(normalOnly.shearState).toBeNull();
  });
});
