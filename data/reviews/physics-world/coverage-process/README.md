# Actual coverage keys and ownership: reviewed lab panel

Engine source: `0f1124fde702bfd754944b10bc2d35f2ebf4914c1a2fa864e701afb6683b47ad`.
This is an observational coverage process panel alongside the current physics
repair. It changes no coverage decisions, movement intents or capacities.
Read [the literature review](../../../../docs/reviews/coverage-literature-applications.md)
for the teaching-source provenance, five useful principles and known gaps.

## Cohort and result

Eight deliberately selected lab fixtures use generated offense/defense rosters
with seeds 21/22 and strength 0.6, fixed 12 physics substeps, a Cover 2
presentation and spill run policy. These are lab inputs, not measured NFL call
frequencies. Fixture seeds, formation, LOS, actual effective coverage and
initial eligible/defender inventory are included in `coverage-contracts.json`.

| Fixture | Effective coverage | Exact contract violations | Inspection points | State/key transitions |
|---|---|---:|---:|---:|
| zero-mesh | Cover 0 | 0 | 0 | 23 |
| one-mesh | Cover 1 | 0 | 0 | 18 |
| palms-stick | Palms | 0 | 1 | 63 |
| palms-verticals | Palms | 0 | 2 | 50 |
| poach-trips | Poach | 0 | 3 | 61 |
| red-zone-smash | Cover 2 Match | 0 | 0 | 48 |
| spill-outside-zone | Cover 3 | 0 | 0 | 0 |
| quarters-split-zone | Poach after formation check | 0 | 1 | 79 |
| **Total** | | **0** | **7** | **342** |

The narrow exact checks are marker existence for effective pure-man calls,
eligible man targets, zone destinations inside the end line, and a called
spill edge with same-side outside force support at the snap. Zero failures
does **not** certify realistic coverage, complete route influence or physics.
The two pure-man fixtures and red-zone destination check pass only these
implemented contracts.

The seven inspection points comprise two ended direct relationships, four
overlaps while another eligible has no direct relationship, and one nominal
force player retaining a route relationship. Wall/deep overlaps, brackets,
zones and intended pass-offs can explain them. Every entry explicitly remains
a descriptive inspection point, rather than a bust, missed communication or
causal diagnosis inferred from separation.

## What is retained

`coverage-contracts.json` keeps the initial inventory, actual initial defender
states and relationships, first invalid exact contract (all null), seven
inspection points with actual same-controller-tick state/key witnesses,
summary counts and short outcome context. Full 342-transition history stays
in ignored `out/literature/coverage-contracts-final.json`; its content hash and
size are retained. No full-history transition was omitted by the lab's cap.

Six inspection points coincide with a retained state/declaration transition.
The force warning at 1.05 s does not; LB_W's last branch/declaration change was
at 0.95 s. An ignored observational wrapper copied his exact 1.05 s state,
existing cached declarations and movement intent. The fixture result, events
and every retained transition match the unwrapped diagnostic byte-for-byte.
This avoids presenting a 0.95 s body snapshot as fresh at 1.05 s. The compact
report records that witness provenance; the ignored witness/helper hashes are
in the manifest. No new `read`, `see`, interpretation or RNG was performed.

At that exact boundary LB_W recognizes run, retains `man:H`, and has rule
`mike_3` with H as its cut target and an `under` declaration. His actual intent
is saved. The persistent job label does not prove that his movement technique
is still executing coverage: the same controller can switch to run fit while
retaining its target. Do not convert this warning into a confirmed busted fit.

## Timing, units and missing evidence

`t` and `readTick` are the 20 Hz controller boundary before the tick begins.
Positions and movement intent are copied after that tick's physics step; the
public `PlaySim.t` has then advanced by 0.05 s. Every retained inspection-point
witness belongs to its stated controller boundary. Positions are yards,
velocity/intents yards per second, and facing radians. Facing is body
orientation, not independently modeled eye direction. Declaration `since`
means when this defender believed it, not the receiver's true break time.

Consumed keys, current rule branch and judgment reason are actual state, but
their coexistence does not establish an unexposed causal trigger. No
communication/acknowledgment model, complete ownership graph, authentic NFL
call sheet, threshold fitting or independent human eye/hip data is supplied.
The standard/full replay schema does not retroactively contain this new live
getter's branch/declaration fields.

## Reproduce

Run from the repository root with Node 22:

```bash
node --import tsx scripts/diag/coverage-contracts.ts out/coverage-contracts.json
node --import tsx scripts/diag/coverage-contracts.ts out/split-zone-contracts.json quarters-split-zone
```

The script records a source-content SHA-256 and rejects engine changes during
the run. The final source pin above supersedes the initial getter-only smoke
run. The read-only getter's copied-snapshot/play/body/RNG contract passes in
`test/replay-telemetry.test.ts`; all six tests in that file and typecheck pass.
Whole-engine verification and physics readiness belong to the root agent's
physics handoff, not this small coverage panel.
