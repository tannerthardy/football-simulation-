# Ball detection before sampling (BALL_EST, defense): design note

Coverage, 2026-11-14. Status: design approved with amendment (angular-speed threshold); not built.

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

## Numbers and sources (revised 2026-11-14 after Integration: the sourced mechanism, not a slope)

He detects the ball's **motion across his retina**: its angular speed as seen from his head (the ball's velocity
across his line of sight divided by its distance, deg/s), against a motion threshold that rises with eccentricity off
his head. tau0 is then only a latency. That gets the cases a field-plus-slope cannot: a ball crossing 15 yd away moves
tens of deg/s and is found almost at once anywhere in the field; a ball thrown from 40 yd nearly at him has little
angular motion and is found late even near the centre; a ball far off in the periphery on a line toward him may not be
found at all.

| Quantity | Value | Source / status |
|---|---|---|
| Visual field about the head (half-width) | 95 deg | Monocular about 100 deg temporal, 60 deg nasal; binocular horizontal 190-200 deg ([review](https://www.ophthalmologyreview.org/articles/visual-fields-introduction), [Visual field](https://wikipedia.com/wiki/Visual_field)). Sourced. |
| Motion threshold T(e), isolated target, laboratory | about 0.03 deg/s near the fovea (1.6 arcmin/s); 0.16 deg/s at 60 deg (9.5 arcmin/s); 0.55 deg/s at 53 deg, 1.15 at 73 deg, 2.15 at 90 deg (far-periphery protocol) | Rising with eccentricity ([McKee & Nakayama 1984](https://pubmed.ncbi.nlm.nih.gov/6695503/)); central and 60 deg values ([refractive-error study](https://link.springer.com/content/pdf/10.3758/BF03207271.pdf)); far periphery ([Motion detection in the far peripheral visual field](https://www.govinfo.gov/content/pkg/GOVPUB-D101-PURL-gpo84675/pdf/GOVPUB-D101-PURL-gpo84675.pdf)). The two protocols differ (60 deg: 0.16 vs about 0.4 interpolated); T(e) is taken as the far-periphery curve beyond 50 deg and linear from 0.03 at 0 to 0.5 at 50 deg. Sourced, protocol mismatch stated. |
| Field multiplier M on T(e) | 10 (sensitivity read at 1, 10, 30) | **Choice.** Laboratory thresholds are for an isolated target with full attention; a defender is under foveal and cognitive load with many moving bodies, which narrows peripheral detection (Williams 1989; [UFOV](https://www.ksu.edu/psych/research/loschky/Ringer_et_al_2014_Creating_a_new_dynamic_measure_of_the_useful_field_of_view_using_gaze_contingent_displays.pdf)). No source gives the field factor in deg/s; it is the stated handle and is not picked by outcome. |
| Attention and skill | M scaled by (1.5 - anticipation) / focus | Load raises peripheral thresholds; sport experts detect peripheral stimuli better ([Vater, Kredel, Hossner 2017](https://boris.unibe.ch/109022/1/Vater%2C%20Kredel%2C%20Hossner%20%282017c%29_CISS.pdf)). Acts on the threshold, which is what those studies measure. Form is a **choice**. |
| Latency tau0 | 0.10 s | **Choice** (accepted), inside the visuomotor loop the estimator uses. Detection: the ball's angular speed over M T(e) continuously for tau0. |
| Saccade latency (orient) | 0.20 s | [Zeevi 1979](https://pelilab.partners.org/papers/Zeevi%20JOSA%201979%20Peripheral%20saccades.pdf); minimum 0.11-0.16 s ([PMC6879951](https://pmc.ncbi.nlm.nih.gov/articles/PMC6879951)). Sourced. |
| Detected bearing error | sd 2 deg + 0.1 e | **Choice** (accepted). |

What the mapping says before any run: for most throws the ball's angular speed is far above M T(e) wherever it is in
the field, so detection is limited by the field (behind 95 deg), occlusion and latency, not by the threshold; the
threshold binds for balls on a line nearly toward him (small transverse motion) and at the field's edge.

## Consumers (Integration's conditions)
- Detection yields a coarse bearing only. Nothing may treat it as a flight: no `catchSpot`, no break to a spot, until
  two samples exist. A defender who has detected but not sampled plays the arm-only branch plus the orient.
- Orienting is a decision: zone defenders orient on detection; **man defenders do not auto-orient** (that is the man
  look's ground, attempt 2).
- One perception: no hips cone anywhere on the 512 path. Read twice: on the current base and after Defense's
  eyes-on-QB lands. Main witness: time to first sample by the ball's eccentricity at the release.

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
