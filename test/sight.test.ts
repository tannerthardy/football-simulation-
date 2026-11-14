/** SEE_SIGHT plumbing (src/sim/sight.ts): line of sight with body heights and posture. Geometry only; no consumer. */
import { describe, expect, it } from 'vitest';
import { bodyHeight, EYE, lineOfSight, SHOULDER } from '../src/sim/sight.js';

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
