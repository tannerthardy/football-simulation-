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
const inputs=[{id:'wz_strong-s3',run:'wz_strong',seed:3,flip:false},{id:'wz_strong-s3-mirror',run:'wz_strong',seed:3,flip:true},{id:'iz_strong-s3',run:'iz_strong',seed:3,flip:false}];
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
   runContactObservers.set(sim,(e:any,phase:string,data:any)=>{if(phase==='movement'&&e.blocker.slot==='RG')contactRaw.set(e.blocker.idx,{defender:e.defender.slot,raw:structuredClone(data.command),feedback:data.feedback,lateral:data.lateral,phase:e.blocker.behavior.zoneRead?.phase??null});});
   const step=sim.world.step;
   sim.world.step=function(intents:any,dt:number){
    const line=sim.offense.filter((a:any)=>['LT','LG','C','RG','RT'].includes(a.slot));
    const pre=line.map((a:any)=>({slot:a.slot,pos:structuredClone(a.pos),vel:structuredClone(a.vel),facing:a.facing,support:a.body.support.state,command:structuredClone(intents[a.idx]),raw:contactRaw.get(a.idx)??null}));
    const r=step.call(this,intents,dt);maxResidual=Math.max(maxResidual,Math.abs(r.work.residual));
    if(sim.carrier===rb&&!los&&rb.pos.x>=sim.los)los={t:sim.t+dt,depth:rb.pos.x-sim.los};
    for(const c of r.contacts)if(c.impulse>0&&(c.i===rb.idx||c.j===rb.idx)&&sim.agents[c.i===rb.idx?c.j:c.i].team!==rb.team)contacts.push({t:sim.t+dt,defender:sim.agents[c.i===rb.idx?c.j:c.i].slot,depth:rb.pos.x-sim.los,impulse:c.impulse});
    if(!grip){const g=this.joints.find((j:any)=>j.kind==='grasp'&&!j.broken&&j.b===rb.body);if(g)grip={t:sim.t+dt,depth:rb.pos.x-sim.los,defender:sim.agents.find((a:any)=>a.body===g.a).slot};}
    ticks.push({t:sim.t,line:pre,after:line.map((a:any)=>({slot:a.slot,pos:structuredClone(a.pos),vel:structuredClone(a.vel),support:a.body.support.state})),rb:{pos:structuredClone(rb.pos),vel:structuredClone(rb.vel)}});
    contactRaw.clear();return r;
   };
  }
  const start=performance.now();while(sim.phase==='live'&&sim.t<12)sim.tick();const elapsed=performance.now()-start;
  const end=sim.buildResult();const signature=hash({end:{...end,frames:undefined,telemetry:undefined},bodies:sim.agents.map((a:any)=>a.body),intents:sim.intents,nextRng:sim.rng.nextU32()});
  return{initHash,signature,elapsedMs:elapsed,natural:sim.phase!=='live',stopTime:sim.t,gain:end.gain,reason:end.reason,los,firstBodyContact:contacts[0]??null,firstGrip:grip,maxWorkResidual:maxResidual,ticks};
 }
 const result=execute(true);
 const plain=input.id==='wz_strong-s3'?execute(false):null;
 if(plain&&plain.signature!==result.signature)throw Error('observer neutrality failed '+arm);
 receipt.arms.push({input,arm,host,source:Object.fromEntries(['src/sim/playsim.ts','src/sim/called-motion.ts','src/physics/kinematics.ts','src/physics/world.ts'].filter(p=>p!=='src/sim/called-motion.ts'||arm==='candidate').map(p=>[p,createHash('sha256').update(readFileSync(host+'/'+p)).digest('hex')])),observerNeutral:plain?plain.signature===result.signature:null,...result});
 console.log(JSON.stringify({input:input.id,arm,neutral:plain?true:null,...Object.fromEntries(Object.entries(result).filter(([k])=>k!=='ticks'))}));
}
writeFileSync('/workspace/football-simulation-/out/loaded-movement-audit/candidate/native.json',JSON.stringify(receipt));
