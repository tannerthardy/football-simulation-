import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../tackle-breakthrough/final-source/src/core/field.js';
import { Rng } from '../tackle-breakthrough/final-source/src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../tackle-breakthrough/final-source/src/league/team.js';
import { RUN_BY_ID } from '../tackle-breakthrough/final-source/src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../tackle-breakthrough/final-source/src/playbook/defense.js';
import { FORMATION_BY_ID } from '../tackle-breakthrough/final-source/src/playbook/formations.js';
import { RunBlocker } from '../tackle-breakthrough/final-source/src/sim/behaviors/blocking.js';
import { PlaySim } from '../tackle-breakthrough/final-source/src/sim/playsim.js';
import { sourceVersion } from '../../scripts/source-version.js';
const sourceBefore=sourceVersion();if(sourceBefore!=='8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942')throw Error('unexpected source');
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function signature(sim:PlaySim,result:any){return hash({result:{...result,frames:undefined,telemetry:undefined},bodies:sim.agents.map(a=>a.body),tags:sim.agents.map(a=>[...a.tags]),events:sim.events,intents:sim.intents,minds:sim.agents.map(a=>a.mind),perception:sim.perception,joints:sim.world.joints.map(j=>({...j,a:sim.agents.find(a=>a.body===j.a)?.idx,b:sim.agents.find(a=>a.body===j.b)?.idx,actor:'actor' in j?sim.agents.find(a=>a.body===j.actor)?.idx:null})),nextRng:sim.rng.nextU32()});}
const rows:any[]=[];
for(const flip of [false,true]){
 const offense=generateTeam(new Rng(31),'Panel offense 1','O1',{strength:.55}),defense=generateTeam(new Rng(32),'Panel defense 1','D1',{strength:.55});
 const formation=FORMATION_BY_ID.gun_doubles_11,front=FRONT_BY_ID.over,personnel=front.personnel[0];
 const setup={offense:pickOffense(offense,formation.personnel),defense:pickDefense(defense,personnel),offCall:{formation,flip,kind:'run' as const,run:RUN_BY_ID.draw,label:'Draw audit'},defCall:{personnel,front,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Draw audit'},los:40,ballY:CENTER_Y,firstDownX:50,seed:3,record:false};
 const sim=new PlaySim(setup),initial=sim.offense.map(a=>({slot:a.slot,pos:{...a.pos},plan:a.behavior instanceof RunBlocker?{kind:a.behavior.plan.kind,target:a.behavior.plan.target?.slot,partner:a.behavior.plan.combination?.members.map(m=>m.slot),soloKind:a.behavior.plan.combination?.soloKind}:null}));
 const updates:any[]=[];
 for(const a of sim.offense){if(!(a.behavior instanceof RunBlocker))continue;const b=a.behavior,update=b.update;
  b.update=function(aa,s){const before={kind:this.plan.kind,target:this.plan.target?.slot,pos:{...aa.pos},vel:{...aa.vel},engaged:!!aa.engagement,snapDelay:aa.mind.snapDelay,snapReadyAt:aa.snapReadyAt,combination:this.plan.combination && {members:this.plan.combination.members.map(m=>m.slot),soloKind:this.plan.combination.soloKind,released:this.plan.combination.released}};const request=update.call(this,aa,s);if(s.t<1.05)updates.push({t:s.t,slot:aa.slot,before,after:{kind:this.plan.kind,target:this.plan.target?.slot,stance:aa.stance},request:structuredClone(request)});return request;};
 }
 const result=sim.run(),observedSignature=signature(sim,result);const plain=new PlaySim(setup),plainResult=plain.run(),plainSignature=signature(plain,plainResult);if(observedSignature!==plainSignature)throw Error('observer changed execution');rows.push({id:`DRAW-Over-${flip?'L':'R'}-S3`,input:{roster:[31,32],formation:'gun_doubles_11',front:'over',coverage:'cover3',run:'draw',flip,seed:3},initial,updates,result,observerVerified:true,observedSignature,plainSignature});
}
const sourceAfter=sourceVersion();if(sourceBefore!==sourceAfter)throw Error('source changed');const output=new URL('./native-draw.json.gz',import.meta.url).pathname;writeFileSync(output,gzipSync(JSON.stringify({schema:'native-draw-presentation-audit-v1',sourceBefore,sourceAfter,collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),method:'Wrap native RunBlocker.update once; copy existing jobs, bodies, requests and stance before 1.05 seconds. Full result/bodies/intents/minds/perception/joints/next-RNG signatures match plain controls. No extra observations or controller calls.',rows}),{level:9}));console.log(JSON.stringify({output,sourceBefore,sourceAfter,cases:rows.map(r=>({id:r.id,gain:r.result.offenseYards,observer:r.observerVerified}))}));
