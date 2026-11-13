# Coverage judgment and pocket mechanics

Newest implementation: [fundamentals and contact foundation](fundamentals-and-contact-foundation.md).
It repairs contact-frame/ownership defects and measures pocket improvements
alongside passing and run regressions. Its results supersede this baseline
for current source; this file retains the earlier coverage evidence.

Follow-up to `8ffbc24` on `claude/engine-priorities`. Read this before the
older [coverage-engine handoff](coverage-engine-and-playbook-depth.md).
The current user priority is coverage mechanics and trench physics; a full
QB footwork, throwing-base and pressure-memory model is later work. PR #1
remains separate and its tackle changes still require reconciliation.

This improves underlying decisions and contact, but does **not** establish
NFL realism. Passing yards, interceptions, sacks and some rotating
coverages remain outside the reference ranges. The paired measurements,
source hashes and commands are in
[`data/reviews/coverage-judgment/`](../../../data/reviews/coverage-judgment).

## What was wrong

1. **A visible plant did not adequately correct a stale route image.**
   Perception projected the old receiver position forward at constant
   velocity. Route observation recognized braking, but did not correct that
   existing projection over the image's age. A defender could keep gaining
   depth after a curl stopped. Observation now uses measured deceleration to
   correct the projection, with confidence, physical braking limits and a
   stop bound. An unchanged stem never invents a break or acceleration.
2. **Several techniques confused gaze with running posture.** The new wall
   always faced the QB, so a carrying defender stayed under the backpedal
   cap. Walls now turn when the seam consumes their cushion during the
   physical hip flip; traps drive to the receiver; robbers open to carry a
   crossing route. Zone eyes retain the existing shoulder-glance rule.
3. **Off-man cushion and hip turns used elapsed snap time.** They now use
   observed route depth, closing speed and the time needed to turn. A player
   carrying over the top compresses his cushion on a visible stop rather
   than preserving up to four yards of empty space.
4. **A delayed release could be classified as blocking just because time
   passed.** Blocking now requires visible low pads and forward movement or
   near-contact facing an opponent. A brief fake also no longer inherits
   confirmation time after the receiver returns to the original stem.
5. **The ball defense sometimes attacked a future ground point after an
   earlier plausible receiver catch.** A reachable later point is not a
   viable interception if the ball is already likely to be caught. Defenders
   now estimate the earlier catch window from delayed receiver movement and
   the flight, then close it. They do not inspect the intended target ID.
6. **The pocket set and contact solver disagreed.** Free blockers aimed at
   clock-based set depths; contacted pairs deliberately retreated only about
   one yard/second until another fixed depth. Both now use a launch-relative
   set and a finite retreat speed from remaining set distance and footwork.
7. **Axial rush force decayed using a lateral shuffle speed.** At an ordinary
   backward-set speed, most leg drive disappeared. Its force/velocity curve
   now uses forward movement capacity and footwork. This remains a model
   assumption, not a force curve measured from tracking.
8. **Losing an anchor automatically shed a square block.** A rusher could
   be released even with his blocker still physically between him and the
   QB. Lost base now reduces resistance and permits displacement; a pass
   shed requires actual hip leverage. Bent-arm contact also preserves some
   hand extension instead of forcing every rep to chest contact.

## A small, useful model of defensive judgment

Do not model an inner monologue or add random assignment failures each tick.
Use a repeated loop: **observe → classify → apply the taught rule → assess
visible danger/help → commit briefly → move within physical limits**.

`CoverageJudgment` adds a bounded help decision after the existing coverage
rule. A deep player:

- keeps his own uncapped vertical;
- can rescue another visible vertical when a teammate appears to cap his
  original responsibility;
- can squeeze a planted short break when no visible vertical needs his roof;
- reassesses when the picture changes and can return to his original job.

A help decision survives the release: the defender keeps that technique
until he sees the flight and plays the ball, rather than snapping back to
the nominal assignment at the instant the QB throws.

He estimates help from delayed teammate position and movement, never that
teammate's hidden assignment. Discipline affects how loosely he trusts that
help; stable personal judgment error and focus make the estimate imperfect.
Recognition/focus, observed QB orientation and a confirmed break affect
whether he drives the short window. This can create a sensible rescue or an
overconfident mistake without an outcome script. The rule wrapper exposes
the current job, help reason and job history for diagnostics.

This is deliberately bounded. It is not a universal route-jump boost, a
random decision to abandon a man, or knowledge of the QB's intended target.
There is no new interception probability. The engine already intercepts too
often; the appropriate goal is a better mechanism and distribution of
mistakes, not more interceptions.

The existing coaching research supports the distinctions: MOD corners
release short routes to find the next vertical; match hooks cut crossers;
Palms exchanges the quick out for #1 deep; safeties protect verticals before
driving breaks. See the per-player rules and disagreements in
[`coverage-terminology.md`](../../research/coverage-terminology.md), especially
sections 1, 5 and 6, and the user's
[coverage textbook](../../references/football_coverage_mechanics_textbook.pdf).
These sources describe responsibilities and techniques; they do not supply
our exact numerical thresholds.

