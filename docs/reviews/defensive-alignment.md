# Defensive pre-snap alignment: fronts, strength, box and shells against the look

2026-10-22, branch `claude/def-alignment` (PR #194), stacked on #190
`claude/run-defense-develop` (from accepted develop `d91c9014`). The user
reassigned defensive pre-snap alignment and the defensive front/check caller
to this branch and asked that defenses "know how to line up in a variety of
fronts and looks ... and all the checks". Everything here is default-off;
#190's `DEF_ALIGN`, `FRONT_ALIGN` and `SHORT_PACKAGE` are kept and built on.

**Candidate settings (user-approved, 2026-10-22).** After the run-defense
rerun (see Game check), the user approved turning on the combination it
measured. This branch's `config/baseline.json` sets thirteen flags to "1"
(`COVER_CALL` joined after its own game check, section 6):
- the alignment and calling flags: `FRONT_ALIGN DEF_ALIGN SHORT_PACKAGE
  FRONT_STRENGTH FRONT_MENU BOX_ALIGN DEF_PACKAGE SHELL_SHOW COVER_CALL`;
- #190's line set: `PAD_LEVERAGE DL_ANCHOR DL_FLATTEN SNAP_REACT`.

`DL_FLATTEN_WON` and `LB_LANDMARK` stay "0". Source defaults stay off, so
plain `npm test` and env-less runs are unchanged. The profile drives baseline
runs, verification and games. The user approved the whole set, including
the World-law flag `PAD_LEVERAGE` ("we're all the owner here"). The decision
was relayed to the main engine session (`claude/run-game-v3`), which already
runs it on. What remains is mechanical: an exact combined verification when
this lands in develop. The
run-defense session asked that its four flags stay in this config rather
than be flipped on #190, and noted that #190's `stepRunRep` line numbers
will move with its next change.

**Question.** Given the offense's look (personnel, attached ends, receiver
distribution, backs) and the situation, does the defense line up the way NFL
defenses do: which front, set to which side, who stands in the box, who
answers each inside receiver, how deep the backers are, and which shell it
shows? Alignment places bodies. What they do after the snap is still decided
by the existing controllers and physics.

**Rule for the work.** Alignment comes from the call against the look, the
player and the situation, not from target values. Where a rule is a
frequency (a coordinator's front or package mix, a disguise rate), it is the
league's calling habit taken from tracking, in the way the caller already
takes coverage shares from PFF charting. Every new rule is a default-off
flag, and is identical when off.

## Measurement

One operator reads both sources. Each has the same columns, and the
operator uses body positions only; PFF labels are not used for the defense:

- `scripts/diag/align/nfl_snapframe.py`: every player at the snap. 2022,
  Big Data Bowl 2025 weeks 1-9, 15,409 classifiable snaps
  (`npm run nfl:fetch` source `bdb2025-2022`; raw data stays in ignored
  `data/raw/`).
- `scripts/diag/align/sim_snapframe.ts`: the same columns from the sim. It
  uses real coordinators and a real `PlaySim` set-up, including checks,
  stems, creeps and alignment scatter. Nothing is ticked after the snap.
  Situations are the 2022 plays' downs, distances and field positions. There
  are six generated teams, two of each defensive scheme.
- `scripts/diag/align/deflook.py`: per offensive look (personnel, receivers
  per side, attached ends, gun or under center), it reports:
  - the defensive package;
  - the interior front family, from positions in line units (0 the ball, 1
    a guard, 2 a tackle). This makes tracked 1.54-yd and sim 1.3-yd splits
    comparable. `fronts.py`'s fixed-yard labels split ordinary NFL Over and
    Under shapes into "2i/4i" and left more than half as "other";
  - the 3 technique's side relative to the attached end, the receivers, the
    back and the field;
  - box count, backers' count, depth and width, and the end man's width;
  - who answers each detached inside receiver;
  - the deep count.

  `--by down` and `--by front` group it differently.

`fronts.py` and the sim export's called front are ported unchanged from
`claude/run-game-v3`. The sourced catalog behind the rules is
[defensive alignment sources](../references/defensive-alignment-sources.md):
historic NFL defensive installs (1990-2005 Eagles, Jets, Bears, Buccaneers,
Falcons, Bengals, Ravens, Giants, Panthers, Patriots, 49ers) and modern
analysts.

## What tracking shows, and the rule each finding became

Unless noted, the sim comparison is #190's flags on
(`FRONT_ALIGN DEF_ALIGN SHORT_PACKAGE`) against those plus all five new flags,
4,000-6,000 snaps each.

### 1. The front's strength is the tight end's side (`FRONT_STRENGTH`)

- **Sources.** The 1997 Jets book: "THE DEFENSIVE FRONT STRENGTH IS ALWAYS
  DETERMINED BY TE LOCATION"; coverage strength is the two-receiver side.
  The 1998 Bears book: "Run strength is to tight end; pass strength is to 2
  receivers."
- **Tracking.** In 4-down Over and Under fronts the 3 technique is on the
  attached end's side 82-86% of the time, and 86% against trips away from
  him (11 3x1, TE away). The remainder are Under calls, which put it away by
  design.
- **No single attached end.** There is no league rule: the 3 technique sets
  toward the back, the field or the receivers about half the time each.
  Teams differ: toward the receivers runs from 0.34 (TEN) to 0.84 (NE),
  league about 0.6.
- **Was.** The sim set the front by the coverage's rule (more receivers,
  then the end, then the field). Against I-twins, the 3 technique and the
  Sam went to the twins.
