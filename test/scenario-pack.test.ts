/**
 * Readiness scenario pack (src/lab/scenarios.ts): the owner's physical
 * interactions with the real techniques, checked for the physical contracts
 * every interaction must keep — momentum explained by ground impulse, bounded
 * overlap, finite states — and for mirror symmetry across the field.
 * Football outcomes are reported by scripts/scenario-pack.ts; only coarse,
 * physically necessary directions are asserted here.
 */
import { describe, expect, it } from 'vitest';
import { approachTackle, redirect, seal, sidewaysHit, squeeze, type Invariants } from '../src/lab/scenarios.js';

function physical(r: Invariants) {
  expect(r.finite).toBe(true);
  expect(r.momentumError).toBeLessThan(1e-6);
  expect(r.maxPenetration).toBeLessThan(0.2);
}

describe('scenario pack: physical contracts and mirror symmetry', () => {
  it('approach tackle, front and side', () => {
    // The side approach finishes by dragging: the FS takes the ankles, goes down at 0.4 s after contact and his
    // hanging weight (#355) stops the back. With the start law (#336) the back, asking for 4 yd/s, drives at his
    // full start force through the hold, so he stops later and is down at 4.15 s (3.90 on develop's start law,
    // 4.95 -> 5.93 yd after contact); the window is 4.5 s so the finish is inside it.
    for (const [bearing, speed, maxT] of [[0, 7, 4], [90, 4, 4.5]]) {
      const a = approachTackle({ bearing, speed, side: 1, maxT }), b = approachTackle({ bearing, speed, side: -1, maxT });
      physical(a); physical(b);
      expect(a.tackled).toBe(true);
      expect(b.time).toBeCloseTo(a.time, 9);
      expect(b.endX).toBeCloseTo(a.endX, 6);
      expect(b.endDy).toBeCloseTo(a.endDy, 6);
    }
  });

  it('a side hit displaces a back in proportion to the hit, and he recovers from a moderate one', () => {
    const light = sidewaysHit({ hitter: 4, side: 1 }), heavy = sidewaysHit({ hitter: 6, side: 1 }), mirror = sidewaysHit({ hitter: 6, side: -1 });
    for (const r of [light, heavy, mirror]) physical(r);
    expect(heavy.peak).toBeGreaterThan(light.peak);
    expect(heavy.pushed).toBeGreaterThan(light.pushed);
    expect(light.fell).toBe(false);
    expect(light.recovered).toBeLessThan(0.6);
    expect(mirror.peak).toBeCloseTo(heavy.peak, 9);
    expect(mirror.pushed).toBeCloseTo(heavy.pushed, 9);
  });

  it('redirect, seal and squeeze keep the contracts on both sides of the field', () => {
    for (const side of [1, -1] as const) {
      const rd = redirect({ side }), se = seal({ side }), sq = squeeze({ side });
      for (const r of [rd, se, sq]) physical(r);
      // Loaded protection is checked causally in redirect-phase-contract:
      // the actual hand must move the rusher outside and protect QB space
      // against an otherwise identical no-hand World. Whole-rep carriedPast
      // also includes free pursuit after release; it remains a report value.
      expect(rd.peakNormal).toBeGreaterThan(0);
      expect(rd.peakTangent).toBeGreaterThan(0);
      expect(rd.cornerTurned).toBe(true);
      expect(se.sealedFor).toBeGreaterThan(1);
    }
    const a = redirect({ side: 1 }), b = redirect({ side: -1 });
    expect(b.closest).toBeCloseTo(a.closest, 9);
    const s1 = squeeze({ side: 1 }), s2 = squeeze({ side: -1 });
    // The leg force-velocity law (PHY-1) feeds the achieved speed back into the
    // strength term, so last-digit mirror noise is carried into the contest:
    // the two sides differ by 8e-9 yd here (develop: 2e-10), no mirror law.
    expect(s2.inside).toBeCloseTo(s1.inside, 7);
  });

  it('a side hit gives nearly the same balance loss at coarse and fine physics steps', () => {
    const coarse = sidewaysHit({ hitter: 6, substeps: 6 }), fine = sidewaysHit({ hitter: 6, substeps: 24 });
    expect(Math.abs(coarse.peak - fine.peak)).toBeLessThan(0.1 * fine.peak);
  });
});
