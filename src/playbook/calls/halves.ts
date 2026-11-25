/**
 * The half-field and full-field concept tables (CALL_COMPOSE; docs/reviews/2026-11-24-call-composition.md §3, §6).
 * A half is one side's concept on receiver numbers (#1 = widest). An extra receiver on that side gets his route from
 * the composition's tags. A full-field concept keeps both sides, because it reads across the field by design.
 * Step 1 holds exactly the sides today's 32 concepts use, so each composition compiles to today's concept. Where two
 * real versions of a half exist, both are named and neither is the core (user decision 2026-11-24; step 2 adds them).
 */
import type { FullConcept, HalfConcept } from './types.js';

const half = (id: string, name: string, routes: HalfConcept['routes']): HalfConcept => ({ id, name, routes });

export const HALF_CONCEPTS: HalfConcept[] = [
  // quick game
  half('slant_flat', 'Slant-Flat', { 1: 'slant', 2: 'flat' }),
  half('stick', 'Stick', { 1: 'go', 2: 'stick', 3: 'flat' }),
  half('slant_stick', 'Slant-Stick', { 1: 'slant', 2: 'stick' }),
  half('quick_out_hitch', 'Speed Out-Hitch', { 1: 'quick_out', 2: 'hitch' }),
  half('hitches', 'Hitches', { 1: 'hitch', 2: 'hitch' }),
  half('double_slants', 'Double Slants', { 1: 'slant', 2: 'slant', 3: 'flat' }),
  half('hitch_quick_out', 'Hitch-Out (trips)', { 1: 'hitch', 2: 'quick_out', 3: 'hitch' }),
  half('seam_slant', 'Seam-Slant (trips)', { 1: 'go', 2: 'slant', 3: 'hitch' }),
  half('trips_hitch_flat', 'Trips Hitch-Flat', { 1: 'hitch', 2: 'hitch', 3: 'flat' }),
  // dropback
  half('smash', 'Smash', { 1: 'hitch', 2: 'corner' }),
  half('curl_flat', 'Curl-Flat', { 1: 'curl', 2: 'flat' }),
  half('flood', 'Flood', { 1: 'go', 2: 'out', 3: 'flat' }),
  half('dagger', 'Dagger', { 1: 'dig', 2: 'seam', 3: 'shallow' }),
  // Levels: two named versions, neither the core (user decision 2026-11-24). Outside deep in: the outside receiver on the
  // dig, the slot on the short in (today's). Outside short in: the outside receiver on the 5 yd in, the slot on the 10-12
  // yd square-in ("Peyton's favorite pass play: levels", Chris Brown). Called by NFL share (CALL_COMPOSE step 2).
  half('levels_outside_deep', 'Levels (outside deep in)', { 1: 'dig', 2: 'short_in' }),
  half('levels_outside_short', 'Levels (outside short in)', { 1: 'short_in', 2: 'dig' }),
  half('comeback_dig', 'Comeback-Dig', { 1: 'comeback', 2: 'dig' }),
  half('fade_flat', 'Fade-Flat', { 1: 'go', 2: 'flat' }),
  half('hitch_post', 'Hitch-Post', { 1: 'hitch', 2: 'post', 3: 'flat' }),
  half('double_outs', 'Double Outs', { 1: 'out', 2: 'quick_out', 3: 'hitch' }),
  half('corner_out', 'Corner-Out', { 1: 'corner', 2: 'quick_out', 3: 'hitch' }),
  half('corner_flat', 'Corner-Flat', { 1: 'corner', 2: 'flat', 3: 'hitch' }),
  half('trips_sail', 'Trips Sail', { 1: 'go', 2: 'out', 3: 'hitch' }),
  half('seam_hitch', 'Seam-Hitch (trips)', { 1: 'hitch', 2: 'seam', 3: 'hitch' }),
  half('trips_outs', 'Trips Outs', { 1: 'go', 2: 'out', 3: 'quick_out' }),
  half('verts_hitch', 'Verticals-Hitch (trips)', { 1: 'go', 2: 'seam', 3: 'hitch' }),
  // backside halves
  half('slant_go', 'Slant-Go', { 1: 'slant', 2: 'go' }),
  half('slant_hitch', 'Slant-Hitch', { 1: 'slant', 2: 'hitch' }),
  half('dig_shallow', 'Dig-Shallow', { 1: 'dig', 2: 'shallow' }),
  half('go_hook', 'Go-Hook', { 1: 'go', 2: 'hook' }),
  half('go_hitch', 'Go-Hitch', { 1: 'go', 2: 'hitch' }),
  half('hitch_go', 'Hitch-Go', { 1: 'hitch', 2: 'go' }),
  half('hitch_out', 'Hitch-Out', { 1: 'hitch', 2: 'out' }),
  half('hitch_seam', 'Hitch-Seam', { 1: 'hitch', 2: 'seam' }),
  half('comeback_seam', 'Comeback-Seam', { 1: 'comeback', 2: 'seam' }),
  half('go', 'Go (single receiver)', { 1: 'go' }),
];

const full = (id: string, name: string, strong: FullConcept['strong'], weak: FullConcept['weak']): FullConcept => ({ id, name, strong, weak });

export const FULL_CONCEPTS: FullConcept[] = [
  // CROSS_FLAT: mesh's under crosser is its own route, a yard under the Y (routes.ts), not the drag.
  full('mesh', 'Mesh', { 1: 'corner', 2: process.env.CROSS_FLAT !== '0' ? 'mesh_under' : 'shallow', 3: 'hook' }, { 1: 'go', 2: 'shallow_high' }),
  full('four_verts', 'Four Verticals', { 1: 'go', 2: 'seam', 3: 'seam' }, { 1: 'go', 2: 'seam' }),
  full('drive', 'Drive', { 1: 'go', 2: 'dig' }, { 1: 'go', 2: 'shallow' }),
  full('y_cross', 'Y-Cross', { 1: 'go', 2: 'cross', 3: 'flat' }, { 1: 'post', 2: 'hook' }),
  full('hitch_cross', 'Hitch-Cross', { 1: 'hitch', 2: 'cross', 3: 'flat' }, { 1: 'go', 2: 'shallow' }),
  full('post_cross', 'Post-Cross', { 1: 'post', 2: 'cross', 3: 'hitch' }, { 1: 'go', 2: 'hitch' }),
  full('pa_post_dig', 'PA Post-Dig', { 1: 'post', 2: 'dig' }, { 1: 'dig', 2: 'hook' }),
  full('pa_flood', 'PA Flood', { 1: 'go', 2: 'deep_out', 3: 'flat' }, { 1: 'cross', 2: 'shallow' }),
  full('pa_shot', 'PA Shot', { 1: 'go', 2: 'post' }, { 1: 'post', 2: 'dig' }),
];

export const HALF_BY_ID: Record<string, HalfConcept> = Object.fromEntries(HALF_CONCEPTS.map((h) => [h.id, h]));
export const FULL_BY_ID: Record<string, FullConcept> = Object.fromEntries(FULL_CONCEPTS.map((f) => [f.id, f]));
