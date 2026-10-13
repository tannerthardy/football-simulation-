import { describe, expect, it } from 'vitest';
import { World } from '../src/physics/world.js';
import { newSupport, supportParams } from '../src/physics/support.js';
import type { Body } from '../src/physics/kinematics.js';

const profile = { massKg: 100, radius: .3, reach: 1.6, heightYd: 2, vmax: 9, tau: 1.3,
  brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3,
  reactReach: 2.6, reactionTime: .25, power: 100, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };

/** Manufactured steady achieved effort: a balancing external load holds
 * speed/geometry fixed. Call the REAL foot effort accumulator and final World
 * fatigue update; only the contact/motion operator is prescribed here. Contact
 * law and body travel are tested separately, not claimed by this fixture.
 */
function steady(mode: 'ordinary' | 'local-sweep' | 'resolved' | 'fast', partitions: number) {
  const bodies: Body[] = [0,.61].map(x => ({ pos:{x,y:0}, vel:{x:x===0?1:0,y:0},
    facing:0,spin:0,energy:1,profile:{...profile},support:newSupport(.2) }));
  const w: any = new World(bodies,{substeps:partitions,
    handContact:mode==='ordinary'?'center':'patch', impactTiming:mode==='local-sweep'?'local-sweep':'speculative',
    gripTiming:mode==='fast'?'fast':mode==='resolved'?'resolved':'midpoint'});
  if(mode==='resolved'||mode==='fast') w.joints.push({kind:'grasp',a:bodies[0],b:bodies[1],capacity:1000,reach:1.6,hold:.61,legs:0,pull:0});
  const prototype = Object.create(World.prototype), elapsed: number[] = [];
  prototype.firstImpactTime = function (_ids: number[], _plans: any[], h: number) {
    const left=.017-this.time; return left>1e-9 && left<h ? left : h;
  };
  prototype.integrateInterval = function(ids: number[], intents: any[], plans: any[], h: number, remaining: number, report: any) {
    // Scratch solves use the same prototype operator, so their force samples
    // cannot leak into the accepted world's effort accumulator.
    if(this===w) elapsed.push(h);
    for(const i of ids) {
      const b=this.bodies[i], force=i===0?100:0, v=i===0?1:0;
      b.vel={x:v,y:0}; b.support.lean={x:force,y:0}; b.support.felt={x:-force,y:0};
      plans[i].ax=plans[i].ay=0; plans[i].facing=0;
      const push=force/(this.sp[i].pushForce*(1-v/b.profile.vmax)*this.fat[i]);
      this.feet(i,{...intents[i],vel:{x:2,y:0},push,posture:.2},plans[i],h,remaining,report);
      b.vel={x:v,y:0}; // the specified balancing load, not a new athlete law
    }
    for(const j of this.joints) j.force=(j.force??0)+100*h;
    this.time+=h;
  };
  Object.setPrototypeOf(w,prototype);
  const r=w.step(bodies.map(()=>({vel:{x:2,y:0},posture:.2})),.05);
  expect(elapsed.reduce((a,b)=>a+b,0)).toBeCloseTo(.05,12);
  if(mode==='local-sweep' && partitions===3) expect(r.impactSplits).toBeGreaterThan(0);
  const power=100/100/(profile.vmax**2/profile.tau), speed=(1/profile.vmax)**2;
  const expected=1-.05*(.0045+.03*power+.012*speed+.03*(100/supportParams(profile).pushForce));
  expect(bodies[0].energy).toBeCloseTo(expected,12);
  return bodies[0].energy;
}

describe('equal physical effort over equal elapsed time',()=>{
  it.each(['ordinary','local-sweep','resolved','fast'] as const)('is partition invariant in %s',mode=>{
    const values=[3,7,12,96].map(n=>steady(mode,n));
    values.forEach(v=>expect(v).toBeCloseTo(values[0],12));
  });
});
