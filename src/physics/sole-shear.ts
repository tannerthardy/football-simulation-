/**
 * Isolated rate-independent Coulomb shear element with a persistent elastic
 * stretch. Units are consistent with the caller (normally kg, yd, s).
 * This is a constitutive interval map only; it does not advance a body.
 */
import { dot, len, scale, type Vec2 } from '../core/vec.js';

export interface SoleShearLaw {
  /** Tangential stiffness (force / distance), including this patch's area weight. */
  stiffness: number;
  /** Available tangential force at the start and end of the interval. */
  capacityBefore: number;
  capacityAfter: number;
}

export interface SoleShearOptions {
  absoluteTolerance?: number;
  relativeTolerance?: number;
  maxEvaluations?: number;
  maxDepth?: number;
}

export type SoleShearBranch = 'disabled' | 'elastic' | 'plastic' | 'elastic-plastic' | 'initial-return';

export interface SoleShearReport {
  accepted: boolean;
  reason: string | null;
  branch: SoleShearBranch;
  /** First elastic-to-plastic event time, or null if none. */
  onsetTime: number | null;
  forceIntegral: Vec2;
  /** Impulse applied to the foot/body; opposite the integrated spring force. */
  footImpulse: Vec2;
  capacityImpulse: number;
  potentialBefore: number;
  potentialAfter: number;
  plasticDissipation: number;
  initialReturnDissipation: number;
  /** Sum used in the mechanical energy identity. */
  totalDissipation: number;
  quadratureErrorImpulse: number;
  quadratureErrorDissipation: number;
  quadratureEvaluations: number;
  workResidual: number;
}

export interface SoleShearResult {
  stretch: Vec2;
  report: SoleShearReport;
}

const zero = (): Vec2 => ({ x: 0, y: 0 });
const finiteVec = (a: Vec2): boolean => Number.isFinite(a.x) && Number.isFinite(a.y);
const plus = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const norm2 = (a: Vec2): number => Math.hypot(a.x, a.y);

interface Integral {
  force: Vec2;
  dissipation: number;
  errorForce: number;
  errorDissipation: number;
  evaluations: number;
  failure?: string;
}

/** Positive-weight Gauss-Legendre nodes and weights on [-1, 1]. */
const G8_X = [
  .1834346424956498, .5255324099163290, .7966664774136267, .9602898564975363,
];
const G8_W = [
  .3626837833783620, .3137066458778873, .2223810344533745, .1012285362903763,
];
const G16_X = [
  .09501250983763744, .2816035507792589, .4580167776572274, .6178762444026438,
  .7554044083550030, .8656312023878318, .9445750230732326, .9894009349916499,
];
const G16_W = [
  .1894506104550685, .1826034150449236, .1691565193950025, .1495959888165767,
  .1246289712555339, .0951585116824928, .06225352393864789, .02715245941175409,
];

function gauss(fn: (t: number) => number[], a: number, b: number, xs: number[], ws: number[]): number[] {
  const mid = (a + b) / 2;
  const half = (b - a) / 2;
  let sum: number[] | undefined;
  for (let i = 0; i < xs.length; i++) {
    const offset = half * xs[i];
    const left = fn(mid - offset);
    const right = fn(mid + offset);
    if (!sum) sum = new Array(left.length).fill(0);
    for (let j = 0; j < sum.length; j++) sum[j] += ws[i] * (left[j] + right[j]);
  }
  return (sum ?? []).map(x => x * half);
}

function adaptiveIntegral(
  fn: (t: number) => number[], a: number, b: number,
  absTol: number, relTol: number, maxEvaluations: number, maxDepth: number,
): Integral {
  let evaluations = 0;
  let failure: string | null = null;
  const recurse = (lo: number, hi: number, depth: number): { value: number[]; error: number[] } => {
    // Each order samples symmetric nodes; count the actual integrand calls.
    if (evaluations + 48 > maxEvaluations) {
      failure = 'Sole shear quadrature budget exhausted';
      return { value: [0, 0, 0], error: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY] };
    }
    const low = gauss(t => { evaluations++; return fn(t); }, lo, hi, G8_X, G8_W);
    const high = gauss(t => { evaluations++; return fn(t); }, lo, hi, G16_X, G16_W);
    const error = high.map((v, i) => Math.abs(v - low[i]));
    const done = error.every((e, i) => e <= absTol + relTol * Math.abs(high[i]));
    if (done) return { value: high, error };
    if (depth >= maxDepth) {
      failure = 'Sole shear quadrature budget exhausted';
      return { value: high, error };
    }
    const mid = lo + (hi - lo) / 2;
    const left = recurse(lo, mid, depth + 1);
    const right = recurse(mid, hi, depth + 1);
    return {
      value: high.map((_, i) => left.value[i] + right.value[i]),
      error: high.map((_, i) => left.error[i] + right.error[i]),
    };
  };
  const result = recurse(a, b, 0);
  const val = result.value;
  return {
    force: { x: val[0], y: val[1] },
    dissipation: val[2],
    errorForce: Math.hypot(result.error[0], result.error[1]),
    errorDissipation: result.error[2],
    evaluations,
    ...(failure ? { failure } : {}),
  };
}

