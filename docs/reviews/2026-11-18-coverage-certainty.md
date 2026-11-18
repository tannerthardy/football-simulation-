# The QB certain of the wrong coverage (Integration's item, ranked above the deep mix)

QB lane, 2026-11-18. Tree: PR #852 + the quick clock + Flex's DEF_CATCH / BALL_SIGHT diff (READ_WINDOW=1). Probes:
`scripts/diag/eyes/cov-id.ts` (staged), `cov-id-games.ts` (league games, his belief at his set against the truth) and
`cov-read.ts` (one league play: each post-snap read, the observed features, the templates, the belief before and after).

**How often.** In league games (seeds 101 and 102; every play attacks +x, so this is not a direction bug), 8 of 161 zone
pass plays believed man at 0.9 or more at his set. In the staged doubles panel (curl_flat, all 44 coverages) he is never
confidently wrong.

**Seed 101 play 35** (cover3_seam). His post-snap read (`qbmind.ts` `postSnapRead`) compares [deep count, middle of the
field, fraction turned] with each coverage's template by a Gaussian (POST_SIG_SIGMA 0.6 / 0.3 / 0.18 × his noise scale,
0.65 here).

| read | the free / strong safety | observed [deep, middle, turned] | cover3_seam template | cover0 template | cover0 belief |
|---|---|---|---|---|---|
| 0.55 s (w 0.6) | 7.2 / 6.5 yd, not bailing | [0.17, 0.04, 0] | [2.5, 0.5, 0.1] | [0.09, 0.02, 0.01] | 0.005 → 0.995 |
| 1.05 s (w 1) | 7.2 / 6.8 yd | [0.53, 0.09, 0] | | [0.14, 0.04, 0.39] | 0.995 → 1.000 |

**Two defects.**
1. **The templates are stale.** "Deep" is a logistic around 9.5 yd, and the zone templates expect 2.2-2.5 deep men by
   0.5 s. Our deep players now play shallower and later (Coverage's position rules since engine-80). Refit the templates
   from the engine's own coverages: per coverage, the mean and spread of the same observed features from his own looks
   in staged plays. That is his learned picture, re-fit when the defense changes.
2. **No way back.** When every template misfits, the least-bad one takes all the mass, and a belief at 1.000 against
   the 1e-6 floor cannot recover. The likelihood needs an outlier component (a broad mixture per feature), so one look
   cannot make him certain unless the alternatives are actually ruled out.

**Why it matters.** Believing man, the window charges a facing zone defender the man rule (he waits for the release),
about a windup late against a defender who reads the arm. That is how play 35's corner was priced 0.34 s late.

To build after the joint DEF_CATCH landing's terms, or first if that waits on Flex's rebase.

## Built and measured: the refit and the way back do not fix it (QB_COV_FIT, off, not landed)

Patch (work in progress, flag off): `docs/reviews/patches/engine71-footwork/qb-cov-fit-wip-on-b6658fef-plus-rw.diff` (on
b6658fef + the READ_WINDOW flip).
- `scripts/diag/eyes/cov-sig-fit.ts`: his observed features (his own memory) at 0.5 / 0.8 / 1.2 s, every coverage (24
  staged plays each, varied formations and concepts) plus 4 league games. Writes `src/sim/coverage-signatures.ts`: 48
  coverages, mean and sd, 27-61 looks each.
- QB_COV_FIT: the fitted mean; spread = the fitted sd combined with half his processing noise; each feature a mixture
  with a broad component (weight 0.05, chosen: about one look in twenty misses a defender or catches one mid-move).

**What the fit shows.**
- The old templates were stale: cover3_seam shows 1.4 deep at 0.5 s (template 2.5), 2.8 by 1.2 s.
- **The "turned" cue is dead.** About 0 for every coverage, cover0 and cover1 included (old template 0.6). Our man
  defenders do not turn. Against four verticals in cover1 the corners and nickel run 2.6-3.4 yd/s at 1.2 s still facing
  the QB (cosine 0.78-1.0; `turned-check.ts`). Post-snap he has almost nothing that separates man from zone within a
  shell (cover1 against cover3, cover2man against cover2). That is Coverage's: man technique on a vertical turns and runs.
- His remembered speeds lag the truth (mem 1.0 against true 2.4 yd/s on the same man).

**League accuracy** (`cov-id-games.ts`; man/zone "confidently wrong" = pMan ≥ 0.9 on zone or ≤ 0.1 on man):

| | 0.3 s (before any post-snap read) | 0.6 s | 1.1 s | at his set |
|---|---|---|---|---|
| off (seed 101, 2 games) | 10.8% | 10.8% | 9.1% | 10.2% |
| QB_COV_FIT | 11.0% | 11.0% | 16.0% | 14.6% |

Man/zone right at his set: 0.84 off, 0.81 on. Interceptions and time to throw are not distinguishable in these games.

**So the certainty is pre-snap.** He is confidently wrong on about 11% of league snaps before any post-snap read. The
pre-snap read (PRE_SIGMA, a Gaussian on hand-set pre-snap templates) has the same two defects, and the post-snap read,
having no man/zone signal, cannot undo it. Next: the same treatment for the pre-snap read (fit its features from his
looks; a broad component), and the turned cue to Coverage. The post-snap refit stays off: it does not repair the
mechanism by itself.
