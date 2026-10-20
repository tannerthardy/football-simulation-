import {describe,expect,it} from 'vitest';
import {fatigueFactor,locomotionAccel,stepBody,type Body,type MoveCommand} from '../src/physics/kinematics.js';
import {World} from '../src/physics/world.js';
import type {PhysicalProfile} from '../src/players/physical.js';

const DT=.05;
const gait=Number(process.env.GAIT_STEP??0);
const profile:PhysicalProfile={massKg:100,radius:.3,reach:1,heightYd:2.05,vmax:9,tau:1.3,
  brake:6,lateral:6,turnRate:8,backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,
  reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9};
function body(speed=1,energy=1):Body{
  return {pos:{x:0,y:0},vel:{x:speed,y:0},facing:0,energy,profile:{...profile}};
}
const polar=(speed:number,angle:number)=>({x:speed*Math.cos(angle),y:speed*Math.sin(angle)});
const bearing=(v:{x:number;y:number})=>Math.atan2(v.y,v.x);

describe('eased propulsion does not overshoot a held requested bearing',()=>{
  it('closes the analytic small-angle counterexample without reducing forward demand',()=>{
    // After forward easing, assigning the whole requested transverse velocity
    // crosses a tiny desired angle. No contact, changing target or RNG exists.
    const q=body(),vel={x:2.65,y:.0265},speed=Math.hypot(vel.x,vel.y);
    const ease=gait?Math.min((profile.vmax-1)/profile.tau,(speed-1)/gait):(speed-1)/profile.tau;
    const oldNext={x:1+ease*DT,y:vel.y};
    expect(bearing(oldNext)).toBeGreaterThan(bearing(vel)*2);
    const a=locomotionAccel(q,{vel},DT),next={x:1+a.x*DT,y:a.y*DT};
    expect(a.x).toBeCloseTo(ease,12);
    expect(bearing(next)).toBeCloseTo(bearing(vel),12);
    expect(Math.abs(next.y)).toBeLessThan(Math.abs(oldNext.y));
  });

  it.each([-1,1])('keeps small turns between current and requested bearings, side=%s',side=>{
    for(const speed of [.35,.8,2])for(const targetSpeed of [2.65,8])
      for(const angle of [.001,.01,.15])for(const energy of [1,.1])for(const capacity of [1,.25]){
        const q=body(speed,energy),command={vel:polar(targetSpeed,side*angle)};
        const a=locomotionAccel(q,command,DT,capacity);
        const next={x:q.vel.x+a.x*DT,y:q.vel.y+a.y*DT};
        // Cases with a lower target speed brake; they retain their old law.
        if(targetSpeed*Math.cos(angle)>speed){
          expect(bearing(next)*side).toBeGreaterThanOrEqual(-1e-12);
          expect(bearing(next)*side).toBeLessThanOrEqual(angle+1e-12);
        }
        const fat=fatigueFactor(energy);
        const atMax=(profile.vmax*fat-speed)/profile.tau*fat*capacity;
        const anMax=profile.lateral*(1-.2*speed/profile.vmax)*(.85+.15*fat)*capacity;
        expect((a.x/atMax)**2+(a.y/anMax)**2).toBeLessThanOrEqual(1+1e-10);
      }
  });

  it('keeps a stationary start aligned and free of false heading reversals through World',()=>{
    for(const speed of [0,1]){
      const q=body(speed),w=new World([q]),command:MoveCommand={vel:polar(2.65,.01)};
      let prior=0;
      for(let k=0;k<40;k++){
        const r=w.step([command],DT),angle=bearing(q.vel);
        expect(r.contacts).toHaveLength(0);
        expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
        expect(angle).toBeGreaterThanOrEqual(prior-1e-12);
        expect(angle).toBeLessThanOrEqual(.01+1e-12);
        prior=angle;
      }
    }
  });

  it('preserves the collinear easing, bounded full propulsion and stop laws',()=>{
    const q=body(),wanted=2.65;
    const a=locomotionAccel(q,{vel:{x:wanted,y:0}},DT);
    const expected=gait?Math.min((9-1)/1.3,(wanted-1)/gait):(wanted-1)/1.3;
    expect(a).toEqual({x:expected,y:0});
    expect(locomotionAccel(q,{vel:{x:wanted,y:0},propulsion:'full'},DT)).toEqual({x:8/1.3,y:0});
    expect(locomotionAccel(body(4),{vel:{x:0,y:0}},DT)).toEqual({x:-6,y:0});
  });

  it('preserves ninety-degree cuts and deliberate reversals within the existing ellipse',()=>{
    for(const angle of [Math.PI/2,2*Math.PI/3,Math.PI])for(const side of [-1,1]){
      const q=body(4),wanted=polar(3,angle*side),raw={x:(wanted.x-4)/DT,y:wanted.y/DT};
      const atMax=profile.brake,anMax=profile.lateral*(1-.2*4/profile.vmax);
      const scale=1/Math.sqrt((raw.x/atMax)**2+(raw.y/anMax)**2);
      const a=locomotionAccel(q,{vel:wanted},DT);
      expect(a.x).toBeCloseTo(raw.x*scale,12);
      expect(a.y).toBeCloseTo(raw.y*scale,12);
      expect(a.x).toBeLessThan(0);
    }
    const q=body(8);for(let k=0;k<6;k++)stepBody(q,{vel:{x:0,y:8}},DT);
    expect(q.vel.x).toBeGreaterThan(2);
  });
});
