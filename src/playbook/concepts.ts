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
  { id: 'iz_strong', name: 'Inside Zone', scheme: 'insideZone', direction: 'strong', aim: 'B', meshTime: 0.85, pullers: [], beats: ['even', 'light-box'] },
  { id: 'iz_weak', name: 'Inside Zone Weak', scheme: 'insideZone', direction: 'weak', aim: 'B', meshTime: 0.85, pullers: [], beats: ['even', 'light-box'] },
  { id: 'oz_strong', name: 'Outside Zone', scheme: 'outsideZone', direction: 'strong', aim: 'C', meshTime: 0.8, pullers: [], beats: ['penetrating', 'light-box'] },
  { id: 'oz_weak', name: 'Outside Zone Weak', scheme: 'outsideZone', direction: 'weak', aim: 'C', meshTime: 0.8, pullers: [], beats: ['penetrating'] },
  { id: 'power', name: 'Power', scheme: 'power', direction: 'strong', aim: 'C', meshTime: 1.0, pullers: ['BSG'], beats: ['odd', 'heavy-box'] },
  { id: 'counter', name: 'Counter', scheme: 'counter', direction: 'weak', aim: 'B', meshTime: 1.15, pullers: ['BSG', 'BST'], beats: ['flow', 'odd'] },
  { id: 'duo', name: 'Duo', scheme: 'duo', direction: 'strong', aim: 'A', meshTime: 0.9, pullers: [], beats: ['heavy-box', 'two-high'] },
  { id: 'trap', name: 'Trap', scheme: 'trap', direction: 'strong', aim: 'A', meshTime: 0.75, pullers: ['BSG'], beats: ['penetrating'] },
  { id: 'draw', name: 'Draw', scheme: 'draw', direction: 'strong', aim: 'A', meshTime: 1.35, pullers: [], beats: ['pass-rush', 'two-high'] },
  { id: 'toss', name: 'Toss', scheme: 'toss', direction: 'strong', aim: 'edge', meshTime: 0.5, pullers: [], beats: ['heavy-box', 'slow-edge'] },
];

export const PASS_BY_ID: Record<string, PassConcept> = Object.fromEntries(PASS_CONCEPTS.map((c) => [c.id, c]));
export const RUN_BY_ID: Record<string, RunConcept> = Object.fromEntries(RUN_CONCEPTS.map((c) => [c.id, c]));
