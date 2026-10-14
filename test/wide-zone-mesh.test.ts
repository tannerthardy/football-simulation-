import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import {World,type Intent} from '../src/physics/world.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {RunnerToMesh} from '../src/sim/assign.js';
import {handoffReach} from '../src/sim/ball-transfer.js';
import {QBHandoff} from '../src/sim/behaviors/qb.js';
import {goTo,angleTo} from '../src/sim/behaviors/common.js';
import {PlaySim} from '../src/sim/playsim.js';
import type {TeammatePicture} from '../src/sim/teammate-information.js';

// Reuse PR47's all-22 capture. Only QB/RB are executed below, through an
// isolated World. These controller fixtures never tick a native PlaySim.
const row=JSON.parse(readFileSync('test/fixtures/wide-zone-mesh.json','utf8'));
function stage(ride:boolean,side=1) {
  const sim=new PlaySim({
    offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),'12'),
    defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),
    offCall:{formation:FORMATION_BY_ID.ace_12,flip:side<0,kind:'run',run:RUN_BY_ID.wz_strong,label:'mesh'},
    defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'mesh'},
    los:40,ballY:26.666666666666668,firstDownX:50,seed:3});
  const qb=sim.qb,rb=sim.slot('RB')!;
  for(const a of [qb,rb]) {
    a.body=structuredClone(row.actors[a.idx].initialBody);a.body.support!.since=-Infinity;
    if(side<0) {a.body.pos.y=2*sim.ballY-a.pos.y;a.body.vel.y=-a.vel.y;a.body.facing=-a.facing;}
  }
  const old=row.actors[0].initialBehavior,back=row.actors[6].initialBehavior;
  const point=(p:{x:number;y:number})=>({x:p.x,y:side<0?2*sim.ballY-p.y:p.y});
  const mesh=point(old.mesh),target=point(back.mesh),aim=point(back.aim);
  qb.behavior=new QBHandoff(mesh,old.meshTime,rb,old.pitchRange,old.keeper,ride);
  rb.behavior=new RunnerToMesh(target,back.meshTime,aim,back.ride);
  const world=new World([qb.body,rb.body]);
  return {sim,qb,rb,world,mesh,target};
}
function exchange(ride:boolean,side=1,interrupted=false) {
  const {sim,qb,rb,world}=stage(ride,side),frames:any[]=[];
  for(let k=0;k<60&&sim.carrier===qb;k++) {
    sim.t=k*.05;world.time=sim.t;
    // Ordinary acquisition queues and delivery latency for the owned query;
    // never replace the QB's picture with current truth or a future RB job.
    sim.perception.record(sim.agents,sim.carrier?.idx??null);
    sim.teammateAwareness.sense(sim.agents,sim.t,sim.dt);
    const before={qb:structuredClone(qb.body),rb:structuredClone(rb.body)};
    const q=sim.t<qb.snapReadyAt?{vel:{x:0,y:0},facing:qb.facing}:qb.behavior.update(qb,sim);
    const r=sim.carrier===rb||sim.t<rb.snapReadyAt?{vel:{x:0,y:0},facing:rb.facing}:rb.behavior.update(rb,sim);
    const entry={t:sim.t,before,q,r,handed:sim.carrier===rb};frames.push(entry);
    if(sim.carrier===rb)break;
    const intents:Intent[]=[interrupted?{vel:{x:0,y:0}}:q,r];
    world.step(intents,.05);
    expect(qb.body.support!.state).toBe('up');expect(rb.body.support!.state).toBe('up');
  }
  return {sim,qb,rb,frames,handoff:frames.find(f=>f.handed)};
}

