# Run-lane correction: retain the zone/Duo result; reject direct gap-run transfer

Recommendation: adopt this bounded zone/Duo navigation correction for review.
It preserves the accepted climb arrival and blocking motor, moves free climbers
past acquired first-level obstructions, and makes the RB's next request account
for actual turning momentum and all acquired neighbors. Counter/trap keep their
accepted controllers: direct transplantation lost useful block work. Wham has
no installed concept/controller in this checkout.

This is a local experimental branch, `codex/run-lanes`, on publication `377d375` /
PR52 engine `66e59745…`. Shared develop was fetched at `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`.
Neither the PR36 experiment `6828467` nor these PR50/52 reference engines are
being designated an accepted shared baseline by this review. No baseline,
physics, collision, capacity, strength, sensing-range or memory-limit changes.

## What changed and why

- A free climber previously previewed the backer in empty space. In the exact
  saved weak-inside LG state at0.45s, that request drives his achieved path into
  DT_W. The new first action uses the full own body/support state through the
  production World, acquired DL pictures and owned teammate pictures together.
  Its lookahead includes stopping room. Deliberate clearance holds until the
  ordinary next read. Loaded/jointed bodies are excluded from that free solve.
- A run carrier's requested ray can miss a teammate while his residual momentum
  still hits him. Zone/Duo spacing now tests achieved curved motion at all
  speeds, chooses the smallest clear detour, and keeps the existing stopping
  budget afterward. An observed teammate may stop clearing the lane; a called
  route is used only during its validity, then possible occupancy is bounded
  rather than deleting the obstacle or extending its promise.
- Navigation initially diverted weak WZ toward an available defender. The
  movement interface now lets the carrier veto a detour that worsens his
  acquired tackle-time margin. That read uses delayed opponent pictures and
  public profiles on an ordinary decision interval; hidden engagement wins,
  actual private jobs and live teammate coordinates are not supplied to it.
- A fractional0.196s read originally checked only through0.15s. Coverage now
  reaches the native0.20s boundary. A real-World incoming-body control proves
  the old omitted interval contains contact; the corrected answer is blocked.

The new code consumes `teammateInformation`; it changes no ownership, vision,
prediction or TTL contract in that interface. Its consumer callback does not
publish private intent to teammates. The earlier rejected nominal post-mesh
track, joined-release graph and gather-threshold-only changes remain out.

## Timing and contact evidence

All continuations initialize naturally from snap with22 reacting players, the
same rosters, initial bodies/information, seed,44 flags and existing physics.
They stop at3s or the whistle. These are opening measurements, not final yardage.
Impulses below are kg·yd/s. Native timing uses50ms; the shared NFL operator uses
100ms and its before-contact eligibility rule.

| Opening | Native snap→LOS before | After | First defender contact before→after | Offensive teammate impulse before→after |
|---|---:|---:|---|---:|
| Ace WZ strong / Y | 2.85 | 2.65 | 2.30 → None by 3.00 | 0.00 → 0.00 |
| Ace WZ strong / H | No crossing by 2.85 (whistle) | 2.60 | 2.25 → 2.80 | 0.00 → 0.00 |
| Ace WZ weak | 2.60 | 2.50 | 2.75 → 2.80 | 0.00 → 0.00 |
| Known Tite WZ | 2.70 | 2.65 | 2.65 → 2.70 | 0.00 → 0.00 |
| Inside strong | 2.75 | 2.75 | None by 3.00 → 2.80 | 0.00 → 0.00 |
| Inside weak | 2.65 | 2.60 | 2.65 → 2.60 | 29.29 → 29.29 |
| Gun Wing split | 2.75 | 2.80 | 2.80 → None by 3.00 | 0.00 → 0.00 |
| Duo | 2.65 | 2.60 | 2.75 → 2.65 | 100.67 → 0.00 |
| Outside zone | 2.65 | 2.65 | 2.85 → 2.85 | 0.00 → 0.00 |
| Counter (scope control) | No crossing by 3.00 | No crossing by 3.00 | None by 3.00 → None by 3.00 | 317.63 → 317.63 |
| Trap (scope control) | No crossing by 3.00 | No crossing by 3.00 | None by 3.00 → None by 3.00 | 345.29 → 345.29 |
| Under / roster41–42 / seed17 | No crossing by 3.00 | No crossing by 3.00 | 2.60 → None by 3.00 | 252.97 → 0.00 |

The historical `mirror` ID exchanges Y/H duties in balanced Ace12 at midfield;
strength remains toward lower field y. It is an opposing attached-player
control, not an exact reflected physical play. Weak WZ supplies the opposite
field direction; independent mechanism tests also reflect complete geometry.
Known Tite was already exposed. Under roster41/42 seed17 was frozen before any
candidate result. It received one initial fresh reference/candidate pair;
subsequent checks are explicitly exposed regressions after generic correctness
and scope fixes. The final Under physical frames match the initial candidate
exactly. Neither Under arm crosses by3s; removing its RB–Y impact is an
obstruction-control improvement, not evidence of an open running lane.

