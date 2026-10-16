/** Same-state saved-stage forecasts. No play, sensing, or random draws. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {previewFreeMovement,type MovementSample} from '../../src/physics/movement-preview.js';
import type {Body} from '../../src/physics/kinematics.js';
import type {Intent} from '../../src/physics/world.js';
const input=process.argv[2],out=process.argv[3];
const saved=JSON.parse(gunzipSync(readFileSync(input)).toString()),rows=[];
for(const tick of saved.ticks){
 if(tick.t<1.7||tick.t>2.75)continue;
 const body:Body=tick.before[6],raw:Intent=tick.preSpacing[6],chosen:Intent=tick.final[6];
 const peers=tick.pictures.filter((p:any)=>p.spacing&&p.a===6);
 function clearance(path:MovementSample[],p:any):number{
  const seen=p.seen,touch=.9*(body.profile.radius+tick.before[p.b].profile.radius);
  let x=body.pos.x-seen.pos.x,y=body.pos.y-seen.pos.y,best=Math.hypot(x,y)-touch;
  for(const s of path){
   const nx=s.pos.x-seen.pos.x-seen.vel.x*s.t,ny=s.pos.y-seen.pos.y-seen.vel.y*s.t;
   const dx=nx-x,dy=ny-y,u=Math.max(0,Math.min(1,-(x*dx+y*dy)/Math.max(1e-12,dx*dx+dy*dy)));
   best=Math.min(best,Math.hypot(x+u*dx,y+u*dy)-touch);x=nx;y=ny;
  }return best;
 }
 const forecast=(command:Intent)=>{
  const path=previewFreeMovement(body,command,tick.t,12),gaps=peers.map((p:any)=>({peer:p.b,age:p.seen.age,gap:clearance(path,p)}));
  return {min:Math.min(...gaps.map((p:any)=>p.gap)),gaps,end:path.at(-1),upright:path.every(s=>s.support==='up')};
 };
 rows.push({t:tick.t,own:body.pos,velocity:body.vel,raw,chosen,peers:peers.map((p:any)=>({peer:p.b,seen:p.seen})),
  paths:{raw:forecast(raw),chosen:forecast(chosen),half:forecast({...raw,vel:{x:raw.vel.x*.5,y:raw.vel.y*.5}}),gather:forecast({...raw,vel:{x:0,y:0}})}});
}
writeFileSync(out,JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows.filter(r=>r.raw.vel.x!==r.chosen.vel.x||r.raw.vel.y!==r.chosen.vel.y).map(r=>({t:r.t,raw:r.paths.raw.min,chosen:r.paths.chosen.min,half:r.paths.half.min,gather:r.paths.gather.min,peer:r.paths.raw.gaps.filter((p:any)=>p.gap<0)}))));
