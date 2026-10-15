import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {coupleHandYaw,type CoupledYawMotor} from '../src/physics/coupled-hand-yaw.js';
import {World} from '../src/physics/world.js';
import {reflectWitness,replayKeeper,stateError,type KeeperWitness} from '../scripts/diag/physics/keeper-contact-law.js';
const packet=JSON.parse(readFileSync('config/current-contact-first-interval.json','utf8'));
const input:KeeperWitness=packet.witness;
const reference=JSON.parse(readFileSync('data/reviews/current/current-contact-yaw.json','utf8')).refinement.at(-1);
const run=(w:KeeperWitness,coupling:'split'|'hands',n=12)=>replayKeeper(w,'patch',{groundMovement:'legacy',groundYawCoupling:coupling,substeps:n});
const errors=(bs:any[])=>({facing:Math.max(...bs.map((b,i)=>Math.abs(b.facing-reference.facing[i]))),spin:Math.max(...bs.map((b,i)=>Math.abs(b.spin-reference.spin[i])))});

describe('bounded simultaneous passive hands and legacy ground yaw',()=>{
 it('uses ground reaction to hold requested spin without extra hand force',()=>{
  const a:CoupledYawMotor={spin:0,inertia:4,arm:.5,demand:0,limit:100},b={...a,inertia:6,arm:.7};
  const r=coupleHandYaw(a,b,2,.15,50);
  expect(r.tangent).toBeCloseTo(-2/.15,12);expect(r.groundA).toBeCloseTo(a.arm*r.tangent,12);
  expect(r.groundB).toBeCloseTo(b.arm*r.tangent,12);
 });
 it('retains angular effective mass when ground torque is exhausted',()=>{
  const a={spin:0,inertia:4,arm:.5,demand:3,limit:0},b={...a,inertia:6,arm:.7};
  const r=coupleHandYaw(a,b,2,.15,50);
  expect(r.tangent).toBeCloseTo(-2/(.15+.5**2/4+.7**2/6),12);expect(r.groundA).toBeCloseTo(0,12);expect(r.groundB).toBeCloseTo(0,12);
 });
 it('slips at finite hand capacity rather than forcing a zero endpoint slip',()=>{
  const a={spin:0,inertia:4,arm:.5,demand:0,limit:100},b={...a,inertia:6,arm:.7};
  expect(coupleHandYaw(a,b,2,.15,.3).tangent).toBe(-.3);
  expect(coupleHandYaw(a,b,2,.15,0).tangent).toBeCloseTo(0,12);
 });
 it('resolves unequal motor-cap transitions against an independent bounded root',()=>{
  const a={spin:.7,inertia:4,arm:.5,demand:1,limit:.3},b={spin:-.4,inertia:6,arm:.7,demand:-.5,limit:.2};
  for(const com of [-3,-.15,0,.2,3]){
   const cap=(x:number,l:number)=>Math.max(-l,Math.min(l,x));
   const slip=(j:number)=>com+.15*j-.5*(a.spin+(cap(a.demand+.5*j,a.limit)-.5*j)/a.inertia)
    -.7*(b.spin+(cap(b.demand+.7*j,b.limit)-.7*j)/b.inertia);
   let lo=-2,hi=2;for(let k=0;k<80;k++){const mid=(lo+hi)/2;if(slip(mid)>0)hi=mid;else lo=mid;}
   const r=coupleHandYaw(a,b,com,.15,2);expect(r.tangent).toBeCloseTo((lo+hi)/2,11);
   expect(Math.abs(r.groundA)).toBeLessThanOrEqual(a.limit);expect(Math.abs(r.groundB)).toBeLessThanOrEqual(b.limit);
  }
 });
 it('preserves both original native endpoints with coupling disabled',()=>{
  expect(stateError(replayKeeper(input,'center',{substeps:12}).bodies,input.expectedAfter)).toBe(0);
  expect(stateError(run(input,'split').bodies,packet.expectedIsolated)).toBe(0);
 });
 it('reduces native facing and spin discrepancy against the retained refinement without changing budgets',()=>{
  const old=run(input,'split'),current=run(input,'hands'),a=errors(old.bodies),b=errors(current.bodies);
  expect(b.facing).toBeLessThan(a.facing/4);expect(b.spin).toBeLessThan(a.spin/4);
  const r=current.reports[0];expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);expect(r.work.hands).toBeLessThanOrEqual(1e-9);
  r.armImpulse.forEach((v,i)=>expect(v).toBeLessThanOrEqual(r.armImpulseLimit[i]+1e-9));
  r.armWork.forEach((v,i)=>expect(v).toBeLessThanOrEqual(r.armWorkLimit[i]+1e-9));
 });
 it('has the reflected response under unequal bodies and ground requests',()=>{
  const reflected=run(reflectWitness(input),'hands'),restored=reflectWitness({...input,beforeBodies:reflected.bodies});
  expect(stateError(run(input,'hands').bodies,restored.beforeBodies)).toBe(0);
 });
 it('returns to the split path without stale yaw when normal loading becomes active',()=>{
  const bodies=structuredClone(input.beforeBodies),world=new World(bodies,{handContact:'patch',groundMovement:'legacy',groundYawCoupling:'hands',substeps:12});world.time=input.t;
  world.joints=input.jointInputs.map(({a,b,actor,...rest})=>({...rest,a:bodies[a],b:bodies[b],actor:bodies[actor??a]}));
  world.step(input.intents,input.dt);
  const normal=world.joints[0];if(normal.kind!=='hands')throw Error('hands fixture');normal.extension=2;
  const copy=structuredClone(bodies),baseline=new World(copy,{handContact:'patch',groundMovement:'legacy',substeps:12});baseline.time=world.time;
  baseline.joints=[{...normal,a:copy[0],b:copy[1],actor:copy[0]}];
  const a=world.step(input.intents,input.dt),b=baseline.step(input.intents,input.dt);
  expect(bodies).toEqual(copy);expect(a).toEqual(b);
 });
 it.each(['no-hand','free','normal','material','multiple','torso','strike','falling','response','virtual-foot'] as const)('retains the existing path exactly for unsupported/inactive %s',kind=>{
  function scene(coupling:'split'|'hands'){
   const w=structuredClone(input);
   if(kind==='no-hand')for(const j of w.jointInputs)j.push=j.hold=j.steer=0;
   if(kind==='free')w.intents=w.beforeBodies.map(()=>({vel:{x:0,y:0},free:true}));
   if(kind==='normal')w.jointInputs[0].extension=2;
   if(kind==='material')w.jointInputs[0].contact={on:'b',local:{x:.1,y:0}};
   if(kind==='multiple'){const extra=structuredClone(w.beforeBodies[1]);extra.pos.y+=8;w.beforeBodies.push(extra);w.intents.push({vel:{x:0,y:0},free:true});w.jointInputs.push({...w.jointInputs[0],a:1,b:2});}
   if(kind==='torso')w.beforeBodies[1].pos={x:w.beforeBodies[0].pos.x+.4,y:w.beforeBodies[0].pos.y};
   if(kind==='falling'){w.beforeBodies[1].support!.state='falling';w.beforeBodies[1].support!.since=w.t;}
   const bodies=structuredClone(w.beforeBodies),world=new World(bodies,{handContact:'patch',groundMovement:kind==='response'?'response':'legacy',supportModel:kind==='virtual-foot'?'virtual-foot':'legacy',groundYawCoupling:coupling,substeps:12});world.time=w.t;
   world.joints=w.jointInputs.map(({a,b,actor,holder,...rest})=>({...rest,a:bodies[a],b:bodies[b],...(actor===undefined?{}:{actor:bodies[actor]}),...(holder===undefined?{}:{holder:bodies[holder]})}));
   if(kind==='strike')world.strike(bodies[0],bodies[1],{x:1,y:0});
   let invocations=0;const host=world as any,original=host.coupleGroundHandYaw;
   host.coupleGroundHandYaw=function(...args:any[]){const result=original.apply(this,args);if(result)invocations++;return result;};
   const report=world.step(w.intents,w.dt);return {bodies,report,invocations};
  }
  const old=scene('split'),current=scene('hands');expect(current.invocations).toBe(0);expect(current).toEqual(old);
 });
});
