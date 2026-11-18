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
