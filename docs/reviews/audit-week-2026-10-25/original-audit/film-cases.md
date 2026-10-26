# Native football case studies: responsibility, pursuit, and facing

Snapshot: `develop@c4a03f6463eacb23ce63d01bd32b4f8b547b9bc0`. Investigation performed October 23, 2026. Production source was not edited. This is a focused forensic study, not a prevalence estimate or a proposed merge.

The native evidence supports several different causes behind similar-looking “dumb player” film. A free safety's sweeping pursuit can come from changing predicted interception points executed by ordinary locomotion. A corner's retreat can come from an explicit pass-first responsibility, despite recognizing run and observing possession. A blocked linebacker can face away from the runner because the contact controller owns his facing. These require different interventions. None establishes that a general-purpose intelligence rewrite is necessary.

## Reproduction and limits

The architecture audit's passive seed-7 game reproduced the entire original packed replay JSON exactly, including score 36–29. It saved pre-constructor setups, including scouting, styles, energy, calls, RNG seed, and audibles. This study then restaged selected individual plays from those exact setups. Every baseline here reproduced every actor's pre-tick position, velocity and facing and the complete result/event JSON exactly. That is stronger than matching final yards. Individual intervention files report the first state divergence; all unchanged prefixes were checked.

Primary evidence:

- Original current film: `/workspace/football-audit/out/audit/film.json`.
- Native setup and full stage traces: `./evidence/architecture/G1-PNNN-{setup,trace}.json`.
- Focused arm traces, events, summaries: `/workspace/football-audit/out/forensic-film/`.
- All unique saved arms: `all-arm-summary.json` in that directory. Early diagnostic variants are retained for transparency, not all are recommended comparisons.
- Executable restaging harness and isolated source: `./sandboxes/film/native.ts`; run from that directory with Node 22 and `node --import tsx native.ts G1-P002 21 baseline angularAcquired`.
- Reach/forecast analyses: `analyze.ts`, `slacks.ts` in the sandbox; outputs `native-reach-analysis.json` and `native-intercept-slacks.json` in the evidence directory.

The retained `zeroDelay` exploratory arm collapses both current and older observations to the same instant and therefore also removes the acceleration estimate; it is confounded and excluded from the substantive comparison. `fresher015` preserves the intended 0.2-second spacing. The generic `interventionTicks` field counts explicit request or policy replacements, not every forecast modification; use the first physical divergence and arm definition for forecast activation.

These are selected cases from one native game, followed by small opposing and transfer cases. They cannot establish league-wide quality, false-positive rates, player differentiation, or the best coaching policy. P002 here is the **current Pistol Twin TE Comebacks** play, not a historical TKL-4 clip with the same display number. Agent indices vary with personnel: P019 LB_W is **16**, whereas P029 CB_S is **18**.

## Case 1: P002 SS pursuit sweep

The receiver RB6 catches at 3.30 seconds. SS21 begins far downfield, changes direction repeatedly, and eventually assists at 8.20 seconds. The baseline ends out of bounds after 32.30 yards. FS20 first contacts/wraps at 6.60. During the main sweeping interval, 3.8–6.0, the SS is upright and unengaged, and raw and final movement commands agree. Engagement and spacing are not the cause of that interval.

The execution chain is `Pursuit.update → chase → gatheringApproach / pursuitPoint → chooseApproach → World`. `pursuitPoint` consumes a recent carrier picture plus one 0.2 seconds older. It forecasts acceleration from speed changes while holding observed heading constant, then chooses the earliest time at which scalar `timeToReach` can reach the predicted runner. The selected point becomes a full-speed running request except where gathering or the short local preview replaces it. The physical body cannot instantly follow a changing request.

At 4.25 to 4.30 seconds, the observed runner moves about 0.37 yard, while the selected aim moves approximately **8.26 yards in one tick**, from (56.16, 14.42) to (62.65, 9.31). This comes from the first feasible intercept moving from 1.8 to 2.8 seconds into the forecast. It is **not yet** the least-slack fallback:

| Tick | Candidate at 1.8 s: reach time minus candidate time | Candidate at 2.8 s | Selected point time |
|---|---:|---:|---:|
| 4.25 | −0.01454 s | −0.04939 s | 1.8 s, feasible |
| 4.30 | +0.02350 s | −0.00241 s | 2.8 s, feasible |
| 4.35 | +0.07369 s | +0.03043 s | 3.0 s, fallback; still 0.01994 s late |

The 0.6-second `chooseApproach` preview is intentionally a nearby plant controller, not a long-range planner. The early redirection is outside its distance gate. Therefore its existence does not mean the sweeping long-range request was physically previewed and rejected in favor of this one.

This explains the geometry; it does **not** by itself prove the interception choice was football-wrong. A newly unreachable short interception can rationally require a later one. Future runner cuts are not available to the defender. The discontinuity deserves instrumentation and forecast validation, not a rule that every large target change is bad.

### Controlled falsifications

All interventions select only this SS and retain other native rules. The final yards are included alongside earlier mechanism measures because later contacts can change outcomes through a different player.

