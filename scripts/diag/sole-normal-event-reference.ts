/** Independent continuous 1D finite normal-contact reference, kg / yd / s.
 * No production physics imports or response backend. Normal force is
 * K*max(-gap,0)+C*max(-velocity,0) while gap<=0; the dashpot is closing-only.
 * Near-critical under/overdamped formulas can suffer coefficient cancellation;
 * unresolved arithmetic is rejected instead of publishing an exactness claim.
 * Node 22: node --import tsx scripts/diag/sole-normal-event-reference.ts [output.json]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceVersion } from '../source-version.js';

export interface SoleNormalReferenceParameters {
  mass: number;
  stiffness: number;
  damping?: number;
  /** Constant gravity acceleration, negative toward ground. */
  acceleration?: number;
  /** Constant independent vertical force, positive away from ground. */
  externalForce?: number;
}
export interface SoleNormalReferenceState { gap: number; velocity: number }
export interface SoleNormalReferenceSegment {
  startTime: number;
  duration: number;
  phase: 'free' | 'closing' | 'opening' | 'equilibrium';
  before: SoleNormalReferenceState;
  after: SoleNormalReferenceState;
  springImpulse: number;
  dampingImpulse: number;
  groundWork: number;
  externalWork: number;
  dampingDissipation: number;
}
export interface SoleNormalReferenceEvent {
  time: number;
  kind: 'touchdown' | 'compression-turn' | 'compression-start' | 'release';
  state: SoleNormalReferenceState;
  /** Trig/quadratic floating-point residual before the exact root landmark. */
  gapResidual: number;
  velocityResidual: number;
}
export interface SoleNormalReferenceResult {
  state: SoleNormalReferenceState;
  advancedTime: number;
  segments: SoleNormalReferenceSegment[];
  events: SoleNormalReferenceEvent[];
  totals: {
    springImpulse: number; dampingImpulse: number; normalImpulse: number;
    groundWork: number; externalWork: number; dampingDissipation: number;
  };
  budgets: {
    initialEnergy: number; finalEnergy: number; energyResidual: number;
    /** Momentum uses separately integrated physical force. Kinetic-work and
     * total-energy rows are algebraically equivalent, not two independent tests. */
    momentumResidual: number; kineticWorkResidual: number;
  };
}
interface Law { m: number; k: number; C: number; ag: number; F: number; a: number; omega: number }
const copy = (s: SoleNormalReferenceState): SoleNormalReferenceState => ({ ...s });
function law(p: SoleNormalReferenceParameters): Law {
  const m = p.mass, k = p.stiffness, C = p.damping ?? 0;
  const ag = p.acceleration ?? 0, F = p.externalForce ?? 0;
  if (![m, k, C, ag, F].every(Number.isFinite) || m <= 0 || k <= 0 || C < 0)
    throw new RangeError('Finite positive mass/stiffness and nonnegative damping required');
  const a = ag + F / m, omega = Math.sqrt(k / m);
  if (![a, omega].every(Number.isFinite)) throw new RangeError('Finite derived acceleration/frequency required');
  return { m, k, C, ag, F, a, omega };
}
const potential = (g: number, k: number) => .5 * k * Math.max(0, -g) ** 2;
const energy = (s: SoleNormalReferenceState, p: Law) =>
  .5 * p.m * s.velocity ** 2 - p.m * p.ag * s.gap + potential(s.gap, p.k);
/** Integral exp(-lambda*t)*t^order; short intervals use its convergent series. */
function expMoment(lambda: number, t: number, order: 0 | 1 | 2): number {
  if (lambda === 0) return t ** (order + 1) / (order + 1);
  const z = lambda * t;
  if (Math.abs(z) < .2) {
    let coefficient = 1, sum = 1 / (order + 1);
    for (let j = 1; j <= 80; j++) {
      coefficient *= -z / j;
      const term = coefficient / (order + j + 1);
      sum += term;
      if (Math.abs(term) <= Number.EPSILON * Math.abs(sum)) break;
    }
    return t ** (order + 1) * sum;
  }
  const e = Math.exp(-z), I0 = -Math.expm1(-z) / lambda;
  if (order === 0) return I0;
  const I1 = (I0 - t * e) / lambda;
  return order === 1 ? I1 : (2 * I1 - t * t * e) / lambda;
}
function trigIntegral(alpha: number, beta: number, t: number): { cos: number; sin: number } {
  if (alpha === 0 && beta === 0) return { cos: t, sin: 0 };
  const e = Math.exp(-alpha * t), angle = beta * t;
  const cosMinusOne = Math.expm1(-alpha * t) - 2 * e * Math.sin(angle / 2) ** 2;
  const expSin = e * Math.sin(angle), denominator = alpha * alpha + beta * beta;
  return { cos: (-alpha * cosMinusOne + beta * expSin) / denominator,
    sin: (-beta * cosMinusOne - alpha * expSin) / denominator };
}
/** Stable ballistic roots; a root at zero is the current boundary, while an
 * upward surface departure can return at a later positive root. */
