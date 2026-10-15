# P045 catch approach: original comparison and validated NFL return

October 15, 2026 (America/Phoenix).

**Available-weeks expansion validated complete:** the user superseded the earlier
close-query instruction. The unchanged weeks 1–9 return contains four contained,
two middle-YAC and zero explosive cases. See the
[expanded interpretation and current decision](p045-nfl-expanded-interpretation-2026-10-15.md)
and [bounded execution contract](p045-nfl-available-weeks-2026-10-15.md).
Week 1 at `481ad18` remains validated and reused: one contained example, zero
qualifying explosive examples. See its preserved
[closeout and interpretation](p045-nfl-closeout-2026-10-15.md).
The original local collection below records the initial access gap. Catching
subsequently fulfilled the remote handoff without transferring the archive;
the saved P045/control measurements and query filters remain unchanged.

**P045 loses containment before receiver contact.** Its corner falls behind
during flight; its safety reduces distance while losing downfield support.
This supports an earlier coverage/approach investigation, not a grip change.
The initial local NFL portion provided **aggregate context only** because
Catching's restored tracking was unavailable here. The expanded remote return
now supplies four contained examples and two middle-YAC ledger cases. No matched
explosive comparison is available, and none of these cases prescribes P045's
outcome. The earlier week-1 sections below retain their original scope.
No NFL trajectories, player IDs or witness results have been invented.

Question: does this escape implicate an earlier decision/achieved approach,
or a failure after earned contact? A catch with roughly 2.5 yards of separation
does not by itself establish either a defensive error or an attainable tackle.

## What changed

Added one [saved-only query](../../scripts/diag/p045-nfl-approach.py),
[compact results/provenance](../../data/reviews/current/p045-nfl-approach.json)
and five focused measurement checks. Existing `commonPlay`,
`nfl_bdb2025.convert`/metadata/stream and `metrics.Play` provide conversion,
event definitions, quantization and geometry. Shared metrics/aggregates,
engine code and runtime settings are unchanged.

The NFL query selects **week 1, Quarters, official targeted receiver with a
reception, POST, catch depth 15–30 yd, release-to-catch 1–2 s, nearest defender
1–4 yd at catch**. It keeps the smallest numeric gameId/playId in each
illustrative outcome bin: YAC <=5 and YAC >=15. Zero matches remain zero;
there is no automatic widening. These are opposing examples, not rate estimates.
P045 is Y-Cross, but **X is W1/post**, not the crossing receiver: the frozen
call's weak #1 is `post`, and the unchanged alignment numbering places X at W1.
The NFL `Quarters` label does not establish MOD responsibilities.

At release and at the endpoint, select the two nearest defenders, freeze the
union of their IDs, then follow every selected defender through release,
flight midpoint and catch. Report the changing nearest ID separately. Preserve
all 22 NFL IDs in common-index order, original event frame IDs and snap frame.
Require all 22 positions to be observed from snap through the endpoint:
the existing adapter's carry-forward coordinates cannot turn a missing sample
into valid approach evidence. Require official target AND reception labels
before treating that NFL target as the catcher.

### Reference verified

