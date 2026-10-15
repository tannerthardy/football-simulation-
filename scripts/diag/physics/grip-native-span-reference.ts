/** Independent SPD force + RK4 + bisection at a significant tangent-force
 * reversal. Uniform reference is preserved. Existing active field, independent SPD/reel and separate steps/roots.
 */
import type {ActiveGripInput} from '../../../src/physics/active-grip.js';
import {SPAN} from './grip-mixed-span-model.js';
import {nativeSpanModel} from './grip-native-span-model.js';
import type {ReelProvider} from './grip-native-span-model.js';
// Independent reel expression: native normal body/foot demand and arm cap.
const referenceReel:ReelProvider=(q,g)=>{
  if(!(q.pullSpeed>0))return 0;
  const cross=g.nx*g.rby-g.ny*g.rbx,body=1/q.a.mass+1/q.b.mass+cross*cross/q.b.inertia,
    foot=q.mobility*(g.jnx*g.jnx+g.jny*g.jny),request=Math.max(0,g.vn+Math.min(q.pullSpeed,3)),wanted=request/(foot+q.tickDuration*body);
  const delivered=wanted>Math.min(q.capacity,q.armCapacity)?Math.min(q.capacity,q.armCapacity):wanted;
  if(delivered>0&&g.d<=q.minimumDistance/1.12)throw new RangeError('Native reel-stop scope');
  return delivered;
};
import {spanReferenceForce} from './grip-mixed-span-reference-force.js';
export function nativeSpanReference(input:ActiveGripInput,n:number){
  if(!Number.isInteger(n)||n<1||n>4096)throw new RangeError('Span event reference budget');
  const m=nativeSpanModel(input,spanReferenceForce,referenceReel,6*n+1024),floor=1e-9/(128*input.duration),
    events:Array<{time:number;residual:number}>=[];
  let y=m.initial.slice(),sign=Math.sign(m.frame(y).tangent),roots=0,atRoot=false;
  const step=(z:number[],h:number)=>{
    const add=(f:number[],s:number)=>z.map((v,i)=>v+s*f[i]),a=m.derivative(z),b=m.derivative(add(a,h/2)),c=m.derivative(add(b,h/2)),d=m.derivative(add(c,h));
    return z.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
  };
  for(let k=0;k<n;k++){
    const end=(k+1)*input.duration/n;
    for(let pieces=0;y[SPAN.TIME]<end-1e-17;pieces++){
      if(pieces>4||events.length>4)throw new RangeError('Span event reference piece budget');
      const h=end-y[SPAN.TIME],start=m.frame(y),trial=step(y,h),finish=m.frame(trial);
      if(!atRoot&&Math.abs(start.tangent)>floor)sign=Math.sign(start.tangent);
      if(sign===0||sign*finish.tangent>=-floor){y=trial;atRoot=false;continue;}
      let lo=0,hi=h,z=trial,solved=false;
      for(let retry=0;retry<40;retry++){
        roots++;const t=(lo+hi)/2;z=step(y,t);const gap=sign*m.frame(z).tangent/input.capacity;
        if(Math.abs(gap)<=1e-12||hi-lo<=1e-14){events.push({time:z[SPAN.TIME],residual:gap});solved=true;break;}
        if(gap>0)lo=t;else hi=t;
      }
      if(!solved)throw new RangeError('Span event reference root budget');y=z;sign*=-1;atRoot=true;
    }
  }
  return {...m.result(y),partitions:n,events,rootIterations:roots};
}
