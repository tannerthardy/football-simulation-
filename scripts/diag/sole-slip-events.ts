/** Saved-state stop/unload audit against an independent continuum reference.
 * Research support kernel only; no World or football calibration.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { deepStrictEqual } from 'node:assert';
import { sourceVersion } from '../source-version.js';
import { advanceSpatialSoleCompliance, advanceSpatialSoleSlipStop,
  createSpatialSoleShearState, type CompliantSoleMaterial, type SpatialSoleShearState } from '../../src/physics/spatial-sole-compliance.js';
import type { SpatialSupportState, SpatialImpulseSet } from '../../src/physics/spatial-support.js';
import type { MaterialRigidState, Vec3 } from '../../src/physics/material-rigid.js';
import { advanceSoleTractionReference } from './sole-traction-reference.js';

if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run with pinned Node 22');
if (process.argv.length > 3 || process.argv[2]?.startsWith('--')) throw new Error('Specify at most one output path');
const output = process.argv[2] ?? 'out/sole-slip-events.json';
const self = fileURLToPath(import.meta.url), referencePath = fileURLToPath(new URL('./sole-traction-reference.ts', import.meta.url));
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const sourceSha256Start = sourceVersion(), scriptSha256Start = hash(self), referenceSha256Start = hash(referencePath);
const started = performance.now();
const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const copy = <T>(a: T): T => structuredClone(a);
const bodies = (s: SpatialSupportState) => [s.torso, ...s.feet];
type Axis = 'x' | 'y';
interface Input { id: string; mass: number; normal: number; mu: number; kt: number; speed: number; force: number; horizon: number }
interface Representation { axis: Axis; sign: number; foot: 0 | 1; count: number; shift: number }
const baseline: Representation = { axis: 'x', sign: 1, foot: 0, count: 1, shift: 0 };
const inputs: Input[] = [
  { id: 'loaded-stop', mass: 2, normal: 500, mu: .2, kt: 4000, speed: 2, force: 0, horizon: .12 },
  { id: 'loaded-opposing-force', mass: 2, normal: 500, mu: .2, kt: 4000, speed: .4, force: -40, horizon: .12 },
  { id: 'loaded-assisting-force', mass: 2, normal: 500, mu: .2, kt: 4000, speed: 2, force: 40, horizon: .12 },
  { id: 'stop-outside-horizon', mass: 2, normal: 500, mu: .2, kt: 4000, speed: 2, force: 75, horizon: .12 },
  { id: 'accelerating-no-stop', mass: 2, normal: 500, mu: .2, kt: 4000, speed: 2, force: 120, horizon: .12 },
  { id: 'exact-force-balance-no-stop', mass: 2, normal: 500, mu: .2, kt: 4000, speed: .4, force: 100, horizon: .06 },
  { id: 'off-grid-stop', mass: 2, normal: 500, mu: .2, kt: 4000, speed: .37, force: 0, horizon: .037 },
  { id: 'different-capabilities', mass: 3, normal: 420, mu: .35, kt: 2400, speed: .8, force: 15, horizon: .06 },
];
function fixture(p: Input, r: Representation) {
  const make = (mass: number, inertia: number, z: number): MaterialRigidState => ({ mass, inertia,
    position: { x: r.shift, y: r.shift, z }, velocity: zero(), angularMomentum: zero(),
    basis: [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }] });
  const foot = make(p.mass, .008, -.01); foot.velocity[r.axis] = r.sign * p.speed;
  const other = make(2, .008, 3);
  const state: SpatialSupportState = { torso: make(1, 1, 10), feet: r.foot === 0 ? [foot, other] : [other, foot],
    gravity: { x: 0, y: 0, z: -10 }, legs: [0, 1].map(() => ({ hip: zero(), ankle: zero(),
      compliance: { restLength: 1, stiffness: 1, forceCap: 0, damping: 0, dampingCap: 0 } })) as SpatialSupportState['legs'] };
  const patches = Array.from({ length: r.count }, (_, i) => ({ id: `patch${i}`, local: zero(), areaWeight: 1 / r.count, friction: p.mu }));
  const material: CompliantSoleMaterial = { points: [copy(patches), copy(patches)], stiffness: [p.normal / .01, p.normal / .01],
    damping: [0, 0], shearStiffness: [p.kt, p.kt] };
  const shear = createSpatialSoleShearState(material);
  shear.points.filter(q => q.foot === r.foot).forEach(q => { q.stretch[r.axis] = r.sign * p.mu * p.normal / p.kt; });
  const forces = [{}, {}, {}] as [{ center?: Vec3 }, { center?: Vec3 }, { center?: Vec3 }];
  forces[r.foot + 1].center = { ...zero(), [r.axis]: r.sign * p.force, z: p.mass * 10 - p.normal };
  return { state, material, shear, forces };
}
const impulses = (forces: ReturnType<typeof fixture>['forces'], h: number): SpatialImpulseSet => forces.map(f => f.center
  ? { center: { x: f.center.x * h, y: f.center.y * h, z: f.center.z * h } } : {}) as SpatialImpulseSet;
function energy(s: SpatialSupportState, mat: CompliantSoleMaterial, shear: SpatialSoleShearState) {
  let e = bodies(s).reduce((n, b) => n + .5 * b.mass * dot(b.velocity, b.velocity)
    + .5 * dot(b.angularMomentum, b.angularMomentum) / b.inertia - b.mass * dot(s.gravity, b.position), 0);
  mat.points.forEach((points, f) => points.forEach(p => {
    e += .5 * mat.stiffness[f] * p.areaWeight * Math.max(0, -s.feet[f].position.z) ** 2;
    const q = shear.points.find(q => q.foot === f && q.id === p.id)!.stretch;
    e += .5 * mat.shearStiffness![f] * p.areaWeight * (q.x * q.x + q.y * q.y);
  }));
  return e;
}
type Result = ReturnType<typeof advanceSpatialSoleCompliance>;
const violations: string[] = [];
let ordinaryIntervals = 0, eventIntervals = 0, rejectedIntervals = 0;
const maxima = { momentum: 0, work: 0, capExcess: 0, strainLaw: 0, forceLaw: 0, stopVelocity: 0, stopTime: 0, stopRetention: 0 };
/** Independent piecewise integration in chord displacement, not the production
 * shear integrator. Valid for the stated collinear constant-normal class. */
