# Ordinary seed-53 football diagnosis

## Verified premises and scope

Current develop and working HEAD at declaration: `50b80062815716b902438f9a7fa227535a255ea0`; rechecked unchanged at handoff. Engine SHA256 `c243e860434d690f6b2fb94785bc7a22b3424716d92e6dc6f18a2afceb6f0ed1`, Node22.23.3;89 actual source settings, no overrides; settings hash `a8a643b101cac2556b65dacfac456761c919090d4796d8f0ebd39090404a4559`. Full objects and lockfile identity are in sample.json.

#270 remains a draft at `0b62e46de15fb0d6891433fbe68b9ce24dcc9efb`, not a runtime dependency. Its older producer is cac9e100, not this build. P006 Y and P007 RG from that older sample naturally release: “never releases” is false. Earlier useful release remains unresolved. Historical18 recordings remain unavailable, untouched and unlabelled here. Pending runtime branches are excluded.

## Declared sample, then independent first pass

Declared in declaration.json before capture or detector inspection: ordinary export-replay/capture-game-play recipe, seed53; FIRST SIX non-nullified completed native run/pass results after kickoff; at most20 normal Game.step calls; no outcome replacement. This means completed scrimmage execution, not completed passes. `Rng(53)` generates Ironmen IRN then Comets COM sequentially at strength0.55. A distinct `Game(seed:53)` forks its coin/snaps/kicks/tempo/calls/coordinator streams. No league sampler is used. Native play seeds below come from the game's snaps stream, not53. RNG states and whole-team input hash are in sample.json.

Reached six eligible plays in SIX steps. P001 kickoff excluded; no nullified plays, missing constructors or replacements; not undersized. All selected offense is COM. Capture+scouts full-recorded prefix equals the observer-off full-recorded GameResult exactly. A third prefix without recording equals it after removing only replay envelopes. Three matched six-step prefixes,18 steps total,6.76s collection; no completed games. These are repetitions for neutrality, not18 independent football observations.

Existing standalone viewer inspected all six in official order at snap/1/2/3/4/end (clamped), alongside the original event timeline. First-pass notes were frozen BEFORE opening sealed-detectors.json: SHA256 `0d4749742ad8892048ecceefeb8df9cbefb693bd0887a32d38293346f888b68f`. This is independence from alert selection, not a pristine blind holdout or population study.

| Play | Native play seed | Ordinary result | Independent first pass |
| --- | ---: | --- | --- |
| [P002](G1-P002/original.html) |520286813|Y-Cross, incomplete|Normal pressured outlet nomination, no supported defect. No scout alert.|
| [P003](G1-P003/original.html) |704987242|Inside Zone Weak, +15.25|Exchange/climb and gain coherent; receiver responsibilities may explain non-support. Not selected for deeper diagnosis.|
| [P004](G1-P004/original.html) |334912076|PA Post-Dig, sack −7.88|Nominate edge protection. Initial visual LT attribution corrected to RT by installed targets and contact events.|
| [P005](G1-P005/original.html) |3590575717|PA Flood, +12.33|Pressure/missed attempt/throw/catch sequence coherent; success does not certify protection. Useful opposing offensive escape.|
| [P006](G1-P006/original.html) |4193710032|Y-Cross, +11.39|Catch followed by closing/tackle, no supported independent bust. This is NOT historical#265 P006.|
| [P007](G1-P007/original.html) |1440603530|PA Post-Dig, QB scramble +2.39|Nominate throw-versus-run decision despite apparent separation. Exact read/risk and own-arrival checks below.|

All setup hashes and player/team/slot/index identities are in input-summary.json and play.bin. Raw first-pass nominations stay unchanged even where corrected below.

## Strongest case: stationary QB's scramble test assumes instant speed

[Short playable clip, QB preselected](clips/G1-P007.html) · [WebM](clips/G1-P007.webm) · [Exact selected trace](G1-P007/selected-trace.json)

