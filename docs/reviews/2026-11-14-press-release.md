# Receiver release vs press: measurement and design note (no code)

Run Game for Integration, 2026-11-14, on engine-64 (develop 3d445688 merged into run/G3-oz-backfield). Step 1 of
the press-release assignment: measure with one operator on NFL tracking and ours, then source the techniques
([sources](../football-handbook/press-release-sources.md)), then this note before any code.

## Operator and populations

`scripts/diag/release/press-release.py` (docstring has every definition). Outside receiver = widest WR/TE on his
side, running a route, non-designed dropback. "Pressed": nearest DB within D yd at the snap, no deeper than 2.5 yd
past the line. `--holds` drops corners who gain 1+ yd of depth by 0.6 s (bailers: 50 of 3,903 NFL, 0 of ours).

- NFL: BDB 2025 weeks 1–9 (out/cross/nfl-plays-ids.jsonl.gz).
- Ours: league games almost never press (9 pressed outside receivers in 5,691 across 32 games), so staged reps:
  `scripts/diag/release/press-lab.mts`, Cover 1 (press) vs gun trips four_verts, gun doubles four_verts, gun
  doubles comebacks, 12 seeds × flip = 72 dropbacks, 144 outside receivers. Under `npm run ref` the output is
  byte-identical (stack = defaults for these flags).

**Definition change, stated before comparing:** the 2.0 yd "pressed" cut excluded every one of our reps. NFL
pressed alignment is gap 2.00/2.28/2.55 yd (corner 1.4 deep, receiver 0.8 off), and ours is 2.30/2.31/2.50 (1.3 and
1.0). So our alignment is NFL-like, and the 2.0 cut was too tight on both sides. Tables use D = 3.0 (NFL 3,903
receivers, 24% of outside receivers; 2,534 reach 5 yd). At 2.0 the NFL numbers move by 1 point or less.

## Step 1 results (p25/p50/p75)

| | NFL | ours (Cover 1 press lab) |
|---|---|---|
| time to 5 yd | 1.80/2.00/2.20 | 2.10/2.10/2.10 |
| lateral at 1 yd (outward +) | −0.80/+0.10/+1.00 | +1.20/+1.30/+1.40 |
| lateral at 5 yd | −2.60/0.00/+3.40 | +3.80/+4.00/+4.30 |
| speed 0.3/0.5/0.7/0.9/1.1 s (median, yd/s) | 0.56/1.46/2.46/3.47/4.37 | 0.56/1.46/2.57/3.47/4.25 |
| speed release / jab-stutter / through (close contact) | 59% / 6% / 33% | 86% / 1% / 14% |
| stutter t5 | 2.00/2.20/2.40 | (n 1) |

Release side by route and corner shade (released outside / n):

| route | outside shade | head-up | inside shade | lateral at 5 yd |
|---|---|---|---|---|
| NFL GO | 132/235 (56%) | 476/634 (75%) | 139/154 (90%) | 1.0/3.2/4.6 |
| ours go | 14/20 (70%) | 72/72 (100%) | – | 3.8/4.0/4.3 |
| NFL HITCH (incl. comeback, curl) | 14/98 (14%) | 154/248 (62%) | 45/57 (79%) | −1.9/1.2/3.3 |
| ours comeback | 7/10 (70%) | 36/36 (100%) | – | 3.9/4.1/4.2 |
| NFL SLANT / IN / POST | 0–5% | 6–15% | 10–52% | inward |

What the numbers say:

1. **The side is a fixed rule, not a read.** Against a head-up corner every one of our receivers releases outside;
   NFL go receivers do so 75% of the time, hitches 62%. Shade moves the NFL release strongly (go: 56 → 75 → 90% outside from
   outside to inside shade). Ours moves only past 0.3 yd of shade. Source: `receiver.ts` PRESS_RELEASE picks the
   route's break side (outside on any vertical) and flips only for a shade beyond 0.3 yd. No input from what the
   corner does after the snap.
2. **Stop routes release like gos.** Our comeback runs the go's release, 4.1 yd wide at 5 yd; NFL hitches are 1.2
   (and 14% outside against an outside shade). The sources teach a modest release on stop routes that keeps the
   corner on the inside shoulder.
3. **No jab exists.** 1% stutters (one incidental) vs 6% in the NFL; NFL stutters cost +0.2–0.3 s to 5 yd.
4. **Every rep is the same rep.** t5 2.10 in all 138 reps (NFL IQR 0.4 s); identical lateral paths across seeds.
5. Speed through the first second matches; the corner's hands are not the gap. Our close-contact share is 14% vs
   33%, but see the label check: in both datasets "contact" mostly marks a close pass-by at 1.0–1.4 s rather than
   a jam at the snap. Not used as evidence.

### Label checks (20 reps printed with `--list 4`: gap and lateral offset every 0.2 s)

- NFL "speed" reps: gap 2.0–2.6 at the snap falls to 1.3–1.8 by 1.4 s, no contact, side change visible in dy.
  Labels correct.
