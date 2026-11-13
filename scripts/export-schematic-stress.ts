/** Offline film from saved recordings only. No simulation is performed.
 * node --import tsx scripts/export-schematic-stress.ts panel.json[.gz] film.json.gz output.html
 *   [--paired baseline.json baseline-film.json.gz current.json current-film.json.gz]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import type { Player } from '../src/players/types.js';
import type { PhysicalProfile } from '../src/players/physical.js';
import type { PlayResult } from '../src/sim/types.js';
import { packReplayPlay } from './replay-data.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';

export const EXPECTED_SCHEMATIC_SOURCE = '11b97574138bdd4a99b373e4089261519bd4484f2e5ae5c87f90276a07215f85';
export const EXPECTED_NATIVE_FILMS = ['SS-02-written', 'SS-04-written', 'SS-06-written', 'SS-08-written', 'SS-10-written'] as const;
const PA_FIXTURE = '0:gun_doubles_11:pa_shot:false';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytesHash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const decode = (path: string) => { const bytes = readFileSync(path); return path.endsWith('.gz') ? gunzipSync(bytes) : bytes; };

interface NativeRow {
  id: string; observerVerified: boolean | null; physicalSignature: string;
  fixture: { id: string; family: string; condition: string; formation: string; kind: 'run' | 'pass'; concept: string;
    personnel: string; front: string; coverage: string };
  snap: { calledCoverage: string; effectiveCoverage: string; rushCount: number; coverageCount: number;
    profileSha256: string; geometrySha256: string; counts: { S: number; W: number };
    offense: Array<{ slot: string; route: string | null }> };
  metrics: { outcome: string; duration: number; offenseYardsBeforePenalties: number; conversionBeforePenalties: boolean;
    handoffAt: number | null; throwAt: number | null; firstCarrierContactAt: number | null };
}
export interface NativePanel {
  schema: string; sourceBefore: string; sourceAfter: string; sharedWorldSha256: string; scriptSha256: string; labSha256: string;
  cohort: { playSeed: number; rosterSha256: string }; limitations: string[]; rows: NativeRow[];
}
export interface NativeFilm {
  schema: string; sourceBefore: string; sourceAfter: string; limitations: string[];
  plays: Array<{ id: string; setupKind: string; offCall: string; defCall: string; down: number; distance: number;
    los: number; firstDownX: number; result: PlayResult;
    players: Array<{ slot: string; team: 'O' | 'D'; name: string; jersey: number; position: string; profile: PhysicalProfile }> }>;
}
interface PassPanel {
  schema: string; sourceBefore: string; sourceAfter: string; sharedWorldSha256: string; scriptSha256: string;
  cohort: { playSeed: number; los: number }; rostersSha256: string;
  rows: Array<{ id: string; observerVerified: boolean | null; profilesSha256: string; executionSha256: string;
    outcome: string; duration: number; offenseYardsBeforePenalties: number; stats: PlayResult['stats'];
    setWithPermanentReadTicks: number; installed: { firstRead: string | null; firstReadPermanent: boolean; permanentSlots: string[] } }>;
}
interface PassFilm {
  sourceBefore: string; sourceAfter: string;
  film: Array<{ id: string; result: PlayResult; players: Array<{ slot: string; team: 'O' | 'D'; player: Player }> }>;
}

/** Reject stale, duplicated or partial recording libraries before embedding. */
export function validateSchematicRecordings(panel: NativePanel, film: NativeFilm) {
  if (panel.schema !== 'schematic-stress-v1' || film.schema !== 'schematic-stress-film-v1'
    || panel.sourceBefore !== EXPECTED_SCHEMATIC_SOURCE || panel.sourceAfter !== panel.sourceBefore
    || film.sourceBefore !== panel.sourceBefore || film.sourceAfter !== film.sourceBefore
    || hash(panel.limitations) !== hash(film.limitations)
    || hash(film.plays.map(p => p.id)) !== hash(EXPECTED_NATIVE_FILMS))
    throw new Error('Expected the five matching source-pinned fixed schematic recordings');
  for (const p of film.plays) {
    const matches = panel.rows.filter(r => r.id === p.id), row = matches[0];
    if (matches.length !== 1 || !row.observerVerified || row.fixture.condition !== 'adverse'
      || p.setupKind !== 'native-static-11v11' || p.players.length !== 22
      || p.result.telemetry?.level !== 'full' || !p.result.telemetry.frames.length
      || !p.result.frames || p.result.frames.length < 2 || p.result.frames[0].t !== 0
      || p.result.frames.some(f => f.agents.length !== 66)
      || row.snap.rushCount + row.snap.coverageCount !== 11
      || p.result.outcome !== row.metrics.outcome || p.result.duration !== row.metrics.duration
      || p.result.offenseYards !== row.metrics.offenseYardsBeforePenalties)
      throw new Error(`Incomplete or mismatched native recording ${p.id}`);
  }
  const bunch = panel.rows.find(r => r.id === 'SS-06-written')!, quad = panel.rows.find(r => r.id === 'SS-08-written')!;
  const long = panel.rows.find(r => r.id === 'SS-10-written')!, longFilm = film.plays.find(p => p.id === long.id)!;
  if (bunch.snap.offense.filter(a => a.route === 'shallow').length !== 1
    || bunch.snap.offense.some(a => a.route === 'shallow_high') || quad.fixture.concept !== 'quick_outs'
    || quad.snap.counts.S !== 4 || quad.snap.counts.W !== 1 || longFilm.down !== 3 || longFilm.distance !== 27
    || long.snap.rushCount !== 3 || long.snap.coverageCount !== 8)
    throw new Error('Schematic caveat/role inventory disagrees with recorded installation');
}

