/**
 * Pass and run concepts. Pass concepts are written against receiver numbers
 * (#1 = widest) on the strong and weak sides so each concept runs from any
 * formation, the way real offenses teach them. Receivers without an explicit
 * route run the side's default (#1 go, #2+ seam) as clear-outs.
 */
import type { PassConcept, RunConcept } from './types.js';

export const PASS_CONCEPTS: PassConcept[] = [
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
    strong: { 1: 'corner', 2: 'shallow', 3: 'hook' }, weak: { 1: 'go', 2: 'shallow_high' }, back: 'swing',
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
    screen: { receiver: 'B', tempo: 'slow', count: 1.0, receiverRelease: 0.6, blocks: [{ who: 'T', job: 'out' }, { who: 'G', job: 'up' }, { who: 'C', job: 'in' }] },
  },
  {
    // TE screen: the inline TE blocks, then slides out behind the line.
    id: 'te_screen', name: 'TE Screen', family: 'screen', drop: 'gun5',
    strong: { 1: 'go', 2: 'go', 3: 'te_screen' }, weak: { 1: 'go', 2: 'go' }, back: 'block',
    progression: ['S3', 'S2'], beats: ['pass-rush'],
    screen: { receiver: 'S3', tempo: 'slow', count: 1.0, blocks: [{ who: 'T', job: 'out' }, { who: 'G', job: 'up' }, { who: 'C', job: 'in' }] },
  },
  {
    // Bubble to the trips slot: #1 stalks, #3 blocks inside-out on the next man.
    id: 'bubble_screen', name: 'Trips Bubble', family: 'screen', drop: 'quick',
    strong: { 1: 'go', 2: 'bubble', 3: 'go' }, weak: { 1: 'go', 2: 'go' }, back: 'block',
    progression: ['S2'], beats: ['off-coverage', 'light-box'],
    screen: { receiver: 'S2', tempo: 'quick', count: 0, blocks: [{ who: 'S1', job: 'stalk' }, { who: 'S3', job: 'crack' }] },
  },
  {
    // Bunch now screen to the point man... caught by #1 coming back; #2/#3 block.
    id: 'bunch_now_screen', name: 'Bunch Now Screen', family: 'screen', drop: 'quick',
    strong: { 1: 'now_screen', 2: 'go', 3: 'go' }, weak: { 1: 'go', 2: 'go' }, back: 'block',
    progression: ['S1'], beats: ['off-coverage'],
    screen: { receiver: 'S1', tempo: 'quick', count: 0, blocks: [{ who: 'S2', job: 'stalk' }, { who: 'S3', job: 'crack' }] },
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

export const PASS_BY_ID: Record<string, PassConcept> = Object.fromEntries(PASS_CONCEPTS.map((c) => [c.id, c]));
export const RUN_BY_ID: Record<string, RunConcept> = Object.fromEntries(RUN_CONCEPTS.map((c) => [c.id, c]));

/** Explicit Counter installations; GH requires an off-ball H.
 * Kept outside automatic calling until its formation/response coverage is reviewed. */
export const COUNTER_VARIANTS: Record<'gt' | 'gh', RunConcept> = {
  gt: RUN_BY_ID.counter,
  gh: { ...RUN_BY_ID.counter, id: 'counter_gh', name: 'Counter GH', pullers: ['BSG', 'H'] },
};
