/**
 * CALL_MIX (experimental, off; CALL_MIX=1): the coordinator's route-class
 * preference by down and distance.
 *
 * The installed caller weighted the 17 pool concepts about evenly, so 7 of the
 * 13 dropback and play-action concepts, each leading with a 10–15 yd break,
 * made up most of the menu. Our routes run were 22% HITCH-labelled (hitch,
 * curl, comeback) vs the NFL's 15%, and the breaking 10–19 yd class was 28% of
 * targets vs 11.5% (docs/reviews/2026-11-11-call-mix.md).
 *
 * A coordinator holds a reason: what he wants the ball to do in this down and
 * distance. Quick and flat throws keep him on schedule; on 3rd and long he
 * accepts the break at the sticks. Each concept's profile is the share of its
 * installed routes in each class. Its weight is multiplied by the product over
 * classes of pref[class] ^ share, so a concept is favoured as far as its routes
 * are what the situation calls for.
 *
 * The preference table is the source data in config/call-mix.json. It was
 * fitted by scripts/diag/call-mix/fit.py so the called routes-run class mix
 * matches 2022 NFL dropbacks in the same bucket (BDB 2025 weeks 1–3, route
 * label plus the runner's break depth from tracking,
 * scripts/diag/call-mix/nfl_route_depth.py). test/call-mix.test.ts keeps this
 * file equal to the config.
 *
 * SCREEN and ANGLE have no slot yet. Screens are out of the pool and no pool
 * concept gives a back an angle route; the NFL's screen routes are left out of
 * the target mix and named as the remainder. Run Game owns the screen game
 * and the back's quick releases.
 */
import { getRoute } from '../playbook/routes.js';
import type { PassConcept } from '../playbook/types.js';

export const CALL_MIX = process.env.CALL_MIX !== '0';

export type RouteClass = 'quick' | 'flat' | 'cross' | 'breaking' | 'vertical';
export const ROUTE_CLASSES: RouteClass[] = ['quick', 'flat', 'cross', 'breaking', 'vertical'];
export type CallBucket = '1st' | '2nd_short' | '2nd_med' | '2nd_long' | '3rd_short' | '3rd_med' | '3rd_long';

/** Break depth that separates a quick route from a breaking one (NFL HITCH 66%, OUT 71%, IN 42% below it). */
const BREAK_DEPTH = 8;
const BREAKING = new Set(['hitch', 'quick_hitch', 'stick', 'hook', 'curl', 'comeback', 'quick_out', 'out', 'deep_out', 'short_in', 'dig', 'slant']);
const FLAT = new Set(['flat', 'arrow', 'back_flat', 'swing', 'checkdown', 'angle']);
const CROSS = new Set(['shallow', 'shallow_high', 'mesh_under', 'cross']);

/** The class of an installed route: label family plus its break depth. */
export function routeClass(id: string): RouteClass {
  if (FLAT.has(id) || getRoute(id).depth < 0) return 'flat';
  if (CROSS.has(id)) return 'cross';
  if (BREAKING.has(id)) return getRoute(id).depth < BREAK_DEPTH ? 'quick' : 'breaking';
  return 'vertical';
}

/** Share of a concept's installed routes in each class: strong #1–3, weak #1–2 and the back. */
export function conceptProfile(c: PassConcept): Record<RouteClass, number> {
  const ids: string[] = [];
  for (const side of [c.strong, c.weak]) for (const id of Object.values(side)) if (id) ids.push(id);
  if (c.back !== 'block') ids.push(c.back === 'check' ? 'checkdown' : c.back);
  const out = { quick: 0, flat: 0, cross: 0, breaking: 0, vertical: 0 };
  for (const id of ids) out[routeClass(id)] += 1 / ids.length;
  return out;
}

export function callBucket(down: number, distance: number): CallBucket {
  if (down <= 1) return '1st';
  const d = distance <= 3 ? 'short' : distance <= 7 ? 'med' : 'long';
  return `${down === 2 ? '2nd' : '3rd'}_${d}` as CallBucket;
}

/** Generated from config/call-mix.json by scripts/diag/call-mix/fit.py --write; do not edit by hand. */
export const CALL_MIX_PREF: Record<CallBucket, Record<RouteClass, number>> = {
  '1st': { quick: 1.336, flat: 0.99, cross: 1.221, breaking: 0.613, vertical: 1.01 },
  '2nd_short': { quick: 1.477, flat: 1.127, cross: 1.419, breaking: 0.353, vertical: 1.197 },
  '2nd_med': { quick: 1.0, flat: 0.961, cross: 1.492, breaking: 0.625, vertical: 1.116 },
  '2nd_long': { quick: 2.203, flat: 0.795, cross: 0.942, breaking: 0.595, vertical: 1.02 },
  '3rd_short': { quick: 0.682, flat: 0.903, cross: 1.931, breaking: 0.703, vertical: 1.195 },
  '3rd_med': { quick: 0.94, flat: 0.785, cross: 1.662, breaking: 0.564, vertical: 1.445 },
  '3rd_long': { quick: 0.856, flat: 0.882, cross: 1.055, breaking: 1.178, vertical: 1.066 },
};

/** The coordinator's preference for this concept in this down and distance. */
export function callMixWeight(c: PassConcept, down: number, distance: number, pref = CALL_MIX_PREF): number {
  const p = pref[callBucket(down, distance)];
  const prof = conceptProfile(c);
  let w = 1;
  for (const k of ROUTE_CLASSES) if (prof[k] > 0) w *= Math.pow(p[k], prof[k]);
  return w;
}
