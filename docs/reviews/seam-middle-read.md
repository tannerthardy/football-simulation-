# Seam/post read: separate intentions, one taught installation

The new explicitly called **Seam Read** gives the strong #2 a vertical/post
choice. Receiver and QB use the same rule with their own pictures; the QB can
anticipate before the receiver decides. Fixed Seam and Four Verticals remain
available. This is an unmerged prototype, not an NFL-calibrated option system.

The most useful finding was a **teaching error, not a vision failure**: the
first rule discarded an observed central linebacker carrying upfield until
he reached ten yards. Both players agreed on the post, and he intercepted
both prescribed carry arms. The correction recognizes the achieved carrying
motion before nominal roof depth. It changes neither eyesight nor physics.

The [portable handoff](../../data/reviews/current/seam-read-review.json) records
all revisions, 43 flags, actual players, unchanged capabilities/World, inputs,
requested/achieved movement, actual prediction calls, reachable ball contests,
ordinary/adverse outcomes and runtime. Body films stop at five seconds;
**all reported endings come from completed `sim.run` plays**, including returns
and later tackles. Those films do not diagnose late YAC contact mechanics.

## What is taught, and what remains a model choice

[Four pinned public coaching previews](../../data/research/seam-read-sources.json)
were read; paid continuations and videos were not:

