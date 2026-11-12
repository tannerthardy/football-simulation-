# PRESS_JAM attempt: the corner's punch at the line (parked)

C14 release, part B of LINE_START. Branch `coverage/C14-press-jam` (on `offense/C14-line-start` 6fd3f31e). Flag
`PRESS_JAM`, off. Not proposed for merge.

## Question

With LINE_START on, the jam fixture showed the hands joint almost never forming: the pressing corner mirrors from
about 2.3 yd and never closes inside his bent-arm reach (about 1.2 yd centre to centre). Does the corner's missing
punch explain too few jams at the line, measured against the NFL press table?

## What was built

- **Corner** (`ManCoverage.pressPunch`):
  - His cue is the receiver's first seen step.
  - He waits 0.05 + 0.2 × press × focus s for the receiver to commit.
  - He then punches only while one step plus his full arm reaches where he sees the body will be 0.3 s later.
  - The hands land if the existing hands joint forms. Its reach is the full arm while the punch is in the air or the hands are on.
  - A miss leans him through the missed-tackle `commitLunge`.
  - No landing probability.
- **Receiver:**
  - His release against press takes his full start force; LINE_START's get-off drive throttled it to 0.4–0.6.
  - A 0.2–0.35 s jab away from the release side, quicker with release skill.
  - The hand on him follows the chest at arm length × turn rate, not at a technique rate.

## Checking the NFL operator (Integration's condition 3)

The NFL "contact" row (`press_jam.py`: centres within 1.0 yd in the first 1.0 s; BDB 2025 weeks 1–3; 4,968 WRs
with a defender within 2.5 yd at the snap) is not a jam rate:

| min centre distance in 1.0 s | share | closest at | receiver still behind corner | receiver speed change across it |
|---|---|---|---|---|
| < 1.0 yd | 9% | 1.0 s | 79% | +1.5 yd/s |
| 1.0–1.3 | 23% | 1.0 s | 90% | +1.6 |
| 1.3–1.6 | 31% | 1.0 s | 93% | +1.7 |
| > 1.6 | 37% | 0.8 s | 92% | +1.7 |

The receiver is speeding up through the closest approach in every band. Six sampled < 1 yd plays, frame by frame:

| Plays | What happened |
|---|---|
| Three | In-phase pass-bys (receiver 3.6 → 5.8 yd/s, corner opening with him) |
| One | A corner running toward the line past him |
| One | A receiver who never released |
| One | A possible jam (0.6–0.8 s) |

Contact pairs and clean pairs end at the same depth at 1.5 s (3.2 yd) and the same speed at 0.8 s (2.9 yd/s).

A jam operator was written instead (`scripts/diag/pass-operators/press_stall.py`, the same code on NFL and sim). It counts a receiver who, between 0.1 and 0.9 s, is:

- still behind the corner;
- within 1.5 yd of him (arm's length plus torsos);
- under 4 yd/s;
- not gaining speed over the next 0.2 s.

## Results

| | NFL | sim, LINE_START on, no punch (seed 11 / 23) | with PRESS_JAM (seed 11, 4 games) |
|---|---|---|---|
| stalled at the corner | 3% | 10% / 12% | 33% |
| stall first / frames p50 | 0.7 / 0.1 s | 0.6 / 0.3 s | 0.8 / 0.1 s |
| depth at 1.5 s, stalled vs clean | 1.4 vs 3.2 | 0.8 vs 3.7 | 3.1 vs 3.8 |
| contact in 1.0 s (`press_jam.py`) | 10% | 24% | 35% |
| contact pairs' depth at 1.5 s vs no contact | 3.2 vs 3.2 | 2.4 vs 3.7 | 3.3 vs 3.6 |

Fixture (`scripts/diag/risk/press-punch.ts`, cover1/cover0, four_verts + slant_flat, 576 pressed pairs, LINE_START=1):

- Every punch was thrown and every punch landed.
- Hands on: 0.5 s (off: bent-arm joint in 36% of pairs, 0.15 s).
- Release vs press skill made no difference to landing.

## Reading

The premise was wrong. In the NFL, press contact at the line rarely shows in tracking as a cost to the receiver. Our sim, before any punch, already stalls 3–4× as many receivers at the corner, for longer, and contact costs 1.3 yd at 1.5 s. The corner's reach was not the missing piece. The excess is on the release side. A receiver who meets a corner's hands should, as in the NFL, mostly go through or past them at no cost to his speed. In ours he stalls for 0.3 s. Every punch landing is the same symptom: the receiver's release does not get his body outside a corner's reach, nor his hands onto the corner's.

## Next (not built)

The receiver's hand fight at the line. Measure first: on pressed pairs in the sim, how often the stall comes from the
hands joint versus from the bodies meeting (the release path running into the corner). Then decide whether it is
the release path (width before vertical) or the slide-off (how fast a receiver's swipe or rip clears a hand), against
the stall table above. The punch stays parked under its flag. It is coached technique and may be needed once a receiver can beat hands.
