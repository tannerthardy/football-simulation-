# Each corner's alignment, by his side (design, 2026-11-14)

Design for Integration and Coverage's review; no build yet. When it is built: an off flag (`CORNER_SIDE`), two attempts.

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

## The proposal (CORNER_SIDE, off; a habit, not a script)

**Rule 1 (the main one): a corner alone with #1 may press.** A zone or match corner whose side has no detached #2
aligns in press (press-bail in Cover 3; press-solo in Quarters and Cover 6's quarters half; press in Cover 2 /
cloud) when his team's habit takes it this snap. A corner whose side has a #2 keeps his zone depth. After the snap he
plays his zone or match as now: press-bail drops to his deep third or quarter by his technique. Nothing in the coverage
changes, only where he stands and what that costs him (a pressed corner opening to bail starts deeper in his
backpedal debt; the physics prices it).

**How often.** The press share is the team's alignment habit (`AlignStyle`, like `cbDepth`), drawn per snap. It is a
coach's choice and fair to match, like the call mix: an "isolated-corner press" share per team, centred on the NFL's
single-side rates by family. Cover 3 and Cover 4 near 45%, Cover 2 and Cover 6's cloud near 50%, against the
multi-receiver side's 17-35%, which stays the zone depth plus the existing scatter. Not an outcome.

**Rule 2 (second, weaker source): the boundary corner** presses a little more at equal receivers, about +7 points,
the sideline as help. Only after Rule 1 is measured, and only if the gap remains.

**Not proposed.**
- **Man corners by side.** NFL Cover 1 is 70 / 56 / 49% by receivers to the side; ours is 61 / 55 / 57. The
  trips-side man corner playing off is a pick / bunch question, not sourced here. Our banjo and lurk calls already
  carry some of it.
- **The 3rd-down press.** The call mix carries it partly (ours 22 to 35%).

**What it must not do.**
- It does not read the offense's call. The receiver count and split are visible at the line.
- It does not change the coverage's post-snap rules.
- It does not cap a press that works.

**Measurement.**
- The same `corner-sides.py` rows on the arm: one-press share, press by receivers to his side, inside each family.
- #741's look frequencies, which change the QB's pre-snap picture.
- The run and pass cards for the cost: press-bail corners on verticals; quick game against a pressed single side.

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
