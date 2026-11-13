# Late man acquisition and the remaining YAC problem

## First reproduced wrong instruction

The saved `DA-R1-four_verts-cover4-R` replay exposes a motor-target error, rather
than an absent roof or unexplained physical work. The Mike has carried trips
Y; the weak hook player later accepts the released back. At **2.10 s** that
weak linebacker is at x48.8149, moving upfield at 3.5024 yd/s. His actually
consumed back picture is x37.5416, velocity `(3.1096,.6452)`, age .25 s.
The new man technique records 11.1622 yd of initial cushion.

The existing ordinary cushion is capped at 5.5 yd before the route develops,
so its receiver-relative motor target is x43.0416. However, the closed-hips
branch replaces that target with a floor at the defender's own x minus .2,
then adds the receiver's forward feed-forward velocity. It requests
**+2.7896 yd/s** while already over eleven yards ahead of the back. Thus the
defender retreats rather than compressing excessive cushion. Waiting for the
back to consume that gap is an instruction error, even when physics executes
the instruction consistently.

The [new inspector](../../../scripts/diag/late-man-entry.ts) captures existing
`RouteObservation.read` inputs/outputs and `ManCoverage.update` returns. It
does not ask for additional pictures, run another decision or draw RNG. Its
three full native results and final bodies/intents/minds/RNG each match plain
execution. The first cue and command agree in the original awareness baseline
and the frozen approach/tackle candidate; this is not a new pursuit regression.

## Bounded repair

[ManCoverage](../../../src/sim/behaviors/defense.ts) retains the existing position
floor while its consumed receiver is stationary or moving slowly. Once the
consumed motion exceeds the existing 1.5 yd/s release/hip threshold, it uses
the already-defined receiver-relative cushion instead. That observed release
is remembered for this assignment: a later plant cannot restore the old
retreat floor. A new ManCoverage instance starts with no such release knowledge.
Press, over-top and
declared trail branches keep their own targets. No hidden live receiver
position, future route, exact throw target or clock is added as a cue.

At the identical first native cue the corrected request is
**-2.9105 yd/s**, within the existing tracking envelope. The actual body still
has forward momentum and must brake and turn through the ordinary World.
This does not give the player a better reaction time, agility, traction or
strength. It also does not guarantee a successful contest.

Ten [dedicated tests](../../../test/man-cushion-compression.test.ts) cover the
mirrored late-match instruction and real first World step; idle and normal
off-man controls; held-picture/current-body and RNG neutrality; a changed
consumed cue; release-then-plant retention, an unseen current burst before
acquisition; and retained roof, press and trail techniques. Four fail on the
unchanged awareness baseline, with six controls passing; all ten pass on
the candidate. Existing coverage mechanics/rules also pass: **37 focused tests**
in total, and typecheck is clean. The root owns the final full-suite and larger
game guards before any promotion.

The motor cue still has an explicit speed threshold. That is an effective
release assumption, not an NFL eye-tracking measurement or a claim of globally
smooth decision-making. The current tests protect this witnessed transition,
not every possible receiver release or mistaken match.

Independent review caught the first candidate forgetting the observed release
when the receiver stopped behind the line. Its two-step regression passes the
moving step but then requests only -.32 yd/s despite the continuing excessive
gap. The new latch regression fails on that candidate with nine controls
passing. The correction remembers only a consumed cue; a hidden current burst
while the picture is still stationary cannot set it.

The existing constructor still initializes cushion from the receiver's live
position, including when a match is acquired during the play. This component
does not repair that inherited information shortcut. Its held-picture test
changes hidden geometry **after** identical construction; it establishes the
new motor request's boundary, not a fully observation-clean man controller.

## Frozen component evidence

