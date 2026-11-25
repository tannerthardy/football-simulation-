/**
 * Today's 32 pool concepts as compositions (CALL_COMPOSE, step 1; docs/reviews/2026-11-24-call-composition.md §6):
 * 23 are two halves (strong x weak) and 9 are full-field. Each compiles to exactly the `PassConcept` concepts.ts
 * defines (test/call-compose.test.ts), so with the flag on nothing is called or run differently. The non-route fields
 * (drop, progression, needs, beats, read) are carried as they stand; step 3 derives the reads from the halves' plans.
 */
import type { PassConcept } from '../types.js';
import { FULL_BY_ID, HALF_BY_ID } from './halves.js';
import type { BackJob, Composition, Tag } from './types.js';

const STAY: BackJob = { stay: true };
const CHECK: BackJob = { release: 'check' };
const route = (r: string): BackJob => ({ release: 'check', route: r });
const tag = (who: Tag['who'], r: string): Tag => ({ who, route: r });

export const BASE_COMPOSITIONS: Composition[] = [
  // ------------------------------------------------------------ quick game
  {
    id: 'slant_flat', name: 'Slant-Flat', family: 'quick', drop: 'quick',
    routes: { strong: 'slant_flat', weak: 'slant_flat' }, tags: [tag('S3', 'hook')], back: STAY,
    progression: ['S1', 'S2', 'W1', 'W2', 'S3'], needs: ['S1', 'S2'], beats: ['cover3', 'man', 'blitz'],
  },
  {
    id: 'stick', name: 'Stick', family: 'quick', drop: 'gun3',
    routes: { strong: 'stick', weak: 'slant_stick' }, back: CHECK,
    progression: ['S2', 'S3', 'W1', 'W2', 'B'], needs: ['S2', 'S3'], backThree: 'back_flat', beats: ['cover3', 'cover4', 'zone'],
  },
  {
    id: 'quick_outs', name: 'Speed Outs', family: 'quick', drop: 'quick',
    routes: { strong: 'quick_out_hitch', weak: 'quick_out_hitch' }, tags: [tag('S3', 'seam')], back: STAY,
    progression: ['S1', 'W1', 'S2', 'W2'], needs: ['S1', 'S2'], beats: ['cover3', 'off-man', 'cover4'],
  },
  {
    id: 'hitches', name: 'All Hitch', family: 'quick', drop: 'gun3',
    routes: { strong: 'hitches', weak: 'hitches' }, tags: [tag('S3', 'hook')], back: CHECK,
    progression: ['S1', 'W1', 'S2', 'W2', 'B'], needs: ['S1', 'W1'], beats: ['cover3', 'cover4', 'off-man'],
  },
  // ------------------------------------------------------------ dropback
  {
    id: 'smash', name: 'Smash', family: 'dropback', drop: 'gun5',
    routes: { strong: 'smash', weak: 'smash' }, tags: [tag('S3', 'hook')], back: CHECK,
    progression: ['S2', 'S1', 'W2', 'W1', 'B'], needs: ['S1', 'S2'], beats: ['cover2', 'cover4'],
  },
  {
    id: 'curl_flat', name: 'Curl-Flat', family: 'dropback', drop: 'gun5',
    routes: { strong: 'curl_flat', weak: 'curl_flat' }, tags: [tag('S3', 'hook')], back: CHECK,
    progression: ['S1', 'S2', 'W1', 'W2', 'B'], needs: ['S1', 'S2'], beats: ['cover3', 'cover2'],
  },
  {
    id: 'mesh', name: 'Mesh', family: 'dropback', drop: 'gun5',
    routes: { full: 'mesh' }, back: route('swing'),
    progression: ['S2', 'W2', 'S1', 'B', 'S3'], needs: ['S2', 'W2'], beats: ['man', 'cover1', 'zone'],
  },
  {
    id: 'four_verts', name: 'Four Verticals', family: 'dropback', drop: 'gun5',
    routes: { full: 'four_verts' }, back: CHECK,
    progression: ['S2', 'W2', 'S1', 'W1', 'B'], needs: ['S2', ['W2', 'S3']], beats: ['cover3', 'cover1'],
  },
  {
    id: 'flood', name: 'Flood', family: 'dropback', drop: 'gun5',
    routes: { strong: 'flood', weak: 'dig_shallow' }, back: CHECK,
    progression: ['S2', 'S3', 'S1', 'W1', 'B'], needs: ['S2', 'S3'], backThree: 'back_flat', beats: ['cover3', 'zone'],
  },
  {
    id: 'dagger', name: 'Dagger', family: 'dropback', drop: 'five',
    routes: { strong: 'dagger', weak: 'go_hook' }, back: CHECK,
    progression: ['S1', 'S2', 'W2', 'B'], needs: ['S1', 'S2'], beats: ['cover3', 'cover1', 'zone'],
  },
  {
    id: 'drive', name: 'Drive', family: 'dropback', drop: 'gun5',
    routes: { full: 'drive' }, back: CHECK,
    progression: ['W2', 'S2', 'B', 'S1'], needs: ['S2', 'W2'], beats: ['man', 'cover1', 'cover3'],
  },
  {
    id: 'y_cross', name: 'Y-Cross', family: 'dropback', drop: 'five',
    routes: { full: 'y_cross' }, back: CHECK,
    progression: ['S2', 'S3', 'W1', 'B'], needs: ['S2', 'S3'], beats: ['cover3', 'man'],
  },
  {
    id: 'levels', name: 'Levels', family: 'dropback', drop: 'gun5',
    routes: { strong: 'levels_outside_deep', weak: 'go_hook' }, tags: [tag('S3', 'seam')], back: CHECK,
    progression: ['S1', 'S2', 'W2', 'B'], needs: ['S1', 'S2'], beats: ['cover4', 'cover3'],
  },
  {
    id: 'comebacks', name: 'Comebacks', family: 'dropback', drop: 'seven',
    routes: { strong: 'comeback_dig', weak: 'comeback_seam' }, tags: [tag('S3', 'hook')], back: CHECK,
    progression: ['S1', 'W1', 'S2', 'B'], needs: ['S1', 'W1'], beats: ['cover3', 'off-man'],
  },
  // ------------------------------------------------------------ play action
  {
    id: 'pa_post_dig', name: 'PA Post-Dig', family: 'playaction', drop: 'pa', fake: 'insideZone', teBlock: true,
    routes: { full: 'pa_post_dig' }, back: STAY,
    progression: ['S1', 'W1', 'S2'], needs: ['S1', 'W1'], beats: ['cover3', 'cover1', 'run-heavy'],
  },
  {
    id: 'pa_flood', name: 'PA Flood', family: 'playaction', drop: 'pa', fake: 'outsideZone',
    routes: { full: 'pa_flood' }, back: route('back_flat'),
    progression: ['S2', 'W1', 'S3', 'B'], needs: ['S2', 'S3'], backThree: 'back_flat', beats: ['cover3', 'run-heavy'],
  },
  {
    id: 'pa_shot', name: 'PA Shot', family: 'playaction', drop: 'pa', fake: 'insideZone', teBlock: true,
    routes: { full: 'pa_shot' }, back: STAY,
    progression: ['S2', 'S1', 'W1'], needs: ['S2', 'W2'], beats: ['cover1', 'cover3', 'run-heavy'],
  },
];

