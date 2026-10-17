# Quarters flat match: preserve the installed force duty

Independent correction on accepted `70b4db6a3ef53acc1a0e90cd055f1087205daa30`
(#125), canonical queue `c933dbc3c2ee3a2d230b70ee1032b9ac4ea49d0b`.
Code freeze `995effce77812177aa74fa9ec5aa695b4fd136cf`; candidate source
`5b710a1b8b2bdf9bb874aa9c788424cd3c71185df9993f9f6db7eb80cf6b4482`.
[Focused evidence](../../data/reviews/current/quarter-flat-force-support/review.json)
and [two-file extraction](../../data/reviews/current/quarter-flat-force-support/candidate.patch).
Ready for independent Run/coverage review, not self-approved or merged.

## Football problem and correction

Accepted #124 correctly keeps the Quarters apex attached to an acquired #2
outward release and its possible wheel. That installed force player becomes a
man technique, however, and the existing coverage wrapper preserves only
insertion/alley support. An apex who subsequently believes run and personally
acquires the carrying back still requests receiver movement. His support job
exists but cannot execute through that coverage transition.

Extend that existing wrapper to **force + q_apex + acquired flat phase** only.
It invokes the existing keyed `runFit` with the consumed RB/FB picture. The
same body's outside shoulder, inside bubble where installed, gap and partner
remain intact. Allocation and fit execution are unchanged. The recorded man
responsibility survives; this is a conditional support request, not an extra
fitter or a new shared possession oracle.

Current run belief and positive acquired back possession are required each
tick. Negative/unknown possession or changed belief cancels support. Support
can persist through unrecognized flight; existing throw recognition restores
ball priority, including attainable contests. This intentionally permits
play-action mistakes while the player's acquired evidence still supports run.
No timer or permanent run latch is introduced. Ordinary man/force/cutback and
Palms responsibilities outside this acquired phase retain their contracts.

## Evidence and limits

- Unchanged accepted source fails four positive activation checks: both sides
  with the original players and both with fresh generated players. Four opposing
  checks already pass. The correction passes **74/74 focused checks**: eight
  new force checks plus the existing 15 support, 38 back-man and 13 flat/wheel
  contracts. Typecheck passes.
- Active tests use native `CoverageDefender`, installed jobs and generated
  bodies with explicitly supplied acquired pictures. Requests equal the existing
  keyed fit; World execution preserves the installed job and physical work
  accounting. Fresh-player achieved bodies equal the keyed-fit controls.
- Hidden back motion/possession and advancing reality snapshots do not change
  requests or RNG with the same acquired cue. Force-specific expiry tests replace
  the current picture; the unchanged support contracts additionally exercise
  actual production-buffer expiry and contradictory cues.
- Only **four new native controls**: IZ, OZ, fresh TRANSFER and SLOT-SWING.
  Compatible accepted-source recordings are reused. All four are completed,
  uncensored, and exactly preserve physical signatures, consumed cues, requests,
  sampled achieved movement, first contact and outcomes. The successful swing
  remains a tackle at **0.5862276501511445 YAC**. These controls establish
  preservation, not newly won run stops or population YAC improvement.

Node22.23.3, launcher-controlled44 settings, RUN_CONTACT_COMPONENTS=1,
CF_FLOW unset, fixed World defaults. Receipts retain every value, exact input
hashes, source/operator/lock hashes, failed red check and passing commands.
Total new command time **17.304540105 seconds**, including the expected red,
focused checks, four native controls and typecheck; native simulation1.410484s.
No baseline recollection, full suite or game campaign. Integration owns combined
verification and adoption. Runtime scope is only `coverage/defender.ts`; the
direct contract file is the second extraction file. No movement-modifier overlap.

## Broader coverage work remains held

[Research #127](https://github.com/tannerthardy/football-simulation-/pull/127)
preserves the wider teaching investigation, original failures and all recordings.
Its fetchable publication is `f6a3c866622404965ee43551e2b9307de84b4db8`.
Do **not** merge its controller parent. Neither approach arm is ready:

| Ordinary SLOT-SWING | First entry | Final YAC |
| --- | --- | ---: |
| Accepted #125 | Firm rear form wrap, survives to finish | 0.5862 |
| Fixed-plane depth | Late lunge, first hold slips | 6.6145 |
| Moving release cushion | Weak reach; first and safety holds break | 12.9918 |

Wheel leverage improves, but the same policies make an ordinary short-catch
arrival worse. The initiating objective changes approach geometry; these are
different contacts, not an isolated test of one identical grip. Ordinary rear
wraps succeed. No global grip, speed, braking or physics change is justified.
Several explosives remain; this correction does not solve general YAC.

The next discriminating experiment is **offline feasibility using already
consumed hip/velocity pictures and own-body movement previews**. Wheel and swing
have distinguishable acquired cues before release, but those are uncertain
observations, not knowledge of the future route. Establish a feasible objective
and its short-catch cost before another controller variant. Helpers, coverage
handoff communication and the wider teammate-information repair remain separate.

## Reproduce without recollecting the reference

Fetch this branch and research `codex/quarter-flat-current`; checkout the exact
code freeze above. Use the repository's Node version and installed dependencies.
The optional native operator is already published in #127; it is not part of
the two-file integration patch:

```sh
git show f6a3c866622404965ee43551e2b9307de84b4db8:scripts/diag/honest-quarter-flat.ts > scripts/diag/honest-quarter-flat.ts
node scripts/baseline.mjs --candidate --receipt out/force-checks.json -- npx vitest run test/quarter-flat-force-support.test.ts test/coverage-run-support.test.ts test/back-man-run-fit.test.ts test/quarters-flat-wheel.test.ts
node scripts/baseline.mjs --candidate --receipt out/force-native.json -- node --import tsx scripts/diag/honest-quarter-flat.ts run data/reviews/current/quarter-flat-force-support/inputs.json.gz out/force-native.json.gz force-continuity-review
```

For the freeze checkout, obtain the inputs from the publication containing this
report or the frozen research manifest. Baseline raw files and receipts remain
under `data/reviews/current/quarter-flat-depth-current/` at the #127 publication;
the review JSON records the exact reference file for each row. Compare identical
case input hashes and the full physical signatures, then inspect requests and
achieved bodies. Commands are reproduction options, not another review campaign.
