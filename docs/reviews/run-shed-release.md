# Run sheds: a block is the body between the defender and the ball

Main Engine, 2026-11-06. Develop `9a19ced9`, matched-restage captures for
seeds 7–8, restage environment `54199f26`. Both flags are off by default:
`RUN_HAND_MOVE` and `SHED_PAST`. Follows `docs/reviews/shed-moves.md` (#413).

## Question

#413 found three repairs that did not change who gets free:
- friction-only hands;
- the shedding defender's grip;
- a work-off request round the blocker's shoulder.

Tanner asked for the missing piece, a hand move that turns hand control into
getting off the block.

## The hand move alone does not release anyone

`RUN_HAND_MOVE`: when a defender decides to work off, he attacks the blocker's
hands first. It uses the same exchange a pass rusher's finesse move makes
against the punch, with these terms:
- his swipe is `hands + 0.15·bend`;
- the blocker's keep is `hands + 0.3·max(0, control)` plus his rep edge;
- it lands if the swipe beats the keep by 0.18, with noise 0.18 on each.

When it lands:
- the blocker's hands are off for 0.3 s, as for a landed pass move (`setHands`);
- the blocker follows him by sight rather than touch, as a pass blocker does
  after a landed move.

When it misses, the blocker re-fits tighter (control +0.2).

It lands in 34% of shed attempts. The defender is freed within 1 s in 47–53%
of those, against 47% when it doesn't land. Clearing the hands does not free
him.

## Why: run blocks could not be beaten

`scripts/diag/_shedends.mts` records how blocks end on DL and LB who are trying
to shed (seeds 7–8):

| End reason | Count |
|---|---|
| Runner passed defender | 134 |
| Separation | 36 |
| Body down | 29 |
| Leverage | 0 |

The leverage measure `behind` is 0.00 at p90 on every tick. It measures how far
the defender is behind the blocker's chest. The blocker turns his chest to
follow him (turn rate × dt), so it never reaches 1.1. A run block ended only
when the ball went by.

## Change (`SHED_PAST`)

A block is the blocker's body between the defender and where he is going.
While a defender is working off, the blocker is no longer in his way when
either holds:
- the blocker is less than 0.25 of a body width ahead of him toward the runner
  he sees (his acquired, delayed picture);
- the blocker is more than a body width across that line.

Then the block ends ("past him"). A beaten blocker can still grab
(`tryHold`, the existing holding risk). No block outcome is rolled.

## What it does

**Shed tools, seeds 7–8:**

| Arm | Freed within 1 s | DL tried, still held | DL made the play |
|---|---|---|---|
| Off | 45% | 40% | 28% |
| SHED_PAST | 65% | 27% | 29% |
| SHED_PAST + RUN_HAND_MOVE | 73% | 18% | 27% |

- With both flags on, block ends become "past him" about 315 times and
  "runner passed" about 40 times.
- Holding calls stay at 0–1 per 104 runs.

**Same operator as NFL** (off every blocker within 1.0 s; `_offblock.mts` and
`offblock.py` reconstruct Defense's definition; NFL 2022):

| | DL | LB | DB |
|---|---|---|---|
| NFL | 25% | 36% | 48% |
| Sim, off | 18% | 35% | 29% (n 17) |
| Sim, both on | 24% | 39% | 61% (n 18) |

Getting free moves to NFL-like rates. It does not overshoot for DL or LB. The
sim DB samples are small.

**Matched restage**, both flags on, k = 5, 1415 replays:

| | Off | On | Paired d |
|---|---|---|---|
| All | 7.94 | 6.91 | −1.03 ± 0.17 |
| Runs | 5.10 | 2.62 | −2.49 ± 0.40 |
| Passes | 9.59 | 9.41 | −0.18 ± 0.08 |

- Runs:
  - median 2.2 → 1.6;
  - no gain or a loss: 18% → 24%;
  - 20+ yd: 4.6% → 1.0%;
  - 40+ yd: 2.5% → 0.2%.
- Touchdowns: 138 → 118.
- Rows sha: off `100f3b7f559edb42`, on `bf0c433a7f1ebc00`.

## First divergence on the largest change

S8-122-k1, Singleback Twin TE Inside Zone Weak: 74 yd TD → 0.8 yd.

- **Off:**
  - DT_S misses;
  - LB_M wraps and the hold slips;
  - SS wraps and the hold slips;
  - touchdown.
- **On:**
  - DT_W is past the RG 0.45 s after the handoff, as the back cuts toward DT_W's
    free side;
  - the RT picks him up; he is past the RT at 2.00;
  - he dives at the back at 2.10 and makes the tackle at 2.80.

This is the run the old law rewarded. A zone back cut toward the side the
defender's blocker did not cover, and the engaged defender could not come off
the block to it. A block controls one side of a man, so cutting into his free
side is running into him.

## Reading

- The release law moves getting free to NFL rates.
- The run game loses about 2.5 yd/run because backs cut into defenders'
  uncovered sides.
- Reading a defender's leverage belongs to the carrier controller (Run Game).
  Promoting this without that read would trade one defect for another, so it
  stays off.
- Worse yardage can follow better football. Here the drop is explained by the
  mechanism, not yet balanced by the offense's answer.

## Tests

- **Flags off:** `npm test` 3741/3741, typecheck clean.
- **Both flags on:** 42 failures in 12 files, mostly contracts for the
  support player's work-off and escape geometry, written against blocks that
  end only when the runner passes:
  - `support-work-off` (9), `support-escape-objective` (9),
    `support-receiver-holder` (4), `run-contact-workoff-interaction` (4),
    `support-contact-frame` (2);
  - `responsibility-ledger` (6), `combo-climb-coupled` (2), `climb-access`,
    `shed-pursue`, `pursuit-arrival`;
  - `baseline-runner` (3) and `scorecard-provenance`, which fail only because
    a flag is set in the environment.
- Promotion needs those reviewed with their owners (Defense, Run Game).

## Correction (2026-11-06, Run Game's operator)

The carrier-read reading above was wrong. Run Game's operator (NFL and sim
alike) classes each first contact by the hitter: still blocked, just shed, or
free.
- With the flags off, both the share of each class and the yards per class
  were already NFL-like.
- With both flags on (511624a7), blocked-at-contact hits on OZ went from 3.36
  to 0.97 yd at an NFL-like share (NFL 3.39).
- The release fired as the runner went by at arm's length, with the blocker's
  hands still on, so a man still being blocked made a free two-arm tackle.
- Giving the back the mirrored read changed nothing (+0.05).

**Change:** being past the blocker frees the defender only when the blocker's
hands are off, either through a landed hand move or because the hand joint
carries no load. While they are on, he stays engaged, and a passing runner
meets only his free arm (ENGAGED_REACH).

Restage k = 5, same arms:

| | Off | On (hands clear) | Paired d |
|---|---|---|---|
| Runs | 5.10 | 3.88 | −1.22 ± 0.35 |
| Passes | 9.59 | 9.51 | −0.08 ± 0.06 |

- Off every blocker within 1 s: DL 21%, LB 23%, DB 62% (NFL 25%, 36%, 48%).
- The LB rate is now below the 35% with flags off, so this is still not the
  release law. It is the current state, pending Run Game's blocked/shed/free
  split.

## Next

- **Run Game:** the carrier reads the engaged defender's leverage (which side
  his blocker covers) before cutting. `SHED_PAST` is the test bed.
- **Defense:** `SHED_AROUND`, the work-off request round the felt shoulder, was
  evaluated here.
  - With both flags on, DL still held 18% → 15% and freed 73% → 71%.
  - Defense owns that code; the patch is in #413's doc.