**Classification: supported decision-estimate defect**, not proof the QB should throw or that a2.39-yard scramble is a bad football outcome.

- Exact actor COM-QB3 / O:QB / index0, T.Gray, Gunslinger. Input SHA256 `9ccf69cacb6223fe0f28db393165371517caf6658c627332f04dd6da375204ff`. Decision interval2.80–3.65s; clip adds achieved context through5.90s.
- Installed responsibility is QBPass on PA Post-Dig. At3.00 the progression leaves Z for X. At3.20 the actual X estimate has completion0.52008 and interception0.07935. Gunslinger thresholds are0.5154 and0.06025: probability passes but risk fails. At3.60 the best remaining X estimate is0.35524/0.12954, failing the out-of-reads gates0.4154/0.09025. Thus “ignored an open receiver” is not established by the film.
- At3.60 pressure arrival estimate is1.875s, not imminent-panic. Clock urgency is0: setAt2.45, snapAt0.10, drop.time1.95, clock3.85926. Read index2 is exhausted. The nonpanic mobile-QB branch calls shouldScramble, admits a lane, then its existing random opportunity check starts the scramble. No change to random streams was made.
- Entered owner is QBPass. At3.50 raw/final movement is(0,0); the QB is standing. At3.60 the entered QBPass transitions to BallCarrier and emits(9.13030,0)yd/s, full forward requested speed, with no downstream rewrite. Endpoint3.65 moves only about0.0077yd. Support is up, no engagement/bond at the decision. Complete state, stage ownership and actual observations are in selected-trace.json.
- First causal bottleneck: QBPass.shouldScramble uses `distance / (profile.vmax *0.8)` for the QB while defenders get finite-acceleration timeToReach. With the QB at rest, vmax9.13030yd/s and tau1.47144s, this treats a9.19yd centre-lane trip as1.25760s. Even an optimistic fresh, aligned, full-effort scalar sprint takes2.13199s; an aligned held0.8-speed request takes2.45083s, reproduced by the existing free motor at0.01s steps in2.45s. These are unchanged athlete capacities, not a new calibrated law. Full-effort is the generous comparison because the emitted carrier command actually asks full speed.

| Inputs at3.60 | Lanes exceeding existing0.35s margin |
| --- | ---: |
| Native steady-speed self / live defenders |4 of5|
| Steady-speed self / already-consumed QB defender estimates |4 of5|
| Fresh aligned full-effort acceleration self / live defenders |0 of5|
| Fresh aligned full-effort acceleration self / consumed estimates |0 of5|

The same4→0 contrast holds at3.55. With the generous full-effort self model, the largest3.60 margin is only0.044s using live defenders,0.087s using consumed estimates; all fail the existing0.35 criterion. Source-qualified native inputs, every lane/limiter and the failed information-only explanation remain in lane-comparison.json and arrival-comparison.json. No controller treatment or alternate football outcome was run.

Actual execution is consistent with the acceleration concern: scramble event3.60, first recorded grasp5.55, and the QB does not first cross the lane test's `LOS+1` x-plane until sampled time5.80 (the path's y differs from the tested points). The native contact is not a proof those frozen forecast defenders would have reached each point. Future reactions, contacts and decisions remain unknown; arrival estimates are not physical contact guarantees.

A separate supported information-contract problem also exists: shouldScramble directly reads defender positions, velocities, engagement and down state rather than the QB's acquired picture. The actual window computations already consumed estimates for all11 defenders; memory ages0–0.10s differ from underlying perception-read ages (including0.25/0.45s). Returned estimate positions differ from live bodies by up to0.65yd in this window. **Replacing these positions alone leaves four lanes open**. It is not the demonstrated cause of this admission. No extra perception calls were made to obtain those estimates: a wrapper copied only production calls' returned values and existing memory timestamps, with complete original execution equality checked.

