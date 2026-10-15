# P045 NFL catch-approach query: validated and closed

October 15, 2026 (America/Phoenix).

**Historical week-1 closeout.** A later explicit user instruction reopened the
[available-weeks expansion](p045-nfl-available-weeks-2026-10-15.md), superseding
the closing instruction quoted below. This week-1 validation remains intact
and is reused; it is not a reason to stop the newly authorized expansion.

**One qualifying contained example, zero qualifying explosive examples.** The
returned week-1 packet is valid against its published checksum, pinned query,
restoration receipt and internal measurement definitions. This closes the
narrow query. It does **not** establish what P045 should look like or support an
engine change. The retained receiver slows and changes direction; P045's
receiver remains fast. The final instruction to validate, summarize and close
takes precedence over the earlier proposed multiweek expansion. No expansion
or filter tuning was executed.

[Original comparison and query](p045-nfl-catch-approach-2026-10-15.md) ·
[Validation receipt](../../data/reviews/current/p045-nfl-closeout.json) ·
[Returned packet at 481ad18](https://github.com/tannerthardy/football-simulation-/blob/481ad18e5d1cd45a1d5008496b9917511d8397b1/data/reviews/current/p045-nfl-week1-return.json)

## Verification and boundary

Returned packet: **13,975 bytes**, Git blob
`6d667367847fb6313f20f11f4bb61786bedbbea9`, SHA256
`7911a33decb4ce9f2dfef768f37c527936e573506664b273d231b6c0d0f7f60c`.
All match the received bytes. Query `81e43e7`, wrapper `d0ebac7`, three module
hashes, exact query settings and receipt `747bb24` agree with the return.
Its four reported CSV hashes/sizes match the restoration receipt, and the
reported ZIP hash/size match the catalog. The wrapper reports successful
rehashes on **Catching's executor** before execution. They are not new raw-data
rehashes by this executor, whose posted source directory is still absent.

Locally verified: fixed IDs/index mapping; snap/event frame offsets; phase
sample times; full trailing 0.4-s windows before first contact; distance,
speed, radial closing, leverage, momentum consistency and support-demand
calculations. The packet does not include the dense original trajectories or
all rejected rows: raw sample validity, velocity derivation and cohort counts
are trusted to the checksum-bound remote query, not independently remeasured.
The reported nearest ID is internally consistent with the retained defenders;
the other defenders' dense paths are not available for an independent search.

## Counts and exclusions

The unchanged filters were week 1, eligible dropback, official target **with a
reception**, Quarters/POST, catch depth 15–30 yd, release-to-catch 1–2 s and
nearest catch separation 1–4 yd. Selection retains the smallest numeric
gameId/playId in YAC <=5 and YAC >=15 bins. These are illustrative outcome
bins, not estimated defensive success or explosive-play rates.

| Returned counter | Value | Correct interpretation |
| --- | ---: | --- |
| `label_candidates` | 26 | Combined label filters across **all loaded plays metadata**, not a week-1 denominator. |
| `converted` | 3 | Week-1 rows passing conversion and required release/arrival/catch events, before later validity/geometry checks. |
| `invalid` | 3 | Pooled failures: duplicate play fragments, failed conversion/missing events, or later sample-validity failures. May overlap `converted`. |
| `geometry_matched` | 1 | Valid plays meeting all three depth/flight/separation conditions. |
| `contained` | 1 | That play has YAC <=5; it is the retained contained witness. |
| `offensive_win` | 0 | No qualifying YAC >=15 play. This bin stays empty. |

**These counters are not a disjoint funnel.** Two converted cases did not
emerge as geometry matches, but the packet does not say whether each failed
sample validity, depth, flight, separation or multiple conditions. The three
invalid cases are not individually identified. No per-reason exclusion counts
can be reconstructed from this packet, and no precise week-1 label-candidate
count should be manufactured by adding the counters.

The source defines the exclusion reasons: nullified/spike/kneel/noneligible
plays and missing target/reception/Quarters/POST labels; missing snap/ball or
initial positions, unsupported position groups or missing required events;
duplicate fragments; recording/whistle admission; missing/nonfinite or
forward-filled positions; then joint depth/flight/separation criteria.
Plays with 5<YAC<15 can satisfy geometry but enter neither outcome bin; none
does so among the one returned geometry match. Reason-specific counts and
the marginal effect of each filter were **not collected** by this query.
This is a measurement limitation, not grounds for another automatic scan.

## The retained witness

**2022091101-4104**, receiver/official catcher **nflId 52595**, fixed defenders
**46527** and **52472**. Original snap frame 32; release frame 63 / 3.1 s;
arrival 73 / 4.1 s; catch 74 / 4.2 s; first contact 75 / 4.3 s; tackle/end
84 / 5.2 s. Arrival and catch remain separate events. Catch depth is 15.2 yd;
common-geometry YAC is **−2.2 yd**. Flight to catch is 1.1 s.

| Fixed player / measure | Release | Flight midpoint | Catch |
| --- | ---: | ---: | ---: |
| 52472 separation, yd | 5.50 | 3.71 | 1.41 |
| 52472 downfield lead, yd | +5.50 | +3.70 | +1.40 |
| 52472 approach speed, yd/s | 3.36 | 4.51 | 5.27 |
| 52472 momentum magnitude, kg·m/s | 296 | 396 | 464 |
| 46527 separation, yd | 7.96 | 7.20 | 5.20 |
| 46527 downfield lead, yd | −2.00 | −3.30 | −3.20 |
| Receiver speed, yd/s | 6.60 | 6.45 | 4.61 |

Position samples are 3.1/3.6/4.2 s; the midpoint event is 3.65 s. Momentum
windows are 2.7–3.1, 3.2–3.6 and 3.8–4.2 s, all before contact at 4.3 s.
Receiver velocity changes **(5.25,−4.00) → (3.75,−5.25) → (1.00,−4.50)**
yd/s: its downfield component falls markedly while its direction changes.
The same trailing-window operator gives P045's receiver about **8.75 yd/s**
at catch, versus 4.61 here. This difference matters for an attainable approach;
do not mix these estimates with instantaneous native body speeds.

For 52472, the necessary speed-cap bound to reach the hindsight 1-yd disk at
the sampled catch point is 4.38 yd/s at release and 5.17 at midpoint. No NFL
capacity is supplied, so neither is a sufficient supported-movement test.
His realized positive downfield lead differs from P045's trailing corner and
late safety. This demonstrates a possible geometry, not a required controller
choice. First contact/tackle annotations do not identify 52472 as the tackler.
No gaze, grip force, MOD rule ownership or actual hand work is inferred.

## Available weeks, cost and a possible future comparison

The catalog specifies weeks **1–9** for the checksum-bound archive. The
restoration receipt and return independently establish readable/restored
**week 1 on Catching's executor**. They do not inventory other extracted files
or enumerate the ZIP's week members. The posted ZIP/directory cannot be listed
here; therefore weeks 2–9 are catalog coverage, not verified local availability.
Week 1 is reused without another query. No other-week execution is claimed.

If a broader study is separately reopened, first list the existing ZIP members
and restored filenames on that executor, then hash the additional consumed
members. Reuse week 1 and keep the original query across the verified weeks
before changing any football criteria. That could require up to eight more
tracking-file scans plus hashes; the 15.49-s week-1 run included verification
and is not a reliable per-week cost forecast. Access/inventory and that added
I/O cost must be resolved before proceeding, with no second archive download.

The joint Quarters/POST labels yield only 26 candidates in all metadata; the
available packet cannot rank depth, flight or separation as the limiting
filter. A football-justified future question would compare support while the
receiver **maintains momentum versus plants/slows**, initially within the same
call/route. If broader routes become necessary, predeclare deep in-breaking
POST/DIG/CROSS strata and keep coverage responsibilities separate. Admit plays
by route/geometry/motion, retain all valid outcomes and classify YAC afterward.
Do not loosen thresholds repeatedly until an explosive appears. That is a
proposal for another comparison, not work added to this closed query.

## P045 decision and closure

The [separate Catching diagnosis at 8b47d9e](https://github.com/tannerthardy/football-simulation-/blob/8b47d9e0187574d96fe9bbc8a4955b9af6595881/docs/reviews/p045-defensive-diagnosis.md)
provides the actual-controller evidence for the 1.15-s cushion-request defect.
Its continuity prototype improves early leverage but worsens achieved catch
speed and leaves the TD; it remains parked. Removing safety help removes
legitimate ball contests and changes draw ordering without changing receiver
catch probability. The resulting incompletion is not an improvement proved
by lower YAC. P045's absent receiver contact supplies no grip-failure evidence.
Those are the owner's source-separated findings, not conclusions established
by this one NFL witness; the owner's 26 focused checks were not rerun here.

Keep P006's useful tackle and **historical** P010 interception. Catching records
that the same P010 setup already completes on accepted source before its
prototype; historical control outcomes are not current-source guarantees.
#58 and #61 remain separate. No P045 runtime candidate is proposed for integration.

Close this query as **one contained illustration, an empty explosive bin and
insufficient matching evidence to prescribe P045's outcome**. Query filters,
source, IDs and event definitions are unchanged. Remote execution cost was
15.493 s; local returned-packet validation took about 0.007 s. No fresh raw
query, download, simulation, full game or suite ran for closure.

Reproduce validation after obtaining the two pinned JSON files into ignored
`out/p045-nfl/source/` (read them from Git objects without a branch switch):

```sh
mkdir -p out/p045-nfl/source
git show 481ad18e5d1cd45a1d5008496b9917511d8397b1:data/reviews/current/p045-nfl-week1-return.json > out/p045-nfl/source/p045-nfl-week1-return.json
git show 747bb24bd2c17c8b4a6f572fcb3ee8e459375fb8:data/reviews/current/bdb2025-existing-restoration.json > out/p045-nfl/source/bdb2025-existing-restoration.json
python3 -I scripts/diag/p045-nfl-validate-return.py
```

The validator requires no restored tracking, Node or experimental runtime.
