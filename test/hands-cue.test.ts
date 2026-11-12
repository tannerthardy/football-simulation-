/** HANDS_CUE (hands-cue.ts; experimental, off): his hands come up a lead time before the ball reaches his spot, later
 * for a better route runner, and only for a ball coming to him; once up they stay up for that throw. */
import { describe, expect, it } from 'vitest';
import { handsLead, handsUpAt, noteHands } from '../src/sim/hands-cue.js';

const receiver = (rr: number) => ({ r: (k: string) => (k === 'routeRunning' ? rr : 0.5) }) as any;

describe('HANDS_CUE', () => {
  it('a better route runner shows his hands later', () => {
    expect(handsLead(0.9)).toBeLessThan(handsLead(0.3));
  });
  it('hands come up only inside his lead before the ball reaches his spot, and the first time is kept', () => {
    const a = receiver(0.5), lead = handsLead(0.5);
    noteHands(a, 1.0, 1.0 + lead + 0.2);
    expect(handsUpAt(a)).toBeUndefined();
    noteHands(a, 1.3, 1.0 + lead + 0.2);
    expect(handsUpAt(a)).toBe(1.3);
    noteHands(a, 1.4, 1.0 + lead + 0.2);
    expect(handsUpAt(a)).toBe(1.3);
  });
  it('no ball coming to him, no hands', () => {
    expect(handsUpAt(receiver(0.5))).toBeUndefined();
  });
});
