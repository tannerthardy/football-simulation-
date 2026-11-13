# Forensic architecture investigation — exact c4a03f6463eacb23ce63d01bd32b4f8b547b9bc0

This supplement revises the first audit's emphasis. The strongest evidence is not that a missing universal decision framework explains the project. Existing decisions sometimes have incompatible identities, inconsistent knowledge sources, or a meaning that changes downstream. Those are concrete contracts to repair. A new shared envelope can record them, but it does not automatically repair them; an extra scheduler can make some worse.

The evidence includes a passive instrumented native game, exact native play restaging, two controlled cache experiments, a native scheduling intervention, and a four-arm native possession-acquisition experiment. Production tracked source and plans were not edited. Sandbox `./sandboxes/architecture-game` contains neutral hooks and one default-off experimental acquisition gate. Scratch production imports are under ignored `out/forensic-architecture`.

## Reproducibility and scope

The ordinary game is exactly the prior audit film: seed 7, `generateTeam` called sequentially with Rng(7), Ironmen/Comets strength .55, game seed7, native coaches, styles, energy, scouting and audibles, record/light. The instrumented run's entire `packReplayPlay` array is exactly JSON-equal to the existing native film, not merely equal scores. Score 36–29; 127 live simulations; 11,500 ticks. Contact specialist's passive hook ran simultaneously and therefore shares this neutrality check.

Every pre-constructor PlaySetup is saved, before pre-snap mutation, including Map energy and class scouting state. Class-preserving JSON reviver is supplied. A seed by itself or a call/player pair is insufficient to recreate these native plays. P002, P029, P064 restaging checks match original events and results. The selected stage traces are P002, P011, P017, P019, P029, P031, P038, P060, P117, P142; they were selected for film questions and are not a random sample.

Evidence root: `./evidence/architecture/`. All setup files use `G1-Pxxx-setup.json`; selected detailed files use `-trace.json`. `ordinary-census.json` contains the equality assertion and stage-change census. `instrumented-film-plays.json` preserves the exact neutral packed film. Full trace volume is approximately 175 MB. Scripts are copied under `evidence/architecture/scripts`; runnable import paths refer to their original sandbox/ignored-source locations. `instrumentation-playsim.diff` shows neutral hooks. Collector executes once; do not accidentally import collect.ts as a utility.

The optional flagged gate added later to sandbox `defense.ts` is only enabled by catch-deferral.ts and only for the SS. It is not a production change and was not enabled in the neutral census.

## The actual tick is a mutable sequence, not one decision followed by execution

Production `src/sim/playsim.ts:943–1047` performs:

1. Record all authoritative bodies and holder into a perception history at t.
2. Update all minds using delayed nearby-opponent workload, then incidental catch readiness, then all defensive run/pass recognizers.
3. Prepare coordinated run blocks.
4. In fixed agent-array order, update one behavior. This can change the ball, another player's behavior, another blocker's plan, or an engagement. Then contain eligible coverage commands and change the turn path with openToBall.
5. Copy commands into intents; attach dive/lunge; update block engagement technique; update tackle bond technique.
6. Resolve teammate spacing using acquired teammate motion and announced called motion, with real constraint ownership suppressing some free forecasts.
7. Apply snap-ready guard. Advance World by dt.
8. Resolve body consequences, ball advancement/catches, tackle attempts, whistle and penalties. A catch can replace every behavior here.
9. Record endpoint state/intent under t, then increment t by .05.

The ordered decision pass is not automatically wrong. Immediate hand contact and rehearsed teammate coordination can legitimately affect later technique. But commands and plan metadata no longer necessarily describe one simultaneous decision. A consumer must explicitly know whether it reads (a) the installed job, (b) the job at that actor's decision, (c) a later shared update, or (d) the job at the endpoint after a catch. This distinction is currently missing from ordinary replay records.

