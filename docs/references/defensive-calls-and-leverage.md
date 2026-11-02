# Defensive play-calling, run-fit spacing, DB leverage and disguise

Research notes for the formation/alignment catalog
([plan](../FORMATION_CATALOG_PLAN.md), section 9), 2026-11-02.

**How these were gathered.** Web search only. Most MatchQuarters and X&O
Labs pages are paywalled, or were unreachable from the session, so many
citations come from search excerpts.

**How to read them.**
- Depths are coaching defaults that vary by staff, typically by ±1–2 yd.
  They are not measured NFL facts.
- Terms vary by staff: "rat", "Mable", "pirate", "spin", "rock/roll", and
  the meaning of MOD.
- Coverage numbers are system-specific. Fangio's Cover 9 is a weak-rotation
  Cover 3; elsewhere "Cover 9" means Cover 6 flipped. So store the structure,
  never the number.
- Per CLAUDE.md, nothing here is a target to tune toward.

## 1. What a call contains and who decides

**Order.** A call is usually said as **package → front, with a strength
rule → stunt or pressure → coverage → tags.**
- The coverage must be compatible with the pressure. A six-man blitz cannot
  be paired with a nine-man coverage
  ([Svec](https://jonsvec.substack.com/p/components-of-a-defensive-play-call)).
- Tags change one unit without renaming the call: a corner technique,
  MOD/MEG/Cone on one side, Rip/Liz rotation direction, a stunt for two DL.
- The strength rule (to the TE, the field, the passing strength or the back)
  is half of what a call means.

**Real call shapes:**

| Call | What it means |
|---|---|
| Kiffin/Carroll "Under 3 Sky" | Sam on the line over the TE; SS rotates down as the eighth fitter |
| Saban "Rip/Liz Match" | Pattern-match Cover 3, set right or left |
| Saban "Mint … Cover 7 + MOD/MEG/Cone" | Mint: 0 nose and two 4i's. Cover 7: split-field quarters, man-match tag per side |
| Fangio "Okie … 4/6/8/9 + Zeus" | Coverages shown from a two-high shell |
| Ryan "46" | Center and both guards covered; eight-man box |
| Phillips 3-4 | One-gap; slant to strength, angle away |

**Communication.**
- The NFL green-dot radio, usually to the Mike, cuts off at 15 s on the play
  clock or at the snap
  ([NFL](https://www.nfl.com/news/nfl-installs-new-coach-to-defense-communications-system-09000d5d809f61c6)).
- After the cutoff, everything is player rules and on-field checks.

**Who decides what:**

| Layer | Decided by | When |
|---|---|---|
| Package | Coordinator, from the offense's personnel | Between plays |
| Front, pressure, coverage family | Coordinator, from the call sheet | Before the cutoff |
| Strength and front set; the "check" between paired calls | Mike (front), safety (coverage) | Pre-snap, from the formation he sees |
| Motion and shift adjustments | Each player by rule, sometimes with a safety echo | Pre-snap |
| Pattern-match, MOD, Cone, rotations | Each player by rule | Post-snap |

The usual NFL practice is "call with a check": two calls, or a call with an
automatic answer by formation, for example "vs 3x1 check Solo/Poach".

**Call sheets** are organized:
- by down and distance;
- by field zone (backed up, open field, high and low red zone, goal line);
- by offensive personnel;
- by special situation (2-minute, 4-minute);
- with answer columns by formation family.

A self-scout keeps the coordinator unpredictable
([Viqtory](https://www.viqtorysports.com/how-to-create-a-defensive-call-sheet/),
[Coach & Coordinator](https://coachandcoordinator.com/self-scout-defense-football/)).

**For the sim:**
- **The coordinator chooses:** package, front family, pressure type, coverage
  family and its pre-snap shell, how much to disguise.
  - Draw these from a call sheet by situation bucket, weighted by the
    coordinator's personality, with a self-scout term (an entropy floor per
    bucket).
  - The call locks at the cutoff.
- **Rules executed by players on what they actually see:** strength, the
  front set, gap assignments, formation checks, motion adjustments, match
  rules.
  - A check reaches teammates with a delay. Tempo, noise and tired or less
    aware players miss checks more often, through communication rather than
    dice on outcomes.

## 2. Run-fit spacing and gap accounting

**Spacing** is 11 minus the players with no run fit at the snap
([MatchQuarters](https://www.matchquarters.com/p/politics-religion-run-fits-even-odd-spacing)).

| Spacing | Who is out of the run fit | Typical coverages | Consequence |
|---|---|---|---|
| **7-man** | 2 corners and 2 deep safeties | Cover 2, Tampa 2, pass-first quarters | Out-gapped by one; must earn a gap back |
| **8-man** | 2 corners and the post safety | Cover 1, Cover 3 | Pure one-gap fits |
| **9-man** | Only the corners | Quarters with run-first safeties, Cover 0, blitz | "Plus one"; quarters safeties fit off their keys ([X&O Labs](https://www.xandolabs.com/?p=155509)) |

**Gaps.**
- A, B and C on each side, plus D for each attached TE or wing, plus one per
  additional attached surface.
- The QB, if he is a run threat, is one more player the defense must
  account for.
- Out-gapped = gaps outnumber the fitters at the point of attack. Late motion
  or a shift, a puller or FB, or a QB keep can cause it.

**Worked example: 11 personnel, TE attached, against nickel 4-2-5 quarters.**
- Offense: 7 gaps, plus the QB.
- Defense:
  - the 9-tech end has D;
  - the 3-tech has strong B;
  - the shade nose has weak A;
  - the weak end has weak C (the dive player on reads);
  - the Mike has strong A; the Will has weak B;
  - the strong safety keys the TE and fits strong C or the alley;
  - the apex nickel has weak force, with the weak safety folding behind him.
- That's **9-man spacing.**
- Play Cover 2 or Tampa 2 instead and it becomes 7-man spacing against
  7 gaps plus the QB. The defense must earn the gap back: slant toward the
  TE, a two-gap or 1.5-gap nose, or a scrape exchange.

**Techniques that cancel a gap.** Each must be a requested intent carried out
by the physics, never a box-count rule.

| Technique | How it works | Note |
|---|---|---|
| Two-gap (head-up control) | One lineman covers two gaps by holding the blocker and shedding to either side | Needs real lockout and anchor ([Seattle](https://en.wikipedia.org/wiki/Seattle_Cover_3_defense)) |
| Gap-and-a-half (Fangio) | Primary gap, plus help on the next once the ball passes | 4i's sandwich the nose |
| Tite/Mint (0, 4i, 4i) | Squeezes the interior so runs bounce to the perimeter | Weak against outside zone and QB runs |
| Slant / angle | The whole line moves one gap at the snap | |
| Twists (tex, E-T, T-E) | Rushers exchange gaps | Vulnerable to the run if the looper is late |
| Scrape exchange | End squeezes and takes the dive; backer scrapes over the top to the QB | |
| Spill vs box/squeeze | Spill forces the ball wide; box keeps it inside | One unit-wide fit flag ([Svec](https://jonsvec.substack.com/p/box-vs-spill)) |
| Safety fold / alley | A two-high safety becomes the late fitter, triggered by what he sees | Arrives late from depth: the physical cost of a light box |
| Post-snap rotation / robber | Shows two-high, plays an 8-man fit | The rotating safety starts deeper |

**For the sim.** At the snap, log offensive gaps against assigned fitters,
including safeties with run keys. That shows whether a run failure came from
the accounting (being out-gapped) or from execution. Light boxes must succeed
or fail through the physics: the two-gap lineman holding or not, the safety
arriving late.

## 3. DB alignment and leverage by coverage

**Principle.** Take leverage away from your help and funnel the receiver
toward it.
- An inside safety means outside leverage.
- No deep help (Cover 0), or the sideline as help, means inside leverage
  ([Cover1](https://www.cover1.net/basic-defensive-coverages-series-cover-1/)).

| Coverage | Corner | Nickel / slot | Safeties |
|---|---|---|---|
| Cover 0 | Press or 5–7 yd off, **inside leverage**, tight | Inside, man | None deep |
| Cover 1 | Press or 5–7 yd off, **outside leverage** (funnel to the FS) | Inside or head-up, man | FS 12–15 yd in the middle |
| 1 Robber / Rat / Lurk | As Cover 1 | Man | One post; one low-hole player at 8–10 yd under the crossers ([SumerSports](https://sumersports.com/the-zone/the-many-variations-of-cover-1/)) |
| Cover 2 | Press or 5 yd, **outside leverage**, squat: re-route #1 inside, sink to the flat | Curl/flat or hook | 12–14 yd, on or near the hash |
| Tampa 2 | As Cover 2 | Hook | As Cover 2; the Mike carries the seam to 10–12+ yd |
| 2-Man | Press or trail, **inside leverage** under the receiver's hip | Trail, inside | Halves, 12–15 yd |
| Cover 3 Sky | 7–8 yd off or press-bail; deep third | Curl/flat or seam | FS 12–14 yd; SS down as the flat and force player |
| Cover 3 Cloud | Squats as the flat or force player | — | That side's safety takes the deep third |
| Cover 3 Buzz | Deep third | Flat | A safety buzzes from depth to the hook/curl ([Kou](https://coachkoufootball.substack.com/p/steelers-defense-3-buzz-and-2-buzz)) |
| Cover 3 Match (Rip/Liz) | Deep third, but man on #1 vertical | Carries #2 on the seam | The post matches #3 |
| Quarters | 7–8 yd off, **outside leverage**, reads #2 to #1 | Apex, inside leverage on #2 | 9–11 yd, inside of #2, keying #2: vertical = man him; out or under = help on #1; run = alley ([Bleacher Report](https://bleacherreport.com/articles/2094989-nfl-101-introducing-the-basics-of-cover-4)) |
| Cover 6 | Quarters side off and outside; half side squats (cloud) | — | The half usually goes to the boundary ([ITP](https://scoutingacademy.com/itp-glossary-quarter-quarter-half/)) |

**Quarters tags:**
- **MOD:** the corner mans #1 unless #1 goes short.
- **MEG:** man everywhere he goes.
- **Cone:** corner and safety bracket a lone #1.
- **Solo / Poach (vs 3x1):** the backside safety helps on #3 vertical and the
  backside corner is alone.
- **Mable:** usage varies by staff.

**How leverage shifts:**
- **Tight split:** outside leverage is easier to hold. The corner widens or
  plays head-up; inside help is closer.
- **Wide split near the sideline:** the sideline helps, so the corner can play
  inside even in zone.
- **Boundary vs field:** the boundary gets cloud, Cone or the hard corner. The
  field gets quarters or MOD.
- **3rd and long:** deeper, cushion past the sticks.
- **3rd and short, red zone:** more press and man; the condensed field
  shrinks the deep risk.
- **Bunch and stack:** banjo, in/out or box exchange rules.

**Press variants:**
- bump-and-run (contact inside 5 yd);
- kick-step / mirror;
- Seattle step-kick (patient; don't open until the receiver commits);
- catch technique (1–3 yd off, contact at the break);
- press-bail (show press, bail at the snap).

**When teams press:**
- the corner has the length or recovery speed for it;
- there is deep help behind;
- the field is condensed, or it's short yardage.

**When teams play off:**
- against faster receivers with no help;
- on 3rd and long;
- in quarters and three-deep eye discipline.

A missed jam must cost something physically: turned hips, trailing. It should
never be a capped success rate.

## 4. Disguise and motion

**Disguise mechanisms:**
- **Two-high shell rotating after the snap:** Fangio's defense was reportedly
  about 87% two-high pre-snap; that figure is single-source
  ([MatchQuarters](https://www.matchquarters.com/p/how-fangio-defense-disguises-coverage)).
- **Spin:** single-high pre-snap, two-high after.
- **Buzz / sky rotation.**
- **Rock / roll:** rotation toward the motion or the passing strength.
- **Press-bail, and identical cloud/sky corner alignment.**
- **Mugs and simulated pressure; creepers:** four rushers from a base look.

The **cost** is physical: a disguised defender starts away from his landmark
and arrives later, so run fits are late, and a telegraphed rotation can be
read. The trade must come from kinematics and perception.

**Motion** went from about 4% of snaps (2017) to about 22% (2023)
([The Ringer](https://www.theringer.com/2024/01/25/nfl/kansas-city-chiefs-baltimore-ravens-afc-championship-steve-spagnuolo-mike-macdonald-defense-motion)).

| Adjustment | What it reveals |
|---|---|
| **Lock:** the man defender runs with the motion man | Man coverage ([Svec](https://jonsvec.substack.com/p/adjusting-to-motion-in-man-coverage)) |
| **Bump / slide:** defenders pass the motion man down the line | Nothing; zone bumps the same way |
| **Safety rotation to the motion** | Hides the coverage, but moves run-fit strength |
| **Banjo, triangle or box exchange** | Reduces rubs against stacks, bunch and jet |
| **Run-fit reset** after the TE side changes | Where offenses out-gap defenses late |

Adjustments are rules keyed on motion the defenders actually perceive, with a
reaction delay. The QB may infer man from a lock he sees, but he never reads
the call itself.

## 5. Defensive personality axes

These are parameters that select calls and rules. They never modify outcomes.

| Axis | One end | Other end |
|---|---|---|
| Pre-snap shell | Align and play | Uniform two-high disguise |
| Blitz rate | About 18–19% (Fangio's Eagles) | 30%+ (some Spagnuolo seasons) |
| Pressure style | Four-man only | Simulated pressures and creepers; overload or zero |
| Man vs zone | Match-zone | Man-heavy |
| Box | Light, with a technique earn-back | Plus-one, one-gap penetration |
| DL technique | Two-gap or 1.5-gap | One-gap slant |
| Fit convention | Spill | Box |
| Corner technique | Off / bail | Press / step-kick |
| Motion response | Bump or rotate (hides the call) | Lock (simple, but it tells) |
| Check complexity | Few calls, fast | Many tags; more cognitive load and more busts |
| Tendency breaking | Predictable | High entropy with self-scout |

Complexity should cost something real: perception and communication load on
the players, not a scalar penalty.
