/** Export the four saved fixed exchange witnesses, without running the engine.
 * node --import tsx scripts/export-ol-exchange.ts BEFORE.json.gz AFTER.json.gz OUTPUT.html
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import type { PlayResult } from '../src/sim/types.js';
import type { RatingKey } from '../src/players/types.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { FRONTS, FRONT_BY_ID } from '../src/playbook/defense.js';
import { packReplayPlay } from './replay-data.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';
interface Player {team: 'O'|'D'; slot: string; name: string; jersey: number; position: string;
  weightLb: number; heightIn: number; ratings: Record<RatingKey, number>; profile: Record<string, number>}
interface Fixture {id: string; run: string; front: string; flip: boolean; seed: number; formation: string; selection: string;
  offCall: string; defCall: string; los: number; firstDownX: number; initialSha256: string; profileSha256: string;
  observerVerified: boolean; observedSignature: string; plainSignature: string; naturalEnd: boolean;
  result: PlayResult; players: Player[]; exchanges: Array<Record<string, unknown>>}
interface Film {schema: string; sourceBefore: string; sourceAfter: string; collectorSha256: string;
  moduleSha256: Record<string,string>; cohort: unknown; plays: Fixture[]}
const [beforePath, afterPath, output] = process.argv.slice(2);
if (process.argv.length !== 5 || !beforePath.endsWith('.json.gz') || !afterPath.endsWith('.json.gz') || !output.endsWith('.html'))
  throw new Error('Usage: export-ol-exchange.ts BEFORE.json.gz AFTER.json.gz OUTPUT.html');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const phases = [beforePath, afterPath].map(path => ({path, film: JSON.parse(gunzipSync(readFileSync(path)).toString()) as Film}));
const labels = ['Baseline: previous work exchange', 'Candidate: each player reads his new work'];
const expected = ['duo-odd','power-under'].flatMap(pair => ['R','L'].map(side => `WX-R1-${pair}-${side}-S3`));
for (const {film} of phases) {
  if (film.schema !== 'ol-work-exchange-film-v1' || !/^[a-f0-9]{64}$/.test(film.sourceBefore)
    || film.sourceBefore !== film.sourceAfter || film.plays.map(p => p.id).join('|') !== expected.join('|'))
    throw new Error('Expected four fixed unchanged-source ordinary exchange witnesses');
  for (const p of film.plays) if (!p.observerVerified || p.observedSignature !== p.plainSignature || !p.naturalEnd
    || p.result.outcome === 'timeout' || p.result.telemetry?.level !== 'full' || !p.result.frames?.length
    || p.result.frames[0].t !== 0 || p.players.length !== 22 || p.selection !== 'fixed-before-outcomes' || p.formation !== 'ace_11')
    throw new Error(`Invalid saved witness: ${p.id}`);
}
if (phases[0].film.sourceBefore === phases[1].film.sourceBefore
  || phases[0].film.collectorSha256 !== phases[1].film.collectorSha256
  || hash(phases[0].film.cohort) !== hash(phases[1].film.cohort)
  || phases[0].film.moduleSha256['src/physics/world.ts'] !== phases[1].film.moduleSha256['src/physics/world.ts'])
  throw new Error('Expected distinct controllers with the same fixed cohort, collector and shared World');
for (let i=0;i<4;i++) for (const key of ['id','run','front','flip','seed','formation','selection','players','initialSha256','profileSha256'] as const)
  if (hash(phases[0].film.plays[i][key]) !== hash(phases[1].film.plays[i][key])) throw new Error(`Mismatched fixture ${expected[i]} ${key}`);
const plays = phases.flatMap(({film}, source) => film.plays.map((p,index) => {
  const log: PlayLog = {index, quarter: 0, clock: 0, offense: 'OFF', down: 1, distance: 10, yardline: p.los-10,
    score: {home:0,away:0}, kind:'run', yards:p.result.offenseYards, call:`${labels[source]} · ${p.offCall}`,
    defense:p.defCall, stats:p.result.stats, outcome:p.result.outcome,
    text:`${labels[source]} · ${p.id} · source ${film.sourceBefore.slice(0,12)} · fixed before candidate outcomes · natural ${p.result.outcome} at ${p.result.duration.toFixed(2)}s. Select a lineman and inspect an actual work exchange: each consumed picture names its observer. Decisions, later contact acquisition and delivered physical movement are separate records.`,
    plan:{personnel:'11', formation:p.formation, qb:'under', concept:RUN_BY_ID[p.run].scheme, playAction:false, audible:false,
      defPersonnel:FRONT_BY_ID[p.front].personnel[0], front:p.front, coverage:'cover3', called:'cover3', family:'cover3', shell:'one-high',pressure:false},
    replay:{los:p.los,firstDownX:p.firstDownX,flip:p.flip,frames:p.result.frames!,events:p.result.events,
      telemetry:p.result.telemetry!, players:p.players.map(a=>({team:a.team,slot:a.slot,name:a.name,jersey:a.jersey,pos:a.position,weightLb:a.weightLb})),
      profiles:p.players.map(a=>({position:a.position,heightIn:a.heightIn,weightLb:a.weightLb,ratings:a.ratings}))}};
  return {...packReplayPlay(log,source), id:`${source?'FINAL':'BEFORE'}-${p.id}`, fixtureId:p.id, sourceLabel:labels[source],
    sourceSha256:film.sourceBefore, initialSha256:p.initialSha256,profileSha256:p.profileSha256,physicalSha256:p.observedSignature,
    fixtureRun:p.run,fixtureSeed:p.seed,fixtureFlip:p.flip,filmSelection:p.selection,recordingVerified:true,
    naturalResult:{...p.result,frames:undefined,telemetry:undefined},eventDetails:p.result.events,
    recordedPlayers:p.players,exchanges:p.exchanges,inspectedLineman:p.players.findIndex(a=>a.slot==='RG')};
}));
const comparisons=phases.map(({path,film},i)=>({label:labels[i],sourceSha256:film.sourceBefore,collectorSha256:film.collectorSha256,
  cohortSha256:hash(film.cohort),inputRawSha256:fileHash(path),moduleSha256:film.moduleSha256,
  observerChecks:film.plays.map(p=>({id:p.id,initialSha256:p.initialSha256,profileSha256:p.profileSha256,
    observedSignature:p.observedSignature,plainSignature:p.plainSignature}))}));
const data={meta:{sourceSha256:phases[1].film.sourceBefore,sourceComparison:comparisons,telemetryLevel:'full',filmSchema:'ol-work-exchange-comparison-v1',seed:3,
  cohort:'Eight fixed ordinary clips: Duo against Odd and Power against Under, each direction, paired across two controller versions. Roster seeds31/32 at strength0.55, Ace11, Cover3. Chosen before candidate outcomes; all eight recording/observer controls match plain execution. This small film set is not an NFL sample. Full replay telemetry is accompanied only by actual exchanges and their completed physical tick. Consumed images are attributed to the actual observer, including recipient reads inside an initiator update.',
  final:{home:0,away:0},quarters:[],home:{name:'Controlled Offense',abbr:'OFF',color:'#1d4f91',text:'#fff'},away:{name:'Controlled Defense',abbr:'DEF',color:'#a3302a',text:'#fff'}},
  games:phases.map(({film},i)=>({label:labels[i],seed:3,sourceSha256:film.sourceBefore,final:{home:0,away:0},quarters:[]})),plays:compactReplayPlays(plays),
  catalog:{coverage:{cover3:'Cover 3'},front:Object.fromEntries(FRONTS.map(f=>[f.id,f.name])),formation:{ace_11:'Singleback Ace'}}};
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');let template=readFileSync(resolve(root,'viewer/replay.template.html'),'utf8');
const replace=(from:string,to:string)=>{if(!template.includes(from))throw new Error(`Missing viewer marker: ${from.slice(0,70)}`);template=template.replace(from,to);};
replace("key === 'game' ? `Game ${Number(value) + 1} · seed ${games[value].seed}`","key === 'game' ? games[value].label");
replace("${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}",'${esc(p.id)} · ${esc(p.sourceLabel)}');
replace("$('dd').textContent = `${ord[p.down] || p.down + 'th'} & ${100 - p.yl <= p.dist ? 'Goal' : p.dist} · ${yl(p.yl)}`;","$('dd').textContent = 'Controlled OL work exchange comparison';");
replace("inspectorStamp = '';\n    prepareTelemetry(p);","$('inspect-player').value=String(p.inspectedLineman);\n    inspectorStamp = '';\n    prepareTelemetry(p);");
replace('<details class="inspector"><summary>Recorded event notes</summary>','<section class="inspector"><h2>Work exchange: picture, job and movement</h2><small class="status-note">Only actual exchanges are recorded here. An intended job does not prove a successful block. Physical motion follows the completed native tick. Forces: kg·yd/s²; impulses: kg·yd/s; work: kg·yd²/s². Joint IDs are local to each recorded play/source.</small><div id="work-exchanges" class="detail-list"></div></section><details class="inspector"><summary>Recorded event notes</summary>');
replace('if (stamp === inspectorStamp) return;',"if (stamp === inspectorStamp) return;\n    inspectWorkExchange(p,player,t);");
replace('  function drawLayers(p, frame, positions, X, Y, sc, selected) {',`  function inspectWorkExchange(p,player,time){
    const panel=$('work-exchanges'),slot=p.roster[player]?.[1];panel.dataset.fixture=p.id;panel.dataset.time=String(time);panel.dataset.slot=slot??'';
    const row=p.exchanges.findLast(r=>r.t<=time+1e-8&&r.participants.includes(slot));
    if(!row){panel.textContent='No exchange reached for '+(slot??'this player')+'. '+p.exchanges.length+' actual exchanges recorded in this play.';return;}
    const f=n=>typeof n==='number'?n.toFixed(2):'unrecorded',v=a=>a?f(a.x)+', '+f(a.y):'unrecorded',job=s=>s?.plan?(s.plan.kind+' → '+(s.plan.target??'none')+' · drive '+v(s.plan.drive)):'unassigned';
    const before=row.before.find(s=>s.slot===slot),after=row.afterDecision.find(s=>s.slot===slot);
    const lines=['Exchange at '+f(row.t)+'s initiated by '+row.observer+': '+row.participants.join(' ↔ '),
      slot+' before: '+job(before),slot+' at decision: '+job(after),
      'At event emission, participant bodies '+(row.physicalStateUnchangedAtDecision?'unchanged':'changed')+'; physical joints '+(row.physicalJointsUnchangedAtDecision?'unchanged':'changed')];
    const own=row.consumedImages.filter(c=>c.observer===slot);
    if(!own.length)lines.push('No consumed visual image recorded for '+slot+' during this exchange.');
    for(const cue of own){const img=cue.image;lines.push('Actual observer '+cue.observer+' saw '+cue.target+': age '+f(img.age)+'s · observed depth '+f(img.pos.x-p.los)+' yd · position '+v(img.pos)+' yd · velocity '+v(img.vel)+' yd/s');}
    const other=row.consumedImages.filter(c=>c.observer!==slot);
    if(other.length)lines.push('Other actual observers in this update: '+[...new Set(other.map(c=>c.observer))].join(', '));
    if(row.afterUpdate){const state=row.afterUpdate.find(s=>s.slot===slot);lines.push('After initiator update: '+job(state));}
    if(row.physicsStepRecorded&&row.completedAt<=time+1e-8){
      const state=row.afterPhysics.find(s=>s.slot===slot),load=row.loads.find(s=>s.slot===slot);
      lines.push('Completed native tick at '+f(row.completedAt)+'s: '+job(state),
        'Achieved center '+v(state.physical.pos)+' yd · velocity '+v(state.physical.vel)+' yd/s · support '+state.physical.support.state,
        'Applied velocity intention '+v(load.appliedIntent.vel)+' yd/s · ground impulse '+v(load.groundImpulse),
        'Arm impulse '+f(load.armImpulse)+' / '+f(load.armImpulseLimit)+' · arm work '+f(load.armWork)+' / '+f(load.armWorkLimit),
        'Support motor work '+f(load.supportMotorWork)+' / '+f(load.supportMotorWorkLimit)+' · physical contacts '+load.physicalContacts.length+' · surviving hand joints '+load.liveHandsAfterPhysics.length);
      for(const j of load.liveHandsAfterPhysics)lines.push('Actual hands #'+j.id+' '+j.a+' ↔ '+j.b+' · normal/tangent force '+f(j.state.normalForce)+' / '+f(j.state.tangentForce));
    }else lines.push('The following physical tick has not completed at this visual time.');
    panel.innerHTML=lines.map(line=>'<div>'+esc(line)+'</div>').join('');
  }

  function drawLayers(p, frame, positions, X, Y, sc, selected) {`);
template=template.replaceAll('All games','Both recorded sources');
const marker='/*__REPLAY_DATA__*/null';if(!template.includes(marker))throw new Error('Missing replay data marker');
const html='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  +template.replace(marker,()=>JSON.stringify(data).replace(/<\//g,'<\\/'))+'\n</body></html>\n';
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,html);
console.log(JSON.stringify({output,clips:plays.length,bytes:Buffer.byteLength(html),sources:comparisons.map(c=>c.sourceSha256)},null,2));
