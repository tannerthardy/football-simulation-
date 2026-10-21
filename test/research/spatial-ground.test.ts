import { describe, expect, it } from 'vitest';
import { advanceSpatialGroundContact, type SpatialGroundPoint } from '../../src/physics/spatial-ground.js';
import { newSpatialSupport, spatialSupportEnergy, type SpatialSupportState } from '../../src/physics/spatial-support.js';
import { identityRigidBasis, type Vec3 } from '../../src/physics/material-rigid.js';

const v = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
function standing(): { state: SpatialSupportState; patches: [SpatialGroundPoint[], SpatialGroundPoint[]] } {
  const sole: SpatialGroundPoint[] = [
    { id: 'heel-lateral', local: v(-.12, -.07, -.1), friction: .8 },
    { id: 'heel-medial', local: v(.12, -.07, -.1), friction: .8 },
    { id: 'toe', local: v(0, .14, -.1), friction: .8 },
  ];
  const state = newSpatialSupport({
    torso: { mass: 80, inertia: 12, position: v(0, 0, 1), velocity: v(), angularMomentum: v(), basis: identityRigidBasis() },
    feet: [-.3, .3].map(x => ({ mass: 5, inertia: .8, position: v(x, 0, .1), velocity: v(), angularMomentum: v(), basis: identityRigidBasis() })) as SpatialSupportState['feet'],
    legs: [-.3, .3].map((x, i) => ({ hip: v(x, 0, -.1), ankle: v(0, 0, .1),
      compliance: { restLength: 1.1, stiffness: 1000, forceCap: 1000, damping: 0, dampingCap: 0 } })) as SpatialSupportState['legs'],
    gravity: v(0, 0, -10),
  });
  return { state, patches: [sole, sole.map(p => ({ ...p, id: `right-${p.id}` }))] };
}
function close(report: ReturnType<typeof advanceSpatialGroundContact>['report']): void {
  expect(report.accepted, JSON.stringify({ reason: report.reason, workResidual: report.workResidual, groundWork: report.groundWork,
    instantPower: report.instantaneousContactPower, damping: report.dampingWork, legResiduals: report.legs.map(l => l.springWorkResidual),
    normals: report.contacts.map(c => c.instantaneousForce) })).toBe(true);
  expect(report.residual).toBeLessThan(2e-8);
  expect(Math.abs(report.workResidual)).toBeLessThan(1e-7);
  expect(report.groundWork).toBeLessThanOrEqual(1e-8);
  expect(report.maxNormalResidual).toBeLessThan(2e-8);
  expect(report.maxTangentResidual).toBeLessThan(2e-8);
  expect(report.maxFrictionCapExcess).toBeLessThan(2e-8);
  expect(report.interiorEventCertification).toBe('not-provided');
  expect(report.candidateGeometry.status).toBe('enclosed');
}

