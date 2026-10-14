/** Focused retained-input diagnostic; raw evidence stays in ignored out/. */
import{World}from'../../../src/physics/world.js';import{newSupport}from'../../../src/physics/support.js';
import{snapshot,restore,advance,difference}from'../../../src/physics/grip-timing.js';
import{LEG_SLIDE}from'../../../src/physics/grip-sliding.js';
import{writeFileSync,readFileSync,mkdirSync}from'node:fs';
import{sourceVersion}from'../../source-version.js';import{execFileSync}from'node:child_process';
mkdirSync('out/grip-native-forces',{recursive:true});
const baselineProfile=JSON.parse(readFileSync('config/baseline.json','utf8')),meta={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source:sourceVersion(),
 flags:Object.fromEntries(Object.keys(baselineProfile.flags).map(k=>[k,process.env[k]??null])),timestamp:new Date().toISOString()};
const profile={massKg:100,radius:.3,reach:1.6,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9};
let packet:any;const bodies=[0,1].map(x=>({pos:{x,y:0},vel:{x:0,y:0},facing:0,spin:1,energy:1,profile:{...profile},support:newSupport()})),w:any=new World(bodies,{handContact:'patch',substeps:1});
w.joints.push({kind:'grasp',a:bodies[0],b:bodies[1],capacity:500,reach:1.6,hold:1,legs:0,pull:0});
const old=w.integrateInterval;w.integrateInterval=function(...args:any[]){packet=snapshot(this,args);return old.apply(this,args);};w.step(bodies.map(()=>({vel:{x:0,y:0},free:true})),.025);
const runs=[] as any[];
for(const n of [8192,16384,32768,65536]){
 const q=restore(packet,World.prototype),transitions:any[]=[];let previous:any,uncertainty=0;
 const execute=(w:any,a:any[])=>{const j=w.joints[0],legs=j.legs;old.apply(w,a);const slipping=!!j.slipping;
  if(previous&&previous.slipping!==slipping){const increment=(1-Math.min(legs,previous.legs))*(1-Math.exp(-Math.max(a[3],previous.width)/LEG_SLIDE));
   uncertainty+=increment;transitions.push({time:w.time,slipping,legs,width:a[3],increment});}
  previous={slipping,legs,width:a[3]};};
 for(let k=0;k<n;k++)advance(q.w,q.args,.025/n,.025-k*.025/n,execute);
 runs.push({n,q,uncertainty,transitions});
}
const result=runs.slice(1).map((r,i)=>{const a=runs[i].q.w,b=r.q.w,j=b.joints[0],ja=a.joints[0];return{coarse:runs[i].n,fine:r.n,normalized:difference(a,b,[0,1]),finePhaseUncertainty:r.uncertainty,finePhaseUncertaintyNormalized:r.uncertainty/1e-6,transitions:r.transitions,legsDelta:Math.abs(ja.legs-j.legs),pointDelta:Math.hypot(a.graspPoint(ja).x-b.graspPoint(j).x,a.graspPoint(ja).y-b.graspPoint(j).y),bodyPosition:Math.max(...a.bodies.map((p:any,i:number)=>Math.hypot(p.pos.x-b.bodies[i].pos.x,p.pos.y-b.bodies[i].pos.y))),facing:Math.max(...a.bodies.map((p:any,i:number)=>Math.abs(p.facing-b.bodies[i].facing))),spin:Math.max(...a.bodies.map((p:any,i:number)=>Math.abs(p.spin-b.bodies[i].spin))),work:Math.abs(a.report.work.grasps-b.report.work.grasps)};});
writeFileSync('out/grip-native-forces/dry-cap.json',JSON.stringify({meta,result},null,2));console.log(result);

if(sourceVersion()!==meta.source)throw Error("Physics source changed during diagnosis");
