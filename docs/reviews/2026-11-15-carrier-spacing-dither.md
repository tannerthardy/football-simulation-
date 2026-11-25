# Carrier / spacing dither: 0.122 → 0.170 (2026-11-15, develop engine-66 0c8c38b4)

Question (Integration): the dither budget's `carrier / spacing` stage was recorded at 0.1217/s (36 reversed re-aims in 296 moving s, budget 0.174) and the plain reference stack now reads 0.1699 (59 in 347 s).
Which promoted flags moved it, and what are the re-aims? Operator: the panel of `test/dither-budget.test.ts` as a script with chosen flags off (`scripts/diag/effective-mass/dither-panel.mts`, `OFF=A,B`), per-play counts from `carrier-dither.mts`, and the stage's branch per tick (`spacing-branch-trace.mts` with the debug hook in `patches/spacing-branch-trace.patch`).

## Which flags

The 55 flags that are on in the stack now and were not at engine-49 (121d458b), all off together: 40 reversed in 296 s, 0.1349 (the recorded 0.1217, 36 events: same panel, same moving seconds, inside the event noise: 2 sqrt(40) / 296 = 0.043/s). So the flags are the whole of it.
One flag off at a time (baseline 59): HONEST_READS 43, SIGHT_CARRIER 45, SIGHT_COVER 46, SAFETY_DEPTH 50, TRACK_PURSUIT 51, PURSUIT_SPOT 52, RUSH_LEAN_BOUND 54, PUNCH / QB_BODY_SEEN 55; the rest 56-66 (OPEN_HANDS 66, ROLL_AXIS 65 are the other direction); SIGHT_RECOG 61. TRUNK_TWIST 56, ENGAGE_FELT 56, RELEASE_BELIEF 60, OPEN_FIELD 63, VERTICAL_SET 60: not carriers of it.
Groups: HONEST_READS + SIGHT_CARRIER + SIGHT_COVER + SIGHT_RECOG off: 38 events in 317 s, 0.120 (the engine-49 level); those four plus SAFETY_DEPTH, TRACK_PURSUIT, PURSUIT_SPOT, TRACK_TACKLE, RCV_SEEN off: 31 in 336 s, 0.092. Per-play (`carrier-dither.mts`): 59 → 38, spread over 37 plays, mostly run plays (wz_strong 8 → 1 in one play, then oz_strong, oz_weak, toss, counter); 34 plays carry a reversal with the flags on against 25 off.

## What the re-aims are

The carrier's spacing request is chosen each tick from scratch by `gatherForMotion` (spacing.ts): forecast the held request against the acquired peers, return it when the swept clearance is ≥ 0, else try bends of ±0.2, ±0.4, ±0.6, ±0.8 rad in that order and take the first that clears, else slow, else gather. Nothing remembers the choice. Branch per tick on `wz_strong` seed 1:
- flags on: `clear` ×23 → bend −0.2 → bend −0.4 → **clear** → bend −0.8 → bend −0.6 → bend −0.4 → bend −0.2 → **clear** → bend −0.4 → clear ×25; each `clear` returns the held request between two bends, and the bend size changes tick to tick;
- the four sight flags off: bend −0.2 → bend 0.6 ×2 → bend 0.8 ×2 → bend 0.2 ×2 → clear ×3 → bend 0.2 → clear ×8: one side after the first tick, fewer interleaved clears.
So the reversal is a step function in his own situation: bending turns the forecast path of the HELD request clear of the teammate, so next tick `worst >= 0` hands back the held request (undoing the bend), which runs at the teammate again, and he bends again; the threshold (clearance ≥ 0) has no exit margin, the bend does not persist while the held request still conflicts, and the first-feasible order picks a new magnitude each tick. It is the shape CLAUDE.md names ("a threshold that switches mode or target has an enter and an exit margin"; "re-scoring the same picture every tick is not a new decision").
The sight flags make it more frequent because they change what the pictures are: the peers he forecasts against are acquired pictures with an age that update in steps, so the clearance of the held request crosses zero more often between updates; with the pictures off (true positions) it crosses less.

## Not changed

No stage is changed here and the budget is not re-recorded. The repair belongs to the owner of `spacing.ts` for carriers (Run Game): keep the chosen bend while the held request still conflicts with the same peer (until it clears by a margin or the peer is passed), and choose the bend side once. The four sight flags (HONEST_READS, SIGHT_CARRIER, SIGHT_COVER; SIGHT_RECOG does nothing here) carry the increase through the pictures, so a change in picture refresh (not the flags) would also move it.
