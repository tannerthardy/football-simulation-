/** Fixed controller-transfer encounters, not a tackle-rate or NFL sample.
 * Full 22-body native ticks/ordinary tackle rolls; only the runner command
 * and encounter entry state are staged. Observation never adds a visual read.
 * node --import tsx scripts/diag/pursuit-transfer.ts [output.json.gz]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y, FIELD_WIDTH } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { clamp, norm } from '../../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { MoveCommand } from '../../src/physics/kinematics.js';
import { interceptPoint } from '../../src/physics/reach.js';
import type { GraspJoint } from '../../src/physics/world.js';
import type { Agent } from '../../src/sim/agent.js';
import { chase } from '../../src/sim/behaviors/common.js';
import type { Perceived } from '../../src/sim/perception.js';
import { PlaySim } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/pursuit-controller/transfer-baseline.json.gz';
if (process.argv.length > 3) throw new Error('Usage: pursuit-transfer.ts [output.json.gz]');
const sourceBefore = sourceVersion(), startedAt = new Date().toISOString();
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const collectorSha256 = createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
const geometry = {
  front: { x: 4, y: .4, vx: -3.5, vy: 0 },
  oblique: { x: 5, y: 4, vx: 0, vy: 0 },
  trailing: { x: -3, y: 1, vx: 6.5, vy: 0 },
  retreat: { x: 4, y: .8, vx: 3.5, vy: .2 },
  reversal: { x: 2, y: 4, vx: 6, vy: -4 },
  boundaryForce: { x: 4, y: 1.5, vx: 2, vy: -2 },
  fasterEscape: { x: -2.5, y: .8, vx: 4, vy: 0 },
  freeCut: { x: 4, y: 12, vx: 0, vy: 0 },
};
type Geometry = keyof typeof geometry;
interface Input { id: string; roster: number; seed: number; side: number; carrierSlot: 'RB'|'Z'; geometry: Geometry }
const inputs: Input[] = [];
for (const roster of [0, 1]) for (const seed of [83, 131]) for (const side of [-1, 1])
  for (const carrierSlot of ['RB', 'Z'] as const) for (const g of Object.keys(geometry) as Geometry[])
    inputs.push({ id: `PT-R${roster+1}-${g}-${carrierSlot}-${side<0?'L':'R'}-S${seed}`, roster, seed, side, carrierSlot, geometry:g });
const cohort = { rosterSeedPairs:[[19,20],[31,32]], strength:.55, inputs, geometry,
  setup:{startT:2,carrierX:50,carrierSpeed:6,boundaryY:'CENTER_Y +/- (CENTER_Y - 4)',
    reversal:'runner command switches from +6 to -4 x at elapsed 1s; original entry acquires before this (held reversal)',
    freeCut:'supplemental stationary defender x+4/y+/-12; runner +6 to -4 command at1s; entry invalid as free-cut if grip acquired before1s; never reroll',
    fasterEscape:'slower native DT chaser; min(.92*carrier.vmax, defender.vmax+1.5), real speed advantage required',
    defenderSlot:'FS except fasterEscape slower of DT_S/DT_W by unmodified vmax',maxTicks:100,
    history:'24 constant incoming-motion snapshots ending one tick before start; held carrier known',
    bystanders:'native full22 bodies, parked spatially separate with ordinary profiles'},
  declaration:'Original112 entry geometries fixed before candidate source change; faster-escape capability error corrected using unmodified DT vmax only before complete outputs, not outcomes. Supplemental16 freeCut declared after original112 results to fill a coverage gap, before its own outcomes; no rerolls. Separate controls, no empirical tackle-rate claim.' };
const inputSha256 = hash(cohort);
const rosters = cohort.rosterSeedPairs.map(([o,d],i) => ({
  offense:generateTeam(new Rng(o),`Transfer offense ${i}`,`O${i}`,{strength:.55}),
  defense:generateTeam(new Rng(d),`Transfer defense ${i}`,`D${i}`,{strength:.55}) }));
function make(input:Input, record:boolean) {
  const roster=rosters[input.roster], sim=new PlaySim({offense:pickOffense(roster.offense,'11'),
    defense:pickDefense(roster.defense,'nickel'),
    offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'pass',pass:PASS_BY_ID.four_verts,label:input.id},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:input.id},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:input.seed,audibles:false,record,recordLevel:'full',recordEvery:1});
  const c=sim.slot(input.carrierSlot)!, d=input.geometry==='fasterEscape'
    ? [sim.slot('DT_S')!,sim.slot('DT_W')!].sort((a,b)=>a.profile.vmax-b.profile.vmax)[0] : sim.slot('FS')!, g=geometry[input.geometry];
  for(const a of sim.agents){a.body.pos={x:5+Math.floor(a.idx/12)*2,y:2+a.idx%12*4};a.body.vel={x:0,y:0};a.downUntil=99;
    a.behavior={kind:'parked',update:()=>({vel:{x:0,y:0}})};}
  const speed=input.geometry==='fasterEscape'?Math.min(c.profile.vmax*.92,d.profile.vmax+1.5):6;
  if(input.geometry==='fasterEscape'&&speed<=d.profile.vmax)throw new Error('Escape control lacks speed advantage');
  const y=input.geometry==='boundaryForce'?CENTER_Y+input.side*(CENTER_Y-4):CENTER_Y;
  c.downUntil=d.downUntil=-1;c.body.pos={x:50,y};c.body.vel={x:speed,y:0};c.body.facing=0;
  d.body.pos={x:50+g.x,y:y+input.side*g.y};d.body.vel={x:g.vx,y:input.side*g.vy};d.body.facing=Math.atan2(d.vel.y,d.vel.x);
  if(input.geometry==='boundaryForce')d.runFit={gap:'D',side:input.side,kind:'force',technique:'control',edge:'box',pace:'stack'};
  else d.runFit=undefined;
  const cut=()=>['reversal','freeCut'].includes(input.geometry)&&sim.t>=3;
  c.behavior={kind:'staged-runner',update:()=>({vel:{x:cut()?-4:speed,y:0},facing:cut()?Math.PI:0})};
  d.behavior={kind:'isolated-pursuit',update:()=>d.isDown(sim.t)?{vel:{x:0,y:0}}:chase(sim,d,c)};
  sim.ball={kind:'held',carrier:c};sim.catchAt=0;sim.t=sim.world.time=2;
  for(let k=0;k<24;k++){const lag=(24-k)*sim.dt;sim.perception.record(sim.agents.map(a=>({
    pos:{x:a.pos.x-a.vel.x*lag,y:a.pos.y-a.vel.y*lag},vel:a.vel,facing:a.facing,stance:a.stance,pose:a.pose})),c.idx);}
  return {sim,c,d};
}
const body=(a:Agent)=>({pos:{...a.pos},vel:{...a.vel},facing:a.facing,energy:a.body.energy,support:structuredClone(a.body.support)});
const distance=(a:Agent,b:Agent)=>Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y);
// Pure reconstruction from the cues actually consumed by pursuitPoint. This
// is the unbiased reach estimate, NOT the private error-shifted selected aim.
function unbiasedIntercept(a:Agent,c:Agent,cues:Perceived[]) {
  if(cues.length<3)return null;
  const seen=cues[1],older=cues[2],sp=Math.hypot(seen.vel.x,seen.vel.y),heading=sp>.1?norm(seen.vel):{x:0,y:0};
  const acc=clamp((sp-Math.hypot(older.vel.x,older.vel.y))/.2,-c.profile.brake,Math.max(0,(c.profile.vmax-sp)/c.profile.tau));
  const tau=.3+.3*a.r('anticipation'),v=clamp(sp+acc*tau,0,c.profile.vmax);
  const path=(t:number)=>{const s=v*t-(v-sp)*tau*(1-Math.exp(-t/tau));
    return {x:seen.pos.x+heading.x*s,y:clamp(seen.pos.y+heading.y*s,0,FIELD_WIDTH)};};
  return interceptPoint({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},path,
    {horizon:3,step:.1,radius:a.profile.radius+c.profile.radius+a.profile.reach*.75});
}
function run(sim:PlaySim) {for(let k=0;k<cohort.setup.maxTicks&&sim.phase==='live';k++)sim.tick();return sim.buildResult();}
function signature(sim:PlaySim,result:PlayResult) {return hash({result:{...result,frames:undefined,telemetry:undefined},
  bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:JSON.parse(JSON.stringify(sim.rng)),
  perception:structuredClone(sim.perception)});}
function trial(input:Input) {
  const {sim,c,d}=make(input,true),start=sim.t,initial={bodies:sim.agents.map(a=>structuredClone(a.body)),
    profiles:sim.agents.map(a=>({idx:a.idx,slot:a.slot,id:a.player.id,profile:a.profile,ratings:a.player.ratings})),
    rng:JSON.parse(JSON.stringify(sim.rng)),fit:d.runFit??null};
  const commands:any[]=[],states:any[]=[],contacts:any[]=[],attempts:any[]=[],holds:any[]=[];
  const holdIndex=new WeakMap<GraspJoint,number>(),see=sim.see,step=sim.world.step,event=sim.event,update=d.behavior.update;
  let inDecision=false,cues:Perceived[]=[],raw:MoveCommand|null=null;
  sim.see=function(a,b,delay){const seen=see.call(this,a,b,delay);if(inDecision&&a===d&&b===c)cues.push(structuredClone(seen));return seen;};
  d.behavior.update=function(a,s){cues=[];inDecision=true;try{raw=update.call(this,a,s);}
    finally{inDecision=false;}commands.push({t:sim.t-start,cues:structuredClone(cues),
      unbiasedIntercept:unbiasedIntercept(d,c,cues),selectedAim:null,raw:structuredClone(raw),before:{c:body(c),d:body(d)}});return raw!;};
  const hold=(j:GraspJoint)=>{let i=holdIndex.get(j);if(i!==undefined)return holds[i];i=holds.length;holdIndex.set(j,i);
    const h={id:i,createdAt:sim.t-start,origin:j.origin??null,initialQuality:sim.bond?.grip?.get(d)??null,
      initialCapacity:j.capacity,initialLegs:j.legs,firstPositiveForceAt:null as number|null,maxForce:0,
      brokenAt:null as number|null,slippingSteps:0};holds.push(h);return h;};
  sim.world.step=function(intents,dt){const applied=structuredClone(intents[d.idx]);
    const report=step.call(this,intents,dt);
    for(const contact of report.contacts)if((contact.i===c.idx&&contact.j===d.idx)||(contact.j===c.idx&&contact.i===d.idx))
      contacts.push({t:sim.t+dt-start,kind:'body',...contact});
    for(const strike of report.strikes)if((strike.i===c.idx&&strike.j===d.idx)||(strike.j===c.idx&&strike.i===d.idx))
      contacts.push({t:sim.t+dt-start,kind:'strike',...strike});
    const j=sim.bond?.holds?.get(d);if(j){const h=hold(j);h.maxForce=Math.max(h.maxForce,j.force??0);
      if((j.force??0)>1e-8&&h.firstPositiveForceAt===null)h.firstPositiveForceAt=sim.t+dt-start;
      if(j.slipping)h.slippingSteps++;if(j.broken&&h.brokenAt===null)h.brokenAt=sim.t+dt-start;}
    states.push({t:sim.t+dt-start,distance:distance(c,d),c:body(c),d:body(d),applied,
      bound:sim.bond?.tacklers.includes(d)??false,workResidual:report.work.residual,
      groundImpulse:report.groundImpulse[d.idx],armImpulse:report.armImpulse[d.idx],armLimit:report.armImpulseLimit[d.idx]});return report;};
  sim.event=function(type,a,b,note){if(a===d&&b===c&&['missed_tackle','tackle_wrap','hit'].includes(type)){
    const j=sim.bond?.holds?.get(d);attempts.push({t:sim.t-start,type,note:note??null,distance:distance(c,d),
      quality:sim.bond?.grip?.get(d)??null,holdId:j?hold(j).id:null,c:body(c),d:body(d)});}return event.call(this,type,a,b,note);};
  const result=run(sim),plain=make(input,false),control=run(plain.sim);
  const physicalSha256=signature(sim,result),observerVerified=physicalSha256===signature(plain.sim,control);
  if(!observerVerified)throw new Error(`Observer or recording changes state/RNG: ${input.id}`);
  const min=(seconds:number)=>Math.min(distanceFromInitial(initial),...states.filter(s=>s.t<=seconds+1e-9).map(s=>s.distance));
  function distanceFromInitial(_:unknown){const a=initial.bodies[c.idx],b=initial.bodies[d.idx];return Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y);}
  return {input,initialSha256:hash(initial),profileSha256:hash(initial.profiles),physicalSha256,observerVerified,initial,
    group:input.geometry==='freeCut'?'supplemental-free-cut':'original-entry-panel',
    freeCutCoverage:input.geometry==='freeCut'?{commandChangeAt:1,preCutAcquisition:holds.some(h=>h.createdAt<1),
      validUngraspedEntry:!holds.some(h=>h.createdAt<1),firstAchievedNegativeVx:states.find(s=>s.c.vel.x<0)?.t??null}:null,
    duration:sim.t-start,censored:sim.phase==='live',outcome:result.outcome,offenseYards:result.offenseYards,
    earlyMinimumSeparation:{halfSecond:min(.5),oneSecond:min(1)},firstBodyContact:contacts.find(x=>x.kind==='body')??null,
    firstStrikeContact:contacts.find(x=>x.kind==='strike')??null,firstAcquiredGrip:holds[0]??null,
    firstLoadedGrip:holds.find(h=>h.firstPositiveForceAt!==null)??null,holds,attempts,contacts,commands,states,
    events:result.events.map(e=>({...e,t:e.t-start})),finalRng:JSON.parse(JSON.stringify(sim.rng))};
}
const rows=inputs.map(trial),sourceAfter=sourceVersion();
if(sourceAfter!==sourceBefore)throw new Error('Source changed during transfer collector');
const report={schema:'pursuit-transfer-v1',sourceBefore,sourceAfter,collectorSha256,inputSha256,startedAt,finishedAt:new Date().toISOString(),cohort,
  definitions:{command:'raw ordinary chase request versus held post-modifier World intent; achieved state is tick-end',
    target:'selected private error-shifted aim is not exposed; unbiasedIntercept is a pure reconstruction from actual consumed cues, not the chosen aim',
    contact:'solver body and achieved strike contacts; created grips, positive solved forces, slips and breaks kept separate',
    timing:'native event labels versus tick-end solved observations; no sub-tick time claim',
    observer:'full-record observed versus unrecorded no-observer result, all22 bodies, intents, perception and exact RNG state; no extra see/controller/draw',
    censor:'live at five seconds remains censored; staged encounter yards are not NFL outcomes'},rows};
mkdirSync(dirname(output),{recursive:true});const json=JSON.stringify(report);writeFileSync(output,output.endsWith('.gz')?gzipSync(json):json);
console.log(JSON.stringify({output,sourceBefore,sourceAfter,collectorSha256,inputSha256,rows:rows.length,
  observerVerified:rows.every(r=>r.observerVerified),censored:rows.filter(r=>r.censored).length}));
