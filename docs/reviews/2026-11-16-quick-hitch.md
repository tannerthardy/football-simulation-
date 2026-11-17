# QUICK_HITCH: the quick game's hitch at 5 yd (2026-11-16)

Rules + Coaching, on Integration's go. The flag is off.

## Why
Defense's quarters-corner operator (`scripts/diag/defense/quarters_cb.py`, "#1 stops", on defense/C14-off-pedal) found our
#1 stops bunched at 5–9 yd: 85%, against the NFL's 40%.

**Ours.**
- 62% of #1's stopping routes are the hitch, at one depth (plant 6, settle 5). Its stop crosses 1 yd/s at 5.5–6 yd.
- The 9+ routes mostly break after the ball is out.

**NFL** (`scripts/diag/routes/nfl_one_stops.py`: BDB 2025, 2022 weeks 1–3, dropbacks, 6,732 #1s, the same operator split
by PFF `routeRan`):
- Only 35% of #1 stops come before the throw.
- Before the throw, PFF's HITCH (320 stops) is bimodal: a peak at **4–5 yd** (the quick hitch) and a hump at **10–13**
  (the curl). Its mix is ≤5 / 5–9 / 9+ = 38 / 29 / 32%.
- 1-yd histogram, 0–16 yd: `0 5 18 35 65 43 24 11 16 15 23 17 22 10 8 8`.
- OUT and IN show the same short peak.

The NFL is the witness, not the target. The depths come from the install.

## The install
**Sources** (pages checked):
- Quick game, Viqtory Sports: "every receiver is running a 5-yard hitch"; the quick game is a three-step, and "If the QB is
  taking a shotgun snap and is still a quick game concept, he will take a 1-step drop"; a one-step from the gun for "any
  route that breaks at 5 yards or under".
- Five-step, Throw Deep, Smash: "settle hitch route at 6 yards". A five-step concept from the gun is still five-step
  timing: "If the QB is in shotgun and the offense runs a 5-step concept, he will take a 3-step drop" (Viqtory).

**The change.**
- `quick_hitch` (routes.ts) is the hitch's shape a yard shallower: plant at 5, settle at 4.5. It has its own break, room
  and class entries, the hitch's.
- With the flag, each concept's hitch is chosen by its install:
  - the **quick family** takes the quick hitch: hitches, quick_outs, hitch_out, double_slants, seam_slant, trips_stick;
  - **dropback concepts** keep the 6 yd hitch, including those whose gun drop is shortened (fade_flat, seam_hitch,
    verts_hitch: five-step concepts).

## The gates (Integration's)
**1. Stop depth** (Defense's operator, on the staged quick-hitch cells; `scripts/diag/escape/quick-hitch-staged.ts`, 6 concepts ×
8 coverages × 4 rosters × 6 seeds):

| | off | on |
|---|---|---|
| hitch runners stopping | 97% | 97% |
| stop depth p50 | 5.7 yd | 4.8 yd |
| stop time p50 | 2.55 s | 2.45 s |
| ≤5 / 5–9, all stops | 1 / 99% | 77 / 23% |
| ≤5 / 5–9, before the throw | 1 / 99% | 87 / 13% |

Defense will run it through their own game operator for the quarters-corner mix.

**2. Timing against the drop** (`installedPlan`, gun doubles and trips).
- The quick hitch is ready 0.1–0.2 s sooner, which puts it on its read step:
  - hitches S2: n0 at 1.70, ready 1.90 → 1.75;
  - hitch_out S1: n0 at 1.70, ready 2.00 → 1.90;
  - quick_outs S2: n0 at 1.50, ready 1.90 → 1.75;
  - trips_stick S2: ready 1.90 → 1.75.
- No read moves to another step.
- The geometric orders change in a few plans: hitches from trips now reads S1, S2, S3 (was S3 first); quick_outs and
  hitch_out swap their backside W1/W2.

**3. Staged cells** (192 a cell):

| cell | completions | sacks | INT | no throw | yards a play | throw p50 |
|---|---|---|---|---|---|---|
| hitches | 150 → 143 | 2 → 0 | 2 → 4 | 9 → 3 | 5.35 → 5.57 | 2.60 → 2.45 |
| quick_outs | 129 → 98 | 5 → 4 | 1 → 1 | 10 → 7 | 5.47 → 4.30 | 2.55 → 2.45 |
| hitch_out | 163 → 168 | 3 → 3 | 4 → 1 | 2 → 2 | 8.84 → 10.86 | 2.60 → 2.60 |
| double_slants | 117 → 116 | 1 → 1 | 3 → 3 | 3 → 4 | 7.48 → 7.20 | 1.90 → 1.90 |
| seam_slant (trips) | 100 → 116 | 0 → 1 | 6 → 8 | 9 → 0 | 7.13 → 8.25 | 2.40 → 2.40 |
| trips_stick (trips) | 145 → 140 | 1 → 1 | 2 → 0 | 8 → 11 | 4.61 → 4.32 | 2.45 → 2.50 |

**The quick_outs cell is adverse, and the read is why.**
- Its key man from doubles is the strong-side DE on 170 of 192 plays. That is keyMan's flat-role pick, the fault the QB
  lane diagnosed (docs/reviews/2026-11-16-key-man.md on their branch).
- The DE's movement is read against the stretch from the out (low) to the hitch (high). A shallower hitch moves that
  stretch, so the reads flip: high 98 → 64.
- The hitch (S2) is thrown 46 → 96 times at 48% completion.
- With the key man fixed, this cell should be re-read. It is not the route's fault.

**4. Paired throws** (Coverage's `paired-throws.ts`, the QB forced to the first open-enough route at his set; 5 concepts
× 5 coverages × 8 seeds):
- 164 throws pair at the same throw time: caught 105 → 109.
- The hitch's 89: caught 56 → 60 (7 won, 3 lost).
- Throw time p50 unchanged, 2.05 s.

**5. Cushion** (the nearest defender at the hitch's stop):
- p50 2.2 → 2.5 yd (p25 1.2 both).
- That defender is p50 0.9 → 0.8 yd downfield of the receiver, mostly the nickel or a corner.
- The shallower hitch stops a little further from its defender.
