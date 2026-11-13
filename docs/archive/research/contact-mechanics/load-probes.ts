/** Tiny branch-only law/operator witnesses; no root engine changes. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {World,type Intent} from './src/physics/world.js';
import {newSupport,supportParams,baseRadiusAt} from './src/physics/support.js';
import type {Body} from './src/physics/kinematics.js';
import {G} from './src/core/units.js';
import {sourceVersion} from './scripts/source-version.js';
const profile={massKg:140,radius:.38,reach:1,heightYd:2.13,vmax:7,tau:1.3,brake:5,lateral:5,turnRate:8,
 backpedal:.5,shuffle:.5,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:154,balance:.5,bend:.3,padBend:1,stepSpeed:3,getUp:1};
const sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function body(x:number,y:number,facing:number,posture:number,mass=140):Body{
 return {pos:{x,y},vel:{x:0,y:0},facing,energy:1,profile:{...profile,massKg:mass,power:mass*1.1},support:newSupport(posture)};}
const cohort={branch:'88bfc45147f58f670444f3d1159c288bafff1521',profile,dt:.05,substeps:12,ticks:4,
 pair:{positions:[[0,0],[.74,0]],posture:[.9,0],velocities:[[2,0],[-2,0]]},
 bystander:{position:[100,20],velocity:[0,0],contact:'none'},
 yaw:{highBodyInitialFacing:'PI/2',highBodyCommandFacing:'PI',highBodyDesiredVelocity:[0,0]},
 multiContact:{positions:[[.7,.4],[.7,-.4],[0,0]],massKg:[140,140,100],posture:[.9,.9,0],
  initialVelocity:[[-4,0],[-4,0],[0,0]],handExtension:1.2,dt:.01,substeps:1},
 declaration:'Prescribed current-schema lawful bodies; distant bystander and combined budget disproofs only. No outcome or NFL tuning.'};
function pair(spectator:boolean,yaw:boolean,observe=true){
 const a=body(0,0,0,.9),b=body(.74,0,yaw?Math.PI/2:Math.PI,0),bs=[a,b];
 if(spectator)bs.push(body(100,20,0,0,100));
 const world=new World(bs,{substeps:12}),w=world as any;
 world.joints.push({kind:'hands',a,b,extension:.95,push:supportParams(a.profile).armForce,hold:0,steer:0});
 const intents:Intent[]=[{vel:{x:2,y:0},facing:0,push:1,posture:.9},
  {vel:{x:yaw?0:-2,y:0},facing:Math.PI,push:1,posture:0}];
 if(spectator)intents.push({vel:{x:0,y:0},facing:0});
 const feet:any[]=[],ticks:any[]=[],oldFeet=w.feet;
 if(observe)w.feet=function(...args:any[]){const i=args[0],h=args[3],r=args[5],load=this.vLoad[i],
  before={x:r.groundImpulse[i].x,y:r.groundImpulse[i].y,yaw:r.groundYawImpulse[i],limit:r.tractionImpulse[i]};
  const result=oldFeet.apply(this,args),radius=baseRadiusAt(supportParams(bs[i].profile),bs[i].support!.posture),
   x=r.groundImpulse[i].x-before.x,y=r.groundImpulse[i].y-before.y,angular=r.groundYawImpulse[i]-before.yaw,
   limit=r.tractionImpulse[i]-before.limit,combined=Math.hypot(x,y,angular/radius);
  feet.push({t:this.time,i,h,verticalLoad:load,translationImpulse:{x,y},yawImpulse:angular,lever:radius,
   reportedTractionImpulse:limit,combinedImpulse:combined,combinedFraction:combined/limit,nominalTraction:supportParams(bs[i].profile).traction});return result;};
 for(let k=0;k<4;k++){const report=world.step(intents,.05);ticks.push({t:world.time,bodies:bs.slice(0,2).map(v=>structuredClone(v)),report});}
 return {spectator,yaw,feet:feet.filter(f=>f.i<2),ticks,pairFinalSha256:sha(bs.slice(0,2)),final:bs.slice(0,2).map(v=>structuredClone(v))};
}
const noSpectator=pair(false,false),distantSpectator=pair(true,false),yaw=pair(false,true);
const observerChecks=[[noSpectator,false,false],[distantSpectator,true,false],[yaw,false,true]].map(([seen,spectator,turn])=>{
 const observed=seen as ReturnType<typeof pair>,plain=pair(spectator as boolean,turn as boolean,false),
  same=sha({ticks:observed.ticks,final:observed.final})===sha({ticks:plain.ticks,final:plain.final});
 if(!same)throw new Error('Observer changed branch witness');return {spectator,turn,exact:same};});
const firstChangedFoot=noSpectator.feet.map((f,i)=>({plain:f,spectator:distantSpectator.feet[i]}))
 .find(p=>p.plain.verticalLoad!==p.spectator.verticalLoad);
const yawViolation=yaw.feet.filter(f=>f.i===1&&f.verticalLoad>1e-8).sort((a,b)=>b.combinedFraction-a.combinedFraction)[0];
// Multi-contact vertical normal transfer uses the same original arm/contact laws.
function multiLoad(){const a=body(.7,.4,Math.PI,.9),b=body(.7,-.4,Math.PI,.9),target=body(0,0,0,0,100),world=new World([a,b,target],{substeps:1}),w=world as any;
 a.vel.x=b.vel.x=-4;for(const actor of [a,b])world.joints.push({kind:'hands',a:actor,b:target,extension:1.2,
  push:supportParams(actor.profile).armForce,hold:0,steer:0});
 const report=world.step([{vel:{x:-4,y:0},facing:Math.PI,posture:.9},{vel:{x:-4,y:0},facing:Math.PI,posture:.9},
  {vel:{x:0,y:0},facing:0,posture:0}],.01);
 return {verticalImpulse:[...w.vAcc],substepSeconds:.01,targetWeightImpulse:100*G*.01,
  targetLiftFraction:w.vAcc[2]/(100*G*.01),claimedMaximumFraction:.8,report};}
const report={schema:'run-blocking-load-witnesses-v1',sourceSha256:sourceVersion(),collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
 inputSha256:sha(cohort),cohort,observerChecks,bystander:{sameInitialPair:true,firstChangedFoot,
  firstTickPairExact:sha(noSpectator.ticks[0].bodies)===sha(distantSpectator.ticks[0].bodies),finalPairExact:noSpectator.pairFinalSha256===distantSpectator.pairFinalSha256,
  finalMaxPositionDifference:Math.max(...noSpectator.final.map((v,i)=>Math.hypot(v.pos.x-distantSpectator.final[i].pos.x,v.pos.y-distantSpectator.final[i].pos.y))),
  noSpectator,distantSpectator},yaw:{worstLiftedHighBodySample:yawViolation,allSamples:yaw},multiContact:multiLoad(),
 limits:'Tiny deterministic engineering witnesses, not football outcome rates. Planar work closure alone does not validate vertical normal-force reduction. No force/model/source edits were applied to the branch snapshot.'};
writeFileSync('../branch-law-probes.json',JSON.stringify(report));
console.log(JSON.stringify({source:report.sourceSha256,bystander:{firstChangedFoot,firstTickExact:report.bystander.firstTickPairExact,finalPairExact:report.bystander.finalPairExact,positionDifference:report.bystander.finalMaxPositionDifference},
 yawViolation,aggregateLift:report.multiContact.targetLiftFraction}));
