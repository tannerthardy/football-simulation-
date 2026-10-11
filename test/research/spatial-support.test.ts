import { describe, expect, it } from 'vitest';
import { advanceSpatialSupport, newSpatialSupport, type SpatialSupportState, type SpatialImpulseSet } from '../../src/physics/spatial-support.js';
import { identityRigidBasis, newMaterialRigid, v3Add, v3Scale, v3Sub, v3Cross, v3Norm, rigidPointPosition,
  type Vec3, type MaterialRigidState, type RigidBasis } from '../../src/physics/material-rigid.js';
import { advanceVerticalSupport, newVerticalSupport } from '../../src/physics/vertical-support.js';

const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const body = (mass: number, inertia: number, position: Vec3): MaterialRigidState => newMaterialRigid({ mass, inertia, position,
  velocity: zero(), angularMomentum: zero(), basis: identityRigidBasis() });
function fixture(offset = true): SpatialSupportState {
  return newSpatialSupport({ torso: body(96, 8, { x: 0, y: 0, z: 11 }),
    feet: [body(2, .008, { x: .03, y: -.16, z: 10 }), body(2, .008, { x: -.03, y: .16, z: 10 })], gravity: { x: 0, y: 0, z: -10 },
    legs: [0, 1].map(i => ({ hip: offset ? { x: 0, y: i === 0 ? -.08 : .08, z: -.15 } : zero(),
      ankle: offset ? { x: -.025, y: 0, z: .03 } : zero(),
      compliance: { restLength: offset ? .96 : 1.1, stiffness: 4800, forceCap: 1600, damping: 30, dampingCap: 300 } })) as SpatialSupportState['legs'] });
}
const bodies = (s: SpatialSupportState) => [s.torso, ...s.feet];
// Independent material accounting from state and the declared constitutive law.
function energy(s: SpatialSupportState): number {
  let result = bodies(s).reduce((sum, b) => sum + .5 * b.mass * v3Norm(b.velocity) ** 2 + .5 * v3Norm(b.angularMomentum) ** 2 / b.inertia
    - b.mass * (s.gravity.x * b.position.x + s.gravity.y * b.position.y + s.gravity.z * b.position.z), 0);
  s.legs.forEach((l, i) => {
    const length = v3Norm(v3Sub(rigidPointPosition(s.feet[i], l.ankle), rigidPointPosition(s.torso, l.hip)));
    const q = Math.max(0, l.compliance.restLength - length), capped = Math.min(q, l.compliance.forceCap / l.compliance.stiffness);
    result += .5 * l.compliance.stiffness * capped ** 2 + l.compliance.forceCap * (q - capped);
  });
  return result;
}
const momentum = (s: SpatialSupportState) => bodies(s).reduce((a, b) => v3Add(a, v3Scale(b.velocity, b.mass)), zero());
const angular = (s: SpatialSupportState) => bodies(s).reduce((a, b) => v3Add(a, v3Add(v3Cross(b.position, v3Scale(b.velocity, b.mass)), b.angularMomentum)), zero());
const com = (s: SpatialSupportState) => v3Scale(bodies(s).reduce((a, b) => v3Add(a, v3Scale(b.position, b.mass)), zero()),
  1 / bodies(s).reduce((a, b) => a + b.mass, 0));
