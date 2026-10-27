import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {RunBlocker,planRunBlocking} from '../src/sim/behaviors/blocking.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
import type {Perceived} from '../src/sim/perception.js';
const inputs=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/puller-access-inputs.json.gz',import.meta.url))).toString());
function stage(id:string,mirror=false){
 const sim=new PlaySim(structuredClone(inputs.rows.find((r:{id:string})=>r.id===id).setup) as PlaySetup);
 if(mirror){
  const reflect=(y:number)=>2*sim.ballY-y;
  for(const a of sim.agents){a.body.pos.y=reflect(a.pos.y);a.body.vel.y*=-1;a.body.facing*=-1;}
  for(const spot of Object.values(sim.offAlign.spots))if(spot)spot.pos.y=reflect(spot.pos.y);
  sim.offAlign.strongSign*=-1;
 }
 return sim;
}
describe('kick phase follows a personally read end after the flat track',()=>{
 it.each([false,true])('logs only an acquired inside crossing before contact, reflected=%s',mirror=>{
  for(const inside of [false,true]){
   const sim=stage('K03',mirror),a=sim.slot('LG')!,controller=a.behavior as RunBlocker;
   controller.update(a,sim);
   sim.t=2;Reflect.set(controller,'pullIdx',2);Reflect.set(controller,'pullCleared',true);
   const side=sim.offAlign.strongSign*(sim.offCall.run!.direction==='strong'?1:-1);
   a.body.pos={x:38.85,y:sim.ballY};a.body.vel={x:0,y:0};
   const target=controller.plan.target!,see=sim.see.bind(sim);
   // Private live geometry contradicts the delivered picture and is out of
   // physical reach. Only the already acquired cue can select this technique.
   target.body.pos={x:46,y:a.pos.y+(inside?side:-side)*3};
   sim.see=(observer,other,scale)=>{
    const seen=see(observer,other,scale);
    return observer===a?{...seen,pos:other===target
     ?{x:sim.los-.1,y:a.pos.y+(inside?-side:side)*.5}
     :{x:44,y:40},vel:{x:0,y:0}}:seen;
   };
   const before=structuredClone(a.body),rng=JSON.stringify(sim.rng);
   controller.update(a,sim);
   expect(a.body).toEqual(before);expect(JSON.stringify(sim.rng)).toBe(rng);
   expect(a.engagement).toBeNull();expect(sim.world.joints).toHaveLength(0);
   const log=sim.events.find(e=>e.type==='block_log');
   expect(a.tags.has('block-log')).toBe(inside);
   if(inside){
    expect(log?.note).toBe('kick target crossed inside shoulder');
    expect(controller.plan.drive.y*side).toBeLessThan(0);
   }else expect(log).toBeUndefined();
  }
 });
 it.each([false,true])('fits an upfield end after clearance, reflected=%s',mirror=>{
  const sim=stage('K03'),a=sim.slot('LG')!,controller=a.behavior as RunBlocker;
  controller.update(a,sim); // Initialize home stance before restoring the saved pull phase.
  const reflect=(y:number)=>mirror?2*sim.ballY-y:y;
  if(mirror){Reflect.set(controller,'homeY',reflect(sim.offAlign.spots[a.slot].pos.y));for(const p of controller.plan.pullPath!)p.y=reflect(p.y);controller.plan.drive.y*=-1;sim.offAlign.strongSign*=-1;}
  sim.t=2;a.body.pos={x:38.85,y:reflect(23.7)};a.body.vel={x:0,y:0};
  Reflect.set(controller,'pullIdx',2);Object.defineProperty(a.mind,'placementError',{get:()=>0});
  const see=sim.see.bind(sim),target=controller.plan.target!;
  sim.see=(observer,other,scale)=>{
   const seen=see(observer,other,scale);return observer===a?{...seen,pos:other===target?{x:41.8,y:reflect(23.1)}:{x:44,y:reflect(40)},vel:{x:0,y:0}}:seen;
  };
  const before=structuredClone(a.body);const next=controller.update(a,sim);
  expect(next.facing).toBeDefined();expect(next.vel.x).toBeGreaterThan(0);expect(a.body).toEqual(before);expect(sim.world.joints).toHaveLength(0);
  Reflect.set(controller,'pullCleared',false);Reflect.set(controller,'pullIdx',0);
  const clearance=controller.update(a,sim);
  // The open pull step faces the play side, not an early strike at the end.
  expect(Math.abs(clearance.facing!)).toBeCloseTo(Math.PI/2);
  expect(a.body).toEqual(before);expect(sim.world.joints).toHaveLength(0);
 });
});
