/** Native observer check, then one recorded decision tape at multiple local
 * World resolutions. Recovery coupling is a recorded controller update, like
 * capacity. Achieved hold, slide, break and support remain physical outcomes.
 * Never installs the continued-recovery candidate or changes controller timing.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { World, type GraspJoint, type Intent } from '../../../src/physics/world.js';
import type { Body } from '../../../src/physics/kinematics.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { rep, type Cell } from '../tackle/panel.js';
import { sourceVersion } from '../../source-version.js';

const out = process.argv[2] ?? 'out/wrap-binding/refinement';
mkdirSync(out, { recursive: true });
const source = sourceVersion();
const cases = [{ angle: 45, speed: 6, mode: 'center' as const },
  { angle: 90, speed: 6, mode: 'center' as const },
  { angle: 180, speed: 6, mode: 'center' as const },
  { angle: 45, speed: 8, mode: 'patch' as const }];
const summaries = [];
const digest = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
interface Frame { t: number; dt: number; intents: Intent[]; bodies: Body[];
  grips: Array<Record<string, any>>; pending: Array<Record<string, any>> }

// The earlier phase-reconstruction observer intentionally assumes the old
// unbraced pitch source. Preserve that assertion and use a simple boundary
// observer here; do not make it silently accept this separate experimental law.
function capture(cell: Cell, mode: 'center' | 'patch', side: 1 | -1, observe = true) {
  const tick = PlaySim.prototype.tick, step = World.prototype.step;
  let sim: PlaySim | undefined;
  const frames: Frame[] = [];
  PlaySim.prototype.tick = function () { sim = this; return tick.call(this); };
  World.prototype.step = function (intents, dt) {
    if (observe && sim?.world === this) {
      const ids = [sim.defense.find(a => a.slot.startsWith('LB'))!.idx, sim.slot('RB')!.idx];
      frames.push({ t: this.time, dt, intents: structuredClone(ids.map(i => {
        const intent = intents[i]; assert(intent); return intent;
      })),
        bodies: structuredClone(ids.map(i => this.bodies[i])),
        grips: this.joints.filter(j => j.kind === 'grasp').map(j => {
          const { a, b, ...params } = j;
          return { ...structuredClone(params), a: ids.indexOf(this.indexOf(a)), b: ids.indexOf(this.indexOf(b)) };
        }), pending: Reflect.get(this, 'pending').map((p: any) => ({
          a: ids.indexOf(this.indexOf(p.a)), b: ids.indexOf(this.indexOf(p.b)), x: p.x, y: p.y, height: p.height })) });
    }
    return step.call(this, intents, dt);
  };
  try {
    const result = rep(cell, side, 3001, { handContact: mode, substeps: 12 });
    assert(sim);
    return { result, frames, endpoint: digest({ result, bodies: sim.agents.map(a => a.body),
      intents: sim.intents, minds: sim.agents.map(a => a.mind), rng: sim.rng, events: sim.events }),
      profiles: digest(sim.agents.map(a => a.profile)) };
  } finally { PlaySim.prototype.tick = tick; World.prototype.step = step; }
}
function replay(tape: Frame[], mode: 'center' | 'patch', steps: number) {
  const frames = tape.slice(tape.findIndex(f => f.grips.length));
  assert(frames.length && frames[0].bodies.every(b => !b.support?.foot));
  const bodies = structuredClone(frames[0].bodies), w = new World(bodies, { handContact: mode, substeps: steps });
  w.time = frames[0].t;
  let grip: GraspJoint | null = null, present = false;
  const rows = [];
  for (const f of frames) {
    const g = f.grips[0];
    if (g && !present) {
      const { a, b, ...params } = g;
      grip = { ...structuredClone(params), a: bodies[a], b: bodies[b] } as GraspJoint;
      w.joints.push(grip);
    }
    if (!g && present) { w.joints = []; grip = null; }
    present = !!g;
    if (g && grip) {
      grip.capacity = g.capacity;
      // Explicit recorded coefficient, not a fresh decision based on finer
      // bodies. No recorded break/slide/fall is forced onto this trajectory.
      if (g.recoveryCoupling !== undefined) grip.recoveryCoupling = g.recoveryCoupling;
    }
    for (const p of f.pending) if (p.a >= 0 && p.b >= 0)
      w.strike(bodies[p.a], bodies[p.b], { x: p.x, y: p.y }, p.height);
    const r = w.step(structuredClone(f.intents), f.dt);
    assert(Math.abs(r.work.residual) < 1e-8 && r.passiveGraspWork <= 1e-8);
    bodies.forEach((_, i) => {
      assert(r.armImpulse[i] <= r.armImpulseLimit[i] + 1e-8);
      assert(r.armWork[i] <= r.armWorkLimit[i] + 1e-8);
      assert(r.supportMotorWork[i] <= r.supportMotorWorkLimit[i] + 1e-8);
    });
    rows.push({ t: f.t, after: w.time, bodies: structuredClone(bodies),
      falls: r.falls, downs: r.downs, workResidual: r.work.residual,
      passiveWork: r.passiveGraspWork, supportMotorWork: r.supportMotorWork,
      ground: r.groundImpulse, groundYaw: r.groundYawImpulse,
      grip: grip ? { coupling: grip.recoveryCoupling, legs: grip.legs,
        height: grip.height, force: grip.force, broken: grip.broken, slipping: grip.slipping } : null });
  }
  return { steps, initial: digest(frames[0].bodies), decisions: digest(frames.map(({ bodies, ...f }) => f)), rows };
}
for (const c of cases) for (const side of [1, -1] as const) {
  const cell = { ...c, cut: false, difficulty: 'difficult' as const };
  const captured = capture(cell, c.mode, side), plain = capture(cell, c.mode, side, false);
  assert(captured.endpoint === plain.endpoint);
  const runs = [12, 24, 48, 96].map(n => replay(captured.frames, c.mode, n));
  assert(runs.every(r => r.initial === runs[0].initial && r.decisions === runs[0].decisions));
  const ref = runs.at(-1)!;
  const comparisons = runs.map(run => ({ steps: run.steps,
    maxPositionVs96: Math.max(...run.rows.flatMap((r, k) => r.bodies.map((b, i) =>
      Math.hypot(b.pos.x - ref.rows[k].bodies[i].pos.x, b.pos.y - ref.rows[k].bodies[i].pos.y)))),
    firstCarrierFall: run.rows.find(r => r.falls.includes(1))?.after ?? null,
    carrierEndState: run.rows.at(-1)!.bodies[1].support!.state,
    maxWorkResidual: Math.max(...run.rows.map(r => Math.abs(r.workResidual))),
    firstBroken: run.rows.find(r => r.grip?.broken)?.after ?? null }));
  const id = `${c.mode}-${c.angle}-${c.speed}-${side}`;
  writeFileSync(`${out}/${id}.json.gz`, gzipSync(JSON.stringify({ source, captured, runs })));
  summaries.push({ id, ...c, side, observerNeutral: true, profiles: captured.profiles,
    nativeResult: captured.result, endpoint: captured.endpoint, initial: runs[0].initial,
    decisions: runs[0].decisions, comparisons });
  console.log(id, comparisons.map(c => [c.steps, c.maxPositionVs96, c.carrierEndState]));
}
assert(sourceVersion() === source);
writeFileSync(`${out}/summary.json`, JSON.stringify({ source,
  collectorSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  flags: Object.fromEntries(['WRAP_BIND', 'LEG_BRACE', 'TACKLE_ROLL', 'REACH_CONTACT', 'TACKLE_TOUCH'].map(k => [k, process.env[k] ?? '0'])),
  cases: summaries,
  limits: ['96 steps is a numerical comparator, not ground truth.',
    'Same tape within each refinement; native tapes between arms may diverge after physics changes.',
    'Replay endings are physical states, not new referee/controller decisions. Native endings are reported separately.'] }, null, 2));
