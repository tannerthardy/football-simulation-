/** Independent exact 1D elastic-perfectly-plastic sole-traction reference.
 * This is a continuum target, not a physics backend or a calibrated foot law.
 * Node 22: node --import tsx scripts/diag/sole-traction-reference.ts [output.json]
 * Import advanceSoleTractionReference for a constant-load comparison interval.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceVersion } from '../source-version.js';

export interface SoleTractionReferenceParameters {
  mass: number;
  normalLoad: number;
  friction: number;
  tangentialStiffness: number;
  /** Constant physical tangential force during this interval. */
  externalForce?: number;
}
export interface SoleTractionReferenceState {
  position: number;
  velocity: number;
  /** Elastic stretch e=x-p. Plastic displacement p=position-stretch. */
  stretch: number;
}
export interface SoleTractionReferenceSegment {
  startTime: number;
  duration: number;
  phase: 'elastic' | 'sliding' | 'unloaded';
  before: SoleTractionReferenceState;
  after: SoleTractionReferenceState;
  tractionImpulse: number;
  externalWork: number;
  plasticDissipation: number;
  maximumForceMagnitude: number;
}
export interface SoleTractionReferenceEvent {
  time: number;
  kind: 'yield' | 'unloading';
  sign: number;
  state: SoleTractionReferenceState;
}
export interface SoleTractionReferenceResult {
  state: SoleTractionReferenceState;
  advancedTime: number;
  capacity: number;
  segments: SoleTractionReferenceSegment[];
  events: SoleTractionReferenceEvent[];
  totals: { tractionImpulse: number; externalWork: number; plasticDissipation: number };
  budgets: { initialEnergy: number; finalEnergy: number; energyResidual: number; momentumResidual: number };
}

const twoPi = 2 * Math.PI;
const copy = (s: SoleTractionReferenceState): SoleTractionReferenceState => ({ ...s });
function parameters(p: SoleTractionReferenceParameters) {
  const { mass: m, normalLoad: N, friction: mu, tangentialStiffness: k } = p, F = p.externalForce ?? 0;
  if (![m, N, mu, k, F].every(Number.isFinite) || m <= 0 || N < 0 || mu < 0 || k <= 0)
    throw new RangeError('Finite positive mass/stiffness and nonnegative load/friction required');
  return { m, k, F, capacity: mu * N, omega: Math.sqrt(k / m) };
}
function elasticAt(s: SoleTractionReferenceState, t: number, m: number, k: number, F: number): SoleTractionReferenceState {
  const omega = Math.sqrt(k / m), equilibrium = F / k, A = s.stretch - equilibrium, B = s.velocity / omega;
  const c = Math.cos(omega * t), sin = Math.sin(omega * t);
  const stretch = equilibrium + A * c + B * sin;
  return { position: s.position + stretch - s.stretch, stretch, velocity: omega * (-A * sin + B * c) };
}
/** Exact unconstrained elastic oscillator; valid only until its first yield. */
export function soleTractionElasticReference(p: SoleTractionReferenceParameters, s: SoleTractionReferenceState, time: number): SoleTractionReferenceState {
  const { m, k, F } = parameters(p);
  if (!Number.isFinite(time) || time < 0) throw new RangeError('Nonnegative finite time required');
  return elasticAt(s, time, m, k, F);
}
function firstYield(s: SoleTractionReferenceState, duration: number, m: number, k: number, F: number, capacity: number): { time: number; sign: number } | null {
  const omega = Math.sqrt(k / m), equilibrium = F / k, A = s.stretch - equilibrium, B = s.velocity / omega;
  const radius = Math.hypot(A, B), phi = Math.atan2(B, A);
  if (radius === 0) return null;
  let first: { time: number; sign: number } | null = null;
  for (const sign of [-1, 1]) {
    const target = sign * capacity / k, u = (target - equilibrium) / radius;
    // |u|=1 is a grazing maximum/minimum with zero outward velocity, not a
    // plastic episode. The undamped spring then unloads without dissipation.
    if (!(u > -1 && u < 1)) continue;
    const raw = phi - sign * Math.acos(u);
    let angle = raw + twoPi * Math.ceil(-raw / twoPi);
    if (angle < 0) angle += twoPi;
    let time = angle / omega;
    // The caller already handles an outward boundary state. A root at zero
    // here is the previous yield/stop boundary, so choose its next crossing.
    if (time <= 64 * Number.EPSILON / omega) time += twoPi / omega;
    if (time <= duration && (!first || time < first.time)) first = { time, sign };
  }
  return first;
}
function elasticMaximumForce(s: SoleTractionReferenceState, duration: number, m: number, k: number, F: number): number {
  const omega = Math.sqrt(k / m), equilibrium = F / k, A = s.stretch - equilibrium, B = s.velocity / omega;
  const phi = Math.atan2(B, A), final = elasticAt(s, duration, m, k, F);
  let maximum = Math.max(Math.abs(k * s.stretch), Math.abs(k * final.stretch));
  let angle = phi + Math.PI * Math.ceil(-phi / Math.PI);
  for (; angle <= omega * duration; angle += Math.PI)
    if (angle >= 0) maximum = Math.max(maximum, Math.abs(k * (equilibrium + A * Math.cos(angle) + B * Math.sin(angle))));
  return maximum;
}

