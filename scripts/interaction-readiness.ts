/** Controlled probes of contact transitions, independent of NFL outcomes.
 * node --import tsx scripts/interaction-readiness.ts [out/interaction-readiness.json]
 * The same three probes that documented the earlier engine's gaps (weak
 * grasp accounting, contact-local balance resets, missed fast encounters),
 * run against the physics world. They are probes, not acceptance tests.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { availability, baseRadiusAt, criticalDeviation, supportParams } from '../src/physics/support.js';
import type { Intent } from '../src/physics/world.js';
import type { Agent } from '../src/sim/agent.js';
import { createEngagement } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';
import { tryTackles, updateBond } from '../src/sim/tackle.js';
import { sourceVersion } from './source-version.js';

function fixture(seed: number) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(seed), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(seed + 12), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'interaction audit' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'interaction audit' },
    los: 40, ballY: 26, firstDownX: 50, seed });
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
  const before = measure([c, d]);
  tryTackles(sim);
  if (!sim.bond) throw new Error(`No grasp formed for roster ${seed}`);
  const grip = sim.bond.grip!.get(d)!;
  const afterFormation = measure([c, d]);
  const relativeSpeedAtFormation = Math.hypot(c.vel.x - d.vel.x, c.vel.y - d.vel.y);
  // One controller tick: technique intents, then the world steps it.
  const intents: Intent[] = sim.agents.map((a) => ({ vel: a === c ? { x: 6, y: 0 } : { x: 0, y: 0 } }));
  updateBond(sim, sim.bond, intents);
  sim.world.time = sim.t;
  const report = sim.world.step(intents, sim.dt);
  const afterUpdate = measure([c, d]);
  const ground = [c, d].map((a) => report.groundImpulse[a.idx]);
  const gx = (ground[0].x + ground[1].x) * YARD_METRES, gy = (ground[0].y + ground[1].y) * YARD_METRES;
  const groundWork = (report.groundWork[c.idx] + report.groundWork[d.idx]) * YARD_METRES ** 2;
  return { seed, grip, before, afterFormation, afterUpdate, relativeSpeedAtFormation,
    relativeSpeedAfterUpdate: Math.hypot(c.vel.x - d.vel.x, c.vel.y - d.vel.y),
    momentumErrorFormation: Math.hypot(afterFormation.momentumX - before.momentumX, afterFormation.momentumY - before.momentumY),
    // Momentum may change only through recorded ground impulse.
    momentumErrorUpdate: Math.hypot(afterUpdate.momentumX - afterFormation.momentumX - gx, afterUpdate.momentumY - afterFormation.momentumY - gy),
    groundImpulseUpdate: Math.hypot(gx, gy),
    // Kinetic energy beyond what the feet (and a fall) put in.
    kineticAddedBeyondGroundWork: afterUpdate.kineticJoules - afterFormation.kineticJoules - Math.max(0, groundWork) };
}

function supportReset(seed: number) {
  const sim = fixture(seed), b = sim.slot('RT')!, d = sim.slot('DE_S')!;
  b.downUntil = d.downUntil = -1;
  b.body.pos = { x: 34, y: 26 }; d.body.pos = { x: 34 + b.profile.radius + d.profile.radius, y: 26 };
  const first = createEngagement(sim, b, d, 'run', { x: 1, y: 0 })!;
  if (!first) throw new Error('Run contact did not form');
  // Deplete both bodies' balance: capture points well outside their feet.
  for (const [a, share] of [[b, 0.8], [d, 0.6]] as const) {
    const sp = supportParams(a.profile), sup = a.body.support!;
    const rb = baseRadiusAt(sp, sup.posture), crit = criticalDeviation(sp, sup.posture, 0, 1);
    sup.xi = { x: (a === b ? -1 : 1) * (rb + share * (crit - rb)), y: 0 };
  }
  const base = (a: Agent) => availability(a.body.support!, supportParams(a.profile), 1);
  const before = { blocker: base(b), defender: base(d), time: sim.t };
  sim.disengage(first);
  const next = createEngagement(sim, b, d, 'run', { x: 1, y: 0 });
  if (!next) throw new Error('Run contact did not reform');
  return { seed, before, after: { blocker: next.baseB, defender: next.baseD, time: sim.t } };
}

function crossing(substeps: number | undefined, lateralOffset: number) {
  const sim = fixture(7), a = sim.slot('Z')!, b = sim.slot('FS')!;
  a.downUntil = b.downUntil = -1;
  sim.ball = { kind: 'held', carrier: a };
  // A compact synthetic pair at plausible running speed; fixed geometry.
  a.profile.radius = b.profile.radius = 0.25;
  a.profile.vmax = b.profile.vmax = 12;
  a.body.pos = { x: 50 - 0.275, y: 26 };
  b.body.pos = { x: 50 + 0.275, y: 26 + lateralOffset };
  a.body.vel = { x: 10.5, y: 0 }; b.body.vel = { x: -10.5, y: 0 };
  a.body.facing = 0; b.body.facing = Math.PI;
  const before = measure([a, b]);
  sim.world.substeps = substeps;
  const intents: Intent[] = sim.agents.map((x) => (x === a || x === b ? { vel: { ...x.vel }, facing: x.facing } : { vel: { x: 0, y: 0 } }));
  sim.world.time = sim.t;
  const report = sim.world.step(intents, 0.05);
  const touched = report.contacts.some((r) => (r.i === a.idx && r.j === b.idx) || (r.i === b.idx && r.j === a.idx));
  return { substeps: substeps ?? 'adaptive', lateralOffset, speedPerBody: 10.5, bodyRadius: 0.25,
    detected: touched, crossedOrder: a.pos.x > b.pos.x,
    finalDistance: Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y), before, after: measure([a, b]) };
}

const seeds = [7, 19, 31, 43];
const weak = seeds.map(weakGrasp), support = seeds.map(supportReset);
const crossings = [0, 0.4].flatMap((offset) => [1, undefined].map((n) => crossing(n, offset)));
const average = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const result = { sourceSha256: sourceVersion(), setup: { seeds, nativeDt: 0.05, graspTicks: 1, crossingDuration: 0.05, engine: 'physics world' },
  units: { momentum: 'kg m/s', kinetic: 'joules', position: 'yards', velocity: 'yards/s', time: 'seconds' },
  definitions: {
    grasp: 'Actual tryTackles grasp, actual updateBond technique intents, one world step. chance() false. Momentum error excludes recorded ground impulse; kinetic energy added excludes positive ground work.',
    support: 'Immediate run disengagement/re-engagement with both bodies\' capture points displaced; the new contact reads the same body-owned support.',
    crossing: 'One 0.05 s world step of a head-on pair at 10.5 yd/s each, with one fixed substep and with adaptive substeps; swept detection.',
    limitations: 'Synthetic counterfactuals check solver/representation contracts, not their frequency in games. Not NFL validation.' },
  summary: { meanFormationMomentumError: average(weak.map((r) => r.momentumErrorFormation)),
    meanNextUpdateMomentumError: average(weak.map((r) => r.momentumErrorUpdate)),
    meanKineticAddedBeyondGroundWork: average(weak.map((r) => r.kineticAddedBeyondGroundWork)),
    meanGraspRelativeSpeedBefore: average(weak.map((r) => r.relativeSpeedAtFormation)),
    meanGraspRelativeSpeedAfter: average(weak.map((r) => r.relativeSpeedAfterUpdate)),
    supportResetCases: support.filter((r) => r.after.blocker > r.before.blocker + 1e-9 || r.after.defender > r.before.defender + 1e-9).length,
    singleSubstepCrossingsDetected: crossings.filter((r) => r.substeps === 1 && r.lateralOffset === 0 && r.detected).length,
    adaptiveCrossingsDetected: crossings.filter((r) => r.substeps === 'adaptive' && r.lateralOffset === 0 && r.detected).length,
    headOnPassThroughs: crossings.filter((r) => r.lateralOffset === 0 && r.crossedOrder).length },
  weakGrasps: weak, supportResets: support, crossings };
const output = process.argv[2] ?? 'out/interaction-readiness.json';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.summary, null, 2)); console.log(`Saved ${output}`);
