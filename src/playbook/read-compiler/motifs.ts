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
const overlap = (a: RouteDescriptor, b: RouteDescriptor) => Math.min(a.window.last, b.window.last) - Math.max(a.window.ready, b.window.ready);
const sameSide = (a: RouteDescriptor, b: RouteDescriptor) => a.side === b.side && a.side !== 'B';
const deep = (r: RouteDescriptor) => !r.isBack && r.depthAtReady >= 12;
const vertical = (r: RouteDescriptor) => { const d = afterBreak(r); return d.down > 1.5 && Math.abs(d.out) < 0.6 * d.down; };

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
    // Vertical high-low: one route under another in the same lane, both live together.
    if (sameSide(a, b) && dDepth >= 5 && dDepth <= 15 && dLat < 8) {
      const wide = Math.abs(pos(lo, lo.window.ready).y) > 9;
      out.push({ kind: 'vertical_high_low', refs: refs(lo, hi), role: wide ? 'playside_curl_flat' : 'hook', confidence: Math.min(1, ov / 0.6),
        why: `${lo.ref} at ${pos(lo, lo.window.ready).x.toFixed(1)} yd under ${hi.ref} at ${pos(hi, hi.window.ready).x.toFixed(1)} yd, ${dLat.toFixed(1)} yd apart, live together ${ov.toFixed(2)} s` });
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
  for (const b of routes.filter((r) => r.isBack)) if (b.window.ready < 3.5) out.push({ kind: 'back_outlet', refs: [b.ref], confidence: 0.8, why: `back released, ready ${b.window.ready} s` });
  return out;
}
