# Pressure, protection contact, and compressed coverage

This follow-up starts at `f0ee834` on `claude/engine-priorities`. The user
flagged stationary edge rushes, safeties retreating beyond the end line,
open-field Cover 2 rules near the goal line, and interception mechanisms.
Evidence is in `data/reviews/red-zone-pocket/`; the populated film room and
ZIP are refreshed on this branch. The source hashes and commands are in
that directory's manifest. PR #1 and `src/sim/tackle.ts` were not changed.

## What pressure means here

There were three different definitions, and the calibration table was
incorrectly comparing the first with an NFL tracking target:

| Measure | Definition | Use |
| --- | --- | --- |
| QB sensed pressure | Estimated arrival <0.7 s and actual distance <2.5 yd; attached-block resistance adds arrival time | Internal QB perception and decisions |
| Tracking pressure proxy | Any defender center within 2 yd, from 0.5 s until throw, throwaway, sack or scramble; attached defenders count | `sack-anatomy.ts`, 10 Hz; same geometric proxy as our NFL extraction |
| Old trench lab | An **unblocked** defender within 2 yd of a held QB | Free-rush pressure only; not the NFL proxy |

`calibrate.ts` now labels the first **QB sensed pressure (internal)** and
does not assign it an NFL target. The new `dropback-motion-anatomy.ts`
observes live bodies at 20 Hz and separates attached/free pressure,
pressure duration, and blocker displacement after contact. The forced-hold
`pocket-motion-lab.ts` additionally measures movement and speed after
contact and physical sheds by 2.5 s. These mechanics measures have no
independently measured NFL target yet. Ordinary pass-set depth and subsequent
blocker displacement are reported separately.

The 10 Hz proxy is only a proximity measure. It does not distinguish a
contained outside rusher from a threat with an open path to the QB, and it
does not measure hurries, clean throwing lanes or pocket area. Attached/free
pressure can overlap. The 20 Hz observer excludes downed defenders and
can see brief proximity that the recorded frames miss; do not mix its
percentages with the 10 Hz series.

## Protection mechanics changed

Previously, the engaged DL translated only toward the QB while the OL was
repositioned around him. Incoming lateral momentum disappeared, foot
mirroring could cancel hip motion instantly, and a speed-rush label left
the rusher at 45% forward force throughout the rep. The approach plan was
also rerolled at contact. These mechanisms explain the abrupt stop the
user observed in #97's speed rush.

Pass contact now retains the pair's incoming, mass-weighted world velocity
and relative lateral velocity. Both bodies move about their center of mass;
repositioning is finite and does not invent pair translation. Relative hip
motion must be arrested with finite foot acceleration. A blocked speed
rusher can plant and drive instead of permanently losing forward power.
The first contact technique follows the approach plan; later counters still
respond to the rep.

The axial battle now integrates force over pair mass rather than assigning
a minimum retreat speed. A square, planted blocker has a resistance
capacity. Transferring weight to another step, mirroring laterally, losing
leverage/base and fatigue reduce that capacity. The rusher's drive also
shares effort with lateral work and declines with leg-extension speed.
When the load exceeds the anchor, the pair accelerates backward; the OL
loses base and tries to replant. A strong anchor can stop a weaker drive.
The existing helper-contact/support rules still limit double-team force.

A requested angular win must become actual field leverage before releasing
the block. A pass-rush shed retains momentum rather than launching the DL
at a new fixed speed. Pass protection also remains pass protection during
the brief follow-through after release; a ball in flight previously made
the engagement convert immediately to a run block.

This is a simplified footwork/contact model, not measured muscle forces or
an articulated-body solver. The power-to-force mapping, step length and
transfer duration are modeling assumptions. Hand contests and move choices
remain stochastic. Run engagement movement and the tackle solver retain
their prior implementation.

## The two original film reports

The original clips are preserved in `flagged-before.json`, from the
`f0ee834` film. They have different meanings from the same IDs in a newly
generated game, because outcome changes alter later game situations.

- **Original G1-P078**, seed 7, Q2 1:38: Comebacks, 1st & goal, TD against
  Under Cover 2. The safety reached x=126.3, more than six yards beyond the
  end line. Alignment/landmarks had no remaining-field constraint, and
  route-tracking velocity could keep driving backward.
- **Original G2-P088**, seed 8, Q2 0:33: Comebacks vs. Wide-9 Cover 1.
  #97 got hands on him and stalled outside. Its pre-contact rush arc was
  discarded by the engaged movement model described above.

Planned secondary depth now compresses with distance to the goal line.
Coverage commands reserve braking distance at end lines/sidelines through
the normal movement integrator; they do not clamp positions or velocity.
External momentum can still carry a defender out, followed by recovery.
Low red-zone Cover 2 corners sink under #1 with outside leverage instead
of vacating him for an open-field flat landmark. A second receiver actually
entering the flat can still pull the corner off. Safeties can drive on a
visible break in compressed space, including spot calls.

Cover 2 remains available. It can be played in the red zone with compressed
distribution rules; banning it would hide the spacing defect. The uploaded
[coverage textbook](../../references/football_coverage_mechanics_textbook.pdf),
especially chapters 4, 6 and 21, supplied useful footwork/distribution
proposals. It is generated reference material, not independently verified
coaching authority. The implementation uses observed movement and receiver
numbering, without reading the hidden route script.

