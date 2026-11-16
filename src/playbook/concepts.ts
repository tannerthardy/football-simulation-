/**
 * Pass and run concepts. Pass concepts are written against receiver numbers
 * (#1 = widest) on the strong and weak sides so each concept runs from any
 * formation, the way real offenses teach them. Receivers without an explicit
 * route run the side's default (#1 go, #2+ seam) as clear-outs.
 */
import type { PassConcept, RunConcept } from './types.js';

const BASE_PASS_CONCEPTS: PassConcept[] = [
  // ------------------------------------------------------------ quick game
  {
    id: 'slant_flat', name: 'Slant-Flat', family: 'quick', drop: 'quick',
    strong: { 1: 'slant', 2: 'flat', 3: 'hook' }, weak: { 1: 'slant', 2: 'flat' }, back: 'block',
    progression: ['S1', 'S2', 'W1', 'W2', 'S3'], beats: ['cover3', 'man', 'blitz'],
  },
  {
    id: 'stick', name: 'Stick', family: 'quick', drop: 'gun3',
    strong: { 1: 'go', 2: 'stick', 3: 'flat' }, weak: { 1: 'slant', 2: 'stick' }, back: 'check',
    progression: ['S2', 'S3', 'W1', 'W2', 'B'], beats: ['cover3', 'cover4', 'zone'],
  },
  {
    id: 'quick_outs', name: 'Speed Outs', family: 'quick', drop: 'quick',
    strong: { 1: 'quick_out', 2: 'hitch', 3: 'seam' }, weak: { 1: 'quick_out', 2: 'hitch' }, back: 'block',
    progression: ['S1', 'W1', 'S2', 'W2'], beats: ['cover3', 'off-man', 'cover4'],
  },
  {
    id: 'hitches', name: 'All Hitch', family: 'quick', drop: 'gun3',
    strong: { 1: 'hitch', 2: 'hitch', 3: 'hook' }, weak: { 1: 'hitch', 2: 'hitch' }, back: 'check',
    progression: ['S1', 'W1', 'S2', 'W2', 'B'], beats: ['cover3', 'cover4', 'off-man'],
  },
  // ------------------------------------------------------------ dropback
  {
    id: 'smash', name: 'Smash', family: 'dropback', drop: 'gun5',
    strong: { 1: 'hitch', 2: 'corner', 3: 'hook' }, weak: { 1: 'hitch', 2: 'corner' }, back: 'check',
    progression: ['S2', 'S1', 'W2', 'W1', 'B'], beats: ['cover2', 'cover4'],
  },
  {
    id: 'curl_flat', name: 'Curl-Flat', family: 'dropback', drop: 'gun5',
    strong: { 1: 'curl', 2: 'flat', 3: 'hook' }, weak: { 1: 'curl', 2: 'flat' }, back: 'check',
    progression: ['S1', 'S2', 'W1', 'W2', 'B'], beats: ['cover3', 'cover2'],
  },
  {
    id: 'mesh', name: 'Mesh', family: 'dropback', drop: 'gun5',
    // CROSS_FLAT: mesh's under crosser is its own route, a yard under the Y (routes.ts), not the drag.
    strong: { 1: 'corner', 2: process.env.CROSS_FLAT !== '0' ? 'mesh_under' : 'shallow', 3: 'hook' }, weak: { 1: 'go', 2: 'shallow_high' }, back: 'swing',
    progression: ['S2', 'W2', 'S1', 'B', 'S3'], beats: ['man', 'cover1', 'zone'],
  },
  {
    id: 'four_verts', name: 'Four Verticals', family: 'dropback', drop: 'gun5',
    strong: { 1: 'go', 2: 'seam', 3: 'seam' }, weak: { 1: 'go', 2: 'seam' }, back: 'check',
    progression: ['S2', 'W2', 'S1', 'W1', 'B'], beats: ['cover3', 'cover1'],
  },
  {
    id: 'flood', name: 'Flood', family: 'dropback', drop: 'gun5',
    strong: { 1: 'go', 2: 'out', 3: 'flat' }, weak: { 1: 'dig', 2: 'shallow' }, back: 'check',
    progression: ['S2', 'S3', 'S1', 'W1', 'B'], beats: ['cover3', 'zone'],
  },
  {
    id: 'dagger', name: 'Dagger', family: 'dropback', drop: 'five',
    strong: { 1: 'dig', 2: 'seam', 3: 'shallow' }, weak: { 1: 'go', 2: 'hook' }, back: 'check',
    progression: ['S1', 'S2', 'W2', 'B'], beats: ['cover3', 'cover1', 'zone'],
  },
  {
    id: 'drive', name: 'Drive', family: 'dropback', drop: 'gun5',
    strong: { 1: 'go', 2: 'dig' }, weak: { 1: 'go', 2: 'shallow' }, back: 'check',
    progression: ['W2', 'S2', 'B', 'S1'], beats: ['man', 'cover1', 'cover3'],
  },
  {
    id: 'y_cross', name: 'Y-Cross', family: 'dropback', drop: 'five',
    strong: { 1: 'go', 2: 'cross', 3: 'flat' }, weak: { 1: 'post', 2: 'hook' }, back: 'check',
    progression: ['S2', 'S3', 'W1', 'B'], beats: ['cover3', 'man'],
  },
  {
    id: 'levels', name: 'Levels', family: 'dropback', drop: 'gun5',
    strong: { 1: 'dig', 2: 'short_in', 3: 'seam' }, weak: { 1: 'go', 2: 'hook' }, back: 'check',
    progression: ['S1', 'S2', 'W2', 'B'], beats: ['cover4', 'cover3'],
  },
  {
    id: 'comebacks', name: 'Comebacks', family: 'dropback', drop: 'seven',
    strong: { 1: 'comeback', 2: 'dig', 3: 'hook' }, weak: { 1: 'comeback', 2: 'seam' }, back: 'check',
    progression: ['S1', 'W1', 'S2', 'B'], beats: ['cover3', 'off-man'],
  },
  // ------------------------------------------------------------ play action
  {
    id: 'pa_post_dig', name: 'PA Post-Dig', family: 'playaction', drop: 'pa', fake: 'insideZone', teBlock: true,
    strong: { 1: 'post', 2: 'dig' }, weak: { 1: 'dig', 2: 'hook' }, back: 'block',
    progression: ['S1', 'W1', 'S2'], beats: ['cover3', 'cover1', 'run-heavy'],
  },
  {
    id: 'pa_flood', name: 'PA Flood', family: 'playaction', drop: 'pa', fake: 'outsideZone',
    strong: { 1: 'go', 2: 'deep_out', 3: 'flat' }, weak: { 1: 'cross', 2: 'shallow' }, back: 'back_flat',
    progression: ['S2', 'W1', 'S3', 'B'], beats: ['cover3', 'run-heavy'],
  },
  {
    id: 'pa_shot', name: 'PA Shot', family: 'playaction', drop: 'pa', fake: 'insideZone', teBlock: true,
    strong: { 1: 'go', 2: 'post' }, weak: { 1: 'post', 2: 'dig' }, back: 'block',
    progression: ['S2', 'S1', 'W1'], beats: ['cover1', 'cover3', 'run-heavy'],
  },
];

