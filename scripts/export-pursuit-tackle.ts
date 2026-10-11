/** Saved-only pursuit/tackle comparison: never simulates or selects by result.
 * node --import tsx scripts/export-pursuit-tackle.ts packet-root output.html
 * Or: baseline-run-film final-run-film baseline-pass-film final-pass-film output.html
 * Companion reports replace -film.json.gz with .json.gz. Optional overrides:
 * --baseline-root DIR, --run-baseline-report FILE, --run-final-report FILE,
 * --pass-baseline-report FILE, --pass-final-report FILE,
 * --cue-baseline FILE, --cue-final FILE, --cue-players FILE, --title TEXT.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import type { PlayResult } from '../src/sim/types.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, COVERAGES, FRONT_BY_ID, FRONTS } from '../src/playbook/defense.js';
import { FORMATION_BY_ID, FORMATIONS } from '../src/playbook/formations.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';
import { packReplayPlay } from './replay-data.js';

type Saved = Record<string, any>;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
function read(p: string): Saved {
  const bytes = readFileSync(p);
  return JSON.parse((p.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString());
}
function requireMatch(a: unknown, b: unknown, label: string) {
  if (hash(a) !== hash(b)) throw new Error(`Saved input/profile mismatch: ${label}`);
}
const positional: string[] = [], flags: Record<string, string> = {};
const allowed = ['baseline-root', 'run-baseline-report', 'run-final-report', 'pass-baseline-report',
  'pass-final-report', 'cue-baseline', 'cue-final', 'cue-players', 'title'];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!arg.startsWith('--')) positional.push(arg);
  else {
    const key = arg.slice(2), value = args[++i];
    if (!allowed.includes(key) || key in flags || !value || value.startsWith('--'))
      throw new Error(`Invalid export option: ${arg}`);
    flags[key] = value;
  }
}
if (![2, 5].includes(positional.length) || !positional.at(-1)!.endsWith('.html'))
  throw new Error('Usage: export-pursuit-tackle.ts packet-root output.html [options]; or baseline-run-film final-run-film baseline-pass-film final-pass-film output.html [options]');
const packet = positional.length === 2 ? resolve(positional[0]) : resolve(root, 'data/reviews/pursuit-and-tackle');
const baselineRoot = resolve(flags['baseline-root'] ?? resolve(root, 'data/reviews/decision-awareness'));
const paths = positional.length === 2
  ? [resolve(baselineRoot, 'runs/final-film.json.gz'), resolve(packet, 'runs/final-film.json.gz'),
    resolve(baselineRoot, 'passing/final-film.json.gz'), resolve(packet, 'passing/final-film.json.gz')]
  : positional.slice(0, 4).map(p => resolve(p));
const output = resolve(positional.at(-1)!);
const companion = (p: string) => {
  if (!p.endsWith('-film.json.gz')) throw new Error(`Expected *-film.json.gz: ${p}`);
  return p.replace(/-film\.json\.gz$/, '.json.gz');
};
const keys = ['run-baseline-report', 'run-final-report', 'pass-baseline-report', 'pass-final-report'];
const phases = paths.map((path, i) => ({ path, film: read(path),
  reportPath: resolve(flags[keys[i]] ?? companion(path)), report: read(resolve(flags[keys[i]] ?? companion(path))) }));
const cuePaths = [resolve(flags['cue-baseline'] ?? resolve(packet, 'witnesses/cue-boundary-baseline.json.gz')),
  resolve(flags['cue-final'] ?? resolve(packet, 'witnesses/cue-boundary-final.json.gz'))];
const cueFilms = cuePaths.map(read);
const cuePlayersPath = resolve(flags['cue-players'] ?? resolve(packet, 'witnesses/cue-boundary-players.json'));
const cueMetadata = read(cuePlayersPath);
const labels = ['Baseline', 'Final'];
const sources = phases.slice(0, 2).map(p => p.film.sourceBefore as string);
if (sources[0] === sources[1]) throw new Error('Comparison requires distinct saved baseline/final sources');

function recording(result: PlayResult, count: number, id: string) {
  if (count !== 22 || !result.frames || result.frames.length < 2 || result.frames[0].t !== 0
    || result.telemetry?.version !== 1 || result.telemetry.level !== 'full' || !result.telemetry.frames.length)
    throw new Error(`Missing full native recording: ${id}`);
  for (let i = 0; i < result.frames.length; i++) {
    const frame = result.frames[i];
    if (frame.agents.length !== 66 || frame.ball.length !== 3 || !Number.isFinite(frame.t)
      || [...frame.agents, ...frame.ball].some(v => !Number.isFinite(v))
      || frame.carrier < -1 || frame.carrier >= 22 || (i > 0 && frame.t <= result.frames[i - 1].t))
      throw new Error(`Invalid recorded player/ball frame: ${id}`);
  }
  if (result.telemetry.frames.some(f => f.agents.length !== 22 || !Number.isFinite(f.t)))
    throw new Error(`Invalid full telemetry: ${id}`);
}
function pinned(phase: typeof phases[number], filmSchema: string, reportSchema: string, tool: string, source: string) {
  const { film, report } = phase;
  if (film.schema !== filmSchema || report.schema !== reportSchema || !/^[a-f0-9]{64}$/.test(source)
    || film.sourceBefore !== source || film.sourceAfter !== source
    || report.sourceBefore !== source || report.sourceAfter !== source || film[tool] !== report[tool])
    throw new Error(`Unpinned/mismatched saved film and report: ${phase.path}`);
}
const runIds = [
  ['iz_strong', 'over', 3], ['power', 'under', 3], ['counter', 'odd', 11],
  ['duo', 'odd', 11], ['split_zone', 'tite', 3],
].flatMap(([run, front, seed]) => ['R', 'L'].map(side => `CT-R1-${run}-${front}-${side}-S${seed}`));
const passIds = ['cover0', 'cover1', 'cover2', 'cover3', 'cover4', 'cover6'].map(c => `DA-R1-four_verts-${c}-R`);
for (let k = 0; k < 2; k++) {
  const phase = phases[k];
  pinned(phase, 'combo-transfer-film-v1', 'combo-transfer-review-v1', 'collectorSha256', sources[k]);
  requireMatch(phase.film.plays.map((p: Saved) => p.id), runIds, 'ten fixed run films');
  requireMatch(phase.report.filmIds, runIds, 'run companion film IDs');
  const rows = [...phase.report.trials, ...phase.report.supplementalTrials] as Saved[];
  if (phase.report.trials.length !== 160 || phase.report.supplementalTrials.length !== 2
    || rows.some(r => !r.observerVerified || r.observedSignature !== r.plainSignature))
    throw new Error('Expected 162 neutral run-panel recording controls');
  for (const p of phase.film.plays as Saved[]) {
    const r = rows.find(r => r.id === p.id);
    if (!r || p.selection !== 'fixed-before-outcomes') throw new Error(`Missing fixed run input: ${p.id}`);
    recording(p.result, p.players.length, p.id);
    requireMatch({ ...p.result, frames: undefined, telemetry: undefined }, r.result, `${p.id} recorded result/companion`);
  }
  const pass = phases[k + 2];
  pinned(pass, 'decision-awareness-film-v1', 'decision-awareness-native-v1', 'toolSha256', sources[k]);
  requireMatch(pass.film.plays.map((p: Saved) => p.id), passIds, 'six fixed passing films');
  if (pass.report.rows.length !== 96 || pass.report.rows.some((r: Saved) => !r.observerVerified))
    throw new Error('Expected 96 neutral passing-panel controls');
  for (const p of pass.film.plays as Saved[]) {
    const r = pass.report.rows.find((r: Saved) => r.id === p.id);
    if (!r) throw new Error(`Missing passing companion: ${p.id}`);
    recording(p.result, p.players.length, p.id);
    for (const key of ['outcome', 'offenseYards', 'duration', 'stats', 'events'])
      requireMatch(p.result[key], r[key], `${p.id} recorded ${key}/companion`);
  }
}
for (const [a, b, rowsKey, profileKey] of [[0, 1, 'trials', 'profileSha256'], [2, 3, 'rows', 'profilesSha256']] as const) {
  requireMatch(phases[a].report.cohort, phases[b].report.cohort, `${rowsKey} cohort`);
  requireMatch(phases[a].film[a === 0 ? 'collectorSha256' : 'toolSha256'], phases[b].film[a === 0 ? 'collectorSha256' : 'toolSha256'], `${rowsKey} tool`);
  const before = rowsKey === 'trials' ? [...phases[a].report.trials, ...phases[a].report.supplementalTrials] : phases[a].report.rows;
  const after = rowsKey === 'trials' ? [...phases[b].report.trials, ...phases[b].report.supplementalTrials] : phases[b].report.rows;
  requireMatch(before.map((r: Saved) => [r.id, r[profileKey]]), after.map((r: Saved) => [r.id, r[profileKey]]), `${rowsKey} all cohort profiles`);
  for (let i = 0; i < phases[a].film.plays.length; i++) {
    const x = phases[a].film.plays[i], y = phases[b].film.plays[i];
    requireMatch(x.players, y.players, `${x.id} saved players`);
    requireMatch(x.result.frames[0], y.result.frames[0], `${x.id} initial recorded geometry`);
    if (a === 0) for (const key of ['id', 'roster', 'run', 'front', 'flip', 'seed', 'selection', 'offCall', 'defCall', 'los', 'firstDownX'])
      requireMatch(x[key], y[key], `${x.id}/${key}`);
  }
}
const expectedCues = ['CT-R1-split_zone-over-L-S11', 'CT-R1-split_zone-odd-R-S11', 'CT-R1-iz_strong-over-R-S3'];
if (cueMetadata.schema !== 'tackle-cue-matched-player-metadata-v1' || cueMetadata.source !== sources[1]
  || cueMetadata.rows.length !== 3 || cueMetadata.collectorSha256 !== cueFilms[1].collectorSha256)
  throw new Error('Missing verified supplemental cue player metadata');
for (let k = 0; k < 2; k++) {
  const film = cueFilms[k];
  if (film.schema !== 'tackle-cue-boundary-review-v1' || film.source !== sources[k]) throw new Error('Cue source/schema mismatch');
  requireMatch(film.rows.map((r: Saved) => r.id), expectedCues, 'three retained cue IDs');
  for (let i = 0; i < 3; i++) {
    const p = film.rows[i], m = cueMetadata.rows[i], final = cueFilms[1].rows[i];
    if (!p.observerVerified || p.source !== sources[k] || m.baselineSource !== sources[0] || m.finalSource !== sources[1]
      || !m.slotsProfilesRatingsIdentityVerified || !m.metadataStableDuringRun || !m.baselineCueSlotsVerified
      || !m.finalNativeResultEventsVerified || !final.native32ProfileVerified || final.profileSha256 !== m.profileSha256)
      throw new Error(`Unverified cue/profile pairing: ${p.id}`);
    requireMatch(p.input, m.input, `${p.id} supplemental metadata input`);
    requireMatch(p.slots, m.players.map((a: Saved) => a.slot), `${p.id} recorded slot order`);
    requireMatch(final.players, m.players, `${p.id} final player metadata`);
    requireMatch(final.playersAfter, m.players, `${p.id} unchanged player metadata`);
    requireMatch(cueFilms[0].rows[i].result.frames[0], final.result.frames[0], `${p.id} initial cue geometry`);
    recording(p.result, m.players.length, p.id);
  }
}

function playerCards(players: Saved[]) {
  return players.map(a => a.player ? { team: a.team, slot: a.slot,
    name: `${a.player.firstName} ${a.player.lastName}`, jersey: a.player.jersey, position: a.player.position,
    weightLb: a.player.measurables.weightLb, heightIn: a.player.measurables.heightIn, ratings: a.player.ratings }
    : a);
}
const plays: Array<ReturnType<typeof packReplayPlay>> = [];
function add(p: Saved, result: PlayResult, players: Saved[], phase: number, cohort: number,
  formationId: string, concept: string, frontId: string, coverageId: string,
  flip: boolean, seed: number, selection: string, selectionText: string, metadataProvenance?: string) {
  const formation = FORMATION_BY_ID[formationId], front = FRONT_BY_ID[frontId], coverage = COVERAGE_BY_ID[coverageId];
  if (!formation || !front || !coverage) throw new Error(`Missing installed playbook metadata: ${p.id}`);
  const cards = playerCards(players), run = RUN_BY_ID[concept], pass = PASS_BY_ID[concept];
  if (!run && !pass) throw new Error(`Missing installed concept: ${p.id}`);
  const kind = run ? 'run' : 'pass', game = cohort * 2 + phase;
  const title = `${formation.name} · ${(run ?? pass).name}`;
  const log: PlayLog = { index: plays.length, quarter: 1, clock: 900, offense: 'OFF', down: 1, distance: 10,
    yardline: 30, kind, call: `${labels[phase]} · ${p.offCall ?? title}`, defense: p.defCall ?? `${front.name} · ${coverage.name}`,
    text: `${labels[phase]} · ${p.id} · source ${sources[phase].slice(0, 12)} · ${result.outcome} · ${result.offenseYards.toFixed(2)} yd · ${selectionText}`
      + (metadataProvenance ? ` · ${metadataProvenance}` : ''),
    yards: result.offenseYards, score: { home: 0, away: 0 }, stats: result.stats, outcome: result.outcome,
    plan: { personnel: formation.personnel, formation: formationId, qb: formation.qb, concept: run?.scheme ?? concept,
      playAction: pass?.family === 'playaction', audible: false, defPersonnel: kind === 'pass' ? 'nickel' : front.personnel[0],
      front: frontId, coverage: coverageId, called: coverageId, family: coverage.family,
      shell: coverage.shell, pressure: kind === 'pass' && coverageId === 'cover0' },
    replay: { los: p.los ?? 40, firstDownX: p.firstDownX ?? 50, flip,
      frames: result.frames!, events: result.events, telemetry: result.telemetry,
      players: cards.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.jersey, pos: a.position, weightLb: a.weightLb })),
      profiles: cards.map(a => ({ position: a.position, heightIn: a.heightIn, weightLb: a.weightLb, ratings: a.ratings })) } };
  const packed = { ...packReplayPlay(log, game), id: `${phase ? 'F' : 'B'}-${cohort === 2 ? 'CUE-' : ''}${p.id}`,
    fixtureId: p.id, fixtureSeed: seed, sourceLabel: labels[phase], sourceSha256: sources[phase],
    filmSelection: selection, comparisonCohort: ['ordinary-runs', 'ordinary-passes', 'retained-cues'][cohort],
    metadataProvenance: metadataProvenance ?? 'Player cards copied from this saved film.' };
  plays.push(packed);
}
for (let i = 0; i < 10; i++) for (let k = 0; k < 2; k++) {
  const p = phases[k].film.plays[i], row = phases[k].report.trials.find((r: Saved) => r.id === p.id);
  add(p, p.result, p.players, k, 0, row.formation, p.run, p.front, 'cover3', p.flip, p.seed,
    p.selection, 'Ordinary run film selected before outcomes; fixed controlled input, not league statistics.');
}
for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) {
  const p = phases[k + 2].film.plays[i], row = phases[k + 2].report.rows.find((r: Saved) => r.id === p.id);
  add(p, p.result, p.players, k, 1, row.formation, row.concept, 'over', row.coverage, row.flip,
    phases[k + 2].report.cohort.seed, 'fixed-before-outcomes',
    'Ordinary passing film selected before outcomes; fixed controlled input, not league statistics.');
}
for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) {
  const p = cueFilms[k].rows[i], m = cueMetadata.rows[i], retrospective = p.input.run === 'split_zone';
  add(p, p.result, m.players, k, 2, retrospective ? 'gun_wing_12' : 'ace_11', p.input.run,
    p.input.front, 'cover3', p.input.flip, p.input.seed,
    retrospective ? 'retrospective-explosive-cue-witness' : 'predeclared-ordinary-cue-control',
    retrospective ? 'Retrospective witness originally selected after viewing an earlier baseline; not a representative sample.'
      : 'Predeclared ordinary cue-boundary control; higher recording rate than ordinary film.',
    k === 0 ? 'Baseline cards use supplemental final metadata verified against both saved native profile sets and baseline slot order; baseline replay state is unchanged.'
      : 'Player cards copied from final cue recording; matched initial slots/profiles/ratings verified.');
}
if (plays.length !== 38 || new Set(plays.map(p => p.id)).size !== 38) throw new Error('Expected 38 unique recorded clips');
const cohort = '38 paired clips: 20 ordinary runs and 12 ordinary passes selected before outcomes, plus 6 retained cue clips '
  + '(two retrospective explosive witnesses and one predeclared ordinary control, each baseline/final). '
  + 'B/F IDs preserve the recorded fixture; CUE distinguishes the higher-rate cue recording of a repeated ordinary input. '
  + 'Select a player for recorded assignments, support, intent, contact loads and consumed pictures. Facing is body direction, not measured eyes. '
  + 'These fixed generated-roster fixtures diagnose mechanics; their yards and selection do not represent league rates.';
const inputPaths = [...phases.flatMap(p => [p.path, p.reportPath]), ...cuePaths, cuePlayersPath];
const data = { meta: { sourceSha256: sources[1], sourceComparison: labels.map((label, i) => ({ label, sourceSha256: sources[i] })),
    title: flags.title ?? 'Pursuit and tackling: baseline / final', telemetryLevel: 'full', cohort, seed: 3,
    savedInputs: inputPaths.map(path => ({ path, sha256: fileHash(path) })),
    exporterSha256: fileHash(fileURLToPath(import.meta.url)), final: { home: 0, away: 0 }, quarters: [],
    home: { name: 'Controlled Offense', abbr: 'OFF', color: '#1d4f91', text: '#ffffff' },
    away: { name: 'Controlled Defense', abbr: 'DEF', color: '#a3302a', text: '#ffffff' } },
  games: ['ordinary runs', 'ordinary passes', 'retained cues'].flatMap(group => labels.map((label, phase) => ({
    label: `${label} · ${group}`, seed: 3, sourceSha256: sources[phase], final: { home: 0, away: 0 }, quarters: [] }))),
  plays: compactReplayPlays(plays), catalog: { coverage: Object.fromEntries(COVERAGES.map(c => [c.id, c.name])),
    front: Object.fromEntries(FRONTS.map(f => [f.id, f.name])), formation: Object.fromEntries(FORMATIONS.map(f => [f.id, f.name])) } };
const template = readFileSync(resolve(root, 'viewer/replay.template.html'), 'utf8'), marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Replay template missing data marker');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
console.log(JSON.stringify({ output, clips: plays.length, ordinaryRuns: 20, ordinaryPasses: 12, retainedCues: 6,
  sources, bytes: Buffer.byteLength(html), exporterSha256: data.meta.exporterSha256,
  savedInputReceipts: data.meta.savedInputs, simulation: false }, null, 2));