/** Exact phase-event continuation of m*x''=F-k*e with |k*e|<=mu*N.
 * Elastic: p'=0, e'=v. Outward sliding: e'=0, p'=v, f=sign(v)*mu*N.
 * A sliding stop starts elastic unloading; it does not erase stored energy.
 * All events come from analytic roots, not a timestep or velocity threshold.
 */
export function advanceSoleTractionReference(p: SoleTractionReferenceParameters, before: SoleTractionReferenceState, horizon: number): SoleTractionReferenceResult {
  const { m, k, F, capacity, omega } = parameters(p);
  if (![before.position, before.velocity, before.stretch, horizon].every(Number.isFinite) || horizon < 0)
    throw new RangeError('Finite state and nonnegative finite horizon required');
  const strainLimit = capacity / k;
  const strainRoundoff = 128 * Number.EPSILON * Math.max(1, strainLimit, Math.abs(before.stretch));
  if (Math.abs(before.stretch) > strainLimit + strainRoundoff)
    throw new RangeError('Initial spring force is outside the fixed yield disk; no energy-reset projection supplied');
  const initialEnergy = .5 * m * before.velocity ** 2 + .5 * k * before.stretch ** 2;
  let state = copy(before), time = 0, transitions = 0;
  const segments: SoleTractionReferenceSegment[] = [], events: SoleTractionReferenceEvent[] = [];
  let tractionImpulse = 0, externalWork = 0, plasticDissipation = 0;
  while (time < horizon) {
    if (++transitions > 100000) throw new RangeError('Reference event count exceeded; interval remains unreported');
    const remaining = horizon - time, old = copy(state);
    let duration = remaining, phase: SoleTractionReferenceSegment['phase'], impulse: number, loss = 0, maxForce: number;
    let event: { kind: SoleTractionReferenceEvent['kind']; sign: number } | null = null;
    if (capacity === 0) {
      if (Math.abs(state.stretch) > strainRoundoff) throw new RangeError('Zero-load reference requires zero elastic stretch');
      phase = 'unloaded'; const acceleration = F / m;
      state = { position: old.position + old.velocity * duration + .5 * acceleration * duration ** 2,
        velocity: old.velocity + acceleration * duration, stretch: old.stretch };
      impulse = 0; maxForce = 0;
    } else {
      const sign = Math.sign(state.stretch);
      const atYield = sign !== 0 && Math.abs(Math.abs(state.stretch) - strainLimit) <= strainRoundoff;
      const acceleration = (F - sign * capacity) / m;
      const sliding = atYield && (sign * state.velocity > 0 || (state.velocity === 0 && sign * acceleration > 0));
      if (sliding) {
        phase = 'sliding';
        const stop = old.velocity * acceleration < 0 ? -old.velocity / acceleration : Infinity;
        if (stop <= duration) { duration = stop; event = { kind: 'unloading', sign }; }
        state = { position: old.position + old.velocity * duration + .5 * acceleration * duration ** 2,
          velocity: old.velocity + acceleration * duration, stretch: old.stretch };
        if (event) state.velocity = 0; // The analytically resolved zero-velocity event.
        impulse = sign * capacity * duration; loss = capacity * Math.abs(state.position - old.position); maxForce = capacity;
      } else {
        phase = 'elastic';
        const yieldEvent = firstYield(state, duration, m, k, F, capacity);
        if (yieldEvent) { duration = yieldEvent.time; event = { kind: 'yield', sign: yieldEvent.sign }; }
        state = elasticAt(old, duration, m, k, F);
        if (event) { // Exact root endpoint, with floating-point trig roundoff removed.
          const stretch = event.sign * strainLimit; state.position += stretch - state.stretch; state.stretch = stretch;
        }
        const A = old.stretch - F / k, B = old.velocity / omega;
        // Independent exact force integral, rather than inferring it from m*Δv.
        impulse = F * duration + k * (A * Math.sin(omega * duration) + B * (1 - Math.cos(omega * duration))) / omega;
        maxForce = elasticMaximumForce(old, duration, m, k, F);
      }
    }
    const work = F * (state.position - old.position);
    segments.push({ startTime: time, duration, phase, before: old, after: copy(state),
      tractionImpulse: impulse, externalWork: work, plasticDissipation: loss, maximumForceMagnitude: maxForce });
    tractionImpulse += impulse; externalWork += work; plasticDissipation += loss; time += duration;
    if (event) events.push({ time, ...event, state: copy(state) });
    if (horizon - time <= 8 * Number.EPSILON * Math.max(1, horizon)) time = horizon;
  }
  const finalEnergy = .5 * m * state.velocity ** 2 + .5 * k * state.stretch ** 2;
  return { state, advancedTime: time, capacity, segments, events,
    totals: { tractionImpulse, externalWork, plasticDissipation },
    budgets: { initialEnergy, finalEnergy, energyResidual: finalEnergy - initialEnergy - externalWork + plasticDissipation,
      momentumResidual: m * (state.velocity - before.velocity) - F * horizon + tractionImpulse } };
}

