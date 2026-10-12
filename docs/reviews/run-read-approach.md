# False clean approach: turning-cost diagnosis

Baseline: `9e752b7`. Assignment: reuse the recorded 17 corridor losses; diagnose first misleading safety predictions, make one minimal correction, keep shared capacities and answer/mesh/forced-entry policies unchanged. `RUN_READ` stays default-off.

Pre-correction witnesses: `wz_weak s3 31/32 over`, `wz_strong s7 31/32 under`, `oz_strong s7 31/32 under flip`; successful control `oz_strong s3 41/42 over`. Detailed risk traces are supplementary replays of these inputs, verified against saved physical fingerprints; the original 576-play evidence is reused.

The selected cause is asymmetric arrival prediction. `entryRisk()` charges defenders for velocity perpendicular to their target and for braking velocity away from it (`timeToReach`), but predicts the RB as an immediately aligned straight-line sprinter (`sprintTime`, clipping negative approach velocity to zero). This drops his existing sideways momentum instead of paying to redirect it.

At 2.05 s in `wz_weak s3 31/32 over`, bang is scored .242 (< .6 safe threshold). The predicted first sample is (38.80, 30.74) in .333 s; the native unloaded held-command trace still drifts outward to about (39.45, 31.91) at .35 s. The old endpoint estimate is .739 s; the existing turn-aware estimator gives about 1.066 s. Substituting those arrival estimates raises risk to about 3.0 without changing defender estimates or engagement allowance. The successful control's turn-aware risk remains zero. This demonstrates a missing turning cost, not a contact-capacity defect.

Other causes are retained: removing the .35 engagement allowance alone raises that witness's risk to 1.292, but does nothing for the zero-risk strong-zone witness. The initial read-on/off command difference in the weak-zone witness is the commitment tick (post-tick time 2.10 s); mesh and approach bodies match beforehand. Prolonged read-only pressing therefore cannot explain that witness's earlier shared position. The late under/flip witness does diverge before commitment and is a separate pressing-sequence candidate. No blanket blocking diagnosis follows from the commitment snapshots.

One correction to test: use the existing turn/brake-aware `timeToReach` for RB arrival at the same three sample points, keeping its original profile speed/acceleration, risk threshold, engagement allowance, perception and answer order. No new bounce/bang/bend rule. Native free movement is a kinematic diagnostic, not a loaded route oracle.

Validation declared before candidate outcomes: selected witnesses and control; ordinary 96 cases against saved read-on/off evidence; fresh 16 inputs (seed 11, roster 61/62, same four calls/fronts/flips) frozen before coding. Measure actual entry arrival before first contact, first-contact time/depth and gain/censoring. Keep every improvement and regression. A frozen-entry safe arrival is a finite .65-yard point test; it does not guarantee eventual yards. Two failed corrections require stopping and re-diagnosis; this assignment permits one demonstrated correction before the retained-key investigation.

## Result: candidate parked

The missing redirect cost is demonstrated, but adding it alone **does not make route safety reliable**. The one candidate is available for reproduction with `RUN_READ=1 RUN_READ_TURN=1`; both flags default off. `RUN_READ=1` alone retains the prior experimental controller. No second correction, answer rule, mesh retiming or forced-entry policy was added after the fresh controls failed.

| Native comparison | Original read | Turn-cost candidate | Read off |
| --- | ---: | ---: | ---: |
| Ordinary 96, mean gain | 1.978 | 2.163 | 2.674 |
| Fresh 16, mean gain | 1.976 | 0.070 | 0.192 |
| Ordinary safe committed-point arrivals | 22 | 27 | — |
| Fresh safe committed-point arrivals | 3 | 1 | — |

At a .5-yard change threshold, ordinary inputs have nine improvements and seven regressions; fresh inputs have one improvement and three regressions. Ordinary scored-safe claims decrease 83→71, with failed safe arrivals 63→46. Fresh claims decrease 13→8, but failures are 10→7: seven of eight fresh safe claims still fail. Fewer safe claims alone is not greater reliability. Ordinary clean LOS crossings change 47→48; fresh crossings change 3→1. Eight-second censoring remains one ordinary play per stage and zero fresh plays; all per-input outcomes and regressions are retained.

