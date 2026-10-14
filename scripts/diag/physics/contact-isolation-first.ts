/** Portable earliest changed native interval; no controllers or new plays. */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { supportParams } from '../../../src/physics/support.js';
import { World, type HandJoint } from '../../../src/physics/world.js';
import { replayKeeper, stateError, type KeeperWitness } from './keeper-contact-law.js';

const manifest = JSON.parse(readFileSync('docs/reviews/contact-law-isolation-first-contact.json', 'utf8')) as {
  rows: { id: string; witness: KeeperWitness; expectedIsolatedAfter: KeeperWitness['beforeBodies']; nativeSubsteps: number }[];
};
function slipTrace(w: KeeperWitness, mode: 'center' | 'patch', substeps: number) {
  const bodies = structuredClone(w.beforeBodies);
  const world = new World(bodies, { handContact: mode, groundMovement: 'legacy', substeps });
  world.time = w.t;
  world.joints = w.jointInputs.map(j => {
    const { a, b, actor, holder, ...rest } = structuredClone(j);
    return { ...rest, a: bodies[a], b: bodies[b], drive: 0,
      ...(actor === undefined ? {} : { actor: bodies[actor] }),
      ...(holder === undefined ? {} : { holder: bodies[holder] }) } as HandJoint;
  });
  // Observe the acquired force frame immediately before the existing solve.
  // Reading rows never advances a controller, perception or RNG.
  const rows = Reflect.get(world, 'jointRows').bind(world);
  const trace: unknown[] = [];
  Reflect.set(world, 'jointRows', (h: number) => {
    const result = rows(h);
    for (const r of result) {
      const a = bodies[r.i], b = bodies[r.j];
      const comSlip = -(b.vel.x - a.vel.x) * r.ny + (b.vel.y - a.vel.y) * r.nx;
      const yawSlip = -(r.ri ?? 0) * (a.spin ?? 0) - (r.rj ?? 0) * (b.spin ?? 0);
      trace.push({ h, nx: r.nx, ny: r.ny, ri: r.ri ?? 0, rj: r.rj ?? 0,
        comSlip, yawSlip, pointSlip: comSlip + yawSlip, steerImpulseLimit: r.steerLim,
        actor: r.actor, drive: r.drive ?? 0 });
    }
    return result;
  });
  const report = world.step(structuredClone(w.intents), w.dt);
  const expected = replayKeeper(w, mode, { groundMovement: 'legacy', substeps });
  assert.deepEqual(bodies, expected.bodies, 'Force-frame observer must be neutral');
  assert.deepEqual(report, expected.reports[0]);
  return trace;
}
const rows = manifest.rows.map(({ id, witness: w, expectedIsolatedAfter, nativeSubsteps }) => {
  const center = replayKeeper(w, 'center', { substeps: nativeSubsteps });
  const isolated = replayKeeper(w, 'patch', { groundMovement: 'legacy', substeps: nativeSubsteps });
  const refined = replayKeeper(w, 'patch', { groundMovement: 'legacy', substeps: 48 });
  const centerError = stateError(center.bodies, w.expectedAfter);
  const isolatedError = stateError(isolated.bodies, expectedIsolatedAfter);
  assert(centerError < 1e-12 && isolatedError < 1e-12, 'Reduced pair must reproduce both native intervals');
  assert.equal(isolated.reports[0].contacts.length, 0);
  assert.equal(isolated.reports[0].strikes.length, 0);
  const ledger = isolated.bodies.map((after, i) => {
    const before = w.beforeBodies[i], inertia = supportParams(before.profile).yawInertia;
    const spinImpulse = inertia * ((after.spin ?? 0) - (before.spin ?? 0));
    const handImpulse = (i === 0 ? isolated.joints[0].momentOnA! : isolated.joints[0].momentOnB!) * w.dt;
    const groundImpulse = isolated.reports[0].groundYawImpulse[i];
    const residual = spinImpulse - handImpulse - groundImpulse;
    assert(Math.abs(residual) < 1e-10, 'Actual spin must follow delivered hand plus external ground torque');
    return { slot: w.slots[i], inertia, beforeSpin: before.spin, afterSpin: after.spin,
      spinImpulse, handImpulse, groundImpulse, residual };
  });
  const firstSlip = { center: slipTrace(w, 'center', nativeSubsteps), isolated: slipTrace(w, 'patch', nativeSubsteps) };
  const motionDifferences = isolated.bodies.map((b, i) => ({ slot: w.slots[i],
    law: { position: Math.hypot(b.pos.x - center.bodies[i].pos.x, b.pos.y - center.bodies[i].pos.y),
      velocity: Math.hypot(b.vel.x - center.bodies[i].vel.x, b.vel.y - center.bodies[i].vel.y),
      spin: (b.spin ?? 0) - (center.bodies[i].spin ?? 0), facing: b.facing - center.bodies[i].facing },
    refinement: { position: Math.hypot(b.pos.x - refined.bodies[i].pos.x, b.pos.y - refined.bodies[i].pos.y),
      velocity: Math.hypot(b.vel.x - refined.bodies[i].vel.x, b.vel.y - refined.bodies[i].vel.y),
      spin: (b.spin ?? 0) - (refined.bodies[i].spin ?? 0), facing: b.facing - refined.bodies[i].facing } }));
  return { id, centerError, isolatedError, nativeSubsteps, ledger, firstSlip, motionDifferences,
    centerHands: center.joints, isolatedHands: isolated.joints, refinedHands: refined.joints,
    isolatedWork: isolated.reports[0].work, refinedWork: refined.reports[0].work };
});
const result = { protocol: 'contact-isolation-first-v1', rows,
  refinementQuestion: 'Does 12-to-48 local refinement explain the earliest law difference? These are frozen requests on a graph-closed pair, not whole-ending convergence.' };
const destination = process.argv[2] ?? 'out/contact-isolation/first.json';
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(rows.map(({ id, centerError, isolatedError, ledger, firstSlip, motionDifferences }) =>
  ({ id, centerError, isolatedError, ledger, firstSlip: { center: firstSlip.center[0], isolated: firstSlip.isolated[0] }, motionDifferences }))));
