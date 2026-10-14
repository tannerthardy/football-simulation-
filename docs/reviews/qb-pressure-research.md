# What NFL pressure research changes in our next experiment

**Investigate the QB's threat forecast before changing rush speed.** The new
primary sources support tracking relative motion, protection and the QB's
opportunity to deliver a pass. They do not establish a universal panic time or
justify stronger grips. Our unchanged baseline's 2.40-second median release
does not suggest generally excessive reading time. The repeated, concrete
defect remains a contact-danger estimate that can stay above its emergency
threshold as an edge rusher acquires the QB.

Network access now works: the NFL article, arXiv papers, journal metadata and
QB perception studies were retrieved successfully. The earlier access failure
is resolved. This review adds **research and an offline diagnostic**, not a
production QB change. No candidate has been integrated or promoted.

[Source manifest](../../data/research/qb-pressure-sources.json) records URLs,
versions, retrieval time, document hashes, reading scope and limitations.
[Diagnostic receipt](../../data/reviews/current/qb-pressure-research-check.json)
records exact code, baseline, all 43 flags, original films/signatures, controls,
numerical adverse evidence and runtime. Large source documents and detailed
diagnostic curves remain under ignored `out/qb-pressure-research/`.

## The useful research

| Source | Finding relevant to this sim | What it does not establish |
| --- | --- | --- |
| [NFL Next Gen Stats, September 21, 2023](https://www.nfl.com/news/next-gen-stats-introduction-to-pressure-probability) | A free path or won matchup can create pressure before close contact. Blockers, QB response and time available matter. The NFL replaced its older proximity-only detector with evolving pressure probabilities. | Its **75%** classifier threshold is not a QB reaction setting. Its **2.9 s** time to pressure is an **average**, not our median or a universal deadline. Its **10.3%** rate is per individual pass rusher, not per team dropback. |
| [Nguyen, Yurko and Matthews, STRAIN](https://arxiv.org/abs/2305.10262v3), published in *The American Statistician*, 2024 | Measures closing continuously: **STRAIN = −distance derivative / distance**. Motion of both the QB and rusher contributes. This is useful evidence between snap and a binary sack result. | Scalar closing is not an interception, visual perception model or grip law. A defender can close rapidly while passing outside reach. Full-play averages and future peaks cannot be online agent cues. |
| [Pipping-Gamón et al., opponent-adjusted pass protection/rush](https://arxiv.org/abs/2604.01491v2), October 7, 2026 preprint | Separate early block wins, pressures and sacks; assess blocker/rusher strength together with help. Quick release truncates the opportunity to observe a block win. Later pickups can change responsibility. | The **2.5 s** grading window is a measurement convention. One-season ratings and EPA associations are not causal physics or controller tuning. Peer review is not established. This paper studies **2021**, not reserved 2026 NFL tracking. |

The full STRAIN preprint read is **v3, July 31, 2023**, verified from its PDF
header; journal metadata was checked separately. The opponent-adjusted paper
read is **v2**, with initial assignments and its quick-release/attribution
limitations retained. Neither paper warrants treating an analyst's all-field
tracking or retrospective block labels as information the QB actually sees.

The perception research supplies a useful constraint, but no pressure clock.
[Shaffer and Maynor, 2011](https://pubmed.ncbi.nlm.nih.gov/21692429/) report that
passing to a moving receiver can remain accurate during visual occlusion.
Only its abstract/metadata were accessed: it supports retaining legitimate
anticipation, not exact knowledge of an unseen receiver's future conversion.
[Powless et al., 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7077253/) studied
four high-school QBs making decisions from occluded film. Accuracy improvement
was not demonstrated causally; reaction-time evidence was moderate and
task-specific. The paper also acknowledges that more than one football choice
can be appropriate. A different ending cannot be judged from one answer key.

[Boone et al., 2025](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1540498/full)
find associations between cognitive assessment and later performance in 42
NFL QBs. Their selected sample, quiet-room assessment and unmeasured line,
scheme and coaching context cannot calibrate our reaction delay or generated
capabilities. Capability changes remain separate and paused.

Exploratory repositories were inspected as supplementary evidence. One class
project reverses the BDB `I`/`IN` result labels in its analysis; another samples
only charted pressure plays shortly before the terminal event. Neither supplies
an accepted pressure effect size, blind-side penalty or online detector here.
Their exact revisions and exclusions remain in the source manifest.

## Check this against the existing NFL and sim evidence

The [current timing audit](pass-rush-timing.md) already has exact restoration of
181 native called-dropback labels, 32 saved full signatures and four portable
observed/plain control pairs at unchanged `4ded6b6`. Reuse that evidence. Its
165 clean dropbacks have 148 releases, median **2.40 s**, p90 **3.20 s**.
The retained 2022 weeks 1–9 NFL tracking reference is 2.60/3.90. Different
scheme, players, selection and operators prevent a league-calibration claim;
they do not support a blanket rush-speed increase.

Our strict pre-decision two-yard measure gives **24.8%**, while the shared
10-Hz tracking operator gives **36.4%** on those same 165 clean dropbacks.
The earlier audit explains the release-frame, scramble and resampling
differences. Neither is the NFL's learned pressure probability. Do not use the
NGS average or classifier threshold to force either rate into agreement.

The retained two-week 2022 pocket sample has **707/2,304** geometric pressure
plays. Of those, 73.7% throw, 18.4% end in a sack and 7.9% scramble; median
pressure-to-outcome interval is **0.4 s**. These are conditional terminal-event
statistics, with an inclusive outcome frame, **not a measured cognitive
reaction time**. Pressured throws are later than clean throws partly because
holding the ball longer creates more opportunity to become pressured.

In a separate traditional-dropback pocket-push cohort, a listed blocker is
within 1.5 yd of the nearest rusher at **76.1% of 531 first two-yard entries**.
This is a geometric proxy, not a loaded engagement; 20.9% of first entries
coincide with the outcome frame. It cannot be compared directly with our
39/41 inactive engagements. It does reject the assumption that nearby
protection universally makes a rusher harmless. Attached rushers and an
inward-moving pocket must remain pressure controls.

## Smallest same-picture geometry comparison

Question: **does relative-motion contact geometry explain the saved danger
mismatch while retaining the protected pocket and pressure-throw control?**
Use just P46, P150, P39 and P67. Keep each actual selected defender, consumed
picture, generated physical profile, fatigue multiplier and original held-block
penalty. Use the QB's own recorded position/velocity. Compare the old .8-yd
center forecast, the previous radius-only outer bound, a swept relative-motion
outer bound, and the existing feasible moving interception estimate. No actor
selection, observation, execution draw, movement request or physical step
changes. Do not extrapolate `Perceived.age` again: position is already projected.

| Saved encounter | Original emergency estimate | Radius-only bound first warns | Relative-motion / feasible-intercept bound first warns | Actual baseline |
| --- | --- | --- | --- | --- |
| P46: COM-QB1, IRN-EDGE1/DE_S | Never below .45 s before first grasp | 3.00 s | **2.95 s**, swept motion | First grasp tick 3.15, sack 3.55 |
| P150: IRN-QB1, COM-EDGE4/DE_W | Never below .45 s before first grasp | 2.00 s | **1.95 s**, swept motion | First grasp tick 2.30, sack 2.65 |
| P39: COM-QB1, protected play action | No emergency | No emergency | **No emergency** | Throwaway decision 5.05; actual COM-TE1 catch −.27, IRN-LB2 tackle |
| P67: COM-QB3, IRN-EDGE2/DT_S pressure | 3.25 s, the decision that begins windup | 3.10 s | **3.15 s**, stable combined; swept alone 3.20 | Windup 3.25, missed tackle 3.40, release 3.45; COM-WR2 catches, IRN-CB1 tackles, 14.88 yd |

Physical contact occurs during the World step after its recorded event tick,
not at the exact beginning of that tick. The relative-motion bound buys .05 s
over the radius-only diagnostic in both sacks, using information already
consumed. This supports the geometry mechanism. It does **not** show that
different QB feet or a hurried pass will save either sack.

P67 is the important opposing case. The new estimate becomes urgent while
the QB is still searching, before the ordinary successful pressured throw.
It could produce a sensible earlier throw or a worse escape/throwaway; the
static comparison cannot decide. Preserve that uncertainty instead of calling
earlier alarm a football improvement or a regression. The actual windup is
.20 s, and the baseline pressure branch finds viable throws at 3.25; threat
recognition should be assessed together with an available delivery opportunity.

The literal interception grid represents .45 as `.44999999999999996` at
P67's 3.10 tick. Retain that raw result beside the comparison using a 1e−9
tolerance: the stable combined warning is **3.15**, not 3.10. This is numerical
measurement evidence, not an installed change to the engine's emergency gate.

Eight direct geometric checks pass: head-on entry, lateral miss, receding
motion, a receding body already inside the envelope, stationary separation,
already-projected age, common-velocity invariance and QB escape matching the
rusher's velocity. Full reach remains an **outer bound on possible hand contact**,
not a guaranteed acquisition, load or fall. The interception helper's failed
fallback is rejected by a feasibility check.

The tested diagnostic is `be8f65a11a99e130cb48a325e1290fed6854ebdf`, following
the preserved literal comparison at `dea869331d3f7a553915d7e8ef950ca3e5143e49`.
Runtime remains
`8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c`;
remote integration was reverified at
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1` on October 14 UTC. Both launches
use `run-game-2026-10-13`, Node 22.23.3, all 43 baseline flags and no overrides.
The two static commands total **0.73 s**. There are **zero new plays, games,
observation queries, execution draws or full suites**. The second command only
resolves the grid-threshold issue; it reuses all film. No outcome is censored
or relabeled, and there is no fresh-player transfer claim.

## Development decision

**Substantial progress remains possible; this is not a physics roadblock.**
The next controller experiment should make the contact-danger objective
consistent with observed relative motion and the movement the QB requests.
First connect geometry alone to the existing policy in P46/P150 against
P39/P67, with physics fixed. Measure the first changed decision, requested and
achieved feet, throw/windup opportunity, first contact/load and natural ending.
Do not introduce a global radius shortcut, forced escape or persistence timer.

Removing privileged information remains a separate arm. The current forecast
uses live engagement/win, down state, blind-side geometry and fatigue alongside
delayed pictures. An observed replacement must distinguish an open rush lane
from protection that is holding or being driven inward. A nearby blocker is
not an immunity switch. Record available teammate cues neutrally before
testing that replacement; these films did not record those pressure-call
teammate observations, so using their true body positions would manufacture
evidence. Delayed defender pictures and QB memory must retain their existing
information limits. Other private QB route/protection reads remain separate
work, rather than being silently declared resolved.

Test geometry and information separately before combining. Expand to fresh
players and quick/dropback/play-action inputs only when the four encounters
produce coherent decisions. Include attached inward pressure, fast lateral
misses, attainable hurried throws and ordinary successful protection. Report
regressions and legitimate changed endings; do not promote a forecast merely
because it changes sacks or YAC. Keep helper coordination, roster correction,
pass-protection policy and shared World changes with their owners. The run-game
integration lead retains the full-suite check on any exact combined candidate.

**Integration status: research/diagnostic handoff only.** Nothing visibly
improves or regresses in football yet, because all physical outcomes are fixed.
Earlier danger recognition in the two recorded sacks is supported; whether it
creates better QB behavior, survives P67 and transfers is the next decision.

Reproduce the static check after reconstructing the two unchanged native
recordings with the commands in [the timing audit](pass-rush-timing.md):

```sh
npm run baseline:run -- --receipt out/qb-pressure-research/check-receipt.json -- node --import tsx scripts/diag/qb-pressure-research-check.mjs out/qb-pressure-research/same-picture.json out/pass-rush-timing/native3101/summary.json out/pass-rush-timing/native4202/summary.json
```
