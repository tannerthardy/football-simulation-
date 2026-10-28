/**
 * Mechanical contracts of the physics world (src/physics/world.ts), in a
 * neutral frame with hand-built bodies. These are invariants and controlled
 * behaviors, not NFL outcome targets.
 */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generatePlayer } from '../src/players/generator.js';
import { derivePhysical, type PhysicalProfile } from '../src/players/physical.js';
import { stepBody, type Body } from '../src/physics/kinematics.js';
import { availability, baseRadiusAt, supportParams } from '../src/physics/support.js';
import { World, type GraspJoint, type HandJoint, type Intent } from '../src/physics/world.js';

function profile(mass: number, extra: Partial<PhysicalProfile> = {}): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass * 1.0, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9, ...extra };
}
function body(mass: number, x: number, y: number, vx = 0, vy = 0, facing = 0, extra: Partial<PhysicalProfile> = {}): Body {
  return { pos: { x, y }, vel: { x: vx, y: vy }, facing, energy: 1, profile: profile(mass, extra) };
}
const FREE: Intent = { vel: { x: 0, y: 0 }, free: true };
const STANDING: Intent = { vel: { x: 0, y: 0 } };
function totals(bs: Body[]) {
  const mass = bs.reduce((s, b) => s + b.profile.massKg, 0);
  return {
    px: bs.reduce((s, b) => s + b.profile.massKg * b.vel.x, 0),
    py: bs.reduce((s, b) => s + b.profile.massKg * b.vel.y, 0),
    ke: bs.reduce((s, b) => s + 0.5 * b.profile.massKg * (b.vel.x ** 2 + b.vel.y ** 2) + 0.5 * supportParams(b.profile).yawInertia * (b.spin ?? 0) ** 2, 0),
    cx: bs.reduce((s, b) => s + b.profile.massKg * b.pos.x, 0) / mass,
    cy: bs.reduce((s, b) => s + b.profile.massKg * b.pos.y, 0) / mass,
  };
}
const rotate = (v: { x: number; y: number }, a: number) => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });

describe('free movement', () => {
  it('reproduces the calibrated integrator exactly at any substep count', () => {
    const p = derivePhysical(generatePlayer(new Rng(5), 'WR'));
    for (const substeps of [1, 3, 8]) {
      const a: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: p };
      const b: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: p };
      const w = new World([a], { substeps });
      for (let k = 0; k < 60; k++) {
        const cmd: Intent = { vel: k < 30 ? { x: 9, y: 0 } : { x: -2, y: 8 }, cutSkill: 1.1 };
        w.step([cmd], 0.05); stepBody(b, cmd, 0.05);
      }
      expect(a.pos.x).toBeCloseTo(b.pos.x, 9); expect(a.pos.y).toBeCloseTo(b.pos.y, 9);
      expect(a.vel.x).toBeCloseTo(b.vel.x, 9); expect(a.facing).toBeCloseTo(b.facing, 9);
      expect(a.energy).toBeCloseTo(b.energy, 12);
    }
  });
});

