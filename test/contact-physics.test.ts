import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { advanceContactPair, contactGroup, groupVelocity, resolveGroupContact } from '../src/physics/contact.js';
import type { Body } from '../src/physics/kinematics.js';
import { resolveBodyContacts } from '../src/sim/collisions.js';
import { createEngagement, updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';

function fixture() {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 3 });
  for (const a of sim.agents) {
    a.body.pos = { x: 5, y: a.idx * 2 };
    a.body.vel = { x: 0, y: 0 };
  }
  const b = sim.slot('RT')!, d = sim.slot('DE_S')!, other = sim.slot('RG')!;
  b.body.pos = { x: 34, y: 26 };
  d.body.pos = { x: 34 + b.profile.radius + d.profile.radius, y: 26 };
  sim.qb.body.pos = { x: 30, y: 26 };
  return { sim, b, d, other };
}

function measure(bodies: Body[]) {
  const mass = bodies.reduce((s, b) => s + b.profile.massKg, 0);
  return {
    px: bodies.reduce((s, b) => s + b.profile.massKg * b.vel.x, 0),
    py: bodies.reduce((s, b) => s + b.profile.massKg * b.vel.y, 0),
    x: bodies.reduce((s, b) => s + b.profile.massKg * b.pos.x, 0) / mass,
    y: bodies.reduce((s, b) => s + b.profile.massKg * b.pos.y, 0) / mass,
    energy: bodies.reduce((s, b) => s + 0.5 * b.profile.massKg * (b.vel.x ** 2 + b.vel.y ** 2), 0),
  };
}

