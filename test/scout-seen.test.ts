// SCOUT_SEEN (Flex, 2026-11-24): the offense's coverage scouting learns from what its passer came to believe, never the call.
import { describe, expect, it } from 'vitest';
import { CoverageScouting } from '../src/sim/qbmind.js';

describe('SCOUT_SEEN: coverage scouting from the passer\'s belief', () => {
  it('a settled belief teaches more than a muddled one', () => {
    const settled = new CoverageScouting(1), muddled = new CoverageScouting(1);
    for (let i = 0; i < 10; i++) {
      settled.observeSeen({ cover3: 0.9, cover2: 0.1 }, 'cover3');
      muddled.observeSeen({ cover3: 0.4, cover2: 0.35, cover4: 0.25 }, 'cover3');
    }
    expect(settled.snaps()).toBeCloseTo(9, 6);
    expect(muddled.snaps()).toBeCloseTo(4, 6);
    expect(settled.frequencies().cover3).toBeGreaterThan(muddled.frequencies().cover3);
  });

  it('a disguise is what he saw change: the pre-snap shell he read against the shell he believed after the snap', () => {
    const s = new CoverageScouting(1), base = s.disguiseRate();
    s.observeSeen({ cover2: 0.8, cover3: 0.2 }, 'cover3'); // read one-high before the snap, two-high after: rotated
    expect(s.disguiseRate()).toBeGreaterThan(base);
    const t = new CoverageScouting(1);
    t.observeSeen({ cover3: 0.8, cover2: 0.2 }, 'cover3');
    expect(t.disguiseRate()).toBeLessThan(base);
  });
});
