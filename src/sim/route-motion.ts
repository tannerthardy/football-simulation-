/** Shared route geometry/control. No agent, perception or live route state. */
import { FIELD_WIDTH, OPP_GOAL_X } from '../core/field.js';
import { clamp, norm, sub, type Vec2 } from '../core/vec.js';
import { arriveVelocity, type Body, type MoveCommand } from '../physics/kinematics.js';
import type { RouteDef, RouteEnd, RoutePoint } from '../playbook/types.js';

export interface PathPoint { readonly p: Readonly<Vec2>; readonly s: number }

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
      if (k > 0) out.push({ p: edge, s: 0.75 });
      out.push({ p: { x: Math.min(endX, edge.x + up), y: edge.y }, s: family === 'flat' ? 0.6 : 1 });
    } else out.push({ p: edge, s: 1 });
  }
  return out;
}

export function routeEffort(family: RouteDef['family'], rr: number): number {
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
    return { vel: arriveVelocity(body, tgt.p, vtop, through), cutSkill };
  }
  return null;
}

function passed(pos: Vec2, wp: Vec2, next: Vec2): boolean {
  const sx = next.x - wp.x, sy = next.y - wp.y;
  return (pos.x - wp.x) * sx + (pos.y - wp.y) * sy > 0 && Math.hypot(pos.x - wp.x, pos.y - wp.y) < 2;
}
