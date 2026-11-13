/** PAD_LEVERAGE (physics/world.ts): a push runs from pads to pads, so the
 * lower man's drive tilts up into the higher man. Its vertical part takes
 * weight off the higher man's cleats and puts it on the lower man's, and each
 * man's traction is friction on that normal load. The low man wins a push of
 * equals; equal pads stay a stalemate; a low man holds a double team better.
 * Off: traction is the standing weight's whatever the pads. A law in a
 * neutral frame with hand-built bodies, not an outcome target. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PhysicalProfile } from '../src/players/physical.js';
import type { Body } from '../src/physics/kinematics.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

function profile(mass: number): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 7, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass * 1.0, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 };
}
const body = (x: number, y: number, facing: number, posture: number): Body & { posture: number } =>
  ({ pos: { x, y }, vel: { x: 0, y: 0 }, facing, energy: 1, profile: profile(140), posture });

/** Bodies at +x drive toward -x and vice versa for 2 s. Returns the defender's
 * (first body's) displacement along +x: negative = driven back. */
async function contest(on: boolean, defenderPosture: number, blockers: number[]) {
  vi.stubEnv('PAD_LEVERAGE', on ? '1' : '0');
  vi.resetModules();
  const { World } = await import('../src/physics/world.js');
  const { newSupport } = await import('../src/physics/support.js');
  const d = body(0, 0, 0, defenderPosture);
  const bs = [d, ...blockers.map((p, k) => body(.75, (k - (blockers.length - 1) / 2) * .55, Math.PI, p))];
  for (const b of bs) b.support = newSupport(b.posture);
  const w = new World(bs);
  for (let k = 0; k < 40; k++)
    w.step(bs.map((b, n) => ({ vel: { x: n === 0 ? 3 : -3, y: 0 }, push: 1, posture: b.posture, facing: b.facing })), 0.05);
  return d.pos.x;
}

describe('pad level loads the feet', () => {
  it('off: pads do not decide a push of equals', async () => {
    const low = await contest(false, .9, [.3]), high = await contest(false, .3, [.9]);
    expect(Math.abs(low + high)).toBeLessThan(.3);
  });
  it('on: the low man drives the high man back', async () => {
    const low = await contest(true, .9, [.3]), off = await contest(false, .9, [.3]);
    expect(low).toBeGreaterThan(off + .3);
    expect(await contest(true, .3, [.9])).toBeLessThan(-.3);
  });
  it('on: equal pads stay even', async () => {
    expect(Math.abs(await contest(true, .6, [.6]))).toBeLessThan(.2);
  });
  it('on: a low man gives less ground to a high double team', async () => {
    const on = await contest(true, .9, [.3, .3]), off = await contest(false, .9, [.3, .3]);
    expect(on).toBeGreaterThan(off + .3);
  });
});
