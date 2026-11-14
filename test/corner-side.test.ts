/** CORNER_SIDE (src/playbook/corner-side.ts; experimental, off): the coordinator calls a corner technique per side
 * where the coverage installs a solo corner, and the corner confirms it at the line: he presses while alone with his
 * #1, backs off when a detached #2 is on his side, and a receiver near the #2 line does not make him hop. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { DEF_PERSONNEL, type DefSlot, type DefensivePlayCall } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(on: boolean) {
  vi.stubEnv('CORNER_SIDE', on ? '1' : '0');
  vi.resetModules();
  return { ...(await import('../src/playbook/alignment.js')), ...(await import('../src/playbook/corner-side.js')) };
}
const call = (cov: string, tech?: DefensivePlayCall['cornerTech']): DefensivePlayCall =>
  ({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov, ...(tech ? { cornerTech: tech } : {}) });

describe('CORNER_SIDE', () => {
  it('the call: only a solo side gets a technique, pressed when the draw is under the habit', async () => {
    const m = await load(true);
    expect(m.soloSides(COVERAGE_BY_ID.cover3_mable)).toEqual(['W']);
    expect(m.soloSides(COVERAGE_BY_ID.cover3)).toEqual([]);
    expect(m.soloSides(COVERAGE_BY_ID.cover1)).toEqual([]);   // man calls press by the call, as now
    const edge = () => 1;
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3, 1, 1, edge, () => 0)).toBeUndefined();
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3_mable, 1, 1, edge, () => 0)).toEqual({ W: 'solo' });
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3_mable, 1, 1, edge, () => 0.99)).toEqual({ W: 'off' });
    // A better matchup and 3rd down make the press more likely for the same draw.
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3_mable, 1, 1, edge, () => 0.5)).toEqual({ W: 'off' });
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3_mable, 3, 1, () => 1.2, () => 0.5)).toEqual({ W: 'solo' });
  });

  it('at the line: a #2 near the line keeps the previous state (no hop)', async () => {
    const m = await load(true);
    const off = m.alignOffense(FORMATION_BY_ID.gun_trips_11, false, 40, CENTER_Y);
    const sign = -off.strongSign, man = off.numbering.W1!;
    const others = Object.keys(off.spots).filter((k) => k !== man && !off.spots[k].backfield && !off.spots[k].inline && !['LT', 'LG', 'C', 'RG', 'RT', 'QB'].includes(k));
    // Put one receiver on the corner's side at a given lateral distance from the ball.
    const withTwo = (lat: number) => ({ ...off, spots: { ...off.spots, [others[0]]: { ...off.spots[others[0]], pos: { x: off.spots[others[0]].pos.x, y: off.ballY + sign * lat } } } });
    expect(m.aloneWithOne(off, sign, man, undefined)).toBe(true);           // trips: the backside corner is alone
    expect(m.aloneWithOne(withTwo(6), sign, man, true)).toBe(false);        // a detached #2 appears: he backs off
    expect(m.aloneWithOne(withTwo(3), sign, man, false)).toBe(true);        // well inside: alone again
    expect(m.aloneWithOne(withTwo(4), sign, man, true)).toBe(true);         // between the lines: he keeps his press
    expect(m.aloneWithOne(withTwo(4), sign, man, false)).toBe(false);       // ... and his off
  });

  it('alignment: the solo corner presses alone with #1, not with a #2 to his side, not when called off or flag off', async () => {
    const slots = Object.keys(DEF_PERSONNEL.nickel) as DefSlot[];
    const on = await load(true);
    const trips = on.alignOffense(FORMATION_BY_ID.gun_trips_11, false, 40, CENTER_Y);
    const doubles = on.alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, CENTER_Y);
    const solo = on.alignDefense(call('cover3_mable', { W: 'solo' }), trips, slots).spots.CB_W!;
    expect(solo.press).toBe(true);
    expect(solo.pos.x - 40).toBeLessThan(2);
    expect(on.alignDefense(call('cover3_mable', { W: 'off' }), trips, slots).spots.CB_W!.press).toBeFalsy();
    expect(on.alignDefense(call('cover3_mable', { W: 'solo' }), doubles, slots).spots.CB_W!.press).toBeFalsy();
    // The strong-side corner is unchanged.
    expect(on.alignDefense(call('cover3_mable', { W: 'solo' }), trips, slots).spots.CB_S)
      .toEqual(on.alignDefense(call('cover3_mable'), trips, slots).spots.CB_S);
    const off = await load(false);
    const t2 = off.alignOffense(FORMATION_BY_ID.gun_trips_11, false, 40, CENTER_Y);
    expect(off.alignDefense(call('cover3_mable', { W: 'solo' }), t2, slots).spots.CB_W!.press).toBeFalsy();
  });

  it('disguise: the solo press is part of the look', async () => {
    const m = await load(true);
    const slots = Object.keys(DEF_PERSONNEL.nickel) as DefSlot[];
    const trips = m.alignOffense(FORMATION_BY_ID.gun_trips_11, false, 40, CENTER_Y);
    const shown = { ...call('cover3_mable', { W: 'solo' }), shown: COVERAGE_BY_ID.cover4 };
    const cb = m.alignDefense(shown, trips, slots).spots.CB_W!;
    expect(cb.press).toBe(true);
    expect(cb.pos.x - 40).toBeLessThan(2);
  });
});
