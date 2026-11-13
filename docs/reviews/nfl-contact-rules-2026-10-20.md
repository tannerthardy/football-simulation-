# Achieved NFL contact and official rulings — integration review

2026-10-20. This candidate makes represented illegal actions affect the official
result while preserving the physical play for diagnosis. It substantially extends
rules support; it does **not** establish that every NFL action is simulated or
that an unflagged play is legal.

## Candidate and decision

- Accepted development parent: `2c98bed94adad8087c65f381d4090444ad283985`.
- Dependency: [PR #178](https://github.com/tannerthardy/football-simulation-/pull/178),
  publication `7d475e5efdc81257c2f19efbf468c59cb93e2834`. This work continues on
  `codex/nfl-contact-rules`; it includes that dependency, not an unrelated physics stack.
- First protected candidate: `054f5cb9cc8a34f371e37ce1a9d95c62779771ec`.
  Its verification found three assertion failures: two observational fingerprints
  were subsequently corrected while preserving their original baselines; the
  third exposed an attempted-pass statistics-credit defect requiring a source fix.
  An RPC timeout also produced an unhandled worker error. All 2,813 TypeScript
  assertions ran (2,810 passed); Python was skipped by fail-fast. This is not a
  passing receipt.
  [Preserved first failure](../../data/reviews/current/nfl-contact-rules/first-failure-receipt.json).
- Final protected candidate: `a5af57a2267b8ec5406b8c8cfd9ef40b0abc40c0`.
- **Final verification passed:** 2,821 TypeScript assertions/225 files, 145 Python
  checks, typecheck/build; 266.066 command seconds. No failures, skips, worker
  errors or input drift; Node22.23.3, all44 accepted settings, components1.
  [Exact final receipt](../../data/reviews/current/nfl-contact-rules/final-receipt.json),
  [raw final log](../../data/reviews/current/nfl-contact-rules/final.log). The
  first failures were resolved by preserving original physical hashes while
  excluding only added observation metadata, introducing sourced official credit,
  and yielding worker I/O even when a recording assertion fails.

Source SHA256: `bbdcbe3ae94282e832fa9eccb77521ce6ed7047f3ec1642cce4564bc43d753c9`; validation SHA256:
`9499640dfbd979ec619bf4f64217620b2d7c814b0c65e21d558724450b1fbaef`. Publication after the protected commit changes
only documentation/evidence; verify these fingerprints before reusing the receipt.

No merge or accepted-reference designation is made by this document. Integration
reviews the final exact candidate and its receipt under the existing queue policy.

## Authority and assessment boundary

The authority is the official [2026 NFL rulebook][book] and [linked PDF][pdf],
retrieved 2026-10-20. PDF SHA256:
`144cec5bffd2725bb703a26523f5ccf0b16c59c2fe5c13f6e671f4bddaa87c55`.
References below identify rule-section-article in that edition. The earlier
[native implementation review](native-nfl-rules-2026-10-20.md) describes PR #178;
its then-unimplemented branches are superseded only where specified here.
The [full-book index proposal](https://github.com/tannerthardy/football-simulation-/pull/173)
is an inventory, not proof that every indexed article has been implemented.

Achieved facts, legal assessment, official calls, enforcement options and official
results remain distinct. Native adjudication reads World delivery and actual
ball/action history independently of optional recording. It gives players no new
observations. `FoulRecord` retains decisive facts and unresolved assessments;
`ruleLimitations` exposes represented cases that cannot be resolved confidently.
Clear qualified violations are called deterministically. Referee vision, missed
calls, crew consultation and subjective referee variability remain deferred.

Official statistical credit follows the current [NFL GSIS Guide for
Statisticians][stats] (HTTP Last-Modified 2025-07-23; no edition inferred),
SHA256 `2b4807442498c4e134a8e6cbc994ee6e6ac08489648cd4adaf11b1eefb0f0124`.
Its penalty/attempt guidance distinguishes credited plays, third-down attempts
and nullified physical endings. `officialCredit` records the qualified view;
raw log stats and `nullified` remain available for diagnosis. Actual possession-
change snapshots prevent a later nullified giveaway from corrupting a retained
takeaway. The historical physics hashes keep their original expected values and
all original physical/RNG fields; only new observation fields are projected out.
Grounding, beyond-line illegal-pass prefixes, backward pitches, ordinary spot-run
prefixes and retained takeaways have sourced credit paths. Allocation of other
loss-of-down categories (including second/returned-behind passes) remains
explicitly qualified; an illegal extra pass attempt is never invented. A retained
acquisition checkpoint also cannot recover every legitimate missed tackle later
in that phase; that limitation is logged rather than crediting nullified future
counters.

Materiality is a declared officiating judgment, not a new physical law or an NFL
numeric threshold. Holding uses achieved opposing impulse and actual lost escape/
drive, including cumulative restriction during one continuous act. PI compares
physical catch opportunities with explicit margins. Dangerous-contact observers
require clear delivered impulse and qualified initiation/anatomy. Borderlines and
missing causal facts stay uncalled/unresolved; no foul-rate target is used.

## Implemented scope and its limits

| Area | Reachable behavior and official basis | Remaining boundary |
| --- | --- | --- |
| Holding | `contact-holding.ts`: actual cloth/grasp tension or lateral restriction, measurable denied movement/ground drive, possession-aware offensive/defensive calls; 12-1-2/3/5/6. Legal compression, warding, runner/loose-ball acts, performed fakes, loaded doubles, rip and feet-taking exceptions have controls. | Duration, capacity, cloth selection and tensile force alone cannot flag. Uncertain split/feet-taking/preventing-rise causality and distant point-of-attack effects remain unresolved. |
| Pass contact | `pass-interference.ts`: qualified body/hand/grip DPI, in-flight OPI, actual strike push-offs and retained prethrow active-hand blocks; 8-5. Frozen eligibility, actual forward release, first touch, acquired ball-task facts and catch opportunity constrain calls. Illegal-contact branches cover maintained/past-even, back/re-contact and beyond-five acts; 8-4. | Unknown attention/arm anatomy, ambiguous first-touch ordering, borderline restriction, remote vicinity and incompletely resolved initial-line continuity undercall. Incidental contact and equal ball rights are preserved. A possible completion does not excuse a clear restricting grab. |
| Dangerous contact | `contact-legality.ts`: clear native above-waist back blocks, deliberate achieved postrelease passer strikes, and avoidable strikes against already-grounded/out-of-bounds players. Qualified executed part/region/grip descriptors enable additional 12-1/12-2 safety predicates on actual loaded World sources. | Generic torso contact is not a helmet, mask, collar or low-leg receipt. Blocking/roughing/defenseless predicates support their stated exceptions but do not establish every action can arise from ordinary controllers. |
| Hip drop | 12-2-18 pure predicate and strict two-receipt adapter require upper wrap, achieved swivel/unweighting, a new lower-leg trapping constraint and a runner brought down by that finish. | The actual World wrap/swivel/dive/new loaded leg-restraint control leaves an upright runner unflagged. A native positive bring-down is **unproven**; do not claim complete native hip-drop coverage. |
| Teammate assistance | `team-contact-rules.ts`: achieved signed pulling of a runner, loaded interlocking assistance and prohibited teammate push support of actual blocking/grounded loose-ball recovery; 12-1-4. Real World fixtures exercise the observer. | Legal pushing of the actual runner survives. Ordinary controllers do not currently choose deliberate teammate grips; torso contact alone cannot prove deliberate pushing/throwing. This is a supported native action contract, not a measured ordinary-play occurrence. |
| Passing/handing legality | `pass-legality.ts`, `ball-rules.ts` and native PlaySim hooks: illegal forward-pass branches, grounding from current pressure and actual trajectory, snap eligibility/touching, ineligible advance and forward handing; 8-1/2/3/7. | Grounding pressure and receiver vicinity use explicit reduced judgments. Torso/ball extent is a reduced boundary convention, not full anatomy. Forced-out/re-establishment, interrupted motion and other unrepresented facts cannot be invented. |
| Fumbles and boundaries | Native recovery and exit callers retain fourth-down/late-half/Try recovery limits, forward/backward spots, possession transitions, represented exit/re-entry and qualified impetus/momentum; 3-20, 8-7, 11-5/6. | Missing decisive end-zone impetus/momentum stays unsupported. After-warning backward-pass OOB before a possession change has an objective rule branch; intent is not required by 8-7-2. Its downfield foul/basic-spot interpretation is noted below. |
| Before the snap | `presnap-rules.ts`: number/reporting and covered-player eligibility, represented formation/count/neutral-zone facts; pure contracts for false start, motion/shift, snap and substitutions; 4-6, 5-1/2, 7-4/5/6, 8-1. Dead-ball blockers and live offside differ. | Installed line/set facts are declared abstractions. Full helmet/belt/feet geometry, cadence, substitution process and snap mechanics are not simulated merely because their fact contracts exist. |
| Enforcement | `nfl-penalties.ts` and `penalty-enforcement.ts`: supported previous/foul/basic/succeeding spots, half-distance, AFD/LoD, same-team elections, double fouls, 15-versus-5, clean hands/post-change cases, dead-ball sequencing, score/carryover, paired PI/personal acts and Rule 11 Try choices; Rule 14. | A nominal penalty catalog is not a detector. Contradictory possession facts or decisive missing end-zone context cannot silently become a legal gain. Specialized free-kick awards belong to `kick-rules.ts`. |
| Clock and Game | Supported runoff, timeout/restart and untimed-down consequences; selected official possession/spot/down/score applied once, disqualification and qualifying conduct history, nullified-stat trimming and multi-possession fumble/turnover credit; Rules 4, 11, 12, 14. | Legal default elections stand in for a captain/referee interface. Existing overtime/game administration is not certified in full by these changes. |
| Kicks | `kick-rules.ts`, `specialteams.ts` and Game apply represented 2026 free/safety/declared-onside events, recovery/touching/landing/OOB choices, scrimmage-kick first-touch rights, fair-catch signals/interference, missed-FG and fair-catch-kick rulings; Rules 6, 9, 10, 11. | Returns/coverage remain reduced sampled outcomes. Typed event inputs are not native all-22 kick-contact simulation. Generated blocked-FG across-line/dead handling is an explicit abstraction; kicker/holder contact predicates cannot certify unseen contact. |

World additions expose actual delivered force vectors, first-applied substep
contact geometry and executed anatomical descriptors. They do not change forces,
capacities, recovery laws, solver defaults or player movement capabilities.
Legacy holding technique selection remains possible, but sampled visibility no
longer creates an official holding call; its historical draw consumption is
retained for compatibility. A technique event is not legal proof.

## Interpretation and remaining real rules

- Grounding safety requires the entire reduced body **and ball** in the end zone,
  8-2-1(c). This is not the rule for every illegal pass: second/returned-behind
  passes use the pass/release spot under 8-6 Note 1 and 14-4-5 Note 1. The
  grounding no-safety straddle placement uses an explicit reduced fieldmost-
  body/ball-extent convention; full articulated-body ruling remains absent.
- The after-warning backward-pass-OOB branch follows 8-7-2 and clock 4-7-1(d).
  Its downfield release/OOB enforcement uses the 14-4-6 three-and-one reading;
  no authoritative casebook example was located for that precise geometry.
- Deliberate ball batting/kicking has catalog/enforcement support, **not** a
  native intentional technique/detector. Other unrepresented striking, equipment,
  bench/non-player conduct and unfair-act remedies are not manufactured from
  proximity, event labels or generic contact.
- Full airborne catch/control/inbounds anatomy, every low/chop/clip exception,
  all passer/kicker landing/contact sequences and general preventing-rise proof
  are not certified. Explicit technique facts enable bounded rules; they do not
  replace the missing physical action or demonstrate ordinary frequency.
- Rules 1–2 equipment/venue specifications and Rules 13, 15, 17–19 administration
  retain stated abstractions or gaps: no complete equipment inspection, replay/
  challenge crew, emergency resumption, sideline-interference remedy or officials'
  sightline simulation. Rule 16 overtime needs its own editioned qualification.

## Evidence and integration use

Focused evidence includes actual World delivery through native assessment and
Game enforcement with legal opposing controls. It establishes the named contracts,
not realistic foul frequencies or complete ordinary-play realism. Controlled
event seams establish official consequences only for the supplied achieved facts.
No new game campaign, tracking-data query or roster sweep was needed.

The integration owner publishes the final combined receipt above, retaining the
first failures and documenting their resolutions. Reuse compatible focused
evidence; do not have each worker repeat shared verification. After adoption,
review legality alongside assignments and physical execution in ordinary saved
plays. An unresolved rules assessment must remain visible when evaluating a
purported football improvement.

[book]: https://operations.nfl.com/rules-officiating/2026-nfl-rulebook
[pdf]: https://static.www.nfl.com/image/upload/fl_attachment/league/tqivdkzt9mu6wdgsh1ku.pdf
[stats]: https://www.nflgsis.com/gsis/documentation/stadiumguides/guide_for_statisticians.pdf