/**
 * CONCEPT_MENU (experimental, off; CONCEPT_MENU=1): the drop-back combinations the NFL runs most that our
 * concepts never produced (docs/reviews/2026-11-11-playbook-coverage.md, BDB 2025 routeRan on drop-back
 * passes: 54% of formation sides and 22% of drop-backs were ours). Each strong side's first two routes are a
 * missing two-receiver pair and its #3 a missing trips side; weak sides are common NFL pairs; the back runs
 * the NFL's back routes (angle 16.8%, out 7.4%, wheel 2.0% of drop-backs). `read` is a plain note of the
 * intended key and rule; `progression` is ordered to match it. CALL_MIX weights them from their route classes like the rest.
 */
export const CONCEPT_MENU = process.env.CONCEPT_MENU !== '0';
export const MENU_CONCEPTS: PassConcept[] = [
  {
    id: 'double_slants', name: 'Double Slants', family: 'quick', drop: 'quick',
    strong: { 1: 'slant', 2: 'slant', 3: 'flat' }, weak: { 1: 'go', 2: 'hitch' }, back: 'block',
    progression: ['S2', 'S1', 'S3', 'W2'], beats: ['cover3', 'man', 'blitz'],
    read: 'the hook defender over #2: he widens under #2: #1 slant behind him; he holds: #2 slant; he drops: #3 flat',
  },
  {
    id: 'fade_flat', name: 'Fade-Flat', family: 'dropback', drop: 'gun3',
    // The back checks: released at once on the angle he took the ball from the two reads (27 of 61 throws).
    strong: { 1: 'go', 2: 'flat', 3: 'hitch' }, weak: { 1: 'hitch', 2: 'go' }, back: 'check',
    progression: ['S1', 'S2', 'S3', 'W1', 'B'], beats: ['cover2', 'man'],
    read: 'the flat (cloud) corner: he sinks with #1: #2 flat; he squats on the flat: #1 fade in the hole',
  },
  {
    id: 'hitch_post', name: 'Hitch-Post', family: 'dropback', drop: 'gun5',
    strong: { 1: 'hitch', 2: 'post', 3: 'flat' }, weak: { 1: 'go', 2: 'hitch' }, back: 'angle',
    progression: ['S2', 'S1', 'S3', 'W2', 'B'], beats: ['cover3', 'cover1'],
    read: 'the middle-of-field safety: he stays over the post: #1 hitch; he widens or jumps a seam: #2 post',
  },
  {
    id: 'double_outs', name: 'Double Outs', family: 'dropback', drop: 'gun5',
    strong: { 1: 'out', 2: 'quick_out', 3: 'hitch' }, weak: { 1: 'hitch', 2: 'out' }, back: 'angle',
    progression: ['S2', 'S1', 'S3', 'W1', 'B'], beats: ['cover3', 'cover1'],
    read: 'the curl-flat defender: he drops under #1: #2 quick out; he jumps #2: #1 out behind him',
  },
  {
    id: 'hitch_out', name: 'Hitch-Out', family: 'quick', drop: 'gun3',
    strong: { 1: 'hitch', 2: 'quick_out', 3: 'hitch' }, weak: { 1: 'slant', 2: 'hitch' }, back: 'back_out',
    progression: ['S2', 'S1', 'S3', 'W1', 'B'], beats: ['cover3', 'cover4'],
    read: 'the apex (flat) defender: he widens to the out: #1 hitch inside him; he sits on the hitch: #2 out',
  },
  {
    id: 'seam_slant', name: 'Seam-Slant', family: 'quick', drop: 'quick',
    strong: { 1: 'go', 2: 'slant', 3: 'hitch' }, weak: { 1: 'slant', 2: 'go' }, back: 'block',
    progression: ['S2', 'W1', 'S3', 'S1'], beats: ['cover1', 'cover3', 'blitz'],
    read: 'the hook defender inside #2: he widens to the slant: #3 hitch; he stays inside: #2 slant; man: the slant with leverage',
  },
  {
    id: 'hitch_cross', name: 'Hitch-Cross', family: 'dropback', drop: 'gun5',
    strong: { 1: 'hitch', 2: 'cross', 3: 'flat' }, weak: { 1: 'go', 2: 'shallow' }, back: 'back_out',
    progression: ['S2', 'W2', 'S1', 'S3', 'B'], beats: ['cover1', 'cover3'],
    read: 'the Mike (hook-middle): he carries the cross: the weak shallow under him, then #1 hitch; he sits: the cross past him; man: the crosser away from leverage',
  },
  {
    id: 'post_cross', name: 'Post-Cross', family: 'dropback', drop: 'gun5',
    strong: { 1: 'post', 2: 'cross', 3: 'hitch' }, weak: { 1: 'go', 2: 'hitch' }, back: 'block',
    progression: ['S1', 'S2', 'W2', 'S3'], beats: ['cover3', 'cover1'],
    read: 'the middle-of-field safety: he stays on the post: #2 cross under him; he drives on the cross: #1 post',
  },
  {
    id: 'sail_corner', name: 'Corner-Out', family: 'dropback', drop: 'gun5',
    // The back checks first: a five-step high-low needs him in until the corner breaks.
    strong: { 1: 'corner', 2: 'quick_out', 3: 'hitch' }, weak: { 1: 'hitch', 2: 'go' }, back: 'check',
    progression: ['S1', 'S2', 'S3', 'W1', 'B'], beats: ['cover2', 'cover4'],
    read: 'the squat (flat) corner: he sinks under the corner: #2 out; he squats on the out: #1 corner',
  },
  {
    id: 'corner_flat', name: 'Corner-Flat', family: 'dropback', drop: 'gun5',
    strong: { 1: 'corner', 2: 'flat', 3: 'hitch' }, weak: { 1: 'slant', 2: 'hitch' }, back: 'check',
    progression: ['S1', 'S2', 'S3', 'W1', 'B'], beats: ['cover2', 'cover3'],
    read: 'the flat defender: he sinks under the corner: #2 flat; he jumps the flat: #1 corner',
  },
  {
    id: 'trips_stick', name: 'Trips Hitch-Flat', family: 'quick', drop: 'gun3',
    strong: { 1: 'hitch', 2: 'hitch', 3: 'flat' }, weak: { 1: 'go' }, back: 'angle',
    progression: ['S3', 'S2', 'S1', 'W1', 'B'], beats: ['cover3', 'cover4'],
    read: 'the curl-flat (apex) defender over #2/#3: he widens to the flat: #2 hitch; he sits: #3 flat',
  },
  {
    id: 'trips_sail', name: 'Trips Sail', family: 'dropback', drop: 'gun5',
    strong: { 1: 'go', 2: 'out', 3: 'hitch' }, weak: { 1: 'hitch', 2: 'hitch' }, back: 'back_out',
    progression: ['S2', 'S3', 'S1', 'W1', 'B'], beats: ['cover3'],
    read: 'the curl-flat defender: he widens under the out: #3 hitch inside; he sits: #2 out',
  },
  {
    id: 'seam_hitch', name: 'Seam-Hitch', family: 'dropback', drop: 'gun3',
    strong: { 1: 'hitch', 2: 'seam', 3: 'hitch' }, weak: { 1: 'hitch', 2: 'seam' }, back: 'wheel',
    progression: ['S2', 'S1', 'S3', 'W2', 'B'], beats: ['cover3', 'cover1'],
    read: 'the middle-of-field safety: he works to the seam: the hitches under; he stays middle: the seam outside his leverage',
  },
  {
    id: 'trips_outs', name: 'Trips Outs', family: 'dropback', drop: 'gun5',
    strong: { 1: 'go', 2: 'out', 3: 'quick_out' }, weak: { 1: 'hitch', 2: 'go' }, back: 'block',
    progression: ['S2', 'S3', 'S1', 'W1'], beats: ['cover3', 'cover1'],
    read: 'the curl-flat defender: he sinks under #2: #3 quick out; he jumps #3: #2 out',
  },
  {
    id: 'verts_hitch', name: 'Verticals-Hitch', family: 'dropback', drop: 'gun5',
    strong: { 1: 'go', 2: 'seam', 3: 'hitch' }, weak: { 1: 'go', 2: 'hitch' }, back: 'check',
    progression: ['S2', 'S3', 'W2', 'S1', 'B'], beats: ['cover3', 'cover1'],
    read: 'the middle-of-field safety: he stays middle: #2 seam; he shades to #2: #3 hitch under the seam, then the backside seam',
  },
];

