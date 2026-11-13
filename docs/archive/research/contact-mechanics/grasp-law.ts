/** Free upper-grip law receipt, not a tackle-success benchmark.
 * node --import tsx docs/archive/research/contact-mechanics/grasp-law.ts OUT [SOURCE_ROOT] [--assert-law]
 * --stress-lower retains faster, saturating cases across the unrepaired lower boundary.
 * SOURCE_ROOT can be an ignored git archive containing src, for paired evidence.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Body } from '../../../../src/physics/kinematics.js';
import type { GraspJoint, HandJoint } from '../../../../src/physics/world.js';

const output = process.argv[2] ?? 'out/grasp-law.json';
const stressLower = process.argv.includes('--stress-lower');
const root = resolve(process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '.');
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]);
function sourceVersion() {
  const h = createHash('sha256');
  for (const path of files(join(root, 'src')).sort()) h.update(relative(root, path)).update('\0').update(readFileSync(path)).update('\0');
  return h.digest('hex');
}
const sourceBefore = sourceVersion();
const { World } = await import(pathToFileURL(join(root, 'src/physics/world.ts')).href) as typeof import('../../../../src/physics/world.js');
const { supportParams } = await import(pathToFileURL(join(root, 'src/physics/support.ts')).href) as typeof import('../../../../src/physics/support.js');
const cross = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x * b.y - a.y * b.x;
const angular = (bs: Body[]) => bs.reduce((s, b) => s + b.profile.massKg * cross(b.pos, b.vel)
  + supportParams(b.profile).yawInertia * (b.spin ?? 0), 0);
const momentum = (bs: Body[]) => bs.reduce((s, b) => ({ x: s.x + b.profile.massKg * b.vel.x,
  y: s.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
function body(massKg: number, x: number, y: number, radius: number): Body {
  return { pos: { x, y }, vel: { x: .2, y: 0 }, facing: 0, spin: 0, energy: 1,
    profile: { massKg, radius, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3, brake: 6, lateral: 6,
      turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
      power: massKg, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 } };
}
const dt = .05;
const cases = [];
for (const mode of ['passive', 'reel', 'mixed', 'graph'] as const) for (const side of [-1, 1])
for (const substeps of [1, 12, 48]) for (const turn of [0, .8]) {
  const a = body(90, 0, 0, .25), b = body(120, 1, 0, .35), bs = [a, b];
  // Small slip speed stays below the SAME force cap even at 48 subdivisions;
  // the saturated upper-to-lower transition has separate permanent controls.
  b.vel.y = (stressLower ? .25 : .002) * side;
  const grip: GraspJoint = { kind: 'grasp', a, b, reach: 1.4, capacity: 900, legs: 0,
    pull: mode === 'reel' || mode === 'graph' ? .3 : 0 };
  const hands: HandJoint = { kind: 'hands', a, b, extension: 1.1, push: 50, hold: 0, steer: 0 };
  const joints: Array<GraspJoint | HandJoint> = [grip];
  if (mode === 'mixed') joints.unshift(hands);
  if (mode === 'graph') {
    const c = body(105, -1, -.1 * side, .3); c.vel.y = (stressLower ? -.3 : -.003) * side; bs.push(c);
    joints.push({ kind: 'hands', a, b: c, extension: 1.05, push: 50, hold: 50, steer: 30,
      contact: { on: 'b', local: { x: .15, y: .1 * side } } });
  }
  const rotate = (p: { x: number; y: number }) => ({ x: p.x * Math.cos(turn) - p.y * Math.sin(turn),
    y: p.x * Math.sin(turn) + p.y * Math.cos(turn) });
  for (const q of bs) { q.pos = rotate(q.pos); q.pos.x += 17; q.pos.y -= 9; q.vel = rotate(q.vel); q.facing = turn; }
  const initial = structuredClone(bs), initialGrips = structuredClone(joints);
  const w = new World(bs, { handContact: 'patch', substeps }); w.joints.push(...joints);
  const l = angular(bs), p = momentum(bs);
  const report = w.step(bs.map(() => ({ vel: { x: 0, y: 0 }, free: true })), dt);
  const after = momentum(bs), angularChange = angular(bs) - l;
  const momentumError = Math.hypot(after.x - p.x, after.y - p.y);
  // Reject confounders rather than attributing a lower-foot/impact case to upper grips.
  assert.equal(report.contacts.length + report.falls.length + report.downs.length + report.rises.length, 0);
  if (!stressLower) { assert.equal(grip.legs, 0); assert(!grip.broken && !grip.slipping); }
  assert(report.groundImpulse.every(q => q.x === 0 && q.y === 0));
  assert(report.groundYawImpulse.every(q => q === 0));
  if (!stressLower) assert(bs.every(q => !q.support!.foot));
  assert(momentumError < 1e-8 && Math.abs(report.work.residual) < 1e-8);
  assert(report.passiveGraspWork <= 1e-8);
  for (let i = 0; i < bs.length; i++) {
    assert(report.armWork[i] <= report.armWorkLimit[i] + 1e-8);
    assert(report.armImpulse[i] <= report.armImpulseLimit[i] + 1e-8);
  }
  cases.push({ mode, side, substeps, turn, initial, initialGrips, angularChange, momentumError,
    report, final: bs, grip: { legs: grip.legs, slipping: grip.slipping, broken: !!grip.broken, force: grip.force } });
}
const sourceAfter = sourceVersion(); assert.equal(sourceBefore, sourceAfter);
const summary = { cases: cases.length, maxAngularError: Math.max(...cases.map(c => Math.abs(c.angularChange))),
  maxMomentumError: Math.max(...cases.map(c => c.momentumError)), maxWorkResidual: Math.max(...cases.map(c => Math.abs(c.report.work.residual))),
  lawPasses: cases.filter(c => Math.abs(c.angularChange) < 1e-8).length,
  lowerTransitions: cases.filter(c => c.grip.legs > 0).length };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ sourceBefore, sourceAfter, node: process.version,
  toolSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'), dt, stressLower, summary, cases }, null, 2));
console.log(JSON.stringify({ output, sourceBefore, sourceAfter, ...summary }));
if (process.argv.includes('--assert-law')) assert.equal(summary.lawPasses, summary.cases);
