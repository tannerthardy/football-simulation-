/** Controlled probes of contact transitions, independent of NFL outcomes.
 * node --import tsx scripts/interaction-readiness.ts [out/interaction-readiness.json]
 * These document existing gaps; they are not acceptance tests that bless them.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { resolveBodyContacts } from '../src/sim/collisions.js';
import { createEngagement } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';
import { tryTackles, updateBond } from '../src/sim/tackle.js';
import { stepBody } from '../src/physics/kinematics.js';
import { sourceVersion } from './source-version.js';

function fixture(seed: number) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(seed), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(seed + 12), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'interaction audit' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'interaction audit' },
    los: 40, ballY: 26, firstDownX: 50, seed, experimentalGrasps: process.argv.includes('--experimental-grasps') });
  for (const a of sim.agents) {
    a.body.pos = { x: 5, y: a.idx * 2 }; a.body.vel = { x: 0, y: 0 };
    a.downUntil = 99;
  }
  // Disable random misses, breaks and fumbles to isolate the physical handoff.
  sim.rng.chance = () => false;
  return sim;
}

const YARD_METRES = 0.9144;
function measure(agents: Agent[]) {
  const mass = agents.reduce((s, a) => s + a.profile.massKg, 0);
  return {
    momentumX: agents.reduce((s, a) => s + a.profile.massKg * a.vel.x * YARD_METRES, 0),
    momentumY: agents.reduce((s, a) => s + a.profile.massKg * a.vel.y * YARD_METRES, 0),
    kineticJoules: agents.reduce((s, a) => s + 0.5 * a.profile.massKg * (a.vel.x ** 2 + a.vel.y ** 2) * YARD_METRES ** 2, 0),
    centerX: agents.reduce((s, a) => s + a.profile.massKg * a.pos.x, 0) / mass,
    centerY: agents.reduce((s, a) => s + a.profile.massKg * a.pos.y, 0) / mass,
  };
}

function weakGrasp(seed: number) {
  const sim = fixture(seed), c = sim.slot('Z')!, d = sim.slot('FS')!;
  sim.t = 2; sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  c.downUntil = d.downUntil = -1;
  c.body.pos = { x: 50, y: 26 }; d.body.pos = { x: 50, y: 27.4 };
  c.body.vel = { x: 6, y: 0 };
  // Almost zero external drive/stopping force, positive to keep the existing
  // toppling ratio finite. The physical residual is negligible for one tick.
  c.profile.power = d.profile.power = 1e-9;
  const before = measure([c, d]);
  tryTackles(sim);
  if (!sim.bond) throw new Error(`No grasp formed for roster ${seed}`);
  const grip = sim.bond.grip!.get(d)!;
  const afterFormation = measure([c, d]);
  const relativeSpeedAtFormation = Math.hypot(c.vel.x - d.vel.x, c.vel.y - d.vel.y);
  const old = [c, d].map(a => ({ ...a.pos }));
  const commands = sim.agents.map(a => ({ vel: a === c ? { x: 6, y: 0 } : { x: 0, y: 0 } }));
  updateBond(sim, sim.bond, commands);
  const afterUpdate = measure([c, d]);
  const finalVelocityVersusStepAverage = Math.max(...[c, d].map((a, i) =>
    Math.hypot((a.pos.x - old[i].x) / sim.dt - a.vel.x, (a.pos.y - old[i].y) / sim.dt - a.vel.y)));
  const mass = c.profile.massKg + d.profile.massKg;
  const centerDisplacementError = Math.hypot(afterUpdate.centerX - afterFormation.centerX
    - afterFormation.momentumX / YARD_METRES / mass * sim.dt,
    afterUpdate.centerY - afterFormation.centerY - afterFormation.momentumY / YARD_METRES / mass * sim.dt);
  return { seed, grip, before, afterFormation, afterUpdate, relativeSpeedAtFormation,
    relativeSpeedAfterUpdate: Math.hypot(c.vel.x - d.vel.x, c.vel.y - d.vel.y),
    momentumErrorFormation: Math.hypot(afterFormation.momentumX - before.momentumX, afterFormation.momentumY - before.momentumY),
    momentumErrorUpdate: Math.hypot(afterUpdate.momentumX - afterFormation.momentumX, afterUpdate.momentumY - afterFormation.momentumY),
    kineticAddedUpdate: afterUpdate.kineticJoules - afterFormation.kineticJoules,
    finalVelocityVersusStepAverage, centerDisplacementError };
}

function supportReset(seed: number) {
  const sim = fixture(seed), b = sim.slot('RT')!, d = sim.slot('DE_S')!;
  b.downUntil = d.downUntil = -1;
  b.body.pos = { x: 34, y: 26 }; d.body.pos = { x: 34 + b.profile.radius + d.profile.radius, y: 26 };
  const first = createEngagement(sim, b, d, 'run', { x: 1, y: 0 })!;
  if (!first) throw new Error('Run contact did not form');
  first.baseB = 0.25; first.baseD = 0.4;
  const before = { blocker: first.baseB, defender: first.baseD, time: sim.t };
  sim.disengage(first);
  const next = createEngagement(sim, b, d, 'run', { x: 1, y: 0 });
  if (!next) throw new Error('Run contact did not reform');
  return { seed, before, after: { blocker: next.baseB, defender: next.baseD, time: sim.t } };
}

function crossing(dt: number, lateralOffset: number) {
  const sim = fixture(7), a = sim.slot('Z')!, b = sim.slot('FS')!;
  a.downUntil = b.downUntil = -1;
  sim.ball = { kind: 'held', carrier: a };
  // A compact synthetic pair at plausible running speed. Fix the initial
  // geometry across timesteps; only the movement/contact sampling changes.
  a.profile.radius = b.profile.radius = 0.25;
  a.profile.vmax = b.profile.vmax = 12;
  a.body.pos = { x: 50 - 0.275, y: 26 };
  b.body.pos = { x: 50 + 0.275, y: 26 + lateralOffset };
  a.body.vel = { x: 10.5, y: 0 }; b.body.vel = { x: -10.5, y: 0 };
  a.body.facing = 0; b.body.facing = Math.PI;
  const before = measure([a, b]);
  const commandedA = { vel: { ...a.vel }, facing: a.facing };
  const commandedB = { vel: { ...b.vel }, facing: b.facing };
  const steps = Math.round(0.05 / dt);
  for (let i = 0; i < steps; i++) {
    stepBody(a.body, commandedA, dt); stepBody(b.body, commandedB, dt);
    resolveBodyContacts(sim); sim.t += dt;
  }
  return { dt, lateralOffset, speedPerBody: 10.5, bodyRadius: 0.25,
    analyticMinimumDistanceWithoutContact: lateralOffset, effectiveCollisionDiameter: 0.45,
    detected: sim.firstContactX !== null, crossedOrder: a.pos.x > b.pos.x,
    finalDistance: Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y), before, after: measure([a, b]) };
}

const seeds = [7, 19, 31, 43];
const weak = seeds.map(weakGrasp), support = seeds.map(supportReset);
const crossings = [0, 0.4].flatMap(offset => [0.05, 0.025, 0.01].map(dt => crossing(dt, offset)));
const average = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const result = { sourceSha256: sourceVersion(), setup: { seeds, nativeDt: 0.05, graspTicks: 1, crossingDuration: 0.05,
  graspModel: process.argv.includes('--experimental-grasps') ? 'experimental-bounded' : 'default-coupled' },
  units: { momentum: 'kg m/s', kinetic: 'joules', position: 'yards', velocity: 'yards/s', time: 'seconds' },
  definitions: {
    grasp: 'Actual tryTackles partial coupling followed by actual updateBond. Ground powers set to 1e-9 and chance() false. Check independent common-motion displacement; final velocity can differ from the step average during substep acceleration. Passive structural grasp capacity is distinct from ground power.',
    support: 'Immediate run disengagement/re-engagement; same pose and time, manually depleted contact-local bases. Demonstrates storage lifetime, not a measured player recovery.',
    crossing: 'Actual stepBody/resolveBodyContacts, fixed free-body geometry over 0.05 seconds. No tackle/controller update; smaller dt is a diagnostic, not a production mode.',
    limitations: 'Synthetic counterfactuals prove representational/solver gaps, not their frequency in games or attribution of the prior NFL-stat regressions. Not NFL validation.' },
  summary: { meanFormationMomentumError: average(weak.map(r => r.momentumErrorFormation)),
    meanNextUpdateMomentumError: average(weak.map(r => r.momentumErrorUpdate)),
    meanKineticAddedNextUpdate: average(weak.map(r => r.kineticAddedUpdate)),
    meanCenterDisplacementError: average(weak.map(r => r.centerDisplacementError)),
    meanFinalVelocityVersusStepAverage: average(weak.map(r => r.finalVelocityVersusStepAverage)),
    meanGraspRelativeSpeedBefore: average(weak.map(r => r.relativeSpeedAtFormation)),
    meanGraspRelativeSpeedAfter: average(weak.map(r => r.relativeSpeedAfterUpdate)),
    supportResetCases: support.filter(r => r.after.blocker > r.before.blocker && r.after.defender > r.before.defender).length,
    nativeCrossingsDetected: crossings.filter(r => r.dt === 0.05 && r.detected).length,
    nativeCrossingsTested: crossings.filter(r => r.dt === 0.05).length,
    smallerStepCrossingsDetected: crossings.filter(r => r.dt < 0.05 && r.detected).length },
  weakGrasps: weak, supportResets: support, crossings };
const output = process.argv[2] ?? 'out/interaction-readiness.json';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.summary, null, 2)); console.log(`Saved ${output}`);
