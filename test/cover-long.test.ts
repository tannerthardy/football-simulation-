import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickOffense } from '../src/league/team.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';

/** COVER_LONG: no early-down coverage tilt on 2nd and 7+ (src/game/playcaller.ts). */
async function familyShares(flag: '0' | '1', down: number, distance: number) {
  process.env.COVER_LONG = flag;
  vi.resetModules();
  const { DefensiveCoordinator } = await import('../src/game/playcaller.js');
  const offense = generateTeam(new Rng(77), 'Off', 'OFF', { strength: 0.55 });
  const slots = pickOffense(offense, '11');
  const formation = Object.values(FORMATION_BY_ID).find((f) => f.personnel === '11')!;
  const fams: string[] = [];
  for (let i = 0; i < 30; i++) {
    const def = generateTeam(new Rng(500 + i), 'Def', `D${i}`, { strength: 0.55 });
    const dc = new DefensiveCoordinator(def, new Rng(900 + i));
    for (let j = 0; j < 40; j++) {
      const { call } = dc.call({ down, distance, yardline: 35, quarter: 2, clock: 600, scoreDiff: 0, ballY: 26.65, hurry: false }, '11', offense, slots, formation);
      fams.push(call.coverage.family ?? call.coverage.id);
    }
  }
  return fams;
}

describe('COVER_LONG', () => {
  afterEach(() => { delete process.env.COVER_LONG; vi.resetModules(); });

  it('leaves 1st down and 2nd & short calls unchanged', async () => {
    expect(await familyShares('1', 1, 10)).toEqual(await familyShares('0', 1, 10));
    expect(await familyShares('1', 2, 4)).toEqual(await familyShares('0', 2, 4));
  });

  it('drops the early-down tilt on 2nd & 7+: less Cover 3, more Cover 1', async () => {
    const off = await familyShares('0', 2, 10), on = await familyShares('1', 2, 10);
    const share = (xs: string[], f: string) => xs.filter((x) => x === f).length / xs.length;
    expect(share(on, 'cover3')).toBeLessThan(share(off, 'cover3'));
    expect(share(on, 'cover1')).toBeGreaterThan(share(off, 'cover1'));
  });
});
