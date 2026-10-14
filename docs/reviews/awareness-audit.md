# Awareness audit and future implementation note

Audit date: **2026-10-14, America/Phoenix**. This is a source audit of accepted
`develop` **`a1b16e666a9ee7d1bc1d2aecba141fc535863b24`**, runtime SHA-256
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
The historical `4ded6b6` review is not the current measurement. Candidate work
is listed separately below. No runtime, physics, ratings or tests change here.

## The finding

We have several useful local football models, but **no consistent boundary
between what exists and what a player has learned**. Latency often substitutes
for acquisition. A delayed oracle still knows things the player never saw.
Other leaks enter through target selection, private job/engagement bookkeeping,
global play events and future scouting. Removing direct position reads alone
will leave these paths open.

The goal is intelligent, incomplete knowledge: **players know their own team's
installed design and maintain uncertain expectations of teammate movement;
they revise their picture through legitimate observations, communication and
contact**. Correct perception can still lead to a mistaken interpretation or
physically unsuccessful action. Better IQ should improve key selection,
anticipation and response to ambiguity, not disclose hidden state.

This note inventories the main scrimmage decision paths, related event/learning
paths and abstract special teams. It is not proof that every indirect read in
the repository has been found, nor a population estimate of each defect's
football impact. Code-confirmed dependencies, model gaps and unmeasured risks
are distinguished. The main awareness backlog expands [INFO-003][issues-info3];
Architecture/Integration maintain the master issue register rather than treating
this detailed inventory as a competing global queue.

## Most valuable order

| Order | Bounded work | Why it comes here / stopping condition |
| --- | --- | --- |
| 1 | Establish the source/provenance contract and finish the run spacing boundary's interpretation | PR #36 provides an owned store, but PR #42 demonstrates that a nominal requested peer track is not achieved COM movement. Distinguish installed expectation, acquired motion and unknown velocity before trusting traffic forecasts. Do not tune vision or yielding to rescue gain. |
| 2 | Migrate one connected run decision chain | RB lead/surface membership → OL partner/collection cues → owned movement through an uncertain lane. Remove private membership tests as well as coordinate shortcuts. Preserve useful loaded work, stalled exchange, unseen cutback and already-clear-lane controls. |
| 3 | Give recognition and possession transitions a legitimate cue | Global handoff/throw/catch clocks currently let players identify an event without acquiring it. Keep each role's job until its own evidence permits transition; exact physical possession remains authoritative for resolution. |
| 4 | Repair protection and QB pressure/escape inputs | Private rusher type, live rep quality and perfect escape geometry can distort both pressure and time available to read. Diagnose information before changing pass-rush speed or physical capacities. |
| 5 | Resolve coverage's current integration contracts, then migrate coverage/help and option reads | Private QB read identity has an extracted correction, but PR #34 remains blocked. Stick has a separate candidate; seam remains a prototype. Do not combine them with a general awareness rewrite. |
| 6 | Add owned ball tracking, communication and bounded capability/scouting estimates | Needed for the global model, but can follow the first reusable run boundary. Start with coarse samples/events, not detailed eyes, online learning or a new physics world. |

These are recommendations, not permission to reopen every parked experiment.
Run Game owns controller changes, Awareness owns information interfaces/sensing,
Pass Game owns coverage/QB/route decisions, and Physics owns contact laws.
Integration decides the exact combined candidate and runs its full suite once.

## What players may know

| Knowledge class | Legitimate content | Boundary |
| --- | --- | --- |
| Public situation | Field and boundaries, down/distance, clock context, score, visible personnel/presentation | Actual opponent call, concealed rotation and private adjustments are not public. |
| Own installation | Called scheme, relevant teammate assignments, nominal landmarks/tempo, protection/exchange rules and authorized route alternatives | Shared design is not successful execution. A nominal lead is not a won block or completed handoff. |
| Personal picture | Samples the observer actually acquires, with sample and delivery timestamps, source and age | A fresh query cannot acquire an unseen body or fetch a newer historical frame. |
| Memory/expectation | Last observed motion, bounded projection, uncertain call-based region or branch hypothesis | Old velocity is not current velocity; an unknown speed must not masquerade as a stopped body. |
| Own feedback | Achieved position/velocity/support, felt loads, actual touch, personally executed/received exchange | Touch is local. It cannot reveal a remote teammate's exact grip, recovery deadline or intention. |
| Received communication | Installed audible or a modeled call actually received, with scope and latency | Changing a shared object or firing a global event is not evidence every player heard/saw it. |
| Scouting | Imperfect film-derived opponent tendencies and approximate capability estimates | Engine labels, exact current fatigue and hidden controller state are not scouting. |

Reality must remain available to World, ball/contact resolution, legal
eligibility, outcomes and diagnostic recording. A real body collision does not
wait for recognition. Likewise, self possession/contact can be known directly.
The defect is supplying that truth to a remote **choice**, or treating a
truth-derived label as evidence of acquired awareness. Do not remove physical
range/occlusion checks merely because they inspect actual bodies.
For example, [press contact in RouteRunner][press-contact] uses the corner's
installed press/man job to create the corner's own action. That is not, by
itself, proof the WR knows the defensive call. This shared controller/contact
boundary still needs a clear actor owner: CB press requests from his own job
and cues, WR release requests from his own picture/touch, then real joint
eligibility/load. Preserve legitimate jams and escapes rather than stripping
the contact machinery because it contains private own-team instructions.