describe('contact accounting', () => {
  it('changes total momentum only by recorded ground impulse, through contact, holds and falls', () => {
    const bs = [body(140, 0, 0, 2, 0), body(120, 0.7, 0.1, -3, 0, Math.PI), body(95, 1.2, -0.9, -1, 4),
      body(100, -0.5, 1.5, 6, -2), body(90, 2.5, 0.4, -7, 0)];
    const w = new World(bs);
    w.joints.push({ kind: 'grasp', a: bs[3], b: bs[0], reach: 1.4, capacity: 900, legs: 0.6 } satisfies GraspJoint);
    w.joints.push({ kind: 'hands', a: bs[0], b: bs[1], extension: 0.95, push: 1200, hold: 300, steer: 600 } satisfies HandJoint);
    const intents: Intent[] = [{ vel: { x: 4, y: 0 }, push: 1 }, { vel: { x: -4, y: 0 }, push: 1 }, { vel: { x: 0, y: 6 } }, { vel: { x: -3, y: 0 }, push: 1 }, { vel: { x: -8, y: 0 } }];
    for (let k = 0; k < 40; k++) {
      const before = totals(bs);
      const r = w.step(intents, 0.05);
      const after = totals(bs);
      const gx = r.groundImpulse.reduce((s, g) => s + g.x, 0), gy = r.groundImpulse.reduce((s, g) => s + g.y, 0);
      expect(after.px - before.px).toBeCloseTo(gx, 6);
      expect(after.py - before.py).toBeCloseTo(gy, 6);
    }
  });

  it('a passive collision conserves momentum and the center path and never adds kinetic energy', () => {
    for (const [vx, offset] of [[8, 0], [5, 0.3], [11, 0.42]]) {
      const a = body(100, 0, 0, vx, 0), b = body(85, 1.5, offset, -2, 0);
      const w = new World([a, b]);
      const t0 = totals([a, b]);
      let ke = t0.ke + w.contactEnergy(), gx = 0, gy = 0, falls = 0;
      for (let k = 0; k < 20; k++) {
        const r = w.step([FREE, FREE], 0.05);
        // A fall turns height into motion: that is recorded external work.
        const work = r.groundWork[0] + r.groundWork[1];
        // Off-feet ground friction is external and recorded; nothing else is.
        gx += r.groundImpulse[0].x + r.groundImpulse[1].x; gy += r.groundImpulse[0].y + r.groundImpulse[1].y;
        falls += r.falls.length;
        const t = totals([a, b]);
        expect(t.px).toBeCloseTo(t0.px + gx, 6); expect(t.py).toBeCloseTo(t0.py + gy, 6);
        // Kinetic plus compressed-contact energy never increases.
        const energy = t.ke + w.contactEnergy();
        expect(energy).toBeLessThanOrEqual(ke + Math.max(0, work) + 1e-6);
        ke = energy;
      }
      if (!falls) {
        const t = totals([a, b]);
        expect(t.cx).toBeCloseTo(t0.cx + t0.px / 185 * 1.0, 6);
        expect(t.cy).toBeCloseTo(t0.cy + t0.py / 185 * 1.0, 6);
      }
    }
  });

  it('is rotation and mirror invariant in a neutral frame', () => {
    const run = (angle: number, mirror: number) => {
      const map = (v: { x: number; y: number }) => rotate({ x: v.x, y: v.y * mirror }, angle);
      const a = body(110, 0, 0), b = body(95, 0.65, 0.2);
      const pa = map({ x: 0, y: 0 }), pb = map({ x: 0.65, y: 0.2 });
      a.pos = pa; b.pos = pb; a.vel = map({ x: 6, y: 1 }); b.vel = map({ x: -2, y: 0 });
      a.facing = Math.atan2(map({ x: 1, y: 0 }).y, map({ x: 1, y: 0 }).x);
      b.facing = a.facing + Math.PI;
      const w = new World([a, b], { substeps: 4 });
      for (let k = 0; k < 10; k++) w.step([{ vel: map({ x: 5, y: 0.5 }), push: 1 }, { vel: map({ x: -1, y: 0 }), push: 1 }], 0.05);
      const back = (v: { x: number; y: number }) => { const r = rotate(v, -angle); return { x: r.x, y: r.y * mirror }; };
      return [a, b].map((q) => ({ pos: back(q.pos), vel: back(q.vel), xi: back(q.support!.xi) }));
    };
    const base = run(0, 1);
    for (const [angle, mirror] of [[Math.PI / 3, 1], [2.1, -1], [-0.7, -1]]) {
      const other = run(angle, mirror);
      for (let i = 0; i < 2; i++) {
        expect(other[i].pos.x).toBeCloseTo(base[i].pos.x, 6); expect(other[i].pos.y).toBeCloseTo(base[i].pos.y, 6);
        expect(other[i].vel.x).toBeCloseTo(base[i].vel.x, 6); expect(other[i].xi.y).toBeCloseTo(base[i].xi.y, 6);
      }
    }
  });
});

