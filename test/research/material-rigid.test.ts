import { describe, expect, it } from 'vitest';
import { advanceMaterialRigid, identityRigidBasis, newMaterialRigid, rigidAngularMomentum, rigidAttachmentInterval,
  rigidBasisError, rigidImpactAttachment, rigidImpactState, rigidKineticEnergy, rigidMidpointState,
  rigidPointImpulseResponse, rigidPointPosition, rigidPointVelocity, rigidWorldOffset,
  v3Add, v3Cross, v3Dot, v3Norm, v3Scale, v3Sub,
  type MaterialRigidState, type Vec3 } from '../../src/physics/material-rigid.js';

const vec = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
const body = (extra: Partial<MaterialRigidState> = {}): MaterialRigidState => newMaterialRigid({
  mass: 90, inertia: 3, position: vec(7, -2, 1.2), velocity: vec(2, .3, -.1),
  angularMomentum: vec(.3, .5, -.2), basis: identityRigidBasis(), ...extra });
const closeVec = (actual: Vec3, expected: Vec3, decimals = 10): void => {
  expect(actual.x).toBeCloseTo(expected.x, decimals); expect(actual.y).toBeCloseTo(expected.y, decimals);
  expect(actual.z).toBeCloseTo(expected.z, decimals);
};
const reflect = (v: Vec3): Vec3 => vec(-v.x, v.y, v.z);
const reflectAxial = (v: Vec3): Vec3 => vec(v.x, -v.y, -v.z);
function reflected(s: MaterialRigidState): MaterialRigidState {
  return body({ ...s, position: reflect(s.position), velocity: reflect(s.velocity), angularMomentum: reflectAxial(s.angularMomentum),
    basis: [v3Scale(reflect(s.basis[0]), -1), reflect(s.basis[1]), reflect(s.basis[2])] });
}

