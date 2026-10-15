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
interface Working {
  bodies: [SlipBody, SlipBody]; phases: SlipPhase[]; groundWork: [number, number];
  impulse: number; temporalMoment: number; absoluteImpulse: number; handWork: number; elapsed: number; slip: number;
}
function energy(bs: readonly SlipBody[]): number {
  let sum=0;
  for (const b of bs) sum=sum+.5*b.mass*(b.velocity.x*b.velocity.x+b.velocity.y*b.velocity.y)+.5*b.inertia*b.spin*b.spin;
  return sum;
}
function finish(state: Working, before: number): SlipResult {
  const change=energy(state.bodies)-before;
  return {ok:true,bodies:state.bodies,phases:state.phases,impulse:state.impulse,temporalMoment:state.temporalMoment,
    absoluteImpulse:state.absoluteImpulse,handWork:state.handWork,groundWork:state.groundWork,
    energyChange:change,workResidual:change-state.groundWork[0]-state.groundWork[1]-state.handWork};
}
function advancePhase(field: SlipField, state: Working, d: number, force: number, rate: number): boolean {
  const {bodies:bs,slip,elapsed}=state, {arms,tangent:t,remaining,duration:h}=field;
  const endSlip=slip+rate*d, work=force*(slip*d+.5*rate*d*d);
  for (let i=0;i<2;i++) {
    const b=bs[i], sign=i===0?-1:1, ax=b.groundAcceleration.x+sign*t.x*force/b.mass,
      ay=b.groundAcceleration.y+sign*t.y*force/b.mass, angular=b.groundYawAcceleration-arms[i]*force/b.inertia;
    const dx=b.velocity.x*d+.5*ax*d*d, dy=b.velocity.y*d+.5*ay*d*d, angle=b.spin*d+.5*angular*d*d;
    const y=b.yaw;
    if (y && y.accelerationLimit>0) {
      // q=headingError-remaining*spin is monotone during a constant-force
      // phase. A sign or rate-limit change needs another ground-motor event.
      const direction=Math.sign(b.groundYawAcceleration), r=remaining-elapsed,
        q0=y.targetHeading-b.facing-r*b.spin,
        q1=y.targetHeading-(b.facing+angle)-(r-d)*(b.spin+angular*d),
        tolerance=64*Number.EPSILON*(1+Math.abs(y.targetHeading)+Math.abs(b.facing)+Math.abs(r*b.spin));
      if (direction*q0 < -tolerance || direction*q1 < -tolerance
        || direction*b.spin>y.turnRate+tolerance || direction*(b.spin+angular*d)>y.turnRate+tolerance) return false;
    }
    state.groundWork[i]+=b.mass*(b.groundAcceleration.x*dx+b.groundAcceleration.y*dy)+b.inertia*b.groundYawAcceleration*angle;
    b.position.x+=dx; b.position.y+=dy; b.facing+=angle;
    b.velocity.x+=ax*d; b.velocity.y+=ay*d; b.spin+=angular*d;
  }
  state.phases.push({duration:d,force,slipBefore:slip,slipAfter:endSlip,work});
  state.impulse+=force*d; state.absoluteImpulse+=Math.abs(force)*d;
  state.temporalMoment+=force*d*(h-elapsed-.5*d); state.handWork+=work; state.elapsed+=d; state.slip=endSlip;
  return true;
}

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
  const beforeEnergy=energy(bs), state: Working={bodies:bs,phases:[],groundWork:[0,0],impulse:0,temporalMoment:0,absoluteImpulse:0,handWork:0,elapsed:0,slip:0};
  if (h === 0) return finish(state,beforeEnergy);
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
  const slip=(bs[1].velocity.x-bs[0].velocity.x)*t.x+(bs[1].velocity.y-bs[0].velocity.y)*t.y-arms[0]*bs[0].spin-arms[1]*bs[1].spin;
  state.slip=slip;
  const holding=Math.max(-limit,Math.min(limit,-external/mobility));
  if (slip===0 || limit===0) {
    if (!advancePhase(field,state,h,limit===0?0:holding,limit===0?external:external+mobility*holding)) return {ok:false,reason:'ground-motor-transition'};
  } else {
    const force=-Math.sign(slip)*limit, rate=external+mobility*force;
    const hit=slip*rate<0?-slip/rate:Infinity, first=Math.min(h,hit);
    if (!advancePhase(field,state,first,force,rate)) return {ok:false,reason:'ground-motor-transition'};
    if (first<h) {
      // The analytic event is zero slip, not an impulse that snaps velocity.
      // Do not project the body coordinates or clamp the computed work.
      state.slip=0;
      if (!advancePhase(field,state,h-first,holding,external+mobility*holding)) return {ok:false,reason:'ground-motor-transition'};
    }
  }
  return finish(state,beforeEnergy);
}