- **Rule.** The front sets to the one attached end. Without one, each team
  has a lean (`alignStyle` `passingStrength`), and each call carries the
  pick. Front players' called sides follow the front: blitz gaps, a dropping
  lineman's zone, a backer's man preferences. Defensive backs keep the
  coverage's. The apex walk-out goes to the backer on the receivers' side.
- **Result.** With an attached end, the sim's 3 technique is on his side
  74-78% of the time (#190's flags: 75-80% in 11 personnel, but 27% against
  21, where its Under-heavy base menu set it away).

### 2. The fronts teams call (`FRONT_MENU`)

Interior families from tracking, by defensive personnel and moment. Teams
whose base personnel shows three interior linemen on 45% or more of snaps
are grouped as 3-4.

| | Over | Under | Even (both B gaps) | Bear (nose, two 3s) | Tite (nose, two 4i) | 5-0-5 odd |
|---|---|---|---|---|---|---|
| 4-3 base, early | 45-50% | 18-24% | 0-7% | 13% | 7-12% | - |
| 3-4 base, early | 3-9% | 15-18% | - | 39-48% | 13-24% | 2% |
| nickel, early | 45-52% | 15-19% | 8% | 5-12% | 2-6% | - |
| nickel, third down | 14-20% | 11% | 20% | 6-7% | 6-8% | 3-5% |
| dime, third down | 11-13% | 9-11% | 21-23% | 7-11% | 7-13% | 7-14% |

- **Was.** The sim had no even front. Its 3-4 base fronts were the 5-0-5
  odd and the tite, and it played Over and Under on about 90% of nickel
  snaps.
- **New fronts.** 4-3 Even (both tackles in the B gaps; the backers own the
  A gaps), 3-4 Bear (3-0-3) and 3-4 Under, each with one owner per gap.
- **Caller weights.** Under the flag the caller weights fronts by scheme,
  personnel and moment (early, third, short) from these shares.
- **Backers.** Off-ball backers stand at the tracked medians for the
  called family and the number off the ball. Two nickel backers stack the
  B gaps (Will -1.4, Mike +1.7 line units, 4.6 deep) instead of the Mike
  over the strong A gap. Three base backers keep the Mike in the strong A
  gap (+0.5) between the Will (-1.9) and the Sam (+2.7).
- **Mugs.** On third and 4 or more, nickel and dime walk backers into open
  A gaps, at the tracked 1.2 yd: one on 12% of snaps, two on 5%. Each still
  plays his called job and pays for any drop with his own feet. A mug fills
  only A gaps no lineman occupies.
