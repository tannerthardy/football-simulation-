/** DEF_PACKAGE (playcaller.ts defPackage): the package answers personnel by
 * down and distance; SHELL_SHOW: disguise depends on the coverage called, and
 * a disguised man safety shows the deep look (alignment.ts alignDisguised).
 * Off: the old personnel rules and one disguise rate. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y, HASH_LEFT_Y } from '../src/core/field.js';
import { DEF_PERSONNEL, type DefSlot, type DefensivePlayCall } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(flags: Record<string, '0' | '1'>) {
  // The coverage call also reads the formation; these contracts are the package's and the shell's.
  vi.stubEnv('COVER_CALL', '0');
  for (const [k, v] of Object.entries(flags)) vi.stubEnv(k, v);
  vi.resetModules();
  const playcaller = await import('../src/game/playcaller.js');
  const team = await import('../src/league/team.js');
  const { Rng } = await import('../src/core/rng.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const calls = (offPersonnel: '11' | '21', sit: { down: number; distance: number }, n = 400, scheme: '4-3' | '3-4' = '4-3', formation?: string, system?: 'two-high') => {
    const defTeam = team.generateTeam(new Rng(3), 'D', 'D', { defScheme: scheme }), offTeam = team.generateTeam(new Rng(4), 'O', 'O');
    if (system) defTeam.coach.coverageSystem = system;
    const dc = new playcaller.DefensiveCoordinator(defTeam, new Rng(9));
    const players = team.pickOffense(offTeam, offPersonnel);
    return Array.from({ length: n }, () => dc.call({ down: sit.down, distance: sit.distance, yardline: 40, quarter: 1, clock: 600, scoreDiff: 0,
      ballY: HASH_LEFT_Y, hurry: false }, offPersonnel, offTeam, players, formation ? FORMATION_BY_ID[formation] : undefined).call);
  };
  return { calls };
}
const share = (cs: DefensivePlayCall[], f: (c: DefensivePlayCall) => boolean) => cs.filter(f).length / cs.length;

describe('defensive package by situation', () => {
  it('third and 5 against 11: dime about three times in ten on, rarely off', async () => {
    const on = (await load({ DEF_PACKAGE: '1' })).calls('11', { down: 3, distance: 5 });
    const off = (await load({ DEF_PACKAGE: '0' })).calls('11', { down: 3, distance: 5 });
    expect(share(on, c => c.personnel === 'dime')).toBeGreaterThan(.2);
    expect(share(off, c => c.personnel === 'dime')).toBeLessThan(.1);
  });
  it('first down against 21: nickel about a third of the time on', async () => {
    const on = (await load({ DEF_PACKAGE: '1' })).calls('21', { down: 1, distance: 10 });
    expect(share(on, c => c.personnel === 'nickel')).toBeGreaterThan(.2);
    expect(share(on, c => c.personnel === 'base43')).toBeGreaterThan(.5);
  });
});

describe('disguise by the coverage called', () => {
  it('on: quarters disguises less often than Cover 3', async () => {
    const cs = (await load({ SHELL_SHOW: '1' })).calls('11', { down: 1, distance: 10 }, 1200);
    const rate = (fam: string) => { const f = cs.filter(c => c.coverage.family === fam); return share(f, c => !!c.shown); };
    expect(rate('cover3')).toBeGreaterThan(rate('cover4'));
  });
  it('on: against under center a one-high call shows two high less and a two-high call rolls down more; off, the formation changes nothing', async () => {
    const shown = (cs: DefensivePlayCall[], look: string) => {
      const f = cs.filter(c => (c.coverage.look ?? c.coverage.shell) === look);
      return share(f, c => !!c.shown);
    };
    const on = await load({ SHELL_SHOW: '1' });
    const gun = on.calls('11', { down: 1, distance: 10 }, 1500, '4-3', 'gun_doubles_11');
    const under = on.calls('11', { down: 1, distance: 10 }, 1500, '4-3', 'ace_11');
    expect(shown(under, 'one-high')).toBeLessThan(.6 * shown(gun, 'one-high'));
    expect(shown(under, 'two-high')).toBeGreaterThan(1.2 * shown(gun, 'two-high'));
    const off = await load({ SHELL_SHOW: '0' });
    expect(off.calls('11', { down: 1, distance: 10 }, 300, '4-3', 'ace_11')).toEqual(off.calls('11', { down: 1, distance: 10 }, 300, '4-3', 'gun_doubles_11'));
  });
  it('on: a two-high tree keeps its own presentation, two high on about 85% of its one-high calls in the gun', async () => {
    const cs = (await load({ SHELL_SHOW: '1' })).calls('11', { down: 1, distance: 10 }, 1500, '4-3', 'gun_doubles_11', 'two-high');
    const oneHigh = cs.filter(c => (c.coverage.look ?? c.coverage.shell) === 'one-high');
    expect(oneHigh.length).toBeGreaterThan(100);
    const rate = share(oneHigh, c => c.shown?.shell === 'two-high');
    expect(rate).toBeGreaterThan(.75);
    expect(rate).toBeLessThan(.92);
  });
  it('a disguised Cover 1 safety shows deep on, stays at his man\'s depth off', async () => {
    const at = async (on: boolean) => {
      vi.stubEnv('SHELL_SHOW', on ? '1' : '0');
      vi.resetModules();
      const { alignDefense, alignOffense } = await import('../src/playbook/alignment.js');
      const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
      const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
      const off = alignOffense(FORMATION_BY_ID.gun_trey_11, false, 40, CENTER_Y);
      const def = alignDefense({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1, shown: COVERAGE_BY_ID.cover2, pressure: null, label: 'd' },
        off, Object.keys(DEF_PERSONNEL.nickel) as DefSlot[]);
      return def.spots.SS!;
    };
    const on = await at(true), off = await at(false);
    expect(on.role.kind).toBe('man');
    expect(on.pos.x - 40).toBeGreaterThan(9);
    expect(off.pos.x - 40).toBeLessThanOrEqual(6);
  });
});