- NFL "through" reps: the gap reaches ≤1.0 at 1.0–1.4 s as he runs past the corner (e.g. 2022091200-3723 at
  0.8 yd at 1.4 s, dy 0). That is a close pass-by, not a jam at the snap, so "contact" here means bodies within
  1 yd, not hand fighting.
- Ours: identical traces rep to rep (gap 2.3 → 1.1 by 1.4 s; dy 0 → +0.8 outward, starting at 0.4 s).
  "Outside shade" reps at dy −0.3 released outside (the 0.3 yd override threshold), at −0.7 inside.
- 2022091101-686 (earlier 2.0 yd run) is a bailing corner; `--holds` now removes those.

## Step 3: design note (for approval; nothing built)

**RELEASE_READ (off)**: the pressed receiver plans, jabs and reads the corner from his own picture. It replaces only
the side choice in the PRESS_RELEASE branch of `RouteRunner.handleRelease`; the corner's jam, hands and mirror are
unchanged (Coverage's files untouched).

1. **Plan (at the snap, from what he saw).** He sees the corner's shade as he sees it (`sim.see`). His preferred
   side is the route's (outside on a go; break side otherwise). If the corner is shaded away from that side, or the
   route is a stop route, there is no reason to jab: speed release, attacking 1–2 yd past the corner's leverage on
   the preferred side. If the corner is head-up or sits on the preferred side, he plans a jab: one quick step to the
   other side (toward a shade, opposite the preferred side when square).
2. **Jab = real steps.** The jab is a lateral request at the LINE_START get-off drive for one step (his own stride
   time, about 0.25–0.3 s), not a timer on the result. It costs what a lateral step costs: no upfield drive in that
   step. Better route runners step quicker and sharper (existing `cutSkill`/drive scaling), not "win more".
3. **Read.** After the step, with his own perception delay, he compares the corner's seen lateral movement and
   position with his own. If the corner followed the jab (seen lateral velocity or position shift toward it beyond
   his body radius' worth), he releases the other way. If the corner sat, he releases to the preferred side. Either
   way the release then uses the existing PRESS_RELEASE path, width and RELEASE_THROUGH.
4. **Why it can fail.** Our corner already mirrors the receiver's seen position with reaction delay (PRESS_MIRROR,
   `defense.ts` 1157). A quick corner with a short delay recovers. A patient corner (Coverage's call; dependency
   noted, not built here) gives the jab nothing to read, and the receiver has spent a step. Nothing is banned or
   capped.
5. **Stop-route width (second attempt only, if the read alone leaves finding 2).** A stop route's release clears
   the corner's body and reach and then returns to its stem line, keeping the corner on his inside shoulder. It
   does not hold the go's wide line. This is a separate change and gets its own read.

**What would answer it (stated before results).** On the same lab (same bodies, seeds, Cover 1 press),
release side by route × shade moves from 100% outside head-up toward a mixed split that depends on the corner. Jabs
appear on head-up/same-side shade reps and cost time to 5 yd (positive Δt5 on jab reps). Off-coverage receivers
change on 0 reps. Not a target: matching 75%/62%. If jab reps lose time and gain no side wins against our
mirroring corner, that is a finding about the corner's patience, not a number to tune.
**Controls.** Off-coverage receivers (unchanged by construction; checked); a placebo seed pair; an inside-shade
go, which should stay a speed release outside. **Witness fixtures.** The press lab above; Coverage's SOLO_JAM
fixture (coverage/C14-solo-jam, not on develop) if they want it read there.
**Not changed.** Press alignment, the corner's mirror/jam/hands, QB timing, ratings coefficients.

## Second half: getting back on the route after the release (Integration follow-up)

Rules' route-end staging found an outside hitch vs press-man 3.8 yd off its stem at the break. In the seed 1 trace,
the corner sits on his inside hip and carries him to the sideline, and the hitch never returns to its stem.
Measured with `scripts/diag/release/restem.py`. Same receiver selection and press definition as above. Lateral is
his y change from his own alignment, outward +, at the route's taught break depth, the same both sides: hitch 5 yd,
slant 2, out 5, go 10. Off-coverage receivers (no DB within 3 yd) are the on-stem reference.

Sim: `press-lab.mts --cov cover1,cover3_mable --plays` hitches, double_slants, quick_outs, double_outs, four_verts,
comebacks (gun doubles), 10 seeds × flip.

| lateral at break depth, p25/p50/p75 (yd) | NFL press | NFL off | ours press | ours off |
|---|---|---|---|---|
| HITCH at 5 yd | −2.0/+1.2/+3.3 (460) | −0.8/+0.2/+1.0 (2116) | +4.0/+4.2/+4.2 (95) | 0.0/+0.1/+0.1 (100) |
| OUT at 5 yd | −2.1/+0.7/+3.7 (154) | +0.1/+1.5/+3.1 (1012) | +4.1/+4.2/+4.3 (59) | 0.0/+0.1/+0.1 (60) |
| SLANT at 2 yd | −1.9/−0.8/+0.1 (408) | −1.4/−0.6/−0.1 (885) | −2.0/−1.9/−1.8 (19) | −0.1/−0.1/0.0 (20) |
| GO at 10 yd | +1.5/+4.7/+6.2 (883) | +0.5/+2.0/+4.1 (2362) | +4.9/+4.9/+6.1 (50) | +0.7/+0.7/+0.8 (48) |
| HITCH lateral at 1 yd (the release) | −0.6/+0.3/+1.0 | −0.2/0.0/+0.3 | +1.2/+1.3/+1.4 | 0.0 |
| HITCH change, 1 yd → break | −1.3/+0.8/+2.2 | −0.6/+0.2/+0.7 | +2.7/+2.9/+3.0 | +0.1 |

Read:

- **A pressed NFL hitch arrives at its break 1.0 yd wider (median) than an off-coverage hitch, with a spread both
  ways. Ours arrives 4.1 yd wider, always outward.** Our hitches and outs release outward (+1.3 at 1 yd vs NFL
  +0.3), then keep drifting outward another 2.9 yd before the break. The NFL median keeps 0.8, and a quarter of
  NFL pressed hitches come back inward between the release and the break (p25 −1.3).
- **Outs:** ours 4.2 vs NFL 0.7 under press. Off coverage, NFL outs already drift +1.5 by 5 yd; ours hold the line.
- **Slants under press:** ours −1.9 at 2 yd vs NFL −0.8. That is the inside release staying inside; not the
  hitch problem.
- **Gos under press match** (4.9 vs 4.7). A wide go is football. The off-coverage go stem is narrower than the
  NFL's (0.7 vs 2.0): separate, not press.
- **What the tracking can and cannot say.** It cannot show whether the receiver re-stemmed or the break point was
  moved on purpose. It does show that pressed NFL hitches and outs end up within about 1 yd of where they break
  off coverage, and ours do not. A slope of break on release lateral is not usable: it exceeds 1 on both sides,
  because the 1-yd release lateral is small next to the later drift.

Mechanism (from the code, to be confirmed on the trace before any build):

1. PRESS_MIRROR keeps the corner head-up on the receiver's seen position (lev 0) while he releases. The corner
   ends up on the inside hip of a receiver who released outside, between him and his landmark.
2. The receiver's request back toward his stem line then points through the corner. ROUTE_CRAFT bends round a
   body in his lane: toward his next break if one is coming, else away from where the defender sits. A hitch
   has no lateral break, so he bends outside, away from the corner on his inside, every tick.
3. RELEASE_THROUGH skips stem points behind his release side. Off, a go released wide was steered back across
   the corner. On, nothing tells a stop route to get back.

So each tick he is pushed further from his stem. Nothing models stacking or re-stemming.

## Design note, revised: two halves (for approval; nothing built)

**RELEASE_READ, attempt 1:** as above. The side choice reads the corner after a jab from his own picture.

**RESTEM, attempt 2 (off).** After the release, a route with a break works back to its stem line when it can, and
moves its break point when it cannot. All from his own picture of the corner:

- **Won the release** (he is level with or past the corner's hips along his stem): he stacks. He works back onto
  his stem line in front of the corner, so the corner is behind him rather than inside him. The bend round a body
  no longer applies to a corner behind his hip.
- **Not won** (the corner is still on his hip, between him and the landmark): he does not fight across him. He
  runs his break from where he is, and the break point shifts with him. A hitch settles at its depth from his
  current line; an out breaks from there. That is the coached "adjust the break when you can't get back", and it
  costs him the spacing the concept drew.
- **Gos are excluded.** They keep the wide release (they match the NFL), and RELEASE_THROUGH's go behaviour is
  unchanged.

Nothing is awarded. Whether he gets back depends on the corner's position and mirror, the receiver's speed, and
his read delay. Better route runners read and step sooner; they are not given the stack.

**What would answer it (stated before results).** On the same lab:

- Pressed hitches and outs arrive at the break much closer to their off-coverage line, with a spread that depends
  on whether he won the release. The NFL gap is about +1.0 yd; that is a guide, not a target.
- Rules' "settle" count on Cover 1 hitches rises.
- Gos and slants stay as they are.
- Off-coverage routes change on 0 reps.
- Throw timing and completion on hitches vs press are read, not tuned.

**Controls.** Off-coverage receivers; Cover 3 hitches (0.0 off the stem now); pressed gos; a placebo seed pair.

## Mechanism check on Rules' trace (engine-67, before any build), 2026-11-15

`scripts/diag/release/hitch-trace.mts`: hitches vs Cover 1, gun doubles. Seed 1 X, plus seeds 2, 3 and 5 for X and
Z. Per 0.1 s it prints:

- where he is against his stem line;
- the corner's offset (ahead, and outward + relative to him);
- his request;
- which stage produced the request: jam contact, route-craft, the PRESS_RELEASE path, or plain route.

Seed 1 X (others identical within 0.1–0.3 yd):

| t (s) | depth | off stem | request (up, out) | stage | corner ahead / outward of him |
|---|---|---|---|---|---|
| 0.3 | −1.0 | 0.0 | 6.5, +4.4 | press release | 2.25 / +0.14 |
| 1.0 | 0.2 | 0.7 | 6.7, +4.1 | press release | 1.52 / −0.40 |
| 1.5 | 2.1 | 1.9 | 6.6, +4.3 | press release | 0.81 / −0.75 |
| 1.9 | 3.9 | 3.3 | 6.1, +4.9 | press release | 0.35 / −1.01 |
| 2.0 | 4.4 | 3.6 | 2.4, −7.5 | jam (hands) | 0.28 / −1.10 |
| 2.3 | 5.6 | 4.6 | −2.7, −6.2 | route-craft | 0.27 / −1.07 |
| 2.5 | 6.2 | 5.0 | −3.3, −6.4 | route-craft | ball thrown |

The three-step mechanism I proposed was wrong in two steps:

1. **Confirmed, and it is the whole story.** The release target is recomputed every tick as a point one clearance
   (bodies, plus 0.2, plus his reach, about 1.4 yd) outside the corner's *current* position. The corner mirrors
   head-up, so that target slides outward with him. He sits 0.8–1.1 yd outside the corner, inside the clearance
   still to be gained, while the corner gives ground (still "ahead"). So the PRESS_RELEASE branch never lets go:
   from 0.3 s to 1.9 s he runs at about 32° outward. He reaches 5 yd at 2.1 s, 3.6 yd off his stem, with the
   corner on his inside hip.
2. **Refuted.** Route-craft does not bend him outward. When it acts (2.3–2.5 s) it bends him inward, toward his
   stem.
3. **Refuted.** He does try to come back. From the jam at 2.0 s he requests −6 to −7.5 yd/s inward. The corner's
   body and hands are on his inside, so he cannot get there before the break, and the break is run from 4.5–5 yd
   wide.

**Consequence for the build.** Both halves change one thing: the release side and target are chosen once, not
re-aimed at a mirroring corner.

- **RELEASE_READ:** the side is decided once from his delayed picture after the snap (and after a jab when he
  makes one), and held until he is past or beaten. The target is a fixed point past the corner's leverage as he
  saw it (the "short arm", 1–2 yd beyond it), not the corner's running position. A route's own side, from
  DECLARED_BREAK's `declaredBreak`, is the default lean.
- **The release ends** when he is level with the corner's hips, or at that point. A go keeps its width (it
  matches the NFL). A route with a break turns up its stem from there. That is RESTEM's "won the release → stack
  back onto the stem in front of the corner".
- **Not won** (the corner is still ahead and on his line at the release point): he breaks from where he is
  (RESTEM).

The fixed target is also the held side that removes the left-right dither Flex found. Built off on engine-68 when
it lands.

## RELEASE_READ, attempt 1: staged gates (engine-68, fbeeef9b merged as 7708be31), 2026-11-15

**Build.** `src/sim/behaviors/receiver.ts`: `readRelease`, `routeLean`, `seenRushing`; flag `RELEASE_READ` (off;
FLAGS.md row, reference-stack off, baseline "0"). Inside the PRESS_RELEASE branch of `handleRelease`:

- **Timing.** He decides once, one reaction time after the snap (until then his first step is unchanged).
- **Lean.** His lean is the route's declared break side (DECLARED_BREAK), else outside.
- **Plan.** Speed release when the corner is shaded away from the lean. Otherwise one jab step (0.35 yd; 0.6 s at
  most if the step cannot be made: the other way vs a square corner, toward a corner sitting on the lean), then
  the read, as taught:
  - a square corner who jumped the lean (0.25 yd toward it, as seen) gets the other side, else the lean;
  - a corner still sitting on the lean gets the other side.
- **Release point.** Fixed when he decides: one clearance to the side, 1 yd past the corner's seen depth. The
  release ends when he is level with the corner as seen, or at the point. It is never re-aimed, and the old loop
  does not pick that corner up again.
- **Jam.** The jam side is the held side.
- **Rushers.** A man he sees with a hand down, past the line or moving into the backfield is a rusher: no release
  is aimed round him. This is Rules' engine-68 mesh seed 2 finding, folded in.

**Gate, staged.** `press-lab.mts --cov cover1 --shade S` puts each press-man corner at S yd (0 head-up, +0.8
outside, −0.8 inside) and re-records the pre-snap picture there. Hitches, double slants, double outs, four verts,
comebacks; gun doubles; 10 seeds × flip; 100 dropbacks per cell. Same operator as the NFL tables (pressed = DB
within 3 yd, holds). Release side is judged where he passes the corner's depth.

| released outside / n | head-up off | head-up on | NFL head-up | outside shade off | on | NFL | inside shade off | on | NFL |
|---|---|---|---|---|---|---|---|---|---|
| GO | 51/51 | 37/37 | 75% | 2/52 | 44/44 | 56% | 52/52 | 57/57 | 90% |
| HITCH | 88/89 | 50/81 | 62% | 0/91 | 19/92 | 14% | 93/93 | 37/95 | 79% |
| OUT | 18/18 | 18/18 | 46% | 0/19 | 19/19 | 43% | 19/19 | 19/19 | 86% |
| SLANT | – | – | 6% | 0/8 | – | 0% | 9/9 | 0/10 | 20% |

| p50 | head-up off | head-up on | outside shade off | on | inside shade off | on | NFL press |
|---|---|---|---|---|---|---|---|
| time to 5 yd (s) | 2.10 | 2.50 | 2.10 | 2.10 | 2.10 | 2.00 | 2.00 (stutter 2.20) |
| hitch lateral at 5 yd | +4.1 | +2.1 | −3.8 | +0.8 | +3.8 | +0.2 | +1.2 |
| out lateral at 5 yd | +4.2 | +1.9 | −3.8 | +2.2 | +3.8 | +1.2 | +0.7 |
| go lateral at 10 yd | +5.0 | +3.3 | −5.8 | +3.6 | +4.9 | +2.8 | +4.7 |

**Controls.**

- *Off-coverage* (Cover 3 and Cover 2, same plays, 200 dropbacks). Receivers with nobody tight over them change on
  0 plays. 40 plays differ, every one first at the Y tight end, 0.3–0.5 s, with the end DE_S aligned tight over
  him; that is the intended rusher correction.
  - The first build changed 136 of 200 through defenders' sight of the tight end's earlier first step. Deciding
    one reaction time after the snap removed that.
- *Flag off.* The code path is unchanged; `npm test` passed: 532 files, 4,321 tests.

**Read.**

1. **The re-aim fault is gone.** Stop routes no longer ride the corner to the sideline: hitches at 5 yd are +2.1
   head-up, +0.8 against an outside shade and +0.2 against an inside shade, vs +4.1/−3.8/+3.8 off. Stop routes
   now release narrower than gos (hitch 2.1, go 3.3).
2. **Shade now moves the release where it opposes the lean:** hitches against an outside shade go inside (19/92
   outside, NFL 14%).
3. **Where the ours-vs-NFL gap remains, it comes from our corner, not the receiver's read.**
   - PRESS_MIRROR plays every pressed receiver head-up from the snap, so by the read an outside-shaded corner is
     head-up again. The receiver then takes his lean: gos and outs vs an outside shade are 100% outside, NFL 56%
     and 43%.
   - The mirror also follows every jab, so the corner always "bites". A square corner never jumps the lean, so
     head-up gos and outs are 100% to the lean (NFL 75% and 46%).
   - Both are Coverage's controller (the corner's patience and leverage after the snap), not something to tune in
     the receiver.
