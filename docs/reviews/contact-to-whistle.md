# Contact to whistle on the reference: #412, #418, #410 and HELD_SWING

Flex, 2026-11-09. Integration's item 1: measure the three contact/finish changes
that had never been measured together, and recommend what to do with each.
They are ONE_ARM_HOLD (#412), the grasp-timing fix (#418) and HELD_SWING (#414,
merged, off), plus RELEASE_REDECIDE (#410).

## Setup

- **Stack:** `run-ref-2` (= run-ref-1 @ 8696d32a with `ZONE_PAIR=0`; develop
  283325e1 changed only the stack file).
- **Matched set:** 12 run-only games captured at develop's code defaults
  (seeds 7–29 odd), 1,328 runs. Every arm replays the same snaps.
- **Arms:** #418 has no switch, so each code change is its own tree:
  - **off:** develop;
  - **HELD_SWING:** develop with `--flag HELD_SWING=1`;
  - **ONE_ARM_HOLD:** develop + #412, at its code default (on);
  - **#418:** develop + #418;
  - **all three:** develop + #412 + #418 with `HELD_SWING=1`;
  - **RELEASE_REDECIDE:** develop + #410, at its code default (on).
- **Operators:** Run Game's `hitterback`, `pile`, `stuffbin` and `deephit` on
  zone dumps (`dump-zone.mts`), plus `ref-compare.py` paired yards on all
  runs. NFL values are from the integration brief and Run Game's tables.

## Results

Zone first contacts. The front-on carrier gain is the median after the first
hit, by contact depth. "Deep stops" means contacts deeper than 1 yd behind the
line that end at 0 or less. Paired yards are on all 1,328 runs, capped at 20.

| Arm | Front-on gain at −1..0 / 0..1 / 1..3 yd | 2nd (3rd) defender arrives | Deep stops | Yards after contact at −1..0 | Contact → end | Paired yards (SE) |
|---|---|---|---|---|---|---|
| Off | 0.43 / 0.60 / 1.03 | 60% (25%) | 76% | 1.58 | 0.9 s | — |
| HELD_SWING | 0.46 / 0.59 / 0.93 | 55% (22%) | 78% | 1.47 | 0.6–0.9 s | −0.34 (0.03) |
| ONE_ARM_HOLD (#412) | 0.59 / 0.66 / 1.07 | 63% (26%) | 67% | 2.20 | 0.9–1.1 s | +0.46 (0.05) |
| Grasp timing (#418) | 0.45 / 0.62 / 1.12 | 64% (37%) | 72% | 1.67 | 1.0–1.3 s | +0.20 (0.03) |
| All three | 0.65 / 0.86 / 1.09 | 65% (33%) | 63% | 2.00 | 0.9–1.2 s | +0.16 (0.05) |
| RELEASE_REDECIDE (#410) | 0.53 / 0.55 / 1.05 | 61% (25%) | 76% | 1.75 | 0.8–0.9 s | +0.07 (0.05) |
| **NFL** | **2.2–2.6** | **80%** | | | | |

All runs, mean yards under 20: off 2.92, all three 3.08. The reference stack is
below the NFL, so positive paired yards are not a move away from it.

## Recommendations

- **#412 ONE_ARM_HOLD: merge as is (default on, `=0` switch).**
  - It is a correctness fix: one arm cannot lock around a body.
  - It moves the finish toward the NFL: yards after contact 1.58 → 2.20, deep
    stops 76 → 67%, a longer contact-to-whistle, and the 2nd defender 60 → 63%.
- **#418 grasp timing: merge as is (no switch).**
  - It is a correctness fix of grasp force timing and recovery geometry.
  - A 3rd defender arrives more often (25 → 37%), the finish lasts longer, and
    the hitter is driven back more often (side/rear ≥ 1 yd: 54–59% → 62–69%).
  - It deletes the `recoveryCoupling` that `WRAP_FOOT` scaled, so that retired
    flag is now inert.
  - Its stricter `line-read` assertion (that a backside box comes from an
    acquired carrying picture) contradicts develop's documented backside box.
    That box answers a blocker the edge sees arriving, and on I-pro/I-twins
    seed 7 it comes at 0.95 s with the carrier 3 yd behind the line. The
    assertion now applies only when a possession picture was consumed.
- **#410 RELEASE_REDECIDE: merge as is (default on, `=0` switch).**
  - It is a step-order correctness fix: a released player no longer carries
    his engaged standstill through the step.
  - It is neutral on the finish and on yards (+0.07, SE 0.05).
  - One ledger scene was re-recorded. In S8-P005, LB_W now reaches the carrier
    at 4.35 and misses, and CB_W wraps at 5.4, for 2.87 yd instead of 3.95.
    `=0` restores the old record.
- **HELD_SWING: keep off.**
  - On this stack it moves away from the NFL on both target measures. The 2nd
    defender falls 60 → 55%, yards after contact and contact-to-whistle get
    shorter, and paired yards are −0.34 (SE 0.03).
  - It is not retired. The leg-hold mechanism may be right while something
    else in the finish is wrong; re-test it once the front-on gap moves.

## What none of them fixes

None of the four closes the front-on gap. The carrier's gain after a front-on
hit is 0.4–1.1 yd against 2.2–2.6 on the NFL, and the hitter is rarely driven
back (median 0.1–0.6 yd). The 2nd defender arrives on at most 65% of contacts
against 80%.

Both are upstream of the bond:
- the front-on momentum exchange: whether a runner's legs keep driving through
  a tackler who has not yet planted;
- pursuit arrival (TKL-2).

The whiff itself is still a rating roll (TKL-7). Those three are the next
diagnoses for contact to whistle. More bond tuning is not.

## Reproduce

Tree per arm, then:

```sh
npm run -s ref -- --flag ZONE_PAIR=0 [--flag HELD_SWING=1] -- node --import tsx scripts/diag/ref-replay.mts <arm>
npm run -s ref -- --flag ZONE_PAIR=0 [--flag HELD_SWING=1] -- node --import tsx scripts/diag/run-operators/dump-zone.mts "$PWD" off | grep '^{' > <arm>.zone.jsonl
python3 -I scripts/diag/run-operators/hitterback.py <arm>.zone.jsonl   # also pile.py; stuffbin.py and deephit.py take "OUTSIDE ZONE,INSIDE ZONE" first
python3 -I scripts/diag/ref-compare.py off <arm>
```

## After the merge: the broken-tackle rise is one-armed grabs from inside a block

Integration's check on run-ref-3 (#431) found broken tackles per run
0.067 → 0.154 with this merge, and `ONE_ARM_HOLD=0` reverses it. Every
broken tackle and every one-armed grab on the same 1,328 matched runs
(run-ref-3 @ develop 6c0bd5c0; `scripts/diag/tackle-finish/one-arm-grabs.mts`):

- **All of the rise is one kind of hold.** Broken tackles per run are 0.063
  with `ONE_ARM_HOLD=0` and 0.166 with it on.
  - Block-origin breaks go 9 → 134, all one-armed at the break, 124 of them
    still engaged with their blocker.
  - Breaks of reaches, lunges, dives and form tackles barely move: 75 → 87.
  - Misses do not move (0.242 → 0.247).
- **What one-armed grabs achieve:** there are 663 grabs.
  - 359 hold one-armed until the play ends in a tackle.
  - 170 become a two-arm wrap once the tackler is off his block (median after
    0.55 s).
  - 134 (20%) break.
  - The carrier slows from a median 4.04 to 2.29 yd/s within 0.3 s, and half
    lose more than 1 yd/s.
- **The breaks are physical.** Peak load reaches the grip's capacity (median
  load/capacity 1.00). The runner pulls through, and no dice are involved.
- **Before the merge, the same grab ended the run.** The two-arm wrap formed
  from inside a block, which one arm cannot do. On the 125 plays with a broken
  one-arm grab, paired yards are +3.55.

**Reading:** this is the stated risk of #412, not a bug in it. An arm grab from
inside a block either drags the runner down or he runs through it. The sim
calls the second case a broken tackle. NFL charting (PFF) would often call it a
missed tackle or not chart it, so missed + broken per run is not comparable to
that band until the counter separates engaged grabs. The open question is
whether 20% is the right breaking share. That needs a reference, such as
yards after a blocked defender's first contact on tracking, not a capacity
change.

## Upstream of the bond: the front-on contact (2026-11-09/10)

**The gap is inside the contact, not who hits or how fast.** On Run Game's NFL
run of `run-operators/hitterback-split.py`, the median carrier gain to the end
for front-on first contacts at −1..3 yd is:

| Hitter | <3 yd/s | 3–5 | 5+ | All |
|---|---|---|---|---|
| NFL, all | +0.95 | +2.29 | +3.19 | +2.45 |
| Sim, all (run-ref-3) | +0.86 | +0.80 | +0.89 | +0.83 |
| NFL, blocked hitter | +1.03 | +2.43 | +3.31 | +2.54 |
| Sim, blocked hitter | +0.90 | +0.89 | +0.82 | +0.87 |

- The hitter mix matches: blocked / shed / free is 69 / 16 / 15 in the NFL and
  67 / 16 / 16 in the sim.
- The NFL has more 5+ yd/s arrivals (28% against 16%), which is worth perhaps
  0.2–0.3 yd.
- NFL gain rises with speed; in-game sim gain does not. The 1-v-1 tackle panel
  is about 1.5 yd short at every speed (0.4 yd at 3 yd/s, 2.1 at 6).

**Requested against achieved.** In the 0.3 s after a front-on hit (162
contacts, run-ref-4), the carrier keeps requesting about 3.9 yd/s downfield
while his speed falls from 3.6 to 1.0.

His downfield momentum change over that window, median, in kg·yd/s:

| Hitter | Total | His feet | Body contacts | Joints |
|---|---|---|---|---|
| All | −219 | +52 | −236 | −6 |
| Free hitter | −275 | +44 | −360 | +24 |

The first 0.1 s is a whole-body inelastic exchange (3.52 → 1.44 yd/s against
a 117 kg hitter; 3.5 × 96 / 213 = 1.6 predicted).

**Ruled out:**
- **The carrier's request.** He keeps asking for about 3.9 yd/s throughout.
- **His leg drive.** He already pushes into the load: the tackle bond sets
  `push` on 589 of 830 contact ticks, and his lean is active (median
  375 kg·yd/s²). His feet deliver about a quarter of their ground limit
  because the lean law caps a push at what the load returns
  (`felt × (1 + PUSH_GROWTH)`). He is not under-asking.
- **CARRIER_DRIVE.** An explicit push on felt load changed nothing (paired
  +0.01, SE 0.03; front-on gain 0.77 → 0.80). It was reverted.
- **CARRIER_BRACE** (lower pads plus a lunge, Run Game, held) adds +0.4–0.5 yd
  of front-on gain but +0.53 yd on whole runs, so it overshoots.

**What is left is the collision model.** A front-on hit treats each body as one
point mass: the whole runner loses his speed at once, and his capture point
jumps behind his base. In a real hit the tackler checks the upper body while
the runner's legs keep moving, so the runner falls forward over him or drives
through.

The candidates are:
- where the load acts against the carrier's COM. Earlier finding: 84% of
  front-on contacts land above it, which pitches him backward;
- how much of the body the first contact couples, as opposed to transmitting
  over the contact's duration.

This is core contact physics, so the next step is a design note with a
reproducer before any code.

**The breaking-share reference** (`run-operators/blockedhit.py`; zone runs, first
contact by hitter class, yards after contact):

| | n | Median | ≥ 3 yd | ≥ 5 yd | Contact → end | 2nd defender |
|---|---|---|---|---|---|---|
| NFL, blocked hitter | 1,665 | +2.69 | 44% | 17% | 1.5 s | 94% |
| Sim, blocked hitter (run-ref-3) | 325 | +1.50 | 26% | 12% | 1.4 s | 78% |
| NFL, free hitter | 708 | +2.57 | 41% | 17% | 1.1 s | 74% |
| Sim, free hitter | 152 | +1.62 | 30% | 9% | 0.9 s | 76% |

- **The one-arm grab's breaking share is not the lever.** The ≥ 5 yd tail is
  close (12% against 17%).
- **What is missing is the middle:** the 1.5–5 yd a held NFL runner keeps
  moving forward. The contact lasts as long (1.4 s against 1.5 s), and NFL
  runners gain more even though a second defender arrives more often.
- An NFL front-on contact is a moving pile; the sim's stops the runner. This
  is the same finding as the front-on split, and the same next item.
