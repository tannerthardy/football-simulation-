# NFL claims in the open-field / box investigation

**Verdict: partly supported; several NFL interpretations need correction.**
The familiar reference numbers are real committed aggregates. They do not
establish that NFL weight barely matters, NFL LBs shed immediately, that .2s
of movement delay is visual latency, or that the prototype now has correct
football mechanisms. The lateral-motion discrepancy is a useful question;
its quoted NFL values and causal interpretation are not independently verified
by the portable evidence.

Reviewed 2026-10-17 against the user's pasted account and exact research head
`943f1d33c181325d9ba839da4a7b195d60c658b7`, specifically
`docs/reviews/open-field-tackling.md` and its operators. Review host is accepted
`develop@d682b1f474cb6ba260a7b8b1119a62919c5a2159`, queue
`bf493d881f423540962c6b1ad3b889fe2662e8c8`. No engine experiment, study rerun,
P045 query, bulk acquisition or full suite. Other owners retain sim mechanisms.

## What can be confirmed numerically

The frozen `data/reviews/mechanics/nfl-bdb2022.json` contains:

| NFL metric | Value | Exposure / meaning |
| --- | --- | --- |
| Run gain mean / median | 4.447 / 3.0 yd | 5,462 metric-eligible RB/FB runs with a handoff |
| Yards before contact mean / median / p90 | 1.166 / .6 / 4.7 yd | 5,262 of those runs with first-contact annotation |
| Carrier speed at contact median / p90 | 4.507 / 6.801 yd/s | 5,262; centered position-derived speed |
| Nearest defender speed at contact median / p90 | 2.850 / 5.836 yd/s | 5,262; nearest-defender proxy, same centered operator |
| “Broke contact” proxy | .125 | 5,105 contacts with an observable +.5s state; speed >=4 yd/s then and >=5 additional credited yards |

Thus the rounded 4.5/3.0, .6/1.17, 4.5/6.8, 2.85/5.8 and 12.5% values are
faithful quotations of the committed reference. This is **aggregate and
definition verification**, not a fresh raw-tracking recomputation. The archive
provenance SHA `743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3`
matches Catching's earlier verified restoration receipt; that archive was not
downloaded or rehashed here.

The paper's 6,223 “runs” is a different, broader claimed common-packet exposure.
The shared `run_metrics` operator requires RB/FB and a handoff; geometry and
firsttackler require only `kind=run` and a carrier. This can explain different
counts and 4.48 versus 4.447 means, but the 6,223 IDs were not published here,
so it remains an **unreconciled denominator**, not a proven false count.
Publish admitted/excluded counts per metric rather than putting 6,223 over
every table. The quoted 11.7%/0.67% tails and their conditional rates cannot be
recomputed from the saved quantile summary.

## Claim-by-claim finding

