> Publication note: this is the frozen Phase II research report. Source pins, local paths, commands and numerical results describe the retained evidence package. See the [publication index](README.md) for remote evidence access and the next-work plan.

# C — Native observation, identity and reproducibility

`observer.mts` restores each original serialized constructor and calls production `PlaySim.run()`. It does not pre-tick a prevented snap. Original input SHA256 is `610196ce8a41acdd51e2072d496a5ba5426e74364ddb9878d2ef067c94a6a4f4`. The same40 inputs reproduce40 captured calls,37 permitted snaps and53 initial jobs,51 combination and2 direct. Prevented calls are S7-P029, S8-P004 and S9-P039. They remain in all replay results but outside live-job counts.

Historical code is `58e0f5ee13e1c29e9e6ab91cc22cccc576cfe3d7`; current accepted code is `a5b024b9fbf8c51fc31401eefb79737be586814a`. Their sourceVersion hashes are `56757b2eae1615d59ff4ec399c30d81f422b3e29015b0961de815e4d7dfc7e6f` and `8dd26440610c1a08b55b02c9e01cdbd5cf78c9cd6649ce801902a7068419f978`. Node is22.23.3. Only carrier behavior and a pursuit test changed between these accepted trees; see `accepted-delta.patch`. Initial actor/job/setup identities agree across the historical and current census. Do not recapture the same ordinal from a changed game and call it the same play.

## What is recorded

The existing command-trace sink records each pre-update and post-update body, support and spin; initial and current behavior/plan/target; possession and phase; engagements and their members; contact and ground impulses; hand normal/tangent resultants and vectors on the defender; actual acquired pictures returned to each actor; raw controller requests; every recorded command rewrite; final World intent; native events and result. Initial actor identity, profile, player and installed job remain attached. `compact.py` is a derived film projection, not the evidence source for every field.

The observer's `observe` callback copies existing returned pictures. It never invokes `see` itself. It does not execute an extra controller, consume randomness or alter a timestep. Native updated targets are recorded independently of initial job targets. `responsibility-timeline.json` and independent native `block_threat` event reconstruction expose the distinction.

## Non-invasiveness

Every root replay is run once without the sink and again with it, from identical constructor bytes and, for interventions, the same intervention setup. After removal of the sink, `stateGraph` compares complete reachable own data structurally, including arrays, Map/Set entries, typed arrays, reference identity, body/support, player minds, perception history, world caches/joints, ball, phase, time and RNG state. Complete PlayResult equality is checked separately. Functions are represented by name; the observer does not replace them. WeakMap/WeakSet entries are compared only on reachable actor/body/joint keys. Inaccessible module-private state and unreachable weak keys are not claimed to be exhaustively enumerated. This is a strong bounded non-invasiveness check, not a formal proof over all future executions.

| Root arm | Input replays | Exact state and result equality |
|---|---:|---:|
| Historical original |40|40|
| Current original |40|40|
| Radial-unload pilot |4|4|
| Wider-arc pilot |4|4|
| Wider arc, historical |40|40|
| Wider arc, current |40|40|
| Historical selected-hand removal |16|16|
| Research budget repair |40|40|
| Clean minimal budget repair |40|40|

These264 paired checks are528 native executions of overlapping inputs, not264 independent football observations. The16 selected-hand trials use16 loaded jobs and may reuse a play. Physics and information lanes separately document their own executions; do not add their repeated inputs to this population denominator. The clean minimal budget patch additionally reproduces every full frame and result of the instrumented budget arm on all40 inputs (`physics/budget-zone-clean-certificate.json`).

## Identity and collector-version limits

Each index retains engine root, accepted pin, source-content hash, Node version, resolved settings, lock hash, original input hash, per-play setup hashes and runtime. Final collector versions also retain observer hash and explicit research environment values. Earlier root indexes predate these metadata additions; do not treat the final script hash as their invocation-time hash. The passive collection logic and per-play payloads remain available. The accepted settings and source are fixed in the earlier indexes. Research patches and final source archives reproduce final scripts.

The physics lane uses both a Python per-file manifest hash and repository `sourceVersion`. The two concatenate identical filenames in different sort orders and therefore differ. `physics/source-hash-order-certificate.json` explains this; use per-file hashes or the explicitly named algorithm, not an unqualified aggregate hash comparison. Final research sourceVersion is `e28551bf02d90ddc7c7614b0b770fab883b8a39ea6ac48d54eaf40902b2e9688`; clean minimal candidate sourceVersion is `4c39c3636609629fb88ac0482dfaced7cbfdfe34cf77be9aa7e5de3b719b4ea2`.

## Operators and corrected claims

Full observer traces retain acquired pictures separately from physical state. `opportunity-screen.py` derives actual event roles, initial targets, member and other-blocker load, releases, keeper-load duration and approximate retrospective reach. The first-contact window is a screening window; the target's later actual contacts remain available. `build-job-ledger.py` does not grade success from yards. `reach-islands.mts` is an intentionally permissive physical relaxation. `corridor-compare.py` reports a fixed-reference geometric comparison with explicit changed-pursuit-task warning. `hand-ablation.mts` is a conditional force-channel intervention, not a fully unblocked-defender counterfactual.

The two QB-retained calls S8-P054 and S10-P006 remain measured against the actual QB when no non-QB recipient exists. Tied first contacts in S7-P067 and S8-P005 remain tied. The observed14 loaded jobs by first contact are not14 successful blocks. Initial target identities remain fixed for census comparability, but nine rows have a later `block_threat` event from the departing/direct actor, irrespective of resulting plan kind, so no-load-to-original-target is not automatically failure of a current responsibility.

Historical manual-tick results are retained only in the original package's invalid/superseded locations. They do not reenter current native counts. The former NFL comparison is a postselected positional pattern measure; it has neither the same denominator nor the same contact event as these installed jobs. See `TRACKING_COMPARABILITY.md` for the measurement correction and limits of available NFL data.

## Inspection and reproduction

`figures/native-film.html` is a self-contained six-case native-position film with historical/candidate overlays, actual carrier, loaded hands and current target. It reads saved20 Hz endpoints, not a newly generated game. `figures/departure-paths.png` and SVG show the same sampled paths; distance alone does not grade control. `JOB_LEDGER.md`, CSV and JSON expose all53 rows. Full acquired pictures and rewrite stages remain in per-play gzip traces.

Use `REPRODUCE.md` for exact commands and source reconstruction. Verification hashes every package file; it is separate from re-running football. Failed or superseded collector probes in the information/physics lanes are preserved and explicitly excluded from causal claims.
