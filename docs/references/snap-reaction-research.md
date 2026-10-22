# Lineman snap reactions: research notes

Compiled 2026-10-22 for the engine session, from web research and sources the
user supplied, cross-checked against the original pages where marked. These
are reference notes, not fitted parameters. No source publishes a measured
snap-to-first-movement time for NFL linemen.

## Separate four events

For each player, keep apart:

1. **Cue latency:** when the snap, or an opponent's first movement, becomes
   perceivable to him.
2. **Decision latency:** when he chooses or updates the football action.
3. **Movement onset:** when the body starts producing directional movement.
4. **Arrival:** when he reaches the block, gap or landmark.

A shortfall in one is not fixed by changing another. A blocker who requests
about 1.95 yd/s laterally but achieves 0.80 yd/s has an execution problem, not
a reaction problem. A backer who recognizes his key late is not fixed by faster
acceleration.

## Measured targets

**NFL get-off (snap → crossing the line of scrimmage).** Next Gen Stats
defines it as the "average time … required for a defender to cross the line
of scrimmage after the ball snap" (STRAIN paper, arXiv 2305.10262). Per-rep
values from the 2025 Big Data Bowl data (2022 weeks 1–9, pass rushes) are
summarized in `data/bdb2025-summary.json` under
`labels.passRush.getOffTime` (checked):

| Position | Reps | Median (s) | p10 | p90 |
|---|---:|---:|---:|---:|
| OLB | 8,963 | 0.84 | 0.62 | 1.22 |
| DE | 12,555 | 0.88 | 0.64 | 1.28 |
| ILB | 675 | 0.91 | 0.70 | 1.28 |
| DT | 10,420 | 1.00 | 0.75 | 1.43 |
| NT | 2,504 | 1.04 | 0.78 | 1.46 |

