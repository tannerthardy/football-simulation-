/** Offline comparison of four predetermined Cover4 recordings and an optional retained witness.
 * node --import tsx scripts/export-visible-help.ts before/raw.json.gz after/raw.json.gz output.html [baselineLabel candidateLabel]
 * Does not simulate a play, resolve credited yards or select favorable outcomes.
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

const args = process.argv.slice(2);
const [beforePath, afterPath, output, baselineLabel, candidateLabel] = args;
if (!beforePath || !afterPath || !output || ![3, 5].includes(args.length) || !output.endsWith('.html')
  || (args.length === 5 && (!baselineLabel?.trim() || !candidateLabel?.trim())))
  throw new Error('Usage: export-visible-help.ts before/raw.json.gz after/raw.json.gz output.html [baselineLabel candidateLabel]');
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const isHash = (v: string) => /^[a-f0-9]{64}$/.test(v);
const fixtures = [
  { formation: 'gun_doubles_11', concept: 'four_verts', name: 'Four Verticals', formationName: 'Gun Doubles' },
  { formation: 'gun_doubles_11', concept: 'dagger', name: 'Dagger', formationName: 'Gun Doubles' },
  { formation: 'gun_bunch_11', concept: 'mesh', name: 'Mesh', formationName: 'Gun Bunch' },
  { formation: 'gun_trips_11', concept: 'smash', name: 'Smash', formationName: 'Gun Trips' },
];
const fixedIds = fixtures.map(c => `HELP-R1-${c.formation}-${c.concept}-cover4-S3`);
const witnessId = 'HELP-R2-gun_trips_11-smash-cover4-S3';
interface Player {
  idx: number; team: 'O' | 'D'; slot: string; profile: Record<string, number>;
  player: { firstName: string; lastName: string; jersey: number; position: string;
    ratings: Record<string, number>; measurables: { weightLb: number; heightIn: number } };
}
interface Input { roster: number; offenseSeed: number; defenseSeed: number;
  formation: string; concept: string; coverage: string; playSeed: number }
interface Check {
  id: string; initial: boolean; final: boolean; recording: boolean;
  observedInitialSignature: string; plainInitialSignature: string;
  observedSignature: string; plainSignature: string;
}
interface End {
  t: number; phase: string; censored: boolean; outcome: PlayLog['outcome'] | null;
  possession: string; carrier: number | null; endSpot: { x: number; y: number } | null;
  stats: NonNullable<PlayLog['stats']>; penalty: unknown;
}
interface Row {
  id: string; input: Input; selection: string; players: Player[]; profileSha256: string;
  initialSignature: string; initialFootballSignature: string;
  initialContext: { agents: unknown[]; rng: unknown; ball: unknown; intents: unknown };
  signature: string; end: End; summary: Record<string, number>;
  recording: { frames: Frame[]; telemetry: ReplayTelemetry; events: PlayEvent[] } | null;
}
interface Report {
  schema: string; sourceSha256: string; toolSha256: string; sourceVersionToolSha256: string;
  inputSha256: string; profilesSha256: string; inputs: Input[]; inspectionSeconds: number;
  observerNeutrality: Check[]; rows: Row[];
}
const labels = [baselineLabel ?? 'Baseline: previous coverage', candidateLabel ?? 'Candidate: visible help and early vertical read'];
const inputs = [beforePath, afterPath].map(path => {
  const bytes = readFileSync(path), decoded = path.endsWith('.gz') ? gunzipSync(bytes) : bytes;
  return { rawSha256: createHash('sha256').update(bytes).digest('hex'),
    decodedSha256: createHash('sha256').update(decoded).digest('hex'), report: JSON.parse(decoded.toString()) as Report };
});
const expectedIds = inputs[0].report.rows.filter(r => r.recording).map(r => r.id);
const includesWitness = expectedIds.length === 5;
if (expectedIds.join('|') !== [...fixedIds, ...(includesWitness ? [witnessId] : [])].join('|'))
  throw new Error('Expected four predetermined R1 Cover4 films, optionally followed by the retained R2 Smash witness');
for (const { report } of inputs) {
  if (report.schema !== 'coverage-help-review-v1' || !isHash(report.sourceSha256)
    || !isHash(report.toolSha256) || !isHash(report.sourceVersionToolSha256)
    || report.inputSha256 !== hash(report.inputs) || report.inputs.length !== 24
    || report.rows.length !== 24 || report.observerNeutrality.length !== 24 || report.inspectionSeconds !== 8
    || report.profilesSha256 !== hash(report.rows.map(r => ({ id: r.id, players: r.players }))))
    throw new Error('Expected pinned ordinary coverage-help panel');
  const recorded = report.rows.filter(r => r.recording);
  if (recorded.map(r => r.id).join('|') !== expectedIds.join('|')) throw new Error('Expected matching recorded fixtures in both panels');
  for (const row of report.rows) {
    const witness = includesWitness && row.id === witnessId;
    const check = report.observerNeutrality.find(c => c.id === row.id);
    if (!check?.initial || !check.final || check.observedSignature !== check.plainSignature
      || check.observedSignature !== row.signature || check.observedInitialSignature !== check.plainInitialSignature
      || check.observedInitialSignature !== row.initialSignature || check.recording !== !!row.recording
      || row.selection !== (witness ? 'retained-retrospective-witness' : 'fixed-before-outcomes') || hash(row.players) !== row.profileSha256
      || hash(row.initialContext) !== row.initialSignature
      || hash({ agents: row.initialContext.agents, rng: row.initialContext.rng,
        ball: row.initialContext.ball, intents: row.initialContext.intents }) !== row.initialFootballSignature)
      throw new Error(`Invalid observer/state/profile pins: ${row.id}`);
    if (!row.recording) continue;
    const { frames, telemetry } = row.recording;
    if (row.input.roster !== (witness ? 2 : 1) || row.input.offenseSeed !== (witness ? 31 : 7)
      || row.input.defenseSeed !== (witness ? 32 : 19)
      || row.input.playSeed !== 3 || row.input.coverage !== 'cover4' || row.players.length !== 22
      || !row.players.every((a, i) => a.idx === i && a.player.firstName && Number.isFinite(a.player.measurables.weightLb))
      || frames.length < 2 || frames[0].t !== 0 || telemetry.level !== 'full'
      || telemetry.frames.length !== frames.length
      || frames.some((f, i) => f.agents.length !== 66 || f.t !== telemetry.frames[i].t
        || (i > 0 && Math.abs(f.t - frames[i - 1].t - .05) > 1e-8))
      || row.end.t <= 0 || row.end.t > 8 + 1e-9 || row.end.censored !== (row.end.phase === 'live')
      || (row.end.censored && (row.end.t !== 8 || row.end.endSpot !== null || row.end.outcome === 'timeout'))
      || Math.abs(frames.at(-1)!.t + .05 - row.end.t) > 1e-8)
      throw new Error(`Invalid recorded frames/endpoint: ${row.id}`);
  }
}
const [before, after] = inputs.map(i => i.report);
if (before.sourceSha256 === after.sourceSha256 || before.inputSha256 !== after.inputSha256
  || before.profilesSha256 !== after.profilesSha256 || before.toolSha256 !== after.toolSha256
  || before.sourceVersionToolSha256 !== after.sourceVersionToolSha256)
  throw new Error('Paired panels must have distinct engines and identical inputs, profiles and tools');
const recorded = inputs.map(({ report }) => report.rows.filter(r => r.recording));
for (let i = 0; i < expectedIds.length; i++) {
  const a = recorded[0][i], b = recorded[1][i];
  for (const key of ['id', 'input', 'players', 'profileSha256', 'initialFootballSignature'] as const)
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) throw new Error(`Paired initial football state mismatch: ${a.id} ${key}`);
}
const endpointText = (r: Row) => r.end.censored
  ? `Live ${r.end.t.toFixed(2)}s inspection censor; no whistle, timeout or football outcome`
  : `Natural ${r.end.outcome ?? 'unlabelled finish'} at ${r.end.t.toFixed(2)}s${r.end.stats.interceptedBy ? ' after an interception' : r.end.stats.completed ? ' after a completion' : r.end.stats.scramble ? ' after a scramble' : ''}`;
const plays = recorded.flatMap((rows, group) => rows.map((r, i) => {
  const fixture = fixtures[i === 4 ? 3 : i], recording = r.recording!, label = labels[group], endpoint = endpointText(r);
  const witnessLabel = r.id === witnessId ? ' · Retrospective witness (roster 2)' : '';
  const replayPlayers = r.players.map(a => ({ team: a.team, slot: a.slot,
    name: `${a.player.firstName} ${a.player.lastName}`, jersey: a.player.jersey,
    pos: a.player.position, weightLb: a.player.measurables.weightLb }));
  const log: PlayLog = { index: i, quarter: 0, clock: 0, offense: 'OFF', down: 1, distance: 10,
    yardline: 30, score: { home: 0, away: 0 }, kind: 'pass', yards: 0,
    call: `${label} · ${fixture.formationName} · ${fixture.name}${witnessLabel}`, defense: '4-3 Over · Quarters (MOD)',
    text: `${label}${witnessLabel} · source ${inputs[group].report.sourceSha256.slice(0, 12)} · ${endpoint}. Inspect a defender for assignments and delayed perceived targets; credited yards are not computed for this diagnostic.`,
    stats: r.end.stats, outcome: r.end.censored ? undefined : r.end.outcome ?? undefined,
    plan: { personnel: '11', formation: r.input.formation, qb: 'gun', concept: r.input.concept,
      playAction: false, audible: false, defPersonnel: 'nickel', front: 'over', coverage: 'cover4',
      called: 'cover4', family: 'cover4', shell: 'two-high', pressure: false, rushers: 4 },
    replay: { los: 40, firstDownX: 50, flip: false, frames: recording.frames,
      events: recording.events, telemetry: recording.telemetry, players: replayPlayers,
      profiles: r.players.map(a => ({ position: a.player.position, ...a.player.measurables, ratings: a.player.ratings })) } };
  const packed = packReplayPlay(log, group);
  return { ...packed, id: `${group ? 'FINAL' : 'BEFORE'}-${r.id}`, fixtureId: r.id, fixtureInput: r.input,
    sourceLabel: label, sourceSha256: inputs[group].report.sourceSha256,
    concept: { ...packed.concept, name: fixture.name },
    fixtureSeed: r.input.playSeed, inspectedDefender: r.players.find(a => a.slot === 'FS')!.idx,
    endpointLabel: endpoint, creditedYardsComputed: false,
    flags: { ...packed.flags, big: false, stuff: false },
    eventDetails: recording.events, recordedPlayers: r.players,
    physicalProfiles: r.players.map(a => ({ idx: a.idx, profile: a.profile })),
    recordedInitialContext: r.initialContext, initialStateSha256: r.initialSignature,
    initialFootballSha256: r.initialFootballSignature, profileSha256: r.profileSha256,
    physicalSha256: r.signature, inspectionEndpoint: r.end, windowCensored: r.end.censored,
    recordingVerified: true, filmSelection: r.selection, helpSummary: r.summary };
}));
const comparison = inputs.map(({ report, rawSha256, decodedSha256 }, i) => ({ label: labels[i],
  sourceSha256: report.sourceSha256, diagnosticScriptSha256: report.toolSha256,
  sourceVersionToolSha256: report.sourceVersionToolSha256, inputSha256: report.inputSha256,
  profilesSha256: report.profilesSha256, rawReportSha256: rawSha256, decodedReportSha256: decodedSha256,
  observerChecks: report.observerNeutrality }));
const data = { meta: { sourceSha256: after.sourceSha256, sourceComparison: comparison,
  seed: 3, telemetryLevel: 'full', filmSchema: 'visible-help-film-v1', inspectionSeconds: 8,
  cohort: includesWitness
    ? 'Ten clips pair four predetermined first-roster Cover4 calls and one retained retrospective second-roster Smash witness. Players and initial football state match within each source pair; the witness was retained from earlier observations and is not a representative sample. Broader panel results are mixed. Natural endings and any live eight-second inspection censors are labelled; credited yards are not computed.'
    : 'Eight clips pair four predetermined first-roster Cover4 calls, with identical players and initial football state; broader panel results are mixed. Natural endings and any live eight-second inspection censors are labelled; credited yards are not computed, and the second-roster witness remains in raw decision evidence outside this film set.',
  final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Controlled Offense', abbr: 'OFF', color: '#1d4f91', text: '#fff' },
  away: { name: 'Controlled Defense', abbr: 'DEF', color: '#a3302a', text: '#fff' } },
  games: inputs.map(({ report }, i) => ({ label: labels[i], seed: 3, sourceSha256: report.sourceSha256,
    final: { home: 0, away: 0 }, quarters: [] })), plays: compactReplayPlays(plays),
  catalog: { coverage: { cover4: 'Quarters (MOD)' }, front: { over: '4-3 Over' },
    formation: Object.fromEntries(fixtures.map(f => [f.formation, f.formationName])) } };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), templatePath = resolve(root, 'viewer/replay.template.html');
let template = readFileSync(templatePath, 'utf8');
function replace(from: string, to: string) {
  if (!template.includes(from)) throw new Error(`Viewer export marker changed: ${from.slice(0, 70)}`);
  template = template.replace(from, to);
}
replace("key === 'game' ? `Game ${Number(value) + 1} · seed ${games[value].seed}`", "key === 'game' ? games[value].label");
replace("${p.nullified ? 'Penalty' : gain(p.yds)}", '${esc(p.endpointLabel)}');
replace("${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}", '${esc(p.id)} · ${esc(p.sourceLabel)}');
replace("$('dd').textContent = `${ord[p.down] || p.down + 'th'} & ${100 - p.yl <= p.dist ? 'Goal' : p.dist} · ${yl(p.yl)}`;",
  "$('dd').textContent = `${ord[p.down]} & ${p.dist} · controlled coverage inspection`;");
replace('const kv = [];', "const kv = [];\n    if (p.endpointLabel) kv.push(esc(p.endpointLabel) + ' · no credited yards computed');");
replace("inspectorStamp = '';\n    prepareTelemetry(p);", "$('inspect-player').value = String(p.inspectedDefender);\n    inspectorStamp = '';\n    prepareTelemetry(p);");
replace("${p.nullified?'Nullified (physical replay)':gain(p.yds)}", '${esc(p.endpointLabel)}');
replace("jumps.push(['Finish', dur]);", "jumps.push(['Last recorded sample', dur]);");
template = template.replaceAll('All games', 'Both recorded sources').replaceAll('Controlled setup · seed', 'Controlled coverage inspection · seed');
// Copied references and video stamps must identify the selected engine version.
template = template.replaceAll('meta.sourceSha256?.slice(0, 12)', '(p.sourceSha256 ?? meta.sourceSha256)?.slice(0, 12)')
  .replaceAll('meta.sourceSha256?.slice(0,12)', '(p.sourceSha256 ?? meta.sourceSha256)?.slice(0,12)');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Missing replay data marker');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
writeFileSync(output + '.validation.json', JSON.stringify({ schema: 'visible-help-export-validation-v1',
  sourceComparison: comparison, fixedFixtureIds: fixedIds, recordedFixtureIds: expectedIds,
  retrospectiveFixtureIds: includesWitness ? [witnessId] : [], clips: plays.length,
  exporterSha256: fileHash(fileURLToPath(import.meta.url)), templateSha256: fileHash(templatePath), outputSha256: fileHash(output),
  scope: 'Read-only saved-recording export; no simulation, outcome selection or credited yard calculation. Full telemetry, profiles, raw events, endpoints and initial contexts are retained. Cross-source initial football bodies/RNG/ball/intents match; full contexts differ legitimately with perception state. Existing position/facing packing quantizes to 0.1. Raw frame times retain the existing controller-start convention: the last sample precedes the endpoint by 0.05s. '
    + (includesWitness ? 'Four first-roster fixtures were selected before outcomes; the second-roster Smash pair is an explicitly retained retrospective witness.'
      : 'The second-roster decision witness is outside these four selected-before-outcomes films.') }, null, 2) + '\n');
console.log(`Wrote ${plays.length} paired visible-help inspection clips to ${output}; ${(html.length / 1024 / 1024).toFixed(2)}MB.`);
