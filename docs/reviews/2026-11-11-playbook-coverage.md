# Playbook coverage: NFL route combinations we do not run (2026-11-11)

Report only. Rules + Coaching, for Tanner via Integration. This replaces the
matrix report's "70% of NFL dropbacks fit none of our 17 concepts", which rested
on a concept classifier that agreed with the called concept only 25–80% of the time.

**Data and method.** No classifier is involved.
- **Data:** BDB 2025, weeks 1–9: 9,313 dropbacks with at least one labelled
  route, including play action. 400 with no labelled route are left out.
- **Routes:** PFF's `routeRan`.
- **Numbering:** receivers are numbered outside-in to each side of the ball
  from the alignment at the snap, among the receivers who ran a route. A
  blocking end is left out; a back aligned in the backfield is the back.
- **Our concepts:** the routes in `src/playbook/concepts.ts`, mapped to the
  same labels:

  | label | our routes |
  | --- | --- |
  | GO | seam, go |
  | HITCH | hook, stick, curl, comeback |
  | IN | dig, short in |
  | CROSS | shallow, cross |
  | FLAT | swing |

- **When a combination counts as ours:** a side combination is ours if a concept
  puts exactly those routes on #1..#k of one side. A whole play is ours if one
  concept gives both sides.
- **Operator:** `scripts/diag/pass-matrix/playbook_coverage.py`.

**How much of the NFL we run:**

| level | ours |
| --- | --- |
| one side of the formation (18,249 sides) | **55.0%** |
| both sides, each a combination some concept runs | **25.5%** of dropbacks |
| the whole play is exactly one of our concepts | **7.3%** of dropbacks |

The NFL is a long tail. The most common whole-play combination is 0.7% of
dropbacks, so no fixed list of 17 concepts reproduces NFL plays one for one.
What matters is which pieces are missing.

| NFL piece | share | ours | target share | yards a play |
| --- | --- | --- | --- | --- |
| **The back's route** (of dropbacks) | | | | |
| back: flat | 31.2% | yes (swing, back flat) | | |
| back: block / none | 28.5% | yes | | |
| back: angle | 14.9% | **no** | | |
| back: out | 6.2% | **no** | | |
| back: screen | 3.4% | **no** | | |
| back: wheel | 1.6% | **no** | | |
| **Two-receiver sides** (of 2-receiver sides) | | | | |
| go + out | 5.9% | yes (flood) | 46% | 6.62 |
| go + go | 5.6% | yes | 18% | 6.02 |
| go + hitch | 4.6% | yes | 42% | 5.75 |
| hitch + hitch | 3.9% | yes | 36% | 5.71 |
| hitch + go | 3.8% | yes | 31% | 7.19 |
| hitch + flat | 2.9% | yes | 46% | 5.63 |
| go + post, in + cross, cross + cross, go + cross | 2.5–2.8% each | yes | 24–56% | 6.6–8.4 |
| go + flat | 2.1% | **no** | 34% | 6.75 |
| slant + slant | 2.1% | **no** | 46% | 6.24 |
| hitch + post | 1.9% | **no** | 40% | 6.68 |
| out + out | 1.9% | **no** | 49% | 5.11 |
| hitch + out | 1.6% | **no** | 47% | 5.41 |
| hitch + cross | 1.6% | **no** | 44% | 6.54 |
| go + slant | 1.6% | **no** | 46% | 6.13 |
| post + cross | 1.5% | **no** | 40% | 8.91 |
| corner + out | 1.4% | **no** | 53% | 5.11 |
| corner + flat | 1.4% | **no** | 53% | 4.48 |
| **Three-receiver sides** (of 3-receiver sides) | | | | |
| hitch + hitch + flat | 1.8% | **no** | 58% | 6.47 |
| go + out + hitch | 1.6% | **no** | 46% | 3.48 |
| hitch + go + hitch | 1.5% | **no** | 44% | 5.25 |
| go + out + out | 1.4% | **no** | 40% | 4.58 |
| go + go + hitch | 1.4% | **no** | 46% | 6.98 |
| screen + flat + flat | 1.4% | **no** | 96% | 2.96 |
| go + go + go, hitch + hitch + hitch, go + hitch + flat, go + out + flat | 0.6–1.2% each | yes | | |
| **Single-receiver sides** (of 1-receiver sides) | | | | |
| go, hitch, cross, out, slant, in, corner, post | 92% together | yes | | |
| screen | 3.0% | **no** | 42% | 4.83 |
| flat | 1.6% | **no** | 19% | 7.15 |

## What we lack

1. **The back's routes.** Angle, out, screen and wheel come to 26% of NFL
   dropbacks. Our backs block, check, swing or run to the flat.
2. **Screens of every kind.** That covers the back (3.4%), a single receiver
   (3%) and trips screens (screen + flat + flat). This is P3's "not callable".
3. **Trips.** Nearly every common three-receiver side is missing. Our concepts
   give #3 one of hook, seam, flat or shallow, so trips sides like
   hitch + hitch + flat, go + out + hitch and go + out + out never appear.
4. **Common two-man combinations:**
   - high-low on the outside: go + flat, corner + flat, corner + out;
   - double slants;
   - hitch + out and out + out;
   - hitch + post and hitch + cross;
   - post + cross.

The combinations we do run are the most common single ones: go + out, go + go,
go + hitch, hitch + hitch and the crossers. What the NFL adds is variety around
them.

## Reproduce

```sh
# the tracking rows at the snap (all 22 and the ball), weeks 1-9
(head -1 tracking_week_1.csv; for w in 1 2 3 4 5 6 7 8 9; do grep ',"SNAP",' tracking_week_$w.csv; done) | tr -d '\r' > out/playbook-coverage/snap.csv
# our concepts as JSON (id -> strong, weak, back), from PASS_CONCEPTS
python3 -I scripts/diag/pass-matrix/playbook_coverage.py data/raw/bdb2025/big-data-bowl-data out/playbook-coverage/snap.csv out/playbook-coverage/concepts.json
```

## Addendum: drop-back passes only (2026-11-11)

With the same population as the matrix (`population.py`: no play action,
screens, run-pass options or designed rollouts; 5,821 plays with a labelled
route), `playbook_coverage.py` now defaults to drop-back passes (`all` restores
the first count):

| level | all dropbacks | drop-back passes |
| --- | --- | --- |
| a side is a combination we run | 55.0% | **54.2%** |
| both sides each run by some concept | 25.5% | **21.7%** |
| the whole play is one of our concepts | 7.3% | **5.1%** |

**The back on drop-back passes:**

| route | share |
| --- | --- |
| flat | 34.5% |
| block | 17.8% |
| angle | 16.8% |
| none | 15.3% |
| out | 7.4% |
| wheel | 2.0% |

The missing pieces are the same, with screens gone by definition. These pairs
rank a little higher among two-receiver sides:

| pair | share |
| --- | --- |
| hitch + post | 2.5% |
| out + out | 2.4% |
| slant + slant | 2.4% |
| hitch + out | 1.9% |

Trips sides such as hitch + hitch + flat (2.2%) still lead the three-receiver
list.
