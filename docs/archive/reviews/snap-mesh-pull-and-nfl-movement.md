# Snap response, reachable exchanges, puller approach and NFL movement

This is the `aa5fcde` snapshot. Current implementation, evidence and priorities
are in [shared actuation and physics transfer](shared-actuation-and-physics-transfer.md).
The film IDs and artifact hashes below describe the earlier film.

**Status: NOT READY.** Physics remains first on `claude/engine-priorities`.
This follows `3a5d86b`. Do not push to or merge PR #1 without owner approval.
The engine remains planar bodies with reduced support/contact height, not
skeletal or full 3D rigid-body physics. Read
[PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md) for the shared-body approach
and testing layers. Passing contracts is not the owner's requested physics OK.

## Where to start

Integrate and inspect the NFL movement evidence before expanding the physics
solver. The new [matched movement review](bdb2027-movement-transfer.md) uses
all three locally available BDB2027 game seasons and every combine drill.
Distinguish physical capacity from role, effort, observation window and contact.
No movement constants have been fitted from the new dataset.

Then follow the owner's priorities **in this order**:

1. **Finish active force and work accounting.** Audit strikes, grips, steering
   and commanded turning. Equal/opposite impulses conserve momentum but can
   still create unexplained work. Bound finite force duration and shared
   muscular capacity; record the active energy input and passive dissipation.
   Include yaw/support approximations in the ledger or explicitly identify
   what the reduced model cannot account for. Use same-body control pairs;
   avoid a rating-based force bonus that circumvents capacity.
2. **Resolve the reproduced hand-fight fall reversal.** Focus on seed 3,
   power 1 in `scripts/diag/hand-convergence.ts`: QB falls at 6–48 substeps;
   rusher falls at 96/192. Trace constraint load, support/lean and contact
   ordering around that encounter. Improve the local integration before
   broadening the solver. Do not increase resolution everywhere unnecessarily.
3. **Fix initial run contact through actual mechanics.** Inspect initial
   acceleration, OL response advantage, posture and double-team load sharing
   together. The old DL speed at 0.5 s was 2.06 yd/s versus NFL 1.68; this
   response fix brings the small panel to 1.58, but contact is still too early
   and DL/OL run acceleration is high. Getting one percentile close does not
   validate the response mapping or initial push. Preserve the ability to be
   passively moved before responding. Do not tune yards or scores directly.
4. **Improve tackle approach intelligence.** Use perceived closing/tangential
   motion, body facing, attainable foot placement and grip capacity to choose
   an achievable hit, wrap, trail or low grasp. Decisions should be imperfect
   and use visible information. Compare contact geometry and contact-to-down
   behavior before adding another tackle technique or forced fall timer.

Holding from actual tensile restraint and validation of support/grip parameters
remain later readiness requirements. Existing AddBiomechanics metadata is a
secondary reference; no subject files were downloaded. NFL data utilization
has priority over acquiring another large dataset. Coverage and full QB
mechanics stay later work.

## Film diagnosis and changes

- **The distant handoffs were real.** In original G1-P135, G5-P172 and
  G6-P111, the timeout transferred possession about 5.2, 4.8 and 5.5 yd from
  the QB. The back had already left the mesh because its timer expired.
  Direct transfers now require actual QB reach plus the back's body radius,
  both players upright and the correct carrier/team. The back brakes into the
  mesh until possession transfers. A toss has an airborne backward ball and
  separate release/catch events; a missed pitch remains live.
- **Snap response was inconsistent.** Rushers had a get-off timer, but block
  engagement could apply their drive before it expired. Other controllers
  lacked a universal response gate. Motor intent now waits for the snap cue;
  passive contacts still push bodies. Offense uses its existing snap delay;
  defense adds a shortened visual response based on reaction/anticipation.
  This mapping and its noise are assumptions, not fitted NFL latencies.
  Hard-count strategy and organically generated offsides are not implemented.
- **First block used to mean joint acquisition.** 185 of the old 858 clips
  reported a block at 0.0 s, all passes. Events now require actual measured
  hand force or body contact. They are stamped at the end of the 20 Hz tick,
  identifying contact in `[t,t+0.05]`; other legacy events use tick-start stamps.
  Do not interpret a 0.05 s timestamp as an exact hand-touch time.
- **Trap pullers commanded too much through-speed at sharp corners.** Their
  planner now uses allowable lateral acceleration and waypoint curvature to
  choose approach speed. Kick/trap fits track the moving inside shoulder
  rather than sprinting through its old position. These are controls using
  existing body limits; turf friction and acceleration capacities are unchanged.
  One paired trap still overruns after the initial fit. The fix does not
  certify all front/path assignments or hand engagement.
- **The long safety drag is not force-free.** Original G6-P111 has a 232 lb
  back and a fallen safety attached for roughly 1.9 s. The grasp supplies
  opposing force and changes runner speed. Duration, downed-body geometry and
  grasp feasibility still need validation; no arbitrary timeout was added.
- **Skating is not yet resolved.** The reduced gait has no explicit alternating
  foot plants or measured cleat friction. G1-P135 also includes a late run
  recognition and a reversal from a zone drop; that is a control/recognition
  contribution, not evidence that turf friction alone is wrong. Replay ticks
  are now explicitly labelled **body facing**, not vision. Gaze/backpedal
  control is still a separate future improvement.

