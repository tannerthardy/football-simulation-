/**
 * Underneath zone defenders before the throw (flatThreat): a receiver still
 * behind the line in front of him (a back, a swing, a screen) is no lane to
 * drive down to. By default he holds his depth and leverage and breaks on the
 * throw ("ball brings you back down"; NFL zone defenders over quick screens
 * gain 0-1 yd before the throw); a coach's `trap` tag drives him down on it.
 * The scene suppresses throws, so every tick is before the throw.
 */
import { describe, expect, it } from 'vitest';
import { filmScene } from '../src/lab/coverage-scene.js';

const depthOf = (back: string, flatThreat?: 'hold' | 'trap') => {
  const f = filmScene({ formation: 'gun_doubles_11', coverage: 'cover3', strong: { 1: 'go', 2: 'go' }, weak: { 1: 'go', 2: 'go' },
    back, until: 1.6, call: flatThreat ? { flatThreat } : undefined });
  const curlFlat = f.sim.defense.find(d => (d.behavior as { zone?: string }).zone === 'curl_flat_w')!;
  return curlFlat.pos.x - f.sim.los;
};

describe('underneath zone before the throw: a receiver behind the line', () => {
  it('holds depth over a back behind the line by default, and drives down on it only when tagged to trap', () => {
    for (const back of ['swing', 'block']) {
      const hold = depthOf(back), trap = depthOf(back, 'trap');
      expect(hold).toBeGreaterThan(3);          // started 4.5 deep
      expect(trap).toBeLessThan(hold - 1);      // the old drive-down survives as a called technique
    }
  });

  it('the default is hold', () => {
    expect(depthOf('swing')).toBe(depthOf('swing', 'hold'));
  });
});
