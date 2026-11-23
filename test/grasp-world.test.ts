/**
 * Holds, strikes and drops in the physics world (src/physics/world.ts): the
 * contracts the tackle technique relies on, in a neutral frame with
 * hand-built bodies.
 */
import { describe, expect, it } from 'vitest';
import type { PhysicalProfile } from '../src/players/physical.js';
import type { Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import { DIVE_STANCE, DIVE_STANCE_S } from '../src/physics/dive.js';
import { GROUND_STRETCH, World, type GraspJoint, type Intent } from '../src/physics/world.js';

function profile(mass: number): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 };
}
function body(mass: number, x: number, y: number, vx = 0, vy = 0): Body {
  return { pos: { x, y }, vel: { x: vx, y: vy }, facing: 0, energy: 1, profile: profile(mass) };
}
const FREE: Intent = { vel: { x: 0, y: 0 }, free: true };
const grasp = (a: Body, b: Body, extra: Partial<GraspJoint> = {}): GraspJoint =>
  ({ kind: 'grasp', a, b, reach: 1.4, capacity: 900, legs: 0, pull: 0, ...extra });
function totals(bs: Body[]) {
  return {
    px: bs.reduce((s, b) => s + b.profile.massKg * b.vel.x, 0),
    py: bs.reduce((s, b) => s + b.profile.massKg * b.vel.y, 0),
    ke: bs.reduce((s, b) => s + 0.5 * b.profile.massKg * (b.vel.x ** 2 + b.vel.y ** 2) + 0.5 * supportParams(b.profile).yawInertia * (b.spin ?? 0) ** 2, 0),
  };
}

