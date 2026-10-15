# StatsBomb sample: protection access is only partly measurable

2026-10-15 (America/Phoenix), isolated noncommercial research. Data source:
**StatsBomb / Hudl TB12DB**, repository commit
`0ef19db20d768f34ad0e260c9c19b85c30ab8984`.

**The existing sample supports selected engagement/trajectory comparisons, but
not a reliable timestamp for first physically usable QB access or a causal
number of seconds a blocker saved.** Named pressure, close approach, annotated
engagement and actual contact labels must stay separate. Instantaneous open
space does not establish that a defender can traverse it before a blocker reacts.

[Reproducible one-game diagnostic](../../scripts/diag/amf-protection-access.py) ·
[Compact measurements and receipt](../../data/reviews/current/amf-protection-access-research.json) ·
[Source inventory, dictionaries and terms](amf-source-review-2026-10-15.md).
No bulk acquisition, engine import, BDB query, production metric, tuning or
general-purpose framework was added. This is not a new NFL reference cohort.

## Inputs, identities and observation window

Reused `2022_01_TB_DAL`, StatsBomb game `1501094`, September 11, 2022:
one HF JSON.gz, the existing 2022/23 play/event CSVs, and `lft_1501094.csv`.
All four existing file sizes/SHA256 values match the frozen acquisition manifest.
Raw data remains outside the simulation repository at
`/workspace/datasets/amf-open-data/0ef19db20d768f34ad0e260c9c19b85c30ab8984/`.

The HF file has **75 Pass-type plays**, including sacks. There are 387 engagement
start rows on those plays. All 387 have reciprocal end UUIDs, the same actor pair
at both ends, and nonnegative duration. **367 pairs join both player IDs to HF;
20 fail identity joins** and remain rejected. No nearest-player/name substitution
repairs them. A successful internal ID join is not independent roster verification.

Only nine snap events populate a receiving-QB ID. The diagnostic instead requires
one offensive QB track and matching pass-event actor; sacks require the sole
offensive QB. Two ambiguous-QB plays and one non-QB pass are excluded, leaving
**72 admitted dropbacks**. Player IDs in this report are **StatsBomb IDs**;
available NFL GSIS IDs stay separately attached in the receipt.

Positions use source `x/y` yards, rotated with the play's direction for a common
offensive frame. HF timestamps are microseconds; divide by `1e6` to align with
event-video seconds. The earlier byte-compatible source audit establishes the
time-since-snap agreement within .000499 s. Do not use the HF `ngs_x/y` columns
as NGS yard coordinates or the game clock as the event clock.
Event-position snapshots use the nearest frame within 17 ms, which may follow
the event; original timestamps and that flag are retained. First-entry and path
calculations instead stop at the last eligible frame and never use a sample
after release or from the frame nearest labeled QB contact.

Edge **candidates**, not assignments, are opposing DL/LB tracks initially outside
the outer OL lateral span and −.5 to +3 yd from the LOS. Coarse DL/LB/OL role
codes cannot identify an actual edge assignment or individual tackle position.
The admitted plays provide 176 such candidates and **133 pre-terminal engagement
intervals** between candidates and offensive OL/TE/RB players.

For a valid local comparison, the rusher, blocker and QB must have one finite,
unflagged sample on every native 30 Hz tick from snap through pass/sack, without
duplicates or added imputation, and provider `on_camera_ratio=1`. **60/133
intervals pass this trio screen.** Requiring the same for all offensive players
to inspect a corridor leaves **39 intervals / 34 edge instances / 20 plays**.
The remaining 21 trio-valid intervals have uncertain offensive context.

Camera-ratio failures, nonfinite positions and missing/duplicate ticks remain
in the local rejection ledger. These reasons overlap and repeat actors across
intervals; they are not disjoint play counts. A track-wide ratio below one may
refer to time after release, but the source supplies no per-frame camera mask
to localize it. Conversely, a rounded ratio of one does not certify independent
on-camera observations at every step. These are conservative example screens.

## Engagement is not proximity, and its end is not a validated shed time

The source supplies **Engagement Start/End annotations**, not an explicit
blocker–rusher `contact=True` channel. All 387 starts have blank success and
tackle-contact fields. The latter belongs to tackle attempts, not pass blocks.
Of these starts, 105 refer through `base_event_uuid` to another engagement start;
the dictionary describes generated-event relationships. It does not give enough
annotation protocol to treat every pair as independent, directly observed hand
contact or to infer how these generated relationships were collected.

Do not replace these annotations with a 1.5-yd rule. At 367 joinable starts,
both nearest HF samples are finite/unflagged within 17 ms: median body-center
gap **1.33 yd**, range **.53–3.91**; 85 exceed 1.5 yd and seven exceed 2 yd.
These are processed position comparisons, not measured hand reach. Proximity
alone proves neither a block nor loaded hands; an engagement label is a separate
provider statement, not a measurement of contact force.

