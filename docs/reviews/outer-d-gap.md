# Keep D outside the observed outer surface

Advance code `6cf700db7a475ed6e95833509229b30eececba52` for independent review
as an objective identity correction. It is based directly on accepted
`bb6d4c73948d53ba841dd9338dd240146c739f8c`, source
`668acb1784799c93d4704aaaa41233a11627ee0a862b41dc279cd11a0a22eeac`.
There is no #96, primary-footwork, old experimental controller or physics
dependency. Integration owns exact combined verification; no merge or baseline
promotion is performed here.

`gapIn(D)` previously selected the third outward body when at least three were
present, while `gapSurfaceIn(D)` already used the outermost body for width and
velocity. A departed center or another body's crossing of the existing fallback
center can leave four or five outward entries. D's position then jumped inside
to a different body or vacancy even though its width and velocity still described
the outside edge. One line makes the position use the same outermost boundary.
Sparse offsets, A/B/C counting, #63's B identity, departure classification,
perception and physical movement retain their existing behavior.

Two saved consumed-picture witnesses establish the defect. In **accepted A039**,
LT crosses the fallback center between1.70 and1.75 seconds; with C/RG/Y already
departed, outward entries increase from three to four. Old D jumps
19.614952→22.732995 yards to an interior RG vacancy while the observed outer RT
moves only−0.115629 yards. Corrected D follows RT to19.499323. The independent
reconstruction matches the original runner heading with zero residual. In the
separate A003 picture witness, acquired C departure between1.95 and2.00 leaves
five outward entries: old D jumps19.666955→23.510779 to RG, whereas corrected D
follows the outer Y to19.607774. That A003 fixture's controller source is
`5e68386c893613af9313122a31b963d5bba6ea79be20f1bc00d340a737dc5323`;
its source is explicit and is not required by the extracted correction.

Both mirrored accepted-source pictures pass, along with the original mirrored
witness, ordinary three/two-boundary cases and interior landmarks. Fixtures use
only the RB's already consumed pictures, public installed alignment and body
radius. Live position/velocity getters throw. There are no extra observations,
private live peer state, changed timestamps or memory/perception extensions.

The original focused fixture fails three assertions on accepted source (six
pass): both reflected post-departure identities and the discontinuity. After the
one-line correction,18 checks pass across that fixture, live-gap tests and the
accepted departed-center/#63 regression. Two subsequently added accepted-A039
mirrors pass in a focused run, intentionally skipping the nine compatible cases
already passed. That is20 unique passing checks across receipts, not a new full
suite. Candidate source is
`e29daf4badc62643290fe8d9d750ceb74e3ec4270e89d58c78294d87a7867068`;
final focused validation hash is
`61cb0a09da7caedd667f329989f34207e8445ea1f8895da44f7062aee5f9c0e1`.

Root's frozen, naturally reacting3.10-second prefixes use the standalone
candidate and accepted comparators. A039 first changes its request at1.45 and
achieved packed position at1.50. Its RNG stays identical through2.45, first
differing at2.50. At2.25 it is about0.73 yards farther outside and0.50 less
upfield. Mike's first grasp moves2.50→2.80, but LOS arrival is **later**,
2.35→2.60; at3.05 both runners are falling and the candidate is about1.25 yards
less upfield. A003 first changes request at2.00, after the consumed departure;
first contact changes Mike2.60→Will3.05, but at3.05 the candidate is still just
behind LOS (x34.985), upright and moving outside. Its original packed comparator
has no per-tick RNG stream, so no first-RNG causality claim is made there.
Delayed contact alone establishes neither faster entry nor better rushing gain.

The correction creates no Mike blocking load in either changed case and no Will
load in A003. Existing primary hand work remains substantial: A039 sampled
resultant hand-magnitude integrals for DE_S/DT_S/DT_W are
929.235/1715.195/775.966→984.499/1738.671/960.239 N·s; C/Will remains
220.735→220.533. A003 corresponding first-level values are
928.599/2193.233/1729.096→969.898/2189.882/1741.058. These are20Hz rectangular
integrals of resultant magnitude through3.10, not net impulse or a blocking
quality grade. First changed hand-force rows occur later (A0392.35, A0032.65).
Individual helper force rows are absent from the old packed baseline and are
not assumed zero. No new offensive teammate impact is recorded in these four
WZ candidate prefixes.

