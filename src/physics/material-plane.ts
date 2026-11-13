/** Fixed-candidate Cayley material geometry only. Root enclosures do not
 * certify a re-solved prefix, continuous ODE, or contact reaction history. */
import { newMaterialRigid, rigidMidpointState, rigidWorldOffset, v3Add, v3Scale, v3Sub, v3Norm, type MaterialRigidState, type Vec3 } from './material-rigid.js';
export interface Interval { lo: number; hi: number }
export interface MaterialPlane { normal: Vec3; height: number }
export interface MaterialPlaneCandidate {
  dt: number; plane: MaterialPlane; normalLength: number; normalLengthBounds: Interval; x0: Vec3; r0: Vec3; meanVelocity: Vec3; meanAngularVelocity: Vec3;
  /** Power coefficients in normalized time u=t/dt. */
  coefficients: [Interval, Interval, Interval, Interval];
  denominatorQuadratic: Interval; supported: boolean; reason: string | null;
}
export interface MaterialPlaneOptions { timeTolerance?: number; gapTolerance?: number; maxDepth?: number; maxNodes?: number }
export interface MaterialPlaneBracket { lo: number; hi: number; kind: 'entering' | 'leaving' | 'ambiguous' }
/** clear means no candidate zeros; it does not mean the point is above the
 * plane. Inspect penetrationBeyondTolerance separately. */
export interface MaterialPlaneReport {
  status: 'clear' | 'roots' | 'ambiguous' | 'coincident' | 'unsupported'; reason: string | null;
  roots: MaterialPlaneBracket[]; nodes: number; unresolved: Interval[];
  maxBracketWidth: number; timeResolutionMet: boolean;
  penetrationBeyondTolerance: { possible: boolean; certain: boolean };
}
const buffer = new DataView(new ArrayBuffer(8));
function next(x: number, up: boolean): number {
  if (!Number.isFinite(x)) return x;
  if (x === 0) return up ? Number.MIN_VALUE : -Number.MIN_VALUE;
  buffer.setFloat64(0, x); let bits = buffer.getBigUint64(0);
  bits += (x > 0) === up ? 1n : -1n; buffer.setBigUint64(0, bits); return buffer.getFloat64(0);
}
const point = (x: number): Interval => ({ lo: x, hi: x });
const isZero = (a: Interval): boolean => a.lo === 0 && a.hi === 0;
function add(a: Interval, b: Interval): Interval {
  if (isZero(a)) return { ...b }; if (isZero(b)) return { ...a };
  if (a.lo === a.hi && b.lo === b.hi && a.lo === -b.lo) return point(0);
  return { lo: next(a.lo + b.lo, false), hi: next(a.hi + b.hi, true) };
}
const neg = (a: Interval): Interval => ({ lo: -a.hi, hi: -a.lo });
function mul(a: Interval, b: Interval): Interval {
  if (isZero(a) || isZero(b)) return point(0);
  if (a.lo === 1 && a.hi === 1) return { ...b }; if (b.lo === 1 && b.hi === 1) return { ...a };
  if (a.lo === -1 && a.hi === -1) return neg(b); if (b.lo === -1 && b.hi === -1) return neg(a);
  const values = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi];
  return { lo: next(Math.min(...values), false), hi: next(Math.max(...values), true) };
}
const scale = (a: Interval, k: number): Interval => mul(a, point(k));
type IVec = [Interval, Interval, Interval];
const vector = (a: Vec3): IVec => [point(a.x), point(a.y), point(a.z)];
const cross = (a: IVec, b: IVec): IVec => [add(mul(a[1], b[2]), neg(mul(a[2], b[1]))), add(mul(a[2], b[0]), neg(mul(a[0], b[2]))), add(mul(a[0], b[1]), neg(mul(a[1], b[0])))];
const dot = (a: IVec, b: IVec): Interval => add(add(mul(a[0], b[0]), mul(a[1], b[1])), mul(a[2], b[2]));
const finiteVector = (v: Vec3): boolean => [v.x, v.y, v.z].every(Number.isFinite);
const finiteInterval = (v: Interval): boolean => Number.isFinite(v.lo) && Number.isFinite(v.hi) && v.lo <= v.hi;
/** Plane normals may have any positive finite scale; gapTolerance is distance
 * and is multiplied by the normal length. Plane coefficients are not silently
 * normalized. State endpoints must match the declared midpoint/Cayley map. */