describe('fast and crowded encounters', () => {
  it('detects fast crossings at the native tick and never lets bodies pass through', () => {
    for (const substeps of [1, undefined]) {
      for (const offset of [0, 0.2, 0.4]) {
        const a = body(90, 50 - 0.275, 26, 10.5, 0), b = body(90, 50 + 0.275, 26 + offset, -10.5, 0, Math.PI);
        a.profile.radius = b.profile.radius = 0.25;
        const w = new World([a, b], { substeps });
        const r = w.step([FREE, FREE], 0.05);
        expect(r.contacts.length).toBe(1);
        if (offset === 0) expect(a.pos.x).toBeLessThan(b.pos.x);
      }
    }
  });

  it('does not invent a contact for a near miss', () => {
    const a = body(90, 50 - 0.275, 26, 10.5, 0), b = body(90, 50 + 0.275, 26.5, -10.5, 0, Math.PI);
    a.profile.radius = b.profile.radius = 0.25;
    const w = new World([a, b], { substeps: 1 });
    const r = w.step([FREE, FREE], 0.05);
    expect(r.contacts.length).toBe(0);
    expect(a.vel).toEqual({ x: 10.5, y: 0 });
  });

  it('detects the encounter at every phase of the tick', () => {
    for (let phase = 0; phase < 10; phase++) {
      const shift = phase * 0.105;
      const a = body(90, 40 - 1.2 - shift, 26, 10.5, 0), b = body(90, 40 + 1.2 + shift, 26.2, -10.5, 0, Math.PI);
      a.profile.radius = b.profile.radius = 0.25;
      const w = new World([a, b]);
      let touched = false;
      for (let k = 0; k < 6; k++) touched ||= w.step([FREE, FREE], 0.05).contacts.length > 0;
      expect(touched).toBe(true);
    }
  });

  it('keeps a crowded pile bounded: no deep overlap and no explosion', () => {
    const bs: Body[] = [];
    for (let i = 0; i < 9; i++) bs.push(body(100 + 10 * (i % 3), (i % 3) * 0.5, Math.floor(i / 3) * 0.5, 0, 0));
    const w = new World(bs);
    const intents = bs.map((b): Intent => ({ vel: { x: (1 - b.pos.x) * 3, y: (0.5 - b.pos.y) * 3 }, push: 1 }));
    let maxPen = 0;
    for (let k = 0; k < 40; k++) maxPen = Math.max(maxPen, w.step(intents, 0.05).maxPenetration);
    expect(maxPen).toBeLessThan(0.2);
    for (const b of bs) expect(Math.hypot(b.vel.x, b.vel.y)).toBeLessThan(6);
  });
});