function main() {
  if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run this reference with Node 22');
  if (process.argv.length > 3 || process.argv[2]?.startsWith('--')) throw new Error('Specify at most one output path');
  const output = process.argv[2] ?? 'out/sole-traction-reference.json';
  const self = fileURLToPath(import.meta.url), scriptHash = () => createHash('sha256').update(readFileSync(self)).digest('hex');
  const sourceSha256Start = sourceVersion(), scriptSha256Start = scriptHash();
  const mass = 2, normalLoad = 500, horizon = .12;
  const cases: Array<{ id: string; parameters: SoleTractionReferenceParameters; initial: SoleTractionReferenceState }> = [];
  for (const tangentialStiffness of [1000, 4000]) for (const friction of [.2, .6]) for (const velocity of [.1, 2])
    cases.push({ id: `free-k${tangentialStiffness}-mu${friction}-v${velocity}`,
      parameters: { mass, normalLoad, friction, tangentialStiffness, externalForce: 0 }, initial: { position: 0, stretch: 0, velocity } });
  const forced = { mass, normalLoad, friction: .2, tangentialStiffness: 4000 };
  for (const externalForce of [40, 75, 120]) cases.push({ id: `force-step-${externalForce}`, parameters: { ...forced, externalForce }, initial: { position: 0, stretch: 0, velocity: 0 } });
  cases.push({ id: 'below-cap-static-root', parameters: { ...forced, externalForce: 40 }, initial: { position: .01, stretch: .01, velocity: 0 } });
  cases.push({ id: 'loaded-spring-release', parameters: { ...forced, externalForce: 0 }, initial: { position: .025, stretch: .025, velocity: 0 } });
  const rows = cases.map(c => {
    const exact = advanceSoleTractionReference(c.parameters, c.initial, horizon);
    const partitions = [.04, .02, .01, .005].map(h => {
      let state = copy(c.initial), time = 0, impulse = 0, work = 0, loss = 0, pieces = 0, maxForce = 0;
      const events: SoleTractionReferenceEvent[] = [];
      while (time < horizon) {
        const dt = Math.min(h, horizon - time), part = advanceSoleTractionReference(c.parameters, state, dt);
        part.events.forEach(e => events.push({ ...e, time: time + e.time }));
        maxForce = Math.max(maxForce, ...part.segments.map(s => s.maximumForceMagnitude));
        state = part.state; time += dt; pieces++;
        impulse += part.totals.tractionImpulse; work += part.totals.externalWork; loss += part.totals.plasticDissipation;
        if (horizon - time <= 8 * Number.EPSILON) time = horizon;
      }
      return { h, pieces, state, events, maximumForceMagnitude: maxForce,
        endpointDifference: Math.max(Math.abs(state.position - exact.state.position), Math.abs(state.velocity - exact.state.velocity), Math.abs(state.stretch - exact.state.stretch)),
        forceIntegralDifference: impulse - exact.totals.tractionImpulse, externalWorkDifference: work - exact.totals.externalWork,
        dissipationDifference: loss - exact.totals.plasticDissipation };
    });
    const mirrored = advanceSoleTractionReference({ ...c.parameters, externalForce: -(c.parameters.externalForce ?? 0) },
      { position: -c.initial.position, stretch: -c.initial.stretch, velocity: -c.initial.velocity }, horizon);
    const mirrorDifference = Math.max(Math.abs(mirrored.state.position + exact.state.position), Math.abs(mirrored.state.velocity + exact.state.velocity),
      Math.abs(mirrored.state.stretch + exact.state.stretch), Math.abs(mirrored.totals.plasticDissipation - exact.totals.plasticDissipation));
    return { ...c, horizon, exact, partitions, mirrorDifference };
  });
  const row = (id: string) => rows.find(r => r.id === id)!;
  const checks = {
    allCompleted: rows.every(r => r.exact.advancedTime === horizon),
    forceCapacityRespected: rows.every(r => r.exact.segments.every(s => s.maximumForceMagnitude <= r.exact.capacity + 1e-9)
      && r.partitions.every(p => p.maximumForceMagnitude <= r.exact.capacity + 1e-9)),
    energyAndMomentumClose: rows.every(r => Math.abs(r.exact.budgets.energyResidual) < 1e-9 && Math.abs(r.exact.budgets.momentumResidual) < 1e-9),
    phasePartitionInvariance: rows.every(r => r.partitions.every(p => Math.max(p.endpointDifference, Math.abs(p.forceIntegralDifference), Math.abs(p.externalWorkDifference), Math.abs(p.dissipationDifference)) < 1e-9)),
    mirrorInvariance: rows.every(r => r.mirrorDifference < 1e-9),
    freeHighSpeedYieldAndReversal: row('free-k4000-mu0.2-v2').exact.events.some(e => e.kind === 'yield')
      && row('free-k4000-mu0.2-v2').exact.events.some(e => e.kind === 'unloading'),
    safeSubcapStepRemainsElastic: row('force-step-40').exact.events.length === 0,
    subcapForceCanYieldTransiently: row('force-step-75').exact.events.some(e => e.kind === 'yield') && row('force-step-75').exact.events.some(e => e.kind === 'unloading'),
    aboveCapStepKeepsSliding: row('force-step-120').exact.segments.at(-1)?.phase === 'sliding',
    staticRootRemainsStill: Math.max(Math.abs(row('below-cap-static-root').exact.state.velocity), Math.abs(row('below-cap-static-root').exact.state.position - .01)) < 1e-12,
    springReleaseDoesNotEraseEnergy: row('loaded-spring-release').exact.totals.plasticDissipation < 1e-12
      && Math.abs(row('loaded-spring-release').exact.budgets.finalEnergy - 1.25) < 1e-9,
  };
  const sourceSha256End = sourceVersion(), scriptSha256End = scriptHash();
  if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End) throw new Error('Source or script changed during execution; output withheld');
  const input = { footMass: mass, footIsotropicInertia: .008, contactLocalPoint: { x: 0, y: 0, z: 0 }, gravityZ: -10,
    normalStiffness: 50000, normalGap: -.01, normalVelocity: 0, knownCentralDownwardForce: 480, normalLoad,
    normalBalance: 'K*(-gap)=500=mass*10+480, so z stays constant and contact has no torque or plane event', horizon,
    units: 'kg, yd, s', tangentialDamping: 0, stiffnesses: [1000, 4000], friction: [.2, .6], initialVelocities: [.1, 2] };
  const equations = { elastic: 'e=x-p; pDot=0; eDot=v; m*vDot=F-Kt*e',
    sliding: 'At |Kt*e|=mu*N and outward motion, eDot=0, pDot=v, m*vDot=F-sign(v)*mu*N',
    unloading: 'At a sliding stop whose acceleration points inward, the spring unloads elastically; no stored-energy reset',
    energy: 'Delta(.5*m*v^2+.5*Kt*e^2)=F*Delta(x)-integral(mu*N*abs(pDot) dt)',
    noYieldFreeCondition: 'abs(v0) <= mu*N/sqrt(m*Kt) for zero initial stretch and external force',
    forcedUndampedStep: 'For e0=v0=0 and F below cap/2, f=F*(1-cos(sqrt(Kt/m)*t)) never yields; subcap static root e=F/Kt exists but no asymptotic settling without dissipation' };
  mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify({ sourceSha256Start, sourceSha256End, scriptSha256Start,
    scriptSha256End, node: process.version, input, equations, rows, checks,
    scope: 'Exact continuous 1D constant-normal-load elastic-perfectly-plastic traction with physical point force at the foot COM. No rotation coupling, time-varying normal, unloading contact, tangential viscous damping, joint force, production solver imports, NFL calibration or readiness claim. Partition invariance is an exact-reference check, not a measured numerical convergence order.' }, null, 2) + '\n');
  console.log(JSON.stringify({ output, sourceSha256Start, scriptSha256Start, checks, rows: rows.map(r => ({ id: r.id, state: r.exact.state,
    events: r.exact.events, totals: r.exact.totals, budgets: r.exact.budgets, maximumPartitionDifference: Math.max(...r.partitions.map(p => p.endpointDifference)) })) }, null, 2));
  if (Object.values(checks).some(x => !x)) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
