/** Manual sustained-contact collector. Run from the repository root with Node22.
 * [outDir] contains observer-neutral mirrored traces and a source-pinned summary.
 * Subdivision comparisons are numerical evidence, not an NFL outcome target.
 */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import type {Body} from '../../../../src/physics/kinematics.js';
import {supportParams,availability,baseRadiusAt} from '../../../../src/physics/support.js';
import {fatigueFactor,commandFacing} from '../../../../src/physics/kinematics.js';
import {World,type Intent} from '../../../../src/physics/world.js';
import {sourceVersion} from '../../../../scripts/source-version.js';
const outDir=process.argv[2]??'out/sustained-jam';
const sourceBefore=sourceVersion(),sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const base={massKg:100,radius:.3,reach:1,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,backpedal:.6,shuffle:.55,
  maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4};
const variants={base:{},strong:{power:130},heavy:{massKg:125}};
const cohort={task:'shared-capabilities jam',variants,base,substeps:[6,12,24,48,96],modes:['patch'],sides:[-1,1],
  ticks:40,dt:.05,subject:{x:.9,y:0,vx:0,vy:0,facing:'(PI-.05)*side'},other:{x:0,y:'.1*side',vx:4,vy:0,facing:'.05*side'},
  controls:[{vel:{x:0,y:0},push:1,posture:.6},{vel:{x:5,y:0},push:1,posture:.2}],
  hand:{extension:.95,push:'subject.armForce',hold:0,steer:'.4*subject.armForce'},
  declaration:'Fixed profile/geometry/control copies of retained mechanical jam;48/96 comparison resolutions, not exact truth.'};
function make(variant:keyof typeof variants,substeps:number,side:number,mode:'center'|'patch'){
 const a:Body={pos:{x:.9,y:0},vel:{x:0,y:0},facing:(Math.PI-.05)*side,energy:1,profile:{...base,...variants[variant]}};
 const b:Body={pos:{x:0,y:.1*side},vel:{x:4,y:0},facing:.05*side,energy:1,profile:{...base}};
 const world=new World([a,b],{substeps,handContact:mode});
 const hand={kind:'hands' as const,a,b,extension:.95,push:supportParams(a.profile).armForce,hold:0,steer:.4*supportParams(a.profile).armForce};
 world.joints.push(hand);return {world,a,b,hand,intents:cohort.controls as Intent[]};
}
function state(b:Body,intent:Intent){const sup=b.support!,sp=supportParams(b.profile);
 return {pos:{...b.pos},vel:{...b.vel},speed:Math.hypot(b.vel.x,b.vel.y),facing:b.facing,spin:b.spin??0,energy:b.energy,
  state:sup.state,xi:{...sup.xi},posture:sup.posture,lean:{...sup.lean},felt:{...sup.felt},load:{...sup.load},
  availability:availability(sup,sp,fatigueFactor(b.energy)),baseRadius:baseRadiusAt(sp,sup.posture),commandFacing:commandFacing(b,intent)};}
