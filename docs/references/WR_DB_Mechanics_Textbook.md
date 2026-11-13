# THE ROUTE AND THE MIRROR

### An advanced field manual for wide receiver technique, defensive back mechanics, contested catches, and perimeter blocking

**Volume IV | Football Schematics & Simulation Series**  
**October 2026**

> **Guiding problem:** Two athletes receive imperfect information, compete for favorable body position, and execute a timed series of decisions under physical and rules constraints. To understand their matchup, study not only where each player runs, but where each looks, what each believes, and what each physically can still do after committing.

<div class="chapter-note">A technical coaching synthesis and simulation-engine design companion. Coverages and terminology differ by staff; example rules are defined explicitly rather than presented as universally standardized calls. Field diagrams are original, schematic, and not drawn to scale.</div>

## Reader's map

**Part I - The common physical problem:** leverage, perception, movement, and timing.  
**Part II - Wide receivers:** pre-snap plans, releases, stems, breaks, hand combat, option routes, and catch mechanics.  
**Part III - Defensive backs:** press, off-man, zone-match, body positioning, recovery, and catch-point defense.  
**Part IV - Perimeter football:** stalk blocks, crack/replacement rules, screens, run support, and legal contact.  
**Part V - Laboratories and the engine:** eleven realistic example situations, controller design, observables, testing, and references.

## PART I — The interaction before the route

### 1. Football space: leverage, angles, and time

A WR-DB matchup is a competition over **useful space at the right instant**, not simply a race to maximize distance. A receiver can be a yard clear yet unavailable because the quarterback cannot reach the throwing window; another can be tightly covered and still be in excellent position for a back-shoulder ball. A defender can surrender a short completion while successfully protecting the boundary or deep third. Assignments define what counts as a win.

Five coordinates frame almost every technique discussion: (1) the line of scrimmage; (2) the receiver's initial split; (3) defender depth and inside/outside shade; (4) the quarterback's launch point; and (5) the route's break or catch landmark. The field boundary is often a useful *extra defender*: outside-leverage man or quarters techniques can use it to compress available throwing area, while a receiver can use a reduced split to recover room for an outside-breaking route.

**Leverage is relational.** Inside leverage means the defender's body is positioned to contest an inside path relative to the WR, not that his left foot happens to be inside a fixed field stripe. Leverage can be gained, lost, re-established, or traded for access to help. A corner may willingly allow a receiver outside because a sideline and safety define that coverage's risk. A WR may accept a slightly contested release if the route ultimately attacks a vulnerable shoulder at its breakpoint.

**Cushion** is the depth between receiver and defender along the threat line. It is not the same as total Euclidean separation. A seven-yard-off corner has time to read and react but can be threatened with quick routes. When a receiver closes the cushion, the defender must decide whether to continue retreating, open his hips, or drive. The WR's goal often is to create an *irreversible decision* before the final route break.

**Time is a constraint on both players.** The WR has a route clock: the quarterback expects him at certain places within a passing concept. The defender has a recovery clock: the separation created by a break is valuable only until he can brake, reorient, and close. The engine should represent both clocks, never assuming that a fancy release is a win if it adds a second to a rhythm throw.

![Spatial landmarks in an outside WR and corner matchup](figures/01_geometry.svg)

#### The four distances to track

| Quantity | Interpretation | Typical error in simplified models |
|:--|:--|:--|
| Horizontal separation | Distance across the field | Treats sideline leverage as unimportant |
| Vertical cushion | Depth toward the defense | Ignores rapid cushion closure by a fast WR |
| Path-to-intercept | Defender's feasible route to catch point | Assumes instantaneous cuts and turns |
| Ball-arrival window | Time and space where a receiver can play the ball | Computes separation at throw instead of at arrival |

### 2. What each player actually sees

No position should receive the true play call as a hidden input. Each player sees a restricted and partially noisy world. The receiver's pre-snap picture may be a **coverage triangle** consisting of his corner, nearby overhang/linebacker, and safety. That provides clues about support, collision threats, and likely routes to grass. But alignment does not prove coverage: rotation, trap, match, and disguised man can overturn an initial hypothesis.

For a DB, visual attention is **technique dependent**. A press-man corner commonly anchors his gaze on the receiver's center mass or low torso/hips: hands and head can fake, but a body must eventually displace to change direction. In off-man, a defender may key receiver hips and stem while maintaining awareness of his cushion and help. In many spot-drop or pattern-match zone calls, a DB is taught some combination of QB/route-triangle vision and receiver distribution. There is no universal rule that corners must never look at the QB, nor one that DBs should always watch him: eyes follow coverage instructions, field situation, and whether the defender is in position to locate the ball.

The receiver also has different gaze tasks at each stage. Before the snap he locates leverage and rotating defenders; in the release he diagnoses the corner's first meaningful movement; through the stem he observes cushion and hip transition, mostly through peripheral vision; at a specified landmark he identifies a vacated zone or reroutes his stem; and at the catch he tracks the flight path as late or early as the route requires.

What a player *looks at* is not necessarily what he *understands*. Seeing safety rotation without correctly distinguishing rotation to Cover 3 from a buzz or robber variation can still produce a wrong decision. The model needs separate observation, interpretation, anticipation, and action.

| Technique or duty | Primary visual information | Secondary information | Dangerous distraction |
|:--|:--|:--|:--|
| WR versus press | CB leverage, feet, strike timing | Safety/inside help | Dancing without gaining ground |
| WR versus off | CB cushion and turn, overhang location | Shell/rotation | Assuming shell determines coverage |
| CB press man | WR low torso/hips, route path | Help, near hand | Early QB peek |
| CB off man | WR stem/hip level, cushion | QB timing as taught | Driving head/shoulder fake |
| CB Cover 2 cloud | #1 release, flat threat, safety support | QB, #2 distribution per rule | Chasing #1 vertical indefinitely |
| Safety quarters | #2 release/depth, #1 and run/pass keys per check | QB after distribution | Prematurely jumping run action |
| Nickel pattern-match | #2 release and route exchange triggers | Back/flat, #3 push | Following a receiver after he has been exchanged |

### 3. Athletic movement underneath the football

Both positions require a movement state richer than a single location and speed. Track horizontal velocity, body facing, hip facing or openness, trunk lean, lateral base, loaded foot, braking state, balance, head/eyes target, and hand availability. It is acceptable for these to be *abstract states*, provided their effects are physical and persistent.

A backpedal is not running backward at full forward acceleration. A shuffle preserves square posture and lateral reach but usually sacrifices straight-line speed. A crossover can gain ground but opens hips. A bail technique deliberately opens and gains depth. A speed cut maintains comparatively more velocity on a moderate-angle break than a high-angle stop, which requires substantial deceleration. A rocker or pressure step is useful only if it actually moves the opponent or changes his prediction.

Acceleration and redirection are constrained by the prior velocity vector. A CB driving hard on a slant must brake before covering an out-and-up; the WR also pays a mechanical cost to sell and redirect. A WR opening his hip to run a deep out cannot instantly snap back vertical. The correct behavior is asymmetric and state dependent, not a generic 'agility +20%' calculation.

The most important engine requirement is **action commitment without forced animation locking**. A player may choose a new intention instantly, but his physical response must obey the preceding action's foot load, momentum, and balance. The result is realistic wins on double moves, false steps, undercuts, and recovering routes.

## PART II — Wide receiver mechanics

### 4. The receiver's pre-snap plan

A receiver should leave the huddle with both a route assignment and a **contingent plan**. The route has a concept-specific job: gain width, push vertical coverage, settle into a window, clear a safety, block a force player, or threaten a defender so a teammate gets open. A good route can succeed without a target. Conversely, a receiver who cuts into open grass but destroys a teammate's spacing can undermine the concept.

A disciplined pre-snap checklist asks: (1) What is my split and eligible/on-line status? (2) Do I face press, catch, or off coverage? (3) Does the defender protect inside or outside? (4) Is there safety help over me or inside? (5) What is the outside/inside space available because of the boundary and the next receiver? (6) What release preserves the intended break point and quarterback timing? (7) What changes if a nickel or safety rotates late?

