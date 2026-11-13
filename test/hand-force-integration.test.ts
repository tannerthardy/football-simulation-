import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { World, type HandJoint, type Intent } from '../src/physics/world.js';

const free: Intent = { vel: { x: 0, y: 0 }, free: true };
function body(mass: number, x: number, vx: number): Body {
  return { pos: { x, y: 0 }, vel: { x: vx, y: 0 }, facing: 0, energy: 1,
    profile: { massKg: mass, radius: .3, reach: 1, heightYd: 2.05,
      vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
      shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
      power: mass, balance: .5, stepSpeed: 3.4, getUp: .9 } };
}

/** Independent constant-force oracle. Large initial arm compression keeps
 * the existing physical spring/damper at a modest force cap throughout;
 * there are no ground forces or torso impacts in this short window. */
function constantForce(substeps: number, handIntegration: 'end' | 'centered', angle = 0) {
  const a = body(100, 0, .7), b = body(80, .9, .7);
  const rotate = ({ x, y }: { x: number; y: number }) => ({
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
  });
  for (const q of [a, b]) { q.pos = rotate(q.pos); q.vel = rotate(q.vel); q.facing = angle; }
  const world = new World([a, b], { substeps, handIntegration });
  const hands: HandJoint = { kind: 'hands', a, b, extension: 1.5, push: 20, hold: 0, steer: 0 };
  world.joints.push(hands);
  for (let i = 0; i < 4; i++) {
    const r = world.step([free, free], .05);
    expect(r.contacts).toHaveLength(0);
    expect(r.falls).toHaveLength(0);
    expect(hands.normalForce).toBeCloseTo(20, 10);
    expect(r.groundImpulse).toEqual([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
    for (let j = 0; j < 2; j++) {
      expect(r.armImpulse[j]).toBeLessThanOrEqual(r.armImpulseLimit[j] + 1e-9);
      expect(r.armWork[j]).toBeLessThanOrEqual(r.armWorkLimit[j] + 1e-9);
    }
  }
  return { a, b, rotate };
}

describe('sustained hand-force position integration', () => {
  it('matches Newtonian travel for constant bounded force at every subdivision and rotation', () => {
    const t = .2;
    for (const substeps of [1, 6, 12, 48]) for (const angle of [0, .8, -.8]) {
      const { a, b, rotate } = constantForce(substeps, 'centered', angle);
      const refs = [
        { q: a, x: .7 * t - .5 * 20 / 100 * t * t, vx: .7 - 20 / 100 * t },
        { q: b, x: .9 + .7 * t + .5 * 20 / 80 * t * t, vx: .7 + 20 / 80 * t },
      ];
      for (const { q, x, vx } of refs) {
        const p = rotate({ x, y: 0 }), v = rotate({ x: vx, y: 0 });
        expect(q.pos.x).toBeCloseTo(p.x, 11); expect(q.pos.y).toBeCloseTo(p.y, 11);
        expect(q.vel.x).toBeCloseTo(v.x, 11); expect(q.vel.y).toBeCloseTo(v.y, 11);
      }
    }
  });

  it('retains the old first-order excess as an explicit comparison, with equal momentum and velocity', () => {
    const t = .2;
    for (const substeps of [6, 12, 48]) {
      const old = constantForce(substeps, 'end'), next = constantForce(substeps, 'centered');
      const h = .05 / substeps;
      expect(old.a.pos.x - next.a.pos.x).toBeCloseTo(-.5 * 20 / 100 * t * h, 11);
      expect(old.b.pos.x - next.b.pos.x).toBeCloseTo(.5 * 20 / 80 * t * h, 11);
      expect(old.a.vel.x).toBeCloseTo(next.a.vel.x, 11);
      expect(old.b.vel.x).toBeCloseTo(next.b.vel.x, 11);
      expect(100 * next.a.vel.x + 80 * next.b.vel.x).toBeCloseTo(180 * .7, 11);
      expect((100 * next.a.pos.x + 80 * next.b.pos.x) / 180)
        .toBeCloseTo(80 * .9 / 180 + .7 * t, 11);
    }
  });

  it('centers achieved tangential steering without adding passive energy or changing momentum', () => {
    for (const side of [-1, 1]) {
      const a = body(100, 0, .7), b = body(80, .9, .7);
      b.vel.y = side * 2;
      const before = [a, b].map(q => ({ pos: { ...q.pos }, vel: { ...q.vel } }));
      const w = new World([a, b], { substeps: 1, handIntegration: 'centered' });
      const j: HandJoint = { kind: 'hands', a, b, extension: .9, push: 0, hold: 0, steer: 20 };
      w.joints.push(j);
      const r = w.step([free, free], .05);
      expect(j.tangentForce).toBeCloseTo(-side * 20, 10);
      expect(r.work.hands).toBeLessThan(0);
      expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
      expect(100 * a.vel.y + 80 * b.vel.y).toBeCloseTo(side * 160, 10);
      expect(r.contacts).toHaveLength(0);
      [a, b].forEach((q, i) => {
        expect(q.pos.x).toBeCloseTo(before[i].pos.x + .025 * (before[i].vel.x + q.vel.x), 11);
        expect(q.pos.y).toBeCloseTo(before[i].pos.y + .025 * (before[i].vel.y + q.vel.y), 11);
      });
    }
  });

  it('uses net achieved hand forces when several contacts load the same body', () => {
    const a = body(100, 0, .7), b = body(80, .9, .7), c = body(120, -.9, .7);
    const bs = [a, b, c], before = bs.map(q => ({ pos: { ...q.pos }, vel: { ...q.vel } }));
    const w = new World(bs, { substeps: 1, handIntegration: 'centered' });
    w.joints.push({ kind: 'hands', a, b, extension: 1.5, push: 20, hold: 0, steer: 0 },
      { kind: 'hands', a, b: c, extension: 1.5, push: 30, hold: 0, steer: 0 });
    const r = w.step(bs.map(() => free), .05);
    expect(r.contacts).toHaveLength(0);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
    expect(bs.reduce((sum, q) => sum + q.profile.massKg * q.vel.x, 0)).toBeCloseTo(300 * .7, 10);
    bs.forEach((q, i) => {
      expect(q.pos.x).toBeCloseTo(before[i].pos.x + .025 * (before[i].vel.x + q.vel.x), 11);
      expect(q.pos.y).toBeCloseTo(before[i].pos.y + .025 * (before[i].vel.y + q.vel.y), 11);
    });
  });
});