export function createMaterialPlaneCandidate(beforeInput: MaterialRigidState, afterInput: MaterialRigidState, dt: number,
  local: Vec3, planeInput: MaterialPlane): MaterialPlaneCandidate {
  const before = newMaterialRigid(beforeInput), after = newMaterialRigid(afterInput);
  if (!(dt > 0 && Number.isFinite(dt)) || !finiteVector(local) || !finiteVector(planeInput.normal) || !Number.isFinite(planeInput.height)
    || !(v3Norm(planeInput.normal) > 0 && Number.isFinite(v3Norm(planeInput.normal))) || before.mass !== after.mass || before.inertia !== after.inertia)
    throw new RangeError('Finite same-mass/inertia Cayley endpoints, local point, interval and nonzero plane required');
  const expected = rigidMidpointState(before, dt, after.velocity, after.angularMomentum);
  const geometryScale = Math.max(1, v3Norm(before.position), v3Norm(after.position));
  if (v3Norm(v3Sub(after.position, expected.position)) > 1e-12 + 128 * Number.EPSILON * geometryScale
    || after.basis.some((axis, i) => v3Norm(v3Sub(axis, expected.basis[i])) > 1e-12 + 128 * Number.EPSILON))
    throw new RangeError('Endpoints do not describe the same declared midpoint/Cayley candidate');
  const x0 = { ...before.position }, r0 = rigidWorldOffset(before, local);
  const meanVelocity = v3Scale(v3Add(before.velocity, after.velocity), .5);
  const meanAngularVelocity = v3Scale(v3Add(before.angularMomentum, after.angularMomentum), .5 / before.inertia);
  // Enclose construction of r0 and mean momenta rather than treating rounded
  // intermediates as exact physical coefficients.
  const r: IVec = [0, 1, 2].map(k => add(add(scale(point([before.basis[0].x, before.basis[0].y, before.basis[0].z][k]), local.x),
    scale(point([before.basis[1].x, before.basis[1].y, before.basis[1].z][k]), local.y)),
    scale(point([before.basis[2].x, before.basis[2].y, before.basis[2].z][k]), local.z))) as IVec;
  const v = vector(before.velocity).map((x, i) => scale(add(x, vector(after.velocity)[i]), .5)) as IVec;
  const inertiaInverse = { lo: next(.5 / before.inertia, false), hi: next(.5 / before.inertia, true) };
  const w = vector(before.angularMomentum).map((x, i) => mul(add(x, vector(after.angularMomentum)[i]), inertiaInverse)) as IVec;
  const n = vector(planeInput.normal), p = vector(before.position).map((x, i) => add(x, r[i])) as IVec;
  const q = scale(dot(w, w), .25), rotation = cross(w, r);
  const a0 = add(dot(n, p), point(-planeInput.height));
  const a1 = add(dot(n, v), dot(n, rotation));
  const a2 = add(mul(q, a0), scale(dot(n, cross(w, rotation)), .5));
  const a3 = mul(q, dot(n, v)), h = point(dt), h2 = mul(h, h), h3 = mul(h2, h);
  const normalSquared = dot(n, n);
  const normalLengthBounds = { lo: Math.max(0, next(Math.sqrt(Math.max(0, normalSquared.lo)), false)), hi: next(Math.sqrt(normalSquared.hi), true) };
  const coefficients: MaterialPlaneCandidate['coefficients'] = [a0, mul(a1, h), mul(a2, h2), mul(a3, h3)];
  const denominatorQuadratic = mul(q, h2), supported = [...coefficients, denominatorQuadratic, normalLengthBounds].every(finiteInterval);
  return { dt, plane: { normal: { ...planeInput.normal }, height: planeInput.height }, normalLength: v3Norm(planeInput.normal), normalLengthBounds,
    x0, r0, meanVelocity, meanAngularVelocity, coefficients, denominatorQuadratic, supported,
    reason: supported ? null : 'Coefficient interval overflow; candidate geometry is not certified' };
}
type Bernstein = [Interval, Interval, Interval, Interval];
function bernstein(b: Bernstein): Bernstein {
  const third: Interval = { lo: next(1 / 3, false), hi: next(1 / 3, true) };
  return [b[0], add(b[0], mul(b[1], third)), add(add(b[0], scale(mul(b[1], third), 2)), mul(b[2], third)), add(add(add(b[0], b[1]), b[2]), b[3])];
}
function split(b: Bernstein): [Bernstein, Bernstein] {
  const mid = (a: Interval, c: Interval) => scale(add(a, c), .5);
  const a = mid(b[0], b[1]), c = mid(b[1], b[2]), d = mid(b[2], b[3]), e = mid(a, c), f = mid(c, d), g = mid(e, f);
  return [[b[0], a, e, g], [g, f, d, b[3]]];
}
function evaluate(b: Bernstein, u: number): Interval { return add(mul(add(mul(add(mul(b[3], point(u)), b[2]), point(u)), b[1]), point(u)), b[0]); }
interface Isolation { possible: Interval[]; negative: boolean; exhausted: boolean; nodes: number }
function isolate(b: Bernstein, width: number, maxDepth: number, maxNodes: number): Isolation {
  const pending = [{ b: bernstein(b), lo: 0, hi: 1, depth: 0 }], possible: Interval[] = [];
  let nodes = 0, negative = false, exhausted = false;
  while (pending.length) {
    const node = pending.pop()!;
    if (nodes >= maxNodes) { exhausted = true; possible.push({ lo: node.lo, hi: node.hi }, ...pending.map(n => ({ lo: n.lo, hi: n.hi }))); break; }
    nodes++;
    const lower = Math.min(...node.b.map(x => x.lo)), upper = Math.max(...node.b.map(x => x.hi));
    if (!Number.isFinite(lower) || !Number.isFinite(upper)) { exhausted = true; possible.push({ lo: node.lo, hi: node.hi }); continue; }
    if (lower > 0) continue;
    if (upper < 0) { negative = true; continue; }
    // Once all Bernstein intervals contain zero, every descendant convex
    // interval combination also contains zero. Further splitting cannot
    // establish a sign; retain this arithmetic-ambiguous region intact.
    if (node.b.every(x => x.lo <= 0 && x.hi >= 0)) { possible.push({ lo: node.lo, hi: node.hi }); continue; }
    if (node.hi - node.lo <= width) { possible.push({ lo: node.lo, hi: node.hi }); continue; }
    if (node.depth >= maxDepth) { exhausted = true; possible.push({ lo: node.lo, hi: node.hi }); continue; }
    const [left, right] = split(node.b), middle = .5 * (node.lo + node.hi);
    pending.push({ b: right, lo: middle, hi: node.hi, depth: node.depth + 1 }, { b: left, lo: node.lo, hi: middle, depth: node.depth + 1 });
  }
  return { possible, negative, exhausted, nodes };
}
/** Outward-rounded Bernstein hulls retain ALL possible roots. A bracket may
 * contain no true root when roundoff/topology is unresolved. Such a bracket is
 * explicitly ambiguous; never use it as an accepted touchdown or impact. */
