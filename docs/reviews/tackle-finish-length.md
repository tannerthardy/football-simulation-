# Tackle finish: why contacts at the line end too soon

Flex, 2026-11-08. Main Engine's queue, item 2 (contact to whistle). Tanner
assigned the tackle-finish law (`src/sim/tackle.ts` `updateBond`) to Flex
through Run Game. Promotion goes to Tanner, with Primary informed.

## The gap

Run Game's operators, the same code on NFL 2022 and the sim:
- **First contact:** the first frame after the handoff a defender is within
  1.0 yd of the carrier.
- **End:** NFL `events.end` (the first tackle / out-of-bounds / touchdown
  frame); the whistle in the sim.
- **Population:** zone runs, Run Game's stack with flags off.

| Contact at | −1..0 | 0..1 | 1..3 |
|---|---|---|---|
| Contact → end, NFL / sim (s) | 1.4 / 1.1 | 1.5 / 1.0 | 1.3 / 0.9 |
| Gain after contact, NFL / sim (median yd) | 2.37 / 1.63 | 2.61 / 1.59 | 2.92 / 1.84 |
| Flat at end (last 0.3 s, \|dx\| ≤ 0.25), NFL / sim | 38 / 56% | 41 / 52% | 33 / 37% |
| Ball moved back at end, NFL / sim | 9 / 4% | 11 / 5% | 7 / 2% |

Measurement note: `stuffbin.py` first measured NFL to the last tracking frame,
which includes post-tackle frames. That gave the 1.5–1.9 s quoted in the
handoff. Measured to the end event, it is 1.3–1.5 s.

The deficit is the length of the finish, not its direction: the sim does not
drive the ball back more often than NFL.

## Where it comes from

**Base:** `run/G3-oz-backfield` @ 86f044d9, Run Game's flags plus
`ONE_ARM_HOLD=1`. Fresh capture-runs restage, seeds 7–29 odd, zone runs.
**Probes:** `scripts/diag/tackle-finish/`.

1. **Timeline.**
   - The grasp forms on the same tick as proximity contact.
   - The carrier leaves his feet 0.45–0.6 s later, and the whistle follows
     about 0.4 s after that.
2. **Fall cause** World records when he leaves his feet (392 carries): `legs`
   64%, `contact` 36%.
3. **Capture-point budget**, single-tackler `legs` falls with the carrier at
   ≥ 3 yd/s (n 87). Over the last 0.4 s, trip impulse and thigh-moment excess
   are about 0, and contact plus acceleration displace him by 0.38 yd. The cause
   is the virtual foot's deficit: his corrective step is held up to about
   4 yd/s short of where balance needs it. That coupling is set in
   `updateBond`: `recoveryCoupling = legs + (1 − legs)·secure`. A hold half on
   his legs (the median, 0.5) pins the corrective foot completely once the grip
   is secure.
4. **Ablations of updateBond's requests** (median gain after contact at
   −1..0 / 0..1 / 1..3):
   - Base: 1.20 / 1.44 / 1.83.
   - Removing the secure-wrap roll / sit-down makes gains *worse*
     (0.99 / 1.26 / 1.73). It keeps a wrapped carrier upright.
   - Removing the held stride changes nothing.
   - A front tackler who matches the carrier instead of driving at −2.5 yd/s
     gives 1.49 / 1.53 / 2.04.

## Change: `WRAP_FOOT` (experimental, off)

`recoveryCoupling = legs·secure`.
- **Law:** only the share of the hold that is on his legs constrains where he
  can place a corrective foot, as far as the grip on it is secure.
- **Physical rationale:** tightening a hold does not move it down his legs.
  Force through the hold is unchanged (grip capacity and joint law as before).
- **Scope:** only the step coupling changes. A pure torso wrap (`legs = 0`) was
  already uncoupled.

| Contact at −1..0 / 0..1 / 1..3 | Contact → end (s) | Gain (yd) | Flat |
|---|---|---|---|
| Base | 1.00 / 0.90 / 0.80 | 1.20 / 1.44 / 1.83 | 72 / 55 / 33% |
| `WRAP_FOOT` | 1.25 / 1.20 / 0.90 | 1.34 / 1.39 / 1.88 | 75 / 68 / 43% |
| NFL | 1.4 / 1.5 / 1.3 | 2.37 / 2.61 / 2.92 | 38 / 41 / 33% |