4. **Inside-shade hitches release outside only 39% (NFL 79%).** The label is judged where he passes the corner's
   depth. After a correct outside speed release, the hitch now comes back to its stem in front of the corner and
   is counted "inside" at that frame. His lateral at 5 yd is +0.2, NFL +1.2. Not a wrong release; a label
   artifact of the stack.
5. **The jab's cost.** Time to 5 yd vs head-up is 2.5 s (off 2.1). An NFL stutter costs +0.2–0.3 over a speed
   release; ours costs +0.4, because the read waits one reaction time and the jab is a step from a standstill
   get-off. Physical, not tuned; worth a look if the game read shows hitches thrown late.
6. **Spread.** Every cell is the same rep (one body pair, deterministic). NFL spread is many players. The gate shows
   the decision, not a distribution.

**Next.**

- The game read for RELEASE_READ (press is rare in league games: 9 pressed outside receivers in 32 games, so the
  read will be thin by construction).
- RESTEM, on the same gates.
- Two items for Coverage: the corner's shade erased by PRESS_MIRROR, and the corner always following a jab.

## RESTEM, attempt 1: staged gates (with RELEASE_READ), 2026-11-15

**Build.** `restem` in `receiver.ts`; flag `RESTEM` (off; requires RELEASE_READ; FLAGS row, stack off, baseline "0").
After his press release ends, a route with a declared break decides once, when his picture of the corner settles it:

- **Won:** he is a body past the corner along his stem, or the corner is not between him and the stem. He stacks:
  the route as installed, back onto the stem in front of the corner.
- **Not won:** 1.5 yd short of his break the corner is still between him and the stem. The rest of his route moves
  across with him, and he breaks from where he is.

Gos, seams and crossers are excluded. A first form decided at the instant the release ended (level with the corner)
and so called every rep "not won"; this is the corrected form.

**Gate (same staged cells, 10 seeds × flip; decisions per route):**

| corner | hitch stack / shift | out stack / shift | comeback stack / shift | slant stack / shift |
|---|---|---|---|---|
| head-up | 4 / 78 | 38 / 0 | 35 / 3 | 4 / 1 |
| outside shade +0.8 | 97 / 0 | 20 / 18 | 32 / 6 | 4 / 17 |
| inside shade −0.8 | 99 / 0 | 0 / 38 | 34 / 4 | 4 / 19 |

| lateral at break depth (p50, yd) | RELEASE_READ only | + RESTEM | NFL press |
|---|---|---|---|
| hitch head-up / outside / inside shade | +2.1 / +0.8 / +0.2 | +2.2 / +0.8 / +0.2 | +1.2 (all shades) |
| out head-up / outside / inside shade | +1.9 / +2.2 / +1.2 | +1.9 / +2.2 / +1.2 | +0.7 |