describe('support and balance', () => {
  it('releases the same committed lean across subdivision and mirrored/recentering support states', () => {
    const run = (force: number, xi: number, side: number, substeps: number) => {
      const a = body(100, 0, 0), anchor = body(100, 4, 0), w = new World([a, anchor], { substeps });
      a.support!.lean = { x: force, y: 0 };
      a.support!.xi = { x: xi, y: side * .04 };
      // Force actual subdivision while providing no external hand load.
      w.joints.push({ kind: 'hands', a, b: anchor, extension: 4, push: 0, hold: 0, steer: 0 });
      const released = { x: 0, y: 0 };
      for (let k = 0; k < 4; k++) {
        const r = w.step([STANDING, FREE], .05);
        expect(r.maxLeanReleaseResidual).toBeLessThan(1e-7);
        expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
        released.x += r.leanRelease[0].x; released.y += r.leanRelease[0].y;
      }
      return { x: released.x, y: side * released.y };
    };
    for (const force of [900, 1100]) for (const xi of [-.25, 0, .1]) {
      const reference = run(force, xi, 1, 192);
      for (const side of [-1, 1]) for (const substeps of [6, 12, 48]) {
        const result = run(force, xi, side, substeps);
        // Isolate the released geometry. A later fall freezes xi after a
        // threshold crossing; that separate event-timing error remains open.
        expect(result.x).toBeCloseTo(reference.x, 8);
        expect(result.y).toBeCloseTo(reference.y, 8);
      }
    }
  });
  const hit = (speed: number, posture = 0.2) => {
    const a = body(100, 0, 0, speed, 0), b = body(90, 0.62, 0, 0, 0, Math.PI);
    b.support = undefined;
    const w = new World([a, b]);
    b.support!.posture = posture;
    let fell = false;
    let peak = 0;
    for (let k = 0; k < 30; k++) {
      const r = w.step([FREE, { vel: { x: 0, y: 0 }, posture }], 0.05);
      fell ||= r.falls.includes(1);
      peak = Math.max(peak, b.support!.peak);
    }
    return { fell, peak, b };
  };

  it('a light bump costs balance and is recovered in finite time', () => {
    const { fell, peak, b } = hit(3);
    expect(fell).toBe(false);
    expect(peak).toBeGreaterThan(0.05);
    expect(Math.hypot(b.support!.xi.x, b.support!.xi.y)).toBeLessThan(0.05);
    expect(availability(b.support!, supportParams(b.profile), 1)).toBe(1);
  });

  it('a hard unbraced hit knocks a standing player down, and he gets up again', () => {
    const { fell } = hit(9);
    expect(fell).toBe(true);
    const a = body(100, 0, 0, 9, 0), b = body(90, 0.62, 0, 0, 0, Math.PI);
    const w = new World([a, b]);
    const states = new Set<string>();
    for (let k = 0; k < 80; k++) { w.step([FREE, STANDING], 0.05); states.add(b.support!.state); }
    expect([...states]).toEqual(expect.arrayContaining(['falling', 'down', 'rising', 'up']));
    expect(b.support!.state).toBe('up');
  });

  it('a low pad level turns the same hit into a smaller deviation', () => {
    expect(hit(5, 0.9).peak).toBeLessThan(hit(5, 0.1).peak);
  });

  it('continues sensing motion while down rather than replaying an old hit on getting up', () => {
    const a = body(100, 0, 0), w = new World([a]);
    a.support!.state = 'down'; a.support!.since = 0;
    a.support!.accel = { x: 10, y: 0 };
    a.support!.tipAccel = { x: -10, y: 0 };
    for (let k = 0; k < 10; k++) w.step([STANDING], 0.05);
    expect(Math.abs(a.support!.accel!.x)).toBeLessThan(0.001);
    expect(Math.abs(a.support!.tipAccel!.x)).toBeLessThan(0.001);
    for (let k = 0; k < 40; k++) w.step([STANDING], 0.05);
    expect(a.support!.state).toBe('up');
    expect(Math.hypot(a.support!.xi.x, a.support!.xi.y)).toBeLessThan(0.001);
  });

  it('a lean into a load that disappears is an overextension', () => {
    const a = body(120, 0, 0), b = body(120, 0.75, 0, 0, 0, Math.PI);
    const w = new World([a, b]);
    for (let k = 0; k < 20; k++) w.step([{ vel: { x: 3, y: 0 }, push: 1 }, { vel: { x: -3, y: 0 }, push: 1 }], 0.05);
    expect(Math.hypot(a.support!.lean.x, a.support!.lean.y)).toBeGreaterThan(500);
    expect(Math.abs(a.pos.x)).toBeLessThan(0.3);
    // The opponent steps aside; the leaning body lurches into the void.
    b.pos = { x: 0.75, y: 3 }; b.vel = { x: 0, y: 0 };
    let peak = 0;
    for (let k = 0; k < 6; k++) { w.step([{ vel: { x: 3, y: 0 }, push: 1 }, STANDING], 0.05); peak = Math.max(peak, a.support!.xi.x); }
    expect(peak).toBeGreaterThan(0.1);
  });

  it('balance belongs to the body: a new contact does not restore it', () => {
    const a = body(120, 0, 0), b = body(100, 0.7, 0, -6, 0, Math.PI);
    const w = new World([a, b]);
    w.step([STANDING, FREE], 0.05);
    const deviated = Math.hypot(a.support!.xi.x, a.support!.xi.y);
    expect(deviated).toBeGreaterThan(0.05);
    // A different joint attaches immediately: nothing resets the body state.
    w.joints = [{ kind: 'hands', a, b, extension: 0.9, push: 800, hold: 0, steer: 200 }];
    expect(Math.hypot(a.support!.xi.x, a.support!.xi.y)).toBe(deviated);
  });

  it('held legs trip a carrier who keeps running over them', () => {
    const c = body(95, 0, 0, 6, 0), d = body(100, -0.6, 0.1, 1, 0);
    const w = new World([c, d]);
    w.joints.push({ kind: 'grasp', a: d, b: c, reach: 1.3, capacity: 1600, legs: 1 });
    let fell = -1;
    for (let k = 0; k < 20 && fell < 0; k++) if (w.step([{ vel: { x: 7, y: 0 }, push: 1 }, { vel: { x: -2, y: 0 }, push: 1 }], 0.05).falls.includes(0)) fell = k;
    expect(fell).toBeGreaterThanOrEqual(0);
    expect(c.support!.cause).toBe('legs');
  });
});

