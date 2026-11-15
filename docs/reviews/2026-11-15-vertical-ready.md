# What "ready" means for a vertical in the read compiler (design note, 2026-11-15)

Rules + Coaching, for Integration and the QB lane. Design only. The compiler is not changed until the QB lane says how
their window would consume it.

**The problem.**
- The compiler counts a vertical (no break) ready when he is 12 yd from his start (`read-compiler/features.ts`:
  `P.find((p) => p.x >= 12)`).
- So in the quick and quick-five game (four_verts, verts_hitch, fade_flat, the seams of seam_slant and seam_hitch) read 1
  comes about 1.0 s before "ready" (2026-11-15-concept-drops.md, misfit 1).

## What coaching says (checked against the page)

- **Gonzalez, four verticals** (via Smart Football, "Getting vertical with Dan Gonzalez"):
  - the locked seam is "timed up with a quick five-step drop (from shotgun, a quick three-steps)";
  - he throws "the moment his back foot hits", "with no hitch step";
  - the seam reader looks to the QB "as he passes by the linebacker";
  - the ball is released "well before the receiver hits the 18-22 yard mark", "typically gone in under 2.5 seconds".
- **Wilhite** ("The Number One Thing That Makes 4 Verticals Work"):
  - the QB's cue is whether the receiver defeats the collision;
  - "Overhangs will carry the vertical seam (to a degree) regardless of coverage";
  - if he doesn't defeat it, "Don't wait for the WR. Trust your eyeball and move on."
- **Marinelli, the fade** (Gridiron Strategies, "The Fade"): the QB reads the defender's position during his drop steps,
  after the receiver's escape. It picks the ball:
  - defender behind: a hole shot "with velocity";
  - even: "over the top and to the outside shoulder";
  - over the top: "with velocity and to the outside".

**So a vertical is read at the release / collision, and the ball is thrown to a spot downfield.** Nobody waits until
he is 12 yd deep.

## What the NFL does (direct measurement)

BDB 2025 weeks 1–2, non-PA drop-backs, the targeted receiver's `routeRan`, at `pass_forward`:

| route | n | throw time p25 / 50 / 75 (s) | receiver depth past the line at release p25 / 50 / 75 (yd) | air yards p50 |
|---|---|---|---|---|
| GO | 168 | 2.2 / 2.6 / 3.0 | 6.2 / 9.2 / 13.1 | 22 |
| POST | 59 | 2.4 / 2.8 / 3.2 | 8.8 / 10.6 / 14.4 | 16 |
| CORNER | 34 | 2.7 / 2.8 / 3.3 | 9.6 / 12.5 / 14.6 | 19 |

- Most NFL go balls leave before the receiver is 12 yd past the line (median 9.2), and arrive about 22 yd downfield.
- This is a direct measurement (where he is when the ball leaves), so it is strong evidence.

## Proposal: two times for a vertical, with the forecast between them

1. **Readable:** when the decision can be made. That is when the receiver has passed the collision point (the release won
   or lost against press, past the overhang / linebacker on a seam) and the defender's leverage and the safety's
   depth can be seen.
   - This is the beat the plan's rhythm should test the vertical against.
   - It is a release event, not a depth: about the collision depth (5–7 yd for a seam past the overhang; the release
     for a pressed outside fade). It comes from his route's own release, or the defender he passes.
2. **Arrival:** where and when the ball should meet him. The landmark downfield is 18–22 yd for the seam (Gonzalez),
   and the NFL's median air yards for a GO is 22.
   - This is not a readiness test. It is where the throw is aimed.
3. **Between them, the QB's forecast prices the throw.** At the readable beat he values the throw to the arrival point,
   from his own forecast of the receiver and his picture of the defender's leverage and the safety. That is the window's
   job (the QB lane's).

## What the QB lane needs to say before the compiler changes

- Whether their window takes a "readable" time per read, and an aim point, or only one "ready".
- If only one: the readable time is the one their beats should be tested against.
- Whether the readable event should be the receiver passing the collision in his own route (geometric) or in the QB's
  picture of the defender (perception). Coaching's cue is what the QB sees, so the second.

## The same question: mesh's corner (2026-11-15)

- In our mesh (corner, mesh, swing) the corner is the first read, read during the drop and decided by its last step,
  with no dwell.
  - "As he takes his five step drop, his eyes go to that corner route... Look at the area he is going".
  - "If that grass is open he throws the ball on his 5th... If the Z is covered or there is a safety sitting in that
    grass, he resets and looks the mesh point".
  - The named error: "They do not read the first route in their progression during their drop" (Win With The Pass,
    Mesh; checked against the page).
- It is not a pre-snap alert: pre-snap he only picks which corner. So it stays on the set (n0), the crossers in one look
  on the reset (n1).
- What it waits on is this note's contract. Readable is the grass (a safety in the corner's landing area, in his picture
  during the drop); the aim point is the landing area about 20 yd past the break.
- With QB_FOOTWORK the corner is thrown 0 of 192, because his window judges it by the break (ready about 2.7 s), not by
  the grass.

## Open

- The collision depth for a seam against each front: the overhang's depth, not a constant.
- Outside fades against off coverage: the escape is the defender turning his hips (Marinelli), not a contact.
