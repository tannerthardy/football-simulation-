# Free rushers on dropbacks (2026-11-10)

Run Game lane, on pass protection, at Integration's request.

**Question:** our dropbacks have more unblocked first pressures than the NFL's. Who is free, and why?

**Populations:**
- NFL: 2022 tracking (`out/mechanics/nfl-plays.jsonl.gz`), 9,654 dropbacks.
- Ours: 8 games from `scripts/diag/effective-mass/pass-frames.mts 11 8`, the same two teams (IRN/COM), at develop f122c83c, 747 dropbacks.

Both sides go through the same Python operators. Python operators: `scripts/diag/pass-operators/freerush.py` and `rushcount.py`. Sim-only truth traces: `scripts/diag/pass-operators/freepass.mts`, `blitzpick.mts`, `blitzseen.mts` and `fakeblitz.mts`.

## Definitions

- **First pressure:** the first frame from 0.3 s, before the throw, with a defender within 2.0 yd of the QB.
- **Free:** no offensive player other than the QB is within 1.2 yd of that defender at that frame.

## Who is free

Per 100 dropbacks:

| Free rusher at first pressure | NFL | Ours |
|---|---|---|
| Total | 10.2 | 13.7 |
| Off-ball LB, inside the OL span | 1.1 (p50 3.5 s) | 4.3 (p50 2.1 s) |
| DL on the line, outside | 1.8 | 4.7 |
| LB on the line, outside (stand-up edge) | 2.1 | 0.3 |
| DL on the line, inside | 2.1 | 2.9 |
| DB off the ball, outside | 0.9 | 0.9 |

## Why (truth trace, 111 free first pressures)

### Defensive linemen: 57

50 of the 57 were engaged before they came free. These are rush wins against the pass set, not assignment misses: the left tackle gave up 16, the right tackle 15.

**Next question:** is the tackle beaten on depth and speed, or over-set? Coverage found the tackles kick 1.4 yd too deep by request.

### Backer blitzes: 30

Of 176 backer blitzes, 33 reached the QB unblocked:
- 13 were assigned to the centre, who never engaged them;
- 13 were never assigned;
- 3 were assigned to the back;
- 4 were assigned to a guard or tackle.

Blitzers were first assigned at p50:

| Assigned to | Time | Backer's depth off the ball | Assignee's distance |
|---|---|---|---|
| Centre | 0.75 s | 1.1 yd | 2.45 yd |
| Back | 0.90 s | 1.1 yd | 5.5 yd |

Our blitzers are walked up 2.4 yd off the ball, and the line's picture of them lags about 0.35 s. At 0.4 s a blitzer is running downhill at 1.6 yd/s and is still seen at his snap spot.

That raises a question, not yet a task: is the protection's perception delay too long for a man the line is staring at before the snap?

## Numbers: five protectors against six

From `rushcount.py`, at 1.5 s or the throw:
- **Rusher:** a defender more than 1.0 yd past his snap spot toward the QB and within 3 yd of the line.
- **Protector:** an offensive non-QB player behind the line within the OL span ±3 yd.

| Rushers − protectors | NFL share | NFL free | Ours share | Ours free |
|---|---|---|---|---|
| −2 or fewer | 52.1% | 10.1% | 58.5% | 10.5% |
| −1 | 32.4% | 9.0% | 29.5% | 14.5% |
| Even | 11.3% | 12.7% | 9.9% | 25.7% |
| +1 or more | 4.1% | 14.5–16% | 2.1% | 31.2% |

The defence out-numbers us no more often than in the NFL. At even or short numbers, though, our free rate is about double, and 19 of the 33 free blitzes had no back in protection. That is the hot read and the protection call, handed to Coverage and to Rules + Coaching.

## BLITZ_READ: two attempts, not a promotion candidate

The code is not on develop. The patch, against develop f6fe9bf7's `src/sim/behaviors/blocking.ts`, is `docs/reviews/patches/blitz-read.patch`.

1. **Count an off-ball man running downhill above 2 yd/s within 5 yd as a rusher.** No change, because of the perception lag above.
2. **A man walked up 1.5–3 yd off the ball inside the OL width at the snap is a rusher on his first seen downhill step.**

Attempt 2, same 8-game set, flag on:
- **First assignment:** C 0.75 → 0.55 s, back 0.90 → 0.60 s.
- **Backer blitzes picked up:** 64 → 71%.
- **Free inside backer:** 4.3 → 3.2 per 100 (NFL 1.1).
- **Total free:** 13.7 → 13.6. The other rows drifted up, and the games diverge.
- **Fake-blitz control:** walked-up non-rushers given a protector rose from 3 to 11 of about 48.

Not measured yet: the DL a committed helper would have doubled, and whether the back gets square in front of the blitzer.
