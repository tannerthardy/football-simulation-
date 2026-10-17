import {readFileSync,writeFileSync}from'node:fs';
import {createHash}from'node:crypto';
import {gzipSync,gunzipSync}from'node:zlib';
import {makeSim,rosters}from'../../scripts/diag/box-defense-review/inputs.js';
import {movementObjective}from'../../src/sim/movement-objective.js';
import {runThrough}from'../../src/sim/behaviors/common.js';
import {sourceVersion}from'../../scripts/source-version.js';
const mode=process.argv[2],output=process.argv[3];if(!['baseline','through'].includes(mode)||!output)throw Error('mode/outputrequired');
const input={concept:'wz',dir:'weak' as const,look:'over3',roster:'pair11',seed:77,formation:'ace_12'};
const sim=makeSim(input,rosters()),actor=sim.slot('LG')!,behavior:any=actor.behavior,update=behavior.update.bind(behavior);
const choices:any[]=[],frames:any[]=[],initial=structuredClone(sim.agents.map(a=>({slot:a.slot,body:a.body,profile:a.profile})));let pending:any=null;
behavior.update=(...args:Parameters<typeof actor.behavior.update>)=>{
 const command=update(...args),goal=movementObjective(command);
 pending=null;
 if(!actor.engagement&&behavior.plan.departure&&goal?.kind==='moving'){
  const alternative={...command,vel:runThrough(actor,goal.point,{speed:1}).vel};
  pending=structuredClone({t:sim.t,normal:command,alternative,goal,pos:actor.pos,vel:actor.vel,
   ownRead:behavior.departureRead,decisionInterval:actor.mind.decisionInterval});
  return mode==='through'?alternative:command;
 }
 return command;
};
const start=performance.now();let error:string|null=null;
while(sim.phase==='live'&&sim.t<20){
 if(performance.now()-start>10000){error='wallbudget';break;}
 try{sim.tick();}catch(e){error=String(e);break;}
 if(pending)choices.push({...pending,final:structuredClone(sim.intents[actor.idx])});
 frames.push({t:sim.t,bodies:sim.agents.map(a=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing,request:structuredClone(sim.intents[a.idx]),support:structuredClone(a.body.support)})),
  loads:sim.engagements.flatMap(e=>[[e.blocker,e.hands]as const,...(e.helperHands?.entries()??[])].map(([a,h])=>({blocker:a.slot,defender:e.defender.slot,force:Math.hypot(h?.normalForce??0,h?.tangentForce??0)}))),
  impacts:sim.lastStep!.contacts.filter(p=>p.impulse>0&&sim.agents[p.i].team==='O'&&sim.agents[p.j].team==='O').map(p=>({a:sim.agents[p.i].slot,b:sim.agents[p.j].slot,impulse:p.impulse}))});
}
let cachedExact:boolean|null=null;
if(mode==='baseline'){
 const cached=JSON.parse(gunzipSync(readFileSync('out/stretch-access/final-interaction.json.gz')).toString()).rows.find((r:any)=>r.id==='wz-weak-over3');
 cachedExact=frames.length===cached.frames.length&&frames.every((f,i)=>f.bodies.every((a:any,j:number)=>['slot','pos','vel','facing'].every(k=>JSON.stringify(a[k])===JSON.stringify(cached.frames[i].bodies[j][k]))));
 if(!cachedExact)error='baseline observer changed cached native';
}
const r=sim.buildResult(),row={input,mode,initial,terminal:sim.phase!=='live',t:sim.t,gain:r.offenseYards,error,cachedExact,choices,frames,events:sim.events};
writeFileSync(output,gzipSync(JSON.stringify({source:sourceVersion(),scriptSha256:createHash('sha256').update(readFileSync('out/weak-departure/through-exit.ts')).digest('hex'),controllerOverride:mode==='through'?'LG requested velocity only, traverse current own acquired exit; normal cadence/waypoint/other fields/spacing/contact/22 reactions':'none; passive wrapper',elapsedSeconds:(performance.now()-start)/1000,rows:[row]})));
console.log(JSON.stringify({mode,t:sim.t,gain:row.gain,cachedExact,error,impacts:frames.filter(f=>f.impacts.length).map(f=>({t:f.t,impacts:f.impacts})),climbs:sim.events.filter(e=>e.type==='block_climb'),contacts:sim.events.filter(e=>['block_contact','carrier_contact','tackle','missed_tackle'].includes(e.type)&&e.t>1),firstChoices:choices.slice(0,3)}));
if(error)process.exitCode=1;
