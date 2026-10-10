/** Independent closed-form reference for one symmetric 1D contact release.
 * Research mechanics only; neither this fixture nor its force priors calibrate NFL physics.
 * node --import tsx scripts/diag/vertical-separation-reference.ts [output.json]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { advanceVerticalSupport, newVerticalSupport, type VerticalSupportState,
  type VerticalSupportSegment } from '../../src/physics/vertical-support.js';
import { sourceVersion } from '../source-version.js';

if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run this reference with Node 22');
if (process.argv.length > 3 || process.argv[2]?.startsWith('--')) throw new Error('Specify at most one output path');
const output = process.argv[2] ?? 'out/vertical-separation-reference.json';
const sourceSha256Start = sourceVersion();
const scriptSha256Start = createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex');
const mt = 96, mf = 2, gravity = 10, stiffness = 2000, restLength = 1, forceCap = 2000;
const motor = 400, z0 = .75, v0 = 1.5, duration = .1, totalMass = mt + 2 * mf;
const leg = { restLength, stiffness, forceCap, damping: 0, dampingCap: 0 };
const input = newVerticalSupport({ torsoMass: mt, footMass: [mf, mf], gravity,
  torso: { position: z0, velocity: v0 }, feet: [{ id: 0, position: 0, velocity: 0 }, { id: 1, position: 0, velocity: 0 }],
  legs: [{ ...leg }, { ...leg }], actuator: { forceCap: 2 * motor, powerCap: 1e9 } });

// Independent equations while both material feet rest on the plane:
// z'' = (2*k*(L-z) - 2*u - mt*g)/mt; N_i = mf*g + k*(L-z) - u.
const equilibrium = restLength - (2 * motor + mt * gravity) / (2 * stiffness);
const omega = Math.sqrt(2 * stiffness / mt), a = z0 - equilibrium, b = v0 / omega;
const amplitude = Math.hypot(a, b), phase = Math.atan2(b, a);
const releaseHeight = restLength - (motor - mf * gravity) / stiffness;
const releaseTime = (phase - Math.acos((releaseHeight - equilibrium) / amplitude)) / omega;
if (!(releaseTime > 0 && releaseTime < duration)) throw new Error('Fixture has no first release in the reference window');
const constrainedHeight = (t: number) => equilibrium + a * Math.cos(omega * t) + b * Math.sin(omega * t);
const releaseVelocity = -a * omega * Math.sin(omega * releaseTime) + v0 * Math.cos(omega * releaseTime);
const relativeEquilibrium = restLength - motor / stiffness;
const relativeOmega = Math.sqrt(stiffness * (2 / mt + 1 / mf));
// After release both feet share the same motion and no ground force acts.
// COM follows gravity; relative leg length is another exact harmonic oscillator.
const post = duration - releaseTime;
const length = relativeEquilibrium + (releaseHeight - relativeEquilibrium) * Math.cos(relativeOmega * post)
  + releaseVelocity / relativeOmega * Math.sin(relativeOmega * post);
const lengthVelocity = -(releaseHeight - relativeEquilibrium) * relativeOmega * Math.sin(relativeOmega * post)
  + releaseVelocity * Math.cos(relativeOmega * post);
const com = mt / totalMass * releaseHeight + mt / totalMass * releaseVelocity * post - .5 * gravity * post * post;
const comVelocity = mt / totalMass * releaseVelocity - gravity * post;
const exact = { releaseTime, releaseHeight, releaseVelocity,
  torsoHeight: com + 2 * mf / totalMass * length, footHeight: com - mt / totalMass * length,
  torsoVelocity: comVelocity + 2 * mf / totalMass * lengthVelocity,
  footVelocity: comVelocity - mt / totalMass * lengthVelocity,
  normalImpulsePerFoot: (mt * (releaseVelocity - v0) + totalMass * gravity * releaseTime) / 2 };

// The following checks derive work, energy and reaction from primitive material
// states/impulses. They do not trust the kernel's reported residuals or work fields.
const springPotential = (length: number) => {
  const compression = Math.max(0, restLength - length), capCompression = forceCap / stiffness;
  return compression <= capCompression ? .5 * stiffness * compression ** 2
    : forceCap * (compression - .5 * capCompression);
};
const springForce = (length: number) => Math.min(forceCap, stiffness * Math.max(0, restLength - length));
const energy = (s: VerticalSupportState) => .5 * mt * s.torso.velocity ** 2 + mt * gravity * s.torso.position
  + s.feet.reduce((sum, f) => sum + .5 * mf * f.velocity ** 2 + mf * gravity * f.position
    + springPotential(s.torso.position - f.position), 0);
const momentum = (s: VerticalSupportState) => mt * s.torso.velocity + mf * (s.feet[0].velocity + s.feet[1].velocity);
function inspect(segments: VerticalSupportSegment[], final: VerticalSupportState) {
  let time = 0, firstRelease: number | null = null, impactLoss = 0, groundWork = 0, normalTotal = 0;
  const normalImpulsePerFoot = [0, 0], derivedNormalImpulsePerFoot = [0, 0];
  let maxNormalMismatch = 0, maxAdhesion = 0, minNormal = 0, supportedEndpoints = 0;
  for (const segment of segments) {
    if (segment.kind === 'interval' && firstRelease === null && segment.before.feet[0].position === 0
      && segment.after.feet[0].position > 0) firstRelease = time;
    for (let i = 0; i < 2; i++) {
      const before = segment.before.feet[i], after = segment.after.feet[i], normal = segment.normalImpulse[i];
      normalTotal += normal; minNormal = Math.min(minNormal, normal);
      normalImpulsePerFoot[i] += normal;
      let expectedNormal: number;
      if (segment.kind === 'impact') {
        expectedNormal = mf * (after.velocity - before.velocity);
        impactLoss += .5 * mf * (after.velocity ** 2 - before.velocity ** 2);
      } else {
        const initialLength = segment.before.torso.position - before.position;
        const finalLength = segment.after.torso.position - after.position;
        const spring = initialLength === finalLength ? springForce(initialLength)
          : -(springPotential(finalLength) - springPotential(initialLength)) / (finalLength - initialLength);
        expectedNormal = mf * (after.velocity - before.velocity) + segment.dt * (mf * gravity + spring - motor);
        groundWork += normal * (after.position - before.position) / segment.dt;
        if (after.position === 0 && after.velocity === 0) {
          supportedEndpoints++;
          maxAdhesion = Math.max(maxAdhesion, -(mf * gravity + springForce(finalLength) - motor));
        }
      }
      maxNormalMismatch = Math.max(maxNormalMismatch, Math.abs(normal - expectedNormal));
      derivedNormalImpulsePerFoot[i] += expectedNormal;
    }
    time += segment.dt;
  }
  const motorWork = motor * final.feet.reduce((sum, f, i) => sum + f.position - input.feet[i].position, 0)
    - 2 * motor * (final.torso.position - input.torso.position);
  const independentWorkResidual = energy(final) - energy(input) - motorWork - impactLoss - groundWork;
  const independentMomentumResidual = momentum(final) - momentum(input) + totalMass * gravity * time - normalTotal;
  return { firstRelease, time, supportedEndpoints, maxAdhesion, minNormal, maxNormalMismatch, groundWork, impactLoss,
    motorWork, independentWorkResidual, independentMomentumResidual, normalImpulsePerFoot, derivedNormalImpulsePerFoot };
}
const violations: unknown[] = [];
const runs = [.1, .05, .02, .01, .002, .001, .0005, .0001].map(maxInterval => {
  const result = advanceVerticalSupport(input, duration, { motorForces: [motor, motor], maxInterval, maxSegments: 4096 });
  const candidateState = result.report.segments.at(-1)?.after ?? input;
  const audit = inspect(result.report.segments, candidateState);
  if (result.report.accepted && (audit.firstRelease === null || audit.maxAdhesion > 1e-8 || audit.minNormal < -1e-10
    || audit.maxNormalMismatch > 1e-7 || audit.groundWork > 1e-7 || Math.abs(audit.independentWorkResidual) > 1e-7
    || Math.abs(audit.independentMomentumResidual) > 1e-7)) violations.push({ maxInterval, audit });
  return { maxInterval, accepted: result.report.accepted, reason: result.report.reason, segmentCount: result.report.segments.length,
    ...audit, releaseError: audit.firstRelease === null ? null : audit.firstRelease - exact.releaseTime,
    candidateFootHeight: candidateState.feet[0].position,
    footHeightError: result.report.accepted ? candidateState.feet[0].position - exact.footHeight : null,
    torsoHeightError: result.report.accepted ? candidateState.torso.position - exact.torsoHeight : null,
    footVelocityError: result.report.accepted ? candidateState.feet[0].velocity - exact.footVelocity : null,
    normalImpulseError: result.report.accepted ? audit.normalImpulsePerFoot[0] - exact.normalImpulsePerFoot : null };
});
// At these coarse horizons the hypothetical continuously constrained ODE has
// positive endpoint reaction, but an earlier negative interior reaction. A valid
// contact driver must detect first release rather than continue that branch.
const hiddenInterior = [.3, .4].map(dt => {
  const result = advanceVerticalSupport(input, dt, { motorForces: [motor, motor], maxInterval: dt, maxSegments: 4096 });
  const candidateState = result.report.segments.at(-1)?.after ?? input;
  const audit = inspect(result.report.segments, candidateState);
  const peakTime = phase / omega, peakHeight = equilibrium + amplitude;
  if (result.report.accepted && (audit.firstRelease === null || audit.maxAdhesion > 1e-8 || audit.minNormal < -1e-10
    || audit.maxNormalMismatch > 1e-7 || audit.groundWork > 1e-7 || Math.abs(audit.independentWorkResidual) > 1e-7
    || Math.abs(audit.independentMomentumResidual) > 1e-7)) violations.push({ dt, audit });
  return { dt, accepted: result.report.accepted, reason: result.report.reason, segmentCount: result.report.segments.length,
    ...audit, constrainedEndpointHeight: constrainedHeight(dt),
    constrainedEndpointNormal: mf * gravity + springForce(constrainedHeight(dt)) - motor,
    constrainedInteriorPeakTime: peakTime, constrainedInteriorPeakHeight: peakHeight,
    constrainedInteriorMinimumNormal: mf * gravity + springForce(peakHeight) - motor,
    releaseError: audit.firstRelease === null ? null : audit.firstRelease - exact.releaseTime };
});
const sourceSha256End = sourceVersion();
const scriptSha256End = createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex');
if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End)
  throw new Error('Physics or reference script changed during execution; output withheld');
const payload = { sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End, node: process.version,
  fixture: input, motorForces: [motor, motor], duration, exact, runs, hiddenInterior, contractViolations: violations,
  scope: 'Independent symmetric 1D reference only; no NFL calibration, general convergence or football readiness claim.' };
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256Start, scriptSha256Start, exact,
  runs: runs.map(r => ({ maxInterval: r.maxInterval, accepted: r.accepted, reason: r.reason,
    releaseError: r.releaseError, footHeightError: r.footHeightError, independentWorkResidual: r.independentWorkResidual })),
  hiddenInterior: hiddenInterior.map(r => ({ dt: r.dt, accepted: r.accepted, reason: r.reason,
    firstRelease: r.firstRelease, maxAdhesion: r.maxAdhesion })), violations: violations.length }, null, 2));
if (violations.length) process.exitCode = 1;
