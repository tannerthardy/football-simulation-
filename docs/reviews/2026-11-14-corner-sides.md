# Each corner's alignment, by his side (design, 2026-11-14)

Design for Integration and Coverage's review; no build yet. When built: an off flag (`CORNER_SIDE`), two attempts. Rules + Coaching builds the call and the alignment; Coverage builds any new post-snap technique. Revised 2026-11-14 after Integration's review: the choice is the coordinator's call, confirmed at the line; techniques by family; disguise per side; expectations.

**The finding** (#741). Our corners align as a pair. A play's two corners (both sides with a wideout 9+ yd from the
ball) are both off, both pressed, or one pressed:

| | NFL | sim |
|---|---|---|
| both off | 43.7% | 69.5% |
| one pressed | 36.4% | 7.0% |
| both pressed | 19.9% | 23.5% |

BDB 2025 weeks 1-6: 2,184 non-PA dropbacks. Sim: develop 3c2f968d, 886 plays. "Pressed" means the defender over #1 is
under 2.2 yd at the snap; `scripts/diag/eyes/corner-sides.py`, the operator of #741, checked against labels.

## What sets each corner's press in the NFL (per side, same operator)

| variable | NFL press rate | sim |
|---|---|---|
| receivers to his side: 1 / 2 / 3+ | **55.2 / 36.5 / 28.9%** | 25.7 / 27.0 / 27.9% |
| the same, ball in the middle third (no field or boundary) | 54.8 / 35.5 / 27.8 | 20.8 / 23.4 / 23.9 |
| field / boundary, 2 receivers to his side | 33.7 / 41.0 | 26.4 / 31.5 |
| coverage x receivers to his side, Cover 3 | 48.2 / 27.4 / 18.9 | 7.5 / 14.2 / 13.3 |
| Cover 4 | 43.2 / 16.8 / 12.9 | 11.8 / 12.1 / 16.1 |
| Cover 6 | 50.5 / 35.9 / 14.3 | 7.1 / 11.6 / 10.5 |
| Cover 2 | 51.4 / 35.3 / 29.8 | 10.5 / 9.1 / 12.2 |
| Cover 1 | 69.8 / 56.0 / 48.9 | 61.0 / 55.1 / 56.5 |
| down: 1st / 3rd (all distances) | 33 / 46-53 | 22 / 33-36 |
| #1 on / off the ball | 37.0 / 39.6 | 24.7 / 34.6 |

The coverage labels are inferred (PFF's, and our call), so read that column with the usual caution.

**One-press plays, which corner presses (NFL).**

- the one on the side with fewer receivers: 72.9% of 457;
- the boundary corner: 70.8% of 325;
- the one over #1 on the ball when the other is off: 64.5% of 377.

**What explains it.** The receiver count to his side dominates, inside every coverage family and with the field
taken out (ball in the middle third). A corner with no #2 to his side presses about twice as often as one with three.
The boundary adds about 7 points at equal receivers. The down adds more press on 3rd down. On or off the ball adds
nothing.

So the NFL's one-press play is mostly a 2x1 or 3x1 snap in which the single side's corner presses and the
multi-receiver side's corner plays off. Ours has no receiver-count effect at all. Our zone corners almost never press
(10-14% against the NFL's 20-37% by family); that small share is the per-slot scatter, not a rule.

## Why, as taught

A zone or match corner's depth is set by what he must read. In quarters or cloud he has to clear the out of #2 first.
In sky he is "basically on #1 man", and "only in press is the CB not getting a read from the slot" (MatchQuarters
discussion of Palms/Lock).

With no #2 to his side there is no slot to read: his rule becomes #1 alone. That is the solo / MEG backside corner
against 3x1 that our own calls already install after the snap:

- Poach: "backside corner solos X";
- Saban's Rip/Liz backside corner "matches all of #1".

He can then align in press. In Cover 3 that is press-bail: "align in press, open and sink" to the deep third (Bowen,
NFL 101, Cover 3). The boundary's small extra press is the sideline as help (our DEF_ALIGN already plays a receiver
within 9 yd of the sideline from inside). Weak source; second.

Cover 6's halves: "teams can set the halves by receiver strength, field width, matchup or game plan" (Football
Nation). Ours sets them by strength only ("Stuff": quarters strong, half weak), with the cloud corner at the flat
corner's 4 yd. A field / boundary Cover 6 is a call, not this rule; noted, not proposed here.

