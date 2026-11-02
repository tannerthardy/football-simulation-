import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {RunBlocker,pullTurnRadius} from '../src/sim/behaviors/blocking.js';
import {goTo} from '../src/sim/behaviors/common.js';
import {cornerSpeed} from '../src/physics/kinematics.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
const inputs=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/puller-access-inputs.json.gz',import.meta.url))).toString());

function stage(mirror:boolean,obstructed=false,hiddenClose=false,passedWall?:'sinking'|'closing'|'empty'|'remoteRear'|'closingRear'){
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
 a.body.pos={x:flat.x-(obstructed?.3:1),y:flat.y+side*(passedWall==='empty'?-2:.2)};a.body.vel={x:0,y:side*2};
 Reflect.set(controller,'pullIdx',1);Object.defineProperty(a.mind,'placementError',{get:()=>0});
 const ordinary=sim.see.bind(sim),target=controller.plan.target!;
 sim.see=(observer,other,scale)=>{
  const original=ordinary(observer,other,scale);
  const seen=mirror?{...original,pos:{x:original.pos.x,y:2*sim.ballY-original.pos.y},vel:{x:original.vel.x,y:-original.vel.y}}:original;
  if(observer!==a)return seen;
  if(other===target)return {...seen,pos:{x:43,y:flat.y+side*3},vel:{x:0,y:0}};
  if(passedWall==='remoteRear')return {...seen,pos:{x:8,y:seen.pos.y},vel:{x:0,y:0}};
  if(passedWall==='closingRear')return {...seen,pos:{x:a.pos.x-2,y:a.pos.y},vel:{x:12,y:0}};
  if(passedWall==='empty')return {...seen,pos:{x:38,y:a.pos.y-side*3},vel:{x:0,y:0}};
  if(passedWall && other.slot==='LG')return {...seen,
   pos:{x:38,y:a.pos.y-side*(passedWall==='closing'?1:2)},
   vel:{x:0,y:passedWall==='closing'?side*4.5:0}};
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
 it.each([false,true])('a remote rear lateral station cannot redirect the flat path, mirror=%s',mirror=>{
  const f=stage(mirror,false,false,'remoteRear');
  expect(Reflect.get(f.controller,'pullRead').clearanceX).toBeNull();
  expect(Reflect.get(f.controller,'pullIdx')).toBe(2);
  expect(f.command.vel.x).toBeGreaterThan(0);
 });
 it.each([false,true])('retains a rear body closing into the crossing path before the next read, mirror=%s',mirror=>{
  const f=stage(mirror,false,false,'closingRear');
  expect(Reflect.get(f.controller,'pullRead').clearanceX).not.toBeNull();
  expect(Reflect.get(f.controller,'pullIdx')).toBe(1);
  expect(f.command.vel.x).toBeLessThan(0);
 });
 it.each([false,true])('turns up after passing the lateral station at real clearance, mirror=%s',mirror=>{
  const f=stage(mirror);
  expect(Reflect.get(f.controller,'pullIdx')).toBe(2);
  // The wrapper runs through the hole on his upfield leg (not asked to stop on it).
  expect(f.command).toEqual(goTo(f.a,f.controller.plan.pullPath![2],{speed:.95,through:f.a.profile.vmax*.8}));
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
 it.each([false,true])('a passed sinking teammate cannot block an already clear corner, mirror=%s',mirror=>{
  const f=stage(mirror,false,false,'sinking');
  expect(Reflect.get(f.controller,'pullIdx')).toBe(2);
  expect(f.command).toEqual(stage(mirror).command);
 });
 it.each([false,true])('retains a passed body closing back into the crossing width before the next read, mirror=%s',mirror=>{
  const f=stage(mirror,false,false,'closing');
  expect(Reflect.get(f.controller,'pullIdx')).toBe(1);
  expect(f.command.vel.x).toBeLessThan(0);
 });
 it.each([false,true])('no remaining wall does not create a held own-front barrier before the station, mirror=%s',mirror=>{
  const f=stage(mirror,false,false,'empty');
  expect(Reflect.get(f.controller,'pullRead').clearanceX).toBeNull();
  expect(Reflect.get(f.controller,'pullIdx')).toBe(1);
  f.a.body.pos.x+=.15;f.sim.t+=.05;
  const p=f.controller.plan.pullPath!;
  // A held corner is approached at the speed his own turn radius allows.
  expect(f.controller.update(f.a,f.sim)).toEqual(goTo(f.a,p[1],{speed:.95,through:cornerSpeed(f.a.body,p[1],p[2],pullTurnRadius(f.a))}));
 });
});
