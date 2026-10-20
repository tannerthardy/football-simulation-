# Coherent run-contact packet

[Main report](../../../../docs/reviews/run-contact-composition.md) ·
[Independent review](../../../../docs/reviews/run-contact-combined-independent-review.md) ·
[Dependency map](../../../../docs/reviews/run-contact-claude-dependencies.md) ·
[Chart PNG](comparison.png) / [SVG](comparison.svg) · [Summary](summary.json) · [Manifest](manifest.json).

Accepted source: 2c98bed9 / SHA4273994f; runoff:859d0255 / SHA573bc9c;
drive:5bc7605f / SHAef9934bd; combined:5e55a1cc / SHAf8f2f9bc.
The manifest stores full pins/hashes, flags and every exact input. All 22 players
react normally from a fresh PlaySim constructor, with its ordinary observation
history; no injected later memory, frozen future path or removed obstacle.

| Case | Arms | Limit |
| --- | --- | --- |
| oz/strong/ace_12/over3/pair11/77 | accepted, runoff, drive, both | 8 s, all live/censored |
| wz/weak/ace_12/over2/pair31/1 | accepted, runoff, drive, both | actual tackles before8 s |
| power/strong/ace_12/under3/pair31/77 | accepted, drive, both | actual tackles before8 s |

The unused runoff contribution in Power was not rerun or counted as a pass.
Drive/both complete physical frames/requests/events/results match there.
Four accepted/runoff Ace compact files are reused verbatim from ae6b1d9's packet;
seven new files are compacted from the current full collector outputs. Compact
traces preserve full setup/profiles, all 22 bodies/requests, contact impulses,
hand loads and selected controller observations. They are not restart snapshots
or full work ledgers; budget maxima and original full gzip hashes are recorded.
No film was generated. Charts are directly viewable and downloadable, no zip.

Time convention: t=controller/pre-World interval start; end=t+dt=achieved state.
A carrier event at 2.50 labels the following physical interval. Do not compare
entry velocity to that tick's new request as though it already executed.

Use Node 22.23.3 and the matching runtime source. The collector is byte-identical
at drive/combined checkpoints and copies the saved Claude case constructor.
Its runner-read option is off throughout this matrix. For each case/arm:

```sh
node scripts/baseline.mjs --candidate --receipt out/selected-receipt.json -- node --import tsx scripts/diag/zone-contact-execution.ts --case oz/strong/ace_12/over3/pair11/77 --until 8 --out out/selected.json.gz
```

Drive source is 5bc7605f, combined 5e55a1cc. Accepted runs use an exported accepted
source with this diagnostic copied in; the source tree hash must be4273994f….
Runoff evidence and receipt metadata remain at ae6b1d9's published packet. The
exported baseline inherits parent Git status, so its header/receipt commit is
not an accepted-runtime identification: verify the explicit source SHA. Its
copied Power receipt is byte-identical to the original nested-path receipt.

The exact shared collector SHA, case setup hashes, all 44 values, source hashes,
input/helper checksums and full-original gzip hashes are in manifest.json.
Selected profiles come from deterministic team pairs 11/12 or 31/32 at strength .55.
The static [analysis/chart operator](../../../../scripts/diag/run-contact-composition.py)
reads the committed compact files, runs zero simulation, recreates summary and
PNG/SVG. With matplotlib installed, run from repository root:

```sh
MPLCONFIGDIR=/tmp/run-contact-mpl XDG_CACHE_HOME=/tmp/run-contact-cache python3 scripts/diag/run-contact-composition.py
```

Seven new native prefixes 14.319 s; four reused; 39 focused checks/typecheck.
All new recorded validation/collector command time 33.802 s; no games/full suite/NFL
query. Counterfactual endings and later execution histories remain qualified in
the reviews. Independent acceptance concerns the narrow coherent command scope;
Integration still owns exact combined verification and adoption.