Important simplifications remain: one body-facing value approximates hips,
separate gaze is only partly represented by zone-eye behavior, perception
has no real occlusion or attention budget, and `SnapMind` still has older
preselected lapse windows. Declaration confirmation and decision intervals
are evidence persistence/visuomotor delays, not scheduled play triggers.
Future distraction should arise from conflicting visible keys and workload.
The owner's follow-up is developed in
[visual keys and attention](visual-keys-and-attention.md): it proposes explicit
acquisition and gaze for both teams, records existing unrestricted/hidden-state
reads, and sets out staged integration. It is a design, not a shipped layer.

## Measurements

The coverage panel fixes three rosters, 2x2/3x1, both flips, six concepts,
six coverage calls and three repetitions: **1,296 requested snaps per
revision**. It includes releases, catches and predetermined receiver traces.
Calls can apply their built-in trips checks. Requested calls are not always
the resolved coverage. Outcomes change RNG consumption and decisions, so
paired seeds hold the setup fixed, not every subsequent random draw.

| Controlled panel | `8ffbc24` | This change |
|---|---:|---:|
| Separation at completed catch | 3.23 yd | 2.88 yd |
| Engine catch-contest separation | 3.22 yd | 2.92 yd |
| Tight catch-contest opportunities | 4.67% | 6.52% |
| Yards per completion | 16.44 | 15.53 |
| YAC per completion | 8.99 | 8.51 |
| 20+ yd completions / attempts | 14.65% | 12.14% |
| Interceptions | 70 / 1,229 attempts | 81 / 1,153 attempts |

The improvement is uneven. Cover 1 YAC fell from 7.12 to 4.99 and Cloud
from 12.69 to 11.25. Buzz **regressed** from 9.91 to 12.38; Cover 9 YAC
also rose. Do not call the rotations solved. The full 26-call matrix is
retained alongside the focused panel to show holes outside these six calls.

Across **32 games, seed 7, four leagues**, the guard panel gives:

| Metric | `8ffbc24` | This change |
|---|---:|---:|
| Points / team-game | 35.13 | 31.94 |
| Completion rate | 65.38% | 63.18% |
| Yards / attempt | 9.50 | 8.95 |
| YAC / reception | 7.03 | 6.58 |
| 20+ yd completions / attempts | 12.15% | 11.67% |
| Engine catch-contest separation | 3.53 yd | 3.51 yd |
| Tight catch-contest opportunities | 5.19% | 6.19% |
| Sack rate | 6.69% | **8.27%** |
| Interception rate | 5.22% | **5.39%** |
| Time to throw | 2.52 s | 2.44 s |
| Scramble rate | 5.59% | **8.12%** |

These are deterministic panels, not confidence intervals or isolated causal
effects. The league ranges in the calibration logs matter. Reduced scoring
does not establish better drive structure; the drive and error-budget runs
are saved separately. Completion rate is plausible, but passing efficiency,
interceptions, sack timing and QB responses to pressure remain problematic.

The drive check is 14.56 → 14.67 drives/team-game, 4.71 → 4.62 plays/drive,
and 2.32 → 2.07 offensive points/drive. The NFL references
are about 10.5 drives, 5.7 plays and 2.00 points/drive. The fixed own-25
drive model narrows its total gap from +0.16 to +0.05 points/drive, but this
conceals opposing errors: the completed-yard component's Shapley share
only falls from **+0.494 to +0.478**, while the sack penalty grows from −0.046
to −0.132 and the interception penalty from −0.184 to −0.190. Passing-yard
shape by game state remains the largest positive error. This is why lower
scoring cannot be used to declare the coverage work finished.

## Pocket measurement definitions matter

The old "attached pressure" comparison mixed engine active engagements with
the NFL's geometric attachment proxy. `pocket-anatomy.ts` now reports both.
The NFL number is a **listed blocker within 1.5 yd**, not a block-state
label. Simulation uses declared matchups and contacts seen so far as a proxy
for those PFF labels; this is a material limitation.

Both sides scan all defenders within two yards at 10 Hz from 0.5 s through
the outcome frame, capped at 4.5 s, and report proximity strictly before the
outcome separately. Shape slices precede release/sack/scramble/fumble.
The primary simulation cohort excludes boots and scrambles, corresponding
approximately to the NFL traditional-dropback cohort. The NFL has only two
tracking weeks and uses the football's snap center as LOS; simulation uses
its line coordinate. NFL play-by-play LOS differs by a median 0.34 yd.

**16 games, seed 7, two leagues:** 1,228 baseline and 1,191 revised
traditional dropbacks. The samples at 2.0 s are 856 and 850 surviving plays;
at 2.5 s, 488 and 452. Interior-rep counts are recorded separately.

