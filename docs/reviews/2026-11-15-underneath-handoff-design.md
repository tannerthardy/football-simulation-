# UNDER_PASS: the underneath layer's hand-offs (design, before build)

Defense lane, task 126 part (b); the second attempt at the crosser pass-off after Coverage's CROSS_PASS (#757,
coverage/C14-cross-pass, attempt 1 of 2, off). Experimental flag `UNDER_PASS` (off). Nothing is built yet.

## What is wrong (staged, engine-69 defaults)

On flood, drive and mesh the in-breaking route at 12-15 yd is caught between the deep defender and an underneath layer
standing at 4-6 yd. At dig throws the hook defender on the dig's side was at 4.0 / 6.1 / 7.3 yd (p25/p50/p75; landmark
10) and 13.8 yd laterally from the dig (median), and the curl-flat at 4.0 / 4.8 / 9.2 yd (landmark 8.5). Three
mechanisms put them there:

1. **The hook carries the crosser across the field.** He walls the shallow (`cross-wall`) and then runs with it
   (`open-carry-cross`) out of his zone.
2. **ZONE_SETTLE freezes him where the carry left him.** At the QB's seen set, `settled()` caps his target at his
   current depth (min(target, current)), so a hook dragged to 5.5 yd settles at 5.5.
3. **The curl-flat starts in the match carry's man pedal.** In match calls (most game calls: pattern-match calls
   always, the rest at the coach's matchRate, 0.3-0.9) he spends his first 1.5-2 s in `man-pedal` on No. 2 at
   4.7-5.4 yd (76% at 0.5 s, 73% at 1.0 s), holding an off-man cushion rather than dropping and reading No. 2. CURL_SINK
   (#784) repairs the later back-to-the-flat branch but moves little for this reason.

## What attempt 1 did, and why this one differs

CROSS_PASS triggered on the release read `in` / `under` with a path more across than up (enter at 45 deg, exit back
under 37 deg or a yard above the level) and passed the crosser on. In quarters the over got tighter, not looser: the
HNFL-094 carry took back what CUT_WALL walled, and CROSS_OVER's over stayed at 7 yd or shallower until about 2.9 s
(Coverage's notes). It lacked three things, which this design adds:

- **After passing he sinks under the next threat.** Attempt 1 released the crosser but left the passer at the
  crosser's level; nothing told him to regain depth and find the next route into his zone (the dig, the over).
- **The settle does not freeze a man who was pulled down.** ZONE_SETTLE's freeze is right for a defender who reached his
  drop depth and wrong for one who was dragged shallow.
- **The pass-off is a committed decision.** Other carry branches (the HNFL-094 carry) re-grabbed the crosser; here the
  passed crosser stays passed until a perceived change clears a margin.

## What is taught (sources: docs/research/coverage-terminology.md on coverage/C14-cross-pass)

- **Under.** A receiver who breaks inside and short in his first 5 yd is "under": the defender calls "Under!" and zones
  off (Soran). Fire-zone apex: he "passes #2 to the hook" (Saban). Stubbie and Mable: "man on #2 except under". The
  Cover 4 Mike "walls crossers" (Bowen). Tampa: "Mike is walling #3 to #2" (Kou). "Patty": the call that tells the LB he
  has the back to the flat.
- **Wall, then pass.** The underneath defender collisions or walls a crosser so he cannot cross his face cleanly, then
  passes him to the next defender in the direction he is going, and gains depth and width back into his own zone, eyes
  on the QB, for the next route coming into it.
- **The curl-flat reads No. 2 as he drops.** No. 2 vertical: wall and carry to about 10 yd. No. 2 out: to the flat. No. 2
  in or under: call it, pass him to the hook, and get under No. 1 (curl), then to the flat on No. 3. He does not hold at
  alignment depth waiting for No. 2.

## Design (flag off)

1. **Trigger (perceived, with margins).** An underneath zone defender (hook, curl-flat, apex) who is walling or
   carrying a receiver sees that receiver's path run more across than up (attempt 1's enter at 45 deg, exit under 37
   deg) and leave his zone laterally: past his landmark's half-width plus a margin on the far side (enter), back
   inside it by a margin to undo (exit). Release read and path are his own sighting, delayed.
2. **The call.** On the trigger he calls it ("Under" / "crosser"). The call reaches teammates on the crosser's side after
   a delay; whether it is made in time scales with his playRecognition. A teammate who hears it, or who sees the crosser
   enter his own zone, owns him. Neither knows the other's assignment; each knows only what he sees and hears. A teammate
   already carrying his own receiver does not take him: the crosser is then passed to nobody.
3. **After the pass: sink under the next threat.** The passer drops back toward his landmark's depth (at the zone drop
   pace) and width, eyes on the QB, and plays the next receiver to enter his zone (the dig, the over) by the zone rules
   already there. He does not re-take the passed crosser unless that receiver comes back into his zone past the exit
   margin, or the ball is thrown to him.
