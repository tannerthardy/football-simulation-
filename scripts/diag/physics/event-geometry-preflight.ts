/** Preflight the literal continuous phase history before extending its frozen
 * row to World. Independent phase-polynomial force/torque ledger; no World edit. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {selectMotorEvents,applyMotorEvents} from '../../../src/physics/motor-event-schedule.js';
import type {MotorField} from '../../../src/physics/local-slip-motor.js';
import {sourceVersion} from '../../source-version.js';
const path='config/local-slip-work.json',packet=JSON.parse(readFileSync(path,'utf8')),root='out/world-events';mkdirSync(root,{recursive:true});
const cross=(a:{x:number;y:number},b:{x:number;y:number})=>a.x*b.y-a.y*b.x;
const angular=(bs:MotorField['bodies'])=>bs.reduce((s,b)=>s+b.mass*cross(b.position,b.velocity)+b.inertia*b.spin,0);
const fields:Record<string,MotorField>=Object.fromEntries(['nextField','selected','slidingControl'].map(k=>[k,packet[k].field]));
fields.noHandControl={...packet.nextField.field,forceLimit:0};
const referencePaths=['out/world-events/geometry-reference70.json','out/world-events/geometry-reference100.json'],
 references=referencePaths.map(p=>JSON.parse(readFileSync(p,'utf8'))),sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const r of references){assert.equal(r.generatorSha256,sha('scripts/diag/physics/event-geometry-reference.py'));for(const input of r.inputs)assert.equal(input.sha256,sha(input.path));}
assert.equal(references[0].precision,70);assert.equal(references[1].precision,100);
let referenceZeroTail=0;
function precision(a:any,b:any){if(a&&typeof a==='object'){for(const k of Object.keys(a))precision(a[k],b[k]);}else if(typeof a==='string'){const x=Number(a),y=Number(b);if(Math.max(Math.abs(x),Math.abs(y))>1e-50)assert.equal(x,y);else{referenceZeroTail=Math.max(referenceZeroTail,Math.abs(x-y));assert(Math.abs(x-y)<1e-60);}}}
precision(references[0].cases,references[1].cases);
// A stationary normal separation leaves the same frozen arms consistent at
// every force time. Keep tangent slip/strength/mass; remove external loads.
const control:MotorField=structuredClone(packet.nextField.field),n={x:control.tangent.y,y:-control.tangent.x},a=control.bodies[0],b=control.bodies[1],span=control.arms[0]+control.arms[1];
b.position={x:a.position.x+n.x*span,y:a.position.y+n.y*span};
const closing=(b.velocity.x-a.velocity.x)*n.x+(b.velocity.y-a.velocity.y)*n.y;
b.velocity.x-=n.x*closing;b.velocity.y-=n.y*closing;
for(const body of control.bodies){body.groundAcceleration={x:0,y:0};delete body.yaw;}
fields.stationaryNormalControl=control;
const cases=[];
for(const [key,f] of Object.entries(fields)){
 const s=selectMotorEvents(f);assert(s.ok);const after=applyMotorEvents(s),bs=structuredClone(f.bodies);let external=0,internal=0,elapsed=0,timeImpulse=0;const phases=[];
 for(const p of s.phases){const d=p.duration,F=p.force,t=f.tangent,
  relative={x:bs[1].position.x-bs[0].position.x,y:bs[1].position.y-bs[0].position.y},relativeV={x:bs[1].velocity.x-bs[0].velocity.x,y:bs[1].velocity.y-bs[0].velocity.y},
  relativeG={x:bs[1].groundAcceleration.x-bs[0].groundAcceleration.x,y:bs[1].groundAcceleration.y-bs[0].groundAcceleration.y},
  residual=F*((cross(relative,t)-f.arms[0]-f.arms[1])*d+cross(relativeV,t)*d*d/2+cross(relativeG,t)*d*d*d/6);
  // Hand-induced relative acceleration lies along t and contributes no
  // cross product with t, so this residual is independently geometric.
  internal+=residual;timeImpulse+=F*d*(elapsed+d/2);
  phases.push({elapsed,duration:d,force:F,internalAngularResidual:residual});
  for(let i=0;i<2;i++){const body=bs[i],sign=i===0?-1:1,g=body.groundAcceleration,
   ax=g.x+sign*t.x*F/body.mass,ay=g.y+sign*t.y*F/body.mass,
   ix=body.position.x*d+body.velocity.x*d*d/2+ax*d*d*d/6,
   iy=body.position.y*d+body.velocity.y*d*d/2+ay*d*d*d/6;
   external+=cross({x:ix,y:iy},{x:body.mass*g.x,y:body.mass*g.y})+body.inertia*p.groundAcceleration[i]*d;
   body.position.x+=body.velocity.x*d+ax*d*d/2;body.position.y+=body.velocity.y*d+ay*d*d/2;body.velocity.x+=ax*d;body.velocity.y+=ay*d;
   const alpha=p.groundAcceleration[i]-f.arms[i]*F/body.inertia;body.facing+=body.spin*d+alpha*d*d/2;body.spin+=alpha*d;
  }elapsed+=d;
 }
 const residue=angular(after.bodies)-angular(f.bodies)-external,identity=Math.abs(residue-internal),motion=Math.max(...bs.flatMap((q,i)=>[Math.abs(q.position.x-after.bodies[i].position.x),Math.abs(q.position.y-after.bodies[i].position.y),Math.abs(q.velocity.x-after.bodies[i].velocity.x),Math.abs(q.velocity.y-after.bodies[i].velocity.y),Math.abs(q.spin-after.bodies[i].spin),Math.abs(q.facing-after.bodies[i].facing)]));
 assert(identity<1e-9);assert(motion<1e-11);assert(Math.abs(after.workResidual)<1e-11);
 if(key==='stationaryNormalControl')assert(Math.abs(residue)<1e-9);
 const ref=references[0].cases[key].frozen,angularReferenceResidual=Math.abs(residue-Number(ref.angularResidual));assert(angularReferenceResidual<1e-9);
 const referenceMotion=Math.max(...after.bodies.flatMap((q,i)=>['position','velocity'].flatMap(k=>['x','y'].map(c=>Math.abs((q as any)[k][c]-Number(ref.after[i][k][c])))).concat(['spin','facing'].map(k=>Math.abs((q as any)[k]-Number(ref.after[i][k]))))));assert(referenceMotion<1e-11);
 cases.push({key,dt:f.duration,phases,impulse:s.impulse,timeImpulse,temporalMoment:s.temporalMoment,midpointTimeImpulse:s.impulse*f.duration/2,externalAngularImpulse:external,angularResidual:residue,geometricResidual:internal,identityResidual:identity,motionResidual:motion,workResidual:after.workResidual,angularReferenceResidual,referenceMotion,angularGatePassed:Math.abs(residue)<1e-9});
}
const movingSelected=references[0].cases.selected.movingPointPrescribedTape,
 positivePhaseWork=Math.max(...movingSelected.phases.map((p:any)=>Number(p.handWork))),applicationOnlyPassivityGatePassed=positivePhaseWork<=1e-14;
assert(!applicationOnlyPassivityGatePassed); // Retain the failed ablation, not a passive-solver success.
const result={protocol:'event-geometry-preflight-v2',source:sourceVersion(),input:{path,sha256:sha(path)},criterion:1e-9,cases,
 reference:{paths:referencePaths.map(p=>({path:p,sha256:sha(p)})),generatorSha256:sha('scripts/diag/physics/event-geometry-reference.py'),precision:[70,100],nonzeroDoubleAgreement:true,referenceZeroTail},
 applicationOnlyAblation:{angularResidual:Number(movingSelected.angularResidual),workResidual:Number(movingSelected.workResidual),positivePhaseWork,passivityCriterion:1e-14,applicationOnlyPassivityGatePassed},
 physicalGatePassed:cases.every(c=>c.angularGatePassed),worldIntegrated:false,adoptionReady:false};
writeFileSync(`${root}/geometry-preflight.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