export function inspectMaterialPlane(candidate: MaterialPlaneCandidate, options: MaterialPlaneOptions = {}): MaterialPlaneReport {
  const timeTolerance = options.timeTolerance ?? 1e-8, gapTolerance = options.gapTolerance ?? 1e-9;
  const maxDepth = options.maxDepth ?? 48, maxNodes = options.maxNodes ?? 20000;
  if (!(timeTolerance > 0 && Number.isFinite(timeTolerance)) || !(gapTolerance >= 0 && Number.isFinite(gapTolerance))
    || !Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 100 || !Number.isInteger(maxNodes) || maxNodes < 1)
    throw new RangeError('Finite positive time tolerance and bounded subdivision options required');
  const unsupported = (reason: string): MaterialPlaneReport => ({ status: 'unsupported', reason, roots: [], nodes: 0, unresolved: [{ lo: 0, hi: candidate.dt }], maxBracketWidth: 0, timeResolutionMet: false, penetrationBeyondTolerance: { possible: true, certain: false } });
  if (!(candidate.dt > 0 && Number.isFinite(candidate.dt)) || !(candidate.normalLength > 0 && Number.isFinite(candidate.normalLength)))
    throw new RangeError('Finite positive candidate interval and plane scale required');
  if (!candidate.supported || ![...candidate.coefficients, candidate.denominatorQuadratic, candidate.normalLengthBounds].every(finiteInterval)) return unsupported(candidate.reason ?? 'Nonfinite polynomial enclosure');
  if (candidate.coefficients.every(isZero)) return { status: 'coincident', reason: 'Candidate point lies on plane throughout interval', roots: [], nodes: 0, unresolved: [], maxBracketWidth: 0, timeResolutionMet: false, penetrationBeyondTolerance: { possible: false, certain: false } };
  const width = Math.min(1, (timeTolerance / candidate.dt) * .25), roots = isolate(candidate.coefficients, width, maxDepth, maxNodes);
  const epsilon = mul(point(gapTolerance), candidate.normalLengthBounds);
  const shifted: Bernstein = [add(candidate.coefficients[0], epsilon), candidate.coefficients[1], add(candidate.coefficients[2], mul(epsilon, candidate.denominatorQuadratic)), candidate.coefficients[3]];
  const penetration = isolate(shifted, width, maxDepth, Math.max(0, maxNodes - roots.nodes));
  const merged: Interval[] = [];
  for (const interval of roots.possible.sort((a, b) => a.lo - b.lo)) {
    const last = merged[merged.length - 1]; if (last && interval.lo <= last.hi) last.hi = Math.max(last.hi, interval.hi); else merged.push({ ...interval });
  }
  const brackets: MaterialPlaneBracket[] = merged.map(r => {
    const left = evaluate(candidate.coefficients, r.lo), right = evaluate(candidate.coefficients, r.hi);
    const kind = left.lo > 0 && right.hi < 0 ? 'entering' : left.hi < 0 && right.lo > 0 ? 'leaving' : 'ambiguous';
    return { lo: Math.max(0, next(r.lo * candidate.dt, false)), hi: Math.min(candidate.dt, next(r.hi * candidate.dt, true)), kind };
  });
  const exhausted = roots.exhausted || penetration.exhausted;
  const maxBracketWidth = Math.max(0, ...brackets.map(r => r.hi - r.lo));
  const timeResolutionMet = !exhausted && maxBracketWidth <= timeTolerance + 16 * Number.EPSILON * candidate.dt;
  const ambiguous = brackets.some(r => r.kind === 'ambiguous') || !timeResolutionMet;
  return { status: exhausted ? 'unsupported' : ambiguous ? 'ambiguous' : brackets.length ? 'roots' : 'clear',
    reason: exhausted ? 'Subdivision limit or arithmetic uncertainty; shorten candidate or increase explicit numerical budget' : !timeResolutionMet ? 'Merged candidate root enclosure exceeds requested time resolution' : ambiguous ? 'Possible repeated/grazing or roundoff-ambiguous candidate roots' : null,
    roots: brackets, nodes: roots.nodes + penetration.nodes, maxBracketWidth, timeResolutionMet, unresolved: exhausted ? [...roots.possible, ...penetration.possible].map(r => ({ lo: Math.max(0, next(r.lo * candidate.dt, false)), hi: Math.min(candidate.dt, next(r.hi * candidate.dt, true)) })) : [],
    penetrationBeyondTolerance: { possible: penetration.negative || penetration.possible.length > 0, certain: penetration.negative } };
}
