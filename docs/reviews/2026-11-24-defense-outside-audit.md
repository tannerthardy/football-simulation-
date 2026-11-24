# Defense: outside reviewer's cheat hunt, coverage rules as taught, two cold reads, cushion by speed (2026-11-24)

Recorded by Integration from the outside reviewer's (Gemini) package, read against develop c7d4f2bf6. Integration
confirmed in code the rows marked **confirmed**; the rest are to be checked by the owning lane before acting. Each
finding should be reproduced by its staged case first. Sources are the reviewer's; lanes re-open what they quote.

## 1. Reads of what a defender cannot see or know (default-on today)

Standing rule: each one is removed and replaced by what he could observe.

| # | Where | What is read | Replace with | Staged case | Owner |
|---|---|---|---|---|---|
| 1 | `defense.ts:3156–3164` flightApproach | `HONEST_FLIGHT` is off in the reference stack, so the drive on the catch reads the ball's private `securing.receiver` and the receiver's true `body.facing`. **Confirmed.** | The honest path already written beside it (his own flight estimate, seen facing). Find why the flag is off, fix what held it, land it on. | Slant to a receiver whose back is to a trailing defender: he drives on the tick the ball touches hands, before his delayed sight shows it. | Defense |
| 2 | `defense.ts:1367` ManCoverage.update | Ball phase gated on true `sim.ball.kind === 'air'`. **Confirmed** (the gate; check what the inner branch reads). Zone uses `playsThrow`. | `playsThrow(a, sim, R)`: his release belief and flight estimate. | Pump fake at a man defender facing the passer: zone bites, man cannot. Catch out of view: man leaves ball phase on the exact tick. | Defense |
| 3 | `defense.ts:3258–3269` observedCatchWindow | Every receiver's true catch height, reach, top speed and full profile. | The believed body. | Two receivers of the same build, different true speed, same throw: defenders break differently on snap 1. | Flex (capacity scan) |
| 4 | `coverage-leverage.ts:26–27, 76`; `defense.ts:1490, 1493, 1531, 1564, 1632, 2126, 2280` | True profile in route observation, stem acceleration, deep-coverage choice, release and up burst. | The believed body (Flex's step 2 migrates these; confirm each line is covered). | A burner and a slow receiver jogging at the same speed on snap 1: the corner opens earlier on the burner. | Flex |
| 5 | `defense.ts:1454` slow play | Seen speed against a share of the receiver's true top speed. | Believed top speed (step 2), or an absolute release speed. | Slow receiver stalking at 6.1 yd/s against a fast one jogging at 6.5. | Flex |
| 6 | `run-fits.ts:610` FORCE_BOUNCE | The back's true top speed before the handoff. | Believed top speed. | Same mesh, fast back against slow fullback, snap 1: the force man widens more for the fast one. | Flex, with Defense |
| 7 | `common.ts:156, 160` pursuitPoint | Carrier's true top speed (and brake, tau with TRACK_PURSUIT off). | Believed top speed; with tracking on the clamp may be unnecessary. | Equal current speed, different hidden profile. | Flex, with Defense |
| 8 | `defense.ts:3308–3312` FumbleScramble | True loose-ball state, position and velocity, no sight or delay. **Confirmed.** | Route through the loose-ball cue Pursuit already uses. | Fumble behind a defender facing away: he turns on the tick. | Defense |
| 9 | `defense.ts:2805–2806` hands cue | `handsUpAt(man) <= sim.t`: no observation delay. **Confirmed.** | The hands on his perception sample, or his delay applied. | Trailing man corner reacts on the tick the hands come up. | Defense |
| 10 | `defense.ts:1306–1319` findsBall | True air state, true release time, true thrower. | His release belief, as the man look plan already does. | Defender with his back to the passer who sees the ball late. | Defense |
| 11 | `common.ts:440` aroundBodies | `o.isDown(sim.t)`, the true down state; the seen pose is fetched on the next line. **Confirmed.** | `seen.pose === 'down'`. | Blocker knocked down in the pursuer's path. | Defense |
| 12 | `defense.ts:243–245` ball seen in air; `defense.ts:618` stance tell | Instantaneous ball position; the blocker's stance lean read off the agent. | A delayed sample; the lean through the pre-snap snapshot. | Tipped ball 5 yd in front of him. | Defense |

Flag-off legacy reads (the passer's eyes, wind-up times, opponents' engagement, the true carrier and handoff time,
true air state in pursuit) are gated off in the reference stack; they go when the legacy paths are deleted.

## 2. Coverage rules as taught (defender sees X, does Y)

One standard version each; where coaches differ is noted and becomes a later scheme option. Main sources named by
the reviewer: Throw Deep's guide to Saban's coverages; USA Football articles (Rip/Liz; Saban's Cover 3; a trips
article); MatchQuarters on Fangio's terms; Breakdown Sports on banjo; plus tertiary sites marked low. Rules re-opens
before any of it is built.

**Trips checks**
- **Solo / poach (quarters against 3x1).** Weak safety reads #3: #3 vertical, he takes #3; not vertical, he poaches
  the backside #1's vertical. Strong corner on #1; strong safety takes #2 vertical past about 6 yd or robs #1; the
  apex takes #2 out. Weak corner man on the backside #1. Mike walls #3 short.
- **Mable / skate (Cover 3 or 6 against 3x1).** The names say which way the safety drops (to or away from the
  passing strength). Strong corner bails to his third: man on #1 vertical; if #1 is not vertical, takes #2
  vertical. Strong apex man on #2 unless #2 goes under. Strong hook takes #3 out; weak hook takes #3 inside or
  across. Weak corner man on #1.
- **Special / stubbie.** Corner man on #1 everywhere. Apex man on #2 unless #3 goes out (takes #3) or #2 goes
  under (zones off). Safety takes #3 vertical, else brackets #2 vertical.
- Differences: "special" means different things in different trees; whether the apex or the Mike takes #3 out.

**Bunch and stack**
- **Banjo (two on two).** Outside defender takes the first man out (or the second in); inside defender the first
  in (or the second out).
- **Three-man bunch.** One takes first out, one first in, one first vertical. Or "point": one locks the point man
  and the other two banjo.
- **Box (four over three).** Corner caps outside vertical, safety inside vertical, nickel first short outside,
  backer first short inside; crossers are passed, not chased through traffic.
- Differences: in-out against high-low against point lock against plain staggered man.

**Cover 3 match (Rip/Liz)**
- **Apex.** #2 still vertical after about three steps: carry him. #2 under (inside and short within 5 yd), or the
  corner calls "under": leave #2, zone to the curl, rob #1.
- **Corner.** Man on #1 unless #1 goes under in the first 5 yd; then call it, zone to the deep third and eye #2.
- **Hook.** #1 and #2 both vertical: take the final #3; else deep-to-short in the hook.
- Difference: whether a hitch by #1 triggers the "smash" adjustment at once or only when the offense repeats it.

**Cover 4**
- **MOD.** Safety takes #2 vertical; #2 not vertical, he brackets #1. Corner man on #1; if #1 breaks at 5 yd or
  less he zones to the deep quarter. The apex takes #2 out.
- **Palms / clamp (2-read).** Corner leaves #1 and takes #2 when #2 is out in the first 5 yd; the safety then takes
  #1 vertical. Otherwise as MOD.
- Differences: MOD against palms on #2 out; corner on a 5 yd hitch (bail against lock); who carries the wheel.

**Cover 2 corner**
- #1 breaks short with no #2 vertical behind him: sit with outside leverage and take him (the first man to the
  flat).
