# Unpromoted combined cutoff and defensive-cue run validation

This is the retained **unpromoted combined d73 experiment**, not the shipped
engine. Production uses cutoff-only dd4; its final panel is in
`installed-cutoff/`. The full d73 check passed 845 tests but its QB cue was
withheld after adverse native passing and matched game evidence.
Original `out/cutoff-surface/` file names below are retained collection-time
references; the corresponding published files are `run-*` in this directory.

Final narrowed source `d73aaed8c8095e2b7050ae1fd07fe257ff44c8b7805811369b955750856b1121`; cached promoted C `246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469`. RB carrier and shared World are exact C. No baseline resimulation. Separate cutoff-only dd4c data remain in short-probe.json and prototype-review.md. The earlier f641 coarse-ray packet is archived under coarse-ray/ as **unpromoted**; it is not this final validation.

## Common panel

Unchanged published collector and common metrics definitions. All 162 common initial projections, initial hashes and profile hashes are exact; all 324 cached/final observer controls match; all 324 finishes are natural. The balanced 160 and separate 2 supplements are never pooled as NFL rates. New installed contactFit is absent from the unchanged common projection; four sidecars explicitly record it as an intended installation change.

| Ordinary 160 | Cached C | Final narrowed candidate |
|---|---:|---:|
| meanYards | 1.386 | 1.334875 |
| stuffs | 37 | 41 |
| runs10Plus | 0 | 0 |
| actualWholePlayClimbs | 116 | 114 |
| actualCheckClimbs | 5 | 5 |
| olFalls | 17 | 20 |
| olDowns | 15 | 18 |
| cancelledTransitions | 9 | 10 |
| staleMemberUpdates | 0 | 0 |

The two separate supplements have mean 1.520→1.575 yd, three whole-play climbs on each side, no stuffs or OL falls, and natural finishes. They remain separate from the ordinary panel.

Actual whole-play climbs 114; unchanged command-local capture reports only 5 and omits 109 prepass events. No loss of those omitted events is inferred. Native arm impulse/work, support work and traction limits pass on 1668 captured final native samples. Arm rounding excess is 2.13e-14; work residual 1.1e-11; momentum residual 3.12e-12; unexplained motor work excess zero. These describe captured rows; controlled tests supply the independent mirrored and wrong-arrival checks.

## Four full native sidecars

All four match the same generic final inputs, outcomes, events and profile hashes, and all observer/plain controls match. Every counted loaded sample requires a fresh actual World work ledger, current delivered actor load, nonzero native joint force and positive actor arm impulse. Retained forces from an unsolved whistle row are never counted.

| Input | C yards | Final yards | Actual solved loaded samples | Min actual support | Min inside ordering |
|---|---:|---:|---:|---:|---:|
| CT-R1-power-under-R-S3 | 4.70 | 4.12 | 50 | 1 | 0.524265 |
| CT-R1-power-under-L-S3 | 2.00 | -1.14 | 42 | 1 | 0.707833 |
| CT-R1-split_zone-tite-R-S3 | 0.01 | 0.01 | 46 | 1 | -0.217764 |
| CT-R1-split_zone-tite-L-S3 | 1.18 | 1.18 | 54 | 1 | -0.165193 |

Both Power cutoffs demonstrate actual loaded containment with unchanged diagonal drive, beyond improving measured phi. No improvement in yards is claimed. Reacquired joints remain visible; loaded sample counts do not imply one uninterrupted joint. Both inside-shaded Split/Tite controls receive no contactFit and preserve exact complete events and yards. The right control preserves every packed recorded position and facing value. The left differs at only one packed replay scalar: CB_S x at 3.0 s is 48.4→48.5 yd; all other packed position/facing/time samples are exact. Replay rounds position to 0.1 yd, so this does not establish equality at unrecorded precision. See inside-controls-final.json. Negative inside ordering on these inside-shade controls is expected, not a failed outside-wall assignment.

The independent cutoff-only dd4c experiment preserves both Split/Tite controls’ cached complete events and recorded agent trajectories exactly. Its mixed/worse Power gains remain preserved independently. The inherited (-.3, drive.y*.6) shoulder is an initial technique heuristic, not an NFL-calibrated universal cutoff angle. Acquired frames and hand identity persist; wrong actual arrivals still lose leverage. All 17 focused cutoff tests pass.

## Retained adverse pairs

All pairs, positive and negative, remain in comparison.json. There are 6 ordinary losses of at least 2 yd:

| Input | C yards | Final yards | Declared cutoff installation scope |
|---|---:|---:|---|
| CT-R1-oz_strong-over-R-S11 | 4.32 | 0.30 | LT→DE_W |
| CT-R1-wz_strong-under-L-S3 | 6.15 | 1.80 | RT→DE_W |
| CT-R1-wz_strong-tite-L-S11 | 6.14 | 3.44 | RT→DE_W |
| CT-R1-power-under-L-S3 | 2.00 | -1.14 | RT→DE_W |
| CT-R1-trap-tite-L-S11 | 8.99 | 6.37 | RT→DE_W |
| CT-R1-duo-over-R-S3 | 1.21 | -0.94 | none |

Scope annotations reconstruct the deterministic planner predicate from recorded initial facts; the generic panel did not record actual contactFit for those inputs. They identify potential exposure, not causal attribution. The final combined source contains cutoff and narrowed delayed QB/zone cue changes. The Duo loss has no cutoff installation. No adverse pair is excluded or corrected by tuning yards. All 5 gains of at least 2 yd are also retained.

The six losses, three additional OL falls and downs (falls 17→20, downs 15→18), and mixed mean are regression leads. Successful local containment establishes the repaired contact technique, not broad football or NFL accuracy. Shared World and RB remain unchanged.

## Files and reproducibility

Collectors are unchanged scripts/diag/combo-transfer-review.ts and ignored collect-four.ts, generated from the pinned common tap 46e3be84. compare-final.py imports the published common metrics and native-budget functions without executing historical scenario-specific main functions. All candidate sourceBefore/sourceAfter checks require the final d73aaed8 hash above. The comparison rejects initial, input, source or observer mismatch. Root reports the final full suite passed: 845 tests in 74 files; root owns the remaining package/build checks and promotion.

- `candidate.json.gz` sha256 `a7364ca57aedac43f9663f0028b549e5f43403c83f09c464a06e10bbe3408361`
- `candidate-film.json.gz` sha256 `16184f723d7a08b47fd480e927971996e509e522a599001575f038ccdc43fac0`
- `four-final.json.gz` sha256 `1d7c23befb3634d28d96a46d936c32fb9e1b18345635622ca7b58ed49118afd5`
- `comparison.json` sha256 `312c819a82fb9bfda599b1f4d8e986026a9943829c03486efa2b535fcf3009e2`
- `inside-controls-final.json` sha256 `59d32718576369fdcc790e406de46af120a9b02fc2a758a383f32a6d29ee3d23`
- `collect-four.ts` sha256 `dcd152d9f5fd8a5c54bb5d03fb7671a52e5155da640bd976f72192ed9401495c`
- `four-instrument.ts` sha256 `836baea94a50913bcf73e971c3806e4200297a18e80b7d23b07ff8cbf03e7a28`
- `compare-final.py` sha256 `6177b78aba2e97ef008fd05e1cecb3fefca0d8738dd565b2fc833b0ab66d4c50`
