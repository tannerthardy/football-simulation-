import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { advanceGrasps, contactGroup, coupleGroupMotion, type GraspLink } from '../src/physics/contact.js';
import type { Body } from '../src/physics/kinematics.js';
import { resolveBodyContacts } from '../src/sim/collisions.js';
import { PlaySim } from '../src/sim/playsim.js';
import { tryTackles, updateBond } from '../src/sim/tackle.js';

function body(mass: number, x: number, y: number, vx: number, vy: number): Body {
  return { pos: { x, y }, vel: { x: vx, y: vy }, facing: 0, energy: 1,
    profile: { massKg: mass, radius: 0.3, reach: 1, heightYd: 2, vmax: 10, tau: 1,
      brake: 10, lateral: 10, turnRate: 8, backpedal: 0.5, shuffle: 0.5,
      maxCatchHeight: 3, reactReach: 2.5, reactionTime: 0.2, power: 100 } };
}
function measure(bodies: Body[]) {
  const mass = bodies.reduce((s, b) => s + b.profile.massKg, 0);
  return { px: bodies.reduce((s, b) => s + b.profile.massKg * b.vel.x, 0),
    py: bodies.reduce((s, b) => s + b.profile.massKg * b.vel.y, 0),
    energy: bodies.reduce((s, b) => s + 0.5 * b.profile.massKg * (b.vel.x ** 2 + b.vel.y ** 2), 0),
    x: bodies.reduce((s, b) => s + b.profile.massKg * b.pos.x, 0) / mass,
    y: bodies.reduce((s, b) => s + b.profile.massKg * b.pos.y, 0) / mass, mass };
}
const link = (a: Body, b: Body, extra: Partial<GraspLink> = {}): GraspLink =>
  ({ a, b, maxDistance: 3, forceCapacity: 500, dampingRate: 5, locked: false, ...extra });
const passive = (before: ReturnType<typeof measure>, after: ReturnType<typeof measure>, dt: number) => {
  expect(after.px).toBeCloseTo(before.px, 8); expect(after.py).toBeCloseTo(before.py, 8);
  expect(after.energy).toBeLessThanOrEqual(before.energy + 1e-8);
  expect(after.x).toBeCloseTo(before.x + before.px / before.mass * dt, 8);
  expect(after.y).toBeCloseTo(before.y + before.py / before.mass * dt, 8);
};

