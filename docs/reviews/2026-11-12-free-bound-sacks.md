# FREE_BOUND and the missing sacks (2026-11-12)

Diagnosis only; nothing built.

The question (Integration): on the engine-36 league cards with BACK_FRONT, FREE_BOUND takes sacks from 4.2 / 3.5% to
0.9 / 0.8%. What else in the engine should still produce sacks?

Sources:
- Develop engine-37 (b10c109e) merged into the branch (38447370), FREE_BOUND off and on.
- Sim-export seeds 201 and 301, 16 games each.
- `free-alarm.mts`, seed 201, 8 games.
- NFL: BDB 2025.
- Tools: `scripts/diag/pass-operators/free-rush.py`, `scripts/diag/effective-mass/free-alarm.mts`.

## Overall

| | off 201 / 301 | on 201 / 301 |
|---|---|---|
| sacks (QB down behind the line, no throw) | 4.5 / 4.7% | 1.9 / 2.6% |
| time to throw p50 | 2.55 / 2.50 s | 2.40 / 2.50 s |

## 2. The free rusher at 2 yd, NFL against ours (`free-rush.py`, same code)

Dropbacks where a defender comes within 2.0 yd of the QB before the ball is out, with no offensive body within 1.0 yd
of him. Outcomes from that moment:

| | NFL (n 2249 of 9713, 23%) | off 201 / 301 | on 201 / 301 |
|---|---|---|---|
| thrown / sacked / scramble | 57 / 25 / 17% | 77 / 19 / 4%, 77 / 17 / 6% | 84 / 9 / 8%, 84 / 10 / 6% |
| release after the moment, p25 / p50 / p75 | 0.10 / 0.30 / 1.10 s | 0.10 / 0.25 / 0.50, 0.15 / 0.25 / 0.40 | 0.10 / 0.15 / 0.25 (both) |
| the rusher's distance at release, p50 | 1.70 yd | 1.40 / 1.20 | 1.39 / 1.30 |
| thrown away | 15% | 1 / 1% | 1 / 1% |
| targeted: complete, int, yd/att | 48%, 3%, 6.8 | 55%, 5%, 7.8 / 59%, 1%, 9.3 | 56%, 5%, 8.4 / 52%, 3%, 7.1 |
| targeted to a back | 22% | 32 / 29% | 39 / 34% |
| sacked: from the moment to the end, p50 | 1.30 s | 0.95 / 1.05 | 1.00 / 0.95 |

## 1 and 3. Where the off arm's sacks go, and false alarms (`free-alarm.mts`)

An alarm is the first time pressure() felt a hit within 0.45 s, the hot path's threshold.

| | off | on |
|---|---|---|
| dropbacks with an alarm | 120 / 723 (17%) | 171 / 724 (24%) |
| sacks with no alarm beforehand | 16 | 1 |
| alarms driven by the bound (felt more than 0.05 s under the ordinary estimate) | — | 124 |
| of those, the rusher arrived within 1.3 yd within 1 s | — | 79 / 124 (64%); ordinary alarms 47 / 47 |
| after a bound alarm | — | threw within 0.5 s 108, later 9, sacked 4, scrambled 1 |
| false alarms (never arrived) thrown within 0.5 s | 4 (ordinary) | 36: complete 25 / 36, 5.7 yd p50 |

## Reading

1. **Where the sacks went.** Off, more than half the sacks (16) came from rushers the QB never felt within 0.45 s:
   the blind spot FREE_BOUND repairs. On, he feels them and throws within half a second, mostly to the back.
2. **What the NFL QB gets that ours does not.** With the same free man at 2 yd, the NFL QB:
   - holds the ball longer: release p75 1.1 s against our 0.25–0.5;
   - is sacked 25% of the time and scrambles 17%;
   - throws 15% of those balls away;
   - completes his targeted balls 48% at 6.8 yd.

   Ours, even with the flag off, gets it out faster and completes more (52–59%, 7–9 yd). With FREE_BOUND he is faster
   still.
3. **The throw under the alarm.** His hot throw takes anything with P > 0.3 and is usually a short checkdown.
   - A flick (a shortened load) already costs accuracy (the miss spread grows by up to 1.8×) and ball speed (−20%).
   - At a median 5.7 yd that cost barely matters: false-alarm early throws complete 69%.
   - So the missing cost is not in the arm alone. Under a free rusher there is always a checkdown he can hit, quickly,
     with no penalty for the hurry. In the NFL that ball is more often not there, not caught, or thrown away. And the
     NFL QB more often extends the play (scramble 17% against 4–8%) or takes the sack.
4. **False alarms.** 36% of the bound's alarms are on a man who never arrives within 1 s. That is the "could" bound
   by design. The early throws they cause are cheap (69% complete) for the same reason as in 3.

## Candidates (none built; each its own question)

- **(a) The receiver at the catch under a hurried, short throw.** Our checkdowns to the back complete easily. Is the
  back open and ready for a ball released 0.15 s after the alarm, or is he still turning? The catch point
  (CATCH_POINT, Coverage) and the route timing would say.
- **(b) The QB's choice under an alarm.** The hot path is "anything with P > 0.3". The NFL QB under a free man more
  often takes the sack, escapes, or throws it away. That is the throwaway decision (parked) and the escape movement
  (parked: SET_DECIDE).
- **(c) The cost of a rushed delivery in the arm.** Parked throw-mechanics work: load not scaling with demand
  (ARM_DEMAND). It would matter more on longer hurried balls than on the checkdowns that dominate here.
- **(d) The free rusher's last two yards.** Ours arrive 0.95–1.05 s after reaching 2 yd when it ends in a sack;
  the NFL's in 1.30 s. Ours are not slower, so the rush is not the gap.
