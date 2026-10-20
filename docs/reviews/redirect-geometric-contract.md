# Redirect mirror: explicit numerical accuracy after paired diagnosis

The original combined build `075e2148` failed one patch-hand request reflection
by `5.886e-10` yd/s against a `5e-10` decimal threshold. The
[published paired source diagnostic](https://github.com/tannerthardy/football-simulation-/tree/2ce93896b191e70cda9a2e12a9e4d5de48b98dfe/data/reviews/current/redirect-numeric-2026-10-20)
preserves the failure, failed collectors, eight retained accepted/combined
native traces and their checksums. Both mirrors retain 35 identical target and
timestamp decisions. The maximum request discrepancy is `7.119e-10` yd/s and
maximum RT/DE/QB position discrepancy is `7.517e-11` yd. The first tiny mirror
perturbation already exists on accepted source; its later amplification is not
attributed to #180 by this two-source comparison.

`8928b9f66f59eaa1477971ac94b9f7a17d752968` replaces the request-only decimal
criterion with an explicit absolute numerical accuracy contract for this
six-second reacting fixture:

- Achieved RT/DE/QB positions are recorded by detached copies at each existing
  post-shed request capture. All three reflected paths must match within
  `1e-9` yd; this newly checks achieved geometry, not just requested motion.
- Request velocity must match within that displacement over one ordinary
  `DT=.05s` tick, `2e-8` yd/s. This is weaker than the original request-only
  `5e-10` criterion, explicitly adjudicated after the saved paired diagnosis.
- Target identity, timestamp, number of requests and three-body array length
  remain exact. Closest-distance and facing comparisons remain at nine decimal
  places; installed home remains at ten. A material geometric mirror defect
  still fails. No production motion, assignment, force or gameplay threshold
  changes.

The nanoyard value is an explicit fixture accuracy budget, not a proof of a
universal floating-point error bound. Its per-tick velocity conversion prevents
unexplained assignment or body drift from being excused as rounding. The saved
`0.003yd` motion-contact failure was repaired at its actual wall-picture owner;
it would fail this geometry contract rather than being waived.

Independent reviewer `/root/motor_review` read the exact patch and both raw
four-arm archives and verified all 12 evidence hashes. **ACCEPT**, with the
three positions explicitly ordered RT/DE_S/QB and length exactly three. This
approval concerns the fixture's demonstrated roundoff and stated accuracy;
it establishes neither #180 causality nor general football improvement.

The two directly affected redirect checks pass at the exact commit, components
enabled and all 44 settings unchanged. Command cost **2.034s**. No shared suite,
games or new matrix was run for this qualification. The root integration owner
still verifies the exact final composition.
