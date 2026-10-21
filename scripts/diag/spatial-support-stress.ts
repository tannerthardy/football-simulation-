/** Independent mechanics panel for the experimental spatial support substrate.
 * Node 22: node --import tsx scripts/diag/spatial-support-stress.ts [output.json]
 * Explicit toy material priors; no NFL calibration or football readiness claim.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { advanceSpatialSupport, newSpatialSupport, type SpatialSupportState, type SpatialImpulseSet } from '../../src/physics/spatial-support.js';
import { solveSoleImpact, type SoleContactPoint } from '../../src/physics/sole-contact.js';
import type { MaterialRigidState, Vec3, RigidBasis } from '../../src/physics/material-rigid.js';
import { sourceVersion } from '../source-version.js';

if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run this panel with Node 22');
if (process.argv.length > 3 || process.argv[2]?.startsWith('--')) throw new Error('Specify at most one output path');
const output = process.argv[2] ?? 'out/spatial-support-stress.json';
const selfPath = fileURLToPath(import.meta.url);
const selfHash = () => createHash('sha256').update(readFileSync(selfPath)).digest('hex');
const sourceSha256Start = sourceVersion(), scriptSha256Start = selfHash();
const seed = 0x534f4c45;
let randomState = seed;
const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 2 ** 32; };
const between = (lo: number, hi: number) => lo + (hi - lo) * random();
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
    const f = l0 === l1 ? Math.min(c.forceCap, c.stiffness * Math.max(0, c.restLength - l0)) : -(springPotential(l1, c) - springPotential(l0, c)) / (l1 - l0);
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
function transformLoads(loads: SpatialImpulseSet, variant: Variant): SpatialImpulseSet {
  const result = structuredClone(loads);
  if (variant === 'mirror') result.forEach(l => {
    if (l.center) l.center = reflect(l.center); if (l.couple) l.couple = axialReflect(l.couple);
    l.points?.forEach(p => { p.local = reflect(p.local); p.impulse = reflect(p.impulse); });
  });
  return result;
}
function material(mass: number, inertia: number, position: Vec3, velocity: Vec3, omega: Vec3): MaterialRigidState {
  return { mass, inertia, position, velocity, angularMomentum: scale(omega, inertia), basis: identity() };
}
function fixture(id: number): { id: number; initial: SpatialSupportState; forces: SpatialImpulseSet } {
  const mt = between(75, 105), mf = between(1.7, 2.5), inertia = between(.012, .025), hipWidth = between(.075, .11), hipDrop = between(.1, .16);
  const height = between(.98, 1.06), ankleHeight = between(.025, .045), ankleForward = between(-.025, .025);
  const sharedVelocity = { x: between(1, 4), y: between(-.4, .4), z: between(-.1, .1) };
  const torso = material(mt, between(7, 12), { x: 0, y: 0, z: 10 + height }, sharedVelocity, { x: between(-.3, .3), y: between(-.3, .3), z: between(-.3, .3) });
  const feet = [-1, 1].map(side => material(mf, inertia, { x: between(-.04, .04), y: side * (hipWidth + between(.02, .05)), z: 10 },
    add(sharedVelocity, { x: between(-.1, .1), y: between(-.05, .05), z: between(-.1, .1) }), { x: between(-1, 1), y: between(-1, 1), z: between(-1, 1) })) as SpatialSupportState['feet'];
  const legs = [-1, 1].map((side, i) => {
    const hip = { x: 0, y: side * hipWidth, z: -hipDrop }, ankle = { x: ankleForward, y: 0, z: ankleHeight };
    const length = norm(sub(point(feet[i], ankle), point(torso, hip)));
    return { hip, ankle, compliance: { restLength: length + between(.025, .055), stiffness: between(2500, 5000), forceCap: between(1000, 1700), damping: between(10, 35), dampingCap: 250 } };
  }) as SpatialSupportState['legs'];
  const initial = newSpatialSupport({ torso, feet, legs, gravity: { x: 0, y: 0, z: -10 } });
  const forces: SpatialImpulseSet = id % 2 === 0 ? [{}, {}, {}] : [
    { points: [{ id: 'known-shoulder-load', local: { x: .12, y: .17, z: .25 }, impulse: { x: between(20, 80), y: between(-20, 20), z: between(-10, 10) } }], couple: { x: .2, y: -.15, z: .1 } },
    { center: { x: 1, y: -.5, z: .3 } }, {}];
  return { id, initial, forces };
}
function impulsesFor(forces: SpatialImpulseSet, h: number): SpatialImpulseSet {
  return forces.map(l => ({ ...(l.center ? { center: scale(l.center, h) } : {}), ...(l.couple ? { couple: scale(l.couple, h) } : {}),
    ...(l.points ? { points: l.points.map(p => ({ ...p, local: { ...p.local }, impulse: scale(p.impulse, h) })) } : {}) })) as SpatialImpulseSet;
}
const violations: unknown[] = [], rejections: unknown[] = [];
const horizon = .024, steps = [.004, .002, .001], variants: Variant[] = ['base', 'mirror', 'translated'];
const fixtures = Array.from({ length: 24 }, (_, i) => fixture(i));
function trajectory(f: ReturnType<typeof fixture>, h: number, variant: Variant) {
  let state = transformState(f.initial, variant), acceptedIntervals = 0;
  const maxima: Record<string, number> = { workResidual: 0, linearResidual: 0, angularResidual: 0, comResidual: 0, bodyLinearResidual: 0, bodyAngularResidual: 0, attachmentResidual: 0, basisError: 0, maxAngularPhase: 0 };
  let minimumLegChord = Infinity, dampingWork = 0, rejected: unknown = null;
  const loads = transformLoads(impulsesFor(f.forces, h), variant);
  for (let i = 0; i < Math.round(horizon / h); i++) {
    const before = state, snapshot = JSON.stringify(before);
    let result: ReturnType<typeof advanceSpatialSupport>;
    try { result = advanceSpatialSupport(before, h, { externalImpulses: loads }); }
    catch (error) { rejected = { fixture: f.id, h, variant, interval: i, reason: error instanceof Error ? error.message : String(error), threw: true }; rejections.push(rejected); break; }
    if (JSON.stringify(before) !== snapshot) violations.push({ kind: 'input-mutated', fixture: f.id, h, variant, interval: i });
    if (!result.report.accepted) {
      rejected = { fixture: f.id, h, variant, interval: i, reason: result.report.reason, threw: false, atomic: JSON.stringify(result.state) === snapshot };
      rejections.push(rejected); if (JSON.stringify(result.state) !== snapshot) violations.push({ kind: 'rejection-not-atomic', rejected }); break;
    }
    const a = audit(before, result.state, h, loads);
    for (const key of Object.keys(maxima)) maxima[key] = Math.max(maxima[key], Math.abs(a[key as keyof Audit]));
    minimumLegChord = Math.min(minimumLegChord, a.minimumLegChord); dampingWork += a.dampingWork;
    if ([a.workResidual, a.linearResidual, a.angularResidual, a.bodyLinearResidual, a.bodyAngularResidual].some(x => !Number.isFinite(x) || Math.abs(x) > 1e-7)
      || a.comResidual > 1e-8 || a.attachmentResidual > 1e-8 || a.basisError > 1e-8 || a.dampingWork > 1e-10 || a.maxAngularPhase > .5 + 1e-10)
      violations.push({ kind: 'independent-accepted-contract', fixture: f.id, h, variant, interval: i, audit: a });
    state = result.state; acceptedIntervals++;
  }
  return { fixture: f.id, h, variant, completed: rejected === null, rejected, acceptedIntervals, final: state, maxima, minimumLegChord, dampingWork };
}
const trajectories = fixtures.flatMap(f => steps.flatMap(h => variants.map(variant => trajectory(f, h, variant))));
function stateDifference(a: SpatialSupportState, b: SpatialSupportState): number {
  return Math.max(...bodies(a).flatMap((x, i) => {
    const y = bodies(b)[i]; return [norm(sub(x.position, y.position)), norm(sub(x.velocity, y.velocity)), norm(sub(x.angularMomentum, y.angularMomentum)),
      ...x.basis.map((v, j) => norm(sub(v, y.basis[j])))];
  }));
}
const invariance = fixtures.flatMap(f => steps.map(h => {
  const rows = trajectories.filter(r => r.fixture === f.id && r.h === h), base = rows[0];
  const differences = rows.slice(1).map(r => ({ variant: r.variant, sameStatus: r.completed === base.completed,
    difference: r.completed && base.completed ? stateDifference(r.final, transformState(base.final, r.variant)) : null }));
  if (differences.some(d => !d.sameStatus || (d.difference !== null && d.difference > 1e-7))) violations.push({ kind: 'invariance', fixture: f.id, h, differences });
  return { fixture: f.id, h, differences };
}));
const sensitivity = fixtures.map(f => {
  const rows = steps.map(h => trajectories.find(r => r.fixture === f.id && r.h === h && r.variant === 'base')!);
  const comparable = rows.every(r => r.completed);
  return { fixture: f.id, comparable, coarseVersusFine: comparable ? stateDifference(rows[0].final, rows[2].final) : null,
    mediumVersusFine: comparable ? stateDifference(rows[1].final, rows[2].final) : null };
});
const angularFixture = structuredClone(fixtures[0].initial); angularFixture.feet[0].angularMomentum.z = angularFixture.feet[0].inertia * 200;
const controls = [
  { id: 'finite-angular-interval-budget', initial: angularFixture, h: .005, options: {} },
  { id: 'insufficient-newton-budget', initial: fixtures[0].initial, h: .004, options: { maxIterations: 1 } }
].map(c => {
  const result = advanceSpatialSupport(c.initial, c.h, c.options), atomic = JSON.stringify(result.state) === JSON.stringify(c.initial);
  if (result.report.accepted || !atomic) violations.push({ kind: 'rejection-control', id: c.id, accepted: result.report.accepted, atomic });
  return { id: c.id, accepted: result.report.accepted, reason: result.report.reason, atomic };
});

// Actual rigid-sole IMPACT only: contact impulses are primitive solve outputs.
// Reconstruct all work, momenta and KKT conditions from those impulses and states.
function impactAudit(before: MaterialRigidState, after: MaterialRigidState, contacts: SoleContactPoint[], impulses: Vec3[]) {
  let jTotal = zero(), worldTorque = zero(), work = 0, normalViolation = 0, tangentViolation = 0, capViolation = 0;
  contacts.forEach((c, i) => {
    const j = impulses[i], v = pointVelocity(after, c.local), cap = c.friction * j.z, size = Math.hypot(j.x, j.y), slip = Math.hypot(v.x, v.y);
    jTotal = add(jTotal, j); worldTorque = add(worldTorque, cross(point(before, c.local), j));
    work += dot(j, mean(pointVelocity(before, c.local), v));
    normalViolation = Math.max(normalViolation, -j.z, -v.z, Math.abs(j.z * v.z)); capViolation = Math.max(capViolation, size - cap);
    if (cap > 1e-10) {
      if (size < cap - 1e-8) tangentViolation = Math.max(tangentViolation, slip);
      else if (slip > 1e-8) tangentViolation = Math.max(tangentViolation, Math.hypot(j.x + cap * v.x / slip, j.y + cap * v.y / slip));
    } else tangentViolation = Math.max(tangentViolation, size);
  });
  return { workResidual: kinetic(after) - kinetic(before) - work, kineticChange: kinetic(after) - kinetic(before),
    linearResidual: norm(sub(scale(sub(after.velocity, before.velocity), before.mass), jTotal)),
    angularResidual: norm(sub(sub(bodyAngular(after), bodyAngular(before)), worldTorque)), normalViolation, tangentViolation, capViolation,
    poseChange: Math.max(norm(sub(after.position, before.position)), ...after.basis.map((v, i) => norm(sub(v, before.basis[i])))) };
}
const impactFixtures = Array.from({ length: 40 }, (_, i) => {
  const mass = between(1.7, 2.6), inertia = between(.012, .026);
  const initial = material(mass, inertia, { x: 0, y: 0, z: .03 }, { x: between(-3, 3), y: between(-1.5, 1.5), z: -between(.7, 2.5) },
    { x: between(-3, 3), y: between(-3, 3), z: between(-3, 3) });
  const friction = i % 8 === 0 ? 0 : between(.15, .9);
  const contacts = [{ id: 'back-left', local: { x: -.11, y: -.055, z: -.03 }, friction },
    { id: 'front-left', local: { x: .11, y: -.055, z: -.03 }, friction }, { id: 'right', local: { x: 0, y: .09, z: -.03 }, friction }];
  return { id: i, initial, contacts };
});
const impacts = impactFixtures.flatMap(f => variants.map(variant => {
  const initial = structuredClone(f.initial), contacts = structuredClone(f.contacts);
  if (variant === 'translated') initial.position = add(initial.position, { x: translation.x, y: translation.y, z: 0 });
  if (variant === 'mirror') {
    initial.velocity = reflect(initial.velocity); initial.angularMomentum = axialReflect(initial.angularMomentum);
    initial.basis = [scale(reflect(initial.basis[0]), -1), reflect(initial.basis[1]), reflect(initial.basis[2])];
    contacts.forEach(c => { c.local = reflect(c.local); });
  }
  const result = solveSoleImpact(initial, contacts), accepted = result.report.accepted;
  const actual = accepted ? result.state : result.report.candidateState;
  const a = impactAudit(initial, actual, contacts, contacts.map(c => result.report.contacts.find(r => r.id === c.id)!.impulse));
  if (!accepted) rejections.push({ impact: f.id, variant, reason: result.report.reason });
  if (accepted && (Math.abs(a.workResidual) > 1e-7 || a.kineticChange > 1e-8 || a.linearResidual > 1e-7 || a.angularResidual > 1e-7
    || a.normalViolation > 1e-7 || a.tangentViolation > 1e-7 || a.capViolation > 1e-8 || a.poseChange > 1e-12)) violations.push({ kind: 'independent-impact-contract', fixture: f.id, variant, audit: a });
  if (!accepted && JSON.stringify(result.state) !== JSON.stringify(initial)) violations.push({ kind: 'impact-rejection-not-atomic', fixture: f.id, variant });
  return { fixture: f.id, variant, accepted, reason: result.report.reason, audit: a, final: result.state };
}));
const impactInvariance = impactFixtures.map(f => {
  const rows = impacts.filter(r => r.fixture === f.id), base = rows[0];
  const comparisons = rows.slice(1).map(r => {
    const expectedVelocity = r.variant === 'mirror' ? reflect(base.final.velocity) : base.final.velocity;
    const expectedSpin = r.variant === 'mirror' ? axialReflect(base.final.angularMomentum) : base.final.angularMomentum;
    return { variant: r.variant, sameStatus: r.accepted === base.accepted,
      difference: r.accepted && base.accepted ? Math.max(norm(sub(r.final.velocity, expectedVelocity)), norm(sub(r.final.angularMomentum, expectedSpin))) : null };
  });
  if (comparisons.some(c => !c.sameStatus || (c.difference !== null && c.difference > 1e-7))) violations.push({ kind: 'impact-invariance', fixture: f.id, comparisons });
  return { fixture: f.id, comparisons };
});
const sourceSha256End = sourceVersion(), scriptSha256End = selfHash();
if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End) throw new Error('Source or diagnostic script changed during panel; output withheld');
const summary = { trajectories: trajectories.length, completedTrajectories: trajectories.filter(r => r.completed).length,
  acceptedIntervals: trajectories.reduce((sum, r) => sum + r.acceptedIntervals, 0), impacts: impacts.length, acceptedImpacts: impacts.filter(r => r.accepted).length,
  rejectedOrdinaryCases: rejections.length, independentViolations: violations.length,
  sensitivityPairs: sensitivity.filter(r => r.comparable).length,
  decreasingSensitivityPairs: sensitivity.filter(r => r.comparable && r.mediumVersusFine! < r.coarseVersusFine!).length };
const payload = { sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End, node: process.version, seed, horizon, steps, summary,
  fixtures, trajectories, invariance, sensitivity, controls, impactFixtures, impacts, impactInvariance, rejections, violations,
  scope: 'Explicit moderate toy priors, free-flight passive rigid support and frozen-pose sole impact only. Every rejection is reported. No sustained ground, gait, anatomy, NFL calibration or readiness claim.' };
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256Start, scriptSha256Start, summary, controls, rejections, violations }, null, 2));
if (rejections.length || violations.length) process.exitCode = 1;
