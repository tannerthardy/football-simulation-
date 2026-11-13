/** A constant-force oracle for active torso-grasp position integration.
 * node --import tsx scripts/diag/grasp-integration-review.ts [output.json]
 *
 * Low arm capacities keep the reel force saturated throughout a contact-
 * free 0.2s window. Expected travel follows Newton's law, independently of
 * solver subdivision. This measures a local integration error, not a tackle
 * outcome, physical-force calibration or the coupled held-foot solver.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { G } from '../../src/core/units.js';
import type { Body } from '../../src/physics/kinematics.js';
import { World, type GraspJoint, type Intent } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

if (process.argv.length > 3) throw new Error('Usage: grasp-integration-review.ts [output.json]');
const output = process.argv[2] ?? 'out/grasp-integration-review.json';
const free: Intent = { vel: { x: 0, y: 0 }, free: true };
const duration = .2, tickDt = .05, initialSpeed = .7, initialGap = 1.2;
const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const toolPaths = ['scripts/diag/grasp-integration-review.ts', 'scripts/source-version.ts'];
const toolHashes = Object.fromEntries(toolPaths.map(path => [path, fileHash(path)]));
const worldBefore = fileHash('src/physics/world.ts'), sourceBefore = sourceVersion();

function body(mass: number, x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: initialSpeed, y: 0 }, facing: 0, energy: 1,
    profile: { massKg: mass, radius: .3, reach: 1, heightYd: 2.05,
      vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
      shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
      power: mass, balance: .5, stepSpeed: 3.4, getUp: .9 } };
}
function trial(substeps: number, angle: number, force: number, active: boolean) {
  const rotate = (x: number, y = 0) => ({
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
  });
  const a = body(100, 0), b = body(80, initialGap), bs = [a, b];
  // Force-cap the muscular reel rather than its passive grip: saturating
  // the grip itself correctly triggers sliding, introducing a leg support
  // coordinate and invalidating this isolated torso-integration oracle.
  a.profile.power = force / (.75 * G);
  for (const q of bs) {
    q.pos = rotate(q.pos.x); q.vel = rotate(q.vel.x); q.facing = angle;
  }
  const initial = bs.map(q => ({ pos: { ...q.pos }, vel: { ...q.vel }, profile: { ...q.profile } }));
  const w = new World(bs, { substeps });
  const grasp: GraspJoint = { kind: 'grasp', a, b, reach: 1.4, capacity: 900, legs: 0, pull: active ? 3 : 0 };
  w.joints.push(grasp);
  const reports = [];
  for (let k = 0; k < duration / tickDt; k++) {
    const r = w.step([free, free], tickDt);
    if (r.contacts.length || r.falls.length || r.downs.length || r.rises.length || grasp.broken)
      throw new Error('Oracle left its contact-free upright constant-force domain');
    if (bs.some(q => q.support!.foot) || grasp.slipping || grasp.legs)
      throw new Error('Torso oracle unexpectedly acquired leg support or slipped');
    if (r.groundImpulse.some(p => Math.hypot(p.x, p.y) > 1e-12)) throw new Error('Oracle has ground force');
    if (Math.abs(r.work.residual) > 1e-9 || Math.abs(r.passiveGraspWork) > 1e-9)
      throw new Error('Oracle kinetic work is not explained solely by the active reel');
    if (Math.abs(r.armImpulse[0] - (active ? force * tickDt : 0)) > 1e-9)
      throw new Error('Reel did not stay at the requested force cap');
    for (let i = 0; i < bs.length; i++) if (r.armImpulse[i] > r.armImpulseLimit[i] + 1e-9
      || r.armWork[i] > r.armWorkLimit[i] + 1e-9) throw new Error('Oracle exceeded common arm capacity');
    reports.push({ t: (k + 1) * tickDt, actualSubsteps: r.substeps,
      positions: bs.map(q => ({ ...q.pos })), velocities: bs.map(q => ({ ...q.vel })),
      force: grasp.force, slipping: grasp.slipping, broken: !!grasp.broken,
      groundImpulse: r.groundImpulse, armImpulse: r.armImpulse, armImpulseLimit: r.armImpulseLimit,
      armWork: r.armWork, armWorkLimit: r.armWorkLimit, passiveGraspWork: r.passiveGraspWork,
      work: r.work, contacts: r.contacts.length, falls: r.falls.length });
  }
  const deliveredForce = active ? force : 0, h = tickDt / substeps;
  const expected = bs.map((q, i) => {
    const signedAcceleration = (i ? -1 : 1) * deliveredForce / q.profile.massKg;
    const position = rotate((i ? initialGap : 0) + initialSpeed * duration
      + .5 * signedAcceleration * duration * duration);
    const velocity = rotate(initialSpeed + signedAcceleration * duration);
    const error = { x: q.pos.x - position.x, y: q.pos.y - position.y };
    const endVelocityExcess = rotate(.5 * signedAcceleration * duration * h);
    if (Math.hypot(q.vel.x - velocity.x, q.vel.y - velocity.y) > 1e-10)
      throw new Error('Constant-force velocity failed Newtonian oracle');
    // Retain both actual error and the independent prediction. Do not demand
    // the old position error: the same collector can measure a future repair.
    return { position, velocity, positionError: error,
      positionErrorYd: Math.hypot(error.x, error.y), predictedEndVelocityExcess: endVelocityExcess };
  });
  const px = bs.reduce((s, q) => s + q.profile.massKg * q.vel.x, 0);
  const py = bs.reduce((s, q) => s + q.profile.massKg * q.vel.y, 0);
  const expectedMomentum = rotate(180 * initialSpeed);
  const com = { x: (100 * a.pos.x + 80 * b.pos.x) / 180,
    y: (100 * a.pos.y + 80 * b.pos.y) / 180 };
  const expectedCom = rotate(80 * initialGap / 180 + initialSpeed * duration);
  if (Math.hypot(px - expectedMomentum.x, py - expectedMomentum.y) > 1e-8
    || Math.hypot(com.x - expectedCom.x, com.y - expectedCom.y) > 1e-10)
    throw new Error('Internal reel changed system momentum or COM travel');
  return { input: { substeps, angle, force, active, duration, tickDt, initialSpeed, initialGap },
    checks: { oracleDomainAndForceWorkPassed: true,
      newtonianPositionPassed: expected.every(e => e.positionErrorYd < 1e-10),
      matchesEndVelocityPositionExcess: expected.every(e => Math.hypot(
        e.positionError.x - e.predictedEndVelocityExcess.x,
        e.positionError.y - e.predictedEndVelocityExcess.y) < 1e-10) },
    initial, reports, expected, momentumError: { x: px - expectedMomentum.x, y: py - expectedMomentum.y },
    comError: { x: com.x - expectedCom.x, y: com.y - expectedCom.y },
    gapErrorYd: Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)
      - Math.hypot(expected[1].position.x - expected[0].position.x,
        expected[1].position.y - expected[0].position.y) };
}
const rows = [];
for (const force of [20, 200]) for (const substeps of [1, 6, 12, 48])
  for (const angle of [0, .8, -.8]) for (const active of [false, true]) rows.push(trial(substeps, angle, force, active));
const sourceAfter = sourceVersion(), worldAfter = fileHash('src/physics/world.ts');
if (sourceBefore !== sourceAfter || worldBefore !== worldAfter
  || toolPaths.some(path => fileHash(path) !== toolHashes[path])) throw new Error('Source changed during oracle');
const report = { schema: 'grasp-integration-review-v1', collectedAt: new Date().toISOString(),
  sourceBefore, sourceAfter, worldSha256: worldBefore, toolHashes,
  invocation: [process.execPath, ...process.execArgv, ...process.argv.slice(1)],
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  scope: '48 contact-free free-ground torso-grasp constant-force trials: two arbitrary hand-built masses, two low arm force caps derived through the existing power-to-armForce law, four subdivisions, three rotations, active reel and matched passive controls. The grip stays stronger than the reel and does not slip. Common capacities/work accounting and actual production World are retained. No leg attachments, held-foot model, collisions, braking or feedback pursuit.',
  limits: 'Mathematical position-integration oracle only. Force caps/profiles are designed inputs, not measurements or NFL calibration. It does not estimate tackle error frequency, football outcome changes, constraint-convergence failures or long-contact stability.',
  summary: { trials: rows.length,
    newtonianPositionPassed: rows.filter(r => r.checks.newtonianPositionPassed).length,
    activePositionFailures: rows.filter(r => r.input.active && !r.checks.newtonianPositionPassed).length,
    passivePositionFailures: rows.filter(r => !r.input.active && !r.checks.newtonianPositionPassed).length },
  rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256: sourceBefore, worldSha256: worldBefore,
  ...report.summary, nativeActive: rows.filter(r => r.input.active && r.input.substeps === 6)
    .map(r => ({ input: r.input, positionErrorYd: r.expected.map(e => e.positionErrorYd), gapErrorYd: r.gapErrorYd })) }));
