# Runner trend evidence: predeclared read, decision and cases

Written on 2026-10-26 on develop `4e6fed4e`, after #308. Before writing it I
ran only a passive audit of the existing held-up credit against true outcomes,
described below. Nothing in this note had been computed or run as a treatment
when it was written. It is research, not a mechanism on by default.

## The question

#308 left three gaps:
- the held-up credit (0.25 s / 0.7 s) does real work in open-field lane
  choice;
- the exit and the next lane are separate decisions;
- a single-beat "blocked" flag cannot tell a failing design from one about to
  open.

This note tests whether a read of the runner's own pictures across two of
his decision beats can replace the credit and carry the exit, without a
fitted duration.

## The audit that motivated it (passive, develop)

On 48 archive plays plus seeds 11–14 matched captures (21,634 threat-beats),
the snapshot credit was compared with what the defender did next. True state
is used as the experimenter's yardstick only.

| Credit given | held through +0.5 s | not engaged | shed within 0.5 s |
| --- | --- | --- | --- |
| 0.7 s (n 4,551) | 61% | 20% | 19% |
| 0.25 s (n 2,116) | 38% | 36% | 26% |

A further 925 engaged threat-beats got no credit; most are arm's-length blocks
outside touching distance.

## The read (acquired only)

**Beat memory.** At each of his evaluations the runner keeps his pictures of
every body: the same `sim.see` positions the evaluator uses, with defenders
at `delayScale 0.7`. At beat k the read compares them with beat k−1,
`Δ = t_k − t_{k−1}`. If there is no previous beat, or `Δ > 0.5 s`, the read
is *unknown* and adds nothing (Model A).

**Persistent visible contact.** Defender d touches the same perceived
teammate b at k−1 and at k. Touching is the existing test, centres within
`radii + 0.35`.

**1. Is the defender gaining?** For a route point q, his observed approach
rate over the window is

    r_d(q) = (|d_{k−1} − q| − |d_k − q|) / Δ
    T_trend(q) = r_d(q) > 0 ? |d_k − q| / r_d(q) : ∞

That is, the time to q if he keeps closing at the rate the runner has just
watched. "Gaining on the track" is `T_trend(aim) < H`, with `H = 2.0 s`, the
evaluator's own horizon. A pile driven back toward the runner counts as
progress, as it should.

**2. Is the crease closing?** At the aim point A, the free width `w` is the
gap between the nearest perceived bodies (both teams, not the runner) on
either side of the line from the runner to A, within ±1 yd of A along it,
minus their radii. "Closing" is

    w_k < w_{k−1}  and  w_k + (w_k − w_{k−1}) / Δ · H < 1.4 · runner radius

