# Visual keys and attention

Follow-up to `24f0f31` on `claude/engine-priorities`, prompted by the owner's
request for explicit visual keys on defense **and offense**. This is an
implementation design, not a shipped vision system or measured improvement.
The current coverage/pocket results and remaining priorities are in
[coverage judgment and pocket mechanics](coverage-judgment-and-pocket-mechanics.md).
Full QB footwork, throwing base and pressure memory remain later work.

## What the engine already does, and the missing constraint

The engine already contains football keys. `Recognition` weights line,
puller, QB, back and receiver cues by position. `ReleaseReader` classifies
observed receiver movement; coverage rules key numbered receivers. Delayed
images, confirmation, stable judgment error and finite movement make those
reads imperfect. These systems should be retained, not replaced by generic
random decisions.

However, attention does not adequately constrain **acquisition**:

- `PlaySim.see` returns a delayed estimate of any requested player. It does
  not check gaze, visibility or whether that player was being watched.
- `Recognition.cues` samples all five offensive linemen plus the backfield
  each update. Position weights decide how much evidence counts, not which
  movement a player could actually pick up.
- `ReleaseReader` and coverage help can inspect multiple eligibles in a tick.
  Help has a body-facing visibility check, but no shared acquisition budget.
- `SnapMind.keyAttention` discounts guard evidence during a preselected
  lapse window. It does not describe a linebacker actually looking from a
  guard to the back and missing the guard's next step.
- `ProtectionCoordinator.isRusher` uses defensive `behavior.kind` and current
  movement. Protection can identify a hidden rush/blitz job before its own
  player has seen evidence for it.
- Body facing stands in for hips and much of gaze. `sawThrow` uses facing,
  global release/windup timestamps and delays rather than acquired images of
  throwing motion. Recognition likewise uses global throw/handoff timestamps.

The next layer must control what evidence reaches these readers. Adding
another recognition rating or delay to unrestricted reads will not fix it.

## The compact player model

Give each player a taught responsibility, a **primary key or key region**,
an allowed secondary scan, a last observed picture, a belief with confidence,
and a committed action. Keep the existing physical movement limits.

The loop is:

**select key -> acquire visible cues -> update belief -> apply football rule
-> choose technique -> move -> reassess when evidence changes.**

Distinguish three questions: What could he see? What does he think it means?
What is he taught to do about it? Experience can improve interpretation and
anticipation; it cannot expose an opponent's hidden assignment.

Do not force everyone to stare at one exact player. A guard/back triangle or
#1/#2 triangle is a useful region. Peripheral motion can draw attention
without immediately revealing a precise plant, possession or route break.
Separate head/gaze from hip orientation with finite turning and acquisition
costs: opening to run with a receiver need not eliminate a shoulder glance.
Long backward looks and abrupt gaze changes still have costs.

Contact is another evidence channel. A lineman can feel pressure, hand
control and a blocker's movement while looking elsewhere. Collision and
engagement physics continue to use actual bodies; observation limits apply
to decisions, not to whether unseen bodies collide. Feeling contact must not
expose the opponent's play call or `engagement.type` as football knowledge.

## Initial teaching templates

These are installation examples, not universal NFL instructions. The
coverage call, front, technique, formation and coaching style select the
template. Keep different coaches' valid keys available.

| Role / technique | Primary key | Useful trigger and resulting action | Natural mistake |
|---|---|---|---|
| Press or trailing man corner | Receiver's midsection/hip path; release leverage | Visible turn/plant changes leverage; look for the ball when position and receiver cues permit it | Peeking into the backfield loses a step; reacting to the first plant exposes a double move |
| Palms/trap corner | #2 through the #1/#2 triangle | Confirm shallow #2 out, check the visible picture above #1, then drive the out under the called exchange | Late #2 read or misplaced trust in help opens the hole shot |
| Quarters safety | Called #2 / tackle-to-#2 key | Maintain roof over a vertical; collect run/block evidence before fitting; help #1 as the installed rule permits | Low pads draw him down while a receiver still threatens the seam |
| Hook/apex defender | Called inside eligible, with permitted backfield glance | Wall a seam, cut a visible crosser, then find the next threat when the exchange allows it | Following the shallow too long exposes the dig behind him |
| Interior linebacker | Assigned guard-to-back triangle | Pull/down/reach movement informs fit; then locate the back and block leverage | Backfield fixation misses the pull; over-trusting the pull loses a counter or play-action window |
| Defensive lineman / edge | Adjacent blocker, supplemented by contact | Read set/low pads, shoulder movement and pressure; execute called rush or squeeze/spill/box technique | An aggressive inside counter sacrifices outside leverage or the escape lane |
| Pass protector | Assigned threat's near hip/torso plus inside danger region | Maintain leverage; visible crossing penetration and an available neighbor permit a pass-off | Watching the looper too early loses the penetrator; a mug bluff holds attention after the threat drops |
| Combo blocker | First-level defender, then keyed backer when block control permits a glance | Secured leverage and observed backer approach permit climb | Leaving without control exposes penetration; staring at the double misses the backer |
| Puller / lead blocker | Clearance ahead, then the intended kick/wrap region | Arrive under control; wrong-arm leverage can require log rather than kick | Tunnel vision on the original target misses penetration or takes the wrong shoulder |
| Running back | Concept aiming point and ordered block reads | Press the landmark, read defender/block leverage, then commit within braking/cut limits | Leaving the press early brings a linebacker into the cutback lane; a late read overruns the crease |
| Option / sight-adjust receiver | Called leverage/pressure key | Convert only on acquired evidence shared with the QB's installed rule | Receiver and QB interpret the same rotation differently |

