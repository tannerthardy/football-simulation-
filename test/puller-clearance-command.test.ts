import {describe, expect, it, vi} from 'vitest';
// Recorded on the installed flat line (1.3 yd splits, 0.55 yd depth): its
// saved geometry, landmarks and plans are that line's. The tracked line
// (OL_ALIGN, docs/reviews/presnap.md) moves every body; pin it off here.
vi.hoisted(() => { process.env.OL_ALIGN = '0'; });
// Recorded under the default gait, pull and gun-exchange laws. GAIT_STEP,
// PULL_STEP and MESH_POINT (on in the pinned profile) change its timing or
// first command; pin them off here. test/gait-step.test.ts and
// test/pull-step.test.ts cover those laws.
vi.hoisted(() => { for (const k of ['GAIT_STEP', 'PULL_STEP', 'MESH_POINT']) process.env[k] = '0'; });
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {goTo} from '../src/sim/behaviors/common.js';
import {cornerSpeed} from '../src/physics/kinematics.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
const inputs=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/puller-access-inputs.json.gz',import.meta.url))).toString());

describe('installed straight-back pull clearance keeps its working surface upfield',()=>{
 for(const [id,slot] of [['K01','RG'],['K01','RT'],['K03','LG']])
  it.each([false,true])(`${id}/${slot} preserves its depth track without an implicit backward pivot, mirror=%s`,mirror=>{
   const sim=new PlaySim(structuredClone(inputs.rows.find((r:{id:string})=>r.id===id).setup) as PlaySetup);
   const a=sim.slot(slot)!,controller=a.behavior as RunBlocker;
   if(mirror){
    const reflect=(y:number)=>2*sim.ballY-y;
    for(const p of sim.agents){p.body.pos.y=reflect(p.pos.y);p.body.vel.y*=-1;p.body.facing*=-1;}
    for(const spot of Object.values(sim.offAlign.spots))if(spot)spot.pos.y=reflect(spot.pos.y);
    sim.offAlign.strongSign*=-1;
    for(const point of controller.plan.pullPath!)point.y=reflect(point.y);
    controller.plan.drive.y*=-1;
   }
   sim.t=.05;
   const path=controller.plan.pullPath!,before=structuredClone(a.body),rng=JSON.stringify(sim.rng);
   const command=controller.update(a,sim);
   expect(command).toEqual(goTo(a,path[0],{speed:.95,through:cornerSpeed(a.body,path[0],path[1],.65),facing:0}));
   expect(command.vel.x).toBeLessThan(0);
   expect(a.body).toEqual(before);expect(JSON.stringify(sim.rng)).toBe(rng);
   expect(a.engagement).toBeNull();expect(sim.world.joints).toHaveLength(0);
  });
});
