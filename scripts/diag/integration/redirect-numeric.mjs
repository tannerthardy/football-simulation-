import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2], output=process.argv[3];
const {PlaySim}=await import(pathToFileURL(join(root,'src/sim/playsim.ts')));
const {redirect}=await import(pathToFileURL(join(root,'src/lab/scenarios.ts')));
const {CENTER_Y}=await import(pathToFileURL(join(root,'src/core/field.ts')));
const rows=[];
const tick=PlaySim.prototype.tick;
PlaySim.prototype.tick=function(){
 const who=this.agents.filter(a=>['RT','DE_S','QB'].includes(a.slot));
 const state=()=>who.map(a=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing,
  spin:a.body.omega,energy:a.body.energy,engaged:!!a.engagement,
  support:{state:a.body.support.state,xi:{...a.body.support.xi},lean:{...a.body.support.lean},
   feetVel:{...a.body.support.feetVel},peak:a.body.support.peak},
  command:this.cmds[a.idx],intent:this.intents[a.idx]}));
 const before=state(),time=this.t;
 const value=tick.call(this);
 rows.push({t:time,before,after:state(),events:this.events.filter(e=>Math.abs(e.t-time)<1e-9)});
 return value;
};
const arms=[];
for(const handContact of ['center','patch'])for(const side of [1,-1]){
 rows.length=0;
 const start=performance.now();
 const result=redirect({side,handContact,maxT:6});
 arms.push({handContact,side,result,seconds:(performance.now()-start)/1000,trace:structuredClone(rows)});
}
const summaries=[];
for(const handContact of ['center','patch']){
 const r=arms.find(a=>a.side===1&&a.handContact===handContact),l=arms.find(a=>a.side===-1&&a.handContact===handContact);
 const comparisons=[];
 for(let i=0;i<r.trace.length;i++){
  const right=r.trace[i],left=l.trace[i];
  if(!left)break;
  const errors={t:right.t,pos:0,vel:0,facing:0,spin:0,energy:0,xi:0,lean:0,command:0};
  for(let j=0;j<right.after.length;j++){
   const a=right.after[j],b=left.after[j];
   errors.pos=Math.max(errors.pos,Math.abs(a.pos.x-b.pos.x),Math.abs(a.pos.y+b.pos.y-2*CENTER_Y));
   errors.vel=Math.max(errors.vel,Math.abs(a.vel.x-b.vel.x),Math.abs(a.vel.y+b.vel.y));
   errors.facing=Math.max(errors.facing,Math.abs(Math.atan2(Math.sin(a.facing+b.facing),Math.cos(a.facing+b.facing))));
   errors.spin=Math.max(errors.spin,Math.abs((a.spin??0)+(b.spin??0)));
   errors.energy=Math.max(errors.energy,Math.abs(a.energy-b.energy));
   for(const key of ['xi','lean'])errors[key]=Math.max(errors[key],Math.abs(a.support[key].x-b.support[key].x),Math.abs(a.support[key].y+b.support[key].y));
   errors.command=Math.max(errors.command,Math.abs((a.command?.vel.x??0)-(b.command?.vel.x??0)),Math.abs((a.command?.vel.y??0)+(b.command?.vel.y??0)));
  }
  comparisons.push(errors);
 }
 const reqs=r.result.postShedProtection.map((a,i)=>{const b=l.result.postShedProtection[i];return {t:a.t,target:a.target,mirrorTarget:b?.target,x:Math.abs(a.request.vel.x-b.request.vel.x),y:Math.abs(a.request.vel.y+b.request.vel.y),facing:Math.abs((a.request.facing??0)+(b.request.facing??0))};});
 summaries.push({handContact,closestDifference:Math.abs(r.result.closest-l.result.closest),requests:r.result.postShedProtection.length,mirrorRequests:l.result.postShedProtection.length,firstNumericDifference:comparisons.find(a=>Math.max(a.pos,a.vel,a.facing,a.energy)>0),firstBeyondTolerance:comparisons.find(a=>Math.max(a.pos,a.vel,a.facing,a.command)>5e-10),maxErrors:Object.fromEntries(['pos','vel','facing','spin','energy','xi','lean','command'].map(k=>[k,Math.max(...comparisons.map(a=>a[k]))])),requestFirstFail:reqs.find(a=>Math.max(a.x,a.y,a.facing)>5e-10),requestMax:Object.fromEntries(['x','y','facing'].map(k=>[k,Math.max(...reqs.map(a=>a[k]))])),comparisons,requestErrors:reqs});
}
writeFileSync(output,JSON.stringify({root,arms,summaries},null,2)+'\n');
console.log(JSON.stringify({output,totalSeconds:arms.reduce((s,a)=>s+a.seconds,0),summary:summaries.map(({comparisons,requestErrors,...a})=>a)},null,2));