describe('one Cayley material Jacobian for rigid force, work and moment', () => {
  it('an off-center impulse moves the actual hip and closes all mechanical accounts', () => {
    const before = body(), local = vec(.2, -.15, -.35), impulse = vec(8, 12, -3);
    const result = advanceMaterialRigid(before, .015, { pointImpulses: [{ id: 'left-hip', local, impulse }] });
    expect(result.report.accepted, result.report.reason ?? '').toBe(true);
    expect(Math.abs(result.report.workResidual)).toBeLessThan(1e-10);
    expect(v3Norm(result.report.linearMomentumResidual)).toBeLessThan(1e-12);
    expect(v3Norm(result.report.angularMomentumResidual)).toBeLessThan(1e-11);
    const point = result.report.points[0];
    expect(v3Norm(point.identityResidual)).toBeLessThan(1e-11);
    expect(v3Norm(v3Sub(rigidWorldOffset(result.state, local), rigidWorldOffset(before, local)))).toBeGreaterThan(.001);
    closeVec(v3Sub(result.state.angularMomentum, before.angularMomentum), point.angularImpulse);
    closeVec(v3Scale(v3Sub(result.state.velocity, before.velocity), before.mass), impulse);
    expect(point.work).toBeCloseTo(v3Dot(impulse, point.displacementVelocity), 10);
    // Freezing the old lever cannot produce the same finite-interval response.
    expect(v3Norm(v3Sub(point.angularImpulse, v3Cross(rigidWorldOffset(before, local), impulse)))).toBeGreaterThan(1e-3);
  });

  it('multiple material loads, a COM load and an explicit couple each account for work', () => {
    const before = body(), center = vec(2, -1, .4), couple = vec(.1, -.2, .15);
    const loads = [{ id: 'hip', local: vec(-.2, 0, -.35), impulse: vec(6, 2, 1) },
      { id: 'shoulder', local: vec(.2, .1, .25), impulse: vec(-3, 1, 2) }];
    for (const h of [.001, .04, .2]) {
      const { state, report } = advanceMaterialRigid(before, h, { centerImpulse: center, coupleImpulse: couple, pointImpulses: loads });
      expect(report.accepted, report.reason ?? '').toBe(true);
      expect(Math.abs(report.workResidual)).toBeLessThan(1e-9);
      expect(v3Norm(report.angularMomentumResidual)).toBeLessThan(1e-10);
      const work = loads.reduce((sum, load) => sum + v3Dot(load.impulse,
        v3Scale(v3Sub(rigidPointPosition(state, load.local), rigidPointPosition(before, load.local)), 1 / h)), 0)
        + v3Dot(center, v3Scale(v3Add(before.velocity, state.velocity), .5))
        + v3Dot(couple, v3Scale(v3Add(before.angularMomentum, state.angularMomentum), .5 / before.inertia));
      expect(rigidKineticEnergy(state) - rigidKineticEnergy(before)).toBeCloseTo(work, 9);
    }
  });

  it('the shared candidate pose preserves rigid material lengths without pose projection', () => {
    const before = body({ angularMomentum: vec(.5, -.7, 2.1) });
    const after = rigidMidpointState(before, .4, vec(-1, .4, .5), vec(.2, .8, 3));
    const a = vec(.3, -.2, -.4), b = vec(-.1, .4, .2);
    expect(rigidBasisError(after.basis)).toBeLessThan(1e-14);
    expect(v3Norm(v3Sub(rigidPointPosition(after, a), rigidPointPosition(after, b))))
      .toBeCloseTo(v3Norm(v3Sub(a, b)), 12);
    for (const local of [a, b, vec(), vec(.2, .8, -.7)])
      expect(v3Norm(rigidAttachmentInterval(before, after, .4, local).identityResidual)).toBeLessThan(1e-13);
  });

  it('free rotation has second-order trajectory accuracy and exact represented energy', () => {
    const initial = body({ inertia: 1, angularMomentum: vec(0, 0, 2), position: vec(), velocity: vec() });
    const angles: number[] = [];
    for (const dt of [.1, .05]) {
      let s = initial;
      for (let i = 0; i < Math.round(1 / dt); i++) s = advanceMaterialRigid(s, dt).state;
      const point = rigidPointPosition(s, vec(1, 0, 0));
      angles.push(Math.atan2(point.y, point.x));
      expect(rigidKineticEnergy(s)).toBe(rigidKineticEnergy(initial));
      expect(v3Norm(point)).toBeCloseTo(1, 12);
      expect(rigidBasisError(s.basis)).toBeLessThan(1e-13);
    }
    const ratio = (2 - angles[0]) / (2 - angles[1]);
    expect(ratio).toBeGreaterThan(3.9); expect(ratio).toBeLessThan(4.1);
    const step = advanceMaterialRigid(initial, .3);
    expect(step.report.rotationAngle).toBeCloseTo(2 * Math.atan(.3), 12);
  });

  it('external point loading is covariant under field translation and reflection', () => {
    const before = body(), local = vec(.2, -.3, -.4), impulse = vec(8, -5, 3), shift = vec(9, 4, -2);
    const input = { pointImpulses: [{ id: 'hip', local, impulse }] };
    const base = advanceMaterialRigid(before, .05, input);
    const shifted = advanceMaterialRigid(body({ ...before, position: v3Add(before.position, shift) }), .05, input);
    const mirror = advanceMaterialRigid(reflected(before), .05,
      { pointImpulses: [{ id: 'hip', local: reflect(local), impulse: reflect(impulse) }] });
    for (const r of [base, shifted, mirror]) expect(r.report.accepted, r.report.reason ?? '').toBe(true);
    closeVec(shifted.state.position, v3Add(base.state.position, shift));
    closeVec(shifted.state.velocity, base.state.velocity);
    closeVec(shifted.state.angularMomentum, base.state.angularMomentum);
    closeVec(mirror.state.position, reflect(base.state.position));
    closeVec(mirror.state.velocity, reflect(base.state.velocity));
    closeVec(mirror.state.angularMomentum, reflectAxial(base.state.angularMomentum));
    const expectedBasis = reflected(base.state).basis;
    for (let i = 0; i < 3; i++) closeVec(mirror.state.basis[i], expectedBasis[i]);
    expect(mirror.report.impulseWork).toBeCloseTo(base.report.impulseWork, 10);
  });

  it('rejects an uncertified coarse angular branch atomically, and accepts a smaller interval', () => {
    const before = body({ mass: 2, inertia: .001 }), saved = structuredClone(before);
    const point = { id: 'toe', local: vec(.2, 0, 0), impulse: vec(0, 5, 0) };
    const coarse = advanceMaterialRigid(before, .1, { pointImpulses: [point] });
    expect(coarse.report.accepted).toBe(false);
    expect(coarse.report.reason).toContain('not certified');
    expect(coarse.report.angularContractionBound).toBeGreaterThan(1);
    expect(before).toEqual(saved); expect(coarse.state).toEqual(saved);
    // The bound is numerical certification; no smaller force is manufactured.
    const fine = advanceMaterialRigid(before, .001, { pointImpulses: [point] });
    expect(fine.report.accepted, fine.report.reason ?? '').toBe(true);
    closeVec(v3Scale(v3Sub(fine.state.velocity, before.velocity), before.mass), point.impulse);
  });

  it('returns unchanged state after an incomplete nonlinear solve', () => {
    const before = body({ inertia: 1 }), saved = structuredClone(before);
    const result = advanceMaterialRigid(before, .2, { maxIterations: 1, tolerance: 1e-13,
      pointImpulses: [{ id: 'hip', local: vec(1, 1, 0), impulse: vec(1, 2, 3) }] });
    expect(result.report.angularContractionBound).toBeLessThan(1);
    expect(result.report.accepted).toBe(false); expect(result.report.reason).toContain('iteration limit');
    expect(result.state).toEqual(saved); expect(before).toEqual(saved);
  });

  it('rejects nonphysical inertia, left-handed pose and ambiguous point identities', () => {
    expect(() => body({ inertia: 0 })).toThrow(RangeError);
    const left = identityRigidBasis(); left[0].x = -1;
    expect(() => body({ basis: left })).toThrow(RangeError);
    expect(() => advanceMaterialRigid(body(), 0)).toThrow(RangeError);
    const point = { id: 'toe', local: vec(), impulse: vec() };
    expect(() => advanceMaterialRigid(body(), .01, { pointImpulses: [point, point] })).toThrow(RangeError);
  });
});

