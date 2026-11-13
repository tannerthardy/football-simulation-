# Is `leadBlock` real? (RAT-3 evidence)

Measurement only; nothing wired or tuned. Source: branch `claude/admiring-bell-t3ji19` on develop `b559fdc`
(engine SHA256 `0dea552c…`), Node v22.22.0 (`.nvmrc` 22.23.3). Report: `report.json`.

```sh
node --import tsx scripts/diag/rating-channel.ts          # about 3 s, writes out/rating-channel/report.json
```

## (a) Whole tree
`leadBlock` appears in: `src/players/types.ts` (key list), `generator.ts` (which archetypes draw it), `roles.ts` (weights of roles `FB_LEAD` ×3 and `TE_H` ×2),
`lab-app/public/app.js` (slider list), and as data in `config/roster-screen.json` and saved fixtures/patches. Nothing in `src/sim`, `src/game`, `src/physics`
reads it, by name or by the generic readers (`Agent.r(key)`, `roleInputValue`, `derivePhysical`, `QBMind`/`recognition` derivations: none takes a
rating by variable except `roles.ts:166` and `engagement.ts:150`, whose keys are literals). The derived body (`derivePhysical`) reads only
balance, elusiveness, routeRunning, passBlock, manCoverage, zoneCoverage, awareness, playRecognition, strength.
Same scan finds `touch` is also unread, and not even in role weights.

Selection does use it: with the roster-7 offense, the FB `OFF-FB1` (leadBlock 80) is picked at 99, and at 1 the I-form `F` slot goes to a TE (`OFF-TE1`):
`team.ts:195 at('FB')` → `overallAt` → `FB_LEAD`.

## (b) One diagnostic
Scene: `i_pro_21` `iz_strong` vs `cover3_buzz`, roster 7, play seed 1, same lineup and bodies; FB (`O:F`) has a `lead` plan on `D:LB_W`.
Only one rating of one player changes, 1 vs 99, command trace 0–3 s (60 steps, 0.05 s).

| Subject | Rating | Role | Capacity fields that differ | First consumed difference | Whole play identical |
|---|---|---|---|---|---|
| O:F | `leadBlock` | question | none | **none in 0–3 s** | **yes** |
| O:F | `runBlock` | obvious-duty control (same player, same duty, a rating the block code reads) | none | t=0.1 request `vel.x` 7.9845→7.9870 | no |
| O:F | `awareness` | mental timing | `reactionTime` 0.295→0.211 | t=0.2 observation age 0.25→0.20 s | no |
| O:F | `playRecognition` | mental timing | `reactionTime` 0.355→0.199 | t=0.2 observation age 0.25→0.20 s | no |
| D:LB_W | `playRecognition` | instrument control (his reaction time is derived from it) | `reactionTime` 0.331→0.175 | t=0.15 observation phase differs | no |
| D:LB_W | `awareness` | instrument control | `reactionTime` 0.268→0.184 | t=0.15 observation phase differs | no |

Reading it: the instrument sees a rating the code reads (`runBlock`, request-level) and the mental-timing channel (`awareness`/`playRecognition` reach the field through
`reactionTime`, which `PlaySim.see` uses as observation delay, so the first change is how old the FB's picture is). `leadBlock` produces no difference in what he consumed, requested, was
controlled to, or did, and the whole play result is identical. "Capacities held fixed" holds for `leadBlock` and `runBlock`; for `awareness`/`playRecognition` the only profile field that moves is
`reactionTime`, which *is* the mental-timing channel.

Limits: one scene, one player, one window. "Inactive" here does not mean inactive in every scene; the static scan (nothing names it) is what carries the claim.

## (c) RAT-3 classification (48 ratings)
| Class | Ratings |
|---|---|
| selection-only | `leadBlock` (FB/H-back pick via `FB_LEAD`, `TE_H`) |
| generated, unread (not even in role weights) | `touch` |
| affects execution, shown on the field in this scene | `runBlock` (request), `awareness` and `playRecognition` (observation delay via `reactionTime`) |
| inactive in this case | none of the tested ones other than `leadBlock` |
| unknown: named by sim code, not exercised in this scene | strength, stamina, balance, toughness, throwPower, accShort, accMid, accDeep, release, throwOnRun, pocketPresence, vision, elusiveness, breakTackle, ballSecurity, patience, routeRunning, releaseVsPress, hands, contestedCatch, ballTracking, passBlock, handTechnique, passRushPower, passRushFinesse, blockShedding, tackling, hitPower, pursuit, manCoverage, zoneCoverage, press, ballSkills, kickPower, kickAccuracy, puntPower, puntAccuracy, decisionMaking, composure, discipline, anticipation, consistency, workRate |

Each "unknown" has at least one consumer file (`report.json` → `consumers`); whether it reaches the field in play needs its own pair run on the player/duty that uses it.
Suggested RAT-3 edit: replace "`audit`: ratings 1/50/99 give identical commands" with this diagnostic (named command and scene), and add `touch`.
