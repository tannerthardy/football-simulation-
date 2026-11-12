/** HANG_AIRBORNE (physics/world.ts; experimental, off): a holder off his feet
 * and not yet landed who still holds has all of his weight on the hold. Fixtures
 * from hang-bench.mts (the World alone: a WR at 5 yd/s, a CB behind him just
 * off his feet with a rear grasp): a leg hold (0.8) binds the runner's stride
 * through the holder's fall and he is down sooner and shorter; a hip hold (0.5)
 * does not bind; a grip broken mid-fall loads nothing from that tick. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function wrap(flag: string, legs: number, breakAt = Infinity, lock = 0.9, grip = '0') {
  vi.stubEnv('HANG_AIRBORNE', flag); vi.stubEnv('HANG_GRIP', grip); vi.stubEnv('HELD_SWING', '1'); vi.stubEnv('SWING_STRIP', '1'); vi.stubEnv('LEGS_HELD', '1');
  vi.stubEnv('SWING_FLEXION', '1'); vi.stubEnv('HIP_STRENGTH', '1'); vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generatePlayer } = await import('../src/players/generator.js');
  const { derivePhysical } = await import('../src/players/physical.js');
  const S = await import('../src/physics/support.js');
  const { World } = await import('../src/physics/world.js');
  const rng = new Rng(61);
  const R = derivePhysical(generatePlayer(rng, 'WR')), H = derivePhysical(generatePlayer(rng, 'CB'));
  const gap = R.radius + H.radius + 0.1, v0 = 5;
  const r: any = { pos: { x: 0, y: 0 }, vel: { x: v0, y: 0 }, facing: 0, energy: 1, profile: R, support: S.newSupport(0.3) };
  const h: any = { pos: { x: -gap, y: 0 }, vel: { x: 0.9 * v0, y: 0 }, facing: 0, energy: 1, profile: H, support: S.newSupport(0.5) };
  const w: any = new World([r, h]);
  h.support.state = 'falling'; h.support.since = w.time ?? 0; h.support.fall = { x: 1, y: 0 }; h.support.cause = 'dive';
  const jt: any = { kind: 'grasp', a: h, b: r, reach: gap + H.reach * 0.9 + 0.9, ground: gap + H.reach * 0.9 + 0.9,
    capacity: S.supportParams(H as any).armForce * (0.3 + 2.5 * lock * lock) * 0.96, lock, legs, pull: 2, hold: gap, origin: 'test' };
  w.joints.push(jt);
  let fell = -1, boundInFall = 0, boundAfterBreak = 0;
  for (let k = 1; k <= 30; k++) {
    const t = k * 0.05;
    if (t > breakAt) jt.broken = true;
    w.step([{ vel: { x: v0 + 2, y: 0 }, facing: 0, push: 1, posture: 0.3 }, { vel: { x: 0, y: 0 }, facing: 0, push: 1 }], 0.05);
    const bound = w.strideHolds?.[0] ?? 0;
    if (h.support.state === 'falling') boundInFall = Math.max(boundInFall, bound);
    if (t > breakAt + 0.05) boundAfterBreak = Math.max(boundAfterBreak, bound);
    if (fell < 0 && r.support.state !== 'up') fell = t;
  }
  return { fell, travel: r.pos.x, boundInFall, boundAfterBreak, torn: !!jt.broken };
}

describe('HANG_AIRBORNE', () => {
  it('a leg hold binds the stride through the holder\'s fall: the runner is down sooner and shorter', async () => {
    const on = await wrap('1', 0.8), off = await wrap('0', 0.8);
    expect(off.boundInFall).toBe(0);
    expect(on.boundInFall).toBeGreaterThan(0.5);
    expect(on.fell).toBeGreaterThan(0);
    expect(on.fell).toBeLessThan(off.fell);
    expect(on.travel).toBeLessThan(off.travel - 1.5);
  });

  it('a hip hold does not bind: the leg tackle and the high one differ', async () => {
    const on = await wrap('1', 0.5);
    expect(on.boundInFall).toBe(0);
  });

  it('a grip broken mid-fall loads nothing from that tick', async () => {
    const on = await wrap('1', 0.8, 0.1);
    expect(on.boundAfterBreak).toBe(0);
  });

  it('HANG_GRIP: the hanging weight goes through the hold -- a weak grip tears, a locked leg wrap holds and binds, a locked hip hold holds and does not bind', async () => {
    const weak = await wrap('1', 0.8, Infinity, 0.25, '1'), legs = await wrap('1', 0.8, Infinity, 0.9, '1'), hips = await wrap('1', 0.5, Infinity, 0.9, '1');
    expect(weak.torn).toBe(true);
    expect(legs.torn).toBe(false); expect(legs.boundInFall).toBeGreaterThan(0.5);
    expect(hips.torn).toBe(false); expect(hips.boundInFall).toBe(0);
    const ungated = await wrap('1', 0.8, Infinity, 0.25, '0');
    expect(ungated.boundInFall).toBeGreaterThan(0.5);            // without HANG_GRIP the weak grab binds anyway
  });
});

