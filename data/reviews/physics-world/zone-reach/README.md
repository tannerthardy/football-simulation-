# Solo zone reach: evidence and rerun

Read [the implementation review](../../../../docs/reviews/zone-reach-and-displacement.md)
and [the coaching review](../../../../docs/reviews/offensive-line-run-technique.md).
Watch [24 paired clips](../../../../viewer/zone-reach.html) or download the
[offline ZIP](../../../../viewer/zone-reach.zip). Clips were selected before
outcomes: four OZ/WZ Over/seed3 plays plus eight installed non-zone controls,
each shown with both engine sources. Their references are stable `ZR-…` IDs.
Select an OL player to inspect the consumed hip picture, stored intention,
actual engagement frame, requested movement and delivered ground/arm loads.
The panel stores intention separately from achieved position and loaded hands.

## Sources and scope

Baseline commit `1c9a693` has full engine-content SHA
`a629d4d04485ade21e4354b8078ed6cd0bf56b155aa92b83dad7f97cc2d8172f`.
Final engine-content SHA is
`cf53e3f0e72915d9798ed0cd411f669ae8bba40db9ed4bd9f6b630173f939316`.
The World module remains
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.
These content pins include uncommitted source at collection time, independent
of collection timestamps or the later commit recording these archives.

The 48 natural plays use one fixed generated .55 roster pair, Ace 11 and Cover
3. Forty are OZ/WZ × Over/Under/Odd/Tite/Bear × both sides × seeds 3/11.
Eight controls are IZ/Over, Duo/Odd, Power/Under and Counter/Tite, both sides,
with their fixed seeds. Every observed execution is rerun plainly to prove the
recording layer does not change the play. All eight control executions match.
These are matched football diagnostics, not NFL rates or a calibration sample.

Across the 40 zone plays, mean gain changes 1.598→1.763 yd and stuffs 14→7.
One OZ Odd/left/seed3 run supplies 6.31 of the pooled 6.61 extra yards; the
mean improvement is fragile. Native surface acquisition is the stronger claim.
Five losses of at least two yards, one new OL fall and a new 10+ run remain in
the evidence. Better acquisition is not proof of a completed seal or a correct
RB/combo sequence. The broader 144-play panel changes 1.585→1.696 yd, stuffs
39→33 and 10+ runs 3→2; its 96 non-zone rows are completely identical.
The 64 isolated tackle rows are identical. Two game guards retain divergent
football paths and mixed results; they do not estimate a league.

## Files

- `before.json.gz` / `after.json.gz`: all 48 native controller/contact traces,
  initial profiles, ordinary endings and observed/plain execution signatures.
  The matching `*-film.json.gz` archives contain the 12 fixed films per phase.
- `comparison.json`: all paired outcomes, original installed solo-reach
  acquisition, fresh versus stale reads and the sustained loaded inside run-off.
  Its 39 solo pairs per concept explicitly exclude 17 initial live-combo owners.
- `saved-audit.json`: the four earlier published OZ/WZ films reproduce 19
  opposing shoulder projections and 13 away-moving requests before first
  physical contact. Counts are diagnostic updates, not error frequencies.
- `prototype*`: first implementation, source `c0f71ae6`. `pre-transition*`:
  lost-angle-consistent phase labelling, source `4cd9284e`. Those phases have
  identical complete physical executions across all 48 plays. The final
  transition repair retains existing acquired frames and scales the cheap
  read's traction estimate by support availability. `transition-to-final.json`
  preserves all 13 execution changes from the pre-transition version.
- `transition-audit.json`: exact native-body inputs at the first retained-frame
  intervention in all 13 changed plays and the new LT/RB collision-fall window.
  This supports a mechanism; it is not a single-factor causal ablation.
- `engine.patch`, `prototype.patch`, `pre-transition.patch`: exact source
  changes from the pinned baseline, including the new module. They are research
  provenance, not patches to apply over current code.
- `current-runs.json.gz`, `current-tackles.json.gz`, `current-games9.json`:
  independent unchanged-input guards. Their baseline counterparts remain in
  `../ol-technique/`. No prior evidence was overwritten.
- Test/compiler logs, film integrity/browser checks and
  `verification-manifest.json` / `verify-evidence.py`: retained check results
  and immutable file pins. Default verification reads historical evidence;
  `--engine` additionally checks current code/tools/docs and reconstructs all
  recorded source variants from the patches.

All 732 TypeScript tests and 22 Python tests pass; typecheck and build pass.
The 18 new focused tests include next-update preservation of both mirrored
loaded legacy contacts. Their baseline run passes five unchanged controls and
fails the 13 new-feature cases. Empty compiler logs are expected on success;
`checks.json` records the exit results and the manifest pins the actual bytes.

Native horizontal force uses kg·yd/s², impulse kg·yd/s and work kg·yd²/s².
Multiply force/impulse by .9144 or work by .9144² for SI. Positive arm impulse
is player-wide tick accounting; a separate surviving paired joint and its
native load establish the contact witness. A positive playside center offset
does not certify outside half-man leverage or a successful seal.

## Rerun

Use Node 22.23.3 and installed dependencies from the repository root. Write new
measurements to ignored output directories; keep published evidence immutable.
The collector creates the matching `new-film.json.gz` alongside `new.json.gz`.

```sh
node --import tsx scripts/diag/zone-reach-review.ts out/zone-fit/new.json.gz
node --import tsx scripts/diag/run-contact-review.ts out/zone-fit/new-runs.json
node --import tsx scripts/diag/tackle-timing-review.ts out/zone-fit/new-tackles.json.gz
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/zone-fit/new-games9.json 9 --games-only
node node_modules/vitest/vitest.mjs run --maxWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
python3 scripts/diag/zone-fit-compare.py data/reviews/physics-world/zone-reach/before.json.gz out/zone-fit/new.json.gz out/zone-fit/new-comparison.json
python3 scripts/diag/zone-fit-audit.py
python3 scripts/diag/zone-fit-transition-audit.py data/reviews/physics-world/zone-reach/pre-transition.json.gz data/reviews/physics-world/zone-reach/after.json.gz out/zone-fit/transition-audit.json
python3 data/reviews/physics-world/zone-reach/verify-evidence.py --engine
```

The comparison/verifier inspect saved measurements without resimulation.
`run-contact-review` writes plain JSON regardless of filename; the published
run guard is explicitly gzipped with its decoded content unchanged. The other
compressed panels are native outputs. New timestamps/gzip bytes may differ
while decoded execution matches.

For baseline collection, archive the baseline commit into ignored scratch
space, reuse installed dependencies and copy the exact same collector. Confirm
the full source-content pin first; never replace live source during a collector.

Film export and browser checks consume saved evidence only:

```sh
node --import tsx scripts/export-zone-reach.ts data/reviews/physics-world/zone-reach/before-film.json.gz data/reviews/physics-world/zone-reach/after-film.json.gz out/zone-fit/replay.html
python3 data/reviews/physics-world/zone-reach/film-check.py data/reviews/physics-world/zone-reach/before-film.json.gz data/reviews/physics-world/zone-reach/after-film.json.gz out/zone-fit/replay.html out/zone-fit/browser
```

The browser check needs Python Playwright and Chromium. Unzip the published
viewer and open the HTML to watch offline. Its small video export records the
selected play; native panels expose intentions and achieved forces separately.
