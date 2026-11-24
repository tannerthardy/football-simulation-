/**
 * Read plans, as taught (module A of the QB rebuild; docs/reviews/2026-11-24-read-plans.md holds each plan's sources,
 * quoted, and its gaps). Data only: QB_V2 runs these (src/sim/qbv2/plan.ts). Authored on the strong side; the passer's
 * pre-snap state flips them, by `pick`. Steps: 0 = the plant (the third step under center, one from the gun), 1 = the
 * first hitch. Defenders by the role a coach teaches the passer to find, never a slot or an assignment.
 */
import type { QbReadPlan } from '../sim/qbv2/plan.js';

/** Slant-flat: key the flat defender on the plant, the flat then the slant; widens: the slant behind him; sinks under
 * the slant: the flat. Reset to the backside's slant-flat on the first hitch. (Klatt; Football Playbook Designer;
 * Bowen, NFP; Hewitt.) */
export const SLANT_FLAT: QbReadPlan = {
  conceptId: 'slant_flat', drop: 'quick', readType: 'key',
  reads: [
    { step: 0, look: { kind: 'key', role: 'flat' },
      throws: [{ ref: 'S2', timing: 'onBreak' }, { ref: 'S1', timing: 'onBreak' }],
      keyRules: [{ cue: 'widens', throwTo: 'S1' }, { cue: 'jumps', throwTo: 'S1' }, { cue: 'sinks', throwTo: 'S2' }] },
    { step: 1, look: { kind: 'key', role: 'flat', side: 'W' },
      throws: [{ ref: 'W2', timing: 'onBreak' }, { ref: 'W1', timing: 'onBreak' }],
      keyRules: [{ cue: 'widens', throwTo: 'W1' }, { cue: 'jumps', throwTo: 'W1' }, { cue: 'sinks', throwTo: 'W2' }] },
  ],
  hot: [{ side: 'S', over: 1, answer: { ref: 'S1', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W1', timing: 'onBreak' } }],
  // ANALOGUE (concept gap, CONCEPT_GAPS): taught, the back is the checkdown; ours blocks, so #3's hook stands in.
  checkdown: { ref: 'S3', fromStep: 1, timing: 'seenOpen' },
  confirm: null,
  expected: { cover0: 0, cover1: 0, cover2: 0, tampa2: 0, cover2man: 0, cover3: 0, cover4: 0, cover6: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#slant-flat-slant_flat (Klatt; Football Playbook Designer; Bowen, NFP; Bleacher Report slant; Hewitt; Browns cut-up). ANALOGUE: the checkdown (#3 hook for the back).',
};

/** Stick: key the flat defender outside-in on the plant: he fails to widen: the flat; widens: the stick. First hitch: the
 * backside slant, then its stick. The back from the first hitch. (Throw Deep; Ross on Walsh, Mumme, Leach; Wilhite.) */
export const STICK: QbReadPlan = {
  conceptId: 'stick', drop: 'gun3', readType: 'key', pick: 'leverage',
  reads: [
    { step: 0, look: { kind: 'key', role: 'flat' },
      throws: [{ ref: 'S3', timing: 'onBreak' }, { ref: 'S2', timing: 'onBreak' }],
      keyRules: [{ cue: 'widens', throwTo: 'S2' }, { cue: 'jumps', throwTo: 'S2' }, { cue: 'sinks', throwTo: 'S3' }, { cue: 'squats', throwTo: 'S3' }] },
    { step: 1, look: { kind: 'receiver', ref: 'W1' },
      throws: [{ ref: 'W1', timing: 'onBreak' }, { ref: 'W2', timing: 'seenOpen' }] },
  ],
  hot: [{ side: 'S', over: 1, answer: { ref: 'S3', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W1', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: null,
  expected: { cover1: 0, cover2: 0, tampa2: 0, cover2man: 0, cover3: 0, cover4: 0, cover6: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#stick-stick (Throw Deep; Ross; Wilhite; Klatt; Shaw; Stanford Daily; Coaching Football Insights). Variants: stick-first; corner key; Cover 2 hole shot.',
};

/** All hitches: pick the side with the softer corner; #1's hitch on the plant, #2's on the first hitch; the back from the
 * first hitch. (Win With The Pass; Goff; Kratzer.) */
export const HITCHES: QbReadPlan = {
  conceptId: 'hitches', drop: 'gun3', readType: 'structure', pick: 'cushion',
  reads: [
    { step: 0, look: { kind: 'receiver', ref: 'S1' }, throws: [{ ref: 'S1', timing: 'onBreak' }] },
    { step: 1, look: { kind: 'receiver', ref: 'S2' }, throws: [{ ref: 'S2', timing: 'onBreak' }] },
  ],
  hot: [{ side: 'S', over: 1, answer: { ref: 'S2', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W2', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: null,
  expected: { cover1: 0, cover2: 1, tampa2: 1, cover3: 0, cover4: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#all-hitches-hitches (Win With The Pass all hitch, hitch-seam, Cover 2 and 4 beaters; Goff, Glazier; Kratzer).',
};

/** Quick outs: pick the side with the softer corner; #1's quick out on the plant, thrown before the break; #2's hitch on
 * the first hitch. No checkdown: the back blocks. (Kratzer; Shaw; The QB Stable.) */
export const QUICK_OUTS: QbReadPlan = {
  conceptId: 'quick_outs', drop: 'quick', readType: 'structure', pick: 'cushion',
  reads: [
    { step: 0, look: { kind: 'receiver', ref: 'S1' }, throws: [{ ref: 'S1', timing: 'onBreak' }] },
    { step: 1, look: { kind: 'receiver', ref: 'S2' }, throws: [{ ref: 'S2', timing: 'onBreak' }] },
  ],
  hot: [{ side: 'S', over: 1, answer: { ref: 'S2', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W2', timing: 'onBreak' } }],
  // Concept gap (CONCEPT_GAPS): taught, the back's shoot route is the outlet; ours blocks, so there is none.
  checkdown: null,
  confirm: null,
  expected: { cover2: 1, tampa2: 1, cover3: 0, cover4: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#quick-outs-quick_outs (Kratzer; Shaw; The QB Stable; Win With The Pass Cover 2 beaters; Brown, Grantland). Gap: no outlet (the back blocks).',
};

/** Where an installed concept differs from the taught version the plan follows, so the plan carries an analogue or a
 * missing piece. These are concept-data questions (concepts.ts), listed for a decision to correct the concept, not to
 * bend the plan around it. Each also appears in docs/reviews/2026-11-24-read-plans.md, "Concept gaps". */
export const CONCEPT_GAPS: ReadonlyArray<{ concept: string; taught: string; ours: string; plan: string }> = [
  { concept: 'slant_flat', taught: 'the back releases as the checkdown ("throw the ball to the tailback", Klatt; the back in the flat in Dunn\'s install)',
    ours: "back: 'block'", plan: 'ANALOGUE: #3 (S3) hook as the checkdown from the first hitch' },
  { concept: 'quick_outs', taught: 'the back\'s shoot route is the outlet ("Back - Shoot route ... will always be an outlet", Kratzer)',
    ours: "back: 'block'", plan: 'no checkdown (null)' },
];

/** The authored plans by concept id. */
export const READ_PLANS: Readonly<Record<string, QbReadPlan>> = Object.fromEntries(
  [SLANT_FLAT, STICK, HITCHES, QUICK_OUTS].map((p) => [p.conceptId, p]));
