# Held fit waypoint: forecast-time review

Decision: **the timing hypothesis is mathematically valid for one narrow producer, but the saved cases do not demonstrate a useful movement correction. Do not implement it or spend a native run on these witnesses.** Carry the precise contract question to Run. This does not validate the previously held mode-latch or add another spatial lead.

## Source and scope

Inspected accepted `2c98bed94adad8087c65f381d4090444ad283985`, full source `4273994fa50f0f11a54bff53b374ad87d80766be471ca727ce43f76fdef83571`; working claim head `3b8176c831e39194418ab78ee39065ccbe8de1d6`. Recorded queue pin `4cc3337df24faa6d857b612ae62e3df3109a5296`; Claude research pin `bae3fe80d189a7d792aaafbc4eea1ae2baa79573` was not imported. The saved tapes identify the same accepted full source. This is a pure arithmetic/acquired-picture replay, not an executed candidate or NFL measurement. No production edits, tests, controller updates, World steps, new observations or simulations.

Relevant code is `src/sim/run-fits.ts:273–351`, `src/sim/mind.ts:72–78` and `src/sim/motion-plan.ts:1–10`. The existing mind holds a selected point for one decision interval (DI). Stack SCRAPE adds `gap.vel * 2DI` before that selection; the planner then repeatedly requests arrival at the held point in a fresh `2DI` horizon. Current mode and facing are separate predicates. The proposed forecast clock must not silently settle those separate ownership questions.

## What the arithmetic distinguishes

For an unclamped, SCRAPE-only stack insertion, let the acquired gap move at constant lateral speed `v`, initial own speed also be `v`, and `H=2DI`. At adoption `t0`, the selected waypoint is `gap(t0)+vH`. At elapsed time `s`, an on-time player is only `v(H−s)` from that waypoint.

`requestToCover` inverts the scalar lag model with `L(H)=tau*(1−exp(−H/tau))`. Restarting its horizon gives

`request_old(s) = v − vs/(H−L(H))`.

Using the original forecast's remaining time `H−s` instead returns `v`. Thus the restarted horizon can command braking and then reversal against a player already moving on time. Adding another `vH` is not the repair: the selected point already includes that lead.

The synthetic arithmetic uses actual OZ4 Mike tau `1.2254375051198332`, DI `0.2`, `v=2 yd/s`, initial gap `10 yd` and waypoint `10.8 yd`. It deliberately omits FLOW_READ, pulls, placement error, contact and body constraints.

| Time since adoption | Full-H request | Remaining-time request |
|---|---:|---:|
| 0.00 s | 2.000 yd/s | 2.000 yd/s |
| 0.05 s | 0.297 yd/s | 2.000 yd/s |
| 0.10 s | −1.406 yd/s | 2.000 yd/s |
| 0.20 s | −4.812 yd/s | 2.000 yd/s |

This proves a forecast-clock inconsistency in that ideal contract. It does not prove that current physical execution follows the inverse planner's scalar model or that the illustrated football fit should have this contract.

## Actual saved exposure

`waypoint-exposure.mjs` replays only already consumed pictures through the pure line/gap geometry helpers. It looks for a selected stack insertion point with no FLOW_READ or pull contribution, non-lag technique, `abs(gap.vel)>1`, and an unclamped SCRAPE lead `abs(gap.vel*2DI)<2`. To prove no FLOW_READ conservatively, it admits only a deep observed RB with `abs(observed RB vy)<=1.5`. It excludes shallow departure classifications that would require the existing producer's private engagement exception. It therefore is a bounded witness search, not an exhaustive negative result.

The search found no eligible adoption in OZ4, WZ7, WZORD or F_COUNTER. WZ7 had 10 and F_COUNTER 95 rows excluded for the private-departure ambiguity. One eligible adoption exists in F_OZ: `FDD-LB3` / `LB_W` at **2.05 s**, selected `(41.5,30.993664155722083)`, DI `0.22353865614373752`, inferred forecast deadline `2.497077312287475`. The tape directly confirms first point adoption at 2.05 and its retention through the following rows.

| F_OZ time | Old formula | Dated formula | Both capped requests |
|---|---:|---:|---:|
| 2.05 s | 12.216 | 12.216 | +9.0077 yd/s |
| 2.10 s | 12.565 | 15.871 | +9.0077 yd/s |
| 2.15 s | 12.931 | 21.154 | +9.0077 yd/s |

There is **no lateral request difference after the body's existing cap**. This defender was already falling from contact since 1.979 s, so he is also a poor clean movement witness. At 2.15 the new RB picture passes the lateral-flow threshold and the actual facing changes while the selected point remains held; preserving the earlier technique would be a separate behavior change. The clock alone does not fix or explain it.

OZ4 Mike's held point at 1.70–1.85 s is not established as originating from the narrow SCRAPE-only producer. Both candidate arithmetic requests also saturate in the same direction on those rows; at 1.80 the actual current-mode command is different. These rows cannot establish a timing-only benefit. Do not broaden the rule merely to include them.

## Opposing contracts and next action

- **Fixed fit/plug:** a fixed leverage point can require slowing and holding. An arrival date does not specify zero terminal velocity. Plug SCRAPE leads by one DI while its current planner uses two; assigning the stack clock would conceal a different producer/consumer discrepancy. Do not convert static/plug duties to timed through-points.
- **FLOW_READ:** the runner picture is already projected by two DI before independent gap SCRAPE is added. Timing that composed point does not justify the spatial composition or remove its existing multiple leads.
- **Pull:** `PULL_LOOK=0.4` is not generally two DI; pull and gap forecasts have distinct provenance. Preserve its current semantics pending its own evidence.
- **Acquisition:** these are acquired/dead-reckoned pictures. Observation age is not another forecast interval to add. A forecast deadline is the selected point's original date, not a commitment timer or permission to ignore contradiction.

Smallest next action for Run: if an ordinary free, upright stack-fit witness shows the same narrow producer and an unsaturated harmful request before contact, inspect that adoption and its existing opposing fixed-fit control. Only then test a timing-only correction while keeping admission, fresh runner declaration, body limits and other producers unchanged. The current tapes justify documenting the clock question, not promotion or another native variant.

Reproduce pure receipts from this worktree:

```sh
python out/moving-fit/waypoint-time-arithmetic.py
PATH=/workspace/.football-tools/node-v22.23.3-linux-x64/bin:$PATH node --import tsx out/moving-fit/waypoint-exposure.mjs
```

The adjacent JSON receipts retain exact source, tape/input hashes, scalar assumptions and counterfactual values. The arithmetic assumes `GAIT_STEP=0` (profile tau); it does not claim transfer to another gait. The geometry replay reads the saved accepted evidence and does not activate flags or consume randomness. Tapes remain under `/workspace/football-db-stalk-workoff/out/db-stalk-workoff/`.
