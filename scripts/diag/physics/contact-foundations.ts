/** Freeze the first real loaded-grip interval, including the acquired material
 * attachment and the already-issued 20 Hz plan. Local partitions are physical
 * solves, never extra football decisions. Raw checkpoints/traces stay in out/.
 * Run through baseline:run; patch is an explicit World option, not promotion.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { World } from '../../../src/physics/world.js';
import { rep, type Cell } from '../tackle/panel.js';
import { sourceVersion } from '../../source-version.js';
import { passiveSlipReference } from './passive-slip-reference.js';

type Private = any; // Scoped inspection of the existing reduced-body solver.
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v, (_k, x) =>
  typeof x === 'number' && !Number.isFinite(x) ? { nonfinite: String(x) } : x)).digest('hex');
const pose = (w: Private, ids: number[]) => ids.map(i => {
  const b = w.bodies[i];
  return { pos: { ...b.pos }, vel: { ...b.vel }, spin: b.spin ?? 0, facing: b.facing,
    xi: { ...b.support.xi }, state: b.support.state };
});

function packet(w: Private, args: any[]) {
  const fields = { ...w }; delete fields.attachments;
  // Clone fields, arguments and attachment entries TOGETHER: their shared
  // body/joint/report identities are part of the physical checkpoint.
  return structuredClone({ fields, args,
    attachments: w.joints.map((j: Private) => [j, w.attachments.get(j)]).filter((p: any) => p[1]) });
}
function restore(saved: ReturnType<typeof packet>) {
  const p = structuredClone(saved);
  const w = Object.assign(Object.create(World.prototype), p.fields);
  w.attachments = new WeakMap(p.attachments);
  return { w, args: p.args };
}

export function captureFirstGrip(cell: Cell, mode: 'center' | 'patch', side: 1 | -1, seed = 3001) {
  const prototype = World.prototype as Private, original = prototype.integrateSubstep,
    originalStep = prototype.step;
  let saved: ReturnType<typeof packet> | undefined;
  let current: Private;
  prototype.step = function (...args: any[]) { current = this; return originalStep.apply(this, args); };
  prototype.integrateSubstep = function (...args: any[]) {
    if (!saved && args[7] && this.joints.some((j: Private) => j.kind === 'grasp' && !j.broken))
      saved = packet(this, args);
    return original.apply(this, args);
  };
  let observed, plain, observedEndpoint: string, plainEndpoint: string;
  const endpoint = () => hash({ bodies: current.bodies, joints: current.joints,
    pending: current.pending, time: current.time });
  try {
    observed = rep(cell, side, seed, { handContact: mode, substeps: 96 });
    observedEndpoint = endpoint();
    prototype.integrateSubstep = original;
    plain = rep(cell, side, seed, { handContact: mode, substeps: 96 });
    plainEndpoint = endpoint();
  }
  finally { prototype.integrateSubstep = original; prototype.step = originalStep; }
  if (hash(observed) !== hash(plain) || observedEndpoint !== plainEndpoint)
    throw Error('Checkpoint observer changed native result or final physical state');
  if (!saved) throw Error('Witness did not acquire a grip');
  return { saved, observed, endpoint: observedEndpoint, checkpoint: hash({ bodies: saved.fields.bodies,
    intents: saved.args[1], plans: saved.args[2], joints: saved.fields.joints, attachments: saved.attachments }), observerParity: true };
}

export function frozenInterval(saved: ReturnType<typeof packet>, partitions: number,
  variant: 'full' | 'ground-only' | 'grip-only', duration: number) {
  if (!Number.isInteger(partitions) || partitions < 1 || !Number.isFinite(duration)
    || duration <= 0 || duration > saved.args[4]) throw new RangeError('Invalid frozen interval');
  const { w, args } = restore(saved), ids: number[] = args[0], report = args[5];
  if (variant === 'ground-only') w.joints = [];
  if (variant === 'grip-only') for (const i of ids) {
    args[2][i].free = true; args[2][i].dive = null;
  }
  const start = pose(w, ids), rows: any[] = [], ground: any[] = [];
  const jointRows = w.jointRows, feet = w.feet;
  w.jointRows = function (h: number) {
    const rs = jointRows.call(this, h);
    for (const r of rs) {
      if (r.joint.kind !== 'grasp') continue;
      const a = w.bodies[r.i], b = w.bodies[r.j], rv = w.graspVelocity(r.joint);
      const inverseBody = 1 / w.mass[r.i] + 1 / w.mass[r.j]
        + (r.ri ?? 0) ** 2 / w.inertia[r.i] + (r.rj ?? 0) ** 2 / w.inertia[r.j];
      const mobility = w.attachments.get(r.joint)?.bounded
        ? w.attachmentMobility(r.joint, -r.ny, r.nx) : 0;
      rows.push({ t: w.time, h, tangentSpeed: -rv.x * r.ny + rv.y * r.nx
          - (r.ri ?? 0) * (a.spin ?? 0) - (r.rj ?? 0) * (b.spin ?? 0),
        inverseBody, mobility, capacity: r.limit / h, normal: { x: r.nx, y: r.ny },
        arms: [r.ri ?? 0, r.rj ?? 0], acquiredSlip: !!r.joint.slipping, row: r });
    }
    return rs;
  };
  w.feet = function (i: number, ...rest: any[]) {
    const before = report.groundYawImpulse[i];
    feet.call(this, i, ...rest);
    if (ids.includes(i)) ground.push({ t: w.time, i, h: rest[2],
      yaw: report.groundYawImpulse[i] - before, recovery: w.recovery[i],
      command: w.bodies[i].support.foot?.desired });
  };
  const beforeEnergy = w.kineticEnergy(), beforeLedger = { ...report.work };
  const beforeGroundWork = report.groundWork.reduce((s: number, v: number, i: number) =>
    s + v + report.groundYawWork[i], 0);
  const initialMomentum = w.bodies.reduce((v: any, b: any) =>
    ({ x: v.x + b.profile.massKg * b.vel.x, y: v.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
  const groundBefore = structuredClone(report.groundImpulse);
  const h = duration / partitions;
  for (let k = 0; k < partitions; k++) {
    const next = [...args]; next[3] = h; next[4] = args[4] - k * h;
    w.integrateSubstep(...next);
  }
  const finalMomentum = w.bodies.reduce((v: any, b: any) =>
    ({ x: v.x + b.profile.massKg * b.vel.x, y: v.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
  const groundImpulse = report.groundImpulse.reduce((v: any, j: any, i: number) =>
    ({ x: v.x + j.x - groundBefore[i].x, y: v.y + j.y - groundBefore[i].y }), { x: 0, y: 0 });
  const ledger = w.bodies.reduce((v: number, _b: any, i: number) => v + report.groundWork[i] + report.groundYawWork[i], 0)
    + report.work.hands + report.work.grasps + report.work.strikes + report.work.contacts
    - beforeLedger.hands - beforeLedger.grasps - beforeLedger.strikes - beforeLedger.contacts - beforeGroundWork;
  const result = { partitions, variant, duration, start, end: pose(w, ids),
    momentumError: Math.hypot(finalMomentum.x - initialMomentum.x - groundImpulse.x,
      finalMomentum.y - initialMomentum.y - groundImpulse.y),
    energyError: w.kineticEnergy() - beforeEnergy - ledger,
    ground, rows: rows.map(({ row, ...r }) => ({ ...r, i: row.i, j: row.j,
      normalImpulse: row.ln, tangentImpulse: row.lt })) };
  if (result.momentumError > 1e-7 || Math.abs(result.energyError) > 1e-7) throw Error('Frozen interval failed physical accounting');
  return result;
}

/** Linearize ONLY one acquired tangential row at its coarse force frame.
 * This independently tests the impulse/time moment; moving geometry, normal
 * force sharing and future recovery remain outside this reference. Refuse
 * incompatible cases rather than silently applying a football rescue rule.
 */
