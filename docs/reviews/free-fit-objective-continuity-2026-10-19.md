# Free run-fit request continuity — 2026-10-19

Question: can a newly acquired flow cue activate the lateral arrival planner
against a destination that the defender has not yet adopted? If so, would
adopting the destination and planner together remove a false reversal while
preserving new decisions, current body feedback and immediate runner pursuit?

Base: accepted `f4146275ce7539816bf57b4ed55a0d2be10e48c7`, runtime
`7d23555ad67094fbe2e79726d9b761dd5f068c06fb90ff0796ec61c953750197`.
Parent fetched develop and canonical queue
`9a6bb795179a4b2e61ed59d25bcf23ca5e40f423`; both identify this acceptance.
This candidate starts directly there, independently of #159/#160/#162 and
Claude's contact-law experiments. All 44 baseline settings are recorded by
`scripts/baseline.mjs`; `RUN_CONTACT_COMPONENTS=1`, `CF_FLOW` unset, no override.

## Saved native cause

The NFL smoothness reference motivates looking at free motion separately from
contact. These native witnesses explain one controller mechanism; they do not
establish the frequency of all free-defender reversals or a new NFL comparison.
The original sim tapes retain unrounded 20 Hz physics. Do not compare a request
reversal directly to the NFL's 10 Hz position-derived heading measurement.

| Witness | Installed duty and acquired information | First incorrect request |
| --- | --- | --- |
| IZ, SD-LB1 / LB_W, 2.05 s | Conditional outside support executing its inside B-gap insertion. Acquired carrying RB moves left at −1.527 yd/s. Current desired fit is y25.081; old selected point y27.902 is held until 2.163 s. | The newly active lateral planner requests **+9.004 yd/s** against the old point. Raw and final requests agree. At 2.20 s adoption changes the request to **−9.004**. No engagement or direct contact exists at this interval. |
| COUNTER2, pair31D-LB1 / LB_W, 0.95 s | Conditional force executing its inside C-gap action. Newly requested point moves right to y31.435, but y29.107 remains selected until 1.091 s. | Planner activates against the old point and requests **−9.004**; adoption at 1.10 requests **+9.004**. This is a second play/assignment geometry with the same mixed-age action. |
| TOSS, SD-LB3 / LB_M, 1.50–2.40 s | Installed insertion follows consistently acquired left flow. | Sustained negative request is useful flow, not jitter to erase. A mode correction must retain it. |

At IZ 2.05 s, the wrong positive request opposes both the defender's own
negative achieved velocity (−1.756 yd/s) and the newly consumed RB track. The
body damps the request; this is a request-policy defect even though achieved
velocity does not instantly reverse. The source is not a fresh random draw:
`SnapMind.aim` retains the point while `executeRunFit` recomputes the lateral
planner predicate every tick. Point adoption and mode adoption disagree.

## Minimal correction

`executeRunFit` retains the planner predicate alongside the **identity of the
point returned by the existing `SnapMind.aim`**. A newly returned point adopts
both. The existing decision interval is the only cadence. Current body position
and velocity still feed the requested motion on every tick. Current acquired
runner declaration still transfers to pursuit before the fit-action path.

No new timer, observation, prediction, private possession, target, facing,
physical capacity, contact law or global command filter is introduced. The
existing lateral arrival law and all current target-selection rules remain.
#159's facing-only crossover and the contact owner's sideways-law repair are
independent changes and require their own review/composition.

## Focused evidence and limits

The nine new controller contracts first fail four assertions on unchanged
accepted runtime: newly appearing and disappearing flow changes the movement
mode while the point is still held, in both directions. With the correction,
all nine pass. Opposing controls retain new opposite flow at the next existing
decision, immediate declared-runner pursuit, current own-body feedback and hidden
motion invariance. Existing pull, shallow handover, edge approach and force
ownership contracts supply 72 compatible checks: **81 pass**. Typecheck passes.
Initial failures remain in the receipts; no test or accepted assertion was removed.

Candidate code `1885a34b5da24e870ab8719cbb45feea83fa9c8d`; runtime
`565ddbd0351efa3c4cbeeb6a1c517a7624c643e6d5b5001f7857199463c5f523`.
Receipts/logs are under ignored `out/free-fit-continuity/` on the worktree.
Focused checks: 2.198 s; initial failing contract: 1.502 s; typecheck: 9.100 s.
Native collection
is serialized by the parent. No full suite, game, roster sweep or NFL download.

**Separate adverse cause:** OZ24's LB_W still loses its flowing target when the
observed RB's lateral speed drops below 1.5 yd/s at 1.90 s. Desired y23.267 jumps
to y27.988, later back to y22.938 as the flow criterion returns. Coupling point
and mode cannot repair this discontinuous target-selection rule. It is retained
as adverse evidence, not silently hidden by smoothing. A native comparison must
report whether the present correction helps, merely delays a bad reversal, or
has an approach cost. No claim that free-defender movement is globally repaired.

Saved-data reducer: `out/free-fit-continuity/diagnose.py` (zero simulator calls).
Its 23-observation result `accepted-witnesses.json` SHA256:
`823bfa513ed92ee4ee8ca2be13331702231c92ccb26b0beebba793b82c5481ab`.
Each row records original tape path/hash, source/input hash, stable player ID,
installed fit, consumed picture, point request/adoption, raw/final movement,
achieved motion and actual contact/reps. Rounded film is not used as a checkpoint.

## Two bounded native prefixes and the decision

