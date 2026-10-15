# #75 acquired insertion/alley contract disposition

**Disposition: retain acquired installed support until existing throw recognition,
then yield to the existing ball controller.** This is a focused test reconciliation
for #75, independent of the Quarters reassignment repair and Flex's mesh work.

The two original assertions (`back-man-run-fit.test.ts:255` and `:390` on the
reviewed extraction) supply current run belief and a positive acquired RB
carrying picture. At their decision times, the old flight clocks are only
.20 seconds old and `sawThrow` is false. Their expected generic `playBall`
request used the hidden airborne state to cancel a still-valid insertion/alley
instruction. They did not establish an observable cancellation cue.

The installed fit belongs to the defender, not to authoritative ball possession.
It stays eligible while the current run belief and acquired picture support it.
Alley remains the last secondary level at a deep mesh, rather than adopting
linebacker insertion. Unknown/negative carrying is not a positive acquisition;
pass/unsure belief, split-out backs and PA uncertainty retain the existing
opposing contracts. No belief or positive picture is permanently latched.
When the existing recognition function succeeds, the stale positive back
picture does not override reachable-ball or receiver-window priorities.

The revised assertions explicitly prove held/unrecognized-flight command and
RNG equality on both mirrors for insertion and alley, then prove `sawThrow`
true and exact equality with the existing `playBall` result. The FB hidden-state
control is retained as its own assertion. Existing back-man PA, acquired-picture,
native alley, current-belief, mirror, achieved traction/work and recording
checks remain in place. No production line changes in this reconciliation.

Run/Flex consultation and edit boundaries were published in [#75](https://github.com/tannerthardy/football-simulation-/pull/75#issuecomment-6203247713).
Catching owns this disposition under the user's explicit assignment. [Run's
independent disposition](https://github.com/tannerthardy/football-simulation-/pull/75#issuecomment-6203244219)
agrees with this exact ownership contract and identifies no observable global
flight cancellation cue. It is a contract review, not a new combined passing
receipt. Flex retains mesh attribution.

Accepted base: `90edc52530caa71efdebf257f17d954a8a629ea0` (#78). The actual merge
checkpoint is `3fb93bdc562b9fbc92e711db41b2c4c54d6ac022`, with source SHA256
`2c90810d2d4051d2ef7dab818312b3ea6c1622619846c9eff728ecdf3b97c981`:
accepted source plus #75's unchanged14-line extraction. Test reconciliation was
uncommitted at that checkpoint and is retained verbatim in the portable patch.
All44 accepted flags/components=1 and ordinary World defaults remain fixed.

**44 focused checks pass**:36 back-man contracts and8 direct recognition/World
contracts. Launcher command time1.953s, Node22.23.3. Zero native replays, games,
roster screens, typecheck/build repeats or combined suites. Reuse Integration's
preserved failing combined receipt to establish the original two conflicts;
it is not relabeled as passing. P006/Smash adverse geometry, P045 no contact and
the source-specific passing/inconclusive transfer evidence remain unchanged.

[Focused receipt](../../data/reviews/current/man-recognition-contract/focused.json)
and [portable test-only reconciliation](../../data/reviews/current/man-recognition-contract/back-man.patch)
(apply with `git apply --unidiff-zero`).
Integration owns independent review and the next exact combined verification.
The separate run-support reassignment change is not bundled into #75.

## Review support: expiry, contradiction and priority

User-requested review support adds **tests only** at
`16ba1d6caa154d5132c38ec272d12fa7da5c01b2`; production source remains
`2c90810d2d4051d2ef7dab818312b3ea6c1622619846c9eff728ecdf3b97c981`.
The prior 44-check and native/adverse evidence retains its original scope.
No independent reviewer comments were posted at this checkpoint; these author
checks support review and do not constitute independent approval.

The evidence gap was controller-level expiry with advancing snapshots, rather
than replacement of a fixed unit-test picture. Two new insertion/alley cases
now use production `PlaySim.see` and `PerceptionBuffer.record`, with a controlled
.10s observation delay and fixed run belief. A held RB image persists through
that delay, then newer known-unheld or omitted-possession snapshots replace it
with false or unknown. Support ceases in both cases, even when hidden current
possession names the RB. Repeated queries leave the buffer/RNG unchanged.
Changing current belief to pass cancels a previously active fit despite the
still-positive picture; restoring run belief permits support again.

The mirrored insertion/alley throw tests now provide an attainable ball window
and assert `onBall`, in addition to equality with unchanged `playBall`. Recognized
flight therefore defeats the positive back picture and run belief, rather than
merely matching an unreachable ball fallback. Before recognition, the held/air
request and RNG invariance contracts remain intact.

**38 back-man checks pass**,1.928 command seconds, accepted44flags/components1.
The unchanged eight direct ManCoverage/World controls reuse their original
receipt. No new native opening, game, combined suite, physics or behavior change.
[New exact receipt](../../data/reviews/current/man-recognition-contract/review-support.json).
The portable test patch now includes these review controls; apply with
`git apply --unidiff-zero`.

Expiry here means replacement by the next delayed sampling picture. The
24-frame buffer advances every live tick; its maximum selected lag is1.15s at
20Hz. It is not gaze/occlusion memory with confidence expiry. An arbitrary TTL
on a still-positive supplied picture would be a new policy, not a repair to
this recognition boundary. Upstream recognition's hidden clock/possession debt
and other existing truth consumers remain separate and disclosed. The original
failed combined receipt is not relabeled. Integration retains exact composition
and verification ownership; Do-It-All owns mesh spacing. Catching pauses further
behavior work after publishing this review support.