export function firstRowReference(saved: ReturnType<typeof packet>, trial: ReturnType<typeof frozenInterval>) {
  if (trial.partitions !== 1 || trial.rows.length !== 1) return null;
  const row = trial.rows[0];
  if (row.normalImpulse !== 0 || trial.ground.some(g => Math.abs(g.yaw) > 1e-8
    || (g.command && Math.hypot(g.command.x, g.command.y) > 1e-10))) return null;
  const local = passiveSlipReference(row.tangentSpeed, row.inverseBody, row.mobility, row.capacity, trial.duration);
  const a = saved.fields.bodies[row.i], inertia = saved.fields.inertia[row.i];
  const impulse = -row.arms[0] * local.impulse / inertia;
  const transport = -row.arms[0] * local.transport / inertia;
  return { assumption: 'One frozen tangential frame, zero normal impulse/active placement/ground yaw; same force capacity and support mobility.',
    forceCapExit: local.saturatedUntil, impulse: local.impulse, transport: local.transport,
    initialSlip: row.tangentSpeed, finalSlip: local.finalSlip,
    holderIndex: row.i, holderSpin: (a.spin ?? 0) + impulse,
    forceTransportFraction: Math.abs(local.impulse) > 0 ? Math.abs(local.transport / local.impulse) / trial.duration : 0,
    holderFacing: a.facing + (a.spin ?? 0) * trial.duration + transport,
    midpointHolderFacing: a.facing + (a.spin ?? 0) * trial.duration + impulse * trial.duration / 2 };
}

