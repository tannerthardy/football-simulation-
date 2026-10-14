/** Bounded gather-release investigation. Capture the native Y prefix once,
 * compare held commands from its identical state, then run coupled Y/H only
 * after the mechanism is supported. Never install the failed post-mesh trial.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { Agent } from '../../src/sim/agent.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { spaceTeammates } from '../../src/sim/spacing.js';
import { previewFreeMovement, type MovementSample } from '../../src/physics/movement-preview.js';
import { supportParams } from '../../src/physics/support.js';
import type { Intent } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

const sha = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
const encode = (v: unknown) => JSON.stringify(v, (_k, x) => x instanceof Agent ? { agent: x.idx }
  : x instanceof PlaySim ? { sim: true } : x instanceof Map || x instanceof Set ? [...x]
  : x instanceof Float64Array ? [...x] : x);
const copy = (v: unknown): any => JSON.parse(encode(v));
function nonFiniteFields(value:any,path:string[]=[]):{path:string[];value:string}[] {
  if(typeof value==='number'&&!Number.isFinite(value))return [{path,value:String(value)}];
  return value&&typeof value==='object'?Object.entries(value).flatMap(([key,v])=>nonFiniteFields(v,[...path,key])):[];
}
function restoreBody(fixture:any) {
  const body=structuredClone(fixture.body);
  for(const field of fixture.bodyNonFinite) {
    let target=body;for(const key of field.path.slice(0,-1))target=target[key];
    target[field.path.at(-1)!]=Number(field.value);
  }
  return body;
}
const candidateSource = '60120551f0ad09415b47150f5edd9cdbd179955010a33d557af817fec31a01f1';
const phase = process.argv[2] ?? 'mechanism', started = performance.now();
const baseline = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
assert.equal(process.version, 'v22.23.3');
assert.deepEqual(Object.fromEntries(Object.keys(baseline.flags).map(k => [k, process.env[k] ?? null])), baseline.flags);
const savedBytes = readFileSync('out/y-coordination/saved/packets/candidate-outcomes.json.gz');
assert.equal(sha(savedBytes), 'c8b55083a18a08daf990f233e6fd891e8ceb538dd04401102e8b8aec3f2ddbbf');
const saved = JSON.parse(gunzipSync(savedBytes).toString());
const statePath = 'data/reviews/current/rb-gather-release-state.json';
mkdirSync('out/rb-gather-release', { recursive: true });

function createSim(row: any): PlaySim {
  const input = row.input, setup = row.installedSetup;
  return new PlaySim({
    offense: pickOffense(generateTeam(new Rng(input.o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID[input.formation].personnel),
    defense: pickDefense(generateTeam(new Rng(input.d), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation: FORMATION_BY_ID[input.formation], flip: input.flip, kind: 'run', run: RUN_BY_ID[input.concept], label: input.id },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[input.front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: setup.los, ballY: CENTER_Y, firstDownX: setup.firstDownX, seed: input.seed,
  });
}
function constraints(sim: PlaySim) {
  const result = new Set(sim.world.joints.filter(j => j.kind !== 'grasp' || !j.broken).flatMap(j => [j.a,j.b]));
  if (sim.bond) { result.add(sim.bond.carrier.body); sim.bond.tacklers.forEach(a => result.add(a.body)); }
  for (const c of sim.lastStep?.contacts ?? []) { result.add(sim.agents[c.i].body); result.add(sim.agents[c.j].body); }
  return result;
}
function nativeHash(sim: PlaySim) {
  return sha(encode({ t:sim.t,rng:sim.rng,events:sim.events,perception:sim.perception,
    agents:sim.agents.map(a=>({body:a.body,mind:a.mind,recog:a.recog,behavior:a.behavior,tags:a.tags})),
    engagements:sim.engagements,joints:sim.world.joints,intents:sim.intents,cmds:Reflect.get(sim,'cmds') }));
}
function clearance(body: any, samples: readonly MovementSample[], peer: any): number {
  let px=body.pos.x-peer.information.pos.x,py=body.pos.y-peer.information.pos.y;
  let minimum=Math.hypot(px,py)-peer.touch;
  for (const sample of samples) {
    const rx=sample.pos.x-peer.information.pos.x-peer.information.vel.x*sample.t;
    const ry=sample.pos.y-peer.information.pos.y-peer.information.vel.y*sample.t;
    const ex=rx-px,ey=ry-py;
    const along=Math.max(0,Math.min(1,-(px*ex+py*ey)/Math.max(1e-12,ex*ex+ey*ey)));
    minimum=Math.min(minimum,Math.hypot(px+along*ex,py+along*ey)-peer.touch);
    px=rx;py=ry;
  }
  return minimum;
}

if (phase === 'capture') {
  assert.equal(sourceVersion(),candidateSource);
  const row=saved.panel.find((r:any)=>!r.input.flip),sim=createSim(row),hashes:string[]=[];
  let raw:any=null,fixture:any=null;
  const query=sim.teammateInformation.bind(sim);
  sim.teammateInformation=(a,b)=>{raw??=copy(sim.intents);return query(a,b);};
  const step=sim.world.step.bind(sim.world),done={};
  sim.world.step=(intents,dt)=>{
    if (Math.abs(sim.t-2.35)<1e-8) {
      const a=sim.agents[6],s=a.body.support!,constrained=constraints(sim);
      const neutral=encode({body:a.body,awareness:sim.teammateAwareness,rng:sim.rng});
      const peers=sim.agents.filter(b=>b!==a&&b.team===a.team).map(b=>({idx:b.idx,slot:b.slot,
        touch:.9*(a.profile.radius+b.profile.radius),information:copy(query(a,b))}));
      const speed=Math.hypot(a.vel.x,a.vel.y);
      fixture={protocol:'rb-gather-release-exact-state-v2',candidate:'68284671d062dfd4e7e879bcd037bc21dad3e3ac',
        review:'a6bf3cf47af738298c67ec45301d17c1d06b4cd3',source:sourceVersion(),input:row.input,
        now:sim.t,body:copy(a.body),bodyNonFinite:nonFiniteFields(a.body),raw:raw[6],final:copy(intents[6]),peers,
        guards:{speed,down:a.isDown(sim.t),engaged:!!a.engagement,constrained:constrained.has(a.body),
          free:!!intents[6]?.free,dive:!!intents[6]?.dive,lunge:!!intents[6]?.lunge,
          requestedSqueeze:intents[6]?.squeeze??0,activeSqueeze:a.body.squeeze??0,push:intents[6]?.push??0,
          support:s.state,foot:!!s.foot,strike:!!s.strike,lean:Math.hypot(s.lean.x,s.lean.y),load:Math.hypot(s.load.x,s.load.y),
          materialTurn:Math.abs(intents[6]!.vel.x*a.vel.y-intents[6]!.vel.y*a.vel.x)/speed},
        matchedSavedPrefixHashes:hashes,seconds:(performance.now()-started)/1000};
      assert.deepEqual(restoreBody(fixture),a.body,'Decoded fixture must preserve every native body/support field');
      assert.equal(encode({body:a.body,awareness:sim.teammateAwareness,rng:sim.rng}),neutral);
      throw done;
    }
    return step(intents,dt);
  };
  try { while(sim.phase==='live') {raw=null;sim.tick();hashes.push(nativeHash(sim));} }
  catch(error) {if(error!==done)throw error;}
  assert.ok(fixture);
  assert.deepEqual(hashes,row.legacyStateRngHashes.slice(0,hashes.length));
  const review=JSON.parse(gunzipSync(readFileSync('out/y-coordination/review.json.gz')).toString());
  const frame=review.panel.find((r:any)=>!r.input.flip&&!r.trial).frames.find((f:any)=>Math.abs(f.t-2.35)<1e-8);
  assert.deepEqual(fixture.body,frame.before[6]);assert.deepEqual(fixture.raw,frame.raw[6]);assert.deepEqual(fixture.final,frame.final[6]);
  writeFileSync(statePath,JSON.stringify(fixture,null,2)+'\n');
  console.log(JSON.stringify({phase,statePath,sha256:sha(readFileSync(statePath)),matchedSavedHashes:hashes.length,guards:fixture.guards,seconds:fixture.seconds}));
} else if (phase === 'mechanism') {
  const fixture=JSON.parse(readFileSync(statePath,'utf8'));
  const sim=createSim(saved.panel.find((r:any)=>!r.input.flip)),a=sim.agents[6];
  a.body=restoreBody(fixture);
  const peers=fixture.peers.filter((p:any)=>p.information.source!=='unavailable');
  const requests={release:fixture.raw,half:{...fixture.raw,vel:{x:fixture.raw.vel.x*.5,y:fixture.raw.vel.y*.5}},
    gather:{...fixture.raw,vel:{x:0,y:0}}};
  function assess(request:Intent, visible=peers) {
    const before=encode(a.body),samples=previewFreeMovement(a.body,request,fixture.now,12);
    assert.equal(encode(a.body),before);
    return {request,samples,clearances:visible.map((p:any)=>({idx:p.idx,slot:p.slot,
      at300ms:clearance(a.body,samples.slice(0,6),p),at600ms:clearance(a.body,samples,p)})),
      up:samples.every(s=>s.support==='up')};
  }
  const comparison=Object.fromEntries(Object.entries(requests).map(([k,v])=>[k,assess(v)]));
  function spacing(body:any,visible:any[]) {
    a.body=structuredClone(body);
    const intents=sim.agents.map(p=>p===a?structuredClone(fixture.raw):{vel:{x:0,y:0}});
    spaceTeammates(sim.agents,intents,(o,b)=>o===a?visible.find(p=>p.idx===b.idx)?.information??null:null,{now:fixture.now});
    return {request:intents[6],forecast:assess(intents[6],visible)};
  }
  const exactBody=restoreBody(fixture),exactDecision=spacing(exactBody,peers);
  const originalSpeed=fixture.guards.speed;
  const transition=[1.95,2,2.05].map(speed=>{const body=structuredClone(exactBody);
    body.vel.x*=speed/originalSpeed;body.vel.y*=speed/originalSpeed;
    return {speed,...spacing(body,peers)};});
  const clearPath=spacing(exactBody,[]);
  assert.deepEqual(clearPath.request,fixture.raw);
  assert.deepEqual(clearPath.forecast.clearances,[]);
  assert.ok(Math.hypot(clearPath.forecast.samples.at(-1)!.vel.x,clearPath.forecast.samples.at(-1)!.vel.y)>originalSpeed);
  assert.ok(comparison.release.clearances.find((p:any)=>p.idx===2).at600ms<-.3);
  assert.ok(comparison.gather.up&&comparison.gather.clearances.every((p:any)=>p.at600ms>0));
  assert.deepEqual(exactDecision.request,sourceVersion()===candidateSource?fixture.raw:requests.gather);
  assert.deepEqual(transition.map(r=>r.request),sourceVersion()===candidateSource
    ?[fixture.raw,requests.gather,requests.gather]:[requests.gather,requests.gather,requests.gather]);
  const output={protocol:'rb-gather-release-mechanism-v1',source:sourceVersion(),fixtureSha256:sha(readFileSync(statePath)),
    identicalStateComparison:comparison,exactDecision,transition,
    transitionCaution:'Secondary continuity control; changed speed also changes physical braking. The primary request comparison changes no state.',
    clearPath,forecastCaution:'Own free motion and acquired constant-velocity teammate pictures only; no coupled collision-avoidance claim.',
    tube:.5*supportParams(a.profile).traction/a.profile.massKg*.6**2,seconds:(performance.now()-started)/1000};
  const bytes=gzipSync(JSON.stringify(output));writeFileSync('out/rb-gather-release/mechanism.json.gz',bytes);
  console.log(JSON.stringify({phase,source:output.source,comparison:Object.fromEntries(Object.entries(comparison).map(([k,v]:any)=>[k,{request:v.request,up:v.up,clearances:v.clearances}])),
    exactDecision:exactDecision.request,transition:transition.map(r=>({speed:r.speed,request:r.request})),clearPath:clearPath.request,
    seconds:output.seconds,sha256:sha(bytes)}));
} else if (phase === 'first-change') {
  const sim=createSim(saved.panel.find((r:any)=>!r.input.flip)),query=sim.teammateInformation.bind(sim);
  let raw:any=null,output:any=null;
  sim.teammateInformation=(a,b)=>{raw??=copy(sim.intents);return query(a,b);};
  const step=sim.world.step.bind(sim.world),done={};
  sim.world.step=(intents,dt)=>{
    if(Math.abs(sim.t-1.10)<1e-8) {
      const a=sim.agents[2],body=copy(a.body),constrained=constraints(sim);
      const peers=sim.agents.filter(b=>b!==a&&b.team===a.team).map(b=>({idx:b.idx,slot:b.slot,
        touch:.9*(a.profile.radius+b.profile.radius),information:copy(query(a,b))}))
        .filter(p=>p.information.source!=='unavailable');
      const radial=structuredClone(raw);
      spaceTeammates(sim.agents,radial,(o,b)=>o===a?peers.find(p=>p.idx===b.idx)?.information??null:null);
      const requests={radial:radial[2],gather:intents[2]};
      const comparison=Object.fromEntries(Object.entries(requests).map(([kind,request])=>{
        const samples=previewFreeMovement(a.body,request!,sim.t,12);
        return [kind,{request,samples,up:samples.every(s=>s.support==='up'),clearances:peers.map(p=>({idx:p.idx,slot:p.slot,
          at300ms:clearance(body,samples.slice(0,6),p),at600ms:clearance(body,samples,p)}))}];
      }));
      output={protocol:'rb-gather-release-first-change-v1',source:sourceVersion(),now:sim.t,
        body,raw:raw[2],peers,engaged:!!a.engagement,constrained:constrained.has(a.body),comparison,
        seconds:(performance.now()-started)/1000};
      assert.deepEqual(copy(a.body),body);throw done;
    }
    return step(intents,dt);
  };
  try {while(sim.phase==='live'){raw=null;sim.tick();}}catch(error){if(error!==done)throw error;}
  assert.ok(output);
  const bytes=gzipSync(JSON.stringify(output));writeFileSync('out/rb-gather-release/first-change.json.gz',bytes);
  console.log(JSON.stringify({phase,source:output.source,now:output.now,engaged:output.engaged,constrained:output.constrained,
    comparison:Object.fromEntries(Object.entries(output.comparison).map(([k,v]:any)=>[k,{request:v.request,up:v.up,clearances:v.clearances}])),
    seconds:output.seconds,sha256:sha(bytes)}));
} else if (phase === 'coupled') {
  assert.notEqual(sourceVersion(),candidateSource,'Run coupled candidate only after a mechanism-level correction exists');
  const panel:any[]=[];
  for (const row of saved.panel) {
    const sim=createSim(row),query=sim.teammateInformation.bind(sim),frames:any[]=[],hashes:string[]=[];
    let raw:any=null;
    sim.teammateInformation=(a,b)=>{raw??=copy(sim.intents);return query(a,b);};
    const step=sim.world.step.bind(sim.world);
    sim.world.step=(intents,dt)=>{
      const before=copy(sim.agents.map(a=>a.body)),final=copy(intents);
      const information=copy(query(sim.agents[6],sim.agents[2]));
      const report=step(intents,dt);
      frames.push({t:sim.t,before,raw,final,information,after:copy(sim.agents.map(a=>a.body)),contacts:copy(report.contacts)});
      return report;
    };
    while(sim.phase==='live'&&sim.t<10) {raw=null;sim.tick();hashes.push(nativeHash(sim));}
    assert.notEqual(sim.phase,'live');
    const firstDifference=hashes.findIndex((h,i)=>h!==row.legacyStateRngHashes[i]);
    panel.push({input:row.input,fromSnap:true,bodyRestores:0,hashes,frames,
      firstDifferenceBoundary:firstDifference<0?null:(firstDifference+1)*.05,outcome:copy(sim.buildResult()),endTime:sim.t,
      reference:row.nativeOutcome,referenceEndTime:row.endTime});
  }
  const output={protocol:'rb-gather-release-coupled-v1',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    source:sourceVersion(),flags:baseline.flags,worldDefaults:baseline.worldDefaults,panel,newNativePlays:2,newGames:0,
    seconds:(performance.now()-started)/1000};
  const bytes=gzipSync(JSON.stringify(output));writeFileSync('out/rb-gather-release/coupled.json.gz',bytes);
  console.log(JSON.stringify({phase,source:output.source,seconds:output.seconds,sha256:sha(bytes),cases:panel.map(r=>({input:r.input,
    firstDifferenceBoundary:r.firstDifferenceBoundary,yards:r.outcome.yards,endTime:r.endTime,
    contacts:r.frames.flatMap((f:any)=>f.contacts.filter((c:any)=>[c.i,c.j].includes(2)&&[c.i,c.j].includes(6)).map((c:any)=>({t:f.t,...c})))}))}));
} else throw new Error(`Unknown phase: ${phase}`);
