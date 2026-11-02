import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PlaySim} from '../src/sim/playsim.js';
import {restoreSetup} from '../scripts/diag/saved-play.js';

// A draw tackle sells pass with a set on his edge rusher, not by standing on
// a yard mark. Recorded S11-P037 (draw), saved stream: the LT stood still for
// the first second while DE_W ran 2.5 yd outside him into the backfield, then
// trailed him and turned back at 2.1 s, never touching him (develop). Tracked
// draw tackles kick nearly straight back, 0.9 yd deeper than their rusher at
// 1.0 s (drawwide.py); with the pass protector's short kick he takes the end on
// and rides him upfield.
const saved=JSON.parse(readFileSync(new URL('./fixtures/draw-tackle-set-s11-p037.json',import.meta.url),'utf8'));

describe('draw edge set, recorded S11-P037',()=>{
 it('the LT moves to his rusher during the pass show and engages him before the handoff read ends',()=>{
  const sim=new PlaySim(restoreSetup(Buffer.from(saved.setup,'base64')));
  const lt=sim.offense.find(a=>a.slot==='LT')!,de=sim.defense.find(d=>d.slot==='DE_W')!,tick=sim.tick.bind(sim);
  let engagedAt:number|null=null,moved=0;
  sim.tick=()=>{tick();
   if(sim.t>.3&&sim.t<1)moved=Math.max(moved,Math.hypot(lt.vel.x,lt.vel.y));
   if(engagedAt===null&&lt.engagement?.defender===de)engagedAt=sim.t;};
  sim.run();
  expect(moved).toBeGreaterThan(1.5);
  expect(engagedAt).not.toBeNull();
  expect(engagedAt!).toBeLessThan(1.6);
 });
});
