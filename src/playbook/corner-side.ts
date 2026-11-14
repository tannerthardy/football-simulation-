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

/** NFL press share of a corner alone with #1, by the call's family (per side, weeks 1-6). The centre of the habit. */
const ALONE_PRESS: Record<string, number> = { cover3: 0.48, cover4: 0.43, cover6: 0.5, cover2: 0.51 };
/** The down's weight on it (NFL per-side press by down against all downs: 1st 33%, 2nd 27-37%, 3rd 42-53%, all 38%). */
const DOWN_WEIGHT = (down: number) => (down <= 1 ? 0.87 : down === 2 ? 0.88 : 1.3);

/** The side whose corner has a solo / MEG man role in this zone call (stage 1's only technique), or none. */
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
 * The coordinator's call for each solo side: press him or not. `p` is the team's habit share for the family, moved
 * by his corner against the receiver he expects there (`edge`, the same scale as the family weights' matchup term:
 * exp of the rating difference over 25) and by the down. A choice with a reason, and it can be wrong.
 */
export function callCornerTech(cov: Coverage, down: number, habit: number, edge: (side: CornerSide) => number,
  draw: (side: CornerSide) => number): DefensivePlayCall['cornerTech'] {
  const sides = soloSides(cov);
  if (!sides.length) return undefined;
  const base = ALONE_PRESS[cov.family ?? cov.id] ?? 0.45;
  const out: NonNullable<DefensivePlayCall['cornerTech']> = {};
  for (const side of sides) {
    const p = Math.max(0.03, Math.min(0.9, base * habit * edge(side) * DOWN_WEIGHT(down)));
    out[side] = draw(side) < p ? 'solo' : 'off';
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
