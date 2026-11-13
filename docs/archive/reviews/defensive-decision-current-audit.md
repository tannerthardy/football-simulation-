# Defensive awareness: current evidence and bounded repair

The most useful defensive improvement is making an installed responsibility
survive contact and making a known man assignment survive conflicting nearby
movement. More detailed physical anatomy would not repair either information
boundary. The promoted changes preserve delayed observations, personal beliefs,
finite reassessment, execution uncertainty and the shared contact capacities.
They do not grant a defender the correct run/pass read or prescribe a successful
shed.

This audit starts at commit `632fb02`, engine content
`09dd62c7d7cc5002312e93821ea0bf6f7dea3bb764ff75f509c59ff720e72d62`.
The initial combined awareness candidate is
`8863cafc764390fb31f0675fb8eaf7756da8a53019dd0281a11d9482c26703f1`.
The final source, after the deep-penetration correction, is
`d280f69c5a19b772cf218ffa3d55095da2eb89cb25ed71b2c5ec996b632970de`.
The combined source also includes QB and carrier repairs; its native outcome
changes are not isolated defensive effects. The main
[awareness review](decision-awareness-and-commitment.md) and
[evidence packet](../../../data/reviews/decision-awareness/README.md) retain the
larger controls and adverse cases.

## 1. A blocked defender keeps his fit while reading the runner

The previous [run-defense audit](run-defense-current-audit.md) identified the
free-to-engaged discontinuity. A free player used his gap, box/spill shoulder,
partner and delayed runner picture. `stepRunRep()` replaced those with the true
carrier's position and granted full lateral work when the private offensive call
was run, even if the defender still believed pass or remained unsure.

The current-source reduced witness holds bodies, contact, consumed pictures and
RNG fixed. Only private `sim.isPass` changes. Under an unsure/pass read, the old
requested velocity changes from approximately `(-1.806, .359)` to
`(-1.499, -.323)` yd/s. Under a run read it is already invariant. A second
witness holds the delayed QB picture at `(35, 26.667)` and moves only his true
current lateral position: the old defender changes his working side and command.
These establish knowledge violations, not their league frequency or an NFL
force-calibration error.

Four predeclared native run fixtures include 940 retained engaged-defender
samples. Sixteen are still unsure before the update; none is a wrong-pass read
in this small selection. Recognition updates before the contact controller, so
those pre-tick counts identify early-contact inspection opportunities rather
than proving the contact instruction used an unsure read. The held-picture
controls prove the private-call effort mechanism. The installed-fit substitution
continues after recognition. Neither count explains the cramped run panel.

The repair in [engagement](../../../src/sim/engagement.ts) does the following:

- An interior defender initially works toward his known gap. An edge/force
  player initially works to the touching blocker's outside box shoulder or
  inside spill shoulder. The offsets reuse the free-fit teaching, not a new
  physical strength multiplier.
- He reads the runner through consumed delayed carrier/back pictures. A deep
  observed QB does not become a stationary mesh target; the backfield picture
  supplies flow until the QB or runner approaches the surface.
- A personally recognised run and a runner at the existing surface boundary
  permit a new contact objective. An edge retains its shoulder until the
  observed runner has advanced beyond the surface.
- `SnapMind.aim` holds the selected objective through the player's existing
  decision interval. A changed visible cue can influence the next decision;
  moving the unseen carrier cannot.
- Shed proximity, the seal relative to the runner, and release after the runner
  passes the defender use delayed positions. A run declaration alone is not
  permission to shed toward a distant mesh. A personally recognised run can
  still supply a close observed back behind the surface: a penetrating defender
  must not wait for that back to reach the free-fit declaration depth.
- A visibly advanced carrier is an immediate pursuit threat after a catch even
  when the original snap was correctly read as pass. The original recognition
  label is preserved.

Touching body geometry, hand load and support are local physical/haptic state.
The World still decides whether the requested footwork, drive, hands and shed
can actually work. No mass, traction, arm budget, support capability, hit law or
solver resolution changed.

The engine's public carrier identity remains an interface simplification. This
repair does not model seeing possession through helmets, blockers or occlusion.
The pass-to-run rep classification also retains its existing event/call interface;
it no longer grants a defender a run belief or full work effort. Attack versus
control/lag remains a larger unfinished contact technique contract, as do exact
block compression and multi-gap decisions. Optional manual cutback jobs retain
another boundary debt: the free fit preserves them through near-surface
declaration, while the engaged helper currently treats them like interior jobs.
Automatic calls do not enable that exchange today; fix its installation ledger
and contact release before enabling it. Preserving a gap-side request is not
proof of achieved gap control.

## 2. Man recognition keys the known receiver, not a nearby substitute

`Recognition.cues()` previously selected the nearest eligible receiver for its
WR cue. A man player could therefore weigh somebody else while his assigned
receiver continued downfield. In a held-picture corner fixture, the assigned
receiver remains fixed at six yards/second; changing only a closer receiver from
stationary to vertical changes the old belief from run to pass. Changing only
the assigned receiver's speed has no effect on the old belief. The stationary
near receiver was also classified as a stalk through the existing proximity/
time heuristic rather than proven hand contact.

[Recognition](../../../src/sim/recognition.ts) now uses the player's own known
current man target when its receiver cue is active. A closer crosser/stack
member cannot silently replace that body assignment. The receiver remains
observed through the player's own delay. A distant stationary assigned receiver
is ambiguous in the focused fixture: the repaired player remains unsure rather
than being forced to diagnose a run.

