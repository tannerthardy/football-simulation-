import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { DT } from '../src/core/units.js';
import { redirect } from '../src/lab/scenarios.js';

// The scenario needs the rusher to turn the corner on the installed physics;
// under PAD_LEVERAGE (and DL_ANCHOR) that contest is a different play, and
// so it is under PASS_KICK's vertical set (the corner is not turned by 6 s).
vi.hoisted(() => { process.env.PAD_LEVERAGE = '0'; process.env.DL_ANCHOR = '0'; process.env.PASS_KICK = '0'; });

// This is a six-second reacting trajectory, not a bitwise reflection operator.
// Preserve exact targets/times while bounding achieved mirror geometry to a
// nanoyard. A request's velocity budget is that displacement over one ordinary
// tick; it cannot conceal a changed assignment or appreciable body divergence.
// The original subnanoyard/s failure and paired traces are preserved in
// data/reviews/current/redirect-numeric-2026-10-20.
const MIRROR_POSITION = 1e-9;
const MIRROR_VELOCITY = MIRROR_POSITION / DT;

describe('redirect mirrors the installed protection after the original contact ends', () => {
  it.each(['center', 'patch'] as const)('preserves post-shed targets and requests with %s hands', handContact => {
    // The old 2.5 s scenario remains unchanged. This declared longer control
    // exposes center hands' later actual shed as well as the earlier patch shed.
    const right = redirect({ side: 1, handContact, maxT: 6 });
    const left = redirect({ side: -1, handContact, maxT: 6 });
    expect(right.cornerTurned).toBe(true);
    expect(left.cornerTurned).toBe(true);
    expect(right.postShedProtection.length).toBeGreaterThan(0);
    expect(left.postShedProtection).toHaveLength(right.postShedProtection.length);
    expect(right.protectionHomeY + left.protectionHomeY).toBeCloseTo(2 * CENTER_Y, 10);
    expect(left.closest).toBeCloseTo(right.closest, 9);
    for (const [i, actual] of right.postShedProtection.entries()) {
      const mirror = left.postShedProtection[i];
      expect(actual.target).toBe('DE_S');
      expect(mirror.target).toBe(actual.target);
      expect(mirror.t).toBe(actual.t);
      expect(Math.abs(mirror.request.vel.x-actual.request.vel.x)).toBeLessThan(MIRROR_VELOCITY);
      expect(Math.abs(mirror.request.vel.y+actual.request.vel.y)).toBeLessThan(MIRROR_VELOCITY);
      expect(actual.positions).toHaveLength(3); expect(mirror.positions).toHaveLength(3);
      for (const [j,position] of actual.positions.entries()) {
        expect(Math.abs(mirror.positions[j].x-position.x)).toBeLessThan(MIRROR_POSITION);
        expect(Math.abs(mirror.positions[j].y+position.y-2*CENTER_Y)).toBeLessThan(MIRROR_POSITION);
      }
      if (actual.request.facing === undefined) expect(mirror.request.facing).toBeUndefined();
      else expect(mirror.request.facing).toBeCloseTo(-actual.request.facing, 9);
    }
  });
});
