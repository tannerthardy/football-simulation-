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

## Test classification (Defense, 2026-11-07, core suite on 299c6e38)

Failing tests: `RUN_HAND_MOVE` alone 7, `SHED_PAST` alone 20, both 24. The
rest of the earlier 42 were integration tests or failed only because a flag
was set in the environment.

1. **Replay pins (7). Re-pin on promotion; they are not football contracts.**
   - `responsibility-ledger` M10-P081, M7-P051, R7-P083, R9-P020, S8-P005
     (×2).
   - `line-read` "play-side edge replaces the vacated spot on counter".
   - The hand move changes these exact trajectories.
2. **Support controller contracts (about 16). The football holds; the
   fixtures encode the old release.**
   - `support-work-off` (9), `support-receiver-holder` (4),
     `support-escape-objective` (3), `support-contact-frame` (1).
   - The `contactFixture` hand joint carries no load, and it puts the
     defender 0.8 yd past his blocker. Under `SHED_PAST` he is free on the
     first work-off tick, which is correct.
   - Fix the fixtures (load the hand joint, or put the blocker in the path),
     not the assertions.
   - The deliberate "no tactile load" escape cases need Tanner's sign-off:
     either keep the blocker in the path, or state the contract as "an
     unloaded, out-of-path block releases".
3. **`shed-pursue` (1, Defense's).** Only the "on" case's
   `engagement` assertion assumes the old release. The decision contract
   holds. Defense's patch: accept `engagement` or a `shed` event on the
   attempt tick.

## Next

- **Run Game:** the carrier reads the engaged defender's leverage (which side
  his blocker covers) before cutting. `SHED_PAST` is the test bed.
- **Defense:** `SHED_AROUND`, the work-off request round the felt shoulder, was
  evaluated here.
  - With both flags on, DL still held 18% → 15% and freed 73% → 71%.
  - Defense owns that code; the patch is in #413's doc.

## Release timing (Flex, 2026-11-08)

Taking over Main Engine's queue, item 1. Base: `run/G3-oz-backfield` @ 86f044d9
with Run Game's flags (`LIVE_AIM=0`, `REACH_FLAT`, `ZONE_MUG` and its run-game
set) plus #412's `ONE_ARM_HOLD=1`, and this branch's `engagement.ts` changes applied
on top. Not Run Game's full stack: the Defense layers are absent. Zone runs from a
fresh `scripts/diag/edge/capture-runs.ts` restage, seeds 7–29 odd (587 zone
runs). Operators: Run Game's `scripts/diag/run-operators/` (`hitblk.py`,
`deephit.py`, on `run/G3-oz-backfield` @ 38440eb1), the same code as on NFL 2022.

**Where the lost yards come from.** The class `blocked` means an offensive player
was within 1.2 yd of the hitter when the defender first came within 1.0 yd of
the carrier. It mixes men still engaged with men just released. Split by the
hitter's engagement state at that tick:

| Zone, hitblk `blocked` class | Flags off | Both on |
|---|---|---|
| Still engaged: share, mean yd (OZ / IZ) | 83% 3.05 / 86% 3.49 | 63% 2.47 / 58% 2.72 |
| Released < 0.5 s before (OZ / IZ) | 1% / 5% | 19% 1.67 / 23% 0.81 |

Nearly all of those releases are `past him`. `SHED_PAST` fires when the runner
reaches the defender. A man who slips his blocker with the runner already on him
then makes a free, full-reach tackle on the spot.

Without `ONE_ARM_HOLD`, engaged grabs end the block (`grasp` disengages him) and
stop the runner at about 1.5 yd. The flags-off base falls to 1.81 / 2.82, so
#415 must be judged with #412 on.

**Change (`SHED_PAST_GATE`, off; needs `SHED_PAST`).** Getting past frees him
only while the runner he sees is still more than 2 yd off. Closer than that, he
stays engaged and reaches with his free arm under the one-arm hold. It uses only
the defender's own runner picture (`read.threat`).

A variant without the shed's throw-aside impulse on the blocker changed nothing
(2.19 / 3.00) and was dropped.

| Zone | Flags off | Both on | Both + gate | NFL |
|---|---|---|---|---|
| hitblk blocked mean yd, OZ / IZ | 2.46 / 4.02 | 2.13 / 2.97 | 2.23 / 3.52 | 3.41 / 3.68 |
| Deep contacts (> 1 yd behind LOS): shed share | 13% | 18% | 19% | 24% |
| Deep contacts by a blocked hitter ending ≤ 0 | 49% | 44% | 40% | 43% |
| Mean yd (capped 20), OZ / IZ | 3.70 / 4.86 | 3.06 / 3.83 | 3.25 / 4.24 | — |

- The gate recovers most of IZ's loss and keeps the deep-backfield gains.
- OZ still loses 0.2 yd against flags off. Its base is already 1 yd below NFL
  here, so the OZ comparison waits on Run Game's full stack.
- The engaged class also falls with both flags (3.05 → 2.47 OZ). A landed hand
  move cuts the blocker's steer to 10%, which is how a stretch reach carries
  the man. That is the next thing to look at.
- These are single runs with no paired standard errors. Run Game's paired
  tables on its own stack are the evidence to use.

### Paired tables and negative results (Flex, 2026-11-08)

**Run Game's paired tables** on its 546-play set. Stack: `run/G3` @ b1075e57,
Defense 205c6add, `ONE_ARM_HOLD`, #416, this branch, `END_CHASE=1`.

| | Off | RUN_HAND_MOVE + SHED_PAST | + SHED_PAST_GATE | NFL |
|---|---|---|---|---|
| hitblk blocked, OZ / IZ | 3.07 / 3.97 | 2.24 / 2.83 | 2.55 / 3.07 | 3.41 / 3.68 |
| Deep contacts: blocked hitter ends ≤ 0 | 25% | 46% | 39% | 43% |
| Runs < 20 mean, OZ / IZ | 3.49 / 4.50 | 2.80 / 3.57 | 3.11 / 3.76 | 3.50 / 3.73 |
| Paired yd vs off, OZ / IZ (SE) | — | −0.82 (0.20) / −0.97 (0.23) | −0.51 (0.18) / −0.71 (0.23) | |

**Ruled out as causes of OZ's remaining blocked-class cost.** Base: Run Game's
branch with `ONE_ARM_HOLD` and all three flags. Each side effect of a landed
hand move was switched off in turn (scratch hooks, not committed):

- Keeping the blocker's steer (no 10% cut): OZ blocked 2.27 (gate 2.23).
- No control drop: 2.33.
- Blocker keeps his touch mirror: 2.32.
- All three off: 2.27.
- Without the hand move at all, SHED_PAST + GATE give 2.42 (flags off 2.46).

So the cost comes from the releases a landed move enables, not from its side
effects.

**Release rates do not overshoot.** Main Engine's offblock operator:

| | Off | Gate | NFL |
|---|---|---|---|
| DL off every blocker within 1.0 s | 17% | 18% | 25% |
| LB off every blocker within 1.0 s | 38% | 36% | 36% |

**No time-to-arrival gate.**
- OZ releases that become the first hitter mostly happen 2–4 yd and 0.35–0.56 s
  before contact. Those plays end at 0.9–1.4 yd.
- That is a legitimate shed-and-tackle with time to square up, so a longer gate
  would only tune to output.
- Remaining suspects are outside this law:
  - the OZ carrier's answer to a play-side defender who comes free 0.5 s ahead
    (Run Game);
  - the hand move's landing rate on a lateral stretch reach, which needs an
    NFL operator for OZ releases.
