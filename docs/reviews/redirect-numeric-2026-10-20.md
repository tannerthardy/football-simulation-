# Redirect mirror failure: bounded numerical diagnosis

The combined candidate `075e2148a8c94c80ba90743a324e4670091998c0` fails the
unchanged patch-hands mirror check at t=3.00: lateral request mismatch
5.886233722662837e-10 versus the existing 5e-10 threshold. **This diagnostic
does not waive that failure, change its tolerance or certify a repair.**

One paired source comparison uses the existing redirect seed7/maxT6 fixture,
patch hands and its center-hands opposing control, each mirrored. Accepted
`2c98bed94adad8087c65f381d4090444ad283985` and the combined candidate use the
same rosters and baseline44 flags with components1. Native requests, bodies,
support and events were captured through a passive PlaySim tick wrapper; no
source or test was edited. Full launcher receipts and compressed traces are
[here](../../data/reviews/current/redirect-numeric-2026-10-20/manifest.json).

The earliest patch mirror difference is at t=1.00: velocity8.33e-17 and support
xi5.55e-16. The accepted source has this same initial perturbation, but its
maximum post-shed request mismatch remains1.78e-15. Candidate mismatch grows to
7.12e-10. Its maximum mirrored physical position error is7.52e-11yd, closest-QB
separation error3.32e-11yd and facing error9.24e-11rad. Both mirrors retain35
post-shed requests with the same DE_S target and exact timestamps. Center
hands retains16 requests per mirror and maximum request mismatch8.17e-14.
No discrete targeting, engagement-lifetime or phase symmetry divergence was
identified. This is accumulated numerical amplification rather than a
football-sized loss of mirror behavior; the unchanged assertion is still red.

The first patch candidate-versus-accepted physical divergence occurs at1.80,
after the shed: DE_S approach changes symmetrically (accepted vx−4.701535422,
candidate−4.707886661). The current controller composition includes the
reviewed installed force shoulder on pursuit, so this is not evidence that
#185's run-only pull clearance changed pass protection. These traces alone do
not isolate which new component amplifies the later tiny perturbation.

The first8 executions finished but the collector could not write its raw output
to an absent out directory; the failed launch receipts/logs remain. The launcher
then created that directory. The same8 executions were repeated unchanged to
save evidence: final native cost0.6224s candidate and0.5983s accepted, plus
failed first-launch cost in the retained receipts. Zero games/shared suites.

Reproduce from either source checkout, using the diagnostic script at this
commit (its exact hash is in the manifest): create its ignored `out` directory,
then run the pinned Node with `scripts/baseline.mjs --candidate --flag
RUN_CONTACT_COMPONENTS=1 --receipt out/redirect-numeric/reproduce.json -- node
--import tsx /path/to/scripts/diag/integration/redirect-numeric.mjs "$PWD"
"$PWD/out/redirect-numeric.json"`. The root path is an explicit input; no
other agent's checkout or private artifact is required after fetching the code.

The next decision is a defensible numerical repair or exclusion of the
responsible scope. Neither an automatic tolerance relaxation nor another broad
scenario matrix follows from this diagnostic.
