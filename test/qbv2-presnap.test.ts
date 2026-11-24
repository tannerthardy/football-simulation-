// QB_V2 module B (Flex, 2026-11-24): the passer's pre-snap plan from his own picture. Each pick and its margin, the alert
// (one condition or alternatives, mirrored with the plan), the hot count against his own protection, and two standing
// contracts: the state does not change when the defenders' identities or order are permuted with every position held
// (information honesty), and near a margin a poorer reader's scan error picks the wrong side more often, while the same
// picture always gives the same decision (no flicker).
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import type { QbReadPlan } from '../src/sim/qbv2/plan.js';
import { condHolds, decidePreSnap, lookOf, MARGIN_CUSHION, type PreSnapInputs } from '../src/sim/qbv2/presnap.js';
import type { PicturedMan, RolePicture } from '../src/sim/qbv2/roles.js';

const LOS = 50, BY = 26.65;
let nextId = 1;
/** A man `d` yd past the line, `o` yd from the ball toward the strong side (+) or weak side (-). */
const m = (d: number, o: number, db = true): PicturedMan => ({ id: nextId++, x: LOS + d, y: BY + o, vx: 0, vy: 0, db });
const rec = (o: number): PicturedMan => ({ id: 900 + Math.round(o * 10), x: LOS - 1, y: BY + o, vx: 0, vy: 0 });

/** 2x2 with #1s at 20 yd and #2s at 10; corners over the #1s at the given cushions; a box of `box` men; two safeties. */
function picture(cS: number, cW: number, opts: { box?: number; pressS1?: boolean } = {}): RolePicture {
  const box = opts.box ?? 6, defs: PicturedMan[] = [];
  for (let i = 0; i < box; i++) defs.push(m(i < 4 ? 0.9 : 4.5, -3.5 + (7 * i) / Math.max(1, box - 1), false));
  defs.push(m(opts.pressS1 ? 1.2 : cS, 20.5), m(cW, -20.5), m(12, 9), m(12, -9), m(5, 10.5));
  return { defenders: defs, receivers: { S1: rec(20), S2: rec(10), W1: rec(-20), W2: rec(-10) }, los: LOS, dir: 1, ballY: BY, strong: 1, t: -1 };
}
const plan = (over: Partial<QbReadPlan>): QbReadPlan => ({
  conceptId: 'test', drop: 'quick', readType: 'progression', reads: [{ step: 0, look: { kind: 'receiver', ref: 'S1' }, throws: [{ ref: 'S1', timing: 'onBreak' }] },
    { step: 1, look: { kind: 'receiver', ref: 'S2' }, throws: [{ ref: 'S2', timing: 'onBreak' }] }],
  hot: [], checkdown: null, confirm: 'mofSafety', source: 'test', ...over,
});
const inputs = (p: RolePicture, pl: QbReadPlan, pSingleHigh = 0.5, protectors = { S: 3, W: 3 }): PreSnapInputs =>
  ({ plan: pl, picture: p, belief: { cover3: pSingleHigh, cover4: 1 - pSingleHigh }, pSingleHigh, boxHalfWidth: { S: 6, W: 6 }, protectors });

