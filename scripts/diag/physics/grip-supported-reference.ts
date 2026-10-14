/** Independent prescribed-support reference for one acquired passive grip.
 * Uses unchanged midpoint World primitives, not the within-interval kernel.
 * Raw packets remain immutable; all transforms and intervention are declared.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { CONTACT_SCALE, World } from '../../../src/physics/world.js';
import { supportParams } from '../../../src/physics/support.js';
import { sourceVersion } from '../../source-version.js';
import type { Particle } from './grip-force-interval.js';

type Private = any;
type Vec = { x: number; y: number };
const root = 'out/grip-supported';
const H = .05 / 12;
const sha = (x: Uint8Array | string) => createHash('sha256').update(x).digest('hex');
const norm = (x: Vec, y: Vec) => Math.hypot(x.x - y.x, x.y - y.y);
const energy = (p: Particle) => .5 * p.mass * (p.vel.x ** 2 + p.vel.y ** 2) + .5 * p.inertia * p.spin ** 2;
const angular = (p: Particle) => p.mass * (p.pos.x * p.vel.y - p.pos.y * p.vel.x) + p.inertia * p.spin;
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
const baseline = JSON.parse(readFileSync('out/grip-timing/baseline.json', 'utf8'));
const flags = Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null]));
if (JSON.stringify(flags) !== JSON.stringify(baseline.flags)) throw Error('Settings differ from saved input manifest');
const source = sourceVersion();
mkdirSync(root, { recursive: true });
const refined = process.argv.includes('--refined');
const coarsePartitions = refined ? 65536 : 4096;
const finePartitions = refined ? 131072 : 8192;
const partitionLabel = `${coarsePartitions}-${finePartitions}`;

function restore(bytes: Buffer, mixed: boolean, side: 1 | -1) {
  // V8 may share typed-array backing storage with bytes: clone before use.
  const p = structuredClone(deserialize(bytes));
  const w: Private = Object.assign(Object.create(World.prototype), p.fields);
  w.attachments = new WeakMap(p.attachments);
  if (w.joints.length !== 1 || w.joints[0].kind !== 'grasp' || w.pending.length) throw Error('Unsupported input graph');
  const joint = w.joints[0], attachment = w.attachments.get(joint);
  if (!attachment?.material || joint.brace !== undefined || joint.broken) throw Error('Unsupported acquired grip');
  joint.legs = 1;
  joint.recoveryCoupling = 1;
  joint.pull = 0;
  w.gripTiming = 'midpoint';
  w.boundedAttachment = false;
  attachment.bounded = false;
  attachment.geometry = undefined;
  w.syncHeldSupport();
  const a = w.indexOf(joint.a), b = w.indexOf(joint.b), point = w.graspPoint(joint);
  const dx = point.x - joint.a.pos.x, dy = point.y - joint.a.pos.y, d = Math.hypot(dx, dy);
  joint.hold = d;
  if (mixed) {
    const nx = dx / d, ny = dy / d;
    joint.a.vel = { x: .2, y: 0 };
    joint.b.vel = { x: .2 + 3 * nx - side * 16 * ny, y: 3 * ny + side * 16 * nx };
    joint.a.spin = joint.b.spin = 0;
  }
  for (const i of p.args[0]) {
    p.args[2][i].free = true;
    p.args[2][i].dive = null;
  }
  const sp = supportParams(joint.b.profile), mobility = sp.stepSpeed / sp.pushForce;
  const originalFeet = w.feet;
  w.feet = function(i: number, ...rest: any[]) {
    originalFeet.call(this, i, ...rest);
    if (i === b) {
      const foot = joint.b.support.foot;
      if (!foot) throw Error('Held foot disappeared');
      foot.mobility = mobility;
      foot.desired = { x: 0, y: 0 };
    }
  };
  const particle = (body: Private): Particle => ({ mass: body.profile.massKg, inertia: w.inertia[w.indexOf(body)],
    pos: { ...body.pos }, vel: { ...body.vel }, facing: body.facing, spin: body.spin ?? 0 });
  const input = { a: particle(joint.a), b: particle(joint.b), material: { ...attachment.material },
    footOffset: { ...attachment.foot.offset }, mobility, desired: { x: 0, y: 0 }, capacity: w.gripCapacity(joint),
    duration: H, minimumDistance: CONTACT_SCALE * (joint.a.profile.radius + joint.b.profile.radius),
    reach: joint.reach, attachmentReach: sp.comHeight, hold: joint.hold };
  return { w, p, joint, attachment, a, b, input, particle };
}

function reference(bytes: Buffer, mixed: boolean, side: 1 | -1, partitions: number) {
  const started = performance.now();
  const c = restore(bytes, mixed, side), { w, p, joint, attachment } = c;
  const rows: Private[] = [], originalRows = w.jointRows;
  let current: Private;
  w.jointRows = function(h: number) {
    const result = originalRows.call(this, h);
    if (result.length !== 1 || result[0].joint !== joint) throw Error('Reference left single-row scope');
    const row = result[0], point = w.graspPoint(joint);
    current = { row, t: w.time - p.fields.time, h,
      materialBefore: { ...attachment.material }, pointBefore: { ...point }, footBefore: { ...attachment.foot.offset },
      mobilityNormal: w.attachmentMobility(joint, row.nx, row.ny),
      mobilityTangent: w.attachmentMobility(joint, -row.ny, row.nx) };
    return result;
  };
  const workBefore = p.args[5].work.grasps, motorBefore = p.args[5].supportMotorWork[c.b],
    passiveBefore = p.args[5].passiveGraspWork, contactBefore = p.args[5].work.contacts;
  const groundBefore = p.args[5].groundImpulse.map((v: Vec) => ({ ...v }));
  const sums = { impulse: { x: 0, y: 0 }, moment: { x: 0, y: 0 },
    angularImpulseA: 0, angularImpulseB: 0, angularMomentA: 0, angularMomentB: 0, dose: 0,
    maximumCapExcess: 0, minimumCapFraction: Infinity, normalDose: 0, tangentDose: 0 };
  const h = H / partitions;
  // Every row contributes to accounting; retain at most about 8192 actual
  // trace samples when the named reference-discretization risk needs refinement.
  const traceStride = Math.max(1, Math.floor(partitions / 8192));
  for (let k = 0; k < partitions; k++) {
    const args = [...p.args]; args[3] = h; args[4] = p.args[4] - k * h;
    const before = { bodyWork: p.args[5].work.grasps, motorWork: p.args[5].supportMotorWork[c.b], passiveWork: p.args[5].passiveGraspWork };
    current = undefined;
    w.integrateSubstep(...args);
    if (!current) throw Error('No actual grip row');
    const r = current.row, x = r.nx * r.ln - r.ny * r.lt, y = r.ny * r.ln + r.nx * r.lt;
    const tauA = (r.ni ?? 0) * r.ln - (r.ri ?? 0) * r.lt,
      tauB = (r.nj ?? 0) * r.ln - (r.rj ?? 0) * r.lt, q = H - (k + .5) * h;
    const dose = Math.hypot(r.ln - r.reel, r.lt), excess = dose - r.limit;
    sums.impulse.x += x; sums.impulse.y += y; sums.moment.x += q * x; sums.moment.y += q * y;
    sums.angularImpulseA += tauA; sums.angularImpulseB += tauB;
    sums.angularMomentA += q * tauA; sums.angularMomentB += q * tauB;
    sums.dose += dose; sums.normalDose += Math.abs(r.ln); sums.tangentDose += Math.abs(r.lt);
    sums.maximumCapExcess = Math.max(sums.maximumCapExcess, excess);
    sums.minimumCapFraction = Math.min(sums.minimumCapFraction, dose / r.limit);
    const { row: _row, ...saved } = current;
    if (k % traceStride === 0 || k === partitions - 1) rows.push({ ...saved, normal: { x: r.nx, y: r.ny }, normalArms: [r.ni ?? 0, r.nj ?? 0],
      tangentArms: [r.ri ?? 0, r.rj ?? 0], normalImpulse: r.ln, tangentImpulse: r.lt, limit: r.limit,
      impulse: { x, y }, temporalMoment: { x: q * x, y: q * y }, angularImpulse: [tauA, tauB],
      angularMoment: [q * tauA, q * tauB], bodyWork: p.args[5].work.grasps - before.bodyWork,
      motorWork: p.args[5].supportMotorWork[c.b] - before.motorWork,
      passiveWork: p.args[5].passiveGraspWork - before.passiveWork,
      materialAfter: { ...attachment.material }, pointAfter: { ...w.graspPoint(joint) }, footAfter: { ...attachment.foot.offset },
      slipping: joint.slipping, hold: joint.hold, broken: joint.broken ?? false });
  }
  const output = { a: c.particle(joint.a), b: c.particle(joint.b), material: { ...attachment.material },
    point: { ...w.graspPoint(joint) }, footOffset: { ...attachment.foot.offset },
    impulse: sums.impulse, moment: sums.moment, angularImpulseA: sums.angularImpulseA, angularImpulseB: sums.angularImpulseB,
    angularMomentA: sums.angularMomentA, angularMomentB: sums.angularMomentB,
    bodyWork: p.args[5].work.grasps - workBefore, motorWork: p.args[5].supportMotorWork[c.b] - motorBefore,
    passiveWork: p.args[5].passiveGraspWork - passiveBefore, dose: sums.dose,
    slipping: joint.slipping ?? false, hold: joint.hold, broken: joint.broken ?? false };
  const accounting = {
    workResidual: energy(output.a) + energy(output.b) - energy(c.input.a) - energy(c.input.b) - output.bodyWork,
    angularResidual: angular(output.a) + angular(output.b) - angular(c.input.a) - angular(c.input.b),
    passiveLedgerResidual: output.bodyWork - output.motorWork - output.passiveWork,
    contactWork: p.args[5].work.contacts - contactBefore,
    groundImpulse: p.args[5].groundImpulse.map((v: Vec, i: number) => ({ x: v.x - groundBefore[i].x, y: v.y - groundBefore[i].y })),
    capacityDoseExcess: sums.dose - c.input.capacity * H,
    state: [joint.a.support.state, joint.b.support.state],
    ...sums,
  };
  return { partitions, input: c.input, output, accounting, traceStride, rows, seconds: (performance.now() - started) / 1000 };
}

const cases: Private[] = [];
const failures: Private[] = [];
for (const side of [1, -1] as const) for (const mixed of [false, true]) {
  const packetId = `patch-45-8-0-3001-${side}`, id = `${packetId}-${mixed ? 'mixed' : 'tangent'}-support`;
  const bytes = readFileSync(`out/grip-timing/${packetId}.bin`), checksum = sha(bytes);
  if (checksum !== baseline.checkpoints.find((x: Private) => x.id === packetId).checksum) throw Error('Packet differs');
  const coarse = reference(bytes, mixed, side, coarsePartitions), fine = reference(bytes, mixed, side, finePartitions);
  if (sha(bytes) !== checksum) throw Error('Source bytes mutated');
  const x = coarse.output, y = fine.output;
  const difference = {
    position: Math.max(norm(x.a.pos, y.a.pos), norm(x.b.pos, y.b.pos)),
    velocity: Math.max(norm(x.a.vel, y.a.vel), norm(x.b.vel, y.b.vel)),
    facing: Math.max(Math.abs(x.a.facing - y.a.facing), Math.abs(x.b.facing - y.b.facing)),
    spin: Math.max(Math.abs(x.a.spin - y.a.spin), Math.abs(x.b.spin - y.b.spin)),
    material: norm(x.material, y.material), point: norm(x.point, y.point), footOffset: norm(x.footOffset, y.footOffset),
    impulse: norm(x.impulse, y.impulse), moment: norm(x.moment, y.moment),
    angularImpulse: Math.max(Math.abs(x.angularImpulseA - y.angularImpulseA), Math.abs(x.angularImpulseB - y.angularImpulseB)),
    angularMoment: Math.max(Math.abs(x.angularMomentA - y.angularMomentA), Math.abs(x.angularMomentB - y.angularMomentB)),
    bodyWork: Math.abs(x.bodyWork - y.bodyWork), motorWork: Math.abs(x.motorWork - y.motorWork),
    passiveWork: Math.abs(x.passiveWork - y.passiveWork), hold: Math.abs(x.hold - y.hold),
    flagsEqual: x.slipping === y.slipping && x.broken === y.broken,
  };
  const converged = difference.position < 5e-7 / 16 && difference.velocity < 2.5e-5 / 16
    && difference.facing < 2.5e-6 / 16 && difference.spin < 2.5e-4 / 16
    && Math.max(difference.bodyWork, difference.motorWork, difference.passiveWork) < .01 / 16
    && difference.point < 5e-7 / 16 && difference.material < 5e-7 / 16 && difference.footOffset < 5e-7 / 16
    && difference.flagsEqual;
  const physical = [coarse, fine].every(r => Math.abs(r.accounting.workResidual) < 1e-7
    && Math.abs(r.accounting.angularResidual) < 1e-7 && Math.abs(r.accounting.passiveLedgerResidual) < 1e-7
    && r.accounting.contactWork === 0 && r.accounting.maximumCapExcess < 1e-8 && r.accounting.capacityDoseExcess < 1e-8
    && r.accounting.groundImpulse.every((v: Vec) => Math.hypot(v.x, v.y) === 0)
    && r.output.passiveWork <= 1e-7 && !r.output.broken && r.accounting.state.every((s: string) => s === 'up'));
  const mixedScope = !mixed || [coarse, fine].every(r => r.accounting.minimumCapFraction > .98
    && r.accounting.normalDose > 1e-5 && r.accounting.tangentDose > 1e-5);
  const raw = { id, packetId, packetSha256: checksum,
    transform: { legs: 1, pull: 0, unboundedMaterial: true, prescribedMobility: 'supportParams.stepSpeed / pushForce',
      desired: { x: 0, y: 0 }, freePlans: true, mixed: mixed ? { aVelocity: { x: .2, y: 0 }, relativeNormal: 3, relativeTangent: side * 16, spins: 0, hold: 'acquired distance' } : null },
    coarse, fine, difference, converged, physical, mixedScope };
  writeFileSync(`${root}/${id}-${partitionLabel}.json`, JSON.stringify(raw));
  const row = { id, packetId, packetSha256: checksum, transform: raw.transform, input: fine.input,
    reference: fine.output, convergence: { coarse: coarsePartitions, fine: finePartitions, difference, converged }, physical, mixedScope,
    seconds: { coarse: coarse.seconds, fine: fine.seconds },
    accounting: { ...fine.accounting, groundImpulse: undefined } };
  cases.push(row);
  if (!converged || !physical || !mixedScope) failures.push(row);
  console.log(JSON.stringify({ id, difference, converged, physical, mixedScope, accounting: row.accounting }));
}
if (sourceVersion() !== source) throw Error('Runtime changed during collection');
const manifest = { source, commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  baseline: baseline.baseline, referenceCommit: '8e36cce80e138133acd6afc7aba0befc21d5a746', flags,
  collectorSha256: sha(readFileSync(import.meta.filename)), node: process.version,
  scope: 'One acquired passive lower grip; prescribed isotropic support mobility, desired zero, free ground plans, no active arms or other contacts. Diagnostic transformed inputs, not native football.',
  accuracy: { position: 5e-7, velocity: 2.5e-5, facing: 2.5e-6, spin: 2.5e-4, work: .01, referenceAllowance: 1 / 16 },
  cases, failures: failures.map(r => r.id) };
writeFileSync(`${root}/result-${partitionLabel}.json`, JSON.stringify(manifest, null, 2));
writeFileSync(`${root}/result.json`, JSON.stringify(manifest, null, 2));
if (!failures.length) writeFileSync('config/grip-supported-reference.json', JSON.stringify(manifest, null, 2) + '\n');
else process.exitCode = 2;
