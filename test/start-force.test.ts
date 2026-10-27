import { describe, expect, it } from 'vitest';
import { driveAccel, gaitLag, locomotionAccel, type Body } from '../src/physics/kinematics.js';
import { requestedSprintTime } from '../src/physics/reach.js';
import { newSupport } from '../src/physics/support.js';
import { World } from '../src/physics/world.js';
import type { PhysicalProfile } from '../src/players/physical.js';

// A guard and a back by their own sprint curves (vmax, tau) and masses.
const guard: PhysicalProfile = { vmax: 7.5, tau: 1.55, brake: 5, lateral: 5, turnRate: 6, backpedal: .52, shuffle: .55,
  massKg: 145, heightYd: 2.13, radius: .4, reach: 1.05, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
  power: 160, balance: .5, bend: .4, stepSpeed: 3, getUp: 1 };
const back: PhysicalProfile = { ...guard, vmax: 9.6, tau: 1.35, massKg: 98, radius: .3, shuffle: .6, backpedal: .55 };
const body = (profile: PhysicalProfile, speed = 0): Body => ({ pos: { x: 40, y: 26 }, vel: { x: speed, y: 0 }, facing: 0,
  energy: 1, profile, support: newSupport() });
const dt = .05;

describe('starting toward a wanted speed (low-speed end of the force-velocity curve)', () => {
  it('pushes with full-start force whatever speed he wants, falling to zero at the wanted speed', () => {
    for (const p of [guard, back]) for (const v of [.4, 1, 2]) {
      const full = locomotionAccel(body(p, v), { vel: { x: p.vmax, y: 0 } }, dt).x;
      expect(full).toBeCloseTo(driveAccel(p, v, p.vmax), 12); // A full request is the sprint curve, unchanged.
      for (const wanted of [2.4, 4, 6].filter(w => w > v)) {
        const a = locomotionAccel(body(p, v), { vel: { x: wanted, y: 0 } }, dt).x;
        expect(a).toBeCloseTo(p.vmax / p.tau * (1 - v / wanted), 12);
        expect(a).toBeLessThanOrEqual(full + 1e-12); // Never above the legs' curve at that speed.
      }
    }
    // At rest a moderate request starts as hard as a full one.
    const rest = (p: PhysicalProfile, w: number) => locomotionAccel(body(p), { vel: { x: w, y: 0 } }, dt).x;
    expect(rest(guard, 2.4)).toBeCloseTo(rest(guard, guard.vmax), 12);
    expect(rest(guard, guard.vmax)).toBeCloseTo(guard.vmax / guard.tau, 12);
  });

  it('comes from each body\'s own curve, not a shared constant', () => {
    const start = (p: PhysicalProfile) => locomotionAccel(body(p), { vel: { x: 2.4, y: 0 } }, dt).x;
    expect(start(guard)).toBeCloseTo(guard.vmax / guard.tau, 12);
    expect(start(back)).toBeCloseTo(back.vmax / back.tau, 12);
    expect(gaitLag(guard, 2.4)).toBeCloseTo(guard.tau * 2.4 / guard.vmax, 12);
    expect(gaitLag(guard)).toBe(guard.tau);
  });

  it('a lone guard reaches and holds a moderate wanted speed, as the estimator forecasts', () => {
    const b = body(guard), world = new World([b]), wanted = 2.4, target = 3;
    let arrival: number | null = null, peak = 0;
    for (let k = 1; k <= 60; k++) {
      world.step([{ vel: { x: wanted, y: 0 } }], dt);
      peak = Math.max(peak, b.vel.x);
      if (arrival === null && b.pos.x - 40 >= target) arrival = k * dt;
    }
    expect(peak).toBeLessThanOrEqual(wanted + 1e-9); // Levels off; no overshoot.
    expect(b.vel.x).toBeGreaterThan(wanted - .05);
    const forecast = requestedSprintTime(target, 0, wanted, guard.vmax, guard.tau, gaitLag(guard), guard.brake);
    expect(Math.abs(arrival! - forecast)).toBeLessThan(.1); // Two control intervals.
    // The old proportional law (wanted / tau at rest) took about twice as long.
    expect(forecast).toBeLessThan(requestedSprintTime(target, 0, wanted, wanted, guard.tau, guard.tau, guard.brake) - .5);
  });
});
