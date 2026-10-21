/** Read-only retained passing-tail audit. Absolute imports bind the published c2 source. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';
const [archive, expected, output] = process.argv.slice(2);
if (!archive || !expected || !output || process.argv.length !== 5) throw new Error('Usage: native-tail-panel.ts archive sourceSha output.json.gz');
const archiveRoot=resolve(archive);
if (resolve(process.cwd()) !== archiveRoot) throw new Error('cwd must be the declared frozen archive');
const { CENTER_Y }=await import(archiveRoot+'/src/core/field.ts');
const { Rng }=await import(archiveRoot+'/src/core/rng.ts');
const { generateTeam,pickDefense,pickOffense }=await import(archiveRoot+'/src/league/team.ts');
const { PASS_BY_ID }=await import(archiveRoot+'/src/playbook/concepts.ts');
const { COVERAGE_BY_ID,FRONT_BY_ID }=await import(archiveRoot+'/src/playbook/defense.ts');
const { FORMATION_BY_ID }=await import(archiveRoot+'/src/playbook/formations.ts');
const { PlaySim }=await import(archiveRoot+'/src/sim/playsim.ts');
const { sourceVersion }=await import(archiveRoot+'/scripts/source-version.ts');
const ROOT='/workspace/football-simulation-';
if(sourceVersion()!==expected)throw new Error('Frozen source pin mismatch');
const reference=JSON.parse(gunzipSync(readFileSync(ROOT+'/data/reviews/run-fit-and-recovery/passing/final.json.gz')).toString());
const hash=(x:any)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clone=(x:any)=>JSON.parse(JSON.stringify(x));
const teams={offense:generateTeam(new Rng(41),'Awareness offense','AOF',{strength:.55}),defense:generateTeam(new Rng(42),'Awareness defense','ADF',{strength:.55})};
const cases=[
 {concept:'curl_flat',formation:'gun_doubles_11',coverage:'cover2',flip:false},
 {concept:'curl_flat',formation:'gun_doubles_11',coverage:'cover3',flip:false},
 {concept:'pa_post_dig',formation:'ace_12',coverage:'cover3',flip:false},
 {concept:'curl_flat',formation:'gun_doubles_11',coverage:'cover2',flip:true},
 {concept:'curl_flat',formation:'gun_doubles_11',coverage:'cover3',flip:true},
 {concept:'pa_post_dig',formation:'ace_12',coverage:'cover3',flip:true},
];
function make(c:typeof cases[number],record:boolean){
 const formation=FORMATION_BY_ID[c.formation];
 return new PlaySim({offense:pickOffense(teams.offense,formation.personnel),defense:pickDefense(teams.defense,'nickel'),offCall:{formation,flip:c.flip,kind:'pass',pass:PASS_BY_ID[c.concept],label:`${c.formation}/${c.concept}`},defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID[c.coverage],pressure:null,zoneStyle:'match',label:`Over ${c.coverage}`},los:40,ballY:CENTER_Y,firstDownX:50,seed:3,record,recordLevel:'full',recordEvery:1,audibles:false});
}
function signature(sim:any,result:any){return hash({result:{...result,frames:undefined,telemetry:undefined},bodies:sim.agents.map(a=>a.body),intents:sim.intents,minds:sim.agents.map(a=>a.mind),rng:{...sim.rng}});}
const rows=[];
for(const c of cases){
 const id=`DA-R2-${c.concept}-${c.coverage}-${c.flip?'L':'R'}`,saved=reference.rows.find((r:any)=>r.id===id);
 const sim=make(c,true),offAlign=clone(sim.offAlign),profilesSha256=hash(sim.agents.map(a=>({slot:a.slot,player:a.player,profile:a.profile})));
 if(profilesSha256!==saved.profilesSha256)throw new Error(id+' profiles changed');
 const setup=clone({offCall:sim.offCall,defCall:sim.defCall,los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX,seed:3,down:1,audibles:false,hurry:sim.hurry,wind:sim.wind,record:true,recordLevel:'full',recordEvery:1});
 const physicalInitial=clone(sim.agents.map(a=>({idx:a.idx,slot:a.slot,body:a.body,mind:a.mind,recognition:a.recog}))), initialRng=clone({...sim.rng});
 const pictures:any[]=[],steps:any[]=[],origSee=sim.see,origStep=sim.world.step;
 sim.see=function(a,b,scale){const p=origSee.call(this,a,b,scale);pictures.push({t:sim.t,a:a.idx,b:b.idx,scale:scale??1,cue:clone(p)});return p;};
 sim.world.step=function(intents,dt){
  const step={t:sim.t,carrier:sim.carrier?.idx??null,ball:sim.ball.kind,catchAt:sim.catchAt,throwAt:sim.throwAt,intents:clone(intents),agents:sim.agents.map(a=>({idx:a.idx,slot:a.slot,position:{...a.pos},velocity:{...a.vel},facing:a.facing,support:clone(a.body.support),read:a.recog?.read,behavior:a.behavior.kind,zone:(a.behavior as any).zone??null,job:(a.behavior as any).job??null,target:(a.behavior as any).target?.idx??null,rule:(a.behavior as any).recordedRule?.(sim.t)??null,engagement:a.engagement?.defender.idx??null})),contacts:null as any};
  const result=origStep.call(this,intents,dt);step.contacts=clone(result.contacts);steps.push(step);return result;
 };
 let result:any;
 try{result=sim.run();}finally{sim.see=origSee;sim.world.step=origStep;}
 const executionSha256=signature(sim,result),plain=make(c,false),plainResult=plain.run();
 const plainExecutionSha256=signature(plain,plainResult);
 if(executionSha256!==plainExecutionSha256)throw new Error(id+' observer/plain execution mismatch');
 const baselineRetainedExecutionVerified=expected==='c2b65e9f02a95a80dde97625d6e2dd1bdf89da327eb15f2eb093860af08e1ff8' ? executionSha256===saved.executionSha256 : undefined;
 if(baselineRetainedExecutionVerified===false)throw new Error(id+' retained baseline execution mismatch');
 rows.push({id,case:c,setup,offAlign,physicalInitial,initialRng,profilesSha256,executionSha256,plainExecutionSha256,nextRng:clone({...sim.rng}),plainNextRng:clone({...plain.rng}),baselineRetainedExecutionVerified,observerVerified:true,players:sim.agents.map(a=>({idx:a.idx,slot:a.slot,team:a.team,player:a.player,profile:a.profile})),result,pictures,steps});
 console.log(JSON.stringify({id,yards:result.offenseYards,outcome:result.outcome,steps:steps.length,observerVerified:true}));
}
if(sourceVersion()!==expected)throw new Error('Frozen source changed');
writeFileSync(output,gzipSync(JSON.stringify({schema:'retained-passing-tail-panel-v2',sourceBefore:expected,sourceAfter:sourceVersion(),archiveRoot,definitions:{setup:'Metadata copied from actual post-constructor calls; default down=1 independently verified in constructor. Physical initial state sampled before run, complete result/body/intent/mind/next RNG plain parity.'},toolSha256:createHash('sha256').update(readFileSync(ROOT+'/out/helper-fit/defense/native-tail-panel.ts')).digest('hex'),declared:'Three retained R2 touchdown tails and their exact mirrored ordinary counterparts. Read-only audit; no new targets or force tuning.',rows}),{level:9}));
