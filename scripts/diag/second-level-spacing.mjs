/** Offline reconstruction of the existing radial spacing cuts; zero World steps. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {availability,supportParams} from '../../src/physics/support.ts';
import {fatigueFactor,enduranceFactor,followAccel} from '../../src/physics/kinematics.ts';
const [path='out/second-level-access/spacing/trace.json.gz',destination='out/second-level-access/spacing-attribution.json']=process.argv.slice(2);
const packet=JSON.parse(gunzipSync(readFileSync(path))),row=packet.rows[0],rows=[];
for(const t of [2.4,2.45,2.5]){
 const f=row.frames.find(f=>f.t===t),body=f.before[2],profile=body.profile,original=f.preSpacing[2];
 const capacity=availability(body.support,supportParams(profile),fatigueFactor(body.energy));
 let vx=original.vel.x,vy=original.vel.y;const cuts=[];
 for(const read of row.reads.filter(r=>r.t===t&&r.context==='spacing')){
  const seen=structuredClone(read.picture),called=read.calledMotion;
  if(called){const age=seen.age??0;seen.pos.x+=(called.x-seen.vel.x)*age;seen.pos.y+=(called.y-seen.vel.y)*age;seen.vel=called;}
  const dx=seen.pos.x-body.pos.x,dy=seen.pos.y-body.pos.y,d=Math.hypot(dx,dy);
  const touch=.9*(profile.radius+row.initial[read.b].profile.radius),gap=d-touch;
  if(d<1e-6)continue;const nx=dx/d,ny=dy/d;
  const brake=followAccel(body,{x:-nx*1e3,y:-ny*1e3},original.cutSkill??1,capacity);
  const decel=Math.max(.1,-brake.x*nx-brake.y*ny),current=Math.max(0,(body.vel.x-seen.vel.x)*nx+(body.vel.y-seen.vel.y)*ny);
  const stopping=current*.3+current*current/(2*decel);
  if(gap>Math.max(1.2,stopping))continue;
  const rx=vx-seen.vel.x,ry=vy-seen.vel.y,closing=rx*nx+ry*ny,speed2=rx*rx+ry*ry;
  const closest=speed2>1e-9?Math.max(0,(dx*rx+dy*ry)/speed2):0;
  if(gap>0&&Math.hypot(dx-rx*closest,dy-ry*closest)>touch)continue;
  const allowed=Math.sqrt((decel*.3)**2+2*decel*Math.max(0,gap))-decel*.3;
  if(closing>allowed){const before={x:vx,y:vy},cut=closing-allowed;vx-=nx*cut;vy-=ny*cut;
   cuts.push({peer:read.b,slot:row.initial[read.b].slot,picture:read.picture,called,ownBody:body,
    gap,relativeClosing:closing,allowed,closestRayTime:closest,before,after:{x:vx,y:vy}});}
 }
 const cap=profile.vmax*fatigueFactor(body.energy)*enduranceFactor(body)*(1-.08*(body.squeeze??0));
 const scale=Math.min(1,cap/Math.max(1e-9,Math.hypot(vx,vy)));vx*=scale;vy*=scale;
 assert(Math.hypot(vx-f.final[2].vel.x,vy-f.final[2].vel.y)<1e-12,'Radial cuts must reproduce actual delivered command; do not attribute a later gather incorrectly');
 rows.push({t,original:original.vel,delivered:f.final[2].vel,achieved:f.after[2].vel,cuts});
}
writeFileSync(destination,JSON.stringify({source:packet.receipt.sourceSha256,question:'Which acquired teammate picture removes the new RT interception demand?',zeroWorldSteps:true,rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({t:r.t,original:r.original,delivered:r.delivered,peers:r.cuts.map(c=>({slot:c.slot,gap:c.gap,closing:c.relativeClosing,allowed:c.allowed}))})),null,2));