Contact here is the **first opposing carrier body contact/hit/wrap since possession**, including before commitment. Arrival is within .65 yard of the frozen committed point before that contact. This tight point test can miss a valid neighboring route; four of the original 17 corridor cases actually cross the LOS before first contact. The strong-zone representative is one: it misses the frozen point, but first contact is already 2.35 yards beyond the LOS. Its classification does not establish a failed first-level block. This distinction must remain visible when interpreting the prior audit.

| Witness | Gain before→candidate | Actual entry arrival before contact | First contact before→candidate |
| --- | ---: | --- | --- |
| `wz_weak s3 31/32 over` | -1.12→4.36 | Neither; candidate arrives 2.55 s after contact | 2.40 s at -1.07 yd → 2.35 s at -.75 yd |
| Successful `oz_strong s3 41/42 over` | 5.61→5.61 | Both at 3.10 s | Both 3.30 s at +.65 yd |
| `wz_strong s7 31/32 under` | 3.69→3.69 | Neither frozen-point test; both cross LOS clean | Both 2.90 s at +2.35 yd |
| Fresh `oz_strong s11 61/62 over` | 16.05→.59 | Before: 3.40 s; candidate: 2.70 s after contact | 5.50 s at +10.52 yd → 2.65 s at +.08 yd |
| Fresh `wz_strong s11 61/62 over` | 14.47→.14 | Before: 3.20 s; candidate: 2.60 s after contact | 4.70 s at +7.49 yd → 2.55 s at -.11 yd |

The selected weak-zone gain improves, but its actual approach **still has contact before entry**. Its candidate direct-entry branch arrives clean at 2.55 s with contact at 2.85 s, whereas native controller execution contacts at 2.35 s. A better gain is not proof of a reliable safety prediction. The successful control has identical motion and events throughout, not merely the same endpoint.

## What explains the disagreement

1. **Containment allowance contributes, but is not a universal explanation.** In the weak-zone witness, removing the .35-second engagement allowance raises the old risk .242→1.292 without changing own arrival. The strong-zone witness remains at zero. An engagement does not guarantee the defender cannot meet the RB while still attached.
2. **The sampled route is a straight line, while the body initially follows a curve.** The weak-zone contact projects to roughly the first fifth of the chosen segment, before the first .35 sample, and lies outside the predicted line. The native unloaded trace demonstrates outward drift. Sampling endpoints alone misses this approach; charging extra time still does not supply the correct swept path or teammate clearance.
3. **Own turning cost is missing; defender access is also approximated.** The candidate fixes the asymmetric cost but continues to assume defenders can traverse free-body reach paths, with only a fixed allowance for current engagements. It does not model intervening bodies or an impending block. In both fresh regressions, DE_W (defender 11) is one of the largest predicted bang threats at 2.05 s, then LT acquires a loaded engagement by 2.20 s in the original native branch and stays on him through the actual RB arrival. That future block is evidence explaining a false negative, not privileged knowledge to give the RB. Observed geometry and future interaction need diagnosis together.
4. **Risk rejection and pressing are coupled.** In the fresh OZ case, at the identical 2.05 s state bang's risk changes .438→2.357. The original commits bang; the candidate has no safe answer and keeps pressing, then commits an unsafe bounce at 2.25 s. WZ does the same (.445→2.468). The first requested-action difference is at 2.05 s, before any resulting body divergence. Both originally attain a protected inside entry; both candidate bounces contact before arrival. This is a demonstrated failure sequence, not proof that an arbitrary earlier cut would fix it.

The [backtrace of all 17 cases](../../data/reviews/run-read-approach/summary.json) distinguishes the first low-risk read from the first requested-action difference. Eleven have an action difference before commitment. The weak-zone nominated case matches read-off actions up to commitment, so prolonged read-only pressing cannot explain its earlier shared state. Supplementary earlier-state branches test the alternatives with responding defenses, rather than taking a later opening as independent of the path. Weak-zone bang already fails the native branch from its first 1.65 s read. Strong-zone bounce fails from 1.65 s, succeeds from 2.05 s, and misses the later frozen target: neither “earlier is always better” nor “all routes were always blocked” follows. In the late under/flip witness, all three routes fail even when branched at 2.25 s before the first action divergence; extended pressing is observed but is not established as the cause of a previously clean route closing there.