/** CONCEPT_DROPS (experimental, off; read plans, 2026-11-14; the QB lane owns the drops' depths and times in
 * `dropSpec`): each pool concept's coached drop class, so its first read's route is ready on its step. Our gun drops
 * were 68% at 2-3.5 yd behind the snap against the NFL's 43%, and 10% at 3.5-5 yd against 28% (the NFL setting there at
 * 2.2 s and throwing at 3.0, a hitch after the drop; QB lane, drop-time.py). With the plan's rhythm (OUTLET_LAST's
 * `rhythm`), the concepts whose first read is not ready until 2.4-2.9 s take the five-step ('five': the deeper set
 * and read 1 on the hitch); the rest keep theirs. Sourced classes: the shallow cross needs a full five-step (Smart
 * Football; mesh, drive), the slant is three-step (Smart Football), stick from one to three steps (Throw Deep),
 * comebacks five steps and a hitch (Coiner; ours had seven), four verticals a quick five (Gonzalez via Smart
 * Football: read 1 on the last step; ours is not ready until 2.7, a route timing question noted for the QB lane);
 * the rest by the table's analogues (docs/reviews/2026-11-14-read-plan-table.md). This flag only marks the class:
 * 'five' and 'gun5' are the same drop in the gun today, until the QB lane sets 'five' to the NFL's depth and time. */
