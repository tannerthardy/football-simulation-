/** Bounded evidence for the prescribed-support diagnostic kernel.
 * Accuracy uses existing checked references; timed World modes have no
 * observers/profiler. Their sole intervention prescribes the same support
 * motor on the prototype, including resolved scratch solves.
 */
import { deepStrictEqual } from 'node:assert';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpus } from 'node:os';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { CONTACT_SCALE, World } from '../../../src/physics/world.js';
import { supportParams } from '../../../src/physics/support.js';
import { sourceVersion } from '../../source-version.js';
import { supportedGripInterval, type SupportedGripInput } from './grip-force-supported.js';
import type { Particle } from './grip-force-interval.js';

type Private = any;
type Vec = { x: number; y: number };
type Mode = 'midpoint' | 'resolved' | 'kernel';
const root = 'out/grip-supported';
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const norm = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const energy = (p: Particle) => .5 * p.mass * (p.vel.x ** 2 + p.vel.y ** 2) + .5 * p.inertia * p.spin ** 2;
const angular = (p: Particle) => p.mass * (p.pos.x * p.vel.y - p.pos.y * p.vel.x) + p.inertia * p.spin;
const jsonHash = (v: unknown) => sha(JSON.stringify(v));
const fixturePath = 'config/grip-supported-reference.json';
const kernelPath = 'scripts/diag/physics/grip-force-supported.ts';
const fixtureBytes = readFileSync(fixturePath), fixture = JSON.parse(fixtureBytes.toString());
const kernelHash = sha(readFileSync(kernelPath)), collectorHash = sha(readFileSync(import.meta.filename));
const source = sourceVersion(), commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
const flags = Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null]));
deepStrictEqual(flags, fixture.flags, 'Settings differ from the compatible saved reference');
if (source !== fixture.source || fixture.failures.length) throw Error('Wrong source or unconverged reference');

const packets = new Map<string, { bytes: Buffer; checksum: string }>();
for (const c of fixture.cases) {
  const bytes = readFileSync(`out/grip-timing/${c.packetId}.bin`), checksum = sha(bytes);
  if (checksum !== c.packetSha256 || !c.convergence.converged || !c.physical || !c.mixedScope)
    throw Error(`Unusable reference: ${c.id}`);
  packets.set(c.packetId, { bytes, checksum });
}
function checkImmutable() {
  for (const [id, p] of packets) if (sha(p.bytes) !== p.checksum) throw Error(`Serialized input mutated: ${id}`);
  if (jsonHash(fixture) !== fixtureIdentity) throw Error('Fixture data mutated');
}
const fixtureIdentity = jsonHash(fixture);
let declaredWorldOptions: Private;

