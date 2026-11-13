/** Height/corrective-coupling factorial on saved native decision tapes.
 * Identical incoming bodies, requested movement and capacity in all arms.
 * Only explicit counterfactual coefficients change; no World code edits,
 * imposed physical slips, falls, breaks or extra decisions.
 * LEG_BRACE=1 node --import tsx scripts/diag/physics/wrap-force-point.ts [OUTPUT]
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { clamp, type Vec2 } from '../../../src/core/vec.js';
import type { Body } from '../../../src/physics/kinematics.js';
import { World, type GraspJoint, type Intent } from '../../../src/physics/world.js';
import { sourceVersion } from '../../source-version.js';

const out = process.argv[2] ?? 'out/wrap-force-point/factorial.json';
const source = sourceVersion(), inputs: Record<string, string> = {}, cases = [];
const candidate = process.argv.includes('--candidate');
assert(process.env.LEG_BRACE === '1');
interface LoadChannel {
  impulse: Vec2; trip: Vec2; thigh: Vec2; maxBelowKneeShare: number; minHeightRatio: number;
}
interface ReplayFrame {
  t: number; after: number; positions: Vec2[]; error: number; channel: LoadChannel;
  fall: boolean; state: string; xi: Vec2; legs: number; coupling: number;
  broken: boolean; slipping: boolean; workResidual: number;
}
type Mode = 'none' | 'height' | 'coupling' | 'both';
interface Run { mode: Mode; steps: number; maxPositionVsNative: number; rows: ReplayFrame[] }
const read = (path: string) => {
  const raw = readFileSync(path); inputs[path] = createHash('sha256').update(raw).digest('hex');
  return JSON.parse(raw.toString());
};
const specs = [
  ['out/slow-rear/native-rear.json', 180, 61, 'slow-rear-loss'],
  ['out/slow-rear/early-rear.json', 180, 61, 'successful-shallow'],
  ['out/reach-transition/fresh-final.json', 135, 71, 'repaired-rear'],
  ['out/reach-transition/small-final.json', 90, 61, 'diving-control'],
] as const;
for (const [path, angle, roster, label] of specs) {
  const panel = read(path), control = read(panel.controlPath);
  if (!candidate) assert(panel.source === source);
  for (const row of panel.rows.filter((r: any) => r.o === roster && r.result.angle === angle)) {
    const controlRow = control.rows.find((r: any) => r.o === row.o && r.d === row.d
      && ['angle', 'speed', 'cut', 'side', 'seed'].every(k => r.result[k] === row.result[k]));
    assert(controlRow && controlRow.initial === row.initial && controlRow.profiles === row.profiles);
    const targetDepth: number = controlRow.frames.find((f: any) => f.acquired.length).acquired[0].legs;
    const frames = row.frames.slice(row.frames.findIndex((f: any) => f.before.joint));
    const first = frames[0]; assert(first);
    const tight = frames.find((f: any) => f.before.d.support.state === 'up' && f.before.c.support.state === 'up'
      && Math.hypot(f.before.c.pos.x - f.before.d.pos.x, f.before.c.pos.y - f.before.d.pos.y)
        <= f.before.c.profile.radius + f.before.d.profile.radius + .15);
    const input = [row.o, row.d, row.result.angle, row.result.speed, row.result.cut, row.result.side, row.result.seed];
    const runs: Run[] = [];
    for (const mode of ['none', 'height', 'coupling', 'both'] as const) for (const steps of [12, 24, 48, 96]) {
      const bodies: Body[] = structuredClone([first.before.d, first.before.c]);
      const w = new World(bodies, { substeps: steps });
      const j: GraspJoint = { ...structuredClone(first.before.joint), a: bodies[0], b: bodies[1] };
      w.joints.push(j);
      let channel: LoadChannel | undefined, changed = false;
      const vec = () => ({ x: 0, y: 0 });
      const addLoad = Reflect.get(w, 'addLoad');
      Reflect.set(w, 'addLoad', function (...args: any[]) {
        const [i, held, nx, ny, ln, lt, height, legHold] = args;
        const trip = Reflect.get(w, 'tripX')[1], thigh = Reflect.get(w, 'thighX')[1];
        const ty = Reflect.get(w, 'tripY')[1], hy = Reflect.get(w, 'thighY')[1];
        const r = addLoad.apply(w, args);
        if (channel && i === 0 && held === 1 && legHold) {
          const z = clamp(height, 0, Math.min(bodies[0].profile.heightYd, bodies[1].profile.heightYd));
          const com = Reflect.get(w, 'comHeight')[1];
          channel.impulse.x += nx * ln - ny * lt; channel.impulse.y += ny * ln + nx * lt;
          channel.trip.x += Reflect.get(w, 'tripX')[1] - trip;
          channel.trip.y += Reflect.get(w, 'tripY')[1] - ty;
          channel.thigh.x += Reflect.get(w, 'thighX')[1] - thigh;
          channel.thigh.y += Reflect.get(w, 'thighY')[1] - hy;
          channel.maxBelowKneeShare = Math.max(channel.maxBelowKneeShare, clamp((.5 * com + .1 - z) / .1, 0, 1));
          channel.minHeightRatio = Math.min(channel.minHeightRatio, z / com);
        }
        return r;
      });
      const rows: ReplayFrame[] = [];
      for (const f of frames) {
        const g = f.before.joint; assert(g);
        w.time = f.t; j.capacity = g.capacity;
        j.recoveryCoupling = g.recoveryCoupling ?? g.legs;
        if (tight && f.t >= tight.t - 1e-8 && first.before.joint.legs > 0) {
          if (!changed && (mode === 'height' || mode === 'both')) j.legs = targetDepth;
          // The original depth probe changes height after that beat's bond
          // update. Its different coupling begins on the following decision.
          if (f.t > tight.t + 1e-8 && (mode === 'coupling' || mode === 'both')) {
            const secure = g.legs < 1 ? clamp(((g.recoveryCoupling ?? g.legs) - g.legs) / (1 - g.legs), 0, 1) : 1;
            j.recoveryCoupling = targetDepth + (1 - targetDepth) * secure;
          }
          changed = true;
        }
        channel = { impulse: vec(), trip: vec(), thigh: vec(), maxBelowKneeShare: 0, minHeightRatio: 1 };
        const r = w.step(structuredClone([f.requests[1], f.requests[0]]) as Intent[], f.dt);
        assert(Math.abs(r.work.residual) < 1e-8 && r.passiveGraspWork <= 1e-8);
        for (let i = 0; i < 2; i++) {
          assert(r.armImpulse[i] <= r.armImpulseLimit[i] + 1e-8);
          assert(r.armWork[i] <= r.armWorkLimit[i] + 1e-8);
          assert(r.supportMotorWork[i] <= r.supportMotorWorkLimit[i] + 1e-8);
        }
        const positions = bodies.map(b => ({ ...b.pos }));
        const error = Math.max(...positions.map((p, i) => {
          const expected = i === 0 ? f.end.d.pos : f.end.c.pos;
          return Math.hypot(p.x - expected.x, p.y - expected.y);
        }));
        rows.push({ t: f.t, after: w.time, positions, error, channel,
          fall: r.falls.includes(1), state: bodies[1].support!.state, xi: { ...bodies[1].support!.xi },
          legs: j.legs, coupling: j.recoveryCoupling ?? j.legs, broken: j.broken ?? false,
          slipping: j.slipping ?? false, workResidual: r.work.residual });
      }
      const maxPositionVsNative = Math.max(...rows.map(r => r.error));
      if (mode === 'none' && steps === 12 && !candidate) assert(maxPositionVsNative < 1e-7);
      runs.push({ mode, steps, maxPositionVsNative, rows });
    }
    cases.push({ input, label, nativeFinish: row.result.finish, observerNeutral: row.observerNeutral,
      incomingSha256: createHash('sha256').update(JSON.stringify([first.before.d, first.before.c])).digest('hex'),
      initialDepth: first.before.joint.legs, targetDepth, interventionAt: tight?.t ?? null,
      decisionsSha256: createHash('sha256').update(JSON.stringify(frames.map((f: any) =>
        ({ t: f.t, dt: f.dt, requests: f.requests, capacity: f.before.joint.capacity, coupling: f.before.joint.recoveryCoupling })))).digest('hex'),
      runs: runs.map(r => ({ mode: r.mode, steps: r.steps, maxPositionVsNative: r.maxPositionVsNative,
        maxPositionVs96: Math.max(...r.rows.flatMap((row, k) => row.positions.map((p, i) => {
          const fine = runs.find(x => x.mode === r.mode && x.steps === 96)!.rows[k].positions[i];
          return Math.hypot(p.x - fine.x, p.y - fine.y);
        }))),
        firstCarrierFall: r.rows.find(x => x.fall)?.after ?? null, endState: r.rows.at(-1)!.state,
        firstTripMoment: r.rows.find(x => Math.hypot(x.channel.trip.x, x.channel.trip.y) > 1e-10)?.t ?? null,
        maxTripSource: Math.max(...r.rows.map(x => Math.hypot(x.channel.trip.x, x.channel.trip.y))),
        maxBelowKneeShare: Math.max(...r.rows.map(x => x.channel.maxBelowKneeShare)),
        minHeightRatio: Math.min(...r.rows.map(x => x.channel.minHeightRatio)),
        slipTicks: r.rows.filter(x => x.slipping).length,
        intervals: r.rows.filter(x => tight && x.t >= tight.t - 1e-8 && x.t <= tight.t + .9 + 1e-8) })) });
  }
}
assert(sourceVersion() === source);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ protocol: 'wrap-force-point-factorial-v1', source, candidate,
  gaitStep: process.env.GAIT_STEP ?? '0', inputs,
  collectorSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'), cases,
  limits: ['Same frozen requests/capacities/secure-wrap estimates in all arms; no closed-loop re-planning.',
    'Height arm substitutes positive lower-body share while explicitly retaining native corrective coupling; natural slide remains physical.',
    'All added load-channel observations read actual executed buffers; no new force, sense or random draw.',
    'Counterfactual depth is not an earned re-grab. 96 steps is not ground truth.'] }));
console.log(out, JSON.stringify(cases.map(c => ({ label: c.label, input: c.input,
  runs: c.runs.filter(r => r.steps === 12).map(r => ({ mode: r.mode, fall: r.firstCarrierFall,
    knee: r.maxBelowKneeShare, trip: r.maxTripSource })) }))));