**Read.**

- The decision now depends on the corner: hitches against a shaded corner win and stack, head-up hitches mostly do
  not.
- The break point barely moves. RELEASE_READ alone already broke those hitches from about +2 yd, because the corner's
  body kept him from crossing back. What RESTEM changes is the request: he no longer asks to run back across the
  corner. The lateral outcome is the same within 0.1 yd.
- The remaining head-up width (+2.1 vs NFL +1.2) is the release itself: one clearance (bodies + 0.2 + his reach, about
  1.4 yd) plus the jab against a corner who mirrors him head-up all the way. That is the release width and the
  corner's mirror, not the restem.
- RESTEM is kept off as built: no gate change beyond the request; no game read yet.
- Before any second attempt, decide whether the release clearance should be his body and the corner's hands rather
  than the corner's full reach. That is a RELEASE_READ question for the next attempt, not a RESTEM one.

## RELEASE_READ, game read (16 games, seed 101, engine-68 + RELEASE_READ at 52ca6fdd), 2026-11-15

`sim-export.ts --seed 101 --games 16` under `npm run ref`, off vs `--flag RELEASE_READ=1`. Both arms ran all 16
games and wrote complete files. The exporter's end-of-run source check then failed because RESTEM was added to the
working tree mid-run. Each process had loaded 52ca6fdd at start, and RESTEM is off and absent from it, so the data are
52ca6fdd's. At engine-68 our defenses press: 634 (off) and 575 (on) pressed outside receivers in 16 games, 20% (NFL
24% at the same 3-yd definition).

