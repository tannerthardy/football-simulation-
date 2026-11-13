/** Static geometry of acquired teammate touch discs. This proposes a route to
 * the actor's existing goal; it does not predict future cuts, certify physical
 * execution, or change any body's radius. Optional bounds remove represented
 * paths which leave the caller's existing field limits; no wall waypoints or
 * field/circle intersections are invented to make a route exist.
 */
import { hypot2 } from '../core/vec.js';
import type { Vec2 } from '../core/vec.js';

export interface TrafficDisc { center: Vec2; radius: number }
export interface TrafficBounds { minX: number; maxX: number; minY: number; maxY: number }
export interface TrafficLine {
  kind: 'line'; from: Vec2; to: Vec2; length: number;
}
export interface TrafficArc {
  kind: 'arc'; from: Vec2; to: Vec2; length: number;
  center: Vec2; radius: number; startAngle: number; sweep: number; disc: number;
}
export type TrafficPiece = TrafficLine | TrafficArc;
export interface TrafficPath {
  distance: number;
  pieces: TrafficPiece[];
  firstPiece: TrafficPiece | null;
  firstDirection: Vec2;
}

// Numerical comparison tolerance only; disc radii remain caller supplied.
const EPS = 1e-9, TAU = 2 * Math.PI;
const copy = (v: Vec2): Vec2 => ({ x: v.x, y: v.y });
const distance = (a: Vec2, b: Vec2) => hypot2(a.x - b.x, a.y - b.y);
const finite = (v: Vec2) => Number.isFinite(v.x) && Number.isFinite(v.y);
const angle = (a: number) => (a % TAU + TAU) % TAU;
const inside = (p: Vec2, c: TrafficDisc) => distance(p, c.center) < c.radius - EPS;

interface Circle extends TrafficDisc { original: number }
interface Node { point: Vec2; circles: Set<number> }
interface Edge { to: number; piece: TrafficPiece }

function segmentClear(a: Vec2, b: Vec2, circles: readonly TrafficDisc[]): boolean {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
  return circles.every(c => {
    const t = length2 ? Math.max(0, Math.min(1,
      ((c.center.x - a.x) * dx + (c.center.y - a.y) * dy) / length2)) : 0;
    return !inside({ x: a.x + t * dx, y: a.y + t * dy }, c);
  });
}

function reverse(piece: TrafficPiece): TrafficPiece {
  if (piece.kind === 'line') return { ...piece, from: copy(piece.to), to: copy(piece.from) };
  return { ...piece, from: copy(piece.to), to: copy(piece.from),
    startAngle: piece.startAngle + piece.sweep, sweep: -piece.sweep };
}

/** Shortest path in the represented union of at most ten static discs.
 * Straight visibility edges and exposed circular boundary arcs share exact
 * tangent/intersection nodes. Overlap intersections partition arcs even when
 * a third disc covers the intersection; covered nodes/arcs remain unusable.
 * Boundary touch is permitted. A start/goal inside a disc has no free route.
 */
