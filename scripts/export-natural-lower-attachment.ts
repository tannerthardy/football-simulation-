/** Paired film of the retained first natural lower-attachment release.
 * node --import tsx scripts/export-natural-lower-attachment.ts report.json[.gz] output.html
 * Reads stored full recordings only; never resimulates or selects by outcome.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import type { Player } from '../src/players/types.js';
import type { OffensivePlayCall, DefensivePlayCall } from '../src/playbook/types.js';
import type { PlayResult } from '../src/sim/types.js';
import { packReplayPlay } from './replay-data.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';

interface SavedPlay {
  mode: 'linear' | 'bounded'; ordinal: number; playSeed: number; initialSha256: string;
  los: number; ballY: number; firstDownX: number; offCall: OffensivePlayCall; defCall: DefensivePlayCall;
  initial: { fields: { snapContext: { fields: { down: number; distance: number; yardline: number } } } };
  players: Array<{ idx: number; side: 'O' | 'D'; slot: string; player: Player }>;
  result: PlayResult; physicalSha256: string;
}
interface SavedReport {
  schema: string; sourceBefore: string; sourceAfter: string; scriptBefore: string; scriptAfter: string;
  gameSeed: number; rosterSeed: number; rosterSha256: string;
  selection: { ordinal: number; playSeed: number; tickStart: number; tickEnd: number; preStateSha256: string };
  checks: { identicalEarlierGameHistory: boolean; observerAndRecordingUnchanged: boolean;
    unobservedBaselinePhysicalSha256: string; observedBaselinePhysicalSha256: string };
  precedingHistory: unknown[]; baseline: SavedPlay; candidate: SavedPlay;
}

const [input, output, extra] = process.argv.slice(2);
if (!input || !output || extra) throw new Error('Usage: export-natural-lower-attachment.ts report.json[.gz] output.html');
const inputBytes = readFileSync(input), decoded = input.endsWith('.gz') ? gunzipSync(inputBytes) : inputBytes;
const report = JSON.parse(decoded.toString('utf8')) as SavedReport;
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
if (report.schema !== 'natural-lower-attachment-v1' || report.sourceBefore !== report.sourceAfter
  || report.scriptBefore !== report.scriptAfter || !report.checks.identicalEarlierGameHistory
  || !report.checks.observerAndRecordingUnchanged
  || report.checks.unobservedBaselinePhysicalSha256 !== report.checks.observedBaselinePhysicalSha256
  || report.precedingHistory.length !== report.selection.ordinal - 1
  || report.baseline.mode !== 'linear' || report.candidate.mode !== 'bounded')
  throw new Error('Expected the source-pinned, observer-verified natural paired witness');
for (const play of [report.baseline, report.candidate]) {
  if (play.ordinal !== report.selection.ordinal || play.playSeed !== report.selection.playSeed
    || play.initialSha256 !== report.selection.preStateSha256 || play.players.length !== 22
    || !play.result.frames?.length || play.result.frames[0].t !== 0 || play.result.telemetry?.level !== 'full'
    || play.result.outcome === 'timeout') throw new Error('Expected complete, naturally finished full 11-on-11 recordings from the same initial state');
}
for (const key of ['players', 'los', 'ballY', 'firstDownX', 'offCall', 'defCall', 'initial'] as const)
  if (hash(report.baseline[key]) !== hash(report.candidate[key])) throw new Error(`Paired input mismatch: ${key}`);

const labels = ['Linear reference', 'Bounded default'];
const modeFields = (group: number) => ({ physicsMode: group === 1,
  modeSelection: group === 0 ? 'explicit linear reference on selected play' : 'bounded legacy-support production law on selected play',
  productionEnabled: group === 1, prefixMode: 'explicit linear', selectedPlayOnly: true });
const plays = [report.baseline, report.candidate].map((play, group) => {
  const r = play.result, formation = play.offCall.formation, snap = play.initial.fields.snapContext.fields;
  const carrierIdx = r.events.find(e => e.type === 'tackle_wrap')?.b;
  const firstHolderIdx = r.events.find(e => e.type === 'tackle_wrap')?.a;
  const carrier = play.players.find(p => p.idx === carrierIdx), holder = play.players.find(p => p.idx === firstHolderIdx);
  const playerLabel = (p: SavedPlay['players'][number] | undefined) => p
    ? `${p.slot} #${p.player.jersey} ${p.player.firstName} ${p.player.lastName} (${p.player.measurables.weightLb} lb)` : 'unknown player';
  const offAbbr = play.players.find(p => p.side === 'O')!.player.id.split('-')[0];
  const text = `${labels[group]} · natural play ${play.ordinal} · ${r.outcome} · ${r.offenseYards.toFixed(2)} credited yd.`
    + ` Watch 9.10 s onward: ${playerLabel(carrier)} carries ${playerLabel(holder)}.`
    + (group === 0 ? ` Linear attachment releases at ${report.selection.tickStart.toFixed(2)}–${report.selection.tickEnd.toFixed(2)} s after its material point exceeds body reach.`
      : ' The bounded point remains reachable; inspect carrier slowing, the safety assist and the natural fall/tackle.')
    + ' Same generated profiles, play seed, complete initial state and preceding game history. No forced outcomes or edited grip strength.';
  const log: PlayLog = { index: play.ordinal - 1, quarter: 0, clock: 0, offense: offAbbr,
    down: snap.down, distance: snap.distance, yardline: snap.yardline, score: { home: 0, away: 0 },
    call: `${labels[group]} · ${play.offCall.label}`, defense: play.defCall.label,
    text, kind: r.kind, yards: r.offenseYards, stats: r.stats, outcome: r.outcome, duration: r.duration,
    plan: { personnel: formation.personnel, formation: formation.id, qb: formation.qb,
      concept: play.offCall.kind === 'run' ? play.offCall.run!.scheme : play.offCall.pass!.id,
      playAction: play.offCall.pass?.family === 'playaction', audible: false,
      defPersonnel: play.defCall.personnel, front: play.defCall.front.id,
      coverage: play.defCall.coverage.id, family: play.defCall.coverage.family,
      shell: play.defCall.coverage.shell, pressure: !!play.defCall.pressure, shown: play.defCall.shown?.id },
    replay: { los: play.los, firstDownX: play.firstDownX, flip: play.offCall.flip,
      frames: r.frames!, events: r.events, telemetry: r.telemetry,
      players: play.players.map(p => ({ team: p.side, slot: p.slot,
        name: `${p.player.firstName} ${p.player.lastName}`, jersey: p.player.jersey,
        pos: p.player.position, weightLb: p.player.measurables.weightLb })),
      profiles: play.players.map(p => ({ position: p.player.position, heightIn: p.player.measurables.heightIn,
        weightLb: p.player.measurables.weightLb, ratings: { ...p.player.ratings } })) } };
  return { ...packReplayPlay(log, group), id: `NAT-P${String(play.ordinal).padStart(3, '0')}-${group ? 'BND' : 'LIN'}`,
    fixtureSeed: play.playSeed, playOrdinal: play.ordinal, sourceLabel: labels[group], sourceSha256: report.sourceBefore,
    physicalSha256: play.physicalSha256, initialSha256: play.initialSha256,
    filmSelection: 'first-natural-lower-bound-release-retrospective', ...modeFields(group) };
});
const cohort = `Two recordings of natural play ${report.selection.ordinal}, ${report.baseline.offCall.label} against ${report.baseline.defCall.label}. `
  + `The first ${report.precedingHistory.length} prior plays and complete selected setup/RNG/profiles are identical; only the selected play changes lower-attachment law. `
  + 'Linear reference explicitly disables the new law; Bounded default uses the promoted legacy-support law. This is an actual full 11-on-11 game interaction, selected retrospectively by the first diagnosed attachment release, not its yardage or candidate outcome. '
  + 'Compare the TE dragging the corner from 9.10 s, carrier deceleration, the assist and the natural finish. A longer hold or prevented touchdown alone does not establish realism or an NFL tackle rate. '
  + 'Both clips retain exact recorded events/full telemetry and real credited yardage. Recording begins at snap after normal pre-snap staging; pre-snap frames and the game quarter/clock were not retained. Use contact and movement layers, plus player inspection.';
const data = { meta: { sourceSha256: report.sourceBefore, scriptSha256: report.scriptBefore,
  inputSha256: createHash('sha256').update(decoded).digest('hex'), rosterSha256: report.rosterSha256,
  seed: report.gameSeed, telemetryLevel: 'full', cohort, final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Guard Home', abbr: 'HOM', color: '#a3302a', alt: '#f4efe6', text: '#ffffff' },
  away: { name: 'Guard Away', abbr: 'AWY', color: '#1d4f91', alt: '#f2c14e', text: '#ffffff' } },
  games: labels.map((label, group) => ({ label, seed: report.gameSeed, sourceSha256: report.sourceBefore,
    ...modeFields(group), final: { home: 0, away: 0 }, quarters: [] })), plays: compactReplayPlays(plays),
  catalog: { coverage: { [report.baseline.defCall.coverage.id]: report.baseline.defCall.coverage.name },
    front: { [report.baseline.defCall.front.id]: report.baseline.defCall.front.name },
    formation: { [report.baseline.offCall.formation.id]: report.baseline.offCall.formation.name } } };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let template = readFileSync(resolve(root, 'viewer/replay.template.html'), 'utf8');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Replay template missing data marker');
// Export-specific wording only: this recorded interaction came from a normal
// game, not a staged encounter. Do not invent its missing quarter or clock.
const cardClock = "${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}";
if (!template.includes(cardClock)) throw new Error('Replay card context marker changed');
template = template.replace(cardClock, '${esc(p.id)} · Natural play ${p.playOrdinal}')
  .replaceAll('controlled inspection fixtures', 'natural play · paired physics modes')
  .replaceAll('controlled fixtures', 'paired natural recordings')
  .replaceAll('Controlled setup · seed', 'Natural play · seed')
  .replaceAll('controlled setup', 'paired natural play')
  .replaceAll(' · controlled fixture', ' · paired natural play');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
console.log(`Wrote two exact-history natural recordings to ${output}; ${(html.length / 1024 / 1024).toFixed(2)} MB.`);