function ballisticTouchdown(s: SoleNormalReferenceState, a: number): number {
  if (a === 0) return s.velocity < 0 && s.gap > 0 ? -s.gap / s.velocity : Infinity;
  const A = .5 * a, b = s.velocity, c = s.gap, discriminant = b * b - 4 * A * c;
  if (discriminant < 0) return Infinity;
  const square = Math.sqrt(discriminant), q = -.5 * (b + (b >= 0 ? square : -square));
  const roots = q === 0 ? [0] : [q / A, c / q];
  return Math.min(...roots.filter(t => t > 0 && b + a * t < 0), Infinity);
}
interface CompressedSolution {
  at: (t: number) => SoleNormalReferenceState;
  integralGap: (t: number) => number;
  integralVelocitySquared: (t: number) => number;
  turnTime: number;
}
function compressed(s: SoleNormalReferenceState, p: Law, closing: boolean): CompressedSolution {
  const alpha = closing ? p.C / (2 * p.m) : 0, omega = p.omega;
  const equilibrium = p.a / (omega * omega), z0 = s.gap - equilibrium;
  const discriminant = omega * omega - alpha * alpha;
  if (discriminant > 0) {
    const beta = Math.sqrt(discriminant), A = z0, B = (s.velocity + alpha * A) / beta;
    const P = s.velocity, Q = -beta * A - alpha * B;
    return {
      at(t) {
        const e = Math.exp(-alpha * t), c = Math.cos(beta * t), sin = Math.sin(beta * t);
        return { gap: equilibrium + e * (A * c + B * sin), velocity: e * (P * c + Q * sin) };
      },
      integralGap(t) { const I = trigIntegral(alpha, beta, t); return equilibrium * t + A * I.cos + B * I.sin; },
      integralVelocitySquared(t) {
        const I0 = expMoment(2 * alpha, t, 0), I = trigIntegral(2 * alpha, 2 * beta, t);
        return .5 * (P * P + Q * Q) * I0 + .5 * (P * P - Q * Q) * I.cos + P * Q * I.sin;
      },
      // Positive-y atan2 avoids subtracting almost equal angles when the
      // first turn is very close. A true nonzero root is never skipped by a
      // velocity threshold or artificial minimum event time.
      turnTime: P === 0 ? (Q === 0 ? Infinity : Math.PI / beta)
        : (P < 0 ? Math.atan2(-P, Q) : Math.atan2(P, -Q)) / beta,
    };
  }
  if (discriminant === 0) {
    const A = z0, B = s.velocity + alpha * A, P = s.velocity, Q = -alpha * B;
    const root = Q === 0 ? Infinity : -P / Q;
    return {
      at(t) { const e = Math.exp(-alpha * t); return { gap: equilibrium + e * (A + B * t), velocity: e * (P + Q * t) }; },
      integralGap(t) { return equilibrium * t + A * expMoment(alpha, t, 0) + B * expMoment(alpha, t, 1); },
      integralVelocitySquared(t) { return P * P * expMoment(2 * alpha, t, 0)
        + 2 * P * Q * expMoment(2 * alpha, t, 1) + Q * Q * expMoment(2 * alpha, t, 2); },
      turnTime: root > 0 ? root : Infinity,
    };
  }
  const beta = Math.sqrt(-discriminant), r1 = -omega * omega / (alpha + beta), r2 = -alpha - beta;
  const A = (s.velocity - r2 * z0) / (r1 - r2), B = (r1 * z0 - s.velocity) / (r1 - r2);
  const P = r1 * A, Q = r2 * B, ratioDelta = -s.velocity / P;
  const root = P !== 0 && ratioDelta > -1 ? Math.log1p(ratioDelta) / (r1 - r2) : Infinity;
  return {
    at(t) { return { gap: equilibrium + A * Math.exp(r1 * t) + B * Math.exp(r2 * t), velocity: P * Math.exp(r1 * t) + Q * Math.exp(r2 * t) }; },
    integralGap(t) { return equilibrium * t + A * expMoment(-r1, t, 0) + B * expMoment(-r2, t, 0); },
    integralVelocitySquared(t) { return P * P * expMoment(-2 * r1, t, 0)
      + 2 * P * Q * expMoment(-r1 - r2, t, 0) + Q * Q * expMoment(-2 * r2, t, 0); },
    turnTime: root > 0 ? root : Infinity,
  };
}
function harmonicRelease(s: SoleNormalReferenceState, p: Law): number {
  const equilibrium = p.a / (p.omega * p.omega), B = s.velocity / p.omega;
  // Half-angle substitution avoids phi-acos cancellation for a small
  // outgoing gap: g*(1+u^2)=g0+2*B*u+(2*equilibrium-g0)*u^2.
  const A = 2 * equilibrium - s.gap, b = 2 * B, c = s.gap;
  const discriminant = b * b - 4 * A * c;
  if (!(discriminant > 0)) return Infinity; // A repeated root only grazes.
  const q = -.5 * (b + (b >= 0 ? Math.sqrt(discriminant) : -Math.sqrt(discriminant)));
  const roots = A === 0 ? [-c / b] : [q / A, c / q];
  const durations = roots.filter(Number.isFinite).map(u => {
    let theta = 2 * Math.atan(u);
    if (theta <= 0) theta += 2 * Math.PI;
    const velocity = p.omega * (-(s.gap - equilibrium) * Math.sin(theta) + B * Math.cos(theta));
    return velocity > 0 ? theta / p.omega : Infinity;
  });
  return Math.min(...durations, Infinity);
}

