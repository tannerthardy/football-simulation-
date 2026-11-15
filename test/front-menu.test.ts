/** FRONT_MENU (playcaller.ts menu weights; alignment.ts backer spots and
 * mugs): the caller calls the families teams line up in, backers stand where
 * tracking puts them for the called family, and a mug walks a backer into an
 * open A gap. Off: the new fronts are never called and spots are unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y, HASH_LEFT_Y } from '../src/core/field.js';
import { DEF_PERSONNEL, type DefPersonnelId, type DefSlot, type DefensivePlayCall } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(on: boolean) {
  vi.stubEnv('FRONT_MENU', on ? '1' : '0');
  // The installed techniques' geometry and the walk-outs are other flags'.
  vi.stubEnv('FRONT_ALIGN', '0'); vi.stubEnv('BOX_ALIGN', '0');
  // The expected spots are staged on the installed 1.3 yd line splits.
  vi.stubEnv('OL_SPLITS', '0');
  vi.resetModules();
  const alignment = await import('../src/playbook/alignment.js');
  const defense = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const playcaller = await import('../src/game/playcaller.js');
  const team = await import('../src/league/team.js');
  const { Rng } = await import('../src/core/rng.js');
  const align = (front: string, personnel: DefPersonnelId, extra: Partial<DefensivePlayCall> = {}, formation = 'gun_doubles_11') => {
    const off = alignment.alignOffense(FORMATION_BY_ID[formation], false, 40, CENTER_Y);
    const def = alignment.alignDefense({ personnel, front: defense.FRONT_BY_ID[front], coverage: defense.COVERAGE_BY_ID.cover3, pressure: null, label: front, ...extra },
      off, Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[]);
    // Line units on the front's strong side (1 a guard, 2 a tackle; 1.3 yd splits off).
    const units = (slot: DefSlot) => {
      const a = (def.spots[slot]!.pos.y - CENTER_Y) * alignment.frontSign({ personnel, front: defense.FRONT_BY_ID[front], coverage: defense.COVERAGE_BY_ID.cover3, pressure: null, label: '' }, off);
      return Math.sign(a) * (Math.abs(a) <= 1.3 ? Math.abs(a) / 1.3 : 1 + (Math.abs(a) - 1.3) / 1.3);
    };
    return { def, units, depth: (slot: DefSlot) => def.spots[slot]!.pos.x - 40 };
  };
  const calls = (scheme: 'nickel-heavy' | '3-4' | '4-3', offPersonnel: '11' | '21', sit: { down: number; distance: number }, n = 300) => {
    const defTeam = team.generateTeam(new Rng(3), 'D', 'D', { defScheme: scheme }), offTeam = team.generateTeam(new Rng(4), 'O', 'O');
    const dc = new playcaller.DefensiveCoordinator(defTeam, new Rng(9));
    const players = team.pickOffense(offTeam, offPersonnel);
    return Array.from({ length: n }, () => dc.call({ down: sit.down, distance: sit.distance, yardline: 40, quarter: 1, clock: 600, scoreDiff: 0, ballY: HASH_LEFT_Y, hurry: false },
      offPersonnel, offTeam, players).call);
  };
  return { align, calls, MENU_FRONTS: defense.MENU_FRONTS };
}

describe('the front menu', () => {
  it('off: the new fronts are never called', async () => {
    const { calls, MENU_FRONTS } = await load(false);
    for (const scheme of ['3-4', '4-3'] as const)
      expect(calls(scheme, '21', { down: 1, distance: 10 }).filter((c) => MENU_FRONTS.has(c.front.id))).toEqual([]);
  });
  it('on: a 3-4 team\'s base fronts are the bear and the tite far more than the 5-0-5', async () => {
    const { calls } = await load(true);
    const base = calls('3-4', '21', { down: 1, distance: 10 }).filter((c) => c.personnel === 'base34');
    const count = (id: string) => base.filter((c) => c.front.id === id).length;
    expect(base.length).toBeGreaterThan(100);
    expect(count('bear34')).toBeGreaterThan(count('tite'));
    expect(count('tite')).toBeGreaterThan(4 * count('odd'));
    expect(count('under34')).toBeGreaterThan(0);
  });
  it('on: nickel even fronts grow on third down and mugs appear only there', async () => {
    const { calls } = await load(true);
    const early = calls('4-3', '11', { down: 1, distance: 10 }), third = calls('4-3', '11', { down: 3, distance: 8 });
    const even = (cs: DefensivePlayCall[]) => cs.filter((c) => c.front.id === 'even').length / cs.length;
    expect(even(third)).toBeGreaterThan(2 * even(early));
    // Re-recorded on the engine defaults (2026-11-15): MUG_CALLS calls A-gap mugs on every down at league rates (nickel
    // 1st & 10 1.3%, 3rd & long 19%), not on third down only, so early mugs are rare rather than absent.
    const mug = (cs: DefensivePlayCall[]) => cs.filter((c) => c.mug).length / cs.length;
    expect(mug(early)).toBeLessThan(mug(third) / 3);
    expect(third.some((c) => c.mug)).toBe(true);
  });
  it('off: backers keep the front\'s installed techniques', async () => {
    const { align } = await load(false);
    expect(align('over', 'nickel').units('LB_M')).toBeCloseTo(.5, 6);
  });
  it('on: two nickel backers stack the B gaps; three base backers put the Mike in the strong A gap', async () => {
    const { align } = await load(true);
    const nickel = align('over', 'nickel');
    expect(nickel.units('LB_W')).toBeCloseTo(-1.4, 6);
    expect(nickel.units('LB_M')).toBeCloseTo(1.7, 6);
    expect(nickel.depth('LB_M')).toBeCloseTo(4.6, 6);
    const base = align('over', 'base43', {}, 'i_pro_21');
    expect(base.units('LB_W')).toBeLessThan(-1.5);
    expect(base.units('LB_M')).toBeCloseTo(.5, 6);
  });
  it('on: a mug fills only open A gaps, the Mike first', async () => {
    const { align } = await load(true);
    const even = align('even', 'nickel', { mug: 2 });
    for (const slot of ['LB_M', 'LB_W'] as DefSlot[]) {
      expect(even.depth(slot)).toBeCloseTo(1.2, 6);
      expect(Math.abs(even.units(slot))).toBeCloseTo(.5, 6);
    }
    expect(Math.sign(even.units('LB_M'))).toBe(1);
    // The Over's 1 technique occupies the weak A gap: one mug, strong.
    const over = align('over', 'nickel', { mug: 2 });
    expect(over.depth('LB_M')).toBeCloseTo(1.2, 6);
    expect(over.units('LB_M')).toBeCloseTo(.5, 6);
    expect(over.depth('LB_W')).toBeGreaterThan(4);
  });
});
