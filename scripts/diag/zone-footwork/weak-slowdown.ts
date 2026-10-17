/** One saved adverse continuation: observe existing RB decisions and spacing
 * acquisitions without issuing reads, forecasts, RNG draws or new commands. */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {sourceVersion} from '../../source-version.js';
import {makeSim} from './inputs.js';

const [output,reference]=process.argv.slice(2);
if(!output||!reference)throw Error('Explicit output and compatible saved tape required');
const saved=JSON.parse(gunzipSync(readFileSync(reference)).toString());
const source=sourceVersion();if(saved.source!==source)throw Error('Saved source mismatch');
const old=saved.rows.find((r:any)=>r.id==='wz-weak');if(!old)throw Error('Missing saved weak case');
const sim=makeSim(old.spec),rb=sim.slot('RB')!,rows:any[]=[];
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const initial=sim.agents.map(a=>({idx:a.idx,slot:a.slot,player:a.player,body:structuredClone(a.body)}));
if(hash(initial)!==old.initialHash)throw Error('Initial inputs mismatch');
let decided=0,postDecision=false,current:any=null,lastPeer:any=null;
const see=sim.see.bind(sim);
sim.see=(observer,target,delayScale)=>{
 const result=see(observer,target,delayScale);
 if(current&&postDecision&&observer===rb&&target.team===rb.team){
  lastPeer={slot:target.slot,idx:target.idx,seen:structuredClone(result),called:null};
  current.peers.push(lastPeer);
 }else lastPeer=null;
 return result;
};
const installed=new WeakSet<object>();
function install():void { for(const a of sim.agents){
 const behavior=a.behavior,update=behavior.update.bind(behavior);
 if(installed.has(behavior))continue;
 installed.add(behavior);
 behavior.update=(actor,game)=>{
  const command=update(actor,game);
  if(current&&actor===rb)current.decision=structuredClone(command);
  if(++decided===sim.agents.length)postDecision=true;
  return command;
 };
 if(behavior.calledMotion){
  const called=behavior.calledMotion.bind(behavior);
  behavior.calledMotion=()=>{
   const result=called();
   if(lastPeer?.idx===a.idx)lastPeer.called=structuredClone(result);
   return result;
  };
 }
} }
let tick=0;
while(sim.phase==='live'&&sim.t<2.65-1e-8){
 install();
 decided=0;postDecision=false;lastPeer=null;
 current=sim.t>=1.85-1e-8?{t:sim.t,own:structuredClone(rb.body),peers:[]}:null;
 sim.tick();
 const prior=old.frames[tick++];
 if(JSON.stringify(sim.agents.map(a=>a.body))!==JSON.stringify(prior.bodies)
   ||JSON.stringify(sim.intents)!==JSON.stringify(prior.commands))throw Error('Observer changed or failed to reproduce saved continuation');
 if(current){current.final=structuredClone(sim.intents[rb.idx]);rows.push(current);}
}
if(source!==sourceVersion())throw Error('Engine changed during diagnostic');
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify({source,initialHash:old.initialHash,observedTicks:tick,
 exactSavedCommandsAndBodies:true,rows},null,2)+'\n');
console.log(JSON.stringify({source,observedTicks:tick,exactSavedCommandsAndBodies:true,
 changes:rows.filter(r=>JSON.stringify(r.decision.vel)!==JSON.stringify(r.final.vel))
  .map(r=>({t:r.t,decision:r.decision.vel,final:r.final.vel}))}));
