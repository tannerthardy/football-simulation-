# Independent PR #153 Part 5 controller review

Reviewed `336e8fc940d08d119926276b7a4c7242eafb437a`, runtime
`4bde200b1123f9048d6d2fd8b29a4db3ce51bb1d`, source SHA256
`4702192c48130bd8042207a569a0b6f3a981877a720f7ea64a57abc2c836a9b0`.
Fetched accepted develop remains `f4146275ce7539816bf57b4ed55a0d2be10e48c7`,
agreeing with canonical queue `9a6bb795179a4b2e61ed59d25bcf23ca5e40f423`.
This continues the [original](pr153-run-controller-review.md) and
[response](pr153-run-controller-response-review.md) reviews. No production
edits, merge, activation, shared-suite run or broad lab.

Final refetch found `65db81d710bc0ff75fcd6a81cc4fa8b5f1b89e5f`: only film
tools and optional recording-level plumbing were added after the reviewed pin.
Runtime, settings and tests are identical. These runtime findings carry to
that head; the new film tools were not reviewed or rerun.

**Recommendation: pursue DRIVE_CONNECT as an isolated controller correction;
HOLD adoption pending one saved adverse-case attribution.** Its mechanism is
supported, including a reproduced full-context improvement. The report's
claim that the additional explosive tail is necessarily defensive arrival is
not established. Do not bundle other held features into its extraction.

| Scope | Disposition |
| --- | --- |
| UC_MESH draw exclusion | **ACCEPT repair only**, unchanged since the preceding review. |
| LB_KEY original stationary-fullback identity failure | **CLEARED for that reproduction**; actor and alignment now match. |
| LB_KEY actor inferred from persistent mesh-contradiction memory | **REJECT that inference; feature HOLD.** The acquired-RB identity failure from the response review remains unchanged at `run-fits.ts:244`. |
| UC gate for MESH_TEMPO | **ACCEPT conservative experimental guard.** The author's under-center compatibility objection is supported. |
| MESH_TEMPO and full UC_MESH promotion | **HOLD separately.** A feasible meeting is a dependency; every depth/time/QB-through choice is not thereby proved necessary. |
| DRIVE_CONNECT | **Mechanism supported; adoption HOLD** for the bounded question below. Exact source hunk: `ad633361f29185dbbcea2432788bc9e0d30345a9`, `stepRunRep` forward request plus flag declaration. |
| ZONE_TE / STRETCH_FLAT / GUN_MESH_SIDE | **Existing holds retained.** The near-surface TE guard remains an accepted repair to an unpromoted experiment. |
| DEPART_TEMPO | **Separate, HOLD.** This review does not approve its route feed-forward or activate it. |
| SHED_PURSUE | Independent contact reviewer retains both separate holds. |

## What DRIVE_CONNECT does

The old non-stretch rep requested 2.4 yd/s along its installed drive line
even after a downhill/sliding defender moved level with or behind the blocker
on that line. Seal work could not always compensate for movement away from
the man. A block can lose functional contact this way without the defender
having defeated the original shoulder.

The change blends full drive into bounded connection tracking as signed
ahead distance falls from half the torso separation to zero. It begins
adjusting **before** the man is exactly level. Connection tracking uses his
velocity along the drive plus the existing projected clearance gap. It does
not turn the drive toward a future runner or award retained contact. The
seal controller still supplies the transverse fit. Full drive remains
available with the man sufficiently ahead, and connection tracking can
itself request the existing maximum as the bodies move together.

This uses close-contact position/velocity already used by the accepted rep
execution abstraction. It adds no remote assignment, private defensive job,
future trajectory or observation cadence. It does not independently validate
that entire abstraction's sensory fidelity. Hand acquisition, force, work,
reach, support, release and motion laws are unchanged. This is not a stronger
grip or guaranteed protection.

**Scope:** all eligible non-stretch run reps, including first-level down/kick
work, inline ends and second-level contacts. Pass reps and the stretch branch
are excluded; pass reps that legitimately convert to run reps can subsequently
qualify. No mesh, release, assignment, spacing, capacity or physical-law
dependency was found. Existing connection-gap and contact-frame machinery is
already present on accepted develop.

## Independent Power attribution

One decision-changing diagnostic replayed the supplied case
`power/strong/ace_12/under3/pair31/77` twice, all 22 players reacting normally.
Node 22.23.3, all 57 registered settings resolved from the pinned profile;
only `DRIVE_CONNECT=0/1` differs. DEPART_TEMPO, active hands, UC_MESH,
MESH_TEMPO, ZONE_TE and other unaccepted features remain off. Initial bodies
and profiles match exactly. Both runs finish normally.

| Evidence | Off | On |
| --- | --- | --- |
| First changed contact request, pre-execution t=0.60, RT/DE_S | Drive 2.400 yd/s; request (4.003, −0.609) | Drive 2.291; request (3.926, −0.686) |
| First achieved-state difference | Following interval ends at t=0.65 | Same interval; entry velocity was not attributed to a new request |
| LG/LB_S acquisition, controller clock | 2.20 s | 2.40 s |
| LG drive as defender passes its drive line | Continues 2.4 despite signed ahead becoming negative at 2.35 s | At 2.45–2.60 s falls to 2.222, 1.354, 1.145, 1.218 yd/s, then follows the connected pair |
| At t=3.25, after execution | LG (40.563,21.504), LB (39.673,23.051); no hand joint; separation ended rep at 3.20 | LG (40.435,21.750), LB (40.995,21.956); normal/tangent hand force approximately (1110,−526) |
| LB_S access to runner | Grasp event 3.20; tackle 3.80 | Body-contact event 3.75, without the original grasp/tackle |
| Actual ending | −0.38 yd, LB_S tackle | +5.42 yd, CB_S tackle |

