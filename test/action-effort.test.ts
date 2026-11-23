import { describe, expect, it } from 'vitest';
import { FAST_DRAIN, spendEnergy, type Body } from '../src/physics/kinematics.js';
import { newSupport } from '../src/physics/support.js';
import { World, type Intent } from '../src/physics/world.js';
import { DIVE_STANCE } from '../src/physics/dive.js';

const profile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05, vmax: 9,
  tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5 };
const free: Intent = { vel: { x: 0, y: 0 }, free: true };
const dt = .05;
const workScale = profile.vmax * profile.vmax / profile.tau;
function scene(substeps = 1, impactTiming: 'speculative' | 'local-sweep' = 'speculative') {
  const b: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0,
    energy: 1, profile: { ...profile }, support: newSupport() };
  const other = structuredClone(b); other.pos.x = 4;
  const w = new World([b, other], { substeps, impactTiming });
  w.joints.push({ kind: 'hands', a: b, b: other, extension: 4, push: 0, hold: 0, steer: 0 });
  return { b, other, w };
}
const kineticPerKg = (b: Body) => .5 * (b.vel.x ** 2 + b.vel.y ** 2);
const restingCost = (b: Body, elapsed: number) => (.0045 + FAST_DRAIN * .012 * (Math.hypot(b.vel.x, b.vel.y) / profile.vmax) ** 2) * elapsed;

describe('completed action effort', () => {
  // The one-tick plant's accounting: with DIVE_STANCE the push-off is a stance over three ticks and its work is checked in dive-stance.test.ts.
  it.skipIf(DIVE_STANCE)('charges delivered dive work once despite the terminal falling/free state', () => {
    for (const impactTiming of ['speculative', 'local-sweep'] as const) for (const substeps of [1, 12, 48]) {
      const { b, w } = scene(substeps, impactTiming);
      const r = w.step([{ vel: { x: 0, y: 0 }, dive: { x: 1, y: 0 } }, free], dt);
      expect(b.support!.state).toBe('falling');
      expect(r.groundWork[0] / profile.massKg).toBeCloseTo(kineticPerKg(b), 12);
      const expected = restingCost(b, dt) + FAST_DRAIN * .03 * kineticPerKg(b) / workScale;
      expect(1 - b.energy).toBeCloseTo(expected, 14);
      expect(r.groundWork[0]).toBeGreaterThan(0);
      expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
    }
  });

  it('is invariant to real physics subdivision for equal lunge work and elapsed time', () => {
    const costs: number[] = [];
    for (const substeps of [1, 12, 48]) {
      const { b, w } = scene(substeps);
      const r = w.step([{ vel: { x: 0, y: 0 }, lunge: { x: .1, y: 0 } }, free], dt);
      expect(b.vel.x).toBeCloseTo(.1, 13);
      expect(b.support!.state).toBe('up');
      expect(r.groundWork[0]).toBeCloseTo(.5, 12);
      costs.push(1 - b.energy);
      expect(costs.at(-1)).toBeCloseTo(restingCost(b, dt) + FAST_DRAIN * .03 * .005 / workScale, 14);
    }
    expect(Math.max(...costs) - Math.min(...costs)).toBeLessThan(1e-15);
  });

  it('counts positive work after reversal, while excluding negative work', () => {
    const { b, w } = scene(); b.vel.x = -.1;
    // No planned gait: the lunge alone first brakes, then drives forward.
    const r = w.step([{ vel: { ...b.vel }, facing: 0, lunge: { x: .2, y: 0 } }, free], dt);
    expect(b.vel.x).toBeCloseTo(.1, 13);
    expect(r.groundWork[0]).toBeCloseTo(0, 12);
    expect(1 - b.energy).toBeCloseTo(restingCost(b, dt) + FAST_DRAIN * .03 * .005 / workScale, 14);
  });

  it('charges achieved force rather than an unmet lunge request', () => {
    const costs: number[] = [];
    for (const request of [3, 30]) {
      const { b, w } = scene();
      const r = w.step([{ vel: { x: 0, y: 0 }, lunge: { x: request, y: 0 } }, free], dt);
      expect(b.vel.x).toBeLessThan(request);
      expect(r.groundWork[0] / profile.massKg).toBeCloseTo(kineticPerKg(b), 12);
      costs.push(1 - b.energy);
      expect(costs.at(-1)).toBeCloseTo(restingCost(b, dt) + FAST_DRAIN * .03 * kineticPerKg(b) / workScale, 14);
    }
    expect(costs[0]).toBe(costs[1]);
  });

  it('charges once over unequal local impact pieces, including an unrelated active body', () => {
    const { b } = scene(); b.pos.y = .8;
    const a = structuredClone(b), target = structuredClone(b);
    a.pos = { x: 0, y: 0 }; a.vel.x = 8;
    target.pos = { x: .85, y: 0 };
    const w = new World([a, target, b], { substeps: 1, impactTiming: 'local-sweep' });
    const r = w.step([free, free, { vel: { x: 0, y: 0 }, lunge: { x: .1, y: 0 } }], dt);
    expect(r.impactSplits).toBeGreaterThan(0);
    expect(r.impactSplitLimitHits).toBe(0);
    expect(r.contacts.every(c => c.i !== 2 && c.j !== 2)).toBe(true);
    expect(b.support!.state).toBe('up');
    expect(b.vel.x).toBeCloseTo(.1, 13);
    expect(1 - b.energy).toBeCloseTo(restingCost(b, dt) + FAST_DRAIN * .03 * .005 / workScale, 14);
    expect(a.energy).toBe(1); expect(target.energy).toBe(1);
  });

  it('retains work before falling and excludes the later passive portion', () => {
    const { b, w } = scene(12);
    b.support!.xi.x = 2; // Existing recovery limit: falls in the first piece.
    const r = w.step([{ vel: { x: 0, y: 0 } }, free], dt);
    expect(r.falls).toContain(0);
    expect(b.support!.state).toBe('falling');
    expect(b.vel.x).toBeGreaterThan(0); // Subsequent passive fall drive.
    expect(1 - b.energy).toBeCloseTo(.0045 * dt / 12, 14);
    expect(b.sprintLoad).toBe(0);
  });

  it('does not charge a wholly passive body for fall drive', () => {
    const { b, other, w } = scene(12);
    b.support!.state = 'falling'; b.support!.since = 0; b.support!.fall.x = 1;
    const r = w.step([free, free], dt);
    expect(Math.abs(r.groundImpulse[0].x)).toBeGreaterThan(0);
    expect(b.energy).toBe(1); expect(other.energy).toBe(1);
    expect(b.sprintLoad).toBeUndefined();
  });

  it('preserves the ordinary endpoint proxy exactly under actual subdivision', () => {
    for (const substeps of [1, 12, 48]) {
      const { b, w } = scene(substeps);
      const r = w.step([{ vel: { x: .1, y: 0 } }, free], dt);
      const expected = structuredClone(b); expected.energy = 1; delete expected.sprintLoad;
      spendEnergy(expected, { x: r.groundImpulse[0].x / (profile.massKg * dt), y: 0 }, 0, dt);
      expect(b.energy).toBe(expected.energy);
      expect(b.sprintLoad).toBe(expected.sprintLoad);
    }
  });
});
