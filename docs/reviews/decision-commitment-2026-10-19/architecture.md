# Commitment architecture audit (read-only)

Inspected `f4146275ce7539816bf57b4ed55a0d2be10e48c7` in `/workspace/football-decision-commitment`, 2026-10-19. Parent owns the fresh develop/queue check and source receipt. This audit ran zero tests and zero simulations and changed no runtime/test files. Attached prose is a hypothesis source, not a recorded trace. Physics/jitter PRs #162/#164/#165 are independent.

## Most useful new question: are we restarting overload after the exchange is already decided?

**Certain code behavior:** plain `ZoneCoverage` match technique admits a hesitation whenever at least two locally perceived threats are between 2 and 13 yards and `focus * (.5 + .5 * zoneCoverage) < .52`. On each decision beat it advances `nextPatternRead`, then sets `patternHesitationUntil` to that same new deadline, before checking the deadline. Therefore unchanged impairment and two routes continuously renew the spot-drop fallback. There is no uncertainty about which route, changed evidence, prior accepted carry, or progress-of-read requirement. This is `src/sim/behaviors/defense.ts:526–537`; the normal seam carry, including its attainable turn/run request, is after that early return at 539–554.

This is not literally standing still. `spotUnderneath` runs to its landmark if unsettled, then uses the acquired/QB throwing lane with a slower fixed-point arrival request (630–663). A defender can look unwilling to run with his seam even though he is executing that different objective correctly. Once `settled` is tagged, that fallback stays in its settled branch (635–638). `target` is not explicitly cleared by the fallback, so recorded target alone does not prove the carry still owns movement.

The threshold can be reached by a finite lapse, fatigue, or sustained congestion; it is not exclusively an extremely low zone rating. Critical focus is `.52/(.5+.5*zoneCoverage)`: zone .5 → focus .6933; .75 → .5943; .9 → .5474. These are consequences of the existing formula, not proposed ratings targets. A low-focus lapse often lasts only .2–.55 seconds, but low readiness/fatigue/congestion can sustain the condition (`mind.ts:28–52`).

**Execution scope:** actual path is `PlaySim.tick` → mind update → recognition → behavior update (playsim.ts:545–566). This hesitation exists only in a *plain zone subcontroller*. Rule-driven seats execute `CoverageDefender` → `runRule` → `CoverageJudgment` → current subcontroller (coverage/defender.ts:84–124). Thus it applies when that rule currently produces a zone, but not to its man/wall/trap/read-release subcontrollers. Pursuit, recognized flight, and acquired run fits precede hesitation (`defense.ts:388–400`). This is not an engine-wide explanation for linebackers or DL failing to flow.

**Existing opposing evidence:** `test/mind.test.ts:102–120` enters hesitation at focus .25, restores focus to 1, and checks recovery later. It proves recoverability after impairment disappears. It does not show a one-beat read resolves under unchanged impairment, or that an accepted carry survives an unrelated second route. Source comments say “can recover on the next read,” but deterministic renewal means recovery depends on condition removal; there is no accumulating information/read progress in this gate.

**Football interpretation, still a hypothesis:** two real routes and poor attention can legitimately delay a fresh exchange. Two route *count* alone does not establish an exchange, conflict, or reason to abandon an accepted seam responsibility. The consequential defect would be repeatedly replacing a valid carry with grass despite no contradictory information. A permanently unresolved two-threat picture may legitimately remain a zone decision, so forcing recovery after one timer would also be wrong.

**Smallest next probe (pure native-controller calls, no World needed):**

1. Fixed acquired two-route picture, one clearly carryable own seam and one separated shallow route. Establish the carry at full focus. Reduce focus under the existing threshold, keep all consumed pictures/installed duty identical, and call through four ordinary decision beats. Record actual request, objective metadata, target and fallback branch. Compare with a real crossing exchange where both routes plausibly compete for the same duty. The question is whether route count alone erases established responsibility.
2. Oppose any local correction with a newly acquired real threat/break and with recognized flight/current run cue. A valid contradictory cue must update responsibility/priority immediately through the existing opportunity; no universal “two reads” prerequisite.

