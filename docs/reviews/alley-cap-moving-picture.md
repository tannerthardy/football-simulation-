# Defensive approach: fix the moving cap before rescuing the late reach

2026-10-16 UTC / 2026-10-15 Phoenix. Catching, consulting Run.
**One supported controller correction for independent review; not merged.**

The football issue is often the state in which a defender arrives, rather than
his willingness to reach or his grip strength. A safety can retain the correct
support responsibility yet execute it with the wrong lateral momentum. Once the
runner declares his crease, a late change of aiming point cannot recover those
earlier steps. This investigation found one such producer/consumer mismatch.

## The correction

`executeRunFit`'s alley cap already moves its lateral aim with the acquired back
picture. It nevertheless passed **zero target velocity** to `track`, the existing
moving-point controller. It treated the moving cap as a stationary landmark.
The one-line correction passes `{x:0,y:seen.vel.y}` instead of `{x:0,y:0}`.

The safety still keeps his installed depth, side and placement uncertainty, the
same aim-decision cadence, facing, speed budget, beliefs and transition rules.
Only the lateral velocity comes from the picture already consumed by that fit.
The back's forward velocity cannot pull the cap down toward the line. No new
sighting, random draw, hidden possession, live target velocity, future route or
cut is added. Contact, grip, locomotion and capacities are unchanged.

This also matters before a handoff is recognized. A player who believes run can
flow with a visibly moving back while keeping the roof on the fit. In A042 the
SS first changes at **0.50 s**: his run read is active and his consumed RB picture
is **0.20 s old, carrying=false, lateral velocity −0.392 yd/s**. This is an
uncertain observed run expectation, not privileged handoff knowledge. Existing
negative-possession, belief-expiry, play-action and throw-recognition priorities
remain in force; the new line does not decide whether the fit is called.

## What visibly improves

The earlier A042 cap requested too much motion toward the back's old lateral
position. By 2.30 s its SS was still travelling in the opposite lateral direction
from the acquired back. With the correction he has shed more of that momentum
before pursuit begins. The subsequent runner and helpers remain free to react.

| Case | First grasp, reference→candidate | Center separation | First grip and subsequent play |
| --- | --- | --- | --- |
| A042, Duo, S69 roster | 3.30→3.25 s | **1.690→0.863 yd** | SS stays upright, replacing a last reach/dive. Grip survives to the tackle at 3.75 s; reference grip slips after 0.35 s. Reference is unfinished at 4.10 s. |
| A006, Duo, fresh S30 roster | 3.25→3.20 s | **1.774→1.059 yd** | SS stays upright. Runner still breaks the first hold: survival 0.25→0.30 s. FS later finishes at 4.50 s versus reference 4.70 s. |
| A003, Wide Zone, different concept | 2.55→2.55 s | 1.082→1.082 yd | LB_M first wrap and 3.15 s finish preserved. Late bodies/finish position change slightly. |
| A008, actual Y/NB successful pass tackle | 2.50→2.50 s | 1.097→1.097 yd | Entire recorded frames, states and events match through the completed 3.85 s ending. |
| A020, actual H/CB_S broken-tackle control | 4.65→4.65 s | 1.312→1.312 yd | Entire recorded prefix/events match through 5.10 s, including the 5.00 s slip. Still unfinished. |

Distances use rounded event positions; they are not anatomical grip length or
transmitted force. Actual actors/IDs are retained in the [saved adjudication](../../data/reviews/current/alley-cap-motion/verdict.json.gz).
A042's runner is `S69O-RB1` (6), SS `S69D-S1` (21). A006 uses `S30O-RB1` (6)
and SS `S30D-LB1` (21). A003's first tackler is LB_M (15), not the watched SS.
A008 catches with Y `S30O-TE2` (7), not the intended H; its NB is `S30D-CB3` (19).
A020 catches with H `S74O-WR2` (10), approached by CB_S `S74D-CB3` (17).

The benefit is not greater arrival speed. A042 defender speed at first grasp is
about **3.60→3.00 yd/s**. Its fore/aft position relative to runner travel improves
from about **0.80 yd behind to 0.17 yd behind**, with a smaller lateral gap.
Travel-heading alignment itself does not improve. Position, velocity and leverage
need to be judged together; maximizing one speed or angle would miss this gain.

Keep the adverse and coupled evidence visible. In A006, FS acquisition is later
(**3.75→3.90 s**) despite the earlier final tackle; the first defender still loses.
In A003, the finish moves about 0.02 yd. A042's runner first changes at 2.60 s,
before contact, in response to the changed defense. These are matched inputs and
seeds, not frozen offense or an assertion that tackle execution draws stayed the
same. The improved entry is real; its complete ending is a coupled result.

