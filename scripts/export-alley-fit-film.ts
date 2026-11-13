/** Saved-only film for four native Game-prefix / selected-policy pairs.
 * node --import tsx scripts/export-alley-fit-film.ts PACKET_DIR GAME_INDEX.json.gz SELECTION.json OUTPUT.html
 * No simulation, replay reconstruction, outcome filtering, or full-candidate-game claim.
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
const baselineSource = '601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b';
const candidateSource = '3cbabd8fbb1fb4fea34c6bb98725a97f3f6de175c0bb59bece69f3c1e7371a7f';
const expected = ['G4-P127', 'G3-P099', 'G4-P012', 'G2-P188'];
const phases = ['baseline', 'candidate'];
const labels = ['Baseline 601', 'Selected alley policy'];
const scope = 'Baseline601 native Game history and PlaySim constructor; only ManCoverage.update is borrowed from candidate3cb during the selected snap. This is a component counterfactual, not an end-to-end candidate game.';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const isHash = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const read = (path: string): Saved => JSON.parse(path.endsWith('.gz')
  ? gunzipSync(readFileSync(path)).toString() : readFileSync(path, 'utf8'));
function same(a: unknown, b: unknown, label: string): void {
  if (hash(a) !== hash(b)) throw new Error(`Saved comparison mismatch: ${label}`);
}
function requireHash(v: unknown, label: string): void {
  if (!isHash(v)) throw new Error(`Missing SHA256: ${label}`);
}
function dereference(context: Saved, value: Saved): Saved {
  if (!value?.ref) return value;
  if (!value.ref.startsWith('root.')) throw new Error(`Unsupported saved reference: ${value.ref}`);
  const resolved = value.ref.slice(5).split('.').reduce((v: Saved, key: string) => v?.[key], context);
  if (!resolved || resolved === value) throw new Error(`Unresolved saved reference: ${value.ref}`);
  return dereference(context, resolved);
}
function recording(row: Saved): void {
  const r = row.result as PlayResult;
  if (!r.frames || r.frames.length < 2 || !r.frames.some(f => f.t === 0)
    || r.telemetry?.version !== 1 || r.telemetry.level !== 'full'
    || r.telemetry.frames.length !== r.frames.length)
    throw new Error(`Incomplete full native recording: ${row.id}`);
  // Native Toss may include real pre-snap motion. Retain it instead of
  // moving those frames to zero or silently dropping the motion history.
  for (let i = 0; i < r.frames.length; i++) {
    const f = r.frames[i], t = r.telemetry.frames[i];
    if (f.agents.length !== 66 || f.ball.length !== 3 || t.agents.length !== 22 || f.t !== t.t
      || !Number.isFinite(f.t) || [...f.agents, ...f.ball].some(v => !Number.isFinite(v))
      || f.carrier < -1 || f.carrier >= 22 || (i > 0 && f.t <= r.frames[i - 1].t))
      throw new Error(`Invalid native recorded frame: ${row.id}/${i}`);
  }
  same({ ...r, frames: undefined, telemetry: undefined }, row.rawOutcome, `${row.id} native outcome`);
  same(hash(row.rawOutcome), row.resultSha256, `${row.id} saved result pin`);
}
function cards(row: Saved): Saved[] {
  if (!Array.isArray(row.players) || row.players.length !== 22) throw new Error(`Missing player cards: ${row.id}`);
  for (let i = 0; i < row.players.length; i++) {
    const a = row.players[i];
    if (a.idx !== i || !['O', 'D'].includes(a.team) || !a.slot || !a.player?.firstName || !a.player.lastName
      || !a.player.ratings || !Number.isFinite(a.player?.measurables?.weightLb)
      || !a.profile || !Number.isFinite(a.profile.massKg)) throw new Error(`Incomplete native player card: ${row.id}/${i}`);
  }
  return row.players;
}
const args = process.argv.slice(2);
if (args.length !== 4 || !args[1].endsWith('.json.gz') || !args[2].endsWith('.json') || !args[3].endsWith('.html'))
  throw new Error('Usage: export-alley-fit-film.ts PACKET_DIR GAME_INDEX.json.gz SELECTION.json OUTPUT.html');
const [packetDir, indexPath, selectionPath, output] = args.map(p => resolve(p));
const selection = read(selectionPath), index = read(indexPath);
if (selection.schema !== 'selected-man-alley-policy-controls-v1' || selection.baselineSource !== baselineSource
  || selection.candidateSource !== candidateSource || index.sourceBefore !== baselineSource || index.sourceAfter !== baselineSource)
  throw new Error('Expected source-pinned native selection and Game index');
same([...selection.originalCases.map((r: Saved) => r.id), selection.addedBeforeCandidateResult.id], expected, 'Complete predeclared witness IDs and order');
const inputPaths = expected.flatMap(id => phases.map(phase => resolve(packetDir, `${id}-${phase}.json.gz`)));
const packets = expected.map((id, i) => phases.map((phase, p) => {
  const packet = read(inputPaths[i * 2 + p]), row = packet.row;
  if ((p === 0 && !['selected-native-game-prefix-v1', 'selected-native-man-policy-counterfactual-v1'].includes(packet.schema))
    || (p === 1 && packet.schema !== 'selected-native-man-policy-counterfactual-v1')
    || packet.sourceBefore !== baselineSource || packet.sourceAfter !== baselineSource || row?.id !== id
    || !row.observerVerified || row.ordinaryLightVerified !== (p === 0)
    || (p === 1 && (packet.candidateSource !== candidateSource || row.phase !== 'selected-alley-policy')))
    throw new Error(`Invalid native policy packet: ${inputPaths[i * 2 + p]}`);
  for (const k of ['toolSha256', 'commonSha256', 'inputSha256']) requireHash(packet[k], `${id}/${phase}/${k}`);
  same(packet.inputSha256, fileHash(indexPath), `${id}/${phase} original Game index bytes`);
  for (const k of ['initialSha256', 'fullInitialSha256', 'priorLogSha256', 'resultSha256', 'finalSha256', 'fullFinalSha256']) {
    requireHash(row[k], `${id}/${phase}/${k}`);
    same(row[k], row.plainReceipts?.[k], `${id}/${phase} observer/plain ${k}`);
  }
  same(row.nextRng, row.plainReceipts?.nextRng, `${id}/${phase} copied next RNG`);
  same(hash(row.initial), row.initialSha256, `${id}/${phase} complete initial physical/controller projection`);
  same(hash(row.fullInitial), row.fullInitialSha256, `${id}/${phase} extended initial projection`);
  same(hash(row.fullFinal), row.fullFinalSha256, `${id}/${phase} extended final projection`);
  same(hash(row.ticks), row.ticksSha256, `${id}/${phase} whole-tick signatures`);
  if (!row.ticks.length || row.ticks.length !== row.samples.length || !row.seedsThroughTarget.length)
    throw new Error(`Incomplete native execution receipts: ${id}/${phase}`);
  for (const tick of row.ticks) {
    if (!Number.isFinite(tick.t)) throw new Error(`Invalid native tick: ${id}`);
    requireHash(tick.before, `${id} tick before`); requireHash(tick.after, `${id} tick after`);
  }
  cards(row); recording(row);
  return packet;
}));

const pairReceipts: Saved[] = [];
for (let i = 0; i < expected.length; i++) {
  const [a, b] = packets[i].map(p => p.row), id = expected[i];
  const game = index.rows.find((g: Saved) => g.gameIndex === a.gameIndex);
  const saved = game?.log.find((p: Saved) => p.index === a.targetLog.index);
  if (!game || !saved?.nativeInput || saved.nativeInput.seed !== a.snapSeed || a.gameSeed !== game.seed)
    throw new Error(`Missing original native Game selection: ${id}`);
  for (const k of ['gameIndex', 'gameSeed', 'snapSeed', 'initial', 'fullInitial', 'initialSha256', 'fullInitialSha256', 'priorLogSha256', 'seedsThroughTarget', 'players'])
    same(a[k], b[k], `${id} paired ${k}`);
  same(a.initialSha256, saved.nativeInput.initialSha256, `${id} original native initial pin`);
  same(a.priorLogSha256, saved.nativeInput.earlierLogSha256, `${id} original native earlier history pin`);
  same(a.resultSha256, saved.nativeInput.resultSha256, `${id} original ordinary light result pin`);
  same(a.finalSha256, saved.nativeInput.finalSha256, `${id} original ordinary light final pin`);
  same(a.nextRng, saved.nativeInput.nextRng, `${id} original ordinary light next RNG`);
  const { nativeInput: _nativeInput, ...originalLog } = saved;
  same(a.targetLog, originalLog, `${id} actual settled baseline Game log`);
  for (const k of ['index', 'quarter', 'clock', 'offense', 'down', 'distance', 'yardline', 'call', 'defense', 'kind', 'plan'])
    same(a.targetLog[k], b.targetLog[k], `${id} paired native Game context ${k}`);
  same(a.result.frames.filter((f: Saved) => f.t <= 0), b.result.frames.filter((f: Saved) => f.t <= 0), `${id} pre-snap and snap bodies/ball`);
  const firstFork = a.ticks.find((tick: Saved, j: number) => b.ticks[j]?.before !== tick.before || b.ticks[j]?.after !== tick.after)?.t ?? null;
  pairReceipts.push({ id, initialSha256: a.initialSha256, fullInitialSha256: a.fullInitialSha256,
    priorLogSha256: a.priorLogSha256, throughTargetSeedsSha256: hash(a.seedsThroughTarget), snapSeed: a.snapSeed,
    firstWholeTickFork: firstFork, baselineTicksSha256: a.ticksSha256, candidateTicksSha256: b.ticksSha256,
    baselineNextRng: a.nextRng, candidateNextRng: b.nextRng, observerPlainVerified: true,
    baseline: { outcome: a.rawOutcome.outcome, gain: a.rawOutcome.offenseYards },
    selectedPolicy: { outcome: b.rawOutcome.outcome, gain: b.rawOutcome.offenseYards } });
}

const plays: Array<ReturnType<typeof packReplayPlay>> = [], games: Saved[] = [];
const catalog: Record<string, Record<string, string>> = { coverage: {}, front: {}, formation: {} };
for (let i = 0; i < expected.length; i++) for (let p = 0; p < 2; p++) {
  const packet = packets[i][p], row = packet.row, context = row.fullInitial.context;
  const log = row.targetLog, result = row.result as PlayResult, roster = cards(row);
  const offCall = context?.offCall, defCall = context?.defCall;
  const formation = dereference(context, offCall?.formation), coverage = dereference(context, defCall?.coverage), front = dereference(context, defCall?.front);
  if (!formation?.id || !formation.name || !coverage?.id || !coverage.name || !front?.id || !front.name
    || !offCall.run?.name || !Number.isFinite(context.los) || !Number.isFinite(context.firstDownX)
    || log.kind !== 'run' || log.call !== offCall.label || log.defense !== defCall.label
    || log.plan?.formation !== formation.id || log.plan?.front !== front.id || log.plan?.coverage !== coverage.id
    || log.plan?.concept !== offCall.run.scheme || log.yardline !== context.los - 10
    || log.down !== context.snapContext.down || log.distance !== context.snapContext.distance)
    throw new Error(`Incomplete exact native Game constructor metadata: ${row.id}`);
  const nativeGame = index.rows.find((g: Saved) => g.gameIndex === row.gameIndex);
  catalog.coverage[coverage.id] = coverage.name; catalog.front[front.id] = front.name; catalog.formation[formation.id] = formation.name;
  const game = games.length, minute = Math.floor(log.clock / 60), second = String(Math.floor(log.clock % 60)).padStart(2, '0');
  games.push({ label: `${row.id} · ${labels[p]}`, seed: row.snapSeed, sourceSha256: p ? candidateSource : baselineSource,
    nativeGameIndex: row.gameIndex, nativeGameSeed: row.gameSeed, home: nativeGame.home, away: nativeGame.away,
    selectedSnapScore: log.score, quarters: [], final: log.score, method: scope });
  const source = p ? candidateSource : baselineSource;
  const spot = log.yardline <= 50 ? `own ${log.yardline.toFixed(2)}` : `opponent ${(100 - log.yardline).toFixed(2)}`;
  const nativeContext = `Native Game ${row.gameIndex}, Q${log.quarter} ${minute}:${second}, ${log.offense} ball, ${log.down} & ${log.distance}, ${spot}; settled snap score ${nativeGame.away.abbr} ${log.score.away} – ${nativeGame.home.abbr} ${log.score.home}.`;
  // The existing viewer's color lookup accepts two display teams. These
  // witnesses involve three native clubs, so use role colors for rendering
  // and retain the unmodified actual Game log/context alongside the clip.
  const replayLog: PlayLog = { ...log, offense: 'OFF',
    call: `${labels[p]} · ${log.call}`,
    text: `${log.text} ${nativeContext} ${scope} All four predeclared pairs, including unchanged and goal-line controls, are retained. Select FS for its recorded man target, run-fit job and delayed possession cue; body-facing ticks are not measured eye direction.`,
    replay: { los: context.los, firstDownX: context.firstDownX, flip: offCall.flip, frames: result.frames!,
      events: result.events, telemetry: result.telemetry,
      players: roster.map(a => ({ team: a.team, slot: a.slot, name: `${a.player.firstName} ${a.player.lastName}`,
        jersey: a.player.jersey, pos: a.player.position, weightLb: a.player.measurables.weightLb })),
      profiles: roster.map(a => ({ position: a.player.position, heightIn: a.player.measurables.heightIn,
        weightLb: a.player.measurables.weightLb, ratings: a.player.ratings })) } };
  const packed = packReplayPlay(replayLog, game);
  const clip = { ...packed, id: `${p ? 'A' : 'B'}-${row.id}`, concept: { ...packed.concept, name: offCall.run.name },
    fixtureId: row.id, fixtureSeed: row.snapSeed, sourceLabel: labels[p], sourceSha256: source,
    filmSelection: 'all-four-predeclared-selected-man-policy-pairs', comparisonCohort: row.id,
    metadataProvenance: 'Exact saved native Game log, constructor context, complete player cards and full telemetry; no catalog reconstruction or prescribed bodies. Display team colors use OFF/DEF; native club identity remains in nativeGameLog and nativeGameContext.',
    nativeGameLog: log,
    nativeGameContext: { game: row.gameIndex, gameSeed: row.gameSeed, snapSeed: row.snapSeed, quarter: log.quarter,
      clock: log.clock, offense: log.offense, down: log.down, distance: log.distance, yardline: log.yardline,
      score: log.score, home: nativeGame.home, away: nativeGame.away },
    sourceMethod: p ? scope : 'Unchanged baseline601 native Game prefix and selected snap, verified against original eight-game light collection.',
    pairReceipt: pairReceipts[i] };
  plays.push(clip);
}
if (plays.length !== 8 || new Set(plays.map(p => p.id)).size !== 8) throw new Error('Expected all eight unique clips');
const cohort = 'Eight saved clips: baseline / selected-policy pairs for G4-P127 Outside Zone breakaway, G3-P099 goal-line Duo, G4-P012 zone control, and G2-P188 midfield Toss. '
  + scope + ' Native Game quarter, clock, down, distance, score and actual calls are retained in each clip’s result description. Display colors group by offense/defense; native clubs are retained in the description and saved clip context. '
  + 'Complete initial body/controller states, preceding Game history and through-target seeds match within every pair; observed and plain whole-tick signatures, natural results and copied next RNG agree within each phase. '
  + 'All cases are retained. These mechanism witnesses are not NFL frequencies or league averages. The Toss pair preserves actual pre-snap motion. Body facing is not measured eyes.';
const savedInputs = [selectionPath, indexPath, ...inputPaths].map(path => ({ path, sha256: fileHash(path) }));
const data = { meta: { title: 'Known-back alley support: native baseline / selected policy', sourceSha256: candidateSource,
  sourceComparison: [{ label: labels[0], sourceSha256: baselineSource }, { label: labels[1], sourceSha256: candidateSource, method: scope }],
  telemetryLevel: 'full', cohort, savedInputs, exporterSha256: fileHash(fileURLToPath(import.meta.url)),
  final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Native selected offense', abbr: 'OFF', color: '#1d4f91', text: '#ffffff' },
  away: { name: 'Native selected defense', abbr: 'DEF', color: '#a3302a', text: '#ffffff' } },
  games, plays: compactReplayPlays(plays), catalog };
const templatePath = resolve(root, 'viewer/replay.template.html'), template = readFileSync(templatePath, 'utf8');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Replay template missing data marker');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
console.log(JSON.stringify({ output, clips: plays.length, pairs: expected.length, bytes: Buffer.byteLength(html), htmlSha256: fileHash(output),
  baselineSource, candidateSource, scope, exporterSha256: data.meta.exporterSha256, templateSha256: fileHash(templatePath), savedInputs,
  pairReceipts, simulation: false, outcomeSelection: false, componentCounterfactuals: true, fullCandidateGames: false }, null, 2));