export const MENU_COMPOSITIONS: Composition[] = [
  {
    id: 'double_slants', name: 'Double Slants', family: 'quick', drop: 'quick',
    routes: { strong: 'double_slants', weak: 'go_hitch' }, back: STAY,
    progression: ['S2', 'S1', 'S3', 'W2'], needs: ['S1', 'S2', 'S3'], beats: ['cover3', 'man', 'blitz'],
    read: 'the hook defender over #2: he widens under #2: #1 slant behind him; he holds: #2 slant; he drops: #3 flat',
  },
  {
    id: 'fade_flat', name: 'Fade-Flat', family: 'dropback', drop: 'gun3',
    routes: { strong: 'fade_flat', weak: 'hitch_go' }, tags: [tag('S3', 'hitch')], back: CHECK,
    progression: ['S1', 'S2', 'S3', 'W1', 'B'], needs: ['S1', 'S2'], beats: ['cover2', 'man'],
    read: 'the flat (cloud) corner: he sinks with #1: #2 flat; he squats on the flat: #1 fade in the hole',
  },
  {
    id: 'hitch_post', name: 'Hitch-Post', family: 'dropback', drop: 'gun5',
    routes: { strong: 'hitch_post', weak: 'go_hitch' }, back: route('angle'),
    progression: ['S2', 'S1', 'S3', 'W2', 'B'], needs: ['S1', 'S2'], beats: ['cover3', 'cover1'],
    read: 'the middle-of-field safety: he stays over the post: #1 hitch; he widens or jumps a seam: #2 post',
  },
  {
    id: 'double_outs', name: 'Double Outs', family: 'dropback', drop: 'gun5',
    routes: { strong: 'double_outs', weak: 'hitch_out' }, back: route('angle'),
    progression: ['S2', 'S1', 'S3', 'W1', 'B'], needs: ['S1', 'S2'], beats: ['cover3', 'cover1'],
    read: 'the curl-flat defender: he drops under #1: #2 quick out; he jumps #2: #1 out behind him',
  },
  {
    id: 'hitch_out', name: 'Hitch-Out', family: 'quick', drop: 'gun3',
    routes: { strong: 'hitch_quick_out', weak: 'slant_hitch' }, back: route('back_out'),
    progression: ['S2', 'S1', 'S3', 'W1', 'B'], needs: ['S1', 'S2'], beats: ['cover3', 'cover4'],
    read: 'the apex (flat) defender: he widens to the out: #1 hitch inside him; he sits on the hitch: #2 out',
  },
  {
    id: 'seam_slant', name: 'Seam-Slant', family: 'quick', drop: 'quick',
    routes: { strong: 'seam_slant', weak: 'slant_go' }, back: STAY,
    progression: ['S2', 'W1', 'S3', 'S1'], needs: ['S2', 'S3'], beats: ['cover1', 'cover3', 'blitz'],
    read: 'the hook defender inside #2: he widens to the slant: #3 hitch; he stays inside: #2 slant; man: the slant with leverage',
  },
  {
    id: 'hitch_cross', name: 'Hitch-Cross', family: 'dropback', drop: 'gun5',
    routes: { full: 'hitch_cross' }, back: route('back_out'),
    progression: ['S2', 'W2', 'S1', 'S3', 'B'], needs: ['S1', 'S2', 'W2'], beats: ['cover1', 'cover3'],
    read: 'the Mike (hook-middle): he carries the cross: the weak shallow under him, then #1 hitch; he sits: the cross past him; man: the crosser away from leverage',
  },
  {
    id: 'post_cross', name: 'Post-Cross', family: 'dropback', drop: 'gun5',
    routes: { full: 'post_cross' }, back: STAY,
    progression: ['S1', 'S2', 'W2', 'S3'], needs: ['S1', 'S2'], beats: ['cover3', 'cover1'],
    read: 'the middle-of-field safety: he stays on the post: #2 cross under him; he drives on the cross: #1 post',
  },
  {
    id: 'sail_corner', name: 'Corner-Out', family: 'dropback', drop: 'gun5',
    routes: { strong: 'corner_out', weak: 'hitch_go' }, back: CHECK,
    progression: ['S1', 'S2', 'S3', 'W1', 'B'], needs: ['S1', 'S2'], beats: ['cover2', 'cover4'],
    read: 'the squat (flat) corner: he sinks under the corner: #2 out; he squats on the out: #1 corner',
  },
  {
    id: 'corner_flat', name: 'Corner-Flat', family: 'dropback', drop: 'gun5',
    routes: { strong: 'corner_flat', weak: 'slant_hitch' }, back: CHECK,
    progression: ['S1', 'S2', 'S3', 'W1', 'B'], needs: ['S1', 'S2'], beats: ['cover2', 'cover3'],
    read: 'the flat defender: he sinks under the corner: #2 flat; he jumps the flat: #1 corner',
  },
  {
    id: 'trips_stick', name: 'Trips Hitch-Flat', family: 'quick', drop: 'gun3',
    routes: { strong: 'trips_hitch_flat', weak: 'go' }, back: route('angle'),
    progression: ['S3', 'S2', 'S1', 'W1', 'B'], needs: ['S2', 'S3'], beats: ['cover3', 'cover4'],
    read: 'the curl-flat (apex) defender over #2/#3: he widens to the flat: #2 hitch; he sits: #3 flat',
  },
  {
    id: 'trips_sail', name: 'Trips Sail', family: 'dropback', drop: 'gun5',
    routes: { strong: 'trips_sail', weak: 'hitches' }, back: route('back_out'),
    progression: ['S2', 'S3', 'S1', 'W1', 'B'], needs: ['S2', 'S3'], beats: ['cover3'],
    read: 'the curl-flat defender: he widens under the out: #3 hitch inside; he sits: #2 out',
  },
  {
    id: 'seam_hitch', name: 'Seam-Hitch', family: 'dropback', drop: 'gun3',
    routes: { strong: 'seam_hitch', weak: 'hitch_seam' }, back: route('wheel'),
    progression: ['S2', 'S1', 'S3', 'W2', 'B'], needs: ['S1', 'S2'], beats: ['cover3', 'cover1'],
    read: 'the middle-of-field safety: he works to the seam: the hitches under; he stays middle: the seam outside his leverage',
  },
  {
    id: 'trips_outs', name: 'Trips Outs', family: 'dropback', drop: 'gun5',
    routes: { strong: 'trips_outs', weak: 'hitch_go' }, back: STAY,
    progression: ['S2', 'S3', 'S1', 'W1'], needs: ['S2', 'S3'], beats: ['cover3', 'cover1'],
    read: 'the curl-flat defender: he sinks under #2: #3 quick out; he jumps #3: #2 out',
  },
  {
    id: 'verts_hitch', name: 'Verticals-Hitch', family: 'dropback', drop: 'gun5',
    routes: { strong: 'verts_hitch', weak: 'go_hitch' }, back: CHECK,
    progression: ['S2', 'S3', 'W2', 'S1', 'B'], needs: ['S2', 'S3'], beats: ['cover3', 'cover1'],
    read: 'the middle-of-field safety: he stays middle: #2 seam; he shades to #2: #3 hitch under the seam, then the backside seam',
  },
];

