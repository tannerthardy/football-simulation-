/** Diagnostic only: an ordinary-speed relevance bound, not a motion estimate
 * or a production clearance certificate. Unknown motion remains unknown.
 * External contact can exceed free-running top speed; that remains a limit.
 */
import type {Vec2} from '../../src/core/vec.js';
import type {MovementSample} from '../../src/physics/movement-preview.js';
import {CONTACT_SCALE} from '../../src/physics/world.js';
import type {TeammatePicture} from '../../src/sim/teammate-information.js';
export function unknownRouteRelevance(own:Vec2,ownRadius:number,path:readonly MovementSample[],
  picture:TeammatePicture,radius:number,vmax:number){
  if((picture.source!=='observed'&&picture.source!=='remembered')||!(vmax>0))
    return{motion:'unknown' as const,relevance:'unsupported' as const,minimumOrdinaryGap:null};
  // No raw sampled velocity/origin is exposed. Allow the sample to be anywhere
  // within vmax*predictedFor of the frozen picture, then allow vmax*full age
  // plus future time. Do not read sentinel zero or advance the query position.
  const initialRadius=vmax*(picture.age+picture.predictedFor);
  let previous=own,gap=Infinity;
  for(const sample of path){
    const dx=sample.pos.x-previous.x,dy=sample.pos.y-previous.y;
    const u=Math.max(0,Math.min(1,((picture.pos.x-previous.x)*dx+(picture.pos.y-previous.y)*dy)/Math.max(1e-12,dx*dx+dy*dy)));
    const distance=Math.hypot(picture.pos.x-previous.x-u*dx,picture.pos.y-previous.y-u*dy);
    // End-of-interval radius conservatively covers the whole swept own segment.
    gap=Math.min(gap,distance-initialRadius-vmax*sample.t-CONTACT_SCALE*(ownRadius+radius));
    previous=sample.pos;
  }
  return{motion:'unknown' as const,relevance:gap>0?'disjoint' as const:'possibly-relevant' as const,
    minimumOrdinaryGap:gap,initialRadius};
}
