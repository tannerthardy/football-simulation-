/** Shared route geometry/control. No agent, perception or live route state. */
import { FIELD_WIDTH, OPP_GOAL_X } from '../core/field.js';
import { clamp, norm, sub, type Vec2 } from '../core/vec.js';
import { arriveVelocity, stepBody, type Body, type MoveCommand } from '../physics/kinematics.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { RouteDef, RouteEnd, RoutePoint } from '../playbook/types.js';

/** LINE_START (off; LINE_START=1; see behaviors/receiver.ts): the get-off, shared by the receiver, the quarterback's
 * forecast of him and his expected break time, so all three move together; and his approach into a break on his
 * cutting ability. */
export const LINE_START = process.env.LINE_START !== '0';

/** `ext`: a point the path's continuation added past the installed route (to the sideline margin, then up). */
export interface PathPoint { readonly p: Readonly<Vec2>; readonly s: number; readonly ext?: boolean }

export function routePath(start: Vec2, los: number, outside: number, pts: readonly RoutePoint[],
  extend: boolean, family: RouteDef['family']): PathPoint[] {
  const endX = OPP_GOAL_X + 8.5;
  const out: PathPoint[] = pts.map(rp => ({
    p: { x: Math.min(endX, los + rp.d), y: clamp(start.y + rp.l * outside, 1.2, FIELD_WIDTH - 1.2) }, s: rp.s ?? 1,
  }));
  if (extend && out.length >= 1) {
    const last = out[out.length - 1].p;
    const prev = out.length >= 2 ? out[out.length - 2].p : start;
    const d = norm(sub(last, prev));
    const lo = 5, hi = FIELD_WIDTH - 5;
    let k = 40;
    if (d.y < -1e-6) k = Math.min(k, (last.y - lo) / -d.y);
    if (d.y > 1e-6) k = Math.min(k, (hi - last.y) / d.y);
    // The called route may already end outside this continuation margin.
    // Turn up from there; a negative extension retraces the completed route.
    k = Math.max(0, k);
    const edge = { x: Math.min(endX, last.x + d.x * k), y: last.y + d.y * k };
    if (k < 39) {
      const up = family === 'flat' ? 5 : 40;
      if (k > 0) out.push({ p: edge, s: 0.75, ext: true });
      out.push({ p: { x: Math.min(endX, edge.x + up), y: edge.y }, s: family === 'flat' ? 0.6 : 1, ext: true });
    } else out.push({ p: edge, s: 1, ext: true });
  }
  return out;
}

/** ROUTE_EFFORT (experimental, off): every route family is run at full speed, as coached ("routes must be ran at full
 * speed"; the stem is sold at full speed so the defender must respect the vertical, and the receiver separates at the
 * break: "the brake is the move and the throttle is the finish"). The coached reasons to slow are already their own
 * mechanisms here: the deceleration into a break (the route law's through-speed at a corner), the settle or sit at a
 * route's end (`settle`, `sitVsZone`), and the timing with the drop (route depth and the break). Off, each family carries
 * a constant under 1 (quick .78, flat .80, back .80, cross .84, intermediate .86, deep .94, plus 0.04 x (route running -
 * 0.5)), from the 2026-10-08 movement calibration against tracking (df08fff7), with no coached reason of its own: it
 * caps a TE's over at 7.2 yd/s against the NFL TE crosser's 7.4 at 3.0 s (Tools, docs/reviews/2026-11-14-route-speed.md).
 * A route's own tracked `pace` (the back's check-release flat) is unchanged. */
const ROUTE_EFFORT = process.env.ROUTE_EFFORT === '1';
export function routeEffort(family: RouteDef['family'], rr: number): number {
  if (ROUTE_EFFORT) return 1;
  const base = { quick: 0.78, flat: 0.8, back: 0.8, cross: 0.84, intermediate: 0.86, deep: 0.94 };
  return clamp(base[family] + 0.04 * (rr - 0.5), 0.7, 0.98);
}

