import { describe, expect, it } from 'vitest';
import { holdBend } from '../src/sim/spacing.js';

// SPACING_HOLD (docs/reviews/2026-11-15-carrier-spacing-dither.md): the bend he chose is kept while the held request still conflicts with the peer, grown on the same side if it
// stops clearing, and given up only when the held request clears by a margin, he has passed the peer, or nothing on his side works (then he chooses afresh).
describe('holdBend', () => {
  const hold = { off: -0.4, keys: [7] };
  it('keeps the same bend while the held request still conflicts, even when it would now clear (clearance under the exit margin)', () => {
    expect(holdBend(hold, 0.1, 0.6, false, () => true)).toEqual({ off: -0.4, hold });
    expect(holdBend(hold, -0.3, 0.6, false, () => true).off).toBe(-0.4);
  });
  it('grows the bend on the same side when the held size stops clearing, never flips side, and stays within the largest bend', () => {
    const r = holdBend(hold, -0.2, 0.6, false, off => Math.abs(off) >= 0.6 && off < 0);
    expect(r.off).toBeCloseTo(-0.6, 9);
    expect(r.hold?.off).toBeCloseTo(-0.6, 9);
    expect(holdBend(hold, -0.2, 0.6, false, off => off > 0)).toEqual({ off: null, hold: null });   // only the other side clears: a new decision, not a flip
    expect(holdBend(hold, -0.2, 0.6, false, off => Math.abs(off) > 0.8)).toEqual({ off: null, hold: null });
  });
  it('returns the held request only when it clears by the margin, or he has passed the peer', () => {
    expect(holdBend(hold, 0.61, 0.6, false, () => false)).toEqual({ off: 0, hold: null });
    expect(holdBend(hold, 0.59, 0.6, false, () => true).hold).not.toBeNull();
    expect(holdBend(hold, -1, 0.6, true, () => false)).toEqual({ off: 0, hold: null });
  });
  it('a bend to the right is held and grown to the right', () => {
    const r = holdBend({ off: 0.2, keys: [3] }, -0.1, 0.6, false, off => off >= 0.4);
    expect(r.off).toBeCloseTo(0.4, 9);
  });
});
