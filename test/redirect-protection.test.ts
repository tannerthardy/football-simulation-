import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { redirect } from '../src/lab/scenarios.js';

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
      expect(mirror.request.vel.x).toBeCloseTo(actual.request.vel.x, 9);
      expect(mirror.request.vel.y).toBeCloseTo(-actual.request.vel.y, 9);
      if (actual.request.facing === undefined) expect(mirror.request.facing).toBeUndefined();
      else expect(mirror.request.facing).toBeCloseTo(-actual.request.facing, 9);
    }
  });
});
