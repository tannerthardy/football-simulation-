/** Observation only: complete called-dropback funnel plus consumed QB pressure.
 * native OUT ROSTER GAME CACHE_ROOT; replay INPUTS OUT.
 * No new see, evaluate, RNG or World calls. Source/flags must be the baseline.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {Rng} from '../../src/core/rng.ts';
import {Game} from '../../src/game/game.ts';
import {generateTeam} from '../../src/league/team.ts';
import {PlaySim} from '../../src/sim/playsim.ts';
import {QBPass} from '../../src/sim/behaviors/qb.ts';
import {ScoutingReport} from '../../src/sim/recognition.ts';
import {CoverageScouting} from '../../src/sim/qbmind.ts';
import {sourceVersion} from '../source-version.ts';

const copy=x=>structuredClone(x),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fileHash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
assert.equal(sourceVersion(),profile.sourceSha256);
const flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
assert.deepEqual(flags,profile.flags);
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 sourceSha256:sourceVersion(),collectorSha256:fileHash(import.meta.filename),flags,
 worldDefaults:profile.worldDefaults,node:process.version,startedAt:new Date().toISOString()};
function signature(sim,result){return hash({result:{...result,frames:undefined,telemetry:undefined},
 bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception});}
const number=x=>Number.isFinite(x)?x:null;
function engagement(e){return e?{blocker:e.blocker.idx,defender:e.defender.idx,kind:e.kind,win:e.win,
 move:e.move,moveOk:e.moveOk,moveUntil:e.moveUntil,
 hands:e.hands?{normalForce:e.hands.normalForce,tangentForce:e.hands.tangentForce,
 push:e.hands.push}:null}:null;}
function actors(sim){return sim.agents.map(a=>({i:a.idx,pos:{...a.pos},vel:{...a.vel},facing:a.facing,
 behavior:a.behavior.kind,plan:typeof a.behavior.plan==='string'?a.behavior.plan:undefined,
 protectionTarget:a.behavior.coord?.assigned.get(a)?.idx??null,tags:[...a.tags],down:a.isDown(sim.t),
 support:a.body.support?{state:a.body.support.state,cause:a.body.support.cause}:null,
 energy:a.body.energy,speedScale:a.speedScale,engagement:engagement(a.engagement)}));}
const dist=(a,b)=>Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y);
function near(sim){return sim.defense.map(d=>({i:d.idx,id:d.player.id,slot:d.slot,dist:dist(d,sim.qb),
 down:d.isDown(sim.t),engagement:engagement(d.engagement)})).sort((a,b)=>a.dist-b.dist);}
function observe(sim){
 const steps=[],frames=[],qbBehavior=sim.qb.behavior,restore=[],pressureCalls=[];
 let step=null,pressureCall=null;
 const tick=sim.tick,see=sim.see;
 sim.see=function(a,r,...rest){const v=see.call(this,a,r,...rest);
  if(pressureCall&&a===sim.qb)pressureCall.pictures.push({i:r.idx,picture:copy(v)});return v;};
 restore.push(()=>sim.see=see);
 if(qbBehavior instanceof QBPass){
  const pressure=qbBehavior.pressure;
  qbBehavior.pressure=function(a,s){
   const c={t:s.t,phase:this.recordedState().phase,pictures:[]};pressureCall=c;
   try{const p=pressure.call(this,a,s);Object.assign(c,{time:number(p.time),i:p.agent?.idx??null,
    dist:number(p.dist),engagement:engagement(p.agent?.engagement)});pressureCalls.push(c);step?.pressure.push(c);return p;}
   finally{pressureCall=null;}
  };restore.push(()=>qbBehavior.pressure=pressure);
  const evaluate=qbBehavior.evaluate;
  qbBehavior.evaluate=function(a,s,r,u){const e=evaluate.call(this,a,s,r,u);
   step?.evaluations.push({i:r.idx,urgency:u,result:e?{i:e.target.idx,point:copy(e.point),T:e.T,P:e.P,intRisk:e.intRisk,value:e.value,depth:e.depth}:null});return e;};
  restore.push(()=>qbBehavior.evaluate=evaluate);
 }
 for(const a of sim.agents){
  const b=a.behavior;if(!['rush','blitz','pass-pro','qb-pass'].includes(b.kind))continue;
  const update=b.update;b.update=function(actor,s){const c=update.call(this,actor,s);if(step)step.raw.push({i:actor.idx,
   protectionTarget:this.coord?.assigned.get(actor)?.idx??null,command:copy(c)});return c;};
  restore.push(()=>b.update=update);
 }
 sim.tick=function(){
  const t=this.t,pocket=this.throwAt<0&&!this.scrambled&&this.carrier===this.qb;
  step=pocket?{t,before:actors(this),nearest:near(this),qb:qbBehavior instanceof QBPass?copy(qbBehavior.recordedState()):null,
   pressure:[],evaluations:[],raw:[]}:null;
  const returned=tick.call(this);
  frames.push({t,agents:this.agents.flatMap(a=>[Math.round(a.pos.x*10)/10,Math.round(a.pos.y*10)/10,Math.round(a.facing*10)/10])});
  if(step){step.after=actors(this);step.applied=copy(this.intents);step.nearestAfter=near(this);
   step.qbAfter=qbBehavior instanceof QBPass?copy(qbBehavior.recordedState()):null;steps.push(step);}
  step=null;return returned;
 };
 restore.push(()=>sim.tick=tick);
 return {steps,frames,pressureCalls,restore(){for(const f of restore.reverse())f();}};
}
function extract(sim,result,obs){
 const endpoint=result.events.find(e=>['throw','throwaway','sack','scramble','fumble'].includes(e.type));
 const end=endpoint?.t??Math.min(result.duration,25);
 const eligible=obs.steps.filter(s=>s.t>=.5&&s.t<=end);
 const first50=eligible.find(s=>s.nearest[0]?.dist<=2);
 const firstBefore=eligible.find(s=>s.t<end&&s.nearest[0]?.dist<=2);
 const first25=eligible.find(s=>s.t<end&&s.nearest[0]?.dist<=2.5);
 const sensed=obs.pressureCalls.find(p=>p.time!==null&&p.time<.7);
 const imminent=obs.pressureCalls.find(p=>p.time!==null&&p.time<.45);
 const release=result.events.find(e=>['throw','throwaway'].includes(e.type));
 const drop=result.stats.scramble?'scramble':result.stats.sacked?'sack':release?result.stats.throwaway?'throwaway':'throw':
  result.outcome==='timeout'?'unfinished':'other';
 return {endpoint:endpoint??null,pocketEnd:end,kind:drop,release:release?.t??null,
  first2Exact:first50?{t:first50.t,...first50.nearest[0],qbPhase:first50.qb?.phase}:null,
  first2Strict:firstBefore?{t:firstBefore.t,...firstBefore.nearest[0],qbPhase:firstBefore.qb?.phase}:null,
  first25Strict:first25?{t:first25.t,...first25.nearest[0],qbPhase:first25.qb?.phase}:null,
  firstSensed:sensed?{t:sensed.t,time:sensed.time,i:sensed.i,phase:sensed.phase,dist:sensed.dist}:null,
  firstImminent:imminent?{t:imminent.t,time:imminent.time,i:imminent.i,phase:imminent.phase,dist:imminent.dist}:null,
  nativePressure:result.stats.pressured,pressureToEndpoint:firstBefore?end-firstBefore.t:null,
  qbDepthAtRelease:release?sim.los-obs.steps.find(s=>s.t===release.t)?.before[sim.qb.idx].pos.x:null,
  minBefore:Math.min(...eligible.filter(s=>s.t<end).map(s=>s.nearest[0]?.dist??Infinity)),
  distinctReads:[...new Set(obs.steps.map(s=>s.qb?.read).filter(i=>i!==null&&i!==undefined))],
  initialRushers:sim.defense.filter(d=>['rush','blitz'].includes(obs.steps[0]?.before[d.idx].behavior)).map(d=>d.idx),
  steps:obs.steps.length};
}
function runRecorded(sim){const obs=observe(sim);let result;
 try{result=sim.run();}finally{obs.restore();}
 return {result,signature:signature(sim,result),measurement:extract(sim,result,obs),
  players:sim.agents.map(a=>({i:a.idx,id:a.player.id,team:a.team,slot:a.slot,position:a.player.position,profile:a.profile})),
  steps:obs.steps,frames:obs.frames};
}
function saveFilm(out,id,film){const path=join(out,`${id}.json.gz`);writeFileSync(path,gzipSync(JSON.stringify(film)));return {path,sha256:fileHash(path)};}
function restoreSetup(s){let scouting,coverageScouting;
 if(s.scouting){scouting=new ScoutingReport(s.scouting.strength);scouting.cells=new Map(copy(s.scouting.cells));}
 if(s.coverageScouting)coverageScouting=Object.assign(new CoverageScouting(),copy(s.coverageScouting));
 return new PlaySim({...copy(s),energy:s.energy?new Map(s.energy):undefined,scouting,coverageScouting,record:false});
}
const [mode,path,...args]=process.argv.slice(2),started=performance.now();
assert.ok(mode==='native'||mode==='replay');
const out=mode==='native'?path:args[0];mkdirSync(out,{recursive:true});
let packet;
if(mode==='native'){
 const [rosterText,seedText,cacheRoot]=args,cohort=Number(rosterText),seed=Number(seedText);
 assert.ok(Number.isSafeInteger(cohort)&&Number.isSafeInteger(seed));
 const cached=JSON.parse(readFileSync(join(cacheRoot,`out/catch-pursuit/native${cohort}.json`),'utf8'));
 assert.equal(cached.provenance.sourceSha256,provenance.sourceSha256);assert.deepEqual(cached.provenance.flags,flags);
 const rng=new Rng(cohort),home=generateTeam(rng,'Ironmen','IRN',{strength:.55}),away=generateTeam(rng,'Comets','COM',{strength:.55}),rows=[];
 let game,offCall,defCall,prefs;
 game=new Game(home,away,{seed,record:false,hooks:{playResult(sim,kind){
  if(performance.now()-started>60000)throw Error('Declared 60-second native game budget exceeded');
  if(kind!=='scrimmage'||!sim.isPass)return undefined;
  const id=`R${cohort}-S${seed}-P${game.playIndex+1}`,off=sim.qb.player.id.startsWith(home.abbr)?'home':'away',def=off==='home'?'away':'home';
  const scouting=game.scouting[def],coverageScouting=game.coverageScouting[off];
  const setup=copy({offense:Object.fromEntries(sim.offense.map(a=>[a.slot,a.player])),defense:Object.fromEntries(sim.defense.map(a=>[a.slot,a.player])),
   offCall,defCall,manPrefs:prefs,los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX,seed:sim.rng.key,
   energy:[...game.energy],hurry:sim.hurry,down:sim.snapContext.down,audibles:true,
   scouting:{strength:scouting.strength,cells:[...scouting.cells]},coverageScouting:{...coverageScouting}});
  const film=runRecorded(sim),cachedClip=cached.clips.find(c=>c.id===id);
  if(cachedClip)assert.equal(film.signature,cachedClip.signature,`Saved full-state signature: ${id}`);
  rows.push({id,setup,result:film.result,signature:film.signature,measurement:film.measurement,
   effectiveConcept:sim.offCall.pass.id,effectiveCoverage:sim.defCall.coverage.id,pressureCall:sim.defCall.pressure?.id??null,
   effectiveDrop:sim.offCall.pass.drop,family:sim.offCall.pass.family,
   declaredRushers:film.measurement.initialRushers.map(i=>film.players[i]),
   savedSignatureMatched:cachedClip?true:null,film:saveFilm(out,id,film)});
  return film.result;
 }}});
 for(const oc of Object.values(game.oc)){const call=oc.call.bind(oc);oc.call=(...xs)=>{offCall=call(...xs);return offCall;};}
 for(const dc of Object.values(game.dc)){const call=dc.call.bind(dc);dc.call=(...xs)=>{const c=call(...xs);defCall=c.call;prefs=c.prefs;return c;};}
 const result=game.play();
 for(const row of rows){const log=result.log.find(p=>p.index+1===Number(row.id.split('-P')[1]));
  assert.ok(log);row.gameDisposition={nullified:log.nullified??false,penalty:log.penalty??null,call:log.call,defense:log.defense};}
 const population=rows.map(c=>({id:c.id,concept:c.effectiveConcept,coverage:c.effectiveCoverage,completed:c.result.stats.completed??false,
  outcome:c.result.outcome,flag:c.result.penalty??null,yac:c.result.stats.yac??null}));
 assert.deepEqual(population,cached.population,'Entire saved native called-dropback population');
 assert.equal(rows.filter(r=>r.savedSignatureMatched).length,cached.clips.length);
 packet={schema:'pass-rush-native-timing-v1',cohort,seed,strength:.55,score:result.score,provenance,
  savedEvidence:{path:resolve(cacheRoot,`out/catch-pursuit/native${cohort}.json`),sha256:fileHash(join(cacheRoot,`out/catch-pursuit/native${cohort}.json`)),
   exactPopulation:true,fullSignaturesMatched:cached.clips.length},gameLogPlays:result.log.length,rows};
}else{
 const inputs=JSON.parse(readFileSync(path,'utf8')),rows=[];
 for(const c of inputs.cases){
  const film=runRecorded(restoreSetup(c.setup)),plainSim=restoreSetup(c.setup),plain=plainSim.run(),plainSignature=signature(plainSim,plain);
  assert.equal(film.signature,plainSignature,`Observer neutrality: ${c.id}`);
  if(c.signature)assert.equal(film.signature,c.signature,`Native restoration: ${c.id}`);
  rows.push({id:c.id,selection:c.selection,result:film.result,measurement:film.measurement,signature:film.signature,plainSignature,
   observerNeutral:true,restorationExact:c.signature?true:null,film:saveFilm(out,c.id,film)});
 }
 packet={schema:'pass-rush-replay-neutrality-v1',provenance,inputs:{path:resolve(path),sha256:fileHash(path)},rows};
}
assert.equal(sourceVersion(),provenance.sourceSha256);packet.wallMs=performance.now()-started;
writeFileSync(join(out,'summary.json'),JSON.stringify(packet)+'\n');
console.log(JSON.stringify({out,mode,rows:packet.rows.length,wallMs:packet.wallMs,savedEvidence:packet.savedEvidence??null}));
