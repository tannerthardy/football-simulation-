# Isolated run-contact span

Candidate `84a71afb85298b8e154bc3a3a468f1cebd801f28` is a portable extraction
directly on accepted `bb6d4c73948d53ba841dd9338dd240146c739f8c`.
Source `4cbbfe279bee04aeba650d95932da4c9c5caf7721a2b3515e71dafa46e00c8e0`.
Branch `codex/run-contact-span`. No experimental movement/installation parent,
World changes, capacity changes, flag changes or PassProtector edits.

## Demonstrated defect and correction

An acquired primary hand joint can continue steering after both bodies have
separated beyond even the longer player's entire measured arm plus both torso
radii. The previous run lifecycle permits another 0.35 yards. The joint's
shorter working extension determines normal push/tension; it does not suppress
tangential steering. Zero normal force therefore does not establish release.

Saved coupled stretch-footwork research (source
`ad2ba881189fef4fbeed6bcb89f812617a5c6b6bcc118dc395e0e79e04695173`)
contains two independent witnesses with no helper, negative control and no
cloth hold:

| Case | First wholly invalid decision boundary | Generous full span | Existing joint force |
| --- | --- | --- | --- |
| A015 Y–DE | 2.50 s: 1.683498 → 1.801934 yd | 1.587980 yd | 337.080 tangential, zero normal |
| A003 Y–DE | 2.75 s: 1.578045 → 1.685496 yd | 1.505657 yd | 212.148 tangential, zero normal |

A tiny two-body A015 mechanical probe reused the exact captured bodies,
commands and current force law. It reproduced the recorded end distance and
337.07958099775294 tangential force; all 12 solver rows were already outside
full span (1.683498–1.791998 yd), without torso impact. This is not inferred
solely from a sampled end distance. The original probe remains under ignored
output; it is neither a native football continuation nor an adoption receipt.

The production change is confined to `updateEngagements`: use zero extra grace
for run reps without helpers. The existing full-arm predicate remains. Physical
separation ends the rep and removes its joints and both actors' engagement
pointers; it does not move a body or award either player a result. Full-extension
working contacts and actual cloth tension remain possible below this generous
span. Pass reps and reps containing a helper retain their existing grace.

Physics/Run scope was coordinated before editing at
[PR #4 comment6211623671](https://github.com/tannerthardy/football-simulation-/pull/4#issuecomment-6211623671).

## Focused verification

Node 22.23.3, pinned candidate profile (44 flags, components=1), unchanged World.
The new test executes the actual `updateEngagements` → `disengage` → World path,
rather than testing a copied distance predicate.

- **Before:** new six-test fixture on accepted source fails the isolated remote
  contact assertion; its five opposing controls pass. Source
  `668acb1784799c93d4704aaaa41233a11627ee0a862b41dc279cd11a0a22eeac`.
- **After:** six new checks plus 14 existing run-hand-control checks pass.
  The invalid contact leaves bodies, RNG and incoming commands unchanged,
  removes the joint/rep/pointers, and produces zero arm impulse and hand work
  in the following real World step. Existing arm/work limits remain enforced.
- Opposing controls preserve reachable full-extension steering, an acquired
  cloth hold with actual tensile force, a valid helper when the primary has
  separated, and both existing pass separation boundaries.
- Typecheck and diff whitespace checks pass. No new native full plays,
  roster screens, games or full integration suite.

Reproduction:

```sh
node scripts/baseline.mjs --candidate --receipt out/run-contact-span.json -- \
  npx vitest run --project core test/run-contact-span.test.ts test/run-hand-control.test.ts
```

Receipts: [before](../../data/reviews/current/run-contact-span/before.json),
[after](../../data/reviews/current/run-contact-span/after.json),
[typecheck](../../data/reviews/current/run-contact-span/typecheck.json).
Command time: baseline failing check 1.655 s; candidate checks 1.913 s;
typecheck 9.479 s; **13.047 s total**. The earlier independent two-body probe
took 8.4 ms native / 0.631 s command wall and is counted separately.

## Limits and next decision

This corrects a demonstrated physical-contact validity failure. It does not
establish better native run production. Root owns the reacting coupled
continuation and publication decision; no PR or merge was created here.

The 20 Hz check guarantees validity at the decision boundary, not an exact
substep reach cutoff. The longer arm plus both radii is deliberately generous;
it is not a new anatomical shoulder/torso model. Reps containing helpers keep
their old lifecycle so this patch cannot erase a valid helper's acquired block;
their primary-contact validity remains a separate unresolved question.

Recommend independent review of this narrow correction, with native football
benefit held separate from the mechanically proved release improvement.
