# Sideline tackle geometry, NFL vs sim (2026-11-24)

NFL: BDB 2024 tackles + BDB 2025 tracking (`out/tkl/nfl.rows.jsonl`). Sim: engine-91 defaults (`npm run ref`, d9766c1c), 32 games, seeds 201/209/217/225 x 8. Rows: `tackle_geometry.py rows`; table: `sideline_geometry.py NFL SIM`. Cells are share of attempts in the zone, then miss rate (n shown under 8). Sim misses split by event: broken (a broken hold by him) or reach (missed_tackle only). Features at the look-back, 0.3 s before the attempt.

### Attempts within 3 yd of the sideline: NFL n 1135, miss 4%; sim n 141, miss 32% (broken hold 23%, reach/grab 9%)

| approach angle, deg (0 chase, 180 head-on) | NFL share · miss | sim share · miss | sim broken · reach (share of the bin) |
|---|---|---|---|
| 0-30 | 35% · 2% | 28% · 10% | 3% · 8% |
| 30-56 | 37% · 3% | 30% · 28% | 21% · 7% |
| 56-80 | 16% · 7% | 29% · 61% | 46% · 15% |
| 80-110 | 8% · 6% | 6% · 50% | 38% · 12% |
| 110-145 | 3% · 3% | 4% · (n6) | 0% · 0% |
| 145-181 | 1% · 31% | 1% · (n1) | 0% · 0% |
| n/a | 1% · 17% | 2% · (n3) | 0% · 0% |

| bearing in the carrier frame | NFL share · miss | sim share · miss | sim broken · reach (share of the bin) |
|---|---|---|---|
| ahead | 27% · 7% | 11% · 7% | 0% · 7% |
| level | 60% · 3% | 50% · 44% | 36% · 9% |
| behind | 13% · 3% | 40% · 23% | 12% · 11% |

| tackler side of the carrier | NFL share · miss | sim share · miss | sim broken · reach (share of the bin) |
|---|---|---|---|
| inside | 94% · 4% | 91% · 34% | 25% · 9% |
| outside (sideline side) | 6% · 1% | 9% · 8% | 0% · 8% |

| closing speed 0.3 s before, yd/s | NFL share · miss | sim share · miss | sim broken · reach (share of the bin) |
|---|---|---|---|
| -50-0 | 1% · 0% | 1% · (n1) | 0% · 0% |
| 0-3 | 26% · 3% | 16% · 22% | 9% · 13% |
| 3-5 | 32% · 3% | 23% · 19% | 9% · 9% |
| 5-7 | 25% · 7% | 30% · 28% | 26% · 2% |
| 7-9 | 12% · 2% | 29% · 54% | 39% · 15% |
| 9+ | 3% · 6% | 1% · (n1) | 0% · 0% |

| distance 0.3 s before, yd | NFL share · miss | sim share · miss | sim broken · reach (share of the bin) |
|---|---|---|---|
| 0-1.5 | 16% · 4% | 9% · 8% | 0% · 8% |
| 1.5-2.5 | 64% · 4% | 55% · 15% | 10% · 5% |
| 2.5-3.5 | 16% · 6% | 35% · 62% | 48% · 14% |
| 3.5-5 | 3% · 0% | 1% · (n1) | 0% · 100% |
| 5+ | 0% · (n4) | 0% · (n0) | - · - |

Defense's cell (approach 56-80, closing 5-9, inside, level, 1.5-2.5 yd): NFL 3% of attempts (n 32, miss 0%); sim 6% (n 8, miss 12%, broken 1)

| approach band x bearing (share of attempts) | NFL ahead / level / behind | sim ahead / level / behind |
|---|---|---|
| 0-30 | 2% / 22% / 10% | 0% / 4% / 23% |
| 30-56 | 4% / 31% / 2% | 1% / 14% / 16% |
| 56-80 | 10% / 6% / 0% | 3% / 26% / 1% |
| 80-110 | 7% / 1% / 0% | 1% / 4% / 0% |
| 110-145 | 3% / 0% / 0% | 4% / 0% / 0% |
| 145-181 | 1% / 0% / 0% | 1% / 0% / 0% |

### Attempts 3-6 yd (control) of the sideline: NFL n 1143, miss 10%; sim n 244, miss 21% (broken hold 14%, reach/grab 8%)

| approach angle, deg (0 chase, 180 head-on) | NFL share · miss | sim share · miss | sim broken · reach (share of the bin) |
|---|---|---|---|
| 0-30 | 38% · 5% | 26% · 11% | 3% · 8% |
| 30-56 | 31% · 9% | 25% · 13% | 7% · 7% |
| 56-80 | 13% · 12% | 26% · 33% | 25% · 8% |
| 80-110 | 9% · 14% | 14% · 27% | 18% · 9% |
| 110-145 | 4% · 24% | 5% · 46% | 38% · 8% |
| 145-181 | 3% · 19% | 1% · (n3) | 0% · 33% |
| n/a | 2% · 17% | 3% · 0% | 0% · 0% |

| bearing in the carrier frame | NFL share · miss | sim share · miss | sim broken · reach (share of the bin) |
|---|---|---|---|
| ahead | 28% · 15% | 19% · 17% | 13% · 4% |
| level | 61% · 7% | 49% · 28% | 21% · 8% |
| behind | 11% · 7% | 32% · 13% | 3% · 10% |

| tackler side of the carrier | NFL share · miss | sim share · miss | sim broken · reach (share of the bin) |
|---|---|---|---|
| inside | 80% · 9% | 90% · 21% | 13% · 8% |
| outside (sideline side) | 20% · 13% | 10% · 21% | 17% · 4% |

| closing speed 0.3 s before, yd/s | NFL share · miss | sim share · miss | sim broken · reach (share of the bin) |
|---|---|---|---|
| -50-0 | 1% · 0% | 1% · (n2) | 0% · 0% |
| 0-3 | 31% · 5% | 21% · 17% | 10% · 8% |
| 3-5 | 29% · 9% | 25% · 17% | 8% · 8% |
| 5-7 | 27% · 12% | 27% · 21% | 14% · 8% |
| 7-9 | 10% · 12% | 24% · 29% | 22% · 7% |
| 9+ | 3% · 38% | 2% · (n6) | 17% · 17% |

| distance 0.3 s before, yd | NFL share · miss | sim share · miss | sim broken · reach (share of the bin) |
|---|---|---|---|
| 0-1.5 | 22% · 6% | 13% · 6% | 0% · 6% |
| 1.5-2.5 | 68% · 9% | 61% · 17% | 11% · 6% |
| 2.5-3.5 | 9% · 19% | 26% · 38% | 25% · 13% |
| 3.5-5 | 1% · 23% | 0% · (n1) | 0% · 0% |

Defense's cell (approach 56-80, closing 5-9, inside, level, 1.5-2.5 yd): NFL 4% of attempts (n 44, miss 5%); sim 11% (n 28, miss 21%, broken 5)

| approach band x bearing (share of attempts) | NFL ahead / level / behind | sim ahead / level / behind |
|---|---|---|
| 0-30 | 2% / 25% / 10% | 0% / 4% / 21% |
| 30-56 | 4% / 26% / 1% | 0% / 14% / 10% |
| 56-80 | 6% / 7% / 0% | 2% / 23% / 0% |
| 80-110 | 7% / 2% / 0% | 7% / 6% / 0% |
| 110-145 | 4% / 0% / 0% | 5% / 0% / 0% |
| 145-181 | 3% / 0% / 0% | 1% / 0% / 0% |
