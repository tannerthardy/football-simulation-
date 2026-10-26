# Movement evidence: what the existing measurements establish, and what they cannot

Source inspected: `/workspace/football-audit`, commit `c4a03f6463eacb23ce63d01bd32b4f8b547b9bc0`. No production edits. Reproducible experiment: `python3 out/forensic-validation/measure.py`; results `out/forensic-validation/measurements.json`. This imports the actual NFL collectors for adversarial fixtures and remeasures the current saved seed-7 film; it does not run another full game. The film was generated at the audited source and its hash and metadata are retained in the result. Existing movement/orientation measurement tests: 3/3 and 7/7 passed.

## Findings that change the interpretation

1. **Withdraw “braking is not the cause” as a conclusion from the cited deceleration comparison.** The statistic is a per-player-play maximum of a heavily smoothed scalar speed loss, including contact. It is neither an approach-specific braking measurement nor lateral redirection capacity. The cited sim value is from October 11, not the October 23 source. Fresh measurement remains high, so age alone is not the decisive objection; the statistic answers a different question.
2. **Withdraw “NFL p99 proves our turn ceiling is within NFL capability.”** The NFL statistic is a maximum observed endpoint orientation change per path, then a tail quantile across paths. It mixes opportunity, technique, observation error, contact and ability. The collector accepts isolated orientation flips; there is no validation of the extreme windows. Keeping the current yaw ceiling during controller experiments is a sensible controlled choice, not a demonstrated physiological result.
3. **Retain the narrower request-frequency diagnosis.** COV-6 reports 373/374 large sim swings preceded by a large requested-facing change. That is useful within-simulator causal evidence about where requests originate. It does not require treating the NFL extremes as capacity measurements. New current-film measurements confirm frequent large body swings remain, while demonstrating that many are not large changes in travel direction.
4. **Do not conclude the data work as a whole is careless or useless.** The repository already contains a substantially better orientation pilot, explicit cohort limitations, athlete weighting and an NFL movement extractor that separates scalar braking from trajectory curvature. Reuse those pieces. The weakness is inconsistent measurement standards and stronger conclusions than the particular operator supports.

## Exact reconstruction of the yaw evidence

