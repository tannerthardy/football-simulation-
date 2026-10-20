/** An acquired moving outside boundary, with no promised future cut or help.
 * Point and velocity are retained together on the existing action cadence.
 */
import { FIELD_WIDTH } from '../core/field.js';
import { clamp, type Vec2 } from '../core/vec.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';

export interface ForceTrack {
  point: Vec2;
  velocity: Vec2;
}

/** Match motion only for a personally identified runner widening this side.
 * Both boundaries reuse pictures already acquired by the fit controller.
 * The existing track controller matches this motion and closes the offset;
 * do not lead the landmark again by a speculative interception horizon.
 */
export function forceTrack(a: Agent, seen: Perceived, x: number, surface: number,
  surfaceVelocity: number, side: number): ForceTrack {
  const outward = seen.carrying === true && Number.isFinite(seen.age) && seen.vel.y * side > 0;
  const boundary = () => {
    const runner = seen.pos.y + side * .7;
    const line = surface + side * .5;
    const y = side > 0 ? Math.max(runner,line) : Math.min(runner,line);
    const velocity = !outward ? 0 : runner === line
      ? side * Math.max(side*seen.vel.y,side*surfaceVelocity)
      : y === runner ? seen.vel.y : surfaceVelocity;
    const bounded = outward ? clamp(y,.3,FIELD_WIDTH-.3) : y;
    return { point:{x,y:bounded}, velocity:{x:0,y:bounded === y ? velocity : 0} };
  };
  return boundary();
}

const plans = new WeakMap<Agent,{aim:Vec2;at:number;velocity:Vec2}>();

/** Never pair a newly observed motion with an older adopted point. Even a
 * stationary/inward/unknown new cue changes the whole plan at the next read.
 */
export function retainedForceTrack(a: Agent, desired: ForceTrack, now: number): ForceTrack {
  const aim = a.mind.aim('force-fit',desired.point,now);
  let plan = plans.get(a);
  if (!plan || plan.aim !== aim) {
    plan={aim,at:now,velocity:{...desired.velocity}};
    plans.set(a,plan);
  }
  const y=plan.aim.y+plan.velocity.y*(now-plan.at);
  const bounded=plan.velocity.y ? clamp(y,.3,FIELD_WIDTH-.3) : y;
  return {point:{x:plan.aim.x,y:bounded},velocity:{x:0,y:y===bounded?plan.velocity.y:0}};
}
