/**
 * Route-interaction motifs from the sampled trajectories (§8). Geometry and timing only: no concept id, no
 * route name. Each motif names the generic defensive role it stresses where there is one.
 */
import type { ReceiverRef } from '../types.js';
import type { Motif, RouteDescriptor } from './types.js';

const pos = (r: RouteDescriptor, t: number) => {
  const P = r.trajectory;
  let best = P[0];
  for (const p of P) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
  return best;
};
/** Direction after his break (or over his last second): downfield and outward (+ toward his own sideline). */
export function afterBreak(r: RouteDescriptor): { down: number; out: number } {
  const t0 = r.breakT ?? Math.max(0, r.trajectory[r.trajectory.length - 1].t - 1);
  const a = pos(r, t0), b = pos(r, t0 + 0.5);
  const sideSign = Math.sign(r.startWidth) || 1;
  return { down: b.x - a.x, out: (b.y - a.y) * sideSign };
}
/** Where he is going: his net displacement over the second after his break (or his last second), downfield and
 * outward. Longer than `afterBreak`, which a cut's deceleration dominates. */
export function going(r: RouteDescriptor): { down: number; out: number } {
  const end = r.trajectory[r.trajectory.length - 1].t;
  const t0 = Math.min(r.breakT ?? end - 1, end - 0.5);
  const a = pos(r, t0), b = pos(r, Math.min(end, t0 + 1));
  const sideSign = Math.sign(r.startWidth) || 1;
  return { down: b.x - a.x, out: (b.y - a.y) * sideSign };
}
const overlap = (a: RouteDescriptor, b: RouteDescriptor) => Math.min(a.window.last, b.window.last) - Math.max(a.window.ready, b.window.ready);
const sameSide = (a: RouteDescriptor, b: RouteDescriptor) => a.side === b.side && a.side !== 'B';
const deep = (r: RouteDescriptor) => !r.isBack && r.depthAtReady >= 12;
/** A vertical: its declared class where it has one (DECL_CLASS), else straight on downfield in the half second after its
 * break. */
export const isVerticalRoute = (r: RouteDescriptor) => {
  if (r.declaredClass) return r.declaredClass === 'vertical';
  const d = afterBreak(r); return d.down > 1.5 && Math.abs(d.out) < 0.6 * d.down;
};
const vertical = isVerticalRoute;

