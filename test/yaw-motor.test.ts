import { describe, expect, it } from 'vitest';
import { turnBodyResponse, YAW_RESPONSE } from '../src/physics/actuation.js';
import type { Body } from '../src/physics/kinematics.js';
import { baseRadiusAt, newSupport, supportParams } from '../src/physics/support.js';
import { World, type Intent, type StepReport } from '../src/physics/world.js';

function body(x = 0): Body {
  return { pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing: .001, spin: -.2,
    energy: 1, support: newSupport(), profile: { massKg: 100, radius: .3,
      reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3, brake: 6, lateral: 6,
      turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3,
      reactReach: 2.6, reactionTime: .25, power: 100, balance: .5 } };
}

describe('attained fixed-response ground yaw', () => {
  it.each([-1, 1])('follows the independent near-target critical solution, side %s', side => {
    const a = body(), h = .05 / 12, tau = YAW_RESPONSE;
    a.facing *= side; a.spin! *= side;
    const e = -a.facing, w = a.spin!, B = e / tau - w, decay = Math.exp(-h / tau);
    const expectedError = (e + B * h) * decay;
    const expectedSpin = (w + B * h / tau) * decay;
    const r = turnBodyResponse(a, 0, h, 8, 1, 0), I = supportParams(a.profile).yawInertia;
    expect(a.spin).toBeCloseTo(expectedSpin, 12);
    expect(a.facing).toBeCloseTo(-expectedError, 12);
    expect(r.impulse).toBeCloseTo(I * (expectedSpin - w), 12);
    expect(r.work).toBeCloseTo(.5 * I * (expectedSpin ** 2 - w ** 2), 12);
    expect(r.work).toBeLessThan(0); // Brakes the already rotating body.
    expect(r.peakTorque).toBeCloseTo(I * Math.abs(e / tau ** 2 - 2 * w / tau), 12);
  });

  it('keeps externally acquired overspeed and shares traction with linear force', () => {
    const a = body(), sp = supportParams(a.profile), radius = baseRadiusAt(sp, a.support!.posture), h = .001;
    a.spin = 10;
    const force = .8 * sp.traction, before = a.spin;
    const r = turnBodyResponse(a, a.facing, h, 8, 1, force);
    expect(a.spin).toBeGreaterThan(8); // A motor rate limit cannot erase a hit's spin.
    expect(a.spin).toBeLessThan(before);
    expect(Math.hypot(force, r.peakTorque / radius)).toBeLessThanOrEqual(sp.traction + 1e-9);
    expect(Math.abs(r.impulse)).toBeLessThanOrEqual(r.peakTorque * h + 1e-9);
    expect(r.work).toBeLessThan(0);
  });

  it('turns on the grip the feet actually have, sharing it with the linear force', () => {
    const sp = supportParams(body().profile), radius = baseRadiusAt(sp, body().support!.posture), h = .01;
    const turn = (limit?: number) => {
      const a = body();
      a.facing = 1.5; a.spin = 0; // A big turn request, at the acceleration limit.
      return { r: turnBodyResponse(a, 0, h, 8, 1, .5 * sp.traction, limit), spin: a.spin! };
    };
    const standing = turn(), same = turn(sp.traction);
    expect(same).toStrictEqual(standing); // Standing grip passed explicitly changes nothing.
    const lifted = turn(.6 * sp.traction), pressed = turn(1.3 * sp.traction);
    expect(lifted.r.peakTorque).toBeLessThan(standing.r.peakTorque);
    expect(Math.abs(lifted.spin)).toBeLessThan(Math.abs(standing.spin));
    expect(pressed.r.peakTorque).toBeGreaterThanOrEqual(standing.r.peakTorque);
    for (const [limit, t] of [[.6, lifted], [1, standing], [1.3, pressed]] as const)
      expect(Math.hypot(.5 * sp.traction, t.r.peakTorque / radius)).toBeLessThanOrEqual(limit * sp.traction + 1e-9);
    // No grip left after the linear force: no turning torque at all.
    expect(turn(.5 * sp.traction).r.peakTorque).toBe(0);
  });

  it.each([-1, 1])('the same physical cue produces the same response at either tick phase, side %s', side => {
    const run = (late: boolean) => {
      const a = body(), anchor = body(3);
      a.facing *= side; a.spin! *= side; anchor.spin = 0;
      const w = new World([a, anchor], { substeps: 12, handContact: 'patch' });
      w.joints.push({ kind: 'hands', a, b: anchor, extension: 3, push: 0, hold: 0, steer: 0 });
      const observed = w as unknown as { feet(i: number, intent: Intent, plan: unknown,
        h: number, remaining: number, report: StepReport): void };
      const feet = observed.feet;
      let first: unknown;
      observed.feet = function (i, intent, plan, h, remaining, report) {
        feet.call(w, i, intent, plan, h, i === 0 && first === undefined ? (late ? h : .05) : remaining, report);
        if (i === 0 && first === undefined) first = { spin: a.spin, facing: a.facing,
          yaw: report.groundYawImpulse[0], work: report.groundYawWork[0], velocity: { ...a.vel } };
      };
      const report = w.step([{ vel: { x: 0, y: 0 }, facing: 0 }, { vel: { x: 0, y: 0 }, free: true }], .05);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-10);
      return first;
    };
    expect(run(true)).toEqual(run(false));
  });
});
