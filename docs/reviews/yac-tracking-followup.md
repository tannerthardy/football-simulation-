# Recognition creates the tackle opportunity

**The strongest new result supports the existing isolated PR #58 correction.**
On newly captured, identical accepted-game P046 inputs, it changes a 50.06-YAC
touchdown into a tackle at −0.17 YAC. The actual receiver's full body history is
identical through catch, and recorded ball positions match. The corner avoids an unsupported run
commitment and arrives before the receiver can turn upfield. Physics, ratings,
grips and movement capacities are identical. This is a demonstrated mechanism,
not a newly fitted tackle probability or a certified league-wide YAC solution.

[Exact evidence](../../data/reviews/current/yac-arrival-followup.json) ·
[Frozen two-play inputs](../../data/reviews/current/yac-arrival-inputs.json) ·
[Existing isolated repair PR #58](https://github.com/tannerthardy/football-simulation-/pull/58)

Local saved native film: `out/yac-angle/native-film.html`. Six selections show
the baseline and recognition-only P046/P009 pair, the traffic-stop ablation and
the rejected broad interception probe. Exporting it simulates zero plays.

## What tracking says to inspect

The catalogued 2022 all-22 BDB2025 archive was restored and verified against
SHA256 `743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3`.
The raw archive is 1,219,840,421 bytes; raw tracking remains ignored. The first
four whole games in week1 file order were chosen before looking at outcomes:
2022091200, 2022091113, 2022091108 and 2022091112. Their **153 clean completed
catches** are a bounded diagnostic reference, not an estimate of the whole NFL.
The 2021 protection-only cutoff and selected-player 2023 air window are not
used to infer post-catch containment.

The same position operator measures actual catcher, nearest defender selected
once at catch, central-difference velocity over ±.1 s, subsequent proximity and
remaining defenders ahead. It preserves player identities. A different helper
arriving later cannot silently replace the original defender. It clips velocity
at the ending and reports shorter observation windows separately. Proximity
within 1.5 yd is **not** proof of a grip or a physical missed tackle.

| Median at catch | 153 NFL catches / four games | 189 accepted sim catches / four games |
| --- | ---: | ---: |
| Nearest defender gap, yd | 3.29 | 2.22 |
| Nearest defender speed, yd/s | 5.34 | 4.12 |
| Relative closing speed, yd/s | 3.14 | .30 |
| Relative transverse speed, yd/s | .78 | 1.49 |
| Receiver speed, yd/s | 4.83 | 4.12 |

The sim's problem is not simply that every receiver is too fast or every
defender too far away. Among catches with 1.5–3 yd initial nearest-defender
gap, **63/69 sim nearest defenders trail the receiver's direction of travel**,
versus **25/40** in this NFL reference. Restricting further to receiver speed
below 5.5 yd/s leaves 39/44 versus 11/25. Those are descriptive conditional
samples; route, talent, coverage and field-position mixes still differ.

Native sim film rounds positions to .1 yd, NFL positions to .01 yd. Native
events use tick-boundary precision. These limits affect fine velocity estimates;
the exact native traces below establish decisions and achieved movement. Early
whistles/out-of-bounds endings remain visible and are not counted as failures to
make contact during an unobserved future second. No published missed-tackle
probability model is used to decide what the sim should do.

## New exact native witness: accepted power-zone P046

Roster seeds 28101/28102, game703; Singleback Ace Stick versus weak-rotation
Cover9 match. QB targets H3-WR1/X; **actual catcher H3-WR2/H** catches at 2.85 s.
Actual first candidate tackler is **A3-CB1, slot CB_W, index18**. Slot FS/index20
is **A3-CB6** on this package; preserve this actual player's identity and
capabilities rather than substituting a nominal safety profile.

The unsupported baseline run declaration happens at .80 s. PR58 removes that
declaration; it does **not** supply perfect early pass knowledge. This corner
still does not declare pass until 2.65 s, compared with baseline's 2.60 s.
Remaining uncertain is more appropriate than committing to run on a slow upright
receiver. That earlier difference changes leverage while the routes develop.

| Measurement | Accepted `a1b16e6` | Isolated PR58 |
| --- | ---: | ---: |
| Receiver body history through catch | Identical | Identical |
| Recorded ball positions through catch | Identical | Identical |
| Corner gap immediately before catch tick, yd | 4.37 | 3.08 |
| Gap at 3.10 s, before attempted contact, yd | 2.51 | 1.14 |
| Actual receiver's first hold | None | Front form, 3.10 s |
| First solved load | None | 3.15 s, 1,728.59 kg·yd/s² |
| Loaded grasp retained through | None | 3.70 s / whistle |
| YAC / ending | 50.06 / TD | −.17 / tackle |

The candidate's initial front-position cosine is .799; initial leg coupling is
.532. The solved load is about 1,581 N after converting yard units. These are
observed geometry/load outputs, not modified grip capacities. The baseline's
earlier 2.30 QB contact is excluded from receiver-contact attribution. The
candidate gets the first defender into a useful form tackle; no late helper or
global grip-strength rule rescues this play.

## Controls, adverse evidence and discarded proposals

**P009 is an ordinary successful side tackle.** Actual catcher H3-TE1/Y;
actual first tackler A3-CB2/CB_S, index18. Baseline 6.351 YAC becomes 7.509 with
PR58. The catch stays at 2.60 s, first wrap at 3.05, but later help and runner
movement differ. First leg coupling is .319 versus .312; both initial loads
reach the same 1,239.10 capacity. Baseline LBM help arrives at 4.05; candidate
SS/FS/LBM help arrives at 4.95/5.15/5.35, with the tackle finishing at 5.40
rather than 4.80. This adverse +1.157 yd remains visible. Different subsequent
execution/geometry is not a matched-draw proof that every extra yard is deserved.

An initial label called P009 a rear control because the nearest defender trailed
at catch. Its **actual first tackler** enters from the side: front cosine .072
versus .042. The published input records this correction. The separate verified
rear control is reused from PR58: frozen experimental P041 setup transferred
onto accepted/recognition-only runtimes, actual A3-WR3 and H3-CB3. Its 3.8296 YAC,
rear form entry and all recorded solved grasp/support samples are identical.
It is not presented as the naturally occurring accepted game P041.

**Teammate traffic is a real secondary interaction, not the whole explanation.**
In baseline P046, the safety requests pursuit while spacing replaces it with
zero velocity at 3.40, 3.45, 3.50, 3.55 and 3.60. The forecast includes the corner
who has just missed. Restoring only that actual safety's own requested motion
improves his best gap in the first 1.5 s after catch from 2.85 to 2.72 yd and
avoids the later teammate collision; he still acquires no hold and the TD stays.
This bypass is a causal diagnostic, never a proposed production fix.

A first interception-direction probe was too broad: it also changed P009's
distant safety pursuit and conceded +.405 yd, without affecting P046. The
corrected probe is limited to existing full-gather, free-movement conditions,
preserves predicted attainable contact, and forecasts only already-consumed
receiver motion through ordinary World previews. It changes neither native
execution. Neither probe is promoted. No new arrival gate, fixed timer, speed
boost, physics change or helper assignment is added to production.

**PR61 alone preserves both native execution signatures exactly.** Its incidental
catch-readiness correction does not erase the P046 receiving opportunity in this
baseline. The combined #58/#61 runtime has not been checked here; Integration
owns its exact combined verification.

**Experimental spread/air P045 remains a plausible offensive win.** In the
recorded `f62511a` source, the FS stops for a reachable ball contest. Existing
defenderPlay rating calls confirm actual opportunities at 3.35 and 3.40; both
leave the pass intact. The receiver then outruns the trailing corner. This is
Quarters MOD match, not Cover0, and not proof that a defender chased an imaginary
interception. This new distinction uses the saved prefix rather than rerunning
it. P006's plausible completion and P010's interception remain historical
controls; they have not been renamed as new current-source measurements.

## Existing two-game transfer: movement quality improves too

Reused accepted and unchanged PR58 power-zone/spread-air games, not new games:

| Own-phase completed catches | Accepted pair | PR58 pair |
| --- | ---: | ---: |
| Count | 82 | 97 |
| Mean YAC, yd | 10.18 | 6.35 |
| p90 YAC, yd | 30.44 | 14.21 |
| 20+ YAC | 14 | 7 |
| Median nearest gap at catch, yd | 2.36 | 2.34 |
| Median relative closing speed, yd/s | .50 | .99 |
| Median transverse relative speed, yd/s | 1.44 | .86 |
| Trailing nearest defender in 1.5–3 yd gap cell | 29/32 | 25/33 |

The improved YAC distribution accompanies more useful arrival velocity/angle,
not just tighter separation. These selected game histories diverge after the
first changes; they are not independent league samples or matched per-play
treatment effects. Existing PR58 rushing and passing adverse evidence remains
part of its integration review. No new roster screen is required merely to
reuse those compatible measurements; fresh-player evidence remains separately
pinned in the original PR58 handoff.

## Big Data Bowl research that helps

1. **[Chang, Dai, Jiang and Cheng: Uncovering Tackle Opportunities and Missed
   Opportunities](https://github.com/mpchang/uncovering-missed-tackle-opportunities/blob/8b3de97f1e42351d14e5b69d8cb03f51f244806a/submission.ipynb)**,
   BDB2024. Separate creating an opportunity from converting it. Their nine
   features include relative speed, attack angle, forward space, team influence
   and blockers. This supports tracking lost opportunities before any reach,
   and explains why a nearby defender can still lack an opportunity. Their
   75%/.5-second opportunity definition and learned probabilities are analysis
   conventions, not engine timers or physical tackle laws. Training negatives
   on labelled missed tackles limits extrapolation to all open-field frames.
2. **[Le Cardonnel: Missed Opportunities To Tackle](https://github.com/MLecardonnel/ExpectedTackling/blob/5633eeadcab4f571842f90744585a8b7be85e776/README.md)**,
   BDB2024. Useful for separating an attempt from a closing-route opportunity
   lost without contact. Its later MOTT model uses subsequent distance and
   outcome features. Use that retrospective idea for diagnosis, not as live
   player knowledge of what will happen.
3. **[Closing Speed Index](https://github.com/zohebwaghu/NFL-Big-Data-Bowl-2026-CSI/blob/65d324758f27dea1a791574407fc7de764fb094f/README.md)**,
   BDB2026 university submission. Its proposed reaction/path/arrival split is
   useful for our measurement structure. The README's performance claims were
   not independently validated here. Actual eventual ball landing and an ideal
   straight line are retrospective references; players get acquired flight and
   physically attainable movement previews.
4. **[NFL's official account of 2026 winner Lucca Ferraz's Ghostbusters](https://operations.nfl.com/gameday/analytics/big-data-bowl/)**
   confirms comparison with distributions of hypothetical defenders during
   flight. This supports comparing plausible alternatives rather than forcing
   one universal outcome. The public GitHub method folder is empty and the
   Kaggle writeup fetched only its page shell, so no detailed method or trained
   model is claimed to have been reviewed or adopted.

No external model is trained, installed or used online. True all-player tracking
is diagnostic evidence; any future runtime rule must use only each observer's
acquired pictures, contact and installed expectations.

## Source, cost and handoff

Accepted develop remains `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`, runtime
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
PR58 tested code `dc0f104a588a486cdb38d97d1e5770dce1a3de61`, publication
`cb73b08177ba796b3963c91f7afc53beafe77cf8`, runtime
`03d8e3ea090db7cda6f6d46b4788682b6c9c4350b91ab890e72da50a248cc7ad`.
PR61 publication `351dcff82b96713b5abbc7602d9a051567d1b00a`, runtime
`35e05b815dc7aa5e7db7ba07e5acfab169c145fc9cde958a50cca3f96f5f7dad`.
Experimental P045 stays pinned at `f62511a` / `dd173a3e…`, evidence publication
`4ae667e29b3ce085f43c5cb911b294349cda2b8f`; no experimental runtime was imported.

Node22.23.3, all44 recorded flags including RUN_CONTACT_COMPONENTS=1; center
hands, centered integration, legacy support, per-solve work, speculative impacts,
mean support, bounded attachments and adaptive substeps. Receipts preserve exact
flags, inputs, operator hashes, compatible selector-only changes and all failures.

One necessary accepted-game prefix captures restartable P009/P046 inputs absent
from light film: 35 scrimmages, 6.55 s including restoration checks. Seven bounded
two-case arms include recorded/plain neutrality checks: 17.03 s internally.
Offline tracking extraction takes 11.66 s. All launcher commands total 37.74 s,
including the saved-cue diagnostic, syntax/export and initial unittest-invocation
failures. Three new measurement checks pass: actual-defender identity, end-window
censoring and mirror geometry. Prior #58/#61 focused runtime checks are reused.
**Zero new full games or full-suite runs.** No production engine source changes
on this research branch; no rejected probe, default switch or merge is proposed.

Integration should evaluate the isolated PR58 correction on its eventual exact
combined candidate, retaining P009's adverse finish, the rear control and existing
rushing evidence. Broader YAC remains open. The smallest next controller experiment
belongs with **Do-It-All!'s shared spacing/clearance work**: at P046 3.40 s, compare
the existing stop with physically feasible small detours around the acquired
corner picture, retaining momentum toward the carrier and a useful-contact
opposing control. Keep unavailable information unavailable and do not bypass
teammate safety globally. This branch supplies the exact bodies/cues/input
witness; it does not edit `spacing.ts`, carrier navigation or run blocking.
