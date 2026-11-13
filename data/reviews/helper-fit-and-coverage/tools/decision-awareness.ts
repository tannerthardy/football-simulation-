/** Fixed native awareness guards; no sampled picture is requested by this observer.
 * node --import tsx scripts/diag/decision-awareness.ts [output.json.gz]
 * Run the same tool on frozen source phases. These are balanced diagnostic calls,
 * not a naturally selected NFL call mix or an eye-tracking measurement.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/decision-awareness/native.json.gz';
if (process.argv.length > 3) throw new Error('Usage: decision-awareness.ts [output.json.gz]');
const sourceBefore = sourceVersion();
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const cases = [
  { formation: 'gun_trips_11', concept: 'four_verts' },
  { formation: 'gun_bunch_11', concept: 'mesh' },
  { formation: 'gun_doubles_11', concept: 'curl_flat' },
  { formation: 'ace_12', concept: 'pa_post_dig' },
];
const cohort = { rosterSeedPairs: [[31, 32], [41, 42]], strength: .55, seed: 3,
  cases, coverages: ['cover0', 'cover1', 'cover2', 'cover3', 'cover4', 'cover6'],
  flips: [false, true], los: 40, ballY: CENTER_Y,
  declaration: 'All 96 inputs and six films selected before candidate outcomes.' };
const teams = cohort.rosterSeedPairs.map(([o, d]) => ({
  offense: generateTeam(new Rng(o), 'Awareness offense', 'AOF', { strength: cohort.strength }),
  defense: generateTeam(new Rng(d), 'Awareness defense', 'ADF', { strength: cohort.strength }),
}));
function create(roster: number, c: typeof cases[number], coverage: string, flip: boolean, record = false) {
  const formation = FORMATION_BY_ID[c.formation];
  return new PlaySim({ offense: pickOffense(teams[roster].offense, formation.personnel),
    defense: pickDefense(teams[roster].defense, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: PASS_BY_ID[c.concept], label: `${c.formation}/${c.concept}` },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage],
      pressure: coverage === 'cover0' ? PRESSURE_BY_ID.zero_6 : null,
      zoneStyle: 'match', label: `Over ${coverage}` },
    los: cohort.los, ballY: cohort.ballY, firstDownX: 50, seed: cohort.seed,
    record, recordLevel: 'full', recordEvery: 1, audibles: false });
}
function signature(sim: PlaySim, result: PlayResult) {
  return hash({ result: { ...result, frames: undefined, telemetry: undefined },
    bodies: sim.agents.map(a => a.body), intents: sim.intents,
    minds: sim.agents.map(a => a.mind), rng: { ...sim.rng } });
}
const rows: Array<Record<string, any>> = [], films: unknown[] = [];
for (let roster = 0; roster < teams.length; roster++) for (const c of cases)
  for (const coverage of cohort.coverages) for (const flip of cohort.flips) {
    const id = `DA-R${roster + 1}-${c.concept}-${coverage}-${flip ? 'L' : 'R'}`;
    const film = roster === 0 && !flip && c.concept === 'four_verts';
    const sim = create(roster, c, coverage, flip, film);
    const profilesSha256 = hash(sim.agents.map(a => ({ slot: a.slot, player: a.player, profile: a.profile })));
    const original = sim.world.step;
    const samples: unknown[] = [];
    let maxStress = 0, minFocus = 1;
    sim.world.step = function (intents, dt) {
      maxStress = Math.max(maxStress, sim.qb.mind.stress);
      minFocus = Math.min(minFocus, sim.qb.mind.focus);
      // Existing belief and state only; no extra observe/estimate/see calls.
      samples.push({ t: sim.t, carrier: sim.carrier?.slot ?? null, ball: sim.ball.kind,
        qb: { focus: sim.qb.mind.focus, stress: sim.qb.mind.stress,
          belief: { ...sim.qbMind.belief }, identified: sim.qbMind.identified },
        corners: sim.defense.filter(a => a.slot.startsWith('CB')).map(a => ({
          slot: a.slot, read: a.recog?.read, pPass: a.recog?.pPass(),
          focus: a.mind.focus, stress: a.mind.stress })),
      });
      return original.call(this, intents, dt);
    };
    let result: PlayResult;
    try { result = sim.run(); } finally { sim.world.step = original; }
    const executionSha256 = signature(sim, result);
    const plain = create(roster, c, coverage, flip);
    const observerVerified = executionSha256 === signature(plain, plain.run());
    if (!observerVerified) throw new Error(`Observer/recording changed ${id}`);
    rows.push({ id, roster: cohort.rosterSeedPairs[roster], ...c, coverage, flip,
      profilesSha256, outcome: result.outcome, offenseYards: result.offenseYards,
      duration: result.duration, stats: result.stats, penalty: result.penalty,
      qbReport: result.stats.qbRead ?? null, maxStress, minFocus, executionSha256,
      observerVerified, samples, events: result.events });
    if (film) films.push({ id, result, players: sim.agents.map(a => ({ slot: a.slot, team: a.team, player: a.player })) });
  }
const attempted = rows.filter(r => r.stats.attempted);
const summarize = (rs: typeof rows) => ({ snaps: rs.length,
  attempts: rs.filter(r => r.stats.attempted).length,
  completions: rs.filter(r => r.stats.completed).length,
  sacks: rs.filter(r => r.stats.sacked).length,
  interceptions: rs.filter(r => r.stats.interceptedBy).length,
  meanOffenseYards: rs.reduce((n, r) => n + r.offenseYards, 0) / rs.length,
  explosive20: rs.filter(r => r.offenseYards >= 20).length,
  physicalTimeouts: rs.filter(r => r.outcome === 'timeout').length });
const sourceAfter = sourceVersion();
if (sourceBefore !== sourceAfter) throw new Error('Source changed during native awareness panel');
const report = { schema: 'decision-awareness-native-v1', sourceBefore, sourceAfter,
  node: process.version, toolSha256: createHash('sha256').update(readFileSync('scripts/diag/decision-awareness.ts')).digest('hex'),
  sharedWorldSha256: createHash('sha256').update(readFileSync('src/physics/world.ts')).digest('hex'),
  cohort, rostersSha256: hash(teams),
  definitions: { observations: 'Read existing state just before native World step; never request a picture or consume RNG.',
    endpoints: 'Native finishes; timeouts reported separately. Offensive possession yards before game penalty enforcement.',
    awareness: 'Belief, focus and stress are model state; facing/intent and read labels are not measured eyes or thought.',
    sample: 'Balanced fixed inputs, two generated roster pairs. No NFL outcome fitting.' },
  summary: { ...summarize(rows), observerVerified: rows.filter(r => r.observerVerified).length,
    meanTimeToThrow: attempted.length ? attempted.reduce((n, r) => n + r.stats.timeToThrow, 0) / attempted.length : null,
    byCoverage: Object.fromEntries(cohort.coverages.map(c => [c, summarize(rows.filter(r => r.coverage === c))])) }, rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, gzipSync(JSON.stringify(report), { level: 9 }));
writeFileSync(output.replace(/\.json\.gz$/, '-film.json.gz'), gzipSync(JSON.stringify({
  schema: 'decision-awareness-film-v1', sourceBefore, sourceAfter, toolSha256: report.toolSha256, plays: films }), { level: 9 }));
console.log(JSON.stringify({ output, sourceBefore, sourceAfter, summary: report.summary }, null, 2));
