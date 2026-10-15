/** Historical free-motion possibility set. This is a diagnostic exclusion
 * model, not a current-velocity estimate or a production admission rule.
 */
import type {Vec2} from '../../src/core/vec.js';
import type {PhysicalProfile} from '../../src/players/physical.js';
import type {MovementSample} from '../../src/physics/movement-preview.js';
import {CONTACT_SCALE} from '../../src/physics/world.js';
import type {TeammatePicture} from '../../src/sim/teammate-information.js';
type MotionProfile=Pick<PhysicalProfile,'vmax'|'tau'|'brake'|'lateral'>;
// Existing ordinary controllers top out at .8+.5*trait in engagement.ts.
// This conservative public ceiling is fixed before inspecting these outcomes.
export const ORDINARY_CUT_SKILL_CEILING=1.3;
export const OBSERVATION_STEP=.05;
export function ordinaryAcceleration(profile:MotionProfile){
  // Max norm of the locomotion friction ellipse at full capacity/energy.
  // Excludes external contact/constraint force and passive loaded recovery.
  return Math.max(profile.vmax/profile.tau,profile.brake,profile.lateral*ORDINARY_CUT_SKILL_CEILING);
}
export function historicalRegion(picture:TeammatePicture,profile:MotionProfile,future:number){
  if((picture.source!=='observed'&&picture.source!=='remembered')||!picture.sampledVel)return null;
  const elapsed=picture.age+future,velocity=picture.sampledVel;
  const origin={x:picture.pos.x-velocity.x*picture.predictedFor,y:picture.pos.y-velocity.y*picture.predictedFor};
  const center={x:origin.x+velocity.x*elapsed,y:origin.y+velocity.y*elapsed};
  const acceleration=ordinaryAcceleration(profile);
  // Semi-implicit native/substep integration: allow one full50ms tick of
  // acceleration-order error, using FULL age rather than the capped clock.
  const radius=.5*acceleration*elapsed*(elapsed+OBSERVATION_STEP);
  return{motion:'unknown' as const,origin,center,radius,elapsed,acceleration,
    sampledAt:picture.sampledAt,availableAt:picture.availableAt,age:picture.age,predictedFor:picture.predictedFor};
}
export function historicalRouteRelevance(own:Vec2,ownRadius:number,ownProfile:MotionProfile,
  path:readonly MovementSample[],picture:TeammatePicture,radius:number,profile:MotionProfile){
  let previous=own,time=0,region=historicalRegion(picture,profile,0),gap=Infinity;
  if(!region)return{motion:'unknown' as const,relevance:'unsupported' as const,minimumOrdinaryGap:null};
  for(const sample of path){
    const next=historicalRegion(picture,profile,sample.t)!;
    const a={x:previous.x-region.center.x,y:previous.y-region.center.y};
    const b={x:sample.pos.x-next.center.x,y:sample.pos.y-next.center.y};
    const dx=b.x-a.x,dy=b.y-a.y,u=Math.max(0,Math.min(1,-(a.x*dx+a.y*dy)/Math.max(1e-12,dx*dx+dy*dy)));
    const ownSamplingAllowance=.5*ordinaryAcceleration(ownProfile)*(sample.t-time)**2;
    gap=Math.min(gap,Math.hypot(a.x+u*dx,a.y+u*dy)-next.radius
      -CONTACT_SCALE*(ownRadius+radius)-ownSamplingAllowance);
    previous=sample.pos;time=sample.t;region=next;
  }
  return{motion:'unknown' as const,relevance:gap>0?'disjoint' as const:'possibly-relevant' as const,
    minimumOrdinaryGap:gap,currentRegion:historicalRegion(picture,profile,0)};
}
