# Offensive concept process panel

The [review](../../../../docs/reviews/offense-literature-applications.md)
separates supplied teaching hypotheses from actual engine observations.
This evidence is a current source snapshot, not an NFL validation or a
before/after physics experiment. `manifest.json` pins the loaded engine source,
diagnostic, uploaded references and reviewed artifact.

`run-process.json` contains 84 four-second reps: seven concepts, Over/Under/Tite,
seeds 3/11, both formation flips, Ace 11 personnel and stock Cover 3. Teams
are generated once from seeds 7/8. Defensive personnel changes with the front;
the front cells are not identical elevens. The file is compact JSON to keep
the shared evidence small; load `cells` for summary counts and `trials` for
event-boundary traces.

No extra vision call, controller update, evaluator or RNG draw is made by the
observer. `--verify` separately replays every setup without instrumentation
and compares full bodies, intents, events, stats, result state and next RNG.
All 84 comparisons match at the pinned source.

Final engine source:
`0f1124fde702bfd754944b10bc2d35f2ebf4914c1a2fa864e701afb6683b47ad`.
The manifest also summarizes sampled support state: 3,047 upright and 472
falling carrier tick-end records; 66/84 reps include a falling record. This is
not a completed-tackle or NFL fall rate. Whistles, four-second truncation and
conditional post-handoff sampling can prevent later ground/recovery states
from being recorded. All 35 sampled puller contact records are upright.

Definitions:

- Planned combination: unique `Combination` object installed at the snap.
- Loaded double: both members share the engagement and primary/helper hand
  joints report nonzero load in the same sampled 20 Hz interval. This does
  not prove simultaneous load at every physics substep.
- Climb: the combination's flag changes alongside its member's actual
  `block_climb` event. `block_collect` instead counts a penetration-driven
  dissolution. These are not conflated.
- Pull contact: first `block_contact` event naming a planned puller. Brief
  contacts, helper contact and briefer load between samples may be missed.
- Handoff distance: sampled tick-start/tick-end separation, not anatomical
  ball/hand state. Carrier trajectory and initial aim are actual state.
- Designed gate: eligibility of the existing `aimUntil` branch before the
  controller executes, not a claim that a particular perceived cue caused it.
- Aim departure: geometric measurement, not a wrong-read or bust grade.

True state shown by a diagnostic is not what a player necessarily perceived.
Missing key reads, candidate lane scores and causal decision cues stay unknown.
Four-second truncation and earlier whistles affect contact/arrival counts.
Do not tune physical forces to match these counts.

Reproduce from the repository root with Node 22 and installed dependencies:

```sh
node --import tsx scripts/diag/run-concept-process.ts out/run-process.json --verify
node --import tsx scripts/diag/run-concept-process.ts out/zone-process.json --runs iz_strong,oz_strong,wz_strong --fronts over,under,tite --seeds 3,11 --seconds 4 --verify
```

The observer refuses to write if engine files change during execution. Rerun
after a source freeze when integrating another physics repair, and update the
review and manifest from that output. Raw output goes to ignored `out/`;
this folder contains the reviewed shared artifact.
