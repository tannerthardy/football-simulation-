/**
 * Route tree in the receiver frame: d = yards beyond the LOS, l = yards from
 * the receiver's alignment toward his own sideline (+ outside, − inside).
 * `s` is the break speed as a fraction of top speed — square breaks (outs,
 * digs) require throttling down; speed cuts (slants, posts) don't.
 */
import type { RouteDef } from './types.js';

/** BACK_PATHS (experimental, off; BACK_PATHS=1): the back's flat, angle and out on their tracked paths (see back_flat,
 * angle, back_out; BDB 2025 weeks 1-3, backs on non-PA drop-backs, scripts/diag/concepts/nfl_back_path.py). */
const BACK_PATHS = process.env.BACK_PATHS !== '0';
/** SCREEN_QB (experimental, off; behaviors/qb.ts): the tunnel's route from tracking. */
const SCREEN_QB = process.env.SCREEN_QB === '1';
/** CROSS_FLAT (experimental, off): the shallow crossers reach their depth in the first leg and run flat across, as
 * taught ("run under the linebackers, flat across"; docs/reviews/2026-11-14-crosser-depth.md). Off, the shallow
 * climbs on a diagonal from a 2.5 yd stem to 5 yd across 22 yd: still rising at 3.0 s (4.7 yd median against zone, ball
 * held) and slow across (3.2 yd from his spot at 2.0 s). NFL WR / TE crossers under 4 yd at 2.0 s (55% of crossers vs
 * zone, BDB 2025 weeks 1-6): 2.2 / 2.9 / 3.1 yd deep at 2.0 / 2.5 / 3.0 s, 5.1 yd across at 2.0 s, flat once there.
 * - shallow (the drag: drive, flood, dagger, hitch-cross, PA flood): a flatter release to 2.5 yd by 4.5 yd across,
 *   then flat ("no deeper than three yards", in front of the linebackers). The points sit half a yard under the depth
 *   he runs: following the path he carries past the corner (staged, 3.0-3.4 yd at 2.5-3.0 s).
 * - shallow_high and mesh_under (mesh's pair, which works at 4-6 yd and rubs): Y at the linebackers' toes, X just
 *   underneath him, a yard apart so they cross close enough to rub (Air Raid / Holgorsen); points at 5 and 4.
 * The deep cross is unchanged until the over's install is sourced. His freedom at the route's end is unchanged. */
