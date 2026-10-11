/** Saved-only film for all 24 predeclared native run-fit/Draw inputs.
 * node --import tsx scripts/export-run-fit-recovery.ts baseline-film.json.gz final-film.json.gz cohort.json output.html
 * No simulation, outcome filtering, invented trajectories, or counterfactuals.
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
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const isHash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function read(path: string): Saved {
  const bytes = readFileSync(path);
  return JSON.parse((path.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString());
}
function same(a: unknown, b: unknown, label: string): void {
  if (hash(a) !== hash(b)) throw new Error(`Saved comparison mismatch: ${label}`);
}
const args = process.argv.slice(2);
if (args.length !== 4 || !args[3].endsWith('.html'))
  throw new Error('Usage: export-run-fit-recovery.ts baseline-film.json.gz final-film.json.gz cohort.json output.html');
const [baselinePath, finalPath, cohortPath, output] = args.map(path => resolve(path));
const cohort = read(cohortPath), films = [read(baselinePath), read(finalPath)];
if (cohort.schema !== 'run-fit-targeted-cohort-v1' || !Array.isArray(cohort.rows) || cohort.rows.length !== 24
  || cohort.cohortSha256 !== hash(cohort.rows) || cohort.rosterSha256 !== hash(cohort.teams)
  || !isHash(cohort.builderSource) || !isHash(cohort.builderSha256)
  || cohort.rows.filter((r: Saved) => r.family === 'back-man').length !== 16
  || cohort.rows.filter((r: Saved) => r.family === 'draw').length !== 8
  || new Set(cohort.rows.map((r: Saved) => r.id)).size !== 24
  || cohort.rows.some((r: Saved) => r.selection !== 'all-predeclared-native-inputs' || r.inputSha256 !== hash(r.setup)))
  throw new Error('Expected the complete pinned 24-input native cohort');

const labels = ['Baseline: 9c3c809', 'Run fit and recovery'];
const sources = films.map(film => film.sourceBefore as string);
if (!sources.every(isHash) || sources[0] === sources[1] || cohort.builderSource !== sources[0])
  throw new Error('Expected distinct baseline/final sources from the declared parent');

function recorded(result: PlayResult, count: number, id: string): void {
  if (count !== 22 || !result.frames || result.frames.length < 2 || result.frames[0].t !== 0
    || result.telemetry?.version !== 1 || result.telemetry.level !== 'full'
    || result.telemetry.frames.length !== result.frames.length)
    throw new Error(`Missing full native recording: ${id}`);
  for (let i = 0; i < result.frames.length; i++) {
    const f = result.frames[i], t = result.telemetry.frames[i];
    if (f.agents.length !== 66 || f.ball.length !== 3 || t.agents.length !== 22 || f.t !== t.t
      || !Number.isFinite(f.t) || [...f.agents, ...f.ball].some(v => !Number.isFinite(v))
      || f.carrier < -1 || f.carrier >= 22 || (i > 0 && f.t <= result.frames[i - 1].t))
      throw new Error(`Invalid recorded frame: ${id}`);
  }
}

// Film-specific observer/source guards are checked before constructing output.
for (let phase = 0; phase < 2; phase++) {
  const film = films[phase];
  if (film.schema !== 'run-fit-targeted-film-v1' || film.sourceBefore !== sources[phase] || film.sourceAfter !== sources[phase]
    || film.phase !== (phase ? 'final' : 'baseline') || !isHash(film.toolSha256)
    || film.cohortSha256 !== cohort.cohortSha256 || film.cohortFileSha256 !== fileHash(cohortPath)
    || !Array.isArray(film.plays) || film.plays.length !== 24)
    throw new Error('Expected complete targeted native film');
  same(film.plays.map((p: Saved) => p.id), cohort.rows.map((r: Saved) => r.id), 'fixed native film IDs/order');
  for (let i = 0; i < 24; i++) {
    const p = film.plays[i], input = cohort.rows[i];
    if (p.selection !== input.selection || p.sourceVersion !== sources[phase]
      || p.inputSha256 !== input.inputSha256 || !p.observerVerified || !Array.isArray(p.players)
      || !isHash(p.observedSignature) || p.observedSignature !== p.plainSignature
      || !isHash(p.initialSha256)
      || p.profilesSha256 !== hash(p.players.map((a: Saved) => ({ idx: a.idx, slot: a.slot, team: a.team, player: a.player, profile: a.profile })))
      || p.players.some((a: Saved, j: number) => a.idx !== j || !a.player?.firstName || !a.player?.lastName
        || !a.profile || !Number.isFinite(a.player?.measurables?.weightLb)))
      throw new Error(`Unpinned native fixture: ${p.id}`);
    for (const key of ['roster', 'run', 'front', 'coverage', 'flip', 'seed', 'family'])
      same(p[key], input[key], `${p.id} declared ${key}`);
    same(p.offCall, input.setup.offCall.label, `${p.id} actual offensive call`);
    same(p.defCall, input.setup.defCall.label, `${p.id} actual defensive call`);
    recorded(p.result, p.players.length, p.id);
  }
}
same(films[0].toolSha256, films[1].toolSha256, 'native collector bytes');
for (let i = 0; i < 24; i++) {
  const a = films[0].plays[i], b = films[1].plays[i];
  same(a.players, b.players, `${a.id} complete player metadata`);
  same(a.result.frames[0], b.result.frames[0], `${a.id} initial recorded bodies/ball`);
  same(a.profilesSha256, b.profilesSha256, `${a.id} profile pin`);
}

const plays: Array<ReturnType<typeof packReplayPlay>> = [];
for (let i = 0; i < 24; i++) for (let phase = 0; phase < 2; phase++) {
  const p = films[phase].plays[i], input = cohort.rows[i], setup = input.setup;
  const result = p.result as PlayResult, formation = setup.offCall.formation;
  const concept = setup.offCall.run, coverage = setup.defCall.coverage, front = setup.defCall.front;
  const family = input.family === 'draw' ? 1 : 0, game = family * 2 + phase;
  const cards = p.players.map((a: Saved) => ({ team: a.team, slot: a.slot,
    name: `${a.player.firstName} ${a.player.lastName}`, jersey: a.player.jersey, pos: a.player.position,
    weightLb: a.player.measurables.weightLb,
    profile: { position: a.player.position, heightIn: a.player.measurables.heightIn,
      weightLb: a.player.measurables.weightLb, ratings: a.player.ratings } }));
  const log: PlayLog = { index: plays.length, quarter: 0, clock: 0, offense: 'OFF', down: setup.down,
    distance: setup.firstDownX - setup.los, yardline: setup.los - 10, kind: 'run',
    call: `${labels[phase]} · ${setup.offCall.label}`, defense: setup.defCall.label,
    text: `${labels[phase]} · ${p.id} · source ${sources[phase].slice(0, 12)} · ${result.outcome} · ${result.offenseYards.toFixed(2)} yd. `
      + 'All predeclared native inputs are included, including unchanged and adverse outcomes. Select a player to inspect recorded jobs, requested movement and delayed possession cues.',
    yards: result.offenseYards, score: { home: 0, away: 0 }, stats: result.stats, outcome: result.outcome,
    plan: { personnel: formation.personnel, formation: formation.id, qb: formation.qb, concept: concept.scheme,
      playAction: false, audible: false, defPersonnel: setup.defCall.personnel, front: front.id,
      coverage: coverage.id, called: coverage.id, family: coverage.family, shell: coverage.shell,
      pressure: !!setup.defCall.pressure },
    replay: { los: setup.los, firstDownX: setup.firstDownX, flip: setup.offCall.flip,
      frames: result.frames!, events: result.events, telemetry: result.telemetry,
      players: cards.map((a: Saved) => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.jersey,
        pos: a.pos, weightLb: a.weightLb })), profiles: cards.map((a: Saved) => a.profile) } };
  const packed = { ...packReplayPlay(log, game), id: `${phase ? 'F' : 'B'}-${p.id}`,
    fixtureId: p.id, fixtureSeed: input.seed, sourceLabel: labels[phase], sourceSha256: sources[phase],
    filmSelection: p.selection, comparisonCohort: input.family,
    metadataProvenance: 'Complete player cards copied from this saved native film, paired profiles and initial bodies/ball verified.' };
  plays.push(packed);
}
if (plays.length !== 48 || new Set(plays.map(p => p.id)).size !== 48)
  throw new Error('Expected exactly 48 unique saved clips');
const context = '48 paired native clips from all 24 predeclared targeted inputs: 16 Duo/Inside Zone calls against Cover 1 off and Cover 0, plus 8 Draw calls. '
  + 'Two fixed generated roster pairs, both directions, baseline and current source. This balanced diagnostic cohort is not NFL call frequencies or league statistics. '
  + 'No fabricated assignments, forced bodies, outcome selection, or counterfactual clips. B/F preserves each actual fixture ID. '
  + 'Select a defender to inspect jobs, delayed perceived possession and recorded decisions. Body-facing ticks are not measured eyes.';
const data = { meta: { title: 'Run fit and recovery: native baseline / current', sourceSha256: sources[1],
  sourceComparison: labels.map((label, i) => ({ label, sourceSha256: sources[i] })), telemetryLevel: 'full', cohort: context, seed: 3,
  savedInputs: [baselinePath, finalPath, cohortPath].map(path => ({ path, sha256: fileHash(path) })),
  exporterSha256: fileHash(fileURLToPath(import.meta.url)), final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Controlled Offense', abbr: 'OFF', color: '#1d4f91', text: '#ffffff' },
  away: { name: 'Controlled Defense', abbr: 'DEF', color: '#a3302a', text: '#ffffff' } },
  games: ['Back-man run recognition', 'Draw presentation'].flatMap(group => labels.map((label, phase) => ({
    label: `${label} · ${group}`, seed: 3, sourceSha256: sources[phase], final: { home: 0, away: 0 }, quarters: [] }))),
  plays: compactReplayPlays(plays), catalog: { coverage: Object.fromEntries(cohort.rows.map((r: Saved) => [r.coverage, r.setup.defCall.coverage.name])),
    front: Object.fromEntries(cohort.rows.map((r: Saved) => [r.front, r.setup.defCall.front.name])),
    formation: Object.fromEntries(cohort.rows.map((r: Saved) => [r.setup.offCall.formation.id, r.setup.offCall.formation.name])) } };
const templatePath = resolve(root, 'viewer/replay.template.html'), template = readFileSync(templatePath, 'utf8');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Replay template missing data marker');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
console.log(JSON.stringify({ output, clips: plays.length, nativePairs: 24, sources, bytes: Buffer.byteLength(html),
  exporterSha256: data.meta.exporterSha256, templateSha256: fileHash(templatePath),
  savedInputReceipts: data.meta.savedInputs, simulation: false, outcomeSelection: false, counterfactuals: false }, null, 2));