function main() {
  const out = process.argv[2] ?? 'out/contact-foundations/intervals.json';
  const source = sourceVersion(), cases: any[] = [];
  const toolHash = createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex');
  const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
  const flags = Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null]));
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const inputs: Array<{ name: string; mode: 'center' | 'patch'; cell: Cell; seed: number }> = [
    { name: 'angled witness', mode: 'patch', cell: { angle: 45, speed: 8, cut: false, difficulty: 'difficult' }, seed: 3001 },
    { name: 'rear witness', mode: 'center', cell: { angle: 180, speed: 6, cut: false, difficulty: 'difficult' }, seed: 3001 },
    ...(['center', 'patch'] as const).map(mode => ({ name: 'frontal finish control', mode,
      cell: { angle: 0, speed: 3, cut: false, difficulty: 'ordinary' as const }, seed: 3001 })),
    { name: 'fresh angled', mode: 'patch', cell: { angle: 45, speed: 8, cut: false, difficulty: 'difficult' }, seed: 4001 },
  ];
  for (const input of inputs) for (const side of [1, -1] as const) {
    const { name, mode, cell, seed } = input;
    const c = captureFirstGrip(cell, mode, side, seed), duration = .05 / 12;
    const trials = (['full', 'ground-only', 'grip-only'] as const).flatMap(variant =>
      [1, 2, 4, 8, 16, 64, 256].map(n => frozenInterval(c.saved, n, variant, duration)));
    const references = trials.filter(t => t.partitions === 1).map(t => ({ variant: t.variant,
      reference: firstRowReference(c.saved, t) }));
    cases.push({ name, mode, side, cell, seed, time: c.saved.fields.time, ids: c.saved.args[0],
      checkpoint: c.checkpoint, endpoint: c.endpoint, observerParity: c.observerParity, native: c.observed, trials, references });
    for (const variant of ['full', 'ground-only', 'grip-only']) {
      const runs = trials.filter(r => r.variant === variant), ref = runs.at(-1)!;
      console.log(JSON.stringify({ name, mode, side, variant, spin: runs.map(r => r.end.map((b: any) => b.spin)),
        error: runs.map(r => Math.max(...r.end.map((b: any, i: number) => Math.abs(b.spin - ref.end[i].spin)))) }));
    }
  }
  if (sourceVersion() !== source || createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex') !== toolHash)
    throw Error('Source/tool changed during collection');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ source, commit, node: process.version, toolHash,
    profile: profile.id, flags, worldOptions: { nativeSubsteps: 96, duration: .05 / 12,
      intervalPartitions: [1, 2, 4, 8, 16, 64, 256], handContact: 'explicit per case; patch experimental' },
    note: 'Fixed acquired checkpoint and 20 Hz plan; no outcome calibration. Patch is experimental. Ground/grip ablations are diagnostics, not new contact laws.', cases }, null, 2) + '\n');
}
if (import.meta.url === `file://${process.argv[1]}`) main();