Source anchors: `playsim.ts:964–966` raw/contain/open; `977–978` engagement/bond; `990–1000` spacing/snap guard; `1015` World; `1040–1047` ball/tackle/record/time. Actual field timing should be identified as interval start and endpoint, not silently shifted to make charts look aligned.

## Finding A: shared action cache does not encode the identity of the target

Confirmed controlled bug and two native command/physical effects. Ordinary incidence requires a consumption-and-propagation census, not screenshots of retained memory.

`SnapMind.aim(job,desired,t)` at `mind.ts:73–78` returns the old point until its deadline whenever the string job matches. It does not know target, responsibility revision, or coordinate frame. This investigation targets two literal keys: `blocking.ts:1478` (`block-fit`) and `defense.ts:539` (`zone-drive`). They are not the only aim consumers. Source inspection finds eight direct production calls: those two, four in `run-fits.ts:275,332,423,464` (`alley-fit`, `edge-fit`, and two `run-fit` calls), `force-track.ts:41` (`force-fit`), and `engagement.ts:1014` (dynamic `run-contact` keys containing blocker identity and sometimes fit mode). The force tracker already retains point and velocity together (`force-track.ts:37–49`); engagement already retains target mode/flow alongside the adopted aim (`engagement.ts:1015–1027`). These are existing examples of the consistency repair being proposed, not missing framework features. Most other sophisticated blocker caches already carry a target field and invalidate on mismatch; do not generalize this into 'all caches are broken.'

The decision-research specialist independently reproduced block-fit retargeting. I reproduced the analogous coverage path with production ZoneCoverage.update. Two stationary acquired threats are in a deep-middle defender's zone. At t2.00 Y is deeper and is selected. At t2.05 X becomes deeper and is selected; the final probe uses a .02yd acquired-position change across the depth-ranking tie, rather than a large geometric jump. Target metadata changes to X (`defense.ts:536`) and its current velocity is fed into track (`540`), while aim('zone-drive') still returns Y's point (`539`). The cached point expires only at 2.17098367.

Native second command is (-5.544829, -5.391191) yd/s, aimed toward old Y. Adding target identity to the existing aim key makes the second command (-5.642357, +5.104036), aimed toward X. First command and same-target controls are exactly equal. No physical capability, observation or randomness changes. `zone-cache.json` records both arms and controls; `out/forensic-architecture/zone-cache.ts` is the executable probe.

This is a semantic consistency failure, not proof of an incorrect reaction duration. Two legitimate fixes exist: keep target AND action committed until the read expires, or permit retargeting and invalidate the old action together. A new framework must not unconditionally make every new target instant; real commitments and mistakes should remain. What cannot be justified as a coherent decision is selecting B, using A's held location, and potentially B's velocity under one action label.

### A critical negative result

Native P029 RT appears to have exactly this defect in endpoint snapshots: target17 changes to target15 at2.60 while the old block-fit cache remains. I restaged P029 and wrapped its existing aim call to invalidate on target identity change. There were ZERO activations after a target change, ZERO command/body changes and exactly equal events, 4.56 yards and3.60s. The new target goes through a contact branch and does not consume the retained old aim. `native-cache.json` preserves this null result.

Therefore a detector that flags 'target changed while old cache exists' is wrong. Instrument **cache consumption**, who created it, what identity it belongs to, and whether it is actually returned. The parent audit then ran that census across all130 captured setups (127live,3pre-snap rejections), and checked whether the returned aim actually propagates into the emitted command. The additional result below resolves ordinary incidence in this game.

### Native consumption and propagation follow-up (parent audit)

The parent independently instrumented the two exact aim keys, retaining the active RunBlocker/ZoneCoverage object so wrapper targets could not contaminate attribution. There were2,915 block-fit calls and65 zone-drive calls. Thirteen calls returned an unexpired aim made for another target, across six plays: P093, P095, P129, P149, P159, P160. Seven instrumented baselines (those six and negative-control P029) matched their neutral baseline checks.

Invalidating on target changes produced actual command and physical differences in only two plays:

- **P095 FS at3.00:** selected Z but inherited X's aim. Native raw and final velocity(3.423137,-7.164664) becomes(4.698034,+6.401464). First position difference at interval endpoint3.05; maximum position difference.719254yd. This is a natural-game witness of the synthetic coverage failure.
- **P093 F at3.70:** raw velocity(-.315419,3.395919) becomes(-.069109,2.900529); spacing modifies both afterward. First position difference3.75; maximum difference.029760yd.

All final outcomes, yards and duration remain unchanged in these paired plays. The full PlayResult differs in those two because recorded trajectories differ. In the other four plays, the stale aim was returned but then unused because the later CLIMB_PLAN branch (`blocking.ts:1503–1513`) selected its own planned approach. Their complete results remain equal. Some unused stale points are nine or ten yards from the new desired aim; the number alone greatly exaggerates real impact.

This produces a useful three-stage ladder: retained stale state(P029) → stale result computed but overridden(four plays) → stale result reaches raw/final command and moves the body(P093,P095). A regression detector must climb this ladder before alleging a field defect. The strongest support is now a small, directly tested cross-target consistency repair across two roles, not a general decision rewrite. Summaries copied as `root-aim-census.json` and `root-aim-native-summary.json`; full trajectories and executable parent scripts remain in `out/forensic-root/aim-native-traces.json` and `aim-native.ts`.

## Finding B: two independent routes inject true possession; fixing either alone can do nothing

Confirmed ordinary-game timing, plus a native four-arm causal experiment. This is stronger evidence for a knowledge-source contract than the first audit's synthetic hidden-state pair alone.

`assign.ts:322–327` immediately replaces all defenders with Pursuit when an offensive catch occurs. `Pursuit.update` at `defense.ts:961–969` reads `sim.carrier` and chases it. Its motion picture is delayed, but holder identity is authoritative. Independently, legacy `pursueIfLive` (`defense.ts:54–63`) selects the authoritative holder and requires position/read timing rather than an acquired carrying cue. Existing ManCoverage then also permits that chase using global catch/throw flags (`defense.ts:296–300`). Thus delaying the event-driven replacement alone leaves a second route to the same knowledge.

The native P002 catch occurs at3.30. SS becomes Pursuit for3.35. At3.35,3.40 and3.45 every holder picture consumed by that SS's behavior reports carrying=false; its newest picture has age .15s. Carrying=true first arrives3.50. The old acceleration picture remains false longer; those historical negatives must not be counted as failure after a newer positive is present.

Across the ten selected traces, 3,844 defender updates query the authoritative non-QB holder. In367 of those, **none** of the carrying samples requested during that update is true.103 are already Pursuit. This is an exposure count, not an error rate: other ball-flight cues may justify anticipation, earlier run recognition may already justify the same fit, queries may support other branches, and these ten plays were selected. `acquisition-census-selected.json` states these limits. The full game's raw11,073 false-carry queries include deliberate older acceleration samples and duplicates and must NOT be described as11,073 unacquired decisions.

### Four-arm native intervention on P002 SS only

The player, game setup, actual catch, physics, all other actors and pre-catch execution are unchanged. This is a local causal investigation, not an approved football policy.

| Arm | Change | SS motion/result |
|---|---|---|
| Native | Current source | 32.30yd,8.80s |
| Delay replacement only | Keep old man behavior until existing .15s pursuit picture acquires carrying | Identical SS raw commands and positions, identical events,32.30yd |
| Gate helper only | Require acquired carrying in legacy pursueIfLive, for this SS only | Identical SS raw commands and positions, identical events,32.30yd; Pursuit bypasses helper |
| Both | Delay replacement and gate legacy helper | First raw difference3.35;32.30→27.16yd,8.80→7.15s; max SS displacement from native at equal times1.31553yd |