Parent collected exactly IZ and OZ24 through 3.2 s, using frozen input hashes
`3b95b219293f058f0137b59820edb58bac0b21b8a8a7b9a9c1742821deb8220b`
and `44c4666b3d3980fafbbeea8318f37d72400e5f185460d23e3dfdfcce4f83a004`.
Candidate initial players/profiles equal each saved accepted tape exactly.
Native source is the code above, with all 44 settings unchanged. Parent launch
receipt: `out/fit-continuity/native-launch.json`; collection receipt and full tapes:
`out/fit-continuity/native/`. Native collector wall time 2.126 s; the per-case
simulation totals 1.594 s. No additional simulation was requested.

The first difference is IZ's SD-LB5 / LB_S at 0.85 s, held point y22.899
unchanged to 0.911 s: raw vy −6.780 becomes −0.682. Own body, consumed picture,
x request and facing agree before that step. OZ24's first difference is
pair31D-LB3 / LB_M at 0.65 s: raw vy −9.206 becomes −1.128 while the same point
y25.452 remains held to 0.666 s. Both are free, without direct contact.

The selected IZ LB_W witness is repaired: at 2.05 s, raw/final vy +9.004 becomes
+0.367 against the same held point; at 2.20 s both adopt the leftward objective
and request −9.004. Lateral request total variation over 2.00–2.20 s drops
26.916→10.621 yd/s. Achieved change is modest: at 2.20 s vy −1.253→−1.320 and
y27.551→27.546. Mike's 2.15–2.35 s request variation drops 21.488→7.515.

**Adverse IZ finish geometry:** Mike still acquires a reach at 2.75 s, but
defender-to-RB distance grows 1.377→1.550 yd, initial grip .444→.248 and leg
share .247→.152. World-boundary RNG state agrees throughout both prefixes;
the same acquired runner track reaches this contact. Changed entry geometry,
rather than a changed global draw sequence, explains this cost.

This cost does not automatically invalidate the corrected action. At 1.85 s,
Mike still owns his A-gap/side− insertion; acquired run belief dates to 0.35 s.
His consumed RB is carrying=true at (36.384,25.289), velocity(2.024,−1.208),
age0.20 s. That runner is 3.616 yd behind LOS, below the existing declaration
surface; no new immediate pursuit entitlement exists. Mike's own position is
(41.882,25.008), velocity(−2.283,−1.931), with the held goal(41.5,24.405) until
1.925 s. The current proposed point y24.688 has shifted only .283 yd.

The acquired RG has just crossed the existing 1.5-yd surface-departure boundary.
The gap now uses the existing interpolated vacancy, reducing its measured
speed below the planner threshold. That does not invalidate the installed gap
or transfer ownership to pursuit. The held goal is still in the acquired
opening. It lies .603 yd laterally away; stopping at current lateral speed has
a rough full-braking scale .275 yd before combined-axis limits. Some braking
is physically reasonable. Holding the old planner yields vy −.207 instead of
−1.809, giving up later contact access in exchange for holding the still-valid
fit. The existing inverse law controls its magnitude; this candidate does not
establish that law is an accurate arrival model. Treat this as a visible,
plausible discipline/arrival tradeoff for owner review, not a mandatory tackle
ending and not an unexplained assertion failure.

OZ24 gains different access: LT contacts LB_W at 1.45 s rather than 3.40 in the
longer baseline, while Mike acquires the RB at 2.80 versus 3.00 s. Candidate
runner falls at 3.00 versus 3.65 in the longer baseline. Global RNG first differs
at 1.40 s, so later physical execution cannot be treated as matched draws.
**Both candidate prefixes are live at 3.20 s.** The original longer OZ24 tape's
completed .37-yd tackle is retained as history, not compared against a missing
candidate outcome. No terminal improvement/regression is claimed.

## Same smoothness rule, including adverse aggregate counts

`out/free-fit-continuity/compare-smooth.py` reuses the **unchanged `measure()`**
from Claude's published `scripts/diag/stretch/smooth.py` for native displacement,
with common 10 Hz samples and positions rounded to .01 yd. The same 5° turning
and .5-yd/s lateral thresholds are also applied directly to 10 Hz raw requests;
those request metrics are not NFL position metrics. The near-opponent proxy
uses the original 1.2-yd threshold, which does not prove physical contact.

| LB measurement over the 3.2-s prefix | IZ accepted→candidate | OZ24 accepted→candidate |
| --- | --- | --- |
| Native path turning reversals | 0→0 | 6→3 |
| Free-proxy native turning reversals / player-s exposure | 0/7.2→0/7.4 | 5/9.0→1/8.0 |
| Raw own-request turning reversals | 12→10 | 19→20 |
| Free-proxy raw turning reversals / player-s exposure | 8/7.2→7/7.3 | 18/8.9→16/8.1 |
| Raw lateral sign reversals | **11→13** | **9→11** |

Output: `out/free-fit-continuity/smooth-comparison.json`. Exposure changes and
OZ24's earlier block prevent attributing its aggregate native-path improvement
solely to cleaner free movement. Local spike removal is demonstrated; these
two cases do not demonstrate a general raw-request reversal cure.

**Disposition: HOLD promotion, retain independently reviewable correction.**
The mixed-age action contract is repaired, and the early braking can be a valid
fit tradeoff. The remaining owner decision is whether that still-point arrival
law is appropriate for a moving gap, given the directly measured loss of access
and unchanged aggregate raw reversals. The smallest next action is review of
this held objective/arrival-law contract alongside the already identified target
threshold discontinuity, using these saved cues and bodies. More random plays
or more selected variants cannot settle that question. No new variants, native
runs or broad campaign were launched after the two prefixes.