const clockNote = (value: number | null) => value === null ? 'none' : `${value.toFixed(2)} s`;
const schemeOf: Record<string, string> = { split_zone: 'splitZone', counter: 'counter', iz_strong: 'insideZone' };
function nativePacked(panel: NativePanel, film: NativeFilm) {
  return film.plays.map((p, index) => {
    const row = panel.rows.find(r => r.id === p.id)!, r = p.result, f = row.fixture;
    const caveat = f.family === 'bunch' ? 'DEGRADED MESH: only one shallow crosser; the 3x1 install has no W2 for the second. This does not test complete Mesh.'
      : f.family === 'quad' ? 'STATIC QUAD QUICK-OUTS: this is a legal static 4x1, not a screen, bubble or presnap-motion simulation.'
      : f.family === 'long-yardage' ? 'THIRD & 27: weak edge DE_W drops from four-front-player dime; three rush/eight cover, stock safety depth. This is not new three-DL prevent personnel.'
      : f.family === 'counter' ? 'COUNTER INTO UNDER/SPILL: the installed Under look actually assigns five rush/front roles; do not assume four from its name.'
      : 'STATIONARY SPLIT ZONE: the slicer starts from rest. This does not test legal offensive motion or defensive motion communication.';
    const text = `${caveat} Actual coverage ${row.snap.effectiveCoverage}; ${row.snap.rushCount} rush / ${row.snap.coverageCount} cover. `
      + `${r.offenseYards.toFixed(2)} credited yd before penalties; ${row.metrics.conversionBeforePenalties ? 'reaches' : 'does not reach'} the line to gain. `
      + `Handoff ${clockNote(row.metrics.handoffAt)}; throw ${clockNote(row.metrics.throwAt)}; carrier contact ${clockNote(row.metrics.firstCarrierContactAt)}. `
      + 'Predetermined recorded witness, not a frequency estimate. Native trait ratings were not recorded; mass/height come from the saved physical profile.';
    const log: PlayLog = { index, quarter: 0, clock: 0, offense: 'OFF', down: p.down, distance: p.distance,
      yardline: p.los - 10, score: { home: 0, away: 0 }, call: p.offCall,
      defense: `${p.defCall} · ACTUAL ${row.snap.effectiveCoverage}: ${row.snap.rushCount} rush / ${row.snap.coverageCount} cover`,
      text, kind: f.kind, yards: r.offenseYards, firstDown: row.metrics.conversionBeforePenalties,
      stats: r.stats, outcome: r.outcome, duration: r.duration,
      plan: { personnel: f.formation === 'gun_wing_12' ? '12' : f.formation === 'i_pro_21' ? '21' : '11',
        formation: f.formation, qb: f.formation === 'i_pro_21' ? 'under' : 'gun', concept: schemeOf[f.concept] ?? f.concept,
        playAction: false, audible: false, defPersonnel: f.personnel, front: f.front, coverage: row.snap.effectiveCoverage,
        called: row.snap.calledCoverage, family: row.snap.effectiveCoverage, shell: row.snap.effectiveCoverage === 'cover4' ? 'two-high' : 'one-high',
        pressure: f.family === 'long-yardage', rushers: row.snap.rushCount },
      replay: { los: p.los, firstDownX: p.firstDownX, flip: false, frames: r.frames!, events: r.events, telemetry: r.telemetry,
        players: p.players.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.jersey, pos: a.position,
          weightLb: a.profile.massKg / .45359237 })),
        // The older packing type requires a ratings dictionary. An empty
        // dictionary records absence, and the generated inspector below
        // explicitly displays "Unrecorded" instead of inventing traits.
        profiles: p.players.map(a => ({ position: a.position, heightIn: a.profile.heightYd * 36,
          weightLb: a.profile.massKg / .45359237, ratings: {} })) } };
    const packed = packReplayPlay(log, 0);
    return { ...packed, id: p.id, fixtureSeed: panel.cohort.playSeed, sourceLabel: 'Current schematic witness',
      sourceSha256: panel.sourceBefore, originalFixtureId: p.id, physicalSha256: row.physicalSignature,
      profileSha256: row.snap.profileSha256, alignedGeometrySha256: row.snap.geometrySha256,
      recordedPhysicalProfiles: p.players.map(a => a.profile), actualCoverage: row.snap.effectiveCoverage,
      actualRushCount: row.snap.rushCount, actualCoverageCount: row.snap.coverageCount,
      concept: { ...packed.concept, name: f.family === 'bunch' ? 'Bunch Mesh · one crosser' : f.family === 'quad' ? 'Static quad quick-outs' : packed.concept.name } };
  });
}

