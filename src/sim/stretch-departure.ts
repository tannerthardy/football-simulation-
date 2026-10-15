/** An intermediate exit is a point to travel through, not a moving man to
 * station-keep on. Test the requested first beat with the body's actual
 * momentum and support; acquired neighbors coast only until the next read. */
import type { Vec2 } from '../core/vec.js';
import { arriveVelocity, cornerSpeed, type Body, type MoveCommand } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import { FIELD_WIDTH } from '../core/field.js';

export interface DeparturePeer { pos: Vec2; vel: Vec2; radius: number }

export function stretchDepartureStep(body: Body, goal: Vec2, facing: number,
  peers: readonly DeparturePeer[], now: number, horizon: number,
  handContact: 'center' | 'patch', next?: Vec2): MoveCommand | null {
  const through = next ? cornerSpeed(body, goal, next, .15) : 1;
  const command = { vel: arriveVelocity(body, goal, body.profile.vmax, through), facing };
  return clearDepartureCommand(body, command, peers, now, horizon, handContact) ? command : null;
}

export function clearDepartureCommand(body: Body, command: MoveCommand,
  peers: readonly DeparturePeer[], now: number, horizon: number,
  handContact: 'center' | 'patch'): boolean {
  const path = previewFreeMovement(body, command, now, Math.max(1, Math.ceil(horizon / .05)), handContact);
  if (path.some(sample => sample.support !== 'up')) return false;
  for (const peer of peers) {
    let x = body.pos.x - peer.pos.x, y = body.pos.y - peer.pos.y;
    // A real double can begin touching or slightly overlapping. Do not
    // invent separation, but reject a first beat that deepens that overlap.
    const clearance = Math.min(body.profile.radius + peer.radius, Math.hypot(x, y));
    for (const sample of path) {
      const nx = sample.pos.x - peer.pos.x - peer.vel.x * sample.t;
      const ny = sample.pos.y - peer.pos.y - peer.vel.y * sample.t;
      const dx = nx - x, dy = ny - y;
      const u = Math.max(0, Math.min(1, -(x * dx + y * dy) / Math.max(1e-12, dx * dx + dy * dy)));
      if (Math.hypot(x + u * dx, y + u * dy) < clearance - 1e-9) return false;
      x = nx; y = ny;
    }
  }
  return true;
}

/** A complete local detour around the two acquired combination bodies.
 * Visibility edges use the existing .15yd fit clearance and .35rad arc scale.
 * Only the first decision beat is an achievable-motion claim; the rest is a
 * route to recheck on the ordinary cadence, not a prediction of future wins. */
export function planStretchDeparture(body: Body, target: Vec2, peers: readonly DeparturePeer[],
  now: number, horizon: number, handContact: 'center' | 'patch', placement = 0): Vec2[] | null {
  const points: Vec2[] = [{ ...body.pos }, { ...target }];
  for (const peer of peers) {
    const bearing = Math.atan2(body.pos.y-peer.pos.y, body.pos.x-peer.pos.x);
    const radius = body.profile.radius + peer.radius + .15;
    for (let k = 0; k < 18; k++) {
      const angle = bearing + k * 2 * Math.PI / 18;
      const point = { x: peer.pos.x + radius*Math.cos(angle), y: peer.pos.y + radius*Math.sin(angle) };
      if (point.y >= .5 && point.y <= FIELD_WIDTH-.5) points.push(point);
    }
  }
  const clear = (from: Vec2, to: Vec2, initial: boolean) => peers.every(peer => {
    for (const t of [0, horizon]) {
      const px = peer.pos.x + peer.vel.x*t, py = peer.pos.y + peer.vel.y*t;
      const dx = to.x-from.x, dy = to.y-from.y;
      const u = Math.max(0, Math.min(1, ((px-from.x)*dx+(py-from.y)*dy)/Math.max(1e-12,dx*dx+dy*dy)));
      const bound = initial ? Math.min(body.profile.radius+peer.radius, Math.hypot(px-from.x,py-from.y))
        : body.profile.radius+peer.radius;
      if (Math.hypot(px-from.x-u*dx,py-from.y-u*dy) < bound-1e-9) return false;
    }
    return true;
  });
  // Shortest remaining geometric route, independent of desired speed.
  const edges = points.map((from,i) => points.map((to,j) => i !== j && clear(from,to,i===0)
    ? Math.hypot(to.x-from.x,to.y-from.y) : Infinity));
  const cost = points.map(() => Infinity), next = points.map(() => -1), done = new Set<number>();
  cost[1] = 0;
  for (let count=0;count<points.length;count++) {
    let at=-1;
    for(let i=1;i<points.length;i++) if(!done.has(i)&&(at<0||cost[i]<cost[at])) at=i;
    if(at<0||!Number.isFinite(cost[at])) break;
    done.add(at);
    for(let i=1;i<points.length;i++) if(edges[i][at]+cost[at]<cost[i]) {
      cost[i]=edges[i][at]+cost[at]; next[i]=at;
    }
  }
  const first = points.map((_,i)=>i).filter(i=>i!==0&&Number.isFinite(edges[0][i]+cost[i]))
    .sort((i,j)=>(edges[0][i]+cost[i])-(edges[0][j]+cost[j]));
  for(const i of first) {
    const route=[i];
    while(route.at(-1)!==1) {
      const at=next[route.at(-1)!];
      if(at<0||route.includes(at)) break;
      route.push(at);
    }
    if(route.at(-1)!==1) continue;
    const path=route.map(at=>({x:points[at].x,y:points[at].y+placement}));
    if(stretchDepartureStep(body,path[0],Math.atan2(target.y-body.pos.y,target.x-body.pos.x),
      peers,now,horizon,handContact,path[1])) return path;
  }
  return null;
}
