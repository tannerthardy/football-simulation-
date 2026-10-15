# P045: available-weeks expansion completed

October 15, 2026 (America/Phoenix).

**Current result: validated complete.** Catching returned weeks 1–9 at
`07bee74`; Measurement validated the returned bytes, pins, accounting and saved
measurements without rerunning the query. Six qualify: four contained, two
middle-YAC, zero explosive. See the
[expanded interpretation and decision](p045-nfl-expanded-interpretation-2026-10-15.md).
Zero in this filtered sample is not evidence that these plays cannot produce
explosive YAC. Hudl/StatsBomb remains separate.

**The available-weeks instruction superseded the prior close-query instruction.**
Reuse the validated week-1 return, inventory the existing ZIP/restored files,
and run the original query on additional available weeks. Filters, measurement,
player IDs and event definitions stay unchanged. This is not another P045
controller experiment or a request to fill an empty bin by changing criteria.

The original access blocker was `/workspace/football-yac-angle` being absent
on Measurement's executor. The [inventory/execution coordination](https://github.com/tannerthardy/football-simulation-/pull/58#issuecomment-6200494647)
therefore targeted Catching's existing data executor. Its returned inventory
now confirms weeks 1–9 in both the archive and readable restored files. Week 1
was reused and weeks 2–9 executed there. The raw archive is still absent here;
validation of the small return does not claim a new local raw-data rehash.

## Bounded execution where the data lives

[Expansion driver](../../scripts/diag/p045-nfl-expand.py) ·
[current status](../../data/reviews/current/p045-nfl-expansion-status.json).
The driver is standalone Python and defaults to cheap inventory only.
It lists existing ZIP tracking members with uncompressed/compressed sizes and
CRC, checks counterpart restored-file readability/size, and calculates the
planned input-read cost. Central-directory listing does not scan tracking CSVs.

Meaningful additional cost is declared **before execution**: at most eight
new tracking-file scans, potentially several GB/minutes. Limits are fixed at
**300 wall seconds and 12 GiB input reads**. Estimated reads include one ZIP
SHA256 pass, the new uncompressed tracking streams, the original query's repeated
metadata reads and game/week lookup. If the inventory exceeds the byte budget,
no query starts. A runtime limit retains completed weeks, partial-week/error
status and the unrun tail; it cannot issue a complete result. Do not rerun a
partial batch or increase its budget without first reporting that cost/blocker.

To avoid a second restoration, the original CSV adapter reads **existing ZIP
member streams**. A fresh archive SHA256 must match
`743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3`.
Each consumed member receives a SHA256 while the unchanged CSV reader consumes
it; complete reads and ZIP CRC checks are required. Metadata hashes must match
the week-1 cache. The ZIP identity/size/mtime must remain unchanged through the
run. Restored-file inventory is not presented as a checksum of unused files.
No raw download, extraction, mirror, Node or engine import is needed.

The driver verifies the original three query modules from **`81e43e7`** and the
week-1 return from **`481ad18`**, SHA256
`7911a33decb4ce9f2dfef768f37c527936e573506664b273d231b6c0d0f7f60c`.
It reuses that result without opening `tracking_week_1.csv`. Each new catalog
week actually present in the ZIP is declared before outcomes and passed to
the original `nfl_query(data, [week])`. `games.csv` checks that no game's rows
are silently mixed across weeks. No outcome-dependent early stop or widening.

From Catching's existing repository, without switching its working branch:

```sh
git fetch --no-tags --filter=blob:limit=128k origin codex/nfl-catch-approach
mkdir -p out/p045-nfl-expansion
git show FETCH_HEAD:scripts/diag/p045-nfl-expand.py > out/p045-nfl-expansion/expand.py
python3 -I out/p045-nfl-expansion/expand.py --repo . \
  --archive /workspace/football-yac-angle/data/raw/zips/archive.zip \
  --data /workspace/football-yac-angle/data/raw/bdb2025/big-data-bowl-data \
  --out out/p045-nfl-expansion/inventory.json
```