| Reference | Verified revision / role |
| --- | --- |
| Current accepted `develop` | `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`; source SHA256 `e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54` |
| GitHub default | `claude/football-sim-engine@3b5bf9b…`; older, lacks NFL_DATA/TESTING_COSTS |
| Historical comparison | `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`; retained, not current develop |
| [PR #54](https://github.com/tannerthardy/football-simulation-/pull/54) evidence head | `4ae667e29b3ce085f43c5cb911b294349cda2b8f`, draft against develop |
| Recorded experimental runtime | `f62511a513f2187884d74ae3b94435835e43309c`; source SHA256 `dd173a3ef44f22b5ee74f3cc17ef15b2137203cea58dd2fa12fbaad12c4784ba` |
| NFL reference | BDB2025, **2022 weeks 1–9**, all 22; archive SHA256 `743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3` |

Read [NFL_DATA](../NFL_DATA.md) and [TESTING_COSTS](../TESTING_COSTS.md) on
accepted develop. `baseline:info` rejects develop against the older historical
pin; `baseline.mjs --candidate --info` identifies the actual source above and
44 configured switches. That information command ran no simulation. Neither
an old baseline document nor the GitHub default changes the accepted reference.

The experimental branch was fetched/read as evidence objects; its runtime was
not checked out, merged or executed. The original spread/air game checksum is
`15e553e26449ff44806293f1611bffd3362cbf2e4dd80d3f1447f0264681057f`;
roster/input SHA256 is `c1c7cef835d143da40c62e6572e6e1d024dff281058a98215ecb78c93e6b5870`.
The original 44 flags and World defaults remain pinned by the film receipt.

## Evidence for and against

### Fixed P045 defenders

Receiver: X `A2-WR1` (index 8). Corner: CB_W `H2-CB2` (18).
Safety: FS `H2-S2` (20). Call: Wide-9 Nickel Quarters MOD match.
QB release 2.25 s; catch 3.75 s; touchdown 9.25 s. Native YAC **49.519 yd**.
There are **zero recorded post-catch receiver contact, wrap, hit, tackle or
missed-tackle events**. The earlier QB contact at 2.15 s is not receiver contact.

| Phase: event / position sample (s) | CB separation (yd) | FS separation (yd) | CB downfield lead (yd) | FS downfield lead (yd) | CB / FS approach speed (yd/s) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Release: 2.25 / 2.20 | 0.78 | 11.23 | −0.60 | +2.70 | 4.01 / 0.50 |
| Flight midpoint: 3.00 / 3.00 | 1.80 | 8.63 | −1.50 | −2.00 | 6.91 / 3.05 |
| Catch: 3.75 / 3.80 | 2.55 | 7.07 | −2.30 | −6.30 | 7.70 / 2.83 |

Positive downfield lead means ahead of X in the offense's direction. These
are the **same two bodies throughout**. Nearest remains CB_W at these phases.
FS's smaller separation is therefore not proof of regained support.
At the sampled catch, CB_W is 2.54 yd behind along X's movement direction;
FS is 3.76 yd behind and 5.99 yd lateral to that direction.

Approach velocities use the full **trailing 0.4 s**, ending at/before the
event: release 1.8–2.2, midpoint 2.6–3.0, catch 3.3–3.7 s. They are estimated
momentum, not instantaneous telemetry. CB_W's momentum magnitude rises
**299→516→575 kg·m/s**; FS **45→276→256 kg·m/s**, using their frozen masses
81.65/98.88 kg. The vectors, windows and signed radial closing are in the JSON.

For a reproducible support bound, use the sampled catch point and a **1-yd
center disk**, solely as a geometric tolerance. At the midpoint there are
0.8 s until the sampled catch position at 3.8 s. Reaching that disk requires
a speed cap of at least **9.56 yd/s for CB_W, 10.61 for FS**. Their recorded
base maxima are 10.01/9.53. FS cannot reach this disk from that sampled
midpoint even with immediate maximum speed and an unobstructed straight path.
CB_W passing this necessary bound does not establish a feasible maneuver.

Momentum adds a second necessary bound: integrating bounded acceleration
requires `amax >= 2*max(0, |q - position - velocity*T| - 1)/T²`.
At that midpoint it is **8.58/19.66 yd/s²** for CB_W/FS. No NFL acceleration
capacity was assumed, and these values are not compared with a tuned threshold.
Position noise affects this bound. It is a hindsight location/time calculation,
not evidence that either defender knew the landmark, had a clear path or could
execute a supported turn. The 1-yd disk awards no tackle or contact.

The saved 2.2-s telemetry separately shows CB_W requesting `(10.00, .41)`
while achieving `(4.96, .21)` yd/s; FS requests `(8.22, 4.82)` while achieving
`(.23, .05)`. Both already target X. At 3.7 s they still target X, with FS's
`overTop=true` label despite his lost downfield lead. Requests and body samples
are observations, not a matched execution experiment: request history,
turning/facing and consumed pictures must be examined before faulting movement.

### NFL aggregate context, with its original definitions

| Shared metric | Committed NFL2022 | P045 from the same shared operator |
| --- | --- | ---: |
| Nearest separation at release | median 3.863 yd; n=6,739 | 0.781 yd |
| Nearest separation at arrival | median 3.140 yd; p25 1.649; n=6,739 | 2.550 yd |
| Release-nearest minus arrival-nearest | median +0.505 yd; n=6,739 | −1.768 yd |
| Receiver speed at catch, central ±0.2 s | median 4.802; p90 7.357 yd/s; n=5,325 | 8.459 yd/s |
| YAC, common sampled geometry | median 3.0; p90 12.5 yd; n=5,325 | 49.2 yd |

P045's catch distance lies inside the broad NFL distribution while the receiver
is moving fast. It remains possible for offense to earn a win. This unconditioned
aggregate is not a matched Quarters/post sample and cannot certify a tackle.
NFL `pass_arrived` and `pass_outcome_caught` are separate annotations; the
sim adapter maps catch to arrival here. Native P045's 22.481-yd catch depth,
49.519 YAC and 2.5 separation differ slightly from the common nearest-grid
samples (22.8, 49.2, 2.550). Both definitions are retained explicitly.

### Opposing saved witnesses retained

| Witness | Fixed relevant defender | Evidence preserved / decision protected |
| --- | --- | --- |
| P006 Slant-Flat | NB `A2-CB3` (19) | Separation 2.57→2.60→1.92 yd; catch 2.80, receiver body contact 3.35, wrap 3.65, tackle 4.40 s. Useful approach and real contact remain possible. |
| P010 Levels | CB_S `H2-CB3` (18) | Separation 1.06→0.54→0.51 yd to intended Z; interception 3.45 s. Endpoint stays an interception, not a completion or failed offensive catch. Preserve this defensive win. |

All three selected native log entries match the original game exactly. Their
prefix replay frames, players, events, LOS and profiles also match. P006/P010
are user-retained controls, not matched post/Quarters counterfactuals. The query
also retains P010's changing second-nearest identity instead of splicing it.

## Unresolved risk and exact access gap

**Individual NFL witnesses: blocked, zero selected.** At the original collection this environment lacked
`data/raw/bdb2025/big-data-bowl-data/{players.csv,plays.csv,player_play.csv,tracking_week_1.csv}`
and Catching's existing checksum-restoration receipt. The receipt is now verified;
the [resumed access check](p045-nfl-restoration-handoff-2026-10-15.md) confirms
that Catching's posted restored directory and ZIP are on another executor.
Its other restored weeks
and any cached common packet are also absent. A legacy common packet alone
would be insufficient if it discarded nflIds and observed-sample validity.

Coordination request:
[Catching PR #58 comment](https://github.com/tannerthardy/football-simulation-/pull/58#issuecomment-6199037427).
No acknowledgment or restored location was available when these results were
saved. Chat listing/attachment services disconnected and no cross-chat send
tool was exposed. No competing archive restoration was started. The environment
allowlist also omits `drive.google.com`/`drive.usercontent.google.com`; this is
configuration evidence, not a claim of a failed download attempt.

Existing `air.defender_closing` subtracts **nearest endpoint distances**, whose
identities may differ. Existing contact speed uses central ±0.2 s, including
contact and later motion; its NFL tackler median 4.828 yd/s (n=4,068) is not
a clean pre-impact entry speed. The query preserves those aggregates and uses
strictly pre-contact trailing samples for the new diagnostic. If contact occurs
at the queried event, even that contact frame is excluded; later phases are
censored rather than assigned an earlier velocity. Missing windows remain null.
An NFL `first_contact` before the catch also censors later motion; its absent
actor identity is not grounds to assume the receiver was untouched.

Tracking does not reveal gaze, grip force, a controller's available information
or supported-turn capacity. NFL nearest-at-contact is not an identified tackler,
and distance/kinematic bounds are not contact success labels. The missing
NFL2022 tackle-label dataset is not required for this query; no genuine missed-
tackle rate is claimed. Roster/call differences, quantization, outcome-based
witness selection and annotated-event timing remain limitations.

## Reproduce

From accepted develop plus this diagnostic, read the frozen evidence without
switching to experimental runtime. The required evidence object is at
`4ae667e29b3ce085f43c5cb911b294349cda2b8f`. Fetch its named branch read-only
if this object is not present, then confirm the pinned object is available.

```sh
mkdir -p out/p045-nfl/source
git show 4ae667e29b3ce085f43c5cb911b294349cda2b8f:data/reviews/current/spread-air-film-notes/witnesses.json.gz > out/p045-nfl/source/witnesses.json.gz
PATH=/workspace/.football-tools/node-v22.23.3-linux-x64/bin:$PATH node --import tsx --input-type=module - <<'JS'
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {commonPlay} from './scripts/mechanics/sim-export.ts';
const dir='out/p045-nfl';
const packet=JSON.parse(gunzipSync(readFileSync(`${dir}/source/witnesses.json.gz`)));
const rows=packet.witnesses.filter(w=>['p006','p010','p045'].includes(w.id)).map(w=>({
  ...commonPlay(w.play,`G1-P${String(w.play.index+1).padStart(3,'0')}`),
  identities:w.initialPlayers,nativeStats:w.play.stats,nativeEvents:w.play.replay.events,
}));
writeFileSync(`${dir}/sim-common.json`,JSON.stringify(rows));
JS
python3 -I scripts/diag/p045-nfl-approach.py
python3 -m unittest discover -s test -p test_p045_nfl_approach.py -v
```

When Catching supplies an accessible restored directory and its original
receipt, execute **only the bounded query**, not `nfl:fetch` or `mech:nfl`:

```sh
python3 -I scripts/diag/p045-nfl-approach.py \
  --nfl-data /path/to/existing/big-data-bowl-data \
  --restoration-receipt /path/to/existing/restoration-receipt.json \
  --weeks 1 --out out/p045-nfl/with-nfl-witnesses.json
```

The receipt must contain the catalog archive SHA256 above. The query hashes
the supplied receipt and every consumed CSV. It records restoration provenance,
not an independent proof of archive membership. Review that supplied receipt's
actual verification before treating the restored files as checksum verified.
Detailed NFL query output remains under ignored `out/`; source CSVs stay at
the restored location. No aggregate is overwritten.

## Runtime and next decision

Five focused checks pass, including an artificial CSV run through the real NFL
adapter and an intentionally missing defender sample. Artificial inputs are
tests, not selected NFL witnesses. The first synthetic fixture incorrectly put
the snap ball 10 yd ahead, missing the depth filter; fixing that test input
preserved the filter and assertions. Final tests and the saved query each took
about 0.01 s; source/hash/native-equality checks 1.383 s. These are command costs,
not the entire investigation's elapsed time. **Zero new simulations, full games,
roster screens or shared-suite runs.**

Catching's next discriminating question is the **earliest consumed-picture,
request and achieved-motion divergence for FS/CB_W before the midpoint**.
FS's late maximum-speed recovery cannot repair the sampled catch geometry.
If an informed, attainable request was already present, use a same-prefix
movement witness; if the request was wrong, repair its information/football
decision first. Contact-law/grip attribution cannot be made from P045's absent
receiver contact. Keep P006's useful tackle, P010's interception and legitimate
offensive separation/speed wins. The [validated return](p045-nfl-closeout-2026-10-15.md)
closes the NFL query with one contained example and an empty explosive bin.
Neither the broad aggregates nor this unmatched example chooses an engine change.
