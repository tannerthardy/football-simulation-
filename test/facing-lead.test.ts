import { describe, expect, it } from 'vitest';
import { angleDiff } from '../src/core/vec.js';
import { commandFacing, type Body } from '../src/physics/kinematics.js';

function body(vx: number, vy: number, facing = Math.atan2(vy, vx)): Body {
  return { pos: { x: 0, y: 0 }, vel: { x: vx, y: vy }, facing, spin: 0, energy: 1,
    profile: { massKg: 95, radius: .35, reach: 1, heightYd: 2, vmax: 9, tau: 1.2, brake: 6, lateral: 6, turnRate: 8,
      backpedal: .55, shuffle: .6, maxCatchHeight: 3, reactReach: 2.4, reactionTime: .25, power: 100, balance: .65,
      bend: .55, stepSpeed: 2.8, getUp: 1 } } as Body;
}

describe('default facing while carrying speed (film G1-P002, the SS "on ice")', () => {
  it('leads his actual path by at most 60 deg when he asks to reverse at speed', () => {
    // Running at 4.8 yd/s toward 47 deg, he asks for 159 deg.
    const b = body(4.8 * Math.cos(.82), 4.8 * Math.sin(.82));
    const f = commandFacing(b, { vel: { x: 9 * Math.cos(2.78), y: 9 * Math.sin(2.78) } });
    expect(Math.abs(angleDiff(.82, f))).toBeCloseTo(Math.PI / 3, 6);
    expect(Math.sign(angleDiff(.82, f))).toBe(1);
  });

  it('faces the new direction once he has planted', () => {
    const b = body(1.5, 0);
    expect(commandFacing(b, { vel: { x: -6, y: 0 } })).toBeCloseTo(Math.PI, 6);
  });

  it('leaves explicit facing and small corrections alone', () => {
    const b = body(6, 0);
    expect(commandFacing(b, { vel: { x: -6, y: 0 }, facing: 1 })).toBe(1);
    const along = commandFacing(b, { vel: { x: 6, y: 2 } });
    expect(along).toBeCloseTo(Math.atan2(2, 6), 6);
  });
});
