/** Independent state/impulse audit of established finite sole contact.
 * Node 22: node --import tsx scripts/diag/spatial-ground-stress.ts [output.json]
 * Toy mechanical priors only; no gait, NFL calibration or readiness claim.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { advanceSpatialGroundContact, type SpatialGroundPoint, type SpatialGroundContactReport } from '../../src/physics/spatial-ground.js';
import { newSpatialSupport, type SpatialSupportState, type SpatialImpulseSet } from '../../src/physics/spatial-support.js';
import type { MaterialRigidState, Vec3, RigidBasis } from '../../src/physics/material-rigid.js';
import { sourceVersion } from '../source-version.js';

if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run this panel with Node 22');
if (process.argv.length > 3 || process.argv[2]?.startsWith('--')) throw new Error('Specify at most one output path');
const output = process.argv[2] ?? 'out/spatial-ground-stress.json';
const selfPath = fileURLToPath(import.meta.url);
const selfHash = () => createHash('sha256').update(readFileSync(selfPath)).digest('hex');
const sourceSha256Start = sourceVersion(), scriptSha256Start = selfHash();
const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a: Vec3) => Math.hypot(a.x, a.y, a.z);
const mean = (a: Vec3, b: Vec3) => scale(add(a, b), .5);
const offset = (b: MaterialRigidState, local: Vec3) => add(add(scale(b.basis[0], local.x), scale(b.basis[1], local.y)), scale(b.basis[2], local.z));
const point = (b: MaterialRigidState, local: Vec3) => add(b.position, offset(b, local));
const pointVelocity = (b: MaterialRigidState, local: Vec3) => add(b.velocity, cross(scale(b.angularMomentum, 1 / b.inertia), offset(b, local)));
const bodies = (s: SpatialSupportState) => [s.torso, ...s.feet];
const totalMass = (s: SpatialSupportState) => bodies(s).reduce((sum, b) => sum + b.mass, 0);
const kinetic = (b: MaterialRigidState) => .5 * b.mass * dot(b.velocity, b.velocity) + .5 * dot(b.angularMomentum, b.angularMomentum) / b.inertia;
const linear = (s: SpatialSupportState) => bodies(s).reduce((sum, b) => add(sum, scale(b.velocity, b.mass)), zero());
const bodyAngular = (b: MaterialRigidState) => add(cross(b.position, scale(b.velocity, b.mass)), b.angularMomentum);
const angular = (s: SpatialSupportState) => bodies(s).reduce((sum, b) => add(sum, bodyAngular(b)), zero());
const com = (s: SpatialSupportState) => scale(bodies(s).reduce((sum, b) => add(sum, scale(b.position, b.mass)), zero()), 1 / totalMass(s));
const identity = (): RigidBasis => [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }];
function springPotential(length: number, c: SpatialSupportState['legs'][0]['compliance']): number {
  const q = Math.max(0, c.restLength - length), elastic = Math.min(q, c.forceCap / c.stiffness);
  return .5 * c.stiffness * elastic ** 2 + c.forceCap * (q - elastic);
}
/** Independently integrate the piecewise capped spring over its length stroke.
 * Energy subtraction loses force accuracy in an almost stationary plant. */
