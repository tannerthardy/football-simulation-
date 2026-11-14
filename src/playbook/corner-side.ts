/** CORNER_SIDE (experimental, off): each corner's technique by side (docs/reviews/2026-11-14-corner-sides.md, stage 1).
 *
 * The coordinator calls a corner technique per side (`DefensivePlayCall.cornerTech`) from what he knows when he calls
 * the play: the call's roles, the down, his corner against the receiver he expects on that side and his team's habit.
 * At the line the corner confirms it from the formation as the defense sees it: a called press holds while his side
 * shows no detached #2, and he backs off to read a #2 who appears (motion, a shift). A called `off` is never upgraded.
 *
 * Stage 1 calls only `solo`: a press man corner on #1 where the call installs a solo / MEG man role in a zone call
 * (Cover 3 Mable, Quarters Poach, Stubbie, Book/Read, Cover 6 Book), played by the existing man press technique
 * (ManCoverage press, PRESS_MIRROR, protectDepth). `press_bail` (Cover 3) and a zone `press` (Cover 2 / cloud: jam
 * and sink) wait for Coverage's techniques; the call never selects them until then.
 *
 * Why a corner alone with #1 presses (the design's sources): a zone or match corner aligns off to read #2 ("in cloud
 * or palms the corner needs to clear the out of #2 first; in sky he is basically on #1 man"); with no #2 to his side
 * his rule is #1 alone. NFL, BDB 2025 weeks 1-6, the corner over a wideout with no other receiver to his side presses
 * 43-51% by zone family against 13-36% with two or three (scripts/diag/eyes/corner-sides.py). */
import type { Coverage, DefensivePlayCall } from './types.js';
import type { DefenseAlignment, OffenseAlignment } from './alignment.js';

export const CORNER_SIDE = process.env.CORNER_SIDE === '1';
export type CornerSide = 'S' | 'W';

/** How often a corner alone with #1 is pressed, by the call's family: an NFL frequency installed as the league's
 * coordinator tendency (BDB 2025 weeks 1-6, the corner over a wideout with no other receiver to his side, zone calls:
 * Cover 3 48% of 195, Cover 4 43% of 81, Cover 6 51% of 97; Cover 2 51% from the per-side table). It is flat by down
 * (zone families pooled: 1st 48%, 2nd 48%, 3rd+ 47%, n 122 / 128 / 123), so there is no down term: the per-side press
 * that rises on 3rd down overall comes from what the call and formation are on 3rd down, not from the lone corner. */
const ALONE_PRESS: Record<string, number> = { cover3: 0.48, cover4: 0.43, cover6: 0.51, cover2: 0.51 };

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
 * family (an NFL frequency), times his team's habit (`pressHabit`, a choice), times his corner against the receiver he
 * expects alone there (`edge`: exp of the normed rating difference over 25, the family weights' matchup term, a
 * choice). Multiplying odds, not the probability, keeps the league mean at the tendency: generated teams give a lone
 * corner's press 46-51% at a 48% tendency, the better corner (CB_S) a little more than CB_W. A choice with a reason,
 * and it can be wrong.
 */
export function callCornerTech(cov: Coverage, habit: number, edge: (side: CornerSide) => number,
  draw: (side: CornerSide) => number): DefensivePlayCall['cornerTech'] {
  // He calls it for the family: the solo install (Mable, Poach, Stubbie, Book) is made at the line against the
  // formation (installCoverage), so the call names the technique for each side and the alignment applies it only
  // where the installed role on that side is a solo man corner.
  const base = ALONE_PRESS[cov.family ?? cov.id];
  if (cov.man || base === undefined) return undefined;
  const sides: CornerSide[] = ['S', 'W'];
  const out: NonNullable<DefensivePlayCall['cornerTech']> = {};
  for (const side of sides) {
    const odds = base / (1 - base) * habit * edge(side);
    out[side] = draw(side) < odds / (1 + odds) ? 'solo' : 'off';
  }
  return out;
}

/** A detached #2 enters his side at this lateral distance from the ball and leaves it inside the other: a receiver
 * stemming near the line between does not make the corner hop. Without a previous state, the midpoint. */
const TWO_ENTER = 4.5;
const TWO_EXIT = 3.5;

/**
 * At the line: is the corner on side `sign` alone with his #1? Every other receiver on his side (not his man, not in
 * the backfield, not an attached end) must be inside the #2 line. `wasAlone` is his state at the last look.
 */
export function aloneWithOne(off: OffenseAlignment, sign: number, man: string, wasAlone: boolean | undefined): boolean {
  const line = wasAlone === undefined ? (TWO_ENTER + TWO_EXIT) / 2 : wasAlone ? TWO_ENTER : TWO_EXIT;
  for (const [slot, sp] of Object.entries(off.spots)) {
    if (slot === man || slot === 'QB' || sp.backfield || sp.inline || ['LT', 'LG', 'C', 'RG', 'RT'].includes(slot)) continue;
    const lateral = (sp.pos.y - off.ballY) * sign;
    if (lateral > line) return false;
  }
  return true;
}

/** His side's called technique, if CORNER_SIDE called one. */
export function cornerTechOf(call: DefensivePlayCall, slot: string): 'off' | 'press' | 'press_bail' | 'solo' | undefined {
  if (!CORNER_SIDE || (slot !== 'CB_S' && slot !== 'CB_W')) return undefined;
  return call.cornerTech?.[slot === 'CB_S' ? 'S' : 'W'];
}

/** Whether the corner in `slot` pressed in the previous alignment (the hysteresis's memory). */
export function pressedBefore(prev: DefenseAlignment | undefined, slot: string): boolean | undefined {
  const sp = prev?.spots[slot as keyof DefenseAlignment['spots']];
  return sp ? !!sp.press : undefined;
}