describe('instantaneous rigid contact substrate', () => {
  it('holds pose while actual point impulse changes translation and spin with matching work', () => {
    const before = body(), local = vec(.2, -.15, -.1), impulse = vec(3, -2, 5);
    const offset = rigidWorldOffset(before, local);
    const after = rigidImpactState(before, v3Add(before.velocity, v3Scale(impulse, 1 / before.mass)),
      v3Add(before.angularMomentum, v3Cross(offset, impulse)));
    expect(after.position).toEqual(before.position); expect(after.basis).toEqual(before.basis);
    const attachment = rigidImpactAttachment(before, after, local);
    expect(rigidKineticEnergy(after) - rigidKineticEnergy(before)).toBeCloseTo(v3Dot(impulse, attachment.meanVelocity), 11);
    closeVec(v3Sub(rigidAngularMomentum(after), rigidAngularMomentum(before)), v3Cross(attachment.point, impulse));
    const observed = vec(-.1, .2, -.2);
    closeVec(v3Sub(rigidPointVelocity(after, observed), rigidPointVelocity(before, observed)),
      rigidPointImpulseResponse(before, local, observed, impulse));
  });

  it('a plastic normal impact loses the kinetic energy implied by finite point mobility', () => {
    const before = body({ mass: 2, inertia: .02, position: vec(0, 0, .1), velocity: vec(0, 0, -2), angularMomentum: vec() });
    const local = vec(.15, 0, -.1), normal = vec(0, 0, 1);
    const velocity = rigidPointVelocity(before, local), mobility = v3Dot(normal, rigidPointImpulseResponse(before, local, local, normal));
    const impulse = v3Scale(normal, -v3Dot(velocity, normal) / mobility);
    const after = rigidImpactState(before, v3Add(before.velocity, v3Scale(impulse, 1 / before.mass)),
      v3Add(before.angularMomentum, v3Cross(rigidWorldOffset(before, local), impulse)));
    expect(v3Dot(rigidPointVelocity(after, local), normal)).toBeCloseTo(0, 12);
    expect(rigidKineticEnergy(after)).toBeLessThan(rigidKineticEnergy(before));
    expect(rigidKineticEnergy(after) - rigidKineticEnergy(before))
      .toBeCloseTo(-.5 * v3Dot(velocity, normal) ** 2 / mobility, 12);
  });

  it('does not label a moving pose as a zero-time impact attachment', () => {
    const before = body(), moved = rigidMidpointState(before, .01, before.velocity, before.angularMomentum);
    expect(() => rigidImpactAttachment(before, moved, vec())).toThrow(RangeError);
  });
});
