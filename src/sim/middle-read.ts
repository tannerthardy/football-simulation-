/** One installed seam/post variant. Roof means observed deep bodies, never
 * the defensive call, a safety's job or the receiver's private intention. */
import {FIELD_WIDTH} from '../core/field.js';
import type {Vec2} from '../core/vec.js';
import type {PhysicalProfile} from '../players/physical.js';
import type {Perceived} from './perception.js';
import {predictContinueRoute,type OptionPicture,type RouteInstall} from './option-route.js';

export type MiddleBranch='seam'|'post';
export type MiddleInstall=RouteInstall;
export interface MiddleRead {
  branch:MiddleBranch;
  reason:'middle-occupied'|'split-roof'|'unresolved-roof';
  key:number|null;
  keyPicture:OptionPicture|null;
  flanks:number[];
}

export function atMiddleDecision(p:MiddleInstall,pos:Vec2):boolean{
  return pos.x>=p.los+p.route.middleRead!.decisionDepth;
}

/** A pole runner counts exactly like another visible deep body. A split
 * picture supports the post only while its middle window is unoccupied.
 * Missing evidence keeps the installed seam; absence is not an open roof.
 * These spatial bounds describe this install, not a universal coverage ID. */
export function readMiddle(p:MiddleInstall,pictures:readonly OptionPicture[]):MiddleRead{
  const center=FIELD_WIDTH/2;
  const roof=pictures.filter(d=>d.pose!=='down'&&d.pose!=='rising'
    &&d.pos.x>=p.los+10&&d.pos.x<=p.los+30);
  const middle=roof.filter(d=>Math.abs(d.pos.y-center)<=4)
    .sort((a,b)=>Math.hypot(a.pos.x-p.los-18,a.pos.y-center)-Math.hypot(b.pos.x-p.los-18,b.pos.y-center))[0];
  if(middle)return {branch:'seam',reason:'middle-occupied',key:middle.i,keyPicture:middle,flanks:[]};
  const left=roof.find(d=>d.pos.y>center+4),right=roof.find(d=>d.pos.y<center-4);
  return {branch:left&&right?'post':'seam',reason:left&&right?'split-roof':'unresolved-roof',
    key:null,keyPicture:null,flanks:[left?.i,right?.i].filter((i):i is number=>i!==undefined)};
}

/** Only an achieved break identifies a choice already made. Straight travel
 * beyond the stem can identify seam; a new key alone cannot reveal intention. */
export function observedMiddleBranch(p:MiddleInstall,picture:Perceived):MiddleBranch|null{
  const stem=p.route.points[0],inside=-(picture.pos.y-p.origin.y)*p.outside;
  if(picture.pos.x<p.los+stem.d-1)return null;
  if(-picture.vel.y*p.outside>1&&inside>1)return 'post';
  if(picture.pos.x>p.los+stem.d+1&&inside<1.3&&Math.abs(picture.vel.y)<1)return 'seam';
  return null;
}

export function predictMiddle(p:MiddleInstall,branch:MiddleBranch,picture:Perceived,
  profile:PhysicalProfile,ahead:number,memoryAge=0,dt=.05):Vec2{
  return predictContinueRoute(p,branch==='post'?p.route.middleRead!.post:p.route.points,
    picture,profile,ahead,memoryAge,dt);
}
