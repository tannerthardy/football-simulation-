import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam } from '../src/league/team.js';

describe('random streams', () => {
  it('a named stream does not depend on other streams or prior draws', () => {
    const plain = new Rng(77).fork('plays').nextU32();
    const busy = new Rng(77);
    busy.fork('weather');
    busy.next();
    busy.next();
    expect(busy.fork('plays').nextU32()).toBe(plain);
    expect(new Rng(77).fork('kicks').nextU32()).not.toBe(plain);
    expect(new Rng(78).fork('plays').nextU32()).not.toBe(plain);
  });
});

describe('player identity', () => {
  it('is roster-scoped and reproducible regardless of earlier generation', () => {
    const first = generateTeam(new Rng(4), 'Ironmen', 'IRN');
    generateTeam(new Rng(9), 'Comets', 'COM');
    const again = generateTeam(new Rng(4), 'Ironmen', 'IRN');
    expect(again.roster.map((p) => p.id)).toEqual(first.roster.map((p) => p.id));
    expect(new Set(first.roster.map((p) => p.id)).size).toBe(first.roster.length);
    expect(first.roster.every((p) => p.id.startsWith('IRN-'))).toBe(true);
  });
});
