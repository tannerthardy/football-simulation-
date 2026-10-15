import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Body } from '../src/physics/kinematics.js';
import { World, type Joint } from '../src/physics/world.js';
import { checkJoinedDeparture } from '../src/sim/joined-departure.js';

const packet = JSON.parse(readFileSync(new URL('./fixtures/joined-release-state.json', import.meta.url), 'utf8'));
const json = (value: unknown) => JSON.parse(JSON.stringify(value));
function fixture(index = 0, mirror = false) {
  const saved = structuredClone(packet.cases[index]);
  const body = saved.frame.beforeBodies[saved.actor] as Body;
  if (body.support?.since === null) body.support.since = -Infinity;
  const peers = saved.peers.map((peer: any) => ({ pos: { ...peer.picture.pos }, vel: { ...peer.picture.vel }, radius: peer.radius }));
  const command = structuredClone(saved.command);
  if (mirror) {
    body.pos.y = 2*CENTER_Y-body.pos.y; body.vel.y *= -1; body.facing *= -1;
    if (body.spin !== undefined) body.spin *= -1;
    if (body.squeezeHeading !== undefined) body.squeezeHeading *= -1;
    if (body.support) for (const key of ['xi','lean','load','felt','feetVel','fall','feltTip','accel','tipAccel'] as const)
      if (body.support[key]) body.support[key]!.y *= -1;
    command.vel.y *= -1;
    if (command.facing !== undefined) command.facing *= -1;
    for (const peer of peers) { peer.pos.y=2*CENTER_Y-peer.pos.y; peer.vel.y *= -1; }
  }
  return { body, peers, command, now:saved.frame.t, horizon:saved.horizon, saved };
}

describe('joined release checks the action the leaving body can execute', () => {
  it.each([0,1])('reproduces the complete native World step for saved state %s', index => {
    const { frame } = packet.cases[index];
    const bodies: Body[] = structuredClone(frame.beforeBodies);
    for(const b of bodies) if(b.support?.since===null) b.support.since=-Infinity;
    const { substeps: _adaptive, ...settings } = packet.worldDefaults;
    const world = new World(bodies,settings); world.time=frame.t;
    const hydrate=(source:any) => {
      const joint=structuredClone(source);
      for(const key of ['a','b','actor','holder']) if(typeof joint[key]==='number') joint[key]=bodies[joint[key]];
      return joint;
    };
    expect(frame.jointInputs.every((joint:any)=>joint.kind==='hands')).toBe(true);
    world.joints=frame.jointInputs.map(hydrate) as Joint[];
    Reflect.set(world,'pending',frame.pending.map(hydrate));
    const report=world.step(structuredClone(frame.final),frame.dt);
    expect(json(bodies)).toEqual(frame.afterBodies);
    expect(json(report)).toEqual(frame.report);
  });

  it.each([false,true])('rejects the same acquired weak-DL obstruction, mirrored=%s', mirror => {
    const f=fixture(0,mirror), input=json(f);
    const draws=vi.spyOn(Rng.prototype,'nextU32');
    try {
      const check=checkJoinedDeparture(f.body,f.command,f.peers,f.now,f.horizon,'center');
      expect(check.clear).toBe(false);
      expect(check.minimumMargin).toBeLessThan(0);
      expect(json(f)).toEqual(input);
      expect(draws).not.toHaveBeenCalled();
      console.info('same-state joined departure',JSON.stringify({mirror,...check,command:f.command}));
    } finally { draws.mockRestore(); }
  });

  it('does not manufacture a safe release by merely requesting a stop', () => {
    const f=fixture();
    const gather=checkJoinedDeparture(f.body,{...f.command,vel:{x:0,y:0}},f.peers,f.now,f.horizon,'center');
    expect(gather.clear).toBe(false);
    expect(gather.minimumMargin).toBeLessThan(0);
  });

  it.each([false,true])('allows the identical body/request when the acquired corridor is genuinely clear, mirrored=%s', mirror => {
    const f=fixture(0,mirror);
    const peers=f.peers.map((peer:any)=>({...peer,pos:{x:peer.pos.x+3,y:peer.pos.y}}));
    expect(checkJoinedDeparture(f.body,f.command,peers,f.now,f.horizon,'center').clear).toBe(true);
  });

  it('preserves the safe first arc without claiming that it reaches the linebacker', () => {
    const f=fixture(1);
    expect(checkJoinedDeparture(f.body,f.command,f.peers,f.now,f.horizon,'center').clear).toBe(true);
  });

  it('permits touching contact only when the achieved step moves out', () => {
    const f=fixture();
    f.body.pos={x:40,y:26}; f.body.vel={x:-.5,y:0}; f.body.facing=Math.PI;
    f.body.support!.lean={x:0,y:0}; f.body.support!.load={x:0,y:0};
    const peers=[{pos:{x:40.6,y:26},vel:{x:0,y:0},radius:.35}];
    expect(checkJoinedDeparture(f.body,{vel:{x:-2,y:0},facing:Math.PI},peers,f.now,.2,'center').clear).toBe(true);
    f.body.vel={x:.5,y:0}; f.body.facing=0;
    expect(checkJoinedDeparture(f.body,{vel:{x:2,y:0},facing:0},peers,f.now,.2,'center').clear).toBe(false);
  });
});