- **Result.** Against 11 personnel: Over 40-58%, Under 16-36%, Even 15-21%.
  Against 21: Over 40%, Bear 28%, Under 14%. Backer width: median 1.9-2.2 yd
  (tracking 2.2-2.7; #190's 1.4-1.6).

### 3. Every inside receiver is answered; the box follows (`BOX_ALIGN`)

- **Tracking.** A detached weak #2 against 2x2 or empty has nobody over him
  or at his apex on 6% of snaps. When a backer answers, he stands 1.8-1.9 yd
  inside a #2 who is 4-5 yd outside the surface, or 2.6 inside a #3, 4.5-4.8
  deep. Against empty, nickel inside backers are in the box about half the
  time.
- **Was.** In zone calls the sim left that #2 unanswered on 26% of 2x2
  four-wide snaps and 48% of empty snaps.
- **Rule.** In a zone call, an unanswered detached #2 or #3 gets the nearest
  off-ball backer that is not mugged or blitzing, at the apex halfway to the
  next receiver inside or the end of the line, 4.6 deep. Man defenders
  already align on their men.
- **Result.** Unanswered: 2-3%. The box against empty is 4 on 42% and 3 on
  32% (tracking 3 on 39%, 4 on 36%), from mostly 5.
- **Situation (tracking: median depth by down and distance; end men's width
  on passing downs).**
  - Backers are half a yard tighter on third or fourth and 2 or less
    (tracked 4.0-4.1 against 4.6).
  - They are half a yard looser on third and 7 or more (75th percentile 5.6
    against 5.2; "LBs loosen up", 1999 Buccaneers).
  - End men widen 0.4 yd on third and 3 or more (tracked 2.4 yd outside the
    surface against 1.9-2.1 early; "closed end widens", 1999 Buccaneers;
    "open end wide 5", 2005 Ravens).
- **The down safety (added after the game check).** The run-defense
  session reported DBs making first contact on 39% of sim runs (tracked
  23%) and lighter boxes. Against 11 personnel with one high safety, the
  sim's box held 5.6 defenders against under-center runs (tracked 6.3).
  The missing man was the down safety. In tracked Cover 3 against an
  attached end, he stands within 2 yd of the end on 70-73% of snaps: a
  median 1.5 yd outside him, 4.4 deep under center and 5.2 in the gun. That
  holds in 11, 12 and 21 personnel. Without an end on his side, he is 2.7
  (under center) and 3.9 (gun) yd outside the tackle, 5.1 and 5.8 deep. The
  installed spot (3 yd outside the end of the line, 7.5 deep) kept him out
  of the box on every such snap. The rule moves the one-high down safety to
  those medians. Post-snap he still runs to his zone landmark or his man,
  so a curl-flat safety starting over the end has farther to go to the
  flat; that cost is the one tracked defenses accept.
  - Result: over the end on 64-77% of one-high snaps with an end (tracked
    63-76%). The box against 11 under-center runs is 6.09 (tracked 6.34);
    in the gun 5.48 (5.60). All runs: 6.27 (tracked 6.23).
  - Not alignment: against 12 and 21 personnel the box is now heavier than
    tracked (7.03 against 6.44; it was 6.76). The cause is in the offense.
    The sim's 12 sets attach both ends with no flexed end or wing (tracked
    12: about one receiver per snap 2-9 yd outside the end of the line;
    sim: none). Its wide receivers stand 14+ yd outside the end of the line
    1.1-1.5 times per snap, against 0.1-0.4 tracked. `WR_ALIGN` (off,
    another owner's) covers the splits. Defenders align to the receivers they
    see, so compressed formations compress the defense.

### 4. The package answers personnel and situation (`DEF_PACKAGE`)

| Against | Moment | Tracked | Sim with #190's flags | With the flag |
|---|---|---|---|---|
| 10/11 | early | nickel 85, dime 8, base 6 | 85 / 6 / 9 | 87 / 8 / 5 |
| 10/11 | third, 3-6 | nickel 69, dime 29 | 82 / 6 | 69 / 31 |
| 10/11 | third, 7+ | nickel 57, dime 40 | 50 / 46 | 60 / 40 |
| 12 | early | base 56, nickel 43 | 53 / 47 | 48 / 51 |
| 21+ | early | base 65, nickel 34 | 89 / 11 | 53 / 45 |

Goal-line and short-yardage packages (`SHORT_PACKAGE`) are still called
first. A nickel-first team calls base a third as often.

### 5. The shell shown depends on the coverage (`SHELL_SHOW`)

Deep defenders at the snap against PFF's post-snap coverage, on dropbacks:

| Coverage | Tracked: shows the other shell | #190's flags | With the flag |
|---|---|---|---|
| Cover 3 | two high 42% | 32% | 48% |
| Cover 1 | two high 26% | 5% | 21% |
| Cover 0 | someone deep 36% | 3% | 26% |
| Cover 2 | one high 28% | 31% | 35% |
| Quarters | one high 16% | 33% | 16% |
| Cover 6 | one high 11% | 35% | 14% |

- **Rule.** The coordinator's habit and his safeties' recognition scale the
  tracked rate. Two-high trees disguise their one-high calls half again as
  often.
- **Disguised man safety.** He may now show the deep look (at most 12 yd)
  and come down at the snap, if that spot is on his man's side of the ball
  and within 8 yd of him. Previously `alignDisguised` kept him at his man's
  depth so that the rotation could not be free. In this engine it is not
  free: he starts deep and has to run. A first version took the look's
  spot across the field from his man; the existing shadow-trade test caught
  it.
- **Checked to the formation (added after the game check).** The
  run-defense session found two-high shells on far more sim runs than
  tracked ones. The coverage *called* was not the cause: against the
  quarterback under center the sim called two-high 32% of the time on early
  downs, tracking 30%. What differs is what the secondary *shows*. Tracking
  (early downs, deep defenders at the snap):

  | Called | Shows the other shell: gun | under center | empty |
  |---|---|---|---|
  | one-high | 35% | 13% | 43% |
  | two-high | 19% | 30% | 13% |

  The sim disguised at the gun's rates against everything (32% and 22%
  under center). The table's rates above are the gun's, since most
  dropbacks are from the gun. The caller now receives the formation it sees
  before the snap. Its disguise rate is scaled ×0.37 (one-high) and ×1.6
  (two-high) against under center, and ×1.2 and ×0.7 against empty. Football
  reason: against a run formation, the eighth defender is wanted in his fit
  before the snap, not rotating down after it. Result
  (`sim_snapframe.ts`, all flags):
  - under center: one-high calls show two-high 12% (was 32%); two-high
    calls roll down 35% (was 22%);
  - gun: unchanged;
  - empty: 48% and 15%;
  - two-high at the snap on all runs: 40% → 32% (tracked 31%);
  - dropbacks: 44% → 42% (tracked 52%, the Cover 1 overcall below).

  The coverage call itself also depends on formation in tracking (Cover 3
  is ×1.33 against under center, quarters ×1.5 against empty, relative to
  dropbacks). The sim's call does not, but its under-center share already
  matches. Its gun gap is the Cover 1 overcall, so this belongs with that
  coverage-mix change.

