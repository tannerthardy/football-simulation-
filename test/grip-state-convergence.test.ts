import {describe,expect,it} from 'vitest';
import {World,type GraspJoint} from '../src/physics/world.js';
import {newSupport} from '../src/physics/support.js';
import type {Body} from '../src/physics/kinematics.js';
import {advance,difference,snapshot,restore,resolveGripInterval} from '../src/physics/grip-timing.js';
import {resolveFastGripInterval} from '../src/physics/grip-fast.js';
import {LEG_SLIDE} from '../src/physics/grip-sliding.js';

const profile={massKg:100,radius:.3,reach:1.6,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,
  turnRate:8,backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,
  power:100,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9};
function states() {
  const bodies:Body[]=[0,1].map(x=>({pos:{x,y:0},vel:{x:.2,y:0},facing:0,spin:0,energy:1,
    profile:{...profile},support:newSupport()}));
  const w:any=new World(bodies,{handContact:'patch',gripTiming:'midpoint'});
  w.joints.push({kind:'grasp',a:bodies[0],b:bodies[1],legs:.25,capacity:500,reach:1.6,hold:1,pull:0} as GraspJoint);
  w.step(bodies.map(()=>({vel:{x:0,y:0},free:true})),.01);
  const copy=()=>restore(snapshot(w,[]),World.prototype).w;
  return {a:copy(),b:copy()};
}

// An analytic phase-clock witness, not a football/contact operator. It isolates
// the refinement policy: poses/points/work agree while two grids alias a slide.
class Clock {
  time=0;
  bodies=[0,1].map(x=>({pos:{x,y:0},vel:{x:0,y:0},facing:0,spin:0,
    profile:{radius:.3},support:{state:'up'}}));
  mass=[100,100];inertia=[10,10];
  joints:any[]=[];attachments=new WeakMap();
  report={work:{hands:0,grasps:0,strikes:0,contacts:0},supportMotorWork:[0,0],passiveGraspWork:0};
  constructor(public duration=.05/12,count=1) {
    for(let k=0;k<count;k++)this.joints.push({kind:'grasp',a:this.bodies[0],b:this.bodies[1],
      capacity:500,reach:1.6,hold:1,legs:.17,force:0});
  }
  indexOf(b:object){return this.bodies.indexOf(b as typeof this.bodies[0]);}
  gripCapacity(j:any){return j.capacity;}
  graspPoint(j:any){return j.b.pos;}
}
const clockArgs=(w:Clock)=>[[0,1],[],[],w.duration,w.duration,w.report,new Map(),true];
function tickClock(w:Clock,args:any[]) {
  const h=args[3];w.time+=h;
  for(const j of w.joints){j.slipping=w.time<w.duration*.55599;
    if(j.slipping)j.legs+=(1-j.legs)*(1-Math.exp(-h/.3));
    j.force+=h;}
}
const exactShare=(w:Clock)=>1-(1-.17)*Math.exp(-w.duration*.55599/.3);

