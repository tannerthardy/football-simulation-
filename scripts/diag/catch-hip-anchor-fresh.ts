/** Fresh generated players + native standalone calls, not games/roster sweep.
 * Two declared roster seeds x four prior source calls, all inputs retained.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {Rng} from '../../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../../src/league/team.js';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import {trial} from './catch-transition-study.js';
import {sourceVersion} from '../source-version.js';
const copy=<T>(x:T):T=>structuredClone(x),hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),
 fileHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const destination=process.argv[2];if(!destination)throw Error('OUTDIR required');mkdirSync(destination,{recursive:true});
const inputPath='data/reviews/current/catch-transition-inputs.json',packet=JSON.parse(readFileSync(inputPath,'utf8')),
 profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
 declaration={rosterSeeds:[10831,11842],strength:.55,sourceCalls:['R3101-S1001-P58','R6103-S3001-P4','R4202-S2001-P95','R3101-S1001-P173'],
  playSeeds:[51001,51002,51003,51004,52001,52002,52003,52004],los:55,ballY:26.65,firstDownX:65,
  setup:'Fresh generated teams and standard existing personnel selection; original declared calls incl. disguise. Full energy, empty scouting, audibles off to freeze calls; no roster correction. Four schemes per pair chosen before native outcomes. One actual first-loaded defender on actual catcher, else nearest at catch, actual interceptor or minimum low-flight distance. Selection is fixture measurement only.'},
 provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),collectorSha256:fileHash(import.meta.filename),
  runnerSha256:fileHash('scripts/diag/catch-transition-study.ts'),hipModelSha256:fileHash('scripts/diag/catch-hip-anchor-model.ts'),
  windowModelSha256:fileHash('scripts/diag/catch-arrival-model.ts'),inputSha256:fileHash(inputPath),
  flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
  node:process.version,platform:process.platform,arch:process.arch,lockSha256:fileHash('package-lock.json'),startedAt:new Date().toISOString()};
if(provenance.sourceSha256!==packet.runtimeSha256)throw Error('Fresh baseline differs from pinned source');
function signature(sim:PlaySim,result:any){return hash({result:{...result,frames:undefined,telemetry:undefined},bodies:sim.agents.map(a=>a.body),
 intents:sim.intents,rng:sim.rng,perception:sim.perception});}
function pair(c:any,d:any){const dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,dist=Math.hypot(dx,dy),vx=c.vel.x-d.vel.x,vy=c.vel.y-d.vel.y;
 return {distance:dist,closing:-(vx*dx+vy*dy)/Math.max(1e-9,dist),transverseSpeed:Math.abs(vx*dy-vy*dx)/Math.max(1e-9,dist),
  rearCos:-(c.vel.x*dx+c.vel.y*dy)/Math.max(1e-9,c.speed*dist),defenderSpeed:d.speed,runnerSpeed:c.speed,
  defenderVelocity:copy(d.vel),runnerVelocity:copy(c.vel),defenderSupport:copy(d.body.support),runnerSupport:copy(c.body.support)};}
function baseline(id:string,setup:any){
 const sim=new PlaySim({...copy(setup),record:true,recordEvery:1,recordLevel:'full'} as PlaySetup),step=sim.world.step.bind(sim.world),event=sim.event.bind(sim),
  holds:any[]=[],ids=new WeakMap<object,number>();let nearest:number|undefined,low={distance:Infinity,idx:11};
 sim.event=(type,a,b,note)=>{if(type==='catch'&&a?.team==='O')nearest=sim.defense.filter(d=>!d.isDown(sim.t))
  .sort((d,e)=>Math.hypot(d.pos.x-a.pos.x,d.pos.y-a.pos.y)-Math.hypot(e.pos.x-a.pos.x,e.pos.y-a.pos.y))[0]?.idx;
  return event(type,a,b,note);};
 sim.world.step=(intents,dt)=>{
  const entry=new Map(sim.world.joints.filter(j=>j.kind==='grasp').map(j=>[j,pair(sim.agents[sim.world.indexOf(j.b)],sim.agents[sim.world.indexOf(j.a)])])),report=step(intents,dt);
  for(const j of sim.world.joints)if(j.kind==='grasp'){
   let id=ids.get(j);if(id===undefined){id=holds.length;ids.set(j,id);const d=sim.agents[sim.world.indexOf(j.a)],c=sim.agents[sim.world.indexOf(j.b)];
    holds.push({id,defender:d.idx,carrier:c.idx,origin:j.origin,firstSeen:sim.t,firstLoaded:null,brokenAt:null,initialCapacity:j.capacity,legs:j.legs,
     acquisitionQuality:sim.bond?.grip?.get(d)??null,execution:sim.bond?.execution?.get(d)??null});}
   const h=holds[id];if((j.force??0)>1e-8&&h.firstLoaded===null){h.firstLoaded=sim.t+dt;h.entryGeometry=entry.get(j);}
   if(j.broken&&h.brokenAt===null)h.brokenAt=sim.t+dt;
  }
  if(sim.ball.kind==='air'&&sim.ball.flight.pos.z>=.25&&sim.ball.flight.pos.z<=3)for(const d of sim.defense){const p=sim.ball.flight.pos,
   dd=Math.hypot(d.pos.x-p.x,d.pos.y-p.y);if(!d.isDown(sim.t)&&dd<low.distance)low={distance:dd,idx:d.idx};}
  return report;
 };
 const result=sim.run(),sig=signature(sim,result),plain=new PlaySim(copy(setup) as PlaySetup),plainResult=plain.run();
 if(sig!==signature(plain,plainResult))throw Error('Fresh baseline observer changes native state');
 const catcher=sim.offense.find(a=>a.player.id===result.stats.receiver),first=catcher?holds.find(h=>h.carrier===catcher.idx&&h.firstLoaded!==null):undefined,
  interceptor=result.events.find(e=>e.type==='interception'),defender=first?.defender??nearest??interceptor?.a??low.idx,
  f={id,setup,nativeSignature:sig,nativeResult:{...result,frames:undefined,telemetry:undefined},defender},
  file=join(destination,`${id}-baseline.json.gz`);
 const record={id,signature:sig,selectedDefender:{idx:defender,id:sim.agents[defender].player.id,slot:sim.agents[defender].slot,profile:sim.agents[defender].profile},
  actualReceiverId:result.stats.receiver??null,result:f.nativeResult,censored:result.outcome==='timeout',holds,
  frames:result.frames,telemetry:result.telemetry};
 writeFileSync(file,gzipSync(JSON.stringify(record)));
 return {f,outcome:{...record,frames:undefined,telemetry:undefined,artifact:{path:file,sha256:fileHash(file)},observerVerified:true}};
}
const tasks:any[]=[];
for(const [i,seed] of declaration.rosterSeeds.entries()){
 const rng=new Rng(seed),offTeam=generateTeam(rng,'Fresh Ironmen',`HI${seed}`,{strength:declaration.strength}),
  defTeam=generateTeam(rng,'Fresh Comets',`HC${seed}`,{strength:declaration.strength});
 for(const [j,sourceId] of declaration.sourceCalls.entries()){
  const source=packet.clips.find((f:any)=>f.id===sourceId),offCall=copy(source.setup.offCall),defCall=copy(source.setup.defCall),
   setup=copy({offense:pickOffense(offTeam,offCall.formation.personnel),defense:pickDefense(defTeam,defCall.personnel),offCall,defCall,
    los:declaration.los,ballY:declaration.ballY,firstDownX:declaration.firstDownX,seed:declaration.playSeeds[i*4+j],audibles:false}),
   id=`H${seed}-C${j+1}-S${setup.seed}`;
  tasks.push({id,sourceId,setup});
 }
}
writeFileSync(join(destination,'declared-setups.json'),JSON.stringify({declaration,provenance,tasks})+'\n');
const start=performance.now(),cases:any[]=[],clips:any[]=[];let failure:string|null=null;
for(const task of tasks){
 if(performance.now()-start>30000){failure='Declared 30-second transfer batch exhausted';break;}
 const t=performance.now(),b=baseline(task.id,task.setup),label=`${task.id}-hip`,
  candidate=trial(b.f,'hip',null,true,destination,label),plain=trial(b.f,'hip',null,false,destination,label);
 if(candidate.signature!==plain.signature)throw Error('Fresh candidate observer changes native state');
 clips.push(b.f);cases.push({id:task.id,sourceId:task.sourceId,setupSha256:hash(task.setup),baseline:b.outcome,
  candidate:{...candidate,observerVerified:true},wallMs:performance.now()-t});
 console.log(JSON.stringify({id:task.id,source:task.sourceId,defender:b.outcome.selectedDefender.id,
  baseline:b.outcome.result.outcome,baselineYac:b.outcome.result.stats.yac,candidate:candidate.result.outcome,candidateYac:candidate.result.stats.yac,
  changed:candidate.changedCalls,receiverPreserved:(b.outcome.actualReceiverId===candidate.actualReceiverId)}));
}
writeFileSync(join(destination,'native-inputs.json'),JSON.stringify({declaration,provenance,clips})+'\n');
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'hip-anchor-fresh-transfer-v1',provenance,declaration,
 cases,failure,unrun:tasks.slice(cases.length).map(t=>({id:t.id,sourceId:t.sourceId})),wallMs:performance.now()-start,
 interpretation:'Eight declared fresh standalone plays, original calls with fresh selected generated players/new play seeds. All baseline and candidate complete native outputs; one baseline-selected defender per candidate. No scheme/seed selection after outcomes, no new capabilities or physics, no helper coordination. Flags, penalties, offensive wins and unfinished outcomes retained. This is mechanism transfer, not league validation or simultaneous all-defender installation.'})+'\n');
if(sourceVersion()!==provenance.sourceSha256||fileHash(inputPath)!==provenance.inputSha256)throw Error('Source/input changed');
if(failure)throw Error(failure);
