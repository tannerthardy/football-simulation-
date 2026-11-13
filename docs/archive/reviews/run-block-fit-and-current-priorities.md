# Run-block contact fits and current engine priorities

## Status and where to start

This increment changes a small OL controller request: recover the useful
shoulder before committing to a clearly lost reach/cutoff block. It keeps the
intended displacement direction and executes through the existing movement,
support, collision and hand-force laws. It does not extend the body solver.

Watch the [12 paired clips](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/block-fit-film-room.zip), especially
the Wide Zone LT, and read the [measurements and rerun commands](../../../data/reviews/physics-world/block-fit/README.md).
Both versions already have the preceding low-base repair. All clips are live
three-second inspections, with no invented football result.

The recommendation from the broader review is to keep the reduced physics
model and spend the next increments on demonstrated request/contact failures.
Anatomical detail is not the missing prerequisite for better football.
Physics has not earned a universal final OK, but the old hand-fight fall
reversal is no longer the current reason to withhold it.

## Review across systems

| System | Current evidence | Most useful next work |
| --- | --- | --- |
| Movement and support | One World limits drive, braking, turning and balance; actual commands can still chase unsuitable landmarks. | Correct requests within those capabilities, then measure achieved motion under load. |
| Sustained hands and strikes | Achieved finite-force travel is centered; the retained hand panel has 0/9 native/refined fall or corner disagreements, with .0617 yd mean and .1817 yd maximum closest-distance error. | Keep the nonuniform refinement regressions visible. Prove a localized active-grasp/reeling oracle before modifying another force path. |
| Run blocking | Low posture now reaches physical support. A WZ cutoff landmark was about .313 yd beyond the useful drive half-plane; lost regrabs repeatedly reacquired and immediately shed. | The bounded fit repair below. Combo release, work pickup and front-specific assignment remain separate controller work. |
| Coverage | A staged deep-help decision with a quarters roster trusts a grounded corner as a deep roof and leaves its supplied primary vertical. Current perception does not carry visible grounded/rising pose. | Add a delayed visible pose cue and reject incapacitated help. Do not read hidden current body state or insert a perfect bust-prevention rule. |
| Pursuit and tackles | Actual movement limits and bounded lower attachments are shared; encounter censors and missed approach opportunities remain. | Audit achievable approach speeds and support recovery in retained normal and hard-angle cases, rather than raising agility or tackle strength. |
| Handoff, screens and motion | Physical traffic can delay exchanges; the slice lab stages motion momentum but does not install a complete presnap motion/screen package. | Keep installation and possession transfer observable before using these labs as complete concept validation. |
| QB and game management | Coverage, pressure, throw mechanics and later game decisions can magnify scores and explosives. | Separate their causes. Do not fit shared contact forces to points, completions or two games. |

The hand figures above are the retained current force-law evidence in
[strike validation](strike-force-and-slice-validation.md), not a new
measurement of every possible multi-contact interaction. The coverage witness
is a reproducible staged failure, not an estimate of its league-wide frequency.
Its actual support state is a diagnostic label, not information the defender
currently receives. The primary man directive is supplied; the witness does
not execute the full quarters assignment controller. Its stationary upright
control also loses depth, so upright alone is not proof of secure help.

## The selected repair

Only OL `reach` and `cutoff` attacks without a live joint or an unreleased
planned combination use the new fit helper. The blocker uses the delayed
observation already consumed by that attack. It is already dead-reckoned;
there is no second age extrapolation or additional vision/RNG draw.

A clearly lost observed shoulder, absolute normalized leverage at least 1.1,
asks for foot recovery instead of a fresh commitment. This reuses the existing
established-run-block leverage boundary. It does not relax actual reach,
collision, strike or shedding checks. A mistaken good read can still make a
bad physical commitment; a mistaken bad read can make the blocker hesitate.

When the nominal shoulder is beyond the intended drive half-plane, or the
observed shoulder is already lost nearby, the helper asks for arrival behind
the original drive direction. It preserves a bounded part of the original
shoulder offset. If the straight route crosses the perceived torso, it asks
for a short arc waypoint and rereads next tick. An exactly ambiguous opposite
side matches observed target velocity instead of choosing a magical path
through the body. The ordinary placement error is applied after the nominal
landmark, so it can still spoil the fit.

The existing moving-arrival controller supplies braking and target-velocity
matching using the player's profile, fatigue and available support. World
decides whether the requested arc or arrival is achievable. This is a local
navigation approximation, not a forecast of a successful block or a claim
that every approach improves leverage. The .4-second proximity envelope and
.35-radian waypoint limit bound controller work; they are not timed technique
triggers or measurements of NFL foot placement.

Useful ordinary shoulder approaches retain their previous commands. Drive,
down, active doubles, live hands, pulls, Draw and receiver blocks retain their
existing controllers. No target assignment, intended drive vector, first-step
rule, player capacity, force/work budget or World resolution is changed.