| Claim | Finding / corrected interpretation |
| --- | --- |
| “NFL DL make 41.1% of first contacts; escape makes sim match.” | **Unverified percentage; qualified proxy.** `firsttackler.py` picks the defender nearest the carrier at the first-contact timestamp, not a labeled contacting actor. NFL OLB is grouped LB while sim EDGE is grouped DL. No alignment-matched recoding, nearest distance/ambiguity or per-role counts accompany this table. A similar number does not establish the right defender, responsibility or contact. |
| “The deep safety makes contacts NFL DL should make.” | **Not established by those proportions.** A difference in marginal role shares cannot identify per-play substitution, an attainable DL stop or correct safety responsibility. Installed duties and reachable access need their own evidence. |
| “NFL OL/DL flow 4.9/4.5 yd laterally at 2s; the sim scarcely flows.” | **Plausible descriptive lead; exact NFL values unverified.** Timeline calculates live-play, concept-grouped means of player displacements, then medians across plays. It is not a fixed block-pair lead/lag analysis. Its outside-zone sim group pools OZ and WZ. A repeated discrepancy warrants matched geometry review, not a claim that NFL observations prove the sim's feedback cause or that every block must race laterally. |
| “NFL engaged OL lateral speed is 3.0 yd/s at 2s; sim mirror cap is too low.” | **Time label is wrong; cap inference unsupported.** The speed statistic pools player-frames from .5 through 2.0s, not just 2.0s, with centered differences. “Engaged” means within 1.5yd of a box/second-level defender; it is not a hand-contact label. Aggregate achieved speed and a technique's one request cap are different quantities. |
| “NFL weight barely matters / block outcomes should not follow weight.” | **Not supported as a causal or physical-law claim.** Cited original scripts `out/trench/mass_nfl.py` and `mass_nfl2.py`, weight joins, exposure counts and uncertainty are absent. The old report describes nearest-OL proximity and position-restricted samples, not randomized mass changes. NFL role, technique, opponent selection, help, strength and weight range confound the relationship. A flat association in a restricted sample cannot justify removing mass dependence, extrapolating to TE-vs-DT, or choosing an eccentric-force coefficient. |
| “NFL LBs shed immediately; sim LBs stay stuck because they wait.” | **Not measured.** `lbpass.py` identifies initially 2–8yd-deep defenders, regardless of listed position, and checks OL proximity when the runner reaches their depth. It has no labeled engagement, attempted shed, release time or defensive intent. The pasted comparison to immediate NFL shedding is stronger than the actual source evidence. |
| “57% versus 40% are blocked; free LBs trail 1.9 versus .5yd.” | **Unverified values with two material qualifications.** “Blocked” is proximity <=1.5yd, excludes TE/FB/WR blockers and takes precedence over being far from the runner. Percentages count defender-level crossings on 10+ runs, not plays or all linebackers. The printed lateral statistic is pooled over all run gains, not the 10+ band; it cannot be presented as the same cohort without a new saved breakdown. It also has a whistle-window defect described below. |
| “NFL get-off .3s versus sim .5s means .2s extra visual latency.” | **Movement comparison unverified; latency inference invalid.** `getoff.py` measures first .15yd displacement from the snap, on a 10Hz grid. That combines initial motion, acceleration, anticipated cadence, requests, physical constraints and collisions. It excludes never-crossing players without reporting that denominator. It is not onset of a visual decision. The sim formula is indeed labeled an unfitted assumption in `agent.ts`; this metric alone cannot fit it. |
| “Secondary depth/runner timing proves collapse relative to NFL.” | **Needs rechecking with live exposure.** `timing.py` excludes runners already >=5yd but never checks the whistle. NFL adapter retains post-ending frames; the sim tracer ends at the native ending. Conditional depth can therefore compare different live/dead populations. Runner crossing is also searched after the whistle. Magnitude/direction of contamination in the actual packet is unknown. |
| “Matching contact, duration and gain makes DL_ESCAPE NFL-like.” | **Insufficient validation.** Gain is verified only as an all-concept NFL aggregate, versus a uniform selected zone lab. First-contact role is an imperfect proxy; duration is a proximity episode with censored lower bounds; all measures share the same trajectories and are correlated. Similar values can guide inspection, but cannot establish a controller/contact correction or rank the largest accepted-sim problem. |

## Concrete operator problems reproduced without football execution

The saved-only audit runs the **unchanged research scripts** on an explicitly
synthetic recording that ends at 1.0s but retains later tracking frames. Its
runner first crosses the line at 2.0s, after the whistle. `timing.py` reports
that crossing and still includes secondary-depth samples at 3.0 and 4.0s;
`lbpass.py` counts a blocked defender crossing. These are confirmed admission
defects, not just hypothetical semantic objections. `geometry.py` and
`second.py` similarly search the unbounded recording instead of the live
window. `getoff.py` does not check the whistle either. The timeline operator
does bound its movement samples by `Play.live` and the event end.