### 6. The coverage call (`COVER_CALL`)

Taken on at the run-defense session's request: the man/zone mix the throw
reaction sees.

- **Tracking (PFF on 2022 dropbacks).** Early downs: Cover 1 18%, Cover 3
  37%, quarters 15%, Cover 2 15%, Cover 6 11%, Cover 0 3%. By the
  quarterback's alignment on early downs, Cover 3 is 34% from the gun, 47%
  under center and 31% against empty; quarters is 23% against empty.
- **Was.** The sim called Cover 1 on 34% of early downs, and its call did not
  depend on formation. Three causes:
  1. **The matchup read was offset.** The man weights multiply by
     exp((corners' man − receivers' route) / 25). Generated corners' ratings
     sit 7-10 points above receivers' (a selection effect, the best two man
     corners against the average receiver on the field), so a league-average
     matchup read as a 1.44× man edge (mean over 64 generated pairs).
  2. **Early downs used the league-wide shares.** The base shares include
     third downs, and the third-down factors are relative to them (Cover 1 ×2
     on third and 3-6 gives 44%; tracked 45%). First and second down had no
     factor of their own.
  3. **No formation check.**
- **Rule.**
  - Each group is read against its league norm: the top two man corners 79.3;
    the receivers on the field 69.6-76.6 by personnel. The generator's means
    carry a guard test.
  - Early downs get their tracked ratio to the whole (Cover 1 0.82, Cover 0
    0.75, 2-man 0.5, Cover 3 1.12, quarters 1.07, Cover 6 1.1).
  - The call is checked to the formation seen, as tracked early-down ratios to
    the gun: under center Cover 3 ×1.38, quarters ×0.8, Cover 6 ×0.6, Cover 2
    ×0.75, Cover 0 ×1.3; against empty quarters ×1.5, Cover 1 ×0.78, Cover 0
    ×1.7.
- **Result (snap frame, all flags).**

  | Early downs | sim before | sim now | tracked |
  |---|---|---|---|
  | Cover 1 | 34% | 23% | 18% |
  | Cover 3 | 29% | 39% | 37% |
  | Cover 3, under center | 29% | 47% | 47% |
  | Quarters | 11% | 13% | 15% |

  Third-down mixes are about unchanged. Across 64 coordinators at first and
  10, Cover 1 is 26% → 17%. Cover 2 and Cover 6 stay a few points under
  tracking. They follow the coordinators' coverage systems, and I stopped
  rather than fit them.
