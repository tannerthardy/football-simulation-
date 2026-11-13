import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { World, type Intent } from '../src/physics/world.js';

const free: Intent = { vel: { x: 0, y: 0 }, free: true };
const body = (mass: number, x: number, vx = .7): Body => ({
  pos: { x, y: 0 }, vel: { x: vx, y: 0 }, facing: 0, energy: 1,
  profile: { massKg: mass, radius: .3, reach: 1, heightYd: 2.05, vmax: 9,
    tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
    maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: mass,
    balance: .5, stepSpeed: 3.4, getUp: .9 },
});

describe('finite strike force and achieved contact', () => {
  it('matches independent constant-force travel at every subdivision and rotation', () => {
    // J = F*dt is developed throughout the tick, not an impact at its start.
    const force = 20, dt = .05, time = 4 * dt;
    for (const steps of [1, 6, 12, 48, 192]) for (const angle of [0, .8, -.8]) {
      const rotate = (v: { x: number; y: number }) => ({
        x: Math.cos(angle) * v.x - Math.sin(angle) * v.y,
        y: Math.sin(angle) * v.x + Math.cos(angle) * v.y,
      });
      const a = body(100, 0), b = body(80, .9);
      for (const q of [a, b]) { q.pos = rotate(q.pos); q.vel = rotate(q.vel); q.facing = angle; }
      const w = new World([a, b], { substeps: steps });
      for (let k = 0; k < 4; k++) {
        w.strike(a, b, rotate({ x: force * dt, y: 0 }));
        const r = w.step([free, free], dt);
        expect(r.substeps).toBe(steps);
        expect(r.contacts).toHaveLength(0);
        expect(r.falls).toHaveLength(0);
        expect(r.strikes).toHaveLength(1);
        expect(r.strikes[0].impulse.x).toBeCloseTo(force * dt * Math.cos(angle), 10);
        expect(r.strikes[0].impulse.y).toBeCloseTo(force * dt * Math.sin(angle), 10);
        expect(r.strikes[0].work).toBeCloseTo(r.work.strikes, 10);
        expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
      }
      for (const [q, initialX, acceleration] of [[a, 0, -force / 100], [b, .9, force / 80]] as const) {
        const p = rotate({ x: initialX + .7 * time + .5 * acceleration * time ** 2, y: 0 });
        const v = rotate({ x: .7 + acceleration * time, y: 0 });
        expect(q.pos.x).toBeCloseTo(p.x, 11); expect(q.pos.y).toBeCloseTo(p.y, 11);
        expect(q.vel.x).toBeCloseTo(v.x, 11); expect(q.vel.y).toBeCloseTo(v.y, 11);
      }
    }
  });

  it('reports delivered rather than requested impulses within the shared arm/work limits', () => {
    const a = body(100, 0, 0), b = body(80, 1, 0);
    const w = new World([a, b], { substeps: 12 });
    for (let k = 0; k < 8; k++) w.strike(a, b, { x: 1e9, y: 0 });
    const r = w.step([free, free], .05);
    const impulse = r.strikes.reduce((sum, s) => sum + s.impulse.x, 0);
    expect(impulse).toBeGreaterThan(0);
    expect(impulse).toBeLessThanOrEqual(r.armImpulseLimit[0] + 1e-9);
    expect(impulse).toBeCloseTo(r.armImpulse[0], 10);
    expect(impulse).toBeCloseTo(b.vel.x * 80, 10);
    expect(-impulse).toBeCloseTo(a.vel.x * 100, 10);
    expect(r.strikes.reduce((sum, s) => sum + s.work, 0)).toBeCloseTo(r.work.strikes, 10);
    expect(r.armWork[0]).toBeLessThanOrEqual(r.armWorkLimit[0] + 1e-9);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
    expect(w.step([free, free], .05).strikes).toEqual([]);
  });

  it('does not count a distant or grounded actor request as contact', () => {
    for (const grounded of [false, true]) {
      const a = body(100, 0, 0), b = body(80, grounded ? 1 : 5, 0);
      const w = new World([a, b]);
      if (grounded) a.support!.state = 'down';
      w.strike(a, b, { x: 1e9, y: 0 });
      const r = w.step([free, free], .05);
      expect(r.strikes).toEqual([]);
      expect(r.work.strikes).toBe(0);
      expect(r.armImpulse[0]).toBe(0);
      expect(b.vel).toEqual({ x: 0, y: 0 });
    }
  });

  it('centers only the force/work-limited delivered impulse, including simultaneous actions', () => {
    const a = body(100, 0, 0), b = body(80, 1, 0), c = body(120, -1, 0);
    const bs = [a, b, c], before = bs.map(q => ({ pos: { ...q.pos }, vel: { ...q.vel } }));
    const w = new World(bs, { substeps: 1 });
    w.strike(a, b, { x: 1e9, y: .2e9 });
    w.strike(a, c, { x: -.5e9, y: -.1e9 });
    const r = w.step(bs.map(() => free), .05);
    expect(r.contacts).toHaveLength(0);
    expect(r.strikes).toHaveLength(2);
    expect(r.armImpulse[0]).toBeLessThanOrEqual(r.armImpulseLimit[0] + 1e-9);
    expect(r.armWork[0]).toBeLessThanOrEqual(r.armWorkLimit[0] + 1e-9);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
    for (const [i, q] of bs.entries()) {
      expect(q.pos.x).toBeCloseTo(before[i].pos.x + .025 * (before[i].vel.x + q.vel.x), 11);
      expect(q.pos.y).toBeCloseTo(before[i].pos.y + .025 * (before[i].vel.y + q.vel.y), 11);
    }
  });
});
