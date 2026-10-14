# Player awareness: shared calls, personal evidence and intelligent uncertainty

Players know their own team's installed play and maintain uncertain expectations
of teammate movement. They update their picture through legitimate observation,
received communication and contact. They must still make useful decisions when
a teammate is unseen, an opponent is deceptive or execution defeats the call.

This chapter is a **model proposal**, not an authenticated NFL installation or
a claim that all engine consumers now obey it. [PR #36's bounded repair](../reviews/teammate-information.md)
migrates spacing's teammate input only. Its acquired pictures, memory, installed
expectations and tactile cues are useful foundations; remaining controller
shortcuts and opponent acquisition are explicitly outside that repair.

The subsequent opt-in research pilot uses `PlaySetup.runAwareness`: default `off`
preserves PR #36, `primary` owns one acquired near-line key, and `glance` adds
installed-lane attention. It covers eligible outside/wide-zone OL and their
original acquired key only. Other targets, retargeted work and all other roles
retain legacy consumers. Compare `off` to `primary` separately from `primary`
to `glance`; changing acquisition itself can alter football before any glance.

## One model, different jobs

Keep these six stages separate in state, interfaces and recording:

| Stage | What belongs here | What must not be inferred |
| --- | --- | --- |
| Installation | Own call, taught landmarks, nominal teammate jobs and permitted answers | The opponent's true call or successful execution of our call |
| Responsibility | The relationship or lane this player currently owes | A block win, tackle, received exchange or reachable help |
| Acquired picture | Personally sampled evidence, source, acquisition/delivery time and age | Unseen current position or a private controller decision |
| Interpretation | Fallible belief about what the evidence means and what may happen | Certain future movement because a label names the concept |
| Technique request | Movement, orientation, hand target or ball action chosen | Achieved motion or contact merely because it was requested |
| Achieved feedback | Own motion/support, received load and actually acquired contact | A distant teammate's exact balance, grip or private intention |

Installation and evidence coexist. Seeing a teammate does not erase the shared
call; losing sight does not erase its landmarks. Conversely, the call does not
overwrite contradictory acquired evidence. An expected slice is not a completed
seal, and expected alley support is not proof the safety can still arrive.

## Before the snap

Own-team knowledge can include the called formation, nominal alignment, snap
cadence, assignments, exchange rules, route/run distribution, coached landmarks
and approximate timing. The installed contract is copied when the call is
assigned; live controller state cannot refresh either its value or availability.
Public down/distance, field, boundary and clock context remain available.

Players can acquire the opponent's presented alignment, personnel and movement.
That can support a front, leverage or coverage hypothesis. It cannot disclose
the opponent's call, concealed rotation, future cut or exact private assignment.
A pre-snap presentation may be misleading. Changes to our own call require an
installed update or modeled communication receipt, not telepathy between jobs.
The current engine does not implement a general communication/hearing model.

## Role keys as the play develops

These are compact installation choices. Teams teach different keys and answers;
the table does not prescribe one universal NFL eye progression.

| Role | Own installed knowledge | First attention and nearby context | Evidence permitting a change |
| --- | --- | --- | --- |
| QB | Mesh/keep rule, protection count, launch point and eligible answers | Exchange partner/conflict key; then protection and called progression | Actual exchange, acquired threat or receiver declaration |
| RB | Mesh tempo, aiming point, controlling block, expected leads and allowed entries | Mesh first; near block/defender, then the next fitter | Acquired penetration, useful entry, leverage or received contact |
| OL | Own surface/gap, covered/uncovered rule, partner, backer and nominal runner lane | Near DL hip/shoulder and tactile load; justified partner/backer/runner glance | Observed slant, transfer opportunity, lost contact or received exchange |
| TE/FB | Slice, kick, wrap, lead or release rule and allowed alternatives | Required edge/surface and crossing traffic before looking ahead | Acquired squeeze, kick/log geometry, usable entry or received change |
| WR | Own route/block responsibility, concept spacing and authorized adjustment | Assigned defender's release/leverage; relevant help when blocking | Acquired defender movement, ball flight or runner declaration |
| DL | Own gap/rush/contain, box/spill and installed replacement | Near blocker step and received load | Acquired reach/down/pull/pass-set cue or runner declaration |
| LB | Own fit/exchange, eligible obligation and expected defensive support | Installed line key with back/receiver context | Credible acquired block/pull/fast release; possession evidence |
| DB | Receiver/distribution, leverage, deep/help obligation and conditional run support | Receiver release/hip relationship; installed secondary key | Valid acquired run cue or authorized delivery while preserving vertical obligations |

A player keeps the obligation while changing the technique unless a permitted
cue authorizes a responsibility change. A linebacker may stack more patiently
without surrendering his gap. A safety may adjust his help angle without buying
an underneath fake and abandoning the vertical. An OL helper's own picture
cannot send his partner away as though the partner had acquired the same cue.

## Eyes, attention and sensing

Travel, torso orientation and attention are different. Backpedaling does not
mean looking backward; a blocker can glance without demanding that his hips
turn away from the defender. The initial sensing cone is a coarse field of
regard, not measured eye gaze. The pilot retains that foreground opportunity
and adds a declared lane glance: up to 100 degrees of gaze yaw, a 25-degree
half-cone, 25-yard range and coarse solid-body occlusion. These are hypotheses,
not a complete occlusion model or detailed head movement. The original scoped
block key receives no new visual sample during a lane glance; already pending
samples and actual received loads can still arrive.

Attention identifies what evidence the player seeks. Installation, last acquired
pictures and own achieved state may select a key or a likely region. A hidden
current target position must not aim the glance. The sensing opportunity then
determines whether the real target is within the declared attainable view; only
a successful acquisition can copy that sample into the observer's state.

A deliberate glance has bounded opportunity/cadence and delivery latency. It
cannot grant an instantaneous perfect rear picture while the player also reads
every primary key. Seeking an unseen teammate is not the same event as seeing
him. Previously acquired information ages while attention is elsewhere, and a
pending old sample retains its original timestamp if delivered after sight loss.
Queries and recording copy existing information; they cannot create another
look, deliver a pending sample early or consume additional randomness.

## Uncertainty and football mistakes

Use simple timestamps, bounded prediction and small installed alternatives
before adding a statistical world model. Unknown achieved state should remain
unknown. Prediction expiry is not evidence that a moving player stopped; a
called lane remains an expectation rather than an exact remote body position.
An unavailable query must never substitute reality or a legacy unrestricted feed.

The pilot retains its original key's last acquired velocity/pose while capping
position prediction at 0.30 seconds and exposing sample age. That key memory
currently has no expiry, so old motion cues can remain influential. This is a
limitation, not proof the key is still moving as remembered. Teammate memory
continues to use PR #36's separate expiry and unavailable contract.

Useful errors have causes: an old picture survives a cut; a helper attends the
backer and misses a slant; a back mistakes stretch for an earned edge; a defender
trusts a convincing run key while a receiver releases. Reacquisition can correct
the belief, but existing braking, balance and travel time may make recovery too
late. A correct read can also lose to superior execution. Do not inject an
independent random assignment bust each tick to manufacture human imperfection.

Existing reaction, focus and recognition can affect latency or interpretation
within explicit bounds. Better players do not gain hidden state, perfect sight,
extra traction or guaranteed contact. This pilot adds neither online learning
nor a detailed head simulator, and does not reinterpret position familiarity as
per-call training.

## First run pilot: installed lane selects attention

The pilot installs a nominal post-mesh lane/landmark and arrival window from
the call and alignment. **That expectation chooses attention; it does not place
a precise RB traffic point into spacing.** Neither the installed window nor a
glance certifies a successful handoff or achieved runner path. Hidden possession,
engagement, cuts and private carrier state cannot refresh the expectation.

A selected-landmark correction checks the chosen point against the observer's
attainable view before spending a primary-key opportunity. It rejects that
selected point only; it does not prove the whole uncertain lane is invisible.
Retain legitimate fringe searches, missed looks and stale-picture mistakes.

Earlier scoped tests passed 53 checks across six files. The final selector
revision has a separate focused recheck; do not add its assertions to that
earlier total. Exact revisions, validation and adverse native evidence belong
in the [run-awareness review](../reviews/run-awareness-model.md).

Native results do not justify promotion. On H's fixed primary-only trajectory,
the earliest physically possible RB sight is 2.25 s; the observer's 0.30-s delay
would deliver it at 2.55, after the defender wraps at 2.30. The current first
delivered visual is at 2.70 from a 2.40 sample. On Y's primary-only trajectory,
no RT/RB sight falls within the attainable 125 degrees from snap through 3.25 s.
Better timing alone cannot resolve that geometry. These are two retained
encounters, not NFL calibration or demonstrated transfer. Default remains off.

The most useful next experiment is request-only anticipation from the uncertain
installed lane, own acquired block key and felt load. Run Game should compare
feasible own motion through that range without inventing a precise RB position.
Keep a stalled handoff, unseen cutback and necessary maintained block as adverse
controls. Compare raw/final requests, achieved motion, collision and loaded-block
continuity before gain; physics and contact rules stay fixed. No broader
consumer migration or integration readiness follows from this pilot.

## Focused contracts and opposing controls

These contracts guide the scoped checks and later work, not all-role certification.

| Question | Small reproducer and necessary opposing control |
| --- | --- |
| Does installation leak live state? | Advance hidden divergent RB motion, handoff outcomes and private controller state; expectation value/availability and glance request remain equal without acquired evidence. |
| Is attention installed rather than secretly aimed? | Hold the expected lane fixed while the hidden back moves; the look axis stays fixed. Change the installed run side before snap and the expectation may legitimately change. |
| Does seeking cost an opportunity? | Repeat a glance at one boundary; no extra sample/RNG. Preserve its cadence/latency and primary-key limits across multiple consumers. |
| Does legitimate sight matter? | A target inside the selected view delivers a dated picture and later response; a hidden cut outside it does not. A stale picture can remain wrong. |
| Does contact provide limited information? | Real rear teammate impact supplies a local cue; mere proximity or a private engagement tag does not disclose remote motion. |
| Does missing information stay missing? | Expire teammate memory with no acquired replacement; never fall back to target truth. Retain an unavoidable or missed rear encounter and explicitly aged original-key memory. |
| Is the football coordination useful? | Y and D01 H retain raw/final requests, achieved approach, useful block load and collisions. Keep ordinary adjacent-TE traffic and a legitimate offensive/defensive loss. |
| Are diagnostics neutral? | Recorded/plain runs and repeated queries match acquisition state, requests, events, bodies, own minds and RNG. |

Record source revision, flags, profiles, play inputs, actual identities, key
sought, sample/delivery time, picture source/age, interpretation, request and
achievement. Separate completed endings from unfinished windows and keep adverse
results visible. A changed gain is neither automatic failure nor evidence of
smarter football. Broaden only when a specific unresolved risk changes the next
decision; integration owns the full suite on the exact combined candidate.

## Evidence and teaching provenance

The [shared-model chapter](shared-model-and-learning.md), [trenches](trenches.md)
and [offensive-skill chapter](offensive-skill-and-playcalling.md) distinguish
installed jobs, personal keys, achieved leverage and tactile feedback. Previously
inspected Kuchar covered/uncovered zone, Grabowski brief-post/check and Parker
look–lean–climb examples support local conditional work. Their source ledger is
in the [OL technique review](../archive/reviews/offensive-line-run-technique.md).
The [defensive chapter](defense-and-perception.md) records inspected coaching
examples of role-specific keys and receiver obligations.

Those are coaching examples, not numerical gaze, attention-cost or memory
measurements. The all-role abstraction and post-mesh attention pilot here are
model hypotheses requiring the scoped controls above. Supplied generated books
remain reference aids, not project instructions or independently verified NFL
authority; see the [reference catalog](../references/README.md).
