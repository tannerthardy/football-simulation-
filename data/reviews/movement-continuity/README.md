# Movement continuity: exact inputs, requests, bodies and NFL reference

Accepted base f4146275ce7539816bf57b4ed55a0d2be10e48c7; queue9a6bb795.
Code4df4fe406dbbf0edea42ab0a6ed16aeaf45c08f1. Shared yaw proposal needs Physics
review before integration; no contact patch, flags or capacity promotion.

`manifest.json` hashes every archive and every member. `SHA256SUMS` hashes
publication files. All three source patches were independently applied to
accepted src and their complete sorted-path source hashes verified.

- common.tar.gz: exact source patches/settings/launch and check receipts,
  read-only operators, original/rejected probes, measurement summary, plot,
  frozen inputs and limitations. Six native tapes use source365e4a9d; final
  source51351a24 only simplifies identical branches and passes73 focused
  checks/typecheck. sources.json explains compatibility without relabeling.
- native-baseline.tar.gz: six existing accepted full native tapes, unchanged.
- native-candidate.tar.gz: six bounded candidate full native tapes. Five
  terminal tackles and one live6s PA prefix; do not count the live case as a
  completed result. Collection5.61s is not a World performance benchmark.

Restore all three archives into `out/movement-continuity/` of a repository at
accepted base (or the candidate for candidate reproduction). Native input
setups and original scripts are exact; rounded film is not a checkpoint.

```
sha256sum -c SHA256SUMS
python3 -I out/movement-continuity/test_operator.py
```

NFL raw/converted trajectories are intentionally **not published**. The
existing verified host is
`/workspace/football-yac-angle/data/raw/bdb2025/big-data-bowl-data`.
`nfl-receipt.json` supplies actual CSV hashes, adapter/operator pin, selection,
stable actual IDs/events, exposure and known limitations. It agrees with the
published restoration receipt in the common archive. If that cache is absent
on another executor, query on the existing host and return only the small
permitted result; do not download another archive.

On that host, the existing small query is reproducible from the repository root
with the archived producing script (no engine ticks):

```
python3 -I out/movement-continuity/inspect.py nfl
python3 -I out/movement-continuity/compare.py
MPLCONFIGDIR=/tmp/football-matplotlib XDG_CACHE_HOME=/tmp/football-cache python3 -I out/movement-continuity/plot.py
```

The query reuses accepted adapter metadata and selects the same first12 runs/
8 dropbacks in week1 file order. At most6 live seconds; no position imputation;
provider orientation is not gaze. Read/query budget45s, about1.1GiB including
hashes. It took about3s here. Geometry/proximity cannot establish assignment,
contact force or grip. Use comparison.json's paired_clear_all for the matched
1,399 actor/time windows, and retain the small counts, missingness and adverse
near-opponent/path results. The NFL sample is one game's sequence, not a league
baseline or an independent sample of6,277 players.

Native reproduction uses the saved setups, unchanged44 flags through the
baseline launcher, and the existing passive capture wrapper:

```
node scripts/baseline.mjs --candidate --receipt out/movement-continuity/reproduce-launch.json -- node --import tsx out/movement-continuity/capture.mjs run out/movement-continuity/pilot-inputs.json.gz out/movement-continuity/reproduce-pilot 6
```

Choose the published accepted/candidate source deliberately. Repeat the saved
transfer-inputs analog only for a relevant unresolved risk. No broad game,
roster/full-suite campaign is required to inspect this packet. See the code
branch report for findings, costs, opposing controls and next owner decisions.