function build(c: Private, mode: 'midpoint' | 'resolved') {
  const bytes = packets.get(c.packetId)!.bytes;
  // V8 can share backing storage with bytes; clone the whole graph together.
  const p = structuredClone(deserialize(bytes));
  const w: Private = Object.assign(Object.create(World.prototype), p.fields);
  w.attachments = new WeakMap(p.attachments);
  if (w.joints.length !== 1 || w.joints[0].kind !== 'grasp' || w.pending.length) throw Error('Unsupported reference graph');
  const joint = w.joints[0], attachment = w.attachments.get(joint);
  if (!attachment?.material || joint.brace !== undefined || joint.broken) throw Error('Unsupported acquired grip');
  joint.legs = joint.recoveryCoupling = 1;
  joint.pull = 0;
  w.gripTiming = mode;
  w.boundedAttachment = false;
  if (w.handContact !== 'patch' || w.handIntegration !== 'centered' || w.constraintWork !== 'per-solve')
    throw Error('Reference requires centered patch geometry and per-solve work');
  const options = { handContact: w.handContact, handIntegration: w.handIntegration, supportModel: w.supportModel,
    constraintWork: w.constraintWork, impactTiming: w.impactTiming, supportIntegration: w.supportIntegration,
    boundedAttachment: w.boundedAttachment, nominalSubsteps: w.substeps };
  if (declaredWorldOptions) deepStrictEqual(options, declaredWorldOptions, 'World settings differ across identical inputs');
  else declaredWorldOptions = options;
  attachment.bounded = false;
  attachment.geometry = undefined;
  w.syncHeldSupport();
  const point = w.graspPoint(joint), dx = point.x - joint.a.pos.x, dy = point.y - joint.a.pos.y,
    distance = Math.hypot(dx, dy);
  joint.hold = distance;
  if (c.transform.mixed) {
    const nx = dx / distance, ny = dy / distance, transform = c.transform.mixed;
    joint.a.vel = { ...transform.aVelocity };
    joint.b.vel = { x: transform.aVelocity.x + transform.relativeNormal * nx - transform.relativeTangent * ny,
      y: transform.aVelocity.y + transform.relativeNormal * ny + transform.relativeTangent * nx };
    joint.a.spin = joint.b.spin = transform.spins;
  }
  for (const i of p.args[0]) { p.args[2][i].free = true; p.args[2][i].dive = null; }
  const particle = (body: Private): Particle => ({ mass: body.profile.massKg, inertia: w.inertia[w.indexOf(body)],
    pos: { ...body.pos }, vel: { ...body.vel }, facing: body.facing, spin: body.spin ?? 0 });
  const sp = supportParams(joint.b.profile);
  const input: SupportedGripInput = { a: particle(joint.a), b: particle(joint.b), material: { ...attachment.material },
    footOffset: { ...attachment.foot.offset }, mobility: sp.stepSpeed / sp.pushForce, desired: { x: 0, y: 0 },
    capacity: w.gripCapacity(joint), duration: c.input.duration,
    minimumDistance: CONTACT_SCALE * (joint.a.profile.radius + joint.b.profile.radius), reach: joint.reach,
    attachmentReach: sp.comHeight, hold: joint.hold };
  deepStrictEqual(input, c.input, 'Benchmark transform does not match checked reference input');
  p.args[3] = input.duration;
  const b = w.indexOf(joint.b), before = { work: p.args[5].work.grasps, motor: p.args[5].supportMotorWork[b],
    passive: p.args[5].passiveGraspWork, dose: joint.force ?? 0, contacts: p.args[5].work.contacts,
    ground: p.args[5].groundImpulse.map((v: Vec) => ({ ...v })) };
  return { w, p, joint, attachment, particle, input, b, before };
}

function compare(input: SupportedGripInput, result: Private, reference: Private) {
  const pose = Object.fromEntries((['a', 'b'] as const).map(k => [k, {
    position: norm(result[k].pos, reference[k].pos), velocity: norm(result[k].vel, reference[k].vel),
    facing: Math.abs(result[k].facing - reference[k].facing), spin: Math.abs(result[k].spin - reference[k].spin),
  }]));
  const errors = { pose, material: norm(result.material, reference.material),
    point: norm(result.point, reference.point), footOffset: norm(result.footOffset, reference.footOffset),
    impulse: norm(result.impulse, reference.impulse), moment: norm(result.moment, reference.moment),
    angularImpulse: [0, 1].map((i: number) => Math.abs(result.angularImpulse[i] - reference[`angularImpulse${i ? 'B' : 'A'}`])),
    angularMoment: [0, 1].map((i: number) => Math.abs(result.angularMoment[i] - reference[`angularMoment${i ? 'B' : 'A'}`])),
    bodyWork: Math.abs(result.bodyWork - reference.bodyWork), motorWork: Math.abs(result.motorWork - reference.motorWork),
    passiveWork: Math.abs(result.passiveWork - reference.passiveWork), dose: Math.abs(result.dose - reference.dose),
    hold: Math.abs(result.hold - reference.hold), slippingEqual: result.slipping === reference.slipping };
  const accounting = { workResidual: energy(result.a) + energy(result.b) - energy(input.a) - energy(input.b) - result.bodyWork,
    angularResidual: angular(result.a) + angular(result.b) - angular(input.a) - angular(input.b),
    passiveLedgerResidual: result.bodyWork - result.motorWork - result.passiveWork,
    capacityDoseExcess: result.dose - input.capacity * input.duration, passiveWork: result.passiveWork,
    footResponseResidual: norm(result.footOffset, { x: input.footOffset.x + input.mobility * result.impulse.x,
      y: input.footOffset.y + input.mobility * result.impulse.y }) };
  const matches = Object.values(pose).every((p: Private) => p.position < 5e-7 && p.velocity < 2.5e-5
    && p.facing < 2.5e-6 && p.spin < 2.5e-4) && errors.material < 5e-7 && errors.point < 5e-7
    && errors.footOffset < 5e-7 && errors.hold < 5e-7 && errors.slippingEqual
    && Math.max(errors.bodyWork, errors.motorWork, errors.passiveWork) < .01
    && errors.impulse < 2.5e-5 * Math.min(input.a.mass, input.b.mass)
    && errors.moment < 5e-7 * Math.min(input.a.mass, input.b.mass)
    && Math.max(...errors.angularImpulse) < 2.5e-4 * Math.min(input.a.inertia, input.b.inertia)
    && Math.max(...errors.angularMoment) < 2.5e-6 * Math.min(input.a.inertia, input.b.inertia);
  const physical = Math.abs(accounting.workResidual) < 1e-8 && Math.abs(accounting.angularResidual) < 1e-7
    && Math.abs(accounting.passiveLedgerResidual) < 1e-8 && accounting.capacityDoseExcess < 1e-9
    && accounting.passiveWork <= 1e-9 && accounting.footResponseResidual < 1e-11;
  return { errors, accounting, matches, physical };
}

