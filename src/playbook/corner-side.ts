/** CORNER_SIDE (experimental, off): each corner's technique by side (docs/reviews/2026-11-14-corner-sides.md, stage 1).
 *
 * The coordinator calls a corner technique per side (`DefensivePlayCall.cornerTech`) from what he knows when he calls
 * the play: the receivers he expects to each side (the seen formation), his corner against the receiver there and his
 * team's habit. The called press holds at the line: NFL corners press with a #2 present about 25% of the time at every
 * #1-#2 spacing (labelled CBs over a wideout, BDB 2025 weeks 1-6), so the receiver count acts only through how often
 * he calls it. No stack / bunch or reduced-split check is added (5-7 points in the NFL); TIGHT_OFF's existing rule over
 * a tight #2 stays. A called `off` is never upgraded.
 *
 * Stage 1 calls only `solo`: a press man corner on #1 where the call installs a solo / MEG man role in a zone call
 * (Cover 3 Mable, Quarters Poach, Stubbie, Book/Read, Cover 6 Book), played by the existing man press technique
 * (ManCoverage press, PRESS_MIRROR, protectDepth). `press_bail` (Cover 3) and a zone `press` (Cover 2 / cloud: jam
 * and sink) wait for Coverage's techniques; the call never selects them until then.
 *
 * Why the count moves it (the design's sources): a zone or match corner aligns off to read #2 ("in cloud or palms the
 * corner needs to clear the out of #2 first; in sky he is basically on #1 man"); alone with #1 he presses more often.
 * NFL, the corner over a wideout presses 43-51% by zone family with no other receiver to his side against 13-36% with
 * two or three (scripts/diag/eyes/corner-sides.py). */
import type { Coverage, DefensivePlayCall } from './types.js';

export const CORNER_SIDE = process.env.CORNER_SIDE === '1';
export type CornerSide = 'S' | 'W';

/** How often the corner over #1 is pressed, by the call's family and the receivers to his side (1 / 2 / 3+): NFL
 * frequencies installed as the league's coordinator tendency (BDB 2025 weeks 1-6, zone calls, per side; corner-sides.py).
 * Flat by down for a lone corner (zone families pooled: 48 / 48 / 47% on 1st / 2nd / 3rd+), so there is no down term:
 * the per-side press that rises on 3rd down comes from what the call and formation are then. */
const PRESS_BY_COUNT: Record<string, [number, number, number]> = {
  cover3: [0.48, 0.27, 0.19], cover4: [0.43, 0.17, 0.13], cover6: [0.51, 0.36, 0.14], cover2: [0.51, 0.35, 0.30],
};

/** A team's press habit, the odds multiplier its coordinator brings to the league tendency: his man rate over the
 * league's 0.4, the same scaling the call's family weights give man coverage (`manScale`). A choice, stated: a coach
 * who calls more man presses his lone corner more. Generated coaches' man rate p10 0.30, p90 0.53, so two teams
 * differ (the press of a lone corner from about 30% to 67% between them, with the matchup). */
export function pressHabit(manRate: number): number {
  return manRate / 0.4;
}

/** The sides whose corner has a solo / MEG man role in this installed zone call (stage 1's only technique). */
export function soloSides(cov: Coverage): CornerSide[] {
  if (cov.man) return [];
  const out: CornerSide[] = [];
  for (const [slot, side] of [['CB_S', 'S'], ['CB_W', 'W']] as const) {
    const r = cov.roles[slot];
    if (r?.kind === 'man' && r.protectDepth && !r.overTop) out.push(side);
  }
  return out;
}

/**
 * The coordinator's call for each solo side: press him or not. The odds of a press are the league tendency's for the
 * family and the receiver count (an NFL frequency), times his team's habit (`pressHabit`, a choice), times his corner against the receiver he
 * expects alone there (`edge`: exp of the normed rating difference over 25, the family weights' matchup term, a
 * choice). Multiplying odds, not the probability, keeps the league mean at the tendency: generated teams give a lone
 * corner's press 46-51% at a 48% tendency, the better corner (CB_S) a little more than CB_W. A choice with a reason,
 * and it can be wrong. `count` is the receivers he expects to each side.
 */
export function callCornerTech(cov: Coverage, habit: number, edge: (side: CornerSide) => number,
  draw: (side: CornerSide) => number, count: (side: CornerSide) => number | undefined = () => undefined): DefensivePlayCall['cornerTech'] {
  // He calls it for the family: the solo install (Mable, Poach, Stubbie, Book) is made at the line against the
  // formation (installCoverage), so the call names the technique for each side and the alignment applies it only
  // where the installed role on that side is a solo man corner.
  const rates = PRESS_BY_COUNT[cov.family ?? cov.id];
  if (cov.man || rates === undefined) return undefined;
  const out: NonNullable<DefensivePlayCall['cornerTech']> = {};
  for (const side of ['S', 'W'] as CornerSide[]) {
    // The receivers he expects to that side (the seen formation); not seen, the lone corner's rate.
    const n = count(side), base = rates[Math.min(3, Math.max(1, n ?? 1)) - 1];
    const odds = base / (1 - base) * habit * edge(side);
    out[side] = draw(side) < odds / (1 + odds) ? 'solo' : 'off';
  }
  return out;
}

/** His side's called technique, if CORNER_SIDE called one. */
export function cornerTechOf(call: DefensivePlayCall, slot: string): 'off' | 'press' | 'press_bail' | 'solo' | undefined {
  if (!CORNER_SIDE || (slot !== 'CB_S' && slot !== 'CB_W')) return undefined;
  return call.cornerTech?.[slot === 'CB_S' ? 'S' : 'W'];
}
