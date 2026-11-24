# Offense: outside reviewer's cheat hunt, rebuilt-passer cold review, the pass set as taught, hysteresis audit (2026-11-24)

Recorded by Integration from the outside reviewer's (Gemini) package, read against develop c7d4f2bf6 and the QB
lane's branch at 6d3e2a477. Rows marked **confirmed** were checked in code by Integration; the rest are for the
owning lane to check, each by its staged case first. Sources are the reviewer's; lanes re-open what they quote.

## 1. Reads of what an offensive player cannot see or know

Standing rule: each is removed and replaced by what he could observe.

| # | Where | What is read | Replace with | Staged case | Owner |
|---|---|---|---|---|---|
| 1 | `receiver.ts:645–660` scramble drill | Every defender's true position (`for d of sim.defense … d.pos`) and the passer's true position, no sight or delay. **Confirmed.** | His own picture (`sim.see`), as the work-window code beside it does. | A safety closing from behind his back: he steers away on the tick. | Flex |
| 2 | `receiver.ts:750–765` release | The jam decision in the receiver's code; true ball state, scramble state, the corner's down state, support and facing. | Coverage's refactor (the corner decides) covers the decision; the remaining reads go to seen state and felt contact. | A throw while the pressing corner's back is turned: the jam drops on the tick. | Coverage (finish with the jam work) |
| 3 | `receiver.ts:1071–1086` downfield blocker | The true carrier, his true position, and defenders' true positions on the lines after the seen ones. | The holder as he sees it and the seen positions throughout. | A receiver facing away from a catch 15 yd behind him. | Run Game |
| 4 | `receiver.ts:1100–1106` block target | Teammates' private `behavior.target`, and each defender's true profile and fatigue (`speedScale`) in the reach time. **Confirmed.** | Whether a defender is already being approached, from what he sees; the believed body; no fatigue read. | Two defenders equidistant, one tired: he picks the fresh one. | Run Game, with Flex |
| 5 | `receiver.ts:920` ball tracker | True air state. | His own seen flight. | A receiver with his back turned stops tracking on the tick the ball lands elsewhere. | Flex |
| 6 | `carrier.ts:525` traffic tempo | A defender's true reach. **Confirmed.** The file otherwise judges defenders from size and seen speed. | The judged reach used elsewhere in the file. | Same build, different arm length. | Run Game |
| 7 | `space-block.ts:74, 82` | The true carrier, and the ball's exact arrival time while a screen is in the air. **Confirmed.** | The seen holder; an arrival from the seen throw or the screen's rhythm. | A lobbed against a fired screen behind a lineman facing downfield. | Run Game |
| 8 | `blocking.ts:194–218` pass protection | One coordinator reads every rusher's true down and engaged state and every protector's private state each tick, and re-assigns at once. **Confirmed.** | Each blocker's own picture and what linemen can call to each other, with the time a call takes. | A tackle knocked loose behind a guard's back in a twist: the free blocker is re-assigned on the tick. | Line play (blocking plan); information-flow work |
| 9 | `blocking.ts:328, 336` | The true carrier to decide a check-release. | The holder as he sees it (the call is known from the huddle). | A fumble behind a protecting tight end facing downfield. | Line play |
| 10 | `blocking.ts:612` | The rusher's true top speed. | The believed body. | Fast and slow rusher off the ball at the same speed, snap 1. | Flex (capacity scan) |
| 11 | `blocking.ts:1924` | A teammate's private `block-log` tag. **Confirmed.** | The kick-out blocker and the end as he sees them. | The tag set before the puller can see around the line. | Run Game |
| 12 | `qb.ts:2142, 2157, 2175` old passer | Defenders' true reach and catch height. | The believed defender (already in Flex's widened scan). | Short- and long-armed backer in the lane. | Flex |
| 13 | `qb.ts:1121` old passer | The line's live protection coordinator. | The huddle protection call, as the rebuilt passer's pre-snap code does. | A mid-play re-assignment. | Retires with the old controller |
| 14 | `qbv2/drive.ts:96, 135, 168; 95, 103, 162` rebuilt passer | Defenders filtered by true down state; a fall-back to a receiver's true position. Otherwise clean. | The seen pose; his estimate of the receiver. | A rusher knocked down outside his cone. | QB |

## 2. Cold review of the rebuilt passer's judgment (QB lane's branch)

Offered as readings to check against the lane's own traces, not as fixes.

- **Slant-flat never throws the slant.** When the key gives no cue or "sinks", the choice falls to the higher
  completion estimate (`cycle.ts:90–100`). For the slant, once it has broken the coverer's break reaction is skipped
  (`judge.ts:205`, `tb = null`), and every underneath dropper adds a lane penalty (`254–266`); the flat usually has
  no coverer and sits near the clean-catch value. So the flat wins even when the flat defender widens.
