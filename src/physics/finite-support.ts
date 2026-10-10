/** Research kernel for two finite support points and their shared force paths.
 * Not selected by World: nominal running gait, contact-height rotation and
 * production balance integration have not been validated with this reduction.
 * Units match World: kg, yards, seconds. Feet have no added segment mass.
 */
import { G } from '../core/units.js';
import type { Vec2 } from '../core/vec.js';
import type { PhysicalProfile } from '../players/physical.js';
import { baseRadiusAt, comHeightAt, supportParams } from './support.js';

export type FootId = 0 | 1;
export interface SupportSlot {
  readonly id: FootId;
  position: Vec2;
  restOffset: Vec2;
  mode: 'plant' | 'swing';
  /** Quasi-static fraction of body weight, not a solved vertical reaction. */
  load: number;
  target: Vec2;
  elapsed: number;
  duration: number;
  /** End-of-stroke aim error; a completed step need not reach its aim point. */
  placement?: { actual: Vec2; target: Vec2; miss: Vec2 };
}
export interface FiniteSupportBody {
  mass: number;
  position: Vec2;
  velocity: Vec2;
  slots: [SupportSlot, SupportSlot];
  reach: number;
  traction: number;
  /** Shared active leg command force; passive compliance remains finite at 0. */
  legForce: number;
  stepSpeed: number;
  /** Relative velocity per force. Positive: zero must not mean a free foot. */
  mobility: number;
  minimumSwingTime: number;
  transferTime: number;
  responseTime: number;
  transfer: FootId | null;
  queued: { slot: FootId; target: Vec2 } | null;
}
export interface SupportAttachment { body: number; slot: FootId; share: number }
export interface SupportGrip {
  a: SupportAttachment;
  b: SupportAttachment;
  capacity: number;
  holdDistance: number;
  reach: number;
  broken?: boolean;
}
export interface SupportSolveOptions {
  maxIterations?: number;
  tolerance?: number;
  /** Ablation of the local sticking grip/plant block. */
  coupledUpdates?: boolean;
}
export interface SupportIntervalReport {
  dt: number;
  iterations: number;
  coupledUpdates: number;
  gripPairUpdates: number;
  converged: boolean;
  maxImpulseChange: number;
  groundImpulse: Vec2[];
  groundWork: number;
  gripWork: number;
  reachWork: number;
  motorWork: number;
  externalWork: number;
  energyBefore: number;
  energyAfter: number;
  workResidual: number;
  momentumResidual: Vec2;
  motorWorkByBody: number[];
  motorWorkLimit: number[];
  commandFraction: number[];
  tractionFraction: number[];
  maxReachViolation: number;
  maxPassiveWork: number;
  /** Warns about midpoint sign reversal in the stiff single-plant limit. */
  maxStiffnessRatio: number;
  slotImpulse: Vec2[][];
  slotGroundImpulse: Vec2[][];
  slotReachImpulse: Vec2[][];
  slotMeanVelocity: Vec2[][];
  /** Frozen interval shares used to limit ground force. */
  normalShares: number[][];
  loadedSupportBefore: Array<Vec2 | null>;
  loadedSupportAfter: Array<Vec2 | null>;
}
const zero = (): Vec2 => ({ x: 0, y: 0 });
const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
const norm = (a: Vec2): number => Math.hypot(a.x, a.y);
/** Return a representably feasible point, including a rounded cap boundary.
 * Shrinking only after an actual excess preserves the physical force cap. */
const disk = (a: Vec2, radius: number): Vec2 => {
  if (radius === 0) return zero();
  const size = norm(a);
  if (size <= radius) return a;
  let result = mul(a, radius / size);
  while (norm(result) > radius) result = mul(result, 1 - 2 * Number.EPSILON);
  return result;
};

/** Geometry/timing are stated provisional reductions. Strength and traction
 * come from the same profile/supportParams used by the production World. */
