/** Read-only phase audit: the native solver and all capacities are unchanged. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {World,type Intent} from '../../src/physics/world.js';
import type {Body} from '../../src/physics/kinematics.js';
import {supportParams} from '../../src/physics/support.js';
import {sourceVersion} from '../../scripts/source-version.js';
const sourceBefore=sourceVersion(),hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const base={massKg:100,radius:.3,reach:1,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,backpedal:.6,shuffle:.55,
 maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4};
const cohort={profiles:['base','heavy125'],steps:[12,48,96],modes:['center','patch'],sides:[-1,1],ticks:40,dt:.05,
 declaration:'Native jam retained. Observe solveHands then individual rigid torso-relax passes; frozen row and updated end-frame slips distinguished. No corrective forces applied.'};
function trial(variant:string,substeps:number,mode:'center'|'patch',side:number,observe:boolean){
 const a:Body={pos:{x:.9,y:0},vel:{x:0,y:0},facing:(Math.PI-.05)*side,energy:1,profile:{...base,massKg:variant==='heavy125'?125:100}};
 const b:Body={pos:{x:0,y:.1*side},vel:{x:4,y:0},facing:.05*side,energy:1,profile:{...base}};
 const world=new World([a,b],{substeps,handContact:mode}),w=world as any;
 world.joints.push({kind:'hands',a,b,extension:.95,push:supportParams(a.profile).armForce,hold:0,steer:.4*supportParams(a.profile).armForce});
 const intents:Intent[]=[{vel:{x:0,y:0},push:1,posture:.6},{vel:{x:5,y:0},push:1,posture:.2}],subs:any[]=[],ticks:any[]=[];
 let current:any=null,row:any=null;
 const angular=()=>[a,b].reduce((s,x)=>s+x.profile.massKg*(x.pos.x*x.vel.y-x.pos.y*x.vel.x)
  +supportParams(x.profile).yawInertia*(x.spin??0),0);
 const state=()=>[a,b].map(x=>({pos:{...x.pos},vel:{...x.vel},spin:x.spin??0,facing:x.facing,xi:{...x.support!.xi},
  lean:{...x.support!.lean},felt:{...x.support!.felt},state:x.support!.state}));
 const slip=()=>{const vx=b.vel.x-a.vel.x,vy=b.vel.y-a.vel.y,spinA=a.spin??0,spinB=b.spin??0;
  const frozenCOM=-row.ny*vx+row.nx*vy,dx=b.pos.x-a.pos.x,dy=b.pos.y-a.pos.y,d=Math.hypot(dx,dy),nx=dx/d,ny=dy/d;
  return {solverFrameSlip:frozenCOM-(row.ri??0)*spinA-(row.rj??0)*spinB,
   physicalFrozenPatchSlip:frozenCOM-current.frozenRi*spinA-current.frozenRj*spinB,
   updatedEndPatchSlip:-ny*vx+nx*vy-d*a.profile.radius/(a.profile.radius+b.profile.radius)*spinA-d*b.profile.radius/(a.profile.radius+b.profile.radius)*spinB,
   velocity:[a.vel.x,a.vel.y,b.vel.x,b.vel.y],spin:[spinA,spinB]};};
 if(observe){const integrate=w.integrateSubstep,jointRows=w.jointRows,solveContact=w.solveContact;
  w.integrateSubstep=function(...args:any[]){current={t:this.time,h:args[3],relax:[]};row=null;const result=integrate.apply(this,args);
   if(current.relax.length)subs.push(current);current=null;return result;};
  w.jointRows=function(h:number){const rs=jointRows.call(this,h);row=rs[0];
   if(current&&row){const d=Math.hypot(b.pos.x-a.pos.x,b.pos.y-a.pos.y);current.frozenRi=row.ri??d*a.profile.radius/(a.profile.radius+b.profile.radius);
    current.frozenRj=row.rj??d*b.profile.radius/(a.profile.radius+b.profile.radius);}return rs;};
  w.solveContact=function(c:any,soft:any,relax:boolean){if(!current||!row||(!relax&&current.firstPositiveContact))return solveContact.call(this,c,soft,relax);
   const before=slip(),beforeL=angular(),dx=b.pos.x-a.pos.x,dy=b.pos.y-a.pos.y,
    contactBefore={ln:c.ln,lt:c.lt,nx:c.nx,ny:c.ny,guard:c.guard,R:c.R,ri:c.ri,rj:c.rj,
     actualSeparation:Math.hypot(dx,dy),relativePosition:{x:dx,y:dy},handFrame:{nx:row.nx,ny:row.ny,ri:row.ri??0,rj:row.rj??0}};
   const result=solveContact.call(this,c,soft,relax),after=slip(),wanted=row.lt-(row.mt??row.mn)*after.solverFrameSlip;
   const entry={before,after,contactBefore,contactAfter:{ln:c.ln,lt:c.lt},angularChange:angular()-beforeL,
    angularPredictedFromNoncoincidentFrame:(dx*c.ny-dy*c.nx)*(c.ln-contactBefore.ln)
      +(dx*c.nx+dy*c.ny-c.ri-c.rj)*(c.lt-contactBefore.lt),
    hand:{nx:row.nx,ny:row.ny,ri:row.ri??0,rj:row.rj??0,ln:row.ln,lt:row.lt,steerLimit:row.steerLim,
     tangentUnsaturated:Math.abs(row.lt)<row.steerLim-1e-9,rematchImpulse:wanted,rematchWithinExistingLimit:Math.abs(wanted)<=row.steerLim+1e-9}};
   if(relax)current.relax.push(entry);else if(c.ln>0)current.firstPositiveContact=entry;return result;};
 }
 let maxWorkResidual=0,maxArmFraction=0,maxArmWorkFraction=0;const falls=new Set<number>();
 for(let k=0;k<40;k++){const r=world.step(intents,.05);maxWorkResidual=Math.max(maxWorkResidual,Math.abs(r.work.residual));
  for(let i=0;i<2;i++){maxArmFraction=Math.max(maxArmFraction,r.armImpulse[i]/Math.max(1e-12,r.armImpulseLimit[i]));
   maxArmWorkFraction=Math.max(maxArmWorkFraction,r.armWork[i]/Math.max(1e-12,r.armWorkLimit[i]));}for(const i of r.falls)falls.add(i);ticks.push({t:world.time,state:state(),report:r});}
 const signature=hash({bodies:world.bodies,joints:world.joints,time:world.time,ticks});
 return {variant,substeps,mode,side,signature,subs,ticks,final:state(),law:{maxWorkResidual,maxArmFraction,maxArmWorkFraction,falls:[...falls]}};
}
const rows=[];
for(const variant of cohort.profiles)for(const substeps of cohort.steps)for(const mode of cohort.modes as ('center'|'patch')[])for(const side of cohort.sides){
 const seen=trial(variant,substeps,mode,side,true),plain=trial(variant,substeps,mode,side,false);
 if(seen.signature!==plain.signature)throw new Error('Observer changed state');const path=`out/reduced-support-final-mechanics/relax-${variant}-${substeps}-${side}-${mode}.json.gz`;
 const bytes=gzipSync(JSON.stringify({sourceBefore,...seen}));writeFileSync(path,bytes);const {subs,ticks,...summary}=seen;
 rows.push({...summary,observerVerified:true,trace:{path,sha256:createHash('sha256').update(bytes).digest('hex')}});
}
const sourceAfter=sourceVersion();if(sourceBefore!==sourceAfter)throw new Error('Source changed');
writeFileSync('out/reduced-support-final-mechanics/relax-hand-slip.json',JSON.stringify({schema:'relax-hand-slip-v1',sourceBefore,sourceAfter,
 toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),inputSha256:hash(cohort),cohort,rows}));
console.log(JSON.stringify({sourceBefore,sourceAfter,rows:rows.length,observerVerified:rows.length}));
