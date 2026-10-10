/** Separate retrospective decision witness: momentum closes while feet brake.
 * node --import tsx scripts/diag/tackle-brake-witness.ts [output.json]
 * Geometry was selected to interrogate the old constant-velocity waiting law,
 * not as a random primary sample or a target tackle/yardage outcome.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { Agent } from '../../src/sim/agent.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const scriptHash = () => createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
const sourceBefore = sourceVersion(), scriptBefore = scriptHash();
const inputs = [83, 131].flatMap(seed => [-1, 1].map(side => ({ seed, side })));
const definition = { rosterSeeds: [19, 20], inputs, carrierStart: [50, CENTER_Y, 6, 0],
  defenderStart: [49, 'CENTER_Y + side*.8', 7, 0],
  defenderCommand: { vel: { x: 0, y: 0 }, facing: 0, posture: .6 },
  perceptionHistory: '24 incoming straight-line snapshots ending one tick before the staged pose; tick records staged pose',
  startedAt: 2, dt: .05, maximumTicks: 80 };
const inputSha256 = hash(definition);
const id = (seed: number, side: number) => `TB-W-S${seed}-${side < 0 ? 'L' : 'R'}`;
const cohortSha256 = hash(inputs.map(i => id(i.seed, i.side)));

function encounter(c: Agent, d: Agent) {
  const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, distance = Math.hypot(dx, dy);
  const vx = c.vel.x - d.vel.x, vy = c.vel.y - d.vel.y;
  const body = c.profile.radius + d.profile.radius, arms = body + d.profile.reach;
  const quality = (r: number) => Math.max(0, Math.min(1, 1 - (r - body - .25) / Math.max(.2, arms - body - .25)));
  const cvAt = Math.max(0, Math.min(.3, -(dx * vx + dy * vy) / Math.max(.01, vx * vx + vy * vy)));
  return { distance, quality: quality(distance), body, arms,
    normalClosing: -(vx * dx + vy * dy) / Math.max(1e-12, distance),
    constantVelocityClosestAt: cvAt,
    constantVelocityQuality: quality(Math.hypot(dx + vx * cvAt, dy + vy * cvAt)) };
}
function snapshot(a: Agent) {
  return { pos: { ...a.pos }, vel: { ...a.vel }, facing: a.facing, energy: a.body.energy,
    support: structuredClone(a.body.support), nextTackleAt: a.nextTackleAt };
}
function trial(seed: number, side: number, record: boolean) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed, record, recordLevel: 'full', recordEvery: 1 });
  const c = sim.slot('Z')!, d = sim.slot('FS')!;
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 };
    a.body.vel = { x: 0, y: 0 }; a.downUntil = 99;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  c.downUntil = d.downUntil = -1;
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: 6, y: 0 }; c.body.facing = 0;
  d.body.pos = { x: 49, y: CENTER_Y + side * .8 }; d.body.vel = { x: 7, y: 0 }; d.body.facing = 0;
  c.behavior = { kind: 'straight-carrier', update: () => ({ vel: { x: 6, y: 0 }, facing: 0 }) };
  d.behavior = { kind: 'plant-brake', update: () => ({ ...definition.defenderCommand,
    vel: { ...definition.defenderCommand.vel } }) };
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  sim.t = 2; sim.world.time = 2;
  // Repeating a moving pose would make initial dead reckoning overshoot by
  // the visual lag. Supply the incoming straight-line history instead, so
  // observed/current geometry is coherent before the newly requested plant.
  for (let k = 0; k < 24; k++) {
    const lag = (24 - k) * .05;
    sim.perception.record(sim.agents.map(a => ({ pos: { x: a.pos.x - a.vel.x * lag,
      y: a.pos.y - a.vel.y * lag }, vel: a.vel, stance: a.stance, facing: a.facing })));
  }
  const profile = { carrier: c.profile, defender: d.profile,
    carrierRatings: c.player.ratings, defenderRatings: d.player.ratings,
    carrierId: c.player.id, defenderId: d.player.id };
  const profileSha256 = hash(profile);
  let draws = 0;
  const next = sim.rng.nextU32.bind(sim.rng);
  sim.rng.nextU32 = () => { draws++; return next(); };
  const states = [], attempts = [];
  for (let k = 0; k < definition.maximumTicks && sim.phase === 'live'; k++) {
    const tickLabel = sim.t - 2, wasReadyAt = d.nextTackleAt;
    sim.tick();
    const geometry = encounter(c, d), joint = sim.bond?.holds?.get(d);
    const state = { tickLabel, tickEnd: sim.t - 2, carrier: snapshot(c), defender: snapshot(d), geometry,
      intent: structuredClone(sim.intents[d.idx]), grip: sim.bond?.grip?.get(d) ?? null,
      hold: joint ? { origin: joint.origin ?? null, hold: joint.hold, reach: joint.reach,
        capacity: joint.capacity, legs: joint.legs, force: joint.force ?? null,
        slipping: joint.slipping ?? false, broken: joint.broken ?? false } : null };
    states.push(state);
    if (d.nextTackleAt > wasReadyAt && d.nextTackleAt > sim.t - .05)
      attempts.push({ tickLabel, tickEnd: state.tickEnd, geometry, grip: state.grip, hold: state.hold });
  }
  const events = sim.events.filter(e => ['carrier_contact', 'tackle_wrap', 'missed_tackle', 'broken_tackle', 'fall', 'tackle', 'fumble'].includes(e.type))
    .map(e => ({ ...e, t: e.t - 2 }));
  const row = { id: id(seed, side), seed, side, selection: 'retrospective-command-consistency-witness',
    profile, profileSha256, firstAttempt: attempts[0] ?? null,
    attempts, states, events, final: { phase: sim.phase, outcome: sim.outcome, elapsed: sim.t - 2,
      carrier: snapshot(c), defender: snapshot(d), endSpot: sim.endSpot,
      missedTackles: sim.stats.missedTackles, brokenTackles: sim.stats.brokenTackles, draws } };
  const result = sim.buildResult();
  const signature = hash({ row, result: { ...result, frames: undefined, telemetry: undefined },
    bodies: sim.agents.map(a => a.body), intents: sim.intents,
    rng: JSON.stringify(sim.rng), perception: structuredClone(sim.perception) });
  return { row, signature, film: { id: row.id, seed, side, selection: row.selection,
    sourceSha256: sourceBefore, profileSha256, physicalSha256: hash(row),
    simulationStartedAt: 2, initialCarrierPosition: { x: 50, y: CENTER_Y }, recordingVerified: false,
    result, players: sim.agents.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey,
      position: a.player.position, weightLb: a.player.measurables.weightLb,
      heightIn: a.player.measurables.heightIn, ratings: { ...a.player.ratings } })) } };
}

const output = process.argv[2] ?? 'out/tackle-timing-review/brake-witness.json';
if (process.argv.length > 3) throw new Error('Usage: tackle-brake-witness.ts [output.json]');
const checks: Array<{ id: string; passed: boolean; observed: string; plain: string }> = [];
const trials = inputs.map(({ seed, side }) => {
  const observed = trial(seed, side, true), plain = trial(seed, side, false);
  const passed = observed.signature === plain.signature;
  checks.push({ id: observed.row.id, passed, observed: observed.signature, plain: plain.signature });
  if (!passed) throw new Error(`Recording changed physical/result/RNG state in ${observed.row.id}`);
  observed.film.recordingVerified = true;
  return observed;
});
const sourceAfter = sourceVersion(), scriptAfter = scriptHash();
if (sourceBefore !== sourceAfter || scriptBefore !== scriptAfter) throw new Error('Source/diagnostic changed during brake witness');
const profilesSha256 = hash(trials.map(t => ({ id: t.row.id, profile: t.row.profile })));
const metadata = { sourceBefore, sourceAfter, scriptSha256: scriptBefore,
  inputSha256, cohortSha256, profilesSha256,
  method: 'Separate retrospective witness of current momentum versus an already committed plant/brake command. Same generated roster pair, two play seeds and mirrors. Actual 22-body PlaySim.tick and unmodified tackle execution, strike, grasp, support, falls and whistle. No forced favorable outcome or empirical rate claim.',
  timing: 'Simulation starts at 2 s; report subtracts 2 s. Attempts retain the ordinary tick label after physical movement; geometry is measured at that body-state boundary. No sub-tick precision claim.' };
const report = { schema: 'tackle-brake-witness-v1', ...metadata, definition, recording: { matchesUnrecorded: checks.length, checks },
  rows: trials.map(t => t.row) };
const film = { schema: 'tackle-brake-witness-film-v1', ...metadata, plays: trials.map(t => t.film) };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report));
const filmPath = output.replace(/\.json$/, '') + '-film.json';
writeFileSync(filmPath, JSON.stringify(film));
console.log(JSON.stringify({ ...metadata, filmPath, rows: trials.map(t => ({ id: t.row.id,
  firstAttempt: t.row.firstAttempt, final: t.row.final })) }));
