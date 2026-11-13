# Sustained hand force and position integration

The [new strike/slice review](strike-force-and-slice-validation.md) supersedes
the historical slice lab's no-load interpretation: formation strength was
inconsistent and delivered strikes were omitted from its contact predicate.
The numerical hand-force evidence below retains its original source and scope.

## Status and recommendation

The live default uses centered travel for the **achieved finite-force hand
impulse**. The explicit `handIntegration: 'end'` option retains historical
comparisons. This is a
small numerical repair to the shared blocking, jam and steering path; it does
not add body parts, technique bonuses, physics steps or force constants.

The retained seed-7 redirect supports this change, and the nine-fixture panel
improves overall while preserving its native-resolution fall and corner
outcomes. Ordinary football transfer, the small game guard, offline films and
the clean complete suite pass the publication gates described below. The
physics has not earned the owner's final OK.

The mechanical evidence below is pinned to engine source
`bf3da801c3f8ad3b9729d6e808665bb6f67f9e59c0dbdb0262316267307cf631`.
See the [evidence and generation commands](../../../data/reviews/physics-world/hand-force/README.md)
and [retained mechanical comparison](../../../data/reviews/physics-world/hand-force/comparison.json).

## What was actually wrong

The live position integrator already centers ground acceleration, but carried
the **end velocity after the entire newly applied hand impulse** through the
whole physics interval. A hand push or steer is capped as a force times the
interval duration; it develops across that interval rather than arriving as an
instantaneous impact at its beginning. End-velocity travel adds an extra half
impulse of displacement on every substep.

The retained redirect starts with identical controller inputs. In its first
50 ms tick, both resolutions transmit the same saturated mean normal and
tangent hand force to about `1e-11`. Nevertheless, the 12-versus-192-step
position error reaches 0.000870 yd for the tackle and 0.001022 yd for the
rusher. The predicted excess from the actual achieved hand impulses explains
its magnitude and direction. There is no first-tick coverage/read/RNG choice
or fall to explain that discrepancy.

Those small changes feed actual blocking geometry, felt loads, movement and
subsequent controller choices. First torso contact occurs at 1.42083 versus
1.41068 seconds. The normal hand force leaves saturation at 2.50 versus
2.33646 seconds; the refined run later enters the hand slack region while the
native run does not. Both bodies stay up throughout. These later transitions
follow the early trajectory drift.

The correction uses each solved row's **net achieved** normal and tangent
impulse, including capacity/work-limited solver updates. It adds the
equal-and-opposite half-impulse velocity adjustment to each body's existing
travel correction before position integration. It neither centers every
iteration separately nor overwrites the passive stopping correction.

Instantaneous torso collision impulses and the grasp/reel paths retain their
existing treatment. The work ledger still accounts for every actual velocity
change. Changing position quadrature does not prove that all material/3D work
or every contact onset is resolved accurately.

## Mechanical and controller evidence

The refined run is a numerical reference, **not an NFL target**. Technique
decisions still run at 20 Hz in every run. The diagnostic copies actual plans,
intents, forces, rows, support and controller state; it does not infer contact
from rendered circles. Substep observation matches its tick-only control's
result and every recorded body/support, engagement, hand, intent, RNG and
budget state exactly.

For the retained seed 7, rusher-power 1.4 interaction:

| Physics subdivisions | End-velocity closest distance | Centered closest distance |
| --- | ---: | ---: |
| 12 | 4.35328 yd | 3.68855 yd |
| 24 | 3.85267 yd | 3.58298 yd |
| 48 | 3.64138 yd | 3.54634 yd |
| 96 | 3.57253 yd | 3.51634 yd |
| 192 | 3.53124 yd | 3.50687 yd |

The native-to-reference closest-distance error falls from **0.82204 to
0.18168 yd**, about 78%. The first-tick position error falls to approximately
0.00003 yd. Neither mode introduces a fall or an around-the-corner result.
This is an improvement, not trajectory identity or a blanket second-order
convergence claim.

Freezing each mode's own native hand coefficients and intents across
resolutions leaves 0.42782 yd of closest-distance error under the old law and
0.12912 yd under the centered law. This separates meaningful physical
integration error from some later controller amplification. Those two frozen
tests use different native command lists; their difference is not a causal
allocation of the full 0.822 yd error. A separately retained shared-input
comparison uses the same old-native command list in both modes.

With that exact shared old-native 50-tick command list, native-to-reference
closest-distance error falls from **0.42782 to 0.06055 yd**, about 86%.
This intervention isolates an important integration contribution, while its
frozen commands intentionally bypass later football-controller responses.
Both modes still use their actual body capabilities, force limits, support,
contacts and work accounting. It does not establish how all different
controllers will react in a game.

## Broader refinement panel and limits

The panel uses roster seeds 3, 7 and 11, rusher power 0.7, 1 and 1.4, and
6/12/24/48/96/192 subdivisions. At the live native resolution of 12:

| Measure against that mode's 192-step reference | End velocity | Centered |
| --- | ---: | ---: |
| Mean closest-distance error | 0.20947 yd | 0.06167 yd |
| Maximum closest-distance error | 0.82204 yd | 0.18168 yd |
| Maximum carried-past error | 0.20912 yd | 0.14018 yd |
| Fall disagreements | 0/9 | 0/9 |
| Corner disagreements | 0/9 | 0/9 |
| Maximum reported torso overlap | 0.003151 yd | 0.001701 yd |

