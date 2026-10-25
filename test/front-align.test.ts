/** FRONT_ALIGN (alignment.ts alignDefense, the front): shaded techniques sit
 * on their blocker's shoulder; each side's end man sets the edge outside the
 * surface (outside the tackle with no end there, at least on an end with
 * one), and his build moves him: lighter wider, never inside an end he is
 * set on. Off: the installed spots. */
import { afterEach, describe, expect, it, vi } from 'vitest';

// These are FRONT_ALIGN's own install weights; FRONT_MENU (PR #194) overrides them.
// The expected spots are staged on the installed 1.3 yd line splits.
vi.hoisted(() => { process.env.FRONT_MENU = '0'; process.env.OL_SPLITS = '0'; });
import { CENTER_Y } from '../src/core/field.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { DEF_PERSONNEL, type DefSlot } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function front(on: boolean, frontId = 'over', personnel: 'base43' | 'nickel' = 'base43', mass: Partial<Record<DefSlot, number>> = {}, edge?: 'tight' | 'base' | 'wide', formation = 'i_pro_21') {
  vi.stubEnv('FRONT_ALIGN', on ? '1' : '0');
  vi.resetModules();
  const { alignDefense, alignOffense } = await import('../src/playbook/alignment.js');
  const los = 40, off = alignOffense(FORMATION_BY_ID[formation], false, los, CENTER_Y);
  const def = alignDefense({ personnel, front: FRONT_BY_ID[frontId], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: frontId, edge },
    off, Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[], {}, { mass });
  // Across the field from the ball, strong (the end's side) positive.
  const y = (slot: string) => ((off.spots[slot] ?? def.spots[slot as DefSlot])!.pos.y - CENTER_Y) * off.strongSign;
  const strongG = Math.max(y('LG'), y('RG')), weakT = -Math.min(y('LT'), y('RT')), E = y('Y');
  return { y, def, off, strongG, weakT, E, depth: (slot: DefSlot) => def.spots[slot]!.pos.x - los };
}

describe('the front aligns on bodies and its end men by who they are', () => {
  it('off: the installed Over front', async () => {
    const f = await front(false);
    expect(-f.y('DE_W') - f.weakT).toBeCloseTo(.65, 9);
    expect(f.y('DT_S') - f.strongG).toBeCloseTo(.65, 9);
  });
  it('on: a 3 technique sits on the guard\'s outside shoulder', async () => {
    const f = await front(true);
    expect(f.y('DT_S') - f.strongG).toBeCloseTo(.57, 9);
  });
  it('on: with no end on his side the end man aligns outside the tackle, not on his shoulder', async () => {
    const f = await front(true);
    expect(-f.y('DE_W') - f.weakT).toBeGreaterThanOrEqual(1.6);
  });
  it('on: an end man inside a tight end moves onto him', async () => {
    const off = await front(false, 'under', 'nickel'), on = await front(true, 'under', 'nickel');
    expect(off.y('DE_S')).toBeLessThan(off.E - .5);
    expect(on.y('DE_S')).toBeGreaterThanOrEqual(on.E - 1e-9);
  });
  it('on: a light end aligns wider than a heavy one; the call\'s gap is unchanged', async () => {
    const light = await front(true, 'over', 'base43', { DE_S: 105, DE_W: 105 });
    const heavy = await front(true, 'over', 'base43', { DE_S: 130, DE_W: 130 });
    expect(light.y('DE_S')).toBeGreaterThan(heavy.y('DE_S'));
    expect(-light.y('DE_W')).toBeGreaterThan(-heavy.y('DE_W'));
    expect(light.def.spots.DE_W!.gap).toBe(heavy.def.spots.DE_W!.gap);
  });
  it('on: a heavy end set on a tight end does not slide inside him', async () => {
    const heavy = await front(true, 'over', 'base43', { DE_S: 140 });
    expect(heavy.y('DE_S')).toBeGreaterThanOrEqual(heavy.E - 1e-9);
  });
  it('on: the called edge sets the end man over an end and away from one', async () => {
    const tight = await front(true, 'over', 'base43', {}, 'tight'), base = await front(true, 'over', 'base43', {}, 'base');
    const wide = await front(true, 'over', 'base43', {}, 'wide');
    expect(tight.y('DE_S')).toBeCloseTo(tight.E, 9);
    expect(base.y('DE_S')).toBeCloseTo(base.E + 1.5, 9);
    expect(wide.y('DE_S')).toBeCloseTo(wide.E + 2.5, 9);
    expect(-tight.y('DE_W') - tight.weakT).toBeCloseTo(1.6, 9);
    expect(-wide.y('DE_W') - wide.weakT).toBeCloseTo(2.3, 9);
    expect(wide.def.spots.DE_S!.gap).toBe(tight.def.spots.DE_S!.gap);
  });
  it('on: a heavy end called on the outside shade stays on it', async () => {
    const base = await front(true, 'over', 'base43', { DE_S: 140 }, 'base');
    expect(base.y('DE_S') - base.E).toBeGreaterThanOrEqual(1.3 - 1e-9);
  });
});