describe('holds', () => {
  it('a passive hold shares momentum within its grip and never adds energy', () => {
    const a = body(90, 0, 0, -2, 0), b = body(120, 0, 1, 2, 3);
    const w = new World([a, b]);
    const j = grasp(a, b, { capacity: 600 });
    w.joints.push(j);
    const t0 = totals([a, b]);
    let ke = t0.ke;
    for (let k = 0; k < 10; k++) {
      const va = { ...a.vel };
      w.step([FREE, FREE], 0.05);
      const t = totals([a, b]);
      expect(t.px).toBeCloseTo(t0.px, 6); expect(t.py).toBeCloseTo(t0.py, 6);
      expect(t.ke).toBeLessThanOrEqual(ke + 1e-6);
      ke = t.ke;
      // The grip is a force limit: no more than its capacity over the tick.
      expect(Math.hypot(a.vel.x - va.x, a.vel.y - va.y) * 90).toBeLessThanOrEqual(600 * 0.05 * 1.001);
    }
  });

  it('a hold without arm work does not reel a resting pair together', () => {
    const a = body(90, 0, 0), b = body(100, 0, 1.2);
    const w = new World([a, b]);
    w.joints.push(grasp(a, b));
    for (let k = 0; k < 10; k++) w.step([FREE, FREE], 0.05);
    expect(Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)).toBeCloseTo(1.2, 9);
    expect(Math.hypot(a.vel.x, a.vel.y)).toBeLessThan(1e-9);
  });

  it('arms reel the pair in at their own rate without moving its centre', () => {
    const a = body(90, 0, 0), b = body(100, 0, 1.2);
    const w = new World([a, b]);
    w.joints.push(grasp(a, b, { pull: 1.5 }));
    const cy = (b.pos.y * 100) / 190;
    let gap = 1.2;
    for (let k = 0; k < 8; k++) {
      w.step([FREE, FREE], 0.05);
      const d = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y);
      // A soft hold: the bodies may follow the shortening arms with a little lag and overshoot.
      expect(gap - d).toBeLessThanOrEqual(1.5 * 0.05 * 1.05);
      gap = d;
    }
    expect(gap).toBeLessThan(1.2);
    expect((a.pos.y * 90 + b.pos.y * 100) / 190).toBeCloseTo(cy, 9);
  });

  it('an active pull through the centre of mass adds no tipping moment', () => {
    const a = body(90, 0, 0), b = body(100, 0, 1.2);
    const w = new World([a, b]);
    w.substeps = 1;
    // A valid grip, initially slack: isolate the moment delivered by the arms.
    // An implicit torso grasp acts at the carrier's COM, independently of
    // the holder's pad height. The feet remain free to isolate this load.
    w.joints.push(grasp(a, b, { capacity: 900, hold: 1.2, pull: 1.5 }));
    w.step([FREE, FREE], 0.05);
    expect(a.vel.y).toBeGreaterThan(0);
    expect(b.vel.y).toBeLessThan(0);
    expect(Math.hypot(b.support!.tipAccel!.x, b.support!.tipAccel!.y)).toBeLessThan(1e-9);
  });

  it('a common acceleration does not invent travel past a held foot', () => {
    for (const direction of [1, -1]) {
      const a=body(100,0,0),b=body(100,0,1.2),w=new World([a,b],{substeps:1});
      // Both bodies move the same distance under the same ground force.
      // A powerless grip cannot restrict their feet or invent a trip.
      w.joints.push(grasp(a,b,{capacity:0,legs:1,pull:0}));
      w.step([{vel:{x:direction*4,y:0}},{vel:{x:direction*4,y:0}}],.05);
      expect(Math.abs(a.vel.x)).toBeGreaterThan(0);
      expect(b.pos.x-a.pos.x).toBeCloseTo(0,12);
      expect(b.support!.feetLock).toBe(0);
      expect(b.support!.causes!.legs).toBeLessThan(1e-12);
    }
  });

  it('unusable leg grasps match the ungripped trajectory without a last impulse or foot lock', () => {
    for (const kind of ['powerless', 'past-standing', 'past-ground'] as const) for (const substeps of [12, 48]) {
      const run = (held: boolean) => {
        const gap = kind === 'past-standing' ? 2.2 : kind === 'past-ground' ? 2.5 : 1;
        const a = body(100, 0, 0), b = body(100, gap, 0, 3), w = new World([a, b], { substeps });
        if (kind === 'past-ground') { a.support!.state = 'down'; a.support!.since = 0; }
        // Force the same subdivision in the ungripped control.
        w.joints.push({ kind: 'hands', a, b, extension: 3, push: 0, hold: 0, steer: 0 });
        const j = grasp(a, b, { reach: 1.5, hold: gap, legs: 1,
          capacity: kind === 'powerless' ? 0 : 900, ...(kind === 'past-ground' ? { ground: 2.4 } : {}) });
        if (held) w.joints.push(j);
        for (let k = 0; k < 5; k++) {
          const r = w.step([{ vel: { x: 0, y: 0 } }, { vel: { x: 3, y: 0 } }], .05);
          expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
          if (held) { expect(j.broken).toBe(true); expect(j.force).toBe(0); expect(b.support!.feetLock).toBe(0); }
        }
        return [a, b];
      };
      expect(run(true)).toEqual(run(false));
    }
  });

  it('a hold already past its reach breaks without pulling anyone in', () => {
    const a = body(90, 0, 0), b = body(100, 0, 2);
    const w = new World([a, b]);
    const j = grasp(a, b, { hold: 2 });
    w.joints.push(j);
    w.step([FREE, FREE], 0.05);
    expect(j.broken).toBe(true);
    expect(a.vel).toEqual({ x: 0, y: 0 }); expect(b.vel).toEqual({ x: 0, y: 0 });
  });

  it('a slipping hold slides down to the legs, and a holder pulled off his feet hangs on stretched out', () => {
    const run = (down: boolean) => {
      const a = body(90, 0, 0), b = body(80, 1.0, 0, 3, 0);
      const w = new World([a, b]);
      if (down) { a.support!.state = 'down'; a.support!.since = -1; }
      const j = grasp(a, b, { capacity: 300, legs: 0.2 });
      w.joints.push(j);
      let k = 0;
      while (!j.broken && k < 40) { w.step([FREE, FREE], 0.05); k++; }
      return { j, k };
    };
    const up = run(false), lying = run(true);
    expect(up.j.legs).toBeGreaterThan(0.2);
    expect(up.j.broken).toBe(true);
    // Stretched along the ground he keeps the hold for longer.
    expect(lying.k).toBeGreaterThan(up.k);
    expect(GROUND_STRETCH).toBeGreaterThan(0.5);
  });

  it('several holds on one body conserve momentum and are rotation invariant', () => {
    const run = (angle: number) => {
      const r = (x: number, y: number) => ({ x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) });
      const spec: Array<[number, number, number, number, number]> = [[80, 0, 0, 7, 1], [95, -1.1, 0.3, 2, 0], [100, 0.2, -1.2, 0, 3], [110, 0.4, 1.1, -1, -2]];
      const bs = spec.map(([m, x, y, vx, vy]) => { const p = r(x, y), v = r(vx, vy); return body(m, p.x, p.y, v.x, v.y); });
      const w = new World(bs);
      for (const h of bs.slice(1)) w.joints.push(grasp(h, bs[0], { capacity: 700, legs: 0.3, pull: 1 }));
      const t0 = totals(bs);
      for (let k = 0; k < 10; k++) {
        const rep = w.step(bs.map(() => FREE), 0.05);
        const g = rep.groundImpulse.reduce((s, q) => ({ x: s.x + q.x, y: s.y + q.y }), { x: 0, y: 0 });
        const t = totals(bs);
        expect(t.px - t0.px).toBeCloseTo(g.x, 6); expect(t.py - t0.py).toBeCloseTo(g.y, 6);
        t0.px = t.px; t0.py = t.py;
      }
      const back = (v: { x: number; y: number }) => ({ x: v.x * Math.cos(-angle) - v.y * Math.sin(-angle), y: v.x * Math.sin(-angle) + v.y * Math.cos(-angle) });
      return bs.map((b) => ({ p: back(b.pos), v: back(b.vel), s: b.support!.state }));
    };
    const base = run(0), turned = run(1.1);
    for (let i = 0; i < base.length; i++) {
      expect(turned[i].p.x).toBeCloseTo(base[i].p.x, 6); expect(turned[i].p.y).toBeCloseTo(base[i].p.y, 6);
      expect(turned[i].v.x).toBeCloseTo(base[i].v.x, 6); expect(turned[i].s).toBe(base[i].s);
    }
  });

  it('a coincident pair separates and stays finite', () => {
    const a = body(100, 0, 0), b = body(100, 0, 0);
    const w = new World([a, b]);
    for (let k = 0; k < 20; k++) w.step([FREE, FREE], 0.05);
    for (const q of [a, b]) for (const v of [q.pos.x, q.pos.y, q.vel.x, q.vel.y]) expect(Number.isFinite(v)).toBe(true);
    expect(Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)).toBeGreaterThan(0.3);
  });
});

