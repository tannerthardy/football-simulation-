/** One selected defender per complete original play; helper policy untouched.
 * collect OUT.json | run INPUT.json OUTDIR primary|fresh | frozen OUTDIR
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {Rng} from '../../src/core/rng.js';
import {clamp} from '../../src/core/vec.js';
import {Game} from '../../src/game/game.js';
import {generateTeam} from '../../src/league/team.js';
import {derivePhysical} from '../../src/players/physical.js';
import {baseRadiusAt,omega0,supportParams} from '../../src/physics/support.js';
import type {Agent} from '../../src/sim/agent.js';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import {ScoutingReport} from '../../src/sim/recognition.js';
import {CoverageScouting} from '../../src/sim/qbmind.js';
import {arrivalChoice,type Consumed} from './catch-arrival-model.js';
import {sourceVersion} from '../source-version.js';

const copy=<T>(x:T):T=>structuredClone(x);
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fileHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),
 collectorSha256:fileHash(import.meta.filename),modelSha256:fileHash('scripts/diag/catch-arrival-model.ts'),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 startedAt:new Date().toISOString()};
const arms=['baseline','arrival','balance-minus10','balance-plus10','step-minus5pct','step-plus5pct','getup-minus10pct','getup-plus10pct'] as const;
type Arm=typeof arms[number];
const freshDeclaration={cohorts:[{roster:6103,game:3001},{roster:7204,game:4001}],strength:.55,
 draws:{completions:16,otherPasses:8},sampleKey:'moving-arrival-20261013',
 selection:'Uniform draws within completed and other native pass strata, before candidate outcomes; flags/unfinished retained. Supplement first two actual interceptions per roster as ball-contest guards, deduplicated and separately labelled. First positive loaded defender on actual catcher, else nearest at catch, else actual interceptor, else minimum defender-to-low-flight distance. Fixture selection uses baseline truth; the experimental controller uses consumed pictures only.'};
function restore(f:any,record=false){const s=copy(f.setup),scouting=s.scouting?new ScoutingReport(s.scouting.strength):undefined;
 if(scouting)Reflect.set(scouting,'cells',new Map(s.scouting.cells));
 const coverageScouting=s.coverageScouting?Object.assign(new CoverageScouting(),copy(s.coverageScouting)):undefined;
 return new PlaySim({...s,energy:s.energy?new Map(s.energy):undefined,scouting,coverageScouting,
  record,recordEvery:1,recordLevel:'full'} as PlaySetup);}
function signature(sim:PlaySim,result:any){return hash({result:{...result,frames:undefined,telemetry:undefined},
 bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception});}
function lean(a:Agent){return {idx:a.idx,pos:copy(a.pos),vel:copy(a.vel),facing:a.facing,energy:a.body.energy,
 support:copy(a.body.support),downUntil:a.downUntil};}
function pair(c:Agent,d:Agent){const dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,dist=Math.hypot(dx,dy),
 vx=c.vel.x-d.vel.x,vy=c.vel.y-d.vel.y;
 return {carrier:c.idx,defender:d.idx,distance:dist,relativeVelocity:{x:vx,y:vy},
  closing:-(vx*dx+vy*dy)/Math.max(1e-9,dist),transverseSpeed:Math.abs(vx*dy-vy*dx)/Math.max(1e-9,dist),
  rearCos:-(c.vel.x*dx+c.vel.y*dy)/Math.max(1e-9,c.speed*dist),
  headingDifference:Math.atan2(Math.sin(Math.atan2(d.vel.y,d.vel.x)-Math.atan2(c.vel.y,c.vel.x)),Math.cos(Math.atan2(d.vel.y,d.vel.x)-Math.atan2(c.vel.y,c.vel.x))),
  defenderSpeed:d.speed,runnerSpeed:c.speed};}
function mutate(a:Agent,arm:Arm){const before=copy(a.profile),originalRating=a.player.ratings.balance;
 let hypotheticalRating:number|null=null;
 if(arm.startsWith('balance-')){
  hypotheticalRating=clamp(originalRating+(arm==='balance-plus10'?10:-10),1,99);
  const shadow=copy(a.player);shadow.ratings.balance=hypotheticalRating;const derived=derivePhysical(shadow);
  for(const k of ['balance','bend','stepSpeed'] as const)a.profile[k]=derived[k];
 }else if(arm.startsWith('step-'))a.profile.stepSpeed=clamp(before.stepSpeed!*(arm==='step-plus5pct'?1.05:.95),2.3,4.8);
 else if(arm.startsWith('getup-'))a.profile.getUp=clamp(before.getUp!*(arm==='getup-plus10pct'?1.1:.9),.6,1.4);
 const changed=Object.keys(a.profile).filter(k=>Reflect.get(a.profile,k)!==Reflect.get(before,k));
 const allowed=arm.startsWith('balance-')?['balance','bend','stepSpeed']:arm.startsWith('step-')?['stepSpeed']:arm.startsWith('getup-')?['getUp']:[];
 if(changed.some(k=>!allowed.includes(k))||a.player.ratings.balance!==originalRating)throw Error('Unallowed capability/rating edit');
 function support(p:typeof before){const s=supportParams(p),posture=a.body.support?.posture??.2;
  return {...s,posture,omega:omega0(s,posture),baseAtPosture:baseRadiusAt(s,posture),
   freeFallThreshold:baseRadiusAt(s,posture)+s.stepSpeed/omega0(s,posture)};}
 return {arm,originalRating,hypotheticalRating,changed,before,after:copy(a.profile),supportBefore:support(before),supportAfter:support(a.profile),
  interpretation:'One actual defender profile only, at first post-throw boundary. Generated rating and all direct controller/roll ratings stay original. Balance shadow re-derives support balance/bend/stepSpeed ONLY; braking/lateral/speed/mass/power/grip/reaction/get-up unchanged. Independent step or get-up arms change one field. Laws and helper policy fixed.'};}
function selectFresh(roster:number,seed:number){
 const rng=new Rng(roster),home=generateTeam(rng,'Fresh Ironmen',`I${roster}`,{strength:.55}),away=generateTeam(rng,'Fresh Comets',`C${roster}`,{strength:.55});
 let game:Game,offCall:any,defCall:any,prefs:any;const population:any[]=[],contexts:any[]=[];
 game=new Game(home,away,{seed,record:false,hooks:{playResult(sim,kind){
  if(kind!=='scrimmage'||!sim.isPass)return undefined;
  const id=`R${roster}-S${seed}-P${Reflect.get(game,'playIndex')+1}`,
   off=sim.qb.player.id.startsWith(home.abbr)?'home':'away',def=off==='home'?'away':'home',
   scouting=Reflect.get(game,'scouting')[def],coverageScouting=Reflect.get(game,'coverageScouting')[off];
  const setup=copy({offense:Object.fromEntries(sim.offense.map(a=>[a.slot,a.player])),defense:Object.fromEntries(sim.defense.map(a=>[a.slot,a.player])),
   offCall,defCall,manPrefs:prefs,los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX,seed:sim.rng.key,
   energy:[...Reflect.get(game,'energy')],hurry:sim.hurry,down:sim.snapContext.down,audibles:true,
   scouting:{strength:Reflect.get(scouting,'strength'),cells:[...Reflect.get(scouting,'cells')]},coverageScouting:{...coverageScouting}});
  const loads:any[]=[],step=sim.world.step.bind(sim.world),event=sim.event.bind(sim);let nearestCatch:number|undefined,
   lowBall={distance:Infinity,idx:sim.defense[0].idx};
  sim.world.step=(intents,dt)=>{const report=step(intents,dt);
   if(sim.catchAt>=0&&sim.carrier?.team==='O')for(const j of sim.world.joints)if(j.kind==='grasp'&&j.b===sim.carrier.body&&(j.force??0)>1e-8)
    loads.push({carrier:sim.carrier.player.id,defender:sim.world.indexOf(j.a),t:sim.t+dt});
   if(sim.ball.kind==='air'&&sim.ball.flight.pos.z>=.25&&sim.ball.flight.pos.z<=3)for(const d of sim.defense){
    if(d.isDown(sim.t))continue;const p=sim.ball.flight.pos,dd=Math.hypot(d.pos.x-p.x,d.pos.y-p.y);
    if(dd<lowBall.distance)lowBall={distance:dd,idx:d.idx};}
   return report;};
  sim.event=(type,a,b,note)=>{if(type==='catch'&&a?.team==='O')nearestCatch=sim.defense.filter(d=>!d.isDown(sim.t))
   .sort((d,e)=>Math.hypot(d.pos.x-a.pos.x,d.pos.y-a.pos.y)-Math.hypot(e.pos.x-a.pos.x,e.pos.y-a.pos.y))[0]?.idx;
   return event(type,a,b,note);};
  const result=sim.run(),first=loads.find(l=>l.carrier===result.stats.receiver),interception=result.events.find(e=>e.type==='interception');
  const defender=first?.defender??nearestCatch??interception?.a??lowBall.idx;
  population.push({id,completed:!!result.stats.completed,attempted:!!result.stats.attempted,outcome:result.outcome,
   penalty:result.penalty??null,operativeConcept:sim.offCall.pass?.id,coverage:sim.defCall.coverage.id});
  contexts.push({id,setup,nativeSignature:signature(sim,result),nativeResult:{...result,frames:undefined,telemetry:undefined},defender,
   selectedBy:first?'first-positive-grasp-on-actual-catcher':nearestCatch!==undefined?'nearest-at-actual-catch':interception?'actual-interceptor':'minimum-low-flight-distance',
   operativeConcept:sim.offCall.pass?.id,coverage:sim.defCall.coverage.id});return result;
 }}});
 for(const oc of Object.values(Reflect.get(game,'oc')) as any[]){const call=oc.call.bind(oc);oc.call=(...args:any[])=>{offCall=call(...args);return offCall;};}
 for(const dc of Object.values(Reflect.get(game,'dc')) as any[]){const call=dc.call.bind(dc);dc.call=(...args:any[])=>{const c=call(...args);defCall=c.call;prefs=c.prefs;return c;};}
 game.play();
 const sample=new Rng(`${freshDeclaration.sampleKey}:${roster}`),draw=(pool:any[],n:number)=>{const order=[...pool];
  for(let i=order.length-1;i>0;i--){const j=sample.int(0,i);[order[i],order[j]]=[order[j],order[i]];}return order.slice(0,n);};
 const completed=contexts.filter(c=>c.nativeResult.stats.completed),other=contexts.filter(c=>!c.nativeResult.stats.completed);
 const uniform=[...draw(completed,16),...draw(other,8)],guards=contexts.filter(c=>!!c.nativeResult.stats.interceptedBy).slice(0,2);
 for(const f of uniform)f.sampling='uniform-stratum';
 for(const f of guards)if(!uniform.some(c=>c.id===f.id)){f.sampling='first-two-native-interception-guard';uniform.push(f);}
 return {roster,seed,population,clips:uniform,counts:{completed:completed.length,other:other.length,uniform:24,supplement:uniform.length-24,
  interceptions:contexts.filter(c=>!!c.nativeResult.stats.interceptedBy).length}};
}
function generatorAudit(){return [3101,4202,6103,7204].flatMap(roster=>{
 const rng=new Rng(roster),teams=[generateTeam(rng,'Ironmen',`I${roster}`,{strength:.55}),generateTeam(rng,'Comets',`C${roster}`,{strength:.55})];
 return teams.flatMap(t=>t.roster.map(p=>{const profile=derivePhysical(p);return {roster,id:p.id,position:p.position,
  generatedBalance:p.ratings.balance,profile:{balance:profile.balance,stepSpeed:profile.stepSpeed,bend:profile.bend,getUp:profile.getUp},support:supportParams(profile)};}));
});}
function trial(f:any,arm:Arm,observe:boolean,destination:string){
 const sim=restore(f,observe),a=sim.agents[f.defender],ci=sim.offense.find(a=>a.player.id===(f.nativeResult.stats.receiver??f.nativeResult.stats.target))?.idx??sim.slot('X')!.idx;
 const wrapped=new WeakSet<object>(),rows:any[]=[],holds:any[]=[],ids=new WeakMap<object,number>();
 const seen=sim.see.bind(sim),step=sim.world.step.bind(sim.world),tick=sim.tick.bind(sim);let inside=false,cues:Consumed[]=[],
  decision:any=null,raw:any=null,mutation:any=null,prefixSha256:string|null=null,world:any=null,firstChanged:number|null=null;
 let protectedBall=0,protectedCarry=0,changedCalls=0;
 sim.see=(d,c,delay)=>{const picture=seen(d,c,delay);if(inside&&d===a)cues.push({target:c.idx,delay,seen:copy(picture)});return picture;};
 if(observe)sim.world.step=(intents,dt)=>{
  const before=sim.agents.map(lean),applied=copy(intents),beforeGeometry=pair(sim.agents[ci],a),
   entry=new Map(sim.world.joints.filter(j=>j.kind==='grasp').map(j=>[j,pair(sim.agents[sim.world.indexOf(j.b)],sim.agents[sim.world.indexOf(j.a)])]));
  const report=step(intents,dt);
  const grasps=sim.world.joints.filter(j=>j.kind==='grasp').map(j=>{let id=ids.get(j);if(id===undefined){id=holds.length;ids.set(j,id);
    const d=sim.agents[sim.world.indexOf(j.a)],c=sim.agents[sim.world.indexOf(j.b)];holds.push({id,defender:d.idx,carrier:c.idx,origin:j.origin,
     firstSeen:sim.t,firstLoaded:null,brokenAt:null,initialCapacity:j.capacity,legs:j.legs,
     acquisitionQuality:sim.bond?.grip?.get(d)??null,execution:sim.bond?.execution?.get(d)??null,firstGeometry:pair(c,d)});}
   const h=holds[id];if((j.force??0)>1e-8&&h.firstLoaded===null){h.firstLoaded=sim.t+dt;
    h.entryGeometry=entry.get(j)??beforeGeometry;}
   if(j.broken&&h.brokenAt===null)h.brokenAt=sim.t+dt;
   return {...copy({...j,a:undefined,b:undefined}),a:sim.world.indexOf(j.a),b:sim.world.indexOf(j.b),id};});
  world={before,applied,after:sim.agents.map(lean),grasps,report:copy(report)};return report;};
 sim.tick=()=>{
  const t=sim.t;if(mutation===null&&sim.ball.kind==='air'){
   prefixSha256=hash({t,bodies:sim.agents.map(a=>a.body),rng:sim.rng,perception:sim.perception});mutation=mutate(a,arm);}
  cues=[];raw=null;decision=null;world=null;
  const b=a.behavior;if(!wrapped.has(b)){wrapped.add(b);const update=b.update.bind(b);
   b.update=(actor,s)=>{inside=true;let original;try{original=update(actor,s);}finally{inside=false;}
    const choice=arrivalChoice(actor,s,original,cues);raw=copy(original);decision=copy(choice);
    if(choice.reason==='preserve-reachable-ball')protectedBall++;
    if(choice.reason==='preserve-existing-carry')protectedCarry++;
    const command=arm==='arrival'?choice.command:original;
    if(arm==='arrival'&&hash(command)!==hash(original)){changedCalls++;firstChanged??=s.t;}
    if((choice.reason==='preserve-reachable-ball'||choice.reason==='preserve-existing-carry')&&hash(command)!==hash(original))throw Error('Protected contest/carry changed');
    return command;};}
  tick();if(observe)rows.push({t,ball:sim.ball.kind,carrier:sim.carrier?.idx??null,cues:copy(cues),raw,decision,world});
 };
 const result=sim.run(),sig=signature(sim,result),file=join(destination,`${f.id}-${arm}.json.gz`);
 const players=sim.agents.map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,team:a.team,ratings:a.player.ratings,measurables:a.player.measurables,profile:a.profile}));
 const record={id:f.id,arm,setupSha256:hash(f.setup),prefixSha256,signature:sig,mutation,selectedDefender:players[a.idx],
  baselineCatcher:players[ci],actualReceiverId:result.stats.receiver??null,actualTargetId:result.stats.target??null,
  installed:sim.defAlign.spots,result:{...result,frames:undefined,telemetry:undefined},
  censored:result.outcome==='timeout',changedCalls,firstChanged,protectedBall,protectedCarry,holds,players,rows,
  frames:observe?result.frames:undefined,telemetry:observe?result.telemetry:undefined};
 if(observe)writeFileSync(file,gzipSync(JSON.stringify(record)));
 return {id:f.id,arm,signature:sig,prefixSha256,mutation,selectedDefender:players[a.idx],baselineCatcher:players[ci],
  result:record.result,censored:record.censored,changedCalls,firstChanged,protectedBall,protectedCarry,holds,
  artifact:observe?{path:file,sha256:fileHash(file)}:null};
}
function run(packet:any,destination:string,group:string){
 mkdirSync(destination,{recursive:true});const cases=[];
 const selectedArms:readonly Arm[]=group==='primary'?arms:['baseline','arrival'];
 for(const f of packet.clips){const outcomes=[];
  for(const arm of selectedArms){const observed=trial(f,arm,true,destination),plain=trial(f,arm,false,destination);
   if(observed.signature!==plain.signature)throw Error(`Observer changes ${f.id}/${arm}`);
   if(arm==='baseline'&&observed.signature!==f.nativeSignature)throw Error(`Native baseline differs ${f.id}`);
   outcomes.push({...observed,observerVerified:true});
   console.log(JSON.stringify({id:f.id,arm,changed:observed.changedCalls,outcome:observed.result.outcome,
    possession:observed.result.possession,yac:observed.result.stats.yac,completed:observed.result.stats.completed}));
  }
  const prefixes=outcomes.filter(o=>o.prefixSha256!==null).map(o=>o.prefixSha256);
  if(new Set(prefixes).size>1)throw Error('Prefixes differ before one-variable changes');
  cases.push({id:f.id,setupSha256:hash(f.setup),defender:f.defender,outcomes});
 }
 return {schema:'catch-arrival-native-study-v1',group,inputSha256:hash(packet),selectedArms,cases,
  interpretation:'Full native 22-body plays, original setup/scouts/fatigue/seed. One defender only. Arrival replaces exact acquired moving-window drive branch; ball contests and existing carry requests protected. Separate support sensitivities start at first post-throw boundary. No helper rule, law, grip or global movement edit. Timeout outcomes censored.'};
}
function frozen(destination:string){
 const packet=JSON.parse(readFileSync('data/reviews/current/catch-chain-inputs.json','utf8')),
  tape=JSON.parse(gunzipSync(readFileSync('out/catch-chain/native-expanded.json.gz')).toString());
 const cases=[];
 for(const f of packet.clips){const ci=f.nativeResult.events.find((e:any)=>e.type==='catch').a,start=f.firstLoaded.tickEnd-.05,frames=tape.clips.find((c:any)=>c.id===f.id).rows
  .filter((r:any)=>r.t>=start-1e-8).slice(0,6),outcomes=[];
  for(const arm of arms.filter(a=>a!=='arrival')){
   const sim=restore(f),a=sim.agents[f.defender],stop={},step=sim.world.step.bind(sim.world);
   sim.world.step=(intents,dt)=>{if(Math.abs(sim.t-start)<1e-8)throw stop;return step(intents,dt);};
   try{while(sim.phase==='live'&&sim.t<=start+1e-8)sim.tick();}catch(e){if(e!==stop)throw e;}
   sim.world.step=step;if(Math.abs(sim.t-start)>1e-8)throw Error('Missing frozen prefix');
   const prefixSha256=hash({t:sim.t,bodies:sim.agents.map(a=>a.body),rng:sim.rng,perception:sim.perception}),mutation=mutate(a,arm),rows=[];
   const hold=sim.world.joints.find(j=>j.kind==='grasp'&&j.a===a.body&&j.b===sim.agents[ci].body);
   if(!hold)throw Error('Selected hold missing');const initialHold=copy({...hold,a:a.idx,b:ci});
   for(const r of frames){sim.world.time=r.t;const before=sim.agents.map(lean),report=sim.world.step(copy(r.world.applied),.05),
    after=sim.agents.map(lean);
    let nativeError:number|null=null;if(arm==='baseline'&&rows.length===0){nativeError=Math.max(...sim.agents.flatMap((a,i)=>['pos','vel'].flatMap(k=>['x','y']
     .map(axis=>Math.abs(Reflect.get(a.body,k)[axis]-r.world.after[i][k][axis])))));if(nativeError>1e-10)throw Error('Frozen native boundary mismatch');}
    rows.push({t:r.t+.05,before,after,report:copy(report),hold:copy({...hold,a:a.idx,b:ci}),nativeError});}
   outcomes.push({arm,prefixSha256,mutation,initialHold,rows,censored:true});
  }
  if(new Set(outcomes.map(o=>o.prefixSha256)).size!==1||new Set(outcomes.map(o=>hash(o.initialHold))).size!==1)throw Error('Hold/prefix varies in sensitivity');
  cases.push({id:f.id,selectedDefender:f.defender,runner:ci,outcomes});
 }
 mkdirSync(destination,{recursive:true});return {schema:'catch-arrival-frozen-capability-v1',inputSha256:hash(packet),
  tapeSha256:fileHash('out/catch-chain/native-expanded.json.gz'),cases,
  interpretation:'Exactly same acquired joint, native World/private history and queued first-step strikes. One defender support profile changed; six saved-command steps. Later acquisitions/bond decisions/strikes omitted from all arms. All .30-s slices censored; no physics law or helper change.'};
}
const [mode,input,out,group]=process.argv.slice(2);let destination=input,report:any;
if(mode==='collect'){
 const cohorts=freshDeclaration.cohorts.map(c=>selectFresh(c.roster,c.game));
 report={schema:'moving-arrival-fresh-native-contexts-v1',declaration:freshDeclaration,cohorts:cohorts.map(({clips,...rest})=>rest),
  clips:cohorts.flatMap(c=>c.clips),generatorAudit:generatorAudit(),generatorSha256:fileHash('src/players/generator.ts'),physicalMappingSha256:fileHash('src/players/physical.ts')};
}else if(mode==='run'){
 const packet=JSON.parse(readFileSync(input,'utf8'));report=run(packet,out,group);destination=join(out,'summary.json');
}else if(mode==='frozen'){report=frozen(input);destination=join(input,'summary.json');}
else throw Error('collect OUT.json | run INPUT.json OUTDIR primary|fresh | frozen OUTDIR');
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed');
report.provenance={...provenance,finishedAt:new Date().toISOString()};mkdirSync(dirname(destination),{recursive:true});
writeFileSync(destination,JSON.stringify(report)+'\n');console.log(JSON.stringify({destination,schema:report.schema,cases:report.cases?.length??report.clips?.length}));