## Why the late fixes did not solve it

Earlier changes treated this as an interception/gather problem at the last few
steps. The retained experiments distinguish the mechanisms:

- A continuous waypoint and a terminal-velocity formulation failed cheap
  unloaded, constantly replanned encounters. A consistent aiming point alone
  was insufficient. The reachability clock was not uniformly optimistic;
  replacing it on that assumption was not justified.
- High radial closure can trigger gather while the observed relative path still
  misses the hip. A gate-only correction passed 74 focused checks but worsened
  achieved probe geometry. Returning to the old far request did not fix the work.
- A moving-gather trial reached A020 at the same time with wider extension;
  A042 still took its last reach. An acquired alley-shoulder trial likewise did
  not improve entry. Both are preserved and normally reverted.

Those findings are reasons to fix the earlier moving-cap input, not to keep
tuning late gates, strengthen rear holds or force every contact to become square.
[Rejected evidence and limitations](../../data/reviews/current/approach-reassessment/receipt.json)
remain separate. The unloaded probes are not native tackle/force tests; their
geometric mirrors are not an exact symmetry certificate for all saved body fields.

## Evidence, pins and cost

Accepted/re-fetched `develop`: **`86250bb4f0c6f421878c204161864d523c3e30b6`** (#85,
#84-only). Accepted source SHA256
`dcebbee42fbe4cd64f603740d9b20bdf521ae424ad94e084eb46b30478b297e3`.
Correction authored at **`6bf7deb`**, executed host
**`e10e0cb526004afdcd1290daa0bdf5a72eae3462`**, candidate runtime source
**`c284f5e9bb2144fd7fa55c6df374d22ecbc9cfeb0d9ad3c0208f44bf7a319aae`**.
The independent production extraction must match these source/test bytes; no
other common/approach/shoulder trial is part of the candidate.

[Receipt](../../data/reviews/current/alley-cap-motion/receipt.json) supplies every
new launcher's source, settings, exact command, Node 22.23.3, operator/lock/input
hashes and runtime. All 44 accepted flags, including `RUN_CONTACT_COMPONENTS=1`,
and World defaults remain fixed. **101 unique focused checks and typecheck pass**:
reuse the compatible 97-check receipt plus four added moving-cap/information
checks. No full suite, build, game campaign or capability change.

Current continuation cost: **41.675 launcher-command seconds**, including rejected
probes/checks and saved reduction; **15.954 native seconds**. There are **20 native
executions / 79.9 simulated seconds**, of which 14 belong to the candidate,
early-cue witness and fresh reference. Each capture is an observed/plain pair
with exact full final signature (including RNG) and equal observation-call count.
The maximum opening is 5.10 s. Cross-source final RNG equality is not separately
established; it must not be inferred from the recorded-motion controls.

A042 uses the existing current-source reference from
`af57f2142dc994eb17d0e1a94f9782a690625598`. A006 collected one fresh reference
there; its complete recorded prefix also matches the old saved run. A003/A008/
A020 reuse compatible non-Duo evidence: #85's only runtime change is Duo's joined
combination guard. No new NFL data collection, download or duplicate panel.

The five original inputs come from Measurement's data-only artifact
`ebef199a3986b2749e5c8c86921cfd6c7e42b2b4`, archive
`accepted-7eb2554-48snap-v1.tar.gz`, SHA256
`60c4d4af04713583c19a59224831d9e89a48011cd4affaebd891cfe1e35f0919`.
Do not merge that artifact's ancestry. Restore the five `accepted-broad-audit/cases/`
files, verify the receipt's hashes and place the published gzip captures beside
them. The saved-only `scripts/diag/alley-cap-review.mjs` reducer in the research
branch runs zero ticks; every native reproduction command is in the receipt.

## Integration boundary and remaining work

Submit only `run-fits.ts`'s one-line alley velocity correction and the four new
contracts in `coverage-run-support.test.ts`, with this evidence. Run was consulted
on its owned alley branch; independent owner review remains required. Integration
owns one exact combined verification and adoption. No merge is performed here.

This repairs one general run-support execution error and transfers beyond the
selected ending. It does **not** solve A020 or establish league-wide YAC realism.
The larger lesson is to check the responsibility, its moving target and the
momentum accumulated before the interception. Remaining work includes useful
approach under changed cues, support after a loss and earlier passing coverage
positioning. Those need their own causes; they are not reasons to alter this
small correction or to import the rejected research branch.