Support for the coverage distinctions is recorded in
[coverage terminology](../../research/coverage-terminology.md), especially its
Palms, quarters, Rip/Liz, Cover 1 and pressure sections. Run/blocking examples
and their source limitations are in
[run-game coordination](run-game-coordination.md). The owner's generated
textbooks are aids, not verified universal coaching instructions. Exact gaze
limits, thresholds and acquisition rates below require explicit model
assumptions and validation.

## Evidence, uncertainty and mistakes

An observation should carry target/region, acquisition time, sample time,
quality, position/movement and the cues actually resolved. A remembered
picture can be predicted forward, but its uncertainty must grow. Prediction
does not count as a new confirmation sample: a fake seen once cannot become
a confirmed break solely because an old picture keeps being replayed.

Use precise central cues, coarse peripheral cues, and last-seen memory as
different inputs. Add occlusion in a separate step so its cost can be
measured. In particular, inability to see the ball or an obscured guard is
missing evidence, not proof that the play is a pass or the guard stayed put.

Belief combines acquired movement with legitimate situation/scouting priors.
Do not count correlated cues as independent certainty. Confidence and
discipline control when a player commits; contradictory evidence can reverse
that decision after finite reacquisition and movement costs. A severe visible
threat can interrupt a scan, but the alert must come from acquired motion or
communication rather than a global search of uncapped receivers.

Stable player error, conflicting keys, fatigue, contact and urgency can
produce a bad anticipation or backfield fixation. Do not generate a new bust
roll every tick or replace the old lapse timer with a new scheduled peek.
Brief commitment/confirmation intervals describe executing an action or
collecting evidence; they must not say "jump the route at 1.2 seconds."

For example, a safety can read the backfield while #2 plants, then regain
the receiver and arrive late. A disciplined safety may wait for another cue;
an aggressive one may trust his first impression and jump the short break,
exposing the second move. An interception should follow the resulting flight,
position and catch interaction. Interception frequency is already too high;
the purpose is better decision anatomy, not an interception boost.

## Implementation boundaries and order

1. **Instrument acquisition before changing outcomes.** Introduce a shared
   observation/attention interface behind the existing readers. Report gaze,
   primary/secondary key, cue sample age/quality, belief, trigger and action
   reason in `coverage-trace.ts`. Keep a diagnostic legacy mode for paired
   experiments. Cached reads must not let call order or repeated `see` calls
   create extra observations in the same tick.
2. **Pilot one coordinated coverage exchange.** Palms is a clear test: corner
   and safety observe complementary keys, retain their responsibilities and
   can disagree briefly. Test an out/vertical, vertical/vertical, delayed
   release and out-and-up. Extend to Buzz only after tracing the current
   rotation failure, including run/pass key acquisition and pursuit.
3. **Make protection identify visible threats.** Keep the declared protection
   as the coached pre-snap hypothesis, not a list of known rushers. Resolve
   each blocker's mug/drop, penetration and exchange reads locally. Model
   communication with a sender, actual message and finite delivery; a shared
   coordinator may prevent duplicate assignments but must not distribute
   unseen current state. Do this alongside the remaining early free-rush
   diagnosis, separately from contact-normal/edge-lane physics corrections.
4. **Extend to run fits and offensive reads.** Guard-to-back reads, combo
   releases, puller target changes and RB block reads use the same acquisition
   contract. Teach concept-specific key order, including different fronts,
   before introducing attention costs globally.
5. **Later, connect QB vision to full throwing mechanics.** Defender reads of
   QB shoulders/throwing motion should use acquired cues rather than target
   IDs. Precise QB eye direction is not implemented; body orientation is a
   coarse cue. A future QB model owns deliberate looks, pumps, feet/base and
   pressure memory. Do not silently assume those mechanisms already exist.

This is a staged extension of existing football rules, not a reason to delay
the known pocket-width/contact-direction fixes or rebuild every behavior in
one unmeasurable change. During migration, explicitly label legacy reads;
otherwise an unrestricted helper can bypass the new acquisition model.

## How to verify it

Behavioral tests should establish that:

- identical visible cues produce identical reads when the hidden call changes;
- an unseen break does not update a precise route belief until reacquired;
- peripheral crossing motion can draw a scan without declaring an exact route;
- looking from the guard to the back delays the next guard detail, rather
  than erasing useful remembered evidence;
- independent Palms readers can make a late exchange and subsequently recover;
- maintaining an uncapped responsibility takes precedence over speculative help;
- a mug player dropping cannot remain a known rusher solely because of a
  hidden behavior label, and contact remains physically valid out of gaze;
- repeated requests and iteration order cannot increase acquisition bandwidth.

Keep fixed rosters/calls/traces and compare cue acquisition -> belief ->
commitment -> physical response. Measure missed/recovered exchanges,
completion separation, YAC and interception anatomy alongside results. For
protection, retain width/depth, first attached/free proximity and sack timing
so an attention change cannot hide excess free rush wins with other errors.

Big Data Bowl movement/orientation, route/play labels and event timing can
constrain plausible response paths and delays. Tracking direction or body
orientation is not eye gaze; most records do not identify what a player
noticed, his exact assignment or why he reacted. Use coaching to propose
keys and tracking to test consequences. Do not claim that inferred attention
is directly measured NFL cognition. Paired game guards remain necessary
after isolated tests; improved aggregate scoring alone is insufficient.
