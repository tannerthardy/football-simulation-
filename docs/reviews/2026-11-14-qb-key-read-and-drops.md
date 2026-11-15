# QB lane, 2026-11-14: key reads, the man over the route, drops

One day's record: what was built, what was removed and why, and the measurements that decided each.
Operators are under `scripts/diag/eyes/` and `scripts/diag/escape/`; exports and probe rows are in ignored `out/`.

## Key reads

- `QB_KEY_MAN` (on since engine-65): the key read is taken on the defender the concept names, read by his movement.
  On the probe (`key-read.ts`) the read was on the named man on 98% of key reads (39% before). Card: near flat.
- `QB_KEY_THROW` went through three forms.
  1. Throw the answer on its step behind window tests (who is near the catch, who is in the lane). The first rows
     that looked good (high answer thrown 20 -> 53% at 64%) did not measure it: a throw started on the read was
     re-priced at the delivery recheck and pumped. With the recheck fixed, a static height test in the lane decided
     29 throws: none complete, 4 picked (the man sinks under the ball). A reach-in-time lane test did not hold either
     (39% complete, 25 of 64).
  2. A named danger man (`QB_KEY_DANGER`), two forms. Neither moved the result. The probe showed why: of 76 key
     throws to the high man, 50 were on concepts with no danger named; of the 26 with one, the named man was the
     defender actually over the route and nearest the aim on 8. A defender named before the snap by a role is the
     wrong object; who is over the route is decided after the snap. Removed.
  3. The current form (off): he stays on the answer through its break instead of moving on at his dwell, and throws
     it only when it passes his price. Two seeds: corner routes targeted on 16.1% of routes (reference 14.3%, NFL
     14.0%, the window-test form 25.7%).
- Judging the first forms by completion was a mistake. NFL corner routes complete 44% for 9.8 yd a target; the forms
  that threw it "badly" at 47% were at the NFL's value. The row that decides is how often it is thrown, and where.

## The man over the route (`corner_danger.py`)

At the throw, for every corner route being run (or, with `--downfield 8`, every receiver 8+ yd past the line),
targeted or not: the spot is where the receiver truly is 1.5 s later; the man over the top is the defender at least
as deep (less 2 yd) nearest that spot after 0.3 s on his course; `need` is the speed he would need to get there.

- NFL quarterbacks respond to him steeply on corner routes: targeted 3.9 / 7.9 / 21.7 / 42.9 / 47.8% of routes as
  `need` goes 0-4 / 4-6 / 6-8 / 8-10 / 10+ yd/s. How often he is in each bin is the same in ours and the NFL.
- For all downfield receivers the NFL is 10.9 / 15.9 / 26.2 / 46.4 / 45.5%; our reference 10.8 / 15.9 / 13.2 / 10.1 /
  19.4%, with completion on the NFL's curve in every bin. So where the man is in range we throw and complete at the
  NFL's rate; the whole gap is the open end, which he does not throw.
- The deep man's closing speed after the release (same operator): where he has ground to cover, the NFL's is already
  running at the spot at the release (3.3-5.7 yd/s) and reaches 5.2-7.2 by +0.6 s; ours is at 0-1.6 and reaches
  about 3. Sent to Defense.

## Why the open end is not thrown

- `corner-price.ts` (his own evaluation of every receiver 8+ yd downfield at each throw): with nobody able to get
  there (pOpen 0.83, pClear 1.00) he prices the throw 0.13, because his accuracy belief is 0.23 on a 2.2 s flight.
  The price does respond to the man over the top (pOpen 0.46 with him in easy range).
- Forced throws (the open long ball he prices out, started anyway; 294 throws, default receiver): 42% complete, 17.7
  yd an attempt, 3.7% picked, whatever he priced between 0 and 0.45. His chosen deep throws priced 0.45-0.60
  complete 37%. The belief is too hopeless on long flights and too hopeful on mid ones.
- His rule for starting a throw is a bar on the chance alone (0.6 less aggression and urgency), the same for a hitch
  and a 40 yd ball. A calibrated 0.42 would still not clear it.
