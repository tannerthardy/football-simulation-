/**
 * QB_V2 plan interface (QB lane, 2026-11-24; docs/reviews/2026-11-24-qb-decision-plan.md, module A and B; design note
 * docs/reviews/2026-11-24-qb-v2-design.md). Data only: what a concept tells the passer to read (authored by Rules +
 * Coaching, module A) and what he decides before the snap (Flex, module B). The passer's cycle (module E) consumes a
 * `QbReadPlan` with a `PreSnapState` applied. Nothing here may carry a defender's true assignment, call or rating:
 * defenders are named by the role a coach teaches the passer to find (the flat defender, the curl defender, the
 * middle-of-field safety), which the passer resolves to a man in his own picture after the snap.
 */
import type { PassConcept, ReceiverRef } from '../../playbook/types.js';

/** How the read is taught. */
export type ReadType =
  /** Ordered progression: read 1 on its step, then read 2 on the next, ... */
  | 'progression'
  /** Key-defender (conflict) read: his eyes are on a defender; what that defender does names the throw. */
  | 'key'
  /** Structure pick: the side or route is chosen from the shell before the snap and confirmed on the drop. */
  | 'structure'
  /** An alert (a one-look shot) before the progression, taken only if its condition holds pre-snap. */
  | 'alert';

/** On-break: thrown before or at the break, to where the route will be (anticipation; judged through the receiver's
 * forecast). Seen-open: thrown to the receiver as the passer sees him now (a settle, a void, a back). */
export type ThrowTiming = 'onBreak' | 'seenOpen';

/** A defender role as coached to the passer, resolved in his picture after the snap (never a slot label or an
 * assignment). The vocabulary is Rules + Coaching's; these are the ones Phase 1 needs. */
export type KeyRole = 'flat' | 'curl' | 'hook' | 'apex' | 'corner' | 'mofSafety' | 'overhang' | (string & {});

/** What the key defender does, as the passer sees it (from his movement in the passer's picture).
 * `jumps`: drives on a route (pass side); `fills`: steps downhill into his run fit (an RPO's conflict defender; told
 * apart by direction in his picture, toward the line and the mesh against toward a receiver).
 * `none`: he has looked at the key's area and no defender fills the role there (for the flat defender: nobody
 * underneath, not bailing and inside about 7 yd, over or outside #2 between the box and the sideline). It is something
 * he sees, not a role that failed to resolve: a side he has not looked at yet is not read, and `none` does not fire. */
export type KeyCue = 'sinks' | 'widens' | 'squats' | 'carries' | 'bails' | 'jumps' | 'blitzes' | 'fills' | 'none';

export interface ThrowOption {
  ref: ReceiverRef;
  timing: ThrowTiming;
}

/** One read: live on its footwork step, with a look target and the throws it can answer with, in taught order. */
export interface PlanRead {
  /** Footwork step it is thrown from: 0 = the plant (the last step of the drop), 1 = the first hitch, 2 = the second. */
  step: number;
  /** Where his eyes go: a receiver, or a key defender by role on a side (S: the read's own side, the default; W the
   * other), e.g. the backside flat defender on slant-flat's reset (Rules + Coaching, 2026-11-24). */
  look: { kind: 'receiver'; ref: ReceiverRef } | { kind: 'key'; role: KeyRole; side?: 'S' | 'W' };
  /** Candidate throws in taught order (for a key read, both routes of the pair). */
  throws: ThrowOption[];
  /** Key reads: what each movement of the key means (the throw it names). A cue not listed answers with `throws`'
   * order. */
  keyRules?: Array<{ cue: KeyCue; throwTo: ReceiverRef }>;
  /** Key reads: cues whose taught answer is "nothing here: the next read" (Rules + Coaching, 2026-11-25), so that every
   * cue the passer can produce is answered in the plan, by a rule or here, never by omission. Data: an unlisted cue already
   * moves his eyes on. */
  moveOn?: KeyCue[];
  /** When this read is answered no (resolved, nothing clears his bar): 'kill' throws the ball at the read's first
   * receiver's feet to end the play without a turnover (a covered screen; "throw the ball at the TE's feet", Gridiron
   * Strategies). Default: his eyes move on. (Rules + Coaching, 2026-11-24) */
  onCovered?: 'kill';
}

/** The hot answer and its trigger, as a contract with the protection (Phase 3 owns the protection side). */
export interface HotRule {
  /** The side the unblocked rusher comes from, as the protection leaves it ('either' when the slide decides). */
  side: 'S' | 'W' | 'either';
  /** How many rushers beyond the protection's count trigger it. */
  over: number;
  answer: ThrowOption;
}