describe('wide-zone exchange uses a moving QB landmark',()=>{
  it('removes the zero-terminal-speed cap from the first opening request',()=>{
    const old=stage(false),next=stage(true);
    old.sim.t=next.sim.t=.05;
    expect(next.qb.body).toEqual(old.qb.body);expect(next.rb.body).toEqual(old.rb.body);
    const before=structuredClone(next.qb.body),a=old.qb.behavior.update(old.qb,old.sim),b=next.qb.behavior.update(next.qb,next.sim);
    expect(Math.hypot(b.vel.x,b.vel.y)).toBeGreaterThan(Math.hypot(a.vel.x,a.vel.y));
    expect(b.facing).toBe(a.facing);expect(next.qb.body).toEqual(before);
    expect(next.rb.behavior.update(next.rb,next.sim)).toEqual(old.rb.behavior.update(old.rb,old.sim));
  });

  it.each([-1,1])('achieves a reachable earlier exchange in reflection %s',side=>{
    const old=exchange(false,side),next=exchange(true,side);
    const summary=(r:ReturnType<typeof exchange>)=>({time:r.handoff?.t,
      distance:r.handoff?Math.hypot(r.handoff.before.qb.pos.x-r.handoff.before.rb.pos.x,r.handoff.before.qb.pos.y-r.handoff.before.rb.pos.y):null,
      qb:r.handoff?.before.qb.pos,rb:r.handoff?.before.rb.pos,
      qbVelocity:r.handoff?.before.qb.vel,rbVelocity:r.handoff?.before.rb.vel,
      firstRBPress:r.frames.find(f=>f.r.vel.x>3&&Math.abs(f.r.vel.y)<3)?.t});
    console.log(JSON.stringify({wideZoneMesh:side,old:summary(old),next:summary(next)}));
    expect(old.handoff).toBeDefined();expect(next.handoff).toBeDefined();
    expect(next.handoff.t).toBeLessThan(old.handoff.t);
    expect(Math.hypot(next.handoff.before.qb.pos.x-next.handoff.before.rb.pos.x,
      next.handoff.before.qb.pos.y-next.handoff.before.rb.pos.y)).toBeLessThanOrEqual(handoffReach(next.qb,next.rb));
    // Facing changes physically; no instant reversal or planted-body reset.
    expect(next.frames[1].before.qb.facing).toBeCloseTo(0,12);
    expect(Math.abs(next.frames[2].before.qb.facing)).toBeLessThan(Math.PI);
  });

  it('cannot turn an interrupted opening into a distant transfer at the deadline',()=>{
    const result=exchange(true,1,true);
    expect(result.handoff).toBeUndefined();expect(result.sim.carrier).toBe(result.qb);
  });

  it('cannot transfer to a downed back despite nearby geometry and an expired clock',()=>{
    const {sim,qb,rb}=stage(true);sim.t=2;
    rb.body.pos={x:qb.pos.x+.8,y:qb.pos.y};rb.downUntil=99;
    qb.behavior.update(qb,sim);expect(sim.carrier).toBe(qb);
  });

  it('preserves the stopping request for an ordinary non-riding mesh',()=>{
    const {sim,qb,mesh}=stage(false);sim.t=.1;
    expect(qb.behavior.update(qb,sim)).toEqual(goTo(qb,mesh,{speed:1,facing:angleTo(qb.pos,mesh),through:0}));
  });

  it('uses one owned picture for the movement gate and lead despite hidden RB body/job changes',()=>{
    const {sim,qb,rb,mesh}=stage(true);sim.t=1;
    const picture:TeammatePicture={source:'observed',pos:{x:mesh.x-.2,y:mesh.y+.1},vel:{x:1,y:-2},
      sampledAt:.7,availableAt:1,age:.3,predictedFor:.3};
    const before=structuredClone(qb.body),rng=structuredClone(sim.rng),information=structuredClone(sim.teammateAwareness);
    let queries=0;
    sim.teammateInformation=(observer,target)=>{expect(observer).toBe(qb);expect(target).toBe(rb);queries++;return structuredClone(picture);};
    sim.see=()=>{throw Error('Movement may not refresh the owned picture through legacy see');};
    const first=qb.behavior.update(qb,sim);
    rb.body.pos={x:mesh.x,y:mesh.y};rb.body.vel={x:-9,y:9};
    rb.behavior={kind:'hidden-new-job',update:()=>{throw Error('Private future job must not be queried');}};
    expect(qb.behavior.update(qb,sim)).toEqual(first);expect(queries).toBe(2);
    expect(qb.body).toEqual(before);expect(structuredClone(sim.rng)).toEqual(rng);
    expect(structuredClone(sim.teammateAwareness)).toEqual(information);
  });

  it('follows the installed QB landmark when the RB picture is unavailable',()=>{
    const {sim,qb,mesh}=stage(true);sim.t=1;
    sim.teammateInformation=()=>({source:'unavailable'});
    expect(qb.behavior.update(qb,sim)).toEqual(goTo(qb,mesh,{speed:1,facing:angleTo(qb.pos,mesh),through:qb.profile.vmax*.55}));
  });

  it.each([.05,0])('does not extrapolate a called lead beyond its remaining %s seconds',validFor=>{
    const {sim,qb,mesh}=stage(true);sim.t=1;
    const pos={x:mesh.x-.1,y:mesh.y+.1},vel={x:2,y:-3};
    sim.teammateInformation=()=>({source:'called',pos,vel,sampledAt:0,availableAt:0,age:1,predictedFor:1,
      forecast:{validFor,samples:[{t:0,pos,vel}]}});
    const lead={x:pos.x+vel.x*validFor,y:pos.y+vel.y*validFor};
    expect(qb.behavior.update(qb,sim)).toEqual(goTo(qb,lead,{speed:1,facing:angleTo(qb.pos,lead),through:qb.profile.vmax*.55}));
  });

  it('uses the installed route samples rather than a tangent beyond a called bend',()=>{
    const {sim,qb,mesh}=stage(true);sim.t=1;
    const pos={x:mesh.x-.1,y:mesh.y+.1},vel={x:2,y:-3},lead={x:mesh.x+.1,y:mesh.y+.4};
    sim.teammateInformation=()=>({source:'called',pos,vel,sampledAt:0,availableAt:0,age:1,predictedFor:1,
      forecast:{validFor:.1,samples:[{t:0,pos,vel},{t:.1,pos:lead,vel:{x:0,y:3}}]}});
    expect(qb.behavior.update(qb,sim)).toEqual(goTo(qb,lead,{speed:1,facing:angleTo(qb.pos,lead),through:qb.profile.vmax*.55}));
  });

  it('keeps physical transfer authoritative when the owned picture remains unavailable',()=>{
    const {sim,qb,rb}=stage(true);sim.t=1.2;
    sim.teammateInformation=()=>({source:'unavailable'});
    rb.body.pos={x:qb.pos.x+.8,y:qb.pos.y};
    qb.behavior.update(qb,sim);expect(sim.carrier).toBe(rb);
  });
});
