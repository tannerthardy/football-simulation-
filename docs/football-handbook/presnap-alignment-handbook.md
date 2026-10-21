# The Complete Pre-Snap Alignment Handbook
## Offense, Defense, Motions, Shifts, Fronts, Coverage, Technique, and Simulation Implementation

**Purpose:** A detailed football teaching and engineering reference for a simulation whose players have physically meaningful positions, responsibilities, perceptions, and movements before the snap. **Target:** NFL-style 11-on-11 football, with explicit notes where terminology, systems, or legal rules differ. **Prepared:** October 21, 2026.

> **Core principle:** Alignment is not a cosmetic spawn position. The location of each player's **feet, hips, shoulders, depth, width, leverage, sight line, and stance** creates the geometry for every read, block, coverage exchange, path, handoff, and collision that follows. A coach calls a responsibility and a technique; the player gets into a feasible initial position; the opposing team reacts to the *visible evidence*; legal constraints and the physics engine govern both teams.

### Status / epistemic conventions

- **[RULE]** means an actual playing-rule requirement. Verify league/year variants before implementing penalties. NFL 2026 sources are linked at the end.
- **[COACHING]** means a widely used football convention, not a universal or legally required alignment. Team playbooks legitimately differ.
- **[MEASURE]** means an example from the project's 2022 NFL tracking research, not an immutable NFL norm. Cohorts, body-center estimates, snap selection, and route/coverage labels matter.
- **[SIM DESIGN]** means an architectural recommendation, not an asserted existing implementation.
- **[STARTER RANGE]** means an illustrative configuration range in yards, **not** a league-wide measured mean; replace with conditioned distributions when tracking and coaching validation are available.

**Do not turn one alignment sample, coaching label, or scheme heuristic into a universal positional constant.** The right position depends on the called concept, offensive presentation, coverage rules, front, defender technique, field location, personnel, down-and-distance, and available evidence. Nor should every player line up at the same depth and then rely on movement logic to compensate: the first half-second of real football depends disproportionately on where the athletes start.

---

# Part I — The coordinate system and the language of alignment

## 1. Define the field once, not separately inside each technique

Use one canonical physical field coordinate system, and project every offensive/defensive tactical concept into it. Example: **x increases toward the offense's attacking end zone on this snap**, **y increases to the offense's left**, and the **line of scrimmage is `x = 0`** in a *snap-local frame*. Absolute field coordinates remain owned by the World; convert once at the play boundary. Then:

- Offensive backfield has `x < 0`; defensive territory has `x > 0`; the offense attacks `+x`. Reverse the projection when possession direction flips rather than cloning football rules.
- Define exact neutral-zone limits using the spotted football, not an arbitrary zero-width painted line. Keep an independent ball-reference record (nose, rear, width, angular placement) if precise fouls/contact matter.
- `y = 0` is the ball's lateral spot for local football diagrams, but World y remains absolute. Wide/field/boundary relationships must know the **actual sidelines and hashes**.
- **Depth** is longitudinal separation from the LOS; **width/split** is lateral separation; **shade** is the offset relative to another player's anatomy or the OL's numbers; **leverage** is relative to a route/run threat and responsibility, not simply an absolute y coordinate.
- Store **body-center** and **foot-contact locations** separately. NFL tracking often locates a point near the body/torso; the snap rules concern a player's body, especially helmet and hands at the line. Do not declare `center.x == LOS` to mean his fingers or helmet are legal.
- A stance is an initial physical configuration: feet stagger, foot yaw, width of base, COM height and fore/aft bias, hand on ground, head/chest orientation, gaze target, readiness and snap trigger.

### 1.1 Basic landmarks

For the offense, from its left to right (the graphical order reverses when viewed from behind):

`outside WR — TE/tackle — guard — center — guard — tackle/TE — outside WR`

Named interior gaps, from center outward on each side:

- **A:** center–guard.
- **B:** guard–tackle.
- **C:** tackle–attached tight end, or outside the tackle if no TE.
- **D:** outside the attached tight end; additional gaps appear for a second tight end, wing, or shifted surface. Some systems label all extra gaps D/E/F; preserve scheme-specific mappings.

A **gap is a dynamically bounded corridor**, not a single frozen GPS point. Its widths and who can enter it change with stunts, down blocks, zone flow, TE motion and shifts. Preserve a pre-snap *named* gap and separately track its evolving physical boundaries.

### 1.2 Surface, strength, and side are different

- **Formation strength:** sometimes TE side, sometimes number of eligible receivers, sometimes the widest or strongest surface. Store the offense's *called strength convention*.
- **Field/boundary:** greater room to a sideline versus less room. On NFL hashes, there is less asymmetry than on college hashes, but the distinction persists.
- **Run strength:** where blockers, option threats and intended attack point create the stronger running surface; may differ from passing strength.
- **Passing strength:** 2x2, 3x1, 3x2 (including back eligibility), #2/#3 eligible distribution; not identical to TE strength.
- **Front strength:** a defensive call may set the 3-tech to the TE, away from the TE, field, boundary, RB, or an explicit game-plan side.
- **Coverage strength:** the coverage can spin/poach/lean differently from the front's strength.
- **Motion direction:** travel from one side to another does not by itself redefine the installed front; it may trigger a check.

Never collapse these into one `strongSign` and force every subsystem to follow it. A split-flow offense deliberately creates conflicts among them.

## 2. The defense uses techniques, not arbitrary nearest-neighbor spawn positions

### 2.1 Standard line-shade vocabulary

| Technique | Body landmark | Usual coaching meaning | What it does **not** prove |
|---|---|---|---|
| 0 | Head-up on center | Nose over snapper | Two-gapping is not automatic |
| 1 | Shade of center | Attacks/controls near A surface | Does not determine whether he slants |
| 2i | Inside shade of guard | Guard's near-center shoulder | Not synonymous with a fixed A-gap target |
| 2 | Head-up on guard | Even alignment | Could play one- or two-gap |
| 3 | Outside shade of guard | B-gap threat / disruptive penetrator | Need not be the largest DT |
| 4i | Inside shade of tackle | Reduced/tite front surface | Does not itself determine edge force |
| 4 | Head-up on tackle | Even tackle alignment | Technique and assignment are separate |
| 5 | Outside shade of tackle | Edge/C-surface | Could spill, box, squeeze, or rush |
| 6 | Head-up on attached TE | TE head-up | Not necessarily a conventional 4-3 DE |
| 6i / 7 | Interior shade near TE | Commonly inside TE; conventions vary | **Check the defensive playbook convention** |
| 9 / wide 9 | Outside TE/edge, displaced wide | Speed/external threat | Does not guarantee C/D control |

[COACHING] Number nomenclature outside the 5-tech varies by coaching tree, especially 6i/7/8/9. Represent the **actual reference body and signed offset** in data, and retain the printed technique name as a label. That avoids two coaches' “7-tech” meaning two different pieces of turf.

### 2.2 Head-up vs shade is a body geometry problem

`alignmentReference = { opponentSlot, landmark: center | insideShoulder | outsideShoulder | insideHip | outsideHip, offset, depth }`

The natural lateral offset depends on both players' widths/radii, stance, and whether the coach means helmet on shoulder, inside eye/outside eye, or torso shade. Do not use a fixed one-yard offset for every body type. An end can be in a 5-technique while his feet straddle an off-axis support position, especially if he is in a sprinter stance.

### 2.3 Line and second-level alignment are linked

A 3-tech outside the guard creates different A/B-gap surfaces than a 2i inside the guard. Stack linebacker placement should respond to the *gaps the front covers*, not simply place Mike/Sam/Will at three equally spaced y coordinates. The force player may be an end, outside linebacker, nickel, corner, or safety depending on shell and coverage. Who “sets the edge” cannot be assigned by roster position alone.

---

# Part II — The offensive pre-snap picture, player by player

## 3. The offensive line: exact stance, splits, stagger, and why they matter

A line is five *individually aligned bodies*, not five centers on one x row. The center has his hands on the football. The guards and tackles can set progressively deeper, their split choice reflects concept and coaching philosophy, and their foot stagger determines their first contact and clearance corridors.

### 3.1 What to measure for every lineman

- Left and right foot coordinates; lateral base width; toe-out angle; which foot is loaded.
- Longitudinal toe/heel positions relative to the ball and center's near hip.
- Body center and head location; shoulder axis; hand-ground status; stance (2-point/3-point).
- Lateral *split between adjacent body surfaces*, **not only center-to-center distance**; record both metrics.
- Depth relative to ball, center, neighboring guard/tackle, and defender.
- Initial intended step direction, first contact point, snap reaction, footwork family (zone, down, pull, hinge, kick slide).
- Whether the movement physically clears other players at current body width.

### 3.2 Stance families

**Two-point:** feet staggered, knees/hips bent, hands free, torso can identify threat; common for tackles in pass situations. Not exclusively pass and not a free acceleration buff.