The guard achieves a connected position and continues loading the linebacker
through runner arrival. The linebacker still reaches the runner's body;
another defender finishes the play. Useful protection improves without
making the runner immune to contact.

The gain is a **coupled consequence**, not a matched-state estimate of just
the LG correction: RT and H already change before the LG encounter. The first
changed RT movement-observer state has identical positions, velocities, seal
and support inputs. Its new request follows from the formula, rather than a
changed execution draw. Later geometry, decisions and random consumption can
diverge normally. No additional matched-execution experiment is needed to
identify the first cause.

After subsequent spacing, the first final requests are approximately
(4.003,−0.609) off and (3.925,−0.682) on. The contact-request difference thus
survives the later modifier; achieved motion is measured after that interval.

## Controls and evidence limits

Eight focused tests pass: the author's mirrored full-drive/level-man tests,
plus independent mirrored controls preserving pass, stretch and an active
lost-depth anchor request, and preserving release for an unreachable
connection or a defeated shoulder. These are controller-state controls, not
football panels. They require neither an old ending nor compression.

All four Part 5 saved witness hashes and receipts verify, including producing
source. Both new native endings reproduce w8 exactly. Saved w9's
DRIVE_CONNECT-only arm still ends in a defensive tackle for −1.58 yd; the
separate departure arm ends +0.42 with a different tackler. Neither ending
establishes that a faster departure protected its assigned path.

Eight arm manifests have matching producing-source and listed-tool hashes,
sourceUnchanged=true and successful shards. Four report dirty diagnostic
files (`climb.ts`, `gaptime.py`, `seal.py`, or just `climb.ts`); they are not
clean-tree receipts. Those files are outside the listed native collector
chain; no runtime/config drift is recorded. Broad raw shards are not published
here, so their per-play changes and p-values were not independently recomputed.
The tables remain author evidence.

The gun `v7gdc` manifest has **ZONE_TE=0**. It does not establish that
DRIVE_CONNECT rescues Part 4's adverse **ZONE_TE-on gun inside-zone** case.
`v7mtrdc` enables that flag in Ace, not gun. Keep that original hold separate.

NFL proximity/block-duration and wall proxies support investigation; they do
not label legal retention, prove tackle ability or isolate deficient reaction.
Crossing-conditioned populations also change: Counter's counted crossings
rise 330→352. Fewer separations, a better histogram and longer blocks alone
cannot establish that every changed block is correct.

## One remaining adoption question

Reported outside-zone 40+ rises **10→22/400**; gap 40+ rises 4.00→5.38%, and
already productive Duo improves further. These material changes need
attribution, not automatic rejection. The Power example shows useful
protection. It cannot explain the additional unprovided OZ explosive cases
or establish exclusively slow front-seven arrival. Existing encounter/speed
measurements do not exclude altered approach or failed hold/finish execution.

**Smallest handoff:** publish one exact saved OZ pair among the additional
40+ cases, with both result records and the first changed loaded-rep interval
through its first meaningful runner encounter. Determine whether improved
attainable protection explains access, or whether wrong-side continuation,
retention or finishing remains unexplained. Start with existing shards; no
new census, roster sweep or runner cap. Restore a short native continuation
only if saved records omit the distinction. A lawful offensive win is
acceptable; preserving its old tackle is not required.

If that attribution supports the mechanism, request a minimal DRIVE_CONNECT
extraction on accepted develop with explicit default/activation intent and
these opposing checks. Integration owns exact combined verification. Do not
import the experimental ancestry, DEPART_TEMPO, LB_KEY, mesh changes, active
hands or a contact-law change.

## Reused decisions, cost and reproduction

`assign.ts`, `run-fits.ts` and carrier code are byte-identical to the response
review. Reuse its draw exclusion, original fullback fix, mesh guards and
installed-zone acquired-RB failure receipts. Tempo-only UC failures at
`1c578afb` remain persuasive: the call's early time can precede achievable QB
arrival. That supports the gate, not every UC geometry/timing choice.
Draw/toss/keep and accepted failed-exchange recovery have no new changes here;
no forced transfer or rejected late-QB chase was introduced.

New focused-test process cost **2.387 s**; two native processes **1.963 s**;
total **4.350 s**, 174 native ticks, zero games. Static audits are additional
read-only work. No full suite, typecheck, broad scan or NFL download was
repeated. The author's earlier full-suite receipt does not certify this new
runtime. Earlier repair checks were reused, not counted as new passes.

[Portable packet](../../data/reviews/current/pr153-part5-review/README.md):
exact settings, source/hash audit, controls, original logs, complete compressed
native traces and reproduction driver. This review branch changes only
documentation/evidence; accepted runtime stays unchanged.
