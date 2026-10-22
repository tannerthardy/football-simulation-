# Scorecard timing and provenance

`GameRec.ms` has always used `performance.now()` around `simulateGame`.
It is **elapsed milliseconds**, including scheduling/GC pauses, not CPU time.
Its boundary excludes roster generation, input hashing, record conversion,
probe collection and worker startup. The report now labels it elapsed seconds
per game. Summing these overlapping worker intervals is neither collection
wall time nor measured CPU cost. Scorecard records do not collect CPU time;
an external CPU measurement, such as #204's child user+system sidecar, remains
separate evidence.

New cards record:

- Full HEAD commit plus engine-content SHA256, including uncommitted source.
- Scorecard measurement-content SHA256 and dependency-lock SHA256. The
  measurement identity covers the producer, record conversion, metrics,
  probes, reporter and provenance helper, not just a manually bumped version.
- Requested workers, peak concurrent simulation-worker processes, total
  worker processes per arm, and elapsed collection duration. The latter
  includes worker startup, simulation, record/probe work and result collection.
  It excludes initial provenance/settings capture and final report rendering.
  Peak concurrency is observed from child spawn/exit events, not inferred from
  the requested worker limit or machine CPU count.
- The resolved values of source-declared environment switches for each arm,
  including inherited settings and code defaults. This does not apply the
  historical baseline profile. Numeric, Boolean and CF_FLOW reads are resolved
  without inspecting unrelated environment variables; unsupported read forms
  fail. Physical defaults remain identified by engine content, rather than
  pretending that the baseline profile describes every World instance.
- Node/platform/architecture, CPU model and cgroup CPU quota when available;
  `unlimited` is distinct from unavailable quota metadata. These fields do
  not measure competing machine load or establish a controlled benchmark.
- Probe selection and each game's actual pre-simulation input SHA256:
  specification/seed, both generated teams and recording option. These are
  inputs to an adaptive game, not labels of matched situations after divergence.

Engine source and resolved switches may differ intentionally between arms.
Measurement/dependency/runtime/probe and actual input identities must agree
before the report labels a difference “moved” or “noise.” Otherwise it retains
descriptive values and marks the comparison unverified. Timing conditions
and worker counts are checked separately before the elapsed slowdown warning;
it is never a CPU-savings or trajectory-equivalence claim. Bootstrap definitions
are unchanged; this repair makes no new precision or sample-size claim.

## Saved records, without simulation

```sh
npm run scorecard -- --from out/saved/head.json --compare out/saved/base.json --md out/reviewed-scorecard.md
```

`--from` starts zero simulation workers. It recomputes tables using this
checkout's metric definitions while displaying the saved producer's metadata.
It does not infer old worker counts, source hashes, settings or probes from
today's environment, an empty legacy override map, or the existing totals.
The derived Markdown identifies this renderer separately from the saved
producer, so a new metric definition does not masquerade as the old report.
Missing fields print `unavailable`; legacy comparisons remain unverified.
An optional `--out` copies the original parsed card without upgrading its
metadata. Output paths cannot overwrite either input card. Original JSON and
Markdown reports remain historical evidence; derived reports use new paths.

Verification uses saved records and focused metadata/CLI controls, including
unknown legacy fields and an opposing case with complete compatible metadata.
No new simulation games are needed. Pressure throwaway-release, scramble-onset
and known-versus-censored-ending exports remain the named follow-up in
[the pressure contract](https://github.com/tannerthardy/football-simulation-/blob/ed8c250b373b6bbd446a119a9e4b0d8bb695435a/docs/reviews/pressure-measurement.md);
they are outside this repair.
