/** Small handed-off physical reproduction: frozen native requests, no new
 * coaching decisions or imposed recorded compression/slide/fall outcomes.
 * LEG_BRACE=1 TACKLE_ROLL=1 WRAP_BIND=1 REACH_CONTACT=1 node --import tsx
 * scripts/diag/physics/reach-contact-replay.ts [output.json]
 */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { World, type GraspJoint } from '../../../src/physics/world.js';
import { sourceVersion } from '../../source-version.js';

const tape = JSON.parse(gunzipSync(readFileSync('data/reviews/reach-contact/closure-tapes.json.gz')).toString());
for (const [k, v] of Object.entries(tape.flags)) assert((process.env[k] ?? '0') === v, `Use recorded ${k}=${v}`);
const source = sourceVersion(), cases = [];
for (const c of tape.cases) {
  const frames = c.captured.frames.slice(c.captured.frames.findIndex((f: any) => f.grips.length));
  const runs = [];
  for (const steps of [12, 24, 48, 96]) {
    const bodies = structuredClone(frames[0].bodies);
    const w = new World(bodies, { handContact: 'center', substeps: steps });
    w.time = frames[0].t;
    let grip: GraspJoint | null = null, present = false, fall: number | null = null;
    let maxResidual = 0;
    for (const f of frames) {
      const g = f.grips[0];
      if (g && !present) {
        const { a, b, ...params } = g;
        grip = { ...structuredClone(params), a: bodies[a], b: bodies[b] };
        w.joints.push(grip!);
      }
      if (!g && present) { w.joints = []; grip = null; }
      present = !!g;
      if (g && grip) {
        grip.capacity = g.capacity;
        if (g.recoveryCoupling !== undefined) grip.recoveryCoupling = g.recoveryCoupling;
      }
      for (const p of f.pending) if (p.a >= 0 && p.b >= 0)
        w.strike(bodies[p.a], bodies[p.b], { x: p.x, y: p.y }, p.height);
      const r = w.step(structuredClone(f.intents), f.dt);
      maxResidual = Math.max(maxResidual, Math.abs(r.work.residual));
      assert(maxResidual < 1e-8 && r.passiveGraspWork <= 1e-8);
      for (let i = 0; i < 2; i++) {
        assert(r.armImpulse[i] <= r.armImpulseLimit[i] + 1e-8);
        assert(r.armWork[i] <= r.armWorkLimit[i] + 1e-8);
        assert(r.supportMotorWork[i] <= r.supportMotorWorkLimit[i] + 1e-8);
      }
      if (fall === null && r.falls.includes(1)) fall = w.time;
    }
    runs.push({ steps, firstCarrierFall: fall, carrierEndState: bodies[1].support.state,
      position: bodies[1].pos, maxWorkResidual: maxResidual, finalSpan: grip?.brace });
  }
  cases.push({ id: c.id, nativeFinish: c.captured.result.finish, runs });
}
assert(sourceVersion() === source);
const out = process.argv[2] ?? 'out/reach-contact/closure-replay.json';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ recordedSource: tape.source, source, cases }, null, 2));
console.log(out, JSON.stringify(cases));
