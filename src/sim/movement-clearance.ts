/** A free player's achievable first action around acquired bodies.
 * This is local navigation through the ordinary movement World, not a block
 * win, a new view of the front, or a promise about future contact forces. */
import type { Vec2 } from '../core/vec.js';
import { followAccel, type Body } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import { CONTACT_SCALE, type Intent } from '../physics/world.js';

export interface MovementObstacle {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  /** Public movement ceiling bounds uncertainty after an installed call ends. */
  maxSpeed?: number;
  /** Relative-to-query installed samples, only while their call is valid. */
  route?: readonly { t: number; pos: Vec2 }[];
  validFor?: number;
  /** Neighbors are reconsidered on the ordinary read beat. Down-surface
   * geometry also constrains the stopping-distance part of the approach. */
  horizon?: number;
  /** An observed teammate can stop clearing the lane. Do not require him to
   * maintain speed to make our request safe. Installed calls stay separate. */
  mayStop?: boolean;
}

export interface MovementStep {
  kind: 'direct' | 'around' | 'gather' | 'blocked';
  command: Intent;
  minimumGap: number;
  blockedBy: number[];
}

/** Look far enough to notice a body before the player spends the stopping
 * room. The read interval alone can declare a clear step just before impact. */
export function movementLookahead(body: Body, command: Intent, readInterval: number, capacity = 1): number {
  const speed = Math.hypot(body.vel.x, body.vel.y);
  if (speed < 1e-9) return readInterval;
  const ux = body.vel.x / speed, uy = body.vel.y / speed;
  const brake = followAccel(body, { x: -ux * 1e3, y: -uy * 1e3 }, command.cutSkill ?? 1, capacity);
  const deceleration = Math.max(.1, -(brake.x * ux + brake.y * uy));
  return readInterval + speed / deceleration;
}

function peerAt(peer: MovementObstacle, t: number): Vec2 {
  const route = peer.route;
  if (!route || route.length < 2) return { x: peer.pos.x + peer.vel.x * t, y: peer.pos.y + peer.vel.y * t };
  const index = route.findIndex(s => s.t >= t - 1e-9);
  const hi = route[index < 0 ? route.length - 1 : index];
  const lo = route[Math.max(0, (index < 0 ? route.length - 1 : index) - 1)];
  const u = hi.t > lo.t ? Math.max(0, Math.min(1, (t - lo.t) / (hi.t - lo.t))) : 0;
  return { x: lo.pos.x + (hi.pos.x - lo.pos.x) * u, y: lo.pos.y + (hi.pos.y - lo.pos.y) * u };
}

function pointSegment(p:Vec2,a:Vec2,b:Vec2):number {
  const dx=b.x-a.x,dy=b.y-a.y;
  const u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/Math.max(1e-12,dx*dx+dy*dy)));
  return Math.hypot(p.x-a.x-u*dx,p.y-a.y-u*dy);
}
function segmentGap(a:Vec2,b:Vec2,c:Vec2,d:Vec2):number {
  const cross=(p:Vec2,q:Vec2,r:Vec2)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;
  return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));
}

/** Keep an ordinary clear request exact. A detour must clear every acquired
 * neighbor together and make the most progress toward the read meeting point.
 * Only the first held read-beat is certified, in empty space. */
export function previewMovementStep(body: Body, command: Intent,
  peers: readonly MovementObstacle[], now: number, horizon: number,
  handContact: 'center' | 'patch') {
  const steps = Math.max(1, Math.ceil(horizon / .05));
    const path = previewFreeMovement(body, command, now, steps, handContact);
    const gaps = peers.map(peer => {
      const touch = CONTACT_SCALE * (body.profile.radius + peer.radius);
      let x = body.pos.x - peer.pos.x, y = body.pos.y - peer.pos.y;
      let own=body.pos;
      let gap = Math.hypot(x, y) - touch;
      for (const sample of path) {
        if (sample.t > (peer.horizon ?? horizon) + 1e-9) break;
        // After an installed call expires, bound possible movement from its
        // last valid point. Do not extend the route or delete the obstacle.
        const validAt = Math.min(sample.t, peer.validFor ?? Infinity);
        const unknown = sample.t - validAt;
        const uncertainty = unknown > 1e-9 ? (peer.maxSpeed ?? Infinity) * unknown : 0;
        const p = peerAt(peer, validAt), nx = sample.pos.x - p.x, ny = sample.pos.y - p.y;
        const dx = nx - x, dy = ny - y;
        const u = Math.max(0, Math.min(1, -(x * dx + y * dy) / Math.max(1e-12, dx * dx + dy * dy)));
        gap = Math.min(gap, Math.hypot(x + u * dx, y + u * dy) - touch - uncertainty);
        if(peer.mayStop)gap=Math.min(gap,segmentGap(own,sample.pos,peer.pos,p)-touch);
        own=sample.pos;
        x = nx; y = ny;
      }
      return gap;
    });
    return { command, path, gaps, gap: Math.min(...gaps), up: path.every(s => s.support === 'up') };
}

export function clearMovementStep(body: Body, original: Intent, goal: Vec2,
  peers: readonly MovementObstacle[], now: number, horizon: number,
  playSide: number, handContact: 'center' | 'patch'): MovementStep {
  const evaluate = (command: Intent) => {
    const result=previewMovementStep(body,command,peers,now,horizon,handContact),end=result.path.at(-1)!;
    return {...result,progress:Math.hypot(goal.x-body.pos.x,goal.y-body.pos.y)-Math.hypot(goal.x-end.pos.x,goal.y-end.pos.y)};
  };
  const baseline = evaluate(original);
  const blockedBy = peers.filter((_, i) => baseline.gaps[i] < 0).map(p => p.id);
  if (baseline.up && baseline.gap >= 0)
    return { kind: 'direct', command: original, minimumGap: baseline.gap, blockedBy };
  const speed = Math.hypot(original.vel.x, original.vel.y);
  let best: ReturnType<typeof evaluate> | null = null;
  // Small heading changes first; the installed play side resolves exact
  // geometric ties. No body velocity or collision rule is assigned here.
  for (const angle of [Math.PI / 8, Math.PI / 4, 3 * Math.PI / 8, Math.PI / 2]) {
    for (const sign of [Math.sign(playSide) || 1, -(Math.sign(playSide) || 1)]) {
      const turn = angle * sign;
      const command = { ...original, vel: {
        x: original.vel.x * Math.cos(turn) - original.vel.y * Math.sin(turn),
        y: original.vel.x * Math.sin(turn) + original.vel.y * Math.cos(turn) } };
      const candidate = evaluate(command);
      if (speed > 1e-9 && candidate.up && candidate.gap >= 0
        && (!best || candidate.progress > best.progress + 1e-9)) best = candidate;
    }
  }
  if (best) return { kind: 'around', command: best.command, minimumGap: best.gap, blockedBy };
  const gather = evaluate({ ...original, vel: { x: 0, y: 0 } });
  const newConflict = gather.gaps.some((gap, i) => baseline.gaps[i] >= 0 && gap < 0);
  if (gather.up && !newConflict && gather.gap > baseline.gap + 1e-9)
    return { kind: gather.gap >= 0 ? 'gather' : 'blocked', command: gather.command, minimumGap: gather.gap, blockedBy };
  return { kind: 'blocked', command: original, minimumGap: baseline.gap, blockedBy };
}
