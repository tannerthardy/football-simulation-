/** Passive unit-wide opening capture, with exact request -> execution alignment. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync,gzipSync} from 'node:zlib';
import {Rng} from '../../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../../src/league/team.js';
import {RUN_BY_ID} from '../../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../../src/playbook/formations.js';
import {Agent} from '../../src/sim/agent.js';
import {RunBlocker} from '../../src/sim/behaviors/blocking.js';
import {PlaySim} from '../../src/sim/playsim.js';
import {runContactObservers} from '../../src/sim/run-contact-observer.js';
import {sourceVersion} from '../source-version.js';

const args=process.argv.slice(2);
let arm='flow',stop=3,from=0,out='out/wide-zone-flow/candidate.json.gz',fresh=false;
let expected:string|null=null;
let diagnosticBypass=false;
let selectedCases:string[]|null=null;
let verifyPrefix:string|null=null;
while(args.length){const k=args.shift();
  if(k==='--arm')arm=args.shift()!;
  else if(k==='--stop')stop=Number(args.shift());
  else if(k==='--from')from=Number(args.shift());
  else if(k==='--out')out=args.shift()!;
  else if(k==='--expected-source')expected=args.shift()!;
  else if(k==='--fresh')fresh=true;
  else if(k==='--diagnostic-rt-opening-bypass')diagnosticBypass=true;
  else if(k==='--cases')selectedCases=args.shift()!.split(',');
  else if(k==='--verify-prefix')verifyPrefix=args.shift()!;
  else throw Error(`Unknown argument ${k}`);
}
assert(stop>0&&stop<=3&&from>=0&&from<stop);
assert(!diagnosticBypass,'Flow validation may not inject movement overrides');
const manifest=JSON.parse(readFileSync('config/wide-zone-flow.json','utf8'));
const baseline=JSON.parse(readFileSync('config/baseline.json','utf8'));
const sha=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');
const serialize=(v:unknown)=>JSON.stringify(v,(_k,x:unknown)=>x instanceof Agent?{agent:x.idx}
  :x instanceof PlaySim?{sim:true}:x instanceof Map?[...x]:x instanceof Set?[...x]:x instanceof Float64Array?[...x]:x);
const snap=(v:unknown):any=>v===undefined?null:JSON.parse(serialize(v));
const bytes=readFileSync('data/reviews/current/ace-production-observations.json.gz');
assert.equal(sha(bytes),'ad462904b23c6864d902107f6a0aa3a876b4e35d3247db8dfaebb835276ae10b');
const reference=JSON.parse(gunzipSync(bytes).toString());
const prefixBytes=verifyPrefix?readFileSync(verifyPrefix):null;
const prefix=prefixBytes?JSON.parse(gunzipSync(prefixBytes).toString()):null;
const flags=Object.fromEntries(Object.keys(baseline.flags).map(k=>[k,process.env[k]??null]));
assert.deepEqual(flags,baseline.flags);assert.equal(Object.keys(flags).length,44);
assert.equal(process.version,'v22.23.3');
const source=sourceVersion();expected??=arm==='accepted'?manifest.acceptedSource:manifest.awarenessSource;
assert.equal(source,expected);
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const started=performance.now(),panel:any[]=[];
const inputs=(fresh?[manifest.freshTransferDeclaredBeforeResults]:manifest.inputs)
 .filter((i:any)=>!selectedCases||selectedCases.includes(i.id));
assert(inputs.length>0&&(!selectedCases||inputs.length===selectedCases.length));
for(const input of inputs){
 const recipe=reference.manifest,formation=FORMATION_BY_ID[input.formation];
 const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(input.o),'O','O',{strength:recipe.strength}),formation.personnel),
  defense:pickDefense(generateTeam(new Rng(input.d),'D','D',{strength:recipe.strength}),'base43'),
  offCall:{formation,flip:input.flip,kind:'run',run:RUN_BY_ID[input.concept],label:input.id},
  defCall:{personnel:'base43',front:FRONT_BY_ID[input.front],coverage:COVERAGE_BY_ID.cover3,pressure:null,label:input.front+' Cover3'},
  los:recipe.los,ballY:recipe.ballY,firstDownX:recipe.firstDownX,seed:input.seed});
 assert.equal(sim.agents.length,22);assert(FRONT_BY_ID[input.front]);
 const initializedInformation=snap(Reflect.get(sim,'teammateAwareness'));
 const actors=sim.agents.map(a=>({idx:a.idx,slot:a.slot,team:a.team,player:snap(a.player),profile:snap(a.profile),
  initialBody:snap(a.body),initialBehavior:snap(a.behavior)}));
 const frames:any[]=[],writes:any[]=[],cues:any[]=[],methods:any[]=[],phases:any[]=[],hashes:string[]=[],informationHashes:string[]=[],actions:any[]=[];
 const liveCapture=()=>sim.t>=from-1e-9;
 const interesting=(a:Agent)=>true;
 const caller=()=>new Error().stack?.split('\n').slice(3,6).map(s=>s.trim());
 sim.intents=new Proxy(sim.intents,{set(target,key,value){
  if(liveCapture()&&Number.isInteger(Number(key)))writes.push({t:sim.t,actor:Number(key),intent:snap(value),caller:caller()});
  return Reflect.set(target,key,value);
 }});
 const see=sim.see.bind(sim);
 sim.see=(a,b,scale)=>{const c=caller(),v=see(a,b,scale);
  if(liveCapture()&&interesting(a))cues.push({t:sim.t,observer:a.idx,target:b.idx,kind:'legacy-see',picture:snap(v),caller:c});return v;};
 const query=Reflect.get(sim,'teammateInformation');
 if(typeof query==='function')Reflect.set(sim,'teammateInformation',(a:Agent,b:Agent)=>{
  const c=caller(),v=query.call(sim,a,b);
  if(liveCapture()&&interesting(a))cues.push({t:sim.t,observer:a.idx,target:b.idx,kind:'owned-teammate-information',picture:snap(v),caller:c});return v;
 });
 for(const a of sim.agents){
  const b=a.behavior;
  if(!(b instanceof RunBlocker)||!interesting(a))continue;
  for(const name of ['zoneFlow','attack','plannedClimb','readZone']){
   const fn=Reflect.get(b,name);
   if(typeof fn!=='function')continue;
   Reflect.set(b,name,function(...xs:any[]){
    const before=snap(b),cueAt=cues.length,v=fn.apply(b,xs);
    if(liveCapture())methods.push({t:sim.t,actor:a.idx,name,before,after:snap(b),request:snap(v),cueFrom:cueAt,cueTo:cues.length});
    return v;
   });
  }
 }
 runContactObservers.set(sim,(e,phase,data)=>{if(liveCapture())phases.push({t:sim.t,phase,rep:snap(e),data:snap(data)});});
 const flatten=(j:any)=>{const{a,b,actor,holder,...rest}=j;return snap({...rest,a:sim.world.indexOf(a),b:sim.world.indexOf(b),
  ...(actor===undefined?{}:{actor:sim.world.indexOf(actor)}),...(holder===undefined?{}:{holder:sim.world.indexOf(holder)})});};
 const step=sim.world.step.bind(sim.world);
 let frame:any=null;
 sim.world.step=(intents,dt)=>{
  // Diagnostic cause isolation only. Not a production policy: one actor's
  // first opening beat, no peer removal or new observation/future command.
  if(diagnosticBypass&&sim.t>=.05-1e-9&&sim.t<.25-1e-9){
   const rt=sim.slot('RT')!,raw=Reflect.get(sim,'cmds')[rt.idx];
   if(!rt.engagement&&!sim.world.joints.some(j=>j.a===rt.body||j.b===rt.body)){
    actions.push({t:sim.t,actor:rt.idx,original:snap(intents[rt.idx]),changed:snap(raw),
     preActionBodiesSha256:sha(serialize(sim.agents.map(a=>a.body))),
     preActionInformationSha256:sha(serialize(Reflect.get(sim,'teammateAwareness'))),rngSha256:sha(serialize(sim.rng))});
    assert.equal(intents,sim.intents);
    sim.intents[rt.idx]={...sim.intents[rt.idx],vel:{...raw.vel}};
   }
  }
  frame=liveCapture()?{t:sim.t,after:Math.round((sim.t+dt)*100)/100,dt,beforeBodies:snap(sim.agents.map(a=>a.body)),
   requested:snap(Reflect.get(sim,'cmds')),final:snap(intents),behavior:sim.agents.map(a=>snap(a.behavior)),
   recognition:sim.agents.map(a=>snap(a.recog)),runFits:sim.agents.map(a=>snap(a.runFit)),
   engagements:snap(sim.engagements),jointInputs:sim.world.joints.map(flatten),pending:(Reflect.get(sim.world,'pending') as any[]).map(flatten),
   observerState:snap(Reflect.get(sim,'teammateAwareness')),rngBefore:snap(sim.rng)}:null;
  const r=step(intents,dt);
  if(frame)frames.push({...frame,afterBodies:snap(sim.agents.map(a=>a.body)),jointOutputs:sim.world.joints.map(flatten),report:snap(r)});
  return r;
 };
 const caseStarted=performance.now();
 while(sim.phase==='live'&&sim.t<stop-1e-9){
  assert(performance.now()-started<manifest.maximumBatchWallSeconds*1000,'Declared opening batch budget exceeded');
  sim.tick();
  const state={t:sim.t,rng:sim.rng,events:sim.events,perception:sim.perception,
   agents:sim.agents.map(a=>({body:a.body,mind:a.mind,recog:a.recog,behavior:a.behavior,tags:a.tags})),
   engagements:sim.engagements,joints:sim.world.joints,intents:sim.intents,cmds:Reflect.get(sim,'cmds')};
  hashes.push(sha(serialize(state)));
  informationHashes.push(sha(serialize({...state,teammateAwareness:Reflect.get(sim,'teammateAwareness')})));
 }
 runContactObservers.delete(sim);
 const old=reference.panel.find((r:any)=>r.input.id===input.id);
 if(arm==='accepted'&&!fresh)assert.deepEqual(hashes,old.hashes.slice(0,hashes.length),'Passive capture changed accepted full-state/RNG prefix');
 if(prefix){
  const prior=prefix.panel.find((p:any)=>p.input.id===input.id);
  assert(prior,'Missing declared prefix case');
  assert.equal(source,prefix.sourceSha256);
  assert.deepEqual(hashes.slice(0,prior.hashes.length),prior.hashes,'Body/controller/RNG prefix changed');
  assert.deepEqual(informationHashes.slice(0,prior.informationHashes.length),prior.informationHashes,'Information prefix changed');
 }
 panel.push({input,actors,initializedInformation,initializedInformationSha256:sha(serialize(initializedInformation)),
  restoredFromSnap:true,censored:sim.phase==='live',end:sim.t,frames,writes,cues,methods,phases,hashes,informationHashes,actions,
  handoffAt:sim.handoffAt,events:snap(sim.events),outcome:snap(sim.outcome),
  elapsedSeconds:(performance.now()-caseStarted)/1000});
 console.log(JSON.stringify({arm,id:input.id,ticks:hashes.length,capturedFrames:frames.length,seconds:panel.at(-1).elapsedSeconds}));
}
assert.equal(sourceVersion(),source);
const result={protocol:'wide-zone-opening-capture-v1',arm,revision,sourceSha256:source,flags,worldDefaults:baseline.worldDefaults,
 diagnosticBypass,productionCorrection:source!==manifest.awarenessSource,
 verifiedPrefixSha256:prefixBytes?sha(prefixBytes):null,
 historicalComparison:manifest.historicalComparison,acceptedDevelop:manifest.acceptedDevelop,awarenessHead:manifest.awarenessHead,
 initialization:manifest.initialization,referencePacketSha256:sha(bytes),manifestSha256:sha(readFileSync('config/wide-zone-flow.json')),
 collectorSha256:sha(readFileSync('scripts/diag/wide-zone-flow.ts')),node:process.version,lockSha256:sha(readFileSync('package-lock.json')),
 from,stop,panel,newWorldSteps:panel.reduce((n,p)=>n+p.hashes.length,0),newSimulationPlays:panel.length,newGames:0,
 elapsedSeconds:(performance.now()-started)/1000};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,gzipSync(serialize(result)));
console.log(JSON.stringify({out,source,seconds:result.elapsedSeconds,newWorldSteps:result.newWorldSteps}));