At3.35 native command is (-5.864907,+5.187985). Both-path correction yields (+.301618,+9.296459), continuing its previous coverage response until acquisition. File `catch-deferral.json` preserves all arms and per-tick actor RNG snapshots. The shared sim RNG state is exactly equal in the arms at the first changed command, so that first divergence is not an extra random draw. The flag in the isolated sandbox gates only the specified SS, and no physical rule changes.

Do not read the shorter gain as proof that delaying knowledge improves football realism. A three-tick movement change can alter geometry, contact, later stochastic draws and play termination. This single native experiment establishes that the distributed possession paths can have material consequences, that either obvious isolated repair can be a no-op, and that a global wrapper with unchanged consumers would be a no-op too. Real football permits anticipation of an imminent catch; the eventual policy should represent that as uncertain observed flight/catch evidence, not infer it from a future-known holder.

A useful implementation target is a small **carrier/acquisition belief** consumed by these exact transitions, with explicit direct evidence, anticipation and team communication. Do not immediately convert every behavior to a universal new brain. Pilot these duplicated paths, retain current movement and contact controllers, and test pre-catch responsibility/late acquisition counterexamples.

## Finding C: a real within-tick shared-plan mutation, with small demonstrated consequence

Production `RunBlocker.readRules` at `blocking.ts:1618–1643` can swap two adjacent blockers' plan targets and reclassify both. It considers each receiver's own delayed picture when classifying; this is already a thoughtful correction. However, the recipient may have already emitted its command earlier in the same decide loop.

Native seed7 has8 block_exchange events across7 plays. P064 at3.30 is a direct witness: C index3 exchanges with RT index2. RT has already emitted its old reach-to-target11 request (-2.950787,+2.041486), facing1.778291, posture.7. The later C update changes RT to climb-to-target15. The old command still executes in this interval. The behavior code's comment recognizes that the recipient 'may not have updated yet'; both directions actually occur.

Controlled intervention: execute that same C rules-read at the existing pre-decision boundary on that same tick, and set its existing nextRuleRead deadline so it is not read twice. No new RNG is drawn by readRules/classifyWork. Native and intervention both finish tackle,4.44yd,3.60s; only RT endpoint changes, by.128514yd. P054 is an order counterexample: its exchanger index1 changes recipient index5 at2.90, so recipient has not decided and sees new work in the same sweep. The resulting timing is recipient-index dependent.

`plan-order.json` records before/after identity, exact recipient command and both native/intervention outcomes. These are real shared-state semantics but **not evidence this is a dominant football defect**. Most events occur late, and this witnessed effect is modest. A global ECS/scheduler rewrite is not justified by .13yd alone. A narrow coordinated-plan exchange phase or explicit pending-message effective-tick field is enough if the project chooses to remove this ambiguity. Do not 'fix' it by secretly recomputing another actor's full behavior twice: that can advance caches, observations, RNG and side effects twice.

## Finding D: final intent and endpoint labels can conceal where an action came from

The neutral game has253,000 actor-ticks (11,500×22). The census compares velocity and explicitly specified facing across each stage, not every posture or identity change:

| Stage | Actor-stage changes | Requested velocity opposed previous velocity |
|---|---:|---:|
| Coverage containment |1,287|1|
| Open-to-ball turn path |72|0|
| Engagement technique |48,301|273|
| Tackle bond |1,912|356|
| Teammate spacing |18,872|797|
| Final snap guard |50|0|

These are not failure counts. Contact techniques are supposed to replace a free movement request; a turn-path change can be correct; radial spacing can sensibly brake or reverse a requested component. They quantify why 'the brain chose the wrong velocity' cannot be inferred from the final intent alone. Largest selected free-looking discrepancies often actually belong to a newly created grasp/contact that was absent at the earlier pre-decision snapshot.

Example: P031 SS2.90 raw-to-final velocity difference11.8776yd/s is spacing-owned; any explanation based only on pursuitPoint is incomplete. P002 late FS changes are mostly tackle-bond owned. The history/locomotion specialist has these traces for actual geometry diagnosis.

