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
/** FLAT_SHAPE (experimental, off; src/sim/route-motion.ts): the back's flat as taught (see back_flat). */
const FLAT_SHAPE = process.env.FLAT_SHAPE === '1';
/** ROUTE_EFFORT (experimental, off; src/sim/route-motion.ts): every route's stem at full pace, with the break table below. */
const ROUTE_EFFORT = process.env.ROUTE_EFFORT === '1';
/** ROUTE_FILLET (experimental, off; src/sim/route-motion.ts): the break table's cut / roll column applies with it. */
const ROUTE_FILLET = process.env.ROUTE_FILLET !== '0';
/** CROSS_OVER (experimental, off): the deep cross (the over, Y-cross) released inside on a diagonal, "inside of the
 * Sam LB, and over the Mike LB", to its "landmark ... 18-22 yards" (Throw Deep, Y Cross; Shanahan's 1994 dover breaks in
 * at about 20). Off, it climbs 6 yd nearly straight up (1 yd inside) before crossing: 1.2 yd across at 2.0 s against
 * the NFL's 3.6 (crossers 4-8 yd deep at 2.0 s, WR / TE vs zone, ball held, BDB 2025 weeks 1-6), 1.7-1.9 yd from the
 * nearest zone defender against 3.0-3.3 (docs/reviews/2026-11-14-crosser-depth.md). The points are the default path;
 * clearing the apex and the Mike is his route running from what he sees (ROUTE_CRAFT bends him to a shoulder of a body
 * in his lane), not a landmark tied to those defenders, which the route runner does not have. It continues against
 * zone as against man (Throw Deep: the same coaching points; one coordinator's "do not run past the center" against
 * zone is not adopted without a second source). */
