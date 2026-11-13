/** Reduced support audit: lean release and leg-restraint feasibility.
 * node --import tsx scripts/diag/support-budget.ts out/support-budget.json
 * Identical incoming states, fixed controllers, no outcome calibration.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { PhysicalProfile } from '../../src/players/physical.js';
import type { Body } from '../../src/physics/kinematics.js';
import { newSupport, supportParams } from '../../src/physics/support.js';
import { World, type GraspJoint, type Intent } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

const profile: PhysicalProfile = { massKg: 100, radius: .28, reach: 1,
  heightYd: 2.05, vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8,
  backpedal: .6, shuffle: .55, maxCatchHeight: 3, reactReach: 2.6,
  reactionTime: .25, power: 100, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
const body = (x: number, vx = 0): Body => ({ pos: { x, y: 0 },
  vel: { x: vx, y: 0 }, facing: 0, energy: 1, profile: { ...profile }, support: newSupport() });
const stand: Intent = { vel: { x: 0, y: 0 }, facing: 0, posture: .2, push: 0 };
// A distant zero-force hand row forces both actors into the numerical island.
// It delivers no contact, arm impulse or work, including when a grasp breaks.
function island(bs: Body[], substeps: number): World {
  const w = new World(bs, { substeps });
  w.joints.push({ kind: 'hands', a: bs[0], b: bs[1], extension: 4,
    push: 0, hold: 0, steer: 0 });
  return w;
}
interface Observation { xiTransfer: number; maxXiTransfer: number; lockIntegral: number;
  maxLock: number; feetCalls: number; trace: unknown[] }
const originalFeet = (World.prototype as any).feet;
let observed: Observation | undefined;
(World.prototype as any).feet = function(i: number, intent: Intent, plan: unknown,
  h: number, remaining: number, report: unknown) {
  const b: Body = this.bodies[i];
  const before = { xi: { ...b.support!.xi }, lean: { ...b.support!.lean } };
  const result = originalFeet.call(this, i, intent, plan, h, remaining, report);
  if (i === 0 && observed) {
    const sup = b.support!;
    const delta = Math.hypot(sup.xi.x - before.xi.x, sup.xi.y - before.xi.y);
    observed.xiTransfer += delta;
    observed.maxXiTransfer = Math.max(observed.maxXiTransfer, delta);
    observed.lockIntegral += sup.feetLock * h;
    observed.maxLock = Math.max(observed.maxLock, sup.feetLock);
    if (observed.feetCalls < 8) observed.trace.push({ t: this.time, h,
      leanBefore: before.lean, leanAfter: { ...sup.lean }, xiTransfer: delta,
      feetLock: sup.feetLock });
    observed.feetCalls++;
  }
  return result;
};
function trial(w: World, intents: Intent[], ticks: number) {
  const obs: Observation = { xiTransfer: 0, maxXiTransfer: 0, lockIntegral: 0,
    maxLock: 0, feetCalls: 0, trace: [] };
  observed = obs;
  const frames = [];
  let workError = 0, momentumError = 0, jointImpulse = 0;
  let leanResidual: number | null = null, leanIterations: number | null = null;
  const initial = structuredClone(w.bodies);
  for (let k = 0; k < ticks; k++) {
    const before = w.bodies.reduce((s, b) => s + b.profile.massKg * b.vel.x, 0);
    const report = w.step(intents, .05);
    const after = w.bodies.reduce((s, b) => s + b.profile.massKg * b.vel.x, 0);
    momentumError = Math.max(momentumError,
      Math.abs(after - before - report.groundImpulse.reduce((s, q) => s + q.x, 0)));
    workError = Math.max(workError, Math.abs(report.work.residual));
    if (report.maxLeanReleaseResidual !== undefined)
      leanResidual = Math.max(leanResidual ?? 0, report.maxLeanReleaseResidual);
    if (report.maxLeanReleaseIterations !== undefined)
      leanIterations = Math.max(leanIterations ?? 0, report.maxLeanReleaseIterations);
    jointImpulse += w.joints.filter(j => j.kind === 'grasp')
      .reduce((s, j) => s + ((j as GraspJoint).force ?? 0) * .05, 0);
    frames.push({ t: w.time, actualSubsteps: report.substeps,
      bodies: w.bodies.map(b => ({ pos: { ...b.pos }, vel: { ...b.vel },
        xi: { ...b.support!.xi }, lean: { ...b.support!.lean },
        felt: { ...b.support!.felt }, state: b.support!.state,
        feetLock: b.support!.feetLock, causes: { ...b.support!.causes } })),
      jointForce: w.joints.filter(j => j.kind === 'grasp').map(j => ({
        force: (j as GraspJoint).force, broken: (j as GraspJoint).broken })) });
  }
  observed = undefined;
  return { initial, ...obs, workError, momentumError, jointImpulse, leanResidual, leanIterations, frames };
}
const lean = [], legs = [];
try {
  for (const force of [300, 600, 900, 1100]) for (const sensed of [false, true]) {
    for (const substeps of [6, 12, 24, 48, 96, 192]) {
      const bs = [body(0), body(4)];
      bs[0].support!.lean = { x: force, y: 0 };
      bs[0].support!.felt = { x: sensed ? -force : 0, y: 0 };
      const w = island(bs, substeps);
      lean.push({ force, sensed, substeps, ...trial(w, [stand, { ...stand, free: true }], 4) });
    }
  }
  for (const capacity of [null, 0, 1, 50, 900]) for (const substeps of [6, 12, 48, 192]) {
    // Actor 0 is the runner; actor 1 holds his legs from behind. Initial
    // gait requests preserve the incoming speeds, so unsupported-foot travel
    // is not an injected acceleration or a prescribed tackle outcome.
    const bs = [body(1, 3), body(0)];
    const w = island(bs, substeps);
    if (capacity !== null) w.joints.push({ kind: 'grasp', a: bs[1], b: bs[0],
      reach: 1.5, capacity, legs: 1, pull: 0, hold: 1 });
    legs.push({ capacity, substeps,
      ...trial(w, [{ ...stand, vel: { x: 3, y: 0 } }, stand], 5) });
  }
} finally { (World.prototype as any).feet = originalFeet; observed = undefined; }
const out = process.argv[2] ?? 'out/support-budget.json';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ sourceSha256: sourceVersion(),
  note: 'Mechanism isolations with a fixed 100 kg profile, identical incoming states, four 20-Hz lean ticks and five leg-restraint ticks. A distant zero-force hand row forces actual requested subdivision. Lean values represent committed state when a previous load disappears, not a claim that this state is generated by an NFL technique. Sensed=true retains the initial felt-load memory; actual load is absent. Support deviation is a reduced model, not a measured full-3D energy store. Leg capacity null is the matched no-grasp control. No decisions, new random draws, or officiating.',
  profile, support: supportParams(profile), lean, legs }, null, 2) + '\n');
console.table(lean.map(t => ({ force: t.force, sensed: t.sensed, substeps: t.substeps,
  xiTransfer: t.xiTransfer, xi: t.frames.at(-1)!.bodies[0].xi.x,
  lean: t.frames.at(-1)!.bodies[0].lean.x, state: t.frames.at(-1)!.bodies[0].state })));
console.table(legs.map(t => ({ capacity: t.capacity, substeps: t.substeps,
  maxLock: t.maxLock, lockIntegral: t.lockIntegral, jointImpulse: t.jointImpulse,
  xi: t.frames.at(-1)!.bodies[0].xi.x, state: t.frames.at(-1)!.bodies[0].state })));