/** Exact phase-event solution of finite compliant normal contact. At touchdown
 * and release there is no impact impulse or velocity reset. Root landmarks
 * remove only roundoff from an analytically solved zero, recorded separately. */
export function advanceSoleNormalEventReference(
  parameters: SoleNormalReferenceParameters,
  before: SoleNormalReferenceState,
  horizon: number,
): SoleNormalReferenceResult {
  const p = law(parameters);
  if (![before.gap, before.velocity, horizon].every(Number.isFinite) || horizon < 0)
    throw new RangeError('Finite state and nonnegative finite horizon required');
  if (!Number.isFinite(energy(before, p))) throw new RangeError('Finite initial energy required');
  let state = copy(before), time = 0, transitions = 0;
  const segments: SoleNormalReferenceSegment[] = [], events: SoleNormalReferenceEvent[] = [];
  const totals = { springImpulse: 0, dampingImpulse: 0, normalImpulse: 0, groundWork: 0, externalWork: 0, dampingDissipation: 0 };
  while (time < horizon) {
    if (++transitions > 100000) throw new RangeError('Reference phase-event budget exceeded');
    const old = copy(state), remaining = horizon - time;
    let duration = remaining, phase: SoleNormalReferenceSegment['phase'];
    let event: SoleNormalReferenceEvent['kind'] | null = null;
    let springImpulse = 0, dampingImpulse = 0, loss = 0;
    const free = old.gap > 0 || (old.gap === 0 && (old.velocity > 0 || (old.velocity === 0 && p.a >= 0)));
    if (free) {
      phase = 'free';
      const hit = ballisticTouchdown(old, p.a);
      if (hit <= duration) { duration = hit; event = 'touchdown'; }
      state = { gap: old.gap + old.velocity * duration + .5 * p.a * duration ** 2,
        velocity: old.velocity + p.a * duration };
    } else {
      const acceleration = p.a - p.omega ** 2 * old.gap;
      if (old.velocity === 0 && acceleration === 0) {
        phase = 'equilibrium'; state = copy(old); springImpulse = -p.k * old.gap * duration;
      } else {
        const closing = old.velocity < 0 || (old.velocity === 0 && acceleration < 0);
        phase = closing ? 'closing' : 'opening';
        const flow = compressed(old, p, closing);
        if (flow.turnTime <= duration) {
          duration = flow.turnTime; event = closing ? 'compression-turn' : 'compression-start';
        }
        if (!closing) {
          const release = harmonicRelease(old, p);
          if (release <= duration) { duration = release; event = 'release'; }
        }
        state = flow.at(duration);
        springImpulse = -p.k * flow.integralGap(duration);
        if (closing && p.C > 0) {
          dampingImpulse = -p.C * (state.gap - old.gap);
          loss = p.C * flow.integralVelocitySquared(duration);
          const roundoff = 512 * Number.EPSILON * Math.max(1, p.C * duration * (old.velocity ** 2 + state.velocity ** 2));
          if (loss < -roundoff) throw new RangeError('Analytic damping integral is numerically unresolved');
          if (loss < 0) loss = 0;
        }
      }
    }
    const raw = copy(state), gapResidual = event === 'touchdown' || event === 'release' ? raw.gap : 0;
    const velocityResidual = event === 'compression-turn' || event === 'compression-start' ? raw.velocity : 0;
    if (event === 'touchdown' || event === 'release') state.gap = 0;
    if (event === 'compression-turn' || event === 'compression-start') state.velocity = 0;
    const scale = Math.max(1, Math.abs(old.gap), Math.abs(old.velocity), Math.abs(state.gap), Math.abs(state.velocity));
    if (!(duration > 0) || ![state.gap, state.velocity, springImpulse, dampingImpulse, loss].every(Number.isFinite)
      || Math.abs(gapResidual) > 1024 * Number.EPSILON * scale
      || Math.abs(velocityResidual) > 1024 * Number.EPSILON * scale * Math.max(1, p.omega))
      throw new RangeError('Exact reference interval/root is numerically unresolved');
    const deltaGap = state.gap - old.gap;
    const groundWork = potential(old.gap, p.k) - potential(state.gap, p.k) - loss;
    const externalWork = p.F * deltaGap;
    segments.push({ startTime: time, duration, phase, before: old, after: copy(state),
      springImpulse, dampingImpulse, groundWork, externalWork, dampingDissipation: loss });
    totals.springImpulse += springImpulse; totals.dampingImpulse += dampingImpulse;
    totals.normalImpulse += springImpulse + dampingImpulse; totals.groundWork += groundWork;
    totals.externalWork += externalWork; totals.dampingDissipation += loss;
    time += duration;
    if (event) events.push({ time, kind: event, state: copy(state), gapResidual, velocityResidual });
    if (horizon - time <= 8 * Number.EPSILON * Math.max(1, horizon)) time = horizon;
  }
  const initialEnergy = energy(before, p), finalEnergy = energy(state, p);
  const result: SoleNormalReferenceResult = { state, advancedTime: time, segments, events, totals,
    budgets: { initialEnergy, finalEnergy,
      energyResidual: finalEnergy - initialEnergy - totals.externalWork + totals.dampingDissipation,
      momentumResidual: p.m * (state.velocity - before.velocity) - p.m * p.a * horizon - totals.normalImpulse,
      kineticWorkResidual: .5 * p.m * (state.velocity ** 2 - before.velocity ** 2)
        - p.m * p.ag * (state.gap - before.gap) - totals.externalWork - totals.groundWork } };
  const energyScale = Math.max(1, Math.abs(initialEnergy), Math.abs(finalEnergy), Math.abs(totals.externalWork), totals.dampingDissipation);
  const momentumScale = Math.max(1, Math.abs(p.m * state.velocity), Math.abs(p.m * before.velocity), Math.abs(p.m * p.a * horizon), Math.abs(totals.normalImpulse));
  if (![...Object.values(totals), ...Object.values(result.budgets)].every(Number.isFinite)
    || Math.abs(result.budgets.energyResidual) > 8192 * Number.EPSILON * energyScale
    || Math.abs(result.budgets.kineticWorkResidual) > 8192 * Number.EPSILON * energyScale
    || Math.abs(result.budgets.momentumResidual) > 8192 * Number.EPSILON * momentumScale)
    throw new RangeError('Analytic reference force/work integrals are numerically unresolved');
  return result;
}