describe('passive grasp graph', () => {
  it('shares a bounded impulse between unequal groups while preserving internal motion', () => {
    const a = body(90, 0, 0, 6, 2), helper = body(120, 0, 1, 4, 1), b = body(80, 1, 0, 0, -3);
    const before = measure([a, helper, b]), relative = { x: a.vel.x - helper.vel.x, y: a.vel.y - helper.vel.y };
    const old = { ...b.vel };
    expect(coupleGroupMotion(contactGroup([a, helper]), contactGroup([b]), 1, 3)).toBeCloseTo(3, 8);
    const after = measure([a, helper, b]);
    expect(after.px).toBeCloseTo(before.px, 8); expect(after.py).toBeCloseTo(before.py, 8);
    expect(after.energy).toBeLessThan(before.energy);
    expect(Math.hypot(b.vel.x - old.x, b.vel.y - old.y) * 80).toBeCloseTo(3, 8);
    expect(a.vel.x - helper.vel.x).toBeCloseTo(relative.x, 8);
    expect(a.vel.y - helper.vel.y).toBeCloseTo(relative.y, 8);
  });
  it('preserves common motion and dissipates energy without instantly locking a weak contact', () => {
    const a = body(90, 0, 0, 6, 1), b = body(120, 0, 1.2, 0, -1), bodies = [a, b];
    const before = measure(bodies), grasp = link(a, b);
    expect(advanceGrasps(bodies, [grasp], 0.05).size).toBe(0);
    passive(before, measure(bodies), 0.05);
    expect(Math.hypot(a.vel.x - b.vel.x, a.vel.y - b.vel.y)).toBeGreaterThan(1);
    expect(Math.hypot(a.vel.x - 6, a.vel.y - 1) * 90).toBeLessThanOrEqual(500 * 0.05 + 1e-8);
  });
  it('does not reel a resting pair together or add energy to tighten its geometry', () => {
    const a = body(90, 0, 0, 0, 0), b = body(100, 0, 1.2, 0, 0), before = measure([a, b]);
    advanceGrasps([a, b], [link(a, b, { locked: true })], 0.05);
    passive(before, measure([a, b]), 0.05);
    expect(a.pos).toEqual({ x: 0, y: 0 }); expect(b.pos).toEqual({ x: 0, y: 1.2 });
  });
  it('holds reachable separating contact through passive tension without adding energy', () => {
    const a = body(90, 0, 0, -2, 0), b = body(120, 0, 1, 2, 3), before = measure([a, b]);
    const grasp = link(a, b, { maxDistance: 1, forceCapacity: 1e6, dampingRate: 0 });
    expect(advanceGrasps([a, b], [grasp], 0.05).size).toBe(0);
    passive(before, measure([a, b]), 0.05);
    expect(Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)).toBeLessThanOrEqual(1 + 1e-6);
  });
  it('slips when the required reach load exceeds capacity, transmitting only bounded impulse', () => {
    const a = body(90, 0, 0, -2, 0), b = body(120, 0, 1, 2, 3), before = measure([a, b]);
    const old = { ...a.vel }, grasp = link(a, b, { maxDistance: 1, forceCapacity: 1, dampingRate: 0 });
    expect(advanceGrasps([a, b], [grasp], 0.05).has(grasp)).toBe(true);
    passive(before, measure([a, b]), 0.05);
    expect(Math.hypot(a.vel.x - old.x, a.vel.y - old.y) * 90).toBeLessThanOrEqual(1 * 0.05 + 1e-8);
    expect(Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)).toBeGreaterThan(1);
  });
  it('releases already overextended contact without creating pull-in motion', () => {
    const a = body(90, 0, 0, 0, 0), b = body(100, 0, 2, 0, 0), grasp = link(a, b, { maxDistance: 1 });
    expect(advanceGrasps([a, b], [grasp], 0.05).has(grasp)).toBe(true);
    expect(a.vel).toEqual({ x: 0, y: 0 }); expect(b.pos).toEqual({ x: 0, y: 2 });
  });
  it('preserves momentum and center through several simultaneous unequal contacts', () => {
    const a = body(90, 0, 0, 6, 1), bodies = [a, body(120, 0, 1, 0, -1), body(80, -1, 0, 2, 3), body(100, 0, -1, -1, 0)];
    const before = measure(bodies);
    advanceGrasps(bodies, bodies.slice(1).map(b => link(a, b)), 0.05);
    passive(before, measure(bodies), 0.05);
  });
  it('converges toward analytical isolated damping when the physics step is refined', () => {
    const run = (dt: number) => {
      const a = body(90, 0, 0, 6, 0), b = body(120, 1, 0, 0, 0), grasp = link(a, b, { dampingRate: 3, forceCapacity: 1e6 });
      for (let i = 0; i < Math.round(0.1 / dt); i++) advanceGrasps([a, b], [grasp], dt);
      const analytic = 1 - 6 * (1 - Math.exp(-3 * 0.1)) / 3;
      return { error: Math.abs(b.pos.x - a.pos.x - analytic), relative: b.vel.x - a.vel.x };
    };
    const coarse = run(0.05), medium = run(0.025), fine = run(0.01);
    expect(fine.error).toBeLessThan(medium.error); expect(medium.error).toBeLessThan(coarse.error);
    expect(coarse.relative).toBeCloseTo(-6 * Math.exp(-0.3), 8);
    expect(fine.relative).toBeCloseTo(coarse.relative, 8);
  });
  it('rotates contact, velocities and impulse limits consistently in a neutral world frame', () => {
    const run = (angle: number) => {
      const rotate = (x: number, y: number) => ({ x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) });
      const a = body(90, 0, 0, 6, 1), b = body(120, 0, 1, -1, 2);
      for (const q of [a, b]) { q.pos = rotate(q.pos.x, q.pos.y); q.vel = rotate(q.vel.x, q.vel.y); }
      advanceGrasps([a, b], [link(a, b)], 0.05);
      const unrotate = (x: number, y: number) => ({ x: x * Math.cos(angle) + y * Math.sin(angle), y: -x * Math.sin(angle) + y * Math.cos(angle) });
      return [a, b].map(q => ({ pos: unrotate(q.pos.x, q.pos.y), vel: unrotate(q.vel.x, q.vel.y) }));
    };
    // Rotate back explicitly, rather than comparing field-specific slots.
    const base = run(0), rotated = run(Math.PI / 3);
    for (let i = 0; i < 2; i++) {
      expect(rotated[i].pos.x).toBeCloseTo(base[i].pos.x, 8);
      expect(rotated[i].pos.y).toBeCloseTo(base[i].pos.y, 8);
      expect(rotated[i].vel.x).toBeCloseTo(base[i].vel.x, 8);
      expect(rotated[i].vel.y).toBeCloseTo(base[i].vel.y, 8);
    }
  });
});

