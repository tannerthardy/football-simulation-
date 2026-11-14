# Ball detection before sampling (BALL_EST, defense): design note

Coverage, 2026-11-14. Status: design for Integration; not built.

## Why
With one perception per player (BALL_EST with bit 32), a defender sees the ball only through BALL_EST's sampling eye
range (`EYE`, 30 deg about his head). That number is right for sampling a flight (taking positions to fit a path) but
not for noticing that a ball is up. In people those are two stages: a wide, fast, low-information detection anywhere in
the visual field, then an orienting movement (eyes, then head), then foveal sampling. The hips cone it replaced (1.8 rad
off `facing`) was a cheat in the other direction: the hips "saw" what the head could not.

Measured first (zhead.mts, bf9a385b, 2 games): at the release 24-26% of zone droppers have their head more than 30 deg
off the passer, 11% more than 90 deg, with head equal to hips in both HEAD arms (droppers running hips-turned to their
landmark). That is a separate defect (the zone technique does not keep the eyes on the passer while the hips run;
Defense's task 117 ground) and most of zone's "no estimate" after the seam. Detection is for the rest: a ball he is not
looking at, which a real defender still notices.

## The three stages (one perception, about the head)

1. **Detect.** The ball (in flight, not occluded: the existing `lineOfSight`) is a candidate when its bearing is within
   the visual field about his head. Each tick it is detected with probability 1 - exp(-dt / tau(e)), e its eccentricity
   off his head. Detection carries no trajectory: it gives "the ball is up, at about this bearing" (bearing error
   growing with e). It does not start the estimator's fit.
2. **Orient.** On detection, after a saccade latency, his head is asked to the detected bearing (HEAD's `want`, HEAD's
   rate and `neckRange`); beyond the neck, the shoulders through TRUNK_TWIST, then the hips (`lookJoints`). No second set
   of joint limits.
3. **Sample.** Only with the ball inside `EYE` of his head does the estimator take samples (unchanged).

## Numbers and sources (choices marked)

| Quantity | Value | Source / status |
|---|---|---|
| Visual field about the head (horizontal half-width) | 95 deg | Monocular field about 100 deg temporal and 60 deg nasal; binocular horizontal field about 190-200 deg ([visual field review](https://www.ophthalmologyreview.org/articles/visual-fields-introduction), [Visual field](https://wikipedia.com/wiki/Visual_field)); detection beyond 90 deg temporal is possible ([Springer chapter](https://doi.org/10.1007/978-1-4899-6647-6_40)). Taken as +-95 deg about the head: sourced. |
| Eccentricity cost | detection time grows linearly with e | Motion thresholds rise linearly with eccentricity ([McKee & Nakayama 1984](https://pubmed.ncbi.nlm.nih.gov/6695503/)); RT to motion increases with eccentricity ([2023](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10659946/)), but for fast targets RT is unchanged by eccentricity ([1982](https://pesquisa.bvsalud.org/portal/resource/es/mdl-7101752)). A thrown ball is fast, so the slope is small; the slope itself is a **choice** (tau(e) = tau0 (1 + k e / 95 deg), k = 1 to start), stated as the sensitivity handle. |
| tau0 (detection time constant at the head's centre) | 0.10 s | **Choice**, inside the visuomotor loop the estimator already uses (PURSUIT_DELAY, about 110 ms). |
| Attention and skill | k scaled by (1 - 0.5 anticipation) / focus | Peripheral detection falls with foveal / cognitive load (Williams 1989; [UFOV](https://www.ksu.edu/psych/research/loschky/Ringer_et_al_2014_Creating_a_new_dynamic_measure_of_the_useful_field_of_view_using_gaze_contingent_displays.pdf)); team-sport players detect peripheral stimuli better ([Vater, Kredel, Hossner 2017](https://boris.unibe.ch/109022/1/Vater%2C%20Kredel%2C%20Hossner%20%282017c%29_CISS.pdf)). The rating acts on detection, not on the play. Form is a **choice**. |
| Saccade latency to a peripheral target | 0.20 s (0.11-0.16 minimum) | [Zeevi 1979](https://pelilab.partners.org/papers/Zeevi%20JOSA%201979%20Peripheral%20saccades.pdf): about 200 ms; minimum 110-130 ms in gap tasks ([PMC6879951](https://pmc.ncbi.nlm.nih.gov/articles/PMC6879951)). Neck recruitment begins under 100 ms ([PMC4533108](https://pmc.ncbi.nlm.nih.gov/articles/PMC4533108)); head movement follows the eye's. Sourced. |
| Detected bearing error | sd = 2 deg + 0.1 e | **Choice** (no trajectory, coarse bearing; sensitivity handle). |

## What it should do, stated before results
- Zone: "no estimate at the arrival" falls from about 21% toward the share whose ball is behind the field or occluded.
  If a sourced field leaves it well above the hips-cone figures (4-13%), that is a result (the head defect above).
- Man, trailing with his back to the passer: mostly undetected (the ball behind 95 deg); detection does not replace
  the man look, which comes after.
- No change with BALL_EST off; receivers unchanged under bit 128.

## Witnesses
"No estimate" at the arrival by coverage, flight time and the ball's eccentricity at the release; time from the release
to detection, to the head on the ball, to the first sample; the share detected but never sampled (orienting too slow).
Controls: receivers; zone defenders whose head is on the passer (should be unchanged: already inside EYE).
