// One diagnostic, two saved-input paired native openings, through3s each.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {PlaySim} from '../../src/sim/playsim.js';
import {BallCarrier} from '../../src/sim/behaviors/carrier.js';
import {runReadObservers} from '../../src/sim/run-read-observer.js';
import {Agent} from '../../src/sim/agent.js';
import {chooseRunApproach} from '../../src/sim/run-approach.js';
import {unknownRouteRelevance} from './run-entry-relevance.ts';
import {sourceVersion} from '../source-version.ts';
const start=performance.now(),out='out/run-entry-relevance';mkdirSync(out,{recursive:true});
const snap=v=>JSON.parse(JSON.stringify(v,(_k,v)=>v instanceof Agent?{agent:v.idx}:v instanceof PlaySim?{sim:true}:v instanceof Map?[...v]:v instanceof Set?[...v]:v));
const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const inputPath='docs/reviews/run-entry-relevance/inputs.json.gz',bytes=readFileSync(inputPath),inputs=JSON.parse(gunzipSync(bytes));
const fixture=JSON.parse(readFileSync('test/fixtures/run-entry-approach.json'));
assert.equal(process.version,inputs.node);
assert.deepEqual(Object.fromEntries(Object.keys(inputs.flags).map(k=>[k,process.env[k]??null])),inputs.flags);
const diagnostic=[];
for(const id of ['failing','waiting-control']){
  const s=fixture[id==='failing'?'failing':'clear'],scene=fixture.entryScenes.find(r=>r.id===id);
  const actors=scene.actors.map(a=>new Agent(a.idx,a.team,a.slot,a.player,a.profile,
    {...structuredClone(scene.frame.before[a.idx]),profile:a.profile},{kind:'unused',update(){throw Error('No other decision');}}));
  // Use the same saved candidate list, avoiding new live/perception queries.
  const entries=scene.recordedRead.candidates.map(c=>c.entry);
  for(const entry of entries){
    const h=Math.atan2(entry.y-s.body.pos.y,entry.x-s.body.pos.x);
    const command={...s.command,vel:{x:Math.cos(h)*s.body.profile.vmax,y:Math.sin(h)*s.body.profile.vmax}};
    const r=chooseRunApproach(s.body,command,s.peers,s.t,'center');
    diagnostic.push({scene:id,entry,choice:r.kind,status:r.status,knownMinimumGap:r.knownMinimumGap,
      unknown:r.unknownPeers.map(idx=>{const peer=s.peers.find(p=>p.id===idx),a=actors[idx];
        return{id:idx,slot:a.slot,picture:peer.picture,vmax:a.profile.vmax,
          choices:r.choices.map(c=>({kind:c.kind,...unknownRouteRelevance(s.body.pos,s.body.profile.radius,c.path,peer.picture,peer.radius,a.profile.vmax)}))};})});
  }
}
const originalApproach=BallCarrier.prototype.approach,rows=[];
function make(saved){
  const roster=team=>Object.fromEntries(saved.input.actors.filter(a=>a.team===team).map(a=>[a.slot,a.player]));
  const sim=new PlaySim({offense:roster('O'),defense:roster('D'),offCall:structuredClone(saved.input.call),
    defCall:structuredClone(saved.input.defense),los:saved.los,ballY:saved.ballY,
    firstDownX:Math.min(110,saved.los+saved.state.distance),down:saved.state.down,
    seed:saved.input.rng.key,energy:new Map(saved.input.actors.map(a=>[a.player.id,a.body.energy])),
    record:false});
  // The fixture is post-constructor: P019 already paid its pre-snap stem's
  // energy/work, and the recorded RNG already includes pre-snap checks. Restore
  // those initial conditions once, rather than charging the stem a second time.
  // These are physics/test initialization, never future inputs to a controller.
  for(const a of sim.agents)Object.assign(a.body,structuredClone(saved.input.actors[a.idx].body),{profile:a.profile});
  Object.assign(sim.rng,saved.input.rng);
  return sim;
}
for(const saved of inputs.rows){
  for(const arm of ['information-only','portable-admission']){
    const runStart=performance.now();
    BallCarrier.prototype.approach=arm==='information-only'?function(){return null;}:originalApproach;
    const sim=make(saved),frames=[],reads=[],cues=new Map();
    const initial={bodies:sim.agents.map(a=>snap(a.body)),rng:snap(sim.rng),minds:sim.agents.map(a=>snap(a.mind)),
      behaviors:sim.agents.map(a=>snap(a.behavior)),recognition:sim.defense.map(a=>snap(a.recog))};
    const row={play:saved.nativePlay,role:saved.role,arm,initialHash:hash(initial),
      savedInitialBodiesEqual:hash(initial.bodies)===hash(saved.input.actors.map(a=>a.body)),
      savedPostConstructorRngEqual:hash(initial.rng)===hash(saved.input.rng),frames,reads};rows.push(row);
    assert(row.savedInitialBodiesEqual&&row.savedPostConstructorRngEqual,'Saved physical/RNG initialization must match');
    runReadObservers.set(sim,e=>{if(e.actor===6)reads.push(snap(e));});
    const query=sim.teammateInformation.bind(sim);
    sim.teammateInformation=(a,b)=>{const picture=query(a,b);if(a.idx===6)cues.set(sim.t+':'+b.idx,{t:sim.t,target:b.idx,picture:snap(picture)});return picture;};
    const step=sim.world.step.bind(sim.world);
    sim.world.step=(intents,dt)=>{
      const joints=sim.world.joints.filter(j=>j.kind==='hands').map(j=>({a:sim.world.indexOf(j.a),b:sim.world.indexOf(j.b),
        normalForce:j.normalForce??0,tangentForce:j.tangentForce??0}));
      const frame={t:sim.t,before:sim.agents.map(a=>snap(a.body)),raw:snap(sim.cmds),final:snap(intents),joints};
      const report=step(intents,dt);frame.after=sim.agents.map(a=>snap(a.body));frame.report=snap(report);frames.push(frame);return report;};
    while(sim.phase==='live'&&sim.t<3-1e-9){assert(performance.now()-runStart<5000,'5s per continuation budget');sim.tick();}
    row.end=sim.t;row.censored=sim.phase==='live';row.outcome=sim.outcome;row.events=snap(sim.events);row.cues=[...cues.values()];
    row.finalState={bodies:sim.agents.map(a=>snap(a.body)),rng:snap(sim.rng),ball:snap(sim.ball)};
    row.los=saved.los;row.elapsedSeconds=(performance.now()-runStart)/1000;
  }
}
BallCarrier.prototype.approach=originalApproach;
function reduce(row){
  const impacts=row.frames.flatMap(f=>f.report.contacts.filter(c=>c.i<11&&c.j<11&&c.impulse>1e-8).map(c=>({t:f.t,...c})));
  const durations={fast:0,slower:0,gather:0},statuses={clear:0,blocked:0,unknown:0};
  for(const e of row.reads.filter(r=>r.phase==='entry-approach')){durations[e.choice]+=.05;statuses[e.status]+=.05;}
  const loads={};for(const f of row.frames)for(const j of f.joints)if(j.a<11&&j.b>=11){
    const p=loads[j.a]??={normalImpulse:0,absoluteTangentImpulse:0};p.normalImpulse+=j.normalForce*.05;p.absoluteTangentImpulse+=Math.abs(j.tangentForce)*.05;}
  const firstLos=row.frames.find(f=>f.after[6].pos.x>=row.los),last=row.frames.at(-1).after[6];
  return{play:row.play,arm:row.arm,end:row.end,censored:row.censored,outcome:row.outcome,
    losCrossing:firstLos?firstLos.t+.05:null,rb:{pos:last.pos,vel:last.vel,speed:Math.hypot(last.vel.x,last.vel.y)},
    impacts,durations,statuses,loads,entryReads:row.reads.filter(r=>r.phase==='aim').map(r=>({t:r.t,selected:r.selected})),
    events:row.events.filter(e=>['carrier_contact','fall','tackle','block_climb'].includes(e.type))};
}
const comparisons=[];
for(const play of [...new Set(rows.map(r=>r.play))]){
  const [base,next]=rows.filter(r=>r.play===play);assert.equal(base.initialHash,next.initialHash);
  const first=next.frames.find((f,i)=>hash(f.final)!==hash(base.frames[i]?.final));
  comparisons.push({play,initialStatesEqual:true,firstChangedRequest:first?{t:first.t,sameBodiesBefore:hash(first.before)===hash(base.frames.find(f=>f.t===first.t).before),
    actors:first.final.flatMap((v,i)=>hash(v)===hash(base.frames.find(f=>f.t===first.t).final[i])?[]:[i])}:null,
    fullFramesEqual:hash(base.frames)===hash(next.frames),summaries:[reduce(base),reduce(next)]});
}
const report={schema:'run-entry-relevance-coupled-v1',sourceSha256:sourceVersion(),inputSha256:hash(bytes),collectorSha256:hash(readFileSync(import.meta.filename)),
  node:process.version,flags:inputs.flags,worldDefaults:inputs.worldDefaults,diagnostic,comparisons,rows,
  historicalSetupLimits:[...inputs.missingHistoricalSetup,'Original pre-constructor energy/mind state and pre-snap recognition history are not serialized'],
  method:'Saved final calls/players/down/distance/LOS/ballY; default scouting/matchup/mind setup. Restore all22 saved post-constructor physical bodies and RNG once at t=0. No subsequent frame injection.',
  intervention:'Information correction in both arms. Baseline bypasses only BallCarrier.approach, so original entry ranking/request remains. Candidate uses portable production admission. All22 players react; no old-frame injection or game prefix.',
  physicalExecutions:4,completedGames:0,elapsedSeconds:(performance.now()-start)/1000};
writeFileSync(out+'/native.json.gz',gzipSync(JSON.stringify(report),{mtime:0}));
writeFileSync(out+'/summary.json',JSON.stringify({...report,rows:undefined},null,2)+'\n');
console.log(JSON.stringify({source:report.sourceSha256,comparisons,initialization:rows.map(r=>({play:r.play,arm:r.arm,savedBodies:r.savedInitialBodiesEqual,savedRng:r.savedPostConstructorRngEqual})),elapsedSeconds:report.elapsedSeconds}));
