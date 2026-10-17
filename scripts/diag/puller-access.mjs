/** Passive all22 puller diagnosis. Default plans zero snaps; prototypes require their explicit installation. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {RUN_BY_ID} from '../../src/playbook/concepts.ts';
import {PlaySim} from '../../src/sim/playsim.ts';
import {RunBlocker} from '../../src/sim/behaviors/blocking.ts';
import {goTo} from '../../src/sim/behaviors/common.ts';
import {sourceVersion} from '../source-version.ts';
import {runReadObservers} from '../../src/sim/run-read-observer.ts';
const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const [mode='plan',out='out/puller-access',ids='K01,K02',untilText='5',inputPath='test/fixtures/puller-access-inputs.json.gz',route='native']=process.argv.slice(2);
if(mode==='plan'){ console.log(JSON.stringify({question:'Puller route progress and acquired collection; no snaps without explicit run mode',inputs:inputPath,simulatedSnaps:0}));process.exit(0); }
assert.equal(mode,'run');const bytes=readFileSync(inputPath),manifest=JSON.parse(inputPath.endsWith('.gz')?gunzipSync(bytes):bytes),until=Number(untilText);
assert(until>0&&until<=5);const selected=ids.split(',').map(id=>{const r=manifest.rows.find(r=>r.id===id);assert(r,`Missing frozen case ${id}`);return r;});
assert(selected.length<=6);for(const input of selected)assert(RUN_BY_ID[input.call]?.scheme===input.setup.offCall.run.scheme,`Missing concept installation for ${input.id}/${input.call}; zero snaps`);const rows=[],started=performance.now();
const snapshot=a=>structuredClone(a.body);
const plan=a=>a.behavior instanceof RunBlocker?{kind:a.behavior.plan.kind,target:a.behavior.target?.idx??null,drive:a.behavior.plan.drive,
 pullRole:a.behavior.plan.pullRole??null,pullSurface:a.behavior.plan.pullSurface?{blocker:a.behavior.plan.pullSurface.blocker.idx,defender:a.behavior.plan.pullSurface.defender.idx}:null,pullPath:structuredClone(a.behavior.plan.pullPath??null),pullIdx:a.behavior.pullIdx,
 combination:a.behavior.plan.combination?{released:a.behavior.plan.combination.released,backer:a.behavior.plan.combination.backer?.idx??null,members:a.behavior.plan.combination.members.map(b=>b.idx)}:null}:null;
const rep=e=>({b:e.blocker.idx,d:e.defender.idx,helpers:e.helpers.map(a=>a.idx),control:e.control,phi:e.phi,
 hands:e.hands?{normal:e.hands.normalForce,tangent:e.hands.tangentForce,extension:e.hands.extension}:null});
for(const input of selected){
 assert(performance.now()-started<30000);assert.equal(hash(input.setup),input.inputSha256);
 const sim=new PlaySim(structuredClone(input.setup)),frames=[],cues=[],calls=[],runnerReads=[];
 runReadObservers.set(sim,event=>{if(event.phase==='aim'||event.phase==='carrier-start')runnerReads.push(structuredClone(event));});
 assert(['native','inside','outside'].includes(route));
 const routeGoals=new Map();
 const initial=sim.agents.map(a=>({idx:a.idx,slot:a.slot,body:snapshot(a),plan:plan(a),runFit:a.runFit}));
 const pullers=new Set(sim.offense.filter(a=>a.behavior instanceof RunBlocker&&a.behavior.plan.kind==='pull'));
 const see=sim.see.bind(sim);
 sim.see=(a,b,...args)=>{const picture=see(a,b,...args);if(pullers.has(a)||(a.slot.startsWith('LB')&&b.team!==a.team&&(['LT','LG','C','RG','RT','RB','QB'].includes(b.slot)||sim.offAlign.spots[b.slot]?.inline)))cues.push({t:sim.t,a:a.idx,b:b.idx,picture:structuredClone(picture)});return picture;};
 for(const a of sim.agents){
  const controller=a.behavior,update=controller.update;
  controller.update=function(actor,s){const before=plan(a);let command=update.call(this,actor,s);
    if(route!=='native'&&controller instanceof RunBlocker&&controller.plan.kind==='pull'&&controller.plan.pullRole==='lead'&&s.t>=2.2){
      let goal=routeGoals.get(a);
      if(!goal){
        const first=s.offense.find(b=>b!==a&&b.behavior instanceof RunBlocker&&b.behavior.plan.kind==='pull'&&b.behavior.plan.pullRole==='kick');
        const side=Math.sign(controller.plan.pullPath[1].y-controller.plan.pullPath[0].y);
        const seen=s.see(a,first);
        const clearance=a.profile.radius+first.profile.radius+.15;
        goal=route==='inside'?{x:s.los+1,y:a.pos.y,axis:'x',side:1}
          :{x:Math.min(a.pos.x,seen.pos.x-clearance),y:seen.pos.y+side*2.1,axis:'y',side};
        routeGoals.set(a,goal);
      }
      const achieved=goal.side*(a.pos[goal.axis]-goal[goal.axis])>=-.1;
      command=achieved?controller.attack(a,s,controller.plan.target)
        :goTo(a,goal,{speed:.95,through:2.4});
    }
    calls.push({t:s.t,a:a.idx,before,after:plan(a),accessRead:controller.pullAccessRead?{...controller.pullAccessRead,target:controller.pullAccessRead.target.idx}:null,surfaceRead:controller.pullSurfaceRead?structuredClone(controller.pullSurfaceRead):null,read:controller.pullRead?{target:controller.pullRead.target.idx,seen:structuredClone(controller.pullRead.seen),clearanceX:controller.pullRead.clearanceX,nextRead:controller.pullRead.nextRead}:null,climbRead:controller.climbRead?{meet:controller.climbRead.meet,seenVel:controller.climbRead.seenVel,attainable:controller.climbRead.attainable}:null,command:structuredClone(command)});return command;};
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
  phase:sim.phase,endTime:sim.t,censor:sim.phase==='live'?`live at${sim.t}`:'native ending',outcome:sim.phase==='live'?null:result.outcome,
  gain:sim.phase==='live'?null:result.offenseYards,firstContact:sim.events.find(e=>e.type==='carrier_contact')??null,
  installed:initial.filter(a=>a.plan).map(a=>({slot:a.slot,...a.plan})),events:sim.events};
 rows.push({...summary,initial,frames,cues,calls,runnerReads,result});console.log(JSON.stringify(summary));
}
const profile=JSON.parse(readFileSync('config/baseline.json'));
const receipt={diagnosticRoute:route,schema:'perimeter-native-v1',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source:sourceVersion(),node:process.version,
 inputManifestSha256:hash(bytes),collectorSha256:hash(readFileSync(import.meta.filename)),flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
 worldDefaults:profile.worldDefaults,cases:selected.map(r=>({id:r.id,inputSha256:r.inputSha256})),until,elapsedSeconds:(performance.now()-started)/1000,
 qualification:route==='native'?'Native all22. Passive existing see/update/World wrappers; no new pictures, random draws or assigned outcomes. Censored live prefixes have no terminal gain.':'Diagnostic command override from the same full native prefix at2.2s. All22 and runner react normally; no frozen future path, teleport or awarded contact. Not a production policy or feasibility proof.',fullGames:0};
mkdirSync(out,{recursive:true});writeFileSync(out+'/trace.json.gz',gzipSync(JSON.stringify({receipt,rows})));
writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
