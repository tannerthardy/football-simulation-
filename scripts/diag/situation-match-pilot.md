# Bounded situation qualification

This supports F1/G2 by asking whether coarse NFL situations add useful
information beyond a run-concept aggregate. It does not reconstruct an NFL
play or change engine behavior. Results belong in ignored `out/`, with the
decision summarized in the PR. No raw data or result archive belongs in Git.

Use the existing verified BDB2025 CSV directory; do not download or extract
another archive for this probe. Run from the repository root with its supported
Node version and installed dependencies:

```sh
python3 -I scripts/diag/situation-match-pilot.py \
  --nfl-dir /path/to/big-data-bowl-data --out-dir out/situation-pilot --extract
node --import tsx scripts/diag/situation-match-pilot.ts \
  out/situation-pilot/inputs.json out/situation-pilot/native.json
python3 -I scripts/diag/situation-match-summary.py out/situation-pilot
python3 -m unittest discover -s test -p test_situation_match_pilot.py
```

The first command verifies the existing four metadata pins, inventories label
exposure with relevant denominators, and invokes the existing fixed-identity
`trench/run-sequence.py` query for three week-1 examples. The query verifies
the existing week-1 checksum and preserves original samples, IDs and event
availability. An inventory without `--extract` reads metadata only. The other
eight weeks are inventoried by presence and size, without claiming fresh hash
verification or trajectory completeness. Failed or excluded queries are errors,
not evidence of zero NFL exposure.

Selection uses week, eligible designed-run metadata, exact charted outside zone,
singleback/2x2, complete nominal 11 roster-position counts, exact Cover-3,
RB carrier, early down/7–10 yards, non-RPO, missing secondary label and all-11
known negatives for motion-at-snap and shift. Missing secondary does not prove
that no modifier was installed. Motion since lineset is reported separately.
Selection takes the first three numeric game/play IDs without sorting by gain
or ending. The inherited designed-run cohort requires finite official gain
and observed run location; run-location **values** never choose the called side.
This is a descriptive, availability-selected sample, not a blinded study or
population benchmark.

The native-input file contains only source ID, down, distance, field position,
lateral ball coordinate and the TE's snap side. The native driver rejects
other case fields and any ambient `process.env` key read by `src`; unset
engine overrides before launch. Unset means **current code defaults**, not
the historical `baseline.mjs` profile. Source content hash, runtime, all source
environment keys, roster/execution seeds and actual calls are recorded.

The driver uses normal `PlaySetup`, `ace_11`, both `oz_strong`/`oz_weak`, and
assumed nickel Over/Sky Cover3. It runs 12 situation snaps and four neutral
midfield/center controls, plus one identical passive-observer verification.
Both call directions are assumptions; neither is chosen from NFL post-snap
movement. There are no body teleports, restored private mind states, extra
sensing calls or NFL trajectories supplied to controllers. The neutral control
is a tooling comparison, not a league-representative concept sample.

The summary follows fixed snap IDs at exact .5/1/2 seconds, preserving unknown
or ended exposure. Box/central-line windows reuse `mechanics/metrics.py`;
second-level geometry reuses `run-sequence.py`. These are alignment proxies,
not installed duties. Native OL aliases are mapped by installed line slot.
NFL velocity is stored `s/dir`; native velocity is achieved body velocity;
unknown provider smoothing limits direct derivative comparisons. Absolute
lateral movement avoids inventing run direction and is not a decision grade.

Explicit remaining differences include exact splits/depths, named front,
coverage variant and checks, blocking assignments, pre-snap history, ratings,
coaching/scouting, game clock/score, fatigue and physical history. NFL coverage
labels describe charted play behavior, not a recovered installed call. NFL
`first_contact` and native first carrier collision are distinct measures;
neither tracking proximity nor an ending establishes grip mechanics.

Review snap compatibility before attributing later divergence. Keep offensive
wins, defensive wins, execution draws and unsupported cases visible. Expand
only when another matched condition can resolve a specific owner decision.
