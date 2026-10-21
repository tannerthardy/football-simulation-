/** Standalone ordered 1D material-point research model. Units kg, yd, s.
 * Springs persist through flight/contact; neither geometry nor energy is reset.
 * No tilt, soles, horizontal friction, gait controller, or World selection. */
export interface VerticalPoint { position: number; velocity: number }
export interface VerticalFoot extends VerticalPoint { id: 0 | 1 }
import { axialLegPotential, axialLegForce, axialLegDiscreteForce, axialLegChangingRestForce, axialLegDamping, validateAxialLeg, type AxialLegCompliance } from './leg-compliance.js';
export type VerticalLeg = AxialLegCompliance;
export interface VerticalSeries { drag: number; rateCap: number; minLength: number; maxLength: number }
export interface VerticalSupportState {
  series?: [VerticalSeries, VerticalSeries];
  torsoMass: number; footMass: [number, number]; torso: VerticalPoint;
  actuator: { forceCap: number; powerCap: number };
  feet: [VerticalFoot, VerticalFoot]; gravity: number; legs: [VerticalLeg, VerticalLeg];
}
export interface VerticalSupportOptions {
  motorForces?: [number, number]; restForces?: [number, number]; externalForces?: [number, number, number];
  maxInterval?: number; maxSegments?: number; tolerance?: number;
}
export interface VerticalSupportSegment {
  kind: 'interval' | 'impact'; dt: number; before: VerticalSupportState; after: VerticalSupportState;
  springForce: [number, number]; dampingForce: [number, number]; motorImpulse: [number, number];
  normalImpulse: [number, number]; externalImpulse: [number, number, number];
  motorWork: [number, number]; dampingWork: number; groundWork: number; impactWork: number;
  externalWork: number;
  restForces: [number, number]; restRates: [number, number]; restRateBounds: [{ min: number; max: number }, { min: number; max: number }];
  restMotorWork: [number, number]; seriesDragWork: [number, number]; seriesLimitWork: [number, number]; restBoundWork: [number, number];
}
export interface VerticalSupportReport {
  accepted: boolean; reason: string | null; dt: number; advancedTime: number;
  energyBefore: number; energyAfter: number; kineticEnergy: number; gravityEnergy: number; springEnergy: number;
  /** Energy/state above describe the attempted candidate on rejection;
   * returned state is the unchanged input. */
  candidateState: VerticalSupportState;
  restMotorWork: [number, number]; seriesDragWork: [number, number]; seriesLimitWork: [number, number]; restBoundWork: [number, number];
  restBoundSplits: number;
  appliedRestForces: [number, number]; requestedRestForces: [number, number];
  motorWork: number; slotMotorWork: [number, number]; positiveMotorWork: number;
  externalWork: number; dampingWork: number; groundWork: number; impactWork: number;
  workResidual: number; momentumResidual: number; normalImpulse: [number, number];
  segments: VerticalSupportSegment[];
  appliedMotorForces: [number, number]; requestedMotorForces: [number, number]; sharedForceCap: number; sharedPowerCap: number;
}
const clone = (s: VerticalSupportState): VerticalSupportState => ({ ...s, ...(s.series ? { series: [{ ...s.series[0] }, { ...s.series[1] }] as [VerticalSeries, VerticalSeries] } : {}), actuator: { ...s.actuator }, footMass: [...s.footMass], torso: { ...s.torso },
  feet: [{ ...s.feet[0] }, { ...s.feet[1] }], legs: [{ ...s.legs[0] }, { ...s.legs[1] }] });