- #1 climbs, or #1 hitches while #2 climbs behind him (smash): sink from outside alignment under #2; the apex takes
  the hitch.
- Differences: squat (re-route from outside and sink until the ball brings him down), trap/cloud (sit on the first
  flat route), cut (sit on the hitch unless #2 threatens).

## 3. Two cold reads

**A. Cover 2 against a single quick out.**
- `defense.ts:2023–2025` (flat sink): the corner tracks a point 0.7 yd **inside** #1 (toward the ball), where a
  squat corner holds outside leverage. **Confirmed in code.** #1 gets an uncontested outside break.
- After the break the sink holds until he sees #1's upfield speed fall; flat carry then finds no second receiver;
  zone play aims at a lane point between the passer and the receiver, still inside. (Coverage's staged trace found
  the same result by a different route: he sinks before anything threatens.)
- Cover 2 match path: once switched to man with outside leverage, `OFF_PEDAL_SETTLE` (`defense.ts:1574–1576`) keeps
  his target no shallower than himself, so he cannot step downhill on the out until the throw.
- Staged check: log the corner's side of #1 and his downfield command from 0.5 to 1.3 s.

**B. Can a man defender be picked?**
- `spacing.ts:402` skips anyone not on his team. **Confirmed.** Gather, step-around and the local traffic route
  never see offensive players, and man coverage has no opponent avoidance.
- So against a teammate crossing in front he detours and brakes (a real delay); against a crossing receiver he runs
  straight at his man's hip. If the two torsos overlap he collides and both lose speed; if they miss by inches he
  passes at full speed. There is no going over or under a pick, and no seeing it coming.
- Staged check: two shallow crossers against Cover 1, crossing 0.4 yd apart and 1.2 yd apart.

## 4. Cushion, bail and turn by the receiver's speed (for CUSHION_SPEED)

- No universal yards-per-speed rule is taught. Coaches combine an alignment band, a pedal matched to the receiver's
  tempo, and a turn triggered by the remaining cushion.
- Baseline off man: about 7 yd to the field, 6 into the boundary; 5 is called no man's land.
- Against a burner: either more depth (7–8, up to 8–10 in a deep off technique), or the same depth with a quicker
  pedal and an earlier turn. The turn comes when the cushion is down to about 1.5–2 yd.
- Against a slower or possession receiver: 5–6 yd, pedal at his tempo, stay square longer, drive on breaks under 5.
- Pedal no more than about 5 yd; most routes break before 7.
- Bail (Cover 3, quarters): show press or play 6–8 off, open to the inside, stay 2–3 yd on top.
- Press against a burner: bail or mirror without a lunging jam unless there is help over the top.
- Differences: more pre-snap depth against a fixed depth with an earlier turn. Either follows from the believed
  speed edge, so the believed body can drive alignment, pedal tempo and the turn trigger without receiver tiers.
