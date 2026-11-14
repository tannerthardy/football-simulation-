# Read-compiler timing from the declared break (design note, 2026-11-14)

Rules + Coaching, for Integration. No build. This item comes after the route card and before ROUTE_SHAPE is carded,
since ROUTE_SHAPE would move every one of these windows again.

## The problem

The read compiler (`src/playbook/read-compiler/features.ts`) decides when a receiver has "shown his answer" from his
sampled track. It looks for the first point where his heading over the next 0.5 s is more than 30 deg off the chord of
his stem (or he slows below 55% of his stem speed), placed back to where the bend began (8 deg). Family rules cover the
routes that test misses: a lateral stem declares on moving 5 yd with the line crossed, an unbroken route on 12 yd of
vertical, then on `moved`.

That test has now moved ready windows for reasons unrelated to the route, five times:

- **The tunnel** never crossed +0.5 yd, so it fell back to its break (1.35 s); with ROUTE_EFFORT he crossed it at 3.9 s
  and was declared at 4.1.
- **The crossers** were rolled under ROUTE_FILLET, showed no 30 deg turn, and fell to the vertical rule (2.0 → 3.4 s).
- **The 12-personnel bubble** had its turn up rolled, the same way (1.8 → 2.9 s).
- **curl_flat bunch S1** had a 0.5 yd release wiggle out of the bunch read as its break (3.2 → 2.5 s).
- **trips_stick 12p S2:** on develop, the wing's outside release bend is read as his hitch break (1.7 s; the real
  break is at 2.6-2.8).

Each repair so far has been a rule for one family. But the route already declares where its break is: its points and,
on the route card, cut or roll. A quarterback's timing is taught off the declared route ("ball out as he comes out of
his break at 12"), not off a kink someone might see in his path. It is his own team's assignment, so reading it is
honest.

## Design

**1. The break point per route family.** The route's named break vertex is an index into its path. Where a family has
no vertex, it gets its declare rule.

