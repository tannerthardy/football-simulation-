/** Same-prefix loaded-support interval: all forks execute the native prefix
 * at 12 steps, preserving World-owned attachment history. Only resolution
 * changes at the chosen boundary. No restored foot state or imposed fall.
 * LEG_BRACE=1 GAIT_STEP=0.3 node --import tsx scripts/diag/physics/loaded-wrap-interval.ts
 * [TAPE] [OUTPUT] -- run in the isolated gait-law checkout.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Body } from '../../../src/physics/kinematics.js';
import { World, type GraspJoint, type Intent } from '../../../src/physics/world.js';
import { sourceVersion } from '../../source-version.js';
import { withRecoveryExperiment } from '../tackle/grip-refinement.js';

const path = process.argv[2] ?? 'out/wrap-force-point/gait-gains.json';
const out = process.argv[3] ?? 'out/wrap-force-point/loaded-interval.json';
const raw = readFileSync(path), panel = JSON.parse(raw.toString()), source = sourceVersion();
const continued = process.argv.includes('--continued-recovery');
const candidate = process.argv.includes('--candidate');
assert(process.env.LEG_BRACE === '1' && process.env.GAIT_STEP === '0.3');
if (!candidate) assert(panel.source === source);
const row = panel.rows?.find((r: any) => r.result.angle === 180 && r.result.speed === 8 && r.result.side === 1);
assert(row || panel.protocol === 'loaded-wrap-prefix-witness-v1');
const native = row?.frames.slice(row.frames.findIndex((f: any) => f.before.joint));
const initial = native ? { bodies: [native[0].before.d, native[0].before.c], joint: native[0].before.joint } : panel.initial;
const frames = native ? native.map((f: any) => ({ t: f.t, dt: f.dt,
  requests: [f.requests[1], f.requests[0]], capacity: f.before.joint?.capacity,
  coupling: f.before.joint?.recoveryCoupling, expectedPositions: [f.end.d.pos, f.end.c.pos] })) : panel.decisions;
const expectedXi = native ? native.find((f: any) => Math.abs(f.t - 3.8) < 1e-8).before.c.support.xi.x : panel.boundaryXi;
const start = 3.8, lastInput = 4.05, runs = [];
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
let common: string | undefined;
for (const steps of [12, 24, 48, 96]) {
  const bodies: Body[] = structuredClone(initial.bodies);
  const w = new World(bodies, { substeps: 12 });
  const j: GraspJoint = { ...structuredClone(initial.joint), a: bodies[0], b: bodies[1] };
  w.joints.push(j);
  let incoming: any;
  const results = [];
  for (const f of frames) {
    if (f.t > lastInput + 1e-8) break;
    assert(f.capacity !== undefined);
    w.time = f.t; j.capacity = f.capacity; j.recoveryCoupling = f.coupling;
    if (Math.abs(f.t - start) < 1e-8) {
      const { a, b, ...joint } = j;
      incoming = structuredClone({ bodies, joint, attachment: Reflect.get(w, 'attachments').get(j) });
      const id = hash(incoming); common ??= id; assert(id === common);
      // Native parity includes the state whose next response is investigated.
      if (!continued && !candidate) assert(Math.abs(bodies[1].support!.xi.x - expectedXi) < 1e-7);
      w.substeps = steps;
    }
    const execute = () => w.step(structuredClone(f.requests) as Intent[], f.dt);
    const r = continued ? withRecoveryExperiment(w, 'continued-recovery', execute).result : execute();
    assert(Math.abs(r.work.residual) < 1e-8 && r.passiveGraspWork <= 1e-8);
    for (let i = 0; i < 2; i++) {
      assert(r.armImpulse[i] <= r.armImpulseLimit[i] + 1e-8);
      assert(r.armWork[i] <= r.armWorkLimit[i] + 1e-8);
      assert(r.supportMotorWork[i] <= r.supportMotorWorkLimit[i] + 1e-8);
    }
    const nativeError = Math.max(...bodies.map((b, i) => {
      const p = f.expectedPositions[i];
      return Math.hypot(b.pos.x - p.x, b.pos.y - p.y);
    }));
    if (!continued && !candidate && (f.t < start - 1e-8 || steps === 12)) assert(nativeError < 1e-7);
    if (f.t >= start - 1e-8) results.push({ t: f.t, after: w.time, carrier: structuredClone(bodies[1]),
      defender: structuredClone(bodies[0]), grip: { legs: j.legs, coupling: j.recoveryCoupling, force: j.force },
      nativeError, workResidual: r.work.residual });
  }
  assert(incoming && results.length);
  runs.push({ steps, incomingSha256: common, incoming, results });
}
assert(sourceVersion() === source);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ protocol: 'same-prefix-loaded-wrap-interval-v1', source, fixtureSource: panel.source, path, continued, candidate,
  input: row ? [row.o, row.d, 180, 8, false, 1, row.result.seed] : panel.input,
  start, lastInput, end: runs[0].results.at(-1)!.after,
  inputSha256: createHash('sha256').update(raw).digest('hex'),
  collectorSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'), runs }));
console.log(out, runs.map(r => [r.steps, r.results[0].carrier.support!.xi, r.results.at(-1)!.carrier.support!.xi]));