**Three-point:** one hand down, opposite/near foot stagger, low hip/shoulder placement; common for run-oriented interior alignments. The down hand imposes a real time/path to release, but a coach may favor it for specific run/pass concepts.

**Four-point:** both hands down, narrower tactical purpose (goal line, charge); not the general default.

**Parallel square stance:** feet nearly even to preserve bilateral pull/reach options. A stance can be asymmetric despite identical schematic alignments.

### 3.3 Splits and line depth

[STARTER RANGE] OL splits are often coached in feet (e.g., 2–3 feet open between bodies), but the *observed body-center spacing* depends on the width of the players; do not confuse those. Reduce splits for particular protections, short yardage or heavily reduced fronts if coached; widen for space, tempo or angle advantages in other systems. Extreme wide splits alter pass rush/TE C/D surfaces and legitimate defensive penetration, not just how much room the puller enjoys.

[MEASURE] The repository's 2022 tracking work reported approximate snap **body-center longitudinal depths** of center 0.29 yd, guards 0.83 yd, tackles 0.98 yd, inline TE 1.19 yd, and lateral adjacent body-center spacings around 1.54–1.56 yd in a selected cohort. These are project-reported estimates, not league-wide mandatory targets. A separate defensive/alignment study found adopting these splits without changing the blocking techniques caused more stuffs. Preserve that *structural mismatch* as a test, not a reason to falsify the line's placement.

### 3.4 Individual roles

**Center:** ball/snap mechanics first; wrist/hand location, pad level, legal stationary ball, shotgun snapping stance and visibility. Head-up 0-nose changes snap/first-step options. His hips cannot magically move through either guard at the snap. Must know point/Mike declaration, ID fronts and count rules if protection/run design requires them.

**Left/right guards:** split from center, choose near/back foot stagger for pull/down/zone, maintain realistic pad base. An off-ball guard may have a genuine clearance runway behind the center; a guard aligned artificially even with the center may first retreat and then turn 270 degrees. Don't cure this by granting position-specific acceleration; initialize the correct posture and route.

**Left/right tackles:** greater depth and wider split can improve pass angles but affect reach blocks and wide-zone pull-in routes. A two-point tackle may be square to the rusher at snap, or opened outward depending on called pass set. Tight end attachments, wide-9 defenders, reduced 4i and stunt threats change the tackle's stance/eyeline.

**Extra tackle or sixth OL:** legality/eligible receiver status and reporting are independent of his technique. If attached outside the primary tackle, he changes which player defines C/D/E gaps and who is uncovered. Model the actual body as a lineman on that surface; don't pretend he's a normal WR simply because he occupies an eligible slot.

### 3.5 Common coached adjustments, not magical outcomes

| Situation | Plausible alignment/technique response | Required evaluation |
|---|---|---|
| Outside/wide zone | More play-side step clearance, deliberate first-step angle, outside TE surface | Does OL/DL co-flow physically occur? |
| Power/Counter | Guard's depth, inside clearance, open hips, corner radius | Can he arrive inside-out without running through C/G? |
| Duo | Vertical double surfaces, keeper security | Does second-level release leave a real secured man? |
| Pass vs wide 9 | OT set depth/width, two-point stance, rusher angle | Does contact occur at the correct depth? |
| Reduced 4i / Tite | Guard/tackle angle, combo and hinge assignments | Is C/B-gap ownership correct? |
| 6 OL / heavy | Gaps increase and front reidentifies them | Are 7 legal on-line bodies preserved? |

## 4. Tight ends, wings, fullbacks, and H-backs

### 4.1 Inline tight end (Y)

Record side, attached versus detached, on/off LOS, split to tackle, exact shoulder/feet depth, and which side is the end of line. Attached Y creates a new surface for a 6/7/9 alignment and frequently changes the front's declared strong side. A TE on the line outside a WR can make the WR inside him *covered* and ineligible for a downfield pass. “Tight end” is a roster position; **eligibility follows actual alignment and reporting**, not the depth-chart name.

**Run nuance:** inline TE can base, reach, cutoff, down, slice, hinge or release. The initial stance, toe angle and landmark differ. A backside attached TE may hinge and *not* mirror play-side wide-zone flow. A play-side TE stretching a defensive end should not automatically run downfield into the defender's center.

### 4.2 Wing / sniffer / off-ball H

A wing may align outside and behind the TE by approximately a step to a few steps; a sniffer may align just behind an interior tackle/guard surface. Both are explicitly **off LOS**. Keep snap body clearance from OL hips and the QB/RB mesh. A tight sniffer can insert into an interior gap, slice across on split zone, kick end on Counter, or lead. The position is different from an inline TE because he is legally off-line and physically has crossing space.

### 4.3 Fullback (F)

I-backfield, offset I, strong/weak offset, pistol/near pistol, split-back, and wing are different schemes, not one `F` location. Give F his own body length, depth, offset, foot stagger and snap stance. His intended first landmark can be the **inside shoulder** of an end on Power, an inserted linebacker's near hip on iso, or a lead path outside the tackle. Fullback alignment must avoid placing QB and F on the same collision path on play action and under-center exchange.

### 4.4 Multiple tight ends / unbalanced

A second attached TE expands the surface; a detached TE changes #1/#2 counting instead. Unbalanced lines can have extra tackles on one side, with only the actual two *ends* of the line pass-eligible (subject to number/reporting). Defense must identify the true surface and ineligible player positions, not assume standard LT/LG/C/RG/RT body order.

## 5. Quarterback alignment

**Under center:** QB directly behind snapper with hands positioned for exchange and shoulders/body offset as necessary, not simply an arbitrary x coordinate. The QB's feet start near the center's rear surface; a drop, reverse pivot, turn or play-action opening has a coached first step. Snapshot of center/QB hand geometry matters to handoff legality and physical contact.

**Shotgun:** QB depth commonly several yards behind the snap with variation by run/pass, protection and team. His lateral offset is usually near ball but may be deliberately offset for read/option/formation design. Store distance to center and exact catch target separately. Pass stance differs from RB handoff posture.

**Pistol:** QB behind center with RB further behind QB, but depth and spacing differ from I formation and shotgun. The RB can have downhill momentum without a QB under-center ride path.

**Wildcat/receiver as passer:** separate snap receiver identity, passer eligibility, RB/QB roster labels and current ball handling.

For each QB align: eyes/read sequence, protected snap trajectory, ride mesh geometry, first foot and shoulder turn, legal false-start motion restrictions, and where the QB exits relative to the RB's running path. “The QB is 4 yards deep” is not enough.

## 6. Running backs: the exchange starts before the snap

### 6.1 Under-center singleback

Center of the back several yards behind LOS with a deliberate lateral offset for run direction; feet and hip angle define first step. An RB's initial foot may be staggered; the mesh occurs at a location related to the QB's actual pivot/ride path, not at first arm's reach by default.

### 6.2 Gun offset

Back to QB's left or right and often slightly behind him; exact gap depends on play. Traditional opposite-side mesh is common in many zone/read installations, but same-side concepts exist. A shotgun back starting on the play side cannot be forced to reverse behind the QB for every weak run. Source and route logic must agree about **back's starting side, intended crossing side, and exchange spot**.

### 6.3 Pistol and two-back

Pistol back is longitudinally behind QB. Split backs can be paired to either side; a second back's blocking or option role should be determined before the snap. A fullback may lead and the RB may follow, but the intended following relationship is a path/time objective—not a static low-speed order.

### 6.4 Runner alignment matrix

| Family | Starting relationship | Main first movement | Common failure to guard against |
|---|---|---|---|
| UC IZ | Behind/offset from QB | Press declared near gap | QB/RB occupy same corridor |
| UC OZ/WZ | Depth + lateral track | Flow to stretch landmark | Back tracks an end who moved the gap |
| Gun zone | Offset beside QB | Across/around QB to designed mesh | Wrong-side reverse / instant arm-reach transfer |
| Pistol | Behind QB | Downhill mesh | QB occupies back's first step |
| Power | Behind QB/FB or gun | Read kick and lead | Runner arrives before puller kick |
| Counter | Delayed/false first step | Follow kick/wrap geometry | RB runs outside a log defender's reach |
| Toss | Deeper/wider initial path | Catch and arc to edge | Force defender's alignment unaccounted |
| Draw | Pass presentation | Delayed downhill commitment | Pre-snap stance telegraphs run / DL rush lanes wrong |

## 7. Wide receivers, slots, stacks, bunches and condensed sets

### 7.1 Receiver counting

Defensive coverage commonly numbers eligible receivers **#1 outward-to-inward from the sideline**, #2 next inside, #3 next inside. Numbering is per side and can change on motion. A back releasing to the flat may become a late passing threat, but his current on-field surface and release affect the coverage adjustment. Do not naively number by permanent player labels `X`, `Z`, `H`.

### 7.2 On/off status

