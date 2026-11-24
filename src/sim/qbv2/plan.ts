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

/** What the key defender does, as the passer sees it (from his movement in the passer's picture). */
export type KeyCue = 'sinks' | 'widens' | 'squats' | 'carries' | 'bails' | 'jumps' | 'blitzes';

export interface ThrowOption {
  ref: ReceiverRef;
  timing: ThrowTiming;
}

/** One read: live on its footwork step, with a look target and the throws it can answer with, in taught order. */
export interface PlanRead {
  /** Footwork step it is thrown from: 0 = the plant (the last step of the drop), 1 = the first hitch, 2 = the second. */
  step: number;
  /** Where his eyes go: a receiver, or a key defender by role. */
  /** A key's `side` (PROPOSED, Rules + Coaching, 2026-11-24, pending the QB lane): whose defender, S or W of the plan as
   * authored; absent = S. */
  look: { kind: 'receiver'; ref: ReceiverRef } | { kind: 'key'; role: KeyRole; side?: 'S' | 'W' };
  /** Candidate throws in taught order (for a key read, both routes of the pair). */
  throws: ThrowOption[];
  /** Key reads: what each movement of the key means (the throw it names). A cue not listed answers with `throws`'
   * order. */
  keyRules?: Array<{ cue: KeyCue; throwTo: ReceiverRef }>;
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

/** A concept's read, as taught (module A). One standard version per concept. */
export interface QbReadPlan {
  conceptId: string;
  drop: PassConcept['drop'];
  readType: ReadType;
  /** PROPOSED (Rules + Coaching, 2026-11-24, pending the QB lane): what decides PreSnapState.flip (plans are authored
   * on the strong side): the softer corner (`cushion`), open vs closed middle (`shell`), or where the key defender
   * lines up (`leverage`). Absent: no taught flip; he starts on the strong side. */
  pick?: 'cushion' | 'shell' | 'leverage';
  reads: PlanRead[];
  /** PROPOSED (Rules + Coaching, 2026-11-24, pending the QB lane): one hot answer per side. */
  hot: HotRule[];
  checkdown: CheckdownRule | null;
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
  /** For a structure pick: which side or read he starts on (index into `reads`), and whether the picture says flip. */
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
    look: { kind: 'key', role: 'flat' },
    throws: [{ ref: 'S1', timing: 'onBreak' }, { ref: 'S2', timing: 'seenOpen' }],
    keyRules: [{ cue: 'widens', throwTo: 'S1' }, { cue: 'sinks', throwTo: 'S2' }],
  }, {
    step: 1,
    look: { kind: 'receiver', ref: 'W1' },
    throws: [{ ref: 'W1', timing: 'onBreak' }, { ref: 'W2', timing: 'seenOpen' }],
  }],
  hot: [{ side: 'either', over: 1, answer: { ref: 'S1', timing: 'onBreak' } }],
  checkdown: null,
  confirm: null,
  source: 'QB lane stub for interface work; not authored',
};
