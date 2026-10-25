import { describe, expect, it } from 'vitest';
import { integrateYaw } from '../src/physics/yaw-response.js';

const TAU = .05;
const cases = [
  { id: 'rest', e: 0, w: 0, h: .05, a: 63, r: 8 },
  { id: 'near target with incoming momentum', e: -.001, w: -.2, h: .05, a: 63, r: 8 },
  { id: 'angle from rest', e: .4, w: 0, h: .05, a: 63, r: 8 },
  { id: 'reach and leave the rate cap', e: 2, w: 0, h: 1, a: 60, r: 3 },
  { id: 'sustained weak acceleration', e: .4, w: 0, h: .5, a: 5, r: 8 },
  { id: 'free response', e: .1, w: .7, h: .2, a: 200, r: 8 },
  { id: 'external overspeed persists', e: .1, w: 10, h: .01, a: 60, r: 8 },
  { id: 'external overspeed reaches the cap', e: 2, w: 10, h: .1, a: 60, r: 8 },
  { id: 'zero torque', e: .1, w: .4, h: .05, a: 0, r: 8 },
  { id: 'zero permitted motor rate', e: .4, w: .2, h: .05, a: 60, r: 0 },
  { id: 'constant acceleration oracle', e: 4, w: 0, h: .05, a: 5, r: 8 },
  { id: 'constant rate oracle', e: 2, w: 3, h: .1, a: 60, r: 3 },
];

