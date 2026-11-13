/** Deterministic mechanical stress, not a calibrated gait or game outcome.
 * node --import tsx scripts/diag/finite-support-stress.ts [output.json] [--no-block] [--seed=N] [--cases=N]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Vec2 } from '../../src/core/vec.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
import { newFiniteSupport, solveSupportInterval, type FiniteSupportBody,
  type SupportGrip, type SupportIntervalReport, type SupportSolveOptions } from '../../src/physics/finite-support.js';
import { sourceVersion } from '../source-version.js';

const profile: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5 };
function integerOption(name: string, fallback: number, minimum: number, maximum: number): number {
  const matches = process.argv.slice(2).filter(arg => arg.startsWith(`--${name}=`));
  if (matches.length > 1) throw new RangeError(`Specify --${name} only once`);
  if (!matches.length) return fallback;
  const raw = matches[0].slice(name.length + 3), value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isInteger(value) || value < minimum || value > maximum)
    throw new RangeError(`--${name} must be an integer in [${minimum}, ${maximum}]`);
  return value;
}
const seed = integerOption('seed', 4713, 0, 0xffffffff);
const cases = integerOption('cases', 240, 1, 100000);
let state = seed;
const random = (): number => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
const zero = (): Vec2 => ({ x: 0, y: 0 });
const solverOptions: SupportSolveOptions = { maxIterations: 256, tolerance: 1e-9,
  coupledUpdates: !process.argv.includes('--no-block') };
interface Input { bodies: FiniteSupportBody[]; grips: SupportGrip[]; dt: number; commands: Vec2[][] }
interface Metrics {
  converged: boolean; iterations: number; coupledUpdates: number; impulseChange: number;
  passiveWork: number; reachViolation: number; workResidual: number; momentumResidual: number;
  speedExcess: number; forceExcess: number; motorWorkExcess: number; tractionExcess: number;
}
interface Failure { panel: string; caseId: number; issues: string[]; metrics: Metrics; input: Input }
const failures: Failure[] = [], violations: Failure[] = [];
const panels: Record<string, { candidates: number; converged: number; nonconverged: number; coupledUpdates: number;
  maxima: Record<string, number> }> = {};
function finiteNumbers(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteNumbers);
  if (value && typeof value === 'object') return Object.values(value).every(finiteNumbers);
  return true;
}
function inspect(input: Input, report: SupportIntervalReport, initial: Vec2[]): { metrics: Metrics; issues: string[] } {
  const metrics: Metrics = { converged: report.converged, iterations: report.iterations, coupledUpdates: report.coupledUpdates,
    impulseChange: report.maxImpulseChange, passiveWork: report.maxPassiveWork, reachViolation: report.maxReachViolation,
    workResidual: Math.abs(report.workResidual), momentumResidual: Math.hypot(report.momentumResidual.x, report.momentumResidual.y),
    speedExcess: 0, forceExcess: 0, motorWorkExcess: 0, tractionExcess: 0 };
  for (let i = 0; i < input.bodies.length; i++) {
    const body = input.bodies[i];
    let speed = 0;
    for (let f = 0; f < 2; f++) {
      const mean = { x: (initial[i].x + body.velocity.x) / 2, y: (initial[i].y + body.velocity.y) / 2 };
      const free = { x: report.slotMeanVelocity[i][f].x - mean.x - body.mobility * report.slotImpulse[i][f].x / input.dt,
        y: report.slotMeanVelocity[i][f].y - mean.y - body.mobility * report.slotImpulse[i][f].y / input.dt };
      speed += Math.hypot(free.x, free.y);
    }
    metrics.speedExcess = Math.max(metrics.speedExcess, speed - body.stepSpeed);
    metrics.forceExcess = Math.max(metrics.forceExcess, speed / body.mobility - body.legForce);
    metrics.motorWorkExcess = Math.max(metrics.motorWorkExcess, report.motorWorkByBody[i] - report.motorWorkLimit[i]);
    metrics.tractionExcess = Math.max(metrics.tractionExcess, report.tractionFraction[i] - 1);
  }
  const issues: string[] = [];
  if (!finiteNumbers(report) || !finiteNumbers(input.bodies)) issues.push('nonfinite report or resulting body state');
  // A nonconverged candidate is explicitly rejected, never silently passed.
  if (report.converged) {
    if (metrics.passiveWork > 1e-7) issues.push('positive passive work');
    if (metrics.reachViolation > 1e-7) issues.push('finite reach');
    if (metrics.workResidual > 1e-8) issues.push('work closure');
    if (metrics.momentumResidual > 1e-8) issues.push('momentum closure');
    if (metrics.speedExcess > 1e-8) issues.push('shared command speed');
    if (metrics.forceExcess > 1e-8) issues.push('shared command force');
    if (metrics.motorWorkExcess > 1e-8) issues.push('active motor work');
    if (metrics.tractionExcess > 1e-8) issues.push('shared ground traction');
  }
  return { metrics, issues };
}
function run(panel: string, caseId: number, input: Input): void {
  const snapshot = structuredClone(input), initial = input.bodies.map(b => ({ ...b.velocity }));
  const report = solveSupportInterval(input.bodies, input.grips, input.dt, input.commands, undefined, solverOptions);
  const { metrics, issues } = inspect(input, report, initial);
  const summary = panels[panel] ??= { candidates: 0, converged: 0, nonconverged: 0, coupledUpdates: 0, maxima: {} };
  summary.candidates++; summary.coupledUpdates += metrics.coupledUpdates;
  if (metrics.converged) summary.converged++; else summary.nonconverged++;
  for (const [key, value] of Object.entries(metrics)) if (typeof value === 'number') {
    summary.maxima[key] = Math.max(summary.maxima[key] ?? 0, value);
    if (metrics.converged) summary.maxima[`converged_${key}`] = Math.max(summary.maxima[`converged_${key}`] ?? 0, value);
  }
  const record = { panel, caseId, metrics, input: snapshot, issues };
  if (!metrics.converged) failures.push(record);
  if (issues.length) violations.push(record);
}

let panelCase = 0;
for (const dt of [.001, .02, .1, .5]) for (const share of [0, .5, 1]) for (const capacity of [20, 900]) {
  const bodies = [newFiniteSupport(profile, zero()), newFiniteSupport(profile, { x: 1, y: 0 })];
  bodies[0].velocity = { x: -2, y: .7 }; bodies[1].velocity = { x: 3, y: -.2 };
  const grips: SupportGrip[] = [{ a: { body: 0, slot: 0, share }, b: { body: 1, slot: 0, share },
    capacity, holdDistance: 1, reach: 2 }];
  run('original24', panelCase++, { bodies, grips, dt,
    commands: [[{ x: 2, y: 1 }, zero()], [zero(), { x: -1, y: 2 }]] });
}
for (let caseId = 0; caseId < cases; caseId++) {
  const bodies = [0, 1, 2].map(i => newFiniteSupport(profile, { x: i * .8, y: (random() - .5) * .2 }));
  bodies.forEach(b => {
    b.velocity = { x: (random() - .5) * 8, y: (random() - .5) * 4 };
    b.mobility *= 10 ** (random() * 2 - 1); b.legForce *= random() * 2;
    b.stepSpeed *= .2 + random() * 2; b.traction *= random() * 2;
    b.slots[0].load = random(); b.slots[1].load = 1 - b.slots[0].load;
  });
  const dt = .002 * 10 ** (random() * 2);
  const grips: SupportGrip[] = [0, 1, 2, 3].map(k => ({ a: { body: k % 2, slot: k % 2 as 0 | 1, share: random() },
    b: { body: 2, slot: (k + 1) % 2 as 0 | 1, share: random() },
    capacity: 20 + random() * 1000, holdDistance: .2 + random(), reach: 3 }));
  const commands = bodies.map(() => [0, 1].map(() => ({ x: (random() - .5) * 20, y: (random() - .5) * 20 })));
  run(`seeded${cases}`, caseId, { bodies, grips, dt, commands });
}
const output = process.argv.slice(2).find(arg => !arg.startsWith('--')) ?? 'out/finite-support-stress.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ sourceSha256: sourceVersion(), node: process.version, seed, cases,
  solverOptions, scope: 'Planar massless-relative-coordinate candidate solve; failed candidates are not valid continuation states.',
  thresholds: { passiveWork: 1e-7, reach: 1e-7, closureAndBudget: 1e-8 }, panels,
  contractViolations: violations, nonconvergentCandidates: failures }, null, 2) + '\n');
console.log(JSON.stringify({ output, panels: Object.fromEntries(Object.entries(panels).map(([name, panel]) => [name,
  { candidates: panel.candidates, converged: panel.converged, nonconverged: panel.nonconverged,
    coupledUpdates: panel.coupledUpdates }])), contractViolations: violations.length }, null, 2));
if (violations.length) process.exitCode = 1;
