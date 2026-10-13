/** Trace and causal probes for the reach -> pile transition. Default controller
 * and physical capacities are not edited by this collector. Probe modes use
 * matched control tapes, deliberately unavailable to a real player.
 * REACH_CONTACT=1 LEG_BRACE=1 TACKLE_ROLL=1 WRAP_BIND=1 node --import tsx
 * scripts/diag/physics/reach-transition.ts MODE OUTPUT [--fresh] [--full]
 * MODE: current, prefix-movement, no-launch, prefix-grip, strike-movement, tight-depth.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { clamp } from '../../../src/core/vec.js';
import { generateTeam } from '../../../src/league/team.js';
import { supportParams } from '../../../src/physics/support.js';
import { World, type GraspJoint } from '../../../src/physics/world.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { gatheringApproach, leverage } from '../../../src/sim/behaviors/common.js';
import { CELLS, rep, type Cell } from '../tackle/panel.js';
import { sourceVersion } from '../../source-version.js';

const mode = process.argv[2] ?? 'current', out = process.argv[3] ?? 'out/reach-transition/current.json';
assert(['current', 'prefix-movement', 'no-launch', 'prefix-grip', 'strike-movement', 'tight-depth'].includes(mode));
const fresh = process.argv.includes('--fresh'), full = process.argv.includes('--full');
const source = sourceVersion(), hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const controlPath = fresh ? 'out/reach-contact/fresh-finish.json' : 'out/reach-closure/finish.json';
const controlBytes = readFileSync(controlPath), controls = JSON.parse(controlBytes.toString());
const rearLoss = process.argv.includes('--rear-loss');
const selected = rearLoss ? [[180, 3, false]] : [[0, 3, false], [135, 6, false], [90, 6, false], [45, 6, false], [45, 6, true]];
const cells = full ? CELLS : selected.map(([a, s, cut]) => CELLS.find(c => c.angle === a && c.speed === s && c.cut === cut)!);
function execute(cell: Cell, side: 1 | -1, seed: number, teams: Parameters<typeof rep>[4], control: any, observe: boolean) {
  const tick = PlaySim.prototype.tick, step = World.prototype.step, see = PlaySim.prototype.see;
  let sim: PlaySim | undefined, tickBefore: any, initial: string | undefined, profiles: string | undefined;
  let reading = false, approachRead: any, depthChanged = false;
  const frames: any[] = [], interventions: any[] = [];
  const snapshot = () => {
    const c = sim!.slot('RB')!, d = sim!.defense.find(a => a.slot.startsWith('LB'))!;
    const body = (a: typeof c) => structuredClone(a.body);
    const bond = sim!.bond, joint = bond?.holds?.get(d);
    return { c: body(c), d: body(d), grip: bond?.grip?.get(d), execution: bond?.execution?.get(d),
      joint: joint ? (() => { const { a, b, ...j } = joint; return structuredClone(j); })() : null };
  };
  PlaySim.prototype.tick = function () {
    sim = this; reading = false; approachRead = undefined;
    if (observe) tickBefore = snapshot();
    const behavior = this.defense.find(d => d.slot.startsWith('LB'))!.behavior;
    const update = behavior.update;
    behavior.update = function (a, world) {
      reading = true;
      try { return update.call(this, a, world); } finally { reading = false; }
    };
    try { return tick.call(this); } finally { reading = false; behavior.update = update; }
  };
  PlaySim.prototype.see = function (a, target, delay = 1) {
    const seen = see.call(this, a, target, delay);
    if (observe && reading && !approachRead && this === sim && target === this.slot('RB')
      && a === this.defense.find(d => d.slot.startsWith('LB'))) {
      // Consume only the already returned picture. These pure steering helpers
      // neither observe again nor forecast a free body through its constraint.
      const contact = a.profile.radius + target.profile.radius + a.profile.reach * .65;
      const dist = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
      const force = a.runFit?.kind === 'force' || (a.runFit?.kind === 'edge' && a.runFit.edge === 'box');
      const offset = (force ? Math.abs(leverage(a, seen.pos.y)) * a.runFit!.side : leverage(a, seen.pos.y))
        * clamp((dist - contact) / 6, 0, 1);
      approachRead = structuredClone({ seen, delay, contact, offset,
        held: this.bond?.tacklers.includes(a) ?? false, ...gatheringApproach(a, seen, contact, offset) });
    }
    return seen;
  };
  World.prototype.step = function (intents, dt) {
    if (sim?.world !== this) return step.call(this, intents, dt);
    reading = false;
    const commands = sim.intents;
    assert(intents === commands); // Mutate the fixture's controller-owned array.
    const c = sim.slot('RB')!, d = sim.defense.find(a => a.slot.startsWith('LB'))!;
    initial ??= hash([c.body, d.body]); profiles ??= hash([c.profile, d.profile]);
    const born = this.joints.some(j => j.kind === 'grasp' && j.b === c.body && j.brace !== undefined);
    for (const joint of this.joints) if (joint.kind === 'grasp' && joint.brace !== undefined) {
      delete joint.brace; joint.pull = 1.2 + 1.2 * d.r('tackling');
    }
    const current = sim.bond?.holds?.get(d);
    const recorded = control.frames.find((f: any) => Math.abs(f.t - this.time) < 1e-8);
    if (current && mode === 'tight-depth' && !depthChanged
      && Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y) <= c.profile.radius + d.profile.radius + .15) {
      const depth = control.frames.find((f: any) => f.acquired.length)?.acquired[0].legs;
      assert(depth !== undefined);
      interventions.push({ t: this.time, kind: 'recorded control depth at first tight wrap',
        before: current.legs, after: depth });
      current.legs = depth; depthChanged = true;
      // Deliberately no free strength, changed capacity or imposed fall. The
      // next native controller update derives coupling from this depth normally.
      // This substitutes an unearned re-grab solely to diagnose the mechanism.
    }
    if (current && mode === 'prefix-movement' && this.time < (control.result.firstGrip?.t ?? -Infinity) && recorded) {
      const actual = commands[d.idx], command = recorded.requests[1];
      commands[d.idx] = { ...structuredClone(command), dive: actual.dive, lunge: actual.lunge };
      interventions.push({ t: this.time, kind: 'recorded pre-grip movement' });
    }
    if (current && mode === 'strike-movement' && (commands[d.idx].lunge || d.body.support?.strike)
      && c.body.support?.state === 'up' && d.body.support?.state === 'up'
      && Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y) > c.profile.radius + d.profile.radius + .15) {
      const cached = Reflect.get(sim, 'cmds')[d.idx];
      commands[d.idx] = { ...commands[d.idx], vel: { ...cached.vel }, cutSkill: cached.cutSkill, effort: cached.effort };
      interventions.push({ t: this.time, kind: 'retain actual cached footwork during committed strike' });
    }
    if (born && mode === 'no-launch') {
      delete commands[d.idx].lunge;
      interventions.push({ t: this.time, kind: 'remove initial reach strike request' });
    }
    if (current && mode === 'prefix-grip' && recorded?.acquired.length) {
      const capacity = recorded.acquired[0].capacity;
      current.capacity = capacity;
      const scale = supportParams(d.profile).armForce * (.6 + .6 * d.r('tackling'));
      sim.bond!.grip!.set(d, Math.sqrt(Math.max(0, (capacity / scale - .3) / 2.5)));
      interventions.push({ t: this.time, kind: 'recorded attained grip strength', capacity });
    }
    const before = observe ? snapshot() : undefined, t = this.time;
    const requests = observe ? structuredClone([intents[c.idx], intents[d.idx]]) : undefined;
    const behavior = observe ? structuredClone(Reflect.get(sim, 'cmds')[d.idx]) : undefined;
    const r = step.call(this, intents, dt);
    if (observe) {
      assert(Math.abs(r.work.residual) < 1e-8 && r.passiveGraspWork <= 1e-8);
      for (const i of [c.idx, d.idx]) {
        assert(r.armImpulse[i] <= r.armImpulseLimit[i] + 1e-8);
        assert(r.armWork[i] <= r.armWorkLimit[i] + 1e-8);
        assert(r.supportMotorWork[i] <= r.supportMotorWorkLimit[i] + 1e-8);
      }
      frames.push({ t, dt, after: this.time, tickBefore, before, end: snapshot(), requests, behavior, approachRead,
        bodyImpulse: r.contacts.filter(h => h.i === c.idx && h.j === d.idx || h.i === d.idx && h.j === c.idx).reduce((s, h) => s + h.impulse, 0),
        positiveGrasp: this.joints.some(j => j.kind === 'grasp' && j.b === c.body && (j.force ?? 0) > 0),
        workResidual: r.work.residual });
    }
    return r;
  };
  try {
    const result = rep(cell, side, seed, {}, teams);
    assert(sim);
    const endpoint = hash({ result, bodies: sim.agents.map(a => a.body), intents: sim.intents,
      minds: sim.agents.map(a => a.mind), rng: sim.rng, events: sim.events });
    return { result, initial, profiles, endpoint, frames, interventions };
  } finally { PlaySim.prototype.tick = tick; World.prototype.step = step; PlaySim.prototype.see = see; }
}
const rows = [];
for (const [o, d] of fresh ? [[71, 72], [81, 82]] : [[61, 62]]) {
  const teams = fresh ? { offense: generateTeam(new Rng(o), 'Fresh O', 'FO', { strength: .55 }),
    defense: generateTeam(new Rng(d), 'Fresh D', 'FD', { strength: .55 }) } : undefined;
  for (const cell of cells) for (const side of [1, -1] as const) for (const seed of fresh ? [4001] : full ? [3000, 3001, 3002] : rearLoss ? [3002] : [3001]) {
    const control = controls.rows.find((r: any) => r.o === o && r.d === d && r.result.angle === cell.angle
      && r.result.speed === cell.speed && r.result.cut === cell.cut && r.result.side === side && r.result.seed === seed);
    assert(control);
    const observed = execute(cell, side, seed, teams, control, true), plain = execute(cell, side, seed, teams, control, false);
    assert(observed.endpoint === plain.endpoint && observed.initial === control.initial && observed.profiles === control.profiles);
    rows.push({ o, d, ...observed, observerNeutral: true });
  }
}
assert(sourceVersion() === source);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ source, mode, fresh, full, controlPath,
  flags: Object.fromEntries(['TACKLE_TOUCH', 'REACH_CONTACT', 'LEG_BRACE', 'TACKLE_ROLL', 'WRAP_BIND'].map(k => [k, process.env[k] ?? '0'])),
  controlSha256: createHash('sha256').update(controlBytes).digest('hex'),
  collectorSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'), rows }));
console.log(out, rows.length, 'observer-neutral reps');
