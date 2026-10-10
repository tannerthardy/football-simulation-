/** A small actual-World restart of the retained lower-attachment release.
 * node --import tsx scripts/diag/lower-attachment-review.ts [output.json] [--bounded-attachment]
 * Default-off experiment: the only private accesses restore an already acquired
 * attachment and observe when its ordinary geometry validation invalidates it.
 * The retained football trace lacks several optional filters/gait coordinates;
 * these are disclosed below. This is not an exact replay of the original play.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { Vec2 } from '../../src/core/vec.js';
import type { Body } from '../../src/physics/kinematics.js';
import { newSupport, supportParams } from '../../src/physics/support.js';
import { World, type GraspJoint, type Intent } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/lower-attachment-review/report.json';
const bounded = process.argv[3] === '--bounded-attachment';
if (process.argv.length > (bounded ? 4 : 3)) throw new Error('Usage: lower-attachment-review.ts [output.json] [--bounded-attachment]');
const traceFile = 'data/reviews/physics-world/approach-control/scope-witness-broad-candidate.json.gz';
const traceBytes = readFileSync(traceFile), trace = JSON.parse(gunzipSync(traceBytes).toString('utf8'));
const sourceBefore = sourceVersion(), scriptBefore = sha(readFileSync(import.meta.filename));
const dt = .05, holderIdx = 18, heldIdx = 6, maxTicks = 12;
const clone = <T>(value: T): T => structuredClone(value);
function sha(bytes: Buffer | string): string { return createHash('sha256').update(bytes).digest('hex'); }
function hash(value: unknown): string { return sha(JSON.stringify(value)); }
function length(v: Vec2): number { return Math.hypot(v.x, v.y); }

interface Input {
  start: number;
  side: -1 | 1;
  substeps: number;
  capacityScale: number;
  chart: 'recorded' | 'equivalent-rebase';
  filter: 'zero' | 'previous-acceleration';
  control?: 'empty-grip' | 'out-of-holder-reach';
}
const inputs: Input[] = [];
for (const start of [7.8, 7.85]) for (const side of [-1, 1] as const) for (const substeps of [12, 24, 48])
  for (const capacityScale of [.15, 1, 2]) inputs.push({ start, side, substeps, capacityScale, chart: 'recorded', filter: 'zero' });
// These are separate representation/missing-filter sensitivity checks, not
// extra independent football observations.
for (const side of [-1, 1] as const) for (const substeps of [12, 48]) {
  inputs.push({ start: 7.85, side, substeps, capacityScale: 1, chart: 'equivalent-rebase', filter: 'zero' });
  inputs.push({ start: 7.85, side, substeps, capacityScale: 1, chart: 'recorded', filter: 'previous-acceleration' });
}
for (const side of [-1, 1] as const) for (const control of ['empty-grip', 'out-of-holder-reach'] as const)
  inputs.push({ start: 7.85, side, substeps: 12, capacityScale: 1, chart: 'recorded', filter: 'zero', control });

function reflect(v: Vec2, side: number): Vec2 { return { x: v.x, y: side * v.y }; }
function restoreBody(idx: number, sample: any, input: Input): Body {
  const recorded = sample.before.find((b: any) => b.idx === idx);
  const origin = sample.before.find((b: any) => b.idx === heldIdx).pos;
  const support = newSupport(recorded.support.posture);
  Object.assign(support, clone(recorded.support), { state: recorded.state,
    since: recorded.state === 'down' ? input.start - .2 : -Infinity,
    cause: recorded.cause, feetVel: { x: 0, y: 0 }, fall: { x: 0, y: 0 } });
  if (!support.foot) delete support.foot;
  for (const name of ['xi', 'lean', 'load', 'felt'] as const) support[name] = reflect(support[name], input.side);
  if (support.foot) {
    for (const name of ['offset', 'desired', 'achieved', 'force'] as const) support.foot[name] = reflect(support.foot[name], input.side);
    for (const name of ['anchor', 'target'] as const) support.foot[name] = reflect({ x: support.foot[name].x - origin.x,
      y: support.foot[name].y - origin.y }, input.side);
  }
  if (input.filter === 'previous-acceleration') {
    const previous = trace.samples.find((s: any) => Math.abs(s.t - (input.start - dt)) < 1e-8);
    const old = previous.before.find((b: any) => b.idx === idx);
    support.accel = reflect({ x: (recorded.vel.x - old.vel.x) / dt, y: (recorded.vel.y - old.vel.y) / dt }, input.side);
  }
  return { pos: reflect({ x: recorded.pos.x - origin.x, y: recorded.pos.y - origin.y }, input.side),
    vel: reflect(recorded.vel, input.side), facing: input.side * recorded.facing,
    energy: recorded.energy, profile: clone(trace.players.find((p: any) => p.idx === idx).profile), spin: 0, support };
}

function make(input: Input) {
  const sample = trace.samples.find((s: any) => Math.abs(s.t - input.start) < 1e-8);
  const holder = restoreBody(holderIdx, sample, input), held = restoreBody(heldIdx, sample, input);
  const savedSupport = clone(held.support);
  // Constructor intentionally rejects inherited foot state; install the
  // reduced foot and acquired attachment only after making the normal World.
  const world = new World([holder, held], { substeps: input.substeps, boundedAttachment: bounded });
  held.support = savedSupport;
  const old = sample.beforeJoints.find((j: any) => j.kind === 'grasp' && j.a === holderIdx && j.b === heldIdx);
  const joint: GraspJoint = { kind: 'grasp', a: holder, b: held, reach: old.reach, capacity: old.capacity * input.capacityScale,
    legs: old.legs, pull: old.pull, hold: old.hold, origin: old.origin, slipping: old.slipping, force: old.force };
  if (old.ground !== undefined) joint.ground = old.ground;
  if (old.height !== undefined) joint.height = old.height;
  const origin = sample.before.find((b: any) => b.idx === heldIdx).pos;
  const point = reflect({ x: old.actualPoint.x - origin.x, y: old.actualPoint.y - origin.y }, input.side);
  const foot = held.support!.foot!;
  const reference = { x: point.x - held.pos.x - joint.legs * foot.offset.x,
    y: point.y - held.pos.y - joint.legs * foot.offset.y };
  if (input.chart === 'equivalent-rebase') {
    reference.x += joint.legs * foot.offset.x; reference.y += joint.legs * foot.offset.y;
    foot.target.x -= foot.offset.x; foot.target.y -= foot.offset.y;
    foot.offset = { x: 0, y: 0 }; foot.anchor = { ...held.pos };
  }
  if (input.control === 'empty-grip') joint.capacity = 0;
  if (input.control === 'out-of-holder-reach') holder.pos.x -= 4;
  world.joints = [joint]; world.time = input.start;
  (world as any).heldBodies.add(held);
  (world as any).attachments.set(joint, { share: joint.legs, reference, foot });
  return { world, holder, held, joint };
}

function trial(input: Input, observe: boolean) {
  const { world, holder, held, joint } = make(input), internals = world as any;
  const transitions: any[] = [], ticks: any[] = [];
  let firstBroken: any = null, maxMomentumResidual = 0, maxWorkResidual = 0, maxMotorWorkExcess = 0;
  let lastCompletedTickForce = joint.force ?? 0;
  const state = () => {
    const point = internals.graspPoint(joint), foot = held.support!.foot;
    return { t: world.time, broken: !!joint.broken, slipping: !!joint.slipping,
      point: clone(point), holderDistance: length({ x: point.x - holder.pos.x, y: point.y - holder.pos.y }),
      bodyDistance: length({ x: point.x - held.pos.x, y: point.y - held.pos.y }),
      bodyReach: supportParams(held.profile).comHeight, capacity: internals.gripCapacity(joint), lastCompletedTickForce,
      // World stores accumulated impulse during its solve, then divides by
      // dt at tick completion. Do not interpret this in-flight field as force.
      jointForceField: joint.force ?? 0,
      hold: joint.hold ?? null, holderState: holder.support!.state, heldState: held.support!.state,
      foot: foot ? clone(foot) : null, reference: clone(internals.attachments.get(joint)?.reference ?? null) };
  };
  const sync = internals.syncHeldSupport;
  if (observe) internals.syncHeldSupport = function () {
    const oldMapped = internals.attachments.get(joint)?.bounded;
    const before = state(); sync.call(this); const after = state();
    if (oldMapped === undefined && internals.attachments.get(joint)?.bounded === true) {
      const drift = Math.hypot(after.point.x - before.point.x, after.point.y - before.point.y);
      if (drift > 1e-10) throw new Error(`Attachment conversion moved acquired point by ${drift} yd`);
      transitions.push({ method: 'bounded-map-initialization', pointDriftYd: drift, before, after });
    }
    if (before.broken !== after.broken || (before.foot && after.foot && length(before.foot.offset) > .5 && length(after.foot.offset) < .1))
      transitions.push({ method: 'syncHeldSupport', before, after });
  };
  const p = () => ({ x: holder.profile.massKg * holder.vel.x + held.profile.massKg * held.vel.x,
    y: holder.profile.massKg * holder.vel.y + held.profile.massKg * held.vel.y });
  const initial = observe ? { holder: clone(holder), held: clone(held), attachment: state() } : null;
  for (let k = 0; k < maxTicks; k++) {
    const sample = trace.samples.find((s: any) => Math.abs(s.t - (input.start + k * dt)) < 1e-8);
    if (!sample) break;
    const command = (idx: number): Intent => {
      const intent = clone(sample.intents[idx]); intent.vel = reflect(intent.vel, input.side);
      if (intent.facing !== undefined) intent.facing *= input.side;
      for (const name of ['lunge', 'dive'] as const) if (intent[name]) intent[name] = reflect(intent[name], input.side);
      return intent;
    };
    const before = observe ? state() : null, p0 = p();
    const report = world.step([command(holderIdx), command(heldIdx)], dt), p1 = p();
    lastCompletedTickForce = joint.force ?? 0;
    const gx = report.groundImpulse.reduce((s, v) => s + v.x, 0), gy = report.groundImpulse.reduce((s, v) => s + v.y, 0);
    maxMomentumResidual = Math.max(maxMomentumResidual, Math.hypot(p1.x - p0.x - gx, p1.y - p0.y - gy));
    maxWorkResidual = Math.max(maxWorkResidual, Math.abs(report.work.residual));
    maxMotorWorkExcess = Math.max(maxMotorWorkExcess, ...report.supportMotorWork.map((w, i) => w - report.supportMotorWorkLimit[i]));
    if (joint.broken && firstBroken === null) firstBroken = { tickStart: input.start + k * dt, tickEnd: world.time,
      lowerHoldReleases: report.lowerHoldReleases, slipping: !!joint.slipping,
      classifiedCause: report.lowerHoldReleases > 0 ? 'lower-body-attachment-bound' : input.control === 'empty-grip' ? 'empty-capacity' : 'holder-reach-or-ordinary-slip' };
    if (observe) ticks.push({ before, after: state(), holder: clone(holder), held: clone(held), report });
  }
  return { input, inputPin: hash(input), initial, firstBroken, transitions, ticks,
    final: { holder: clone(holder), held: clone(held), joint: { broken: !!joint.broken, slipping: !!joint.slipping, hold: joint.hold, legs: joint.legs } },
    contract: { maxMomentumResidual, maxWorkResidual, maxMotorWorkExcess },
    signature: hash({ holder, held, broken: joint.broken, slipping: joint.slipping, hold: joint.hold, legs: joint.legs }) };
}

const rows = inputs.map(input => trial(input, true));
const observedChecks = [0, 3, 36, 44].filter(i => i < rows.length).map(index => {
  const unobserved = trial(inputs[index], false);
  if (rows[index].signature !== unobserved.signature) throw new Error(`Observer changed row ${index}`);
  return { index, observed: rows[index].signature, unobserved: unobserved.signature, unchanged: true };
});
const sourceAfter = sourceVersion(), scriptAfter = sha(readFileSync(import.meta.filename));
if (sourceBefore !== sourceAfter || scriptBefore !== scriptAfter) throw new Error('Source or diagnostic changed while running');
const mirrorPairs = rows.filter(row => row.input.side === 1).map(right => {
  const left = rows.find(row => hash({ ...row.input, side: 1 }) === hash(right.input) && row.input.side === -1)!;
  const error = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y + b.y);
  return { rightInput: right.inputPin, leftInput: left.inputPin,
    sameBreak: hash(right.firstBroken) === hash(left.firstBroken),
    holderPositionError: error(right.final.holder.pos, left.final.holder.pos),
    heldPositionError: error(right.final.held.pos, left.final.held.pos),
    holderVelocityError: error(right.final.holder.vel, left.final.holder.vel),
    heldVelocityError: error(right.final.held.vel, left.final.held.vel) };
});
const report = { sourceBefore, sourceAfter, scriptBefore, scriptAfter, boundedAttachment: bounded, trace: { file: traceFile, compressedSha256: sha(traceBytes),
  id: trace.id, source: trace.sourceBefore, result: { outcome: trace.result.outcome, yards: trace.result.offenseYards },
  exactOriginalReplay: false, missingState: ['spin', 'squeeze', 'sprintLoad', 'support.since', 'support.feetVel', 'support.fall',
    'support.accel', 'support.tipAccel', 'support.feltTip', 'support.yaw', 'support.strike', 'support.causes'],
  reconstruction: 'Two isolated bodies; recorded positions, velocities, profiles, facing, energy, reduced support and acquired attachment restored. Omitted yaw/gait/filter fields use defaults; previous-acceleration sensitivity is separate. Replayed recorded commands are exogenous inputs, not rerun football choices.' },
  primaryCount: 36, representationAndFilterSensitivityCount: 8, negativeControlCount: 4,
  profilesPin: hash(trace.players.filter((p: any) => [holderIdx, heldIdx].includes(p.idx)).map((p: any) => p.profile)),
  inputsPin: hash(inputs), observedChecks, mirrorPairs,
  summary: { primaryLowerBoundReleases: rows.slice(0, 36).filter(row => row.firstBroken?.classifiedCause === 'lower-body-attachment-bound').length,
    sensitivityLowerBoundReleases: rows.slice(36, 44).filter(row => row.firstBroken?.classifiedCause === 'lower-body-attachment-bound').length,
    negativeControlsWithLowerBoundRelease: rows.slice(44).filter(row => row.firstBroken?.classifiedCause === 'lower-body-attachment-bound').length,
    allMirrorsPreserveBreak: mirrorPairs.every(pair => pair.sameBreak),
    maximumMirrorPositionError: Math.max(...mirrorPairs.flatMap(pair => [pair.holderPositionError, pair.heldPositionError])),
    maximumMomentumResidual: Math.max(...rows.map(row => row.contract.maxMomentumResidual)),
    maximumWorkResidual: Math.max(...rows.map(row => row.contract.maxWorkResidual)),
    maximumMotorWorkExcess: Math.max(...rows.map(row => row.contract.maxMotorWorkExcess)) }, rows };
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(report) + '\n');
console.log(JSON.stringify({ output, sourceBefore, scriptBefore, rows: rows.length,
  causes: rows.reduce((all: Record<string, number>, row) => { const key = row.firstBroken?.classifiedCause ?? 'holds'; all[key] = (all[key] ?? 0) + 1; return all; }, {}),
  observerChecks: observedChecks.length }));
