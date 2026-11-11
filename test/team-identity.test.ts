/** withIdentity (league/team.ts): diagnostic games reuse one pair of team
 * identities (IRN, COM) on every seed, so every habit seeded by identity was
 * the same two teams' draw. A salted identity keeps the roster and redraws
 * those habits. */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { alignStyle, generateTeam, leagueSample, withCoaching, withIdentity } from '../src/league/team.js';

const strip = (t: ReturnType<typeof generateTeam>) => ({ ...t, id: '', roster: t.roster.map((p) => ({ ...p, id: '' })) });

describe('withIdentity', () => {
  it('keeps the roster, ratings and staff; only ids change', () => {
    const t = generateTeam(new Rng(7), 'Ironmen', 'IRN', { strength: .55 });
    const s = withIdentity(t, 7);
    expect(strip(s)).toEqual(strip(t));
    expect(s.id).toBe('IRN~7');
    expect(s.roster[0].id).toBe(`IRN~7-${t.roster[0].id.slice(4)}`);
    expect(new Set(s.roster.map((p) => p.id)).size).toBe(t.roster.length);
    // The input is not changed.
    expect(t.id).toBe('IRN');
  });

  it('redraws the identity-seeded habits per salt, reproducibly', () => {
    const t = generateTeam(new Rng(7), 'Ironmen', 'IRN', { strength: .55 });
    const depths = [7, 11, 500, 501].map((salt) => alignStyle(withIdentity(t, salt)).safetyDepth);
    expect(new Set(depths).size).toBe(4);
    expect(alignStyle(withIdentity(t, 7))).toEqual(alignStyle(withIdentity(t, 7)));
    // Unsalted, every seed's IRN is the same team identity.
    expect(alignStyle(generateTeam(new Rng(11), 'Ironmen', 'IRN')).safetyDepth).toBe(alignStyle(t).safetyDepth);
  });
});

describe('withCoaching / leagueSample', () => {
  const t = generateTeam(new Rng(7), 'Ironmen', 'IRN', { strength: .55 });

  it('redraws the coordinators per salt, reproducibly, and leaves the roster alone', () => {
    const c = withCoaching(t, 7);
    expect(c.roster).toBe(t.roster);
    expect(withCoaching(t, 7)).toEqual(c);
    expect(t.coach.coverageSystem).toBe(generateTeam(new Rng(7), 'Ironmen', 'IRN', { strength: .55 }).coach.coverageSystem);
    const trees = new Set(Array.from({ length: 40 }, (_, i) => withCoaching(t, i).coach.coverageSystem));
    expect(trees.size).toBe(5);
    const schemes = new Set(Array.from({ length: 40 }, (_, i) => withCoaching(t, i).offScheme));
    expect(schemes.size).toBeGreaterThan(2);
  });

  it('samples habits and coordinators together', () => {
    const s = leagueSample(t, 11);
    expect(s.id).toBe('IRN~11');
    expect(s.coach).toEqual(withCoaching(withIdentity(t, 11), 11).coach);
    expect(s.roster.map((p) => p.ratings)).toEqual(t.roster.map((p) => p.ratings));
  });
});
