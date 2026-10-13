/** Exact native prefixes, observation-only film and reduced encounter forks.
 * No production controller, perception delay, capability or contact-law edit.
 * native OUT.gz | contact NATIVE.gz OUT.json | lab OUT.gz
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {CENTER_Y,FIELD_WIDTH} from '../../src/core/field.js';
import {Rng} from '../../src/core/rng.js';
import type {Agent} from '../../src/sim/agent.js';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import {ScoutingReport} from '../../src/sim/recognition.js';
import {CoverageScouting} from '../../src/sim/qbmind.js';
import {contactQuality} from '../../src/sim/tackle-window.js';
import type {GraspJoint,Intent} from '../../src/physics/world.js';
import {sourceVersion} from '../source-version.js';
const copy=<T>(x:T):T=>structuredClone(x);
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const inputPath='data/reviews/current/catch-chain-inputs.json';
const inputs=JSON.parse(readFileSync(inputPath,'utf8'));
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 sourceSha256:sourceVersion(),collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
 inputSha256:hash(inputs),flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
 worldDefaults:profile.worldDefaults,startedAt:new Date().toISOString()};
function restore(f:any,record=false){
 const s=copy(f.setup),scouting=s.scouting?new ScoutingReport(s.scouting.strength):undefined;
 if(scouting)Reflect.set(scouting,'cells',new Map(s.scouting.cells));
 const coverageScouting=s.coverageScouting?Object.assign(new CoverageScouting(),copy(s.coverageScouting)):undefined;
 return new PlaySim({...s,energy:s.energy?new Map(s.energy):undefined,scouting,coverageScouting,
  record,recordEvery:1,recordLevel:'full'} as PlaySetup);
}
function signature(sim:PlaySim,result:any){return hash({result:{...result,frames:undefined,telemetry:undefined},
 bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception});}
function geometry(c:Agent,d:Agent){
 const dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,dist=Math.hypot(dx,dy),vx=c.vel.x-d.vel.x,vy=c.vel.y-d.vel.y;
 const body=c.profile.radius+d.profile.radius,arms=body+d.profile.reach,cs=Math.max(.01,c.speed);
 return {distance:dist,body,arms,quality:contactQuality(dist,body,arms),
  closing:-(vx*dx+vy*dy)/Math.max(.01,dist),transverseSpeed:Math.abs(vx*dy-vy*dx)/Math.max(.01,dist),
  rearCos:-(c.vel.x*dx+c.vel.y*dy)/(cs*Math.max(.01,dist)),
  aheadX:d.pos.x-c.pos.x,lateral:d.pos.y-c.pos.y,defender:copy(d.body),runner:copy(c.body)};
}
function joints(sim:PlaySim){return sim.world.joints.map(j=>{
 const {a,b,...rest}=j;const row:any={...copy(rest),a:sim.world.indexOf(a),b:sim.world.indexOf(b)};
 for(const k of ['actor','holder'])if(Reflect.get(j,k))row[k]=sim.world.indexOf(Reflect.get(j,k));return row;
});}
function snapshot(sim:PlaySim){return {t:sim.t,bodies:copy(sim.agents.map(a=>a.body)),joints:joints(sim),
 rng:copy(sim.rng),perception:copy(sim.perception),intents:copy(sim.intents),
 pending:(Reflect.get(sim.world,'pending') as any[]).map(p=>({...copy({...p,a:undefined,b:undefined}),
  a:sim.world.indexOf(p.a),b:sim.world.indexOf(p.b)}))};}
function native(f:any){
 const sim=restore(f,true),rows:any[]=[],seen=sim.see.bind(sim),step=sim.world.step.bind(sim.world),wrapped=new WeakSet<object>();
 let cues:any[]=[],raw:any[]=[],world:any;
 sim.see=(a,b,delay)=>{const picture=seen(a,b,delay);if(a.team==='D')cues.push({actor:a.idx,target:b.idx,delay,picture:copy(picture)});return picture;};
 sim.world.step=(intents,dt)=>{const before=copy(sim.agents.map(a=>a.body)),entry=joints(sim),applied=copy(intents);
  const report=step(intents,dt);world={before,entry,applied,after:copy(sim.agents.map(a=>a.body)),joints:joints(sim),report:copy(report)};return report;};
 const tick=sim.tick.bind(sim);
 sim.tick=()=>{cues=[];raw=[];world=null;const t=sim.t,carrier=sim.carrier?.idx??null;
  for(const a of sim.agents){const b=a.behavior;if(wrapped.has(b))continue;wrapped.add(b);const update=b.update.bind(b);
   b.update=(a,s)=>{const cmd=update(a,s);raw.push({actor:a.idx,kind:b.kind,command:copy(cmd),fit:copy(a.runFit),
    target:Reflect.get(b,'target')?.idx??null,landmark:Reflect.get(b,'recordedLandmark')?.call(b)});return cmd;};}
  tick();rows.push({t,carrier,cues,raw,world});};
 const result=sim.run(),sig=signature(sim,result);
 if(sig!==f.nativeSignature)throw Error(`Native observer mismatch ${f.id}`);
 return {id:f.id,setupSha256:hash(f.setup),signature:sig,observerVerified:true,
  players:sim.agents.map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,team:a.team,profile:a.profile,ratings:a.player.ratings})),
  installed:sim.defAlign.spots,result:{...result,frames:undefined,telemetry:undefined},frames:result.frames,telemetry:result.telemetry,rows};
}
/** Reach the actual World boundary after controllers, tackle refinement and
 * teammate spacing; do not attempt to reconstruct private solver history. */
