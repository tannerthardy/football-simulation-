# Position technique and awareness evidence

Read the [position review](../../../../docs/reviews/position-technique-and-awareness.md)
and [independent verification](../../../../docs/reviews/position-technique-repair-verification.md).
Only the installed OL cutoff surface ships. Both QB torso-direction policies
and the RB entry prototype remain **unpromoted**. Green tests prove local
properties; native football also determines whether a controller is useful.

## Source boundaries

| Source | Canonical whole-src SHA256 | Disposition |
| --- | --- | --- |
| Baseline C, commit `80e8151` | `246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469` | Immutable reference |
| Cutoff only | `dd4cbb75c981e82e8a33d8e5d1c30d72d922d824de99fd9cba77403d0c7f9843` | Shipped |
| Cutoff + broad QB ray | `f641f128241746ab1b0b6a90f13affb05a0c8505e35792195ce19497ea5bccdd` | Withheld |
| Cutoff + narrowed QB cue | `d73aaed8c8095e2b7050ae1fd07fe257ff44c8b7805811369b955750856b1121` | Withheld |

`engine.patch`, `coarse-engine.patch` and `combined-engine.patch` reconstruct
these three candidates separately from C. The actual `source-version.ts`
verifies each forward/reverse patch in fresh archives; the cutoff tree also
byte-matches production. `patch-proof/proof.json` is current. The retained
`d73-proof` receipt uses the historical name `engine.patch` for what is now
`combined-engine.patch`; its bytes and source remain unchanged.

Only agent.ts, blocking.ts, engagement.ts and playsim.ts change in production.
World, physical profiles, movement, support, pursuit, tackling, coverage and RB
behavior are exact C. No force, traction, work, grip or strength parameter changes.
The cutoff installs a desired shoulder before contact, separately from drive;
actual bad arrival still loses leverage. It never rotates acquired hands to
excuse a miss. The inherited shoulder angle is a technique heuristic, not an
NFL-calibrated universal angle. Position familiarity is not call mastery.

## Shipped cutoff witnesses

`installed-cutoff/` contains the 162-input candidate, ten existing fixed films,
four full native sidecars, recomputed comparison and inside-control receipt.
Reuse baseline C's [162 saved inputs](../combo-attention/candidate.json.gz);
that entire panel was not re-simulated. All 162 common initial projections,
profile hashes and observer/plain controls match. All finishes are natural.
The ordinary 160 remain separate from two supplements; neither is an NFL sample.

The common collector omits the new `contactFit` installation. Four sidecars
explicitly retain it, real consumed pictures, requests, native bodies and loads.
Only a fresh World solve, current delivered arm load, positive arm impulse and
nonzero joint force count as loaded contact; stored force on an unsolved row
does not count again. The Power right/left walls show 50/42 solved loaded
samples and positive inside ordering, within unchanged budgets. Right contains
two acquired hand-joint episodes, not one uninterrupted whole-play joint.
Both inside-shade Split controls preserve complete events and recorded frames;
the latter are rounded to 0.1 yd, not full native-state equality.

| Ordinary 160 | C | Cutoff only |
| --- | ---: | ---: |
| Mean yards | 1.386 | 1.3421875 |
| Zero/negative runs | 37 | 41 |
| Runs of 10+ yards | 0 | 0 |
| Whole-play climbs | 116 | 114 |
| OL falls | 17 | 19 |

All six losses of at least two yards and all five gains remain in comparison.json.
Better loaded containment is the verified repair; improved rushing efficiency
is not claimed. The old command-local capture sees only five climbs; whole-play
events include another 109. Reconstructed installation-scope annotations on the
generic panel are exposure labels, not actual recorded assignments or causal
proof. Native work residual is about 1.14e-11 and momentum residual 3.08e-12;
saved arm, traction and motor-work limits pass. These describe captured rows,
not NFL-calibrated contact loads.

## Retained experiments and audits

- `qb-cue/`: all 24 common native passes at C, broad ray and narrowed cue; each
  has 24 neutral observer/plain controls. Each phase has 23 natural finishes
  plus a live eight-second endpoint, with different censored IDs. Only 22 pairs
  are jointly natural. The narrowed cue removes the invalid early empty-grass
  drift, but mean yards still rise 8.649→10.541 and Cover3Match explosives remain.
  Delayed torso direction with confidence one is not validated gaze. The
  production oracle remains known debt; isolate its removal from directional
  weighting next. The exact 16-test and source snapshots are archived there.
