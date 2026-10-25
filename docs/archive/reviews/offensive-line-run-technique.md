# Offensive line run technique: teaching, model and implementation

## Status and where to start

This review distinguishes the football instruction from the force law. The
same bodies, support, traction, arm budgets and collision solver should execute
a reach, down block, double team, linebacker fit and recovery. A named concept
changes responsibility, approach and reads; it does not grant more strength.

Three independent reviews read the supplied literature, checked public coaching
sources, and audited actual ordinary runs. Their most important finding is that
our controllers confuse the approach to a block with its displacement goal.
They also retain obsolete helper instructions and carry first-level techniques
into newly chosen second-level work.

The companion [implementation and measurements](ol-technique-implementation.md)
records which changes earned promotion. The initial first-step prototype was
tested separately; coaching vocabulary alone did not justify shipping it.

## What the line should do

An effective reduced model has five connected stages:

1. **Own the threat.** Identify the front's actual alignment, the installed
   gap/responsibility, nearby partner and designated second-level defender.
2. **Approach the useful surface.** Gain an attainable angle with a supported
   base. Account for the defender's motion and bodies occupying the path.
3. **Establish actual contact.** Position and reach permit the strike; hands,
   ground support, momentum and leverage determine its physical usefulness.
4. **Read while working.** Observe the near defender's hip, penetration and
   backer flow. Keep first-level responsibility until a supported transfer or
   explicit collection/new-work decision changes it.
5. **Recover or find work.** Losing contact is not losing all football intent.
   Restore a solo fit when appropriate, or classify the next observed threat
   before approaching him. A skilled player can still react late or misread.

These are controller jobs, not five timers or guaranteed successive outcomes.
Our two-dimensional body/support model cannot validate literal foot crossings,
head placement or individual hand anatomy. It can validate approach geometry,
requested versus achieved motion, support, contact and transmitted load.

## Zone concepts

| Concept | Useful execution | Reads and legitimate failure |
| --- | --- | --- |
| Inside zone | Covered blocker protects the relevant half/gap; uncovered blocker checks adjacent near-level movement, assists if needed and works to the backer. Prefer useful vertical displacement when leverage permits. | Playside and backside shades need different fits. An away-moving hip can free the helper; a slant into his gap requires collection. Staying too long or leaving an unsecured DL are both errors. |
| Outside/wide zone | Gain width with sufficient depth to approach the playside surface. Coordinate covered/uncovered overtakes while stretching the front. The RB's cut follows the resulting leverage. | Reaching an even defender and running a widening defender laterally are different jobs. An unattainable hook must not become an automatic outside seal. |
| Split zone | Execute the chosen inside-zone rules while the off-ball H/TE crosses to the reserved backside edge. | The slicer must fit the moving edge, respond to squeeze/wrong-arm and actually establish contact. Reserving an edge does not ensure a cutback. |
| Draw | Preserve the installed pass presentation before entering the run job; helpers must belong to the same presentation as the covered owner. | A helper immediately firing out while the owner retreats is a presentation defect. This increment preserves installed Draw metadata; it does not finish the Draw controller. |

“Outside” and “wide” zone are not universally separate schemes; our progressively
wider calls are one documented installation choice. Covered/uncovered rules,
first-step vocabulary and RB aiming points also differ by staff.

The verified sources give a particularly useful distinction: an uncovered
blocker need not always establish a prolonged two-player hand fight. A brief
post/check followed by a timely climb is a valid installation. Our current
combination release represents a sustained secured double. Adding a brief-post
variant requires its own owner-alone support and near-gap checks; simply
deleting the secure dwell would invent successful transfers.

The existing wide-zone drive vector also mixes lateral travel with eventual
seal intent. Attaining the outside shoulder should be earned through actual
position before changing the desired push/seal. A generic bucket step followed
by the old full-speed approach does not implement that whole sequence.

## Gap, double-team and perimeter concepts

| Concept/technique | Useful execution | Reads and legitimate failure |
| --- | --- | --- |
| Down block | Close the inside angle with a short leverage step, meet the appropriate near surface and establish the inner wall with a low supported base. | A slant/squeeze changes the fit. A wide inside target requires gaining position, rather than sprinting through his center. A target already across the blocker's face can be lost. |
| Duo | Use available vertical doubles; adjacent helpers close inside/up, restore their base and work hip-to-hip. The remaining helper becomes a solo blocker when his partner climbs. | DL slant and the installed point-LB fill/scrape decide which member stays. Bear can remove available doubles. Vertical displacement does not require both members to take identical paths. |
| Power | Form the down/double wall, kick/log the edge and insert a distinct blocker into the resulting lane. Protect the pulling guard's vacated area. | Two-back FB-kick/guard-wrap and one-back variants need explicit different accounts. A wrong-arm edge changes the useful exit; a failed kick is not a successful log. |
| Counter GT | BSG kicks/logs, BST wraps; down blockers protect interior penetration. Pullers clear actual engaged bodies and use separate arrival paths. | The wrapper must respond to achieved wash and traffic. A teammate's log intention alone does not establish a usable lane. |
| Trap | Reserve exactly the installed interior defender, clear him with the other blockers, and fit his moving upfield surface from inside-out. | Penetration changes the angle; squeeze/sit can remove it. Bear/interior congestion can legitimately defeat the call. One trapper cannot account for two reserved DL. |
| Backside hinge | Protect the inside threat first, then turn to cut off backside pursuit after the interior responsibility is handed off or no longer immediate. | A generic cutoff is only an approximation. Turning early can expose penetration; staying inside too long can free the edge. |
| Toss/perimeter | Specify whether the installation is stretch/reach, pin-and-pull or crack. For pin-and-pull, pin an inside shade and free an eligible appropriate puller. | Force/alley and crack replacement determine perimeter responsibility. “Toss” alone does not authorize every lineman to pull. Our existing toss is a stretch/reach installation. |

