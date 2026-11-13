/** Bounded diagnostic interventions before choosing a closure implementation.
 * REACH_CONTACT=1 LEG_BRACE=1 TACKLE_ROLL=1 WRAP_BIND=1 node --import tsx
 * scripts/diag/physics/reach-closure-compare.ts MODE [output.json] [--full] [--fresh]
 * MODE: brace, no-reel, early-reel, absorb-reel, depth-probe.
 * depth-probe is a causal diagnostic: substitute the matched control's hold
 * depth only after achieved torso proximity. It is NOT a feasible re-grab law
 * or player information. --probe selects slow front/rear and diving controls.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { PlaySim } from '../../../src/sim/playsim.js';
import { World, type GraspJoint } from '../../../src/physics/world.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam } from '../../../src/league/team.js';
import { CELLS, rep, type Cell } from '../tackle/panel.js';
import { sourceVersion } from '../../source-version.js';

const mode = process.argv[2] ?? 'brace';
assert(['brace', 'no-reel', 'early-reel', 'absorb-reel', 'depth-probe'].includes(mode));
const out = process.argv[3] ?? `out/reach-closure/${mode}.json`;
const full = process.argv.includes('--full'), fresh = process.argv.includes('--fresh');
const source = sourceVersion(), hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const selected = [[45, 6, false], [90, 6, false], [0, 8, false], [180, 6, false], [45, 6, true], [0, 3, false]];
const choices = process.argv.includes('--probe') ? [[0, 3, false], [135, 6, false], [90, 6, false]] : selected;
const cells = full ? CELLS : choices.map(([angle, speed, cut]) => CELLS.find(c => c.angle === angle && c.speed === speed && c.cut === cut)!);
const proto = World.prototype as any;
const controls = mode === 'depth-probe' ? JSON.parse(readFileSync(`out/reach-contact/${fresh ? 'fresh-' : ''}finish.json`, 'utf8')) : null;
function execute(cell: Cell, side: 1 | -1, seed: number, teams: Parameters<typeof rep>[4], observe: boolean, probeDepth?: number) {
  const tick = PlaySim.prototype.tick, step = World.prototype.step, rowsFn = proto.jointRows;
  let sim: PlaySim | undefined, initial: string | undefined, profiles: string | undefined;
  const frames: any[] = [], transitions: any[] = [], seen = new WeakSet<GraspJoint>();
  let batches: any[][] = [];
  PlaySim.prototype.tick = function () { sim = this; return tick.call(this); };
  proto.jointRows = function (...args: any[]) { const rows = rowsFn.apply(this, args); if (observe && sim?.world === this) batches.push(rows); return rows; };
  World.prototype.step = function (intents, dt) {
    if (sim?.world !== this) return step.call(this, intents, dt);
    const c = sim.slot('RB')!, d = sim.defense.find(a => a.slot.startsWith('LB'))!;
    const snapshot = () => ({ c: { pos: { ...c.pos }, vel: { ...c.vel }, state: c.body.support!.state },
      d: { pos: { ...d.pos }, vel: { ...d.vel }, state: d.body.support!.state } });
    initial ??= hash([c.body, d.body]); profiles ??= hash([c.profile, d.profile]);
    for (const joint of this.joints) {
      if (joint.kind !== 'grasp') continue;
      if (mode === 'depth-probe' && probeDepth !== undefined && joint.legs < probeDepth
        && Math.hypot(joint.a.pos.x - joint.b.pos.x, joint.a.pos.y - joint.b.pos.y)
          <= joint.a.profile.radius + joint.b.profile.radius) {
        transitions.push({ t: this.time, diagnosticDepthBefore: joint.legs, diagnosticDepthAfter: probeDepth });
        joint.legs = probeDepth;
      }
      if (joint.brace === undefined) continue;
      const j = joint;
      const dx = j.b.pos.x - j.a.pos.x, dy = j.b.pos.y - j.a.pos.y, dist = Math.hypot(dx, dy);
      const normalSpeed = ((j.b.vel.x - j.a.vel.x) * dx + (j.b.vel.y - j.a.vel.y) * dy) / dist;
      const release = mode === 'no-reel' || mode === 'early-reel' || mode === 'depth-probe'
        || mode === 'absorb-reel' && seen.has(j) && normalSpeed >= 0;
      seen.add(j);
      if (release) {
        transitions.push({ t: this.time, distance: dist, normalSpeed });
        delete j.brace;
        if (mode !== 'no-reel') j.pull = 1.2 + 1.2 * d.r('tackling');
      }
    }
    const before = snapshot(), t = this.time;
    batches = [];
    const r = step.call(this, intents, dt);
    if (observe) {
      assert(Math.abs(r.work.residual) < 1e-8 && r.passiveGraspWork <= 1e-8);
      for (const i of [c.idx, d.idx]) {
        assert(r.armImpulse[i] <= r.armImpulseLimit[i] + 1e-8);
        assert(r.armWork[i] <= r.armWorkLimit[i] + 1e-8);
        assert(r.supportMotorWork[i] <= r.supportMotorWorkLimit[i] + 1e-8);
      }
      const gripRows = batches.flat().filter(row => row.joint.kind === 'grasp' && row.joint.b === c.body);
      const grips = this.joints.filter((j): j is GraspJoint => j.kind === 'grasp' && j.b === c.body)
        .map(({ a, b, ...j }) => structuredClone(j));
      frames.push({ t, after: this.time, before, end: snapshot(), requests: [structuredClone(intents[c.idx]), structuredClone(intents[d.idx])],
        normalImpulse: gripRows.reduce((s, row) => s + row.ln, 0),
        tangentImpulse: gripRows.reduce((s, row) => s + row.lt, 0),
        reelImpulse: gripRows.reduce((s, row) => s + row.reel, 0),
        compressionSubsteps: gripRows.filter(row => row.mode > 0).length,
        bodyImpulse: r.contacts.filter(h => h.i === c.idx && h.j === d.idx || h.i === d.idx && h.j === c.idx).reduce((s, h) => s + h.impulse, 0),
        grips, residual: r.work.residual });
    }
    return r;
  };
  try {
    const result = rep(cell, side, seed, {}, teams);
    assert(sim);
    const endpoint = hash({ result, bodies: sim.agents.map(a => a.body), intents: sim.intents,
      minds: sim.agents.map(a => a.mind), rng: sim.rng, events: sim.events });
    return { result, initial, profiles, endpoint, frames, transitions };
  } finally { PlaySim.prototype.tick = tick; World.prototype.step = step; proto.jointRows = rowsFn; }
}
const rows = [];
for (const [o, d] of fresh ? [[71, 72], [81, 82]] : [[61, 62]]) {
  const teams = fresh ? { offense: generateTeam(new Rng(o), 'Fresh O', 'FO', { strength: .55 }),
    defense: generateTeam(new Rng(d), 'Fresh D', 'FD', { strength: .55 }) } : undefined;
  for (const cell of cells) for (const side of [1, -1] as const) for (const seed of fresh ? [4001] : full ? [3000, 3001, 3002] : [3001]) {
    const control = controls?.rows.find((r: any) => r.o === o && r.d === d && r.result.angle === cell.angle
      && r.result.speed === cell.speed && r.result.cut === cell.cut && r.result.side === side && r.result.seed === seed);
    const probeDepth = control?.result.attempts.find((a: any) => a.kind === 'grip' || a.kind === 'dive grip')?.legs;
    const observed = execute(cell, side, seed, teams, true, probeDepth), plain = execute(cell, side, seed, teams, false, probeDepth);
    assert(observed.endpoint === plain.endpoint);
    rows.push({ o, d, ...observed, observerNeutral: true });
  }
}
assert(sourceVersion() === source);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ source, mode, full, fresh, collector: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  flags: Object.fromEntries(['REACH_CONTACT', 'LEG_BRACE', 'TACKLE_ROLL', 'WRAP_BIND'].map(k => [k, process.env[k] ?? '0'])), rows }));
console.log(out, rows.length, 'observer-neutral plays');