- Agreed next: (a) the accuracy belief fitted to our own catches by flight, per receiver engine, with his error by
  rating, the defender left to pOpen / pClear; (b) `QB_VALUE_BAR`: he throws when the throw's value clears the value
  of an ordinary throw on today's bar, with the incompletion's cost by down and distance taken from our own
  conversion rates. Neither is built.

## Drops

- `CONCEPT_DROPS` marks ten concepts five-step; `dropSpec('five_deep')` is the deeper set (gun 8.8 yd behind the
  line, spec 1.8 s; under center 8.9 yd, 2.0 s), from the NFL's 3.5-5 yd gun drops and 6.5-8.5 yd under center.
  It has its own drop name because redefining `'five'` deepened dagger and y_cross, which nobody had marked.
  `VERTS_QUICK` (the two verticals to the gun three-step) was split out: one flag, one meaning.
- Games could not localize the card's half yard: on 8 games the untouched concepts differed by 1.1 yd an attempt
  between arms. The instrument is the paired staged set (`drop-staged.ts`, `drop_staged_table.py`): the same 192
  plays a concept off and on; concepts the flag does not touch are identical play for play.
- Engine-64: the ten lost (5.79 -> 5.62 yd a play), sacks 9.3 -> 13.9% of plays, at the same time on the clock in
  both arms, every throw later by the set's delay.
- Engine-65/66 (VERTICAL_SET on): the ten gain. Engine-66: 8.19 -> 8.97 yd a play, 9.21 -> 10.41 yd an attempt,
  20+ yd completions 153 -> 228, sacks 95 -> 103, INT 20 -> 28 (1,920 plays). Crossers gain most (drive 7.40 ->
  13.15); outs and comebacks lose a little on picks (out-breaking balls from 0.8 yd deeper, to a tighter receiver
  priced the same). dagger is flat on the deeper set; y_cross loses nearly half (6.36 -> 3.51). VERTS_QUICK: 8.21 ->
  9.95 yd a play, sacks 52 -> 35.
- Where the gain comes from: on plays thrown before 2.3 s without it, the deeper set throws the same target on 355
  of 378, 0.4 s later, at the same 80% completion, for 8.2 -> 11.9 yd on plays completed both ways. Route timing and
  room to run, not a different read.
- Sacks by the tackler's slot (the twelve): reference DE_W 93, DT_S 43, DE_S 27; deeper set DE_S 79, DE_W 51, DT_S
  21. The strong-side edge gains what the weak side and the interior lose. Unexplained; with Flex. (An earlier cut by
  roster position called the strong-side stand-up edge "linebackers"; it is one slot.)

## QB_DROP_READ: built, read, removed

Premise: every decision hangs off his set, so a later set delays them all; let his time on read 1 run in the drop
and let a ready read 1 be thrown from the plant of the third step. Built at 26575308 with a staged test.

Paired on engine-66 (the ten): reference 8.19 yd a play; deeper set 8.97; QB_DROP_READ alone 8.23; both 8.51.
- The third-step throw works as built and is the wrong thing to want: it takes back 0.46 of the deeper set's 0.78
  yd a play by throwing the same route before it has room. A throw off the third step of a five-step is the hot or
  gift throw, which BLITZ_READ's hot set already owns.
- The dwell credit does nothing: read 1 becomes ready at about his set (median 0.00 s; 45% of plays a little
  before), so the credit is about 0.1 s.
So "reads do not run in the drop" was not a loss, and the flag was removed rather than landed doing nothing. The
premise came from engine-64, where the wait was being sacked; on an engine where it is not, the wait is the value.

## Later the same day: the drops on other grounds, the clock, and the price on a covered man

- Drops. On the route card's stack (stems at full pace) the deeper set is worth +0.14 yd a play on the ten, not +0.78,
  and varies by concept (drive +5.9, smash -3.7): the marking went back to Rules. Drive's gain is one throw, the
  shallow, 0.75 s later against quarters and cover 6 with nobody underneath (23 yd a play): a defensive fault being
  exploited. The "strong-side edge" sacks were one stand-up edge on one of four rosters; by-slot rows from four
  rosters are four individuals. `VERTS_QUICK` holds on both grounds (8.21 -> 9.95 and 6.98 -> 10.17 yd a play) and
  is delivered as `docs/reviews/patches/2026-11-14-verts-quick.patch`.
