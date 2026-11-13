/** Archived negative experiment on source19e91a4a. No engine or force changes.
 * node --import tsx docs/archive/research/held-facing-probe.ts
 * Uses private read-only impulse observers; the source pin prevents stale use.
 */
import {createHash} from 'node:crypto';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {CENTER_Y} from '../../../src/core/field.js';
import {angleDiff} from '../../../src/core/vec.js';
import {Rng} from '../../../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../../../src/league/team.js';
import {FORMATIONS,FORMATION_BY_ID} from '../../../src/playbook/formations.js';
import {PASS_BY_ID} from '../../../src/playbook/concepts.js';
import {FRONT_BY_ID,COVERAGE_BY_ID} from '../../../src/playbook/defense.js';
import {PlaySim} from '../../../src/sim/playsim.js';
import {chase} from '../../../src/sim/behaviors/common.js';
import {gripForce} from '../../../src/sim/tackle.js';
import {directionalSpeedFactor} from '../../../src/physics/kinematics.js';
import type {GraspJoint,Intent} from '../../../src/physics/world.js';
import {sourceVersion} from '../../../scripts/source-version.js';

const expected='19e91a4aa596821d1f52b20ec59467c8008027d623e3ba9be8cc7b88555df3bb';
const sourceBefore=sourceVersion();if(sourceBefore!==expected)throw new Error(`Unexpected source ${sourceBefore}`);
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
type Input={id:string;mode:'staged-acquired'|'natural-attempt';carrier:'RB'|'Z';speed:number;
  geometry:'side'|'front'|'aligned-rear'|'glancing-rear'|'faster-carrier';side:number;defenderSpeed?:number};
const inputs:Input[]=[];
for(const carrier of ['RB','Z'] as const)for(const speed of [6,8])for(const side of [-1,1])
  inputs.push({id:`staged-side-${carrier}-${speed}-${side}`,mode:'staged-acquired',carrier,speed,geometry:'side',side});
for(const geometry of ['front','aligned-rear'] as const)for(const side of [-1,1])
  inputs.push({id:`control-${geometry}-${side}`,mode:'staged-acquired',carrier:'Z',speed:6,geometry,side});
for(const side of [-1,1])inputs.push({id:`control-stationary-${side}`,mode:'staged-acquired',carrier:'Z',speed:0,geometry:'aligned-rear',side});
for(const geometry of ['side','glancing-rear','faster-carrier'] as const)for(const side of [-1,1])
  inputs.push({id:`natural-${geometry}-${side}`,mode:'natural-attempt',carrier:'Z',speed:8,geometry,side,
    defenderSpeed:geometry==='faster-carrier'?4:geometry==='glancing-rear'?6:8});
