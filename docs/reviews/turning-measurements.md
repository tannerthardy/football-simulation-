# Turning measurements: version 2

`yaw_speed_audit.py`, `yaw_capability_audit.py`, and `yaw-sim.ts` use one
standard-library Python numeric operator, `scripts/data/yaw_measurement.py`.
Python 3 and the repository's Node 22.23.3 support saved replay checks:

```sh
python3 -I scripts/data/yaw_speed_audit.py /local/tracking_week_1.csv --players /local/players.csv > out/yaw-frequency.json
python3 -I scripts/data/yaw_capability_audit.py /local/tracking_week_1.csv --players /local/players.csv > out/yaw-paths.json
node --import tsx scripts/diag/yaw-sim.ts --input out/saved-game.json > out/yaw-sim.json
```

The simulator input is saved GameResult JSON with `log[].replay` frames and
players. A scorecard aggregate has insufficient information and is rejected.
The historical simulator generation command remains available; it is not
needed to test or repair these operators. Both NFL entry points emit the same
versioned measurements, with a different `view` label for discoverability.

## Eligibility and identity

NFL positions must join to the explicitly selected roster (`--players`, or
`players.csv` beside the first tracking CSV). Only CB/S/LB position labels in
`filtering.roles` qualify. A missing roster, unmatched ID, missing position or
conflicting roster positions is unknown. A known other position and football
rows are excluded. No unknown player becomes a defender. Counts distinguish
rows from unique game/play/player paths, before timing and post-snap filters;
`pathReasons` qualifies each state. Simulator eligibility uses defensive
LB/DB slot labels; unknown slots remain unknown. Its paths are replay/player
slots, not a league-wide unique athlete count.

Output records tracking/replay and roster file hashes, byte counts, measurement
version, numeric-tool and entry-point hashes, source cadence and observed
intervals, filtering policy and separate metric denominators. The simulator
also pins its adapter and angle helper. Missing source-engine provenance in a
saved replay remains unavailable; the current checkout does not identify the
engine that generated an old file. `status=unavailable` exits 1 for CLI reports;
partial evidence is labelled and retains its counts.

## Time and angular operators

When the NFL `time` column exists, its timestamps control all elapsed times;
naive timestamps explicitly mean UTC. A malformed or missing timestamp rejects
the path rather than mixing clock systems. Without that column, supply a
source cadence explicitly, for example `--cadence .1`; the clock is then
`frameId * cadence`. These audits support nominal 10Hz tracking: intervals
over .15 seconds or nonconsecutive frame IDs split runs, and a slower source must use a separately declared
operator. The gap rule is recorded alongside the observed clock distribution.

Exact normalized duplicate observations collapse. Conflicting duplicate
clocks or frame IDs reject the whole path. Missing angles and clock gaps
break the affected angular runs. A missing travel field keeps body-only evidence
usable, with travel explicitly unavailable. A nominal .2-second window needs an observed
endpoint within .002 seconds of .2, with every intervening sample valid and
contiguous; the first qualifying endpoint is used. There is no interpolation.
Rates divide by the **actual** elapsed time. Partial run/recording terminal
windows are counted separately and do not enter full-window denominators.

Body rotation uses shortest circular differences of provider `o` or recorded
body facing. Travel-direction change uses provider `dir` or the simulator's
position secant; the latter uses actual timestamps, centered neighbors and
one-sided derivatives at recording/gap edges. Heading below 1 yd/s is unavailable.
Frame-level body/travel alignment has its own denominator at speeds >=1 yd/s.

Frequency bins retain the historical [1,2), [2,4), [4,6), [6,99) yd/s selection.
Path extrema retain [0,2), [2,4), [4,6), [6,99). The frequency view pools adjacent
pairs and overlapping windows; the extrema view has one fastest complete
window per path/speed bin, plus completed cumulative same-direction 150-degree
markers. The old 3 degrees per 0.1-second deadband is expressed as 30 degrees
per second. These correlated observations are not independent athlete samples.

## Orientation excursions and interpretation

`raw` always retains large angular changes. The separate sensitivity view
omits the middle BODY frame in an isolated out-and-back excursion: both adjacent
body changes >=90 degrees and endpoint return <=15 degrees, on contiguous
samples, with opposing shortest steps (180-degree steps have ambiguous direction).
An unambiguous same-direction near revolution is not flagged as a reversal.
Omitting it splits body runs and alignment exposure; travel measurements
stay intact. Reports show flagged counts/examples, large-step counts, raw
metrics and alternative denominators. A flag can be a real fast reversal;
these fixed analysis markers are not a tracking-error diagnosis, a cleaning
recommendation or a threshold fitted to a desired NFL comparison. A smooth fast
turn that does not return is retained in both views.

The measurements establish observed angular-change frequencies, endpoint-swing
rates, body/travel alignment and sensitivity to a declared excursion pattern.
They cannot identify eyes, foot plants, a technique label, forces or maximum
physical turning capacity. NFL provider speed/direction smoothing, `o` semantics,
position/facing precision, recording cutoff and role selection still differ
from the simulator. A common numeric operator does not remove these differences.
The simulator excludes t=0 from measurement, but may use it as a speed neighbor;
NFL excludes the labelled snap boundary.

Historical unversioned reports and COV-6/TKL-4 examples retain their original
source, cohort and definitions; they have not been rewritten as version 2 or
certified as capacity evidence. Reproduce and qualify an old report before
comparing it with a new one. No raw NFL tracking CSVs were available in the
repair workspace, so repair verification uses declared synthetic fixtures and
makes no fresh NFL prevalence or simulator-versus-NFL claim.