/** Exact RELEASE duration of one undamped compressed midpoint prefix. This
 * secondary numerical-map reference is not the continuous event-time target.
 * Only a strictly outgoing endpoint counts: grazing/repeated roots return null. */
export function soleNormalMidpointReleasePrefix(
  parameters: SoleNormalReferenceParameters,
  state: SoleNormalReferenceState,
): number | null {
  const p = law(parameters);
  if (![state.gap, state.velocity].every(Number.isFinite) || !(state.gap < 0 && state.velocity > 0) || p.C !== 0)
    throw new RangeError('Undamped compressed outgoing state required');
  const A = .5 * p.a - .25 * p.omega ** 2 * state.gap, b = state.velocity, c = state.gap;
  if (A === 0) {
    const duration = -c / b;
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  }
  const discriminant = b * b - 4 * A * c;
  if (!(discriminant > 0) || !Number.isFinite(discriminant)) return null;
  const q = -.5 * (b + Math.sqrt(discriminant)), roots = [q / A, c / q].filter(t =>
    Number.isFinite(t) && t > 0 && -2 * state.gap / t - state.velocity > 0);
  return roots.length ? Math.min(...roots) : null;
}

/** Independently stepped nonsmooth ODE; it uses neither phase roots nor the
 * analytic force antiderivatives above. Fine/coarse error remains reported. */
