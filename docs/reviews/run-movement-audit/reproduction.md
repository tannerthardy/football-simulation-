# Sources, restoration and measurement limits

Task branch: `codex/run-movement-audit`, isolated from accepted
`0000e560e0dbe31905151465152d412ba838803d`. Canonical queue checked
`aa9ed35272cc334ce0a7c79eec709970e5c628fc`. Prior vertical implementation #141 remains separate. This branch changes only diagnostic/report files.

Data-only evidence pin `902fa3f9d8608aaf295c7561d6b5c85e7d9b8813`.
[Bundle receipt](../../../data/reviews/current/run-movement-audit/bundle.json):
28,252,330 bytes; SHA256
`692831945dd8ee7b3aa72995f58365a92de1736c749b8170d8e7956df659e86c`.
All174 physical archive files were rehashed against the included manifest;
there are no symlinks or absolute/parent-traversing members. Preserve existing
`out/` work by extracting into a clean checkout. Do not merge the evidence branch.

## Exact existing puller inputs

Run #140 publication `e9f56e391fefdb4f8854e85b4966fd9e2b082083` supplies the unchanged `scripts/diag/puller-access.mjs`, frozen `test/fixtures/puller-access-inputs.json.gz` and independent `perimeter-installation.patch`. Restoring its source tree and applying that patch recreates **af87f432d53fb59c6b15c2195ababc65b98109ef8e5e664551ec028bbb45c596**: accepted develop plus held #99 explicit definitions, preceding the information-only candidate. The restored host's actual source, not its enclosing Git HEAD, is the execution identity.

The full all22 tape was not published in #140; selected decisions/outcomes were. Two bounded launches restore its eight exact inputs with the same passive recorder. No new seed/player/variant selection. The input hashes, source, installed setup, native endings and first-contact events match the published compact evidence. Original full tapes are unavailable, so **new all-frame equality to those tapes is not claimed**. Reuse #140's explicit K01/K02 accepted-versus-prototype and information-candidate all22 equivalence receipts; do not assume it for the perimeter calls.

Node22.23.3; all44 resolved settings/components1, CF_FLOW unset; PULL_PLAN/PULL_CUE/CLIMB_EXIT unset, corresponding accepted flags remain off. Full resolved flags/World defaults are in each trace and launch receipt. Source contains explicit prototypes but no automatic call-distribution change. Raw profile capacities, source files and recorder hashes are retained.

From the restored `out/run-movement-audit/puller-host`:

```sh
node scripts/baseline.mjs --candidate --receipt ../primary-launch.json -- \
  node --import tsx scripts/diag/puller-access.mjs run ../primary B01,P01,C01,K01,P02,C02 5
node scripts/baseline.mjs --candidate --receipt ../opposing-launch.json -- \
  node --import tsx scripts/diag/puller-access.mjs run ../opposing B02,K02 5
```

Do not rerun these merely to read the audit. The downloadable bundle retains both tapes. Five-second horizon, existing five-second per-case/30-second collector wall limits. Eight snaps, six endings/two censors;4.903109759 timed native seconds,8.314647832 launch-command seconds. No game/panel/full suite. No additional native intervention answered the observational question.

## Historical film

Reuse the already restored G1 `accepted-games-G1-zone-reference.tar.gz` from original immutable evidence `b9b9c17597970ddc87aa4a4e271fc4cfeef71909`. Its `accepted/zone-reference/game.json.gz` contains the selected P002/P015/P018/P021/P030/P032/P056/P117/P164/P175 clips. These were generated on **70b4db6a3ef53acc1a0e90cd055f1087205daa30**, source **9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941**. No new download or data collector. Individual extracted-file hashes are in provenance.

The accepted five-line #128 force-continuity delta does not alter the cited run functions. It can affect defensive behavior, so these old whole plays are not relabeled as current-develop outcomes. #126 is independently staged, not adopted here. #140's information candidate and Run's unpublished coordination work are not applied to the eight prototype tapes. Original #99 film uses still older physics/source; it was inspected for context and is not used as a current paired measurement.

Saved film is .10s cadence/.10yd positions, mostly .01 numeric telemetry. It is **not a restorable simulator checkpoint**. Paired replay/telemetry samples are recorded bodies/final commands, not the exact tick-start convention of the native tapes. Canonical offense moves +x; do not reapply the camera's `flip` flag. Presnap idle frames are excluded before selecting installed jobs. Nearest contact panels label both actual sample time and event time. Persistent player IDs are retained from frozen native setup; historical actor indices/names remain scoped to their original film rather than guessed IDs.

## Offline reduction and review

After verifying/extracting the bundle into a clean candidate checkout:

```sh
python scripts/diag/run-block-picture.py \
  --tape out/run-movement-audit/primary/trace.json.gz \
  --tape out/run-movement-audit/opposing/trace.json.gz \
  --historical out/run-movement-audit/historical \
  --inputs out/run-movement-audit/puller-host/test/fixtures/puller-access-inputs.json.gz \
  --notes docs/reviews/run-movement-audit/observations.json \
  --out out/run-movement-audit/pictures --no-plates
```

Remove `--no-plates` only to regenerate the 36 charts (about42.5s in the recorded final render). The script executes zero engine ticks. Open the extracted `pictures/index.html` for the annotated picture book and `blocker-review.md` for every blocker's initial job, sampled load, first-half-second displacement and interpretation. `all-threats.csv` preserves all11 defenders at four phases. `ledgers.json` retains selected requests/velocities and target changes; the raw tape retains every consumed cue, raw/final command, achieved body and World interval contact.

Positive pair force includes tangential load at zero compression. Helper membership in that pair does not prove an individual helper force. Current named owner screens omit conditional future duties not exposed by the recorder. Positive teammate impulse is a real World interval report; a center-line crossing is not. Body facing is not gaze or exact shoulder/hip anatomy. No missing contact, future sample or unrecorded touch is imputed.

The opening-movement screen uses `cos(facing)<-.7` only to find clearly backward body orientations. It is not a behavioral target. Cumulative heading sums wrapped tick-to-tick differences through1.00s. The guard/WR alternative compares initial Euclidean job distances only; **it is not an executed controller, reachable strike or proved better outcome**.

Retained reducer issues: an initial P015 ledger counted presnap idle jobs; selecting nonnegative snap frames restores all162 blocker records. Plot formatting initially assumed every clip had a carrier-contact event and that `front` was a string; P015's absent contact stays absent and front metadata is decoded properly. Formatting failures ran zero native snaps. Final data checks and all36 plots complete; no production assertion was changed or suite requested.