- **Games.** Eight games, seed 101, same source hash (`5e85f5eb`): the
  candidate profile (twelve flags) with `COVER_CALL` off and on, run through
  `baseline.mjs --candidate`. Guard 12/12 in both.

  | | `COVER_CALL` off | on |
  |---|---|---|
  | Run yards, mean | 6.64 | 6.60 |
  | Broke contact | 12.9% | 13.3% |
  | Yards after catch, mean / p90 | 10.7 / 33.9 | 10.4 / 33.7 |
  | Catches against man | 125 | 66 |
  | Flagged (off + check) | 115 | 117 |
  | Off | 32 | 38 |

  The flags that change are run-concept and box sub-groups (n 30-60 each),
  moving both ways (gap pulls, outside zone and box-7 YAC improve; inside
  zone and duo get worse). That is the games diverging once the coverage
  draw changes, not a mechanism. Man coverage's YAC tail (p90 17.8 → 35.5)
  rests on 66 catches, while zone's improves (38.9 → 32.9). Both belong to
  the after-catch tackling item on the workboard. The man/zone mix moves
  toward tracking with no material change to the top line, so `COVER_CALL`
  joins the candidate settings. The control arm's receipt reads "inputs
  changed" because a docs commit landed mid-run; its command exited 0 on the
  same source.

### 7. The A-gap man stands at the team's spot (`AGAP_ALIGN`, off)

Asked by the run-game session: on runs, the sim's centre is covered (a front
man within 1 yd of him laterally at the snap) far more often than tracked,
and is that the calling mix or the alignment within a front?

It is the alignment. In 4-down over/under, tracked centres are covered on
48-51% of snaps and the sim's on 96-97%. The calling mix is a smaller
factor: `FRONT_MENU` calls even-wide 12% of the time against tracked 3%,
which lowers coverage, not raises it. `FRONT_ALIGN` put the 1 technique on
the centre's shoulder (0.57 yd, a median 0.47 of the centre-guard split on
the sim's 1.3-yd line). The tracked A-gap man stands a median 0.69 of the
split off the centre (p10/90 0.33/0.91), about 1.0 yd.

What sets that spot is mostly the team. Team medians run from 0.30 (NYG, a
shade on the centre) and 0.35 (NE) to 0.82 (LV, PHI, a 2i on the guard),
sd 0.14, against a within-team sd of 0.23. Other factors move it much less:
- player medians track the team's (sd 0.145);
- weight barely matters (-0.017 per 10 lb, r -0.23 over 66 players);
- down, personnel, and run or pass move the median by under 0.06.

**Rule.** With `FRONT_ALIGN`, a lineman's 1 technique stands at his
team's habit along the actual centre-guard split. The habit is
`alignStyle`'s `aGap`, drawn once per team as N(0.63, 0.14) clamped to
0.30-0.85, after the earlier habits so they keep their values. A defense
with no habit uses 0.63. The gap is unchanged. Off: the shoulder.

| Snap frames, 6,000 situations, profile | covered, over | covered, under | A-gap share p10/50/90 |
|---|---|---|---|
| tracked | 48% | 51% | 0.33/0.69/0.91 |
| `AGAP_ALIGN` off | 97% | 96% | 0.32/0.47/0.65 |
| `AGAP_ALIGN` on | 85% | 83% | 0.39/0.61/0.80 |
| on, with `OL_SPLITS` | 56% | 53% | 0.41/0.63/0.79 |

On runs in over/under: 98% off, 84% on, and 55% with `OL_SPLITS`, against
56% tracked. The rest of the gap is the line itself. The sim's 1.3-yd
splits (tracked 1.51) leave a 0.63 share at 0.82 yd, inside the 1-yd test;
#190's `OL_SPLITS` (off in the profile) places the tracked splits. The
spread stays narrower than tracked because the within-team scatter
(sd 0.23) is not drawn.

Tests: `test/agap-align.test.ts`. #193's `cover3-cover2-rules` pins the flag
off: in the vertical-curl scene, the wider 1 technique sends the rush
another way and the far end sacks at 2.9 s, before the scene's 3.4-s read.
Core: 2,974/2,974 plain and under the profile with `AGAP_ALIGN=1`.