Do not make the WR omniscient. He should hold a probabilistic belief about man, zone, and match, and adjust from actual post-snap cues. Against off leverage the initial decision may be to attack the cushion. Against hard inside press his plan might threaten the inside shoulder before crossing back outside; on a rapid slant his 'ideal' release may be the most direct path that preserves timing, not a long exchange at the line.

**Split affects route geometry.** A plus split widens a corner toward the sideline and may increase inside grass for a slant or dig but leaves less room for an outside break. A reduced split creates a two-way release and larger outside runway for an out, corner, fade, or wheel while also inviting traffic and collision from inside defenders. A stack or bunch can reduce immediate press exposure and create release uncertainty, but receivers must coordinate spacing to avoid interfering with one another.

### 5. Stance, first three steps, and the release clock

The WR stance should give a clean start without a false step or visible indicator of run versus pass. Coaches vary on exact foot alignment, but key fundamentals are forward intent, a usable base, and the ability to roll into acceleration. The first three steps establish whether the receiver threatens the defensive back's space or merely moves his feet in place.

A common useful sequence is **threaten - force decision - clear**. The receiver gains space toward a leverage landmark, forces the defender to commit his hips or hands, then clears the contact line and accelerates back onto route timing. The release has succeeded if the receiver obtains a path he can use in the concept and has not spent too much time doing it.

**Release families**, rather than a universal menu of fixed animations:

| Release | Main purpose | Situation | Common failure |
|:--|:--|:--|:--|
| Speed release | Preserve time, take an available edge | Soft/late press; urgent quick game | Runs into defender's leverage |
| Split/foot-fire | Threaten both sides before declaring | Patient square press | Foot tapping without vertical gain |
| Stretch/short-arm attack | Threaten defender's protected shoulder | Shaded press/slot collision | Attacks too wide, loses route timing |
| Diamond | Sell outside vertical to win inside | Corner protecting inside with suitable route | Diamond too shallow; CB never turns |
| Hesitation/change pace | Create defender freeze or premature strike | Catch/man with time available | Costs more time than it creates |
| Slide/step-back space release | Prevent early strike, preserve hand freedom | Tight press | Gives up unnecessary depth |
| Stack recovery | Reclaim vertical line after beating press | Deep routes | Drifts wide and narrows QB window |

![Release choice and defensive leverage](figures/02_releases.svg)

A **diamond release** typically works by threatening an outside/upfield path convincingly enough that a defender shifts or opens, enabling an inside win. But if the route is a short glance with immediate QB timing, the same move may be counterproductive. Technique choice must depend on coverage, desired final space, and the route clock.

### 6. Hand fighting: offensive tools and defensive answers

Hand combat is an interactive sequence, not a single strength check. The WR's first task is frequently to move the defender's feet and stress his leverage; efficient hand combat then clears the hands attempting to pin the receiver. A DB who can strike without losing his base can disrupt the route. A DB who punches while lunging may allow a clean escape.

The WR toolkit includes a **swat** to knock away an extended hand; **chop** or downward strike to clear a forearm; **rip** to reduce the surface available for a defender's control; **swim** to clear over a hand when space and timing allow; **wipe** to separate a hand from the torso; and **arm-bar or frame** postures whose legality depends on whether they become an extended push or restrictive contact. Techniques should be short and purposeful. Broad arm swings sacrifice acceleration, reveal intention, and can be penalized.

Model **left and right hands independently**. A press corner might land an inside hand on the receiver's near pec while the outside hand misses. The receiver's opposite-hand clear may win an outside path but still leave the inside shoulder pinned. A second move is sometimes needed. This difference matters on press-man, red-zone fades, and contested catches.

Sequence: **WR threatens the inside shoulder -> CB shuffles and strikes -> WR chops near arm -> CB tries to recover with trail hand -> WR rips and stacks -> CB re-establishes phase or transitions to catch-point recovery.** Every stage changes relative position and the options that remain physically achievable.

Hand fighting also has an information function. A deliberate strike can make an opponent reveal whether he intends to stay square, turn, or recover to a protected side. But exchanging hands after the receiver should be accelerating often helps the defender more than the receiver.

**Rules are essential, not optional tuning.** An offensive player cannot freely extend and shove to create separation; an eligible receiver can draw offensive pass interference for acts that significantly hinder the defender's chance to play the ball. A defender cannot sustain illegal restriction, particularly as a receiver exits the legal contact area. Model potential violations as events determined by contact time, direction, grip, route stage, and ball state, not as a blanket probability attached to 'physical WR.' NFL rules are cited in the source notes.

![Hand contact and leverage as an evolving interaction](figures/03_hands.svg)

### 7. The stem: manipulating coverage before the break

The **stem** is the portion between release and break. Its function is often to influence the defender's available paths. Against off-man, receivers may push vertical with credible body language, close the cushion, then attack a specific hip. Against zone, the stem may occupy the right space to stretch a landmark defender, force a two-on-one conflict, or align an option route with a vacated window. Against press-man, the stem may focus on stacking the defender after clearing the release.

Receiver acceleration and stride behavior should be variable but purposeful. A route runner who accelerates into cushion forces the defender to make an early retreat/open decision. A slight tempo change can elicit premature hip turn. A **lean** into the defender's leverage may widen or narrow him; a **head fake** alone should be weaker than a convincing movement of the trunk, hips, and path. A hard plant can sell one trajectory while setting up another, but only if balance and traction permit it.

The receiver must know the intended route landmark. A 12-yard dig on one pass concept may be driven to a fixed depth; another concept may instruct settling versus zone or crossing the face of a linebacker. A choice route can explicitly branch on middle-field leverage and the alignment of underneath defenders. These are not interchangeable behaviors and cannot be inferred reliably from the route's name alone.

**Spatial discipline** is a real constraint. A receiver who drifts into another route may allow one defender to play two routes. A slot whose seam release is widened beyond the expected aiming point can shorten a safety's close angle. A receiver running a deep over may need to flatten or maintain depth depending on the concept and whether the QB can see across the field.

### 8. Route breaks: how separation is manufactured

A route break consists of a deceleration or redirection strategy chosen for the required angle and speed. A speed cut, square cut, hard angle cut, rounded break, or multi-step stop is not equivalent. With a larger change of direction, the receiver must remove more forward momentum and reposition a foot under the center of mass. Effective route running minimizes unnecessary braking while creating a sufficiently abrupt threat that the defender responds late.

A **curl/comeback** requires threatening vertical depth, then sharply reducing velocity and turning back toward the QB or sideline landmark. The DB who is still carrying deep momentum has to brake before driving. A **deep out** often forces the DB to defend depth first and then accelerate laterally toward the boundary. A **dig** can be crafted to attack the inside hip, cross the defender's face, or settle into a window depending on coverage. A **corner** may be bent to open angle against inside support; a **post** may attack the safety's leverage before crossing him.

Double moves should be modeled by real first-break mechanics. The first cut on an out-and-up must be credible enough to produce a defender response. A WR who only tilts his head without decelerating should not reliably fool an elite corner. Conversely, a beautifully sold first break imposes a real acceleration penalty on the receiver too. It wins only when the induced DB loss exceeds that penalty.

| Route family | WR mechanical challenge | DB mechanical challenge |
|:--|:--|:--|
| Slant/glance | Fast inside leverage without wasting steps | Protect inside shoulder; avoid false drive |
| Hitch/curl | Decelerate and show QB efficiently | Brake deep momentum; contest catch without overrunning |
| Comeback | Threaten vertical, turn toward sideline | Recover downhill with boundary leverage |
| Dig | Stem vertical, plant, cross face | Match hip transition and inside path |
| Out | Break across-field at depth under QB timing | Open/drive while preserving sideline leverage |
| Post/corner | Manipulate deep support then redirect | Recognize post/corner stem and help relationship |
| Fade/go | Stack defender; preserve ball-side lane | Maintain phase and usable sideline relation |
| Whip/pivot | Sell inside before hard return outside | Avoid jumping first inside break |
| Option/choice | Read defender and select branch on time | Disguise and maintain rules without overcommitting |

![Why the top of the route creates mechanical separation](figures/04_break.svg)

