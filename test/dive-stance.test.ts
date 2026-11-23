import { describe, expect, it, vi } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import type { PhysicalProfile } from '../src/players/physical.js';

const profile: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5,
  bend: .5, stepSpeed: 3.4, getUp: .9 };

async function dive(stance: boolean, speed: number, power = 100) {
  vi.resetModules();
  vi.stubEnv('DIVE_STANCE', stance ? '1' : '0');
  const { World } = await import('../src/physics/world.js');
  const b: Body = { pos: { x: 0, y: 0 }, vel: { x: speed, y: 0 }, facing: 0, spin: 0, energy: 1, profile: { ...profile, power } };
  const w = new World([b], {});
  let tFall = -1, v = speed, x = 0, t = 0;
  for (let k = 0; k < 20; k++) {
    w.step([k === 0 ? { vel: { x: speed, y: 0 }, dive: { x: 1, y: 0 } } : { vel: { x: 0, y: 0 }, free: true }], .05); t += .05;
    if (tFall < 0 && b.support!.state !== 'up') { tFall = t; v = b.vel.x; x = b.pos.x; }
  }
  vi.unstubAllEnvs();
  return { tFall, gain: v - speed, x };
}

describe('DIVE_STANCE: the dive push-off is a stance phase on the stride\'s own force law', () => {
  it('off is the one-tick plant: 0.59 yd/s whatever his speed, off his feet after one tick', async () => {
    for (const speed of [0, 3, 6]) {
      const r = await dive(false, speed);
      expect(r.tFall).toBeCloseTo(0.05, 9);
      expect(r.gain).toBeCloseTo(1.1 * 10.7 * .05, 1);
    }
  });
  it('on, he pushes for the stance (0.12 s, so he is off his feet at the end of the third tick)', async () => {
    const r = await dive(true, 3);
    expect(r.tFall).toBeCloseTo(0.15, 9);
  });
  it('on, the gain is the leg force over the stance, falls with his speed along the line and is nothing at top speed', async () => {
    const gains = [] as number[];
    for (const speed of [0, 3, 6, 9]) gains.push((await dive(true, speed)).gain);
    expect(gains[0]).toBeGreaterThan(1.0);
    expect(gains[0]).toBeLessThan(1.6);
    for (let i = 1; i < gains.length; i++) expect(gains[i]).toBeLessThan(gains[i - 1]);
    expect(gains[3]).toBeCloseTo(0, 6);
  });
  it('on, a stronger leg gives more (the same legs as the stride: leg force, traction-capped)', async () => {
    const weak = (await dive(true, 3, 70)).gain, strong = (await dive(true, 3, 130)).gain;
    expect(strong).toBeGreaterThan(weak);
    expect((await dive(true, 3, 400)).gain).toBeCloseTo((await dive(true, 3, 200)).gain, 9); // traction caps it
  });
});
