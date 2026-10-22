/** A carrier leaning over the sideline with his feet in can lose the ball
 * beyond the boundary plane. The ball crossed while held, so the loose ball
 * carries that crossing; ground contact outside then kills it at the line
 * instead of failing for want of a crossing. */
import { describe, expect, it } from 'vitest';
import { makeSim, rosters } from '../scripts/diag/zone-lab/lab.js';

describe('fumble beyond the sideline plane', () => {
  it('dies out of bounds at the carrier\'s spot on the line', () => {
    const R = rosters();
    let outs = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const sim = makeSim({ concept: 'iz', dir: 'strong', formation: 'ace_12', look: 'over3', roster: 'pair11', seed } as never, R);
      const qb = sim.qb;
      qb.body.pos = { x: qb.pos.x, y: -0.3 };
      sim.fumble(qb, null);
      expect(() => { while (sim.phase === 'live' && sim.t < 3) sim.tick(); }).not.toThrow();
      const r = sim.buildResult() as { outcome: string };
      if (r.outcome === 'oob') { outs++; expect(sim.endSpot!.y).toBeCloseTo(0, 6); }
    }
    expect(outs).toBeGreaterThan(0);
  }, 60000);
});
