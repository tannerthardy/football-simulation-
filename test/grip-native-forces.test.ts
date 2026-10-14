import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {World} from '../src/physics/world.js';
import {activeGripResultValid,type ActiveGripInput} from '../src/physics/active-grip.js';
import {nativeForceFixture} from '../scripts/diag/physics/grip-native-world-fixtures.js';
import {nativeSpanInterval} from '../scripts/diag/physics/grip-native-span-interval.js';
import {nativeSpanReference} from '../scripts/diag/physics/grip-native-span-reference.js';
import {nativeCenteredReference} from '../scripts/diag/physics/grip-native-centered-reference.js';
import {nativeSpanDifference} from '../scripts/diag/physics/grip-native-span-model.js';
const cases=JSON.parse(readFileSync('config/grip-native-force-inputs.json','utf8')).cases as Array<{id:string;phase:number;input:ActiveGripInput}>;
const strip=(r:any)=>{const {activeGrip,...rest}=r;return rest;};
const state=(v:ReturnType<typeof nativeForceFixture>)=>({bodies:v.w.bodies,point:v.w.graspPoint(v.joint),joint:{...v.joint,a:undefined,b:undefined},attachment:v.w.attachments.get(v.joint)});
describe('existing native reel and ground on one experimental force clock',()=>{
  it.each(cases)('keeps exact issued requests and a converged independent force/RK4 reference: $id',c=>{
    let input:ActiveGripInput|undefined,motion:ReturnType<typeof nativeSpanInterval>|undefined;
    const a=nativeForceFixture(c.id,c.phase,'combined',q=>{input=q;return motion=nativeSpanInterval(q);}),report=a.advance();
    expect(input).toEqual(c.input);expect(report.activeGrip?.accepted).toBe(1);expect(motion).toBeDefined();
    const lo=nativeSpanReference(input!,1024),hi=nativeSpanReference(input!,2048);
    expect(nativeSpanDifference(lo,hi)).toBeLessThanOrEqual(1/16);expect(nativeSpanDifference(motion!,hi)).toBeLessThanOrEqual(1/16);
    const centeredLo=nativeCenteredReference(input!,1024),centeredHi=nativeCenteredReference(input!,2048);
    expect(nativeSpanDifference(centeredLo,centeredHi)).toBeLessThanOrEqual(1/16);
    expect(nativeSpanDifference(motion!,centeredHi)).toBeLessThanOrEqual(1/16);
    expect(activeGripResultValid(input!,centeredHi)).toBe(true);
    expect(activeGripResultValid(input!,motion!)).toBe(true);expect(motion!.armCost).toBeLessThanOrEqual(input!.armWorkRemaining);
    expect(motion!.reelDose).toBeLessThanOrEqual(input!.armCapacity*input!.duration);
    if(c.id.includes('45-8')){expect(motion!.reelDose).toBeGreaterThan(0);expect(Math.hypot(input!.ground[0].force.x,input!.ground[0].force.y)).toBeGreaterThan(0);}
    else expect(motion!.reelDose).toBe(0); // Closing frontal control needs no reel.
    const b=nativeForceFixture(c.id,c.phase,'combined',q=>nativeSpanReference(q,2048));b.advance();
    for(const idx of a.args[0]){
      expect(Math.hypot(a.w.bodies[idx].support.xi.x-b.w.bodies[idx].support.xi.x,a.w.bodies[idx].support.xi.y-b.w.bodies[idx].support.xi.y)).toBeLessThan(5e-10/16);
      expect(a.w.bodies[idx].energy).toBe(b.w.bodies[idx].energy);
    }
    expect(Math.abs(a.w.report.work.grasps-b.w.report.work.grasps)).toBeLessThan(1e-9/16);
    expect(Math.abs(a.w.report.supportMotorWork[a.w.indexOf(a.joint.b)]-b.w.report.supportMotorWork[b.w.indexOf(b.joint.b)])).toBeLessThan(1e-9/16);
  });
  it.each(['undefined','range','invalid-work','invalid-moment','arm-budget'] as const)('refuses without partially committing contact or ground: %s',mode=>{
    const a=nativeForceFixture(),b=nativeForceFixture(undefined,16,'owned');
    a.w.activeGrip=(q:ActiveGripInput)=>{if(mode==='undefined')return undefined;if(mode==='range')throw new RangeError('named unsupported phase');
      if(mode==='arm-budget')return nativeSpanInterval({...q,armWorkRemaining:0});
      const r=nativeSpanInterval(q);return mode==='invalid-work'?{...r,groundWork:[r.groundWork[0]+1,r.groundWork[1]]}:{...r,moment:{x:r.moment.x+.01,y:r.moment.y}};};
    const r=a.advance(),s=b.advance();expect(r.activeGrip.accepted).toBe(0);expect(r.activeGrip.fallbacks).toBe(1);
    expect(state(a)).toEqual(state(b));expect(strip(r)).toEqual(s);
  });
  it('retains cap/slip onset and multiple-contact fallbacks with actual requests',()=>{
    for(const graph of ['cap','multiple'] as const){const phase=graph==='cap'?0:16,a=nativeForceFixture(undefined,phase,'combined',nativeSpanInterval),b=nativeForceFixture(undefined,phase,'owned');
      if(graph==='multiple'){a.w.joints.push({...a.joint});b.w.joints.push({...b.joint});}
      const r=a.advance(),s=b.advance();expect(r.activeGrip.accepted).toBe(0);expect(r.activeGrip.fallbacks).toBe(1);
      expect(state(a)).toEqual(state(b));expect(strip(r)).toEqual(s);
    }
  });
  it('composes unequal partitions without duplicating reel, ground, impulse, temporal moment or work',()=>{
    const q=cases[0].input,whole=nativeSpanInterval(q),h=q.duration*.23,a=nativeSpanInterval({...q,duration:h}),H2=q.duration-h,
      b=nativeSpanInterval({...q,a:a.a,b:a.b,material:a.material,footOffset:a.footOffset,duration:H2}),combined={...b};
    for(const k of ['impulse','moment'] as const)combined[k]={x:a[k].x+b[k].x+(k==='moment'?H2*a.impulse.x:0),y:a[k].y+b[k].y+(k==='moment'?H2*a.impulse.y:0)};
    for(const k of ['angularImpulse','angularMoment','groundWork','groundYawImpulse','groundYawMoment','groundYawWork'] as const)
      combined[k]=a[k].map((v,i)=>v+b[k][i]+(k==='angularMoment'?H2*a.angularImpulse[i]:k==='groundYawMoment'?H2*a.groundYawImpulse[i]:0));
    for(const k of ['bodyWork','motorWork','passiveWork','springWork','dampingLoss','motorCrossWork','separateMotorWork','reelWork','reelDose','armCost','externalAngularImpulse','dose','normalImpulse','tangentImpulse','normalDose','tangentDose'] as const)combined[k]=a[k]+b[k];
    combined.initialSpringEnergy=a.initialSpringEnergy;
    expect(nativeSpanDifference(whole,combined)).toBeLessThanOrEqual(1/16);
  });
  it('does not reel at zero pull and reflects active geometry/ground/yaw without adding capacities',()=>{
    const q=structuredClone(cases[0].input);q.pullSpeed=0;
    const zero=nativeSpanInterval(q);expect(zero.reelDose).toBe(0);expect(zero.reelWork).toBe(0);expect(zero.armCost).toBe(0);
    const input=cases[0].input,mirror=structuredClone(input);
    for(const p of [mirror.a,mirror.b]){p.pos.y*=-1;p.vel.y*=-1;p.facing*=-1;p.spin*=-1;}
    mirror.material.y*=-1;mirror.footOffset.y*=-1;
    for(const g of mirror.ground){g.force.y*=-1;g.target*=-1;}
    const a=nativeSpanInterval(input),b=nativeSpanInterval(mirror);
    expect(Math.hypot(a.b.pos.x-b.b.pos.x,a.b.pos.y+b.b.pos.y)).toBeLessThan(5e-10/16);
    expect(Math.abs(a.bodyWork-b.bodyWork)).toBeLessThan(1e-9/16);expect(Math.abs(a.armCost-b.armCost)).toBeLessThan(1e-9/16);
    expect(Math.abs(a.angularImpulse[0]+b.angularImpulse[0])).toBeLessThan(1e-9/16);
  });
  it('keeps the callback absent from defaults and rejects incompatible hosts',()=>{
    const w=new World([]);expect(Object.hasOwn(w,'activeGrip')).toBe(false);
    expect(()=>new World([],{activeGrip:nativeSpanInterval})).toThrow('sole callback');
  });
  it('applies native tick fatigue and contact dose once despite many internal integration pieces',()=>{
    let pieces=0;const a=nativeForceFixture(undefined,16,'combined',q=>{const r=nativeSpanInterval(q);pieces+=r.partitions;return r;}),
      b=nativeForceFixture(undefined,16,'combined',q=>nativeSpanReference(q,2048));
    const energyBefore=a.w.bodies.map((b:any)=>b.energy);
    for(const v of [a,b])v.w.substeps=1;
    const r=a.w.step(a.args[1],a.H),s=b.w.step(b.args[1],b.H);
    expect(r.activeGrip.accepted).toBe(1);expect(pieces).toBeGreaterThan(1);expect(s.activeGrip.accepted).toBe(1);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
    expect(a.joint.force*a.H).toBeCloseTo(r.activeGrip.dose,12);
    for(const idx of a.args[0]){
      expect(a.w.bodies[idx].energy).toBeCloseTo(b.w.bodies[idx].energy,12);
      expect(a.w.bodies[idx].energy).toBeLessThan(energyBefore[idx]);
    }
  });
});