describe('ground force budget', () => {
  it('lateral demand reduces the force left to resist a push', () => {
    const resist = (lateral: number) => {
      const a = body(130, 0, 0, -1), w = new World([a]);
      // Same observed load and committed brace, before the next contact.
      // Measure ground-force allocation: a bounded hand joint no longer
      // guarantees the old fixture stays square for 1.5 seconds.
      a.support!.felt={x:-1000,y:0};a.support!.lean={x:800,y:0};
      return w.step([{vel:{x:0,y:lateral},push:1}],.05).groundImpulse[0].x;
    };
    expect(resist(5)).toBeLessThan(resist(0));
  });

  it('a player who has lost his base cannot anchor', () => {
    const a = body(130, 0, 0), b = body(130, 0.8, 0, 0, 0, Math.PI);
    const w = new World([a, b]);
    for (let k = 0; k < 10; k++) w.step([{ vel: { x: 0, y: 0 }, push: 1 }, { vel: { x: -3, y: 0 }, push: 1 }], 0.05);
    const held = a.pos.x;
    a.support!.xi = { x: -0.9, y: 0 };
    for (let k = 0; k < 10; k++) w.step([{ vel: { x: 0, y: 0 }, push: 1 }, { vel: { x: -3, y: 0 }, push: 1 }], 0.05);
    expect(a.pos.x - held).toBeLessThan(-0.15);
  });
});

describe('holds and hands', () => {
  it('a grip within its capacity drags without slipping; beyond it the hold slides and breaks', () => {
    const drag = (capacity: number) => {
      const c = body(95, 0, 0, 7, 0), d = body(100, -0.55, 0, 7, 0);
      const w = new World([c, d]);
      const g: GraspJoint = { kind: 'grasp', a: d, b: c, reach: 1.0, capacity, legs: 0 };
      w.joints.push(g);
      for (let k = 0; k < 20 && !g.broken; k++) w.step([{ vel: { x: 8, y: 0 }, push: 1 }, { vel: { x: 0, y: 0 }, push: 1 }], 0.05);
      return { g, c, d };
    };
    const strong = drag(4000);
    expect(strong.g.broken).toBeFalsy();
    expect(Math.hypot(strong.c.pos.x - strong.d.pos.x, strong.c.pos.y - strong.d.pos.y)).toBeLessThan(1.0);
    const weak = drag(150);
    expect(weak.g.broken).toBe(true);
  });

  it('hand pressure is bounded: a stronger drive collapses the arms to the torso', () => {
    const a = body(120, 0, 0), b = body(120, 0.95, 0, 0, 0, Math.PI, { power: 170 });
    const w = new World([a, b]);
    const hands: HandJoint = { kind: 'hands', a, b, extension: 0.95, push: 300, hold: 0, steer: 0 };
    w.joints.push(hands);
    for (let k = 0; k < 30; k++) w.step([STANDING, { vel: { x: -3, y: 0 }, push: 1 }], 0.05);
    expect(hands.normalForce!).toBeLessThanOrEqual(300 + 1e-6);
    expect(b.pos.x - a.pos.x).toBeLessThan(0.85);
  });

  it('steering through latched hands moves the opponent laterally; without it he slides by', () => {
    const run = (steer: number) => {
      const a = body(130, 0, 0), b = body(115, 0.9, 0, 0, 0, Math.PI);
      const w = new World([a, b]);
      w.joints.push({ kind: 'hands', a, b, extension: 0.9, push: 900, hold: 200, steer });
      // Square to each other: the rusher works sideways, the blocker mirrors.
      for (let k = 0; k < 20; k++) w.step([{ vel: { x: 0, y: -2 }, facing: 0, push: 1 }, { vel: { x: -1, y: 4 }, facing: Math.PI, push: 1 }], 0.05);
      return b.pos.y - a.pos.y;
    };
    expect(run(900)).toBeLessThan(run(0) - 0.3);
  });
});

