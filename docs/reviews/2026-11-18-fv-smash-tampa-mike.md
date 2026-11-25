# four_verts' checkdown pick and smash's unthrown corner, on rules/tampa-mike f1a1435e

QB lane, 2026-11-18, Integration's item (iv). Diagnosis only, no build. Probe: `scripts/diag/eyes/play-trace.ts`
(one staged play, passive: the read sequence, the throw with the believed P and intRisk, the defenders within 7 yd of
the aim at the release with the QB's picture of each and the window's margin terms, the ball's flight, and the result;
`PLAY_TRACE_EV=1` adds his evaluation of every route every 0.25 s, `PLAY_TRACE_BRK=1` each route's forecast and plan
break). Roster 7, the engine's defaults on that commit; TAMPA_PIPE off and on for the Tampa 2 cells.

## The plays

| concept | coverage | formation | seed, flip | reads (s: read) | throw | result |
|---|---|---|---|---|---|---|
| four_verts | cover2_match | doubles | 2, yes | 0.05 seam, 3.35 go, 3.60 seam, 3.85 back_flat | 4.30 back_flat, P 0.72, intRisk 0.005 | **picked by CB_W** |
| four_verts | cover2_wild | doubles | 2, yes | same play (wild is the trips check) | same | **picked by CB_W** |
| four_verts | cover2_match/wild, tampa2, cover6 | trips | 2, yes | 0.05 seam, 3.20 go, 3.45 back_flat | 3.90 back_flat, P 0.54, intRisk 0.033 | incomplete |
| four_verts | tampa2, cover6 | doubles | 2, yes | 0.05 seam, 3.25 go, 3.50 seam | none | QB run, 3.6 / 6.0 yd |
| smash | cover2_match | doubles | 1, no | 0.05 corner, 2.55 hitch | 3.40 hitch, P 0.56, intRisk 0.054 | broken up |
| smash | cover2_match | doubles | 2, yes | 0.05 corner | none | sacked, -8.5 |
| smash | tampa2 | trips | 1, no | 0.05 corner, 2.45 hitch, 2.75 corner | 3.20 corner, P 0.53, nobody within 7 yd | incomplete (miss) |

TAMPA_PIPE=1 leaves the Tampa 2 rows unchanged.

## four_verts: the checkdown pick

Two things:

1. **The checkdown is thrown about two seconds after it was there.** The back in the flat was priced 0.67–0.78 with
   intRisk at most 0.003 from 1.8 s to 3.3 s. His eyes stayed on the vertical triad (the peek) until 3.35 s, because
   the peek's `close` test kept him there while any vertical was within 85% of the bar. He came to the back at 3.85 s
   and threw at 4.30 s, by which time the corner had run to the flat.
2. **The window priced the corner who picked it as 0.58 s late. He was there with the ball.**
   - At the release, CB_W was 4.9 yd from the aim, driving at 3.6 yd/s toward it, carrying the back to the flat. His
     true course reaches the last quarter of the flight path in 0.78 s, about when the ball got there. He picked it
     0.15 s before its planned arrival.
   - The QB's margin breaks down as follows:
     - his reaction (0.24 s), charged in full as if the corner had to start for the ball from rest;
     - the corner's downhill component, which his picture of the corner didn't have (seen velocity (0, -3.2) against a
       true (-0.9, -3.5), picture 0.25 s old);
     - this QB's own misjudgment of the corner, +0.22 s (`estimateError`, his decision-making).
   - Without his misjudgment the margin was +0.36 s. With QB_WINDOW_ARRIVE (item i) it is +0.06 s.
   - The corner was 4.1 yd from the back, just outside DEF_BELIEF's 4 yd "on the target" radius. Widening that radius
     to 6 yd (a diagnostic only) moved the margin by just 0.12 s. The reaction charge is the larger term.

## smash: why the corner is never thrown

1. **His eyes sit on a corner that cannot be read yet.**
   - Read 1 is the corner. It is "ready" only from its forecast break, about 3.15 s. The plan's break is 2.50 s and
     the route's own schedule is 2.27 s.
   - He stays on it for 2.45–2.55 s (the read's dwell), unready, then goes to the hitch. The hitch is covered by then
     (0.12, intRisk 0.66) because its quick window has passed. He comes back to the corner only at 2.75–3.10 s.
2. **The corner route breaks late.**
   - Release speed matches the NFL. BDB 2025 week 1, traditional non-play-action dropbacks: NFL corner routes are 7.5 yd
     from the snap line at 2.0 s and 10.9 yd at 2.5 s (n = 143). Ours are at 6.7–7.5 yd at 2.0 s.
   - Ours slow from 2.3 s, at 5.2 yd/s against the NFL's 6.8. They reach 10.4 yd only at 2.8 s, then break at about
     12.5 yd near 3.15 s, roughly 0.4–0.5 s after the NFL corner is at that depth.
   - That is the receiver lane's route timing, not the QB's. Hitch routes match (NFL 5.7 yd at 2.0 s, ours 5.3–6.0).
3. **When the corner does come ready, his price is low and rises late.**
   - cover2_match s1: 0.26 at 2.8 s, 0.42 at 3.05 s, 0.59 at 3.3 s.
   - Taught smash against a squat corner throws the corner with anticipation off the top of the drop, before the
     break. Our "ready" and the window's arrival price both wait for the break. That is item (i)'s anticipation half
     and item (ii)'s plant read on the key (the corner).
4. In seed 2 flip the corner is covered when ready (0.00): a correct no-throw. He has no hitch answer left, and is
   sacked at about 3.2 s.
5. In tampa2 trips he threw the corner open, with nobody within 7 yd, and missed it.

## What this feeds

- Item (i), the window, covers the four_verts pick's main term. The flag cuts the honest margin from 0.36 to 0.06 s on
  this play.
- Item (ii), the plant key read, puts smash's eyes on the key (the corner) at the plant instead of on an unready route.
- The receiver lane gets the smash corner's late break (12.5 yd at about 3.15 s against the NFL's depth by time).
- The peek's `close` hold (four_verts, 3.35 s on the triad while the checkdown was open from 1.8 s) is a candidate
  for the next QB item. It is not built here.
