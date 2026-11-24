# Quarterback decision-making: diagnosis and rebuild plan (2026-11-24)

Integration, at the user's direction: look at every system that feeds the passer's decision, decide how best to model
it, and plan the fix; rewriting is allowed. This is the plan of record for the QB work. It supersedes further feature
patches on the current controller. Lanes: read your section under "Who builds what".

Source of the diagnosis: a read of `src/sim/behaviors/qb.ts` (class `QBPass`, lines 945–3958), `src/sim/qbmind.ts`,
the read compiler (`src/playbook/read-compiler/`), the concept and route data, and the QB lane's records
(`docs/reviews/2026-11-11-qb-reads.md`, `2026-11-23-step-clock.md`, `2026-11-24-window-arrival.md` on
`claude/exciting-cori-hc8l4u`), on develop cb163c727 (engine-95). Line numbers are that commit's.

## 1. What is wrong

**1.1 The controller is layered patches, not one decision.** `QBPass.update` is one method of about 550 lines over a
3,000-line class with 73 flags.
- Five timing models decide when he leaves a read, joined in one condition (qb.ts:2022, 2068): a ratings dwell, the
  footwork beat, `ready()`, the key hold and a grass auto-advance.
- Six pressure responses run in a fixed order and the first to return wins the tick (1852, 2074, 2082, 2105, 2117,
  then `pocketMove`).
- Hot throws and rhythm throws skip the gates a normal throw must pass (1749, 1771, 2098).
- Out of reads he restarts at read 1 with no limit (2052).
- Thirteen problems each carry parked attempts beside the live one (pocket movement 6 off / 3 on, body facing 6 / 1,
  peek 3 / 0, key read on its third form).
- The same formula is copied with differences (urgency at 1806, 3334, 3363, 3580).
This is why one small patch (the step clock) surfaced three faults in a night: each fix lands beside four other
mechanisms that still run.

**1.2 His judgment of a window is a hand-built forecast of our own defense, calibrated to engines that no longer
exist.** `window()` (2896–3120) prices every defender through one of six arrival branches and about a hundred
constants. Several are fitted to old engines: `PHASE_MEAN 0.5` (engine-40 probe, "re-read when the defense changes"),
`PATH_PICK` / `CATCH_PICK` (engine-46/47), the believed drop rate. Nobody re-reads them, and the defense changed again
overnight (FLIGHT_BREAK). Measured result: defenders who reach the catch point by the ball are priced a median 0.58 s
late, while the path terms shut the window before the break. Specific faults inside it:
- `m = tt − total + estimateError + 3·rushOf(d)` (3036): a flat three seconds per unit of rush belief, on every
  underneath man.
- "Tied" adds 0.5 s for route contact, not a block.
- The coverer on the receiver is carried a fixed half of the way with him; his leverage, cushion and hips are not read.
- The defender's ignorance of the break after the release is not modelled; the break only caps his blind time.

**1.3 Plays do not tell him what to read.** A concept holds routes, a drop class and a hand-written order. The read
structure is compiled by running the play against parked defenders, then overridden by tables for 16 concepts
(`runtime.ts` KEYS, ROLE_KEYS, INSTALL_ORDER, SITS). Five different sources give a route's break time. Absent from the
data the passer receives: any pre-snap choice of side or route by coverage (the compiler generates `half_field` plans
and never selects one), a designated hot receiver tied to the protection, coverage-specific answers (each concept's
`beats` list is unused), authored checkdown rules, scramble rules, option routes.

**1.4 His coverage read never tells him what should be open.** He builds a belief over coverage families before the
snap and updates it twice after. It re-orders reads only while he is on read 1, sets how late he thinks defenders
react, and places defenders he cannot see. During the drop on most concepts his eyes sit on a fixed spot 12 yd
downfield (2322). His blitz expectation is set before the snap and never updated.

