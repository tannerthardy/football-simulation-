/** Planar inertial-foot research kernel; no World selection or gait driver.
 * Existing body mass is TOTAL mass. Explicit foot fractions are provisional
 * caller configuration, not an anthropometric default. Units: kg, yd, s.
 */
import type { Vec2 } from '../core/vec.js';
import type { PhysicalProfile } from '../players/physical.js';
import { newFiniteSupport, type SupportSlot, type SupportGrip } from './finite-support.js';
import { supportParams } from './support.js';

const zero = (): Vec2 => ({ x: 0, y: 0 });
const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
const norm = (a: Vec2): number => Math.hypot(a.x, a.y);
const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
const disk = (v: Vec2, radius: number): Vec2 => {
  if (radius === 0) return zero();
  const size = norm(v);
  if (size <= radius) return v;
  let result = mul(v, radius / size);
  while (norm(result) > radius) result = mul(result, 1 - 2 * Number.EPSILON);
  return result;
};
export interface InertialSupportBody {
  mass: number;
  footMass: [number, number];
  position: Vec2;
  velocity: Vec2;
  footVelocity: [Vec2, Vec2];
  slots: [SupportSlot, SupportSlot];
  reach: number;
  traction: number;
  legForce: number;
  /** Material torso rotor. Attachments remain at its center in this planar
   * reduction; no finite-offset yaw grip or ground-yaw controller exists. */
  angle: number;
  angularVelocity: number;
  yawInertia: number;
}
export interface InertialSupportReport {
  dt: number; iterations: number; coupledUpdates: number; converged: boolean; maxImpulseChange: number;
  energyBefore: number; energyAfter: number; motorWork: number; motorWorkByBody: number[];
  groundWork: number; gripWork: number; reachWork: number; externalWork: number;
  workResidual: number; momentumResidual: Vec2; maxReachViolation: number; maxPassiveWork: number;
  maxPassiveGroundWork: number; maxPassiveGripWork: number; maxPassiveReachWork: number;
  motorReactionAngularImpulse: number[][];
  rotorWork: number;
  slotMotorRotationalWork: number[][];
  unrepresentedAngularImpulse: { motor: number; reach: number; grip: number; total: number };
  angularMomentumBefore: number; angularMomentumAfter: number;
  externalAngularImpulse: number; angularMomentumResidual: number;
  /** Delivered physical force (kg*yd/s²), impulse (kg*yd/s), and leg
   * midpoint velocity (yd/s), all relative to the actual material torso. */
  physicalLegForces: Vec2[][]; physicalLegImpulse: Vec2[][];
  actualLegMeanVelocity: Vec2[][];
  /** Signed physical actuator work per leg including its rotor reaction,
   * kg*yd²/s². */
  slotMotorWork: number[][];
  slotEndVelocity: Vec2[][];
  groundStopping: boolean[][];
  projectedReversals: boolean[][];
  gripModel: 'vector' | 'tether';
  gripSlips: boolean[];
  gripBrokenAtEnd: boolean[];
  /** Extension above this interval's passive radius before slip ratcheting. */
  maxHoldDistanceViolation: number;
  maxUncappedHoldDistanceViolation: number;
  commandForce: number[]; groundImpulse: Vec2[]; slotGroundImpulse: Vec2[][];
  slotReachImpulse: Vec2[][]; relativeImpulse: Vec2[][]; slotMeanVelocity: Vec2[][];
}
export interface InertialSupportSolveOptions {
  maxIterations?: number;
  tolerance?: number;
  /** Physical kinetic-slip direction, frozen over this interval. Null uses
   * a static row; swing slots must be null. Driver splits at first stop. */
  slidingDirections?: Array<Array<Vec2 | null>>;
  /** Endpoint zero is intended for initially static plants after a local
   * stop event. Midpoint retains the original solver as an ablation. */
  staticGround?: 'midpoint' | 'endpoint';
  /** Midpoint resolves a dissipative 2D friction disk; frozen is the original kinetic-direction ablation. */
  slidingFriction?: 'frozen' | 'midpoint';
  /** Exact local grip/static-plant blocks; false retains projected rows. */
  coupledUpdates?: boolean;
  /** Vector retains the old sideways resistance as an ablation. Tether
   * transmits only central finite tension and permits transverse motion. */
  gripModel?: 'vector' | 'tether';
}
function validate(b: InertialSupportBody): void {
  const foot = b.footMass[0] + b.footMass[1];
  if (![b.mass, b.reach, b.yawInertia, ...b.footMass].every(x => x > 0 && Number.isFinite(x)) || foot >= b.mass)
    throw new RangeError('Positive finite masses/reach and positive torso mass required');
  if (![b.traction, b.legForce].every(x => x >= 0 && Number.isFinite(x))) throw new RangeError('Invalid force limits');
  const vectors = [b.position, b.velocity, ...b.footVelocity, ...b.slots.map(f => f.position)];
  if (vectors.some(v => ![v.x, v.y].every(Number.isFinite))) throw new RangeError('Finite kinematic state required');
  if (![b.angle, b.angularVelocity].every(Number.isFinite)) throw new RangeError('Finite rotor state required');
  if (b.slots[0].id !== 0 || b.slots[1].id !== 1 || b.slots.some(f => !Number.isFinite(f.load) || f.load < 0 || f.load > 1 || (f.mode === 'swing' && f.load !== 0))
    || Math.abs(b.slots[0].load + b.slots[1].load - 1) > 1e-9) throw new RangeError('Persistent slots and normalized prescribed loads required');
  if (b.slots.some(f => norm(sub(f.position, torsoPosition(b))) > b.reach + 1e-7)) throw new RangeError('Initial reach violation');
}
export function newInertialSupport(profile: PhysicalProfile, position: Vec2,
  config: { footMassFractions: [number, number] }): InertialSupportBody {
  const base = newFiniteSupport(profile, position);
  const result: InertialSupportBody = { mass: profile.massKg,
    footMass: config.footMassFractions.map(f => f * profile.massKg) as [number, number],
    position: { ...position }, velocity: zero(), footVelocity: [zero(), zero()], slots: base.slots,
    reach: base.reach, traction: base.traction, legForce: base.legForce,
    angle: 0, angularVelocity: 0, yawInertia: supportParams(profile).yawInertia };
  validate(result); return result;
}
export function inertialSupportEnergy(b: InertialSupportBody): number {
  const u = b.footVelocity.map(v => sub(v, b.velocity));
  const weighted = add(mul(u[0], b.footMass[0]), mul(u[1], b.footMass[1]));
  const torso = b.mass - b.footMass[0] - b.footMass[1];
  return .5 * b.mass * dot(b.velocity, b.velocity) + .5 * b.yawInertia * b.angularVelocity ** 2
    + .5 * b.footMass[0] * dot(u[0], u[0]) + .5 * b.footMass[1] * dot(u[1], u[1])
    + .5 * dot(weighted, weighted) / torso;
}
export function torsoPosition(b: InertialSupportBody): Vec2 {
  const weighted = add(mul(sub(b.slots[0].position, b.position), b.footMass[0]),
    mul(sub(b.slots[1].position, b.position), b.footMass[1]));
  return sub(b.position, mul(weighted, 1 / (b.mass - b.footMass[0] - b.footMass[1])));
}
export function torsoVelocity(b: InertialSupportBody): Vec2 {
  const weighted = add(mul(sub(b.footVelocity[0], b.velocity), b.footMass[0]),
    mul(sub(b.footVelocity[1], b.velocity), b.footMass[1]));
  return sub(b.velocity, mul(weighted, 1 / (b.mass - b.footMass[0] - b.footMass[1])));
}
/** Material orbital momentum plus the represented torso rotor. */
export function inertialSupportAngularMomentum(b: InertialSupportBody): number {
  const torso = b.mass - b.footMass[0] - b.footMass[1];
  return b.yawInertia * b.angularVelocity + torso * cross(torsoPosition(b), torsoVelocity(b))
    + b.footMass[0] * cross(b.slots[0].position, b.footVelocity[0])
    + b.footMass[1] * cross(b.slots[1].position, b.footVelocity[1]);
}

