# Independent review of Run's #88

**ACCEPT the narrow post-release collection correction at
`6573521bc28ea09c2aa6c05770f20b2089cc9fe6`.** No remaining blocker is demonstrated
for this boundary. Integration owns combined verification and adoption. This
review changes no production code and does not advance #87.

Accepted base is `86250bb4f0c6f421878c204161864d523c3e30b6`; fetched develop
and the published queue agree. The only production/test changes are
`src/sim/behaviors/blocking.ts`, `test/combo-strike-access.test.ts` and its
5,933-byte fixture. All three are byte-identical to the author's executed
`61fde14a1bc5582b579a37d98eb8a98851a89d11`. Independently reconstructed runtime
SHA256 is `bed54d7389957f713c4a8a61e899fff1ea707f2545bd275e1fb8ff814e65bf37`.
The minimal accepted-base extraction requires no diagnostic ancestry, #81 or #87.

Review ownership was coordinated on
[#88](https://github.com/tannerthardy/football-simulation-/pull/88#issuecomment-6206538636)
and with
[Integration](https://github.com/tannerthardy/football-simulation-/pull/85#issuecomment-6206539407).
Evidence is immutable at
[`8fb028eafc19b803cf082a8d31d5594319bd5165`](https://github.com/tannerthardy/football-simulation-/blob/8fb028eafc19b803cf082a8d31d5594319bd5165/docs/reviews/combo-strike-access.md).
The independent audit verifies all20 manifest payloads and reduces the paired
tapes, original consumed-cue record, force samples and adverse events directly.

## Clearance ends at a useful strike

The football issue is an already released helper continuing to circle after a
useful linebacker strike becomes available. Body passage to the defender's
center demands clearance beyond the work the blocker needs to do.

Only `leaveCombination` supplies the additional strike endpoint. The
pre-release `climbRoute` caller retains its default zero, and joined release
eligibility/keeper selection are unchanged. The new value exactly matches the
existing run attack and `inBlockReach` law: blocker radius + target radius +.1yd
+45% of the blocker's measured arm. The unchanged attack and engagement code
still require actual reach and native eligibility; clearing navigation does not
award a joint, successful block or yardage.

At the first A018 difference2.30, RG's observed Mike is.89650yd away and the
actual Mike is1.09998yd away, both inside the existing1.16364yd strike range.
The acquired direct path to Mike's center fails the DL body test by.02645yd
now and.12600yd at the next read. The strike endpoint is the blocker's current
position in this case: he can strike without first walking toward that center.
The ordinary current/next-read checks still include both DT and keeper.
The existing move-out rule allows an already overlapping predicted starting
picture to separate; this is not a certificate of universally positive clearance.

Physical evidence settles the useful-opportunity question here. At2.30 the
controller reaches the unchanged attack, not a new forced velocity. World then
delivers191.13 force units in[2.30,2.35], with native `block_contact`2.35.
RG keeps residual lateral movement rather than stopping instantly. Force grows
to249.70 at movement ending2.65. The initial load is lateral with zero normal
compression, permitted by the existing accepted hand law; this patch changes
neither that law nor force/capability. The actual RG-to-Mike center segment
misses DT's torso by.27071yd and RT's by.97853yd. This rules out an obvious
intervening torso; it is not new anatomical arm/occlusion certification.

All recorded earlier A018 frames are exact through2.25, the entering RG
controller states are equal, and both arms release RG at1.05. The first changed
raw/final requests are RG and Mike at2.30. The post-controller representation
already contains the new joint and changed execution draws; it cannot be used
as a supposedly identical pre-decision state or isolated expected-value estimate.

## Information, keeper security and runner space

The new calculation reads own position/radius/arm measurement and the same
three acquired pictures as before. The A018 consumed DT/Mike pictures remain
.30s old and RT's remains.05s old. There is no new acquisition, hidden live
teammate position/engagement input, timer, memory extension or intended-to-achieved
velocity substitution. Actual distance is a physical contact eligibility check
in the unchanged attack, not new information supplied to the route choice.

RT retains the existing DT job. The saved production-hook/native test checks
that the original hand-joint object survives. Independently reduced native
samples show both RT/DT and RG/Mike loaded at every tick2.30–2.60, through runner
arrival at2.65. RT/DT resultant force at that endpoint is975.05. Keeping a
nominal engagement alone would not satisfy this evidence.

There is no offensive teammate impact through runner line arrival or first
carrier contact in A018. During[2.30,2.65], the runner's smallest sampled
center-minus-ordinary-torso gap to any OL is1.32944yd; this is a supporting
geometry measure, not a substitute for the actual contact tape. Movement,
all-player spacing, runner decisions and contact resolution are unchanged.
First runner contact shifts from Mike3.30 to SS3.40. That supports useful
second-level protection while preserving a defensive opportunity; it does not
establish an isolated yardage or universal collection improvement.

## Opposing evidence and adverse cases remain

- The real production-hook obstruction case at1.30 still retains departure;
  both source versions pass it. Clear2.30 decisions are expected-red on accepted
  old source and pass the candidate. Reflected acquired decision geometry is
  tested, with mirrors stopped before World execution. It is not a mirrored
  physical-joint or whole-play proof.
- D06 leftward Duo, A027 wide zone and Power have exact full **recorded**
  motion/request/contact/RNG frames, events and results. D06's collection
  limitation, A027 Mike's recovery and Power's first-level seal failure survive.
- Under preserves Mike's2.75 runner contact at the same recorded location even
  though C gains Will load. Collection does not veto a defender's recovery.
- A018's later C/LG impact at3.75, impulse49.9689, is preserved after the first
  SS contact. The whole play is not collision-free.
- A030 collects Mike earlier2.60→2.10 yet ends12.66→11.61yd. SS's first
  opportunity remains3.30 at the same recorded location. Both arms wrap, slip
  and meet the later FS/CB help; later execution/runner fall differ. Retain the
  shorter ending without treating it as an improvement or claiming its exact
  causal decomposition.
- D05's apparent earlier safety arrival is the same3.25 attempt: reference miss,
  candidate wrap and later slip. The saved observer pair is neutral to each
  original recording; pre-attempt runner/SS positions differ by only.000572/
  .000132yd. Exact probability/draw decomposition was not recorded and is not
  inferred from a favorable or adverse ending.
- D07 is live at5.00; there is no final gain/tackle claim. The old90ed RT
  first-strike-only failure remains separately pinned and is not relabeled
  fixed by this current #84/RG surface.

These limitations bound acceptance to the demonstrated controller contract.
They do not justify earlier releases, extra strength, solver changes, a guaranteed
route, or tuning to restore old yardage. Future departure outcomes can still
lose to uncertainty, momentum, real congestion and defensive technique.

## Verification, cost and next decision

Reuse the author's byte-compatible **71 focused checks/typecheck** receipts,
including genuine obstruction, loaded keeper/collection and expected-red
controls. This review found no unresolved question requiring another simulation
or test. The author spent10.616 launcher seconds on ten short executions and
57.207s across recorded checks including failures; those remain cached costs.

New review work: **zero native executions, zero test reruns**. The published
saved-object audit records its own subsecond runtime in
`data/reviews/current/pr88-independent-review/audit.json`. It independently
checks the exact production/test boundary, executed bytes, runtime fingerprint,
20 evidence hashes, same inputs/initial states, acquired endpoint geometry,
simultaneous actual loads, runner room, unchanged controls and retained adverse
records. Regenerate with `python3 scripts/diag/pr88-independent-review.py` after
fetching the named immutable evidence commits; it runs no simulation.

**Accept6573521 for Integration's minimal extraction and one exact combined
verification.** Keep #87 frozen at9760de031cae3bda7c926735f8edeb97fa4574e5;
its independent cost/information reviews remain separate. This review grants no
merge, baseline or physics-promotion authority and does not certify overall
wide-zone quality or every possible post-release approach.
