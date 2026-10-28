import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { baseRadiusAt, criticalDeviation, supportParams } from '../src/physics/support.js';
import { createEngagement, passSetDepth, updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';

function rep() {
  const off = generateTeam(new Rng(7), 'O', 'OFF', { strength: 0.6 });
  const def = generateTeam(new Rng(19), 'D', 'DEF', { strength: 0.6 });
  const sim = new PlaySim({ offense: pickOffense(off, '11'), defense: pickDefense(def, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 3 });
  const b = sim.slot('RT')!, d = sim.slot('DE_S')!;
  sim.qb.body.pos = { x: 30, y: 26 };
  b.body.pos = { x: 34, y: 26 };
  d.body.pos = { x: 34 + b.profile.radius + d.profile.radius, y: 26 };
  b.body.vel = d.body.vel = { x: 0, y: 0 };
  // Everyone else stands aside; contact physics runs in the world each tick.
  for (const a of sim.agents) {
    if (a === b || a === d) continue;
    if (a !== sim.qb) { a.body.pos = { x: 5 + a.idx * 0.1, y: 1 + a.idx * 2 }; a.downUntil = 99; }
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: 0 }) } as never;
  }
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  return { sim, b, d };
}

describe('pass contact momentum and anchor', () => {
  it('carries incoming rush momentum after hands land, including lateral motion', () => {
    const { sim, b, d } = rep();
    b.body.vel = { x: -1, y: 0 }; d.body.vel = { x: -4, y: 3 };
    const e = createEngagement(sim, b, d, 'pass', null)!;
    e.nextMoveAt = Infinity;
    const mb = b.profile.massKg, md = d.profile.massKg;
    const centerY = (b.pos.y * mb + d.pos.y * md) / (mb + md);
    const py = b.vel.y * mb + d.vel.y * md;
    sim.tick();
    const afterY = (b.pos.y * mb + d.pos.y * md) / (mb + md);
    expect(afterY - centerY).toBeGreaterThan(0.03);
    expect(d.speed).toBeGreaterThan(1);
    // The pair's momentum changes only through its feet on the ground.
    const g = sim.lastStep!.groundImpulse;
    expect(b.vel.y * mb + d.vel.y * md - py).toBeCloseTo(g[b.idx].y + g[d.idx].y, 6);
  });

  it('a planted strong anchor holds while a clear drive advantage displaces it', () => {
    const run = (drive: number) => {
      const { sim, b, d } = rep();
      // Establish the launch-relative set first: a blocker still kick-sliding
      // into his set intentionally yields even against a weaker rush.
      b.body.pos.x = sim.los - passSetDepth(sim, b);
      d.body.pos.x = b.pos.x + b.profile.radius + d.profile.radius;
      // Give this fixture an actual leg-force advantage when drive is high.
      // Doubling the end's power alone caps him at turf traction, still below
      // this heavier tackle's push capacity; that is not a clear advantage.
      b.profile.power *= 0.4;
      d.profile.power *= drive;
      const e = createEngagement(sim, b, d, 'pass', null)!;
      e.nextMoveAt = Infinity; e.move = 'bull'; e.phi = 0; e.control = 0;
      const start = b.pos.x;
      for (let i = 0; i < 20 && b.engagement; i++) sim.tick();
      return start - b.pos.x;
    };
    // Re-recorded for the gait start law (#336): legs start at full force
    // whatever speed is wanted, so the weak end's bull request now drives with
    // his whole start force. Cutting `power` reaches his brace, not his gait
    // (the sprint curve is his measured 10-split and 40). The anchor gives
    // 0.20 yd in 20 ticks (0.05 under the old proportional start).
    const held = run(0.3);
    expect(held).toBeLessThan(0.25);
    // Re-recorded for the leg force-velocity law (PHY-1): the driving end's
    // force falls with his speed (1279 -> 1116 at 1.2 yd/s). A clear drive
    // advantage moves the anchor 0.51 yd, more than twice the held case.
    const driven = run(2);
    expect(driven).toBeGreaterThan(0.3);
    expect(driven).toBeGreaterThan(2 * held);
  });

  it('keeps pass protection during the short follow-through after release', () => {
    const { sim, b, d } = rep();
    const e = createEngagement(sim, b, d, 'pass', null)!;
    sim.throwBall(sim.qb, sim.slot('X')!, { x: 15, y: 0, z: 3 }, { x: 50, y: 26, z: 2 }, 1);
    sim.t = 0.15;
    updateEngagements(sim);
    expect(e.type).toBe('pass'); expect(b.engagement).toBe(e);
    sim.t = 0.4; updateEngagements(sim);
    expect(b.engagement).toBeNull(); expect(d.engagement).toBeNull();
  });

  it('executes the speed approach at initial contact instead of rerolling a bull rush', () => {
    const { sim, b, d } = rep();
    d.behavior = { kind: 'rush', plan: 'speed', update: () => ({ vel: { x: 0, y: 0 } }) } as typeof d.behavior;
    const e = createEngagement(sim, b, d, 'pass', null)!;
    expect(['speed', 'dip']).toContain(e.move);
  });

  it('changes the set with the observed launch point, independent of snap time', () => {
    const { sim, b } = rep();
    const initial = passSetDepth(sim, b);
    sim.t = 3;
    expect(passSetDepth(sim, b)).toBe(initial);
    sim.qb.body.pos.x += 2;
    expect(passSetDepth(sim, b)).toBeCloseTo(initial - 2);
    sim.qb.body.pos.x -= 4;
    expect(passSetDepth(sim, b)).toBeCloseTo(initial + 2);
  });

  it('a lost anchor allows push while contact survives a blocker still in the rush path', () => {
    const { sim, b, d } = rep();
    b.body.pos.x = sim.los - passSetDepth(sim, b);
    d.body.pos.x = b.pos.x + b.profile.radius + d.profile.radius;
    const e = createEngagement(sim, b, d, 'pass', null)!;
    e.phi = 0; e.control = 0; e.move = 'bull'; e.nextMoveAt = Infinity;
    // His base is gone: his capture point is well outside his feet, backward.
    const sp = supportParams(b.profile), sup = b.body.support!;
    const rb = baseRadiusAt(sp, sup.posture), crit = criticalDeviation(sp, sup.posture, 0, 1);
    sup.xi = { x: -(rb + 0.7 * (crit - rb)), y: 0 };
    const start = b.pos.x;
    for (let i = 0; i < 6; i++) sim.tick();
    expect(b.engagement).toBe(e);
    expect(d.engagement).toBe(e);
    expect(b.pos.x).toBeLessThan(start);
    expect(b.pos.x).toBeLessThan(d.pos.x);
  });
});
