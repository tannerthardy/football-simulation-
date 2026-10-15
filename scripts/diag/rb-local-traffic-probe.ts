/** Same saved body/cues, ordinary movement; no production policy changed. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Agent} from '../../src/sim/agent.js';
import {previewFreeMovement} from '../../src/physics/movement-preview.js';
import {spaceTeammates} from '../../src/sim/spacing.js';
import {CONTACT_SCALE,type Intent} from '../../src/physics/world.js';
const start=performance.now(),data=JSON.parse(gunzipSync(readFileSync('out/rb-local-traffic/saved.json.gz')).toString());
const result=[];
for(const state of data.states){
 const agents=state.actors.map((p:any,i:number)=>new Agent(i,p.team,p.slot,p.player,p.profile,structuredClone(state.bodies[i]),{kind:'idle',update:()=>({vel:{x:0,y:0}})}));
 const a=agents[6],raw=state.raw[6],speed=Math.hypot(raw.vel.x,raw.vel.y),h=Math.atan2(raw.vel.y,raw.vel.x);
 const constrained=state.joints.some((j:any)=>j.a===6||j.b===6),support=a.body.support;
 const intents=structuredClone(state.raw);spaceTeammates(agents,intents,(_a,b)=>state.pictures[b.idx]??{pos:{x:1000,y:1000},vel:{x:0,y:0}},{now:state.t,constrained:new Set(state.joints.flatMap((j:any)=>[agents[j.a].body,agents[j.b].body]))});
 const candidates=[['raw',raw],['current',intents[6]],...[-30,-15,15,30].map(deg=>[String(deg),{...raw,vel:{x:Math.cos(h+deg*Math.PI/180)*speed,y:Math.sin(h+deg*Math.PI/180)*speed}}])];
 const choices=candidates.map(([label,request]:any)=>{
  const path=previewFreeMovement(a.body,request,state.t,12);let gap=Infinity,peer=-1,previous=a.pos;
  for(const sample of path){
   for(const [key,p] of Object.entries(state.pictures) as any){
    const i=Number(key),touch=CONTACT_SCALE*(a.profile.radius+agents[i].profile.radius),t0=sample.t-.05;
    const x0=previous.x-p.pos.x-p.vel.x*t0,y0=previous.y-p.pos.y-p.vel.y*t0;
    const x1=sample.pos.x-p.pos.x-p.vel.x*sample.t,y1=sample.pos.y-p.pos.y-p.vel.y*sample.t;
    const dx=x1-x0,dy=y1-y0,u=Math.max(0,Math.min(1,-(x0*dx+y0*dy)/Math.max(1e-12,dx*dx+dy*dy)));
    const g=Math.hypot(x0+u*dx,y0+u*dy)-touch;if(g<gap){gap=g;peer=i;}
   }
   previous=sample.pos;
  }
  const end=path.at(-1)!;return {label,request,gap,peer,progress:(end.pos.x-a.pos.x)*Math.cos(h)+(end.pos.y-a.pos.y)*Math.sin(h),up:path.every(p=>p.support==='up')};
 });
 result.push({id:state.id,constrained,load:support.load,lean:support.lean,speed:Math.hypot(a.vel.x,a.vel.y),choices});
}
const out={question:'Does a small achievable bend preserve the same football direction around already acquired teammate traffic?',rows:result,elapsedSeconds:(performance.now()-start)/1000};writeFileSync('out/rb-local-traffic/probe.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out));