export function newFiniteSupport(profile: PhysicalProfile, position: Vec2,
  options: { minimumSwingTime?: number; transferTime?: number; responseTime?: number } = {}): FiniteSupportBody {
  const sp = supportParams(profile), radius = baseRadiusAt(sp, .2);
  const slots = ([0, 1] as const).map(id => {
    const restOffset = { x: 0, y: (id === 0 ? -1 : 1) * radius };
    const point = add(position, restOffset);
    return { id, position: point, restOffset, mode: 'plant' as const, load: .5,
      target: { ...point }, elapsed: 0, duration: 0 };
  }) as [SupportSlot, SupportSlot];
  const result: FiniteSupportBody = { mass: profile.massKg, position: { ...position }, velocity: zero(), slots,
    reach: Math.min(.5 * profile.heightYd, comHeightAt(sp, .2)), traction: sp.traction,
    legForce: sp.pushForce, stepSpeed: sp.stepSpeed, mobility: sp.stepSpeed / sp.pushForce,
    minimumSwingTime: options.minimumSwingTime ?? .12, transferTime: options.transferTime ?? .12,
    responseTime: options.responseTime ?? .12, transfer: null, queued: null };
  validateBody(result);
  return result;
}

function validateBody(b: FiniteSupportBody): void {
  for (const value of [b.mass, b.reach, b.stepSpeed, b.mobility, b.minimumSwingTime, b.transferTime, b.responseTime])
    if (!(value > 0 && Number.isFinite(value))) throw new RangeError('Positive finite support parameters required');
  if (![b.traction, b.legForce].every(x => x >= 0 && Number.isFinite(x))) throw new RangeError('Finite nonnegative force required');
  if (![b.position.x, b.position.y, b.velocity.x, b.velocity.y].every(Number.isFinite)) throw new RangeError('Finite body state required');
  if (b.slots[0].id !== 0 || b.slots[1].id !== 1) throw new RangeError('Persistent slot identities required');
  for (const f of b.slots) {
    if (![f.position.x, f.position.y, f.restOffset.x, f.restOffset.y, f.target.x, f.target.y, f.elapsed, f.duration, f.load].every(Number.isFinite)
      || f.load < 0 || f.load > 1 || (f.mode === 'swing' && f.load !== 0)) throw new RangeError('Invalid foot/load state');
    if (norm(sub(f.position, b.position)) > b.reach + 1e-7) throw new RangeError('Initial foot lies outside finite reach');
  }
  if (Math.abs(b.slots[0].load + b.slots[1].load - 1) > 1e-9) throw new RangeError('Quasi-static loads must sum to one');
}

/** Only loaded contact contributes. Moving an unloaded candidate cannot
 * silently become a successful corrective step. */
export function loadedSupport(b: FiniteSupportBody): Vec2 | null {
  const loaded = b.slots.filter(f => f.mode === 'plant' && f.load > 0);
  const weight = loaded.reduce((s, f) => s + f.load, 0);
  return weight > 0 ? mul(loaded.reduce((p, f) => add(p, mul(f.position, f.load)), zero()), 1 / weight) : null;
}

/** Queue an attempted step, unload it first, then lift the same slot. The
 * requested target is made reachable; achieved positions are never clamped. */
export function requestSupportStep(b: FiniteSupportBody, slot: FootId, target: Vec2): void {
  if (![target.x, target.y].every(Number.isFinite)) throw new RangeError('Finite placement required');
  if (b.queued || b.slots.some(f => f.mode === 'swing')) throw new Error('A placement is already in progress');
  const other = (1 - slot) as FootId;
  b.queued = { slot, target: add(b.position, disk(sub(target, b.position), b.reach)) };
  b.transfer = other;
}

function beginSwing(b: FiniteSupportBody): void {
  if (!b.queued || b.slots[b.queued.slot].load > 1e-12) return;
  const f = b.slots[b.queued.slot];
  f.load = 0; f.mode = 'swing'; f.target = { ...b.queued.target }; f.elapsed = 0;
  f.duration = Math.max(b.minimumSwingTime, norm(sub(f.target, f.position)) / b.stepSpeed);
  b.queued = null; b.transfer = null;
}

function attachmentPoint(bs: FiniteSupportBody[], a: SupportAttachment): Vec2 {
  const b = bs[a.body];
  return add(b.position, mul(sub(b.slots[a.slot].position, b.position), a.share));
}