## Evidence

The fixed protection matrix contains 288 reps across four rosters and
Over, Under and Wide-9, with a QB holding to five seconds. The field-spacing
matrix contains 864 reps across three rosters, three concepts, four
coverage techniques and LOS x=40/104/108. Requested calls and seeds are
paired; pressure changes can end a fixed hold earlier. Consult sample counts
before comparing late movement measurements.

| Controlled measure | Before | After |
| --- | ---: | ---: |
| Attached DL travel in first 0.75 s, surviving contacts | 0.73 yd | 1.07 yd |
| Physical shed wins by 2.5 s, per rusher | 8.8% | 12.9% |
| OL depth at 2.5 s, observed survivors | 2.46 yd | 2.79 yd |
| Pressure by 2.5 s, forced holds | 11.1% | 36.5% |
| Safety outside plays, LOS104 / 288 | 235 | 1 |
| Safety outside plays, LOS108 / 288 | 288 | 0 |
| Corner-to-#1 distance at 2 s, LOS104 | 3.92 yd | 2.04 yd |

The remaining LOS104 excursion reaches x=120.145 for 0.15 seconds. Field
awareness is finite braking, not a hard wall. The isolated test explicitly
allows momentum to carry a DB out and requires recovery. The corner-distance
measure is a fixed distribution check, not separation at an NFL catch.

| Full-game anatomy, 16 games / two leagues | Before | After | NFL reference |
| --- | ---: | ---: | ---: |
| Tracking pressure, 10 Hz | 16.5% | 23.9% | 32.5% |
| Time to throw, mean | 2.59 s | 2.54 s | 2.75 s |
| Time to sack, median | 3.10 s | 2.60 s | 4.25 s |
| Pressure to resolution, p90 | 0.60 s | 0.50 s | ~2.5 s |
| Sack rate | 5.07% | 6.93% | 6.24% |

The separate 20 Hz live observer measures attached pressure on **1.54% →
3.46%** of dropbacks and surviving-block displacement at resolution of
**1.79 → 2.03 yd**. Thus the gain still comes largely from free rushes.
More pressure and a closer sack rate do **not** validate pocket realism:
sacks are earlier and pressure still resolves too quickly.

The 32-game/four-league guard is mixed: sack rate 5.69% → 6.79%, catch-contest
separation 3.94 → 3.78 yd, INT rate 4.79% → 4.37%. YPA rises 9.14 → 9.26 and
YAC rises 5.88 → 6.44; these passing problems remain. Full-game seeds/rosters
are paired, but subsequent calls diverge when outcomes change. The guard is
a regression check, not an isolated causal estimate.

## Interceptions and film references

A physical defect was fixed: a nearby defender could win a contested
interception without being inside his own ball reach/height envelope.
Playing through receiver hands and actually possessing the ball now have
separate requirements. Tests exercise both an unreachable contest and a
reachable interception; no global interception probability was reduced.

The live guard's interception audit records observable predecessors, not
QB-error causes: before, 51 INT = 9 after drops, 14 after PBUs, 28 direct;
after, 57 = 8 after drops, 17 after PBUs, 32 direct. DL interceptions rise
from 1 to 7 in this panel. Release awareness, occupied hands and passing
trajectory near rushers need further investigation. A correct coverage
family flag or a pressure flag alone cannot explain a decision.

The refreshed film has **821 clips, 27 concepts, six games**, seeds 7–12.
Every log entry has an ID such as `G2-P088`; IDs appear on the clip, list and
field and are searchable. **Copy play reference** pauses playback and copies
the source-content version, ID, game seed, situation, calls and timestamp.
The version is essential when comparing different film builds. If clipboard
access is unavailable, the reference remains selectable. The result filter
and event jumps distinguish two-yard proximity from QB-sensed pressure.

Validation: 167 tests, TypeScript build/typecheck, and 18 Chromium film-room
checks, including populated playback, all grouping/filter modes, precise ID
search, copy fallback, pressure filtering, mobile layout and no JS errors.

## Next investigation

1. **Attached rush progression:** separate inward drive, outside rides and
   late counters by rep geometry. Validate OL/DL displacement and trajectory
   against tracking before adjusting force coefficients. Helpers and pair
   footwork are approximations, so inspect multi-body contacts explicitly.
2. **Pressure survival:** inspect how the QB senses a moving block, maintains
   throwing space and steps away from contact. Reduce immediate sack
   conversion through legitimate movement/protection, not outcome rolls or
   a blanket delay to every throw.
3. **Yards per completion:** field-zone coverage, receiver distribution and
   post-catch containment remain major errors. Catch separation is still
   high; YAC worsened in the guard. Run the error budget and event-specific
   coverage anatomy before treating the sack-rate improvement as a passing
   calibration success.
4. **Flight/interception anatomy:** track release cues and available hands
   for rushers, actual ball envelopes and tip/drop trajectories; investigate
   the increased DL interception share without hiding it with a lower INT
   coefficient.
