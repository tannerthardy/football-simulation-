# What the over-priced defenders really do between the release and the arrival (trace for Integration's deep-mix item)

QB lane, 2026-11-18. Engine-83 (#842 e51c228a). The key's seam is thrown at the second hitch (`def-path.ts`: seam-staged
plus each counted defender's distance to the aim and closing speed every tick from the release, his role, when his
release belief first had the ball, and his behavior tags at the end). 648 plays.

**Recognition is not the gap.** Each counted defender's release belief has the ball 0.25–0.30 s after the release in
every state and role (man defenders trailing with their backs turned: 0.8–1.5 s). The window's start for the same men
(blind + reaction from the decision) is about the same.

**What they do after seeing it.** Closing speed toward the aim, median by 0.2 s after the release:

| state, role | 0.0 | 0.4 | 0.8 | 1.2 | ends from the aim (median) |
|---|---|---|---|---|---|
| eyes-on, deep (n 191) | 3.9 | 3.9 | 4.2 | 5.2 | 2.7 yd |
| not facing, deep (n 43) | 5.1 | 5.5 | 6.1 | 7.2 | 2.5 |
| eyes-on, underneath (n 78) | 3.4 | 3.8 | 5.0 | 6.1 | 4.5 |
| away, deep (n 27) | −3.6 | −2.7 | −0.4 | +0.3 | 7.8 (4% ever close) |

**The eyes-on deep men are match carriers.** On Cover 2 / 3 (59 traced) every one carries `open-carry`, and most carry
`half-own` / `deep-hold`:
- They run with a receiver, keeping a roof over the top of him (CoverageDefender's overTop: the receiver's x plus 0.8 +
  0.15 × his climb).
- With the ball in the air they stay on him and play the catch: `catch-carry` 19, `drive-catch` 13 of 59.
- They do not race to the ball in flight. They reach the catch behind it, a median 2.7 yd from the aim.

**The away deep men** are bailing with a vertical. Their reverse comes after 0.8 s, and they never get back.

**So the window's error is the role, not the start.** It prices every counted man as a ball-chaser from his start
(running at the point), but our deep defenders play the receiver from over the top. Proposed role path, no constants
beyond the defenders' own:
- **A deep man he sees carrying the target receiver over the top** (deeper and moving with him): contests the ball only
  if its path passes through his reach (the aim at or beyond him). Otherwise he arrives as the receiver's tackler, priced
  through the securing / dislodge term at his arrival behind the catch.
- **A deep man bailing away:** carries his velocity until after the catch window.
- **The rest** as now.

## QB_ROLE_PATH (off): two attempts

Patch: `qb-role-path-close-belief-on-pr842-e51c228a.patch` on #842 (it also carries QB_CLOSE_BELIEF, held, and QB_STANCE's
readers).

1. **Roof over the target only.** No effect: the eyes-on deep men are rarely over the target. In the trace they sit
   about 20 yd deep and 10 yd from the seam receiver, carrying another man with a cushion.
2. **Any deep man (8+ yd) carrying a receiver** (deeper by half a yard, within 7 yd, moving with him) is priced through
   that receiver's route with his offset kept: no flight contest, and only from where the carry takes him at the
   arrival. A ball under his own carried target arrives as the catch from behind.

Results, attempt 2:
- **Games** (8, seeds 11 and 31): 15+ air-yd share 2.2% → 3.6% (14 → 22 throws, NFL 13.4%). Their completion 0.50 →
  0.45. Ints 9 → 7. Completion 0.694 → 0.676. Air yards 5.3 → 5.6.
- **Held-ball rows:** eyes-on still believed 0.60 against 0.19 real. The carriers the rule finds leave the counted set
  (277 → 265). The rest are deep men it does not class as carrying.

Stopped at two attempts. Next is to trace the remaining eyes-on deep men's real role (tags and the man or zone they play)
before a third form. Scan, guard and reference-stack pass.

## Integration's two conditions (attempt 2 plus a downhill margin)

