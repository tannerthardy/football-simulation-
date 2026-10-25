/** Export existing native recordings, without running a simulator or rebuilding plays.
 * tsx scripts/export-rushing-benchmark-film.ts GAME_DIR INDEX BENCHMARK SELECTION OUTPUT_DIR
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import { packReplayPlay } from './replay-data.js';

type Saved = Record<string, any>;
const source = '8f8cf4b49052fae4dac2d7858b42aa6ddcd9bdd13fa3e541c5c41f03e344b15d';
const producer = '7aae5bb1bc756efef52ab6bd9abc380e564bf5a2d59596d74629ab1ca66edc35';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const hash = (v: unknown) => sha(JSON.stringify(v));
const fileHash = (p: string) => sha(readFileSync(p));
const read = (p: string): Saved => JSON.parse(p.endsWith('.gz') ? gunzipSync(readFileSync(p)).toString() : readFileSync(p, 'utf8'));
const args = process.argv.slice(2);
if (args.length !== 5) throw Error('Usage: export-rushing-benchmark-film.ts GAME_DIR INDEX BENCHMARK SELECTION OUTPUT_DIR');
const [gameDir, indexPath, benchmarkPath, selectionPath, output] = args.map(p => resolve(p));
const index = read(indexPath), benchmark = read(benchmarkPath), selection = read(selectionPath);
if (index.sourceBefore !== source || index.sourceAfter !== source || index.collectorSha256 !== producer
  || index.games !== 8 || index.rows.length !== 8 || selection.sourceSha256 !== source
  || selection.schema !== 'native-rushing-film-nominations-v1' || selection.plays.length !== 24
  || fileHash(benchmarkPath) !== selection.benchmarkSha256
  || fileHash(indexPath) !== benchmark.provenance?.engineIndexSha256
  || benchmark.provenance?.engineSourceSha256 !== source) throw Error('Film inputs differ from the reviewed native cohort');
const witnesses = benchmark.nativeWitnesses.filter((w: Saved) => w.cleanEligible && w.kind === 'designedRun' && w.carrier === 'RB_FB');
if (witnesses.length !== 302) throw Error('Expected the complete strict-clean 302-run cohort');
const clean = new Map<string, Saved>(witnesses.map((w: Saved) => [w.id, w]));
const nominated = new Map<string, Saved>(selection.plays.map((p: Saved) => [p.id, p]));
if (nominated.size !== 24 || selection.plays.some((p: Saved) => !clean.has(p.id))) throw Error('Incomplete or duplicate clean review selection');
const catalog: Record<string, Record<string, string>> = { front: {}, coverage: {}, formation: {} };
const games = index.rows.map((g: Saved) => ({ seed: g.seed, home: g.home, away: g.away, final: g.score, quarters: g.quarterScores }));
const files = [indexPath, benchmarkPath, selectionPath];
const clips: Array<ReturnType<typeof packReplayPlay> & Saved> = [];
for (const summary of index.rows) {
  if (!/^game-[1-8]\.json\.gz$/.test(summary.file)) throw Error('Unexpected native recording filename');
  const path = join(gameDir, summary.file), game = read(path);
  files.push(path);
  if (game.sourceBefore !== source || game.sourceAfter !== source || game.gameIndex !== summary.gameIndex
    || game.seed !== summary.seed || game.signature !== summary.signature || hash(game.score) !== hash(summary.score))
    throw Error(`Native game identity differs: ${path}`);
  for (const row of game.log) {
    const id = `G${game.gameIndex}-P${String(row.index).padStart(3, '0')}`;
    const witness = clean.get(id);
    if (!witness) continue;
    const original = summary.log.find((p: Saved) => p.index === row.index);
    const { replay, ...withoutReplay } = row;
    if (hash(withoutReplay) !== hash(original) || witness.settledGain !== row.yards
      || witness.snapSeed !== row.nativeInput?.seed || row.kind !== 'run' || row.foul || row.nullified
      || replay?.frames?.length < 2 || replay?.players?.length !== 22) throw Error(`Native clean recording mismatch: ${id}`);
    let last = -Infinity;
    for (const frame of replay.frames) {
      if (!Number.isFinite(frame.t) || frame.t <= last || frame.agents.length !== 66 || frame.ball.length !== 3
        || frame.carrier < -1 || frame.carrier >= 22 || ![...frame.agents, ...frame.ball].every(Number.isFinite))
        throw Error(`Incomplete recorded frame: ${id}`);
      last = frame.t;
    }
    const native = row.nativeInput, note = nominated.get(id);
    for (const key of ['front', 'coverage']) {
      const value = native.defCall[key];
      if (value?.id && value.name) catalog[key][value.id] = value.name;
    }
    const formation = native.offCall.formation;
    if (formation?.id && formation.name) catalog.formation[formation.id] = formation.name;
    const minute = Math.floor(row.clock / 60), second = String(Math.floor(row.clock % 60)).padStart(2, '0');
    const situation = `Game ${game.gameIndex} · Q${row.quarter} ${minute}:${second} · ${row.offense} ball · ${game.away.abbr} ${row.score.away} – ${game.home.abbr} ${row.score.home}`;
    const question = note ? `${note.groupLabel}. ${note.reviewLabel}: ${note.reviewPrompt}`
      : 'Watch the first blocking contact, the runner’s lane choice, the defensive approach and the finish. Is the movement believable even when the result is poor?';
    const display: PlayLog = { ...row, offense: 'OFF', text: `${question} ${row.text} ${situation}` };
    const packed = packReplayPlay(display, game.gameIndex - 1);
    clips.push({ ...packed,
      // These IDs deliberately match native benchmark/log indices; the generic
      // exporter adds one. Never silently shift a diagnostic witness reference.
      id, fixtureId: id, fixtureSeed: native.seed, sourceSha256: source,
      sourceLabel: 'Current production', review: note ?? null,
      nativeGameContext: { gameIndex: game.gameIndex, gameSeed: game.seed, snapSeed: native.seed,
        offense: row.offense, quarter: row.quarter, clock: row.clock, down: row.down,
        distance: row.distance, yardline: row.yardline, score: row.score,
        home: game.home, away: game.away, description: situation },
      nativeOutcome: { text: row.text, gain: row.yards, outcome: row.outcome, stats: row.stats },
      metadataProvenance: 'Exact saved native game log and light recording; role colors OFF/DEF, original clubs and score retained. IDs match benchmark/native log indices.' });
  }
}
if (clips.length !== 302 || new Set(clips.map(p => p.id)).size !== 302) throw Error('Lost or duplicated clean cohort film');
const byId = new Map(clips.map(p => [p.id, p]));
const selected = (selection.plays as Saved[]).map((p: Saved) => {
  const clip = byId.get(p.id);
  if (!clip || p.nativeLogIndex !== clip.index || p.gameIndex !== clip.game + 1 || p.gain !== clip.nativeOutcome.gain
    || p.concept !== clip.plan?.concept || p.call !== clip.call || p.defense !== clip.def) throw Error(`Selection metadata differs: ${p.id}`);
  return clip;
});
const templatePath = join(root, 'viewer/replay.template.html');
let template = readFileSync(templatePath, 'utf8');
function replace(from: string, to: string) {
  if (!template.includes(from)) throw Error(`Viewer contract changed: ${from}`);
  template = template.replace(from, to);
}
// The shared template also serves staged fixtures. Label this saved native
// collection accurately without changing other film rooms or the shared UI.
replace('All-22 · controlled inspection fixtures', 'All-22 · native rushing review');
replace("meta.cohort?'controlled fixtures':", "meta.cohort?'selected native game plays':");
replace('`Controlled setup · seed ${replaySeed(p)} · ${p.off} ball`', '`seed ${replaySeed(p)} · ${p.nativeGameContext.description}`');
replace("meta.cohort?'controlled setup':", "meta.cohort?`Game ${p.game + 1} · Q${p.q} ${clk(p.clk)}`:");
replace("meta.cohort?' · controlled fixture':''", "meta.cohort?' · native game play':''");
const cohort = 'Current production: exact saved plays from the eight games behind the rushing benchmark. Blue is offense; red is defense. Native club identities and scores appear above each play. Light recording shows paths, body facing, ball and event notes; it does not record eyes, assignments, intent or contact forces. The 24-play selection is deliberately diagnostic; all-runs.html contains the complete 302 clean back runs.';
const commonMeta = { sourceSha256: source, telemetryLevel: 'light', nativeGameFilm: true, cohort,
  home: { name: 'Offense', abbr: 'OFF', color: '#1d4f91', text: '#fff' },
  away: { name: 'Defense', abbr: 'DEF', color: '#a3302a', text: '#fff' }, final: { home: 0, away: 0 }, quarters: [] };
mkdirSync(output, { recursive: true });
const artifacts: Saved[] = [];
for (const [filename, title, plays] of [
  ['rushing-review.html', 'Rushing review: 24 guided plays', selected],
  ['all-runs.html', 'Rushing review: all 302 clean back runs', clips],
] as const) {
  const data = { meta: { ...commonMeta, title }, games, catalog, plays };
  const marker = '/*__REPLAY_DATA__*/null';
  if (!template.includes(marker)) throw Error('Viewer data marker missing');
  const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'
    + title + '</title></head><body>\n' + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
  const file = join(output, filename);
  writeFileSync(file, html);
  artifacts.push({ filename, clips: plays.length, bytes: Buffer.byteLength(html), sha256: fileHash(file) });
}
const receipt = { schema: 'native-rushing-review-film-v1', sourceSha256: source,
  cleanRuns: 302, selectedClips: 24, selectedIds: selected.map(p => p.id),
  method: 'Saved-only packing; no simulation, new observations, replay reconstruction or changed outcomes.',
  identityRule: selection.identityRule, allOriginalFrameTimesRetained: true,
  packing: 'Existing viewer packs coordinates to tenths of a yard; raw native outcome retained separately.',
  selectedSelectionBias: true, telemetry: 'light',
  inputs: files.map(path => ({ path, sha256: fileHash(path) })),
  exporterSha256: fileHash(fileURLToPath(import.meta.url)), templateSha256: fileHash(templatePath), artifacts };
writeFileSync(join(output, 'export-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
