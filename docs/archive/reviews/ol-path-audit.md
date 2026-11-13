# Run-block paths, ownership and contact audit

This audit responds to the owner’s observations in the bounded-attachment run
film. It finds a concrete combination-ownership bug before changing footwork or
physical capacities. The current repair preserves a planned double when the
nominal helper makes contact first. It does not declare zone blocking finished,
force a climb, or tune rushing gains to NFL averages.

## Reproduced inputs and causal trace

Four fixed film fixtures were replayed with additional observational hooks:
roster pair 31/32, strength .55, Singleback Ace, 4-3 Over, Cover 3, LOS 40,
first-down line 50, play seed 3, unflipped. Their pre-repair complete physical
signatures match the retained production panel, despite a source identifier that
also includes the new unused lab source. A separate unrecorded, unobserved run
matches every traced fixture before and after the repair. No additional
perception queries or random draws were used to collect the trace.

| Fixture / film suffix | Before | After | Contact-level finding |
| --- | --- | --- | --- |
| `RC-R1-iz_strong-over-R-S3` | 1.58 yd, tackle | 1.88 yd, tackle | C now joins LG on DT_W through real reach at .60 s |
| `RC-R1-wz_strong-over-R-S3` | -.35 yd, tackle | -.24 yd, tackle | Same ownership defect repaired; reach/cutoff technique still imperfect |
| `RC-R1-power-over-R-S3` | 1.93 yd, tackle | 1.93 yd, tackle | Entire signature unchanged; its legitimate RT climb at 2.00 s remains |
| `RC-R1-trap-over-R-S3` | 3.04 yd, tackle | 3.04 yd, tackle | Entire signature unchanged; no trap-path change |

These four diagnosed plays are not an estimate of frequency, success rate or
effect on a season. They isolate a consumed rule and check two unchanged calls.

### Inside Zone: the double disappears when the helper lands first

In `CAND-RC-R1-iz_strong-over-R-S3`, C starts with `drive -> DT_W` and LG with
`combo -> DT_W`. Both hold the same combination record, with LB_W as the next
level responsibility. LG reaches DT_W first, at controller time .55 s, at a
body-center separation of 1.232256 yd. Its event appears in the viewer at .60 s
because contact-event time is the completed tick boundary.

At .60 s, C remains unengaged but within functional striking range. Before the
repair, `RunBlocker.update` treats DT_W as unavailable because another blocker
owns the engagement and C’s plan kind is `drive`, not `combo`. It ignores C’s
actual shared combination membership. `findWork` assigns C to LB_W, while the
combination remains unreleased and `secureSince` remains -1. C requests a
7.54 yd/s run-through velocity toward the linebacker and never supplies the
intended second contact on DT_W. There is no earned `block_climb` decision.

After the repair, C retains the DT_W responsibility and enters the existing
engagement as a helper at .60 s, separation 1.127725 yd. Functional reach,
helper establishment, shared hand/ground forces and the existing combination
release rule remain active. This witness does not earn a climb before the play
ends; the repair never orders one to improve the rushing result.

### Wide Zone: the same ownership defect plus a separate leverage problem

In `CAND-RC-R1-wz_strong-over-R-S3`, C has `reach -> DT_W`, LG has
`combo -> DT_W`, and LG again contacts first at .55 s, separation 1.209269 yd.
Before the repair, C switches to LB_W at .60 s with the double unreleased.
Afterward, C joins the actual DT_W contact at .60 s, separation 1.221640 yd.
Thus the disappearance of these doubles is a controller bug, not evidence
that the shared solver cannot transmit a double-team force.

The backside LT supplies a different, still-open footwork witness in this same
play. Its initial cutoff step goes from y=29.27 toward lower y. At .25 s it is
still executing a fixed first-step landmark; at .30 s it changes to a full
run-through command toward the defender’s perceived shoulder. That observation
is .30 s old. The requested speed is the LT’s full 7.26 yd/s, despite actual
speed below 1 yd/s and the defender moving inward toward it.

