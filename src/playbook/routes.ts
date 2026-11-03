/**
 * Route tree in the receiver frame: d = yards beyond the LOS, l = yards from
 * the receiver's alignment toward his own sideline (+ outside, − inside).
 * `s` is the break speed as a fraction of top speed — square breaks (outs,
 * digs) require throttling down; speed cuts (slants, posts) don't.
 */
import type { RouteDef } from './types.js';

export const ROUTES: Record<string, RouteDef> = {
  // Verticals
  go: { id: 'go', family: 'deep', depth: 30, end: 'continue', points: [{ d: 4, l: 0.6 }, { d: 50, l: 1.5 }] },
  fade: { id: 'fade', family: 'deep', depth: 25, end: 'continue', points: [{ d: 3, l: 1.6 }, { d: 50, l: 3.5 }] },
  seam: { id: 'seam', family: 'deep', depth: 22, end: 'continue', points: [{ d: 4, l: -0.4 }, { d: 50, l: -1.2 }] },
  // Quick game
  hitch: { id: 'hitch', family: 'quick', depth: 5, end: 'settle', points: [{ d: 6, l: 0, s: 0.2 }, { d: 5, l: 0.3, s: 0 }] },
  // Three-step slant: break at 45°, then flatten across the field if not thrown.
  slant: { id: 'slant', family: 'quick', depth: 6, end: 'continue', points: [{ d: 2, l: 0, s: 0.75 }, { d: 6.5, l: -4.5 }, { d: 8.5, l: -12 }] },
  quick_out: { id: 'quick_out', family: 'quick', depth: 5, end: 'continue', points: [{ d: 5, l: 0, s: 0.4 }, { d: 5, l: 9, s: 0.9 }] },
  stick: {
    id: 'stick', family: 'quick', depth: 6, end: 'sitVsZone',
    points: [{ d: 6, l: 0, s: 0.25 }, { d: 5.5, l: -0.6, s: 0 }],
    vsMan: [{ d: 6, l: 0, s: 0.4 }, { d: 6, l: 9, s: 0.9 }],
  },
  flat: { id: 'flat', family: 'flat', depth: 3, end: 'continue', points: [{ d: 1.5, l: 2, s: 0.9 }, { d: 3.5, l: 12 }] },
  arrow: { id: 'arrow', family: 'flat', depth: 4, end: 'continue', points: [{ d: 4, l: 5, s: 0.9 }, { d: 6, l: 14 }] },
  // Intermediate
  out: { id: 'out', family: 'intermediate', depth: 10, end: 'continue', points: [{ d: 10, l: 0, s: 0.4 }, { d: 9.5, l: 12, s: 0.9 }] },
  dig: { id: 'dig', family: 'intermediate', depth: 12, end: 'continue', points: [{ d: 12, l: 0, s: 0.4 }, { d: 12.5, l: -24 }] },
  curl: { id: 'curl', family: 'intermediate', depth: 11, end: 'settle', points: [{ d: 12.5, l: 0, s: 0.2 }, { d: 11, l: -1.5, s: 0 }] },
  comeback: { id: 'comeback', family: 'intermediate', depth: 14, end: 'settle', points: [{ d: 16, l: 0, s: 0.25 }, { d: 13.5, l: 3, s: 0 }] },
  hook: {
    id: 'hook', family: 'intermediate', depth: 7, end: 'sitVsZone',
    points: [{ d: 7.5, l: -0.5, s: 0.25 }, { d: 6.5, l: -1.2, s: 0 }],
    vsMan: [{ d: 7, l: 0, s: 0.4 }, { d: 7, l: -10, s: 0.9 }],
  },
  short_in: { id: 'short_in', family: 'quick', depth: 5, end: 'continue', points: [{ d: 5, l: 0, s: 0.45 }, { d: 5.5, l: -16 }] },
  // Deep breaking
  post: { id: 'post', family: 'deep', depth: 22, end: 'continue', points: [{ d: 12, l: 0, s: 0.7 }, { d: 40, l: -16 }] },
  corner: { id: 'corner', family: 'deep', depth: 18, end: 'continue', points: [{ d: 11, l: 0, s: 0.65 }, { d: 24, l: 11 }, { d: 34, l: 14 }] },
  deep_out: { id: 'deep_out', family: 'intermediate', depth: 14, end: 'continue', points: [{ d: 14, l: 0, s: 0.4 }, { d: 13.5, l: 12, s: 0.9 }] },
  // Crossers
  shallow: { id: 'shallow', family: 'cross', depth: 5, end: 'continue', points: [{ d: 2.5, l: -2, s: 0.9 }, { d: 5, l: -24 }] },
  shallow_high: { id: 'shallow_high', family: 'cross', depth: 6, end: 'continue', points: [{ d: 3, l: -2, s: 0.9 }, { d: 6.5, l: -24 }] },
  cross: { id: 'cross', family: 'cross', depth: 14, end: 'continue', points: [{ d: 6, l: -1, s: 0.9 }, { d: 14, l: -16, s: 0.85 }, { d: 18, l: -34 }] },
  // Backs
  swing: { id: 'swing', family: 'back', depth: 0, end: 'continue', points: [{ d: -1.5, l: 4, s: 0.9 }, { d: -0.5, l: 9, s: 0.9 }, { d: 3, l: 13 }] },
  checkdown: { id: 'checkdown', family: 'back', depth: 4, end: 'settle', points: [{ d: 0.5, l: 1, s: 0.8 }, { d: 4.5, l: -1, s: 0 }] },
  angle: { id: 'angle', family: 'back', depth: 4, end: 'continue', points: [{ d: 1.5, l: 3.5, s: 0.45 }, { d: 5, l: -6 }] },
  back_flat: { id: 'back_flat', family: 'back', depth: 1, end: 'continue', points: [{ d: 0, l: 4, s: 0.9 }, { d: 2, l: 12 }] },
  // Screens (docs/football-handbook/screens.md). Caught behind the line.
  // Slip: after selling his block the back drifts wide behind the traffic and
  // settles outside the screen-side tackle, ~3.5 yd behind the line. NFL slip
  // backs stay 3.5-4.5 yd deep and are ~6.7 yd from the ball at the throw,
  // ~3 yd from the nearest body (screen_back_reference.py); climbing toward
  // the line puts him in the rush.
  slip_screen: { id: 'slip_screen', family: 'back', depth: -3.5, end: 'settle', points: [{ d: -4.5, l: 2.5, s: 0.7 }, { d: -3.5, l: 6, s: 0 }] },
  // TE screen: release flat behind the line after his block, settle outside.
  te_screen: { id: 'te_screen', family: 'back', depth: -2, end: 'settle', points: [{ d: -1.5, l: 1.5, s: 0.6 }, { d: -2.5, l: 3.5, s: 0 }] },
  // Bubble: gain a little depth, turn the head back, and be going downhill by
  // the third step; caught in stride facing upfield.
  bubble: { id: 'bubble', family: 'flat', depth: -1, end: 'continue', points: [{ d: -1.5, l: 2, s: 0.9 }, { d: -1, l: 4.5, s: 0.9 }, { d: 2, l: 7 }] },
  // Now screen: one step upfield, then back to the ball behind the line.
  now_screen: { id: 'now_screen', family: 'flat', depth: -1, end: 'settle', points: [{ d: 1, l: 0, s: 0.3 }, { d: -1, l: -0.5, s: 0 }] },
  // Tunnel: the outside receiver comes back inside behind the line.
  tunnel: { id: 'tunnel', family: 'flat', depth: -1, end: 'continue', points: [{ d: 1, l: 0, s: 0.4 }, { d: -1, l: -3.5, s: 0.9 }, { d: 1, l: -6 }] },
  wheel: { id: 'wheel', family: 'back', depth: 18, end: 'continue', points: [{ d: 0, l: 5, s: 0.85 }, { d: 4, l: 10, s: 0.75 }, { d: 40, l: 11.5 }] },
};

export function getRoute(id: string): RouteDef {
  const r = ROUTES[id];
  if (!r) throw new Error(`Unknown route: ${id}`);
  return r;
}
