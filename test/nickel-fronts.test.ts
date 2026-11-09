/** NICKEL_FRONTS (defense.ts catalog, playcaller.ts call; experimental, off):
 * nickel and dime also play a five-man Nickel Tite and a three-man Mint 3-Down.
 * Off: neither is in the catalog nor called. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y, HASH_LEFT_Y } from '../src/core/field.js';
import { DEF_PERSONNEL, type DefSlot, type DefensivePlayCall } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(flag: string) {
  vi.stubEnv('NICKEL_FRONTS', flag); vi.stubEnv('FRONT_MENU', '1'); vi.resetModules();
  const defense = await import('../src/playbook/defense.js');
  const alignment = await import('../src/playbook/alignment.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const playcaller = await import('../src/game/playcaller.js');
  const team = await import('../src/league/team.js');
  const { Rng } = await import('../src/core/rng.js');
  const calls = (down: number, distance: number, n = 1500) => {
    const defTeam = team.generateTeam(new Rng(3), 'D', 'D', { defScheme: '4-3' }), offTeam = team.generateTeam(new Rng(4), 'O', 'O');
    const dc = new playcaller.DefensiveCoordinator(defTeam, new Rng(9)); const players = team.pickOffense(offTeam, '11');
    return Array.from({ length: n }, () => dc.call({ down, distance, yardline: 40, quarter: 1, clock: 600, scoreDiff: 0, ballY: HASH_LEFT_Y, hurry: false }, '11', offTeam, players).call as DefensivePlayCall);
  };
  const onLine = (front: string, personnel: 'nickel' | 'dime') => {
    const off = alignment.alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, CENTER_Y);
    const d = alignment.alignDefense({ personnel, front: defense.FRONT_BY_ID[front], coverage: defense.COVERAGE_BY_ID.cover3, pressure: null, label: '' }, off, Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[]);
    return Object.values(d.spots).filter(s => s!.pos.x - 40 < 2).length;
  };
  return { defense, calls, onLine };
}

describe('NICKEL_FRONTS', () => {
  it('off: the sub fronts are not in the catalog and never called', async () => {
    const { defense, calls } = await load('0');
    expect(defense.FRONT_BY_ID.tite_n).toBeUndefined();
    expect(calls(1, 10).some(c => c.front.id === 'tite_n' || c.front.id === 'mint3')).toBe(false);
  });
  it('on: Nickel Tite puts five on the line, Mint 3-Down three', async () => {
    const { onLine } = await load('1');
    expect(onLine('tite_n', 'nickel')).toBe(5);
    expect(onLine('mint3', 'nickel')).toBe(3);
    expect(onLine('mint3', 'dime')).toBe(3);
  });
  it('on: sub packages call them at about their shares', async () => {
    const { calls } = await load('1');
    const sub = calls(1, 10).filter(c => c.personnel === 'nickel');
    const five = sub.filter(c => c.front.id === 'tite_n').length / sub.length, three = sub.filter(c => c.front.id === 'mint3').length / sub.length;
    expect(sub.length).toBeGreaterThan(300);
    expect(five).toBeGreaterThan(0.07); expect(five).toBeLessThan(0.17);
    expect(three).toBeGreaterThan(0.02); expect(three).toBeLessThan(0.09);
  });
});
