/** Saved ordinary-run comparison; never simulates or chooses clips by outcome.
 * node --import tsx scripts/export-zone-reach.ts before-film.json.gz after-film.json.gz output.html
 * Companions use *-film -> * or film-* -> panel-* in the same directory.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { FRONTS, FRONT_BY_ID } from '../src/playbook/defense.js';
import type { PlayResult } from '../src/sim/types.js';
import type { RatingKey } from '../src/players/types.js';
import { packReplayPlay } from './replay-data.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';

interface Plan { kind: string; target: string | null; drive: { x: number; y: number };
  climbTo: string | null; pullRole: string | null; soloKind?: string | null; entryComplete?: boolean | null;
  firstStep?: { x: number; y: number } | null; zoneRead?: unknown; combination: null | {
    id: number; members: string[]; defender: string; backer: string | null; released: boolean;
    secureSince: number; nextRead: number; soloKind?: string | null } }
interface Ownership { slot: string; plan: Plan | null; engagement: unknown; tags: string[] }
interface Body extends Ownership { pos: { x: number; y: number }; vel: { x: number; y: number } }
interface Update {
  t: number; observer: string; classification: string; changedTargets: string[]; staleMembersAfter: string[];
  before: Ownership[]; after: Ownership[]; beforeBody: Body; afterBody: Body;
  oldCombinationAfter: Plan['combination']; requested: unknown; events: unknown[]; consumedImages: unknown[];
  targetGeometry?: unknown; zoneReadChanged: boolean;
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
  formation: string; control: boolean; observedSignature: string; plainSignature: string;
  result: Omit<PlayResult, 'frames' | 'telemetry'>; olMetrics: Record<string, unknown> }
interface Report { schema: string; sourceBefore: string; sourceAfter: string; collectorSha256: string;
  moduleSha256: Record<string, string>; cohort: unknown; filmIds: string[];
  summary: { snaps: number; observerVerifiedCount: number; naturalEnds: number; censors: number };
  trials: Trial[] }
const args = process.argv.slice(2), [beforePath, afterPath, output] = args;
if (args.length !== 3 || !beforePath.endsWith('.json.gz') || !afterPath.endsWith('.json.gz') || !output.endsWith('.html'))
  throw new Error('Usage: export-zone-reach.ts before-film.json.gz after-film.json.gz output.html');
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
function read<T>(p: string): T { return JSON.parse(gunzipSync(readFileSync(p)).toString()) as T; }
const labels = ['Baseline: previous zone reach', 'Candidate: solo zone reads'];
const zoneIds = ['oz_strong', 'wz_strong'].flatMap(run => ['R', 'L'].map(side => `ZR-R1-${run}-over-${side}-S3`));
const controls = [
  { run: 'iz_strong', front: 'over', seed: 3 }, { run: 'duo', front: 'odd', seed: 11 },
  { run: 'power', front: 'under', seed: 3 }, { run: 'counter', front: 'tite', seed: 11 },
];
const controlIds = controls.flatMap(c => ['R', 'L'].map(side => `ZR-R1-${c.run}-${c.front}-${side}-S${c.seed}`));
const expected = [...zoneIds, ...controlIds];
const companion = (path: string) => /(?:^|\/)film-[^/]+\.json\.gz$/.test(path)
  ? path.replace(/(^|\/)film-/, '$1panel-') : path.replace(/-film\.json\.gz$/, '.json.gz');
const phases = [beforePath, afterPath].map(path => ({ path, film: read<Film>(path),
  reportPath: companion(path), report: read<Report>(companion(path)) }));
for (const { film, report } of phases) {
  if (film.schema !== 'zone-reach-film-v1' || report.schema !== 'zone-reach-review-v1'
    || !/^[a-f0-9]{64}$/.test(film.sourceBefore) || film.sourceBefore !== film.sourceAfter
    || film.sourceBefore !== report.sourceBefore || report.sourceBefore !== report.sourceAfter
    || film.collectorSha256 !== report.collectorSha256 || report.summary.snaps !== 48
    || report.summary.observerVerifiedCount !== 48 || report.trials.length !== 48
    || report.trials.some(r => !r.observerVerified || r.observedSignature !== r.plainSignature)
    || film.plays.map(p => p.id).join('|') !== expected.join('|') || report.filmIds.join('|') !== expected.join('|'))
    throw new Error('Expected unchanged source, matched collector, 48 neutral controls, four zone films and eight installed controls');
  for (const p of film.plays) {
    const row = report.trials.find(r => r.id === p.id), result = p.result;
    if (!row || row.formation !== 'ace_11'
      || p.selection !== (controlIds.includes(p.id) ? 'installed-negative-control' : 'fixed-before-outcomes') || p.roster !== 0 || row.control !== controlIds.includes(p.id)
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
const rowsByPhase = phases.map(({ report }) => report.trials);
for (let i = 0; i < 48; i++) {
  const a = rowsByPhase[0][i], b = rowsByPhase[1][i];
  if (a.id !== b.id || a.profileSha256 !== b.profileSha256)
    throw new Error(`Mismatched initial state/profile: ${a.id}`);
  if (a.control && (!b.control || a.observedSignature !== b.observedSignature))
    throw new Error(`Installed negative control changed execution: ${a.id}`);
}
for (let i = 0; i < 12; i++) for (const key of ['id', 'roster', 'run', 'front', 'flip', 'seed', 'selection', 'offCall', 'defCall', 'los', 'firstDownX', 'players'] as const)
  if (JSON.stringify(phases[0].film.plays[i][key]) !== JSON.stringify(phases[1].film.plays[i][key]))
    throw new Error(`Mismatched fixed film: ${expected[i]} ${key}`);
for (let i = 0; i < 12; i++) for (const field of ['agents', 'ball', 'carrier', 'carrierPosture'] as const)
  if (JSON.stringify(phases[0].film.plays[i].result.frames![0][field]) !== JSON.stringify(phases[1].film.plays[i].result.frames![0][field]))
    throw new Error(`Mismatched initial recorded position/possession: ${expected[i]} ${field}`);
// Compact native states, not imagined player thoughts. One state follows each
// completed 0.05s physics tick. Transition snapshots retain both shared members.
function ownershipTrace(p: SavedPlay) {
  return p.trace.map(t => ({ t: t.t, achievedAt: t.t + .05, phase: t.phase,
    members: t.after.map(a => ({ slot: a.slot, plan: a.plan, engagement: a.engagement, tags: a.tags })),
    loads: t.deliveredStep,
    reads: t.updates.filter(u => ['LT', 'LG', 'C', 'RG', 'RT'].includes(u.observer)).map(u => ({
      t: u.t, observer: u.observer, requested: u.requested, targetGeometry: u.targetGeometry,
      actorAtRead: { pos: u.beforeBody.pos, vel: u.beforeBody.vel }, zoneReadChanged: u.zoneReadChanged,
      consumedZoneImages: u.zoneReadChanged ? u.consumedImages : [] })),
    transitions: t.updates.filter(u => u.classification !== 'no-target-change'
      || u.beforeBody.plan?.kind !== u.afterBody.plan?.kind).map(u => ({
      t: u.t, observer: u.observer, classification: u.classification, changedTargets: u.changedTargets,
      staleMembersAfter: u.staleMembersAfter, before: u.before, after: u.after,
      beforePlan: u.beforeBody.plan, afterPlan: u.afterBody.plan, oldCombinationAfter: u.oldCombinationAfter,
      requested: u.requested, events: u.events, consumedImages: u.consumedImages })) }));
}
const plays = phases.flatMap(({ film, report }, game) => film.plays.map((p, index) => {
  const result = p.result, row = report.trials.find(r => r.id === p.id)!;
  const log: PlayLog = { index, quarter: 0, clock: 0, offense: 'OFF', down: 1, distance: 10,
    yardline: p.los - 10, score: { home: 0, away: 0 }, kind: 'run', yards: result.offenseYards,
    call: `${labels[game]}${controlIds.includes(p.id) ? ' · Installed control' : ''} · ${p.offCall}`, defense: p.defCall, stats: result.stats, outcome: result.outcome,
    text: `${labels[game]} · ${p.id} · source ${film.sourceBefore.slice(0, 12)} · ${controlIds.includes(p.id) ? 'installed nonzone control, selected before outcomes' : 'fixed zone input, selected before outcomes'} · natural ${result.outcome} at ${result.duration.toFixed(2)}s. Inspect a lineman for stored zone reads, intended surfaces and actual movement/contact/load. Same physical capabilities in both versions; a chosen phase does not prove a successful block.`,
    plan: { personnel: '11', formation: row.formation, qb: 'under', concept: RUN_BY_ID[p.run].scheme,
      playAction: false, audible: false, defPersonnel: FRONT_BY_ID[p.front].personnel[0], front: p.front, coverage: 'cover3',
      called: 'cover3', family: 'cover3', shell: 'one-high', pressure: false },
    replay: { los: p.los, firstDownX: p.firstDownX, flip: p.flip, frames: result.frames!, events: result.events,
      telemetry: result.telemetry!, players: p.players.map(a => ({ team: a.team, slot: a.slot, name: a.name,
        jersey: a.jersey, pos: a.position, weightLb: a.weightLb })), profiles: p.players.map(a => ({
        position: a.position, heightIn: a.heightIn, weightLb: a.weightLb, ratings: a.ratings })) } };
  return { ...packReplayPlay(log, game), id: `${game ? 'FINAL' : 'BEFORE'}-${p.id}`, fixtureId: p.id,
    fixtureSeed: p.seed, fixtureRun: p.run, sourceLabel: labels[game], sourceSha256: film.sourceBefore,
    filmSelection: p.selection, fixtureFlip: p.flip, initialSha256: row.initialSha256,
    profileSha256: row.profileSha256, physicalSha256: row.observedSignature, recordingVerified: true,
    naturalResult: { ...result, frames: undefined, telemetry: undefined }, eventDetails: result.events,
    recordedPlayers: p.players, inspectedLineman: p.players.findIndex(a => a.slot === 'RG'),
    olMetrics: row.olMetrics, fixtureFormation: row.formation, installedControl: row.control,
    ownershipTrace: ownershipTrace(p) };
}));
const comparisons = phases.map(({ path, reportPath, film, report }, i) => ({ label: labels[i],
  sourceSha256: film.sourceBefore, collectorSha256: film.collectorSha256, cohortSha256: hash(report.cohort),
  filmRawSha256: fileHash(path), reportRawSha256: fileHash(reportPath), moduleSha256: report.moduleSha256,
  observerChecks: report.trials.map(r => ({ id: r.id, initialSha256: r.initialSha256,
    profileSha256: r.profileSha256, observedSignature: r.observedSignature, plainSignature: r.plainSignature })) }));
const data = { meta: { sourceSha256: phases[1].film.sourceBefore, sourceComparison: comparisons,
  telemetryLevel: 'full', filmSchema: 'zone-reach-comparison-v1', seed: 3,
  cohort: '24 fixed ordinary run clips pair four OZ/WZ Over/seed3 calls and all eight installed nonzone controls across two controller versions. The full panel has 40 balanced zone inputs and eight controls; it is not an NFL sample. Player profiles, initial positions and shared physical capabilities match. All 48 observed executions per version match plain controls. Clips finish naturally. Stored zone phases and surface/drive targets are intentions; actual bodies, engagements and delivered loads are separate records. No exhaustive eye tracking or guaranteed successful reach is recorded.',
  final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Controlled Offense', abbr: 'OFF', color: '#1d4f91', text: '#fff' },
  away: { name: 'Controlled Defense', abbr: 'DEF', color: '#a3302a', text: '#fff' } },
  games: phases.map(({ film }, i) => ({ label: labels[i], seed: 3, sourceSha256: film.sourceBefore,
    final: { home: 0, away: 0 }, quarters: [] })), plays: compactReplayPlays(plays),
  catalog: { coverage: { cover3: 'Cover 3' }, front: Object.fromEntries(FRONTS.map(f => [f.id, f.name])), formation: { ace_11: 'Singleback Ace' } } };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), templatePath = resolve(root, 'viewer/replay.template.html');
let template = readFileSync(templatePath, 'utf8');
function replace(from: string, to: string) {
  if (!template.includes(from)) throw new Error(`Viewer marker changed: ${from.slice(0, 80)}`);
  template = template.replace(from, to);
}
replace("key === 'game' ? `Game ${Number(value) + 1} · seed ${games[value].seed}`", "key === 'game' ? games[value].label");
replace("${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}", '${esc(p.id)} · ${esc(p.sourceLabel)}');
replace("$('dd').textContent = `${ord[p.down] || p.down + 'th'} & ${100 - p.yl <= p.dist ? 'Goal' : p.dist} · ${yl(p.yl)}`;",
  "$('dd').textContent = `${ord[p.down]} & ${p.dist} · controlled zone reach comparison`;");
replace("inspectorStamp = '';\n    prepareTelemetry(p);", "$('inspect-player').value = String(p.inspectedLineman);\n    inspectorStamp = '';\n    prepareTelemetry(p);");
replace('<details class="inspector"><summary>Recorded event notes</summary>',
  '<section class="inspector"><h2>Zone read, intention and contact</h2><small class="status-note">Reads occur at tick start; actual motion and loads follow each completed 0.05s tick. A stored phase or surface target does not prove a successful block. The outward-step estimate holds the current acceleration/facing envelope and excludes traffic and external loads; it is not a certified bound. Forces use kg·yd/s², impulses kg·yd/s, work kg·yd²/s². No exhaustive eye tracking.</small><div id="ownership-state" class="detail-list"></div></section><details class="inspector"><summary>Recorded event notes</summary>');
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
    const zone=plan?.zoneRead;
    if (zone) {
      const who=p.roster[zone.target], origin=timeline.flatMap((row)=>row.reads).find((r)=>r.observer===slot&&Math.abs(r.t-zone.t)<1e-8)?.actorAtRead;
      lines.push('Stored zone phase '+zone.phase+' · target '+(who?.[1] ?? zone.target)+' · read at '+f(zone.t)+'s · next permitted read '+f(zone.nextRead)+'s',
        'Consumed delayed visual image: age '+(zone.seen.age!=null?f(zone.seen.age)+'s when read':'unrecorded')+' · saw '+(zone.seen.pose ?? 'unknown pose')+' · position '+vector(zone.seen.pos)+' yd · velocity '+vector(zone.seen.vel)+' yd/s');
      if (origin) lines.push('Relative hip at that read: playside '+f((origin.pos.y-zone.seen.pos.y)*zone.side)+' yd (positive = outside) · longitudinal '+f(origin.pos.x-zone.seen.pos.x)+' yd · defender playside velocity '+f(zone.seen.vel.y*zone.side)+' yd/s');
      lines.push('Intended contact surface aim '+vector(zone.aim)+' yd · displacement direction '+vector(zone.drive)+' · world-lateral seal target '+f(zone.sealTarget)+' (intent)',
        'Current-envelope outward-step estimate over '+f(zone.horizon)+'s: needs '+f(zone.neededTravel)+' yd / available '+f(zone.availableTravel)+' yd; traffic and contact loads excluded');
    } else lines.push('No stored zone-read record in this controller snapshot.');
    if (member.engagement) lines.push('Actual engagement geometry: surface frame '+vector(member.engagement.surfaceAxis)+' · displacement direction '+vector(member.engagement.drive)+' · frame seal target '+(member.engagement.sealTarget!=null?f(member.engagement.sealTarget):'unrecorded')+' · achieved φ '+f(member.engagement.phi)+' / control '+f(member.engagement.control));
    if (read) {
      lines.push('Read at '+f(read.t)+'s: requested velocity '+vector(read.requested.vel)+' yd/s'+(read.requested.posture!=null?' · requested posture '+f(read.requested.posture):''));
      const geometry=read.targetGeometry;
      if (geometry) lines.push('Target '+geometry.slot+' · observed position '+vector(geometry.observedPosition)+' yd · observed velocity '+vector(geometry.observedVelocity)+' yd/s',
        'Actual center offset from intended drive: lateral '+f(geometry.actualLateralErrorToDrive)+' yd / along '+f(geometry.actualAlongDrive)+' yd (geometry, not proof of leverage)');
    }
    if (load) lines.push('Actual achieved center '+vector(load.achievedPos)+' yd · velocity '+vector(load.achievedVel)+' yd/s · ground impulse '+vector(load.groundImpulse),
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
console.log(`Wrote ${plays.length} paired ordinary-run clips (eight zone clips, 16 installed controls) to ${output}; ${(html.length / 1024 / 1024).toFixed(2)}MB.`);
