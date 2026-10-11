# Zone flow: common hand-patch prototype

Investigated from `dc4bea6` on 2026-10-11. This is an **experimental candidate**;
production movement and center-based hands remain unchanged. The small
[receipt](../../data/reviews/current/zone-flow-prototype.json) records source
hashes, paired measurements, and passing versus failed checks.

## What was implemented

`World({ handContact: 'patch' })` uses one effective hand patch between the
players, partitioning the center separation by their torso radii. Tangential
contact uses the velocity of that patch, rotational effective mass, equal and
opposite linear impulse, and the corresponding body moments. Its work limiter
includes rotational kinetic energy. Achieved yaw and translation use the same
centered interval. No strength, mass, traction, rating or controller constant
changes. Anatomical hands and feet are not added.

The patch is a reduced geometry assumption, not an empirically measured NFL
contact location. Production still defaults to `handContact: 'center'`.
`PlaySim` and `GameOptions` accept the explicit experimental option. The patch
rejects historical `handIntegration: 'end'`: it requires centered force travel.
Grasps, strikes, torso-contact laws, and support capacities retain their policies.

The independent angular audit now accepts `--common-patch`. Default mode still
reproduces the production defect. New tests check spin-to-translation transfer,
opposed spins with matched patch velocities, mixed sliding/closing, unequal
radii, coordinate changes, and two simultaneous patches on one body. They
include actual force/work budgets and no-ground isolation. Existing assertions
were preserved, including the historic frozen-body witnesses.

## Why the controller changes were rejected

Two early-footwork candidates were tried with identical rosters, calls and seeds:

- Starting the existing shoulder approach immediately closed into contact earlier
  and reduced early lateral movement. At 0.5 s, OZ OL median displacement fell
  from 0.149 to 0.053 yd, WZ from 0.155 to 0.090 yd.
- A lateral-first approach to an acquired shoulder also failed to sustain the
  desired motion. At 2 s, OZ/WZ OL medians fell from 0.779/0.736 to 0.568/0.672 yd;
  nine zone-acquisition assertions failed.

Both were backed out under the two-attempt stopping rule. No first-step timer,
phase-drive, defensive fit or QB/RB mesh change remains in this implementation.

The contact prototype addresses the separate, independently demonstrated law
failure. It is not promoted as a replacement explanation for every flow deficit.

## Paired movement results

`scripts/diag/zone-flow.ts` runs two roster pairs (31/32, 41/42), Over/Under,
both formation flips, play seed 3, and OZ/WZ/IZ/Power/Counter. Each input is
executed under center and patch hands: 80 runs total. Initial state/profile hashes
must match, and each mode has an uninstrumented observer-neutrality witness.
Native ends are respected. The collector writes a small summary and compressed
per-tick request, ground impulse, internal acceleration, phase, facing and spin
traces. No extra perceptions, decisions or random draws occur in the observer.

Median OL called-play-side displacement at 2 s, yd (40 OL observations per row):

| Concept | Production center | Experimental patch |
| --- | ---: | ---: |
| Outside zone | 0.779 | 0.830 |
| Wide zone | 0.736 | 1.057 |
| Inside zone | 0.914 | 0.864 |
| Power | -0.464 | -0.432 |
| Counter | -1.068 | -1.156 |

All inputs reached 2 s. This designed sample is not a native-game frequency
estimate; the controls show that a shared contact-law change affects other run
concepts too. DL medians decrease on both stretch-zone concepts; RB travel is
unchanged there. The candidate does not resolve the line-wide stretch or mesh
problem, and these medians did not select physical constants.

## Promotion is blocked by observed regressions

The common-patch isolated audit passes all 144 cases, including 72 tangential
cases that fail under production center hands. Maximum tangential angular defect
is below `1e-8`; linear momentum, independent normal force/travel, energy,
rotation/translation/mirror controls and shared budgets also pass.

That does not establish good closed-loop football. A full production-default
trial of the candidate failed eight assertions in four existing test files.
The final opt-in candidate was rerun against those unchanged fixtures using a
test-only setup that selects patch hands before a centered World step: the same
eight assertions still fail (42 pass). Two are old exact-source hand-fight
equivalence checks; six are native helper/check/climb or mirror controls. Default
center behavior passes these assertions.

An eight-game candidate mechanism check (seed 101, games 101–108) also fails the
guard for `run.yards_before_contact`: 11/12 guarded mechanisms remain matched,
versus 12/12 for the pre-change production baseline. Changed games diverge in
later calls and RNG consumption; this is a system guard, not paired-play causal
evidence or an NFL tuning target.

The candidate remains opt-in. The next required diagnosis is the first
divergence in the mirrored redirect and the helper's usable contact/supported
keeper continuity, including requested yaw, achieved hand moments, ground yaw,
and the acquired picture. Do not adjust strength, traction, timers or assertions
to recover old outcomes. Resolving those witnesses precedes promotion and
richer loaded shoulder control. The independent runner-track/mesh and free
interior moving-gap investigations remain outstanding.

## Reproduce

Use Node 22 from the repository root:

```sh
# Paired inputs and compressed local traces.
node --import tsx scripts/diag/zone-flow.ts out/zone-flow/summary.json

# Production defect: command intentionally exits nonzero.
node --import tsx scripts/diag/hand-angular-law.ts out/zone-flow/center-law.json --assert-law

# Experimental isolated-law acceptance: passes.
node --import tsx scripts/diag/hand-angular-law.ts out/zone-flow/patch-law.json --common-patch --assert-law
npm test -- test/hand-angular-transfer.test.ts

# Candidate native-game measurement and guard (currently fails YBC guard).
node --import tsx scripts/mechanics/sim-export.ts --common-patch --out out/zone-flow/patch-plays.jsonl.gz
python3 -I scripts/mechanics/measure.py out/zone-flow/patch-plays.jsonl.gz out/zone-flow/patch-mechanics.json
python3 -I scripts/mechanics/compare.py --sim out/zone-flow/patch-mechanics.json --out out/zone-flow/patch-report.md --guard data/reviews/mechanics/guard.json

# Default behavior and explicit experimental unit contracts.
npm run test:all
npm run test:data
npm run typecheck
npm run build
```

Large traces, game recordings and runner logs are local under ignored
`out/zone-development/`; the receipt stores hashes instead of committing them.