const accuracy = fixture.cases.map((c: Private) => {
  const input: SupportedGripInput = structuredClone(c.input), result = supportedGripInterval(input);
  const comparison = compare(input, result, c.reference);
  checkImmutable();
  return { id: c.id, packetSha256: c.packetSha256, inputSha256: jsonHash(c.input), result, ...comparison };
});
const validAccuracy = accuracy.every((c: Private) => c.matches && c.physical);

const prototype: Private = World.prototype, originalFeet = prototype.feet;
const benchmark: Private[] = [];
const names: Record<Mode, string> = { midpoint: 'unchanged midpoint primitive', resolved: 'corrected resolved reference',
  kernel: 'diagnostic within-interval kernel' };
function worldOutput(c: ReturnType<typeof build>) {
  const a = c.particle(c.joint.a), b = c.particle(c.joint.b), input = c.input;
  // No row observers: moments follow from achieved motion for these free
  // bodies, with ground/contact work explicitly checked outside the clock.
  const impulse = { x: (b.vel.x - input.b.vel.x) * b.mass, y: (b.vel.y - input.b.vel.y) * b.mass };
  const moment = { x: (b.pos.x - input.b.pos.x - input.b.vel.x * input.duration) * b.mass,
    y: (b.pos.y - input.b.pos.y - input.b.vel.y * input.duration) * b.mass };
  const result = { a, b, material: { ...c.attachment.material }, footOffset: { ...c.attachment.foot.offset },
    point: { ...c.w.graspPoint(c.joint) }, impulse, moment,
    angularImpulse: [a, b].map((p, i) => (p.spin - (i ? input.b : input.a).spin) * p.inertia),
    angularMoment: [a, b].map((p, i) => (p.facing - (i ? input.b : input.a).facing
      - (i ? input.b : input.a).spin * input.duration) * p.inertia),
    bodyWork: c.p.args[5].work.grasps - c.before.work, motorWork: c.p.args[5].supportMotorWork[c.b] - c.before.motor,
    passiveWork: c.p.args[5].passiveGraspWork - c.before.passive, dose: (c.joint.force ?? 0) - c.before.dose,
    hold: c.joint.hold, slipping: c.joint.slipping ?? false,
    broken: c.joint.broken ?? false, integration: c.p.args[5].gripTiming ?? null };
  const otherForces = { contactWork: c.p.args[5].work.contacts - c.before.contacts,
    groundImpulse: c.p.args[5].groundImpulse.map((v: Vec, i: number) => ({ x: v.x - c.before.ground[i].x,
      y: v.y - c.before.ground[i].y })) };
  if (otherForces.contactWork !== 0 || otherForces.groundImpulse.some((v: Vec) => Math.hypot(v.x, v.y) !== 0))
    throw Error('Benchmark left isolated-force scope');
  return result;
}
function sample(c: Private, mode: Mode) {
  const input = structuredClone(c.input);
  if (mode === 'kernel') {
    const start = performance.now(), result = supportedGripInterval(input), seconds = (performance.now() - start) / 1000;
    deepStrictEqual(input, c.input); checkImmutable();
    return { seconds, result, ...compare(input, result, c.reference) };
  }
  const prepared = build(c, mode);
  const start = performance.now();
  prepared.w.integrateSubstep(...prepared.p.args);
  const seconds = (performance.now() - start) / 1000;
  const result = worldOutput(prepared);
  checkImmutable();
  return { seconds, result, ...compare(input, result, c.reference) };
}
const percentile = (sorted: number[], q: number) => sorted[Math.max(0, Math.ceil(sorted.length * q) - 1)];
if (validAccuracy) try {
  // Prescribed force law, not an observer. Snapshot's removal of instance
  // functions cannot erase it: every scratch/live World inherits this hook.
  prototype.feet = function(i: number, ...args: any[]) {
    originalFeet.call(this, i, ...args);
    const joints = this.joints.filter((j: Private) => j.kind === 'grasp' && !j.broken);
    if (joints.length !== 1) throw Error('Prescribed motor expects one live grip');
    const j = joints[0];
    if (i === this.indexOf(j.b)) {
      const foot = j.b.support.foot, sp = supportParams(j.b.profile);
      if (!foot) throw Error('Prescribed motor lost its held foot');
      foot.mobility = sp.stepSpeed / sp.pushForce;
      foot.desired = { x: 0, y: 0 };
    }
  };
  for (const c of fixture.cases.filter((c: Private) => c.packetId === 'patch-45-8-0-3001-1')) {
    for (const mode of ['midpoint', 'resolved', 'kernel'] as const) {
      sample(c, mode); // warm once, outside measured samples
      const samples = Array.from({ length: 7 }, () => sample(c, mode));
      const endpoint = jsonHash(samples[0].result);
      if (samples.some(s => jsonHash(s.result) !== endpoint)) throw Error('Repeated identical input changed endpoint');
      const sorted = samples.map(s => s.seconds).sort((a, b) => a - b);
      benchmark.push({ id: c.id, mode, label: names[mode], warmups: 1, repetitions: 7,
        seconds: { median: percentile(sorted, .5), p95: percentile(sorted, .95), maximum: sorted[sorted.length - 1],
          samples: samples.map(s => s.seconds) },
        endpoint: samples[0].result, comparison: { errors: samples[0].errors, accounting: samples[0].accounting,
          matches: samples[0].matches, physical: samples[0].physical } });
      console.log(JSON.stringify({ id: c.id, mode, seconds: benchmark[benchmark.length - 1].seconds }));
    }
  }
} finally { prototype.feet = originalFeet; }

