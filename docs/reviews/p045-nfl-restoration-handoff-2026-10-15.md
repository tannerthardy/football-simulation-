# P045 restoration continuation: receipt verified, executor access still blocked

October 15, 2026 (America/Phoenix). The [original study](p045-nfl-catch-approach-2026-10-15.md)
and its week-1 Quarters/POST query remain unchanged at
`81e43e7279a26c43f2ae5ea29a2282316f42899c`.

**Handoff fulfilled; query closed.** Catching returned the week-1 result at
`481ad18`; [validation and interpretation](p045-nfl-closeout-2026-10-15.md)
retain one contained example and zero explosive examples. The instructions
below preserve the original handoff, not a request for another execution.

## Verified handoff and actual access

Catching posted the [restoration handoff](https://github.com/tannerthardy/football-simulation-/pull/58#issuecomment-6199579876)
and [receipt at 747bb24](https://github.com/tannerthardy/football-simulation-/blob/747bb24bd2c17c8b4a6f572fcb3ee8e459375fb8/data/reviews/current/bdb2025-existing-restoration.json).
The receipt's Git blob is `166c90d830a36dc1a5b668228457039c1b67f421`;
its exact bytes independently reproduce that blob ID and SHA256
`d8e3cdc71461117439f2dafe84f1d87a3c74952d713f7167b436e4d82a53449b`.
Its archive SHA256 and 1,219,840,421-byte size match `data/sources.json`:
`743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3`.

The receipt reports that Catching rehashed the ZIP and independently compared
each consumed CSV with its verified ZIP member. These are Catching's published
data-byte checks. This executor verified the receipt and its catalog binding;
it could not independently rehash the absent ZIP or CSVs.

| Existing restored input | Expected bytes | SHA256 in verified receipt | Readable here |
| --- | ---: | --- | --- |
| players.csv | 104,749 | `dc2b5f923e84a16d789d999e88aea670b5495436ab88c24aef7b97b07d723626` | No |
| plays.csv | 6,892,353 | `a103cbc3a1ddf7678cb6d77ea5f9919c4292b5d55c7876f7cad6cce3d62dca04` | No |
| player_play.csv | 52,533,762 | `4dfeba939d0b56e9fca6044c1df709879a22ed239389e155afba571915bd5852` | No |
| tracking_week_1.csv | 971,403,802 | `dc47c829ef917cb6533c6baedd01964823939a4e9cba807090d2784aa1fd149c` | No |

Posted directory:
`/workspace/football-yac-angle/data/raw/bdb2025/big-data-bowl-data`.
Posted ZIP: `/workspace/football-yac-angle/data/raw/zips/archive.zip`.
The parent `/workspace/football-yac-angle` is absent here. This is an executor
filesystem gap, not a failed checksum, missing receipt or missing upstream data.
The [access receipt](../../data/reviews/current/p045-nfl-restoration-access.json)
records `query_executed=false`; no NFL witness or motion measurement is claimed.

## Smallest execution handoff

**Run the existing NFL query where the restored files live; return only its
small result JSON and SHA256.** Moving the four full CSVs would move
1,030,934,666 bytes. The required three pinned Python modules total only
42,176 bytes. They are already in Git; no sim packet, Node, engine imports,
raw-data mirror, second archive download or extraction is needed.

The [execution wrapper](../../scripts/diag/p045-nfl-execute-handoff.py) checks
the exact receipt, rehashes all four real CSVs against its pins, rehashes the
existing ZIP when readable, then loads only these pinned modules into a
temporary directory:

- `scripts/diag/p045-nfl-approach.py`
- `scripts/mechanics/metrics.py`
- `scripts/mechanics/nfl_bdb2025.py`

It calls the original `nfl_query(data, [1])`. It does not run the sim side of
the CLI, modify the working branch or import Catching's runtime. A CSV/ZIP
checksum mismatch fails before querying. If the ZIP was removed but the four
CSV hashes match, the result explicitly distinguishes published archive
verification from CSV rehashes on the executing host.

From Catching's existing repository, after this follow-up is published:

```sh
git fetch --no-tags --filter=blob:limit=128k origin codex/nfl-catch-approach
mkdir -p out/p045-nfl-handoff
git show FETCH_HEAD:scripts/diag/p045-nfl-execute-handoff.py > out/p045-nfl-handoff/execute.py
python3 -I out/p045-nfl-handoff/execute.py --repo . \
  --receipt /workspace/football-yac-angle/data/reviews/current/bdb2025-existing-restoration.json \
  --out out/p045-nfl-handoff/nfl-week1-return.json
sha256sum out/p045-nfl-handoff/nfl-week1-return.json
```

The original follow-up is `d0ebac7`, directly after `81e43e7`. Verify that
`81e43e7279a26c43f2ae5ea29a2282316f42899c` is present before executing.
If the restored directory moved, supply `--data /existing/restored/directory`;
the expected file hashes stay unchanged. Return the result JSON and checksum
through an accessible artifact or the PR #58 handoff. If execution fails,
return the exact error; do not broaden filters or start another collector.

The original filters remain: week 1, Quarters/POST, official target with
reception, catch depth 15–30 yd, flight 1–2 s, separation 1–4 yd. Keep the
smallest numeric gameId/playId in each YAC <=5 / >=15 witness bin, including
zero matches. Same defender IDs, original frame events, observed-sample
validity and pre-contact momentum windows remain enforced by the original query.

## Decision and cost

No new NFL measurements are available on this executor. The earlier P045
geometry, P006 tackle and P010 interception remain unchanged. Catching's
separate first-help window at 2.10 s and P045's 3.35/3.40-s ball-contest
opportunities remain protected; this handoff makes no controller decision.

The local access check returned the expected blocked status in under 0.001 s.
Receipt/blob/catalog checks and pinned-module checks passed. A tiny empty-file
negative check confirms that a CSV mismatch stops before query execution.
No raw download, extraction, NFL query, new simulation or broad suite ran.
Existing five query correctness checks are reused unchanged. Complete the same
comparison when the small query result returns; no wider study is requested.
