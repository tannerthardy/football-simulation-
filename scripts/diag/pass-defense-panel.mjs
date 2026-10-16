/** Native pass-defense mechanism panel, explicit inputs and bounded cost.
 * OUTPUT_DIR [case IDs separated by commas] [--neutral]
 * A passive observer copies consumed pictures/requests and achieved movement.
 * No extra sighting, judgment, physics step, outcome selection or forced throw.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { Rng } from '../../src/core/rng.ts';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.ts';
import { PASS_BY_ID } from '../../src/playbook/concepts.ts';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.ts';
import { FORMATION_BY_ID } from '../../src/playbook/formations.ts';
import { Agent } from '../../src/sim/agent.ts';
import { PlaySim } from '../../src/sim/playsim.ts';
import { CoverageDefender } from '../../src/sim/coverage/defender.ts';
import { movementObjective } from '../../src/sim/movement-objective.ts';
import { sourceVersion } from '../source-version.ts';

const [out, selection, neutrality] = process.argv.slice(2);
assert.ok(out && !existsSync(out), 'Choose a fresh output directory; evidence is never overwritten');
const hash = v => createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const copy = v => JSON.parse(JSON.stringify(v, (_k,x)=> x instanceof Agent ? {agent:x.idx}
 : x instanceof PlaySim ? {sim:true} : x instanceof Set ? [...x] : x instanceof Map ? [...x] : x));
const pairs = [
 ['four_verts','cover4'], ['four_verts','cover3_match'],
 ['mesh','cover1'], ['mesh','cover3_match'],
 ['drive','cover1_off'], ['drive','cover4'],
 ['slant_flat','cover3'], ['slant_flat','cover2_match'],
 ['dagger','cover3_match'], ['stick','cover4_palms'],
 ['smash','cover2_match'], ['pa_post_dig','cover4'],
 ['levels','cover4'], ['flood','cover3_match'],
];
const fixtures = [1,2].flatMap(cohort=>pairs.map(([concept,coverage],i)=>({id:`R${cohort}-C${String(i+1).padStart(2,'0')}`,
 cohort,concept,coverage,offenseSeed:cohort===1?101:303,defenseSeed:cohort===1?102:304,
 playSeed:8100+i*37+cohort,flip:cohort===2,ballY:cohort===1?26:20})));
const fresh = [
 {id:'F1',cohort:3,concept:'four_verts',coverage:'cover4',offenseSeed:701,defenseSeed:702,playSeed:9201,flip:false,ballY:26},
 {id:'F2',cohort:3,concept:'drive',coverage:'cover4',offenseSeed:701,defenseSeed:702,playSeed:9202,flip:false,ballY:26},
 {id:'F3',cohort:4,concept:'four_verts',coverage:'cover3_match',offenseSeed:907,defenseSeed:908,playSeed:9203,flip:true,ballY:20},
 {id:'F4',cohort:4,concept:'pa_post_dig',coverage:'cover4',offenseSeed:907,defenseSeed:908,playSeed:9204,flip:true,ballY:20},
 // Untouched release/delivery transfer, fixed before either arm is observed.
 {id:'T1',cohort:5,concept:'four_verts',coverage:'cover3_match',offenseSeed:1301,defenseSeed:1302,playSeed:14101,flip:false,ballY:26},
 {id:'T2',cohort:5,concept:'drive',coverage:'cover4',offenseSeed:1301,defenseSeed:1302,playSeed:14102,flip:false,ballY:26},
 {id:'T3',cohort:6,concept:'dagger',coverage:'cover3_match',offenseSeed:1601,defenseSeed:1602,playSeed:14103,flip:true,ballY:20},
 {id:'T4',cohort:6,concept:'pa_post_dig',coverage:'cover4',offenseSeed:1601,defenseSeed:1602,playSeed:14104,flip:true,ballY:20},
];
const selected = selection && selection!=='all' ? [...fixtures,...fresh].filter(f=>selection.split(',').includes(f.id)) : fixtures;
assert.ok(selected.length && selected.length<=32);
const profile=JSON.parse(readFileSync('config/baseline.json'));
assert.deepEqual(Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),profile.flags);
const source=sourceVersion(),began=performance.now(),checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const provenance={sourceSha256:source,checkout,node:process.version,platform:process.platform,arch:process.arch,
 operatorSha256:hash(readFileSync(import.meta.filename).toString()),lockSha256:hash(readFileSync('package-lock.json').toString()),
 flags:profile.flags,worldDefaults:profile.worldDefaults,fixturesSha256:hash([...fixtures,...fresh])};
mkdirSync(out,{recursive:true});
const body=a=>({pos:{...a.pos},vel:{...a.vel},facing:a.facing,energy:a.body.energy,
 support:a.body.support?.state??null,deviation:copy(a.body.support?.deviation??null),
 pose:a.pose,recog:a.recog?.read??null,job:a.behavior.job??a.behavior.kind,target:a.behavior.target?.idx??null});
function trial(f,observe) {
 const started=performance.now();
 const setup={
  offense:pickOffense(generateTeam(new Rng(f.offenseSeed),'O',`PO${f.cohort}`,{strength:.6}),'11'),
  defense:pickDefense(generateTeam(new Rng(f.defenseSeed),'D',`PD${f.cohort}`,{strength:.6}),'nickel'),
  offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip:f.flip,kind:'pass',pass:PASS_BY_ID[f.concept],label:f.concept},
  defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID[f.coverage],pressure:null,zoneStyle:'match',label:f.coverage},
  los:40,ballY:f.ballY,firstDownX:50,seed:f.playSeed,record:false,audibles:false};
 const sim=new PlaySim(setup), initial=copy(sim.agents.map(a=>({idx:a.idx,slot:a.slot,id:a.player.id,team:a.team,profile:a.profile,
  runFit:a.runFit,body:a.body,player:a.player}))),rows=[];
 const see=sim.see.bind(sim);let pictures=new Map(),requests=[],queryCount=0,active=-1;
 sim.see=(a,b,...rest)=>{queryCount++;const cue=see(a,b,...rest);
  if(observe&&a.team==='D'&&(b.team==='D'||!['LT','LG','C','RG','RT'].includes(b.slot)))
   pictures.set(`${a.idx}/${b.idx}/${rest[0]??1}/${active===a.idx?'controller':'modifier'}`,
    {observer:a.idx,target:b.idx,scale:rest[0]??1,phase:active===a.idx?'controller':'modifier',cue:copy(cue)});
  return cue;};
 if(observe)for(const a of sim.agents){
  const wrapped=new WeakSet(),wrap=b=>{if(wrapped.has(b))return b;wrapped.add(b);const update=b.update.bind(b);
   b.update=(actor,s)=>{const before=body(actor);active=actor.idx;let cmd;
    try{cmd=update(actor,s);}finally{active=-1;}
    requests[actor.idx]={before,raw:copy(cmd),goal:copy(movementObjective(cmd)??null),
     rule:b instanceof CoverageDefender?b.recordedRule(s.t):null,
     man:b.recordedMan?.()??b.recordedTechnique?.()??null};return cmd;};return b;};
  let b=wrap(a.behavior);Object.defineProperty(a,'behavior',{get:()=>b,set:v=>{b=wrap(v);}});
 }
 const ids=new Map(sim.agents.map(a=>[a.body,a.idx]));
 sim.event('snap',sim.slot('C')??sim.qb);
 let budgetCensored=false;
 while(sim.phase==='live'&&sim.t<16-1e-9){
  if(performance.now()-started>5000){budgetCensored=true;break;}
  const t=sim.t;pictures=new Map();requests=[];sim.tick();
  if(observe) rows.push({t,bodies:sim.agents.map(body),requests:copy(requests),cues:[...pictures.values()],
   applied:sim.intents.map(c=>({command:copy(c),goal:copy(movementObjective(c)??null)})),
   contacts:copy(sim.lastStep?.contacts??[]),
   grasps:sim.world.joints.filter(j=>j.kind==='grasp').map(j=>({a:ids.get(j.a),b:ids.get(j.b),
    force:j.force??null,capacity:j.capacity,hold:j.hold,reach:j.reach,legs:j.legs,origin:j.origin,
    slipping:j.slipping??false,broken:j.broken??false})),carrier:sim.carrier?.idx??null,ballKind:sim.ball.kind});
  assert.ok(sim.agents.every(a=>[a.pos.x,a.pos.y,a.vel.x,a.vel.y].every(Number.isFinite)),'nonfinite body');
 }
 const endpointSha256=hash(copy({bodies:sim.agents.map(a=>a.body),rng:sim.rng,perception:sim.perception,
  intents:sim.intents,stats:sim.stats,events:sim.events,outcome:sim.outcome,endSpot:sim.endSpot}));
 const catchEvent=sim.events.find(e=>e.type==='catch'&&e.a<11),ri=catchEvent?.a,
  firstPhysical=ri===undefined?null:sim.events.find(e=>e.t>=catchEvent.t&&e.type==='carrier_contact'),
  firstWrap=ri===undefined?null:sim.events.find(e=>e.t>=catchEvent.t&&e.type==='tackle_wrap'&&e.b===ri),
  atCatch=catchEvent?rows.find(r=>Math.abs(r.t-catchEvent.t)<.001):null;
 const scoringExclusion=catchEvent&&sim.events.some(e=>e.type==='fumble'&&e.t>=catchEvent.t)?'fumble after catch':null;
 const summary={fixture:f,inputSha256:hash(setup),initialSha256:hash(initial),endpointSha256,queryCount,scoringExclusion,
  end:sim.t,censored:sim.phase==='live',budgetCensored,outcome:sim.outcome,
  catchAt:catchEvent?.t??null,actualCatcher:ri??null,catcherId:ri===undefined?null:sim.agents[ri].player.id,
  throwAt:sim.throwAt,completed:!!catchEvent,interception:sim.events.some(e=>e.type==='interception'),
  finalYac:catchEvent&&sim.phase==='dead'&&!scoringExclusion?(sim.endSpot.x-catchEvent.pos.x):null,
  observedYac:catchEvent?sim.agents[ri].pos.x-catchEvent.pos.x:null,
  firstPhysical,firstWrap,broken:sim.events.filter(e=>e.type==='broken_tackle'&&e.a===ri).length,
  nearestAtCatch:atCatch?Math.min(...sim.defense.map(d=>Math.hypot(atCatch.bodies[d.idx].pos.x-atCatch.bodies[ri].pos.x,
   atCatch.bodies[d.idx].pos.y-atCatch.bodies[ri].pos.y))):null,
  wallSeconds:(performance.now()-started)/1000};
 return{...provenance,summary,setup,initial,events:copy(sim.events),stats:copy(sim.stats),rows};
}
const summaries=[];let neutral=null,skipped=[];
for(const [i,f]of selected.entries()){
 if(performance.now()-began>30000){skipped=selected.slice(i).map(f=>f.id);break;}
 const packet=trial(f,true);writeFileSync(join(out,`${f.id}.json.gz`),gzipSync(JSON.stringify(packet)));
 if(i===0&&neutrality==='--neutral'){
  const plain=trial(f,false);assert.equal(packet.summary.endpointSha256,plain.summary.endpointSha256);
  assert.equal(packet.summary.queryCount,plain.summary.queryCount);neutral={id:f.id,endpointEqual:true,
   queryCount:plain.summary.queryCount,wallSeconds:plain.summary.wallSeconds};
 }
 summaries.push(packet.summary);console.log(JSON.stringify(packet.summary));
}
assert.equal(sourceVersion(),source,'source changed during collection');
writeFileSync(join(out,'summary.json'),JSON.stringify({...provenance,planned:selected.length,executed:summaries.length,
 maxSimulatedSeconds:16,batchBudgetSeconds:30,caseBudgetSeconds:5,neutral,skipped,
 seconds:(performance.now()-began)/1000,summaries},null,2)+'\n');
assert.equal(skipped.length,0,'batch budget exhausted; retained completed evidence and unrun IDs');