describe('grip refinement observes persistent state and phase uncertainty',()=>{
  it('accepts identical acquired states',()=>{
    const {a,b}=states();expect(difference(a,b,[0,1])).toBe(0);
  });
  it('does not let a bounded point hide common-foot displacement',()=>{
    const {a,b}=states(),j=b.joints[0],foot=j.b.support.foot,point=b.graspPoint(j);
    foot.offset.y+=1e-6;foot.anchor.y+=1e-6;
    expect(b.graspPoint(j)).toEqual(point);
    expect(difference(a,b,[0,1])).toBeGreaterThan(1);
  });
  it('checks legs even when recovery coupling and attachment point stay fixed',()=>{
    const {a,b}=states();a.joints[0].recoveryCoupling=b.joints[0].recoveryCoupling=.25;
    b.joints[0].legs+=2e-6;
    expect(a.graspPoint(a.joints[0])).toEqual(b.graspPoint(b.joints[0]));
    expect(difference(a,b,[0,1])).toBeGreaterThan(1);
  });
  it('checks effective coupling separately from the physical legs value',()=>{
    const {a,b}=states();b.joints[0].recoveryCoupling=.250002;
    expect(difference(a,b,[0,1])).toBeGreaterThan(1);
  });
  it('checks stored attachment share for subsequent material transport',()=>{
    const {a,b}=states();b.attachments.get(b.joints[0]).share+=2e-6;
    expect(difference(a,b,[0,1])).toBeGreaterThan(1);
  });
  it('does not let a saturated bounded map hide material coordinate error',()=>{
    const {a,b}=states();
    for(const w of [a,b]){w.attachments.get(w.joints[0]).material={x:40,y:0};w.attachments.get(w.joints[0]).geometry=undefined;}
    b.attachments.get(b.joints[0]).material.x+=1e-5;
    expect(a.graspPoint(a.joints[0])).toEqual(b.graspPoint(b.joints[0]));
    expect(difference(a,b,[0,1])).toBeGreaterThan(1);
  });
  it('checks the hold length that selects subsequent tension',()=>{
    const {a,b}=states();b.joints[0].hold+=1e-6;
    expect(difference(a,b,[0,1])).toBeGreaterThan(1);
  });
  it('rejects foot lifecycle, attachment topology and nonfinite state',()=>{
    for(const change of [(b:any)=>delete b.joints[0].b.support.foot,
      (b:any)=>b.joints[0].b.support.foot.state=b.joints[0].b.support.foot.state==='unloaded'?'placing':'unloaded',
      (b:any)=>b.attachments.delete(b.joints[0]),
      (b:any)=>b.joints[0].b.support.foot.offset.x=NaN]){
      const {a,b}=states();change(b);expect(difference(a,b,[0,1])).toBeGreaterThan(1);
    }
  });
  it('rejects matching dyadic endpoints when the slide time is unresolved',()=>{
    const coarse=new Clock(),fine=new Clock();
    for(const [w,n] of [[coarse,256],[fine,512]] as const)
      for(let k=0;k<n;k++){const args=clockArgs(w);args[3]=w.duration/n;tickClock(w,args);}
    expect(coarse.joints[0].legs).toBeCloseTo(fine.joints[0].legs,12);
    expect(Math.abs(fine.joints[0].legs-exactShare(fine))).toBeGreaterThan(1e-5);
    const w=new Clock(),r=resolveGripInterval(w,clockArgs(w),tickClock);
    expect(Math.abs(w.joints[0].legs-exactShare(w))).toBeLessThan(1e-6);
    expect(r.limited).toBe(0);expect(r.maxAcceptedError).toBeLessThanOrEqual(1);
  });
  it('bounds uncertainty per grip without charging independent grips twice',()=>{
    const a=new Clock(),b=new Clock(undefined,2);
    const x=resolveGripInterval(a,clockArgs(a),tickClock),y=resolveGripInterval(b,clockArgs(b),tickClock);
    expect(x.intervals).toBe(y.intervals);expect(x.maxAcceptedError).toBe(y.maxAcceptedError);
    expect(b.joints.every(j=>Math.abs(j.legs-exactShare(b))<1e-6)).toBe(true);
  });
  it('retains the preceding force sample width when the next piece is shorter',()=>{
    const w=new Clock(),q=restore(snapshot(w,clockArgs(w)),Clock.prototype);
    const first=.00226,second=.00012;
    advance(q.w,q.args,first,w.duration,tickClock);
    advance(q.w,q.args,second,w.duration-first,tickClock);
    // The force-midpoint gap spans half of both widths, not just the short
    // piece. Possible slide times in that bracket must remain distinguishable.
    const frameGap=(first+second)/2;
    const required=(1-.17)*(1-Math.exp(-frameGap/.3))/1e-6;
    expect(difference(q.w,q.w,[0,1])).toBeGreaterThanOrEqual(required);
  });
  it('reports exhaustion rather than false convergence at the unchanged cap',()=>{
    const w=new Clock(.05),r=resolveGripInterval(w,clockArgs(w),tickClock);
    expect(r.intervals).toBe(16384);expect(r.limited).toBe(1);expect(r.maxAcceptedError).toBeGreaterThan(1);
  });
  it('keeps the fast fallback on the same state-aware acceptance contract',()=>{
    const w=new Clock(),r=resolveFastGripInterval(w,clockArgs(w),tickClock,undefined,4);
    expect(r.fallbacks).toBe(1);expect(r.limited).toBe(0);
    expect(Math.abs(w.joints[0].legs-exactShare(w))).toBeLessThan(1e-6);
    expect(w.time).toBeCloseTo(w.duration,12);
    expect(w.joints[0].force).toBeCloseTo(w.duration,12);
  });
  it('shares the unchanged slide time with the physical World law',()=>expect(LEG_SLIDE).toBe(.3));
});