- `run-*`: retained combined d73 run panel, four sidecars and review, not shipped
  cutoff-only data. Original `out/cutoff-surface/` names inside comparisons are
  collection-time names; raw bytes are preserved. `run-coarse-unpromoted/`
  retains the earlier f641 run packet and its own original filenames.
- `cutoff-only/`: the earlier four-input cutoff probe, independently preserved;
  it does not substitute for the subsequent complete cutoff-only panel.
- `rb-entry-unpromoted/`: exact isolated prototype and red/green receipts.
  A legitimate bent approach can enter a lane whose far-midpoint direct ray is
  blocked. Preview/actual squeeze, loaded-body scope and penetration escape
  were not adequately proved. Production RB code is exact C.
- `movement-audit/`: 18 deterministic existing NFL drill paths, 72 trials at C,
  plus a generated-profile description. All finite/upright/bounded; task and
  controller mismatches persist. Same-path fitting is a diagnostic, not holdout
  prediction. Historical larger studies retain their own source boundaries.
- `pursuit-audit/`: requested-ray versus achieved-curve collision, abrupt gather
  threshold and unattainable rear-wrap witnesses at C. The feedback variant was
  re-run from exact C; an originally mislabelled interim receipt remains separate.

The new position audits use uploaded textbooks as aids, not verified coaching
authorities, repository instructions or measured force constants. Source facts,
native failures, coaching hypotheses and prevalence are distinguished.

## Final checks and matched game smoke

The shipped source passes **829 TS tests in 73 files**, typecheck and build.
Unchanged Python tools pass **22 tests**. Seventeen new cutoff tests include
native mirrored loads, actual wrong-side losses, stale perception, pass controls,
frame/hand preservation and target/job cleanup. C fails 13 feature cases, passes
two controls; two ordinary controls reuse cached native evidence. The unpromoted
narrowed QB feature passes 16 tests and had a clean 845-test combined suite.
Its four added release controls fail at the exact broad-ray source.

| Same generated-team game seed | C | Cutoff only | Combined narrowed QB experiment |
| --- | --- | --- | --- |
| 7 | 20–23 | 39–29 | 29–35 |
| 19 | 47–33 | 26–34 | 61–58 |

These two games are a completion/regression smoke check, not league rates or a
causal attribution of scoring. Combined QB results warned against promotion;
they were not tuned back toward the baseline. Logs and source-scoped checks.json
preserve both branches of the experiment. All physics-readiness limitations
remain; no percentage of possible gains exhausted is claimed.

## Reproduction

Use Node 22 and run from the repository root. Read-only commands need no NFL
download and reuse the pinned C files:

```sh
python3 scripts/diag/check-position-technique-patches.py
python3 scripts/diag/compare-position-technique-runs.py data/reviews/physics-world/position-technique/installed-cutoff/candidate.json.gz data/reviews/physics-world/position-technique/installed-cutoff/four.json.gz dd4cbb75c981e82e8a33d8e5d1c30d72d922d824de99fd9cba77403d0c7f9843 out/cutoff-comparison.json
python3 scripts/diag/qb-cue-compare.py data/reviews/physics-world/position-technique/qb-cue/before.json.gz data/reviews/physics-world/position-technique/qb-cue/candidate.json.gz out/qb-comparison.json
```

To collect another candidate, freeze source and label its actual hash:

```sh
node --import tsx scripts/diag/combo-transfer-review.ts out/cutoff-next/candidate.json.gz
mkdir -p out/cutoff-surface
cp data/reviews/physics-world/position-technique/run-tools/collect-four.ts out/cutoff-surface/collect-four.ts
node --import tsx out/cutoff-surface/collect-four.ts out/cutoff-next/four.json.gz
```

The generator is kept byte-exact and self-hashes its original output path. It
creates ignored `four-instrument.ts` from the pinned common tap. The saved
instrument is a receipt, not a different live collector. Reproducing an old QB
candidate requires its isolated source archive; today's engine must not be
relabeled as d73. Full tests/build run after source freeze; repeat measurement
only for changed causes, failed checks or an unresolved regression.