export function steerRoute(body: Body, st: { idx: number }, path: readonly PathPoint[], end: RouteEnd,
  effort: number, rr: number, cutSkill: number): MoveCommand | null {
  for (let guard = 0; guard < 6; guard++) {
    if (st.idx >= path.length) return null;
    const tgt = path[st.idx], next = path[st.idx + 1];
    const d = Math.hypot(tgt.p.x - body.pos.x, tgt.p.y - body.pos.y);
    if (d < 0.6 || (next && passed(body.pos, tgt.p, next.p))) { st.idx++; continue; }
    const isLast = st.idx === path.length - 1;
    const vtop = body.profile.vmax * effort;
    let through = isLast && end !== 'continue' ? 0 : tgt.s * vtop * clamp(0.82 + 0.3 * rr, 0, 1);
    if (next) {
      const ax = tgt.p.x - body.pos.x, ay = tgt.p.y - body.pos.y;
      const bx = next.p.x - tgt.p.x, by = next.p.y - tgt.p.y;
      const cosT = (ax * bx + ay * by) / ((Math.hypot(ax, ay) || 1) * (Math.hypot(bx, by) || 1));
      through = Math.min(through, Math.sqrt((body.profile.lateral * cutSkill * 1.3) / Math.max(0.04, 1 - cosT)));
    }
    // LINE_START: into a break he slows on what he can cut on (his lateral control, by technique), not on his
    // full braking, so he carries only the speed his cutting ability lets him take through it.
    const decel = LINE_START && next ? Math.min(body.profile.brake, body.profile.lateral * cutSkill) * 0.8 : undefined;
    return { vel: arriveVelocity(body, tgt.p, vtop, through, decel), cutSkill };
  }
  return null;
}

function passed(pos: Vec2, wp: Vec2, next: Vec2): boolean {
  const sx = next.x - wp.x, sy = next.y - wp.y;
  return (pos.x - wp.x) * sx + (pos.y - wp.y) * sy > 0 && Math.hypot(pos.x - wp.x, pos.y - wp.y) < 2;
}

/** LINE_START: his first step out of the stance (yd). */
export const GETOFF_STEP = 0.5;
/** LINE_START: the share of his start force he chooses to push with until he declares his stem (estimated). Out of
 * the stance he is reading the defender and keeping himself able to react: the deeper his first break, the harder
 * he can drive (a go with a free release nearly full; a slant or flat that cuts within two or three steps less);
 * a defender in his face lowers it (the release comes first), one well off raises it; route running sharpens it.
 * Range about 0.3-0.85: even a free go is not driven at a full start. The cost it stands in for: in our body a full forward push spends the whole friction ellipse,
 * leaving no lateral authority for those steps, but nothing in the receiver's controller yet values keeping that
 * authority while he reads; this share is that value. */
export function getOffDrive(routeRunning: number, breakDepth: number, defenderAhead: number): number {
  const route = 0.4 + 0.03 * clamp(breakDepth, 0, 10);
  const defender = 0.05 * clamp((defenderAhead - 4.5) / 2.5, -1, 1);
  return clamp(route + defender + 0.15 * (routeRunning - 0.5), 0.3, 1);
}

/** LINE_START: how deep (yd past the line) his route first turns by 35 degrees or more from its stem; 10 if not within 10. */
export function firstBreakDepth(start: Vec2, los: number, path: readonly PathPoint[]): number {
  let prev = start, dir: Vec2 | null = null;
  for (const pt of path) {
    const seg = { x: pt.p.x - prev.x, y: pt.p.y - prev.y }, l = Math.hypot(seg.x, seg.y);
    if (l < 1e-6) continue;
    const u = { x: seg.x / l, y: seg.y / l };
    if (dir && u.x * dir.x + u.y * dir.y < Math.cos(35 * Math.PI / 180)) return clamp(Math.abs(prev.x - los), 0, 10);
    dir = dir ?? u; prev = pt.p;
  }
  return 10;
}
/** LINE_START: still getting off the line: inside his first step, or before he has had time to read the defender. */
export function inGetOff(fromStart: number, sinceStart: number, readTime: number): boolean {
  return fromStart < GETOFF_STEP || sinceStart < readTime;
}
/** LINE_START: the time the get-off costs him to reach `depth` yd from a standstill, against a full start, from the
 * same body law (a straight run at route effort). Used for his expected break time. */
export function getOffLoss(profile: Readonly<PhysicalProfile>, routeRunning: number, effort: number, readTime: number,
  depth: number, breakDepth: number, defenderAhead: number): number {
  const dt = 0.02;
  const run = (getoff: boolean): number => {
    const body: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, sprintLoad: 0, profile: profile as PhysicalProfile };
    for (let t = 0; t < 4; t += dt) {
      const cmd: MoveCommand = { vel: { x: profile.vmax * effort, y: 0 } };
      if (getoff && inGetOff(body.pos.x, t, readTime)) cmd.drive = getOffDrive(routeRunning, breakDepth, defenderAhead);
      stepBody(body, cmd, dt);
      if (body.pos.x >= depth) return t + dt;
    }
    return 4;
  };
  return Math.max(0, run(true) - run(false));
}
