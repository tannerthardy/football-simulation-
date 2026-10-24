/** Local access to an assigned backer, using acquired bodies and own movement.
 * This predicts neither a teammate's next decision nor a successful block.
 */
import { FIELD_WIDTH } from '../core/field.js';
import { clamp, type Vec2 } from '../core/vec.js';
import { cornerSpeed, fatigueFactor, movingArrivalVelocity, type MoveCommand } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import { availability, supportParams } from '../physics/support.js';
import type { World } from '../physics/world.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';

export interface ClimbSurface { seen: Perceived; radius: number; key: number }
export interface ClimbAccess {
  at: number; goal: Vec2; flow: Vec2; through: number; backer: Perceived; obstacle: number;
}
const STEPS = 12; // A few steps, the existing local movement-preview horizon.

function gap(a: Agent, path: ReturnType<typeof previewFreeMovement>, p: ClimbSurface): number {
  let px = a.pos.x-p.seen.pos.x, py = a.pos.y-p.seen.pos.y;
  const radius = a.profile.radius+p.radius;
  let minimum = Math.hypot(px,py)-radius;
  for (const s of path) {
    const rx = s.pos.x-p.seen.pos.x-p.seen.vel.x*s.t, ry = s.pos.y-p.seen.pos.y-p.seen.vel.y*s.t;
    const ex = rx-px, ey = ry-py;
    const along = clamp(-(px*ex+py*ey)/Math.max(1e-12,ex*ex+ey*ey),0,1);
    minimum = Math.min(minimum,Math.hypot(px+along*ex,py+along*ey)-radius);
    px = rx; py = ry;
  }
  return minimum;
}

export function climbAccessCommand(a: Agent, read: ClimbAccess, now: number): MoveCommand {
  const dt = now-read.at;
  const goal = { x:read.goal.x+read.flow.x*dt, y:read.goal.y+read.flow.y*dt };
  const capacity = a.body.support
    ? availability(a.body.support,supportParams(a.profile),fatigueFactor(a.body.energy)) : 1;
  return { vel:movingArrivalVelocity(a.body,goal,read.flow,a.profile.vmax,.1,read.through,1,capacity),
    facing:Math.atan2(read.backer.pos.y-a.pos.y,read.backer.pos.x-a.pos.x) };
}

/** Keep an unobstructed interception exactly. Otherwise compare two short
 * steps around an acquired first-level body, including every supplied body in
 * the clearance check. Swept own movement, not a ray between centers, decides
 * whether a request clears. Pictures move at their observed velocity only.
 * The ordinary controller read cadence owns expiry; there is no route timer.
 */
export type ClimbAccessResult =
  | { kind: 'direct' }
  | { kind: 'detour'; plan: ClimbAccess }
  | { kind: 'unvalidated'; command: MoveCommand };

/** Explicit result for released combinations. A failed search must not imply
 * that the original interception is clear. The legacy adapter below keeps
 * ordinary climbs' existing policy; gathering is scoped to departure only. */
export function assessClimbAccess(a: Agent, backer: Perceived, surfaces: readonly ClimbSurface[],
  original: MoveCommand, now: number, interval: number, handContact: World['handContact'],
  gather = false): ClimbAccessResult {
  const path = previewFreeMovement(a.body,original,now,STEPS,handContact);
  const originalGaps = surfaces.map(p=>gap(a,path,p));
  const blocking = surfaces.map((p,i)=>({p,gap:originalGaps[i]}))
    .filter(q=>q.gap<-.025).sort((a,b)=>a.gap-b.gap)[0];
  if (!blocking) return { kind: 'direct' };
  const body = blocking.p;
  const relative = { x:a.pos.x-body.seen.pos.x, y:a.pos.y-body.seen.pos.y };
  const distance = Math.hypot(relative.x,relative.y);
  if (distance<1e-9) return { kind: 'unvalidated', command: {vel:{x:0,y:0},facing:a.facing} };
  const ray = { x:backer.pos.x-body.seen.pos.x, y:backer.pos.y-body.seen.pos.y };
  const preferred = Math.sign(relative.x*ray.y-relative.y*ray.x)||1;
  const radius = Math.max(a.profile.radius+body.radius+.15,distance);
  let best: ClimbAccess | null = null, bestScore = Infinity;
  for (const sign of (gather ? [preferred,-preferred,0] : [preferred,-preferred])) {
    // Same short foot-replacement arc as the existing run-block fit recovery.
    const angle = sign*.35;
    const goal = { x:body.seen.pos.x+(relative.x*Math.cos(angle)-relative.y*Math.sin(angle))*radius/distance,
      y:body.seen.pos.y+(relative.x*Math.sin(angle)+relative.y*Math.cos(angle))*radius/distance };
    if (goal.y<.5||goal.y>FIELD_WIDTH-.5) continue;
    const read: ClimbAccess = { at:now, goal, flow:{...body.seen.vel},
      through:sign===0?0:cornerSpeed(a.body,goal,backer.pos,radius), backer:structuredClone(backer), obstacle:body.key };
    const trial = previewFreeMovement(a.body,climbAccessCommand(a,read,now),now,STEPS,handContact);
    if (trial.some(s=>s.support!=='up')) continue;
    const gaps = surfaces.map(p=>gap(a,trial,p));
    // Do not create another collision or deepen an already acquired overlap.
    if (gaps.some((g,i)=>g<Math.min(0,Math.hypot(a.pos.x-surfaces[i].seen.pos.x,
      a.pos.y-surfaces[i].seen.pos.y)-a.profile.radius-surfaces[i].radius)-1e-9)) continue;
    const last = trial[Math.max(0,Math.min(trial.length-1,Math.round(interval/.05)-1))];
    const score = Math.hypot(last.pos.x-backer.pos.x-backer.vel.x*last.t,
      last.pos.y-backer.pos.y-backer.vel.y*last.t);
    if (score<bestScore) { best=read; bestScore=score; }
  }
  if (best) return { kind: 'detour', plan: best };
  // Braking is an explicit unvalidated fallback, not a claim that standing
  // clears a moving surface. Compare its swept incursion to the original.
  const braking: MoveCommand = {vel:{x:0,y:0},facing:a.facing};
  if (!gather) return {kind:'unvalidated',command:original};
  const brakePath = previewFreeMovement(a.body,braking,now,STEPS,handContact);
  const incursion = (p: ReturnType<typeof previewFreeMovement>) => Math.min(...surfaces.map(s=>gap(a,p,s)));
  return {kind:'unvalidated',command:incursion(brakePath)>incursion(path)?braking:original};
}

/** Preserve the existing ordinary-climb contract and candidate set. */
export function chooseClimbAccess(a: Agent, backer: Perceived, surfaces: readonly ClimbSurface[],
  original: MoveCommand, now: number, interval: number, handContact: World['handContact']): ClimbAccess | null {
  const result=assessClimbAccess(a,backer,surfaces,original,now,interval,handContact);
  return result.kind==='detour'?result.plan:null;
}
