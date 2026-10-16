# Stretch-block connection steps and the exposed edge

Recommend independent review of **bc02b22**: correct the distance used for a
stretch blocker's connection step. The useful football result appears when
combined with the separately reviewed runner reader in #110; neither change
alone rescues the saved strong edge case. This is a small geometric controller
correction, not a demonstrated league-wide run-game breakthrough.

## What was actually wrong

`stepRunRep` used total center separation minus torso clearance as **upfield**
closure. Sideways separation therefore created upfield steps, including steps
away from a defender who was already slightly behind. At the saved Y/DE_S
2.30-second state the closure addend was +1.044 yd/s although almost all the
gap was sideways. Four mirrored production-hook assertions fail on accepted
code; the ordinary aligned opposing control passes.

The correction measures travel to the torso-clearance circle **along the
movement component actually emitted**, holding the perpendicular offset fixed.
It retains the current side of the defender, rather than sending the blocker
through him. The existing proportional gain, speed clamps, opponent velocity
feed-forward, lateral work, anchor, hands, support and spacing stay intact.
Resolving a unit geometric axis does not divide the movement request by an
angle: the emitted normal drive keeps its original magnitude.

The accepted #4 contact-component composition itself stays byte-identical.
Only `contact-motion.ts::connectionGap` and the stretch forward closure term in
`engagement.ts::stepRunRep` change production behavior. No `blocking.ts`, runner,
tackling, shared solver, capabilities, assignments, release timers or flag
profile change. Boundary was published on #110 before the shared-file edit;
Physics was separately notified on #83. #110 remains frozen and independent.

## First attempt rejected, not hidden

The initial radial-gradient projection (`df8a2a8`, source d36d6929) corrected
the direction but also attenuated useful normal travel on an oblique approach.
The additional clearance-circle opposing test fails on it. Its composition
with #110 changes the weak first contact from Mike at2.85s/+1.57yd to the end
at2.55s/+.05yd, final gain4.96→3.80. **Do not integrate that version.** Its full
receipts and extracted adverse results remain in the evidence.

The final geometric distance (`bc02b22`, source62683631) addresses that specific
cause. There were two implementations, not a search over release/strength
parameters or new seeds. No third tuning variant was tried.

## Actual protection and runner movement

All 22 players use ordinary controllers, acquired histories and World. Three
accepted native references and three #110 reader references are reused. One
fresh strong WZ/Under3 case, pair11/seed77, was declared before results and was
not replaced. All gains below are native endings; Duo is explicitly censored.

| Situation | Accepted | Closure only | Reader #110 only | Both |
| --- | ---: | ---: | ---: | ---: |
| Ace12 WZ strong / Over3 | −.67 | −.53 | +.39 | **+2.53** |
| Ace12 WZ weak / Over3 | −.03 | **−.14** | +4.96 | +5.34 |
| Saved Ace11 Duo useful climb | censor3.50s | exact accepted frames | censor3.50s | exact reader frames |
| Fresh Ace12 WZ strong / Under3 | +2.62 | +3.04 | unrun | unrun |

**Strong, combined:** first contact changes from DE_S at2.30s/−.97yd with
the reader alone to CB_W at3.30s/+.83yd. Y/DE_S carries actual load from
.50 through4.15s; the runner gets outside that surface rather than entering
the end's inside route. No player is granted more strength or forbidden to
make a tackle. Body/hand execution remains bounded by the same laws.

The first changed runner choice is at1.95s, using the ordinary already-acquired
picture. Reader-only selects a waypoint (38.8,21.67); both select(38.8,18.67).
The requested velocity changes from(5.783,−1.889) to(2.350,−5.611)yd/s. The
runner does **not** instantaneously attain it: first body difference is at2.00s;
he works laterally behind the line, clears Y without a teammate impact, then
crosses outside the end. At3.00s RB is(39.853,17.025), Y(39.446,19.643), and
DE_S(39.437,20.792). This is achieved access, not merely a promising command.

**Important limit:** the choice is sensitive. At1.95s reader-only scores the
inside and outside entries10.708/10.759; both score10.711/10.609. A small
observed geometry change crosses a close decision. This is a feasible route
example, not proof of robust transfer or that the old inside choice was
categorically irrational. No scoring weight or decision cadence was tuned.

**Weak adverse evidence:** closure alone finishes .11yd shorter than accepted;
Will reaches the runner rather than the end. With the reader, Mike contacts
.05s earlier and .26yd nearer the line, despite the final gain improving .38yd.
Final gain includes changed contact geometry and later execution draws; it is
not a matched-execution causal estimate of better finishing.