function pairedPacked(nativeSource: string, baseline: PassPanel, baselineFilm: PassFilm, current: PassPanel, currentFilm: PassFilm) {
  const packets = [[baseline, baselineFilm, 'baseline'], [current, currentFilm, 'current']] as const;
  const selected = packets.map(([panel, film, label]) => {
    const rows = panel.rows.filter(r => r.id === PA_FIXTURE), movies = film.film.filter(p => p.id === PA_FIXTURE), row = rows[0], movie = movies[0];
    if (panel.schema !== 'pass-installation-panel-v1' || panel.sourceBefore !== panel.sourceAfter
      || film.sourceBefore !== panel.sourceBefore || film.sourceBefore !== film.sourceAfter
      || rows.length !== 1 || movies.length !== 1 || !row.observerVerified || movie.players.length !== 22
      || movie.result.telemetry?.level !== 'full' || !movie.result.frames?.length || movie.result.frames[0].t !== 0
      || movie.result.outcome !== row.outcome || movie.result.duration !== row.duration
      || movie.result.offenseYards !== row.offenseYardsBeforePenalties)
      throw new Error(`Incomplete source-pinned PA Shot ${label}`);
    return { panel, movie, row, label };
  });
  const [a, b] = selected;
  if (b.panel.sourceBefore !== nativeSource || a.panel.sourceBefore === b.panel.sourceBefore
    || a.panel.sharedWorldSha256 !== b.panel.sharedWorldSha256 || a.panel.rostersSha256 !== b.panel.rostersSha256
    || a.panel.scriptSha256 !== b.panel.scriptSha256 || a.row.profilesSha256 !== b.row.profilesSha256
    || hash(a.panel.cohort) !== hash(b.panel.cohort) || hash(a.movie.players) !== hash(b.movie.players))
    throw new Error('PA Shot pair does not preserve the declared source/roster/controller-collector comparison');
  return selected.map(({ panel, movie, row, label }, i) => {
    const r = movie.result;
    const text = `PA SHOT ${label.toUpperCase()} · actual Over nickel / Cover 3, four rush / seven cover. `
      + `Initial installed QB read: ${row.installed.firstRead ?? 'none'}${row.installed.firstReadPermanent ? ' (permanent protector)' : ''}. `
      + `Set-phase ticks reading a permanent protector: ${row.setWithPermanentReadTicks}. `
      + `Time to throw: ${r.stats.timeToThrow === undefined ? 'none' : r.stats.timeToThrow.toFixed(2) + ' s'}. `
      + `${r.offenseYards.toFixed(2)} credited yd before penalties. Same fixed player profiles and play seed; both films were recorded before export. `
      + 'This pair demonstrates the protector-read repair, not a pressure/physics calibration or an NFL passing-rate claim.';
    const log: PlayLog = { index: 0, quarter: 0, clock: 0, offense: 'OFF', down: 1, distance: 10,
      yardline: panel.cohort.los - 10, score: { home: 0, away: 0 }, call: `Gun Doubles · PA Shot · ${label}`,
      defense: 'Over nickel · ACTUAL Cover 3: 4 rush / 7 cover', text, kind: 'pass', yards: r.offenseYards,
      firstDown: !r.turnover && r.endX >= panel.cohort.los + 10, stats: r.stats, outcome: r.outcome, duration: r.duration,
      plan: { personnel: '11', formation: 'gun_doubles_11', qb: 'gun', concept: 'pa_shot', playAction: true,
        audible: false, defPersonnel: 'nickel', front: 'over', coverage: 'cover3', called: 'cover3', family: 'cover3',
        shell: 'one-high', pressure: false, rushers: 4 },
      replay: { los: panel.cohort.los, firstDownX: panel.cohort.los + 10, flip: false, frames: r.frames!, events: r.events, telemetry: r.telemetry,
        players: movie.players.map(a => ({ team: a.team, slot: a.slot, name: `${a.player.firstName} ${a.player.lastName}`,
          jersey: a.player.jersey, pos: a.player.position, weightLb: a.player.measurables.weightLb })),
        profiles: movie.players.map(a => ({ position: a.player.position, heightIn: a.player.measurables.heightIn,
          weightLb: a.player.measurables.weightLb, ratings: { ...a.player.ratings } })) } };
    return { ...packReplayPlay(log, i + 1), id: `PA-SHOT-${label}`, originalFixtureId: PA_FIXTURE,
      fixtureSeed: panel.cohort.playSeed, sourceLabel: `PA Shot ${label}`, sourceSha256: panel.sourceBefore,
      physicalSha256: row.executionSha256, profileSha256: row.profilesSha256,
      actualCoverage: 'cover3', actualRushCount: 4, actualCoverageCount: 7 };
  });
}