## Contracts with the flags on

The core suite with all five flags and `FRONT_ALIGN` on: 3,106 of 3,110 pass.
The 3 baseline-runner checks fail in this container only because it runs
Node 22.22.0 (the `.nvmrc` pins 22.23.3); they also fail with every flag off.
Some scenes are staged on the installed alignment, and they pin the flag
that moves their precondition, as #190 did:

- combo-strike-access: `FRONT_MENU`.
- run-force-ownership: `BOX_ALIGN`. Zone seats are dealt after the
  walk-outs, so the Will is no longer the Buzz curl-flat player the scene
  stages. In four ordinary scenes (ace and doubles against Cover 3 and 4,
  empty against Cover 3) every run-fit job is identical with the flag on
  and off.
- long-yardage-run: `BOX_ALIGN`. The fixture's contract is that the
  situation changes only roles.
- front-align's install-weight tests: `FRONT_MENU` overrides them.

Off, every new flag is identical. Its own tests check this, and the full
suite passes with every flag off.

## Game check

Eight games, seed 101, at `3735ec7f`. **A**: #190's flags
(`FRONT_ALIGN DEF_ALIGN SHORT_PACKAGE`). **B**: A plus all five new flags.
Collected with `scripts/mechanics/sim-export.ts` (the engine was unchanged
during collection). Both arms keep the guard at 12/12. Flagged metrics: 44 in
A, 50 in B.

| Runs | NFL 2022 | A | B |
|---|---|---|---|
| Yards, median [IQR] p90 | 3.0 [1, 6.7] | 3.00 [0.53, 6.66] 18.8 | 3.95 [1.17, 7.72] 17.9 |
| Yards after contact, median | 2.40 | 1.71 | 2.02 |
| Broke contact | 12.5% | 13.0% | 18.8% |
| Box 7: yards, median | 3.0 | 2.51 | 4.19 |
| Box 6 or fewer: yards, p90 | 11.0 | 11.6 | 18.7 |
| Inside / outside zone / gap / Duo, median | 3.0 each | 3.6 / 1.4 / 2.9 / 5.1 | 4.0 / 2.5 / 3.5 / 6.6 |

**One targeted diagnostic for the adverse run result.** Both checks used
the same seeds.

- **Matched lab** (`scripts/run-blocking-lab.ts`, 15 reps per cell, seed 7,
  fixed fronts and Cover 3). With the calls fixed, `FRONT_MENU`'s backer
  placement lowers lab yards per carry (10.93 to 9.59; Over 10.2 to 6.9).
  Against these fixed calls on first and 10, `BOX_ALIGN` changes nothing,
  because nobody walks out. So the placement is not the cause.
- **Leave-one-out game arms** (median run yards):
  - all five: 3.95
  - without `FRONT_MENU`: 3.42
  - without `SHELL_SHOW`: 3.58
  - without `DEF_PACKAGE`: 3.79

  No single flag accounts for it.

**Reading.** The rise comes from the defense *calling* more like the NFL:
lighter packages against heavy personnel, two-high shells as often as
tracking shows, fewer Under fronts in base. It does not come from the
alignment of any one front. The likely mechanism is that the sim's run
defense (fits, pursuit, tackling) was developed against an over-stacked,
base- and Under-heavy picture that hid its open-field weaknesses. The
broke-contact rate rising to 18.8% (tracking 12.5%) points the same way.
This is **inconclusive as a football improvement**: the presentation is
demonstrably closer to tracking, but the game result moved away on run yards
and broken contact. It is a tradeoff with a named risk, not a promotion
case.

**Next question,** for the run-defense and contact owners: with tracked
boxes and shells, why do first contacts in space fail more often? Check
pursuit angles and solo tackles against the 12.5% tracked broken-contact
rate, using the B arm's plays (`out/mechanics/sim-B.jsonl.gz`). Re-tuning
the alignment back toward the old boxes is not the fix.

