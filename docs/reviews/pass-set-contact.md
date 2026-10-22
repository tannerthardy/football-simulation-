# Pass sets and first contact: NFL tracking against the sim

Measured 2026-10-22. Engine source unchanged. The question: in the first
second of a dropback, how do NFL offensive linemen set, and when and where
does each line rusher first meet his blocker? Does the sim do the same?

This answers a gap in [snap-reaction research](../references/snap-reaction-research.md):
no public source measures OL set depth or first OL–DL contact. It also
covers the pass-protection question left open by the `SNAP_REACT` get-off
check (`docs/reviews/presnap.md` on `claude/run-game-v3`): sim rushers cross
the line early, and every sim interior rusher crosses.

## Operator

`scripts/diag/pass-contact.py` runs one code path on both sources, using the
common play format with positions quantized to 0.1 yd by `metrics.Play`:

```sh
python3 -I scripts/mechanics/nfl_bdb2025.py --plays-out out/mechanics/nfl-plays.jsonl.gz --out out/mechanics/nfl-bdb2022.json
npm run baseline:run -- --candidate -- node --import tsx scripts/mechanics/sim-export.ts --seed 301 --games 8 --out out/pass-contact/sim-301x8.jsonl.gz
python3 -I scripts/diag/pass-contact.py out/mechanics/nfl-plays.jsonl.gz out/pass-contact/sim-301x8.jsonl.gz
```

Definitions:
- **Times** run from the play's **line start**: the median time for its five
  OL to move 0.15 yd. Using it cancels the about 0.1 s lag of the tracked
  NFL snap frame.
- **Contact:** the first frame the paired blocker is within 1.0 yd, center
  to center.
  - NFL pairs come from PFF block labels.
  - Sim pairs come from block-contact events, so they include only pairs
    that touched.
- **Line rushers:** DL or LB on the defense's side within 2 yd of the line
  at the snap.
  - Interior: between the tackles.
  - Edge: up to 4 yd outside a tackle.
- **Window:** ends at the throw, the end of the play or 3.0 s. A rusher the
  window cuts off is counted separately, not as "never crossed".

`scripts/data/bdb2025_pass_set_contact.py` cross-checks this on raw NFL CSVs
using PFF initial pass rushers, with players moving at the snap excluded. Its
values match within 0.03 s (interior contact 0.80 s, edge 1.23 s).

Sim: develop `d91c9014` engine source (branch `d4a839bc`, docs only),
candidate profile flags, seeds 301–308, 1,001 scrimmage plays.
`SNAP_REACT` lives on `claude/run-game-v3` and is not included here; the
comparison is line-start-relative, so a reaction model shifts it only
through the DL−OL difference. Runtime: sim export 240 s, NFL conversion
about 2.5 min, operator 14 s.

## Dropbacks without play action (medians; times in s after line start)

| | NFL interior | Sim interior | NFL edge | Sim edge |
|---|---:|---:|---:|---:|
| Rushers | 11,866 | 1,144 | 12,100 | 1,172 |
| Separation to blocker at the snap, yd | 1.98 | 1.62 | 3.20 | 2.42 |
| Torso crosses the line | 0.46 | 0.44 | 0.35 | 0.39 |
| **Contact (1.0 yd)** | **0.79** | **0.55** | **1.25** | **0.45** |
| Contact p10–p90 | 0.45–1.29 | 0.45–0.66 | 0.86–1.75 | 0.15–1.16 |
| Rusher depth past the line at contact, yd | +0.9 | +0.3 | +3.4 | +0.1 |
| Blocker's retreat at contact, yd | 1.0 | 0.5 | **2.8** | **0.0** |
| Crossed the line before contact | 86% | 95% | 99% | 55% |
| Separation at 1.0 / 1.5 s, yd | 0.91 / 0.81 | 0.63 / 0.67 | 1.30 / 0.86 | 0.81 / 0.76 |

Offensive line retreat, median yards, after line start:

| | 0.3 s | 0.5 s | 0.7 s | 1.0 s | 1.5 s |
|---|---:|---:|---:|---:|---:|
| NFL tackle | 0.5 | 0.9 | 1.3 | 2.1 | 3.5 |
| Sim tackle | −0.1 | 0.2 | 0.7 | 1.6 | 3.3 |
| NFL guard | 0.3 | 0.5 | 0.8 | 1.3 | 2.4 |
| Sim guard | 0.3 | 0.5 | 0.7 | 1.2 | 2.0 |
| NFL center | 0.5 | 0.8 | 1.2 | 1.8 | 2.8 |
| Sim center | 0.4 | 0.6 | 0.8 | 1.2 | 1.6 |

## What the NFL does

- **Tackles give ground first.** By 0.5 s after the line moves, the tackle
  is 0.9 yd deep. He meets the edge rusher 1.25 s after line start, 2.8 yd
  behind his stance, with the rusher 3.4 yd into the backfield. Under 10% of
  edge contacts come before 0.86 s.