## Detailed inventory: common infrastructure

Evidence labels below: **confirmed** means the code uses the named privileged
dependency or has the reproduced helper behavior; it does not establish its
frequency or causal share of football outcomes. **Gap** is a missing/limited
model, not a newly proven bug. **Latent** means a fallback exists but ordinary
activation was not demonstrated. Locations refer to the pinned develop source.

| Area / status | Source | Present limitation | Smallest useful next check / repair direction |
| --- | --- | --- | --- |
| General opponent picture — confirmed missing acquisition | [PlaySim.see:323][see], [PerceptionBuffer.perceive:83][perceive] | Every requested opponent has a delayed full picture. No unavailable result, field-of-regard or occlusion is required; “peripheral” normally just adds delay. | Advance a wholly hidden target's motion while holding acquired state fixed. Requests/estimates must stay invariant; genuine later sight must update after delivery. Implement sampling once at sensing boundaries, pure queries and bounded memory. |
| Teammate picture — confirmed oracle | [PlaySim.see:324][see] | All teammates refresh at .05 s regardless of where the observer looks. PR #36 changes spacing only. | Migrate named consumers to the owned query, including unavailable/remembered opposing controls. Do not claim the legacy same-team feed is repaired. |
| Installation/presentation — gap | [assignment:25][assignment], [QB initial memory:186][qb-initial], [receiver-start memory:69][release-read] | Pre-snap bodies are broadly assumed acquired; QB memory is exact even though the classification picture includes error. Some installed target selection uses complete live geometry. | Declare a legitimate presented pre-snap picture and what the call actually installs. Own call/roster identities are legal; hidden moving presentation and unacquired targets require evidence. Preserve useful installed matching rather than banning centralized pre-snap coordination. |
| Workload/attention — confirmed unowned input | [PlaySim.tick:543][workload], [SnapMind:47][mind] | All opponent histories within 3 yd contribute to stress/focus without acquisition. Thus hidden motion can change later latency/choices even after a query itself is repaired. | Hold own load/energy and acquired picture fixed; hidden congestion must not change mind state. Use own touch and acquired nearby congestion, not an omnidirectional radar count. |
| Query-dependent interpretation — reproduced, caller-dependent | [RouteObservation.read:12][route-observation] | It updates `previous` on every read. Same cue/time can erase the braking estimate. ReleaseReader's per-tick cache protects that caller; normal duplicate reads elsewhere were not established. | Owned interpretation update once per acquired sample/boundary; repeated queries return cached/copied state. Preserve existing safe `recorded*` methods. See the tiny counterexample below. |
| Acquisition/prediction timestamps — gap | [QB memory:394][qb-memory], [PerceptionBuffer:85][perceive] | Several clocks represent decision time, sample age or an extra peripheral offset differently. A refreshed memory timestamp can obscure the underlying sample latency. | Use `sampledAt`, `availableAt` and `lastInterpretedSample` separately; retain pending old samples after sight loss. Do not add another prediction correction to an already dead-reckoned position. |
| Capability knowledge — confirmed exact input, impact unmeasured | [Agent.speedScale:194][speed-scale], [pursuit prediction:98][pursuit-profile], [QB window:416][qb-window] | Decisions often read the opponent's exact physical limits and live fatigue/squeeze multiplier. Public size and approximate speed are reasonable priors; exact hidden current capacity is not. | Freeze a taught/scouted estimate, vary hidden actual fatigue/capacity while holding cues fixed, and separate altered physical execution from altered requests. Use coarse bounds/stable estimation error; never grant a physical boost. |

## Detailed inventory: running, blocking and teammate coordination

