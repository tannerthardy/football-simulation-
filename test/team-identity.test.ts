/** withIdentity (league/team.ts): diagnostic games reuse one pair of team
 * identities (IRN, COM) on every seed, so every habit seeded by identity was
 * the same two teams' draw. A salted identity keeps the roster and redraws
 * those habits. */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { alignStyle, generateTeam, withIdentity } from '../src/league/team.js';

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
