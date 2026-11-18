/**
 * BACK_CLEAR (src/sim/coverage/reads.ts): a back declares a flat release from what the reader sees of him clearing the
 * box, not from lateral speed behind the line. The protection cases it repairs are in cover3-cover2-rules (Push with the
 * back in protection, the Smash rule, the Cover 2 squat corner). These are the controls: a real release is read as fast
 * as before. Times with BACK_CLEAR=0 on the same scenes: swing 0.95/1.00 s (seeds 2/3), back flat 0.85-0.90 s, check
 * release 0.85-0.90 s; identical with it on. On seed 1 the end beats the tackle and comes straight at the swing back
 * behind the line (the back stalls to 0.9 yd/s at 1.35 s): to the reader that is a back meeting a rusher, so that rep is
 * read once he is clear (0.95 -> 1.95 s), and it is not a control.
 */
import { describe, expect, it } from 'vitest';
import { sceneSim } from '../src/lab/coverage-scene.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';

/** The first tick any coverage defender's own read of the back is a flat release, or NaN. */
function firstFlat(back: string, seed: number): number {
  const s = sceneSim({ formation: 'gun_spread_10', coverage: 'cover3_match', strong: { 1: 'go', 2: 'seam' },
    weak: { 1: 'go', 2: 'seam' }, back, until: 2.0, seed });
  const step = s as unknown as { tick(): void };
  while (s.phase === 'live' && s.t < 2.0 && s.throwAt < 0) {
    const t = s.t;
    step.tick();
    for (const d of s.defense) {
      const b = d.behavior;
      if (b instanceof CoverageDefender && b.recordedRule(t).reads.some(r => r.slot === 'RB' && r.release === 'flat')) return t;
    }
  }
  return NaN;
}

describe('BACK_CLEAR controls', () => {
  it('a clean swing is read as a flat release as fast as before', () => {
    expect(firstFlat('swing', 2)).toBeLessThanOrEqual(0.95 + 1e-9);
    expect(firstFlat('swing', 3)).toBeLessThanOrEqual(1.0 + 1e-9);
  });
  it('a fast back to the flat and a check-release are read as before', () => {
    for (const seed of [1, 2, 3]) {
      expect(firstFlat('back_flat', seed)).toBeLessThanOrEqual(0.9 + 1e-9);
      expect(firstFlat('check', seed)).toBeLessThanOrEqual(0.9 + 1e-9);
    }
  });
  it('a back staying in to block is never read as a flat release', () => {
    for (const seed of [1, 2, 3]) expect(firstFlat('block', seed)).toBeNaN();
  });
});
