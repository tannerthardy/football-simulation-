/** Saved-stage analysis; no native play or new sensing. */
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fatigueFactor, followAccel } from '../../src/physics/kinematics.js';
import { availability, supportParams } from '../../src/physics/support.js';
const root=process.argv[2],output=process.argv[3],rows:any[]=[];
for(const id of ['A028','A018','A006']){
 const saved=JSON.parse(gunzipSync(readFileSync(`${root}/${id}.json.gz`)).toString());
 for(const tick of saved.ticks)for(let i=0;i<22;i++){
  const a=tick.before[i],raw=tick.preSpacing[i];
  if(!raw||raw.free||raw.dive||a.support?.state!=='up')continue;
  let v={...raw.vel};const constraints:any[]=[],changes:any[]=[];
  const capacity=availability(a.support,supportParams(a.profile),fatigueFactor(a.energy));
  for(const picture of tick.pictures.filter((p:any)=>p.spacing&&p.a===i)){
   const b=tick.before[picture.b],seen=picture.seen;
   const dx=seen.pos.x-a.pos.x,dy=seen.pos.y-a.pos.y,d=Math.hypot(dx,dy),touch=.9*(a.profile.radius+b.profile.radius),gap=d-touch;
   if(d<1e-6)continue;
   const nx=dx/d,ny=dy/d,brake=followAccel(a,{x:-nx*1e3,y:-ny*1e3},raw.cutSkill??1,capacity);
   const decel=Math.max(.1,-brake.x*nx-brake.y*ny),current=Math.max(0,(a.vel.x-seen.vel.x)*nx+(a.vel.y-seen.vel.y)*ny);
   if(gap>Math.max(1.2,current*.3+current*current/(2*decel)))continue;
   const rx=v.x-seen.vel.x,ry=v.y-seen.vel.y,v2=rx*rx+ry*ry,t=v2>1e-9?Math.max(0,(dx*rx+dy*ry)/v2):0;
   if(gap>0&&Math.hypot(dx-rx*t,dy-ry*t)>touch)continue;
   const allowed=Math.sqrt((decel*.3)**2+2*decel*Math.max(0,gap))-decel*.3;
   const closing=rx*nx+ry*ny,c={peer:picture.b,nx,ny,limit:allowed+seen.vel.x*nx+seen.vel.y*ny};constraints.push(c);
   if(closing>allowed){v.x-=nx*(closing-allowed);v.y-=ny*(closing-allowed);changes.push(picture.b);}
  }
  const violations=constraints.filter(c=>v.x*c.nx+v.y*c.ny>c.limit+1e-7).map(c=>({...c,excess:v.x*c.nx+v.y*c.ny-c.limit}));
  if(violations.length)rows.push({id,t:tick.t,actor:i,kind:saved.actors[i].slot,raw,projected:v,final:tick.final[i],changes,constraints,violations});
 }
}
writeFileSync(output,JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({count:rows.length,byActor:Object.entries(Object.groupBy(rows,r=>`${r.id}:${r.kind}`)).map(([actor,rs])=>({actor,n:rs!.length,first:rs![0].t,worst:Math.max(...rs!.flatMap(r=>r.violations.map((v:any)=>v.excess)))})),first:rows.slice(0,3)}));
