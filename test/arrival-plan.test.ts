import {describe,expect,it} from 'vitest';
import {planArrival} from '../src/sim/arrival-plan.js';
import {World} from '../src/physics/world.js';
import {newSupport} from '../src/physics/support.js';
import type {Body} from '../src/physics/kinematics.js';
import type {PhysicalProfile} from '../src/players/physical.js';
import {goTo} from '../src/sim/behaviors/common.js';
import type {Agent} from '../src/sim/agent.js';

const profile:PhysicalProfile={massKg:100,radius:.3,reach:1,heightYd:2.05,vmax:9,tau:1.3,
  brake:6,lateral:6,turnRate:8,backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,
  reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9};
function body(speed=0):Body{return {pos:{x:0,y:0},vel:{x:speed,y:0},facing:0,energy:1,profile:{...profile}};}

describe('radial arrival planning under unchanged World limits',()=>{
  it('budgets next-tick travel and remaining braking in a straight feasible approach',()=>{
    for(const dt of [.025,.05,.11])for(const speed of [0,1,3])for(const distance of [.2,1,3]){
      const q=body(speed),w=new World([q]),target={x:distance,y:0};
      const before=structuredClone(q),plan=planArrival(q,target,3,0,dt,0);
      expect(q).toEqual(before);
      if(!plan.radialBrakeFeasible)continue;
      const plannedTravel=.5*(speed+plan.velocity.x)*dt;
      const plannedStop=plan.velocity.x**2/(2*plan.brake);
      expect(plannedTravel+plannedStop).toBeLessThanOrEqual(distance+1e-12);
      const report=w.step([{vel:plan.velocity,propulsion:'full'}],dt);
      expect(report.contacts).toHaveLength(0);
      expect(q.pos.x+q.vel.x**2/(2*plan.brake)).toBeLessThanOrEqual(distance+1e-10);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    }
  });

  it('explodes toward a moderate speed then stops within the requested capture region',()=>{
    const q=body(),w=new World([q]);let launch=0,arrived=false;
    for(let k=0;k<100;k++){
      const plan=planArrival(q,{x:3,y:0},2.65,0,.05);
      w.step([{vel:plan.velocity,propulsion:'full'}],.05);
      if(k===9)launch=q.vel.x;
      expect(q.vel.x).toBeGreaterThanOrEqual(-1e-12);
      expect(q.vel.x).toBeLessThanOrEqual(2.65+1e-12);
      expect(q.pos.x).toBeLessThanOrEqual(3+1e-12);
      if(Math.abs(3-q.pos.x)<=.15&&q.vel.x<1e-5){arrived=true;break;}
    }
    expect(launch).toBeGreaterThan(2.5);
    expect(arrived).toBe(true);expect(q.profile).toEqual(profile);
  });

  it('permits a nonzero terminal transition without requiring a stop',()=>{
    const q=body(),w=new World([q]);let arrived=false;
    for(let k=0;k<100;k++){
      const plan=planArrival(q,{x:3,y:0},2.65,1,.05);
      w.step([{vel:plan.velocity,propulsion:'full'}],.05);
      if(q.pos.x>=2.85-1e-10){
        expect(q.vel.x).toBeGreaterThan(0);
        expect(q.vel.x).toBeLessThanOrEqual(1+1e-10);
        arrived=true;break;
      }
    }
    expect(arrived).toBe(true);
  });

  it('reports an impossible late stop without replacing the body state or its finite braking',()=>{
    const q=body(4),w=new World([q]),before=structuredClone(q);
    const plan=planArrival(q,{x:.2,y:0},3,0,.05,0);
    expect(plan.radialBrakeFeasible).toBe(false);expect(q).toEqual(before);
    w.step([{vel:plan.velocity,propulsion:'full'}],.05);
    expect(q.vel.x).toBeGreaterThan(3);
    expect(q.pos.x).toBeGreaterThan(0);
  });

  it('distinguishes continuous stopping feasibility from an impossible held stop within a long tick',()=>{
    const q=body(.5),w=new World([q]);
    const plan=planArrival(q,{x:.03,y:0},3,0,.2,0);
    // A continuously switched brake could fit. The held World command
    // cannot stop before the end of its interval, consuming .05 rather than .03.
    expect(.5**2/(2*plan.brake)).toBeLessThan(.03);
    expect(plan.radialBrakeFeasible).toBe(false);
    w.step([{vel:plan.velocity,propulsion:'full'}],.2);
    expect(q.pos.x).toBeGreaterThan(.03);
  });

  it('uses less braking when fatigue or displaced support limits the same body',()=>{
    const q=body(1);q.support=newSupport();
    const fresh=planArrival(q,{x:1,y:0},3,0,.05,0);
    q.energy=.1;
    const tired=planArrival(q,{x:1,y:0},3,0,.05,0);
    expect(tired.brake).toBeLessThan(fresh.brake);
    q.support.xi={x:.3,y:0};
    const displaced=planArrival(q,{x:1,y:0},3,0,.05,0);
    expect(displaced.brake).toBeLessThan(tired.brake);
    q.support.state='falling';
    const fallen=planArrival(q,{x:1,y:0},3,0,.05,0);
    expect(fallen.brake).toBe(0);expect(fallen.radialBrakeFeasible).toBe(false);
  });

  it('mirrors its request and radial conditions without inferring a clear crossing path',()=>{
    const a=body(1),b=body(1);a.vel.y=.3;b.vel.y=-.3;
    const p=planArrival(a,{x:3,y:1},3,0,.05),q=planArrival(b,{x:3,y:-1},3,0,.05);
    expect(q.velocity.x).toBe(p.velocity.x);expect(q.velocity.y).toBe(-p.velocity.y);
    expect(q.brake).toBe(p.brake);expect(q.radialBrakeFeasible).toBe(p.radialBrakeFeasible);
    const crossing=body();crossing.vel.y=6;
    const w=new World([crossing]),plan=planArrival(crossing,{x:1,y:0},3,0,.1,0);
    expect(plan.radialBrakeFeasible).toBe(true);
    w.step([{vel:plan.velocity,propulsion:'full'}],.1);
    expect(crossing.vel.y).toBeGreaterThan(4);
    expect(crossing.pos.y).toBeGreaterThan(.4);
  });

  it('retains a strict zero-radius stop line across unequal command intervals',()=>{
    for(const intervals of [[.05],[.025,.075],[.03,.07,.02,.11],[.2]]){
      const q=body(),w=new World([q]);let stopped=false;
      for(let k=0;k<160;k++){
        const dt=intervals[k%intervals.length],plan=planArrival(q,{x:3,y:0},2.65,0,dt,0,1,Math.max(...intervals));
        w.step([{vel:plan.velocity,propulsion:'full'}],dt);
        expect(q.pos.x).toBeLessThanOrEqual(3+1e-10);
        if(3-q.pos.x<1e-5&&Math.abs(q.vel.x)<1e-5){stopped=true;break;}
      }
      expect(stopped).toBe(true);
    }
  });

  it('plans through-speed at the caller\'s actual waypoint handover boundary',()=>{
    const q=body(),w=new World([q]);q.pos.y=20;
    const a={body:q,profile:q.profile} as Agent;let crossed=false;
    for(let k=0;k<100;k++){
      const command=goTo(a,{x:3,y:20},{speed:2.65/profile.vmax,through:1,propulsion:'full',captureRadius:.65});
      expect(command.propulsion).toBe('full');
      w.step([command],.05);
      if(q.pos.x>=3-.65){expect(q.vel.x).toBeGreaterThan(0);expect(q.vel.x).toBeLessThanOrEqual(1+1e-10);crossed=true;break;}
    }
    expect(crossed).toBe(true);
    expect(()=>planArrival(body(),{x:3,y:0},3,0,.1,0,1,.05)).toThrow('Command ceiling');
  });
});
