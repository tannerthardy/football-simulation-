/** Controlled body-weight response on the accepted World and rep lifecycle.
 * Prescribed requests and fixed hand control isolate execution. These body-size
 * analogues are not complete positional rosters or football win probabilities. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { G, lbToKg } from '../../../src/core/units.js';
import { derivePhysical } from '../../../src/players/physical.js';
import { newSupport, supportParams } from '../../../src/physics/support.js';
import type { Intent } from '../../../src/physics/world.js';
import { syncJoints, updateEngagements } from '../../../src/sim/engagement.js';
import { contactFixture } from '../run-contact-technique.js';
import { sourceVersion } from '../../source-version.js';

const input = 'config/block-mass-response.json';
const cfg = JSON.parse(readFileSync(input, 'utf8'));
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const source = sourceVersion(), began = performance.now();
const output = process.argv[2] ?? 'out/block-mass-response';
mkdirSync(output, { recursive: true });
const template = contactFixture(cfg.fixture).blocker.player;

function profile(weight: number, strength: number, mode = 'linked') {
  const player = structuredClone(template);
  player.measurables.weightLb = cfg.referenceWeightLb;
  player.measurables.bench = cfg.fixedBench;
  player.ratings.strength = strength;
  const p = derivePhysical(player);
  // Common geometry/mobility; changing the complete roster mapping here would
  // confound mass with radius, sprint, recovery speed and selection.
  p.massKg = lbToKg(weight);
  if (mode === 'linked') p.power *= weight / cfg.referenceWeightLb;
  if (mode === 'fixed-ceiling') p.power = lbToKg(cfg.referenceWeightLb) * 1.1;
  return p;
}
const snapshot = (a: any) => ({ pos: { ...a.pos }, vel: { ...a.vel }, spin: a.body.spin ?? 0,
  energy: a.body.energy, state: a.body.support.state, xi: { ...a.body.support.xi } });

function run(scene: any) {
  const f = contactFixture(cfg.fixture), { sim, defender: d } = f;
  const b = scene.profiles === 'roster-te-dt' ? sim.slot('Y')! : f.blocker;
  let e = f.engagement;
  const sign = scene.mirror ? -1 : 1, heading = scene.mirror ? Math.PI : 0;
  if (scene.profiles === 'roster-te-dt') {
    sim.disengage(e);
    b.body.pos = { x: 40, y: 26 };
    d.body.pos = { x: 40 + b.profile.radius + d.profile.radius + .1, y: 26 };
    b.body.facing = 0; d.body.facing = Math.PI;
    e = sim.engage(b, d, 'run', { x: 1, y: 0 })!;
    assert(e);
  } else {
    Object.assign(b.profile, profile(scene.blockerLb, scene.blockerStrength ?? cfg.fixedStrength, scene.mode));
    Object.assign(d.profile, profile(scene.defenderLb, scene.defenderStrength ?? cfg.fixedStrength, scene.mode));
  }
  for (const a of [b, d]) {
    a.body.support = newSupport(.7); a.body.energy = 1;
    a.body.vel = { x: 0, y: 0 }; a.body.spin = 0;
  }
  b.body.facing = heading; d.body.facing = scene.mirror ? 0 : Math.PI;
  e.drive = { x: sign, y: 0 }; e.control = cfg.contactControl; e.nextMoveAt = Infinity;
  syncJoints(sim, e);
  b.body.pos = { x: 40, y: 26 };
  d.body.pos = { x: 40 + sign * e.hands!.extension, y: 26 };
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const world: any = sim.world, ids = [b.idx, d.idx], actors = [b, d];
  world.substeps = scene.substeps;
  let dose: Record<number, { x: number; y: number }> = {};
  let active = false, maximumMomentumResidual = 0, maximumWorkResidual = 0;
  const feet: any[] = [], steps: any[] = [];
  const add = (i: number, x: number, y: number) => {
    if (!ids.includes(i)) return;
    dose[i].x += x; dose[i].y += y;
  };
  const pair = world.pairImpulse;
  world.pairImpulse = function (...args: any[]) {
    const fraction = pair.apply(this, args);
    if (active) {
      add(args[0], -args[2] * fraction, -args[3] * fraction);
      add(args[1], args[2] * fraction, args[3] * fraction);
    }
    return fraction;
  };
  const contact = world.solveContact;
  world.solveContact = function (c: any, ...args: any[]) {
    const n = c.ln, t = c.lt, result = contact.call(this, c, ...args);
    if (active) {
      const dn = c.ln - n, dt = c.lt - t;
      const x = c.nx * dn - c.ny * dt, y = c.ny * dn + c.nx * dt;
      add(c.i, -x, -y); add(c.j, x, y);
    }
    return result;
  };
  const feetMethod = world.feet;
  world.feet = function (i: number, intent: Intent, plan: any, h: number, remaining: number, report: any) {
    if (!active || !ids.includes(i)) return feetMethod.call(this, i, intent, plan, h, remaining, report);
    const old = { ...report.groundImpulse[i] }, body = this.bodies[i];
    const before = { velocity: { ...body.vel }, felt: { ...body.support.felt }, state: body.support.state };
    const result = feetMethod.call(this, i, intent, plan, h, remaining, report);
    const sp = supportParams(body.profile), force = {
      x: (report.groundImpulse[i].x - old.x) / h,
      y: (report.groundImpulse[i].y - old.y) / h,
    };
    const record = { t: sim.t, h, actor: i === b.idx ? 'blocker' : 'defender', before, force,
      requestedGaitForce: { x: plan.ax * this.mass[i], y: plan.ay * this.mass[i] },
      availability: this.alpha[i], pushForce: sp.pushForce, traction: sp.traction,
      reserve: this.recovery[i], lean: { ...body.support.lean } };
    feet.push(record);
    if (before.state === 'up') assert(Math.hypot(force.x, force.y) <= sp.traction + cfg.checks.armBudget);
    return result;
  };
  const initial = actors.map(snapshot), profiles = actors.map(a => structuredClone(a.profile));
  const requests = (): Intent[] => {
    let vx = -3, vy = 0;
    if (scene.request === 'asymmetric') vx = -1.5;
    if (scene.request === 'anchor') vx = 0;
    if (scene.request === 'cross') { vx = -.5; vy = 2.5; }
    const commands: Intent[] = sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    commands[b.idx] = { vel: { x: sign * 3, y: 0 }, facing: heading, posture: scene.blockerPosture ?? .7, push: 1 };
    commands[d.idx] = { vel: { x: sign * vx, y: vy }, facing: scene.mirror ? 0 : Math.PI, posture: scene.defenderPosture ?? .7, push: 1 };
    return commands;
  };
  const inputHash = hash({ scene, profiles, initial, commands: requests(), hands: {
    extension: e.hands!.extension, control: e.control }, source });
  for (let k = 0; k < Math.round(cfg.seconds / cfg.dt); k++) {
    // Retain the real production separation/down/geometry lifetime. The hand
    // fight and movement requests are experimental controls, not rated wins.
    if (b.engagement) {
      e.control = cfg.contactControl;
      updateEngagements(sim, requests());
      if (b.engagement) { e.control = cfg.contactControl; e.holding = false; syncJoints(sim, e); }
    }
    const commands = requests(), before = actors.map(snapshot), offset = feet.length;
    dose = Object.fromEntries(ids.map(i => [i, { x: 0, y: 0 }]));
    active = true;
    const report = world.step(commands, cfg.dt);
    active = false;
    const after = actors.map(snapshot);
    const ledgers = actors.map((a, i) => {
      const ground = report.groundImpulse[a.idx], internal = dose[a.idx], mass = a.profile.massKg;
      const residual = Math.hypot(mass * (after[i].vel.x - before[i].vel.x) - ground.x - internal.x,
        mass * (after[i].vel.y - before[i].vel.y) - ground.y - internal.y);
      maximumMomentumResidual = Math.max(maximumMomentumResidual, residual);
      assert(residual < cfg.checks.momentum);
      assert(report.armImpulse[a.idx] <= report.armImpulseLimit[a.idx] + cfg.checks.armBudget);
      assert(report.armWork[a.idx] <= report.armWorkLimit[a.idx] + cfg.checks.armBudget);
      return { ground, contact: internal, residual, armImpulse: report.armImpulse[a.idx], armWork: report.armWork[a.idx] };
    });
    maximumWorkResidual = Math.max(maximumWorkResidual, Math.abs(report.work.residual));
    assert(Math.abs(report.work.residual) < cfg.checks.work);
    steps.push({ elapsed: (k + 1) * cfg.dt, before, after, commands: ids.map(i => commands[i]),
      engaged: !!b.engagement, ledgers, hand: b.engagement ? {
        control: e.control, normal: e.hands!.normalForce, tangent: e.hands!.tangentForce,
        extension: e.hands!.extension } : null, feet: feet.slice(offset) });
    sim.t += cfg.dt; world.time = sim.t; sim.perception.record(sim.agents);
  }
  const final = actors.map(snapshot);
  return { scene, inputSha256: inputHash, profiles, initial, steps, final,
    summary: { defenderDriven: sign * (final[1].pos.x - initial[1].pos.x),
      blockerAdvance: sign * (final[0].pos.x - initial[0].pos.x),
      defenderLateral: final[1].pos.y - initial[1].pos.y,
      firstRelease: steps.find(s => !s.engaged)?.elapsed ?? null,
      states: final.map(s => s.state), maximumMomentumResidual, maximumWorkResidual,
      bodies: actors.map((a, i) => {
        const sp = supportParams(a.profile), samples = feet.filter(f => f.actor === (i ? 'defender' : 'blocker'));
        return { massKg: a.profile.massKg, power: a.profile.power, pushPerWeight: sp.pushForce / (a.profile.massKg * G),
          armPerWeight: sp.armForce / (a.profile.massKg * G),
          saturatedFraction: samples.filter(s => Math.hypot(s.force.x, s.force.y) >= .98 * s.pushForce).length / samples.length,
          groundImpulse: { x: steps.reduce((s, r) => s + r.ledgers[i].ground.x, 0),
            y: steps.reduce((s, r) => s + r.ledgers[i].ground.y, 0) } };
      }) } };
}
// Reuse the exact #115 mechanical inputs; a named transfer question can select
// existing cases without paying for or silently redefining the whole panel.
const selected = process.argv[3] ? new Set(process.argv[3].split(',')) : null;
if (selected) assert([...selected].every(id => cfg.scenes.some((s: any) => s.id === id)), 'Unknown mechanical input');
const runs = cfg.scenes.filter((s: any) => !selected || selected.has(s.id)).map(run);
const strengthChart = [45, 60, 75, 85, 95].map(strength => {
  const p = profile(300, strength), s = supportParams(p);
  return { strength, bench: cfg.fixedBench, rawStrengthPerWeight: p.power / p.massKg,
    pushPerWeight: s.pushForce / (p.massKg * G), armPerWeight: s.armForce / (p.massKg * G) };
});
const result = { sourceSha256: source, input, inputSha256: sha(input), collectorSha256: sha('scripts/diag/physics/block-mass-response.ts'),
  elapsedSeconds: (performance.now() - began) / 1000, strengthChart, runs };
assert.equal(sourceVersion(), source);
writeFileSync(`${output}/raw.json`, JSON.stringify(result) + '\n');
writeFileSync(`${output}/summary.json`, JSON.stringify({ ...result, runs: runs.map((r: any) => ({
  scene: r.scene, inputSha256: r.inputSha256, profiles: r.profiles, initial: r.initial, final: r.final, summary: r.summary })) }, null, 2) + '\n');
console.log(JSON.stringify({ source, seconds: result.elapsedSeconds, strengthChart,
  runs: runs.map((r: any) => ({ id: r.scene.id, ...r.summary })) }));