All states remain finite. The native panel momentum residual stays below
`7e-13 kg·yd/s`. All 12 separately retained frontal tackle checks are
bit-identical between modes. The centered law also removes the old 6-step
fall disagreement, but 6 is not the production resolution.

The improvement is not uniform: closest-distance error rises in five of the
nine rows. Most rises are small; seed 3/power 1.4 rises from 0.06189 to
0.09705 yd. Carried-past error for seed 3/power 1 rises from 0.02438 to
0.10057 yd, and power 1.4 from 0.03436 to 0.10087 yd. Keep these rows rather
than selecting only the favorable fixture.

The nine rows are not nine independent football interactions. In particular,
seed 7/power 1 and power 1.4 have identical physical trajectories because the
relevant existing capabilities saturate. Multiple reused seeds, mirrors and
refinements must not be reported as independent NFL evidence.

Contact guards deserve continued monitoring: centered finite-force travel
can alter the separation predicted by an earlier contact solve. The retained
fixture has only sub-milliyard overlap, and the panel's native maximum
decreases, but that does not establish continuous nonpenetration for arbitrary
interactions. No hidden contact parameters were fitted to obtain this result.

## Reproduction and retained evidence

`scripts/diag/hand-divergence.ts` records the retained interaction with explicit
`--hand-integration=end|centered` selection before each World's first step.
`--freeze-controller` freezes that mode's own native commands;
`--controller-input=<recorded-12-step.json.gz>` instead shares a specified
command list. Full raw diagnostics belong in ignored `out/`. Compact retained
evidence keeps all controller ticks, the complete first physics tick, common
native-resolution boundaries and local regime transitions. The original
full-file hash, excerpting-script hash and selection rule accompany every
compact trace. Use `--compact-only` against an existing diagnostic output
directory to reproduce those excerpts without resimulation. Eight traces and
the two broader panels together occupy about 5.9 MB.

For the broader existing script, use `scripts/diag/disable-centered-hands.ts`
or `scripts/diag/enable-centered-hands.ts` as an explicit preload. That older
script's raw schema does not record the mode, so retain the invocation and
preload checksum beside each report. A source checksum alone does not select
a mode. Review comparisons and handoff guides identify the frozen engine
versions and distinguish diagnostic experiments from current defaults.

## Football transfer and publication checks

With one final source and current controllers, 144 actual 11v11 run inputs per
mode retain the same rosters, concepts, fronts and reused seeds. Mean
pre-penalty gain changes from 1.797 to 1.930 yd, 10-yard gains remain four,
and stuffs increase from 29 to 33. Both modes have zero physical timeouts or
lower-attachment-bound releases. This is a transfer guard, not evidence of
correct NFL rushing rates. The larger stuff count remains visible rather than
being removed through strength or traction fitting. All 64 ordinary tackle
encounter signatures remain identical to the parent's production panel.

The final four-game guard uses two fixed game seeds per mode and one roster
pair; warm games are excluded. All games finish with zero physical timeouts
and lower-bound releases, zero support motor-work excess, momentum residual
below `1.1e-11` and work residual below `5.8e-11`. The subsequent calls, draws,
fatigue and game histories diverge, so game differences do not isolate the
integration change. Recorded timings are not a cost benchmark. Passing/YAC,
penalties and run efficiency still expose football-controller debt; these
games do not certify league realism.

The clean complete suite passes **599 tests in 59 files**; typecheck, build
and **22 Python data tests** also pass. An earlier concurrent full-suite run
passed all its 593 collected assertions but exited nonzero with a Vitest worker
RPC timeout; its log is retained beside the clean rerun, with no tests disabled.
New film libraries pass offline browser, recording-neutrality and export
integrity checks. Source/mode/tool pins and actual invocations are retained in
the [verification manifest](../../../data/reviews/physics-world/hand-force/verification-manifest.json).

## Next

Judge whether movement/contact is coherent before interpreting yards,
touchdowns or league aggregates. The owner's run-block paths and sideline
decisions are separate football-controller questions; neither can be diagnosed
by matching NFL yards alone. The diagnosed accidental Counter boundary exit
and lost combination ownership now have their own narrow repairs and isolated
recordings, separate from this physical integration change.

Start with `MC-S7-wideSurface-R-V0-P12` in the
[corrected moving slice-block film](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/motion-contact.zip). The
historical clip shed before maintained hand/body load but did transmit a real
defender strike; its inconsistent installation is repaired in v2. Separate
approach, fit angle, achieved force channels and actual sustain; do not count
an engagement label as an established block. The
[OL assignment audit](ol-path-audit.md) also retains a wide-zone cutoff
overrun with a stale perceived shoulder. Improve these requests within the
shared capabilities before increasing force or agility. The
[long-yardage film](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/long-yardage-runs.zip) provides ordinary
11v11 run fits against actual three-rush/eight-cover jobs and a four-rusher
control; its dropped edge and stock safety depth do not constitute a full
prevent install.

After this integration repair, localize the retained small per-fixture
regressions and other long-duration interactions as they appear. Add motion,
unequal-number and difficult-block fixtures to expose new failures, while
keeping normal football controls. Expand the physical model only when one of
those retained interactions identifies a missing capability that the shared
reduced model cannot represent.