function atWorld(f:any,t:number){
 const sim=restore(f),stop={},step=sim.world.step.bind(sim.world);let held:Parameters<PlaySim['world']['step']>[0]|undefined;
 sim.world.step=(intents,dt)=>{if(Math.abs(sim.t-t)<1e-8){held=copy(intents);throw stop;}return step(intents,dt);};
 try{while(sim.phase==='live'&&sim.t<=t+1e-8)sim.tick();}catch(e){if(e!==stop)throw e;}
 sim.world.step=step;if(!held)throw Error(`Missing native World boundary ${f.id}/${t}`);
 return {sim,intents:held};
}
function contact(f:any,tape:any){
 const start=f.firstLoaded.tickEnd-.05,steps=tape.rows.filter((r:any)=>r.t>=start-1e-8).slice(0,6);
 const outcomes=[];
 for(const remove of [false,true]){
  const {sim}=atWorld(f,start),prefix=snapshot(sim),c=sim.agents[f.firstLoaded.carrier??tape.result.events.find((e:any)=>e.type==='catch').a],d=sim.agents[f.defender];
  const joint=sim.world.joints.find(j=>j.kind==='grasp'&&j.a===d.body&&j.b===c.body) as GraspJoint|undefined;
  if(!joint||joint.broken)throw Error(`Missing selected native hold ${f.id}`);
  const initial=copy({...joint,a:d.idx,b:c.idx}),quality=sim.bond?.grip?.get(d),execution=sim.bond?.execution?.get(d);
  if(remove)sim.world.joints=sim.world.joints.filter(j=>j!==joint);
  const rows=[];
  for(const r of steps){sim.world.time=r.t;const before=geometry(c,d),report=sim.world.step(copy(r.world.applied),.05);
   const after=geometry(c,d);let nativeError:number|null=null;
   if(rows.length===0&&!remove){nativeError=Math.max(...sim.agents.flatMap((a,i)=>['pos','vel'].flatMap(k=>['x','y'].map(axis=>
    Math.abs(Reflect.get(a.body,k)[axis]-r.world.after[i][k][axis])))));if(nativeError>1e-10)throw Error('First held step differs from native');}
   rows.push({t:r.t+.05,before,after,armImpulse:report.armImpulse[c.idx],groundImpulse:report.groundImpulse[c.idx],
    falls:report.falls,joint:remove?null:copy({...joint,a:d.idx,b:c.idx}),nativeFirstStepError:nativeError});}
  outcomes.push({arm:remove?'remove-only-selected-joint':'original-selected-joint',prefixSha256:hash(prefix),
   initial,quality,execution,rows,censored:true});
 }
 if(outcomes[0].prefixSha256!==outcomes[1].prefixSha256)throw Error('Contact prefix mismatch');
 return {id:f.id,defender:f.defender,runner:tape.result.events.find((e:any)=>e.type==='catch').a,
  duration:.3,interpretation:'Frozen command tape, original World rebuilt by native prefix, original first-step queued strikes. Later controller/bond updates and later queued strikes excluded in BOTH arms. Removing one joint is a causal mechanical ablation, not a controller candidate or completed play.',outcomes};
}
type LabInput={id:string;field:'left'|'middle'|'right';helpers:0|1;runner:'native'|'bend-left'|'bend-right';stream:'original'|'fresh-9001'};
function labInputs(extra=false){return inputs.clips.filter((f:any)=>extra?!!f.supplement:!f.supplement).flatMap((f:any)=>(['left','middle','right'] as const).flatMap(field=>
 ([0,1] as const).flatMap(helpers=>(['native','bend-left','bend-right'] as const).flatMap(runner=>
 (['original','fresh-9001'] as const).map(stream=>({id:f.id,field,helpers,runner,stream}))))));}
