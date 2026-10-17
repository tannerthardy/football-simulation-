/** Two selected saved jobs. Passive production hooks and held-command preview.
 * No blocking, movement, contact or cue overrides. */
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {makeSaved,savedInputs} from './saved.js';
import {sourceVersion} from '../../source-version.js';
import {previewFreeMovement} from '../../../src/physics/movement-preview.js';
import {RunBlocker} from '../../../src/sim/behaviors/blocking.js';
const start=performance.now(),rows:any[]=[];
for(const c of savedInputs('test/fixtures/climb-access-inputs.json.gz').cases){
 const sim=makeSaved(c),actor=sim.slot(c.id==='G2-P099'?'C':'LG')!,target=sim.slot('LB_M')!;
 const brain=actor.behavior as any,samples:any[]=[],frames:any[]=[];let tick:any=null;
 const capture=(label:string,value:any)=>{if(tick)tick[label]=structuredClone(value);};
 const see=sim.see.bind(sim);
 sim.see=((...args:Parameters<typeof sim.see>)=>{
  const pic=see(...args);
  if(tick&&args[0]===actor&&args[1]===target){
   tick.pictures.push(structuredClone({picture:pic,caller:new Error().stack?.split('\n').slice(2,5)}));
  }
  if(tick&&!tick.postTechnique&&new Error().stack?.includes('spaceTeammates'))capture('postTechnique',sim.intents[actor.idx]);
  return pic;
 }) as typeof sim.see;
 const planned=brain.plannedClimb.bind(brain),attack=brain.attack.bind(brain),update=brain.update.bind(brain);
 brain.plannedClimb=(a:any,s:any,b:any,strike:number)=>{
  const old=brain.climbRead,answer=planned(a,s,b,strike);
  capture('plannedReturn',answer);capture('read',{...brain.climbRead,target:brain.climbRead.target.slot});
  if(old!==brain.climbRead){
   const preview=previewFreeMovement(structuredClone(a.body),answer,s.t,26,s.world.handContact);
   capture('heldCommandPreview',{strike,path:preview,decision:s.trace.data.decisions.at(-1)});
  }
  return answer;
 };
 brain.attack=(...args:any[])=>{const answer=attack(...args);capture('attackReturn',answer);return answer;};
 brain.update=(...args:any[])=>{const answer=update(...args);capture('raw',answer);return answer;};
 const intents=sim.intents;
 sim.intents=new Proxy(intents,{set(a,key,value){
  if(tick&&key===String(actor.idx))tick.writes.push(structuredClone({intent:value,caller:new Error().stack?.split('\n').slice(2,5)}));
  return Reflect.set(a,key,value);
 }});
 while(sim.phase==='live'&&sim.t<3.5){
  if(performance.now()-start>12000)throw Error('bounded two-case wall budget');
  tick={t:sim.t,body:structuredClone(actor.body),targetBody:structuredClone(target.body),
   held:!!actor.engagement,joints:sim.world.joints.filter(j=>j.a===actor.body||j.b===actor.body).map(j=>({kind:j.kind})),pictures:[],writes:[]};
  sim.tick();tick.final=structuredClone(sim.intents[actor.idx]);tick.after=structuredClone(actor.body);
  tick.targetAfter=structuredClone(target.body);tick.kind=brain.plan.kind;
  tick.distance=Math.hypot(actor.pos.x-target.pos.x,actor.pos.y-target.pos.y);
  if(tick.kind==='climb')samples.push(tick);
  frames.push(structuredClone(sim.frames.at(-1)));
 }
 const originals=c.expected.frames.filter((f:any)=>f.t>=0&&f.t<=3.5);
 const emitted=sim.frames.filter(f=>f.t>=0&&f.t<=3.5);
 const first=emitted.find((f,i)=>JSON.stringify(f)!==JSON.stringify(originals[i]));
 rows.push({id:c.id,actor:actor.slot,firstRecordedDifference:first?.t??null,
  handoffAt:sim.handoffAt,events:sim.events,decisions:sim.trace.data?.decisions,samples,
  frames:emitted,bodyIds:sim.agents.map(a=>({idx:a.idx,slot:a.slot}))});
}
const output='out/run-failed-exchange/climb-path.json.gz';
writeFileSync(output,gzipSync(JSON.stringify({source:sourceVersion(),elapsedSeconds:(performance.now()-start)/1000,rows})));
console.log(JSON.stringify(rows.map(({samples,events,decisions,frames,...r})=>({...r,samples:samples.length,firstPlan:samples.find((s:any)=>s.read)?.t}))));
