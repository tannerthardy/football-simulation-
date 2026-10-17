# Independent adjudication of #126's zone-reach assertion

**Decision: the old exact-command expectation is legitimately superseded by
the reviewed two-half combination installation. I found no unintended runtime
scope in this failure. Approve a narrow behavioral test correction on #126;
do not change production code to restore the old command.** Integration's HOLD
can proceed to its normal candidate verification after the reviewed assertion
correction. This adjudication does not represent a full-suite pass.

## Sources inspected

- Integration's HOLD and exact observed commands:
  https://github.com/tannerthardy/football-simulation-/pull/126#issuecomment-6229743498
- Accepted base: `70b4db6a3ef53acc1a0e90cd055f1087205daa30`.
- Reviewed #126 publication: `b3de4f5429ff36f31d15d76c55d065abbc749cf5`.
- `test/zone-reach.test.ts` is unchanged between those pins; its Git blob is
  `02a22dee67deecf9b0f1ba2f6402b72aa8e01d82`.
- The production diff is the previously reviewed `RunBlocker.combinationFit`
  installation, its near-contact aim, and its initial `sim.engage` surface.
- The preserved independent review already explicitly approves using the same
  installed half for both original covered and uncovered members, including
  the covered member's changed precontact aim. It does not promise old
  generic-reach commands for unreleased stretch combinations.

## What this fixture actually tests

The assertion named `preserves the shared surface of a live planned double`
constructs a **planned but unjoined** C/LG combination. C is at x40 and the DT
at x42. No engagement or physical hand joint is acquired by this update. There
is therefore no acquired contact surface to rotate or preserve in this fixture.
It tests the precontact approach, despite its current name.

The known installed formation puts C below LG in y. C consequently owns the
negative-y half of this pair. Its old `ordinary(f,false)` expectation instead
uses the generic reach target `seen.y + stretch.y*.6`, which is positive-y for
this fixture. That exact old request was compatible with the earlier narrow
solo-zone patch's exclusion of combinations; it is not a permanent guarantee
that an active stretch double must use a solo reach's shoulder.

#126 deliberately replaces that near-contact target with C's installed
neighboring half. The resulting request changes from approximately
`(7.257718,+2.036133)` to `(7.087447,-2.566790)` yd/s. This is the intended
contract change already reviewed before implementation, not evidence of lost
drive, release, a physics defect, or a change caused by #128. The positive-y
displacement intention remains installed in `plan.drive`; it need not be the
direction of both members' neighboring strike halves.

## Smallest supported replacement

Keep the existing fixture and its exact-command assertion, but derive the
expected request from its **declared C half** and the existing public movement
law, rather than from `ordinary(f,false)`. Rename the assertion to describe an
unjoined double, for example:

`uses its installed half without applying a solo-zone read or releasing a planned double`

The contractual expectation for this particular fixture is the negative-y
half-man landmark `(seen.x-.35, seen.y-.55)`, with the unchanged placement
error, field clamp, `runThrough`, and posture. A minimal sketch is:

```ts
const seen = f.sim.see(f.blocker, f.defender);
const installedHalf = Math.sign(f.sim.offAlign.spots.C.pos.y
  - f.sim.offAlign.spots.LG.pos.y);
expect(installedHalf).toBe(-1); // Explicit meaning of this saved fixture.
const aim = { x: seen.pos.x - .35, y: seen.pos.y - .55 };
const error = f.blocker.mind.placementError
  * (1 - .5 * f.blocker.r('runBlock'));
const expected = { ...runThrough(f.blocker, {
  x: aim.x, y: clamp(aim.y + error, .5, FIELD_WIDTH - .5),
}), posture: .7 };
// Capture bodies/joints before the production update.
const command = f.behavior.update(f.blocker, f.sim) as Intent;
expect(command).toEqual(expected);
expect(command.vel.y).toBeLessThan(0);
```

This is an exact behavioral target with an explicit side, not a relaxed
tolerance or an automatically recorded new command. Do not call the candidate's
private `combinationFit` to compute the expectation. Keep the existing checks
that the solo-zone read is absent, the same combination remains installed,
`released` remains false, and `plan.drive` remains the original stretch vector.
Also preserve the assigned down target and confirm this request-only update
does not move bodies, add a joint or acquire an engagement at the fixture's
two-yard separation. The helper's combination/drive remain installed too.

## Contracts that must remain protected

- Keep adjacent ordinary inside-zone/toss/cutoff and foreign-physical-hand
  assertions unchanged. This adjudication does not expand #126 beyond active
  outside/wide-zone combinations on their installed down target.
- Retain `test/zone-combo-surface.test.ts`'s existing mirrored first-arrival
  checks and the explicit custom-acquired-frame checks. They establish that
  whichever member contacts first supplies its assigned half, and joining an
  existing rep preserves the exact acquired surface object, seal target,
  hands, drive and bodies. This unjoined fixture cannot substitute for those
  acquired-contact controls.
- Retain existing helper far-side recovery, useful loaded-helper, pass,
  keeper-transfer, movement/work and capacity controls. No force, strength,
  release timing, old ending or compression requirement is authorized here.

The test repair establishes controller intent and preserves neighboring
contracts. It does not certify that this isolated request achieves useful
protection or that weak wide zone is solved; the published native evidence and
its earlier Mike access/RG depth costs remain qualified as before.

## Cost and workspace protection

This review read the GitHub comment and pinned Git objects. It ran **zero
native ticks, tests or full checks**, made no checkout/source/test edits, and
left the shared RUN006 feature and its dirty diagnostics untouched. The only
written artifact is this assessment in `/tmp/zone126-contract-review.md`.

## Exact edited diff review

After implementation the same nonauthor reviewer inspected the working
zone-reach.test.ts diff and returned **APPROVE**: explicit installed C half,
public movement expectation, strict equality and side assertion; both members'
assignment/drive, combination identity/release and bodies/joints/engagements
remain protected. Neighboring other-job/foreign-hand and dedicated acquired-frame
controls remain unchanged. This follow-up performed no edits or test/native runs.
