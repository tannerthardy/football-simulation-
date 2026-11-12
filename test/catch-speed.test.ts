/** CATCH_SPEED (catching.ts runTrackTerm; experimental, off): tracking a ball he is not facing while he runs costs
 * more the faster he runs, the more it comes from behind his line, and the longer it has been in the air; a ball he
 * is facing costs nothing extra; ball tracking softens it. */
import { describe, expect, it } from 'vitest';
import { runTrackTerm } from '../src/sim/catching.js';

describe('CATCH_SPEED term', () => {
  it('grows with speed above 3 yd/s, from behind more than across, nothing when facing the ball', () => {
    expect(runTrackTerm(3, 1, 1.5, 0.5)).toBe(0);
    expect(runTrackTerm(7.5, 1, 1.5, 0.5)).toBeGreaterThan(runTrackTerm(5, 1, 1.5, 0.5));
    expect(runTrackTerm(7, 1, 1.5, 0.5)).toBeGreaterThan(runTrackTerm(7, 0, 1.5, 0.5));
    expect(runTrackTerm(7, 0, 1.5, 0.5)).toBeCloseTo(0.46 * runTrackTerm(7, 1, 1.5, 0.5), 6);
    expect(runTrackTerm(7, -0.5, 1.5, 0.5)).toBe(0);
    expect(runTrackTerm(7, -1, 1.5, 0.5)).toBe(0);
  });
  it('a ball dropping in from distance is harder than a quick one; better ball tracking softens it', () => {
    expect(runTrackTerm(7, 1, 1.4, 0.5)).toBeGreaterThan(runTrackTerm(7, 1, 0.6, 0.5));
    expect(runTrackTerm(7, 1, 1.4, 0.9)).toBeLessThan(runTrackTerm(7, 1, 1.4, 0.2));
  });
});
