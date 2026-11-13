/** Bounded actual World impulses: an ordinary counterlean plus an independent
 * height-derived couple. Tests moment direction, not NFL calibration or 3D energy.
 * A deliberately prepared felt-load checkpoint isolates the first response. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { G } from '../../../src/core/units.js';
import type { Vec2 } from '../../../src/core/vec.js';
import type { Body } from '../../../src/physics/kinematics.js';
import { baseRadiusAt, comHeightAt, newSupport, supportParams } from '../../../src/physics/support.js';
import { World, type Intent } from '../../../src/physics/world.js';
import type { PhysicalProfile } from '../../../src/players/physical.js';
import { sourceVersion } from '../../source-version.js';

export interface BraceCase { id: string; xLoad?: number; coupleForce?: number; plane?: 'parallel' | 'transverse';
  angle?: number; mirror?: number; substeps?: number }
const magnitude = (v: Vec2) => Math.hypot(v.x, v.y);
const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
const sum = (vs: Vec2[]) => vs.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }), { x: 0, y: 0 });
export const braceCases: BraceCase[] = [
  { id: 'transverse-with-lean', xLoad: 400, coupleForce: 500 },
  { id: 'transverse-without-lean', xLoad: 0, coupleForce: 500 },
  { id: 'collinear-with-lean', xLoad: 400, coupleForce: 500, plane: 'parallel' },
  { id: 'small-transverse-without-lean', xLoad: 0, coupleForce: 100 },
  { id: 'transverse-with-lean-mirror', xLoad: 400, coupleForce: 500, mirror: -1 },
  { id: 'transverse-with-lean-rotate', xLoad: 400, coupleForce: 500, angle: .7 },
  { id: 'transverse-with-lean-48', xLoad: 400, coupleForce: 500, substeps: 48 },
];

export function directionalBrace(c: BraceCase) {
  const angle = c.angle ?? 0, mirror = c.mirror ?? 1;
  const map = (v: Vec2): Vec2 => ({ x: v.x * Math.cos(angle) - mirror * v.y * Math.sin(angle),
    y: v.x * Math.sin(angle) + mirror * v.y * Math.cos(angle) });
  const xAxis = map({ x: 1, y: 0 }), coupleAxis = map(c.plane === 'parallel' ? { x: 1, y: 0 } : { x: 0, y: 1 });
  const p: PhysicalProfile = { massKg: 130, radius: .3, reach: 1, heightYd: 2.05,
    vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
    maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 130,
    balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
  const make = (pos: Vec2): Body => ({ pos: map(pos), vel: { x: 0, y: 0 }, facing: angle,
    energy: 1, profile: { ...p }, support: newSupport(.6) });
  const target = make({ x: 0, y: 0 }), source = make({ x: .9, y: 0 });
  const actors = c.plane === 'parallel'
    ? [make({ x: -.9, y: .6 }), make({ x: .9, y: .6 })]
    : [make({ x: 0, y: -.9 }), make({ x: 0, y: .9 })];
  const bs = [target, source, ...actors], sp = supportParams(p), hc = comHeightAt(sp, .6);
  const load = c.xLoad ?? 400, f = c.coupleForce ?? 500, offset = .4, dt = .05;
  const moment = 2 * f * offset; // Independent external force×height oracle.
  target.support!.felt = { x: -load * xAxis.x, y: -load * xAxis.y };
  target.support!.lean = { x: load * xAxis.x, y: load * xAxis.y };
  const equivalent = moment * hc / (p.massKg * sp.pitchRadiusSq);
  target.support!.feltTip = { x: equivalent * coupleAxis.x, y: equivalent * coupleAxis.y };
  const before = structuredClone(bs), world = new World(bs, { substeps: c.substeps ?? 12 });
  const w: any = world, records: any[] = [];
  let oldTip = { x: 0, y: 0 }, incomingTip = { x: 0, y: 0 };
  const feet = w.feet;
  w.feet = function(i: number, ...args: any[]) {
    if (i === 0) { oldTip = { ...target.support!.feltTip! }; incomingTip = { x: 0, y: 0 }; }
    return feet.call(this, i, ...args);
  };
  const addLoad = w.addLoad;
  w.addLoad = function(...args: any[]) {
    const x = this.tipX[0], y = this.tipY[0];
    const r = addLoad.apply(this, args);
    incomingTip.x += this.tipX[0] - x; incomingTip.y += this.tipY[0] - y;
    return r;
  };
  const support = w.updateSupport;
  w.updateSupport = function(i: number, h: number, ...args: any[]) {
    if (i === 0) {
      const scale = p.massKg * sp.pitchRadiusSq / this.comHeight[0];
      const remaining = { x: this.tipX[0] / h * scale, y: this.tipY[0] / h * scale };
      const incoming = { x: incomingTip.x / h * scale, y: incomingTip.y / h * scale };
      const canceled = { x: incoming.x - remaining.x, y: incoming.y - remaining.y };
      records.push({ t: this.time, h, incomingMoment: incoming, remainingMoment: remaining,
        canceledMoment: canceled, oldTip, achievedBrace: { x: this.braceX[0], y: this.braceY[0] },
        ankleMomentBudget: p.massKg * G * baseRadiusAt(sp, target.support!.posture) * this.alpha[0],
        canceledAlongCouple: dot(canceled, coupleAxis), remainingAlongCouple: dot(remaining, coupleAxis) });
    }
    return support.call(this, i, h, ...args);
  };
  if (load) world.strike(source, target, { x: -load * dt * xAxis.x, y: -load * dt * xAxis.y }, hc);
  for (const [i, sign] of [[0, 1], [1, -1]] as const)
    world.strike(actors[i], target, { x: sign * f * dt * coupleAxis.x, y: sign * f * dt * coupleAxis.y }, hc + sign * offset);
  // A tiny counter-drive maintains willingness to lean. Zero wanted velocity
  // is not an existing maximal-brace command; do not confuse the two tasks.
  const cmd: Intent = { vel: { x: load ? .001 * xAxis.x : 0, y: load ? .001 * xAxis.y : 0 },
    facing: angle, posture: .6, push: load ? 1 : 0 };
  const free: Intent = { vel: { x: 0, y: 0 }, free: true };
  const report = world.step([cmd, free, free, free], dt);
  const momentum = sum(bs.map(b => ({ x: b.vel.x * p.massKg, y: b.vel.y * p.massKg })));
  const ground = sum(report.groundImpulse);
  const momentumResidual = magnitude({ x: momentum.x - ground.x, y: momentum.y - ground.y });
  assert(momentumResidual < 1e-8); assert(Math.abs(report.work.residual) < 1e-8);
  for (let i = 0; i < bs.length; i++) {
    assert(report.armImpulse[i] <= report.armImpulseLimit[i] + 1e-8);
    assert(report.armWork[i] <= report.armWorkLimit[i] + 1e-8);
  }
  return { input: c, preparedCheckpoint: before, commands: [cmd, free, free, free],
    independentMoment: moment, heightOffset: offset, records,
    after: structuredClone(bs), momentumResidual, planarWorkResidual: report.work.residual,
    groundImpulse: report.groundImpulse, armImpulse: report.armImpulse, armImpulseLimit: report.armImpulseLimit,
    tipAlongCouple: dot(target.support!.tipAccel!, coupleAxis), deviationAlongCouple: dot(target.support!.xi, coupleAxis) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] ?? 'out/directional-brace/mechanical.json';
  const start = performance.now(), source = sourceVersion(), rows = braceCases.map(directionalBrace);
  mkdirSync(dirname(out), { recursive: true });
  const result = { testedRevision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    source, toolSha256: createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
    elapsedSeconds: (performance.now() - start) / 1000, rows };
  writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(rows.map(r => ({ id: r.input.id, first: r.records[0],
    tip: r.tipAlongCouple, xi: r.deviationAlongCouple, momentumResidual: r.momentumResidual })), null, 2));
}