Contrasting controls remain intact. A015/A027 preserve every packed accepted
frame and primary hand-force row, including Mike grasp2.90 and Mike hit/fumble
2.80 respectively. A002 OZ/A025 IZ preserve every packed frame and primary
hand-force row. Fresh F002 Over matches accepted source668 in all62 ticks of
full before/after bodies, jobs, raw goals, final commands, RNG, contacts, work,
hands and all native events. It retains DE grasp/Will assist2.95 and DE dive/fall
3.00. These are short, censored controls; no final-yardage or league-wide
benefit follows. The remaining lack of useful second-level protection is visible.

One initial A039 launcher receipt **failed validation**: its engine command
exited0, but accepted-fixture/test additions during collection changed the
validation inputs. It remains failed (`inputsUnchanged:false`), was repeated
once after a coordinated freeze, and supplies no passing claim. Both final
candidate batches pass with unchanged inputs. Exact hashes, commands, flags,
World settings, results and limitations are in the
[compact evidence summary](../../data/reviews/current/outer-d-gap-summary.json).

Costs are recorded separately: focused red0.930100020 + passing1.934833384 +
accepted-A0390.939555860 = **3.804489264 command seconds**. Root candidate native
commands, including the failed validation attempt, cost1.292383792 +3.077235396
+2.238626673 = **6.608245861 seconds**. Known launcher command total is
**10.412735125 seconds**. The fresh accepted reference collector adds
0.726387503 seconds; its full launcher time is not recorded here and is not
represented by collector time. Node22.23.3,44 accepted flags,
RUN_CONTACT_COMPONENTS=1 and accepted World defaults were retained. This
contributor ran zero native continuations or previews; packaging adds none.
No panels, games, full suites or unchanged compatible baseline campaigns were
run for this correction.

The [observation-only replay](../../scripts/diag/outer-d-gap-replay.ts) and
[seven condensed inputs](../../data/reviews/current/outer-d-gap/input-manifest.json)
make short native reproduction portable. The339,924-byte manifest retains the
exact setup, initial bodies and actors; historical result frames/telemetry are
omitted. F002's actual setup hash is
`09e74ac4bf76cc1f7fe96d02b3384792f3573c8c787f13fbc8f5dbd69f20b760`;
the inherited A003 `originalStoredInputSha256` is stale metadata, not its setup
identity. Input and initial-body hashes are independently recorded per case.
Extract into a fresh directory, then use the pinned launcher:

```sh
outer_d_input_dir=$(mktemp -d)
node --input-type=module - "$outer_d_input_dir" <<'JS'
import {readFileSync,writeFileSync} from 'node:fs';
const m=JSON.parse(readFileSync('data/reviews/current/outer-d-gap/input-manifest.json','utf8'));
for(const [id,saved] of Object.entries(m.cases))
  writeFileSync(`${process.argv[2]}/${id}.json`,JSON.stringify(saved));
JS
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/outer-d-gap-replay.ts \
  --run --cases A039,A003,A015,A027 --until 3.1 --input "$outer_d_input_dir" \
  --out out/outer-d-native-review
```

The default invocation prints a plan and runs zero Worlds. With condensed
inputs, `savedFramePrefixEqual:false` is expected because historical frames
were omitted; it is not a failed physical comparison. Replaying accepted and
candidate sources permits physical comparison. Original full-input/trace hashes
and retention paths support the reused prefix claims without committing large
raw telemetry.

The passing captures used root's historical no-intervention operator
SHA256 `4fabe58fe9d4b5e9a2f25738967c27cd48fe063266d089307c79afbe3402dda1`.
The distributed tool removes its inactive intervention option/branch and retains
the ordinary observation path and `intervention:null` schema; its SHA256 is
`102ca5637fd257a491cc91ac7b45c5f4278d0ef868657926e107a0f1e52b74e5`.
A default zero-World plan was checked; native evidence is not relabeled as having
used the cleaned tool and no duplicate capture was run merely to package it.

Recommendation: accept the narrow D position/width/velocity identity correction
for independent Integration review. The next football decision should examine
entry timing and second-level access with the objective corrected. Keep held
primary-footwork/controller compositions and separate physics laws separate;
do not tune this short ending until it becomes a manufactured win.
