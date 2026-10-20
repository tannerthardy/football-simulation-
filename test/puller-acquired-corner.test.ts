import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {goTo} from '../src/sim/behaviors/common.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
const inputs=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/puller-access-inputs.json.gz',import.meta.url))).toString());

function stage(mirror:boolean,obstructed=false,hiddenClose=false){
 const sim=new PlaySim(structuredClone(inputs.rows.find((r:{id:string})=>r.id==='K01').setup) as PlaySetup);
 const a=sim.slot('RT')!,controller=a.behavior as RunBlocker;
 if(mirror){
  const reflect=(y:number)=>2*sim.ballY-y;
  for(const p of sim.agents){p.body.pos.y=reflect(p.pos.y);p.body.vel.y*=-1;p.body.facing*=-1;}
  for(const spot of Object.values(sim.offAlign.spots))if(spot)spot.pos.y=reflect(spot.pos.y);
  sim.offAlign.strongSign*=-1;
  for(const point of controller.plan.pullPath!)point.y=reflect(point.y);
  controller.plan.drive.y*=-1;
 }
 const side=mirror?-1:1,flat=controller.plan.pullPath![1];
 // Initialize installed home stance before staging a physical flat-leg state.
 sim.t=.05;controller.update(a,sim);sim.t=2;
 a.body.pos={x:flat.x-(obstructed?.3:1),y:flat.y+side*.2};a.body.vel={x:0,y:side*2};
 Reflect.set(controller,'pullIdx',1);Object.defineProperty(a.mind,'placementError',{get:()=>0});
 const ordinary=sim.see.bind(sim),target=controller.plan.target!;
 sim.see=(observer,other,scale)=>{
  const seen=ordinary(observer,other,scale);
  if(observer!==a)return seen;
  if(other===target)return {...seen,pos:{x:43,y:flat.y+side*3},vel:{x:0,y:0}};
  return {...seen,pos:{x:obstructed?38:40,y:seen.pos.y},vel:{x:0,y:0}};
 };
 // Private movement cannot alter the same delivered picture.
 sim.slot('LG')!.body.pos={x:a.pos.x+(hiddenClose?.8:3),y:a.pos.y};
 const before=structuredClone(a.body),rng=JSON.stringify(sim.rng),command=controller.update(a,sim);
 expect(a.body).toEqual(before);expect(JSON.stringify(sim.rng)).toBe(rng);
 expect(a.engagement).toBeNull();expect(sim.world.joints).toHaveLength(0);
 return {sim,a,controller,command};
}

describe('one acquired rear surface governs the ordinary pull corner',()=>{
 it.each([false,true])('turns up after passing the lateral station at real clearance, mirror=%s',mirror=>{
  const f=stage(mirror);
  expect(Reflect.get(f.controller,'pullIdx')).toBe(2);
  expect(f.command).toEqual(goTo(f.a,f.controller.plan.pullPath![2],{speed:.95,through:0}));
  expect(f.command.vel.x).toBeGreaterThan(0);
 });
 it.each([false,true])('cannot use waypoint tolerance or passed y to bypass an acquired obstruction, mirror=%s',mirror=>{
  const f=stage(mirror,true);
  expect(Reflect.get(f.controller,'pullIdx')).toBe(1);
  expect(f.command.vel.x).toBeLessThan(0);
  expect(f.command.facing).toBeUndefined();
 });
 it.each([false,true])('private teammate movement cannot reinstate the retreat, mirror=%s',mirror=>{
  expect(stage(mirror,false,true).command).toEqual(stage(mirror,false,false).command);
 });
});