## Where our code takes one value for both corners (`src/playbook/alignment.ts`)

1. **`cov.press`** is one boolean per coverage.
   - `placeCorner` sets `press: cov.press` on both (line ~1010).
   - `dbSpot` presses a man corner on `cov.press || role.press`.
   - Man alignment uses `mr.press ?? cov.press` (~1316).

   Every zone call has `press: false`. The per-role `press` exists only on man roles and is set on one nickel role
   (`cover1_banjo`).
2. **A zone corner's depth** is `zoneSpot(zone)` plus `style.cbDepth` (the team's habit) plus
   `situationDepth(job, situation)`. The last two are the same for both corners. Only the zone role differs by side
   (Cover 6, Poach, Stubbie).
3. **Disguise** keeps press only if both looks press (`p.press = press && l.press`, ~1480). That is right for one
   corner, but it applies the call-level press to both.
4. **No field / boundary input** reaches alignment: the receiver's room to the sideline enters only the shade.
5. **The receiver count to a corner's side** never enters his depth or press.

## The proposal (CORNER_SIDE, off), revised after Integration's review

This replaces the first draft's per-snap draw on each corner.

### 1. Where the choice lives: the coordinator calls it, the corner confirms it

**The call.** `DefensivePlayCall` carries a corner technique per side:
`cornerTech?: { S?: CornerTech; W?: CornerTech }`, with `CornerTech = 'off' | 'press' | 'press_bail' | 'solo'`.
- `press_bail` is zone: Cover 3.
- `press` is zone (Cover 2 / cloud: jam and sink) or man.
- `solo` is MEG on #1, where the call installs it (Quarters Poach, Stubbie, Cover 6 Book).

`DefensiveCoordinator.call` chooses it from what he knows when he calls the play:

- the offense's personnel and the formation when it is seen (the existing `formation` argument), so the likely
  single-receiver side;
- down and distance;
- his corner's man rating against that receiver (the `cbMan` / `wrRoute` terms the family weights already use);
- his team's habit: a per-team `cornerPress` share by family, how often he calls it.

The NFL's single-side rates by family set the centre of that habit: Cover 3 48%, Cover 4 43%, Cover 6 50%, Cover 2
51%. This is a coach's choice, fair to match like the call mix, not an outcome. The 3rd-down press (NFL 33% on 1st
down vs 46-53% on 3rd) falls out here as the same call's situational weight, not as a separate item.

**At the line, the corner confirms it from what he sees.**

- A called `press` / `press_bail` / `solo` holds while his side shows no detached #2.
- If a #2 appears on his side (motion or a shift), he backs off to his zone depth to read him, as the sources say
  ("in cloud or palms the corner needs to clear the out of #2 first"). He judges this from his own picture, with his
  delay.
- A called `off` is never upgraded at the line.

The call sets how often it is called; his eyes decide whether it holds. Built by Rules + Coaching (alignment and
call).

### 2. The technique after the snap, per family

A corner aligned in press must play the press technique of his family. Playing his off technique from a press
alignment would only make him late deep.

| family / call | technique from press, as taught | in `coverage/techniques.ts` today? | who builds |
|---|---|---|---|
| Quarters solo / MEG (Poach, Stubbie, Cover 6 Book) | press man on #1 with his depth protected | **Yes.** `ManCoverage` press (0.8 yd cushion, PRESS_MIRROR) with `protectDepth`; the solo roles are man roles that need only `press: true`. The jam already happens in the receiver's release when `spot.press` and his man is the receiver | alignment and call only (Rules + Coaching) |
| Cover 3 corner (deep third) | **press-bail**: align in press, at the snap open the hips and run to the deep third with eyes back to the QB, no backpedal and no jam; then the third's rules (Bowen, NFL 101: "align in press, open and sink") | **No.** A zone corner aligned at 1.3 yd just plays his zone drop from there: no bail footwork, no eyes rule. Not a `Technique` subclass (ReadRelease, Trap, Wall, Rob) | Coverage |
| Cover 2 / Cover 6 cloud (flat, squat) corner | **jam and sink / squat**: jam #1 to re-route him, then sink to the hole or squat the flat by his read of #2 (rules.ts already has the squat corner's "eyes on #2 first, then carry #1") | **No for the jam.** The release jam fires only when the corner's man target is the receiver, so a zone corner cannot jam | Coverage (a zone jam) |