describe('angular response', () => {
  it('an off-center contact spins the body and the feet bring it back', () => {
    // A moderate glancing hit: a player knocked off his feet cannot use the
    // same yaw-recovery controller (hard hits have their own fall checks).
    const a = body(100, 0, 0, 0, 0, 0), b = body(100, 0.35, 0.45, -1, -5, -Math.PI / 2);
    // Slow enough foot-yaw response to observe the disturbance at 20 Hz;
    // quicker feet can already remove this modest spin inside the first tick.
    a.profile.turnRate = 2;
    const w = new World([a, b]);
    w.step([{ vel: { x: 0, y: 0 }, facing: 0 }, FREE], 0.05);
    // Inelastic contact: friction acts with the impulse that stopped the
    // approach, a modest but real twist.
    const turned = Math.abs(a.facing);
    expect(turned).toBeGreaterThan(0.005);
    for (let k = 0; k < 20; k++) w.step([{ vel: { x: 0, y: 0 }, facing: 0 }, FREE], 0.05);
    expect(Math.abs(a.facing)).toBeLessThan(turned);
  });
});

describe('temporal stability', () => {
  it('integrates the recovery-step ramp consistently across time subdivisions', () => {
    const recover = (outsideFor: number, dt: number, count: number) => {
      const b = body(100, 0, 0), w = new World([b]);
      b.support!.xi = {x:.5,y:0};b.support!.out = outsideFor;
      // Grounded, without a locomotion or posture request: corrective steps
      // need ground support. FREE also represents airborne motion.
      for(let k=0;k<count;k++) {
        b.energy=1; // Isolate support integration from tick-level metabolism.
        w.step([{vel:{x:0,y:0},posture:b.support!.posture}],dt);
      }
      expect(b.support!.state).toBe('up');
      return b.support!.xi.x;
    };
    // Before, across and after the 120 ms recovery latency. Tick-end stepping
    // used over the whole step used to recover more in coarse subdivisions.
    for(const outsideFor of [.02,.09,.13])
      expect(recover(outsideFor,.05,1)).toBeCloseTo(recover(outsideFor,.01,5),11);
  });

  it('continues settling inside the base after recovery crosses it mid-step', () => {
    const recover = (outsideFor:number,dt:number,count:number) => {
      const b=body(100,0,0),w=new World([b]);
      const base=baseRadiusAt(supportParams(b.profile),b.support!.posture);
      b.support!.xi={x:base+.02,y:0};b.support!.out=outsideFor;
      for(let k=0;k<count;k++) {
        b.energy=1;
        w.step([{vel:{x:0,y:0},posture:b.support!.posture}],dt);
      }
      expect(b.support!.state).toBe('up');expect(b.support!.xi.x).toBeLessThan(base);
      expect(b.support!.out).toBe(0);
      return b.support!.xi.x;
    };
    // Crossing during the ramp and after the stepping speed has settled.
    for(const outsideFor of [.06,.13])
      expect(recover(outsideFor,.05,1)).toBeCloseTo(recover(outsideFor,.01,5),10);
  });

  it('a hit is inelastic: the same momentum changes hands at any substep count', () => {
    const dv = (n: number) => {
      // Isolate passive momentum transfer before either body falls. A harder
      // high hit now causes a fall, whose ground impulses also change velocity.
      const a = body(80, 0, 0, 6, 0), b = body(105, 0, 1.35, 6, -3, -Math.PI / 2);
      const w = new World([a, b], { substeps: n });
      // Measure after impact but before a passive, non-stepping body loses
      // its base. Later fall/friction impulses are a separate interaction.
      for (let k = 0; k < 7; k++) {
        const report = w.step([FREE, FREE], 0.05);
        expect(report.falls).toEqual([]);
      }
      return -a.vel.y;
    };
    // Perfectly inelastic sideways hit: 105/(80+105) of the 3 yd/s closing.
    for (const n of [6, 12, 48]) expect(dv(n)).toBeCloseTo((105 / 185) * 3, 3);
  });

  const scene = (substeps: number, speed: number) => {
    const a = body(110, 0, 0, speed, 0), b = body(95, 1.6, 0.25, -speed / 2, 0, Math.PI), c = body(120, 1.2, -1.4, 0, speed);
    const w = new World([a, b, c], { substeps });
    const falls: number[] = [];
    for (let k = 0; k < 16; k++) {
      const r = w.step([{ vel: { x: speed, y: 0 }, push: 1 }, { vel: { x: -speed / 2, y: 0 }, push: 1 }, { vel: { x: 0, y: speed } }], 0.05);
      falls.push(...r.falls);
    }
    return { pos: [a, b, c].map((q) => ({ ...q.pos })), falls };
  };

  it('contact motion converges as the physics substep is refined, controllers fixed at 20 Hz', () => {
    // Compare continuous contact motion below the knockdown discontinuity;
    // the separate threshold test exercises the transition into a fall.
    const ref = scene(512, 2.5);
    expect(ref.falls).toEqual([]);
    const err = (n: number) => scene(n, 2.5).pos.reduce((s, p, i) => s + Math.hypot(p.x - ref.pos[i].x, p.y - ref.pos[i].y), 0);
    const e8 = err(8), e16 = err(16), e32 = err(32),e64=err(64);
    // Contact-order changes need not improve at every adjacent resolution.
    // Preserve the absolute gate and require improvement across the grid;
    // the finer numerical reference avoids a misleading local cancellation.
    // The coarse pair can trade places (start law #336: e8 0.023, e16 0.025;
    // develop 0.033, 0.016); both sit well above the refined errors.
    expect(e32).toBeLessThan(Math.min(e8, e16) * .5);
    expect(e64).toBeLessThan(e32*.75);
    expect(e32).toBeLessThan(0.04);
  });

  it('the knockdown threshold converges as the physics substep is refined', () => {
    // Bisect the closing speed at which a standing player is knocked down.
    const threshold = (substeps: number) => {
      let lo = 2, hi = 16;
      for (let k = 0; k < 14; k++) {
        const mid = (lo + hi) / 2;
        const a = body(100, 0, 0, mid, 0), b = body(90, 0.8, 0, 0, 0, Math.PI);
        const w = new World([a, b], { substeps });
        let fell = false;
        for (let s = 0; s < 12 && !fell; s++) fell = w.step([FREE, STANDING], 0.05).falls.includes(1);
        if (fell) hi = mid; else lo = mid;
      }
      return (lo + hi) / 2;
    };
    const ref = threshold(96);
    expect(ref).toBeGreaterThan(4);
    expect(ref).toBeLessThan(12);
    const d8 = Math.abs(threshold(8) - ref), d16 = Math.abs(threshold(16) - ref), d32 = Math.abs(threshold(32) - ref);
    expect(d16).toBeLessThanOrEqual(d8 + 0.02);
    expect(d32).toBeLessThanOrEqual(d16 + 0.02);
    expect(d16).toBeLessThan(0.3);
  });
});
