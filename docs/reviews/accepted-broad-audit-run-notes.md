# Accepted-build broad audit: 24 designed runs

Reviewed the saved complete sequences at accepted commit
`8ca8deebe4afa91c3021bdd119bed8976cf00e47`, engine source
`f56a2156a0c1dcecfc3de128581ec875ca1ef93ac813a389d391282be585c956`.
All 24 preselected runs were reviewed in manifest order using all-22 paths,
native events and full 20 Hz telemetry. No new simulations or engine changes.
The [protocol](accepted-broad-audit-protocol-2026-10-15.md) and
[per-play ledger](../../data/reviews/current/accepted-broad-audit-run-review.json)
preserve the distinctions below. Root adjudication remains separate.

## Repeated questions, not nine established bad blocks

**Planned second-level work fails to become an achieved block in 9/24 runs:**
all four inside-zone RT jobs, three of four wide-zone combinations and two duo
RT departures. This is a repeated access problem to investigate. It is not nine
proven decision or physics defects. A safe earlier release and reachable legal
fit have not been established; useful keeper work, defender counters and
departure constraints remain competing explanations. In A013, DT_S already wins
the interior encounter before the missing linebacker job could explain the stop.

For example, A018 releases RT toward LB_M at 0.80 s. At 1.50, RT is at
`[35.4,23.8]`, LB_M at `[37.3,26.2]`, and RT's final movement request is
`[0.47,-1.37] yd/s`. The departure initially continues away laterally from the
backer, and no achieved RT/LB_M block precedes the 2.75 wrap. A030 has the same
pattern after a 0.85 release. The final request has already passed through
engagement and spacing refinements; this alone does not identify its author or
prove that a different path was available.

The important opposing evidence is A027: Y leaves the wide-zone combination at
2.15, reaches LB_M at 2.70 and has recorded control about 0.6 and normal force
about 720 kg·yd/s² at 3.00. LB_M still reaches the runner. That is an achieved model
block, and it is excluded from the nine missing-access observations. An actual
block need not remove a defender from the play.

**All eight Quarters MOD run exposures have a transient receiver-tracking request
after run recognition, persisting when an acquired RB picture confirms carrying.** Their FS switches to
`man:X`, with a final request away from the runner. The simultaneous recorded
conditions last 0.25–0.50 seconds in these clips. At 2.00 s in A006, FS has
`pPass=.01`, a carrying-RB picture aged 0.25 s, and requests
`[4.80,8.17] yd/s` from `[44.9,31.2]` while RB is `[32.6,24.5]`.
Its achieved velocity still points inward: this is a request reversal, not
evidence that the safety has already retreated.

The current source explains the branch: before the acquired carrier crosses the
LOS, generic `pursueIfLive` returns no pursuit command. The special carrying-back
transition in `ManCoverage` applies to the personally marked back; X can still
be interpreted as a vertical stem. This establishes the control path, not its
counterfactual yardage cost. Preserving an alley roof through a deep mesh is
legitimate; the question is whether the intervening receiver-tracking request
preserves that roof coherently. Later `rob:X` labels alone cannot establish a
continued pass response: those techniques call `runFit` when they read run.

The nine access observations and eight transition concerns overlap in five
plays: **12/24 unique plays have one of these review questions**. This is a
balanced fixed-call panel, not an estimate that half of ordinary game runs are
defective. No physical law defect or counterfactually established wrong block
was demonstrated by this review.

## What should survive a correction

A006 and A042 duo create useful early releases and creases, gaining 23.25 and
9.99 yards. A006 gets 5.12 yards before recorded first contact, then escapes real
SS and CB_S wraps before FS finishes. Those two lost contests do not prove weak
grip. A042's SS earns and sustains the eventual finish. A028 ordinary power makes
a real LG kick fit with positive control and gains 4.50 yards. A005/A017/A041
counter show actual kick/stalk work and useful defensive convergence. Preserve
these offensive and defensive successes while investigating the repeated issues.

Power loses behind the LOS in three of four cases, but each has a concrete
defensive counter: an end squeezes/logs the kick or DT_S wins the down block.
The ordinary power control succeeds. A026's edge win against an outside-zone
reach and A013's interior win are also allowed football. Their losses are not
automatically extra entries in the defect count.