const CONCEPT_DROPS = process.env.CONCEPT_DROPS === '1';
const COACHED_DROP: Record<string, PassConcept['drop']> = {
  smash: 'five', mesh: 'five', flood: 'five', drive: 'five', sail_corner: 'five', corner_flat: 'five',
  trips_sail: 'five', trips_outs: 'five', double_outs: 'five', comebacks: 'five',
};
if (CONCEPT_DROPS) for (const c of [...BASE_PASS_CONCEPTS, ...MENU_CONCEPTS]) if (COACHED_DROP[c.id]) c.drop = COACHED_DROP[c.id];
/** VERTS_QUICK (experimental, off; split from CONCEPT_DROPS 2026-11-14, one flag one meaning): four verticals is "a
 * quick five-step drop (from shotgun, a quick three-steps)" (Gonzalez via Smart Football), so four_verts and
 * verts_hitch take the gun three-step instead of 'gun5'. Paired staged read, the same 384 plays off and on
 * (scripts/diag/escape/drop-staged.ts on the QB lane branch), engine-66: 8.21 -> 9.95 yd a play, time to throw
 * 3.60 -> 3.25 s, sacks 52 -> 35, INT 2 -> 2; on the route card's stack: 6.98 -> 10.17, sacks 52 -> 35, INT 4 -> 2. */
