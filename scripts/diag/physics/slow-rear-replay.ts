/** Minimal two-body handoff for physics review. No new player decisions or
 * prescribed physical slip/fall. The depth tape's one unearned substitution
 * is explicit. LEG_BRACE=1 node --import tsx scripts/diag/physics/slow-rear-replay.ts
 * [FIXTURE] [OUTPUT] [--candidate: compare a changed engine, no native-match claim]
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Body } from '../../../src/physics/kinematics.js';
import { World, type GraspJoint, type Intent } from '../../../src/physics/world.js';
import { sourceVersion } from '../../source-version.js';

const path = process.argv[2] ?? 'data/reviews/current/slow-rear-witness.json';
const out = process.argv[3] ?? 'out/slow-rear/witness-replay.json';
const candidate = process.argv.includes('--candidate');
const raw = readFileSync(path), fixture = JSON.parse(raw.toString());
const source = sourceVersion();
assert(fixture.protocol === 'slow-rear-world-witness-v1');
assert((process.env.LEG_BRACE ?? '0') === fixture.flags.LEG_BRACE);
if (!candidate) assert(source === fixture.source, 'Use --candidate explicitly for a changed engine.');
const cases = [];
for (const tape of fixture.tapes) {
  const runs = [];
  for (const steps of [12, 24, 48, 96]) {
    const bodies: Body[] = structuredClone(fixture.initial), w = new World(bodies, { substeps: steps });
    const j: GraspJoint = { ...structuredClone(fixture.joint), a: bodies[0], b: bodies[1] };
    w.joints.push(j);
    const rows = [];
    for (const f of tape.decisions) {
      w.time = f.t;
      j.capacity = f.capacity;
      if (f.coupling !== undefined) j.recoveryCoupling = f.coupling;
      for (const p of tape.interventions) if (Math.abs(p.t - f.t) < 1e-8) {
        assert(p.kind === 'recorded control depth at first tight wrap'); j.legs = p.after;
      }
      const r = w.step(structuredClone(f.requests) as Intent[], f.dt);
      assert(Math.abs(r.work.residual) < 1e-8 && r.passiveGraspWork <= 1e-8);
      for (let i = 0; i < bodies.length; i++) {
        assert(r.armImpulse[i] <= r.armImpulseLimit[i] + 1e-8);
        assert(r.armWork[i] <= r.armWorkLimit[i] + 1e-8);
        assert(r.supportMotorWork[i] <= r.supportMotorWorkLimit[i] + 1e-8);
      }
      const positionError = Math.max(...bodies.map((b, i) => Math.hypot(
        b.pos.x - f.expectedPositions[i].x, b.pos.y - f.expectedPositions[i].y)));
      rows.push({ after: w.time, positions: bodies.map(b => ({ ...b.pos })), positionError,
        carrierState: bodies[1].support!.state, falls: r.falls,
        carrierXi: { ...bodies[1].support!.xi }, bodyImpulse: r.contacts.reduce((s, c) => s + c.impulse, 0),
        maxWorkResidual: Math.abs(r.work.residual) });
    }
    const maxPositionVsNative = Math.max(...rows.map(r => r.positionError));
    if (steps === 12 && !candidate) assert(maxPositionVsNative < 1e-7);
    runs.push({ steps, maxPositionVsNative, rows });
  }
  const fine = runs.at(-1)!;
  cases.push({ name: tape.name, interventions: tape.interventions,
    runs: runs.map(r => ({ steps: r.steps, maxPositionVsNative: r.maxPositionVsNative,
      maxPositionVs96: Math.max(...r.rows.flatMap((row, k) => row.positions.map((p, i) => Math.hypot(
        p.x - fine.rows[k].positions[i].x, p.y - fine.rows[k].positions[i].y)))),
      firstCarrierFall: r.rows.find(row => row.falls.includes(1))?.after ?? null,
      carrierEndState: r.rows.at(-1)!.carrierState,
      maxWorkResidual: Math.max(...r.rows.map(row => row.maxWorkResidual)) })) });
}
assert(sourceVersion() === source);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ source, fixtureSource: fixture.source, candidate, path,
  fixtureSha256: createHash('sha256').update(raw).digest('hex'),
  collectorSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'), cases }, null, 2));
console.log(out, JSON.stringify(cases));
