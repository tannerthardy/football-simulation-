# OL retargeting and combination lifecycle

## Status and where to start

The live double-team assignment now ends when a member actually chooses new
work away from its original defender. Both matching plan references are cleared
together, and the former helper resumes the covered player's first-level
technique. The same transition handles collecting penetration before a climb.
Existing contacts, hand joints, movement capabilities and decision cadence stay
intact. Finding work is recorded as `block_abandon`, distinct from an earned
`block_climb`.

Watch the [24 paired run clips](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/ol-retarget.html), or download the
[offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/ol-retarget.zip). Use the native OL assignment panel
to inspect requests, actual engagements and delivered loads. Read the
[evidence and rerun commands](../../../data/reviews/physics-world/ol-retarget/README.md).
The repair is real but usually small visually; it is not a broad improvement
in rushing efficiency or proof that OL technique is complete.

## What was wrong

`findWork` could replace a blocker's target while keeping an unreleased
combination for a different defender. The remaining pointer suppressed normal
reach/cutoff fits and adjacent exchange rules. A former helper could still aim
around his partner while attacking the new target. Penetration collection had
a related cleanup path: it cleared member pointers without checking whether
they still belonged to this job, and left the former helper labelled `combo`.

A fresh observational panel reproduces this in **16 of 144 ordinary run
snaps**, distributed across all six concepts. It retains 507 stale member
updates, including 400 OL updates. These are repeated updates in a fixed
balanced panel, not NFL frequencies. Unlike the earlier isolated staged
witness, these are normal 11v11 executions with no parked players or manually
placed contact. Every observed/recorded execution matches its plain control.

## The small repair

When an actual work search selects something other than the combination's
defender, including no available target, the controller cancels that live shared
assignment. It captures the matching owner's `drive`, `reach`, `down`, `cutoff`
or `draw` technique before mutation, then clears only member plans pointing
to this exact combination. Obsolete `climbTo` hints are removed. A newer job
on a former partner is preserved.

The helper resumes that first-level technique with its existing drive vector.
If the member initiating cancellation selects the called backer, his new
approach job becomes `climb`. This is not an earned double-team transfer: no
climb/stay tags, contact ownership change or release of real hands is invented.
The other member still chooses its own next target on its existing read cadence.

Collecting penetration uses the same cancellation, followed by the collector's
ordinary `drive` job. A partner still physically blocking the original defender
keeps that actual contact. Released combinations and `readCombination`'s
secure-contact/backer release remain separate and unchanged.

The first-level restoration infers from the live matching owner; `drive` is the
conservative fallback if that plan is unavailable. It never copies an earned
climber's job into a keeper. There is no new strength multiplier, anatomy,
physical constraint law, solver resolution or perfect future read.

## What the matched football checks show

| Check | Before | Final |
| --- | ---: | ---: |
| Snaps with stale live combinations | 16/144 | 0/144 |
| Repeated stale member / OL updates | 507 / 400 | 0 / 0 |
| Earned climb events | 40 | 40, all exact |
| Shared assignment cancellations | 6 | 21 |
| Mean credited rushing gain | 1.32611 yd | 1.32632 yd |
| Stuffs / 10-yard explosives | 38 / 2 | 38 / 2 |

All 144 initial/profile checks match. All 144 observer/recording controls pass
in each phase. Complete execution signatures match in 123/144 pairs; the
21 changes include new diagnostic events, so that is not a count of improved
physical blocks. Credited gains match in 143/144. The only gain change is
`OR-R3-counter-over-L-S11`, -0.05 to -0.02 yd. All outcomes, missed/broken tackle
counts, handoff events and earned-climb events remain the same.

In the fixed Wide Zone right clip, RT switches from DE_S to LB_S at 2.90 s.
Before, he remains a `combo` helper for [Y, RT] on DE_S and asks for velocity
(2.866, 7.021) yd/s with first-level posture. After, the obsolete pointer is
gone and RT uses a new `climb` approach, requesting (3.066, 6.936) yd/s.
Achieved velocity changes only from (-0.3242, 0.6856) to (-0.3166, 0.6810) yd/s.
Both ticks deliver zero arm/contact load. This proves a corrected request and
small real movement change; it does **not** prove a successful new block.
The rounded 10 Hz film positions and -0.27 yd gain are identical.

The Counter left roster-three case contacts LB_M 50 ms earlier, at 3.10 rather
than 3.15 s. A separate adverse case remains: roster-two Counter Under left
gives the defense a slightly longer fumble return, 2.3600 to 2.4691 yd, while
the offense's credited gain stays 1.66 yd. Contact/return details are preserved
rather than hidden behind equal final rushing gains.

The existing 144-run guard also has 123 identical complete rows. It detects
small contact-window/support changes beyond the ownership panel. Its first
carrier-contact events match, but one unrounded contact position/YBC changes;
equal rounded event timing is not identical physical geometry. All 64 existing
tackle rows are exact controls. The shared World file is unchanged.

## Tests, game guards and limits

Seventeen new tests use actual public behavior, delayed observations and
reachable engagements. On the original engine, 11 intended regressions fail
and six controls pass. The final 84 focused tests, full **695 TypeScript
tests**, 22 Python tests, typecheck and build pass.

Controls preserve either member making first contact, remote responsibility
without remote acquisition, real earned climbs, newer combinations and an
original hand joint while the helper collects penetration. Independent
standalone reach/down blockers receive the same restored requests and achieved
World movement as the cancelled members, with bounded traction and work.

Two game scores change 25–14 / 20–27 to 41–27 / 25–49. Combined passing yards
per completion worsen from 15.94 to 16.85; receiver YAC worsens in one game and
improves in the other. Rushing YPA rises from 2.46 to 4.24, with different
later calls and samples. These are mixed guards, not causal effects or NFL
calibration. This cleanup ships for its assignment correctness, not its scores.
No final game has a physical timeout, lower-hold release or support-motor work
excess; maximum momentum/work residuals remain about 1e-11 kg·yd/s and
5.7e-11 kg·yd²/s². Concurrent guard timings are not performance benchmarks.

All 24 clips are fixed before outcomes and finish naturally. Native OL state
and completed-tick loads are labelled separately from body orientation and
rounded replay positions. An assignment label alone is not physical contact;
a low-load tick is not a won block. The same physical capabilities still govern
both versions. This increment adds no NFL observations or force fitting.

## Next OL work

1. **Technique after an earned combo release.** A keeper can retain `combo`
   approach instructions after his partner climbs, then aim around that departed
   partner if contact is lost. Reproduce an ordinary keeper recovery before
   changing the separate earned-release path.
2. **Classify new work consistently.** Only the member initiating cancellation
   receives the explicit planned-backer `climb` approach. A partner's later
   search retains the normalized first-level technique. A general observed
   first-/second-level work policy needs its own football cases; this patch does
   not solve every linebacker approach.
3. **Earlier approach and sustained leverage.** Most cancellations here occur
   late, after initial blocking has already shaped the run. Preserve the
   existing shoulder-fit work and investigate failed fits, loss of inside hands
   and missed recovery rather than adding force to make the blocker win.
4. **Only witnessed physics changes.** Continue shared force/support accounting
   and local convergence checks when a feasible request executes incoherently.
   Fix wrong requests in controllers; do not expand anatomy or globally raise
   resolution to mask them. The universal physics OK remains pending.

Work stays on `claude/engine-priorities`; main and PR #1 are outside this change.