The distribution is right-skewed, and interior linemen are about 0.12–0.16 s
slower than edge rushers. Elite edge season averages are about 0.69–0.73 s:
NGS names Myles Garrett the fastest at 0.73 s in one season (minimum 100 snaps,
[NFL.com](https://www.nfl.com/news/11-outrageous-next-gen-stats-entering-week-12)).
Micah Parsons once crossed in 0.33 s on a single play
([NFL.com](https://www.nfl.com/news/next-gen-stats-introduction-to-pressure-probability)).
Single plays that fast imply anticipating the cadence. No league average is
published. In the repo's tracking (2025, defensive linemen on dropbacks),
median speed at 0.5 s is about 1.68 yd/s and median depth at 1.0 s is about
+0.45 yd.

**College linemen firing off at a signal** (Hester et al., *The Sport
Journal*; 12 OL and 14 DL from one Division I team; checked). From a
three-point stance 12 in from a sled dummy, timed from a simultaneous light and
sound signal to hand contact: **DL 0.430 s, OL 0.465 s** (p = 0.052; ICC 0.83,
SEM 0.022 s). That is reaction plus movement plus a strike, to an
unanticipated signal.
[Source](https://thesportjournal.org/article/position-specific-task-strength-and-performance-comparisons-between-ncaa-division-i-offensive-and-defensive-linemen/)

**Reaction from a stance** (Knudsen & Andersen, *Sports Med Int Open*
2017;1(2):E69–73; 11 amateur players; checked). Staggered stance, reacting to
a light, measured as force-plate onset: **0.23 ± 0.03 s**. A false first step
slowed the 5 m time from 1.77 s to 1.81 s (forward) or 2.01 s (backward).
[Source](https://pmc.ncbi.nlm.nih.gov/articles/PMC6226069/)

**Simple reaction time in college players** (Eckner et al., *J Athl Train*
2010;45(4):327–32, PMID 20617905; 94 Division I players; checked). A caught
falling stick took 203 ± 20 ms; a computerized simple reaction test took
268 ± 44 ms. These are hand responses with no locomotion. The classic lab
values are about 140–160 ms to sound and 180–200 ms to light (Kosinski
review, via BioNumbers 110800).

**Reaction to motion and preparation** (PMC7739764, 2019; 525 Division I
players and 40 controls; checked). The response was a finger button press to
a moving dot, pressing either the same side or the opposite side:
- Players took 406 ms and controls 444 ms.
- Responding opposite the motion cost about 35–39 ms.
- **With only 50 ms instead of 500 ms to load the response rule, reaction
  was about 100 ms slower and 10% less accurate.**
- The players' opposite-direction cost shrank under short preparation; the
  authors interpret that as proactive suppression of the automatic response.
- The largest advantages over controls were DB −53 ms, LB −48 ms and
  DL −42 ms; OL showed −26 ms.

[Source](https://pmc.ncbi.nlm.nih.gov/articles/PMC7739764/)

## The snap count and the offensive line

- Offensive linemen may not move before the ball, so moving with it is the
  legal best. Linemen learn the center's or guard's silent-count cues to
  predict the snap: when the center's head comes up it is "one second from
  snap", and "contact is made on the second step"
  ([Sports Illustrated, 2023](https://www.si.com/nfl/2023/09/22/nfl-offensive-linemen-timing-snap-illegal-formation-penalties)).
- Quarterbacks with less variable snap timing face more defensive "havoc",
  consistent with defenses anticipating a predictable cadence (arXiv
  2502.16313, 2025, reported by the research subagent).
- Pre-snap fouls in 2023 (accepted only, both teams combined,
  [Pro Football Reference](https://www.pro-football-reference.com/years/2023/penalties.htm)):
  - false start 618 (2.27 per game);
  - defensive offside 147 (0.54);
  - neutral-zone infraction 93 (0.34);
  - encroachment 38 (0.14).

  Defensive pre-snap fouls come to about 0.45 times the false-start rate.
  Declined offside on free plays is missing from these counts, and not every
  offside is a hard-count bite. A full crowd reduced home
  defenses' line-of-scrimmage penalties but not offenses' (Farnell 2023,
  reported).
- Restricted full text: a 2020 Mississippi State review for coaching
  defenders (ScienceDirect S0169814119303336) separates starting an action
  from completing it. A 2024 study of 85 NFL offensive linemen (*Perceptual
  and Motor Skills*, doi 10.1177/00315125241288605) links choice-reaction
  accuracy to fewer false starts.
- Nothing public measures offensive-line first movement, set depth at 0.5
  or 1.0 s, or first contact between OL and DL. The repo's 10 Hz tracking
  measures them with `scripts/diag/pass-contact.py` (see the
  [operator index](../reviews/nfl-sim-operators.md)). NFL tackles give about
  0.9 yd by 0.5 s and meet edge rushers about 1.25 s after the line moves;
  interior contact comes at about 0.8 s.

## Coaching rules already collected

See [external playbook sources](nfl-playbook-sources.md).
- **Bucs DL:** go on ball movement, not sound; crowd the ball; a big first
  step replacing the down hand.
- **Shurmur:** take off on the ball or a lineman, whichever moves first.
- **Walker:** a 6-inch first step.
- **Ravens OL:** "2 step down, strike", with the second step on the ground
  before contact; the stance must not tip run or pass.
- **Linebackers:** the first step starts at the snap in the key's direction,
  shortened when the key is ambiguous.

## Engine model compared (inference)

The current model is in `src/sim/agent.ts:148–149`, `src/sim/mind.ts:38` and
`src/players/physical.ts:155`:
- **Offense:** linemen start after `snapDelay`, 0–0.10 s.
- **Defense:** starts after `snapDelay + reactionTime·(1 − 0.4·anticipation)`,
  with `reactionTime` between 0.14 and 0.42 s.
- The code calls this "an assumption, not fitted latency".

Suggested reading of the evidence:
- **Offensive linemen anticipate the count.** A lag of about 0.03–0.06 s
  with a small early tail fits; the current `snapDelay` is close.
- **Defensive linemen are a mixture.** Reacting to ball or lineman movement
  takes about 0.15–0.30 s. Anticipating a predictable cadence takes
  0–0.10 s, at the risk of offside rather than within a cap.
- **The current defensive delay can reach about 0.52 s.** That makes the
  observed edge 10th-percentile get-off of 0.62 s, which includes about a
  yard of travel, hard to reach. The slow tail should come from
  acceleration, stance and contact, not from the reaction gate.
- **Validate against get-off by position and against depth and speed at
  0.1/0.2/0.3/0.5/1.0 s,** controlling for pre-snap motion. Do not validate
  against the lag itself, which 10 Hz tracking cannot resolve.
- **Preparation matters more than one reaction number.** A prepared response
  is about 100 ms faster, which argues for a fast, conservative first step on
  a prepared key and a later commitment.
