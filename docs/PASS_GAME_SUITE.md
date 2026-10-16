# Pass-game development checkpoint

An opt-in, native 11-on-11 **3,198-play stress matrix**, with **508 paired
controls**, for major passing-game changes. It follows the frozen-input,
resumable-evidence pattern of the run/PA suite in #101. It does not import
that branch or any pending coverage/controller changes.

Use this after a substantial coverage, QB, route, protection, catch or pursuit
change, or when a specific integration risk needs broad evidence. Use focused
reproducers during development. It is **not** part of `npm test`, an automatic
per-push campaign, a frequency-weighted NFL benchmark or an outcome target.
The small tooling contract tests in `test/pass-game-suite.test.ts` are separate
from the broad simulation campaign.

## Frozen design

[The versioned manifest](../config/pass-game-suite-v1.json.gz) contains actual
generated lineups, calls, formations, route definitions, contexts, IDs and
input hashes, rather than seeds that silently regenerate different players
on a future engine. Reference: accepted develop
`3723204bd0743713bca3e87f10ca01bfebf00a15` (#105), runtime SHA-256
`cda44ed806395aa3dcbeab8f4516da3e302633e3e28408fbf97119ff82ced318`.
Manifest content SHA-256:
`2004a6e31f4afa98db8d2ed4eb93983815cbb106d7389f0512a219c5bdab5e14`.
This identifies the input design, **not** a completed baseline campaign.

| Area | Exposures | Football question |
| --- | ---: | --- |
| Catalog | 1,632 | All 17 native concepts × 12 principal coverages × two ordinary rosters × two execution seeds × both directions |
| Additional coverages | 156 | All 25 installed coverages, including trips checks, seam, split-field and cloud variants |
| Formation transfer | 216 | All 18 native formations: 10/11/12/13/21/22 personnel, under center/pistol/gun, empty, trips, bunch, attached TE and heavy surfaces |
| Pressure | 176 | Six packages on/off: A/B-gap, double-A, nickel edge, fire zone and zero-six; quick, cross, vertical and comeback answers |
| Front | 60 | Over/Under, Wide 9 and Odd/Tite with matched front controls |
| Situation | 246 | Backed up, red zone, goal line, short/long third down, fourth down, hurry, both NFL hashes, crosswind and fatigue |
| Capability transfer | 192 | Fresh generated offensive-advantage and defensive-advantage players, two seeds and both directions |
| Concept laboratory | 96 | Existing routes combined into wheel/vertical, snag/corner/flat, back angle, double post/seam, empty stick/hook and back wheel conflicts |
| Play action | 216 | Three native PA concepts versus no-fake copies with routes, protection choices and drop held; neutral, run-heavy and pass-alert contexts |
| Zone style | 96 | Match/spot input pairs; inspect actual installed technique rather than assume the label changes it |
| Defensive personnel | 108 | Nickel versus base 4–3/dime with actual selected defenders; same front/call controls |
| Unbalanced/drop | 24 | Existing legal static 4×1 fixture with four rush versus three rush/eight cover |
| Disguise | 128 | Same actual call with/without a different shown shell and native rotation |
| Audible | 96 | Same requested call with/without existing pre-snap audible policy; record effective call |
| Pre-snap movement | 48 | Installed front stem or LB creep versus stationary counterparts |

**Groups overlap.** An identical input is run once and receives multiple group
tags; do not sum the exposure column. IDs derive from the full frozen input.
The matrix deliberately includes bad offensive calls against suitable defenses
and difficult coverage conflicts. Four Verticals stresses cushion and seams;
Mesh/Drive/Levels stress crossing exchanges and shallow/deep conflicts;
Smash/Flood stress high-low and boundary rules; posts/wheels stress safeties
and back responsibility. None has a required completion, interception or
tackle. Ordinary defensive finishes and earned offensive separation remain
valid outcomes.

There are four generated roster cohorts (ordinary A/B plus two opposing
capability advantages), with no hand-edited speed, balance or grip ratings.
These are matched experiments, not independent population samples. Same-seed
branches can consume different execution draws once their decisions diverge.
Hash cases snap at 23.5833 / 29.75 yd across the field; receivers and runners
can subsequently approach either sideline. These are not illegal sideline snaps.

## Commands and cost

Run from the repository root with Node from `.nvmrc` and installed dependencies.
`pass:suite` uses the shared baseline flag launcher with `--candidate`, which
records actual source and preserves the declared flags. It does not change
`config/baseline.json` or designate a new accepted runtime.

```sh
# Default: copy/validate the shipped manifest and print counts. ZERO snaps.
npm run pass:suite
npm run pass:suite -- plan out/pass-check/manifest.json.gz

# On the unchanged reference runtime, with this same collector installed:
npm run pass:suite -- run out/pass-check/manifest.json.gz out/pass-check/reference \
  --checkpoint "reference for major coverage handoff correction"

# On the candidate runtime, reuse that EXACT manifest and reference index:
npm run pass:suite -- run out/pass-check/manifest.json.gz out/pass-check/candidate \
  --checkpoint "major coverage handoff correction" \
  --compare out/pass-check/reference/index.json
```

The reference source is enforced. For a future accepted reference, create a
new manifest deliberately, before the candidate engine edit:

```sh
npm run pass:suite -- plan out/new-reference/manifest.json.gz \
  --refresh-reference "accepted revision and explicit reason for a new campaign"
```

This refreshes generated inputs as well as the reference source; it **does not**
retroactively make an old campaign compatible. Keep older manifests and
receipts. Do not regenerate the manifest separately on baseline and candidate.

The declared bounds are **20 simulation seconds per play, 5 wall seconds per
case, and 30 wall minutes per collection loop**, checked between native ticks.
A single tick may overrun its deadline; planning/preflight, final provenance
checks and report I/O are additional. No forced whistle is injected. A budget
stop preserves the prefix and skipped tail. A completed *collection* can still
contain simulation-time or native engine-timeout censors; it does not imply
3,198 completed football outcomes. The HTML/JSON report and caches require
disk space; detailed caches remain under ignored `out/`.

For a justified bounded check, select a group or comma-separated manifest IDs:

```sh
npm run pass:suite -- run out/pass-check/manifest.json.gz out/pass-check/pressure \
  --checkpoint "specific protection/pressure integration risk" --group pressure

# Same output and exact provenance: reuse compatible per-case caches;
# expanding a prior selection runs only newly selected cases.
# On the candidate, also provide the compatible --compare reference index.
```

A candidate's selected IDs must all exist in its completed reference collection.
A full candidate needs full reference collection coverage. No mandatory sequence
of subset screens precedes a broad run. Choose what changes the next decision
under [TESTING_COSTS](TESTING_COSTS.md).

Every cache key includes runtime source, full manifest/input hash, collector
and source-helper hashes, all declared flags, declared World defaults, native
route-definition hash, Node version, OS/architecture and dependency lock hash.
Checkout commit, dirty tracked files, checkpoint reason and time are recorded
separately; documentation commits do not invalidate equivalent runtime evidence.
Actual instantiated World settings and effective calls/alignments are also
recorded per play. Corrupt or failed/wall-censored caches stop without an
automatic retry. Use a new reason/output after resolving the blocker.

Route and flag changes require explicit comparison exceptions:
`--allow-route-change "reason"` or `--allow-settings-change "reason"`.
Route definitions are frozen as evidence but native `getRoute` uses runtime
definitions. The route exception therefore labels changed route semantics;
it does not pretend baseline and candidate ran identical route geometry.
Settings exceptions likewise retain both provenance records. Ordinary controller
changes need neither exception. Playbook concept edits require a deliberate
new input design; existing campaigns retain their frozen calls.

## Reading the results

Each run writes `index.json`, `report.json`, `report.md`, `report.html`, a
manifest copy and compressed per-case caches. Open `report.html` locally for
searchable/sortable cases, changed physical results/endings, unfinished plays,
cross-revision deltas and group summaries. JSON also includes within-revision
paired controls. Reports are descriptive: **lower YAC is not a passing test**.

```sh
# Offline regeneration: ZERO simulations. Baseline is remembered by index,
# or supply its index as the final argument after moving the bundle.
npm run pass:suite -- report out/pass-check/candidate/index.json out/pass-report

# One explicitly requested full recording from a saved input; this IS one sim.
# Replace CASE_ID with an exact ID from the manifest/index/report.
npm run pass:suite -- inspect out/pass-check/manifest.json.gz CASE_ID \
  out/pass-check/witness.json.gz --checkpoint "resolve specific adverse approach"
```

Inspect packages use the existing PlaySim full recording format in `row.film`,
including frames, telemetry, result and player identities. They are JSON evidence,
not automatically published viewer pages. Compare `row.physicalSignature` with
the broad cache before treating the recording as the same execution.

The evidence separates:

- **Install and information:** requested/effective calls, receiver numbering,
  actual 22 player IDs/ratings/profiles/stance, coverage jobs and transitions,
  cached rule reads, sampled native-consumed `see` results, QB belief and held
  progression/pending-throw state. No observer asks a player for another read.
- **Protection and release:** native pressure events/flag, a separately labeled
  two-yard geometric QB-proximity clock, release/catch times, sacks, scrambles,
  throwaways, drops, PBUs, interceptions and return segments. Geometric proximity
  is **not** an NFL pressure definition.
- **Movement and approach:** pre-step state, controller request, final movement
  intent and achieved state over the same labeled World interval; actual
  catcher's defender distances, along-runner/lateral leverage, closing velocity
  and velocity angle. Clock samples plus throws/catches/contacts/breaks/final
  states support causal follow-up without keeping full films of every snap.
- **Contact and finish:** first solved body contact versus wrap acquisition
  versus positive loaded grasp; actual catcher/holder identities, entry
  geometry, hold origin/capacity, force impulse, loaded duration, slip/break
  observations, support/falls, later helper positions and out-of-bounds endings.
  A grasp first seen after a solve is interval-censored; a native wrap event is
  the separate acquisition witness. No grip-law defect is inferred from YAC.
- **Numerics and completion:** finite physical state, existing momentum/work
  and arm/motor capacity assertions, penetration diagnostic, failed prefixes,
  simulation/wall/engine censors, skipped cases and new versus cached runtime.
  Step counters and solver assertions start after native constructor setup;
  existing pre-snap stem/creep physics is included in elapsed cost but is not
  intercepted by the live-step observer.

No-contact is distinct from failed contact. An unfinished no-contact prefix
is not a tackle failure. Release distributions use throws; clean terminal YAC
excludes fumbles, penalties, returns and every censor. Native engine timeouts
are unfinished even if the engine labels their phase dead. Gains are before
penalty enforcement. Comparison flags preserve changed catcher, tacklers,
initial profile/stance/assignments and physical signatures. Their cause may be
decision quality, information, execution or numerics; investigate material
adverse changes before promotion.

Sample caps are explicit (80 state samples and 1,800 consumed-cue samples per
play, with omission counters). The cue window preserves the first 600 and
latest 1,200 samples in time order, so early line-play queries cannot permanently
exclude late catch/pursuit information. Cue sampling is at most twice per second
per observer/target pair. Caps can omit a decisive middle cue; request a targeted replay
only when it changes the decision. Positions in diagnostic geometry are truth
for measurement, **never injected into controllers**. This suite does not
certify all consumers' information correctness.

## Deliberate limits and extension points

Static pre-snap offensive formations are covered; live receiver motion and
communication acknowledgment are not installed. Existing stick/hook conversion
is exercised, but its private-coverage dependency is **not** repaired here.
There is no installed seam/post/corner middle-read option or complete screen
system to claim as covered. The laboratory concepts combine existing route
definitions; their names do not install new option-reading or blocking rules.
Formation numbering can omit an intended route (notably Bunch Mesh); use actual
installed roles instead of assuming the concept name guarantees two crossers.

Native PA is generic OL/QB/RB sell, not complete run-specific pull, slice or
boot action. Hurry is a flag, not an actual two-minute clock. Scripted emergency
scramble/throwaway, isolated catch/grip mechanics and true in-game scouting
learning need their own focused controls; this matrix records their natural
occurrence without forcing them. It is not a full game, officiating, special
teams, fatigue-season or injuries campaign.

Add a new supported mechanic as a bounded group and opposing control, freeze
its actual inputs, update the manifest version intentionally and keep the old
suite available for comparison. Coordinate shared movement/controller work;
the suite changes no controllers, physics, speed, braking, hands or capacities.
Integration owns combined verification; Measurement should review measurement
definitions and any future population comparison before football conclusions.