The first-party [BDB2025 data dictionary](https://www.kaggle.com/competitions/nfl-big-data-bowl-2025/data?select=games.csv), retrieved in this investigation, identifies `o` as player orientation, `dir` as the angle of motion, and `s` as speed in yards/second. Therefore it would be wrong to dismiss `o` as an entirely undefined field. This dictionary does not identify a hip joint, gaze direction, a foot plant, maximal effort, or measurement error at extreme yaw rates.

`yaw_speed_audit.py:24–61` joins optional `players.csv` from the first tracking file's directory, keeps the listed CB/S/LB position codes, filters `AFTER_SNAP` when `frameType` is present, and groups by game/play/player. It bins each starting frame by **provider speed**, calculates shortest circular `o-dir`, one-frame `abs(delta o)*10`, and two-frame endpoint `abs(delta o)>=90°`. It pools frames/windows, so long paths and frequently appearing athletes contribute more. It checks endpoint frame identifiers, but has no finite-value, conflicting-duplicate, orientation-discontinuity, role, contact, downed-player or effort screening. The outputs do not pin the input bytes or disclose per-game/athlete counts.

`yaw_capability_audit.py:32–87` uses similar eligibility. For each player-play and speed bin it retains the greatest two-frame orientation change divided by 0.2 seconds, then reports quantiles across those path maxima. “Capability” is the script's name and interpretation, not something the extraction independently identifies. Its 150° turn metric accumulates same-sign orientation deltas and ignores each delta below 3° per frame. Direction reversals end a candidate turn. Hence the reported median is conditional on this segmentation and deadband, not a general average time to turn around.

Two important implementation hazards are demonstrated, with their prevalence deliberately left unknown:

| Actual collector challenged | Synthetic input with known construction | Actual result | What this establishes |
| --- | --- | --- | --- |
| Both yaw collectors | One 180° orientation sample surrounded by 0° samples; speed 5 yd/s and direction unchanged | Yaw p99 1800°/s; per-path maximum 900°/s; two completed 150° turns taking 0.1 s | An isolated orientation discontinuity can dominate the “capacity” tail. This does **not** establish how often real NFL rows contain such discontinuities. |
| Capability collector | Smooth 29°/s rotation for 6 s: total 174° | No completed 150° turn | The 3°/frame deadband excludes a valid slow turn. Its turn-time population is selected by the operator. |
| Both collectors | Identical WR trajectory, first with a roster declaring WR, then without `players.csv` | Excluded with roster; 21 frames counted as a defender without it | `pos.get(nid,"DB")` silently changes the cohort if the roster or ID join is missing. There is no evidence the original week-1 run actually lacked that file. |

Sources: `scripts/data/yaw_speed_audit.py:26`, `:37`, `:39`, `:56`; `scripts/data/yaw_capability_audit.py:44`, `:55`, `:68`.

**The NFL and sim yaw operators are similar, not identical.** `scripts/diag/yaw-sim.ts:27–45` derives speed from positions over an approximately 0.2-second central window; NFL bins by provider `s`. Sim includes frame t=0; NFL uses AFTER_SNAP. Sim's lowest bin is 0–2, the frequency script's is 1–2. Sim uses fixed 10 Hz yaw multipliers and fixed 0.2-second spans even when the final replay frame is on a half-step. It does not output the NFL script's `o-dir` comparison. More consequentially, the two populations have different game/call/role/contact mixtures. None of these facts alone proves the reported 8–9-fold historical frequency difference is an artifact; they prohibit calling it a fully matched capacity experiment.

I did not find the raw NFL tracking files in the available workspace. The saved COV-6 table is therefore historical evidence, not a fresh replication of NFL values. No claim here establishes the frequency or magnitude of NFL orientation errors.

## New measurements on current football film

The saved `out/audit/film.json` has 125 filmed run/pass plays and 855 defensive LB/DB player paths. Positions and orientation are quantized replay values; there are no complete native consumed-picture/request/contact-state traces in this file. Speed is derived from the same neighboring-position calculation as `yaw-sim.ts`. For the main window counts below, I require an actual time span of 0.2 seconds. These are overlapping descriptive windows, not independent trials or confirmed mistakes.

| Entry speed | Windows | Body swing >=90° | Fraction | One-frame yaw p90 |
| --- | ---: | ---: | ---: | ---: |
| 2–4 yd/s | 11,664 | 298 | 2.55% | 292.2°/s |
| 4–6 yd/s | 7,503 | 95 | 1.27% | 194.8°/s |
| 6+ yd/s | 5,306 | 4 | 0.075% | 120.3°/s |

The original sim diagnostic would include 438 non-0.2-second terminal windows across bins in this game. None supplies a large-swing numerator here; excluding them changes the 2–4 result from 2.535% to 2.555%, and 4–6 from 1.247% to 1.266%. **This timing defect is real but does not explain the large turning frequency in this sample.** Correct it cheaply; do not make it the story.

Two especially useful current examples:

| Current saved play / actor / time | Body orientation change | Travel direction change | Entry → exit speed |
| --- | ---: | ---: | ---: |
| G1-P145, SS K. Wright, 2.0–2.2 s | 111.7° | 4.26° | 4.03 → 4.38 yd/s |
| G1-P076, CB_S J. Fisher, 1.6–1.8 s | 108.3° | 0.52° | 4.20 → 4.75 yd/s |

These show why “the player turns fast” can coexist with “the player has barely redirected.” They do not, by themselves, prove an impossible motor response or an incorrect football choice. The light event stream has no nearby actor event for these windows, which does not prove absence of contact or downstream command changes.

The reverse distinction also appears: among 301 overlapping 0.5-second windows with travel direction changing at least 60°, entry speed at least 3 yd/s and exit speed at least 1 yd/s, 86 have less than 30° endpoint body rotation. These windows can include contact, stops or transient low speeds; they are **not** a clean sample of voluntary cuts. Their purpose is to disprove the substitution of one measurement for the other.

Historical ordinal references must not be used as stable causal witnesses across versions. Current G1-P002 is a Comebacks pass with a 32-yard completion; it is not automatically the same physical scene as the TKL-4 “P002 SS” complaint. Capture an input fixture and first relevant state, not just a game seed and play ordinal.

## The braking statistic cannot settle the skating diagnosis

`docs/KNOWN_PROBLEMS.md:670–680` cites sim DB deceleration p90 6.6 versus NFL 5.6 yd/s² to rule out braking. The committed `data/reviews/mechanics/sim-baseline.json:2` explicitly says `ff6e993`; that commit is October 11. The exact DB value is 6.595. The NFL BDB2022 DB value is 5.562.

The common operator (`scripts/mechanics/metrics.py:68–96`, `:342–353`) first rounds positions to 0.1 yd, computes speed over a central 0.4-second span, differentiates those speeds across another 0.4-second span, and retains the greatest scalar speed loss anywhere in each player-play. It includes all phases and contact states. This makes it useful as a broad descriptive distribution; it cannot answer whether an unengaged defender began braking early enough, applied the right force direction, or can redirect from a particular starting velocity.

Reapplying that operator to the current film gives DB p90 **6.93** (611 paths) and LB **6.52** (244). Keeping the recorded 0.01-yard positions rather than adding 0.1-yard quantization gives **6.66** and **6.33**. Thus the current sim still exhibits substantial scalar deceleration. Quantization changes this sample modestly; it is not the principal causal objection. The script's comment that replay is recorded to 0.1 yd is stale (`src/sim/playsim.ts:1347` records hundredths).

The stronger demonstration comes from independent analytic trajectories passed through the actual newer `bdb2027_movement.motion` extractor:

- A constant-speed 5 yd/s circle turning 63.0° per half-second has exact lateral acceleration 11 yd/s² and zero tangential acceleration. The extractor reports lateral 10.82 and braking 0.03. A low braking statistic can accompany a strong directional change.
- A 5 yd/s runner who brakes at exactly 10 yd/s² for 0.5 seconds is reported at peakBrake 8.50. Doubling actual braking to 20 for 0.25 seconds produces only 9.875. Its 0.5-second speed smoothing is intentionally a measurement filter; the smoothed maximum cannot be read as the underlying instantaneous capacity. Compare simulator trajectories through that same filter, or retain a separate native-capability measure.

Neither experiment justifies increasing braking, lateral acceleration, or yaw. They identify the questions the existing scalar statistic cannot answer. The physics sub-audit's separate held-command experiments supply the relevant motor evidence: unladen stopping closely follows the specified brake; faster yaw does not resolve a demanding lateral redirect. Keep those physical experiments separate from these observational metrics.

The calibration comments deserve explicit identifiability labels. `src/players/physical.ts:107–142` says GAME_BURST=2.2 was chosen to match per-play game peak acceleration distributions; GAME_CUT=.55 scales derived brake and lateral acceleration. Matching an observed effort distribution by changing a motor limit can confound capability with role, desire and opportunity. This is an **unresolved modeling-identifiability risk**, not proof either number is wrong. A controller may request maximal movement too often, in which case lowering capacity can improve an aggregate and worsen urgent recovery. Test conditional demand and response before retuning the constants.

## Existing good evidence worth preserving

`docs/football-handbook/orientation-pilot.md` explicitly treats provider orientation as a provisional proxy for its BDB2027 snapshot and does not claim gaze/plant/force identification. Its cohort is only 15 selected draft athletes in two declared games; that limitation is stated, not hidden. It reports 5,143 sustained-motion frames, athlete-balanced summaries alongside pooled frames, and 121 non-overlapping slow windows with no trigger. It correctly refuses to interpret zero triggers as no reorientation.

`orientation_motion_audit.py:49–125` rejects conflicting clocks, detects invalid angles, breaks sustained runs at missing/invalid samples, and tests circular invariance, duplicates and gaps. Its seven tests pass. The raw field semantics still need a matched source dictionary and a few clip checks, but this is a useful template for hardening the newer yaw scripts. Do not merge the narrow BDB2027 draft sample and BDB2025 week-1 defender statistics into a fictitious single NFL reference population.

`bdb2027_movement.py:26–67` already separates speed, scalar acceleration, scalar braking, lateral acceleration and a half-second directional-change marker. Its saved manifest declares no fitted engine parameters and no held-out validation. It weights trajectories within player, which is useful. Its three tests pass, but only validate constant speed at two sampling rates, athlete weighting, and constant linear acceleration/braking. They do not independently validate sharp cuts, discontinuities, short impulses or player capability inference. The synthetic cases above add diagnostic value without requiring a large new suite.

An older, unusually concrete native pursuit review already exists at `data/reviews/alley-support-and-tail-audit/audit/pursuit-review.md` (committed October 11, separately pinned source). It reconstructs an SS approaching a static catch point with substantial transverse velocity, requests almost perpendicular velocity, and finds that no tackle opportunity ever becomes reachable. It also preserves successful and unsuccessful counterparts and warns that applied zero requests may be teammate spacing. This is evidence that the project has already demonstrated the right causal review method. Its old source pin prevents treating that historical diagnosis as automatically current; its methodology is reusable immediately.

## A compact replacement experiment, not another evaluation bureaucracy

**Cheap, roughly 1–2 focused implementation days:** make the existing yaw collectors fail visibly on missing roster/source or ambiguous clocks; disclose eligible paths/windows and hashes; use actual timestamps; pin a common position-derived speed operator for the comparison, retaining provider-speed sensitivity separately. Add the three operator counterexamples above. Do not silently discard all fast rotations: label suspicious jumps and show sensitivity with and without them, or the cleaning rule will predetermine the desired capacity result.

**Moderate, roughly 3–5 days for a usable evidence panel:** choose a small locked cohort of input scenes and a reserved second cohort. Include a successful rally, a genuine coverage turn with depth responsibility, a late-air redirect, run cutback, traffic yield, and an actual contact/fall. For each actor record the same clocked chain: available cue → consumed picture → role command → downstream applied command → native body response. First inspect the earliest divergence, then compare one command intervention while preserving the state, RNG and all other limits. Report minimum separation and approach geometry before tackle outcome. This tests whether an interface/controller correction is enough before a new decision architecture is considered.

For motion, collect only a compact set of conditional measurements: entry speed and velocity vector; desired and achieved change in travel direction; body yaw separately; time until velocity first usefully changes; scalar speed loss; transverse velocity cancellation; stopping/arrival error; contact/support state. A single per-play maximum throws away most of this causal information. Native 20 Hz traces adjudicate the simulator; the common 10 Hz filtered operator compares to tracking.

**Harder, multiweek data validation rather than an immediate production rewrite:** estimate a task- and speed-conditioned achievable movement envelope with multiple clean observed opportunities per athlete, then compare to held-command trials and matched external sport measurements. Preserve uncertainty and coverage counts, and check whether increasing sample exposure keeps moving the extremes. If only a few upper-tail NFL rows establish a proposed ceiling, inspect them before fitting. There is no valid shortcut from a per-path p99 of `o` changes to universal braking/cutting capacities.

Falsifiers are explicit. If a plausible arrival command succeeds with unchanged limits across held scenes and controls, the primary problem in those scenes is not inadequate maximum capacity. If even a deliberately generous but legal command schedule cannot redirect in matched clean tasks while trustworthy NFL movement can, capacity or movement execution becomes the leading candidate. If tracing shows the requested command itself never used the available cue, a motor change is compensating for an upstream decision error. If an improved local interface closes the held scenes without a shared responsibility layer, the need for that architectural expansion has not been demonstrated.

## External studies: use for experiment design, not NFL constants

- [Dos'Santos, Thomas and Jones, 2021](https://pubmed.ncbi.nlm.nih.gov/34278968/): 27 men performed 45°, 90° and 180° tasks with motion and force measurement. Increasing turn angle changed velocity profiles and contact times. This supports testing angle and entry speed jointly, not importing its numerical forces or times to NFL bodies.
- [Sonderegger, Tschopp and Taube, 2016](https://pubmed.ncbi.nlm.nih.gov/27846308/): 72 trained junior soccer players performed maximal acceleration from several initial speeds. The measured maximum depended strongly on initial speed. This supports conditioning effort/capability comparisons on starting speed; it does not validate a particular simulator acceleration formula.
- [Morin et al., 2021](https://pubmed.ncbi.nlm.nih.gov/34023754/): a proof of concept used multiple training sessions from 16 professional soccer players to estimate speed-conditioned acceleration envelopes. It explicitly calls for further comparison with independent testing. This is a useful counterweight to excessive skepticism: tracking can help estimate capability with an appropriate design; a single unmatched distribution of path extrema is not that design.

## Reassessment of the first audit's evaluator criticism

The previously reproduced empty-input mechanics guard false-pass remains a genuine fail-open defect; do not inflate it into proof that all evaluators are broken. The current timing discrepancy is a counterexample to exaggerated significance: it exists, yet correcting it barely moves the relevant current-film rates. Conversely, a completely implemented shared operator would not fix the causal misuse of maximum scalar deceleration to rule out an approach-specific error. There are three different classes to address: implementation correctness, population/measurement compatibility, and the validity of the inference. All three matter, and a passing arithmetic test establishes only the first.

Likewise, the weird detectors are useful scouting candidates, not prevalence estimates. The original 14/19 selected positives do not identify population recall or precision. A turned-body window can be valid coverage technique, and a slow far-side receiver can have no reachable intervention. Judge a candidate's opportunity and responsibility using a few traces plus successful controls; do not tune the simulator to make all detector events disappear. That would replace the user's football judgment with a brittle proxy.