/** Frozen-mode midpoint impulse solve. Physical leg forces act between
 * torso and each foot; there is no damping toward free foot velocity.
 * External impulses apply to the physical torso. Caller must discard a
 * nonconverged candidate before continuing. */
export function solveInertialSupportInterval(bs: InertialSupportBody[], grips: SupportGrip[], dt: number,
  legForces: Vec2[][], externalImpulses: Vec2[] = bs.map(zero),
  options: InertialSupportSolveOptions = {}): InertialSupportReport {
  if (!(dt > 0 && Number.isFinite(dt))) throw new RangeError('Positive finite dt required');
  bs.forEach(validate);
  const maxIterations = options.maxIterations ?? 256, tolerance = options.tolerance ?? 1e-9;
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || !(tolerance > 0 && Number.isFinite(tolerance))) throw new RangeError('Invalid solver options');
  if (legForces.length !== bs.length || externalImpulses.length !== bs.length
    || bs.some((_, i) => legForces[i].length !== 2 || [...legForces[i], externalImpulses[i]].some(v => ![v.x, v.y].every(Number.isFinite)))) throw new RangeError('Finite two-slot forces and COM impulses required');
  if (options.staticGround !== undefined && options.staticGround !== 'midpoint' && options.staticGround !== 'endpoint') throw new RangeError('Invalid static-ground mode');
  const slidingFriction = options.slidingFriction ?? 'frozen';
  if (slidingFriction !== 'frozen' && slidingFriction !== 'midpoint') throw new RangeError('Invalid sliding-friction mode');
  const gripModel = options.gripModel ?? 'vector';
  if (gripModel !== 'vector' && gripModel !== 'tether') throw new RangeError('Invalid grip model');
  const directions = options.slidingDirections ?? bs.map(() => [null, null]);
  if (directions.length !== bs.length || bs.some((b, i) => directions[i].length !== 2
    || directions[i].some((v, f) => v !== null && (b.slots[f].mode !== 'plant' || ![v.x, v.y].every(Number.isFinite) || !(norm(v) > 0))))) throw new RangeError('Finite nonzero plant slip directions required');
  const sliding = directions.map(row => row.map(v => v === null ? null : mul(v, 1 / norm(v))));
  for (const g of grips) {
    if (g.a.body === g.b.body || ![g.capacity, g.holdDistance, g.reach].every(x => x >= 0 && Number.isFinite(x))) throw new RangeError('Invalid grip');
    for (const a of [g.a, g.b]) if (!bs[a.body] || (a.slot !== 0 && a.slot !== 1) || !Number.isFinite(a.share) || a.share < 0 || a.share > 1) throw new RangeError('Invalid attachment');
  }
  const initial = bs.map(b => ({ ...b.velocity })), initialRelative = bs.map(b => b.footVelocity.map(v => sub(v, b.velocity)));
  const energyBefore = bs.reduce((s, b) => s + inertialSupportEnergy(b), 0);
  const angularMomentumBefore = bs.reduce((s, b) => s + inertialSupportAngularMomentum(b), 0);
  const bodyP = externalImpulses.map(p => ({ ...p }));
  const physical = legForces.map((forces, i) => {
    const demand = forces.reduce((s, f) => s + norm(f), 0), scale = demand > 0 ? Math.min(1, bs[i].legForce / demand) : 1;
    return forces.map(f => mul(f, scale * dt));
  });
  const relativeP = bs.map((b, i) => {
    const total = add(physical[i][0], physical[i][1]), torso = b.mass - b.footMass[0] - b.footMass[1];
    return physical[i].map((p, f) => sub(add(p, mul(total, b.footMass[f] / torso)),
      mul(externalImpulses[i], b.footMass[f] / torso)));
  });
  const groundP = bs.map(() => [zero(), zero()]), reachP = bs.map(() => [zero(), zero()]);
  const inverse = (i: number, f: number, g: number): number => (f === g ? 1 / bs[i].footMass[f] : 0) - 1 / bs[i].mass;
  const meanBody = (i: number): Vec2 => add(initial[i], mul(bodyP[i], .5 / bs[i].mass));
  const relative = (i: number, f: number): Vec2 => add(initialRelative[i][f],
    add(mul(relativeP[i][0], .5 * inverse(i, f, 0)), mul(relativeP[i][1], .5 * inverse(i, f, 1))));
  const footMean = (i: number, f: number): Vec2 => add(meanBody(i), relative(i, f));
  const legCoefficients = (i: number, f: number): [number, number] => {
    const b = bs[i], torso = b.mass - b.footMass[0] - b.footMass[1];
    return [0, 1].map(g => (f === g ? 1 : 0) + b.footMass[g] / torso) as [number, number];
  };
  const legMean = (i: number, f: number): Vec2 => {
    const d = legCoefficients(i, f);
    return add(mul(relative(i, 0), d[0]), mul(relative(i, 1), d[1]));
  };
  const coefficients = (a: SupportGrip['a']): [number, number] => {
    const b = bs[a.body], torso = b.mass - b.footMass[0] - b.footMass[1];
    return [0, 1].map(f => (f === a.slot ? a.share : 0) - (1 - a.share) * b.footMass[f] / torso) as [number, number];
  };
  const point = (a: SupportGrip['a']): Vec2 => add(mul(torsoPosition(bs[a.body]), 1 - a.share), mul(bs[a.body].slots[a.slot].position, a.share));
  const pointMean = (a: SupportGrip['a']): Vec2 => {
    const c = coefficients(a);
    return add(meanBody(a.body), add(mul(relative(a.body, 0), c[0]), mul(relative(a.body, 1), c[1])));
  };
  const apply = (a: SupportGrip['a'], p: Vec2): void => {
    bodyP[a.body] = add(bodyP[a.body], p);
    const c = coefficients(a); for (let f = 0; f < 2; f++) relativeP[a.body][f] = add(relativeP[a.body][f], mul(p, c[f]));
  };
  const attachmentInverse = (attachment: SupportGrip['a']): number => {
    const c = coefficients(attachment); let response = .5 / bs[attachment.body].mass;
    for (let f = 0; f < 2; f++) for (let g = 0; g < 2; g++) response += .5 * c[f] * c[g] * inverse(attachment.body, f, g);
    return response;
  };
  // Kinetic friction is one physical interval impulse, not an iterated
  // velocity projection. Its stop time belongs to the coupled driver.
  for (let i = 0; i < bs.length; i++) for (const f of bs[i].slots) {
    const direction = sliding[i][f.id];
    if (direction !== null && slidingFriction === 'frozen') {
      const impulse = mul(direction, -bs[i].traction * f.load * dt);
      groundP[i][f.id] = impulse;
      apply({ body: i, slot: f.id, share: 1 }, impulse);
    }
  }
  for (const g of grips) if (g.capacity === 0 || norm(sub(point(g.b), point(g.a))) > g.reach) g.broken = true;
  const rows = grips.map(g => {
    const delta = sub(point(g.b), point(g.a)), distance = norm(delta), owners = grips.filter(o => !o.broken && o.a.body === g.a.body);
    const sum = owners.reduce((s, o) => s + o.capacity, 0), strongest = Math.max(0, ...owners.map(o => o.capacity));
    return { g, initialDelta: delta, radius: Math.max(distance, g.holdDistance), slipping: false,
      n: distance > 1e-12 ? mul(delta, 1 / distance) : { x: 1, y: 0 }, impulse: zero(),
      allowance: Math.max(0, g.holdDistance - distance) / dt,
      limit: g.capacity * Math.min(1, strongest / Math.max(1e-30, sum)) * dt,
      inverse: attachmentInverse(g.a) + attachmentInverse(g.b) };
  });
  let iterations = 0, maxChange = Infinity, coupledUpdates = 0;
  for (; iterations < maxIterations; iterations++) {
    maxChange = 0;
    for (let i = 0; i < bs.length; i++) for (const f of bs[i].slots) if (f.mode === 'plant' && (sliding[i][f.id] === null || slidingFriction === 'midpoint')) {
      const endpoint = options.staticGround === 'endpoint' && sliding[i][f.id] === null;
      const response = (endpoint ? 1 : .5) / bs[i].footMass[f.id];
      const velocity = endpoint ? sub(mul(footMean(i, f.id), 2), bs[i].footVelocity[f.id]) : footMean(i, f.id);
      const next = disk(sub(groundP[i][f.id], mul(velocity, 1 / response)), bs[i].traction * f.load * dt);
      const change = sub(next, groundP[i][f.id]); groundP[i][f.id] = next;
      apply({ body: i, slot: f.id, share: 1 }, change); maxChange = Math.max(maxChange, norm(change));
    }
    for (const r of rows) if (!r.g.broken) {
      const rv = sub(pointMean(r.g.b), pointMean(r.g.a));
      let next: Vec2;
      if (gripModel === 'tether') {
        const withoutOwn = sub(rv, mul(r.impulse, r.inverse));
        const free = add(r.initialDelta, mul(withoutOwn, dt));
        r.slipping = false; next = zero();
        if (norm(free) > r.radius) {
          const aa = dot(r.initialDelta, r.initialDelta) - r.radius ** 2;
          const hh = dot(free, r.initialDelta) + r.radius ** 2, cc = dot(free, free) - r.radius ** 2;
          const denominator = hh + Math.sqrt(Math.max(0, hh * hh - aa * cc));
          if (!(denominator > 0 && Number.isFinite(denominator))) throw new RangeError('Degenerate tether crossing requires a shorter physical interval');
          const required = cc / denominator;
          const at = (alpha: number): Vec2 => mul(add(r.initialDelta, free), -alpha / ((1 + alpha) * dt * r.inverse));
          let alpha = required;
          if (norm(at(required)) > r.limit) {
            r.slipping = true;
            let lo = 0, hi = required;
            for (let k = 0; k < 60; k++) { const mid = .5 * (lo + hi); if (norm(at(mid)) > r.limit) hi = mid; else lo = mid; }
            alpha = lo;
          }
          next = disk(at(alpha), r.limit);
        }
      } else {
        let wanted = sub(r.impulse, mul(sub(rv, mul(r.n, r.allowance)), 1 / r.inverse));
        wanted = sub(wanted, mul(r.n, Math.max(0, dot(wanted, r.n))));
        next = disk(wanted, r.limit);
      }
      const change = sub(next, r.impulse); r.impulse = next;
      apply(r.g.a, mul(change, -1)); apply(r.g.b, change); maxChange = Math.max(maxChange, norm(change));
    }
    // Solve a grip and its unknown static plant reaction in the same
    // midpoint Jacobian. Fixed kinetic rows are physical impulses, not
    // unknowns, and therefore never enter this coupled block.
    if (gripModel === 'vector' && options.coupledUpdates !== false) for (const row of rows) {
      if (row.g.broken) continue;
      for (const [attachment, sign] of [[row.g.a, -1], [row.g.b, 1]] as const) {
        const i = attachment.body, f = bs[i].slots[attachment.slot];
        if (f.mode !== 'plant' || f.load === 0 || (sliding[i][f.id] !== null && slidingFriction === 'frozen')) continue;
        const a = .5 / bs[i].footMass[f.id];
        // Material torso and the other foot have zero direct response here.
        const c = sign * .5 * attachment.share / bs[i].footMass[f.id];
        const determinant = a * row.inverse - c * c;
        if (determinant <= 1e-12 * a * row.inverse) continue; // redundant pair
        const target = options.staticGround === 'endpoint' && sliding[i][f.id] === null ? mul(bs[i].footVelocity[f.id], .5) : zero();
        const vg = sub(footMean(i, f.id), target);
        const vr = sub(sub(pointMean(row.g.b), pointMean(row.g.a)), mul(row.n, row.allowance));
        const groundLimit = bs[i].traction * f.load * dt;
        const vgFree = sub(sub(vg, mul(groundP[i][f.id], a)), mul(row.impulse, c));
        const vrFree = sub(sub(vr, mul(groundP[i][f.id], c)), mul(row.impulse, row.inverse));
        // Eliminate the full grip at a given grip-disk multiplier beta.
        // Ground's Schur response is isotropic even when it is sliding.
        const fullAt = (beta: number) => {
          const q = row.inverse + beta, schur = a - c * c / q;
          const ground = disk(mul(sub(vgFree, mul(vrFree, c / q)), -1 / schur), groundLimit);
          return { ground, grip: mul(add(vrFree, mul(ground, c)), -1 / q) };
        };
        let full = fullAt(0);
        if (norm(full.grip) > row.limit) {
          let lo = 0, hi = row.inverse;
          while (norm(fullAt(hi).grip) > row.limit) hi *= 2;
          for (let k = 0; k < 60; k++) {
            const mid = .5 * (lo + hi);
            if (norm(fullAt(mid).grip) > row.limit) lo = mid; else hi = mid;
          }
          full = fullAt(hi);
        }
        let jNext = disk(full.grip, row.limit);
        let gNext = disk(mul(add(vgFree, mul(jNext, c)), -1 / a), groundLimit);
        let dg = sub(gNext, groundP[i][f.id]), dj = sub(jNext, row.impulse);
        // Slack in the normal direction leaves the tangent sticking row
        // active. Solve that three-scalar block, rather than inventing a
        // compressive rope force to satisfy an inactive extension row.
        if (dot(jNext, row.n) > 0) {
          const tangent = { x: -row.n.y, y: row.n.x };
          // Eliminate ground for a given tangent impulse. The remaining
          // scalar gradient is monotone (positive Schur response); bracket
          // its optimum within the grip disk. This also handles a slipping
          // plant without using an incorrect isotropic tangent projection.
          const groundAt = (z: number) => disk(mul(add(vgFree, mul(tangent, c * z)), -1 / a), groundLimit);
          const gradient = (z: number) => row.inverse * z + dot(vrFree, tangent) + c * dot(groundAt(z), tangent);
          let lo = -row.limit, hi = row.limit, z: number;
          if (gradient(lo) >= 0) z = lo;
          else if (gradient(hi) <= 0) z = hi;
          else {
            for (let k = 0; k < 60; k++) {
              const mid = .5 * (lo + hi);
              if (gradient(mid) > 0) hi = mid; else lo = mid;
            }
            z = .5 * (lo + hi);
          }
          jNext = disk(mul(tangent, z), row.limit);
          gNext = disk(mul(add(vgFree, mul(jNext, c)), -1 / a), groundLimit);
          dj = sub(jNext, row.impulse); dg = sub(gNext, groundP[i][f.id]);
          const after = add(vrFree, add(mul(gNext, c), mul(jNext, row.inverse)));
          if (dot(after, row.n) > 1e-12) continue;
        }
        if (norm(gNext) > bs[i].traction * f.load * dt || norm(jNext) > row.limit || dot(jNext, row.n) > 1e-12) continue;
        groundP[i][f.id] = gNext; row.impulse = jNext;
        apply({ body: i, slot: f.id, share: 1 }, dg);
        apply(row.g.a, mul(dj, -1)); apply(row.g.b, dj);
        maxChange = Math.max(maxChange, norm(dg), norm(dj)); coupledUpdates++;
      }
    }
    if (gripModel === 'tether' && options.coupledUpdates !== false) for (const row of rows) {
      if (row.g.broken) continue;
      for (const [attachment, sign] of [[row.g.a, -1], [row.g.b, 1]] as const) {
        const i = attachment.body, f = bs[i].slots[attachment.slot];
        if (f.mode !== 'plant' || f.load === 0 || (sliding[i][f.id] !== null && slidingFriction === 'frozen') || attachment.share === 0) continue;
        const a = .5 / bs[i].footMass[f.id], b = row.inverse;
        const c = sign * .5 * attachment.share / bs[i].footMass[f.id];
        if (a * b - c * c <= 1e-12 * a * b) continue;
        const groundLimit = bs[i].traction * f.load * dt;
        const target = options.staticGround === 'endpoint' && sliding[i][f.id] === null ? mul(bs[i].footVelocity[f.id], .5) : zero();
        const vg = sub(footMean(i, f.id), target), rv = sub(pointMean(row.g.b), pointMean(row.g.a));
        const vgFree = sub(sub(vg, mul(groundP[i][f.id], a)), mul(row.impulse, c));
        const rvFree = sub(sub(rv, mul(groundP[i][f.id], c)), mul(row.impulse, b));
        const augmented = add(rvFree, mul(row.initialDelta, 2 / dt));
        const at = (beta: number) => {
          const q = b + beta, schur = a - c * c / q;
          const ground = disk(mul(sub(vgFree, mul(augmented, c / q)), -1 / schur), groundLimit);
          const grip = mul(add(augmented, mul(ground, c)), -1 / q);
          const end = add(row.initialDelta, mul(add(rvFree, add(mul(ground, c), mul(grip, b))), dt));
          return { ground, grip, end };
        };
        let ground = disk(mul(vgFree, -1 / a), groundLimit), grip = zero();
        const freeEnd = add(row.initialDelta, mul(add(rvFree, mul(ground, c)), dt));
        row.slipping = false;
        if (norm(freeEnd) > row.radius) {
          // At a boundary start beta=0 is the reflected endpoint -d0.
          // Conservatively split if this reflected branch does not first
          // enter the disk. An active ground disk can create later roots,
          // but accepting the near-zero root would fake a reflection.
          if (norm(row.initialDelta) >= row.radius && dot(row.initialDelta, at(0).grip) >= 0)
            throw new RangeError('Degenerate coupled tether crossing requires a shorter physical interval');
          // beta is the reciprocal discrete-gradient multiplier. Every
          // positive beta gives d0+d1=-h*beta*J, hence a central tether.
          let lo = 0, hi = b;
          while (norm(at(hi).end) <= row.radius) {
            hi *= 2;
            if (!Number.isFinite(hi)) throw new RangeError('Unable to bracket coupled tether radius');
          }
          for (let k = 0; k < 60; k++) {
            const mid = .5 * (lo + hi);
            if (norm(at(mid).end) > row.radius) hi = mid; else lo = mid;
          }
          let candidate = at(hi);
          if (norm(candidate.grip) > row.limit) {
            row.slipping = true; lo = hi; hi = Math.max(b, 2 * hi);
            while (norm(at(hi).grip) > row.limit) {
              hi *= 2;
              if (!Number.isFinite(hi)) throw new RangeError('Unable to bracket coupled tether cap');
            }
            for (let k = 0; k < 60; k++) {
              const mid = .5 * (lo + hi);
              if (norm(at(mid).grip) > row.limit) lo = mid; else hi = mid;
            }
            candidate = at(hi);
          }
          grip = disk(candidate.grip, row.limit);
          ground = disk(mul(add(vgFree, mul(grip, c)), -1 / a), groundLimit);
        }
        const dg = sub(ground, groundP[i][f.id]), dj = sub(grip, row.impulse);
        groundP[i][f.id] = ground; row.impulse = grip;
        apply({ body: i, slot: f.id, share: 1 }, dg);
        apply(row.g.a, mul(dj, -1)); apply(row.g.b, dj);
        maxChange = Math.max(maxChange, norm(dg), norm(dj)); coupledUpdates++;
      }
    }
    for (let i = 0; i < bs.length; i++) for (const f of bs[i].slots) {
      const torsoMass = bs[i].mass - bs[i].footMass[0] - bs[i].footMass[1];
      const response = .5 * (1 / bs[i].footMass[f.id] + 1 / torsoMass);
      const own = reachP[i][f.id], withoutOwn = sub(legMean(i, f.id), mul(own, response));
      const initialLeg = sub(f.position, torsoPosition(bs[i])), free = add(initialLeg, mul(withoutOwn, dt));
      let next = zero();
      if (norm(free) > bs[i].reach) {
        // Discrete-gradient normal is central at the actual midpoint leg.
        // Endpoint-only normals would inject unrepresented orbital torque.
        const radius2 = bs[i].reach ** 2, aa = dot(initialLeg, initialLeg) - radius2;
        const hh = dot(free, initialLeg) + radius2, cc = dot(free, free) - radius2;
        const denominator = hh + Math.sqrt(Math.max(0, hh * hh - aa * cc));
        if (!(denominator > 0 && Number.isFinite(denominator)))
          throw new RangeError('Degenerate reach crossing requires a shorter physical interval');
        let alpha = cc / denominator;
        let end = mul(sub(free, mul(initialLeg, alpha)), 1 / (1 + alpha));
        // Keep a rounded boundary feasible without changing the normal law.
        for (let attempt = 0; norm(end) > bs[i].reach && attempt < 8; attempt++) {
          alpha *= 1 + 4 * Number.EPSILON;
          end = mul(sub(free, mul(initialLeg, alpha)), 1 / (1 + alpha));
        }
        next = mul(add(initialLeg, end), -alpha / (dt * response));
      }
      const change = sub(next, own); reachP[i][f.id] = next;
      const d = legCoefficients(i, f.id);
      for (let g = 0; g < 2; g++) relativeP[i][g] = add(relativeP[i][g], mul(change, d[g]));
      maxChange = Math.max(maxChange, norm(change));
    }
    if (maxChange <= tolerance) { iterations++; break; }
  }
  const meanRelative = bs.map((b, i) => b.slots.map(f => relative(i, f.id)));
  const meanFeet = bs.map((b, i) => b.slots.map(f => footMean(i, f.id))), groundImpulse = bs.map(zero);
  let groundWork = 0, gripWork = 0, reachWork = 0, externalWork = 0, maxPassiveWork = 0;
  let maxPassiveGroundWork = 0, maxPassiveGripWork = 0, maxPassiveReachWork = 0;
  const actualLegMeanVelocity = bs.map((b, i) => b.slots.map(f => legMean(i, f.id)));
  const slotMotorWork = physical.map((forces, i) => forces.map((impulse, f) => dot(impulse, actualLegMeanVelocity[i][f])));
  const motorReactionAngularImpulse = bs.map((b, i) => physical[i].map((impulse, f) => {
    const midpointLeg = add(sub(b.slots[f].position, torsoPosition(b)), mul(legMean(i, f), .5 * dt));
    return -cross(midpointLeg, impulse);
  }));
  const rotorImpulse = motorReactionAngularImpulse.map(impulses => impulses.reduce((sum, impulse) => sum + impulse, 0));
  const meanAngularVelocity = bs.map((b, i) => b.angularVelocity + .5 * rotorImpulse[i] / b.yawInertia);
  const slotMotorRotationalWork = motorReactionAngularImpulse.map((impulses, i) => impulses.map(impulse => impulse * meanAngularVelocity[i]));
  for (let i = 0; i < bs.length; i++) for (let f = 0; f < 2; f++) slotMotorWork[i][f] += slotMotorRotationalWork[i][f];
  const rotorWork = slotMotorRotationalWork.flat().reduce((sum, work) => sum + work, 0);
  const motorWorkByBody = slotMotorWork.map(work => work.reduce((sum, w) => sum + w, 0));
  const midTorso = (i: number): Vec2 => {
    const b = bs[i], torso = b.mass - b.footMass[0] - b.footMass[1];
    const mean = sub(meanBody(i), mul(add(mul(meanRelative[i][0], b.footMass[0]), mul(meanRelative[i][1], b.footMass[1])), 1 / torso));
    return add(torsoPosition(b), mul(mean, .5 * dt));
  };
  const midFoot = (i: number, f: number): Vec2 => add(bs[i].slots[f].position, mul(meanFeet[i][f], .5 * dt));
  const midPoint = (a: SupportGrip['a']): Vec2 => add(mul(midTorso(a.body), 1 - a.share), mul(midFoot(a.body, a.slot), a.share));
  let externalAngularImpulse = 0, gripAngularImpulse = 0, reachAngularImpulse = 0;
  for (const r of rows) if (!r.g.broken) gripAngularImpulse += cross(sub(midPoint(r.g.b), midPoint(r.g.a)), r.impulse);
  for (let i = 0; i < bs.length; i++) {
    externalAngularImpulse += cross(midTorso(i), externalImpulses[i]);
    for (let f = 0; f < 2; f++) {
      externalAngularImpulse += cross(midFoot(i, f), groundP[i][f]);
      reachAngularImpulse += cross(sub(midFoot(i, f), midTorso(i)), reachP[i][f]);
    }
  }
  const unrepresentedAngularImpulse = { motor: 0, reach: reachAngularImpulse,
    grip: gripAngularImpulse, total: reachAngularImpulse + gripAngularImpulse };
  for (const r of rows) if (!r.g.broken) { const work = dot(r.impulse, sub(pointMean(r.g.b), pointMean(r.g.a))); gripWork += work; maxPassiveWork = Math.max(maxPassiveWork, work); maxPassiveGripWork = Math.max(maxPassiveGripWork, work); }
  for (let i = 0; i < bs.length; i++) {
    const torso = bs[i].mass - bs[i].footMass[0] - bs[i].footMass[1];
    const torsoMean = sub(meanBody(i), mul(add(mul(meanRelative[i][0], bs[i].footMass[0]), mul(meanRelative[i][1], bs[i].footMass[1])), 1 / torso));
    externalWork += dot(externalImpulses[i], torsoMean);
    for (let f = 0; f < 2; f++) {
      groundImpulse[i] = add(groundImpulse[i], groundP[i][f]);
      const gw = dot(groundP[i][f], meanFeet[i][f]), rw = dot(reachP[i][f], legMean(i, f));
      groundWork += gw; reachWork += rw; maxPassiveWork = Math.max(maxPassiveWork, gw, rw);
      maxPassiveGroundWork = Math.max(maxPassiveGroundWork, gw); maxPassiveReachWork = Math.max(maxPassiveReachWork, rw);
    }
    const mean = meanBody(i); bs[i].position = add(bs[i].position, mul(mean, dt));
    bs[i].angle += meanAngularVelocity[i] * dt;
    bs[i].angularVelocity += rotorImpulse[i] / bs[i].yawInertia;
    bs[i].velocity = add(initial[i], mul(bodyP[i], 1 / bs[i].mass));
    for (let f = 0; f < 2; f++) {
      bs[i].slots[f].position = add(bs[i].slots[f].position, mul(meanFeet[i][f], dt));
      bs[i].footVelocity[f] = add(bs[i].velocity, sub(mul(meanRelative[i][f], 2), initialRelative[i][f]));
    }
  }
  const energyAfter = bs.reduce((s, b) => s + inertialSupportEnergy(b), 0), motorWork = motorWorkByBody.reduce((s, w) => s + w, 0);
  const angularMomentumAfter = bs.reduce((s, b) => s + inertialSupportAngularMomentum(b), 0);
  const gripSlips = rows.map(r => !r.g.broken && gripModel === 'tether' && r.slipping);
  const gripBrokenAtEnd = rows.map(r => !r.g.broken && norm(sub(point(r.g.b), point(r.g.a))) > r.g.reach);
  let maxHoldDistanceViolation = 0, maxUncappedHoldDistanceViolation = 0;
  rows.forEach((r, index) => {
    if (r.g.broken) return;
    const distance = norm(sub(point(r.g.b), point(r.g.a))), excess = Math.max(0, distance - r.radius);
    maxHoldDistanceViolation = Math.max(maxHoldDistanceViolation, excess);
    if (gripModel === 'tether') {
      if (!gripSlips[index]) maxUncappedHoldDistanceViolation = Math.max(maxUncappedHoldDistanceViolation, excess);
      if (gripSlips[index]) r.g.holdDistance = Math.max(r.g.holdDistance, distance);
    }
    if (gripBrokenAtEnd[index]) r.g.broken = true;
  });
  const momentumResidual = bs.reduce((sum, b, i) => sub(add(sum, mul(sub(b.velocity, initial[i]), b.mass)), add(externalImpulses[i], groundImpulse[i])), zero());
  const maxReachViolation = Math.max(0, ...bs.flatMap(b => b.slots.map(f => norm(sub(f.position, torsoPosition(b))) - b.reach)));
  return { dt, iterations, coupledUpdates, converged: maxChange <= tolerance && maxReachViolation <= 1e-7 && maxPassiveWork <= 1e-7 && maxUncappedHoldDistanceViolation <= 1e-7,
    maxImpulseChange: maxChange, energyBefore, energyAfter, motorWork, motorWorkByBody, groundWork, gripWork,
    reachWork, externalWork, workResidual: energyAfter - energyBefore - motorWork - groundWork - gripWork - reachWork - externalWork,
    momentumResidual, maxReachViolation, maxPassiveWork, motorReactionAngularImpulse, rotorWork, slotMotorRotationalWork, unrepresentedAngularImpulse,
    maxPassiveGroundWork, maxPassiveGripWork, maxPassiveReachWork,
    angularMomentumBefore, angularMomentumAfter, externalAngularImpulse,
    angularMomentumResidual: angularMomentumAfter - angularMomentumBefore - externalAngularImpulse - unrepresentedAngularImpulse.total,
    physicalLegForces: physical.map(forces => forces.map(p => mul(p, 1 / dt))), physicalLegImpulse: physical,
    actualLegMeanVelocity, slotMotorWork,
    gripModel, gripSlips, gripBrokenAtEnd, maxHoldDistanceViolation, maxUncappedHoldDistanceViolation,
    slotEndVelocity: bs.map(b => b.footVelocity.map(v => ({ ...v }))),
    groundStopping: bs.map((b, i) => b.slots.map(f => sliding[i][f.id] !== null
      && norm(b.footVelocity[f.id]) <= 1e-7)),
    projectedReversals: bs.map((b, i) => b.slots.map(f => sliding[i][f.id] !== null
      && dot(b.footVelocity[f.id], sliding[i][f.id]!) <= 0)),
    commandForce: physical.map(forces => forces.reduce((s, p) => s + norm(p) / dt, 0)), groundImpulse,
    slotGroundImpulse: groundP, slotReachImpulse: reachP, relativeImpulse: relativeP, slotMeanVelocity: meanFeet };
}