function springDiscreteForce(l0: number, l1: number, c: SpatialSupportState['legs'][0]['compliance']): number {
  const q0 = c.restLength - l0, q1 = c.restLength - l1, lo = Math.min(q0, q1), hi = Math.max(q0, q1), saturation = c.forceCap / c.stiffness;
  if (hi <= 0 || c.forceCap === 0) return 0;
  if (lo >= saturation) return c.forceCap;
  if (lo >= 0 && hi <= saturation) return .5 * c.stiffness * (lo + hi);
  if (lo === hi) return Math.min(c.forceCap, c.stiffness * Math.max(0, lo));
  const elasticLow = Math.max(0, lo), elasticHigh = Math.min(saturation, hi);
  const elasticSpan = Math.max(0, elasticHigh - elasticLow), saturatedSpan = Math.max(0, hi - Math.max(lo, saturation));
  return (elasticSpan * .5 * c.stiffness * (elasticLow + elasticHigh) + saturatedSpan * c.forceCap) / (hi - lo);
}
function energy(s: SpatialSupportState): number {
  let value = bodies(s).reduce((sum, b) => sum + kinetic(b) - b.mass * dot(s.gravity, b.position), 0);
  s.legs.forEach((l, i) => { value += springPotential(norm(sub(point(s.feet[i], l.ankle), point(s.torso, l.hip))), l.compliance); });
  return value;
}
function basisError(b: MaterialRigidState): number {
  let value = Math.abs(dot(cross(b.basis[0], b.basis[1]), b.basis[2]) - 1);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) value = Math.max(value, Math.abs(dot(b.basis[i], b.basis[j]) - Number(i === j)));
  return value;
}
function chordMinimum(a: Vec3, b: Vec3): number {
  const d = sub(b, a), squared = dot(d, d), t = squared === 0 ? 0 : Math.max(0, Math.min(1, -dot(a, d) / squared));
  return norm(add(a, scale(d, t)));
}
interface Audit {
  workResidual: number; linearResidual: number; angularResidual: number; comResidual: number;
  bodyLinearResidual: number; bodyAngularResidual: number; attachmentResidual: number;
  dampingWork: number; basisError: number; maxAngularPhase: number; minimumLegChord: number;
}
/** Reconstruct physical impulses, point work and constitutive forces from states
 * and known input loads. No engine-reported force, work or residual is used. */
