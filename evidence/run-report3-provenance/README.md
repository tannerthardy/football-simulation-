# Provenance bundle: like-box report3 (#373 cross-check) and its sim tapes

This branch carries existing files only. Nothing here was re-simulated or reconstructed. It is evidence for
[#373](https://github.com/tannerthardy/football-simulation-/pull/373#issuecomment-6485357641) and the
[#375 hold](https://github.com/tannerthardy/football-simulation-/pull/375). It is not for merge.

`MANIFEST.json` gives:
- full SHA256 of every original file;
- the gzip SHA256 of each bundled copy;
- the exact commands;
- the resolved-settings receipts;
- the RNG stream mode;
- the stage accounting;
- the items that were never saved.

## Contents

| File | What it is |
|---|---|
| `report3.json.gz` | Exact `report3.json` bytes, gzipped. Original SHA256 `e01f94503dbe9ce0ef2c583823f46a54794faaa5ec171a740c771f63a794a5da`. |
| `trace-seed{7,9,11,13}-run-DEV542.json.gz` | The four sim tapes report3 read, in that order. |
| `seed{7,9,11,13}-run.json.gz` | The 456 saved snap constructors the tapes were replayed from. |
| `run-17932196063*.json` | The four `baseline:run --candidate` launcher receipts. Each has resolved flags, world defaults, commit, Node, command, exit code and timestamps. |
| `overlay.patch`, `run-trace-watch.ts` | The uncommitted restage/recording overlay at production time, against `542d938d`. |
| `arms3.sh` | The launcher script that ran the four replays. |
| `box-settings.json`, `box-clusters.json` | The `--sim-settings` and `--sim-clusters` inputs passed to the suite. `box-settings.json` is a hand-written summary; the receipts are the resolved record. |
| `stage-accounting.json` | Per-file exclusion IDs (no run concept, nullified, no non-QB carrier) and per-constructor setup SHA256. |

## Not included

NFL tracking: the all-play cache SHA256 is `9aa1b0873bbd049fab2f0f04a12c503d1115241df8c0b490e2eaaf13bc8f0726`. It is licensed and identified by hash only.

## Never saved, stated rather than reconstructed

See `MANIFEST.json` → `missing`:
- the capture receipt and source for the 456 constructors;
- a with/without `--trace` passive-recording control;
- parent roster/game identities beyond the capture seed.
