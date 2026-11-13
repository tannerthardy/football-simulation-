/** Same body capabilities, five contact tasks. No fitted scenario constants.
 * node --import tsx scripts/diag/shared-capabilities.ts out/shared.json
 * Mechanical controllers, not NFL technique/assignment validation; use the
 * real-technique scenario pack as a separate transfer guard.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import type {PhysicalProfile} from '../../src/players/physical.js';
import type {Body} from '../../src/physics/kinematics.js';
import {supportParams} from '../../src/physics/support.js';
import {World,type Intent} from '../../src/physics/world.js';
import {sourceVersion} from '../source-version.js';

const base:PhysicalProfile={massKg:100,radius:.3,reach:1,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,
  backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4};
const tasks=['anchor','double-drive','shed','absorb','jam'] as const;
const variants={base:{},strong:{power:130},heavy:{massKg:125},wideBase:{balance:1}};
interface Rep {
  task:typeof tasks[number];variant:string;side:number;substeps:number;
  subjectProfile:PhysicalProfile;subject:Body['pos'];other:Body['pos'];
  displacementX:number;displacementY:number;otherDisplacementX:number;
  momentumError:number;workError:number|null;armFraction:number|null;energyFraction:number|null;
  overlap:number;falls:number[];finite:boolean;
}
const rows:Rep[]=[];
for(const task of tasks)for(const [variant,changes] of Object.entries(variants))for(const side of [1,-1])for(const substeps of [6,12,48]){
  const make=(x:number,y=0,facing=0):Body=>({pos:{x,y:y*side},vel:{x:0,y:0},facing:facing*side,energy:1,profile:{...base}});
  // Slightly staggered bodies avoid the ambiguous choice of turn direction
  // in an exactly collinear 180-degree reversal; reflection stays well posed.
  const a=make(0,0,.05),b=make(.9,.1,Math.PI-.05),bs=[a,b];a.profile={...base,...changes};
  const cmd=(x:number,y=0,posture=.6):Intent=>({vel:{x,y:y*side},push:1,posture});
  let intents:Intent[]=[cmd(0),cmd(-3)];
  if(task==='double-drive'){
    const c=make(-.1,.7);bs.push(c);
    intents=[cmd(3),cmd(0),cmd(3)];
  }
  if(task==='shed')intents=[cmd(1,2),cmd(-1.5)];
  if(task==='absorb'){a.vel.x=6;b.pos.y=.35*side;b.vel={x:-1,y:-3*side};intents=[cmd(6),cmd(-1,-3)];}
  if(task==='jam'){a.pos.x=.9;a.facing=(Math.PI-.05)*side;b.pos.x=0;b.facing=.05*side;b.vel.x=4;intents=[cmd(0),cmd(5,0,.2)];}
  const world=new World(bs,{substeps});
  const hands=(actor:Body,target:Body)=>world.joints.push({kind:'hands',a:actor,b:target,extension:.95,
    push:supportParams(actor.profile).armForce,hold:0,steer:.4*supportParams(actor.profile).armForce});
  if(task==='anchor')hands(b,a);
  if(task==='shed'||task==='jam')hands(a,b);
  if(task==='double-drive'){
    world.joints.push({kind:'hands',a,b,extension:.95,push:supportParams(a.profile).armForce,hold:0,steer:0},
      {kind:'hands',a:bs[2],b,extension:1.2,push:supportParams(bs[2].profile).armForce,hold:0,steer:0});
  }
  let momentumError=0,workError=0,armFraction=0,energyFraction=0,overlap=0,hasWorkLedger=false;
  const falls=new Set<number>();
  for(let k=0;k<40;k++){
    const px=bs.reduce((s,b)=>s+b.vel.x*b.profile.massKg,0),py=bs.reduce((s,b)=>s+b.vel.y*b.profile.massKg,0);
    const r=world.step(intents,.05);
    momentumError=Math.max(momentumError,Math.hypot(bs.reduce((s,b,i)=>s+b.vel.x*b.profile.massKg-r.groundImpulse[i].x,0)-px,
      bs.reduce((s,b,i)=>s+b.vel.y*b.profile.massKg-r.groundImpulse[i].y,0)-py));
    const report=r as typeof r & {work?:{residual:number};armImpulse?:number[];armImpulseLimit?:number[];armWork?:number[];armWorkLimit?:number[]};
    if(report.work){hasWorkLedger=true;workError=Math.max(workError,Math.abs(report.work.residual));}
    if(report.armImpulse)for(let i=0;i<bs.length;i++){
      armFraction=Math.max(armFraction,report.armImpulse[i]/Math.max(1e-9,report.armImpulseLimit![i]));
      energyFraction=Math.max(energyFraction,report.armWork![i]/Math.max(1e-9,report.armWorkLimit![i]));
    }
    for(const i of r.falls)falls.add(i);
    overlap=Math.max(overlap,r.maxPenetration);
  }
  rows.push({task,variant,side,substeps,subjectProfile:a.profile,subject:a.pos,other:b.pos,
    displacementX:a.pos.x-(task==='jam'?.9:0),displacementY:side*a.pos.y,otherDisplacementX:b.pos.x-(task==='jam'?0:.9),
    momentumError,workError:hasWorkLedger?workError:null,armFraction:hasWorkLedger?armFraction:null,
    energyFraction:hasWorkLedger?energyFraction:null,overlap,falls:[...falls],finite:bs.every(b=>[b.pos.x,b.pos.y,b.vel.x,b.vel.y].every(Number.isFinite))});
}
const out=process.argv[2]??'out/shared-capabilities.json';mkdirSync(dirname(out),{recursive:true});
const optionalMax=(values:(number|null)[])=>values.every(v=>v===null)?null:Math.max(...values.map(v=>v??0));
const summaries=[6,12,48].map(substeps=>{
  const rs=rows.filter(r=>r.substeps===substeps);
  const errors=rs.map(r=>{
    const ref=rows.find(a=>a.task===r.task&&a.variant===r.variant&&a.side===r.side&&a.substeps===48)!;
    return Math.hypot(r.subject.x-ref.subject.x,r.subject.y-ref.subject.y);
  });
  const mirrors=rs.filter(r=>r.side===1).map(r=>{
    const opposite=rs.find(a=>a.task===r.task&&a.variant===r.variant&&a.side===-1)!;
    return Math.max(...(['subject','other'] as const).flatMap(w=>[
      Math.abs(r[w].x-opposite[w].x),Math.abs(r[w].y+opposite[w].y)]));
  });
  const fallSet=(indices:number[])=>[...indices].sort().join(',');
  return {substeps,reps:rs.length,maxMirrorPositionErrorYd:Math.max(...mirrors),
    meanSubjectPositionErrorVs48Yd:errors.reduce((s,e)=>s+e,0)/errors.length,maxSubjectPositionErrorVs48Yd:Math.max(...errors),
    fallSetDisagreementsVs48:rs.filter(r=>{
      const ref=rows.find(a=>a.task===r.task&&a.variant===r.variant&&a.side===r.side&&a.substeps===48)!;
      return fallSet(r.falls)!==fallSet(ref.falls);
    }).length,
    maxMomentumResidualKgYdPerS:Math.max(...rs.map(r=>r.momentumError)),
    maxWorkResidualKgYd2PerS2:optionalMax(rs.map(r=>r.workError)),
    maxArmImpulseFraction:optionalMax(rs.map(r=>r.armFraction)),maxArmWorkFraction:optionalMax(rs.map(r=>r.energyFraction)),
    maxOverlapYd:Math.max(...rs.map(r=>r.overlap)),allFinite:rs.every(r=>r.finite)};
});
writeFileSync(out,JSON.stringify({sourceSha256:sourceVersion(),referenceSubsteps:48,
  note:'Identical base capabilities across five tasks; only geometry and control differ. Profile variants are shared across tasks, not retuned. Mechanical probes do not establish NFL realism. Missing ledger telemetry is null, not a measured zero.',summaries,rows},null,2)+'\n');
console.table(summaries);
console.log(`${rows.length} mechanical reps; wrote ${out}`);