LT strikes DE_W at .55 s, with actual separation 1.047717 yd, LT velocity
(1.468, -.137) yd/s and DE velocity (-1.396, -1.185) yd/s. Its reduced engagement
angle is already clipped to -.95 of a right angle on acquisition. At .60 s the
measured angle is -1.014; at .70 it is -1.087, and the rep is gone by .75 s.
The controller then repeatedly attempts contact while commanding a full-speed
turn around the stale shoulder. At .80 s the command is (-1.950, -6.996) yd/s
against actual LT velocity (1.233, -.802). The physics correctly cannot execute
that instantaneous reversal.

This is a useful diagnosed technique/control problem: fixed initial landmark,
delayed moving shoulder, acquisition on poor leverage, then sprinting around a
point after the hands separate. One such rep can be believable. Its prevalence
and whether the intended cutoff should instead protect the defender’s near hip
need a broader technique audit. Increasing traction or turning power would hide
the commanded approach rather than establish that the football choice is sound.

## The small ownership repair

The unavailable-target rule now checks whether the existing engagement belongs
to a member of this player’s active combination, for this exact defender.
Neither `drive`, `reach`, `down`, nor `combo` receives an automatic exemption
for somebody else’s engagement. Released combinations do not preserve a stale
responsibility. An intended partner’s contact preserves assignment, but does
not bypass `createEngagement`’s real reach test or useful helper force.

Ten focused tests cover either member landing first, drive/reach/down owners,
remote ownership without remote contact, outsider ownership for either member,
already-released or stale-target combinations, and release through established contact, secure
control and the existing backer read. The 53 focused run-system, run-execution
and ownership tests pass. Full-turn regression and game guards are reported by
the main handoff separately.

No body/contact solver, force capacity, player trait, minimum physics resolution,
first-step constant or climb criterion changed in this repair.

## What to observe in the stress harness next

Record the responsibility, actual target and physical contact separately. In
particular, identify which member strikes first, whether the intended partner
joins, establishment time, keeper support/leverage, and the actual reason for a
climb or abandonment. Add a blocker’s requested and achieved velocity, its
perceived defender age/velocity, moving shoulder landmark, first-contact angle,
relative closing speed, helper contact force, and retained hand-link lifecycle.

For a hard moving split-zone, reach or trap block, test the same technique over
target widths, target motion, entry speeds and roster capabilities. Include
achievable and deliberately impossible fits. Count unsupported acquisition,
overrun, recovery and actual transferred force; do not require the blocker to
win. Pair motion and stationary variants while preserving all other state.

A later controller increment should compare a small physically attainable fit
shortlist against the current sprint-through approach, using existing movement
limits and actual delayed perception. Keep a drive option for a square downhill
strike, a bounded moving-shoulder fit for a reach/kick, and an honest lost-leverage
recovery. Do not introduce scheme-specific strength or force-win outcomes.
Retargeting can also retain a stale combination pointer after its defender is
lost; the exact-defender check prevents that pointer authorizing an unrelated
double, but explicit combination cancellation remains a separate lifecycle task.

## Provenance

The initial traced source is
`d2c2a24b486194d455568ba814207aa4a659ef09cbdf680dd859da29ac4e59f0`;
the post-ownership diagnostic source is
`e4a9bd9dbc326cb275936fe5cf1e9d509612eb4f27240d12273b47632b46428d`.
The before blocking module SHA-256 is
`120a32822acd212fb56a7d8870eda1f5e3b67b9f2f9b9dcd54b33b2295725f13`;
after it is
`440e82f0b1296bd768f59c3395510767e639c20f54ade8f4bccd29e72387f7c3`.
These identifiers describe aggregated workspace boundaries, including concurrent
unused lab/tool changes; they are not a claim that every unrelated source byte
was held fixed. The consumed assignment rule, module snapshots, observer guards
and exact pre-repair production signatures provide the local causal evidence.
Subsequent combined turn validation has its own source pin.

Retained raw traces, collector and byte/source manifest are in
[data/reviews/physics-world/ol-path-audit](../../../data/reviews/physics-world/ol-path-audit/README.md).
The maintained reproduction command is:

```bash
node --import tsx scripts/diag/ol-path-audit.mts out/ol-path-audit/current.json.gz
```
