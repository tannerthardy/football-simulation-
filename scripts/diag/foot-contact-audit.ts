/** Actual support-phase foot restriction, rather than a pre-force snapshot.
 * node --import tsx scripts/diag/foot-contact-audit.ts out/foot-contact.json
 * Controlled mechanisms, not NFL tackle rates or a fitted foot-force model.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Body } from '../../src/physics/kinematics.js';
import { newSupport } from '../../src/physics/support.js';
import { World, type GraspJoint, type Intent, type StepReport } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

const profile = { massKg: 100, radius: .28, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
  shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
  power: 100, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
const make = (x: number, y = 0, vx = 0, vy = 0): Body => ({ pos: { x, y }, vel: { x: vx, y: vy },
  facing: 0, energy: 1, profile: { ...profile }, support: newSupport() });
const stand: Intent = { vel: { x: 0, y: 0 }, posture: .2 };
const scenarios = ['separation', 'common-acceleration', 'side-slide', 'recovery', 'past-standing', 'past-ground'] as const;
interface Observer { maxLock: number; lockIntegral: number; maxXi: number }
interface DebugWorld {
  updateSupport(this: World, i: number, h: number, report: StepReport): void;
}
const proto = World.prototype as unknown as DebugWorld, original = proto.updateSupport;
let active: World | undefined, observed: Observer | undefined;
proto.updateSupport = function(i, h, report) {
  if (this === active && i === 1 && observed) {
    const sup = this.bodies[i].support!;
    observed.maxLock = Math.max(observed.maxLock, sup.feetLock);
    observed.lockIntegral += sup.feetLock * h;
  }
  original.call(this, i, h, report);
  if (this === active && i === 1 && observed)
    observed.maxXi = Math.max(observed.maxXi, Math.hypot(this.bodies[i].support!.xi.x, this.bodies[i].support!.xi.y));
};
interface AuditRow extends Observer {
  scenario: typeof scenarios[number]; capacity: number | null; count: number; substeps: number;
  momentumError: number; workError: number; gripImpulse: number;
  footImpulse: number | null; footLimit: number | null; falls: number[]; final: Body[]; frames: unknown[];
}
const rows: AuditRow[] = [];
try {
  for (const scenario of scenarios) for (const capacity of [null, 0, 1, 50, 900]) {
    for (const count of capacity === null ? [0] : [1, 4]) for (const substeps of [12, 48, 192]) {
      const holder = make(0), runner = make(1, 0, 3), bs = [holder, runner];
      let intents: Intent[] = [stand, { ...stand, vel: { x: 3, y: 0 } }];
      if (scenario === 'common-acceleration') {
        runner.vel.x = 0; intents = bs.map(() => ({ ...stand, vel: { x: 4, y: 0 } }));
      }
      if (scenario === 'side-slide') { runner.vel = { x: 0, y: 3 }; intents[1] = { ...stand, vel: { x: 0, y: 3 } }; }
      if (scenario === 'recovery') { runner.vel.x = 0; runner.support!.xi = { x: .24, y: .04 }; runner.support!.out = .12; intents = [stand, stand]; }
      if (scenario === 'past-standing') runner.pos.x = 2.2;
      if (scenario === 'past-ground') { runner.pos.x = 2.5; holder.support!.state = 'down'; holder.support!.since = 0; }
      const world = new World(bs, { substeps });
      // Same zero-force numerical-island row in the ungripped control.
      world.joints.push({ kind: 'hands', a: holder, b: runner, extension: 3, push: 0, hold: 0, steer: 0 });
      const grasps: GraspJoint[] = [];
      for (let k = 0; k < count; k++) {
        const joint: GraspJoint = { kind: 'grasp', a: holder, b: runner, reach: 1.5,
          capacity: capacity!, legs: 1, pull: 0, hold: runner.pos.x,
          ...(scenario === 'past-ground' ? { ground: 2.4 } : {}) };
        world.joints.push(joint); grasps.push(joint);
      }
      active = world; observed = { maxLock: 0, lockIntegral: 0, maxXi: 0 };
      let momentumError = 0, workError = 0, gripImpulse = 0;
      let footImpulse: number | null = null, footLimit: number | null = null;
      const falls = new Set<number>(), frames = [];
      for (let k = 0; k < 8; k++) {
        const before = bs.reduce((s, b) => ({ x: s.x + b.profile.massKg * b.vel.x, y: s.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
        const r = world.step(intents, .05);
        const after = bs.reduce((s, b, i) => ({ x: s.x + b.profile.massKg * b.vel.x - r.groundImpulse[i].x,
          y: s.y + b.profile.massKg * b.vel.y - r.groundImpulse[i].y }), { x: 0, y: 0 });
        momentumError = Math.max(momentumError, Math.hypot(after.x - before.x, after.y - before.y));
        workError = Math.max(workError, Math.abs(r.work.residual));
        for (const g of world.joints) if (g.kind === 'grasp') {
          gripImpulse += (g.force ?? 0) * .05;
          const q = g as GraspJoint & { footImpulse?: number; footLimit?: number };
          if (q.footImpulse !== undefined) footImpulse = (footImpulse ?? 0) + q.footImpulse;
          if (q.footLimit !== undefined) footLimit = (footLimit ?? 0) + q.footLimit;
        }
        for (const i of r.falls) falls.add(i);
        if (k < 2 || k === 7) frames.push({ t: world.time, bodies: structuredClone(bs),
          grasps: grasps.map(({ a, b, ...g }) => structuredClone(g)) });
      }
      rows.push({ scenario, capacity, count, substeps, ...observed, momentumError, workError,
        gripImpulse, footImpulse, footLimit, falls: [...falls], final: structuredClone(bs), frames });
      observed = undefined; active = undefined;
    }
  }
} finally { proto.updateSupport = original; observed = undefined; active = undefined; }
const summaries = scenarios.map(scenario => ({ scenario,
  native: rows.filter(r => r.scenario === scenario && r.substeps === 12).map(r => ({
    capacity: r.capacity, count: r.count, maxLock: r.maxLock, lockIntegral: r.lockIntegral,
    maxXi: r.maxXi, gripImpulse: r.gripImpulse, falls: r.falls })) }));
const out = process.argv[2] ?? 'out/foot-contact.json'; mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ sourceSha256: sourceVersion(),
  note: '162 controlled trials, six geometries, no-grasp and four capacities, one/four duplicate grips, 12/48/192 actual subdivisions, eight 20-Hz ticks. Observes foot restriction at updateSupport, after current forces/interval motion; no extra decisions/RNG. No-grasp controls have the same zero-force island row. Missing experimental foot-budget telemetry is null. Snapshots are witnesses, not reusable save files (nonfinite timestamps become null).',
  profile, summaries, rows }) + '\n');
console.log(`${rows.length} trials; source ${sourceVersion()}; wrote ${out}`);
console.table(summaries.flatMap(s => s.native.map(r => ({ scenario: s.scenario, ...r, falls: r.falls.join(',') }))));
