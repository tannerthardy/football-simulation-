/** Saved Ace12 edge-access questions. Observation only, no extra see/RNG calls. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {makeSim,rosters} from './inputs.js';
import {runContactObservers} from '../../../src/sim/run-contact-observer.js';
import {sourceVersion} from '../../source-version.js';
import type {Engagement} from '../../../src/sim/agent.js';
const R=rosters(),rows:any[]=[],start=performance.now();
const out=process.argv[2]??'out/stretch-access/trace.json';
for(const direction of ['strong','weak'] as const){
 const sim=makeSim({concept:'wz',dir:direction,look:'over3',roster:'pair11',seed:77,formation:'ace_12'},R);
 const frames:any[]=[],reads:any[]=[],releases:any[]=[];
 const contact=(e:Engagement)=>({blocker:e.blocker.slot,defender:e.defender.slot,helpers:e.helpers.map(h=>h.slot),
  win:e.win,phi:e.phi,baseB:e.baseB,baseD:e.baseD,control:e.control,surface:e.surfaceAxis,drive:e.drive,sealTarget:e.sealTarget,
  hands:[e.hands,...(e.helperHands?.values()??[])].filter(Boolean).map(j=>({actor:sim.agents.find(a=>a.body===j!.actor)?.slot,
   a:sim.agents.find(a=>a.body===j!.a)?.slot,b:sim.agents.find(a=>a.body===j!.b)?.slot,extension:j!.extension,hold:j!.hold,steer:j!.steer,push:j!.push,
   normal:j!.normalForce,tangent:j!.tangentForce}))});
 runContactObservers.set(sim,(e,phase,data)=>{
  if(e.defender.slot==='DE_S'||e.defender.slot==='DE_W') reads.push({t:sim.t,phase,rep:contact(e),data:structuredClone(data)});
 });
 const release=sim.disengage.bind(sim);
 sim.disengage=e=>{releases.push({t:sim.t,rep:contact(e),events:sim.events.slice(-3)});release(e);};
 while(sim.phase==='live'&&sim.t<3){
  if(performance.now()-start>10000)throw Error('10s budget');
  sim.tick();
  frames.push({t:sim.t,bodies:sim.agents.map(a=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing,support:structuredClone(a.body.support)})),
   reps:sim.engagements.filter(e=>e.defender.slot.startsWith('DE')).map(contact),
   intents:sim.intents.map((i,k)=>({slot:sim.agents[k].slot,...structuredClone(i)})),
   workResidual:sim.lastStep?.work.residual,arm:sim.lastStep?.armImpulse,limits:sim.lastStep?.armImpulseLimit});
 }
 rows.push({direction,los:sim.los,ballY:sim.ballY,frames,reads,releases,events:sim.events});
}
mkdirSync('out/stretch-access',{recursive:true});writeFileSync(out,JSON.stringify({source:sourceVersion(),elapsedSeconds:(performance.now()-start)/1000,rows}));
for(const r of rows)console.log(JSON.stringify({direction:r.direction,firstContact:r.events.find((e:any)=>e.type==='carrier_contact'),
 releases:r.releases.map((p:any)=>({t:p.t,rep:p.rep,events:p.events}))}));
