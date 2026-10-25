import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID, PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { BallCarrier } from '../../src/sim/behaviors/carrier.js';
import type { Agent } from '../../src/sim/agent.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../../scripts/source-version.js';
const sourceBefore = sourceVersion();
const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', { strength:.55 });
const defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', { strength:.55 });
function make(run = 'iz_strong', front = 'over', flip = false, pass = false) {
 const formation = FORMATION_BY_ID[pass ? 'gun_doubles_11' : 'ace_11'];
 return new PlaySim({ offense:pickOffense(offense, formation.personnel), defense:pickDefense(defense, 'base43'),
  offCall:{ formation, flip, kind:pass?'pass':'run', ...(pass?{pass:PASS_BY_ID.curl_flat}:{run:RUN_BY_ID[run]}),label:'decision audit'},
  defCall:{personnel:'base43',front:FRONT_BY_ID[front],coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'read guard'},
  los:40,ballY:CENTER_Y,firstDownX:50,seed:3,record:false });
}
const signature=(sim:PlaySim,result:any)=>createHash('sha256').update(JSON.stringify({result,bodies:sim.agents.map(a=>a.body),
 tags:sim.agents.map(a=>[...a.tags]),events:sim.events,intents:sim.intents,minds:sim.agents.map(a=>a.mind),
 perception:sim.perception,nextRng:sim.rng.nextU32()})).digest('hex');
const native=[];
const proto=BallCarrier.prototype as any, update=proto.update;
try {
 for(const run of ['iz_strong','oz_strong']) for(const front of ['over','under']) for(const flip of [false,true]) {
  const sim=make(run,front,flip), beats:any[]=[];
  proto.update=function(a:Agent,s:PlaySim){
   const before=this.nextEval, result=update.call(this,a,s);
   if(s===sim && this.nextEval!==before) beats.push({t:s.t,slot:a.slot,oldNext:before,next:this.nextEval,
    focus:a.mind.focus,stress:a.mind.stress,declaredDecisionInterval:a.mind.decisionInterval,
    scheduledInterval:this.nextEval-s.t,heading:this.heading,vel:result.vel});
   return result;
  };
  const result=sim.run(), observed=signature(sim,result); proto.update=update;
  const plain=make(run,front,flip), plainResult=plain.run(), plainSig=signature(plain,plainResult);
  if(observed!==plainSig) throw Error('Observer changed execution');
  native.push({run,front,flip,result,observerVerified:true,beats});
 }
} finally {proto.update=update;}

function heldCone(hiddenInside:boolean, receivedInside:boolean) {
 const sim=make('iz_strong','over',false,true), qb=sim.qb, d=sim.slot('FS')!;
 qb.body.pos={x:30,y:CENTER_Y}; qb.body.vel={x:0,y:0}; sim.t=1;
 const mind=sim.qbMind as any; mind.identified=true; mind.confirmed=true;
 mind.memory.set(d,{pos:{x:50,y:CENTER_Y+18},vel:{x:0,y:0},facing:0,t:0});
 d.body.pos=hiddenInside?{x:50,y:CENTER_Y}:{x:35,y:CENTER_Y+24};
 const picture={pos:receivedInside?{x:50,y:CENTER_Y}:{x:35,y:CENTER_Y+24},vel:{x:0,y:0},stance:null,facing:0,pose:'up',age:.2};
 const queries:any[]=[];
 sim.see=(observer,target,scale=1)=>{
  if(target===d) queries.push({scale});
  return target===d?structuredClone(picture) as any:{pos:{...target.pos},vel:{...target.vel},stance:null,facing:0,pose:'up',age:.2};
 };
 mind.observe({x:60,y:CENTER_Y});
 return {hiddenInside,receivedInside,queries,memory:structuredClone(mind.memory.get(d)),estimate:mind.estimate(d)};
}
const heldPictures=[false,true].map(receivedInside=>({receivedInside,
 hiddenOutside:heldCone(false,receivedInside),hiddenInside:heldCone(true,receivedInside)}));
const sourceAfter=sourceVersion(); if(sourceAfter!==sourceBefore) throw Error('Source changed during probe');
const packet={schema:'offensive-awareness-read-only-v1',sourceBefore,sourceAfter,
 collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
 native,heldPictures,
 limitations:['Eight fixed native diagnostic calls are not NFL rates; same roster pair is one skill population.',
 'Native read tracing wraps actual updates only, with full endpoint/body/mind/perception/next-RNG controls.',
 'Held-picture cone scenes are controller slices with prescribed cues and hidden geometry, not simulated football movement.',
 'Declared decisionInterval is an existing effective cognitive cadence, not measured NFL cognition.',
 'Neither source law nor public profile changes; no new eyes or occlusion model is inferred.']};
mkdirSync('out/decision-awareness',{recursive:true});writeFileSync('out/decision-awareness/offense-probe.json',JSON.stringify(packet,null,2));
console.log(JSON.stringify({sourceBefore,sourceAfter,calls:native.length,observerVerified:native.every(n=>n.observerVerified),
 beats:native.reduce((n,row)=>n+row.beats.length,0),
 fasterThanDeclared:native.reduce((n,row)=>n+row.beats.filter((b:any)=>b.scheduledInterval+1e-9<b.declaredDecisionInterval).length,0),
 minDeclared:Math.min(...native.flatMap(n=>n.beats.map((b:any)=>b.declaredDecisionInterval))),
 maxDeclared:Math.max(...native.flatMap(n=>n.beats.map((b:any)=>b.declaredDecisionInterval))),heldPictures}));
