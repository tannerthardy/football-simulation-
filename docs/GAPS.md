# Gaps

The current view of where our football is least realistic, what we know about
each gap, and what has improved. One page, kept short. Re-ranked on 2026-11-11
at `engine-28`.

[KNOWN_PROBLEMS.md](KNOWN_PROBLEMS.md) is the long record behind this page:
evidence, what was tried, what is still open. [REFERENCE_STACK.md](REFERENCE_STACK.md)
records each engine version and the evidence for it. The page this replaced
(weekly comparison of 2026-10-26, gaps F1–G10) is in git history at `82914195`.

How to read it: NFL comparisons find problems; they are not targets
([CLAUDE.md](../CLAUDE.md)). Outcomes and direct measurements are strong
evidence. Categories inferred from tracking (engaged, beaten, open, a break)
are weaker, and each one below says which kind it is.

## Where the engine stands

One-arm league card, 16 games, seed 11, at `run-ref-26`
(`engine-27` and `engine-28` move man coverage and protection; not yet re-carded as one arm).
NFL is the team-season p10–p90 band where one is sourced.

| Measure | Engine | NFL band | Reading |
| --- | --- | --- | --- |
| Rush yards a carry | 4.57 | 3.70–4.83 | In band |
| Runs of 10+ | 9.3% | 7.6–12.9% | In band |
| Run stuffs (0 or less) | 9.3% | 15.9–23.5% | Low |
| Completion | 58.5% | 60.6–68.1% | Low |
| Yards an attempt | 8.37 | 6.35–7.89 | High |
| YAC a reception | 6.65 | 4.53–5.91 | High |
| 20+ yd completions an attempt | 11.4% | 6.7–11.1% | High edge |
| Sacks a dropback | 4.5% | 4.6–9.4% | Low edge |
| Scrambles a dropback | 2.5% | 2.2–7.3% | Low edge |
| Interceptions | 2.9% | 1.5–3.2% | In band |
| Missed + broken tackles a play | 0.22 | 0.11–0.16 (unsourced) | High |
| Points a team-game | 30.6 | 21–23.5 (unsourced) | High |

The run game is in range. The scoring excess is the pass game: too many yards
an attempt and after the catch, too few sacks.

## The three focus problems

All lanes are on these three as of 2026-11-11. The pass stress matrix
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
| C9 | Zone defenders do not break on the ball: 0.24–0.64 yd/s toward the catch point in the first 0.4 s against the NFL's 1.09–1.36; man is NFL-like | Behaviour; ranked first | Measured in every zone family on the forced grid and checked on four plays; flight-window diagnostic next |
| C10 | Zone seats steered by the quarterback's internal read target | Hidden information | `SEEN_EYES` built, off, candidate (#562): zone linebackers slow at the release 34 / 37% → 19 / 21% |
| C11 | Help decisions use the true ball state | Hidden information | `JUDGE_SEEN_BALL` built, off; reads worse until C4 exists |
| C12 | Receiver numbering never re-counted after the snap ("final #3" cannot be expressed) | Rule, enabling | Open |
| C13 | Rule thresholds and latches are fixed scripts; recognition rating plays no part in confirming a release | Execution | Open |
| C14 | Completion barely depends on openness: tight / mid / open 50–55 / 57–64 / 62–67% against the NFL's 19–39 / 53–60 / 77–80%, in every coverage and every formation | Throw and catch, not coverage | Open; deep dive after the matrix |
| C15 | A defender near the ball's path re-rolls "does he find the ball" every tick, so nearly all are looking within 0.5 s | Defect | Open (Coverage) |
| C16 | Six places where the code disagrees with its coaching source (Lurk vs bunch, Palms depth, quarters vs trips, Cover 2 squat corner sink, inverted Cover 2 wall, one citation) | Rule | Defaults chosen; owner to confirm |

## Other open problems

| Problem | What we know | State |
| --- | --- | --- |
| Deep throws too easy | 51% complete at 20+ yd against 29%; the matrix supports C14 as the cause | With C14 |
| Short interceptions | 2.4 per 100 throws at 0–10 yd against 1.1 (was 4.8) | Parked; C15 is part of it |
| Protection: unblocked defensive linemen | With `PRO_CALL` on, free linemen rise about 1 per 100 dropbacks on three seed sets; cause not found | Recorded cost |
| Tackle forms | An upright waist wrap from behind never commits weight; a head-on wrap is driven back about 4 yd (NFL 2.3) | Parked |
| Tackle connect | Missed 1% of attempts after a catch against 4% | Parked |
| Run stuffs | 9.3% against 15.9–23.5% | Not diagnosed |
| Throw mechanics beyond the turn | Load does not scale with the throw's demand or the arm; no throw-to-throw variation | Parked; estimated parameters when built |
| Quarterback differences | Scrambling under pressure ranges 0–52% across NFL quarterbacks; speed explains about a fifth | Parked; hooks named |
| Pass protection families | No slide or max-protect calls, no hot throws | Parked; guide not written |
| Playbook coverage | 70% of NFL dropbacks fit none of our 17 pass concepts by the matrix's classifier, which is itself weak (25–80% agreement), so the true share is unknown. Our playbook is narrower than what the NFL runs | To fix. First step: count NFL route combinations directly from the tracking data's own route labels and list the common ones we lack |
| Screens and angles | Not callable | Parked |
| Old defense flags | Seven off flags undecided | Parked |

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

## Who is on what

Paused 2026-11-11 until the stress matrix reports. Assignments on resume:

| Lane | Focus | Next |
| --- | --- | --- |
| Rules + Coaching | P1 (lead) | The pass stress matrix (running); then C1, C12, and the rules in ranked order, fixture-first |
| Defense | P1 | C9 flight-window diagnostic; C8 stable ownership as a rule; `SEEN_EYES` to integration |
| Flex | P2 (lead) | Shoulders set and lagging his eyes; the throwaway as a choice; pocket movement on the leverage read |
| Run Game | P2, P3 | Pass-rush leverage measurement; joint read of `BACK_RELEASE` |
| Coverage | P3 (lead) | Flat catch point and lead; C15; then C14 after the matrix |
| Integration | — | Engine versions, this page |
