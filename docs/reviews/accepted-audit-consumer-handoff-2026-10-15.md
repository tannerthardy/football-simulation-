# Saved audit evidence for the current mechanism owners

This handoff supplies the named A020/A044 attribution investigation and its
A008/A032 controls. **The proposed general coverage-motion packet is deferred**
until a consumer names the comparison, source, actors, phase and opposing control.
There is no new simulation, raw NFL query, expanded filter or AMF analysis here.

Freshly fetched develop is `90edc52530caa71efdebf257f17d954a8a629ea0` (#78),
matching Integration's canonical queue (initial publication
`4bca2313e89b9c05142de192deffad54d6130305`, latest scope reconciliation
`255d1c4d3b82b51805d1ae17f8084c53919e5d08`). The accepted engine source is
`7ea3e00e2504271133a4384fbdbf1931e8ac8bf352861ee9e812f1372a0bf42b`.
This research branch deliberately remains on the saved audit runtime
`8ca8deebe4afa91c3021bdd119bed8976cf00e47`, source
`f56a2156a0c1dcecfc3de128581ec875ca1ef93ac813a389d391282be585c956`.
#78 changes RunBlocker/collection, including possible downstream blocking; its
unchanged defense.ts does not establish whole-play trajectory equivalence.

## Archive validation and the smallest useful transfer

The complete original archive is valid: **40,559,081 bytes**, SHA-256
`72a62b95145cd64bb3bf06d60a62adbb7735cf872d777ff35faa5883e138e397`.
Its 48 native case members were streamed and rehashed against the published
collection ledger. Original manifest and summary byte hashes match as well.
No recollection or full extraction was needed.

Full local path:
`/workspace/datasets/simulator-audits/accepted-8ca8dee-48snap-v1.tar.gz`.

Flex/Do-It-All specifically requested the four named cases plus the frozen
manifest. Their exact original bytes now have a separate transfer archive:

- Path: `/workspace/datasets/simulator-audits/accepted-8ca8dee-flex-A008-A020-A032-A044.tar.gz`
- **2,543,148 bytes**, SHA-256
  `6082578ebf476e4975f51585c958eea31894a0cfc2aa03fe1ac271e31804a5cc`.
- Contents: four complete original raw cases, complete frozen 48-case manifest,
  summary and both original launcher receipts. Every transferred member was
  independently rehashed after packaging.

The subset is a transfer selection, not a newly filtered study. Its source
manifest still declares 48 plays; only four native files are present. Do not run
the original 48-file validator on the four-file subset and label the other 44
plays invalid or excluded. Preserve existing output before extraction.