/** Composite positive-weight quadrature with bounded phase-coordinate spans. */
function adaptiveCompositeIntegral(
  fn: (t: number) => number[], a: number, b: number,
  absTol: number, relTol: number, maxEvaluations: number, maxDepth: number,
): Integral {
  const segmentCount = Math.max(1, Math.ceil(Math.abs(b - a)));
  if (segmentCount * 48 > maxEvaluations) {
    return {
      force: zero(), dissipation: 0,
      errorForce: Number.POSITIVE_INFINITY,
      errorDissipation: Number.POSITIVE_INFINITY,
      evaluations: 0,
      failure: 'Sole shear quadrature budget exhausted before phase subdivision',
    };
  }
  let force = zero();
  let dissipation = 0;
  let errorForce = 0;
  let errorDissipation = 0;
  let evaluations = 0;
  let failure: string | undefined;
  for (let index = 0; index < segmentCount; index++) {
    const lo = a + (b - a) * index / segmentCount;
    const hi = a + (b - a) * (index + 1) / segmentCount;
    const integral = adaptiveIntegral(fn, lo, hi, absTol / segmentCount, relTol,
      maxEvaluations - evaluations, maxDepth);
    force = plus(force, integral.force);
    dissipation += integral.dissipation;
    errorForce += integral.errorForce;
    errorDissipation += integral.errorDissipation;
    evaluations += integral.evaluations;
    if (integral.failure) {
      failure = integral.failure;
      break;
    }
  }
  return { force, dissipation, errorForce, errorDissipation, evaluations, ...(failure ? { failure } : {}) };
}

function quadraticRoots(a: number, b: number, c: number): number[] {
  const magnitude = Math.max(Math.abs(a), Math.abs(b), Math.abs(c));
  if (magnitude === 0) return [];
  a /= magnitude; b /= magnitude; c /= magnitude;
  if (a === 0) return b === 0 ? [] : [-c / b];
  let discriminant = b * b - 4 * a * c;
  const rounding = 16 * Number.EPSILON * (b * b + Math.abs(4 * a * c));
  if (discriminant < -rounding) return [];
  discriminant = Math.max(0, discriminant);
  const root = Math.sqrt(discriminant);
  const q = -.5 * (b + (b < 0 ? -root : root));
  if (q === 0) return [-b / (2 * a)];
  const x0 = q / a;
  const x1 = c / q;
  return x0 <= x1 ? [x0, x1] : [x1, x0];
}

function rejected(stretch: Vec2, reason: string, stiffness = 0): SoleShearResult {
  const u = Number.isFinite(stiffness) && stiffness >= 0 && finiteVec(stretch)
    ? .5 * stiffness * dot(stretch, stretch) : Number.NaN;
  return {
    stretch: { ...stretch },
    report: {
      accepted: false, reason, branch: 'elastic', onsetTime: null,
      forceIntegral: zero(), footImpulse: zero(), capacityImpulse: Number.NaN,
      potentialBefore: u, potentialAfter: u, plasticDissipation: 0,
      initialReturnDissipation: 0, totalDissipation: 0, quadratureErrorImpulse: Number.NaN,
      quadratureErrorDissipation: Number.NaN, quadratureEvaluations: 0,
      workResidual: Number.NaN,
    },
  };
}

function withinImpulseCapacity(forceIntegral: Vec2, capacityImpulse: number): boolean {
  const magnitude = norm2(forceIntegral);
  const roundoff = 128 * Number.EPSILON
    * Math.max(Number.MIN_VALUE, magnitude, capacityImpulse);
  return Number.isFinite(magnitude) && magnitude <= capacityImpulse + roundoff;
}

