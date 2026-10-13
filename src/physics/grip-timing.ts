/** Experimental local integration control for a live passive grip. No new
 * force, friction, grip, traction, gait or recovery law. Rejected scratch
 * solves spend no physical time/work; only the selected intervals run live.
 * The force can stop or relax before the outer interval ends. Resolving its
 * evolution carries impulse AND temporal moment through every existing path.
 */
type Private = any;
type Packet = { fields: Private; args: any[]; attachments: any[] };
export interface GripTimingReport { trials: number; intervals: number; limited: number; maxAcceptedError: number; }
const MAX_PARTITIONS = 16384;
// Engineering local error tolerances, in yd, yd/s, rad, rad/s and kg*yd²/s².
// These bound numerical comparison, never body capacities or football outcomes.
const POSITION = 5e-7, VELOCITY = 2.5e-5, ANGLE = 2.5e-6, SPIN = 2.5e-4, WORK = 1e-2;

function snapshot(w: Private, args: any[]): Packet {
  const fields = { ...w }; delete fields.attachments;
  // Per-instance read-only test observers must run only on accepted physical
  // intervals. Trials use the unchanged prototype solver and cloned state.
  for (const key of Object.keys(fields)) if (typeof fields[key] === 'function') delete fields[key];
  return structuredClone({ fields, args,
    attachments: w.joints.map((j: Private) => [j, w.attachments.get(j)]).filter((p: any) => p[1]) });
}
function restore(packet: Packet, prototype: object) {
  const p = structuredClone(packet), w = Object.assign(Object.create(prototype), p.fields);
  w.attachments = new WeakMap(p.attachments);
  return { w, args: p.args };
}
function advance(w: Private, args: any[], h: number, remaining: number, execute: (w: Private, args: any[]) => void) {
  const a = [...args]; a[3] = h; a[4] = remaining;
  execute(w, a);
}
function difference(a: Private, b: Private, ids: number[]) {
  let error = 0;
  for (const i of ids) {
    const x = a.bodies[i], y = b.bodies[i];
    error = Math.max(error, Math.hypot(x.pos.x - y.pos.x, x.pos.y - y.pos.y) / POSITION,
      Math.hypot(x.vel.x - y.vel.x, x.vel.y - y.vel.y) / VELOCITY,
      Math.abs(x.facing - y.facing) / ANGLE, Math.abs((x.spin ?? 0) - (y.spin ?? 0)) / SPIN);
    if (x.support.state !== y.support.state) error = Math.max(error, 2);
    error = Math.max(error, Math.abs((a.report.supportMotorWork?.[i] ?? 0)
      - (b.report.supportMotorWork?.[i] ?? 0)) / WORK);
  }
  for (let k = 0; k < a.joints.length; k++) {
    const x = a.joints[k], y = b.joints[k];
    if (x.kind !== 'grasp') continue;
    if (!!x.broken !== !!y.broken || !!x.slipping !== !!y.slipping) error = Math.max(error, 2);
    const p = a.graspPoint(x), q = b.graspPoint(y);
    error = Math.max(error, Math.hypot(p.x - q.x, p.y - q.y) / POSITION);
  }
  for (const key of ['hands', 'grasps', 'strikes', 'contacts'])
    error = Math.max(error, Math.abs(a.report.work[key] - b.report.work[key]) / WORK);
  error = Math.max(error, Math.abs((a.report.passiveGraspWork ?? 0) - (b.report.passiveGraspWork ?? 0)) / WORK);
  return error;
}

/** Choose partitions with the same issued plan and acquired attachment graph.
 * Multiple contacts advance together, preserving the common force frame and
 * shared normal/tangent, arm and support budgets. No standalone yaw patch.
 */
export function resolveGripInterval(w: Private, args: any[], execute: (w: Private, args: any[]) => void): GripTimingReport {
  const report: GripTimingReport = { trials: 0, intervals: 0, limited: 0, maxAcceptedError: 0 };
  const prototype = Object.getPrototypeOf(w), ids: number[] = args[0], duration = args[3];
  let bound = 0;
  for (const j of w.joints) {
    if (j.kind !== 'grasp' || j.broken) continue;
    const impulse = w.gripCapacity(j) * duration;
    const arm = Math.hypot(j.b.pos.x - j.a.pos.x, j.b.pos.y - j.a.pos.y) + j.b.profile.radius;
    for (const b of [j.a, j.b]) {
      const i = w.indexOf(b);
      bound += Math.max(impulse / w.mass[i] / VELOCITY,
        impulse * arm / w.inertia[i] / SPIN, impulse * arm * duration / w.inertia[i] / ANGLE);
    }
  }
  // A vanishing grip cannot justify changing the integration of unrelated
  // ground/recovery motion. This is a conservative numerical-error bound.
  if (bound < 1 / 32) {
    execute(w, args); report.intervals = 1; return report;
  }
  const initial = snapshot(w, args);
  const solve = (n: number) => {
    const trial = restore(initial, prototype), h = duration / n;
    for (let k = 0; k < n; k++) advance(trial.w, trial.args, h, args[4] - k * h, execute);
    report.trials += n;
    return trial.w;
  };
  const initialDose = initial.fields.joints.reduce((v: number, j: Private) => v + (j.kind === 'grasp' ? j.force ?? 0 : 0), 0);
  const dose = (q: Private) => q.joints.reduce((v: number, j: Private) => v + (j.kind === 'grasp' ? j.force ?? 0 : 0), 0) - initialDose;
  let coarse = solve(1), partitions = 1;
  // A whole-interval estimate includes accumulated impulse/time-moment/work
  // error. Independently acceptable local pieces cannot establish that.
  while (partitions < MAX_PARTITIONS) {
    const n = partitions * 2, fine = solve(n);
    if (Math.max(dose(coarse), dose(fine)) < 1e-10) break;
    const error = difference(coarse, fine, ids);
    partitions = n;
    if (error <= 1 || n === MAX_PARTITIONS) {
      report.maxAcceptedError = error;
      if (error > 1) report.limited++;
      break;
    }
    coarse = fine;
  }
  const h = duration / partitions;
  for (let k = 0; k < partitions; k++) advance(w, args, h, args[4] - k * h, execute);
  report.intervals = partitions;
  return report;
}