function audit(before: SpatialSupportState, after: SpatialSupportState, h: number, loads: SpatialImpulseSet): Audit {
  const old = bodies(before), next = bodies(after);
  const bodyImpulse = old.map(b => scale(before.gravity, h * b.mass)), bodyTorque = old.map(() => zero());
  let knownLinear = scale(before.gravity, h * totalMass(before)), knownAngular = zero(), externalWork = 0, dampingWork = 0;
  let attachmentResidual = 0, minimumLegChord = Infinity;
  old.forEach((b, i) => {
    const n = next[i], middle = mean(b.position, n.position), center = loads[i].center ?? zero(), couple = loads[i].couple ?? zero();
    knownAngular = add(knownAngular, cross(middle, scale(before.gravity, h * b.mass)));
    knownLinear = add(knownLinear, center); knownAngular = add(knownAngular, add(cross(middle, center), couple));
    bodyImpulse[i] = add(bodyImpulse[i], center); bodyTorque[i] = add(bodyTorque[i], couple);
    externalWork += dot(center, scale(sub(n.position, b.position), 1 / h)) + dot(couple, scale(add(b.angularMomentum, n.angularMomentum), .5 / b.inertia));
    for (const p of loads[i].points ?? []) {
      const p0 = point(b, p.local), p1 = point(n, p.local), midOffset = mean(offset(b, p.local), offset(n, p.local));
      knownLinear = add(knownLinear, p.impulse); knownAngular = add(knownAngular, cross(mean(p0, p1), p.impulse));
      bodyImpulse[i] = add(bodyImpulse[i], p.impulse); bodyTorque[i] = add(bodyTorque[i], cross(midOffset, p.impulse));
      externalWork += dot(p.impulse, scale(sub(p1, p0), 1 / h));
    }
  });
  before.legs.forEach((l, i) => {
    const hip0 = point(before.torso, l.hip), hip1 = point(after.torso, l.hip), ankle0 = point(before.feet[i], l.ankle), ankle1 = point(after.feet[i], l.ankle);
    const d0 = sub(ankle0, hip0), d1 = sub(ankle1, hip1), l0 = norm(d0), l1 = norm(d1), c = l.compliance;
    const f = springDiscreteForce(l0, l1, c);
    const rate = (l1 - l0) / h, damp = -Math.max(-c.dampingCap, Math.min(c.dampingCap, c.damping * rate));
    const j = scale(add(d0, d1), h * (f + damp) / (l0 + l1));
    bodyImpulse[0] = sub(bodyImpulse[0], j); bodyImpulse[i + 1] = add(bodyImpulse[i + 1], j);
    bodyTorque[0] = sub(bodyTorque[0], cross(mean(offset(before.torso, l.hip), offset(after.torso, l.hip)), j));
    bodyTorque[i + 1] = add(bodyTorque[i + 1], cross(mean(offset(before.feet[i], l.ankle), offset(after.feet[i], l.ankle)), j));
    dampingWork += damp * (l1 - l0); minimumLegChord = Math.min(minimumLegChord, chordMinimum(d0, d1));
    for (const [b, n, local] of [[before.torso, after.torso, l.hip], [before.feet[i], after.feet[i], l.ankle]] as const) {
      const chord = scale(sub(point(n, local), point(b, local)), 1 / h);
      const actual = add(mean(b.velocity, n.velocity), cross(scale(add(b.angularMomentum, n.angularMomentum), .5 / b.inertia), mean(offset(b, local), offset(n, local))));
      attachmentResidual = Math.max(attachmentResidual, norm(sub(chord, actual)));
    }
  });
  const predictedCom = add(add(com(before), scale(linear(before), h / totalMass(before))), scale(knownLinear, .5 * h / totalMass(before)));
  return { workResidual: energy(after) - energy(before) - externalWork - dampingWork,
    linearResidual: norm(sub(sub(linear(after), linear(before)), knownLinear)), angularResidual: norm(sub(sub(angular(after), angular(before)), knownAngular)),
    comResidual: norm(sub(com(after), predictedCom)),
    bodyLinearResidual: Math.max(...old.map((b, i) => norm(sub(scale(sub(next[i].velocity, b.velocity), b.mass), bodyImpulse[i])))),
    bodyAngularResidual: Math.max(...old.map((b, i) => norm(sub(sub(next[i].angularMomentum, b.angularMomentum), bodyTorque[i])))),
    attachmentResidual, dampingWork, basisError: Math.max(...next.map(basisError)), minimumLegChord,
    maxAngularPhase: Math.max(...old.map((b, i) => h * norm(scale(add(b.angularMomentum, next[i].angularMomentum), .5 / b.inertia)))) };
}
const reflect = (v: Vec3): Vec3 => ({ x: -v.x, y: v.y, z: v.z });
const axialReflect = (v: Vec3): Vec3 => ({ x: v.x, y: -v.y, z: -v.z });
const translation = { x: 13, y: -7, z: 3 };
type Variant = 'base' | 'mirror' | 'translated';
type Patches = [SpatialGroundPoint[], SpatialGroundPoint[]];
function transformState(s: SpatialSupportState, variant: Variant): SpatialSupportState {
  const result = structuredClone(s);
  for (const b of bodies(result)) {
    if (variant === 'translated') b.position = add(b.position, translation);
    if (variant === 'mirror') {
      b.position = reflect(b.position); b.velocity = reflect(b.velocity); b.angularMomentum = axialReflect(b.angularMomentum);
      b.basis = [scale(reflect(b.basis[0]), -1), reflect(b.basis[1]), reflect(b.basis[2])];
    }
  }
  if (variant === 'mirror') { result.gravity = reflect(result.gravity); result.legs.forEach(l => { l.hip = reflect(l.hip); l.ankle = reflect(l.ankle); }); }
  return newSpatialSupport(result);
}
function transformPatches(patches: Patches, variant: Variant): Patches {
  return patches.map(p => p.map(c => ({ ...c, local: variant === 'mirror' ? reflect(c.local) : { ...c.local } }))) as Patches;
}
function transformLoads(loads: SpatialImpulseSet, variant: Variant): SpatialImpulseSet {
  const result = structuredClone(loads);
  if (variant === 'mirror') result.forEach(l => {
    if (l.center) l.center = reflect(l.center); if (l.couple) l.couple = axialReflect(l.couple);
    l.points?.forEach(p => { p.local = reflect(p.local); p.impulse = reflect(p.impulse); });
  });
  return result;
}
function fixture(plant: 'two' | 'single', friction: number): { initial: SpatialSupportState; patches: Patches } {
  const material = (mass: number, inertia: number, position: Vec3): MaterialRigidState => ({ mass, inertia, position, velocity: zero(), angularMomentum: zero(), basis: identity() });
  const initial = newSpatialSupport({ torso: material(96, 8, { x: 0, y: 0, z: 1.1 }),
    feet: [-1, 1].map(side => material(2, .008, { x: 0, y: side * .16, z: .04 })) as SpatialSupportState['feet'],
    legs: [-1, 1].map(side => {
      const length = Math.hypot(.08, .88), force = 480 * length / .88;
      return { hip: { x: 0, y: side * .08, z: -.15 }, ankle: { x: 0, y: 0, z: .03 },
        compliance: { restLength: length + force / 4800, stiffness: 4800, forceCap: 1600, damping: 30, dampingCap: 300 } };
    }) as SpatialSupportState['legs'], gravity: { x: 0, y: 0, z: -10 } });
  const sole: SpatialGroundPoint[] = [{ id: 'heel-left', local: { x: -.12, y: -.05, z: -.04 }, friction },
    { id: 'heel-right', local: { x: -.12, y: .05, z: -.04 }, friction }, { id: 'toe', local: { x: .13, y: 0, z: -.04 }, friction }];
  const patches: Patches = [sole, sole.map(p => ({ ...p, id: `right-${p.id}`, local: { ...p.local } }))];
  if (plant === 'single') {
    initial.torso.position.y = -.16; initial.legs[0].hip.y = 0;
    initial.legs[0].compliance.restLength = .88 + 960 / 4800;
    initial.feet[1].position.z = .2;
    initial.legs[1].compliance = { restLength: .7, stiffness: 4800, forceCap: 0, damping: 0, dampingCap: 0 };
    patches[1] = [];
  }
  return { initial: newSpatialSupport(initial), patches };
}
/** Known solve impulses are reconstructed at the intended material sole points.
 * Reported points, velocities, force residuals and ledgers are not used. */
