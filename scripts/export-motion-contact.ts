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
interface SavedPlay {
  id: string; input: MotionContactInput; selection: string; negativeControl: boolean; windowCensored: boolean;
  initialStateSha256: string; profileSha256: string; physicalSha256: string; recordingVerified: boolean;
  initialContext: unknown; participants: { te: Player; end: Player }; initial: { teKineticEnergyKgYd2PerS2: number };
  classification: string; firstAcquisition: { t: number } | null; firstContact: { interval: [number, number] } | null;
  frames: Frame[]; telemetry: ReplayTelemetry; events: PlayEvent[]; players: Player[];
}
const encoded = readFileSync(input), decoded = gunzipSync(encoded), film = JSON.parse(decoded.toString()) as {
  schema: string; sourceBefore: string; sourceAfter: string; scriptBefore: string; scriptAfter: string;
  inputSha256: string; negativeInputSha256: string; profileSha256: string; decisionDt: number; durationSeconds: number;
  definitions: Record<string, string>; observerChecks: Array<{ id: string; passed: boolean; physicalSha256: string; initialStateSha256: string }>;
  plays: SavedPlay[];
};
const expectedIds: string[] = [];
for (const side of [1, -1]) for (const geometry of ['wideSurface', 'penetratingEdge']) for (const speed of [0, 2.5, 4])
  expectedIds.push(`MC-S7-${geometry}-${side < 0 ? 'L' : 'R'}-V${speed}-P12`);
for (const side of [1, -1]) expectedIds.push(`MC-S7-initialReachNegative-${side < 0 ? 'L' : 'R'}-V8-P12`);
if (film.schema !== 'motion-contact-film-v1' || film.sourceBefore !== film.sourceAfter || film.scriptBefore !== film.scriptAfter
  || film.decisionDt !== .05 || film.durationSeconds !== 2.5 || film.plays.map(p => p.id).join('|') !== expectedIds.join('|')
  || film.observerChecks.length !== 14) throw new Error('Expected source-pinned fixed14 reduced witness recordings');
