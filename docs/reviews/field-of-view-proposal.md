# Field of view: a design proposal (G10)

Flex, 2026-11-09. Main Engine's G10 queue, INFO-1 "player sight has no field of
view". **Nothing is built. This asks Tanner for a design call.**

## The seam

`PlaySim.see(observer, target)` returns every opponent's position on the
observer's reaction delay, projected along the target's velocity, wherever the
observer faces. Only the ball (`throw-sight.ts`), the QB's eyes and a carrier's
run keys model where a player looks.

## How much it is used

One captured whole game (seed 9, current base, 144 snaps). Opponent lookups after
the snap, with the bearing of the target relative to the observer's **body
facing**:

| Observer | Lookups (pass / run) | > 90° behind (pass / run) | > 120° behind (pass / run) |
|---|---|---|---|
| CB | 1.09 M / 0.61 M | 40% / 25% | 29% / 17% |
| S | 0.72 M / 0.45 M | 28% / 17% | 20% / 11% |
| LB | 0.62 M / 0.39 M | 32% / 27% | 22% / 20% |
| DL | 1.10 M / 0.84 M | 29% / 35% | 19% / 22% |
| OL | 0.23 M / 0.20 M | 20% / 23% | 9% / 14% |
| WR/TE | 0.31 M / 0.20 M | 42% / 26% | 23% / 13% |
| RB | 0.10 M / 0.10 M | 26% / 45% | 16% / 33% |
| QB | 0.20 M / 0.05 M | 7% / 66% | 3% / 52% |

The probe is `out/flex/fov-census.mts` on a scratch tree; it can be committed on
request.

A lookup is not a decision. Many are incidental scans. But a fifth to a third of
everything defenders know about opponents comes from behind their bodies, and
it costs nothing.

## Why not a body-facing cone

Per `CLAUDE.md`, body facing is not gaze. A corner in off-man faces the QB and
turns his head to check his man, and a defensive lineman feels a down block
before he sees it. A cone on body facing would replace free omniscience with
false blindness:
- corners losing receivers they would actually check;
- linemen blind to blocks they would feel.

## Options

1. **Last in-view sighting** (`KNOWN_PROBLEMS`' proposal). Outside a cone on
   body facing, a player keeps his last in-view sighting and projects it
   forward.
   - Cheap.
   - Ties gaze to body facing, which is the error above.
2. **Controller-chosen gaze with a head-turn budget.** Each controller names
   what it is watching: the QB, the man, a key, the ball.
   - The head turns toward it within a neck range (about ±90° of body facing)
     at a finite rate.
   - Everything inside a peripheral cone around the gaze is seen on the normal
     delay.
   - Outside it, the last sighting is projected forward, with uncertainty
     growing with time since the last look.
   - Touch keeps its own channel: a loaded hand or body contact gives the
     contact partner (`RUN_FEEL` and `PASS_FEEL` already do this).
   - This is the shape the QB's eyes and `throw-sight` already use.
3. **Option 2, staged by role.** Start where hidden information most plausibly
   changes outcomes and tracking can check it:
   - man coverage (looking back for the ball versus trailing the man);
   - backside pursuit (a defender running down the line can't see a cutback
     behind him);
   - run-defense DL against blocks from behind or the side: cracks, kick-outs
     and pullers.

## Recommendation

Option 2, staged as option 3, behind default-off flags, one role at a time:
1. **Backside pursuit first.** It is the largest plausible yardage effect
   (cutbacks) and the simplest gaze (the carrier).
2. **Man coverage second.** Coverage owns it, and it needs the head-turn
   "check" behavior.
3. **Line play last.** Touch covers most of it already.

Each stage gets a matched restage, the same-operator NFL comparison where one
exists, and before/after film of the changed decisions. Per the PLAN's seam
rule, the controllers keep their logic. Only what they can know changes.

## Decision needed

1. Is option 2 (controller gaze with a head-turn budget) the model, or option 1?
2. Approve stage 1, backside pursuit. Defense owns pursuit, so it would be a
   joint change: the gaze channel in `PlaySim.see` (engine) plus pursuit's gaze
   target (Defense).
