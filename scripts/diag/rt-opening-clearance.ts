import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { previewFreeMovement } from '../../src/physics/movement-preview.ts';
import { World } from '../../src/physics/world.ts';
import { followAccel, fatigueFactor } from '../../src/physics/kinematics.ts';
import { availability, supportParams } from '../../src/physics/support.ts';
const packet=JSON.parse(gunzipSync(readFileSync(process.argv[2] ?? 'out/wide-zone-opening/awareness.json.gz')).toString());
let steps=0;const step=World.prototype.step;World.prototype.step=function(...args:any[]){steps++;return step.apply(this,args as any)};
const start=performance.now();
function swept(source:any,samples:any[],peer:any,touch:number){let px=source.pos.x-peer.pos.x,py=source.pos.y-peer.pos.y,minimum=Math.hypot(px,py)-touch;let at=0;for(const sample of samples){const rx=sample.pos.x-peer.pos.x-peer.vel.x*sample.t,ry=sample.pos.y-peer.pos.y-peer.vel.y*sample.t,ex=rx-px,ey=ry-py,along=Math.max(0,Math.min(1,-(px*ex+py*ey)/Math.max(1e-12,ex*ex+ey*ey))),clear=Math.hypot(px+along*ex,py+along*ey)-touch;if(clear<minimum){minimum=clear;at=sample.t-.05+along*.05}px=rx;py=ry}return {minimum,at};}
function nativePath(source:any,command:any,active:number,total:number){const body=structuredClone(source),world=new World([body],{handContact:'center'});world.time=.05;const samples:any[]=[];for(let k=0;k<total;k++){world.step([{...command,vel:k<active?command.vel:{x:0,y:0}}],.05);samples.push({t:(k+1)*.05,pos:{...body.pos},vel:{...body.vel},facing:body.facing,support:body.support!.state})}return samples;}
const rows=[];
for(const r of packet.panel.filter((r:any)=>r.input.id!=='uc12-wz-weak-s3')){
 const f=r.frames.find((x:any)=>x.t===.05),source=structuredClone(f.beforeBodies[2]);if(source.support.state==='up'&&source.support.since===null)source.support.since=-Infinity;
 const raw=f.requested[2],final=f.final[2],teIdx=r.input.flip?10:7,peer=r.cues.find((c:any)=>c.t===.05&&c.observer===2&&c.target===teIdx&&c.kind==='owned-teammate-information').picture,touch=.9*(source.profile.radius+f.beforeBodies[teIdx].profile.radius);
 const before=JSON.stringify({source,raw,final,peer});const dx=peer.pos.x-source.pos.x,dy=peer.pos.y-source.pos.y,d=Math.hypot(dx,dy),nx=dx/d,ny=dy/d,cap=availability(source.support,supportParams(source.profile),fatigueFactor(source.energy)),brake=followAccel(source,{x:-nx*1000,y:-ny*1000},raw.cutSkill,cap),decel=Math.max(.1,-brake.x*nx-brake.y*ny),gap=d-touch,rx=raw.vel.x-peer.vel.x,ry=raw.vel.y-peer.vel.y,closing=rx*nx+ry*ny,allowed=Math.sqrt((decel*.3)**2+2*decel*gap)-decel*.3;
 const paths:any[]=[];
 for(const [name,command,n] of [['heldRaw',raw,20],['heldFinal',final,20]] as any[]){const samples=previewFreeMovement(source,command,.05,n,'center');paths.push({name,samples,clearance03:swept(source,samples.filter(s=>s.t<=.3+1e-9),peer,touch),clearance06:swept(source,samples.filter(s=>s.t<=.6+1e-9),peer,touch),clearance10:swept(source,samples,peer,touch)})}
 for(const ticks of [1,2,4,6]){const samples=nativePath(source,raw,ticks,20);paths.push({name:`raw${ticks}TicksThenStop`,samples,clearance03:swept(source,samples.filter(s=>s.t<=.3+1e-9),peer,touch),clearance06:swept(source,samples.filter(s=>s.t<=.6+1e-9),peer,touch),clearance10:swept(source,samples,peer,touch)})}
 // All same-team pictures as actually consumed: no future movement or unseen teammate requests.
 const peers=r.cues.filter((c:any)=>c.t===.05&&c.observer===2&&c.kind==='owned-teammate-information').map((c:any)=>({idx:c.target,picture:c.picture,touch:.9*(source.profile.radius+f.beforeBodies[c.target].profile.radius)}));
 for(const path of paths)path.allPeerClearance=peers.map((p:any)=>({idx:p.idx,...swept(source,path.samples,p.picture,p.touch)}));
 assert.equal(JSON.stringify({source,raw,final,peer}),before);
 rows.push({id:r.input.id,teIdx,source,raw,final,peer,touch,gap,decel,closing,allowed,paths});
}
const result={protocol:'rt-opening-clearance-saved-state-v1',revision:packet.revision,sourceSha256:packet.sourceSha256,packetPath:'out/wide-zone-opening/awareness.json.gz',settings:packet.flags,contactModel:'center',decisionTime:.05,forecast:'Production World held commands in empty space against actual consumed constant-velocity teammate pictures. No native controllers or future information. rawNThenStop changes only ordinary velocity request after N ticks, preserves facing/posture/skill.',worldSteps:steps,newNativePlays:0,newGames:0,elapsedSeconds:(performance.now()-start)/1000,rows};
writeFileSync(process.argv[3] ?? 'out/wide-zone-opening/forecast-probe.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({worldSteps:steps,elapsedSeconds:result.elapsedSeconds,rows:rows.map((r:any)=>({id:r.id,touch:r.touch,gap:r.gap,decel:r.decel,closing:r.closing,allowed:r.allowed,paths:r.paths.map((p:any)=>({name:p.name,clearance03:p.clearance03,clearance06:p.clearance06,clearance10:p.clearance10,allPeerWorst:p.allPeerClearance.reduce((a:any,b:any)=>a.minimum<b.minimum?a:b),end:p.samples.at(-1)}))}))},null,2));
