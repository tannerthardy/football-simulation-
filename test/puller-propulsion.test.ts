import {describe,expect,it} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generatePlayer} from '../src/players/generator.js';
import {derivePhysical} from '../src/players/physical.js';
import {driveAccel,fatigueFactor,locomotionAccel,stepBody,type Body,type MoveCommand} from '../src/physics/kinematics.js';
import {World} from '../src/physics/world.js';
import {supportParams} from '../src/physics/support.js';
import {previewFreeMovement} from '../src/physics/movement-preview.js';

const profile=derivePhysical(generatePlayer(new Rng(31),'OG'));
function body(speed=0):Body{return {pos:{x:0,y:0},vel:{x:speed,y:0},facing:0,energy:1,profile:{...profile}};}

describe('explicit propulsion toward a bounded speed',()=>{
  it('keeps ordinary moderate-speed easing and permits the existing full drive only when requested',()=>{
    const b=body(1),command={vel:{x:2.65,y:0}},capacity=.6;
    const ordinary=locomotionAccel(b,command,.05,capacity);
    expect(ordinary.x).toBeCloseTo((2.65-1)/profile.tau*capacity,12);
    const full=locomotionAccel(b,{...command,propulsion:'full'},.05,capacity);
    expect(full.x).toBeCloseTo(driveAccel(profile,1,profile.vmax)*capacity,12);
    expect(full.y).toBe(0);expect(full.x).toBeGreaterThan(ordinary.x);
  });

  it('reaches a moderate target without exceeding it, changing capacity or charging effort twice',()=>{
    const b=body(),ordinary=body(),forecast=body(),w=new World([b]);
    const command:MoveCommand={vel:{x:2.65,y:0},propulsion:'full'};
    for(let k=0;k<30;k++){
      const before=b.vel.x,r=w.step([command],.05);
      stepBody(forecast,command,.05);stepBody(ordinary,{vel:command.vel},.05);
      expect(b.vel.x).toBeGreaterThanOrEqual(before-1e-12);
      expect(b.vel.x).toBeLessThanOrEqual(2.65+1e-12);
      expect(b.profile).toEqual(profile);expect(r.contacts).toHaveLength(0);
      expect(b.vel.x).toBeCloseTo(forecast.vel.x,12);
      expect(b.pos.x).toBeCloseTo(forecast.pos.x,12);
      expect(b.energy).toBeCloseTo(forecast.energy,12);
      expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
    }
    expect(b.pos.x).toBeGreaterThan(ordinary.pos.x);
    expect(b.energy).toBeLessThan(ordinary.energy);
  });

  it('preserves top-speed propulsion, stopping and deliberate reversals',()=>{
    for(const [speed,target] of [[1,profile.vmax],[3,0],[3,-3]]){
      const b=body(speed),command={vel:{x:target,y:0}};
      expect(locomotionAccel(b,{...command,propulsion:'full'},.05)).toEqual(locomotionAccel(b,command,.05));
    }
    const slow=body(2.6),a=locomotionAccel(slow,{vel:{x:2.65,y:0},propulsion:'full'},.05);
    expect(a.x*.05).toBeLessThanOrEqual(.05+1e-12);
    expect(locomotionAccel(body(),{vel:{x:0,y:0},propulsion:'full'},.05)).toEqual({x:0,y:0});
  });

  it('retains bounded cuts, capacity/fatigue limits, mirrored motion and matching World forecasts',()=>{
    const b=body(profile.vmax),a=locomotionAccel(b,{vel:{x:0,y:profile.vmax},propulsion:'full'},.05);
    expect(a.x).toBeLessThan(0);expect(a.y).toBeGreaterThan(0);
    expect(a.y).toBeLessThanOrEqual(profile.lateral);
    for(let k=0;k<6;k++)stepBody(b,{vel:{x:0,y:profile.vmax},propulsion:'full'},.05);
    expect(b.vel.x).toBeGreaterThan(2);
    const tired=body(1);tired.energy=.1;
    const limited=locomotionAccel(tired,{vel:{x:3,y:0},propulsion:'full'},.05,.4),fat=fatigueFactor(tired.energy);
    expect(limited.x).toBeLessThanOrEqual(driveAccel(profile,1,profile.vmax*fat)*fat*.4+1e-12);
    const results=[];
    for(const side of [-1,1]){
      const q=body(1),command:MoveCommand={vel:{x:2.4,y:side*1.2},propulsion:'full'};
      const world=new World([q]),initial=structuredClone(q),predicted=previewFreeMovement(q,command,0,12);
      expect(q).toEqual(initial);
      for(let k=0;k<12;k++){
        const r=world.step([command],.05);
        expect(q.pos).toEqual(predicted[k].pos);expect(q.vel).toEqual(predicted[k].vel);
        expect(Math.hypot(r.groundImpulse[0].x,r.groundImpulse[0].y)).toBeLessThanOrEqual(supportParams(profile).traction*.05+1e-8);
      }
      results.push(q);
    }
    expect(results[0].pos.x).toBeCloseTo(results[1].pos.x,10);
    expect(results[0].pos.y).toBeCloseTo(-results[1].pos.y,10);
  });
});