for (const p of film.plays) {
  const check = film.observerChecks.find(c => c.id === p.id);
  if (!check?.passed || !p.recordingVerified || !p.windowCensored || p.selection !== 'fixed-before-outcomes'
    || check.physicalSha256 !== p.physicalSha256 || check.initialStateSha256 !== p.initialStateSha256
    || hash(p.initialContext) !== p.initialStateSha256 || hash(p.participants) !== p.profileSha256
    || p.frames.length !== 51 || p.frames[0].t !== 0 || p.frames.at(-1)!.t !== 2.5
    || p.telemetry.level !== 'full' || p.telemetry.frames.length !== 51 || p.players.length !== 22)
    throw new Error(`Invalid fixed fixture recording/pins: ${p.id}`);
}
const names = { wideSurface: 'Wide edge at surface', penetratingEdge: 'Penetrating wide edge', initialReachNegative: 'Far edge: reach negative' };
const plays = film.plays.map((p, index) => {
  const label = `${names[p.input.geometry]} · TE starts ${p.input.initialSpeed} yd/s`;
  const text = `Reduced contact witness · ${p.id} · source ${film.sourceBefore.slice(0, 12)} · ${p.input.side > 0 ? 'right' : 'left'} mirrored test · initial TE speed ${p.input.initialSpeed} yd/s`
    + ` · initial TE kinetic energy ${p.initial.teKineticEnergyKgYd2PerS2.toFixed(1)} kg·yd²/s²`
    + ` · ${p.firstAcquisition ? `engagement acquired ${p.firstAcquisition.t.toFixed(2)}s` : 'no engagement acquired in window'}`
    + ` · ${p.firstContact ? `first actual load in ${p.firstContact.interval.map(t => t.toFixed(2)).join('–')}s interval` : 'no actual hand/body load in window'}`
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
    sourceLabel: 'Promoted reduced physics', fixtureInput: p.input, negativeControl: p.negativeControl, windowCensored: true,
    profileSha256: p.profileSha256, initialStateSha256: p.initialStateSha256, physicalSha256: p.physicalSha256,
    recordingVerified: true, filmSelection: p.selection, inspectedTE: p.participants.te.idx, inspectedEnd: p.participants.end.idx };
});
const data = { meta: { sourceSha256: film.sourceBefore, scriptSha256: film.scriptBefore, inputSha256: film.inputSha256,
  negativeInputSha256: film.negativeInputSha256, profilesSha256: film.profileSha256,
  rawFilmSha256: createHash('sha256').update(encoded).digest('hex'), rawDecodedFilmSha256: createHash('sha256').update(decoded).digest('hex'),
  cohort: '14 fixed reduced slice/contact windows: stationary vs2.5/4yd/s initial TE momentum, both mirrors and two edge depths; two separate8yd/s far-edge reach negatives. Same profiles, ordinary controllers and shared physics. This is snap-time momentum/contact stress, not full presnap motion, a screen, a complete split-zone play, a coverage exchange or an NFL rate. Every2.5s endpoint is a live inspection censor; no rushing gain, tackle or football outcome is claimed. Camera follows the two active bodies; all22 raw actors and indices are retained. Generated error magnitudes/timing are preserved and geometric errors explicitly mirrored. All14 recording-observer checks match physical history and RNG.',
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
replace("$('inspect-player').innerHTML = '<option value=\"-1\">Ball carrier</option>' + p.roster.map", "$('inspect-player').innerHTML = '<option value=\"-1\">Select a player</option>' + p.roster.map");
replace("inspectorStamp = '';\n    prepareTelemetry(p);", "$('inspect-player').value = String(p.inspectedTE);\n    inspectorStamp = '';\n    prepareTelemetry(p);");
replace('const bx = p.frames.b[a * 3] + (p.frames.b[b * 3] - p.frames.b[a * 3]) * f;\n      const by = p.frames.b[a * 3 + 1] + (p.frames.b[b * 3 + 1] - p.frames.b[a * 3 + 1]) * f;',
  'const n = p.roster.length, te = p.inspectedTE, de = p.inspectedEnd;\n      const mid = (k, axis) => (p.frames.p[(k*n+te)*3+axis]+p.frames.p[(k*n+de)*3+axis])/2;\n      const bx = mid(a,0)+(mid(b,0)-mid(a,0))*f;\n      const by = mid(a,1)+(mid(b,1)-mid(a,1))*f;');
replace("${p.nullified?'Nullified (physical replay)':gain(p.yds)}", 'Inspection window · no football result');
replace("${ord[p.down]} & ${p.dist} · ${yl(p.yl)}", 'Reduced contact fixture');
replace("const jumps = [['Snap', Math.max(0, p.frames.t[0])]];", "const jumps = [['Staged start', Math.max(0, p.frames.t[0])]];");
replace("jumps.push(['Finish', dur]);", "jumps.push(['Window end', dur]);");
template = template.replaceAll('Controlled setup · seed', 'Reduced contact window · seed').replaceAll('controlled setup', 'reduced contact fixture');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Missing replay data marker');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
writeFileSync(output.replace(/\.html$/, '-validation.json'), JSON.stringify({ schema: 'motion-contact-export-validation-v1',
  rawFilmSha256: data.meta.rawFilmSha256, rawDecodedFilmSha256: data.meta.rawDecodedFilmSha256,
  sourceSha256: film.sourceBefore, diagnosticScriptSha256: film.scriptBefore,
  exporterSha256: fileHash(fileURLToPath(import.meta.url)), templateSha256: fileHash(templatePath),
  outputSha256: fileHash(output), fixedFilmIds: expectedIds, recordingObserverChecks: film.observerChecks,
  scope: 'Read-only export; exact raw recordings, actors, indices/events and full telemetry. Existing viewer quantizes positions/facing to0.1; no state resimulation. Neutral packing yards field is hidden, flags are clear; no down/game clock/result is fabricated.' }, null, 2) + '\n');
console.log(`Wrote14 reduced contact witness clips to ${output}; ${(html.length / 1024 / 1024).toFixed(2)}MB.`);
