/** Stationary-start corrective placement, shared force/work and drift audit.
 * node --import tsx scripts/diag/virtual-foot-support.ts out/virtual-foot.json
 * COMs are initially still, not clamped. Profiles/controls are identical in
 * both modes. Direct-state drift probe is explicitly synthetic, not impacts.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Body } from '../../src/physics/kinematics.js';
import { newSupport } from '../../src/physics/support.js';
import { World, type GraspJoint } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

const profile = { massKg: 100, radius: .28, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
  shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
  power: 100, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
const make = (x: number): Body => ({ pos: { x, y: 0 }, vel: { x: 0, y: 0 },
  facing: 0, profile: { ...profile }, energy: 1, support: newSupport() });
const stand = { vel: { x: 0, y: 0 }, posture: .2 };
const rows = [];
for (const supportModel of ['legacy', 'virtual-foot'] as const)
  for (const capacity of [null, 0, 1, 50, 900])
    for (const count of capacity === null ? [0] : [1, 4])
      for (const substeps of [12, 48, 192]) {
        const holder = make(0), runner = make(1), bodies = [holder, runner];
        runner.support!.xi = { x: .24, y: .04 }; runner.support!.out = .12;
        const world = new World(bodies, { substeps, supportModel });
        world.joints.push({ kind: 'hands', a: holder, b: runner, extension: 3, push: 0, hold: 0, steer: 0 });
        const grips: GraspJoint[] = Array.from({ length: count }, () =>
          ({ kind: 'grasp', a: holder, b: runner, capacity: capacity!, reach: 1.5, hold: 1, legs: 1, pull: 0 }));
        world.joints.push(...grips);
        let maxWorkError = 0, maxMomentumError = 0, gripImpulse = 0;
        let motorWork = 0, passiveWork = 0, maxPositiveMotorFraction = 0;
        let maxSampledOffset = 0, maxSampledExternalForce = 0, maxSampledCommandFraction = 0;
        const falls = new Set<number>(), ticks = [];
        for (let tick = 0; tick < 8; tick++) {
          const before = bodies.reduce((s, b) => ({ x: s.x + b.profile.massKg * b.vel.x,
            y: s.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
          const report = world.step([stand, stand], .05);
          const after = bodies.reduce((s, b, i) => ({ x: s.x + b.profile.massKg * b.vel.x - report.groundImpulse[i].x,
            y: s.y + b.profile.massKg * b.vel.y - report.groundImpulse[i].y }), { x: 0, y: 0 });
          maxMomentumError = Math.max(maxMomentumError, Math.hypot(after.x - before.x, after.y - before.y));
          maxWorkError = Math.max(maxWorkError, Math.abs(report.work.residual));
          for (const j of grips) gripImpulse += (j.force ?? 0) * .05;
          motorWork += report.supportMotorWork[1]; passiveWork += report.passiveGraspWork;
          maxPositiveMotorFraction = Math.max(maxPositiveMotorFraction, Math.max(0, report.supportMotorWork[1])
            / Math.max(1e-9, report.supportMotorWorkLimit[1]));
          for (const i of report.falls) falls.add(i);
          const foot = runner.support!.foot;
          if (foot) {
            maxSampledOffset = Math.max(maxSampledOffset, Math.hypot(foot.offset.x, foot.offset.y));
            maxSampledExternalForce = Math.max(maxSampledExternalForce, Math.hypot(foot.force.x, foot.force.y));
            maxSampledCommandFraction = Math.max(maxSampledCommandFraction,
              foot.mobility > 0 ? Math.hypot(foot.desired.x, foot.desired.y) / foot.mobility / foot.capacity : 0);
          }
          ticks.push({ t: world.time, xi: { ...runner.support!.xi }, state: runner.support!.state,
            foot: foot ? structuredClone(foot) : null, report: { motorWork: report.supportMotorWork[1],
              motorLimit: report.supportMotorWorkLimit[1], passiveWork: report.passiveGraspWork,
              bodyGripWork: report.work.grasps, workResidual: report.work.residual } });
        }
        rows.push({ supportModel, capacity, count, substeps, maxWorkError, maxMomentumError,
          gripImpulse, motorWork, passiveWork, maxPositiveMotorFraction, maxSampledOffset,
          maxSampledExternalForce, maxSampledCommandFraction, falls: [...falls],
          finalBodies: structuredClone(bodies), ticks });
      }

const subject = make(0), driftWorld = new World([subject], { supportModel: 'virtual-foot' });
const syntheticDrift = [];
for (let repetition = 1; repetition <= 20; repetition++) {
  // Deliberately introduces no collision, impulse or physical work. This
  // tests lifecycle/geometry only and cannot establish repeated-hit response.
  subject.support!.xi = { x: .3, y: 0 }; subject.support!.out = .12;
  for (let tick = 0; tick < 20; tick++) driftWorld.step([stand], .05);
  if ([1, 5, 10, 20].includes(repetition)) syntheticDrift.push({ repetition,
    position: { ...subject.pos }, offset: { ...subject.support!.foot!.offset }, xi: { ...subject.support!.xi } });
}
const output = process.argv[2] ?? 'out/virtual-foot.json'; mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ sourceSha256: sourceVersion(), profile,
  note: '54 stationary-start recovery trials; 0.4s each, 20Hz fixed controls. COMs not clamped. No outcome fitting. Mode is explicit. Foot offset/load/command maxima sampled at tick ends, not continuous peaks. External passive load can exceed active command capacity. Synthetic drift directly resets support deviation and is not a physical impact experiment.',
  rows, syntheticDrift }, null, 2) + '\n');
console.table(rows.filter(r => r.substeps === 12 && r.count <= 1).map(({ supportModel, capacity,
  gripImpulse, motorWork, maxPositiveMotorFraction, maxSampledOffset, falls }) =>
  ({ supportModel, capacity, gripImpulse, motorWork, maxPositiveMotorFraction, maxSampledOffset, falls: falls.join(',') })));
console.table(syntheticDrift);
console.log(`Saved ${output}`);
