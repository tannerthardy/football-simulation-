# The body that goes down at speed: slide, then rise (Integration/Defense, 2026-11-18)

Base develop bcb27ea1. Measurement and a proposal; nothing built.

## Mechanism (src/physics/world.ts, `passive()` and the passive branch of the ground force)
- `falling`: ground friction FALL_FRICTION 0.25 g (2.7 yd/s²) plus FALL_TIP, for `fallTime` (about 0.4 s). Then `down`.
- `down`: friction DOWN_FRICTION 0.75 g (8.05 yd/s², g = 10.73 yd/s²) on the whole body, translation and spin sharing one allowance. He goes to `rising` only when his speed is under 0.3 yd/s **and** he has been down 0.3 s.
- `rising`: the same 0.75 g friction, for `getUp` (0.6-1.4 s from agility and weight, 0.9 s default), then `up` with the capture-point deviation reset to zero.
- So the time off his feet is fall 0.4 + max(0.3, (v - 0.3) / 8.05) + getUp. A body going down at 8 yd/s waits about 0.96 s to start a rise whose own friction would stop it in 0.9 s anyway. FALL_FRICTION, DOWN_FRICTION and FALL_TIP are unsourced (as the HANG notes say); I did not change them.

## How often (8 ordinary games, seeds 7-14, Ironmen v Comets 0.55, 2,296 play sims, 2,023 off-feet episodes; `scripts/diag/body/down-slide.ts`)
- Defender episodes that reached `down`: 858, of which 426 are dives (the rest contact). Speed when he goes down: dives p50 3.6, p75 5.2, p90 6.7, max 9.4 yd/s; contact falls p50 1.2, p90 3.1.
- Slide (time in `down` before `rising`) by speed going down: under 1 yd/s 0.30 s; 1-2 0.30; 2-3 0.35; 3-4 0.45; 4-6 0.60; 6 and over 1.0 s (the law gives 0.9). Of 115 dives that went down at 5 yd/s or more, 17 rose before the whistle (slide median 0.9 s); the rest were still down when the play ended.
- Every completed defender episode is over 1.5 s off his feet (233 of 242; median 1.7, p90 2.0): the floor is fall 0.4 + the 0.3 s minimum + 0.9 rise = 1.6 s, with or without a slide. That is the gate's cost for every fall, not only dives.
- Cost of waiting for the slide to end, against rising as soon as he is down: dives that rose before the whistle (72) were up a median 0.46 s later (p90 1.08). With the play still live at the moment he would have been up (down time + getUp): 35 dives were up more than 0.3 s late and 66 more were still down at the whistle, 101 of 426 (24%, 12.6 per game), median 0.33 s of play left (p75 0.66). For all defender falls 317 of 858 (37%, median 0.24 s left): mostly contact falls held by the 0.3 s minimum.

## Proposal, from the body (no timer shortened)
A body that is rising is still sliding under the same 0.75 g, so it reaches its feet at `v_up = max(0, v - 0.75 g x getUp)` (8 yd/s going down gives 0.75 yd/s up after 0.9 s). What stops a real player coming up while moving is that his feet cannot take load while they slide faster than he can plant them; the engine's own number for that is PLANT_SPEED, 2.5 yd/s ("below this he has planted and can square to a new heading", kinematics.ts). So:
1. The `down` to `rising` gate becomes **predicted speed at stand-up at most PLANT_SPEED** (v - 0.75 g x getUp <= 2.5), in place of "current speed under 0.3". Any dive up to about 9.7 yd/s starts rising when the fall ends; only a body faster than that waits for the slide.
2. The 0.3 s minimum in `down` stays as the time to stop his spin and settle (his spin must be under the same small bound), so the shortest off-feet time is 0.4 + 0.3 + 0.9 = 1.6 s as now, and the slide stops adding to it.
3. He still slides the same distance (the friction is unchanged), so a diver at 8 yd/s travels v^2 / (2 x 8.05) = 4 yd either way; only the time he is off his feet changes (about 1 s less at 8 yd/s, 0.3 s at 4 yd/s).
No friction or timer is tuned; the rule is the same friction and the engine's own planted-speed threshold.

**Keeping a ball carrier apart.** The whistle and the spot come from the tackle and down-by-contact logic (carrier.ts and the tackle bond), not from the `rising` transition, and a held body is held by its tacklers. The new gate applies only to a free body: no hold on his legs (`feetLock` zero, no engagement or tackle bond), not the ball carrier, and the contact that felled him over. A tackled carrier keeps today's gate and slides to rest for the whistle; a diver who missed is free and rises on the body's terms.

## Test plan when built (flag off, `DOWN_RISE_PLANT`)
Lone body at 4, 6, 8, 9.5 yd/s going down: off-feet time and slide distance, flag off (identical to today) and on (distance equal, time shorter by the slide); a held body and a carrier (unchanged, byte-identical); then the 8-game count above with the play still live at the stand-up.
