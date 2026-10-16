/** Bounded unloaded interception experiment. RAW_DIRECTORY OUTPUT.json.
 * Replan every 50 ms through World. The observed runner follows a declared
 * straight path; this is not a native play, grip model or future-cut oracle.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {FIELD_WIDTH} from '../../src/core/field.ts';
import {clamp} from '../../src/core/vec.ts';
import {gaitLag} from '../../src/physics/kinematics.ts';
import {interceptPoint} from '../../src/physics/reach.ts';
import {World} from '../../src/physics/world.ts';
import {chase,leverage} from '../../src/sim/behaviors/common.ts';
import {requestToCover} from '../../src/sim/motion-plan.ts';
import {PerceptionBuffer} from '../../src/sim/perception.ts';
import {PlaySim} from '../../src/sim/playsim.ts';
import {sourceVersion} from '../source-version.ts';
const [dir,out]=process.argv.slice(2),start=performance.now(),hash=b=>createHash('sha256').update(b).digest('hex');
assert.ok(!existsSync(out));
const fixtures=[];
for(const [name,t]of [['A020',3.75],['A042',2.65],['A008',2.5]]){
 const b=readFileSync(`${dir}/${name}.json`),raw=JSON.parse(b),
  capture=JSON.parse(gunzipSync(readFileSync(`${dir}/${name}-capture.json.gz`))),
  row=capture.rows.find(r=>r.t===t),seen=row.cues.find(c=>c.caller.includes('at chase ')).picture;
 fixtures.push({name,raw,row,seen,inputHash:hash(b),captureHash:hash(readFileSync(`${dir}/${name}-capture.json.gz`))});
}
const base=fixtures[1];
for(const [name,pos,vel,runnerPos,runnerVel]of [
 ['crossing',{x:53,y:32},{x:6,y:-6},{x:50,y:26},{x:6,y:0}],
 ['incoming',{x:53,y:26},{x:-4,y:0},{x:46,y:26},{x:7,y:0}],
 ['rear-earned',{x:46,y:26},{x:6,y:0},{x:50,y:26},{x:8,y:0}],
 ['oblique',{x:53,y:32},{x:-3,y:-3},{x:46,y:26},{x:7,y:0}]
])fixtures.push({...base,name,row:{...base.row,body:{...structuredClone(base.row.body),pos,vel,facing:Math.atan2(vel.y,vel.x)},runFit:null},
 seen:{...base.seen,pos:runnerPos,vel:runnerVel,facing:Math.atan2(runnerVel.y,runnerVel.x)}});
function planned(a,seen,contact,offset,ordinary){
 const dist=Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y);
 if(dist<=contact+.5)return ordinary;
 const path=t=>({x:seen.pos.x+seen.vel.x*t,y:clamp(seen.pos.y+seen.vel.y*t,0,FIELD_WIDTH)}),
  ip=interceptPoint(a,path,{horizon:3,step:.05,radius:contact}),time=Math.max(.1,ip.t),
  goal={x:ip.point.x,y:clamp(ip.point.y+offset,0,FIELD_WIDTH)},
  vel={x:requestToCover(gaitLag(a.profile),goal.x-a.pos.x,time,a.vel.x),
   y:requestToCover(gaitLag(a.profile),goal.y-a.pos.y,time,a.vel.y)},
  speed=Math.hypot(vel.x,vel.y),cap=a.profile.vmax*a.speedScale;
 if(speed>cap){vel.x*=cap/speed;vel.y*=cap/speed;}
 return{...ordinary,vel,facing:Math.atan2(vel.y,vel.x)};
}
const rows=[];
for(const f of fixtures)for(const side of [1,-1])for(const mode of ['baseline','coherent']){
 const sim=new PlaySim(structuredClone(f.raw.setup)),d=sim.agents[f.raw.actors.find(a=>a.id===
  (f.name==='A020'?'S74D-CB3':f.name==='A008'?'S30D-CB3':'S69D-S1')).idx],
  target=sim.agents[f.name==='A020'?10:f.name==='A008'?7:6];
 d.body=structuredClone(f.row.body);d.runFit=structuredClone(f.row.runFit);d.r=k=>f.row.ratings[k]??.5;
 if(side<0){d.body.pos.y=FIELD_WIDTH-d.body.pos.y;d.body.vel.y*=-1;d.body.facing*=-1;if(d.runFit)d.runFit.side*=-1;}
 const initial=structuredClone(f.seen),mirror=p=>({x:p.x,y:side>0?p.y:FIELD_WIDTH-p.y}),
  velocity={x:initial.vel.x,y:side*initial.vel.y},
  runner=t=>({pos:mirror({x:initial.pos.x+initial.vel.x*t,y:initial.pos.y+initial.vel.y*t}),
   vel:velocity,facing:side*initial.facing,pose:'up',carrying:true}),
  perception=new PerceptionBuffer(1,.05),world=new World([d.body]),contact=d.profile.radius+target.profile.radius+d.profile.reach*.65;
 for(let k=23;k>=0;k--)perception.record([runner(-k*.05)],0);
 sim.see=()=>perception.perceive(0,.15);sim.rng={fork:()=>({normal:()=>0})};sim.bond=null;
 let best={distance:Infinity},entry=null;const sequence=[];
 for(let k=0;k<60;k++){
  sim.t=k*.05;perception.record([runner(sim.t)],0);
  const seen=sim.see(d,target),distance=Math.hypot(seen.pos.x-d.pos.x,seen.pos.y-d.pos.y),
   force=d.runFit?.kind==='force'||d.runFit?.kind==='edge'&&d.runFit.edge==='box',
   offset=(force?Math.abs(leverage(d,seen.pos.y))*d.runFit.side:leverage(d,seen.pos.y))*clamp((distance-contact)/6,0,1),
   original=chase(sim,d,target),command=mode==='baseline'?original:planned(d,seen,contact,offset,original);
  world.step([command],.05);
  const actual=runner(sim.t+.05),gap=Math.hypot(actual.pos.x-d.pos.x,actual.pos.y-d.pos.y),
   sample={t:sim.t+.05,distance:gap,pos:{...d.pos},vel:{...d.vel},support:d.body.support.state,
    runnerPos:actual.pos,command};
  if(gap<best.distance)best=sample;
  if(!entry&&gap<=contact)entry=sample;
  sequence.push(sample);
  if(entry||d.body.support.state!=='up')break;
 }
 rows.push({case:f.name,side,mode,inputHash:f.inputHash,captureHash:f.captureHash,contact,best,entry,sequence});
}
const result={schema:'approach-continuity-probe-v1',source:sourceVersion(),operator:hash(readFileSync(import.meta.filename)),
 nativeExecutions:0,seconds:(performance.now()-start)/1000,
 limits:['Declared constant runner path; unloaded defender World; no contact, tackle or force prediction.',
  'Both controllers replan from the same delayed channel at 20Hz. Pursuit execution bias fixed to zero in this controlled probe.'],rows};
writeFileSync(out,JSON.stringify(result));
console.log(JSON.stringify({out,seconds:result.seconds,rows:rows.map(r=>({case:r.case,side:r.side,mode:r.mode,best:r.best.distance,entry:r.entry?.t,velocity:r.best.vel}))}));
