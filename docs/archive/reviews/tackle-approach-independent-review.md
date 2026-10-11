# Independent review: tackle approach before grip strength

## Recommendation

Repair the arrival controller before expanding the physical model or strengthening
grips. Two retained Split Zone breakaways expose an abrupt change between
head-on gathering, oblique interception and close gathering. Those policies
request different speeds and braking for small changes in the same delayed
picture. Use the existing support-limited movement envelope for every arrival,
and blend techniques continuously. Keep imperfect observations, finite motor
response, misses and physically impossible recoveries.

The retained Free Safety's 3.50 s zero-quality wrap is **not itself an invalid
instruction**. It is a last fingertip opportunity as the runner passes. A rule
forbidding those grabs would remove legitimate desperation and hide the earlier
approach problem.

This review diagnoses the baseline. Candidate promotion still requires the
fixed football/control comparison and final checks; a controller correction
does not establish NFL-calibrated tackling or a universal physics OK.

## Source and observation boundary

- Baseline commit: `fcafcaf`.
- Baseline engine content SHA-256:
  `178751b67048eeaa91741090a4a19e43c108add8c5f1c5e0a586c09d57b3402c`.
- World SHA-256:
  `4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.
- Independent exploratory collector:
  `out/tackle-breakthrough/review/cue-boundary.ts`.
- Its immutable baseline output:
  `out/tackle-breakthrough/review/cue-boundary.json.gz`.

The collector observes calls to `see` that production already makes, the held
commands immediately before World, and actual bodies/support. It never asks
for another look, behavior update or random draw. Full replay/telemetry and raw
results are retained. Observed recorded versus plain unrecorded executions agree
on complete result, final bodies, commands and RNG for all three inputs. Source
was unchanged throughout that collection.

The three inputs are two outcome-selected stress witnesses and one predeclared
ordinary control. They are **not** a population for estimating missed-tackle or
explosive rates. Rosters use seeds 31/32, strength .55. Split Zone uses
`gun_wing_12`, Cover 3, seed 11; Inside Zone uses `ace_11`, Over/Cover 3,
seed 3. These are the existing fixed native inputs, not staged tackles.

## The Free Safety's zero-quality wrap

At the post-World selector boundary, `CT-R1-split_zone-over-L-S11` has:

| Measurement at selector time 3.50 s | Value |
| --- | --- |
| World time | 3.55 s |
| Actual defender position | (45.476, 30.177) yd |
| Actual defender velocity | (-1.242, 3.515) yd/s |
| Actual runner position | (45.521, 31.727) yd |
| Actual runner velocity | (6.726, 2.746) yd/s |
| Combined body radii | .549 yd |
| Standing grasp reach, including bodies | 1.562 yd |
| Actual center distance | 1.551 yd |
| Actual geometric quality | .014 |
| Consumed picture age | .150 s |
| Picture distance after .050 s boundary extrapolation | 1.586 yd |
| Observed geometric quality | 0 |

There are no existing contacts, joints, lean or external support loads on that
defender at the decision. The forecast holds the command actually executed and
the observed runner velocity. It finds no better future sample. Actual contact
is just within standing arms reach, while the picture says the carrier is at
full extension and escaping. Attempting the current opportunity is defensible.

`contactQuality` measures extension geometry. It is not tackle probability, grip
force, or proof that no hand can touch the runner. A zero-quality initial grab
can still create a weak force-limited physical hold. This particular hold slips
at 3.75 s; the existing controller does not award a successful tackle merely
because it chose to reach.

This generated FS has tackling .959 and pursuit .837, but physical balance
.286. Good tackling technique and strong support are separate in this roster.
This review does not infer that an NFL safety with those nominal ratings should
automatically complete the tackle or that grip capacity should be increased.

## The earlier control problem

The old `chase` selects its head-on policy if the observed carrier's incoming
speed exceeds 1.5 yd/s and its radial fraction exceeds .7. Otherwise, it may
select a different close gather or sprint/interception policy. This is a hard
policy switch, not a visible football event.

In the Over/left stress witness, the consumed image changes smoothly while the
command changes sharply:

| Time | Incoming fraction | Achieved FS velocity | Requested FS velocity |
| --- | --- | --- | --- |
| 2.55 s | .711 | (-5.12, 1.52) | (-7.04, 4.40) |
| 2.60 s | .681 | (-5.15, 1.78) | (-7.22, 6.00) |
| 2.70 s | .728 | (-5.20, 2.26) | (-5.64, 4.51) |
| 2.75 s | .692 | (-5.12, 2.58) | (-5.00, 7.94) |

The body is upright throughout. At 2.90 s its observed closing speed is
8.91 yd/s and the controller enters its close arrival region. At 3.10 s another
policy transition changes the command from (-2.14, 6.40) to (-1.70, 2.96) while
the achieved body is still moving (-4.17, 4.44). By the eventual grab it has not
reversed its downfield velocity and the back is passing across its face.

The Odd/right stress witness exposes the same earlier boundary: incoming
fraction .720 to .686 at 2.50 to 2.55 s changes the command from (-6.47, -5.08)
to (-3.36, -8.77), while the achieved body moves about (-4.96, -1.36). It later
attempts a desperate dive at 3.60 s. Both native stress witnesses finish at
70 yards in the baseline.

The first identified invalid **control principle** is changing the braking and
arrival budget because a small bearing change crosses a hard classifier.
The late miss alone is not proof that traction or turn capacity is wrong. The
body correctly cannot instantly execute the radically different command. These
traces establish a mechanism to repair; they do not prove that smoothing alone
must prevent either touchdown.

## Ordinary controls and a separate waiting defect

The ordinary Inside Zone control finishes at 3.58 yards. Its initial DT_S wrap
and WILL assist occur at 2.90 s; the runner loses support at 3.15 s and the tackle
is completed at 3.55 s. The FS's relatively frontal pursuit remains near incoming
fraction .98 before contact and does not toggle around .7. That FS is not the
player completing this control's tackle. Preserve the actual initial grip,
assist, loaded hold and fall path rather than presenting its late FS approach as
an independent successful tackle.

A separate code review of `tryTackles` found a bounded follow-up defect. Before
the attainable preview, it initializes `futureQuality` from the **actual**
carrier/defender constant-velocity closest point. Excluded or unavailable
previews leave that optimistic forecast intact. A defender with an engagement,
joint, recent contact, recovering support, lunge or external load can therefore
wait for a future opportunity the held physical command does not support.

Do not replace that fallback with another ideal-motion forecast. Credit waiting
only when a supported forecast using acquired information provides affirmative
evidence of improvement. When a one-body forecast cannot represent current
constraints, keep the current opportunity rather than inventing a better one.
Actual geometry can still determine whether contact is acquired and how far a
real hand can extend. A free-body preview is not a loaded-contact oracle.

The 43 existing tackle-window and pursuit-contact tests pass on the reviewed
baseline. Passing them does not cover the newly identified loaded fallback or
the bearing-policy discontinuity.

## Guards for the proposed repair

1. Sweep small changes in bearing across the old .7 boundary and the close
   stopping region. Desired velocity/facing should change continuously for the
   same body and picture; do not loosen its traction or increase agility.
2. Retain a frontal approach that brakes without retreating indefinitely, a
   crossing approach that gathers before passing the near hip, and a faster
   carrier escaping a slower trailing defender. Include both mirrors.
3. Retain glancing/receding fingertip grabs and desperation dives. A valid
   desperate attempt need not become a successful tackle.
4. Keep normal initial wraps, assists and effective loaded holds. An already
   bonded tackler cannot be evaluated with a free-body forecast.
5. Include fatigued/support-limited crossing and nearby traffic. A controller
   must not receive the motion that would be available only to an unloaded,
   fully recovered body.
6. Compare the fixed native ordinary panel and all retained stress inputs,
   preserving changed gains, misses, contact fumbles and censored encounters.
   Trace contact quality, delivered load and support separately from final yards.

The needed complexity remains a reduced body with bounded movement, traction,
grips and support, plus a coherent arrival controller. More anatomy would not
repair this earlier instruction. Reopen physics only if a feasible, correctly
observed request executes with unexplained force, work or support response.

## Candidate status and completed waiting repair

The first arrival candidate (`52b1709…`) turned the two 70-yard stress witnesses
into 13.18/12.79-yard tackles. Its FS still failed to finish both opportunities;
the finishing player was CB_S. That candidate was withheld because its early
gathering also slowed an ordinary far oblique interception. Better final yards
were insufficient to justify changing that legitimate request.

The second arrival candidate, source
`66b5ce3e6ed1cbab4372cfe39e0ed19049fac26e586eae1007dfbd4c98801635`,
activates early frontal gathering only if the observed runner path enters the
defender's contact corridor. Otherwise it retains an oblique interception,
with continuous blending into the same support-limited close arrival budget.
This uses the delayed picture and own body, not future runner cuts. The
independent three-input comparison is:

| Native input | Baseline gain | Arrival V2 gain | Result |
| --- | --- | --- | --- |
| Split Zone Over/left/seed 11 | 70 | 70 | Escape retained |
| Split Zone Odd/right/seed 11 | 70 | 11.84 | CB_S finishes a real wrap |
| Inside Zone Over/right/seed 3 | 3.58 | 3.49 | DT_S wrap/WILL assist retained |

Outputs `out/tackle-breakthrough/review/cue-boundary-v2.json.gz` and
`cue-stages-v2.json.gz` are separate from the baseline; all three observed/plain
executions agree in both collections. The stages collection additionally keeps
the existing raw behavior command before contact/spacing modifies it. In the
Over/left escape, FS's zero command at 3.00 s is from teammate spacing: raw
pursuit requests (-3.65, 8.65), while the executed request is (0, 0). Several
neighboring ticks make that same gather. This is a separate traffic/coordination
question, not a request to bypass collisions or give the body more traction.
At 3.90 s CB_S actual contact geometry is closer than baseline (.90 versus
1.06 yd; quality .810 versus .615), but its earlier 3.85 s attempt misses.
One final escape neither proves a worse physical law nor guarantees the new
controller is sufficiently good.

The separately reviewed waiting defect is now repaired in `tackle.ts`.
Waiting defaults to false and is justified only by a supported forecast using
the consumed picture and command actually held. Excluded/missing previews no
longer inherit an ideal current-state future contact. This changes the selector,
not reach, grip strength, force integration or tackle acquisition uncertainty.

The combined arrival V2 plus waiting source is
`030e0f3fb252f4c63ecbb81c8c7544728a6c54b2fa91c5827689ea1fb6e7cdeb`.
The new dedicated `test/tackle-wait-constraints.test.ts` proves the feature
against a separately copied genuine `fcafcaf` engine: 12 constrained/unavailable
cases fail there while the ordinary incoming control passes. All 13 pass the
repaired selector. Cases include both mirrors of a real reachable block release,
pending ownership, felt contact, held foot, strike/lean/load, unsupported commands
and missing command. It preserves a supported head-on wait without extra
behavior/RNG draws. The former synthetic head-on test now supplies the actual
standing intent and a consistent velocity history; none of its assertions were
weakened and no fallback motor command was invented.

The 24 prior window tests, 19 prior pursuit/contact tests and 13 new cases pass
(56 total), and typecheck passes. Machine reports and exact hashes are in
`out/tackle-breakthrough/review/feature-receipt.json`, with separate baseline and
candidate JSON test reports. Combined native panels/full-game review are
reported separately in [the final review](pursuit-and-tackle-transfer.md). The V2 gains above precede
the waiting repair and must not be presented as measurements of the final
combined source.

## Integrated traffic follow-up

The later final source
`8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942`
also repairs unnecessary teammate full stops: a slower upright turn which
clears all consumed peer pictures is preferred before evaluating zero.
It changes no physical capability or loaded preview scope. The separate
[moving-gather review](teammate-spacing-moving-gather.md) records the first
native command fork, genuine pre-change feature failures, collision/support
controls, exact source pins and four-input native witnesses. The retained
Over/left run now ends at 13.05 yards; the FS still loses his grip and CB_S
finishes. This integrated result must not replace or be confused with the
earlier V1/V2 measurements above. Broad football guards remain the parent
review's publication requirement.

Full diagnostic replays for the final Over/left Split Zone, Odd/right Split
Zone and ordinary Over/right Inside Zone are separately saved in
`out/tackle-breakthrough/review/cue-boundary-final.json.gz`. They contain
every-tick full recording, the original consumed-cue/motor observations and
all 22 players' full metadata copied read-only before and after the run.
All three recorded/plain runs are observer-neutral, and their events/gains
match the saved final 32-case native panel exactly. Before using supplemental
cards for both phases, ordered player identity, roles, physical profiles and
ratings are checked against both saved native phases, and baseline cue slots
are checked separately. Supplemental metadata provenance and exact file/tool
hashes are preserved in `cue-boundary-players.json` and
`cue-boundary-final-receipt.json`; the original baseline packet is unchanged.
