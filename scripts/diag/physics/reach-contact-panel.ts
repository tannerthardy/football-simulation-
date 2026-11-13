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
import { withRecoveryExperiment } from '../tackle/grip-refinement.js';

const out = process.argv[2] ?? 'out/reach-contact/panel.json';
const arg = (key: string) => { const i = process.argv.indexOf(key); return i < 0 ? undefined : process.argv[i + 1]; };
const extraFresh = process.argv.includes('--extra-fresh');
const newFresh = process.argv.includes('--new-fresh'); // Declared roster 101/102, seed 6001.
const rosters = arg('--rosters')?.split('/').map(Number);
assert(!rosters || rosters.length === 2 && rosters.every(Number.isInteger));
const fresh = process.argv.includes('--fresh') || extraFresh || newFresh || !!rosters;
const noBrace = process.argv.includes('--no-brace');
const patch = process.argv.includes('--patch');
const continued = process.argv.includes('--continued-recovery');
const retainFailures = process.argv.includes('--retain-failures');
const substeps = arg('--substeps') === undefined ? undefined : Number(arg('--substeps'));
assert(substeps === undefined || [12, 24, 48, 96].includes(substeps));
const selected = arg('--cells')?.split(',');
const cells = CELLS.filter(c => !selected || selected.includes(`${c.angle}/${c.speed}/${Number(c.cut)}`));
assert(cells.length && (!selected || cells.length === selected.length));
const selectedSeed = arg('--seed') === undefined ? undefined : Number(arg('--seed'));
const source = sourceVersion();
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const rows = [];
function execute(cell: Cell, side: 1 | -1, seed: number, teams?: Parameters<typeof rep>[4], observe = true) {
  const tick = PlaySim.prototype.tick, step = World.prototype.step;
  const proto = World.prototype as any;
  const methods = ['pairImpulse', 'supportImpulse', 'solveContact'];
  const originals = Object.fromEntries(methods.map(k => [k, proto[k]]));
  let sim: PlaySim | undefined, carrier: PlaySim['agents'][number] | undefined;
  const frames: any[] = [];
  let initial: string | undefined, profiles: string | undefined;
  PlaySim.prototype.tick = function () { sim = this; carrier = this.slot('RB')!; return tick.call(this); };
  for (const name of methods) proto[name] = function (...args: any[]) {
    // The continued-recovery adapter executes scratch Worlds. Their journals
    // are copied with the trial and accepted with its bodies; rejected solves
    // must not contribute impulses to the live interval's ledger.
    const journal = Reflect.get(this, 'reachImpulseLedger') as Record<string, { x: number; y: number }> | undefined;
    const body = carrier && this.bodies[carrier.idx];
    const before = journal && body ? { ...body.vel } : null;
    const result = originals[name].apply(this, args);
    if (before && body) {
      const kind = name === 'solveContact' ? 'torso' : name === 'supportImpulse' || args[5] === 'grasps' ? 'grasp' : 'other';
      const sum = journal![kind];
      sum.x += body.profile.massKg * (body.vel.x - before.x);
      sum.y += body.profile.massKg * (body.vel.y - before.y);
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
    if (observe) Reflect.set(this, 'reachImpulseLedger', { torso: { x: 0, y: 0 }, grasp: { x: 0, y: 0 }, other: { x: 0, y: 0 } });
    const execute = () => step.call(this, intents, dt);
    const r = continued ? withRecoveryExperiment(this, 'continued-recovery', execute).result : execute();
    const after = snapshot();
    const delivered = Reflect.get(this, 'reachImpulseLedger') as Record<string, { x: number; y: number }> | undefined;
    Reflect.deleteProperty(this, 'reachImpulseLedger');
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
    const result = rep(cell, side, seed, { handContact: patch ? 'patch' : 'center', substeps }, teams);
    assert(sim);
    const endpoint = hash({ result, bodies: sim.agents.map(a => a.body), intents: sim.intents,
      minds: sim.agents.map(a => a.mind), rng: sim.rng, events: sim.events });
    return { result, initial, profiles, endpoint, frames };
  } finally { World.prototype.step = step; PlaySim.prototype.tick = tick;
    for (const name of methods) proto[name] = originals[name]; }
}
const sets = rosters ? [rosters] : newFresh ? [[101, 102]] : extraFresh ? [[91, 92]] : fresh ? [[71, 72], [81, 82]] : [[61, 62]];
for (const [o, d] of sets) {
  const teams = fresh ? { offense: generateTeam(new Rng(o), 'Fresh O', 'FO', { strength: .55 }),
    defense: generateTeam(new Rng(d), 'Fresh D', 'FD', { strength: .55 }) } : undefined;
  for (const cell of cells) for (const side of [1, -1] as const) for (const seed of selectedSeed === undefined
    ? newFresh ? [6001] : extraFresh ? [5001] : fresh ? [4001] : [3000, 3001, 3002] : [selectedSeed]) {
    try {
      const observed = execute(cell, side, seed, teams), plain = execute(cell, side, seed, teams, false);
      assert(observed.endpoint === plain.endpoint);
      rows.push({ o, d, ...observed, observerNeutral: true });
      console.log(`${o}/${d} ${cell.angle}/${cell.speed}/${Number(cell.cut)} side=${side} seed=${seed} ${observed.result.ending}`);
    } catch (error) {
      if (!retainFailures) throw error;
      rows.push({ o, d, cell, side, seed, collectorFailure: String(error), observerNeutral: false });
      console.error(`${o}/${d} ${cell.angle}/${cell.speed}/${Number(cell.cut)} side=${side} seed=${seed} FAILED: ${String(error)}`);
    }
  }
}
assert(sourceVersion() === source);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ source, protocol: 'native-reach-contact-ledger-v1',
  collector: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  recoveryExperiment: continued ? 'continued-recovery' : null,
  recoverySourcesSha256: continued ? Object.fromEntries(['grip-refinement.ts', 'continued-recovery.ts', 'continued-recovery-world.ts']
    .map(p => [p, createHash('sha256').update(readFileSync(`scripts/diag/tackle/${p}`)).digest('hex')])) : null,
  substeps: substeps ?? 'adaptive', selectedSeed, selected, rosters, retainFailures,
  flags: Object.fromEntries(['TACKLE_TOUCH', 'REACH_CONTACT', 'LEG_BRACE', 'TACKLE_ROLL', 'WRAP_BIND', 'GAIT_STEP'].map(k => [k, process.env[k] ?? '0'])),
  noBrace, fresh, extraFresh, newFresh, patch, rows }));
console.log(out, rows.filter(r => r.observerNeutral).length, 'observer-neutral plays;',
  rows.filter(r => !r.observerNeutral).length, 'collector failures');
if (rows.some(r => !r.observerNeutral)) process.exitCode = 1;
