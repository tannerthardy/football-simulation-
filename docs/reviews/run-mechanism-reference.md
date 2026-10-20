# Compare complete run mechanisms with NFL evidence

Use one identity-preserving sequence ledger to ask whether a correction improves
the player's useful football job through the next transition. Keep geometry,
native control/contact evidence and the final outcome separate. A better rushing
average, longer contact or smoother path cannot answer all three questions.

Accepted source inspected: `2c98bed94adad8087c65f381d4090444ad283985` through
#168; canonical queue `4cc3337df24faa6d857b612ae62e3df3109a5296`.
The saved native demonstration uses #172's three preselected paired inputs,
not a new simulation panel. Its controller candidate remains distinct from the
accepted baseline. [Selection](../../config/run-sequence-reference.json).

## The comparison

Follow the same carrier, initially front-aligned and second-level defenders,
and candidate blockers through snap, completed exchange, runner arrival,
approach/contact and known ending. Keep defenders outside the initial box too.
Never replace an actor with whoever is nearest at the next phase.

| Question | Shared observable measurement | Additional native evidence |
| --- | --- | --- |
| Does blocking remain useful at arrival? | Fixed-pair separation and blocker projection/off-axis distance on the defender-to-runner segment; continuity immediately before runner passage | Actual assigned job, hand load, keeper/helper ownership, rep ending and earned release |
| Is lateral work happening? | Same-actor lateral/longitudinal displacement and stored velocity, with coordinate sign retained | Chosen work direction, facing, request before and after available refinements, achieved velocity |
| Does second-level collection arrive in time? | First sustained same-pair proximity compared with local runner arrival; never-reached and uncertain cases retained | Installed LB target, admission/release, useful load and traffic |
| Does pursuit preserve useful position? | Fixed defender separation, longitudinal/lateral leverage and closing velocity at named phases | Responsibility, acquired cue/age and selected approach when captured |
| What happens after contact? | Valid strictly pre-event speed; exact later checkpoints with exposure/earlier endings; contact-to-known-ending | Body impulse, acquired wrap, actual loaded episode, break/re-contact and recovery |

The first observed at/past-LOS sample after exchange is a common phase anchor;
with missing samples it is not an exact crossing time. Local runner arrival is the first
consecutive-valid crossing of the **same defender's longitudinal plane after
the exchange**, with later crossings retained. This anchor does not prove a
collision or a useful interception. A side-on encounter may occur before this
plane is crossed. A QB sneak can explicitly begin at snap. An absent exchange
for a non-QB remains unknown.

Interposition reuses the existing `seal.py` geometry: candidate blocker within
1.2 yd of defender, at least 0.2 yd toward the runner, no farther than the
runner along that segment, and at most 0.9 yd off it. Continuous values accompany
the marker. Sustained proximity uses the existing two-frame 1.0 yd admission /
1.5 yd continuation convention. **Neither marker is an engagement, legal seal,
correct assignment, force, grip or successful block label.** All eligible
noncarrier/non-QB offensive candidates retain separate IDs.

Keep no-LOS and early-ended plays: these can be legitimate defensive wins.
Missing samples interrupt observation rather than prove a release. A known
ending bounds an episode; it does not reveal when a physical hold stopped.
Report plays, actors, pairs, valid samples/intervals and later-window survivors
separately. Summaries give each play one mean/fraction rather than letting long
plays or crowded boxes acquire more weight.

## The frozen NFL question

**In the existing outcome-independent run subset, how do the same front and
second-level defenders translate and retain depth, and what blocker geometry
exists when the runner reaches their plane?**

Reuse the exact 12 runs in the prior movement-continuity selection from game
`2022091200`: five OUTSIDE ZONE, two INSIDE ZONE, two MAN, one COUNTER, one
SNEAK and one POWER. Selection originally used week-one file order, not gain.
The new query extends those IDs to actual annotated termination when available;
it does not choose replacements for short, missing or unattractive examples.
This is an operator/witness sample from one game, not an NFL frequency study.
MAN is retained as the provider's broad label, **not verified Duo**. Toss is not
inferred merely from a wide exchange. No other concept is silently relabeled.