| Intervention | P002 outcome | Interpretation |
|---|---|---|
| Baseline | 32.30 yd, out of bounds | Closest SS–runner distance by 6.40 s: 2.366 yd |
| Double SS yaw rate after catch | 32.09 yd, out of bounds | Closest by 6.40: 2.361 yd. No meaningful rescue |
| Shorten pursuit horizon from 3 to 0.8 s | 72.93 yd touchdown | A simpler shorter-lookahead patch makes this case much worse |
| Stop request when moving opposite requested direction, until slower | 35.18 yd tackle | Three intervention ticks; worse outcome, not an automatic cure for sweep |
| Remove scalar acceleration forecast | 21.83 yd tackle, after fumble/recovery | Before 6.40, SS closest distance worsens to 2.701 yd. Lower yards are not evidence of improved SS pursuit |
| Make acquired pictures 0.15 s fresher, retaining the older-picture spacing | 23.59 yd, SS tackle | Diagnostic sensitivity to information age; not a proposal to eliminate realistic reaction delay |
| Add decaying angular prediction **only after personally observed carrying=true** | 23.47 yd, SS tackle at 7.10 | SS carrier contact/wrap at 5.95, versus baseline first SS wrap at 8.20 |

The angular experiment uses already-consumed current and older velocity headings: angular velocity is their signed difference divided by 0.2 seconds and decays with the existing anticipation time constant. Speed prediction, body capacities, physics, and other agents remain unchanged. No coefficient was tuned between plays. It tests a specific available cue that the current predictor discards. It does not read the future runner path.

The final conservative angular arm (`angularAcquired`) waits for its consumed picture to say the runner carries the ball. First physical divergence is 3.55 seconds. An earlier exploratory variant (`angularForecast`) begins after the global catch and produces 22.05 yards, but it also acts before the SS personally acquires possession. It should not be the headline result: the architecture audit independently found the pre-acquisition global behavior transition. The conservative arm adds no new possession knowledge, although it still runs within the native architecture's existing information boundaries.

### Transfer and opposing evidence

| Fixed angular-acquired intervention | Baseline → intervention | What this tests |
|---|---|---|
| P117, SS21, Flood reception near sideline | 9.32 → 9.32 yd, both out of bounds | Active transfer; closest distance worsens 2.839 → 2.911 yd |
| P038, SS21, outside-zone run | 5.76 → 5.83 yd, both SS tackles | Active run transfer; same first within-1.5-yard time, 3.85 s; small adverse result |
| P017, LB_M15, pass reception | 15.03 → 15.03 yd; all state/events identical | Negative control: after acquisition, gathering bypasses interception; not an active generalization win |

The narrowly justified conclusion is that a better use of observed turning can improve one native failure without changing the motor. It deserves an independently selected, frozen follow-up set including cuts that stop/reverse, straight acceleration, sideline motion, and false directional cues. The current four cases do not justify merging this prototype or calling it generally superior. Its mild adverse transfers must remain in the review.

### What the reach analysis did and did not establish

The locomotion audit independently proved scalar `timeToReach` can predict an impossible transverse arrival in an isolated witness. Here, applying the generous full-traction inertial reach bound to the actual selected P002 and P117 interception points found **zero** falsely feasible selected interceptions. Positive bound violations occur at some fallback targets, but those are explicitly not estimated reachable by the selected time. Do not use that isolated witness as this clip's demonstrated root cause. Conversely, passing a generous necessary bound does not prove a selected arrival is executable.

The independent one-body replay reproduces the P002 native free movement exactly using its recorded commands. Doubling yaw changes that path by only about 0.013 yard; changing lateral capacity has much larger effects. That reinforces a controller/motor planning question rather than a blanket turn-rate increase. See `/workspace/football-audit/out/forensic-locomotion/native-replay.json` for the open-loop experiment and its limitations.

## Case 2: P029 corner stays with receiver after acquiring a run

P029 is Strong Offset I Toss with Z across motion, against 3–4 Bear Cover 0 plus Zero Blitz. CB_S18 is assigned Z9 and has an installed **alley** fit. He recognizes run at 0.65 seconds. At 1.20 seconds he personally consumes RB6 carrying=true, picture age 0.20 seconds. The same tick's receiver picture shows low pads, forward velocity 3.55 yd/s, and depth 1.69 yards past the line, satisfying the existing shallow blocking cue. Z later physically blocks FS20; the corner does not need hidden offensive play identity to receive blocking evidence.

Nonetheless the raw movement command at 1.20 is (7.24, 1.60) yd/s toward the tracked receiver. At 2.40, with the runner only about 1.6 yards behind the line, he still tracks Z. He does not switch to the live pursuit branch until 2.70, when the acquired runner crosses the line. Some later final commands also receive spacing changes; the earlier receiver-tracking choice is already in the raw behavior output.

This follows explicit source policy. `ManCoverage.coverMan` computes blocking evidence but `PASS_FIRST` prevents a non-force perimeter marker from using it to enter support. `pursueIfLive` waits for the runner past the line for an alley player. The source explains a legitimate calibration objective: tracked wide defenders bail and avoid being blocked more often than an overly aggressive version did. The failure is therefore **not** lack of run recognition. The hard policy offers no reconsideration based on these combined cues.

