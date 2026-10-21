# Pre-snap alignment on accepted develop (2026-10-21)

Branch work from accepted develop `d91c9014fe5e088f3f43e38236e967d68bd388b0`.
The user asked for realistic pre-snap alignment, the offensive line first.
Every change is a default-off flag in `src/playbook/alignment.ts`; no
controller, World, capacity or rating changes. Alignment places bodies; what
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

## `DEF_ALIGN` (off): the secondary as on film

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

A lone #1 keeps about 13.5 yd from his sideline wherever the ball is, about 11
with others to his side (minimum 8 from the ball); a #2 stands at 0.58 of the
#1's split (0.62 in trips) and a #3 at 0.40. 8 games with `DEF_ALIGN=1
WR_ALIGN=1`: receiver room to the sideline p50 11.7 → 13.5, split from the ball
17.6 → 12.6. Mechanism report 45 flagged, guard 12/12; pass rows unchanged
within noise. `qb-rusher-recording.test.ts` pins the installed receiver and
line geometry (its recorded scramble depends on it).

## `OL_SPLITS` (off): the line splits as tracked

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

Center 0.29 behind the ball, guards 0.83, tackles 0.98, an inline end 1.19.
This is what makes the line look like a line on film. With the flag on, 60
core contracts fail in 20 files (`OL_SPLITS` with its pins: none):
- 30 run-blocking scenes: pull clearance, observed-pull planner and cue,
  climb access, combo access, outside-gap outer body, center climb
  renumbering, the Tite helper and the P019 cutoff.
- 29 recorded native rules and game witnesses whose seeded events no longer
  occur: teammate contact, endzone provenance, official credit, Game rule
  composition, pass-contact foul, ball rules, catch caller, holding,
  grounding and the rusher recording.
- 1 installed contract: "seven on the line" counts bodies within 0.6 yd of
  the line, so a legal end at 1.19 reads as off it.

The flag is preserved for the run-game owner. It is not proposed for
integration.

What the stagger needs is identifiable: depth landmarks are absolute and tuned
for a flat line at 0.55.
- `blocking.ts` pull paths run at `los - 1.15` to `los - 1.4`, through
  staggered tackles whose backs sit near 1.3.
- The defense's pull indicator (`blockingIndicator` in `run-fits.ts`) reads a
  guard or tackle deeper than `los - 0.65` moving laterally as pulling. A
  staggered guard at 0.83 already stands deeper than that, so a zone step can
  read as a pull. `pullers` in the same file measures depth from the home spot
  and is unaffected.
- Pass sets step to `los - 0.6 - depth`.

These want line-relative depths (the depth analog of `lineOffset`). The
on-the-line contract wants a rule that does not read body depth. That is
controller work in the run-game owner's files.

## Not changed

QB depth (gun 5.0 vs NFL 4.6) was tried and withdrawn: 8 behavior scenes depend
on it. Off-ball linebacker width (1.8 vs 2.4–2.8 yd from the ball) and
defensive-line depth variety (0.9 fixed vs 0.7–1.3) remain.

## Tests

`test/def-align.test.ts`, `test/wr-align.test.ts`, `test/ol-align.test.ts`
(off: the installed spots exactly; on: the tracked spots, and techniques and
gaps between their blockers). Core suite on this branch (with `TIP_AWAY`):
2,791 / 2,791 with every flag off and with `TIP_AWAY`, `DEF_ALIGN`,
`WR_ALIGN` and `OL_SPLITS` all on (`baseline.mjs --candidate`); typecheck
passes. Not run: `test:integration`, `test:all`, `test:data`.

## Reproduce

```sh
node scripts/baseline.mjs --candidate --flag DEF_ALIGN=1 --flag WR_ALIGN=1 -- node --import tsx scripts/mechanics/sim-export.ts --seed 101 --games 8 --out out/mechanics/sim-align.jsonl.gz
python3 scripts/diag/align/snap.py out/mechanics/sim-align.jsonl.gz
python3 scripts/diag/align/defsnap.py out/mechanics/sim-align.jsonl.gz
python3 -I scripts/mechanics/measure.py out/mechanics/sim-align.jsonl.gz out/mechanics/sim-align.json
python3 -I scripts/mechanics/compare.py --sim out/mechanics/sim-align.json --out out/mechanics/report-align.md --guard data/reviews/mechanics/guard.json
```
