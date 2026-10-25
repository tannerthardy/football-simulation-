/** Frozen-pose impact mechanics only; no gait/World readiness claim.
 * node --import tsx scripts/diag/sole-contact-stress.ts [output.json]
 */
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {solveSoleImpact,type SoleContactPoint} from '../../src/physics/sole-contact.js';
import {identityRigidBasis,rigidPointVelocity,rigidPointPosition,rigidKineticEnergy,rigidAngularMomentum,v3Add,v3Sub,v3Scale,v3Cross,v3Dot,v3Norm,type MaterialRigidState} from '../../src/physics/material-rigid.js';
import {sourceVersion} from '../source-version.js';
if(Number(process.versions.node.split('.')[0])!==22)throw new Error('Pinned diagnostic requires Node 22');
const sourceSha256Start=sourceVersion(),self=fileURLToPath(import.meta.url);
const scriptSha256Start=createHash('sha256').update(readFileSync(self)).digest('hex');
const options={maxIterations:256,tolerance:1e-9};
const failures:{panel:string;index:number;input:MaterialRigidState;contacts:SoleContactPoint[];reason:string|null;normal:number;tangent:number}[]=[];
const violations:{panel:string;index:number;issues:string[];input:MaterialRigidState;contacts:SoleContactPoint[]}[]=[];
const summaries=[];
for(const seed of [143991,417]){
 let state=seed;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const summary={seed,cases:1000,accepted:0,rejected:0,mirrorAccepted:0,mirrorRejected:0,mirrorStatusMismatch:0,maxIterations:0,maxAccelerations:0,maxResidual:0,maxWorkResidual:0,maxMomentumResidual:0,maxAngularResidual:0,maxMirrorObservableError:0};
 for(let index=0;index<1000;index++){
  let mass:number,inertia:number,friction:number,velocity,angularMomentum;
  if(seed===143991){mass=1+4*random();inertia=.002+.028*random();friction=1.2*random();velocity={x:12*random()-6,y:8*random()-4,z:-.1-3*random()};angularMomentum={x:(40*random()-20)*inertia,y:(40*random()-20)*inertia,z:(40*random()-20)*inertia};}
  else {friction=random()*1.5;mass=.5+random()*5;inertia=.01+random()*.2;velocity={x:(random()-.5)*10,y:(random()-.5)*10,z:-random()*5};angularMomentum={x:(random()-.5)*.4,y:(random()-.5)*.4,z:(random()-.5)*.4};}
  const height=seed===143991?.04:.1;
  const input:MaterialRigidState={mass,inertia,position:{x:0,y:0,z:height},velocity,angularMomentum,basis:identityRigidBasis()};
  const points=seed===143991?[{x:-.14,y:-.045,z:-height},{x:-.14,y:.045,z:-height},{x:.13,y:0,z:-height}]:[{x:-.2,y:-.1,z:-height},{x:.2,y:-.1,z:-height},{x:0,y:.2,z:-height}];
  const contacts:SoleContactPoint[]=points.map((local,i)=>({id:String(i),local,friction}));
  const mirror:MaterialRigidState={...input,position:{...input.position},velocity:{...velocity,x:-velocity.x},angularMomentum:{x:angularMomentum.x,y:-angularMomentum.y,z:-angularMomentum.z}};
  const mirrored=contacts.map(c=>({...c,local:{...c.local,x:-c.local.x}}));
  const results=[solveSoleImpact(input,contacts,options),solveSoleImpact(mirror,mirrored,options)];
  if(results[0].report.accepted!==results[1].report.accepted)summary.mirrorStatusMismatch++;
  for(let reflection=0;reflection<2;reflection++){
   const before=reflection?mirror:input, rows=reflection?mirrored:contacts,r=results[reflection],report=r.report,panel=`${seed}${reflection?'-mirror':''}`;
   if(report.accepted){if(reflection)summary.mirrorAccepted++;else summary.accepted++;}else{if(reflection)summary.mirrorRejected++;else summary.rejected++;failures.push({panel,index,input:before,contacts:rows,reason:report.reason,normal:report.maxNormalResidual,tangent:report.maxTangentResidual});continue;}
   summary.maxIterations=Math.max(summary.maxIterations,report.iterations);summary.maxAccelerations=Math.max(summary.maxAccelerations,report.acceleratedUpdates);summary.maxResidual=Math.max(summary.maxResidual,report.maxNormalResidual,report.maxTangentResidual);
   let impulse={x:0,y:0,z:0},torque={x:0,y:0,z:0},work=0;const issues:string[]=[];
   report.contacts.forEach((c,i)=>{
    const v0=rigidPointVelocity(before,rows[i].local),v1=rigidPointVelocity(r.state,rows[i].local),j=c.impulse,cap=rows[i].friction*j.z,norm=Math.hypot(j.x,j.y),speed=Math.hypot(v1.x,v1.y);
    impulse=v3Add(impulse,j);torque=v3Add(torque,v3Cross(rigidPointPosition(before,rows[i].local),j));work+=v3Dot(j,v3Scale(v3Add(v0,v1),.5));
    if(j.z<0||v1.z < -1e-9||Math.abs(j.z*v1.z)>1e-7||norm>cap+1e-12)issues.push(`row${i}:normal/cap`);
    if(cap>1e-12&&norm<cap-1e-7&&speed>1e-7)issues.push(`row${i}:interior slip`);
    if(norm>1e-10&&speed>1e-7&&(Math.abs(j.x*v1.y-j.y*v1.x)>1e-7*Math.max(1,norm*speed)||j.x*v1.x+j.y*v1.y>1e-9))issues.push(`row${i}:friction KKT`);
   });
   const ke=rigidKineticEnergy(r.state)-rigidKineticEnergy(before),wr=Math.abs(ke-work),pr=v3Norm(v3Sub(v3Scale(v3Sub(r.state.velocity,before.velocity),mass),impulse)),ar=v3Norm(v3Sub(v3Sub(rigidAngularMomentum(r.state),rigidAngularMomentum(before)),torque));
   summary.maxWorkResidual=Math.max(summary.maxWorkResidual,wr);summary.maxMomentumResidual=Math.max(summary.maxMomentumResidual,pr);summary.maxAngularResidual=Math.max(summary.maxAngularResidual,ar);
   if(ke>1e-9||wr>1e-9||pr>1e-9||ar>1e-9)issues.push('independent energy/momentum');if(issues.length)violations.push({panel,index,issues,input:before,contacts:rows});
  }
  if(results.every(r=>r.report.accepted)){const a=results[0].state,b=results[1].state;summary.maxMirrorObservableError=Math.max(summary.maxMirrorObservableError,v3Norm({x:a.velocity.x+b.velocity.x,y:a.velocity.y-b.velocity.y,z:a.velocity.z-b.velocity.z}),v3Norm({x:a.angularMomentum.x-b.angularMomentum.x,y:a.angularMomentum.y+b.angularMomentum.y,z:a.angularMomentum.z+b.angularMomentum.z}));}
 }
 summaries.push(summary);
}
const sourceSha256End=sourceVersion(),scriptSha256End=createHash('sha256').update(readFileSync(self)).digest('hex');
if(sourceSha256Start!==sourceSha256End||scriptSha256Start!==scriptSha256End)throw new Error('Diagnostic source changed during execution');
const output={sourceSha256Start,sourceSha256End,scriptSha256Start,scriptSha256End,nodeVersion:process.version,options,summaries,failures,violations,
 scope:'Frozen-pose isotropic rigid foot impact only. No continuous ground support, leg control, first-touchdown timing, or World integration.'};
const destination=process.argv[2];if(destination){mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,JSON.stringify(output,null,2)+'\n');}
console.log(JSON.stringify({sourceSha256Start,nodeVersion:output.nodeVersion,summaries,rejections:failures.length,contractViolations:violations.length,output:destination??null},null,2));
if(violations.length||failures.length||summaries.some(s=>s.mirrorStatusMismatch||s.maxMirrorObservableError>1e-8))process.exitCode=1;
