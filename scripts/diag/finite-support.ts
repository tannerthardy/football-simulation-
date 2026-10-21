/** Finite-foot lifecycle lab. No World selection or football controllers.
 * node --import tsx scripts/diag/finite-support.ts out/finite-support.json
 * Rejected candidates stay visible; conservation is not a realism certificate.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { PhysicalProfile } from '../../src/players/physical.js';
import { loadedSupport, newFiniteSupport, requestSupportStep, stepFiniteSupport, SupportSolveError,
  type SupportGrip, type SupportIntervalReport } from '../../src/physics/finite-support.js';
import { sourceVersion } from '../source-version.js';

const base: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
  brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3,
  reactReach: 2.6, reactionTime: .25, power: 100, balance: .5, bend: .5, stepSpeed: 3.4 };
const variants: Record<string, Partial<PhysicalProfile>> = { base: {}, strong: { power: 130 },
  heavy: { massKg: 125 }, wideBase: { balance: 1 } };
const conditions = ['free', 'moving', 'weak-hold', 'medium-hold', 'strong-hold'] as const;
type Condition = typeof conditions[number];
const capacities: Record<Condition, number> = { free: 0, moving: 0, 'weak-hold': 20, 'medium-hold': 200, 'strong-hold': 900 };
const duration = .4;
function run(condition: Condition, variant: string, side: number, tick: number, coupledUpdates: boolean) {
  const held = capacities[condition] > 0;
  const subject = newFiniteSupport({ ...base, ...variants[variant] }, { x: 0, y: .0011 * side });
  subject.velocity.x = condition === 'moving' ? .5 : 0;
  const bodies = held ? [newFiniteSupport(base, { x: -.65, y: .122 * side }), subject] : [subject];
  // Reflect complete geometry, retaining the same stable slot identity.
  if (side < 0) for (const b of bodies) for (const f of b.slots) {
    f.restOffset.y *= -1;
    f.position.y = b.position.y + f.restOffset.y;
    f.target = { ...f.position };
  }
  const target = { x: .45, y: subject.slots[0].position.y };
  const grips: SupportGrip[] = held ? [{ a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: 0, share: 1 },
    capacity: capacities[condition], holdDistance: Math.hypot(subject.slots[0].position.x - bodies[0].position.x,
      subject.slots[0].position.y - bodies[0].position.y), reach: 2 }] : [];
  requestSupportStep(subject, 0, target);
  const maxima = { workResidual: 0, momentumResidual: 0, passiveWork: 0, reachViolation: 0,
    tractionFraction: 0, commandFraction: 0, motorWorkExcess: 0, iterations: 0, stiffnessRatio: 0 };
  let count = 0, updates = 0, time = 0;
  let failure: SupportIntervalReport | null = null;
  const violations: string[] = [];
  const inspect = (r: SupportIntervalReport) => {
    count++; updates += r.coupledUpdates;
    maxima.workResidual = Math.max(maxima.workResidual, Math.abs(r.workResidual));
    maxima.momentumResidual = Math.max(maxima.momentumResidual, Math.hypot(r.momentumResidual.x, r.momentumResidual.y));
    maxima.passiveWork = Math.max(maxima.passiveWork, r.maxPassiveWork);
    maxima.reachViolation = Math.max(maxima.reachViolation, r.maxReachViolation);
    maxima.tractionFraction = Math.max(maxima.tractionFraction, ...r.tractionFraction);
    maxima.commandFraction = Math.max(maxima.commandFraction, ...r.commandFraction);
    maxima.motorWorkExcess = Math.max(maxima.motorWorkExcess, ...r.motorWorkByBody.map((w, i) => w - r.motorWorkLimit[i]));
    maxima.iterations = Math.max(maxima.iterations, r.iterations);
    maxima.stiffnessRatio = Math.max(maxima.stiffnessRatio, r.maxStiffnessRatio);
    if (Math.abs(r.workResidual) > 1e-7 || Math.hypot(r.momentumResidual.x, r.momentumResidual.y) > 1e-7
      || r.maxPassiveWork > 1e-7 || r.maxReachViolation > 1e-7
      || r.tractionFraction.some(x => x > 1 + 1e-9) || r.commandFraction.some(x => x > 1 + 1e-9)
      || r.motorWorkByBody.some((w, i) => w > r.motorWorkLimit[i] + 1e-7)) violations.push(`interval ${count}`);
  };
  while (time < duration - 1e-12) {
    const h = Math.min(tick, duration - time);
    try { stepFiniteSupport(bodies, grips, h, { coupledUpdates }).forEach(inspect); }
    catch (error) {
      if (!(error instanceof SupportSolveError)) throw error;
      failure = error.report; break;
    }
    time += h;
  }
  const foot = subject.slots[0];
  return { condition, variant, side, tick, coupledUpdates, status: failure ? 'rejected' : 'completed', time,
    intervals: count, coupledCount: updates, maxima, violations, failure,
    subject: { position: subject.position, velocity: subject.velocity, support: loadedSupport(subject),
      foot: { id: foot.id, mode: foot.mode, load: foot.load, position: foot.position, placement: foot.placement ?? null } },
    holder: held ? { position: bodies[0].position, velocity: bodies[0].velocity } : null };
}
const coupledUpdates = !process.argv.includes('--no-block');
const rows = Object.keys(variants).flatMap(variant => conditions.flatMap(condition => [1, -1].flatMap(side =>
  [.4, .05, .01, .0025].map(tick => run(condition, variant, side, tick, coupledUpdates)))));
const comparisons = rows.filter(r => r.side === 1).map(r => {
  const mirror = rows.find(q => q.variant === r.variant && q.condition === r.condition && q.tick === r.tick && q.side === -1)!;
  const fine = rows.find(q => q.variant === r.variant && q.condition === r.condition && q.side === r.side && q.tick === .0025)!;
  const mirrorCompleted = r.status === 'completed' && mirror.status === 'completed';
  const fineCompleted = r.status === 'completed' && fine.status === 'completed';
  const p = r.subject.position, m = mirror.subject.position, f = fine.subject.position;
  return { condition: r.condition, variant: r.variant, tick: r.tick, mirrorCompleted, fineCompleted,
    mirrorStatusDisagreement: r.status !== mirror.status,
    mirrorBodyErrorYd: mirrorCompleted ? Math.hypot(p.x - m.x, p.y + m.y) : null,
    bodyErrorVsFineYd: fineCompleted ? Math.hypot(p.x - f.x, p.y - f.y) : null };
});
const summary = { cases: rows.length, completed: rows.filter(r => r.status === 'completed').length,
  rejected: rows.filter(r => r.status === 'rejected').length, contractViolations: rows.reduce((n, r) => n + r.violations.length, 0),
  mirrorStatusDisagreements: comparisons.filter(c => c.mirrorStatusDisagreement).length,
  maxMirrorBodyErrorYd: Math.max(0, ...comparisons.map(c => c.mirrorBodyErrorYd ?? 0)),
  maxBodyErrorVsFineYd: Math.max(0, ...comparisons.map(c => c.bodyErrorVsFineYd ?? 0)),
  maximaOfCompleted: Object.fromEntries(Object.keys(rows[0].maxima).map(k => [k,
    Math.max(0, ...rows.filter(r => r.status === 'completed').map(r => r.maxima[k as keyof typeof r.maxima]))])) };
const out = process.argv.slice(2).find(a => !a.startsWith('--')) ?? 'out/finite-support.json';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ sourceSha256: sourceVersion(), nodeVersion: process.version, duration,
  baseProfile: base, variants, capacities, coupledUpdates,
  note: 'Planar massless-foot research kernel. Prescribed quasi-static loads; finite stroke lands at actual flat-ground point. No running gait, vertical dynamics, falls, World selection or football-technique validation. Rejected ticks rollback; their reports remain diagnostic candidates.',
  summary, comparisons, rows }, null, 2) + '\n');
console.log(JSON.stringify({ out, ...summary }, null, 2));
if (summary.contractViolations) process.exitCode = 1;