- **Hitch against man 0.7 s late.** `judge.ts:205` requires `breakIn < cue`. On an anticipation throw the windup
  starts before the break, so `breakIn >= cue`, `tb` is null, the break reaction is skipped, and the corner is
  projected driving at the catch point from the release, before the receiver has broken. The throw only clears once
  the hitch has actually stopped. Suggested: keep the corner's pre-break motion until the break plus his reaction;
  treat the arm cue separately.
- **Stick's flat into a squatting corner.** A still corner fails the coverer test (`judge.ts:170`, which needs him
  moving with the receiver); he is then matched as a lane man (`258–265`) and the loop continues before the driver
  check (`269`); more than 3 yd from the catch point he is priced as a mid-flight bat (about 0.12 to play, 0.036 to
  pick) though he has the windup and the flight to drive 4 yd. Suggested: take the greater of lane and driver for
  every non-rusher, as is already done for the coverer.

## 3. The pass set as taught

For Phase 4 of the blocking plan (the set is 80–90% of an engaged pass blocker's retreat in our games).

- **Vertical set.** Straight back off the inside leg, about 60% of the weight inside, shoulders square as long as
  possible. Used on deep drops with no inside help and against a wide speed rusher; makes a tall, narrow pocket.
- **45-degree (angle) set.** Back and out to beat the rusher to a spot and hold a half-man, inside-out relationship
  that sends him around the arc. Used when help is sliding to him inside.
- **Jump (short) set.** Close the space at once, strike early, keep the rusher's hands down. Used on quick game and
  play action and against an interior rusher; a change-up for tackles.
- **Depth by position.** Tackles own the pocket's width, the interior its depth. A tackle stays square for about
  1.5–3 yd before turning, and can ride an edge rusher to about 9 yd on a deep drop. A guard gives no ground on a
  three-step drop, about 1.5 yd on a quick vertical drop, about 3 yd at most on five and seven steps. The center
  matches the guards' depth to pass off games and holds against a nose's bull.
- **What ends the retreat.** The rusher reaches striking range or turns speed to power: a short power step with the
  outside foot, hips sink, elbows re-fit and drop ("you meet power with leverage"). An edge rusher past the launch
  point: hand on his inside hip and drive him upfield past the passer.
- **By alignment.** The wider the rusher, the bigger the first step (two men or more outside: vertical set). Slight
  outside shade: a soft kick. Head-up: step inside and replace with the outside foot. Never set past the rusher's
  midline; weight stays on the inside thigh so an inside move meets shoulders already going that way.
- **Where coaches differ.** The base tackle set (vertical in many spread and modern pro teachings, 45-degree where
  slide help is inside); how often to jump set.

## 4. Thresholds that switch a mode or target with no exit margin

Ranked by the reviewer's estimate of how often each fires. The rule: a threshold that switches mode or target has
an enter and an exit margin, and a goal persists until a perceived change clears it.

| Rank | Where | Switch | Effect | Owner |
|---|---|---|---|---|
| 1 | `run-fits.ts:656–681, 756, 765` | Back's lateral speed against 1.5 yd/s; lateral against forward speed for the crossover | Flow side flips on and off; facing snaps between square and crossover | Defense (the line-flow item) |
| 2 | `run-fits.ts:728–743` | Projected crossing against the gap edge; back past a line near the line of scrimmage | Chase, fill at 1.0 yd and stack at 2.25 yd alternate | Defense |
| 3 | `run-fits.ts:507–508` | Back's position against the edge surface | Force and insert alternate | Defense |
| 4 | `blocking.ts:432, 480, 483, 487` | Ride, anchored, follow and wide tests in the pass set | The tackle's request steps between 0 and the rusher's speed at the top of the pocket | Line play |
| 5 | `common.ts:435, 447` | Behind-the-runner gate; the obstacle tangent | Pursuit heading snaps by up to 90° | Defense |
| 6 | `carrier.ts:522–535` | Distance, cone and blocked tests in traffic tempo | Speed cap steps | Run Game |
| 7 | `run-fits.ts:522, 571–572` | Kick-out block's lateral speed against 1.3; cutback against −1 | Edge target jumps 1–2 yd | Defense |
| 8 | `blocking.ts:394` | Rusher more than 3 yd from the ball laterally | Interior spot set and edge kick set swap mid-rep | Line play |
| 9 | `common.ts:55, 165, 398` | 4 yd, 1 yd/s, 12 yd | Step changes in pursuit aim and effort | Defense |
| 10 | `carrier.ts:498` | Just past the line of scrimmage | Crease read and open-field read swap if he is knocked back | Run Game |

Each is checked on the dither attribution before and after; the budget test holds the result.
