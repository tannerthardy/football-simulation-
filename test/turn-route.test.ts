import {describe,it,expect} from 'vitest';
import {boundedArrival,turnRoute,signedAngle,arrivalReference} from '../scripts/diag/physics/turn-route-model.js';
import {turnTask,turnTasks} from '../scripts/diag/physics/turn-route-task.js';
import {recoveryFixture} from '../scripts/diag/physics/grip-recovery-input.js';
import {World} from '../src/physics/world.js';
describe('experimental minimum-time orientation route, unchanged yaw law',()=>{
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
  it('settles the saved half-turn sooner through the existing motor, retaining the genuine mirror',()=>{
    for(const id of ['saved-previous','mirror-previous','low-torque']){
      const c=turnTasks.find(c=>c.id===id)!,old=turnTask(c,'shortest'),r=turnTask(c,'arrival');
      expect(r.finish).not.toBeNull();expect(r.finish!).toBeLessThan(old.finish!);expect(r.absoluteWork).toBeLessThan(old.absoluteWork);
      expect(Math.abs(r.energyResidual)).toBeLessThan(1e-10);
    }
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
