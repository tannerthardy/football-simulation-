import{writeFileSync,readFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{performance}from'node:perf_hooks';
import{CENTER_Y}from'../../gait-response/baseline-host/src/core/field.js';
import{Rng}from'../../gait-response/baseline-host/src/core/rng.js';
import{generateTeam,pickDefense,pickOffense}from'../../gait-response/baseline-host/src/league/team.js';
import{RUN_BY_ID}from'../../gait-response/baseline-host/src/playbook/concepts.js';
import{COVERAGE_BY_ID,FRONT_BY_ID}from'../../gait-response/baseline-host/src/playbook/defense.js';
import{FORMATION_BY_ID}from'../../gait-response/baseline-host/src/playbook/formations.js';
const base='/workspace/football-simulation-/out/gait-response/baseline-host';
const candidate='/workspace/football-simulation-/out/loaded-movement-audit/candidate/engine';
const inputs=[{id:'wz_strong-s3-mirror',run:'wz_strong',seed:3,flip:true}];
const hash=(o:any)=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const receipt:any={baseline:'2c98bed94adad8087c65f381d4090444ad283985',flags:Object.fromEntries(Object.entries(process.env).filter(([k])=>/GAIT|CONTACT|ANCHOR|RUN_READ/.test(k))),arms:[]};
for(const input of inputs)for(const [arm,host]of[['baseline',base],['candidate',candidate]]){
 const{PlaySim}=await import(host+'/src/sim/playsim.ts');
 const{runContactObservers}=await import(host+'/src/sim/run-contact-observer.ts');
 function execute(observe:boolean){
  const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),FORMATION_BY_ID.ace_11.personnel),defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),offCall:{formation:FORMATION_BY_ID.ace_11,flip:input.flip,kind:'run',run:RUN_BY_ID[input.run],label:input.run},defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'over'},los:40,ballY:CENTER_Y,firstDownX:50,seed:input.seed});
  const initHash=hash(sim.agents.map((a:any)=>a.body));
  const rb=sim.slot('RB'),ticks:any[]=[],contacts:any[]=[];let los:any=null,grip:any=null,maxResidual=0;
  const contactRaw=new Map();
  if(observe){
   runContactObservers.set(sim,(e:any,phase:string,data:any)=>{if(phase==='movement'&&true)contactRaw.set(e.blocker.idx,{defender:e.defender.slot,raw:structuredClone(data.command),feedback:data.feedback,lateral:data.lateral,phase:e.blocker.behavior.zoneRead?.phase??null,axis:data.axis,lat:data.lat,drive:data.drive,normalRequest:data.normalRequest,anchored:data.anchored,defenderPos:structuredClone(e.defender.pos),defenderVel:structuredClone(e.defender.vel),offset:data.offset,wantOffset:data.wantOffset,correction:data.correction});});
   const step=sim.world.step;
   sim.world.step=function(intents:any,dt:number){
    const line=sim.offense.filter((a:any)=>['LT','LG','C','RG','RT'].includes(a.slot));
    const pre=line.map((a:any)=>({slot:a.slot,pos:structuredClone(a.pos),vel:structuredClone(a.vel),facing:a.facing,support:a.body.support.state,command:structuredClone(intents[a.idx]),raw:contactRaw.get(a.idx)??null,plan:{kind:a.behavior.plan?.kind,target:a.behavior.plan?.target?.slot,combination:a.behavior.plan?.combination?{members:a.behavior.plan.combination.members.map((m:any)=>m.slot),released:a.behavior.plan.combination.released,climber:a.behavior.plan.combination.climber?.slot,keeper:a.behavior.plan.combination.keeper?.slot}:null},acquired:a.behavior.zoneRead??null,engagement:a.engagement?{defender:a.engagement.defender.slot,owner:a.engagement.blocker.slot,helpers:a.engagement.helpers.map((h:any)=>h.slot),surfaceAxis:a.engagement.surfaceAxis,drive:a.engagement.drive,normal:a.engagement.hands?.normalForce,tangent:a.engagement.hands?.tangentForce}:null}));
    const r=step.call(this,intents,dt);maxResidual=Math.max(maxResidual,Math.abs(r.work.residual));
    if(sim.carrier===rb&&!los&&rb.pos.x>=sim.los)los={t:sim.t+dt,depth:rb.pos.x-sim.los};
    for(const c of r.contacts)if(c.impulse>0&&(c.i===rb.idx||c.j===rb.idx)&&sim.agents[c.i===rb.idx?c.j:c.i].team!==rb.team)contacts.push({t:sim.t+dt,defender:sim.agents[c.i===rb.idx?c.j:c.i].slot,depth:rb.pos.x-sim.los,impulse:c.impulse});
    if(!grip){const g=this.joints.find((j:any)=>j.kind==='grasp'&&!j.broken&&j.b===rb.body);if(g)grip={t:sim.t+dt,depth:rb.pos.x-sim.los,defender:sim.agents.find((a:any)=>a.body===g.a).slot};}
    ticks.push({t:sim.t,bodyContacts:r.contacts.filter((c:any)=>c.impulse>0).map((c:any)=>({a:sim.agents[c.i].slot,b:sim.agents[c.j].slot,teams:sim.agents[c.i].team+sim.agents[c.j].team,impulse:c.impulse,closing:c.closing})),events:sim.events.filter((e:any)=>Math.abs(e.t-sim.t)<.001),defense:sim.defense.map((a:any)=>({slot:a.slot,pos:structuredClone(a.pos),vel:structuredClone(a.vel),facing:a.facing,support:a.body.support.state,command:structuredClone(intents[a.idx])})),line:pre,after:line.map((a:any)=>({slot:a.slot,pos:structuredClone(a.pos),vel:structuredClone(a.vel),support:a.body.support.state})),rb:{pos:structuredClone(rb.pos),vel:structuredClone(rb.vel)}});
    contactRaw.clear();return r;
   };
  }
  const start=performance.now();while(sim.phase==='live'&&sim.t<2.65)sim.tick();const elapsed=performance.now()-start;
  const end=sim.buildResult();const signature=hash({end:{...end,frames:undefined,telemetry:undefined},bodies:sim.agents.map((a:any)=>a.body),intents:sim.intents,nextRng:sim.rng.nextU32()});
  return{initHash,signature,elapsedMs:elapsed,natural:sim.phase!=='live',stopTime:sim.t,gain:end.yards,reason:end.outcome,los,firstBodyContact:contacts[0]??null,firstGrip:grip,maxWorkResidual:maxResidual,ticks};
 }
 const result=execute(true);
 const plain=input.id==='wz_strong-s3'?execute(false):null;
 if(plain&&plain.signature!==result.signature)throw Error('observer neutrality failed '+arm);
 receipt.arms.push({input,arm,host,source:Object.fromEntries(['src/sim/playsim.ts','src/sim/called-motion.ts','src/physics/kinematics.ts','src/physics/world.ts'].filter(p=>p!=='src/sim/called-motion.ts'||arm==='candidate').map(p=>[p,createHash('sha256').update(readFileSync(host+'/'+p)).digest('hex')])),observerNeutral:plain?plain.signature===result.signature:null,...result});
 console.log(JSON.stringify({input:input.id,arm,neutral:plain?true:null,...Object.fromEntries(Object.entries(result).filter(([k])=>k!=='ticks'))}));
}
writeFileSync('/workspace/football-simulation-/out/loaded-movement-audit/candidate/mirror-diagnosis.json',JSON.stringify(receipt));
