/** OFFICIATE (experimental, off): an illegal-contact flag needs contact that
 * changed the receiver's motion, seen by an official. */
import { describe, expect, it } from 'vitest';
import { officiateChance } from '../src/sim/pass-interference.js';

describe('OFFICIATE', () => {
  it('contact that barely moves the receiver is never flagged', () => {
    expect(officiateChance(0)).toBe(0);
    expect(officiateChance(0.3)).toBe(0);
  });
  it('the chance grows with the effect and tops out at the seen rate', () => {
    expect(officiateChance(0.8)).toBeGreaterThan(0);
    expect(officiateChance(1.2)).toBeGreaterThan(officiateChance(0.8));
    expect(officiateChance(5)).toBeCloseTo(0.6, 6);
  });
});
