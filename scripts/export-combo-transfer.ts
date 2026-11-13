/** Saved ordinary-run comparison; never simulates or chooses clips by outcome.
 * node --import tsx scripts/export-combo-transfer.ts before-film.json.gz after-film.json.gz output.html
 * Optional fourth argument: JSON {title, phaseLabels: [before, after], explanation}.
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
  firstStep?: { x: number; y: number } | null; combination: null | {
    id: number; members: string[]; defender: string; backer: string | null; released: boolean;
    secureSince: number; nextRead: number; soloKind?: string | null } }
interface Ownership { slot: string; plan: Plan | null; engagement: unknown; tags: string[] }
interface Update {
  t: number; observer: string; classification: string; changedTargets: string[]; staleMembersAfter: string[];
  before: Ownership[]; after: Ownership[]; beforeBody: Ownership; afterBody: Ownership;
  oldCombinationAfter: Plan['combination']; requested: unknown; events: unknown[]; consumedImages: unknown[];
  targetGeometry?: unknown; afterSolvedOwnership?: Ownership[];
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
interface ComparisonMetadata { title: string; phaseLabels: [string, string]; explanation: string }
const args = process.argv.slice(2), [beforePath, afterPath, output, metadataPath] = args;
if (![3, 4].includes(args.length) || !beforePath?.endsWith('.json.gz') || !afterPath?.endsWith('.json.gz') || !output?.endsWith('.html'))
  throw new Error('Usage: export-combo-transfer.ts before-film.json.gz after-film.json.gz output.html [metadata.json]');
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
function read<T>(p: string): T { return JSON.parse(gunzipSync(readFileSync(p)).toString()) as T; }
function readMetadata(path: string): ComparisonMetadata {
  let value: unknown;
  try { value = JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { throw new Error(`Invalid comparison metadata JSON: ${error instanceof Error ? error.message : String(error)}`); }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid comparison metadata: expected an object with title, phaseLabels and explanation');
  const fields = value as Record<string, unknown>;
  if (Object.keys(fields).sort().join('|') !== ['explanation', 'phaseLabels', 'title'].join('|'))
    throw new Error('Invalid comparison metadata: require exactly title, phaseLabels and explanation');
  const text = (field: string, limit: number): string => {
    const result = fields[field];
    if (typeof result !== 'string' || !result.trim() || result.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result))
      throw new Error(`Invalid comparison metadata: ${field} must be nonempty text of at most ${limit} characters`);
    return result.trim();
  };
  if (!Array.isArray(fields.phaseLabels) || fields.phaseLabels.length !== 2
    || fields.phaseLabels.some(label => typeof label !== 'string' || !label.trim() || label.length > 160 || /[\u0000-\u001f]/.test(label)))
    throw new Error('Invalid comparison metadata: phaseLabels must contain exactly two nonempty text labels');
  const phaseLabels = fields.phaseLabels.map(label => (label as string).trim()) as [string, string];
  if (phaseLabels[0] === phaseLabels[1]) throw new Error('Invalid comparison metadata: phase labels must be distinct');
  return { title: text('title', 160), phaseLabels, explanation: text('explanation', 4000) };
}
const metadata = metadataPath ? readMetadata(metadataPath) : null;
const labels = metadata?.phaseLabels ?? ['Baseline: shared combo release', 'Candidate: keeper-based combo release'];
const comparisonTitle = metadata?.title ?? 'controlled combo-transfer comparison';
const inspectionNote = metadata
  ? 'Inspect a lineman to compare his requested technique, consumed cues, actual target, real hand-joint identity and completed-step support/loads. A chosen job does not guarantee a successful block.'
  : 'Inspect a combo member to compare his next job, the actual remaining blocker, real hand-joint identity and completed-step support/loads. A climb decision does not guarantee a successful block.';
const fixed = [
  {run: 'iz_strong', front: 'over', seed: 3}, {run: 'power', front: 'under', seed: 3},
  {run: 'counter', front: 'odd', seed: 11}, {run: 'duo', front: 'odd', seed: 11},
  {run: 'split_zone', front: 'tite', seed: 3},
];
const expected = fixed.flatMap(c => ['R', 'L'].map(side => `CT-R1-${c.run}-${c.front}-${side}-S${c.seed}`));
const companion = (path: string) => /(?:^|\/)film-[^/]+\.json\.gz$/.test(path)
  ? path.replace(/(^|\/)film-/, '$1panel-') : path.replace(/-film\.json\.gz$/, '.json.gz');
const phases = [beforePath, afterPath].map(path => ({ path, film: read<Film>(path),
  reportPath: companion(path), report: read<Report>(companion(path)) }));
for (const { film, report } of phases) {
  if (film.schema !== 'combo-transfer-film-v1' || report.schema !== 'combo-transfer-review-v1'
    || !/^[a-f0-9]{64}$/.test(film.sourceBefore) || film.sourceBefore !== film.sourceAfter
    || film.sourceBefore !== report.sourceBefore || report.sourceBefore !== report.sourceAfter
    || film.collectorSha256 !== report.collectorSha256 || report.summary.snaps !== 160
    || report.summary.observerVerifiedCount !== 160 || report.trials.length !== 160 || report.supplementalTrials.length !== 2
    || [...report.trials, ...report.supplementalTrials].some(r => !r.observerVerified || r.observedSignature !== r.plainSignature)
    || film.plays.map(p => p.id).join('|') !== expected.join('|') || report.filmIds.join('|') !== expected.join('|'))
    throw new Error('Expected unchanged source, matched collector, 160+2 neutral controls, ten fixed paired films');
  for (const p of film.plays) {
    const row = [...report.trials, ...report.supplementalTrials].find(r => r.id === p.id), result = p.result;
    if (!row || row.formation !== (p.run === 'split_zone' ? 'gun_wing_12' : 'ace_11')
      || p.selection !== 'fixed-before-outcomes' || p.roster !== 0
      || !fixed.some(c => c.run === p.run && c.front === p.front && c.seed === p.seed)
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
for (let i = 0; i < 10; i++) for (const key of ['id', 'roster', 'run', 'front', 'flip', 'seed', 'selection', 'offCall', 'defCall', 'los', 'firstDownX', 'players'] as const)
  if (JSON.stringify(phases[0].film.plays[i][key]) !== JSON.stringify(phases[1].film.plays[i][key]))
    throw new Error(`Mismatched fixed film: ${expected[i]} ${key}`);
for (let i = 0; i < 10; i++) for (const field of ['agents', 'ball', 'carrier', 'carrierPosture'] as const)
  if (JSON.stringify(phases[0].film.plays[i].result.frames![0][field]) !== JSON.stringify(phases[1].film.plays[i].result.frames![0][field]))
    throw new Error(`Mismatched initial recorded position/possession: ${expected[i]} ${field}`);
// Copy the saved native states. Technique intentions, actual joints, and
// completed-step loads remain separate; there is no simulation in this exporter.
function ownershipTrace(p: SavedPlay) {
  return p.trace.map(t => ({ t: t.t, achievedAt: t.t + .05, phase: t.phase,
    members: t.after, loads: t.deliveredStep,
    nonOLAfterPhysics: [...t.updates].reverse().find(u => u.afterSolvedOwnership)?.afterSolvedOwnership
      ?.filter(m => !['LT','LG','C','RG','RT'].includes(m.slot)) ?? [],
    reads: t.updates.filter(u => ['LT','LG','C','RG','RT','Y','F'].includes(u.observer)).map(u => ({
      t: u.t, observer: u.observer, requested: u.requested, targetGeometry: u.targetGeometry,
      consumedImages: u.consumedImages, events: u.events })),
    transitions: t.updates.filter(u => u.classification !== 'no-target-change'
      || u.beforeBody.plan?.kind !== u.afterBody.plan?.kind) }));
}
function focus(p: SavedPlay) {
  const initial = p.trace[0].before;
  const combo = initial.find(a => a.slot === 'C' && a.plan?.combination)
    ?? initial.find(a => ['LT','LG','C','RG','RT'].includes(a.slot) && a.plan?.combination);
  return p.players.findIndex(a => a.slot === (combo?.slot ?? 'C'));
}
const plays = phases.flatMap(({ film, report }, game) => film.plays.map((p, index) => {
  const result = p.result, row = [...report.trials, ...report.supplementalTrials].find(r => r.id === p.id)!;
  const log: PlayLog = { index, quarter: 0, clock: 0, offense: 'OFF', down: 1, distance: 10,
    yardline: p.los - 10, score: { home: 0, away: 0 }, kind: 'run', yards: result.offenseYards,
    call: `${labels[game]} · ${p.offCall}`, defense: p.defCall, stats: result.stats, outcome: result.outcome,
    text: `${labels[game]} · ${p.id} · source ${film.sourceBefore.slice(0, 12)} · fixed input, selected before outcomes · natural ${result.outcome} at ${result.duration.toFixed(2)}s. ${inspectionNote} Same player capabilities and shared physics world in both versions.${metadata ? ' ' + metadata.explanation : ''}`,
    plan: { personnel: row.formation === 'gun_wing_12' ? '12' : '11', formation: row.formation, qb: row.formation === 'gun_wing_12' ? 'gun' : 'under', concept: RUN_BY_ID[p.run].scheme,
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
    recordedPlayers: p.players, inspectedLineman: focus(p),
    olMetrics: row.olMetrics, fixtureFormation: row.formation, supplemental: row.supplemental,
    ownershipTrace: ownershipTrace(p) };
}));
const comparisons = phases.map(({ path, reportPath, film, report }, i) => ({ label: labels[i],
  sourceSha256: film.sourceBefore, collectorSha256: film.collectorSha256, cohortSha256: hash(report.cohort),
  filmRawSha256: fileHash(path), reportRawSha256: fileHash(reportPath), moduleSha256: report.moduleSha256,
  observerChecks: [...report.trials, ...report.supplementalTrials].map(r => ({ id: r.id, initialSha256: r.initialSha256,
    profileSha256: r.profileSha256, observedSignature: r.observedSignature, plainSignature: r.plainSignature })) }));
const data = { meta: { sourceSha256: phases[1].film.sourceBefore, sourceComparison: comparisons,
  telemetryLevel: 'full', filmSchema: 'combo-transfer-comparison-v1', seed: 3,
  ...(metadata ? { comparisonTitle: metadata.title, comparisonExplanation: metadata.explanation,
    comparisonMetadata: { path: metadataPath!, sha256: fileHash(metadataPath!) } } : {}),
  cohort: '20 fixed ordinary run clips: IZ against Over, Duo against Odd, Split Zone against Tite, Power against Under and Counter against Odd, in both directions and paired across two controller versions. The full diagnostic panel has 160 balanced inputs plus two separately labelled prior witnesses. Clips were chosen before outcomes. Player profiles, initial positions and shared physical capabilities match. All 162 observed executions per version match plain controls; clips finish naturally. This is not an NFL sample. Native ownership, consumed visual images, real hand joints and delivered loads are recorded separately; a chosen climb does not prove success' + (metadata ? '. ' + metadata.explanation : ''),
  final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Controlled Offense', abbr: 'OFF', color: '#1d4f91', text: '#fff' },
  away: { name: 'Controlled Defense', abbr: 'DEF', color: '#a3302a', text: '#fff' } },
  games: phases.map(({ film }, i) => ({ label: labels[i], seed: 3, sourceSha256: film.sourceBefore,
    final: { home: 0, away: 0 }, quarters: [] })), plays: compactReplayPlays(plays),
  catalog: { coverage: { cover3: 'Cover 3' }, front: Object.fromEntries(FRONTS.map(f => [f.id, f.name])), formation: { ace_11: 'Ace (11)', gun_wing_12: 'Gun Wing (12)' } } };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), templatePath = resolve(root, 'viewer/replay.template.html');
let template = readFileSync(templatePath, 'utf8');
function replace(from: string, to: string) {
  if (!template.includes(from)) throw new Error(`Viewer marker changed: ${from.slice(0, 80)}`);
  template = template.replace(from, to);
}
if (metadata) {
  const escapedTitle = metadata.title.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  replace('<title>Gridiron Film Room</title>', `<title>${escapedTitle}</title>`);
  replace('<h1>Find your next set of plays</h1>', `<h1>${escapedTitle}</h1>`);
}
replace("key === 'game' ? `Game ${Number(value) + 1} · seed ${games[value].seed}`", "key === 'game' ? games[value].label");
replace("${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}", '${esc(p.id)} · ${esc(p.sourceLabel)}');
replace("$('dd').textContent = `${ord[p.down] || p.down + 'th'} & ${100 - p.yl <= p.dist ? 'Goal' : p.dist} · ${yl(p.yl)}`;",
  metadata ? "$('dd').textContent = `${ord[p.down]} & ${p.dist} · ` + " + JSON.stringify(comparisonTitle).replace(/</g, '\\u003c') + ';'
    : "$('dd').textContent = `${ord[p.down]} & ${p.dist} · controlled combo-transfer comparison`;");
replace("inspectorStamp = '';\n    prepareTelemetry(p);", "$('inspect-player').value = String(p.inspectedLineman);\n    inspectorStamp = '';\n    prepareTelemetry(p);");
replace('<details class="inspector"><summary>Recorded event notes</summary>',
  '<section class="inspector"><h2>' + (metadata ? 'Run assignments, hands and support' : 'Combo ownership, hands and support') + '</h2><small class="status-note">Reads occur at tick start; actual movement and loads follow the completed 0.05s tick. A keeper or climb assignment is an intention. Hand-joint IDs are local to each play and source; actual transmitted loads show whether contact survives. Forces use kg·yd/s², impulses kg·yd/s, work kg·yd²/s². Completed body/load rows cover the five OL. Non-OL keepers appear in saved ownership snapshots when available; no absent row is treated as a lost block. Consumed images show recorded cues, not exhaustive eye tracking.</small><div id="ownership-state" class="detail-list"></div></section><details class="inspector"><summary>Recorded event notes</summary>');
replace("if (stamp === inspectorStamp) return;", "if (stamp === inspectorStamp) return;\n    inspectOwnership(p, player, t);");
replace('  function drawLayers(p, frame, positions, X, Y, sc, selected) {', `  function inspectOwnership(p, player, time) {
    const panel=$('ownership-state'); panel.dataset.fixture=p.id; panel.dataset.time=String(time); panel.dataset.slot=p.roster[player]?.[1]??'';
    const slot=p.roster[player]?.[1], timeline=p.ownershipTrace??[];
    const state=timeline.findLast(row=>row.achievedAt<=time+1e-8), member=state?.members.find(m=>m.slot===slot)??state?.nonOLAfterPhysics.find(m=>m.slot===slot);
    if(!member){panel.textContent=slot?'No completed native blocker tick available at this time.':'Select a blocker to inspect ownership.';return;}
    const plan=member.plan, combo=plan?.combination, e=member.engagement, load=state.loads.find(l=>l.slot===slot);
    const f=n=>typeof n==='number'?n.toFixed(2):'unrecorded', vector=v=>v?f(v.x)+', '+f(v.y):'unrecorded';
    const hand=h=>h?'#'+h.id+' '+h.a+' ↔ '+h.b+(h.live!=null?' · '+(h.live?'live':'absent from world'):'')+' · actor '+(h.actor??'unrecorded')+' · push/hold/steer '+f(h.push)+' / '+f(h.hold)+' / '+f(h.steer)+' · normal/tangent '+f(h.normalForce)+' / '+f(h.tangentForce):'none';
    const lines=['After tick '+f(state.t)+'–'+f(state.achievedAt)+'s: '+slot+' '+(plan?.kind??'unassigned')+' → '+(plan?.target??'none'),
      combo?'Combo #'+combo.id+': '+combo.members.join(' + ')+' → '+combo.defender+' · '+(combo.released?'released':'live')+(plan.target!==combo.defender&&!combo.released?' · STALE target mismatch':''):'No shared combination pointer'];
    if(plan?.soloKind)lines.push('Saved standalone technique: '+plan.soloKind);
    if(plan?.firstStep)lines.push('Entry-step target '+vector(plan.firstStep)+' yd · '+(plan.entryComplete?'complete':'pending'));
    if(e){
      lines.push('Actual engagement: '+e.blocker+' → '+e.defender+' · helpers '+(e.helpers.join(', ')||'none'),
        'Actual contact frame '+vector(e.axis)+' · surface override '+(e.surfaceAxis?vector(e.surfaceAxis):'none')+' · drive '+vector(e.drive)+' · φ '+f(e.phi)+' · engagement control '+f(e.control),
        'Recorded base: blocker '+f(e.baseB)+' / defender '+f(e.baseD), 'Primary hands '+hand(e.hands));
      for(const h of e.helperHands??[])lines.push('Helper hands '+(h.slot??h.helper??'')+': '+hand(h.hands??h.joint??h));
      for(const m of e.members??[])lines.push('Actual member '+m.slot+' · support availability '+f(m.supportAvailability)+' · surface φ '+f(m.surfacePhi)+' · '+(m.down?'down':'not down')+(m.helperSupport!=null?' · helper support '+f(m.helperSupport):'')+' · hands '+hand(m.hands));
    }else lines.push('No actual block engagement');
    const support=member.support??load?.support;
    if(support)lines.push('Actual support '+support.state+' · posture '+f(support.posture)+' · capture deviation '+vector(support.xi)+' yd · lean '+vector(support.lean)+' · received load '+vector(support.load));
    const read=state.reads.find(r=>r.observer===slot);
    if(read){
      lines.push('Controller read at '+f(read.t)+'s: requested velocity '+vector(read.requested?.vel)+' yd/s');
      for(const cue of read.consumedImages??[]){const img=cue.image;lines.push('Consumed '+cue.target+' image: age '+f(img.age)+'s · '+(img.pose??'pose unrecorded')+' · position '+vector(img.pos)+' yd · velocity '+vector(img.vel)+' yd/s');}
    }
    if(load){
      lines.push('Actual achieved center '+vector(load.achievedPos)+' yd · velocity '+vector(load.achievedVel)+' yd/s · ground impulse '+vector(load.groundImpulse),
        'Arm impulse '+f(load.armImpulse)+' / '+f(load.armImpulseLimit)+' · arm work '+f(load.armWork)+' / '+f(load.armWorkLimit),
        'Support motor work '+f(load.supportMotorWork)+' / '+f(load.supportMotorWorkLimit),
        'Physical contacts '+load.physicalContacts.length+' · surviving hand joints '+load.liveHandsAfterPhysics.length);
      for(const h of load.liveHandsAfterPhysics)lines.push('After physics hands '+hand(h));
    }
    const transfers=timeline.filter(row=>row.achievedAt<=time+1e-8).flatMap(row=>row.transitions)
      .filter(u=>u.observer===slot||u.changedTargets.includes(slot)||u.beforeBody.plan?.combination?.members.includes(slot)).slice(-3);
    for(const u of transfers){
      const before=u.before.find(m=>m.slot===slot), after=u.after.find(m=>m.slot===slot), bp=before?.plan, ap=after?.plan;
      lines.push('Read at '+f(u.t)+'s: '+u.classification+' by '+u.observer+': '+(bp?.kind??'none')+' → '+(ap?.kind??'none')+' · target '+(bp?.target??'none')+' → '+(ap?.target??'none'));
      for(const ev of u.events??[])if(ev.note)lines.push('Recorded cue: '+ev.note);
      if(u.classification==='earned-climb'){
        const defender=u.beforeBody.plan?.combination?.defender;
        const beforeE=u.before.map(m=>m.engagement).find(v=>v&&v.defender===defender), afterE=u.after.map(m=>m.engagement).find(v=>v&&v.defender===defender);
        if(beforeE&&afterE){
          const keeperState=afterE.members?.find(m=>m.slot===afterE.blocker);
          if(keeperState)lines.push('Keeper support at decision: '+afterE.blocker+' · availability '+f(keeperState.supportAvailability)+' · surface φ '+f(keeperState.surfacePhi)+' · hands '+hand(keeperState.hands));
          lines.push('At decision, actual blocker '+beforeE.blocker+' → '+afterE.blocker+' · primary hands '+hand(beforeE.hands)+' → '+hand(afterE.hands));
          const tickIndex=timeline.findIndex(row=>Math.abs(row.t-u.t)<1e-8);
          for(const offset of [0,1]){
            const solved=timeline[tickIndex+offset];
            if(tickIndex<0||!solved||solved.achievedAt>time+1e-8)continue;
            const kept=solved.members.find(m=>m.slot===afterE.blocker)??solved.nonOLAfterPhysics.find(m=>m.slot===afterE.blocker), delivered=solved.loads.find(l=>l.slot===afterE.blocker);
            if(!kept){lines.push((offset?'Next completed tick ':'Transfer completed tick ')+f(solved.achievedAt)+'s: no completed ownership snapshot recorded for '+afterE.blocker+'; block outcome unrecorded here.');continue;}
            const same=kept?.engagement?.defender===defender?kept.engagement:null;
            lines.push((offset?'Next completed tick ':'Transfer completed tick ')+f(solved.achievedAt)+'s: '+afterE.blocker+' actual engagement '+(same?same.defender:'none')+' · primary hands '+hand(same?.hands)+(delivered?' · delivered arm impulse '+f(delivered.armImpulse)+' / '+f(delivered.armImpulseLimit):' · per-body load row unrecorded for this non-OL keeper'));
            for(const h of delivered?.liveHandsAfterPhysics??[])if(h.a===defender||h.b===defender)lines.push('Keeper-to-defender hands after this solve '+hand(h));
          }
        }
      }
    }
    panel.innerHTML=lines.map(line=>'<div>'+esc(line)+'</div>').join('');
  }

  function drawLayers(p, frame, positions, X, Y, sc, selected) {`);
template = template.replaceAll('All games', 'Both recorded sources');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Missing replay data marker');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
console.log(`Wrote ${plays.length} paired ordinary-run clips (ten fixed fixtures in both versions) to ${output}; ${(html.length / 1024 / 1024).toFixed(2)}MB.`);
