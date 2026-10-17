# Saved-game accounting repairs and evidence meaning

**Three small result-accounting candidates are ready for independent review.**
They preserve the saved football and fix credit after its result is known.
Base: accepted `70b4db6a3ef53acc1a0e90cd055f1087205daa30`; tested source
`ccd642494c9d33c43bdfdf5f752927869c1ad93fa0ca6f4294d4c6a6dcdd1960`.
No controller/physics/default change, collector, roster sweep or game rerun.
Current develop remains unchanged. Integration retains acceptance and batching.

## Repairs

| Issue / saved witness | Correction | Opposing control |
| --- | --- | --- |
| GAME-004 / MEAS-DA-01, G1-P156 | Team giveaway credit is recorded with official stats, before a defensive TD can return. A1 gets one giveaway for the pick-six; the returner's own fumble/recovery does not add another. Historical A1 team8 versus QB/defender9 INTs reconciles to team9. | G1-P141 ordinary interception with an offensive return tackler; G1-P137 offensive scoring catch; existing ordinary turnover/score/nullification game-rule controls. |
| GAME-004 / MEAS-DA-02, G2-P140 | Preserve underlying prethrow-QB sack/tackle credit before the safety branch; explicit passer A2-QB2 and tackler/sacker H2-EDGE4. Credit a five-yard loss to the goal plane while retaining physical endX7.502919 and possession segments. No attempt, scramble or pressure cue is invented. | G2-P093 same-QB/sacker ordinary field sack; declared scramble safety, unassisted out-of-bounds safety and defensive interception touchback controls. |
| GAME-004 / MEAS-DA-03, eight saved scrambles | Credit an existing `hurriedBy` actor once outside the pass-versus-rush yardage split. Rush yardage stays rushing, with no extra sack or attempt. | G2-P038 ordinary same-pair pressure/sack; G2-P140's absence of a pressure actor. |

Eight pressure IDs: **G1-P127/P162/P187, G2-P083/P138, G3-P032/P142,
G4-P082**. The original 51 controller cues and 43 player credits imply 51
player credits after applying these eight local repairs. This does not broaden
pressure detection. Five ordinary sacks without that specific cue remain
without invented pressure credit. Source cues are not an NFL pressure rate.

## Safety convention established before choosing the loss

The physical stop, statistical loss and two-point score are distinct. The
repository already bounds offensive touchdown credit at the opponent goal
plane while retaining physical endX. This candidate applies the corresponding
own-goal-plane boundary to a non-turnover safety: `yards = OWN_GOAL_X - los`.
`offenseYards`, net team passing and passer sack-yard credit use that same loss;
`endX` and segment endpoints remain physical.