### 9. Choice routes and the receiver–quarterback agreement

An option route is not 'run wherever open.' It is a constrained decision tree agreed upon with the QB. Choices may be based on defender leverage, middle-of-field structure, a zone window, or a specific underneath collision player. The route decision often needs to occur before the ball is thrown; two observers may disagree if one sees rotation earlier than the other.

Example: a slot option at a defined depth may break away from a man defender's leverage, settle between zone defenders, or work outside if the hook/flat player's leverage permits it. But the precise branches, depth, and timing are playbook-specific. The slot must avoid drifting through his QB's intended throwing lane while staring at an unexpectedly rotated safety.

**Two types of error must be separate in the engine:** (1) correct shared read, poor athletic execution; (2) receiver and quarterback interpret a coverage differently. The second creates incompletions or interception opportunities even when both players move well individually. Pre-snap motion, a late safety rotation, and an underneath defender robotting back into the window can cause the mismatch.

### 10. Catch mechanics, ball tracking, and body control

A receiver catches with body, eyes, hands, and timing. The ball should not be considered secured merely because its trajectory intersects a fixed receiver radius. Calculate an achievable catch envelope that varies with reach, current speed, body orientation, balance, foot load, arm availability, jump state, and defender contact.

A chest-high pass in stride differs from a ball behind the receiver, an over-the-shoulder vertical throw, a low boundary ball, or a high red-zone fade. A receiver may need to throttle, rotate his torso, turn his head, extend his hands, and then survive contact. Catching while the chest faces the ball is mechanically distinct from catching while running away and looking over one shoulder.

**Late hands** matter because early hand presentation can signal the DB that the ball is near. However, delaying too long reduces catch preparation time. The technique is contextual: a contested deep ball may benefit from late visual cues; a quarterback-thrown fastball over the middle may demand early hands.

A **back-shoulder** throw is a coordination action, not simply an inaccurate go route. The receiver must recognize the placement, decelerate or rotate, hold his space, and present a legal catch opportunity while the DB is forced to brake from trail or outside phase. A defender in perfect vertical phase can be strategically vulnerable to such a throw if he is overcommitted upfield.

At the catch point, distinguish the following stages: early ball detection; head/torso turn; hands released from fighting; extension; ball-hand contact; secure possession; landing/continuing action; and loss-of-balance or disruption. Defensive contact can affect each stage differently.

## PART III — Defensive back technique and coverage reads

### 11. Cornerback stance and press-man mechanics

The press corner's task is not simply to put his hands on a receiver. It is to control access to a route while keeping his own hips, feet, and leverage available for recovery. Alignment, shade, cushion, help, and intended press technique define his appropriate actions. A corner in press-bail Cover 3 is not executing the same assignment as a corner in aggressive press-man; the first may threaten contact and then gain deep-third depth, while the second must match a specific receiver.

A useful press stance is athletic, quiet, and balanced: knees and hips flexed within an efficient range, weight over a base that permits lateral movement, hands ready but not extended, and eyes at an appropriate low-body key. The defender should avoid a dead flat-footed posture that delays his first movement and avoid a lean that telegraphs or commits his recovery direction.

**Press feet, in technical terms:**

1. **Mirror or patience phase.** A square corner resists stepping on the receiver's first foot fake. Short, controlled lateral slides preserve the near hip relationship and force the WR to choose a path.
2. **Declare a gate.** Once the receiver's path is sufficiently clear, the corner either remains in front or opens the hip toward the chosen path while maintaining leverage. Turning too soon gives a two-way go to a receiver who has not committed.
3. **Strike within the usable window.** An accurate, short hand strike can disrupt the receiver without moving the center of mass beyond the feet. A lunge makes the corner vulnerable to a chop, rip, or sudden opposite release.
4. **Run and recover.** Once the WR clears, the corner must transition from square feet to an acceleration pattern. He aims to remain on the receiver's leverage-side hip, not merely chase a point behind him.
5. **Restore useful phase.** When beaten, the DB should locate the near hip, regain speed, and play through a lawful catch-point technique rather than panic-grabbing.

Two coaching approaches may legitimately differ: some corners use an aggressive one- or two-hand collision to redirect the WR, while others rely on patient feet with limited early contact. Good game modeling should support both. Press is a *family of techniques*, not an automatic 5-yard jam animation.

A **missed strike** should have mechanical cost: a defender whose hand extends beyond his stable base may rotate his shoulders, shorten his next stride, and require a recovery step. Similarly a successful strike can narrow the receiver's available path, delaying the route and improving the corner's trail position. These consequences should arise from contact and movement, not an independent press success check.

![Square press, opening the gate, and hip recovery](figures/05_press.svg)

### 12. Off-man, cushion, backpedal, weave, and drive

Off-man coverage begins with depth. A corner must protect against the deepest credible threat while remaining capable of driving on intermediate routes. Cushion buys time but gives free access to shorter completions. The technique is therefore a continual exchange between space surrendered, field leverage, and the offense's threat to attack vertically.

A corner in off-man may backpedal, shuffle, weave, or bail based on the call and the receiver's stem. **Backpedal** helps keep the chest square for route recognition but has a lower speed ceiling than turning and running. **Weave** allows lateral adjustment without fully giving up square posture. **Bail** transitions early into a turned run for depth; it can be appropriate against a strong vertical threat or as a disguise, but creates distinct vulnerabilities underneath.

The timing of hip opening matters. If the receiver closes the cushion rapidly, the corner may need to open and run. Open too early and the WR can snap a curl, comeback, or dig into the vulnerable shoulder. Hold square too long and a true vertical route can run by. A defender's vertical speed, confidence in his recovery, help location, and anticipation influence this decision.

The **plant-and-drive** sequence should be explicit. First the corner must recognize credible torso/hip deceleration or break; second, brake his own retreat; third, load a foot toward the intended break; fourth, redirect the center of mass; and fifth, accelerate at a *catch point or route intersection*, not blindly toward where the WR was when the cue appeared. Planting the wrong foot or being mid-stride increases the recovery delay.

**Common coaching failure:** a defender watches the receiver's head or shoulders alone, reacts to a false lean, and opens his hips despite the WR's pelvis continuing vertically. Conversely, telling a DB to read the hips does not mean the hip signal is omniscient: receivers can manipulate center-of-mass pathways, conceal an impending plant, and attack a defender's current foot load.

### 13. In phase, out of phase, trail, and the deep ball

**Phase** describes the defender's positional relationship to the receiver. The language varies by staff, so define it operationally. In this book, *in phase* means the defender is close enough and favorably positioned enough to play the receiver's route and potentially locate the ball without immediately losing him. *Out of phase* means the defender is trailing or otherwise unable to play the ball freely without compromising his catch-up effort.

When in phase, the CB can often use peripheral receiver information while turning to locate the ball, maintaining legal body leverage and attacking its actual flight path. When significantly out of phase, the first priority is frequently to close to the WR's near hip, preserve running mechanics, and read the receiver's hands or eyes to time a hand-through contest. Prematurely turning his head upfield while two steps behind can reduce speed and increase separation.

**Trail position is not necessarily a loss.** Certain man techniques deliberately play slightly underneath or on a specified hip because middle-field or sideline help covers the vulnerable side. However, an undercut without help can expose the defender to an over-the-top throw. A corner must know whether his leverage is supported by the coverage call.

Deep-ball defense often hinges on three choices: maintain a usable path (do not get stacked), choose when to locate the ball, and contest legally. A DB running with his back to the QB has less direct ball information but can infer arrival from receiver behavior. A DB who guesses wrong can lose the receiver entirely or commit interference while searching for the ball. The engine should represent eye and torso rotation as movement with opportunity costs.

**Catch-point repertoire:** locate and high-point when in phase; maintain body position to compress the receiver's window; drive the near arm through the WR's hands when trailing and the catch begins; tackle after completed possession when necessary and legal; avoid early grabs, hooked arms, or contact through the receiver before the ball arrives.

![In-phase and out-of-phase responses to a vertical route](figures/06_phase.svg)

### 14. Zone DB eyes: cloud, deep third, quarters, and match rules