| family | routes | the break | ready |
|---|---|---|---|
| cuts and plants | hitch, curl, comeback, stick, hook, out, dig, short_in, deep_out, quick_out, slant | the route's first point (the plant) | reached + 0.1 s |
| rolls at depth | corner, post (and ROUTE_SHAPE's dig, out, deep out, speed out) | the first point (where the roll is declared) | reached + 0.1 s |
| crossers | shallow, shallow_high, cross (the over) | none: 5 yd from his start with the line crossed (today's crosser declare, as the family's rule) | + 0.2 s |
| verticals | go, fade, seam | 12 yd of vertical | at 12 yd |
| the wheel | wheel | its turn up (point 1) | reached + 0.1 s |
| screens | bubble, tunnel, slip, TE screen | the turn back to the catch point (point 1) | reached + 0.1 s |
| screens | now screen | at once (he is turned to the ball at the snap) | the snap |
| backs | flat, back_flat, swing | 5 yd moved, no line to cross (today's back rule) | + 0.2 s |
| backs | angle, back_out, checkdown | the break (point 0 / 1) | reached + 0.1 s |
| read routes | seam_read, stick / hook vsMan, any option answer | the chosen variant's vertex, timed after the choice | reached + 0.1 s |

**2. What replaces the 30 deg test.** "Reached" is timed on the same sampled track, so the window still varies with
his release, his get-off and the coverage he works. The rule: the first sample within 1 yd of the declared vertex;
otherwise his closest approach, if within 2.5 yd; otherwise not reached (horizon). The ready time stays at least the
QB's set minus 0.15 s, as now.

**3. The 30 deg test becomes a check.** It is kept, and it warns when detected and declared ready differ by more than
0.4 s. That flags a route the body did not run as declared (a press release carried 4 yd off his stem, an unreached
vertex), which is a finding for the route or release work, not a timing input.

**4. This retires, as family rules, the per-family declare rules:** the lateral-stem rule, the vertical fallback, the
CROSS_OVER / ROUTE_FILLET crosser declare (#748), and both SCREEN_DECLARE lines (#748).

**5. One choice to make: anticipation.** Today's detected break is where the bend *begins*, so on plants it runs
0.2-0.3 s ahead of the vertex: hitch +0.20, hook / out / comeback +0.30, curl +0.40 (the table below). That is an
accident of the operator, but timing routes are coached to be thrown before the break ("the ball is out before he comes
out of it" on the out and the comeback). Options:
- (a) Ready when he reaches the vertex, no lead. These reads get 0.2-0.4 s later than today.
- (b) A declared, sourced anticipation per family: the throw leads the plant by his last step (about 0.2-0.3 s), for
  quick and timing routes only.

I'd take (b) with its source, so that the lead is a coached choice rather than the detector's accident. It needs a
source per family before the build.

## Measured on develop: declared against detected

The method was a diagnostic patch to `features.ts` (not committed): the declared ready per the table above, against
today's detected ready, across `ready_times` (every pass and screen concept x 5 formation families, 865 windows),
develop at 3d445688.

| route | n | within 0.1 s | 0.1-0.4 s | over 0.4 s | median (declared - detected) |
|---|---|---|---|---|---|
| go | 196 | 195 | 0 | 1 | +0.00 |
| hitch | 148 | 0 | 147 | 1 | +0.20 |
| back_flat | 60 | 56 | 0 | 4 | +0.00 |
| flat | 56 | 56 | 0 | 0 | +0.00 |
| seam | 50 | 48 | 0 | 2 | +0.00 |
| slant | 45 | 41 | 3 | 1 | +0.00 |
| dig | 36 | 22 | 14 | 0 | +0.00 |
| hook | 32 | 1 | 31 | 0 | +0.30 |
| quick_out | 29 | 13 | 12 | 4 | +0.00 |
| post | 29 | 26 | 3 | 0 | -0.10 |
| corner | 22 | 12 | 10 | 0 | -0.10 |
| out | 22 | 0 | 22 | 0 | +0.30 |
| cross | 20 | 11 | 7 | 2 | -0.10 |
| shallow | 17 | 0 | 14 | 3 | +0.35 |
| angle | 16 | 0 | 16 | 0 | +0.30 |
| back_out | 12 | 0 | 0 | 12 | +0.50 |
| curl | 10 | 0 | 10 | 0 | +0.40 |
| comeback | 10 | 0 | 10 | 0 | +0.30 |
| now_screen | 10 | 0 | 0 | 10 | -2.85 |
| stick | 7 | 0 | 6 | 1 | +0.30 |
| short_in | 5 | 3 | 2 | 0 | +0.05 |
| deep_out | 5 | 0 | 5 | 0 | +0.30 |
| bubble | 5 | 0 | 0 | 5 | -1.20 |
| tunnel | 5 | 4 | 0 | 1 | +0.00 |
| swing | 4 | 4 | 0 | 0 | +0.00 |
| wheel | 4 | 0 | 0 | 4 | +2.00 |
| slip_screen | 4 | 0 | 0 | 4 | +0.95 |
| te_screen | 4 | 3 | 0 | 1 | +0.00 |
| shallow_high | 2 | 0 | 2 | 0 | +0.20 |
| **all** | **865** | **495** | **314** | **56** | |

What the three classes are:

- **Within 0.1 s (495):** the two agree.
- **0.1-0.4 s (314):** almost all are the systematic lead on plants (the detected bend begins 0.2-0.4 s before the
  vertex). That is decision 5, not a misread.
- **Over 0.4 s (56): the misreads and rule gaps.**
  - **The quick outs never detected** (hitch_out / double_outs 2x2 S2, trips_outs 12p S3: detected 3.2-3.5, declared
    1.9).
  - **trips_stick 12p S2:** detected 1.7 from a release bend; declared 2.9.
  - **The now screens:** detected 4.0, never ready; declared at once.
  - **Bubbles:** detected 2.0-2.9; declared 1.5-1.7 at the turn up, except the 2x2 bubble, which never reaches its
    point 1 in the horizon and is a route question.
  - **Wheels:** these are under 12 yd in the horizon, so the vertical rule has nothing to declare on. The wheel needs
    its turn-up point.
  - **Slip screens:** detected 1.75 from a 0.9 s release step; declared 2.7 at the settle.
  - **Back routes:** back_flat on `moved` is late by 1.6 s (its 0.8 s bend is read today); back_out is +0.5.
  - **pa_flood's shallow:** +0.6.

So about 6% of windows on develop are wrong by more than 0.4 s because of the detector or a missing family rule. About
36% carry the detector's lead on plants, which the build should make a declared choice.

## Build plan (after the route card)

- One flag, off.
- The declared break table lives with the routes (`routes.ts`: a `breakAt` index or rule per route, beside cut / roll).
- `features.ts` times "reached" on the sampled track, and keeps the 30 deg test as a warning. The warnings get listed
  in the compiler audit.
- ready_diff of the flag against develop, and against the route-card stack.
- The anticipation lead per family, with its source, as decision 5 settles.
- No change to the QB's runtime throw logic: it reads the windows the compiler gives it.

## Interface with the QB lane (agreed 2026-11-14, via Integration)

Two things are kept separate: the route's fact, and the passer's lead.

**What the plan carries, per read:**
- `breakAt`: the declared break as the route is *installed for the team*. It is route time from the installed geometry,
  timed on the compiler's own sample of the installed route. It is never read off the live play or the receiver's true
  position. At runtime the quarterback reads the break from his own forecast of the receiver (QB_SEEN_REC,
  `receiverForecasts.get(r).breakAt()`), and the plan's number must not become a second, truer source.
- `throwFamily`: `'onBreak'` (hitch, out, comeback, curl, dig, slant: thrown as he plants) or `'seenOpen'` (crossers,
  verticals, screens, the backs' releases: thrown to a man seen open). For `'seenOpen'` his readiness is his picture of
  separation, not a time, and the QB lane branches on the tag.
- `anchorLead`: the plan's team-level lead for ordering and rhythm. The first build uses the values that reproduce
  today's windows (hitch 0.20, out / hook / comeback 0.30, curl 0.40, slant and dig 0.00, `seenOpen` 0), labelled as the
  anchor, so nothing moves by construction.

**What the QB lane owns:** `leadFor(passer, throwFamily, route) -> s`, which reads the passer's `anticipation`. It is
called when a read is checked (their readiness test runs every tick for the man his eyes are on). The ready time
ready = breakAt - leadFor(...) means *the moment to start the throw*. The throwing motion is theirs and is added on
their side; the plan's rhythm stays in route time.

**Is today's lead standing in for the motion? No; it is a third thing.**
- The compiler's 0.2-0.4 s offset on plants is geometric: the detector places the break where the bend *begins*
  (walked back to 8 deg), which on a plant is 0.2-0.4 s before the vertex.
- It is used only for ordering and rhythm in the plan (and a key's cue). The runtime QB does not read it.
- The runtime already separates motion and anticipation (`qb.ts`, `ready()`): a timing throw starts when
  t + windup >= breakAt - 0.3 x anticipation, with the break from his forecast of the installed route. The windup is the
  motion; 0.3 x anticipation is today's passer lead.
- So the build has three parts:
  - `leadFor` replaces the runtime's `0.3 x anticipation` term;
  - the windup stays as is;
  - the compiler's `anchorLead` replaces the detector's accidental bend-start offset, with the same values, for
    team-level ordering only.
- Nothing is folded twice. The runtime never adds `anchorLead`, and the compiler never adds the windup.
