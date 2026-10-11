/** Saved-only film for the complete four helper and six coverage witnesses.
 * node --import tsx scripts/export-helper-coverage-film.ts helper-before.json.gz helper-after.json.gz coverage-before.json.gz coverage-after.json.gz FINAL_SOURCE_SHA256 output.html
 * This exporter never simulates, selects outcomes, or reconstructs assignments.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import type { PlayResult } from '../src/sim/types.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';
import { packReplayPlay } from './replay-data.js';

type Saved = Record<string, any>;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baselineSource = 'c2b65e9f02a95a80dde97625d6e2dd1bdf89da327eb15f2eb093860af08e1ff8';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const isHash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function read(path: string): Saved {
  return JSON.parse(gunzipSync(readFileSync(path)).toString());
}
function same(a: unknown, b: unknown, label: string): void {
  if (hash(a) !== hash(b)) throw new Error(`Saved comparison mismatch: ${label}`);
}
const args = process.argv.slice(2);
if (args.length !== 6 || !args.slice(0, 4).every(p => p.endsWith('.json.gz'))
  || !isHash(args[4]) || args[4] === baselineSource || !args[5].endsWith('.html'))
  throw new Error('Usage: export-helper-coverage-film.ts helper-before.json.gz helper-after.json.gz coverage-before.json.gz coverage-after.json.gz FINAL_SOURCE_SHA256 output.html');
const paths = args.slice(0, 4).map(path => resolve(path));
const sources = [baselineSource, args[4]], output = resolve(args[5]);
const films = [paths.slice(0, 2).map(read), paths.slice(2).map(read)];
const labels = ['Baseline: bf8a487', 'Helper fit and coverage'];
const groups = ['Joined-helper footwork', 'Coverage continuation'];
const expected = [
  ['DRAW-Over-R-S3', 'DRAW-Over-L-S3', 'IZ-Over-R-S3', 'IZ-Over-L-S3'],
  ['DA-R2-curl_flat-cover2-R', 'DA-R2-curl_flat-cover3-R', 'DA-R2-pa_post_dig-cover3-R',
    'DA-R2-curl_flat-cover2-L', 'DA-R2-curl_flat-cover3-L', 'DA-R2-pa_post_dig-cover3-L'],
];

function recorded(result: PlayResult, id: string): void {
  if (!result.frames || result.frames.length < 2 || result.frames[0].t !== 0
    || result.telemetry?.version !== 1 || result.telemetry.level !== 'full'
    || result.telemetry.frames.length !== result.frames.length)
    throw new Error(`Missing complete native recording: ${id}`);
  for (let i = 0; i < result.frames.length; i++) {
    const f = result.frames[i], t = result.telemetry.frames[i];
    if (f.agents.length !== 66 || f.ball.length !== 3 || t.agents.length !== 22 || f.t !== t.t
      || !Number.isFinite(f.t) || [...f.agents, ...f.ball].some(v => !Number.isFinite(v))
      || f.carrier < -1 || f.carrier >= 22 || (i > 0 && f.t <= result.frames[i - 1].t))
      throw new Error(`Invalid recorded native frame: ${id}`);
  }
}
function players(row: Saved, group: number): Saved[] {
  if (!Array.isArray(row.players) || row.players.length !== 22)
    throw new Error(`Missing complete saved player metadata: ${row.id}`);
  return row.players.map((a: Saved, idx: number) => {
    const physical = group === 0 ? row.physicalInitial?.[idx] : null;
    const profile = group === 0 ? physical?.profile : a.profile;
    if (a.idx !== idx || !['O', 'D'].includes(a.team) || !a.slot || !a.player?.firstName || !a.player?.lastName
      || !profile || !Number.isFinite(profile.massKg) || !Number.isFinite(a.player?.measurables?.weightLb)
      || !a.player?.ratings || (physical && (physical.idx !== idx || physical.slot !== a.slot || physical.team !== a.team)))
      throw new Error(`Incomplete saved player card: ${row.id}/${idx}`);
    return { idx, slot: a.slot, team: a.team, player: a.player, profile };
  });
}
function setup(row: Saved, group: number): Saved {
  const s = row.setup;
  if (!s?.offCall?.formation?.id || !s.offCall.formation.name || !s.offCall.label
    || !s.defCall?.front?.id || !s.defCall.front.name || !s.defCall.coverage?.id || !s.defCall.coverage.name
    || !s.defCall.label || !s.defCall.personnel || !Number.isInteger(s.down) || s.down < 1 || s.down > 4
    || s.seed !== 3 || s.los !== 40 || s.firstDownX !== 50 || !Number.isFinite(s.ballY)
    || typeof s.offCall.flip !== 'boolean' || s.offCall.kind !== (group === 0 ? 'run' : 'pass'))
    throw new Error(`Missing exact saved constructor metadata: ${row.id}`);
  const declared = group === 0 ? row.input : row.case;
  same(s.offCall.formation.id, declared.formation, `${row.id} actual formation`);
  same(s.offCall.flip, declared.flip, `${row.id} actual direction`);
  same(s.defCall.coverage.id, declared.coverage, `${row.id} actual coverage`);
  same(s.defCall.front.id, group === 0 ? declared.front : 'over', `${row.id} actual front`);
  same(group === 0 ? s.offCall.run?.id : s.offCall.pass?.id,
    group === 0 ? declared.run : declared.concept, `${row.id} actual concept`);
  if (group === 0) for (const field of ['los', 'firstDownX', 'ballY', 'seed'])
    same(s[field], declared[field], `${row.id} actual ${field}`);
  return s;
}

// All selection, source and observer checks precede output construction.
for (let group = 0; group < 2; group++) for (let phase = 0; phase < 2; phase++) {
  const film = films[group][phase];
  if (film.sourceBefore !== sources[phase] || film.sourceAfter !== sources[phase]
    || !isHash(group === 0 ? film.collectorSha256 : film.toolSha256)
    || !Array.isArray(film.rows) || film.rows.length !== expected[group].length
    || (group === 0 && film.schema !== 'native-helper-surface-review-v1')
    || (group === 1 && film.schema !== 'retained-passing-tail-panel-v2'))
    throw new Error(`Expected complete source-pinned native packet: ${paths[group * 2 + phase]}`);
  same(film.rows.map((row: Saved) => row.id), expected[group], `${groups[group]} fixed IDs and order`);
  for (const row of film.rows) {
    if (!row.observerVerified) throw new Error(`Observer control failed: ${row.id}`);
    if (group === 0) {
      if (!isHash(row.observed?.sha256) || row.observed.sha256 !== row.plain?.sha256
        || row.plainCheckpointSha256 !== hash(row.checkpoints)
        || row.physicalInitialSha256 !== hash(row.physicalInitial))
        throw new Error(`Missing helper tick and ordinary-run equality: ${row.id}`);
      same(row.observed, row.plain, `${row.id} complete ordinary signature and next RNG`);
      same(row.input.roster, [31, 32], `${row.id} fixed helper rosters`);
      same(row.input.strength, .55, `${row.id} fixed helper strengths`);
    } else {
      if (!isHash(row.executionSha256) || !isHash(row.plainExecutionSha256)
        || row.executionSha256 !== row.plainExecutionSha256
        || !Array.isArray(row.physicalInitial) || row.physicalInitial.length !== 22
        || row.profilesSha256 !== hash(row.players.map((a: Saved) => ({ slot: a.slot, player: a.player, profile: a.profile }))))
        throw new Error(`Missing coverage ordinary-run equality/profile pin: ${row.id}`);
      same(row.nextRng, row.plainNextRng, `${row.id} ordinary next RNG`);
    }
    players(row, group); setup(row, group); recorded(row.result, row.id);
  }
}
same(films[0][0].collectorSha256, films[0][1].collectorSha256, 'helper collector bytes');
same(films[1][0].toolSha256, films[1][1].toolSha256, 'coverage collector bytes');
for (let group = 0; group < 2; group++) for (let i = 0; i < expected[group].length; i++) {
  const [a, b] = films[group].map(film => film.rows[i]);
  same(a[group === 0 ? 'input' : 'case'], b[group === 0 ? 'input' : 'case'], `${a.id} native inputs`);
  same(a.setup, b.setup, `${a.id} exact constructor metadata`);
  same(players(a, group), players(b, group), `${a.id} complete cards and physical profiles`);
  same(a.result.frames[0], b.result.frames[0], `${a.id} initial recorded bodies and ball`);
  same(a.physicalInitial, b.physicalInitial, `${a.id} saved initial body/support/mind descriptions`);
  if (group === 0) {
    same(a.physicalInitialSha256, b.physicalInitialSha256, `${a.id} original live initial-state pin`);
  } else {
    same(a.offAlign, b.offAlign, `${a.id} actual offensive alignment`);
    same(a.initialRng, b.initialRng, `${a.id} initial RNG`);
  }
}

const plays: Array<ReturnType<typeof packReplayPlay>> = [];
const coverageCatalog: Record<string, string> = {}, frontCatalog: Record<string, string> = {}, formationCatalog: Record<string, string> = {};
for (let group = 0; group < 2; group++) for (let i = 0; i < expected[group].length; i++) for (let phase = 0; phase < 2; phase++) {
  const p = films[group][phase].rows[i], s = p.setup, result = p.result as PlayResult;
  const formation = s.offCall.formation, concept = group === 0 ? s.offCall.run : s.offCall.pass;
  const coverage = s.defCall.coverage, front = s.defCall.front, kind = group === 0 ? 'run' : 'pass';
  const cards = players(p, group);
  coverageCatalog[coverage.id] = coverage.name; frontCatalog[front.id] = front.name; formationCatalog[formation.id] = formation.name;
  // Sparse constructor descriptions omit optional call details. Undefined
  // values disappear in JSON; the exporter does not fill them from a catalog.
  const plan: Saved = { personnel: formation.personnel, formation: formation.id, qb: formation.qb,
    concept: group === 0 ? concept.scheme : concept.id,
    playAction: group === 0 ? false : (concept.family ? concept.family === 'playaction' : undefined),
    audible: false, defPersonnel: s.defCall.personnel, front: front.id, coverage: coverage.id,
    called: coverage.id, family: coverage.family, shell: coverage.shell, pressure: !!s.defCall.pressure };
  const log: PlayLog = { index: plays.length, quarter: 0, clock: 0, offense: 'OFF', down: s.down,
    distance: s.firstDownX - s.los, yardline: s.los - 10, kind,
    call: `${labels[phase]} · ${formation.name} — ${concept.name} (${s.offCall.flip ? 'left' : 'right'})`,
    defense: `${front.name} ${coverage.name} · ${s.defCall.personnel}`,
    text: `${labels[phase]} · ${p.id} · source ${sources[phase].slice(0, 12)} · ${result.outcome} · ${result.offenseYards.toFixed(2)} yd. `
      + `Native constructor labels: offense “${s.offCall.label}”; defense “${s.defCall.label}”. `
      + 'All predeclared witness inputs, including unchanged and adverse outcomes, are included. Select a player for recorded jobs, requested movement, contact and delayed cues; body facing is not measured eye direction.',
    yards: result.offenseYards, score: { home: 0, away: 0 }, stats: result.stats, outcome: result.outcome,
    plan: plan as PlayLog['plan'],
    replay: { los: s.los, firstDownX: s.firstDownX, flip: s.offCall.flip,
      frames: result.frames!, events: result.events, telemetry: result.telemetry,
      players: cards.map(a => ({ team: a.team, slot: a.slot, name: `${a.player.firstName} ${a.player.lastName}`,
        jersey: a.player.jersey, pos: a.player.position, weightLb: a.player.measurables.weightLb })),
      profiles: cards.map(a => ({ position: a.player.position, heightIn: a.player.measurables.heightIn,
        weightLb: a.player.measurables.weightLb, ratings: a.player.ratings })) } };
  const packed = { ...packReplayPlay(log, group * 2 + phase), id: `${phase ? 'F' : 'B'}-${p.id}`,
    fixtureId: p.id, fixtureSeed: s.seed, sourceLabel: labels[phase], sourceSha256: sources[phase],
    filmSelection: 'all-predeclared-native-witnesses', comparisonCohort: group === 0 ? 'helper' : 'coverage',
    metadataProvenance: 'Exact constructor metadata and complete player cards copied from this saved native packet; paired physical profiles and initial bodies/ball verified.' };
  plays.push(packed);
}
if (plays.length !== 20 || new Set(plays.map(p => p.id)).size !== 20)
  throw new Error('Expected exactly twenty unique saved native clips');
const context = '20 paired native clips: all four predeclared Draw/Inside Zone helper-footwork inputs and all six retained Curl-Flat/Post-Dig coverage witnesses, including both directions. '
  + 'B/F identifies each exact baseline/current pair. The generated rosters, profiles and initial bodies/ball match within each pair. '
  + 'These deliberately selected diagnostic witnesses are not NFL call frequencies or league statistics. Every retained witness is included, including unchanged and adverse results. '
  + 'No synthetic assignments, forced bodies, outcome filtering, or counterfactual clips. Select a player for recorded state, decisions, contacts and delayed possession cues. Body-facing ticks are not measured eyes.';
const data = { meta: { title: 'Helper footwork and coverage: native baseline / current', sourceSha256: sources[1],
  sourceComparison: labels.map((label, phase) => ({ label, sourceSha256: sources[phase] })), telemetryLevel: 'full', cohort: context, seed: 3,
  savedInputs: paths.map(path => ({ path, sha256: fileHash(path) })), exporterSha256: fileHash(fileURLToPath(import.meta.url)),
  final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Controlled Offense', abbr: 'OFF', color: '#1d4f91', text: '#ffffff' },
  away: { name: 'Controlled Defense', abbr: 'DEF', color: '#a3302a', text: '#ffffff' } },
  games: groups.flatMap(group => labels.map((label, phase) => ({ label: `${label} · ${group}`, seed: 3,
    sourceSha256: sources[phase], final: { home: 0, away: 0 }, quarters: [] }))),
  plays: compactReplayPlays(plays), catalog: { coverage: coverageCatalog, front: frontCatalog, formation: formationCatalog } };
const templatePath = resolve(root, 'viewer/replay.template.html'), template = readFileSync(templatePath, 'utf8');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Replay template missing data marker');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
console.log(JSON.stringify({ output, clips: plays.length, nativePairs: 10, sources, bytes: Buffer.byteLength(html),
  exporterSha256: data.meta.exporterSha256, templateSha256: fileHash(templatePath), savedInputReceipts: data.meta.savedInputs,
  simulation: false, outcomeSelection: false, counterfactuals: false }, null, 2));