'Zone coverage' is not one eye technique. A defender's visual progression and behavior depend on the coverage family and the offense's route distribution. In traditional spot-drop, the defender may see through threats to the quarterback while preserving a landmark. In match principles, early receiver releases determine whether the defender carries, exchanges, or passes a route. Each check should encode its *specific triggers*, not a vague instruction to 'cover the zone.'

**Cover 2 corner (cloud):** Often begins in a shallow outside alignment, disrupts or redirects #1 when legally available, controls the flat, and maintains a relation to #2 and the deep-half safety. If #1 runs vertical, the corner can collision and sink, but he generally cannot behave like a pure press-man corner indefinitely. If #1 releases shallow inside and #2 threatens the flat, the corner's eyes and route assignment must respond to the actual coverage rules.

**Cover 3 deep-third corner:** Must protect his deep third while understanding underneath support. In bail or press-bail technique, he turns and gets depth, sees releases and QB/underneath threats according to the call, and avoids getting trapped low against a wheel or deep outside route. Some three-deep match systems assign tighter pattern carries than generic spot-drop three-deep; they are separate policies.

**Quarters corner and safety:** On many quarters calls, the CB is responsible for #1 vertical and may transition differently when #1 is shallow. The safety often reads #2 vertical/in/out and may fit the run if his pass key permits. But quarters is not universally identical across systems. Some versions keep #1 man-like for the corner; others use more active exchange rules. The read tree must be installed, not guessed from 'Cover 4.'

**Palms / 2-read:** A simplified teaching example is a CB who is ready to take #2 to the flat if #2 goes out quickly while the safety takes #1 vertically; when #2 goes vertical, the safety carries #2 and the corner handles #1 vertical. This is a distribution rule with depth, timing, and exception details that vary by coach. One defender should not keep following a receiver after a valid exchange merely because that receiver began closest to him.

**Trips:** A weak safety can be asked to poach a vertical route from #3 or rotate to another defined threat. This changes his run fit, even if the box initially looks the same. A nickel may push with a fast #3 release while the safety replaces coverage inside. The DB must distinguish a receiver who is blocking from one who is threatening a route or wheel.

### 15. Slot, nickel, safety, bunch, stack, and motion

Slot coverage is more complicated than playing outside corner with a smaller cushion. The nickel often has a **two-way go problem**: the slot can release inside or outside with access to open field on both sides. He may also be attacked by picks, switch releases, fast motions, screens, and downhill blocking from condensed formations.

Against a slot in true man, the nickel's leverage and help dictate whether to protect the inside or outside release. Against match coverage, he may have to wall vertical #2, carry a seam, exchange a shallow out with the corner, or relate to #3 depending on the check. His feet, eyes, and hands differ dramatically between those tasks. A defender 'covering slot' is not a sufficiently precise engine assignment.

**Bunch and stack:** The initial receiver nearest a defender may not be the final man-match. The defense can use banjo, box, lock, push, or other check families. In a sample two-on-two banjo, defenders exchange receivers according to which one breaks inside and which goes outside; both must wait long enough for the release to declare without being physically screened. If one defender chases his initial receiver while the other exchanges, the coverage produces a self-inflicted collision or a free route.

**Motion:** Fly, orbit, short return, and across-formation motion may cause travel, bump, push, or rotation checks. A late motion can catch one DB moving in the wrong direction at the snap, reduce the time available to establish leverage, and expose a screen or run fit away from the motion. The player must not teleport into the new assignment; communication and body position persist.

**Condensed splits:** A receiver aligned close to the core can crack a safety, run across the field, or receive a screen with a lead blocker outside. The CB/nickel may be forced to play through traffic and must choose between avoiding a rub and preserving coverage leverage. The receiver may also have extra outside grass, making out-breaking routes more dangerous.

![Route exchange from a stack release](figures/07_switch.svg)

### 16. Run-pass keys, DB block destruction, and perimeter tackling

A defensive back on a run play is not a linebacker starting five yards deep. Coverage alignment may delay his access; he may need to read a receiver's release before becoming available in support. The DB's **force** task frequently requires holding the outside edge and sending the runner inside; an **alley** task may involve arriving inside-out between force and pursuit; a **cutback** or secondary fill task can arrive from depth. Those roles vary with front, coverage, formation, and gap exchange.

A corner facing a stalk block must decide whether the WR is running a route, inserting to block, or bluffing a block before releasing. A CB who instantly attacks 'block' on every low receiver stem gets beaten by stalk-and-go and RPO action. A CB who always retreats gives up free perimeter yardage. This is fundamentally a read with uncertainty and a timing cost.

**Defeating a stalk block:** Diagnose receiver pace and hand posture, close to a useful leverage point, establish hands inside or on a controllable shoulder, keep the outside/inside shoulder free according to force assignment, and separate when the runner commits. Avoid getting pinned in the middle of the defender's chest where there is no clear escape. Against an aggressive receiver, a DB may need to strike and replace, press the block backward, or work an edge rather than attempt a full overpowering disengagement.

**Run support versus blocking alignment:** An outside corner in Cover 2 cloud may be closer to force than an outside corner bailing to a Cover 3 third. A quarters safety whose #2 runs shallow or blocks may trigger downhill according to his check, while a safety poaching #3 vertical remains occupied. Therefore the same front can produce very different arrival times, force angles, and run-support depth.

When the ball comes toward him, a DB must approach with leverage and a controlled braking plan. An aggressive sprint straight at the current RB location can create a disastrous miss against a single cut. The defender should choose an interception point that respects the help inside or outside, throttle sufficiently for the expected cut, and use an appropriate tackle technique with head out of the collision and a secure wrap where possible. Good run support may mean forcing the ball into teammates rather than recording the tackle.

### 17. Illegal contact, holding, and interference as mechanical events

The legal contact window is not a universal license to grab a receiver. Under NFL rules, defensive contact against an eligible receiver is restricted by location, ball state, nature of contact, and whether continuous legal contact has ended; offensive pass interference and offensive holding are distinct restrictions. The 2026 NFL rulebook is the authoritative reference for an NFL-rule simulation; high school and NCAA provisions differ.

This engine should attach flags to contact interactions: distance beyond LOS, timing from snap and throw, receiver eligibility, whether the ball is in flight and catchable in a contested area, whether a player maintained or re-initiated contact, use of jersey/grip, whether arm extension materially alters the other's route, and whether the opponent was obstructing or legitimately playing the ball. Officiating outcomes can remain probabilistic, but the potential foul **must have a causal physical predicate**.

Example of a useful distinction: a CB who legally collides with a receiver early, releases, then re-grabs further upfield is not doing the same thing as a CB who runs shoulder-to-shoulder while competing for a pass. Likewise, a WR whose forearm keeps a DB at bay during a release is not necessarily equivalent to pushing him away at the top of a comeback. Holding a DB during a screen is materially different from an effective stalk block executed through legal hand placement and movement.

Do not turn this into hypertechnical robotic refereeing. Store the observable events and rulebook context, then assign reasonable enforcement uncertainty. A contact mechanic that cannot identify where and when a player grabbed the opponent cannot support credible defensive holding or OPI calls.

## PART IV — Receiver blocking, screens, and perimeter run defense

### 18. The fundamentals of wide receiver blocking

Wide receiver blocking is often misunderstood as a small offensive lineman driving a DB downfield. On many perimeter runs, the better mental model is **deny the defender a usable path for long enough that the runner crosses his angle**. The WR's feet, approach, leverage, hand placement, and timing matter more than simply overpowering a defender. A receiver who keeps the corner outside a lane for 1.2 seconds may create more value than one who displaces him five yards after the back has already run past.

The first choice is the **aiming point**. On an outside run, the receiver may be assigned to seal the corner toward the sideline, keep him attached outside, shield his inside pursuit, or occupy him without illegally holding. The objective varies with the ball-carrier path and other blockers. The WR must know whether he is targeting the defender's inside shoulder, outside shoulder, near hip, or a landmark where the defender is expected to arrive.

A reliable stalk-block progression:

1. **Release as a route threat.** Maintain credible vertical tempo so the DB cannot immediately trigger downhill. This is not a license to create illegal contact on a forward pass.
2. **Close under control.** Accelerate enough to threaten the defender but shorten the stride approaching contact. An uncontrolled sprint allows the DB to slip around or use the WR's momentum against him.
3. **Choose a leverage side.** Approach an aiming point that forces the defender to travel the long way around to reach the runner.
4. **Establish a balanced base.** Feet keep moving without excessive overstriding; shoulders remain square enough to redirect.
5. **Contact with legal hands and body position.** Inside or controlled hand placement, no restrictive pulling/grabbing, and no prolonged extension that becomes a hold.
6. **Mirror the shed attempt.** If the DB tries to cross face, step and redirect. Do not chase beyond the block's required leverage or turn a controlled block into an illegal one.
7. **Finish without losing the runner's lane.** A receiver can succeed by maintaining position rather than producing a knockdown.

**The block is a moving two-player system.** A DB may retreat to delay contact, aggressively attack the receiver's inside shoulder, shock and shed, or trigger past the WR at a moment when his feet are dead. The WR must modify the block rather than continuing toward the defender's initial location.

![Stalk blocking is about denying a pursuit path](figures/08_stalk.svg)

#### Why leverage beats raw strength

Consider a 190-pound wide receiver facing a 200-pound corner. If the receiver occupies the corner's inside shoulder on an outside run, the defender may have to run around the outside of the block to recover. The receiver has accomplished his assignment without moving the defender backward. If the WR instead chases the CB toward the sideline and lets him cross inside, a technically powerful collision may still open the direct pursuit lane.

The engine should therefore credit **time-denied to the intended pursuit path**, not just blocker-defender displacement. An effective block is one that changes the defender's expected arrival at the runner, within legal constraints.

### 19. Run-game blocks: stalk, crack, insert, bluff, and peel

**Stalk:** The WR threatens a route, closes on the DB, controls leverage, and maintains contact or positioning while the ball crosses outside. The DB has to determine whether he can trigger, avoid, press, or shed. Blocking assignment success depends on where the ball is supposed to go.

**Crack/inward block:** A receiver aligned outside moves inward toward a safety, nickel, or linebacker. This can remove an important force or alley player and create a replacement responsibility for another defender. A crack is not automatically illegal, but contact direction, player alignment, location relative to the LOS, and prohibited contact must be evaluated. An illegal crackback or blindside block is not a 'high risk' technique to reward; it is behavior that should be prohibited and penalized in the modeled ruleset.

**Crack-and-replace:** A WR cracks an inside defender while the offensive scheme expects a tackle, TE, or other blocker to account for the defender who replaces him outside. The defense may respond with a 'crack-replace' rule where the corner triggers to force when the WR blocks inside. The interaction is almost entirely about reading and coordinated replacement: the WR's destination and the DB's reaction jointly determine the lane.

**Insert/blocking from a reduced split:** A WR can align near the core and insert on an overhang or safety, working from inside-out or outside-in depending on the play. This exposes him to traffic, more powerful tacklers, and tighter angles. Footwork should differ from stalk blocking; he may need a downfield track, a square-up, or a short collision to keep a defender from inserting.

**Bluff or arc:** The receiver initially threatens to block an inside defender but bypasses him, releases vertically, or changes the blocking picture. A DB who triggers solely on the first blocking cue can surrender a route behind him. The engine should let defensive players learn tendencies without letting them magically infer whether the offense called a bluff.

**Peel or recovery:** A receiver who cannot secure his original block may have to avoid an illegal hit from behind and seek an allowable angle on a different arriving defender. The best choice can be to disengage, retain leverage, and avoid contact rather than turn back into a blindside collision.

### 20. Bubble, now, smoke, tunnel, and perimeter screens

A screen is a timed choreography. The target receives a quickly delivered ball while teammates remove or delay the immediate threats. Blocking success depends not only on strength but on relative timing of the throw, catch, first receiver cut, and defender reaction.

**Bubble screen:** Typically a slot receiver moves outward and slightly back or laterally to present a throwing target while outside receiver(s) block the corner/force or most dangerous defenders. If the bubble runner drifts too far backward or catches with poor body orientation, the screen can be defeated despite correct blocking. A blocking WR must approach with correct shoulder leverage, avoid too-early contact on forward-pass designs, and keep the defender from crossing into the runner's planned path. The outside WR may need to account for a corner who triggers downhill while the nickel is chased by motion.

**Now/smoke screen:** The ball goes almost immediately to an outside receiver, often with minimal backfield action. The catch is near the original alignment, so the time available for blocks is short. A CB who has read the screen can close before the receiver turns upfield. The receiver needs clean ball-handling, a rapid transition from catching to running, and a first cut based on force leverage.

**Tunnel screen:** The target may release upfield briefly, turn back inside, and catch behind blocks moving toward the field interior. The defense initially sees a route stem, then must recognize the retreating target and interior blockers. The WR's deceleration, pivot, and ball arrival must align. A timing error can leave the target catching while stationary or facing a free defender.

**Jailbreak screen:** Receivers and/or linemen release into a moving convoy, depending on scheme. The timing of their release is crucial. On a forward pass, ineligible player downfield restrictions and OPI limitations cannot be ignored. Treat exact permissible depth and blocking behavior according to the applicable rulebook and play design rather than assuming that every screen allows early downfield blocking.

**Slip/slow screen or screen-and-go:** The offense initially shows an ordinary release/block or slow concept before a receiver releases or the target runs vertical. The DB must process the changing cues and protect against being manipulated; a WR cannot receive automatic 'surprise' separation without executing a believable first action.

![Bubble-screen paths: ball, receiver, blockers, and force defender](figures/09_bubble.svg)

#### Screen decision table

| Observed defensive behavior | Blocker adjustment | Ball-carrier adjustment |
|:--|:--|:--|
| CB stays deep | Close distance while preserving legal timing; locate next threat | Take free grass toward planned edge |
| CB triggers immediately | Intercept at leverage landmark, don't chase his old spot | Catch securely and cut relative to force |
| Nickel shoots underneath | Inside blocker gets leverage; other WR maintains outside lane | Avoid inside penetration or bend wider |
| DB crosses blocker's face | Refit feet; maintain legal contact or allow reroute | Read altered pursuit angle |
| Safety rotates late | Communicate/reassign most dangerous defender if scheme permits | Adjust cut and recognize pursuit from depth |
| Corner squats then WR releases vertical | DB must honor second phase of pattern | QB/target timing determines window |

### 21. The defense's answer to receiver blocks and screens

A CB reading an outside WR cannot simply choose one of two static outcomes called 'pass' and 'run.' Screen recognition is a probabilistic process based on the receiver's stance, first steps, gaze, hip orientation, hands, quarterback set, and surrounding blockers. A high-effort WR can make a run block initially resemble a route; a corner who triggers too often can be beaten over the top.

Against stalk, a CB can attempt **shock-and-shed**: approach under control, strike with a stable base, maintain assigned shoulder leverage, separate after the runner declares, and close to tackle. Or he can attempt to **avoid** the receiver early by beating him to the pursuit landmark. A nickel threatened with crack may **replace** outside to become force while a safety or linebacker takes over the vacated inside fit. These choices require different tackle entry angles and cannot be reduced to a generic 'block shed' stat.

For a bubble, the nickel may pursue the screen recipient from the inside while the corner is engaged by the outside WR. A safety may trigger downhill only after his #2 read clears, or remain occupied if #2 threatens vertical. The structure of the coverage—cloud, Cover 3, quarters, Palms, man—can alter the very first available force defender and how quickly he arrives.

The **most-dangerous-man** concept should be explicit for both blockers and defenders. A receiver blocking an already-deep corner may be less valuable than delaying the nickel who can immediately tackle the target. Conversely, chasing the nickel may leave a free outside CB with leverage on the ball. A useful screen model evaluates every defender's reachable path to the ball-carrier rather than merely counting how many receivers are blocking.

**Safety and tackling constraints:** Play through safe shoulder/body contact, not head-first hits, dangerous blindside strikes, or low illegal crackbacks. Treat such actions as violations. A realistic engine should not optimize toward prohibited techniques just because they produce favorable simulated displacement.

