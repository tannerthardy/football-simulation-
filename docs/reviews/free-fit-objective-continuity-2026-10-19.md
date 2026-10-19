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

Next decision: bounded native IZ plus OZ24, with their existing accepted tapes,
then report achieved geometry and any costs before declaring readiness. The
held-action contract itself is supported; football-transfer evidence is pending.