const CROSS_FLAT = process.env.CROSS_FLAT === '1';
export const ROUTES: Record<string, RouteDef> = {
  // Verticals
  go: { id: 'go', family: 'deep', depth: 30, end: 'continue', points: [{ d: 4, l: 0.6 }, { d: 50, l: 1.5 }] },
  fade: { id: 'fade', family: 'deep', depth: 25, end: 'continue', points: [{ d: 3, l: 1.6 }, { d: 50, l: 3.5 }] },
  seam: { id: 'seam', family: 'deep', depth: 22, end: 'continue', points: [{ d: 4, l: -0.4 }, { d: 50, l: -1.2 }] },
  // A tagged near-safety read. Reserve the middle in the concept; this is not
  // permission for every vertical to bend into a teammate's route. Corner/sail
  // is a different install. See docs/football-handbook/receiver-route-reads.md.
  seam_read: { id: 'seam_read', family: 'deep', depth: 22, end: 'continue',
    points: [{ d: 10, l: -.4, s: .85 }, { d: 40, l: -1.2 }],
    read: { key: 'middle', depth: 8, answers: [
      { id: 'post', end: 'continue', points: [{ d: 10, l: -.4, s: .75 }, { d: 35, l: -14 }] },
      { id: 'under', end: 'continue', points: [{ d: 10, l: -.4, s: .4 }, { d: 10.5, l: -16 }] },
    ] } },
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
  flat: { id: 'flat', family: 'flat', depth: 3, end: 'continue', points: [{ d: 0, l: 2, s: 0.9 }, { d: 3.5, l: 12 }] },
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
  shallow: CROSS_FLAT
    ? { id: 'shallow', family: 'cross', depth: 3, end: 'continue', points: [{ d: 1.5, l: -2.5, s: 0.95 }, { d: 2.5, l: -4.5 }, { d: 2.75, l: -26 }] }
    : { id: 'shallow', family: 'cross', depth: 5, end: 'continue', points: [{ d: 2.5, l: -2, s: 0.9 }, { d: 5, l: -24 }] },
  shallow_high: CROSS_FLAT
    ? { id: 'shallow_high', family: 'cross', depth: 5.5, end: 'continue', points: [{ d: 2.5, l: -2, s: 0.9 }, { d: 4.5, l: -4.5 }, { d: 5, l: -26 }] }
    : { id: 'shallow_high', family: 'cross', depth: 6, end: 'continue', points: [{ d: 3, l: -2, s: 0.9 }, { d: 6.5, l: -24 }] },
  ...(CROSS_FLAT ? { mesh_under: { id: 'mesh_under', family: 'cross', depth: 4.5, end: 'continue', points: [{ d: 2, l: -2, s: 0.9 }, { d: 3.5, l: -4.5 }, { d: 4, l: -26 }] } as RouteDef } : {}),
  cross: { id: 'cross', family: 'cross', depth: 14, end: 'continue', points: [{ d: 6, l: -1, s: 0.9 }, { d: 14, l: -16, s: 0.85 }, { d: 18, l: -34 }] },
  // Backs
  swing: { id: 'swing', family: 'back', depth: 0, end: 'continue', points: [{ d: -1.5, l: 4, s: 0.9 }, { d: -0.5, l: 9, s: 0.9 }, { d: 3, l: 13 }] },
  checkdown: { id: 'checkdown', family: 'back', depth: 4, end: 'settle', points: [{ d: 0.5, l: 1, s: 0.8 }, { d: 4.5, l: -1, s: 0 }] },
  // BACK_PATHS: NFL backs' ANGLE (n 429) is still 3.6 yd behind the line at 1.5 s and at it by 2.5 s, 2.4-3.0 yd wide,
  // caught at a median +3 yd; off, the break is 1.5 yd past the line and the catch +4.4.
  angle: BACK_PATHS
    ? { id: 'angle', family: 'back', depth: 3, end: 'continue', points: [{ d: 0, l: 3, s: 0.45 }, { d: 3.5, l: -6 }] }
    : { id: 'angle', family: 'back', depth: 4, end: 'continue', points: [{ d: 1.5, l: 3.5, s: 0.45 }, { d: 5, l: -6 }] },
  // BACK_PATHS: the back's flat is run behind the line, widening, and climbs only late (NFL FLAT routes by backs on
  // non-PA drop-backs, BDB 2025 weeks 1-3, n 968: depth -4.6 / -4.6 / -4.4 / -3.7 yd at 1.0 / 1.5 / 2.0 / 2.5 s, width
  // from the ball 3.6 / 5.4 / 7.7 / 10.3 yd; caught at a median -1.0 yd, 56% behind the line). Off: to the line at once.
  back_flat: BACK_PATHS
    ? { id: 'back_flat', family: 'back', depth: -2, end: 'continue', pace: 0.55, points: [{ d: -4.5, l: 3, s: 0.9 }, { d: -4.2, l: 7, s: 0.9 }, { d: -3.5, l: 10 }, { d: -1.5, l: 13 }] }
    : { id: 'back_flat', family: 'back', depth: 1, end: 'continue', points: [{ d: 0, l: 4, s: 0.9 }, { d: 2, l: 12 }] },
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
  // Bubble: drift back and out behind the line, caught ~4 yd outside his
  // alignment ~2 yd behind the line, then turn upfield. NFL out-breaking WR
  // screens: 0.8 yd back and 1.5 yd out at the throw, caught 4.1 yd out
  // (screen_wr_path_reference.py, quick_screen_reference.py).
  bubble: { id: 'bubble', family: 'flat', depth: -2, end: 'continue', points: [{ d: -2, l: 1.5, s: 0.35 }, { d: -2, l: 4, s: 0.6 }, { d: 0, l: 6 }] },
  // Now screen: a step back and a little outside, turned to the ball at once,
  // so his blockers release upfield past him rather than into him. NFL now
  // screens are caught 0.4 yd outside his alignment, 1.8 yd behind the line
  // (zone), the receiver having moved 0.8 yd by the throw
  // (screen_wr_path_reference.py, quick_screen_reference.py).
  now_screen: { id: 'now_screen', family: 'flat', depth: -2, end: 'settle', points: [{ d: -2, l: 0.7, s: 0 }] },
  // Tunnel: after his stalk sell (ScreenSpec.receiverSell) the outside
  // receiver retraces back inside, caught ~3 yd inside his alignment just
  // behind the line, still moving, with his released linemen in front.
  // NFL in-breaking WR screens: turn inside at 1.8 s, caught 3.1 yd inside
  // and 0.6 yd behind the line (screen_wr_path_reference.py,
  // quick_screen_reference.py).
  // SCREEN_QB: from tracking (screen_tunnel_path.py, BDB 2025 WR-in screens, n 23): after the sell he comes back
  // under it, 0.8 yd behind the line and 1.5 inside at 2.0 s, and catches it 1.3 behind and 2.5 inside his start
  // (off: caught at the line, 3 inside).
  tunnel: SCREEN_QB
    ? { id: 'tunnel', family: 'flat', depth: -1.3, end: 'continue', points: [{ d: -0.8, l: -1.5, s: 0.5 }, { d: -1.3, l: -2.5, s: 0.45 }, { d: 0, l: -4.5 }] }
    : { id: 'tunnel', family: 'flat', depth: -0.7, end: 'continue', points: [{ d: -0.3, l: -1.5, s: 0.5 }, { d: -0.7, l: -3, s: 0.45 }, { d: 0, l: -5 }] },
  /** The back's out: a short release to 4-5 yd, then flat to the sideline (NFL back OUT, 7.4% of drop-backs). */
  // BACK_PATHS: NFL backs' OUT (n 204) is 2.9 yd behind the line at 1.5 s and +0.8 at 2.5 s, 3.1-5.5 yd wide, caught
  // at a median +2 yd; off, he is out at 4.5 yd and caught at +5.3.
  back_out: BACK_PATHS
    ? { id: 'back_out', family: 'back', depth: 2, end: 'continue', points: [{ d: 0, l: 2, s: 0.8 }, { d: 2, l: 4, s: 0.5 }, { d: 2, l: 14 }] }
    : { id: 'back_out', family: 'back', depth: 4, end: 'continue', points: [{ d: 2, l: 2, s: 0.8 }, { d: 4.5, l: 4, s: 0.5 }, { d: 4.5, l: 14 }] },
  wheel: { id: 'wheel', family: 'back', depth: 18, end: 'continue', points: [{ d: 0, l: 5, s: 0.85 }, { d: 4, l: 10, s: 0.75 }, { d: 40, l: 11.5 }] },
};

export function getRoute(id: string): RouteDef {
  const r = ROUTES[id];
  if (!r) throw new Error(`Unknown route: ${id}`);
  return r;
}
