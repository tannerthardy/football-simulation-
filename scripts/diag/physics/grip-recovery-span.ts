/** Actual issued nonzero foot command on the existing below-slip force law.
 * Diagnostic only. Native support/feet/controller decisions are not integrated
 * or altered here; World retains its explicit recovery-command fallback. */
import type {RecoveryGripInput} from './grip-recovery-input.js';
import {nativeSpanModel,nativeReel,nativeSpanDifference,type ReelProvider,type NativeSpanMotion} from './grip-native-span-model.js';
import {spanEventForce} from './grip-span-event-force.js';
import {spanReferenceForce} from './grip-mixed-span-reference-force.js';
import {nativeSpanInterval} from './grip-native-span-interval.js';
import {nativeSpanReference} from './grip-native-span-reference.js';
function model(q:RecoveryGripInput,reference:boolean,budget=4096){
  if(!Number.isFinite(q.reelStopDistance)||q.reelStopDistance<0||q.reelStopDistance>q.reach)throw new RangeError('Recovery reel-stop scope');
  const reel:ReelProvider=(_input,g)=>{if(g.d>q.reelStopDistance)throw new RangeError('Recovery reel-stop event');return 0;},
    solve=reference?spanReferenceForce:spanEventForce(1/q.a.mass+1/q.b.mass),provider:typeof solve=input=>{
      const f=solve(input);if(f.normal!==0)throw new RangeError('Recovery normal-tension event');return f;
    };
  return nativeSpanModel(q,provider,reel,budget,undefined,{capacity:q.footCapacity});
}
export function recoverySpanInterval(q:RecoveryGripInput){
  const r=nativeSpanInterval(q,model(q,false));
  if(r.positiveMotorWork!>r.motorWorkBudget!+1e-12||r.viscousWork!>1e-12||Math.abs(r.motorWork-r.correctionWork!-r.viscousWork!)>1e-10)
    throw new RangeError('Recovery motor work accounting');
  return {...r,correctionWork:r.correctionWork!,viscousWork:r.viscousWork!,positiveMotorWork:r.positiveMotorWork!,motorWorkBudget:r.motorWorkBudget!};
}
export function recoverySpanReference(input:RecoveryGripInput,n:number){
  const q=structuredClone(input),origin={...q.a.pos};for(const p of [q.a,q.b]){p.pos.x-=origin.x;p.pos.y-=origin.y;}
  const r=nativeSpanReference(q,n,model(q,true,6*n+1024));for(const p of [r.a.pos,r.b.pos,r.point]){p.x+=origin.x;p.y+=origin.y;}
  const G={x:q.ground[0].force.x+q.ground[1].force.x,y:q.ground[0].force.y+q.ground[1].force.y};
  r.externalAngularImpulse+=(origin.x*G.y-origin.y*G.x)*q.duration;
  const L=(p:typeof q.a)=>p.mass*(p.pos.x*p.vel.y-p.pos.y*p.vel.x)+p.inertia*p.spin;
  r.angularResidual=L(r.a)+L(r.b)-L(input.a)-L(input.b)-r.externalAngularImpulse;return r;
}
export function recoverySpanDifference(a:NativeSpanMotion,b:NativeSpanMotion){
  return Math.max(nativeSpanDifference(a,b),...(['correctionWork','viscousWork','positiveMotorWork'] as const).map(k=>Math.abs(a[k]!-b[k]!)/1e-9));
}