**Opposing controls:** the aligned connection and legitimate through-block
tackle tests pass. Duo preserves every recorded body/load/event frame at3.50s,
both alone and in composition; its useful RT/Mike contact is not sacrificed.
The fresh Under3 end block remains loaded through runner arrival; Mike still
wins. All four final closure native cases and three final composition cases
have **zero positive teammate impacts**. Strong/weak defensive losses remain
possible; no required football ending was installed.

## Contact ownership: a different question for Physics

The saved strong end was **not holding an offensive retained grip hostage**.
Immediately before the accepted tackle, hand control is−.2732, actor=DE_S,
hold=0, normal=0, tangent=−230.876 in native force units. The roughly236 load
seen just before it is defender-owned steering, not evidence of a secure TE
hold. Keeping that defender's voluntarily ceased action to rescue the runner
would be unjustified. `win` is.296 at.50s and reaches1.013 at2.30s; it is not
winning from the first frame in this witness.

There is nevertheless a precise separate lifecycle question: a successful
`grasp` currently calls `disengage`, deleting **all** old hand connections,
including blocker-owned ones. The supported tackle test explicitly expects
that conversion. Run has not changed it or the .6 admission gate.

The portable `retention-witness.ts` supplies two explicit acquired-ownership
initial conditions with real World solves: control+.6 gives blocker-owned
loaded hands and nonzero hold capacity; control−.3 gives defender-owned hands
with no tensile hold. Conditioning on a successful ordinary attempt clears
either connection without another body step. Positions/velocities do not jump;
work residuals are below1.5e−13 and arm budgets hold. **This demonstrates the
lifecycle boundary, not a conservation failure or that a retained-law
counterfactual must improve a play.** Physics owns whether a defender's action
can authorize removal of the blocker's acquired connection and what support/
arm/attachment accounting a replacement would require. Both controls are
included; no speculative retention patch is bundled.

Forces here are native kg·yd/s² (multiply by.9144 for newtons); earlier comments
used N as shorthand. The ownership conclusion is unaffected.

## Exact evidence, settings and costs

- Accepted base **c3264b0bad72bd2c208602e0ecf0461c00d9669f**, fetched against
  queue625f3b4. Patch **bc02b22fa8ed4c985bbf7863eb58c914a4f53675**.
- Final engine source **626836315cccc12ad1e5ab438f7a4e5a25a0b2db3b24c23396f3af4ea02d7fcf**.
- Diagnostic runtime composition **3015ed7**, source
  **bed3c36cf08407762fed67abdf0a1651fe6ed7fc8c09b43ab3d9b33f1dfd4616**.
  It contains #110's exact runner blob. It is not an integration branch: compose
  both proposals with their proper tests if independently accepted.
- **Node22.23.3, all44 accepted flags, components1, CF_FLOW unset**, ordinary
  World/capacities and original fixed rosters. Historical4ded6b6 unchanged.
- **66 focused assertions/typecheck pass.** Final source/validation fingerprints
  match; focused/native receipts record prior HEAD plus the exact dirty final
  source, now committed byte-for-byte in bc02b22. Publication changes no runtime.
- **35.88 command-seconds total**, including both attempts, failed opposing
  checks, a failed reference-launch setup and two typechecks. Four distinct
  native situations:15 new standalone continuations across attempts/compositions
  plus two missing-field observational prefixes. Six native references reused;
  zero games/full suite. Reduced ownership controls add two World steps. Existing
  tests may execute their own bounded fixtures.
- [Requests/poses/load, adverse variants, contact-owner witness](../../data/reviews/current/stretch-protection-access/summary.json)
- [Exact settings, hashes, receipts and cost](../../data/reviews/current/stretch-protection-access/source-manifest.json)
- [Inputs, initialization and cached references](../../data/reviews/current/stretch-protection-access/input-manifest.json)

```sh
# Pinned Node; accepted44-flag launcher; no overrides.
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/stretch-access/native.ts out/stretch-access/native.json.gz
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/stretch-access/native.ts out/stretch-access/transfer.json.gz --transfer
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/stretch-access/retention-witness.ts out/stretch-access/retention.json
```

Detailed tapes remain in ignored out/. The small published extracts and portable
collectors reproduce the questions. No viewer, film or ZIP was generated.

**Next decision:** independently review the final normal-distance controller
correction, explicitly considering its #110 interaction and adverse results.
Integration owns one exact combined verification if accepted. Physics receives
the separate ownership witness; no tackle/retention change without its contract
review. Keep release experiments parked. Long-run frequency and defensive-fit
prevalence remain checkpoint measurement questions, not findings established
by these four situations.