const VERTS_QUICK = process.env.VERTS_QUICK === '1';
if (VERTS_QUICK) for (const c of [...BASE_PASS_CONCEPTS, ...MENU_CONCEPTS]) if (c.id === 'four_verts' || c.id === 'verts_hitch') c.drop = 'gun3';
export const PASS_CONCEPTS: PassConcept[] = CONCEPT_MENU ? [...BASE_PASS_CONCEPTS, ...MENU_CONCEPTS] : BASE_PASS_CONCEPTS;

export const RUN_CONCEPTS: RunConcept[] = [
  // Mesh times follow tracking: handoffs land ~1.3 s after the snap (zone a
  // touch earlier, counter and draw later).
  { id: 'iz_strong', name: 'Inside Zone', scheme: 'insideZone', direction: 'strong', aim: 'B', meshTime: 1.2, pullers: [], beats: ['even', 'light-box'] },
  { id: 'iz_weak', name: 'Inside Zone Weak', scheme: 'insideZone', direction: 'weak', aim: 'B', meshTime: 1.2, pullers: [], beats: ['even', 'light-box'] },
  { id: 'oz_strong', name: 'Outside Zone', scheme: 'outsideZone', direction: 'strong', aim: 'C', meshTime: 1.15, pullers: [], beats: ['penetrating', 'light-box'] },
  { id: 'oz_weak', name: 'Outside Zone Weak', scheme: 'outsideZone', direction: 'weak', aim: 'C', meshTime: 1.15, pullers: [], beats: ['penetrating'] },
  { id: 'wz_strong', name: 'Wide Zone', scheme: 'wideZone', direction: 'strong', aim: 'D', meshTime: 1.2, pullers: [], beats: ['light-box'] },
  { id: 'wz_weak', name: 'Wide Zone Weak', scheme: 'wideZone', direction: 'weak', aim: 'D', meshTime: 1.2, pullers: [], beats: ['light-box'] },
  { id: 'split_zone', name: 'Split Zone', scheme: 'splitZone', direction: 'strong', aim: 'B', meshTime: 1.2, pullers: [], beats: ['penetrating'] },
  { id: 'power', name: 'Power', scheme: 'power', direction: 'strong', aim: 'C', meshTime: 1.3, pullers: ['BSG'], beats: ['odd', 'heavy-box'] },
  { id: 'counter', name: 'Counter', scheme: 'counter', direction: 'weak', aim: 'B', meshTime: 1.45, pullers: ['BSG', 'BST'], beats: ['flow', 'odd'] },
  { id: 'duo', name: 'Duo', scheme: 'duo', direction: 'strong', aim: 'A', meshTime: 1.2, pullers: [], beats: ['heavy-box', 'two-high'] },
  { id: 'trap', name: 'Trap', scheme: 'trap', direction: 'strong', aim: 'A', meshTime: 1.05, pullers: ['BSG'], beats: ['penetrating'] },
  { id: 'draw', name: 'Draw', scheme: 'draw', direction: 'strong', aim: 'A', meshTime: 1.45, pullers: [], beats: ['pass-rush', 'two-high'] },
  { id: 'toss', name: 'Toss', scheme: 'toss', direction: 'strong', aim: 'edge', meshTime: 0.5, pullers: [], beats: ['heavy-box', 'slow-edge'] },
];