The scope is deliberately small: the current CB/S groups have nonzero receiver
cue weights, including a safety assigned to a back. LB/DL recognition still has
zero WR weight and retains its line/backfield policy. Zone players retain their
existing local key. No global gaze budget, perfect #2 identification, movement
oracle or teamwide communication channel was added.

The ordinary native man witness is Four Verticals, Gun Doubles 11, Over Cover 0,
rosters 31/32, seed3. The FS is assigned RB while the previous recognition
receiver key selects Y on 92 recorded updates. This is a known-job mismatch,
not a demonstrated corner bust or a count of failed coverage snaps. The repair
keys that FS's back assignment. In zone fixtures, a current relating target and
a run/pass receiver key may legitimately differ; those differences are not
counted as broken coverage.

A third small information repair removes the DL tactile fallback from unknown
blocker stance to `engagement.type`. Known low/high presentation can still
supply evidence; unknown stance supplies no run/pass category. A bookkeeping
label cannot substitute for something the defender feels.

## Validation and native limits

The 18 focused tests cover private call invariance for unsure/pass/run, unseen
carrier position and release, mirrored box/spill shoulders, delayed declaration,
held actions, distant/close shed opportunities, post-catch threats, conflicting
receiver cues, preserved zone policy and unknown tactile presentation. Nine
OL-context tests and six existing recognition tests also pass. The same final
18 feature tests fail 16 assertions on the archived `632fb02` implementation;
the two preserved controls pass there. Those are mechanism failures, not new-API
absence. The final close-shed assertion requires an attempted/successful shed,
not merely a released engagement. Three added penetration controls separate a
close observed back, a true-close/observed-far back and a close standing deep QB.
The first candidate mistakenly gated shed eligibility on surface declaration;
that was corrected before promotion without changing fit declaration or forces.
Situational
anticipation and play-action mistakes remain present; the goal is coherent
uncertainty, not perfect recognition.

The exact read-only native collector is retained locally at
`out/decision-awareness/defense/probe.ts`, SHA
`8343a4bab84c5764d3b19e3adf89782eb9ad4173eb70209fad1c80317d7e0bd7`.
It has eight predeclared run/pass inputs, complete natural simulation and a plain
execution control. All eight baseline and all eight final full/plain comparisons
match result, final body, intents and next RNG. Source stays fixed during both
collections. Its last-eligible-key mismatch label is a diagnostic difference,
not a bust label; it excludes RB and therefore cannot certify acquisition of the
new assigned-back cue on its own. Source inspection and the focused target-read
controls establish that mechanism.

The same fixed native inputs retain the following offensive-yard endpoints:

| Fixture | Before | Initial candidate | Final combined awareness |
| --- | ---: | ---: | ---: |
| Inside zone / Under / Cover 3 | 4.80 | 6.23 | 6.23 |
| Power / Under / Cover 3 | −0.28 | 6.48 | 6.46 |
| Outside zone / Over / Cover 3 / left | 2.50 | 3.22 | 2.84 |
| Split zone / Tite / Cover 3 | −0.02 | −0.18 | −0.18 |
| Four Verticals / Over / Cover 0 | 0.00 | 0.00 | 0.00 |
| Four Verticals / Over / Cover 1 | 24.52 | 17.42 | 17.42 |
| Four Verticals / Over / Palms | 0.00 | 0.00 | 0.00 |
| Play action Post/Dig / Over / Cover 3 | 16.68 | 16.61 | 16.61 |

The Split-zone adverse endpoint is preserved. Cover0 ends after an interception
in both phases; zero offensive yards is not an incomplete-pass label. The
Four-Verticals Cover1 reduction includes combined-source downstream decisions.
These are selected instruction witnesses, not success/explosive rates or a
claim that every defensive action improved. The main packet's larger normal,
mirrored and multiple-roster panels are the regression evidence.

## Next awareness work

The simplest useful progression is a known job, a personally acquired cue,
remembered uncertainty, a bounded action, and a later cue that can change it.
The existing stress/focus, evidence smoothing, read hysteresis and physical
reaction already support this. Add actual cue-acquisition policy to one role
only after a native witness shows which secondary cue was unreasonably free.
Do not make a high rating equivalent to knowing the play.

The remaining high-value defensive work is:

1. Trace one ordinary linebacker guard/back conflict and one matching safety
   vertical/run conflict. Record purpose of each observation so physical
   teammate spacing is not misrepresented as conscious visual attention.
2. Replace the stationary-near-receiver run heuristic with evidence of blocking
   or its role-specific alternative when a retained false read proves the need.
   Waiting at the line can be an unreleased pass option.
3. Trace a current seam/crosser delivery and successful control before changing
   roof urgency or overlap. Sending and receiving responsibility, delayed
   pictures and attained hip/velocity matter more than calling a depth handoff
   a bust from one frame.
4. Revisit the documented private QB-read oracle through separate removal-only
   and observed-cue ablations. The previous body-direction proxy was withheld;
   torso direction is not eye tracking and a wider cognition layer does not
   validate that proxy.

The [Coverage Operating System manuscript](../../references/Coverage_Operating_System_Manuscript.md),
particularly its eye-discipline, run-fit and man/distribution teachings, supports
job-specific keys and preserving leverage. The user manuscripts are coaching
hypotheses, not verified NFL playbooks. BDB tracking can test path, spacing,
relative motion and timing; it cannot measure a player's actual gaze, thought or
confidence. No attention cone, stress coefficient or physical force was fitted
to this panel's final yards.
