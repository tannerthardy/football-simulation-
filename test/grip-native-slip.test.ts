import {describe,it,expect} from 'vitest';
import {activeGripResultValid,type ActiveGripInput} from '../src/physics/active-grip.js';
import {LEG_SLIDE} from '../src/physics/grip-sliding.js';
import {nativeForceFixture} from '../scripts/diag/physics/grip-native-world-fixtures.js';
import {nativeSlipInterval,nativeSlipReference,nativeSlipDifference,nativeTransitionInterval} from '../scripts/diag/physics/grip-native-slip.js';
import {nativeSpanInterval} from '../scripts/diag/physics/grip-native-span-interval.js';
import {nativeSpanDifference} from '../scripts/diag/physics/grip-native-span-model.js';
function acquiredInput(){let q!:ActiveGripInput;nativeForceFixture(undefined,0,'combined',input=>{q=input;return undefined;}).advance();return q;}
const state=(v:ReturnType<typeof nativeForceFixture>)=>({bodies:v.w.bodies,joint:{...v.joint,a:undefined,b:undefined},attachment:v.w.attachments.get(v.joint)});
describe('native tangent cap/slip transition, unchanged capacities and support laws',()=>{
  it('converges an independent force/RK4 reference through both full-state events',()=>{
    const q={...acquiredInput(),duration:.05/12},a=nativeSlipInterval(q),lo=nativeSlipReference(q,2048),hi=nativeSlipReference(q,4096);
    expect(nativeSlipDifference(lo,hi)).toBeLessThanOrEqual(1/16);expect(nativeSlipDifference(a,hi)).toBeLessThanOrEqual(1/16);
    expect(a.events.map(e=>e.kind)).toEqual(['cap','slide']);expect(a.events[0].time).toBeLessThan(a.events[1].time);
    expect(a.slideTime).toBe(a.events[1].time);expect(a.slipping).toBe(false);
    expect(a.legs).toBeCloseTo(1-(1-q.legs)*Math.exp(-a.slideTime/LEG_SLIDE),13);
    expect(a.maximumCapacityRatio).toBeLessThanOrEqual(1+1e-14);expect(a.reelDose).toBe(0);expect(a.springEnergy).toBe(0);
    expect(activeGripResultValid(q,a)).toBe(true);expect(Math.abs(a.energyResidual)).toBeLessThan(1e-8);
  });
  it.each([{id:'patch-45-8-0-3001-1',phase:0},{id:'patch-0-3-0-3001-1',phase:0},{id:'patch-45-8-0-4001-1',phase:16}])
    ('converges the affected native continuation, support, height-weighted load and work: $id',({id,phase})=>{
      const run=(n?:number)=>{const trace:any[]=[];const v=nativeForceFixture(id,phase,'combined',q=>{const r=nativeTransitionInterval(q,n,true);trace.push(r);return r;});v.advance(16);return {v,trace};},a=run(),lo=run(1024),hi=run(2048);
      for(const s of [a,lo,hi]){expect(s.v.w.report.activeGrip.accepted).toBe(16);expect(s.v.w.report.activeGrip.fallbacks).toBe(0);}
      for(const [u,v] of [[lo,hi],[a,hi]]){
        for(let i=0;i<16;i++){
          const x=u.trace[i],y=v.trace[i];expect(x.tangentSlip?nativeSlipDifference(x,y):nativeSpanDifference(x,y)).toBeLessThanOrEqual(1/16);
        }
        for(let i=0;i<2;i++){
          const x=u.v.w.bodies[i],y=v.v.w.bodies[i];expect(Math.hypot(x.pos.x-y.pos.x,x.pos.y-y.pos.y)).toBeLessThan(5e-10/16);
          expect(Math.hypot(x.support.xi.x-y.support.xi.x,x.support.xi.y-y.support.xi.y)).toBeLessThan(5e-10/16);
          expect(Math.hypot(x.support.feltTip.x-y.support.feltTip.x,x.support.feltTip.y-y.support.feltTip.y)).toBeLessThan(5e-10/16);
        }
        expect(Math.abs(u.v.w.report.work.grasps-v.v.w.report.work.grasps)).toBeLessThan(1e-9/16);
        expect(Math.abs(u.v.w.report.armWork[1]-v.v.w.report.armWork[1])).toBeLessThan(1e-9/16);
        expect(Math.abs(u.v.joint.legs-v.v.joint.legs)).toBeLessThan(1e-12);
      }
      if(phase===0&&id.includes('45')){expect(a.trace.flatMap(r=>r.events).map(e=>e.kind)).toEqual(['cap','slide']);expect(a.trace.some(r=>r.reelDose>0)).toBe(true);}
    });
  it('applies slide share, force dose, work and tick effort exactly once',()=>{
    const a=nativeForceFixture(undefined,0,'combined',nativeTransitionInterval),b=nativeForceFixture(undefined,0,'combined',q=>nativeSlipReference(q,2048));
    const q=acquiredInput();for(const v of [a,b])v.w.substeps=1;
    const energy=a.w.bodies.map((b:any)=>b.energy),r=a.w.step(a.args[1],a.H);b.w.step(b.args[1],b.H);
    expect(r.activeGrip.accepted).toBe(1);expect(a.joint.slipping).toBe(true);
    expect(a.joint.legs).toBeCloseTo(1-(1-q.legs)*Math.exp(-a.H/LEG_SLIDE),13);
    expect(a.joint.force*a.H).toBeCloseTo(r.activeGrip.dose,12);expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
    for(let i=0;i<2;i++){expect(a.w.bodies[i].energy).toBeCloseTo(b.w.bodies[i].energy,12);expect(a.w.bodies[i].energy).toBeLessThan(energy[i]);}
  });
  it('keeps the verified below-slip numerical path unchanged',()=>{
    let input!:ActiveGripInput;nativeForceFixture(undefined,16,'combined',q=>{input=q;return undefined;}).advance();
    expect(nativeTransitionInterval(input)).toEqual(nativeSpanInterval(input));
  });
  it('delivers the integrated force-height moment to support, rather than using endpoint height',()=>{
    let motion!:ReturnType<typeof nativeSlipInterval>;const v=nativeForceFixture(undefined,0,'combined',q=>motion=nativeSlipInterval(q)),w=v.w,
      i=w.indexOf(v.joint.a),j=w.indexOf(v.joint.b),beforeLegs=v.joint.legs,original=w.tryActiveGrip;let checked=false;
    w.tryActiveGrip=function(...args:any[]){
      const before={tip:[this.tipX[i],this.tipY[i]],trip:[this.tripX[j],this.tripY[j]]},out=original.apply(this,args);
      const I=motion.impulse,L=motion.tangentSlip.legImpulse,ci=this.comHeight[i],cj=this.comHeight[j],z={x:cj*(I.x-.55*L.x),y:cj*(I.y-.55*L.y)},
        expectedI={x:-(z.x-ci*I.x)*ci/this.sp[i].pitchRadiusSq/this.mass[i],y:-(z.y-ci*I.y)*ci/this.sp[i].pitchRadiusSq/this.mass[i]},
        expectedJ={x:(z.x-cj*I.x)*cj/this.sp[j].pitchRadiusSq/this.mass[j],y:(z.y-cj*I.y)*cj/this.sp[j].pitchRadiusSq/this.mass[j]};
      expect(Math.hypot(this.tipX[i]-before.tip[0]-expectedI.x,this.tipY[i]-before.tip[1]-expectedI.y)).toBeLessThan(1e-12);
      expect(Math.hypot(this.tripX[j]-before.trip[0]-expectedJ.x,this.tripY[j]-before.trip[1]-expectedJ.y)).toBeLessThan(1e-12);
      expect(Math.hypot(z.x-cj*(1-.55*beforeLegs)*I.x,z.y-cj*(1-.55*beforeLegs)*I.y)).toBeGreaterThan(1e-9);
      checked=true;return out;
    };
    v.advance();expect(checked).toBe(true);expect(w.report.activeGrip.accepted).toBe(1);
  });
  it('preserves mirrored events, changing share, attachment work and force height',()=>{
    const q={...acquiredInput(),duration:.05/12},mirror=structuredClone(q);
    for(const p of [mirror.a,mirror.b]){p.pos.y*=-1;p.vel.y*=-1;p.facing*=-1;p.spin*=-1;}
    mirror.material.y*=-1;mirror.footOffset.y*=-1;
    for(const g of mirror.ground){g.force.y*=-1;g.target*=-1;}
    const a=nativeSlipInterval(q),b=nativeSlipInterval(mirror);
    expect(Math.hypot(a.b.pos.x-b.b.pos.x,a.b.pos.y+b.b.pos.y)).toBeLessThan(5e-10/16);
    expect(Math.abs(a.bodyWork-b.bodyWork)).toBeLessThan(1e-9/16);expect(Math.abs(a.legs-b.legs)).toBeLessThan(1e-12);
    expect(Math.abs(a.tangentSlip.legImpulse.x-b.tangentSlip.legImpulse.x)).toBeLessThan(1e-9/16);
    expect(Math.abs(a.tangentSlip.legImpulse.y+b.tangentSlip.legImpulse.y)).toBeLessThan(1e-9/16);
    for(let i=0;i<a.events.length;i++)expect(Math.abs(a.events[i].time-b.events[i].time)).toBeLessThan(1e-12/16);
  });
  it('composes unequal partitions across cap/slide without duplicating impulse moment or work',()=>{
    const q={...acquiredInput(),duration:.05/12},whole=nativeSlipInterval(q),h=q.duration*.53,a=nativeSlipInterval({...q,duration:h}),H2=q.duration-h,
      b=nativeSlipInterval({...q,a:a.a,b:a.b,material:a.material,footOffset:a.footOffset,legs:a.legs,duration:H2}),combined={...b};
    for(const k of ['impulse','moment'] as const)combined[k]={x:a[k].x+b[k].x+(k==='moment'?H2*a.impulse.x:0),y:a[k].y+b[k].y+(k==='moment'?H2*a.impulse.y:0)};
    for(const k of ['angularImpulse','angularMoment','groundWork','groundYawImpulse','groundYawMoment','groundYawWork'] as const)
      combined[k]=a[k].map((v,i)=>v+b[k][i]+(k==='angularMoment'?H2*a.angularImpulse[i]:k==='groundYawMoment'?H2*a.groundYawImpulse[i]:0));
    for(const k of ['bodyWork','motorWork','passiveWork','springWork','dampingLoss','motorCrossWork','separateMotorWork','reelWork','reelDose','armCost','externalAngularImpulse','dose','normalImpulse','tangentImpulse','normalDose','tangentDose'] as const)combined[k]=a[k]+b[k];
    combined.slideTime=a.slideTime+b.slideTime;combined.tangentSlip={time:combined.slideTime,legImpulse:{x:a.tangentSlip.legImpulse.x+b.tangentSlip.legImpulse.x,y:a.tangentSlip.legImpulse.y+b.tangentSlip.legImpulse.y}};
    combined.events=[...a.events,...b.events.map(e=>({...e,time:e.time+h}))];combined.initialSpringEnergy=a.initialSpringEnergy;
    expect(nativeSlipDifference(whole,combined)).toBeLessThanOrEqual(1/16);
  });
  it.each(['bad-slide','bad-share','bad-height-dose','multiple','normal-reel'] as const)('refuses unsupported or invalid transitions atomically: %s',mode=>{
    const a=nativeForceFixture(undefined,0,'combined',q=>{
      if(mode==='normal-reel')return nativeSlipInterval({...q,a:{...q.a,vel:{x:0,y:20}}});
      const r=nativeSlipInterval(q);return mode==='bad-slide'?{...r,tangentSlip:{...r.tangentSlip,time:q.duration*2}}:mode==='bad-share'?{...r,legs:r.legs+.01}:
        mode==='bad-height-dose'?{...r,tangentSlip:{...r.tangentSlip,legImpulse:{x:1e10,y:0}}}:r;
    }),b=nativeForceFixture(undefined,0,'owned');
    if(mode==='multiple'){a.w.joints.push({...a.joint});b.w.joints.push({...b.joint});}
    const r=a.advance(),s=b.advance();expect(r.activeGrip.accepted).toBe(0);expect(r.activeGrip.fallbacks).toBe(1);expect(state(a)).toEqual(state(b));
    const {activeGrip,...rest}=r;expect(rest).toEqual(s);
  });
});
