/** Compact fixed tackle-approach audit. Observes existing decisions and state;
 * never asks for another visual read, runs a behavior, or draws a random value.
 * node --import tsx scripts/diag/tackle-approach-review.ts [output.json.gz]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { GraspJoint, Intent } from '../../src/physics/world.js';
import type { Agent } from '../../src/sim/agent.js';
import { chase } from '../../src/sim/behaviors/common.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { contactQuality } from '../../src/sim/tackle-window.js';
import type { PlayResult, ReplayDecision } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/tackle-breakthrough/approach-panel/baseline.json.gz';
if (process.argv.length > 3) throw new Error('Usage: tackle-approach-review.ts [output.json.gz]');
const sourceBefore = sourceVersion(), startedAt = new Date().toISOString();
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const collectorSha256 = createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
const rosters = [[31,32],[41,42]].map(([o,d],r) => ({
  offense:generateTeam(new Rng(o),`Approach offense ${r+1}`,`O${r+1}`,{strength:.55}),
  defense:generateTeam(new Rng(d),`Approach defense ${r+1}`,`D${r+1}`,{strength:.55}) }));
interface Input { id:string; group:'ordinary-native'|'retained-adverse-split'|'isolated-encounter';
  roster:number; seed:number; flip:boolean; formation:string; concept:string; front:string; coverage:string;
  encounter?:string }
const inputs:Input[]=[];
for(const roster of [0,1]) for(const [concept,front,coverage] of roster===0
  ? [['iz_strong','over','cover3'],['oz_strong','over','cover3'],['duo','odd','cover3'],['curl_flat','over','cover3'],['mesh','over','cover1']]
  : [['iz_strong','over','cover3'],['oz_strong','over','cover3'],['curl_flat','over','cover3']]) for(const flip of [false,true]) {
  const pass=!!PASS_BY_ID[concept],formation=pass?(concept==='mesh'?'gun_bunch_11':'gun_doubles_11'):'ace_11';
  inputs.push({id:`TA-R${roster+1}-${concept}-${front}-${flip?'L':'R'}-S3`,group:'ordinary-native',roster,seed:3,flip,formation,concept,front,coverage});
}
for(const front of ['over','odd'])for(const flip of [false,true])inputs.push({
  id:`CT-R1-split_zone-${front}-${flip?'L':'R'}-S11`,group:'retained-adverse-split',roster:0,seed:11,flip,
  formation:'gun_wing_12',concept:'split_zone',front,coverage:'cover3'});
const encounters:Record<string,{x:number;y:number;vx:number;vy:number;energy:number}>={
  frontal:{x:3,y:.4,vx:-3.5,vy:0,energy:1},
  crossing:{x:1.9,y:2.4,vx:3.5,vy:-4.2,energy:1},
  glancingReach:{x:-1.3,y:.8,vx:3.5,vy:0,energy:1},
  fasterCarrier:{x:-2.5,y:.8,vx:4,vy:0,energy:1},
  fatiguedCrossing:{x:1.9,y:2.4,vx:3.5,vy:-4.2,energy:.35},
  trafficCrossing:{x:1.9,y:2.4,vx:3.5,vy:-4.2,energy:1},
};
for(const encounter of Object.keys(encounters))for(const flip of [false,true])inputs.push({
  id:`TA-E-${encounter}-${flip?'L':'R'}-S131`,group:'isolated-encounter',roster:0,seed:131,flip,
  formation:'gun_doubles_11',concept:'four_verts',front:'over',coverage:'cover3',encounter});
const cohort={rosterSeedPairs:[[31,32],[41,42]],strength:.55,inputs,encounters,
  native:{los:40,ballY:CENTER_Y,firstDownX:50,audibles:false},
  encounter:{carrierSlot:'Z',defenderSlot:'FS (DT_S for fasterCarrier)',startT:2,carrierX:50,
    carrierSpeed:6,fasterSpeed:'min(.92*carrier.vmax, defender.vmax+1.5)',maximumTicks:120,
    stagedHistory:'24 straight incoming snapshots ending one tick before start',
    traffic:{slot:'Y',x:52.8,y:'CENTER_Y +/- 1.1',command:'stand'},
    declaration:'isolated deterministic entry geometry, not an NFL population'},
  declaration:'ordinary inputs fixed before this collector; four Split Zone mirrors are separate retrospective stress witnesses'};
const inputSha256=hash(cohort);
function make(input:Input,record:boolean){
  const formation=FORMATION_BY_ID[input.formation],pass=!!PASS_BY_ID[input.concept],front=FRONT_BY_ID[input.front];
  const personnel=pass?'nickel':front.personnel[0];
  const sim=new PlaySim({offense:pickOffense(rosters[input.roster].offense,formation.personnel),
    defense:pickDefense(rosters[input.roster].defense,personnel),
    offCall:{formation,flip:input.flip,kind:pass?'pass':'run',pass:pass?PASS_BY_ID[input.concept]:undefined,
      run:pass?undefined:RUN_BY_ID[input.concept],label:input.id},
    defCall:{personnel,front,coverage:COVERAGE_BY_ID[input.coverage],pressure:null,zoneStyle:'match',label:input.id},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:input.seed,audibles:false,record,recordLevel:'full',recordEvery:1});
  if(!input.encounter)return sim;
  const side=input.flip?1:-1,g=encounters[input.encounter],c=sim.slot('Z')!,d=sim.slot(input.encounter==='fasterCarrier'?'DT_S':'FS')!;
  for(const a of sim.agents){a.body.pos={x:5+Math.floor(a.idx/12)*2,y:2+a.idx%12*4};a.body.vel={x:0,y:0};a.downUntil=99;
    a.behavior={kind:'parked',update:()=>({vel:{x:0,y:0}})};}
  const speed=input.encounter==='fasterCarrier'?Math.min(c.profile.vmax*.92,d.profile.vmax+1.5):6;
  if(input.encounter==='fasterCarrier'&&speed<=d.profile.vmax)throw new Error('Escape control lacks real speed advantage');
  c.downUntil=d.downUntil=-1;c.body.pos={x:50,y:CENTER_Y};c.body.vel={x:speed,y:0};c.body.facing=0;
  d.body.pos={x:50+g.x,y:CENTER_Y+side*g.y};d.body.vel={x:g.vx,y:side*g.vy};d.body.facing=Math.atan2(d.vel.y,d.vel.x);d.body.energy=g.energy;
  c.behavior={kind:'straight-carrier',update:()=>({vel:{x:speed,y:0},facing:0})};
  d.behavior={kind:'isolated-pursuit',update:()=>d.isDown(sim.t)?{vel:{x:0,y:0}}:chase(sim,d,c)};
  if(input.encounter==='trafficCrossing'){const a=sim.slot('Y')!;a.downUntil=-1;a.body.pos={x:52.8,y:CENTER_Y+side*1.1};}
  sim.ball={kind:'held',carrier:c};sim.catchAt=0;sim.t=2;sim.world.time=2;
  for(let k=0;k<24;k++){const lag=(24-k)*sim.dt;sim.perception.record(sim.agents.map(a=>({pos:{x:a.pos.x-a.vel.x*lag,y:a.pos.y-a.vel.y*lag},
    vel:a.vel,facing:a.facing,stance:a.stance,pose:a.pose})));}
  return sim;
}
const vec=(v:{x:number;y:number})=>({x:v.x,y:v.y});
function pair(d:Agent,c:Agent,intent?:Intent|null){
  const dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,distance=Math.hypot(dx,dy),vx=c.vel.x-d.vel.x,vy=c.vel.y-d.vel.y;
  const body=c.profile.radius+d.profile.radius,arms=body+d.profile.reach*(d.engagement?.win!==undefined ? .4 : 1);
  return {defenderIdx:d.idx,carrierIdx:c.idx,defenderSlot:d.slot,carrierSlot:c.slot,distance,body,arms,
    geometricQuality:contactQuality(distance,body,arms),closing:-(vx*dx+vy*dy)/Math.max(1e-12,distance),
    transverseSpeed:Math.abs(-vx*dy+vy*dx)/Math.max(1e-12,distance),relativeVelocity:{x:vx,y:vy},
    runnerIntoDefender:c.speed>.5?-(c.vel.x*dx+c.vel.y*dy)/(c.speed*Math.max(1e-12,distance)):0,
    defenderFacingCarrier:Math.cos(d.facing-Math.atan2(dy,dx)),
    defender:{pos:vec(d.pos),vel:vec(d.vel),speed:d.speed,facing:d.facing,energy:d.body.energy,
      support:d.body.support?.state??null,focus:d.mind.focus,fit:d.runFit??null,engaged:!!d.engagement},
    carrier:{pos:vec(c.pos),vel:vec(c.vel),speed:c.speed,facing:c.facing,support:c.body.support?.state??null},
    intent:intent?structuredClone(intent):null};
}
function run(sim:PlaySim,input:Input):PlayResult{
  if(!input.encounter)return sim.run();
  sim.event('snap',sim.slot('C')??sim.qb);
  for(let k=0;k<120&&sim.phase==='live';k++)sim.tick();
  return sim.buildResult();
}
function trial(input:Input){
  const sim=make(input,true),start=sim.t,initial={profiles:sim.agents.map(a=>({team:a.team,slot:a.slot,id:a.player.id,profile:a.profile,ratings:a.player.ratings})),
    bodies:sim.agents.map(a=>structuredClone(a.body)),intents:structuredClone(sim.intents)};
  const beforeWorld:any[]=[],decisions:any[]=[],attempts:any[]=[],holds:any[]=[],holdIndex=new WeakMap<GraspJoint,number>();
  const step=sim.world.step,event=sim.event,decide=sim.trace.decide;
  const jointRecord=(j:GraspJoint,d:Agent,c:Agent)=>{
    let id=holdIndex.get(j);if(id!==undefined)return holds[id];id=holds.length;holdIndex.set(j,id);
    const row={id,createdAt:sim.t,defender:d.idx,carrier:c.idx,origin:j.origin??null,initialQuality:sim.bond?.grip?.get(d)??null,
      initialCapacity:j.capacity,initialLegs:j.legs,firstPositiveForceAt:null as number|null,maxForce:0,slippingSteps:0,
      brokenAt:null as number|null,samples:[] as unknown[]};holds.push(row);return row;
  };
  sim.world.step=function(intents,dt){
    const c=sim.carrier;
    if(c)beforeWorld.push({t:sim.t,carrier:c.idx,near:sim.opponents(c).filter(d=>!d.isDown(sim.t)&&Math.hypot(d.pos.x-c.pos.x,d.pos.y-c.pos.y)<8)
      .map(d=>pair(d,c,intents[d.idx]))});
    const report=step.call(this,intents,dt);
    if(sim.bond)for(const [d,j] of sim.bond.holds??[]){const row=jointRecord(j,d,sim.bond.carrier);
      if((j.force??0)>1e-8&&row.firstPositiveForceAt===null)row.firstPositiveForceAt=sim.t+dt;
      row.maxForce=Math.max(row.maxForce,j.force??0);if(j.slipping)row.slippingSteps++;if(j.broken&&row.brokenAt===null)row.brokenAt=sim.t+dt;
      row.samples.push({t:sim.t+dt,force:j.force??0,capacity:j.capacity,hold:j.hold,quality:sim.bond.grip?.get(d)??null,
        legs:j.legs,slipping:!!j.slipping,broken:!!j.broken,distance:Math.hypot(d.pos.x-sim.bond.carrier.pos.x,d.pos.y-sim.bond.carrier.pos.y)});}
    return report;
  };
  sim.trace.decide=function(choice:ReplayDecision){if(choice.kind==='tackle-opportunity'){
    const d=sim.agents[choice.a],c=sim.carrier;decisions.push({...choice,phase:'post-World selector',geometry:c?pair(d,c,sim.intents[d.idx]):null});}
    return decide.call(this,choice);};
  sim.event=function(type,a,b,note){
    if(a&&b&&(type==='missed_tackle'||type==='tackle_wrap'||(type==='hit'&&note==='diving tackle'))){
      const j=sim.bond?.holds?.get(a),hold=j?jointRecord(j,a,b):null;
      attempts.push({t:sim.t,type,note:note??null,phase:'post-World acquisition/attempt',geometry:pair(a,b,sim.intents[a.idx]),
        quality:sim.bond?.grip?.get(a)??null,execution:sim.bond?.execution?.get(a)??null,holdId:hold?.id??null});}
    if(type==='fumble'&&a&&b)attempts.push({t:sim.t,type,note:note??null,phase:'post-World contact fumble',geometry:pair(b,a,sim.intents[b.idx]),quality:null,holdId:null});
    return event.call(this,type,a,b,note);};
  const result=run(sim,input),plain=make(input,false),control=run(plain,input);
  const signature=(s:PlaySim,r:PlayResult)=>hash({result:{...r,frames:undefined,telemetry:undefined},bodies:s.agents.map(a=>a.body),
    intents:s.intents,nextRng:s.rng.next()});
  const verified=signature(sim,result)===signature(plain,control);if(!verified)throw new Error(`Observer changes ${input.id}`);
  const stats={attemptEvents:attempts.length,wraps:attempts.filter(a=>a.type==='tackle_wrap').length,
    initialWraps:attempts.filter(a=>a.type==='tackle_wrap'&&a.note==='initial').length,
    assists:attempts.filter(a=>a.type==='tackle_wrap'&&a.note==='assist').length,
    missedAttempts:attempts.filter(a=>a.type==='missed_tackle').length,divingHolds:attempts.filter(a=>a.type==='hit').length,
    contactFumbles:attempts.filter(a=>a.type==='fumble').length,createdHolds:holds.length,
    positivelyLoadedHolds:holds.filter(h=>h.firstPositiveForceAt!==null).length,
    slippingHolds:holds.filter(h=>h.slippingSteps>0).length,brokenHolds:holds.filter(h=>h.brokenAt!==null).length,
    missedTackleEvents:result.events.filter(e=>e.type==='missed_tackle').length,
    brokenTackleEvents:result.events.filter(e=>e.type==='broken_tackle').length};
  return {input,initialSha256:hash(initial),profileSha256:hash(initial.profiles),observerVerified:verified,
    source:sourceBefore,startT:start,duration:sim.t-start,censored:sim.phase==='live',outcome:result.outcome,offenseYards:result.offenseYards,
    stats,attempts,holds,decisions,beforeWorld,events:result.events,players:initial.profiles};
}
const rows:ReturnType<typeof trial>[]=[];for(const input of inputs){rows.push(trial(input));process.stdout.write(`${input.id} ${rows.at(-1)!.outcome??'censored'} ${rows.at(-1)!.offenseYards}\n`);}
const sourceAfter=sourceVersion();if(sourceAfter!==sourceBefore)throw new Error('Engine changed during collector');
const groups=Object.fromEntries(['ordinary-native','retained-adverse-split','isolated-encounter'].map(group=>{
  const cohort=rows.filter(r=>r.input.group===group),sum=(key:string)=>cohort.reduce((v,r)=>v+(r.stats as Record<string,number>)[key],0);
  const initial=sum('initialWraps'),miss=sum('missedAttempts'),dives=sum('divingHolds'),fumbles=sum('contactFumbles');
  return [group,{plays:cohort.length,censored:cohort.filter(r=>r.censored).length,observerVerified:cohort.every(r=>r.observerVerified),
    attemptEvents:sum('attemptEvents'),initialWraps:initial,assists:sum('assists'),missedAttempts:miss,divingHolds:dives,contactFumbles:fumbles,
    initialOutcomeMissFraction:(initial+miss+dives+fumbles)>0?miss/(initial+miss+dives+fumbles):null,
    createdHolds:sum('createdHolds'),positivelyLoadedHolds:sum('positivelyLoadedHolds'),slippingHolds:sum('slippingHolds'),brokenHolds:sum('brokenHolds')}];}));
const report={schema:'tackle-approach-review-v1',sourceBefore,sourceAfter,collectorSha256,inputSha256,startedAt,finishedAt:new Date().toISOString(),cohort,groups,
  definitions:{timing:'beforeWorld snapshots follow controllers/contact intents; tackle-opportunity records and attempts occur after World, ball update and actual contact.',
    missedRate:'Miss events divided by initial wrap + miss + successful dive + contact-fumble events; assists are separate and uncertain misses retain their RNG.',
    hold:'A created grasp is not proven loaded; positive solved force, slipping and broken transitions are separate.',
    isolatedCensor:'Six seconds at native tick rate; live endpoint reported censored and never pooled with naturally finished game gains.',
    observer:'Full-record observed versus plain unrecorded complete result, final bodies, intents and next RNG; no extra see, behavior calls or RNG draws while observing.'},rows};
mkdirSync(dirname(output),{recursive:true});const body=JSON.stringify(report);writeFileSync(output,output.endsWith('.gz')?gzipSync(body):body);
process.stdout.write(JSON.stringify({sourceBefore,sourceAfter,collectorSha256,inputSha256,groups})+'\n');
