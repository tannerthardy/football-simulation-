import { describe, expect, it } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { FRONT_BY_ID } from '../src/playbook/defense.js';
import { PlaySim } from '../src/sim/playsim.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';

// The zone installer counts the backers across the front for the uncovered
// men: in order, never crossing, none more than three gaps away. Ace12 IZ
// Strong/Over used to hand the 3-technique's double the Will's far side and
// the backside double the nickel across the formation (KNOWN_PROBLEMS RUN-12).
function installed(concept: string, front: string) {
  const setup = nativeTraceSetup({ coverage: 'cover3_buzz', concept, seed: 1, roster: 7, formation: 'ace_12', flip: false });
  setup.defCall.front = FRONT_BY_ID[front];
  const sim = new PlaySim(setup);
  sim.tick();
  const next = new Map<string, string>();
  const climbs: Array<{ y: number; by: number }> = [];
  for (const o of sim.offense) {
    const plan = o.behavior instanceof RunBlocker ? o.behavior.plan : null;
    const combo = plan?.combination;
    if (!combo?.backer || combo.members[1] !== o) continue;
    next.set(combo.members.map((m) => m.slot).sort().join('+'), combo.backer.slot);
    climbs.push({ y: o.pos.y, by: combo.backer.pos.y });
  }
  return { next, climbs };
}

describe('zone doubles count the backers across the front', () => {
  it.each([
    ['iz_strong', 'over', { 'C+LG': 'LB_M', 'RG+RT': 'LB_W', 'H+LT': 'NB' }],
    ['wz_weak', 'under', { 'LG+LT': 'NB', 'C+RG': 'LB_M', 'RT+Y': 'LB_W' }],
  ])('%s vs %s', (concept, front, expected) => {
    const { next, climbs } = installed(concept, front);
    expect(Object.fromEntries(next)).toEqual(expected);
    climbs.sort((p, q) => p.y - q.y);
    for (let i = 0; i < climbs.length; i++) {
      expect(Math.abs(climbs[i].by - climbs[i].y)).toBeLessThanOrEqual(4.5);
      if (i) expect(climbs[i].by).toBeGreaterThan(climbs[i - 1].by);
    }
  });
});
