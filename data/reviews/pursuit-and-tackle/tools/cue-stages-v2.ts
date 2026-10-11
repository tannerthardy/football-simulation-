import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { Rng } from '../../../src/core/rng.js';
import { CENTER_Y } from '../../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { contactQuality } from '../../../src/sim/tackle-window.js';
import { sourceVersion } from '../../../scripts/source-version.js';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const before=sourceVersion();
const off=generateTeam(new Rng(31),'Panel offense 1','O1',{strength:.55});
const def=generateTeam(new Rng(32),'Panel defense 1','D1',{strength:.55});
const inputs=[
 {run:'split_zone',front:'over',flip:true,seed:11},
 {run:'split_zone',front:'odd',flip:false,seed:11},
 {run:'iz_strong',front:'over',flip:false,seed:3},
];
const rows:any[]=[];
for(const input of inputs){
 const formation=FORMATION_BY_ID[input.run==='split_zone'?'gun_wing_12':'ace_11'];
 const personnel=FRONT_BY_ID[input.front].personnel[0];
 const create=(record:boolean)=>new PlaySim({offense:pickOffense(off,formation.personnel),defense:pickDefense(def,personnel),
  offCall:{formation,flip:input.flip,kind:'run',run:RUN_BY_ID[input.run],label:`${formation.name} · ${RUN_BY_ID[input.run].name}`},
  defCall:{personnel,front:FRONT_BY_ID[input.front],coverage:COVERAGE_BY_ID.cover3,pressure:null,label:`${FRONT_BY_ID[input.front].name} · Cover 3`},
  los:40,ballY:CENTER_Y,firstDownX:50,seed:input.seed,record,recordLevel:'full',recordEvery:1});
 const sim=create(true), observations:any[]=[], motor:any[]=[];
 let boundary='behavior';
 const tick=sim.tick;sim.tick=function(){boundary='behavior';return tick.call(this);};
 const step=sim.world.step;sim.world.step=function(intents,dt){
  motor.push({t:sim.t,agents:sim.agents.filter(a=>['RB','FS','SS','CB_S'].includes(a.slot)).map(a=>({slot:a.slot,
   pos:{...a.pos},vel:{...a.vel},support:structuredClone(a.body.support),intent:structuredClone(intents[a.idx]),rawCommand:structuredClone((sim as any).cmds[a.idx]),
   focus:a.mind.focus,stress:a.mind.stress,read:a.recog?.read,fit:a.runFit?{...a.runFit}:null}))});
  const r=step.call(this,intents,dt);boundary='post-world';return r;
 };
 const see=sim.see;sim.see=function(a,b,...rest){
  const seen=see.call(this,a,b,...rest);
  if(b===this.carrier&&['FS','SS','CB_S'].includes(a.slot)&&this.t>=2){
   const body=a.profile.radius+b.profile.radius,arms=body+a.profile.reach*(a.engagement?.4:1);
   const distance=Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y);
   const elapsed=Math.max(0,Math.min(this.dt,this.world.time-this.t));
   const observedDistance=Math.hypot(seen.pos.x+seen.vel.x*elapsed-a.pos.x,seen.pos.y+seen.vel.y*elapsed-a.pos.y);
   observations.push({t:this.t,worldTime:this.world.time,boundary,observer:a.slot,target:b.slot,delayScale:rest[0]??1,
    image:structuredClone(seen),selfPos:{...a.pos},selfVel:{...a.vel},actualPos:{...b.pos},actualVel:{...b.vel},
    body,arms,distance,actualQuality:contactQuality(distance,body,arms),observedDistance,
    observedQuality:contactQuality(observedDistance,body,arms),intent:structuredClone(this.intents[a.idx]),
    selfSupport:structuredClone(a.body.support),bond:!!this.bond,
    contacts:this.lastStep?.contacts.filter(h=>h.i===a.idx||h.j===a.idx)??[],
    joints:this.world.joints.filter(j=>j.a===a.body||j.b===a.body).map(j=>({kind:j.kind})),
    ratings:{tackling:a.r('tackling'),awareness:a.r('awareness'),pursuit:a.r('pursuit')},profile:structuredClone(a.profile)});
  }
  return seen;
 };
 const result=sim.run();sim.tick=tick;sim.world.step=step;sim.see=see;
 const signature=(s:PlaySim,r:any)=>hash({result:{...r,frames:undefined,telemetry:undefined},bodies:s.agents.map(a=>a.body),intents:s.intents,rng:{...s.rng}});
 const plain=create(false), plainResult=plain.run();
 if(signature(sim,result)!==signature(plain,plainResult))throw Error('Observer changed execution');
 rows.push({input,id:`CT-R1-${input.run}-${input.front}-${input.flip?'L':'R'}-S${input.seed}`,source:before,observerVerified:true,result,observations,motor,slots:sim.agents.map(a=>a.slot)});
}
if(sourceVersion()!==before)throw Error('Source changed');
const path='out/tackle-breakthrough/review/cue-stages-v2.json.gz';
mkdirSync('out/tackle-breakthrough/review',{recursive:true});
writeFileSync(path,gzipSync(JSON.stringify({schema:'tackle-cue-boundary-review-v1',source:before,
 scope:'Two outcome-selected explosive witnesses plus a predeclared ordinary control; records consumed see calls and existing bodies, no extra look/RNG.',rows})));
console.log(JSON.stringify({path,source:before,rows:rows.map(r=>({id:r.id,gain:r.result.offenseYards,observerVerified:r.observerVerified}))}));
