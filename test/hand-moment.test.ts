/** HAND_MOMENT: the press through the hands is bounded by the moment it puts on the pusher's trunk, armForce * CHEST_HALF / (reach * sin(angle off his facing))
 * (docs/reviews/2026-11-16-contact-law.md). Off by default; with it on, a press square to his chest is unchanged and one at an angle is limited. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The press needs the engine's defaults (the suites pin the promoted flags to the legacy engine, where this hands joint pushes nothing), so the test turns them on.
const ON = Object.entries(JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags as Record<string, string>).filter(([, v]) => v === 'on').map(([k]) => k);
const engine = (moment: string) => { vi.resetModules(); for (const k of ON) vi.stubEnv(k, '1'); vi.stubEnv('HAND_MOMENT', moment); };

async function press(angleDeg: number): Promise<number> {
  const { World } = await import('../src/physics/world.js');
  const mk = (x: number, facing: number) => ({ pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing, energy: 1,
    profile: { massKg: 130, radius: .3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
      maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 130 * (.55 + .75 * .6), balance: .5 } }) as never as import('../src/physics/kinematics.js').Body;
  const a = mk(0, angleDeg * Math.PI / 180), b = mk(1.0, Math.PI);
  const w = new World([a, b]);
  w.joints.push({ kind: 'hands', a, b, extension: 1, push: 1e6, hold: 1e6, steer: 1e6 } as never);
  w.step([{ vel: { x: 0, y: 0 }, facing: a.facing, push: 1 }, { vel: { x: 0, y: 0 }, facing: Math.PI }] as never, .05);
  return b.vel.x;
}

describe('HAND_MOMENT', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it('unset is off (the flag changes nothing until it is turned on)', async () => {
    engine('');
    const unset = await press(60);
    engine('0');
    expect(await press(60)).toBe(unset);
  });
  it('on: square to his chest it is unchanged; at an angle it is limited, more so the wider the angle', async () => {
    engine('0');
    const off0 = await press(0), off60 = await press(60);
    engine('1');
    const on0 = await press(0), on30 = await press(30), on60 = await press(60), on85 = await press(85);
    expect(on0).toBeCloseTo(off0, 9);
    expect(on60).toBeLessThan(off60 - 1e-6);
    expect(on30).toBeGreaterThan(on60 - 1e-9);
    expect(on60).toBeGreaterThan(on85 - 1e-9);
  });
});
