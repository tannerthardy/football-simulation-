/**
 * Simulated pressures (fangio-system.md E5): four rushers, one from an
 * unexpected spot, and a dropped lineman playing a real coverage job with a
 * match rule. The fire zone keeps five rushers and its end now matches.
 */
import { describe, expect, it } from 'vitest';
import { filmScene } from '../src/lab/coverage-scene.js';
import { pressureIsInstallable } from '../src/playbook/call-integrity.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';

const cases = [
  { id: 'whip', coverage: 'cover9', dropper: 'DE_S', rule: 'bonus_hook', blitzer: 'LB_W', rushers: 4 },
  { id: 'slug', coverage: 'cover3_match', dropper: 'DE_W', rule: 'c3_seam', blitzer: 'NB', rushers: 4 },
  { id: 'sting', coverage: 'cover4', dropper: 'DE_W', rule: 'q_apex', blitzer: 'LB_M', rushers: 4 },
  { id: 'fire_zone', coverage: 'cover3_match', dropper: 'DE_W', rule: 'c3_seam', blitzer: 'SS', rushers: 5 },
] as const;

describe('simulated pressures', () => {
  for (const c of cases)
    it(`${c.id}: ${c.rushers} rushers including ${c.blitzer}; ${c.dropper} drops with ${c.rule}`, () => {
      expect(pressureIsInstallable('nickel', FRONT_BY_ID.over, COVERAGE_BY_ID[c.coverage], PRESSURE_BY_ID[c.id])).toBe(true);
      const f = filmScene({ formation: 'gun_spread_10', coverage: c.coverage, strong: { 1: 'go', 2: 'seam' }, weak: { 1: 'go', 2: 'seam' },
        until: 1.6, call: { pressure: PRESSURE_BY_ID[c.id] } });
      expect(f.sim.defAlign.rushers).toHaveLength(c.rushers);
      expect(f.sim.defAlign.rushers).toContain(c.blitzer);
      expect(f.defenders[c.dropper].rule).toBe(c.rule);
    });

  it('a four-man promise is not installed where the front would make it five', () => {
    // Base 3-4 Odd keeps both ends and a nose on the line: Sting there would rush five.
    expect(pressureIsInstallable('base34', FRONT_BY_ID.odd, COVERAGE_BY_ID.cover4, PRESSURE_BY_ID.sting)).toBe(false);
  });
});