- [Eric Struck's Four Verticals tags](https://www.xandolabs.com/the-lab/offense/pass-game/vertical-pass-concepts/three-tags-in-the-four-vertical-concept/)
  teach hash/number landmarks, a seam cap read at ten yards and a QB roof read.
  His capped seam sits; that is a different installation from ours.
- [The Four Vertical Concept, Part 2](https://www.xandolabs.com/the-lab/offense/pass-game/vertical-pass-concepts/the-four-vertical-concept-part-2/)
  quotes Nick Hajjar on reading after clearing the Mike, bending across a
  safety's face and treating a deep Tampa Mike as a middle defender. His trips
  #3 crossing route is not copied wholesale into our #2 route.
- [Jim Glover's GO/seam-read teaching](https://www.xandolabs.com/the-lab/offense/pass-game/vertical-pass-concepts/variations-of-the-sail-concept/)
  makes the receiver and QB ask about the same underneath defender and cap.
  It includes back-shoulder placement and complementary routes, not a universal
  post/corner conversion.
- [Glover's Choice installation](https://www.xandolabs.com/the-lab/offense/pass-game/installing-the-choice-package-in-the-pass-game/)
  shows how shared leverage teaching permits an anticipatory throw before
  a break. It is an outside-choice example, not our seam decision table.

These support shared teaching, physical landmarks, observable leverage/motion
and variant-specific rules. They do **not** establish our numerical bounds,
NFL mistake frequency or a universal three-way seam/post/corner rule.

Our first installation has a ten-yard stem and an eight-yard decision region.
It keeps the seam if the middle is occupied or the roof is unresolved. A split
deep picture with an unoccupied middle supports a post. The caller supplies
an outside Go, an underneath Shallow and a backside vertical; only one receiver
has this read, avoiding automatic dual posts into the same middle lane.

The read uses upright **observed bodies**, not true coverage, safety assignment
or a receiver's private path. Roof bounds are 10–30 yards deep, with a four-yard
central half-width. Any central body in the decision region already moving
upfield faster than one yard/s also protects the middle. A stationary shallow
body or an upfield runner outside the middle does not trigger that extra cue.
These are explicit installation bounds, not fitted league parameters.

A corner conversion needs its own installed rule and complementary spacing;
it is not included in this first seam/post candidate. Existing fixed Corner
remains available. Broader options wait for this read's information constraints.

## Why reads can fail without a bust roll

Given the same acquired picture, the taught interpretation is deterministic.
The picture and execution are not guaranteed:

- Existing opponent perception samples past bodies and projects their stale
  velocity. An acceleration, rotation or redirect can invalidate that projection.
- Existing readiness, focus, fatigue, contact workload and lapses affect visual
  delay. Receiver and QB process different pictures at different physical times.
- The QB has his own progression, cone-limited acquisition and defender memory.
  An observed key cannot reveal a receiver's earlier private commitment; achieved
  route motion can correct the expectation.
- Press/contact can delay reaching the read region or executing the cut. The
  nominal forecast cannot know future contact or exact live fatigue.
- Even agreement can lose to a legitimate defender or imperfect throw/catch.

**Receiver head turns, field-of-view acquisition and occlusion remain coarse.**
The receiver queries delayed opponent pictures at his decision; that is not
a complete model of looking at and acquiring each key. There is no separate
random reading-error probability. Unseen pose is not replaced with live truth
in the QB's memory. Natural disagreement frequency has not been measured.

This distinction matters: consistent teaching should be reliable on accurate
information; reliable code should not receive a complete perfect picture.
The next information experiment is an installed receiver scan with held key
memory and a genuinely unavailable rotation, using these encounters. It should
preserve the clear-view post and seam controls before adding more branches.

## Football evidence and the correction

All arms use the same frozen generated bodies at strength .55, LOS 40,
ball y 26.65, first down 50, audibles off, full initial energy and unchanged
World defaults. Initial roster seeds are 7/19; fresh pairs are 15071/15072
and 16081/16082. Four ordinary/fresh inputs were declared before outcomes.

Three additional controlled inputs keep the actual Mike underneath, prescribe
a pole carry beginning at .65 s, or repeat that carry with .2 s added only to
the QB's existing Mike attention channel. The prescribed movement ends at
2.5 s and the native controller resumes. No body is teleported; `goTo` and
World determine achieved movement. The attention change is diagnostic, not
a production reaction-time adjustment or an NFL-calibrated penalty.

| Input | Unchanged baseline controllers → first prototype → corrected read | Football interpretation |
| --- | --- | --- |
| Ordinary two-high | H tackle 23.49 → TD 70 → tackle 23.48; release 1.95 → 2.25 → 1.95 | Initial prototype discarded the carrying cue during anticipation. Correction restores an ordinary seam/tackle. Final release random state matches baseline. |
| Ordinary closed middle | QB slide 2.08 in all arms | Defense keeps its stop; no forced option throw. |
| Fresh Cover9 rotation | SS INT/return TD → SS INT/return tackle → same INT/return tackle | **OD15072-CB1, index 21** still physically intercepts. Changed return ending is retained; it is not an option-completion improvement. |
| Fresh Tampa | Y tackle 53.57 → 19.77 → 19.77 | Actual catcher **OO16081-TE1, index 7**, is the Shallow, not the option. H's post changes traffic. Same release random state/nominal point; no claim of a repaired YAC/grip mechanism. |
| Prescribed underneath hold | H tackle 23.49 → incomplete → post catch/tackle 21.54 | Final QB anticipates post at 1.95; WR chooses post at 2.10. Actual **OO7-WR6, index 10** catches at 3.30, inside reach/height. |
| Prescribed pole carry | H tackle 23.49 → Mike INT/return tackle → seam catch/tackle 23.48 | Corrected player reads consume the visible carry rather than discarding it. First prototype's defensive win remains in evidence. |
| Same carry, delayed QB key | H tackle 23.49 → Mike INT/return tackle → seam catch/tackle 23.48 | The extra delay changes the consumed key picture but does not create disagreement here. This sensitivity result is inconclusive about mistake frequency. |

The first prototype's Mike interceptions are real ball contests, not awarded
option-error outcomes. The corrected offensive wins are likewise physical
catches. The held-post catch has .583 yd of horizontal reach margin at
3.228 yd ball height; the same player's maximum catch height is 3.345 yd.
The pole seam catch has .762 yd of reach margin at 3.274 yd height. The fresh
SS interception retains .432 yd of reach margin at 3.217 yd height. World,
catch laws, grips, balance/recovery and generated profiles are unchanged.

The actual release aim is reconstructed from the **last prediction call
consumed by release**, not the earlier evaluated pending point. In the held
control, that prediction is `[58.2204, 21.5725]` for the post; in the carry arms
it is `[59.1983, 18.6303]` for the seam. Windup can update an uncommitted
expectation before the physical cut. This is earned anticipation, not reading
the receiver's private conversion. Both final choices agree in these plays;
separate-view actual-release contracts demonstrate disagreement without
imposing a bad ending.

## Validation, pins and disposition

Branch `codex/seam-middle-read` starts from the published Stick handoff
`f77b54010e3a6c233eacba0320e41f81844ca15f`. The remotely reverified integration
pin remains `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`. Unchanged baseline
collection uses `f2fc53ff955050c3797c474d5cb889d792294ffa`, runtime `8433e88d…`.
The first prototype is `c14f4cb`/`750fd83`/`0b315cd`, runtime `6d303ae5…`;
the one carry-cue correction is `bf1135341cd38124e48355175cb0b0e21b5aa90a`,
runtime `d07d964545d7276454900354fbb131c7dd2350595c1fcf17812e7c1e8cb87ec7`.
Full commits, hashes and exact commands are in the handoff.

The new route definition is supplied identically to unchanged baseline
controllers through a **declared diagnostic registry extension**. Those
controllers ignore its read metadata and run the fixed seam. This compares
the same called installation, not a previously native baseline playbook call.

**36 affected contracts pass**, including 11 Middle Read and 19 Stick checks;
typecheck/build pass at the final runtime. Hidden-call/live-body independence,
physical read progress, mirror, pole/shallow controls, separate intentions,
actual unseen-branch release and achieved post-leg forecasting are covered.
Compatible ordinary Stick and untouched Verts retain exact complete signatures
after shared preview extraction. The carry-only correction leaves both fresh
plays' complete signatures exactly unchanged from the first prototype.

There are **26 full diagnostic runs across seven seam inputs plus two reused
control inputs**, two fresh seam inputs, no games/full suites and no censored
full plays. Three observed/plain pairs establish recording neutrality.
Launcher commands total **95.56 s**; static handoff generation takes about
8.7 s and simulates nothing. Its first guard failed because Python sorted
path components differently from the JS source fingerprint; lexical path
sorting repaired the analysis guard without a runtime change. No engine
contract failed in this follow-up.

The prototype improves information separation, achieved anticipation and the
coached response to a visible carry. Fresh defensive possession and ordinary
tackles remain possible. It does not establish population completion/YAC/error
rates, receiver gaze realism, complete post-throw transfer or arm re-aim limits.
Adding the explicit concept changes the available call menu; game-wide calling
effects are not measured here.

**Keep integration paused.** The next bounded work is receiver key acquisition
and an unavailable rotation, then a selected post throw with fresh players.
The designated run-game integration lead owns the preserved full suite on
the exact combined candidate. Pressure, helper coordination, roster and
shared physics work remain separate.

Reproduce the final initial/fresh/controlled cases through `baseline:run`
using `scripts/diag/seam-read-panel.mjs run`, the tracked ordinary/rotation
input packets, an output directory and `initial`, `fresh` or `rotation`.
The receipt preserves the exact commands. Cached handoff reproduction is
`python3 scripts/diag/seam-read-report.py`; it launches zero simulations.
