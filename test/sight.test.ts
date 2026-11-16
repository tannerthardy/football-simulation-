/** SEE_SIGHT plumbing (src/sim/sight.ts): line of sight with body heights and posture. Geometry only; no consumer. */
import { describe, expect, it } from 'vitest';
import { bodyHeight, EYE, lineOfSight, SHOULDER, SightFrame } from '../src/sim/sight.js';

const YD = 1 / 36;
function body(x: number, y: number, heightIn: number, posture = 0.2, state: 'up' | 'down' = 'up', radius = 0.3): any {
  const profile = { massKg: 110, radius, reach: 0.8, heightYd: heightIn * YD, vmax: 8, tau: 1.2, brake: 6, lateral: 6,
    turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.4, reactionTime: 0.25 };
  return { pos: { x, y }, profile, body: { support: { state, posture } } };
}

describe('lineOfSight: bodies are a torso up to the shoulder and a head up to full height', () => {
  it('heights follow stature and posture; a man on the ground is low', () => {
    const up = body(0, 0, 76, 0), low = body(0, 0, 76, 1), down = body(0, 0, 76, 0.2, 'down');
    expect(bodyHeight(up, EYE)).toBeCloseTo(0.936 * 76 * YD, 6);
    expect(bodyHeight(low, SHOULDER)).toBeLessThan(bodyHeight(up, SHOULDER) * 0.9);
    expect(bodyHeight(down, SHOULDER)).toBeLessThanOrEqual(0.35);
  });

  it('a tall QB sees a rusher over a crouched guard; a standing tackle in line hides him', () => {
    const qb = body(0, 0, 77), rusher = body(6, 0, 76);
    const guardLow = body(3, 0, 76, 1), tackleUp = body(3, 0, 78, 0);
    expect(lineOfSight([qb, rusher, guardLow], qb, rusher)).toBe(true);
    expect(lineOfSight([qb, rusher, tackleUp], qb, rusher)).toBe(false);
  });

  it('a short QB loses the helmet a tall one sees over the same guard', () => {
    const rusher = body(6, 0, 76), guard = body(2, 0, 72, 0.3);
    const tall = body(0, 0, 77), short = body(0, 0, 70);
    expect(lineOfSight([tall, rusher, guard], tall, rusher)).toBe(true);
    expect(lineOfSight([short, rusher, guard], short, rusher)).toBe(false);
  });

  it('from his stance, a gap wider than a body is a window; a narrower one is not', () => {
    const back = body(0, 0, 70, 1), lb = body(6, 0, 74);
    const wide = [body(3, 0.45, 76, 0), body(3, -0.45, 76, 0)], tight = [body(3, 0.25, 76, 0), body(3, -0.25, 76, 0)];
    expect(lineOfSight([back, lb, ...wide], back, lb)).toBe(true);
    expect(lineOfSight([back, lb, ...tight], back, lb)).toBe(false);
  });

  it('the hands at the mesh can be hidden while the head shows: the query takes a height', () => {
    const lb = body(0, 0, 74), qb = body(6, 0, 76), guard = body(3, 0, 76, 0.6);
    expect(lineOfSight([lb, qb, guard], lb, qb)).toBe(true);
    expect(lineOfSight([lb, qb, guard], lb, qb, 1.1)).toBe(false);
  });

  it('a body touching either end does not stand between them, and a man on the ground blocks only low lines', () => {
    const o = body(0, 0, 74), t = body(5, 0, 74);
    expect(lineOfSight([o, t, body(0.2, 0, 76, 0)], o, t)).toBe(true);
    expect(lineOfSight([o, t, body(4.5, 0, 76, 0.2, 'down')], o, t)).toBe(true);
    expect(lineOfSight([o, t, body(4.5, 0, 76, 0.2, 'down')], o, t, 0)).toBe(false);
  });
});

