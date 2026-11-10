/**
 * PASS_ANCHOR's physics request (src/physics/world.ts, Intent.growth): an
 * anchor leans only as hard as the load it feels, so when the load is taken
 * away no lean beyond it is left to carry him into the space. A request the lean law
 * reads, not an outcome: the anchored body is still pushed by a stronger one.
 */
import { describe, expect, it } from 'vitest';
import { World } from '../src/physics/world.js';
import type { Body } from '../src/physics/kinematics.js';
import type { PhysicalProfile } from '../src/players/physical.js';

function profile(mass: number): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass * 1.0, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 };
}
const body = (mass: number, x: number, facing: number): Body => ({ pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing, energy: 1, profile: profile(mass) });

// A 140 kg blocker holding his ground (requested velocity 0) against a rusher
// driving into him.
function lockUp(growth: number | undefined, rusherMass = 120) {
  const a = body(140, 0, 0), b = body(rusherMass, 0.75, Math.PI);
  const w = new World([a, b]);
  let ratio = 0;
  for (let k = 0; k < 20; k++) {
    w.step([{ vel: { x: 0, y: 0 }, push: 1, growth, posture: 0.6 }, { vel: { x: -3, y: 0 }, push: 1 }], 0.05);
    const s = a.support!; ratio = Math.max(ratio, Math.hypot(s.felt.x, s.felt.y) > 200 ? Math.hypot(s.lean.x, s.lean.y) / Math.hypot(s.felt.x, s.felt.y) : 0);
  }
  return { ratio, x: a.pos.x, state: a.support!.state };
}

describe('anchor lean (Intent.growth)', () => {
  it('leans to the felt load, not past it; the default lean grows past it', () => {
    const drive = lockUp(undefined), anchor = lockUp(0);
    expect(drive.ratio).toBeGreaterThan(1.15);
    expect(anchor.ratio).toBeLessThan(1.02);
    // Holding his ground is not bought by the lean beyond the load.
    expect(Math.abs(anchor.x - drive.x)).toBeLessThan(0.02);
  });
  it('an anchored blocker is still walked back by a heavier rusher', () => {
    const anchor = lockUp(0, 160);
    expect(anchor.x).toBeLessThan(lockUp(0).x - 0.03);
    expect(anchor.state).toBe('up');
  });
});
