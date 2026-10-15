/** Local frozen-frame passive tangent integration. This is not a World path.
 * Leg forces and saturated ground yaw stay constant; a zero-slip event splits
 * sliding from sticking (or sliding the other way). Force, first moment, work
 * and absolute effort use the same at-most-two phases. No recovery law. */
export interface SlipBody {
  mass: number;
  inertia: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  facing: number;
  spin: number;
  groundAcceleration: { x: number; y: number };
  groundYawAcceleration: number;
  yaw?: { targetHeading: number; turnRate: number; accelerationLimit: number };
}
export interface SlipField {
  duration: number;
  remaining: number;
  tangent: { x: number; y: number };
  arms: [number, number];
  forceLimit: number;
  bodies: [SlipBody, SlipBody];
}
export interface SlipPhase { duration: number; force: number; slipBefore: number; slipAfter: number; work: number; }
export type SlipResult = { ok: false; reason: 'ground-motor-transition' | 'controller-deadline' } | {
  ok: true; bodies: [SlipBody, SlipBody]; phases: SlipPhase[];
  impulse: number; temporalMoment: number; absoluteImpulse: number; handWork: number;
  groundWork: [number, number]; energyChange: number; workResidual: number;
};
const energy = (bs: readonly SlipBody[]) => bs.reduce((s, b) => s + .5*b.mass*(b.velocity.x*b.velocity.x+b.velocity.y*b.velocity.y)+.5*b.inertia*b.spin*b.spin, 0);

export function integrateLocalSlip(field: SlipField): SlipResult {
  const { duration: h, remaining, tangent: t, arms, forceLimit: limit } = field;
  if (!Number.isFinite(h) || h < 0 || !Number.isFinite(limit) || limit < 0
    || !Number.isFinite(remaining) || !(remaining > 0)
    || field.bodies.length!==2 || arms.length!==2
    || !Number.isFinite(t.x+t.y) || Math.abs(t.x*t.x+t.y*t.y-1) > 1e-12
    || field.bodies.some(b => !(b.mass > 0 && b.inertia > 0)
      || ![b.mass,b.inertia,b.position.x,b.position.y,b.velocity.x,b.velocity.y,b.facing,b.spin,b.groundAcceleration.x,b.groundAcceleration.y,b.groundYawAcceleration].every(Number.isFinite))
    || !arms.every(r => Number.isFinite(r) && r >= 0)) throw new RangeError('Invalid local slip field');
  const bs = field.bodies.map(b => ({...b, position:{...b.position}, velocity:{...b.velocity}})) as [SlipBody,SlipBody];
  const beforeEnergy = energy(bs), phases: SlipPhase[] = [], groundWork: [number,number] = [0,0];
  let impulse=0, temporalMoment=0, absoluteImpulse=0, handWork=0, elapsed=0;
  const finish = (): SlipResult => {const change=energy(bs)-beforeEnergy;return {ok:true,bodies:bs,phases,impulse,temporalMoment,absoluteImpulse,handWork,groundWork,energyChange:change,workResidual:change-groundWork[0]-groundWork[1]-handWork};};
  if (h === 0) return finish();
  if (bs.some(b => b.yaw) && h >= remaining) return {ok:false,reason:'controller-deadline'};
  for (const b of bs) {
    const y=b.yaw, g=b.groundYawAcceleration;
    if (!y ? g!==0 : ![y.targetHeading,y.turnRate,y.accelerationLimit].every(Number.isFinite)
      || y.turnRate<=0 || y.accelerationLimit<0
      || Math.abs(Math.abs(g)-y.accelerationLimit)>64*Number.EPSILON*(1+Math.abs(g)+y.accelerationLimit))
      return {ok:false,reason:'ground-motor-transition'};
  }
  const mobility=(t.x*t.x+t.y*t.y)*(1/bs[0].mass+1/bs[1].mass)+arms[0]**2/bs[0].inertia+arms[1]**2/bs[1].inertia;
  const external=(bs[1].groundAcceleration.x-bs[0].groundAcceleration.x)*t.x+(bs[1].groundAcceleration.y-bs[0].groundAcceleration.y)*t.y
    -arms[0]*bs[0].groundYawAcceleration-arms[1]*bs[1].groundYawAcceleration;
  let slip=(bs[1].velocity.x-bs[0].velocity.x)*t.x+(bs[1].velocity.y-bs[0].velocity.y)*t.y-arms[0]*bs[0].spin-arms[1]*bs[1].spin;
  const advance = (d:number, force:number): boolean => {
    const rate=external+mobility*force, endSlip=slip+rate*d;
    const work=force*(slip*d+.5*rate*d*d);
    for (let i=0;i<2;i++) {
      const b=bs[i], sign=i===0?-1:1, ax=b.groundAcceleration.x+sign*t.x*force/b.mass,
        ay=b.groundAcceleration.y+sign*t.y*force/b.mass, angular=b.groundYawAcceleration-arms[i]*force/b.inertia;
      const dx=b.velocity.x*d+.5*ax*d*d, dy=b.velocity.y*d+.5*ay*d*d, angle=b.spin*d+.5*angular*d*d;
      const y=b.yaw;
      if (y && y.accelerationLimit>0) {
        // For constant angular acceleration q=headingError-remaining*spin
        // changes monotonically. Check both ends and rate limits; otherwise
        // this interval needs another motor event, outside this kernel.
        const direction=Math.sign(b.groundYawAcceleration), r=remaining-elapsed,
          q0=y.targetHeading-b.facing-r*b.spin,
          q1=y.targetHeading-(b.facing+angle)-(r-d)*(b.spin+angular*d),
          tolerance=64*Number.EPSILON*(1+Math.abs(y.targetHeading)+Math.abs(b.facing)+Math.abs(r*b.spin));
        if (direction*q0 < -tolerance || direction*q1 < -tolerance
          || direction*b.spin>y.turnRate+tolerance || direction*(b.spin+angular*d)>y.turnRate+tolerance) return false;
      }
      groundWork[i]+=b.mass*(b.groundAcceleration.x*dx+b.groundAcceleration.y*dy)+b.inertia*b.groundYawAcceleration*angle;
      b.position.x+=dx; b.position.y+=dy; b.facing+=angle;
      b.velocity.x+=ax*d; b.velocity.y+=ay*d; b.spin+=angular*d;
    }
    phases.push({duration:d,force,slipBefore:slip,slipAfter:endSlip,work});
    impulse+=force*d; absoluteImpulse+=Math.abs(force)*d;
    temporalMoment+=force*d*(h-elapsed-.5*d); handWork+=work; elapsed+=d; slip=endSlip;
    return true;
  };
  const holding = () => Math.max(-limit,Math.min(limit,-external/mobility));
  if (slip===0 || limit===0) {
    if (!advance(h,limit===0?0:holding())) return {ok:false,reason:'ground-motor-transition'};
  } else {
    const force=-Math.sign(slip)*limit, rate=external+mobility*force;
    const hit=slip*rate<0?-slip/rate:Infinity, first=Math.min(h,hit);
    if (!advance(first,force)) return {ok:false,reason:'ground-motor-transition'};
    if (first<h) {
      // The analytic event is zero slip, not an impulse that snaps velocity.
      // Do not project the body coordinates or clamp the computed work.
      slip=0;
      if (!advance(h-first,holding())) return {ok:false,reason:'ground-motor-transition'};
    }
  }
  return finish();
}
