# Current-development contact-law candidate

[Draft PR #66](https://github.com/tannerthardy/football-simulation-/pull/66).

**Ready for bounded review; hold default promotion for Run's helper-contract
adjudication.** This is a minimal extraction on approved develop `a1b16e6`,
not a merge of the historical physics stack. PR62 is parked at `1f071b9` on
its historical host; its native cost study is deferred because it cannot
decide that host's adoption.

Runtime `1332ddb`, source
`8e0226116bb611cb4ccaf446b6672caca208a34b441b7336b59c0c0ef6e755b3`;
portable diagnostic `5b2f9e8`. Develop source is
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
The [receipt](../../data/reviews/current/current-contact-law.json) pins settings,
source/input hashes, failures and costs. Historical `4ded6b6` is unchanged.

## What would change in football

Accepted center contact omits the turning reaction of lateral hands. The saved
free RT/DE_S witness changes total angular momentum by 15.153603 despite no
modeled external torque. The coherent common-point treatment already exists
experimentally on develop; it also selects different ground movement.

Extract PR17's independent ground selector: use
`handContact:'patch', groundMovement:'legacy'` in World or PlaySim. Preserve the
whole common-point force frame, rotational velocity/effective mass, body torque,
centered travel/work, torso ordering and grasp Jacobians. One existing climb
preview follows the resolved movement model; collection/release policy is
unchanged. No-contact turning, reversing and falling retain exact body/reports
in both reflections. Omitted options retain existing center/legacy and
patch/response selection. Production still uses center.

The selected patch material path also needs PR49's ownership guard. Reproduced
before correction: an unrelated island moves the held point by
.000071075931 yard while its body and grip work remain unchanged. The guard
limits transport to the held body's interval. It is intrinsic to this patch
path, needs no additional flag, preserves correctly owned contact exactly,
and does not execute under accepted center contact.

Runtime changes are 20 inserted/7 removed lines across three files. All other
physics, capacities, recovery, accepted run/catch controller policies and the 44 flags
(including components=1) remain unchanged. No grip solver, turn choice, active
hands or baseline promotion is imported.

## Evidence and remaining contracts

182 focused physics/grip checks pass; typecheck and build pass. The original
keeper's native replay error is 8.44e-15; free common-point angular error is
at most 3.64e-12; loaded work residual is -2.82e-13. Shared arm/support budgets,
mixed torso/hand forces, correctly owned grips and no-contact controls pass.

The unchanged affected football contracts pass **52/52 under current center**
and **45/52 under isolated contact**. All expectations are retained. This is
a different host/current-controller comparison from the historical 43/52;
do not describe the count difference as two repaired solver failures.

| Current failures | Classification / owner |
| --- | --- |
| Legacy run/pass state+load+RNG hashes (2) | Center histories still match exactly. Their reuse under a different law is an explicit compatibility question for Integration, not proof of a law defect. Keep both original expectations. |
| Reconfirm owner after helper recovers (1) | Unadjudicated supported-check behavior; Run must inspect current owner/arrival evidence. |
| Recollect lost loaded contact, both sides (2) | Unadjudicated collection/execution contract; Run owns request/feasibility diagnosis, Physics owns any demonstrated response defect. |
| Native Under supported RT check/climb (1) | No expected transition by the inspection deadline; Run must distinguish an unearned opportunity from a missed feasible climb. |
| Native Tite keeper loading/climb (1) | Zero compression with retained lateral contact; detailed first-divergence evidence below. Run must adjudicate useful protection, not require compression or a climb by decree. |

Helper-fit and scenario physical contracts pass in both modes. In particular,
the Bear genuine-double control remains valid. None of these fixtures invokes
the excluded timing solvers. Do not re-pin assertions, increase strength or
suppress correct torque to recover an old ending.

## One targeted current Tite diagnosis

Use the existing O31/D32, strength .55, seed3, gun-wing12 split-zone/Tite input.
Both observed runs match their unobserved complete state/RNG fingerprints.
The first changed World interval is **.35–.40 s**, C/NT hands, with identical
pre-step bodies, requests and joint inputs; zero torso contacts or strikes.
Commands first change at .40 s. The delivered-hand-plus-ground yaw ledger
closes within 3.56e-15. This establishes a contact response before a controller
choice change; it does not certify the later football ending.

At 1.35 s, Y is upright and faces the defender within .08642 rad. His hands
remain active: compression is zero, lateral load -196.515872. All 12 physical
rows in the preceding tick have inactive normal constraints and zero normal
impulse, while lateral work remains dissipative. This is not a lost joint or
missing work entry. Center earns a helper climb at 1.25; isolated contact
does not earn it during this window. Both observations stop **live at 2 s**;
neither is a completed play or an outcome-quality verdict.

The [15 KB C/NT reproduction](../../config/current-contact-first-interval.json)
exactly reproduces both full-World pose/velocity/spin endpoints as a graph-closed two-body step.
Native12 versus48 refinement differs by .0001161 yd, .004727 yd/s,
.126699 rad/s and .003372 rad facing. Further192/768 controls retain the law
effect; 192→768 differences are .00001058 yd, .0003434 yd/s, .021776 rad/s and
.0002016 rad facing. Keep that angular sensitivity visible: this is bounded
local refinement, not a converged independent accuracy certificate or a
whole-play convergence claim. The packet's saved endpoints establish
reproduction, not physical ground truth.

## Integration decision

**Primary prerequisite: Run adjudicates the four helper situations (five
assertions) using current feasible requests and actual protected approach.**
Physics supplies the packet/force ledger and retains the one bounded C/NT
within-step yaw question alongside that integration target. A valid defender
win may remain; an explained contact row is not sufficient to declare it valid.
Integration owns compatibility expectations and one exact combined verification
after that decision. No full suite, game campaign or second data pipeline here.

Reproduce the saved interval without new plays:

```sh
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/current-contact-contract.ts --replay
```

The full current Tite observer uses the same command without `--replay`.
The affected-law screen is
`npx vitest run --config scripts/diag/contact-law-current-vitest.config.ts --maxWorkers=1`.
The receipt lists the mechanical/default controls and launcher costs. These are
verification costs, not a production runtime benchmark.

All staged launchers, including trace development and repeated type checks,
sum to **77.949 s**; concurrent checks overlap, so this is not session wall
time. The final Tite collector takes 1.416 s internally /1.974 s with launcher;
the portable replay takes .024 s internally /.449 s with launcher. No runtime
performance claim or new integration budget is inferred from these checks.
