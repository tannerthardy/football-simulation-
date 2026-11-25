// The believed body never falls back to a man's true values (the outside reviewer's second read, 2026-11-25): a position
// with no defensive starters in the typical sample gets the league-typical defensive starter.
import { describe, expect, it } from 'vitest';
import { typicalAt, typicalOrLeague } from '../src/sim/believed.js';

describe('believed body fallback', () => {
  it('a defensive position keeps its own typical; any other gets the league-typical starter, never null', () => {
    expect(typicalOrLeague('CB')).toBe(typicalAt('CB'));
    expect(typicalAt('WR')).toBeNull();
    const t = typicalOrLeague('WR');
    expect(t.profile).toBeTruthy();
    expect(t.ratings.ballSkills).toBeGreaterThan(0);
  });
});