function verify(before: SpatialSupportState, result: ReturnType<typeof advanceSpatialSupport>, h: number, loads: SpatialImpulseSet = [{}, {}, {}]): void {
  const { state, report } = result; expect(report.accepted, report.reason ?? '').toBe(true);
  let impulse = v3Scale(before.gravity, bodies(before).reduce((m, b) => m + b.mass, 0) * h), externalAngular = zero(), work = 0;
  bodies(before).forEach((b, i) => {
    const after = bodies(state)[i], center = loads[i].center ?? zero(), couple = loads[i].couple ?? zero();
    const averagePosition = v3Scale(v3Add(b.position, after.position), .5);
    externalAngular = v3Add(externalAngular, v3Cross(averagePosition, v3Scale(before.gravity, h * b.mass)));
    externalAngular = v3Add(externalAngular, v3Add(v3Cross(averagePosition, center), couple));
    impulse = v3Add(impulse, center);
    work += (center.x * (after.position.x - b.position.x) + center.y * (after.position.y - b.position.y) + center.z * (after.position.z - b.position.z)) / h;
    const omega = v3Scale(v3Add(b.angularMomentum, after.angularMomentum), .5 / b.inertia);
    work += couple.x * omega.x + couple.y * omega.y + couple.z * omega.z;
    for (const p of loads[i].points ?? []) {
      const p0 = rigidPointPosition(b, p.local), p1 = rigidPointPosition(after, p.local), dp = v3Scale(v3Sub(p1, p0), 1 / h);
      impulse = v3Add(impulse, p.impulse); externalAngular = v3Add(externalAngular, v3Cross(v3Scale(v3Add(p0, p1), .5), p.impulse));
      work += p.impulse.x * dp.x + p.impulse.y * dp.y + p.impulse.z * dp.z;
    }
  });
  let dampingWork = 0;
  before.legs.forEach((l, i) => {
    const a = v3Norm(v3Sub(rigidPointPosition(before.feet[i], l.ankle), rigidPointPosition(before.torso, l.hip)));
    const b = v3Norm(v3Sub(rigidPointPosition(state.feet[i], l.ankle), rigidPointPosition(state.torso, l.hip)));
    const rate = (b - a) / h, f = -Math.max(-l.compliance.dampingCap, Math.min(l.compliance.dampingCap, l.compliance.damping * rate));
    dampingWork += f * (b - a);
  });
  expect(Math.abs(energy(state) - energy(before) - work - dampingWork)).toBeLessThan(1e-7);
  expect(dampingWork).toBeLessThanOrEqual(1e-12);
  expect(v3Norm(v3Sub(v3Sub(momentum(state), momentum(before)), impulse))).toBeLessThan(1e-7);
  expect(v3Norm(v3Sub(v3Sub(angular(state), angular(before)), externalAngular))).toBeLessThan(1e-7);
  expect(report.maxAttachmentResidual).toBeLessThan(1e-8);
}
const mirror = (v: Vec3): Vec3 => ({ x: -v.x, y: v.y, z: v.z });
const axialMirror = (v: Vec3): Vec3 => ({ x: v.x, y: -v.y, z: -v.z });
function reflected(s: SpatialSupportState): SpatialSupportState {
  const r = structuredClone(s);
  bodies(r).forEach(b => { b.position = mirror(b.position); b.velocity = mirror(b.velocity); b.angularMomentum = axialMirror(b.angularMomentum);
    b.basis = [v3Scale(mirror(b.basis[0]), -1), mirror(b.basis[1]), mirror(b.basis[2])] as RigidBasis; });
  r.legs.forEach(l => { l.hip = mirror(l.hip); l.ankle = mirror(l.ankle); }); r.gravity = mirror(r.gravity); return newSpatialSupport(r);
}
describe('coupled spatial support research', () => {
  it('moves total COM under gravity only while offset leg loads rotate real material bodies', () => {
    const s = fixture(), original = structuredClone(s), h = .003, result = advanceSpatialSupport(s, h); verify(s, result, h);
    expect(s).toEqual(original); expect(v3Norm(result.state.feet[0].angularMomentum)).toBeGreaterThan(.001);
    expect(v3Norm(result.state.torso.angularMomentum)).toBeGreaterThan(.001);
    expect(v3Norm(v3Sub(com(result.state), v3Add(com(s), v3Scale(s.gravity, .5 * h * h))))).toBeLessThan(1e-10);
  });
  it('reproduces the same centered free-flight restriction as the solved vertical model', () => {
    const s = fixture(false); s.feet.forEach(f => { f.position.x = 0; f.position.y = 0; });
    const v = newVerticalSupport({ torsoMass: 96, footMass: [2, 2], torso: { position: 11, velocity: 0 }, feet: [{ id: 0, position: 10, velocity: 0 }, { id: 1, position: 10, velocity: 0 }],
      legs: [{ ...s.legs[0].compliance }, { ...s.legs[1].compliance }], gravity: 10, actuator: { forceCap: 0, powerCap: 0 } });
    const a = advanceSpatialSupport(s, .002), b = advanceVerticalSupport(v, .002); verify(s, a, .002); expect(b.report.accepted).toBe(true);
    expect(a.state.torso.position.z).toBeCloseTo(b.state.torso.position, 9); expect(a.state.torso.velocity.z).toBeCloseTo(b.state.torso.velocity, 9);
    a.state.feet.forEach((f, i) => { expect(f.position.z).toBeCloseTo(b.state.feet[i].position, 9); expect(f.velocity.z).toBeCloseTo(b.state.feet[i].velocity, 9); });
  });
  it('accounts known finite-offset loads, COM impulses and couples through the same work and angular ledger', () => {
    const s = fixture(), loads: SpatialImpulseSet = [{ points: [{ id: 'shoulder', local: { x: .1, y: .2, z: .3 }, impulse: { x: 3, y: -2, z: 1 } }], couple: { x: .05, y: 0, z: .1 } },
      { center: { x: 0, y: .1, z: .02 } }, {}];
    verify(s, advanceSpatialSupport(s, .003, { externalImpulses: loads }), .003, loads);
  });
  it('handles slack and elastic saturation with bounded forces and retained material energy', () => {
    for (const length of [.5, 1.5]) {
      const s = fixture(); s.legs.forEach(l => { l.compliance.restLength = length; l.compliance.forceCap = 100; });
      const a = advanceSpatialSupport(s, .002); verify(s, a, .002); a.report.legs.forEach(l => { expect(l.springForce).toBeLessThanOrEqual(100); expect(l.springForce).toBeGreaterThanOrEqual(0); });
    }
  });
  it('preserves mirrored and translated motion including axial angular momentum', () => {
    const s = fixture(), m = reflected(s), t = structuredClone(s), shift = { x: 23, y: -11, z: 3 };
    bodies(t).forEach(b => { b.position = v3Add(b.position, shift); });
    const a = advanceSpatialSupport(s, .003), b = advanceSpatialSupport(m, .003), c = advanceSpatialSupport(t, .003);
    verify(s, a, .003); verify(m, b, .003); verify(t, c, .003);
    bodies(a.state).forEach((body, i) => {
      expect(v3Norm(v3Sub(mirror(body.position), bodies(b.state)[i].position))).toBeLessThan(1e-9);
      expect(v3Norm(v3Sub(axialMirror(body.angularMomentum), bodies(b.state)[i].angularMomentum))).toBeLessThan(1e-9);
      expect(v3Norm(v3Sub(v3Add(body.position, shift), bodies(c.state)[i].position))).toBeLessThan(1e-9);
    });
  });
  it('improves an offset spring trajectory by local subdivision without changing capabilities', () => {
    const s = fixture();
    const run = (h: number) => { let state = s; for (let i = 0; i < Math.round(.012 / h); i++) { const next = advanceSpatialSupport(state, h); verify(state, next, h); state = next.state; } return state; };
    const coarse = run(.003), fine = run(.0015), reference = run(.000375);
    const error = (a: SpatialSupportState) => bodies(a).reduce((sum, b, i) => sum + v3Norm(v3Sub(b.velocity, bodies(reference)[i].velocity)), 0);
    expect(error(fine)).toBeLessThan(error(coarse) * .5); expect(coarse.legs).toEqual(s.legs);
  });
  it('rejects high angular phase or an insufficient iteration budget atomically', () => {
    const s = fixture(); s.feet[0].angularMomentum.z = s.feet[0].inertia * 200;
    const a = advanceSpatialSupport(s, .005); expect(a.report.accepted).toBe(false); expect(a.report.reason).toContain('Angular trajectory'); expect(a.state).toEqual(s);
    const normal = fixture(), b = advanceSpatialSupport(normal, .01, { maxIterations: 1 });
    expect(b.report.accepted).toBe(false); expect(b.state).toEqual(normal);
  });
  it('requires a local shorter interval for a fast axial mode even without body rotation', () => {
    const s = fixture(false); s.feet.forEach(f => { f.position.x = 0; f.position.y = 0; });
    const result = advanceSpatialSupport(s, .02);
    expect(result.report.accepted).toBe(false); expect(result.report.reason).toContain('Elastic response'); expect(result.state).toEqual(s);
    const fine = advanceSpatialSupport(s, .002); verify(s, fine, .002);
  });
});