| Traditional-dropback anatomy | `8ffbc24` | This change | NFL sample |
|---|---:|---:|---:|
| Mean OL depth, 2.0 s | 2.31 yd | 3.47 yd | 3.67 yd |
| Mean OL depth, 2.5 s | 2.80 yd | 4.47 yd | 4.48 yd |
| Mean QB depth, 2.0 s | 7.46 yd | 7.43 yd | 7.31 yd |
| Mean interior blocker depth, 2.0 s | 2.01 yd | 3.16 yd | 3.18 yd |
| Mean interior blocker/rusher distance, 2.0 s | 0.73 yd | 0.94 yd | 0.85 yd |
| First proximity with listed blocker nearby | 12.64% | 52.67% | 76.1% |
| First proximity with active engine engagement | 7.43% | 46.91% | unavailable |
| Any attached proximity / dropbacks | 3.83% | 22.59% | 21.7% |
| Any free proximity / dropbacks | 20.03% | 20.82% | 12.0% |
| Any 2-yd proximity / dropbacks | 21.91% | 39.38% | 27.3% |
| Proximity strictly before the outcome | 18.32% | 35.35% | 21.6% |
| Median first proximity | 2.2 s | 2.4 s | 2.6 s |
| Mean tackle width, 2.5 s | 6.58 yd | **4.20 yd** | 6.04 yd |

The added proximity is mostly attached: first attached proximity accounts
for 2.77% → 20.74% of dropbacks, compared with about 20.7% in the NFL.
First free proximity remains about 19.1% → 18.6%, much higher than the NFL's
about 6.5%. Thus removing excess push to force the total rate down would
hide a distinct problem: too many early free rush wins. Ever-attached and
ever-free shares can overlap. Improved depth alone is also insufficient:
the pocket becomes **too narrow**, and attachment at first proximity still
lags the reference. The contact model and its thresholds remain approximate.

The same 16-game anatomy contains 84 → 110 sacks, with median snap-to-sack
time **2.60 → 2.65 s**. The stored end-time cap is 4.5 s and is above these
medians. The older, broader NFL sack reference is about 4.25 s; the modest
timing change has not solved early sacks.

The protection planner still uses shared current QB geometry rather than a
full estimate of the designed launch point, teammate communication or a
separate visual attention model. That limitation matters during unexpected
QB movement and belongs with the later pocket/QB work.

Also correct the older handoff: **3.9 and 4.7 yd are rounded medians**, not
mean OL depths. The NFL means are **3.67 at 2.0 s and 4.48 at 2.5 s**.
Retreat since snap includes voluntary setting. It is not all force-induced
push. Later time slices select only still-live plays; consult sample counts.

## What to do next

1. **Finish the rotation anatomy, especially Buzz.** Track the rotating
   safety's local receiver picture, the hook/apex handoff, cushion and
   velocity at each declaration, release and catch. Separate quick throws
   into an unfinished rotation from a late incorrect exchange and a sound
   coverage followed by poor pursuit. Do not simply speed up every safety.
2. **Separate contact-normal force from desired rush direction.** The pass
   pair's drive axis points toward the QB, which tends to pull all lanes
   toward the pocket center as push increases. Model the direction bodies
   can actually transmit force, steering at the hands, edge-lane discipline
   and the tackle riding an outside win past the launch point. Preserve
   momentum and finite repositioning. Validate width as well as depth.
3. **Decompose interceptions and sacks under pressure.** Save direct route
   jumps versus drops/deflections, wrong reads versus bad placement, first
   proximity → throw/sack, and sacks with blockers still nearby. A reasonable
   overall pressure rate can coexist with a bad response to pressure. Do
   not lower defensive ball skills to hide a bad throw/window model.
4. **Add side concepts and coordinated pressures as separate changes.** Use
   the saved NFL route-pair and rush-count references. Build route spacing,
   reads and protection answers together; mug bluffs and stunts need visible
   identification and exchanges, not instant reassignment from hidden jobs.
5. **Later: the requested QB mechanics model.** Track stable base, front/back
   foot loading, launch orientation, escape versus reset, and accumulated
   pressure by side. Visible encroachment changes feet and available throws;
   repeated disruption changes confidence and timing. Establish intermediate
   measurements before changing accuracy or turnover outcomes. This pass
   intentionally does not build that full model.

Validation: **187 tests**, typecheck and build pass. New regression cases
cover continuous fake confirmation, a delayed non-blocking release, keeping
an uncapped responsibility, rescue and recovery from visible help, seam hip
turns, stale braking predictions, earlier receiver catch windows, launch
relative sets, and contact surviving loss of anchor. The six-game film
library is refreshed with **812 clips**, stable play IDs and the new source
hash. All **18 browser checks** pass, including grouping/filtering, exact ID
search, copied references, offline operation and mobile playback. The
populated `viewer/film-room.html` and `viewer/film-room.zip` travel with the
branch; the template is not the playable film library.