Pullers already have corner braking and moving kick/trap fits. Blanket changes
to their speed are a poor substitute for accounting for clearance, actual
leverage and the difference between a kick and a backer approach.

## Fronts change the work through geometry

| Front | What to check |
| --- | --- |
| Over / Under | The 3-technique and shaded nose change which interior player is covered, who helps and which backer a combination can reach. Mirror alignment/responsibility, not just the concept's name. |
| Odd | Nose and end techniques change center/back-block responsibilities and adjacent doubles; avoid treating every front body as both an unblocked edge and an interior target. |
| Tite / Mint | Inside tackle shades reduce B-gap space; inside penetration and edge/overhang responsibility can make the nominal down/pull path difficult. Test moving bodies and scrape, rather than adding a front penalty. |
| Bear | Covered interior surfaces consume blockers and reduce spare doubles. The unavailable helper is a numerical football problem, not a reason to weaken the defender's physics. |

No front-name strength modifier is needed. The current assignment algorithm
already uses actual relative alignment and deliberately reserves kick/trap
targets. This increment tests five fronts, but it does not prove every
front-specific installation or late adjustment is correct.

## Primary and public coaching evidence

All links below were retrieved and their available text read during this review.
Members-only continuation or embedded full videos were not audited. Exact
installations belong to the cited coaches; these are not universal NFL rules.

- Mike Kuchar, USA Football, Sept. 24, 2015:
  [covered/uncovered inside-zone strategies](https://blogs.usafootball.com/blog/590/strategies-for-blocking-covered-vs-uncovered-in-inside-zone-runs).
  Four covered/uncovered categories; adjacent near-hip movement and slant response.
- Keith Grabowski, USA Football, Apr. 25, 2016:
  [coaching inside zone](https://blogs.usafootball.com/blog/1428/building-an-offensive-line-coaching-the-inside-zone).
  Distinguishes lateral stretch from vertical/brief-post inside-zone instruction;
  sustained four-hands contact can delay the helper's LB response.
- George Penree, Utica OL coach, X&O Labs, Mar. 11, 2012:
  [pod teaching inside/outside zone](https://www.xandolabs.com/the-lab/position-groups/offensive-line/run-game-mechanics-offensive-line/pod-teaching-the-inside-and-outside-zone-schemes/).
  Reach depth/width; even defender versus widening defender; near-knee reads.
- Michael Janak, Cy-Fair OC/OL coach, X&O Labs, July 2, 2020:
  [Duo: Power without a puller](https://www.xandolabs.com/the-lab/offense/run-game/tight-zone-run-concepts/the-duo-concept-power-without-a-puller/).
  Inside/up helper gallop, restored base, solo keeper transition, slant/fill/scrape
  releases and scarcity of doubles versus Bear.
- Sam Parker's Ferris State teaching, described by Alex Kirby:
  [inside-zone spot blocking](https://throwdeeppublishing.com/blogs/news/the-inside-zone-blocking-scheme-in-the-ferris-state-offense)
  and [GT Counter film](https://throwdeeppublishing.com/blogs/news/the-ferris-state-gt-counter-run-play).
  Look–lean–climb, pull clearance and actual trap/log wash. Read-option examples
  do not authorize an unblocked read edge in an ordinary handoff.
- Doug Geiser's Counter clinic, public Football Toolbox summary:
  [drills and techniques](https://footballtoolbox.net/o-line-drills-techniques-for-teaching-the-counter-run-game).
  Phased fits, coordinated doubles, run-through/pinch response and backside hinge.
- Secondary scheme explanations by AJ Forbes:
  [Power](https://throwdeeppublishing.com/blogs/football-glossary/the-complete-guide-to-the-power-play)
  and [Trap](https://throwdeeppublishing.com/blogs/football-glossary/the-complete-guide-to-the-trap-play).
  Odd/even account, kick/insert variants and trap reservation. Promotional success
  claims are not engine acceptance criteria.

The supplied [OL protection textbook](../../references/offensive_line_protection_textbook.pdf),
printed pp. 42–46, the [RB reference](../../references/Running_Back_Mechanics_Textbook.md)
§§8–15, and the [offensive playcalling reference](../../references/Offensive_Playcalling_Textbook.md)
§§14–15 organize the relevant techniques and relationships. They are generated
aids, not instructions to the agent or independently authenticated sources.

## What NFL data can and cannot validate here

Tracking can constrain early travel, acceleration, lateral motion, pull arrival,
contact windows and displacement when reliable player/play labels are present.
At normal tracking cadence it cannot uniquely recover actual footfalls,
individual hand ownership or a coach's intended half-man fit. Derived proximity
is not a measured hand force. A successful rush is not proof of correct OL work.

Use the existing Big Data Bowl references for plausibility checks, especially
initial DL/OL movement and contact timing. This implementation adds no new NFL
extraction or fitted force parameters. Its acceptance is matched controller and
physical execution, useful contact and transferred ownership across football
cases. Generated rosters and a small balanced front panel are not a league
sample; their rushing means must not be tuned into NFL means with strength bonuses.