The replay recorder `telemetry.ts:57–74` reads current behavior and current target when recording the final intent. Catch/lifecycle updates already happened. At P0023.30, SS executes a man/play-ball command and physically moves. Then the catch replaces his behavior with Pursuit. Endpoint replay therefore pairs Pursuit metadata with an intent generated by the prior man/play-ball policy. No physical bug is implied; there is a causal-label mismatch for an evaluator interpreting the row as 'Pursuit decided this.' Similar mismatches occur after another blocker changes the recipient's plan mid-sweep.

Cheap, high-value logging improvement: record the actor's **decision-time owner and target**, raw request, each modifier's before/after diff and reason, final executed request, and endpoint owner separately. Give interval-start/endpoint timestamps. Preserve complete native constructor inputs and RNG state. Keep this optional; the neutral hook proof demonstrates the information can be captured without changing the simulation. A schema is useful here precisely because it records actual execution; merely attaching a plan label at the end is misleading.

## Implications for the first roadmap

1. Keep stage-aware provenance and native reproducer capture at the front. Exact native inputs cost less than building and debugging an approximate 'same play' restager.
2. Elevate target/action cache ownership to a small concrete pilot. Acceptance: changed-target, same-target, A→B→A within a deadline, expired cache, reaction delay, and contact branch nonconsumption. Hold target+action together or invalidate together. Costs: small implementation, medium football semantics/testing.
3. Elevate acquisition-source consistency as a medium pilot across a deliberately small set of duplicate consumers. Both-path intervention supplies a useful negative-control structure. Acceptance: each isolated fix expected no-op in the witness; combined acquired belief removes oracle access while anticipatory catch judgment remains possible; same physical setup and pre-evidence traces stay equal. Costs: medium because event, fallback and uncertainty semantics interact.
4. Reclassify a universal responsibility envelope as conditional architecture, not a proven cure. Require it to solve a contract issue that local source-of-knowledge and lifecycle repairs cannot solve without duplication. Do not add another independent decision timer on top of existing mind/recognition/coverage/blocking reads.
5. Keep within-tick plan exchange as a low/medium engineering issue unless a broader census shows systematic material failures. Its important immediate consequence is trustworthy attribution and deterministic semantics, not proof that all actors need a transaction framework.
6. Keep downstream physical/control investigations separate. A smarter top-level selection cannot fix an optimistic reach estimate, impossible tackle acquisition or an incorrect impulse law. Conversely a valid requested reversal does not promise immediate actual velocity reversal.

Useful acceptance families are semantic rather than 'player looks smart': same target and evidence should preserve a held action; changed responsibility should not borrow another target's action memory; hidden holder changes should not affect policy when the actor's evidence is fixed unless an explicitly modeled communication channel changes; identical input semantics should have identical experiment semantics; every observed endpoint movement should be attributable through actual raw→modifier→physics stages. These properties allow specialized football policy to remain expressive without multiplying accidental exceptions.

## Known limitations and unresolved questions

The ordinary game is one deterministic seed/roster pair, with ten nonrandom detailed traces. It establishes exposure and exact causal witnesses, not prevalence across league distributions. Synthetic zone-cache geometry is a legal controller scenario, not a measured NFL incident; whether threat reselection should interrupt commitment is a football design question. The native both-path catch intervention is a diagnostic treatment, not a candidate to merge or a measured improvement. The deferred actor may correctly anticipate a catch through flight cues under a richer future model.

Whole-object snapshot fields can preserve unused or stale data. P029 demonstrates why this is insufficient for causality. Conversely interface purity can hide dependency: a supplied 'perceived picture' whose target was chosen from authoritative holder identity still leaks information. The observation identity and timing matter as much as delayed coordinates.

The largest open architecture question is now narrower: which decisions need one atomic identity/evidence/action record, and which subsystem legitimately has immediate physical authority? The demonstrated examples support a few explicit boundaries and careful cache lifecycles. They do not yet support replacing all existing football decisions with a global utility maximizer, hierarchical planner, or learned policy.