## Blocking and useful position

These integrals come from actual normal/tangent hand force, not a nominal
engagement label or a block-win score. A loaded joint alone does not prove a
won block. The summary also records signed lateral/upfield displacement,
loaded displacement, final blocker/defender/RB geometry and time without own
load. The film shows all22 actual bodies and loaded intervals at1× speed.

| Opening / blocker→defender | First load before→after | Normal impulse before→after | Tangent impulse before→after | Last loaded boundary before→after |
|---|---|---:|---:|---|
| Ace WZ strong / Y / Y→DE_S | 0.55 → 0.55 | 1023.39 → 1023.39 | 796.90 → 901.58 | 2.35 → 2.60 |
| Ace WZ strong / H / H→DE_S | 0.60 → 0.60 | 1236.28 → 1236.28 | 862.46 → 1053.29 | 2.30 → 2.70 |
| Ace WZ weak / LG→LB_M | 1.75 → 1.50 | 541.25 → 1411.23 | 531.19 → 633.23 | 2.90 → 3.00 |
| Ace WZ weak / H→LB_W | 2.40 → 2.35 | 251.52 → 261.61 | 157.08 → 175.32 | 3.00 → 3.00 |
| Inside strong / C→LB_M | 1.85 → 1.85 | 923.34 → 925.04 | 379.21 → 378.15 | 3.00 → 3.00 |
| Gun Wing split / C→LB_M | 2.05 → 2.05 | 1024.36 → 1025.28 | 252.32 → 240.11 | 3.00 → 3.00 |
| Duo / LG→LB_W | 1.80 → 1.80 | 1224.48 → 1224.83 | 826.47 → 825.09 | 3.00 → 3.00 |

Weak WZ's LG now loads LB_M0.25s earlier, with2.6× the normal impulse through
three seconds. First-level Y/H normal work is preserved and their loaded work
lasts longer. Strong inside and split center normal work remains within0.2%
of reference. Split's native crossing is one50ms tick later; its shared100ms
crossing stays2.80s. Duo removes100.67kg·yd/s of teammate impact while retaining
its guard/backer work. Outside-zone timing stays2.65s with no teammate impact.

Counter and trap are exact physical scope controls: every all22 before/after
body, requested/final intent and World report matches its accepted-parent
capture. Their existing missed openings and collisions are retained, not
counted as successes of this patch.

## NFL tempo and what remains

