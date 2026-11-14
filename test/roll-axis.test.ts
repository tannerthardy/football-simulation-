/** ROLL_AXIS (tackle.ts): a secure wrap's roll axis is continuous in the runner's velocity. Without it the axis
 * switched to the attack direction below 0.3 yd/s and otherwise followed the runner's velocity direction, so at a
 * walk, where the roll's own push swings that direction, the holder's side of the axis (and his roll request) flipped
 * every tick (the commitment rule: a post-decision stage never flips a request as a step function of motion). */
import { describe, expect, it } from 'vitest';
import { rollAxis } from '../src/sim/tackle.js';

const side = (u: { x: number; y: number }, off: { x: number; y: number }) => Math.sign(off.x * -u.y + off.y * u.x);

describe('ROLL_AXIS: roll axis', () => {
  it('is a unit vector that follows a running carrier and the attack direction at a stop', () => {
    const fast = rollAxis({ x: 0, y: 6 }, 1);
    expect(Math.hypot(fast.x, fast.y)).toBeCloseTo(1, 9);
    expect(fast.y).toBeGreaterThan(0.98);
    expect(rollAxis({ x: 0, y: 0 }, -1)).toEqual({ x: -1, y: 0 });
  });

  it('keeps the holder on one side while a walking carrier is jostled (the 2-cycle scene: 0.3-0.7 yd/s)', () => {
    // Holder beside the carrier, offset across the field; the carrier's walk direction swings through 180 deg.
    const off = { x: 0.1, y: 0.6 }, sides = new Set<number>();
    for (let a = 0; a < 2 * Math.PI; a += Math.PI / 12) for (const s of [0.3, 0.5, 0.7])
      sides.add(side(rollAxis({ x: s * Math.cos(a), y: s * Math.sin(a) }, 1), off));
    expect([...sides]).toEqual([1]);
  });

  it('changes continuously across the old 0.3 yd/s switch', () => {
    let prev = rollAxis({ x: 0, y: 0.2 }, 1);
    for (let s = 0.2; s <= 0.4 + 1e-9; s += 0.01) {
      const u = rollAxis({ x: 0, y: s }, 1);
      expect(Math.acos(Math.min(1, u.x * prev.x + u.y * prev.y))).toBeLessThan(0.02);
      prev = u;
    }
  });
});