- The clock (`QB_COUNT`) was designed and not built. `ends-by-time.py` (how dropbacks end by time after the snap,
  no count assumed): of dropbacks alive at 3.0 s the NFL's are sacked 12%, ours 4%. What differs late is the answer:
  alive at 3.5 s, ours end at a back or short outlet 31% (NFL 11), downfield 29% (34), scramble 27% (38). The
  every-tick throwaway rolls are the pressure throwaway written as dice; they become one decision with QB_BREAK.
- The information guard's ten new reads of true state came out (a man he sees down; the body he believes a defender
  has and no fatigue scale; the dead `hotBy` label).
- Forced long throws by receiver engine: default receiver 53% complete whatever the miss (he is 0.4 yd from the ball
  at arrival in every miss band); `BALL_EST=7` receiver 25%, and only within a yard of the aim. The deep half of the
  belief waits for a receiver who tracks the long ball; fitting it now would fit his belief to a cheat.
- The price is calibrated on average and blind to coverage: by the target's true separation at the throw, priced
  0.60 / 0.61 / 0.62 / 0.66 / 0.68 against 50 / 57 / 66 / 72 / 77% complete (26% under a yard on the BALL_EST
  receiver). He believes a man within a yard is 0.37 s late, because a defender with his back to the passer is made
  to react to the ball. `QB_PHASE` (off) tried twice: a measured share of the receiver's movement (little effect),
  then the observable cue, closeness x velocity match with leverage, with `phase_fit.py`'s constants (targets under
  1 yd 6.7 -> 4.8% of throws, but INT 18 -> 30 on one unpaired arm, and the price did not open). The trace: his
  picture has the man at the right distance; the velocity match fails, a 0.25 s old defender velocity against the
  receiver's forecast velocity. Not carded. Next form, if ruled: closeness sustained over his recent pictures plus
  leverage, read on a paired staged instrument that does not yet exist.

## The blitz read on engine-68 (2026-11-15)

`scripts/diag/eyes/free-rusher.ts`, 16 games (seeds 11, 23 x 8). Half our blitzes have a rusher free of the
protection's accounting by 1.0 s, a median 7.9 yd away, and the quarterback's picture of him is 0.26 yd off: he is
visible. The stack (`BLITZ_READ`, `BLITZ_DEPTH`, `BLITZ_SKILL`) gets the free-rusher half right (quick throws 7 ->
19% against the NFL's 18%; sacks there 12.3 -> 9.3%). Its false hots on non-blitz plays (10.3%) were mostly real:
rushing linebackers 38 and, under the second look, 25 green dogs (a man on a back who stays in comes); the rest were
linebackers in man on the back, and 24 now screens. `BLITZ_SECOND` attempt two (whose path is he on, toward the
released back's path or at the quarterback, from fresh pictures, with hysteresis; no hot on screens) brings hots on
men not rushing to 3.6% of non-blitz plays with the free-rusher row kept (18% quick, 9.2% sacked) and non-blitz picks
16 against the reference's 14. `QB_EVADE_UP` rides with it.
For Rules (no build): concepts whose hot answer is none on the free man's side: post_cross, trips_outs, pa_post_dig,
pa_shot (and screens by design). A real install gives each protection a hot, a sight adjust, or keeps a back in.

## Open, in order

1. The paired set on the route card's branch (stems at full pace move when routes are ready).
2. `PLAN_KEYS_2`'s quick-game row; the trailed crosser's price (Rules' `CROSS_OVER`).
3. (a) the accuracy belief; (b) `QB_VALUE_BAR`.
4. The pump with a through phase (Defense's `RELEASE_BELIEF` can now be fooled by it); the corner's break in his
   price on a long out; the cue for a key read on his actual set, not the compiled time.
