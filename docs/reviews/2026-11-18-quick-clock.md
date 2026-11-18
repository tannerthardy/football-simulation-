# Why slant-flat is not thrown on time (Integration's trace before READ_WINDOW lands)

QB lane, 2026-11-18. engine-88 patch on develop cebd890b, READ_WINDOW=1 (with its fixes: dead reads kept per tick, the
ball out when no live read is left, the quick read held to its footwork step). slant_flat × doubles / trips × 7 zone
shells × 3 rosters × 3 seeds × flip, 252 plays. Probes:
- `scripts/diag/eyes/quick-trace.ts`: per read visit, his price against his bar, the pick risk, the footwork gate, the
  cause it was not thrown, and the closers;
- `scripts/diag/eyes/quick-open.ts`: every ready read evaluated every tick, when each first clears his bar, and when his
  eyes get there;
- `scripts/diag/eyes/nfl_slant_flat.py`: the NFL side.

## The NFL (BDB 2025 drop-backs with a SLANT and a FLAT against zone, PFF labels; n 412)

| | NFL | ours, READ_WINDOW off | ours, on |
|---|---|---|---|
| time to throw p25 / p50 / p75 / p90 | 1.80 / 2.07 / 2.47 / 3.00 s | p50 3.10, p90 3.75 | p50 3.05, p90 3.20 |
| thrown by 2.5 s | 77% | | |
| completion of throws | 0.758 | 0.77 | about 0.75 |
| no target (throwaway, spike) / sacks | 6% / 3.9% | 3% / 0.4% | 20% / 0% |
| target route | flat 32%, slant 29%, hitch 15%, out 7% | | |

By coverage, the median time to throw is Cover 2 2.10 s, Cover 3 1.97, Quarters 2.07, Cover 6 2.40. Ours is a second
late in both arms; the off arm hid it with the late flat.

## Why the 51 throwaways (READ_WINDOW on)

**Read visits on the throwaway plays** (204):

| cause | visits |
|---|---|
| price below his bar | 135 (66%) |
| footwork step still blocking | 69 (34%) |
| risk, not ready, other | 13 |

- On the price-blocked looks his best P is a median 0.18 against a bar of 0.56. pOpen is 0.51 and pClear 0.43, and the
  top closer is an underneath man (CB_S, NB, LB_W, CB_W, LB_M).
- That matches the guess (underneath men priced as arriving), but it is the price at the moment his eyes are there.

**Every one of the 51 had a read that cleared his bar at some tick.** Each read, every tick (u = 0):

| read | eyes get there (median) | first clears his bar (median) | cleared |
|---|---|---|---|
| 0 | 1.40 s | 2.15 s | 41 / 51 |
| 1 | 1.70 s | 1.55 s | 41 / 51 |
| 2 | 2.25 s | 2.05 s | 39 / 51 |
| 3 | 2.75 s | 1.28 s | 32 / 51 |

- Of the read-instances that cleared, 91 cleared **before his eyes got there** and 62 while or after his eyes were on
  them (held by the footwork step or another gate). 51 never cleared.
- He is on read 0 from the set (1.35-1.40 s), before it is open (2.15 s). The 0.35 s dwell takes him off it first.
- He reaches the last read at 2.75 s; it was open at 1.28 s and has closed.

**So the main defect is timing, not price.** The progression runs on a dwell clock from the set, not on the quick
concept's own timing: when each read is due (its break, the drop's plant and hitch) and his feet. The price does clear
these reads, at moments his eyes are elsewhere.

**Truth check of the price: inconclusive, not used.**
- `PlaySetup.stagedThrow` freezes his drop before the staged throw (qb.ts, the staging stand), so its plays are not his.
- Forcing his own decision from outside the tick takes only on some ticks, and those runs were slow.
- On the 11 price-blocked looks it could force (believed P 0.12), 10 were picked, so the low prices measured there were
  real (a corner sitting 3.8 yd deep on the slant). Too few to say more.

## What it points to

The quick concept's clock, as taught and as the user asked (reads keyed to footwork events):
- in quick game his eyes are on the read the drop is timed for;
- a read is looked at when it is due and decided on its step: read 1 at the plant, the next on the hitch;
- he moves on when its step passes, not on a dwell from the set;
- READ_WINDOW's dead read is then a read whose step has passed.

To be built and measured against the NFL's 2.07 s and the flat / slant split. Not built here.