describe('bounded critical yaw response uses one physical response time', () => {
  it.each(cases)('preserves state, peak torque, mirrors and limits under time partition: $id', c => {
    const whole = integrateYaw(c.e, c.w, c.h, TAU, c.a, c.r);
    const mirror = integrateYaw(-c.e, -c.w, c.h, TAU, c.a, c.r);
    expect(mirror.error).toBeCloseTo(-whole.error, 10);
    expect(mirror.spin).toBeCloseTo(-whole.spin, 10);
    expect(mirror.angleDelta).toBeCloseTo(-whole.angleDelta, 10);
    expect(mirror.maxAcceleration).toBeCloseTo(whole.maxAcceleration, 10);
    expect(whole.maxAcceleration).toBeLessThanOrEqual(c.a + 1e-10);
    expect(Math.abs(whole.spin - c.w)).toBeLessThanOrEqual(c.a * c.h + 1e-10);
    if (Math.abs(c.w) <= c.r) expect(Math.abs(whole.spin)).toBeLessThanOrEqual(c.r + 1e-10);
    expect(whole.angleDelta).toBeCloseTo(c.e - whole.error, 12);

    for (const weights of [[.1, .23, .17, .5], Array(12).fill(1 / 12), Array(48).fill(1 / 48), Array(192).fill(1 / 192)]) {
      let error = c.e, spin = c.w, peak = 0;
      for (const weight of weights) {
        const part = integrateYaw(error, spin, c.h * weight, TAU, c.a, c.r);
        error = part.error; spin = part.spin; peak = Math.max(peak, part.maxAcceleration);
      }
      expect(error).toBeCloseTo(whole.error, 10);
      expect(spin).toBeCloseTo(whole.spin, 10);
      expect(peak).toBeCloseTo(whole.maxAcceleration, 10);
    }
  });

  it('matches the independently derived unsaturated critical flow', () => {
    const e = -.001, w = -.2, h = .05, B = e / TAU - w, decay = Math.exp(-h / TAU);
    const r = integrateYaw(e, w, h, TAU, 63, 8);
    expect(r.error).toBeCloseTo((e + B * h) * decay, 12);
    expect(r.spin).toBeCloseTo((w + B * h / TAU) * decay, 12);
    expect(r.events).toEqual([]);
  });

  it('matches constant acceleration before a genuine saturation release', () => {
    const e = 4, a = 5, h = .05, r = integrateYaw(e, 0, h, TAU, a, 8);
    expect(r.error).toBeCloseTo(e - .5 * a * h * h, 12);
    expect(r.spin).toBeCloseTo(a * h, 12);
    expect(r.maxAcceleration).toBe(a);
  });

  it('coasts at the rate boundary until the requested drive turns inward', () => {
    const r = integrateYaw(2, 3, .1, TAU, 60, 3);
    expect(r.error).toBeCloseTo(1.7, 12);
    expect(r.spin).toBe(3);
    expect(r.maxAcceleration).toBe(0);
  });

  it('does not project externally acquired excess spin to a speed cap', () => {
    const r = integrateYaw(.1, 10, .01, TAU, 60, 8);
    expect(r.spin).toBeCloseTo(9.4, 12);
    expect(r.error).toBeCloseTo(.1 - 10 * .01 + .5 * 60 * .01 ** 2, 12);
    expect(r.maxAcceleration).toBe(60);
    expect(r.spin).toBeGreaterThan(8);
  });

  it('has no motor effect without a torque allowance', () => {
    const r = integrateYaw(.1, .4, .05, TAU, 0, 8);
    expect(r.error).toBeCloseTo(.08, 12);
    expect(r.spin).toBe(.4);
    expect(r.angleDelta).toBeCloseTo(.02, 12);
    expect(r.maxAcceleration).toBe(0);
  });

  it('reports an interior peak that endpoint or average torque would miss', () => {
    // e=2τw makes initial acceleration zero. The free acceleration then is
    // -(w/τ²)t exp(-t/τ), whose maximum magnitude is w/(e·τ) at t=τ.
    const r = integrateYaw(.1, 1, .2, TAU, 100, 8);
    expect(r.maxAcceleration).toBeCloseTo(1 / (Math.E * TAU), 12);
    expect(r.maxAcceleration).toBeGreaterThan(Math.abs(r.spin - 1) / .2);
  });

  it('keeps peak effort when opposite torque partly cancels over an interval', () => {
    const r = integrateYaw(.1, .5, .1, TAU, 100, 8);
    expect(r.maxAcceleration).toBeCloseTo(20, 12);
    expect(Math.abs(r.spin - .5) / .1).toBeLessThan(1);
  });

  it.each([
    { error: 1.5, spin: 0, h: .3, alpha: 2000, rate: 8, mode: 'rate' },
    { error: .1, spin: 1, h: .2, alpha: 5, rate: 8, mode: 'acceleration' },
  ])('detects an interior $mode limit even when both free endpoints fit', c => {
    const B = c.error / TAU - c.spin;
    const endSpin = (c.spin + B * c.h / TAU) * Math.exp(-c.h / TAU);
    const acceleration = (t: number) =>
      (c.error - 2 * TAU * c.spin - B * t) * Math.exp(-t / TAU) / TAU ** 2;
    expect(Math.abs(c.spin)).toBeLessThan(c.rate);
    expect(Math.abs(endSpin)).toBeLessThan(c.rate);
    expect(Math.abs(acceleration(0))).toBeLessThan(c.alpha);
    expect(Math.abs(acceleration(c.h))).toBeLessThan(c.alpha);
    const whole = integrateYaw(c.error, c.spin, c.h, TAU, c.alpha, c.rate);
    expect(whole.events.some(e => e.to === c.mode)).toBe(true);
    let error = c.error, spin = c.spin;
    for (const weight of [.07, .31, .13, .49]) {
      const part = integrateYaw(error, spin, c.h * weight, TAU, c.alpha, c.rate);
      error = part.error; spin = part.spin;
    }
    expect(error).toBeCloseTo(whole.error, 10);
    expect(spin).toBeCloseTo(whole.spin, 10);
  });

  it.each([
    [0, 0, -.01, TAU, 1, 1], [0, 0, .01, 0, 1, 1],
    [0, 0, .01, TAU, -1, 1], [0, 0, .01, TAU, 1, -1],
    [NaN, 0, .01, TAU, 1, 1], [0, Infinity, .01, TAU, 1, 1],
  ])('rejects nonphysical inputs %j', (e, w, h, tau, a, r) => {
    expect(() => integrateYaw(e, w, h, tau, a, r)).toThrow(RangeError);
  });
});
