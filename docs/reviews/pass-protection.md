# Pass protection: where tackles meet edge rushers

Question: our tackles meet edge rushers at the line, a quarter second after
the line starts. Tracked tackles kick back and meet them 2.8 yd deep. Is
this the request or the body, and what makes meeting early costly?

**Measure.** `scripts/diag/pass-contact.py`, from the playbook/research
session (claude/great-mccarthy-85uf8b, `docs/reviews/pass-set-contact.md`).
It times from each play's line start (the median first movement of its five
OL), so the tracked snap lag cancels. Dropbacks without play action:

| Dropbacks, no play action | Sim before (6 games, 301-306) | `PASS_CORNER` | NFL 2022 |
|---|---|---|---|
| Tackle retreat at 0.3 / 0.5 / 1.0 / 1.5 s (yd) | -0.4 / -0.4 / 0.5 / 2.1 | -0.1 / 0.1 / 1.2 / 2.7 | 0.5 / 0.9 / 2.1 / 3.5 |
| Edge contact, median s after line start | 0.56 | 0.88 | 1.25 |
| Rusher depth at contact, median (yd) | 0.4 | 2.2 | 3.4 |
| Interior contact, median s | 0.63 | 0.59 | 0.79 |
| Pressure (defender within 2 yd before the throw) | 51.7% | 45.3% | 30.5% |

**Cause: the request.** `cutOffPoint` sends the tackle to the earliest point
on the rusher's predicted arc that he can reach first, at 0.75 of his top
speed. That point is at the line, so he steps up 0.4 yd to get there. It
replaced a set on the straight line to the QB, which left him on the chord
inside the arc; that geometry is kept.

**Change.** `PASS_CORNER` (default off; on in this branch's profile;
`blocking.ts` `cutOffPoint`):
- He cuts the rusher off only where the rusher's arc has turned toward the
  QB (heading within 0.5 rad of the QB's direction), the earliest such point
  he can reach first, looking up to 1.6 s ahead.
- Football reason: before the corner the rusher can still counter inside
  ("make him declare", "make the rusher come to you").
- Nothing is forbidden. Where the rusher commits early he is still met early
  (contact p25 0.46 s).

Contract: `test/pass-corner.test.ts`: on the recorded P040 rep the tackle
meets the end later and deeper, and does not step up first.
`pass-cutoff-approach` and `qb-rusher-recording` stay on the old law; in
P019 one tackle is not yet engaged at the throw under `PASS_CORNER`.

**Still open.**
- Tackle retreat is about half the NFL's by 1.0 s.
- Pressure was already 46% on this branch before this session's flags
  (`sim-ps3`). It is the next pass-protection question: interior contact is
  NFL-like, so the rushers' wins after contact are the place to look.
- The NFL edge alignment: tracked edges are 1.5+ yd outside the tackle on
  84% of dropbacks, ours 51% (playbook session).
