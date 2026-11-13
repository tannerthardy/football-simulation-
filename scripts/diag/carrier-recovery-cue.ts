/** Nine fixed native run calls; record only consumed carrier cues and decisions.
 * node --import tsx scripts/diag/carrier-recovery-cue.ts OUTPUT.json.gz \
 *   --expected-source=<whole-engine-sha>
 * No extra observations/controller calls/RNG, prescribed motion or stop window.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { Agent } from '../../src/sim/agent.js';
import { BallCarrier, observedRecoveryAllowance } from '../../src/sim/behaviors/carrier.js';
import type { Perceived } from '../../src/sim/perception.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2], expected = process.argv[3]?.match(/^--expected-source=([a-f0-9]{64})$/)?.[1];
if (process.argv.length !== 4 || !output?.endsWith('.json.gz') || !expected)
  throw new Error('Usage: carrier-recovery-cue.ts OUTPUT.json.gz --expected-source=<whole-engine-sha>');
const sourceBefore = sourceVersion();
if (sourceBefore !== expected) throw new Error(`Expected source ${expected}, found ${sourceBefore}`);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const joint = (sim: PlaySim, value: any) => ({ ...value,
  a: sim.agents.find(a => a.body === value.a)?.idx, b: sim.agents.find(a => a.body === value.b)?.idx,
  actor: value.actor ? sim.agents.find(a => a.body === value.actor)?.idx : null });
function signature(sim: PlaySim, result: PlayResult) {
  return hash({ result: { ...result, frames: undefined, telemetry: undefined }, bodies: sim.agents.map(a => a.body),
    tags: sim.agents.map(a => [...a.tags]), events: sim.events, intents: sim.intents,
    minds: sim.agents.map(a => a.mind), perception: sim.perception,
    joints: sim.world.joints.map(j => joint(sim, j)), nextRng: sim.rng.nextU32() });
}
interface Input { run: string; front: string; flip: boolean; seed: number; roster: number[] }
const inputs: Input[] = ['iz_strong', 'oz_strong'].flatMap(run => ['over', 'under']
  .flatMap(front => [false, true].map(flip => ({ run, front, flip, seed: 3, roster: [31, 32] }))));
inputs.push({ run: 'oz_strong', front: 'over', flip: true, seed: 11, roster: [41, 42] });
type Cue = { target: string; seen: Perceived; legacyRecoveryExtra: number; effectiveRecoveryExtra: number;
  scheduledParking: boolean; trueSupport: string | null; downUntil: number; publicGetUp: number | null };
type Evaluation = { t: number; designed: boolean; runnerPos: { x: number; y: number };
  runnerVel: { x: number; y: number }; choice: unknown; cues: Cue[] };
const rows: any[] = [];
const proto = BallCarrier.prototype as unknown as { evaluate(a: Agent, sim: PlaySim, dir: number, designed: boolean): unknown };
const originalEvaluate = proto.evaluate;

try {
  for (const input of inputs) {
    const roster = input.roster[0] === 31 ? 1 : 2;
    const offense = generateTeam(new Rng(input.roster[0]), `Panel offense ${roster}`, `O${roster}`, { strength: .55 });
    const defense = generateTeam(new Rng(input.roster[1]), `Panel defense ${roster}`, `D${roster}`, { strength: .55 });
    const formation = FORMATION_BY_ID.ace_11, front = FRONT_BY_ID[input.front], personnel = front.personnel[0];
    const setup: PlaySetup = { offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, personnel),
      offCall: { formation, flip: input.flip, kind: 'run', run: RUN_BY_ID[input.run], label: `Audit ${input.run}` },
      defCall: { personnel, front, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: `Audit ${input.front}` },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed: input.seed, record: false };
    const sim = new PlaySim(setup), initial = sim.agents.map(a => ({ slot: a.slot, team: a.team,
      body: structuredClone(a.body), ratings: a.player.ratings, snapReadyAt: a.snapReadyAt }));
    const evaluations: Evaluation[] = [], carrierSteps: any[] = [];
    let active: { runner: Agent; evaluation: Evaluation } | null = null;
    const originalSee = sim.see;
    sim.see = function (a, target, ...rest) {
      const seen = originalSee.call(this, a, target, ...rest);
      if (active && a === active.runner && target.team !== a.team) {
        const parking = target.downUntil > sim.t;
        active.evaluation.cues.push({ target: target.slot, seen: structuredClone(seen),
          // Legacy expression is retained solely to locate the prior failure;
          // it is not the effective allowance in the repaired engine.
          legacyRecoveryExtra: target.isDown(sim.t) ? target.downUntil - sim.t + .2 : 0,
          effectiveRecoveryExtra: parking ? target.downUntil - sim.t + .2
            : observedRecoveryAllowance(seen, target.profile.getUp, sim.dt),
          scheduledParking: parking, trueSupport: target.body.support?.state ?? null,
          downUntil: target.downUntil, publicGetUp: target.profile.getUp ?? null });
      }
      return seen;
    };
    proto.evaluate = function (a, s, dir, designed) {
      if (s !== sim) return originalEvaluate.call(this, a, s, dir, designed);
      const evaluation: Evaluation = { t: s.t, designed, runnerPos: { ...a.pos }, runnerVel: { ...a.vel }, choice: null, cues: [] };
      active = { runner: a, evaluation };
      try { evaluation.choice = originalEvaluate.call(this, a, s, dir, designed); }
      finally { active = null; }
      evaluations.push(evaluation);
      return evaluation.choice;
    };
    const originalStep = sim.world.step;
    let maxMomentumResidual = 0, maxWorkResidual = 0, maxBudgetExcess = 0;
    sim.world.step = function (intents, dt) {
      const beforeMomentum = sim.agents.reduce((p, a) => ({ x: p.x + a.profile.massKg * a.vel.x, y: p.y + a.profile.massKg * a.vel.y }), { x: 0, y: 0 });
      const carrier = sim.carrier, t = sim.t;
      const before = carrier ? { position: { ...carrier.pos }, velocity: { ...carrier.vel },
        support: structuredClone(carrier.body.support), command: structuredClone((sim as any).cmds[carrier.idx]),
        intent: structuredClone(intents[carrier.idx]), squeeze: carrier.body.squeeze ?? 0 } : null;
      const report = originalStep.call(this, intents, dt);
      const afterMomentum = sim.agents.reduce((p, a) => ({ x: p.x + a.profile.massKg * a.vel.x, y: p.y + a.profile.massKg * a.vel.y }), { x: 0, y: 0 });
      const ground = report.groundImpulse.reduce((p, v) => ({ x: p.x + v.x, y: p.y + v.y }), { x: 0, y: 0 });
      maxMomentumResidual = Math.max(maxMomentumResidual, Math.hypot(afterMomentum.x - beforeMomentum.x - ground.x, afterMomentum.y - beforeMomentum.y - ground.y));
      maxWorkResidual = Math.max(maxWorkResidual, Math.abs(report.work.residual));
      for (let i = 0; i < sim.agents.length; i++) maxBudgetExcess = Math.max(maxBudgetExcess,
        report.armImpulse[i] - report.armImpulseLimit[i], report.armWork[i] - report.armWorkLimit[i],
        report.supportMotorWork[i] - report.supportMotorWorkLimit[i]);
      if (carrier?.slot === 'RB') carrierSteps.push({ t, before,
        after: { position: { ...carrier.pos }, velocity: { ...carrier.vel }, support: structuredClone(carrier.body.support) },
        groundImpulse: report.groundImpulse[carrier.idx], armImpulse: report.armImpulse[carrier.idx], armImpulseLimit: report.armImpulseLimit[carrier.idx],
        armWork: report.armWork[carrier.idx], armWorkLimit: report.armWorkLimit[carrier.idx],
        supportMotorWork: report.supportMotorWork[carrier.idx], supportMotorWorkLimit: report.supportMotorWorkLimit[carrier.idx],
        contacts: report.contacts.filter(c => c.i === carrier.idx || c.j === carrier.idx),
        falls: report.falls.includes(carrier.idx), downs: report.downs.includes(carrier.idx), rises: report.rises.includes(carrier.idx) });
      return report;
    };
    const result = sim.run(), observedSignature = signature(sim, result);
    proto.evaluate = originalEvaluate;
    const plain = new PlaySim(setup), plainResult = plain.run(), plainSignature = signature(plain, plainResult);
    if (observedSignature !== plainSignature) throw new Error(`Observer changed native execution: ${JSON.stringify(input)}`);
    const cues = evaluations.flatMap(e => e.cues);
    if (cues.some(c => !Number.isFinite(c.effectiveRecoveryExtra) || c.effectiveRecoveryExtra < 0)) throw new Error('Invalid effective recovery allowance');
    // Fixed numerical consistency guard, not a strength/force calibration.
    if ([maxMomentumResidual, maxWorkResidual, maxBudgetExcess].some(v => !Number.isFinite(v) || v > 1e-6)) throw new Error('Material physics accounting excess');
    rows.push({ id: `RBA-R${roster}-${input.run}-${input.front}-${input.flip ? 'L' : 'R'}-S${input.seed}`, input,
      initial, initialSha256: hash(initial), observedSignature, plainSignature, observerVerified: true,
      naturalEnd: result.outcome !== 'timeout', result: { ...result, frames: undefined, telemetry: undefined },
      evaluations, carrierSteps, legacyNegativeCueCount: cues.filter(c => c.legacyRecoveryExtra < 0).length,
      positiveObservedRecoveryCount: cues.filter(c => !c.scheduledParking && c.effectiveRecoveryExtra > 0).length,
      maxMomentumResidual, maxWorkResidual, maxBudgetExcess });
  }
} finally { proto.evaluate = originalEvaluate; }

const sourceAfter = sourceVersion();
if (sourceAfter !== sourceBefore) throw new Error('Source changed during collection');
const packet = { schema: 'carrier-recovery-cue-native-v1', sourceBefore, sourceAfter, node: process.version,
  collectorSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  method: 'Nine fixed native calls, full natural whistle/standard physical timeout. Only actual evaluate calls and consumed see images are wrapped; recovery helper replay is pure. No additional observations, decisions, RNG or changed native commands. All nine observed endpoint/body/tags/minds/joints/perception/next-RNG signatures match plain runs.',
  limitations: ['Selected diagnostic calls, not NFL rate estimates or outcome calibration.',
    'True support/deadline fields are diagnostic; physical-fall inference uses only consumed pose/age and public getUp.',
    'The legacy negative expression identifies old source-law opportunities; repaired effective allowances are separate.',
    'Coarse recovery estimate is not exact phase progress or measured NFL get-up timing.',
    'Fixed 1e-6 native-unit residual/budget guard establishes numerical consistency, not physical force calibration.'], rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, gzipSync(JSON.stringify(packet), { level: 9 }));
console.log(JSON.stringify({ output, sourceBefore, sourceAfter, collectorSha256: packet.collectorSha256, cases: rows.length,
  observerVerified: rows.every(r => r.observerVerified), naturalEnds: rows.filter(r => r.naturalEnd).length,
  legacyNegativeCueCount: rows.reduce((n, r) => n + r.legacyNegativeCueCount, 0),
  positiveObservedRecoveryCount: rows.reduce((n, r) => n + r.positiveObservedRecoveryCount, 0) }));
