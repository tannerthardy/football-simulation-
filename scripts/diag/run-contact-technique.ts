/** Contextual OL technique probe. This is a reduced contact island, not 11v11
 * football or evidence that the more skilled blocker must win every rep.
 *
 * node --import tsx scripts/diag/run-contact-technique.ts [output.json]
 * Bodies, drills, shared hand/balance ratings and RNG are matched. Only the
 * blocker's installed run/pass execution ratings vary. The actual physics
 * profile is pinned before contact, including its pass-derived backpedal.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { norm } from '../../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { supportParams } from '../../src/physics/support.js';
import type { Intent } from '../../src/physics/world.js';
import { derivePhysical } from '../../src/players/physical.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { traits, updateEngagements } from '../../src/sim/engagement.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const offense = generateTeam(new Rng(31), 'Technique offense', 'TO', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Technique defense', 'TD', { strength: .55 });
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export interface ContactInput {
  type: 'run' | 'pass';
  runBlock: number;
  passBlock: number;
  seed?: number;
  side?: number;
}

export function contactFixture(input: ContactInput) {
  const { type, runBlock, passBlock, seed = 11, side = 1 } = input;
  const formation = FORMATION_BY_ID.ace_11;
  const personnel = pickOffense(offense, formation.personnel);
  const original = personnel.C;
  const fixedPlayer = { ...original, ratings: { ...original.ratings,
    handTechnique: 60, balance: 60, runBlock: 55, passBlock: 55 } };
  const fixedProfile = derivePhysical(fixedPlayer);
  personnel.C = { ...fixedPlayer, ratings: { ...fixedPlayer.ratings, runBlock, passBlock } };
  const sim = new PlaySim({
    offense: personnel, defense: pickDefense(defense, 'base43'),
    offCall: type === 'run'
      ? { formation, flip: side < 0, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'contact technique' }
      : { formation, flip: side < 0, kind: 'pass', pass: PASS_BY_ID.smash, label: 'contact technique' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
  });
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + a.idx * 3, y: 10 };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  sim.t = 1; sim.world.time = 1;
  const blocker = sim.slot('C')!, defender = sim.slot('DT_W')!;
  Object.assign(blocker.profile, fixedProfile);
  blocker.body.pos = { x: 40, y: CENTER_Y };
  blocker.body.facing = 0;
  defender.body.pos = { x: 40.82, y: CENTER_Y + side * .2 };
  defender.body.vel = { x: 0, y: side * .8 };
  defender.body.facing = Math.PI;
  // A held QB is distant enough that the reduced run rep has no shed demand.
  // Thus its hand/foot execution is tested separately from carrier decisions.
  sim.qb.body.pos = { x: 35, y: CENTER_Y };
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const capacities = sim.agents.map(a => ({ slot: a.slot, profile: a.profile,
    capacities: supportParams(a.profile), drills: a.player.measurables }));
  const initialBodies = sim.agents.map(a => structuredClone(a.body));
  const engagement = sim.engage(blocker, defender, type, type === 'run' ? norm({ x: 1, y: side * .45 }) : null);
  if (!engagement) throw new Error('Controlled contact did not acquire real hands');
  return { sim, blocker, defender, engagement, capacities,
    capacitySha256: hash(capacities), initialBodiesSha256: hash(initialBodies) };
}

export function contactCommands(f: ReturnType<typeof contactFixture>): Intent[] {
  const intents: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  updateEngagements(f.sim, intents);
  return intents;
}

export function executeContact(input: ContactInput, ticks = 12) {
  const f = contactFixture(input), initialControl = f.engagement.control;
  const traces: unknown[] = [];
  const budgets = { maxWorkResidual: 0, maxArmImpulseExcess: 0, maxArmWorkExcess: 0,
    maxSupportWorkExcess: 0, maxGroundImpulseExcess: 0 };
  let armImpulse = 0, armWork = 0, loadedTicks = 0;
  for (let k = 0; k < ticks; k++) {
    const commands = contactCommands(f);
    const requested = structuredClone(commands[f.blocker.idx]);
    const control = f.engagement.control;
    const handRequest = f.blocker.engagement ? {
      push: f.engagement.hands!.push, steer: f.engagement.hands!.steer, hold: f.engagement.hands!.hold,
    } : null;
    const report = f.sim.world.step(commands, f.sim.dt);
    budgets.maxWorkResidual = Math.max(budgets.maxWorkResidual, Math.abs(report.work.residual));
    for (const a of f.sim.agents) {
      const i = a.idx;
      budgets.maxArmImpulseExcess = Math.max(budgets.maxArmImpulseExcess, report.armImpulse[i] - report.armImpulseLimit[i]);
      budgets.maxArmWorkExcess = Math.max(budgets.maxArmWorkExcess, report.armWork[i] - report.armWorkLimit[i]);
      budgets.maxSupportWorkExcess = Math.max(budgets.maxSupportWorkExcess, report.supportMotorWork[i] - report.supportMotorWorkLimit[i]);
      budgets.maxGroundImpulseExcess = Math.max(budgets.maxGroundImpulseExcess,
        Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y) - report.groundImpulseLimit[i]);
    }
    // The player controlling the hands supplies their active work. A defender
    // controlling the rep loads the same joint without OL arm expenditure.
    const repImpulse = report.armImpulse[f.blocker.idx] + report.armImpulse[f.defender.idx];
    const repWork = report.armWork[f.blocker.idx] + report.armWork[f.defender.idx];
    armImpulse += repImpulse;
    armWork += repWork;
    if (repImpulse > 1e-8) loadedTicks++;
    traces.push({ t: f.sim.t, requested, control, handRequest,
      blocker: structuredClone(f.blocker.body), defender: structuredClone(f.defender.body),
      liveHands: !!f.blocker.engagement, armImpulse: repImpulse, armWork: repWork,
      blockerArmImpulse: report.armImpulse[f.blocker.idx], defenderArmImpulse: report.armImpulse[f.defender.idx],
      handLoad: f.blocker.engagement ? {
        normal: f.engagement.hands!.normalForce ?? 0, tangent: f.engagement.hands!.tangentForce ?? 0,
        actor: f.engagement.hands!.actor === f.blocker.body ? 'blocker' : 'defender',
      } : null });
    f.sim.t += f.sim.dt;
    f.sim.perception.record(f.sim.agents);
  }
  return { input, capacities: f.capacities, capacitySha256: f.capacitySha256,
    initialBodiesSha256: f.initialBodiesSha256,
    technique: traits(f.blocker, input.type), defaultTechnique: traits(f.blocker),
    initialControl, armImpulse, armWork, loadedTicks, budgets,
    outcome: { liveHands: !!f.blocker.engagement, blockerSupport: f.blocker.body.support?.state,
      defenderSupport: f.defender.body.support?.state }, traces };
}

async function main() {
  if (process.argv.length > 3) throw new Error('Usage: run-contact-technique.ts [output.json]');
  const before = sourceVersion();
  const trials = (['run', 'pass'] as const).flatMap(type => [-1, 1].flatMap(side => [3, 11, 19].flatMap(seed =>
    [[90, 20], [20, 90], [20, 20], [90, 90]].map(([runBlock, passBlock]) =>
      executeContact({ type, side, seed, runBlock, passBlock })))));
  const after = sourceVersion();
  if (after !== before) throw new Error('Engine changed during collection');
  const receipt = { createdAt: new Date().toISOString(), sourceBefore: before, sourceAfter: after,
    collectorSha256: createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
    scope: '48 reduced real-contact reps; matched profiles, drills, balance, handTechnique and RNG; no natural football outcomes', trials };
  const output = process.argv[2] ?? 'out/run-contact-technique/candidate.json';
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(receipt));
  console.log(JSON.stringify({ output, sourceVersion: before, trials: trials.length,
    loadedTrials: trials.filter(t => t.loadedTicks > 0).length,
    maxWorkResidual: Math.max(...trials.map(t => t.budgets.maxWorkResidual)),
    maxBudgetExcess: Math.max(...trials.flatMap(t => Object.entries(t.budgets).filter(([k]) => k !== 'maxWorkResidual').map(([, v]) => v))),
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