| Phase | Engine SHA | Meaning |
| --- | --- | --- |
| Awareness baseline, git `fcafcaf` | `178751b67048eeaa91741090a4a19e43c108add8c5f1c5e0a586c09d57b3402c` | Published baseline for the saved pass films. |
| Before this coverage change | `030e0f3fb252f4c63ecbb81c8c7544728a6c54b2fa91c5827689ea1fb6e7cdeb` | Root's frozen approach plus supported-wait correction. |
| First coverage component candidate | `a1cca44e8d2b82c661a211de347e00bea3dd4b274dd0138657445e7135a3d7df` | Same preceding source, plus the bounded ManCoverage branch; missing release retention. |
| Isolated release-retaining component | `faec7725758d40f1e784833573b54857c6f779bd5b9fd8e1f6b82fffdcd7d159` | Preceding coverage archive plus the cue latch; separate from root's later loaded-grip/traffic changes. |
| Combined final candidate | `8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942` | Root's final frozen candidate, including the latch and later tackle/traffic repairs; full evaluation still determines promotion. |

Shared World is unchanged. The ignored `out/tackle-breakthrough/` receipts are:

- `coverage-baseline.json`, `coverage-pre-fix-v3.json` and
  `coverage-candidate.json`: three actual-history instruction captures with
  plain-execution controls; frozen archive roots are retained beside them.
- `coverage-latched.json`: the same three native inspections for the isolated
  release-retaining component; all three outcomes match the first candidate,
  and all three plain-execution controls pass.
- `passing-pre-coverage-v3.json.gz` and `passing-coverage-candidate.json.gz`,
  each with its `-film.json.gz`: identical existing 96-call collector/cohort.
- `coverage-pass-comparison.json`: every joined pair, including all increases
  in gain and changes in outcome. These are not naturally sampled NFL rates.

The 96-call guard below measures the **first** coverage candidate, before the
release-retaining refinement. These earlier values are not renamed as the
combined final results reported separately below.
The guard uses two generated roster pairs, four concepts, six coverage
families and both directions. Every recorded execution matches plain execution;
neither phase has a physical timeout.

| Measurement | Before coverage repair | Coverage candidate |
| --- | ---: | ---: |
| Mean offense yards per diagnostic snap | 9.689 | 8.609 |
| Gains at least 20 yd | 13 | 11 |
| Attempts / completions | 79 / 54 | 78 / 54 |
| Interceptions / sacks | 10 / 2 | 9 / 1 |
| YAC among 50 completions present in both phases | 9.747 | 9.651 |

34 complete executions are identical. Gains fall in 21 pairs, rise in ten and
stay equal in 65. Cover2/3 controls have identical executions; observed changes
are in Cover0/1/4/6. The large decreases include PA Post/Dig, roster2 Cover4
right (-41.49 yd) and roster1 Cover0 right (-31.64 yd). The largest adverse
pair is roster1 Four Verticals/Cover4 left: an incomplete becomes a 17.37 yd
catch, including 12.73 YAC, despite separation falling from 7.1 to 6.1 yd.
Keep that counterexample; tighter geometry does not deterministically make
every seeded pass outcome more defensive.

The three inspected written-side witnesses, compared only to the frozen
preceding source, are Cover1 8.90→5.94 yd, Cover4 15.41→13.94 yd and Cover6
51.79→51.75 yd. The statistical improvement is largely pre-catch/target work,
not a broad solved YAC problem. Comparable completions still average nearly
ten yards after catch. These results support further evaluation of the motor
contract; they do not establish the requested big breakthrough or league
calibration.

## Combined final pass guard

The unchanged existing `scripts/diag/decision-awareness.ts` ran from the frozen
`out/tackle-breakthrough/final-source` archive. Its source before/after matches
`8bc3eec8…`, all **96/96** native recording/plain signatures match, and there
are no physical timeouts. The collector SHA remains
`73c1763a8be3c0615d590b03440e46cc070249ade1e220a75780d364c227bf5e`.
This is a combined integration check, not an isolated coverage/latch effect.

