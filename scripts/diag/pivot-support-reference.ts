/** Independent continuous constrained mechanics reference, not a game backend.
 * Node 22: node --import tsx scripts/diag/pivot-support-reference.ts [output.json]
 * One frictionless material point supports a planar pitching isotropic body.
 * Its analytic constraint manifold is the reference coordinate system; this
 * script never projects a production or midpoint-solver pose onto the plane.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceVersion } from '../source-version.js';

if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run this reference with Node 22');
if (process.argv.length > 3 || process.argv[2]?.startsWith('--')) throw new Error('Specify at most one output path');
const output = process.argv[2] ?? 'out/pivot-support-reference.json';
const selfPath = fileURLToPath(import.meta.url);
const scriptHash = () => createHash('sha256').update(readFileSync(selfPath)).digest('hex');
const sourceSha256Start = sourceVersion(), scriptSha256Start = scriptHash();
const input = { mass: 1, inertia: 1, localPoint: { x: .3, y: 0, z: -1 }, theta: 0, omega: 2,
  comPosition: { x: 0, y: 0, z: 1 }, comVelocity: { x: 0, y: 0, z: .6 }, gravity: 10,
  horizon: .2, planeHeight: 0, friction: 0, units: 'kg, yd, s; positive theta and omega about world +y' };
const { mass: m, inertia: I, gravity: g } = input;
interface State { theta: number; omega: number }
interface Rate extends State {}
interface Snapshot {
  theta: number; omega: number; rx: number; rz: number; normal: number;
  comPosition: { x: number; y: number; z: number }; comVelocity: { x: number; y: number; z: number };
  materialPointPosition: { x: number; y: number; z: number }; materialPointVelocity: { x: number; y: number; z: number };
  linearMomentum: { x: number; y: number; z: number }; angularMomentumAboutWorldOrigin: { x: number; y: number; z: number };
  kineticEnergy: number; gravityEnergy: number; energy: number;
}
function snapshot(state: State, time: number): Snapshot {
  // R_y(theta) applied to the actual local material point. Therefore
  // rx_dot = rz*omega and rz_dot = -rx*omega.
  const rx = input.localPoint.x * Math.cos(state.theta) + input.localPoint.z * Math.sin(state.theta);
  const rz = -input.localPoint.x * Math.sin(state.theta) + input.localPoint.z * Math.cos(state.theta);
  // Frictionless contact has no horizontal force, so COM vx stays constant.
  const x = input.comPosition.x + input.comVelocity.x * time, z = input.planeHeight - rz;
  const vx = input.comVelocity.x, vz = rx * state.omega;
  const normal = m * I * (g + rz * state.omega ** 2) / (I + m * rx ** 2);
  const kineticEnergy = .5 * m * (vx ** 2 + vz ** 2) + .5 * I * state.omega ** 2;
  const gravityEnergy = m * g * z;
  return { ...state, rx, rz, normal, comPosition: { x, y: 0, z }, comVelocity: { x: vx, y: 0, z: vz },
    materialPointPosition: { x: x + rx, y: 0, z: z + rz },
    materialPointVelocity: { x: vx + rz * state.omega, y: 0, z: vz - rx * state.omega },
    linearMomentum: { x: m * vx, y: 0, z: m * vz },
    angularMomentumAboutWorldOrigin: { x: 0, y: I * state.omega + z * m * vx - x * m * vz, z: 0 },
    kineticEnergy, gravityEnergy, energy: kineticEnergy + gravityEnergy };
}
const initial = snapshot({ theta: input.theta, omega: input.omega }, 0);
if (Math.abs(initial.comPosition.z - input.comPosition.z) > 1e-14 || Math.abs(initial.comVelocity.z - input.comVelocity.z) > 1e-14
  || Math.abs(initial.materialPointPosition.z - input.planeHeight) > 1e-14 || Math.abs(initial.materialPointVelocity.z) > 1e-14)
  throw new Error('Initial material contact geometry and true normal velocity are inconsistent');

// z=-rz and vz=rx*omega imply az=rz*omega^2+rx*omega_dot.
// m*az=N-m*g and I*omega_dot=-rx*N yield the normal above.
function rate(state: State, time: number): Rate {
  const s = snapshot(state, time);
  return { theta: state.omega, omega: -s.rx * s.normal / I };
}
const shifted = (s: State, r: Rate, h: number): State => ({ theta: s.theta + h * r.theta, omega: s.omega + h * r.omega });
function rk4(before: State, time: number, h: number): { after: State; stages: Array<{ time: number; snapshot: Snapshot }> } {
  const k1 = rate(before, time), s2 = shifted(before, k1, h / 2), k2 = rate(s2, time + h / 2);
  const s3 = shifted(before, k2, h / 2), k3 = rate(s3, time + h / 2), s4 = shifted(before, k3, h), k4 = rate(s4, time + h);
  const after = { theta: before.theta + h * (k1.theta + 2 * k2.theta + 2 * k3.theta + k4.theta) / 6,
    omega: before.omega + h * (k1.omega + 2 * k2.omega + 2 * k3.omega + k4.omega) / 6 };
  return { after, stages: [{ time, snapshot: snapshot(before, time) }, { time: time + h / 2, snapshot: snapshot(s2, time + h / 2) },
    { time: time + h / 2, snapshot: snapshot(s3, time + h / 2) }, { time: time + h, snapshot: snapshot(s4, time + h) },
    { time: time + h, snapshot: snapshot(after, time + h) }] };
}

// Analytic sign certificate on the exact conserved-energy manifold. With
// R²=rx²+rz², D=I+m*rx² and E=.5*D*omega²-m*g*rz:
// g+rz*omega² = Q(rz)/D, Q=m*g*rz²+2*E*rz+g*(I+m*R²).
// A positive global minimum of Q certifies positive N without endpoint sampling.
const radiusSquared = input.localPoint.x ** 2 + input.localPoint.z ** 2;
const energyWithoutHorizontalMotion = initial.energy - .5 * m * input.comVelocity.x ** 2;
const qMinimum = g * (I + m * radiusSquared) - energyWithoutHorizontalMotion ** 2 / (m * g);
const exactNormalLowerBound = m * I * qMinimum / (I + m * radiusSquared) ** 2;
const normalSignCertificate = { radiusSquared, conservedEnergy: energyWithoutHorizontalMotion,
  quadraticMinimum: qMinimum, exactNormalLowerBound, strictlyPositive: qMinimum > 0,
  scope: 'Exact continuous constrained-energy orbit only; does not certify a different numerical integrator or body collision geometry.' };

function run(h: number) {
  let state: State = { theta: input.theta, omega: input.omega }, time = 0, steps = 0;
  let normalImpulse = 0, spinTorqueImpulse = 0, worldTorqueImpulse = 0, groundWork = 0;
  let minNormal = initial.normal, maxNormal = initial.normal, maxNormalVelocity = 0, maxPlaneGap = 0, maxEnergyResidual = 0;
  let negativeNormal: null | { time: number; state: Snapshot; classification: string } = null;
  while (time < input.horizon) {
    const dt = Math.min(h, input.horizon - time), full = rk4(state, time, dt), half = rk4(state, time, dt / 2);
    // Separate Simpson force/moment quadrature uses an independently integrated
    // half-step state, not the RK4 angular update's identical stage weights.
    const samples = [snapshot(state, time), snapshot(half.after, time + dt / 2), snapshot(full.after, time + dt)];
    const all = [...full.stages, ...half.stages];
    const invalid = all.find(s => s.snapshot.normal < 0);
    if (invalid) {
      negativeNormal = { ...invalid, state: invalid.snapshot,
        classification: normalSignCertificate.strictlyPositive ? 'Numerical departure from the certified positive-normal orbit' : 'Release encountered; supported reference terminated' };
      break; // Never hold with a negative normal or silently advance through it.
    }
    const weight = [1, 4, 1];
    samples.forEach((s, i) => {
      const w = dt * weight[i] / 6;
      normalImpulse += w * s.normal; spinTorqueImpulse += w * (-s.rx * s.normal);
      worldTorqueImpulse += w * (m * g * s.comPosition.x - s.materialPointPosition.x * s.normal);
      groundWork += w * s.normal * s.materialPointVelocity.z;
    });
    all.forEach(({ snapshot: s }) => {
      minNormal = Math.min(minNormal, s.normal); maxNormal = Math.max(maxNormal, s.normal);
      maxNormalVelocity = Math.max(maxNormalVelocity, Math.abs(s.materialPointVelocity.z));
      maxPlaneGap = Math.max(maxPlaneGap, Math.abs(s.materialPointPosition.z - input.planeHeight));
    });
    state = full.after; time += dt; steps++;
    const s = snapshot(state, time); maxEnergyResidual = Math.max(maxEnergyResidual, Math.abs(s.energy - initial.energy));
    if (input.horizon - time <= 4 * Number.EPSILON * input.horizon) time = input.horizon;
  }
  const endpoint = snapshot(state, time);
  const linearResidual = { x: endpoint.linearMomentum.x - initial.linearMomentum.x, y: 0,
    z: endpoint.linearMomentum.z - initial.linearMomentum.z - normalImpulse + m * g * time };
  return { h, completed: negativeNormal === null && time === input.horizon, advancedTime: time, steps, negativeNormal, endpoint,
    quadrature: { method: 'Per-interval Simpson with separately integrated RK4 half-step state', normalImpulse,
      gravityImpulse: { x: 0, y: 0, z: -m * g * time }, spinTorqueImpulse, worldTorqueImpulse, groundWork },
    budgets: { energyChange: endpoint.energy - initial.energy, energyWorkResidual: endpoint.energy - initial.energy - groundWork,
      maximumEndpointEnergyDrift: maxEnergyResidual, linearMomentumResidual: linearResidual,
      spinAngularMomentumResidual: I * (endpoint.omega - initial.omega) - spinTorqueImpulse,
      worldAngularMomentumResidual: endpoint.angularMomentumAboutWorldOrigin.y - initial.angularMomentumAboutWorldOrigin.y - worldTorqueImpulse },
    minNormal, maxNormal, maxActualMaterialNormalVelocity: maxNormalVelocity, maxActualMaterialPlaneGap: maxPlaneGap };
}
const rows = [.04, .02, .01, .005, .0025, .00125, .000625, .0003125, .00015625].map(run);
const reference = rows.at(-1)!;
const endpointDifference = (row: typeof reference) => Math.max(Math.abs(row.endpoint.theta - reference.endpoint.theta), Math.abs(row.endpoint.omega - reference.endpoint.omega),
  Math.abs(row.endpoint.comPosition.z - reference.endpoint.comPosition.z), Math.abs(row.endpoint.comVelocity.z - reference.endpoint.comVelocity.z));
const convergence = rows.slice(0, -1).map((row, i) => ({ h: row.h, endpointDifferenceVersusFinest: endpointDifference(row),
  energyWorkResidual: row.budgets.energyWorkResidual, normalImpulseMomentumResidual: row.budgets.linearMomentumResidual.z,
  angularQuadratureResidual: row.budgets.worldAngularMomentumResidual,
  observedOrderVersusFinest: i < rows.length - 2 && endpointDifference(rows[i + 1]) > 0
    ? Math.log2(endpointDifference(row) / endpointDifference(rows[i + 1])) : null }));
const checks = { allCompleted: rows.every(r => r.completed), allRecordedNormalsNonnegative: rows.every(r => r.minNormal >= 0),
  materialNormalVelocityExactlyZero: rows.every(r => r.maxActualMaterialNormalVelocity === 0),
  materialPointRemainsOnPlane: rows.every(r => r.maxActualMaterialPlaneGap === 0),
  positiveExactNormalCertificate: normalSignCertificate.strictlyPositive,
  finestIndependentBudgetResidualBelow1eMinus8: Math.max(Math.abs(reference.budgets.energyWorkResidual), Math.abs(reference.budgets.linearMomentumResidual.z),
    Math.abs(reference.budgets.worldAngularMomentumResidual)) < 1e-8,
  finestPairEndpointDifferenceBelow1eMinus8: endpointDifference(rows.at(-2)!) < 1e-8 };
const sourceSha256End = sourceVersion(), scriptSha256End = scriptHash();
if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End) throw new Error('Source or reference script changed during execution; output withheld');
const payload = { sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End, node: process.version, input, initial,
  normalSignCertificate, rows, convergence, checks,
  scope: 'Independent continuous one-point frictionless planar support reference on its analytic constraint manifold. No production pose projection, engine candidate ledger, gait calibration, finite sole, strength capacity, body collision or football readiness claim.' };
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256Start, scriptSha256Start, checks, finestEndpoint: reference.endpoint, finestBudgets: reference.budgets, convergence }, null, 2));
if (Object.values(checks).some(ok => !ok)) process.exitCode = 1;
