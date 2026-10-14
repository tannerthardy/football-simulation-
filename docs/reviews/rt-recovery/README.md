# RT recovery before runner traffic

Neither of the two permitted RT actions establishes better protection through
the runner's arrival. Keep both diagnostic and preserve production controllers.
D01–D03 are complete; D02, the initial D03 read, TE base and D04–D18 stay parked.

Accepted production is `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`, source
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
Use Node22.23.3 and the exact44 flags, including components1, in the
[manifest](input-manifest.json). Historical `4ded6b6` remains a separate law
comparison. Neither `develop` nor baseline/defaults changes here.

## Available cue and permitted action

At1.75 H leaves the double and RT becomes keeper. RT's acquired DE picture is
.25s old: velocity(-.916885,-.923719). His own velocity is(+.478375,-1.146024),
runner clearance2.7025yd, support up and existing anchor inactive. His actual
solo read chooses runoff: .634210yd required versus .138508yd estimated free
travel. That estimate excludes hand loads, turning and traffic; it is not a
loaded reachability proof.

His original contact request is(+2.059341,-.014130): nearly no world-lateral
flow despite the acquired wide-flow cue. Test one ordinary action for the
existing held read, with facing, push, posture and cutSkill unchanged:

1. **A: depth-neutral acquired flow**, requested(0,-.923719).
2. After A exposes a depth/traffic cost, **B: flow alone**, retain the original
   vx and request at least the held picture's playside vy.

Both start1.75, write five requests through1.95 and stop at the original
controller's renewed read2.00. The actual old `nextRead` is1.959534; it is not
a new release clock. Neither overrides an existing anchor or retries later.
All22 players remain present; runner decisions, perceptions, movement,
spacing, physical contact and every other controller run normally. No future
runner path is frozen. The complete35-tick state/RNG prefix matches the shared
reference exactly before each intervention.

## Achieved protection and traffic cost

| Measure | Accepted H | A: depth-neutral | B: flow alone |
| --- | --- | --- | --- |
| First DE/RB contact, controller-entry label | 2.65 | 2.80 | 2.65 |
| Contact depth relative to LOS, yards | -.23433 | -.64822 | -.16263 |
| First static corridor opening, completed boundary | 2.65 | 2.80 | 2.70 |
| RT x difference at boundary2.65 | reference | -.38988yd | +.00172yd |
| RB x difference at boundary2.65 | reference | -.53702yd | +.07679yd |
| Native ending | tackle3.25 | tackle4.25 | tackle3.45 |

The static corridor checks an expanded RT body against the straight DE–RB
segment. It is an approximate position measure, not a turn/acceleration/contact
interception planner or proof that hands deny the route. Event-entry labels
refer to the following .05s World interval; measurements at completed2.65 are
before the accepted2.65–2.70 carrier collision.

A really does retain a more useful screen, but DE is only .08701yd farther
back when RB is .53702yd farther back. First runner divergence is1.85: raw
request changes merely .00354yd/s, while RT traffic changes the final World
request by1.51268yd/s. The .05-age consumed RT picture reproduces the spacing
cut exactly: headway2.317682 versus stopping budget2.327786, requested closure
5.431972 versus allowed3.919556. Only RT causes this cut; baseline first brakes
at1.90. This is a real spacing response, not demonstrated bad runner reasoning.
There is no RT/RB body collision. Later A's end misses a tackle at3.20 and CB
finishes the play; its less-negative ending does not establish better blocking.
**Reject A for production: later contact comes substantially deeper, with a
runner-progress cost.**

B removes that large runner slowdown but changes RT's pre-contact position
very little: .00172yd more upfield and .02717yd farther inside at completed2.65.
It does not deny the end through arrival: actual carrier collision remains
2.65, with essentially unchanged RT hand means (N766.45,T471.52 over the contact
tick). It also introduces a small RT/H body impulse12.3635 at2.95; accepted H
has no offensive teammate body collision. This later traffic is not the first
cause of DE access, but it remains adverse evidence. **Reject B as a protection
fix.** The original successful Y and weak cases are preserved as references;
there is no promising H candidate to justify replaying Y. No transfer or
candidate-preservation claim is made without that test.