**1.5 A look resolves instantly.** One glance replaces his memory of a player. There is no time to process, so
ratings cannot produce a passer who stares a read down or one who darts past reads without seeing them, which is the
behaviour the user asked for.

**1.6 True-state reads to remove or justify** (the user's standing rule): memory seeded with exact defender
positions at the snap (qbmind.ts:242); pre-snap features from true positions plus noise with no sight test (287);
canonical looks keyed by defender slot labels and built from `sim.defCall` front/personnel/tags (235–239, 346, 734);
rushers' true `profile` and `speedScale` in felt time and hold (qb.ts:2782, 2749); `believe()` pulling his belief a
share of the way to each defender's true ratings (3135–3146: defensible as scouting, but then it must be a scouting
report, not truth times a rating); `laneDist` true leap (2142); `screenTouch` true profile and engagement (2885).

**1.7 What is not wrong.** Whole-play timing matches the NFL (release p50 2.65 s vs 2.60; on 10–19 yd throws the ball
leaves 0.85 s before the receiver's deepest point vs 1.00). The gaps are specific: stops released 0.3–0.5 s after the
break (NFL 0.1 before), outs 0.3 s late, and the early throws are the wrong kind (before 2.0 s the NFL's are half
flats and screens, ours are 89% quick routes; flats come late as a last resort). The vision cones, the felt rush, the
receiver forecast and the throwing mechanics are sound and are kept.

## 2. How a passer actually decides, and what we model

He does not price eleven defenders. He is taught a small procedure and executes it imperfectly:
1. **Before the snap** he reads the shell and the box, picks where the ball should go against that look (a side, a
   matchup, or an alert), and knows his hot answer if the rush outnumbers the protection.
2. **On the drop** he confirms or corrects that picture from one or two defenders (the middle-of-field safety, the
   conflict defender), not from the whole field.
3. **Each read belongs to a step of his feet.** The first read is thrown off the last step of the drop, the second
   off the first hitch, the third off the next. The drop's depth is paired with the routes' depth so the ball leaves
   as the route breaks. This is the one clock.
4. **On each look he answers one question from a few defenders:** the man covering the receiver (his leverage,
   cushion and hips against where the route is going), any defender sitting with eyes on him who can drive on the
   throw, and anyone in the ball's path. If yes, he throws to the spot, before the break. If no, his eyes go to the
   next read on the next step.
5. **When the structure is used up** he checks down, moves or throws it away, by what he feels.
His skill shows in how true his picture is, how fast a look resolves, how sure he needs to be, how many of those
defenders he actually accounts for, and what he does under pressure. Interceptions come mostly from the defender he
did not see or misjudged, not from a dice roll.

We model that procedure directly. It is football as coached, so its structure is not model complexity; the machinery
around it should be the simplest that produces it.

## 3. The design: a new passer controller (`QB_V2`), built clean

One flag, `QB_V2`, off until it clears its gates. It replaces the read logic, the timing models, `window()` and the
bars. It keeps and calls: `QBMind` perception and cones, `ReceiverForecast`, the felt rush (`pressure`, `felt`), the
throw mechanics (`startThrow`, windup, accuracy, THROW_HOLD, QB_STICK), pocket movement and THROWAWAY_FELT's decision.
Concept families move to it one at a time; a concept not yet ported runs the old controller. When every family has
moved and the gates hold, the old read logic and its parked flags are deleted.

Five modules, each with one job and one owner of state:

**A. The read plan (data, authored).** Each concept states its read as taught, in the data the passer receives:
- the read type: ordered progression; key-defender (conflict) read; structure pick (side or route chosen by the shell
  before the snap, confirmed after); alert then progression;
- for each read: the receiver or keyed pair, the footwork step it is thrown from, the defender role he reads and what
  that defender's movement means, and whether the throw is on the break (anticipation) or seen open;
- the hot answer and which unblocked rusher triggers it (a contract with the protection);
- the checkdown and when he is allowed to it;
- per coverage family, which read is expected to come open (so his coverage belief has a use).
The compiler stops choosing reads. It becomes a checker: it runs each authored plan and reports any read whose route
is not ready on its step, so drop and route depths are paired by evidence. One source of break time: the receiver
forecast, with the route's declared break as its prior.

**B. Before the snap.** From his shell read (already built) he produces a plan state: the starting side or read for
a structure pick, the alert if its condition holds, the hot threat and answer from the box count against the
protection, and the defender he will confirm on the drop. Ratings act on the quality of the shell read and on whether
he gets to the right answer; a fooled read is a wrong starting point he must recover from, which costs him a step.

**C. The look (eyes and resolution).** His eyes go to what the current step calls for: the confirm defender on the
drop, then the read's key or receiver. A look accumulates: resolved = 1 − e^(−dwell/τ), τ from his processing ratings,
slower when the look contradicts what he expected (disguise). This is the step clock's mechanism, made the base model.
What he has not looked at stays peripheral or remembered, with the error the cones already give. Defenders already
read his eyes (zone eyes, SPOT_LEAN), so where he looks has a cost; a look-off is a deliberate step in a plan, not a
random event.

**D. The judgment (replaces `window()`).** For the throw in question he considers defenders in three roles, each with
one physical model on his picture of them:
- **The coverer** (the man on the receiver in his picture): judged through the receiver's forecast. The coverer keeps
  his seen relation to the receiver until the break, then reacts to the break after his reaction time; whether he can
  get to the catch point by the ball comes from the body law (`bodyArrive`: seen position, velocity, facing; braking
  and re-acceleration). A corner bailing with his hips turned cannot get back to a stop; a squatting corner can. This
  is anticipation, and it is what lets the window clear before the break.
- **The driver** (a defender sitting with eyes on the passer, in range): starts at the release plus his reaction and
  arrives by the same body law.
- **The lane man** (a defender or a rusher's hands under the ball's path): geometry of the ball's arc against his
  reach at the moment the ball passes.
He accounts only for defenders he has in his picture well enough: the coverer always, plus as many drivers and lane
men as his vision and the look's resolution give him. A defender he never saw is not in the judgment; that is where
the robber's interception comes from. The output is two numbers he acts on, a completion belief and a risk belief,
with spread from the look's resolution.
- Believed reaction, speed and ball skills of a defender come from a scouting report (typical for the position plus
  what film would show), never from truth scaled by a rating.
- No fitted constants. The few stated choices (reach margins, the secure-catch interval) are labeled.
- **A calibration contract replaces hand re-fitting:** a standing test and report compare believed against actual
  outcomes by role on the current engine, for a mid-rated passer with a resolved look. When the defense changes and
  the judgment drifts, that test goes red and names the role. The judgment is repaired by fixing the model of that
  role, not by moving a constant.

**E. The cycle (one state machine, one clock).** States: pre-snap, drop, on a read (step n), throw, out of structure.
- The clock is his feet: read n is live on step n. On the step he throws if the look is resolved to his need and the
  judgment clears his bar; otherwise his eyes move at the next step. No separate dwell, beat, key-hold or
  auto-advance.
- His bar comes from his temperament and falls with urgency; his need for a resolved look comes from composure and
  discipline (the step clock's `confidenceNeed`). A passer who needs too much stares down; one who needs too little
  leaves before he has seen it.
- Pressure is one input with one ordered response: hot if the hot threat shows; else speed up (shorter look, lower
  bar); else checkdown; else move in the pocket; else leave it; else throw it away (THROWAWAY_FELT). Every throw,
  hot and rhythm included, passes the same eyes-on-target requirement or pays for skipping it in accuracy and risk.
- Out of structure is its own state: one more pass at the lowered bar through reads that are still alive, then the
  checkdown, then extend or throw it away. No unlimited restart.
- Commit to a decision applies: a read is left once; thresholds have enter and exit margins; the dither budget covers
  the new controller's stages.

## 4. Order of work and gates

Phase 0 (now, in parallel, no behaviour change):
- measurement harness and the calibration operator;
- authored read plans for the first two concept families;
- defender-side facts for the three roles;
- leak fixes of §1.6 on the current engine as their own small landings.

Phase 1: modules C, D and E for the quick game (slant-flat, stick, hitches, quick outs) with authored plans. Gate
below. Phase 2: dropback progression and key reads (curl-flat, smash, dagger, mesh, y-cross, flood, levels, verts).
Phase 3: module B's structure pick, hot contract with protection, play-action. Phase 4: screens and RPO, then delete
the old read logic and parked flags. Out-of-structure and pocket movement are ported as needed by each phase, not
redesigned first.

Gates for each phase, on the families it covers, same operators as the NFL where a comparison exists:
- **release minus break** by route family (stops, outs, ins, slants) against the NFL's;
- **what is thrown when** (target class by release-time band; flats and backs on rhythm, not as a last resort);
- **calibration:** believed against actual completion and interception by role, within the stated tolerance;
- **the rating panel:** passers at 35 / 60 / 88 differ in the taught ways (the low one stares down or leaves early and
  misses the driver; the high one is on time and sees him) with no rating awarding an outcome;
- time to throw distribution, sacks, throwaways, scrambles, interceptions: reported and explained, never tuned;
- no new true-state read (decision-information guard and scan); dither budget; red-diff.
A worse statistic is not a veto; an unexplained one, or one caused by a bug in the new controller, is.

## 5. What stops now

- No further feature patches on the old controller. The step clock is not rebased and landed; its mechanism (look
  resolution, confidence need, a hold only on a look that is resolving) moves into modules C and E. Its branch and
  record stay.
- The window-arrival / anticipation build continues, as module D's coverer model, not as another term in `window()`.
- Leak fixes and bug fixes on the old controller still land, since it stays live until Phase 4.

## 6. Who builds what

- **QB lane (owner of `QB_V2`):** modules C, D, E. First deliverable: a short design note for D's three role models
  and E's state machine with the state fields named, then Phase 1. Also the §1.6 fixes in qb.ts (rushers' true
  profile and speedScale, `laneDist`, `screenTouch`, `believe()` as a scouting report).
- **Rules + Coaching:** module A's content. For each concept family in phase order: the read as taught (read type,
  each read's step, key defender and meaning, on-break or seen-open, hot, checkdown, expected answer by coverage
  family), sourced and paraphrased; and the drop paired with route depth. One standard version per concept; variants
  are later scheme options. Also the NFL side of "what is thrown when" and release-minus-break by route, with the
  operator checked on plays.
- **Coverage:** the defender-side facts D depends on, per technique: what the coverer is doing relative to the
  receiver before the break and what cue releases him; which zone defenders are drivers and from what cue; so the
  QB's three roles describe the engine as it is. Plus the pre-snap disguise the passer should be able to be fooled
  by, when that work is un-parked. Review D's note for information honesty from the defense's side.
- **Flex:** module B. The pre-snap plan state (structure pick, alert, hot threat from box against protection, confirm
  defender), and the qbmind.ts fixes of §1.6 (exact seed, sight-free pre-snap features, slot labels and call tags in
  the canonical looks). Motion as a man/zone tell stays parked with the pre-snap movement work.
- **Tools:** the harness. The calibration operator and its standing test; the rating panel; release-minus-break and
  target-by-time tables on both sides; a per-stage command trace for the new cycle so dither-core covers it.
- **Defense, Run Game:** no change of work. The protection side of the hot contract comes to whoever owns protection
  when Phase 3 starts; until then the QB reads the protection's count as he does now.
- **Integration:** reviews the design notes before code, cards each phase, lands it, and deletes the old path at the
  end.

Reports stay short and come when an item is done. Where the football as coached and a fine-grained measured number
disagree, say so; the number is as likely to be wrong.