4. **ZONE_SETTLE for a man pulled down.** At the QB's set a defender who is short of his drop depth by more than a margin
   (his own position against his landmark, which he knows) keeps gaining depth toward it while he reads the QB; one at
   depth settles as now. Enter at 2 yd short, exit at 1 yd (a stated choice, not fitted).
5. **The curl-flat's first second in a match call.** Before No. 2's release is read he drops toward his curl window at
   the zone drop pace with his eyes on No. 2, instead of the man pedal; the release read then sends him to the carry
   (vertical), the flat (out) or the call and curl (under), as above.

## Cost, and what should still win

A passed crosser is the next defender's. When that defender is occupied, or the call is late, the crosser is free short:
that is what drive and mesh are designed to do against zone, and it should keep happening. Drive's shallow and mesh's
crossers should gain their 4-7 yd underneath when the layer sinks; flood's flat should still be open when the curl-flat
is high. The cost is visible in the passer's leftover: the shallow caught in front of him. Staged gates: dig and over
completion and yards with the layer's depth at the throw; shallow and mesh crosser completion and YAC; flat throws; the
crosser passed to nobody (rate, and its yards).

## Witnesses (not targets)

- The NFL depth at the throw of the nearest non-deep defender inside a 10-15 yd in-breaking route with a shallow cross
  under it (direct measurement; Tools or their operators).
- Who takes the crosser by seat (Coverage's CROSS_OVER role split, fe14536e) and the nearest-to-the-over distance (NFL
  2.8 / 3.1 / 3.1 yd at 2.0 / 2.5 / 3.0 s).
- The curl-flat's depth at 1.0 and 1.5 s after the snap on pass plays (NFL against ours), by No. 2's release.

Stated choices: the call's delay and its link to playRecognition; ZONE_SETTLE's 2 / 1 yd margins; the lateral margin on
the zone's half-width. Each is named in the code beside its use.

## Built so far: SETTLE_DEPTH (part ii), measured

Integration's ruling split the work: flag 1, depth, is (ii) and (v); flag 2, the hand-off, is (i), (iii) and (iv).
Sourcing (v) per coverage moved part of it: in match Cover 3 the apex is taught "man on #2 unless under" with a square
"scootch" back for three steps (Rip/Liz, USA Football and Soran), which our pre-release man pedal approximates when No.
2 goes vertical (staged: 984 cases, `man-pedal` at 5.1-5.5 yd through 1.5 s, 6.9 yd at 2.0 s). The case it gets wrong is
No. 2 under (38 cases): he carries No. 2 inside at 3.6 yd (`open-carry-seam` 63% at 2.0 s) where he is taught to call
"Under", zone to the curl and rob No. 1. That is a hand-off and moves to flag 2. (v) for the spot and quarters seats
waits for the NFL apex row (`underneath.py` part B).

`SETTLE_DEPTH` staged gates (`scripts/diag/defense/under-gates.mts 2`: every pass concept but screens against cover2,
cover3, cover3_match, cover3_seam, cover4, cover6; three formations; seeds 1-2, both flips; off → on):

- All throws 2054 → 2044: completion 0.703 → 0.706, 10.35 → 10.28 yd per throw.
- Depth at the throw (p50): hook 8.1 → 8.3, curl-flat 7.0 → 7.1.
- In-breakers (dig, in): 168 → 153 throws, completion 0.82 → 0.82, 18.8 → 17.9 yd per throw; the underneath defender on
  their side at the throw 7.6 → 8.5 yd.
- Its costs, the quick game underneath: hitch / curl 0.75 → 0.75 (5.4 → 5.4 yd), slant 0.67 → 0.68 (10.0 → 9.8), flat
  0.62 → 0.63 (8.3 → 8.2), out 0.60 → 0.60 (8.4 → 8.5), short in unchanged. Shallow and mesh crossers 0.89 → 0.89.
- It acts only after his own pass read and the QB's seen set, so the run fit is not reached.

The fix does what it says and moves the hook under the in-breaker by a yard; the QB throws there less. The larger part
of the dig and crosser hole is in the carry branches (the hook's `open-carry-cross`, the curl-flat's carry of an under
No. 2), which flag 2 addresses.
