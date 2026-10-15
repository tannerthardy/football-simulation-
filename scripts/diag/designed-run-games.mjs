/** Passive full-game diagnosis on the exact PR #54 checkpoint. No new sensing,
 * decisions, physics previews, force edits or RNG calls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync,gzipSync} from 'node:zlib';
import {Agent} from '../../src/sim/agent.ts';
import {PlaySim} from '../../src/sim/playsim.ts';
import {Game} from '../../src/game/game.ts';
import {runReadObservers} from '../../src/sim/run-read-observer.ts';
import {runContactObservers} from '../../src/sim/run-contact-observer.ts';
import {sourceVersion} from '../source-version.ts';

const [manifestPath,id,out]=process.argv.slice(2);
assert(manifestPath&&id&&out,'MANIFEST FIXTURE OUTPUT required');
const sha=x=>createHash('sha256').update(x).digest('hex');
const hash=x=>sha(JSON.stringify(x));
const snap=x=>JSON.parse(JSON.stringify(x,(_k,v)=>v instanceof Agent?{agent:v.idx}:v instanceof PlaySim?{sim:true}:v));
const manifest=JSON.parse(readFileSync(manifestPath));
const original=JSON.parse(readFileSync(manifest.originalManifest));
const declaration=manifest.games.find(g=>g.id===id),fixture=original.fixtures.find(f=>f.id===id);
assert(declaration&&fixture);
assert.equal(sourceVersion(),manifest.sourceSha256);assert.equal(process.version,original.node);
assert.equal(sha(readFileSync(manifest.originalManifest)),manifest.originalManifestSha256);
const baseline=JSON.parse(readFileSync('config/baseline.json'));
const flags=Object.fromEntries(Object.keys(baseline.flags).map(k=>[k,process.env[k]??null]));
assert.deepEqual(flags,original.flags);assert.deepEqual(baseline.worldDefaults,original.worldDefaults);
const referencePath=`${manifest.referenceRoot}/experimental/${id}/game.json.gz`;
const reference=JSON.parse(gunzipSync(readFileSync(referencePath)));
assert.equal(reference.provenance.sourceSha256,manifest.sourceSha256);
assert.equal(hash(fixture.teams),fixture.teamsSha256);
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const started=performance.now(),rows=[];
const {home,away}=structuredClone(fixture.teams);
let game;
const observe=(sim,kind)=>{
 const index=game.playIndex,selected=kind==='scrimmage'&&declaration.plays.includes(index);
 const row={index,kind,selected,run:sim.offCall.kind==='run',los:sim.los,state:snap(game.state),
  input:{seedState:snap(sim.rng),call:snap(sim.offCall),defense:snap(sim.defCall),
   agents:sim.agents.map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,team:a.team,
    player:snap(a.player),profile:snap(a.profile),initialBody:snap(a.body),initialBehavior:snap(a.behavior)}))},
  frames:[],reads:[],cues:[],contactDecisions:[],writes:[],opening:[],physicalContacts:[],steps:0};
 rows.push(row);
 if(selected){
  const see=sim.see.bind(sim);
  sim.see=(a,b,scale)=>{const result=see(a,b,scale);if(a.team==='O')row.cues.push({t:sim.t,observer:a.idx,target:b.idx,kind:'see',picture:snap(result)});return result;};
  const information=sim.teammateInformation.bind(sim);
  sim.teammateInformation=(a,b)=>{const result=information(a,b);if(a.team==='O')row.cues.push({t:sim.t,observer:a.idx,target:b.idx,kind:'owned-teammate',picture:snap(result)});return result;};
  sim.intents=new Proxy(sim.intents,{set(target,key,value){
   if(Number.isInteger(Number(key))&&sim.agents[Number(key)]?.team==='O')row.writes.push({t:sim.t,actor:Number(key),intent:snap(value),source:new Error().stack.split('\n').slice(2,5).map(s=>s.trim())});
   return Reflect.set(target,key,value);
  }});
  runReadObservers.set(sim,event=>row.reads.push(snap(event)));
  runContactObservers.set(sim,(e,phase,data)=>row.contactDecisions.push({t:sim.t,blocker:e.blocker.idx,defender:e.defender.idx,phase,data:snap(data)}));
 }
 const body=a=>({pos:{...a.pos},vel:{...a.vel},facing:a.facing,spin:a.body.spin,energy:a.body.energy,
  support:snap(a.body.support),squeeze:a.body.squeeze,sprintLoad:a.body.sprintLoad});
 const joint=j=>{const{a,b,actor,holder,...rest}=j;return snap({...rest,a:sim.world.indexOf(a),b:sim.world.indexOf(b),...(actor?{actor:sim.world.indexOf(actor)}:{}),...(holder?{holder:sim.world.indexOf(holder)}:{})});};
 const step=sim.world.step.bind(sim.world);
 sim.world.step=(intents,dt)=>{
  const before=selected?{t:sim.t,before:sim.agents.map(body),raw:snap(sim.cmds),final:snap(intents),
   behavior:sim.agents.map(a=>snap(a.behavior)),minds:sim.agents.map(a=>snap(a.mind)),
   joints:sim.world.joints.map(joint),observer:snap(sim.teammateAwareness),rng:snap(sim.rng)}:null;
  const report=step(intents,dt);row.steps++;
  if(row.run){
   for(const c of report.contacts)if(c.impulse>1e-8)row.physicalContacts.push({t:sim.t+dt,...c});
   if([.45,.95,1.45,1.95,2.95].some(t=>Math.abs(t-sim.t)<1e-8))row.opening.push({t:sim.t+dt,agents:sim.agents.map(a=>({idx:a.idx,pos:{...a.pos},vel:{...a.vel},kind:a.behavior.kind,job:a.behavior.plan?.kind,engaged:!!a.engagement}))});
  }
  if(before)row.frames.push({...before,after:sim.agents.map(body),jointOutputs:sim.world.joints.map(joint),report:snap(report)});
  return report;
 };
 return undefined;
};
game=new Game(home,away,{seed:fixture.seed,record:true,recordLevel:'standard',hooks:{playResult:observe}});
game.kickoffToStart();let steps=0;
while(!game.state.over){
 assert(steps<600&&performance.now()-started<manifest.maxGameSeconds*1000,'Declared game budget exhausted');
 game.step();steps++;
 if(steps%30===0)console.log(JSON.stringify({id,steps,quarter:game.state.quarter,clock:game.state.clock,seconds:(performance.now()-started)/1000}));
}
const result=game.result(),elapsedSeconds=(performance.now()-started)/1000;
const logSha256=hash(result.log),referenceLogSha256=hash(reference.log);
assert.equal(logSha256,referenceLogSha256,'Observer changed full recorded play-by-play/film/telemetry');
assert.deepEqual(result.score,reference.score);assert.deepEqual(game.state,reference.finalState);
assert.deepEqual([home,away].map(t=>result.box.team(t.abbr)),reference.teams.map(t=>t.box));
assert.equal(sourceVersion(),manifest.sourceSha256);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
assert.deepEqual(rows.filter(r=>r.selected).map(r=>r.index),declaration.plays);
const output={protocol:'designed-run-game-diagnosis-v1',commit,sourceSha256:sourceVersion(),flags,worldDefaults:baseline.worldDefaults,node:process.version,
 collectorSha256:sha(readFileSync(import.meta.filename)),manifestSha256:sha(readFileSync(manifestPath)),referenceSha256:sha(readFileSync(referencePath)),
 lockSha256:sha(readFileSync('package-lock.json')),id,fixtureSha256:hash(fixture),logSha256,referenceLogSha256,complete:true,
 score:result.score,steps,elapsedSeconds,log:result.log.map(({replay,...p})=>p),
 rows:rows.filter(r=>r.run),newGames:1,newPhysicalSnaps:rows.length};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,gzipSync(JSON.stringify(output)));
console.log(JSON.stringify({out,complete:true,id,score:result.score,selected:declaration.plays,elapsedSeconds,fullRecordedLogUnchanged:true}));