### 22. The rules problem on screens: contact timing and forward passes

One reason perimeter football must be modeled carefully is that the same physical block can have different legality depending on when and where it happens. In the NFL, offensive pass interference can arise from certain blocking more than one yard beyond the line before a forward pass is thrown, or from blocking near the pass while it is in flight; eligible-player status and specific rule exceptions matter. The 2026 NFL rules also independently regulate holding, illegal blocks in the back, crackbacks, blindside blocks, and low blocks. NCAA and high-school restrictions differ.

Distinguish three transitions for a modeled screen: (1) **before the ball is thrown**, when a WR may sell a route and set up legal positioning but cannot simply take unlimited early downfield contact; (2) **while the forward pass is in flight**, when interfering with defenders near the target is constrained; and (3) **after the pass is caught**, when legal blocks can help the ball carrier. A backward pass, toss, or lateral has different pass-interference timing implications, but still remains subject to relevant blocking and personal-foul rules.

Practical implementation: each blocker has an *assignment target* and a *permitted engagement envelope*. The legal-action controller should check the target's distance from LOS, ball state, pass location, contact style and duration, and whether this player's action would amount to an illegal restriction. The football AI may **intend** an aggressive block, but the execution layer should either select a safe legal contact technique or record an actual foul when the player behaves illegally.

For an accurate NFL 2026 implementation, consult the source rulebook in full rather than using a one-line 'three yards downfield' approximation. The NFL ineligible-downfield rule and the NFL offensive-pass-interference standard are separate questions. The book deliberately avoids specifying a universal legal blocking depth because the rule depends on the actor and event.

## PART V — Worked laboratories

The laboratories below are **illustrative installs**, not claims that every team uses identical terms. Each defines the coverage behavior needed to explain the mechanics. For simulation testing, record the initial read, observed cues, chosen technique, physical constraints, and post-play attribution.

### Lab 1. X receiver versus inside-shade press: speed out

**Offense:** X isolated to wide side; short timed speed out. **Defense:** corner with inside leverage in press-man, no immediate outside underneath help. **WR read:** CB protecting inside; safety depth makes outside path plausible. **CB read:** receiver lower body, keep inside shoulder protected, disrupt timing.

At the snap X threatens the defender's inside shoulder just enough to induce the inside-shaded corner to honor that lane, then clears outside with minimal steps. The receiver must avoid a long foot-fire sequence: the QB is throwing on rhythm. The corner keeps his inside shade, but if he sits too aggressively on a slant threat, he is late to drive outward. If he abandons inside leverage to jump outside, the WR may counter inside on later calls.

**Mechanics to log:** horizontal displacement of corner during release; WR time to first upfield stride; CB strike timing and recovery step; angle into the speed out; separation and throw location at the actual ball-arrival instant. **Failure classifications:** receiver lost timing, corner preserved legal leverage, corner wrongly declared outside, or quarterback threw outside the usable window.

### Lab 2. Boundary fade versus outside press and sideline help

**Offense:** boundary X fade with potential back-shoulder placement. **Defense:** CB aligns outside shade, deliberately uses the sideline, safety help varies with call. The WR must judge whether an outside release leaves enough legal catching space. He may threaten inside, clear the near hand, and stack or lean onto a better vertical path. The CB's job is not to chase the receiver out of bounds; he must preserve usable phase and avoid grabbing after losing the release.

On an early deep ball the CB in phase can locate the ball and contest high. If the throw is deliberately behind the receiver, the WR must decelerate and rotate; the defender's vertical momentum may carry him upfield. The CB who looks up prematurely while trailing may lose both speed and awareness.

**Engine insight:** a back-shoulder completion can be mechanically plausible with almost no raw receiver separation. Catch envelopes, orientation, and braking are the critical variables.

### Lab 3. Off-man corner versus curl, then curl-and-go

**Offense:** first play a 12-yard curl, later a double move with a curl sell. **Defense:** corner begins at seven-yard cushion, off-man. On the first snap the WR aggressively closes space, threatens vertical, loads his brake, then returns downhill to the ball. The corner opens slightly, brakes, plants, and contests. On the second snap the receiver uses a comparable stem and convincing initial braking cue before turning back vertical.

A simulator that gives the DB perfect knowledge of the called route will never bite. A simulator that gives the WR a free vertical boost on double moves will exaggerate their value. The correct model compares the defender's response to *observed* first-break evidence and the WR's actual lost speed during the fake.

**Log:** hip-opening timing, vertical speed before brake, loaded foot at cut, WR first-break credibility, time to reacceleration, and DB closing angle.

### Lab 4. Slot choice versus leverage-changing safety rotation

**Offense:** 3x1 with slot choice route whose rules branch on underneath leverage and deep-middle structure. **Defense:** pre-snap two-high shell rotates into a structure with a robber and displaced hook player. **Before snap:** WR anticipates an outside-breaking branch. **After snap:** the rotation creates inside grass but the defender's late positioning remains ambiguous.

A decisive WR may recognize the new defender leverage and pivot into the correct window. The QB must independently recognize the adjustment before release; if he throws to the originally anticipated branch, the ball can sail into a defender even though the WR's individual movement was excellent.

**Log:** each player's belief at throw decision, cue detection latency, route-branch selection, ball target, and whether the mismatch was cognitive rather than physical.

### Lab 5. Press nickel versus two-way slot release

**Offense:** slot runs a seam with an initial outside threat. **Defense:** nickel pressed slightly inside with defined seam-help rules. The slot widens his first meaningful attack to force the nickel to open outside, then crosses toward the seam. The nickel must stay square long enough to retain two-way control or use a deliberate collision before matching the vertical route.

If the slot successfully clears the nickel's outside hand but does not regain a vertical stack, he may narrow the seam window. If the nickel turns early and fails to recover, a fast receiver can cross his face. If the nickel engages both hands and stops his feet, an efficient WR clear can create immediate separation.

**Log:** defender's first committed hip turn, strike arm, shoulder control, time receiver takes to clear hands, route width at 10 yards, and safety available arrival angle.

### Lab 6. Cover 2 cloud versus squat-and-go

**Offense:** outside WR attacks a cloud corner with a hitch/out sell followed by a vertical path. **Defense:** corner is the flat player under a deep-half safety. The CB may collision #1 early and then protect the flat, but should not chase #1 deep at the expense of his flat responsibilities. The deep-half safety must arrive over the top of the eventual vertical route according to his leverage and starting depth.

The WR tries to lure the corner down and outside, then accelerate upfield along the sideline. If the safety is too deep and inside, the outside hole may open. But a plausible route is constrained by the receiver's stop-and-go mechanics, the QB's throw clock, and the corner's ability to sink with the route after maintaining flat awareness.

**Log:** CB depth during route transition, safety route-to-catch-point time, receiver acceleration after fake, ball flight, and whether the corner missed an assignment versus simply lacked physical range.

### Lab 7. Stack switch versus banjo coverage

**Offense:** two WRs stacked close, front receiver runs a shallow outside route while rear receiver pushes inside vertically. **Defense:** two DBs use a two-on-two release exchange: one owns outside releases, the other inside releases, rather than fixed receivers. Both defenders read the *direction and timing* of the separation, communicate, and avoid picking each other.

If both defenders chase the first mover, the rear receiver may run free. If both wait too long, the shallow route gets an easy catch. If one defender changes policy independently, defenders can collide. The receiver pair can vary release tempo and path to stress the exchange.

**Log:** release classification latency, communication event, initial assignment-to-final receiver mapping, lane overlap, and whether spacing collision was physical or tactical.

### Lab 8. Bubble to trips versus aggressive corner force

**Offense:** trips right; #3 runs bubble, #1 stalks corner, #2 blocks the most immediate inside threat under defined rules. **Defense:** corner squats and triggers quickly as an outside force player; nickel chases bubble; safety starts deep in quarters-like positioning with #2-based fit rules.

The outside WR must threaten enough vertical to delay the corner, then shorten steps and establish a legal block on the pursuit landmark. If he overcommits upfield, the CB can cross his inside face and tackle immediately. The runner must catch while drifting laterally, orient upfield, and make the first cut based on the corner's actual leverage and nickel pursuit.