**Credible alternative and cost:** use an own-motion arrival estimate consistent with the requested motion and actual starting velocity when judging a lane; retain freedom to run a shorter/different escape. This may reject some valuable risky escapes and expose the QB to a sack while waiting. It does not establish that throwing X or holding still would be better. No throwing-risk thresholds or athlete capacities should be changed on this evidence.

## Second interval: P004 is a real lost rep, not an established LT bust

[Short playable clip, RT preselected](clips/G1-P004.html) · [WebM](clips/G1-P004.webm) · [RT trace](G1-P004/rt-trace.json) · [Initial LT opposing attribution](G1-P004/selected-trace.json)

**Classification: unresolved controller/capacity adequacy; several appearance-based defect claims rejected.**

- Native actor COM-OG2 / O:RT / index2 (P.Porter), assigned IRN-EDGE1 / D:DE_W / index11. Input `7b57d278b264da70c37bef152c37d18cbc5b2e896a2f457b4543c76d4edd8ed4`. Despite his roster guard position he occupies the native RT role. LT COM-OT1/index1 retains DE_S/index12; he is not assigned the sacking rusher. Do not confuse flipped display side with slot identity.
- PassProtector is the entered owner throughout. Before contact it reads coordinator/live-rusher state directly; **there is no decision-phase acquired-rusher read** to which an honest visual age could be assigned. Spacing reads of teammates are not its rusher picture. This is explicit information debt, not a proven cause of this sack.
- At1.00 RT requests(−5.785,−0.308), no rewrite; achieved endpoint velocity is(−2.137,+0.080). At1.20 pass contact begins. At1.50 raw stand is rewritten by engagement to(−5.755,−1.079), with preceding-solve hand normal force about1080 and tangent375kg·yd/s² at the1.50 step start (about1074/372 after its solve). Controller-start and completed-solve clocks remain distinct. “Standing instead of blocking” is false. The primary swim attempt is recorded as not landed.
- Leverage phi rises0.16 at1.20 →0.70 at1.50 →0.88 at1.60. A geometric `abs(phi)>=1` test emits “turned the corner” at1.70; no new pass-shed strike impulse is awarded by that branch. At1.60 normal hand load is0 and tangent392; the joint is gone by1.70. Support remains up but balance is depleted. Do not declare the contact law correct or incorrect from that one observation.
- At1.75 the unengaged RT's raw/final command(−6.894,+2.518) chases the inside hip; achieved lateral velocity still−0.496 as momentum redirects. Pressure is recorded2.15, grip2.30, sack2.55. The blocker is trying to recover; he has not simply stopped.
- Credible alternative is an earlier achievable depth/inside-shoulder set, which could also concede an inside counter. Whether it is attainable without sacrificing useful work is unresolved. P005's ordinary escape/completion is retained as an opposing pressure outcome. No stronger grip, speed boost, automatic win or physical default is proposed.

## Detector overlap, opened only after the first pass

Nine retained scout episodes in these six plays:2 stuck,3 turned,4 backpedal; no presnap/slide. This is not precision/recall or a rate of errors.

| Play | Scout nominations |
| --- | --- |
|P002|none|
|P003|LT/RT stuck2.20–2.40, DE_W turned2.40–3.15|
|P004|RT backpedal1.70–2.55; starts at the shed, not the earlier approach|
|P005|C backpedal3.60–3.80|
|P006|LG backpedal2.45–3.20, C backpedal4.10–4.30|
|P007|DE_W turned4.70–5.05, DE_S turned5.45–5.90; neither is the QB decision|

The strongest supported estimate problem was found by the ordinary first pass; no scout nominates QB2.80–3.65. Later turned-defender alerts do not count as detecting it. Remaining unreviewed alerts are not labelled defects. Stop at this declared sample.

## Owner handoff and next decision

See owner-handoff.md for Main Engine / QB and Trenches. No simulator policy has changed. No new queue, viewer or detector family was built. No new merge/reference decision is needed for this research. Two short clips are supplied for owner examination; there is no standalone Tanner football-adjudication request yet, because the next missing answer is a bounded model/decision experiment rather than a vote on dots.