export function exportSchematicStress(panelPath: string, filmPath: string, output: string, pairedPaths?: readonly string[]) {
  if (pairedPaths && pairedPaths.length !== 4) throw new Error('Paired export requires baseline panel/film and current panel/film');
  const panelBytes = decode(panelPath), filmBytes = decode(filmPath);
  const panel = JSON.parse(panelBytes.toString()) as NativePanel, film = JSON.parse(filmBytes.toString()) as NativeFilm;
  validateSchematicRecordings(panel, film);
  const sourceInputs: Array<{ path: string; sha256: string }> = [panelPath, filmPath].map(path => ({ path, sha256: bytesHash(readFileSync(path)) }));
  const paired = pairedPaths ? pairedPacked(panel.sourceBefore,
    ...pairedPaths.map(path => { sourceInputs.push({ path, sha256: bytesHash(readFileSync(path)) }); return JSON.parse(decode(path).toString()); }) as [PassPanel, PassFilm, PassPanel, PassFilm]) : [];
  const plays = [...nativePacked(panel, film), ...paired];
  const cohort = `${film.plays.length} predetermined current native schematic films${paired.length ? ' plus the saved PA Shot baseline/current pair' : ''}. `
    + 'Every clip is complete native 11-on-11 with full recorded telemetry; export performs no simulation. '
    + 'Bunch Mesh has one crosser. Quad is static quick-outs, not a screen or motion. Third & 27 drops a weak edge for three rush/eight cover at stock safety depth. '
    + 'Under Counter actually has five rush/front roles. Reduced moving-slice witnesses remain in the raw packet, with no invented football result. '
    + 'Controlled setups have no played-game score or clock. Body facing is not eye tracking. All gains are before penalty enforcement. '
    + `Current source ${panel.sourceBefore.slice(0, 12)}${paired.length ? '; PA baseline source ' + paired[0].sourceSha256.slice(0, 12) : ''}. `
    + 'Sources, IDs, roles and installation limits remain in each play reference and note.';
  const groups = [{ label: 'Current native schematics', seed: panel.cohort.playSeed, sourceSha256: panel.sourceBefore,
    final: { home: 0, away: 0 }, quarters: [] }, ...paired.map(p => ({ label: p.sourceLabel, seed: p.fixtureSeed,
      sourceSha256: p.sourceSha256, final: { home: 0, away: 0 }, quarters: [] }))];
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), templatePath = resolve(root, 'viewer/replay.template.html');
  const data = { meta: { sourceSha256: panel.sourceBefore, sharedWorldSha256: panel.sharedWorldSha256,
    collectorScriptSha256: panel.scriptSha256, labSha256: panel.labSha256,
    exportScriptSha256: bytesHash(readFileSync(fileURLToPath(import.meta.url))), templateSha256: bytesHash(readFileSync(templatePath)),
    inputFiles: sourceInputs, panelDecodedSha256: bytesHash(panelBytes), filmDecodedSha256: bytesHash(filmBytes),
    rosterSha256: panel.cohort.rosterSha256, seed: panel.cohort.playSeed, telemetryLevel: 'full', cohort,
    final: { home: 0, away: 0 }, quarters: [],
    home: { name: 'Recorded Offense', abbr: 'OFF', color: '#1d4f91', text: '#ffffff' },
    away: { name: 'Recorded Defense', abbr: 'DEF', color: '#a3302a', text: '#ffffff' } }, games: groups,
    plays: compactReplayPlays(plays), limitations: panel.limitations,
    catalog: { coverage: { cover3: 'Cover 3 Sky', cover1: 'Cover 1 press man-free', cover4: 'Quarters MOD / stock depth' },
      front: { over: 'Over', under: 'Under · actual five rush/front roles', wide9: 'Wide-9' },
      formation: { gun_wing_12: 'Gun Wing 12', i_pro_21: 'I-Form Pro 21', gun_bunch_11: 'Gun Bunch 11',
        lab_static_quad_diamond: 'Static quad diamond 4x1', gun_doubles_11: 'Gun Doubles 11' } } };
  let template = readFileSync(templatePath, 'utf8');
  const marker = '/*__REPLAY_DATA__*/null', cardClock = "${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}";
  const gameLabel = ': key === \'game\' ? `Game ${Number(value) + 1} · seed ${games[value].seed}`';
  if (!template.includes(marker) || !template.includes(cardClock) || !template.includes(gameLabel)) throw new Error('Replay template markers changed');
  template = template.replace(cardClock, '${esc(p.id)} · ${esc(p.sourceLabel)}')
    .replace(gameLabel, ": key === 'game' ? games[value].label")
    .replace('<title>Gridiron Film Room</title>', '<title>Schematic stress film room</title>')
    .replace("$('inspector-ratings').innerHTML = ratings ?", "$('inspector-ratings').innerHTML = ratings && Object.keys(ratings).length ?")
    .replace(/^<link[^\n]*https:\/\/fonts\.[^\n]*\n/gm, '');
  const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
    + template.replace(marker, () => JSON.stringify(data).replace(/</g, '\\u003c')) + '\n</body></html>\n';
  mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
  return { output, plays: plays.length, source: panel.sourceBefore, inputFiles: sourceInputs,
    outputSha256: bytesHash(Buffer.from(html)), bytes: Buffer.byteLength(html), ids: plays.map(p => p.id) };
}

function main() {
  const [panel, film, output, flag, ...rest] = process.argv.slice(2);
  if (!panel || !film || !output || (flag !== undefined && flag !== '--paired') || (flag === '--paired' && rest.length !== 4))
    throw new Error('Usage: export-schematic-stress.ts panel.json[.gz] film.json.gz output.html [--paired baseline.json baseline-film.json.gz current.json current-film.json.gz]');
  console.log(JSON.stringify(exportSchematicStress(panel, film, output, flag ? rest : undefined), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
