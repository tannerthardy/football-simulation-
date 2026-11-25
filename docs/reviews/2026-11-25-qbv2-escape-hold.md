# QB_V2: escape with eyes and a back; the firm hold stated (2026-11-25)

QB lane. These are items 2 and 3 of Integration's list from the outside reviewer's second read
(`docs/reviews/2026-11-25-qbv2-second-read.md` §1).

Patch: `docs/reviews/patches/qbv2/escape-on-890558713.patch`. It touches `src/sim/qbv2/cycle.ts` and
`test/qbv2-cycle.test.ts` only, and applies to develop 890558713 independently of the §1 work.

## Escape (cycle.ts onEscape)

Outside the pocket he still has eyes and a back.

- **Eyes:** they work the reads one at a time, starting from the read he was on, one stride on each. `looks.current`
  follows, so the gaze (drive.gaze) moves with them.
- **Throws:** each read's throws are judged as he sees them, then the checkdown. The checkdown's `fromStep` no longer
  applies, because the structure is gone.
- **Throwaway:** only when the rush is imminent or on him (contact). A rush that is merely felt keeps him running; that
  is what the escape is.
- **Leaving:** unchanged. Back inside the 3.75 yd margin with the rush clean or felt, he returns to his read. The eye
  index resets.

Test: qbv2-cycle "out of the pocket his eyes work the reads, a felt rush does not throw it away, and the checkdown is
there". It also checks that an imminent rush outside the pocket throws it away.

**Staged cells:** identical to the landed tree on all 8 × 30 (cmp 185, INT 5, sacks 3, release 1.36 / 1.46 / 1.71 s).
None of these quick-game plays reaches the escape. A scramble case for the card is still to find.

## The firm hold (qb.ts, before the V2 step): kept, stated

`if (heldBy(a, sim) >= 0.6 && this.phase !== 'windup') return stand();` stays. It is the old controller's body rule:
wrapped up by a tackler, he cannot start a throw, and that includes a throwaway, which needs the same windup. With only
a hand on him (held under 0.6) the arm is free.

The cycle's contact rung (`contact` = held > 0) is therefore reachable for a light hold, 0 < held < 0.6. That case is
covered by qbv2-cycle "with a body on him and nothing clearing he throws it away". A throw already in its windup when
he is wrapped still comes out (wobbling), as before.

**What this does not do.** It doesn't model which arm is free; the 0.6 grip stands in for it. That's a contact-physics
question (task #3, with Flex), not the cycle's.

## Checks

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run test/qbv2-*.test.ts`: passes (33).