Timing especially limits “block duration”: of 355 intervals on plays with a
recorded pass, **251 end after release**, **254 end within ±67 ms of release**,
and **193 end at release +50 ms** within a 20-microsecond numerical tolerance.
This recurring boundary is evidence of endpoint/censoring semantics, not a
50-ms physical disengagement measurement. Treat such labels as active through
release; do not report that a blocker shed or lost contact at that endpoint.

Across the 75 tracked Pass-type plays, there are 51 Pressure event rows:
48 actor IDs join defensive tracks, three do not. None names an opponent QB;
34 resolve an `opposing_pressured_event_uuid`. Bind pressure to the validated
play context, preserve unresolved links, and call the timestamp **annotated
pressure**, not independently validated first threat. Pressure need not require
the rusher to be within two yards or to be free of an engagement label.

LFT supplies both pair IDs at 265 of the joinable starts. Comparing 530 same-
player LFT positions with nearest HF positions gives median residual **.50 yd**,
maximum **3.37 yd**, after direction normalization. These formats are not
point-identical; LFT is not a safe gap filler or independent accuracy truth.
Do not blend them to fabricate continuous observed tracking.

## What was measured

Keep three clocks rather than merging them into one “access” time:

1. **Provider events:** actor-linked engagement, pressure, QB-contact attempt
   and pass/sack timestamps, retaining original UUIDs and censoring.
2. **Close approach:** first observed rusher–QB center distance <=2 yd from
   .5 s until the pass or first QB-contact frame. This reuses the existing
   proximity metric's distance threshold, sampled here at native 30 Hz; it is
   not a reprocessing or calibration of the shared .1-s metric.
3. **Illustrative route geometry:** first frame after .5 s where rusher–QB
   distance shrinks over the trailing .2 s and no other offensive center lies
   within .75, 1 or 1.25 yd of the open rusher→QB segment. The three fixed radii
   expose sensitivity; they are not NFL body/reach capacities. This starts at
   .5 s and cannot label an earlier threat.

For blocker position `b`, rusher `r`, QB `q`, segment projection is
`u = (b-r)·(q-r)/|q-r|²`. A blocker is geometrically between them only for
`0<u<1`; perpendicular distance then describes interposition. No active
engagement veto is imposed: a defender can threaten the QB while still engaged.

The diagnostic also measures rusher path length, displacement transverse to the
initial QB line, simultaneous QB movement and the share of sampled label time
with a blocker interposed at a **diagnostic** one-yard radius. This describes
motion during a labeled interval; it does not attribute its cause to that blocker.

Kinematics exclude the **frame nearest the first actor-linked labeled QB contact
and every later frame**, and stop at release/sack. This avoids treating a sample
only microseconds before an annotation as resolved pre-contact movement at 30 Hz.
Later contact/outcome positions are separately flagged; they do not enter first-
approach or redirection calculations. Unannotated/earlier physical contact could
still exist. Search first-frame brackets are sampling brackets, not uncertainty
bounds on actual usable access or proof of a feasible dynamic route.

## Four selected valid examples

These are purposeful, identity-checked contrasts, not random plays or win-rate
estimates. All four pass the full-offense and trio screens. Each label sequence
uses fixed IDs; tracking geometry never changes a player's identity.
“Valid” here means source-consistent joins and sampling, not independent film
verification of every annotation or external roster identity.

| GSIS play | Pair and QB | Recorded sequence, seconds after snap | What it establishes |
| --- | --- | --- | --- |
| **65** | Tyler Smith `1009181` vs Shaquil Barrett `1024499`; Dak Prescott `1023911` | Engagement 1.541–1.791; release **1.750**, completed +7.39 yd | Offensive opportunity preserved. No pressure label, no <=2-yd entry or clear-closing corridor before release. Label end is after the throw, so physical block end is censored. |
| **1587** | Terence Steele `1023943` vs Joe Tryon-Shoyinka `1024469`; Prescott | Engagement **1.250–2.150**; other defender's pressure 3.210; release **3.410**, incomplete | Local edge containment can coexist with pressure elsewhere and an incompletion. This is an offensive **pair** control, not a clean-pocket or passing-success claim. |
| **1457** | Josh Wells `1024506` vs Micah Parsons `1023916`; Tom Brady `1003198` | Engagement **1.100–3.031**; pressure **1.783**; <=2 yd **2.364**; contact=True QB tackle attempt **2.731**; sack **3.081** | Defensive win with explicit actor-linked QB-contact annotation, beyond proximity alone. Pressure/contact can occur while the engagement label remains active. |
| **1631** | Matt Farniok `1023939`, then Tony Pollard `1023920`, vs Barrett; Prescott | Farniok label **1.200–1.700**; pressure **2.100**; <=2 yd **2.314**; Pollard label **2.350–2.700**; QB-contact attempt **2.550**; release **2.650**, incomplete | Defensive access after a guard-to-RB label sequence. The later pickup label is recorded after pressure; this does not diagnose what either blocker knew or when actual hand contact changed. |

Useful measured details:

