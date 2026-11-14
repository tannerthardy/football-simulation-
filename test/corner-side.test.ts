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
    // Called for the family (the solo install is made at the line); none for man calls or families without one.
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3, 1, edge, () => 0)).toEqual({ S: 'solo', W: 'solo' });
    expect(m.callCornerTech(COVERAGE_BY_ID.cover1, 1, edge, () => 0)).toBeUndefined();
    expect(m.callCornerTech(COVERAGE_BY_ID.tampa2, 1, edge, () => 0)).toBeUndefined();
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3_mable, 1, edge, () => 0.99)).toEqual({ S: 'off', W: 'off' });
    // The league tendency for Cover 3 is 48%: a draw of 0.47 presses, 0.49 does not; a man-heavy team or a better
    // matchup moves the odds (0.49 presses at a habit of 1.2), a weaker one the other way.
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3_mable, 1, edge, () => 0.47)).toEqual({ S: 'solo', W: 'solo' });
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3_mable, 1, edge, () => 0.49)).toEqual({ S: 'off', W: 'off' });
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3_mable, m.pressHabit(0.48), edge, () => 0.49)).toEqual({ S: 'solo', W: 'solo' });
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3_mable, 1, () => 0.8, () => 0.47)).toEqual({ S: 'off', W: 'off' });
  });

  it('the call: the receiver count moves the share (lone 48%, two 27%, three or more 19% in Cover 3)', async () => {
    const m = await load(true);
    const edge = () => 1, at = (n: number) => () => n;
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3, 1, edge, () => 0.4, at(1))).toEqual({ S: 'solo', W: 'solo' });
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3, 1, edge, () => 0.4, at(2))).toEqual({ S: 'off', W: 'off' });
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3, 1, edge, () => 0.2, at(2))).toEqual({ S: 'solo', W: 'solo' });
    expect(m.callCornerTech(COVERAGE_BY_ID.cover3, 1, edge, () => 0.2, at(3))).toEqual({ S: 'off', W: 'off' });
  });

  it('alignment: the called solo corner presses at the line with or without a #2; not when called off or flag off', async () => {
    const slots = Object.keys(DEF_PERSONNEL.nickel) as DefSlot[];
    const on = await load(true);
    const trips = on.alignOffense(FORMATION_BY_ID.gun_trips_11, false, 40, CENTER_Y);
    const doubles = on.alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, CENTER_Y);
    const solo = on.alignDefense(call('cover3_mable', { W: 'solo' }), trips, slots).spots.CB_W!;
    expect(solo.press).toBe(true);
    expect(solo.pos.x - 40).toBeLessThan(2);
    expect(on.alignDefense(call('cover3_mable', { W: 'off' }), trips, slots).spots.CB_W!.press).toBeFalsy();
    // No check by count at the line: the count acted through the call.
    const mableVsDoubles = on.alignDefense(call('cover3_mable', { W: 'solo' }), doubles, slots).spots.CB_W!;
    if (mableVsDoubles.role.kind === 'man') expect(mableVsDoubles.press).toBe(true);
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
