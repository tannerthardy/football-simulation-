# YAC: receiver blocking reads and the remaining contact chain

The supported correction is **receiver run/pass recognition**, not stronger
tackles. A nearby receiver's slow release counted as blocking even when he was
upright and making no blocking contact. The corner could leave coverage before
the throw. Recognition now uses the existing delayed pad/contact picture,
restricting contact evidence to the observer himself. Priors, uncertainty,
reaction delays, movement, contact physics and player capabilities stay intact.

The small candidate is based directly on accepted develop. **Do not merge the
experimental checkpoint or the diagnostic branch to obtain this correction.**
The full combined suite remains the designated Integration owner's job.

## Pins and measurement

| Arm | Tested commit | Engine SHA-256 |
| --- | --- | --- |
| Accepted develop | `a1b16e666a9ee7d1bc1d2aecba141fc535863b24` | `e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54` |
| Isolated read correction | `dc0f104a588a486cdb38d97d1e5770dce1a3de61` | `03d8e3ea090db7cda6f6d46b4788682b6c9c4350b91ab890e72da50a248cc7ad` |
| Original experimental witnesses, #54 | `404d3366d92449c30aedcba1957812fe5ea8b9aa` | `dd173a3ef44f22b5ee74f3cc17ef15b2137203cea58dd2fa12fbaad12c4784ba` |

Documentation/evidence commits do not change these engine hashes. Remote develop
was rechecked at `a1b16e6`. Node **22.23.3**, linux/x64, the unchanged dependency
lock and all **44 resolved flags** are recorded in the
[evidence packet](../../data/reviews/current/yac-blocking-read-evidence.json).
Use the baseline launcher: centered hands/integration, legacy support, mean
support integration, adaptive World, `RUN_CONTACT_COMPONENTS=1`; experiments
remain off. No speed, braking, grip, hold, roster or physics edits.

Clean catches are completed pass plays with neither `foul` nor `nullified`.
Quantiles interpolate at `(n-1)*q`. Receiver contacts and breaks are filtered by
the actual catcher's identity and happen after his catch; QB contact elsewhere
in a play does not count as receiver contact. Unfinished endings are separate.

The eight archived checkpoint games give **189 accepted catches, 8.88 mean YAC,
23.06 p90**; experimental #54 gives **187, 8.84, 24.46**. Neither cohort contains
an unfinished catch. The historical 2022–23 NFL clean-catch comparison is
**5.16 mean / 12.0 p90**. October 11's sim review and `4ded6b6` are historical,
not the current measured simulation baseline.

## What caused the witnessed failures

**Coverage before pursuit.** On experimental power-zone P36, actual catcher
`H3-WR1` gains 88.88 YAC without a recorded contact/wrap. CB_W reads run at
0.95 s from an upright receiver accelerating at 2.91 yd/s in his delayed
picture. At the old release, 2.30 s, the corrected corner is about **3.59 yards**
away rather than **7.04**, and has stopped drifting into the run fit. On clean
develop with the same frozen setup, the 88.92-YAC completion becomes a QB
scramble/tackle: **a removed abandoned-coverage window, not a rescued tackle**.
The corner instead reads pass at 1.75 s. The correction does not tell him the
offensive call, intended target or future route.

**Approach and containment remain distinct.** Experimental P89's actual catcher
`A3-WR3` gains 71.48 YAC with no recorded contact/wrap, despite correct pass
reads. The corner reacts to the comeback while already moving upfield; after
the catch he crosses behind the runner and misses standing reach. P36's safety
also arrives with roughly 8 yd/s of relative transverse motion. These are
costly geometries, not proof that an informed, feasible replacement request
has been found. The post-catch movement-preview scoring pilot and the separate
deep-safety escape forecast both leave the two TDs intact; neither is included.

**Loaded contact has a real effect and can still lose.** In experimental P2,
actual catcher `A3-WR1` is agent 9, not the nominal X. The first loaded hold by
`H3-S1` is a side lunge, not a rear form tackle: step-start distance **1.67 yd**,
transverse speed **7.15 yd/s**, first solved force about **355** engine force
units, and about **0.35 s** until slip. The runner's support deviation rises
and ground impulse changes before recovery. In ordinary experimental P72,
`H3-CB1` sustains a rear form hold at **0.94 yd / 1.75 yd/s**, with first solved
force about **762**, until the eventual tackle with help. These are different
entries/players, not a matched grip-strength experiment. Engine force units are
kg·yd/s²; multiply by .9144 for newtons.

Across the current experimental cohort, **9/21** catches with 20+ YAC have no
recorded receiver contact/wrap and **8/21** contain a receiver broken-tackle
event. Median nearest defender at catch is about **4.88 yd** versus **2.32** on
ordinary catches, using rounded film positions. Standard archived film lacks
solved grasp force; do not promote its wrap events to loaded-contact evidence.
The earlier count of eight no-contact explosives included contact elsewhere
in one play. The compact packet preserves both actual identities and the
measurement limitation.

## Focused evidence and adverse controls

The original six native inputs were reconstructed through their exact game
prefixes and checked against cached film/stats. Observer traces preserve
baseline result/body/perception/RNG signatures. On clean develop, the frozen
P41 input's rear form tackle remains **3.83 YAC**, with identical loaded entry, force
and subsequent support samples. Twelve fixed plays on two fresh roster pairs
retain run controls, successful tackles, play action and an earned **55.74-YAC
TD**; the fresh Mesh catch improves from **2.69 to 0.59 YAC**. Four additional
fresh pistol/12-personnel hitch/PA controls retain their outcomes on #54.