function withinWorkTolerance(
  residual: number, absTol: number, relTol: number,
  workTerms: number[],
): boolean {
  const scaleValue = Math.max(Number.MIN_VALUE, ...workTerms.map(Math.abs));
  return Number.isFinite(residual) && Math.abs(residual) <= 32 * (absTol + relTol * scaleValue);
}

/**
 * Advance one weighted shear patch over a constant material-point chord.
 * `displacement` is the total tangent displacement over `h`; capacity varies
 * affinely from `capacityBefore` to `capacityAfter`. Every accepted elastic,
 * yield, and plastic branch is integrated without resetting its stored state.
 */
export function advanceSoleShear(
  stretchInput: Vec2,
  displacement: Vec2,
  h: number,
  law: SoleShearLaw,
  options: SoleShearOptions = {},
): SoleShearResult {
  if (!stretchInput || !displacement || !law
    || !finiteVec(stretchInput) || !finiteVec(displacement)
    || ![h, law.stiffness, law.capacityBefore, law.capacityAfter].every(Number.isFinite)
    || !(h > 0 && law.stiffness >= 0 && law.capacityBefore >= 0 && law.capacityAfter >= 0))
    return rejected(stretchInput ?? zero(), 'Finite stretch, displacement, positive duration, and nonnegative finite law required', law?.stiffness);

  const absTol = options.absoluteTolerance ?? 1e-11;
  const relTol = options.relativeTolerance ?? 1e-9;
  const maxEvaluations = options.maxEvaluations ?? 20000;
  const maxDepth = options.maxDepth ?? 18;
  if (![absTol, relTol].every(x => Number.isFinite(x) && x > 0)
    || !Number.isInteger(maxEvaluations) || maxEvaluations < 48
    || !Number.isInteger(maxDepth) || maxDepth < 0)
    return rejected(stretchInput, 'Positive finite quadrature tolerances and adequate integer budget required', law.stiffness);

  const k = law.stiffness;
  const R0 = law.capacityBefore;
  const R1 = law.capacityAfter;
  const rdot = (R1 - R0) / h;
  const velocity = scale(displacement, 1 / h);
  const speed = len(velocity);
  const capacityImpulse = h * (R0 + R1) / 2;
  if (!Number.isFinite(capacityImpulse))
    return rejected(stretchInput, 'Nonfinite capacity impulse bound', k);
  if (!finiteVec(velocity))
    return rejected(stretchInput, 'Nonfinite chord velocity', k);
  if (speed > 0 && !Number.isFinite(k * speed))
    return rejected(stretchInput, 'Nonfinite elastic shear rate', k);
  const inputStretch = { ...stretchInput };
  let s0 = inputStretch;
  let initialReturnDissipation = 0;
  let initialReturn = false;
  if (k > 0) {
    const inputForce = k * len(s0);
    if (!Number.isFinite(inputForce) || !Number.isFinite(capacityImpulse))
      return rejected(inputStretch, 'Nonfinite constitutive force or capacity integral', k);
    if (inputForce > R0) {
      const targetLength = R0 / k;
      const oldEnergy = .5 * k * dot(s0, s0);
      const newEnergy = .5 * k * targetLength * targetLength;
      initialReturnDissipation = Math.max(0, oldEnergy - newEnergy);
      const oldLength = len(s0);
      s0 = oldLength > 0 ? scale(s0, targetLength / oldLength) : zero();
      initialReturn = true;
    }
  } else if (len(s0) !== 0) {
    return rejected(inputStretch, 'A disabled zero-stiffness patch cannot retain nonzero elastic stretch', k);
  }

  const potentialBefore = .5 * k * dot(inputStretch, inputStretch);
  const UafterReturn = .5 * k * dot(s0, s0);
  if (![potentialBefore, UafterReturn, initialReturnDissipation, rdot, speed].every(Number.isFinite))
    return rejected(inputStretch, 'Nonfinite stored shear energy or capacity rate', k);
  if (k === 0 || (R0 === 0 && R1 === 0)) {
    const report: SoleShearReport = {
      accepted: true, reason: null, branch: k === 0 ? 'disabled' : (initialReturn ? 'initial-return' : 'plastic'),
      onsetTime: k > 0 && R0 === 0 && speed > 0 ? 0 : null,
      forceIntegral: zero(), footImpulse: zero(), capacityImpulse,
      potentialBefore, potentialAfter: UafterReturn,
      plasticDissipation: 0, initialReturnDissipation,
      totalDissipation: initialReturnDissipation,
      quadratureErrorImpulse: 0, quadratureErrorDissipation: 0,
      quadratureEvaluations: 0,
      workResidual: (UafterReturn - potentialBefore) + initialReturnDissipation,
    };
    if (!withinWorkTolerance(report.workResidual, absTol, relTol,
      [potentialBefore, UafterReturn, initialReturnDissipation]))
      return rejected(inputStretch, 'Initial return energy residual exceeds tolerance', k);
    return { stretch: zero(), report };
  }

  if (speed === 0) {
    const startForce = scale(s0, k);
    const startMagnitude = len(startForce);
    let finalStretch = s0;
    let forceIntegral = scale(startForce, h);
    let plasticDissipation = 0;
    let onsetTime: number | null = null;
    let branch: SoleShearBranch = initialReturn ? 'initial-return' : 'elastic';
    if (R1 < startMagnitude) {
      // With no imposed tangent motion, only a falling cap can still drive
      // radial plastic unloading. The force direction stays fixed.
      if (!(rdot < 0) || startMagnitude > R0 + 1e-10 * Math.max(1, R0))
        return rejected(inputStretch, 'Unresolved zero-speed capacity transition', k);
      onsetTime = Math.max(0, Math.min(h, (startMagnitude - R0) / rdot));
      const n = startMagnitude > 0 ? scale(startForce, 1 / startMagnitude) : zero();
      const plasticDuration = h - onsetTime;
      const elasticImpulse = scale(startForce, onsetTime);
      const plasticImpulse = scale(n, plasticDuration * (startMagnitude + R1) / 2);
      forceIntegral = plus(elasticImpulse, plasticImpulse);
      finalStretch = scale(n, R1 / k);
      plasticDissipation = Math.max(0, (startMagnitude * startMagnitude - R1 * R1) / (2 * k));
      branch = onsetTime === 0 ? 'plastic' : 'elastic-plastic';
    }
    const potentialAfter = .5 * k * dot(finalStretch, finalStretch);
    const footImpulse = scale(forceIntegral, -1);
    const workResidual = potentialAfter - potentialBefore
      + plasticDissipation + initialReturnDissipation;
    if (![finalStretch.x, finalStretch.y, forceIntegral.x, forceIntegral.y,
      potentialAfter, plasticDissipation, workResidual].every(Number.isFinite))
      return rejected(inputStretch, 'Nonfinite zero-slip shear result', k);
    if (!withinImpulseCapacity(forceIntegral, capacityImpulse)
      || !withinWorkTolerance(workResidual, absTol, relTol,
        [potentialBefore, potentialAfter, plasticDissipation, initialReturnDissipation]))
      return rejected(inputStretch, 'Zero-slip shear ledger exceeds capacity or work tolerance', k);
    const report: SoleShearReport = {
      accepted: true, reason: null, branch,
      onsetTime, forceIntegral, footImpulse, capacityImpulse,
      potentialBefore, potentialAfter, plasticDissipation,
      initialReturnDissipation, totalDissipation: plasticDissipation + initialReturnDissipation,
      quadratureErrorImpulse: 0, quadratureErrorDissipation: 0,
      quadratureEvaluations: 0,
      workResidual,
    };
    return { stretch: finalStretch, report };
  }

  if (k === 0) return rejected(inputStretch, 'Unexpected zero stiffness branch', k);

  // Elastic trial force f(t)=k(s0+v*t) meets |f|=R(t) at a quadratic root.
  // Solve in normalized interval time u=t/h. This keeps root tolerances
  // dimensionless and avoids comparing seconds to force-squared residuals.
  const deltaR = R1 - R0;
  const a = k * k * dot(displacement, displacement) - deltaR * deltaR;
  const b = 2 * (k * k * dot(s0, displacement) - R0 * deltaR);
  const c = k * k * dot(s0, s0) - R0 * R0;
  // Each coefficient subtracts squared-force terms. Boundary detection must
  // use their forward rounding scale, not the much smaller residual scale;
  // the root and derivative checks below remain relative in normalized time.
  const cTolerance = 64 * Number.EPSILON * Math.max(Number.MIN_VALUE,
    k * k * dot(s0, s0) + R0 * R0);
  const bTolerance = 64 * Number.EPSILON * Math.max(Number.MIN_VALUE,
    2 * (k * k * (Math.abs(s0.x * displacement.x) + Math.abs(s0.y * displacement.y))
      + Math.abs(R0 * deltaR)));
  const aTolerance = 64 * Number.EPSILON * Math.max(Number.MIN_VALUE,
    k * k * dot(displacement, displacement) + deltaR * deltaR);
  const isAtStart = Math.abs(c) <= cTolerance;
  // Once the forward-error test establishes a boundary start, solve the
  // polynomial with that initial residual set to zero. This retains a tiny
  // positive second root after an initially inward-moving boundary state.
  const roots = quadraticRoots(a, b, isAtStart ? 0 : c);
  let onset: number | null = null;
  const derivativeAtStart = b;
  // A tangent touch is still immediate yield when the second-order trial
  // force grows outside the disk (for example, a boundary state turning).
  if (isAtStart && (derivativeAtStart > bTolerance
    || (Math.abs(derivativeAtStart) <= bTolerance && a > aTolerance))) onset = 0;
  if (onset === null) {
    for (const root of roots) {
      if (!(root > 0 && root < 1)) continue;
      const derivative = 2 * a * root + b;
      const derivativeTolerance = 64 * Number.EPSILON
        * Math.max(Number.MIN_VALUE, 2 * Math.abs(a * root) + Math.abs(b));
      if (derivative > derivativeTolerance) { onset = root * h; break; }
    }
  }

  const endTrialStretch = plus(s0, displacement);
  const trialForceEnd = k * len(endTrialStretch);
  const endCapacity = R1;
  const endpointExcess = trialForceEnd - endCapacity;
  const endpointTolerance = 128 * Number.EPSILON * Math.max(Number.MIN_VALUE, trialForceEnd, endCapacity);
  const yieldsAtEnd = endpointExcess > endpointTolerance;
  if (onset === null && yieldsAtEnd) {
    // An endpoint excess with no interior root is only possible for an
    // immediate yield at a zero-capacity start or due to an unresolved root.
    if (R0 === 0 && len(s0) === 0) onset = 0;
    else return rejected(inputStretch, 'Elastic-yield root could not be isolated', k);
  }

  const capacity = (t: number) => R0 + rdot * t;
  let finalStretch: Vec2;
  let forceIntegral = zero();
  let plasticDissipation = 0;
  let errorImpulse = 0;
  let errorDissipation = 0;
  let evaluations = 0;
  let branch: SoleShearBranch = initialReturn ? 'initial-return' : 'elastic';
  let quadratureFailure: string | undefined;

  if (onset === null) {
    finalStretch = endTrialStretch;
    forceIntegral = scale(plus(s0, finalStretch), k * h / 2);
  } else {
    branch = onset === 0 ? 'plastic' : 'elastic-plastic';
    const onsetStretch = plus(s0, scale(displacement, onset / h));
    const onsetForce = scale(onsetStretch, k);
    const onsetCapacity = capacity(onset);
    const onsetForceLength = len(onsetForce);
    if ((onsetCapacity > 0 && !(onsetForceLength > 0)) || Math.abs(onsetForceLength - onsetCapacity)
      > 1e-7 * Math.max(Number.MIN_VALUE, onsetForceLength, onsetCapacity))
      return rejected(inputStretch, 'Yield root is not representable at working precision', k);

    const phi0 = Math.atan2(velocity.x * onsetForce.y - velocity.y * onsetForce.x,
      velocity.x * onsetForce.x + velocity.y * onsetForce.y);
    const elasticForceIntegral = onset > 0
      ? scale(plus(s0, onsetStretch), k * onset / 2) : zero();
    const velocityAngle = Math.atan2(velocity.y, velocity.x);
    const e = { x: Math.cos(velocityAngle), y: Math.sin(velocityAngle) };
    const qLog = Math.log(Math.abs(Math.sin(phi0 / 2))) - Math.log(Math.abs(Math.cos(phi0 / 2)));
    const nearAntiparallel = velocity.x * onsetForce.x + velocity.y * onsetForce.y < 0
      && Math.abs(velocity.x * onsetForce.y - velocity.y * onsetForce.x)
        <= 16 * Number.EPSILON * speed * onsetForceLength;
    const yieldedTime = h - onset;
    const capacityArea = (lo: number, hi: number): number => {
      const width = hi - lo;
      return width * (capacity(lo) + capacity(hi)) / 2;
    };
    const finalCapacity = capacity(h);
    const phaseAtEnd = onsetCapacity > 0 && finalCapacity > 0
      ? (rdot === 0 ? k * speed * yieldedTime / onsetCapacity
        : k * speed * Math.log1p((finalCapacity - onsetCapacity) / onsetCapacity) / rdot)
      : Number.POSITIVE_INFINITY;
    const tailPhase = Number.isFinite(qLog) ? Math.max(0, qLog + 32) : 32;
    const phaseCut = Math.min(phaseAtEnd, tailPhase);

    let plasticForceIntegral = zero();
    if (nearAntiparallel) {
      const area = capacityArea(onset, h);
      plasticForceIntegral = scale(e, -area);
      plasticDissipation = Math.max(0, (-speed - rdot / k) * area);
    } else if (onsetCapacity === 0) {
      // The cap starts at zero. An immediately yielding patch has the unique
      // limiting direction e; its force and dissipation are affine-cap areas.
      const area = capacityArea(onset, h);
      plasticForceIntegral = scale(e, area);
      plasticDissipation = Math.max(0, (speed - rdot / k) * area);
    } else {
      const directionAtPhase = (phase: number): Vec2 => {
        const half = phi0 / 2;
        const decay = Math.exp(Math.max(-745, Math.min(0, -phase)));
        const phi = 2 * Math.atan2(Math.sin(half) * decay, Math.cos(half));
        const theta = velocityAngle + phi;
        return { x: Math.cos(theta), y: Math.sin(theta) };
      };

      let quadrature: Integral;
      let tailStart = h;
      let exactTailArea: number | null = null;
      let approximateAlignedTail = false;
      const logStartCapacity = Math.log(onsetCapacity);
      // When capacity changes much faster than the direction evolves, phase
      // time alone can hide a narrow force layer at its endpoint. Integrate in
      // log-capacity instead; this resolves the area-weighted force scale.
      const capacityDominates = Math.abs(rdot) / (k * speed) > 1;
      if (capacityDominates) {
        const logEnd = R1 === 0 ? Number.NEGATIVE_INFINITY : Math.log(R1) - logStartCapacity;
        const logCut = rdot < 0 ? Math.max(logEnd, -40) : logEnd;
        const directionAtLogCapacity = (logCapacity: number): Vec2 =>
          directionAtPhase(k * speed * logCapacity / rdot);
        quadrature = adaptiveCompositeIntegral(logCapacity => {
          const cap = Math.exp(logStartCapacity + logCapacity);
          const n = directionAtLogCapacity(logCapacity);
          const forceScale = cap * cap / rdot;
          const dissipationDensity = forceScale * (speed * dot(n, e) - rdot / k);
          return [forceScale * n.x, forceScale * n.y, dissipationDensity];
        }, 0, logCut, absTol, relTol, maxEvaluations, maxDepth);
        if (rdot < 0 && logEnd < logCut) {
          const cutoffCapacity = Math.exp(logStartCapacity + logCut);
          exactTailArea = Math.max(0, (cutoffCapacity * cutoffCapacity - R1 * R1)
            / (2 * Math.abs(rdot)));
          approximateAlignedTail = true;
        }
      } else {
        const phaseEnd = Math.min(phaseAtEnd, phaseCut);
        const timeAtPhase = (phase: number): number => {
          if (rdot === 0) return onset + phase * onsetCapacity / (k * speed);
          const exponent = rdot * phase / (k * speed);
          if (Math.abs(exponent) < .5)
            return onset + onsetCapacity * Math.expm1(exponent) / rdot;
          const cap = Math.exp(logStartCapacity + exponent);
          return onset + (cap - onsetCapacity) / rdot;
        };
        const capAtPhase = (phase: number): number => {
          if (rdot === 0) return onsetCapacity;
          return Math.exp(logStartCapacity + rdot * phase / (k * speed));
        };
        quadrature = adaptiveCompositeIntegral(phase => {
          const cap = capAtPhase(phase);
          const n = directionAtPhase(phase);
          const forceScale = cap * cap / (k * speed);
          const dissipationDensity = cap * cap / k
            * (dot(n, e) - rdot / (k * speed));
          return [forceScale * n.x, forceScale * n.y, Math.max(0, dissipationDensity)];
        }, 0, phaseEnd, absTol, relTol, maxEvaluations, maxDepth);
        if (phaseAtEnd > phaseEnd) {
          tailStart = timeAtPhase(phaseEnd);
          approximateAlignedTail = true;
        }
      }
      quadratureFailure = quadrature.failure;
      plasticForceIntegral = quadrature.force;
      plasticDissipation = quadrature.dissipation;
      errorImpulse = quadrature.errorForce;
      errorDissipation = quadrature.errorDissipation;
      evaluations = quadrature.evaluations;

      if (approximateAlignedTail) {
        const tailArea = exactTailArea ?? capacityArea(tailStart, h);
        plasticForceIntegral = plus(plasticForceIntegral, scale(e, tailArea));
        plasticDissipation += Math.max(0, (speed - rdot / k) * tailArea);
        // In the phase coordinate the omitted direction has |n-e|<=2e^-32.
        // In the log-capacity coordinate the remaining force area is the
        // small cutoff tail itself, so bound its unknown direction directly.
        if (capacityDominates) {
          errorImpulse += 2 * tailArea;
          errorDissipation += 2 * speed * tailArea;
        } else {
          errorImpulse += 2 * Math.exp(-32) * tailArea;
          errorDissipation += 2 * speed * Math.exp(-64) * tailArea;
        }
      }
    }
    forceIntegral = plus(elasticForceIntegral, plasticForceIntegral);
    const endForceMagnitude = nearAntiparallel ? finalCapacity : finalCapacity;
    const endDirection = nearAntiparallel ? scale(e, -1)
      : (onsetCapacity === 0 || phaseAtEnd > phaseCut ? e : (() => {
          const half = phi0 / 2;
          const decay = Math.exp(Math.max(-745, Math.min(0, -phaseAtEnd)));
          const phi = 2 * Math.atan2(Math.sin(half) * decay, Math.cos(half));
          const theta = velocityAngle + phi;
          return { x: Math.cos(theta), y: Math.sin(theta) };
        })());
    finalStretch = scale(endDirection, endForceMagnitude / k);
  }

  const potentialAfter = .5 * k * dot(finalStretch, finalStretch);
  const footImpulse = scale(forceIntegral, -1);
  // Work uses the actual chord velocity. Initial return is a separate t=0
  // dissipation; its energy loss is not counted as an applied impulse.
  const workResidual = dot(footImpulse, velocity)
    + (potentialAfter - potentialBefore)
    + plasticDissipation + initialReturnDissipation;
  const finiteResult = [finalStretch.x, finalStretch.y, forceIntegral.x, forceIntegral.y,
    capacityImpulse, potentialBefore, potentialAfter, plasticDissipation,
    initialReturnDissipation, plasticDissipation + initialReturnDissipation,
    errorImpulse, errorDissipation, workResidual].every(Number.isFinite);
  const accepted = !quadratureFailure && finiteResult
    && withinImpulseCapacity(forceIntegral, capacityImpulse)
    && errorImpulse <= absTol + relTol * norm2(forceIntegral)
    && errorDissipation <= absTol + relTol * Math.abs(plasticDissipation)
    && withinWorkTolerance(workResidual, absTol, relTol,
      [potentialBefore, potentialAfter, dot(footImpulse, velocity), plasticDissipation, initialReturnDissipation]);
  const reason = quadratureFailure ?? (!finiteResult ? 'Nonfinite shear result or ledger'
    : (accepted ? null : 'Sole shear quadrature or work residual exceeds tolerance'));
  if (!accepted) return rejected(inputStretch, reason!, k);

  return {
    stretch: finalStretch,
    report: {
      accepted: true, reason: null, branch, onsetTime: onset,
      forceIntegral, footImpulse, capacityImpulse,
      potentialBefore, potentialAfter, plasticDissipation,
      initialReturnDissipation, totalDissipation: plasticDissipation + initialReturnDissipation,
      quadratureErrorImpulse: errorImpulse,
      quadratureErrorDissipation: errorDissipation,
      quadratureEvaluations: evaluations,
      workResidual,
    },
  };
}
