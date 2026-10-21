/** Small 22-body, real-tackle follow-up to the diagnosed crossing approach.
 * Both sides use one fixed roster pair, four play seeds, and mirrored setup.
 * Production PlaySim.tick supplies tryTackles/updateBond/afterStep, natural
 * execution rolls, contacts, grips, falls and down-by-contact. The only custom
 * controls are a straight carrier command and a chasing defender. This is not
 * a tackle-rate sample or a free-movement/contact oracle.
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
import { chase } from '../../src/sim/behaviors/common.js';
import { PlaySim } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import type { RatingKey } from '../../src/players/types.js';
import { sourceVersion } from '../../scripts/source-version.js';

const sourceBefore = sourceVersion();
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const inputs = [19, 20, 21, 22].flatMap(seed => [-1, 1].map(side => ({ seed, side })));
const inputSha256 = hash({ rosterSeeds: [19, 20], inputs, carrierStart: [50, CENTER_Y, 6, 0],
  defenderStart: [53, CENTER_Y, 6, 6], absoluteStartTime: 2, maximumTicks: 100 });
export interface ApproachTackleFilmPlay {
  id: string; seed: number; side: number; selection: 'fixed-four-seeds-after-diagnostic-geometry';
  sourceSha256: string; simulationStartedAt: number; initialCarrierPosition: { x: number; y: number };
  physicalSha256: string; recordingVerified: boolean; result: PlayResult;
  players: Array<{ team: 'O' | 'D'; slot: string; name: string; jersey: number; position: string;
    weightLb: number; heightIn: number; ratings: Record<RatingKey, number> }>;
}
export interface ApproachTackleFilm {
  schema: 'approach-tackle-review-film-v1'; sourceBefore: string; sourceAfter: string;
  scriptSha256: string; inputSha256: string; timing: string; plays: ApproachTackleFilmPlay[];
}

function trial(seed: number, side: number, record: boolean) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
    record, recordLevel: 'full', recordEvery: 1 });
  const c = sim.slot('Z')!, d = sim.slot('FS')!;
  // Isolate the already-running post-catch encounter. Park bystanders far
  // from the runner, separated from one another, without changing profiles.
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 };
    a.body.vel = { x: 0, y: 0 }; a.downUntil = 99;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  c.downUntil = d.downUntil = -1;
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: 6, y: 0 }; c.body.facing = 0;
  d.body.pos = { x: 53, y: CENTER_Y + side * 6 }; d.body.vel = { x: 6, y: -side * 6 };
  d.body.facing = Math.atan2(d.vel.y, d.vel.x);
  c.behavior = { kind: 'straight-carrier', update: () => ({ vel: { x: 6, y: 0 }, facing: 0 }) };
  d.behavior = { kind: 'isolated-pursuit', update: () => d.isDown(sim.t)
    ? { vel: { x: 0, y: 0 } } : chase(sim, d, c) };
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  const started = sim.t = 2; sim.world.time = started;
  const initialCarrierPosition = { ...c.pos };
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  let draws = 0;
  const draw = sim.rng.nextU32.bind(sim.rng);
  sim.rng.nextU32 = () => { draws++; return draw(); };
  let firstReach: any = null, closest = Infinity;
  const states = [];
  for (let k = 0; k < 100 && sim.phase === 'live'; k++) {
    sim.tick();
    const distance = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
    closest = Math.min(closest, distance);
    if (!firstReach && distance <= c.profile.radius + d.profile.radius + d.profile.reach) {
      firstReach = { t: sim.t - started, distance, carrierX: c.pos.x,
        relativeSpeed: Math.hypot(c.vel.x - d.vel.x, c.vel.y - d.vel.y) };
    }
    states.push({ t: sim.t - started, distance,
      c: { pos: { ...c.pos }, vel: { ...c.vel }, state: c.body.support!.state },
      d: { pos: { ...d.pos }, vel: { ...d.vel }, state: d.body.support!.state },
      bonded: sim.bond?.tacklers.includes(d) ?? false });
  }
  const events = sim.events.filter(e => ['carrier_contact', 'tackle_wrap', 'missed_tackle', 'broken_tackle', 'fall', 'tackle'].includes(e.type))
    .map(e => ({ ...e, t: e.t - started }));
  const firsts = { reach: firstReach?.t ?? null,
    wrap: events.find(e => e.type === 'tackle_wrap')?.t ?? null,
    carrierFall: events.find(e => e.type === 'fall' && e.a === c.idx)?.t ?? null,
    defenderFall: events.find(e => e.type === 'fall' && e.a === d.idx)?.t ?? null,
    carrierDown: states.find(s => s.c.state === 'down')?.t ?? null,
    defenderDown: states.find(s => s.d.state === 'down')?.t ?? null,
    broken: events.find(e => e.type === 'broken_tackle')?.t ?? null,
    tackle: events.find(e => e.type === 'tackle')?.t ?? null };
  const row = { seed, side, carrier: c.player.id, defender: d.player.id,
    firstReach, firsts, closest, events, final: { elapsed: sim.t - started, phase: sim.phase,
      outcome: sim.outcome, endSpot: sim.endSpot, carrierPos: { ...c.pos },
      carrierState: c.body.support!.state, defenderState: d.body.support!.state,
      missedTackles: sim.stats.missedTackles, brokenTackles: sim.stats.brokenTackles, draws }, states };
  const result = sim.buildResult();
  const signature = hash({ row, result: { ...result, frames: undefined, telemetry: undefined },
    bodies: sim.agents.map(a => a.body), intents: sim.intents,
    // The counting wrapper is an own function; JSON omits it while retaining
    // every primitive RNG state field, without requesting another draw.
    rng: JSON.stringify(sim.rng), perception: structuredClone(sim.perception) });
  const film: ApproachTackleFilmPlay = { id: `AT-S${seed}-${side < 0 ? 'L' : 'R'}`, seed, side,
    selection: 'fixed-four-seeds-after-diagnostic-geometry', sourceSha256: sourceBefore,
    simulationStartedAt: started, initialCarrierPosition, physicalSha256: hash(row),
    recordingVerified: false, result,
    players: sim.agents.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey,
      position: a.player.position, weightLb: a.player.measurables.weightLb,
      heightIn: a.player.measurables.heightIn, ratings: { ...a.player.ratings } })) };
  return { row, signature, film };
}

const output = process.argv[2] ?? 'out/approach-control-review/tackle-review.json';
const referencePath = process.argv[3];
if (process.argv.length > 4) throw new Error('Usage: approach-tackle-review.ts [output.json] [previous-unrecorded-report.json]');
const trials = inputs.map(({ seed, side }) => {
  const observed = trial(seed, side, true), control = trial(seed, side, false);
  if (observed.signature !== control.signature) throw new Error(`Recording changed physical state/result/RNG for ${seed}/${side}`);
  observed.film.recordingVerified = true;
  return observed;
});
const rows = trials.map(t => t.row);
let historicalCheck: { path: string; sourceSha256: string; matched: number } | undefined;
if (referencePath) {
  const previous = JSON.parse(readFileSync(referencePath, 'utf8')) as { sourceBefore: string; sourceAfter: string; rows: unknown[] };
  if (previous.sourceBefore !== sourceBefore || previous.sourceAfter !== sourceBefore
    || hash(previous.rows) !== hash(rows)) throw new Error('Previous unrecorded source/physical rows do not match this run');
  historicalCheck = { path: referencePath, sourceSha256: sourceBefore, matched: rows.length };
}
const sourceAfter = sourceVersion();
if (sourceBefore !== sourceAfter) throw new Error('Engine source changed during approach-tackle review');
const scriptSha = createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
const result = { schema: 2, sourceBefore, sourceAfter, inputSha256, scriptSha,
  method: 'Fixed roster O19/D20, play seeds19/20/21/22, two mirrors. Full production tick (22 bodies), post-catch straight runner, one chaser, bystanders parked. Unmodified tackle rolls and grip physics. Reach is endpoint-sampled; event timestamps retain engine tick convention. No empirical rate claim.',
  recording: { level: 'full', sampleSeconds: .05, matchesUnrecorded: trials.length,
    signatureIncludes: 'all bodies/support, result excluding recordings, carrier/defender paths, intents, RNG state and perception buffer', historicalCheck }, rows };
const film: ApproachTackleFilm = { schema: 'approach-tackle-review-film-v1', sourceBefore, sourceAfter,
  scriptSha256: scriptSha, inputSha256,
  timing: 'Raw engine timestamps start at2s. Position/contact/decision records retain the ordinary50ms tick-label convention; endpoint observations and duration use the tick-end boundary. Viewer subtracts2s only; it does not claim sub-tick contact timing.',
  plays: trials.map(t => t.film) };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result));
const filmPath = output.endsWith('.json') ? output.slice(0, -5) + '-film.json' : output + '-film.json';
writeFileSync(filmPath, JSON.stringify(film));
console.log(JSON.stringify({ source: sourceBefore, recording: result.recording,
  filmPath, rows: rows.map(({ states, ...r }) => r) }));
