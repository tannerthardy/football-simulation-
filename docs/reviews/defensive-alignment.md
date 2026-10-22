# Defensive pre-snap alignment: fronts, strength, box and shells against the look

2026-10-22, branch `claude/def-alignment` (PR #194), stacked on #190
`claude/run-defense-develop` (from accepted develop `d91c9014`). The user
reassigned defensive pre-snap alignment and the defensive front/check caller
to this branch and asked that defenses "know how to line up in a variety of
fronts and looks ... and all the checks". Everything here is default-off;
#190's `DEF_ALIGN`, `FRONT_ALIGN` and `SHORT_PACKAGE` are kept and built on.

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

## Not done, and why

- **Three-interior nickel looks.** Tracked bear and tite in nickel
  (10-15%) and three-man dime fronts need personnel the sim's nickel and
  dime (four linemen) do not have. The menu leaves those shares out rather
  than fake them.
- **Offensive motion and shifts.** The offense has none, so there is nothing
  to bump, travel or re-set the front against. The sources' rules are in
  the catalog (section 5) for when it does.
- **Coverage mix.** Cover 1 is 35% of the sim's dropbacks against 21%
  tracked. The caller multiplies PFF's league share (which already includes
  situations) by situational factors. That is a coverage-calling question
  with large pass-game consequences, left for its own change.
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
