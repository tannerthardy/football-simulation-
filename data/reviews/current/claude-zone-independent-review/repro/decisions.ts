/** Independent decision witnesses. Reduced scenes, not native transfer evidence. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {makeSim,rosters} from './zone-lab/lab.js';
import {runReadAim,BallCarrier} from '../../src/sim/behaviors/carrier.js';
import {RunBlocker} from '../../src/sim/behaviors/blocking.js';
import {runReadObservers} from '../../src/sim/run-read-observer.js';
import type {Perceived} from '../../src/sim/perception.js';
const R=rosters(),output=process.argv[2]??'out/claude-zone-review/decisions.json';
function scene(){
 const sim=makeSim({concept:'iz',dir:'strong',look:'over3',roster:'pair11',seed:77,formation:'ace_12'},R);
 for(const a of sim.agents){a.body.pos={x:5+a.idx,y:2};a.body.vel={x:0,y:0};}
 for(const [slot,y]of[['C',0],['LG',-1.4],['RG',1.4],['LT',-2.8],['RT',2.8]]as const)sim.slot(slot)!.body.pos={x:39.5,y:sim.ballY+y};
 sim.see=(_observer,a)=>({pos:{...a.pos},vel:{...a.vel},stance:'high',facing:0,pose:'up',age:.1}as Perceived);
 return sim;
}
const protection=[];
for(const mirror of[1,-1])for(const incidental of[false,true]){
 const sim=scene(),rb=sim.slot('RB')!,d=sim.slot('DT_S')!,wr=sim.slot('Z')!;
 rb.body.pos={x:38.4,y:sim.ballY+mirror*2};d.body.pos={x:40.5,y:sim.ballY+mirror*2};
 if(incidental){wr.body.pos={x:d.pos.x+d.profile.radius+wr.profile.radius+.1,y:d.pos.y};wr.body.vel={x:5,y:0};}
 let observation:any;runReadObservers.set(sim,e=>{if(e.phase==='aim')observation=e;});
 const opts={aim:{x:40.6,y:sim.ballY+mirror*2},run:{scheme:'insideZone' as const,side:mirror}};
 const selected=runReadAim(rb,sim,opts),command=new BallCarrier(opts,rb).update(rb,sim);
 const entry=observation.candidates.find((c:any)=>Math.abs(c.entry.x-40.5)<1e-8&&Math.abs(c.entry.y-(sim.ballY+mirror*2))<1e-8);
 protection.push({mirror,incidental,selected,command,occupiedEntry:entry,defender:{pos:d.pos,radius:d.profile.radius},runnerRadius:rb.profile.radius,
  receiver:{pos:wr.pos,vel:wr.vel,radius:wr.profile.radius},gap:Math.hypot(d.pos.x-wr.pos.x,d.pos.y-wr.pos.y)-d.profile.radius-wr.profile.radius,
  actualEngagement:d.engagement!==null});
}
const cadence=[];
for(const changed of[false,true]){
 const sim=scene(),a=sim.slot('RG')!,keeper=sim.slot('C')!,down=sim.slot('DT_S')!,backer=sim.slot('LB_M')!;
 a.body.pos={x:39.55,y:sim.ballY+.5};keeper.body.pos={x:39.7,y:sim.ballY+1.6};
 down.body.pos={x:40.25,y:sim.ballY+1};backer.body.pos={x:44.5,y:a.pos.y+.5*4.95/.7-.1};backer.body.vel={x:0,y:4};
 sim.t=sim.world.time=1;a.snapReadyAt=0;
 const controller=new RunBlocker({kind:'climb',target:backer,drive:{x:1,y:0},departure:{defender:down,keeper,backer}});a.behavior=controller;
 controller.startDeparture(a,sim,down,keeper,backer,{exit:{x:a.pos.x,y:a.pos.y+.1},flow:{x:0,y:0},backer:sim.see(a,backer)});
 const first=controller.update(a,sim),deadline=(Reflect.get(controller,'departureRead') as any)?.nextRead;
 sim.t=sim.world.time=1.05;if(changed)backer.body.pos.y+=.2;
 const second=controller.update(a,sim);
 cadence.push({changed,deadline,decisionInterval:a.mind.decisionInterval,first,second});
}
mkdirSync('out/claude-zone-review',{recursive:true});
writeFileSync(output,JSON.stringify({flags:{RUN_LANE:process.env.RUN_LANE,CLIMB_EXIT:process.env.CLIMB_EXIT},protection,cadence},null,2)+'\n');
console.log(JSON.stringify({protection,cadence},null,2));