/** The back's job as today's `PassConcept.back` string. */
function backString(b: BackJob): string {
  if ('stay' in b) return 'block';
  if (b.release !== 'check') throw new Error(`CALL_COMPOSE step 1: the back's '${b.release}' release is step 2's`);
  return b.route ?? 'check';
}

/** Compile a composition to the `PassConcept` the engine runs. Fresh route objects, so later install passes
 * (QUICK_HITCH's hitch swap) never write into the shared half tables. */
export function compileComposition(c: Composition): PassConcept {
  let strong: PassConcept['strong'], weak: PassConcept['weak'];
  if ('full' in c.routes) {
    const f = FULL_BY_ID[c.routes.full];
    if (!f) throw new Error(`unknown full-field concept ${c.routes.full}`);
    strong = { ...f.strong }; weak = { ...f.weak };
  } else {
    const s = HALF_BY_ID[c.routes.strong], w = HALF_BY_ID[c.routes.weak];
    if (!s || !w) throw new Error(`unknown half ${!s ? c.routes.strong : c.routes.weak}`);
    strong = { ...s.routes }; weak = { ...w.routes };
  }
  for (const t of c.tags ?? []) {
    const side = t.who[0] === 'S' ? strong : t.who[0] === 'W' ? weak : null;
    if (!side) throw new Error(`a tag names a receiver by side and number, not ${t.who}`);
    side[Number(t.who.slice(1)) as 1 | 2 | 3 | 4] = t.route;
  }
  const out: PassConcept = { id: c.id, name: c.name, family: c.family, drop: c.drop, strong, weak, back: backString(c.back), progression: [...c.progression], beats: [...c.beats] };
  if (c.teBlock !== undefined) out.teBlock = c.teBlock;
  if (c.fake !== undefined) out.fake = c.fake;
  if (c.needs !== undefined) out.needs = c.needs.map((n) => (Array.isArray(n) ? [...n] : n)) as PassConcept['needs'];
  if (c.backThree !== undefined) out.backThree = c.backThree;
  if (c.read !== undefined) out.read = c.read;
  if (c.minReceivers !== undefined) out.minReceivers = c.minReceivers;
  return out;
}
