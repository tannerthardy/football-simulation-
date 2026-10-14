/** One taught two-way Stick install. Receiver and QB call the same rule
 * with their own pictures; this module cannot access coverage or behavior.
 */
import {FIELD_WIDTH,OPP_GOAL_X} from '../core/field.js';
import {clamp,norm,sub,type Vec2} from '../core/vec.js';
import {arriveVelocity,stepBody,type Body,type MoveCommand} from '../physics/kinematics.js';
import type {PhysicalProfile} from '../players/physical.js';
import type {RouteDef,RoutePoint} from '../playbook/types.js';
import type {Perceived} from './perception.js';

export type StickBranch = 'sit' | 'out';
export interface StickInstall {
  readonly origin: Vec2;
  readonly los: number;
  readonly outside: number;
  readonly route: RouteDef;
  readonly effort: number;
  readonly routeSkill: number;
}
export interface OptionPicture extends Pick<Perceived,'pos'|'vel'|'pose'> { readonly i: number }
export interface StickRead {
  branch: StickBranch;
  key: number | null;
  reason: 'room-to-sit' | 'key-widening' | 'key-outside' | 'inside-or-head-up';
  keyPicture: OptionPicture | null;
}

export const stickStem = (p: StickInstall): Vec2 => ({x:p.los+p.route.points[0].d,
  y:p.origin.y+p.outside*p.route.points[0].l});

/** Read near the top of the shared stem, not after an elapsed-time guess.
 * In this six-yard install the decision region starts two yards before it.
 */
export function atStickDecision(p: StickInstall, pos: Vec2): boolean {
  return pos.x >= stickStem(p).x - 2;
}

export function readStick(p: StickInstall, pictures: readonly OptionPicture[]): StickRead {
  const stem=stickStem(p);
  let key:OptionPicture|null=null, distance=4;
  for(const d of pictures){
    if(d.pose==='down'||d.pose==='rising')continue;
    const D=Math.hypot(d.pos.x-stem.x,d.pos.y-stem.y);
    if(D<distance){distance=D;key=d;}
  }
  if(!key)return {branch:'sit',key:null,reason:'room-to-sit',keyPicture:null};
  const leverage=(key.pos.y-stem.y)*p.outside, widening=key.vel.y*p.outside;
  // The underneath key opening to the flat leaves the inside sit window.
  // Inside/head-up leverage instead makes the taught out the available choice.
  // This is a bounded two-way install, not a universal man/zone classifier.
  const reason=leverage>.5?'key-outside':leverage>-.5&&widening>1?'key-widening':'inside-or-head-up';
  return {branch:reason==='inside-or-head-up'?'out':'sit',key:key.i,reason,keyPicture:key};
}

/** Intent becomes knowable through achieved motion, never a private bit.
 * A stop or contact can be misinterpreted; this is evidence, not telepathy.
 */
export function observedStickBranch(p:StickInstall,picture:Perceived):StickBranch|null{
  const stem=stickStem(p), lateral=(picture.pos.y-stem.y)*p.outside;
  if(picture.pos.x<stem.x-1)return null;
  if(picture.vel.y*p.outside>1&&lateral>0)return 'out';
  if(picture.pos.x>=stem.x-1&&Math.abs(lateral)<1.5&&Math.hypot(picture.vel.x,picture.vel.y)<1)return 'sit';
  return null;
}

interface PlannedPoint {p:Vec2;s:number}
/** Same installed waypoints and field limits as the receiver. No live index,
 * settled state, press contact, chosen branch or future movement is read.
 */
function plannedPath(p:StickInstall,branch:StickBranch):PlannedPoint[]{
  const points:RoutePoint[]=branch==='out'?p.route.vsMan!:p.route.points;
  const out=points.map(r=>({p:{x:Math.min(OPP_GOAL_X+8.5,p.los+r.d),
    y:clamp(p.origin.y+r.l*p.outside,1.2,FIELD_WIDTH-1.2)},s:r.s??1}));
  if(branch==='out'&&out.length){
    const last=out.at(-1)!.p,prev=out.length>1?out.at(-2)!.p:p.origin,d=norm(sub(last,prev));
    let k=40;
    if(d.y< -1e-6)k=Math.min(k,(last.y-5)/-d.y);
    if(d.y>1e-6)k=Math.min(k,(FIELD_WIDTH-5-last.y)/d.y);
    const edge={x:Math.min(OPP_GOAL_X+8.5,last.x+d.x*k),y:last.y+d.y*k};
    out.push({p:edge,s:k<39?.75:1});
    if(k<39)out.push({p:{x:Math.min(OPP_GOAL_X+8.5,edge.x+40),y:edge.y},s:1});
  }
  return out;
}
const passed=(pos:Vec2,p:Vec2,next:Vec2):boolean=>(pos.x-p.x)*(next.x-p.x)+(pos.y-p.y)*(next.y-p.y)>0
  &&Math.hypot(pos.x-p.x,pos.y-p.y)<2;

/** Forecast a rehearsed branch from the last observed motion. Nominal physical
 * capabilities remain fixed; contact and later receiver decisions are unknown.
 * Perceived.pos is already projected: `memoryAge` is time since acquisition,
 * not Perceived.age. A stale look can honestly predict the wrong path.
 */
export function predictStick(p:StickInstall,branch:StickBranch,picture:Perceived,
  profile:PhysicalProfile,ahead:number,memoryAge=0,dt=.05):Vec2{
  const path=plannedPath(p,branch),body:Body={pos:{...picture.pos},vel:{...picture.vel},
    facing:picture.facing,energy:1,profile},cutSkill=.8+.4*p.routeSkill;
  const targetTime=Math.max(0,ahead+memoryAge),count=Math.ceil(targetTime/dt);
  let idx=0;
  for(let k=0;k<count;k++){
    let command:MoveCommand|null=null;
    for(let guard=0;guard<6;guard++){
      if(idx>=path.length)break;
      const point=path[idx],next=path[idx+1],D=Math.hypot(point.p.x-body.pos.x,point.p.y-body.pos.y);
      if(D<.6||(next&&passed(body.pos,point.p,next.p))){idx++;continue;}
      const top=profile.vmax*p.effort;
      let through=idx===path.length-1&&branch==='sit'?0:point.s*top*clamp(.82+.3*p.routeSkill,0,1);
      if(next){
        const ax=point.p.x-body.pos.x,ay=point.p.y-body.pos.y,bx=next.p.x-point.p.x,by=next.p.y-point.p.y;
        const cos=(ax*bx+ay*by)/((Math.hypot(ax,ay)||1)*(Math.hypot(bx,by)||1));
        through=Math.min(through,Math.sqrt(profile.lateral*cutSkill*1.3/Math.max(.04,1-cos)));
      }
      command={vel:arriveVelocity(body,point.p,top,through),cutSkill};break;
    }
    if(!command)command=branch==='out'?{vel:body.vel}:{vel:arriveVelocity(body,path.at(-1)!.p,profile.vmax*.6,0)};
    stepBody(body,command,Math.min(dt,targetTime-k*dt));
  }
  return {...body.pos};
}