function rk4Reference(parameters: SoleNormalReferenceParameters, initial: SoleNormalReferenceState, horizon: number, count: number) {
  const p = law(parameters), h = horizon / count;
  let values = [initial.gap, initial.velocity, 0, 0, 0];
  const rate = (x: number[]) => {
    const spring = p.k * Math.max(0, -x[0]), damping = x[0] <= 0 ? p.C * Math.max(0, -x[1]) : 0;
    return [x[1], p.a + (spring + damping) / p.m, spring, damping, damping * Math.max(0, -x[1])];
  };
  for (let i = 0; i < count; i++) {
    const a = rate(values), b = rate(values.map((v, j) => v + .5 * h * a[j]));
    const c = rate(values.map((v, j) => v + .5 * h * b[j])), d = rate(values.map((v, j) => v + h * c[j]));
    values = values.map((v, j) => v + h * (a[j] + 2 * b[j] + 2 * c[j] + d[j]) / 6);
  }
  return { state: { gap: values[0], velocity: values[1] }, springImpulse: values[2], dampingImpulse: values[3], dampingDissipation: values[4], count, dt: h };
}
function main() {
  if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run this independent reference with Node 22');
  if (process.argv.length > 3 || process.argv[2]?.startsWith('--')) throw new Error('Specify at most one output path');
  const output = process.argv[2] ?? 'out/sole-normal-event-reference.json';
  const self = fileURLToPath(import.meta.url), hash = () => createHash('sha256').update(readFileSync(self)).digest('hex');
  const sourceSha256Start = sourceVersion(), scriptSha256Start = hash();
  const cases: Array<{ id: string; parameters: SoleNormalReferenceParameters; initial: SoleNormalReferenceState; horizon: number }> = [];
  for (const damping of [0, 60, 200, 300]) for (const acceleration of [0, -10])
    cases.push({ id: `approach-C${damping}-a${acceleration}`, parameters: { mass: 1, stiffness: 10000, damping, acceleration },
      initial: { gap: .002, velocity: -1 }, horizon: .08 });
  cases.push(
    { id: 'outgoing-fully-compressed', parameters: { mass: 2, stiffness: 4000 }, initial: { gap: -.01, velocity: .8 }, horizon: .06 },
    { id: 'compressed-closing-turn-release', parameters: { mass: 2, stiffness: 4000, damping: 60 }, initial: { gap: -.01, velocity: -.8 }, horizon: .12 },
    { id: 'surface-outgoing-gravity-replant', parameters: { mass: 1, stiffness: 10000, damping: 30, acceleration: -10 }, initial: { gap: 0, velocity: .1 }, horizon: .08 },
    { id: 'surface-zero-gravity-entry', parameters: { mass: 1, stiffness: 10000, damping: 60, acceleration: -10 }, initial: { gap: 0, velocity: 0 }, horizon: .08 },
    { id: 'loaded-equilibrium', parameters: { mass: 1, stiffness: 10000, damping: 60, acceleration: -10 }, initial: { gap: -.001, velocity: 0 }, horizon: .08 },
    { id: 'compressed-external-force-release', parameters: { mass: 2, stiffness: 4000, damping: 60, acceleration: -10, externalForce: 60 }, initial: { gap: -.01, velocity: -.8 }, horizon: .12 },
    { id: 'very-near-surface-outgoing', parameters: { mass: 2, stiffness: 4000 }, initial: { gap: -1e-15, velocity: .8 }, horizon: .01 },
  );
  for (const damping of [0, 60, 200, 300]) cases.push({ id: `very-near-turn-C${damping}`,
    parameters: { mass: 1, stiffness: 10000, damping }, initial: { gap: -.001, velocity: -1e-15 }, horizon: .01 });
  const rows = cases.map(c => {
    const exact = advanceSoleNormalEventReference(c.parameters, c.initial, c.horizon);
    const partitions = [3, 7, 19, 53].map(count => {
      let state = copy(c.initial), springImpulse = 0, dampingImpulse = 0, dampingDissipation = 0;
      for (let i = 0; i < count; i++) {
        const part = advanceSoleNormalEventReference(c.parameters, state, c.horizon / count);
        state = part.state; springImpulse += part.totals.springImpulse; dampingImpulse += part.totals.dampingImpulse; dampingDissipation += part.totals.dampingDissipation;
      }
      return { count, state, springImpulse, dampingImpulse, dampingDissipation,
        error: Math.max(Math.abs(state.gap - exact.state.gap), Math.abs(state.velocity - exact.state.velocity),
          Math.abs(springImpulse - exact.totals.springImpulse), Math.abs(dampingImpulse - exact.totals.dampingImpulse),
          Math.abs(dampingDissipation - exact.totals.dampingDissipation)) };
    });
    const numerical = [8192, 16384, 32768, 65536].map(count => {
      const reference = rk4Reference(c.parameters, c.initial, c.horizon, count);
      return { ...reference, error: Math.max(Math.abs(reference.state.gap - exact.state.gap), Math.abs(reference.state.velocity - exact.state.velocity),
        Math.abs(reference.springImpulse - exact.totals.springImpulse), Math.abs(reference.dampingImpulse - exact.totals.dampingImpulse),
        Math.abs(reference.dampingDissipation - exact.totals.dampingDissipation)) };
    });
    return { ...c, exact, partitions, numerical };
  });
  const row = (id: string) => rows.find(r => r.id === id)!;
  const free = row('approach-C0-a0').exact;
  const midpointGrazing = { parameters: { mass: 1, stiffness: 4, acceleration: -2.5 },
    state: { gap: -1, velocity: 1 }, continuous: advanceSoleNormalEventReference({ mass: 1, stiffness: 4, acceleration: -2.5 }, { gap: -1, velocity: 1 }, 3),
    prefixDuration: soleNormalMidpointReleasePrefix({ mass: 1, stiffness: 4, acceleration: -2.5 }, { gap: -1, velocity: 1 }) };
  const nearCriticalArithmetic = [1e-6, 1e-9, 1e-12].flatMap(offset => [-1, 1].map(sign => {
    const parameters = { mass: 1, stiffness: 10000, damping: 200 + sign * offset };
    try {
      const attempted = advanceSoleNormalEventReference(parameters, { gap: .002, velocity: -1 }, .08);
      return { parameters, offset, sign, rejected: false, reason: null, budgets: attempted.budgets };
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return { parameters, offset, sign, rejected: true, reason: error.message, budgets: null };
    }
  }));
  const checks = {
    completed: rows.every(r => r.exact.advancedTime === r.horizon),
    analyticBudgetsClose: rows.every(r => Object.values(r.exact.budgets).slice(2).every(v => Math.abs(v) < 1e-10)),
    phasePartitionInvariance: rows.every(r => r.partitions.every(p => p.error < 1e-10)),
    independentNonsmoothOdeAgrees: rows.every(r => r.numerical.at(-1)!.error < 5e-4),
    // A nonsmooth touchdown can move relative to quadrature nodes when dt
    // halves. Its individual errors need not decrease monotonically. Retain
    // all four errors and compare the early/late two-scale envelopes.
    independentRefinementEnvelopeImproves: rows.every(r =>
      Math.max(r.numerical[2].error, r.numerical[3].error)
      <= Math.max(r.numerical[0].error, r.numerical[1].error) * .8 + 2e-9),
    exactBallisticTouchdown: Math.abs(free.events[0].time - .002) < 1e-15 && free.events[0].kind === 'touchdown',
    exactCompressionTurn: Math.abs(free.events[1].time - (.002 + Math.PI / 200)) < 1e-15 && free.events[1].kind === 'compression-turn',
    exactUndampedRelease: Math.abs(free.events[2].time - (.002 + Math.PI / 100)) < 1e-15 && free.events[2].kind === 'release',
    noFiniteComplianceImpact: free.events.filter(e => e.kind === 'touchdown' || e.kind === 'release').every(e => Math.abs(e.state.velocity) === 1),
    noUndampedLoss: free.totals.dampingDissipation === 0,
    replantOccurs: row('surface-outgoing-gravity-replant').exact.events.some(e => e.kind === 'touchdown'),
    equilibriumDoesNotDrift: row('loaded-equilibrium').exact.state.gap === -.001 && row('loaded-equilibrium').exact.state.velocity === 0,
    smallTrueRootsAreNotSkipped: rows.filter(r => r.id.startsWith('very-near-')).every(r =>
      r.exact.events[0].time > 0 && r.exact.events[0].time < 2e-15),
    midpointGrazingIsNotRelease: midpointGrazing.prefixDuration === null
      && midpointGrazing.continuous.events.every(e => e.kind !== 'release'),
    nearCriticalArithmeticRejectionIsExplicit: nearCriticalArithmetic.every(r => r.rejected && r.reason?.includes('numerically unresolved')),
    dampingDoesNotPull: rows.every(r => r.exact.segments.every(s => s.dampingImpulse >= -1e-12 && s.dampingDissipation >= 0
      && (s.phase === 'closing' || s.dampingImpulse === 0))),
  };
  const sourceSha256End = sourceVersion(), scriptSha256End = hash();
  if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End) throw new Error('Source/script changed; output withheld');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End, node: process.version,
    equations: { normal: 'm*gDDot=m*gravityAcceleration+externalForce+K*max(-g,0)+C*max(-gDot,0) while g<=0; no contact force above ground',
      events: 'ballistic g=0 entering; closing damped gDot=0 turn; undamped opening g=0 release or gDot=0 compression start',
      continuity: 'Finite stiffness causes no impact impulse; analytically solved root landmarks only remove reported arithmetic roundoff',
      references: 'Exact phase solutions/force integrals; independent RK4 directly evaluates nonsmooth force without phase roots or analytic integrals',
      workChecks: 'groundWork=-Delta(springPotential)-dampingLoss, so kineticWorkResidual and energyResidual are algebraically equivalent. Their duplicate closure is not independent evidence. Separately integrated force/momentum, phase roots and independently stepped ODE supply the additional checks.' },
    rows, midpointGrazing, nearCriticalArithmetic, checks,
    scope: 'Isolated translating normal material point, constant loads, finite linear compliance and unilateral closing dashpot. No production physics imports, foot rotation, leg/grip/traction coupling, NFL calibration or integration/readiness claim. RK4 references cross force-switch events independently and retain their finite error. Exactly critical C=200 is supported for mass1/K10000; the six C=200 +/-1e-6/1e-9/1e-12 probes are explicit floating-point cancellation rejections, not physical failures or supported reference results.' }, null, 2) + '\n');
  console.log(JSON.stringify({ output, checks, rows: rows.map(r => ({ id: r.id, events: r.exact.events.map(e => ({ time: e.time, kind: e.kind })),
    state: r.exact.state, budgets: r.exact.budgets, fineIndependentError: r.numerical.at(-1)!.error,
    maximumPartitionError: Math.max(...r.partitions.map(p => p.error)) })) }, null, 2));
  if (Object.values(checks).some(x => !x)) process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
