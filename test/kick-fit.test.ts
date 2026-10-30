import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {PlaySim} from '../src/sim/playsim.js';
import {restoreSetup} from '../scripts/diag/saved-play.js';

// Counter's kick puller fits the end where the end is going. An end closing
// along the line crossed in front of a puller who waited for his flat-leg
// corner and fit the end's seen spot, and the puller passed under him (tracked
// kickers meet the end at 1.7 s on 59% of counters, kickgap.py). Recorded
// S19-P025 (Singleback Ace counter), stream 0: with the back-block fit and the
// old seen-spot kick fit, the kicker reaches his end only at 3.9 s, after the
// runner crossed at 2.5 s; fitting the intercept, he engages him before the
// runner reaches the line. On develop's blocking.ts (no back-block fit) this
// kicker already loads his end before the crossing (Integration, 1.80 s vs
// 2.60): the snap guards the combination, not a develop defect.
const saved=JSON.parse(readFileSync(new URL('./fixtures/counter-kick-fit-s19-p025.json',import.meta.url),'utf8'));

describe('counter kick fit, recorded S19-P025',()=>{
 it('the kick puller engages the end before the runner reaches the line',()=>{
  const sim=new PlaySim(restoreSetup(Buffer.from(saved.setup,'base64')));
  const kicker=sim.offense.find(a=>a.behavior instanceof RunBlocker&&a.behavior.plan.kind==='pull'&&a.behavior.plan.pullRole==='kick')!;
  const end=(kicker.behavior as RunBlocker).plan.target!,tick=sim.tick.bind(sim),dir=sim.attackDir('O');
  let engagedAt:number|null=null,crossedAt:number|null=null;
  sim.tick=()=>{tick();
   if(engagedAt===null&&kicker.engagement?.defender===end)engagedAt=sim.t;
   const c=sim.carrier;
   if(crossedAt===null&&c&&c!==sim.qb&&(c.pos.x-sim.los)*dir>=0)crossedAt=sim.t;};
  sim.run();
  expect(engagedAt).not.toBeNull();
  if(crossedAt!==null)expect(engagedAt!).toBeLessThanOrEqual(crossedAt);
 });
});
