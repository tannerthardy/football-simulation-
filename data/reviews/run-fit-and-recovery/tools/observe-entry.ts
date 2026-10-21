import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { BallCarrier } from '../../src/sim/behaviors/carrier.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../../scripts/source-version.js';
const sourceBefore = sourceVersion();
if(sourceBefore !== '8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942') throw Error('unexpected source');
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const proto=BallCarrier.prototype, originalUpdate=proto.update;
const inputs=[{run:'iz_strong',front:'over',flip:false,seed:3},{run:'iz_strong',front:'under',flip:false,seed:3},{run:'split_zone',front:'over',flip:true,seed:11}];
const rows:any[]=[];
function signature(sim:PlaySim,result:any) {
 return hash({result:{...result,frames:undefined,telemetry:undefined},bodies:sim.agents.map(a=>a.body),tags:sim.agents.map(a=>[...a.tags]),events:sim.events,intents:sim.intents,minds:sim.agents.map(a=>a.mind),perception:sim.perception,joints:sim.world.joints.map(j=>({...j,a:sim.agents.find(a=>a.body===j.a)?.idx,b:sim.agents.find(a=>a.body===j.b)?.idx,actor:'actor' in j ? sim.agents.find(a=>a.body===j.actor)?.idx:null})),nextRng:sim.rng.nextU32()});
}
try {
 for(const input of inputs) {
  const offense=generateTeam(new Rng(31),'Panel offense 1','O1',{strength:.55});
  const defense=generateTeam(new Rng(32),'Panel defense 1','D1',{strength:.55});
  const formation=FORMATION_BY_ID[input.run==='split_zone'?'gun_wing_12':'ace_11'],front=FRONT_BY_ID[input.front],personnel=front.personnel[0];
  const setup={offense:pickOffense(offense,formation.personnel),defense:pickDefense(defense,personnel),offCall:{formation,flip:input.flip,kind:'run' as const,run:RUN_BY_ID[input.run],label:`Audit ${input.run}`},defCall:{personnel,front,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:`Audit ${input.front}`},los:40,ballY:CENTER_Y,firstDownX:50,seed:input.seed,record:false};
  const sim=new PlaySim(setup),updates:any[]=[],initial=sim.agents.map(a=>({slot:a.slot,team:a.team,body:structuredClone(a.body),ratings:a.player.ratings}));
  let active:any=null;
  const see=sim.see;
  sim.see=function(a,target,...rest){
   const image=see.call(this,a,target,...rest);
   if(active && a===active.runner) active.row.cues.push({target:target.idx,slot:target.slot,team:target.team,image:structuredClone(image),fromEntry:new Error().stack?.includes('runReadAim')??false,trueSupport:target.body.support?.state,hiddenDown:target.isDown(this.t),engaged:!!target.engagement});
   return image;
  };
  proto.update=function(a,s){
   if(s!==sim)return originalUpdate.call(this,a,s);
   const raw=this as any;
   const p=s.perception as any;
   const row={t:s.t,runner:structuredClone(a.body),beforeHeading:raw.heading,beforeNextEval:raw.nextEval,beforeWasDesigned:raw.wasDesigned,opts:{run:raw.opts.run && {scheme:raw.opts.run.scheme,side:raw.opts.run.side},aim:structuredClone(raw.opts.aim),aimUntil:raw.opts.aimUntil},mind:{focus:a.mind.focus,stress:a.mind.stress,composure:(a.mind as any).composure,reactionTime:a.profile.reactionTime,recognition:a.recog?.read},players:s.agents.map(b=>({idx:b.idx,slot:b.slot,team:b.team,body:structuredClone(b.body),hiddenDown:b.isDown(s.t),engaged:!!b.engagement,downUntil:b.downUntil})),perception:{head:p.head,count:p.count,n:p.n,dt:p.dt,data:Array.from(p.data)},cues:[] as any[],afterHeading:null as any,request:null as any};
   active={runner:a,row};
   try{row.request=structuredClone(originalUpdate.call(this,a,s));row.afterHeading=raw.heading;}finally{active=null;}
   if(row.cues.some(c=>c.fromEntry))updates.push(row);
   return row.request;
  };
  const result=sim.run(),observedSignature=signature(sim,result);
  proto.update=originalUpdate;
  const plain=new PlaySim(setup),plainResult=plain.run(),plainSignature=signature(plain,plainResult);
  if(observedSignature!==plainSignature)throw Error('observer changed execution');
  rows.push({input,id:`CT-R1-${input.run}-${input.front}-${input.flip?'L':'R'}-S${input.seed}`,initial,initialSha:hash(initial),observerVerified:true,observedSignature,plainSignature,result,updates});
 }
}finally{proto.update=originalUpdate;}
const sourceAfter=sourceVersion();if(sourceBefore!==sourceAfter)throw Error('source changed');
const output='out/run-entry-pose-audit/native-entry.json.gz';
writeFileSync(output,gzipSync(JSON.stringify({schema:'native-entry-cue-observation-v1',sourceBefore,sourceAfter,collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),method:'Only actual BallCarrier updates and consumed see calls wrapped. Raw existing perception buffer copied for offline omitted-cue audit; no additional see/perceive or RNG calls. Endpoint/bodies/intents/minds/perception/joints/next-RNG signature checked against a plain run.',rows}),{level:9}));
console.log(JSON.stringify({output,sourceBefore,sourceAfter,cases:rows.map(r=>({id:r.id,entries:r.updates.length,gain:r.result.offenseYards,observer:r.observerVerified}))}));
