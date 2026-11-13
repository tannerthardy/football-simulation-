# Native tackle-wait witness, v2 to v3

This is a retrospective mechanism audit of the six changed ordinary plays in
the fixed 32-case approach panel. It is not an NFL tackle-quality sample. Both
sources are immutable archives: v2 `66b5ce3e6ed1cbab4372cfe39e0ed19049fac26e586eae1007dfbd4c98801635`,
v3 `030e0f3fb252f4c63ecbb81c8c7544728a6c54b2fa91c5827689ea1fb6e7cdeb`.
The focused probe forwards existing visual queries without adding any,
captures the actual post-World/pre-selector boundary, and verifies full
observed/plain result, bodies, intents and next RNG. All 14 focused probe
executions pass. Exact tool and file receipts are in `wait-witness-receipts.json`.
The original frozen 32-case collector remains unchanged (`76f22c61…`).

## What changed

All six first acquisitions have exactly matched physical and command state
between v2/v3 immediately before the selector. All are upright and have no
active joint, latest-step body contact, engagement, support-foot attachment or
strike. The forecast is unavailable solely because the existing conservative
scope excludes any nonzero support lean. This is not a native demonstration of
reaching off an active block.

| Case | Defender | New acquisition | Residual lean, native force | Geometric quality | Acquired grip |
|---|---|---:|---:|---:|---:|
| R1 Inside Zone Over/R | DT_S | 2.75 s | 0.6523 | 0.2203 | 0.4847 |
| R1 Outside Zone Over/R | DE_S | 2.65 s | 98.6755 | 0.0765 | 0.4253 |
| R1 Duo Odd/R | LB_W | 2.85 s | 108.3291 | 0.4365 | 0.8332 |
| R1 Duo Odd/L | LB_M | 3.00 s | 7.4938 | 0.3168 | 0.5346 |
| R2 Inside Zone Over/R | DT_S | 2.30 s | 14.5465 | 0.1764 | 0.6398 |
| R2 Inside Zone Over/L | DT_W | 2.55 s | 0.5168 | 0.1220 | 0.3603 |

In v2, an unavailable held-command preview silently retains the ideal live
straight-line forecast. V3 requires an available preview before choosing to
wait. The physical force/strength law and contact geometry are unchanged.
Each of these earlier acquired holds subsequently carries positive solved
force. The inspection does not establish that every earlier grab is a better
football decision than keeping the feet moving.

## First ordinary fork: R1 Inside Zone Over/R

At 2.75 s (the 2.80 s post-World body boundary), DT_S is 1.457 yd from RB;
standing arm reach is 1.636 yd. He moves `(0.959,1.959)` yd/s and holds command
`(2.613,3.130)` yd/s, with push 1, posture 0.561 and facing 2.185 rad. Actual
runner velocity is `(5.764,-0.632)` yd/s. Residual support lean is only
0.6523 native force, load is zero, and his capture-point deviation is
`(0.0259,0.1768)` yd. The tiny residual lean, rather than an active constraint,
makes the one-body preview unavailable.

Both selectors consume the same existing 0.20 s-old runner sample, predicted
to `(40.117,25.361)` with stale velocity `(4.998,-0.326)`. The code dead-reckons
that picture one physics tick to the body boundary. The preview returns null,
so neither emits a `tackle-opportunity` decision. A lack of decision record
here does not mean the player obtained no observation.

The old perfect-current-motion fallback predicts quality 1 at 0.2235 s from
current quality 0.2203 and waits. V3 takes the present reach, creating grip
0.4847 and capacity 760.4 native force, initially with zero leg share. The
grasp is actually loaded at the next solve, endpoint 2.85 s, and slips at its
capacity. It has seven slipping steps and does not break. Body separation
falls from 1.457 to 1.218, 0.961 and 0.709 yd over the next three boundaries;
actual closing permits grip to grow under the unchanged update law. The
original form hold starts at 2.90 s, quality 0.5842/capacity 988.3, with eleven
slipping steps and no break. A later assist differs too.

Hindsight supports both descriptions: old waiting really reaches geometric
quality 0.9824 at 2.90 s; the earlier reach really establishes a bounded,
slipping hold and influences subsequent motion. V3 stops at 3.01 versus
3.49 offense yards, but that is not proof that the early grab is preferable.
This repair removes unsupported perfect information from a fallback;
it does not demonstrate improved athletic capacity or universally improved
tackle quality. The forecast's conservative all-lean exclusion remains
important scope debt, especially for the two sub-unit residual-lean cases.

## Retain adverse and neutral evidence

Across ordinary 16, initial geometric quality falls 0.7381 to 0.4994, mean
acquired grip 0.7398 to 0.6284, initial grips below the existing 0.55 locked-grip
behavior threshold rise 4 to 7, all created weak grips rise 8 to 9, and
slipping holds rise 15 to 17. Initial wraps/misses/contact fumbles and broken
holds are unchanged. These labels are native behavior distinctions, not
measured NFL labels. All four retained Split Zone and all twelve isolated
encounters are exactly unchanged from v2. Do not claim a new retained-TD
fix from the wait change, or discard weaker grabs merely because their
geometric label is lower.

Next useful evidence is an actual constrained native reach versus a physically
attainable delayed-picture wait, rather than tuning grip strength to regain
yards. Use the broad root-owned ordinary/game guards before promotion.
