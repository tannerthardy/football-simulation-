/** Independent COM force/travel oracle with real bounded lower support.
 * node --import tsx scripts/diag/lower-reel-oracle.ts [output.json]
 * A single ordinary standing-controller tick from rest has zero ground drive.
 * Weak full-leg grip capacities keep active reeling at a constant force while
 * the production support motor and bounded attachment evolve normally.
 * No foot position, mobility, force, grip slip or support state is overridden.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Body } from '../../src/physics/kinematics.js';
import { World, type GraspJoint, type Intent } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

if (process.argv.length > 3) throw new Error('Usage: lower-reel-oracle.ts [output.json]');
const output = process.argv[2] ?? 'out/grasp-reel/lower-oracle.json';
const dt = .05, initialGap = 1.2;
const stand: Intent = { vel: { x: 0, y: 0 } };
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const toolPaths = ['scripts/diag/lower-reel-oracle.ts', 'scripts/source-version.ts'];
const toolHashes = Object.fromEntries(toolPaths.map(path => [path, fileHash(path)]));
const sourceBefore = sourceVersion(), worldBefore = fileHash('src/physics/world.ts');

function body(mass: number, x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1,
    profile: { massKg: mass, radius: .3, reach: 1, heightYd: 2.05,
      vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
      shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
      power: mass, balance: .5, stepSpeed: 3.4, getUp: .9 } };
}
interface Input { substeps: number; angle: number; capacity: number; active: boolean }
function trial(input: Input, observe: boolean) {
  const rotate = (x: number, y = 0) => ({
    x: x * Math.cos(input.angle) - y * Math.sin(input.angle),
    y: x * Math.sin(input.angle) + y * Math.cos(input.angle),
  });
  const a = body(100, 0), b = body(80, initialGap), bs = [a, b];
  for (const q of bs) { q.pos = rotate(q.pos.x); q.facing = input.angle; }
  const initial = structuredClone(bs);
  const world = new World(bs, { substeps: input.substeps });
  const grasp: GraspJoint = { kind: 'grasp', a, b, reach: 1.4, capacity: input.capacity,
    legs: 1, pull: input.active ? 3 : 0 };
  world.joints.push(grasp);
  const loads: Array<{ h: number; deliveredImpulse: { x: number; y: number }; fraction: number;
    footMobility: number; footOffset: { x: number; y: number } }> = [];
  // Observe the achieved finite impulses, without changing solver inputs or
  // inferring constant force from a tick-average report. An unobserved repeat
  // below verifies that the observer preserves the entire physical payload.
  type SupportApply = (jt: GraspJoint, x: number, y: number, h: number, active?: boolean,
    channel?: { net: number }) => number;
  const observable = world as unknown as { supportImpulse: SupportApply };
  const original = observable.supportImpulse;
  if (observe) observable.supportImpulse = function(jt, x, y, h, active, channel) {
    const fraction = original.call(world, jt, x, y, h, active, channel);
    if (active) loads.push({ h, deliveredImpulse: { x: x * fraction, y: y * fraction }, fraction,
      footMobility: jt.b.support!.foot!.mobility, footOffset: { ...jt.b.support!.foot!.offset } });
    return fraction;
  };
  const report = world.step([stand, stand], dt);
  observable.supportImpulse = original;
  if (report.contacts.length || report.falls.length || report.downs.length || report.rises.length || grasp.broken)
    throw new Error('Oracle left its upright contact-free domain');
  if (report.groundImpulse.some(p => Math.hypot(p.x, p.y) > 1e-10)
    || report.groundYawImpulse.some(j => Math.abs(j) > 1e-10)) throw new Error('Oracle has ground/yaw force');
  const foot = b.support!.foot!;
  if (!foot || !(foot.mobility > 0) || grasp.legs !== 1 || world.boundedAttachment !== true)
    throw new Error('Oracle did not use actual bounded lower support');
  if (Math.hypot(foot.desired.x, foot.desired.y) > 1e-10)
    throw new Error('Oracle left the initially supported no-recovery domain');
  const force = input.active ? input.capacity : 0;
  if (Math.abs(report.armImpulse[0] - force * dt) > 1e-9) throw new Error('Reel force cap changed');
  if (observe && input.active && loads.length !== input.substeps) throw new Error('Missing active support samples');
  for (const load of loads) {
    const expected = rotate(-force * load.h);
    if (Math.hypot(load.deliveredImpulse.x - expected.x, load.deliveredImpulse.y - expected.y) > 1e-9
      || !(load.footMobility > 0)) throw new Error('Achieved reel is not the constant-force oracle');
  }
  if (Math.abs(report.work.residual) > 1e-9 || Math.abs(report.passiveGraspWork) > 1e-9
    || Math.abs(report.armWork[0] - report.work.grasps + report.supportMotorWork[1]) > 1e-9)
    throw new Error('Body/support work is not explained by the active reel');
  for (let i = 0; i < bs.length; i++) if (report.armImpulse[i] > report.armImpulseLimit[i] + 1e-9
    || report.armWork[i] > report.armWorkLimit[i] + 1e-9
    || report.supportMotorWork[i] > report.supportMotorWorkLimit[i] + 1e-9)
    throw new Error('Oracle exceeded a common force/work budget');
  if (input.active && (!(Math.hypot(foot.offset.x, foot.offset.y) > 0) || !(report.supportMotorWork[1] < 0)))
    throw new Error('Lower support was inert instead of physically responding');
  const expected = bs.map((q, i) => {
    const acceleration = (i ? -1 : 1) * force / q.profile.massKg;
    const position = rotate((i ? initialGap : 0) + .5 * acceleration * dt * dt);
    const velocity = rotate(acceleration * dt);
    if (Math.hypot(q.vel.x - velocity.x, q.vel.y - velocity.y) > 1e-10)
      throw new Error('Independent F/m velocity oracle failed');
    const positionError = { x: q.pos.x - position.x, y: q.pos.y - position.y };
    return { position, velocity, positionError, positionErrorYd: Math.hypot(positionError.x, positionError.y),
      predictedEndVelocityExcess: rotate(.5 * acceleration * dt * dt / input.substeps) };
  });
  const momentum = bs.reduce((s, q) => ({ x: s.x + q.profile.massKg * q.vel.x,
    y: s.y + q.profile.massKg * q.vel.y }), { x: 0, y: 0 });
  const com = { x: (100 * a.pos.x + 80 * b.pos.x) / 180, y: (100 * a.pos.y + 80 * b.pos.y) / 180 };
  const expectedCom = rotate(80 * initialGap / 180);
  if (Math.hypot(momentum.x, momentum.y) > 1e-8
    || Math.hypot(com.x - expectedCom.x, com.y - expectedCom.y) > 1e-10)
    throw new Error('Internal lower reel changed momentum or COM travel');
  return { input, initial, loads, expected, checks: {
    domainForceVelocityWorkPassed: true,
    newtonianPositionPassed: expected.every(e => e.positionErrorYd < 1e-10),
    matchesEndVelocityPositionExcess: expected.every(e => Math.hypot(
      e.positionError.x - e.predictedEndVelocityExcess.x,
      e.positionError.y - e.predictedEndVelocityExcess.y) < 1e-10) },
    physical: { bodies: structuredClone(bs), report,
      grasp: { hold: grasp.hold, capacity: grasp.capacity, legs: grasp.legs,
        force: grasp.force, slipping: grasp.slipping, broken: !!grasp.broken } },
    gapErrorYd: Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)
      - Math.hypot(expected[1].position.x - expected[0].position.x,
        expected[1].position.y - expected[0].position.y) };
}
const rows = [];
for (const capacity of [20, 200]) for (const substeps of [1, 6, 12, 48])
  for (const angle of [0, .8, -.8]) for (const active of [false, true]) {
    const input = { capacity, substeps, angle, active }, row = trial(input, true), control = trial(input, false);
    if (hash(row.physical) !== hash(control.physical)) throw new Error('Support-load observer changed physical payload');
    rows.push({ ...row, observerVerified: true, physicalSha256: hash(row.physical) });
  }
const sourceAfter = sourceVersion(), worldAfter = fileHash('src/physics/world.ts');
if (sourceBefore !== sourceAfter || worldBefore !== worldAfter
  || toolPaths.some(path => fileHash(path) !== toolHashes[path])) throw new Error('Source changed during oracle');
const report = { schema: 'lower-reel-oracle-v1', collectedAt: new Date().toISOString(),
  sourceBefore, sourceAfter, worldSha256: worldBefore, toolHashes,
  invocation: [process.execPath, ...process.execArgv, ...process.argv.slice(1)],
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  scope: 'Single ordinary50ms standing-controller tick from rest with actual production bounded lower attachment, positive support mobility, two weak full-leg grip caps, four subdivisions, three rotations and active/passive controls. Delivered per-substep force is observed; the unobserved physical repeat is verified. Support movement, slipping and work evolve normally. No free-ground flag or manually frozen support state is used.',
  limits: 'Independent body COM F/m oracle, not an oracle for the support chart or its work/geometry integration. Designed grip capacities/profiles are arbitrary diagnostic inputs, not NFL biomechanics. One initial no-drive tick avoids later braking/recovery feedback; this does not establish football outcome fidelity or error frequency.',
  summary: { trials: rows.length, observedRepeatChecks: rows.length,
    newtonianPositionPassed: rows.filter(r => r.checks.newtonianPositionPassed).length,
    activePositionFailures: rows.filter(r => r.input.active && !r.checks.newtonianPositionPassed).length,
    passivePositionFailures: rows.filter(r => !r.input.active && !r.checks.newtonianPositionPassed).length }, rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256: sourceBefore, worldSha256: worldBefore, ...report.summary,
  nativeActive: rows.filter(r => r.input.active && r.input.substeps === 6).map(r => ({ input: r.input,
    positionErrorYd: r.expected.map(e => e.positionErrorYd), gapErrorYd: r.gapErrorYd,
    supportOffsetYd: Math.hypot(r.physical.bodies[1].support!.foot!.offset.x,
      r.physical.bodies[1].support!.foot!.offset.y), supportMotorWork: r.physical.report.supportMotorWork[1] })) }));