export function trafficPath(start: Vec2, goal: Vec2, discs: readonly TrafficDisc[], bounds?: TrafficBounds): TrafficPath | null {
  if (!finite(start) || !finite(goal) || discs.length > 10
    || discs.some(c => !finite(c.center) || !Number.isFinite(c.radius) || c.radius < 0)
    || bounds && (![bounds.minX, bounds.maxX, bounds.minY, bounds.maxY].every(Number.isFinite)
      || bounds.minX > bounds.maxX || bounds.minY > bounds.maxY)) return null;
  const within = (p: Vec2) => !bounds || (p.x >= bounds.minX - EPS && p.x <= bounds.maxX + EPS
    && p.y >= bounds.minY - EPS && p.y <= bounds.maxY + EPS);
  if (!within(start) || !within(goal)) return null;
  const nonzero = discs.map((c, original) => ({ center: copy(c.center), radius: c.radius, original }))
    .filter(c => c.radius > 0);
  if (nonzero.some(c => inside(start, c) || inside(goal, c))) return null;
  // A contained disc adds no boundary to the same union. Retain one copy of
  // equal coincident discs, rather than dividing by a zero center distance.
  const circles: Circle[] = nonzero.filter((c, i) => !nonzero.some((d, j) => i !== j
    && distance(c.center, d.center) + c.radius <= d.radius + EPS
    && (d.radius > c.radius + EPS || j < i)));
  if (segmentClear(start, goal, circles)) {
    const length = distance(start, goal);
    const piece: TrafficLine = { kind: 'line', from: copy(start), to: copy(goal), length };
    return { distance: length, pieces: length ? [piece] : [], firstPiece: length ? piece : null,
      firstDirection: length ? { x: (goal.x - start.x) / length, y: (goal.y - start.y) / length } : { x: 0, y: 0 } };
  }

  const nodes: Node[] = [];
  function node(point: Vec2, circle?: number): number {
    let index = nodes.findIndex(n => distance(n.point, point) <= EPS);
    if (index < 0) { index = nodes.length; nodes.push({ point: copy(point), circles: new Set() }); }
    if (circle !== undefined) nodes[index].circles.add(circle);
    return index;
  }
  const first = node(start), last = node(goal);
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    for (const p of [start, goal]) {
      const d = distance(p, c.center);
      if (Math.abs(d - c.radius) <= EPS) { node(p, i); continue; }
      const heading = Math.atan2(p.y - c.center.y, p.x - c.center.x);
      const offset = Math.acos(Math.min(1, c.radius / d));
      for (const sign of [-1, 1]) {
        const theta = heading + sign * offset;
        node({ x: c.center.x + c.radius * Math.cos(theta), y: c.center.y + c.radius * Math.sin(theta) }, i);
      }
    }
    for (let j = 0; j < i; j++) {
      const d = circles[j], dx = d.center.x - c.center.x, dy = d.center.y - c.center.y;
      const length2 = dx * dx + dy * dy, length = Math.sqrt(length2);
      // Both external and internal common tangents, when they exist. Their
      // straight edges are still checked against every disc below.
      for (const orientation of [-1, 1]) {
        const delta = c.radius - orientation * d.radius;
        const height2 = length2 - delta * delta;
        if (height2 < -EPS) continue;
        const height = Math.sqrt(Math.max(0, height2));
        for (const sign of [-1, 1]) {
          const nx = (dx * delta - dy * height * sign) / length2;
          const ny = (dy * delta + dx * height * sign) / length2;
          node({ x: c.center.x + c.radius * nx, y: c.center.y + c.radius * ny }, i);
          node({ x: d.center.x + orientation * d.radius * nx, y: d.center.y + orientation * d.radius * ny }, j);
        }
      }
      if (length > c.radius + d.radius + EPS || length < Math.abs(c.radius - d.radius) - EPS) continue;
      const along = (c.radius * c.radius - d.radius * d.radius + length2) / (2 * length);
      const height = Math.sqrt(Math.max(0, c.radius * c.radius - along * along));
      const x = c.center.x + along * dx / length, y = c.center.y + along * dy / length;
      for (const sign of [-1, 1]) {
        const p = { x: x - sign * height * dy / length, y: y + sign * height * dx / length };
        node(p, i); node(p, j);
      }
    }
  }

  const exposed = nodes.map(n => within(n.point) && circles.every(c => !inside(n.point, c)));
  const graph: Edge[][] = nodes.map(() => []);
  function edge(a: number, b: number, piece: TrafficPiece) {
    if (a === b || piece.length <= EPS || !exposed[a] || !exposed[b]) return;
    graph[a].push({ to: b, piece }); graph[b].push({ to: a, piece: reverse(piece) });
  }
  for (let i = 0; i < nodes.length; i++) {
    if (!exposed[i]) continue;
    for (let j = 0; j < i; j++) {
      if (!exposed[j] || !segmentClear(nodes[i].point, nodes[j].point, circles)) continue;
      edge(i, j, { kind: 'line', from: copy(nodes[i].point), to: copy(nodes[j].point),
        length: distance(nodes[i].point, nodes[j].point) });
    }
  }
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    const ring = nodes.map((n, index) => ({ index, theta: angle(Math.atan2(n.point.y - c.center.y, n.point.x - c.center.x)) }))
      .filter(n => nodes[n.index].circles.has(i)).sort((a, b) => a.theta - b.theta);
    for (let j = 0; j < ring.length; j++) {
      const from = ring[j], to = ring[(j + 1) % ring.length];
      const sweep = angle(to.theta - from.theta);
      if (sweep <= EPS) continue;
      const middle = from.theta + sweep / 2;
      const point = { x: c.center.x + c.radius * Math.cos(middle), y: c.center.y + c.radius * Math.sin(middle) };
      if (!within(point) || circles.some((d, k) => k !== i && inside(point, d))) continue;
      // Rectangular extrema occur at an endpoint or cardinal circle angle.
      // Endpoints are checked by edge(); the remaining extrema prevent a
      // clear-looking midpoint from hiding an out-of-bounds arc excursion.
      if ([0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].some(theta => angle(theta - from.theta) <= sweep + EPS
        && !within({ x: c.center.x + c.radius * Math.cos(theta), y: c.center.y + c.radius * Math.sin(theta) }))) continue;
      edge(from.index, to.index, { kind: 'arc', from: copy(nodes[from.index].point), to: copy(nodes[to.index].point),
        center: copy(c.center), radius: c.radius, startAngle: from.theta, sweep,
        length: c.radius * sweep, disc: c.original });
    }
  }

  const costs = nodes.map(() => Infinity), visited = nodes.map(() => false);
  const previous: ({ from: number; piece: TrafficPiece } | undefined)[] = nodes.map(() => undefined);
  costs[first] = 0;
  for (let k = 0; k < nodes.length; k++) {
    let nearest = -1;
    for (let i = 0; i < nodes.length; i++)
      if (!visited[i] && (nearest < 0 || costs[i] < costs[nearest])) nearest = i;
    if (nearest < 0 || !Number.isFinite(costs[nearest])) break;
    if (nearest === last) break;
    visited[nearest] = true;
    for (const next of graph[nearest]) {
      const cost = costs[nearest] + next.piece.length;
      if (cost < costs[next.to]) { costs[next.to] = cost; previous[next.to] = { from: nearest, piece: next.piece }; }
    }
  }
  if (!Number.isFinite(costs[last])) return null;
  const pieces: TrafficPiece[] = [];
  for (let index = last; index !== first;) {
    const entry = previous[index];
    if (!entry) return null;
    pieces.push(entry.piece); index = entry.from;
  }
  pieces.reverse();
  const piece = pieces[0];
  const firstDirection = piece.kind === 'line'
    ? { x: (piece.to.x - piece.from.x) / piece.length, y: (piece.to.y - piece.from.y) / piece.length }
    : { x: -Math.sin(piece.startAngle) * Math.sign(piece.sweep), y: Math.cos(piece.startAngle) * Math.sign(piece.sweep) };
  return { distance: costs[last], pieces, firstPiece: piece, firstDirection };
}
