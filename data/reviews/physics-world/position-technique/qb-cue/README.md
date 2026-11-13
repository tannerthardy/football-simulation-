# Native QB cue audit

**Both QB cue policies are unpromoted.** Production coverage was restored to
baseline C after the narrowed proxy still worsened the fixed native pass panel
and matched game checks. `candidate` means the narrowed experimental candidate,
not the shipped engine. Exact source/test snapshots are under
`unpromoted-source-test/`; the whole combined source is reconstructed by
`../combined-engine.patch`. The shipped cutoff-only source is `dd4cbb75…`.

`before.json.gz` is the promoted C baseline (`80e8151`, source
`246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469`).
`coarse-unpromoted.json.gz` preserves the first, **unpromoted**, combined cutoff
and QB body-direction candidate, source
`f641f128241746ab1b0b6a90f13affb05a0c8505e35792195ce19497ea5bccdd`.
Neither file is regenerated to improve its outcomes.

`candidate.json.gz` is the narrowed final source
`d73aaed8c8095e2b7050ae1fd07fe257ff44c8b7805811369b955750856b1121`.
It reuses the unchanged observer and baseline. `comparison.json` contains the
complete final comparison; `manifest.json` pins every raw file and comparator.

Both use the identical neutral observer, `scripts/diag/qb-cue-review.ts`, SHA
`5a4152372b7744aa15c0f2f2f67111c59a65e3fb5b1159cc17c3ffee2fbfa94b`.
There are 24 fixed native passes and 24 observer/plain controls per phase.
All initial signatures, exact bodies/profiles/calls, full endpoint contexts,
results and following RNG draws match their appropriate controls. All ordinary
zone samples use `match` style; this does not establish a native spot-zone
result. The collector invokes no additional live perception or cue helper.

## Why the first cue policy was not promoted

The native audit found a first changed instruction while both the delayed QB
and delayed receivers were stationary. The shotgun QB's generic forward torso
orientation was treated as a directional read with confidence one, even though
the source uses that orientation for ordinary drops. No receiver had released
in the pictures consumed by those first changed decisions. A lateral ray into
an empty zone therefore changed the called landmark prematurely.

| Fixed roster-1 vertical input | First changed native command | Outcome before → coarse candidate |
| --- | --- | --- |
| Quarters | SS at 0.20 s, identical body and receiver pictures: lateral requested velocity 4.163 → 5.223 yd/s. Private QB eyes were null in both. FS mirrors the change at 0.25 s. | QB scramble/slide 3.11 yd → H completion 47.42 yd, with 20.20 YAC |
| Cover 3 Match | LB_M at 0.20 s, identical body and receiver pictures: requested velocity (4.166, −3.601) → (4.466, −3.222) yd/s. Private QB eyes were null in both. | Both throw at 2.25 s to Y; 22.11 → 43.19 yd, with recorded catch separation 2.9 → 3.8 yd and YAC 7.16 → 28.65 |

The first achieved body difference follows the corresponding 0.20–0.25 s
World solve and affects only that observer. This identifies the earliest
recorded intervention; it does not prove that the initial drift alone caused
every subsequent throw, contact or YAC difference. The discarded policy is
retained because its evidence is ambiguous at the first instruction, rather
than rejecting it merely for producing more offensive yards.

`coarse-comparison.json` retains every paired outcome and the first native
command/body references, including both offensive losses and defensive
explosives. It also keeps actual throw/catch events and native post-tick
geometry, labelled by tick start/end and whether a new solve occurred. Event
positions and post-tick bodies are distinct phases.

The two versions each finish 23 plays naturally, but their censored IDs differ.
Only 22 IDs are paired natural: mean yards 8.649 → 11.308. Baseline roster-2
Smash/Cover 3 Match remains live at eight seconds; candidate roster-1 Four
Verticals/Cover 1 remains live after an interception. Neither is assigned
fabricated final yards. These selected cases are not an NFL rate estimate.

## Narrow final candidate

Directional affinity requires observed receiver movement or depth, rather than
leaning into empty grass from a bare QB torso ray. The invalid 0.20/0.25-second
initial lateral intervention disappears in every pair. The first exact recorded
difference is at 0.35 s, largely a tiny facing/lane correction because the
baseline used the true QB position and the final controller uses the delayed
picture. This first difference is not proof of a meaningful QB directional read.

The discarded Quarters explosive returns to a QB scramble/slide: 3.11 yd at C,
47.42 for the coarse candidate, 3.05 for the narrowed final. Other adverse
outcomes remain. Four Verticals/Cover 3 Match produces 43.19 yd against C's
22.11; catch separation rises 2.9 to 3.9 yd, and first carrier contact moves
from 4.05 to 6.00 s. Dagger/Cover 3 Match changes an incompletion to a 29.68-yard
completion, with 3.7-yard catch separation and 15.00 YAC. Dagger/Cover 1 loses
a 15.39-yard completion. All are retained.

The final and baseline each have 23 natural ends, with the same differing
censored IDs described above. The 22 paired-natural mean is 8.649 to 10.541 yd.
This supports the narrower information boundary, not better NFL passing
statistics. Body facing is still only a coarse proxy: at the vertical throw,
the FS consumes a QB direction delayed by 0.25 s while the baseline can use
the selected receiver's exact identity. The broad direction remains ambiguous;
late help, pursuit, QB poses and YAC need subsequent technique work.

## Reproduction

From the repository root, with an explicitly frozen engine source:

```sh
node --import tsx scripts/diag/qb-cue-review.ts out/qb-cue/new-candidate
python scripts/diag/qb-cue-compare.py data/reviews/physics-world/position-technique/qb-cue/before.json.gz out/qb-cue/new-candidate/raw.json.gz out/qb-cue/new-comparison.json
```

The exact common cohort and source/tool/input signatures are embedded in the
raw files. The compact comparator does not execute the engine or infer hidden
read identities. Reuse the pinned baseline; do not resimulate it when evaluating
another cue policy.

The command runs whichever source is installed. Reconstruct an explicitly
isolated experimental archive to reproduce d73; running it on today's cutoff-only
engine measures that engine and must retain its different source label.
