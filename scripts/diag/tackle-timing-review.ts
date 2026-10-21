/** Fixed, small production tackle-lifecycle panel for attainable attempt timing.
 * node --import tsx scripts/diag/tackle-timing-review.ts [output.json]
 * The primary cohort was specified before running this script: seven physical
 * encounter types, two generated roster pairs, two play seeds and both mirrors.
 * The preceding four-seed crossing geometry remains a separate retrospective
 * witness. Neither group is an NFL tackle-rate or gain-calibration sample.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { fatigueFactor } from '../../src/physics/kinematics.js';
import { criticalDeviation, supportParams } from '../../src/physics/support.js';
import type { GraspJoint } from '../../src/physics/world.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
import type { RatingKey } from '../../src/players/types.js';
import type { Agent } from '../../src/sim/agent.js';
import { chase } from '../../src/sim/behaviors/common.js';
import type { Perceived } from '../../src/sim/perception.js';
import { PlaySim } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const scriptHash = () => createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
const sourceBefore = sourceVersion(), scriptBefore = scriptHash();
const startedAt = new Date().toISOString();
const rosterSeeds = [19, 31], playSeeds = [83, 131];
const dt = .05, absoluteStartTime = 2, maximumTicks = 120;
const definitions = {
  frontalForm: { x: 3, y: .4, vx: -3.5, vy: 0, energy: 1, balanceFraction: 0 },
  imminentCrossing: { x: 1.9, y: 2.4, vx: 3.5, vy: -4.2, energy: 1, balanceFraction: 0 },
  glancingEscapeReach: { x: -1.3, y: .8, vx: 3.5, vy: 0, energy: 1, balanceFraction: 0 },
  fasterCarrierEscape: { x: -2.5, y: .8, vx: 4, vy: 0, energy: 1, balanceFraction: 0 },
  fatiguedCrossing: { x: 1.9, y: 2.4, vx: 3.5, vy: -4.2, energy: .35, balanceFraction: 0 },
  recoveringCrossing: { x: 1.9, y: 2.4, vx: 3.5, vy: -4.2, energy: 1, balanceFraction: .55 },
  trafficCrossing: { x: 1.9, y: 2.4, vx: 3.5, vy: -4.2, energy: 1, balanceFraction: 0 },
};
type Geometry = keyof typeof definitions;
interface Input { roster: number; rosterSeed: number; seed: number; side: number; geometry: Geometry;
  group: 'primary' | 'diagnostic-crossing-witness' }
const primaryInputs: Input[] = [];
for (let roster = 0; roster < rosterSeeds.length; roster++) for (const geometry of Object.keys(definitions) as Geometry[])
  for (const seed of playSeeds) for (const side of [-1, 1])
    primaryInputs.push({ roster, rosterSeed: rosterSeeds[roster], seed, side, geometry, group: 'primary' });
const witnessInputs: Input[] = [19, 20, 21, 22].flatMap(seed => [-1, 1].map(side => ({ roster: 0,
  rosterSeed: 19, seed, side, geometry: 'imminentCrossing' as const, group: 'diagnostic-crossing-witness' as const })));
function id(input: Input): string {
  return input.group === 'primary'
    ? `TT-R${input.roster + 1}-${input.geometry}-S${input.seed}-${input.side < 0 ? 'L' : 'R'}`
    : `TT-W-crossing-S${input.seed}-${input.side < 0 ? 'L' : 'R'}`;
}
// Film membership is fixed independently of outcomes. It includes one primary
// roster/seed/mirror per encounter and both mirrors of one historical witness.
const filmIds = primaryInputs.filter(i => i.roster === 0 && i.seed === 83 && i.side === -1).map(id)
  .concat(witnessInputs.filter(i => i.seed === 19).map(id));
const inputSha256 = hash({ rosterSeeds, playSeeds, definitions, primaryInputs, witnessInputs,
  carrierStart: [50, CENTER_Y], carrierSpeed: 6, fasterCarrierSpeed: 'min(.92*vmax, defender.vmax+1.5)',
  traffic: { slot: 'Y', offsetX: 2.8, offsetY: 1.1, command: 'idle, standing' },
  perceptionHistory: '24 incoming straight-line snapshots ending one tick before the staged pose; tick records staged pose',
  witness: { carrierSlot: 'Z', defenderSlot: 'FS', x: 3, y: 6, vx: 6, vy: -6 },
  dt, absoluteStartTime, maximumTicks, filmIds });
const cohortSha256 = hash({ primary: primaryInputs.map(id), witnesses: witnessInputs.map(id), film: filmIds });

export interface TimingTackleFilmPlay {
  id: string; input: Input; selection: 'preselected-primary-subset' | 'separate-retrospective-witness';
  sourceSha256: string; profileSha256: string; simulationStartedAt: number;
  initialCarrierPosition: { x: number; y: number }; physicalSha256: string;
  recordingVerified: boolean; result: PlayResult;
  players: Array<{ team: 'O' | 'D'; slot: string; name: string; jersey: number; position: string;
    weightLb: number; heightIn: number; ratings: Record<RatingKey, number> }>;
}
export interface TimingTackleFilm {
  schema: 'tackle-timing-review-film-v1'; sourceBefore: string; sourceAfter: string;
  scriptSha256: string; inputSha256: string; cohortSha256: string; profilesSha256: string;
  timing: string; plays: TimingTackleFilmPlay[];
}

function build(input: Input, record: boolean) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(input.rosterSeed), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(input.rosterSeed + 1), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: input.seed,
    record, recordLevel: 'full', recordEvery: 1 });
  const escape = input.geometry === 'fasterCarrierEscape';
  const carrierSlot = escape || input.roster === 0 ? 'Z' : 'RB';
  const defenderSlot = escape ? 'DT_S' : input.roster === 0 ? 'FS' : 'LB_M';
  const c = sim.slot(carrierSlot)!, d = sim.slot(defenderSlot)!;
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 };
    a.body.vel = { x: 0, y: 0 }; a.downUntil = 99;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  const speed = escape ? Math.min(c.profile.vmax * .92, d.profile.vmax + 1.5) : 6;
  if (escape && speed <= d.profile.vmax) throw new Error(`Escape control ${id(input)} has no real speed advantage`);
  const g = input.group === 'diagnostic-crossing-witness'
    ? { x: 3, y: 6, vx: 6, vy: -6, energy: 1, balanceFraction: 0 } : definitions[input.geometry];
  c.downUntil = d.downUntil = -1;
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: speed, y: 0 }; c.body.facing = 0;
  d.body.pos = { x: 50 + g.x, y: CENTER_Y + input.side * g.y };
  d.body.vel = { x: g.vx, y: input.side * g.vy }; d.body.facing = Math.atan2(d.vel.y, d.vel.x);
  d.body.energy = g.energy;
  if (g.balanceFraction) {
    const s = d.body.support!, critical = criticalDeviation(supportParams(d.profile), s.posture, 0, fatigueFactor(d.body.energy));
    s.xi = { x: 0, y: input.side * g.balanceFraction * critical }; s.out = .05;
  }
  let traffic: Agent | null = null;
  if (input.group === 'primary' && input.geometry === 'trafficCrossing') {
    traffic = sim.slot('Y')!; traffic.downUntil = -1;
    traffic.body.pos = { x: 52.8, y: CENTER_Y + input.side * 1.1 };
  }
  c.behavior = { kind: 'straight-carrier', update: () => ({ vel: { x: speed, y: 0 }, facing: 0 }) };
  d.behavior = { kind: 'isolated-pursuit', update: () => d.isDown(sim.t)
    ? { vel: { x: 0, y: 0 } } : chase(sim, d, c) };
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  sim.t = absoluteStartTime; sim.world.time = absoluteStartTime;
  // The next production tick records the staged state. Historical snapshots
  // therefore end one tick before it. Repeating moving poses would make the
  // initial delayed dead reckoning overshoot by the visual latency.
  for (let k = 0; k < 24; k++) {
    const lag = (24 - k) * dt;
    sim.perception.record(sim.agents.map(a => ({ pos: { x: a.pos.x - a.vel.x * lag,
      y: a.pos.y - a.vel.y * lag }, vel: a.vel, stance: a.stance, facing: a.facing })));
  }
  return { sim, c, d, traffic, speed };
}

function physical(a: Agent) {
  return { pos: { ...a.pos }, vel: { ...a.vel }, facing: a.facing, energy: a.body.energy,
    support: structuredClone(a.body.support), missedTackles: a.missedTackles, nextTackleAt: a.nextTackleAt };
}
function held(j: GraspJoint | undefined) {
  if (!j) return null;
  return { origin: j.origin ?? null, hold: j.hold, reach: j.reach, capacity: j.capacity, legs: j.legs,
    ground: j.ground ?? null, force: j.force ?? null, broken: j.broken ?? false,
    slipping: j.slipping ?? false };
}
function geometry(c: Agent, d: Agent) {
  const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, distance = Math.hypot(dx, dy);
  const vx = c.vel.x - d.vel.x, vy = c.vel.y - d.vel.y;
  const body = c.profile.radius + d.profile.radius, arms = body + d.profile.reach;
  const quality = (r: number) => Math.max(0, Math.min(1, 1 - (r - body - .25) / Math.max(.2, arms - body - .25)));
  const cvAt = Math.max(0, Math.min(.3, -(dx * vx + dy * vy) / Math.max(.01, vx * vx + vy * vy)));
  return { distance, body, arms, quality: quality(distance),
    normalClosing: -(vx * dx + vy * dy) / Math.max(1e-12, distance),
    transverseSpeed: Math.abs((-vx * dy + vy * dx) / Math.max(1e-12, distance)),
    constantVelocityClosestAt: cvAt,
    constantVelocityQuality: quality(Math.hypot(dx + vx * cvAt, dy + vy * cvAt)) };
}

function trial(input: Input, observed: boolean, record: boolean) {
  const { sim, c, d, traffic, speed } = build(input, record);
  const profile = { carrierSlot: c.slot, defenderSlot: d.slot, carrierId: c.player.id, defenderId: d.player.id,
    carrier: c.profile, defender: d.profile, carrierRatings: c.player.ratings, defenderRatings: d.player.ratings,
    traffic: traffic ? { slot: traffic.slot, id: traffic.player.id, profile: traffic.profile, ratings: traffic.player.ratings } : null };
  const profileSha256 = hash(profile), initialCarrierPosition = { ...c.pos };
  let draws = 0;
  const draw = sim.rng.nextU32.bind(sim.rng);
  sim.rng.nextU32 = () => { draws++; return draw(); };
  let reads: Array<{ phase: 'before-physics' | 'after-physics'; seen: Perceived; scale?: number }> = [];
  let stepped = false, decisionGeometry = geometry(c, d), worldStartGeometry = decisionGeometry;
  const see = sim.see, step = sim.world.step;
  if (observed) {
    sim.see = function (observer, target, scale) {
      const seen = see.call(this, observer, target, scale);
      if (observer === d && target === c) reads.push({ phase: stepped ? 'after-physics' : 'before-physics',
        seen: structuredClone(seen), scale });
      return seen;
    };
    sim.world.step = function (intents, interval) {
      worldStartGeometry = geometry(c, d);
      const report = step.call(this, intents, interval);
      stepped = true; decisionGeometry = geometry(c, d);
      return report;
    };
  }
  const states = [], diagnostics = [], attempts = [];
  let closest = Infinity, firstReach: number | null = null;
  let maxWorkResidual = 0, maxMotorWorkExcess = 0;
  for (let k = 0; k < maximumTicks && sim.phase === 'live'; k++) {
    const label = sim.t, nextTackleAt = d.nextTackleAt;
    reads = []; stepped = false;
    sim.tick();
    const encounter = geometry(c, d), elapsed = sim.t - absoluteStartTime;
    closest = Math.min(closest, encounter.distance);
    if (firstReach === null && encounter.distance <= encounter.arms) firstReach = elapsed;
    const joint = sim.bond?.holds?.get(d);
    const state = { t: elapsed, carrier: physical(c), defender: physical(d), traffic: traffic && physical(traffic),
      intent: structuredClone(sim.intents[d.idx]), bonded: sim.bond?.tacklers.includes(d) ?? false,
      gripQuality: sim.bond?.grip?.get(d) ?? null, joint: held(joint) };
    states.push(state);
    if (sim.lastStep) {
      maxWorkResidual = Math.max(maxWorkResidual, Math.abs(sim.lastStep.work.residual));
      maxMotorWorkExcess = Math.max(maxMotorWorkExcess, ...sim.lastStep.supportMotorWork
        .map((work, index) => work - sim.lastStep!.supportMotorWorkLimit[index]));
    }
    if (d.nextTackleAt > nextTackleAt && d.nextTackleAt > label) attempts.push({ tickLabel: label - absoluteStartTime,
      tickEnd: elapsed, geometry: observed ? decisionGeometry : encounter,
      gripQuality: state.gripQuality, joint: state.joint,
      events: sim.events.filter(e => e.t === label && e.a === d.idx).map(e => ({ ...e, t: e.t - absoluteStartTime })) });
    if (observed) diagnostics.push({ tickLabel: label - absoluteStartTime, tickEnd: elapsed,
      worldStartGeometry, decisionGeometry, perceivedCarrier: reads, intent: state.intent,
      contacts: sim.lastStep?.contacts.filter(hit => hit.i === d.idx || hit.j === d.idx || hit.i === c.idx || hit.j === c.idx) ?? [],
      falls: sim.lastStep?.falls ?? [], joint: state.joint });
  }
  if (observed) { sim.see = see; sim.world.step = step; }
  const events = sim.events.filter(e => ['carrier_contact', 'tackle_wrap', 'missed_tackle', 'broken_tackle', 'fall', 'tackle', 'fumble'].includes(e.type))
    .map(e => ({ ...e, t: e.t - absoluteStartTime }));
  const firsts = { reach: firstReach, attempt: attempts[0]?.tickLabel ?? null,
    wrap: events.find(e => e.type === 'tackle_wrap')?.t ?? null,
    carrierFall: events.find(e => e.type === 'fall' && e.a === c.idx)?.t ?? null,
    defenderFall: events.find(e => e.type === 'fall' && e.a === d.idx)?.t ?? null,
    carrierDown: states.find(s => s.carrier.support?.state === 'down')?.t ?? null,
    defenderDown: states.find(s => s.defender.support?.state === 'down')?.t ?? null,
    broken: events.find(e => e.type === 'broken_tackle')?.t ?? null,
    tackle: events.find(e => e.type === 'tackle')?.t ?? null };
  const final = { elapsed: sim.t - absoluteStartTime, phase: sim.phase, outcome: sim.outcome,
    endSpot: sim.endSpot, carrier: physical(c), defender: physical(d),
    missedTackles: sim.stats.missedTackles, brokenTackles: sim.stats.brokenTackles, draws };
  const result = sim.buildResult();
  // Observer-only geometry/reads are deliberately absent. Every physical
  // trajectory, body/support, result field, intent, random state and delayed
  // perception buffer must agree with an unhooked, unrecorded execution.
  const physicalRecord = { id: id(input), input, speed, states, events, firsts, closest, final,
    maxWorkResidual, maxMotorWorkExcess };
  const signature = hash({ physicalRecord, result: { ...result, frames: undefined, telemetry: undefined },
    bodies: sim.agents.map(a => a.body), intents: sim.intents,
    rng: JSON.stringify(sim.rng), perception: structuredClone(sim.perception) });
  const row = { ...physicalRecord, selection: input.group === 'primary' ? 'fixed-before-outcomes' : 'separate-retrospective-witness',
    profile, profileSha256, attempts, diagnostics, signature };
  const film: TimingTackleFilmPlay | null = record ? { id: id(input), input,
    selection: input.group === 'primary' ? 'preselected-primary-subset' : 'separate-retrospective-witness',
    sourceSha256: sourceBefore, profileSha256, simulationStartedAt: absoluteStartTime,
    initialCarrierPosition, physicalSha256: hash(physicalRecord), recordingVerified: false, result,
    players: sim.agents.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey,
      position: a.player.position, weightLb: a.player.measurables.weightLb,
      heightIn: a.player.measurables.heightIn, ratings: { ...a.player.ratings } })) } : null;
  return { row, film, signature };
}

const output = process.argv[2] ?? 'out/tackle-timing-review/panel.json';
if (process.argv.length > 3) throw new Error('Usage: tackle-timing-review.ts [output.json or output.json.gz]');
const observerChecks: Array<{ id: string; passed: boolean; observed: string; plain: string; recorded: boolean }> = [];
const trials = [...primaryInputs, ...witnessInputs].map(input => {
  const record = filmIds.includes(id(input));
  const observed = trial(input, true, record), plain = trial(input, false, false);
  const passed = observed.signature === plain.signature;
  observerChecks.push({ id: id(input), passed, observed: observed.signature, plain: plain.signature, recorded: record });
  if (!passed) throw new Error(`Observer/recording changed physical/result/RNG state in ${id(input)}`);
  if (observed.film) observed.film.recordingVerified = true;
  return observed;
});
const primary = trials.filter(t => t.row.input.group === 'primary').map(t => t.row);
const witnesses = trials.filter(t => t.row.input.group !== 'primary').map(t => t.row);
const profilesSha256 = hash(trials.map(t => ({ id: t.row.id, profile: t.row.profile })));
const mirrors = [...primaryInputs, ...witnessInputs].filter(i => i.side === 1).map(input => {
  const a = trials.find(t => t.row.id === id(input))!.row;
  const b = trials.find(t => t.row.id === id({ ...input, side: -1 }))!.row;
  const positionError = (left: { pos: { x: number; y: number } }, right: { pos: { x: number; y: number } }) =>
    Math.hypot(left.pos.x - right.pos.x, left.pos.y + right.pos.y - 2 * CENTER_Y);
  return { a: a.id, b: b.id, outcomeAgreement: a.final.outcome === b.final.outcome,
    firstAttemptTimeDifference: a.firsts.attempt === null || b.firsts.attempt === null
      ? a.firsts.attempt === b.firsts.attempt ? 0 : null : Math.abs(a.firsts.attempt - b.firsts.attempt),
    firstWrapTimeDifference: a.firsts.wrap === null || b.firsts.wrap === null
      ? a.firsts.wrap === b.firsts.wrap ? 0 : null : Math.abs(a.firsts.wrap - b.firsts.wrap),
    positionError: Math.max(positionError(a.final.carrier, b.final.carrier), positionError(a.final.defender, b.final.defender)),
    signature: { a: a.signature, b: b.signature } };
});
function summarize(rows: typeof primary) {
  return { encounters: rows.length, unmirroredInputCases: rows.length / 2,
    attempts: rows.filter(r => r.firsts.attempt !== null).length, firstWraps: rows.filter(r => r.firsts.wrap !== null).length,
    tackleWhistles: rows.filter(r => r.final.outcome === 'tackle').length,
    missedAttempts: rows.reduce((sum, r) => sum + r.final.missedTackles, 0),
    brokenHolds: rows.reduce((sum, r) => sum + r.final.brokenTackles, 0),
    stillLiveAtWindowEnd: rows.filter(r => r.final.phase === 'live').length,
    maxWorkResidual: Math.max(0, ...rows.map(r => r.maxWorkResidual)),
    maxMotorWorkExcess: Math.max(0, ...rows.map(r => r.maxMotorWorkExcess)) };
}
const sourceAfter = sourceVersion(), scriptAfter = scriptHash();
if (sourceAfter !== sourceBefore || scriptAfter !== scriptBefore) throw new Error('Engine/diagnostic source changed during tackle timing panel');
const report = { schema: 'tackle-timing-review-v1', startedAt, sourceBefore, sourceAfter,
  scriptSha256: scriptBefore, inputSha256, cohortSha256, profilesSha256,
  method: 'Production 22-body PlaySim.tick, ordinary 50ms decisions, unchanged tackle draws and World/grasp/fall/whistle lifecycle. Straight post-catch carrier, pursuing defender, bystanders parked; traffic case has one idle standing TE. No football call, future obstacle oracle, grip-strength edits, forced outcome or NFL-rate target.',
  limitations: 'Seven encounter states fixed before this panel was run. Two generated roster pairs and two independent play seeds per state; mirrors are determinism checks, not independent evidence. Retrospective crossing witnesses are separate. A live six-second endpoint is a window censor, not an engine timeout. Scratch movement predictions cannot see future traffic, cuts or new commands.',
  timing: 'Raw engine starts at 2 s. Reports subtract 2 s. Attempt/wrap/fall events retain engine tick-label convention; geometry comes after that tick physics, while endpoint observations use tick end. No sub-tick tackle-time precision claim.',
  definitions, primaryInputs, witnessInputs, filmIds,
  recording: { level: 'full', sampleSeconds: dt, observedAndUnrecordedMatches: observerChecks.length,
    recordedAndUnrecordedMatches: observerChecks.filter(c => c.recorded).length,
    signatureIncludes: 'all physical paths and support, all 22 final bodies, intents, result excluding recording, RNG state and perception buffer' },
  observerChecks, primarySummary: summarize(primary), witnessSummary: summarize(witnesses),
  byGeometry: Object.keys(definitions).map(geometry => ({ geometry, ...summarize(primary.filter(r => r.input.geometry === geometry)) })),
  mirrors, primary, witnesses };
const film: TimingTackleFilm = { schema: 'tackle-timing-review-film-v1', sourceBefore, sourceAfter,
  scriptSha256: scriptBefore, inputSha256, cohortSha256, profilesSha256,
  timing: report.timing, plays: trials.flatMap(t => t.film ? [t.film] : []) };
mkdirSync(dirname(output), { recursive: true });
const json = JSON.stringify(report);
writeFileSync(output, output.endsWith('.gz') ? gzipSync(json) : json);
const filmPath = output.replace(/\.gz$/, '').replace(/\.json$/, '') + '-film.json';
writeFileSync(filmPath, JSON.stringify(film));
console.log(JSON.stringify({ source: sourceBefore, scriptSha256: scriptBefore, inputSha256, cohortSha256,
  profilesSha256, primary: report.primarySummary, witnesses: report.witnessSummary,
  observerChecks: observerChecks.length, recordedClips: film.plays.length, filmPath,
  mirrors: { pairs: mirrors.length, maxPositionError: Math.max(...mirrors.map(m => m.positionError)),
    outcomeDisagreements: mirrors.filter(m => !m.outcomeAgreement).length } }));