/**
 * Screens. Not in the play caller's pool yet: they are called from the screen
 * lab (scripts/diag/screen-lab.mts) until their blocking is reviewed.
 */
export const SCREEN_CONCEPTS: PassConcept[] = [
  {
    // Slow RB screen to the back's side: line sells the pass, screen-side T/G/C release.
    id: 'rb_slip_screen', name: 'RB Slip Screen', family: 'screen', drop: 'gun5',
    strong: { 1: 'go', 2: 'go', 3: 'go' }, weak: { 1: 'go', 2: 'go' }, back: 'slip_screen',
    progression: ['B'], beats: ['pass-rush', 'blitz'],
    // The back gets lost in the line and drifts out before the linemen release:
    // NFL slip backs are 1 yd wide of their start by 1.1 s (screen_back_reference.py).
    screen: { receiver: 'B', tempo: 'slow', count: 1.0, receiverRelease: 0.6, lineSet: { maxDepth: 2.4 }, blocks: [{ who: 'T', job: 'out' }, { who: 'G', job: 'up' }, { who: 'C', job: 'in' }] },
  },
  {
    // TE screen: the inline TE blocks, then slides out behind the line.
    id: 'te_screen', name: 'TE Screen', family: 'screen', drop: 'gun5',
    strong: { 1: 'go', 2: 'go', 3: 'te_screen' }, weak: { 1: 'go', 2: 'go' }, back: 'block',
    progression: ['S3', 'S2'], beats: ['pass-rush'],
    screen: { receiver: 'S3', tempo: 'slow', count: 1.0, lineSet: { maxDepth: 1.8 }, blocks: [{ who: 'T', job: 'out' }, { who: 'G', job: 'up' }, { who: 'C', job: 'in' }] },
  },
  {
    // Bubble to the trips slot: #1 stalks, #3 blocks inside-out on the next man.
    id: 'bubble_screen', name: 'Trips Bubble', family: 'screen', drop: 'quick',
    strong: { 1: 'go', 2: 'bubble', 3: 'go' }, weak: { 1: 'go', 2: 'go' }, back: 'block',
    progression: ['S2'], beats: ['off-coverage', 'light-box'],
    // The bubble is thrown when the numbers outside are ours (SCREEN_QB: checked at the line, as the RPO reads it).
    screen: { receiver: 'S2', tempo: 'quick', count: 0, kill: 'numbers', blocks: [{ who: 'S1', job: 'stalk' }, { who: 'S3', job: 'crack' }] },
  },
  {
    // Bunch now screen to the point man... caught by #1 coming back; #2/#3 block.
    id: 'bunch_now_screen', name: 'Bunch Now Screen', family: 'screen', drop: 'quick',
    strong: { 1: 'now_screen', 2: 'go', 3: 'go' }, weak: { 1: 'go', 2: 'go' }, back: 'block',
    progression: ['S1'], beats: ['off-coverage'],
    screen: { receiver: 'S1', tempo: 'quick', count: 0, blocks: [{ who: 'S2', job: 'stalk' }, { who: 'S3', job: 'crack' }] },
  },
  {
    // Now (smoke) screen to a wide receiver from 2x2: #1 steps back and
    // turns to the ball, thrown at once; #2 blocks the man over him. The
    // NFL-typical now screen: 169 of 174 are to receivers aligned 12-15 yd
    // from the ball (screen_scorecard.py WR-now); the bunch version is the
    // rare tight variant.
    id: 'wide_now_screen', name: 'Now Screen', family: 'screen', drop: 'quick',
    strong: { 1: 'go', 2: 'go', 3: 'go' }, weak: { 1: 'now_screen', 2: 'go' }, back: 'block',
    progression: ['W1'], beats: ['off-coverage'],
    // Without a run built in, the call carries a kill: press over #1 takes
    // away the cushion the screen needs, so the QB checks out of it.
    screen: { receiver: 'W1', tempo: 'quick', count: 0, kill: 'press', blocks: [{ who: 'W2', job: 'stalk' }] },
  },
  {
    // Tunnel: #1 sells a stalk block, then comes back inside; #2 stalks,
    // screen-side T and G release early. NFL tunnel receivers are +0.8 yd
    // upfield at 1.2 s and turn inside at 1.8 s (screen_wr_path_reference.py).
    id: 'tunnel_screen', name: 'Tunnel Screen', family: 'screen', drop: 'quick',
    strong: { 1: 'tunnel', 2: 'go', 3: 'go' }, weak: { 1: 'go', 2: 'go' }, back: 'block',
    progression: ['S1'], beats: ['off-coverage', 'pass-rush'],
    screen: { receiver: 'S1', tempo: 'quick', count: 1.0, receiverSell: 1.1, blocks: [{ who: 'S2', job: 'stalk' }, { who: 'T', job: 'out' }, { who: 'G', job: 'up' }, { who: 'C', job: 'in' }] },
  },
];
export const SCREEN_BY_ID: Record<string, PassConcept> = Object.fromEntries(SCREEN_CONCEPTS.map((c) => [c.id, c]));

