/** OL_SPLITS and OL_STAGGER (experimental, off): the line splits and stands
 * off the ball as tracked; the defensive techniques and gap landmarks follow
 * the actual splits rather than the 1.3 yd table. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { DEF_PERSONNEL, type DefSlot } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function line(splits: boolean, stagger = false) {
  vi.stubEnv('OL_SPLITS', splits ? '1' : '0');
  vi.stubEnv('OL_STAGGER', stagger ? '1' : '0');
  // The installed Over front's techniques; FRONT_ALIGN has its own test.
  vi.stubEnv('FRONT_ALIGN', '0');
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

describe('OL_SPLITS / OL_STAGGER line alignment', () => {
  it('off: the flat 0.55 yd line with 1.3 yd splits is unchanged', async () => {
    const { depth, y } = await line(false);
    for (const s of ['LT', 'LG', 'C', 'RG', 'RT']) expect(depth(s)).toBeCloseTo(.55, 9);
    expect(Math.abs(y('RG'))).toBeCloseTo(1.3, 9);
    expect(Math.abs(y('RT'))).toBeCloseTo(2.6, 9);
    expect(Math.abs(y('Y'))).toBeCloseTo(3.9, 9);
  });

  it('splits: tracked splits; the line stays flat', async () => {
    const { depth, y } = await line(true);
    for (const s of ['LT', 'LG', 'C', 'RG', 'RT']) expect(depth(s)).toBeCloseTo(.55, 9);
    expect(Math.abs(y('RG'))).toBeCloseTo(1.54, 9);
    expect(Math.abs(y('RT')) - Math.abs(y('RG'))).toBeCloseTo(1.56, 9);
    expect(Math.abs(y('Y')) - Math.abs(y('RT'))).toBeCloseTo(1.52, 9);
  });

  it('stagger: tracked depths, heads still on the line; splits unchanged', async () => {
    const { depth, y } = await line(false, true);
    expect(depth('C')).toBeCloseTo(.43, 9); // clear of the line for the widest body (0.42)
    for (const s of ['LG', 'RG']) expect(depth(s)).toBeCloseTo(.83, 9);
    for (const s of ['LT', 'RT']) expect(depth(s)).toBeCloseTo(.98, 9);
    // Re-recorded on the engine defaults (2026-11-15): RECEIVER_DEPTH sets an inline end on the line at the tracked tight
    // end depth (0.83, n 1,500), ahead of OL_STAGGER's installed 1.19.
    expect(depth('Y')).toBeCloseTo(0.83, 9);
    expect(depth('Y')).toBeLessThan(depth('QB'));
    expect(Math.abs(y('RT'))).toBeCloseTo(2.6, 9);
  });

  it.each([false, true])('splits=%s: techniques and gaps keep their blockers', async (on) => {
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

  it.each([false, true])('splits=%s: legacy landmarks land on the actual line', async (on) => {
    vi.stubEnv('OL_SPLITS', on ? '1' : '0');
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

  it.each([false, true])('stagger=%s: depth landmarks stand behind the actual line', async (on) => {
    vi.stubEnv('OL_STAGGER', on ? '1' : '0');
    vi.resetModules();
    const { lineDepth } = await import('../src/playbook/alignment.js');
    for (const d of [.1, .3, .55]) expect(lineDepth(d)).toBe(d);
    if (!on) { for (const d of [.6, 1.25, 1.4]) { expect(lineDepth(d)).toBe(d); expect(lineDepth(d, .83)).toBe(d); } return; }
    // A pull path behind the flat line's heels stays as far behind the tackles'.
    expect(lineDepth(1.25)).toBeCloseTo(1.25 - .55 + .98, 12);
    // A set measured from the lineman's own stance.
    expect(lineDepth(.6, .83)).toBeCloseTo(.88, 12);
    expect(lineDepth(.65, .98) - .98).toBeCloseTo(.1, 12);
  });

  it.each([false, true])('splits=%s: the line tightens on third or fourth and a yard, not on first', async (on) => {
    vi.stubEnv('OL_SPLITS', on ? '1' : '0');
    vi.resetModules();
    const { alignOffense } = await import('../src/playbook/alignment.js');
    const width = (down: number, distance: number) => {
      const a = alignOffense(FORMATION_BY_ID.i_pro_21, false, 40, CENTER_Y, { kind: 'run', down, distance });
      return Math.abs(a.spots.LT.pos.y - a.spots.RT.pos.y);
    };
    expect(width(1, 1)).toBeCloseTo(on ? 6.2 : 5.2, 9);
    expect(width(3, 1)).toBeCloseTo(on ? 2 * (1.45 + 1.47) : 5.2, 9);
  });

  it.each([false, true])('stagger=%s: guards and tackles stand deeper to pass than to run', async (on) => {
    vi.stubEnv('OL_STAGGER', on ? '1' : '0');
    vi.resetModules();
    const { alignOffense } = await import('../src/playbook/alignment.js');
    const depth = (kind: 'pass' | 'run', down = 1, distance = 10) => {
      const a = alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, CENTER_Y, { kind, down, distance });
      return [40 - a.spots.LG.pos.x, 40 - a.spots.LT.pos.x, 40 - a.spots.C.pos.x];
    };
    if (!on) { expect(depth('pass', 3, 8)).toEqual(depth('run')); return; }
    const [pg, pt] = depth('pass'), [lg, lt] = depth('pass', 3, 8), [rg, rt, rc] = depth('run');
    expect([pg, pt]).toEqual([.9, 1.1].map(v => expect.closeTo(v, 9)));
    expect([lg, lt]).toEqual([.9, 1.17].map(v => expect.closeTo(v, 9)));
    expect([rg, rt, rc]).toEqual([.82, .97, .43].map(v => expect.closeTo(v, 9)));
  });
});
