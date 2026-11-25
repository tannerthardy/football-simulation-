# Receivers in the quick game: route conversions as taught, cold read of route-read.ts, sources for the unsourced concepts, the Cover 3 curl-flat (2026-11-25)

Recorded by Integration from the outside reviewer's (Gemini) package, read against develop 9fd977772. Rows marked
**confirmed** were checked in code by Integration. Sources are the reviewer's, mostly tertiary sites; the owning lane
re-opens what it quotes before building on it.

## 1. Route conversions as taught

| Route | Converts? | Into what | What the receiver reads |
|---|---|---|---|
| Stick | Yes: sit against zone, break away against man | Zone: settle in the window facing the passer. Man: away from the defender's leverage (out if he is inside, back in if he is outside); some teach a speed out only. | The nearest underneath defender's **movement** (runs with him, or bumps him and drops off), his eyes and hips, and his leverage on the stem. |
| Spacing settle (spot, snag) | Yes | Zone: settle in open grass. Man: pivot back out, or post up the defender. | Whether the underneath defender trails him or drops. |
| Hitch | Against press or a squat corner only | A fade; against Cover 2, a hole route. Some keep it locked and let the passer move on. | Cushion under about 4 yd, or a corner squatting instead of backpedaling. |
| Slant | Tempo and angle, not the route | Zone: throttle in the window a backer left, or stay skinny away from the Mike. Man: a release to stack inside. | The underneath backer vacating; the Mike's depth; the corner's press or shade. |
| Quick out | Fixed in most quick games | Only in choice systems or against press or a cloud corner (go or fade). | The corner's press or squat. |
| Flat | Almost never | Tagged wheel or whip in rub and play-action versions only. | The slot defender going over or under the rub. |

How he tells man from zone, as quoted: "If a linebacker runs with you, it's man. If he bumps you and lets you go, it's
zone"; and eyes on the receiver with a square stance against eyes in the backfield with hips turned.

## 2. `src/sim/route-read.ts`

**The root finding, confirmed:** `RouteKeyPicture.vel` (line 10) is never read in the file. Every conversion (stick,
hook, seam read) is decided on where defenders stand.

| # | Where | What it tests | What it ignores | Staged case |
|---|---|---|---|---|
| 1 | `route-read.ts:44–48` (stick, hook) | Any seen defender within 4 yd of the break in depth and 5 yd across: he is the key, and unless the exit is capped the answer is "away". **Confirmed**, and it matches Rules' stage (12 of 12 "away" in Cover 2 and Cover 4). | Whether he is running with the receiver, sitting, dropping or widening; his leverage. | Stick vs Cover 3 with a hook defender standing 2 yd inside the break. |
| 2 | `route-read.ts:53–56` | The exit is capped if any defender stands in a box on the exit side. | Whether that man is leaving or arriving. | A flat defender running out of the box as the receiver reads. |
| 3 | `route-read.ts:63–67, 74–75` (seam read) | Roof men by position: none within 4 yd of the middle and one each side gives "post". | A safety rotating to the middle. | A two-high shell spinning to one-high at the snap. |
| 4 | `route-read.ts:70–73, 76–79` | A roof man within 4 yd across gives "under". | His depth change and direction. | A safety bailing out of the seam. |

**Margins.** The receiver himself reads once, on the tick he reaches the read depth (`receiver.ts:504`): a commitment,
but taken on one tick's positions against hard edges (4, 5, 3, 0.5 yd; the middle ±4; a 0.5 s picture age). The
passer's forecast of the same route (`receiver-forecast.ts:175–188`) re-reads every tick until it infers the
commitment, and clears its cached path whenever the answer differs. Integration's note: a lost look keeps the prior
answer there (line 183), so the age edge alone does not flip it; a defender crossing one of the position edges does.

## 3. Sources for the four concepts Rules recorded as gaps

| Concept | Status | Key and reaction as quoted |
|---|---|---|
| Double outs | **Found** (Sposato, 700 Quick Series, "Green 700 Double Outs") | Before the snap, the alignment and leverage of the defenders over the two inside receivers: a defender inside the A back, he is primary; both outside and tight, the backside quick slant; both off or inside, either; a blitz, the quick slant. The outside fade: the corner leaving him to sit in the flat. |
| Seam-slant | **Found, in an RPO setting only** (X&O Labs, Shackelford) | Inside backer, then the strong safety: the backer fits the run, read the safety; the safety pedals, the slant. The public text gives no reaction for a safety who squats or drives. |
| Hitch-out | None found | Checked Coverdale and Robinson (The Bunch Attack), Sposato, and public clinic material. |
| Trips outs | None found | Only youth flag material, with no key or reaction. |

## 4. The Cover 3 curl-flat against stick and flat

Taught in two phases: a drop back and out to a landmark (the top of the numbers at 12–14 yd in spot-drop teaching),
at the tempo of #2's release, staying low and inside to wall #2; then a hard rally to the flat on a trigger. The
trigger differs by teaching: the throw or the passer's shoulders (spot-drop and vision), or #2 out-leveraging him or
a fast #3 to the flat (Rip/Liz match). Against 3x1 in match versions the strong hook takes #3's stick. A defender who
hangs in the stick window makes the flat the coached throw.

Read with Coverage's census (NFL curl-flats widen at 1.6–1.8 yd/s from 1.5 to 3.0 s and sit 1.5–2 yd wider than ours
at every time): our nickel's 1.5 yd/s is not slow, and the passer's decline of the stick in that cell stands. The
open questions for Coverage are our start width and whether our curl-flat has the second phase (the rally on a
trigger he can see).
