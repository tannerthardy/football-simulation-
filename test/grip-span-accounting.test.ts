import {describe,it,expect} from 'vitest';
import {World} from '../src/physics/world.js';
import {newSupport} from '../src/physics/support.js';
import {gripSpring,radialSpanReference,withSpanReserve} from '../scripts/diag/physics/grip-span-accounting.js';
const profile={massKg:100,radius:.3,reach:1.6,heightYd:2,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,
  backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5};
function scene(extension:number,side=1){
  const bodies=[0,side].map(y=>({pos:{x:0,y},vel:{x:0,y:0},facing:0,spin:0,energy:1,profile:{...profile},support:newSupport(.2)})),
    w:any=new World(bodies,{substeps:8,handContact:'patch',constraintWork:'per-solve'}),
    j:any={kind:'grasp',a:bodies[0],b:bodies[1],reach:1.6,hold:1-extension,capacity:1000,legs:.6,pull:0};
  w.joints.push(j);
  const feet=w.feet;w.feet=function(i:number,...args:any[]){feet.call(this,i,...args);const f=this.bodies[i].support.foot;
    if(f){f.mobility=.003;f.desired={x:0,y:0};}};
  const run=()=>w.step(bodies.map(()=>({free:true,vel:{x:0,y:0}})),.000001);
  return {w,j,bodies,run};
}
describe('complete World stored-span accounting, narrow diagnostic',()=>{
  it('derives the existing physical normal spring, without changing capacity',()=>{
    const s=gripSpring(100,100);expect(s.stiffness).toBeCloseTo((2*Math.PI*6)**2/.02,10);
    expect(s.damping).toBeCloseTo(2*.8*2*Math.PI*6/.02,10);expect(()=>gripSpring(0,100)).toThrow('masses');
  });
  it('exposes zero force at rest despite positive stored extension, then funds the same target',()=>{
    const before=scene(.0001),after=scene(.0001),r=before.run(),a=withSpanReserve(after.w,after.run);
    expect(before.j.a.vel).toEqual({x:0,y:0});expect(before.j.b.vel).toEqual({x:0,y:0});
    expect(r.work.grasps).toBe(0);expect(after.j.b.vel.y).toBeLessThan(0);expect(after.j.a.vel.y).toBeGreaterThan(0);
    expect(after.j.capacity).toBe(1000);expect(a.result.armWork.every((v:number)=>v===0)).toBe(true);
    expect(a.credits).toHaveLength(8);for(const c of a.credits){expect(c.returned).toBeGreaterThan(0);expect(c.returned).toBeLessThan(c.energy);expect(c.net).toBeLessThan(0);}
    expect(Math.abs(a.result.work.residual)).toBeLessThan(1e-10);
  });
  it('preserves zero-extension control and mirrors the release',()=>{
    const a=scene(0),b=scene(0),normal=a.run(),funded=withSpanReserve(b.w,b.run).result;
    expect(b.bodies).toEqual(a.bodies);expect(funded).toEqual(normal);
    const left=scene(.0001),right=scene(.0001,-1);withSpanReserve(left.w,left.run);withSpanReserve(right.w,right.run);
    for(let k=0;k<2;k++){expect(left.bodies[k].vel.x).toBeCloseTo(right.bodies[k].vel.x,12);
      expect(left.bodies[k].vel.y).toBeCloseTo(-right.bodies[k].vel.y,12);expect(left.bodies[k].energy).toBe(right.bodies[k].energy);}
  });
  it('counts aggregate work and force dose once in the actual World step',()=>{
    const a=scene(.0001),build=a.w.jointRows,rows:any[]=[];
    a.w.jointRows=function(h:number){const r=build.call(this,h);rows.push(...r);return r;};
    const r=withSpanReserve(a.w,a.run).result;
    expect(rows).toHaveLength(8);
    const dose=rows.reduce((s,q)=>s+Math.hypot(q.ln-q.reel,q.lt),0),motor=r.supportMotorWork.reduce((s:number,v:number)=>s+v,0);
    expect(a.j.force*.000001).toBeCloseTo(dose,14);
    expect(r.passiveGraspWork).toBeCloseTo(r.work.grasps-motor,14);
    expect(r.passiveGraspWork).toBeGreaterThan(0);expect(Math.abs(r.work.residual)).toBeLessThan(1e-10);
  });
  it('independently closes kinetic + moving-material spring energy + damping against one motor',()=>{
    const input={massA:100,massB:110,capacity:1000,share:.6,mobility:.003,limit:1.1,
      separation:1,material:-.00003,hold:.9998,velocity:0,duration:.000001},a=radialSpanReference(input,32),b=radialSpanReference(input,64);
    expect(Math.abs(a.impulse-b.impulse)).toBeLessThan(1e-14);expect(Math.abs(a.energyResidual)).toBeLessThan(1e-12);
    expect(a.energy).toBeLessThan(a.initialEnergy);expect(a.dampingLoss).toBeGreaterThan(0);expect(a.bodyWork).toBeGreaterThan(0);
    expect(a.motorWork).toBeLessThan(0);expect(Math.abs(a.workResidual)).toBeLessThan(1e-16);
  });
  it('refuses active, multiple and long interval scope, restoring hooks after refusal',()=>{
    const a=scene(.0001),rows=a.w.jointRows,integrate=a.w.integrateInterval;a.j.pull=1;
    expect(()=>withSpanReserve(a.w,a.run)).toThrow('grip scope');a.j.pull=0;
    expect(()=>withSpanReserve(a.w,()=>a.w.step(a.bodies.map(()=>({free:true})),.01))).toThrow('interval scope');
    expect(a.w.jointRows).toBe(rows);expect(a.w.integrateInterval).toBe(integrate);
    a.w.joints.push({...a.j});expect(()=>withSpanReserve(a.w,a.run)).toThrow('operator scope');
  });
});
