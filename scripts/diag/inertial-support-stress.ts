/** Seeded inertial-foot mechanics probe; a numerical stress cohort, not gait calibration/readiness.
 * node --import tsx scripts/diag/inertial-support-stress.ts [output.json] [--seed=N] [--cases=N]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import type { Vec2 } from '../../src/core/vec.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
import { newInertialSupport, solveInertialSupportInterval, torsoPosition,
  type InertialSupportBody, type InertialSupportReport, type InertialSupportSolveOptions } from '../../src/physics/inertial-support.js';
import type { SupportGrip } from '../../src/physics/finite-support.js';
import { sourceVersion } from '../source-version.js';

const profile: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5 };
function option(name: string, fallback: number, min: number, max: number): number {
  const args = process.argv.slice(2).filter(a => a.startsWith(`--${name}=`));
  if (args.length > 1) throw new Error(`Specify --${name} once`);
  if (!args.length) return fallback;
  const raw = args[0].slice(name.length + 3), value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid --${name}`);
  return value;
}
const seed = option('seed', 9713, 0, 0xffffffff), cases = option('cases', 200, 1, 10000);
const requestedGrips = option('grips', 1, 1, 4);
const gripArg = process.argv.slice(2).filter(a => a.startsWith('--grip-model='));
if (gripArg.length > 1) throw new Error('Specify --grip-model once');
const gripModel = (gripArg[0]?.slice('--grip-model='.length) ?? 'tether') as 'tether' | 'vector';
if (gripModel !== 'tether' && gripModel !== 'vector') throw new Error('--grip-model must be tether or vector');
const sourceSha256Start = sourceVersion();
const scriptSha256Start = createHash('sha256').update(readFileSync('scripts/diag/inertial-support-stress.ts')).digest('hex');
let rng = seed;
const random = (): number => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };
const z = (): Vec2 => ({ x: 0, y: 0 });
const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
const len = (a: Vec2): number => Math.hypot(a.x, a.y);
const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
const perp = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });
type Panel = 'midpoint-ablation' | 'endpoint-static' | 'endpoint-slip' | 'coupled-slip-midpoint';
interface Input { bodies: InertialSupportBody[]; grips: SupportGrip[]; dt: number; forces: Vec2[][]; external: Vec2[]; }
interface Metric {
  converged: boolean; iterations: number; impulseChange: number; maxPassiveWork: number;
  workResidualAbs: number; linearResidual: number; angularResidual: number;
  explicitGripGap: number; angularClosure: number; maxReachViolation: number;
  strengthExcess: number; tractionCapExcess: number; gripCapExcess: number;
  gripCapRecoverable: boolean; gripCapRecoveryRank: number; gripCapRecoveryUnknowns: number; gripCapRecoveryResidual: number;
  uncappedHoldViolation: number; slippingHoldExtension: number; unrepresentedGripAngular: number;
  stoppingFlags: number; projectionReversal: number; workBySource: number[];
}
const cohorts: Record<Panel, { candidates: number; accepted: number; rejected: number; maxima: Record<string, number>; }> = {
  'midpoint-ablation': { candidates: 0, accepted: 0, rejected: 0, maxima: {} },
  'endpoint-static': { candidates: 0, accepted: 0, rejected: 0, maxima: {} },
  'endpoint-slip': { candidates: 0, accepted: 0, rejected: 0, maxima: {} },
  'coupled-slip-midpoint': { candidates: 0, accepted: 0, rejected: 0, maxima: {} },
};
const rejected: unknown[] = [], violations: unknown[] = [], projectionReversals: unknown[] = [], gripGaps: unknown[] = [], gripCapUnverified: unknown[] = [];
const graphCounts = { zeroGrip: 0, oneGrip: 0, multiGrip: 0, repeatedOwner: 0, sharedOwnerSlot: 0, multipleOwners: 0 };
const attachment = (b: InertialSupportBody, slot: 0 | 1, share: number): Vec2 =>
  add(mul(torsoPosition(b), 1 - share), mul(b.slots[slot].position, share));
function gripGapsFor(input: Input): number[] {
  return input.grips.map(g => len(sub(attachment(input.bodies[g.b.body], g.b.slot, g.b.share),
    attachment(input.bodies[g.a.body], g.a.slot, g.a.share))) - g.holdDistance);
}
function leastSquares(matrix: number[][], values: number[]): { solution: number[]; residual: number } | null {
  const n = matrix[0]?.length ?? 0;
  if (n === 0 || matrix.length !== values.length) return null;
  const normal = Array.from({ length: n }, () => Array(n + 1).fill(0) as number[]);
  for (let r = 0; r < matrix.length; r++) for (let i = 0; i < n; i++) {
    normal[i][n] += matrix[r][i] * values[r];
    for (let j = 0; j < n; j++) normal[i][j] += matrix[r][i] * matrix[r][j];
  }
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(normal[row][col]) > Math.abs(normal[pivot][col])) pivot = row;
    if (Math.abs(normal[pivot][col]) < 1e-12) return null;
    [normal[col], normal[pivot]] = [normal[pivot], normal[col]];
    const scale = normal[col][col]; for (let j = col; j <= n; j++) normal[col][j] /= scale;
    for (let row = 0; row < n; row++) if (row !== col) {
      const factor = normal[row][col]; for (let j = col; j <= n; j++) normal[row][j] -= factor * normal[col][j];
    }
  }
  const solution = normal.map(row => row[n]);
  let residual = 0;
  for (let r = 0; r < matrix.length; r++) {
    const predicted = matrix[r].reduce((sum, coefficient, j) => sum + coefficient * solution[j], 0);
    residual = Math.max(residual, Math.abs(predicted - values[r]));
  }
  return { solution, residual };
}
function recoverGripImpulses(input: Input, before: InertialSupportBody[], report: InertialSupportReport):
  { magnitudes: number[] | null; residual: number; rank: number } {
  if (!input.grips.length) return { magnitudes: [], residual: 0, rank: 0 };
  const coefficients = (attachment: SupportGrip['a'], foot: 0 | 1): number => {
    const body = input.bodies[attachment.body], torso = body.mass - body.footMass[0] - body.footMass[1];
    return (attachment.slot === foot ? attachment.share : 0) - (1 - attachment.share) * body.footMass[foot] / torso;
  };
  const rows: number[][] = [], rhsX: number[] = [], rhsY: number[] = [];
  for (let i = 0; i < input.bodies.length; i++) {
    const body = input.bodies[i], torso = body.mass - body.footMass[0] - body.footMass[1];
    const com = sub(sub(mul(sub(body.velocity, before[i].velocity), body.mass), input.external[i]), report.groundImpulse[i]);
    const comRow = input.grips.map(g => (g.a.body === i ? -1 : 0) + (g.b.body === i ? 1 : 0));
    rows.push(comRow); rhsX.push(com.x); rhsY.push(com.y);
    const totalMotor = add(report.physicalLegImpulse[i][0], report.physicalLegImpulse[i][1]);
    for (const f of [0, 1] as const) {
      const physical = sub(add(report.physicalLegImpulse[i][f], mul(totalMotor, body.footMass[f] / torso)),
        mul(input.external[i], body.footMass[f] / torso));
      let reach = z();
      for (const k of [0, 1] as const) reach = add(reach,
        mul(report.slotReachImpulse[i][k], (f === k ? 1 : 0) + body.footMass[k] / torso));
      const value = sub(sub(sub(report.relativeImpulse[i][f], physical), report.slotGroundImpulse[i][f]), reach);
      rows.push(input.grips.map(g => (g.a.body === i ? -coefficients(g.a, f) : 0)
        + (g.b.body === i ? coefficients(g.b, f) : 0)));
      rhsX.push(value.x); rhsY.push(value.y);
    }
  }
  const x = leastSquares(rows, rhsX), y = leastSquares(rows, rhsY);
  if (!x || !y) {
    const matrix = rows.map(row => [...row]), cols = input.grips.length;
    let rank = 0;
    for (let col = 0; col < cols && rank < matrix.length; col++) {
      let pivot = rank;
      for (let row = rank + 1; row < matrix.length; row++) if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) pivot = row;
      if (Math.abs(matrix[pivot][col]) < 1e-10) continue;
      [matrix[rank], matrix[pivot]] = [matrix[pivot], matrix[rank]];
      const scale = matrix[rank][col];
      for (let row = rank + 1; row < matrix.length; row++) {
        const factor = matrix[row][col] / scale;
        for (let k = col; k < cols; k++) matrix[row][k] -= factor * matrix[rank][k];
      }
      rank++;
    }
    return { magnitudes: null, residual: 1e9, rank };
  }
  return { magnitudes: x.solution.map((value, i) => Math.hypot(value, y.solution[i])), residual: Math.max(x.residual, y.residual), rank: input.grips.length };
}
function generate(caseId: number, fraction: number, dt: number): Input {
  const count = 1 + Math.floor(random() * 3);
  const bodies = Array.from({ length: count }, (_, i) => {
    const b = newInertialSupport(profile, { x: i * .35 + (random() - .5) * .2, y: (random() - .5) * .2 },
      { footMassFractions: [fraction, fraction] });
    b.angle = (random() - .5) * .25; b.angularVelocity = (random() - .5) * 1.4;
    b.velocity = { x: (random() - .5) * 6, y: (random() - .5) * 3 };
    // Rigid material initial field: the point velocities include the rotor spin.
    b.footVelocity = b.slots.map(f => add(b.velocity, mul(perp(sub(f.position, b.position)), b.angularVelocity))) as [Vec2, Vec2];
    const swing = random() < .24 ? (random() < .5 ? 0 : 1) as 0 | 1 : null;
    if (swing !== null) {
      const stance: 0 | 1 = swing === 0 ? 1 : 0;
      b.slots[swing].mode = 'swing'; b.slots[swing].load = 0; b.slots[stance].mode = 'plant'; b.slots[stance].load = 1;
    } else {
      const load = .05 + .9 * random(); b.slots[0].mode = 'plant'; b.slots[1].mode = 'plant';
      b.slots[0].load = load; b.slots[1].load = 1 - load;
    }
    // Moderate physical motor force requests, sometimes beyond the shared cap to verify scaling.
    b.legForce *= .35 + random() * 2.1;
    return b;
  });
  const grips: SupportGrip[] = [];
  if (requestedGrips === 1 && count > 1 && random() < .78) {
    const a = Math.floor(random() * count), b = (a + 1 + Math.floor(random() * (count - 1))) % count;
    const slotA = random() < .5 ? 0 : 1, slotB = random() < .5 ? 0 : 1;
    const shareA = random(), shareB = random(), aa = attachment(bodies[a], slotA, shareA), bb = attachment(bodies[b], slotB, shareB);
    const initialDistance = len(sub(bb, aa));
    grips.push({ a: { body: a, slot: slotA, share: shareA }, b: { body: b, slot: slotB, share: shareB },
      capacity: 30 + random() * 800, holdDistance: initialDistance + .005 + random() * .5,
      reach: Math.max(2.5, initialDistance + .1) });
  } else if (requestedGrips > 1 && count > 1) {
    const owners = count >= 3 ? [0, 0, 1, 2] : [0, 0, 1, 1];
    for (let k = 0; k < requestedGrips; k++) {
      const owner = owners[k] % count;
      const other = count === 2 ? 1 - owner : (owner + 1 + Math.floor(random() * (count - 1))) % count;
      const slotA = (owner === 0 && k < 2 ? 0 : (owner + k) % 2) as 0 | 1;
      const slotB = (k % 2) as 0 | 1;
      const shareA = random(), shareB = random();
      const aa = attachment(bodies[owner], slotA, shareA), bb = attachment(bodies[other], slotB, shareB);
      const initialDistance = len(sub(bb, aa));
      grips.push({ a: { body: owner, slot: slotA, share: shareA }, b: { body: other, slot: slotB, share: shareB },
        capacity: 30 + random() * 800, holdDistance: initialDistance + .005 + random() * .5,
        reach: Math.max(2.5, initialDistance + .1) });
    }
  }
  const owners = grips.map(g => g.a.body), ownerCounts = new Map<number, number>();
  for (const owner of owners) ownerCounts.set(owner, (ownerCounts.get(owner) ?? 0) + 1);
  if (grips.length === 0) graphCounts.zeroGrip++;
  else if (grips.length === 1) graphCounts.oneGrip++;
  else graphCounts.multiGrip++;
  if ([...ownerCounts.values()].some(n => n > 1)) graphCounts.repeatedOwner++;
  if (new Set(owners).size > 1) graphCounts.multipleOwners++;
  if (grips.some((g, i) => grips.some((h, j) => j > i && g.a.body === h.a.body && g.a.slot === h.a.slot))) graphCounts.sharedOwnerSlot++;
  const forces = bodies.map(b => [0, 1].map(() => ({ x: (random() - .5) * b.legForce * 1.4, y: (random() - .5) * b.legForce * 1.4 })));
  const external = bodies.map(() => ({ x: (random() - .5) * 45, y: (random() - .5) * 35 }));
  return { bodies, grips, dt, forces, external };
}
function run(panel: Panel, id: string, input: Input): void {
  if (panel === 'endpoint-static') for (const b of input.bodies) for (const f of b.slots)
    if (f.mode === 'plant') b.footVelocity[f.id] = z();
  const snapshot = structuredClone(input), before = structuredClone(input.bodies), initialGap = gripGapsFor(input);
  let directions: Array<Array<Vec2 | null>> | undefined;
  if (panel === 'endpoint-slip' || panel === 'coupled-slip-midpoint') directions = input.bodies.map(b => b.slots.map(f => {
    if (f.mode !== 'plant' || len(b.footVelocity[f.id]) < 1e-7) return null;
    const v = b.footVelocity[f.id], n = len(v); return mul(v, 1 / n);
  }));
  const options: InertialSupportSolveOptions = panel === 'midpoint-ablation'
    ? { staticGround: 'midpoint', gripModel }
    : { staticGround: 'endpoint', gripModel, ...(directions ? { slidingDirections: directions } : {}),
      ...(panel === 'coupled-slip-midpoint' ? { slidingFriction: 'midpoint' as const } : {}) };
  const report = solveInertialSupportInterval(input.bodies, input.grips, input.dt, input.forces, input.external, options);
  const finalGap = gripGapsFor(input);
  const recoveredGrips = recoverGripImpulses(input, before, report);
  const gripLimits = input.grips.map(g => {
    const ownerGrips = input.grips.filter(o => !o.broken && o.a.body === g.a.body);
    const total = ownerGrips.reduce((sum, o) => sum + o.capacity, 0);
    const strongest = Math.max(0, ...ownerGrips.map(o => o.capacity));
    return g.capacity * Math.min(1, strongest / Math.max(1e-30, total)) * input.dt;
  });
  const gripCapRecoverable = recoveredGrips.magnitudes !== null;
  const gripCapExcess = recoveredGrips.magnitudes
    ? Math.max(0, ...recoveredGrips.magnitudes.map((m, i) => m - gripLimits[i])) : (input.grips.length ? 1e9 : 0);
  const angularResidual = Math.abs(report.angularMomentumResidual);
  const metric: Metric = {
    converged: report.converged, iterations: report.iterations, impulseChange: report.maxImpulseChange,
    maxPassiveWork: report.maxPassiveWork, workResidualAbs: Math.abs(report.workResidual),
    linearResidual: len(report.momentumResidual), angularResidual,
    explicitGripGap: Math.max(0, ...finalGap),
    angularClosure: Math.abs(report.angularMomentumAfter - report.angularMomentumBefore - report.externalAngularImpulse
      - report.unrepresentedAngularImpulse.total), maxReachViolation: report.maxReachViolation,
    strengthExcess: Math.max(0, ...report.commandForce.map((f, i) => f - input.bodies[i].legForce)),
    tractionCapExcess: Math.max(0, ...report.slotGroundImpulse.flatMap((slots, i) => slots.map((p, f) => {
      const cap = input.bodies[i].traction * input.bodies[i].slots[f].load * input.dt;
      return len(p) - cap;
    }))),
    gripCapExcess, gripCapRecoverable, gripCapRecoveryRank: recoveredGrips.rank,
    gripCapRecoveryUnknowns: input.grips.length, gripCapRecoveryResidual: recoveredGrips.residual,
    uncappedHoldViolation: report.maxUncappedHoldDistanceViolation,
    slippingHoldExtension: report.gripSlips.some(Boolean) ? report.maxHoldDistanceViolation : 0,
    unrepresentedGripAngular: Math.abs(report.unrepresentedAngularImpulse.grip),
    stoppingFlags: report.groundStopping.flat().filter(Boolean).length,
    projectionReversal: Math.max(0, ...before.flatMap((b, i) => b.slots.filter(f => f.mode === 'plant').map(f => {
      const v0 = b.footVelocity[f.id], v1 = report.slotEndVelocity[i][f.id];
      return len(v0) > 1e-7 && dot(v0, v1) < 0 ? Math.min(len(v0), len(v1)) : 0;
    }))),
    workBySource: [report.motorWork, report.groundWork, report.gripWork, report.reachWork, report.externalWork],
  };
  const cohort = cohorts[panel]; cohort.candidates++;
  if (report.converged) cohort.accepted++; else cohort.rejected++;
  for (const [key, value] of Object.entries(metric)) if (typeof value === 'number') cohort.maxima[key] = Math.max(cohort.maxima[key] ?? 0, value);
  const record = { panel, id, massFractions: before.map(b => b.footMass.map(m => m / b.mass)), dt: input.dt,
    metric, input: snapshot, report, gripGapBefore: initialGap, gripGapAfter: finalGap };
  if (!report.converged) rejected.push(record);
  if (!metric.gripCapRecoverable) gripCapUnverified.push(record);
  if (metric.explicitGripGap > 1e-7) gripGaps.push({ panel, id, maximumGapBeyondHold: metric.explicitGripGap, before: initialGap, after: finalGap });
  if (metric.projectionReversal > 1e-7) projectionReversals.push({ panel, id, magnitude: metric.projectionReversal,
    directions, initialFootVelocities: before.map(b => b.footVelocity), end: report.slotEndVelocity,
    note: 'Projection reversal only; unsplit interval is not a physical stop or trajectory validation.' });
  const failedContract = report.converged && (!Number.isFinite(metric.workResidualAbs) || metric.workResidualAbs > 1e-7
    || metric.linearResidual > 1e-7 || metric.angularClosure > 1e-7 || metric.maxPassiveWork > 1e-7
    || metric.maxReachViolation > 1e-7 || metric.strengthExcess > 1e-7 || metric.tractionCapExcess > 1e-7
    || metric.gripCapExcess > 1e-7 || !metric.gripCapRecoverable || metric.gripCapRecoveryResidual > 1e-7
    || metric.uncappedHoldViolation > 1e-7
    || (gripModel === 'tether' && metric.unrepresentedGripAngular > 1e-7));
  if (failedContract) violations.push(record);
}

let serial = 0;
for (const fraction of [.01, .020842, .04]) for (const dt of [.001, .01, .04]) for (let c = 0; c < cases; c++) {
  const input = generate(c, fraction, dt), id = `random-${serial++}-seedcase-${c}`;
  run('midpoint-ablation', id, structuredClone(input));
  run('endpoint-static', id, structuredClone(input));
  run('endpoint-slip', id, structuredClone(input));
  run('coupled-slip-midpoint', id, structuredClone(input));
}
// Controlled stop comparison: same material-consistent foot slip and force field, varying only contact law.
for (const fraction of [.01, .020842, .04]) for (const speed of [.25, 1, 3]) for (const dt of [.001, .01, .04]) {
  const b = newInertialSupport(profile, z(), { footMassFractions: [fraction, fraction] });
  b.slots[0].mode = 'plant'; b.slots[1].mode = 'swing'; b.slots[0].load = 1; b.slots[1].load = 0;
  b.footVelocity = [{ x: speed, y: 0 }, { x: speed, y: 0 }];
  const input: Input = { bodies: [b], grips: [], dt, forces: [[z(), z()]], external: [z()] }, id = `stop-${fraction}-${speed}-${dt}`;
  for (const panel of ['midpoint-ablation', 'endpoint-static', 'endpoint-slip', 'coupled-slip-midpoint'] as Panel[]) run(panel, id, structuredClone(input));
}
// Static-plant comparison starts from exact foot rest, then applies the same bounded active motor request.
for (const fraction of [.01, .020842, .04]) for (const dt of [.001, .01, .04]) {
  const b = newInertialSupport(profile, z(), { footMassFractions: [fraction, fraction] });
  b.velocity = z(); b.footVelocity = [z(), z()]; b.angularVelocity = 0;
  b.slots[0].load = .6; b.slots[1].load = .4;
  const input: Input = { bodies: [b], grips: [], dt, forces: [[{ x: 75, y: -8 }, { x: -25, y: 12 }]], external: [z()] };
  for (const panel of ['midpoint-ablation', 'endpoint-static', 'coupled-slip-midpoint'] as Panel[])
    run(panel, `static-rest-${fraction}-${dt}`, structuredClone(input));
}
// Isolated internal motor/rotor ledger: no contact, grip, reach, or external impulse can supply angular impulse.
for (const fraction of [.01, .020842, .04]) for (const dt of [.001, .01, .04]) {
  const b = newInertialSupport(profile, z(), { footMassFractions: [fraction, fraction] });
  b.traction = 0; b.angularVelocity = 0; b.slots[0].load = 1; b.slots[1].load = 0;
  const input: Input = { bodies: [b], grips: [], dt, forces: [[{ x: 0, y: 32 }, { x: 0, y: -21 }]], external: [z()] };
  run('midpoint-ablation', `rotor-ledger-${fraction}-${dt}`, input);
}
const output = process.argv.slice(2).find(a => !a.startsWith('--')) ?? 'out/inertial-support-stress.json';
mkdirSync(dirname(output), { recursive: true });
const sourceSha256End = sourceVersion();
const scriptSha256End = createHash('sha256').update(readFileSync('scripts/diag/inertial-support-stress.ts')).digest('hex');
if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End) {
  console.error(JSON.stringify({ error: 'source or stress script changed during run; output withheld', sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End }));
  process.exitCode = 2;
  process.exit();
}
const expectedSlipBracketRejects = rejected.filter((item) => {
  const r = item as { panel?: Panel; metric?: Metric };
  return r.panel === 'endpoint-slip' && (r.metric?.maxPassiveWork ?? 0) > 1e-7 && (r.metric?.projectionReversal ?? 0) > 1e-7;
}).length;
writeFileSync(output, JSON.stringify({ sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End, seed, cases, requestedGrips, graphCounts, gripModel, node: process.version,
  panels: cohorts, rejected, contractViolations: violations, gripCapUnverifiedCases: gripCapUnverified,
  projectionReversalCases: projectionReversals, explicitGripGapCases: gripGaps,
  expectedUnsplitSlipBracketRejects: expectedSlipBracketRejects,
  criteria: { workResidual: 1e-7, linearAngularClosure: 1e-7, passiveWork: 1e-7, reach: 1e-7,
    strengthTractionGripCapacityAndUncappedHold: 1e-7 }, scope: 'Seeded inertial research-kernel mechanics only; no gait calibration or production readiness claim.' }, null, 2) + '\n');
console.log(JSON.stringify({ output, panels: Object.fromEntries(Object.entries(cohorts).map(([k, v]) =>
  [k, { candidates: v.candidates, accepted: v.accepted, rejected: v.rejected, maxProjectionReversal: v.maxima.projectionReversal,
    maxWorkResidual: v.maxima.workResidualAbs, maxAngularClosure: v.maxima.angularClosure,
    maxGripGap: v.maxima.explicitGripGap, maxUncappedHoldViolation: v.maxima.uncappedHoldViolation,
    maxTractionCapExcess: v.maxima.tractionCapExcess, maxGripCapExcess: v.maxima.gripCapExcess,
    maxUnrepresentedGripAngular: v.maxima.unrepresentedGripAngular }])), rejected: rejected.length, violations: violations.length,
  projectionReversalCases: projectionReversals.length, expectedUnsplitSlipBracketRejects: expectedSlipBracketRejects,
  gripCapUnverifiedCases: gripCapUnverified.length,
  gripGapCases: gripGaps.length }, null, 2));
if (violations.length) process.exitCode = 1;