describe('coupled spatial sustained sole contact', () => {
  it('supports a quiet torso on six noncollinear finite sole points in the same 18D solve', () => {
    const { state, patches } = standing(), result = advanceSpatialGroundContact(state, .002, patches);
    close(result.report);
    expect(result.report.contacts).toHaveLength(6);
    expect(result.report.contacts.every(c => c.impulse.z >= 0 && c.endpointGap >= -1e-9)).toBe(true);
    expect(result.report.contacts.every(c => Math.abs(c.endpointVelocity.z) < 2e-8)).toBe(true);
    expect(result.report.minInstantaneousRequiredNormal).toBeGreaterThan(0);
    expect(result.report.angularMomentumResidual.x).toBeCloseTo(0, 7);
    expect(result.report.angularMomentumResidual.y).toBeCloseTo(0, 7);
    expect(result.report.angularMomentumResidual.z).toBeCloseTo(0, 7);
    expect(result.report.contacts.reduce((sum, c) => sum + c.impulse.z, 0)).toBeCloseTo(900 * .002, 6);
    expect(spatialSupportEnergy(result.state).total).toBeCloseTo(spatialSupportEnergy(state).total, 7);
  });

  it('uses friction at the finite patch and responds monotonically to stronger sole friction', () => {
    const run = (mu: number) => {
      const { state, patches } = standing();
      for (const foot of patches) for (const p of foot) p.friction = mu;
      const result = advanceSpatialGroundContact(state, .002, patches, { externalImpulses: [{},
        { center: v(.1, 0, 0) }, {}] });
      close(result.report);
      return { state: result.state, report: result.report };
    };
    const slippery = run(.02), grippy = run(.8);
    const slipped = Math.hypot(...[slippery.state.feet[0].velocity.x, slippery.state.feet[0].velocity.y]);
    const gripped = Math.hypot(...[grippy.state.feet[0].velocity.x, grippy.state.feet[0].velocity.y]);
    expect(slipped).toBeGreaterThan(gripped + 1e-4);
    expect(slippery.report.contacts.every(c => Math.hypot(c.impulse.x, c.impulse.y) <= .02 * c.impulse.z + 2e-8)).toBe(true);
    expect(grippy.report.contacts.every(c => Math.hypot(c.impulse.x, c.impulse.y) <= .8 * c.impulse.z + 2e-8)).toBe(true);
    expect(slippery.report.contacts.every(c => Math.hypot(c.instantaneousForce.x, c.instantaneousForce.y)
      <= .02 * c.instantaneousRequiredNormal + 1e-7)).toBe(true);
    expect(grippy.report.contacts.every(c => Math.hypot(c.instantaneousForce.x, c.instantaneousForce.y)
      <= .8 * c.instantaneousRequiredNormal + 1e-7)).toBe(true);
  });

  it('is translation invariant and keeps unsupported first-hit geometry atomic', () => {
    const { state, patches } = standing();
    const baseline = advanceSpatialGroundContact(state, .002, patches); close(baseline.report);
    const moved = structuredClone(state);
    for (const body of [moved.torso, ...moved.feet]) { body.position.x += 7.25; body.position.y -= 2.5; }
    const translated = advanceSpatialGroundContact(moved, .002, patches); close(translated.report);
    expect(translated.state.torso.position.x - baseline.state.torso.position.x).toBeCloseTo(7.25, 8);
    expect(translated.state.torso.position.y - baseline.state.torso.position.y).toBeCloseTo(-2.5, 8);
    const mirrored = structuredClone(state);
    for (const body of [mirrored.torso, ...mirrored.feet]) body.position.x *= -1;
    for (const leg of mirrored.legs) { leg.hip.x *= -1; leg.ankle.x *= -1; }
    const mirrorPatches = patches.map(points => points.map(p => ({ ...p, local: { ...p.local, x: -p.local.x } }))) as [SpatialGroundPoint[], SpatialGroundPoint[]];
    const baseShove = advanceSpatialGroundContact(state, .002, patches, { externalImpulses: [{}, { center: v(.1, 0, 0) }, {}] });
    const mirrorShove = advanceSpatialGroundContact(mirrored, .002, mirrorPatches, { externalImpulses: [{}, { center: v(-.1, 0, 0) }, {}] });
    close(baseShove.report); close(mirrorShove.report);
    expect(mirrorShove.state.feet[0].velocity.x).toBeCloseTo(-baseShove.state.feet[0].velocity.x, 7);
    expect(mirrorShove.state.torso.velocity.x).toBeCloseTo(-baseShove.state.torso.velocity.x, 7);
    const airborne = structuredClone(state); airborne.feet[0].position.z += .001;
    expect(() => advanceSpatialGroundContact(airborne, .002, patches)).toThrow(/already lie on the plane/);
  });

  it('supports one planted foot while leaving the other physical foot unloaded', () => {
    const { state, patches } = standing();
    state.legs[0].compliance = { restLength: 1.1, stiffness: 2000, forceCap: 1000, damping: 0, dampingCap: 0 };
    state.legs[1].compliance = { restLength: .7, stiffness: 1000, forceCap: 0, damping: 0, dampingCap: 0 };
    state.feet[1].position.z = .25;
    const result = advanceSpatialGroundContact(state, .002, [patches[0], []]);
    close(result.report);
    expect(result.report.contacts).toHaveLength(3);
    expect(result.state.feet[1].position.z).toBeLessThan(state.feet[1].position.z);
    expect(result.report.contacts.every(c => c.foot === 0)).toBe(true);
  });

  it('rejects a swinging sole crossing and returning above the plane without creating contact or snapping its pose', () => {
    const { state, patches } = standing();
    state.gravity = v();
    for (const leg of state.legs) leg.compliance = { ...leg.compliance, forceCap: 0, damping: 0, dampingCap: 0 };
    state.feet[1] = { mass: 2, inertia: .008, position: v(.3, 0, .040001),
      velocity: v(0, 0, .199), angularMomentum: v(.016, 0, 0), basis: identityRigidBasis() };
    const swing: SpatialGroundPoint[] = [
      { id: 'low-toe', local: v(0, -.1, -.04), friction: .8 },
      { id: 'other-toe', local: v(.05, .1, -.04), friction: .8 },
      { id: 'heel', local: v(-.05, .1, -.04), friction: .8 },
    ];
    const original = structuredClone(state);
    const ungated = advanceSpatialGroundContact(state, .025, [patches[0], []]);
    close(ungated.report);
    const foot = ungated.state.feet[1], toe = swing[0].local;
    const endpointHeight = foot.position.z + foot.basis[0].z * toe.x + foot.basis[1].z * toe.y + foot.basis[2].z * toe.z;
    expect(endpointHeight).toBeGreaterThan(0);
    expect(state.feet[1].position.z + toe.z).toBeGreaterThan(0);
    const gated = advanceSpatialGroundContact(state, .025, [patches[0], []], { soleGeometry: [patches[0], swing] });
    expect(gated.report.accepted).toBe(false);
    expect(gated.report.reason).toMatch(/crosses the plane inside/);
    expect(gated.report.candidateGeometry.status).toBe('penetrated');
    expect(gated.report.candidateGeometry.points.some(p => p.id === 'low-toe' && p.report.penetrationBeyondTolerance.certain)).toBe(true);
    expect(gated.report.contacts.every(c => c.foot === 0)).toBe(true);
    expect(gated.state).toEqual(original);
    expect(state).toEqual(original);
  });

  it('rejects a step beyond its local rotor phase limit', () => {
    const { state, patches } = standing(); state.feet[0].angularMomentum.z = .8;
    const result = advanceSpatialGroundContact(state, .01, patches, { maxAngularPhase: .001 });
    expect(result.report.accepted).toBe(false);
    expect(result.report.reason).toMatch(/angular phase/);
    expect(result.state).toEqual(state);
  });

  it('rejects intervals beyond the shared axial elastic phase budget', () => {
    const { state, patches } = standing();
    const result = advanceSpatialGroundContact(state, .002, patches, { maxElasticPhase: 1e-4 });
    expect(result.report.accepted).toBe(false);
    expect(result.report.reason).toMatch(/elastic phase/);
    expect(result.report.maxElasticPhase).toBeGreaterThan(1e-4);
    expect(result.report.maxElasticPhaseLimit).toBe(1e-4);
    expect(result.state).toEqual(state);
  });

  it('rejects an interval whose endpoint reaction would require adhesion', () => {
    const { state, patches } = standing();
    const result = advanceSpatialGroundContact(state, .01, patches, { externalImpulses: [{}, {},
      { center: v(0, 0, 20) }] });
    expect(result.report.accepted).toBe(false);
    expect(result.report.reason).toMatch(/negative instantaneous normal reaction|zero normal reaction|contact|line search/);
    expect(result.state).toEqual(state);
  });

  it('solves realistic low-inertia quiet stance and repeated small shoves from force-level warm starts', () => {
    const points: SpatialGroundPoint[] = [
      { id: 'heel-lateral', local: v(-.12, -.05, -.04), friction: .8 },
      { id: 'heel-medial', local: v(-.12, .05, -.04), friction: .8 },
      { id: 'toe', local: v(.13, 0, -.04), friction: .8 },
    ];
    const legLength = Math.hypot(.08, .88), springLoad = 480 * legLength / .88;
    const state = newSpatialSupport({
      torso: { mass: 96, inertia: 8, position: v(0, 0, 1.1), velocity: v(), angularMomentum: v(), basis: identityRigidBasis() },
      feet: [-1, 1].map(i => ({ mass: 2, inertia: .008, position: v(0, i * .16, .04), velocity: v(), angularMomentum: v(), basis: identityRigidBasis() })) as SpatialSupportState['feet'],
      legs: [-1, 1].map(i => ({ hip: v(0, i * .08, -.15), ankle: v(0, 0, .03), compliance: {
        restLength: legLength + springLoad / 4800, stiffness: 4800, forceCap: 1600, damping: 30, dampingCap: 300,
      } })) as SpatialSupportState['legs'],
      gravity: v(0, 0, -10),
    });
    const patches: [SpatialGroundPoint[], SpatialGroundPoint[]] = [points, points.map(p => ({ ...p, id: `right-${p.id}` }))];
    for (const h of [.004, .002]) for (const shove of [0, 10, 50, 100]) {
      let current = state;
      for (let tick = 0; tick < Math.round(.012 / h); tick++) {
        const result = advanceSpatialGroundContact(current, h, patches, {
          externalImpulses: [{ center: v(shove * h, 0, 0) }, {}, {}],
        });
        expect(result.report.accepted, JSON.stringify({ h, shove, tick, reason: result.report.reason,
          residual: result.report.residual, iterations: result.report.iterations })).toBe(true);
        expect(result.report.residual).toBeLessThan(2e-9);
        expect(result.report.maxNormalResidual).toBeLessThan(2e-9);
        expect(result.report.maxTangentResidual).toBeLessThan(2e-9);
        expect(result.report.maxFrictionCapExcess).toBeLessThan(2e-9);
        current = result.state;
      }
    }
  });
});
