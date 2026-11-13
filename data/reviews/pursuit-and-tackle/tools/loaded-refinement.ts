import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {CENTER_Y} from '../../src/core/field.js';
import {Rng} from '../../src/core/rng.js';
import {G} from '../../src/core/units.js';
import {generateTeam,pickDefense,pickOffense} from '../../src/league/team.js';
import {PASS_BY_ID} from '../../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../../src/playbook/formations.js';
import {supportParams} from '../../src/physics/support.js';
import {PlaySim} from '../../src/sim/playsim.js';
import {sourceVersion} from '../source-version.js';
const output=process.argv[2], mode=process.argv[3]??'native';if(!output)throw new Error('output needed');
const hash=(x:any)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const before=sourceVersion();
const o=generateTeam(new Rng(31),'Awareness offense','AOF',{strength:.55}),d=generateTeam(new Rng(32),'Awareness defense','ADF',{strength:.55});
function make(record:boolean){const formation=FORMATION_BY_ID.gun_trips_11;return new PlaySim({offense:pickOffense(o,formation.personnel),defense:pickDefense(d,'nickel'),offCall:{formation,flip:false,kind:'pass',pass:PASS_BY_ID.four_verts,label:'gun_trips_11/four_verts'},defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover6,pressure:null,zoneStyle:'match',label:'Over cover6'},los:40,ballY:CENTER_Y,firstDownX:50,seed:3,record,recordLevel:'full',recordEvery:1,audibles:false});}
function policy(s:PlaySim,intents:any[]){
 const stepSuffix=mode.match(/steps(\d+)$/);if(stepSuffix)s.world.substeps=Number(stepSuffix[1]);
 const activeMode=mode.replace(/-steps\d+$/,'');
 if(!s.bond||!['keep-feet','brake-with-grip'].includes(activeMode))return;
 const c=s.bond.carrier,cs=c.speed;
 for(const d of s.bond.tacklers){const q=s.bond.grip?.get(d)??0;if(q<.55||d.body.support?.state!=='up'||cs<=2)continue;
  const dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,dist=Math.hypot(dx,dy),into=-(c.vel.x*dx+c.vel.y*dy)/(cs*Math.max(.1,dist));if(into>.3)continue;
  const own=intents[d.idx];if(!own)continue;
  intents[d.idx]={...own,dive:undefined};
  if(activeMode==='brake-with-grip'){
   const capacity=Math.min((s.bond.holds?.get(d)?.capacity??0),supportParams(d.profile).traction);
   const brake=Math.min(cs,capacity/d.profile.massKg*.2);
   intents[d.idx].vel={x:own.vel.x-c.vel.x/cs*brake,y:own.vel.y-c.vel.y/cs*brake};
  }
 }
}
const sim=make(true),samples:any[]=[],events:any[]=[];
const body=(a:any)=>({idx:a.idx,slot:a.slot,profile:a.profile,ratings:a.player.ratings,pos:{...a.pos},vel:{...a.vel},speed:a.speed,facing:a.facing,spin:a.body.spin,energy:a.body.energy,support:structuredClone(a.body.support)});
const signature=(s:PlaySim,r:any)=>hash({result:{...r,frames:undefined,telemetry:undefined},bodies:s.agents.map(a=>a.body),intents:s.intents,minds:s.agents.map(a=>a.mind),rng:{...s.rng}});
const step=sim.world.step,event=sim.event;
sim.event=function(type,a,b,note){if(['catch','tackle_wrap','broken_tackle','missed_tackle','carrier_contact','hit'].includes(type))events.push({t:sim.t,type,a:a?body(a):null,b:b?body(b):null,note,holds:sim.bond?[...(sim.bond.holds??[])].map(([h,j])=>({holder:h.idx,...j,a:undefined,b:undefined})):[]});return event.call(this,type,a,b,note);};
sim.world.step=function(intents,dt){policy(sim,intents as any[]);const preC=sim.carrier,pre=preC&&sim.catchAt>=0?{t:sim.t,carrier:body(preC),intents:structuredClone(intents),holders:sim.bond?.tacklers.map(body)??[],holds:sim.bond?[...(sim.bond.holds??[])].map(([h,j])=>({holder:h.idx,...j,a:undefined,b:undefined})):[]}:null;const report=step.call(this,intents,dt);if(pre&&preC){samples.push({pre,post:{carrier:body(preC),holders:pre.holders.map((a:any)=>body(sim.agents[a.idx])),holds:sim.bond?[...(sim.bond.holds??[])].map(([h,j])=>({holder:h.idx,...j,a:undefined,b:undefined})):[]},report:structuredClone(report)});}return report;};
const result=sim.run(),plain=make(false);const plainStep=plain.world.step;plain.world.step=function(intents,dt){policy(plain,intents as any[]);return plainStep.call(this,intents,dt);};const control=plain.run();const verified=signature(sim,result)===signature(plain,control);if(!verified)throw new Error('observer changes execution');const after=sourceVersion();if(before!==after)throw new Error('source changed');
const report={schema:'loaded-contact-counterfactual-v1',mode,sourceBefore:before,sourceAfter:after,toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),id:'DA-R1-four_verts-cover6-R',inputSha256:hash({o,d,input:{formation:'gun_trips_11',pass:'four_verts',coverage:'cover6',seed:3,los:40,flip:false}}),profilesSha256:hash(sim.agents.map(a=>({slot:a.slot,player:a.player,profile:a.profile}))),observerVerified:verified,definitions:{observation:'Reads existing state at native world boundaries; no new visual reads, commands, or RNG draws.',forces:'kg yd s, timestep mean. Active and passive grip work separated; no represented vertical loading.'},profiles:sim.agents.map(body),result:{...result,frames:undefined,telemetry:undefined},events,samples};mkdirSync(dirname(output),{recursive:true});writeFileSync(output,gzipSync(JSON.stringify(report)));console.log(JSON.stringify({sourceBefore:before,output,verified,outcome:result.outcome,yards:result.offenseYards,yac:result.stats.yac,events:events.map(e=>({t:e.t,type:e.type,a:e.a?.slot,b:e.b?.slot,note:e.note})),samples:samples.length},null,2));