```sh
python3 -I scripts/diag/trench/run-sequence.py \
  --nfl-dir /workspace/football-yac-angle/data/raw/bdb2025/big-data-bowl-data \
  --selection config/run-sequence-reference.json \
  --out out/run-sequence/nfl.json
```

Run this once where the verified CSVs live. It hashes the four consumed files
against the restored-file receipt, then streams only until the exact selected
plays are found. The compact result includes exclusions, valid/missing actor
samples, fixed identities, phase geometry, terminal truth and operator hashes.
It does not download, collect a sim, convert a season or export raw trajectories.

Do not pool an unknown arrival into failed interposition: the summary reports
fully observed versus incomplete defender-arrival exposure and gives the
fraction only among fully observed candidate geometry.

Provider velocity uses `s/dir` with the documented NGS angle convention;
leftward plays rotate position and velocity together. Provider smoothing and
clock uncertainty remain. Sim movement uses stored body velocity. Neither
side differentiates rounded positions. Entry speed uses a strictly prior
sample; it never borrows post-contact samples. Later checkpoints distinguish
early known endings, missing samples and recording censors. Physical post-label
progress and official-yard residual are separate, neither automatically an
official after-contact statistic.

The older common converter/metrics remain preserved with their original
definitions. Their ID removal, forward filling, 0.1-yard quantization,
centered velocity and last-frame ending fallback make them unsuitable for
these new precise claims without raw enrichment. This query reuses the raw
run-reference eligibility, coordinates and geometric-front helper instead;
it does not silently replace historical aggregates.

## Data access and acquisition

The data holder previously verified the archive and restored week-one inputs;
that historical receipt is useful provenance, not a mounted filesystem here.
This executor has no BDB raw/converted cache. The verified small common packet
was restored and checked locally: `ed6ebd2`, 382,985 bytes, SHA256
`82d82db057a804ecdee71eba0038a17810acbea0dfb9c155941f7c649759ac60`.
It contains selected IDs, prior results/operators and receipts, **no NFL raw
or converted trajectories**. The isolated AMF sample is not substituted.

The cataloged BDB2025 archive is:

