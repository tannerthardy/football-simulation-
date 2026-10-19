/** PACE_LEAD (experimental, off): the back's pace behind a lead blocker comes
 * from the lead's observed motion, not a fixed share of top speed. */
import { describe, expect, it } from 'vitest';
import { leadPace } from '../src/sim/behaviors/carrier.js';

const press = 6.5, contact = .62, brake = 7;

describe('PACE_LEAD lead pace', () => {
  it('does not wait for a lead who will have crossed out of the track', () => {
    // A flat puller 2 yd ahead, 0.3 yd off the track, crossing at 2.5 yd/s.
    expect(leadPace(press, 2, .3, .5, 2.5, contact, brake)).toBe(press);
    // Mirrored crossing.
    expect(leadPace(press, 2, -.3, .5, -2.5, contact, brake)).toBe(press);
  });

  it('follows a lead still in the track, closing no faster than he can brake to his speed at contact', () => {
    const p = leadPace(press, 2, 0, 1, 0, contact, brake);
    expect(p).toBeLessThan(press);
    expect(p).toBeCloseTo(1 + Math.sqrt(brake * (2 - contact)), 9);
    // Closer: slower, down to the lead's own pace at contact.
    expect(leadPace(press, 1.2, 0, 1, 0, contact, brake)).toBeLessThan(p);
    expect(leadPace(press, contact, 0, 1, 0, contact, brake)).toBeCloseTo(1, 9);
    // A lead backing into the track is not followed backwards.
    expect(leadPace(press, contact, 0, -2, 0, contact, brake)).toBe(0);
  });

  it('never asks for more than the press and keeps pace with a lead already faster', () => {
    expect(leadPace(press, 2.4, 0, 7, 0, contact, brake)).toBe(press);
    expect(leadPace(press, 2.4, .1, 3, .2, contact, brake)).toBeLessThanOrEqual(press);
  });
});
