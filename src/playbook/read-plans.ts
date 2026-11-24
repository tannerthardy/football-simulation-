/**
 * Read plans, as taught (module A of the QB rebuild; docs/reviews/2026-11-24-read-plans.md holds each plan's sources,
 * quoted, and its gaps). Data only: QB_V2 runs these (src/sim/qbv2/plan.ts). Authored on the strong side; the passer's
 * pre-snap state flips them, by `pick`. Steps: 0 = the plant (the third step under center, one from the gun), 1 = the
 * first hitch. Defenders by the role a coach teaches the passer to find, never a slot or an assignment.
 */
import type { QbReadPlan } from '../sim/qbv2/plan.js';
import { PASS_BY_ID, SCREEN_BY_ID } from './concepts.js';
import type { PassConcept, ReceiverRef } from './types.js';

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
  // Taught: the back (CONCEPT_TAUGHT, #896). While that flag is off ours blocks: CONCEPT_GAPS.
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: null,
  expected: { cover0: 0, cover1: 0, cover2: 0, tampa2: 0, cover2man: 0, cover3: 0, cover4: 0, cover6: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#slant-flat-slant_flat (Klatt; Football Playbook Designer; Bowen, NFP; Bleacher Report slant; Hewitt; Browns cut-up). Checkdown: the back (CONCEPT_TAUGHT).',
};

/** Stick: key the flat defender outside-in on the plant: he fails to widen: the flat; widens: the stick. First hitch: the
 * backside slant, then its stick. The back from the first hitch. (Throw Deep; Ross on Walsh, Mumme, Leach; Wilhite.) */
