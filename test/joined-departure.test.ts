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
