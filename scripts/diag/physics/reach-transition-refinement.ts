/** Replay one native decision tape at finer World resolutions. No new
 * controller decisions and no imposed native compression/slips/falls. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Body } from '../../../src/physics/kinematics.js';
import { World, type GraspJoint } from '../../../src/physics/world.js';
import { sourceVersion } from '../../source-version.js';

const out = process.argv[2] ?? 'out/reach-transition/selected-refinement.json';
const source = sourceVersion(), cases = [], inputs = [];
for (const [path, angle, roster] of [['out/reach-transition/fresh-final.json', 135, 71],
  ['out/reach-transition/small-final.json', 90, 61], ['out/reach-transition/rear-loss-final.json', 180, 61]] as const) {
  const raw = readFileSync(path), panel = JSON.parse(raw.toString());
  assert(panel.source === source);
  inputs.push({ path, sha256: createHash('sha256').update(raw).digest('hex') });
  for (const row of panel.rows.filter((r: any) => r.o === roster && r.result.angle === angle)) {
    const frames = row.frames.slice(row.frames.findIndex((f: any) => f.before.joint));
    assert(frames.length);
    const initial = [frames[0].before.d, frames[0].before.c];
    const runs = [];
    for (const steps of [12, 24, 48, 96]) {
      const bodies: Body[] = structuredClone(initial), w = new World(bodies, { substeps: steps });
      w.time = frames[0].t;
      let j: GraspJoint | null = null, present = false, firstFall: number | null = null;
      const positions: any[] = [];
      for (const f of frames) {
        const g = f.before.joint;
        if (g && !present) { j = { ...structuredClone(g), a: bodies[0], b: bodies[1] }; w.joints.push(j!); }
        if (!g && present) { w.joints = []; j = null; }
        present = !!g;
        if (g && j) { j.capacity = g.capacity; if (g.recoveryCoupling !== undefined) j.recoveryCoupling = g.recoveryCoupling; }
        w.time = f.t;
        const r = w.step(structuredClone([f.requests[1], f.requests[0]]), f.dt);
        assert(Math.abs(r.work.residual) < 1e-8 && r.passiveGraspWork <= 1e-8);
        for (let i = 0; i < 2; i++) {
          assert(r.armImpulse[i] <= r.armImpulseLimit[i] + 1e-8);
          assert(r.armWork[i] <= r.armWorkLimit[i] + 1e-8);
          assert(r.supportMotorWork[i] <= r.supportMotorWorkLimit[i] + 1e-8);
        }
        if (firstFall === null && r.falls.includes(1)) firstFall = w.time;
        positions.push(bodies.map(b => ({ ...b.pos })));
      }
      const maxPositionVsNative = Math.max(...positions.flatMap((p, t) => p.map((x: any, i: number) => {
        const actual = i === 0 ? frames[t].end.d.pos : frames[t].end.c.pos;
        return Math.hypot(x.x - actual.x, x.y - actual.y);
      })));
      if (steps === 12) assert(maxPositionVsNative < 1e-7, `Native boundary replay mismatch ${maxPositionVsNative}`);
      runs.push({ steps, firstFall, carrierEnd: bodies[1].support!.state, positions, maxPositionVsNative });
    }
    const fine = runs.at(-1)!;
    cases.push({ input: [row.o, row.d, row.result.angle, row.result.speed, row.result.cut, row.result.side, row.result.seed],
      nativeFinish: row.result.finish, observerNeutral: row.observerNeutral,
      initialSha256: createHash('sha256').update(JSON.stringify(initial)).digest('hex'),
      decisionSha256: createHash('sha256').update(JSON.stringify(frames.map((f: any) => ({ requests: f.requests,
        capacity: f.before.joint?.capacity, coupling: f.before.joint?.recoveryCoupling })))).digest('hex'),
      runs: runs.map(r => ({ steps: r.steps, firstFall: r.firstFall, carrierEnd: r.carrierEnd, maxPositionVsNative: r.maxPositionVsNative,
        maxPositionVs96: Math.max(...r.positions.flatMap((p: any, t: number) => p.map((x: any, i: number) =>
          Math.hypot(x.x - fine.positions[t][i].x, x.y - fine.positions[t][i].y)))) })) });
  }
}
assert(sourceVersion() === source);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ source, inputs, cases }, null, 2));
console.log(out, JSON.stringify(cases));