export const STICK: QbReadPlan = {
  // No pick: stick is a one-side concept, called to its side. Ross on Leach uses the flat defender's alignment against
  // the stick receiver (inside the Y: expect the shoot; outside: expect the stick) as a lean on which throw comes, not a
  // flip of sides; the key read on the plant answers that question post-snap (Flex asked, 2026-11-24).
  conceptId: 'stick', drop: 'gun3', readType: 'key',
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
  // Taught: the back's shoot (CONCEPT_TAUGHT, #896). While that flag is off ours blocks: CONCEPT_GAPS.
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: null,
  expected: { cover2: 1, tampa2: 1, cover3: 0, cover4: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#quick-outs-quick_outs (Kratzer; Shaw; The QB Stable; Win With The Pass Cover 2 beaters; Brown, Grantland). Outlet: the back\'s shoot (CONCEPT_TAUGHT).',
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
  // The sit over the ball (#3) is the blitz throw in the five-step version ours runs (Heck, "Florida 4").
  hot: [{ side: 'either', over: 1, answer: { ref: 'S3', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: null,
  expected: { cover3: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#curl-flat-curl_flat (Bowen NFP; Heck GS "Florida 4"; Hewitt USAF; FirstDown; YFO).',
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
  conceptId: 'mesh', drop: 'gun5', readType: 'progression', pick: 'cushion',
  reads: [
    { step: 0, look: { kind: 'receiver', ref: 'S1' }, throws: [{ ref: 'S1', timing: 'onBreak' }] },
    { step: 1, look: { kind: 'receiver', ref: 'S2' },
      throws: [{ ref: 'S2', timing: 'seenOpen' }, { ref: 'W2', timing: 'seenOpen' }, { ref: 'S3', timing: 'seenOpen' }] },
  ],
  // GENERIC hot (the crosser on the blitz side). The corners run both sides (CONCEPT_TAUGHT); he picks the better corner.
  hot: [{ side: 'S', over: 1, answer: { ref: 'S2', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W2', timing: 'onBreak' } }],
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
  // The flat is hot; the backside slant is hot vs a blitz from his side (Miller; the slant: CONCEPT_TAUGHT).
  hot: [{ side: 'S', over: 1, answer: { ref: 'S3', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W1', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 2, timing: 'seenOpen' },
  confirm: null,
  expected: { cover3: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#flood-flood (Miller GS; Bowen NFP and BR; YFO; Kou; Wide Zone Warriors). Backside slant (CONCEPT_TAUGHT). Variants: sail first (YFO); peek the vertical (Kou).',
};

/** Levels: an alert on the divide (seam) at the end of the drop, then short to deep on the defender between the
 * levels: he stays home on the short in, the dig behind him; he drops with the deeper route, the short in. The back when
 * the middle backer takes both. (Chris Brown, Smart Football; Wilhite; Bowen NFP.) */
export const LEVELS: QbReadPlan = {
  conceptId: 'levels', drop: 'five', readType: 'alert',
  // The divide route is peeked every time ("The quarterback begins by 'peeking' ... the divide route", Brown): no condition.
  alert: { read: 0, when: {} },
  reads: [
    { step: 0, look: { kind: 'receiver', ref: 'S3' }, throws: [{ ref: 'S3', timing: 'onBreak' }] },
    { step: 1, look: { kind: 'key', role: 'hook' },
      // Taught (CONCEPT_TAUGHT): S1 the 5 yd in (low), S2 the square-in (high).
      throws: [{ ref: 'S1', timing: 'onBreak' }, { ref: 'S2', timing: 'onBreak' }],
      keyRules: [{ cue: 'sinks', throwTo: 'S1' }, { cue: 'carries', throwTo: 'S1' }, { cue: 'jumps', throwTo: 'S2' }, { cue: 'squats', throwTo: 'S2' }] },
  ],
  // GENERIC hot.
  hot: [{ side: 'S', over: 1, answer: { ref: 'S1', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W2', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: 'mofSafety',
  expected: { cover2: 1 },
  source: 'docs/reviews/2026-11-24-read-plans.md#levels-levels (Brown, smartfootball blogspot; Wilhite; Bowen NFP; Alert The Post). GENERIC hot. Routes as taught (CONCEPT_TAUGHT).',
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

// ------------------------------------------------------------------ play-action (docs/reviews/2026-11-24-read-plans.md)
// Max protection (the back and the inline end block) leaves no hot: a blitz seen before the snap goes to the underneath
// options (Throw Deep, Yankee). Steps count from the set after the fake: the read is on the hitch ("drop back, hitch, and
// throw", Coaches Insider, intermediate and deep passing game).

/** PA post-dig (Mills): key the safety on the hitch: he drives on the dig or is caught flat-footed, the post; he stays
 * deep on the post, the dig. Then the backside dig. (Inside The Pylon, Mills; Hoover on Spurrier; Bowen, Cover 4.) */
export const PA_POST_DIG: QbReadPlan = {
  conceptId: 'pa_post_dig', drop: 'pa', readType: 'key',
  reads: [
    { step: 1, look: { kind: 'key', role: 'mofSafety' },
      throws: [{ ref: 'S1', timing: 'onBreak' }, { ref: 'S2', timing: 'onBreak' }],
      keyRules: [{ cue: 'jumps', throwTo: 'S1' }, { cue: 'squats', throwTo: 'S1' }, { cue: 'sinks', throwTo: 'S2' }, { cue: 'bails', throwTo: 'S2' }] },
    { step: 2, look: { kind: 'receiver', ref: 'W1' }, throws: [{ ref: 'W1', timing: 'seenOpen' }] },
  ],
  hot: [],
  checkdown: null,
  confirm: 'mofSafety',
  expected: { cover4: 0, cover3: 0, cover1: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#pa-post-dig-pa_post_dig (ITP Mills; Hoover; Bowen BR Cover 4 and 3; Glazier Flinn; Chow via smartfootball blogspot). No hot: max protection.',
};

/** PA shot (Yankee): the free safety on the hitch: he plays low, the post; he sinks, the dig across. (Throw Deep;
 * Inside The Pylon; USA Football.) */
export const PA_SHOT: QbReadPlan = {
  conceptId: 'pa_shot', drop: 'pa', readType: 'key',
  reads: [
    { step: 1, look: { kind: 'key', role: 'mofSafety' },
      throws: [{ ref: 'S2', timing: 'onBreak' }, { ref: 'W2', timing: 'onBreak' }],
      keyRules: [{ cue: 'jumps', throwTo: 'S2' }, { cue: 'squats', throwTo: 'S2' }, { cue: 'sinks', throwTo: 'W2' }, { cue: 'bails', throwTo: 'W2' }] },
    { step: 2, look: { kind: 'receiver', ref: 'W1' }, throws: [{ ref: 'W1', timing: 'seenOpen' }, { ref: 'S1', timing: 'seenOpen' }] },
  ],
  hot: [],
  checkdown: null,
  confirm: 'mofSafety',
  expected: { cover1: 0, cover3: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#pa-shot-pa_shot (Throw Deep Yankee; ITP Yankee; USA Football Yankee; Hoover). No hot: max protection. Variant: a pure progression post, cross, flat (USA Football).',
};

/** PA flood: peek the vertical, then high-low the curl-flat (strong) defender on the hitch: the sail, or the flat if he
 * sinks under it; the backside crosser; the back in the flat. (Chow via Chris Brown, "65"; Throw Deep; Kou.) */
export const PA_FLOOD: QbReadPlan = {
  conceptId: 'pa_flood', drop: 'pa', readType: 'alert',
  // "If the corner plays bump on Z the QB has the option of throwing deep" (Miller, Gridiron Strategies).
  alert: { read: 0, when: { press: 'S1' } },
  reads: [
    { step: 0, look: { kind: 'receiver', ref: 'S1' }, throws: [{ ref: 'S1', timing: 'onBreak' }] },
    { step: 1, look: { kind: 'key', role: 'curl' },
      throws: [{ ref: 'S2', timing: 'onBreak' }, { ref: 'S3', timing: 'seenOpen' }],
      keyRules: [{ cue: 'jumps', throwTo: 'S2' }, { cue: 'widens', throwTo: 'S2' }, { cue: 'sinks', throwTo: 'S3' }] },
    { step: 2, look: { kind: 'receiver', ref: 'W1' }, throws: [{ ref: 'W1', timing: 'seenOpen' }] },
  ],
  // The flat is the hot against one-man pressure (Coaches Insider, screens and play action).
  hot: [{ side: 'S', over: 1, answer: { ref: 'S3', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 2, timing: 'seenOpen' },
  confirm: null,
  expected: { cover3: 1 },
  source: 'docs/reviews/2026-11-24-read-plans.md#pa-flood-pa_flood (Chow "65" via smartfootball blogspot; Throw Deep Cover 3; Kou; Coaches Insider). Variant: a bootleg read low to high (DeBerry, Glazier).',
};

// ------------------------------------------------------------------ screens
// One read: the screen's receiver, thrown when he is set (slow screens) or at once (quick screens). The decision to throw
// it at all is the screen's own pre-snap rule (its `kill`: numbers, press), already installed. If the receiver is
// covered or a rusher is in the lane the taught answer is to get it to him anyway, at his feet or over the rusher (not
// expressible as a throw here; the doc lists it).

const screenPlan = (conceptId: string, drop: QbReadPlan['drop'], ref: 'B' | 'S1' | 'S2' | 'S3' | 'W1', timing: 'onBreak' | 'seenOpen', source: string): QbReadPlan => ({
  conceptId, drop, readType: 'progression',
  // Covered or a rusher in the lane: the ball at his feet ("he must throw the ball at the TE's feet", Gridiron Strategies).
  reads: [{ step: 0, look: { kind: 'receiver', ref }, throws: [{ ref, timing }], onCovered: 'kill' }],
  hot: [], checkdown: null, confirm: null, expected: {}, source,
});
export const RB_SLIP_SCREEN = screenPlan('rb_slip_screen', 'gun5', 'B', 'seenOpen',
  'docs/reviews/2026-11-24-read-plans.md#screens (Coaches Insider screen and draw, detachment screens; Gridiron Strategies go screen; Bowen).');
export const TE_SCREEN = screenPlan('te_screen', 'gun5', 'S3', 'seenOpen',
  'docs/reviews/2026-11-24-read-plans.md#screens (Gridiron Strategies, TE screen: "throw the ball at the TE\'s feet").');
export const BUBBLE_SCREEN = screenPlan('bubble_screen', 'quick', 'S2', 'onBreak',
  'docs/reviews/2026-11-24-read-plans.md#screens (Brown; Bowen packaged plays; Coaches Insider; AFM). Pre-snap numbers: the installed kill.');
export const BUNCH_NOW_SCREEN = screenPlan('bunch_now_screen', 'quick', 'S1', 'onBreak',
  'docs/reviews/2026-11-24-read-plans.md#screens (Coaches Insider, screens and play action; no bunch-specific source).');
export const WIDE_NOW_SCREEN = screenPlan('wide_now_screen', 'quick', 'W1', 'onBreak',
  'docs/reviews/2026-11-24-read-plans.md#screens (Coaches Insider: the corner\'s cushion, yes or no; Wilhite, not into press: the installed kill).');
export const TUNNEL_SCREEN = screenPlan('tunnel_screen', 'quick', 'S1', 'seenOpen',
  'docs/reviews/2026-11-24-read-plans.md#screens (AFM: "at most, takes a three-step drop"; Coaches Insider, three screens).');

/** Where the installed concept differs from the taught version these plans follow. Integration's decision: correct the
 * concepts (CONCEPT_TAUGHT, #896), not the plans. Also in docs/reviews/2026-11-24-read-plans.md, "Concept gaps". */
export const CONCEPT_GAPS: ReadonlyArray<{ concept: string; taught: string; whileOff: string }> = [
  // Each is installed as taught by CONCEPT_TAUGHT (#896); the plans above are the taught versions. While that flag is
  // off the installed concept differs, and `whileOff` says what the plan meets instead.
  { concept: 'slant_flat', taught: 'the back check-releases as the checkdown (Klatt)', whileOff: 'the back blocks: no checkdown on the field' },
  { concept: 'quick_outs', taught: 'the back runs the shoot, the outlet (Kratzer)', whileOff: 'the back blocks: no outlet' },
  { concept: 'levels', taught: 'S1 the 5 yd in, S2 the 10-12 yd square-in (Brown)', whileOff: 'S1 runs the dig and S2 the short in: the key pair is inverted' },
  { concept: 'flood', taught: 'the backside #1 runs a slant, the backside hot (Miller)', whileOff: 'W1 runs a dig: the backside hot is a dig' },
  { concept: 'mesh', taught: 'a corner on both sides, the better one picked (Win With The Pass)', whileOff: 'W1 runs a go: the flipped first read is a go' },
];

/** The authored plans by concept id. */
export const READ_PLANS: Readonly<Record<string, QbReadPlan>> = Object.fromEntries(
  [SLANT_FLAT, STICK, HITCHES, QUICK_OUTS, CURL_FLAT, SMASH, DAGGER, MESH, Y_CROSS, FLOOD, LEVELS, FOUR_VERTS, VERTS_HITCH,
    PA_POST_DIG, PA_SHOT, PA_FLOOD, RB_SLIP_SCREEN, TE_SCREEN, BUBBLE_SCREEN, BUNCH_NOW_SCREEN, WIDE_NOW_SCREEN, TUNNEL_SCREEN]
    .map((p) => [p.conceptId, p]));

/** The taught versions these plans were authored on, where they differ from the installed concept (CONCEPT_GAPS).
 * Under CALL_COMPOSE step 2 each is a setting of its concept: slant_flat's and quick_outs' back, levels' outside short
 * in, flood's backside slant and mesh's W1 corner. */
const TAUGHT_ON: Record<string, { strong?: PassConcept['strong']; weak?: PassConcept['weak']; back?: string }> = {
  slant_flat: { back: 'check' },
  quick_outs: { back: 'back_flat' },
  levels: { strong: { 1: 'short_in', 2: 'dig' } },
  flood: { weak: { 1: 'slant' } },
  mesh: { weak: { 1: 'corner' } },
};

/** The route a concept puts at a receiver: 'B' is the back's (null when he blocks). */
function routeAt(c: { strong: PassConcept['strong']; weak: PassConcept['weak']; back: string }, ref: ReceiverRef): string | null {
  if (ref === 'B' || ref === 'B2') return c.back === 'block' ? null : c.back;
  const n = Number(ref.slice(1)) as 1 | 2 | 3 | 4;
  return (ref[0] === 'S' ? c.strong[n] : c.weak[n]) ?? null;
}

/** Every receiver a plan reads, throws to, keys an answer on, holds as a hot or checks down to. */
export function planRefs(plan: QbReadPlan): ReceiverRef[] {
  const refs = new Set<ReceiverRef>();
  for (const r of plan.reads) {
    if (r.look.kind === 'receiver') refs.add(r.look.ref);
    for (const t of r.throws) refs.add(t.ref);
    for (const k of r.keyRules ?? []) refs.add(k.throwTo);
  }
  for (const h of plan.hot) refs.add(h.answer.ref);
  if (plan.checkdown) refs.add(plan.checkdown.ref);
  return [...refs];
}

/** The routes a plan was authored on, at the receivers it uses (in its own frame: authored on the strong side, as
 * the concept's strong and weak are). For the QB lane's plan lookup: a call takes the plan only when every one of these
 * matches (`planFits`). Null for a plan with no installed concept. */
export function routesOf(plan: QbReadPlan): Map<ReceiverRef, string | null> | null {
  const base = PASS_BY_ID[plan.conceptId] ?? SCREEN_BY_ID[plan.conceptId];
  if (!base) return null;
  const t = TAUGHT_ON[plan.conceptId] ?? {};
  const on = { strong: { ...base.strong, ...t.strong }, weak: { ...base.weak, ...t.weak }, back: t.back ?? base.back };
  return new Map(planRefs(plan).map((ref) => [ref, routeAt(on, ref)]));
}

/** The call runs the routes the plan was authored on, at every receiver the plan uses (QB lane, 2026-11-24: otherwise
 * the call runs the old controller, as an unported concept does, so a plan can never read a go as a flat). The call
 * is compared in its concept frame, strong and weak as authored, before the formation's flip. */
export function planFits(plan: QbReadPlan, call: Pick<PassConcept, 'strong' | 'weak' | 'back'>): boolean {
  const authored = routesOf(plan);
  if (!authored) return false;
  for (const [ref, route] of authored) if (routeAt(call, ref) !== route) return false;
  return true;
}