All 24 handoffs complete and all 24 plays terminate in tackles. A transparent
post-selection screen finds no native RB body-speed sample below 1 yd/s between
handoff and first carrier-contact event. This panel does not reproduce a broad
precontact runner-freeze symptom. Offensive teammate contacts with recorded
closing speed at least 1 yd/s occur in three plays: A028 RT/Y at 1.50 before
first carrier contact; A016 RT/LG at 2.80 and A018 RT/RB at 3.35 afterward. The
latter two cannot explain the initial run loss. These descriptive thresholds
are triage proxies, not preregistered realism criteria; they cannot exclude all
traffic or control defects. A004's holding event is retained separately from
the standalone physical snap outcome.

## Complete reviewed ledger

`B` means planned second-level access not achieved, with cause unknown. `C` means
the acquired-run/receiver-tracking request concern, with football consequence
unmeasured. A dash means no specific concern established by this review, not
certification that every action is correct. Every play has useful offense and
defense notes, stable player IDs, event times and raw hashes in the JSON ledger.

| Case | Matchup / call | Gain | Flags | Sequence or opposing evidence |
| --- | --- | ---: | --- | --- |
| A001 | speed-gap / inside zone | 1.97 | B | LG reaches LB_W; RT stays with DE_S; LB_M finishes. |
| A002 | speed-gap / outside zone | 2.52 | — | RG reaches LB_M; LB_M/LB_W recover through actual blocks. |
| A003 | speed-gap / wide zone | 1.14 | B,C | RT release 2.10 does not reach LB_M before 2.60 contact. |
| A004 | speed-gap / power | -0.34 | — | End squeezes kick; actual LG contact; Y holding event retained. |
| A005 | speed-gap / counter | 4.74 | — | Actual kick/collection and LB block; converging support finishes. |
| A006 | speed-gap / duo | 23.25 | C | Useful crease and two earned escapes; FS eventually finishes. |
| A013 | technique-elusive / inside zone | -1.24 | B | DT_S defeats RG and wins first; missing LB block has unproven relevance. |
| A014 | technique-elusive / outside zone | 0.95 | — | Y switches after DE_S falls; NB contests real work and finishes. |
| A015 | technique-elusive / wide zone | -0.27 | B,C | Y release does not achieve LB_M block; no precontact freeze. |
| A016 | technique-elusive / power | -1.55 | — | DT_S wins inside; teammate bump is after initial contact. |
| A017 | technique-elusive / counter | 5.91 | — | Useful kick and collection; safety support recovers after DT_W miss. |
| A018 | technique-elusive / duo | 1.79 | B,C | Early RT release does not reach LB_M; late RT/RB contact is downstream. |
| A025 | ordinary / inside zone | 4.04 | B | Useful LG climb/exchange coexists with missing right-side access. |
| A026 | ordinary / outside zone | -1.10 | — | DE_S beats reach and earns a backfield stop. |
| A027 | ordinary / wide zone | 0.33 | C | Y actually blocks LB_M; fitter recovers from a miss and finishes. |
| A028 | ordinary / power | 4.50 | — | LG kick fit works; one RT/Y bump does not prevent useful progress. |
| A029 | ordinary / counter | 2.35 | — | DE_W wins kick race; RB escapes initial wrap, LB_M finishes. |
| A030 | ordinary / duo | 2.01 | B,C | C achieves LB_W block; RT does not reach LB_M. |
| A037 | offensive-advantage / inside zone | 1.13 | B | Actual front loads and LG climb; middle fitter retains access. |
| A038 | offensive-advantage / outside zone | 3.72 | — | RB escapes end; corner closes from useful outside leverage. |
| A039 | offensive-advantage / wide zone | 2.78 | B,C | C reaches LB_W; RT departure remains behind LB_M. |
| A040 | offensive-advantage / power | -0.29 | — | Actual positive-control kick fit; end stays inside and reaches RB. |
| A041 | offensive-advantage / counter | 4.33 | — | Actual kick/stalk work; NB/SS earn converging wraps. |
| A042 | offensive-advantage / duo | 9.99 | C | RG reaches LB_M and opens crease; SS earns sustained finish. |

The next useful spend is a saved-state investigation of one ordinary
second-level departure and one transient coverage request reversal, with the
successful controls above. No new roster sweep or strength/contact tuning follows
from these descriptive counts.
