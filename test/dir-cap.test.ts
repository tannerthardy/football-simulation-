import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
const deg = (d: number) => (d * Math.PI) / 180;
const profile: any = { shuffle: 0.6, backpedal: 0.65 };
async function load(on: boolean) { vi.resetModules(); vi.stubEnv('DIR_CAP', on ? '1' : '0'); return import('../src/physics/kinematics.js'); }

describe('DIR_CAP: the directional speed cap is monotone and the trunk is priced once', () => {
  it('off is the legacy curve: side-on is the slowest point, below the backpedal', async () => {
    const k = await load(false);
    expect(k.directionalSpeedFactor(profile, deg(90))).toBeCloseTo(0.6, 9);
    expect(k.directionalSpeedFactor(profile, deg(180))).toBeCloseTo(0.65, 9);
    expect(k.trunkPrice({ trunk: deg(55) } as any)).toBe(1);
  });
  it('on: full to 20 deg, falling straight to the backpedal at 130 deg, flat beyond, never rising', async () => {
    const k = await load(true);
    let last = 1;
    for (let a = 0; a <= 180; a += 5) { const f = k.directionalSpeedFactor(profile, deg(a)); expect(f).toBeLessThanOrEqual(last + 1e-12); last = f; }
    expect(k.directionalSpeedFactor(profile, deg(20))).toBe(1);
    expect(k.directionalSpeedFactor(profile, deg(130))).toBeCloseTo(0.65, 9);
    expect(k.directionalSpeedFactor(profile, deg(180))).toBeCloseTo(0.65, 9);
    expect(k.directionalSpeedFactor(profile, deg(90))).toBeGreaterThan(0.65); // side-on is no longer the slowest
    expect(k.directionalSpeedFactor(profile, -deg(90))).toBe(k.directionalSpeedFactor(profile, deg(90)));
  });
  it('on: the trunk costs 0.0018 per degree, nothing at zero twist, either sign', async () => {
    const k = await load(true);
    expect(k.trunkPrice({} as any)).toBe(1);
    expect(k.trunkPrice({ trunk: 0 } as any)).toBe(1);
    for (const d of [22, 45, 55]) { expect(k.trunkPrice({ trunk: deg(d) } as any)).toBeCloseTo(1 - 0.0018 * d, 9); expect(k.trunkPrice({ trunk: -deg(d) } as any)).toBeCloseTo(1 - 0.0018 * d, 9); }
  });
  it('the leg-drive law is unchanged by the flag', async () => {
    const on = await load(true), a = on.legDriveFactor(profile, deg(90)), b = on.legDriveFactor(profile, deg(180));
    const off = await load(false);
    expect(a).toBe(off.legDriveFactor(profile, deg(90)));
    expect(b).toBe(off.legDriveFactor(profile, deg(180)));
  });
});
