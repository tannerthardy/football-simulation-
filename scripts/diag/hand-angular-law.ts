/** Independent angular-law audit of production hands, distinct from numerical convergence.
 * node --import tsx scripts/diag/hand-angular-law.ts [output.json] [--assert-law] [--common-patch]
 * Measurement succeeds when its independent controls pass. --assert-law also
 * requires tangential hands to conserve total planar angular momentum.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Vec2 } from '../../src/core/vec.js';
import type { Body } from '../../src/physics/kinematics.js';
import { supportParams } from '../../src/physics/support.js';
import { World, type HandJoint, type Intent } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

const args = process.argv.slice(2), positional = args.filter(arg => !arg.startsWith('--'));
if (positional.length > 1 || args.some(arg => arg.startsWith('--') && arg !== '--assert-law' && arg !== '--common-patch')
  || ['--assert-law', '--common-patch'].some(flag => args.filter(arg => arg === flag).length > 1))
  throw new Error('Usage: hand-angular-law.ts [output.json] [--assert-law] [--common-patch]');
const output = positional[0] ?? 'out/ol-interactions/hand-angular-law.json';
const assertLaw = args.includes('--assert-law'), tolerance = 1e-8, force = 20, duration = .2;
const handContact = args.includes('--common-patch') ? 'patch' : 'center';
const free: Intent = { vel: { x: 0, y: 0 }, free: true };
const self = fileURLToPath(import.meta.url);
const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const sourceBefore = sourceVersion(), toolBefore = fileHash(self);

// Same profiles as test/hand-force-integration.test.ts. No controllers or RNG.
function body(mass: number, x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: .7, y: 0 }, facing: 0, energy: 1, spin: 0,
    profile: { massKg: mass, radius: .3, reach: 1, heightYd: 2.05,
      vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
      shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
      power: mass, balance: .5, stepSpeed: 3.4, getUp: .9 } };
}
const cross = (p: Vec2, v: Vec2) => p.x * v.y - p.y * v.x;
function totals(bs: Body[]) {
  return {
    momentum: bs.reduce((s, b) => ({ x: s.x + b.profile.massKg * b.vel.x, y: s.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 }),
    angular: bs.reduce((s, b) => s + b.profile.massKg * cross(b.pos, b.vel) + supportParams(b.profile).yawInertia * (b.spin ?? 0), 0),
    spinAngular: bs.reduce((s, b) => s + supportParams(b.profile).yawInertia * (b.spin ?? 0), 0),
    energy: bs.reduce((s, b) => s + .5 * b.profile.massKg * (b.vel.x ** 2 + b.vel.y ** 2)
      + .5 * supportParams(b.profile).yawInertia * (b.spin ?? 0) ** 2, 0),
  };
}
function finite(value: unknown): void {
  if (typeof value === 'number') assert(Number.isFinite(value), 'Non-finite physical measurement');
  else if (value && typeof value === 'object') for (const child of Object.values(value)) finite(child);
}
const geometries = [
  { name: 'base', angle: 0, offset: { x: 0, y: 0 } },
  { name: 'rotation', angle: .8, offset: { x: 0, y: 0 } },
  { name: 'translation', angle: 0, offset: { x: 17, y: -9 } },
  { name: 'rotation-translation', angle: .8, offset: { x: 17, y: -9 } },
];
function run(channel: 'normal' | 'tangent', geometry: typeof geometries[number], side: number, dt: number, substeps: number) {
  const bs = [body(100, 0), body(80, .9)], [a, b] = bs;
  if (channel === 'tangent') b.vel.y = 2;
  const rotate = (p: Vec2): Vec2 => ({
    x: p.x * Math.cos(geometry.angle) - p.y * side * Math.sin(geometry.angle),
    y: p.x * Math.sin(geometry.angle) + p.y * side * Math.cos(geometry.angle),
  });
  for (const q of bs) {
    q.pos = rotate(q.pos); q.pos.x += geometry.offset.x; q.pos.y += geometry.offset.y;
    q.vel = rotate(q.vel); q.facing = geometry.angle;
  }
  const world = new World(bs, { substeps, handIntegration: 'centered', handContact });
  const joint: HandJoint = { kind: 'hands', a, b, extension: channel === 'normal' ? 1.5 : .9,
    push: channel === 'normal' ? force : 0, hold: 0, steer: channel === 'tangent' ? force : 0 };
  world.joints.push(joint);
  const initial = totals(bs), count = Math.round(duration / dt);
  assert(count > 0 && Math.abs(count * dt - duration) < tolerance, 'Empty or truncated fixture');
  const audit = { groundImpulse: 0, groundYawImpulse: 0, groundWork: 0, contacts: 0, falls: 0,
    maxEnergyResidual: 0, handWork: 0, armImpulse: 0, maxArmImpulseExcess: 0, maxArmWorkExcess: 0,
    maxIntervalAngularDefect: 0, maxNormalOracleError: 0, maxNormalForceError: 0,
    firstTangentForce: 0, firstAngularChange: 0 };
  for (let tick = 0; tick < count; tick++) {
    const before = totals(bs), report = world.step(bs.map(() => free), dt), after = totals(bs);
    // newSupport uses -Infinity for "up since before this fixture"; that
    // lifecycle timestamp is not a physical position/velocity measurement.
    const physicalBodies = bs.map(q => {
      const { since, ...support } = q.support!;
      assert(since === -Infinity || Number.isFinite(since), 'Invalid support lifecycle timestamp');
      return { ...q, support };
    });
    finite({ bodies: physicalBodies, report, after });
    audit.groundImpulse += report.groundImpulse.reduce((s, p) => s + Math.hypot(p.x, p.y), 0);
    audit.groundYawImpulse += report.groundYawImpulse.reduce((s, z) => s + Math.abs(z), 0);
    audit.groundWork += [...report.groundWork, ...report.groundYawWork].reduce((s, z) => s + Math.abs(z), 0);
    audit.contacts += report.contacts.length; audit.falls += report.falls.length;
    audit.maxEnergyResidual = Math.max(audit.maxEnergyResidual, Math.abs(report.work.residual));
    audit.handWork += report.work.hands;
    audit.armImpulse += report.armImpulse.reduce((s, z) => s + z, 0);
    audit.maxArmImpulseExcess = Math.max(audit.maxArmImpulseExcess, ...report.armImpulse.map((z, i) => z - report.armImpulseLimit[i]));
    audit.maxArmWorkExcess = Math.max(audit.maxArmWorkExcess, ...report.armWork.map((z, i) => z - report.armWorkLimit[i]));
    audit.maxIntervalAngularDefect = Math.max(audit.maxIntervalAngularDefect, Math.abs(after.angular - before.angular));
    if (tick === 0) { audit.firstTangentForce = joint.tangentForce ?? 0; audit.firstAngularChange = after.angular - before.angular; }
    assert(audit.groundImpulse <= tolerance && audit.groundYawImpulse <= tolerance && audit.groundWork <= tolerance
      && !audit.contacts && !audit.falls && bs.every(q => q.support?.state === 'up'), 'Ground/contact/fall contaminates isolation');
    assert(audit.maxEnergyResidual <= tolerance && audit.maxArmImpulseExcess <= tolerance && audit.maxArmWorkExcess <= tolerance,
      'Energy accounting or shared arm budget failed');
    if (channel === 'normal') {
      // Independent F=ma travel/velocity oracle; no refined-solver reference.
      const t = (tick + 1) * dt;
      bs.forEach((q, i) => {
        const sign = i === 0 ? -1 : 1, mass = i === 0 ? 100 : 80;
        const p = rotate({ x: (i === 0 ? 0 : .9) + .7 * t + sign * .5 * force / mass * t * t, y: 0 });
        const v = rotate({ x: .7 + sign * force / mass * t, y: 0 });
        audit.maxNormalOracleError = Math.max(audit.maxNormalOracleError,
          Math.abs(q.pos.x - p.x - geometry.offset.x), Math.abs(q.pos.y - p.y - geometry.offset.y),
          Math.abs(q.vel.x - v.x), Math.abs(q.vel.y - v.y), Math.abs(q.spin ?? 0));
      });
      audit.maxNormalForceError = Math.max(audit.maxNormalForceError, Math.abs((joint.normalForce ?? 0) - force));
      assert(audit.maxNormalOracleError <= tolerance && audit.maxNormalForceError <= tolerance
        && Math.abs(after.angular - initial.angular) <= tolerance, 'Independent normal-force oracle failed');
    }
  }
  const final = totals(bs), deltaMomentum = { x: final.momentum.x - initial.momentum.x, y: final.momentum.y - initial.momentum.y };
  const deltaAngular = final.angular - initial.angular, deltaEnergy = final.energy - initial.energy;
  assert(audit.armImpulse > tolerance, 'Fixture transmitted no hand impulse');
  assert(Math.hypot(deltaMomentum.x, deltaMomentum.y) <= tolerance && Math.abs(deltaEnergy - audit.handWork) <= tolerance,
    'Linear momentum or integrated energy accounting failed');
  if (channel === 'tangent') assert(audit.handWork <= tolerance, 'Passive steering created positive work');
  return { channel, geometry: geometry.name, side, dt, substeps, duration, ticks: count, initial, final,
    deltaAngular, deltaMomentum, deltaEnergy, ...audit,
    lawConserved: Math.abs(deltaAngular) <= tolerance && audit.maxIntervalAngularDefect <= tolerance };
}
const cases: ReturnType<typeof run>[] = [];
for (const channel of ['normal', 'tangent'] as const) for (const geometry of geometries) for (const side of [-1, 1])
  for (const dt of [.05, .025, .0125]) for (const substeps of [6, 12, 48]) cases.push(run(channel, geometry, side, dt, substeps));
assert.equal(cases.length, 144, 'Incomplete angular-law panel');
let maxParityError = 0;
for (const row of cases) {
  const base = cases.find(q => q.channel === row.channel && q.geometry === 'base' && q.side === 1 && q.dt === row.dt && q.substeps === row.substeps)!;
  assert(base, 'Missing matched parity control');
  maxParityError = Math.max(maxParityError, Math.abs(row.deltaAngular - row.side * base.deltaAngular), Math.abs(row.handWork - base.handWork));
}
assert(maxParityError <= tolerance, 'Mirror/rotation/translation parity failed');
const summary = Object.fromEntries((['normal', 'tangent'] as const).map(channel => {
  const panel = cases.filter(q => q.channel === channel);
  assert.equal(panel.length, 72, 'Missing normal or tangential cases');
  return [channel, { cases: panel.length, lawConserved: panel.every(q => q.lawConserved),
    absAngularChangeRange: [Math.min(...panel.map(q => Math.abs(q.deltaAngular))), Math.max(...panel.map(q => Math.abs(q.deltaAngular)))],
    maxMomentumError: Math.max(...panel.map(q => Math.hypot(q.deltaMomentum.x, q.deltaMomentum.y))),
    maxEnergyResidual: Math.max(...panel.map(q => q.maxEnergyResidual)),
    handWorkRange: [Math.min(...panel.map(q => q.handWork)), Math.max(...panel.map(q => q.handWork))],
    maxArmImpulseExcess: Math.max(...panel.map(q => q.maxArmImpulseExcess)),
    maxArmWorkExcess: Math.max(...panel.map(q => q.maxArmWorkExcess)),
    maxNormalOracleError: Math.max(...panel.map(q => q.maxNormalOracleError)) }];
}));
const lawConserved = cases.every(q => q.lawConserved), status = lawConserved ? 'PASS' : 'KNOWN FAILURE';
const sourceAfter = sourceVersion(), toolAfter = fileHash(self);
assert(sourceBefore === sourceAfter && toolBefore === toolAfter, 'Source/tool changed during measurement');
const result = { sourceBefore, sourceAfter, toolBefore, toolAfter, node: process.version, tolerance, handContact,
  status, lawConserved, caseCount: cases.length, maxParityError,
  scope: 'Actual World; separated up bodies with free:true; bounded hands only, no ground, torso contact, controllers or RNG. Normal F=ma controls always assert. Tangential angular conservation is measured against a physical law, not a finer timestep.',
  evidenceLimit: 'Does not establish ordinary-film frequency, football outcomes, NFL force magnitudes or a need for two anatomical hands.',
  angularFormula: 'sum(m*(pos.x*vel.y-pos.y*vel.x) + yawInertia*spin)',
  units: { angular: 'kg*yd^2/s', momentum: 'kg*yd/s', energy: 'kg*yd^2/s^2' }, summary, cases };
finite(result);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(`${status}: angular momentum ${lawConserved ? 'conserved' : 'not conserved'} at tolerance ${tolerance}; independent controls passed (${cases.length} cases).`);
console.log(JSON.stringify({ output, sourceBefore, toolBefore, lawConserved, summary, maxParityError }, null, 2));
if (assertLaw && !lawConserved) process.exitCode = 1;
