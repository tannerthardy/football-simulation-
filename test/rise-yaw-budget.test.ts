import { describe, expect, it } from 'vitest';
import { G } from '../src/core/units.js';
import type { Body } from '../src/physics/kinematics.js';
import { newSupport, supportParams } from '../src/physics/support.js';
import { World, type Intent, type StepReport } from '../src/physics/world.js';

function body(x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, spin: 0, energy: 1,
    support: newSupport(), profile: { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
      vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
      shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
      power: 100, balance: .5, stepSpeed: 3.4, getUp: .9 } };
}

describe('finishing a rise retains yaw until bounded ground torque removes it', () => {
  const cases = [12, 48].flatMap(substeps => [-1, 1].flatMap(side =>
    [0, .2].map(speed => ({ substeps, side, speed }))));
  it.each(cases)('shares the passive ground budget at $substeps steps, spin side $side, speed $speed', ({ substeps, side, speed }) => {
    const a = body(0), b = body(3), bs = [a, b], dt = .05;
    a.spin = side; a.vel.x = speed;
    a.support!.state = 'rising'; a.support!.since = 0;
    const w = new World(bs, { substeps });
    w.time = .91; // This is a legal existing rise crossing getUp=.9.
    // The inactive connection selects the requested island subdivision;
    // it has no hand capacity, no body touch and no external influence.
    w.joints.push({ kind: 'hands', a, b, extension: 3, push: 0, hold: 0, steer: 0 });
    const observed = w as unknown as {
      feet(i: number, intent: Intent, plan: unknown, h: number, remaining: number, report: StepReport): void;
    };
    const feet = observed.feet;
    let first: {
      h: number; beforeSpin: number; afterSpin: number; beforeSpeed: number; afterSpeed: number;
      yawImpulse: number; yawWork: number; groundX: number; groundY: number; groundWork: number;
    } | undefined;
    observed.feet = function (i, intent, plan, h, remaining, report) {
      const beforeSpin = a.spin!, beforeSpeed = a.vel.x;
      const yaw = report.groundYawImpulse[i], work = report.groundYawWork[i];
      const gx = report.groundImpulse[i].x, gy = report.groundImpulse[i].y, gw = report.groundWork[i];
      feet.call(w, i, intent, plan, h, remaining, report);
      if (i === 0 && !first) first = { h, beforeSpin, afterSpin: a.spin!, beforeSpeed, afterSpeed: a.vel.x,
        yawImpulse: report.groundYawImpulse[i] - yaw, yawWork: report.groundYawWork[i] - work,
        groundX: report.groundImpulse[i].x - gx, groundY: report.groundImpulse[i].y - gy,
        groundWork: report.groundWork[i] - gw };
    };
    const report = w.step([{ vel: { x: 0, y: 0 }, facing: 0 }, { vel: { x: 0, y: 0 }, free: true }], dt);
    expect(report.substeps).toBe(substeps);
    expect(report.rises).toEqual([0]);
    expect(a.support!.state).toBe('up');
    expect(report.contacts).toHaveLength(0);
    expect(report.armImpulse).toEqual([0, 0]);
    const f = first!, inertia = supportParams(a.profile).yawInertia;
    expect(f.h).toBeCloseTo(dt / substeps, 12);
    expect(f.beforeSpin).toBe(side);
    expect(f.yawImpulse).toBeCloseTo(inertia * (f.afterSpin - f.beforeSpin), 12);
    expect(f.yawWork).toBeCloseTo(.5 * inertia * (f.afterSpin ** 2 - f.beforeSpin ** 2), 12);
    expect(f.groundWork).toBeCloseTo(.5 * a.profile.massKg * (f.afterSpeed ** 2 - f.beforeSpeed ** 2), 12);
    // Current reduced passive support: Coulomb coefficient .75 and mean
    // circular-footprint yaw lever 2r/3. Translation and yaw share its norm.
    const lever = 2 * a.profile.radius / 3, allowance = .75 * G * a.profile.massKg * f.h;
    const used = Math.hypot(f.groundX, f.groundY, f.yawImpulse / lever);
    expect(used).toBeLessThanOrEqual(allowance + 1e-10);
    expect(Math.abs(f.afterSpin)).toBeGreaterThan(0);
    expect(f.afterSpin * side).toBeGreaterThan(0);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-10);
  });
});
