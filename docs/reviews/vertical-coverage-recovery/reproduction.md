# Evidence and reproduction

The [provenance](../../../data/reviews/current/vertical-coverage-recovery/provenance.json)
and [summary](../../../data/reviews/current/vertical-coverage-recovery/summary.json)
pin commands, all resolved flags/World defaults, Node22.23.3, platform,
dependencies, source/runner fingerprints, actor identities and outcome status.
The accompanying [bundle receipt](../../../data/reviews/current/vertical-coverage-recovery/bundle.json)
identifies the [fetchable data-only archive](https://raw.githubusercontent.com/tannerthardy/football-simulation-/cd5c47eb9fb244ad4a7136b207009ce740bbb319/evidence.tar.gz),
published at `cd5c47eb9fb244ad4a7136b207009ce740bbb319`.
It retains exact source hosts, native traces, rejected versions, local plant
fixture, frozen fresh inputs, shared restorer and capsule checksums. Do not
merge the evidence branch.

The archive is 45,824,471 bytes, SHA256
`de56edc8ab23fa6dc4c72816c0e90344a34b0ea6313647aa2600366617a573e5`.
All 945 physical files were rehashed against the included manifest; all 15
symlinks resolve within the restored capsule directory. Extract into a clean
checkout of this candidate after verifying that checksum. Existing `out/` work
should be preserved rather than overwritten.

Historical inputs/films were generated on `70b4db6`. Accepted `0000e56` differs
through #128 quarter-flat force continuity. All eight newly replayed accepted
baselines match original native frames/events/telemetry, and completed stats.
P027/P192 reuse compatible passive-baseline receipts from #139; those hook
sources have their own recorded hashes and exact original parity. No rounded
geometry supplies a resumable checkpoint. The two fresh cases are new frozen
initial conditions, not historical restorations.

#131's `reconstruct.ts` is copied unchanged. It reconstructs prior scouting
from original calls, verifies constructor RNG/call/player-energy identity and
rejects staged inputs whose original pre-constructor state is missing. G4's
already-restored observation data and original native scout metadata were added
when the missing local capsule was identified. P105's different missing-state
hold remains. No download, duplicate tracking pipeline or new game collection.

Measured native code is `a505716` / source `690db3e…`. Final `61bf22e` /
`c9614df…` only adds acquired-image expiry handling. Every recorded
RouteObservation cue in the 12 final cases has age **at most .4 seconds**,
a superset of planner inputs; the new `age>.4` branch is therefore inactive.
The exact source patch and per-case maxima are in the summary. Final unit
checks cover the newly active stale/contrary-picture boundary. No native case
was repeated just to change this publication/source label.

Saved-data reduction executes zero new snaps:

```sh
python scripts/diag/vertical-roof-analyze.py
```

Native repetitions are opt-in and budgeted at five seconds per case. Restore
the archive into the repository, keep its measured hosts, and run only the
specific unresolved case through `scripts/baseline.mjs`. For example:

```sh
node scripts/baseline.mjs --candidate --receipt out/vertical-roof/repeat.json -- \
  python scripts/diag/vertical-roof.py --arm plant-aware --ids G1-P185
```

The launcher describes the checkout; each native result separately hashes its
actual source host. Existing hosts are never overwritten by `--prepare`.
`vertical-roof-followups.py` freezes fresh seeds only once and refuses seed
regeneration. Adverse continuations repeat exact initial inputs because whole
controller checkpoints were not persisted; their first six seconds are asserted
identical to the original prefixes. Explicit continuation horizons prevent
unfinished plays from being called touchdowns or tackle failures.

## Required contract review

Original red assertions/receipts and the paired native rule trace remain visible;
no failure was silently excluded:

1. **MOD delivery:** assert the corner releases #1 after carrying him. A later
   legal rescue of a different vertical can end in man; requiring a final zone
   job confused delivery with the entire subsequent play.
2. **Quarters #2 out:** the old 2.4-second native prefix still records H as
   vertical. Its old FS→X help was `protect-vertical:X` after the corner lost X,
   not acquisition of the out. The corrected test preserves that opposing
   information boundary and separately supplies acquired #2-out pictures to
   verify the actual coached help-on-#1 rule.
3. **Empty depth:** a command-speed ceiling below6 yd/s did not distinguish an
   empty landmark from legitimate burst demand. The contract now checks the
   receiver-relative objective below the landmark and actual bounded movement.

Other retained nongreen evidence: the initial hard-coded query-count assertion
was corrected against the real legacy query count; exact P185 plant and aging
image tests fail before their fixes; a launcher caught an unrelated diagnostic
file edit during an early isolated run, superseded by the frozen green panel.
The first Python source-hash reduction sorted Path components rather than the
launcher's full path strings; corrected reduction asserts exact launcher hash
equality. None of those issues was repaired by editing physics, ratings or
selecting replacement outcomes. The rejected static reserve is preserved with
the production free-motion comparison that disproved it.

Review/adoption boundary: the six runtime files plus directly affected tests;
no #127 experimental policy, #131 catch hookup, #132/#134 QB support, #135 QB
forecast, blocking changes or diagnostic ancestry. `runtime.patch` is a minimal
current-develop extraction. Integration performs the preserved combined checks
once after independent review.