| pressed outside receivers, p50 (p25–p75) | off | on | NFL |
|---|---|---|---|
| time to 5 yd (s) | 2.00 | 2.20 | 2.00 (stutter 2.20) |
| reached 5 yd before the throw | 561/634 (88%) | 445/575 (77%) | 2,584/3,903 (66%) |
| lateral at 1 yd (outward +) | +1.20 (−0.1–1.3) | −0.30 (−0.5–0.0) | +0.10 (−0.8–1.0) |
| lateral at 5 yd | +3.50 | +1.80 | 0.00 |
| GO, head-up corner, released outside | 180/189 (95%) | 120/153 (78%) | 75% |
| HITCH, head-up corner, released outside | 127/157 (81%) | 83/136 (61%) | 62% |
| HITCH at 5 yd (break lateral) | +3.9 | +2.0 | +1.2 |
| OUT at 5 yd | +3.8 | +2.0 | +0.7 |
| SLANT at 2 yd | −1.7 | −0.6 | −0.8 |
| GO at 10 yd | +4.5 | +2.8 | +4.7 |
| yards per dropback (all, n 1,641 / 1,529) | 9.40 | 8.87 | – |

Read:

- **In games, where corners differ, the release side moves toward the NFL by route.** Head-up gos 95 → 78% outside,
  head-up hitches 81 → 61%. Stop routes break much closer to their stem: hitch +3.9 → +2.0, out +3.8 → +2.0; NFL
  +1.2 and +0.7.
- **The cost is time at the line.** Time to 5 yd is 2.00 → 2.20 s, and fewer pressed receivers reach 5 yd before the
  throw. The NFL's average is 2.00 because only 6% of its releases jab. Ours jab on every head-up or same-side
  shade, so the share of jabs is the open question, not the jab's price (+0.2 s, the NFL stutter's).
- **One departure introduced:** at 1 yd the receiver is now 0.3 yd *inside* (the jab), where the NFL is +0.1. That
  is the same question: every receiver jabs.
