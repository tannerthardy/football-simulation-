import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { World } from '../src/physics/world.js';
import { passiveSlipReference } from '../scripts/diag/physics/passive-slip-reference.js';

function body(massKg: number, x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, spin: 0, energy: 1,
    profile: { massKg, radius: .3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
      brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
      maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: massKg,
      balance: .5, stepSpeed: 3.4, getUp: .9 } };
}

describe('planted body under a bounded external hand load', () => {
  it.each([-1, 1])('executes the issued plant without inventing an instantaneous ground reaction, side %s', side => {
    for (const mode of ['center', 'patch'] as const) for (const n of [1, 12, 48]) {
      const a = body(100, 0), b = body(80, side * .9), dt = .05, force = 20;
      a.facing = b.facing = side < 0 ? Math.PI : 0;
      const w = new World([a, b], { handContact: mode, substeps: n });
      const j = { kind: 'hands' as const, a, b, extension: 1.5, push: force, hold: 0, steer: 0 };
      w.joints.push(j);
      // Stationary target requests a stationary plant at this controller
      // boundary. The source is free of ground drive. Subsequent decisions
      // and athlete realism are outside this short Newtonian force contract.
      const r = w.step([{ vel: { x: 0, y: 0 }, free: true },
        { vel: { x: 0, y: 0 }, facing: b.facing, push: 0 }], dt);
      expect(r.contacts).toHaveLength(0);
      expect(r.falls).toHaveLength(0);
      expect(r.groundImpulse[1]).toEqual({ x: 0, y: 0 });
      expect(b.vel.x).toBeCloseTo(side * force * dt / 80, 11);
      expect(b.pos.x).toBeCloseTo(side * (.9 + force * dt * dt / 160), 11);
      expect(100 * a.vel.x + 80 * b.vel.x).toBeCloseTo(0, 11);
      expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
      expect(b.support!.state).toBe('up');
    }
  });
});

describe('independent bounded-slip force timing reference', () => {
  it.each([-1, 1])('ends dry restraint at zero slip and retains its earlier torque dose, side %s', side => {
    const r = passiveSlipReference(side * 4, .5, 0, 2000, .01);
    const stoppingTime = 4 / (.5 * 2000);
    expect(r.saturatedUntil).toBeCloseTo(stoppingTime, 12);
    expect(r.impulse).toBeCloseTo(-side * 8, 12);
    expect(r.finalSlip).toBe(0);
    expect(r.transport).toBeCloseTo(-side * 2000 * stoppingTime * (.01 - stoppingTime / 2), 12);
    // Same ending impulse, different angle/travel if it is smeared across dt.
    expect(Math.abs(r.transport)).toBeGreaterThan(Math.abs(r.impulse) * .01 / 2);
  });

  it('composes impulse and its temporal moment over unequal partitions, including a force-cap exit', () => {
    for (const mobility of [0, 1e-5, .002, 10]) for (const side of [-1, 1]) {
      const whole = passiveSlipReference(side * 4, .5, mobility, 2000, .01);
      let slip = side * 4, impulse = 0, transport = 0, elapsed = 0;
      for (const h of [.0003, .0037, .0011, .0049]) {
        const r = passiveSlipReference(slip, .5, mobility, 2000, h);
        impulse += r.impulse;
        transport += r.transport + r.impulse * (.01 - elapsed - h);
        slip = r.finalSlip; elapsed += h;
      }
      expect(slip).toBeCloseTo(whole.finalSlip, 11);
      expect(impulse).toBeCloseTo(whole.impulse, 11);
      expect(transport).toBeCloseTo(whole.transport, 11);
    }
  });

  it('matches a separately integrated capped force ODE, including compliant and tiny-load controls', () => {
    for (const mobility of [.002, 1, 10000]) {
      const dt = .01, n = 20000, h = dt / n, K = .5, cap = 2000;
      let v = 4, dose = 0;
      const acceleration = (x: number) => -K * Math.min(cap, Math.max(0, x) / mobility);
      for (let k = 0; k < n; k++) {
        const a = acceleration(v), b = acceleration(v + a * h / 2),
          c = acceleration(v + b * h / 2), d = acceleration(v + c * h);
        dose += h * (v + (v + a * h / 2) * 2 + (v + b * h / 2) * 2 + v + c * h) / 6;
        v += h * (a + 2 * b + 2 * c + d) / 6;
      }
      const r = passiveSlipReference(4, K, mobility, cap, dt);
      expect(r.finalSlip).toBeCloseTo(v, 8);
      expect(r.impulse).toBeCloseTo((v - 4) / K, 8);
      expect(r.transport).toBeCloseTo((dose - 4 * dt) / K, 8);
    }
  });
  it('has no hidden load at zero capacity and rejects invalid physical inputs', () => {
    expect(passiveSlipReference(4, .5, 0, 0, .01)).toEqual({ impulse: 0, transport: 0, finalSlip: 4, saturatedUntil: 0 });
    expect(() => passiveSlipReference(4, 0, 0, 2, .01)).toThrow(RangeError);
    expect(() => passiveSlipReference(4, .5, -1, 2, .01)).toThrow(RangeError);
  });
});
