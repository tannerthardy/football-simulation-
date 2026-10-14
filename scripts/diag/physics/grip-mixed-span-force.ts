/** Existing tension-only spring/damper and sticking tangent, solved together
 * on one passive foot. Scope ends BEFORE the shared vector cap/slip boundary;
 * no replacement cap allocator, active law or capacity is supplied here. */
export interface SpanForceInput{
  vn:number;vt:number;nn:number;nt:number;tt:number;inverseMass:number;extension:number;capacity:number;
}
export function spanForce(input:SpanForceInput){
  const {vn,vt,nn,nt,tt,inverseMass:B,extension:e,capacity:C}=input;
  if(!Object.values(input).every(Number.isFinite)||nn<=0||tt<=0||nn*tt-nt*nt<=0||B<=0||e<0||C<=0)
    throw new RangeError('Mixed span force input');
  const w=2*Math.PI*6,k=w*w/B,d=2*.8*w/B,
    reduced=nn-nt*nt/tt,normal=Math.min(0,-(d*(vn-nt*vt/tt)+k*e)/(1+d*reduced)),
    tangent=-(vt+nt*normal)/tt,total=Math.hypot(normal,tangent),
    normalVelocity=vn+nn*normal+nt*tangent,tangentVelocity=vt+nt*normal+tt*tangent,
    normalTarget=normal+d*normalVelocity+k*e,
    targetResidual=Math.max(normal<0?Math.abs(normalTarget)/Math.max(1,Math.abs(normal),k*e):Math.max(0,normalTarget)/Math.max(1,k*e),
      Math.abs(tangentVelocity)/Math.max(1,Math.abs(vt))),
    loss=-(normal+k*e)*normalVelocity-tangent*tangentVelocity;
  if(total>=.98*C||targetResidual>1e-11||loss<-1e-8)throw new RangeError('Mixed span cap/target/power scope');
  return {normal,tangent,normalVelocity,tangentVelocity,total,stiffness:k,damping:d,loss,targetResidual};
}

/** Audit only: unchanged eight ordered normal/tangent target iterations in
 * the h->0 limit, including the coded spring bias. Work allowance excluded so
 * its rejected stored-energy source can be diagnosed separately. */
export function orderedSpanTarget(q:SpanForceInput){
  const w=2*Math.PI*6,k=w*w/q.inverseMass,d=2*.8*w/q.inverseMass;
  let normal=0,tangent=0;
  for(let pass=0;pass<8;pass++){
    normal=Math.max(-Math.sqrt(Math.max(0,q.capacity*q.capacity-tangent*tangent)),
      Math.min(0,-(d*(q.vn+q.nt*tangent)+k*q.extension)/(1+d*q.nn)));
    tangent=Math.max(-Math.sqrt(Math.max(0,q.capacity*q.capacity-normal*normal)),
      Math.min(Math.sqrt(Math.max(0,q.capacity*q.capacity-normal*normal)),-(q.vt+q.nt*normal)/q.tt));
  }
  return {normal,tangent};
}
