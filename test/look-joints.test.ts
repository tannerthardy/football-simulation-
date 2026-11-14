import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// The suite's pinned engine may have TRUNK_TWIST off; the join is checked with the trunk on, and off for its own case.
let lookJoints: typeof import('../src/sim/ball-estimate.js').lookJoints;
let neckOf: typeof import('../src/sim/ball-estimate.js').neckOf;
let TRUNK_RANGE: number;
beforeAll(async () => {
  vi.stubEnv('TRUNK_TWIST', '1');
  vi.resetModules();
  ({ lookJoints, neckOf } = await import('../src/sim/ball-estimate.js'));
  ({ TRUNK_RANGE } = await import('../src/physics/kinematics.js'));
});
afterAll(() => { vi.unstubAllEnvs(); vi.resetModules(); });

// A body at rest heading along +x: only the fields neckOf / neckRange read.
const agent = { vel: { x: 0, y: 0 }, body: { vel: { x: 0, y: 0 } }, profile: { vmax: 9 } } as any;
const deg = (d: number) => (d * Math.PI) / 180;
const cmd = { vel: { x: 5, y: 0 } };

describe('lookJoints: neck, then trunk to TRUNK_RANGE, then hips', () => {
  const neck = () => neckOf(agent);
  it('a target inside the neck needs no other joint', () => {
    expect(lookJoints(agent, cmd, 0, neck() - deg(5), true)).toEqual(cmd);
    expect(lookJoints(agent, cmd, 0, -(neck() - deg(5)), true)).toEqual(cmd);
  });
  it('past the neck, the shoulders take the rest up to TRUNK_RANGE and the hips stay on the run', () => {
    const out = lookJoints(agent, cmd, 0, neck() + deg(30), true);
    expect(out.facing).toBeUndefined();
    expect(out.look).toBeCloseTo(deg(30), 9);
    const left = lookJoints(agent, cmd, 0, -(neck() + deg(30)), true);
    expect(left.look).toBeCloseTo(-deg(30), 9);
  });
  it('past neck + trunk, the hips turn only for what is left', () => {
    const extra = deg(20), out = lookJoints(agent, cmd, 0, neck() + TRUNK_RANGE + extra, true);
    expect(out.facing).toBeCloseTo(extra, 9);
    // The shoulders' target is absolute: hips plus the full trunk range.
    expect(out.look! - out.facing!).toBeCloseTo(TRUNK_RANGE, 9);
  });
  it('without the trunk, everything past the neck is a hip turn', () => {
    const out = lookJoints(agent, cmd, 0, neck() + deg(30), false);
    expect(out.look).toBeUndefined();
    expect(out.facing).toBeCloseTo(deg(30), 9);
  });
});
