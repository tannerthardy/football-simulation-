/** Newtonian force oracle + achieved strike channels; no football outcome fit.
 * node --import tsx scripts/diag/strike-force-review.ts [output.json]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Vec2 } from '../../src/core/vec.js';
import type { Body } from '../../src/physics/kinematics.js';
import { World, type Intent } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

const out = process.argv[2] ?? 'out/strike-contact-review/strike-force.json';
if (process.argv.length > 3) throw new Error('Usage: strike-force-review.ts [output.json]');
const free: Intent = { vel: { x: 0, y: 0 }, free: true }, dt = .05, ticks = 4;
const sourceBefore = sourceVersion();
const scriptBefore = createHash('sha256').update(readFileSync('scripts/diag/strike-force-review.ts')).digest('hex');
const make = (mass: number, x: number): Body => ({
  pos: { x, y: 0 }, vel: { x: .7, y: 0 }, facing: 0, energy: 1,
  profile: { massKg: mass, radius: .3, reach: 1, heightYd: 2.05, vmax: 9,
    tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
    maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: mass,
    balance: .5, stepSpeed: 3.4, getUp: .9 },
});
const rows = [];
for (const substeps of [1, 6, 12, 48, 192]) for (const angle of [0, .8, -.8]) {
  const rotate = (v: Vec2) => ({ x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
    y: v.x * Math.sin(angle) + v.y * Math.cos(angle) });
  const a = make(100, 0), b = make(80, .9), force = 20, time = ticks * dt;
  for (const q of [a, b]) { q.pos = rotate(q.pos); q.vel = rotate(q.vel); q.facing = angle; }
  const world = new World([a, b], { substeps }), frames = [];
  for (let k = 0; k < ticks; k++) {
    const before = structuredClone([a, b]);
    world.strike(a, b, rotate({ x: force * dt, y: 0 }));
    const r = world.step([free, free], dt);
    frames.push({ t: k * dt, after: structuredClone([a, b]), before,
      strikes: r.strikes, contacts: r.contacts, armImpulse: r.armImpulse,
      armImpulseLimit: r.armImpulseLimit, armWork: r.armWork,
      armWorkLimit: r.armWorkLimit, work: r.work, groundImpulse: r.groundImpulse, falls: r.falls });
  }
  const refs = [rotate({ x: .7 * time - .5 * force / 100 * time ** 2, y: 0 }),
    rotate({ x: .9 + .7 * time + .5 * force / 80 * time ** 2, y: 0 })];
  const velocityRefs = [rotate({ x: .7 - force / 100 * time, y: 0 }),
    rotate({ x: .7 + force / 80 * time, y: 0 })];
  rows.push({ id: `SF-P${substeps}-A${angle}`, substeps, angle, force, dt, time,
    refs, velocityRefs, endpoint: structuredClone([a, b]), frames,
    maxPositionError: Math.max(...[a, b].map((q, i) => Math.hypot(q.pos.x - refs[i].x, q.pos.y - refs[i].y))),
    maxVelocityError: Math.max(...[a, b].map((q, i) => Math.hypot(q.vel.x - velocityRefs[i].x, q.vel.y - velocityRefs[i].y))),
    momentumError: Math.hypot(a.vel.x * 100 + b.vel.x * 80 - .7 * 180 * Math.cos(angle),
      a.vel.y * 100 + b.vel.y * 80 - .7 * 180 * Math.sin(angle)) });
}
const sourceAfter = sourceVersion();
if (sourceBefore !== sourceAfter) throw new Error('Source changed during collection');
const report = { schema: 'strike-force-review-v1', sourceBefore, sourceAfter, scriptBefore,
  argv: process.argv, node: process.version,
  scope: 'Independent constant bounded planar force oracle, unequal masses, rotations and resolutions. No ground forces or torso contacts. This exact restricted test does not establish nonlinear contact onset or football realism.',
  controls: 'Four20Hz ticks; same20kg*yd/s² force applied as J=F*dt each tick. Only physics subdivisions vary.',
  rows, summary: { fixtures: rows.length, nativeMaxPositionError: Math.max(...rows.filter(r => r.substeps === 12).map(r => r.maxPositionError)),
    maxPositionError: Math.max(...rows.map(r => r.maxPositionError)),
    maxVelocityError: Math.max(...rows.map(r => r.maxVelocityError)),
    maxMomentumResidual: Math.max(...rows.map(r => r.momentumError)),
    maxWorkResidual: Math.max(...rows.flatMap(r => r.frames.map(f => Math.abs(f.work.residual)))),
    torsoContacts: rows.flatMap(r => r.frames).reduce((n, f) => n + f.contacts.length, 0),
    falls: rows.flatMap(r => r.frames).reduce((n, f) => n + f.falls.length, 0) } };
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary));