const CROSS_OVER = process.env.CROSS_OVER === '1';
/** ROUTE_SHAPE (default on, engine-82; ROUTE_SHAPE=0 turns it off): the in and out breaks as rolls, as taught (see SHAPES below). */
const ROUTE_SHAPE = process.env.ROUTE_SHAPE !== '0';
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
const CROSS_FLAT = process.env.CROSS_FLAT !== '0';
const ROUTE_TABLE: Record<string, RouteDef> = {
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
  // QUICK_HITCH (concepts.ts): the quick game's hitch, planted at 5 yd ("every receiver is running a 5-yard hitch", the
  // quick game off a three-step, one step from the gun for "any route that breaks at 5 yards or under", Viqtory Sports);
  // the five-step hitch above stays at 6 (Throw Deep, Smash: "settle hitch route at 6 yards"). Same shape, a yard shallower.
  quick_hitch: { id: 'quick_hitch', family: 'quick', depth: 4, end: 'settle', points: [{ d: 5, l: 0, s: 0.2 }, { d: 4.5, l: 0.3, s: 0 }] },
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
  cross: CROSS_OVER
    ? { id: 'cross', family: 'cross', depth: 14, end: 'continue', points: [{ d: 4, l: -3, s: 0.9 }, { d: 11, l: -10 }, { d: 17, l: -20 }, { d: 21, l: -34 }] }
    : { id: 'cross', family: 'cross', depth: 14, end: 'continue', points: [{ d: 6, l: -1, s: 0.9 }, { d: 14, l: -16, s: 0.85 }, { d: 18, l: -34 }] },
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
    ? (FLAT_SHAPE
      // FLAT_SHAPE (route-motion.ts): the NFL back's shallow flat, no climb, at full pace (the check is its own delay).
      ? { id: 'back_flat', family: 'back', depth: -2, end: 'continue', pace: 1, points: [{ d: -4.5, l: 3, s: 0.9 }, { d: -4.1, l: 7.5, s: 0.9 }, { d: -3.6, l: 13 }] }
      : { id: 'back_flat', family: 'back', depth: -2, end: 'continue', pace: 0.55, points: [{ d: -4.5, l: 3, s: 0.9 }, { d: -4.2, l: 7, s: 0.9 }, { d: -3.5, l: 10 }, { d: -1.5, l: 13 }] })
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

/** ROUTE_SHAPE: the in and out breaks rolled, as taught and as the NFL runs them. A square plant is taught under about 8-10 yd
 * ("Square Break": drop, break, line), but past about 8 yd "he has too much momentum to run a Square Break": in and out
 * routes at 10 yd or deeper are a speed drop or speed cut, "round the corner without losing any speed", and the 6 yd speed
 * out is a speed cut on the 2nd inside step (USA Football, Coaching the Wide Receiver: Square Break, Speed Drop, Speed
 * Cut). The dig: "push vertical to ten yards before planting on his outside foot to make a speed cut", "working to
 * flatten out at 12", and "does not gain ground once he has hit his depth" (Viqtory Sports, Complete Coaching Guide to
 * Football Routes). The speed out: "push vertical to about 4 yards and then bend out to the sideline" (ibid.).
 * NFL (BDB 2025 weeks 1-3, route_break.py, WR, matched on vertex depth from his start): deep IN (vertex 13.1) turns 53 deg
 * in the operator's windows and 72 deg 0.8-1.5 s later, v_in 6.6, v_min / v_in .88; deep OUT (11.4) 51 / 74 deg, .89;
 * short OUT (5.0) 52 / 68 deg, 1.01. Read by eye (12 deep INs, week 1): one roll of about a second, gaining its depth
 * in the roll, then flat or losing a little; a few still climb when the track ends at the throw.
 * The short in stays a square cut (under 10 yd). Each point is a roll led by the fillet under ROUTE_FILLET (no `cut`) at s 1:
 * the radius his lateral allows at the speed he carries gives the dip (v_min / v_in .89 deep, .97 on the speed out; NFL
 * .88-.89 and 1.01). s .6 / .42, set from the NFL's through speed over his top speed, gave .87 and .83. */
const SHAPES: Record<string, RouteDef['points']> = {
  quick_out: [{ d: 4, l: 0, s: 1 }, { d: 5.5, l: 3 }, { d: 6.5, l: 10 }],
  out: [{ d: 9, l: 0, s: 1 }, { d: 11, l: 3 }, { d: 11.5, l: 12 }],
  deep_out: [{ d: 12, l: 0, s: 1 }, { d: 14, l: 3 }, { d: 14.5, l: 12 }],
  dig: [{ d: 10, l: 0, s: 1 }, { d: 12, l: -3.5 }, { d: 12.3, l: -24 }],
};
const SHAPED: Record<string, RouteDef> = ROUTE_SHAPE
  ? Object.fromEntries(Object.entries(ROUTE_TABLE).map(([id, r]) => [id, SHAPES[id] ? { ...r, points: SHAPES[id] } : r]))
  : ROUTE_TABLE;

/** ROUTE_EFFORT: the break table. With effort at 1 (the stem's pace, no coached throttle), each break says how it is run:
 * a cut (`cut: true`: plant, stick the foot and break; the follower's vertex law, no lead) or a roll (led as a fillet
 * under ROUTE_FILLET), and the speed he brings through it (s, a fraction of his top speed), set against NFL break-aligned
 * rows (Tools' route_break.py, BDB 2025 week 1, speed into the vertex v_in and at it v_min). Points not listed keep their
 * authored values. Off, every route is exactly as authored above.
 * - Cuts, square (dig, out, deep out, short in): plant at s .4. "Sink the hips" into the break (USA Football, Coaching the
 *   Wide Receiver: the Tight Break). On a square plant the follower's corner law binds below any s above .4: s .6 left the
 *   dig at 3.3 and the out at 4.7 yd/s at the vertex, unchanged. The NFL deep in / out (v_min 5.7 / 5.9) are 51-54 deg
 *   rolls, not square plants: that is ROUTE_SHAPE's geometry, not s. NFL short IN v_min 3.5 is s .37 on a 9.6 yd/s body.
 * - Cuts, sink and come back (hitch, curl, comeback, stick, hook): the authored settle s, now planted at the vertex.
 * - The slant: a cut, the three-step plant ("three controlled steps and stick, then break"), s .35: the NFL slant comes into
 *   its plant at 3.3 yd/s (break at 2.3 yd, 1.6 s, turn 56 deg), .35 of a 9.6 yd/s body. With the arrive law aimed at the
 *   switch (ROUTE_FILLET) he crosses the vertex at 3.8 (at .4: 4.3).
 * - Rolls at depth (corner, post): s 1, he carries his speed through. NFL breaks at 9 yd or deeper (week 1): corner v_in
 *   7.2, v_min 7.2, turn 43 deg, radius 11 yd (n 23); post 7.0 / 6.4 / 45 deg / 8.5 yd (n 17). The pooled NFL rows (v_in
 *   5.4 / 6.0) were mostly release bends at about 3 yd, not these breaks. The set at the top of the stem (AFCA, Winning
 *   Vertically at the WR Position) is a head-and-shoulder fake, not a throttle.
 * - Rolls (shallow, shallow high, cross): s 1 through the bend, a speed cut ("cut at full speed", USA Football, Coaching
 *   the Wide Receiver: the Speed Cut); NFL rounded cross v_min / v_in 1.16.
 * - The speed out (quick_out) is a roll at its authored s .4: at s 1 the radius his lateral allows at the speed he
 *   carries (about 6 yd) is longer than its 5 yd stem, so he rolled from the line (break at 1.3 yd, 1.4 s; NFL OUT under
 *   9 yd: 3.9 yd, 2.0 s, 51 deg). Its authored 90 deg is the route-geometry item (NFL speed outs turn about 50 deg).
 * Backs and screens keep theirs. */
const BREAKS: Record<string, ReadonlyArray<{ cut?: boolean; s?: number } | null>> = {
  slant: [{ cut: true, s: 0.35 }],
  out: [{ cut: true, s: 0.4 }], deep_out: [{ cut: true, s: 0.4 }], dig: [{ cut: true, s: 0.4 }], short_in: [{ cut: true, s: 0.4 }],
  hitch: [{ cut: true }], quick_hitch: [{ cut: true }], curl: [{ cut: true }], comeback: [{ cut: true }], stick: [{ cut: true }], hook: [{ cut: true }],
  corner: [{ s: 1 }, { s: 1 }], post: [{ s: 1 }],
  shallow: [{ s: 1 }], shallow_high: [{ s: 1 }], cross: [{ s: 1 }, { s: 1 }],
};
/** The table's two columns follow their own flags: a point's break type (`cut`: planted, no lead; absent: led as a roll)
 * is ROUTE_FILLET's, since cuts planted and rolls led is the fillet as designed; the speed through it (`s`) is
 * ROUTE_EFFORT's, set against full-pace stems. With ROUTE_FILLET alone, the cuts are planted at their authored s. */
const BREAK_CUTS = ROUTE_FILLET || ROUTE_EFFORT;
export const ROUTES: Record<string, RouteDef> = BREAK_CUTS
  ? Object.fromEntries(Object.entries(SHAPED).map(([id, r]) => [id, BREAKS[id] && !(ROUTE_SHAPE && SHAPES[id])
    ? { ...r, points: r.points.map((p, i) => {
      const b = BREAKS[id][i];
      if (!b) return p;
      return { ...p, ...(b.cut ? { cut: true } : {}), ...(ROUTE_EFFORT && b.s !== undefined ? { s: b.s } : {}) };
    }) }
    : r]))
  : SHAPED;

export function getRoute(id: string): RouteDef {
  const r = ROUTES[id];
  if (!r) throw new Error(`Unknown route: ${id}`);
  return r;
}
