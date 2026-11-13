/** Matched moving recovery controls and force/effort observations in World.
 * node --import tsx scripts/diag/recovery-allocation.ts [output.json]
 * Run unchanged in separate source snapshots. No football outcome fitting.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { angleDiff, type Vec2 } from '../../src/core/vec.js';
import type { Body } from '../../src/physics/kinematics.js';
import { baseRadiusAt, newSupport, supportParams } from '../../src/physics/support.js';
import { recoveryRamp } from '../../src/physics/virtual-foot.js';
import { World, type GraspJoint, type Intent, type StepReport } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/recovery-allocation/moving.json';
const sourceBefore = sourceVersion();
const scriptSha256 = createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
const baseProfile = { massKg: 100, radius: .28, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
  shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
  power: 100, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
const profiles = [{ id: 'standard', profile: baseProfile, energy: 1 },
  { id: 'heavier-fatigued', profile: { ...baseProfile, massKg: 125, radius: .32,
    power: 120, stepSpeed: 3.1, balance: .65 }, energy: .72 }];
type ProfileCase = typeof profiles[number];
type Control = 'straight' | 'turn' | 'brake';
interface Case { profile: string; initialSpeed: number; mirror: number; control: Control;
  gripCapacity: number | null; substeps: number }
const dt = .05, ticks = 8, initialDeviation = { x: .45, y: .08 }, outsideFor = .12;
const mag = (p: Vec2) => Math.hypot(p.x, p.y);
const momentum = (bodies: Body[]) => bodies.reduce((p, b) => ({
  x: p.x + b.profile.massKg * b.vel.x, y: p.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
function snapshot(b: Body) {
  const s = b.support!;
  return { pos: { ...b.pos }, vel: { ...b.vel }, facing: b.facing, spin: b.spin ?? 0,
    xi: { ...s.xi }, supportState: s.state, energy: b.energy,
    foot: s.foot ? { offset: { ...s.foot.offset }, desired: { ...s.foot.desired },
      achieved: { ...s.foot.achieved }, force: { ...s.foot.force }, capacity: s.foot.capacity,
      mobility: s.foot.mobility, state: s.foot.state } : null };
}
interface Allocation {
  samples: number; maxCommandFraction: number; maxStrengthFraction: number;
  maxTractionFraction: number; maxStrengthExcess: number; maxTractionExcess: number;
  maxMotorCapacity: number; maxMotorCommand: number; maxExternalMotorForce: number;
  heldCommandSamples: number; analyticCommandSamples: number; unknownUnheldCommandSamples: number;
  maxExistingDriveStrengthExcess: number;
}
const newAllocation = (): Allocation => ({ samples: 0, maxCommandFraction: 0,
  maxStrengthFraction: 0, maxTractionFraction: 0, maxStrengthExcess: 0,
  maxTractionExcess: 0, maxMotorCapacity: 0, maxMotorCommand: 0, maxExternalMotorForce: 0,
  heldCommandSamples: 0, analyticCommandSamples: 0, unknownUnheldCommandSamples: 0,
  maxExistingDriveStrengthExcess: 0 });
interface FeetPlan { ax: number; ay: number; free: boolean; dive: Vec2 | null }
interface DebugWorld {
  feet(this: World, i: number, intent: Intent, plan: FeetPlan, h: number,
    remaining: number, report: StepReport): void;
  amx: Float64Array; amy: Float64Array; recovery?: Float64Array;
}
const proto = World.prototype as unknown as DebugWorld, originalFeet = proto.feet;
let observedWorld: World | undefined, allocation: Allocation | undefined;
// Read-only observation at the actual ground-force phase, before contacts.
// End-of-tick force samples cannot certify substep allocation maxima.
proto.feet = function (i, intent, plan, h, remaining, report) {
  const b = this.bodies[i];
  const spinBefore = b.spin ?? 0, uprightBefore = b.support!.state === 'up';
  originalFeet.call(this, i, intent, plan, h, remaining, report);
  if (this !== observedWorld || !allocation || i !== 1 || !uprightBefore
    || b.support!.state !== 'up' || plan.free || plan.dive) return;
  const debug = this as unknown as DebugWorld, sp = supportParams(b.profile), sup = b.support!;
  const g = Math.hypot(debug.amx[i], debug.amy[i]) * b.profile.massKg, foot = sup.foot;
  const yawForce = sp.yawInertia * ((b.spin ?? 0) - spinBefore) / (h * baseRadiusAt(sp, sup.posture));
  allocation.samples++;
  allocation.maxExistingDriveStrengthExcess = Math.max(allocation.maxExistingDriveStrengthExcess, g - sp.pushForce);
  let command: number, capacity: number;
  if (foot) {
    command = foot.mobility > 0 ? mag(foot.desired) / foot.mobility : 0;
    capacity = foot.capacity;
    allocation.heldCommandSamples++;
  } else if (debug.recovery) {
    // New production exposes its allocated analytic recovery speed. Infer
    // the same nominal command; no external foot force is invented here.
    const e = mag(sup.xi), rb = baseRadiusAt(sp, sup.posture);
    const requested = e > rb ? Math.min(debug.recovery[i] * recoveryRamp(sup.out, .12, h), (e - rb) / h) : 0;
    const mobility = sp.pushForce > 0 ? sp.stepSpeed / sp.pushForce : 0;
    command = mobility > 0 ? requested / mobility : 0;
    const groundDemand = Math.hypot(g, yawForce);
    capacity = Math.sqrt(Math.max(0, Math.min((sp.pushForce - g) * (sp.pushForce + g),
      (sp.traction - groundDemand) * (sp.traction + groundDemand))));
    allocation.analyticCommandSamples++;
  } else {
    // Older production has implicit analytic recovery with no allocated
    // command state. Its missing common budget observation remains unknown.
    allocation.unknownUnheldCommandSamples++;
    return;
  }
  const strengthUsed = Math.hypot(g, command), tractionUsed = Math.hypot(g, command, yawForce);
  allocation.maxCommandFraction = Math.max(allocation.maxCommandFraction,
    capacity > 0 ? command / capacity : 0);
  allocation.maxStrengthFraction = Math.max(allocation.maxStrengthFraction,
    sp.pushForce > 0 ? strengthUsed / sp.pushForce : 0);
  allocation.maxTractionFraction = Math.max(allocation.maxTractionFraction, tractionUsed / sp.traction);
  // Existing free movement may exceed pushForce; correction must then add
  // zero effort, rather than manufacture a larger strength allowance.
  allocation.maxStrengthExcess = Math.max(allocation.maxStrengthExcess, strengthUsed - Math.max(sp.pushForce, g));
  allocation.maxTractionExcess = Math.max(allocation.maxTractionExcess, tractionUsed - sp.traction);
  allocation.maxMotorCapacity = Math.max(allocation.maxMotorCapacity, capacity);
  allocation.maxMotorCommand = Math.max(allocation.maxMotorCommand, command);
};

function run(c: Case, observe = true) {
  const profileCase = profiles.find(p => p.id === c.profile)!;
  const make = (x: number): Body => ({ pos: { x, y: 0 }, vel: { x: c.initialSpeed, y: 0 },
    facing: 0, energy: profileCase.energy, profile: { ...profileCase.profile }, support: newSupport() });
  const holder = make(0), runner = make(1), bodies = [holder, runner];
  runner.support!.xi = { x: initialDeviation.x, y: initialDeviation.y * c.mirror };
  runner.support!.out = outsideFor;
  const world = new World(bodies, { substeps: c.substeps });
  // Identical zero-force island row in every case, including no hold.
  world.joints.push({ kind: 'hands', a: holder, b: runner, extension: 3, push: 0, hold: 0, steer: 0 });
  const grip: GraspJoint | null = c.gripCapacity === null ? null : { kind: 'grasp', a: holder,
    b: runner, capacity: c.gripCapacity, reach: 10, hold: 1, legs: 1, pull: 0 };
  if (grip) world.joints.push(grip);
  const command: Intent = c.control === 'brake' ? { vel: { x: 0, y: 0 }, posture: .2 }
    : { vel: { x: 7, y: c.control === 'turn' ? c.mirror : 0 }, posture: .2,
      ...(c.control === 'turn' ? { facing: .5 * c.mirror } : {}) };
  const intents: Intent[] = [command, command];
  const observed = newAllocation();
  observedWorld = observe ? world : undefined; allocation = observe ? observed : undefined;
  let maxMomentumResidual = 0, maxWorkResidual = 0, maxArmImpulseExcess = 0, maxArmWorkExcess = 0;
  let maxMotorWorkExcess = 0, maxPassiveGripPositiveWork = 0, gripImpulse = 0, motorWork = 0;
  let groundWork = 0, groundYawWork = 0, bodyGripWork = 0, lowerReleases = 0;
  const groundImpulse = { x: 0, y: 0 }; let yawImpulse = 0;
  const fallBodies = new Set<number>(), trajectory = [];
  for (let k = 0; k < ticks; k++) {
    const before = momentum(bodies), report = world.step(intents, dt), after = momentum(bodies);
    const external = report.groundImpulse.reduce((p, q) => ({ x: p.x + q.x, y: p.y + q.y }), { x: 0, y: 0 });
    maxMomentumResidual = Math.max(maxMomentumResidual,
      Math.hypot(after.x - before.x - external.x, after.y - before.y - external.y));
    maxWorkResidual = Math.max(maxWorkResidual, Math.abs(report.work.residual));
    maxPassiveGripPositiveWork = Math.max(maxPassiveGripPositiveWork, report.passiveGraspWork);
    for (let i = 0; i < bodies.length; i++) {
      maxArmImpulseExcess = Math.max(maxArmImpulseExcess, report.armImpulse[i] - report.armImpulseLimit[i]);
      maxArmWorkExcess = Math.max(maxArmWorkExcess, report.armWork[i] - report.armWorkLimit[i]);
      maxMotorWorkExcess = Math.max(maxMotorWorkExcess, report.supportMotorWork[i] - report.supportMotorWorkLimit[i]);
    }
    for (const i of report.falls) fallBodies.add(i);
    const used = (grip?.force ?? 0) * dt;
    gripImpulse += used; motorWork += report.supportMotorWork[1];
    groundWork += report.groundWork[1]; groundYawWork += report.groundYawWork[1]; bodyGripWork += report.work.grasps;
    lowerReleases += report.lowerHoldReleases;
    groundImpulse.x += report.groundImpulse[1].x; groundImpulse.y += report.groundImpulse[1].y;
    yawImpulse += report.groundYawImpulse[1];
    observed.maxExternalMotorForce = Math.max(observed.maxExternalMotorForce, mag(runner.support!.foot?.force ?? { x: 0, y: 0 }));
    trajectory.push({ t: world.time, holder: snapshot(holder), runner: snapshot(runner),
      runnerGroundImpulse: { ...report.groundImpulse[1] }, runnerYawImpulse: report.groundYawImpulse[1],
      gripImpulse: used, gripBroken: grip?.broken ?? false, motorWork: report.supportMotorWork[1],
      motorWorkLimit: report.supportMotorWorkLimit[1] });
  }
  observedWorld = undefined; allocation = undefined;
  return { ...c, physical: { firstTick: trajectory[0], final: trajectory.at(-1)!, trajectory,
    totals: { gripImpulse, groundImpulse, yawImpulse, motorWork, groundWork, groundYawWork, bodyGripWork, lowerReleases },
    fallBodies: [...fallBodies], residuals: { maxMomentumResidual, maxWorkResidual, maxArmImpulseExcess,
      maxArmWorkExcess, maxMotorWorkExcess, maxPassiveGripPositiveWork } }, allocation: observe ? observed : null };
}
type Row = ReturnType<typeof run>;
const rows: Row[] = [], observerEquivalence: Array<{ case: Case; identical: boolean }> = [];
try {
  for (const p of profiles) for (const initialSpeed of [0, 3, 7]) for (const mirror of [1, -1])
    for (const control of ['straight', 'turn', 'brake'] as const)
      for (const gripCapacity of [null, 0, 1e-6, 1, 50, 900]) for (const substeps of [12, 48])
        rows.push(run({ profile: p.id, initialSpeed, mirror, control, gripCapacity, substeps }));
  for (const control of ['straight', 'turn', 'brake'] as const) for (const gripCapacity of [1e-6, 900]) {
    const c: Case = { profile: 'standard', initialSpeed: 3, mirror: 1, control, gripCapacity, substeps: 12 };
    const observed = run(c), unobserved = run(c, false);
    observerEquivalence.push({ case: c, identical: JSON.stringify(observed.physical) === JSON.stringify(unobserved.physical) });
  }
} finally { proto.feet = originalFeet; observedWorld = undefined; allocation = undefined; }

function numericDifference(a: Row, b: Row, mirrored = false) {
  let position = 0, velocity = 0, support = 0, facing = 0, spin = 0;
  for (let k = 0; k < a.physical.trajectory.length; k++) for (const player of ['holder', 'runner'] as const) {
    const x = a.physical.trajectory[k][player], y = b.physical.trajectory[k][player], sign = mirrored ? -1 : 1;
    position = Math.max(position, Math.hypot(x.pos.x - y.pos.x, x.pos.y - sign * y.pos.y));
    velocity = Math.max(velocity, Math.hypot(x.vel.x - y.vel.x, x.vel.y - sign * y.vel.y));
    support = Math.max(support, Math.hypot(x.xi.x - y.xi.x, x.xi.y - sign * y.xi.y));
    facing = Math.max(facing, Math.abs(angleDiff(x.facing, sign * y.facing)));
    spin = Math.max(spin, Math.abs(x.spin - sign * y.spin));
  }
  return { maxPositionYd: position, maxVelocityYdS: velocity, maxSupportYd: support,
    maxFacingRad: facing, maxSpinRadS: spin,
    fallDisagreement: JSON.stringify(a.physical.fallBodies) !== JSON.stringify(b.physical.fallBodies) };
}
const same = (a: Case, b: Case, except: keyof Case) =>
  (['profile', 'initialSpeed', 'mirror', 'control', 'gripCapacity', 'substeps'] as const)
    .every(key => key === except || a[key] === b[key]);
function summarizeDifferences(items: ReturnType<typeof numericDifference>[]) {
  return { pairs: items.length, fallDisagreements: items.filter(x => x.fallDisagreement).length,
    maxPositionYd: Math.max(...items.map(x => x.maxPositionYd)), maxVelocityYdS: Math.max(...items.map(x => x.maxVelocityYdS)),
    maxSupportYd: Math.max(...items.map(x => x.maxSupportYd)), maxFacingRad: Math.max(...items.map(x => x.maxFacingRad)),
    maxSpinRadS: Math.max(...items.map(x => x.maxSpinRadS)) };
}
const continuity = [0, 1e-6].map(capacity => ({ capacity,
  ...summarizeDifferences(rows.filter(r => r.gripCapacity === capacity)
    .map(r => numericDifference(r, rows.find(c => c.gripCapacity === null && same(c, r, 'gripCapacity'))!))) }));
const mirrors = summarizeDifferences(rows.filter(r => r.mirror === 1)
  .map(r => numericDifference(r, rows.find(c => c.mirror === -1 && same(c, r, 'mirror'))!, true)));
const refinement = summarizeDifferences(rows.filter(r => r.substeps === 12)
  .map(r => numericDifference(r, rows.find(c => c.substeps === 48 && same(c, r, 'substeps'))!)));
const progressiveSample = rows.filter(r => r.profile === 'standard' && r.initialSpeed === 3 && r.mirror === 1
  && r.control === 'straight' && r.substeps === 12).map(r => ({ capacity: r.gripCapacity,
    gripImpulse: r.physical.totals.gripImpulse, finalRunner: r.physical.final.runner,
    falls: r.physical.fallBodies, firstGroundImpulse: r.physical.firstTick.runnerGroundImpulse,
    firstYawImpulse: r.physical.firstTick.runnerYawImpulse }));
const maximum = (f: (r: Row) => number) => Math.max(...rows.map(f));
const validation = { maxMomentumResidual: maximum(r => r.physical.residuals.maxMomentumResidual),
  maxWorkResidual: maximum(r => r.physical.residuals.maxWorkResidual),
  maxArmImpulseExcess: maximum(r => r.physical.residuals.maxArmImpulseExcess),
  maxArmWorkExcess: maximum(r => r.physical.residuals.maxArmWorkExcess),
  maxMotorWorkExcess: maximum(r => r.physical.residuals.maxMotorWorkExcess),
  maxPassiveGripPositiveWork: maximum(r => r.physical.residuals.maxPassiveGripPositiveWork),
  maxStrengthExcess: maximum(r => r.allocation!.maxStrengthExcess),
  maxTractionExcess: maximum(r => r.allocation!.maxTractionExcess),
  maxCommandFraction: maximum(r => r.allocation!.maxCommandFraction),
  maxStrengthFraction: maximum(r => r.allocation!.maxStrengthFraction),
  maxTractionFraction: maximum(r => r.allocation!.maxTractionFraction),
  maxExistingDriveStrengthExcess: maximum(r => r.allocation!.maxExistingDriveStrengthExcess),
  heldCommandSamples: rows.reduce((n, r) => n + r.allocation!.heldCommandSamples, 0),
  analyticCommandSamples: rows.reduce((n, r) => n + r.allocation!.analyticCommandSamples, 0),
  unknownUnheldCommandSamples: rows.reduce((n, r) => n + r.allocation!.unknownUnheldCommandSamples, 0),
  observerEquivalence };
function ensureFinite(value: unknown, path = 'report'): void {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Nonfinite ${path}: ${value}`);
  if (Array.isArray(value)) value.forEach((v, i) => ensureFinite(v, `${path}[${i}]`));
  else if (value && typeof value === 'object') for (const [key, v] of Object.entries(value)) ensureFinite(v, `${path}.${key}`);
}
const sourceAfter = sourceVersion();
if (sourceBefore !== sourceAfter) throw new Error('Source changed during probe; refusing unpinned evidence');
if (observerEquivalence.some(c => !c.identical)) throw new Error('Allocation observer changed physical results');
const result = { schema: 'recovery-allocation-v1', sourceBefore, sourceAfter, scriptSha256,
  node: process.version, executable: process.execPath, command: [process.execPath, '--import', 'tsx',
    'scripts/diag/recovery-allocation.ts', output],
  cohort: { rows: rows.length, profiles, initialSpeeds: [0, 3, 7], mirrors: [1, -1],
    controls: ['straight', 'turn', 'brake'], capacities: [null, 0, 1e-6, 1, 50, 900], substeps: [12, 48],
    dt, ticks, initialDeviation, outsideFor, hold: { legs: 1, pull: 0, reach: 10, initialLength: 1 },
    neutralIsland: 'Identical zero-force hand row in every trial; COMs not clamped.' },
  continuity, mirrors, refinement, progressiveSample, validation, rows,
  limitations: ['Controlled persistent recovery under fixed commands, not tackle technique, game outcome or NFL calibration.',
    'Finite lower-attachment validity remains active; a hold may release or a body may fall naturally.',
    'Allocation is observed after actual ground actuation, before contact impulses; external motor-force peaks are tick-end samples.',
    'Profile strength bounds drive+correction; existing drive above that strength must receive zero correction. Existing drive excess is reported separately.',
    'Held commands are observed from motor state; analytic commands are inferred from actual allocated recovery scratch and its nominal ramp, not from an invented external foot force. Older missing analytic allocation remains unknown.',
    'Analytic ramp latency .12s matches the pinned production source. The observer is an allocation diagnostic, not an independent constitutive model.',
    'Motor command reserve and actual passive grip load are different quantities. Passive support force may exceed active capacity.',
    'Refinement is native12 versus48 substeps, not empirical truth; progressive samples do not assert monotonic game outcomes.'] };
ensureFinite(result);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceBefore, sourceAfter, scriptSha256, rows: rows.length,
  continuity, mirrors, refinement, validation }, null, 2));
