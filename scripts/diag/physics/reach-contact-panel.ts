/** Native approach/contact ledger. Actual executed impulse channels and live
 * boundary samples; no extra player observations, decisions or random draws.
 * Optional --no-brace ablates only compression and span retention in World,
 * retaining reach acquisition and no reel. This is not a production option.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam } from '../../../src/league/team.js';
import { World, type GraspJoint } from '../../../src/physics/world.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { CELLS, rep, type Cell } from '../tackle/panel.js';
import { sourceVersion } from '../../source-version.js';

const out = process.argv[2] ?? 'out/reach-contact/panel.json';
const extraFresh = process.argv.includes('--extra-fresh');
const newFresh = process.argv.includes('--new-fresh'); // Declared roster 101/102, seed 6001.
const fresh = process.argv.includes('--fresh') || extraFresh || newFresh;
const noBrace = process.argv.includes('--no-brace');
const patch = process.argv.includes('--patch');
const source = sourceVersion();
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const rows = [];
function execute(cell: Cell, side: 1 | -1, seed: number, teams?: Parameters<typeof rep>[4], observe = true) {
  const tick = PlaySim.prototype.tick, step = World.prototype.step;
  const proto = World.prototype as any;
  const methods = ['pairImpulse', 'supportImpulse', 'solveContact'];
  const originals = Object.fromEntries(methods.map(k => [k, proto[k]]));
  let sim: PlaySim | undefined, carrier: PlaySim['agents'][number] | undefined;
  let channel: Record<string, { x: number; y: number }> | undefined;
  const frames: any[] = [];
  let initial: string | undefined, profiles: string | undefined;
  PlaySim.prototype.tick = function () { sim = this; carrier = this.slot('RB')!; return tick.call(this); };
  for (const name of methods) proto[name] = function (...args: any[]) {
    const before = channel && sim?.world === this && carrier ? { ...carrier.vel } : null;
    const result = originals[name].apply(this, args);
    if (before && carrier) {
      const kind = name === 'solveContact' ? 'torso' : name === 'supportImpulse' || args[5] === 'grasps' ? 'grasp' : 'other';
      const sum = channel![kind];
      sum.x += carrier.profile.massKg * (carrier.vel.x - before.x);
      sum.y += carrier.profile.massKg * (carrier.vel.y - before.y);
    }
    return result;
  };
  World.prototype.step = function (intents, dt) {
    if (sim?.world !== this || !carrier) return step.call(this, intents, dt);
    const c = carrier, d = sim.defense.find(a => a.slot.startsWith('LB'))!;
    const snapshot = () => ({ c: { pos: { ...c.pos }, vel: { ...c.vel }, state: c.body.support!.state },
      d: { pos: { ...d.pos }, vel: { ...d.vel }, state: d.body.support!.state } });
    initial ??= hash([c.body, d.body]); profiles ??= hash([c.profile, d.profile]);
    const before = snapshot(), t = this.time;
    // Ablation never restores a compressed body, recorded slide or break.
    if (noBrace) for (const j of this.joints) if (j.kind === 'grasp') delete j.brace;
    const grasps = this.joints.filter((j): j is GraspJoint => j.kind === 'grasp' && j.b === c.body && !j.broken);
    const acquired = grasps.map(j => ({ capacity: j.capacity, span: j.brace, hold: j.hold,
      legs: j.legs, coupling: j.recoveryCoupling, pull: j.pull }));
    channel = observe ? { torso: { x: 0, y: 0 }, grasp: { x: 0, y: 0 }, other: { x: 0, y: 0 } } : undefined;
    const r = step.call(this, intents, dt), after = snapshot();
    const delivered = channel; channel = undefined;
    if (observe) {
      assert(Math.abs(r.work.residual) < 1e-8 && r.passiveGraspWork <= 1e-8);
      for (const i of [c.idx, d.idx]) {
        assert(r.armImpulse[i] <= r.armImpulseLimit[i] + 1e-8);
        assert(r.armWork[i] <= r.armWorkLimit[i] + 1e-8);
        assert(r.supportMotorWork[i] <= r.supportMotorWorkLimit[i] + 1e-8);
      }
      const ground = r.groundImpulse[c.idx], sum = delivered!;
      const residual = Math.hypot(c.profile.massKg * (after.c.vel.x - before.c.vel.x) - ground.x - sum.torso.x - sum.grasp.x - sum.other.x,
        c.profile.massKg * (after.c.vel.y - before.c.vel.y) - ground.y - sum.torso.y - sum.grasp.y - sum.other.y);
      assert(residual < 1e-7);
      frames.push({ t, after: this.time, before, end: after, acquired,
        positiveGrasp: grasps.some(j => (j.force ?? 0) > 0),
        body: r.contacts.filter(h => (h.i === c.idx && h.j === d.idx) || (h.i === d.idx && h.j === c.idx)),
        channels: delivered, ground, residual,
        requests: [structuredClone(intents[c.idx]), structuredClone(intents[d.idx])] });
    }
    return r;
  };
  try {
    const result = rep(cell, side, seed, { handContact: patch ? 'patch' : 'center' }, teams);
    assert(sim);
    const endpoint = hash({ result, bodies: sim.agents.map(a => a.body), intents: sim.intents,
      minds: sim.agents.map(a => a.mind), rng: sim.rng, events: sim.events });
    return { result, initial, profiles, endpoint, frames };
  } finally { World.prototype.step = step; PlaySim.prototype.tick = tick;
    for (const name of methods) proto[name] = originals[name]; }
}
const sets = newFresh ? [[101, 102]] : extraFresh ? [[91, 92]] : fresh ? [[71, 72], [81, 82]] : [[61, 62]];
for (const [o, d] of sets) {
  const teams = fresh ? { offense: generateTeam(new Rng(o), 'Fresh O', 'FO', { strength: .55 }),
    defense: generateTeam(new Rng(d), 'Fresh D', 'FD', { strength: .55 }) } : undefined;
  for (const cell of CELLS) for (const side of [1, -1] as const) for (const seed of newFresh ? [6001] : extraFresh ? [5001] : fresh ? [4001] : [3000, 3001, 3002]) {
    const observed = execute(cell, side, seed, teams), plain = execute(cell, side, seed, teams, false);
    assert(observed.endpoint === plain.endpoint);
    rows.push({ o, d, ...observed, observerNeutral: true });
  }
}
assert(sourceVersion() === source);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ source, protocol: 'native-reach-contact-ledger-v1',
  collector: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  flags: Object.fromEntries(['TACKLE_TOUCH', 'REACH_CONTACT', 'LEG_BRACE', 'TACKLE_ROLL', 'WRAP_BIND', 'GAIT_STEP'].map(k => [k, process.env[k] ?? '0'])),
  noBrace, fresh, extraFresh, newFresh, patch, rows }));
console.log(out, rows.length, 'observer-neutral plays');