const rosters={offense:generateTeam(new Rng(31),'O','O',{strength:.55}),defense:generateTeam(new Rng(32),'D','D',{strength:.55})};
const START=2,HORIZON=3,MAX_TICKS=60;
function make(input:Input){
  const sim=new PlaySim({offense:pickOffense(rosters.offense,'11'),defense:pickDefense(rosters.defense,'nickel'),
    offCall:{formation:FORMATION_BY_ID.gun_trips_11,flip:input.side<0,kind:'pass',pass:PASS_BY_ID.four_verts,label:'held-facing diagnostic'},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover6,pressure:null,label:'held-facing diagnostic'},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:131,audibles:false,record:false});
  const c=sim.slot(input.carrier)!,d=sim.slot('SS')!;
  for(const a of sim.agents){a.body.pos={x:5+Math.floor(a.idx/12)*2,y:CENTER_Y+input.side*(2+a.idx%12*4-CENTER_Y)};
    a.body.vel={x:0,y:0};a.body.facing=0;a.engagement=null;a.downUntil=99;
    a.behavior={kind:'diagnostic-parked',update:()=>({vel:{x:0,y:0}})};}
  sim.engagements=[];sim.world.joints=[];
  c.downUntil=d.downUntil=-1;c.body.pos={x:50,y:CENTER_Y};c.body.vel={x:input.speed,y:0};
  const dx=input.geometry==='front'?.7:input.geometry==='aligned-rear'?-.7:input.geometry==='glancing-rear'?-1.3:input.geometry==='faster-carrier'?-2.5:0;
  const dy=input.geometry==='aligned-rear'||input.geometry==='front'?0:input.geometry==='glancing-rear'?.8:input.geometry==='faster-carrier'?.8:.7;
  d.body.pos={x:50+dx,y:CENTER_Y+input.side*dy};d.body.vel={x:input.defenderSpeed??input.speed,y:0};
  c.behavior={kind:'diagnostic-straight-carrier',update:()=>({vel:{x:input.speed,y:0},facing:0})};
  d.behavior=input.mode==='natural-attempt'?{kind:'diagnostic-native-pursuit',update:()=>d.isDown(sim.t)?{vel:{x:0,y:0}}:chase(sim,d,c)}
    :{kind:'diagnostic-holder-before-or-after-grip',update:()=>({vel:{x:input.defenderSpeed??input.speed,y:0},facing:0})};
  sim.ball={kind:'held',carrier:c};sim.catchAt=START;sim.catchX=50;sim.t=sim.world.time=START;
  if(input.mode==='staged-acquired'){
    const distance=Math.hypot(dx,dy),quality=.8;
    const j:GraspJoint={kind:'grasp',a:d.body,b:c.body,hold:distance,
      reach:Math.max(c.profile.radius+d.profile.radius+d.profile.reach*.9,distance+.15),
      capacity:gripForce(d,quality),legs:.6,pull:2,origin:'explicit-staged-acquired-diagnostic'};
    sim.world.joints.push(j);sim.bond={carrier:c,tacklers:[d],start:START,progressX:50,down:false,stalled:0,
      grip:new Map([[d,quality]]),holds:new Map([[d,j]]),execution:new Map([[d,1]])};
  }
  for(let k=0;k<24;k++){const lag=(24-k)*sim.dt;
    sim.perception.record(sim.agents.map(a=>({pos:{x:a.pos.x-a.vel.x*lag,y:a.pos.y-a.vel.y*lag},
      vel:a.vel,facing:a.facing,stance:a.stance,pose:a.pose})));}
  return {sim,c,d};
}
function run(input:Input,candidate:boolean,observe=true){
  const {sim,c,d}=make(input),world=sim.world as any;
  const initial={bodies:sim.agents.map(a=>structuredClone(a.body)),intents:structuredClone(sim.intents),perception:structuredClone(sim.perception),
    rng:JSON.stringify(sim.rng),grips:world.joints.map((j:GraspJoint)=>({hold:j.hold,reach:j.reach,capacity:j.capacity,legs:j.legs,pull:j.pull})),
    profiles:[c.profile,d.profile]};
  const steps:any[]=[],holds:any[]=[],ids=new WeakMap<object,number>();let interventions=0,micros:any[]=[];
  const register=(j:GraspJoint)=>{let id=ids.get(j);if(id===undefined){id=holds.length;ids.set(j,id);
    holds.push({id,createdAt:sim.t,forcedInitial:input.mode==='staged-acquired'&&sim.t===START,
      nominalInitial:j.capacity,reach:j.reach,origin:j.origin,firstLoadAt:null,brokenAt:null,j});}return id;};
  const state=()=>{const dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,dist=Math.hypot(dx,dy),rv={x:c.vel.x-d.vel.x,y:c.vel.y-d.vel.y};
    const body=(a:typeof c)=>({pos:{...a.pos},vel:{...a.vel},facing:a.facing,spin:a.body.spin,speed:a.speed,energy:a.body.energy,
      support:structuredClone(a.body.support),directionalFactor:directionalSpeedFactor(a.profile,angleDiff(a.facing,Math.atan2(a.vel.y,a.vel.x)))});
    return {carrier:body(c),defender:body(d),distance:dist,radialSpeed:(rv.x*dx+rv.y*dy)/Math.max(1e-12,dist),
      transverseSpeed:(-rv.x*dy+rv.y*dx)/Math.max(1e-12,dist)};};
  const actualStep=world.step,actualPair=world.pairImpulse,actualSupport=world.supportImpulse;
  if(observe)world.pairImpulse=function(...args:any[]){
    const wanted=args[6]===undefined?true:args[6];
    const capture=args[5]==='grasps'&&micros.length<12;
    const before=capture?state():null;
    const fraction=actualPair.apply(this,args);
    if(capture)micros.push({phase:'pre/post actual grip impulse',active:wanted,
      requested:{x:args[2],y:args[3]},deliveredFraction:fraction,before,after:state()});return fraction;};
  if(observe)world.supportImpulse=function(...args:any[]){
    const j=args[0] as GraspJoint,capture=j.a===d.body&&j.b===c.body&&micros.length<12;
    const before=capture?state():null;
    const point=capture?{pos:{...world.graspPoint(j)},vel:{...world.graspVelocity(j)},effective:world.gripCapacity(j)}:null;
    const fraction=actualSupport.apply(this,args);
    if(capture)micros.push({phase:'pre/post actual lower-attachment grip impulse',active:args[4],
      requested:{x:args[1],y:args[2]},deliveredFraction:fraction,before,after:state(),point});return fraction;};
  if(observe||candidate)world.step=function(intents:Intent[],dt:number){
    const t=sim.t;micros=[];
    for(const j of world.joints)if(j.kind==='grasp'&&j.a===d.body&&j.b===c.body)register(j);
    const originalIntent=structuredClone(intents[d.idx]);
    const pre=observe?state():null,preBodiesHash=observe?hash(sim.agents.map(a=>a.body)):null;
    const gripBefore=holds.map(h=>({id:h.id,nominal:h.j.capacity,effective:world.gripCapacity(h.j),
      force:h.j.force??0,hold:h.j.hold,legs:h.j.legs,broken:!!h.j.broken}));
    const cs=c.speed,dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,dist=Math.hypot(dx,dy);
    const into=cs>.5?-(c.vel.x*dx+c.vel.y*dy)/(cs*(dist||1)):1;
    const command=intents[d.idx];let changed=false;
    if(candidate&&sim.bond?.carrier===c&&sim.bond.tacklers.includes(d)
      &&c.body.support!.state==='up'&&cs>.5&&into<=.3&&command&&Math.hypot(command.vel.x,command.vel.y)>.4){
      const face=Math.atan2(command.vel.y,command.vel.x);
      if(Math.abs(angleDiff(command.facing??d.facing,face))>1e-12){
        if(Math.abs(angleDiff(command.facing!,Math.atan2(dy,dx)))>1e-9)throw new Error('Not the existing held hip-facing intent');
        intents[d.idx]={...command,facing:face};changed=true;interventions++;
      }
    }
    const actualIntent=structuredClone(intents[d.idx]);
    if(changed){const noFace=(v:any)=>({...v,facing:undefined});if(hash(noFace(originalIntent))!==hash(noFace(actualIntent)))throw new Error('Changed more than facing');}
    const report=actualStep.call(this,intents,dt);
    for(const h of holds){if((h.j.force??0)>1e-8&&h.firstLoadAt===null)h.firstLoadAt=t+dt;
      if(h.j.broken&&h.brokenAt===null)h.brokenAt=t+dt;}
    if(observe)steps.push({t,changed,preBodiesHash,rngBefore:JSON.stringify(sim.rng),originalIntent,actualIntent,pre,after:state(),gripBefore,
      gripAfter:holds.map(h=>({id:h.id,nominal:h.j.capacity,effective:world.gripCapacity(h.j),force:h.j.force??0,hold:h.j.hold,
        reach:h.j.reach,legs:h.j.legs,slipping:!!h.j.slipping,broken:!!h.j.broken})),
      contacts:report.contacts.filter((hit:any)=>hit.i===c.idx||hit.j===c.idx||hit.i===d.idx||hit.j===d.idx),
      ground:[{impulse:report.groundImpulse[c.idx],yawImpulse:report.groundYawImpulse[c.idx],yawWork:report.groundYawWork[c.idx]},
        {impulse:report.groundImpulse[d.idx],yawImpulse:report.groundYawImpulse[d.idx],yawWork:report.groundYawWork[d.idx]}],
      arm:{impulse:report.armImpulse[d.idx],limit:report.armImpulseLimit[d.idx],work:report.armWork[d.idx],workLimit:report.armWorkLimit[d.idx]},
      workResidual:report.work.residual,substeps:report.substeps,micro:micros});
    return report;
  };
  for(let k=0;k<MAX_TICKS&&sim.phase==='live';k++)sim.tick();
  const result=sim.buildResult(),endSignature=hash({result,bodies:sim.agents.map(a=>a.body),intents:sim.intents,nextRng:sim.rng.next()});
  return {input,candidate,initialHash:hash(initial),profiles:initial.profiles,endSignature,
    end:{t:sim.t,outcome:sim.outcome,censored:sim.phase==='live',advance:c.pos.x-50,body:state(),events:sim.events},
    interventions,steps,holds:holds.map(({j,...h})=>h)};
}
const rows:any[]=[];
for(const input of inputs){const baseline=run(input,false),plain=run(input,false,false),candidate=run(input,true),candidatePlain=run(input,true,false);
  if(baseline.endSignature!==plain.endSignature)throw new Error(`Observer changes ${input.id}`);
  if(candidate.endSignature!==candidatePlain.endSignature)throw new Error(`Candidate observer changes ${input.id}`);
  if(baseline.initialHash!==candidate.initialHash)throw new Error(`Different input ${input.id}`);
  const fork=candidate.steps.find((s:any)=>s.changed),before=fork?baseline.steps.find((s:any)=>s.t===fork.t):null;
  if(fork&&(before?.preBodiesHash!==fork.preBodiesHash||hash(before.originalIntent)!==hash(fork.originalIntent)
    ||hash(before.gripBefore)!==hash(fork.gripBefore)||before.rngBefore!==fork.rngBefore))throw new Error(`Not a pure first facing fork ${input.id}`);
  rows.push({input,observerVerified:true,candidateObserverVerified:true,initialMatched:true,firstFacingFork:fork?{t:fork.t,baseline:before,candidate:fork}:null,
    unchanged:baseline.endSignature===candidate.endSignature,baseline,candidate});
  console.log(input.id,'changes',candidate.interventions,'advance',baseline.end.advance.toFixed(3),candidate.end.advance.toFixed(3),
    'outcomes',baseline.end.outcome,candidate.end.outcome,'holds',baseline.holds.length,candidate.holds.length);
}
const sourceAfter=sourceVersion();if(sourceAfter!==sourceBefore)throw new Error('Source changed during diagnostic');
const output={schema:'held-facing-probe-v1',sourceBefore,sourceAfter,
  toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),inputHash:hash(inputs),
  description:'Full native ticks with unchanged bodies/cues/RNG at initialization. Candidate wrapper changes only existing side/rear held Intent.facing while carrier is upright and moving. All force/profile/grip laws remain unchanged.',
  staged:'14 explicitly acquired initial holds, quality .8/execution1/legs.6/pull2 using production gripForce/reach. These bypass uncertain acquisition; they cannot estimate acquisition or tackle rates.',
  natural:'6 natural attempt scenarios with unchanged tryTackles/RNG, no rerolls or guaranteed wrap. Faster-carrier and glancing failures retained.',
  limits:'3s horizon; natural support/misses/whistles retained. Grip force is tick-average; effective capacity before/after may differ from intra-substep capacity. Micro logs observe actual pre/post pairImpulse and contain only12calls per tick. Facing changes yaw traction as well as directional motion.',
  rows};
mkdirSync('out/pursuit-controller',{recursive:true});writeFileSync('out/pursuit-controller/held-facing-archived-results.json.gz',gzipSync(JSON.stringify(output)));
writeFileSync('out/pursuit-controller/held-facing-archived-summary.json',JSON.stringify({schema:output.schema,sourceBefore,sourceAfter,toolSha256:output.toolSha256,inputHash:output.inputHash,
  rows:rows.map(r=>({input:r.input,observerVerified:r.observerVerified,initialMatched:r.initialMatched,unchanged:r.unchanged,
    firstFork:r.firstFacingFork?.t??null,interventions:r.candidate.interventions,profiles:r.baseline.profiles,
    baseline:{end:r.baseline.end,holds:r.baseline.holds},candidate:{end:r.candidate.end,holds:r.candidate.holds}}))},null,2));