The existing2022 weeks1–9 tracking review gives outside-family median handoff
1.30s (IQR1.20–1.40,n1593), and median snap→LOS2.60s (IQR2.40–2.90,n885 before
first recorded contact). Inside-family figures are1.20s handoff(n1230) and
2.30s before-contact LOS crossing(n829). These are different conditional samples;
subtracting medians does not estimate a handoff→LOS distribution. See the
[inherited tracking review](../run-tempo-climb/README.md) and its pinned data/
measurement provenance. [NFL NGS context](https://operations.nfl.com/gameday/technology/nfl-next-gen-stats).

The three final Ace WZ crossings are2.50–2.65s natively and2.60–2.70s under the
shared operator. Earlier half-speed films exaggerated visual slowness; these
replays are1×. Inside's1.50s stopping exchange remains a real tempo issue.
Rolling the back through the unchanged exchange produces1.25s and3.90yd/s,
but the interacting strong opening acquires a new RG–RB collision. That faster
mesh is rejected; moving a request direction is not immediate achieved motion.
The new tackle-margin veto does not change the saved unsafe faster-mesh action
early enough to justify retrying it.

Two climber misses remain explicit. Weak-inside LG clears DT_W and touches
MIKE, but transmits84.61 tangent impulse and zero normal impulse; that is still
a glancing collection. Known Tite C starts a free climb at0.85s, then the
backer's observed flow turns strongly lateral. At2.20s C is still1.299yd away
while his own velocity is(1.303,−3.271) and the consumed backer velocity is
(−1.535,−4.084). No intervening body or grip blocks him there; the held-command
intercept no longer predicts an attainable fit. Extending memory cannot create
that missing physical reach.

The next concrete correction is a physically executed, short feedback sequence
for collection/entry: compare one gather/turn beat followed by an attainable
arrival from the exact same saved state. The old planner previews a held
request but recomputes arrival velocity during execution; a scalar speed or
shoulder offset did not fix that mismatch. For gap runs, add installed
puller/climber ordering to that football decision before attempting transfer.
No exact future teammate track should be asserted from the call.

## Rejected work is retained

The trial summary includes every captured arm. Portable rejected bundles retain
15 representative full all22 first-adverse cases, all request/body/cue/load
histories and code pins. Full original raw captures remain at their hashed
paths in `summary.json`.

- Near-strike collection and early shoulder settling reduced existing productive
  work; the shoulder trial also introduced a220.66 C–RB impact in split zone.
- Zero relative arrival and a fixed existing2.4yd/s closing request both lost
  split-zone work. The accepted arrival law is restored exactly.
- Pure detour navigation without the stopping budget created a new inside
  C–RB impact. Keeping the budget and considering a peer stopping repaired
  that mechanism, but did not certify a faster interacting mesh.
- Replacing entry/long-lane forecasts with one held free request still left the
  faster mesh unsafe. Broad acceleration envelopes stalled split and created
  a QB–RB impact. These changes and the rolling mesh are out.
- A split-flow crossing-priority trial did not recover the lost collection work;
  it is out. No nominal post-mesh route is installed by the final patch.
- Direct gap-run transfer reduced trap H→LB_W normal impulse405.70→76.21 and
  lost the existing counter H work. The final family scope preserves those
  controllers exactly. This is a tactical applicability limit, not evidence
  that a copied zone navigator fixes puller timing.
- Wham setup rejected before any World step: `RunScheme` and `RUN_BY_ID` contain
  no wham installation. A real wham install must define the off-ball interior
  block, the OL bypass/climb responsibilities and exchange before it can be
  tested. A trap is not recorded as a wham result.

## Pins, reproduction and artifacts

Final tested engine: `6ac628b9cd017fb475c477d41904264d463a6a46`.
Engine source SHA256: `1c4fe7fdef9377436543fd94571689279be84fa061b16e2b46c0602567565527`.
Node22.23.3 and all44 baseline flags are recorded in the frozen receipts.
The review/evidence commits after that pin do not change `src/`.

| Reference capture | Code pin | Engine source |
|---|---|---|
| current-zone.json.gz | `2bf7ed6b2bf23e2b11d82a5bc084f773451c1222` | `66e59745bc3db3d20797951f1ee8bb4b75df4bb019eaef5a2eb24e32873e3c08` |
| decoded-final.json.gz | `0336414fd8170610f17d7db4a8ccba94b8712b02` | `afb8a307e7607c26d87e1d5f52b51a43deda2ea4712126ee3826077a994102d2` |
| decoded-fresh-final.json.gz | `0336414fd8170610f17d7db4a8ccba94b8712b02` | `afb8a307e7607c26d87e1d5f52b51a43deda2ea4712126ee3826077a994102d2` |
| pr50.json.gz | `51cf2ce6ae75ad4ff0531480826d737ccaf92ce6` | `afb8a307e7607c26d87e1d5f52b51a43deda2ea4712126ee3826077a994102d2` |
| run-lanes-fresh-reference.json.gz | `377d375005008554fadda9320983271cd44fc026` | `66e59745bc3db3d20797951f1ee8bb4b75df4bb019eaef5a2eb24e32873e3c08` |

- [1× wide-zone before/after film](film/wide-zone/replay.gif)
- [1× interior before/after film](film/interior/replay.gif)
- [1× exposed Under obstruction control](film/fresh/replay.gif)
- [Full before/after measurements and provenance](summary.json)
- [All captured trial outcomes](trials-summary.json.gz)
- [Final core evidence](evidence/final.jsonrefs.gz), [manifest](evidence/evidence-manifest.json)
- [Rejected first-adverse cases A](evidence/rejected-a/cases.jsonrefs.gz),
  [B](evidence/rejected-b/cases.jsonrefs.gz),
  [gap transfer](evidence/rejected-transfer/cases.jsonrefs.gz)

The reference-table codec round-trips the retained core exactly. It omits
method/write/phase duplicates and repeated observer/RNG frame copies; its
manifest names those omissions and both original-raw and retained digests.
Bodies, requests, cues, joints, reports, state/information hashes and events
remain. This is offline evidence, not a body-only native restart. Rejected
case extracts identify their original full-capture SHA and explicitly execute
zero new simulation steps.

Reproduce the reduction with `python3 scripts/diag/run-lanes-review.py --out
docs/reviews/run-lanes`. The inherited `wz-flow-evidence.py` decodes the portable
bundles; replay and measurement operators are pinned in the manifests.

## Runtime and validation

Final source:12 openings /720 live outer50ms steps /26.361s collector wall time. Each opening stops at3s or the whistle.

All work, including rejected arms and the one new Under reference:107 short
openings /6420 live outer steps /239.433s collector wall time; zero full games.

These counters exclude scratch controller previews and unit-test World steps;
wall runtime includes preview work. Test/typecheck process time is separately
recorded in the receipts. This is an instrumented all22 collector, not a bare
engine throughput benchmark. Packaging and films execute zero new World steps.

Final affected tests and typecheck receipts are added under `validation/`.
