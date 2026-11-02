import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PlaySim} from '../src/sim/playsim.js';
import {restoreSetup} from '../scripts/diag/saved-play.js';

// A climbing blocker's first-threat reread never turns him back for a man he
// has climbed past. Tracked tight ends on power never brake and pivot before
// their first block (0 of 718, pivots.py). Recorded S11-P007 (power), saved
// stream: the Y, 1.5 yd past the line climbing to the backer, reread onto the
// strong end 1.8 yd behind him in the backfield, braked and turned 126 deg
// and chased him from behind until 2.95 s (develop). Judged a beat ahead, that
// end is behind his back; he keeps climbing to the backer.
const saved=JSON.parse(readFileSync(new URL('./fixtures/power-y-climb-s11-p007.json',import.meta.url),'utf8'));

describe('climb reread, recorded S11-P007',()=>{
 it('the climbing Y never takes a man more than a yard behind him',()=>{
  const sim=new PlaySim(restoreSetup(Buffer.from(saved.setup,'base64')));
  const y=sim.offense.find(a=>a.slot==='Y')!,dir=sim.attackDir('O'),tick=sim.tick.bind(sim);
  let behindFor=0,behindMax=0;
  sim.tick=()=>{tick();
   const tgt=(y.behavior as any).plan?.target;
   if(tgt&&!y.engagement&&(tgt.pos.x-y.pos.x)*dir<-1.5)behindFor+=sim.dt;else behindFor=0;
   behindMax=Math.max(behindMax,behindFor);};
  sim.run();
  expect(behindMax).toBeLessThan(.3);
 });
});
