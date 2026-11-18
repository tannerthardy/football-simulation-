import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PhysicalProfile } from '../src/players/physical.js';

// YAW_CAP (docs/reviews/2026-11-18-yaw-cap.md): the hips' yaw rate is the profile's turnRate scaled by YAW_CAP_PCT percent,
// in the body's motor and in every controller estimate of his own flip time. Off, nothing reads the scale.
const profile: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 9, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5 };

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const K = await import('../src/physics/kinematics.js');
  const S = await import('../src/physics/support.js');
  const { World } = await import('../src/physics/world.js');
  return { K, S, World };
}

/** A lone planted body asked to face 180 degrees off: time until his hips are within 10 degrees of the request, and his peak yaw rate. */
async function planted(env: Record<string, string>) {
  const { S, World } = await load(env);
  const b: any = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: { ...profile }, support: S.newSupport(0.3) };
  const w = new World([b]);
  const dt = 0.025;
  let peak = 0, reached = NaN, last = b.facing;
  for (let k = 1; k <= 120; k++) {
    (w as any).time = k * dt;
    w.step([{ vel: { x: 0, y: 0 }, facing: Math.PI, effort: 1 }], dt);
    b.energy = 1;
    const d = Math.abs(((b.facing - last + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    peak = Math.max(peak, d / dt);
    last = b.facing;
    const err = Math.abs(((b.facing - Math.PI + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (Number.isNaN(reached) && err < (10 * Math.PI) / 180) reached = k * dt;
  }
  return { reached, peak };
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('YAW_CAP hip yaw rate', () => {
  it('off, the hips use the profile turn rate unchanged', async () => {
    const { K } = await load({ YAW_CAP: '0' });
    expect(K.YAW_CAP).toBe(false);
    expect(K.hipYawRate(profile)).toBe(profile.turnRate);
  });

  it('on, the capacity is the profile rate times YAW_CAP_PCT, and the default is 55', async () => {
    const dflt = await load({ YAW_CAP: '1' });
    expect(dflt.K.hipYawRate(profile)).toBeCloseTo(profile.turnRate * 0.55, 12);
    const p75 = await load({ YAW_CAP: '1', YAW_CAP_PCT: '75' });
    expect(p75.K.hipYawRate(profile)).toBeCloseTo(profile.turnRate * 0.75, 12);
  });

  it('the capacity scales with the body (a slower agility score caps lower)', async () => {
    const { K } = await load({ YAW_CAP: '1' });
    expect(K.hipYawRate({ turnRate: 6 })).toBeLessThan(K.hipYawRate({ turnRate: 10 }));
  });

  it('a planted 180-degree turn is never faster than the cap and takes longer than off', async () => {
    const off = await planted({ YAW_CAP: '0' });
    const on = await planted({ YAW_CAP: '1', YAW_CAP_PCT: '55' });
    expect(on.peak).toBeLessThanOrEqual(profile.turnRate * 0.55 * 1.02);
    expect(on.reached).toBeGreaterThan(off.reached);
    expect(Number.isFinite(on.reached)).toBe(true);
  });
});