A WR can be **on LOS** as the line's eligible end, or **off LOS** as a flanker/slot/backfield player. Multiple off-line players may stand in stacks/bunches, but the final set must maintain proper count of linemen and the positions of eligible ends. A slot may be only a small step off; it must still be clearly off. Avoid infinitesimal depth differences that would be ambiguous to officials.

### 7.3 Wide split vs reduced split

Wide #1: enough width to threaten boundary/vertical routes and widen the force defender; condensed #1: short split near tackle enabling crossers, crack blocks and traffic for switch releases. This influences whether the corner uses inside/outside leverage, whether #2 exists, what the apex defender keys, and how much field/boundary space remains. Split is a football variable, not a random aesthetic adjustment.

### 7.4 Stack and bunch

**Stack:** one receiver directly or nearly behind another, often with a stagger so releases do not collide. Defenders may respond with banjo/switch or point-man rules, rather than chase each man through the same corridor.

**Bunch:** three eligible players within a tight cluster, with at least one clearly on-line end if required. Distinguish point, inside and outside releases and defense's **in/out, first-to-flat, first-vertical, lock** exchange rules. Do not assign one defender to an individual stack/body and leave him there despite two receivers crossing the same point.

### 7.5 Motions and quick-set releases

Jet/orbit/return/reduced-to-wide/short/across motion have different timing and geometry. A receiver can be moving legally at snap only under applicable motion requirements; to avoid false start/illegal shift, model the timeline and legal set. The *motion path* and the *final snap position* both matter: the defense may reveal coverage, roll or bump, while the offense may gain leverage or speed at the snap.

---

# Part III — Legal formations, motions, shifts and alignment lifecycle

## 8. NFL 2026 legal snap constraints

[RULE] Consult the official **2026 NFL Rulebook, Rule 7** for the authoritative text and exceptions. At a normal scrimmage snap:

1. The offense needs **at least seven players on the LOS** (the usual legal presentation is exactly seven with four backs/off-line players). The **two ends of the offensive line** must occupy eligible-end positions, with intervening on-line players ineligible; eligible numbering/reporting requirements separately apply.
2. Players must be **clearly on or clearly off** the LOS, except the explicitly handled quarterback directly behind the snapper provision; do not classify on/off by negligible epsilon.
3. The offense must be legally set, with players simultaneously stopped for the required one-second period following a qualifying shift. Motion does not automatically erase earlier required set conditions.
4. At the snap, **at most one eligible backfield player** may be in legal motion, moving **parallel to or away from** the LOS—not forward toward the opponent's goal line.
5. When two or more players move simultaneously or successive movements overlap without the required rest, that can create a **shift** requiring a new simultaneous set. Correctly distinguish sequential legal motions after stops from overlapping shift movement.
6. False starts, encroachment, neutral-zone infraction and offsides are distinct. Defender intrusions can trigger pre-snap termination under specified conditions; not every visible defensive move is a foul.
7. Legally reported ineligible/eligible substitutions and unusual formations require explicit handling; no magical WR eligibility from a playbook slot.

**Simulation contract:** lawfulness is evaluated from actual achieved bodies, current movement and relevant time history, not merely a formation generator's declared `legal=true`.

**Example legal count:** `LT LG C RG RT Y X` on the line (seven), `Z H QB RB` off the line (four). If `Z` motions and moves toward the LOS at snap, that's not a legal one-player jet just because only Z is moving.

**Important nuance:** exact rule exceptions for a T-formation QB, special reports, last-two-minute penalties and scrimmage kick formations should be implemented from the official rule text in the dedicated rules module. Do not embed a simplified summary in the entire position/behavior system.

## 9. The pre-snap event sequence

1. **Situation:** ball spot/hash, down/distance, time, substitutions available, defensive/personnel tendencies.
2. **Call:** offensive personnel/formation/protection/run or pass concept, motion/shift script, snap cadence.
3. **Initial spot placement:** player-specific landmarks, on/off eligibility, splits/depth/stances, body clearance.
4. **Defensive matching:** personnel/front/coverage/pressure disguise, original run/pass strength, force/cap support.
5. **Shift/motion begins:** offensive players move along legal routes; possible defensive bumps/travels/rocks/spins.
6. **Recognition/update:** each player can acquire and interpret *observed* movement; the defense's adjustment rules operate on an appropriate cadence with stable duties.
7. **Re-set:** if required by rules, all players actually come to rest together for adequate time. Late shifts may cause broken communications and foul risk.
8. **Snap:** validate legality/neutral zone; release ball; initialize readiness without resetting real velocity/facing/support.
9. **Post-snap:** preserve personally acquired keys, displayed shells vs actual coverage, assignment continuity and any motion-generated momentum.

The snap is **not** a teleport/rebuild event. A motion player retains acquired velocity, stance and orientation. Defenders cannot instantaneously swap positions because the offense triggered a new strength declaration at the snap.

## 10. Motion families and how they reveal or change the defense

| Motion | Offensive purpose | Common defensive answers | Key sim complication |
|---|---|---|---|
| Jet / fast orbit | Stress edge, create snap speed, eye discipline | Travel, bump, roll, force adjust | One mover legal at snap; pursuit changes cannot be instant |
| Short trade (TE across) | Change attached surface / strength | DL/LB front reset; shift coverage strength | Requires appropriate reset/set timing |
| Across motion to slot | Create trips, matchup, run strength | Bump linebackers/nickel, rotate help, man travel | Coverage and fit recompute separately |
| Return / yo-yo | Probe man/zone, manipulate leverage | Man traveler reverses; zone bumps back | Hysteresis; don't cause alternating 180° pivots |
| Orbit behind QB | Influence run fit and flat support | Secondary rotation; runner-track checks | Motion body crosses mesh; collisions |
| Zip/short inward | Reduce split and create stack | Corner travels or coverage banjo | Preserve on/off status |
| Wing/H shift | Change gap count and kick/slice path | Edge and SAM reset | Real-time new gap/surface topology |
| Empty backfield | Expose coverage and pressure count | Apex/flyover, back-man traveler, pressure check | RB eligible route vs box-count responsibilities |
| Unbalanced shift | Reidentify true end/edge of LOS | Front overload or opposite-gap check | Illegal formation if on-line eligibility wrong |
| Motion at snap on screen | Influence support/DB blocks | Press/zone rally, force rotation | Defender should not know designed screen merely from motion |

## 11. Defenses should respond from a rulebook of *adjustments*, not perfect hindsight

A defense can preinstall a complete response to common offensive presentations: motion from 2x2 to 3x1, TE trade, empty, condensed bunch and unbalanced. But the *actual* response must honor what the defender personally knows, communicated calls, physical travel time and his coverage responsibility.

**Example 2x2 → 3x1:**

- Identify new trips side from eligible player alignment and motion, not a play-label.
- Decide whether the nickel travels with the receiver, linebackers bump a gap, the weak safety poaches #3, or the coverage rotates its shell.
- Determine the new receiver numbering on each side; don't presume #3 is always the pre-snap H.
- Maintain box run integrity: if Sam bumps outside, who replaces his interior fit? If Mike travels, who owns the weak A cutback?
- Safety may rock before snap to show strength without abandoning deep cap responsibility; another defender can replace the dropped underneath zone.
- If the ball snaps before all defenders physically realign, accept genuine stress/mismatches; don't teleport into a perfect trips check.

---

# Part IV — Defensive front, box, apex and secondary: every foot before the snap

## 12. Defensive front families

### 12.1 Even 4-down: over and under

**Over** convention commonly puts the 3-technique toward called strength, a shade nose opposite, and two ends outside the tackles/TE surfaces. **Under** commonly moves the 3-tech away from called strength and changes the Sam/edge surface; exact system vocabulary varies. Some systems describe over/under by where the 3-technique is relative to the TE; some by an entire shifted front. **Define the front's own map, not just the name.**

For each front store: DL player -> reference body/technique/depth/stance, initial gap(s), one/two-gap style, slant/stunt, containment rule, blitz/match-up and who fits vacated gaps. A single ``front=over`` Boolean is grossly insufficient.

### 12.2 Odd fronts (3-down / 3-4)

0-nose, 4i-5 ends, stand-up edges/OLBs. The nose can be head up or shaded; DEs might play 4i two-gap or attack. OLB/edge alignment ranges from wide outside a tackle to on the TE. Do not make a stand-up 3-4 OLB a box linebacker merely because his roster label is LB: he may function as a defensive lineman in that call.

### 12.3 Tite/Mint fronts

Typical reduced front with two 4i linemen and a 0-nose, often light box fits with perimeter support. Hard for inside gaps to immediately open; can concede outside width depending on force rules. The 4i has an interior shoulder relationship to tackle and forces different OL reach and combination routes than a 5-tech. Offense can attach/split TE and shift surfaces to change the problem.

### 12.4 Bear/46/loaded and goal-line