## Keep the cheaper model

An initial candidate compared sprint, arrival and braking requests through
short free-movement World forecasts. On the fixed 48 measured three-second
inspections, its total wall time rose from about 5.03 to 7.76 seconds (+54%),
and process CPU from 17.85 to 23.76 seconds (+33%). Its limited contact gain
did not justify that cost.

The selected geometric arrival request takes about 4.92 seconds in the same
guard, with 105 versus 104 ms median per trial. That supports roughly unchanged
measured cost, not a speedup claim. These are sequential idle-process guards
including roster construction and endpoint snapshots, not isolated helper or
full-game benchmarks. The rejected prototype's measured report is retained;
its temporary implementation was not promoted or archived for exact reruns.

## What constitutes progress

Use actual loads and trajectories alongside acquisition labels. A direct
decision gate makes fewer lost-angle commitments partly an expected consequence
of the rule; it cannot alone demonstrate good blocking. Successful progress
keeps ordinary contacts, improves useful approach/control in retained cases,
preserves failures that physical limits make unavoidable, and transfers across
concepts and player profiles without hidden bonuses.

The same 24 ordinary Ace/4-3 Over/Cover 3 inputs retain all generated profiles,
initial bodies and decision/RNG contexts. Successful OL acquisitions fall
210→176, of which actual lost-angle acquisitions fall 69→36. All-OL first
actual load coverage changes 116→115; the first-level subset changes 95→94.
These populations differ from an acquisition count.

In `OLB-R1-wz_strong-R-S3`, LT versus DE_W still first delivers force in the
.55–.60-second bin. Hand-load bins increase 4→15, body-load bins 2→11, and
strike bins decrease 4→2. The first marginal commitment is preserved, while
the clearly lost regrabs are replaced by foot recovery. Two later successful
acquisitions remain marginal rather than receiving perfect leverage. These
are reported load windows, not continuous contact duration or block wins.

The two lost first-load observations are late strike-only contacts at
2.45–2.50 seconds: R2 flipped Power LG and R2 unflipped Trap RT, both executing
excluded combo plans by then. R2 unflipped Outside Zone C gains a load at
2.50–2.55 seconds. Five other first loads delay by one 50-ms bin and one
Trap LT becomes one bin earlier. The pooled mean is compositional, not proof
of faster get-off. Both OL fall reports are unchanged; all-player falls change
28→26, with one extra fall each in R1 flipped Trap and R2 unflipped WZ retained.
Maximum reported overlap rises .01502→.01889 yd. All four Counter endpoint
signatures match exactly. These limitations remain visible in the comparison.

The broader 144 paired run guards have mean credited gain 1.366→1.327 yd,
stuffs 35→38 and two 10+ yd runs in each phase. Gains rise in 58 cases, fall
in 58 and match in 28. WZ mean declines 1.72→1.04 yd and stuffs rise 5→9;
this is an adverse production change, not automatically a physics improvement.
All 24 Counter gains match. Flags and later decisions can change, so these
are credited outcomes rather than isolated unpenalized contact effects.

All 64 tackle encounter payloads match except source and collection time;
14 primary encounters stay live at their limit. Two divergent full-game
guards have no physical timeouts, lower-hold releases or motor-work excess,
but still have high passing explosiveness and YAC. They share initial rosters
and seeds, not identical later calls or random draws. The engine remains far
from a validated NFL-wide outcome model.

All 635 TypeScript tests, 22 Python tests, typecheck and build pass. Offline
Chromium checks cover all 12 clips with exact retained telemetry/events and
ordinary positional packing. NFL aggregates stay secondary here: generated
rosters differ, and poor coverage/read/route decisions can swamp a sound force
model. The linked evidence retains all adverse cases and exact source/tool pins.

## Next, in order

1. Inspect the retained gains and losses in these fits. Keep real combinations
   out of individual recovery until an explicit handoff/release decision is
   made. Diagnose remaining wrong paths as assignment, observation, requested
   motion, actual collision or contact control rather than grouping them all
   as physics.
2. Fix the demonstrated false deep roof with delayed visible body pose and
   ordinary upright/stale-read/recovery controls. Then measure natural incidence
   before making broad coverage or explosive-rate claims.
3. Make one exact finite-force oracle for active grip reeling and carry it into
   the existing sustained multi-contact/tackle cases. Only alter the local
   integration path if it fails; do not raise global resolution.
4. Continue normal and stress-football validation: combo/climb, slants, hard
   slice blocks, crossing tackles, boundary braking and multiple pursuers.
   Use the same mass, traction, strength, grip and balance capabilities.

Keep two-foot anatomy and full 3D ground expansion paused. The necessary
complexity is a coherent shared force/work path, limited movement/support,
persistent contact where needed, and imperfect observable decisions. More body
detail must earn its cost by fixing a retained football failure that this model
cannot represent.
