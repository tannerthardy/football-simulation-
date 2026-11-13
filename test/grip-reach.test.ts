/** GRIP_REACH (tackle.ts gripReach; experimental, off): where a tackler's
 * hands land (legs share: 0 shoulder line, 0.5 waist, 1 legs) follows what he
 * can reach in his situation, with no pile-up at the shoulder line. */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { gripReach } from '../src/sim/tackle.js';

const draws = (engaged: boolean, behind: boolean, form: number) => {
  const rng = new Rng(11), v: number[] = [];
  for (let i = 0; i < 2000; i++) v.push(gripReach(rng, engaged, behind, form));
  v.sort((a, b) => a - b);
  return { min: v[0], max: v[v.length - 1], p50: v[1000] };
};

describe('GRIP_REACH', () => {
  it('off a block: one arm at the side (arm, waist, jersey), never the shoulder line', () => {
    const d = draws(true, false, .5);
    expect(d.min).toBeGreaterThanOrEqual(.15);
    expect(d.max).toBeLessThanOrEqual(.6);
    expect(d.p50).toBeGreaterThan(.3);
    expect(d.p50).toBeLessThan(.4);
  });

  it('free and square: chest to waist, lower with better form', () => {
    const poor = draws(false, false, .2), good = draws(false, false, .9);
    expect(poor.min).toBeGreaterThanOrEqual(.15);
    expect(good.max).toBeLessThanOrEqual(.75);
    expect(good.p50).toBeGreaterThan(poor.p50 + .2);
  });

  it('from behind: waist, hips or legs', () => {
    const d = draws(false, true, .5);
    expect(d.min).toBeGreaterThanOrEqual(.35);
    expect(d.p50).toBeGreaterThan(.6);
  });
});