function trial(variant:keyof typeof variants,substeps:number,side:number,mode:'center'|'patch',observed:boolean){
 const {world,a,b,hand,intents}=make(variant,substeps,side,mode),w=world as any,ticks:any[]=[],subs:any[]=[];
 let current:any=null,rows:any[]=[];
 if(observed){const integrate=w.integrateSubstep,jointRows=w.jointRows,feet=w.feet,solveHands=w.solveHands;
  w.integrateSubstep=function(...args:any[]){const t=this.time,h=args[3];current={t,h,before:[state(a,intents[0]),state(b,intents[1])],feet:[],hands:null};rows=[];
   const result=integrate.apply(this,args);current.after=[state(a,intents[0]),state(b,intents[1])];
   current.hands=rows.map(r=>({nx:r.nx,ny:r.ny,c:r.c,mode:r.mode,mn:r.mn,mt:r.mt??null,ri:r.ri??0,rj:r.rj??0,
    forceN:r.ln/h,forceT:r.lt/h,pushLimit:r.pushLim/h,steerLimit:r.steerLim/h}));subs.push(current);current=null;return result;};
  w.jointRows=function(h:number){const rs=jointRows.call(this,h);rows=rs;return rs;};
  w.feet=function(...args:any[]){const i=args[0],report=args[5],before={imp:{...report.groundImpulse[i]},yaw:report.groundYawImpulse[i]};
   const result=feet.apply(this,args);if(current)current.feet.push({i,plan:{...args[2]},after:state(this.bodies[i],intents[i]),
    ground:{x:report.groundImpulse[i].x-before.imp.x,y:report.groundImpulse[i].y-before.imp.y,yaw:report.groundYawImpulse[i]-before.yaw}});return result;};
  w.solveHands=function(r:any,soft:any){if(current&&!current.firstSolve)current.firstSolve={soft:{...soft},
    before:[state(a,intents[0]),state(b,intents[1])],row:{nx:r.nx,ny:r.ny,c:r.c,mode:r.mode,ri:r.ri??0,rj:r.rj??0}};
   return solveHands.call(this,r,soft);};
 }
 let momentumResidual=0,workResidual=0,armImpulseFraction=0,armWorkFraction=0;const falls=new Set<number>();
 for(let k=0;k<40;k++){const before={px:a.vel.x*a.profile.massKg+b.vel.x*b.profile.massKg,py:a.vel.y*a.profile.massKg+b.vel.y*b.profile.massKg};
  const report=world.step(intents,.05);
  momentumResidual=Math.max(momentumResidual,Math.hypot(a.vel.x*a.profile.massKg+b.vel.x*b.profile.massKg-before.px-report.groundImpulse.reduce((s,v)=>s+v.x,0),
   a.vel.y*a.profile.massKg+b.vel.y*b.profile.massKg-before.py-report.groundImpulse.reduce((s,v)=>s+v.y,0)));
  workResidual=Math.max(workResidual,Math.abs(report.work.residual));for(let i=0;i<2;i++){
   armImpulseFraction=Math.max(armImpulseFraction,report.armImpulse[i]/Math.max(1e-12,report.armImpulseLimit[i]));
   armWorkFraction=Math.max(armWorkFraction,report.armWork[i]/Math.max(1e-12,report.armWorkLimit[i]));}
  for(const i of report.falls)falls.add(i);
  ticks.push({t:world.time,bodies:[state(a,intents[0]),state(b,intents[1])],hand:{normalForce:hand.normalForce,tangentForce:hand.tangentForce},report});
 }
 const signature=sha({bodies:world.bodies,joints:world.joints,time:world.time,ticks});
 return {variant,substeps,side,mode,signature,final:[state(a,intents[0]),state(b,intents[1])],law:{momentumResidual,workResidual,armImpulseFraction,armWorkFraction,falls:[...falls]},ticks,subs};
}
mkdirSync(outDir,{recursive:true});const rows=[];
for(const variant of Object.keys(variants) as (keyof typeof variants)[])for(const substeps of cohort.substeps)
 for(const side of cohort.sides)for(const mode of cohort.modes as ('center'|'patch')[]){
  const observed=trial(variant,substeps,side,mode,true),plain=trial(variant,substeps,side,mode,false);
  if(observed.signature!==plain.signature)throw new Error('Observer mutated '+[variant,substeps,side,mode]);
  const path=`${outDir}/jam-${variant}-${substeps}-${side}-${mode}.json.gz`;
  const encoded=gzipSync(JSON.stringify({sourceBefore,...observed,observerVerified:true}));writeFileSync(path,encoded);
  const {ticks,subs,...summary}=observed;rows.push({...summary,observerVerified:true,trace:{path,sha256:createHash('sha256').update(encoded).digest('hex')}});}
const sourceAfter=sourceVersion();if(sourceBefore!==sourceAfter)throw new Error('Source changed');
writeFileSync(`${outDir}/summary.json.gz`,gzipSync(JSON.stringify({schema:'heavy-jam-transition-v1',sourceBefore,sourceAfter,
 toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),inputSha256:sha(cohort),cohort,rows})));
console.log(JSON.stringify({sourceBefore,sourceAfter,rows:rows.length,observerVerified:rows.length,
 summary:rows.filter(r=>r.side===1).map(r=>({variant:r.variant,steps:r.substeps,mode:r.mode,final:r.final.map(s=>s.pos),law:r.law}))}));
