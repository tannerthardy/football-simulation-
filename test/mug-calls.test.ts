/** MUG_CALLS (playcaller.ts, experimental, off): nickel and dime mug on every
 * down at league rates by package and situation, most on third and long.
 * Off: mugs only on third/fourth and 4+. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HASH_LEFT_Y } from '../src/core/field.js';
import type { DefensivePlayCall } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function calls(flag: string, sit: { down: number; distance: number }, n = 1500) {
  vi.stubEnv('MUG_CALLS', flag); vi.stubEnv('FRONT_MENU', '1'); vi.resetModules();
  const playcaller = await import('../src/game/playcaller.js');
  const team = await import('../src/league/team.js');
  const { Rng } = await import('../src/core/rng.js');
  const defTeam = team.generateTeam(new Rng(3), 'D', 'D', { defScheme: '4-3' }), offTeam = team.generateTeam(new Rng(4), 'O', 'O');
  const dc = new playcaller.DefensiveCoordinator(defTeam, new Rng(9)); const players = team.pickOffense(offTeam, '11');
  const cs: DefensivePlayCall[] = Array.from({ length: n }, () => dc.call({ down: sit.down, distance: sit.distance, yardline: 40, quarter: 1, clock: 600, scoreDiff: 0, ballY: HASH_LEFT_Y, hurry: false }, '11', offTeam, players).call);
  const sub = cs.filter(c => c.personnel === 'nickel' || c.personnel === 'dime');
  return { rate: sub.filter(c => c.mug).length / Math.max(sub.length, 1), n: sub.length };
}

describe('MUG_CALLS: mugs on every down at league rates', () => {
  it('on: early-down mugs appear, third and long mugs most', async () => {
    const first = await calls('1', { down: 1, distance: 10 }), third = await calls('1', { down: 3, distance: 8 });
    expect(first.n).toBeGreaterThan(300);
    expect(first.rate).toBeGreaterThan(0);
    expect(third.rate).toBeGreaterThan(2 * first.rate);
  });
  it('off: no first-down mugs', async () => {
    expect((await calls('0', { down: 1, distance: 10 })).rate).toBe(0);
  });
});