- **65:** Barrett–QB distance falls only **4.77→4.45 yd** from label start to
  release. Smith remains interposed (.31–.37 yd off the segment at those events).
  Over the pre-release sampled label interval 1.551–1.718, Barrett travels .65 yd,
  with **.57 yd transverse to the initial QB line**, while the QB moves .057 yd.
  This is measurable lateral redirection during a labeled interaction, not proof
  Smith caused all of it or saved .209 seconds. First access after release is
  censored, not assigned “never.”
- **1587:** Tryon–QB gap **6.89→9.22→9.34 yd** at label start/end/release.
  During the sampled label interval he travels 1.32 yd, .87 yd transverse to
  the initial QB line; Steele stays interposed. **The QB moves 4.03 yd during
  the same interval**, so increasing separation cannot be credited entirely to
  Steele. William Gholston `1024514` independently joins a defensive track and
  receives the other pressure label. No Tryon close entry/corridor onset is
  observed in the search window; that does not mean the entire protection won.
- **1457:** Parsons–QB gap is **4.31 yd at annotated pressure**, .80 yd at
  labeled contact. Corridor onset is **1.431 / 1.564 / unobserved before
  contact** for the three radii. A one-yard center corridor therefore does not
  provide a validated first usable route. The last kinematic sample is **2.698**,
  before the nearest contact frame. The provider contains two Sack rows for the
  same actor/time, one referencing the other through `base_event_uuid`, plus
  Brady's paired Sacked row. They link to one tackle attempt; do not count two sacks.
- **1631:** Barrett–QB gap is **2.77 yd at pressure**, 1.12 yd at labeled QB
  contact. In the nearest guard-label-end snapshot, Farniok's projection is **u=−.224**, behind
  Barrett along the QB direction. The next block label starts later; no intent
  or hand-transfer force is observed. Corridor onsets are **1.181 / 1.481 /
  1.714 s**, a .533-s spread. Kinematics stop at **2.514** before contact, so
  the .95-yd gap at release is explicitly a later, post-contact observation.

The explicit `event_tackle_contact=True` statements above concern
**rusher→QB tackle attempts**, not the blocker→rusher engagements. Neither a
Pressure label, a <=2-yd threshold nor an active engagement is substituted for
that contact label. QB-hit, sack and tackle-contact fields have distinct
definitions and remain separate even when their flags differ.

## Fitness for the requested measurement

| Question | Supported here | Not established |
| --- | --- | --- |
| Who interacted and when? | Checked provider pair UUIDs/IDs and annotated intervals, with unresolved joins rejected | Contact force, grip, continuous load, true release/shed instant or full assignment |
| Did the rusher threaten space near the QB? | Labeled pressure, center distance, closing and interposition, with time/quality/contact censoring | First physically usable dynamic route; a blocker can still react, reach or load the rusher despite an open center segment |
| Did the blocker delay or redirect access? | Observed label exposure, changed rusher path and simultaneous blocker/QB geometry | Causal delay versus an unblocked counterfactual; how much movement a blocker caused; bad choice versus failed execution |
| Can offensive and defensive wins coexist? | Clean quick release, local edge containment despite other pressure, labeled contact and sack | League rates or required outcomes for the simulation |

**Recommendation:** retain these as isolated case studies and source-quality
checks. Do not adopt a StatsBomb “first usable access” benchmark or blocker-delay
calibration from this sample. A larger download would not by itself resolve
the semantic problem. Before defining such a measurement, obtain the provider's
engagement/pressure generation and endpoint rules, validated identity mappings,
per-frame observed/imputed information, and independent film/contact-onset review.
Body orientation, reach, resistance and feasible movement still need explicit
assumptions; tracking alone cannot supply force, gaze or decision intent.

## Reproduction, cost and restrictions

```sh
python3 -I scripts/diag/amf-protection-access.py --out out/amf-protection/access-research.json
```

The script is deliberately tied to this one game, its four pinned local inputs
and four listed contrasts. It reuses the existing sample audit's parsing helpers;
no acquisition command or generalized data pipeline is involved. The final audit
took **about 2.4 s** on this executor. Input payload is 71,957,404 existing bytes;
rehashing/parsing rereads some bytes locally. Zero new downloads, simulations,
engine imports or BDB queries. Projection/mirror checks, source/result pins,
selected quality, contact-frame exclusion and monotone radius sensitivity pass.
Full rejection/interval ledgers stay in ignored local output; the committed
receipt contains only compact research summaries and selected derived measurements.

This is an internal research draft under the
[StatsBomb Public Data User Agreement](https://raw.githubusercontent.com/hudl/amf-open-data/0ef19db20d768f34ad0e260c9c19b85c30ab8984/LICENSE.pdf):
commercial exploitation of data **or derived analysis** is prohibited and raw
redistribution/alteration is restricted. Publication requires StatsBomb credit
and its logo. Do not package raw extracts, incorporate this research into a
commercial simulation or redistribute data without the needed source permission.
No production calibration or incorporation was performed.
