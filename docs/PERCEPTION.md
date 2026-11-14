# Perception: what a player sees of an opponent

A reference for how the engine's pictures work, so lanes stop rediscovering it. Written 2026-11-13 from the code
(`src/sim/playsim.ts` `see`, `src/sim/perception.ts` `perceive`, `src/sim/mind.ts` `observationDelay`,
`src/sim/qbmind.ts` `estimate` and its look). It describes what exists. It is not a design: changes to it are shared
perception with about 200 consumers and need Integration's read first (see [KNOWN_PROBLEMS](KNOWN_PROBLEMS.md)).

## The picture is a delayed sample

`see(observer, target)` returns one recorded sample of the target from `delay` seconds ago:

    delay = reactionTime + 0.12·(1 − focus) + 0.06·stress·(1 − composure)
    reactionTime = clamp(0.4 − 0.24·recognition, 0.14, 0.42)      (players/physical.ts)

- **Typical delay:** 0.25–0.35 s. It runs from about 0.16 s (elite recognition, focused) to about 0.5 s (poor
  recognition, unfocused).
- **Teammates** are seen at a fixed 0.05 s.
- **Additions:** `eyes.peripheral` for a target that is not one of the observer's keys, and +0.15 s for an off-key target
  while the observer reads run.
- **Out of view (GAZE):** the observer gets a remembered picture, which ages and decays.

## Position is extrapolated, velocity is held

The picture's position is the delayed position plus the delayed velocity × delay. Its velocity is the delayed velocity,
unchanged.

- **Steady motion:** both are right.
- **Acceleration a:** the position is off by about ½·a·delay² (small: 0.2–0.3 yd for a blitzer), but the velocity is short
  by a·delay.
- **From a standing start:** the perceived velocity is 0 for one whole delay after he starts.
- **The pattern:** any read keyed on a perceived velocity, at the moment of a start, cut or plant, is late by about the
  delay. Reads keyed on position change are not.

## No distance or looming term

The delay does not depend on distance or on whether the target is closing on the observer. A rusher coming straight at
the quarterback from 4 yd and a crosser 30 yd away are seen with the same latency. Human onset detection for a looming
body a few yards off is about 0.15–0.25 s, and gets faster as time to contact shrinks.

## The quarterback's look: periphery ×1.7

The QB's memory of each defender is refreshed by his look (`qbmind.ts`, about line 395):

| Where the defender is | What the QB's memory takes |
|---|---|
| In his clear look: within `clearHalf·(0.65 + 0.35·focus)` of his gaze (`clearHalf` = 0.33 + 0.22·vision rad, about 19–31°), **or within 3 yd** (felt, not seen) | the plain `see()` |
| In his periphery: within `periphHalf·(0.85 + 0.15·focus)` | `see(…, 1.7)`, at 1.7× the delay, stamped 0.1 s older |
| Outside both | `estimate()` extrapolates the old memory; its velocity decays to zero over ages 0.2–1.2 s |

- **The cones are purely angular about his gaze.** A rusher 3–5 yd away at a given angle gets the same 1.7× as a safety
  25 yd away at that angle.
- **His pressure picture is separate:** `felt()` is `see()` at 1× in front and up to 2.2× behind his shoulder, by pocket
  presence, independent of gaze.

## Measured

Free blitzers on our blitzes, from the QB's gaze memory (`scripts/diag/eyes/free-rusher.ts`):

| | 0.4 s | 0.6 s | 0.8 s | 1.0 s |
|---|---|---|---|---|
| True closing speed | 1.8 | 2.7 | 3.6 | 4.3 yd/s |
| Believed | 0.0 | 0.9 | 1.8 | 2.8 yd/s |
| Position error | 0.2 | 0.3 | 0.2 | 0.2 yd |

## Who consumes a perceived velocity

Counted uses of a perceived or estimated `.vel`: blocking 66, defense 52, the QB 21, run fits 13, engagement 11, coverage
leverage 8, called motion 8, common 8, and catch and collection approach, tackle windows, live gaps, receivers and
carriers. That covers pursuit forecasts, coverage breaks, the QB's windows and pressure, blockers' set and punch, and run
keys.
