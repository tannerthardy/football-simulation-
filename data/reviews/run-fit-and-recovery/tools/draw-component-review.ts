import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { sourceVersion } from '../../scripts/source-version.js';
const [sourceRoot,expectedSource,output]=process.argv.slice(2);
if(!sourceRoot||!expectedSource?.match(/^[a-f0-9]{64}$/)||!output?.endsWith('.json.gz'))throw Error('SOURCE_ROOT EXPECTED_SHA OUTPUT.json.gz required');
const sourceBefore=sourceVersion();if(sourceBefore!==expectedSource)throw Error(`source mismatch ${sourceBefore}`);
const load=(p:string)=>import(pathToFileURL(resolve(sourceRoot,p)).href);
const {CENTER_Y}=await load('src/core/field.ts');
const {Rng}=await load('src/core/rng.ts');
const {generateTeam,pickDefense,pickOffense}=await load('src/league/team.ts');
const {RUN_BY_ID}=await load('src/playbook/concepts.ts');
const {COVERAGE_BY_ID,FRONT_BY_ID}=await load('src/playbook/defense.ts');
const {FORMATION_BY_ID}=await load('src/playbook/formations.ts');
const {RunBlocker}=await load('src/sim/behaviors/blocking.ts');
const {PlaySim}=await load('src/sim/playsim.ts');
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function signature(sim:any,result:any){return hash({result:{...result,frames:undefined,telemetry:undefined},bodies:sim.agents.map((a:any)=>a.body),tags:sim.agents.map((a:any)=>[...a.tags]),events:sim.events,intents:sim.intents,minds:sim.agents.map((a:any)=>a.mind),perception:sim.perception,joints:sim.world.joints.map((j:any)=>({...j,a:sim.agents.find((a:any)=>a.body===j.a)?.idx,b:sim.agents.find((a:any)=>a.body===j.b)?.idx,actor:'actor' in j?sim.agents.find((a:any)=>a.body===j.actor)?.idx:null})),nextRng:sim.rng.nextU32()});}
const rows:any[]=[];
for(const flip of [false,true]){
 const offense=generateTeam(new Rng(31),'Panel offense 1','O1',{strength:.55}),defense=generateTeam(new Rng(32),'Panel defense 1','D1',{strength:.55});
 const formation=FORMATION_BY_ID.gun_doubles_11,front=FRONT_BY_ID.over,personnel=front.personnel[0];
 const setup={offense:pickOffense(offense,formation.personnel),defense:pickDefense(defense,personnel),offCall:{formation,flip,kind:'run' as const,run:RUN_BY_ID.draw,label:'Draw audit'},defCall:{personnel,front,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Draw audit'},los:40,ballY:CENTER_Y,firstDownX:50,seed:3,record:true,recordLevel:'full',recordEvery:1};
 const sim=new PlaySim(setup),physicalInitial=sim.agents.map((a:any)=>({slot:a.slot,team:a.team,body:structuredClone(a.body),ratings:a.player.ratings,snapReadyAt:a.snapReadyAt,mind:structuredClone(a.mind)}));
 const initial=sim.offense.map((a:any)=>({slot:a.slot,pos:{...a.pos},plan:a.behavior instanceof RunBlocker?{kind:a.behavior.plan.kind,presentation:a.behavior.plan.presentation??null,target:a.behavior.plan.target?.slot,partner:a.behavior.plan.combination?.members.map((m:any)=>m.slot),soloKind:a.behavior.plan.combination?.soloKind}:null}));
 const updates:any[]=[];
 for(const a of sim.offense){if(!(a.behavior instanceof RunBlocker))continue;const b=a.behavior,update=b.update;
  b.update=function(aa:any,s:any){const before={kind:this.plan.kind,presentation:this.plan.presentation??null,target:this.plan.target?.slot,pos:{...aa.pos},vel:{...aa.vel},engaged:!!aa.engagement,snapDelay:aa.mind.snapDelay,snapReadyAt:aa.snapReadyAt,combination:this.plan.combination && {members:this.plan.combination.members.map((m:any)=>m.slot),soloKind:this.plan.combination.soloKind,released:this.plan.combination.released}};const request=update.call(this,aa,s);if(s.t<1.05)updates.push({t:s.t,slot:aa.slot,before,after:{kind:this.plan.kind,presentation:this.plan.presentation??null,target:this.plan.target?.slot,stance:aa.stance},request:structuredClone(request)});return request;};
 }
 const result=sim.run(),observedSignature=signature(sim,result),plain=new PlaySim({...setup,record:false,recordLevel:'light'}),plainResult=plain.run(),plainSignature=signature(plain,plainResult);if(observedSignature!==plainSignature)throw Error('observer/recording changed execution');rows.push({id:`DRAW-Over-${flip?'L':'R'}-S3`,input:{roster:[31,32],formation:'gun_doubles_11',front:'over',coverage:'cover3',run:'draw',flip,seed:3,los:40,ballY:CENTER_Y,firstDownX:50},players:sim.agents.map((a:any)=>({slot:a.slot,team:a.team,player:a.player})),physicalInitial,physicalInitialSha256:hash(physicalInitial),initial,updates,result,observerVerified:true,observedSignature,plainSignature});
}
const sourceAfter=sourceVersion();if(sourceBefore!==sourceAfter)throw Error('source changed');writeFileSync(output,gzipSync(JSON.stringify({schema:'draw-component-native-v1',sourceBefore,sourceAfter,node:process.version,collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),method:'Two fixed native Draw mirrors to normal whistle. Actual RunBlocker updates copied before1.05s. Full 20Hz saved replay versus plain unrecorded result/bodies/intents/minds/perception/joints/next-RNG signatures match. No extra observations or controller calls.',limitations:['Selected installed-presentation witnesses, not NFL rates or outcome calibration.','Only Draw blocking changes in component source; combined-source outcomes must remain separately attributed.','One-second presentation remains existing authored motor phase, not visual read or calibrated NFL timing.'],rows}),{level:9}));console.log(JSON.stringify({output,sourceBefore,sourceAfter,collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),cases:rows.map(r=>({id:r.id,gain:r.result.offenseYards,observer:r.observerVerified,frames:r.result.frames.length}))}));