if (validAccuracy) {
  const c = fixture.cases.find((c: Private) => c.id === 'patch-45-8-0-3001-1-tangent-support');
  const reject = () => {
    const input: SupportedGripInput = { ...structuredClone(c.input), capacity: 1000 }, saved = structuredClone(input);
    let caught: unknown;
    const start = performance.now();
    try { supportedGripInterval(input); } catch (e) { caught = e; }
    const seconds = (performance.now() - start) / 1000;
    if (!(caught instanceof RangeError) || !caught.message.includes('scope/refinement bound exhausted'))
      throw Error('Named refusal no longer rejects the expected unsupported phase');
    deepStrictEqual(input, saved); checkImmutable();
    return { seconds, rejected: true, exception: caught.message };
  };
  reject();
  const samples = Array.from({ length: 7 }, () => reject()), sorted = samples.map(s => s.seconds).sort((a, b) => a - b);
  benchmark.push({ id: `${c.id}-capacity1000-refused`, mode: 'kernel', label: 'unsupported slip-phase refusal',
    transform: { capacity: 1000 }, warmups: 1, repetitions: 7, rejected: true,
    seconds: { median: percentile(sorted, .5), p95: percentile(sorted, .95), maximum: sorted[sorted.length - 1],
      samples: samples.map(s => s.seconds) }, exception: samples[0].exception,
    boundedFallbackOpportunity: { maximumKernelPartitions: 1024, producesNoLiveState: true,
      fallbackImplemented: false, nextAction: 'Caller can retain the unchanged World path after refusal; this prototype has no World insertion.' } });
  console.log(JSON.stringify({ id: `${c.id}-capacity1000-refused`, seconds: benchmark[benchmark.length - 1].seconds, rejected: true }));
}

