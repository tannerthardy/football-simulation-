/** Explicit perimeter development runner. Default plans zero snaps. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {Rng} from '../../src/core/rng.ts';
import {generateTeam,pickOffense,pickDefense} from '../../src/league/team.ts';
import {FORMATION_BY_ID} from '../../src/playbook/formations.ts';
import {RUN_BY_ID} from '../../src/playbook/concepts.ts';
import {FRONT_BY_ID,COVERAGE_BY_ID} from '../../src/playbook/defense.ts';
import {PlaySim} from '../../src/sim/playsim.ts';
import {RunBlocker} from '../../src/sim/behaviors/blocking.ts';
import {sourceVersion} from '../source-version.ts';
const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const [mode='plan',out='out/perimeter-runs',ids='B01,P01,C01',untilText='5',inputPath='data/reviews/current/perimeter-runs/inputs.json']=process.argv.slice(2);
if(mode==='plan'){
 const offense=generateTeam(new Rng(11),'O','O',{strength:.55}),defense=generateTeam(new Rng(12),'D','D',{strength:.55});
 const rows=[['B01','buck_sweep','ace_12'],['P01','pin_pull','ace_12'],['C01','crack_toss','ace_nasty_12']].map(([id,call,form])=>{
  const formation=FORMATION_BY_ID[form],run=RUN_BY_ID[call];
  const setup={offense:pickOffense(offense,formation.personnel),defense:pickDefense(defense,'base43'),
   offCall:{formation,flip:false,kind:'run',run,label:`${formation.name} · ${run.name}`},
   defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over Cover3'},
   los:40,ballY:26.67,firstDownX:50,seed:77,audibles:false,record:true,recordEvery:1,recordLevel:'full'};
  return {id,call,form,setup,inputSha256:hash(setup)};
 });
 mkdirSync(inputPath.slice(0,inputPath.lastIndexOf('/')),{recursive:true});
 writeFileSync(inputPath,JSON.stringify({schema:'perimeter-run-inputs-v1',accepted:'bb6d4c73948d53ba841dd9338dd240146c739f8c',
  question:'Distinct pin/pull/crack jobs, physically earned exchange/load/protection, native defensive responses. One fixed existing team pair; no games.',rows},null,2)+'\n');
 console.log(JSON.stringify({cases:rows.map(r=>({id:r.id,inputSha256:r.inputSha256})),simulatedSnaps:0}));process.exit(0);
}
assert.equal(mode,'run');const bytes=readFileSync(inputPath),manifest=JSON.parse(bytes),until=Number(untilText);
assert(until>0&&until<=5);const selected=ids.split(',').map(id=>{const r=manifest.rows.find(r=>r.id===id);assert(r,`Missing frozen case ${id}`);return r;});
assert(selected.length<=6);const rows=[],started=performance.now();
const snapshot=a=>structuredClone(a.body);
const plan=a=>a.behavior instanceof RunBlocker?{kind:a.behavior.plan.kind,target:a.behavior.target?.idx??null,drive:a.behavior.plan.drive,
 pullRole:a.behavior.plan.pullRole??null,pullPath:structuredClone(a.behavior.plan.pullPath??null),pullIdx:a.behavior.pullIdx,
 combination:a.behavior.plan.combination?{released:a.behavior.plan.combination.released,members:a.behavior.plan.combination.members.map(b=>b.idx)}:null}:null;
const rep=e=>({b:e.blocker.idx,d:e.defender.idx,helpers:e.helpers.map(a=>a.idx),control:e.control,phi:e.phi,
 hands:e.hands?{normal:e.hands.normalForce,tangent:e.hands.tangentForce,extension:e.hands.extension}:null});
for(const input of selected){
 assert(performance.now()-started<30000);assert.equal(hash(input.setup),input.inputSha256);
 const sim=new PlaySim(structuredClone(input.setup)),frames=[],cues=[],calls=[];
 const initial=sim.agents.map(a=>({idx:a.idx,slot:a.slot,body:snapshot(a),plan:plan(a),runFit:a.runFit}));
 const see=sim.see.bind(sim);
 sim.see=(a,b,...args)=>{const picture=see(a,b,...args);cues.push({t:sim.t,a:a.idx,b:b.idx,picture:structuredClone(picture)});return picture;};
 for(const a of sim.agents){
  const controller=a.behavior,update=controller.update;
  controller.update=function(actor,s){const before=plan(a),command=update.call(this,actor,s);calls.push({t:s.t,a:a.idx,before,after:plan(a),read:controller.pullRead?{target:controller.pullRead.target.idx,seen:structuredClone(controller.pullRead.seen),clearanceX:controller.pullRead.clearanceX,nextRead:controller.pullRead.nextRead}:null,climbRead:controller.climbRead?{meet:controller.climbRead.meet,seenVel:controller.climbRead.seenVel,attainable:controller.climbRead.attainable}:null,command:structuredClone(command)});return command;};
 }
 const step=sim.world.step.bind(sim.world);
 sim.world.step=(intents,dt)=>{
  const before=sim.agents.map(snapshot),raw=structuredClone(sim.cmds),final=structuredClone([...intents]),beforeReps=sim.engagements.map(rep),report=step(intents,dt);
  frames.push({t:sim.t,before,raw,final,after:sim.agents.map(snapshot),plans:sim.agents.map(plan),beforeReps,afterReps:sim.engagements.map(rep),
   ball:{kind:sim.ball.kind,carrier:sim.carrier?.idx??null,pos:sim.ballPos()},rng:JSON.stringify(sim.rng),
   report:{contacts:report.contacts,work:report.work,groundImpulse:report.groundImpulse,armImpulse:report.armImpulse,armImpulseLimit:report.armImpulseLimit}});
  return report;
 };
 const start=performance.now();while(sim.phase==='live'&&sim.t<until){assert(performance.now()-start<5000,'Case wall budget');sim.tick();}
 const result=sim.buildResult(),summary={id:input.id,inputSha256:input.inputSha256,source:sourceVersion(),elapsedSeconds:(performance.now()-start)/1000,
  phase:sim.phase,endTime:sim.t,censor:sim.phase==='live'?`live at${sim.t}`:'native ending',outcome:result.outcome,
  gain:sim.phase==='live'?null:result.offenseYards,firstContact:sim.events.find(e=>e.type==='carrier_contact')??null,
  installed:initial.filter(a=>a.plan).map(a=>({slot:a.slot,...a.plan})),events:sim.events};
 rows.push({...summary,initial,frames,cues,calls,result});console.log(JSON.stringify(summary));
}
const profile=JSON.parse(readFileSync('config/baseline.json'));
const receipt={schema:'perimeter-native-v1',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source:sourceVersion(),node:process.version,
 inputManifestSha256:hash(bytes),collectorSha256:hash(readFileSync(import.meta.filename)),flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
 worldDefaults:profile.worldDefaults,cases:selected.map(r=>({id:r.id,inputSha256:r.inputSha256})),until,elapsedSeconds:(performance.now()-started)/1000,
 qualification:'Native all22. Passive existing see/update/World wrappers; no new pictures, random draws or assigned outcomes. Censored live prefixes have no terminal gain.',fullGames:0};
mkdirSync(out,{recursive:true});writeFileSync(out+'/trace.json.gz',gzipSync(JSON.stringify({receipt,rows})));
writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