function completeLoads(known: SpatialImpulseSet, patches: Patches, report: SpatialGroundContactReport): SpatialImpulseSet {
  const result = structuredClone(known);
  const expected = patches.reduce((n, p) => n + p.length, 0);
  if (report.contacts.length !== expected) throw new Error('Contact count differs from input material patches');
  patches.forEach((p, foot) => p.forEach(c => {
    const rows = report.contacts.filter(r => r.foot === foot && r.id === c.id);
    if (rows.length !== 1) throw new Error('Contact identity omitted or duplicated');
    const points = result[foot + 1].points ?? [];
    points.push({ id: `sole:${c.id}`, local: { ...c.local }, impulse: { ...rows[0].impulse } }); result[foot + 1].points = points;
  }));
  return result;
}
interface ContactAudit {
  groundWork: number; normalViolation: number; tangentViolation: number; frictionCapViolation: number;
  normalSpeed: number; slipReversal: number; minimumGap: number;
  reactionNormalViolation: number; reactionTangentViolation: number; reactionFrictionCapViolation: number;
  reactionPower: number; reactionAccelerationMismatch: number;
}
function contactAudit(before: SpatialSupportState, after: SpatialSupportState, h: number, patches: Patches,
  known: SpatialImpulseSet, report: SpatialGroundContactReport, plane: number): ContactAudit {
  let groundWork = 0, normalViolation = 0, tangentViolation = 0, frictionCapViolation = 0, normalSpeed = 0, slipReversal = 0, minimumGap = Infinity;
  let reactionNormalViolation = 0, reactionTangentViolation = 0, reactionFrictionCapViolation = 0, reactionPower = 0, reactionAccelerationMismatch = 0;
  patches.forEach((p, foot) => {
    if (!p.length) return;
    const b0 = before.feet[foot], b1 = after.feet[foot], leg = after.legs[foot];
    const d = sub(point(b1, leg.ankle), point(after.torso, leg.hip)), length = norm(d), direction = scale(d, 1 / length), c = leg.compliance;
    const relative = sub(pointVelocity(b1, leg.ankle), pointVelocity(after.torso, leg.hip)), rate = dot(relative, direction);
    const legForce = scale(direction, Math.min(c.forceCap, c.stiffness * Math.max(0, c.restLength - length))
      - Math.max(-c.dampingCap, Math.min(c.dampingCap, c.damping * rate)));
    const load = known[foot + 1];
    let force = add(scale(after.gravity, b1.mass), add(legForce, scale(load.center ?? zero(), 1 / h)));
    let torque = add(cross(offset(b1, leg.ankle), legForce), scale(load.couple ?? zero(), 1 / h));
    for (const row of load.points ?? []) { const f = scale(row.impulse, 1 / h); force = add(force, f); torque = add(torque, cross(offset(b1, row.local), f)); }
    for (const contact of p) {
      const row = report.contacts.find(r => r.foot === foot && r.id === contact.id)!;
      force = add(force, row.instantaneousForce); torque = add(torque, cross(offset(b1, contact.local), row.instantaneousForce));
    }
    const acceleration = scale(force, 1 / b1.mass), alpha = scale(torque, 1 / b1.inertia), omega = scale(b1.angularMomentum, 1 / b1.inertia);
    for (const contact of p) {
      const row = report.contacts.find(r => r.foot === foot && r.id === contact.id)!, j = row.impulse, cap = contact.friction * j.z;
      const v0 = pointVelocity(b0, contact.local), v1 = pointVelocity(b1, contact.local), p0 = point(b0, contact.local), p1 = point(b1, contact.local);
      const average = scale(sub(p1, p0), 1 / h), gap = p1.z - plane, gapRate = gap / h, jSize = Math.hypot(j.x, j.y), speed = Math.hypot(average.x, average.y);
      groundWork += dot(j, average); minimumGap = Math.min(minimumGap, gap); normalSpeed = Math.max(normalSpeed, Math.abs(v1.z));
      normalViolation = Math.max(normalViolation, -j.z, -gapRate, j.z > 1e-8 ? Math.abs(gapRate) : 0);
      frictionCapViolation = Math.max(frictionCapViolation, jSize - cap);
      if (cap > 1e-8) {
        if (jSize < cap - 1e-8) tangentViolation = Math.max(tangentViolation, speed);
        else if (speed > 1e-8) tangentViolation = Math.max(tangentViolation, Math.hypot(j.x + cap * average.x / speed, j.y + cap * average.y / speed));
      } else tangentViolation = Math.max(tangentViolation, jSize);
      const initialSpeed = Math.hypot(v0.x, v0.y), finalSpeed = Math.hypot(v1.x, v1.y);
      if (initialSpeed > 1e-8 && v0.x * v1.x + v0.y * v1.y < -1e-8 * initialSpeed) slipReversal = Math.max(slipReversal, finalSpeed);
      // Additional endpoint force audit, never a substitute for interval work.
      const f = row.instantaneousForce, fCap = contact.friction * f.z, fSize = Math.hypot(f.x, f.y), endSpeed = Math.hypot(v1.x, v1.y);
      const r = offset(b1, contact.local), a = add(acceleration, add(cross(alpha, r), cross(omega, cross(omega, r))));
      reactionAccelerationMismatch = Math.max(reactionAccelerationMismatch, Math.abs(a.z - row.instantaneousNormalAcceleration));
      reactionNormalViolation = Math.max(reactionNormalViolation, -f.z, -a.z, f.z > 1e-7 ? Math.abs(a.z) : 0);
      reactionFrictionCapViolation = Math.max(reactionFrictionCapViolation, fSize - fCap);
      reactionPower += dot(f, v1);
      if (endSpeed > 1e-7) reactionTangentViolation = Math.max(reactionTangentViolation, Math.hypot(f.x + fCap * v1.x / endSpeed, f.y + fCap * v1.y / endSpeed));
      else if (fCap > 1e-7) {
        const aSpeed = Math.hypot(a.x, a.y);
        if (fSize < fCap - 1e-7) reactionTangentViolation = Math.max(reactionTangentViolation, aSpeed);
        else if (aSpeed > 1e-7) reactionTangentViolation = Math.max(reactionTangentViolation, Math.hypot(f.x + fCap * a.x / aSpeed, f.y + fCap * a.y / aSpeed));
      } else reactionTangentViolation = Math.max(reactionTangentViolation, fSize);
    }
  });
  return { groundWork, normalViolation, tangentViolation, frictionCapViolation, normalSpeed, slipReversal, minimumGap,
    reactionNormalViolation, reactionTangentViolation, reactionFrictionCapViolation, reactionPower, reactionAccelerationMismatch };
}
const variants: Variant[] = ['base', 'mirror', 'translated'], steps = [.004, .002, .001], horizons = [.012, .04], frictions = [.05, .2, .8], forces = [0, 10, 50, 100];
const plants = ['two', 'single'] as const;
const violations: unknown[] = [], rejections: unknown[] = [];
function trajectory(plant: 'two' | 'single', friction: number, force: number, h: number, horizon: number, variant: Variant) {
  const f = fixture(plant, friction), patches = transformPatches(f.patches, variant), plane = variant === 'translated' ? translation.z : 0;
  let state = transformState(f.initial, variant), acceptedIntervals = 0, firstReject: unknown = null, minimumLegChord = Infinity, minimumGap = Infinity, dampingWork = 0, groundWork = 0;
  const maxima: Record<string, number> = { workResidual: 0, linearResidual: 0, angularResidual: 0, comResidual: 0, bodyLinearResidual: 0, bodyAngularResidual: 0,
    attachmentResidual: 0, basisError: 0, maxAngularPhase: 0, normalViolation: 0, tangentViolation: 0, frictionCapViolation: 0, normalSpeed: 0, slipReversal: 0,
    reactionNormalViolation: 0, reactionTangentViolation: 0, reactionFrictionCapViolation: 0, reactionAccelerationMismatch: 0 };
  const known: SpatialImpulseSet = transformLoads([{ center: { x: force * h, y: 0, z: 0 } }, {}, {}], variant);
  for (let tick = 0; tick < Math.round(horizon / h); tick++) {
    const before = state, snapshot = JSON.stringify(before);
    let result: ReturnType<typeof advanceSpatialGroundContact>;
    try { result = advanceSpatialGroundContact(before, h, patches, { externalImpulses: known, planeHeight: plane }); }
    catch (error) { firstReject = { plant, friction, force, h, horizon, variant, tick, reason: error instanceof Error ? error.message : String(error), threw: true, inputState: before }; rejections.push(firstReject); break; }
    if (JSON.stringify(before) !== snapshot) violations.push({ kind: 'input-mutated', plant, friction, force, h, horizon, variant, tick });
    if (!result.report.accepted) {
      firstReject = { plant, friction, force, h, horizon, variant, tick, reason: result.report.reason, threw: false,
        atomic: JSON.stringify(result.state) === snapshot, inputState: before, candidateState: result.report.candidateState,
        residual: result.report.residual, maxAngularPhase: result.report.maxAngularPhase, maxElasticPhase: result.report.maxElasticPhase,
        interiorEventCertification: result.report.interiorEventCertification };
      rejections.push(firstReject); if (JSON.stringify(result.state) !== snapshot) violations.push({ kind: 'rejection-not-atomic', rejection: firstReject }); break;
    }
    let full: SpatialImpulseSet;
    try { full = completeLoads(known, patches, result.report); }
    catch (error) { violations.push({ kind: 'contact-identity', plant, friction, force, h, horizon, variant, tick, reason: String(error) }); break; }
    const a = audit(before, result.state, h, full), c = contactAudit(before, result.state, h, patches, known, result.report, plane);
    for (const key of Object.keys(maxima)) {
      const value = key in a ? a[key as keyof Audit] : c[key as keyof ContactAudit]; maxima[key] = Math.max(maxima[key], Math.abs(value));
    }
    minimumLegChord = Math.min(minimumLegChord, a.minimumLegChord); minimumGap = Math.min(minimumGap, c.minimumGap); dampingWork += a.dampingWork; groundWork += c.groundWork;
    if (Object.values(a).some(x => !Number.isFinite(x)) || Object.values(c).some(x => !Number.isFinite(x))
      || [a.workResidual, a.linearResidual, a.angularResidual, a.bodyLinearResidual, a.bodyAngularResidual].some(x => Math.abs(x) > 1e-7)
      || a.comResidual > 1e-8 || a.attachmentResidual > 1e-8 || a.basisError > 1e-8 || a.dampingWork > 1e-10 || a.maxAngularPhase > .5 + 1e-10
      || c.groundWork > 1e-7 || c.normalViolation > 1e-7 || c.tangentViolation > 1e-7 || c.frictionCapViolation > 1e-8 || c.normalSpeed > 1e-7 || c.slipReversal > 1e-7
      || c.reactionNormalViolation > 1e-6 || c.reactionTangentViolation > 1e-6 || c.reactionFrictionCapViolation > 1e-7 || c.reactionAccelerationMismatch > 1e-6 || c.reactionPower > 1e-4)
      violations.push({ kind: 'independent-accepted-contract', plant, friction, force, h, horizon, variant, tick, interval: a, contacts: c,
        inputState: before, outputState: result.state, known, primitiveSoleImpulses: result.report.contacts.map(r => ({ foot: r.foot, id: r.id, impulse: r.impulse })) });
    state = result.state; acceptedIntervals++;
  }
  return { plant, friction, force, h, horizon, variant, completed: firstReject === null && acceptedIntervals === Math.round(horizon / h), acceptedIntervals,
    firstReject, maxima, minimumLegChord, minimumGap, dampingWork, groundWork, final: state };
}
const trajectories = plants.flatMap(plant => frictions.flatMap(friction => forces.flatMap(force => horizons.flatMap(horizon => steps.flatMap(h => variants.map(variant => trajectory(plant, friction, force, h, horizon, variant)))))));
function stateDifference(a: SpatialSupportState, b: SpatialSupportState): number {
  return Math.max(...bodies(a).flatMap((x, i) => { const y = bodies(b)[i]; return [norm(sub(x.position, y.position)), norm(sub(x.velocity, y.velocity)), norm(sub(x.angularMomentum, y.angularMomentum)), ...x.basis.map((v, j) => norm(sub(v, y.basis[j])))]; }));
}
const groups = plants.flatMap(plant => frictions.flatMap(friction => forces.flatMap(force => horizons.map(horizon => ({ plant, friction, force, horizon })))));
const invariance = groups.flatMap(g => steps.map(h => {
  const rows = trajectories.filter(r => r.plant === g.plant && r.friction === g.friction && r.force === g.force && r.horizon === g.horizon && r.h === h), base = rows[0];
  const comparisons = rows.slice(1).map(r => ({ variant: r.variant, sameStatus: r.completed === base.completed,
    difference: r.completed && base.completed ? stateDifference(r.final, transformState(base.final, r.variant)) : null }));
  if (comparisons.some(c => !c.sameStatus || (c.difference !== null && c.difference > 1e-7))) violations.push({ kind: 'invariance', ...g, h, comparisons });
  return { ...g, h, comparisons };
}));
const sensitivity = groups.map(g => {
  const rows = steps.map(h => trajectories.find(r => r.plant === g.plant && r.friction === g.friction && r.force === g.force && r.horizon === g.horizon && r.h === h && r.variant === 'base')!);
  const comparable = rows.every(r => r.completed);
  return { ...g, comparable, coarseVersusFine: comparable ? stateDifference(rows[0].final, rows[2].final) : null,
    mediumVersusFine: comparable ? stateDifference(rows[1].final, rows[2].final) : null };
});
const sourceSha256End = sourceVersion(), scriptSha256End = selfHash();
if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End) throw new Error('Source or diagnostic changed during panel; output withheld');
const summary = { trajectories: trajectories.length, completedTrajectories: trajectories.filter(r => r.completed).length,
  acceptedIntervals: trajectories.reduce((sum, r) => sum + r.acceptedIntervals, 0), ordinaryRejects: rejections.length, independentViolations: violations.length,
  comparableSensitivityPairs: sensitivity.filter(r => r.comparable).length,
  decreasingSensitivityPairs: sensitivity.filter(r => r.comparable && r.mediumVersusFine! <= r.coarseVersusFine! + 1e-12).length };
const payload = { sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End, node: process.version, summary,
  steps, horizons, frictions, forces, variants, plants, fixtures: plants.flatMap(plant => frictions.map(friction => ({ plant, friction, ...fixture(plant, friction) }))),
  trajectories, invariance, sensitivity, rejections, violations,
  scope: 'Established support only. All 18 material equations, finite sole impulses and work independently reconstructed. Instantaneous force audit is additional endpoint evidence only. Interior event certification is not provided; no gait, NFL calibration, balance or football readiness claim.' };
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256Start, scriptSha256Start, summary,
  rejectionSample: rejections.slice(0, 8).map((r: any) => ({ plant: r.plant, friction: r.friction, force: r.force, h: r.h, horizon: r.horizon, variant: r.variant, tick: r.tick, reason: r.reason, threw: r.threw })),
  violationSample: violations.slice(0, 8).map((r: any) => ({ kind: r.kind, plant: r.plant, friction: r.friction, force: r.force, h: r.h, horizon: r.horizon, variant: r.variant, tick: r.tick, interval: r.interval, contacts: r.contacts, comparisons: r.comparisons })) }, null, 2));
if (rejections.length || violations.length) process.exitCode = 1;
