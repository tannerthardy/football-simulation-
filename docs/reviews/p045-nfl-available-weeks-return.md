# Measurement available-weeks query: execution return

October 15, 2026 (America/Phoenix).

**Complete within the published bounds.** Existing archive and readable restored
files contain weeks 1–9. Week 1 was reused; the unchanged query scanned existing
ZIP streams for weeks 2–9. No download, extraction, raw mirror, new data pipeline,
week-1 rescan, engine import or simulation was performed.

[Inventory JSON](../../data/reviews/current/p045-nfl-available-weeks-inventory.json) ·
[Result JSON, exclusions, input checksums and examples](../../data/reviews/current/p045-nfl-available-weeks-return.json) ·
[Measurement's original driver and execution contract](https://github.com/tannerthardy/football-simulation-/blob/7ffa49e58fcca7db89c453174075c1ff1ed9daf1/docs/reviews/p045-nfl-available-weeks-2026-10-15.md)

| Scope | Returned evidence |
| --- | --- |
| Driver pin | `7ffa49e58fcca7db89c453174075c1ff1ed9daf1`, SHA256 `a508c8baaea535cb7cc328a396bf20db39df4e52f5171fe4ce948004e355dec3` |
| Original query | `81e43e7279a26c43f2ae5ea29a2282316f42899c`, three modules SHA-verified by driver |
| Reused week 1 | `481ad18e5d1cd45a1d5008496b9917511d8397b1`, existing result SHA-verified; no tracking read |
| Host checkout | `df4131b9f3ef9d2d4e889fd40ad6be65be85b9c8`, branch unchanged |
| Planned / achieved input reads | **9,257,358,332 bytes** (8.62 GiB), exactly matching inventory |
| Wall runtime / cap | **142.03 / 300 seconds** |
| Read cap | 12 GiB |
| Archive | Fresh SHA256 `743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3`; identity unchanged |
| Completion | All eight new weeks complete, no partial or unrun weeks; consumed CSVs fully read and hashed, CRC enforced; metadata matches reused cache |

The fixed study yields **26 global metadata candidates, 19 converted plays,
seven invalid, six matching the geometry filters, four contained (YAC ≤5),
zero explosive (YAC ≥15), and two middle-YAC cases**. The global metadata count
is recorded once. New-week exclusion ledgers reconcile with the original query;
week 1 retains its pooled counters and explicitly unknown rejection detail.
Do not infer whole-study rejection reasons from only the new-week audit.

The requested deterministic example supplement returns three contained IDs:
`2022091101-4104` (−2.2 YAC), `2022091807-2947` (+2.7), and
`2022091812-2171` (+.5). It returns no explosive examples. All actual receiver
and fixed defender IDs, events, samples and per-week counts remain in the JSON.

This is evidence about a narrow Quarters/POST query: depth 15–30 yd, flight
1–2 s, separation 1–4 yd, official target with reception and required observed
samples. It supplies additional useful defensive controls but **no matched NFL
explosive witness for P045**. Do not widen filters, manufacture the missing bin,
or interpret zero examples as proof the sim's touchdown should be impossible.
Tracking does not identify MOD assignments, gaze, tackle grips or transmitted
load. Measurement retains the query and any future study-design decision;
Catching owns football interpretation/controller work.

## Exact invocation

The pinned driver was copied from its existing Git object into ignored `out/`:

```sh
python3 -I out/p045-nfl-expansion/expand.py --repo . --out out/p045-nfl-expansion/inventory.json
python3 -I out/p045-nfl-expansion/expand.py --repo . --out out/p045-nfl-expansion/available-weeks-return.json --run
```

Default archive/restored paths are the original restoration receipt's
`/workspace/football-yac-angle/data/raw/zips/archive.zip` and
`/workspace/football-yac-angle/data/raw/bdb2025/big-data-bowl-data`.
The returned files are byte-identical copies of those outputs. Their SHA256s
are returned to Measurement alongside this publication. Original five focused
driver checks are reused; no duplicate check campaign was required to execute
the already tested driver. No engine flags or World settings enter this Python
tracking-only query. Current accepted develop has since advanced to `8c891f4`;
this does not reinterpret deliberately pinned controller evidence as current.