function validate(s: VerticalSupportState): void {
  if (![s.torsoMass, ...s.footMass, s.gravity].every(x => Number.isFinite(x) && x > 0)
    || s.feet[0].id !== 0 || s.feet[1].id !== 1) throw new RangeError('Positive finite material masses/gravity and stable foot IDs required');
  if (![s.actuator.forceCap, s.actuator.powerCap].every(x => Number.isFinite(x) && x >= 0)) throw new RangeError('Explicit nonnegative actuator force/power caps required');
  for (const p of [s.torso, ...s.feet]) if (![p.position, p.velocity].every(Number.isFinite)) throw new RangeError('Finite material state required');
  for (const f of s.feet) if (f.position < 0 || s.torso.position <= f.position) throw new RangeError('Nonpenetrating ordered torso/foot geometry required');
  for (const l of s.legs) validateAxialLeg(l);
  if (s.series) for (let i = 0; i < 2; i++) {
    const a = s.series[i];
    if (!(a.drag > 0 && a.rateCap >= 0 && a.minLength > 0 && a.maxLength >= a.minLength)
      || ![a.drag, a.rateCap, a.minLength, a.maxLength].every(Number.isFinite)
      || s.legs[i].restLength < a.minLength || s.legs[i].restLength > a.maxLength) throw new RangeError('Finite feasible series material configuration required');
  }
}
export function newVerticalSupport(config: VerticalSupportState): VerticalSupportState { validate(config); return clone(config); }
export function verticalSupportEnergy(s: VerticalSupportState): { kinetic: number; gravity: number; spring: number; total: number } {
  const points = [s.torso, ...s.feet], masses = [s.torsoMass, ...s.footMass];
  const kinetic = points.reduce((sum, p, i) => sum + .5 * masses[i] * p.velocity ** 2, 0);
  const gravity = points.reduce((sum, p, i) => sum + s.gravity * masses[i] * p.position, 0);
  const spring = s.legs.reduce((sum, l, i) => sum + axialLegPotential(s.torso.position - s.feet[i].position, l), 0);
  return { kinetic, gravity, spring, total: kinetic + gravity + spring };
}
function linearSolve(a: number[][], rhs: number[]): number[] | null {
  const m = a.map((r, i) => [...r, rhs[i]]), n = rhs.length;
  for (let i = 0; i < n; i++) {
    let p = i; for (let j = i + 1; j < n; j++) if (Math.abs(m[j][i]) > Math.abs(m[p][i])) p = j;
    if (!(Math.abs(m[p][i]) > 1e-20)) return null;
    [m[i], m[p]] = [m[p], m[i]];
    const d = m[i][i]; for (let k = i; k <= n; k++) m[i][k] /= d;
    for (let j = 0; j < n; j++) if (j !== i) { const c = m[j][i]; for (let k = i; k <= n; k++) m[j][k] -= c * m[i][k]; }
  }
  return m.map(r => r[n]);
}
function requiredNormal(s: VerticalSupportState, i: number, motors: [number, number], external: [number, number, number]): number {
  const length = s.torso.position - s.feet[i].position, rate = s.torso.velocity - s.feet[i].velocity;
  return s.footMass[i] * s.gravity + axialLegForce(length, s.legs[i]) + axialLegDamping(rate, s.legs[i]) - motors[i] - external[i + 1];
}
function normalRateAtRest(s: VerticalSupportState, i: number, motors: [number, number], external: [number, number, number], restForces: [number, number]): number {
  const forces = s.legs.map((leg, j) => axialLegForce(s.torso.position - s.feet[j].position, leg)
    + axialLegDamping(s.torso.velocity - s.feet[j].velocity, leg) - motors[j]);
  const acceleration = (external[0] - s.torsoMass * s.gravity + forces[0] + forces[1]) / s.torsoMass;
  const leg = s.legs[i], q = leg.restLength - (s.torso.position - s.feet[i].position);
  const stiffness = q > 0 && q <= leg.forceCap / leg.stiffness ? leg.stiffness : 0;
  const damping = Math.abs(leg.damping * s.torso.velocity) < leg.dampingCap ? leg.damping : 0;
  const series = s.series?.[i], spring = axialLegForce(s.torso.position - s.feet[i].position, leg);
  const restRate = series ? Math.max(s.legs[i].restLength <= series.minLength ? 0 : -series.rateCap,
    Math.min(s.legs[i].restLength >= series.maxLength ? 0 : series.rateCap, (restForces[i] - spring) / series.drag)) : 0;
  return stiffness * (restRate - s.torso.velocity) - damping * acceleration;
}
function heldRestSide(s: VerticalSupportState, i: number, u: number, tolerance: number): number {
  if (!s.series) return 0;
  const leg = s.legs[i], a = s.series[i], side = leg.restLength === a.minLength ? 1 : leg.restLength === a.maxLength ? -1 : 0;
  if (!side) return 0;
  const force = axialLegForce(s.torso.position - s.feet[i].position, leg), reaction = side * (force - u);
  if (reaction > tolerance) return side;
  if (reaction < -tolerance) return 0;
  const q = leg.restLength - (s.torso.position - s.feet[i].position);
  const stiffness = q > 0 && q <= leg.forceCap / leg.stiffness ? leg.stiffness : 0;
  return -side * stiffness * (s.torso.velocity - s.feet[i].velocity) >= 0 ? side : 0;
}
function interval(s: VerticalSupportState, h: number, motors: [number, number], restForces: [number, number], external: [number, number, number], tol: number, requiredMask = 0, allowSignedNormals = false): VerticalSupportSegment | null {
  const z = [s.torso.position, ...s.feet.map(f => f.position)], v = [s.torso.velocity, ...s.feet.map(f => f.velocity)], mass = [s.torsoMass, ...s.footMass];
  const resting = s.feet.map((f, i) => f.position === 0 && Math.abs(f.velocity) <= tol && (requiredNormal(s, i, motors, external) > tol || (requiredNormal(s, i, motors, external) >= -tol && normalRateAtRest(s, i, motors, external, restForces) >= 0)));
  for (let mask = 0; mask < 4; mask++) {
    if ((mask & requiredMask) !== requiredMask) continue;
    if (resting.some((r, i) => !r && (mask & (1 << i)))) continue;
    const heldRest = s.legs.map((_, i) => heldRestSide(s, i, restForces[i], tol) !== 0);
    const fixed = [false, !!(mask & 1), !!(mask & 2)], free = [0, 1, 2].filter(i => !fixed[i]);
    if (s.series) for (let i = 0; i < 2; i++) if (!heldRest[i]) free.push(i + 3);
    let end = [...v.map((value, i) => fixed[i] ? 0 : value), 0, 0];
    const evaluate = (mean: number[]) => {
      const x = mean.slice(0, 3).map((velocity, i) => z[i] + h * velocity);
      if (x[0] <= x[1] || x[0] <= x[2]) throw new RangeError('Ordered torso/foot geometry requires a shorter physical interval');
      const rest = s.legs.map((l, i) => l.restLength + h * mean[i + 3]);
      const spring = s.legs.map((l, i) => s.series ? axialLegChangingRestForce(z[0] - z[i + 1], x[0] - x[i + 1], l, rest[i])
        : axialLegDiscreteForce(z[0] - z[i + 1], x[0] - x[i + 1], l));
      const bounds = s.legs.map((l, i) => ({ min: s.series ? (l.restLength <= s.series[i].minLength ? 0 : -s.series[i].rateCap) : 0,
        max: s.series ? (l.restLength >= s.series[i].maxLength ? 0 : s.series[i].rateCap) : 0 }));
      const damp = s.legs.map((l, i) => axialLegDamping(mean[0] - mean[i + 1], l));
      const force = mass.map((m, i) => external[i] - m * s.gravity);
      for (let i = 0; i < 2; i++) { const f = spring[i] + damp[i] - motors[i]; force[0] += f; force[i + 1] -= f; }
      const r = mass.map((m, i) => m * (mean[i] - v[i]) - .5 * h * force[i]);
      if (s.series) for (let i = 0; i < 2; i++) {
        const target = heldRest[i] ? 0 : Math.max(bounds[i].min, Math.min(bounds[i].max, (restForces[i] - spring[i]) / s.series[i].drag));
        r.push(.5 * h * s.series[i].drag * (mean[i + 3] - target));
      }
      return { mean, position: x, rest, bounds, spring, damp, r };
    };
    let solved = false;
    for (let k = 0; k < 60; k++) {
      const ev = evaluate(end), norm = Math.max(...free.map(i => Math.abs(ev.r[i])));
      if (norm <= tol) { solved = true; break; }
      const jac = free.map(() => free.map(() => 0));
      free.forEach((j, col) => {
        const eps = 1e-6 * Math.max(1, Math.abs(end[j])), plus = [...end], minus = [...end]; plus[j] += eps; minus[j] -= eps;
        const rp = evaluate(plus).r, rm = evaluate(minus).r;
        free.forEach((i, row) => { jac[row][col] = (rp[i] - rm[i]) / (2 * eps); });
      });
      const delta = linearSolve(jac, free.map(i => -ev.r[i])); if (!delta) break;
      let scale = 1, next = [...end];
      while (scale >= 1 / 1024) {
        next = [...end]; free.forEach((i, j) => { next[i] += scale * delta[j]; });
        if (Math.max(...free.map(i => Math.abs(evaluate(next).r[i]))) < norm) break;
        scale *= .5;
      }
      end = next;
    }
    if (!solved) continue;
    let ev = evaluate(end);
    if (s.series) {
      for (let i = 0; i < 2; i++) {
        end[i + 3] = Math.max(ev.bounds[i].min, Math.min(ev.bounds[i].max, end[i + 3]));

      }
      ev = evaluate(end);
      if (Math.max(...free.map(i => Math.abs(ev.r[i]))) > 4 * tol) continue;
    }
    const normal = [fixed[1] ? 2 * ev.r[1] : 0, fixed[2] ? 2 * ev.r[2] : 0] as [number, number];
    if ((!allowSignedNormals && normal.some(n => n < 0)) || resting.some((r, i) => r && !fixed[i + 1] && ev.position[i + 1] < 0)) continue;
    const after = clone(s); after.torso = { position: ev.position[0], velocity: 2 * ev.mean[0] - v[0] };
    for (let i = 0; i < 2; i++) after.feet[i] = { id: s.feet[i].id, position: ev.position[i + 1], velocity: 2 * ev.mean[i + 1] - v[i + 1] };
    if (s.series) after.legs.forEach((l, i) => { l.restLength = ev.rest[i]; });
    const motorWork = motors.map((f, i) => h * f * (ev.mean[i + 1] - ev.mean[0])) as [number, number];
    return { kind: 'interval', dt: h, before: clone(s), after, springForce: ev.spring as [number, number], dampingForce: ev.damp as [number, number],
      motorImpulse: motors.map(f => h * f) as [number, number], normalImpulse: normal,
      externalImpulse: external.map(f => h * f) as [number, number, number], motorWork,
      dampingWork: ev.damp.reduce((sum, f, i) => sum + h * f * (ev.mean[0] - ev.mean[i + 1]), 0),
      groundWork: normal.reduce((sum, n, i) => sum + n * ev.mean[i + 1], 0), impactWork: 0,
      externalWork: external.reduce((sum, f, i) => sum + h * f * ev.mean[i], 0),
      restForces: [...restForces], restRates: [ev.mean[3], ev.mean[4]], restRateBounds: ev.bounds as [{ min: number; max: number }, { min: number; max: number }],
      restMotorWork: restForces.map((u, i) => h * u * ev.mean[i + 3]) as [number, number],
      seriesDragWork: s.legs.map((_, i) => s.series ? -h * s.series[i].drag * ev.mean[i + 3] ** 2 : 0) as [number, number],
      seriesLimitWork: s.legs.map((_, i) => {
        if (!s.series) return 0;
        const desired = (restForces[i] - ev.spring[i]) / s.series[i].drag;
        // An interior row has no physical limit reaction. Keep numerical
        // force residual in the work residual rather than inventing a
        // passive limit channel to absorb it.
        if (desired >= ev.bounds[i].min && desired <= ev.bounds[i].max) return 0;
        return -h * (restForces[i] - ev.spring[i] - s.series[i].drag * ev.mean[i + 3]) * ev.mean[i + 3];
      }) as [number, number], restBoundWork: [0, 0] };
  }
  return null;
}
export function advanceVerticalSupport(input: VerticalSupportState, dt: number, options: VerticalSupportOptions = {}):
  { state: VerticalSupportState; report: VerticalSupportReport } {
  validate(input);
  const tolerance = options.tolerance ?? 1e-10, maxInterval = options.maxInterval ?? dt, maxSegments = options.maxSegments ?? 256;
  if (!(Number.isFinite(dt) && dt > 0 && Number.isFinite(maxInterval) && maxInterval > 0 && tolerance > 0 && Number.isFinite(tolerance))
    || !Number.isInteger(maxSegments) || maxSegments < 1) throw new RangeError('Finite positive interval/options required');
  const requested = options.motorForces ?? [0, 0], requestedRest = options.restForces ?? [0, 0], external = options.externalForces ?? [0, 0, 0];
  if (requested.length !== 2 || requestedRest.length !== 2 || external.length !== 3 || ![...requested, ...requestedRest, ...external].every(Number.isFinite)) throw new RangeError('Finite two-leg and three-material-point forces required');
  if (!input.series && requestedRest.some(u => u !== 0)) throw new RangeError('Rest forces require an explicit series actuator');
  const forceScale = Math.min(1, input.actuator.forceCap / Math.max(1e-300, Math.abs(requested[0]) + Math.abs(requested[1]) + Math.abs(requestedRest[0]) + Math.abs(requestedRest[1])));
  const motors = requested.map(f => f * forceScale) as [number, number], restForces = requestedRest.map(f => f * forceScale) as [number, number];
  let restBoundSplits = 0;
  let state = clone(input), time = 0, reason: string | null = null;
  const segments: VerticalSupportSegment[] = [];
  const beforeEnergy = verticalSupportEnergy(input);
  try {
    while (time < dt) {
      if (segments.length >= maxSegments) throw new Error('Contact/interval segment limit');
      const impacting = state.feet.map(f => f.position === 0 && f.velocity < 0);
      if (impacting.some(Boolean)) {
        const after = clone(state), normal = state.feet.map((f, i) => impacting[i] ? -state.footMass[i] * f.velocity : 0) as [number, number];
        after.feet.forEach((f, i) => { if (impacting[i]) f.velocity = 0; });
        const loss = state.feet.reduce((sum, f, i) => sum - (impacting[i] ? .5 * state.footMass[i] * f.velocity ** 2 : 0), 0);
        segments.push({ kind: 'impact', dt: 0, before: clone(state), after: clone(after), normalImpulse: normal,
          springForce: [0, 0], dampingForce: [0, 0], motorImpulse: [0, 0], externalImpulse: [0, 0, 0],
          motorWork: [0, 0], restForces: [0, 0], restRates: [0, 0], restRateBounds: [{ min: 0, max: 0 }, { min: 0, max: 0 }], restMotorWork: [0, 0], seriesDragWork: [0, 0], seriesLimitWork: [0, 0], restBoundWork: [0, 0], dampingWork: 0, externalWork: 0, groundWork: 0, impactWork: loss });
        state = after; continue;
      }
      const supportedMask = state.feet.reduce((mask, f, i) => mask | (f.position === 0 && f.velocity === 0 && requiredNormal(state, i, motors, external) > tolerance ? 1 << i : 0), 0);
      let h = Math.min(maxInterval, dt - time), next: VerticalSupportSegment | null = null;
      // A ballistic Newton seed can cross the ordered hip domain even when
      // a smaller physical interval has a valid solution. Retry locally.
      for (let k = 0; k < 40; k++) {
        try { next = interval(state, h, motors, restForces, external, tolerance, supportedMask, true); } catch (error) {
          if (!(error instanceof RangeError)) throw error;
        }
        if (next && !state.feet.some((f, i) => f.position === 0 && next!.after.feet[i].position < 0)) break;
        next = null;
        h *= .5;
      }
      if (!next) throw new Error('Nonlinear/contact solve did not converge');
      for (let retry = 0; retry < 48; retry++) {
        const unsafeRest = state.series && state.legs.some((leg, i) => {
          const a = state.series![i], length = state.torso.position - state.feet[i].position;
          const spring = axialLegForce(length, leg), legRate = state.torso.velocity - state.feet[i].velocity;
          const torsoBound = state.gravity + (state.legs.reduce((sum, l) => sum + l.forceCap + l.dampingCap, 0)
            + Math.abs(motors[0]) + Math.abs(motors[1]) + Math.abs(external[0])) / state.torsoMass;
          const footBound = state.gravity + (leg.forceCap + leg.dampingCap + Math.abs(motors[i]) + Math.abs(external[i + 1])) / state.footMass[i];
          const relativeBound = torsoBound + footBound;
          const side = heldRestSide(state, i, restForces[i], tolerance);
          if (side) {
            const reaction = side * (spring - restForces[i]);
            const endReaction = side * (axialLegForce(next!.after.torso.position - next!.after.feet[i].position, next!.after.legs[i]) - restForces[i]);
            if (endReaction < 0 && side * legRate - h * relativeBound > 0) return false;
            const derivative = leg.stiffness * (Math.abs(legRate) + h * relativeBound);
            // Exactly stationary equilibrium has no hidden shaft release.
            if (state.torso.velocity === 0 && state.feet.every(f => f.velocity === 0)
              && next!.after.torso.position === state.torso.position && next!.after.feet.every((f, j) => f.position === state.feet[j].position)) return false;
            return reaction - h * derivative < 0;
          }
          const rate = Math.max(leg.restLength === a.minLength ? 0 : -a.rateCap,
            Math.min(leg.restLength === a.maxLength ? 0 : a.rateCap, (restForces[i] - spring) / a.drag));
          let acceleration = leg.stiffness / a.drag * (a.rateCap + Math.abs(legRate) + h * relativeBound);
          if (h * leg.stiffness < a.drag) acceleration = Math.min(acceleration,
            leg.stiffness / a.drag * (Math.abs(rate) + Math.abs(legRate) + h * relativeBound) / (1 - h * leg.stiffness / a.drag));
          const lower = leg.restLength + h * rate - .5 * h * h * acceleration;
          const upper = leg.restLength + h * rate + .5 * h * h * acceleration;
          const endpoint = next!.after.legs[i].restLength;
          if (endpoint < a.minLength && rate + h * acceleration < 0) return false;
          if (endpoint > a.maxLength && rate - h * acceleration > 0) return false;
          const leavesLower = leg.restLength === a.minLength && rate === 0 && legRate - h * relativeBound > h * acceleration;
          const leavesUpper = leg.restLength === a.maxLength && rate === 0 && legRate + h * relativeBound < -h * acceleration;
          return (!leavesLower && lower < a.minLength) || (!leavesUpper && upper > a.maxLength);
        });
        if (!unsafeRest) break;
        h *= .5; next = interval(state, h, motors, restForces, external, tolerance, supportedMask, true);
        if (!next || retry === 47) throw new Error('Interior rest event could not be certified');
      }
      // Every resized trial must locate separation again. Only an actual
      // solved onset root may bypass the positive-normal interior enclosure.
      const resolveSeparation = (limit: number, trial: VerticalSupportSegment) => {
        let releaseTime = limit, certified = false;
        for (let i = 0; i < 2; i++) if ((supportedMask & (1 << i)) && requiredNormal(trial.after, i, motors, external) < 0) {
          let lo = 0, hi = limit;
          for (let k = 0; k < 60; k++) {
            const mid = .5 * (lo + hi), candidate = interval(state, mid, motors, restForces, external, tolerance, supportedMask, true);
            if (!candidate || requiredNormal(candidate.after, i, motors, external) <= 0) hi = mid; else lo = mid;
          }
          releaseTime = Math.min(releaseTime, hi); certified = true;
        }
        const segment = certified ? interval(state, releaseTime, motors, restForces, external, tolerance, supportedMask) : trial;
        if (!segment || !(releaseTime > 1e-14 * dt)) throw new Error('Separation requires a shorter physical interval');
        return { h: releaseTime, segment, certified };
      };
      const resolveRestRelease = (limit: number, trial: VerticalSupportSegment) => {
        let earliest = limit, released = false;
        if (state.series) for (let i = 0; i < 2; i++) {
          const side = heldRestSide(state, i, restForces[i], tolerance);
          if (!side) continue;
          const reaction = (candidate: VerticalSupportSegment) => side * (axialLegForce(candidate.after.torso.position - candidate.after.feet[i].position, candidate.after.legs[i]) - restForces[i]);
          if (reaction(trial) >= 0) continue;
          let lo = 0, hi = limit;
          for (let k = 0; k < 60; k++) {
            const mid = .5 * (lo + hi), candidate = interval(state, mid, motors, restForces, external, tolerance, supportedMask, true);
            if (!candidate) throw new Error('Rest release root solve did not converge');
            if (reaction(candidate) <= 0) hi = mid; else lo = mid;
          }
          earliest = Math.min(earliest, hi); released = true;
        }
        const segment = released ? interval(state, earliest, motors, restForces, external, tolerance, supportedMask, true) : trial;
        if (!segment || !(earliest > 1e-14 * dt)) throw new Error('Rest release requires a shorter physical interval');
        return { h: earliest, segment };
      };
      const resolveRestBound = (limit: number, trial: VerticalSupportSegment) => {
        if (!state.series) return { h: limit, segment: trial };
        let onset = limit;
        const hits: Array<{ id: number; bound: number; time: number }> = [];
        for (let i = 0; i < 2; i++) {
          const r = trial.after.legs[i].restLength, a = state.series[i];
          if (r >= a.minLength && r <= a.maxLength) continue;
          const bound = r < a.minLength ? a.minLength : a.maxLength;
          let lo = 0, hi = limit;
          for (let k = 0; k < 60; k++) {
            const mid = .5 * (lo + hi), candidate = interval(state, mid, motors, restForces, external, tolerance, supportedMask, true);
            if (!candidate) throw new Error('Rest bound root solve did not converge');
            const value = candidate.after.legs[i].restLength;
            if (bound === a.minLength ? value <= bound : value >= bound) hi = mid; else lo = mid;
          }
          hits.push({ id: i, bound, time: hi }); onset = Math.min(onset, hi);
        }
        if (!hits.length) return { h: limit, segment: trial };
        const segment = interval(state, onset, motors, restForces, external, tolerance, supportedMask, true);
        if (!segment || !(onset > 1e-14 * dt)) throw new Error('Rest bound requires a shorter physical interval');
        for (const hit of hits) if (Math.abs(hit.time - onset) <= 1e-12 * Math.max(1, onset)) {
          if (Math.abs(segment.after.legs[hit.id].restLength - hit.bound) > 1e-9) throw new Error('Rest bound root residual');
          segment.after.legs[hit.id].restLength = hit.bound;
          segment.restRates[hit.id] = (hit.bound - state.legs[hit.id].restLength) / onset;
          segment.restMotorWork[hit.id] = restForces[hit.id] * (hit.bound - state.legs[hit.id].restLength);
          segment.seriesDragWork[hit.id] = -state.series[hit.id].drag * segment.restRates[hit.id] ** 2 * onset;
        }
        return { h: onset, segment };
      };
      const resolveTouchdown = (limit: number, trial: VerticalSupportSegment) => {
        const crossed = state.feet.map((f, i) => f.position > 0 && trial.after.feet[i].position < 0);
        let earliest = limit; const roots: Array<{ id: number; time: number }> = [];
        for (let i = 0; i < 2; i++) if (crossed[i]) {
          let lo = 0, hi = limit;
          for (let k = 0; k < 60; k++) {
            const mid = .5 * (lo + hi), candidate = interval(state, mid, motors, restForces, external, tolerance, supportedMask, true);
            if (!candidate) throw new Error('Touchdown root solve did not converge');
            if (candidate.after.feet[i].position <= 0) hi = mid; else lo = mid;
          }
          roots.push({ id: i, time: hi }); earliest = Math.min(earliest, hi);
        }
        if (!roots.length) return { h: limit, segment: trial, hits: [] as number[] };
        const segment = interval(state, earliest, motors, restForces, external, tolerance, supportedMask, true);
        if (!segment || !(earliest > 1e-14 * dt)) throw new Error('Touchdown requires a shorter physical interval');
        const hits = roots.filter(root => Math.abs(root.time - earliest) <= 1e-12 * Math.max(1, earliest)).map(root => root.id);
        for (const i of hits) {
          if (Math.abs(segment.after.feet[i].position) > 1e-8) throw new Error('Touchdown position root residual');
          segment.after.feet[i].position = 0;
        }
        return { h: earliest, segment, hits };
      };
      const resolveEvents = (limit: number, trial: VerticalSupportSegment) => {
        let localH = limit, segment = trial, releaseAt = Infinity;
        const touchdownAt = [Infinity, Infinity];
        for (let k = 0; k < 16; k++) {
          const priorH = localH;
          const separation = resolveSeparation(localH, segment);
          localH = separation.h; segment = separation.segment;
          if (separation.certified) releaseAt = localH;
          const release = resolveRestRelease(localH, segment); localH = release.h; segment = release.segment;
          const rest = resolveRestBound(localH, segment); localH = rest.h; segment = rest.segment;
          const touchdown = resolveTouchdown(localH, segment); localH = touchdown.h; segment = touchdown.segment;
          touchdown.hits.forEach(i => { touchdownAt[i] = localH; });
          if (priorH - localH <= 1e-12 * Math.max(1, localH)) {
            // Cluster only residues of solved coincident events. Later
            // resolvers can recreate the same smooth endpoint, so restore
            // exact landmarks together after event ordering has settled.
            if (state.series) for (let i = 0; i < 2; i++) {
              const bounds = state.series[i], r = segment.after.legs[i].restLength;
              if (r < bounds.minLength && bounds.minLength - r <= 1e-12) segment.after.legs[i].restLength = bounds.minLength;
              if (r > bounds.maxLength && r - bounds.maxLength <= 1e-12) segment.after.legs[i].restLength = bounds.maxLength;
            }
            const hits = touchdownAt.map(time => Math.abs(time - localH) <= 1e-12 * Math.max(1, localH));
            hits.forEach((hit, i) => { if (hit && Math.abs(segment.after.feet[i].position) <= 1e-12) segment.after.feet[i].position = 0; });
            return { h: localH, segment, releaseCertified: Math.abs(releaseAt - localH) <= 1e-12 * Math.max(1, localH), touchdownCertified: hits };
          }
        }
        throw new Error('Local event ordering did not settle');
      };
      let events = resolveEvents(h, next), releaseCertified = events.releaseCertified, touchdownCertified = events.touchdownCertified;
      h = events.h; next = events.segment;
      {
        // A bounded downward-force envelope guards against an unobserved
        // interior touchdown when the full trial endpoint is above ground.
        for (let retry = 0; retry < 40; retry++) {
          const unsafe = state.feet.some((f, i) => {
            if (touchdownCertified[i] && next!.after.feet[i].position === 0) return false;
            const leg = state.legs[i], rate = state.torso.velocity - f.velocity;
            const torsoBound = state.gravity + (state.legs.reduce((sum, l) => sum + l.forceCap + l.dampingCap, 0)
              + Math.abs(motors[0]) + Math.abs(motors[1]) + Math.abs(external[0])) / state.torsoMass;
            if (f.position === 0 && f.velocity === 0) {
              const initialNormal = requiredNormal(state, i, motors, external);
              // Known separation roots are allowed to end at zero. For
              // positive endpoints, rule out a hidden interior unloading
              // using the material law's Lipschitz force bound.
              if (initialNormal <= tolerance) return false;
              const endNormal = requiredNormal(next!.after, i, motors, external);
              if (releaseCertified && Math.abs(endNormal) <= 1e-7) return false;
              const derivativeBound = leg.stiffness * ((state.series?.[i].rateCap ?? 0) + Math.abs(state.torso.velocity) + h * torsoBound) + leg.damping * torsoBound;
              return initialNormal - h * derivativeBound < 0;
            }
            const footBound = state.gravity + (leg.forceCap + leg.dampingCap + Math.abs(motors[i]) + Math.abs(external[i + 1])) / state.footMass[i];
            const relativeBound = torsoBound + footBound;
            const lengthLower = state.torso.position - f.position - h * Math.abs(rate) - .5 * relativeBound * h * h;
            const springBound = lengthLower > 0 ? axialLegForce(lengthLower, { ...leg, restLength: state.series ? Math.min(state.series[i].maxLength, leg.restLength + h * state.series[i].rateCap) : leg.restLength }) : leg.forceCap;
            const dampingBound = Math.min(leg.dampingCap, leg.damping * (Math.abs(rate) + h * relativeBound));
            const acc = Math.max(0, state.gravity + (springBound + dampingBound - motors[i] - external[i + 1]) / state.footMass[i]);
            return f.position + h * f.velocity - .5 * acc * h * h < 0;
          });
          if (!unsafe) break;
          h *= .5; next = interval(state, h, motors, restForces, external, tolerance, supportedMask, true);
          if (!next || retry === 39) throw new Error('Interior contact requires a shorter physical interval');
          events = resolveEvents(h, next); h = events.h; next = events.segment;
          releaseCertified = events.releaseCertified; touchdownCertified = events.touchdownCertified;
        }
      }
      if (next.after.series && next.after.legs.some((leg, i) => leg.restLength < next!.after.series![i].minLength || leg.restLength > next!.after.series![i].maxLength)) throw new Error('Rest bounds require an earlier event');
      if (next.after.feet.some(f => f.position < 0 || f.position >= next!.after.torso.position)) throw new Error('Ordered torso/foot geometry crossing');
      if (next.normalImpulse.some((n, i) => n > 0 && requiredNormal(next!.after, i, motors, external) < -1e-7)) throw new Error('Contact endpoint requires an earlier separation');
      if (next.normalImpulse.some(n => n < 0)) throw new Error('Signed contact trial requires an earlier separation');
      if (state.series) for (let i = 0; i < 2; i++) {
        const before = state.legs[i].restLength, after = next.after.legs[i].restLength, bounds = state.series[i];
        if (before > bounds.minLength && before < bounds.maxLength && (after === bounds.minLength || after === bounds.maxLength)) restBoundSplits++;
      }
      segments.push(next); state = next.after; time += h;
      if ([...next.motorWork, ...next.restMotorWork].reduce((sum, work) => sum + Math.max(0, work), 0) > input.actuator.powerCap * h + tolerance)
        throw new Error('Shared positive motor power budget exceeded in physical segment');
      if (dt - time <= 4 * Number.EPSILON * dt) time = dt;
    }
  } catch (error) { reason = error instanceof Error ? error.message : String(error); }
  const restMotorWork = [0, 0] as [number, number], seriesDragWork = [0, 0] as [number, number], seriesLimitWork = [0, 0] as [number, number];
  const slotMotorWork = [0, 0] as [number, number], normalImpulse = [0, 0] as [number, number];
  let externalWork = 0, dampingWork = 0, groundWork = 0, impactWork = 0, positiveMotorWork = 0, externalMomentum = 0;
  for (const segment of segments) {
    for (let i = 0; i < 2; i++) { slotMotorWork[i] += segment.motorWork[i]; normalImpulse[i] += segment.normalImpulse[i]; restMotorWork[i] += segment.restMotorWork[i]; seriesDragWork[i] += segment.seriesDragWork[i]; seriesLimitWork[i] += segment.seriesLimitWork[i]; positiveMotorWork += Math.max(0, segment.motorWork[i]) + Math.max(0, segment.restMotorWork[i]); }
    externalWork += segment.externalWork; dampingWork += segment.dampingWork; groundWork += segment.groundWork; impactWork += segment.impactWork;
    externalMomentum += segment.externalImpulse.reduce((sum, j) => sum + j, 0) - segment.dt * input.gravity * (input.torsoMass + input.footMass[0] + input.footMass[1]);
  }
  const finalEnergy = verticalSupportEnergy(state), motorWork = slotMotorWork[0] + slotMotorWork[1] + restMotorWork[0] + restMotorWork[1];
  const workResidual = finalEnergy.total - beforeEnergy.total - motorWork - externalWork - dampingWork - groundWork - impactWork - seriesDragWork[0] - seriesDragWork[1] - seriesLimitWork[0] - seriesLimitWork[1];
  const momentum = (s: VerticalSupportState) => s.torsoMass * s.torso.velocity + s.feet.reduce((sum, f, i) => sum + s.footMass[i] * f.velocity, 0);
  const momentumResidual = momentum(state) - momentum(input) - externalMomentum - normalImpulse[0] - normalImpulse[1];
  if (!reason && positiveMotorWork > input.actuator.powerCap * dt + tolerance) reason = 'Shared positive motor power budget exceeded';
  if (!reason && (Math.abs(workResidual) > 1e-7 || Math.abs(momentumResidual) > 1e-7 || dampingWork > tolerance || groundWork > tolerance || seriesDragWork.some(w => w > tolerance) || seriesLimitWork.some(w => w > tolerance))) reason = 'Energy/momentum/passivity residual';
  const accepted = reason === null;
  return { state: accepted ? clone(state) : clone(input), report: { accepted, reason, dt, advancedTime: time,
    energyBefore: beforeEnergy.total, energyAfter: finalEnergy.total, kineticEnergy: finalEnergy.kinetic, gravityEnergy: finalEnergy.gravity, springEnergy: finalEnergy.spring, candidateState: clone(state),
    motorWork, slotMotorWork, restMotorWork, seriesDragWork, seriesLimitWork, restBoundWork: [0, 0], restBoundSplits, appliedRestForces: restForces, requestedRestForces: [...requestedRest], positiveMotorWork, externalWork, dampingWork, groundWork, impactWork, workResidual, momentumResidual, normalImpulse, segments,
    appliedMotorForces: motors, requestedMotorForces: [...requested], sharedForceCap: input.actuator.forceCap, sharedPowerCap: input.actuator.powerCap } };
}