These are single runs on my base. Run Game's paired tables are the evidence to
use.

- **Effect:** carriers stay up about 0.25–0.3 s longer, moving contact → end
  toward NFL. Gains hardly move and the flat share rises.
- **Why the gain doesn't follow,** for upright held carriers by the number of
  tacklers holding:

| Tacklers holding | Carrier forward speed (median, yd/s) | Stalled (< 0.5 yd/s) |
|---|---|---|
| 1 | 2.8–3.0 | 7% |
| 2 | 1.3–1.5 | 17–23% |
| 3+ | 0.5–0.7 | 42–47% |

- A single tackler is dragged, as in the NFL. With `WRAP_FOOT` the extra time
  upright is spent in two- and three-man piles, which stall and end on the
  0.8 s no-progress rule (`STALL`).
- The remaining gain deficit is therefore a pile question: how soon and how
  often second and third tacklers arrive, and how hard a pile stops the
  carrier. It is not the single-tackler finish.

## Open

- **Defender count at contact (Run Game's operators):** NFL reference for the
  carrier's forward speed by the number of defenders within 1.0 yd after first
  contact, and for how soon the second defender arrives.
- **Controls:** after-catch tackles (YAC) and QB sacks with `WRAP_FOOT`, in Run
  Game's paired run.
- **The front tackler's −2.5 yd/s drive toward his own goal** is about 0.3 yd at
  the line. It is parked until the pile question is answered.

## Paired tables and controls: do not promote (2026-11-08)

**Run Game's paired run.** 546 zone plays. Stack: `run/G3` @ c67e4abf, Defense
205c6add, `ONE_ARM_HOLD`, #416, a1b3986d, `END_CHASE=1`. Arms: `WRAP_FOOT`
0 → 1.

| Contact at | Contact → end (NFL) | After-contact median (NFL) | End ≤ 0 (NFL) |
|---|---|---|---|
| < −1 | 1.7 → 2.1 s (1.6) | 2.50 → 2.99 (2.26) | 26 → 20% (53%) |
| −1..0 | 1.1 → 1.4 (1.4) | 1.72 → 2.13 (2.38) | 16 → 14% (16%) |
| 0..1 | 1.0 → 1.1 (1.5) | 1.64 → 1.62 (2.53) | 1 → 2% (3%) |
| 1..3 | 0.9 → 1.1 (1.3) | 1.91 → 2.01 (2.68) | 0 → 0% (1%) |

**Other measures:**
- Flat at end (contact −1..+3): 48 → 59%, against NFL about 38%.
- Paired yards: OZ +0.41 (SE 0.08), IZ +0.79 (SE 0.15).
- 10+ runs: OZ 11 → 13% (NFL 11%); IZ 13 → 17% (NFL 9%).

**Controls.** Eight-game `sim-export` (seed 101). The arms are not paired:
games diverge after the first changed play.
- Yards after the catch: mean 9.44 → 10.72, p50 4.55 → 5.25. G3 already has
  these too high.
- Sack-like dropbacks (negative yards, no throw): 4.4 → 3.7%.

**NFL pile reference** (Run Game's `pile.py`). Carrier forward speed by the
number of defenders within 1 yd is NFL-like (NFL / sim off):

| Defenders within 1 yd | 1 | 2 | 3+ |
|---|---|---|---|
| Median speed (yd/s) | 2.75 / 2.53 | 1.50 / 1.17 | 0.50 / 0.74 |

But piles form less often and later:

| | NFL | Sim off |
|---|---|---|
| Second defender arrives | 80% at 0.3 s | 68% at 0.4 s |
| Third defender arrives | 43% at 0.7 s | 28% at 1.1 s |

The pile brake is not too hard; rally timing (Defense) is late.

**Reading.**
- `WRAP_FOOT` lengthens finishes at the line, but it does so by making every
  secure leg wrap easier to step out of.
- Backfield wraps, after-catch tackles and sacks all move the wrong way, and the
  0..1 bin, which has the largest gap, does not move.
- The default coupling over-constrains some wraps, but `legs·secure` is not the
  missing law: it loosens all of them.
- What separates a contact at the line that ends falling forward from a
  backfield or open-field wrap that holds is still open. Candidates:
  - the front tackler's −2.5 yd/s drive (+0.3 yd at the line on the ablation);
  - the carrier's momentum into a front-on tackler.

Kept off; recorded as adverse.
