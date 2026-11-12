# Defense lane: parked work (2026-11-11)

The Defense lane is parked by Integration while the passing-offence work changes where defenders are at the catch. Each item below records where it stands, its branch, and what would resume it.

Re-run the tables on the recaptured sample before resuming any of them. Every sim number so far comes from IRN vs COM only, and their alignment habits are seeded from the team id. The yards and by-role tables (`docs/reviews/2026-11-10-defense-yards.md`) need re-running on the per-seed team tooling and the new pass sample.

## Zone coverage: where this stands (2026-11-11, paused for the stress matrix)

Tanner's focus has put Defense on zone coverage rules, with Rules + Coaching leading the rule structure; Defense owns what the defender perceives and does with his body. Paused at Integration's request until Rules + Coaching's stress matrix is reported in full.

- **CUSHION_NEED** is on develop (engine-27). The leverage of the 3–10 yd run-tackle attempts it adds has not been audited.
- **SEEN_EYES** (#562, draft): zone seats read the QB's look from what the defender sees, not `sim.qbEyes`. Integration takes it after the matrix.
- **JUDGE_SEEN_BALL** (#562, stays off): honest, but it exposes the deep squeeze-break committing downhill on a pre-throw picture. It goes on with a deep-seat rule (audit item 4), not before.
- **Missed and recorded on their branches, no PR:** SET_SQUEEZE (`defense/G1-set-squeeze`: no spare cushion to spend; the corner-over excess is QB timing) and ZONE_RELATE (`defense/G1-zone-backer`: the sitting backers are spread over many branches).
- **Underneath audit** (#563, `scripts/diag/defense-yards/underaudit.mts`, `request-thrash.mts`): at the release, zone-family underneath defenders over the catcher request 7–9 yd/s toward him and achieve 2.2–2.5. The sitting branches whip: lane 11.8 deg/tick and 4.2% of ticks reversing; carry-wall 11.3 deg and 3.7%; spot-settle 7.3 deg and 3.7%. Along the request the body gets 1.2–2.5 of 5–6 yd/s; a steady spot-drop gets 3.7 of 6.7. This is the audit's item 8 (ownership re-picked each tick) as an execution symptom.

**Next steps, in order, after the matrix:**
1. Flight-window diag (Integration's lead from the matrix's first cut: our zone defenders don't close during the flight). For each zone defender within 8 yd of the eventual catch point, tick by tick from the windup to arrival: when he could see the windup and the release, when `sawThrow` latches, what he requests before and after, request vs achieved, and what stops the break. The NFL side gets the same timeline by family and role. Smallest reproducer first (a few Cover 3 and Cover 4 completions), then the table. No build before it is reported.
2. Stable underneath ownership (audit item 8, "match the final #2 underneath"), built as a rule in Rules + Coaching's structure. Gate on request heading stability and achieved-along-request, then the backer-over state at the release vs NFL, deep yield, and hi-lo and hitch-and-go.

## Open items

| Item | Branch | State | Next read |
|---|---|---|---|
| **Pair / vice rule** (`PAIR_SIDE`). Tanner's ask; parked, not dropped. | `defense/G1-pair-side` (from develop `f52e3a0d`) | Built and registered off, but not measured: the paired arms were stopped. Rule: a pursuer who sees a teammate nearer the carrier (within 4 yd and closing) on one side of the carrier's travel aims at his own near shoulder on the other side. | Paired off vs on, same teams and seeds, with `pursuit_roles.py`. Measure yards after first contact and yards to the second contact first; split share, separation and cutback cover second. Evidence for the gap: pairs at first contact on catches are 59° apart around the carrier against the NFL's 101°, split 44% against 56%, and the cutback side is covered 30% against 46%. But NFL split pairs give up slightly *more* yards after contact than same-side pairs (catches 2.9 against 2.3; runs 3.4 against 2.7), so judge it on yards, not on how often pairs split. |
| **HOLD_FACING attempt 2**: the side or behind holder keeps his facing instead of re-squaring every tick. | `defense/G1-hold-facing` (merged with run-ref-16, `GRASP_ARM_MOMENT` on) | Re-read on top of `GRASP_ARM_MOMENT`. Holder rotation at +0.5 / +1.0 s: side 87 / 98 → 29 / 50 (NFL 34 / 76); behind 90 / 99 → 48 / 73 (NFL 27 / 64); front 58 / 95 → 48 / 63 (NFL 44 / 89). The side holder ends off square 67° (NFL 42–55°). | `ref:report --flag HOLD_FACING=1` and `unfinished-holds.mts`, flag off and on. They were started, then stopped at parking. If those are flat, it is a promotion candidate. Also check the front-hold under-rotation at +1.0 s. |
| **LAST_LINE** and **LOOSE_EFFORT** | `defense/G1-last-line` | Recorded miss; see its FLAGS row. The request changes but achieved speed does not: the shortfall is acceleration after redirects. Aligned pursuers at full request reach 0.84 of top speed, facing is within 20° of travel 94% of the time, and speedScale is 0.98. | None planned. The pursuit request is sound given position. Position at the catch is Coverage's lane: route depth, throw timing, break on the ball. |
| **TAKEON_ALL**: `BACKER_TAKEON`'s break-down for every backer and DB once he reads run, or sees the man blocking. | `defense/G1-takeon-all` (run-ref-13 base) | Reads realistic. On run-ref-13, defender falls 709 → 586 and early falls 404 → 272; yards −0.07 (SE 0.06); missed + broken flat. | Merge develop, then the full `ref:report` with operators (crowd at the tackle). Then it is a promotion candidate. 71 of the remaining LB fallers meet a blocker who isn't coming at them (climber test). |
| **DL_SNAP_TIME** + `OL_ON_COUNT` re-read | develop (`DL_SNAP_TIME` off) | Halves the DL start gap by displacement: interior at 0.5 s, 0.24 → 0.39 yd against NFL 0.51. Pressure comes about 0.05 s earlier; the pressure rate is flat. | Full `ref:report` plus pass rush and pressure, read together with `OL_ON_COUNT`. |
| **Alignment items**: a stand-up edge over the uncovered backside tackle (`DEF_STANCE`, `btfront`); a walked-up backer about 2 yd over the backside tackle (`btnear`: NFL ~25%, ours almost never); `SAM_ON_TE` (on-line share against NFL 56%). | develop (flags off) | Parked behind the tackling and passing work. | Re-read with the per-seed teams; Rules + Coaching's `FIT_TE_GAP` changed gap naming under these. |
| **Leverage fit**: the tackler's approach aims through the runner. | none | Diagnosed only. | After the pair rule. |
| **DL_GAMES / ATTACK_LANDMARK**: penetration count by role. NFL deeper than 2 yd 11.7% against our ~2.4%. | develop (flags off) | Parked. | Count penetration by role, with line movement against the run-down pressure rate. |

## Old flags with no recorded history

Integration's prune held these back because tests and scripts still reference them. References on develop `f52e3a0d`:

| Flag | Engine | Tests | Scripts |
|---|---|---|---|
| `PULL_CUE` | `src/sim/run-fits.ts` | `test/pull-fit-plan.test.ts` (sets it), `test/pull-early.test.ts`, `test/dl-chase.test.ts` | `scripts/diag/defense/flow-panel.ts` |
| `PULL_PLAN` | `src/sim/run-fits.ts` | `test/pull-fit-plan.test.ts` | `scripts/diag/defense/flow-panel.ts`, `scripts/diag/trench/contact-summary.py` |
| `REACH_CONTACT` | `src/sim/tackle.ts` (shares a line with `TACKLE_TOUCH`) | `test/blocked-reach.test.ts`, `test/tackle-touch.test.ts` | `scripts/diag/physics/reach-closure-compare.ts`, `reach-contact-panel.ts`, `reach-contact-replay.ts`, `reach-transition.ts`, `wrap-binding-refinement.ts`; `scripts/diag/defense/flow-panel.ts` |
| `TACKLE_TOUCH` | `src/sim/tackle.ts` | `test/tackle-touch.test.ts`, `test/blocked-reach.test.ts`, `test/baseline-runner.test.ts` | `scripts/diag/physics/reach-contact-panel.ts`, `reach-transition.ts`, `reach-transition-report.py`, `wrap-binding-refinement.ts`; `scripts/diag/defense/flow-panel.ts` |
| `READ_RISK_TRACE` | `src/sim/run-read.ts` (a trace switch) | none | none |
| `RUN_READ` | `src/sim/run-read.ts`, **`src/sim/assign.ts`, `src/sim/behaviors/carrier.ts`** | `test/scorecard-provenance.test.ts` | `scripts/diag/zone/compare-run-read-approach.py`, `run-read-information.ts`; `scripts/diag/physics/wrap-binding-report.py`; `scripts/diag/defense/flow-panel.ts` |
| `RUN_READ_TURN` | `src/sim/run-read.ts` | none | `scripts/diag/zone/compare-run-read-approach.py`, `run-read-information.ts`; `scripts/diag/physics/wrap-binding-report.py`; `scripts/diag/defense/flow-panel.ts` |

`test/fixtures/incidental-catch-windows.json` lists every flag.

Suggested split:

- **`RUN_READ` is read by `assign.ts` and the carrier.** Check whether it is effectively on before calling it dead.
- **`PULL_CUE` / `PULL_PLAN`** go with `test/pull-fit-plan.test.ts`, and their lines in `flow-panel.ts`.
- **`REACH_CONTACT` / `TACKLE_TOUCH`** go with `test/tackle-touch.test.ts`, the `blocked-reach` cases that set them, and the `scripts/diag/physics/reach-*` panels. Ask Flex first: those panels are physics-lane diagnostics.
- **`READ_RISK_TRACE`** can go alone.
- **`RUN_READ_TURN`** goes with the zone run-read comparison scripts.

## Operators

All in `scripts/diag/defense-yards/`, the same code on NFL and sim common-format plays:

- `yards.py`: where the defence gives up yards.
- `pursuit_roles.py`: pursuit by help behind, pairs and second-contact yards, class-0 by approach, and `CLASS0_OUT` per-play dumps.
- `lastyard.py`: the first man's last 3 yd, by outcome, with Flex's `grabs.py` hands-range rule.