describe('QB_V2 module B: pre-snap plan', () => {
  it('cushion pick: he flips to the softer corner only past the margin; a near-tie keeps the coach\'s side', () => {
    const hitches = plan({ pick: 'cushion' });
    expect(decidePreSnap(inputs(picture(5, 7), hitches)).flip).toBe(true);
    expect(decidePreSnap(inputs(picture(5, 5 + MARGIN_CUSHION - 0.2), hitches)).flip).toBe(false);
    expect(decidePreSnap(inputs(picture(7, 5), hitches)).flip).toBe(false);
  });

  it('shell pick: the other shell beyond the margin flips; no read inside it keeps the authored side', () => {
    const lion = plan({ pick: 'shell', pickShell: 'open' });
    expect(decidePreSnap(inputs(picture(6, 6), lion, 0.8)).flip).toBe(true);
    expect(decidePreSnap(inputs(picture(6, 6), lion, 0.55)).flip).toBe(false);
    expect(decidePreSnap(inputs(picture(6, 6), lion, 0.2)).flip).toBe(false);
  });

  it('alert: taken when its condition holds in his picture; alternatives; refs mirror with the plan', () => {
    const go = plan({ alert: { read: 1, when: { press: 'S1' } } });
    const on = decidePreSnap(inputs(picture(6, 6, { pressS1: true }), go));
    expect(on.alert).toEqual({ read: 1 });
    expect(on.startRead).toBe(1);
    expect(decidePreSnap(inputs(picture(6, 6), go)).alert).toBeNull();
    // Y-cross's vertical: two-high, or single-high with #1's corner far off.
    const when = [{ shell: 'open' as const }, { shell: 'closed' as const, cushion: { on: 'S1' as const, over: 7 } }];
    expect(condHolds(when, lookOf(picture(5, 5), 0.2, { S: 6, W: 6 }))).toBe(true);
    expect(condHolds(when, lookOf(picture(8, 5), 0.8, { S: 6, W: 6 }))).toBe(true);
    expect(condHolds(when, lookOf(picture(5, 5), 0.8, { S: 6, W: 6 }))).toBe(false);
    // Flipped, 'S1' reads the weak #1.
    const look = lookOf(picture(5, 8), 0.8, { S: 6, W: 6 });
    expect(condHolds({ cushion: { on: 'S1', over: 7 } }, look, false)).toBe(false);
    expect(condHolds({ cushion: { on: 'S1', over: 7 } }, look, true)).toBe(true);
    // Absent: peeked every time (levels' divide).
    expect(decidePreSnap(inputs(picture(6, 6), plan({ alert: { read: 1 } }))).alert).toEqual({ read: 1 });
  });

  it('hot: his box count against his own protection, and the side the surplus is on', () => {
    expect(decidePreSnap(inputs(picture(6, 6, { box: 6 }), plan({}))).hot).toBeNull();
    const seven = decidePreSnap(inputs(picture(6, 6, { box: 7 }), plan({}), 0.5, { S: 3, W: 3 }));
    expect(seven.hot?.over).toBe(1);
    const lean = decidePreSnap(inputs(picture(6, 6, { box: 7 }), plan({}), 0.5, { S: 4, W: 2 }));
    expect(lean.hot).toEqual({ side: 'W', over: 1 });
  });

  it('standing honesty contract: permuting the defenders\' identities and order, every position held, changes nothing', () => {
    const pl = plan({ pick: 'cushion', alert: { read: 1, when: [{ press: 'S1' }, { boxAtLeast: 7 }] } });
    for (const [cS, cW, box] of [[5, 7, 6], [1.2, 6, 7], [6, 6.5, 8]] as const) {
      const base = picture(cS, cW, { box });
      const a = decidePreSnap(inputs(base, pl, 0.62, { S: 3, W: 3 }));
      const rng = new Rng(7);
      for (let k = 0; k < 5; k++) {
        const shuffled = base.defenders.map((d) => ({ ...d, id: 1000 + Math.floor(rng.next() * 1e6) }))
          .map((d) => ({ d, r: rng.next() })).sort((u, v) => u.r - v.r).map(({ d }) => d);
        const b = decidePreSnap(inputs({ ...base, defenders: shuffled }, pl, 0.62, { S: 3, W: 3 }));
        expect({ ...b, look: undefined }).toEqual({ ...a, look: undefined });
      }
    }
  });

  it('near the margin a poorer reader picks the wrong side more often; one picture, one decision', () => {
    // True cushions 5.0 (strong) and 6.4 (weak): the coach's answer is to flip. His scan puts each corner off by his own
    // error (0.3 + 1.0 x (1 - rec) yd deep, QB_SCAN), drawn once per play.
    const hitches = plan({ pick: 'cushion' });
    const rate = (rec: number) => {
      const rng = new Rng(`b-margin-${rec}`), sig = 0.3 + 1.0 * (1 - rec);
      let right = 0;
      for (let i = 0; i < 400; i++) {
        const pic = picture(5 + rng.normal(0, sig), 6.4 + rng.normal(0, sig));
        const d1 = decidePreSnap(inputs(pic, hitches)), d2 = decidePreSnap(inputs(pic, hitches));
        expect(d2.flip).toBe(d1.flip);
        if (d1.flip) right++;
      }
      return right / 400;
    };
    const poor = rate(0.2), sharp = rate(0.9);
    expect(sharp).toBeGreaterThan(poor + 0.1);
    expect(poor).toBeGreaterThan(0.3); // still mostly reads it; he is not scripted to fail
  });
});
