/** Reduced-state selection and endpoint application versus preserved mechanical
 * references. No World integration or new football collection. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {integrateSlipMotor,type MotorField} from '../../../src/physics/local-slip-motor.js';
import {integrateMotorEvents} from '../../../src/physics/motor-event-schedule.js';
import {sourceVersion} from '../../source-version.js';
const root='out/event-schedule';mkdirSync(root,{recursive:true});
const start=performance.now(),source=sourceVersion(),inputPath='config/local-slip-work.json',referencePath='config/local-slip-motor-reference.json',sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex'),
 input=JSON.parse(readFileSync(inputPath,'utf8')),reference=JSON.parse(readFileSync(referencePath,'utf8')),fine=JSON.parse(readFileSync(`${root}/reference100.json`,'utf8'));
assert.equal(reference.input.sha256,sha(inputPath));assert.equal(fine.input.sha256,sha(inputPath));
const numeric=(v:any):any=>typeof v==='string'?Number(v):Array.isArray(v)?v.map(numeric):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,numeric(x)])):v;
let referenceZeroTail=0;
function comparePrecision(a:any,b:any){if(a&&typeof a==='object'){for(const k of Object.keys(a))comparePrecision(a[k],b[k]);}else if(typeof a==='string'){const x=Number(a),y=Number(b);if(Math.max(Math.abs(x),Math.abs(y))>1e-50)assert.equal(x,y);else{referenceZeroTail=Math.max(referenceZeroTail,Math.abs(x-y));assert(Math.abs(x-y)<1e-60);}}}
comparePrecision(reference.cases,fine.cases);
const fields:Record<string,MotorField>=Object.fromEntries(['nextField','selected','slidingControl'].map(k=>[k,input[k].field]));fields.noHandControl={...input.nextField.field,forceLimit:0};
function solve(f:MotorField){const r=integrateMotorEvents(f);if(!r.ok)throw Error(r.reason);return r;}
function motion(a:any[],b:any[]){return Math.max(...a.flatMap((x,i)=>['position','velocity'].flatMap(k=>['x','y'].map(c=>Math.abs(x[k][c]-b[i][k][c]))).concat(['facing','spin'].map(k=>Math.abs(x[k]-b[i][k])))));}
function errors(a:any,b:any){const residuals:Record<string,number>={};for(const k of ['impulse','temporalMoment','absoluteImpulse','handWork','energyChange'])residuals[k]=Math.abs(a[k]-b[k]);
 for(const k of ['groundYawImpulse','groundYawTemporalMoment','absoluteGroundYawImpulse','groundYawWork','legWork'])residuals[k]=Math.max(...a[k].map((x:number,i:number)=>Math.abs(x-b[k][i])));return residuals;}
const results=[];
for(const [key,f] of Object.entries(fields)){
 const r=solve(f),old=integrateSlipMotor(f);assert(old.ok);const priorResiduals={...errors(r,old),motion:motion(r.bodies,old.bodies)};for(const x of Object.values(priorResiduals))assert(x<1e-11);const ref=numeric(reference.cases[key]),residuals={...errors(r,ref),motion:motion(r.bodies,ref.after)};for(const x of Object.values(residuals))assert(x<1e-11);
 assert(Math.abs(r.workResidual)<1e-11);assert(r.handWork<=1e-14);assert(r.absoluteImpulse<=f.forceLimit*f.duration+1e-14);
 for(const p of r.phases){assert(Math.abs(p.force)<=f.forceLimit&&p.work<=1e-14);for(let i=0;i<2;i++)assert(Math.abs(p.groundAcceleration[i])<=f.bodies[i].yaw!.accelerationLimit);}
 const partitions=[];
 for(const weights of [[.23,.41,.36],[.5,.5],[.7,.2,.1]]){
  const copy=structuredClone(f),T=f.duration,sum:any={impulse:0,temporalMoment:0,absoluteImpulse:0,handWork:0,energyChange:0,groundYawImpulse:[0,0],groundYawTemporalMoment:[0,0],absoluteGroundYawImpulse:[0,0],groundYawWork:[0,0],legWork:[0,0]};let elapsed=0;
  for(const w of weights){const dt=T*w,sub=solve({...copy,duration:dt,remaining:f.remaining-elapsed});sum.temporalMoment+=sub.temporalMoment+(T-elapsed-dt)*sub.impulse;
   for(const k of ['impulse','absoluteImpulse','handWork','energyChange'] as const)sum[k]+=sub[k];
   for(let i=0;i<2;i++){sum.groundYawTemporalMoment[i]+=sub.groundYawTemporalMoment[i]+(T-elapsed-dt)*sub.groundYawImpulse[i];for(const k of ['groundYawImpulse','absoluteGroundYawImpulse','groundYawWork','legWork'] as const)sum[k][i]+=sub[k][i];}
   elapsed+=dt;copy.bodies=sub.bodies;}
  const residual=Math.max(...Object.values(errors(sum,r)),motion(copy.bodies,r.bodies));assert(residual<1e-11);partitions.push({weights,residual});
 }
 results.push({key,referenceResiduals:residuals,priorResiduals,result:r,partitions});
}
assert.equal(sourceVersion(),source);
const result={protocol:'event-schedule-accuracy-v1',source,input:{path:inputPath,sha256:sha(inputPath)},reference:{path:referencePath,sha256:sha(referencePath),generatorSha256:sha('scripts/diag/physics/local-slip-motor-reference.py'),precision:[70,100],nonzeroDoubleAgreement:true,referenceZeroTail},results,priorReferencePreserved:true,worldIntegrated:false,adoptionReady:false,elapsedSeconds:(performance.now()-start)/1000};
writeFileSync(`${root}/result.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({source,cases:results.map(x=>({key:x.key,phases:x.result.phases,referenceResiduals:x.referenceResiduals,priorResiduals:x.priorResiduals,partitions:x.partitions,groundYawImpulse:x.result.groundYawImpulse,absoluteGroundYawImpulse:x.result.absoluteGroundYawImpulse,workResidual:x.result.workResidual})),elapsedSeconds:result.elapsedSeconds}));
