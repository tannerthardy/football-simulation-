# Run Game — saved accepted70b4 deep audit

**Evidence access:** [Download the audit bundle, scripts and detailed ledgers](https://github.com/tannerthardy/football-simulation-/tree/23d5f6d4f7e88fdd3225a49cc74ae5582a52522e). Paths below refer to files inside that bundle; [report and reproduction guide](README.md). Source links pin the measured accepted engine.

Run screened **all 193 called runs**, including the two nullified exposures, and inspected the fixed 24 ordinary runs, all four run tails, the other exchange caps, and opposing saved controls. The highest-confidence actionable observation remains **RUN-006: an unrecovered stretch exchange**. Current data also supports keeping RUN-007's access question open; it does not establish a general release defect, a stronger-contact requirement, or a runner vision retune.

Runtime `70b4db6a3ef53acc1a0e90cd055f1087205daa30`, source `9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941`, immutable evidence `b9b9c17597970ddc87aa4a4e271fc4cfeef71909`. This is saved-data analysis only. No games, simulation, suite, source/config/test changes, commits or publication were performed by this lane. Existing host HEAD includes later documentation and is not a new runtime comparison. Accepted `RUN_READ=0`, `CLIMB_PLAN=1`, `STRETCH_MESH=1` are preserved.

## Exposure, definitions and reproduction

Screen rows (`run/screen.json` in the audit bundle) contain every run's initial assignment, original-target sampled engagement/load, exchanges, releases, first carrier contact and flags. Screen script (`run/screen.py` in the audit bundle), refined counts (`run/counts.py` in the audit bundle), and cap geometry (`run/caps.py` in the audit bundle) read saved JSON; they never import simulation code. From repository root:

```sh
python out/accepted-game-deep-audit-2026-10-16/run/screen.py
python out/accepted-game-deep-audit-2026-10-16/run/counts.py
python out/accepted-game-deep-audit-2026-10-16/run/caps.py
```

The shared preparation must already have produced `snaps/<ID>.json`. `trace.py <IDs>` prints bounded actor sequences. `trace-second-level.txt` and `trace-counter.txt` retain inspected sequences. Generated `Gx-Pxxx.json` files compact the 30 panel/cap runs without changing original inputs.

There are 191 official runs and two nullified runs, **G3-P044 (Trap)** and **G3-P145 (Duo)**. All 193 have full saved telemetry. Exchanges comprise 185 handoffs and four successful pitches; the other four are the known caps. The nullified runs both transfer; their physical exposure is retained and their administrative yardage is not a football outcome. Concept exposure: Counter25, Draw11, Duo26, Inside Zone30, Outside Zone29, Power20, Split Zone3, Toss4, Trap16, Wide Zone29.

Initial assignment means the first nonnegative-time telemetry frame, not a presnap idle frame. Engagement membership means the actor is the primary blocker or an exported helper. **Direct load** means the actor is the primary blocker and exported `hands.normalForce > 0` in a sampled frame. A helper's force is not separately exported; absence of primary load alone cannot disprove useful helper work. Exported raw hand force uses engine kg·yd/s². Positive normal force establishes contact load, not a won block or sustained protection.

The run deadline is first `carrier_contact`, or the recorded ending when no contact occurs. For release counts below, exclude caps and releases at/after that deadline. This avoids grading an already-contacted runner's later climb as failed timely access. A target can legitimately become irrelevant, change direction, be collected by someone else or finish the play upstream. These flags identify reviews, **not defect counts**.

| Saved-data flag / exposure | All called runs | Official | Nullified |
| --- | ---: | ---: | ---: |
| No handoff/pitch |4|4|0|
| At least one initial OL→DL target never has sampled membership during the film |76|76|0|
| At least one initial climb/lead/pull→LB target never has direct primary load during the film |42|41|1|
| Runs with a predeadline release, known ending |144|143|1|
| Runs with at least one such release without target membership before deadline |99|99|0|
| Runs with at least one such release without direct primary target load before deadline |104|104|0|

There are **206 release events in156 runs** overall. Of191 predeadline release events in known endings,73 show target membership and67 show direct primary load before the deadline. Official counts are190/72/66; the one nullified predeadline release has both membership and load. Thus118 events lack timely membership and124 lack direct primary load, with no automatic conclusion that those jobs should have been achieved. The screen's broader raw `release-without-*` fields also include postcontact/capped releases; use the refined counts above for timely access.

## 1. RUN-006: landmark departure survives a missed stretch exchange

**Observed; high consequence, high confidence in failed continuation.** G3-P003, G3-P087, G3-P141 and G4-P142 retain sole QB snap possession through25s, with no exchange or carrier-contact event. They are the four under-center I/Offset-I Outside Zone calls in this cohort. All nine under-center Ace Outside Zone calls transfer. This is corroboration of existing RUN-006, not four new issues or a matched regression result.

The installed `oz_strong` mesh time is1.15s; the exchange window opens1.00s. At1.10s the RB's final requested motion turns from the diagonal mesh approach toward the upfield aiming track while the QB remains beyond physical transfer reach:

| Play; exact actors | QB–RB distance at1.10s | Closest sampled distance1.0–2.5s | Source/frozen-roster reach | Final QB request stays zero from |
| --- | ---: | --- | ---: | ---: |
| G3-P003; A3-QB1→A3-RB2 |2.91yd|1.43yd at1.70s|1.259yd|3.20s|
| G3-P087; A3-QB1→A3-RB2 |3.52yd|2.10yd at1.70s|1.259yd|2.40s|
| G3-P141; A3-QB1→A3-RB2 |3.49yd|1.50yd at1.70s|1.259yd|2.40s|
| G4-P142; H4-QB1→H4-RB1 |3.67yd|2.09yd at1.80s|1.273yd|2.50s|

The1.10s sample is the first visible commitment toward the aiming track that can persist without possession. It is **not a proven wrong request or an already-failed exchange**: the Ace success also departs before transfer. The earliest unambiguous failed-continuation witnesses are the sustained stationary QB requests at2.4–3.2s while possession remains with him and the back is separated. Early QB final requests already slow/change around0.5–0.8s, with F nearby, and the recording lacks commands before all modifiers. The exact `passed` transition tick is not exported. Positions are rounded0.1yd; these sampled distances do not establish the precise continuous minimum, but the absence of an exchange is exact event evidence.

**Source-supported cause of failed continuation.** [RunnerToMesh](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/assign.ts#L261) marks the riding back `passed` from landmark proximity plus cadence, then keeps requesting the aim without possession. [QBHandoff](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/qb.ts#L620) correctly requires physical reach, rides only while the RB stays within1.2yd of the QB mesh landmark, and otherwise returns to that fixed landmark. Neither path supplies a failed-exchange responsibility change. [Physical transfer](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/playsim.ts#L365) remains a real reach/down-state check and should stay so.

**Hypothesis, not demonstrated cause.** F-related spacing may help produce the early separation. There is no positive F↔QB/RB body impulse before2.5s in the passive live observation for these caps; do not call this a physical F collision or infer the same initiating event as historical#101. The final requests pass through engagement and teammate-spacing stages before physics, so the stored intent cannot identify which stage caused the early slowdown.

**Opposing context.** G3-P140 uses the same A3 QB/RB and Outside Zone cadence but Ace11, transfers1.55s, and tackles3.40s. At1.50s QB–RB sampled distance is1.22yd, consistent with the1.259yd reach. Formation, coverage and prior state differ: this is a useful nonmatched success, not a counterfactual. Preserve nine Ace successes, ordinary stretch riding and real transfer reach.

**Owner / next question.** Run owns the offensive exchange/recovery boundary, with Flex's separate defensive continuation finding linked in its appendix. Smallest question: after a personally available cue that the installed exchange is no longer reachable on its track, what responsibility should QB/RB take, and at which first acquired cue? Separate that continuation from the initiating spacing diagnosis. No stronger force, solver change, broad census or late-QB-chase resurrection follows from this data.

## 2. RUN-007: release earns a new job; timely access remains body- and sequence-dependent

**Observed; medium/high consequence, high confidence in access failures, unresolved controller cause.** The full screen finds both achieved and unachieved access. In known-ending predeadline releases specifically to Mike, LG achieves direct load in6/15 cases, C7/18 and RG5/24 (official RG4/23). Those denominators are released jobs, not all runs or defect rates. Current data does not support saying “LG can never collect Mike.”

Three ordinary witnesses retain exact first actor/time evidence:

- **G2-P099, H2-C1→A2-LB3 (Mike):** C joins RG's DT_W contact by0.60s and releases at1.90s while RG retains actual primary DT_W load (about484 kg·yd/s² at2.00s). Recorded C climb decisions predict attainable meetings at1.90s (+1.20s, margin−0.07yd),2.15s (+0.80s,−0.03),2.40s (+0.45s,−0.05) and2.65s (+0.30s,−0.14). Achieved C–Mike distance is1.49yd at2.80s, with no engagement; Mike grasps the RB at2.85s. C gets within1.0yd only at3.00s, after the runner's contact. First concern is the1.90s plan's promise of attainable access, not a demonstrated illegal release or a proven wrong movement request.
- **G3-P004, A3-OG3 (RG)→H3-LB3 (Will):** RG helps C's DT_W block, releases1.90s, but is still3.34yd from Will at3.00s. Will contacts the RB3.05s. C retains substantial direct DT_W load through the approach (807 kg·yd/s² in the1.80s sample). Initial useful double-team work and a timely second-level block are distinct outcomes; this wide separation does not demonstrate an attainable earlier alternative.
- **G3-P053, A3-OG1 (LG)→H3-LB3 (Will):** release1.10s with C retaining DT_W. LG's final requests initially continue laterally (at1.20s `[.02,2.08]`), and the achieved approach remains1.66yd away at Will's RB contact2.40s; no target membership precedes contact. The current record cannot locate whether the departure route, subsequent plan, spacing or the defender's changing path caused the miss.

**Source-supported boundary.** [Combination release](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/blocking.ts#L1708) changes hands ownership and the climber's job/target; `block_climb` makes no achieved-block claim. [Planned climb](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/blocking.ts#L895) forecasts one acquired backer path using own free movement. It explicitly does not prove a loaded/trafficked future. Final commands then pass through [contact and spacing stages](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/playsim.ts#L569). These explain why an “attainable” read and an earned departure can coexist with failed collection, but do not identify the causal losing stage in these particular clips.

**Opposing protection.** G1-P164, H1-OG2 (LG) releases1.15s, achieves primary Mike contact/load1.90s, carries about989 kg·yd/s² at2.00s and1005 kg·yd/s² at2.20s, before the RB's first contact2.75s. G3-P049 ordinary Y→Mike loads at3.60s before the RB's CB contact3.95s. G4-P146 ordinary RT→Sam loads1.50s after release0.90s and before RB contact4.90s. These are actual useful-contact contrasts, not climb-count credits or evidence that their yardage certifies every block. G1-P181 also shows why targets must be traced: LG releases2.15s but the3.00s adjacent-threat exchange changes his job to DE_S; lack of later Mike load alone does not classify that new job as wrong.

**Hypothesis / smallest next question.** Retain RUN-007's bounded access investigation. Start with G2-P099's forecast-to-final-request-to-achieved-path discrepancy against G1-P164's real collection; ask where the first attainable forecast stops matching emitted travel, acquired opponent changes or physical contact eligibility. G3-P004's distant release is an opposing late/unattainable job, not automatic evidence for earlier release. Existing telemetry cannot close every premodifier stage, helper force or exact strike eligibility. Do not weaken takeover security, bypass the useful keeper, globally advance releases or change capacities. Run owns the request/route boundary; Physics is consulted only if an achievable emitted request demonstrably fails motion. Physics independently checked these saved access samples: G2-P099 C at2.70s tracks final request `[1.99,.44]` with body velocity `[2.16,.48]`; the2.80s request then turns sharply to `[-.62,3.59]` and the body turns gradually. G3-P004 RG also shows gradual response to sharpening lateral requests. Both retain exported balance1/support deviation0 in those approach samples. No achieved-motion/capacity defect is established.

## 3. Counter: upstream kick access limits what the wrapper can accomplish

**Observed lead; medium consequence, cause unproven and no fix proposed.** All25 Counter calls have a lead/wrap puller. None has sampled engagement membership to **any defender** before first carrier contact, even after checking target switches and helper links. Kick pullers achieve direct original edge-target load before contact in13/25; DE_W is first-contact defender in14/25. These are timing/exposure counts. They do not establish25 defective wrapper decisions: an upstream edge can contact the runner before the installed wrap could physically finish.

The clearest early stops are G1-P003, G1-P134 and G4-P189. Their kick target DE_W reaches the RB at2.00/2.25/2.00s respectively without a prior kick engagement. In G1-P003, A1-OG2 (RG) is still2.06yd from H1-EDGE5 at2.00s; in G1-P134 H1-OG2 (LG) is1.41yd from A1-EDGE3 at2.20s; in G4-P189 H4-OG2 (LG) is1.25yd from A4-EDGE1 at2.00s. Wrappers remain farther from their moving second-level jobs. These sequences first demand a kick/penetration/runner timing explanation, not a wrapper force increase.

**Source-supported scope.** [Pull approach](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/blocking.ts#L827) clears the wall, follows corner landmarks and uses an acquired kick/trap read before attacking. The lead wrapper has a distinct route and target. Those responsibilities explain the recorded assignment structure; the recording does not expose waypoint index or every path-stage choice, and no first provably wrong request or physically reachable alternative was demonstrated here. Legitimate fast penetration remains a live explanation.

**Opposing controls.** G2-P011 H2-OG1 (LG) loads the kick target at2.50s before RB contact3.30s. G1-P060 has the same missed-kick/DE_W first-contact class at2.20s but an82.90yd TD after the RB escapes; its gain does not certify the kick or wrap. G3-P035 shows another missed kick followed by DE_W contact2.70s and a later LB finish. Preserve defensive penetration and legitimate broken-tackle variation.

**Owner / smallest next question.** Run with Flex only at defensive fit/pursuit interfaces. Conditional on the runner still having time to use the wrap and a reachable moving target, does the puller leave his path at the first useful acquired interception cue? First separate G1-P003's early kick failure from G2-P011's achieved kick. This lead does not justify a new active system or patch from this audit alone.

## Fixed ordinary panel: assignments, useful work and first finish

All24 ordinary IDs were inspected through initial surface, combination/release or pull responsibility, runner approach and first contact/ending. “No defect established” preserves an opposing football explanation; it is not a claim that every controller choice was optimal. Runner requests and achieved paths were examined, but the recording lacks carrier candidate-lane scores and unmodified per-stage commands. A final zero request or eventual loss alone cannot diagnose the runner's read/gathering choice.

| ID | Inspection result |
| --- | --- |
| G1-P003 | Counter kick RG never reaches DE_W before2.00s RB contact; LT release2.45s is already postcontact. Upstream edge-access lead, not a failed timely climb count. |
| G1-P018 | OZ RT contacts/loads DE_S from0.70/0.80s, then that defender reaches RB2.55s. Preserve an actual initial block followed by defensive access; no automatic missed-assignment verdict. |
| G1-P130 | IZ C keeps useful DT_W after LG releases1.20s; RG loads DT_S from0.60s but DT_S body-contacts RB2.25s. An achieved double/release cannot erase adjacent penetration. |
| G1-P140 | Draw transfers1.45s; first-level loads exist; Y/C releases2.85/3.25s never reach their backers by CB_S contact4.05s. The CB finish does not show those backers caused the stop. |
| G1-P167 | Trap LT→SS release0.85s does not load SS before LB_S contact3.00s. Distinct target and actual finisher; preserve role differences. |
| G1-P181 | IZ LG joins initial double, releases2.15s, changes to DE_S on adjacent crossing-threat exchange3.00s; FS reaches runner3.90s. Trace switched job, not only missing Mike load. |
| G2-P020 | Trap LG loads penetrator DT_S1.30s; RG abandons the original double and changes its target to that threat via `block_collect`1.05s; DT_S reaches runner1.95s. Preserve emergency responsibility change and a legitimate penetrating body; no release event to blame. |
| G2-P070 | Draw C abandons unavailable original DT_S1.00s; that DT first contacts RB2.40s but runner escapes to later FS tackle5.70s. Administrative gain does not certify initial protection. |
| G2-P096 | Draw LG loads DT_S1.10s; DT_S contacts RB2.55s. LT's3.10s release occurs later. Initial block loss/defensive finish has priority over a late climb label. |
| G2-P099 | Duo C joins RG, releases1.90s, repeatedly forecasts attainable Mike access but Mike grasps RB2.85s before collection. Detailed RUN-007 witness above. |
| G2-P125 | WZ LT→Mike release1.15s; target membership2.20s, primary normal load only5.50s at TD ending. Membership timing is distinct from force/protection; no carrier-contact event. |
| G2-P144 | IZ line gets actual DT_S load0.60s but DT_S reaches RB2.30s; RG original combination target not joined until2.40s. Upstream penetration governs this ending. |
| G3-P004 | WZ useful two doubles; LG/RG release1.85/1.90s; RG remains3.34yd from Will3.00s, Will grasps RB3.05s. Detailed late access contrast above. |
| G3-P025 | Power LG lead/pull toward Mike never loads before Mike contact3.25s; F/Sam also unachieved. Distinguish installed lead target from achieved protection. |
| G3-P028 | IZ adjacent crossing exchanges start0.05s; C contacts DT_W0.80s, DT_W reaches RB2.00s. Initial responsibility adaptation and actual penetration remain in view. |
| G3-P035 | Counter kick misses; DE_W first contacts2.70s, LB_W finishes3.90s; LG→Will release2.10s never timely collects. First access loss precedes later backer finish. |
| G3-P049 | WZ Y relinquishes DE_S1.70s while RT retains it; Y reaches Mike membership3.50s and load3.60s before CB contact3.95s. Useful access control. |
| G3-P053 | WZ LG release1.10s, C keeps DT_W; Will reaches runner2.40s while LG remains1.66yd away. Departure/route cause unresolved. |
| G4-P014 | WZ RG gets Mike load1.90s before contact, but DE_S already worked against Y and reaches RB2.20s. Useful second-level job coexists with edge loss. |
| G4-P081 | WZ RT gets Mike load1.60s; RG's DT_S contact also exists; DE_W reaches runner2.75s. Backside cutoff/edge access and Mike collection are separate. |
| G4-P088 | Draw C loads DT_S1.00s; DT_S reaches runner2.05s. No climb event; preserve a real first-level defensive finish. |
| G4-P142 | Capped OZ exchange failure; offensive line release/contact activity continues without RB possession. Unknown terminal yardage; no run success/stop classification. |
| G4-P146 | IZ RT→Sam direct load1.50s is useful; RG→Mike release1.10s is not timely primary load. RB contacts SS4.90s and scores11.25s; explosive result does not award all jobs. |
| G4-P176 | Draw RG loads DT_W1.00s; DT_W contacts runner2.10s. LG release2.35s is postcontact; LT earlier abandons unavailable DE_S1.70s. |

Relevant run tails reviewed separately: **G1-P060** (explosive Counter with upstream contact/escape), **G1-P134** and **G4-P189** (Counter stops), **G3-P087** (capped exchange/teammate context). The other eight tails are called dropbacks: G2-P029, G4-P024, G3-P008, G2-P089, G4-P116, G1-P036, G3-P146, G2-P063; their offensive run assignments are outside this lane. Additional deep traces: **G3-P003, G3-P141, G3-P140, G1-P164 and G2-P011**. Fixed-panel frequencies above never include these selected controls/tails as random ordinary observations.

## Review limit and handoff

Saved frames are0.1s with0.1yd positional rounding. Last-step contacts do not supply complete force history; primary-hand export omits individual helper forces; final intent is downstream of multiple controller stages. Attainable-plan decisions are local forecasts, not future truth. An exact wrong controller stage, contact/work law, runner alternative or historical regression cannot be invented from those gaps.

Prioritize a bounded RUN-006 exchange/continuation question and retain RUN-007's forecast/access witness with its successful loaded control. The Counter pattern is a conditional follow-up lead. Preserve real keeper work, achieved second-level blocks, fast defensive penetration and broken-tackle variation. This report proposes no ratings/physics retune, new coordinator, automatic campaign or implementation.