Pitch speed is currently an explicit, unvalidated 12 yd/s assumption with
tumbling-ball flight. Catches use a swept reach envelope, not hand/finger
simulation. The exchange correction solves remote possession; it does not
validate hand placement, moving meshes or every pitch against NFL film.

## Measurements

Evidence and source/command hashes are in
`data/reviews/physics-world/film-feedback/`. The fixed setups preserve personnel,
calls, field position, energy and seed. They omit game scouting/audibles and
are isolated **paired probes**, not exact replays of the original game context.
Old G/P IDs identify the old source version; the refreshed film takes different
game paths. Report the film version with any new ID.

| Fixed setup | Old handoff time / distance | New time / distance |
|---|---:|---:|
| G1-P135 | 2.15 s / 5.20 yd | 1.05 s / 1.10 yd |
| G3-P015 | 0.90 s / 0.56 yd | 0.90 s / 0.63 yd |
| G5-P083 | 0.90 s / 0.58 yd | 0.90 s / 0.70 yd |
| G5-P172 | 2.15 s / 4.78 yd | 1.05 s / 1.11 yd |
| G6-P111 | 2.10 s / 5.48 yd | 1.00 s / 1.12 yd |

Trap-guard lateral speed at initial engagement falls 2.70 → 2.02 yd/s and
3.19 → 2.34 in the two fixed reps. Later overshoot improves in the second,
but is essentially unchanged in the first. Do not use rep yardage as a target.

Four tracking-style games, seed 5, same generated team cohort in both revisions:

| Metric | Before | After | NFL reference |
|---|---:|---:|---:|
| DL speed at 0.5 s, median (yd/s) | 2.06 | 1.58 | 1.68 |
| Handoff time, median (s) | 1.20 | 1.35 | 1.30 |
| RB reaches LOS, median (s) | 2.30 | 2.70 | 2.60 |
| Run RB peak acceleration, p50 / p90 (yd/s²) | 4.03 / 4.74 | 3.60 / 4.52 | 5.18 / 6.59 |
| First contact yards, median / mean | 0.10 / 0.83 | 0.27 / 0.67 | 0.57 / 1.16 |
| Pocket depth at 2.5 s, median (yd) | 4.16 | 4.22 | 4.55 |
| Defender within 2 yd of QB | 36.1% | 26.3% | 32.49% |

RB acceleration is already below this reference; a global burst reduction
would be unsupported. Raw per-tick velocity spikes include hits and cannot
be compared with smoothed tracking acceleration. CB/S pre-throw acceleration
and DL/OL run acceleration still have mismatches. These small panels are
descriptive guards, not fitted or held-out model validation.

Sixteen games, seed 7, two independently generated eight-team leagues:

| Metric | Before | After | Reference |
|---|---:|---:|---:|
| Points / team-game | 35.22 | 34.66 | 21–23.5 |
| Rush yards / carry | 3.95 | 4.45 | 4.1–4.5 |
| Run stuff rate | 23.13% | 18.86% | 16–20% |
| Game run yards before contact | 0.98 | 1.18 | 1.5–2.3 |
| Sack rate / dropback | 7.15% | 6.20% | 6–7.5% |
| Interception rate | 7.47% | 6.66% | 2–2.5% |
| YAC / reception | 9.01 | 8.96 | 4.8–5.6 |
| Missed + broken tackles / play | 0.28 | 0.28 | 0.11–0.16 |
| Penalties / team-game | 8.81 | 8.81 | 2.5–4 |

The changed control timing changes downstream game decisions and random draws;
paired seeds do not isolate a single causal effect. The final run efficiency
falls inside the broad reference, but pressure frequency falls below tracking,
contact remains early, and points, interceptions and YAC remain high. Contact metrics in
the game guard and tracking panel use different definitions/cohorts. Keep
these failures visible while completing the physical foundation.

The six-interaction pack and hand-convergence probe retain the prior numerical
results. One QB/rusher fall reversal remains. There was no increase to global
resolution. All **256 engine tests**, **12 Python measurement tests** (including
three new movement checks), typecheck and build pass. The full engine suite
takes about 40 seconds. The viewer passes 20 browser checks with external fonts
blocked, including mobile layout; its synchronized ZIP contains 862 clips from
six games and 27 concepts. Final source SHA-256:
`622c45f18386aad28e724d8745933626a1f4e49adf1410fc687cfddb517a1218`.
The manifest pins scripts, references and artifacts.

## Reproduce

Use Node 22 and installed dependencies. See `data/README.md` for the NFL
extractor and Python dependencies. Run slow panels separately from the full
suite; preserve the guide's test budget.

```sh
npm test
npm run typecheck
npm run build
python3 -m unittest discover -s test -p test_bdb2027_movement.py
node --import tsx scripts/diag/film-observations.ts out/fixed-film.json --reps data/reviews/physics-world/film-feedback/fixed-setups.json
node --import tsx scripts/scenario-pack.ts out/pack.json
node --import tsx scripts/diag/hand-convergence.ts out/convergence.json
node --import tsx scripts/kinematics-compare.ts 4 5
node --import tsx scripts/calibrate.ts 16 7 2
node --import tsx scripts/export-replay.ts 7 --games 6 --out viewer/film-room.html --doc
python3 scripts/check-replay-viewer.py viewer/film-room.html
```

The viewer adds weight and recorded-path speed inspection, interpolated facing,
and pitch release/catch jumps. Its motion inspector is an approximate replay
measurement, not instantaneous body telemetry. Open the data-filled film room,
not the empty template. Keep the downloadable ZIP synchronized with the HTML.
