# The protection call: size, free rushers and identification (2026-11-11)

Report only; no engine change. Rules + Coaching, for Integration. This builds on
Run Game's free-rusher review (`docs/reviews/pass-pro-free-rushers.md`, 8 games
of the fixed IRN/COM pair) with league-sampled games, protection size and
situation.

**The question.** How many rushers against how many protectors, by down and
distance and by blitz, compared with the NFL? How often does a rusher come
free? Does the protection identify the right man? And what does a thinner
protection cost in the NFL, as a reference for backs releasing freely?

**Answer.**
- **Our pressure rate matches the NFL's** (28.4% vs 27.8% of dropbacks). Our
  sacks are a third of it (2.1% vs 6.3%). The sack gap is the finish, not the
  protection: Flex's QB side.
- **Free first pressures are a little more common** (12.1% vs 10.2%), and
  concentrated where the numbers are even or short: 23.2% and 38.0% against
  the NFL's 12.7% and 14.9%.
- **The protection is not called.**
  - Protection size does not change with down and distance or with the
    defence's look.
  - Off-ball blitzers are never identified before the snap.
  - Most free linemen won their block after engaging; that is trenches technique.

## Population and operator

**Sim.** 32 league-sampled games: `sim-export --seed 101/201 --games 16`,
`leagueSample`, develop facb5e0f (run-ref-24 for the truth trace), 2,892
dropbacks with five linemen and at least 0.8 s before the throw.

**NFL.** 2022 tracking common format (`out/mechanics/nfl-plays.jsonl.gz`),
9,654 dropbacks, joined to BDB 2025 `plays.csv` and `player_play.csv`.

**Operator.** `scripts/diag/pass-operators/protection.py`, the same code on both sides,
built on `rushcount.py` and `freerush.py`.
- At 1.5 s (or the throw if earlier):
  - a **rusher** is a defender more than 1.0 yd past his snap spot toward the
    QB and within 3 yd of the line;
  - a **protector** is an offensive non-QB player behind the line within the
    OL span ±3 yd.
- **First pressure** is the first frame from 0.3 s, before the throw, with a
  defender within 2.0 yd of the QB. It is **free** if no offensive non-QB
  player is within 1.2 yd of him then.
- **Rushers sent** is `wasInitialPassRusher` in the NFL and `plan.rushers` in
  the sim.

**Truth trace.** `scripts/diag/pass-operators/freepass.mts --league`, 16
league-sampled games, 1,561 dropbacks.

## 1. Protection size

| protectors at 1.5 s | NFL | sim |
| --- | --- | --- |
| 5 or fewer | 29.5% | 18.3% |
| 6 | 48.3% | **62.6%** |
| 7+ | 22.2% | 19.2% |

By situation, 6 / 7+ protectors:

| situation | NFL | sim |
| --- | --- | --- |
| 1st down | 42.6 / 29.6 | 61.8 / 20.6 |
| 2nd & 8+ | 48.9 / 17.1 | 58.1 / 22.0 |
| 3rd & 4–7 | **62.2** / 9.8 | 65.6 / 14.0 |
| 3rd & 8+ | 58.7 / 19.2 | 72.1 / 11.0 |
| 5 rushers sent | 44.6 / 30.5 | 60.9 / 21.8 |
| 6+ rushers sent | 43.8 / **42.2** | 51.7 / 29.8 |

Rushers sent (3- / 4 / 5 / 6+): NFL 4.5 / 67.5 / 22.2 / 5.8%; sim 2.6 / 66.9 / 25.2 / 5.2%.

**Reading.**
- NFL protections move with the situation: max protection on 1st down
  (play-action and shots), six in on 3rd and medium, and seven or more against
  6+ rushers.
- Ours sit at six about 60% of the time in every situation, and thicken less
  against heavy pressure (7+ on 29.8% against 6+ rushers, vs 42.2%).
- Rush sizes match.

## 2. Free rushers and sacks