// Controller fixtures consume only the saved own body/plan and acquired cue.
// They are not late PlaySim restarts or interacting continuations.
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';

function staged(clear = false) {
  const f=fixture(), formation=FORMATION_BY_ID.ace_12;
  const sim=new PlaySim({
    offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),formation.personnel),
    defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),
    offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.wz_weak,label:'uc12-wz-weak-s3'},
    defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'over Cover3'},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:3,
  });
  const a=sim.agents[f.saved.actor], target=sim.agents[f.saved.backer.actor];
  Object.assign(a.body,structuredClone(f.body)); sim.t=f.now;
  const behavior=new RunBlocker({kind:'climb',target,drive:{x:1,y:0}}); a.behavior=behavior;
  Reflect.set(behavior,'climbRead',{...structuredClone(f.saved.behavior.climbRead),target});
  const peers=f.peers.map((peer:any)=>({...peer,pos:{x:peer.pos.x+(clear?3:0),y:peer.pos.y}}));
  behavior.startDeparture(a,sim,sim.agents[13],sim.agents[5],target,
    {exit:null,flow:f.saved.backer.picture.vel,backer:f.saved.backer.picture,peers});
  const leave=()=>Reflect.get(behavior,'leaveCombination').call(behavior,a,sim);
  return {f,sim,a,target,behavior,peers,leave};
}

describe('hands can leave before the body is free to climb', () => {
  it('retains a direct-route departure and gathers while its achieved prefix is obstructed', () => {
    const s=staged(), before=json(s.a.body), read=json(Reflect.get(s.behavior,'departureRead'));
    const seen=vi.spyOn(s.sim,'see').mockImplementation(()=>{throw new Error('No new look is due');});
    const command=s.leave();
    expect(command.vel).toEqual({x:0,y:0});
    expect(s.behavior.plan.departure).toBeDefined();
    expect(json(s.a.body)).toEqual(before);
    expect(json(Reflect.get(s.behavior,'departureRead'))).toEqual(read);
    // Hidden body divergence cannot change this held acquired decision.
    s.sim.agents[13].body.pos={x:60,y:5}; s.sim.agents[5].body.pos={x:30,y:50};
    expect(s.leave()).toEqual(command);
    expect(seen).not.toHaveBeenCalled(); seen.mockRestore();
  });

  it('executes and exits on the exact checked climb command when the acquired route is clear', () => {
    const s=staged(true);
    const command=s.leave();
    expect(command).toEqual(s.f.command);
    expect(checkJoinedDeparture(s.a.body,command,s.peers,s.f.now,s.f.horizon,'center').clear).toBe(true);
    expect(s.behavior.plan.departure).toBeUndefined();
  });

  it('compares the native first contact with gathering from the identical released all-22 state', () => {
    const f=fixture(), frame=f.saved.frame;
    const run=(gather:boolean)=>{
      const bodies:Body[]=structuredClone(frame.beforeBodies);
      for(const b of bodies) if(b.support?.since===null)b.support.since=-Infinity;
      const {substeps:_adaptive,...settings}=packet.worldDefaults;
      const world=new World(bodies,settings);world.time=frame.t;
      const hydrate=(source:any)=>{const j=structuredClone(source);
        for(const key of ['a','b','actor','holder'])if(typeof j[key]==='number')j[key]=bodies[j[key]];return j;};
      world.joints=frame.jointInputs.map(hydrate);Reflect.set(world,'pending',frame.pending.map(hydrate));
      const intents=structuredClone(frame.final);
      if(gather)intents[f.saved.actor]={...intents[f.saved.actor],vel:{x:0,y:0}};
      const report=world.step(intents,.05);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
      const contact=report.contacts.filter(c=>[c.i,c.j].includes(f.saved.actor)&&[c.i,c.j].includes(13));
      return {impulse:contact.reduce((n,c)=>n+c.impulse,0),body:bodies[f.saved.actor]};
    };
    const old=run(false),gather=run(true);
    console.info('same-state actual release contact',JSON.stringify({oldImpulse:old.impulse,gatherImpulse:gather.impulse,
      oldVelocity:old.body.vel,gatherVelocity:gather.body.vel}));
    expect(old.impulse).toBeCloseTo(79.8735422029471,10);
    // Both actions may still contact: this verifies execution, not a promise
    // that an issued braking request instantly clears residual momentum.
    expect(gather.impulse).toBeGreaterThan(0);
  });
});