checkImmutable();
if (sourceVersion() !== source || sha(readFileSync(kernelPath)) !== kernelHash
  || sha(readFileSync(import.meta.filename)) !== collectorHash || sha(readFileSync(fixturePath)) !== sha(fixtureBytes))
  throw Error('Evidence source or input files changed during collection');
const retained = (path: string) => {
  const bytes = readFileSync(path), r = JSON.parse(bytes.toString());
  return { path, sha256: sha(bytes), source: r.source ?? r.sourceSha256, commit: r.commit,
    validationSha256: r.validationSha256, exitCode: r.exitCode,
    failures: r.failures, commands: r.commands, cases: r.cases?.map((c: Private) => ({ id: c.id, convergence: c.convergence })) };
};
const evidence = { source, commit, comparisonBaseline: fixture.baseline, referenceCommit: fixture.referenceCommit,
  flags, node: process.version, cpu: cpus()[0].model, collectorSha256: collectorHash, kernelSha256: kernelHash,
  fixtureSha256: sha(fixtureBytes), inputHashes: [...packets].map(([packetId, p]) => ({ packetId, sha256: p.checksum })),
  immutableInputs: true, prototypeRestored: prototype.feet === originalFeet,
  scope: fixture.scope, worldOptions: { ...declaredWorldOptions,
    legs: 1, pull: 0, desired: { x: 0, y: 0 }, duration: fixture.cases[0].input.duration,
    integrationCall: 'integrateSubstep(saved arguments, duration) directly; no new controller tick' },
  protocol: { serial: true, warmed: true, constructionAndRestoreOutsideClock: true, noObserversOrProfilers: true,
    noForcedGC: true, prototypeIntervention: 'Prescribe identical isotropic mobility and zero desired velocity after original feet(), on all live/scratch Worlds.',
    endpointDerivedMomentsForTimedWorlds: true, observedMaximumIsNotUniversalWorstCase: true },
  accuracy, benchmark, accuracyBlocker: !validAccuracy,
  retainedEvidence: { coarseReferenceFailure: retained(`${root}/result-4096-8192.json`),
    refinedReference: retained(`${root}/result-65536-131072.json`), initialDevelopmentTests: retained(`${root}/dev-tests.json`),
    correctedAccountingTests: retained(`${root}/accounting-tests.json`),
    initialTestFailure: { passed: 9, total: 11, failedCases: ['patch-45-8-0-3001-1-tangent-support', 'patch-45-8-0-3001--1-tangent-support'],
      workResidualApproximate: 2.45e-6, reason: 'Pose/reference agreement did not establish represented-energy closure.',
      correction: 'Require actual energy and angular residuals before accepting refinement, preserving previous tolerances.' },
    unrelatedPatchGate: { receipt: 'data/reviews/current/grip-fast.json', passed: 43, total: 52, failures: 9,
      interpretation: 'Preserved independently; zero timing invocation does not imply one common cause.' } },
  limitations: ['No World insertion or complete production solver.', 'One full lower grip and one passive prescribed support motor only.',
    'No active support, reel, brace, contact graph, ordinary ground reaction, support history or fatigue composition.',
    'Fixed slip phase and monotone point-distance branch; unsupported events fail closed.',
    'No full suite or football panel accompanies this bounded mechanical experiment.'] };
mkdirSync(root, { recursive: true });
writeFileSync(`${root}/evidence.json`, JSON.stringify(evidence, null, 2));
if (accuracy.some((c: Private) => !c.matches || !c.physical)) process.exitCode = 2;
