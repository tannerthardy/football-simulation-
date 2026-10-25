/** Tiny mechanical contact/recovery witness, not a tackle-rate or NFL target.
 *
 * One declared geometry and unchanged generated profiles. Both glancing arms
 * receive the ordinary run command through the same first attained contact
 * tick. Only then does one become passive; neither contact nor World state is
 * reconstructed at the fork. The passive arm diagnoses what voluntary ground
 * actuation changes, including the loss of active recovery; it is not a viable
 * football alternative. There are no grips, controllers, perception reads or
 * draws after the initial profile generation.
 *
 * node scripts/baseline.mjs --candidate -- node --import tsx \
 *   scripts/diag/physics/recoverable-contact.ts --seconds 2 --refine 48
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Rng } from '../../../src/core/rng.js';
import { generatePlayer } from '../../../src/players/generator.js';
import { derivePhysical } from '../../../src/players/physical.js';
import type { Body } from '../../../src/physics/kinematics.js';
import { fatigueFactor } from '../../../src/physics/kinematics.js';
import { availability, baseRadiusAt, supportParams } from '../../../src/physics/support.js';
import { CONTACT_SCALE, World, type Intent, type StepReport } from '../../../src/physics/world.js';
import { sourceVersion } from '../../source-version.js';

const DT = .05;
const RUN: Intent = { vel: { x: 8, y: 0 }, facing: 0 };
const FREE: Intent = { vel: { x: 0, y: 0 }, free: true };
const runnerPlayer = generatePlayer(new Rng(61), 'RB');
const defenderPlayer = generatePlayer(new Rng(62), 'LB');
const runnerProfile = derivePhysical(runnerPlayer), defenderProfile = derivePhysical(defenderPlayer);
const contactDistance = CONTACT_SCALE * (runnerProfile.radius + defenderProfile.radius);
const geometry = { initialX: .9, glancingY: .45, missY: contactDistance + .2, squareY: 0 };
// These are reported recovery landmarks, not physics calibration or pass gates.
const recoveryDefinition = { forwardSpeedFractionOfClear: .95, maxLateralSpeed: .1,
  maxFacingRadians: .05, minAvailability: .99, requireState: 'up' } as const;

type Mode = 'run' | 'free-after-contact';
type Sample = ReturnType<typeof snapshot> & { t: number; groundImpulse: { x: number; y: number };
  internalImpulse: { x: number; y: number }; pairInternalImpulseResidual: number;
  normalContactImpulse: number; workResidual: number; work: StepReport['work']; groundWork: number;
  groundYawImpulse: number; substeps: number; contactEnergy: number };
function snapshot(body: Body) {
  const s = body.support!, sp = supportParams(body.profile);
  return { pos: { ...body.pos }, vel: { ...body.vel }, speed: Math.hypot(body.vel.x, body.vel.y),
    facing: body.facing, spin: body.spin ?? 0, xi: { ...s.xi },
    xiMagnitude: Math.hypot(s.xi.x, s.xi.y), baseRadius: baseRadiusAt(sp, s.posture),
    availability: availability(s, sp, fatigueFactor(body.energy)), state: s.state,
    out: s.out, peak: s.peak, posture: s.posture, energy: body.energy,
    causes: structuredClone(s.causes), accel: structuredClone(s.accel),
    tipAccel: structuredClone(s.tipAccel) };
}
function arm(name: string, y: number, mode: Mode, splitTick: number | undefined,
  ticks: number, substeps?: number) {
  const runner: Body = { pos: { x: 0, y: 0 }, vel: { x: 8, y: 0 }, facing: 0,
    energy: 1, profile: structuredClone(runnerProfile) };
  const defender: Body = { pos: { x: geometry.initialX, y }, vel: { x: 0, y: 0 },
    facing: Math.PI, energy: 1, profile: structuredClone(defenderProfile) };
  const world = new World([runner, defender], { substeps });
  const initial = [snapshot(runner), snapshot(defender)];
  const samples: Sample[] = [], defenderSamples: ReturnType<typeof snapshot>[] = [];
  let firstContactTick: number | null = null, firstContactBodies: Body[] | null = null;
  for (let tick = 0; tick < ticks; tick++) {
    const before = [{ ...runner.vel }, { ...defender.vel }];
    const runnerIntent = mode === 'free-after-contact' && tick >= splitTick! ? FREE : RUN;
    const report = world.step([runnerIntent, FREE], DT);
    const internal = [runner, defender].map((body, i) => ({
      x: body.profile.massKg * (body.vel.x - before[i].x) - report.groundImpulse[i].x,
      y: body.profile.massKg * (body.vel.y - before[i].y) - report.groundImpulse[i].y,
    }));
    const normalContactImpulse = report.contacts.reduce((sum, c) => sum + c.impulse, 0);
    if (firstContactTick === null && normalContactImpulse > 1e-9) {
      firstContactTick = tick + 1;
      firstContactBodies = structuredClone([runner, defender]);
    }
    samples.push({ t: (tick + 1) * DT, ...snapshot(runner),
      groundImpulse: { ...report.groundImpulse[0] }, internalImpulse: internal[0],
      pairInternalImpulseResidual: Math.hypot(internal[0].x + internal[1].x, internal[0].y + internal[1].y),
      normalContactImpulse, workResidual: report.work.residual, work: { ...report.work },
      groundWork: report.groundWork[0], groundYawImpulse: report.groundYawImpulse[0],
      substeps: report.substeps, contactEnergy: world.contactEnergy() });
    defenderSamples.push(snapshot(defender));
  }
  return { name, y, mode, requestedSubsteps: substeps ?? 'adaptive', splitTick: splitTick ?? null, initial, firstContactTick,
    firstContactBodies, samples, defenderSamples };
}

export function recoverableContactWitness(options: { seconds?: number; refinementSubsteps?: number } = {}) {
  const seconds = options.seconds ?? 2, ticks = Math.round(seconds / DT);
  assert.ok(ticks > 0 && Math.abs(ticks * DT - seconds) < 1e-9, 'Duration must be a positive multiple of .05s');
  // Geometry is fixed before execution. A fall, negligible hit or absent recovery
  // remains evidence; there is no search over offsets or strength multipliers.
  const glancingRun = arm('glancing-run', geometry.glancingY, 'run', undefined, ticks);
  assert.notEqual(glancingRun.firstContactTick, null, 'Declared glancing path did not attain torso contact');
  const splitTick = glancingRun.firstContactTick!;
  const glancingFree = arm('glancing-free', geometry.glancingY, 'free-after-contact', splitTick, ticks);
  const clearRun = arm('clear-run', geometry.missY, 'run', undefined, ticks);
  const clearFree = arm('clear-free', geometry.missY, 'free-after-contact', splitTick, ticks);
  const squareRun = arm('square-front-run', geometry.squareY, 'run', undefined, ticks);
  assert.deepEqual(glancingRun.samples.slice(0, splitTick), glancingFree.samples.slice(0, splitTick),
    'Glancing arms did not reach identical fork states');
  assert.deepEqual(glancingRun.defenderSamples.slice(0, splitTick), glancingFree.defenderSamples.slice(0, splitTick));
  assert.deepEqual(glancingRun.firstContactBodies, glancingFree.firstContactBodies,
    'Complete attained bodies/support differ at the glancing fork');
  assert.equal(clearRun.firstContactTick, null, 'Clear route unexpectedly touched');
  assert.equal(clearFree.firstContactTick, null, 'Clear passive control unexpectedly touched');

  const arms = [glancingRun, glancingFree, clearRun, clearFree, squareRun];
  if (options.refinementSubsteps !== undefined) {
    assert.ok(Number.isInteger(options.refinementSubsteps) && options.refinementSubsteps > 0,
      'Refinement substeps must be a positive integer');
    arms.push(arm(`glancing-run-${options.refinementSubsteps}`, geometry.glancingY, 'run', undefined, ticks, options.refinementSubsteps),
      arm(`square-front-run-${options.refinementSubsteps}`, geometry.squareY, 'run', undefined, ticks, options.refinementSubsteps));
  }
  const summaries = arms.map(a => {
    const clear = a.mode === 'run' ? clearRun : clearFree;
    const comparison = a.samples.map((s, i) => ({ t: s.t,
      forwardSpeedDeficit: clear.samples[i].vel.x - s.vel.x,
      forwardDistanceDeficit: clear.samples[i].pos.x - s.pos.x,
      lateralDisplacement: s.pos.y - clear.samples[i].pos.y,
      recovered: s.state === recoveryDefinition.requireState
        && s.vel.x >= clear.samples[i].vel.x * recoveryDefinition.forwardSpeedFractionOfClear
        && Math.abs(s.vel.y) <= recoveryDefinition.maxLateralSpeed
        && Math.abs(s.facing) <= recoveryDefinition.maxFacingRadians
        && s.availability >= recoveryDefinition.minAvailability }));
    const contactAt = a.firstContactTick === null ? null : a.firstContactTick * DT;
    // Require the conditions to hold for the remaining sampled horizon, rather
    // than counting a brief threshold crossing as a lasting recovery.
    const recoveredIndex = contactAt === null ? -1 : comparison.findIndex((s, i) =>
      s.t >= contactAt && comparison.slice(i).every(t => t.recovered));
    const final = a.samples.at(-1)!, finalComparison = comparison.at(-1)!;
    return { name: a.name, contactAt, splitAt: splitTick * DT,
      recoveryTimeAfterContact: recoveredIndex < 0 || contactAt === null ? null : comparison[recoveredIndex].t - contactAt,
      finalState: final.state, minimumForwardSpeed: Math.min(...a.samples.map(s => s.vel.x)),
      maximumXi: Math.max(...a.samples.map(s => s.xiMagnitude)),
      minimumAvailability: Math.min(...a.samples.map(s => s.availability)),
      maximumAbsoluteSpin: Math.max(...a.samples.map(s => Math.abs(s.spin))),
      maximumAbsoluteFacing: Math.max(...a.samples.map(s => Math.abs(s.facing))),
      finalForwardSpeed: final.vel.x, finalForwardDistanceDeficit: finalComparison.forwardDistanceDeficit,
      finalForwardSpeedDeficit: finalComparison.forwardSpeedDeficit,
      finalLateralDisplacement: finalComparison.lateralDisplacement,
      summedInternalImpulse: a.samples.reduce((sum, s) => ({ x: sum.x + s.internalImpulse.x,
        y: sum.y + s.internalImpulse.y }), { x: 0, y: 0 }),
      maximumPairMomentumResidual: Math.max(...a.samples.map(s => s.pairInternalImpulseResidual)),
      maximumAbsoluteWorkResidual: Math.max(...a.samples.map(s => Math.abs(s.workResidual))), comparison };
  });
  return { dt: DT, ticks, horizon: seconds, recoveryDefinition, identicalGlancingPrefixThroughTick: splitTick,
    summaries, arms };
}

function main() {
  const started = performance.now(), cpuStarted = process.cpuUsage();
  const value = (name: string, fallback: string) => {
    const i = process.argv.indexOf(name);
    if (i < 0) return fallback;
    assert.ok(process.argv[i + 1], `${name} needs a value`);
    return process.argv[i + 1];
  };
  const out = value('--out', 'out/contact-middle/recoverable-contact.json');
  const witness = recoverableContactWitness({ seconds: Number(value('--seconds', '2')),
    ...(process.argv.includes('--refine') ? { refinementSubsteps: Number(value('--refine', '48')) } : {}) });
  const cpu = process.cpuUsage(cpuStarted);
  const receipt = { question: 'Does an unchanged torso glance create recoverable running disruption, and what does ordinary ground actuation restore after the same attained contact?',
    engineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    sourceSha256: sourceVersion(),
    operatorSha256: createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
    node: process.version, platform: process.platform, arch: process.arch,
    geometry, contactDistance,
    profiles: { runner: { seed: 61, position: 'RB', id: runnerPlayer.id, profile: runnerProfile },
      defender: { seed: 62, position: 'LB', id: defenderPlayer.id, profile: defenderProfile } },
    worldDefaults: { handContact: 'center', handIntegration: 'centered', supportModel: 'legacy',
      constraintWork: 'per-solve', impactTiming: 'speculative', supportIntegration: 'mean', boundedAttachment: true },
    commands: { runnerBeforeSplit: RUN, runnerAfterSplitRun: RUN, runnerAfterSplitFree: FREE, defender: FREE },
    ...witness,
    limitations: ['Passive defender supplies no deliberate bracing or tackle wrap.',
      'FREE removes active locomotion and recovery; this is a diagnostic separation, not an achievable football alternative.',
      'Recovery criteria are descriptive landmarks, not NFL calibration or acceptance gates.',
      'One fixed geometry cannot establish event frequencies or native football transfer.'],
    runtime: { harnessWallMs: performance.now() - started, userCpuMs: cpu.user / 1000, systemCpuMs: cpu.system / 1000 } };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ out, splitAt: witness.identicalGlancingPrefixThroughTick * DT,
    summaries: witness.summaries.map(({ comparison: _, ...summary }) => summary), runtime: receipt.runtime }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
