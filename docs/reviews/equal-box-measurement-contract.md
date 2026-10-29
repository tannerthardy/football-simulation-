# Equal-box measurement contract review

Review date: 2026-10-29. Implementation owner: Run. Tools owns independent source/data/contract checks and this preserved evidence. No shared loader, counting implementation, controller, physics or capacity was changed.

## Decision

**ACCEPT reproducibility of the explicitly declared raw snap-count query. HOLD the claimed 0.88-versus-0.72 comparison as an independently validated football result.** The NFL half reproduces under immutable published source; the sim producing tape, source/settings and denominators have not been supplied here. The reference has six retained failed controls. The snap contract can guide Run’s suite preparation while its owner repairs/qualifies the touch and input guards; this is not a demand for a new physics solver or a global blocking retune.

## Immutable sources and preservation

- Published operator: [`box_count_reference.py`](https://github.com/tannerthardy/football-simulation-/blob/f7251869ed0f9c9f59242a9a799523c31f685fcb/scripts/mechanics/box_count_reference.py), commit `f7251869ed0f9c9f59242a9a799523c31f685fcb`, parent `3779a4ed71eadbdc24dc9b023f67b7b80b95a505`; SHA256 `42e02117fe3bcec7a192ab15d4f0d208915b5084338ef2ba8bc0b2303786857a`.
- Imported public `run_film_reference.py` SHA256 `c78ed2da8d62c5d2a223e1de00fd625dd1fe5ee751ecbada541f84d1a522d7d7`. It provides the required `xy/players/carrier/src/concept` interface. Analytic NFL/sim loader parity passes. This does **not** establish byte or behavior identity with the external author’s unavailable original overlay.
- The supplied original scratch script is preserved in [`box_surplus_original.py`](../../scripts/mechanics/box_surplus_original.py). Only transported HTML comparison entities were decoded; the header identifies the uncertainty. Running it with the canonical loader gives **exactly the same NFL counts, box/blocker sums, surplus sums and all four strata** as f7251869. The original one-off personnel split and other scratch scripts were not reconstructed as though their bytes were known.
- NFL input: locally converted RUN-ONLY BDB2025 / season 2022 weeks 1–9, 6,223 records / 136 games, SHA256 `07d8afc85706184f6214a9271b7a913def6188f95f4521b2e652d83639433cde` (31,093,289 bytes). Not a full season or the other host’s 15,936-record run/pass gzip. Converter SHA256 `a964af05d205f094126f08bdbbfb8788190f21fa7df003fbd0a5936446f5235c`; [conversion/weekly manifests](https://github.com/tannerthardy/football-simulation-/pull/366#issuecomment-6480133769). No download, conversion or native simulation in this review.
- Every cached play has 22 unique original player identities, 11 per side, finite positions throughout and an observed-sample mask with no missing samples. These checks do not certify physically valid coordinates: the raw-anchor contradiction below remains visible. These properties were checked, not inferred from the operator’s permissive interface. Raw/derived per-play files remain ignored under `out/`.

## Exact rules and differences from similarly named operators

| Operator | Snap region/anchor | Blockers or target population |
|---|---|---|
| f7251869 surplus | DL/LB/DB roster groups, x < 7.5 and abs(y − mean **all** OL y) < 6.5; strict edges, **no lower x bound** | All OL if at least five exist; TE within same width (no depth condition); noncarrier RB-group player with x < −1 within width |
| f7251869 touch | LB snap depth 2.5…8 inclusive, abs(y − OL mean) < 6 | **All** OL/TE/noncarrier RB, including initial outsiders omitted from surplus blockers; any sampled center distance < 1.5 with blocker x > −0.5 |
| Native QB preSnapCheck | Noisy observed defender positions, depth < 7.5 / width < 6.5 around **ball** | Installed OL/inline/F slots, center and centered fullback apportioned between sides; private installed plan is not observed NFL blocking intent |
| Native alignDefense.boxCount | Depth < 7.5 / width < 6 around ball | Alignment diagnostic, no matching blocker count |
| metrics.Play.box_count | Coordinates rounded to 0.1; inclusive depth −0.5…7 / width ≤ 6.5 around ball | Collector’s RB-group-with-handoff cohort |
| metrics.Play.box_defenders | Inclusive depth −0.5…2 / width ≤ 4.5 around ball, all defensive groups | Line-front alignment proxy, **not** all box defenders |

The public box-count docstring says “five linemen” and “same window as QB”; the code actually uses all ≥5 OL and an OL-mean anchor. Six/seven-OL packages and asymmetric formations matter. Across this input, the existing metrics box count and f725 count differ in **855/6,223 plays (13.74%)**; that is a definition difference, not an error rate. One diagnostic example: 2022101603-4087 / MAN, ball y=-14.63, mean OL y=24.20, f725 box=9 versus metrics=0. Follow-up of this extreme difference found a concrete raw-data/anchor problem, described below; it is not evidence for changing defensive physics.

The original and published counters do **not** compute play-side/backside surplus. The QB controller has its own side-specific check; that does not make it part of these reference outputs. Calling a reference “like box” also does not guarantee equal 6v6/7v7 size, front, width, depth or responsibilities.

All snapshots are index zero. NFL conversion normalizes offense toward +x, x relative to snap ball LOS, y in yards. Shared sim subtracts `setup.los`; standard traces need real t=0 and 10 Hz. The loader rejects an initially offset clock but checks only the first 30 frames; late drift is a retained failing control. `run_films` transparently filters truthy run concepts before the shared loader, rather than importing an unavailable overlay. It does not retain base/candidate arm labels: run distinct producing arms separately and retain their manifests.

Personnel strings count roster RB/TE groups over the whole field. FB is folded into RB, extra OL are not encoded, and a detached TE remains a TE in this string while leaving the blocker count. This is not independently charted installed personnel or blocking assignment. WRs and QBs do not count as blockers in this proxy even when a football scheme might use them. Missing declared personnel cannot be recovered by inventing it from a call label.

## Reproduced NFL table: preserve unstratified and conditional results

Intervals are 95% percentile whole-game cluster bootstrap, 2,000 draws, seed 20261028. Resample games with all plays/backers together. Touch fractions pool qualifying backers, not per-play percentages. These describe the selected nine-week sample, not causal effects, assignment accuracy or entire-season incidence.

| Stratum | Runs | Share [95% interval] | Mean D / B | Touched / eligible backers | Touch fraction [95% interval] | First positive after ending |
|---|---:|---|---|---|---|---:|
| ALL | 6,223 | 100.00% [100.00, 100.00] | 6.76 / 6.62 | 9,800/11,317 | 0.8660 [0.8576, 0.8740] | 33 |
| light | 1,530 | 24.59% [22.81, 26.45] | 5.84 / 7.07 | 2,366/2,730 | 0.8667 [0.8499, 0.8824] | 10 |
| even | 2,491 | 40.03% [38.68, 41.38] | 6.63 / 6.63 | 4,143/4,710 | 0.8796 [0.8695, 0.8898] | 10 |
| +1 | 1,719 | 27.62% [26.04, 29.04] | 7.30 / 6.30 | 2,618/3,096 | 0.8456 [0.8315, 0.8599] | 9 |
| +2 or more | 483 | 7.76% [6.96, 8.55] | 8.46 / 6.28 | 673/781 | 0.8617 [0.8342, 0.8875] | 4 |

**The rounded NFL 0.88 claim reproduces:** 4,143/4,710 = 0.8796 in 2,491 even-box runs. The preliminary sim 0.72 has no supplied producing source, exact input hash, settings/roster/seed/overlay manifest or backer denominator here. No independent sim interval or fair gap estimate can be computed. Similar rounding is not proof that the external author used this same extract.

There are 149 plays with no eligible backer target, including 37 even-box plays; they remain in snap-count incidence but create no touch denominator. They must not become failed second-level blocks. Even-box size mix is 5v5: 56, 6v6: 1103, 7v7: 1064, 8v8: 241, 9v9: 26, 10v10: 1. Equal surplus alone does not match those sizes.

Carrier groups are RB 5,511 / QB 467 / WR 229 / TE 16. A **separately labeled** RB-group-with-recorded-handoff cohort has 5,462 runs. It is a prospective population alignment option, not an outcome-based repair of a statistic (missing NFL pitch/handoff labels and mapping still need disclosure). In that cohort:

| Stratum | Runs | Touched / target backers | Touch fraction [95% interval] |
|---|---:|---|---|
| ALL | 5,462 | 8,895/10,053 | 0.8848 [0.8766, 0.8931] |
| light | 1,188 | 1,943/2,139 | 0.9084 [0.8937, 0.9228] |
| even | 2,244 | 3,836/4,288 | 0.8946 [0.8844, 0.9049] |
| +1 | 1,592 | 2,480/2,905 | 0.8537 [0.8401, 0.8677] |
| +2 or more | 438 | 636/721 | 0.8821 [0.8559, 0.9084] |

That change alone moves even-box NFL from 0.8796 to 0.8946. Freeze the requested population before reading outcomes; do not silently compare a forced RB suite with all NFL rushing types. NFL MAN stays distinct; sim Duo maps into IZ, so those concept labels are not interchangeable coaching assignments.

### Observed roster-personnel composition (not a declared coaching chart)

| RB/TE proxy | Runs | Share of recorded runs | Mean D / B | Defense +2 or more |
|---|---:|---:|---|---:|
| 11 | 3,048 | 48.98% | 6.44 / 6.04 | 322/3048 |
| 12 | 1,567 | 25.18% | 6.91 / 7.07 | 64/1567 |
| 21 | 762 | 12.24% | 6.98 / 6.90 | 36/762 |
| 13 | 395 | 6.35% | 7.41 / 7.68 | 20/395 |
| 22 | 334 | 5.37% | 7.66 / 7.85 | 20/334 |

The remaining 117 runs span smaller proxy cells (00/01/02/03/10/20/23/30/31). The operator suppresses some small printed cells at n < 30; they are not zero incidence. Without the sim tape, no NFL-versus-sim personnel difference is certified. A forced heavy-package suite must not be compared to this empirical mixture without explicit strata/weights.

## Touch timing and concrete failures

Touch begins at frame 3 (0.3 s), independent of handoff. It ends before the first frame where carrier x reaches **the same backer’s moving x minus one yard**, or at the last recorded frame if it never does. It is not a frozen snap-depth crossing or first physical contact. Fixed target identities are preserved; there is no nearest-defender substitution. Wide runner paths and retreating backers change the observation window. Contact, safe access, legal block, continuous restraint and assignments are not measured.

1. **Post-ending credit.** The published loop does not cap at `play.end`. Thirty-three first positives occur after recorded endings; ten in even-box. With original target denominators retained and only these positives removed, even-box becomes **4,133/4,710 = 0.8775**, still rounding 0.88. This is a real measurement defect but is far too small to explain a claimed 0.88–0.72 gap. Portable analytic control has end 0.5, first proximity 0.8; live opposing control first proximity 0.4. Native example `2022091104-2447`: LB 13 first credited at 3.0 after recorded end 2.7.
2. **Shared-definition mismatch.** The cited common reference caps the never-arrives fallback at end; f725 uses `len(xy)-1`. The same analytic witness gives shared False versus f725 True. Even the common routine can scan beyond end if an arrival is found later; do not import it as automatically correct. Preserve genuinely live wrapped contact; cap by recorded play ending, not first wrap.
3. **Carrier self-count.** Only the RB blocker branch excludes the carrier. Fourteen real TE-carrier plays count themselves as blockers (five light, three even, three +1, three +2+). `2022091108-3251` is a portable identity example. Exclude the carrier irrespective of roster group, or explicitly restrict the predeclared cohort; Run owns the correction. It is rare and not an explanation of the whole gap.
4. **Unknown/duplicate/clock guards.** A NaN defender is silently omitted and becomes a known lighter box. Duplicate player IDs are accepted as separate bodies. Frame-35 clock drift is not rejected. Those are constructed failures, not claims they occur in this verified NFL cache. The current input is finite/unique/observed (with the separate anchor contradiction retained); future saved native tapes need equivalent explicit validation and audited unknown counts. `None` may instead abort; do not interpret either missing case as zero defenders.

840 plays contain a defender within a chosen 0.05-yard sensitivity band of a box edge. This is a boundary screen, not a claimed localization error or incorrect-count rate. Exact strict edges, quantization and the anchor must stay common and disclosed. Do not move boundaries to reproduce a desired fraction.

## Concrete raw-anchor contradiction (not a physics issue)

`2022101603-4087` has converted snap ball y = −14.63, outside the 0…53.33-yard field. All five OL normalize to x ≈ −22.33, although their lateral positions are ordinary. A bounded read of that exact week-6 raw play confirms the tracking football row itself: SNAP frame 138 / event `ball_snap`, direction right, raw x = 98.260002, raw y = −14.630000. The plays metadata records absolute yardline 77. The converter used the raw snap-football point as its LOS/width anchor. This is not a floating-point boundary or a legitimate formation inference.

The published no-lower-bound box counts nine defenders in this corrupted frame; the ball-centered older metric counts zero. Neither is an accepted football interpretation. The record has no eligible target LB under the shifted 2.5…8 depth gate, so it contributes no touch numerator/denominator: excluding only this direct invalid record would not change the reported even-box or overall touch fractions. The original table is retained unchanged as a reproducibility result; do not quietly remove the record to repair an average.

An outcome-independent gross screen over the existing converted cache finds this **one direct out-of-field ball-y contradiction** plus 22 other mean-OL-x flags using the deliberately broad −5…+2 screen. Those other 22 are **unreviewed screen hits, not proven errors or a new eligibility rule**. No alternative LOS was fabricated and no conversion was rerun. A versioned input-validity/anchor decision belongs with the measurement owner before any reissued football-incidence table; preserve audited unknown/exclusion counts and qualify existing measurements. This does not establish that a 0.16 touch gap came from bad tracking or from blocking physics.

## Fair suite contract for the implementation owner

- Use one versioned public observation operator on both sources. Preserve member IDs, source clock, LOS/yard sign, all OL, carrier exclusion, declared unknown handling and four surplus bins. Report exact D and B alongside surplus; do not silently call every even case 7v7.
- Define the eligible run cohort, concept mapping and personnel/extra-OL/split-TE/lead-back/initial box depth-width cells before outcomes. Keep all ordinary wins, failures, no-target observations and sparse cells. Exclude or retain QB/WR/TE runs explicitly. Roster group, alignment and installed responsibility are different quantities.
- Match or stratify **snap-time** information: concept family, exact D/B, offensive personnel/alignment, hash, front/shell/depth/width and relevant game situation. Never match on gain, eventual opening, successful climb, observed touch or having crossed the LOS; those are outcomes/mediators.
- Keep empirical NFL incidence and the current unstratified sim arm. A forced balanced suite is an intervention with its own sampling weights, not NFL play-calling incidence. If weighting to common support, publish weights, missing cells and actual Ns; do not extrapolate to unsupported combinations. Equal surplus removes one mix difference, not scheme/selection/rating/assignment bias.
- For real sim evidence, supply exact producing engine commit/tree, roster seeds, runtime, resolved settings, saved constructor/RNG manifest, trace bytes/hash, clock/overlay source and source-arm identity. Matching analytic geometry through both loaders is not a native football comparison. Report backer Ns and game/constructor clusters; repeated dice shifts are not independent NFL games.
- Run owns the reference correction and suite implementation. Tools provides this independent control packet. Do not edit shared loaders or build another coordinator to compensate. Validate the narrow measurement repair before interpreting a blocking/physics improvement; no force, grip, recovery, gait or strength change is implied here.

## Manual checks and limits

Python 3.12.14. The independent runner is [`box_reference_review_controls.py`](../../scripts/mechanics/box_reference_review_controls.py). On untouched f725: **15 supported checks pass, six essential checks FAIL (21 total; process exit 1, 0.066 s)**. Failures remain visible: end cap, shared fallback compatibility, carrier exclusion, NaN, duplicate IDs and late clock drift. Do not call this suite green or loosen assertions. The unsupported cases are not forced into the main test suite or hidden by skips. No real-input missing/duplicate/nonfinite case was found; one physically invalid raw snap-ball anchor was independently traced and remains a data hold. Compile and whitespace checks pass.

```sh
python3 -I scripts/mechanics/box_reference_review_controls.py --reference /path/to/f7251869/scripts/mechanics/box_count_reference.py
python3 -m py_compile scripts/mechanics/box_reference_review_controls.py scripts/mechanics/box_surplus_original.py
```

NFL execution of immutable `measure()` plus paired first-positive/end accounting took 8.60 s. No new game, broad suite, Actions, raw-data acquisition, threshold change, assertion weakening or merge. One bounded raw week-6 read traced the specific anchor contradiction; no archive or nine-week tracking rescan was performed. Raw outputs/manifests are ignored. Source-qualified tables are evidence for the named observation query, not proof of why a linebacker was reached or that its physical response was plausible.

**Next decision:** Run fixes/qualifies the narrow reference and supplies the exact native comparison manifest. Then validate that candidate with these retained controls and report both unstratified and aligned strata. The six reproduced holds do not justify a broad physics/controller rewrite or erasing the observed NFL 0.88.