**Recommended local direction if probe supports it:** bind hesitation to an unresolved change in the actor's installed match/exchange responsibility, keeping the already accepted technique while its evidence remains valid. An ordinary first slow read and uncertainty remain possible. Do not introduce a universal confidence state machine, permanent target latch, new fixed timer or guaranteed eventual correct answer. Name which installed rule owns the exchange before editing; otherwise this stays a precise limitation, not a guessed fix.

## What already commits properly (negative controls)

- **Run/pass recognition is already hysteretic.** `recognition.ts:168–241` maintains a filtered evidence scalar, prior and stable per-play bias. Unsure→run threshold is around .3 pPass; run→pass around .8; pass→run .16. It cannot alternate with every small threshold crossing. Ratings change gain/tau, prior trust, cue delay/focus and a stable bias, not random frame-level target changes. This is a good negative control against replacing everything with a universal commitment timer.
- **Pattern rules have durable installed branches.** `coverage/rules.ts:89–119,181–242,245–273,307–334` retains zoned/trap/flat/two/three decisions. Several are *more* persistent than a movement cache. “Nothing commits” is false. Existing release/declaration confirmation is .12*(1.6-.6*focus), and first/climbed state persists (`coverage/reads.ts:54–55,97–123`). Do not add redundant mandatory rereads on top of perception, declaration, recognition and movement cadence.
- **Same inside ReadRelease→Man match preserves technique state.** `coverage/defender.ts:127–134` returns the existing `ReadRelease.match()` when target and plain inside technique agree; `coverage/techniques.ts:44–61` preserves cushion, hip turn and stem confidence. This is the existing architecture's useful model for preserving a responsibility through a boundary.
- **Carrier lane decisions are already held.** `behaviors/carrier.ts:279–291` reevaluates on `decisionInterval`, with a .4 score hysteresis at 490–491, and immediate boundary recovery on physical need (324–340). Designed run read commits one answer and moves its entry with the blocks (`run-read.ts:182–214,247–250`). It hands back into ordinary lane planning once chosen (`carrier.ts:304–312`); this is not a literal unbreakable steering latch.
- **Blocker plans often hold entire observations and plans atomically.** Examples are `climbRead` (blocking.ts:960–981), pullRead (1124–1139), departureRead (1085–1110), collectionRead (1193–1204) and zoneRead (1300–1313), keyed by target and ordinary read deadline. Reuse these patterns instead of extending SnapMind's point-only cache across all football roles.

## Cross-layer interfaces that deserve focused witnesses

### 1. Point cache is not an action contract

`SnapMind.aim(job,desired,t)` (`mind.ts:72–79`) stores only `{pos,until}` under a string. It does not store responsibility identity, target identity, picture age, target velocity, moving/fixed meaning, entry speed or movement-mode authorization. Callers may use live mode/cue values with the held point. The already identified free-fit old-point/new-planner defect is one concrete witness, but it does not prove every caller is defective.

`alley-fit` holds position while `track` receives current acquired lateral velocity (`run-fits.ts:215–219`); `block-fit` is shared across climb/lead targets (`blocking.ts:1223–1232`) while retargeting lives on another deadline (`1045–1073`). These are **risk sites, not new causal diagnoses**. Need a trace showing the old point belongs to a different valid target or action before changing them. Acquired newer velocity with the same responsibility may be a legitimate feedback update.

Smallest coherent interface, if multiple callers need it: locally hold `{responsibility, target?, goal, goalVelocity?, pictureTime?, mode, readAt, nextRead}` as one decision at the owner, then derive current-body feedback every native tick. Do not move all this into a new global brain; extend only the affected owner's existing held read.

### 2. Technique replacement can erase motor/observation state

