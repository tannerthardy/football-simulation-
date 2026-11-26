# Run fits read the shared rules, step 3c: the first sim cutover (2026-11-26)

Rules + Coaching, for Integration. Base: develop f640b311d.

## Rulings applied (Integration, after step 3b)
- **R3 withdrawn as an alignment change.**
  - The dime is the weak overhang by default (fangio-system.md:21). A man versus trips keeps #3.
  - Recorded, not built: an apex 6.5 yd out, over no detached receiver, should tighten toward the box.
- **Man on an attached end or a back, at second-level depth: accepted, in flow form.** He fits off his man's block: if
  his man blocks, he fits the gap that block opens to him; if his man releases, he covers. Deeper than the second level
  he stays alley.
- **A Cover-2 corner's interior fold: rejected.** A force aligned on or outside #1 is force and contain only. Built: a
  force on or outside #1, or wider than 8 yd with no #1 on his side, gets no inside duty.
- **A man-converted end off the line over a back: accepted by job.** The edge he vacated is then a bubble like any
  other: owned by rule, or reported unowned.
- **A backer walked onto an end, on the line, in man: accepted as edge.**

## The cutover: `FIT_RULES` (default on; `=0` restores)
- `buildRunFits` takes its pre-snap jobs from `runFitJobs` (label-free). It reads:
  - the call's description;
  - the resolved alignment;
  - the bodies where they stand.
- `FIT_RULES=0` runs `faithfulRunFits`, today's assignment kept verbatim. It is the restore and the equality proof:
  the faithful mode equals it on 43,340 catalog calls and 60 game-flow plays.
- `test/ir-fits.test.ts` also checks the wiring: with the flag on, the sim's jobs are the shared function's label-free
  jobs on the same bodies.
- **Post-snap behaviour is unchanged.** It already reads every field the new jobs use: `inside` for the fold, `lag`,
  `cutback`, `insert` and `alley`.
- **Not built** (later staged cases):
  - backside overlap and true two-gap;
  - the line-game trace line (`dl-game` decide), which the shared path does not emit.

## Staged cases (scripts/diag/fits/stage.ts; same teams, calls and seeds both ways; 16 seeds)
"Reached" means first within 1.5 yd of the ball carrier after the handoff. Each row lists jobs and outcomes on, then
off.

| case | jobs, on (off) | mean yd on / off | who made the fit (first contact; tacklers) |
|---|---|---|---|
| (a) IZ strong vs Over nickel cover 3 | the same both ways: Mike A strong, Will B weak, NB and SS force | 1.46 / 1.46 | DT_W 15 of 16 first contact; Mike 5 tackles; identical |
| (b) IZ weak vs Over base cover 3, Will apex on the slot (6.1) | Will force with fold B weak (force only); Mike A strong (B weak); Sam D strong (A strong) | 1.99 / 2.96 | on: Sam 12 and Mike 9 tackles (4 off); the folding Will reached the carrier on 3/16 (median 2.80 s), off 1/16 (4.50 s) |
| (c) IZ weak vs Over base cover 1, Will in man on the slot | the same both ways: Will force (no fold; man on a detached receiver); Mike B weak; Sam A strong | 3.76 / 3.77 | B weak goes to the Mike by the inside-out rule, not to a rolled safety. SS force strong reached 0/16; FS alley 5/16 |
| (d) OZ weak vs Over base cover 3, to the apex | Will force with fold B weak (force only); Mike A strong (B weak) | 0.76 / 1.61 | on: DT_W 7 first contacts, 8 tackles; the force Will reached the carrier on 0/16 (off 1/16) |
| (e) dime vs IZ strong, cover 3 | Mike A strong (B weak); NB force with fold B weak (force only); SS insert D strong (alley); DB force strong | 1.23 / 0.38 (**worse**) | DT_W first contact on 14 of 16 both ways. On: more secondary tackles (CB_S 4, FS 3) against off (DT_W 16, DT_S 4) |
| (f1) Tite vs IZ strong | nose lag (A weak, the A away from flow); Mike A strong; Will force with fold C weak (force only); SS fold C strong | 1.82 / 1.84 | Mike first contact on 8 and 14 tackles (9 / 13 off); the playside backer makes the fit |
| (f2) Tite vs IZ weak | as f1 | 0.77 / 1.08 | the nose reached the carrier on 15/16 (he flows to the backside A, which is the playside on this run). DT_S 11 first contacts |
| (g, expected worse) power strong vs Over dime | as (e) | 2.27 / 2.51 | SS 9 tackles both ways. The DB force reached on 6/16 (median 3.55 s) against 4/16 (3.95 s) |