- [Supplied source](https://drive.google.com/file/d/1gL9sbsrRPvrR21alUB83fcsvWRbgohk7/view).
- 1,219,840,421 compressed bytes; SHA256
  `743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3`.
- All nine tracking members: 8,111,559,585 extracted bytes. This query needs only
  week one plus metadata: 1,030,934,666 extracted bytes. Keeping the archive
  and these four members requires about 2.25 GB, rather than all nine weeks.
- Intended durable cache: `/workspace/datasets/nfl/bdb2025/`; raw files stay
  outside the simulation repository. Preserve the verified ZIP for reuse.

A direct HEAD request to the supplied download endpoint on 2026-10-20 returned
HTTP 403; a bounded GET also failed at the proxy CONNECT tunnel with HTTP 403,
receiving zero archive bytes. No new archive was downloaded. The actual query
attempt exits nonzero and retains all 12 requested IDs as **unrun**, with zero
measured tracking groups, rather than reporting an empty successful sample.

The smallest completion handoff is the command above on Catching's existing
verified host, returning its compact result/receipt. A local-cache alternative
needs a reachable approved source or a permitted four-file transfer with the
selection's exact hashes. Public availability/private-repository access does
not establish provider redistribution rights. Do not publish raw tracks or
create an unauthorized mirror to resolve the access gap.

## Saved native demonstration

[Compact measurements and source receipt](../../data/reviews/current/run-mechanism-reference.json)
retain all three #172 pairs from publication
`ae6b1d940124debdc71eb6fe24f20c98d87be5ae`. Baseline producer
`fabba9909451aa870036f11d2b760b18f88752ae` has exactly the accepted `2c98bed`
`src` tree; candidate producer is `859d0255fdaca7ceba26a56258c97890fe263009`.
Per-file source hashes, input/setup/initial/profile joins, identical flags and
Node version are checked. These are saved source arms, not newly executed plays
or proof of the next integrated batch.

| Existing input | Mechanism observation | Useful football and outcome |
| --- | --- | --- |
| Strong OZ, Over | At 3 s, RG moves 0.57 yd farther laterally and DT_S 0.48 yd farther laterally / 0.96 yd farther upfield, with actual transmitted load | First carrier contact changes from a CB grasp at 3.55 s to DT_S body collision at 2.50 s. Both arms remain live at 8 s. More work is demonstrated; better protection through arrival is not. |
| Weak WZ, Over | C moves 0.96 yd farther laterally at 3 s; DT_W is 0.29 yd deeper in the backfield | LB_W still reaches the runner at 2.75 s. Known tackles finish at 3.55/3.65 s; gains 2.89/2.91 yd. Preserve the legitimate defensive win alongside the changed technique. |
| Strong OZ, fresh Tite | Baseline C–LB_W has five force-bearing intervals starting at 2.75 s; candidate has none by the 3 s cutoff | Baseline has a known tackle at 3.00 s, candidate remains live. Lost late collection is visible; final-gain benefit/cost is unresolved. |

The first changed final intent occurs at 0.70/0.80/0.90 s in the three pairs,
with body changes in the ensuing intervals. Raw requests change later. That
locates a captured refinement difference, not a universal locomotion defect.
The compact files lack a complete RNG/perception stream; retained plans still
contain some acquired pictures/timestamps. Do not infer unchanged draws or
reconstruct omitted request stages from final intents.

Read the same six saved files without executing the engine:

```sh
RUN_SEQUENCE_INPUTS=/workspace/datasets/run-mechanism-reference/zone172
python3 -I scripts/diag/trench/native-run-sequence.py \
  --baseline "$RUN_SEQUENCE_INPUTS"/{strong,weak,fresh-tite}-baseline.json.gz \
  --candidate "$RUN_SEQUENCE_INPUTS"/{strong,weak,fresh-tite}-candidate.json.gz \
  --out out/run-sequence/native172.json
```

The six files and sibling `manifest.json` are preserved at the publication
above. Keep them outside the repository when materializing. Body observations
belong to completed tick time; native contact stamps identify an interval,
not necessarily the same instant. The reader retains that bracket, separates
teammate/opponent impulses and acquired wraps, and never labels a live prefix
as an ending. Three recorded arms end; three are censored. Twenty-six small
meaning/reliability controls pass, including synthetic end-to-end NFL parsing;
the independent review accepts tooling/evidence meaning only. No engine ran.

## Use the result to make a decision

For each paired native witness, answer independently:

1. Did the named request/recognition/execution contract improve?
2. Did useful blocking, defensive leverage and access through the next phase
   improve, worsen or remain unresolved?
3. What happened to the outcome, and how much of that change is actually
   explained? Preserve first changes in requests, bodies and RNG separately.

For example, more lateral movement under load can coexist with earlier exposed
DT-to-runner contact. An earned reach/seal can be a real technique improvement
while a linebacker still makes a legitimate stop. A stable long block can be
wrong if it prevents an earned climb. These are useful distinct verdicts, not
contradictions to average away.

Use NFL geometry/timing as a reference for what occurred in comparable context.
Tracking cannot reveal installed duty, personally acquired information, gaze,
grip force or the reason a defender won. Native requests/loads and a controlled
intervention establish the proposed cause. A fixed-request mechanical replay
does not establish reacting-play benefit. Changed later randomness qualifies
the ending, without erasing an earlier demonstrated mechanism change.

Run's #172/#174 and Catching's support work are concrete consumers. Publish
their useful and adverse cases together. No automatic new roster, game, broad
panel, old P045 query or AMF expansion follows from this comparison.
