# Compose approach requests before forecasting

Question: does an oblique pursuit selector predict the action the defender will
actually request? The accepted helper scored raw original/arrival/brake commands;
its two callers then changed velocity, facing and technique through gathering.
This repairs that local contract. It does **not** solve the explosive-run tail.

Base accepted develop `2c98bed94adad8087c65f381d4090444ad283985`, source
`4273994fa50f0f11a54bff53b374ad87d80766be471ca727ce43f76fdef83571`;
producing/final queue `6575988fe9e72bd0aaf9e3573787f0dcb81ebf52`.
Runtime/tests `8d9da7fb1fea36ea72d1e8eefbd954a00bb45c20`, source
`2d303b2150526d143cf15c9f31c133e269175cae605611ef8269df0ca266ef9f`.
Node22.23.3, all44 resolved flags unchanged, RUN_CONTACT_COMPONENTS1,
GAIT_STEP0/CF_FLOW unset; World defaults/capacities/dependencies fixed.

## Minimal correction and evidence

`chooseApproach` accepts a pure optional command composer, identity by default.
It composes each candidate once, previews the complete result, and returns that
exact scored object. Early exclusions return the composed original without a
forecast. Both existing callers supply their existing gathering composition and
remove the outer blend. No new candidate, observation, randomness, timer,
margin, reach/force/gather policy or physics is added. This is the behavior-level
held free-space request, before containment, contact, spacing and later decisions.

The saved controller replay uniquely restores26 partial-gather snapshots before
counterfactual scoring; three ambiguous original requests are explicitly excluded.
Five choices change, with only small/mixed effective forecast differences (under
.05yd). They are snapshots, not26 independent snaps. Fresh saved replay bodies
from the separate contact-objective candidate retain that source qualification.

Six new complete native snaps reuse exact accepted inputs/baselines:

| Input | Accepted gain | Candidate gain | Evidence |
|---|---:|---:|---|
| WZ7 |25.85|26.19|Adverse ending; Mike first changes2.30, RNG2.60.|
| OZ4 |15.59|15.59|Requests/bodies/RNG identical.|
| WZORD |2.89|2.89|Successful wrap/finish retained; small FS change.|
| F_COUNTER |.22|.22|Requests/bodies/RNG identical.|
| PA13 |14.51|14.51|Requests/bodies/RNG identical.|
| Fresh F_Q_OZ |4.67|4.67|Same RNG, wrap/finish retained.|

At the first WZ7 difference, spacing changes both selected raw requests again.
Achieved closure improves2.459→2.651yd/s but distance only2.842→2.837yd and Mike
still never contacts the runner. The later+.34yd cannot be attributed solely to
that first choice after execution paths diverge. Do not promote on forecast
separation or imply better tackling from this contract repair.

39 focused checks/typecheck pass. Two new pass-through World contracts were red
on accepted source; original observed red receipt is explicitly reconstructed,
with its flag-recording limits. A first diagnostic launch syntax error is retained.
Wrapper command time24.691s plus the original red1.84s; native6, baseline6 reused.
No games, full-suite repeat, NFL query/download or default activation. Independent
review approves the local contract and says stop its variants here.

## Handoff

[Immutable evidence](https://github.com/tannerthardy/football-simulation-/tree/b977fe62f2f1e5c72f801ae53096150408b4fa92/data/reviews/defensive-pursuit-2026-10-20)
contains exact inputs, scripts, traces, first divergences, failed/adverse receipts,
independent review and fetchable patch. Extract composed-preview.tar.gz at repo
root. Run focused commands from receipt with baseline.mjs; native reproduction:
`node scripts/baseline.mjs --candidate -- node --import tsx out/composed-preview/capture.mjs run out/composed-preview/initial-inputs.json.gz out/reproduced 10`.
Saved replay requires accepted source and its recorded input locations; archives
and hashes identify the original baselines without rerunning them.

Independent from169/171/177 and the pursuit-objective producer;175/176 stay frozen.
Overlap: common.ts chase return and run-fits.ts edge approach call site, preserving
their force-leverage/force-track policy blocks. Integration owns combined checks.
If composing with acquired pursuit metadata, pass the entire final composer
(`command => ownApproach(blendApproach(command, near, gather))`) and do not blend
twice. No combined-source native or full verification is claimed here.

Next meaningful question is pursuit navigation through legitimately occupied
teammate traffic, not another selected-play interception variant.