| Measurement | Published awareness baseline | First coverage candidate | Combined final candidate |
| --- | ---: | ---: | ---: |
| Mean offense yards per diagnostic snap | 10.388 | 8.609 | 8.755 |
| Gains at least 20 yd | 13 | 11 | 12 |
| Attempts / completions | 79 / 54 | 78 / 54 | 78 / 55 |
| Interceptions / sacks | 10 / 1 | 9 / 1 | 7 / 1 |
| Own-phase completed-pass YAC mean | 10.703 | 9.701 | 9.385 |

Both paired comparisons enforce identical cohort, generated rosters, individual
profiles, collector and shared World. Against the published baseline, gains
fall in 45 pairs, rise in 26 and stay equal in 25. The 51 completions present in
both have YAC means 10.226→9.521; restricting further to the same receiver
leaves 49 pairs, 10.561→9.631. These conditional samples differ from each
phase's own completed-pass population.

Against the first coverage candidate, gains fall in 23 pairs, rise in 35 and
stay equal in 38. Mean gain and explosive count are slightly worse even while
54 matched completions have lower YAC, 9.701→9.192. The largest adverse change,
roster1 PA Post/Dig/Cover0 right, changes an interception to a 33.03 yd
completion. The same call was already a 30.89 yd completion in the original
awareness baseline. This is a retained outcome transition, not evidence that
an interception was the uniquely correct result.

Cover2/3 now have 25 changed execution signatures against the first coverage
candidate because this combined candidate also changes tackle/traffic work.
Do not describe them as unchanged final controls. Within those 32 pairs,
six gains fall, eleven rise and fifteen stay equal. Cover2 Four Verticals,
roster1 left, improves 33.01→29.36 yd; roster2 left rises 2.49→4.42 yd.
Existing very large YAC tails remain: roster2 Curl/Flat/Cover2 right has
56.68 YAC, Curl/Flat/Cover3 right 61.19, and PA Post/Dig/Cover3 right 53.95.
All are retained; the final panel does not establish solved open-field defense.

Ignored final receipts are `passing-final.json.gz`, `passing-final-film.json.gz`
and `passing-final.log`. `passing-final-vs-baseline.json` and
`passing-final-vs-v4.json` retain **every** joined row, all gain increases,
attempt/target/outcome changes and changed Cover2/3 controls. The reproducible
comparison tool is `out/tackle-breakthrough/compare-final-passing.py`.
Full-game and full-suite results belong to the root's combined evaluation.

## Why another explosive needs a different diagnosis

The saved written-side Four Verticals/Cover6 explosive is not explained by
missing catch proximity. At its 5.00 s catch, SS is about 1.58 yd away. He
acquires a grip at 5.15, falls during the attempt at 5.50, remains attached,
and the receiver gains about twenty yards after catch before the later assist
and down. It has no recorded broken tackle. The pursuit candidate leaves this
sequence nearly unchanged. This is a useful acquired-grip/support witness,
separate from how man coverage acquired an underneath route.

Likewise, Cover4's back checkdown starts with about 7.3 yd of separation; the
native original film has three slipped holds afterwards. Repairing the late
motor target improves the approach to that catch but does not show that its
later grip failures were mechanically wrong. Distinguish initial acquisition,
achieved load, the tackler's support and the carrier's continued work.

There is still known coverage-help debt: a nearby underneath carry can look
like a sustaining roof, and independent delayed judgments can duplicate help
or exchange late. The film alone does not prove every such decision invalid;
the players can legitimately make a fallible read. A further role-discipline
candidate should first reproduce a specific cue that releases an owned threat
without an achievable replacement, using the installed responsibilities and
consumed pictures. Do not add perfect rotations, universal man coverage or
stronger defenders to erase the resulting explosive.

The [final review](pursuit-and-tackle-transfer.md) now retains all eight matched inputs and the scoring,
passing, rushing and YAC tails. Earlier pursuit-only gains on run diagnostics
coexisted with worse scoring/YAC in those games. A coherent motor repair is
progress; the final integration evidence remains mixed. It also identifies
an untouched Duo touchdown where a linebacker believes run but stays in an
off-man cushion until the runner crosses LOS. That responsibility transition
is a separate next controller witness, not justification for stronger physics.