Return/inspect the small inventory first. If its declared cost fits the bounds,
the available-weeks expansion is already authorized:

```sh
python3 -I out/p045-nfl-expansion/expand.py --repo . \
  --archive /workspace/football-yac-angle/data/raw/zips/archive.zip \
  --data /workspace/football-yac-angle/data/raw/bdb2025/big-data-bowl-data \
  --out out/p045-nfl-expansion/available-weeks-return.json --run
sha256sum out/p045-nfl-expansion/inventory.json out/p045-nfl-expansion/available-weeks-return.json
```

The driver reads week 1 directly from its existing Git object by default; a
byte-identical existing file may instead be supplied with `--week1 PATH`.
Return both JSONs plus SHA256 through an accessible artifact or PR #58.
Return any missing-path/object, checksum, budget or schema failure as a blocker;
do not download another archive. Existing output paths are protected from a
second invocation overwriting prior evidence; internal progress saves belong
to the one active invocation.

## Coverage, exclusions and examples to report

The frozen query remains Quarters/POST, official target with reception,
depth 15–30 yd, release-to-catch 1–2 s, catch separation 1–4 yd. Existing
metadata admissions and full observed-sample validity remain intact. Original
per-week results and their counters are retained. The all-metadata
`label_candidates` count is recorded **once**, not added once per week.

Passive wrappers capture duplicate fragments, unspecified conversion rejection,
missing required events, non-22-player IDs, exact sample-validity error messages,
then depth/flight/separation failures. They return every original value and
re-raise its errors. A disjoint first-failure ledger uses a fixed
depth→flight→separation order, while separate memberships retain overlapping
geometry failures. The audit must reconcile with the unchanged query's counters
and original selected witnesses. All label-candidate game/play IDs, metadata
candidate counts by week and observed fragments are preserved in that ledger.

Week 1's pooled invalid count and unrecorded rejection detail remain explicitly
legacy/unknown; no rescan or invented classification repairs that history.
Its validated contained example and zero explosive examples are reused. New
weeks supply detailed reasons; a whole-study rejection funnel must keep those
two scopes separate.

The original query's canonical minimum-ID witness remains unchanged. A passive
supplement retains up to **three lowest numeric gameId/playId examples in each
original outcome bin**, contained YAC <=5 and explosive YAC >=15, from the
same qualifying set. All counts and middle-YAC cases remain visible; bin
filling never stops or expands the run. Compare receiver speed/turning and fixed
defender momentum/leverage, including useful defense and earned offensive wins.
These are examples, not MOD responsibility labels or NFL calibration targets.
Tracking still reveals neither gaze nor grip force.

## Local verification and current evidence

Five focused synthetic checks pass: original-versus-audited result equality,
reconciled exclusion reasons, file-versus-ZIP byte equivalence, censored partial
weeks/restored observer hooks, cross-week identity protection, and a full driver
check that reuses week 1 and matches the original combined-query counts/witness.
These are diagnostic correctness checks, not new empirical NFL samples.
Runtime was about 0.24 s. The end-to-end selected-witness comparison uses the
JSON storage contract: in-memory position tuples serialize as arrays. No query
assertion or source behavior was weakened to handle that representation.
Original query source, engine, physics, ratings,
flags, P006/P010 controls and Catching's separate controller findings are unchanged.

The execution handoff above is preserved for reproduction, not an instruction
to rerun compatible evidence. The [validated expanded result](p045-nfl-expanded-interpretation-2026-10-15.md)
now contains four full contained examples, two middle-YAC ledger cases and no
qualifying explosive example. All four contained receivers slow/turn before
catch. New-week exclusions reconcile: 11 depth-first geometry rejections and
four missing catch events; overlapping flight/separation failures remain separate.
Cost was 142.030 s / 9,257,358,332 input-read bytes, within both limits. This
bounded expansion is complete; the historical week-1 closeout remains preserved.