describe('the end men and the Over Sam follow the installs\' rules from the look', () => {
  it('on: in nickel the closed end plays a 6 vs a near back and a 9 vs a dot back', async () => {
    const near = await front(true, 'over', 'nickel', {}, undefined, 'offset_i_21');
    const dot = await front(true, 'over', 'nickel', {}, undefined, 'i_pro_21');
    expect(near.y('DE_S')).toBeCloseTo(near.E, 9);
    expect(dot.y('DE_S')).toBeCloseTo(dot.E + 1.5, 9);
  });
  it('on: with no end on his side a called 6 is a ghost, where the end would stand', async () => {
    const f = await front(true, 'over', 'nickel', {}, undefined, 'gun_empty_11');
    expect(f.y('DE_S') - Math.max(f.y('LT'), f.y('RT'))).toBeCloseTo(1.6, 9);
  });
  it('on: vs a pair of ends the end plays a 9 on the end\'s outside shoulder, inside the wing, in base too', async () => {
    const pair = await front(true, 'over', 'base43', {}, undefined, 'gun_wing_12');
    expect(pair.y('DE_S')).toBeCloseTo(pair.E + .57, 9);
    expect(pair.y('DE_S')).toBeLessThan(pair.y('H'));
  });
  it('on: the Over Sam is a 90, the end\'s outside shade at linebacker depth', async () => {
    const off = await front(false), on = await front(true);
    expect(on.y('LB_S')).toBeCloseTo(on.E + .57, 9);
    expect(on.depth('LB_S')).toBeCloseTo(off.depth('LB_S'), 9);
    expect(off.y('LB_S')).toBeLessThan(off.E);
  });
  it('on: vs a wing the Over Sam is on the line head-up on him', async () => {
    const f = await front(true, 'over', 'base43', {}, undefined, 'gun_wing_12');
    expect(f.y('LB_S')).toBeCloseTo(f.y('H'), 9);
    expect(f.depth('LB_S')).toBeLessThan(2);
  });
});

describe('the coordinator calls fronts as the installs use them', () => {
  async function fronts(on: boolean, personnel: '21' | '11', down: number, distance: number, n = 120) {
    vi.stubEnv('FRONT_ALIGN', on ? '1' : '0');
    vi.resetModules();
    const { Rng } = await import('../src/core/rng.js');
    const { generateTeam, pickOffense } = await import('../src/league/team.js');
    const { DefensiveCoordinator } = await import('../src/game/playcaller.js');
    const team = generateTeam(new Rng(5), 'ONE', 'ONE'), offense = generateTeam(new Rng(6), 'OFF', 'OFF');
    team.defScheme = '4-3';
    const dc = new DefensiveCoordinator(team, new Rng(7));
    const s = { down, distance, yardline: 35, quarter: 1, clock: 900, scoreDiff: 0, ballY: CENTER_Y, hurry: false };
    return Array.from({ length: n }, () => dc.call(s, personnel, offense, pickOffense(offense, personnel)).call);
  }
  const share = (calls: { front: { id: string } }[], id: string) => calls.filter(c => c.front.id === id).length / calls.length;
  it('on: base personnel lines up in Under more than Over', async () => {
    const calls = (await fronts(true, '21', 1, 10)).filter(c => c.personnel === 'base43');
    expect(calls.length).toBeGreaterThan(20);
    expect(share(calls, 'under')).toBeGreaterThan(share(calls, 'over'));
  });
  it('on: nickel on a passing down is mostly the wide Rush front', async () => {
    const calls = (await fronts(true, '11', 3, 9)).filter(c => c.personnel === 'nickel');
    expect(share(calls, 'wide9')).toBeGreaterThan(.5);
  });
  it('off: the installed weighting, no edge call', async () => {
    const calls = await fronts(false, '11', 1, 10);
    expect(calls.every(c => c.edge === undefined)).toBe(true);
  });
});
