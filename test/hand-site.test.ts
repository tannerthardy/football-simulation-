/** HAND_SITE (engagement.ts handSite; experimental, off): a hands joint's working length follows where the hand is
 * on the man, continuous in his bearing off the holder's chest; push and steer follow the hand's place. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Vec2 } from '../src/core/vec.js';
import type { PhysicalProfile } from '../src/players/physical.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const profile = (mass: number): PhysicalProfile => ({ massKg: mass, radius: 0.3, reach: 0.25 + 0.95 * 0.85, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
  reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 });
/** The fields handSite reads: position, profile and the body's facing. */
const agent = (pos: Vec2, facing: number) => {
  const body: any = { pos, vel: { x: 0, y: 0 }, facing, profile: profile(140) };
  return { pos, body, profile: body.profile } as any;
};
const joint = (a: any, b: any) => ({ kind: 'hands', a: a.body, b: b.body, actor: a.body, extension: 1.5, push: 1000, hold: 300, steer: 500 }) as any;

async function site() {
  vi.resetModules();
  vi.stubEnv('HAND_SITE', '1');
  return (await import('../src/sim/engagement.js')).handSite;
}

describe('HAND_SITE', () => {
  it('the man in front (within 45 deg of the chest): every joint parameter is untouched, so its forces are off\'s', async () => {
    const handSite = await site();
    for (const deg of [0, 20, -30, 44]) {
      const b = agent({ x: 0, y: 0 }, 0), r = (deg * Math.PI) / 180;
      const d = agent({ x: Math.cos(r), y: Math.sin(r) }, Math.PI + 0.7);
      const j = joint(b, d), before = { ...j };
      for (let k = 0; k < 20; k++) handSite({ dt: 0.05 }, j, b, d);
      expect(j).toEqual(before);
    }
  });

  it('abreast: the length bends toward bodies + a forearm, no faster than HAND_TRAVEL, and straightens back in front', async () => {
    const handSite = await site();
    const { HAND_TRAVEL } = await import('../src/physics/actuation.js');
    const b = agent({ x: 0, y: 0 }, 0), d = agent({ x: -0.3, y: 1 }, 0); // abreast, a little behind his shoulder (106 deg)
    const j = joint(b, d); const seen: number[] = [];
    for (let k = 0; k < 30; k++) { j.extension = 1.5; j.push = 1000; j.steer = 500; handSite({ dt: 0.05 }, j, b, d); seen.push(j.extension); }
    expect(1.5 - seen[0]).toBeCloseTo(HAND_TRAVEL * 0.05, 9);
    for (let k = 1; k < seen.length; k++) expect(Math.abs(seen[k] - seen[k - 1])).toBeLessThanOrEqual(HAND_TRAVEL * 0.05 + 1e-12);
    expect(seen.at(-1)).toBeCloseTo(0.6 + 0.1, 9);
    // Back in front: it straightens at arm speed, then leaves the joint as off would.
    d.pos.x = 1; d.pos.y = 0; d.body.facing = Math.PI;
    const back: number[] = [];
    for (let k = 0; k < 30; k++) { j.extension = 1.5; j.push = 1000; j.steer = 500; handSite({ dt: 0.05 }, j, b, d); back.push(j.extension); }
    expect(back[0] - 0.7).toBeCloseTo(HAND_TRAVEL * 0.05, 9);
    expect(back.at(-1)).toBe(1.5);
  });

  it('push follows the hand\'s place: full on his side, none on his back; steer half of it abreast; hold unchanged', async () => {
    const handSite = await site();
    const b = agent({ x: 0, y: 0 }, 0);
    const side = agent({ x: -0.3, y: 1 }, 0);        // abreast (106 deg off his chest); the holder at the man's side
    const back = agent({ x: -0.3, y: 1 }, Math.PI / 2); // the man facing away from the holder (at his back)
    const js = joint(b, side), jb = joint(b, back);
    handSite({ dt: 0.05 }, js, b, side); handSite({ dt: 0.05 }, jb, b, back);
    expect(js.push).toBeCloseTo(1000, 9); expect(js.steer).toBeCloseTo(250, 9); expect(js.hold).toBe(300);
    expect(jb.push).toBe(0); expect(jb.steer).toBe(0); expect(jb.hold).toBe(300);
  });

  it('continuous in bearing: no step in the target length, push or steer as the man comes round', async () => {
    const handSite = await site();
    const b = agent({ x: 0, y: 0 }, 0);
    let prev: { e: number; p: number; s: number } | null = null;
    for (let deg = 0; deg <= 180; deg += 0.5) {
      const r = (deg * Math.PI) / 180, d = agent({ x: Math.cos(r), y: Math.sin(r) }, 0);
      const j = joint(b, d); handSite({ dt: 1e3 } as any, j, b, d); // a long dt: the length reaches its target
      const now = { e: j.extension, p: j.push, s: j.steer };
      if (prev) { expect(Math.abs(now.e - prev.e)).toBeLessThan(0.02); expect(Math.abs(now.p - prev.p)).toBeLessThan(25); expect(Math.abs(now.s - prev.s)).toBeLessThan(15); }
      prev = now;
    }
  });
});
