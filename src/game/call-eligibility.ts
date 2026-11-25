/**
 * Who may be handed a route on a composed call (CALL_COMPOSE step 2; Flex, 2026-11-24, for Rules' call checks). The
 * offense as it stands at the snap, after the called motion (`fieldAlignment`, the numbering the play runs on), is put
 * through the scrimmage snap law that already rules a play (`eligibilityAtSnap`, Rules 5-1-2 and 8-1-5): the ends of the
 * line and every back are eligible, a covered man on the line is not, and the five linemen wear ineligible numbers.
 *
 * Inputs are only the offense's own call: the formation's legal positions (`OffSpot.onLine`) and the motion. No player's
 * number is known when a call is composed, so each spot reports the number its position wears (a lineman 50-79, anyone
 * else an eligible number); a play with real numbers and reports goes through `eligibilityAtSnap` itself.
 */
import type { OffenseAlignment, OffSpot } from '../playbook/alignment.js';
import type { Formation, MotionCall, ReceiverRef } from '../playbook/types.js';
import { fieldAlignment, type FieldContext } from './concept-fit.js';
import { eligibilityAtSnap, type SnapEligibility, type SnapPlayerFacts } from './presnap-rules.js';

const LINEMEN = new Set(['LT', 'LG', 'C', 'RG', 'RT']);

/** A spot's legal position. Spots from `alignOffense` carry it; for one built elsewhere, a lineman or an attached end is on
 * the line and everyone else is a back. */
const onLineOf = (sp: OffSpot): boolean => sp.onLine ?? (LINEMEN.has(sp.slot) || sp.inline);

/** The snap facts of an aligned offense: each spot's legal position, its lateral place and the number its position wears. */
export function snapFactsOf(off: OffenseAlignment): SnapPlayerFacts[] {
  return Object.values(off.spots).map((sp) => ({
    playerId: sp.slot,
    team: 'O' as const,
    number: LINEMEN.has(sp.slot) ? 70 : sp.slot === 'QB' ? 12 : 20,
    y: sp.pos.y,
    line: onLineOf(sp) ? 'line' as const : 'backfield' as const,
    inBounds: true,
  }));
}

export interface CallEligibility {
  /** The offense at the snap the check was made on. */
  off: OffenseAlignment;
  /** Receiver refs (S1..S4, W1..W4, B, B2) whose player is eligible at the snap. */
  eligible: Set<ReceiverRef>;
  /** Every ref on the field, eligible or not. */
  refs: Set<ReceiverRef>;
  /** The snap law's ruling per slot. */
  bySlot: Record<string, SnapEligibility>;
  /** Players on the line at the snap (the rule needs at least seven). */
  onLine: number;
  /** Why the formation itself is not legal, if it is not: fewer than seven on the line, or a ruling left unresolved. */
  problems: string[];
}

/** The eligibility of an aligned offense (after any motion). */
export function eligibilityOf(off: OffenseAlignment): CallEligibility {
  const facts = snapFactsOf(off);
  const ruling = eligibilityAtSnap(facts);
  const bySlot: Record<string, SnapEligibility> = {};
  for (const r of ruling) bySlot[r.playerId] = r;
  const refs = new Set<ReceiverRef>(), eligible = new Set<ReceiverRef>();
  for (const [ref, slot] of Object.entries(off.numbering) as Array<[ReceiverRef, string | undefined]>) {
    if (!slot) continue;
    refs.add(ref);
    if (bySlot[slot]?.eligible === true) eligible.add(ref);
  }
  const onLine = facts.filter((f) => f.line === 'line').length;
  const problems: string[] = [];
  if (onLine < 7) problems.push(`${onLine} on the line (at least seven)`);
  for (const r of ruling) if (r.eligible === null) problems.push(`${r.playerId}: ${r.reason}`);
  return { off, eligible, refs, bySlot, onLine, problems };
}

/** Who may be handed a route on this call: the formation (flipped as called) after the called motion. */
export function callEligibility(f: Formation, flip: boolean, ballY: number, motion: MotionCall | undefined, at: FieldContext): CallEligibility {
  return eligibilityOf(fieldAlignment(f, flip, ballY, motion, at));
}
