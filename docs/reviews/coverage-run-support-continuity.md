# Installed run support through coverage reassignment

The saved Quarters opening exposes a movement-ownership error. The defender's
installed run fit, current run belief and acquired carrying-RB picture survive
a zone→man replacement. Movement instead follows the new receiver because the
man controller checks only its assigned receiver for keyed support.

The independent correction lets `CoverageDefender.update` execute its existing
insertion/alley fit from a positive acquired backfield RB/FB picture even when
the current man assignment is another receiver. It requires current personal
run belief and affirmative acquired carrying on every decision. Existing throw
recognition transfers ownership to the ball. Receiver matching continues; the
support command temporarily owns movement. No belief timer or possession latch
is added; the new boolean records one diagnostic only.

## Exact candidate and scope

- Accepted/fetched develop: `90edc52530caa71efdebf257f17d954a8a629ea0` (#78).
  Runtime source `7ea3e00e2504271133a4384fbdbf1931e8ac8bf352861ee9e812f1372a0bf42b`.
  Re-fetched unchanged before publication. The older ledger embedded in the
  merge is superseded by [Integration's explicit acceptance](https://github.com/tannerthardy/football-simulation-/pull/75#issuecomment-6203122391).
- Code publication: `5e18fac098b067441e823205d0628a673e9c35c7`, branch
  `codex/coverage-run-support-continuity`. Source
  `257c603e417ec491b04ae911688c319bb9b60aa9ab9845f77147f562482b0f3d`, confirmed
  unchanged after commit. Runs used checkout `1df12c1` with this exact production
  diff; commit identity and content fingerprint are both retained in receipts.
- Production changes only `src/sim/coverage/defender.ts`. Existing keyed
  `runFit`, gap/side/crease handling, alley cap, movement, contact, capacities,
  recognition, release, spacing and mesh remain unchanged. Force/cutback and
  originally split-out backs are excluded. No flag/default changes.
- #75 is independent: its recognition correction and test-only contract
  reconciliation are **not** imported. Its source/test updates remain at
  `ec4a3a18785513d8016047a9a416c42ca9b2faa4` with 44 focused passes and
  [Run's agreed disposition](https://github.com/tannerthardy/football-simulation-/pull/75#issuecomment-6203244219).
  #75's original failed combined receipt stays failed; this is not its clearance.
- [Run/Flex coordination and ownership](https://github.com/tannerthardy/football-simulation-/pull/75#issuecomment-6203247713).
  Flex's separate mesh attribution retains the behavior→containment→engagement/
  bond→spacing stage boundary. This correction makes no mesh attribution claim.

## Saved witness and opposing evidence

Reuse Flex's existing four-input fixture at
`4cf253efead2cac450abe0bc74aa5e0db0306126:test/fixtures/rb-local-traffic.json.gz`,
SHA256 `10454c0f5e735e683e208597a3f009e0a11d65197c73a6b6bc80cd03ef79ecc0`.
These are current-controller **reenactments** with original post-constructor
bodies and RNG restored once at snap. Current constructor recognition/scouting
is used; no later original frames are injected. They are not exact replays of
the original games. Play45 below is a **Gun Trey run**, distinct from historical
spread-air P045. Fixed generated player identities and physical profiles match
between arms.

Gun Trey (TE attached), Wide Zone Weak, `cover4_stubbie`, LOS82.7:

| Time | Saved/native evidence | Baseline → candidate |
| --- | --- | --- |
| 1.05s | QB hands to actual RB, index6 | Same handoff/event clock |
| 1.35s | LB_M index15, A1-LB3, has run belief and a carrying=true RB picture, age.20s | Same zone support |
| 1.55s | LB_M falls before reassignment | Same fall and achieved trajectory; not repaired |
| 1.65s | LB_M `zone:hook_s`→`man:H`, installed B-gap/side−1 insertion retained | Receiver request replaced with existing keyed fit; falling body still cannot execute it |
| 1.70s | LB_W index16, A1-LB1, `zone:hook_mid`→`man:H`; A-gap/side+1 insertion | Requested velocity (+3.760,−4.836)→(−4.438,+.805) yd/s |
| 1.70s | LB_W incoming physical state and consumed RB picture agree across arms; picture age.25s | Achieved velocity (−2.602,+.391)→(−2.936,+.496) yd/s |
| 2.50s | LB_W achieved position/velocity | (85.241,24.003), (−.500,−2.477)→(84.090,26.680), (−1.973,+3.749) |
| 2.95s | LB_W distance to actual runner | 8.161→2.480yd; signed downfield lead +1.443→−.037yd |
| 2.90s | DE_W index11 first recorded carrier grasp/wrap | Same actor and event clock; no new LB tackle |
| 3.00s | End of observation | Both plays unfinished |

The nominated LB_W decision uses the same acquired RB position
(79.2363,25.0848), velocity (1.2204,1.8495), carrying=true and age.25s.
His immediately prior zone command is (−4.563,+.821): the repair preserves useful
run support rather than flipping him toward H. At 2.95s he is much closer but
almost level with the runner; reduced gap alone is not proof of superior last
defender leverage or a successful finish.

The **first whole-play fork precedes that linebacker transition**: CB_W index18,
A1-CB3, already man:X, activates his installed alley support at1.30s with current
run belief and an acquired positive RB picture. All22 incoming bodies are still
exact at that first fork. The rule covers installed support while matching, not
only the first replacement tick. Later cue/motion differences are consequences
of the native continuation and are not presented as fixed-input local effects.

Singleback Ace Outside Zone, `cover4`, LOS25.5, is the opposing context. LB_W's
zone→man:RB replacement at1.70s consumes carrying=false, so that boundary remains
unchanged. FS index20, A1-S2, later has run belief and a positive RB picture while
assigned man:X; his first changed request is1.90s. At the3.50s cutoff, FS gap is
17.818→14.377yd and LB_W gap1.053→.687yd. Both arms preserve handoff1.60s and
LB_W's first carrier grasp/wrap3.30s. The actual runner remains upright in both.

Adverse geometry remains visible: SS has the same achieved body at cutoff but
his runner gap grows2.806→2.894yd because the runner continuation differs.
This is not a newly demonstrated SS decision error. The Gun Trey LB_M fall is
also unresolved. Neither short window establishes final gain, tackle completion,
YAC improvement, or offensive-win suppression.

## Focused correctness and cost

**53 checks pass**:9 new ownership contracts,11 coverage-rule checks and33
accepted back-man run-fit checks. Typecheck passes. The tests preserve mirrored
insertion/alley, actual alley braking/work balance, no permanent belief or
positive-picture latch, hidden possession/motion/call invariance, unknown/
negative carrying and PA/vertical responsibility, unrecognized-flight continuity
and recognized-ball priority. Queries do not change the perception buffer or
RNG. Controlled unit assignments isolate ownership; natural matching is witnessed
separately above. The original pre-fix reproducer's five failures remain recorded.

Native cost: **8 short executions**, two inputs × baseline/candidate × recorded/
plain, 26 simulated seconds total,5.745 launcher command seconds. All four
recorded/plain pairs have exact final body/mind/behavior/recognition/perception/
intent/ball/event/RNG signature equality. Recording copies cues already consumed
and wraps existing requests/World steps; it adds no observation or random draw.
No full games, roster sweep or contributor full suite ran.

The first saved-only auditor incorrectly required equal serialized private
constructor hashes. Adding the diagnostic boolean changes that hash. The failed
receipt is retained. The corrected comparison requires identical input/settings,
profiles, first incoming bodies and requests, and every incoming body through
the first request fork; it publishes both private hashes and makes no private
state equality claim. Correcting/compacting the auditor ran **zero** simulations.
All listed focused/native/typecheck/auditor commands cost23.709 seconds total,
including failed and superseded offline checks.

[Compact same-actor evidence](../../data/reviews/current/coverage-run-support-review.json)
contains acquired cues, requests, achieved velocity/position/support state,
signed lead, first forks, events and censored endings. [Exact launcher receipts](../../data/reviews/current/coverage-run-support-receipts.json)
retain all44 flags (`RUN_CONTACT_COMPONENTS=1`, no overrides), World defaults,
Node22.23.3, lock/input/operator hashes, failures and runtime. Large raw captures
remain in ignored `out/coverage-run-support/`; reproducible operators are committed.

## Reproduction and decision

Fetch the fixture's existing branch and extract the single named blob into an
evidence directory. Run the committed collector on each specified source, using
the same Node/lock and unchanged baseline profile:

```sh
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/coverage-run-support.mjs INPUT.json.gz BASE45.json.gz 45 3
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/coverage-run-support.mjs INPUT.json.gz BASE19.json.gz 19 3.5
# Repeat on candidate source with fresh CAND45/CAND19 paths, then saved-only:
npm run baseline:run -- --candidate -- python3 scripts/diag/coverage-run-support-review.py BASE45.json.gz CAND45.json.gz BASE19.json.gz CAND19.json.gz REVIEW.json
```

The collector itself performs recorded/plain neutrality. It refuses overwrite,
caps each window at4s and enforces a15s total execution budget. Use the same
collector bytes on both sources; do not import candidate production into baseline.

**Ready for independent controller review**, not integrated or globally proven.
The minimal production/test extraction is `src/sim/coverage/defender.ts` plus
`test/coverage-run-support.test.ts`; the diagnostic operators are review tools.
Integration owns the exact combined verification and reconciliation with #75.
The candidate fixes a demonstrated responsibility loss while preserving installed
role constraints. Current `sim.see`/recognition/other run-fit information debts,
gaze/occlusion approximations, multi-back ambiguous pictures, physics and broad
support coordination remain separate. No new sensing or whole-engine awareness
repair is claimed. Review this boundary before expanding football evaluation;
no further P045 variants or broad tuning are justified here.

## Review support checkpoint: no production change

The user requested support for independent #75/#80 review, then a pause. At the
checkpoint there were no independent review comments on #80; this author audit
and its focused checks support review, rather than approving our own patch.
Do-It-All owns mesh spacing and no shared coverage/spacing behavior is changed.

The missing control was controller-level replacement of a formerly positive
picture through advancing perception snapshots. Test-only commit
`641f6a44ead2823cb9d06283bd22bac4a91d4c10` adds insertion/alley cases using production `PlaySim.see` and
`PerceptionBuffer.record`, a controlled .10s observation delay and fixed current
run belief. The positive picture persists through that latency; new known-unheld
or unavailable-possession snapshots then remove its authorization. Repeated
queries change neither buffer nor RNG. Hidden current RB possession cannot fill
the resulting false/unknown picture. The existing previously-active-fit controls
also prove cancellation by current pass/unsure belief, independently of carrying.

Throw-recognition controls now assert an actual `onBall` attainable contest in
both insertion and alley roles, despite the positive RB picture and run belief.
Before recognition, held and hidden-flight requests remain equal; after it,
the existing ball controller owns the request. No new observation/throw timing,
support priority or persistence rule is introduced.

**11 updated wrapper checks pass**, including the prior9;2.019 command seconds.
[Exact new receipt](../../data/reviews/current/coverage-run-support-review-support.json).
Earlier53-check/typecheck and eight short native-execution receipts retain their
original tested revisions. Only tests changed; runtime source remains
`257c603e417ec491b04ae911688c319bb9b60aa9ab9845f77147f562482b0f3d`.
No new native opening, game or contributor combined verification ran.

Current expiry is replacement by the delayed snapshot stream. The24-frame
history at20Hz bounds the selected lag at1.15s while live snapshots advance.
This does not establish confidence decay after gaze/occlusion loss: that model
does not yet exist in this opponent query. Arbitrarily expiring a still-positive
supplied picture would add a policy beyond this correction. The review must not
interpret this as a global awareness repair or an enduring possession memory.

#75's separate test-only review support is published at
`43ac5e1835467cbc0914df0df1c82ea74740d1b4`:38 updated back-man checks pass;
the original eight ManCoverage/World controls are reused. No #75 ancestry is
imported here, and its old failed combined receipt stays failed. Original
unfinished/adverse native evidence remains unchanged on both branches.
Integration owns independent review/composition/verification. Catching starts
no further behavior change and waits after this handoff.