That can be a reasonable football tradeoff. Possession behind the line does not automatically retire man coverage: halfback passes, trick plays, RPOs, or a receiver releasing from a convincing stalk can punish abandonment. This case does not certify that the corner should abandon his man.

### Bounded alternative and complete causal chain

The sandbox's `acquiredBlockingFit` trial requires the same consumed carrying=true picture, run belief, and existing observable blocking evidence on the marked receiver. It then invokes the **existing installed keyed alley fit**, rather than an unrestricted chase. The fit retains its normal depth cap and only declares its later pursuit transition using its existing rules. This uses no future trajectory or hidden offensive call.

First replacement request: 1.20 seconds. First physical state difference: 1.25. Baseline: 4.56 yards, tackled by CB_W19. Alternative: 0.82 yards, tackled by DE_W12. CB_S himself never becomes the primary tackler: his closest distance changes from 3.77 to 2.92 yards. Thus the result demonstrates a composition effect from changing the corner's action, not proof of a superior corner tackle.

An acquired-fit-only preliminary arm gives the same result. Adding the receiver-blocking requirement reduces intervention ticks from 42 to 40 and retains the outcome. A P017 pass control remains exactly unchanged because its required cues do not occur. P019 CB_S also remains exactly unchanged in the preliminary acquired-fit trial. Those are useful inactivity controls, **not active transfer or proof that play action/trick passes are safe**.

The right next experiment is to compare the benefit against an explicit assignment-abandonment cost: same-looking stalk-to-release, halfback pass, delayed route, and force/alley obligations. No universal promotion is justified before those opposing cases. This is a concrete candidate for a responsibility option with evidence and vetoes, not justification for a new exception keyed to Toss or to this receiver.

## Case 3: a blocked linebacker faces away for a different reason

The native P019 LB_W16 example is owned by the contact forensic audit. In the step beginning at 4.40 seconds (physical endpoint 4.45), the linebacker is engaged by C, faces approximately 143 degrees away from the runner, and has a runnerward raw request. The run engagement controller emits facing toward the blocker. Its source (`engagement.ts`, around line 1436) explicitly separates the work-off velocity from facing the opponent.

The contact audit's localized facing-only intervention changes the facing error to about 2.5 degrees with only approximately 0.001 yard of displacement difference and unchanged hand/control state at the inspected instant. Removing hand forces leaves him facing about 135.5 degrees away. All compared full plays finish at 8.78 yards. Therefore the visible back turn is not established as a hand-torque or yaw-cap defect. It is a technique-facing choice that can be changed almost independently of translation in this case. Whether the alternative preserves realistic block contact and visual awareness requires a contact/technique criterion; pointing every torso at the ball is not validated by reducing a facing-away detector.

For full commands, intervention definitions and contact limitations, see `./contact.md`. Initial visually selected long facing-away run intervals frequently involved blockers; those intervals cannot be classified as free-agent decision failures from paths alone.

## Priorities justified by these cases

1. **Cheap, high value: preserve exact native setups and the first changed decision.** This made all interventions falsifiable. A selected clip should include actor identity, consumed cues, responsibility/behavior, raw request, each rewriting stage, final request, support/contact state, and first divergence. A full game is not needed for each follow-up.
2. **Cheap to moderate: make interception status explicit.** Log feasible versus fallback, reach slack, forecast heading/acceleration assumptions, point age, and why local preview did or did not run. The current identical return shape hides a material distinction. Large aim changes should nominate review, not fail automatically.
3. **Moderate: validate forecast and physical reach jointly.** A time estimate can be useful in aligned cases yet poor during redirection. Compare executed arrival against predicted arrival on fixed acquired pictures, including lateral momentum, and separately evaluate forecasts against held-out runner motion. Do not retune physical yaw to compensate for a predictor.
4. **Moderate: trial decaying turning forecasts on frozen independent cases.** The native positive result is stronger than a pure narrative, but active transfer includes adverse evidence. Retain straight-line and gathered-close cases and quantify actual contact quality, misses, and abandonment costs.
5. **Moderate to difficult: expose conditional responsibility options and costs.** P029 provides a concrete experiment boundary: stay in man, execute capped alley support, or chase. Acquired possession plus blocking cues may permit reconsideration; pass threats and force responsibilities may veto it. This is narrower and more testable than a universal utility-brain rewrite.
6. **Expensive: football validity and player expression.** Determine what NFL/coaching evidence supports cue reliability, response delay, risk tolerance and recovery from misreads. Aggregate tracking similarities cannot decide whether a given purposeful retreat is correct; neither can final yards. Player differences should change those choices and their confidence under matched situations, rather than just receive arbitrary noise.

These cases change the first audit's emphasis. There is demonstrated value in existing movement helpers, observation models, installed fits, and recent contact work. The strongest next step is to make information, prediction, responsibility and command ownership testable at their boundaries. A broad mental-model rework remains an option only if these bounded experiments show that the existing structure repeatedly cannot represent the required tradeoffs cleanly.
