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

// ------------------------------------------------------------------ dropback (docs/reviews/2026-11-24-read-plans.md)
// The hot answers marked GENERIC follow the replacement rule (the route on the blitz side; Hewitt): no source names one.

/** Curl-flat: key the flat defender on the plant; flat, then curl ("If the SS or Will hang on the curl, throw the flat.
 * If they are quick to jump on the flat route, then target the curl", Bowen); the curl waits for him to widen (seen
 * open); the back last. (Bowen, NFP; Heck, Gridiron Strategies; Hewitt; FirstDown.) */
export const CURL_FLAT: QbReadPlan = {
  conceptId: 'curl_flat', drop: 'gun5', readType: 'key',
  reads: [
    { step: 0, look: { kind: 'key', role: 'flat' },
      throws: [{ ref: 'S2', timing: 'onBreak' }, { ref: 'S1', timing: 'seenOpen' }],
      keyRules: [{ cue: 'widens', throwTo: 'S1' }, { cue: 'jumps', throwTo: 'S1' }, { cue: 'sinks', throwTo: 'S2' }] },
  ],
  // GENERIC hot.
  hot: [{ side: 'S', over: 1, answer: { ref: 'S2', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W2', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: null,
  expected: { cover3: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#curl-flat-curl_flat (Bowen NFP; Heck GS; Hewitt USAF; FirstDown; YFO). GENERIC hot.',
};

/** Smash: high-low the corner on the first hitch (a five-step class drop and a hitch): he sinks, the hitch on time; he
 * sits short, the corner; in between, the hitch. The back if unclear. (Fisher, AFM; Throw Deep; Troxler, Glazier.) */
export const SMASH: QbReadPlan = {
  conceptId: 'smash', drop: 'five', readType: 'key',
  reads: [
    { step: 1, look: { kind: 'key', role: 'corner' },
      throws: [{ ref: 'S1', timing: 'onBreak' }, { ref: 'S2', timing: 'onBreak' }],
      keyRules: [{ cue: 'sinks', throwTo: 'S1' }, { cue: 'bails', throwTo: 'S1' }, { cue: 'squats', throwTo: 'S2' }, { cue: 'jumps', throwTo: 'S2' }] },
  ],
  // GENERIC hot.
  hot: [{ side: 'S', over: 1, answer: { ref: 'S1', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W1', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 2, timing: 'seenOpen' },
  confirm: null,
  expected: { cover2: 0, cover4: 0, cover3: 0, cover1: 0, cover2man: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#smash-smash (Fisher AFM; Throw Deep; Troxler Glazier; Win With The Pass; Ross). GENERIC hot. Variant: three-step, the corner first on the third step (WWTP).',
};

/** Dagger: the seam clears; the dig is primary, high-low with the shallow on the alley (curl) defender: he drops deep
 * and inside, the shallow; otherwise the dig, thrown before it reaches the hash. (Bowen NFP; Kou; Longo via Ross;
 * Bullock; Inside The Pylon.) */
export const DAGGER: QbReadPlan = {
  conceptId: 'dagger', drop: 'five', readType: 'key',
  reads: [
    { step: 0, look: { kind: 'key', role: 'curl' },
      throws: [{ ref: 'S1', timing: 'onBreak' }, { ref: 'S3', timing: 'seenOpen' }],
      keyRules: [{ cue: 'sinks', throwTo: 'S3' }, { cue: 'jumps', throwTo: 'S1' }, { cue: 'widens', throwTo: 'S1' }] },
  ],
  // GENERIC hot.
  hot: [{ side: 'S', over: 1, answer: { ref: 'S3', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W2', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: null,
  expected: { cover2: 0, cover1: 0, cover3: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#dagger-dagger (Bowen NFP and BR; Kou; Longo via Ross; Bullock; ITP). GENERIC hot. Variant: seam first (Longo; FirstDown).',
};

/** Mesh: the corner on the fifth step (to grass), then the mesh point (whichever crosser breaks open; the sit against
 * zone), then the back. (Win With The Pass; Black41 on Mumme / Leach; Throw Deep.) */
export const MESH: QbReadPlan = {
  conceptId: 'mesh', drop: 'gun5', readType: 'progression',
  reads: [
    { step: 0, look: { kind: 'receiver', ref: 'S1' }, throws: [{ ref: 'S1', timing: 'onBreak' }] },
    { step: 1, look: { kind: 'receiver', ref: 'S2' },
      throws: [{ ref: 'S2', timing: 'seenOpen' }, { ref: 'W2', timing: 'seenOpen' }, { ref: 'S3', timing: 'seenOpen' }] },
  ],
  // The vertical as the hot against a big blitz with no safety deep (Black41, Holgorsen's mesh).
  hot: [{ side: 'either', over: 1, answer: { ref: 'W1', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 2, timing: 'seenOpen' },
  confirm: null,
  expected: {},
  source: 'docs/reviews/2026-11-24-read-plans.md#mesh-mesh (Win With The Pass; Black41; Throw Deep; Ross). Variants: wheel or rail first (Holgorsen); flare first (TDP base).',
};

/** Y-cross: deep to short. The post on the plant (the free safety freezes or comes down: the shot), then high-low the
 * hook (Will) on the first hitch: he fails to gain depth, the crosser; he sinks, the flat; the back. (Throw Deep;
 * Black41 and Ross on Leach / Mumme; Kolste.) */
export const Y_CROSS: QbReadPlan = {
  conceptId: 'y_cross', drop: 'five', readType: 'progression',
  reads: [
    { step: 0, look: { kind: 'receiver', ref: 'W1' }, throws: [{ ref: 'W1', timing: 'onBreak' }] },
    { step: 1, look: { kind: 'key', role: 'hook' },
      throws: [{ ref: 'S2', timing: 'seenOpen' }, { ref: 'S3', timing: 'seenOpen' }],
      keyRules: [{ cue: 'sinks', throwTo: 'S3' }, { cue: 'jumps', throwTo: 'S2' }, { cue: 'squats', throwTo: 'S2' }] },
  ],
  // Front-side pressure: the flat (Kolste). The backside has none (the back stays in).
  hot: [{ side: 'S', over: 1, answer: { ref: 'S3', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 2, timing: 'seenOpen' },
  confirm: 'mofSafety',
  expected: { cover4: 0, cover1: 0, cover3: 1, cover2: 1 },
  source: 'docs/reviews/2026-11-24-read-plans.md#y-cross-y_cross (Throw Deep; Black41; Ross; Kolste; Stanford Daily).',
};

/** Flood: key the curl-flat defender on the plant between the out and the flat: the flat if he does not take it; he
 * jumps the flat or shortens, the out. First hitch: the backside. (Miller, Gridiron Strategies; Bowen NFP; YFO.) */
export const FLOOD: QbReadPlan = {
  conceptId: 'flood', drop: 'gun5', readType: 'key',
  reads: [
    { step: 0, look: { kind: 'key', role: 'curl' },
      throws: [{ ref: 'S3', timing: 'onBreak' }, { ref: 'S2', timing: 'onBreak' }],
      keyRules: [{ cue: 'jumps', throwTo: 'S2' }, { cue: 'widens', throwTo: 'S2' }, { cue: 'sinks', throwTo: 'S3' }] },
    { step: 1, look: { kind: 'receiver', ref: 'W1' }, throws: [{ ref: 'W1', timing: 'onBreak' }, { ref: 'W2', timing: 'seenOpen' }] },
  ],
  // The flat is hot (Miller). ANALOGUE (CONCEPT_GAPS): the taught backside hot is a slant; ours runs a dig and a
  // shallow, and the shallow stands in.
  hot: [{ side: 'S', over: 1, answer: { ref: 'S3', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W2', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 2, timing: 'seenOpen' },
  confirm: null,
  expected: { cover3: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#flood-flood (Miller GS; Bowen NFP and BR; YFO; Kou; Wide Zone Warriors). ANALOGUE: the backside hot. Variants: sail first (YFO); peek the vertical (Kou).',
};

/** Levels: an alert on the divide (seam) at the end of the drop, then short to deep on the defender between the
 * levels: he stays home on the short in, the dig behind him; he drops with the deeper route, the short in. The back when
 * the middle backer takes both. (Chris Brown, Smart Football; Wilhite; Bowen NFP.) */
export const LEVELS: QbReadPlan = {
  conceptId: 'levels', drop: 'five', readType: 'alert',
  reads: [
    { step: 0, look: { kind: 'receiver', ref: 'S3' }, throws: [{ ref: 'S3', timing: 'onBreak' }] },
    { step: 1, look: { kind: 'key', role: 'hook' },
      throws: [{ ref: 'S2', timing: 'onBreak' }, { ref: 'S1', timing: 'onBreak' }],
      keyRules: [{ cue: 'sinks', throwTo: 'S2' }, { cue: 'carries', throwTo: 'S2' }, { cue: 'jumps', throwTo: 'S1' }, { cue: 'squats', throwTo: 'S1' }] },
  ],
  // GENERIC hot.
  hot: [{ side: 'S', over: 1, answer: { ref: 'S2', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W2', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: 'mofSafety',
  expected: { cover2: 1 },
  source: 'docs/reviews/2026-11-24-read-plans.md#levels-levels (Brown, smartfootball blogspot; Wilhite; Bowen NFP; Alert The Post). GENERIC hot. Concept gap: the routes are swapped (CONCEPT_GAPS).',
};

/** Four verticals: the locked seam on the plant (a rhythm throw), the seam reader off the free safety on the first
 * hitch with the backside streak, the back on the second hitch. (Dan Gonzalez via Chris Brown; A.J. Smith on Mumme.) */
export const FOUR_VERTS: QbReadPlan = {
  conceptId: 'four_verts', drop: 'gun3', readType: 'progression',
  reads: [
    { step: 0, look: { kind: 'receiver', ref: 'S2' }, throws: [{ ref: 'S2', timing: 'onBreak' }] },
    { step: 1, look: { kind: 'receiver', ref: 'W2' }, throws: [{ ref: 'W2', timing: 'onBreak' }, { ref: 'W1', timing: 'onBreak' }] },
  ],
  // GENERIC hot (the seam reader looks at once against a blitz, Gonzalez).
  hot: [{ side: 'S', over: 1, answer: { ref: 'S2', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W2', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 2, timing: 'seenOpen' },
  confirm: 'mofSafety',
  expected: { cover3: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#four-verticals-four_verts (Gonzalez via smartfootball blogspot; A.J. Smith, USAF; BR; Alert The Post). GENERIC hot. Variants: shell read (Bullock); by handedness (Mumme).',
};

/** Verticals-hitch: key the middle-of-field safety on the plant: he stays middle, the #2 seam; he shades to #2, the #3
 * hitch under it. The backside hitch on the first hitch, the back on the second. (The concept's own read line;
 * Gonzalez.) */
export const VERTS_HITCH: QbReadPlan = {
  conceptId: 'verts_hitch', drop: 'gun3', readType: 'key',
  reads: [
    { step: 0, look: { kind: 'key', role: 'mofSafety' },
      throws: [{ ref: 'S2', timing: 'onBreak' }, { ref: 'S3', timing: 'onBreak' }],
      keyRules: [{ cue: 'widens', throwTo: 'S3' }, { cue: 'carries', throwTo: 'S3' }] },
    { step: 1, look: { kind: 'receiver', ref: 'W2' }, throws: [{ ref: 'W2', timing: 'onBreak' }] },
  ],
  // GENERIC hot.
  hot: [{ side: 'S', over: 1, answer: { ref: 'S3', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W2', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 2, timing: 'seenOpen' },
  confirm: 'mofSafety',
  expected: { cover3: 0, cover1: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#verticals-hitch-verts_hitch (concepts.ts read line; Gonzalez). GENERIC hot. Variant: hitch, seam, check down from a 0-step drop (WWTP BLUE).',
};

/** Where an installed concept differs from the taught version the plan follows, so the plan carries an analogue or a
 * missing piece. These are concept-data questions (concepts.ts), listed for a decision to correct the concept, not to
 * bend the plan around it. Each also appears in docs/reviews/2026-11-24-read-plans.md, "Concept gaps". */
export const CONCEPT_GAPS: ReadonlyArray<{ concept: string; taught: string; ours: string; plan: string }> = [
  { concept: 'slant_flat', taught: 'the back releases as the checkdown ("throw the ball to the tailback", Klatt; the back in the flat in Dunn\'s install)',
    ours: "back: 'block'", plan: 'ANALOGUE: #3 (S3) hook as the checkdown from the first hitch' },
  { concept: 'quick_outs', taught: 'the back\'s shoot route is the outlet ("Back - Shoot route ... will always be an outlet", Kratzer)',
    ours: "back: 'block'", plan: 'no checkdown (null)' },
  { concept: 'levels', taught: 'the outside receiver runs the 5 yd in and the slot the 10-12 yd square-in (Brown); the divide route on the alert',
    ours: "S1 dig, S2 short_in, S3 seam: the outside on the deep in, the slot on the short", plan: 'the key keeps high = S1 dig, low = S2 short in, as installed' },
  { concept: 'flood', taught: 'the backside receiver runs a slant, hot against a blitz from his side (Miller, Gridiron Strategies)',
    ours: 'W1 dig, W2 shallow', plan: 'ANALOGUE: W2 shallow as the backside hot' },
  { concept: 'curl_flat', taught: 'a shallow is the designated blitz throw in the five-step version (Heck, Gridiron Strategies)',
    ours: 'no shallow (S3 hook)', plan: 'GENERIC hot: the flat on each side' },
  { concept: 'mesh', taught: 'a wheel or rail is the hot and the first read in the Holgorsen versions; the Air Raid corner, mesh, back',
    ours: 'S1 corner, W1 go, back swing', plan: 'the Air Raid order; W1 go as the hot vertical' },
];

/** The authored plans by concept id. */
export const READ_PLANS: Readonly<Record<string, QbReadPlan>> = Object.fromEntries(
  [SLANT_FLAT, STICK, HITCHES, QUICK_OUTS, CURL_FLAT, SMASH, DAGGER, MESH, Y_CROSS, FLOOD, LEVELS, FOUR_VERTS, VERTS_HITCH]
    .map((p) => [p.conceptId, p]));
