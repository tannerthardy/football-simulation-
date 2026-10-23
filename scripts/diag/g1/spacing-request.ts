import { readFileSync } from 'node:fs';
import { availability, supportParams } from '../../../src/physics/support.js';
import { fatigueFactor, followAccel } from '../../../src/physics/kinematics.js';

// Saved arithmetic only: no PlaySim, observations, previews or native steps.
// Read a workoff.ts native trace; bounded default selects the G1 witness.
const trace=JSON.parse(readFileSync(process.argv[2]??'out/g1/current/reviewed.json','utf8'));
const row=trace.rows.find((r:any)=>r.input.seedName==='iz_strong|gun_trips_11|cover4|0');
const sample=row?.samples.find((s:any)=>s.defender===14&&Math.abs(s.t-3.55)<1e-8);
if(!sample)throw new Error('G1 spacing witness is absent');
const packet={sample,actors:row.actors};
if(sample.calledMotionQueries?.length)throw new Error('This bounded reconstruction does not advance installed-motion pictures');
const reads=sample.consumedThisTick.filter((v:any)=>v.role==='teammate');
if(new Set(reads.map((v:any)=>v.target)).size!==reads.length)throw new Error('Ambiguous repeated peer queries');
const actors=new Map(packet.actors.map((a:any)=>[a.idx,a]));
const actor:any=actors.get(sample.defender), state=sample.before.defender;
const body={pos:state.position,vel:state.velocity,facing:state.facing,energy:state.energy,
  profile:actor.profile,support:state.support};
const raw=sample.contactRequest.data.command;
const capacity=availability(body.support,supportParams(body.profile),fatigueFactor(body.energy));
let vx=raw.vel.x,vy=raw.vel.y;
const results=[];
for(const read of sample.consumedThisTick.filter((v:any)=>v.role==='teammate')){
  const peer:any=actors.get(read.target),seen=read.cue;
  const dx=seen.pos.x-body.pos.x,dy=seen.pos.y-body.pos.y,d=Math.hypot(dx,dy);
  const touch=.9*(body.profile.radius+peer.profile.radius),gap=d-touch;
  const nx=dx/d,ny=dy/d;
  const brake=followAccel(body,{x:-nx*1e3,y:-ny*1e3},raw.cutSkill??1,capacity);
  const decel=Math.max(.1,-brake.x*nx-brake.y*ny);
  const current=Math.max(0,(body.vel.x-seen.vel.x)*nx+(body.vel.y-seen.vel.y)*ny);
  const stopping=current*.3+current*current/(2*decel);
  const before={x:vx,y:vy},rx=vx-seen.vel.x,ry=vy-seen.vel.y;
  const closing=rx*nx+ry*ny,speed2=rx*rx+ry*ry;
  const closest=speed2>1e-9?Math.max(0,(dx*rx+dy*ry)/speed2):0;
  const minimum=Math.hypot(dx-rx*closest,dy-ry*closest);
  const allowed=Math.sqrt((decel*.3)**2+2*decel*Math.max(0,gap))-decel*.3;
  let status='headway_outside';
  if(gap<=Math.max(1.2,stopping)){
    status=gap>0&&minimum>touch?'sweep_clear':'closure_within_limit';
    if(status!=='sweep_clear'&&closing>allowed){
      const cut=closing-allowed;vx-=nx*cut;vy-=ny*cut;status='corrected';
    }
  }
  const arx=body.vel.x-seen.vel.x,ary=body.vel.y-seen.vel.y,as2=arx*arx+ary*ary;
  const actualClosest=as2>1e-9?Math.max(0,(dx*arx+dy*ary)/as2):0;
  results.push({actor:peer.idx,slot:peer.slot,age:seen.age,status,d,touch,gap,nx,ny,decel,
    current,stopping,closing,allowed,closest,minimum,actualClosest,
    actualVelocityLineMinimum:Math.hypot(dx-arx*actualClosest,dy-ary*actualClosest),
    before,after:{x:vx,y:vy},cue:seen});
}
console.log(JSON.stringify({engineSha256:trace.sourceBefore,collectorSha256:trace.toolSha256,capacity,body,raw,results,reconstructed:{x:vx,y:vy},
  storedFinal:sample.finalDefenderIntent.vel,
  difference:{x:vx-sample.finalDefenderIntent.vel.x,y:vy-sample.finalDefenderIntent.vel.y}},null,2));