- **Pressed gos are now narrower than the NFL (+2.8 vs +4.7 at 10 yd).** The fixed release point is one clearance
  beside the corner, and RELEASE_THROUGH then runs the go back toward its installed line. Before, the re-aim carried
  gos wide (+4.5), which matched the NFL for the wrong reason. A go wants its width (the coached "keep the fade's
  room to the sideline"). Worth a look in attempt 2.
- **Yards per dropback −0.53, about 1.1 SE** (sd 13.5, unpaired: plays diverge after the first change). No finding.

**Proposed attempt 2 (not built; to approve).**

- (a) **The jab is a choice, not a default.** A speed release where the lean already wins, i.e. the corner as he
  sees him is not on the lean side. A jab only where the corner sits on the lean or he cannot see the corner's
  leverage.
- (b) **A go's release point keeps its width.** The installed release target outside the corner, not one clearance
  and back.

Both act on the receiver's own plan. Neither touches the corner.

## What is the NFL's +4.7 yd on pressed gos? (Integration's question before any go-width change), 2026-11-15

`scripts/diag/release/go-width.py`, same selection as above (pressed gos reaching 10 yd).

- **Width** is his y change from his own alignment (outward +) at 10 yd.
- **Sideline room** is his distance to his own sideline.
- **Split:** "on hip" means the corner is within arm's reach (centres 1.2 yd or less) on his inside for 0.3 s or
  more between 3 and 10 yd; otherwise "beaten/off".

| pressed gos, p50 (p25–p75) | n | width at 10 yd | room at snap | room at 10 yd | slope room10 on room0 |
|---|---|---|---|---|---|
| NFL, corner on his hip | 340 | +5.6 (4.6–7.0) | 10.0 | 4.6 | 0.74 |
| NFL, beaten / off | 543 | +3.3 (−1.2–5.5) | 10.2 | 7.3 | 1.04 |
| ours off, on hip | 86 | +5.1 | 10.6 | 5.5 | 0.94 |
| ours off, beaten / off | 114 | +4.3 | 10.6 | 7.1 | 1.11 |
| ours RELEASE_READ (attempt 1), on hip | 86 | +3.0 | 10.6 | 7.6 | 1.02 |
| ours RELEASE_READ (attempt 1), beaten / off | 60 | +0.1 | 10.6 | 10.4 | 1.14 |

NFL room at 10 yd by alignment band:

| aligned (yd from sideline) | 0–8 | 8–11 | 11–14 | 14+ |
|---|---|---|---|---|
| on hip | 1.9 | 4.3 | 5.3 | 7.5 |
| beaten / off | 3.0 | 5.9 | 8.9 | 14.1 |

**Answer.**

1. **Not a landmark.** Room at 10 yd grows with his alignment in both splits (slope 0.74 on the hip, 1.04
   beaten/off). There is no common "red line" that receivers converge on from any alignment.
2. **About half of the +4.7 is the corner.** With the corner on his inside hip the go is +5.6 wide; beaten or off,
   +3.3. The corner in phase rides him about 2.3 yd wider. That is Coverage's part, the third corner item.
3. **The receiver's own part is about +1.3, added to his route's stem width.**
   - NFL off-coverage gos are +2.0 at 10 yd (the route as run); pressed and free, +3.3.
   - Ours: off-coverage +0.8 (the installed go line, 0.6 → 1.5); pressed and free +0.1 under attempt 1.
   - So two separate things:
     - The installed go stem is about 1.2 yd narrower than the NFL's off coverage. That is the route drawing, Rules'
       lane.
     - After an outside release ours works back inside to that line (−0.7 vs off coverage, against NFL +1.3).
       RELEASE_THROUGH runs the go back to its installed line. The receiver's piece is to hold the release line he
       made, not to be given a 4.7-yd target.
4. **Not built.** The receiver's piece goes in attempt 3 of the release only if the attempt-2 read leaves it open.
   The stem width goes to Rules; the ride goes to Coverage.

## Head-up share of our pressed snaps vs the NFL's (Integration item 4)

Corner's shade at the snap, pressed outside receivers reaching 5 yd (same operator, ±0.3 yd band):

| | head-up | outside shade | inside shade |
|---|---|---|---|
| NFL (2,534) | 1,463 (58%) | 735 (29%) | 336 (13%) |
| ours, 16 games, off (553) | 475 (86%) | 71 (13%) | 7 (1%) |

- Our corners align head-up 86% of the time vs the NFL's 58%, and almost never inside (1% vs 13%). Alignment
  `shade 0.15` in `src/playbook/alignment.ts` press spots sits inside the ±0.3 band.
- So the head-up case dominates our press reps by construction, and anything a receiver does against a head-up
  corner is over-weighted against the NFL's mix.
- With attempt 1's jab-on-every-head-up, part of the 6%-vs-all jab gap was this alignment. That is the third
  Coverage/alignment item, noted for Integration.

## RELEASE_READ attempt 2: gates and 16-game read (clean tree, 6d57e74b), 2026-11-15

Both arms ran from 6d57e74b with `src/` untouched (the exporter's source check passed). The off arm reproduces the
earlier off read exactly (634 pressed, same tables), so the off engine is the same. Split by the corner's shade at
the snap, as Integration asked. Our corners are head-up on 464 of 550 pressed reps (84%), NFL 58%, so the head-up
rows carry our pooled numbers.

**Games, pressed outside receivers (16 games each arm):**

| p50 | off | attempt 1 | attempt 2 | NFL |
|---|---|---|---|---|
| time to 5 yd, pooled | 2.00 | 2.20 | **2.00** | 2.00 |
| head-up / outside shade / inside shade | 2.00 / 1.90 / 1.90 | 2.30 / 2.10 / 1.80 | 1.90 / 2.00 / 1.90 | 2.00 / 2.00 / 2.00 |
| reached 5 yd before the throw | 88% | 77% | **88%** | 66% |
| lateral at 1 yd, head-up | +1.2 | −0.3 | **+0.9** | +0.2 (−0.8–1.1) |
| lateral at 1 yd, outside shade | −0.1 | – | +1.0 | −0.2 |
| lateral at 1 yd, inside shade | +0.6 | – | +0.2 | +0.5 |
| jab rate, GO head-up | 1/189 | ≈127/153 (attempt 1 gate) | 0/176 | 27/634 (4%) |
| GO head-up, released outside | 95% | 78% | 94% | 75% |
| HITCH at 5 yd (break lateral) | +3.9 | +2.0 | **+1.6** | +1.2 |
| OUT at 5 yd | +3.8 | +2.0 | +2.3 | +0.7 |
| SLANT at 2 yd | −1.7 | −0.6 | −1.1 | −0.8 |
| GO at 10 yd | +4.5 | +2.8 | +3.0 | +4.7 |
| yards per dropback (n 1,641 / 1,529 / 1,582) | 9.40 | 8.87 | 9.34 | – |

- The jab column counts hitches by the operator's sideways-reversal rule. For hitches that counts the turn back to
  the stem (88/152 on, 22/157 off), so hitch jab rates are not reported as jabs.
- Gates (staged Cover 1, head-up / outside / inside): time to 5 yd 2.0 / 2.1 / 2.0; lateral at 1 yd +0.9 / +1.7 /
  +0.4; hitch at 5 yd +1.4 / +0.8 / +0.2.

**Against the stop rule** ("if it does not repair time to 5 yd and the 1 yd position, stop and re-diagnose"):

- **Time to 5 yd: repaired.** 2.00 pooled and 1.9–2.0 in every shade, the NFL's 2.00. 88% reach 5 yd before the
  throw, as off. The jab is gone where no corner sat on his side (GO head-up 0/176; NFL 4%).
- **The 1 yd position: not repaired.** Against a head-up corner he is +0.9 yd outward at 1 yd. Off is +1.2, attempt 1
  −0.3, the NFL +0.2. Against an outside shade (one sitting on his lean) he is +1.0 vs the NFL's −0.2.
  The departure has moved from inside to outside but not closed. **Stopping RELEASE_READ attempts here; diagnosis
  below.**
- Kept: stop routes break much closer to the stem (hitch +1.6, NFL +1.2; slant −1.1, NFL −0.8). Outs remain wide
  (+2.3, NFL +0.7) and gos narrow (+3.0, NFL +4.7). Of the go's width, about 2.3 yd is the corner's ride and 1.2 yd
  the route stem; see the section above. Yards per dropback are unchanged (9.34 vs 9.40).

**Diagnosis of the 1 yd position (not built).** NFL receivers against a head-up press spend their lateral move late,
near the corner. Ours spend it from the first step.

- **NFL.** The middle of the NFL head-up distribution at 1 yd is +0.2. Its sideways speed is small until the corner
  is close; the coaching is "eat space, don't dance", get up into the corner and win at his hands.
- **Ours.** The release point is fixed one clearance (about 1.4 yd) to the side, at 1 yd past the corner's depth
  (about 2.3 yd ahead). He runs a straight line there from his stance, so a third of the width is spent by 1 yd,
  wherever the corner is.
- **So the fault is the release path's shape, not the side decision.** The side shares are now within the corner's
  limits: head-up gos 94% outside against a mirror that never jumps the lean.
- **The question for whoever owns the next step.** Should the release go vertical first, closing the cushion, and
  turn the shoulder past the corner's hands only once inside arm's reach? That repairs the 1 yd position by when
  the width is taken, not by how much. It is a third attempt at the release, so it needs a fresh decision: this one
  is not built.

**RESTEM.** Its own arm comes next, on this clean head, per Integration.

## RESTEM, game arm (RELEASE_READ attempt 2 + RESTEM, clean tree 6d57e74b, 16 games), 2026-11-15

Compared with attempt 2's on arm, same seeds (the exporter's source check passed).

| pressed outside receivers, p50 | RELEASE_READ | + RESTEM |
|---|---|---|
| time to 5 yd | 2.00 | 1.90 |
| lateral at 1 yd, head-up | +0.9 | +0.9 |
| HITCH at 5 yd | +1.6 | +1.6 |
| OUT at 5 yd | +2.3 | +2.0 |
| SLANT at 2 yd | −1.1 | −1.1 |
| GO at 10 yd | +3.0 | +3.0 |
| yards per dropback (n 1,582 / 1,570) | 9.34 | 9.00 (sd 13.7 / 12.4; −0.34, under 1 SE) |

**Read.** RESTEM changes nothing measurable at the break: within 0.3 yd on every route; the out's 0.3 is n 24 vs
28. Its gate showed why: once RELEASE_READ stopped carrying stop routes to the sideline, the cases where the corner
is still between him and his stem at the break are few, and those already broke from where they were.

**Recommendation.** Leave RESTEM off and out of the RELEASE_READ PR. It carries no evidence for its code. Revisit only
if the release-path work (next) leaves stop routes wide of their stem against a corner still on the hip.

## Input for the release-path design (Rules, BDB 2025 weeks 1–2, non-PA GO routes, n 1,257)

The go's outward drift at 10 yd by the nearest downfield defender's cushion at the snap: +3.3 (under 2.5 yd), +3.9
(2.5–5), +2.8 (5–7), +1.4 (7–10), +1.1 (10+). By depth it is steady: +0.4 at 2 yd, +1.1 at 5, +2.6 at 10, +3.8 at 15.
Ours: +0.8 with no defender, +0.8 vs Cover 3 off, +4.8 vs Cover 1 press.

- NFL receivers widen against any defender inside about 7 yd, soft press and off man included. Width is taken
  steadily with depth, not at the line.
- So the path mechanism is a rule about the perceived defender ahead (his distance and position), not a press-only
  branch.
- Witness added: outward drift by cushion bin, ours vs these rows.
