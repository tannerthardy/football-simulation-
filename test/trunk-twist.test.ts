import { describe, expect, it } from 'vitest';
import type { PhysicalProfile } from '../src/players/physical.js';
import { shouldersOf, stepBody, TRUNK_RANGE, TRUNK_RATE, updateTrunk, type Body } from '../src/physics/kinematics.js';
import { newSupport } from '../src/physics/support.js';

// TRUNK_TWIST Stage 1 (docs/reviews/2026-11-14-open-run-cap.md): the shoulders twist off the hips within a range at a
// rate; the gait (the speed cap, the turn motor) reads the hips and nothing else. These tests do not need the flag:
// they exercise the state and the accessors directly, and prove the cap does not read the trunk.
const profile: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5 };
const body = (facing = 0, v = 6): Body => ({ pos: { x: 0, y: 0 }, vel: { x: v, y: 0 }, facing, energy: 1, profile: { ...profile }, support: newSupport(.2) });
const DT = .05;

describe('trunk twist state', () => {
  it('shoulders are the hips, bit for bit, with no twist', () => {
    const b = body(.37);
    expect(shouldersOf(b)).toBe(b.facing);
    b.trunk = 0;
    expect(shouldersOf(b)).toBe(b.facing);
  });

  it('follows a look at the trunk rate, never past the range, and leaves the hips alone', () => {
    const b = body(0), look = 2.0; // a look 115 degrees off the hips
    updateTrunk(b, look, DT);
    expect(b.trunk).toBeCloseTo(TRUNK_RATE * DT, 12);
    let previous = b.trunk!;
    for (let k = 0; k < 40; k++) {
      updateTrunk(b, look, DT);
      expect(b.trunk!).toBeGreaterThanOrEqual(previous - 1e-12);
      expect(b.trunk!).toBeLessThanOrEqual(TRUNK_RANGE + 1e-12);
      previous = b.trunk!;
    }
    expect(b.trunk).toBeCloseTo(TRUNK_RANGE, 12);
    expect(b.facing).toBe(0);
    expect(shouldersOf(b)).toBeCloseTo(TRUNK_RANGE, 12);
  });

  it('a look inside the range is reached exactly and held', () => {
    const b = body(0);
    for (let k = 0; k < 20; k++) updateTrunk(b, .4, DT);
    expect(b.trunk).toBeCloseTo(.4, 12);
    expect(shouldersOf(b)).toBeCloseTo(.4, 12);
  });

  it('releases to the hips when no look is asked, and the look is measured from the current hips', () => {
    const b = body(0);
    for (let k = 0; k < 20; k++) updateTrunk(b, 0.8, DT);
    expect(b.trunk).toBeCloseTo(0.8, 12);
    for (let k = 0; k < 20; k++) updateTrunk(b, undefined, DT);
    expect(b.trunk).toBe(0);
    const c = body(1.2); // hips already turned toward the look: no twist needed
    for (let k = 0; k < 5; k++) updateTrunk(c, 1.2, DT);
    expect(c.trunk).toBe(0);
  });

  it('wraps the shortest way', () => {
    const b = body(3.0);
    for (let k = 0; k < 20; k++) updateTrunk(b, -3.0, DT); // 0.283 rad the short way past pi
    expect(b.trunk).toBeCloseTo(2 * Math.PI - 6.0, 9);
  });
});

describe('the gait reads the hips, not the trunk', () => {
  const hold = (b: Body, seconds = 4) => {
    for (let k = 0; k < Math.round(seconds / DT); k++) stepBody(b, { vel: { x: profile.vmax, y: 0 }, facing: b.facing, effort: 1 }, DT);
    return b.vel.x;
  };
  it('a twisted trunk on a body whose hips are on the path holds the same speed as one with no twist', () => {
    const plain = body(0), twisted = body(0);
    twisted.trunk = TRUNK_RANGE;
    expect(hold(twisted)).toBe(hold(plain));
  });
  it('the same angle in the hips is what costs speed', () => {
    const forward = hold(body(0)), turned = hold(body(TRUNK_RANGE));
    expect(turned).toBeLessThan(forward - 0.3);
  });
});