## What the earlier decision still leaves open

The first unresolved controller interface is now precise: the **first solo
runoff read and its loaded foot objective**, not a missing2.35 recovery or an
unproven initial RB mistake. With the retained oblique contact frame,
`lat.y=-.485643`; the contact controller's `abs(toPlay)>.5` gate skips its
playside-flow floor. Raw runoff requests can therefore have world vy against
the acquired wide flow (accepted2.00: vy+.102440 versus seen end vy-1.246422).
This explains a request inconsistency; neither one-beat counterfactual proves
that correcting that floor would protect arrival or preserve other regimes.

Any next investigation must decide whether sustained runoff, recovery toward
the acquired shoulder, and the runner's observed corridor are compatible under
load. It must preserve the acquired contact surface and normal-depth anchor.
Do not promote a universal flow floor, retime releases, strengthen grip, or
assign RB blame from these rejected alternatives. A failed pair of alternatives
does not show that no useful RT action exists. The current center-hand angular
accounting limitation also prevents certifying every loaded outcome as realistic.

## Guard and center technique

They are attempting recognizable wide-zone jobs, rather than all using one
downhill block. Strong C/LG combine on DT_W with different shoulder halves and
playside initial motion; C climbs and LG keeps the first level. RG uses a solo
moving-shoulder fit and reach/runoff/seal reads. He genuinely requests an anchor
when losing depth. In accepted H2.20 RG requests(+2.40,-.629) but achieves
(-.119,-1.359); at2.40 spacing changes the anchor before World executes it.
Weak LG is assigned directly to LB_M, so his track differs deliberately.

Those jobs do not establish correct protection. The early lateral step,
acquired leverage, loaded support and runner corridor all matter. Current
second-level acquisition can happen at strike distance before the climb
planner, and the climb planner forecasts a meeting/shoulder fit rather than
the runner's developing corridor. D02 preserves how earlier loaded contact
can be on the exposed side, but that parked intervention is not a new baseline
center error. LG's H2.15 reach estimate needs .818yd against only .047yd free
travel, then his2.40 read switches to runoff; he adapts, but execution remains
constrained. Source references: `blocking.ts` zone approach925, acquisition1096,
climb1140, zone read1166 and combination release1647; `engagement.ts` anchor1085.

The practical conclusion is mixed: the assignments and several technique cues
are football coherent; useful positioning and compatible runner routes are
still incomplete. A block assignment, loaded hands and a plausible request are
each insufficient to certify a good wide-zone block.

## Reproduction and verification

From this branch, use the original producer manifest and pinned runtime:

```sh
export PATH=/workspace/.cloud-tools/node22/node_modules/.bin:$PATH
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/rt-recovery/replay-a.json -- node --import tsx scripts/diag/zone/rt-recovery-counterfactual.ts uc12-wz-s3-mirror depth-neutral
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/rt-recovery/replay-b.json -- node --import tsx scripts/diag/zone/rt-recovery-counterfactual.ts uc12-wz-s3-mirror flow-only
```

Saved A was tested at `ecead111397529d2da701bba2b932180670e2a4f`; B at
`2b2707c7c63c20cc4c2b580b6313ab961662ab90`. The later CLI adds an action name and
output suffix; it does not change A's commands. All full profiles and prefix
hashes are checked. The shared accepted reference is reused, never regenerated.
Two native candidates end naturally; no game/census/miniature or full suite.
Offline assertions check command isolation, actual read boundaries, all22
profiles, finite state, support/posture, arm work/impulse, represented work and
whole-context linear impulse. Max work residual8.94e-12 and linear residual
1.59e-12; these checks do not validate the known angular law.

The receipt and portable download below contain exact revision/settings,
original cached traces and script fingerprints. The viewer compares full22
context only over their shared2.20–2.70 window; its position/request overlays
are recorded facts. Hand N/T values are signed tick averages, not final-substep
samples or proof of uninterrupted retention.