function chordLaw(e: number, dx: number, k: number, R: number, h: number) {
  const end = Math.max(-R / k, Math.min(R / k, e + dx));
  let average = k * (e + .5 * dx), loss = 0;
  if (dx !== 0 && end !== e + dx) {
    const sign = Math.sign(dx), u = Math.max(0, Math.min(1, (sign * R / k - e) / dx));
    average = k * (e * u + .5 * dx * u * u) + sign * R * (1 - u);
    loss = R * Math.abs(dx - (end - e));
  }
  return { stretch: end, impulse: -average * h, loss };
}
function audit(before: SpatialSupportState, shear: SpatialSoleShearState, result: Result, mat: CompliantSoleMaterial,
  h: number, forces: ReturnType<typeof fixture>['forces'], r: Representation, label: string) {
  const after = result.state, nextShear = result.shearState!;
  const expected = bodies(before).map((b, i) => ({ x: (forces[i].center?.x ?? 0) * h + b.mass * before.gravity.x * h,
    y: (forces[i].center?.y ?? 0) * h + b.mass * before.gravity.y * h,
    z: (forces[i].center?.z ?? 0) * h + b.mass * before.gravity.z * h }));
  let work = 0, loss = 0, normalJ = 0, tangentJ = 0, forceLaw = 0, strainLaw = 0, capExcess = 0;
  bodies(before).forEach((b, i) => { const n = bodies(after)[i];
    const dp = { x: n.position.x - b.position.x, y: n.position.y - b.position.y, z: n.position.z - b.position.z };
    work += dot(forces[i].center ?? zero(), dp);
  });
  mat.points.forEach((ps, f) => ps.forEach(p => {
    const g0 = before.feet[f].position.z, g1 = after.feet[f].position.z;
    const N0 = mat.stiffness[f] * p.areaWeight * Math.max(0, -g0), N1 = mat.stiffness[f] * p.areaWeight * Math.max(0, -g1);
    const Jn = .5 * (N0 + N1) * h;
    const e0 = shear.points.find(q => q.foot === f && q.id === p.id)!.stretch[r.axis];
    const e1 = nextShear.points.find(q => q.foot === f && q.id === p.id)!.stretch[r.axis];
    const dx = after.feet[f].position[r.axis] - before.feet[f].position[r.axis];
    const k = mat.shearStiffness![f] * p.areaWeight, R = p.friction! * N0;
    const law = chordLaw(e0, dx, k, R, h);
    expected[f + 1].z += Jn; expected[f + 1][r.axis] += law.impulse;
    loss += law.loss; strainLaw = Math.max(strainLaw, Math.abs(e1 - law.stretch));
    const report = result.report.solePoints.find(q => q.foot === f && q.id === p.id)!;
    forceLaw = Math.max(forceLaw, Math.abs((report.shear?.constitutive.footImpulse[r.axis] ?? 0) - law.impulse));
    capExcess = Math.max(capExcess, Math.abs(law.impulse) - p.friction! * Jn);
    if (f === r.foot) { normalJ += Jn; tangentJ += law.impulse; }
  }));
  const momentum = Math.max(...bodies(before).map((b, i) => {
    const n = bodies(after)[i];
    return Math.max(...(['x', 'y', 'z'] as const).map(a => Math.abs(b.mass * (n.velocity[a] - b.velocity[a]) - expected[i][a])),
      ...(['x', 'y', 'z'] as const).map(a => Math.abs(n.angularMomentum[a] - b.angularMomentum[a])));
  }));
  const error = { momentum, work: Math.abs(energy(after, mat, nextShear) - energy(before, mat, shear) - work + loss),
    capExcess, strainLaw, forceLaw };
  for (const key of Object.keys(error) as Array<keyof typeof error>) maxima[key] = Math.max(maxima[key], error[key]);
  if (Object.values(error).some(e => !Number.isFinite(e) || e > 1e-7)) violations.push(`${label}: independent mechanics ${JSON.stringify(error)}`);
  return { loss, normalJ, tangentJ, externalWork: work };
}