/** One physical interval. Caller freezes modes, normal-load shares and
 * actuator commands. Mean COM velocity, not endpoint velocity, is used in
 * every Jacobian and work product. Projection changes impulses before any
 * positions are integrated; there is no post-step reach/anchor teleport.
 */
export function solveSupportInterval(bs: FiniteSupportBody[], grips: SupportGrip[], dt: number,
  commands: Vec2[][], externalImpulses: Vec2[] = bs.map(zero),
  options: SupportSolveOptions = {}): SupportIntervalReport {
  if (!(dt > 0 && Number.isFinite(dt))) throw new RangeError('Positive finite interval required');
  bs.forEach(validateBody);
  if (commands.length !== bs.length || externalImpulses.length !== bs.length) throw new RangeError('One command/impulse set per body required');
  const maxIterations = options.maxIterations ?? 256, tolerance = options.tolerance ?? 1e-9;
  if (!(Number.isInteger(maxIterations) && maxIterations > 0 && Number.isFinite(tolerance) && tolerance > 0)) throw new RangeError('Invalid solver limits');
  for (const g of grips) for (const a of [g.a, g.b])
    if (!bs[a.body] || (a.slot !== 0 && a.slot !== 1) || !Number.isFinite(a.share) || a.share < 0 || a.share > 1)
      throw new RangeError('Invalid persistent grip attachment');
  if (grips.some(g => ![g.capacity, g.holdDistance, g.reach].every(x => x >= 0 && Number.isFinite(x)) || g.a.body === g.b.body))
    throw new RangeError('Invalid grip');
  for (let i = 0; i < bs.length; i++) if (commands[i].length !== 2 ||
    [...commands[i], externalImpulses[i]].some(v => ![v.x, v.y].every(Number.isFinite))) throw new RangeError('Finite two-slot commands required');
  const beforeSupport = bs.map(loadedSupport), initial = bs.map(b => ({ ...b.velocity }));
  const bodyP = externalImpulses.map(p => ({ ...p }));
  const slotP = bs.map(() => [zero(), zero()]), groundP = bs.map(() => [zero(), zero()]), reachP = bs.map(() => [zero(), zero()]);
  const commandFraction: number[] = [];
  const free = commands.map((cmd, i) => {
    const speed = cmd.reduce((sum, v) => sum + norm(v), 0);
    const demand = cmd.reduce((sum, v) => sum + norm(v) / bs[i].mobility, 0);
    const fraction = demand > 0 ? Math.min(1, bs[i].legForce / demand, bs[i].stepSpeed / speed) : 1;
    commandFraction.push(demand > 0 ? demand * fraction / Math.max(1e-30, bs[i].legForce) : 0);
    return cmd.map(v => mul(v, fraction));
  });
  const meanBody = (i: number): Vec2 => add(initial[i], mul(bodyP[i], .5 / bs[i].mass));
  const relative = (i: number, f: FootId): Vec2 => add(free[i][f], mul(slotP[i][f], bs[i].mobility / dt));
  const slotVelocity = (i: number, f: FootId): Vec2 => add(meanBody(i), relative(i, f));
  const pointVelocity = (a: SupportAttachment): Vec2 => add(meanBody(a.body), mul(relative(a.body, a.slot), a.share));
  const apply = (a: SupportAttachment, impulse: Vec2): void => {
    bodyP[a.body] = add(bodyP[a.body], impulse);
    slotP[a.body][a.slot] = add(slotP[a.body][a.slot], mul(impulse, a.share));
  };
  // Validate the whole set before allocation: a later invalid claim cannot
  // dilute an earlier valid grip merely because of array order.
  for (const g of grips) if (norm(sub(attachmentPoint(bs, g.b), attachmentPoint(bs, g.a))) > g.reach || g.capacity === 0) g.broken = true;
  const rows = grips.map(g => {
    const delta = sub(attachmentPoint(bs, g.b), attachmentPoint(bs, g.a)), distance = norm(delta);
    const n = distance > 1e-12 ? mul(delta, 1 / distance) : { x: 1, y: 0 };
    const sameOwner = grips.filter(o => !o.broken && o.a.body === g.a.body);
    const sum = sameOwner.reduce((s, o) => s + o.capacity, 0), strongest = Math.max(0, ...sameOwner.map(o => o.capacity));
    return { g, n, impulse: zero(), allowance: Math.max(0, g.holdDistance - distance) / dt,
      limit: g.capacity * Math.min(1, strongest / Math.max(1e-30, sum)) * dt,
      inverse: .5 / bs[g.a.body].mass + .5 / bs[g.b.body].mass
        + (g.a.share ** 2 * bs[g.a.body].mobility + g.b.share ** 2 * bs[g.b.body].mobility) / dt };
  });
  const gripCross = (first: typeof rows[number], second: typeof rows[number]): number => {
    let cross = 0;
    for (const [a, sa] of [[first.g.a, -1], [first.g.b, 1]] as const)
      for (const [b, sb] of [[second.g.a, -1], [second.g.b, 1]] as const) if (a.body === b.body)
        cross += sa * sb * (.5 / bs[a.body].mass + (a.slot === b.slot ? a.share * b.share * bs[a.body].mobility / dt : 0));
    return cross;
  };
  let iterations = 0, maxChange = Infinity, coupledUpdates = 0, gripPairUpdates = 0;
  for (; iterations < maxIterations; iterations++) {
    maxChange = 0;
    for (let i = 0; i < bs.length; i++) for (const f of bs[i].slots) {
      if (f.mode !== 'plant') continue;
      const inverse = .5 / bs[i].mass + bs[i].mobility / dt;
      const wanted = sub(groundP[i][f.id], mul(slotVelocity(i, f.id), 1 / inverse));
      const next = disk(wanted, bs[i].traction * f.load * dt), change = sub(next, groundP[i][f.id]);
      maxChange = Math.max(maxChange, norm(change)); groundP[i][f.id] = next;
      apply({ body: i, slot: f.id, share: 1 }, change);
    }
    for (const row of rows) {
      if (row.g.broken) continue;
      const rv = sub(pointVelocity(row.g.b), pointVelocity(row.g.a));
      let wanted = sub(row.impulse, mul(sub(rv, mul(row.n, row.allowance)), 1 / row.inverse));
      const compression = Math.max(0, dot(wanted, row.n));
      wanted = sub(wanted, mul(row.n, compression));
      const next = disk(wanted, row.limit), change = sub(next, row.impulse);
      maxChange = Math.max(maxChange, norm(change)); row.impulse = next;
      apply(row.g.a, mul(change, -1)); apply(row.g.b, change);
    }
    // A held plant shares almost the same compliant coordinate with its
    // grip. Solve that pair together where its active set is known. This
    // is a local 2x2 midpoint Jacobian solve, not extra force or resolution.
    // Other active sets stay with projected row iteration.
    if (options.coupledUpdates !== false) for (const row of rows) {
      if (row.g.broken) continue;
      for (const [attachment, sign] of [[row.g.a, -1], [row.g.b, 1]] as const) {
        const i = attachment.body, f = bs[i].slots[attachment.slot];
        if (f.mode !== 'plant' || f.load === 0) continue;
        const a = .5 / bs[i].mass + bs[i].mobility / dt;
        const c = sign * (.5 / bs[i].mass + attachment.share * bs[i].mobility / dt);
        const determinant = a * row.inverse - c * c;
        if (determinant <= 1e-12 * a * row.inverse) continue; // redundant pair
        const vg = slotVelocity(i, f.id);
        const vr = sub(sub(pointVelocity(row.g.b), pointVelocity(row.g.a)), mul(row.n, row.allowance));
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
    // Distinct grips on the same moving limb cannot be merged: their
    // shares give different Jacobians. Solve strongly coupled grip pairs
    // in their actual coordinates, preserving both force disks.
    if (options.coupledUpdates !== false) for (let k = 0; k < rows.length; k++) for (let l = k + 1; l < rows.length; l++) {
      const first = rows[k], second = rows[l];
      if (first.g.broken || second.g.broken) continue;
      const a = first.inverse, b = second.inverse, c = gripCross(first, second);
      if (c * c < .5 * a * b || a * b - c * c <= 1e-12 * a * b) continue;
      const rv = (r: typeof first) => sub(sub(pointVelocity(r.g.b), pointVelocity(r.g.a)), mul(r.n, r.allowance));
      const freeA = sub(sub(rv(first), mul(first.impulse, a)), mul(second.impulse, c));
      const freeB = sub(sub(rv(second), mul(second.impulse, b)), mul(first.impulse, c));
      const fullAt = (betaA: number, betaB: number) => {
        const aa = a + betaA, bb = b + betaB, determinant = aa * bb - c * c;
        return [mul(sub(mul(freeB, c), mul(freeA, bb)), 1 / determinant),
          mul(sub(mul(freeA, c), mul(freeB, aa)), 1 / determinant)];
      };
      let candidate = fullAt(0, 0);
      // Exact single-active-disk blocks. A two-active-disk set stays with
      // the outer projected solve unless the tangent box solve applies.
      for (const index of [0, 1]) if (norm(candidate[index]) > (index === 0 ? first.limit : second.limit)) {
        const limit = index === 0 ? first.limit : second.limit;
        const at = (beta: number) => index === 0 ? fullAt(beta, 0) : fullAt(0, beta);
        let lo = 0, hi = index === 0 ? a : b;
        while (norm(at(hi)[index]) > limit) hi *= 2;
        for (let j = 0; j < 60; j++) {
          const mid = .5 * (lo + hi);
          if (norm(at(mid)[index]) > limit) lo = mid; else hi = mid;
        }
        candidate = at(hi);
        break;
      }
      let ja = disk(candidate[0], first.limit), jb = disk(candidate[1], second.limit);
      let feasible = norm(candidate[0]) <= first.limit && norm(candidate[1]) <= second.limit
        && dot(ja, first.n) <= 1e-12 && dot(jb, second.n) <= 1e-12;
      if (!feasible) {
        const ta = { x: -first.n.y, y: first.n.x }, tb = { x: -second.n.y, y: second.n.x };
        const cross = c * dot(ta, tb), determinant = a * b - cross * cross;
        const ga = dot(freeA, ta), gb = dot(freeB, tb);
        const candidates: number[][] = [];
        const unconstrained = [(cross * gb - b * ga) / determinant, (cross * ga - a * gb) / determinant];
        if (Math.abs(unconstrained[0]) <= first.limit && Math.abs(unconstrained[1]) <= second.limit) candidates.push(unconstrained);
        const clip = (x: number, cap: number) => Math.max(-cap, Math.min(cap, x));
        for (const z of [-first.limit, first.limit]) candidates.push([z, clip(-(gb + cross * z) / b, second.limit)]);
        for (const z of [-second.limit, second.limit]) candidates.push([clip(-(ga + cross * z) / a, first.limit), z]);
        const cost = ([x, y]: number[]) => .5 * (a * x * x + b * y * y) + cross * x * y + ga * x + gb * y;
        const best = candidates.reduce((best, next) => cost(next) < cost(best) ? next : best);
        ja = disk(mul(ta, best[0]), first.limit); jb = disk(mul(tb, best[1]), second.limit);
        feasible = dot(add(freeA, add(mul(ja, a), mul(jb, c))), first.n) <= 1e-12
          && dot(add(freeB, add(mul(jb, b), mul(ja, c))), second.n) <= 1e-12;
      }
      if (!feasible) continue;
      const da = sub(ja, first.impulse), db = sub(jb, second.impulse);
      first.impulse = ja; second.impulse = jb;
      apply(first.g.a, mul(da, -1)); apply(first.g.b, da);
      apply(second.g.a, mul(db, -1)); apply(second.g.b, db);
      maxChange = Math.max(maxChange, norm(da), norm(db)); coupledUpdates++; gripPairUpdates++;
    }
    for (let i = 0; i < bs.length; i++) for (const f of bs[i].slots) {
      // Exact disk proximal reaction in the massless relative coordinate.
      // This is an internal geometric constraint, not another strength bonus.
      const withoutOwn = sub(slotP[i][f.id], reachP[i][f.id]);
      const u = add(free[i][f.id], mul(withoutOwn, bs[i].mobility / dt));
      const rFree = add(sub(f.position, bs[i].position), mul(u, dt));
      const next = mul(sub(disk(rFree, bs[i].reach), rFree), 1 / bs[i].mobility);
      const change = sub(next, reachP[i][f.id]);
      maxChange = Math.max(maxChange, norm(change)); reachP[i][f.id] = next;
      slotP[i][f.id] = add(slotP[i][f.id], change);
    }
    if (maxChange <= tolerance) { iterations++; break; }
  }
  const motorByBody = bs.map(() => 0), groundImpulse = bs.map(zero), velocities = bs.map(() => [zero(), zero()]);
  let groundWork = 0, gripWork = 0, reachWork = 0, externalWork = 0, maxPassiveWork = 0;
  for (const row of rows) if (!row.g.broken) {
    const work = dot(row.impulse, sub(pointVelocity(row.g.b), pointVelocity(row.g.a)));
    gripWork += work; maxPassiveWork = Math.max(maxPassiveWork, work);
  }
  for (let i = 0; i < bs.length; i++) {
    externalWork += dot(externalImpulses[i], meanBody(i));
    for (const f of bs[i].slots) {
      const u = relative(i, f.id), v = slotVelocity(i, f.id);
      velocities[i][f.id] = v;
      motorByBody[i] -= dot(slotP[i][f.id], u);
      groundImpulse[i] = add(groundImpulse[i], groundP[i][f.id]);
      const gw = dot(groundP[i][f.id], v), rw = dot(reachP[i][f.id], u);
      groundWork += gw; reachWork += rw; maxPassiveWork = Math.max(maxPassiveWork, gw, rw);
    }
  }
  const energyBefore = bs.reduce((s, b, i) => s + .5 * b.mass * dot(initial[i], initial[i]), 0);
  for (let i = 0; i < bs.length; i++) {
    const mean = meanBody(i);
    bs[i].position = add(bs[i].position, mul(mean, dt));
    bs[i].velocity = add(initial[i], mul(bodyP[i], 1 / bs[i].mass));
    for (const f of bs[i].slots) f.position = add(f.position, mul(velocities[i][f.id], dt));
  }
  const energyAfter = bs.reduce((s, b) => s + .5 * b.mass * dot(b.velocity, b.velocity), 0);
  const motorWork = motorByBody.reduce((s, w) => s + w, 0);
  const momentumResidual = bs.reduce((p, b, i) => sub(add(p, mul(sub(b.velocity, initial[i]), b.mass)),
    add(externalImpulses[i], groundImpulse[i])), zero());
  const maxReachViolation = Math.max(0, ...bs.flatMap(b => b.slots.map(f => norm(sub(f.position, b.position)) - b.reach)));
  return { dt, iterations, coupledUpdates, gripPairUpdates, converged: maxChange <= tolerance && maxReachViolation <= 1e-7 && maxPassiveWork <= 1e-7,
    maxImpulseChange: maxChange, groundImpulse, groundWork, gripWork, reachWork, motorWork, externalWork,
    energyBefore, energyAfter, workResidual: energyAfter - energyBefore - motorWork - gripWork - groundWork - reachWork - externalWork,
    momentumResidual, motorWorkByBody: motorByBody, motorWorkLimit: bs.map(b => b.legForce * b.stepSpeed * dt),
    commandFraction, tractionFraction: bs.map((b, i) => groundP[i].reduce((s, p) => s + norm(p), 0) / Math.max(1e-30, b.traction * dt)),
    maxReachViolation, maxPassiveWork, maxStiffnessRatio: Math.max(0, ...bs.map(b => dt / (2 * b.mass * b.mobility))),
    slotImpulse: slotP, slotGroundImpulse: groundP, slotReachImpulse: reachP, slotMeanVelocity: velocities,
    normalShares: bs.map(b => b.slots.map(f => f.load)),
    loadedSupportBefore: beforeSupport, loadedSupportAfter: bs.map(loadedSupport) };
}

/** A failed candidate is not a valid continuation state. Includes the
 * diagnostic report so callers can reject/retry from their own snapshot. */
export class SupportSolveError extends Error {
  constructor(readonly report: SupportIntervalReport) {
    super('Unconverged support interval; reject its state before continuing the lifecycle');
    this.name = 'SupportSolveError';
  }
}

/** Minimal placement controller/phase driver for low-speed mechanical labs.
 * Transfer/lift/stroke boundaries split locally. On completion the flat
 * model assumes ground contact where the foot actually reached, recording
 * target error instead of crediting the intended location. There is no z
 * coordinate to establish whether a foot is suspended above the turf.
 * The force solve freezes interval-average quasi-static normal shares.
 * This is not a calibrated NFL running gait or a full balance controller.
 */
export function stepFiniteSupport(bs: FiniteSupportBody[], grips: SupportGrip[], dt: number,
  options: SupportSolveOptions = {}): SupportIntervalReport[] {
  const snapshots = bs.map(b => structuredClone(b));
  const broken = grips.map(g => g.broken);
  try { return advanceFiniteSupport(bs, grips, dt, options); }
  catch (error) {
    // A diagnostic candidate may be mutated, but a failed phase-driver tick
    // never leaves half-transferred loads or a false plant in caller state.
    // Preserve body/slot identity used by attachments and lab observers.
    bs.forEach((b, i) => {
      const slots = b.slots;
      slots.forEach((f, j) => {
        Object.assign(f, snapshots[i].slots[j]);
        if (!snapshots[i].slots[j].placement) delete f.placement;
      });
      Object.assign(b, snapshots[i], { slots });
    });
    grips.forEach((g, i) => { if (broken[i] === undefined) delete g.broken; else g.broken = broken[i]; });
    throw error;
  }
}

function advanceFiniteSupport(bs: FiniteSupportBody[], grips: SupportGrip[], dt: number,
  options: SupportSolveOptions): SupportIntervalReport[] {
  if (!(dt > 0 && Number.isFinite(dt))) throw new RangeError('Positive finite tick required');
  bs.forEach(validateBody);
  let left = dt;
  const reports: SupportIntervalReport[] = [];
  while (left > 1e-12) {
    bs.forEach(beginSwing);
    let h = left;
    for (const b of bs) {
      if (b.transfer !== null) h = Math.min(h, (1 - b.slots[b.transfer].load) * b.transferTime);
      for (const f of b.slots) if (f.mode === 'swing' && f.elapsed < f.duration - 1e-12)
        h = Math.min(h, f.duration - f.elapsed);
    }
    if (h <= 1e-12) {
      for (const b of bs) if (b.transfer !== null && b.slots[b.transfer].load >= 1 - 1e-12) {
        b.slots[b.transfer].load = 1; b.slots[(1 - b.transfer) as FootId].load = 0; b.transfer = null;
      }
      continue;
    }
    const supportBefore = bs.map(loadedSupport);
    const finalLoads = bs.map(b => {
      const loads = b.slots.map(f => f.load);
      if (b.transfer !== null) { loads[b.transfer] = Math.min(1, loads[b.transfer] + h / b.transferTime); loads[1 - b.transfer] = 1 - loads[b.transfer]; }
      return loads;
    });
    const commands = bs.map((b, i) => b.slots.map(f => {
      f.load = .5 * (f.load + finalLoads[i][f.id]);
      if (f.mode === 'plant') return mul(sub(f.restOffset, sub(f.position, b.position)), 1 / b.responseTime);
      const world = mul(sub(f.target, f.position), 1 / Math.max(h, f.duration - f.elapsed));
      return sub(world, b.velocity);
    }));
    const report = solveSupportInterval(bs, grips, h, commands, undefined, options);
    reports.push(report);
    if (!report.converged) throw new SupportSolveError(report);
    report.loadedSupportBefore = supportBefore;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      b.slots.forEach(f => { f.load = finalLoads[i][f.id]; });
      if (b.transfer !== null && b.slots[b.transfer].load >= 1 - 1e-12) b.transfer = null;
      for (const f of b.slots) if (f.mode === 'swing') {
        f.elapsed += h;
        if (f.elapsed >= f.duration - 1e-12) {
          f.placement = { actual: { ...f.position }, target: { ...f.target }, miss: sub(f.position, f.target) };
          f.mode = 'plant'; f.restOffset = sub(f.position, b.position); b.transfer = f.id;
        }
      }
    }
    report.loadedSupportAfter = bs.map(loadedSupport);
    left -= h;
  }
  return reports;
}