export const PASS_BY_ID: Record<string, PassConcept> = Object.fromEntries([...BASE_PASS_CONCEPTS, ...MENU_CONCEPTS].map((c) => [c.id, c]));
export const RUN_BY_ID: Record<string, RunConcept> = Object.fromEntries(RUN_CONCEPTS.map((c) => [c.id, c]));

/** Explicit Counter installations; GH requires an off-ball H.
 * Kept outside automatic calling until its formation/response coverage is reviewed. */
export const COUNTER_VARIANTS: Record<'gt' | 'gh', RunConcept> = {
  gt: RUN_BY_ID.counter,
  gh: { ...RUN_BY_ID.counter, id: 'counter_gh', name: 'Counter GH', pullers: ['BSG', 'H'] },
};

/**
 * Run-pass options: a run called with a quick-screen tag. Before the snap the
 * QB counts the screen side: press over the screen receiver, or more
 * defenders outside than receivers to block them, means the run; otherwise
 * the screen, with the line still blocking the run (QBMind.rpoRead).
 */
export const RPO_CONCEPTS: { id: string; name: string; run: string; screen: string; formation: string }[] = [
  // Inside zone to the strength, now screen to the single-width side.
  { id: 'iz_now_rpo', name: 'Inside Zone / Now', run: 'iz_strong', screen: 'wide_now_screen', formation: 'gun_doubles_11' },
];