**Staging, one of each, in order.**
1. Solo / MEG press. It exists now, so this is the first arm: call, alignment and the confirm rule only.
2. Cover 3 press-bail, after Coverage builds the bail.
3. Cover 2 jam and sink, after Coverage builds the zone jam.

Until 2 and 3 exist, the call never selects `press_bail` or a zone `press`. A press alignment without its technique
would only measure a late corner.

### 3. Disguise, per side

The corner's alignment is part of the look, so it comes from the shown call's technique on his side. What he can do
after the snap comes from the real one.

- **Shown press, real press** (man or MEG): he jams, as now.
- **Shown press, real off zone:** he aligns in press and bails at the snap. This is the press-bail used as disguise
  (Seattle's press outside the numbers, Bowen), and it needs technique 2.
- **Shown off, real press:** he cannot jam from 7 yd, so he plays the real call off from his shown depth, as now.

The single rule `p.press = press && l.press` becomes per corner: jam only if both the shown and the real technique on
his side are `press` or `solo`. His alignment follows the shown technique.

### 4. What to expect before the read

**Corner pairs.** Rule 1 applied to the same 886 sim plays, at the NFL's single-side rates on zone calls (a dry run
on today's snaps, not a game): both off 69.5 → 55.9%, one pressed 7.0 → 19.6%, both pressed 23.5 → 24.5%. The NFL is
43.7 / 36.4 / 19.9.

So it closes about 40% of the one-press gap. The rest is the NFL's press on multi-receiver sides in zone (17-36% by
family against our about 10%), which this proposal does not address. Stage 1 alone (MEG on the Poach / Stubbie /
Book calls) is a small share of snaps.

**#741's looks.**
- "Clear softer side" rises (30.7% toward the NFL's 34.9%).
- "3x1 backside pressed with no deep help" rises from 13.6%, already above the NFL's 8.4%. A risk to read: a solo
  press corner with a safety rotated to him is not "no deep help", but the operator counts deep defenders on his side
  at the snap only.

**Targets against the pressed side.** NFL, #1's routes by his corner at the snap, traditional non-PA dropbacks,
weeks 1-6. The labels mix man and zone, so read direction, not targets.

| route | targeted (press / off) | completion (press / off) | yards a target (press / off) |
|---|---|---|---|
| go | 17.5 / 8.6% | 38 / 19% | 8.2 / 6.7 |
| hitch | about even | 49 / 71% | 4.4 / 6.3 |
| out | about even | 55 / 56% | 4.6 / 5.8 |
| slant | 29.7 / 22.4% | 67 / 63% | |

So expect:
- more go and fade throws to the single side, and more of them caught;
- fewer good hitches there;
- slants to the pressed side.

**Deep balls over press-bail.** These are measured only after technique 2 exists. Before it, a pressed zone corner
would be late deep, which is a bug in the arm, not the rule.

**Measurement.**
- `corner-sides.py` rows on each arm.
- #741's look frequencies.
- The routes table above, on the sim, with the same operator.
- The pass card for what the press costs and buys.

Off flag, two attempts.

Commands:

```sh
python3 -I scripts/diag/eyes/corner-sides.py --data data/raw/bdb2025/big-data-bowl-data nfl=out/mechanics/nfl-plays-ids.jsonl.gz sim=out/x16/e-101.jsonl.gz,out/x16/e-105.jsonl.gz,out/x16/e-109.jsonl.gz,out/x16/e-113.jsonl.gz
```

Sources:
- MatchQuarters (Cody Alexander), "What is Quarters? Country, Zone, Palms, Lock", discussion: https://www.matchquarters.com/p/what-is-quarters-country-zone-palms-lock/comments
- M. Bowen, "NFL 101: Introducing the Basics of Cover 3", Bleacher Report: https://bleacherreport.com/articles/2047445-nfl-101-introducing-the-basics-of-cover-3
- N. Saban via Brophy, "Nick Saban Cover 3 adaptation (Rip/Liz)": https://brophyfootball.blogspot.com/2010/08/nick-saban-cover-3-adaptation-ripliz-to.html
- Football Nation, "What is Cover 6": https://www.footballnationusa.com/post/what-is-cover-6-in-football-quarter-quarter-half-defense-explained
- Football Nation, "Boundary corner vs field corner": https://www.footballnationusa.com/post/boundary-corner-vs-field-corner-college-football
