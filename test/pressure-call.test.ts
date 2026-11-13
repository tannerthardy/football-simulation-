/** PRESSURE_CALL (playcaller.ts): the coordinator's blitz chance is scaled by
 * the shell behind it, as tracked (5+ rushers: one-high 38%, two-high 11%).
 * Off: one chance whatever the coverage. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import type { DefensivePlayCall } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function rates(on: boolean) {
  vi.stubEnv('PRESSURE_CALL', on ? '1' : '0');
  vi.stubEnv('DEUCE', '1');
  vi.resetModules();
  const { DefensiveCoordinator } = await import('../src/game/playcaller.js');
  const { generateTeam, pickOffense } = await import('../src/league/team.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { Rng } = await import('../src/core/rng.js');
  const calls: DefensivePlayCall[] = [];
  for (let i = 0; i < 16; i++) {
    const d = generateTeam(new Rng(40 + i), 'D', 'D'), o = generateTeam(new Rng(90 + i), 'O', 'O');
    const dc = new DefensiveCoordinator(d, new Rng(5 + i)), players = pickOffense(o, '11');
    for (let k = 0; k < 120; k++) calls.push(dc.call({ down: k % 3 + 1, distance: 6, yardline: 45, quarter: 1, clock: 800, scoreDiff: 0, ballY: CENTER_Y, hurry: false },
      '11', o, players, FORMATION_BY_ID.gun_doubles_11).call);
  }
  const five = (c: DefensivePlayCall) => !!c.pressure && (c.pressure.rushers ?? 4 + Object.keys(c.pressure.blitzers).length) >= 5;
  const rate = (shell: string) => { const g = calls.filter(c => (c.coverage.look ?? c.coverage.shell) === shell); return g.filter(five).length / g.length; };
  return { one: rate('one-high'), two: rate('two-high') };
}

describe('pressure by the shell behind it', () => {
  it('on: five or more rushers far more often behind one high than two; off, closer together', async () => {
    const on = await rates(true), off = await rates(false);
    expect(on.one).toBeGreaterThan(2.5 * on.two);
    expect(on.one).toBeGreaterThan(off.one);
    expect(on.two).toBeLessThan(off.two);
  });
});
