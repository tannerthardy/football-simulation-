/** NICKEL_FRONTS (defense.ts catalog, alignment.ts roles, playcaller.ts calls;
 * experimental, off): sub packages also play the Penny (5-1, Tite interior),
 * Penny Bear (5-1, 3-0-3), Mint (4i-0-4i with one edge and two backers),
 * Okie (5-0-5 with a rover) and, in 3-3-5 personnel, the 3-3 Stack.
 * SHORT_BASE (playcaller.ts, experimental, off): short yardage vs heavy
 * personnel uses the heavy package on about 15% of snaps, base otherwise.
 * Off: none of these fronts exist or are called. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y, HASH_LEFT_Y } from '../src/core/field.js';
import { DEF_PERSONNEL, type DefPersonnelId, type DefSlot, type DefensivePlayCall } from '../src/playbook/types.js';

const SUB = ['penny', 'penny_bear', 'mint', 'okie', 'stack33'];
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(flags: Record<string, string>) {
  for (const [k, v] of Object.entries(flags)) vi.stubEnv(k, v);
  vi.stubEnv('FRONT_MENU', '1'); vi.resetModules();
  const defense = await import('../src/playbook/defense.js');
  const alignment = await import('../src/playbook/alignment.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const playcaller = await import('../src/game/playcaller.js');
  const team = await import('../src/league/team.js');
  const { Rng } = await import('../src/core/rng.js');
  const calls = (down: number, distance: number, offP: '11' | '21' = '11', n = 1500) => {
    const defTeam = team.generateTeam(new Rng(3), 'D', 'D', { defScheme: '4-3' }), offTeam = team.generateTeam(new Rng(4), 'O', 'O');
    const dc = new playcaller.DefensiveCoordinator(defTeam, new Rng(9)); const players = team.pickOffense(offTeam, offP);
    return Array.from({ length: n }, () => dc.call({ down, distance, yardline: 40, quarter: 1, clock: 600, scoreDiff: 0, ballY: HASH_LEFT_Y, hurry: false }, offP, offTeam, players).call as DefensivePlayCall);
  };
  const align = (front: string, personnel: DefPersonnelId, cov = 'cover3', situation?: { down: number; distance: number; toGoal: number }) => {
    const off = alignment.alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, CENTER_Y);
    return alignment.alignDefense({ personnel, front: defense.FRONT_BY_ID[front], coverage: defense.COVERAGE_BY_ID[cov], pressure: null, label: '' },
      off, Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[], {}, situation ? { situation } : {});
  };
  const onLine = (d: any) => Object.values(d.spots).filter((s: any) => s.pos.x - 40 < 2).length;
  return { defense, calls, align, onLine };
}

describe('NICKEL_FRONTS', () => {
  it('off: the sub fronts are not in the catalog and never called', async () => {
    const { defense, calls } = await load({ NICKEL_FRONTS: '0' });
    for (const id of SUB) expect(defense.FRONT_BY_ID[id]).toBeUndefined();
    expect(calls(1, 10).some(c => SUB.includes(c.front.id))).toBe(false);
  });
  it('on: Penny and Penny Bear put five on the line and the walked-up Will rushes on zone calls', async () => {
    const { align, onLine } = await load({ NICKEL_FRONTS: '1' });
    for (const f of ['penny', 'penny_bear']) { const d = align(f, 'nickel'); expect(onLine(d)).toBe(5); expect(d.spots.LB_W!.role.kind).toBe('rush'); }
  });
  it('on: Mint keeps its weak 4i and leaves the weak edge to a backer; Okie is three down', async () => {
    const { align, onLine } = await load({ NICKEL_FRONTS: '1' });
    const m = align('mint', 'nickel');
    expect(onLine(m)).toBe(4);
    expect(Math.abs(m.spots.DE_W!.pos.y - CENTER_Y)).toBeLessThan(Math.abs(m.spots.LB_W!.pos.y - CENTER_Y));
    expect(onLine(align('okie', 'dime'))).toBe(3);
  });
  it('on: the Okie rover drops on 3rd and long and rushes on early downs', async () => {
    const { align } = await load({ NICKEL_FRONTS: '1' });
    expect(align('okie', 'nickel', 'cover3', { down: 3, distance: 9, toGoal: 50 }).spots.DT_W!.role.kind).toBe('zone');
    expect(align('okie', 'nickel', 'cover3', { down: 1, distance: 10, toGoal: 50 }).spots.DT_W!.role.kind).toBe('rush');
  });
  it('on: the 3-3 Stack stacks three backers behind three down linemen', async () => {
    const { align, onLine } = await load({ NICKEL_FRONTS: '1' });
    const d = align('stack33', 'stack335');
    expect(onLine(d)).toBe(3);
    for (const lb of ['LB_S', 'LB_M', 'LB_W'] as DefSlot[]) expect(d.spots[lb]!.pos.x - 40).toBeGreaterThan(4);
  });
  it('on: sub packages call the sub fronts at about their shares', async () => {
    const { calls } = await load({ NICKEL_FRONTS: '1' });
    const cs = calls(1, 10);
    const nickel = cs.filter(c => c.personnel === 'nickel'), share = (id: string) => nickel.filter(c => c.front.id === id).length / nickel.length;
    expect(nickel.length).toBeGreaterThan(300);
    expect(share('penny_bear')).toBeGreaterThan(0.02); expect(share('penny_bear')).toBeLessThan(0.09);
    expect(cs.some(c => c.personnel === 'stack335' && c.front.id === 'stack33')).toBe(true);
  });
});

describe('SHORT_BASE', () => {
  it('short yardage vs heavy personnel: always heavy off, about 15% heavy on', async () => {
    const off = (await load({ SHORT_BASE: '0' })).calls(3, 1, '21', 600), on = (await load({ SHORT_BASE: '1' })).calls(3, 1, '21', 600);
    const heavy = (cs: DefensivePlayCall[]) => cs.filter(c => c.personnel === 'heavy').length / cs.length;
    expect(heavy(off)).toBeGreaterThan(0.95);
    expect(heavy(on)).toBeGreaterThan(0.07); expect(heavy(on)).toBeLessThan(0.25);
  });
});
