/** Local access to an assigned backer, using acquired bodies and own movement.
 * This predicts neither a teammate's next decision nor a successful block.
 */
import { FIELD_WIDTH } from '../core/field.js';
import { clamp, type Vec2 } from '../core/vec.js';
import { cornerSpeed, fatigueFactor, movingArrivalVelocity, type Body, type MoveCommand } from '../physics/kinematics.js';
import { previewFreeMovement, type MovementRequest } from '../physics/movement-preview.js';
import { availability, supportParams } from '../physics/support.js';
import type { World } from '../physics/world.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';

export interface ClimbSurface { seen: Perceived; radius: number; key: number }
export interface ClimbAccess {
  at: number; goal: Vec2; flow: Vec2; through: number; backer: Perceived; obstacle: number;
  /** Preserve the chosen side of this surface until a new picture invalidates it. */
  turn?: number;
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

function accessCommand(body: Readonly<Body>, read: ClimbAccess, now: number): MoveCommand {
  const dt = now-read.at;
  const goal = { x:read.goal.x+read.flow.x*dt, y:read.goal.y+read.flow.y*dt };
  const capacity = body.support
    ? availability(body.support,supportParams(body.profile),fatigueFactor(body.energy)) : 1;
  return { vel:movingArrivalVelocity(body,goal,read.flow,body.profile.vmax,.1,read.through,1,capacity),
    facing:Math.atan2(read.backer.pos.y-body.pos.y,read.backer.pos.x-body.pos.x) };
}

export function climbAccessCommand(a: Agent, read: ClimbAccess, now: number): MoveCommand {
  return accessCommand(a.body,read,now);
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

/** Command-trace record of one assessment: the values the search already
 * computed, nothing evaluated for the record. `allowed` is each surface's
 * clearance bound: zero, or the acquired overlap he already has. */
export interface ClimbAccessRecord {
  surfaces: Array<{ key: number; current: number; allowed: number; original: number }>;
  obstacle: number | null;
  candidates: Array<{ sign: number; goal: Vec2; rejected: 'field' | 'support' | 'clearance' | null;
    support?: { step: number; state: string }; gaps?: number[]; failed?: number[]; score?: number }>;
  fallback?: { original: number; braking: number; gaps: number[]; chose: 'braking' | 'original' };
  result: ClimbAccessResult['kind'];
}

/** Explicit result for released combinations. A failed search must not imply
 * that the original interception is clear. The legacy adapter below keeps
 * ordinary climbs' existing policy; gathering is scoped to departure only. */
export function assessClimbAccess(a: Agent, backer: Perceived, surfaces: readonly ClimbSurface[],
  original: MoveCommand, now: number, interval: number, handContact: World['handContact'],
  gather = false, control: MovementRequest = original,
  previous: ClimbAccess | null = null, record?: (r: ClimbAccessRecord) => void): ClimbAccessResult {
  const path = previewFreeMovement(a.body,gather?control:original,now,STEPS,handContact);
  const originalGaps = surfaces.map(p=>gap(a,path,p));
  const current = (i: number) => Math.hypot(a.pos.x-surfaces[i].seen.pos.x,a.pos.y-surfaces[i].seen.pos.y)-a.profile.radius-surfaces[i].radius;
  const log: ClimbAccessRecord | undefined = record && { obstacle: null, candidates: [], result: 'direct',
    surfaces: surfaces.map((p,i)=>({ key:p.key, current:current(i), allowed:Math.min(0,current(i)), original:originalGaps[i] })) };
  const done = (r: ClimbAccessResult): ClimbAccessResult => { if (log) { log.result = r.kind; record!(log); } return r; };
  const blocking = surfaces.map((p,i)=>({p,gap:originalGaps[i]}))
    .filter(q=>gather
      ? q.gap < Math.min(0,Math.hypot(a.pos.x-q.p.seen.pos.x,a.pos.y-q.p.seen.pos.y)-a.profile.radius-q.p.radius)-1e-9
      : q.gap<-.025).sort((a,b)=>a.gap-b.gap)[0];
  if (!blocking) return done({ kind: 'direct' });
  const body = blocking.p;
  if (log) log.obstacle = body.key;
  const relative = { x:a.pos.x-body.seen.pos.x, y:a.pos.y-body.seen.pos.y };
  const distance = Math.hypot(relative.x,relative.y);
  if (distance<1e-9) return done({ kind: 'unvalidated', command: {vel:{x:0,y:0},facing:a.facing} });
  const ray = { x:backer.pos.x-body.seen.pos.x, y:backer.pos.y-body.seen.pos.y };
  const preferred = Math.sign(relative.x*ray.y-relative.y*ray.x)||1;
  const radius = Math.max(a.profile.radius+body.radius+.15,distance);
  let best: ClimbAccess | null = null, bestScore = Infinity;
  const continued=gather&&previous?.obstacle===body.key?previous.turn:undefined;
  const signs=gather?[...new Set([continued,preferred,-preferred,0].filter((s):s is number=>s!==undefined))]:[preferred,-preferred];
  for (const sign of signs) {
    // Same short foot-replacement arc as the existing run-block fit recovery.
    const angle = sign*.35;
    const goal = { x:body.seen.pos.x+(relative.x*Math.cos(angle)-relative.y*Math.sin(angle))*radius/distance,
      y:body.seen.pos.y+(relative.x*Math.sin(angle)+relative.y*Math.cos(angle))*radius/distance };
    const entry: ClimbAccessRecord['candidates'][number] | undefined = log && { sign, goal: { ...goal }, rejected: null };
    if (entry) log!.candidates.push(entry);
    if (goal.y<.5||goal.y>FIELD_WIDTH-.5) { if (entry) entry.rejected = 'field'; continue; }
    const read: ClimbAccess = { at:now, goal, flow:{...body.seen.vel},
      through:sign===0?0:cornerSpeed(a.body,goal,backer.pos,radius), backer:structuredClone(backer), obstacle:body.key, ...(gather?{turn:sign}:{}) };
    const command: MovementRequest=gather
      ? (body,dt)=>accessCommand(body,read,now+dt)
      : climbAccessCommand(a,read,now);
    const trial = previewFreeMovement(a.body,command,now,STEPS,handContact);
    if (trial.some(s=>s.support!=='up')) {
      if (entry) { const step = trial.findIndex(s=>s.support!=='up');
        entry.rejected = 'support'; entry.support = { step, state: String(trial[step].support) }; }
      continue;
    }
    const gaps = surfaces.map(p=>gap(a,trial,p));
    if (entry) entry.gaps = gaps.slice();
    // Do not create another collision or deepen an already acquired overlap.
    if (gaps.some((g,i)=>g<Math.min(0,Math.hypot(a.pos.x-surfaces[i].seen.pos.x,
      a.pos.y-surfaces[i].seen.pos.y)-a.profile.radius-surfaces[i].radius)-1e-9)) {
      if (entry) { entry.rejected = 'clearance';
        entry.failed = surfaces.flatMap((p,i)=>gaps[i]<Math.min(0,current(i))-1e-9?[p.key]:[]); }
      continue;
    }
    const last = trial[Math.max(0,Math.min(trial.length-1,Math.round(interval/.05)-1))];
    const score = Math.hypot(last.pos.x-backer.pos.x-backer.vel.x*last.t,
      last.pos.y-backer.pos.y-backer.vel.y*last.t);
    if (entry) entry.score = score;
    // Continue a still-executable shoulder rather than reversing the route
    // merely because a fresh short step ends slightly nearer the backer.
    if (continued!==undefined&&sign===continued&&sign!==0) return done({kind:'detour',plan:read});
    if (score<bestScore) { best=read; bestScore=score; }
  }
  if (best) return done({ kind: 'detour', plan: best });
  // Braking is an explicit unvalidated fallback, not a claim that standing
  // clears a moving surface. Compare its swept incursion to the original.
  const braking: MoveCommand = {vel:{x:0,y:0},facing:a.facing};
  if (!gather) return done({kind:'unvalidated',command:original});
  const brakePath = previewFreeMovement(a.body,braking,now,STEPS,handContact);
  const brakeGaps = surfaces.map(s=>gap(a,brakePath,s));
  const brake = Math.min(...brakeGaps), kept = Math.min(...originalGaps);
  if (log) log.fallback = { original: kept, braking: brake, gaps: brakeGaps, chose: brake>kept ? 'braking' : 'original' };
  return done({kind:'unvalidated',command:brake>kept?braking:original});
}

/** Preserve the existing ordinary-climb contract and candidate set. */
export function chooseClimbAccess(a: Agent, backer: Perceived, surfaces: readonly ClimbSurface[],
  original: MoveCommand, now: number, interval: number, handContact: World['handContact']): ClimbAccess | null {
  const result=assessClimbAccess(a,backer,surfaces,original,now,interval,handContact);
  return result.kind==='detour'?result.plan:null;
}
