/** OL_ALIGN (experimental, off): the line stands as tracked (staggered depths
 * behind the ball, 1.5 yd splits) and the defensive techniques and gap
 * landmarks follow those splits rather than the 1.3 yd table. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { DEF_PERSONNEL, type DefSlot } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function line(on: boolean) {
  vi.stubEnv('OL_ALIGN', on ? '1' : '0');
  vi.resetModules();
  const { alignDefense, alignOffense, gapY } = await import('../src/playbook/alignment.js');
  const los = 40, off = alignOffense(FORMATION_BY_ID.i_pro_21, false, los, CENTER_Y);
  const def = alignDefense({ personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    off, Object.keys(DEF_PERSONNEL.base43) as DefSlot[]);
  // Distances across the field from the ball toward each side (strong +).
  const y = (slot: string) => ((off.spots[slot] ?? def.spots[slot as DefSlot])!.pos.y - CENTER_Y) * off.strongSign;
  const depth = (slot: string) => los - off.spots[slot]!.pos.x;
  return { off, y, depth, gap: (g: 'A' | 'B' | 'C', s: number) => (gapY(off, g, s * off.strongSign) - CENTER_Y) * off.strongSign };
}

describe('OL_ALIGN line alignment', () => {
  it('off: the flat 0.55 yd line with 1.3 yd splits is unchanged', async () => {
    const { depth, y } = await line(false);
    for (const s of ['LT', 'LG', 'C', 'RG', 'RT']) expect(depth(s)).toBeCloseTo(.55, 9);
    expect(Math.abs(y('RG'))).toBeCloseTo(1.3, 9);
    expect(Math.abs(y('RT'))).toBeCloseTo(2.6, 9);
    expect(Math.abs(y('Y'))).toBeCloseTo(3.9, 9);
  });

  it('on: tracked depths and splits; heads stay on the line', async () => {
    const { depth, y } = await line(true);
    expect(depth('C')).toBeCloseTo(.29, 9);
    for (const s of ['LG', 'RG']) expect(depth(s)).toBeCloseTo(.83, 9);
    for (const s of ['LT', 'RT']) expect(depth(s)).toBeCloseTo(.98, 9);
    expect(depth('Y')).toBeCloseTo(1.19, 9);
    expect(depth('Y')).toBeLessThan(depth('QB'));
    expect(Math.abs(y('RT')) - Math.abs(y('RG'))).toBeCloseTo(1.56, 9);
    expect(Math.abs(y('Y')) - Math.abs(y('RT'))).toBeCloseTo(1.52, 9);
  });

  it.each([false, true])('on=%s: techniques and gaps keep their blockers', async (on) => {
    const { y, gap } = await line(on);
    // The tight end's side is strong (+); the guard and tackle there and away.
    const strongG = y(y('RG') > 0 ? 'RG' : 'LG'), strongT = y(y('RT') > 0 ? 'RT' : 'LT');
    const G = -y(y('RG') > 0 ? 'LG' : 'RG'), T = -y(y('RT') > 0 ? 'LT' : 'RT'), E = y('Y');
    expect(E).toBeGreaterThan(strongT); expect(strongT).toBeGreaterThan(strongG); expect(T).toBeGreaterThan(G);
    // Over front: 3 technique on the strong guard's outside shoulder, inside
    // the tackle; 1 technique in the weak A gap; 5 just outside the weak
    // tackle; 6 head-up on the tight end.
    expect(y('DT_S')).toBeGreaterThan(strongG);
    expect(y('DT_S')).toBeLessThan((strongG + strongT) / 2 + .05);
    expect(-y('DT_W')).toBeGreaterThan(0); expect(-y('DT_W')).toBeLessThan(G);
    expect(-y('DE_W')).toBeGreaterThan(T); expect(-y('DE_W')).toBeLessThan(T + 1);
    expect(Math.abs(y('DE_S') - E)).toBeLessThan(.5);
    // Gap landmarks sit between their blockers.
    expect(gap('A', 1)).toBeGreaterThan(0); expect(gap('A', 1)).toBeLessThan(strongG);
    expect(gap('B', 1)).toBeGreaterThan(strongG); expect(gap('B', 1)).toBeLessThan(strongT);
    expect(gap('C', 1)).toBeGreaterThan(strongT); expect(gap('C', 1)).toBeLessThan(E);
  });

  it.each([false, true])('on=%s: legacy landmarks land on the actual line', async (on) => {
    vi.stubEnv('OL_ALIGN', on ? '1' : '0');
    vi.resetModules();
    const { lineOffset } = await import('../src/playbook/alignment.js');
    for (const te of [false, true]) for (const y of [0, .65, 1.95, 3.6, 4.3, 8]) {
      if (!on) { expect(lineOffset(y, te)).toBe(y); expect(lineOffset(-y, te)).toBe(-y); continue; }
      expect(lineOffset(-y, te)).toBeCloseTo(-lineOffset(y, te), 12);
    }
    if (!on) return;
    // The guard, tackle and end themselves, then gaps between them.
    expect(lineOffset(1.3, true)).toBeCloseTo(1.54, 9);
    expect(lineOffset(2.6, false)).toBeCloseTo(3.10, 9);
    expect(lineOffset(3.9, true)).toBeCloseTo(4.62, 9);
    expect(lineOffset(1.95, true)).toBeCloseTo(1.54 + 1.56 / 2, 9);
    // Outside the last body, carried with it.
    expect(lineOffset(3.4, false)).toBeCloseTo(3.10 + .8, 9);
    expect(lineOffset(8, true)).toBeCloseTo(4.62 + 4.1, 9);
  });
});
