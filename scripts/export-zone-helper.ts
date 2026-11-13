/** Export five predeclared saved inputs; never runs the simulation or filters outcomes.
 * node --import tsx scripts/export-zone-helper.ts BEFORE-film.json.gz AFTER-film.json.gz OUTPUT.html
 * Each film's *-film.json.gz companion is *.json.gz from combo-transfer-review.ts.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { FRONTS, FRONT_BY_ID } from '../src/playbook/defense.js';
import { packReplayPlay } from './replay-data.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';

// These are archival diagnostic records, separate from the engine's typed state.
type RecordRow = Record<string, any>;
const fixed = ['CT-R1-iz_strong-over-R-S3', 'CT-R1-iz_strong-over-L-S3',
  'CT-R1-split_zone-tite-R-S3', 'CT-R1-split_zone-tite-L-S3', 'CT-R1-duo-odd-R-S11'];
const controlId = fixed[4], helperWitnessId=fixed[2], helperWitnessTime=1.25;
const labels = ['Baseline: installed zone doubles', 'Candidate: uncovered helper checks his work'];
const [beforePath, afterPath, output] = process.argv.slice(2);
if (process.argv.length !== 5 || !beforePath.endsWith('-film.json.gz') || !afterPath.endsWith('-film.json.gz') || !output.endsWith('.html'))
  throw new Error('Usage: export-zone-helper.ts BEFORE-film.json.gz AFTER-film.json.gz OUTPUT.html');
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const read = (p: string): RecordRow => JSON.parse(gunzipSync(readFileSync(p)).toString());
const phases = [beforePath, afterPath].map(path => {
  const reportPath = path.replace(/-film\.json\.gz$/, '.json.gz');
  const film = read(path), report = read(reportPath);
  const selected = fixed.map(id => film.plays.find((p: RecordRow) => p.id === id));
  return {path, reportPath, film, report, selected};
});
for (const {film, report, selected} of phases) {
  if (film.schema !== 'combo-transfer-film-v1' || report.schema !== 'combo-transfer-review-v1'
    || !/^[a-f0-9]{64}$/.test(film.sourceBefore) || film.sourceBefore !== film.sourceAfter
    || film.sourceBefore !== report.sourceBefore || report.sourceBefore !== report.sourceAfter
    || film.collectorSha256 !== report.collectorSha256 || report.trials.length !== 160
    || report.supplementalTrials.length !== 2 || report.summary.snaps !== 160
    || [...report.trials, ...report.supplementalTrials].some(r => !r.observerVerified || r.observedSignature !== r.plainSignature))
    throw new Error('Expected fixed 160+2 panel and neutral observer/recording controls');
  for (const p of selected) {
    const row = p && report.trials.find((r: RecordRow) => r.id === p.id);
    if (!p || !row || p.selection !== 'fixed-before-outcomes' || p.roster !== 0 || p.players.length !== 22
      || p.result.outcome === 'timeout' || !row.naturalEnd || p.result.telemetry?.level !== 'full'
      || p.result.frames?.[0]?.t !== 0 || !p.trace.length || p.trace[0].t !== 0
      || p.trace.at(-1).phase !== 'dead' || Math.abs(p.trace.at(-1).t + .05 - p.result.duration) > 1e-8
      || hash({...p.result, frames:undefined, telemetry:undefined}) !== hash(row.result))
      throw new Error(`Invalid predeclared saved input: ${p?.id}`);
  }
}
if (phases[0].film.sourceBefore === phases[1].film.sourceBefore
  || phases[0].film.collectorSha256 !== phases[1].film.collectorSha256
  || hash(phases[0].report.cohort) !== hash(phases[1].report.cohort)
  || phases[0].report.moduleSha256['src/physics/world.ts'] !== phases[1].report.moduleSha256['src/physics/world.ts'])
  throw new Error('Expected distinct controller sources with identical cohort, collector and shared World');
const inputRows=phases.map(({report})=>[...report.trials,...report.supplementalTrials]);
for (let i=0;i<162;i++) for (const key of ['id','initialSha256','profileSha256'])
  if (inputRows[0][i][key] !== inputRows[1][i][key]) throw new Error(`Panel input mismatch: ${i}/${key}`);
for (let i=0;i<fixed.length;i++) {
  const a=phases[0].selected[i], b=phases[1].selected[i];
  for (const key of ['id','roster','run','front','flip','seed','selection','offCall','defCall','los','firstDownX','players'])
    if (hash(a[key]) !== hash(b[key])) throw new Error(`Fixed input mismatch: ${a.id}/${key}`);
  for (const key of ['agents','ball','carrier','carrierPosture'])
    if (hash(a.result.frames[0][key]) !== hash(b.result.frames[0][key])) throw new Error(`Initial replay mismatch: ${a.id}/${key}`);
}
const controls=phases.map(({report})=>report.trials.find((r:RecordRow)=>r.id===controlId));
if (controls[0].observedSignature !== controls[1].observedSignature)
  throw new Error('The predeclared Duo negative control changed execution');
const controlFilms=phases.map(({selected})=>selected.find((p:RecordRow)=>p.id===controlId));
for(const key of ['result','trace'])if(hash(controlFilms[0][key])!==hash(controlFilms[1][key]))
  throw new Error(`The predeclared Duo control changed its archived ${key}`);

function initialCombinations(row: RecordRow): RecordRow[] {
  const combos = new Map<number, RecordRow>();
  // Snap reaction can leave trace[0].updates empty. The frozen input projection
  // retains every installed RunBlocker, including TEs, before any update.
  for (const s of row.initialProjection.ownership) {
    const c=s.plan?.combination;if(c&&!combos.has(c.id))combos.set(c.id,c);
  }
  if(!combos.size)throw new Error(`No installed double recorded for ${row.id}`);
  return [...combos.values()];
}
function nativeTrace(p: RecordRow, combos: RecordRow[]) {
  const slots=new Set<string>(combos.flatMap(c=>c.members));
  const controllerBody=(s:RecordRow)=>({slot:s.slot,pos:s.pos,vel:s.vel,plan:s.plan});
  const controllerPlan=(s:RecordRow)=>({slot:s.slot,plan:s.plan});
  // Copy each physical tick once. Controller rows retain their own bodies,
  // images and intended jobs, rather than duplicating whole-team state.
  return p.trace.map((tick:RecordRow)=>({t:tick.t,completedAt:tick.t+.05,
    members:tick.after.filter((s:RecordRow)=>slots.has(s.slot)),
    loads:tick.deliveredStep.filter((s:RecordRow)=>slots.has(s.slot)),
    reads:tick.updates.filter((u:RecordRow)=>slots.has(u.observer)).map((u:RecordRow)=>{
      const installed=combos.find(c=>c.members[1]===u.observer);
      const owner=installed?.members[0],defender=u.beforeBody.plan?.combination?.defender??installed?.defender;
      const helperVisualCheck=!!installed&&u.consumedImages.some((c:RecordRow)=>c.target===owner)
        &&u.consumedImages.some((c:RecordRow)=>c.target===defender);
      const actualClimb=u.events.some((e:RecordRow)=>e.type==='block_climb');
      const solved=[...tick.updates].reverse().find((r:RecordRow)=>r.afterSolvedOwnership)?.afterSolvedOwnership;
      const keeperContact=installed&&(helperVisualCheck||actualClimb)?{
        owner,defender,actualClimb,completedAt:tick.t+.05,
        before:u.before.find((s:RecordRow)=>s.slot===owner)?.engagement??null,
        after:u.after.find((s:RecordRow)=>s.slot===owner)?.engagement??null,
        solvedOwnershipRecorded:!!solved,
        afterPhysics:solved?.find((s:RecordRow)=>s.slot===owner)?.engagement??null,
      }:null;
      return {
      t:u.t,observer:u.observer,classification:u.classification,legacyCombinationRead:u.combinationRead,
      helperVisualCheck,keeperContact,
      beforeBody:controllerBody(u.beforeBody),afterBody:controllerBody(u.afterBody),
      ownerBefore:u.before.filter((s:RecordRow)=>combos.some(c=>c.members[1]===u.observer&&c.members[0]===s.slot)).map(controllerPlan),
      ownerAfter:u.after.filter((s:RecordRow)=>combos.some(c=>c.members[1]===u.observer&&c.members[0]===s.slot)).map(controllerPlan),
      oldCombinationAfter:u.oldCombinationAfter,requested:u.requested,consumedImages:u.consumedImages,events:u.events,
    };}),
    nonOLAfterPhysics:[...tick.updates].reverse().find((u:RecordRow)=>u.afterSolvedOwnership)?.afterSolvedOwnership
      ?.filter((s:RecordRow)=>slots.has(s.slot)&&!['LT','LG','C','RG','RT'].includes(s.slot))??[],
  }));
}
const comparisons=phases.map(({path,reportPath,film,report},i)=>({label:labels[i],sourceSha256:film.sourceBefore,
  collectorSha256:film.collectorSha256,cohortSha256:hash(report.cohort),inputRawSha256:fileHash(path),
  panelRawSha256:fileHash(reportPath),moduleSha256:report.moduleSha256,
  observerChecks:report.trials.filter((r:RecordRow)=>fixed.includes(r.id)).map((r:RecordRow)=>({
    id:r.id,initialSha256:r.initialSha256,profileSha256:r.profileSha256,
    observedSignature:r.observedSignature,plainSignature:r.plainSignature}))}));
const plays=phases.flatMap(({film,report,selected},game)=>selected.map((p:RecordRow,index:number)=>{
  const row=report.trials.find((r:RecordRow)=>r.id===p.id), combos=initialCombinations(row);
  const initialHelper=p.id===helperWitnessId?'RT':combos.find(c=>c.members[0]==='C')?.members[1]??combos[0]?.members[1]??'C';
  const log:PlayLog={index,quarter:0,clock:0,offense:'OFF',down:1,distance:10,yardline:p.los-10,
    score:{home:0,away:0},kind:'run',yards:p.result.offenseYards,call:`${labels[game]} · ${p.offCall}`,
    defense:p.defCall,stats:p.result.stats,outcome:p.result.outcome,
    text:`${labels[game]} · ${p.id} · source ${film.sourceBefore.slice(0,12)} · predeclared fixed input · natural ${p.result.outcome} at ${p.result.duration.toFixed(2)}s. ${p.id===controlId?'Duo negative control: complete execution is unchanged. ':''}${p.id===helperWitnessId?'Predeclared focus: RT at 1.25s, with Y staying on DE_S. ':''}Select an original uncovered helper to inspect the images he actually consumed, his intended job, the actual keeper and completed physical movement. New helpPolicy/checkSince/checkNextRead state was not recorded. Legacy nextRead does not identify a helper visual check; consumed owner+DL images do. A climb decision does not prove a successful block.`,
    plan:{personnel:row.formation==='gun_wing_12'?'12':'11',formation:row.formation,qb:row.formation==='gun_wing_12'?'gun':'under',
      concept:RUN_BY_ID[p.run].scheme,playAction:false,audible:false,defPersonnel:FRONT_BY_ID[p.front].personnel[0],
      front:p.front,coverage:'cover3',called:'cover3',family:'cover3',shell:'one-high',pressure:false},
    replay:{los:p.los,firstDownX:p.firstDownX,flip:p.flip,frames:p.result.frames,events:p.result.events,telemetry:p.result.telemetry,
      players:p.players.map((a:RecordRow)=>({team:a.team,slot:a.slot,name:a.name,jersey:a.jersey,pos:a.position,weightLb:a.weightLb})),
      profiles:p.players.map((a:RecordRow)=>({position:a.position,heightIn:a.heightIn,weightLb:a.weightLb,ratings:a.ratings}))}};
  return {...packReplayPlay(log,game),id:`${game?'FINAL':'BEFORE'}-${p.id}`,fixtureId:p.id,sourceLabel:labels[game],sourceSha256:film.sourceBefore,
    fixtureRun:p.run,fixtureSeed:p.seed,fixtureFlip:p.flip,filmSelection:p.selection,negativeControl:p.id===controlId,
    initialSha256:row.initialSha256,profileSha256:row.profileSha256,physicalSha256:row.observedSignature,recordingVerified:true,
    naturalResult:{...p.result,frames:undefined,telemetry:undefined},eventDetails:p.result.events,recordedPlayers:p.players,
    initialCombinations:combos,helperTrace:nativeTrace(p,combos),inspectedLineman:p.players.findIndex((a:RecordRow)=>a.slot===initialHelper)};
}));
const data={meta:{sourceSha256:phases[1].film.sourceBefore,sourceComparison:comparisons,telemetryLevel:'full',
  filmSchema:'zone-helper-comparison-v1',predeterminedInputs:fixed,negativeControl:controlId,
  helperWitness:{fixture:helperWitnessId,slot:'RT',t:helperWitnessTime},seed:3,
  cohort:'Ten fixed clips: Inside Zone / Over R+L S3, Split Zone / Tite R+L S3, and Duo / Odd R S11 negative control; roster seeds31/32 at strength0.55. Five inputs selected before candidate outcomes. The full 160+2 panel retains adverse pairs. All 324 observer/plain controls match. This small film set is not an NFL sample. Native body/load records cover the five OL slots; TE ownership may be retained but missing TE body/load is unrecorded. helpPolicy/checkSince/checkNextRead were not recorded; legacy nextRead bookkeeping does not establish a helper visual check or exact private projection interval. Consumed owner+DL pictures establish a visual check. Original post-physics replay frames retain tick-start timestamps; the native completedAt gate trails the pictured state by one tick and excludes the final +0.05s solve from the current seek range.',
  final:{home:0,away:0},quarters:[],home:{name:'Controlled Offense',abbr:'OFF',color:'#1d4f91',text:'#fff'},away:{name:'Controlled Defense',abbr:'DEF',color:'#a3302a',text:'#fff'}},
  games:phases.map(({film},i)=>({label:labels[i],seed:3,sourceSha256:film.sourceBefore,final:{home:0,away:0},quarters:[]})),
  plays:compactReplayPlays(plays),catalog:{coverage:{cover3:'Cover 3'},front:Object.fromEntries(FRONTS.map(f=>[f.id,f.name])),formation:{ace_11:'Singleback Ace',gun_wing_12:'Gun Wing 12'}}};
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');let template=readFileSync(resolve(root,'viewer/replay.template.html'),'utf8');
const replace=(from:string,to:string)=>{if(!template.includes(from))throw new Error(`Missing viewer marker: ${from.slice(0,60)}`);template=template.replace(from,to);};
replace("key === 'game' ? `Game ${Number(value) + 1} · seed ${games[value].seed}`","key === 'game' ? games[value].label");
replace("${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}",'${esc(p.id)} · ${esc(p.sourceLabel)}');
replace("$('dd').textContent = `${ord[p.down] || p.down + 'th'} & ${100 - p.yl <= p.dist ? 'Goal' : p.dist} · ${yl(p.yl)}`;","$('dd').textContent = 'Controlled uncovered-helper comparison';");
replace("inspectorStamp = '';\n    prepareTelemetry(p);","$('inspect-player').value=String(p.inspectedLineman);\n    inspectorStamp = '';\n    prepareTelemetry(p);");
replace('<details class="inspector"><summary>Recorded event notes</summary>','<section class="inspector"><h2>Uncovered helper: picture, support and next work</h2><small class="status-note">Original combo roles are installed assignments; the keeper is the actual engagement owner. Forces: kg·yd/s²; impulses: kg·yd/s; work: kg·yd²/s². Joint IDs are local to each play/source. New helpPolicy/checkSince/checkNextRead and TE native body/load rows are unrecorded. Legacy nextRead does not prove a helper check or exact projection interval. Consumed owner+DL images establish a visual check. Original post-physics frames retain tick-start stamps. Native loads shown only after completedAt trail pictured bodies by one tick; the final +0.05s solve is outside the current seek range.</small><div id="zone-helper" class="detail-list"></div></section><details class="inspector"><summary>Recorded event notes</summary>');
replace('if (stamp === inspectorStamp) return;','inspectZoneHelper(p,player,t);\n    if (stamp === inspectorStamp) return;');
replace('  function drawLayers(p, frame, positions, X, Y, sc, selected) {',`  function inspectZoneHelper(p,player,time){
    const panel=$('zone-helper'),slot=p.roster[player]?.[1];panel.dataset.fixture=p.id;panel.dataset.time=String(time);panel.dataset.slot=slot??'';
    const combo=p.initialCombinations.find(c=>c.members.includes(slot));
    if(!combo){panel.textContent='No installed double for '+(slot??'this player')+'. Select an original uncovered helper.';return;}
    const f=n=>typeof n==='number'?n.toFixed(2):'unrecorded',v=a=>a?f(a.x)+', '+f(a.y):'unrecorded',job=s=>s?.plan?(s.plan.kind+' → '+(s.plan.target??'none')):'unrecorded';
    const tick=p.helperTrace.findLast(t=>t.t<=time+1e-8),read=tick?.reads.find(r=>r.observer===slot);
    const solved=p.helperTrace.findLast(t=>t.completedAt<=time+1e-8),body=solved?.members.find(s=>s.slot===slot),load=solved?.loads.find(s=>s.slot===slot);
    const member=body??solved?.nonOLAfterPhysics.find(s=>s.slot===slot),all=[...(solved?.members??[]),...(solved?.nonOLAfterPhysics??[])];
    const e=all.map(s=>s.engagement).find(e=>e&&e.defender===combo.defender);
    const lines=['Installed double #'+combo.id+': owner '+combo.members[0]+' + original uncovered helper '+combo.members[1]+' versus '+combo.defender+'; second-level work '+(combo.backer??'none')];
    if(read){lines.push('Own update '+f(read.t)+'s: '+slot+' '+job(read.beforeBody)+' → '+job(read.afterBody)+' · '+read.classification,
      'Requested velocity '+v(read.requested?.vel)+' yd/s; body before/after update '+v(read.beforeBody.pos)+' → '+v(read.afterBody.pos)+' yd');
      const keys=new Set([combo.members[0],combo.defender,combo.backer,read.afterBody.plan?.target,read.afterBody.plan?.climbTo]);
      const own=read.consumedImages.filter(c=>keys.has(c.target));
      if(!own.length)lines.push('No consumed owner/DL/backer image recorded in this own update.');
      for(const cue of own){const img=cue.image;lines.push('Actual observer '+read.observer+' saw '+cue.target+': age '+f(img.age)+'s · observed depth '+f(img.pos.x-p.los)+' yd · velocity '+v(img.vel)+' yd/s');}
      lines.push(read.helperVisualCheck?'Helper visual check proved by consumed owner+DL pictures in this own update.':'No owner+DL helper check demonstrated in this own update.');
      for(const event of read.events)lines.push('Actual event '+event.type+': '+(p.roster[event.a]?.[1]??'unrecorded')+' → '+(p.roster[event.b]?.[1]??'unrecorded')+' at '+f(event.t)+'s');
    }else lines.push('No own controller update reached for '+slot+'.');
    const evidence=p.helperTrace.flatMap(t=>t.reads).findLast(r=>r.observer===slot&&r.t<=time+1e-8&&r.keeperContact);
    if(evidence){const k=evidence.keeperContact,b=k.before,a=k.after;
      lines.push('Recorded keeper at helper decision '+f(evidence.t)+'s: '+(a?.blocker??'none')+' on '+(a?.defender??'none')+' (installed defender '+k.defender+') · native hands before/after #'+(b?.hands?.id??'none')+' / #'+(a?.hands?.id??'none'));
      if(k.completedAt<=time+1e-8){const n=k.afterPhysics;lines.push(k.solvedOwnershipRecorded?
        'Following native solve at '+f(k.completedAt)+'s: keeper '+(n?.blocker??'none')+' on '+(n?.defender??'none')+' · native hands #'+(n?.hands?.id??'none')+' · '+(n?.hands?.live?'live':'no live hands recorded')+' · normal/tangent force '+f(n?.hands?.normalForce)+' / '+f(n?.hands?.tangentForce):
        'Following native keeper ownership unrecorded for this decision.');
      }else lines.push('Following native solve for this decision has not completed at this visual time.');
    }
    if(e){lines.push('Actual keeper '+e.blocker+' on '+e.defender+' · helpers '+(e.helpers.join(', ')||'none')+' · control '+f(e.control)+' · native axis '+v(e.axis));
      for(const m of e.members)lines.push(m.slot+' support availability '+f(m.supportAvailability)+' · helper support '+f(m.helperSupport)+' · normalized surfacePhi '+f(m.surfacePhi)+' (quarter-turn units)');
      for(const j of [e.hands,...e.helperHands.map(h=>h.joint)].filter(Boolean))lines.push('Native hands #'+j.id+' '+j.a+' ↔ '+j.b+' · '+(j.live?'live':'removed')+' · normal/tangent force '+f(j.normalForce)+' / '+f(j.tangentForce));
    }else lines.push('No surviving native engagement on original '+combo.defender+' recorded among the installed members at the last completed physical tick.');
    if(solved&&body&&load){lines.push('Completed native tick at '+f(solved.completedAt)+'s: '+slot+' '+job(member),
      'Achieved center '+v(body.pos)+' yd · velocity '+v(body.vel)+' yd/s · support '+(body.support?.state??'unrecorded'),
      'Applied velocity intention '+v(load.appliedIntent?.vel)+' yd/s · ground impulse '+v(load.groundImpulse),
      'Arm impulse '+f(load.armImpulse)+' / '+f(load.armImpulseLimit)+' · arm work '+f(load.armWork)+' / '+f(load.armWorkLimit),
      'Support motor work '+f(load.supportMotorWork)+' / '+f(load.supportMotorWorkLimit)+' · contacts '+load.physicalContacts.length+' · surviving hand joints '+load.liveHandsAfterPhysics.length);
    }else lines.push(solved?'Native body/load unrecorded for '+slot+'; ownership '+job(member):'No physical tick completed at this visual time.');
    panel.innerHTML=lines.map(line=>'<div>'+esc(line)+'</div>').join('');
  }

  function drawLayers(p, frame, positions, X, Y, sc, selected) {`);
template=template.replaceAll('All games','Both recorded sources');
const marker='/*__REPLAY_DATA__*/null';if(!template.includes(marker))throw new Error('Missing replay data marker');
const html='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  +template.replace(marker,()=>JSON.stringify(data).replace(/<\//g,'<\\/'))+'\n</body></html>\n';
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,html);
console.log(JSON.stringify({output,clips:plays.length,bytes:Buffer.byteLength(html),fixedInputs:fixed,sources:comparisons.map(c=>c.sourceSha256),negativeControlExact:true},null,2));
