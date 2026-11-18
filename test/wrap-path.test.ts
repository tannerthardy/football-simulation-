import {readFileSync} from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {RunBlocker,playSideSign} from '../src/sim/behaviors/blocking.js';
import {PlaySim} from '../src/sim/playsim.js';
import {restoreSetup} from '../scripts/diag/saved-play.js';
// engine-89 (DIR_START on): fixture recorded before a start from rest cost the legs in a direction they were not loaded for; pinned test-only, the owning lane to re-record with it on
vi.hoisted(() => { process.env.DIR_START = '0'; });

// Counter's wrapping tackle rounds his corner and keeps running to work, as
// tracked wraps do (~3.3 yd/s at 2.0 s, ~90 deg/s of turn, pullshape.py).
// Recorded S7-P022 (Singleback Ace counter vs over), saved stream: on the
// landmark route he braked into his corner point, pivoted there and slowed to
// 0.7 yd/s by 2.8 s, re-picking the backside tackle and end he had already run
// past. Rounding the corner and keeping to men in front of his own flow, he
// carries 3.2+ yd/s through 1.6-2.3 s, drops the men who left his lane and leads
// the runner at 2+ yd/s until he picks up the backer (develop: 2.46 and 0.7).
const saved=JSON.parse(readFileSync(new URL('./fixtures/counter-wrap-round-s7-p022.json',import.meta.url),'utf8'));

describe('counter wrap path, recorded S7-P022',()=>{
 it('rounds the corner at speed and never turns back for a man he has passed',()=>{
  const sim=new PlaySim(restoreSetup(Buffer.from(saved.setup,'base64')));
  const wrap=sim.offense.find(a=>a.behavior instanceof RunBlocker&&a.behavior.plan.kind==='pull'&&a.behavior.plan.pullRole==='lead')!;
  const ps=playSideSign(sim,sim.offCall.run!),tick=sim.tick.bind(sim);
  const speeds:number[]=[],late:number[]=[];let passedFor=0,passedMax=0;
  sim.tick=()=>{tick();
   const v=Math.hypot(wrap.vel.x,wrap.vel.y);
   if(sim.t>=1.6-1e-9&&sim.t<=2.3+1e-9)speeds.push(v);
   if(sim.t>2.3&&sim.t<=2.8+1e-9&&!wrap.engagement)late.push(v);
   const tgt=(wrap.behavior as RunBlocker).plan.target;
   // A man he has run past may be held for a decision beat (acquired
   // pictures lag), not kept as his work.
   if(sim.t>=1.6&&tgt&&!wrap.engagement&&(tgt.pos.y-wrap.pos.y)*ps<-1.5)passedFor+=sim.dt;else passedFor=0;
   passedMax=Math.max(passedMax,passedFor);};
  sim.run();
  expect(Math.min(...speeds)).toBeGreaterThan(3.0);
  if(late.length)expect(Math.min(...late)).toBeGreaterThan(1.8);
  expect(passedMax).toBeLessThan(.3);
 });
});