## Five retained-key takeovers

All five preserve their original key because it remains upright and never meets the perceived `depth > 2.5` exit condition. The geometric changes are different:

| Input | First takeover | Held→current DL | Geometry |
| --- | ---: | --- | --- |
| OZ strong, s3, 51/52, Over flip | 1.25 s | DT_S→DE_S | Held latitude 2.304→2.299; tackle-derived floor 2.000→2.304 |
| OZ strong, s7, 31/32, Over flip | .45 s | DT_S→DE_S | DT moves inward, 2.085→1.938; floor moves outward to 2.143 |
| OZ strong, s7, 51/52, Over flip | .45 s | DT_S→DE_S | DT moves inward, 2.072→1.983; floor moves outward to 2.119 |
| WZ strong, s3, 51/52, Over flip | 1.05 s | DT_S→DE_S | DT moves outward slightly, 2.304→2.329, but floor advances farther to 2.387 |
| WZ strong, s7, 31/32, Over | 2.25 s | DE_S→DT_S | Another DL becomes the first lateral qualifier while the held end remains at the line |

The first and fourth are mainly **moving offensive-surface boundaries**, not inward defensive slants. The second and third combine inward movement with an outward-moving tackle. In the fifth, the consumed candidate is LB_S although the instantaneous geometric first defender is DT_S: perception latency and the acquisition order disagree. No explicit slant call is present. A rule to always adopt the current candidate would also adopt filling linebackers; a rule tied only to leaving the line misses lateral ownership changes. These witnesses are now differentiated, but no re-key heuristic was added.

## Reproduction and validation

Full detailed traces remain under `out/run-read-approach/`; the [summary](../../data/reviews/run-read-approach/summary.json) records every ordinary/fresh improvement and regression, actual arrivals, first-contact times/depths, all 17 backtraces, five takeovers, and SHA-256 receipts. [Inputs](../../data/reviews/run-read-approach/input-manifest.json) preserve the fresh set declared before candidate coding. Existing `out/run-read-information/` evidence and its original committed receipts remain untouched.

```sh
# Ordinary candidate, with observer/no-sink neutrality checks:
RUN_READ=1 RUN_READ_TURN=1 node --import tsx scripts/diag/zone/run-read-information.ts out/run-read-approach/ordinary-after-on.json
# Use READ_INFO_INPUTS=<fresh input JSON> for the declared 16-case panel.
# READ_RISK_TRACE=1 adds consumed per-sample deadlines and native unloaded motion.
# READ_INFO_CASES='id|id' restricts supplementary witnesses.
python3 scripts/diag/zone/compare-run-read-approach.py
```

The broad candidate panels were collected before parking the candidate behind its second flag. Flag-enabled representative replays match those tested candidate fingerprints exactly; flag-disabled replays match the original fingerprints. Read-off execution is unchanged on all 112 ordinary/fresh inputs. Every candidate panel is observer-neutral against a fresh no-sink execution. Each earlier entry intervention verifies the exact prefix before replacing only the RB command; defenders and blockers continue responding. Previews are unloaded diagnostics, not claims about protected feasibility.

Full TypeScript checks: **1,505 passed, the same single Tite witness failed**. This includes integration and paused research checks and the three new mirrored/aligned approach contracts. All 141 Python data checks pass; typecheck and build pass. Shared physics, profiles, blocker controllers, mesh and answer ordering are unchanged. Neither candidate nor read is promoted.

The next correction must address **the joint route prediction and what pressing does when every estimate rejects a route**. A scalar free-body deadline plus a blanket engagement delay cannot establish either a protected corridor or actual defender access. Preserve the two fresh protected-bang controls and the nominal gain-improved case that still contacts before entry. Forced entry preservation and mesh retiming remain lower priorities.