Adverse evidence stays visible: experimental spread P74 remains a TD and gains
**0.35 additional YAC** with the corrected read. The pursuit pilots do not
repair the explosives. Better receiver recognition does not establish that
arrival, grasp survival or secondary containment is globally solved.

**66 focused checks and typecheck pass** on the isolated develop candidate.
The six new recognition checks preserve slow upright releases, actual low-pad
and own-contact cues, and independence from hidden live receiver motion,
private call and remote teammate movement. Existing approach, pursuit/contact,
catch-contest and coverage-judgment contracts remain. The current `see` API is
still delayed-perception infrastructure, not a completed gaze/occlusion repair.

## Bounded full-game result

Two candidate games reused the unchanged accepted checkpoints; no baseline
games were rerun. Schemes, generated teams, seeds, flags and settings are frozen
in the diagnostic input manifest. The selected pair is exploratory, not an
unbiased league sample or a matched per-play treatment estimate.

| Clean catches | Unchanged develop | Read correction |
| --- | ---: | ---: |
| Completions | 82 | 97 |
| Mean YAC | 10.18 | 6.35 |
| p90 YAC | 30.44 | 14.21 |
| 20+ YAC catches | 14 | 7 |
| Unfinished catches | 0 | 0 |

Power-zone mean/p90 moves **11.65/30.21 → 7.19/15.99**; spread-air moves
**8.63/30.40 → 5.16/13.37**. Median release time is unchanged at **2.50/2.25 s**
for the two fixtures. Completions increased; do not describe this as simply
suppressing catches. Later calls, fatigue and execution histories diverge,
so these are paired game outcomes, not a causal estimate of yards saved.

**Run-game adverse:** power-zone rushing average moves **6.82 → 1.17**, median
**1.32 → .95**. Four baseline run TDs account for 278 yards. Replaying their
exact native setups preserves **52.5, 71 and 62.5-yard TDs**. The 92-yard inside
zone becomes a **25.31-yard gain**: acquired low-pad #2 blocking at .65 s gives
the SS a run read at **1.05 rather than 1.30 s**, the other corner reads run at
**.90 rather than 1.35**, and support contact starts at **3.40 rather than
4.55 s**. No extra observation or physical capacity was supplied. This is a
supported defensive containment improvement while retaining an offensive win.
Later tackle draws differ; the shorter gain is not a matched-execution estimate
of tackle quality. The demonstrated changes are the informed read and earlier
support/entry geometry.
The first changed run is only **−5 → −5.01 yards / 7.50 → 7.25 s**, after which
whole-game histories diverge. Run population balance remains a Run Game
follow-up; the matched controls do not certify it. Candidate recording neutrality
also matches the plain P94 result/body/perception/RNG signature.

## New tracking-guided transfer

The [pinned follow-up and reproducible native inputs](https://github.com/tannerthardy/football-simulation-/blob/17699ab/docs/reviews/yac-tracking-followup.md)
add a new accepted-game witness without changing this runtime. Same-input
power-zone P046 goes from **50.06 YAC / TD to −.17 / tackle**: the actual
receiver's full body history is identical through catch and recorded ball
positions match. Avoiding the unsupported run commitment puts the corner into
a front form tackle before the receiver turns upfield. The ordinary P009 side
tackle remains adverse at **6.35 → 7.51 YAC**; the separately verified rear
control is reused. PR61 alone preserves both baseline native executions, but
**the #58/#61 combination remains untested**. Three offline measurement checks
pass; no new full games or shared-suite runs. NFL tracking and Big Data Bowl
research support measuring opportunity creation separately from conversion.
Traffic-stop and approach probes supplied no additional supported production
fix. Shared spacing/clearance remains with Do-It-All!; no helper or physics
change is included here.

## Handoff and evidence reuse

**Ready for the Integration owner's combined check as a recognition correction.**
Not a claim that YAC is calibrated, all run balance is correct, or every broken
leg hold should fall. Only the two controller files and focused recognition
tests implement the fix. Run Game should note the shared CB/S recognition
change and the run evidence above. No run-fit, helper-coordination or contact
policy was imported. The general catcher-identity shortcut, prolonged/ground
holds and physical recovery questions remain separate.

The full reproducible inputs, collectors, frozen prototypes and compact evidence
are on [`codex/yac-containment-repair`](https://github.com/tannerthardy/football-simulation-/tree/codex/yac-containment-repair).
Its runtime includes #54 and must not be integrated wholesale. Copy only
diagnostic scripts/fixtures if reproducing on a different engine; the receipt
records every arm's actual source. Local saved film is
`/workspace/football-yac-containment/out/yac-containment/native-comparison.html`,
with both complete candidate game films under `out/yac-read-games/experimental/`.
Film/report exports run zero plays. Cached standard film cannot reconstruct a
World mid-play; full setups were captured through the necessary native prefixes.

New full-game simulation costs **46.35 s**, plus exports. Successful native-prefix
extractions/restoration checks cost **47.49 s**, including the targeted run
probe; saved single-play evidence is reused. No full suite was run here. An
initial collector serialization check, an omitted TS loader and diagnostic-only
type errors were corrected; their failure receipts remain local and do not
represent completed football trials. Do not rerun games or the shared suite
merely to acknowledge this handoff.