**Log:** screen target ball-arrival time, blocker first legal contact time, corner force shoulder, nickel pursuit path, ball-carrier turn-and-run delay, yards before first contact, and potential OPI/holding events.

![Screen laboratory: timing, blocking path, and pursuit](figures/10_screenlab.svg)

### Lab 9. Crack-replace versus outside zone

**Offense:** reduced-split WR threatens inside and legally cracks an alley defender; outside zone heads toward the edge. **Defense:** corner has a defined replacement-force rule if the WR blocks inside; safety is initially the alley defender. At the crack cue the corner must recognize that his original man is no longer a vertical threat in the immediate phase and redirect to force, but should remain sensitive to a bluff or fake crack releasing on a route.

If the corner triggers late, the runner reaches the perimeter before force arrives. If he triggers blindly, crack-and-go becomes viable. The crack blocker must execute within the applicable rules—especially regarding blindside or crackback contact—and does not have permission to launch an illegal hit.

**Log:** read cue, replacement call timing, corner force path, blocked defender displacement, safety alley availability, and whether the receiver's approach would constitute a prohibited block.

### Lab 10. Tunnel screen versus press-man and delayed pursuit

**Offense:** X stems as if vertical, then turns inside toward a tunnel screen behind moving blockers. **Defense:** press corner initially attempts to mirror the release and then recognizes the receiver's retreat. The defender has to brake, avoid the incoming blocker, recover his angle, and tackle at a feasible intercept point rather than chase the receiver's old vertical location.

The WR's stem must be credible, but staying vertical too long leaves him late. A receiver who turns too early signals the screen; a defender with good recognition can redirect before the blockers set their paths. Interior linemen and other lead blockers must have legal downfield and contact timing under the forward-pass rules.

**Log:** WR pivot depth, corner recognition timing, blocker positions at pass arrival, interceptions of pursuit lanes, and whether any ineligible or pass-interference restriction is violated.

### Lab 11. Red-zone slant versus press and an inside robber

**Offense:** X runs a quick slant in compressed space. **Defense:** CB aligns inside press with inside robber support. The receiver's inside win may be technically clean but lead directly into the robber. A rational receiver may instead use his release to occupy the CB, rely on an outside concept, or choose the slant angle prescribed by the playbook. A CB with help should not automatically chase the inside route across the robber's path; he must stay within his match and leverage rules.

The QB has limited space and time, so release delay is particularly costly. A CB who illegally grabs may erase a route yet create a penalty. A WR who extends his arm to shove the corner aside may also commit OPI. Success is determined jointly by leverage, catch-point timing, and legal contact.

**Log:** defender's inside denial, robber arrival, WR time-to-break, QB target decision, hand extensions, and ball interception geometry.

## PART VI — Building the mechanics into a simulation

### 23. A position-specific decision model

The underlying world stays continuous: x/y location, velocity, body-facing, torso-facing, foot state, hand control, and contact constraints. Above it, however, WR and DB need different decision hierarchies.

For the WR, a plausible controller proceeds through: **assignment -> pre-snap picture -> initial release plan -> defender response -> route stem -> breakpoint/choice -> ball tracking -> run-after-catch or blocking continuation**. A blocker instead proceeds through: assignment -> disguise/approach -> locate pursuit threat -> establish legal position -> mirror or release -> downfield pursuit/next defender. For the DB: **coverage/run assignment -> key focus -> route or blocking cue -> match/exchange/force decision -> leverage-preserving movement -> contact/ball/tackle finish**.

Separate *intent* from *execution*. A CB can choose to drive downhill at time t but remain constrained by a previously loaded foot. A WR can intend a rip but discover his arm is pinned against the corner's strike. A player can correctly identify a screen and still get blocked because the legal block denied his chosen line.

#### Suggested data structures

```text
PlayerPhysicalState:
  position_xy, velocity_xy, body_yaw, upper_body_yaw
  speed, acceleration_limit, braking_limit, turning_limit
  posture, center_of_mass_proxy, base_width, loaded_foot, balance
  left_hand_state, right_hand_state, left_reach, right_reach
  engagement_links[], fatigue, ball_possession

PlayerCognitiveState:
  assignment, help_structure, primary_key, peripheral_cues
  observations[], belief_distribution, recognition_confidence
  anticipation, attention_target, chosen_technique
  previous_commitment, communication_state

InteractionEvent:
  type, time, actor, target, body_contact_region
  relative_velocity, contact_direction, hand_used
  duration, leverage_change, restriction_or_grip
  ball_state, distance_from_los, potential_foul
```

The engine should store **both attempted and successful actions**. A receiver attempts to chop a press hand; his timing is late, the forearm remains engaged, and his release path is delayed. That is a different event from choosing not to clear hands. A corner tries to play a deep ball in phase but loses balance while turning his head; this differs from intentionally giving up the contest.

### 24. Decision trees that remain conditional

Do not encode 'CB always mirrors hips' as a universal rule. Encode conditions tied to technique and situation. Example pseudocode for a simplified press-man corner:

```text
if coverage == PRESS_MAN:
  key = receiver_low_torso
  preserve(protected_shoulder)
  if receiver_has_not_declared_release:
    execute(patience_mirror)
  elif legal_strike_window and stable_base and strike_advantage:
    execute(short_controlled_strike)
  else:
    execute(open_to_receiver_path)
  if beaten_vertical:
    execute(recover_near_hip)
  if ball_detected and in_phase:
    execute(locate_and_play_ball)
  elif ball_arrival_imminent and out_of_phase:
    execute(legal_hand_through_at_catch)
```

Simplified slot receiver:

```text
plan = choose_release(route_clock, defender_leverage, help, split)
execute(threaten_defender_leverage)
if defender_strikes and hand_contact_is_clearable:
  execute(appropriate_chop_or_rip)
if route == OPTION:
  choose_branch(observed_underneath_leverage, shared_rules, timing)
execute(stem_then_break_subject_to_footing)
if ball_in_flight:
  shift_attention_to_ball_and_catch_geometry()
```

Simplified screen-blocking receiver:

```text
threat = identify_most_dangerous_defender()
landmark = intercept_feasible_pursuit_path(threat, target_runner)
arrive_under_control(landmark)
if legal_contact_conditions:
  engage_with_correct_shoulder_and_hands()
else:
  maintain_screening_position_without_illegal_contact()
if defender_changes_path:
  mirror_while_staying_legal()
```

In a mature engine, these conditions should use noisy observations, individual tendencies, and graded confidence rather than simple perfect-information booleans.

### 25. The physical controls that must exist

| Control | Offensive WR use | Defensive DB use |
|:--|:--|:--|
| Speed and controlled braking | Sudden break, stop-go, curl, YAC | Plant/drive, trail recovery, tackle approach |
| Hip and torso orientation | Sell stem, cut, locate high pass | Maintain press square, open gate, locate ball |
| Foot-load / stability | Release steps, route plant, stalk approach | False step, press mirror, angle tackle |
| Reach envelopes by arm | Clear press hand, catch, block | Jam, shed, break up, tackle |
| Independent hand contacts | Chop/rip/wipe; secure ball | Strike, recover hand, contest catch |
| Contact region and direction | Legal positioning, WR block | Force leverage, phase, shed, tackler contact |
| Attention and latency | Coverage/rotation read, screen threat | WR body read, screen recognition, ball cue |
| Ball state and throw timing | Catch or begin downfield block | Coverage contest, interference rule |
| Help relationship | Manipulate safety/inside coverage | Protect assigned leverage with support |

A simple physics core can support all of these while leaving player translation in 2D and the football's flight in 3D. Add vertical body features where necessary: jump and landing, high-point reach, above-shoulder versus chest contact, and shoulder-level blocking/tackling. There is no reason to implement every finger and joint before these abstractions work.

### 26. Testing plan: short drills before 11-on-11

A credible evaluation environment should include fixed scenarios, randomized player attributes, and instrumented output. Start with three stages.

**Individual drills:** press releases vs different DB patience profiles; off-man curl/comeback timing; DB hip recovery after false drive; WR vertical tracking and back-shoulder adjustments; stalk blocking against a retreating and an aggressive CB. Compare trajectories and decision timings, not just final completion or block counts.

