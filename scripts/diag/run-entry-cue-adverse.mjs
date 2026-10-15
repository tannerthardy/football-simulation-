// One saved-state diagnostic: can the consumed RG motion justify the clear
// release, and when does the model first miss the achieved motion? No play run.
import{readFileSync,writeFileSync}from'node:fs';
import{gunzipSync}from'node:zlib';
import{resolve}from'node:path';
import{pathToFileURL}from'node:url';
import{createHash}from'node:crypto';
const start=performance.now(),[enginePath,nativePath,outPath]=process.argv.slice(2);
const{previewFreeMovement}=await import(pathToFileURL(resolve(enginePath,'src/physics/movement-preview.ts')).href);
const{supportParams}=await import(pathToFileURL(resolve(enginePath,'src/physics/support.ts')).href);
const tape=JSON.parse(gunzipSync(readFileSync(nativePath))),r=tape.rows.find(r=>r.role==='failing-entry');
const touch=(.9*(r.input.actors[5].profile.radius+r.input.actors[6].profile.radius));
function swept(body,samples,peer,touch){let px=body.pos.x-peer.pos.x,py=body.pos.y-peer.pos.y,min=Math.hypot(px,py)-touch,at=0;
 for(const s of samples){const rx=s.pos.x-peer.pos.x-peer.vel.x*s.t,ry=s.pos.y-peer.pos.y-peer.vel.y*s.t;
 const dx=rx-px,dy=ry-py,u=Math.max(0,Math.min(1,-(px*dx+py*dy)/Math.max(1e-12,dx*dx+dy*dy)));
 const c=Math.hypot(px+u*dx,py+u*dy)-touch;if(c<min){min=c;at=s.t;}px=rx;py=ry;}return{clearance:min,by:at};}
const impacts=r.frames.flatMap(f=>f.report.contacts.filter(c=>c.i<11&&c.j<11&&c.impulse>1e-8).map(c=>({step:f.t,reportedBy:f.t+.05,...c})));
const states=[1.95,2.05,2.15,2.25,2.3].map(t=>{const f=r.frames.find(f=>Math.abs(f.t-t)<1e-8),b=f.before[6];
 const peers=r.cues.filter(c=>c.t===t&&c.kind==='owned').map(c=>({...c.picture,idx:c.target,touch:.9*(b.profile.radius+r.input.actors[c.target].profile.radius)}));
 const rg=peers.find(p=>p.idx===5);if(!rg)throw Error('Missing acquired RG');
 const requests={raw:f.raw[6],executed:f.final[6],half:{...f.raw[6],vel:{x:f.raw[6].vel.x*.5,y:f.raw[6].vel.y*.5}},gather:{...f.raw[6],vel:{x:0,y:0}}};
 const previews=Object.fromEntries(Object.entries(requests).map(([name,cmd])=>{const samples=previewFreeMovement(b,cmd,t,12);
  const clearances=peers.map(p=>({idx:p.idx,...swept(b,samples,p,p.touch)})).sort((a,b)=>a.clearance-b.clearance);
  return[name,{rg:swept(b,samples,rg,touch),worst:clearances[0],offFeet:samples.some(s=>s.support!=='up'),end:samples.at(-1)}];}));
 const actual=r.frames.filter(g=>g.t>=t&&g.t<t+.6).map(g=>({t:g.t+.05-t,pos:g.after[6].pos}));
 const later=r.frames.find(g=>Math.abs(g.t-(t+.45))<1e-8);
 return{t,ownPos:b.pos,ownVel:b.vel,ownSpeed:Math.hypot(b.vel.x,b.vel.y),rgPicture:rg,rgActual:f.before[5].pos,requests,previews,
  achievedPathAgainstConsumedRG:swept(b,actual,rg,touch),rgLater:later?{t:later.t,pos:later.before[5].pos,vel:later.before[5].vel,
   picturedPos:{x:rg.pos.x+rg.vel.x*(later.t-t),y:rg.pos.y+rg.vel.y*(later.t-t)}}:null};});
const result={question:'Does the new teammate hit come from hidden/random context or an unsafe approach under the acquired picture?',
 nativeSha256:createHash('sha256').update(readFileSync(nativePath)).digest('hex'),rootSource:tape.rootSourceSha256,isolatedSource:tape.isolatedSourceSha256,
 impacts,touch,states,physicalScrimmages:0,completedGames:0,previewWorldSteps:states.length*4*12,elapsedSeconds:(performance.now()-start)/1000};
writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({impacts,states:states.map(s=>({t:s.t,speed:s.ownSpeed,preview:s.previews,achievedPathAgainstConsumedRG:s.achievedPathAgainstConsumedRG})),elapsedSeconds:result.elapsedSeconds}));
