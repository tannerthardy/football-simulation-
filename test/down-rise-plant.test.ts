import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import type { PhysicalProfile } from '../src/players/physical.js';

const profile: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
  vmax: 10, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5,
  bend: .5, stepSpeed: 3.4, getUp: .9 };

/** A body at speed v dives; follow its states every 0.05 s until it is up. The flag is read at import, so each arm loads a fresh module. */
async function dive(on: boolean, v: number, carrier = false) {
  vi.resetModules();
  process.env.DOWN_RISE_PLANT = on ? '1' : '0';
  const { World } = await import('../src/physics/world.js');
  const { newSupport } = await import('../src/physics/support.js');
  const b: Body = { pos: { x: 0, y: 0 }, vel: { x: v, y: 0 }, facing: 0, energy: 1, profile: { ...profile }, support: newSupport(0.3) };
  const w = new World([b]);
  if (carrier) w.ballCarrier = () => b;
  let tFall = NaN, tDown = NaN, tRise = NaN, tUp = NaN, x0 = 0, xUp = 0;
  for (let k = 0; k < 140; k++) {
    (w as any).time = k * .05;
    w.step([{ vel: { x: 12, y: 0 }, dive: k === 2 ? { x: 1, y: 0 } : undefined, effort: 1 }], .05); b.energy = 1;
    const s = b.support!.state, t = k * .05;
    if (s === 'falling' && Number.isNaN(tFall)) { tFall = t; x0 = b.pos.x; }
    if (s === 'down' && Number.isNaN(tDown)) tDown = t;
    if (s === 'rising' && Number.isNaN(tRise)) tRise = t;
    if (s === 'up' && !Number.isNaN(tFall)) { tUp = t; xUp = b.pos.x; break; }
  }
  return { slide: tRise - tDown, off: tUp - tFall, distance: xUp - x0, speedUp: Math.hypot(b.vel.x, b.vel.y) };
}

afterEach(() => { delete process.env.DOWN_RISE_PLANT; vi.resetModules(); });

describe('DOWN_RISE_PLANT (default on since engine-84): a free body rises on the speed he would stand at, not only after he has slid to rest', () => {
  it('off: a diver at 8 yd/s slides about a second in `down` before he starts to rise', async () => {
    const r = await dive(false, 8);
    expect(r.slide).toBeGreaterThan(0.9);
    expect(r.off).toBeGreaterThan(2.3);
  });
  it.each([4, 6, 8, 9.5])('on: the slide stops adding to the time off his feet at %f yd/s; the distance and the speed he is up at do not change', async (v) => {
    const off = await dive(false, v), on = await dive(true, v);
    expect(on.slide).toBeLessThan(0.36);
    expect(on.off).toBeLessThan(off.off);
    expect(on.off).toBeLessThan(1.75);
    expect(on.distance).toBeCloseTo(off.distance, 1);
    expect(on.speedUp).toBeLessThan(0.3);
  });
  it('on: the ball carrier is identical to flag off (the whistle and spot read his slide to rest)', async () => {
    for (const v of [4, 8]) expect(await dive(true, v, true)).toEqual(await dive(false, v, true));
  });
});
