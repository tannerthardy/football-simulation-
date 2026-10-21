/** FRONT_FIT (src/league/team.ts pickDefense): interior line slots weigh
 * familiarity at DT, as the edge slots weigh it at EDGE. Raw 3-technique
 * suitability has no mass or strength term and put light edge rushers at DT,
 * including the zone lab's DT_S (docs/reviews/run-offense.md). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function fronts(on: boolean) {
  vi.stubEnv('FRONT_FIT', on ? '1' : '0');
  vi.resetModules();
  const { generateTeam, pickDefense } = await import('../src/league/team.js');
  const { Rng } = await import('../src/core/rng.js');
  const picks = [];
  for (let s = 1; s <= 30; s++) picks.push(pickDefense(generateTeam(new Rng(1000 + s), `T${s}`, `T${s}`, { strength: .55 }), 'base43'));
  // The lab defense (scripts/diag/zone-lab/lab.ts rosters, pair11).
  picks.push(pickDefense(generateTeam(new Rng(12), 'pair11 D', 'pair11D', { strength: .55 }), 'base43'));
  return picks;
}

describe('FRONT_FIT: tackles play the interior line', () => {
  it('fills DT_S and DT_W with DTs; the other slots are unchanged', async () => {
    const off = await fronts(false), on = await fronts(true);
    const inside = (ps: typeof off) => ps.flatMap(p => [p.DT_S!, p.DT_W!]);
    expect(inside(off).some(p => p.position !== 'DT')).toBe(true);
    expect(inside(on).every(p => p.position === 'DT')).toBe(true);
    expect(off.at(-1)!.DT_S!.position).toBe('EDGE');
    for (let i = 0; i < off.length; i++)
      for (const slot of ['NT', 'DE_W', 'DE_S'] as const) expect(on[i][slot]?.id).toBe(off[i][slot]?.id);
    const lb = (ps: typeof off) => inside(ps).reduce((s, p) => s + p.measurables.weightLb, 0) / inside(ps).length;
    expect(lb(on)).toBeGreaterThan(lb(off));
  }, 60000);
});
