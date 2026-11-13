import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readdirSync} from 'node:fs';
const host=process.env.YAW_AUDIT_HOST||process.cwd();
const {PlaySim}=await import(pathToFileURL(resolve(host,'src/sim/playsim.ts')).href);
function sourceVersion(){const files=d=>readdirSync(resolve(host,d),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(d+'/'+e.name):[d+'/'+e.name]).sort();const h=createHash('sha256');for(const f of files('src'))h.update(f).update('\0').update(readFileSync(resolve(host,f))).update('\0');return h.digest('hex')}
const {movementObjective}=await import(pathToFileURL(resolve(host,'src/sim/movement-objective.ts')).href);
const {runContactObservers}=await import(pathToFileURL(resolve(host,'src/sim/run-contact-observer.ts')).href);
const [mode='plan',inputs,out='out/run-flow/capture',until='3.2']=process.argv.slice(2);
if(mode==='plan'){console.log(JSON.stringify({question:'Held free-fit objective/movement mode and loaded defensive shoulder versus runner flow',nativeSnaps:0}));process.exit(0)}
assert(mode==='run');assert(Number(until)>0&&Number(until)<=6);const cases=JSON.parse(gunzipSync(readFileSync(inputs)));assert(cases.length<=8);mkdirSync(out,{recursive:true});
const begin=performance.now(),source=sourceVersion(),rows=[];const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
for(const {id,setup} of cases){
 const sim=new PlaySim(structuredClone(setup));const ticks=[],cues=[],calls=[],aims=[],contact=[];let consumer=null;
 const initial=sim.agents.map(a=>({idx:a.idx,slot:a.slot,player:a.player,profile:a.profile,pos:{...a.pos},runFit:a.runFit,behavior:a.behavior.kind,snapReadyAt:a.snapReadyAt}));
 const see=sim.see.bind(sim);sim.see=(a,b,...rest)=>{const p=see(a,b,...rest);if(a.team==='D')cues.push({t:sim.t,a:a.idx,b:b.idx,consumer,picture:structuredClone(p)});return p};
 for(const a of sim.agents){
  const aim=a.mind.aim;a.mind.aim=function(job,desired,t){const result=aim.call(this,job,desired,t);if(a.team==='D')aims.push({t,a:a.idx,job,desired:structuredClone(desired),selected:structuredClone(result),heldUntil:this.aims.get(job)?.until});return result};
  const behavior=a.behavior,update=behavior.update;behavior.update=function(...args){consumer=a.idx;const start=cues.length;const cmd=update.apply(this,args);consumer=null;calls.push({t:sim.t,a:a.idx,kind:this.kind,read:a.recog?.read,command:structuredClone(cmd),cues:[start,cues.length],tags:[...a.tags]});return cmd};
 }
 runContactObservers.set(sim,(e,phase,data)=>contact.push({t:sim.t,b:e.blocker.idx,d:e.defender.idx,phase,repType:e.type,data:structuredClone(data)}));
 const step=sim.world.step.bind(sim.world);sim.world.step=(intents,dt)=>{const before=sim.agents.map(a=>structuredClone(a.body));const report=step(intents,dt);ticks.push({t:sim.t,completed:sim.t+dt,before,requests:structuredClone(sim.cmds),requestObjectives:sim.cmds.map(movementObjective),intentObjectives:intents.map(movementObjective),intents:structuredClone(intents),after:sim.agents.map(a=>structuredClone(a.body)),reps:sim.engagements.map(e=>({b:e.blocker.idx,d:e.defender.idx,phi:e.phi,control:e.control,normal:e.hands?.normalForce,tangent:e.hands?.tangentForce})),contacts:report.contacts,reads:sim.agents.map(a=>({read:a.recog?.read,readAt:a.recog?.readAt,snapReadyAt:a.snapReadyAt})),ball:{kind:sim.ball.kind,carrier:sim.carrier?.idx},rng:JSON.stringify(sim.rng)});return report};
 const start=performance.now();sim.event('snap',sim.slot('C'));while(sim.phase==='live'&&sim.t<Number(until)){assert(performance.now()-start<5000);sim.tick()}
 const result=sim.buildResult();runContactObservers.delete(sim);const record={id,inputSha256:hash(setup),setup,initial,ticks,cues,calls,aims,contact,events:sim.events,phase:sim.phase,outcome:sim.phase==='live'?null:result.outcome,gain:sim.phase==='live'?null:result.offenseYards,result,source,elapsedSeconds:(performance.now()-start)/1000};
 writeFileSync(out+'/'+id+'.json.gz',gzipSync(JSON.stringify(record)));rows.push({id,inputSha256:record.inputSha256,phase:record.phase,outcome:record.outcome,gain:record.gain,elapsedSeconds:record.elapsedSeconds});console.log(JSON.stringify(rows.at(-1)));
}
assert(sourceVersion()===source);writeFileSync(out+'/receipt.json',JSON.stringify({source,node:process.version,rows,until:Number(until),elapsedSeconds:(performance.now()-begin)/1000,qualification:'Native exact frozen setups, passive wraps only, no extra sensing/RNG/previews. runContactObservers is existing hook; SnapMind wrapper records actual existing calls. Prefixes are censored until terminal.'},null,2));
