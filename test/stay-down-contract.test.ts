/** Contract for the proposed World hook `Intent.stayDown` (a deliberate
 * ground action, e.g. a downed holder finishing a tackle). The physics owner
 * implements the hook in World; until then these tests run against the
 * diagnostic emulation imported below. When the native hook lands, delete
 * that import: the same assertions must hold for the engine itself.
 *
 * Contract: while set, a downed body does not start rising. It has no effect
 * on an upright, falling or rising body, nor on ground friction. Clearing it
 * restores the ordinary rule at once. The World never infers it from a grip.
 */
import { describe, expect, it } from 'vitest';
import type { PhysicalProfile } from '../src/players/physical.js';
import type { Body } from '../src/physics/kinematics.js';
import { World, type GraspJoint, type Intent } from '../src/physics/world.js';
import '../scripts/diag/tackle/stay-down-hook.js';

type StayIntent = Intent & { stayDown?: boolean };
function profile(mass: number): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 };
}
const body = (mass: number, x: number, y: number, vx = 0, vy = 0): Body =>
  ({ pos: { x, y }, vel: { x: vx, y: vy }, facing: 0, energy: 1, profile: profile(mass) });
const STAND: StayIntent = { vel: { x: 0, y: 0 } };
const STAY: StayIntent = { vel: { x: 0, y: 0 }, stayDown: true };
const DT = 0.05;
function downed(w: World, b: Body, since = 0) { b.support!.state = 'down'; b.support!.since = since; }
/** Steps until `until` seconds, choosing each tick's intents; returns the state history. */
function run(w: World, bodies: Body[], until: number, intents: (t: number) => StayIntent[]) {
  const states: string[][] = [];
  while (w.time < until - 1e-9) { w.step(intents(w.time), DT); states.push(bodies.map((b) => b.support!.state)); }
  return states;
}
const firstAt = (states: string[][], k: number, s: string) => states.findIndex((r) => r[k] === s);

describe('stayDown: a deliberate ground action', () => {
  it('ordinary get-up is unchanged without it', () => {
    const a = body(100, 0, 0), w = new World([a]); w.step([STAND], DT); downed(w, a, w.time);
    const states = run(w, [a], 3, () => [STAND]);
    const rise = firstAt(states, 0, 'rising'), up = firstAt(states, 0, 'up');
    expect(rise).toBeGreaterThanOrEqual(0); expect(up).toBeGreaterThan(rise);
  });

  it('keeps a downed, resting body down while set', () => {
    const a = body(100, 0, 0), w = new World([a]); w.step([STAND], DT); downed(w, a, w.time);
    const states = run(w, [a], 4, () => [STAY]);
    expect(states.every((r) => r[0] === 'down')).toBe(true);
  });

  it('clearing it restores the ordinary rule at once', () => {
    const ref = body(100, 0, 0), wr = new World([ref]); wr.step([STAND], DT); downed(wr, ref, wr.time);
    const a = body(100, 0, 0), w = new World([a]); w.step([STAND], DT); downed(w, a, w.time);
    run(w, [a], 2, () => [STAY]);
    const cleared = w.time, after = run(w, [a], cleared + 2, () => [STAND]);
    const base = run(wr, [ref], 2.05 + 2, () => [STAND]);
    // A rested body has already served the 0.3 s on the ground, so it starts
    // rising on the first step without the request, and the get-up takes the
    // ordinary time (to within one 0.05 s tick: the rise begins on a
    // different substep of the tick).
    expect(firstAt(after, 0, 'rising')).toBe(0);
    const getUp = (s: string[][]) => firstAt(s, 0, 'up') - firstAt(s, 0, 'rising');
    expect(Math.abs(getUp(after) - getUp(base))).toBeLessThanOrEqual(1);
  });

  it('does nothing to an upright, falling or rising body', () => {
    for (const start of ['up', 'falling', 'rising'] as const) {
      const make = () => { const b = body(100, 0, 0, 2, 0), w = new World([b]); w.step([STAND], DT);
        if (start !== 'up') { b.support!.state = start; b.support!.since = w.time; if (start === 'falling') b.support!.fall = { x: 1, y: 0 }; }
        return { b, w }; };
      const p = make(), q = make();
      const sp = run(p.w, [p.b], 2.5, () => [{ vel: { x: 2, y: 0 } }]);
      const sq = run(q.w, [q.b], 2.5, () => [{ vel: { x: 2, y: 0 }, stayDown: true }]);
      if (start === 'falling') {
        // A fall still completes; the request only matters once he is down.
        expect(firstAt(sq, 0, 'down')).toBe(firstAt(sp, 0, 'down'));
        continue;
      }
      expect(sq).toEqual(sp);
      expect(q.b.pos.x).toBe(p.b.pos.x); expect(q.b.vel.x).toBe(p.b.vel.x);
    }
  });

  it('a live grip alone does not freeze a downed holder', () => {
    const a = body(100, 0, 0), c = body(95, 0.8, 0), w = new World([a, c]);
    w.joints.push({ kind: 'grasp', a, b: c, reach: 1.4, capacity: 900, legs: 0.5, pull: 0 } as GraspJoint);
    w.step([STAND, STAND], DT); downed(w, a, w.time);
    const states = run(w, [a, c], 3, () => [STAND, STAND]);
    expect(firstAt(states, 0, 'rising')).toBeGreaterThanOrEqual(0);
  });

  it('ground friction on a dragged, downed holder is unchanged while it is set', () => {
    const make = () => { const a = body(100, 0, 0), c = body(95, 0.8, 0, 3, 0), w = new World([a, c]);
      w.joints.push({ kind: 'grasp', a, b: c, reach: 1.4, capacity: 900, legs: 0.5, pull: 0 } as GraspJoint);
      w.step([STAND, { vel: { x: 3, y: 0 } }], DT); downed(w, a, w.time); return { a, c, w }; };
    const p = make(), q = make();
    // Both dragged faster than the rise threshold: the request changes nothing.
    for (let k = 0; k < 6; k++) { p.w.step([STAND, { vel: { x: 3, y: 0 } }], DT); q.w.step([STAY, { vel: { x: 3, y: 0 } }], DT); }
    expect(q.a.pos).toEqual(p.a.pos); expect(q.a.vel).toEqual(p.a.vel); expect(q.c.pos).toEqual(p.c.pos);
  });

  it('is mirror-symmetric', () => {
    const make = (s: 1 | -1) => { const a = body(100, 0, 0), c = body(95, 0.6, 0.5 * s, 1, 0.5 * s), w = new World([a, c]);
      w.joints.push({ kind: 'grasp', a, b: c, reach: 1.4, capacity: 900, legs: 0.5, pull: 0 } as GraspJoint);
      w.step([STAND, STAND], DT); downed(w, a, w.time); return { a, c, w }; };
    const p = make(1), q = make(-1);
    const sp = run(p.w, [p.a, p.c], 3, () => [STAY, { vel: { x: 1, y: 0.5 } }]);
    const sq = run(q.w, [q.a, q.c], 3, () => [STAY, { vel: { x: 1, y: -0.5 } }]);
    expect(sq).toEqual(sp);
    expect(q.a.pos.x).toBeCloseTo(p.a.pos.x, 9); expect(q.a.pos.y).toBeCloseTo(-p.a.pos.y, 9);
    expect(q.c.pos.y).toBeCloseTo(-p.c.pos.y, 9);
  });
});