“Speed going into contact” has another known limitation. `metrics.Play.speed`
uses positions .2s before **and .2s after** the event, quantized to .1yd. The
audit constructs two paths with identical 10yd/s motion through contact: one
continues, one stops afterward. Reported entry speed changes 10→5yd/s. The
quoted NFL percentiles match that old operator, but are not clean pre-contact
approach speed. For any remaining approach question, use stored tracking/sim
velocity at a named pre-contact frame with matching validity; keep this old
reference labeled rather than silently changing its definition. The timeline
speed is also derived from positions; it is bounded by the whistle but still
does not isolate a pre-contact request or capacity.

First “block length” is the first fixed nearest OL–box-defender proximity
episode starting by 1.0s. It may begin before actual contact. If it remains
close at the end, timeline records a right-censor flag **and includes its
observed lower-bound duration in the ordinary duration quantile**. 2.6/2.4s
are not independently verified contact-release medians. Preserve censor counts
and distinguish observed episode length from completed release time.

The NFL adapter forward-fills missing player positions without an imputation
mask, discards nflId from emitted players, and emits neither weight nor stored
velocity. Index identity is stable within a converted play; reconstructing
weight joins, real missingness and the original players requires a sidecar or
the restored input. “All22” does not prove every frame is observed. NFL PFF
blocking links are pass-side labels; they do not turn the run-side proximity
heuristic into labeled contact or reveal gaze, grip, force or intended shed.

## What the comparison says about this simulator

These are outcomes of the historical, unintegrated `RUN_LANE=1 CLIMB_EXIT=1`
research host stacked on `50f6a08`/accepted `c3264b0`, as its report states.
They are not measurements of current accepted `d682b1f`. The research and
accepted source differ in blocking, carrier, engagement and run-fit behavior.
This review does not rerun or replace owners' sim diagnosis. The valid question
to carry forward is: **on the same live zone-run geometry, does installed
blocking and defensive flow create useful access at runner arrival?** An NFL
reference should follow stable players/pairs and actual event windows, while
native request/load/velocity evidence distinguishes decisions from execution.

Use the NFL evidence as descriptive constraints on observed movement. Preserve
offensive wins, defensive wins, safe doubles and legitimate shedding delays.
No listed reference statistic justifies stronger/weaker hands, a universal
shedding trigger, a timer change or an NFL-average target.

## Smallest remaining evidence handoff

No replacement download or new NFL scan is needed to address the current gap.
The original research host should supply existing saved output, source hashes,
per-metric admitted/excluded/live/censored counts and exact cohort IDs. For
weight, include `mass_nfl.py`/`mass_nfl2.py`, player-ID/weight joins, stable
pairs, definition of “single,” mass-ratio cell counts and uncertainty. For
unpublished .3s/41.1%/4.9yd/40% figures, include their existing operator output
and the checksum of the converted common packet. A small keyed witness slice
with validity/event masks can resolve window/identity questions without
transferring all tracking. If the original outputs are lost, say so; any
reduction of the existing packet should be separately bounded and preserve
original versus repaired definitions. Do not rebuild the P045 query.

Catching's archive and weeks1–9 were restored on its separate host under
`/workspace/football-yac-angle/data/raw/`; that path and the research
`out/mechanics/nfl-plays.jsonl.gz` are not present here. Existing archive
receipts confirm provenance, not this study's derived numbers. AMF work and
completed P045 data remain separate and untouched.

Reproduce this review's saved aggregate/definition checks from this branch:

```sh
python3 -I scripts/diag/open-field-nfl-claims-audit.py \
  /path/to/checkout-at-943f1d3 out/open-field-nfl-claims/audit.json
```

[Machine receipt](../../data/reviews/current/open-field-nfl-claims-review.json)
records source hashes, aggregate denominators and synthetic counterexamples.
Zero new native plays, provider downloads or NFL dataset queries. The next
decision is to correct the NFL interpretation and recover the small existing
evidence handoff; sim owners can continue their controlled investigations
without treating these unverified claims as calibration targets.
