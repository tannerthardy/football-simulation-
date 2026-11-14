/** BASE_ORIENT (support.ts baseShape / shapeRadius, world.ts orient; experimental, off): the witness. One body, his
 * capture point displaced at 0 / 30 / 60 / 90 deg off his feet axis; the smallest displacement that puts him on the
 * ground, found by bisection. Off, every direction is the same (an isotropic base). On, a set body (standing, facing
 * +x) goes first along his facing (his base is wide across it); a running body (+x at 0.8 vmax) goes first across
 * his path (his stride is long along it). The aspects are choices; the direction dependence is the evidence (van
 * Mierlo et al. 2023; Hof 2005). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const profile = { massKg: 140, radius: .32, reach: 1, heightYd: 2.1, vmax: 7.5,
  tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 120, balance: .5 };

async function thresholds(flag: string, running: boolean): Promise<number[]> {
  vi.resetModules(); vi.stubEnv('BASE_ORIENT', flag);
  const { World } = await import('../src/physics/world.js');
  const { newSupport } = await import('../src/physics/support.js');
  const speed = running ? 0.8 * profile.vmax : 0;
  const falls = (deg: number, mag: number): boolean => {
    const b: any = { pos: { x: 0, y: 0 }, vel: { x: speed, y: 0 }, facing: 0, energy: 1, profile: { ...profile }, support: newSupport(0.4) };
    const w = new World([b]);
    const a = deg * Math.PI / 180;
    b.support.xi = { x: Math.cos(a) * mag, y: Math.sin(a) * mag };
    for (let k = 0; k < 30; k++) {
      w.step([{ vel: { x: speed, y: 0 }, facing: 0 }], 0.05);
      if (b.support.state !== 'up') return true;
    }
    return false;
  };
  return [0, 30, 60, 90].map((deg) => {
    let lo = 0.05, hi = 3;
    for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (falls(deg, mid)) hi = mid; else lo = mid; }
    return hi;
  });
}

describe('BASE_ORIENT', () => {
  it('off: the base is the same in every direction, set or running', async () => {
    for (const running of [false, true]) {
      const t = await thresholds('0', running);
      for (const x of t) expect(x).toBeCloseTo(t[0], 3);
    }
  });

  it('on, set: he goes first along his facing (his base is wide across it)', async () => {
    const t = await thresholds('1', false);
    expect(t[0]).toBeLessThan(t[1]); expect(t[1]).toBeLessThan(t[2]); expect(t[2]).toBeLessThan(t[3]);
  });

  it('on, running: he goes first across his path (his stride is long along it)', async () => {
    const t = await thresholds('1', true);
    expect(t[3]).toBeLessThan(t[2]); expect(t[2]).toBeLessThan(t[1]); expect(t[1]).toBeLessThan(t[0]);
  });

  it('is off unless set', async () => {
    vi.resetModules(); vi.stubEnv('BASE_ORIENT', '0');
    expect((await import('../src/physics/support.js')).BASE_ORIENT).toBe(false);
  });
});
