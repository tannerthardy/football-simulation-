import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {goTo} from '../src/sim/behaviors/common.js';
import {cornerSpeed} from '../src/physics/kinematics.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
const inputs=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/puller-access-inputs.json.gz',import.meta.url))).toString());

describe('the open pull step faces the play side and never pivots toward our own end zone',()=>{
 for(const [id,slot] of [['K01','RG'],['K01','RT'],['K03','LG']])
  it.each([false,true])(`${id}/${slot} opens toward the play side while gaining depth, mirror=%s`,mirror=>{
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
   // The open step: hips toward the play side (the first corner's side of
   // the snap spot), never past square toward our own end zone.
   const playSide=Math.sign(path[0].y-a.pos.y);
   expect(command).toEqual(goTo(a,path[0],{speed:.95,through:cornerSpeed(a.body,path[0],path[1],.65),facing:Math.atan2(playSide,0)}));
   expect(command.vel.x).toBeLessThan(0);
   expect(command.vel.y*playSide).toBeGreaterThan(0);
   expect(a.body).toEqual(before);expect(JSON.stringify(sim.rng)).toBe(rng);
   expect(a.engagement).toBeNull();expect(sim.world.joints).toHaveLength(0);
  });
});
