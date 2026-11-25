# QB_V2 quick-game landing: notes

QB lane, 2026-11-24.

## Base and scope

- **Base:** develop a06269e54 (engine-101). It carries the read plans (#893) and the harness (#897). The audit and card
  docs (#934-#936) don't touch the patch.
- **The flag count line** is 517 = `src`. Develop's own line read 514 against 515 in `src`: one flag (likely
  BLOCK_FRAME) isn't counted in its category split, which I left as develop has it.
- **Flags, both off:**
  - `QB_V2=1` runs V2 on the three staged concepts: quick_outs, slant_flat and stick. Each runs only when its read plan
    fits the call; every other call stays on the old controller.
  - `QB_QUICK_DRIFT` is a mode. Bit 1 is the gun quick drift's shape. Bit 2 is reading from the secure, with the set as
    the throwing step. The candidate is 3.

## Outside audit (docs/reviews/2026-11-24-qbv2-outside-audit.md), row by row

### §1 The read cycle

| # | Status | What |
|---|---|---|
| 1 | **fixed** | `Cycle.uncommit()`. The wiring calls it when `startIfFinish` returns no command, so he goes back to the read and pressure and the pocket are looked at again. Test: qbv2-cycle "a commit the wiring cannot start fails back". |
| 2 | **fixed** | A key read isn't "answered no" until the key has declared a cue. The next step still bounds it (hold rule (b)). |
| 3 | **fixed** | The seen-depth gate uses his seen progress along the stem (the projection on start → break), not the radius round the installed break point. A receiver ridden 2 yd wide still reaches the top of his stem. |
| 4 | **fixed for a light hold; corrected 2026-11-25** | `contact` comes from his own felt contact (heldBy > 0), and with nothing clearing he throws it away in the pocket. That holds only while he is lightly held (0 < held < 0.6). At 0.6 or more, `qb.ts` returns `stand()` before the V2 step, the old controller's rule: wrapped up, he cannot start any throw, and a throwaway uses the same windup. Kept as a body limit and stated (`2026-11-25-qbv2-escape-hold.md`). The unit test drives the cycle directly, not through that line. `hotSide` is the side of his most urgent felt rusher (within 1.5 s), by the alignment's strong side. |
| 5 | **both ways fixed; outside corrected 2026-11-25** (with §3 #4) | Escape both ways. He enters past 4.5 yd from the ball's lane and resumes the read inside 3.75 yd (enter and exit margins). As landed, while outside he never looked at the checkdown, never moved his looks, and threw it away on a felt rush. Fixed in `escape-on-890558713.patch`: eyes across the reads a stride each, the checkdown, away only when imminent or in contact. |
| 6 | **fixed / deferred** | The checkdown now respects `fromStep` in the pressure response. **Deferred:** the `handoff` intent (RPO). No staged concept uses it, so it lands when an RPO plan does. |

### §2 Hidden state

| # | Status | What |
|---|---|---|
| 1 | **kept, debated** | `isDbSlot(personnel, slot)`, Flex's one DB rule: the visible package's CB/S slots. QBMind now imports the same function. The reviewer would read DBs from alignment and grouping alone. That stays open with Flex; it's one rule now, so it changes in one place. |
| 2 | **corrected 2026-11-25: a prior by design, one fallback leak** | With QB_BELIEVED_DEF on (the default), V2 reads QB_SCOUT's scouting report. It's the roster position's typical body plus film of his true traits, with an error that falls with his snaps on film, drawn once per passer and defender pair. That is a pre-game prior from public roster data and film study, not live truth. **The leak:** with no typical for his position, the report returns the true profile and ratings exactly. Paid by giving every position a typical. Open. |
| 3 | **fixed** | The kill throws at his estimate of the receiver. |
| 4 | **deferred: old controller's** | `shouldScramble`'s true isDown is the old controller's code, shared by V2's escape branch. Changing it moves flags-off behaviour, so it's a separate item. |
| 5 | **default-safe** | `evaluate`'s seen-receiver flag (QB_SEEN_REC) is on by default. |
| 6 | **fixed** | The strong side and the protectors come from the call's alignment. S1's true y, teammates' behaviour and teammates' bodies are no longer read. |
| 7 | **deferred: Tools** | `sim.see` has no cone gate: shared perception, Tools' item. It sits alongside SIGHT_BODY (#tools/sight-body), which Integration rules on. |
| scan | **covered** | The type-aware scan (test/decision-information-scan.test.ts) already scans qb.ts with exact listed counts. Its counts for qb.ts on this patch equal develop's. qbv2-information.test.ts covers src/sim/qbv2. |

### §3 Decisions that flip

| # | Status | What |
|---|---|---|
| 1 | **fixed** | The sit cue (squats / widens) is held. It changes only when the other landmark is nearer him by 0.5 yd. |
| 2 | **not fixed; corrected 2026-11-25** | The landed rule left age out of only its own term. QBMind's picture spread still grows with age and fed the same sigma. A man whose picture was 1.5 s old was dropped from the judgment. The lane's near-catch sigma was gated on the mid-flight margin. QBMind's estimate also moves with no new sighting. Card spec §1 is in progress (`2026-11-25-qbv2-picture-age.md`; the attempt-2 WIP is not for landing). |
| 3 | **deferred** | No exit margin on the coverer radii, plus the reaction step at a 4 yd cushion. The held coverer (COVER_SWAP) already damps a swap. A smooth reaction blend is a follow-up. |
| 4 | **fixed** | See §1 #5. |
| 5 | **deferred: Flex (roles.ts)** | The role areas change at the snap. |

### §4, §5

Reference only. The catch term is checked against PFF's buckets after landing:
- accurate: 93.3%;
- catchable off target: 78.7%;
- uncatchable: 2.0%.

Ours: 0.95 within 1 yd of the aim and 0.77 beyond, on undefended throws.

## Staged cells on the landing tree

8 cells × 30, QB_V2=1 QB_QUICK_DRIFT=3, mid passer.

| Cell | Cmp | INT | Sacks | Main routes |
|---|---|---|---|---|
| Quick outs vs cover3 | 23 | 1 | 0 | out 16/21 at 1.80 s (rel−brk +0.05); hitch 7/9 |
| vs cover2 squat | 19 | 1 | 1 | out 16/26 at 1.65 s |
| vs cover1 | 28 | 0 | 0 | hitch 27/28 at 1.95 s, **rel−brk −0.2** (NFL 2.00 s, −0.2) |
| vs cover2man | 26 | 0 | 0 | hitch 26/29 at 1.90 s, −0.2 |
| Slant-flat vs cover3 | 22 | 1 | 1 | angle (checkdown) 19/19, slant 1/7 |
| vs cover1 | 19 | 1 | 1 | angle 15/15, slant 3/10 |
| Stick vs cover3 | 25 | 1 | 0 | flat 17/19, stick 3/6 |
| vs cover2 | 23 | 0 | 0 | stick 15/19, flat 6/8 |

- **Total:** 185 / 240 complete, 5 INT, 3 sacks.
- **Release p25/50/75:** 1.85 / 1.95 / 2.15 s.
- **P believed 0.81, actual 0.79.**

**Known, parked:** slant-flat leans on the checkdown. That's Coverage's curl-flat width (the weak curl-flat trails the flat 2-4.5 yd inside) plus our slant breaking about 0.7 s after its plan (#925).

## The boundary (seam 1)

V2's adapter lives in `src/sim/qbv2/host.ts`:
- `PasserView` is what QBPass lends: his pictures, his own body, his kept throwing mechanics.
- `makeHost` builds the host the modules read; `V2Wiring` turns the cycle's intent into a command.
- qb.ts only implements the view over its own perception functions.
- test/qbv2-information.test.ts scans host.ts, and the type-aware scan's qb.ts counts equal develop's.
- The throw latch holds only once the windup begins; otherwise `uncommit` in the same tick.
- Escape returns when he's back inside and the rush is clean or felt.
- Behaviour-neutral: the 8 cells are identical before and after the move (185 / 5 / 3).

## Decision-and-timing scorecard (first operators; **not yet validated**)

scripts/diag/qbv2/decision-card.ts, 8 cells × 30:

| | Old controller | V2 |
|---|---|---|
| Taught answer to what the key did | 40/215 | 56/222 |
| Release − break in [−0.3, +0.4] | 45/198 | 82/186 |
| Stalls (no throw by 3.0 s, not sacked) | **49** | **4** |
| Pre-snap side, quick outs | 102/120 | 81/120 |

The card's operators are being fixed before the whole-game card, per Integration:
- **(a) The key classifier:** against #936's definitions; it sometimes picks the Mike, and against man it must score the man answer.
- **(b) The side metric:** like for like.
- **(c) Stick's timing:** on its planned break.

## Plan coverage in whole games

scripts/diag/qbv2/coverage-share.ts, 2 games, QB_V2=1 QB_QUICK_DRIFT=3:
- 194 called pass plays;
- the three staged concepts were called 19 times (slant-flat 11, stick 5, quick outs 3);
- **V2 ran on 5 (2.6% of pass plays)**.

The other 14 calls didn't fit their plan: the plans are authored on the taught routes, and those are CALL_COMPOSE settings, off. So a whole-game card on QB_V2=1 alone mostly measures the old controller. Card it with CALL_COMPOSE's taught versions on, or widen the staged set once the other plans are staged.

## Follow-ups (not blocking a flagged landing)

- **The card spec's §1 picture age** (a one-sided unseen advance on a fresh spread) replaces this patch's interim (age not counted for an early arrival). Next, with UNSEEN_DRIFT re-checked on the role rows.


- **#925:** timingPoint and bodyRunTime replace the flat timing-point interim.
- **SNAP_FLIGHT (#927):** re-take the timing rows; the drift's 1.1 s comes down by about 0.3 s.
- **SIGHT_BODY:** re-run key-eyes on stick vs cover2.
- **The deferred audit rows above.**
- **Widening QB_V2** to the other plans after staging.