function shift(sim:PlaySim,a:Agent,dx:number,dy:number){
 a.body.pos.x+=dx;a.body.pos.y+=dy;
 const foot=a.body.support?.foot;if(foot)for(const p of [foot.anchor,foot.target]){p.x+=dx;p.y+=dy;}
 const data=Reflect.get(sim.perception,'data') as Float64Array;
 for(let row=0;row<24;row++){const at=(row*sim.agents.length+a.idx)*8;data[at]+=dx;data[at+1]+=dy;}
}
function lab(f:any,input:LabInput,observe:boolean){
 const sim=restore(f,observe),catchT=f.nativeResult.events.find((e:any)=>e.type==='catch').t;
 // Preserve the native approach until 0.45 s before its first loaded boundary,
 // or the first post-catch tick for the two immediate-wrap controls.
 const forkAt=Math.max(catchT+.05,f.firstLoaded.tickEnd-.45);
 while(sim.phase==='live'&&sim.t<forkAt-1e-8)sim.tick();
 const c=sim.carrier!,d=sim.agents[f.defender],h=sim.agents[f.helper],start=sim.t;
 if(!c||sim.phase!=='live')throw Error(`Invalid catch fork ${f.id}`);
 const prefixSha256=hash(snapshot(sim)),dx=45-c.pos.x,dy=(input.field==='left'?6:input.field==='right'?FIELD_WIDTH-6:CENTER_Y)-c.pos.y;
 const active=new Set([c,d,...input.helpers?[h]:[]]),startJoint=sim.world.joints.find(j=>j.kind==='grasp'&&j.a===d.body&&j.b===c.body);
 if(startJoint&&(startJoint as GraspJoint).force)throw Error('Translate only before first native grip load');
 for(const a of active)shift(sim,a,dx,dy);
 // Helper intervention is explicit: same actual athlete/support/velocity,
 // new position five yards ahead, opposite the first defender, two yards wide.
 if(input.helpers)shift(sim,h,c.pos.x+5-h.pos.x,c.pos.y-(Math.sign(d.pos.y-c.pos.y)||1)*2-h.pos.y);
 for(const a of sim.agents){a.engagement=null;if(active.has(a))continue;
  shift(sim,a,-200-a.idx*4-a.pos.x,CENTER_Y-a.pos.y);a.body.vel={x:0,y:0};a.downUntil=99;
  a.behavior={kind:'lab-parked',update:()=>({vel:{x:0,y:0}})};}
 sim.engagements.length=0;
 sim.world.joints=sim.world.joints.filter(j=>active.has(sim.agents[sim.world.indexOf(j.a)])&&active.has(sim.agents[sim.world.indexOf(j.b)]));
 Reflect.set(sim.world,'pending',(Reflect.get(sim.world,'pending') as any[]).filter(p=>active.has(sim.agents[sim.world.indexOf(p.a)])&&active.has(sim.agents[sim.world.indexOf(p.b)])));
 Reflect.set(sim,'los',sim.los+dx);Reflect.set(sim,'firstDownX',sim.firstDownX+dx);
 if(input.stream==='fresh-9001')Reflect.set(sim,'rng',new Rng(`${f.setup.seed}:catch-chain:9001`));
 if(input.runner!=='native'){
  const original={...c.vel},speed=c.profile.vmax,cutSkill=.8+.45*c.r('elusiveness'),sign=input.runner==='bend-left'?-1:1;
  c.behavior={kind:'lab-scripted-bend',update:()=>{const angle=sim.t-start<.6?Math.atan2(original.y,original.x):sign*.6;
   return {vel:{x:speed*Math.cos(angle),y:speed*Math.sin(angle)},facing:angle,cutSkill};}};
 }
 const initial={runner:c.idx,defender:d.idx,helper:input.helpers?h.idx:null,identities:[c,d,h].map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,profile:a.profile,ratings:a.player.ratings})),
  bodies:[c,d,...input.helpers?[h]:[]].map(a=>({idx:a.idx,body:copy(a.body)})),perception:copy(sim.perception)};
 let raw:any[]=[],rows:any[]=[],holds:any[]=[],holdIndex=new WeakMap<GraspJoint,number>();
 const step=sim.world.step.bind(sim.world),wrapped=new WeakSet<object>();
 if(observe)sim.world.step=(intents,dt)=>{const before=[geometry(c,d),...input.helpers?[geometry(c,h)]:[]],applied=activeArray().map(a=>({idx:a.idx,intent:copy(intents[a.idx])}));
  const report=step(intents,dt);const grips=sim.world.joints.filter(j=>j.kind==='grasp'&&j.b===c.body).map(j=>{
   const g=j as GraspJoint;let id=holdIndex.get(g);if(id===undefined){id=holds.length;holdIndex.set(g,id);
    holds.push({id,defender:sim.world.indexOf(g.a),firstObservedStepEnd:sim.t+dt,firstLoaded:null,brokenAt:null,origin:g.origin,initialCapacity:g.capacity,legs:g.legs});}
   const hold=holds[id];if((g.force??0)>1e-8&&hold.firstLoaded===null)hold.firstLoaded=sim.t+dt;
   if(g.broken&&hold.brokenAt===null)hold.brokenAt=sim.t+dt;
   return {...copy({...g,a:undefined,b:undefined}),a:sim.world.indexOf(g.a),b:c.idx,holdId:id};});
  rows.push({t:sim.t+dt,raw,applied,before,after:activeArray().map(a=>({idx:a.idx,body:copy(a.body)})),
   grips,contacts:report.contacts,armImpulse:report.armImpulse[c.idx],groundImpulse:report.groundImpulse[c.idx]});return report;};
 function activeArray(){return [c,d,...input.helpers?[h]:[]];}
 const eventStart=sim.events.length;
 for(let k=0;k<200&&sim.phase==='live';k++){
  raw=[];
  if(observe)for(const a of active){const b=a.behavior;if(wrapped.has(b))continue;wrapped.add(b);const update=b.update.bind(b);
   b.update=(a,s)=>{const command=update(a,s);raw.push({idx:a.idx,kind:b.kind,command:copy(command)});return command;};}
  sim.tick();
 }
 const result=sim.buildResult(),sig=signature(sim,result);
 return {input,prefixSha256,initialSha256:hash(initial),initial,signature:sig,startT:start,censored:sim.phase==='live',
  outcome:sim.phase==='live'?null:sim.outcome,duration:sim.t-start,gain:c.pos.x-45,runnerAtEnd:copy(c.body),
  events:sim.events.slice(eventStart),holds,rows};
}
const [mode,path,out]=process.argv.slice(2);let report:any,destination=path;
if(mode==='native')report={schema:'catch-chain-native-v1',clips:inputs.clips.map(native)};
else if(mode==='contact'){
 const tape=JSON.parse(gunzipSync(readFileSync(path)).toString());destination=out;
 report={schema:'catch-chain-loaded-ablation-v1',tapeSha256:createHash('sha256').update(readFileSync(path)).digest('hex'),
  cases:inputs.clips.map((f:any)=>contact(f,tape.clips.find((c:any)=>c.id===f.id)))};
}else if(mode==='lab'||mode==='lab-extra'){
 const manifest=labInputs(mode==='lab-extra');report={schema:'catch-chain-reduced-encounter-v1',manifest,inputSha256:hash(manifest),
  limitations:'Reduced native-prefix approach forks, starting 0.45 s before first native loaded boundary or first post-catch tick, whichever is later. Same actual runner/first loaded defender, native support, velocities, eyes, histories and capabilities. All bystanders parked and block joints removed. Helper is the named actual athlete deliberately repositioned to a viable opposite lane; NOT original coverage formation. Carrier center y=6/26.67/47.33, x=45; positions/history/support anchors translated together. Original stream versus independent post-prefix execution stream 9001. Native runner versus bends requested after 0.6 s. Ten-second live endpoints censored; no forced whistle, force scaling or solver experiment.',
  cases:manifest.map((input:LabInput)=>{const f=inputs.clips.find((f:any)=>f.id===input.id),observed=lab(f,input,true),plain=lab(f,input,false);
   if(observed.signature!==plain.signature||observed.initialSha256!==plain.initialSha256)throw Error(`Lab observer changes ${JSON.stringify(input)}`);
   console.log(JSON.stringify({input,outcome:observed.outcome,censored:observed.censored,gain:observed.gain}));
   return {...observed,observerVerified:true};})};
}else throw Error('native OUT.gz | contact NATIVE.gz OUT.json | lab OUT.gz');
if(!destination)throw Error('Supply destination');
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed');
report.provenance={...provenance,finishedAt:new Date().toISOString()};mkdirSync(dirname(destination),{recursive:true});
const data=JSON.stringify(report);writeFileSync(destination,destination.endsWith('.gz')?gzipSync(data):data+'\n');
console.log(JSON.stringify({destination,schema:report.schema,source:provenance.sourceSha256,cases:report.cases?.length??report.clips?.length}));
