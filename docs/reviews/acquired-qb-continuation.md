# Accept acquired QB commitment without replacing pass recognition

Base: accepted/fetched `70b4db6a3ef53acc1a0e90cd055f1087205daa30`, queue
`c933dbc3c2ee3a2d230b70ee1032b9ac4ea49d0b`. Code:
`85127819f88d6a475479689916dd01b527e41e41`; runtime source
`58d6ad87a858eafe2acf62d451f9287ad6fc8fddd281caaf6989cde62f0e3418`.
[Receipts/provenance](../../data/reviews/current/acquired-qb-continuation/review.json),
[local request/achieved measurements](../../data/reviews/current/acquired-qb-continuation/metrics.json).
One runtime function: `ManCoverage.coverMan`. No shared movement changes.

## Contract and producing error

The existing pursuit helper can provide a request after observing the QB well
beyond the LOS, but man coverage discards it when pass belief persists without
a throw/catch. This is the wrong continuation after personally acquired QB
commitment, even when pursuit cannot recover the earlier offensive escape.

Add a local acceptance before the legacy pursuit gate: **own QB picture,
carrying=true, x>LOS+2**. Use existing `chase`, including intercept, leverage,
gather and own-body preview. This uses a known player and acquired picture,
not `sim.carrier`, private scramble/handoff flags, a future path or a timeout.
The two-yard surface is the existing strong pursuit/read-time boundary and the
saved audit's witness definition, not a threshold fitted to a selected ending.
Initial snap possession or an escape behind the line is insufficient.

Do not rewrite recognition belief. Recheck the picture every tick; unknown or
negative possession ends this new override. Recognized flight still enters
`playBall` before `coverMan`, so a fresh reachable contest beats a stale QB
picture. Existing acquired RB/FB insertion/alley support retains its priority.
This does not repair other authoritative-carrier/global-phase consumers in the
legacy helper, ordinary run fitting or perception's acquisition model.

## Saved evidence and focused checks

Restored the existing four game archives and audit bundle, verifying every
published SHA256. No games or full snaps were generated. Source data stays at
`b9b9c17597970ddc87aa4a4e271fc4cfeef71909`; audit bundle at
`23d5f6d4f7e88fdd3225a49cc74ae5582a52522e`. Exact selected scene input,
players, recorded technique flags, consumed cues, sample time and raw-record
hashes are frozen in `test/fixtures/acquired-qb-scenes.json.gz`.

All six strong witnesses are exercised, beginning **G4-P177**, then
G1-P086/P127, G2-P174, G3-P093 and G4-P173. Each uses its actual selected
players and acquired picture despite pass belief. New requests accept existing
pursuit and the one-step World replay redirects/brakes better toward the observed
runner than continuing receiver coverage. In G4-P177 the cold scene's radial
request changes **-6.074→+5.085 yd/s**; achieved radial velocity after .05s
changes **1.902→2.244 yd/s**. These are local stage measurements, not native
game counterfactuals. The saved native final request was (7.40,3.75), while the
cold coverage replay requests (7.69,3.62); unexported history is not exact.

Ordinary **G1-P027** and PA **G2-P057/G3-P073** retain receiver responsibility.
The original audit also screens G1-P027's full saved scramble sequence and finds
no consumed QB position beyond LOS+2; the new threshold is not supported there.
Unknown/negative carrying, initial possession at multiple elapsed times, hidden
position/velocity/possession/call/flags while snapshots advance, and a recognized
reachable flight provide direct opposing checks. The new request does not latch.

**13 final direct checks pass**, with **61 compatible existing support,
back-man and throw-recognition checks** reused from the same candidate source:
74 unique checks total. Typecheck passes. The unchanged source fails all six
strong acceptance checks and passes seven controls. Failed initial placement
and fixture typechecks remain in the evidence; the final source changes only
the intended function. Total measured command time **31.330352186s**, including
failures/rechecks; no full suite/build/game campaign. Exact44 settings, components1,
CF_FLOW unset and unchanged World defaults are in every launcher receipt.

Physical limitations remain visible: several distant defenders still move away
for the first tick while braking their existing momentum; G3-P093's FS is about
35yd from the QB. Earned separation, redirection cost, grips and terminal football
outcomes are not reset. These rounded saved scenes are not complete runtime
checkpoints. Unexported mind, support/foot and route history is not reconstructed
as truth. No tackle, prevented yardage or general YAC improvement is claimed.

## Independent scopes and next decision

Run coordination: [contract](https://github.com/tannerthardy/football-simulation-/pull/126#issuecomment-6229661691)
and [separate premesh proposal](https://github.com/tannerthardy/football-simulation-/pull/126#issuecomment-6229713842).
Offensive recovery stays with Run. The acquired empty-back/retained-QB mesh
contradiction is a separate runtime candidate, not a dependency of this patch.

**#128's independent review is complete:** Integration
[ACCEPTS its exact force-only pin](https://github.com/tannerthardy/football-simulation-/pull/128#issuecomment-6229698539)
for combined verification with #126. Do not rerun or expand its scope. It does
not repair these gates or fast #3. #127's adverse cushion variants stay held.
The shallow-cut admission/retention discontinuity remains an independent small
follow-up. Fast #3 remains one installed-duty/attainable-handover investigation,
preserving the wall, roof and acquired #2 wheel; no new variant here.

[Physics coordination](https://github.com/tannerthardy/football-simulation-/pull/114#issuecomment-6229662000)
keeps same-time geometry separate from Catching's eligibility/order/retry/difficulty.
No catch/World/kinematic/roster code changed. Independent contract review is the
next gate; Integration owns combined verification and adoption. Native combined
broken-play value requires Run's separate candidate/evidence before any claim.

Reproduction on the exact pin, using repository Node and dependencies:

```sh
node scripts/baseline.mjs --candidate --receipt out/qb-scenes.json -- npx vitest run test/acquired-qb-continuation.test.ts
```

The retained four-file command in `corrected-focused.json` includes compatible
existing controls. Use it only for an unresolved interaction, not automatically
for an unchanged review. Original outcome context and explicit scene limitations
are preserved in the fixture and review JSON.
