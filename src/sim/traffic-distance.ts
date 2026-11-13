/** Joint route geometry with explicit constraint generation.
 * Current plane shortest paths give a lower bound for every added obstacle.
 * Return that bound only after continuous full-disc and field validation.
 */
import type { Vec2 } from '../core/vec.js';
import { trafficPath, type TrafficBounds, type TrafficDisc, type TrafficPiece, type TrafficPath } from './traffic-path.js';

const EPS = 1e-9, TAU = 2 * Math.PI;
const angle = (value: number) => (value % TAU + TAU) % TAU;
const finite = (point: Vec2) => Number.isFinite(point.x) && Number.isFinite(point.y);
const inside = (point: Vec2, disc: TrafficDisc) => Math.hypot(point.x - disc.center.x, point.y - disc.center.y) < disc.radius - EPS;

function entersSegment(from: Vec2, to: Vec2, disc: TrafficDisc): boolean {
  const dx = to.x - from.x, dy = to.y - from.y, length2 = dx * dx + dy * dy;
  const t = length2 ? Math.max(0, Math.min(1,
    ((disc.center.x - from.x) * dx + (disc.center.y - from.y) * dy) / length2)) : 0;
  return inside({ x: from.x + t * dx, y: from.y + t * dy }, disc);
}

function onSweep(theta: number, start: number, sweep: number): boolean {
  return sweep >= 0 ? angle(theta - start) <= sweep + EPS : angle(start - theta) <= -sweep + EPS;
}

function entersPiece(piece: TrafficPiece, disc: TrafficDisc): boolean {
  if (piece.kind === 'line') return entersSegment(piece.from, piece.to, disc);
  if (inside(piece.from, disc) || inside(piece.to, disc)) return true;
  // The distance from a fixed center to a circular arc is minimized at an
  // endpoint or its radial bearing, including a clockwise returned arc.
  const bearing = Math.atan2(disc.center.y - piece.center.y, disc.center.x - piece.center.x);
  if (!onSweep(bearing, piece.startAngle, piece.sweep)) return false;
  return inside({ x: piece.center.x + piece.radius * Math.cos(bearing),
    y: piece.center.y + piece.radius * Math.sin(bearing) }, disc);
}

function within(point: Vec2, bounds?: TrafficBounds): boolean {
  return !bounds || (point.x >= bounds.minX - EPS && point.x <= bounds.maxX + EPS
    && point.y >= bounds.minY - EPS && point.y <= bounds.maxY + EPS);
}

function pieceWithin(piece: TrafficPiece, bounds?: TrafficBounds): boolean {
  if (!within(piece.from, bounds) || !within(piece.to, bounds)) return false;
  if (!bounds || piece.kind === 'line') return true;
  return [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].every(theta => !onSweep(theta, piece.startAngle, piece.sweep)
    || within({ x: piece.center.x + piece.radius * Math.cos(theta),
      y: piece.center.y + piece.radius * Math.sin(theta) }, bounds));
}

/** A shortest plane relaxation is a lower bound for every added obstacle.
 * Accept its path only after checking all explicit discs and field bounds.
 * Equal-distance path ties may differ from the full graph; the consumer must
 * still evaluate its first direction through achievable movement previews.
 */
export function trafficRoute(start: Vec2, goal: Vec2, discs: readonly TrafficDisc[], bounds?: TrafficBounds): TrafficPath | null {
  if (!finite(start) || !finite(goal) || discs.length > 10
    || discs.some(d => !finite(d.center) || !Number.isFinite(d.radius) || d.radius < 0)
    || bounds && (![bounds.minX, bounds.maxX, bounds.minY, bounds.maxY].every(Number.isFinite)
      || bounds.minX > bounds.maxX || bounds.minY > bounds.maxY)
    || !within(start, bounds) || !within(goal, bounds)
    || discs.some(d => inside(start, d) || inside(goal, d))) return null;
  const active = new Set<number>();
  for (let i = 0; i < discs.length; i++) if (entersSegment(start, goal, discs[i])) active.add(i);
  if (!active.size) return trafficPath(start, goal, [], bounds);
  // Every failed iteration adds an actual violated explicit disc, so there
  // are at most ten subset solves. No peer is discarded for being distant.
  for (let iteration = 0; iteration < discs.length; iteration++) {
    const subset = discs.filter((_disc, index) => active.has(index));
    const path = trafficPath(start, goal, subset);
    if (!path || path.pieces.some(piece => !pieceWithin(piece, bounds)))
      return trafficPath(start, goal, discs, bounds);
    const added: number[] = [];
    for (let i = 0; i < discs.length; i++)
      if (!active.has(i) && path.pieces.some(piece => entersPiece(piece, discs[i]))) added.push(i);
    if (!added.length) {
      const indices=discs.flatMap((_disc,index)=>active.has(index)?[index]:[]);
      const pieces=path.pieces.map(piece=>piece.kind==='arc'?{...piece,disc:indices[piece.disc]}:piece);
      return {...path,pieces,firstPiece:pieces[0]??null};
    }
    for (const index of added) active.add(index);
  }
  return trafficPath(start, goal, discs, bounds);
}

export function trafficDistance(start: Vec2, goal: Vec2, discs: readonly TrafficDisc[], bounds?: TrafficBounds): number | null {
  return trafficRoute(start,goal,discs,bounds)?.distance??null;
}