function run(p: Input, nominalStep: number, r = baseline) {
  const f = fixture(p, r); let state = f.state, shear = f.shear, time = 0, timeCorrection = 0, D = 0, Jn = 0, Jt = 0, W = 0, steps = 0;
  const stops: { time: number; position: number; strain: number; retainedEnergy: number; duration: number }[] = [];
  const exact = advanceSoleTractionReference({ mass: p.mass, normalLoad: p.normal, friction: p.mu, tangentialStiffness: p.kt, externalForce: p.force },
    { position: 0, velocity: p.speed, stretch: p.mu * p.normal / p.kt }, p.horizon);
  while (time < p.horizon) {
    if (++steps > 10000) throw new Error('Time/iteration guard reached');
    const remaining = p.horizon - time;
    // Partition the last two ordinary intervals together. A solved stop can
    // differ from a nominal grid by 1e-14s; executing that microscopic tail
    // separately loses material displacement to coordinate roundoff. Execute
    // the entire remaining duration in meaningful bounded pieces instead.
    let h = remaining > nominalStep && remaining < 2 * nominalStep
      ? remaining / 2 : Math.min(nominalStep, remaining);
    const velocity = state.feet[r.foot].velocity[r.axis], e = shear.points.find(q => q.foot === r.foot)!.stretch[r.axis];
    const sign = Math.sign(e), R = p.mu * p.normal;
    const atYield = Math.abs(Math.abs(e) - R / p.kt) < 1e-11;
    const stopping = atYield && sign * velocity > 0 && R - sign * r.sign * p.force > 0;
    const predicted = stopping ? p.mass * Math.abs(velocity) / (R - sign * r.sign * p.force) : Infinity;
    const event = predicted < h && predicted > 0;
    let result: Result;
    if (event) {
      let resolved: ReturnType<typeof advanceSpatialSoleSlipStop>;
      try {
        resolved = advanceSpatialSoleSlipStop(state, f.material, { shearState: shear, foot: r.foot, patchId: 'patch0',
          direction: { x: r.axis === 'x' ? sign : 0, y: r.axis === 'y' ? sign : 0 }, maxDuration: h, externalForces: f.forces });
      } catch (error) {
        throw new Error(`${p.id}/h${nominalStep}/t${time}: event failed for ${JSON.stringify(state.feet[r.foot])}`, { cause: error });
      }
      result = resolved; h = resolved.duration;
      if (result.report.accepted) {
        eventIntervals++;
        const strain = result.shearState!.points.find(q => q.foot === r.foot)!.stretch[r.axis] * r.sign;
        const stop = { time: time + h, position: r.sign * (result.state.feet[r.foot].position[r.axis] - r.shift),
          strain, retainedEnergy: .5 * p.kt * strain ** 2, duration: h };
        stops.push(stop);
        maxima.stopVelocity = Math.max(maxima.stopVelocity, Math.abs(result.state.feet[r.foot].velocity[r.axis]));
        maxima.stopRetention = Math.max(maxima.stopRetention, Math.abs(stop.retainedEnergy - .5 * R * R / p.kt));
        const target = exact.events.filter(q => q.kind === 'unloading')[stops.length - 1];
        if (target) maxima.stopTime = Math.max(maxima.stopTime, Math.abs(stop.time - target.time));
        if (!(h > 0 && h <= nominalStep) || result.state.feet[r.foot].velocity[r.axis] !== 0)
          violations.push(`${p.id}: event has skipped time or nonzero stop`);
      }
    } else {
      // Avoid landing an ordinary step arbitrarily close to the event. This is
      // a controller partition choice, never an endpoint correction.
      if (predicted <= h * 1.01) h = .75 * predicted;
      result = advanceSpatialSoleCompliance(state, h, f.material, { shearState: shear, externalImpulses: impulses(f.forces, h) });
      if (result.report.accepted) ordinaryIntervals++;
    }
    if (!result.report.accepted) { rejectedIntervals++; violations.push(`${p.id}/h${nominalStep}: ${result.report.reason}`); break; }
    const a = audit(state, shear, result, f.material, h, f.forces, r, `${p.id}/h${nominalStep}/${steps}`);
    D += a.loss; Jn += a.normalJ; Jt += a.tangentJ; W += a.externalWork;
    state = result.state; shear = result.shearState!;
    // Sum only accepted physical durations, with compensation. Repeated
    // nominal increments otherwise leave a fake 1e-14s final interval, whose
    // pose displacement is below coordinate resolution. No state is edited.
    const increment = h - timeCorrection, nextTime = time + increment;
    timeCorrection = (nextTime - time) - increment; time = nextTime;
    if (p.horizon - time <= 16 * Number.EPSILON * Math.max(1, p.horizon)) time = p.horizon;
  }
  const endpoint = { position: r.sign * (state.feet[r.foot].position[r.axis] - r.shift), velocity: r.sign * state.feet[r.foot].velocity[r.axis],
    stretch: r.sign * shear.points.find(q => q.foot === r.foot)!.stretch[r.axis] };
  const continuumError = Math.max(Math.abs(endpoint.position - exact.state.position), Math.abs(endpoint.velocity - exact.state.velocity),
    Math.abs(endpoint.stretch - exact.state.stretch), Math.abs(D - exact.totals.plasticDissipation));
  return { nominalStep, representation: r, completedTime: time, steps, stops, endpoint, plasticDissipation: D, normalImpulse: Jn,
    tractionImpulse: -r.sign * Jt, externalWork: W, continuumError,
    tractionImpulseError: Math.abs(-r.sign * Jt - exact.totals.tractionImpulse),
    normalImpulseError: Math.abs(Jn - p.normal * time), exact };
}

