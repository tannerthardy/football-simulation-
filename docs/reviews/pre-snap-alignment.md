# Pre-snap alignment on accepted develop (2026-10-21)

Branch work from accepted develop `d91c9014fe5e088f3f43e38236e967d68bd388b0`.
The user asked for realistic pre-snap alignment, the offensive line first.
Every change is a default-off flag in `src/playbook/alignment.ts`, with
identity-when-off landmark call sites in `assign.ts`, `blocking.ts` and
`run-fits.ts`; no World, capacity or rating changes. Alignment places bodies; what
they then do is still decided by the existing controllers and physics.

**Question.** Where does the installed alignment put bodies that film does
not, and does placing them as tracked change any football mechanism?

**Operator.** `scripts/diag/align/snap.py` (offense, line, backs, front) and
`scripts/diag/align/defsnap.py` (secondary by coverage shell): one operator for
2022 all-22 tracking and sim common plays at frame 0 (the snap); x is yards
past the line, body centres. The NFL numbers below are that operator on
`nfl-plays.jsonl.gz`; coaching sources agree in kind (two-foot guard and
three-foot tackle splits, guards and tackles as far off the ball as the rule
allows, i.e. helmets breaking the center's waist).

| At the snap (p50) | 2022 NFL | develop (installed) |
| --- | --- | --- |
| OL splits C–G / G–T | 1.54 / 1.56 | 1.3 / 1.3 |
| Tackle to tackle | 6.2 | 5.2 |
| OL depth C / G / T | 0.29 / 0.83 / 0.98 | 0.55 flat |
| Inline TE split / depth | ~1.5 / 1.19 | 1.3 / 0.6 |
| #1 receiver room to sideline | ~13.5 (11 with a slot) | 6 to the boundary; 18 from the ball at most |
| Corner, press / off man / off zone | 1.3 head-up / 6.1, +0.2 / 7.0, +0.7 outside | 1.2 / 6–7, 0.7 inside always |
| Two-high safeties | ~13 deep, ~13 apart | 12 deep, 18 apart |
| Single-high safety | 14.6 | 13 |

## Scheme-sound alignment (user request: "people do it differently")

The first pass placed bodies at all-snap averages. Alignment is a coaching
decision made per call and per team, so the averages hid scheme. The 2022
snap frame now carries each player's PFF coverage assignment, route, run
concept, down and distance, formation and team. It comes from
`scripts/diag/align/nfl_snapframe.py`, raw data read once into ignored
`out/align/`. `scripts/diag/align/nfl_scheme.py` summarizes it; the sim side
is `scripts/diag/align/sim_scheme.ts`. Coaching sources agree on the rules
the numbers show.

**Varies with the call (now modeled, under the existing flags):**

| Job (PFF assignment) | NFL depth, shade | Rule |
| --- | --- | --- |
| Hard / flat corner (FL/FR: Cover 2, Tampa, half side of 6) | 4.0, +0.5; pressed 25% | reroute #1, funnel inside |
| Deep-third / outside-quarter corner (3L/R, 4OL/R) | 7.3, +0.8 | inside help: take away outside |
| Deep-half corner (2L/R) | 8.2, ~0 | a coverage's explicit preset still wins |
| Curl-flat corner (CFL/R) | 4.5, 0 | |
| Hook seat (slot) (HCL/R) | 4.5, −0.5 | |
| Man corner | press 1.3–1.6 (+0.15); off ~6 (2-Man inside −0.2) | |
| Any corner, #1 within 9 yd of the sideline | shade −0.2 | the sideline is the help |
| Halves safety (2L/R) | 14.0 deep, 6.9 off the middle, shading 0.36 of the ball's offset | |
| Quarters safety (4IL/R) | 12.0 deep, 6.65 off the middle, shading 0.45 | the run-fitting safety |
| Deep-middle (thirds) safety (3M) | 14.4, in the middle whatever the hash | |
| Man-free safety (DF) | 14.7, shading 0.34 toward the ball | |

Receivers set the #1's split by his route. The table is room to his
sideline, alone on his side / with other receivers:

| Route | Room (yd) |
| --- | --- |
| go, fade, comeback | 10.9 / 10.0 |
| slant | 10.2 / 9.9 |
| hitch, curl, stick | 14.0 / 10.6 |
| in, dig | 14.6 / 10.4 |
| post, seam | 14.6 / 11.2 |
| out | 14.7 / 15.8 |
| corner | 15.4 / 15.3 |
| crossers | 15.8 / 16.8 |
| flat, arrow | 15.1 / 17.6 |
| runs | 15.0 / 10.8 |

That is the coaching rule: wide to run vertical or inside, reduced to break
out or across. #2 stands at 0.61 of the #1's split.

The line tightens only on third or fourth down and a yard or less: tackle to
tackle 5.85 against 6.2 (×0.94; on first and second down and a yard, no
change). Under the stagger, guards and tackles stand deeper to pass:

| Line depth (stagger) | Dropback | Run |
| --- | --- | --- |
| Tackles | 1.10 (1.17 on 3rd/4th and long) | 0.97 |
| Guards | 0.90 | 0.82 |

**Constant on purpose:** line splits by run concept and on dropbacks
(inside zone, outside zone, power, counter, dropback all 1.54 ± 0.05 yd C–G).
Teams do not tip the call with the line. Defensive linemen 0.93–0.98 yd in
every situation. Off-ball backers 4.4–4.6 yd except 3rd/4th and short (4.0;
not modeled yet).

**People do it differently (team habits):** after removing the scheme, team
medians still differ by one sd of:
- receivers' room 0.8 yd;
- line width 4.9%;
- zone corners' depth 0.85 yd (press-bail teams to off teams: −2.5 to +1.2);
- deep safeties' depth 0.95 yd.

`alignStyle(team)` gives each team one fixed draw of each, seeded by its id
so roster generation is untouched. `game.ts` passes it to every snap; each
habit applies only under its flag. Man press share also differs by team
(14–74%); in the sim that comes from coverage selection (`manRate`,
coverage system), not alignment.

**Evidence for the scheme rules.** 8 games with `DEF_ALIGN`, `WR_ALIGN` and
`OL_SPLITS` and each team's habits, the same seeds as the earlier arms:
- Guard 12/12; flagged metrics 45 (42 for the averages pass).
- Pressure 17% and time to throw 2.45 s, both unchanged; run yards p50 2.9.
- Yards after catch p90 23.7 (27.5); contact broken on catches 21.8% (24.9).

One row moved the wrong way: man separation at 1.5 s, 1.56 → 1.25 yd
(develop 1.70, NFL 2.50). One targeted diagnostic, `scripts/coverage-matrix.ts`
on Cover 0, Cover 1, Cover 1 Off and 2-Man (fixed rosters, seeds and calls,
no team habits), gave this separation at the throw:

| Laws | Separation at the throw (yd) |
| --- | --- |
| Earlier averages | 1.81–2.29 |
| Scheme laws, `DEF_ALIGN` + `WR_ALIGN` | 1.85–2.34 |
| Scheme laws, `DEF_ALIGN` only | 1.85–2.30 |

The alignment rules do not tighten man coverage. The game-level shift is the
games diverging once anything changes (other calls and matchups), not a
mechanism. Sim man coverage is too sticky already on develop (1.70 against
NFL 2.50); that belongs to the coverage technique, not to alignment.

## `DEF_ALIGN` (off): the secondary as on film

*First pass; its single averages are replaced by the scheme rules above. Evidence below is for that pass.*

A pressed corner sits about head-up at 1.3 yd; off, he gives 6 yd in man and
7 in zone and takes the shoulder his technique plays (outside in zone, the
called shoulder in man). A receiver within 8 yd of the sideline is played from
inside: the sideline is the help. Two-high safeties 13 deep, 6.5 either side of
the ball; single-high 14 deep. Disguised looks still show the shown shell
(`alignDisguised` is unchanged).

8 games (seeds 101–108, develop profile + `DEF_ALIGN=1`): corners 7 deep with
+0.5 outside leverage in zone (was 6, −0.7), press 1.3; true two-high looks
13 deep and 13 apart (the shell measure's wider p50 comes from disguised
one-high looks, checked play by play). Mechanism report 46 → 39 flagged
metrics, guard 12/12; pass rows unchanged within noise (separation at 1.5 s
2.58 → 2.53, time to throw 2.40 → 2.45, pressure 20 → 18%).

## `WR_ALIGN` (off): receivers split as tracked

*First pass; its single averages are replaced by the scheme rules above. Evidence below is for that pass.*

A lone #1 keeps about 13.5 yd from his sideline wherever the ball is, about 11
with others to his side (minimum 8 from the ball); a #2 stands at 0.58 of the
#1's split (0.62 in trips) and a #3 at 0.40. 8 games with `DEF_ALIGN=1
WR_ALIGN=1`: receiver room to the sideline p50 11.7 → 13.5, split from the ball
17.6 → 12.6. Mechanism report 45 flagged, guard 12/12; pass rows unchanged
within noise. `qb-rusher-recording.test.ts` pins the installed receiver and
line geometry (its recorded scramble depends on it).

## `OL_SPLITS` (off): the line splits as tracked

*Origin: `OL_ALIGN` by the run-offense session on `claude/run-game-v3`
(tracked splits and depths, `scripts/diag/stretch/olalign.py` there). Ported
here and split into `OL_SPLITS` and `OL_STAGGER`.* That session's measurement of
`OL_ALIGN` (splits and stagger together) on its own profile, lab arms of 1,600
gap plays plus zone and shotgun:

- **Gap runs improve:** TVD vs NFL 18.1 → 12.9; pullers' lateral travel at
  0.5 / 1.0 / 1.5 s 0.3 / 1.4 / 3.1 → 0.3 / 1.7 / 3.5 yd (NFL 0.5 / 1.9 / 3.5).
- **Counter gets worse:** losses 6.0 → 11.2%.
- **Zone and shotgun get worse:** ace zone TVD 5.4 → 10.5; outside / wide
  zone medians 3.8 / 3.7 → 3.0 / 2.9; shotgun losses 5.8 → 8.7% (NFL 7.6).

Its reading is that zone blocking was built around the old, tighter splits.

**On develop the lab agrees, so `OL_SPLITS` is not proposed for
promotion.** `scripts/run-blocking-lab.ts` (30 reps per cell; ace, I-pro and
gun doubles; Over and Under; both flips; seed 7), `OL_SPLITS` off → on:

| Concept | Stuffs | Yards before contact | 10+ yd runs |
| --- | --- | --- | --- |
| Inside zone | 16.4 → 33.3% | 1.82 → 1.31 | |
| Outside zone | | 1.78 → 1.01 | 19.2 → 8.9% |
| Counter | 19.2 → 29.4% | 1.06 → 0.46 | |
| Power | | 1.55 → 1.41 | |
| Trap | 18.6 → 9.7% | | |

NFL zone and gap runs use the same 1.54 yd splits (scheme table above), so
zone works at those splits in the NFL. The sim's zone and counter blocking
do not yet: their landmarks, combinations and timing were built and checked
at 1.3 yd. That is run-blocking work (run-game owner), not alignment. The
flag waits on it. Lab means are raw physical plays, not league rates.

Center–guard 1.54, guard–tackle 1.56, tackle–inline end 1.52 (6.2 yd tackle to
tackle). Defensive techniques, gap landmarks (`gapY`) and the run-aiming points
installed against the 1.3 yd table (`lineOffset` in `assign.ts` mesh aim and
`blocking.ts` hole) are placed from the actual splits. With a tight end the C
gap landmark is the midpoint of tackle and end, as the live line picture
(`live-gaps.ts`) counts it; the first port used tackle + 0.65, which agrees
only at 1.3 yd splits.

Contracts with the flag on: the first run had 18 failures in 9 files.
- Fixed here: the C-gap landmark (two `live-gaps` checks). Two literal-geometry
  assertions now derive from the actual line: the A-gap opening width
  (`live-gaps.test.ts`) and the dual-TE core edge (`pass-installation.test.ts`).
- Pinned to the installed splits: recorded native-play witnesses whose
  recorded moment no longer occurs on a different line. These are
  `pass-cutoff-approach` P019, `planned-climb-fit`, `combo-strike-access`,
  `qb-rusher-recording` and the native Split Zone Tite helper in
  `zone-helper-check`. That scene was checked rather than assumed. On the
  installed line, RT helps Y on a 9 technique outside Y and RG blocks the
  B-gap tackle alone. On tracked splits, RG+RT double the B-gap tackle to
  the Mike and Y blocks the edge alone, the textbook zone combination. The
  check-helper mechanism the test witnesses is unchanged; its staged picture
  needs the old line.
- The 3 `baseline-runner` failures came from running with an unlisted ambient
  flag. Both flags are now listed in `config/baseline.json`.

8 games with `DEF_ALIGN=1 WR_ALIGN=1 OL_SPLITS=1` against the same with
`OL_SPLITS` off (seeds 101–108, 354 runs and 735 dropbacks):
- Mechanism report 45 → 42 flagged, guard 12/12.
- A wider surface gives the edge rusher a longer way around: time to
  pressure p50 2.6 → 2.8 s, pressure 19 → 17%.
- Run yards p50 3.1 → 2.8, p90 19.6 → 10.9 (NFL 3.0 / 10.0); yards before
  contact 1.2 → 0.7 (NFL 0.6).
- Engaged defensive linemen gain slightly more ground (driven back p50
  −1.3 → −1.6; NFL +0.2): wider gaps are harder to close with a down block.

These are single 8-game samples; the run-tail change is within what seed
noise has produced between arms here. Nothing moved against football sense,
and nothing was tuned toward these numbers.

## `OL_STAGGER` (off): the line stands off the ball as tracked

Guards 0.83 yd behind the ball, tackles 0.98, an inline end 1.19 (tracked
body centres; their helmets break the center's waist). The center is
tracked at 0.29, over the ball. Here the line of scrimmage has no ball length
and a body is a disc (radius up to 0.42), so at 0.29 he stood in the neutral
zone and every snap drew offside (7-4-5). He stands at 0.43, just clear of it.

The first census had 60 core failures in 20 files. Three causes:
- **The center's offside.** That alone produced all 29 rules and game
  witness failures (teammate contact, endzone provenance, official credit,
  holding, grounding and others): every snap was a foul.
- **Absolute depth landmarks tuned for the flat 0.55 line.** `lineDepth`
  now places them behind the actual line. Pass sets are measured from the
  lineman's own stance. Pull and trap paths run behind the tackles' heels,
  where before they ran through them. The defense's pull indicator
  (`blockingIndicator`) measures a guard's or tackle's drop from his own
  stance; at the flat `los - 0.65` a staggered guard already read as
  pulling. The draw presentation set (`los - 1.2`) stays: it is still
  behind every lineman.
- **Body depth read as rule status.** "Seven on the line" now reads the
  installed depth, as `presnap-rules` does. `pull-fit-plan` stages its
  pulling guard 0.65 behind his stance (38.8 on the installed line,
  unchanged). Eight recorded fixtures pin the installed line.

Core suite: 2,793 / 2,793 with `OL_STAGGER=1`, and with every flag on.

**Not proposed for promotion.** 8 games with all four alignment flags,
compared with the same three without the stagger:
- Guard 12/12; flagged metrics 42 → 46.
- Pass pressure 17 → 25%; time to pressure 2.8 → 2.5 s.
- OL depth given at 2 s 2.58 → 2.28; run rows unchanged within noise.

One targeted diagnostic (`scripts/diag/align/edgeset.py`, the same code on both
sources) finds the mechanism. The sim's tackles step **forward** to meet the
edge rusher:

| Tackle vs edge rusher | Meet time | Tackle depth at meeting |
| --- | --- | --- |
| Sim, flat line | 0.7 s | 0.3 yd (from 0.6) |
| Sim, staggered | 0.7 s | 0.4 yd (from 1.0) |
| NFL (18,181 reps) | 1.4 s | 3.5 yd (from 1.1; rusher 4.1 yd/s) |

So the stagger lengthens a forward trip the tackle should not be making.
`cutOffPoint` in `blocking.ts` sets at the earliest point on the rusher's
arc the tackle can reach first: an interception at the line, not a
vertical set that uses depth. That is a pass-protection decision that
predates this work. It belongs to the controller (and to the cutoff
owner's review), not to alignment. Promote the stagger after it.

## Not changed

QB depth (gun 5.0 vs NFL 4.6) was tried and withdrawn: 8 behavior scenes depend
on it. Off-ball linebacker width (1.8 vs 2.4–2.8 yd from the ball) and
defensive-line depth variety (0.9 fixed vs 0.7–1.3) remain.

## Tests

`test/def-align.test.ts`, `test/wr-align.test.ts`, `test/ol-align.test.ts`
(off: the installed spots exactly; on: the tracked spots, and techniques and
gaps between their blockers; `lineDepth` identity off and placement on).
Core suite on this branch (with `TIP_AWAY`): 2,793 / 2,793 with every flag
off, with `OL_STAGGER` alone, and with `TIP_AWAY`, `DEF_ALIGN`, `WR_ALIGN`,
`OL_SPLITS` and `OL_STAGGER` all on (`baseline.mjs --candidate`); typecheck
passes. Not run: `test:integration`, `test:all`, `test:data`.

## Reproduce

```sh
node scripts/baseline.mjs --candidate --flag DEF_ALIGN=1 --flag WR_ALIGN=1 -- node --import tsx scripts/mechanics/sim-export.ts --seed 101 --games 8 --out out/mechanics/sim-align.jsonl.gz
python3 scripts/diag/align/snap.py out/mechanics/sim-align.jsonl.gz
python3 scripts/diag/align/defsnap.py out/mechanics/sim-align.jsonl.gz
python3 -I scripts/mechanics/measure.py out/mechanics/sim-align.jsonl.gz out/mechanics/sim-align.json
python3 -I scripts/mechanics/compare.py --sim out/mechanics/sim-align.json --out out/mechanics/report-align.md --guard data/reviews/mechanics/guard.json
# the stagger arm adds --flag OL_SPLITS=1 --flag OL_STAGGER=1; the edge set operator on both sources:
python3 scripts/diag/align/edgeset.py out/mechanics/nfl-plays.jsonl.gz out/mechanics/sim-align.jsonl.gz
```