Defensive bodies align over several interior OL, often with strong surface congestion and added rush/support defenders. The offensive line has fewer obviously uncovered linemen; double access and A/B penetration differ. Must validate that coverage and force support remain coherent: a Bear call does not mean “every defender rushes.” Short yardage stance can be four-point or very low but still has real first-step limits.

### 12.5 Wide-9 / multiple-front

Wide ends are displaced beyond TE/tackle; this changes offensive set angles, tackle pass protection and gap width. A wide alignment can help pass rush but require a separate inside force/scrape plan against the run. The player cannot simply move five yards laterally between even/wide looks instantly on a late offensive shift.

### 12.6 Front geometry table

| Front | Illustrative interior presentation | Common defensive problem solved | Common risk exposed |
|---|---|---|---|
| 4-3 Over | 1 / 3 shade, two 5-like ends | B-gap penetration to strength | A-gap/weak cutback and edge depending on support |
| 4-3 Under | Shifted 3 opposite TE strength, Sam near TE | Strong edge plus weak B | Front flip and TE-motion communication |
| Odd 3-4 | 0 + two 4i/5; OLB edges | Interior force-control flexibility | OLB run/coverage dual duty |
| Tite/Mint | 4i–0–4i | Protect inside gaps; force bounce | Perimeter C/D/extra gap fit |
| Bear | Covered interior OL | Restrict inside combination lanes | Perimeter/coverage substitutions |
| Wide-9 | Wide edge alignments | Speed rush angle | Downhill run space inside edge |
| Goal-line | Many bodies crowd LOS | Short-yardage plug | Play action and edge/TE releases |

## 13. Defensive linemen: the stance is a functional decision

**Nose:** stance low enough to anchor, eyes on center/guard cues; legal defensive depth relative to neutral zone. Head-up 0-nose can read both shoulders but shouldn't magically know the offensive call. His foot stagger differs for slant, two-gap, pinch or short-yardage charge.

**3-tech / interior DT:** shade guard by relative helmet/body landmark, feet loaded for first step into B or cross-face movement. 3-tech alignment can be physically narrower/wider based on guard width and play. Mass/suitability should matter to roster usage; do not place an EDGE at DT because a pass-rush finesse formula has a favorable value absent mass/fit penalty.

**4i / reduced end:** inside shade tackle, appropriate hand/foot leverage against down/reach. Shouldn't take a generic outside-edge route on the snap if he has reduced gap responsibility.

**5-tech / 6 / wide-9:** initial feet aligned to selected TE/tackle landmark; box/spill/squeeze/contain are **assignments**, not derivable from shade label. A defensive end can collision-squeeze the tackle or attack a C/D gap but cannot be preprogrammed to turn toward a runner he hasn't seen.

**Stunt/slant:** DL start from one technique and cross to another after snap. Keep the initial stance and launch orientation truthful, then implement delayed key/strike and real path clearance. Never spawn the defender in the final stunt gap before snap.

## 14. Linebackers: stack, shade, mug, apex, and true fits

### 14.1 Stack linebackers

Typically several yards behind LOS rather than uniformly on the line. Their lateral body-center alignment relates to front shades, guards and fit responsibilities. A Mike may align head-up/offset from center; Will can apex the weak tackle/slot relationship; Sam may be near TE or flexed. Do not mandate one exact depth for every defensive call.

[MEASURE] The project's selected 2022 run tracking comparisons found gap-run stack backers around **3.5 yd deep at handoff** and roughly **2.5 yd at runner LOS crossing**; these were *time-conditioned*, not necessarily pre-snap positions. The experimental `LB_DEPTH` helped avoid premature LOS filling. Don't misread “depth at handoff” as “initial depth.”

### 14.2 Run fit and body position

A linebacker may have A/B stack fit, scrape/replace, fold, cutback, insert, box force, spill cleanup, backside boot, or coverage-first hook. The same alignment can support several techniques if the cue differs. A defender's **inside-out leverage** means his initial lateral bias preserves a shoulder of the runner/gap, not an imposed 2-yard side offset at all times.

### 14.3 A-gap mug and simulated pressure

In Double-A mug, linebackers may walk up to both A gaps pre-snap, with one or both dropping after snap. The positions genuinely stress center/guard protection; still distinguish presented pressure from actual rush. If a linebacker mugs and then bails, the movement must take realistic time and he may sacrifice underneath depth.

### 14.4 Apex / overhang / nickel-like linebacker

An apex player splits the conflict between an inside receiver and tackle/TE box. Useful landmarks include: halfway between #2 and EMLOS, inside shade of #2, or a relation to the slot plus backfield strength—depending on coverage and run fits. The apex might be a nickel DB, OLB or safety. He is not necessarily a generic linebacker with greater width.

## 15. Force, alley, cutback, and deep cap: the whole run-defense ladder

A defensive front must define **primary force**, **secondary force/alley**, **spill/box support**, **cutback**, **boot/contain**, and **deep cap**. These jobs depend on the front and coverage and may be shared/rotated, but they cannot disappear when one defender travels with a motion.

- **Primary force:** player responsible for keeping the ball from escaping outside on the declared side. Can be DE, OLB, nickel, corner or safety.
- **Spill:** wrong-arm/redirect pull blocker or force ball outside to coverage structure; requires outside support.
- **Box:** keep outside arm/shoulder free and force ball back inside; requires inside pursuit.
- **Alley:** insert between box and deep defenders to finish outside runs; must preserve appropriate approach depth/leverage.
- **Cutback:** maintain backside gap/leverage rather than overrunning motion.
- **Boot/contain:** retain QB/end responsibilities when offense presents fake or flow.
- **Deep cap:** last level should not collapse to linebacker depth on every pre-snap run tell. Deep defenders can support when a carrying runner is actually identified while preserving last-resort pursuit geometry.

Pre-snap force is contingent. A static “safety always force” flag is incorrect in many fronts. Run force should be rebuilt from the **actual spatial surface** when TE/wing shifts happen, with ownership handoff that respects the defender's observed read and physical travel.

## 16. Coverage shells vs actual coverage responsibility

**Shell** describes approximate presnap safety/secondary presentation. **Coverage** describes post-snap rules. A two-high shell can rotate to single-high Cover 3 or Cover 1; one-high can spin to two-high. Never set each defender's final post-snap destination equal to the presnap presentation.

| Presentation | Common alignment tendencies | Potential actual coverage |
|---|---|---|
| Single high | One FS deep middle; SS rolled down/apex; outside CBs press/off | Cover 1, Cover 3, disguised quarters |
| Two high | Two safeties 10–16 yd deep, widths tied to hashes/#2 | Cover 2, quarters, Cover 6, Cover 1 disguise |
| Zero high | All DBs closer to targets/pressure surface | Cover 0, fire-zone disguise, late safety retreat |
| Cloud corner | One corner compressed/shallower as flat defender | Cover 2 cloud, Cover 3 cloud, trap/robber |
| Rolled Buzz | Safety down toward hook, another stays deep | Cover 3 Buzz, robbed match |

Ranges here are illustrative, not default assignments. A two-high safety may be deeper or flatter given down/distance/field/receiver threats; a corner may play press at 1 yard or off at 7+ yards. Use job-aware placements.

## 17. Corners: #1 alignment, press/off, leverage and backfield support

Pre-snap CB alignment is a function of:

- Assigned receiver rank (#1/#2), actual split, release room and sideline distance.
- Coverage job (man press, off-man, deep-third, quarters, cloud/flat, trap, force/contain).
- Called inside/outside leverage; shadow traveling assignments.
- Cushion/depth and press/jam intention; hand placement permission.
- Foot stagger, hips open/closed, eyes (WR hips/QB/through #2), and initial pedal or shuffle posture.
- Motion/stack/bunch call (lock, banjo, bracket, zone exchange).
- Field/boundary: near-sideline #1 changes preferred shade; don't line a corner outside a receiver who has no exterior field and call that universal.

**Press man:** within arm/first-step range but not overlapping neutral zone; hips square/inside or outside shade as coached, with genuine risk against speed releases. **Off man:** typically more depth and read leverage; avoid global hardcoded cushion independent of route threats. **Deep third:** enough depth/width to protect vertical thirds, with run support depending on declared back and scheme. **Quarters:** key #2, #1 distribution, outside leverage and match rules; not just a spot at 12 yards.

## 18. Nickel, dime, and safety depth

**Nickel:** apex #2/tackle or tighten to box depending on match/pressure/force. Might press slot, carry seam, fit run, or blitz. Important: when #2 motions, nickel may travel or bump; who takes his vacated run gap?

**Deep safeties:** align in relation to hashes, #2/#3 vertical threats, field/boundary and called cap. Two-high half-field players can be split near hashes; quarters safeties often relate to #2/slot; middle-third FS is centered by passing strength/ball rather than always at global field center. Safeties must begin deep enough to protect routes, not start at the runner's final pursuit location.

**Strong safety/robber/box safety:** alignment could be near LOS/apex or deep before rotation. If he is primary force, his initial outside leverage matters; an intermediate alley defender may align inside/out of the path intentionally. A safety cannot both be the deep last level and abandon his depth at the snap without a coverage replacement.

---

# Part V — Coverage adjustments, receiver distributions and motion rules

## 19. Cover 0 and Cover 1

**Cover 0:** no designated deep cap; each eligible receiving threat gets man responsibility, often with pressure. Pre-snap defender locations must allow realistic man assignment and blitz travel. Bunch/stack must employ traffic response; don't send two DBs into one receiver's crossing route.

**Cover 1:** man on receiving threats with one deep post defender and sometimes a robber/low hole. Corners may press/off, safeties rotate, LB on RB may align closer to backfield. Motion across the formation can reveal man-travel if the defender follows; alternatively the defense can switch matchups. The FS cannot abandon post leverage because one RB moved across the QB.

## 20. Cover 2 (spot, sink, cloud, invert)

Two deep halves (typically two safeties) plus corner/flat support; corners can jam/squat and sink; underneath defenders carry hooks/curls. The split of each half should protect vertical #1/#2 conflict; 2x2 and 3x1 require distinct rules. A cloud corner's shallow initial position may invite run support, but he should retain legal and schematic access to the deep-half player behind him.

## 21. Tampa 2

Mike must be positioned and oriented to carry an inside vertical middle threat, with run-fit costs. Pre-snap mugging or shallow stacking affects whether he can actually get depth; do not teleport him to deep hole after recognizing pass. Corners and safeties behave like Cover 2 family with rotation nuances.

## 22. Cover 3 (Sky, Buzz, Cloud, Match)

Three deep thirds and typically four underneath defenders. Distinguish:

- **Sky:** a safety rolls down to curl/flat or force, corners take outside thirds.
- **Buzz:** a safety inserts into hook/curl; underneath match points and run support change.
- **Cloud:** one corner becomes shallow flat/cloud with a safety taking over his deep outside third; a **coverage replacement** is mandatory.
- **Match Cover 3:** pattern-match obligations can carry a receiver vertically rather than drop to a static landmark. Need #2 vertical rules, seam/curl-flat distribution, and threat handoffs.

A two-high presnap look can rotate to any of these after snap. The time required to rotate is a strategic cost, not a cosmetic animation.

## 23. Quarters / Cover 4 / Palms / Cover 6

**Quarters:** safeties and corners use #2/#1 release reads and can match verticals, rob inside crossers, or fit runs according to rule. A safety aligned over #2 with inside leverage may key #2 vertical before committing downfield or to run support.

**Palms / 2-read:** the #2 release triggers pattern exchanges between corner and safety. The exact coaching rules vary; do not assume every version of “Cover 4” is spot-drop quarters. A quick-out from #2 may change which DB carries #1 vertically.

**Cover 6:** quarter-quarter-half asymmetry; actual quarter side depends on field/boundary/strength and the call. A motion that converts passing strength may require “check” or stay on original distribution, depending on coaching. Defense cannot reassign a half-field safety to a quarter as an instantaneous spawn move.

**Poach / Solo / Stubbie vs trips:** weak safety can rob #3 vertical while backside corner locks #1; trips-side defenders may match #2/#3 with distinct spacing. The defense's pre-snap alignment should reflect who has a feasible release/vertical handoff path, not assume every nickel or safety can cover all three trips receivers.

## 24. Motion handling: travel, bump, rock, spin, lock and banjo

### 24.1 Travel

A man defender follows the motion player's body. This reveals man tendency, but may be a disguise; not every traveling DB means Cover 1. Motion width/acceleration must be physically attainable, and the trailing defender might fail to arrive before snap.

### 24.2 Bump

Zone or match defenders exchange adjacent coverage and run-fit responsibilities: nickel slides to new #2; Mike shifts one gap; Will replaces vacated hook, etc. The whole structure must account for the original gap/coverage, not only the player moving in view.

### 24.3 Rock/spin

Safety rotates to a new depth/side while another becomes post or underneath player. Actual player movement happens over time; the coverage is stressed if the offense snaps before rotation completes. Preserve the pre-snap shell as an observable *display*, the real called assignment as a separate *intention*.

### 24.4 Banjo/switch

In stack/bunch, two defenders exchange receivers by release direction: first out/first in, high/low, first vertical, or other coached policy. The matched recipient may not be known until after snap. Pre-snap both align with reasonable cushion/inside-out relation that avoids clipping teammates.

### 24.5 Lock / box / bracket

Defenders may lock a particular receiver through motion, box bunch with triangle leverage, or bracket an inside threat. These are distinct state machines with different initial positions. If an offense creates 3x1 from 2x2, the defense can explicitly choose a **no-adjust / stay call** but must accept resulting leverage weakness. Avoid silent all-knowing replacement of receiver assignments.

### 24.6 Trips / empty response table

| Offensive change | Defensive recognition | Valid example response | Opposing case that must remain legal |
|---|---|---|---|
| 2x2 → 3x1 | #3 crosses into trips | Nickel bumps, weak safety poaches #3 | Man DB follows #3 rather than bump |
| 2x2 → empty | RB expands into slot | LB travels, nickel replaces hook, pressure adjusts | Defense stays in zone shell and widens hook |
| Y trade | Attached TE changes side | 3-tech/edge strength check | Front stays static but force side changes |
| Bunch to spread | #1/#2/#3 spread | Banjo dissolves into normal match | Defense retains special bracket on #2 |
| Reduced #1 | Boundary route release changed | CB shade adjusts inward | CB stays hard outside in called cloud |
| Orbit jet return | Motion reverses | Zone bump returns, or man traveler reverses | Defense stays on previously called leverage when runner uncertainty persists |

---

# Part VI — Pre-snap state machines: what players know, when they commit and what they can do

## 25. Physical placement and tactical decision are separate objects

[SIM DESIGN] Proposed records:

```ts
interface PresnapBodyGoal {
  reference: LandmarkRef;        // ball, hash, OL shoulder, eligible #2, etc.
  targetPos: Vec2;               // desired, never a teleport
  targetFacing: number;          // torso direction
  targetFootprint: FootStance;   // feet and base, not only body center
  maxArrivalSpeed?: number;     // arrival technique, not physical cheat
  requiredSetAtSnap: boolean;
}

interface PresnapAssignment {
  jobId: string;                 // e.g. force-field, Mike-B, quarter-v-2
  frontOrCoverageCall: string;
  triggerCues: string[];
  sightAndKeys: string[];        // what the player can actually observe
  exchangeRules: string[];      // if motion changes numbered receiver
  commitment: 'installed' | 'checked' | 'reacting';
}

interface PresnapObservation {
  sampledAt: number;
  opponentBodyId: number;
  observedPosition: Vec2;
  observedVelocity: Vec2;
  certainty: number;
}
```

Schematic illustrations only: adapt to the repository's actual interfaces rather than introduce a redundant parallel football state machine.

## 26. One snap has multiple observable epochs

`huddle -> break -> initial alignment -> set -> motion/shift -> defensive checks -> reset if necessary -> cadence -> snap`

Every event has a timestamp. A defender who didn't see the early wing trade cannot react to it by magic. “Reads at snap” aren't a free private copy of the opponent's play object. Model late calls and realistic recognition lag separately from physical movement lag. A defender can know his installation yet be unable to physically reach the new alignment by the snap.

## 27. Commitment and hysteresis without making players stupid

A linebacker who has accepted a pull read should not reverse into his original gap because the observed lineman temporarily crosses a numeric threshold. A man defender should not alternate every tick between a legitimate run-support job and ordinary downfield coverage because his receiver crosses LOS+2. But a false key, throw, true receiver release, new eligible distribution, or recognized QB keeper must be able to break the old responsibility.

Correct model: **persistent responsibility, moving objective, physically bounded execution**. Do not use a universal 0.3-second “can't change your mind” timer for every player or smooth every destination regardless of changed evidence. Use football-owned cue validity and explicit replacement conditions.

## 28. Communication graph

Represent who can hear/see which teammate and at what delay. The Mike may direct front or passing strength; safety may set coverage; center may declare Mike and protection; QB may audible; a TE may signal motion. Team synchronization can be coached and relatively reliable but not instantaneous through 53 yards of field. A late formation change should create legitimate unready/partially adjusted cases, not random unexplained assignment switches.

## 29. Offensive audible and defensive disguise

- QB identifies likely fronts from **visible body positions**, not a hidden `defCall.coverage` field.
- Front numbers, tilted end, two-high, mug A, nickel over slot, corner leverages, safety rotation, and defensive substitutions are inputs to an uncertain belief, not absolute coverage truth.
- Offense may change protection, run-side, route check, motion or entire play; snap legality still enforced.
- Defense can stem/reposition late or present pressure and bail; this consumes real motion time.
- A bluff/stem can induce a mistaken but plausible protection declaration; don't force perfect recognition by either side.

---

# Part VII — Concrete implementation blueprint

## 30. Generate a formation from football landmarks, not a random list of points

**Stage A: Determine legal eligible structure.** Place five OL, any attached eligible ends, off-line players and quarterback. Validate exactly the intended on/off structure and number/reporting metadata.

**Stage B: Define body surfaces.** Assign lateral spacings/splits and individual OL depth/stagger, then TE/wing attachments. Compute A/B/C/D/E gap boundaries from actual bodies.

**Stage C: Position skills.** WR outside/slot/stack/bunch split rules; QB snap mode; RB mesh relationship; F/H insertion lane; movement paths for shifts and motion.

**Stage D: Select defensive match.** Personnel, front, DL techniques, LB fit stack, apex/force, coverage shell and actual deep/underneath rules.

**Stage E: Condition on pressure/game state.** Hash, ball spot, field/boundary, personnel, down/distance, red-zone depth, tempo and coaching tendency.

**Stage F: Physically settle.** Players reach their stances subject to movement, collide/avoid, attain proper legal status, then initiate legal movement/set timeline.

**Stage G: Snap only after actual legal state or produce foul.** No last-frame teleport to make a play legal.

## 31. Central alignment solver: constraints and priorities

The generator should solve a bounded constrained placement problem:

- **Hard constraints:** count/on-off/eligibility, neutral zone, sideline, physical body overlap, legal motion, safety of feet/ball interface.
- **Installed duties:** attach Y, point of attack, TE side, WR # count, force/coverage replacement, defense called alignment reference.
- **Soft coaching choices:** preferred split, slight team style, line setback, corner cushion, shade, depth and foot stagger.
- **Performance constraints:** physically reachable before snap; don't shift DL 5 yards with 0.05 s left.
- **Stability:** adjacent defender adjustments should not repeatedly reindex #2/#3 due to a 0.01-yard shuffle of a motioning receiver near center. Use crossing/eligibility events, not unstable instantaneous geometric sorting every physics tick.

If the requested final alignment is infeasible, produce an explicit **late/incomplete adjustment**, timeout/audible decision, or penalty where applicable. Do not silently move the player through teammates.

## 32. A compact configuration schema

```yaml
formation:
  offense:
    personnel: '12'
    ol:
      reference: ball
      centerDepth: configured
      leftGuard: {split: configured, depth: configured, stance: threePoint, initialFoot: left}
      rightGuard: {split: configured, depth: configured, stance: threePoint, initialFoot: right}
      leftTackle: {split: configured, depth: configured, stance: twoPoint, initialFoot: left}
      rightTackle: {split: configured, depth: configured, stance: twoPoint, initialFoot: right}
    eligibles:
      - {slot: Y, attachTo: RT, onLine: true, split: tight}
      - {slot: X, side: field, onLine: true, split: wide}
      - {slot: Z, side: boundary, onLine: false, split: reduced}
      - {slot: H, side: field, onLine: false, split: wing}
    backfield:
      quarterback: {mode: underCenter}
      runningBack: {relation: QB, offset: playSpecific, mesh: called}
    motion:
      actor: H
      path: across
      mustReset: false
  defense:
    personnel: nickel
    front: over
    frontStrength: calledTightEndSide
    defensiveLine:
      - {job: nose, reference: C, technique: 1, gap: weakA}
      - {job: tackle, reference: RG, technique: 3, gap: strongB}
      - {job: leftEdge, reference: LT, technique: 5, fit: box}
      - {job: rightEdge, reference: Y, technique: 9, fit: force}
    linebackers:
      - {job: Mike, relation: frontGaps, responsibility: insertStrongA}
      - {job: Will, relation: frontGaps, responsibility: weakCutback}
    coverage:
      called: cover3Match
      displayedShell: twoHigh
      motionCheck: tripsBump
      apex: byNumberTwo
      deepCap: maintainedUntilCue
```

All numeric values should come from well-defined physically plausible style/formation defaults plus conditioned observed distributions. This sample intentionally shows placeholders so nobody mistakes synthetic numbers for NFL standards.

## 33. Source of truth and dependency boundaries

1. **The formation owns pre-snap legal player roles, alignment and planned motion.**
2. **The coverage/front system owns defensive assignments and adjustment rules.**
3. **Perception owns what a given player has observed.**
4. **Movement planning owns how a player physically reaches a requested alignment.**
5. **Physics owns actual pose, feet, speed, contact and support.**
6. **Rules owns legality and the whistle.**
7. **Game/coaching owns calls, substitutions and timeouts.**

Do not mix levels: a motion handler should not edit a defender's real `pos.y`; it should provide a new feasible body goal. A coverage matcher shouldn't mutate the offense's eligible count. A gait helper shouldn't decide whether a WR is #2.

## 34. Snapshot fields every frame should expose

```text
preSnapPhase, secondsToSnap, snapReadyAt, setSince
actualBodyCenter(x,y), leftFoot(x,y), rightFoot(x,y)
actualFacing, gaze/keys, posture, stanceFootLoad, bodyVelocity
intendedFormationReference, requestedAlignmentGoal, achievedPositionError
onLine/offLine, eligibleNumber/status, reportedEligible, lineRank
formationStrength, passingStrength, runStrength, fieldSide
calledFront, currentFrontTechnique, physicalShadeOf, initialGap
calledCoverage, shownShell, activeCoverageAssignment, receiverRank
force/alley/cutback/cap responsibilities, communicationState
motionActor, motionPath, lastShiftCompleteAt, observedCueTimestamp
rawMovementRequest, afterSpacingRequest, afterContactRequest
ruleStatus/legalReason, pendingPenalty, snapTimestamp
```

Your film/replay should be able to overlay foot points, OL splits, first-step headings, defensive shades, #1/#2/#3, gap labels, displayed shell, actual assignment and movement-intent arrows. Diagnostic annotation is far more useful than only plotting 22 dots.

---

# Part VIII — Exhaustive test catalog

## 35. General assertion format

Each fixture should record **what is installed**, **what each actor can actually see**, **what movement they request**, **what pose they achieve**, and **what real football obligation remains**. Every success needs at least one opposing condition where staying put or losing is legitimate. Use exact frozen seeds and opposing mirroring, but do not insist formation flip always produces exact geometric identity (field/boundary and personnel are asymmetric).

### 35.1 Offensive legality / formation

- [ ] Seven legal on-line bodies at snap and correct two eligible ends.
- [ ] Slot truly off line; outside WR truly on line when needed; a covered eligible does not remain pass eligible.
- [ ] Attached Y's move on/off changes legal count, and another player compensates legally.
- [ ] Six-OL package keeps legal numbering/reporting and correct eligible end.
- [ ] Unbalanced formation recalculates actual covered ends without changing raw athlete identities.
- [ ] Motion at snap is one permitted eligible back, not forward toward LOS.
- [ ] Two moving players count as shift and finish legal set, or produce correct foul.
- [ ] Illegal receiver-on-line motion cannot pass as jet because his x displacement is small.
- [ ] Snap after reset preserves the actual last-second foot position and momentum.
- [ ] No neutral zone overlap across varied body sizes, deep defensive stems and center's ball grip.

### 35.2 OL stance, splits, and alignment

- [ ] G/C/T have independently calibrated depth; not one shared x coordinate.
- [ ] Split metrics distinguish center-to-center from surface clearance.
- [ ] Legality holds with narrow/wide line, moved hash, and changed TE side.
- [ ] Puller can move behind center without contact if space physically exists.
- [ ] Puller cannot ghost through a center even if target waypoint is clear.
- [ ] Two-point tackle and three-point tackle have different physically plausible first steps, not separate magic acceleration.
- [ ] 0-nose / 1-tech / 2i / 3 / 4i / 5 cause appropriate new blocking geometry.
- [ ] Changed OL split modifies defensive alignment by reference, not absolute static y coordinate.
- [ ] Realistic stagger does not cause protected native pass/rush contacts to teleport to an earlier line-of-scrimmage point.
- [ ] Counter kick-out remains meaningful under deeper guard alignment or fails for a defensible reason.

### 35.3 QB/RB/fullback mesh

- [ ] UC RB and QB avoid mutual blocking via actual separation and path.
- [ ] QB continues ride/carry-out under realistic momentum; does not stop abruptly on exchange.
- [ ] Shotgun backside RB takes ball at own designed mesh, not the first arm-radius hit.
- [ ] Same-side shotgun runs use their own correct geometry rather than reverse through QB by default.
- [ ] Pistol runner remains behind QB and obtains a downhill exchange.
- [ ] I-formation fullback starts deep enough to run through a legal lead path and does not repeatedly collide with QB.
- [ ] Jet motion doesn't physically pass through a QB, RB or tight sniffer.
- [ ] Mesh event retains correct possession when movement geometry fails.

### 35.4 Fronts/gaps/roles

- [ ] 4-3 over/under relocate 3-tech and shade nose per authored *definition*.
- [ ] Tite 4i players are inside tackles in feet/body geometry, not named-only.
- [ ] Wide9 is actually outside the changed TE surface and remains inside field boundaries.
- [ ] Odd OLB/edge roles are not moved to stack LB solely because roster label says LB.
- [ ] 3-tech alignment independent of defender's blitz/stunt post-snap job.
- [ ] TE trade updates gaps and force; downstream LB has a documented check.
- [ ] Front remains valid against two attached TEs, no TE, tight wing, unbalanced.
- [ ] Goal-line crowding does not force illegal defensive neutral-zone overlap.

### 35.5 Coverage and alignment

- [ ] Cover1 post defender is aligned deep enough for a feasible post assignment.
- [ ] Two-high displayed Cover3 rotates with physical time cost after snap.
- [ ] Cover3 Cloud has replacement deep outside third, not two flat defenders and no third.
- [ ] Quarters safety correctly relates to #2 and does not abandon vertical because of a false run cue.
- [ ] Cover6 quarter/half sidedness matches called field/boundary or strength policy.
- [ ] Corner press/off/inside/outside leverage responds to receiver split and called job.
- [ ] Nickel apex follows #2 distribution and leaves a compensating run-fit responsibility.
- [ ] A press corner cannot spawn through WR after late motion.
- [ ] Safety doesn't collapse to LB depth before a valid carrying-runner cue, unless specifically coached and replaced.
- [ ] Deep post defender retains ability to overlap verticals after motion.

### 35.6 Motion, travel, bump and exchanges

- [ ] #1/#2/#3 order changes correctly after cross formation motion; stable while still near midfield crossing event.
- [ ] Zone bump never creates uncovered A/B gap or vacated hook assignment without a documented replacement.
- [ ] Man travel has finite speed and may be late when offense snaps quickly.
- [ ] Trips check rotates FS/SS/nickel in physical time, not teleportation.
- [ ] Bunch banjo responds to *release order* and preserves eligible threats.
- [ ] Stack receiver crossers don't make both defenders collide head-on.
- [ ] Jet motion followed by return doesn't cause repeated 180/360° spins solely from mode threshold.
- [ ] Y trade changes passing/TE strength separately from called front strength.
- [ ] Late empty adjustment can produce a legitimate mismatch while legal set remains.
- [ ] Shift period resets all players and enforces one-second requirement.

### 35.7 First movement / real outcomes

- [ ] Offensive linemen's 0.5/1.0/2.0s body displacement and depth conditioned by run/pass concept and side can be measured against tracking.
- [ ] DL's 0.5/1.0/2.0s lateral pursuit conditioned by shades/strong/weak and runner flow can be compared, not only pooled.
- [ ] A correct front/coverage assignment need not generate a win if player cannot physically get there.
- [ ] A clearly bad pre-snap split generates explainable traffic/angle costs rather than being canceled by a strength cheat.
- [ ] False pre-snap run tells can fool a player; late observed contradiction can correct him.
- [ ] Motioning player retains actual achieved velocity through snap.
- [ ] User/team style changes positions and legitimate tactical consequences without changing physical attributes.

## 36. Scenario matrix for a serious simulator release


Use a **small orthogonal factorial** instead of cartesian testing every conceivable pairing. Cover representative normal, strong, weak, boundary, goal-line and late-motion cases, with focused additional tests for new geometry.

| Matrix dimension | Useful cases | Failure being challenged |
|---|---|---|
| Offensive personnel | 10, 11, 12, 13, 21, 22, six OL | Actual on/off and true surface |
| Offensive set | UC Ace, I, Strong/Weak I, Pistol, Gun Doubles, Trips, Empty, Bunch, Unbalanced | Spacing and eligibility |
| Motion | None, jet, orbit, across, return, Y trade, RB empty, H shift | Observable strength and assignment transition |
| Run concept | IZ/OZ/WZ, Duo, Power, GT Counter, GH Counter, Trap, Toss, Split Zone, Draw | First step and run strength |
| Defense front | Over, Under, Tite, Odd, Bear, Wide 9, goal-line | DL shade and LB fit ownership |
| Coverage | Cover0, Cover1, C2, C3 Sky/Buzz/Cloud/Match, Quarters, Palms, C6 | Shell versus actual role |
| Defensive response | Travel, bump, stay, rock/spin, poach, banjo, blitz | Complete response and replacement |
| Field | Field hash, boundary hash, middle, backed up, red zone | Geometry and leverage |
| Tempo | Early shift, set then motion, late motion, fast snap, late stem | Physical completion and legality |
| Matchups | Large/small OL, TE inline/wing, mismatched edge/DT, fast/slower slot | No position-based strength magic |

### 36.1 Twenty-four high-value scenarios

1. **Base Ace, Over, Cover 3:** verify 7 on, 4 off, 1/3 shade, stack MIKE, deep thirds, SS curl/force and normal QB/RB room.
2. **Same with Y attached right:** defense sets run strength to actual extra surface; defensive #2 distribution still uses eligibility.
3. **Y trades to left, full reset:** recompute DL technique assignment and second-level fit; satisfy simultaneous set rule.
4. **Y trades late and no reset:** simulate legal consequence, defensive incomplete response; no instant front flip.
5. **Gun Doubles OZ strong/weak:** RB may start opposite run; inspect handoff location and lateral travel.
6. **Gun Doubles same-side run variant:** provide explicit call/mesh alternative rather than banning it.
7. **I Power vs 4-3 Under:** F's kick inside shoulder and backside G pull alignment; outside support still exists.
8. **I Counter GT vs Wide 9:** guard kick and tackle wrap physical routes, turning side, snap stagger, late fitting.
9. **Counter GH with sniffer:** H begins off line with actual clearance path and selected surface; ensure eligible line count remains legal.
10. **Ace OZ weak vs Tite:** 4i surfaces, zone doubles and LB exchange; track OL and DL two seconds.
11. **Ace WZ strong with attached TE:** TE, tackle, guard move laterally; no silent backfield penetration solved by a speed bonus.
12. **Trap vs penetrating 3-tech:** allow trapper/DT approach, preserve defensive wrong-arm/penetration, prove reserve trapper target.
13. **Duo vs Bear:** center/guard/tackle own covered first-level work, linebacker collection depends on achieved keeper security.
14. **Toss to field with condensed #1:** force corner outside; X crack assignment; replacement DB run-support remains.
15. **Jet motion 2x2 to Trips:** #1/#2/#3 stable reindex; choose bump or man traveler; ensure primary/secondary force.
16. **Return motion into original 2x2:** defender does not spin 360° from threshold changes.
17. **Stack switch release vs Cover 1:** man exchange/bunch answer, no running through teammates.
18. **Bunch vs Quarters/Palms:** #2 out, #1 vertical, #3 under; match ownership changes without illegal early anticipation.
19. **3x1 against Cover 6:** weakside quarter/half selection per call; solo/poach answer if called.
20. **Empty RB out of backfield:** man LB travel vs zone bump; vacancy of old run-fit addressed; offense remains legal.
21. **Double A mug vs gun pass:** interior blitz presentation with real retreat to hook if bailed.
22. **Two-high disguise Cover 3 Buzz:** safety performs actual rotation after snap and can lose leverage if late.
23. **Red-zone Cover 0 vs condensed bunch:** enough lateral leverage to contest releases; no magic defender collision filtering.
24. **Unbalanced 6 OL plus wing motion:** eligible reporting, true on-line ends, shifted box gaps and defense response.

### 36.2 Paired opposing cases

The benchmark should deliberately include good offensive execution versus legitimate defensive success:

- A 5-tech stays outside and boxes a good pull; the guard logs only if acquired crossing evidence supports it.
- The same guard arrives inside and physically kicks the end; no scripted offensive win.
- A Quarters safety correctly stays deep on a vertical #2 despite run flow; an appropriate run-support safety comes down on acquired carry.
- A nickel correctly bumps with #2; a man DB legitimately travels. Neither is globally more intelligent.
- A center and guard secure a DT before climb; another matchup's DT wins enough leverage that the helper *must stay*.
- A deep outside corner contains a toss; a legitimate receiver stalk can still block him.
- A fast motion wins a mismatch because defender is late; a defense that began prealigned need not get confused.

---

# Part IX — Practical development sequence and common anti-patterns

## 37. Implementation phases, ordered by dependency

### Phase 0 — Audit what's already implemented

Inspect current formation, legal line, OL depth/splits, player foot pose, DL shade placement, safety/CB alignments, man/zone motion adjustments, front strength, snap cadence, and native film metadata. Before touching code, write down the actual source of each value and identify whether it is authored, observed, requested or achieved.

### Phase 1 — Legal, measured static alignment

Align offense and defense correctly without motion: real body footprints, personnel, OL staggering, on/off/eligibility, defensive technique relative to offensive references, safety shell positions and QB/RB mesh. Validate with held pre-snap frames and no post-snap outcome target.

### Phase 2 — Scheme-conditioned alignment

Install distinct front/coverage/line-family references, team style, hash and TE strength. Make 4i/5/9 actual foot/body relationships. Ensure extra surface changes gaps and eligibility.

### Phase 3 — Motion and shifts as physical timelines

Implement motion path, set time, defender checks/travel/bump/rotate, communication lag, late inability to settle, true snap velocity and penalties. Validate legal/illegal controls.

### Phase 4 — Transfer into post-snap execution

Check first-foot trajectories, QB mesh, blocker clearance, zone flow, DL/LB reads, DB coverage and force. Avoid changing stance positions to rescue a poor simulation if the actual football/body requirement is correct; fix the necessary execution technique.

### Phase 5 — Tracking-calibrated diversity and coaching style

Measure conditional distributions and add modest team/coaching style only after mechanism correctness. Preserve NFL-like variation. Don't inject fresh random alignment error on each read; sample persistent tendencies and context-specific skill errors.

## 38. Dangerous implementation shortcuts

**Shortcut: spawn positions from roster label alone.** Bad because 3-4 OLB is an edge, slot nickel is apex, TE may be inline or off, safety might be deep cap or primary force. **Replacement:** align from installed *job* and actual surface.

**Shortcut: `strongSide = mostTEs` drives everything.** Bad because passing, run, front and field strengths differ. **Replacement:** four independent strength/side concepts plus explicit adjustment rules.

**Shortcut: all OL at exact same depth.** Bad because pull clearances, pass-set geometry and initial blocking angles become wrong. **Replacement:** measured center/guard/tackle staggering and legal near-line feet.

**Shortcut: a 3-tech is automatically B-gap rush.** Bad because assignment/slant/two-gap technique differs. **Replacement:** stance/technique and post-snap duty as separate records.

**Shortcut: static spot-zone positions equal coverage.** Bad because match, cloud replacement, seam carry and motions require assignments. **Replacement:** shell + responsibility + movement objective.

**Shortcut: defender teleports with jet motion.** Bad because motion's tactical function partly derives from travel time. **Replacement:** movement request, feasible acceleration, late incompletion.

**Shortcut: random jitter equals recognition uncertainty.** Bad because repeated incoherent targets produce unrealistic nervous movement. **Replacement:** observation/cue acquisition, coherent retained job and explicit evidence-backed transition.

**Shortcut: receiver counting from original formation only.** Bad because 2x2 becomes trips and #2/#3 change. **Replacement:** spatial eligibility/rank with stable events and conditional checks.

**Shortcut: OL_SPLITS looks more NFL-like, so accept all yardage regressions.** Bad because the implementation of blocking techniques may be built around old geometry. **Replacement:** preserve authentic splits as a target, trace exact first incorrect work and repair technique; don't normalize obviously illegal/impossible contact positions.

**Shortcut: every coverage shell predicts final coverage.** Bad because disguises, rotations and complex match principles exist. **Replacement:** displayed shell and actual call are distinct with an observed movement trace.

**Shortcut: six-yard cutback defender always follows the pull.** Bad because backside fit might require staying home. **Replacement:** assignment-specific keys and role exchange.

**Shortcut: a player requests a desired velocity, so he has attained it.** Bad because physical acceleration, foot turning and traffic matter. **Replacement:** inspect raw command, final command and actual World step independently.

## 39. Key questions every position/role implementation must answer

1. What is the player's **legal status**, assignment and eligibility at this instant?
2. Which actual body/ball/field landmark sets his alignment and why?
3. Where exactly are his feet, shoulders, hips, COM and eyes?
4. What does he already know from the play call and huddle?
5. What can he observe of the opponent, with which delay and uncertainty?
6. What changes if #2 motions, TE trades, or field strength reverses?
7. Does he travel, bump, reset, stay or communicate a replacement?
8. Which gap, route, blocker or runner is his *current* responsibility?
9. Can he reach his desired position before snap with his current momentum?
10. If not, is the result a foul, a blown check, a timeout, or an accepted tactical loss?
11. Which first step and acceleration/braking demand follows at the snap?
12. How do we establish with recorded evidence that the actual movement was causally correct?

---

# Part X — Sources, evidence discipline, and repository handoff

## 40. Sources and verification

### Official rules

1. [NFL Football Operations — 2026 NFL Rulebook](https://operations.nfl.com/rules-officiating/2026-nfl-rulebook) — authoritative source for Rule 7 alignment, legal shifts and motion, neutral zone, eligible-number/reporting rules and enforcement. Read the official text for exception handling rather than copying this handbook's summary.
2. [NFL Football Operations — Rules / current rulebook navigation](https://operations.nfl.com/the-rules/nfl-rulebook) — contextual reference and rule index.

### Football coaching vocabulary

3. [Football Toolbox — Understanding Defensive Front Alignments](https://footballtoolbox.net/understanding-defensive-front-alignments) — technique-number naming and 0/1/2i/3/4i/5/6/7/9 conventions; verify local system exceptions.
4. [Open Play Football — Defensive Fronts: Gaps, Techniques and Fits](https://openplayfootball.com/learn/defensive-fronts) — introductory explanation of fronts and differences between position and gap assignment.

### Internal project evidence — source qualified

5. [`docs/reviews/pre-snap-alignment.md` on Claude's run-defense-development branch](https://github.com/tannerthardy/football-simulation-/blob/claude/run-defense-develop/docs/reviews/pre-snap-alignment.md) — user-directed tracking study of scheme-conditioned 2022 alignments. Check actual producing SHA, cohort and operator before promoting its values.
6. [`docs/reviews/run-defense-develop.md`](https://github.com/tannerthardy/football-simulation-/blob/claude/run-defense-develop/docs/reviews/run-defense-develop.md) — current experiment, including the regression from adopting tracked OL splits and stagger in a still-imperfect run/pass movement system.
7. [`docs/reviews/run-offense.md`](https://github.com/tannerthardy/football-simulation-/blob/claude/run-game-v3/docs/reviews/run-offense.md) — pre-snap relation to combos, puller paths, mesh, first-level reach and runner lane decisions; research, not all accepted production.
8. [`docs/football-handbook/moving-run-footwork.md`](https://github.com/tannerthardy/football-simulation-/blob/develop/docs/football-handbook/moving-run-footwork.md) — detailed separate treatment of moving offensive-line footwork, cross-scheme pulls and microtests.
9. [`docs/references/honest-nfl/`](https://github.com/tannerthardy/football-simulation-/tree/develop/docs/references/honest-nfl) — imported teaching film, screenshots and notes. Treat examples as positional technique illustrations rather than distributions.
10. [`docs/NFL_RULES.md`](https://github.com/tannerthardy/football-simulation-/blob/develop/docs/NFL_RULES.md) if/when present on accepted branch; if unavailable, use the official 2026 Rulebook instead. Internal implementation coverage and authoritative legal rules are distinct.

**Evidence discipline:** distinguish NFL body-center tracking versus feet/toe/hand ground truth; PFF label inference versus observed movement; selected cohort versus true league-wide distribution; coaching convention versus legal requirement; and a simulated requested movement versus movement physically achieved. Avoid converting a project-specific 2022 tracking median into a hard universal rule. Only write a number into an engine parameter when its operator and football conditions are specified.

## 41. Suggested repository location

`docs/football-handbook/pre-snap-alignment-complete.md`

Link from the handbook index. Keep the rule/data appendix's producing date and source SHA; do not overwrite current accepted geometry merely because a new experimental alignment arm achieves better pooled offensive gains.

## 42. Minimum definition of done

A credible pre-snap alignment subsystem can:

- Form legal personnel/snap structures across normal and exotic NFL formations, **or** correctly diagnose and enforce their actual infractions.
- Place every player's feet/body at physically credible, *job-conditioned* landmarks under multiple fronts, shells, hashes and team styles.
- Show truly different offensive line depths, WR splits, TE/wing surfaces, QB/RB exchange geometry and defensive shades.
- Handle motion, shifts, late checks, man travel, zone bump, coverage rotation, TE trades, trips/empty and stack/bunch exchanges without instant teleports or incoherent role ownership.
- Preserve a legitimate opposing football winner: no automatic offensive or defensive alignment victory.
- Pass its actual achieved presnap geometry/velocity and retained football responsibilities into the same shared World that simulates the first movement and contact.
- Explain **why** a run or pass succeeded or failed in terms of acquisition, assignment, foot position, leverage, acceleration, collision and coverage, with source-qualified comparisons.

**Final guiding question:** *Where are the player's feet immediately before the ball moves—and what football reason, legal constraint, teammate relationship, or observed opponent behavior put them there?* If the simulator cannot answer that precisely for all 22 players, the pre-snap implementation is not complete.