const rows = inputs.map(p => {
  const runs = [.0016, .0008, .0004].map(h => run(p, h));
  const fine = runs.at(-1)!;
  if (runs.some(r => r.completedTime !== p.horizon) || fine.continuumError > .0005 || fine.tractionImpulseError > .001
    || runs.slice(1).some((r, i) => r.continuumError > runs[i].continuumError * .8 + 1e-8)) violations.push(`${p.id}: continuum completion/refinement gate`);
  return { input: p, runs, refinementRatios: runs.slice(0, -1).map((r, i) => r.continuumError / runs[i + 1].continuumError) };
});
const representations = [
  { ...baseline, sign: -1 }, { ...baseline, axis: 'y' as const }, { ...baseline, foot: 1 as const },
  { ...baseline, count: 2 }, { ...baseline, count: 3 }, { ...baseline, shift: 1.25 },
].map(r => run(inputs[0], .0008, r));
const original = rows[0].runs[1];
const representationErrors = representations.map(r => Math.max(Math.abs(r.endpoint.position - original.endpoint.position),
  Math.abs(r.endpoint.velocity - original.endpoint.velocity), Math.abs(r.endpoint.stretch - original.endpoint.stretch),
  Math.abs(r.plasticDissipation - original.plasticDissipation), Math.abs(r.tractionImpulse - original.tractionImpulse)));
