import { describe, expect, it } from 'vitest';
import { capabilities, distribution, hash, intervene, setupFor } from '../scripts/roster-audit.js';

describe('roster audit experiment isolation', () => {
  it('changes only the nominated defender capability and never edits the source lineup', () => {
    const base = setupFor(90210, 0, 42), before = hash(base);
    for (const arm of ['balance+25', 'balance+45', 'tackling+15', 'strength+15'] as const) {
      const candidate = intervene(base, arm, 'test');
      expect(candidate.offense).toEqual(base.offense);
      expect(candidate.offCall).toEqual(base.offCall);
      expect(candidate.defCall).toEqual(base.defCall);
      for (const [slot, player] of Object.entries(candidate.defense)) {
        const original = base.defense[slot as keyof typeof base.defense]!;
        expect({ ...player, ratings: original.ratings }).toEqual(original);
        const key = arm.startsWith('balance') ? 'balance' : arm.startsWith('tackling') ? 'tackling' : 'strength';
        expect({ ...player.ratings, [key]: original.ratings[key] }).toEqual(original.ratings);
        if (key === 'balance' && !['LB', 'CB', 'S'].includes(player.position)) expect(player).toEqual(original);
      }
      expect(hash(base)).toBe(before);
    }
  });

  it('replaces defenders reproducibly without reshuffling roles, IDs, offense, or play seeds', () => {
    const base = setupFor(90210, 1, 99), fresh = intervene(base, 'fresh', 'replacement');
    expect(fresh).toEqual(intervene(base, 'fresh', 'replacement'));
    expect(fresh.offense).toEqual(base.offense);
    expect(fresh.seed).toBe(99);
    expect(Object.keys(fresh.defense)).toEqual(Object.keys(base.defense));
    for (const [slot, p] of Object.entries(fresh.defense)) {
      const old = base.defense[slot as keyof typeof base.defense]!;
      expect([p.id, p.position, p.age, p.experience, p.familiarity]).toEqual([old.id, old.position, old.age, old.experience, old.familiarity]);
    }
    expect(fresh.defense).not.toEqual(base.defense);
  });

  it('keeps fatigue separate from static ratings and physical capacities', () => {
    const player = setupFor(90210, 2, 42).defense.FS!;
    const full = capabilities(player), tired = capabilities(player, .55);
    expect(tired.balance).toBe(full.balance);
    expect(tired.armForce).toBe(full.armForce);
    expect(tired.vmax).toBe(full.vmax);
    expect(tired.effectiveVmax).toBeLessThan(full.effectiveVmax);
    expect(tired.stopDistanceAt7).toBeGreaterThan(full.stopDistanceAt7);
  });

  it('reports an empty conditional sample as missing and rejects nonfinite measurements', () => {
    expect(distribution([])).toMatchObject({ n: 0, mean: null, p50: null });
    expect(() => distribution([NaN])).toThrow('Nonfinite');
    expect(distribution([1, 2, 3])).toMatchObject({ n: 3, mean: 2, p50: 2 });
  });
});