describe('lineOfSight with recorded postures (SIGHT_PURE): a past sight line reads the heights of that tick', () => {
  const standing = { up: true, posture: 0 }, crouched = { up: true, posture: 1 }, onGround = { up: false, posture: 0 };
  it('a guard who was crouched then does not hide the rusher, whatever his posture now; and the reverse', () => {
    const qb = body(0, 0, 77), rusher = body(6, 0, 76), guardNowStanding = body(3, 0, 76, 0), guardNowLow = body(3, 0, 76, 1);
    const then = (p: { up: boolean; posture: number }) => (a: any) => (a === guardNowStanding || a === guardNowLow ? p : null);
    // Now's heights give two answers; the recorded pose gives one, the same for both bodies.
    expect(lineOfSight([qb, rusher, guardNowStanding], qb, rusher)).toBe(false);
    expect(lineOfSight([qb, rusher, guardNowLow], qb, rusher)).toBe(true);
    for (const g of [guardNowStanding, guardNowLow]) {
      expect(lineOfSight([qb, rusher, g], qb, rusher, undefined, (a) => a.pos, then(crouched))).toBe(true);
      expect(lineOfSight([qb, rusher, g], qb, rusher, undefined, (a) => a.pos, then(standing))).toBe(false);
    }
  });
  it('a body recorded on the ground blocks only low lines, and a recorded posture of the observer changes his eye', () => {
    const o = body(0, 0, 74), t = body(5, 0, 74), blocker = body(2.5, 0, 76, 0);
    const poseOf = (p: { up: boolean; posture: number }) => (a: any) => (a === blocker ? p : null);
    expect(lineOfSight([o, t, blocker], o, t, undefined, (a) => a.pos, poseOf(standing))).toBe(false);
    expect(lineOfSight([o, t, blocker], o, t, undefined, (a) => a.pos, poseOf(onGround))).toBe(true);
    expect(bodyHeight(blocker, SHOULDER, onGround)).toBeLessThanOrEqual(0.35);
    expect(bodyHeight(blocker, SHOULDER, crouched)).toBeLessThan(bodyHeight(blocker, SHOULDER, standing));
  });
  it('without a recorded pose the answer is the one before (heights as they are now)', () => {
    const qb = body(0, 0, 77), rusher = body(6, 0, 76), guard = body(3, 0, 76, 0.4);
    expect(lineOfSight([qb, rusher, guard], qb, rusher, undefined, (a) => a.pos, undefined)).toBe(lineOfSight([qb, rusher, guard], qb, rusher));
    expect(lineOfSight([qb, rusher, guard], qb, rusher, undefined, (a) => a.pos, () => null)).toBe(lineOfSight([qb, rusher, guard], qb, rusher));
  });
});

describe('SightFrame answers what lineOfSight answers (the per-tick history uses the frame)', () => {
  it('agrees on random scenes with recorded poses, every ordered pair', () => {
    let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    let falses = 0, trues = 0;
    for (let scene = 0; scene < 200; scene++) {
      const n = 8 + Math.floor(rnd() * 14);
      const bodies = Array.from({ length: n }, () => body(rnd() * 12, rnd() * 12, 66 + Math.floor(rnd() * 14), rnd(), rnd() < 0.1 ? 'down' : 'up', 0.24 + rnd() * 0.16));
      const poses = bodies.map(() => ({ up: rnd() > 0.1, posture: rnd() }));
      const frame = new SightFrame(n);
      bodies.forEach((b, i) => frame.set(i, b, b.pos.x, b.pos.y, poses[i]!));
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const want = lineOfSight(bodies, bodies[i]!, bodies[j]!, undefined, (a) => a.pos, (a) => poses[bodies.indexOf(a)]!);
        expect(frame.clear(i, j)).toBe(want);
        want ? trues++ : falses++;
      }
    }
    expect(falses).toBeGreaterThan(500); expect(trues).toBeGreaterThan(500);
  });
});