(1.4 · radius is `runReadAim`'s existing squeeze width.)

**3. Is the lead losing ground?** For the followed lead L, in visible
contact at both beats, his along-track progress is
`s = ((L_k − L_{k−1}) · û) / Δ`, with û the unit vector from the runner to
A. "Losing ground" is `s < 0`, moving back toward the runner.

## Replacing the credit (restraint forecast)

For a defender in persistent visible contact, arrival at q is
`max(T_A(q), T_trend(q))`. For everyone else it is `T_A(q)`. Here
`T_A = timeToReach(seen) + parking/observed recovery`, which is Model A.

The trend can only delay an arrival, and only when two beats of acquired
contact show slow progress toward that point. A defender gaining fast gets
no delay. There is no fixed duration and no blocker-side guess.

## One decision: leaving and the new lane

At a designed beat k, leave iff all three hold:
- the aim is blocked under the trend arrival at k **and** at k−1;
- the design is failing: gaining(aim) ∨ crease closing ∨ lead losing ground;
- some alternative heading is unblocked.

On leaving, the runner takes the best-scoring unblocked alternative, scored
with the same arrival, and holds it for one decision interval, his own
re-evaluation cadence. The open-field evaluator then starts from that heading
as `cur`, with its existing hysteresis.

## Predeclared cases (picked from the passive audit, before any treatment)

| Case | Instance(s) | Required of the read |
| --- | --- | --- |
| A block that holds | S11-P029 @1.25, DT_S/LG and DT_W/RG (held through +0.5 s, never inside 1.5 / 5.8 yd) | not gaining (`T_trend ≥ H` at the runner's lane points) |
| A block that loses late | S13-P019 @2.30 DT_S/C; S13-P032 @2.00 DT_W/RG; S11-P022 @1.95 DE_W/LG (each still engaged at +0.25 s, shed by +0.5 s, reaches ≤ 0.93 yd) | gaining by the first beat at or after the shed begins |
| A defender who only looks beaten | S13-P003 @2.50 DE_W/LT; @1.75 SS/Z (snapshot says "coming through", but held through +0.5 s and never within 8 yd) | not gaining, unlike the snapshot |

**Aggregate read check (passive).** Over designed-phase threat-beats with
persistent visible contact, the read's "not gaining" must predict "still
engaged at +0.5 s, never within 1.5 yd in the next 1.0 s" at least as well as
the snapshot 0.7 s credit does. The same goes for "gaining" predicting a shed
within 0.5 s. I report precision and recall for both; the read must not be
worse on both.

## Arms and witnesses (native, same constructors)

1. develop (credit, score gate);
2. A (no credit, score gate);
3. T1: the trend restraint forecast replacing the credit, with the score
   gate kept, which tests the replacement alone;
4. T2: T1 plus the one-decision exit.

Witnesses:
- S12-P011 @1.55 must exit for a visible reason;
- S14-P054 @1.30 should exit;
- S11-P029 @1.20–1.25 must not be forced out early;
- kept as opposing cases: S11-P022 Counter, S14-P023 Trap, S14-P043 Draw;
- plus the cases above.

Each is judged on the trace, not yards:
- did the read change for a visible reason?
- is a valid commitment kept?
- where does the first heading or speed request diverge?

**Stop:** a version that wins only through a score offset or hold duration,
always exits early, or needs true future motion stops. Two failed attempts:
stop and write down the missing piece.

**Fresh panel** (after freezing): seeds 15 and 16, the first 12 designated
runs of each in order, no filtering, every arm, once. A failure returns the
read to development and spends the seeds.

## Attempt 1 result (passive read check): fails

On 1,653 designed-phase threat-beats with persistent visible contact
(develop trajectories, 210 plays):

| | two-beat read (`T_trend(aim) ≥ H` = held) | snapshot 0.7 s credit |
| --- | --- | --- |
| "Held" was right (still engaged at +0.5 s, never within 1.5 yd) | 78% (1,183 / 1,524) | 81% (1,112 / 1,370) |
| Sheds within 0.5 s flagged as not held | 6% (6 / 107) | 38% (41 / 107) |

It is worse on both, so it fails the predeclared criterion before any
treatment. On the named cases:
- holds: correct for DT_S (∞ at the aim); DT_W is unknown at 1.25, because
  his contact is not yet two beats old;
- loses late: wrong on all three. At the aim, `T_trend` is 6.7 s, ∞ and
  11.0 s, so the read calls each "held";
- only looks beaten: correct on both, where the snapshot wrongly says
  "coming through".

A defender about to shed is still making slow progress toward the aim, so the
approach rate does not foresee the shed.

## Attempt 2 (predeclared here, after seeing the named cases' values)

**Disclosure.** Before writing this I looked at the named cases'
blocker-relative positions in the attempt-1 log. The named cases are
therefore not blind for attempt 2. The aggregate check below had not been
computed when it was written.

**Gaining** = persistent visible contact with blocker b, and either:
- **on the blocker:** with û from b toward the runner, his lead
  `λ = (d − b) · û` is rising and projected to clear the blocker's body
  within the horizon: `λ_k > λ_{k−1}` and
  `λ_k + (λ_k − λ_{k−1}) / Δ · H ≥ r_b + r_d`; or
- **on the runner:** `T_trend(runner position) < H`.

**Held** = persistent contact and not gaining. The same aggregate criterion
as attempt 1 applies, and so do the same named-case requirements.

## Attempt 2 result: passes the aggregate check, fails the controls. Stop.

**Aggregate (same 1,653 threat-beats):** it passes, beating the snapshot on
both counts:
- "held" was right 82% of the time (920 / 1,121), against 81% for the
  snapshot;
- it flagged 50% of sheds in advance (54 / 107), against 38%.

The cost is that it calls 32% of persistent contacts "gaining", most of them
falsely.

**Named cases (not blind, as disclosed):**

| Case | Required | Attempt 2 |
| --- | --- | --- |
| Holds: S11-P029 DT_S/LG | held | ✗ "gaining on the blocker" at 1.25, 1.45 and 1.65 s. Yet he stays engaged through +0.5 s and never gets within 1.5 yd; his lead past LG goes −0.09 → 0.37 → 0.81 against radii of 0.74 |
| Loses late: S13-P019, S13-P032, S11-P022 | gaining by the shed | ✓ all three (2.05, 1.75 and 2.20 s) |
| Only looks beaten: S13-P003 DE_W, SS | held | ✗ both flip to "gaining" (2.50 and 2.25 s) |

Both attempts failed, so per the stop rule no treatment arm was run and seeds
15–16 are not spent. The held-up credit stays as develop has it, and Model A
does not ship.

## The missing piece

Positions alone, across the runner's own beats, do not separate a block that
holds from one about to break in this engine:
- **Track-approach trend (attempt 1)** misses sheds. A defender about to get
  free is still closing slowly on the track until the moment he sheds.
- **Blocker-relative trend (attempt 2)** catches sheds but fires on holds.
  Held defenders often slide along and past their blocker's shoulder while
  the block keeps them away from the runner (S11-P029 DT_S, S13-P003 DE_W and
  SS). Geometry cannot tell "working around" from "being walled off".

What separates them is the state of the contact itself:
- **Leverage:** is the blocker's body between the defender and the track?
- **Facing:** where are the defender's hips and facing pointing, toward the
  track or toward the blocker?

The runner's picture already carries `facing` and `stance` (`Perceived`), so
a next attempt can stay acquired-only. It needs **fresh named cases**,
because these six are no longer blind, and the same aggregate check.

A related question for the trenches/physics owner, outside this lane: an
engagement that persists while the defender's center is beyond the blocker's
body sideways (λ 0.81 > radii 0.74) may be a hold the hands make physically
plausible, or a contact that should already be breaking. Which it is changes
what any read can learn from position.
