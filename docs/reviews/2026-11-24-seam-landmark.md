# SEAM_LANDMARK: #2's vertical to its field landmark, with the middle read (2026-11-24, Rules + Coaching, off)

Asked by Integration after Flex and Coverage's observation that our #2 stands tight and never widens. The alignment
half of that is on #880. This is the stem half.

## What the NFL does, and what we did

**Measurement.**
- One operator on both sides.
- NFL: BDB 2025 route census, PFF GO, #2 of a side with two detached receivers, ball on a hash.
- Middle of the field (MOF): closed for Cover 0/1/3, open for Cover 2/4/6, Quarters and 2-Man.
- Cells show room to his own sideline at the snap, 2.0, 3.0 and 4.0 s (p50). The hash is 23.6 yd from the sideline and
  the top of the numbers 9.

| cell | NFL | ours, off |
|---|---|---|
| field, #1 not vertical, closed | 18.6 / 16.5 / 15.3 / 15.8 (n 68) | 18.7 / 19.2 / 19.5 / 19.1 |
| field, #1 vertical, closed | 18.4 / 16.4 / 15.9 / 16.2 (n 24) | 19.0 / 19.0 / 19.5 / 22.1 |
| field, #1 not vertical, open | 18.8 / 17.4 / 17.2 / 18.4 (n 33) | 18.7 / 18.9 / 18.2 / 18.8 |
| field, #1 vertical, open | 18.6 / 17.5 / 18.3 / 20.1 (n 23) | 18.8 / 19.3 / 20.6 / 22.1 |
| boundary, #1 vertical, closed | 16.5 / 15.7 / 15.0 / 16.0 (n 10) | 15.8 / 15.6 / 15.9 / 16.7 |
| boundary, #1 not vertical, closed | 16.0 / 13.1 / 10.0 / 7.3 (n 22) | 16.4 / 16.6 / 16.7 / 16.9 |

Against a closed middle the NFL #2 widens to the seam lane, about 15.5-16 yd from his sideline. Against an open middle
he stays near his line, then bends inside. Ours ran a fixed line just inside his alignment (`l` -0.4 to -1.2) in every
case. Half our #2 verticals were also drawn as `go`, which runs straight up.

## The rule built

Taught:
- The seam is run "through the lane between the numbers and the hash marks" (ITP glossary).
- It is "a fly route run by an inside slot receiver or a tight end" (Four Verts Football).
- The seam runner "must see open vs closed middle of the field": closed, he pressures the free safety; open, he bends
  inside the near safety (First Down Playbook seam installs; M).

How it was coded (`src/playbook/routes.ts`, `src/sim/route-motion.ts`, `src/sim/assign.ts`):
- **Base, closed or no fresh picture:** up his line to 4 yd, then out to the landmark, halfway between the top of the
  numbers and the hash (16.3 yd), by 12 yd. A man already outside it keeps his line.
- **Open:** the installed 'middle' read (`route-read.ts`) works from the safeties he has seen, never the call. Two split
  safeties and none in the middle: he stays on his line to 12 yd, then bends 3 yd inside by 30.
- A `go` drawn for an inside receiver (#2 or #3) is run as the seam.
- One standard rule; no option routes.

## Result, attempt 1 (as built; 24 games, `npm run ref`, engine-92 at 751aeebe)

| cell | NFL | ours, on |
|---|---|---|
| field, #1 not vertical, closed | 18.6 / 16.5 / 15.3 / 15.8 | 19.4 / 18.8 / 16.5 / 16.1 |
| field, #1 vertical, closed | 18.4 / 16.4 / 15.9 / 16.2 | 18.9 / 18.7 / 17.5 / 16.3 |
| field, #1 not vertical, open | 18.8 / 17.4 / 17.2 / 18.4 | 18.7 / 18.5 / 18.3 / 17.9 |
| middle of the field, closed | - | 18.0 / 17.5 / 16.3 / 16.2 |
| boundary cells | as above | 15.8-16.7 at the snap, flat (already on the landmark) |

**What it repairs.**
- Closed-middle seams now reach the NFL's lane, 16.1-16.5 against 15.3-16.2, where off they ran 19-22.
- The read is live. On two-high coverages (cover 2, 4, 6, Tampa 2) 12 of 31 seams took the bend (39%). On cover 1 and
  3 none did (0 of 34). On cover 0 3 of 4 did, read from deep corners or other split defenders, since cover 0 has no
  deep safety.

**Flex's half_seat.py** (8 games per arm, half-safety moments with #2 vertical at 3.0 s):
- The half sits -0.8 yd from #2 with the flag on (inside him), against +0.5 off. The NFL is -0.8.
- The NFL half is outside #1 on 47% of those moments; ours on neither arm. That is the half's own carry, Coverage's.

## What it does not repair (re-diagnosed; two attempts, stopped)

1. **Timing.** Ours reaches the lane about 1 s later than the NFL (18.8 at 2.0 s against 16.5). The trace shows he
   follows his drawn path exactly (room planned 18.2, actual 18.4 at 2.0 s). The lag is the stem's 4-12 yd shape plus a
   seam runner about a yard short of the NFL's depth at 2 s (5.7 yd past the line).
   - Attempt 2 moved the landmark to 8 yd and the read to 3 yd. It did not move the 2.0 s cell (18.8).
   - Reading at 3 yd also broke the read: its roof begins 6 yd deep, so underneath defenders became "middle" and the
     open answer fell to 1 of 12. Reverted.
2. **The read misses about 60% of open middles.** He reads at 4 yd with the receiver's forward-cone picture and its
   half-second memory, so the far safety is often out of his picture. That is the perception model, not this route.
   Not changed here.
3. **Boundary, #1 not vertical, closed.** The NFL #2 takes the lane #1 vacated, out to the numbers (7.3 by 4 s). One
   standard rule leaves him at the seam lane. A second rule (#2 inherits #1's vertical landmark when #1 breaks short)
   would be an option; not built.

Commands: `npm run ref -- --flag SEAM_LANDMARK=1 -- node --import tsx scripts/diag/census/sim_plays.mts --games 6
--first F --full --all` (F = 0, 6, 12, 18); the cells from `seam` / `widen` operators over the route census; Flex's
`scripts/diag/defense-film/sim-stop-lane.mts` (seeds 101-108) and `half_seat.py` (claude/quirky-franklin-9lbwbp).
