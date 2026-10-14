/** One RT-only ordinary-command counterfactual; all22 players remain native. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {CENTER_Y} from '../../../src/core/field.js';
import {Rng} from '../../../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../../../src/league/team.js';
import {RUN_BY_ID} from '../../../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../../../src/playbook/formations.js';
import {Agent} from '../../../src/sim/agent.js';
import {RunBlocker} from '../../../src/sim/behaviors/blocking.js';
import {PlaySim} from '../../../src/sim/playsim.js';
import {runContactObservers} from '../../../src/sim/run-contact-observer.js';
import {runReadObservers} from '../../../src/sim/run-read-observer.js';
import {sourceVersion} from '../../source-version.js';

const caseId=process.argv[2]??'uc12-wz-s3-mirror';
assert(['uc12-wz-s3-mirror','uc12-wz-s3'].includes(caseId));
const manifest=JSON.parse(readFileSync('docs/reviews/run-drills/input-manifest.json','utf8'));
const serialize=(v:unknown)=>JSON.stringify(v,(_k,x:unknown)=>x instanceof Agent?{agent:x.idx}
  :x instanceof PlaySim?{sim:true}:x instanceof Map?[...x]:x instanceof Set?[...x]:x instanceof Float64Array?[...x]:x);
const snap=(v:unknown):any=>v===undefined?null:JSON.parse(serialize(v));
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const bytes=readFileSync(manifest.reference.packetPath);
assert.equal(sha(bytes),manifest.reference.sha256);
const reference=JSON.parse(gunzipSync(bytes).toString());
const row=reference.panel.find((r:any)=>r.input.id===caseId);assert(row);
assert.equal(process.version,manifest.node);assert.equal(sourceVersion(),manifest.sourceSha256);
assert.deepEqual(Object.fromEntries(Object.keys(manifest.flags).map(k=>[k,process.env[k]??null])),manifest.flags);
const input=row.input,recipe=reference.manifest,formation=FORMATION_BY_ID[input.formation];
assert.equal(recipe.ballY,CENTER_Y);
const started=performance.now();
const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(input.o),'O','O',{strength:recipe.strength}),formation.personnel),
  defense:pickDefense(generateTeam(new Rng(input.d),'D','D',{strength:recipe.strength}),'base43'),
  offCall:{formation,flip:input.flip,kind:'run',run:RUN_BY_ID[input.concept],label:input.id},
  defCall:{personnel:'base43',front:FRONT_BY_ID[input.front],coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over Cover 3'},
  los:recipe.los,ballY:CENTER_Y,firstDownX:recipe.firstDownX,seed:input.seed});
const rt=sim.slot('RT')!;assert(rt.behavior instanceof RunBlocker);
const initialProfiles=serialize(sim.agents.map(a=>a.profile));
const hashes:string[]=[],frames:any[]=[],pictures:any[]=[],phases:any[]=[],reads:any[]=[],actions:any[]=[];
let attempted=false,held:NonNullable<RunBlocker['zoneRead']>|null=null;
let firstAction:number|null=null,firstRead:any=null,finishedAction:any=null,crossing:number|null=null;
const see=sim.see.bind(sim);
sim.see=(a,b,scale)=>{const seen=see(a,b,scale);if(sim.t>=1.5)
  pictures.push({t:sim.t,actor:a.idx,target:b.idx,seen:snap(seen),caller:new Error().stack?.split('\n')[2]?.trim()});return seen;};
runReadObservers.set(sim,e=>{if(sim.t>=1.5)reads.push(snap(e));});
runContactObservers.set(sim,(e,phase,data)=>{
  if(sim.t>=1.5)phases.push({t:sim.t,phase,rep:snap(e),data:snap(data)});
  if(phase!=='movement'||e.blocker!==rt||e.helpers.length)return;
  const behavior=rt.behavior as RunBlocker,read=behavior.zoneRead;
  if(!read||read.target!==e.defender.idx)return;
  if(!attempted){
    attempted=true;
    firstRead={t:sim.t,read:snap(read),anchored:data.anchored,original:snap(sim.intents[rt.idx]),own:snap(rt.body)};
    if(read.phase==='runoff'&&read.seen.vel.y*read.side>0&&!data.anchored&&rt.body.support?.state==='up')held=read;
  }
  if(held&&held!==read){finishedAction={t:sim.t,reason:'Existing zone read renewed',read:snap(read)};held=null;}
  if(!held)return;
  if(data.anchored||rt.body.support?.state!=='up'){
    finishedAction={t:sim.t,reason:'Preserve existing anchor or support response'};held=null;return;
  }
  // Own held read only. No new see(), target state, strength, posture, or forecast.
  // Zero requested depth is not zero achieved motion; ordinary loaded World runs.
  const original=sim.intents[rt.idx],changed={...original,vel:{x:0,y:held.seen.vel.y}};
  const {vel:_v,...rest}=changed,{vel:_o,...originalRest}=original;assert.deepEqual(rest,originalRest);
  firstAction??=sim.t;
  actions.push({t:sim.t,actor:rt.idx,original:snap(original),changed:snap(changed),consumedRead:snap(held)});
  sim.intents[rt.idx]=changed;
});
const flatten=(j:any)=>{const{a,b,actor,holder,...rest}=j;return snap({...rest,a:sim.world.indexOf(a),b:sim.world.indexOf(b),
  ...(actor===undefined?{}:{actor:sim.world.indexOf(actor)}),...(holder===undefined?{}:{holder:sim.world.indexOf(holder)})});};
const step=sim.world.step.bind(sim.world);
sim.world.step=(intents,dt)=>{
  const f=sim.t>=1.5?{t:sim.t,after:sim.t+dt,dt,beforeBodies:snap(sim.agents.map(a=>a.body)),intents:snap(intents),
    requested:snap(Reflect.get(sim,'cmds')),engagements:snap(sim.engagements),jointInputs:sim.world.joints.map(flatten),
    behavior:sim.agents.map(a=>snap(a.behavior))}:null;
  const report=step(intents,dt);
  if(f)frames.push({...f,afterBodies:snap(sim.agents.map(a=>a.body)),jointOutputs:sim.world.joints.map(flatten),report:snap(report)});
  return report;
};
while(sim.phase==='live'&&sim.t<25-1e-9&&performance.now()-started<10000){
  const t=sim.t;sim.tick();
  const state={t:sim.t,rng:sim.rng,events:sim.events,perception:sim.perception,
    agents:sim.agents.map(a=>({body:a.body,mind:a.mind,recog:a.recog,behavior:a.behavior,tags:a.tags})),
    engagements:sim.engagements,joints:sim.world.joints,intents:sim.intents,cmds:Reflect.get(sim,'cmds')};
  const hash=sha(serialize(state));hashes.push(hash);
  if(firstAction===null||t<firstAction)assert.equal(hash,row.hashes[hashes.length-1],'Native prefix differs before intervention');
  if(crossing===null&&sim.carrier?.slot==='RB'&&sim.carrier.pos.x>=sim.los)crossing=sim.t;
}
assert.equal(serialize(sim.agents.map(a=>a.profile)),initialProfiles);
assert.equal(sourceVersion(),manifest.sourceSha256);
const result=sim.buildResult(),first=sim.events.find(e=>e.type==='carrier_contact');
const packet={protocol:'rt-recovery-counterfactual-v1',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  sourceSha256:sourceVersion(),node:process.version,input,recipe,flags:manifest.flags,worldDefaults:manifest.worldDefaults,
  referenceSha256:manifest.reference.sha256,action:'First solo read: depth-neutral matching of acquired wide flow for the existing read beat; anchor preserved.',
  firstRead,firstAction,finishedAction,prefixExact:true,prefixTicks:firstAction===null?hashes.length:Math.round(firstAction/sim.dt),
  naturalRunner:true,all22:true,profilesUnchanged:true,otherControllersChanged:false,spacingChanged:false,contactChanged:false,
  summary:{complete:sim.phase!=='live'&&result.outcome!=='timeout',censored:sim.phase==='live',duration:sim.t,crossing,
    gain:result.yards,result:snap(result),firstContact:first?{t:first.t,actor:first.a,opponent:first.b,note:first.note,
      depth:sim.firstContactX===null?null:sim.firstContactX-sim.los}:null},
  actions,hashes,frames,pictures,phases,reads,events:snap(sim.events),elapsedSeconds:(performance.now()-started)/1000};
mkdirSync('out/rt-recovery',{recursive:true});
writeFileSync(`out/rt-recovery/${caseId}.json.gz`,gzipSync(serialize(packet)));
console.log(JSON.stringify({caseId,firstAction,firstRead:firstRead?{t:firstRead.t,phase:firstRead.read.phase,anchored:firstRead.anchored}:null,
  finishedAction,actions:actions.length,prefixTicks:packet.prefixTicks,...packet.summary,result:undefined,elapsedSeconds:packet.elapsedSeconds}));