describe('strikes and drops', () => {
  it('a strike drives the body beyond its gait only as hard as traction allows', () => {
    const a = body(90, 0, 0);
    const w = new World([a]);
    const sp = supportParams(a.profile);
    w.step([{ vel: { x: 0, y: 0 }, lunge: { x: 3, y: 0 } }], 0.05);
    const dv = a.vel.x;
    expect(dv).toBeGreaterThan(0.3);
    expect(dv * 90).toBeLessThanOrEqual(sp.traction * 0.05 * 1.001);
  });

  it('a strike that meets nothing overextends him; one that meets a body is caught by it', () => {
    const run = (target: boolean) => {
      const a = body(90, 0, 0), bs = [a];
      if (target) bs.push(body(100, 0.55, 0));
      const w = new World(bs);
      let peak = 0;
      for (let k = 0; k < 12; k++) {
        w.step(bs.map((_, i) => (i === 0 && k === 0 ? { vel: { x: 0, y: 0 }, lunge: { x: 2.4, y: 0 } } : { vel: { x: 0, y: 0 } })), 0.05);
        peak = Math.max(peak, Math.hypot(a.support!.xi.x, a.support!.xi.y));
      }
      return peak;
    };
    expect(run(false)).toBeGreaterThan(run(true) * 1.5);
  });

  it('letting the legs go starts a fall without launching the body', () => {
    const a = body(90, 0, 0, 4, 0), b = body(90, 0, 3, 4, 0);
    const w = new World([a, b]);
    w.step([{ vel: { x: 4, y: 0 }, dive: { x: 0.01, y: 0 } }, { vel: { x: 4, y: 0 }, dive: { x: 1, y: 0 } }], 0.05);
    // DIVE_STANCE: the push-off is a stance of DIVE_STANCE_S; he is off his feet at the end of the third tick, not the first.
    if (DIVE_STANCE) for (let k = 0; k < 2; k++) w.step([{ vel: { x: 4, y: 0 }, free: true }, { vel: { x: 4, y: 0 }, free: true }], 0.05);
    expect(a.support!.state).toBe('falling'); expect(b.support!.state).toBe('falling');
    expect(a.vel.x).toBeLessThan(4.1);
    // The former >1 yd/s expectation required an unbounded one-substep
    // impulse. Both launch and contact now obey finite ground traction.
    expect(b.vel.x).toBeGreaterThan(a.vel.x + .5);
    expect(b.vel.x-4).toBeLessThanOrEqual(supportParams(b.profile).traction/b.profile.massKg*(DIVE_STANCE ? DIVE_STANCE_S : .05)+1e-9);
  });
});
