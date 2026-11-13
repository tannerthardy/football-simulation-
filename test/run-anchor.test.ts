import { describe, expect, it } from 'vitest';
import { run } from '../scripts/diag/runblock/bullrush-panel.js';

describe('a driven run blocker anchors', () => {
  it('stops spending traction on lateral drive when he feels himself driven back', () => {
    // Identical bodies; the defender bull rushes straight through for 2 s.
    const native = run({ brace: 'native', same: true }), braced = run({ brace: 'brace3', same: true });
    expect(native.driven).toBeLessThan(braced.driven + 0.3);
    expect(native.engaged).toBe(true);
  });
});
