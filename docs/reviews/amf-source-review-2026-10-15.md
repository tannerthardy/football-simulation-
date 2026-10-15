# Hudl / StatsBomb AMF open-data source review

2026-10-15, Measurement. **Useful complementary research source; acquisition
prepared, bulk download and engine incorporation deferred.** Its strongest
addition is linked tackle/contact/outcome and engagement-pair annotations.
Nominally higher tracking frequency does not make it a better physics reference.
The pending P045 Big Data Bowl available-weeks study remains open and unchanged;
this audit imports neither that query nor any simulation runtime.

## Version and actual availability

Pinned [source tree](https://github.com/hudl/amf-open-data/tree/0ef19db20d768f34ad0e260c9c19b85c30ab8984),
`0ef19db20d768f34ad0e260c9c19b85c30ab8984` (observed `main`/HEAD).
The [manifest](../../data/reviews/current/amf-acquisition-manifest.json) records every
dataset/document asset URL, HTTP byte count and ETag, plus locally known hashes.
All 183 selected asset HEAD requests succeeded. No clone or Git history was downloaded.

| NFL season | Games in play CSV | HF game files/catalog | LFT game CSVs | HF gzip bytes |
| --- | ---: | ---: | ---: | ---: |
| 2016 | — | 18 | — | 198,275,827 |
| 2017 | 17 | 16 | — | 181,757,349 |
| 2018 | 18 | 16 | — | 180,542,813 |
| 2019 | 17 | 17 | — | 193,027,356 |
| 2020 | 19 | 20 | — | 198,012,361 |
| 2021 | 19 | 19 | 19 | 155,402,802 |
| 2022 | 18 | 18 | 18 | 149,017,684 |
| Total | 108 | 124 | 37 | 1,256,036,192 |

The six play CSVs were read: **18,116 rows, 108 distinct game IDs**. Their union
with the HF catalog contains **127 games; 105 have both**. Three games have play
tables but no HF file: `2017_02_NE_NO` (`1074671`), `2018_07_NE_CHI`
(`1074285`), `2018_10_NE_TEN` (`1074379`). HF has no matching play table for
the 18 listed 2016 games or `2020_05_TB_CHI` (`1503690`).

Six event CSVs exist for the same 2017/18–2022/23 season filenames. Only the
2022/23 event table was read (127,902 events, 18 games); the other five tables'
row-level game coverage is not asserted. Exact names/URLs/sizes are inventoried.
Some GSIS fields are missing even when StatsBomb game/play UUIDs exist.

This is the **TB12DB selected Patriots/Buccaneers collection**, including
opponents, postseason games and some non-Brady quarterback play. It is neither a
league sample nor a complete set of all games in every listed season. Tracking,
play and event coverage must be joined, not inferred from a season filename.

Formats: per-season play/event CSVs; LFT per-game CSVs and two season Parquets
(2021/22 and 2022/23); HF per-game JSON.gz. Seven alternative season ZIP URLs
are advertised in the README. They are not selected for acquisition; S3 HEAD
is blocked by this executor's destination policy, so ZIP sizes remain unknown.
GitHub raw URLs work and provide a complete alternative path.

## Documentation, labels and conventions

The five source PDFs describe
[plays](https://raw.githubusercontent.com/hudl/amf-open-data/0ef19db20d768f34ad0e260c9c19b85c30ab8984/doc/plays_dictionary.pdf),
[events](https://raw.githubusercontent.com/hudl/amf-open-data/0ef19db20d768f34ad0e260c9c19b85c30ab8984/doc/events_dictionary.pdf),
[LFT](https://raw.githubusercontent.com/hudl/amf-open-data/0ef19db20d768f34ad0e260c9c19b85c30ab8984/doc/lft_dictionary.pdf),
[HF](https://raw.githubusercontent.com/hudl/amf-open-data/0ef19db20d768f34ad0e260c9c19b85c30ab8984/doc/full_tracking_dictionary.pdf),
and [coordinates](https://raw.githubusercontent.com/hudl/amf-open-data/0ef19db20d768f34ad0e260c9c19b85c30ab8984/doc/coordinates_explainer.pdf).
Five examples provide Python pass/track/defensive-alignment notebooks and R
pass/tracking demos. The tracking notebook was inspected, not executed.

Play fields include down/distance, personnel/formation, box, pressure/sack,
play action, motion, pocket/dropback/exit, run gap/point of attack,
run-behind/run-at player IDs, target/catch separation, catch contest, YAC and
yards after contact. They do **not** supply PFF route/MOD responsibility or a
complete playbook call. Formation and completion/catch probability fields are
provider model outputs, not independent labels of a correct decision.

Event fields include snap, pass, catch outcome/failure type, placement and
catchability, pressure/hit/breakup, tackle attempt/contact/success,
broken/avoided tackle, run disruption and engagement start/end. UUID links
connect ball origins, tackle attempts/outcomes and engagement pairs. Availability
of a field in the dictionary is not proof that it is populated for every event.
The PDFs are field dictionaries, not a complete annotation/accuracy protocol.

LFT is an **event-linked set of player positions**, not a fixed-rate feed.
Join `(event_uuid, track_player_index)` and retain `player_id`; array indices
are not stable player identities. Possession is marked with `track_ball_location`.
For airborne/loose balls the documentation describes an interpolated row with
index `-1`, null team/player IDs. It is not an independently observed ball flight.

HF describes player tracks at nominal **30 Hz**, with yards as the declared
`x/y` units, player/GSIS IDs, `time_since_snap`, on-camera ratios and calibration
flags. The inspected file has no non-player/ball track, orientation, pose,
force, grip or gaze. Do not infer those channels from the 30 Hz label.

Event/LFT coordinates are offense-normalized: own goal line `x=0`, opponent
goal line `100`, end zones approximately `-10..110`, width `160/3` yards.
HF `x/y` use a static field. For the inspected game, rotate a right-to-left play
with `(100-x, 160/3-y)` using the **play's** `offense_left_to_right`, then subtract
the linked play's LOS for a future common packet. Do not rotate twice or use a
defender event's attacking flag as the play direction.

Empirical mismatches with the dictionaries require explicit adapter checks:

- HF timestamps are **microseconds** here: dividing by `1e6` aligns event-video
  seconds and time-since-snap within 0.000499 s. The dictionary calls them ms.
- HF `game_clock=896` corresponds to CSV clock `896000` ms in the first play.
- The sample's `ngs_x=6*x+90`, `ngs_y=6*y+30`, to floating-point precision.
  Do not treat these columns as ordinary NGS yard coordinates or guess feet.
- Event actor coordinates are not identical to nearest HF body positions:
  median residual 0.955 yd in the screened phase samples. Event locations and
  sampled player centers have different semantics and possible collection error.

## Representative game: first listed 2022 game with all four products

`2022_01_TB_DAL`, StatsBomb `1501094`, 2022-09-11. Selection preceded outcome
inspection. HF gzip **7,752,122 bytes**; decoded JSON **68,234,474 bytes**.
The linked 2022 season CSVs and this game's LFT CSV were inspected together.
See [reproducible audit](../../scripts/diag/amf-source-audit.py) and
[result with input SHA-256 pins](../../data/reviews/current/amf-source-audit.json).

- 162 labeled plays; HF covers **75 Pass + 48 Rush = 123**. Missing: 4 Pass,
  1 Rush, 8 kickoffs, 9 punts, 6 field goals, 1 extra point, 3 kneels and 7
  penalty no-plays. Whole-game tracking is not continuous broadcast time.
- Every tracked play has 22 distinct player IDs/track records. The provider's
  `player_coverage_count` equals 22 on only 91 plays; its existence is not a
  dense-observation certificate.
- **615,400 player steps; 6,031 null/nonfinite x/y**, 152 within-track gaps
  exceeding 34 ms (maximum 1.667 s), one duplicate timestamp. There are 242
  calibration-fault steps on 8 plays; 628/2,706 tracks have on-camera ratio <1
  (minimum .527). Finite positions can still include off-camera estimation;
  no per-step on-camera mask is supplied here.
- Play envelopes span pre-snap through portions of play action: median earliest
  sample −3.369 s, median latest +4.558 s; latest envelopes range +2.517 to
  +12.264 s. These are union envelopes, not complete per-player windows.

| Phase in tracked plays | Linked events | All 22 finite/unflagged within 17 ms | Actor sample meets same screen |
| --- | ---: | ---: | ---: |
| Snap | 123 | 123 | 123 |
| Pass release | 69 | 69 | 69 |
| Pass-origin catch attempt | 58 | 48 | 50 |
| Handoff | 41 | 40 | 41 |
| Tackle attempt | 174 | 117 | 166 |
| Tackle event | 176 | 27 | 51 |

These are necessary sample screens, **not confirmed camera observations**.
Eight catch-event actor IDs are absent from their play's HF roster. Preserve
these as identity-join failures; do not silently rename or substitute nearest
players. For tackle events, 119 actor samples fail the timing tolerance; endpoint
annotations commonly outlast the track. Do not forward-fill these intervals.

LFT has **99,496 rows / 4,519 joined events**, against 6,163 game events.
4,431 snapshots have 22 distinct player IDs; 409 synthetic ball rows occur.
There are no duplicate player IDs within these snapshots, but indices reach
23 and some snapshots contain only 5–21 players. All 1,644 events without LFT
also have blank `event_no_ff_cause`: blank does not guarantee coverage.
Positive distinct-event gaps within plays range about 1 microsecond–4.800 s,
median .100 s; this irregular mixture must not be resampled as observed 10 Hz.

## Highest-value uses and retained witnesses

1. **Catching / pursuit:** start with identity-linked tackle attempts, contact
   and paired outcomes, separating avoided contact, contacted-but-broken and
   successful tackles. This adds annotation beyond nearest-defender proxies.
   Follow fixed IDs before throw, during flight and into an eligible catch;
   censor the trailing velocity window before the actor-linked first contact.
   Neither two nearest-defender scalar endpoints nor post-contact speed identifies
   an approach failure. P045 has no receiver contact, so these labels cannot
   turn its touchdown into evidence of grip failure or prescribe its outcome.
2. **Protection:** pair engagement start/end by UUID and player/opponent IDs,
   then inspect pocket geometry and pressure timing. The sample has 729 starts,
   all with opponent IDs and resolvable end UUIDs, plus 56 Pressure and 19
   Proximity Pressure events. Early observation is stronger than late catch
   coverage here. Labelled engagement is not proof of a particular hand force,
   assignment or pressure causality; it complements existing PFF block labels.
3. **Run game:** combine handoff, actual run-at/run-behind IDs, LOS crossing gap,
   run disruption, engagements and tackle outcomes to study free penetrators,
   combinations, flow and post-contact opportunity. Pair defensive success with
   legitimate cutback/blocking/runner wins. It cannot label an intended IZ/OZ/
   gap call from outcome gap alone or validate loaded grip/recovery physics.

Useful references selected by earliest GSIS order satisfying each label pattern:

- **Play 65**, `aac099f8-87db-4d48-8c12-298b812621bb`: Dalton Schultz
  (`1023948`) catch at +2.299 s; Mike Edwards (`1024484`) contact attempt at
  +2.399 s is unsuccessful and paired with a broken-tackle label; Jamel Dean
  (`1024486`) contact attempt +3.199 s succeeds. Both attempts have contact=true.
  This retains an offensive win and useful defense on the same receiver.
- **Play 89**, `bdfc4947-600b-4416-8abb-cc4ae7266f6f`: handoff to carrier
  `1023921` +1.213 s; a broken attempt then a successful attempt, with eight
  engagement starts. Candidate for a run-pair/contact audit, not a run-concept label.
- **Play 224**, `fee43337-c0b8-45f2-8ee6-7d293c18970a`: pressure +1.700 s,
  hurried pass, breakup, five engagement starts. Candidate for tracing an actual
  pressure opportunity without treating incompletion alone as good protection.

IDs above are **StatsBomb IDs**, not NFL IDs. Keep both namespaces and original
UUIDs/GSIS joins. These examples establish data usefulness, not league rates,
matched P045 controls or a diagnosis of decision versus execution by themselves.

## Acquisition, reuse and next decision

No preexisting AMF source references/files were found in the visible workspace,
shared downloads or source catalog before this investigation. Other executors,
including Catching's, are not visible: a cross-machine absence is not established.
Before acquiring elsewhere, compare the manifest paths/sizes/hashes against that
host's holdings; copy/query only missing assets rather than downloading again.

Keep raw files at `/workspace/datasets/amf-open-data/0ef19db20d768f34ad0e260c9c19b85c30ab8984/`,
outside the simulation repository. The proposed **146-file canonical set is
1,702,488,374 bytes (1.70 GB / 1.59 GiB)**:

| Product | Chosen format | Bytes |
| --- | --- | ---: |
| HF, 124 games | per-game JSON.gz | 1,256,036,192 |
| Plays, six seasons | CSV | 31,606,675 |
| Events, six seasons | CSV | 304,957,606 |
| LFT, two seasons | Parquet | 108,731,916 |
| Catalog, README, licence, five dictionaries | original files | 1,155,985 |

Choosing the two season Parquets avoids acquiring another **721,743,503 bytes**
of per-game LFT CSVs. Source docs advertise these as alternative formats; exact
row/game parity should be checked after acquisition, before discarding a CSV
someone already holds. Do not also fetch season tracking ZIPs. No provider fee
is advertised; infrastructure bandwidth/time charges are not known.

**84,338,366 canonical bytes already acquired and hashed; 1,618,150,008 remain.**
The diagnostic LFT CSV (17,194,884 bytes) and inspected notebook (2,464,971 bytes)
are additional local research files, outside this canonical count. Retain gzip
and parse one game at a time. Expanding every HF file would be roughly 11 GB if
the single sample's 8.8× ratio transferred; that is an estimate, not a measured
full expansion size. Keeping both compressed and decoded copies would exceed
the canonical storage substantially. The final one-game audit took 4.00 s with
597,132 KiB peak RSS on this executor; parallel whole-game parsers need their
own budget. The [validation receipt](../../data/reviews/current/amf-source-review-validation.json)
records byte pins, the transport smoke check and unchanged BDB module hashes.

```sh
# Cost/holdings plan only: no downloads. Reuses the sampled files by SHA-256.
python3 -I scripts/data/amf-acquire.py --manifest data/reviews/current/amf-acquisition-manifest.json

# Only after the acquisition/usage decision; sequential, resumes .part files.
python3 -I scripts/data/amf-acquire.py --manifest data/reviews/current/amf-acquisition-manifest.json --fetch --max-bytes 1618150008

# Reproduce this one-game audit from the same files (no simulations).
python3 -I scripts/diag/amf-source-audit.py --root /workspace/datasets/amf-open-data/0ef19db20d768f34ad0e260c9c19b85c30ab8984 --out out/amf/source-audit.json
```

The small fetcher binds partials to immutable URL/size/ETag, uses HTTP ranges,
refuses conflicting existing files, and records completed SHA-256 receipts for
later verification. Unknown manifest hashes are **not provider-verified hashes**:
first-download hashes establish reproducibility at the pinned URL. HTTP ETags
are opaque, not substituted for SHA-256. Manifest/receipts and local files must
remain together; modified content fails reuse rather than being overwritten.

The [source agreement](https://raw.githubusercontent.com/hudl/amf-open-data/0ef19db20d768f34ad0e260c9c19b85c30ab8984/LICENSE.pdf)
(last updated 2023-09-08) permits research but restricts alteration/third-party
data provision (1.2.1, 7), prohibits commercial exploitation of data **or derived
analysis** (1.2.2), and requires the StatsBomb logo on published analysis (1.4).
The README also requests source credit; the agreement asks users to register
their interest. This is not an unrestricted open-data licence. Written permission
is needed before commercial simulation incorporation or raw-data redistribution;
do not commit raw extracts or package them with the product.

**Next decision:** keep the inspected sample as isolated research, or proceed
with the remaining 1.62 GB research acquisition under these terms. Recommend
keeping the sample first and resolving intended commercial/redistribution rights
before bulk ingestion or an engine adapter. Then prioritize a small linked
tackle-outcome audit and protection-pair audit, with identity/visibility failures
explicit. No engine tuning or replacement of the pending BDB study is proposed.
