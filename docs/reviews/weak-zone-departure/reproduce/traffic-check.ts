import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {previewFreeMovement} from '../../src/physics/movement-preview.js';
import {followAccel,fatigueFactor} from '../../src/physics/kinematics.js';
import {availability,supportParams} from '../../src/physics/support.js';
const d=JSON.parse(gunzipSync(readFileSync('out/weak-departure/modifier.json.gz')).toString());
const initial=JSON.parse(gunzipSync(readFileSync('out/weak-departure/baseline.json.gz')).toString()).rows[0].initial;
const s=d.samples.find((s:any)=>s.t===2.5),a=s.body;
if(a.support.since===null)a.support.since=-Infinity;
const p=s.pictures.find((p:any)=>p.target==='LT').picture;
const touch=.9*(a.profile.radius+initial.find((b:any)=>b.slot==='LT').profile.radius);
function clearance(path:ReturnType<typeof previewFreeMovement>){
 let min=Math.hypot(a.pos.x-p.pos.x,a.pos.y-p.pos.y)-touch,px=a.pos.x-p.pos.x,py=a.pos.y-p.pos.y;
 for(const sample of path){
  const rx=sample.pos.x-p.pos.x-p.vel.x*sample.t,ry=sample.pos.y-p.pos.y-p.vel.y*sample.t;
  const ex=rx-px,ey=ry-py,t=Math.max(0,Math.min(1,-(px*ex+py*ey)/Math.max(1e-12,ex*ex+ey*ey)));
  min=Math.min(min,Math.hypot(px+ex*t,py+ey*t)-touch);px=rx;py=ry;
 }return min;
}
const dx=p.pos.x-a.pos.x,dy=p.pos.y-a.pos.y,dist=Math.hypot(dx,dy),nx=dx/dist,ny=dy/dist;
const capacity=availability(a.support,supportParams(a.profile),fatigueFactor(a.energy));
const brake=followAccel(a,{x:-nx*1e3,y:-ny*1e3},s.raw.cutSkill??1,capacity),decel=Math.max(.1,-brake.x*nx-brake.y*ny);
const closing=(s.raw.vel.x-p.vel.x)*nx+(s.raw.vel.y-p.vel.y)*ny;
const allowed=Math.sqrt((decel*.3)**2+2*decel*Math.max(0,dist-touch))-decel*.3;
const cut=closing-allowed,projected={x:s.raw.vel.x-nx*cut,y:s.raw.vel.y-ny*cut};
const out={t:s.t,touch,acquiredGap:dist-touch,capacity,decel,closing,allowed,projected,actualFinal:s.final.vel,
 raw:{clearance:clearance(previewFreeMovement(a,s.raw,s.t,12)),path:previewFreeMovement(a,s.raw,s.t,12)},
 final:{clearance:clearance(previewFreeMovement(a,s.final,s.t,12)),path:previewFreeMovement(a,s.final,s.t,12)},
 qualification:'same held command, own body and acquired LT constant velocity; free preview excludes future contact and peer decisions; not proof an alternative route is infeasible'};
writeFileSync('out/weak-departure/traffic-check.json',JSON.stringify(out));
console.log(JSON.stringify({...out,raw:{clearance:out.raw.clearance,end:out.raw.path.at(-1)},final:{clearance:out.final.clearance,end:out.final.path.at(-1)}}));