**1. The role is what he sees.** A carrier must be:
- deeper than the receiver by half a yard;
- within 7 yd of him;
- moving with him (velocity cosine above 0.7);
- **not closing on him** faster than 1.5 yd/s (chosen margin).

A safety driving downhill on the receiver (a robber, a quarters safety on a declared in-break, DEEP_DECLARE's break on a
corner or out cut) is closing on him, so it stays a ball-chaser. So does one sitting flat-footed, who is not moving with
him.

**2. The man behind the catch still costs something.** For a ball under his own carried target, the securing window's
dislodge at his arrival stays.

**Staged seams thrown into them** (forced at the second hitch, so outcomes do not depend on the price), n 295: defended
53 (18%), ints 7 (2.4%), drops 9, misses 133 (45%), caught 93 (32%).

**Games** (8: seeds 11 and 31, 4 each; engine-83):

| arm | throws | 15+ air yd share | 15+ completion | 15+ ints | completion | ints | PBU |
|---|---|---|---|---|---|---|---|
| off | 640 | 2.2% (14) | 0.50 | 1 | 0.694 | 9 | 66 |
| on | 680 | 4.0% (27) | 0.56 | 0 | 0.697 | 12 | 55 |

**15+ share by shell** (NFL 13.4% overall; a place to look):

| shell | off | on |
|---|---|---|
| one-high | 2.1% (8 / 379) | 3.3% (13 / 394) |
| two-high | 2.6% (6 / 230) | 4.7% (12 / 256) |
| zero | 0% (0 / 31) | 6.7% (2 / 30) |

All interceptions rise 9 → 12, none of them on the deep balls.

## Third form: deep zone men through the engine's body from what he sees (Integration, after Defense's NFL table)

Defense, NFL week 1 (n 126): deep men close at 2.7 / 3.6 / 4.8 / 5.3 yd/s at 0 / 0.4 / 0.8 / 1.2 s and end a median
4.5 yd from the catch point. Ours close at 3.9 / 4.2 / 5.2 and end 2.7 yd from it. The defenders are NFL-like; the
price was not.

**Built (in QB_ROLE_PATH).** Any other deep zone man (10+ yd in his picture, not carrying, not bailing):
- he holds his seen velocity and facing until his belief of the ball (the release, then his reaction);
- then he turns and runs, through `stepBody`;
- this replaces timeToReach from rest after a standing reaction;
- the flight path uses the same.

**Unrestricted** (3a):

| | before | 3a | real |
|---|---|---|---|
| eyes-on held-ball row | 0.59 | 0.36 | 0.17 |
| not-facing held-ball row | 0.61 | 0.36 | 0.36 |
| staged price P | 0.13 | 0.19 | 0.31 completion |
| staged pick risk | 0.29 | 0.19 | 0.03 |

Games: 15+ share 2.2% → 6.3%, but ints 9 → 19. The rise is on 5–15 yd throws (2 → 11), most against one-high: a safety
driving downhill on a ball in front of him was priced as carrying his backpedal.

**Restricted to a ball thrown at or beyond him** (3b, within 2 yd short of his depth, a chosen margin):
- Held-ball rows as 3a.
- **Games:**

| arm | throws | 15+ share | 15+ completion | 15+ ints | completion | ints (<5 / 5–15 / 15+) | PBU | air yd |
|---|---|---|---|---|---|---|---|---|
| off | 640 | 2.2% | 0.50 | 1 | 0.694 | 9 (6 / 2 / 1) | 66 | 5.3 |
| 3b | 682 | 7.0% | 0.60 | 2 | 0.660 | 13 (3 / 8 / 2) | 69 | 6.0 |

- **By shell:** one-high 2.1% → 7.9%, two-high 2.6% → 4.9%, zero 0% → 13% (n 30). The NFL is 13.4% overall.
- **Not explained:** completion −3.4 pt, of which the shift toward deep balls accounts for about 0.4. The 5–15 yd picks
  are 8 against 2. These are likely intermediate balls within 2 yd of a safety's depth still on the deep path.
- To trace (the picker, his role, the ball's depth against his) before a fourth form. The margin is not to be tightened
  by hand.
