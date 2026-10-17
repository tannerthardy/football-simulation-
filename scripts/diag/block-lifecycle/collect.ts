/** Passive native lifecycle ledger. No extra see calls, draws or previews. */
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {RunBlocker} from '../../../src/sim/behaviors/blocking.js';
import {runContactObservers} from '../../../src/sim/run-contact-observer.js';
import {traits} from '../../../src/sim/engagement.js';
import {sourceVersion} from '../../source-version.js';
import {makeSaved,savedInputs} from './saved.js';
import type {Engagement} from '../../../src/sim/agent.js';

const output=process.argv[2];if(!output)throw Error('explicit output required');
const only=process.argv.find(v=>v.startsWith('--only='))?.slice(7).split(',');
const until=Number(process.argv.find(v=>v.startsWith('--until='))?.slice(8)??10);
if(!Number.isFinite(until)||until<=0||until>10)throw Error('until must be in (0,10]');
const start=performance.now(),rows=[];
const copy=(v:any)=>structuredClone(v);
for(const c of savedInputs().cases.filter((c:any)=>!only||only.includes(c.id))){
 const sim=makeSaved(c),reads:any[]=[],calls:any[]=[],contact:any[]=[],writes:any[]=[],frames:any[]=[];
 const initialRng=copy(sim.rng),focused=new Set(['Y','SS','CB_S','CB_W','LG','LB_M','C','DT_S']);
 const ids=new WeakMap<Engagement,number>();let sequence=0;
 const id=(e:Engagement)=>{if(!ids.has(e))ids.set(e,++sequence);return ids.get(e)!;};
 const rep=(e:Engagement)=>({id:id(e),start:e.start,a:e.blocker.slot,b:e.defender.slot,
  helpers:e.helpers.map(a=>a.slot),control:e.control,phi:e.phi,win:e.win,nextMoveAt:e.nextMoveAt,
  drive:copy(e.drive),axis:copy(e.surfaceAxis??null),holding:e.holding,
  hands:e.hands?{actor:e.hands.actor===e.blocker.body?'blocker':'defender',extension:e.hands.extension,
   normalForce:e.hands.normalForce,tangentForce:e.hands.tangentForce,push:e.hands.push,hold:e.hands.hold,steer:e.hands.steer}:null});
 const caller=()=>new Error().stack?.split('\n').find(v=>/stepRunRep|spaceTeammates|updateEngagements|runContactRead|RunBlocker|PlaySim.tick|helperIntents/.test(v))?.trim()??null;
 const see=sim.see.bind(sim);
 sim.see=(a,b,scale=1)=>{const picture=see(a,b,scale);
  if(focused.has(a.slot))reads.push({t:sim.t,a:a.slot,b:b.slot,caller:caller(),picture:copy(picture)});
  return picture;
 };
 for(const a of sim.offense)if(a.behavior instanceof RunBlocker){
  const behavior=a.behavior as any;
  for(const name of ['availableTarget','findWork']){
   const method=behavior[name].bind(behavior);
   behavior[name]=(...args:any[])=>{const before=behavior.target?.slot??null,result=method(...args);
    calls.push({t:sim.t,a:a.slot,method:name,before,result:result?.slot??null,kind:behavior.plan.kind});return result;};
  }
 }
 const engage=sim.engage.bind(sim);
 sim.engage=(a,b,type,drive=null,surface)=>{const result=engage(a,b,type,drive,surface);
  calls.push({t:sim.t,method:'engage',a:a.slot,b:b.slot,success:!!result,rep:result?rep(result):null});return result;};
 const disengage=sim.disengage.bind(sim);
 sim.disengage=e=>{calls.push({t:sim.t,method:'disengage',rep:rep(e)});disengage(e);};
 (sim as any).intents=new Proxy(sim.intents,{set(array,key,value){
  const index=typeof key==='string'&&/^\d+$/.test(key)?Number(key):-1;
  if(index>=0&&focused.has(sim.agents[index].slot))writes.push({t:sim.t,a:sim.agents[index].slot,caller:caller(),command:copy(value)});
  return Reflect.set(array,key,value);
 }});
 runContactObservers.set(sim,(e,phase,data)=>contact.push({t:sim.t,rep:rep(e),phase,data:copy(data)}));
 const caseStart=performance.now();let maxResidual=0,maxArmExcess=0,maxSupportExcess=0;
 while(sim.phase==='live'&&sim.t<until){
  if(performance.now()-caseStart>10000)throw Error('wall budget');const t=sim.t;sim.tick();
  const r=sim.lastStep!;maxResidual=Math.max(maxResidual,Math.abs(r.work.residual));
  for(let i=0;i<sim.agents.length;i++){
   maxArmExcess=Math.max(maxArmExcess,r.armImpulse[i]-r.armImpulseLimit[i],r.armWork[i]-r.armWorkLimit[i]);
   maxSupportExcess=Math.max(maxSupportExcess,r.supportMotorWork[i]-r.supportMotorWorkLimit[i]);
  }
  frames.push({t,stateT:sim.t,carrier:sim.carrier?.slot??null,
   bodies:sim.agents.map(a=>({slot:a.slot,pos:copy(a.pos),vel:copy(a.vel),facing:a.facing,
    support:copy(a.body.support),intent:copy(sim.intents[a.idx]),kind:a.behavior.kind,
    target:a.behavior instanceof RunBlocker?a.behavior.target?.slot??null:null,
    shedAttempt:a.tags.has('shed-attempt')})),reps:sim.engagements.map(rep),
   contacts:r.contacts.map(v=>({...v,a:sim.agents[v.i].slot,b:sim.agents[v.j].slot}))});
 }
 runContactObservers.delete(sim);
 let firstNativeDifference:any=null;
 for(const f of c.expected.frames){const actual=sim.frames.find(v=>v.t===f.t);
  if(!actual)continue;
  if(JSON.stringify(actual.agents)!==JSON.stringify(f.agents)||actual.carrier!==f.carrier){
   firstNativeDifference={t:f.t,actual,expected:f};break;
  }
 }
 const terminal=sim.phase!=='live',result=terminal?sim.buildResult():null;
 const row={id:c.id,source:sourceVersion(),elapsedSeconds:(performance.now()-caseStart)/1000,
  terminal,t:sim.t,outcome:result?.outcome??`explicit${until}secondcensor`,gain:result?.offenseYards??null,
  initialRng,expectedInitialRng:c.observation.seedState,firstNativeDifference,maxResidual,maxArmExcess,maxSupportExcess,
  handoffAt:sim.handoffAt,events:sim.events,traits:sim.agents.map(a=>({slot:a.slot,profile:a.profile,trench:traits(a,'run')})),
  reads,calls,contact,writes,frames};rows.push(row);
 console.log(JSON.stringify({...row,traits:undefined,reads:undefined,calls:undefined,contact:undefined,writes:undefined,frames:undefined,
  events:row.events.filter(v=>['handoff','shed','holding','tackle','touchdown'].includes(v.type))}));
}
writeFileSync(output,gzipSync(JSON.stringify({source:sourceVersion(),elapsedSeconds:(performance.now()-start)/1000,
 qualification:'Fresh native all-player reconstruction; recorded-precision fidelity is measured, not hidden-state restoration. t is the request tick, stateT is achieved after that tick.',rows})));
