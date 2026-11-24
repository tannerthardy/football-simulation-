# Gaps

The current view of where our football is least realistic, what we know about
each gap, and what has improved. One page, kept short. Re-ranked on 2026-11-11
at `engine-28`; rewritten in place at `engine-40` (2026-11-12). The standing
table, the current focus, the lane table and the newest rows of the two lists
at the bottom were brought to `engine-95` on 2026-11-24; sections still
written at `engine-40` say so in their headings.

[KNOWN_PROBLEMS.md](KNOWN_PROBLEMS.md) is the long record behind this page:
evidence, what was tried, what is still open. [REFERENCE_STACK.md](REFERENCE_STACK.md)
records each engine version and the evidence for it. The page this replaced
(weekly comparison of 2026-10-26, gaps F1–G10) is in git history at `82914195`.

How to read it: NFL comparisons find problems; they are not targets
([CLAUDE.md](../CLAUDE.md)). Outcomes and direct measurements are strong
evidence. Categories inferred from tracking (engaged, beaten, open, a break)
are weaker, and each one below says which kind it is.

## Where the engine stands

League card, 16 games × 2 leagues, seed 11, at `engine-95` (the candidate arm
of THROWAWAY_FELT's paired card, #887). NFL is the team-season p10–p90 band
where one is sourced. One seed: read the direction against the `engine-40`
table this replaced (in brackets; one league, so not the same sample), not the
decimals.

| Measure | Engine | NFL band | Reading |
| --- | --- | --- | --- |
| Rush yards a carry | 3.73 (4.37) | 3.70–4.83 | Low edge |
| Run stuffs (0 or less) | 12.1% (9.5) | 15.9–23.5% | Low |
| Completion | 68.3% (64.7) | 60.6–68.1% | High edge |
| Yards an attempt | 7.95 (9.18) | 6.35–7.89 | High edge |
| YAC a reception | 6.36 (7.26) | 4.53–5.91 | High |
| 20+ yd completions an attempt | 8.2% (14.0) | 6.7–11.1% | In band |
| Sacks a dropback | 5.3% (3.7) | 4.6–9.4% | In band |
| Scrambles a dropback | 2.8% (2.4) | 2.2–7.3% | Low edge |
| Interceptions | 1.8% (1.3) | 1.5–3.2% | In band |
| Missed + broken tackles a play | 0.17 (0.20) | 0.11–0.16 (unsourced) | High edge |
| Points a team-game | 27.7 (35.8) | 21–23.5 (unsourced) | High |
| Time to throw | 2.85 s | 2.7–2.9 (unsourced) | In band |

Since `engine-40` the deep-ball and yards-an-attempt excess has mostly closed
and sacks and interceptions are in band. What remains is after the catch
(YAC), completion at the top of the band, and scoring about four points high.
The whole-game averages now hide the open problems more than they show them:
the gaps below are in which throws are made when, in specific coverages, and
in what happens around the tackle.

## Current focus (2026-11-24, `engine-95`)

The pass game is the priority, and inside it the quarterback's decision
comes first; pursuit, tackling and the flats run in parallel. Each row names
the present diagnosis and its owner. Numbers marked *lane* come from the
owning lane's report on the named PR or branch and were not re-measured by
Integration.

| # | Gap | Current diagnosis | State and owner |
| --- | --- | --- | --- |
| Q1 | The quarterback's decision: what he throws and when | Whole-play timing matches the NFL, but non-screen throws released under 2.0 s are 14.4% of NFL dropbacks and 2.2% of ours (*lane*, Rules, #876 and #893; dropbacks without play action). Stops leave 0.3–0.5 s after the break against the NFL's 0.1 before, outs 0.3 s late (*lane*, QB). He is set and looking 0.4 s before the break; his window judgment clears only at the break. That judgment prices defenders who reach the catch point a median 0.58 s late (*lane*, QB), with constants fitted to engines 40–47. The controller is five timing models and six pressure responses layered in one method, and plays do not carry their reads | **Rebuild, not patches.** [Plan of record](reviews/2026-11-24-qb-decision-plan.md): `QB_V2` in five modules, quick game first. QB lane builds the look, the judgment and the cycle; Rules authors read plans (#893); Flex the pre-snap plan; Tools the calibration harness; Coverage the defender-side facts. The step clock is not landing; no feature patches on the old controller |
| Q2 | True-state reads left in the passer | Exact defender positions seeded at the snap, pre-snap features with no sight test, slot labels and call tags in his canonical looks, rushers' true profile and speed scale in felt time, belief pulled toward true ratings (plan §1.6) | Being removed as small landings: QB lane (qb.ts), Flex (qbmind.ts) |
| Q3 | The pass menu is thin, the quick game most | 32 dropback and quick concepts, 3 play-action, 6 screens and 1 run-pass option; 8 use the quick drop. Core quick-game concepts, option routes, run-pass options and movement passes are missing, and how often we call quick game against the NFL is unmeasured, so the early-throw gap in Q1 is not yet split between missing plays and a late passer. Six installed concepts differ from the taught version (`CONCEPT_GAPS`, #893) | Rules: inventory against a standard menu ranked by NFL frequency and call share by drop class first; then missing quick-game concepts in batches with read plans; concepts corrected to the taught versions behind one flag |
| V1 | Cover 2 / Cover 6: the deep outside throw against the flat | The squat corner sat shallow and trailed #1 (on top at the break 7% against the NFL's 40%); 10–15 yd wide open 43% against 18% (*lane*, Coverage with Tools' census). A corner at NFL depth fixes that and reopens the flat (open flats 2.0–3.0 a game against 1.5). Flex's flat package closes the flat only by keeping the corner shallow. The curl-flat dropper sits about 3 yd narrow (8.0–8.6 yd from the ball at 3.0 s against 11.5): half is the invented `lerp(QB, receiver, 0.82)` lane spot and zone-settle, half inside-out carries (*lane*, Flex) | Open. `SQUAT_SINK` v2 and `SQUAT_FLAT_FIRST` built, off (`coverage/C14-squat-v2`, `coverage/C14-squat-flat`); census pending. Replacing the 0.82 lane spot is first (Coverage; `LANE_LEVERAGE`, #894, drafted off). `CORNER_READ` parked after two attempts |
| V2 | Defenders re-aim far more than NFL players | Sharp heading steps on 6–12% of moving intervals against the NFL's 1.4–2.0% at skill positions, linebackers and defensive backs; at least 80% follow a controller request that changed, about 60% of those from coverage (*lane*, Tools, #866). Zone reversals 0.448/s, man 0.240/s (*lane*, Coverage) | `SPOT_LEAN` (#889, off): a settled dropper slides with the quarterback's seen head line instead of jumping between receivers; spot-settle reversals 117 → 66. The deep carry's request alternates speed tick to tick with nothing changing: two fixes had no effect and the stage is not found. Two cells unattributed |
| V3 | Safeties | The half safety aligned 3 yd inside the NFL's relation to #2 (`HALF_ALIGN`, #888, off, fixes it). His seat against #1 and #2 (`HALF_SEAT`, off, Flex) matches the NFL in movement. First move lateral 66% against 24% is mostly that NFL safeties are already moving at the snap (*lane*, Flex) | `HALF_ALIGN` and `SPOT_LEAN` on Integration's card. The rolling start belongs to pre-snap movement (parked). `DEPTH_FIRST` built, off; `HALF_DECLARE` stopped |
| D1 | Pursuit after the catch | Defenders are not slow: top speed after the catch is at or above the NFL's (LB 8.7 against 8.4, CB 9.4 against 8.9, S 9.3 against 8.7 yd/s; *lane*, Tools, #866). Two pursuers aim at one spot 0.2–0.4 yd apart, because the shoulder shade fades with distance for both | `TRAIL_LEVERAGE` (#892, off): catch attempts missed 7.1 → 5.3% over six seed sets; the play after a first miss is flat. Bad pursuit after a miss remains open (Defense) |
| D2 | Coming off a shed block | After a run shed defenders achieve 2.1–2.5 yd/s against 5–7 requested: the behaviour asks for a facing 43–87° off the travel it requests. Linebackers are often still owned by a pass behaviour after taking on a run block; the linemen's fit asks for a square facing. Separately, 6% of run D-line releases are re-blocked within 0.5 s by a different blocker from beside or behind, formed as an ordinary block (*lane*, Defense) | Defense: run-read ownership and facing (not built). `BLOCK_FRAME` built, off (`defense/block-frame`): a re-block needs position in front and inside the frame, otherwise it is the blocker's chosen hold. `SHED_PLAY` showed no effect and waits on these |
| D3 | The tackle itself | Reach double-counted the body; a miss cost the tackler nothing; aim height was a random draw; light holds do not finish. The package (`TACKLE_REACH`, `LUNGE_FLIGHT`, `DIVE_STANCE`, `REACH_TIME`, `HOLD_AIM` with the bend) reproduces the NFL's miss shape better, but designed runs average 6.3 yd against develop's 3.85, with 7% of runs never grasped (*lane*, Run Game) | On `run/tackle-repair`, not landed. Run Game is attributing the extra yards (honest reach exposing approach, or the package) before the carrier's answers (brace, stiff arm) |
| R1 | Routes and alignment | #2's vertical drifts in where the NFL's bends out (`SEAM_LANDMARK`, #886, off: fixes where he ends, not the 1 s lag); go stems, hitch, slant and cross shapes (#879); alignment landmarks (#880); `DRIVE_HASH` (#881) | Built, off, waiting for cards behind the quarterback and coverage work (Rules) |
| B1 | Ball drag | Spiral drag measured from tracked throws is 0.005 /yd against our 0.003 | `BALL_DRAG` (#884): no outcome effect at 48 games a side, correct physics; lands on as `engine-96` (Tools) |
| C1 | In-stride catch | `CATCH_STRIDE` removes the receiver braking into the catch and is right | Held: on `engine-94` it gives back all of FLIGHT_BREAK's YAC gain (+0.0 to +1.7 a reception against develop). Lands when pursuit after the catch is repaired |
| N1 | Receiver numbering after motion | #1/#2/#3 are counted once from the alignment and not re-counted after motion; every reader keeps the stale number | Parked with pre-snap movement; the first step is to measure how often motion changes a number |

## Focus problems as of `engine-40` (2026-11-11)

Kept for their diagnosis. P1's first-ranked cause (C9, zone defenders do not
break on the ball) was repaired by FLIGHT_BREAK at `engine-94`; P2 and P3 are
now inside Q1 above.

All lanes were on these three as of 2026-11-11. The pass stress matrix
reported on 2026-11-11; the order it points to is C9, then C14, then the rule
tables.

### P1. Zone coverage gives up too much after the catch

- **Size (direct, by coverage family):** YAC trimmed and catches gaining 10+
  after the catch: Cover 4 6.60 / 35.5% against the NFL's 4.82 / 17.9%;
  Cover 2 6.23 / 28.5% against 4.94 / 14.3%; Cover 3 5.72 / 25.8% against
  5.18 / 18.5%. Cover 1 is NFL-like (4.50 / 19.4% against 5.11 / 19.4%).
- **Not the cause:** coverage that is too loose. Target separation at the
  throw is tighter than the NFL's in every family (Cover 3 4.03 yd against
  4.46) (matrix first cut, direct). Tackling: broken tackles after a catch
  match the NFL (20%).
- **What we see, ranked first:** zone defenders do not break on the ball
  (C9). Defenders 3–8 yd from the catch point at the throw, speed toward it
  in the first 0.4 s of flight: Cover 3 0.27 yd/s against the NFL's 1.25,
  Cover 4 0.24 against 1.36, Cover 6 0.37 against 1.26, Cover 2 0.64 against
  1.09. They keep moving downfield at 1.2–1.8 yd/s (NFL 0.2–0.7) and 41–43%
  are moving away from the catch point (NFL 31–33%). Man coverage is NFL-like
  (Cover 1 1.77 against 1.42). Forced grid of 36,700 plays against 9,654 NFL
  dropbacks, direct measurement, checked on four plays
  ([stress matrix](reviews/2026-11-11-pass-stress-matrix.md)).
- **One mechanism found:** underneath zone defenders request 7–9 yd/s toward
  the catcher and achieve 2.2–2.5, because the receiver they relate to is
  re-picked every tick and the requested heading whips (8–12° a tick, about 4%
  of ticks reversing). Whether it persists after the release is not measured.
- **Missing rules:** see the coverage problem list below. They will not show
  their full effect while C9 stands. By the job nearest the target at the
  throw (inferred): corner jobs give up the most yards an attempt (12.4
  against family averages of 9.7–10.7); hook and apex jobs the most 10+ YAC
  (28–44%).
- **Ruled out by the matrix:** any one formation (the excess is the same
  across 2x2, 3x1, bunch, empty and 12 personnel).
- **Where pursuit stands (Defense, 2026-11-13):**
  - Lead angle, arrival speed and the finish match the NFL in aggregate, on the
    same operators.
  - The YAC gap is structure, which is Coverage's area: nobody downfield of the
    catcher on outside catches (RB 41% against 13%), the corner's position on
    wide outs and curls, and ball defense on medium flights.
  - The commitment fixes (`PURSUIT_COMMIT`, `CARRIER_COMMIT`, `SPACING_SMOOTH`,
    `PURSUIT_SPACING_SMOOTH`) are in engine-55's cards.
  - Between-player skill spread has no supported lever except LB closing at the
    release, which waits on the quarterback showing a cue
    ([RAT-4](KNOWN_PROBLEMS.md#rat-4)).
- **Unknown:** how much of the gap each piece carries. Concept-level cells
  are weak: the classifier agrees with the called concept 25–80%, and 70% of
  NFL dropbacks fit none of our 17 concepts. One concept cell stands out and
  was checked on plays: quick outs against Cover 3 and Cover 4, YAC median
  4.7–5.1 against 0.1–0.9, the corner 5–6 yd off and not closing.

### P2. The quarterback in the pocket

- **Size (direct):** sacks 4.5% against 6.3% league-wide. With a rusher within
  1 yd before the ball is out, our quarterback throws 65–71%, is sacked
  26–34%, scrambles 2–3% (NFL 29 / 49 / 22). He stands 71% of the time
  (NFL 24%) and ends outside the tackle box 3% (NFL 40% on pocket dropbacks).
- **Not the cause:** drop depth or set point (7.9 yd against 7.6); his speed;
  hit throws being too accurate (throws aimed at a receiver complete 40–42%
  against 43%).
- **What we see:** NFL quarterbacks leave on a leverage cue: a rusher who has
  beaten his blocker is 3.3 yd away when they leave and 5.2 yd when they stay.
  In ours that rusher is 7–8 yd away at the same moments: our rush wins late
  and close and gives no warning (inferred category "beaten"; not checked on
  plays). NFL quarterbacks throw the ball away on 23% of hit throws; ours 1%.
  42% of NFL hit throws come more than 0.5 s after first contact; ours 0–2%.
- **Model defects found:** his shoulders follow his eyes (305 of 317 set
  throws need under 15° of turn; the NFL turns 15°+ on half, taking
  0.3–0.7 s); his felt time to contact uses the block's private win score.
- **Built, off:** `SET_DECIDE` (ends panic throws, 75 → 13; overshoots sacks
  to 9–11% without movement), `BLOCK_SEEN`.
- **Unknown:** how our rush would have to change to show a beaten blocker at
  distance (measurement assigned, paused).

### P3. The short passing game

- **Size (direct):** targets behind the line and wide 0% against the NFL's
  12.7%; throws before 2.0 s 10.7% against 18.0%; an open flat is thrown 9.5%
  of the time against 32.6%.
- **Not the cause:** the quarterback underrating flats (he overrates them:
  predicted 74–78%, completed 51–53%; NFL 87% at 3–4.5 yd of space); read
  order or throw timing (both NFL-like).
- **What we see:** flats fail when thrown. The receiver runs to the earliest
  point he can reach the ball, slowing from 5.6 to 3.0 yd/s (NFL 5.3 → 5.0),
  and the quarterback leads him about a yard too far. Backs blocked, released
  late and settled among the linebackers.
- **Built, off:** `BACK_RELEASE` (released back open at the throw 11.6 →
  24.9%, NFL 36.4%); goes on with the catch and lead fix.
- **Missing:** screens and angle routes as callable plays (13.7% of NFL
  targets).

## Pass coverage problem list

From the coverage-rule audit ([review](reviews/2026-11-11-coverage-rule-audit.md),
per-family tables in `reviews/coverage-audit/`), Defense's diagnostics and the
matrix first cut. "Rule" items are coached rules our defenders lack.

| # | Problem | Kind | State |
| --- | --- | --- | --- |
| C1 | No release class for a route that breaks and keeps climbing (corner, post, wheel read as out or in), so "is he vertical?" triggers are blind. Half our targets are these routes (NFL 24%) | Rule, enabling | `CLIMB_BREAK` built, off (#561) |
| C2 | Nobody undercuts the corner route: underneath defenders let #2 go on an outside break | Rule | Open |
| C3 | Deep ownership: the deep-third corner considers only #1; one corner technique never sinks under a corner route | Rule | Open |
| C4 | Deep seats with no rule (Cover 3 post safety, half safeties, Cover 1 free safety; about 57% of dropbacks): re-pick the deepest man each tick and drive on a stopped route with no throw cue | Rule | Open |
| C5 | #3 or the back to the flat while #2 climbs has no owner | Rule | Open |
| C6 | No crosser exchange in man | Rule | Open |
| C7 | Quarters: corner leverage fixed outside; safety never re-reads after locking on #2 | Rule | Open |
| C8 | Underneath ownership re-picked every tick after a handoff; measured as request thrash | Rule, execution | Diagnosed; fix designed (stable ownership until an observable handoff) |
| C9 | Zone defenders do not break on the ball: 0.24–0.64 yd/s toward the catch point in the first 0.4 s against the NFL's 1.09–1.36; man is NFL-like | Behaviour; ranked first | **Repaired at `engine-94`** (`FLIGHT_BREAK`, #882: one break on the throw from an arm or ball cue the defender sees, on `engine-93`'s leak-free head). Earlier state: diagnosed (Defense): intent is immediate, the body starts 0.4–1.2 yd/s slower at the throw and gains less in flight; not a body limit (braking and start force at or above the NFL's) but the path (a straight reversal) and no direction before the release. `ARRIVE_LEAD` (drive to the catcher's upfield shoulder) on at engine-40; `SHOULDER_READ` built, off (needs defenders looking: 55–74% of ours face the quarterback before release against 86–94%, because match carries run hip-turned). Next: eyes in on the match carry |
| C17 | Deep defenders open their hips and run far too early: turned before the release on 58–88% of zone dropbacks against the NFL's 9–13%, at 4–5 yd of cushion (NFL 2–3), and the turn latches, so 43–96% are still running away after the receiver has stopped (NFL 4–12%). 19% of deep defenders over the catch are turned away at the release (NFL 0–4%); this is most of C9 | Rule: stay square until the cushion is broken | **Mostly repaired for deep players (`CUSHION_BREAK`, engine-36, on `PEDAL_CAP`, engine-33):** turned before the throw 51–84% → 29–40% (NFL 8–10), deep completion and trimmed YAC on the NFL. Still turns at 2.5–2.75 s with no help: he steps toward the receiver before the stem shows (a budget fix and a pre-release repair are built and parked) and receivers leave the line too fast. Pure man also over-turns (64–70% against 19–22%), untouched |
| C10 | Zone seats steered by the quarterback's internal read target | Hidden information | `SEEN_EYES` built, off, candidate (#562): zone linebackers slow at the release 34 / 37% → 19 / 21% |
| C11 | Help decisions use the true ball state | Hidden information | `JUDGE_SEEN_BALL` built, off; reads worse until C4 exists |
| C12 | Receiver numbering never re-counted after the snap ("final #3" cannot be expressed) | Rule, enabling | Open |
| C13 | Rule thresholds and latches are fixed scripts; recognition rating plays no part in confirming a release | Execution | Open |
| C14 | Completion barely depends on openness: tight / mid / open 50–55 / 57–64 / 62–67% against the NFL's 19–39 / 53–60 / 77–80%, in every coverage and every formation | Throw and catch, not coverage | **Partly repaired.** Open end: `CATCH_POINT` (engine-31), nobody within 3 yd 69 → 81% (NFL 81). Contest: `CATCH_HANDS`, `LOOK_ONCE`, `CATCH_SECURE`, `DRIVE_CATCH` (engine-39): completion −4 to −5 points into the NFL band; forced go under 1 yd 0.39 → 0.17 (0.16); mid openness 64 → 53% (53). Still open: tight throws complete about twice the NFL's; a trailing defender at 1–2 yd changes almost nothing (forced go 0.55 against 0.28; `trail.py` 68% against 50%). He can already reach the receiver's arms within his standing reach (`CATCH_HANDS`), but at the catch the hands are 0.15–0.2 yd off the receiver's centre and he is about 1.4 yd from them, past that reach (only 16% within it). `PLAY_HANDS` (built, off; he may lunge to the hands on his own judgement, the lunge committing his body) puts 77% within reach, but the edge-of-reach success law gives a full-stretch hand 15–20%: re-read on engine-40 within 1 yd unchanged (0.24), forced-go trailing 0.55 → 0.48, `trail.py` 68 → 71%. Stopped at the attempt limit; what decides a full-stretch hand at the catch is the open question |
| C15 | A defender near the ball's path re-rolled "does he find the ball" every tick, so nearly all were looking within 0.5 s | Defect | **Repaired:** `LOOK_ONCE` (engine-39) makes it one look per defender per flight, timed by where he is and his ball skills |
| C16 | Six places where the code disagrees with its coaching source (Lurk vs bunch, Palms depth, quarters vs trips, Cover 2 squat corner sink, inverted Cover 2 wall, one citation) | Rule | Defaults chosen; owner to confirm |

## Other open problems

| Problem | What we know | State |
| --- | --- | --- |
| Deep throws too easy | 51% complete at 20+ yd against 29%; the matrix supports C14 as the cause | With C14 |
| Short interceptions | 2.4 per 100 throws at 0–10 yd against 1.1 (was 4.8) | Parked; C15 is part of it |
| Protection: unblocked defensive linemen | With `PRO_CALL` on, free linemen rise about 1 per 100 dropbacks on three seed sets; cause not found | Recorded cost |
| Tackle forms | An upright waist wrap from behind never commits weight; a head-on wrap is driven back about 4 yd (NFL 2.3) | Parked |
| Tackle connect | Missed 1% of attempts after a catch against 4% | Parked |
| Receivers' stems too fast | Our receivers run vertical stems 1–2 yd/s faster than the NFL's at the point a deep defender turns (5.3–6.9 against 1.8–5.6 yd/s) | Not diagnosed |
| Downfield body contact | A defender's body is within 0.6 yd of a receiver 5+ yd downfield before the throw on 31–36% of passes against the NFL's 13% (man 47–57% against 19%); officials flag all of it (illegal contact 3.4 per 100 passes against 0.42; DPI, OPI and holding never called) | In work (Coverage): officiating judgment; the contact excess being diagnosed |
| A receiver does not path around a defender in his lane | A slot running a post into a man nickel stalls 0.8 s | Noted |
| Run stuffs | 9.3% against 15.9–23.5% | Not diagnosed |
| Throw mechanics beyond the turn | Load does not scale with the throw's demand or the arm; no throw-to-throw variation | Parked; estimated parameters when built |
| No keyed reads | Our quarterback runs a concept's fixed progression (with a hot/man reorder) and per-receiver forecasts; he cannot read a key defender ("flat defender sinks → throw the flat"). New concepts carry the coached read as data until the quarterback can use it | **Landed as `READ_PLAN` (engine-35) and `BACK_FRONT` (engine-37)**, from the owner's [design](research/2026-11-11-qb-read-compiler-design.md): key, triangle and alert reads, the back placed by his window, a verticals look before the checkdown. Open inside it: the corner against Cover 2 and the outside go are rarely thrown; shell-dictated reads not built |
| Short-catch YAC: where it comes from | Short catches (0–10 yd): ours 7.7 yd after the catch, NFL 3.8 (Defense, same operator). The first second matches. Of the 3.9 yd: about 2.0 from plays where no defender ever gets within 1.5 yd (13.6% of ours, 3.6% of the NFL's), 1.0 before the first arrival, 0.9 after a defender is on him. The rally is as dense as the NFL's and pursuers build speed as fast; the defender in front starts level with the catcher and 5 yd wide | Position and eyes at the throw (C9, match carry); `ARRIVE_LEAD` on. A pursuit-angle forecast (`FRONT_ANGLE`) made it worse and is a recorded miss |
| The tackle at speed | A side or rear wrap on a 4–6+ yd/s carrier gives up about twice the NFL's yards and takes 1.4× as long; slow contacts match (Coverage's cells). Established: the tackler goes to ground; his airborne weight was half-counted; a closed leg wrap holds at the ankle; the fall itself is fine | Parked (Flex, [write-up](reviews/2026-11-12-wrap-at-speed.md)). `HOLD_SINK`, `HANG_AIRBORNE`, `HANG_GRIP` built, off, none a candidate. Blocked on the grip law under a hanging load (set for a standing holder's horizontal tear), which touches every hold |
| In-stride catch | The receiver brakes to the earliest point he can reach the ball (6.3 → 3.0 yd/s into a flat; NFL 5.3 → 5.0). `IN_STRIDE_CATCH` fixes it and is right | Held: on engine-34 it added 12–17 points a team-game, because the slow catcher was hiding slow-arriving underneath defenders. Still +1.2 yd a dropback with `ARRIVE_LEAD` and `SHOULDER_READ` on. Lands when underneath arrival is repaired |
| The quarterback under a free rusher | With a free rusher at 2 yd: NFL throws 57%, sacked 25%, scrambles 17%, throws away 15% of throws, releases in 0.30 s (p75 1.10), completes 48%. Ours throws 77–93%, sacked 5–19%, throws away 1%, releases in 0.15–0.25 s. The rush itself closes as fast as the NFL's | In work: `HOT_LOOK` (candidate), the urgency bar (Rules + Coaching), evade / throw away / take it (Flex). `FREE_BOUND` held on it |
| The release off the line | Receivers leave too fast against press and off coverage alike; the jam barely exists; the freed go ends about 1.5 yd past where an NFL receiver is. Also the receiver's share of the deep defender's missing cushion | Coverage, after `PLAY_HANDS`: behaviour at the line (stance, release against a mirror, stem effort), not a physics change |
| Quarterback risk and nerve | He loosens his standards under pressure (lower completion bar, more interception risk accepted) and has one temperament number (Gunslinger archetype, decision-making). Missing: the game situation (score, clock, down, field position do not change what an incompletion or a pick costs him: fixed at 3 and 45 yards); a per-quarterback risk tolerance; the choice to take no throw (throwaways 1% against 23% of hit throws); memory of pressure within a game ("seeing ghosts": after hits and sacks he feels rush that is blocked, bails and checks down early, by composure) | Noted by the owner 2026-11-12. After the read plan lands: derive the costs from the situation, then the quarterback's distortion of them, with the throwaway as the same decision |
| Quarterback differences | Scrambling under pressure ranges 0–52% across NFL quarterbacks; speed explains about a fifth | Parked; hooks named |
| Pass protection families | No slide or max-protect calls, no hot throws | Parked; guide not written |
| Playbook coverage | Counted from the NFL's own route labels, no classifier ([review](reviews/2026-11-11-playbook-coverage.md)): 55% of NFL formation sides are a combination one of our 17 concepts runs, 25% of dropbacks have both sides covered, 7% are exactly one of our concepts (this replaces the matrix's "70% fit none"). On drop-back passes only (6,098 of 9,736 dropbacks after removing play action, screens, RPOs, designed rollouts and spikes): 54% / 22% / 5%. Missing, by size: the back's routes (angle 14.9%, out 6.2%, screen 3.4%, wheel 1.6%: 26% of dropbacks; ours block, check, swing or flat); screens of every kind; almost every common trips side (our #3 runs only hook, seam, flat or shallow); and two-receiver pairs such as go+flat, double slants, hitch+post, out+out, corner+flat | Corrected 2026-11-12: the back's routes are not missing. Measured on engine-47 over 1,470 drop-backs (`scripts/diag/concepts/back-routes.ts`), ours / NFL: flat or swing 35.4 / 34.5%, stays in 21.0 / 17.8%, angle 17.1 / 16.8%, no back 15.9 / 15.3%, out 7.1 / 7.4%, wheel 3.6 / 2.0%; the earlier count predated `CONCEPT_MENU` and `BACK_RELEASE`. Open playbook items, queued (Rules + Coaching): play-action protections (one generic protection today; boot and naked first, a `boot` drop type exists that no concept uses), then double moves (none in the playbook). Screens are left out on purpose and are being filtered from the matrix and this count: the aim is the drop-back game |
| Screens | Not callable | Parked, out of scope for now |
| Run-block grip frame | Since `OPEN_HANDS` (engine-54) a run blocker keeps cloth only by the pass rep's frame (between the man and the QB line), so seals, reach and cut-off blocks lose the man across their face: fixed run set 3.86 → 3.59, duo and toss lost most (−0.49 / −0.58 on engine-47). The old 40% of run steering above μ·N was the defect and stays fixed; what is missing is the coached seal/reach leverage: grip kept while his body is between the defender and the run's path | Parked behind the pass game (Flex). Named follow-up: a run-specific frame; canaries duo and toss; first measurement hitter class by concept, `OPEN_HANDS` on/off, after `RUSH_HANDS` stage 2's reads |
| Ratings that leave no trace in motion | NFL pursuers have stable habits our ratings do not create: LB closing at the throw (split-half 0.59), safety closing angle on arrival (0.51), DL approach speed (0.51), corner lead within role (0.65; traced to nothing tracking measures). Acceleration and redirect are not traits of our corners at all (0.08 / 0.14). The tackling rating slows the approach, which the NFL does not show. Finishing at speed is not a gap: from first contact, ours stop the runner as fast as the NFL's | Recorded ([RAT-4](KNOWN_PROBLEMS.md#rat-4), [RAT-5](KNOWN_PROBLEMS.md#rat-5), [TKL-8](KNOWN_PROBLEMS.md#tkl-8)). Nothing built for DB lead (safeties = role, corners = no measured source); the approach term is left as is and a rating-independent version parked |
| Interception conversion by position | Forced pressure panel (Defense, 2026-11-13; 3,963 plays): within 2 yd of the ball at arrival a dropping lineman breaks up 0.48 (LB 0.50) and allows 42% (LB 57%) but intercepts 0 of 91 (LB 3 of 161, DB 26 of 212). The replacement contests as a backer does; LB and DL have no `ballSkills` tier in `src/players/generator.ts`, so every backer converts a break-up at the floor of catching.ts's (0.06 + 0.22 ballSkills). Not checked against the NFL by position: BDB 2026 has pass outcomes per target (`npm run nfl:fetch`) | Measurement gap; a ratings-spread question, low priority |
| Old defense flags | Seven off flags undecided | Parked |
| Perception: one delay for everything | Every opponent is seen through one choice reaction time (0.16-0.40 s) with velocity frozen at the sample, also for continuous tracking of a man already watched (human online corrections about 0.1-0.15 s). Lanes patched it locally at least six times (KEY_REACT, touch, RouteObservation, CARRY_READ's seenAcceleration, the pursuit trend, feltClosing); some reads bypass perception (the pass set, the QB's blind side) | In work (Rules + Coaching): three channels (tracking, recognition, anticipation), [proposal](reviews/2026-11-13-perception-proposal.md); step 0 `PERCEIVE_TRACK` (`track()`, off) approved; step 1a pursuit next. True-state reads found by the census are being removed by their owners now (the user's rule), listed in [INFO-1](KNOWN_PROBLEMS.md#info-1) |

## What improved recently

Engine versions since 2026-11-10. Evidence for each is in
[REFERENCE_STACK.md](REFERENCE_STACK.md).

| Version | Change | Measured effect |
| --- | --- | --- |
| run-ref-21 | Safeties placed before nickel and dime (`DB_SLOTS`) | A linebacker held strong safety on 43 / 93 / 44% of nickel / dime / 3-4 snaps; now 0 |
| run-ref-22 | A missed ball only comes off a receiver who touched it (`DEFLECT_BALL`) | Interceptions 4.4 → 2.5% of attempts |
| run-ref-23 | Leg holds cost the stride by strength and grip (five flags) | Broken tackles after a catch 24 → 20% (NFL 20); yards an attempt 9.24 → 8.28 on one card |
| run-ref-24 | 2nd and long called like a passing down (`COVER_LONG`) | Cover 3 on 2nd and 7+ 40.0 → 36.4% (NFL 29.7) |
| run-ref-25 | A hold on the passer acts on the throw (`THROW_BODY`) | Sacks 3.3 → 4.4% pooled over three cards |
| run-ref-26 | A receiver coming back to the ball turns upfield after the catch | Correction to `CATCH_EYES` |
| engine-27 | Man defenders keep only the cushion the threat needs (`CUSHION_NEED`) | Cover 1 linebacker over the catcher 2.2 yd/s, 29% slow → 2.8, 4% |
| engine-28 | A protection call at the line (`PRO_CALL`) | Free blitzing linebackers 59 → 16, 58 → 19, 51 → 21 on three sets; sacks fall about half a point |
| engine-29 | Fifteen more drop-back concepts (`CONCEPT_MENU`) | NFL formation sides our playbook runs 54 → 66% |
| engine-30 | Zone defenders read the quarterback they can see, not his internal target (`SEEN_EYES`) | Cover 3 / Cover 4 linebacker over the catcher slow at the release 34 / 37% → 19 / 21% (NFL 8 / 10); YAC trimmed 5.80 → 5.40 |
| engine-31 | The catch is judged where the ball comes to the receiver's hands, not at the edge of his reach (`CATCH_POINT`); an illegal-contact flag needs contact that changed the receiver's motion (`OFFICIATE`) | Open, on-target throws 69 → 81% complete (NFL 81%); illegal contact 1.3 → 0.17 a team-game. Cost: completion +5 points, yards an attempt +0.5–1.0 |
| engine-32 | The quarterback expects a flat or swing to break when it does, not at the sideline turn-up (`FORECAST_BREAK`) | Flat and swing share of attempts on their concepts 5 → 21%; sacks and interceptions fall. Cost: offense up again, points +4 a team-game |
| engine-33 | The backpedal is the slowest way to go backward (`PEDAL_CAP`), a physics repair from NFL speed by body angle | CB pedal 7.3 → 4.9 yd/s (NFL p95 about 4.5); the base for the deep carry |
| engine-34 | Receivers work around a defender in their lane (`ROUTE_CRAFT`); the back leaves on the protection count (`BACK_RELEASE`) | Around a defender within 5 yd of the line 22 → 45% (NFL 52); back's release 2.40 → 1.65 s (1.60); sacks +1 point |
| engine-35 | The quarterback runs a compiled read plan (`READ_PLAN`) from the owner's design | The sheets' intended answer: dagger .33 → .58, sail .50 → .91; INT down on one seed, flat on the other |
| engine-36 | Deep zone defenders carry a vertical instead of turning and running (`CUSHION_BREAK`) | Points −3 to −6 a team-game; completion, yards an attempt and YAC down on both seeds |
| engine-37 | The back is read with the front side (`BACK_FRONT`) | Back's share 16 → 23% of throws (NFL 22) at NFL timing |
| engine-38 | The quarterback senses a blocked rusher from what he sees (`BLOCK_SEEN`); a pressed go no longer stalls (`RELEASE_THROUGH`) | Estimate error for a rusher through a blocker +1.39 → +0.43 s; pressed go stalled at 3.0 s 60 → 6% |
| engine-39 | The catch is a contest (`CATCH_HANDS`, `LOOK_ONCE`, `CATCH_SECURE`, `DRIVE_CATCH`) | Completion 65.6 → 60.1% and 68.2 → 63.8%; third downs and punts follow |
| engine-40 | Underneath zone defenders drive to the catcher's upfield shoulder (`ARRIVE_LEAD`); a touchdown is ruled before the tackle step | YAC a reception 9.07 → 7.26 and 8.10 → 7.65; points −2 to −3 |
| engine-41 to engine-91 | Not listed on this page | [REFERENCE_STACK.md](REFERENCE_STACK.md) has one section per version |
| engine-92 | What the passer sees off his gaze is less exact (`PERIPH_ACUITY`, #875); removes a perception leak | Neutral on whole-game outcomes |
| engine-93 | A head nobody turns follows the body (`HEAD_FOLLOW`, #885): defenders leaving zone eyes, and the passer after the throw, no longer perceive through a frozen head up to 180° off the body. The look-side hold (#883) landed just before it | Man defenders' head-to-body offset p95 146° → 19°; six-seed card neutral |
| engine-94 | Defenders break on the throw from a cue they can see (`FLIGHT_BREAK`, #882) | Five-seed card: YAC a reception −0.8 to −1.2 in four seeds, yards an attempt about −0.5, completion flat; interceptions 1.6 → 1.7% of throws (*lane*, Coverage) |
| engine-95 | The passer throws the ball away on felt pressure with nobody open, not on a timer from the set (`THROWAWAY_FELT`, #887) | Timer throwaways from a clean pocket 24 → 0 in 16 games (*lane*, QB); six-seed card: completion and sacks flat |

Earlier this month: run yards a carry came into the NFL band (4.51 against
4.48 on league-sampled teams), from 6.19 / 4.40 at the October page.

## Measurement artefacts found

Each of these looked like a football gap and was the measurement. Do not
rebuild toward the old numbers.

| Artefact | Effect |
| --- | --- |
| Two fixed teams in diagnostic games | Distorted YAC, contested-catch and completion-by-depth gaps; repaired by per-game identities |
| Four fixed coordinators | Most of the coverage-mix gap; repaired by `leagueSample` |
| Deep defenders found by roster position, not slot | "Second safety 2.4 yd shallow"; shell-mix gap |
| NFL catch event fires about 0.3 s late | Flight time and YAC from catch; use `pass_arrived` |
| Yard line used as ball depth | Depth-of-target tables |
| Route "break" defined by speed under 1 yd/s | "The quarterback throws early" |
| Under-center snaps counted as a free interior rusher | 25 of 34 NFL plays; inflates NFL first pressure by about 1.2 points (operator fix pending) |
| Throwaways dropped from the sim export as passes | Hit-throw splits |
| Rule-based route classifier | 40% agreement with NFL route labels; replaced by shape matching (64.5%) |
| Concept classifier | Agrees with the called concept 25–80% by concept; 70% of NFL dropbacks fit none of our 17 concepts. Concept-level cells are weak evidence |
| Re-aim table labelled by `agent.tags` (2026-11-24) | Tags are never cleared during a play, so "flight-break" meant "has broken on a ball this play": 200 reversals attributed to FLIGHT_BREAK were about 65. Attribute by the per-tick branch |
| Half safety's "#1 alone" target from a position-based state (2026-11-24) | The cell mixed go routes with posts, digs and corners in their stems: 2.3 yd inside #1; on labelled go routes the NFL half ends 8.7 yd inside. Split by route label before building toward it |
| Tracked ball speed in the first 0.1 s after release (2026-11-24) | Bimodal (p10 1, p90 41 yd/s); "our releases are faster than tracked" was the window. Use 0.2–0.4 s extrapolated back |
| A 16-game "after a first miss" result (2026-11-24) | Next attempt made 33 → 68% on one seed set and 48 → 48% on another; pooled over six sets it is flat. Outcomes conditioned on a miss need the larger sample |
| Flat-package gains measured before `engine-93` and `engine-94` (2026-11-24) | YAC −0.9 a reception was FLIGHT_BREAK plus defenders seeing through frozen heads; on `engine-94` the package alone is about neutral. Re-measure anything taken before `HEAD_FOLLOW` |
| Coverage "top speed" p99 before the throw (2026-11-24) | 8.0 against the NFL's 8.7 was defenders throttling in coverage, not capacity; after the catch ours are at or above the NFL's |

## Who is on what

Seven lanes are working (2026-11-24). Assignments come from the user through
Integration.

| Lane | Focus | Next |
| --- | --- | --- |
| QB | Q1: the `QB_V2` controller (the look, the judgment, the cycle) | True-state reads in qb.ts as small landings; then the skeleton against a stub slant-flat plan; the quick game is Phase 1 |
| Rules + Coaching | Q1: each concept's read as taught (#893) and the NFL side of the gates | Dropback family (curl-flat, smash, dagger, mesh, y-cross, flood, levels, verts); the route flags (#879, #880, #881, #886) wait for cards |
| Coverage | V1, V2 | Replace the 0.82 lane spot; `SQUAT_FLAT_FIRST` census; the note on what defenders do before a break, for Q1; the deep-carry trace |
| Flex | Q1's pre-snap plan; V1 with Coverage | True-state reads in qbmind.ts; then the pre-snap plan's design note; `HALF_SEAT` |
| Defense | D1, D2 | `BLOCK_FRAME` measurement; run-read ownership and facing after a shed; `TRAIL_LEVERAGE` (#892) on Integration's card |
| Run Game | D3 | Attribute the tackle package's extra run yards; `CARRIER_BRACE`; then the stiff arm |
| Tools / Physics | The harness for Q1; B1 | `BALL_DRAG` on as `engine-96`; the calibration operator (believed against actual, by defender role) and its standing test; the rating panel |
| Integration | — | Reviews design notes before code, cards and lands each change with red-diff, keeps this page |

The table below is the lane table as of 2026-11-12, kept for the items it
names that are still open.

| Lane | Focus | Next |
| --- | --- | --- |
| Rules + Coaching | The quarterback's decision | `HOT_LOOK` (a hot throw costs the look) is a candidate; then the risk work: when he has no acceptable throw under urgency (with a free rusher at 2 yd ours throws 81–93%, the NFL 57%), the window's model of defenders (those watching him break 0.2 s after his decision, he assumes 0.43; every run under-rated by 0.24 s), then the deep shot as a value decision (he throws the running go 4–6% against Cover 1, the NFL 62%) |
| Defense | P1: underneath arrival | Eyes in on the match carry (match calls install man technique; the seam carry turns and runs by default); then the parked deep-carry budget fix and pre-release repair; `SHOULDER_READ` re-read once defenders are looking |
| Flex | P2: the quarterback under a free rusher | Evade first, then throw on the move, scramble, throw it away or take the sack (NFL 17% scramble, 15% of throws thrown away, 25% sacked; ours 4–8 / 1 / 9–19). `FREE_BOUND` (he feels a free man) is built and held until this lands: alone it took sacks to under 1% |
| Coverage | C14 and the release | `PLAY_HANDS` decision (read done, see C14); then how a receiver comes off the line (level with a press corner at 1.5 s against 2.2; the jam lands on 1–3% and holds a tick; every receiver 2.2–2.5 yd/s at 0.5 s against 1.3–2.0) |
| Integration | — | Engine versions, this page |
