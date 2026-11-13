/** Offline14-film export of saved reduced slice-contact witnesses.
 * node --import tsx scripts/export-motion-contact.ts film.json.gz output.html
 * No resimulation, outcome selection or asserted football result.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import type { PlayLog } from '../src/game/game.js';
import type { MotionContactInput } from '../src/lab/motion-contact.js';
import type { Frame, PlayEvent, ReplayTelemetry } from '../src/sim/types.js';
import { packReplayPlay } from './replay-data.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';

const [input, output] = process.argv.slice(2);
if (!input || !output || process.argv.length !== 4) throw new Error('Usage: export-motion-contact.ts film.json.gz output.html');
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
interface Player { idx: number; team: 'O' | 'D'; slot: string; name: string; jersey: number; position: string;
  heightIn: number; weightLb: number; ratings: Record<string, number>; profile: Record<string, number> }
interface Contact {
  interval: [number, number]; source?: 'body' | 'hands' | 'strike'; sources?: Array<'body' | 'hands' | 'strike'>;
  bodyNormalImpulse?: number; handNormalImpulse?: number; handTangentialImpulse?: number;
}
interface ContactMetrics {
  engagedDecisionIntervals: number; actualLoadedDecisionIntervals: number; handBodyLoadedDecisionIntervals: number;
  engagedHandBodyLoadedDecisionIntervals: number; handNormalAbsoluteImpulse: number; handTangentialAbsoluteImpulse: number;
  bodyNormalImpulse: number; strikeImpulseMagnitudeSum: number; strikeKineticWork: number;
}
interface Installation {
  name: 'formation-consistent-v2'; formationFlip: boolean; strongSign: number; stagedTESide: number; sliceSign: number; plannedDriveSign: number;
}
interface SavedPlay {
  id: string; input: MotionContactInput; selection: string; negativeControl: boolean; windowCensored: boolean;
  initialStateSha256: string; profileSha256: string; physicalSha256: string; recordingVerified: boolean;
  initialContext: unknown; participants: { te: Player; end: Player }; initial: { teKineticEnergyKgYd2PerS2: number; installation?: Installation };
  classification: string; firstAcquisition: { t: number } | null; firstContact: Contact | null;
  firstHandBodyContact?: Contact | null; contactMetrics?: ContactMetrics;
  frames: Frame[]; telemetry: ReplayTelemetry; events: PlayEvent[]; players: Player[];
}
const encoded = readFileSync(input), decoded = gunzipSync(encoded), film = JSON.parse(decoded.toString()) as {
  schema: string; sourceBefore: string; sourceAfter: string; scriptBefore: string; scriptAfter: string;
  inputSha256: string; negativeInputSha256: string; profileSha256: string; decisionDt: number; durationSeconds: number;
  fixtureBefore?: string; fixtureAfter?: string; installation?: string;
  definitions: Record<string, string>; observerChecks: Array<{ id: string; passed: boolean; physicalSha256: string; initialStateSha256: string }>;
  plays: SavedPlay[];
};
const expectedIds: string[] = [];
for (const side of [1, -1]) for (const geometry of ['wideSurface', 'penetratingEdge']) for (const speed of [0, 2.5, 4])
  expectedIds.push(`MC-S7-${geometry}-${side < 0 ? 'L' : 'R'}-V${speed}-P12`);
for (const side of [1, -1]) expectedIds.push(`MC-S7-initialReachNegative-${side < 0 ? 'L' : 'R'}-V8-P12`);
const historical = film.schema === 'motion-contact-film-v1';
if ((!historical && film.schema !== 'motion-contact-film-v2') || film.sourceBefore !== film.sourceAfter || film.scriptBefore !== film.scriptAfter
  || film.decisionDt !== .05 || film.durationSeconds !== 2.5 || film.plays.map(p => p.id).join('|') !== expectedIds.join('|')
  || film.observerChecks.length !== 14) throw new Error('Expected source-pinned fixed14 reduced witness recordings');
if (!historical && (film.installation !== 'formation-consistent-v2' || film.fixtureBefore !== film.fixtureAfter
  || !/^[a-f0-9]{64}$/.test(film.fixtureBefore ?? '')))
  throw new Error('Expected pinned formation-consistent-v2 fixture');
for (const p of film.plays) {
  const check = film.observerChecks.find(c => c.id === p.id);
  if (!check?.passed || !p.recordingVerified || !p.windowCensored || p.selection !== 'fixed-before-outcomes'
    || check.physicalSha256 !== p.physicalSha256 || check.initialStateSha256 !== p.initialStateSha256
    || hash(p.initialContext) !== p.initialStateSha256 || hash(p.participants) !== p.profileSha256
    || p.frames.length !== 51 || p.frames[0].t !== 0 || p.frames.at(-1)!.t !== 2.5
    || p.telemetry.level !== 'full' || p.telemetry.frames.length !== 51 || p.players.length !== 22)
    throw new Error(`Invalid fixed fixture recording/pins: ${p.id}`);
  if (!historical) {
    const installation = p.initial.installation;
    if (!installation || installation.name !== film.installation || typeof installation.formationFlip !== 'boolean'
      || installation.strongSign !== p.input.side || installation.stagedTESide !== p.input.side
      || installation.sliceSign !== -p.input.side || installation.plannedDriveSign !== installation.sliceSign
      || hash((p.initialContext as { installation?: unknown }).installation) !== hash(installation)
      || !p.contactMetrics || !Object.hasOwn(p, 'firstHandBodyContact'))
      throw new Error(`Missing corrected installation or full achieved-load accounting: ${p.id}`);
    for (const contact of [p.firstContact, p.firstHandBodyContact]) if (contact
      && (!contact.sources?.length || contact.sources.some(s => !['body', 'hands', 'strike'].includes(s))))
      throw new Error(`Invalid achieved contact channels: ${p.id}`);
    if (p.firstHandBodyContact && !p.firstHandBodyContact.sources!.some(s => s === 'body' || s === 'hands'))
      throw new Error(`Hand/body contact must contain actual hand/body load: ${p.id}`);
    for (const [key, value] of Object.entries(p.contactMetrics)) if (!Number.isFinite(value)
      || (value < 0 && key !== 'strikeKineticWork')
      || (key.endsWith('DecisionIntervals') && (!Number.isInteger(value) || value > 50)))
      throw new Error(`Invalid contact metric ${key}: ${p.id}`);
    if (p.contactMetrics.engagedHandBodyLoadedDecisionIntervals > p.contactMetrics.handBodyLoadedDecisionIntervals
      || p.contactMetrics.handBodyLoadedDecisionIntervals > p.contactMetrics.actualLoadedDecisionIntervals)
      throw new Error(`Inconsistent achieved-load interval counts: ${p.id}`);
  }
}
const recordingLabel = historical
  ? 'Historical fixture · inconsistent side installation; strike loads unrecorded'
  : 'Corrected slice installation · achieved body, hand and strike loads';
const interval = (c: Contact) => c.interval.map(t => t.toFixed(2)).join('–') + 's';
const channels = (c: Contact) => (c.sources ?? (c.source ? [c.source] : [
  ...(c.bodyNormalImpulse ? ['body'] : []),
  ...(c.handNormalImpulse || c.handTangentialImpulse ? ['hands'] : []),
])).join('/');
const names = { wideSurface: 'Wide edge at surface', penetratingEdge: 'Penetrating wide edge', initialReachNegative: 'Far edge: reach negative' };
const plays = film.plays.map((p, index) => {
  const label = `${names[p.input.geometry]} · TE starts ${p.input.initialSpeed} yd/s`;
  const firstForce = p.firstContact
    ? `${historical ? 'first recorded hand/body load' : 'first achieved force'} in ${interval(p.firstContact)}: ${channels(p.firstContact) || 'hand/body (legacy channel unspecified)'}`
    : historical ? 'no hand/body load recorded; strike loads unrecorded' : 'no achieved force in window';
  const handBody = historical ? 'maintained hand/body load counts unavailable in historical recording'
    : `${p.firstHandBodyContact ? `first hand/body load in ${interval(p.firstHandBodyContact)}: ${channels(p.firstHandBodyContact)}` : 'no achieved hand/body load in window'}`
      + `; hand/body loaded ${p.contactMetrics!.handBodyLoadedDecisionIntervals}/50 sampled intervals, ${p.contactMetrics!.engagedHandBodyLoadedDecisionIntervals} while engaged`
      + `; summed absolute hand normal/tangent impulses ${p.contactMetrics!.handNormalAbsoluteImpulse.toFixed(1)}/${p.contactMetrics!.handTangentialAbsoluteImpulse.toFixed(1)} kg·yd/s`
      + `; body normal ${p.contactMetrics!.bodyNormalImpulse.toFixed(1)}, strike magnitudes ${p.contactMetrics!.strikeImpulseMagnitudeSum.toFixed(1)} kg·yd/s`;
  const text = `${recordingLabel} · ${p.id} · source ${film.sourceBefore.slice(0, 12)} · ${p.input.side > 0 ? 'right' : 'left'} mirrored test · initial TE speed ${p.input.initialSpeed} yd/s`
    + ` · initial TE kinetic energy ${p.initial.teKineticEnergyKgYd2PerS2.toFixed(1)} kg·yd²/s²`
    + ` · ${p.firstAcquisition ? `engagement acquired ${p.firstAcquisition.t.toFixed(2)}s` : 'no engagement acquired in window'}`
    + ` · ${firstForce} · ${handBody}`
    + ' · fixed2.5s inspection censor; no credited gain, tackle, timeout or play outcome. Analytically staged snap-time momentum, not a simulated legal presnap motion or defense exchange. Twenty stationary bystanders are outside the contact island.';
  const log: PlayLog = { index, quarter: 0, clock: 0, offense: 'OFF', down: 0, distance: 0, yardline: 30,
    call: label, defense: 'One ordinary edge-fit controller; isolated contact window', text, yards: 0, kind: 'run', score: { home: 0, away: 0 },
    plan: { personnel: 'reduced', formation: 'slice_contact', qb: 'gun', concept: 'splitZone', playAction: false, audible: false,
      defPersonnel: 'reduced', front: p.input.geometry, coverage: 'reduced_edge_fit', family: 'contact stress', shell: 'one edge', pressure: false, rushers: 0 },
    replay: { los: 40, firstDownX: 120, flip: false, frames: p.frames, events: p.events, telemetry: p.telemetry,
      players: p.players.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.jersey, pos: a.position, weightLb: a.weightLb })),
      profiles: p.players.map(a => ({ position: a.position, heightIn: a.heightIn, weightLb: a.weightLb, ratings: { ...a.ratings } })) } };
  return { ...packReplayPlay(log, 0), id: p.id, sourceSha256: film.sourceBefore, fixtureSeed: p.input.seed,
    kindLabel: 'Contact witness', concept: { id: `${p.input.geometry}_v${p.input.initialSpeed}`, name: label, family: 'contact stress' },
    flags: { td: false, to: false, sack: false, big: false, complete: false, stuff: false, broken: false, oob: false, pressure: false, contact: !!p.firstContact },
    sourceLabel: recordingLabel, fixtureInput: p.input, negativeControl: p.negativeControl, windowCensored: true,
    contactObservation: { historical, firstForce: p.firstContact, firstHandBody: historical ? null : p.firstHandBodyContact,
      metrics: historical ? null : p.contactMetrics, firstForceText: firstForce, handBodyText: handBody,
      loadAccounting: historical ? 'incomplete-strike-channel' : 'achieved-body-hands-strikes', installation: p.initial.installation ?? null },
    profileSha256: p.profileSha256, initialStateSha256: p.initialStateSha256, physicalSha256: p.physicalSha256,
    recordedParticipants: p.participants, physicalProfiles: p.players.map(a => ({ idx: a.idx, profile: { ...a.profile } })),
    recordingVerified: true, filmSelection: p.selection, inspectedTE: p.participants.te.idx, inspectedEnd: p.participants.end.idx };
});
const data = { meta: { sourceSha256: film.sourceBefore, scriptSha256: film.scriptBefore, fixtureSha256: film.fixtureBefore ?? null,
  filmSchema: film.schema, recordingLabel, historical, inputSha256: film.inputSha256,
  negativeInputSha256: film.negativeInputSha256, profilesSha256: film.profileSha256,
  rawFilmSha256: createHash('sha256').update(encoded).digest('hex'), rawDecodedFilmSha256: createHash('sha256').update(decoded).digest('hex'),
  cohort: recordingLabel + '. ' + (historical
    ? 'This saved v1 experiment omitted achieved strike impulses from its first-contact measurement and installed formation strength inconsistently with the staged slice direction. Do not treat its missing hand/body load as absence of all force or compare it as an otherwise identical correct slice installation. Recorded fixture hash is unavailable in v1. '
    : 'The staged TE side, offensive strength, slice direction and planned drive agree. First-force reporting includes achieved strikes; maintained hand/body loading is counted separately. Counts are sampled50ms intervals, not uninterrupted block duration; channels within an interval have no resolved order. ')
    + '14 fixed reduced slice/contact windows: stationary vs2.5/4yd/s initial TE momentum, both mirrors and two edge depths; two separate8yd/s far-edge reach negatives. Same profiles, ordinary controllers and shared physics. This is snap-time momentum/contact stress, not full presnap motion, a screen, a complete split-zone play, a coverage exchange or an NFL rate. Every2.5s endpoint is a live inspection censor; no rushing gain, tackle or football outcome is claimed. Camera follows the two active bodies; all22 raw actors and indices are retained. Generated error magnitudes/timing are preserved and geometric errors explicitly mirrored. All14 recording-observer checks match physical history and RNG.',
  seed: 7, telemetryLevel: 'full', definitions: film.definitions, final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Slice TE', abbr: 'OFF', color: '#1d4f91', alt: '#f2c14e', text: '#fff' },
  away: { name: 'Wide Edge', abbr: 'DEF', color: '#a3302a', alt: '#f4efe6', text: '#fff' } },
  games: [{ seed: 7, label: 'Reduced slice contact · fixed live windows', final: { home: 0, away: 0 }, quarters: [] }],
  plays: compactReplayPlays(plays), catalog: { coverage: { reduced_edge_fit: 'Reduced edge fit' }, front: names,
    formation: { slice_contact: 'Staged slice-contact state' } } };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), templatePath = resolve(root, 'viewer/replay.template.html');
let template = readFileSync(templatePath, 'utf8');
function replace(from: string, to: string): void {
  if (!template.includes(from)) throw new Error(`Viewer export marker changed: ${from.slice(0, 70)}`);
  template = template.replace(from, to);
}
// Export-specific presentation: raw recordings remain unchanged. This reduced
// experiment has no football down/clock/gain/whistle to display.
replace("const sit = `${ord[p.down] || p.down + 'th'} & ${100 - p.yl <= p.dist ? 'Goal' : p.dist} · ${yl(p.yl)}`;", "const sit = 'Reduced contact fixture';");
replace("${p.nullified ? 'Penalty' : gain(p.yds)}", 'Inspection window');
replace("${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}", '${esc(p.id)} · seed ${replaySeed(p)}');
replace("$('dd').textContent = `${ord[p.down] || p.down + 'th'} & ${100 - p.yl <= p.dist ? 'Goal' : p.dist} · ${yl(p.yl)}`;", "$('dd').textContent = 'Reduced contact fixture · no football result';");
replace('const kv = [];', 'const kv = [];\n    if (p.contactObservation) {\n      kv.push(esc(p.contactObservation.firstForceText));\n      kv.push(esc(p.contactObservation.handBodyText));\n    }');
replace("$('inspect-player').innerHTML = '<option value=\"-1\">Ball carrier</option>' + p.roster.map", "$('inspect-player').innerHTML = '<option value=\"-1\">Select a player</option>' + p.roster.map");
replace("inspectorStamp = '';\n    prepareTelemetry(p);", "$('inspect-player').value = String(p.inspectedTE);\n    inspectorStamp = '';\n    prepareTelemetry(p);");
replace('const bx = p.frames.b[a * 3] + (p.frames.b[b * 3] - p.frames.b[a * 3]) * f;\n      const by = p.frames.b[a * 3 + 1] + (p.frames.b[b * 3 + 1] - p.frames.b[a * 3 + 1]) * f;',
  'const n = p.roster.length, te = p.inspectedTE, de = p.inspectedEnd;\n      const mid = (k, axis) => (p.frames.p[(k*n+te)*3+axis]+p.frames.p[(k*n+de)*3+axis])/2;\n      const bx = mid(a,0)+(mid(b,0)-mid(a,0))*f;\n      const by = mid(a,1)+(mid(b,1)-mid(a,1))*f;');
replace("${p.nullified?'Nullified (physical replay)':gain(p.yds)}", 'Inspection window · no football result');
replace("${ord[p.down]} & ${p.dist} · ${yl(p.yl)}", 'Reduced contact fixture');
replace("const jumps = [['Snap', Math.max(0, p.frames.t[0])]];", "const jumps = [['Staged start', Math.max(0, p.frames.t[0])]];");
replace("['First block', ['block_contact']]", "['Block event', ['block_contact']]");
replace("jumps.push(['Finish', dur]);", "if (p.contactObservation?.firstForce) jumps.push([p.contactObservation.historical ? 'First recorded hand/body load' : 'First achieved force', p.contactObservation.firstForce.interval[1]]);\n    if (p.contactObservation?.firstHandBody) jumps.push(['First hand/body load', p.contactObservation.firstHandBody.interval[1]]);\n    jumps.push(['Window end', dur]);");
template = template.replaceAll('Controlled setup · seed', 'Reduced contact window · seed').replaceAll('controlled setup', 'reduced contact fixture');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Missing replay data marker');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
writeFileSync(output.replace(/\.html$/, '-validation.json'), JSON.stringify({ schema: 'motion-contact-export-validation-v2',
  filmSchema: film.schema, historical, recordingLabel, recordedFixtureSha256: film.fixtureBefore ?? null,
  rawFilmSha256: data.meta.rawFilmSha256, rawDecodedFilmSha256: data.meta.rawDecodedFilmSha256,
  sourceSha256: film.sourceBefore, diagnosticScriptSha256: film.scriptBefore,
  exporterSha256: fileHash(fileURLToPath(import.meta.url)), templateSha256: fileHash(templatePath),
  outputSha256: fileHash(output), fixedFilmIds: expectedIds, recordingObserverChecks: film.observerChecks,
  contactAccounting: historical ? 'Historical v1 omits achieved strike impulses and has inconsistent side installation. No retrospective force or corrected installation is invented.'
    : 'Achieved body/hands/strike first-force interval and separately achieved hand/body contact and sampled maintained-load counts. Channel order within a50ms interval is unresolved.',
  scope: 'Read-only export; exact raw recordings, actors, indices/events and full telemetry. Existing viewer quantizes positions/facing to0.1; no state resimulation. Neutral packing yards field is hidden, flags are clear; no down/game clock/result is fabricated.' }, null, 2) + '\n');
console.log(`Wrote14 reduced contact witness clips to ${output}; ${(html.length / 1024 / 1024).toFixed(2)}MB.`);