`CoverageDefender` reconstructs a subcontroller whenever `directiveKey` changes; its key includes receiver, leverage and overTop/trail (`coverage/defender.ts:88–98,127–147`). New Man starts hipsOpen/releaseObserved/routeRead false and has a new RouteObservation (`defense.ts:185–215`). A changed duty or newly acquired opponent can justify reinitialization; merely changing leverage on the same accepted receiver may not justify losing knowledge he has released. There is already one targeted preservation exception for ReadRelease→Man.

`CoverageJudgment` caches help on the normal beat; a primary receiver identity change bypasses the deadline, and air freezes its current override until technique throw recognition (`coverage/judgment.ts:20–29`). It rebuilds override from source primary every read. This is **possible responsibility flip/replacement risk**, not evidence that transitions currently cause repeated braking. Record job history and man state against actual consumed cap/break evidence before adding more exceptions.

### 3. Modifiers can suppress GO with no indecision upstream

Pipeline: behavior request → field containment for man/zone → engagement/tackle refinement → teammate spacing/gather/pass maneuver → World (`playsim.ts:561–607`). A strong original sprint with a low final intent means inspect these refinements, not “improve awareness.”

Coverage spacing passing maneuver requires known moving-objective velocity and finite peer ages; no metadata means it may retain ordinary slowdown instead (`spacing.ts:206–215`). `track` attaches a moving objective, but goTo/runThrough do not; only selected callers attach their own explicit objective (`common.ts:18–74`). This is an explicit eligibility/representation limit, not proof all GO commands should gain metadata or avoidance priority. Spacing currently observes teammates via a .05s global feed and a calledMotion correction from current behavior (`playsim.ts:592–597`, see:329–333); accepted awareness transport remains separate held work. Do not use this commitment task to sneak in hidden teammate intent.

### 4. Hard gates can hide continuity despite stable responsibility

Flow side >1.5yd/s, declaration surface LOS−1.6, force/inside surface conditions, lag .8yd/s and dynamic gap departure tests change modes or goals (`run-fits.ts:224–288,314–346`). Some defend legitimate cutback/force obligations; some create abrupt target changes. This audit does not reclassify all as bugs. For a slow actor, first identify installed duty, current belief, consumed cue, selected goal, raw request, final request and achieved velocity. That distinguishes hesitation, intentional patient leverage, impossible target, and physical loss.

## Ratings: what they actually do

- `playRecognition` and awareness map to physical visual reaction .16–.40s (`players/physical.ts:154–155`); SnapMind independently derives the same reaction basis and decision interval .07+reaction*.45+focus/stress terms (`mind.ts:28–35,59–64`). Lower ratings usually **lengthen held decisions**, not create more frequent dithering.
- Consistency affects stable snap readiness, placement/urgency error and chance of one finite lapse; discipline moderates urgency/alignment/lapse; composure controls stress/focus effects (`mind.ts:28–69`). Stable urgency also affects recognition thresholds. Low discipline can be too aggressive, not merely slow.
- Recognition affects filtered evidence gain/time constant and prior trust; anticipation/man/zone/focus affect bounded observed hip/plant forecasts (`recognition.ts:189–219`, `coverage-read.ts:12–38`). No future route lookup is needed.
- `pursuit` affects a stable per-play interception error and leverage; awareness shortens acquired-carrier tracking delay; workRate caps distant pursuit at .75+.2*workRate beyond 12 yards (`common.ts:93–137,202–219`). This is an explicit effort policy; not automatically a diagnosis of “low commitment.”
- Many surface/flow/technique gates remain identical across ratings. This can create shared sharp transitions even for high-IQ players. Ratings should influence evidence quality, interpretation/cost and urgency where coherent, not arbitrarily randomize a stable decision every tick.

## Parent recommendation

Prioritize the renewed-overload contract as the new distinct probe. Keep known free-fit/track defects and physical candidates separate. A useful change would preserve an accepted achievable responsibility through harmless added traffic while still transferring on acquired contrary evidence. If the fixed-picture pure probe cannot distinguish that from legitimately unresolved overload, retain this as diagnosis and select a saved native witness before implementing. No simulation count or yardage aggregate is needed to decide the immediate contract.