if (representationErrors.some(e => e > 1e-8)) violations.push('Mirror/coordinate/foot-slot/patch-split/translation invariance');
const offGrid = run(inputs[0], .00037);
if (offGrid.completedTime !== inputs[0].horizon || offGrid.continuumError > .0005 || offGrid.stops.length !== 1)
  violations.push('Off-grid partition completion/continuum gate');

const rejectionChecks = [inputs[3], inputs[4]].map(p => {
  const f = fixture(p, baseline), before = copy({ state: f.state, shear: f.shear });
  const q = advanceSpatialSoleSlipStop(f.state, f.material, { shearState: f.shear, foot: 0, patchId: 'patch0',
    direction: { x: 1, y: 0 }, maxDuration: .01, externalForces: f.forces });
  let unchanged = true;
  try {
    deepStrictEqual({ state: f.state, shear: f.shear }, before);
    deepStrictEqual({ state: q.state, shear: q.shearState }, before);
  } catch { unchanged = false; }
  const passed = !q.report.accepted && q.duration === 0 && unchanged;
  if (!passed) violations.push(`${p.id}: failed event rollback`);
  return { input: p.id, accepted: q.report.accepted, reason: q.report.reason, duration: q.duration, unchanged, passed };
});
const sourceSha256End = sourceVersion(), scriptSha256End = hash(self), referenceSha256End = hash(referencePath);
if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End || referenceSha256Start !== referenceSha256End)
  throw new Error('Source or reference changed during execution; evidence withheld');
const report = { schemaVersion: 1, sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End,
  referenceSha256Start, referenceSha256End, node: process.versions.node, elapsedSeconds: (performance.now() - started) / 1000,
  scope: 'Research-only, isolated collinear center-patch fixed-normal stop; no World, generic rotating foot, touchdown/release, gait or NFL calibration',
  assumptions: 'K, Kt, mu, mass/inertia and indentation are explicit sensitivity choices. Normal balance is force-controlled, never a fixed foot projection.',
  method: '18 body momentum equations re-solved at event duration. Independent continuum phase reference; independent chord law, force dose, normal impulse, state energy and rollback audits.',
  totals: { ordinaryIntervals, eventIntervals, rejectedIntervals, violations: violations.length }, maxima, rows,
  representations, representationErrors, offGrid, rejectionChecks, violations };
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, totals: report.totals, maxima, seconds: report.elapsedSeconds }));
if (violations.length) process.exitCode = 1;