export interface CheckdownRule {
  ref: ReceiverRef;
  /** The step from which the checkdown is a read (he may go to it from this step on). */
  fromStep: number;
  timing: ThrowTiming;
}

/** One pre-snap condition for an alert; every clause present must hold. */
export interface AlertCond {
  shell?: 'open' | 'closed';
  press?: ReceiverRef;
  /** The cushion over this receiver, under and/or over these yards. */
  cushion?: { on: ReceiverRef; under?: number; over?: number };
  leverage?: { on: ReceiverRef; is: 'inside' | 'head' | 'outside' };
  boxAtLeast?: number;
}

/** A concept's read, as taught (module A). One standard version per concept. */
export interface QbReadPlan {
  conceptId: string;
  drop: PassConcept['drop'];
  readType: ReadType;
  reads: PlanRead[];
  /** A hot per side: the route that replaces the area the blitz comes from (USA Football, Hewitt). */
  hot: HotRule[];
  checkdown: CheckdownRule | null;
  /** A structure pick: the plan is authored on the strong side, and what decides whether he flips it (mirrors S and W)
   * before the snap, from his own picture (Flex's module B sets PreSnapState.flip): cushion = the softer corner
   * (hitches, quick outs), shell = open or closed middle (dragon against lion), leverage = where the key defender lines
   * up (Rules + Coaching, 2026-11-24). */
  pick?: 'cushion' | 'shell' | 'leverage';
  /** For `pick: 'shell'`: the shell the authored (strong) side is for; the other shell flips it (Flex, 2026-11-24: when
   * his belief reads the other shell by more than 0.1 around P(single-high) 0.5). */
  pickShell?: 'open' | 'closed';
  /** An alert and its pre-snap condition, as taught ("alert the go against single-high press"): the read he takes first
   * when the condition holds in his own pre-snap picture (Flex's module B decides it; Rules authors it). */
  alert?: {
    read: number;
    /** When the alert is taken, in scan-visible terms only (Flex, 2026-11-24): one condition (every clause it holds must
     * hold) or a list of alternatives (any one holds; Y-cross's vertical: two-high, or single-high with the corner far
     * off). Absent: peeked every time (levels' divide, Brown). */
    when?: AlertCond | AlertCond[];
  };
  /** The defender he confirms on the drop (structure picks and most progressions: the middle-of-field safety). */
  confirm: KeyRole | null;
  /** Per coverage family (QBMind's families: cover0, cover1, cover2, tampa2, cover2man, cover3, cover4, cover6), the
   * read expected to come open (index into `reads`): what his coverage belief is for. */
  expected?: Partial<Record<string, number>>;
  /** Sources, paraphrased (Rules + Coaching). */
  source: string;
}

/** What he decides before the snap (module B), from his own pre-snap read only. */
export interface PreSnapState {
  /** Which read he starts on (index into `reads`), and whether he mirrors the plan (S and W swapped) by its `pick`. */
  startRead: number;
  flip: boolean;
  /** The alert, if its condition held in his pre-snap read. */
  alert: { read: number } | null;
  /** His hot belief: the side he expects an unblocked rusher from and by how many he thinks the box outnumbers the
   * protection (his count of the box from his picture, not the call). */
  hot: { side: 'S' | 'W' | 'either'; over: number } | null;
  /** The defender he will confirm on the drop. */
  confirm: KeyRole | null;
  /** His coverage belief at the snap (QBMind's), carried for the look's disagreement term (resolution slows when what
   * he sees disagrees with it). */
  belief: Record<string, number>;
}

/** Phase 1 stub (QB lane, for interface work only, not Rules' authored plan): slant-flat as a key read on the flat
 * defender. If the flat defender widens with the flat, the slant; if he sinks under the slant, the flat. Replaced by
 * Rules + Coaching's authored plan. */
export const STUB_SLANT_FLAT: QbReadPlan = {
  conceptId: 'slant_flat',
  drop: 'quick',
  readType: 'key',
  reads: [{
    step: 0,
    look: { kind: 'key', role: 'flat', side: 'S' },
    throws: [{ ref: 'S1', timing: 'onBreak' }, { ref: 'S2', timing: 'seenOpen' }],
    keyRules: [{ cue: 'widens', throwTo: 'S1' }, { cue: 'sinks', throwTo: 'S2' }],
  }, {
    step: 1,
    look: { kind: 'receiver', ref: 'W1' },
    throws: [{ ref: 'W1', timing: 'onBreak' }, { ref: 'W2', timing: 'seenOpen' }],
  }],
  hot: [{ side: 'S', over: 1, answer: { ref: 'S1', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W1', timing: 'onBreak' } }],
  checkdown: null,
  confirm: null,
  source: 'QB lane stub for interface work; not authored',
};