function fixture(seed = 7, experimentalGrasps = true) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(seed), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(seed + 12), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'grasp test' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'grasp test' },
    los: 40, ballY: 26, firstDownX: 50, seed, experimentalGrasps });
  for (const a of sim.agents) { a.body.pos = { x: 5, y: a.idx * 2 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; }
  sim.rng.chance = () => false;
  const c = sim.slot('Z')!, d = sim.slot('FS')!;
  c.downUntil = d.downUntil = -1; sim.t = 2; sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  c.body.pos = { x: 50, y: 26 }; d.body.pos = { x: 50, y: 27.4 };
  c.body.vel = { x: 6, y: 1 }; tryTackles(sim);
  expect(sim.bond).not.toBeNull();
  return { sim, c, d, commands: sim.agents.map(a => ({ vel: a === c ? { x: 6, y: 0 } : { x: 0, y: 0 } })) };
}
describe('grasp integration', () => {
  it.each([7, 19, 31, 43])('the default coupled pile conserves passive momentum and advances its center consistently, seed %i', seed => {
    const { sim, c, d, commands } = fixture(seed, false);
    c.profile.power = d.profile.power = 0;
    const before = measure([c.body, d.body]);
    updateBond(sim, sim.bond!, commands);
    passive(before, measure([c.body, d.body]), sim.dt);
    expect(c.vel).toEqual(d.vel);
  });
  it.each([7, 19, 31, 43])('keeps a weak grasp passive through its next update with foot capacity disabled, seed %i', seed => {
    const { sim, c, d, commands } = fixture(seed);
    c.profile.power = d.profile.power = 0;
    const before = measure([c.body, d.body]), old = [c, d].map(a => ({ ...a.pos }));
    updateBond(sim, sim.bond!, commands);
    passive(before, measure([c.body, d.body]), sim.dt);
    expect(c.vel.x).not.toBeCloseTo(d.vel.x, 3);
    for (const [i, a] of [c, d].entries()) {
      expect(Math.hypot(a.pos.x - old[i].x, a.pos.y - old[i].y)).toBeLessThan(6.5 * sim.dt);
    }
  });
  it.each([false, true])('accounts for ground impulse/work independently of passive contact, experimental=%s', experimental => {
    const { sim, c, d, commands } = fixture(7, experimental), before = measure([c.body, d.body]);
    const bond = sim.bond!; updateBond(sim, bond, commands);
    const after = measure([c.body, d.body]), physics = bond.physics!;
    expect(after.px - before.px).toBeCloseTo(physics.externalImpulse.x, 8);
    expect(after.py - before.py).toBeCloseTo(physics.externalImpulse.y, 8);
    expect(after.energy).toBeLessThanOrEqual(before.energy + physics.groundWork + 1e-8);
    expect(Math.abs(physics.externalImpulse.x) + Math.abs(physics.externalImpulse.y)).toBeGreaterThan(0);
  });
  it('works matching feet into closer contact and improves the grasp through geometry', () => {
    const { sim, c, d, commands } = fixture();
    c.body.vel = d.body.vel = { x: 3, y: 0 };
    d.body.pos = { x: c.pos.x, y: c.pos.y + 1.2 };
    sim.bond!.grip!.set(d, 0.4);
    const before = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
    for (let i = 0; i < 6; i++) {
      expect(sim.bond).not.toBeNull(); updateBond(sim, sim.bond!, commands); sim.t += sim.dt;
    }
    expect(Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y)).toBeLessThan(before);
    expect(sim.bond!.grip!.get(d)!).toBeGreaterThan(0.4);
  });
  it('does not age an extended unsupported hand contact into a wrap', () => {
    const { sim, c, d, commands } = fixture(); c.profile.power = d.profile.power = 0;
    for (let i = 0; i < 3 && sim.bond; i++) {
      updateBond(sim, sim.bond, commands); sim.t += sim.dt;
      if (sim.bond) expect(sim.bond.grip!.get(d)!).toBeLessThan(0.6);
    }
    expect(sim.bond).not.toBeNull();
    d.body.pos = { x: c.pos.x, y: c.pos.y + c.profile.radius + d.profile.radius + d.profile.reach + 0.1 };
    updateBond(sim, sim.bond!, commands);
    expect(sim.bond).toBeNull(); expect(sim.stats.brokenTackles).toBe(1);
    expect(d.downUntil).toBeLessThan(sim.t);
  });
  it('an outside bump on a weak grasp does not treat the tackler as rigidly welded to the carrier', () => {
    const { sim, c, d } = fixture(), other = sim.slot('SS')!;
    other.body.pos = { x: c.pos.x, y: c.pos.y - 0.4 }; other.body.vel = { x: 0, y: 6 };
    const before = { pos: { ...d.pos }, vel: { ...d.vel } };
    resolveBodyContacts(sim);
    expect(d.pos).toEqual(before.pos); expect(d.vel).toEqual(before.vel);
    expect(c.pos.y).toBeGreaterThan(26);
  });
});