export function findMotifs(routes: RouteDescriptor[]): Motif[] {
  const out: Motif[] = [];
  const R = routes.filter((r) => !r.isBack);
  const refs = (...rs: RouteDescriptor[]) => rs.map((r) => r.ref as ReceiverRef);
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const [a, b] = [R[i], R[j]];
    const ov = overlap(a, b);
    if (ov <= 0) continue;
    const pa = pos(a, a.window.ready), pb = pos(b, b.window.ready);
    const dDepth = Math.abs(pa.x - pb.x), dLat = Math.abs(pa.y - pb.y);
    const [lo, hi] = pa.x < pb.x ? [a, b] : [b, a];
    // Vertical high-low: one route under another in the same lane, both live together. The lane is judged by
    // where the high route is going (half a second into his window), not where he is as it opens: a corner from
    // the slot is still inside when he declares and over the #1 receiver's hitch when the ball would arrive.
    const hiGoing = pos(hi, hi.window.ready + 0.5), loAt = pos(lo, lo.window.ready);
    const dLatGoing = Math.abs(hiGoing.y - loAt.y);
    if (sameSide(a, b) && dDepth >= 5 && dDepth <= 15 && Math.min(dLat, dLatGoing) < 8) {
      // The defender stressed is named from where the low route goes: an out-breaking or flat route works on the
      // curl-flat (flat) defender, an in-breaking one on the hook; a route going straight on is named by width.
      const lout = going(lo).out;
      const role = lout > 1 ? 'playside_curl_flat' : lout < -1 ? 'hook' : Math.abs(loAt.y) > 9 ? 'playside_curl_flat' : 'hook';
      out.push({ kind: 'vertical_high_low', refs: refs(lo, hi), role, confidence: Math.min(1, ov / 0.6),
        why: `${lo.ref} at ${loAt.x.toFixed(1)} yd under ${hi.ref} at ${pos(hi, hi.window.ready).x.toFixed(1)} yd, ${Math.min(dLat, dLatGoing).toFixed(1)} yd apart, live together ${ov.toFixed(2)} s` });
    }
    // Horizontal stretch: the same level, spread across one underneath defender.
    if (dDepth < 3.5 && dLat >= 5 && dLat <= 15 && Math.max(pa.x, pb.x) < 14) {
      out.push({ kind: 'horizontal_stretch', refs: refs(a, b), role: sameSide(a, b) ? 'playside_apex' : 'middle_hook', confidence: Math.min(1, ov / 0.6),
        why: `${a.ref}/${b.ref} at ${pa.x.toFixed(1)}/${pb.x.toFixed(1)} yd, ${dLat.toFixed(1)} yd apart` });
    }
    // Smash: a settled short route outside with a deeper route breaking out over it.
    const ao = afterBreak(a), bo = afterBreak(b);
    if (sameSide(a, b) && lo.breakT !== null && hi.breakT !== null && pos(lo, lo.window.ready).x < 8 && hi.breakAt!.x >= 8 && afterBreak(hi).out > 1 && afterBreak(hi).down > 1 && afterBreak(lo).down < 1) {
      out.push({ kind: 'smash', refs: refs(lo, hi), role: 'deep_half_or_squat_corner', confidence: 0.8, why: `${lo.ref} settles at ${pos(lo, lo.window.ready).x.toFixed(1)}, ${hi.ref} breaks out over him at ${hi.breakAt!.x.toFixed(1)}` });
    }
    // Levels / drive: two in-breakers at different depths.
    if (ao.out < -1 && bo.out < -1 && dDepth >= 4) {
      out.push({ kind: 'levels', refs: refs(lo, hi), role: 'hook', confidence: 0.7, why: `in-breakers at ${pa.x.toFixed(1)} and ${pb.x.toFixed(1)} yd` });
    }
    // Mesh: two shallow crossers from opposite sides.
    if (a.side !== b.side && a.crossesField && b.crossesField && Math.max(pa.x, pb.x) < 8) {
      out.push({ kind: 'mesh', refs: refs(a, b), confidence: 0.8, why: `two shallow crossers from opposite sides` });
    }
    // Cross + post: a crosser under a route climbing to the middle.
    for (const [c, p] of [[a, b], [b, a]] as const) {
      const po = afterBreak(p);
      if (c.crossesField && !p.crossesField && p.breakAt && p.breakAt.x >= 9 && po.down > 1 && po.out < -0.5) {
        out.push({ kind: 'cross_post', refs: refs(c, p), role: 'middle_safety', confidence: 0.75, why: `${c.ref} crosses under ${p.ref}'s post (break at ${p.breakAt.x.toFixed(1)} yd)` });
      }
    }
  }
  // Flood: three levels to one side.
  for (const side of ['S', 'W'] as const) {
    const S = R.filter((r) => r.side === side);
    const lv = (r: RouteDescriptor) => r.depthAtReady >= 14 ? 'deep' : r.depthAtReady >= 6 ? 'mid' : 'short';
    if (S.length >= 3 && new Set(S.map(lv)).size === 3 && S.every((r) => afterBreak(r).out > -1)) {
      out.push({ kind: 'flood', refs: S.map((r) => r.ref), role: 'playside_curl_flat', confidence: 0.8, why: `three levels to ${side}: ${S.map((r) => `${r.ref} ${r.depthAtReady}`).join(', ')}` });
    }
    if (S.length === 1) out.push({ kind: 'isolation', refs: [S[0].ref], confidence: 0.6, why: `${S[0].ref} alone to ${side}` });
  }
  // Triangle: three live routes spread in width and depth.
  const live = R.filter((r) => r.window.ready < 3);
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) for (let k = j + 1; k < live.length; k++) {
    const T = [live[i], live[j], live[k]];
    const P = T.map((r) => pos(r, r.window.ready));
    const w = Math.max(...P.map((p) => p.y)) - Math.min(...P.map((p) => p.y)), d = Math.max(...P.map((p) => p.x)) - Math.min(...P.map((p) => p.x));
    const together = Math.min(...T.map((r) => r.window.last)) - Math.max(...T.map((r) => r.window.ready));
    if (w >= 8 && w <= 18 && d >= 4 && together > 0.2 && T.every((r) => r.side === T[0].side || Math.abs(pos(r, r.window.ready).y) < 6)) {
      out.push({ kind: 'triangle', refs: refs(...T), confidence: 0.5, why: `${w.toFixed(0)} yd wide, ${d.toFixed(0)} yd deep, live together ${together.toFixed(2)} s` });
    }
  }
  // Seams; clearouts: a vertical that runs through a shorter same-side route's window earlier.
  const verts = R.filter((r) => deep(r) && vertical(r));
  if (verts.length >= 2) out.push({ kind: 'seams', refs: verts.map((r) => r.ref), role: 'middle_safety', confidence: 0.7, why: `${verts.length} verticals` });
  for (const v of verts) for (const s of R) if (s !== v && sameSide(s, v) && s.depthAtReady < 12 && s.window.ready > (v.breakT ?? 0)) {
    out.push({ kind: 'clearout', refs: [v.ref, s.ref], confidence: 0.6, why: `${v.ref} vertical clears for ${s.ref}` });
  }
  // Clear and void: an inside vertical takes the deep defender over him away, and an in-breaker arrives in the
  // space under where he was (the dagger family: HonestNFL 294/328 key the half safety). The read is the defender
  // over the vertical: if he carries it, the in-breaker; if he stays or comes down on the in-breaker, the vertical.
  for (const v of R) if (vertical(v) && v.window.ready < 3.2) for (const d of R) {
    if (d === v || !d.breakAt || d.breakAt.x < 8 || d.breakAt.x > 16 || going(d).out > -2) continue;
    // Where the in-breaker is going (a second into his window) against the vertical's lane; the vertical is at or
    // past the in-breaker's depth when he breaks, taking the deep defender with him.
    const dAt = pos(d, d.window.ready + 1);
    const lane = Math.abs(dAt.y - v.startWidth) < 6 || (sameSide(d, v) && Math.abs(dAt.y) < Math.abs(v.startWidth) + 2);
    const ahead = pos(v, d.window.ready).x >= d.breakAt.x;
    if (lane && ahead && overlap(d, v) > 0.3) {
      out.push({ kind: 'clear_void', refs: refs(d, v), role: 'deep_defender_over_vertical', confidence: 0.75,
        why: `${v.ref} vertical clears the deep defender; ${d.ref} breaks in at ${d.breakAt.x.toFixed(1)} yd under him` });
    }
  }
  for (const b of routes.filter((r) => r.isBack)) if (b.window.ready < 3.5) out.push({ kind: 'back_outlet', refs: [b.ref], confidence: 0.8, why: `back released, ready ${b.window.ready} s` });
  return out;
}
