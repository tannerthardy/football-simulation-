import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {restoreSetup} from '../scripts/diag/saved-play.js';
import {PlaySim} from '../src/sim/playsim.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
const saved=JSON.parse(readFileSync(new URL('./fixtures/power-kick-seed14-play11.json',import.meta.url),'utf8'));
it('fits and loads the original end before the carrier passes on recorded seed14 power',()=>{
 const sim=new PlaySim(restoreSetup(Buffer.from(saved.setup,'base64'))),a=sim.slot('RG')!,end=(a.behavior as RunBlocker).plan.target!;
 expect(end.slot).toBe('DE_S');
 let load:number|null=null,near:number|null=null,pass:number|null=null;
 const tick=sim.tick.bind(sim);sim.tick=()=>{tick();
  if(near===null&&Math.hypot(a.pos.x-end.pos.x,a.pos.y-end.pos.y)<1.2)near=sim.t;
  if(load===null&&sim.world.joints.some(j=>j.kind==='hands'&&((j.a===a.body&&j.b===end.body)||(j.b===a.body&&j.a===end.body))&&Math.hypot(j.normalForce??0,j.tangentForce??0)>1))load=sim.t;
  if(pass===null&&sim.carrier&&sim.carrier!==sim.qb&&sim.carrier.pos.x>=end.pos.x)pass=sim.t;
 };
 sim.run();expect(load).not.toBeNull();expect(near).not.toBeNull();expect(pass).not.toBeNull();expect(load!).toBeLessThan(pass!);expect(near!).toBeLessThan(pass!);
});

// The repaired native miss must not be bought by disabling all anticipation.
// These acquired, steady-motion scenes straddle the estimator's feasibility
// boundary without changing the horizon, physical profile or target truth.
it('retains a future fit for a moving end when a meet is estimated feasible',()=>{
 const sim=new PlaySim(restoreSetup(Buffer.from(saved.setup,'base64'))),a=sim.slot('RG')!,block=a.behavior as RunBlocker,end=block.plan.target!;
 a.body.pos={x:40,y:30};a.body.vel={x:0,y:0};
 const seen={pos:{x:43,y:30},vel:{x:-3,y:0},age:0,facing:Math.PI,stance:null};
 const original=sim.see.bind(sim);sim.see=(observer,target,...args)=>observer===a&&target===end?seen:original(observer,target,...args);
 const read=block['readPull'](a,sim,end);
 const point=block['kickFitPoint'](a,sim,end,read.seen);
 expect(point.x).toBeLessThan(seen.pos.x);
 expect(point.x).toBeGreaterThanOrEqual(seen.pos.x+seen.vel.x*.6);
 expect(point.y).toBe(seen.pos.y);
});
it('does not treat an unreachable moving-end fallback as a future meet',()=>{
 const sim=new PlaySim(restoreSetup(Buffer.from(saved.setup,'base64'))),a=sim.slot('RG')!,block=a.behavior as RunBlocker,end=block.plan.target!;
 a.body.pos={x:40,y:30};a.body.vel={x:0,y:0};
 const seen={pos:{x:50,y:30},vel:{x:-3,y:0},age:0,facing:Math.PI,stance:null};
 const original=sim.see.bind(sim);sim.see=(observer,target,...args)=>observer===a&&target===end?seen:original(observer,target,...args);
 const read=block['readPull'](a,sim,end);
 expect(block['kickFitPoint'](a,sim,end,read.seen)).toEqual(seen.pos);
});
