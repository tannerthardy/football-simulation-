# Quarter gather: native Split Zone adverse

**Withhold the global quarter-gather candidate.** It repairs two proven unnecessary safety stops, but the retained native football panel exposes a 7.15-yard tackle becoming a 70-yard touchdown. The first new quarter request is physically coherent; restoring an unnecessary stop to recover the old yardage would hide a later football/contact problem. Keep the source-pinned diagnostic and investigate the tackle sequence separately.

## Native inputs and execution proof

The one original case is `CT-R1-split_zone-under-L-S11`: roster seeds 31/32, strength .55, Gun Wing 12, Split Zone flipped left, 4-3 Under/Cover 3, play seed 11, LOS 40, first down 50, ordinary default down/zone style/audibles/QB eyes. Both phases retain the exact same actual setup, players/profiles, full encoded initial bodies, initial RNG and original run-panel assignment projection.

- Fresh baseline: `3cbabd8fbb1fb4fea34c6bb98725a97f3f6de175c0bb59bece69f3c1e7371a7f`.
- Quarter candidate: `8d27d085b6e469115435aeae79835c571f0e124f330c8ff856a55532a5e77006`.
- `split-zone-baseline-3cb.json.gz`: 3,394,260 bytes; SHA `90bec5593e8e3c90525e0f9e6772b85cc1e3359c1b0a506513788d9bdf2c80e2`.
- `split-zone-candidate-8d2.json.gz`: 9,116,348 bytes; SHA `b4cdcf6e33f406ab1b4020a1672da52cb6ef200a3e4f88bf2c8937099bb28055`.

The collector's observed execution, clean result, complete final RNG and copied `nextU32` equal its independent plain execution in each phase. Its endpoint signature also exactly matches the corresponding same-source original 162-run panel row. The saved-only comparator verifies **43 complete World steps are exactly equal**, including cloned job/zone metadata, before the first changed applied instruction. At that first instruction all 22 exact before-World states, actual controller records, contained commands and consumed pictures still match. No extra perception, controller or RNG calls were made.

The single-case collector inherited an inaccurate comment/limits string saying six inputs; its executable case list and reference guard contain exactly this one native run. Unlike the older six-tail collector, this collector clones job/zone at capture, so its common-prefix proof includes them.

## First changed instruction is a safe moving gather

At **2.15 s**, RB (#6) is at `(38.6839215005, 27.5617274919)`, moving `(4.7089758172, 1.9164772530)`. He is upright, with no grip, engagement, prior body contact or support lean/load. His original request and consumed teammate pictures are identical between phases. Radial spacing makes no change.

The gather broad phase considers C, LG and RG; the limiting picture is **LG (#4)**, age .05 s, at `(40.8923751505,29.4994163114)` moving `(.9133588424,-1.5165640791)`. Baseline spacing requests zero velocity. Candidate requests the quarter moving turn `(2.3034518451,.5906160159)`, preserving facing, posture and cut skill.

The production free movement preview uses the exact saved body/profile/support/energy, 12 ordinary 50 ms steps and the same already-consumed pictures. Minimum swept clearance against all ten teammates is:

| Requested fraction | Minimum clearance (yd) |
| --- | ---: |
| Original | -.381812 |
| 3/4 | -.206160 |
| Existing 1/2 | -.300787 |
| **1/4** | **+.392099** |
| Existing stop | +.526890 |

All these free forecasts remain upright. The quarter path clears every observed teammate. The exact original applied stop also reproduces the first native achieved body in a one-body World.

LG has no active engagement/joint/recent body contact at this fork. A retrospective two-body World from the exact RB/LG states and both already-recorded held commands gives quarter **+.737398 yd** minimum clearance, zero contact and both players upright. Original speed collides, with 362.00 impulse and RB falling; half speed collides with 233.96 impulse. Work/arm budgets and residual checks pass. The LG request/current state is diagnostic only and is never supplied to RB spacing.

**No invalid first quarter branch has been demonstrated.** It provides a physically safe alternative to an unnecessary complete stop. These held-command previews do not promise the future native result.

## Where the real play changes

| Event | Baseline | Candidate |
| --- | --- | --- |
| Handoff | 1.05 s | 1.05 s |
| LB_W missed dive | 2.95 s | 2.90 s |
| FS encounter | Missed dive 3.65 s; falls 3.70 | Initial lunge wrap 3.65 s; falls 3.70 |
| CB_S encounter | Initial standing wrap 3.90 s | Assist wrap 3.80 s |
| First contact | 5.988 yd after LOS | **4.706 yd after LOS** |
| Hold failures | None | FS 3.90 s; CB_S 4.25 s |
| Finish | Tackle 4.50 s, **7.15 yd** | Touchdown 11.40 s, **70 yd** |

This is not a lack of any tackle opportunity: candidate contact occurs earlier. Its first FS wrap comes from an extended dive. The candidate CB_S then reaches for an assist at **1.440760 yd** separation, with initial grip capacity **243.866** and origin `reach+assist`. Baseline CB_S acquires an initial wrap at **.706016 yd** separation. Candidate CB_S reaches actual body proximity later, but its already slipping grip ultimately releases. Do not infer that raising grip capacity or lowering runner strength is the repair.

The actual code's tackle-opportunity policy forecasts a better attainable wrap only for `!sim.bond`; an assist unconditionally takes the available reach. A narrow next hypothesis is that a free, upright closing helper should retain the same opportunity judgment as a first tackler, while still taking urgent/separating or physically constrained assists immediately. Another question is whether a slipping extended hold can plausibly recover while the hands/body subsequently close. These are **hypotheses**, not a proved force-solver defect. The saved record does not contain an assist-specific opportunity picture because that branch never requests one; do not invent that cue or claim the old selector consumed it.

## Next bounded investigation

1. Preserve this adverse as an ordinary control, plus both mirrors and a successful immediate assist.
2. Identify the actual observable cue and achieved free support state at helper acquisition; compare reachable body wrap versus an escaping last chance using the existing movement preview. Preserve uncertain future runner cuts and all contact/load exclusions.
3. Trace acquired grip, hold length, capacity/load, slip transition and physical support through the already-recorded tackle. Separate acquisition/controller defects from an actual constraint failure.
4. Only promote a shared spacing or tackle improvement if native six tails and the unchanged normal run/pass panels support it. Do not force this one run back to 7.15 yards or tune NFL force/rating targets.

Evidence: `split-zone-native-comparison.json`, both exact raw collector packets, `split-zone-spacing-diagnosis-v2.json`, source-guarded `diagnose-adverse-run.ts`, saved-only `compare-adverse-run.mjs`. Diagnostic v1 is retained locally with its executed tool; v2 changes misleading variable/description labels only and independently repeats the same bounded saved-body checks. No new native simulations are performed by either comparator or spacing diagnostic.
