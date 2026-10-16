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

## Reused reacting continuation: D-gap correction plus span

Root then ran the four short matched continuations at combined commit
`71ff14cfe926ddc02599d27948a9fab0063bd3ee`, source
`720c059367e89e4ac262017739a14b592827fcc9b62bbcd726cbb06131163ddd`.
Its parent `6cf700d` is the standalone D-gap correction; the only additional
runtime change is this exact span hunk. No stretch-footwork trial is included.

Compared with saved D-only source
`e29daf4badc62643290fe8d9d750ceb74e3ec4270e89d58c78294d87a7867068`,
**A003, A015, A039 and A025 are exactly identical in every captured frame
field through 3.10 seconds** (62 frames each, 248 total): full before/after
bodies, goals, commands, producer/read diagnostics, hand states, contact/work
reports and RNG. Initial bodies, inputs, flags, World settings and events also
match. There is no first physical divergence or newly demonstrated native
release. These prefixes contain no active isolated rep beyond the full-arm
limit, so the new ending condition has no demonstrated effect here.

Real near-contact load remains, with identical examples in both arms:

| Case | Sample | Contact | Before distance / full span (yd) | Actual normal force |
| --- | --- | --- | --- | --- |
| A003 | 3.05 s | Y–DE_S | 0.541738 / 1.505657 | 447.149 |
| A015 | 3.05 s | RT–DE_S | 0.707486 / 1.637980 | 484.755 |
| A039 | 2.75 s | LG–DT_W | 0.897757 / 1.665051 | 489.241 |
| A025 | 3.05 s | LG–LB_W | 0.908768 / 1.554596 | 856.065 |

These are simulator force units, not measured NFL loads. The cases remain live
at the cutoff. This establishes bounded preservation of the D-gap correction's
movement/blocking, **not an additional football benefit from the span change**.
The original remote-steering defect occurred in the separate stretch-footwork
research, and that justification remains separate.

[Compact comparison with trace hashes](../../data/reviews/current/run-contact-span/coupled-summary.json)
and [root-owned receipt](../../data/reviews/current/run-contact-span/coupled-receipt.json).
Raw traces stay local. Root's existing collection cost was 2.694489 s in the
collector summary / 3.062662 s command time; this comparison added **zero
simulation or tests**. The earlier focused checks were not repeated.

## Additional transfer evidence: the law does activate

The preceding four-case statement remains true. It does **not** extend to
other D-gap continuations. Root's later saved F002, A002 and A027 transfer
prefixes, on the same combined `71ff14c` / source `720c0593`, activate this law.
The comparison is against the same D-only source `e29daf4b`, with identical
initial bodies, inputs, flags and World settings. No additional simulations or
tests were executed for this review; root owns the transfer execution receipt
and cost, so that bill is not duplicated here.

| Case | First divergence | Invalid isolated contact | Before distance / full span (yd) | Old hand force magnitude |
| --- | --- | --- | --- | --- |
| F002, fresh front | 2.85 s | RT–DE_S | 1.732529 / 1.629343 | 193.173 |
| A002, OZ | 1.60 s | Y–NB | 1.541286 / 1.426061 | 467.538 |
| A027, WZ | 2.65 s | LG–DT_W | 1.696979 / 1.690051 | 340.219 |

All three contacts are separating at that boundary. Before bodies, football
goals and RNG states match exactly at the first divergence. The candidate ends
the out-of-span rep; the first changed commands belong only to its two actors.
F002 previously carries defender-controlled steering without normal force;
A002 carries offensive steering and cloth tension; A027 carries offensive
steering without normal force. The same physical limit applies regardless of
which team controls the hands. Forces use kg·yd/s², not Newtons.

The coupled consequences are material and retained:

- F002's DE reaches the runner at **2.85 rather than 2.95 s**. The defensive win
  remains; the earlier access follows release of an impossible distant contact.
  Both prefixes are live at 3.10; this is not a terminal tackle comparison.
- A002's DE body contact moves from **2.75 to 2.70 s**; the candidate then records
  a missed tackle at 2.85. The runner is about **0.397 yd less far downfield** at
  the 3.10 cutoff. Existing RG-to-Mike collection remains (contact 2.35 → 2.30),
  and the earlier strong RT–DE contact is untouched at the first divergence.
  The later miss does not establish an offensive improvement.
- A027 keeps Mike's **2.80 s encounter**, but the reference hit/fumble becomes
  a grasp/wrap. Mike's full body and request at 2.80 are exactly unchanged;
  the runner's position differs by only 0.000000728 yd. The earlier release
  also changes the random stream by omitting the ended rep's hand-fight draws.
  Small movement differences remain, so this is **not proved ball-security or
  protection improvement**. The fumble-versus-wrap sensitivity stays visible.

Useful acquired blocking is not categorically removed: F002's RG–DT contact
still carries 757.944 normal force at 3.05; A002 keeps 979.490 RT–DE normal
force at the first changed boundary; A027 keeps C–DT normal force 804.519 and
RT helper normal force 429.552 at its first changed boundary. Later forces
and hand-control draws can differ after release; no capacity was increased.

[Compact transfer comparison, first changed contacts and event deltas](../../data/reviews/current/run-contact-span/transfer-summary.json).
Raw traces remain local. This corrects the earlier provisional assumption that
the span law would also be inactive in the fresh-front/OZ/WZ transfer controls.
It does not amend the four verified exact-prefix comparisons above.

## Limits and next decision

This corrects a demonstrated physical-contact validity failure. It does not
establish better native run production. The bounded coupled test preserves
four D-only prefixes exactly and changes three additional transfer controls at
demonstrated invalid contacts. Defensive access may become earlier, and the
changed random stream affects later outcomes. Draft PR #102 remains a separate
mechanical correction for independent Physics review; no adoption or merge is
claimed here.

The 20 Hz check guarantees validity at the decision boundary, not an exact
substep reach cutoff. The longer arm plus both radii is deliberately generous;
it is not a new anatomical shoulder/torso model. Reps containing helpers keep
their old lifecycle so this patch cannot erase a valid helper's acquired block;
their primary-contact validity remains a separate unresolved question.

Recommend independent review of this narrow correction, with native football
benefit held separate from the mechanically proved release improvement.
