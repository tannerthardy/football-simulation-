// Metadata-only replay of two already collected physical histories, then a
// saved-decision diagnostic and an ordinary changed-QB-motion control.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PlaySim} from '../../src/sim/playsim.js';
import {Agent} from '../../src/sim/agent.js';
import {runReadObservers} from '../../src/sim/run-read-observer.js';
import {chooseRunApproach} from '../../src/sim/run-approach.js';
import {TeammateInformation} from '../../src/sim/teammate-information.js';
import {World} from '../../src/physics/world.js';
import {sourceVersion} from '../source-version.ts';
import {historicalRegion,historicalRouteRelevance} from './historical-qb-motion.ts';
const start=performance.now(),out='out/historical-qb';mkdirSync(out,{recursive:true});
const snap=v=>JSON.parse(JSON.stringify(v,(_k,v)=>v instanceof Agent?{agent:v.idx}:v instanceof PlaySim?{sim:true}:v instanceof Map?[...v]:v instanceof Set?[...v]:v));
const hash=v=>createHash('sha256').update(Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const priorPath='docs/reviews/run-entry-relevance/native.json.gz',priorBytes=readFileSync(priorPath),prior=JSON.parse(gunzipSync(priorBytes));
const inputPath='docs/reviews/run-entry-relevance/inputs.json.gz',inputBytes=readFileSync(inputPath),inputs=JSON.parse(gunzipSync(inputBytes));
assert.equal(process.version,inputs.node);
assert.deepEqual(Object.fromEntries(Object.keys(inputs.flags).map(k=>[k,process.env[k]??null])),inputs.flags);
const rows=[];
for(const saved of inputs.rows){
  const runStart=performance.now(),reference=prior.rows.find(r=>r.play===saved.nativePlay&&r.arm==='portable-admission');
  const roster=team=>Object.fromEntries(saved.input.actors.filter(a=>a.team===team).map(a=>[a.slot,a.player]));
  const sim=new PlaySim({offense:roster('O'),defense:roster('D'),offCall:structuredClone(saved.input.call),
    defCall:structuredClone(saved.input.defense),los:saved.los,ballY:saved.ballY,down:saved.state.down,
    firstDownX:Math.min(110,saved.los+saved.state.distance),seed:saved.input.rng.key,
    energy:new Map(saved.input.actors.map(a=>[a.player.id,a.body.energy])),record:false});
  for(const a of sim.agents)Object.assign(a.body,structuredClone(saved.input.actors[a.idx].body),{profile:a.profile});
  Object.assign(sim.rng,saved.input.rng);
  const reads=[],cues=new Map(),frames=[];
  runReadObservers.set(sim,e=>{if(e.actor===6)reads.push(snap(e));});
  const query=sim.teammateInformation.bind(sim);
  sim.teammateInformation=(a,b)=>{const p=query(a,b);if(a.idx===6)cues.set(sim.t+':'+b.idx,{t:sim.t,target:b.idx,picture:snap(p)});return p;};
  const step=sim.world.step.bind(sim.world);
  sim.world.step=(intents,dt)=>{
    const joints=sim.world.joints.filter(j=>j.kind==='hands').map(j=>({a:sim.world.indexOf(j.a),b:sim.world.indexOf(j.b),normalForce:j.normalForce??0,tangentForce:j.tangentForce??0}));
    const frame={t:sim.t,before:sim.agents.map(a=>snap(a.body)),raw:snap(sim.cmds),final:snap(intents),joints};
    const report=step(intents,dt);frame.after=sim.agents.map(a=>snap(a.body));frame.report=snap(report);frames.push(frame);return report;};
  while(sim.phase==='live'&&sim.t<3-1e-9){assert(performance.now()-runStart<5000,'5s metadata-replay budget');sim.tick();}
  assert.deepEqual(frames,reference.frames,'Historical metadata must not alter physical execution');
  assert.deepEqual(snap(sim.events),reference.events);
  assert.deepEqual({bodies:sim.agents.map(a=>snap(a.body)),rng:snap(sim.rng),ball:snap(sim.ball)},reference.finalState);
  const scenes=[];
  for(const read of reads.filter(e=>e.phase==='aim')){
    const frame=frames.find(f=>Math.abs(f.t-read.t)<1e-9),pictures=[...cues.values()].filter(c=>c.t===read.t);
    if(!pictures.length){scenes.push({t:read.t,status:'own-body-preview-unsupported'});continue;}
    const peers=pictures.map(c=>({id:c.target,picture:c.picture,radius:saved.input.actors[c.target].profile.radius,
      brake:saved.input.actors[c.target].profile.brake}));
    const own=frame.before[6],entries=[];
    for(const entry of [...read.candidates].sort((a,b)=>a.score-b.score)){
      const p=entry.entry,h=Math.atan2(p.y-own.pos.y,p.x-own.pos.x),command={...frame.raw[6],vel:{x:Math.cos(h)*own.profile.vmax,y:Math.sin(h)*own.profile.vmax}};
      const approach=chooseRunApproach(own,command,peers,read.t,'center');
      const choices=approach.choices.map(c=>{
        const unknown=c.unknownPeers.map(idx=>{const peer=peers.find(p=>p.id===idx),profile=saved.input.actors[idx].profile;
          return{id:idx,slot:saved.input.actors[idx].slot,picture:peer.picture,
            ...historicalRouteRelevance(own.pos,own.profile.radius,own.profile,c.path,peer.picture,peer.radius,profile)};});
        return{kind:c.kind,up:c.up,knownMinimumGap:c.knownMinimumGap,unknown,
          ordinaryMovingEntrySupported:c.kind!=='gather'&&c.up&&c.knownMinimumGap>=0&&unknown.every(p=>p.relevance==='disjoint'),
          end:c.path.at(-1)};
      });
      entries.push({entry:p,score:entry.score,originallySelected:hash(p)===hash(read.selected),originalChoice:approach.kind,choices});
    }
    const supported=entries.find(e=>e.choices.some(c=>c.ordinaryMovingEntrySupported));
    scenes.push({t:read.t,body:own,pictures,originallySelected:read.selected,entries,
      supportedEntry:supported?.entry??null,
      changedDestination:supported?hash(supported.entry)!==hash(read.selected):false});
  }
  rows.push({play:saved.nativePlay,physicalFramesEventsFinalRngExact:true,framesCompared:frames.length,
    physicalReferenceSha256:hash(reference.frames),scenes,elapsedSeconds:(performance.now()-runStart)/1000});
}
// The control forks actual QB motion from the SAME legitimately acquired past
// sample. World/collisions stay enabled. Neither branch is a football outcome.
const target=rows.find(r=>r.play===32),scene=target.scenes.find(s=>s.pictures?.some(c=>c.target===0&&c.picture.age>c.picture.predictedFor+1e-9));
assert(scene,'Expected a stale QB decision');
const picture=scene.pictures.find(c=>c.target===0).picture,reference=prior.rows.find(r=>r.play===32&&r.arm==='portable-admission');
const sampleFrame=reference.frames.find(f=>Math.abs(f.t-picture.sampledAt)<1e-9);assert(sampleFrame);
const origin=historicalRegion(picture,sampleFrame.before[0].profile,0).origin;
assert(Math.hypot(origin.x-sampleFrame.before[0].pos.x,origin.y-sampleFrame.before[0].pos.y)<1e-8);
assert.deepEqual(picture.sampledVel,sampleFrame.before[0].vel);
const controls=[];
for(const branch of ['continue','change-motion']){
  const qb=structuredClone(sampleFrame.before[0]),rb=structuredClone(sampleFrame.before[6]),world=new World([qb,rb],{handContact:'center'});
  world.time=picture.sampledAt;
  const observer={idx:6,team:'O',get pos(){return rb.pos;},get vel(){return rb.vel;},get facing(){return rb.facing;},
    engagement:null,eyes:null,profile:rb.profile,mind:{observationDelay:()=>picture.availableAt-picture.sampledAt},isDown:()=>false};
  const teammate={idx:0,team:'O',get pos(){return qb.pos;},get vel(){return qb.vel;},get facing(){return qb.facing;},
    engagement:null,eyes:null,profile:qb.profile,mind:observer.mind,isDown:()=>false};
  const info=new TeammateInformation([observer,teammate],new Map()),samples=[];
  info.sense([observer,teammate],picture.sampledAt,.05);
  const snapshot={...picture,age:0};
  for(let tick=1;tick<=20;tick++){
    const toward={x:rb.pos.x-qb.pos.x,y:rb.pos.y-qb.pos.y},d=Math.hypot(toward.x,toward.y);
    const command=branch==='continue'?{vel:{...picture.sampledVel}}:{vel:{x:qb.profile.vmax*toward.x/d,y:qb.profile.vmax*toward.y/d},cutSkill:1.3};
    const report=world.step([command,{vel:{x:rb.profile.vmax,y:0}}],.05),elapsed=tick*.05,now=picture.sampledAt+elapsed;
    info.sense([observer,teammate],now,.05);
    const p=info.query(6,0,now,.05),region=historicalRegion(snapshot,qb.profile,elapsed);
    const deviation=Math.hypot(qb.pos.x-region.center.x,qb.pos.y-region.center.y);
    samples.push({elapsed,pos:{...qb.pos},vel:{...qb.vel},picture:snap(p),regionRadius:region.radius,deviation,
      insideOrdinaryBound:deviation<=region.radius+1e-8,contacts:report.contacts});
    assert.equal(report.contacts.length,0,'External contact invalidates this ordinary-motion control');
    assert(deviation<=region.radius+1e-8,'Changed ordinary motion escaped the historical uncertainty bound');
  }
  controls.push({branch,samples});
}
assert.notDeepEqual(controls[0].samples[5].vel,controls[1].samples[5].vel);
assert.deepEqual(controls[0].samples[5].picture,controls[1].samples[5].picture,'At first delivery only the common past sample may be available');
const decisionSummary=rows.map(r=>({play:r.play,physicalFramesExact:r.physicalFramesEventsFinalRngExact,
  decisions:r.scenes.filter(s=>s.entries).map(s=>({t:s.t,entryCount:s.entries.length,supportedEntry:s.supportedEntry,changedDestination:s.changedDestination,
    qbGaps:s.entries.flatMap(e=>e.choices.flatMap(c=>c.unknown.filter(p=>p.id===0).map(p=>p.minimumOrdinaryGap)))}))}));
const result={schema:'historical-qb-test-v1',sourceSha256:sourceVersion(),node:process.version,flags:inputs.flags,worldDefaults:inputs.worldDefaults,
  referenceSha256:hash(priorBytes),inputSha256:hash(inputBytes),collectorSha256:hash(readFileSync(import.meta.filename)),
  metadataReplayExecutions:2,mechanicalControlBranches:2,completedGames:0,rows,controls,decisionSummary,
  historicalSetupLimits:prior.historicalSetupLimits,elapsedSeconds:(performance.now()-start)/1000};
writeFileSync(out+'/result.json.gz',gzipSync(JSON.stringify(result),{mtime:0}));
writeFileSync(out+'/summary.json',JSON.stringify({...result,rows:undefined,controls:undefined},null,2)+'\n');
console.log(JSON.stringify({decisionSummary,changedQbControl:{firstDeliverySame:true,realMotionDifferent:true,ordinaryBoundContainsBoth:true},elapsedSeconds:result.elapsedSeconds}));
