# SPACING_HOLD: the carrier keeps his spacing decision (Tools, 2026-11-15)

Flag `SPACING_HOLD` (off; `=1` turns on). Code: `src/sim/spacing.ts` (`holdBend`, `bendHolds`, `limitHolds`, the carrier branch of
`gatherForMotion`, the headway loop of `spaceTeammates`). Test: `test/spacing-hold.test.ts`. Diagnostics:
`scripts/diag/effective-mass/{dither-panel,carrier-teammate-contacts}.mts`.

## The defect

Carrier / spacing reversed re-aims rose from 0.122 /s (engine-49) to 0.170 /s (engine-66). Turning the sight flags off
(`HONEST_READS`, `SIGHT_CARRIER`, `SIGHT_COVER`, `SIGHT_RECOG`) gave 0.120; they did not create the dither, they exposed it through aged, stepped
pictures of the teammate. Two knife-edge choices in the carrier's spacing pass were re-made from scratch every tick, with no memory and no
exit margin (the CLAUDE.md "commit to a decision" rule):

1. **The bend.** `gatherForMotion` took the request back when the swept clearance to the peer was >= 0, else the first feasible of
   +-0.2, +-0.4, +-0.6, +-0.8 rad. Next tick the same picture could hand back the request, or the other sign. The
   `selected` restore (the raw request returned when the preview shows "passed") flipped it again at the end of the horizon.
2. **The headway limit.** `spaceTeammates` drops a teammate from the limits when the closing line's offset from him exceeds the touch distance
   (`hypot(dx - rx*closest, dy - ry*closest) > touch`) or when he is farther than his stopping distance. Braking lowers his own speed, which lowers
   the stopping distance, and the offset sits at 0.50 against a touch of 0.48: the limit is on at 4.65 (turn to -73 deg at 1.5 yd/s),
   off at 4.70 (65 deg at 9.0 yd/s), on again at 4.75. (stick/3, `HEAD=1`.)

## The change (carrier and a lead blocker on the carrier's steer; `RB_STEER` population only)

* The bend persists: once he bends around a peer he keeps that side and bend while the held request still conflicts with the same peer. The magnitude
  may grow in 0.2 rad steps, never shrink-then-flip, and never changes sign. He returns to the held request only when it clears by a margin (enter at
  clearance < 0, exit at clearance > his body width) or he has passed the peer. A held bend that no longer clears every peer falls back to the
  ordinary choice, so it cannot hold him into a body.
* While the hold exists the `selected` restore does not hand the raw request back.
* A headway limit he is braking under stays until the closing line clears the touch distance by a body width (and the aware distance likewise),
  and only while he is closing on that peer.
* A new decision needs a perceived change: a different peer, or the clearance crossing the exit margin. Re-scoring the same picture is not one.

Nothing here rewards or bans a technique; it only removes the tick-to-tick flip.

## Gates (engine-67 develop 0f5f7645, the dither panel's 135 plays)

| Gate | Result |
| --- | --- |
| wz_strong seed 1: one bend held and released once | the bend starts at 1.50, grows smoothly, is held to 2.40 and released at 2.50 (baseline had `selected` toggles at 2.00, 2.15, 2.25). The panel's reversed carrier / spacing re-aims on wz_strong/1 go 5 -> 0 (`HEAD=1`), wz_strong/2 4 -> 0 |
| carrier / spacing, default stack | 0.1709 /s (58 events, 339 s) -> 0.1087 /s (37, 340 s); engine-49 recorded 0.1217 /s (36). Budget 0.174 |
| carrier / spacing, `HEAD=1` | 0.1988 (69) fails the budget without the hold; 0.1197 (41, 343 s) with it |
| carrier / spacing, sight flags off, hold on | 0.1210 (40): the hold, not the sight flags, owns the result |
| other stages | unchanged: block / spacing 0.0762 -> 0.0753, rush / spacing 0.0515 -> 0.0510, coverage / spacing 0.0988 -> 0.0983, QB / spacing 0.0378 -> 0.0374 |
| `test/dither-budget.test.ts` | passes with `SPACING_HOLD=1`, with and without `HEAD=1`; the recorded budget is not raised (a lowered row is for the PR that promotes the flag) |
| carrier into own teammate contacts (centres within 0.9 of the radii sum, once per teammate per 0.5 s) | panel: 8 episodes (15 ticks) -> 14 (36); `HEAD=1` 11 (38) -> 11 (34). The extra episodes are slow brushes (0.8 to 3 yd/s, d 0.45 to 0.56) in seven run plays; two counter plays lose theirs. On 255 plays (40 -> 160 run plays) 26 (75 ticks) -> 30 (91): inside the +-2 sqrt(n) of plays that diverge, no systematic increase |

## Who else shares the function

`spaceTeammates` and `gatherForMotion` serve every agent with a team peer. The early `worst >= 0` return, the yield and the gather branches and the
headway loop (including the lane-offset knife-edge) are shared by blockers, defenders, the QB and receivers. The bend branch is `RB_STEER`'s: carrier
and lead blocker only. The new holds are gated to `behavior.kind === 'carrier'` (bend: carrier or lead blocker); nothing changes for the others.
The same lane-offset threshold is in their code path, but their panel rates did not erode (block / spacing 0.0762 against 0.0683 at engine-49,
coverage 0.0988 against 0.1056, rush 0.0515 against 0.0736, QB 0.0378 against 0.0511), so the defect only matters where a body at 9 yd/s turns on it.
Reported, not widened.

## Football read

See the PR description for the run set and YAC rows.
