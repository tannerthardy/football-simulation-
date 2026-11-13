/** Offline paired OL-base inspection recordings; no simulation or outcome selection.
 * node --import tsx scripts/export-ol-base.ts before/film.json.gz after/film.json.gz output.html
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import type { Frame, PlayEvent, ReplayTelemetry } from '../src/sim/types.js';
import { packReplayPlay } from './replay-data.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';

const [beforePath, afterPath, output] = process.argv.slice(2);
if (!beforePath || !afterPath || !output || process.argv.length !== 5 || !output.endsWith('.html'))
  throw new Error('Usage: export-ol-base.ts before/film.json.gz after/film.json.gz output.html');
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const isHash = (v: string) => /^[a-f0-9]{64}$/.test(v);
const concepts = ['iz_strong', 'wz_strong', 'power', 'trap', 'counter', 'oz_strong'];
const expectedIds = concepts.map(c => `OLB-R1-${c}-R-S3`);
const names: Record<string, string> = { iz_strong: 'Inside Zone', wz_strong: 'Wide Zone', power: 'Power',
  trap: 'Trap', counter: 'Counter', oz_strong: 'Outside Zone' };
const schemes: Record<string, string> = { iz_strong: 'insideZone', wz_strong: 'wideZone', power: 'power',
  trap: 'trap', counter: 'counter', oz_strong: 'outsideZone' };
interface Player {
  idx: number; team: 'O' | 'D'; slot: string; name: string; jersey: number; position: string;
  heightIn: number; weightLb: number; ratings: Record<string, number>; profile: Record<string, number>;
}
interface Range { n: number; min: number | null; max: number | null; mean: number | null }
interface Contact {
  interval: [number, number]; before: { idx: number; slot: string; support: { posture: number } };
  after: unknown; requested: unknown; bodyLoads: unknown[]; handLoads: unknown[]; strikes: unknown[];
}
interface SavedPlay {
  id: string; input: { roster: number; offenseSeed: number; defenseSeed: number; concept: string; flip: boolean; playSeed: number };
  selection: string; players: Player[]; initial: unknown[]; initialContext: unknown;
  initialSignature: string; signature: string; profileSha256: string; recordingVerified: boolean;
  fixture: { formation: string; front: string; coverage: string; los: number; ballY: number;
    firstDownX: number; down: number; distance: number; flip: boolean; playSeed: number };
  resolvedOffCall: { formation: string; concept: string; flip: boolean };
  end: { t: number; phase: string; censored: boolean; outcome: string | null; endSpot: unknown;
    carrier: number | null; carrierPosition: unknown; penalty: unknown };
  summary: { precontactFirstLevelPosture: Range; precontactUnsetPostureBins: number; firstLevelLoadPrePosture: Range; firstLevelLoads: unknown[] };
  firstContacts: Contact[]; firstAcquisitions: unknown[]; invariants: unknown; physics: unknown;
  recording: { frames: Frame[]; telemetry: ReplayTelemetry; events: PlayEvent[] };
}
interface SavedFilm {
  schema: string; sourceBefore: string; sourceAfter: string; scriptBefore: string; scriptAfter: string;
  inputSha256: string; profileSha256: string; moduleSha256: Record<string, string>;
  inputs: unknown[]; decisionDt: number; inspectionSeconds: number; definitions: Record<string, string>;
  observerChecks: Array<{ id: string; passed: boolean; observedSignature: string; plainSignature: string;
    observedInitialSignature: string; plainInitialSignature: string }>;
  plays: SavedPlay[];
}
const labels = ['Baseline: missing base request', 'Candidate: explicit OL base request'];
const inputs = [beforePath, afterPath].map(path => {
  const bytes = readFileSync(path), decoded = path.endsWith('.gz') ? gunzipSync(bytes) : bytes;
  return { path, rawSha256: createHash('sha256').update(bytes).digest('hex'),
    decodedSha256: createHash('sha256').update(decoded).digest('hex'), film: JSON.parse(decoded.toString()) as SavedFilm };
});
for (const { film } of inputs) {
  if (film.schema !== 'ol-base-review-v1' || film.sourceBefore !== film.sourceAfter || !isHash(film.sourceBefore)
    || film.scriptBefore !== film.scriptAfter || !isHash(film.scriptBefore)
    || film.inputSha256 !== hash(film.inputs) || !isHash(film.profileSha256)
    || film.decisionDt !== .05 || film.inspectionSeconds !== 3 || film.observerChecks.length !== 6
    || film.plays.map(p => p.id).join('|') !== expectedIds.join('|')
    || !isHash(film.moduleSha256['src/sim/behaviors/blocking.ts']) || !isHash(film.moduleSha256['src/physics/world.ts']))
    throw new Error('Expected source/tool-pinned fixed-six OL-base inspection recordings');
  for (const p of film.plays) {
    const check = film.observerChecks.find(c => c.id === p.id), { frames, telemetry } = p.recording;
    if (!check?.passed || !p.recordingVerified || p.selection !== 'fixed-before-outcomes'
      || p.input.roster !== 1 || p.input.flip || p.input.playSeed !== 3 || p.input.offenseSeed !== 31 || p.input.defenseSeed !== 32
      || check.observedSignature !== check.plainSignature || check.observedSignature !== p.signature
      || check.observedInitialSignature !== check.plainInitialSignature || check.observedInitialSignature !== p.initialSignature
      || hash(p.initialContext) !== p.initialSignature || hash(p.players) !== p.profileSha256
      || p.players.length !== 22 || p.initial.length !== 22 || !p.players.every((a, i) => a.idx === i && a.name && Number.isFinite(a.weightLb))
      || p.fixture.formation !== 'ace_11' || p.fixture.front !== 'over' || p.fixture.coverage !== 'cover3'
      || p.fixture.los !== 40 || p.fixture.firstDownX !== 50 || p.fixture.down !== 1 || p.fixture.distance !== 10
      || p.fixture.flip !== p.input.flip || p.fixture.playSeed !== p.input.playSeed
      || frames.length < 2 || frames[0].t !== 0 || telemetry.level !== 'full' || telemetry.frames.length !== frames.length
      || frames.some((f, i) => f.agents.length !== 66 || f.t !== telemetry.frames[i].t || (i > 0 && f.t <= frames[i - 1].t))
      || p.end.t > film.inspectionSeconds + 1e-9 || p.end.t <= 0 || p.end.censored !== (p.end.phase === 'live')
      || (p.end.censored && (p.end.t !== 3 || p.end.endSpot !== null || p.end.outcome === 'timeout'))
      || Math.abs(frames.at(-1)!.t + film.decisionDt - p.end.t) > 1e-9)
      throw new Error(`Invalid recorded state, endpoint or observer pins: ${p.id}`);
  }
}
const before = inputs[0].film, after = inputs[1].film;
if (before.inputSha256 !== after.inputSha256 || before.profileSha256 !== after.profileSha256
  || before.scriptBefore !== after.scriptBefore || before.moduleSha256['src/physics/world.ts'] !== after.moduleSha256['src/physics/world.ts'])
  throw new Error('Paired OL-base recordings must share input/profile/tool/World pins');
if (before.sourceBefore === after.sourceBefore
  || before.moduleSha256['src/sim/behaviors/blocking.ts'] === after.moduleSha256['src/sim/behaviors/blocking.ts'])
  throw new Error('Baseline/candidate recordings must pin distinct OL-controller sources');
for (let i = 0; i < expectedIds.length; i++) {
  const a = before.plays[i], b = after.plays[i];
  for (const key of ['id', 'input', 'players', 'initial', 'initialContext', 'initialSignature', 'fixture', 'profileSha256'] as const)
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) throw new Error(`Paired initial state/profile mismatch: ${a.id} ${key}`);
}
const rangeText = (r: Range) => r.n ? `${r.mean!.toFixed(3)} mean (${r.min!.toFixed(3)}–${r.max!.toFixed(3)}, ${r.n} sampled bins)` : 'no sampled bins';
const endpointText = (p: SavedPlay) => p.end.censored
  ? `Live ${p.end.t.toFixed(2)}s inspection censor; no whistle, timeout, credited gain or football outcome`
  : `Natural ${p.end.outcome ?? 'unlabelled finish'} at ${p.end.t.toFixed(2)}s; no credited gain computed for this inspection`;
const contactText = (p: SavedPlay) => p.firstContacts.length
  ? p.firstContacts.map(c => `${c.before.slot} ${c.interval.map(t => t.toFixed(2)).join('–')}s (${[
    ...(c.bodyLoads.length ? ['body'] : []), ...(c.handLoads.length ? ['hands'] : []), ...(c.strikes.length ? ['strike'] : [])].join('/')})`).join('; ')
  : 'No OL-to-defender force observed within the window';
const plays = inputs.flatMap(({ film }, group) => film.plays.map((p, index) => {
  const label = names[p.input.concept], endpoint = endpointText(p), firstLoad = contactText(p);
  const text = `${labels[group]} · ${p.id} · source ${film.sourceBefore.slice(0, 12)} · ${endpoint}. `
    + `Unengaged first-level physical posture: ${rangeText(p.summary.precontactFirstLevelPosture)}. `
    + `First OL-to-defender achieved load: ${firstLoad}. `
    + 'Same initial bodies, generated roster, calls and play seed. Low/high stance is a perceived cue; actual posture is the physical body state. '
    + 'Acquisition and an achieved force interval do not establish a sustained block or block win. Six predetermined calls, not an NFL rate or outcome-selected film.';
  const log: PlayLog = { index, quarter: 0, clock: 0, offense: 'OFF', down: p.fixture.down,
    distance: p.fixture.distance, yardline: p.fixture.los - 10, score: { home: 0, away: 0 },
    call: `${labels[group]} · Singleback Ace · ${label}`, defense: '4-3 Over · Cover 3',
    text, kind: 'run', yards: 0,
    plan: { personnel: '11', formation: 'ace_11', qb: 'under', concept: schemes[p.input.concept], playAction: false,
      audible: false, defPersonnel: 'base43', front: 'over', coverage: 'cover3', called: 'cover3', family: 'cover3',
      shell: 'one-high', pressure: false, rushers: 4 },
    replay: { los: p.fixture.los, firstDownX: p.fixture.firstDownX, flip: p.fixture.flip,
      frames: p.recording.frames, events: p.recording.events, telemetry: p.recording.telemetry,
      players: p.players.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.jersey, pos: a.position, weightLb: a.weightLb })),
      profiles: p.players.map(a => ({ position: a.position, heightIn: a.heightIn, weightLb: a.weightLb, ratings: { ...a.ratings } })) } };
  return { ...packReplayPlay(log, group), id: `${group ? 'CAND' : 'BASE'}-${p.id}`, fixtureId: p.id,
    fixtureInput: p.input, fixtureSeed: p.input.playSeed, sourceLabel: labels[group], sourceSha256: film.sourceBefore,
    concept: { id: p.input.concept, name: label, family: ['power', 'counter', 'trap'].includes(p.input.concept) ? 'gap' : 'zone' },
    flags: { td: false, to: false, sack: false, big: false, complete: false, stuff: false, broken: false, oob: false,
      pressure: false, contact: p.firstContacts.length > 0 },
    eventDetails: p.recording.events, recordedPlayers: p.players,
    physicalProfiles: p.players.map(a => ({ idx: a.idx, profile: { ...a.profile } })),
    profileSha256: p.profileSha256, initialStateSha256: p.initialSignature, physicalSha256: p.signature,
    recordedInitialState: p.initial, recordedInitialContext: p.initialContext, fixture: p.fixture,
    resolvedOffCall: p.resolvedOffCall, inspectionEndpoint: p.end, windowCensored: p.end.censored,
    recordingVerified: true, filmSelection: p.selection, physics: p.physics, invariants: p.invariants,
    baseObservation: { summary: p.summary, firstContacts: p.firstContacts, firstAcquisitions: p.firstAcquisitions,
      endpointText: endpoint, firstLoadText: firstLoad,
      postureText: `Unengaged first-level posture ${rangeText(p.summary.precontactFirstLevelPosture)}; approach/regrab samples` },
    inspectedBlocker: p.players.find(a => a.slot === 'LT')!.idx };
}));
const comparison = inputs.map(({ film, rawSha256, decodedSha256 }, i) => ({ label: labels[i], sourceSha256: film.sourceBefore,
  diagnosticScriptSha256: film.scriptBefore, moduleSha256: film.moduleSha256, inputSha256: film.inputSha256,
  profilesSha256: film.profileSha256, rawFilmSha256: rawSha256, rawDecodedFilmSha256: decodedSha256 }));
const data = { meta: { sourceSha256: after.sourceBefore, sourceComparison: comparison, seed: 3, telemetryLevel: 'full',
  filmSchema: 'ol-base-review-v1', inspectionSeconds: 3, decisionDt: .05, definitions: after.definitions,
  cohort: '12 saved full 11-on-11 OL-base inspection clips: six predetermined calls, each at baseline and candidate sources. '
    + 'Identical initial bodies, generated roster, call/input list and play seed. Candidate supplies the existing .7 physical posture request for first-level OL fits; '
    + 'shared World capabilities are unchanged. Low posture already pays the World movement cost. '
    + 'Live three-second endpoints are censored; natural finishes are labelled separately, with no rushing gain computed. No simulated game quarter or score. '
    + 'Raw replay frame times retain the existing controller-start convention: a final sample labelled2.95s represents the completed interval before the3.00s endpoint. '
    + 'Select an OL and enable movement/contact layers to inspect requested motion, posture, support and recorded force. '
    + 'These controlled cases are not a league sample or proof that the remaining OL paths and leverage are correct.',
  final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Controlled Offense', abbr: 'OFF', color: '#1d4f91', text: '#fff' },
  away: { name: 'Controlled Defense', abbr: 'DEF', color: '#a3302a', text: '#fff' } },
  games: inputs.map(({ film }, i) => ({ label: labels[i], seed: 3, sourceSha256: film.sourceBefore,
    final: { home: 0, away: 0 }, quarters: [] })),
  plays: compactReplayPlays(plays), catalog: { coverage: { cover3: 'Cover 3' }, front: { over: '4-3 Over' },
    formation: { ace_11: 'Singleback Ace' } } };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), templatePath = resolve(root, 'viewer/replay.template.html');
let template = readFileSync(templatePath, 'utf8');
function replace(from: string, to: string): void {
  if (!template.includes(from)) throw new Error(`Viewer export marker changed: ${from.slice(0, 70)}`);
  template = template.replace(from, to);
}
replace("key === 'game' ? `Game ${Number(value) + 1} · seed ${games[value].seed}`", "key === 'game' ? games[value].label");
replace("${p.nullified ? 'Penalty' : gain(p.yds)}", 'Inspection window');
replace("${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}", '${esc(p.id)} · ${esc(p.sourceLabel)}');
replace("$('dd').textContent = `${ord[p.down] || p.down + 'th'} & ${100 - p.yl <= p.dist ? 'Goal' : p.dist} · ${yl(p.yl)}`;",
  "$('dd').textContent = `${ord[p.down]} & ${p.dist} · controlled OL-base inspection`;");
replace('const kv = [];', "const kv = [];\n    if (p.baseObservation) {\n      kv.push(esc(p.baseObservation.postureText));\n      kv.push(esc(p.baseObservation.endpointText));\n      kv.push('First OL force: ' + esc(p.baseObservation.firstLoadText));\n    }");
replace("inspectorStamp = '';\n    prepareTelemetry(p);", "$('inspect-player').value = String(p.inspectedBlocker);\n    inspectorStamp = '';\n    prepareTelemetry(p);");
replace("if (agent?.intent?.velocity) add('Requested velocity', agent.intent.velocity.map((v)=>Number(v).toFixed(2)).join(', ')+' yd/s');",
  "if (agent?.intent?.velocity) add('Requested velocity', agent.intent.velocity.map((v)=>Number(v).toFixed(2)).join(', ')+' yd/s');\n      if (agent?.intent) add('Requested physical posture', agent.intent.posture != null ? Number(agent.intent.posture).toFixed(2) : 'Unset · recorded World default 0.20');");
replace("${p.nullified?'Nullified (physical replay)':gain(p.yds)}", 'Inspection window · no credited gain');
replace("jumps.push(['Finish', dur]);", "jumps.push(['Last recorded sample', dur]);");
template = template.replaceAll('All games', 'Both recorded sources').replaceAll('Controlled setup · seed', 'Controlled OL inspection · seed');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Missing replay data marker');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
writeFileSync(output.replace(/\.html$/, '-validation.json'), JSON.stringify({ schema: 'ol-base-export-validation-v1',
  sourceComparison: comparison, fixedFixtureIds: expectedIds, clips: plays.length,
  recordingObserverChecks: inputs.map(({ film }, i) => ({ label: labels[i], checks: film.observerChecks })),
  exporterSha256: fileHash(fileURLToPath(import.meta.url)), templateSha256: fileHash(templatePath), outputSha256: fileHash(output),
  scope: 'Read-only saved-recording export. Raw full telemetry, physical profiles, initial context, events and force/acquisition observations retained. '
    + 'Existing positional/facing packing quantizes to0.1. Neutral hidden packing fields do not invent a gain/game result; actual controlled down/distance remain labelled as setup. '
    + 'Natural endpoints and live inspection censors remain distinct. Frame times are copied, not shifted.' }, null, 2) + '\n');
console.log(`Wrote ${plays.length} paired fixed OL-base inspection clips to ${output}; ${(html.length / 1024 / 1024).toFixed(2)}MB.`);