**Read plainly:**
- **The folding apex rarely arrives.**
  - In (b), the Will folding to B weak from 6.1 yd reaches the carrier on 3 of 16 plays, at a median of 2.8 s.
  - In (d), the same Will as the force on outside zone to him reaches the carrier on none of 16.
  - In both cases the improvement in yards comes from the inside men moving inside-out (the Mike to A strong, the Sam
    to D), not from the apex.
  - The force player's own job (contain) is not what is failing there. The fold triggers while the runner is still
    inside the blocking surface, so on outside zone he folds and is late to the edge.
- **(e) is worse, and the cause is the rule's choice of owner.**
  - The Mike moved from B weak to A strong.
  - The B weak became the nickel's fold from 9.1 yd wide. His body cannot be in B weak in time, and the runs cut there.
  - The rule counts a fold from 9 yd as ownership. A coach would not.
  - This is the "body cannot do what the job asks" case: a fold from beyond about 6-7 yd should not count as owning an
    interior gap.
- **(c) gives the gap to the Mike, not to the rolled safety.** By the inside-out rule the Mike slides, and the safety
  stays the force, so the gap is owned, not unowned. The rule expectation was "unowned, or the rolled safety".
- **(g) was expected worse and is not.** The dime body (the DB as force, the SS as D inserter) took on the power play no
  worse than today. The SS made 9 tackles both ways.

## A repair found by the red-diff: a shallow zone defender is not a front player
In label-free mode a man the front placed within 3 yd counted as a front gap player. That made a 2.9-yd curl-flat Mike
(cover 4 match, quarter-flat test) an `interior` lineman. The rule is now:
- on the line (within 2 yd), a front player whatever his job (ruling 4: a backer walked onto an end);
- from 2 to 3 yd, only a rusher (the stand-up rover).

## Red-diff (flag on; `node scripts/red-diff.mjs`)
- **First run:** 4,623 tests; new red 6, fixed 6.
  - **4 × `run-force-ownership` "retains the existing front fit when odd/tite cover0/cover1 converts an end to man":**
    an honest red. The test encoded the contract ruling 3 replaced. **Repaired:**
    - with `FIT_RULES=0` the old assertion stands;
    - with the flag on it asserts ruling 3: the converted end, aligned off the line, has a second-level job (insert or
      force), and his vacated edge is owned by a force or an edge on that side, or reported unowned.
  - **`quarter-flat-force-support` "transfers active acquired force to fresh players, side=S":** it exposed the wrong
    assignment above (the shallow curl-flat Mike as a lineman). **Fixed in the rule**, not the test.
  - **`zone-track` "flows a linebacker toward a guard he sees pulling, flip=true": a finding, left red, not ledgered.**
    - Against counter weak, the backer nearest the pulling guard is now the Mike on the backside A. That is the
      reference matrix's Over: Mike A strong.
    - His landmark is 7.6 yd from the pull's arrival, beyond the post-snap pull read's reach (`PULL_REACH`, 6 yd), so
      he does not read the pull.
    - Before, he sat on B weak, 4.5 yd away.
    - Taught against counter, the backside backer reads the pull and goes over the top. So the 6-yd reach is the
      limit the new job exposes. It is post-snap code, out of this piece.
- **Second run** (after the rule repair, the test repair and removing a stray probe file of mine): 4,624 tests; new
  red 2, fixed 4.
  - The two new reds are the zone-track finding above and the engine-pin manifest, which listed my stray probe file.
    The file is removed; the manifest passes on the pushed head.
  - Fixed: `concept-menu` "first two reads", and three baseline-runner tests. They also showed as fixed in
    step 2b's runs, after the flag-inventory registration; I did not re-check them on develop.
  - **Net on the pushed head: new red 1, the zone-track finding.**

## Doubtful, for Integration
- **A fold from far out counts as ownership.** In (e), the nickel's B-weak fold from 9.1 yd made the dime result worse.
  One way to express it: no fold from beyond the apex (about 6.5 yd), or a fold that counts as ownership only from
  inside the apex. That is a rule change for you to rule on.
- **The force's fold triggers on outside zone** while the runner is still inside the surface (post-snap,
  `run-fits.ts:508-515`), so the force Will in (d) folds and is late. That is today's post-snap code, unchanged.
- **In cover 1 with the Will in man on the slot,** the Will remains the geometric force weak (the fallback picks the
  nearest available man). R1 takes him out of the interior fit only. Whether he should also be out of the force is
  open.
