# Catch-to-pursuit diagnosis — 2026-10-13

Diagnosis-first work on `codex/catch-pursuit-diagnosis`, based on the agreed
integration pin `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`. The attached
handbook supplies hypotheses and historical evidence; the user's requested
diagnosis takes precedence over its suggested later implementation milestones.
No controller or physics change is planned in this pass.

## Inputs declared before film/results

Ordinary football: generated roster cohorts 3101 and 4202 (strength .55),
native game seeds 1001 and 2001 respectively. Draw 16 completed-pass snaps
uniformly without replacement from each game using the named sample stream
`catch-pursuit-20261013:COHORT`. Keep flagged plays and timeout/censored
catches separately labelled. Actual coordinator calls, fatigue, preferences,
audibles, and both learned scouting histories are captured before mutation.
Do not treat two fixed roster pairs as 32 independent talent samples.

Route lab: eight existing NFL-style concepts, each against an attack hypothesis
and a defense-favorable adverse control, two rosters, three fresh snap seeds
(701, 907, 1201), both call flips: 192 full-body snaps. The combinations,
formations and hypothesized conflicts are defined in
`scripts/diag/catch-pursuit-audit.ts`. These are diagnostic calls, not a native
coordinator cohort or proof of general NFL scheme superiority. Flipped calls
retain native field/slot behavior; they are not promised exact physical mirrors.
No invented route or universal scripted defensive win is installed.

## Recording contract

Reuse the `catch-contact-review.ts` saved-context protocol and existing full
ReplayTrace. Copy only cues consumed by controllers; wrap existing command
and World calls without introducing another observation, decision or draw.
Keep raw commands, commands after contact/spacing amendments, achieved motion,
body/strike impulses and solved grasp forces distinct. Restore an unobserved
copy of every traced input and compare full result, all bodies, final intents,
RNG and perception with the original context.

Pursuit aim and flight choice are explicitly labelled read-only reconstructions
from actual consumed cues and the pinned formulas. The private pursuit bias is
reconstructed from an independent named RNG stream; never draw from the real
controller's stream. A reconstructed intercept is not necessarily the final
blended near-contact movement command. Native tick boundaries provide 0.05 s
timing; do not invent sub-tick acquisition times.

Use `baseline:run` without flag overrides for every comparison. Preserve
the full 43-flag profile, World API defaults, source/collector/input hashes and
actual commits in receipts. `timeout` after the native 25-second cap is censored,
even though the engine builds a dead-ball result. No post-catch delay, capability
boost, grip change, prolonged-hold or ground-hold experiment is permitted here.

Results and smallest causal follow-up will be added after collection.
