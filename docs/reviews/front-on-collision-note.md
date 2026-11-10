# Front-on collision: design note (Flex, 2026-11-10)

**No code yet. This asks Tanner which mechanism to test first.**

## The gap

After a front-on first contact, an NFL runner keeps going and a sim runner
stops. The operators are the same on both sources (`run-operators/`):

| Front-on first contact, median gain to the end | <3 yd/s | 3–5 | 5+ |
|---|---|---|---|
| NFL, blocked hitter | +1.03 | +2.43 | +3.31 |
| Sim, blocked hitter (run-ref-3) | +0.90 | +0.89 | +0.82 |

- **The hitter mix matches.** Blocked / shed / free is NFL 69 / 16 / 15
  against sim 67 / 16 / 16.
- **The contact length matches** (`blockedhit.py`): 1.5 s on the NFL against
  1.4 s in the sim.
- **NFL runners gain more even with more help arriving:** the second defender
  comes on 94% of NFL contacts against 78% in the sim.
- **An NFL front-on contact is a moving pile.** Its gain grows with the
  runner's speed; the sim's does not.

## What happens in the sim

In the 0.3 s after the hit (162 front-on contacts on matched zone runs,
run-ref-4):

- **Request:** the runner keeps asking for about 3.9 yd/s downfield the whole
  time.
- **The first 0.1 s:** his speed falls 3.5 → 1.4 yd/s. That is exactly the
  inelastic common velocity of two whole-body point masses
  (96 kg runner, 117 kg hitter median).
- **The momentum change:** −236 kg·yd/s from torso contact, −6 from the
  arms, +52 from his own feet.
- **The fall:** his capture point jumps behind his base (0.9 → 1.3 yd), and
  29–37% are off their feet within 0.3–0.5 s, most falling back or down.
- **Ruled out:**
  - the carrier's request;
  - his leg drive: the bond already sets `push` and his lean is active, and an
    explicit push (`CARRIER_DRIVE`) changed nothing;
  - Run Game's brace (`CARRIER_BRACE`): it helps a little and overshoots whole
    runs.

## Candidate mechanisms, simplest first

1. **Effective mass at first contact.** Today a front-on hit exchanges
   momentum with the whole body at once.
   - In a real hit the contact checks the part of the body it touches. The
     rest (hips, legs) keeps going and is slowed only through the joints and
     feet over the next steps.
   - Biomechanics measures this as an "effective mass" at the contact point,
     well below body mass for a compliant body.
   - **Model:** the first exchange couples an effective share of each body's
     mass, from its posture and the contact height. The remainder carries on
     and becomes forward pitch through the existing support model.
   - **Prediction:** the runner keeps more speed in the first 0.1 s and falls
     *forward* over the hitter more often. The gain rises with approach speed,
     as on the NFL.
   - **Risk:** this is the deepest change. It alters every body collision,
     blocks included.
2. **Load height against the carrier's COM.**
   - My earlier trace (`docs/reviews/tackle-finish-length.md`) found 84% of
     front-on contacts land above the runner's COM, which pitches him
     backward.
   - A runner who lowers his pads takes the load at or below his COM, and the
     same deceleration pitches him forward.
   - **Model:** the contact height comes from both bodies' pad heights and
     postures, as now. Test whether the pad-height map puts a running back's
     pads too high, or a tackler's too low.
   - **Prediction:** a narrower effect, mostly on the fall direction.
3. **Contact duration (compliance).** Today the torso contact is a 9 Hz,
   critically damped spring, which exchanges momentum within about 0.05 s.
   - A softer contact spreads it over the 0.1–0.2 s of a real collision, so
     both players' feet act during it.
   - **Prediction:** a small effect on its own. The momentum exchanged is the
     same; only the feet's share changes.

## How each is judged

- **The same reproducer for every arm:**
  - the 162 front-on in-game contacts;
  - `hitterback-split.py` and `blockedhit.py` against the NFL runs above;
  - the 1-v-1 tackle panel's front-on cells.
- **New NFL check, written before testing any arm:** the runner's speed at
  +0.1 and +0.3 s after a front-on contact, from the same operator. This says
  directly how much speed NFL runners keep through the first exchange.
- **Unaffected controls:**
  - side/rear contacts (already near the NFL: +1.8–2.5 yd);
  - the push contest of an engaged block;
  - the panel's rear and side cells.
- **Whole-run check:** `npm run ref:report` (fixed 1,321 runs), paired.
- **Off by default** behind a flag, with two attempts before re-diagnosing.

## Decision needed

Which mechanism first?

My recommendation is **2 (load height), then 1**:
- Load height is narrow and uses existing geometry. The fall direction is
  already a visible repeated failure (runners falling back or down after a
  front-on hit).
- Effective mass is the more complete physics but changes every collision.
  It should come only if load height and the NFL speed check leave the
  first-0.1 s loss unexplained.
