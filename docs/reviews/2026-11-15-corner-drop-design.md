# CORNER_DROP: a deep zone corner drops on the snap (design, before build)

Defense lane, task 125. Experimental flag `CORNER_DROP` (off). It builds on #779 (CARRY_POSTURE, DIR_CAP), whose
1.5-2.5 s carry starts from the depth this delivers.

## What is wrong (ours, engine-68, DIR_CAP=1, 8 games)

Deep zone corners (deep_third_*, quarter_*) on zone-call pass plays: first request above 1 yd/s at 0.70 s (median),
achieved 0.47 / 0.65 / 0.85 / 1.45 yd/s at 0.25 / 0.5 / 0.75 / 1.0 s; 65-68% in `man-pedal` (the match carry's
pre-release pedal: hold the off-man cushion over the receiver, give ground only as the stem comes), about 30% in
`deep-read`; run/pass read 'unsure' until about 1.15 s. Deep safeties request a sprint at 0.15 s and are at 3.4 yd/s by
1.0 s. The NFL pair row (CB and S together) is 2.3 yd/s at 1.0 s; the CB/S split is with Tools.

Two causes:
1. Before the receiver has released, a zone-call corner plays the man pedal of the match carry, which is man technique.
2. His run/pass key is his receiver alone (recognition KEYS.CB: wr 1.4, ol 0.2, qb 0.3); a receiver counts as a pass
   cue only once seen above 3.5 yd/s, and deep players read the line less clearly. The safety keys the line and the
   QB and reads pass in about 0.55 s.

Man-call corners show the same first second (man-pedal 97-99% to 0.75 s); that is close to taught for an off-man
corner (pedal, hold cushion until the stem comes), so they are out of scope.

## What is taught

- The Cover-3 corner clears a quick run/pass key (the tight end, near the line), then sinks with a bail to the outside
  third; against the three-step game he holds flat-footed read steps before he gets into his pedal (Bleacher Report, NFL
  101: Introducing the Basics of Cover 3; USA Football, How to play Cover 3 behind a Simulated Pressure).
- The bail opens the hips at the snap (Steelers Depot, Football 101: Bail Technique).

## Design (flag off)

1. **Scope.** A corner in a zone call in a deep third (deep_third_*), before his receiver's release is in his picture.
   Quarters corners are taught differently (off #1, eyes inside to #2, or on #1's stem in MOD/MEG, in a pedal, matching
   #1 vertical; no bail to a landmark on the snap): out of scope until their own first second is measured and sourced.
   Man calls, underneath zones and safeties are unchanged.
2. **The drop on the snap.** From his snap reaction he runs his zone drop toward his landmark at the deep zone drop's
   pace (zs, as the deep safeties): in a bail seat with the bail posture (CARRY_POSTURE's 45 deg, head on the QB), else
   in a pedal; he does not hold the man cushion. The match carry (ManCoverage) takes over once he sees the release, as
   now.
3. **The quick game.** The flat-footed read is the existing quick-game response, not a timer: the QB's seen set and arm
   (release belief) and the ball cue already pull him off his drop. He gives up a few yards of hold against a quick hitch
   or slant; that is the bail's known cost and the coached trade.
4. **His run/pass key.** As taught he clears a near-line key first (the end man on the line or tight end, through to the
   QB, his receiver in his vision): under the flag a deep-third corner's recognition weights are the safety's (line 0.8,
   QB 0.6, receiver 0.7), a stated choice for that key, not a fit. And a receiver releasing vertically off the line is pass
   evidence at any pace (seen upfield speed over 1 yd/s, scaled to full at 3.5), where before only a receiver seen above
   3.5 yd/s counted: that threshold was the fault.
5. **Run and play-action, honestly.** A deep-third corner on the bail is late to the run: force and alley support come
   from the safety and the curl-flat, and he fits third. Against play-action, a line that fires out reads run to him as
   it does to the safety; his drop has already started, so he gives up a step of downhill run support, not the deep third.
   Stated costs, measured: outside runs to his side (yards, his run-fit time to first contact), play-action deep
   completions.

Stated choices: the key weights (the safety's) and the release cue's scale (1 yd/s on, full at 3.5); the drop pace is the
deep zone drop's and the bail angle CARRY_POSTURE's. Needs CARRY_POSTURE=1 and DIR_CAP=1.

## Witness, not targets

The NFL corner's first second (Tools; speed at 0.25-1.0 s, time past 1 yd/s, angle at 0.5 / 1.0 s, by family); ours
the same; the carry cushion at 1.5 s (NFL 5.0); last_defender (speed at the catch 4.5, NFL 5.8); go throws; outside runs
to his side. If built-as-taught and the NFL corner disagree, the disagreement is reported, not fitted.

## Measured (engine-69 + CARRY_POSTURE, off → on, same seeds)

- First second, deep-third CB on zone-call passes (8 games): first request above 1 yd/s 0.70 → 0.15 s; reads pass
  1.15 → 0.60 s; achieved 1.45 → 2.16 yd/s at 1.0 s (NFL CB+S pair 2.3; CB-only row pending). Carry cushion at 1.5 s,
  stem over 8.2: 4.6 → 4.9 yd (NFL 5.0).
- last_defender (one defender ahead of the catcher): his speed at the catch 4.5 → 4.7 (NFL 5.8); closest within 1 yd
  51% → 53% (NFL 73%).
- Outside runs to his side (16 games, n 66 / 71): fits within 1.5 yd 0.55 → 0.44, median 2.25 → 2.35 s after the
  handoff; mean yards 6.15 → 4.39 (small cells, not read as a gain).
- Play-action (staged, `scripts/diag/defense/pa-corner.mts 4`: pa_post_dig, pa_shot, pa_flood against cover3,
  cover3_match, cover3_buzz, cover3_seam, cover3_cloud; four formations; 480 plays): he reads run on 5% → 48% of
  corner-plays (first at 4.8 → 0.45 s). On that read he never triggers downhill (off: 23% trigger); he slows his sink
  (median 6.6 → 0.6 yd/s over the next 0.5 s; 66% sink, 34% squat) and reads pass again by 1.5 s. Depth over the
  deepest receiver on his side 3.6 → 4.2 yd at 2.0 s and 2.1 → 3.0 yd at 2.5 s (under him at 2.5 s 0% → 4%);
  completions of 15+ yd caught on his side 94 → 85 of 864 corner-plays.
- Flag off is identical to #779 (`pa-corner.mts 2`, byte-identical output).
