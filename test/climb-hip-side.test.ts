import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {PlaySim} from '../src/sim/playsim.js';
import {restoreSetup} from '../scripts/diag/saved-play.js';

// A climber stepping off his released man's hip keeps one side for the
// departure. With the request nearly straight into the man, the old hip
// projection left a tiny remainder whose side flipped tick to tick and swung
// the full-speed request through ~180 deg (#164, Main Engine's climbtrace:
// 28% of develop releases flipped > 60 deg between ticks; flippers 1.74 yd/s
// at +0.5 s vs 2.43 steady). Recorded seed 9 snaps on develop 15d7e8a0:
// IZ RG (#44) 176 deg / 1.14 yd/s, power LT (#64) 178 deg; with a held side
// both stay under 60 deg and keep climbing.
const cases=[['iz-climb-hip-s9-p044','RG'],['power-climb-hip-s9-p064','LT']] as const;

describe('climb steps off the released hip on one side',()=>{
 it.each(cases)('%s: the %s climb request never swings > 60 deg in its first 0.5 s',(file,slot)=>{
  const saved=JSON.parse(readFileSync(new URL(`./fixtures/${file}.json`,import.meta.url),'utf8'));
  const sim=new PlaySim(restoreSetup(Buffer.from(saved.setup,'base64')));
  const a=sim.offense.find(o=>o.slot===slot)!,b=a.behavior as RunBlocker;
  let last:{x:number;y:number}|null=null,released:number|null=null,maxTurn=0,prevTgt=b.plan.target;
  const up=b.update.bind(b);
  (b as any).update=(ag:any,s:any)=>{const c=up(ag,s);
   const tgt=b.plan.target;
   if(released===null&&prevTgt&&tgt&&prevTgt!==tgt&&tgt.slot.startsWith('LB')&&!prevTgt.slot.startsWith('LB'))released=sim.t;
   prevTgt=tgt;
   if(released!==null&&sim.t<=released+.5+1e-9&&c?.vel&&Math.hypot(c.vel.x,c.vel.y)>=1){
    if(last&&Math.hypot(last.x,last.y)>=1){let d=Math.abs(Math.atan2(c.vel.y,c.vel.x)-Math.atan2(last.y,last.x))*180/Math.PI;if(d>180)d=360-d;maxTurn=Math.max(maxTurn,d);}
    last={...c.vel};}
   return c;};
  sim.run();
  expect(released).not.toBeNull();
  expect(maxTurn).toBeLessThan(60);
 });
});
