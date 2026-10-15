import {describe,it,expect} from 'vitest';
import {World} from '../src/physics/world.js';
import {correctiveGripResultValid} from '../src/physics/corrective-grip.js';
import {recoveryFixture,watchRecoveryInput,type RecoveryGripInput} from '../scripts/diag/physics/grip-recovery-input.js';
import {recoverySpanInterval,recoverySpanReference,recoverySpanDifference} from '../scripts/diag/physics/grip-recovery-span.js';
const inputs=()=>{const out:Array<{history:string;phase:number;q:RecoveryGripInput}>=[];
  for(const history of ['previous','transition'])for(const phase of [0,23]){const v=recoveryFixture(history,phase);let q!:RecoveryGripInput;
    watchRecoveryInput(v.w,input=>q=input);v.w.integrateSubstep(...v.args);out.push({history,phase,q});}return out;};
const cases=inputs(),state=(v:ReturnType<typeof recoveryFixture>)=>({bodies:v.w.bodies,joints:v.w.joints,attachment:v.w.attachments.get(v.w.joints[0])});
describe('one actual corrective-foot request, separate experimental World boundary',()=>{
  it.each(cases)('keeps actual allocation and converges an independent moving reference: $history/$phase',({q,history,phase})=>{
    const r=recoverySpanInterval(q),lo=recoverySpanReference(q,1024),hi=recoverySpanReference(q,2048);
    expect(recoverySpanDifference(lo,hi)).toBeLessThanOrEqual(1/16);expect(recoverySpanDifference(r,hi)).toBeLessThanOrEqual(1/16);
    expect(correctiveGripResultValid(q,r)).toBe(true);expect(r.reelDose).toBe(0);expect(r.normalDose).toBe(0);
    expect(r.positiveMotorWork).toBeLessThanOrEqual(r.motorWorkBudget+1e-12);expect(r.viscousWork).toBeLessThan(0);
    const a=recoveryFixture(history,phase),b=recoveryFixture(history,phase);for(const v of [a,b])delete v.w.activeGrip;
    a.w.correctiveGrip=recoverySpanInterval;b.w.correctiveGrip=(q:RecoveryGripInput)=>recoverySpanReference(q,2048);
    a.w.integrateSubstep(...a.args);b.w.integrateSubstep(...b.args);
    expect(a.w.report.correctiveGrip.accepted).toBe(1);expect(b.w.report.correctiveGrip.accepted).toBe(1);
    for(let i=0;i<2;i++){
      expect(Math.hypot(a.w.bodies[i].pos.x-b.w.bodies[i].pos.x,a.w.bodies[i].pos.y-b.w.bodies[i].pos.y)).toBeLessThan(5e-10/16);
      expect(Math.hypot(a.w.bodies[i].support.xi.x-b.w.bodies[i].support.xi.x,a.w.bodies[i].support.xi.y-b.w.bodies[i].support.xi.y)).toBeLessThan(5e-10/16);
    }
    const foot=a.w.joints[0].b.support.foot,expected={x:(r.footOffset.x-q.footOffset.x-q.desired.x*q.duration)/(q.mobility*q.duration),y:(r.footOffset.y-q.footOffset.y-q.desired.y*q.duration)/(q.mobility*q.duration)};
    expect(Math.hypot(foot.force.x-expected.x,foot.force.y-expected.y)).toBeLessThan(1e-9);
    expect(Math.abs(a.w.report.supportMotorWork[0]-b.w.report.supportMotorWork[0])).toBeLessThan(1e-9/16);
    expect(Math.abs(a.w.report.work.grasps-b.w.report.work.grasps)).toBeLessThan(1e-9/16);
    expect(a.w.bodies.map((b:any)=>b.energy)).toEqual(b.w.bodies.map((b:any)=>b.energy));
  });
  it('separates active transfer from viscous dissipation and preserves the zero-command cap refusal',()=>{
    const q=cases[0].q,r=recoverySpanInterval(q);expect(r.motorWork).toBeGreaterThan(0);expect(r.correctionWork).toBeGreaterThan(r.motorWork);
    const zero=recoverySpanInterval({...q,desired:{x:0,y:0}});expect(zero.positiveMotorWork).toBe(0);expect(zero.motorWorkBudget).toBe(0);expect(zero.motorWork).toBeLessThan(0);
    expect(()=>recoverySpanInterval({...cases[3].q,desired:{x:0,y:0}})).toThrow('scope');
  });
  it('reflects the actual motor command, attachments, forces and work',()=>{
    const q=cases[2].q,m=structuredClone(q);
    for(const p of [m.a,m.b]){p.pos.y*=-1;p.vel.y*=-1;p.facing*=-1;p.spin*=-1;}
    m.material.y*=-1;m.footOffset.y*=-1;m.desired.y*=-1;for(const g of m.ground){g.force.y*=-1;g.target*=-1;}
    const a=recoverySpanInterval(q),b=recoverySpanInterval(m);
    expect(Math.hypot(a.b.pos.x-b.b.pos.x,a.b.pos.y+b.b.pos.y)).toBeLessThan(5e-10/16);
    expect(Math.abs(a.motorWork-b.motorWork)).toBeLessThan(1e-9/16);expect(Math.abs(a.positiveMotorWork-b.positiveMotorWork)).toBeLessThan(1e-9/16);
  });
  it('composes unequal intervals with one command, one motor work ledger and the correct impulse clock',()=>{
    const q=cases[2].q,whole=recoverySpanInterval(q),h=q.duration*.37,a=recoverySpanInterval({...q,duration:h}),H2=q.duration-h,
      b=recoverySpanInterval({...q,a:a.a,b:a.b,material:a.material,footOffset:a.footOffset,duration:H2}),combined={...b};
    for(const k of ['impulse','moment'] as const)combined[k]={x:a[k].x+b[k].x+(k==='moment'?H2*a.impulse.x:0),y:a[k].y+b[k].y+(k==='moment'?H2*a.impulse.y:0)};
    for(const k of ['angularImpulse','angularMoment','groundWork','groundYawImpulse','groundYawMoment','groundYawWork'] as const)
      combined[k]=a[k].map((v,i)=>v+b[k][i]+(k==='angularMoment'?H2*a.angularImpulse[i]:k==='groundYawMoment'?H2*a.groundYawImpulse[i]:0));
    for(const k of ['bodyWork','motorWork','passiveWork','springWork','dampingLoss','motorCrossWork','separateMotorWork','reelWork','reelDose','armCost','externalAngularImpulse','dose','normalImpulse','tangentImpulse','normalDose','tangentDose','correctionWork','viscousWork','positiveMotorWork','motorWorkBudget'] as const)combined[k]=a[k]+b[k];
    expect(recoverySpanDifference(whole,combined)).toBeLessThanOrEqual(1/16);
  });
  it('keeps a genuinely unloaded stationary hold finite at zero work and force',()=>{
    const q=structuredClone(cases[0].q);q.desired={x:0,y:0};for(const p of [q.a,q.b]){p.vel={x:0,y:0};p.spin=0;}
    for(const g of q.ground){g.force={x:0,y:0};g.acceleration=0;}
    const r=recoverySpanInterval(q);expect(r.dose).toBe(0);expect(r.motorWork).toBe(0);expect(r.positiveMotorWork).toBe(0);expect(r.bodyWork).toBe(0);
    expect(correctiveGripResultValid(q,r)).toBe(true);
  });
  it('rejects nonfinite commands and invalid positive-work counters',()=>{
    const q=cases[0].q,r=recoverySpanInterval(q);
    expect(correctiveGripResultValid({...q,desired:{x:NaN,y:0}},r)).toBe(false);
    expect(correctiveGripResultValid({...q,mobility:0},r)).toBe(false);
    expect(correctiveGripResultValid(q,{...r,positiveMotorWork:-1e-13})).toBe(false);
  });
  it.each(['undefined','work','budget','normal','multiple'] as const)('falls back atomically: %s',mode=>{
    const a=recoveryFixture(),b=recoveryFixture();for(const v of [a,b])delete v.w.activeGrip;
    a.w.correctiveGrip=(q:RecoveryGripInput)=>{if(mode==='undefined')return undefined;const r=recoverySpanInterval(q);
      return mode==='work'?{...r,correctionWork:r.correctionWork+1}:mode==='budget'?{...r,positiveMotorWork:r.motorWorkBudget+1}:mode==='normal'?{...r,normalDose:1}:r;};
    if(mode==='multiple')for(const v of [a,b])v.w.joints.push({...v.w.joints[0]});
    a.w.integrateSubstep(...a.args);b.w.integrateSubstep(...b.args);
    expect(a.w.report.correctiveGrip.accepted).toBe(0);expect(state(a)).toEqual(state(b));
    const {correctiveGrip,...plain}=a.w.report;expect(plain).toEqual(b.w.report);
  });
  it('applies dose, work and native tick fatigue once with a refining reference',()=>{
    const a=recoveryFixture(),b=recoveryFixture();for(const v of [a,b]){delete v.w.activeGrip;v.w.substeps=1;}
    a.w.correctiveGrip=recoverySpanInterval;b.w.correctiveGrip=(q:RecoveryGripInput)=>recoverySpanReference(q,2048);
    const r=a.w.step(a.args[1],a.args[3]),s=b.w.step(b.args[1],b.args[3]);
    expect(r.correctiveGrip.accepted).toBe(1);expect(s.correctiveGrip.accepted).toBe(1);expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
    expect(a.w.joints[0].force*a.args[3]).toBeCloseTo(r.correctiveGrip.dose,12);
    for(let i=0;i<2;i++)expect(a.w.bodies[i].energy).toBeCloseTo(b.w.bodies[i].energy,12);
  });
  it('requires a separate compatible opt-in and keeps defaults absent',()=>{
    expect(Object.hasOwn(new World([]),'correctiveGrip')).toBe(false);
    expect(()=>new World([],{correctiveGrip:recoverySpanInterval})).toThrow('sole callback');
  });
});