This follows the official statistical distinction, not an inferred desired
loss. The [NFL Guide for Statisticians](https://www.nflgsis.com/gsis/documentation/stadiumguides/guide_for_statisticians.pdf)
separates sacks from attempts and deducts sack losses from team net passing.
An [official Rams–Cardinals gamebook, December8,2013, PDF page11](https://static.www.nfl.com/image/upload/v1677630838/gamecenter/10012013-1208-10a5-8498-12f7f22e31e3.pdf)
records Clemens at own5 sacked in the end zone with a **five-yard** loss.
The repository retains fractional yards elsewhere; this change does not adopt
NFL whole-yard rounding or extend classification to new sack situations.

For G2-P140: LOS15, own plane10, physical stop7.502919 → **credited−5.00**,
not historical native−7.50 and not the old box0. H2's two points remain. A2's
QB gains one sack/5 sack yards, H2-EDGE4 one sack/tackle; individual passing
yards and pass attempts stay unchanged. The original all-team G2 box918.42
would become913.42; the old log sum910.92 differs because it includes−7.50.
Applying the new goal-plane credit to that saved log also yields913.42. These
are accounting projections on fixed saved inputs, not recollected game totals.
The safety completes the original dropback identity: 301 attempts +20 sacks
(including this safety) +19 scrambles =340 official dropbacks.

## Keep movement and credited measures separate

The six end-zone catches are **G1-P137, G2-P067, G3-P149, G4-P048/P099/P164**.
Each catch possession segment starts and ends at the same physical coordinate:
**physical catch-to-segment-end advance is zero**. Their historical native
`completedAirYards` uses actual catch depth beyond the goal plane, while total
reception credit stops at the plane. The subtraction produces native YAC
total **−22.8409809094yd**, an accounting residual, not backward running.
The receipt preserves physical catch depth, native credited YAC and an explicit
goal-plane decomposition (credited catch depth to110 plus0 credited post-catch
advance). **YAC runtime is not changed in this repair.** Do not silently swap
the decomposition into the old YAC distribution. G2-P024 remains the distinct
real backward displacement control: catch105.034315→segment end102.444197,
physical/native YAC−2.590118yd.

**First contact to stop is elapsed time, not continuous hold.** G3-P146 has
contact4.05→stop12.75, elapsed8.70s, but its first hold breaks4.50 and the later
wraps begin12.00/12.05. G2-P063's3.55→7.80 is a4.25s **interception-returner**
interval, not offensive rushing contact. Original audit exposure357/531 valid
official intervals remains unchanged. Snapshot links alone cannot recover a
full continuous restraint history; do not use this interval to tune grip.

**Prefixes are not known football endings.** G3-P003/P087/P141 and G4-P142
retain their25s cap, absent exchange and unknown terminal gain. Administrative
native losses remain in the archived record but not known-ending comparisons.
All740 original index IDs, native values, sample-validity and panel membership
are preserved. The physical/credit distinctions do not reclassify a selected
panel as a simulator-wide defect rate.

## Review and composition

The three runtime patches apply **independently** to accepted70b4db6 with the
same saved-input scaffold; `git apply --cached --check` verifies each scope.

| Portable file under `data/reviews/current/game-result-accounting/` | Scope |
| --- | --- |
| `00-saved-fixtures.patch` | 26 checksum-joined saved cases + zero-tick harness using the already-frozen roster file; no new generated roster. |
| `01-takeaway.patch` | `Game.recordStats`/old increment removal + three tests. |
| `02-safety.patch` | `PlaySim.finishCarry/buildResult`, result-field docs + five tests. |
| `03-scramble-pressure.patch` | Existing actor credit after the yardage split + ten tests. |
| `play-index-annotations.patch` | Metadata-only delta on the existing740-row index at94f25c6/#129. |

The canonical issue stays [GAME-004](../ISSUES.md#GAME-004). The
[original current play index](https://github.com/tannerthardy/football-simulation-/blob/94f25c64cf2c471220f6297cb7cddd86a1fc3d4e/data/reviews/current/accepted-game-play-index.csv)
and [Measurement appendix](https://github.com/tannerthardy/football-simulation-/blob/94f25c64cf2c471220f6297cb7cddd86a1fc3d4e/docs/reviews/accepted-game-deep-audit-2026-10-16/measurement.md)
remain the retrieval entry points. The index delta appends candidate/meaning
columns and preserves **every original column value and all740 IDs**. It names
one takeaway, one safety, eight pressure cases, six end-zone catch meanings,
four prefixes and existing elapsed intervals (including separately retained
nullified exposure). It creates no second index/dashboard. Apply this delta
to #129's metadata when composing the handoff; do not overwrite that owner's
branch or duplicate its GAME-004 anchor. Runtime patches do not depend on #129
being merged first.

## Validation and limits

**48 unique focused checks pass:** 18 new saved-input accounting contracts and
30 existing `game-rules` controls. Final18 were rerun after correcting test-only
TypeScript access errors; the compatible30 ordinary controls were reused.
Typecheck passes. The initial failed typecheck receipt is retained. The
result-boundary harness uses saved actors and prototype methods; it does not
construct a physical play, call a tick, or claim an observer-neutral native
rerun. Existing game-rule controls run their normal scripted/staged setups.
No full suite, new game, collector, extra seed, roster sweep or provider query.

The26 original selected log-line hashes match immutable evidence root
`b9b9c17597970ddc87aa4a4e271fc4cfeef71909`; detailed audit root is
`23d5f6d4f7e88fdd3225a49cc74ae5582a52522e`. Archive-size inspection caused Git's
partial-clone machinery to fetch the existing original game artifact blobs;
this was stopped and the cached bytes reused. This extra saved-data transfer
and offline parsing are not new collection or engine evidence. The14.2MB audit
bundle was independently hashed. Original game/archive verification receipts
remain valid; no second full-game archive checksum pass was needed to verify
the selected exact log bytes. Original roster input bytes are reused.

[Machine receipt, original/final checks, patch hashes and exact meanings](../../data/reviews/current/game-result-accounting.json).
Integration should review the three small contracts independently and batch
compatible accepted scopes. Add a metric only for a named remaining decision:
e.g. a claimant of continuous restraint needs actual hold creation/break/rejoin
times; a catch-approach question needs stored pre-contact velocity and stable
actors. Those are bounded evidence requests, not reasons for another dashboard
or broad campaign. Corrected box totals alone imply no football improvement.
