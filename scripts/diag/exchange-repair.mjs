/** One native failure/control pair; the recovery-only arm restores only the
 * old early-departure decision. No game replay, RNG probes or extra sensing. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {savedExchange,savedExchanges} from './saved-exchange.ts';
import {handoffReach} from '../../src/sim/ball-transfer.ts';
import {sourceVersion} from '../source-version.ts';

const [out]=process.argv.slice(2);assert(out,'OUTPUT DIRECTORY required');
const hash=x=>createHash('sha256').update(x).digest('hex');
const manifest=JSON.parse(readFileSync('data/reviews/current/experimental-game-inputs.json'));
const flags=Object.fromEntries(Object.keys(manifest.flags).map(k=>[k,process.env[k]??null]));
assert.deepEqual(flags,manifest.flags);assert.equal(process.version,manifest.node);
const started=performance.now(),source=sourceVersion(),rows=[];
for(const [id,arm] of [['spread-air','recovery-only'],['spread-air','combined'],['west-spread','combined']]){
 const sim=savedExchange(id),qb=sim.qb,rb=sim.slot('RB'),input=savedExchanges.inputs.find(r=>r.id===id);
 sim.event('snap',sim.slot('C')??qb);
 if(arm==='recovery-only'){
  const job=rb.behavior,update=job.update.bind(job);
  job.update=(a,s)=>{
   // Exactly the recorded RunnerToMesh condition; private field is diagnostic
   // JavaScript state, never a new production policy or physical override.
   if(job.ride&&Math.hypot(job.mesh.x-a.pos.x,job.mesh.y-a.pos.y)<.7)job.passed=true;
   return update(a,s);
  };
 }
 const frames=[],cues=[],contacts=[];
 const information=sim.teammateInformation.bind(sim);
 sim.teammateInformation=(a,b)=>{
  const picture=information(a,b);if(a===qb&&b===rb)cues.push({t:sim.t,picture:structuredClone(picture)});return picture;
 };
 const body=a=>({pos:{...a.pos},vel:{...a.vel},facing:a.facing,energy:a.body.energy,support:structuredClone(a.body.support)});
 const step=sim.world.step.bind(sim.world);
 sim.world.step=(intents,dt)=>{
  const frame={t:sim.t,qb:body(qb),rb:body(rb),raw:[sim.cmds[qb.idx],sim.cmds[rb.idx]],final:[intents[qb.idx],intents[rb.idx]],carrier:sim.carrier?.idx??null};
  const report=step(intents,dt);
  frames.push({...structuredClone(frame),after:{qb:body(qb),rb:body(rb)}});
  for(const c of report.contacts)if(c.impulse>1e-8)contacts.push({t:sim.t+dt,...c});
  return report;
 };
 const start=performance.now();
 while(sim.phase==='live'&&(arm==='combined'||sim.handoffAt<0)&&sim.t<25){
  assert(performance.now()-start<30000,'Bounded play budget');sim.tick();
 }
 const transfer=frames.find(f=>f.carrier===rb.idx);
 // Read the completed result without run() appending another snap event.
 const result=sim.phase==='dead'?sim.buildResult():null;
 const summary={id,play:input.play,index:input.index,arm,handoffAt:sim.handoffAt,
  transferDistance:transfer?Math.hypot(transfer.qb.pos.x-transfer.rb.pos.x,transfer.qb.pos.y-transfer.rb.pos.y):null,
  physicalReach:handoffReach(qb,rb),endTime:sim.t,outcome:sim.outcome,
  censoring:result?null:'Stopped after physical exchange; no ending inferred',
  yards:result?.yards??null,rusher:sim.stats.rusher??null,
  teammateImpacts:contacts.filter(c=>sim.agents[c.i].team===sim.agents[c.j].team).length,
  qbRbImpacts:contacts.filter(c=>[c.i,c.j].includes(qb.idx)&&[c.i,c.j].includes(rb.idx)).length,
  elapsedSeconds:(performance.now()-start)/1000,
  original:{handoffAt:id==='west-spread'?1.05:-1,outcome:input.original.outcome,yards:input.original.yards,duration:input.original.duration},
  identicalOriginalFrames:hash(JSON.stringify(sim.frames))===input.original.frameSha256,
  identicalOriginalEvents:hash(JSON.stringify(sim.events))===input.original.eventsSha256};
 if(summary.transferDistance!==null)assert(summary.transferDistance<=summary.physicalReach);
 if(id==='west-spread'){assert(summary.identicalOriginalFrames);assert(summary.identicalOriginalEvents);}
 rows.push({...summary,frames,cues,contacts,events:sim.events});console.log(JSON.stringify(summary));
}
assert.equal(sourceVersion(),source);
const receipt={schema:'shotgun-exchange-repair-v1',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 sourceSha256:source,node:process.version,flags,worldDefaults:manifest.worldDefaults,
 comparatorSource:savedExchanges.inputs[0].sourceSha256,evidencePin:savedExchanges.evidencePin,
 fixtureSha256:hash(readFileSync('test/fixtures/shotgun-exchange.json.gz')),collectorSha256:hash(readFileSync(import.meta.filename)),
 inputManifestSha256:hash(readFileSync('data/reviews/current/experimental-game-inputs.json')),
 fullGames:0,nativePlays:rows.length,elapsedSeconds:(performance.now()-started)/1000,
 rows:rows.map(({frames,cues,contacts,events,...r})=>r)};
mkdirSync(out,{recursive:true});writeFileSync(`${out}/receipt.json`,JSON.stringify(receipt,null,2)+'\n');
writeFileSync(`${out}/trace.json.gz`,gzipSync(JSON.stringify({receipt,rows})));
