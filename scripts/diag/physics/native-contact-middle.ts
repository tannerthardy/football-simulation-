/** One accepted-source native constructor from Claude's saved power witness.
 * Observation only: no controller replacement, added sensing or RNG draws.
 * This does not replay the experimental stack or promise its old outcome.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { fatigueFactor } from '../../../src/physics/kinematics.js';
import { availability, supportParams } from '../../../src/physics/support.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { sourceVersion } from '../../source-version.js';

const output = process.argv[2];
if (process.argv.length !== 3 || !output?.endsWith('.json')) {
  throw new Error('Usage: native-contact-middle.ts OUTPUT.json');
}
const source = sourceVersion();
const input = { case: 'power/strong/i_pro_21/wide9/pair11/77', rosterSeeds: [11, 12], strength: .55,
  seed: 77, los: 40, ballY: 26.67, firstDownX: 50, down: 1, maximumTime: 7 };
const formation = structuredClone(FORMATION_BY_ID.i_pro_21);
const run = structuredClone(RUN_BY_ID.power); run.direction = 'strong';
const sim = new PlaySim({
  offense: pickOffense(generateTeam(new Rng(11), 'pair11 O', 'pair11O', { strength: .55 }), '21'),
  defense: pickDefense(generateTeam(new Rng(12), 'pair11 D', 'pair11D', { strength: .55 }), 'nickel'),
  offCall: { formation, flip: false, kind: 'run', run, label: 'power' },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.wide9, coverage: COVERAGE_BY_ID.cover3,
    pressure: null, zoneStyle: 'match', runPolicy: { edge: 'spill', linebacker: 'stack' }, label: 'wide9' },
  los: input.los, ballY: input.ballY, firstDownX: input.firstDownX, down: input.down,
  seed: input.seed, audibles: false, hurry: false, record: false,
});
const rb = sim.slot('RB')!, mass = rb.profile.massKg;
const states: unknown[] = [];
const step = sim.world.step.bind(sim.world);
sim.world.step = (intents, dt) => {
  const before = { pos: { ...rb.pos }, vel: { ...rb.vel }, facing: rb.facing,
    spin: rb.body.spin ?? 0, support: structuredClone(rb.body.support), body: structuredClone(rb.body) };
  const report = step(intents, dt);
  const ground = report.groundImpulse[rb.idx];
  states.push({ t: sim.t, end: sim.t + dt, before,
    after: { pos: { ...rb.pos }, vel: { ...rb.vel }, facing: rb.facing,
      spin: rb.body.spin ?? 0, support: structuredClone(rb.body.support),
      body: structuredClone(rb.body),
      availability: availability(rb.body.support!, supportParams(rb.profile), fatigueFactor(rb.body.energy)) },
    request: structuredClone(intents[rb.idx]), ground,
    internalImpulse: { x: mass * (rb.vel.x - before.vel.x) - ground.x,
      y: mass * (rb.vel.y - before.vel.y) - ground.y },
    groundYawImpulse: report.groundYawImpulse[rb.idx],
    contacts: report.contacts.filter(c => c.i === rb.idx || c.j === rb.idx),
    holds: sim.world.joints.filter(j => j.kind === 'grasp' && j.b === rb.body).map(j => ({
      ...j, a: sim.agents.find(a => a.body === j.a)?.slot, b: 'RB' })),
    workResidual: report.work.residual,
    peers: sim.defense.filter(a => Math.hypot(a.pos.x-rb.pos.x,a.pos.y-rb.pos.y) < 3).map(a => ({
      slot:a.slot, pos:{...a.pos}, vel:{...a.vel}, request:structuredClone(intents[a.idx]),
      state:a.body.support?.state })),
  });
  return report;
};
const wall = performance.now(), cpu = process.cpuUsage();
while (sim.phase === 'live' && sim.t < input.maximumTime) sim.tick();
const used = process.cpuUsage(cpu);
if (JSON.stringify(source) !== JSON.stringify(sourceVersion())) throw new Error('Source changed during collection');
const result = { source, toolSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  input, node: process.version, profile: rb.profile,
  measurement: 'Exact per-tick internal RB impulse = mass*deltaVelocity - recorded ground impulse; includes every contact/hold/strike, without pretending ContactRecord reports tangent impulse. Samples are pre-whistle.',
  runtime: { wallSeconds:(performance.now()-wall)/1000, cpuSeconds:(used.user+used.system)/1e6 },
  result: { phase:sim.phase, outcome:sim.outcome, t:sim.t, rbPos:rb.pos, gain:rb.pos.x-input.los },
  events:sim.events, states };
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ output, runtime:result.runtime, result:result.result,
  contacts:sim.events.filter(e => /tackle|carrier_contact|hit/.test(e.type)) }));