| protectors | NFL free first pressure | NFL sack | sim free first pressure | sim sack |
| --- | --- | --- | --- | --- |
| 5 or fewer | 8.5% | 4.5% | 14.0% | 1.9% |
| 6 | 9.6% | 7.1% | 11.4% | 1.9% |
| 7+ | 13.9% | 6.8% | 12.3% | 2.9% |

| rushers − protectors | NFL share | NFL free | sim share | sim free |
| --- | --- | --- | --- | --- |
| −2 or fewer | 52.1% | 10.1% | 57.3% | 9.5% |
| −1 | 32.4% | 9.0% | 31.7% | 12.0% |
| even | 11.3% | 12.7% | 9.2% | **23.2%** |
| +1 or more | 4.2% | 14.9% | 1.7% | **38.0%** |

| all | NFL | sim |
| --- | --- | --- |
| free first pressure | 10.2% | 12.1% |
| any first pressure | 27.8% | 28.4% |
| sack | 6.3% | 2.1% |

**The NFL reference for thinner protection** (Run Game's free-releasing backs):
- with five or fewer in, NFL offences give up a free first pressure on 8.5% of
  dropbacks and a sack on 4.5%;
- NFL offences that stay thin are not punished for it in free rushers. They
  choose it against looks they can handle, and the ball comes out sooner.

## 3. Who comes free, and why (truth trace)

There are 218 free first pressures on 1,561 dropbacks, 14.0 per 100.

| free rusher | n | identified before the snap | ever assigned | engaged before free |
| --- | --- | --- | --- | --- |
| DL on the line | 115 | 114 | 114 | 113 |
| LB off the ball, blitzing | 67 | **0** | 50 | 12 |
| DB off the ball, blitzing | 8 | 0 | 3 | 0 |
| zone droppers (LB/DB) | 11 | 0 | 0 | 0 |
| other | 17 | | | |

- **Linemen** come free after they have been blocked: rush wins against the
  pass set, mostly against the tackles (LT 38, RT 39). That is trenches technique.
- **Blitzing backers** are never identified before the snap.
  - 17 are never assigned.
  - The rest are assigned after the snap, to the centre (9), a tackle (11), the
    back or fullback (9) or a guard (7), who mostly do not reach them.
  - Run Game measured the cause: the protection's picture of a walked-up backer
    lags about 0.35 s, and its first assignment comes at 0.55–0.9 s.
- When a blitzer comes free there is no spare protector on 61 of 75 blitzes,
  and 26 of those had no back in.

## The protection call

The engine's protection is reactive. The line declares only defenders on the
line at the snap (`PRO_READ`) and assigns everyone else after the snap. Whether
a back stays in is fixed by the concept (`block` on 9 pool concepts, `check` on
11), not by the front.

An NFL protection is called at the line. The centre or QB counts the threats in
the box, including walked-up backers inside the tackles, identifies the Mike,
and sets the slide toward the extra man. The back and the tight end are kept
in, or released, by that count.

**The football fix the numbers support.** A pre-snap protection call (flagged):
- count the box: on-line defenders plus walked-up backers within about 3 yd
  inside the OL span;
- declare them, so a walked-up backer is a rusher on his first downhill step
  rather than when the picture catches up;
- set the slide toward the side with the extra threat;
- keep a `check` back in (block, then release only if his man drops) when
  threats exceed the linemen.

That gives protection size a reason that moves with the look, which is what the
NFL table shows.

**What it would and would not do.**
- It addresses the free-blitzer rows (about 4.8 per 100, vs NFL about 2) and the
  even/+1 rows.
- It would not touch the rush wins by linemen (7.4 per 100) or the sack finish.

**Run Game's earlier `BLITZ_READ` attempt** is related: declaring walked-up
backers raised blitz pickups from 64 to 71%. But it also raised the protectors
given to fake blitzers from 3 to 11 of about 48. That cost belongs in the
judgement of any pre-snap call. The NFL also over-protects against
simulated pressure; the card would show which way it nets.
