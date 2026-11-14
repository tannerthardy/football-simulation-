# CROSS_OVER: the over released inside to its landmark (2026-11-14)

The second crosser defect from docs/reviews/2026-11-14-crosser-depth.md (#746). Built off, two attempts; this is
attempt 1.

**As taught.**
- Y-cross: "Release inside of the Sam LB, and over the Mike LB. Landmark is 18-22 yards", with the same coaching
  points against man and zone (Throw Deep, Y Cross).
- Shepherd University's Y-cross crosser "work[s] inside apex defender and attack[s] vertical"; against man he works
  inside, goes vertical, then flattens (meangreennation).
- Shanahan's 1994 "dover" breaks in at about 20 (49ers install, via 49ers Webzone).

**Recorded disagreement.** Shepherd's "do not run past the center" against zone, a sit, is not adopted: Throw Deep's
coaching points are the same against man and zone, and there is no second source.

**Ours, off.** `[{d:6,l:-1},{d:14,l:-16},{d:18,l:-34}]`: 6 yd nearly straight up, then a climb. Mid class against
zone, ball held: 1.2 yd across at 2.0 s against the NFL's 3.6, and 1.7-1.9 yd from the nearest zone defender against
3.0-3.3.

**On.** `[{d:4,l:-3},{d:11,l:-10},{d:17,l:-20},{d:21,l:-34}]`: inside from the line, over the Mike at about 11, at the
18-22 landmark beyond the far hash, still climbing across.

- Clearing the apex and the Mike is his route running from what he sees: ROUTE_CRAFT, on, bends him to a shoulder of
  a body in his lane.
- The route runner has no landmark tied to the Mike's depth, so the points set the default height.

**The read compiler.** It times a route from its sampled geometry. Its precedence for an unbroken route is break, then
vertical (12 yd), then moved, so it timed the unbroken over as a vertical: ready 3.4 s, which pushed it down the order
in hitch_cross and post_cross. Its own comment says a crosser that bends without a sharp cut declares 5 yd from his
start with the line crossed. Under the flag, a `cross`-family route with no break declares that way.

| concept | cross ready, off / on | rhythm step | first two reads |
|---|---|---|---|
| y_cross (S2) | 2.0 / 1.9 | hitch (2.3) | unchanged |
| hitch_cross (S2) | 2.0 / 1.9 | set (1.9) | unchanged; the last two second-hitch reads swap |
| post_cross (S2) | 2.0 / 1.9 | set (1.9) | unchanged |
| pa_flood (W1) | 2.0 / 1.9 | hitch (2.1) | unchanged |

pa_flood's cross is the play-action over. Its boot cousin is taught at 10-12 yd to occupy the safeties; ours is a
dropback play-action flood, so it takes the dropback over.

**Staged**, the four concepts, gun doubles, 8 seeds each, QB held. Medians at 1.5 / 2.0 / 2.5 / 3.0 s:

| | depth | across | nearest defender |
|---|---|---|---|
| Cover 3, off | 2.7 / 4.9 / 6.7 / 8.0 | 0.5 / 1.1 / 2.5 / 4.2 | 2.8 / 1.7 / 0.9 / 1.9 |
| Cover 3, on | 2.5 / 4.6 / 6.8 / 8.2 | **2.0 / 3.5 / 5.4 / 7.2** | **2.9 / 1.7 / 2.7 / 2.8** |
| NFL 4-8 yd class (zone) | 5.7 / 8.3 / 10.8 at 2.0 / 2.5 / 3.0 | 3.6 / 8.5 at 2.0 / 3.0 | 3.1 / 3.3 at 2.5 / 3.0 |
| Cover 1, off | 2.5 / 4.9 / 6.7 / 8.5 | 0.7 / 1.6 / 2.5 / 4.4 | 2.5 / 1.2 / 0.8 / 0.7 |
| Cover 1, on | 2.5 / 4.8 / 6.5 / 7.9 | 1.9 / 3.7 / 5.7 / 7.3 | 2.4 / 1.2 / 0.8 / 0.8 |

**Reading.**
- Against zone the over now crosses as the NFL's does (3.5 yd across at 2.0 s against 3.6), and is clear of the
  underneath (2.7-2.8 yd at 2.5-3.0 s against 0.9-1.9).
- He is still about 2 yd shallower than the NFL's class at 2.5-3.0 s, in both arms. That is a candidate for attempt 2:
  climb faster to the landmark.
- Against man the separation is unchanged (0.8): the man trails him wherever he crosses. That is not the route's
  question.
