# P4 approach geometry, execution and containment

P4's touchdown does **not establish a harmful catch-to-pursuit transition**.
Both achieved approach histories finish with its stronger actual execution
value, and both concede the touchdown with its weaker actual value. The
moving-arrival history acquires a tighter wrap one tick later; that changes
which shared random-stream values the tackle receives. Its stronger-draw
finish is earlier than baseline. This is a causal explanation of one witness,
not an NFL calibration or a population estimate.

No new arrival gate, capability change or controller fix is installed.
The conditional instruction to implement a coherent objective requires a
demonstrated transition defect; this comparison does not supply one. The
existing diagnostic remains unpromoted. In particular, losing P4's original
tackle is insufficient grounds by itself to call its football behavior worse.

## Source and bounded scope

Remote integration pin was rechecked as
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`. All runtime bytes remain at
SHA-256 `8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c`.
The final portable comparisons ran at
`6e15fc202492b6dcddd800f45df6dd35cb490190` on the separate
`codex/catch-pursuit-diagnosis` branch. The launcher receipts in the
[compact evidence](../../data/reviews/current/catch-transition-diagnosis.json)
record full commits, source/collector/model/harness fingerprints, all 43
flags, World defaults and exact inputs. Historical October 11 NFL evidence
is not used as a current baseline measurement.

This pass starts with P58, P4, interception control P16 and ordinary P19,
P67, P95 and P103. P173 is retained as a **non-trigger control**. No rule is
broadened to reach it. The [portable input packet](../../data/reviews/current/catch-transition-inputs.json)
retains original generated players, calls, audibles, scouting, fatigue,
perception history reconstruction, seeds, selected defenders and both prior
natural execution signatures. These eight cases are inspected witnesses;
they are not fresh transfer validation. No expansion was performed.

Helper coordination, roster corrections, shared physics, global catcher
awareness, prolonged holds and ground holds remain separate or parked.
The workboard records ownership; only diagnostic scripts/data/docs changed.

## The actual P4 factorial

The catcher is **I6103-WR3, H, index 10**. The approaching defender is
**C6103-S4, FS, index 20**, actually assigned `deep_mid` against
`four_verts` / `cover3_seam`. He is not substituted with the nearest helper.

Each row reruns its complete native 22-body history. At the selected first
`tackle_wrap`, the ordinary acquisition and both RNG calls have already
occurred, but the grasp has not yet transmitted a solved load. We cross only
the execution value through the existing formulas:

`quality = clamp((0.25 + 0.85 × contactQuality) × execution, 0.08, 1)`

and the unchanged `gripForce` law. Bond execution is also set to that value,
so later ordinary grip refinement uses the same intervention. No draw is
added, removed or reseeded; miss/fumble decisions, native leg placement,
strike, reach, pull, body/support state, other players and physical laws are
retained. Within each geometry, acquisition body state, RNG state, command
and initial joint are checked identical across arms. Natural runs and the
same-draw diagonal reproduce the original final body/RNG signatures exactly.

| Achieved approach history | Actual execution 0.992938 | Actual execution 0.466250 |
| --- | --- | --- |
| Unchanged baseline | Tackle, **8.44 YAC**; loaded hold survives **0.80 s** to natural finish | TD, **35.67 YAC**; slips after **0.20 s** |
| Existing moving-arrival v2 | Tackle, **7.26 YAC**; loaded hold survives **0.55 s** to natural finish | TD, **35.67 YAC**; slips after **0.20 s** |

The same stronger execution produces acquisition grip quality **0.710 →
0.888** and capacity **876 → 1275** in the tighter arrival geometry. The same
weaker execution produces **0.333 → 0.417** and capacity **325 → 412**;
that improvement is insufficient to survive either encounter. These are
quality-dependent capacities from the existing law, not tuned arm strength.

The geometry rows retain different native leg-placement draws: **0.153**
baseline and **0.661** arrival at acquisition. This factorial isolates the
execution effect *within* each geometry/history, not the separate effects of
leg placement, angle, timing and every later decision. It establishes that
weak execution is sufficient for both failures and that the arrival history
can finish with the original stronger execution. It does not establish the
probability of either result or prove the weak hold is NFL-calibrated.

## Boundary, acquisition and random-stream trace

P4's throw is labelled 1.95 s and catch 2.80 s. The only changed v2 request
is the catch tick: **(-8.144, +0.409) → (-2.848, +2.555) yd/s**. It uses a
plausible receiver/window inferred from consumed delayed observations,
not the actual catcher position. The next pursuit request is
**(-2.387, +3.132)**. The command jump across the catch boundary falls from
approximately **6.39 to 0.74 yd/s**. The achievable velocity changes much
less than the requested velocity because ordinary movement limits apply.

The larger request change occurs at **2.95 s**, two ticks after the first
pursuit update, in both arms. At 2.85 and 2.90 the existing free-approach
shortlist selects a moving-arrival command; at 2.95 it returns the distant
interception request. The near gather fraction is zero through those three
ticks. Available receiver motion also changes: the flight controller's
default picture has 0.25-s age; pursuit consumes a 0.15-s picture with a
different heading. Possession remains unconfirmed in the picture until
3.00. A constant command or fixed persistence timer would suppress legitimate
observation updates. The neutral audit records interception and held-command
movement forecasts without making any extra observation or RNG call.

The important **one-tick change is acquisition**, not the handoff:

- Baseline at 3.50: observed quality **0.56**, best preview **0.63**, so
  attempt the current opportunity. Actual geometric quality is **0.547**.
- Arrival at 3.50: observed quality **0.71**, best preview **0.82**, so
  the existing `> 0.1` improvement rule keeps the feet moving.
- Arrival at 3.55: observed/current best quality **0.80**, so attempt.
  Actual geometric quality is **0.758**.

The shared RNG state matches through 3.45. At the first differing consumption,
baseline sends raw value **2036309685** to tackle miss testing at 3.50;
arrival sends it to block execution at 3.55. Baseline's tackle normal is
**+0.060770**, becoming execution **0.992938**. Arrival's later tackle normal
is **-2.459054**, becoming **0.466250**. Leg-placement normals are also
different, and are preserved in their original geometry rows.

Thus the chain for this regression is:

**small achieved geometry change → later earned acquisition → different
assignment of shared execution randomness → weak hold → slip → inadequate
remaining containment**.

Keeping the same play seed did not keep this tackle's execution fixed.
Do not repair this witness by choosing its favorable normal or by treating
the original tackle label as a required result. No production RNG change is
proposed either.

## What physically and visibly changes

| First loaded World entry | Baseline history | Arrival history |
| --- | --- | --- |
| World boundary | 3.60 s | 3.65 s |
| Defender achieved velocity | (-0.126, +1.893) yd/s | (+0.240, +2.167) yd/s |
| Defender/runner heading mismatch | 81.49° | 71.12° |
| Body separation | 1.077 yd | 0.926 yd |
| Closing speed | +1.211 yd/s | **-0.263 yd/s** |
| Relative transverse speed | 6.341 yd/s | 6.225 yd/s |
| Rear cosine | -0.106, side reach | **-0.371**, behind/form |

Arrival improves proximity and heading modestly while conceding closing
speed and moving farther behind. That is a mixed football result. Both
still have substantial crossing speed; neither is a square, body-led tackle.

With the stronger draw, baseline loads approximately **876** initially and
the runner falls at event label **3.95**; arrival loads **1275** and he falls
at **3.75**. Tackle labels are 4.35 and 4.15 respectively. With the weaker
draw, both exert real loads and disturb the recovery foot before slipping.
Peak sampled runner support displacement during the first 0.20 s is about
**0.17 yd** baseline and **0.32 yd** arrival. He recovers upright and regains
speed. A grasp does not fail to affect balance simply because it does not
produce a fall. Reported force samples are not exact substep impulse integrals.

After each weak hold slips, the nearby helpers are already behind:
arrival's **C6103-CB1 at SS** is 3.62 yd away, **C6103-CB2 at NB** 4.46 yd.
The only defender still ahead along the runner's heading is the wide-side
corner **C6103-CB3 at CB_W**, 18.56 yd laterally displaced. One second later
he is 13.70 yd laterally displaced and behind along that heading. No further
wrap is acquired before the touchdown. This is lost containment in both
weak-draw arms, not evidence that the v2 catch transition alone pulled a
well-positioned safety out of his escape-lane responsibility.

Saved recording visualization:
`out/catch-transition/p4-geometry-execution.png` and `.svg`. Arrows show
achieved entry velocities; curves show actual runner speed, support and
reported selected-grasp force. All full-play traces retain frames/telemetry.
Event labels refer to the decision tick; `firstLoaded` refers to the completed
World-step boundary. These clocks are distinguished throughout the receipt.

## Small control panel and remaining uncertainty

P58 retains **38.60-YAC TD → 6.49-YAC tackle**. First loaded heading mismatch
improves **130.4° → 57.4°**, crossing **9.28 → 6.19 yd/s**, separation
**1.260 → 1.059 yd**. Its rear reach becomes a tighter rear form wrap and
survives 0.70 s through finish instead of slipping after 0.05 s. Execution
actually becomes weaker (**1.600 → 1.292**), so a favorable execution draw
does not explain that improvement. A real runner fall is followed by a CB_W
assist; assistance is measured, not changed by a helper rule.

P16 preserves the **same actual interceptor, I7204-CB1 / FS, index 20**, at
4.40 s. The later defensive return differs, finishing by tackle at 9.40
rather than 9.95; this is not an offensive catch/YAC result. P67 and P95
remain byte-identical. P19 remains a tackle, 7.45→5.92 YAC, but the selected
defender's first geometric quality worsens **0.604→0.088** and immediate
helpers remain essential. P103 remains a tackle, 8.02→4.69 YAC, with the NB
now acquiring first on a lunge and the selected FS assisting. Shorter YAC
does not make each selected defender's approach better. P173 stays exactly
unchanged, 76.25-YAC TD, with zero changed requests.

All eight inputs finish naturally; there are no timeouts, penalties or
unfinished full-play outcomes in this panel. Short recovery snapshots are
bounded measurements, not additional completed tackle outcomes. Six
factorial arms (including two natural controls) and sixteen panel arms pass
observed/plain parity: **44 full runs**, repeated once for portable-input
verification. These are the same inspected encounters, not 88 fresh samples.
All five launcher receipts exit zero with inputs unchanged. Typecheck/build
pass; source comparisons verify no runtime/config/package changes. The full
baseline suite was already validated at its pin; it was not rerun for these
diagnostic-only files.

The portable scripts require no archived `out/catch-arrival/` traces. On Node
22.23.3 with `npm ci` complete, regenerate the same comparisons and film:

```sh
npm run baseline:run -- --receipt out/catch-transition/portable-matrix-receipt.json -- node --import tsx scripts/diag/catch-transition-study.ts out/catch-transition/portable-matrix
npm run baseline:run -- --receipt out/catch-transition/portable-panel-receipt.json -- node --import tsx scripts/diag/catch-transition-panel.ts out/catch-transition/portable-panel
python scripts/diag/catch-transition-figures.py
```

The report collector additionally reads the initial matrix/panel and check
receipts retained in this session; their complete contents and hashes are
already in the compact evidence. The portable regeneration independently
verifies the stored natural body/RNG signatures, acquired-state invariance
and observer parity before writing results.

## Integration judgment and smallest next experiment

**Not ready for integration.** There is no technical execution roadblock:
exact native states, actual draws, observations and control results are
reproducible. Substantial progress was made by separating physical approach
from stochastic execution and removing a misleading P4 rejection criterion.
The roadblock to a new transition patch is causal evidence, not tooling.
This panel does not establish that a transition patch would improve football.

The smallest next controller experiment is a **shadow comparison on this same
panel**: reconstruct one near-hip interception objective from the consumed
receiver observations and score its held movement against the current
request on both sides of the catch using the existing interception and
movement-preview machinery. Keep the existing eligibility/ball-contest rules
fixed; introduce no new arrival gate or timer. Recompute only as observations
change. First ask whether it reduces achieved crossing without surrendering
attainable closing or leverage. If that reveals a repeated consequential
decision error, test that one objective with both actual P4 execution values,
the P58/ordinary controls and P16. Only then declare fresh players/plays for
transfer. Helper arbitration, roster capabilities and physics remain separate.