**Raw delivery is now verified through the existing Git remote.** The release API
initially returned `Forbidden` at `api.github.com`, which is absent from the
configured restricted allowlist; no release asset was created. The working Git
transport provides an isolated named artifact tree, outside the simulation source
branch: [immutable four-case archive](https://github.com/tannerthardy/football-simulation-/blob/30285db48245e662f9785c331820b7564ea02f9b/accepted-8ca8dee-flex-A008-A020-A032-A044.tar.gz),
[artifact receipt](https://github.com/tannerthardy/football-simulation-/blob/30285db48245e662f9785c331820b7564ea02f9b/receipt.json).

Ref `codex/accepted-audit-flex-evidence-v1`, commit
`30285db48245e662f9785c331820b7564ea02f9b`, contains **one commit and three files**
(archive,receipt,README). It is data, not a runtime/dependency branch; never merge
this tree into develop. Preserve the immutable artifact/ref with the audit;
there is no automatic deletion policy. A fresh shallow remote fetch verified the
received byte count/hash and all four original native member hashes in1.08s.
[Remote receipt](../../data/reviews/current/accepted-audit-handoff/artifact-publication.json).
The 40.56-MB full archive remains outside the source repository; this2.54-MB
transfer supplies every original byte requested by the immediate consumer.

```sh
git fetch --no-tags --depth=1 origin codex/accepted-audit-flex-evidence-v1
git show 30285db48245e662f9785c331820b7564ea02f9b:accepted-8ca8dee-flex-A008-A020-A032-A044.tar.gz > /tmp/accepted-audit-flex.tar.gz
sha256sum /tmp/accepted-audit-flex.tar.gz
mkdir -p out/audit-four-received
tar -xzf /tmp/accepted-audit-flex.tar.gz -C out/audit-four-received
```

Verify the subset SHA above before extraction. Retain any prior extraction and
compare original native member hashes against the included summary. No original
runtime history, full NFL archive or native recollection is needed.

A **215,187-byte fetchable reading reference** is also published:
[flex-windows.json.gz](../../data/reviews/current/accepted-audit-handoff/flex-windows.json.gz),
SHA-256 `11637c8ff81b32b06faa21f87995fc870e37ff089d4f03496717856b5eb05191`.
This is a compact selected-window extract, explicitly not the complete original
raw files. It retains exact setups, full initial bodies and installation, all22
IDs/indices, original events/stats, all22 native positions and stored body
velocities/final intents, dynamic jobs/targets, sampled contacts/blocks and
actual requested perception for the specified actor pairs. Unavailable fields
stay unavailable. The schema declares window/field omissions.

Windows: A008 1.80–3.35 s; A020 1.95–3.75; A032 2.00–4.30; A044 1.95–3.40 and
4.50–5.60. The last interval preserves the useful Z/CB_S block.
Use `git show <published-handoff-commit>:data/reviews/current/accepted-audit-handoff/flex-windows.json.gz`
after fetching this branch; Python `gzip.open`/`json.load` reads it without any
engine import or simulation. Full raw member hashes remain attached to each case.


## Run's now-named departure comparison

Integration6203355802 names **A018/A030 with useful access contrasts**. That
specific comparison now also has an exact raw transfer, independently of the
Flex subset:

- Cases **A018,A027,A030,A042**, complete original bytes plus full source manifest,
  summary and launcher receipts.
- [Archive](https://github.com/tannerthardy/football-simulation-/blob/2c52a3d100978cde17905102e574f7d169b19aa7/accepted-8ca8dee-run-A018-A027-A030-A042.tar.gz)
  **1,947,618 bytes**, SHA-256
  `9941dd1103186ff98e1d726971650138bbb1aaeb1ff763c1f243835714af2e77`.
- Ref `codex/accepted-audit-run-evidence-v1`, immutable data-only commit
  `2c52a3d100978cde17905102e574f7d169b19aa7`. Same shallow-fetch/git-show recipe
  as above with this ref/commit/filename. Never merge the artifact tree; retain
  it with the audit.
- [Publication and fresh remote verification](../../data/reviews/current/accepted-audit-handoff/run-artifact-publication.json):
  one artifact commit, received size/hash and all four original native case hashes
  checked. Packaging2.50s; independent remote validation0.91s. Zero simulations.

[Direct Run/Catching delivery](https://github.com/tannerthardy/football-simulation-/pull/75#issuecomment-6203533533).
A027 retains achieved Y/LB_M work, and A042 the useful climb/crease and eventual
supported defensive finish. These are contrasts for the unachieved A018/A030
jobs, not merely low-gain/high-gain bins. They also expose four of the original
Quarters support sequences to Catching without starting a general coverage packet.
#78 changed RunBlocker, so compatibility with the old8ca8dee input/trajectory must
be checked before current-build causal claims.

Together the two transfers expose eight original cases, selected for named
mechanisms/controls. They do not replace the48-case panel or exclude its other40
members. Package hashes are separate from original raw member hashes and from
the full40.56-MB archive. No new cohort or outcome search was created.

## Flex owns the missing-stage capture

The existing recorder has **final intents after refinements**. It does not retain
the original behavior request or intermediate commands. A zero final request
cannot reconstruct what was discarded or identify which producer stopped it.
This handoff adds no observer or controller changes. Flex/Do-It-All's named
passive observer should copy existing values at the few relevant boundaries:

| Keep distinct | Required interpretation |
| --- | --- |
| Stable identity and possession | Join index to player ID/team/slot on every source. A008's intended H and actual Y catcher are different; do not silently substitute targets. |
| Installed responsibility | Preserve original alignment/role/gap/side and actual current coverage job/target separately. A receiver-named job alone does not establish a wrong run action. |
| Consumed cue | Copy the actual position, velocity, age, possession/pose/source and calling boundary already used. Missing age or possession remains unknown. Do not add cue age to a picture already dead-reckoned by `see`. |
| Original behavior request | Copy the returned request immediately; do not evaluate the behavior a second time. |
| Intermediate requests | Retain coverage containment, engagement/bond refinements and teammate-spacing output separately, with unchanged own state and the existing peer pictures they consumed. |
| Final request and achieved movement | Keep final intent distinct from stored body velocity and actual post-step body state. Never differentiate the 0.1-yard positional frames to replace recorded velocity. |
| Useful access and contact | Keep relative geometry, actual engagement/hand load, same-team collision, carrier contact and terminal event clocks separate. Proximity is not a block/grasp or a proven attainable alternative. |

Native frame labels identify enclosing decision/physics ticks, with recorded
positions after that tick's step. Original events retain their timestamps.
Perception is deduplicated per actor/target/source within the tick and lacks
call-site attribution; it is availability evidence, not proof of causal use.
Recorded fields cannot establish gaze, real grip force or force realism.

Capture only the named windows/control prefixes. No extra sensing, rejected-option
evaluation, RNG draws, changed decisions or broad recording framework. Validate
plain/observed state and RNG parity, and source-compatible prefix agreement
before attributing a change. A short new capture is new evidence on its recorded
source, never a retrospective repair of the old archive. Flex coordinates any
coverage change with Catching; Run can reuse an appropriate boundary after naming
its own missing comparison. The general packet remains deferred.

## Judge both teams independently of the gain

| Case | Useful offense | Useful defense | Remaining question |
| --- | --- | --- | --- |
| A008 | Actual Y reception; intended H is preserved separately. | NB is in phase and wraps at the catch. | Opposing control; a short gain does not by itself certify every action. |
| A020 | H earns speed and separation on the crossing break. | CB_S ultimately acquires and finishes. | SS final request is zero before the throw; original producer/modifier remains unknown. |
| A032 | Y completes through the short window. | NB wrap at catch, with LB_M support and finish. | Opposing control for preserving coherent arrival. |
| A044 | H's fast crosser and Z's later real downfield block remain useful wins. | Several defenders pursue; the corner's reduced request while blocked is legitimate resistance. | Man/robber same-team collision interrupts the approach before catch. Feasible avoidance and its TD contribution are unmeasured. |

For Run, the original ledger nominates nine unachieved next-level jobs, not nine
proven bad blocks. A027's achieved Y/LB_M block remains opposing evidence; A013
already loses upstream to DT_S. For Catching, the eight Quarters support-request
reversals establish a branch interaction, not eight missed tackles. Installed
alley leverage and phase responsibility must be adjudicated together.

Preserve denominators: 48 reviewed,24 runs/24 called passes,17 actual catches,
16 postcatch contact plays; nine block-access concerns/eight run-transition
concerns overlap in five runs (12 unique runs), and two pass concerns overlap
with one same-team coordination category. These selected observations are not
simulator-wide defect rates. Do not count good offense as bad defense solely
because of the gain, or erase useful defense to obtain a favorable ending.

## A concrete NFL geometry answer, using the completed query

Question for Catching/Flex: **must the original nearest defender retain access
for a contained NFL catch, or can a different lead defender supply near-catch
support geometry?** The saved fixed-ID snapshots answer the geometric part.
No new speed estimate, tracking scan, filter change or explosive-example search
is needed. [Geometry and original event/frame provenance](../../data/reviews/current/accepted-audit-handoff/nfl-support-geometry.json).

| Existing contained witness | Nearest at release → catch | That same release-nearest defender's gap, yd | Catch → annotated first contact |
| --- | --- | --- | ---: |
| 2022091101-4104 | 52472 → 52472 | 5.50 → 1.41 | .10 s |
| 2022091807-2947 | 47862 → 47862 | 2.12 → 2.83 | .60 s |
| 2022091812-2171 | 54487 → 47804 | 3.64 → 7.29 | .10 s |
| 2022091901-1574 | 38559 → 38559 | 4.60 → 1.26 | .20 s |

In 2022091812-2171, defender54487 is already behind the receiver by3.1yd at
release and5.4yd at catch. Different defender47804 closes **11.53 → 7.02 →
1.49yd**, with signed downfield lead **+7.2 → +4.6 → +1.0yd** through release,
midflight and catch. The support geometry changes actor. Nearest-gap endpoints
would incorrectly splice two players. No first-contact actor label proves that
47804 actually made the contact; geometry does not establish an achievable
different decision for54487. The .10-second interval uses the **catch at4.20**,
not the separate **pass-arrived event at3.80**.

Decision informed: retain fixed identities and lead/support geometry when
assessing A020/A044 and genuine helper value. A lost original cover defender
and a useful second defender can coexist. NFL does not supply controller cue
age, installed MOD responsibility, requested action, gaze or grip force.

Coverage remains the completed weeks1–9 study: six qualifiers, four contained,
two middle-YAC, zero qualifying explosives. These Quarters/POST controls are not
matched mesh or fast-crosser templates and do not establish that explosives are
absent. The two middle cases have no returned phase snapshots; no motion was
invented for them. Legacy query velocity/momentum fields used trailing position
differences; the original results stay unchanged, and this answer deliberately
uses only stored geometry/IDs/event times. An NFL stored-speed/direction study
would require Catching's minimal source-row export for named plays, not a new
full archive download. No such new query was launched.

## One post-batch panel comparison with Integration

The latest [Integration scope](https://github.com/tannerthardy/football-simulation-/pull/78#issuecomment-6203355802)
supersedes the earlier generic next-game timing. Measurement acknowledged the
updated split [directly on #78](https://github.com/tannerthardy/football-simulation-/pull/78#issuecomment-6203477642):

1. After a meaningful **accepted controller batch**, Integration/Measurement
   coordinate **one comparison on the frozen48-case panel**, reusing the saved
   baseline where compatible. Existing90-second batch/five-second-per-case ceiling,
   same four lineups/calls/seeds, no baseline rerun or extra seeds. Integration
   freezes the actual accepted source/settings/timing; Measurement owns the single
   collector and comparison publication. No comparison starts from this handoff.
2. The separately prepared four-game packet remains available **only for a
   CEO-called game-context evaluation**: original fixtures/seeds701–704,424 players,
   four games/240 launcher seconds/60s per game. It is not an automatic companion
   to the48 comparison and does not replace it by default. Neither is a per-patch gate.

At the accepted freeze, verify source/input/toolchain/settings compatibility and
publish the measurement hash before collection. A future collector adaptation to
admit the new accepted source must preserve the original48 input hashes, events,
recording and measurement definitions; the historical collector's8ca8dee guard
must not be silently disabled. Save the new source/measurement receipt separately.
Use the existing combined engine verification where compatible, never a contributor
shared-suite repeat. Complete/invalid/censored/unrun cases remain explicit, with
no replacement cases or favorable stopping.

Compare the same case IDs and assess **offense and defense independently**:
installed/available job, cue and age, original request if actually recorded,
modifiers, achieved velocity, useful shielding/arrival and contact timing, legitimate
opponent win, concern resolved/new/adverse/unknown. Gain is context, not the verdict.
Keep24run/24called-pass planned exposure and actual possession/contact opportunity
denominators separate. Preserve category overlaps; do not require the original9/8/2
counts to remain or call their changes simulator-wide defect rates. A changed
request can legitimately change later reactions and RNG histories, so an ending
alone does not establish the cause. No post-batch collection has run here.

Flex reports that it fetched the compact reference and resolved a new command-stage
attribution in [6203420541](https://github.com/tannerthardy/football-simulation-/pull/75#issuecomment-6203420541):
A020's original man request survives containment/contact/bond; spacing chooses the
zero request. It reports observer/plain motion/events/RNG and perception/draw parity
for four prefixes. **Exact source/observer pins and saved-prefix agreement remain
its evidence to publish/validate**; this report is not a retrospective inference
from old final intents or Measurement's independent certification of that capture.
The full original raw cases are now directly delivered in
[6203472804](https://github.com/tannerthardy/football-simulation-/pull/75#issuecomment-6203472804).
The general coverage-motion packet remains deferred.

## Reproduction and preservation

[Specific saved-data script](../../scripts/diag/accepted-audit-handoff.py),
[transfer receipt](../../data/reviews/current/accepted-audit-handoff/transfer-receipt.json).
Inputs are the original archive and the completed NFL return with SHA-256
`4a57b09d246587843f9eb8ac3d03e6fcceb25e0276e679b33371cc63138c272d`.
The latter is available at `07bee7413ee02d7e417f046b599682a77dc9e0fc` under
`data/reviews/current/p045-nfl-available-weeks-return.json`; fetch only that
small result if needed. Run:

```sh
python scripts/diag/accepted-audit-handoff.py --archive /workspace/datasets/simulator-audits/accepted-8ca8dee-48snap-v1.tar.gz --nfl-return out/p045-nfl-available-weeks-return.json
```

The [independent native-window validation](../../data/reviews/current/accepted-audit-handoff/reference-validation.json)
checks169 selected tick rows against the original four cases, including all22
identity joins, stored velocity, final intent, contacts, events, stats and initial
state. [Preservation receipt](../../data/reviews/current/accepted-audit-handoff/source-preservation.json)
checks11 completed NFL/isolated AMF files byte-for-byte against410a369.

The final archive/geometry pass takes3.85s on this host, zero simulations/raw NFL queries/AMF
source reads. An initial saved-JSON indexing assumption omitted the fourth
per-week witness and correctly failed its four-witness assertion; it was
corrected to the existing per-week examples without changing source results.
Completed NFL query/source modules and isolated noncommercial AMF research are
preserved on `codex/nfl-catch-approach@410a369`. They are not inputs to the
native consumer packet or production calibration. No bulk download, general
coverage-motion framework, runtime change or new engine tuning is included.