**Answer (run-defense session, `docs/reviews/run-defense-develop.md` on
#190).** Their reruns used the same eight flags plus #190's recommended line
set (`PAD_LEVERAGE DL_ANCHOR DL_FLATTEN SNAP_REACT`), seed 101, 8 games,
`baseline.mjs --candidate`. Guard was 12/12. The run-defense session's
operators measured it; tracked values use the same operators.

| Runs | B + line, ecba815 | B + line, f863ea2 | Tracked |
|---|---|---|---|
| Broke contact | 12.7% | 12.9% | 12.5% |
| Yards, median [IQR] p90 | 3.46 [1.02, 6.14] 11.7 | 3.19 [0.66, 6.35] 12.2 | 3.0 [1, 6.7] |
| DB makes first contact | 39% | 29% | 23% |
| 6-man box | 40% | 35% | 33% |
| Two deep (10+ yd) at the snap | 50% | 38% | 26% |
| Report flags | 37 | 32 | |

Most of the arm-B rise was line play that #190's set addresses; the
lighter, tracked looks exposed it. Their first split led to the two later
changes here: the shell checked to the formation (`SHELL_SHOW`) and the
down safety's spot (`BOX_ALIGN`). Those moved first contacts and shells
toward tracking without changing broken contacts. Still open:
- Duo DB first contact is 44% (tracked 27%, n=36), DBs 4.5 yd deep.
- Two deep in games is above tracking on their 10-yd operator. The
  snap-frame measure here is 32% vs 31%; the game's play mix differs.
- The receiver splits and 12 sets listed under section 3.

## Not done, and why

- **Three-interior nickel looks.** Tracked bear and tite in nickel
  (10-15%) and three-man dime fronts need personnel the sim's nickel and
  dime (four linemen) do not have. The menu leaves those shares out rather
  than fake them.
- **Offensive motion and shifts.** The offense has none, so there is nothing
  to bump, travel or re-set the front against. The sources' rules are in
  the catalog (section 5) for when it does.
- **Coverage mix.** Now `COVER_CALL` (section 6). Early-down Cover 1 is 23% in
  the snap frame against 18% tracked. Cover 2 and Cover 6 are a few points
  under tracking.
- **Formation library.** It has no 3x1 with the end attached away from the
  trips (423 tracked snaps), so `FRONT_STRENGTH`'s main case appears in the
  sim only as I-twins.
- **Gap fits.** The installed Under, wide-9 and tite fronts already give two
  front players one gap (Under's weak B, the wide nine's and tite's B gaps).
  They are unchanged. The new fronts own each gap once.
- **Over Sam.** `FRONT_ALIGN`'s Over Sam "90" (1.2-1.7 yd outside the end,
  per the Colts install) overrides the tracked third-backer median of 2.7
  line units (between tackle and end) when both flags are on.
- **Backer depth spread.** It is still narrower than tracking (sim
  p25-p75 about 0.5 yd, tracking about 1.4 yd). Mugs, apex players and
  situation explain part of it; individual depth is not modeled.
- **Edge width on dropbacks (checked, no gap found).** On each side, the
  widest front player's lateral distance outside the tackle reaches 1.5 yd
  or more on 88-96% of tracked dropback sides, by TE look and down (median
  2.3 yd with no TE on that side, 3.0 with one). The sim reaches it on
  84-96% with #190's flags (median 2.2 / 2.7) and on 90-100% with this
  branch's flags too (median 2.2-3.1). A reported 84% vs 51% gap
  (`docs/reviews/pass-set-contact.md`, playbook branch) was measured on
  develop with no alignment flags. This operator reproduces it there: 51%
  with an end on the side, 58% without (median 1.5 / 2.1 yd;
  `sim_snapframe.ts` with no flags, 3,000 snaps). #190's `FRONT_ALIGN`
  closes it, and nothing on this branch is needed.

## Reproduce

```sh
npm run nfl:fetch -- bdb2025-2022                     # raw data, once (~8 GB)
python3 -I scripts/diag/align/nfl_snapframe.py        # out/align/nfl-snap.csv.gz
env FRONT_ALIGN=1 DEF_ALIGN=1 SHORT_PACKAGE=1 FRONT_STRENGTH=1 FRONT_MENU=1 BOX_ALIGN=1 DEF_PACKAGE=1 SHELL_SHOW=1 \
  node --import tsx scripts/diag/align/sim_snapframe.ts --n 6000 --out out/align/sim-snap-all.csv.gz
python3 -I scripts/diag/align/deflook.py out/align/nfl-snap.csv.gz out/align/sim-snap-all.csv.gz --min 150
python3 -I scripts/diag/align/deflook.py out/align/nfl-snap.csv.gz --by down
```

Tests: `test/front-strength.test.ts`, `test/front-menu.test.ts`,
`test/box-align.test.ts`, `test/package-shell.test.ts`.
