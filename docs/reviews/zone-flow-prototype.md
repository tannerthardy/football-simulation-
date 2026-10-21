# Zone flow: common hand-patch prototype

Updated 2026-10-12; initially investigated from `dc4bea6` on 2026-10-11.
This is an **experimental candidate**;
the production contact default remains center-based hands. The small
[receipt](../../data/reviews/current/zone-flow-prototype.json) records source
hashes, paired measurements, and passing versus failed checks.

The later [angular-contact repair](angular-contact-repair.md) adds coherent
mixed torso/hand timing, persistent torso force points and actual force/moment
outputs. Its source-pinned laws pass; the five football promotion failures remain.

## Contact-law follow-up: corrected geometry, promotion still blocked

The [new contact receipt](../../data/reviews/current/contact-coupling.json)
records the current continuation. The older movement/game tables below retain
their original source pins; they are not results of the new patch.

Two actual physical defects are repaired **only in patch mode**:

- The hand frame used full post-ground velocity to estimate its midpoint,
  although achieved travel uses the mean velocity of finite ground, strike and
  reel forces. It now uses that same mean travel. A mirrored independent ground
  impulse/mean-travel oracle fails before the repair and passes afterward.
- During overlap or swept contact, torso surface radii described two different
  contact points. After travel, even the frozen normal can be oblique to the
  centers, so normal impulses also need moments. Patch torso impulses now use
  one radius-weighted point, its normal and tangent moments, rotational effective
  mass and work. Relaxation refreshes these arms after actual position travel.
  Six existing mirrored overlap/sweep controls now close full-step angular
  momentum to 7.11e-15 kg·yd²/s with no ground reaction. Fixed-position torso
  impulse debt in prolonged jams is at most 1.14e-13.

The isolated hand oracle still passes all 144 cases. This contact repair does
not alter capacities, profiles, controllers or global resolution; the separate
pursuit-controller repairs are recorded in the pursuit review. Center remains the
production default and retains its known angular defect. This is a reduced
common point, not anatomical limb or measured NFL hand geometry.

One failed mirror control was a **lab installation error**. Its synthetic left
RT body was reflected but its free-protection home stayed on the right. The
same named OL slot does not swap under a formation flip. The redirect lab now
reflects that installed home and records existing post-shed targets/requests.
Extended six-second controls expose the post-shed phase under both center and
patch hands; targets, requests and results mirror at the original tolerance.
This does not alter production protection assignments.

Current unchanged promotion assertions: **43/50 pass**. Five football controls
still fail: wrong-side helper contact, recovered keeper confirmation, native
Under check/climb, Tite unfinished work and Bear release. Two additional frozen
legacy hashes differ, as expected for changed physics; they remain preserved
historical assertions. We did not relax any assertion or make the prototype
the default. The current prototype has not repeated the old eight-game trial.

After integrating the concurrent moving-catch controller at source `929fbda8`,
the same promotion run remains 43/50 with those same failures, and the hand
oracle still passes 144 cases. World is unchanged by that integration. Its
new default-center game checks do not promote experimental patch physics.

Conservation does not establish convergence. Against the same 96-step reference,
heavy-jam trajectory error improves from 0.1014 to 0.0637 yd at 12 steps but
worsens from 0.0719 to 0.0894 yd at 48. Base 12-step error also grows slightly.
Strong-jam falls still disagree at 6 versus 48 steps in both mirrors. These
are comparison resolutions, not ground truth. All 120 shared-capability reps
are finite and mirrored; that is narrower than football readiness.

A bounded passive tangential damping trial was rejected. It reused the existing
normal-hand rate and unchanged budgets, restored one keeper control, but broke
another helper control; the same 43/50 assertions passed. Duplicate rows also
acted as parallel dampers. It remains ignored research, with no tracked policy
or constant change. Do not stack more damping constants to rescue outcomes.

The next promotion milestone is the first wrong request or support/contact
response in the helper and recovered-keeper controls. Preserve the corrected
point laws and ordinary/mirrored controls while diagnosing those transitions.
Additional shoulder anatomy, stronger hands and global resolution are not
supported fixes.

### Separate run-blocking branch: retain the ideas, repair load coupling first

We reviewed `claude/run-blocking` at `88bfc45` without merging it. Lower-pad
leverage, a separate contact-posture ability and anchoring against felt load are
worth pursuing. The small bull-rush outcome panel does not yet establish a
coherent shared normal-load model. Three source-pinned executable witnesses in
the new contact receipt disprove that claim:

1. A distant idle body changes the active pair's inferred load by a factor of
   twelve. Per-body vertical impulses are divided by a global last-step duration
   overwritten when the unrelated body is advanced. Interval ownership must be
   local to the body/contact state.
2. Feet use inferred contact load, but turning uses nominal weight. On the
   unloaded player, combined translation/yaw demand is 1.980 times the actual
   traction allowance. Both channels must spend one achieved support budget.
3. Two individually bounded low contacts unload a defender by 1.386 times his
   weight. A per-pair 80% cap is not a shared body cap; later clipping hides the
   support loss. Allocate aggregate normal reactions and state what happens
   when support is unavailable.

The appended vertical component also needs an explicit declaration of whether
arm capacity is planar or resultant force. No vertical movement/work is solved,
so a zero planar residual cannot prove lift work. Those are model-scope gaps,
not a proved violation of a currently promised three-dimensional force budget.
No extra anatomical foot solver is needed to repair interval ownership or a
shared load budget.

Evaluate the anchoring controller separately with fixed capabilities. Its
current trigger can also fire when useful lateral zone flow carries a blocker
with the load; include that adverse control, glancing contact, helpers and
mirrors. Then test the contact-posture profile hypothesis independently. A
successful technique remains available; its physical limits, costs and opponent
responses must explain its failures. Do not import the package or re-freeze
historical controls merely to make the bull-rush panel pass.

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
Grasps, strikes and support capacities retain their policies. The later patch-only
torso law correction is described above.

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

## Original promotion trial (historical)

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

# Unchanged promotion witnesses under patch hands (7 assertions currently fail).
node node_modules/vitest/vitest.mjs run --config scripts/diag/common-patch-vitest.config.ts --maxWorkers=1

# Optional new native-game measurement (the original trial failed the YBC guard).
node --import tsx scripts/mechanics/sim-export.ts --common-patch --out out/zone-flow/patch-plays.jsonl.gz --review-out out/zone-flow/patch-outcomes.json
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