describe('shared contact mechanics', () => {
  it('a glancing unequal-mass bump conserves momentum and center, without adding energy', () => {
    const { b, d } = fixture();
    b.body.vel = { x: 7, y: 2 }; d.body.vel = { x: -2, y: -1 };
    const before = measure([b.body, d.body]);
    resolveGroupContact(contactGroup([b.body]), contactGroup([d.body]), { x: 1, y: 0 }, 0.2);
    const after = measure([b.body, d.body]);
    expect(after.px).toBeCloseTo(before.px, 8); expect(after.py).toBeCloseTo(before.py, 8);
    expect(after.x).toBeCloseTo(before.x, 8); expect(after.y).toBeCloseTo(before.y, 8);
    expect(after.energy).toBeLessThan(before.energy);
    expect(b.vel.y).toBe(2); expect(d.vel.y).toBe(-1);
  });

  it('outside contact shifts the full group and preserves its internal motion', () => {
    const { b, d, other } = fixture();
    b.body.vel = { x: 3, y: 2 }; d.body.vel = { x: 1, y: 4 }; other.body.vel = { x: -4, y: -3 };
    const before = measure([b.body, d.body, other.body]);
    const gap = { x: b.pos.x - d.pos.x, y: b.pos.y - d.pos.y };
    const relative = { x: b.vel.x - d.vel.x, y: b.vel.y - d.vel.y };
    resolveGroupContact(contactGroup([b.body, d.body]), contactGroup([other.body]), { x: 0.6, y: 0.8 }, 0.25);
    const after = measure([b.body, d.body, other.body]);
    expect(after.px).toBeCloseTo(before.px, 8); expect(after.py).toBeCloseTo(before.py, 8);
    expect(after.x).toBeCloseTo(before.x, 8); expect(after.y).toBeCloseTo(before.y, 8);
    expect(after.energy).toBeLessThanOrEqual(before.energy);
    expect(b.pos.x - d.pos.x).toBeCloseTo(gap.x, 8); expect(b.pos.y - d.pos.y).toBeCloseTo(gap.y, 8);
    expect(b.vel.x - d.vel.x).toBeCloseTo(relative.x, 8); expect(b.vel.y - d.vel.y).toBeCloseTo(relative.y, 8);
  });

  it('separating overlap is repaired without a second impact', () => {
    const { b, d } = fixture();
    b.body.vel = { x: -3, y: 0 }; d.body.vel = { x: 2, y: 0 };
    resolveGroupContact(contactGroup([b.body]), contactGroup([d.body]), { x: 1, y: 0 }, 0.1);
    expect(b.vel.x).toBe(-3); expect(d.vel.x).toBe(2);
  });

  it('internal repositioning cannot translate a pair or exceed its footwork rate', () => {
    const { b, d } = fixture();
    const before = measure([b.body, d.body]);
    const oldGap = { x: b.pos.x - d.pos.x, y: b.pos.y - d.pos.y };
    advanceContactPair(b.body, d.body, { x: 0, y: 0 }, { x: -0.6, y: 2 }, 2, 0.05);
    const after = measure([b.body, d.body]);
    expect(after.x).toBeCloseTo(before.x, 8); expect(after.y).toBeCloseTo(before.y, 8);
    expect(after.px).toBeCloseTo(0, 8); expect(after.py).toBeCloseTo(0, 8);
    expect(Math.hypot(b.pos.x - d.pos.x - oldGap.x, b.pos.y - d.pos.y - oldGap.y)).toBeCloseTo(0.1, 8);
  });

  it('a coincident pair separates and remains finite', () => {
    const { sim, b, d } = fixture();
    d.body.pos = { ...b.pos };
    resolveBodyContacts(sim);
    expect(Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y)).toBeGreaterThan(0.5);
    for (const a of [b, d]) expect(Number.isFinite(a.pos.x + a.pos.y + a.vel.x + a.vel.y)).toBe(true);
  });

  it('a neighbor bump preserves block geometry and survives the next block solve', () => {
    const { sim, b, d, other } = fixture();
    const e = createEngagement(sim, b, d, 'pass', null)!;
    e.nextMoveAt = Infinity; e.move = 'bull'; e.phi = 0; e.control = 0;
    other.body.pos = { x: b.pos.x, y: b.pos.y + 0.4 }; other.body.vel = { x: 0, y: -8 };
    const gap = { x: b.pos.x - d.pos.x, y: b.pos.y - d.pos.y };
    const before = measure([b.body, d.body, other.body]);
    resolveBodyContacts(sim);
    const after = measure([b.body, d.body, other.body]);
    expect(after.px).toBeCloseTo(before.px, 8); expect(after.py).toBeCloseTo(before.py, 8);
    expect(after.energy).toBeLessThanOrEqual(before.energy);
    expect(b.pos.x - d.pos.x).toBeCloseTo(gap.x, 8); expect(b.pos.y - d.pos.y).toBeCloseTo(gap.y, 8);
    expect(groupVelocity(contactGroup([b.body, d.body])).y).toBeLessThan(-0.5);
    updateEngagements(sim);
    expect(groupVelocity(contactGroup([b.body, d.body])).y).toBeLessThan(-0.5);
  });

  it('a run block changes relative leverage without moving its center in a zero-drive rep', () => {
    const { sim, b, d } = fixture();
    b.profile.power = d.profile.power = 0;
    const e = createEngagement(sim, b, d, 'run', { x: 1, y: 0 })!;
    e.nextMoveAt = Infinity;
    const before = measure([b.body, d.body]);
    updateEngagements(sim);
    const after = measure([b.body, d.body]);
    expect(after.x).toBeCloseTo(before.x, 8); expect(after.y).toBeCloseTo(before.y, 8);
    expect(after.px).toBeCloseTo(0, 8); expect(after.py).toBeCloseTo(0, 8);
    expect(Math.abs(b.pos.y - d.pos.y)).toBeGreaterThan(0.01);
  });

  it('a shifted QB does not redirect normal contact force sideways', () => {
    const { sim, b, d } = fixture();
    sim.qb.body.pos.y += 10;
    b.profile.power = 0; d.profile.power *= 2;
    b.profile.lateral = d.profile.lateral = 0;
    const e = createEngagement(sim, b, d, 'pass', null)!;
    e.nextMoveAt = Infinity; e.move = 'bull'; e.control = 0;
    const before = measure([b.body, d.body]);
    updateEngagements(sim);
    const after = measure([b.body, d.body]);
    expect(after.x).toBeLessThan(before.x);
    expect(after.y).toBeCloseTo(before.y, 8);
  });

  it('an outside bump moves a tackle pile together without tightening the grasp', () => {
    const { sim, b, d, other } = fixture();
    sim.ball = { kind: 'held', carrier: b };
    sim.bond = { carrier: b, tacklers: [d], start: 0, progressX: b.pos.x, down: false };
    other.body.pos = { x: b.pos.x, y: b.pos.y + 0.4 }; other.body.vel = { x: 0, y: -6 };
    const gap = { x: b.pos.x - d.pos.x, y: b.pos.y - d.pos.y };
    const before = measure([b.body, d.body, other.body]);
    resolveBodyContacts(sim);
    const after = measure([b.body, d.body, other.body]);
    expect(b.pos.x - d.pos.x).toBeCloseTo(gap.x, 8); expect(b.pos.y - d.pos.y).toBeCloseTo(gap.y, 8);
    expect(after.px).toBeCloseTo(before.px, 8); expect(after.py).toBeCloseTo(before.py, 8);
    expect(after.energy).toBeLessThanOrEqual(before.energy);
  });

  it('protection intent can steer an outside contact, but yields to an inside counter', () => {
    const run = (intent: boolean, outside: boolean) => {
      const { sim, b, d } = fixture();
      b.body.pos = { x: 34, y: 30 };
      d.body.pos = { x: 34.8, y: outside ? 30.8 : 29.2 };
      sim.qb.body.pos = { x: 30, y: 26 };
      b.profile.power = d.profile.power = 0;
      // Hold the depth goal fixed to isolate lane steering from the tangent
      // component of a backward set.
      b.passSet = { depth: 6, laneY: 32, outside: intent ? 1 : 0 };
      const e = createEngagement(sim, b, d, 'pass', null)!;
      e.nextMoveAt = Infinity; e.move = 'bull'; e.control = 1;
      const before = measure([b.body, d.body]); updateEngagements(sim);
      return measure([b.body, d.body]).y - before.y;
    };
    expect(run(true, true)).toBeGreaterThan(run(false, true));
    expect(run(true, false)).toBeCloseTo(run(false, false), 8);
  });

  it('an engaged protector continues supplying a coached set instead of standing without intent', () => {
    const { sim, b, d } = fixture();
    const e = createEngagement(sim, b, d, 'pass', null)!;
    b.behavior.update(b, sim);
    expect(b.engagement).toBe(e);
    expect(b.passSet?.outside).toBe(-1);
    const expectedLane = sim.offAlign.spots.RT.pos.y - 0.8;
    expect(b.passSet?.laneY).toBeCloseTo(expectedLane, 8);
    b.body.pos.y -= 2;
    b.behavior.update(b, sim);
    expect(b.passSet?.laneY).toBeCloseTo(expectedLane, 8);
  });

  it('a backward set at angled contact supplies the missing tangent component', () => {
    const run = (depth: number) => {
      const { sim, b, d } = fixture();
      b.body.pos = { x: 34, y: 30 }; d.body.pos = { x: 34.8, y: 30.8 };
      sim.qb.body.pos = { x: 30, y: 26 };
      b.profile.power = d.profile.power = 0;
      b.passSet = { depth, laneY: 30, outside: 0 };
      const e = createEngagement(sim, b, d, 'pass', null)!;
      e.nextMoveAt = Infinity; e.move = 'bull'; e.control = 1;
      const before = measure([b.body, d.body]); updateEngagements(sim);
      return measure([b.body, d.body]).y - before.y;
    };
    // At the established depth no set remains. While yielding backward,
    // the tangent counters the inward-facing contact normal. No lane-steer
    // goal or changed opponent power is available to create this difference.
    expect(run(7.2)).toBeGreaterThan(run(6));
  });

  it('mirrored contact and protection goals produce mirrored physical motion', () => {
    const run = (side: number) => {
      const { sim, b, d } = fixture();
      b.body.pos = { x: 34, y: 26 + side * 2 };
      d.body.pos = { x: 34.8, y: 26 + side * 2.8 };
      b.passSet = { depth: 7.2, laneY: 26 + side * 3, outside: side };
      const e = createEngagement(sim, b, d, 'pass', null)!;
      e.nextMoveAt = Infinity; e.move = 'bull'; e.control = 1;
      for (let i = 0; i < 8; i++) { sim.t = i * sim.dt; updateEngagements(sim); }
      return { x: b.pos.x, y: b.pos.y - 26, vx: b.vel.x, vy: b.vel.y };
    };
    const left = run(1), right = run(-1);
    expect(left.x).toBeCloseTo(right.x, 7); expect(left.y).toBeCloseTo(-right.y, 7);
    expect(left.vx).toBeCloseTo(right.vx, 7); expect(left.vy).toBeCloseTo(-right.vy, 7);
  });
});