| Area / status | Source | Present limitation | Smallest useful next check / repair direction |
| --- | --- | --- | --- |
| Spacing/called motion — confirmed value/availability leak | [spacing adapter:585][spacing-adapter], [calledMotion:738][called-motion], [zone track:925][zone-track] | The adapter starts from unrestricted teammate state; `track` is cleared/re-enabled by live controller execution. Even a nominal-looking value can expose a private branch through availability. | Reuse INFO-001/002 and PR #36: install copied expectations once, independent of live position, engagement and private behavior; query without side effects. |
| Meaning of installed motion — observed candidate risk | [PR #42 opening diagnosis][opening] | Honest installed tracks can still be interpreted as precise attained velocity. Early self requested movement vs nominal peer COM motion creates a misleading traffic forecast. PR #36's zero velocity after prediction expiry also lacks an explicit unknown-velocity type. | Keep expected region/tempo separate from acquired position/motion. Evaluate achievable self motion against every acquired peer; retain the RG and TE opposing witnesses. This is an unresolved forecast/information contract, not proof of a sensing or solver defect. |
| Live surface membership — confirmed private filter | [live-gaps.departed:61][live-gaps] | A delayed line picture is classified using `!b.agent.engagement`. With identical observed geometry, hidden engagement can change whether a body bounds a gap. | Hold sampled bodies fixed and toggle remote engagement; gap membership/width must not change. Infer departure from observed movement/contact, with aging uncertainty and installed surface expectations. |
| RB threat set, lead pacing and squeezing — confirmed mixed information | [carrier:165][rb-lead], [carrier:244][rb-squeeze], [carrier:287][rb-threats] | Leads are filtered/sorted by true down/engagement/position before `see`; threats use live range/behind filters, remote rep quality and speedScale. The squeeze body's down membership is live. | Test **which bodies enter the choice**, not only their returned position. Retain legitimately acquired penetration, visible down/recovery, clear lane and costly cutback controls. Migrate the actual selected chain with Run Game. |
| QB slide danger — confirmed live threat geometry | [carrier:199][qb-slide] | A scrambling QB's slide decision computes threat arrival directly from current opponent bodies/capacities. | Same acquired danger vs hidden motion invariance; visible fast approach must still permit a timely slide. Preserve self ball/contact knowledge and physical ending rules. |
| Handoff job initialization — confirmed private/live selection | [onHandoff:285][handoff-jobs] | Receiving the ball correctly changes the recipient's role, but `follow`, kick identity and the duo-like key are re-discovered from mutated teammate jobs and actual defender positions. | Install expected leads/keys from own design/presentation; choose later replacements only from recipient evidence. Do not certify block success or possession from a call expectation. |
| Mesh movement guard — confirmed teammate truth gate | [QBHandoff:634][mesh-guard] | QB lead movement consumes `see`, but whether it activates depends on RB's actual distance from the mesh. Handoff reach itself is legitimate physical eligibility. | Hide RB motion with unchanged acquired picture: **requested ride** stays invariant; physical exchange may still succeed/fail from reality. Keep the two questions separate. |
| Stalk movement — confirmed direct target truth; isolated correction prepared | [RunBlocker:866][stalk] | Movement fit uses live defender coordinates. Contact eligibility and movement request need distinct inputs. | Reuse [STALK-001 / PR #29][stalk-pr]: substitute the acquired picture only. Keep the stale-picture loss of lateral speed visible; moving-target policy is a later question. |
| OL spacing/retarget/collection — confirmed private selection | [zone partner:951][zone-partner], [availableTarget:980][retarget], [readRules:1228][ol-switch], [findWork:1268][find-work] | Partner location, remote engagement/down state, adjacent private plan, live carrier position and mutable jobs determine shoulder, work availability or exchanges. | Vary remote hidden state while preserving installed responsibilities and pictures. Maintain private own job/touch; replace inferred teammate success with observed relation or received call. Test an ordinary maintained block and a genuine visible takeover. |
| Combo/helper security — confirmed remote contact bookkeeping plus useful local reads | [collection contact:1342][combo-contact], [joined picture:1469][combo-picture], [unjoined:1589][combo-unjoined], [helperFit:1224][helper-fit] | Personal delayed pose/torso reads exist, but some gates inspect remote hands in World, shared combination mutation and exact teammate/contact ownership. Runner arrival uses unrestricted teammate `see`. | Preserve the achieved own loaded hold. Separately test hidden adjacent hand existence, keeper success and runner motion; a helper may not send its partner away solely because the helper saw a cue. Installed pairs are allowed; dynamically successful work requires evidence. |
| RB read experiment — confirmed debt, **RUN_READ off** | [run-read:89][run-read-keys], [risk:132][run-read-risk], [unsafe:231][run-read-unsafe] | Private down/engagement filters identify keys, assign blocker relationships and discount threats. READ_EYES changes delay without imposing acquisition. | Keep parked status. Before promotion, require key/relationship membership invariance and unknown inputs; do not import disabled read policies into the production audit as current outcome causes. |
| Contact-controller transitions — confirmed global-event dependency, mixed boundary | [engagement:675][engagement-events], [runContactRead:811][dl-read], [DL_FIGHT:1156][dl-fight] | Global release clock ends pass reps; handoff/scramble/actual carrier selection changes contact tasks. Some DL flow uses a delayed picture after choosing the true carrier; DL_FIGHT is off. | Preserve actual joints/loads and physically necessary cleanup. Determine which conscious release/flow requests need owned recognition; local touch cannot disclose a remote exchange. Do not reopen hold/ground physics to solve this inventory. |

## Detailed inventory: passing, coverage and ball awareness

| Area / status | Source | Present limitation | Smallest useful next check / repair direction |
| --- | --- | --- | --- |
| Private QB read identity — confirmed live policy input | [ZoneCoverage:431][qb-eyes], [spot:619][spot-eyes] | `sim.qbEyes` names the receiver the QB selected. Following that identity leaks intent even if the defender then asks for a delayed receiver position. Some branches also use that receiver's live position. | Different private reads with the same acquired QB orientation must produce the same coverage request; visibly acquired orientation may influence a region. Reuse the extraction, but PR #34's two preserved contracts remain blockers. |
| Option-route conversion — confirmed true coverage plus random label flip | [RouteRunner:125][option-truth] | The receiver reads `sim.defAlign.coverage.man`; a random misread does not turn true-call access into perception. | Shared installed decision rule with separate WR/QB pictures, confirmation and commitment. Both can be right, wrong, early or late. Reuse Stick-only evidence; seam/post/corner generalization is separate. |
| QB receiver intent/prediction — confirmed private executed route access | [QB ready:322][qb-ready], [evaluate:364][qb-predict], [release:490][qb-release], [RouteRunner.predict:345][route-ghost] | QB inspects live behavior/break time and forecasts the receiver's current private path/index/converted branch; re-aim at release can silently restore perfect agreement. | Predict from copied installed route alternatives and the QB's own acquired receiver declaration. Hidden private conversions, stops and execution draws must not change that expectation without a cue. Preserve legitimate anticipatory throws and disagreement outcomes. |
| QB gaze/availability — confirmed teammate live/private dependencies | [gazePoint:313][qb-gaze], [evaluate:363][qb-predict], [init/order:115][qb-init] | Looking at a known read uses live receiver position; options are rejected from current remote down/engagement/behavior. Initial installed eligibility is reasonable; changing live availability is different. | Known landmark/memory aims the look, real sensing determines success. Vary hidden receiver state; visible release/down/contact must still change decisions appropriately. |
| Protection identification and dispatch — confirmed central oracle | [isRusher:51][protection-rushers], [update:123][protection-dispatch], [set:264][protection-set] | Rush/blitz controller type identifies attackers. Live positions, engagement and private teammate release state drive declaration, reassignment and help; each blocker's set reads the live rusher and QB. | Preserve a copied installed count/slide/launch landmark. After snap, perceived penetration/rush declaration and bounded communication authorize updates. Show hidden rush/drop intent invariance, a visible delayed threat and real twist/check-release opposing controls. |
| QB pressure, escape and pocket movement — confirmed live/private inputs | [pressure:333][qb-pressure], [window:418][qb-window], [scramble:535][qb-scramble], [evade:555][qb-evade], [pocket:575][qb-pocket] | Live rep `win`, engagement, position-dependent blind classification, exact current distance/capacity and perfect escape threats affect choices. Pocket presence is not an exact remote-contact sensor. | Use acquired movement/observed blocking geometry, own load and a coarse danger forecast. Keep legitimate blindsides and genuinely protected pockets. Judge time to danger and actual contact, not just sacks or release-time averages. No new pressure policy was installed. |
| QB belief/prior/expiry — confirmed/latent mixture | [canon:184][qb-canon], [memory/estimate:415][qb-memory], [expectedPos:456][qb-expected] | QB-owned memory is useful, but canonical hypotheses inherit the actual front; expected man position reads actual teammate position. Missing-memory and no-hypothesis fallbacks fetch `see`/truth; ordinary fallback activation was not shown. | Build hypotheses from owned presentation/scouting. Keep memory/projection age, unknown and expected regions distinct. Test hidden true front with identical presentation and unacquired teammate movement; mark latent fallback controls explicitly. |
| Recognition of release/exchange — confirmed event oracle | [Recognition:210][recognition-events], [run/pursuit:42][live-pursuit], [rush:81][rush-events] | Throw/handoff timestamps give definitive evidence after elapsed delay without an acquired cue. Rushers can switch on actual carrier/air state; `sim.isPass` also appears in fallback beliefs when Recognition is absent (latent in ordinary initialized plays). | Owned visible arm/ball/exchange cue, uncertainty or a legitimately received alert. Preserve wrong-but-reasonable play-action reads, not a forced fixed post-catch wait. |
| Coverage route inventory — confirmed universal delayed access; gap in attention | [ZoneCoverage:394][zone-reads], [ReleaseReader:88][release-read] | Defenders read every eligible route before band/rule filtering. Relative release inference is preferable to private route inspection, but the underlying pictures were not acquired. | Install role keys and one justified secondary look; interpret acquired releases at their timestamps. Retain primary vertical duty while missing a peripheral cue, and allow visible motion/crossers to renumber. |
| Help/cap picture and technique geometry — confirmed teammate oracle/live QB | [hasVisibleCap:95][coverage-cap], [showsBlock:14][block-cue], [techniques:74][coverage-techniques] | “Visible cap” reads any teammate through the unrestricted feed; several techniques use actual QB position while receiver motion is delayed. | Cap is a personally learned possibility, not guaranteed future arrival. Hidden helper movement must not change the read; seen departure must revoke it. Use a QB picture/installed launch region for geometry. |
| Secondary pursuit containment — gap | [chase:206][chase], [run fits][run-fits] | Installed force/cutback duties and sideline leverage exist; generic pursuit largely predicts one carrier independently rather than retaining uncertain help/escape-lane responsibilities. | First miss plus one helper: protect the distinct lane using own evidence/installed support, then allow a visible cut or teammate failure to change it. Keep legitimate offensive escape and ordinary successful rear tackles. No global grip strengthening. |
| Global catch/turnover/recovery reassignment — confirmed identity/event shortcut | [onBallCaught:308][catch-event], [onInterception/onRecovery][catch-event] | All other players immediately become downfield blockers/pursuers at the physical event. The actual holder is supplied without acquisition; delayed coordinates do not hide identity. | Catcher/receiver of the exchange knows locally; others retain responsibility until their cue. Test hidden holder identity/turnover, actual nearby cue and later rally. The previously parked catch-identity finding remains a separately scoped change. |
| Targeted throw notification/route finish — confirmed private target shortcut | [onThrow:304][throw-event], [RouteRunner:120][route-finish], [TrackBall:402][track-notify] | Only the intended target is assigned tracking and marked `onBall`; others slow on the true target identity. ReactionAt starts from the release event, not sight. | Observe throw/ball/receiver cue independently of intended target ID. Retain full decoy responsibility before evidence and competing/off-target catches; do not notify every player with exact target identity. |
| Ball flight/path — confirmed perfect live trajectory access; gap in sensing | [catchSpot:460][catch-spot], [observedCatchWindow:807][catch-window], [playBall:750][play-ball] | Receiver/defender planning consumes the complete current `sim.ballPath` and flight state. A reachable interception forecast is useful, but “visible” flight is not backed by an owned ball sample. | Date ball observations and infer bounded flight from acquired position/motion; no hidden target/launch-error/deflection access. Preserve attainable contests and a late/missed reacquisition after a tip. World still integrates the real ball. |
| Throw recognition and enduring looking tag — confirmed/gap | [sawThrow:714][saw-throw], [playBall:755][play-ball], [facingBall:30][catch-facing] | Facing changes reaction speed, but elapsed release eventually confirms even an unseen throw. Per-tick look attempts set a tag that bypasses subsequent facing checks without an owned tracking picture. | Coarse deliberate attention, acquisition and loss/reacquisition. A head glance need not rotate hips, but must fit attainable view and spend an opportunity. Avoid manufacturing endless per-tick bust/noise rolls. |
| Catch reach/height awareness — mixed resolution boundary | [catch opportunities:57][catch-envelope] | True ball/torso geometry is legitimate resolution. Extra reach/leap “tracking” also depends on intended target identity or semantic tags; that awareness/technique privilege is a separate input. | Own tracking/hand action should authorize the conscious technique; actual geometry still determines whether it catches. A competing receiver may acquire the same ball; the intended receiver may not. Preserve physical catch/INT eligibility. |
| Tackle choice vs contact — mixed resolution boundary | [tryTackles:95][tackle-choice], [preview:123][tackle-preview], [updateBond:369][bond] | Actual contact range/load/grip belong to execution. Pre-grip wait/lunge choices combine true carrier identity/live closing with a useful acquired-picture movement preview. | Separate acquired intent from true contact eligibility; hidden motion outside acquired cues cannot change a requested reach/wait. Actual contact and local holder feedback remain real. Leave physics and prolonged/ground holds parked. |
| Open-field blocks and claims — confirmed live/private selection | [DownfieldBlocker:482][downfield], [pickBlockTarget:512][block-claims] | Actual carrier/defender movement and private teammate target claims select a block. This can avoid duplicates through telepathy and react to hidden escapes. | Installed support lane, acquired threats and coarse received/visible claims; preserve duplicate-block risk when players genuinely miss each other's cue. An immutable installed claim is different from a live private target. |
| Loose ball/fumble response — confirmed global event/coordinates | [onLooseBall:323][catch-event], [FumbleScramble:857][loose-ball] | All players switch and chase exact live loose-ball position/velocity; recoveries likewise reset jobs globally. | Local touch/visible loose ball or received alarm, aging search region when unseen, actual reach/recovery in resolution. Near fumbles and obstructed/distant pursuit should differ. |

## Learning, simplification and all-role coaching

**Future scouting also needs an information boundary.** [Game:570][game-scout]
feeds defending run/pass scouting the actual called kind, and offensive coverage
scouting the exact opposing call. [CoverageScouting:69][coverage-scout] records
the true coverage and true disguise relationship. This is a confirmed input
dependency, not an in-play leak measurement. Coaches may learn from film, but
should receive an imperfect inferred classification/observable tendency with
confidence, not opponent playbook labels as ground truth. A scramble or very
early sack can remain ambiguous. The existing shrinkage toward priors is useful.

[Defensive playcalling:281][defensive-caller] receives offensive personnel and
selected players, not the offensive concept itself; those public personnel
inputs are legitimate. Coach matchup scoring uses exact ratings as an abstraction:
prefer bounded scouting estimates if management knowledge is later modeled, but
do not call ordinary roster/personnel selection a live-awareness defect.

[Special teams][special-teams] currently use ballistic kick checks and aggregate
return/coverage outcomes rather than player controllers for all 22 bodies. Gunner keys,
returner ball acquisition, fair-catch decisions and lane coordination are
**not implemented in this model**. That is a declared scope/realism gap, not
proof special-team players are reading hidden positions. Keep a future special
teams project distinct from fixing scrimmage awareness.

Each role needs a small installed key progression, not every possible cue:

| Role | First useful keys | Conditional next look / smart expectation | Legitimate failure |
| --- | --- | --- | --- |
| QB | Own protection/mesh key; relevant shell/conflict defender and called receiver progression | Anticipate taught landmarks/branches; update receiver intent and pocket danger from own evidence | Receiver declares differently, blindside arrives, disguise defeats the prior or windup commits before new evidence. |
| RB | Exchange, controlling block/near defender, expected lead and next fitter | Press nominal lane, then revise from penetration/leverage; a puller's expected arrival is not earned clearance | A stalled exchange, unseen backside threat, late cut or wrong block interpretation. |
| OL | Near DL hip/shoulder and felt load; installed partner/backer and runner lane | Look–lean–climb or retain block only from own confirmation/received exchange; anticipate traffic without an exact unseen RB | Missed slant, aged keeper picture, rear traffic outside attainable view, good request defeated by load. |
| TE/FB | Called slice/kick/lead surface and crossing traffic | Kick/log/wrap alternatives from acquired squeeze/leverage, then next fitter | Blind crossing traffic, blocked vision, a failed kick mistaken for a usable entry. |
| WR | Release/leverage of assigned defender, taught option conflict/help key | Own local sit/out or seam/middle alternative; continue responsibility until acquired throw/ball/runner cue | Different QB picture, trap/rotation, commitment before help becomes visible or ball found late. |
| DL | Blocker's acquired step/hat and personally received load; own gap/rush/contain | Stack, shed or pursue from declared runner/ball evidence while respecting installed fit | Convincing play action, opaque mesh, a pull noticed late or lost leverage during actual execution. |
| LB | Installed guard/tackle-to-back key with eligible obligation | Stack/scrape/exchange from observed pull/down/release; expect teammate fit without certifying his win | Secondary cue missed while on primary, false key, stale support or a late recovery step. |
| DB | Receiver distribution/leverage and own deep/help obligation | Relevant QB/ball glance and conditional run support; preserve vertical duty until a permitted cue changes it | Look-off, late throw acquisition, unseen helper departure, conflicting route declarations. |

Useful simplifications:

1. **One observer-owned evidence layer, many small role interpretations.** Reuse
   the common store/timestamps and acquisition scheduler; keep QB beliefs,
   release declarations, run reads and contact technique as interpretations.
   Do not collapse every role into one generic chase behavior or rewrite all
   consumers at once. `ReleaseReader` caching and owned joined-combo reads are
   useful patterns to retain.
2. **Own call is an installed contract, not a live behavioral getter.** Copy
   nominal jobs/alternatives once. Separate “expected,” “observed,” “remembered,”
   “tactile” and “unavailable,” including known location with unknown velocity.
   Use a range for old/called expectations rather than inventing exact bodies.
3. **A primary key and a justified secondary glance usually suffice.** Coarse
   torso/travel/attention separation, field of regard and solid-body occlusion
   can support the first experiments. No anatomical eyes or detailed head rig
   is required. Published cones/timing are assumptions, not measured NFL facts.
4. **Read local leverage/distribution, not an obligatory exact coverage name.**
   A Stick or seam answer can depend on a conflict defender/deep help. QB and
   receiver share coaching but use separate pictures, so disagreement emerges
   without a random assignment-bust switch or perfect private-branch copying.
5. **Keep stable error, finite reassessment and hysteresis; reduce duplicated
   penalties.** Reaction delay, focus, recognition, confirmation and held-action
   cadence are different stages. Before adding another IQ scalar/timer, identify
   the missing stage. Ratings should affect acquisition/interpretation/control,
   not always-perfect reads or free movement capacity.
6. **Model communication as small received events.** A protection ID, exchange
   call or audible can update a responsibility. It need not simulate language;
   a scoped source/time/recipient receipt is enough. It cannot transmit exact
   current teammate COM, private future cut or solver grip state.
7. **Use one short prediction convention.** Preserve old observed velocity as
   history, mark current motion uncertain, and cap projection. Exact opponent
   capabilities and full live ball paths should not silently substitute for
   missing evidence. Use existing own-body preview machinery for feasible
   requests; forecasts do not guarantee contacts or future decisions.

## What is already repaired or prepared

These dispositions were checked against remote `develop` and published PR
heads during this audit; they are not merge authorization.

| Contribution | Current disposition / scope |
| --- | --- |
| Accepted moving catch approach, PR #12 | Already in `a1b16e6`. Preserve attainable ball contests and moving arrival. It does not fix global catcher identity or general acquisition. |
| [PR #29][stalk-pr], head `b8e4d86` | Isolated stalk request correction prepared;29 focused cases/typecheck and adverse stale-picture evidence. It does not migrate target availability, broad stalk policy or general vision. |
| [PR #34][coverage-integration], head `306579f` | Current-source stalk/coverage extraction **blocked** by COV-001 seam-gap margin and COV-002 native scramble fixture contract. Do not repeat the full suite or relax assertions merely for this audit. The earlier coverage extraction recommendation is superseded by this hold. |
| [PR #36][teammate-pr], head `6828467` | Bounded spacing information repair prepared; 37 focused cases/typecheck, native adverse Y collision retained. Other same-team consumers remain unrestricted. Football promotion held. |
| [PR #41][model-pr], head `6600136` | Own-team knowledge/all-role model plus zone-OL primary/glance pilot. Default off;17 final focused cases/typecheck and neutral disabled controls. Unattainable selected look correction helps a local cost, but no useful pre-contact coordination/fresh native transfer. Global workload and legacy consumers remain. |
| [PR #42][opening], head `f2dd561` | Run Game's opening diagnostic on accepted/#36 sources; no production correction. Nominal-peer/achievable-self forecast contract is the next shared boundary question. Reuse its exact TE/RG/all22 witnesses. |
| Stick-only, `f77b540` | Separate older-source candidate with separate receiver/QB expectations and limited information repair. Requires current-source review; does not clean every option/non-option prediction path. |
| Seam/middle read, `91279f1` | Development prototype; selected seam/post witnesses exist, but head/acquisition, fresh post transfer and call-menu effects remain limited. Corner conversion is not installed. |
| QB pressure research, `2f080ec` | Historical research/diagnosis only. No production pressure policy. Prior clean-release median 2.40 s is historical evidence, not a newly measured current baseline. |

The [pass handoff][pass-handoff], [all-role model][all-role-model] and
[master register][issues] preserve source-pinned evidence and owner return
conditions. The audit does not merge them, reopen prolonged holds/ground holds,
change rosters, or import old diagnostic ancestry.

## Small checks future workers should supply

For each named consumer, choose one question and the smallest meaningful
reproducer/opposing control. This is a reusable menu, not a mandatory ladder:

- **Hidden reality invariance:** hold installation, acquired samples, received
  communication and own state fixed; advance actual hidden motion/possession/
  private branch. Compare candidate membership, look request, interpretation,
  requested movement and RNG, not just final gain. Keep acquired and tactile
  controls so a no-response implementation cannot pass by doing nothing.
- **Legitimate contradiction:** a visible cut/slant/help departure arrives on
  its actual timestamp; memory/expectation may be wrong until then. Unavailable
  never falls back to truth. Called availability must also stay invariant.
- **Attention cost and geometry:** primary evidence ages during a secondary
  look; pending old samples can still deliver. A requested look may miss, be
  blocked or be unattainable. Diagnostic truth explains the failure but never
  secretly chooses the look. Preserve attainable fringe searches.
- **Communication/identity:** hidden catch/turnover/option choice is not a
  broadcast; a local exchange or received alert is. Freeze nearby identities
  and support obligations instead of changing targets to match an ending.
- **Physical outcome:** trace consumed evidence → objective → request → achieved
  movement → actual contact/load/recovery. Preserve good blocks/tackles,
  legitimate offensive wins and adverse/inconclusive endings. A changed score
  or YAC total is neither proof of improvement nor automatic failure.
- **Recording/query neutrality:** queries and observation logging do not sample,
  reinterpret a cue, deliver early or consume RNG. Reuse compatible evidence;
  make a full native recorded/plain check only for a specific unresolved risk.

Broaden to selected fresh players/plays only after the mechanism works and a
named transfer risk remains. Stop dependent work on a correctness blocker;
continue independent audits/diagnosis. Keep exact source, flags, inputs,
measurement tool and costs. Integration owns one preserved full-suite run on
the exact combined candidate. No worker needs a game campaign to remove a
local hidden-information dependency.

## Evidence and reproduction for this audit

This pass ran **zero World ticks, native plays, fresh transfer screens, games
or code suites**. The source inventory and branch dispositions are read-only;
they are not measured outcome frequencies. One 0.193-second helper probe resolves
whether same-boundary `RouteObservation` reads can be query dependent:

| Same acquired input | First interpretation | Repeated interpretation |
| --- | --- | --- |
| Speed 6 → 4 yd/s over .10 s, sample age .20, horizon .20, confidence 1, braking bound 6 | Returned x velocity 1.60 yd/s | Returned x velocity 4.00 yd/s |

Both calls consume the same cue/time. The second call overwrites the prior
timestamp and loses deceleration. This confirms the helper counterexample;
it **does not prove a normal uncached duplicate caller or existing recorder
changes gameplay**. `ReleaseReader` already caches per tick, and `recordedReads`
copies cached declarations. That safe distinction should survive migration.

The [probe][probe] is a diagnostic that asserts the documented defect exists,
**not a passing correctness test**. The [receipt][probe-receipt] retains exact
input, result, runtime/validation hash, all 44 accepted flags, World defaults,
tool hash, observed PR heads and launcher cost. Running it after a future
repair should stop reproducing this witness; update the audit accordingly.

With Node 22.23.3 and dependencies installed, from the pinned source:

```sh
npm run baseline:info -- --candidate
npm run baseline:run -- --candidate -- node --import tsx docs/reviews/awareness-audit/route-observation-probe.mjs
```

`--candidate` is necessary because the retained baseline config still pins the
historical engine, although accepted develop is `a1b16e6`. The published
launcher receipt uses the existing cloud workspace's absolute tsx loader path;
the portable command above uses a normal local dependency installation.
No baseline/configuration was rewritten to make the source match.

[issues]: https://github.com/tannerthardy/football-simulation-/blob/0b6c35317c3d89e99265e93a756ece5053e71e77/docs/ISSUES.md
[issues-info3]: https://github.com/tannerthardy/football-simulation-/blob/0b6c35317c3d89e99265e93a756ece5053e71e77/docs/ISSUES.md#INFO-003
[stalk-pr]: https://github.com/tannerthardy/football-simulation-/pull/29
[coverage-integration]: https://github.com/tannerthardy/football-simulation-/pull/34
[teammate-pr]: https://github.com/tannerthardy/football-simulation-/pull/36
[model-pr]: https://github.com/tannerthardy/football-simulation-/pull/41
[opening]: https://github.com/tannerthardy/football-simulation-/pull/42
[pass-handoff]: https://github.com/tannerthardy/football-simulation-/blob/b890686a507a06959337bb9425e2550337d5a1a3/docs/reviews/pass-game-integration-handoff.md
[all-role-model]: https://github.com/tannerthardy/football-simulation-/blob/66001360bd03a842679433805d88bc20fc8b689e/docs/football-handbook/player-awareness-model.md
[probe]: awareness-audit/route-observation-probe.mjs
[probe-receipt]: awareness-audit/probe-receipt.json
[press-contact]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/receiver.ts#L262

[see]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/playsim.ts#L323
[perceive]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/perception.ts#L83
[assignment]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/assign.ts#L25
[qb-initial]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/qbmind.ts#L186
[release-read]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/coverage/reads.ts#L69
[workload]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/playsim.ts#L543
[mind]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/mind.ts#L47
[route-observation]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/coverage-read.ts#L12
[qb-memory]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/qbmind.ts#L394
[speed-scale]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/agent.ts#L194
[pursuit-profile]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/common.ts#L98
[qb-window]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/qb.ts#L416
[spacing-adapter]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/playsim.ts#L585
[called-motion]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L738
[zone-track]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L925
[live-gaps]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/live-gaps.ts#L61
[rb-lead]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/carrier.ts#L165
[rb-squeeze]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/carrier.ts#L244
[rb-threats]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/carrier.ts#L287
[qb-slide]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/carrier.ts#L199
[handoff-jobs]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/assign.ts#L285
[mesh-guard]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/qb.ts#L634
[stalk]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L866
[zone-partner]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L951
[retarget]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L980
[ol-switch]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L1228
[find-work]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L1268
[combo-contact]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L1342
[combo-picture]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L1469
[combo-unjoined]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L1589
[helper-fit]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/engagement.ts#L1224
[run-read-keys]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/run-read.ts#L89
[run-read-risk]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/run-read.ts#L132
[run-read-unsafe]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/run-read.ts#L231
[engagement-events]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/engagement.ts#L675
[dl-read]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/engagement.ts#L811
[dl-fight]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/engagement.ts#L1156
[qb-eyes]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/defense.ts#L431
[spot-eyes]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/defense.ts#L619
[option-truth]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/receiver.ts#L125
[qb-ready]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/qb.ts#L322
[qb-predict]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/qb.ts#L363
[qb-release]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/qb.ts#L490
[route-ghost]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/receiver.ts#L345
[qb-gaze]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/qb.ts#L313
[qb-init]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/qb.ts#L115
[protection-rushers]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L51
[protection-dispatch]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L123
[protection-set]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/blocking.ts#L264
[qb-pressure]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/qb.ts#L333
[qb-scramble]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/qb.ts#L535
[qb-evade]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/qb.ts#L555
[qb-pocket]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/qb.ts#L575
[qb-canon]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/qbmind.ts#L184
[qb-expected]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/qbmind.ts#L456
[recognition-events]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/recognition.ts#L210
[live-pursuit]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/defense.ts#L42
[rush-events]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/defense.ts#L81
[zone-reads]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/defense.ts#L394
[coverage-cap]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/coverage/judgment.ts#L95
[block-cue]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/coverage-cues.ts#L14
[coverage-techniques]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/coverage/techniques.ts#L74
[chase]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/common.ts#L206
[run-fits]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/run-fits.ts#L176
[catch-event]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/assign.ts#L308
[throw-event]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/assign.ts#L304
[route-finish]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/receiver.ts#L120
[track-notify]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/receiver.ts#L402
[catch-spot]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/receiver.ts#L460
[catch-window]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/defense.ts#L807
[play-ball]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/defense.ts#L750
[saw-throw]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/defense.ts#L714
[catch-facing]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/catching.ts#L30
[catch-envelope]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/catching.ts#L57
[tackle-choice]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/tackle.ts#L95
[tackle-preview]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/tackle.ts#L123
[bond]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/tackle.ts#L369
[downfield]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/receiver.ts#L482
[block-claims]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/receiver.ts#L512
[loose-ball]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/behaviors/defense.ts#L857
[game-scout]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/game/game.ts#L570
[coverage-scout]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/sim/qbmind.ts#L69
[defensive-caller]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/game/playcaller.ts#L281
[special-teams]: https://github.com/tannerthardy/football-simulation-/blob/a1b16e666a9ee7d1bc1d2aecba141fc535863b24/src/game/specialteams.ts#L1
