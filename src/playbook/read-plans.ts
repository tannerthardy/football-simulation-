/**
 * Read plans, as taught (module A of the QB rebuild; docs/reviews/2026-11-24-read-plans.md holds each plan's sources,
 * quoted, and its gaps). Data only: QB_V2 runs these (src/sim/qbv2/plan.ts). Authored on the strong side; the passer's
 * pre-snap state flips them, by `pick`. Steps: 0 = the plant (the third step under center, one from the gun), 1 = the
 * first hitch. Defenders by the role a coach teaches the passer to find, never a slot or an assignment.
 */
import type { PlanRead, QbReadPlan } from '../sim/qbv2/plan.js';
import { getRoute } from './routes.js';
import { PASS_BY_ID, SCREEN_BY_ID } from './concepts.js';
import { asBackThree } from '../game/concept-fit.js';
import type { PassConcept, ReceiverRef } from './types.js';

/** Slant-flat: key the flat defender on the plant, the flat then the slant; widens: the slant behind him; sinks under
 * the slant: the flat. Reset to the backside's slant-flat on the first hitch. (Klatt; Football Playbook Designer;
 * Bowen, NFP; Hewitt.) */
export const SLANT_FLAT: QbReadPlan = {
  conceptId: 'slant_flat', drop: 'quick', readType: 'key',
  reads: [
    { step: 0, look: { kind: 'key', role: 'flat' },
      throws: [{ ref: 'S2', timing: 'onBreak' }, { ref: 'S1', timing: 'onBreak' }],
      keyRules: [{ cue: 'widens', throwTo: 'S1' }, { cue: 'jumps', throwTo: 'S1' }, { cue: 'sinks', throwTo: 'S2' }, { cue: 'none', throwTo: 'S2' }] },
    { step: 1, look: { kind: 'key', role: 'flat', side: 'W' },
      throws: [{ ref: 'W2', timing: 'onBreak' }, { ref: 'W1', timing: 'onBreak' }],
      keyRules: [{ cue: 'widens', throwTo: 'W1' }, { cue: 'jumps', throwTo: 'W1' }, { cue: 'sinks', throwTo: 'W2' }, { cue: 'none', throwTo: 'W2' }] },
  ],
  hot: [{ side: 'S', over: 1, answer: { ref: 'S1', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W1', timing: 'onBreak' } }],
  // Taught: the back checks and releases (a CALL_COMPOSE setting, #903). Installed default: he blocks (CONCEPT_GAPS).
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: null,
  expected: { cover0: 0, cover1: 0, cover2: 0, tampa2: 0, cover2man: 0, cover3: 0, cover4: 0, cover6: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#slant-flat-slant_flat (Klatt; Football Playbook Designer; Bowen, NFP; Bleacher Report slant; Hewitt; Browns cut-up). Checkdown: the back (taught setting).',
};

/** Stick: key the flat defender outside-in on the plant: he fails to widen: the flat; widens: the stick. First hitch: the
 * backside slant, then its stick. The back from the first hitch. (Throw Deep; Ross on Walsh, Mumme, Leach; Wilhite.) */
export const STICK: QbReadPlan = {
  // No pick: stick is a one-side concept, called to its side. Ross on Leach uses the flat defender's alignment against
  // the stick receiver (inside the Y: expect the shoot; outside: expect the stick) as a lean on which throw comes, not a
  // flip of sides; the key read on the plant answers that question post-snap (Flex asked, 2026-11-24).
  // Drop: the quick game's, three steps under center or one from the gun ("A three-step drop under center or one step
  // from the gun", Coaching Football Insights; Walsh's "one long and two short steps", Ross). The installed concept keeps
  // CONCEPT_DROPS' gun3 for the old controller: PLAN_DROP_DIFFERS (QB lane, 2026-11-24: on gun3 the plant came 1.1 s
  // after the stick's break).
  conceptId: 'stick', drop: 'quick', readType: 'key',
  reads: [
    { step: 0, look: { kind: 'key', role: 'flat' },
      throws: [{ ref: 'S3', timing: 'onBreak' }, { ref: 'S2', timing: 'onBreak' }],
      keyRules: [{ cue: 'widens', throwTo: 'S2' }, { cue: 'jumps', throwTo: 'S2' }, { cue: 'sinks', throwTo: 'S3' }, { cue: 'squats', throwTo: 'S3' }, { cue: 'none', throwTo: 'S3' }] },
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
  conceptId: 'quick_outs', drop: 'quick', readType: 'key', pick: 'cushion',
  reads: [
    // The corner over #1 first, in every coverage (Integration and the QB lane, 2026-11-25: keyed on the apex, the
    // out went into a squatting Cover 2 corner on 21 of 30, the apex having dropped inside). "If the corner is off, we
    // take the speed out. If the corner is hard ... that side of the field is closed" (Shaw); "If a soft corner to the
    // quick side, go to quick out" (Kratzer). Off and bailing: the out, before the break. Tight or squatting: not the
    // out; the next read. 'none' (he looked, and nobody is over or outside #1) leaves the out uncovered.
    { step: 0, look: { kind: 'key', role: 'corner' },
      throws: [{ ref: 'S1', timing: 'onBreak' }, { ref: 'S2', timing: 'onBreak' }],
      keyRules: [{ cue: 'bails', throwTo: 'S1' }, { cue: 'sinks', throwTo: 'S1' }, { cue: 'carries', throwTo: 'S1' },
        { cue: 'squats', throwTo: 'S2' }, { cue: 'jumps', throwTo: 'S2' }, { cue: 'none', throwTo: 'S1' }] },
    // The apex second: the out is gone (or not judged open: the apex widening into its window is that throw's lane
    // defender), so #2's hitch inside him: "Apex widening into the window: move inside or backside" (the outside
    // reviewer's notes, docs/reviews/2026-11-24-qbv2-outside-audit.md §4). Only the hitch is thrown from this read, so
    // nothing the apex does, 'none' included, sends the ball to the out.
    { step: 0, look: { kind: 'key', role: 'flat' },
      throws: [{ ref: 'S2', timing: 'onBreak' }],
      keyRules: [{ cue: 'widens', throwTo: 'S2' }, { cue: 'jumps', throwTo: 'S2' }, { cue: 'none', throwTo: 'S2' }] },
    // "progression continuing on the weak side" (Kratzer): the backside quick out on the first hitch.
    { step: 1, look: { kind: 'receiver', ref: 'W1' }, throws: [{ ref: 'W1', timing: 'onBreak' }] },
  ],
  hot: [{ side: 'S', over: 1, answer: { ref: 'S2', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W2', timing: 'onBreak' } }],
  // Taught: the back's shoot (a CALL_COMPOSE step-2 setting, #903). While it is not called ours blocks.
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: null,
  expected: { cover2: 1, tampa2: 1, cover3: 0, cover4: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#quick-outs-quick_outs (Kratzer; Shaw; The QB Stable; Win With The Pass Cover 2 beaters; Brown, Grantland; Gridiron Strategies curl/speed out). Outlet: the back\'s shoot.',
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
      keyRules: [{ cue: 'widens', throwTo: 'S1' }, { cue: 'jumps', throwTo: 'S1' }, { cue: 'sinks', throwTo: 'S2' }, { cue: 'none', throwTo: 'S2' }] },
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
  // GENERIC hot (the crosser on the blitz side). The corners run both sides (taught setting); he picks the better corner.
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
  // The flat is hot; the backside slant is hot vs a blitz from his side (Miller; the slant: taught setting).
  hot: [{ side: 'S', over: 1, answer: { ref: 'S3', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W1', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 2, timing: 'seenOpen' },
  confirm: null,
  expected: { cover3: 0 },
  source: 'docs/reviews/2026-11-24-read-plans.md#flood-flood (Miller GS; Bowen NFP and BR; YFO; Kou; Wide Zone Warriors). Backside slant (taught setting). Variants: sail first (YFO); peek the vertical (Kou).',
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
      // Taught (setting): S1 the 5 yd in (low), S2 the square-in (high).
      throws: [{ ref: 'S1', timing: 'onBreak' }, { ref: 'S2', timing: 'onBreak' }],
      keyRules: [{ cue: 'sinks', throwTo: 'S1' }, { cue: 'carries', throwTo: 'S1' }, { cue: 'jumps', throwTo: 'S2' }, { cue: 'squats', throwTo: 'S2' }] },
  ],
  // GENERIC hot.
  hot: [{ side: 'S', over: 1, answer: { ref: 'S1', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W2', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: 'mofSafety',
  expected: { cover2: 1 },
  source: 'docs/reviews/2026-11-24-read-plans.md#levels-levels (Brown, smartfootball blogspot; Wilhite; Bowen NFP; Alert The Post). GENERIC hot. Routes as taught (setting).',
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

/** Fade-flat (fade_flat, a menu concept). The plan is a key read on the flat defender, outside-in, at the plant:
 * - he sinks with the fade: the flat;
 * - he squats on the flat: the fade, in the hole between the corner and the safety.
 *
 * Alert, before the snap: press on #1 with the middle of the field closed means the fade one-on-one.
 *
 * First hitch: #3's hitch, then the backside hitch. The back from the first hitch.
 *
 * Drop: the quick game's, "one… two… three… throw now", thrown "on time". The ball's placement off the defender (the
 * hole, over the outside shoulder, or the back shoulder) is the throw's, not the read's: the rule is in
 * docs/reviews/2026-11-24-read-plans.md#fade-flat for the QB lane.
 * Sources: Gridiron Strategies (Hancock, Marinelli, Shaw); Throw Deep; Win With The Pass; AFQ; Hewitt (USA Football);
 * Smart Football. */
export const FADE_FLAT: QbReadPlan = {
  conceptId: 'fade_flat', drop: 'quick', readType: 'key',
  // "do we have a single coverage on our Z or X with bump man-to-man? Is there safety help?" (Shaw); "If the corner plays
  // bump and run, the quarterback can adjust the receiver to a fade route" (Hewitt).
  alert: { read: 0, when: { press: 'S1', shell: 'closed' } },
  reads: [
    { step: 0, look: { kind: 'receiver', ref: 'S1' }, throws: [{ ref: 'S1', timing: 'onBreak' }] },
    { step: 0, look: { kind: 'key', role: 'flat' },
      throws: [{ ref: 'S2', timing: 'onBreak' }, { ref: 'S1', timing: 'seenOpen' }],
      keyRules: [{ cue: 'sinks', throwTo: 'S2' }, { cue: 'carries', throwTo: 'S2' }, { cue: 'squats', throwTo: 'S1' }, { cue: 'jumps', throwTo: 'S1' },
        { cue: 'none', throwTo: 'S2' }] },
    { step: 1, look: { kind: 'receiver', ref: 'S3' }, throws: [{ ref: 'S3', timing: 'seenOpen' }] },
    { step: 1, look: { kind: 'receiver', ref: 'W1' }, throws: [{ ref: 'W1', timing: 'seenOpen' }] },
  ],
  hot: [{ side: 'S', over: 1, answer: { ref: 'S2', timing: 'onBreak' } }, { side: 'W', over: 1, answer: { ref: 'W1', timing: 'onBreak' } }],
  checkdown: { ref: 'B', fromStep: 1, timing: 'seenOpen' },
  confirm: null,
  expected: { cover0: 0, cover1: 0, cover2: 1, tampa2: 1, cover2man: 1, cover3: 1, cover4: 1, cover6: 1 },
  source: 'docs/reviews/2026-11-24-read-plans.md#fade-flat-fade_flat (Gridiron Strategies: Hancock, Marinelli, Shaw; Throw Deep; Win With The Pass; AFQ; Hewitt; Smart Football).',
};

/** Where the installed concept differs from the taught version these plans follow. Integration's decision: correct the
 * concepts' calls (CALL_COMPOSE settings, #903), not the plans. Also in docs/reviews/2026-11-24-read-plans.md, "Concept gaps". */
export const CONCEPT_GAPS: ReadonlyArray<{ concept: string; taught: string; whileOff: string }> = [
  // Each taught version is a CALL_COMPOSE setting (#903); the plans above are the taught versions. While it is not called,
  // the installed concept differs, and `whileOff` says what the plan meets instead.
  { concept: 'slant_flat', taught: 'the back check-releases as the checkdown (Klatt)', whileOff: 'the back blocks: no checkdown on the field' },
  { concept: 'quick_outs', taught: 'the back runs the shoot, the outlet (Kratzer)', whileOff: 'the back blocks: no outlet' },
  { concept: 'levels', taught: 'S1 the 5 yd in, S2 the 10-12 yd square-in (Brown)', whileOff: 'S1 runs the dig and S2 the short in: the key pair is inverted' },
  { concept: 'flood', taught: 'the backside #1 runs a slant, the backside hot (Miller)', whileOff: 'W1 runs a dig: the backside hot is a dig' },
  { concept: 'mesh', taught: 'a corner on both sides, the better one picked (Win With The Pass)', whileOff: 'W1 runs a go: the flipped first read is a go' },
];

/** Plans whose drop differs from the installed concept's, and why: the plan follows the taught drop, the installed
 * concept keeps its mark for the old controller. */
export const PLAN_DROP_DIFFERS: Readonly<Record<string, string>> = {
  stick: 'taught quick (three steps under center, one from the gun); installed gun3 (CONCEPT_DROPS)',
  fade_flat: 'taught quick (the three-step fade, thrown on time); installed gun3',
};

const swapRef = (r: ReceiverRef): ReceiverRef => (r === 'S3' ? 'B' : r);
/** BACK_AS_THREE (src/game/concept-fit.ts asBackThree): from a field with no #3 the back runs the #3's route, so the
 * plan is the same read with the back where S3 was (stick's flat, flood's flat). Keyed `<id>+b3`, as the call is. */
export function backThreePlan(p: QbReadPlan): QbReadPlan {
  return {
    ...p, conceptId: `${p.conceptId}+b3`,
    reads: p.reads.map((r) => ({ ...r,
      look: r.look.kind === 'receiver' ? { kind: 'receiver', ref: swapRef(r.look.ref) } : r.look,
      throws: r.throws.map((t) => ({ ...t, ref: swapRef(t.ref) })),
      ...(r.keyRules ? { keyRules: r.keyRules.map((k) => ({ ...k, throwTo: swapRef(k.throwTo) })) } : {}) })),
    hot: p.hot.map((h) => ({ ...h, answer: { ...h.answer, ref: swapRef(h.answer.ref) } })),
    checkdown: p.checkdown && p.checkdown.ref === 'B' && p.reads.some((r) => r.throws.some((t) => t.ref === 'S3')) ? null : p.checkdown,
    source: `${p.source} Back as #3 (BACK_AS_THREE): S3's reads on the back.`,
  };
}

const BASE_PLANS = [SLANT_FLAT, STICK, FADE_FLAT, HITCHES, QUICK_OUTS, CURL_FLAT, SMASH, DAGGER, MESH, Y_CROSS, FLOOD, LEVELS, FOUR_VERTS, VERTS_HITCH,
  PA_POST_DIG, PA_SHOT, PA_FLOOD, RB_SLIP_SCREEN, TE_SCREEN, BUBBLE_SCREEN, BUNCH_NOW_SCREEN, WIDE_NOW_SCREEN, TUNNEL_SCREEN];

/** The authored plans by concept id, with the back-as-#3 version of each concept that has one (`<id>+b3`). */
export const READ_PLANS: Readonly<Record<string, QbReadPlan>> = Object.fromEntries([
  ...BASE_PLANS.map((p) => [p.conceptId, p] as const),
  ...BASE_PLANS.filter((p) => PASS_BY_ID[p.conceptId]?.backThree).map((p) => [`${p.conceptId}+b3`, backThreePlan(p)] as const),
]);

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
  const on = authoredCall(plan);
  return on && new Map(planRefs(plan).map((ref) => [ref, routeAt(on, ref)]));
}

/** The call a plan was authored on: its installed concept with the taught setting (TAUGHT_ON), as the back-as-#3 call
 * for a '+b3' plan. Null for a plan with no installed concept. */
function authoredCall(plan: QbReadPlan): { strong: PassConcept['strong']; weak: PassConcept['weak']; back: string } | null {
  const b3 = plan.conceptId.endsWith('+b3');
  const id = b3 ? plan.conceptId.slice(0, -3) : plan.conceptId;
  const installed = PASS_BY_ID[id] ?? SCREEN_BY_ID[id];
  if (!installed) return null;
  const base = b3 ? asBackThree(installed) : installed;
  const t = TAUGHT_ON[id] ?? {};
  return { strong: { ...base.strong, ...t.strong }, weak: { ...base.weak, ...t.weak }, back: t.back ?? base.back };
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

// ------------------------------------------------------------------ composed plans (CALL_COMPOSE step 3, quick game)

/** A read is the frontside's when his eyes are on the plan's own side: a key on side S (the default) or a receiver who
 * is not on the backside (an S receiver, or the back as #3 on a '+b3' plan). */
const isFront = (r: PlanRead): boolean => (r.look.kind === 'key' ? r.look.side !== 'W' : r.look.ref[0] !== 'W');

/** A route that has broken by the quick drop's first hitch (the quick game's family rule: the ball comes out on the last
 * step or the first hitch, routes inside about 6 yd): the quick and flat families. A vertical, an intermediate route
 * (hook, out, curl, dig) or a crosser has not, so it is not read on the reset. */
const isQuickRoute = (id: string | undefined): boolean => !!id && ['quick', 'flat'].includes(getRoute(id).family);

/** The backside read a composed call takes on the reset, from the backside half's own routes.
 * - A slant-flat half keeps its taught key on the flat defender (Klatt: "reset to the backside's slant-flat").
 * - Otherwise his eyes go to the half's first quick route in number order (#1, then #2) and he throws its quick routes
 *   in that order, the looked-at one on its break (the family rule).
 * - A half with no quick route (a go or seam pair, comeback-seam, dig-shallow) gets no backside read: coaches do not
 *   reset to clear-outs on a quick drop; the play goes to the checkdown.
 * Null when there is none. */
export function backsideRead(weak: PassConcept['weak'], step: number): PlanRead | null {
  if (weak[1] === 'slant' && weak[2] === 'flat')
    return { step, look: { kind: 'key', role: 'flat', side: 'W' },
      throws: [{ ref: 'W2', timing: 'onBreak' }, { ref: 'W1', timing: 'onBreak' }],
      keyRules: [{ cue: 'widens', throwTo: 'W1' }, { cue: 'jumps', throwTo: 'W1' }, { cue: 'sinks', throwTo: 'W2' }, { cue: 'none', throwTo: 'W2' }] };
  const quick = ([1, 2, 3, 4] as const).filter((n) => isQuickRoute(weak[n])).map((n) => `W${n}` as ReceiverRef);
  if (!quick.length) return null;
  return { step, look: { kind: 'receiver', ref: quick[0] },
    throws: quick.map((ref, i) => ({ ref, timing: i === 0 ? 'onBreak' : 'seenOpen' })) };
}

const sameSide = (a: PassConcept['weak'], b: PassConcept['weak']): boolean =>
  ([1, 2, 3, 4] as const).every((n) => (a[n] ?? null) === (b[n] ?? null));

/** The read plan for a call as it is run (CALL_COMPOSE step 3; the QB lane's one lookup): composed the way the call is
 * composed. The call is the concept as run, in its concept frame before the formation's flip.
 * - Null when no plan exists for the concept, or the call's frontside does not run the routes the plan's frontside
 *   reads, throws and S-side hot use (the plan's S refs, and the back when a '+b3' plan reads him as #3).
 * - The frontside (its reads, key rules, S and either-side hot, an alert on a front read) is the authored plan's,
 *   unchanged.
 * - The backside: the authored backside when the call's backside is the authored one (then, with the authored back's
 *   job, the plan returned is the authored plan itself); otherwise `backsideRead` of the call's backside half on the
 *   authored reset's step, and its first quick route as the W hot (the replacement rule; none without one).
 * - The checkdown: only when the call releases the back (he is in: none), on whatever route the call gave him, seen
 *   open, from the authored checkdown step (default the first hitch). Not on a '+b3' plan whose back is #3.
 * - The side pick (cushion, shell, leverage) only when the backside is the authored one: otherwise there is no mirror
 *   half to flip to, and the concept is run to its called side.
 * - `expected` and `alert` indices follow the reads; an entry on a dropped backside read is removed. */
export function planFor(call: Pick<PassConcept, 'id' | 'strong' | 'weak' | 'back'>): QbReadPlan | null {
  for (const id of [call.id, `${call.id}+b3`]) {
    const plan = READ_PLANS[id];
    if (!plan) continue;
    const on = authoredCall(plan);
    if (!on) continue;
    const front = plan.reads.filter(isFront);
    const frontRefs = new Set<ReceiverRef>();
    for (const r of front) {
      if (r.look.kind === 'receiver') frontRefs.add(r.look.ref);
      for (const t of r.throws) frontRefs.add(t.ref);
      for (const k of r.keyRules ?? []) frontRefs.add(k.throwTo);
    }
    for (const h of plan.hot) if (h.side !== 'W') frontRefs.add(h.answer.ref);
    if (![...frontRefs].every((ref) => routeAt(call, ref) === routeAt(on, ref))) continue;
    return compose(plan, on, call);
  }
  return null;
}

function compose(plan: QbReadPlan, on: NonNullable<ReturnType<typeof authoredCall>>, call: Pick<PassConcept, 'strong' | 'weak' | 'back'>): QbReadPlan {
  const weakSame = sameSide(call.weak, on.weak);
  const b3 = plan.conceptId.endsWith('+b3');
  const checkdown = b3 || call.back === 'block' ? (b3 ? plan.checkdown : null)
    : plan.checkdown ?? { ref: 'B', fromStep: Math.min(1, Math.max(...plan.reads.map((r) => r.step))), timing: 'seenOpen' };
  if (weakSame) {
    if (call.back === on.back || JSON.stringify(checkdown) === JSON.stringify(plan.checkdown)) return plan;
    return { ...plan, checkdown };
  }
  // The new read order: front reads in place; the backside read where the authored backside began (else last).
  const at = plan.reads.findIndex((r) => !isFront(r));
  const resetStep = at >= 0 ? plan.reads[at].step : Math.max(...plan.reads.map((r) => r.step)) + 1;
  const back = backsideRead(call.weak, resetStep);
  const reads: PlanRead[] = [], index = new Map<number, number>();
  plan.reads.forEach((r, i) => {
    if (i === at && back) reads.push(back);
    if (isFront(r)) { index.set(i, reads.length); reads.push(r); }
  });
  if (at < 0 && back) reads.push(back);
  const wHot = back ? (() => { const ref = back.look.kind === 'receiver' ? back.look.ref : 'W1'; return { side: 'W' as const, over: 1, answer: { ref, timing: 'onBreak' as const } }; })() : null;
  const hadW = plan.hot.some((h) => h.side === 'W');
  const hot = [...plan.hot.filter((h) => h.side !== 'W'), ...(hadW && wHot ? [wHot] : [])];
  const expected = plan.expected && Object.fromEntries(Object.entries(plan.expected)
    .filter(([, i]) => i !== undefined && index.has(i)).map(([k, i]) => [k, index.get(i!)!]));
  const alert = plan.alert && index.has(plan.alert.read) ? { ...plan.alert, read: index.get(plan.alert.read)! } : undefined;
  const out: QbReadPlan = { ...plan, reads, hot, checkdown, expected,
    source: `${plan.source} Composed (planFor): backside ${JSON.stringify(call.weak)}, ${back ? 'its quick read' : 'no backside read'}.` };
  delete out.pick; delete out.pickShell; delete out.alert;
  if (alert) out.alert = alert;
  return out;
}