**Paired/triad drills:** 2 WR vs 2 DB banjo exchange; bubble recipient + blocker vs corner/nickel; crack receiver vs safety/corner replacement; slot option vs nickel/robber; deep route with QB timing and a safety help angle. Here you can identify whether communication and mutual constraints produce reasonable play.

**Full situational drills:** screens from trips and bunch; same route concepts versus press-man, off-man, Cover 2 cloud, quarters, and match-3; reduced splits and motion; RPO mesh with uncertain pass/run for the DB. Run identical seeded scenarios while changing just one variable to verify causality.

#### Core telemetry

- WR release time to meaningful vertical gain; distance traveled sideways before clearing press; return-to-stem delay.
- Defender first false step, hip-opening event, recognition lag, usable leverage at break, acceleration available after brake.
- Left/right hand contact onset, duration, target region, clearance success, grip/holding predicates.
- Route depth/width at throw and catch; separation at **arrival**, not solely at release; QB-WR route decision agreement.
- Receiver block arrival angle, maintained leverage time, defender's added pursuit distance/time, legal versus illegal contact.
- Screen catch position/speed, first cut, defender force angle, missed-block cause, arrival of safety support.
- Ball tracking onset, catch envelope overlap, jump/reach execution, contested-ball disruption and completion.
- Outcome explanations classified as: assignment/communication, recognition, technique, physics, throw timing, legal contact, or execution variance.

The most useful regression tests are directional: stronger press-hand coordination should improve legal reroutes only when the defender is balanced; increased DB top speed should improve vertical recovery more than flat-foot break recognition; better WR braking should help deep comebacks without automatically improving go routes; better stalk leverage should postpone defender arrival even when displacement remains small.

### 27. Coaching and film evaluation rubric

The table below doubles as an annotation guide for learning from film. Grade each category independently on a 0-2 scale (0 = clear failure, 1 = partial, 2 = successful). Never collapse everything into 'receiver won' or 'coverage bust'.

| Evaluation item | For WR | For DB |
|:--|:--|:--|
| Pre-snap plan | Correct leverage/safety/route timing | Correct assignment/aid/receiver split |
| Eyes and reads | Recognizes CB movement without stalling | Keys correct body or route distribution |
| Initial feet | Productive first three steps | Stable base/patience or correct bail |
| Hands | Efficient, timed clear; legal | Accurate strike/shed; legal |
| Hip control | Maintains acceleration through viable stem | Opens at appropriate time |
| Break or transition | Correct landmark, efficient brake and reacceleration | Correct plant and intersecting angle |
| Ball phase | Tracks/adjusts/catches | In/out-of-phase response appropriate |
| Blocking/run support | Correct defender/angle/legal finish | Force, defeat block, tackle leverage |
| Team coordination | Route spacing/switch/screen timing | Match exchange/help/crack replacement |

**Film question:** Was this a bad player decision, a missed cue, an assignment incompatibility, or a mechanically impossible recovery? Those answers imply different engine changes and very different coaching interventions.

## Glossary

**Alley:** support lane between the edge/force player and inside pursuit. **Banjo:** an exchange/check in which defenders distribute routes by releases rather than always chasing a fixed initial receiver. **Bail:** early opened-hip retreat to depth. **Catch technique:** patient coverage alignment allowing route to declare; usage varies. **Cloud:** a corner with shallow/flat Cover 2-type responsibility under deep-half help. **Cushion:** defensive depth between receiver and DB. **Force:** run defender required to prevent an uncontained outside path. **In phase:** sufficiently favorable receiver relation to contest the route/ball (defined here, staff usage varies). **Leverage:** positioning that protects a chosen side or path relative to opponent and help. **Man-match:** coverage that follows receivers after scheme-specific releases/keys. **Off-man:** man technique with depth/cushion at snap. **Out of phase:** disadvantageous trail/position that typically requires recovering to receiver before playing ball. **Palms / 2-read:** split-field pattern read with CB/safety exchange conditions. **Press:** technique of aligning near receiver to disrupt/deny release, with many variants. **Route clock:** expected route timing relative to quarterback progression. **Stack:** receiver reclaims a vertical lane over/inside a defender after release. **Stalk block:** receiver blocks perimeter defender by approaching under control and maintaining leverage. **Stem:** route section from release to break. **Two-way go:** receiver has space to threaten both lateral directions. **Wall:** collision/positioning to impede a receiver's access to a coverage area under the call's rules.

## Sources and technical notes

This work synthesizes widely taught coaching principles and original simulation-design analysis. Specific coaching details differ across programs. Where a rule is necessary, NFL rules are authoritative; do not transfer the rule interpretations to NCAA or high school without checking the appropriate rulebook. The following public sources were consulted for technique and rule clarification:

1. **NFL Football Operations.** *2026 NFL Rulebook*, particularly Rule 8 (eligible receivers, contact, pass interference) and Rule 12 (blocking and personal fouls). https://operations.nfl.com/rules-officiating/2026-nfl-rulebook
2. **Drew Lieberman, USA Football (2019).** *Coaching the Wide Receiver - The Press Release*. https://blogs.usafootball.com/blog/7121/coaching-the-wide-receiver-the-press-release
3. **Drew Lieberman, USA Football (2019).** *Coaching the Wide Receiver - The Press Release Part 2*. https://blogs.usafootball.com/blog/7150/coaching-the-wide-receiver-the-press-release-part-2
4. **Drew Lieberman, USA Football (2019).** *Coaching the Wide Receiver - Stance & Start Basics*. https://blogs.usafootball.com/blog/6897/coaching-the-wide-receiver-stance-and-start-basics
5. **Drew Lieberman, USA Football (2019).** *Coaching the Wide Receiver - 2nd Level Slot Releases*. https://blogs.usafootball.com/blog/7237/coaching-the-wide-receiver-2nd-level-slot-releases
6. **Drew Lieberman, USA Football (2019).** *Coaching the Wide Receiver - Beating Loose Coverage*. https://blogs.usafootball.com/blog/7192/blank
7. **Drew Lieberman, USA Football (2019).** *The Receiver Coach's Tool Box*. https://blogs.usafootball.com/blog/7452/the-receiver-coach-s-tool-box
8. **Mike Kuchar, USA Football (2016).** *Training the Eyes of a Defensive Back in Press Coverage*. https://blogs.usafootball.com/blog/952/training-the-eyes-of-a-defensive-back-in-press-coverage
9. **Mike Kuchar, USA Football (2016).** *Reading the Wide Receiver's Hips to Teach Man Coverage*. https://blogs.usafootball.com/blog/1047/reading-the-wide-receiver-s-hips-to-teach-man-coverage
10. **USA Football.** *How to Coach Defensive Backs to Play the Deep Ball*. https://blogs.usafootball.com/blog/5006/how-to-coach-defensive-backs-to-play-the-deep-ball
11. **USA Football.** *4 Key Skills Any Defensive Back Can Strengthen to Improve Coverage Skills*. https://blogs.usafootball.com/blog/1335/4-key-skills-any-defensive-back-can-strengthen-to-improve-coverage-skills
12. **USA Football.** *Inside Zone Run-Pass Options* (screen-concept illustrations and principles). https://blogs.usafootball.com/blog/992/usafootball.com/blogs/neale-mcmaster/post/12477/simple-inside-zone-variations

**Further research recommended:** NFL Next Gen Stats / Big Data Bowl tracking for route and DB trajectory distributions; coaching-film annotation for strike timing, foot plants, block engagements, and catch-point hand fighting, none of which can be reconstructed directly from sparse x/y tracking alone. All schematic figures in this volume are original instructional abstractions.

---

**Closing principle:** A receiver's skill is the ability to create the right space at the right time without losing control of his body or the route. A DB's skill is the ability to preserve the right leverage with imperfect knowledge, then recover and finish. Screen and run blocking are the same geometry problem with the ball moving somewhere else: the blocker's goal is to deny a dangerous pursuit path while obeying legal contact constraints. A realistic engine must model *the decisions, the physical movement, and the timing together*.
