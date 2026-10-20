# Integration repair: acquired pull-wall relevance and honest slice evidence

Checked accepted `2c98bed94adad8087c65f381d4090444ad283985` against frozen
combined `075e2148a8c94c80ba90743a324e4670091998c0`. Three motion-contact
failures were not waived. The first changed request is at 0.05s, before a
different physical state: TE requests (-8.383,-1.581) rather than
(+0.128,-7.897) yd/s. Its acquired wall selected distant reference linemen at
x≈5–10 only because their installed lateral stations crossed the pull path.
The new #185 rear-clearance instruction then sent the puller back toward them.

An isolated accepted+#185 source (`ed3583af`) reproduces that request exactly
and misses the reachable penetrating end: closest distance .555→4.839yd, no
acquisition. This attributes the defect to #185's wall eligibility rather than
the new motor or contact strength. The original source comparison, all failed
traces and passing/failed command receipts remain in
[the saved packet](../../data/reviews/current/motion-contact-integration/summary.json).

## Narrow correction

`436e9e61` admits an acquired rear wall only when its observed longitudinal
sweep can overlap the current/installed flat crossing path. The extent includes
own current motion and both bodies' ordinary ground-acceleration reach over the
existing decision interval, plus their body radii. It preserves the prior
lateral passed/closing test and GH surface override. No arbitrary distance
bubble, hidden coordinate, timer, capacity or physical law is added. It is an
ordinary free-ground acquired-sweep bound; future external impulses remain
unknown. Four mirrored remote-rear/closing-rear controls oppose the repair;
existing nearby obstruction and GH controls remain.

Independent source review by `/root/run_contact_composition` accepts this
bounded correction: the acquired/current/installed inputs and full acceleration
uncertainty preserve real near obstructions without turning a remote lateral
station into a wall. This disposition does not certify all future traffic.

## Evidence contracts retained

The first repaired run passed 45/47 focused checks. Actual penetrating contact
and the native mirror were restored; the remaining two failures exposed these
separate evidence assumptions:

- The lab's `initial.plan` shallow-copied its mutable `pullPath`. Once the
  repaired puller followed its moving corner, the recorded "initial" path
  changed. `4ee751d5` snapshots the initial drive and path by value.
- In the stationary wide-surface witness, ordinary kick contact now happens at
  1.75s rather than 2.15s, before the end has personally appeared to cross the
  puller's inside shoulder. A log event is no longer a prerequisite for that
  legitimate earlier contact. The native both-side installation, actual
  acquisition, loaded hands and budget assertions remain. Explicit mirrored
  acquired-inside versus acquired-outside production-hook controls retain the
  original positive/negative log contract and its exact event wording, opposed
  by contradictory private target coordinates. They change no body or RNG and
  award no actual contact.

The final focused receipt at `4ee751d5ffd5af1d500a913bbb7d41ed1a0357e4` passes
**49/49** across motion-contact, acquired-corner, clearance-command,
kick-transition and GH tests. Native unreachable-speed negatives, mirrored
geometry, recording neutrality, force/work budgets and opposing near-wall
behavior remain. No tolerance was relaxed. Shared-suite verification belongs
to Integration after this correction is included.

New command cost is **8.851 seconds**, including all failed/passing attempts;
12 short native diagnostic executions and two focused test attempts. Zero
games, broad panels, NFL queries or shared-suite repetitions by this owner.
Reproducer:
`node --import tsx scripts/diag/motion-contact-integration.mjs <source-root> <output.json> [case-index]`,
through the baseline launcher with components enabled. All 44 settings remain
unchanged. This receipt is not the eventual combined-build acceptance.

Final independent source/test adjudication by
`/root/run_contact_composition` accepts exact
`4ee751d5ffd5af1d500a913bbb7d41ed1a0357e4` with runtime
`436e9e61bea24170addcf4ff748164de09fb9c19`: native acquisition/load and budgets
remain, the snapshot is honest, and the explicit mirrored acquired-cue controls
preserve both positive and opposing log behavior without awarding contact. The
reviewer inspected the full three-file diff, production gate and final receipt;
no additional runs were requested.
