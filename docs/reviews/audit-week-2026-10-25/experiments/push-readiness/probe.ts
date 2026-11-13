/** Declared synthetic two-body readiness probe; no production edits or NFL claims. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import type {Body} from '../../src/physics/kinematics.js';
import {fatigueFactor} from '../../src/physics/kinematics.js';
import {World,type Intent} from '../../src/physics/world.js';
import {availability,criticalDeviation,deviationFraction,newSupport,supportParams} from '../../src/physics/support.js';

const dt=.05, pulseTicks=2, ticks=24;
const cases=[
 {name:'balanced-upright',posture:.2,xi:0,vx:0,vy:0,facing:0},
 {name:'balanced-low',posture:.8,xi:0,vx:0,vy:0,facing:0},
 {name:'recovering-with-push',posture:.2,xi:.65,vx:0,vy:0,facing:0},
 {name:'recovering-against-push',posture:.2,xi:-.65,vx:0,vy:0,facing:0},
 {name:'facing-sideways',posture:.2,xi:0,vx:0,vy:0,facing:Math.PI/2},
 {name:'moving-transverse',posture:.2,xi:0,vx:0,vy:3,facing:Math.PI/2},
 {name:'moving-against-push',posture:.2,xi:0,vx:-3,vy:0,facing:Math.PI},
 {name:'moving-with-push',posture:.2,xi:0,vx:3,vy:0,facing:0},
];
const profile=(mass:number)=>({massKg:mass,radius:.3,reach:1,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:mass,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9});
function run(c:typeof cases[number],force:number,substeps?:number,reaction=.25){
 const p=profile(100);p.reactionTime=reaction;
 const target:Body={pos:{x:0,y:0},vel:{x:c.vx,y:c.vy},facing:c.facing,energy:1,profile:p,support:newSupport(c.posture)};
 const actor:Body={pos:{x:-.9,y:0},vel:{x:c.vx,y:c.vy},facing:0,energy:1,profile:profile(130),support:newSupport(.6)};
 const sp=supportParams(p),crit=criticalDeviation(sp,c.posture,0,1);
 target.support!.xi={x:c.xi*crit,y:0};
 target.support!.out=c.xi? .06:0;
 const w=new World([actor,target],substeps?{substeps}:{});
 const initial=structuredClone({actor,target});
 const command:Intent={vel:{x:c.vx,y:c.vy},facing:c.facing,posture:c.posture};
 const sourceCommand:Intent={vel:{x:c.vx,y:c.vy},facing:0,posture:.6};
 const rows=[];
 for(let k=0;k<ticks;k++){
   if(k<pulseTicks&&force)w.strike(actor,target,{x:force*dt,y:0});
   const r=w.step([sourceCommand,command],dt),s=target.support!;
   assert(r.armImpulse.every((v,i)=>v<=r.armImpulseLimit[i]+1e-7));
   assert(r.armWork.every((v,i)=>v<=r.armWorkLimit[i]+1e-7));
   const momentum={x:actor.profile.massKg*(actor.vel.x-initial.actor.vel.x)+target.profile.massKg*(target.vel.x-initial.target.vel.x),y:actor.profile.massKg*(actor.vel.y-initial.actor.vel.y)+target.profile.massKg*(target.vel.y-initial.target.vel.y)};
   rows.push({t:(k+1)*dt,pos:{...target.pos},vel:{...target.vel},facing:target.facing,state:s.state,xi:{...s.xi},deviation:deviationFraction(s,sp,fatigueFactor(target.energy)),availability:availability(s,sp,fatigueFactor(target.energy)),posture:s.posture,delivered:r.strikes.reduce((a,j)=>a+j.impulse.x,0),contacts:r.contacts.map(x=>({impulse:x.impulse,closing:x.closing})),substeps:r.substeps,energy:target.energy,workResidual:r.work.residual,momentum});
 }
 return {initial,command,sourceCommand,rows,model:{handContact:w.handContact,supportModel:w.supportModel,supportIntegration:w.supportIntegration}};
}
const runs:any[]=[],summary:any[]=[];
for(const c of cases){
 const plain=run(c,0);
 for(const force of [400,800]){
   const treated=run(c,force),rows=treated.rows;
   const speed=(r:any)=>Math.hypot(r.vel.x,r.vel.y);
   const pulse=rows[pulseTicks-1],ref=plain.rows[pulseTicks-1];
   const difference=(r:any,i:number)=>Math.hypot(r.vel.x-plain.rows[i].vel.x,r.vel.y-plain.rows[i].vel.y);
   let recovery:number|null=null;
   for(let i=pulseTicks;i<rows.length-1;i++)if(rows.slice(i,i+2).every((r:any,j:number)=>r.state==='up'&&r.availability>=.99&&difference(r,i+j)<=.1)){recovery=rows[i].t;break;}
   const item={case:c.name,force,requestedImpulse:force*dt*pulseTicks,deliveredImpulse:rows.reduce((a:any,r:any)=>a+r.delivered,0),initialDeviation:c.xi,pulseSpeed: speed(pulse),plainPulseSpeed:speed(ref),pulseDeltaVx:pulse.vel.x-ref.vel.x,pulseDeltaVy:pulse.vel.y-ref.vel.y,pulseAvailability:pulse.availability,plainPulseAvailability:ref.availability,minAvailability:Math.min(...rows.map((r:any)=>r.availability)),plainMinAvailability:Math.min(...plain.rows.map((r:any)=>r.availability)),peakDeviation:Math.max(...rows.map((r:any)=>r.deviation)),plainPeakDeviation:Math.max(...plain.rows.map((r:any)=>r.deviation)),falls:rows.some((r:any)=>r.state!=='up'),plainFalls:plain.rows.some((r:any)=>r.state!=='up'),recoverBy:recovery,maxPathDifference:Math.max(...rows.map((r:any,i:number)=>Math.hypot(r.pos.x-plain.rows[i].pos.x,r.pos.y-plain.rows[i].pos.y))),maxSpeedLoss:Math.max(...rows.map((r:any,i:number)=>speed(plain.rows[i])-speed(r))),bodyContactImpulse:rows.reduce((a:any,r:any)=>a+r.contacts.reduce((b:number,x:any)=>b+x.impulse,0),0)};
   summary.push(item);runs.push({case:c,force,plain,treated});
 }
}
// Same physical state and commands: changing a mental latency profile field
// alone must not be mistaken for an anticipatory physical preparation.
const fast=run(cases[0],800,undefined,.1),slow=run(cases[0],800,undefined,.5);
assert.deepEqual(fast.rows,slow.rows);
// One higher-resolution qualification, using exactly the same requests.
const refinements=cases.slice(0,4).map(c=>({case:c.name,coarse:run(c,800,12),fine:run(c,800,48)}));
const record={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,units:'yards, seconds, kg; force kg*yd/s^2',scope:'synthetic two-body constant +x push, .10s duration; paired no-push within each declared physical state; no claims about native move selection, mental surprise, NFL calibration or population frequency',cases,dt,pulseTicks,ticks,forces:[400,800],mentalFieldOnlyExact:true,summary,runs,refinements};
mkdirSync('out/push-readiness',{recursive:true});
writeFileSync('out/push-readiness/results.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({source:record.source,node:record.node,mentalFieldOnlyExact:true,summary},null,2));
