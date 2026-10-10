import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import type { PhysicalProfile } from '../src/players/physical.js';
import { CONTACT_SCALE, World, type Intent } from '../src/physics/world.js';

const profile: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05, vmax: 9,
  tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3,
  reactReach: 2.6, reactionTime: .25, power: 100, balance: .5, bend: .5, stepSpeed: 3.4 };
const free: Intent = { vel: { x: 0, y: 0 }, free: true };
const body = (x: number, vx: number): Body => ({ pos: { x, y: 0 }, vel: { x: vx, y: 0 },
  facing: 0, energy: 1, profile: { ...profile } });

describe('experimental local impact onset', () => {
  it('does not split a mixed island and alter an unrelated persistent hand solve', () => {
    const run = (impactTiming: 'speculative'|'local-sweep') => {
      const bodies=[body(0,8),body(.85,0),body(10,0),body(10.9,0)];
      const world=new World(bodies,{substeps:1,impactTiming});
      world.joints.push({kind:'hands',a:bodies[2],b:bodies[3],extension:1.1,push:800,hold:0,steer:0});
      const r=world.step(bodies.map(()=>free),.05);
      return {bodies,r};
    };
    const old=run('speculative'),candidate=run('local-sweep');
    expect(candidate.r.impactSplits).toBe(0);
    candidate.bodies.forEach((b,i)=>{
      expect(b.pos.x).toBeCloseTo(old.bodies[i].pos.x,12);
      expect(b.vel.x).toBeCloseTo(old.bodies[i].vel.x,12);
    });
    expect(candidate.r.work).toEqual(old.r.work);
  });
  it('advances a passive pair to physical touch without an earlier hit load', () => {
    const a=body(0,8),b=body(.85,0),w=new World([a,b],{substeps:1,impactTiming:'local-sweep'});
    const segments: {t:number;h:number;distance:number;vx:number[];load:number;xi:number[]}[]=[];
    const internals=w as any, integrate=internals.integrateSubstep;
    internals.integrateSubstep=function(...args:any[]) {
      integrate.apply(this,args);
      segments.push({t:w.time,h:args[3],distance:Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y),
        vx:[a.vel.x,b.vel.x],load:Math.hypot(a.support!.load.x,a.support!.load.y),
        xi:[a.support!.xi.x,b.support!.xi.x]});
    };
    const report=w.step([free,free],.05),touch=CONTACT_SCALE*(a.profile.radius+b.profile.radius);
    expect(report.substeps).toBe(1);
    expect(report.impactSplits).toBe(1);
    expect(report.impactSplitLimitHits).toBe(0);
    expect(segments[0].t).toBeCloseTo((.85-touch)/8,12);
    expect(segments[0].distance).toBeCloseTo(touch,12);
    expect(segments[0].vx).toEqual([8,0]);
    expect(segments[0].load).toBe(0);
    expect(segments[0].xi).toEqual([0,0]);
    expect(report.contacts.length).toBe(1);
    expect(report.contacts[0].impulse).toBeGreaterThan(0);
    expect(a.profile.massKg*a.vel.x+b.profile.massKg*b.vel.x).toBeCloseTo(800,10);
    expect((a.pos.x+b.pos.x)/2).toBeCloseTo(.625,12);
    expect(report.work.residual).toBeCloseTo(0,9);
  });

  it('preserves mirror geometry and recorded momentum/work over coarse and fine passive impacts', () => {
    const reps=[];
    for(const side of [1,-1]) for(const substeps of [1,12,48]) {
      const a=body(0,8*side),b=body(1.5*side,-2*side);
      const w=new World([a,b],{substeps,impactTiming:'local-sweep'});
      let gx=0;
      for(let k=0;k<3;k++) {
        const before=100*(a.vel.x+b.vel.x),r=w.step([free,free],.05);
        const ground=r.groundImpulse.reduce((s,g)=>s+g.x,0);gx+=ground;
        expect(100*(a.vel.x+b.vel.x)-before).toBeCloseTo(ground,8);
        expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
        expect(r.impactSplitLimitHits).toBe(0);
      }
      reps.push({side,substeps,a:a.pos.x*side,b:b.pos.x*side,energy:w.kineticEnergy(),gx:gx*side});
    }
    for(const positive of reps.filter(r=>r.side===1)) {
      const negative=reps.find(r=>r.side===-1&&r.substeps===positive.substeps)!;
      expect(negative.a).toBeCloseTo(positive.a,10);
      expect(negative.b).toBeCloseTo(positive.b,10);
      expect(negative.energy).toBeCloseTo(positive.energy,8);
      expect(negative.gx).toBeCloseTo(positive.gx,8);
    }
  });
});