- **Interior rushers usually cross before contact.** On 86% of interior
  reps the rusher's torso is past the ball's line at contact. The guard has
  given about 1 yd. A rusher crossing the line is not, by itself, a
  protection failure.
- **Play action changes the interior trench.** On NFL play action (27% of
  dropbacks), interior contact happens at the line: rusher depth −0.1 yd,
  OL retreat 0.0. Only 43% have crossed before contact. 17% of interior
  rushers have not crossed by the throw or 3 s, against 1.3% without play
  action. The NFL's "6% never cross" (`getoff-cross.py`) is therefore
  mostly play action plus quick throws, not stout pass sets.

## Where the sim differs

1. **Edge contact comes at the line.** Sim tackles meet edge rushers 0.45 s
   after line start, against 1.25 s in the NFL. The tackle has retreated
   0.0 yd, against 2.8. In the first 0.3 s he steps 0.1 yd *forward*
   (NFL: 0.5 yd back).
   - Alignment explains only part of it. NFL edge rushers line up 1.5+ yd
     outside the tackle on 84% of dropbacks; the sim does so on 51%, and 47%
     sit 0.5–1.5 yd outside.
   - Within matched alignment bins, the sim still meets much earlier:

   | Edge alignment outside the tackle | NFL share | NFL contact | Sim share | Sim contact |
   |---|---:|---:|---:|---:|
   | under 0.5 yd | 10% | 0.98 | 2% | 0.26 |
   | 0.5–1.5 yd | 7% | 1.06 | 47% | 0.19 |
   | 1.5 yd or more | 84% | 1.26 | 51% | 0.79 |

   The likely request is `cutOffPoint` (`src/sim/behaviors/blocking.ts`): the
   tackle kicks to "the earliest point on his projected path you can reach
   first". The cutoff approach runs at 0.75·vmax, so a reachable point is
   usually near the line. NFL tackles do the opposite: they gain depth and let
   the rusher come to them. This is a controller decision, not a physics
   shortfall. Check requested against achieved before changing anything. Per
   the project rule, do not forbid meeting early. Find what makes it costly
   in real football and which mechanism the sim lacks: being beaten inside
   or by a counter while lunging, balance moving forward, losing the rush
   lane. A vertical set then has to win on its merits.
2. **Interior contact comes earlier and shallower** (0.55 s vs. 0.79 s;
   rusher +0.3 vs. +0.9 yd). The snap separation is 0.36 yd shorter (1.62 vs.
   1.98) and has almost no spread (p10–p90 1.51–1.70, NFL 1.44–2.44). That
   matches develop's flat 0.55 yd line depth (`presnap.md`: NFL guard 0.84,
   tackle 1.01). `OL_ALIGN` on `claude/run-game-v3` should be re-measured
   with this operator before anyone touches the interior set. The interior
   crossing time already matches (0.44 vs. 0.46 s).
3. **Engaged pairs sit closer.** Separation at 1.0–1.5 s is 0.63–0.67 yd,
   against NFL 0.81–0.91 (interior) and 0.86–1.30 (edge). NFL tracking chips
   are in the shoulder pads. The difference suggests sim blocks run nearer
   chest-to-chest than at arm's length. This is a lead for the contact owner,
   not a finding.
4. **The sim calls little play action.** It makes up 8% of sim dropbacks (51 of
   624), against 27% in the NFL. That alone moves "how many interior rushers
   ever cross".

Line start from the snap frame: NFL median 0.25 s (p10–p90 0.15–0.44), sim
0.41 s (0.34–0.41). The sim's line moves late and uniformly from its own
snap frame. `SNAP_REACT`'s relative DL−OL measure already handles the
reaction side.

Tracked NFL crossing time runs 0.22 s (interior) and 0.18 s (edge) earlier
than the Next Gen Stats get-off label on the same reps (raw extractor,
medians). That is the about 0.1 s frame lag plus a different crossing
definition. Compare the sim with the tracked operator, never with NGS label
values.

## Limits

- One sample of eight sim games. The NFL interior and edge counts are
  large, but sim play action has only about 100 rushers per group.
- Sim pairs are contact events and NFL pairs are assignments. The
  "no contact" counts are not comparable; contact times among pairs that
  touched are.
- 1.0 yd between tracking centers is a contact proxy. The 1.25 yd variant
  in the raw extractor tells the same story: interior 0.58 s and edge
  1.06 s after line start, without play action.
- No change to behavior is proposed or tested here. The result belongs to
  the pass-protection controller owner. Use
  [behavior review](../BEHAVIOR_REVIEW.md) with a 1v1 reproducer, for
  example `scripts/diag/passrush/panel.ts` on `claude/run-game-v3`.
