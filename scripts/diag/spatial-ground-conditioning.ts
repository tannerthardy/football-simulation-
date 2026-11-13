/** Reproducible low-foot-inertia solver and uncertified hidden-event probe.
 * Run with Node 22: node --import tsx scripts/diag/spatial-ground-conditioning.ts
 * Optional: --output=PATH --duration=SECONDS. This is diagnostic evidence,
 * not gait calibration or a readiness test.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceVersion } from '../source-version.js';
import { advanceSpatialGroundContact, type SpatialGroundPoint } from '../../src/physics/spatial-ground.js';
import { identityRigidBasis } from '../../src/physics/material-rigid.js';
import { newSpatialSupport } from '../../src/physics/spatial-support.js';
import type { SpatialSupportState } from '../../src/physics/spatial-support.js';

const scriptPath = fileURLToPath(import.meta.url);
const scriptHash = (): string => createHash('sha256').update(readFileSync(scriptPath)).digest('hex');
const cli = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
  const [key, ...value] = x.slice(2).split('='); return [key, value.join('=')];
}));
const outputPath = resolve(cli.get('output') ?? 'out/spatial-ground-conditioning.json');
const duration = Number(cli.get('duration') ?? '.012');
if (!(duration > 0 && Number.isFinite(duration))) throw new RangeError('--duration must be finite and positive');
if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error(`Pinned diagnostic requires Node 22 (found ${process.version})`);
const sourceHashStart = sourceVersion(), scriptHashStart = scriptHash();
const v = (x = 0, y = 0, z = 0) => ({ x, y, z });
const sole: SpatialGroundPoint[] = [
  { id: 'heel-left', local: v(-.12, -.05, -.04), friction: .8 },
  { id: 'heel-right', local: v(-.12, .05, -.04), friction: .8 },
  { id: 'toe', local: v(.13, 0, -.04), friction: .8 },
];
const legLength = Math.hypot(.08, .88), springLoad = 480 * legLength / .88;
const baseline = newSpatialSupport({
  torso: { mass: 96, inertia: 8, position: v(0, 0, 1.1), velocity: v(), angularMomentum: v(), basis: identityRigidBasis() },
  feet: [-1, 1].map(i => ({ mass: 2, inertia: .008, position: v(0, i * .16, .04), velocity: v(), angularMomentum: v(), basis: identityRigidBasis() })) as SpatialSupportState['feet'],
  legs: [-1, 1].map(i => ({ hip: v(0, i * .08, -.15), ankle: v(0, 0, .03), compliance: {
    restLength: legLength + springLoad / 4800, stiffness: 4800, forceCap: 1600, damping: 30, dampingCap: 300,
  } })) as SpatialSupportState['legs'],
  gravity: v(0, 0, -10),
});
const patches: [SpatialGroundPoint[], SpatialGroundPoint[]] = [sole, sole.map(p => ({ ...p, id: `right-${p.id}` }))];
const regular = [];
for (const h of [.004, .002, .001]) for (const shoveForce of [0, 10, 50, 100]) {
  let state = baseline, firstReject: null | Record<string, unknown> = null, acceptedSteps = 0;
  const steps = Math.ceil(duration / h);
  for (let tick = 0; tick < steps; tick++) {
    const dt = Math.min(h, duration - tick * h);
    if (dt <= 0) break;
    const result = advanceSpatialGroundContact(state, dt, patches, {
      externalImpulses: [{ center: v(shoveForce * dt, 0, 0) }, {}, {}],
    });
    if (!result.report.accepted) {
      firstReject = { tick, time: tick * h, reason: result.report.reason, residual: result.report.residual,
        iterations: result.report.iterations, phase: result.report.maxAngularPhase,
        elasticPhase: result.report.maxElasticPhase,
        workResidual: result.report.workResidual, maxNormalResidual: result.report.maxNormalResidual,
        maxTangentResidual: result.report.maxTangentResidual, maxFrictionCapExcess: result.report.maxFrictionCapExcess,
        inputState: state, candidateState: result.report.candidateState,
        externalImpulses: [{ center: v(shoveForce * dt, 0, 0) }, {}, {}],
        options: { maxAngularPhase: .5, maxElasticPhase: .5 } };
      break;
    }
    acceptedSteps++; state = result.state;
  }
  regular.push({ dt: h, shoveForce, steps, acceptedSteps, firstReject,
    initialState: baseline, patches, options: { duration, maxAngularPhase: .5, maxElasticPhase: .5 },
    finalTorsoX: state.torso.position.x, finalTorsoVelocityX: state.torso.velocity.x,
    status: firstReject ? 'rejected' : 'accepted' });
}

// These deliberately adversarial long intervals can contain a hidden
// liftoff/recontact while their endpoint solve and energy ledger look sound.
// Keep them in the artifact as accepted-but-uncertified negative controls.
const hiddenState = newSpatialSupport({
  torso: { mass: 96, inertia: 8, position: v(0, 0, .75), velocity: v(0, 0, 1.5), angularMomentum: v(), basis: identityRigidBasis() },
  feet: [-1, 1].map(i => ({ mass: 2, inertia: .008, position: v(0, i * .12, 0), velocity: v(), angularMomentum: v(), basis: identityRigidBasis() })) as SpatialSupportState['feet'],
  legs: [-1, 1].map(i => ({ hip: v(0, i * .12, 0), ankle: v(), compliance: {
    restLength: 1, stiffness: 2000, forceCap: 2000, damping: 0, dampingCap: 0,
  } })) as SpatialSupportState['legs'], gravity: v(0, 0, -10),
});
const zeroFriction = sole.map(p => ({ ...p, local: { ...p.local, z: 0 }, friction: 0 }));
const hidden = [.3, .4, .6].map(dt => {
  const result = advanceSpatialGroundContact(hiddenState, dt, [zeroFriction, zeroFriction], {
    externalImpulses: [{ center: v(0, 0, -800 * dt) }, { center: v(0, 0, 400 * dt) }, { center: v(0, 0, 400 * dt) }],
  });
  return { dt, accepted: result.report.accepted, reason: result.report.reason,
    residual: result.report.residual, minCandidateSoleGap: result.report.minEndpointGap,
    minEndpointInstantaneousNormal: result.report.minInstantaneousRequiredNormal,
    elasticPhase: result.report.maxElasticPhase, energyResidual: result.report.workResidual,
    interiorEventCertification: result.report.interiorEventCertification,
    classification: result.report.accepted ? 'accepted_uncertified_hidden_event_negative_control' : 'rejected',
    inputState: hiddenState, patches: [zeroFriction, zeroFriction],
    externalImpulses: [{ center: v(0, 0, -800 * dt) }, { center: v(0, 0, 400 * dt) }, { center: v(0, 0, 400 * dt) }],
    options: { maxAngularPhase: .5, maxElasticPhase: .5 }, candidateState: result.report.candidateState };
});
const sourceHashEnd = sourceVersion(), scriptHashEnd = scriptHash();
if (sourceHashStart !== sourceHashEnd || scriptHashStart !== scriptHashEnd)
  throw new Error('Source or diagnostic changed during execution; no output artifact written');
const artifact = { schema: 'spatial-ground-conditioning-v1', nodeVersion: process.version,
  sourceHashStart, sourceHashEnd, scriptHashStart, scriptHashEnd,
  hashesStable: sourceHashStart === sourceHashEnd && scriptHashStart === scriptHashEnd,
  fixture: { torsoMass: 96, torsoInertia: 8, footMass: 2, footInertia: .008,
    hipLateral: .08, ankleLateral: 0, footCenterLateral: .16, stiffness: 4800,
    damping: 30, gravity: 10, shoveForces: [0, 10, 50, 100], durations: [.004, .002, .001], duration },
  regular, hiddenNegativeControls: hidden,
  interpretation: 'Solver conditioning probe only. Hidden-event controls rejected by an elastic-phase budget are discretization rejects, not certified event handling. Accepted hidden-event rows remain uncertified; no trajectory readiness claim.' };
const ordinaryFailures = regular.filter(r => r.firstReject !== null);
const hiddenUnexpected = hidden.filter(r => r.accepted || !/elastic phase/i.test(r.reason ?? ''));
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ outputPath, sourceHashStart, sourceHashEnd, scriptHashStart, scriptHashEnd,
  hashesStable: artifact.hashesStable, ordinaryFailureCount: ordinaryFailures.length, hiddenUnexpectedCount: hiddenUnexpected.length,
  regular: regular.map(r => ({ dt: r.dt, shoveForce: r.shoveForce,
    acceptedSteps: r.acceptedSteps, steps: r.steps, firstReject: r.firstReject })), hiddenNegativeControls: hidden }, null, 2)}\n`);
if (ordinaryFailures.length || hiddenUnexpected.length) process.exitCode = 1;
