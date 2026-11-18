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

## Built: the quick clock (in READ_WINDOW, still off; patch on PR #852's head d57506543)

Patch: `docs/reviews/patches/engine71-footwork/read-window-quick-clock-on-pr852-d57506543.patch`.

**Why his feet were late.** Rules' table (`installedPlan(...).rhythm`) puts slant-flat's keyed pair on the hitch (n 1, plan
time 1.8 s) and the backside on the second hitch (n 2, 2.2 s), one beat (0.4 s) apart. His step clock was
`stride = drop.time / DROP_STEPS[drop]`. For the one-step quick drop from the gun that is the whole drop (catch, gather
and a step, 0.75 s), so his hitch landed at set + 0.75 (2.15 s) and the second at set + 1.5 (2.9 s). Every other drop's
stride is 0.28-0.36 s (gun3 1.0 s / 3).

**Built** (READ_WINDOW; no constant fitted to the NFL):
1. On a quick drop a hitch is one of his strides: the gun three-step's (1.0 s / 3). Step 1 lands at about 1.73 s and
   step 2 at 2.06 s, against the plan's 1.8 and 2.2.
2. A quick read on footwork step n is his until step n + 1 lands. On the plan's last step there is no next hitch, so
   it gets a dwell from its landing or his eyes' arrival, whichever is later. He cannot leave a read before its step
   has let him throw it (the step gate).
3. A keyed high-low is one look: moving between its two routes (the key's answer, its one re-read) does not kill
   either.

**Staged panel** (`snap-fate.ts`: the eight quick concepts × doubles / trips × 7 zone shells × 3 rosters × 3 seeds × flip,
2,016 snaps; READ_WINDOW off → on):

| | off | on |
|---|---|---|
| throwaways | 21 | 59 (2.9%) |
| sacks | 4 | 1 |
| completion of throws | 0.733 | 0.747 |
| interceptions | 25 | 27 |
| time to throw p50 / p90 | 2.35 / 3.20 s | 2.30 / 3.05 s |
| late (3.1 s+) flats led 10+ yd | 48 | 3 |

- slant_flat: throwaways 7 → 5, time to throw p50 3.10 → 2.40 s and p90 3.75 → 2.85 s, thrown by 2.5 s 34% → 64% (NFL
  77%), completion 0.765 → 0.785, late led flats 37 → 1.
- Throwaways that remain: trips_stick 23 and seam_slant 17. trips_stick's back (the angle) clears his bar at 1.6 s but is
  his last read, reached at 2.75 s: the read order is Rules' table, a question for them.

**Games** (8: seeds 11 and 31; quick concepts, about 104 plays an arm): time to throw p90 3.30 → 2.75 s, sacks 2.9 → 1.9%,
throwaways 1.0 → 1.0%, no throw 3.9 → 1.9%, completion 0.724 → 0.696, interceptions 0 → 1. Non-quick plays move only by
game divergence.

**Left for Defense: the on-time flat's YAC.** slant_flat flats are now thrown at 2.25 s and caught with room: YAC median 9.3
yd, mean 23.8, and 37 of 104 go 20+ (off, thrown at 3.05 s: median 8.8, mean 17.4, 40 of 99). The NFL flat's YAC is about
5 yd. The never-touched tail now sits on an on-time flat that no defender rallies to.

**Integration's third question: the 0.35 s dwell in the drop-back game.** `read-clock.ts` (one play per concept and
formation, cover3): every read has a footwork step, and what moves his eyes off it is:
- the plan's beats: quick 27 reads, drop-back 74, play-action 4;
- the 0.35 s dwell after the step gate: quick 45, drop-back 132 (64%), play-action 20.

So most of the drop-back game is moved by the dwell. Its strides are 0.28-0.36 s, so the step gate rarely blocks there.
Whether the dwell mistimes drop-back reads as it did slant-flat needs `quick-open.ts` on drop-back concepts. Not done.

**Found on the way.** `test/qb-stick.test.ts` (QB lane) fails on clean develop cebd890b and on engine-88: one pump with
no recorded perceived change. That breaks the commit rule, and it is the QB lane's to fix.
