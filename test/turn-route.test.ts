import {describe,it,expect} from 'vitest';
import {boundedArrival,turnRoute,signedAngle,arrivalReference,servoCruiseRate} from '../scripts/diag/physics/turn-route-model.js';
import {integrateYaw} from '../src/physics/yaw-response.js';
import {turnTask,turnTasks} from '../scripts/diag/physics/turn-route-task.js';
import {recoveryFixture} from '../scripts/diag/physics/grip-recovery-input.js';
import {World} from '../src/physics/world.js';
describe('experimental minimum-time orientation route, unchanged yaw law',()=>{
  it('forecasts the existing servo cruise from its periodic flow, without lowering the executed rate cap',()=>{
    for(const h of [.01,.05,.1]){
      let spin=0,total=0;for(let k=0;k<200;k++){const r=integrateYaw(8*h,spin,h,.05,1e6,8);spin=r.spin;if(k>=150)total+=r.angleDelta;}
      expect(servoCruiseRate(8,h,.05)).toBeCloseTo(total/(50*h),12);
    }
    expect(servoCruiseRate(8,.05,.05)).toBeCloseTo(8*(1-1/Math.E)**2,13);
  });
  it('matches an independent reachable-velocity envelope across acceleration, reversal and rate phases',()=>{
    for(const d of [-6.4,-3.14,-.1,0,.1,3.14,6.4])for(const w of [-3,-1.3,0,1.3,3])for(const a of [5,60])
      expect(Math.abs(boundedArrival(d,w,a,8)-arrivalReference(d,w,a,8))).toBeLessThan(1e-12);
  });
  it('respects mirrors and equivalent angles, preserves zero-spin shortest turns, and falls back without authority or at overspeed',()=>{
    for(const d of [-Math.PI-.01,-.3,0,.3,Math.PI+.01])for(const w of [-2,0,2]){
      const r=turnRoute(d,w,60,8),m=turnRoute(-d,-w,60,8),p=turnRoute(d+4*Math.PI,w,60,8);
      expect(r.delta).toBeCloseTo(-m.delta,13);expect(r.estimated).toBeCloseTo(m.estimated!,13);expect(r.delta).toBeCloseTo(p.delta,13);
      if(w===0)expect(r.delta).toBe(signedAngle(d));
    }
    for(const [a,r,w]of [[0,8,2],[60,0,2],[60,8,10]])expect(turnRoute(3.1,w,a,r).fallback).toBe(true);
    expect(()=>boundedArrival(1,0,-1,8)).toThrow('scope');
  });
  it('keeps spin-selected half-turns equivalent across heading representations, retaining genuine zero-spin ties',()=>{
    for(const error of [-.01,0,.01])for(const spin of [-1.3,1.3]){
      const original=turnRoute(Math.PI+error,spin,60,8);
      for(const wrap of [-2,-1,0,1,2]){
        const equivalent=turnRoute(Math.PI+error+wrap*2*Math.PI,spin,60,8);
        expect(equivalent.delta).toBeCloseTo(original.delta,12);
        expect(equivalent.estimated).toBeCloseTo(original.estimated!,12);
      }
      let requested:number|undefined;
      for(const bodyWrap of [-1,0,1])for(const targetWrap of [-1,0,1]){
        const v=recoveryFixture('previous'),body=v.w.bodies[0];v.w.turnChoice='arrival-time';
        body.facing=-Math.PI-error+bodyWrap*2*Math.PI;body.spin=spin;
        const intent={...v.args[1][0],facing:targetWrap*2*Math.PI},plan=v.w.plan(body,0,intent,.05);
        const displacement=plan.facing-body.facing;
        if(requested===undefined)requested=displacement;
        else expect(displacement).toBeCloseTo(requested,12);
      }
    }
    // With no spin at precisely pi, both routes are equally valid. Preserve
    // the established input-sign tie convention rather than forcing a side.
    const a=turnRoute(Math.PI,0,60,8),b=turnRoute(-Math.PI,0,60,8);
    expect(a.delta).toBe(Math.PI);expect(b.delta).toBe(-Math.PI);
    expect(a.estimated).toBe(b.estimated);
  });
  it('settles the saved half-turn sooner through the existing motor, retaining the genuine mirror',()=>{
    for(const id of ['saved-previous','mirror-previous','low-torque']){
      const c=turnTasks.find(c=>c.id===id)!,old=turnTask(c,'shortest'),r=turnTask(c,'arrival');
      expect(r.finish).not.toBeNull();expect(r.finish!).toBeLessThan(old.finish!);expect(r.absoluteWork).toBeLessThan(old.absoluteWork);
      expect(Math.abs(r.energyResidual)).toBeLessThan(1e-10);
    }
  });
  it.each([-1,1])('retains the adverse boundary control after forecasting servo cruise, side %s',side=>{
    const c={id:'retained adverse',facing:side*(-Math.PI+.25),spin:side*-2.5,target:0},a=turnTask(c,'shortest'),b=turnTask(c,'arrival');
    expect(b.finish).toBe(a.finish);expect(b.absoluteWork).toBe(a.absoluteWork);expect(b.final).toEqual(a.final);
  });
  it.each(['normal','incoming-toward','deliberate-reversal','changed-command','near-target','saved-transition'])('preserves the opposing controller task exactly: %s',id=>{
    const c=turnTasks.find(c=>c.id===id)!,a=turnTask(c,'shortest'),b=turnTask(c,'arrival');
    for(const k of ['finish','reversalTime','final','totalWork','absoluteWork','peak'] as const)expect(a[k]).toEqual(b[k]);
  });
  it('changes only the saved runner orientation plan, keeps default options absent and rejects an unsupported host',()=>{
    const a=recoveryFixture('previous'),b=recoveryFixture('previous');b.w.turnChoice='arrival-time';
    const p=a.w.plan(a.w.bodies[0],0,a.args[1][0],.05),q=b.w.plan(b.w.bodies[0],0,b.args[1][0],.05);
    expect(p.facing).toBeGreaterThan(a.w.bodies[0].facing);expect(q.facing).toBeLessThan(b.w.bodies[0].facing);
    expect({...p,facing:undefined}).toEqual({...q,facing:undefined});
    expect(Object.hasOwn(new World([]),'turnChoice')).toBe(false);
    expect(()=>new World([],{turnChoice:'arrival-time'})).toThrow('patch yaw');
  });
});
