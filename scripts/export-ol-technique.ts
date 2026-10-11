/** Saved ordinary-run comparison; never simulates or chooses clips by outcome.
 * node --import tsx scripts/export-ol-technique.ts before-film.json.gz after-film.json.gz output.html
 * Companions use *-film -> * or film-* -> panel-* in the same directory.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import type { PlayResult } from '../src/sim/types.js';
import type { RatingKey } from '../src/players/types.js';
import { packReplayPlay } from './replay-data.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';

interface Plan { kind: string; target: string | null; drive: { x: number; y: number };
  climbTo: string | null; pullRole: string | null; soloKind?: string | null; entryComplete?: boolean | null;
  firstStep?: { x: number; y: number } | null; combination: null | {
    id: number; members: string[]; defender: string; backer: string | null; released: boolean;
    secureSince: number; nextRead: number; soloKind?: string | null } }
interface Ownership { slot: string; plan: Plan | null; engagement: unknown; tags: string[] }
interface Update {
  t: number; observer: string; classification: string; changedTargets: string[]; staleMembersAfter: string[];
  before: Ownership[]; after: Ownership[]; beforeBody: Ownership; afterBody: Ownership;
  oldCombinationAfter: Plan['combination']; requested: unknown; events: unknown[]; consumedImages: unknown[];
  targetGeometry?: unknown;
}
interface Load { slot: string; [key: string]: unknown }
interface Trace { t: number; before: Ownership[]; after: Ownership[]; updates: Update[]; deliveredStep: Load[]; phase: string; events: unknown[] }
interface SavedPlay {
  id: string; selection: string; roster: number; run: string; front: string; flip: boolean; seed: number;
  offCall: string; defCall: string; los: number; firstDownX: number; result: PlayResult; trace: Trace[];
  players: Array<{ team: 'O' | 'D'; slot: string; name: string; jersey: number; position: string;
    weightLb: number; heightIn: number; ratings: Record<RatingKey, number>; profile: Record<string, number> }>;
}
interface Film { schema: string; sourceBefore: string; sourceAfter: string; collectorSha256: string; plays: SavedPlay[] }
interface Trial { id: string; initialSha256: string; profileSha256: string; observerVerified: boolean;
  formation: string; supplemental: boolean; observedSignature: string; plainSignature: string;
  result: Omit<PlayResult, 'frames' | 'telemetry'>; olMetrics: Record<string, unknown> }
interface Report { schema: string; sourceBefore: string; sourceAfter: string; collectorSha256: string;
  moduleSha256: Record<string, string>; cohort: unknown; filmIds: string[];
  summary: { snaps: number; observerVerifiedCount: number; naturalEnds: number; censors: number };
  trials: Trial[]; supplementalTrials: Trial[] }
const args = process.argv.slice(2), [beforePath, afterPath, output] = args;
if (args.length !== 3 || !beforePath.endsWith('.json.gz') || !afterPath.endsWith('.json.gz') || !output.endsWith('.html'))
  throw new Error('Usage: export-ol-technique.ts before-film.json.gz after-film.json.gz output.html');
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
function read<T>(p: string): T { return JSON.parse(gunzipSync(readFileSync(p)).toString()) as T; }
const labels = ['Baseline: previous OL technique', 'Candidate: revised OL technique'];
const runs = ['iz_strong', 'oz_strong', 'wz_strong', 'power', 'counter', 'trap', 'duo', 'split_zone'];
const fixedIds = runs.flatMap(run => ['R', 'L'].map(side => `OT-R1-${run}-over-${side}-S3`));
const witnessIds = ['OT-R2-oz_strong-over-L-S11', 'OT-R2-power-over-R-S3'];
const expected = [...fixedIds, ...witnessIds];
const companion = (path: string) => /(?:^|\/)film-[^/]+\.json\.gz$/.test(path)
  ? path.replace(/(^|\/)film-/, '$1panel-') : path.replace(/-film\.json\.gz$/, '.json.gz');
const phases = [beforePath, afterPath].map(path => ({ path, film: read<Film>(path),
  reportPath: companion(path), report: read<Report>(companion(path)) }));
for (const { film, report } of phases) {
  if (film.schema !== 'ol-technique-film-v1' || report.schema !== 'ol-technique-review-v1'
    || !/^[a-f0-9]{64}$/.test(film.sourceBefore) || film.sourceBefore !== film.sourceAfter
    || film.sourceBefore !== report.sourceBefore || report.sourceBefore !== report.sourceAfter
    || film.collectorSha256 !== report.collectorSha256 || report.summary.snaps !== 160
    || report.summary.observerVerifiedCount !== 160 || report.trials.length !== 160 || report.supplementalTrials.length !== 2
    || [...report.trials, ...report.supplementalTrials].some(r => !r.observerVerified || r.observedSignature !== r.plainSignature)
    || film.plays.map(p => p.id).join('|') !== expected.join('|') || report.filmIds.join('|') !== expected.join('|'))
    throw new Error('Expected unchanged source, matched collector, 160+2 neutral controls, 16 fixed films and two labelled witnesses');
  for (const p of film.plays) {
    const row = [...report.trials, ...report.supplementalTrials].find(r => r.id === p.id), result = p.result;
    if (!row || row.formation !== (p.run === 'split_zone' ? 'gun_wing_12' : 'ace_11')
      || p.selection !== (witnessIds.includes(p.id) ? 'named-prior-ordinary-witness' : 'fixed-before-outcomes') || p.roster !== (witnessIds.includes(p.id) ? 1 : 0) || p.front !== 'over' || p.seed !== (p.id === witnessIds[0] ? 11 : 3)
      || p.players.length !== 22 || !result.frames?.length || result.frames.length < 2 || result.frames[0].t !== 0
      || result.telemetry?.level !== 'full' || result.outcome === 'timeout'
      || hash({ ...result, frames: undefined, telemetry: undefined }) !== hash(row.result)
      || !p.trace.length || p.trace[0].t !== 0 || p.trace.at(-1)!.phase !== 'dead'
      || Math.abs(p.trace.at(-1)!.t + .05 - result.duration) > 1e-8
      || result.frames.at(-1)!.t > result.duration || result.duration - result.frames.at(-1)!.t > .10000001)
      throw new Error(`Invalid natural replay/state: ${p.id}`);
  }
}
if (phases[0].film.sourceBefore === phases[1].film.sourceBefore
  || phases[0].film.collectorSha256 !== phases[1].film.collectorSha256
  || JSON.stringify(phases[0].report.cohort) !== JSON.stringify(phases[1].report.cohort)
  || phases[0].report.moduleSha256['src/physics/world.ts'] !== phases[1].report.moduleSha256['src/physics/world.ts'])
  throw new Error('Expected distinct controller versions with identical cohort, collector and shared physics world');
const rowsByPhase = phases.map(({ report }) => [...report.trials, ...report.supplementalTrials]);
for (let i = 0; i < 162; i++) {
  const a = rowsByPhase[0][i], b = rowsByPhase[1][i];
  if (a.id !== b.id || a.profileSha256 !== b.profileSha256)
    throw new Error(`Mismatched initial state/profile: ${a.id}`);
}
for (let i = 0; i < 18; i++) for (const key of ['id', 'roster', 'run', 'front', 'flip', 'seed', 'selection', 'offCall', 'defCall', 'los', 'firstDownX', 'players'] as const)
  if (JSON.stringify(phases[0].film.plays[i][key]) !== JSON.stringify(phases[1].film.plays[i][key]))
    throw new Error(`Mismatched fixed film: ${expected[i]} ${key}`);
for (let i = 0; i < 18; i++) for (const field of ['agents', 'ball', 'carrier', 'carrierPosture'] as const)
  if (JSON.stringify(phases[0].film.plays[i].result.frames![0][field]) !== JSON.stringify(phases[1].film.plays[i].result.frames![0][field]))
    throw new Error(`Mismatched initial recorded position/possession: ${expected[i]} ${field}`);
// Compact native states, not imagined player thoughts. One state follows each
// completed 0.05s physics tick. Transition snapshots retain both shared members.
function ownershipTrace(p: SavedPlay) {
  return p.trace.map(t => ({ t: t.t, achievedAt: t.t + .05, phase: t.phase,
    members: t.after.map(a => ({ slot: a.slot, plan: a.plan, engagement: a.engagement, tags: a.tags })),
    loads: t.deliveredStep,
    reads: t.updates.filter(u => ['LT', 'LG', 'C', 'RG', 'RT'].includes(u.observer)).map(u => ({
      t: u.t, observer: u.observer, requested: u.requested, targetGeometry: u.targetGeometry })),
    transitions: t.updates.filter(u => u.classification !== 'no-target-change'
      || u.beforeBody.plan?.kind !== u.afterBody.plan?.kind).map(u => ({
      t: u.t, observer: u.observer, classification: u.classification, changedTargets: u.changedTargets,
      staleMembersAfter: u.staleMembersAfter, before: u.before, after: u.after,
      beforePlan: u.beforeBody.plan, afterPlan: u.afterBody.plan, oldCombinationAfter: u.oldCombinationAfter,
      requested: u.requested, events: u.events, consumedImages: u.consumedImages })) }));
}
const plays = phases.flatMap(({ film, report }, game) => film.plays.map((p, index) => {
  const result = p.result, row = [...report.trials, ...report.supplementalTrials].find(r => r.id === p.id)!;
  const log: PlayLog = { index, quarter: 0, clock: 0, offense: 'OFF', down: 1, distance: 10,
    yardline: p.los - 10, score: { home: 0, away: 0 }, kind: 'run', yards: result.offenseYards,
    call: `${labels[game]}${witnessIds.includes(p.id) ? ' · Supplemental witness' : ''} · ${p.offCall}`, defense: p.defCall, stats: result.stats, outcome: result.outcome,
    text: `${labels[game]} · ${p.id} · source ${film.sourceBefore.slice(0, 12)} · ${witnessIds.includes(p.id) ? 'named prior ordinary witness; excluded from pooled panel' : 'fixed input, selected before outcomes'} · natural ${result.outcome} at ${result.duration.toFixed(2)}s. Inspect a lineman for recorded assignments, shared combo ownership and delivered loads; same physical capabilities in both versions.`,
    plan: { personnel: row.formation === 'gun_wing_12' ? '12' : '11', formation: row.formation, qb: row.formation === 'gun_wing_12' ? 'gun' : 'under', concept: RUN_BY_ID[p.run].scheme,
      playAction: false, audible: false, defPersonnel: 'base43', front: p.front, coverage: 'cover3',
      called: 'cover3', family: 'cover3', shell: 'one-high', pressure: false, rushers: 4 },
    replay: { los: p.los, firstDownX: p.firstDownX, flip: p.flip, frames: result.frames!, events: result.events,
      telemetry: result.telemetry!, players: p.players.map(a => ({ team: a.team, slot: a.slot, name: a.name,
        jersey: a.jersey, pos: a.position, weightLb: a.weightLb })), profiles: p.players.map(a => ({
        position: a.position, heightIn: a.heightIn, weightLb: a.weightLb, ratings: a.ratings })) } };
  return { ...packReplayPlay(log, game), id: `${game ? 'FINAL' : 'BEFORE'}-${p.id}`, fixtureId: p.id,
    fixtureSeed: p.seed, fixtureRun: p.run, sourceLabel: labels[game], sourceSha256: film.sourceBefore,
    filmSelection: p.selection, fixtureFlip: p.flip, initialSha256: row.initialSha256,
    profileSha256: row.profileSha256, physicalSha256: row.observedSignature, recordingVerified: true,
    naturalResult: { ...result, frames: undefined, telemetry: undefined }, eventDetails: result.events,
    recordedPlayers: p.players, inspectedLineman: p.players.findIndex(a => a.slot === (p.id === witnessIds[0] ? 'LT' : 'RT')),
    olMetrics: row.olMetrics, fixtureFormation: row.formation, supplemental: row.supplemental,
    ownershipTrace: ownershipTrace(p) };
}));
const comparisons = phases.map(({ path, reportPath, film, report }, i) => ({ label: labels[i],
  sourceSha256: film.sourceBefore, collectorSha256: film.collectorSha256, cohortSha256: hash(report.cohort),
  filmRawSha256: fileHash(path), reportRawSha256: fileHash(reportPath), moduleSha256: report.moduleSha256,
  observerChecks: [...report.trials, ...report.supplementalTrials].map(r => ({ id: r.id, initialSha256: r.initialSha256,
    profileSha256: r.profileSha256, observedSignature: r.observedSignature, plainSignature: r.plainSignature })) }));
const data = { meta: { sourceSha256: phases[1].film.sourceBefore, sourceComparison: comparisons,
  telemetryLevel: 'full', filmSchema: 'ol-technique-comparison-v1', seed: 3,
  cohort: '36 ordinary run clips: 16 fixed first-roster Over/seed3 inputs across eight concepts in both directions, plus two separately labelled prior recovery witnesses, each paired across two controller versions. The witnesses are excluded from the pooled 160-input panel. Player profiles, initial positions and shared physical capabilities match; controller assignments may change. All 162 observed executions match plain controls. Clips finish naturally. This balanced panel is not an NFL sample. Native ownership reads, actual engagements and delivered loads are separate records.',
  final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Controlled Offense', abbr: 'OFF', color: '#1d4f91', text: '#fff' },
  away: { name: 'Controlled Defense', abbr: 'DEF', color: '#a3302a', text: '#fff' } },
  games: phases.map(({ film }, i) => ({ label: labels[i], seed: 3, sourceSha256: film.sourceBefore,
    final: { home: 0, away: 0 }, quarters: [] })), plays: compactReplayPlays(plays),
  catalog: { coverage: { cover3: 'Cover 3' }, front: { over: '4-3 Over' }, formation: { ace_11: 'Ace (11)', gun_wing_12: 'Gun Wing (12)' } } };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), templatePath = resolve(root, 'viewer/replay.template.html');
let template = readFileSync(templatePath, 'utf8');
function replace(from: string, to: string) {
  if (!template.includes(from)) throw new Error(`Viewer marker changed: ${from.slice(0, 80)}`);
  template = template.replace(from, to);
}
replace("key === 'game' ? `Game ${Number(value) + 1} · seed ${games[value].seed}`", "key === 'game' ? games[value].label");
replace("${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}", '${esc(p.id)} · ${esc(p.sourceLabel)}');
replace("$('dd').textContent = `${ord[p.down] || p.down + 'th'} & ${100 - p.yl <= p.dist ? 'Goal' : p.dist} · ${yl(p.yl)}`;",
  "$('dd').textContent = `${ord[p.down]} & ${p.dist} · controlled OL technique comparison`;");
replace("inspectorStamp = '';\n    prepareTelemetry(p);", "$('inspect-player').value = String(p.inspectedLineman);\n    inspectorStamp = '';\n    prepareTelemetry(p);");
replace('<details class="inspector"><summary>Recorded event notes</summary>',
  '<section class="inspector"><h2>OL assignment and contact</h2><small class="status-note">Ownership reads occur at tick start; delivered motion and loads follow each completed 0.05s tick. Controller targets do not imply a physical hold. Forces use kg·yd/s², impulses kg·yd/s, work kg·yd²/s². No inferred thoughts or eye tracking.</small><div id="ownership-state" class="detail-list"></div></section><details class="inspector"><summary>Recorded event notes</summary>');
replace("if (stamp === inspectorStamp) return;", "if (stamp === inspectorStamp) return;\n    inspectOwnership(p, player, t);");
replace('  function drawLayers(p, frame, positions, X, Y, sc, selected) {', `  function inspectOwnership(p, player, time) {
    $('ownership-state').dataset.fixture=p.id; $('ownership-state').dataset.time=String(time);
    const slot = p.roster[player]?.[1], timeline = p.ownershipTrace ?? [];
    const state = timeline.findLast((row)=>row.achievedAt<=time+1e-8), member=state?.members.find((m)=>m.slot===slot);
    if (!member) { $('ownership-state').textContent=slot ? 'No completed native OL tick available for this player at this time.' : 'Select an offensive lineman to inspect ownership.'; return; }
    const plan=member.plan, combo=plan?.combination, load=state.loads.find((l)=>l.slot===slot), read=state.reads.find((r)=>r.observer===slot);
    const f=(n)=>Number(n).toFixed(2), vector=(v)=>v ? f(v.x)+', '+f(v.y) : 'unrecorded';
    const lines=['After tick '+f(state.t)+'–'+f(state.achievedAt)+'s: '+slot+' '+(plan?.kind ?? 'unassigned')+' → '+(plan?.target ?? 'none'),
      combo ? 'Combo #'+combo.id+': '+combo.members.join(' + ')+' → '+combo.defender+' · '+(combo.released?'released':'live')+(plan.target!==combo.defender&&!combo.released?' · STALE target mismatch':'') : 'No shared combination pointer',
      member.engagement ? 'Actual engagement: '+member.engagement.blocker+' → '+member.engagement.defender+' · helpers '+(member.engagement.helpers.join(', ')||'none') : 'No actual block engagement'];
    if (plan?.soloKind!=null) lines.push('Saved standalone technique: '+plan.soloKind);
    if (combo?.soloKind!=null) lines.push('Saved combo keeper technique: '+combo.soloKind);
    if (plan?.firstStep) lines.push('Recorded entry-step target '+vector(plan.firstStep)+' yd'+(plan.entryComplete!=null?' · '+(plan.entryComplete?'complete':'pending'):''));
    if (read) {
      lines.push('Read at '+f(read.t)+'s: requested velocity '+vector(read.requested.vel)+' yd/s'+(read.requested.posture!=null?' · requested posture '+f(read.requested.posture):''));
      const geometry=read.targetGeometry;
      if (geometry) lines.push('Target '+geometry.slot+' · observed position '+vector(geometry.observedPosition)+' yd · observed velocity '+vector(geometry.observedVelocity)+' yd/s',
        'Actual center offset from intended drive: lateral '+f(geometry.actualLateralErrorToDrive)+' yd / along '+f(geometry.actualAlongDrive)+' yd (geometry, not proof of leverage)');
    }
    if (load) lines.push('Achieved velocity '+vector(load.achievedVel)+' yd/s · ground impulse '+vector(load.groundImpulse),
      'Arm impulse '+f(load.armImpulse)+' / '+f(load.armImpulseLimit)+' · arm work '+f(load.armWork)+' / '+f(load.armWorkLimit),
      'Support motor work '+f(load.supportMotorWork)+' / '+f(load.supportMotorWorkLimit),
      'Physical contacts '+load.physicalContacts.length+' · surviving hand joints '+load.liveHandsAfterPhysics.length+(load.liveHandsAfterPhysics.length?' · mean forces '+load.liveHandsAfterPhysics.map((h)=>f(h.normalForce)+' normal / '+f(h.tangentForce)+' tangent').join('; '):''));
    const transitions=timeline.filter((row)=>row.achievedAt<=time+1e-8).flatMap((row)=>row.transitions).filter((u)=>u.observer===slot||u.changedTargets.includes(slot)||(u.beforePlan?.combination?.members.includes(slot)&&['cancelled-combination','earned-climb'].includes(u.classification))).slice(-3);
    for (const u of transitions) {
      const before=u.before.find((m)=>m.slot===slot)?.plan, after=u.after.find((m)=>m.slot===slot)?.plan;
      lines.push('Read at '+f(u.t)+'s: '+u.classification+' observed by '+u.observer+': '+(before?.kind ?? 'none')+' → '+(after?.kind ?? 'none')+' · target '+(before?.target ?? 'none')+' → '+(after?.target ?? 'none')+' · combo '+(before?.combination?.defender ?? 'none')+' → '+(after?.combination?.defender ?? 'none'));
      for (const event of u.events) if (event.note) lines.push('Recorded cue: '+event.note);
    }
    $('ownership-state').innerHTML=lines.map((line)=>'<div>'+esc(line)+'</div>').join('');
  }

  function drawLayers(p, frame, positions, X, Y, sc, selected) {`);
template = template.replaceAll('All games', 'Both recorded sources');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Missing replay data marker');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
console.log(`Wrote ${plays.length} paired ordinary-run clips (32 fixed, four supplemental witnesses) to ${output}; ${(html.length / 1024 / 1024).toFixed(2)}MB.`);
