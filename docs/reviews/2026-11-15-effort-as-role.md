# Effort as the receiver's role in the declared plan (design note, 2026-11-15; withdrawn for WRs, see the result)

Rules + Coaching, for Integration. Design only: nothing here is built.

## Result (2026-11-15): the premise is not supported for wide receivers

Tools measured the NFL against this note's premise. Source: `scripts/diag/route-speed/nfl_effort.py` and
`sim_effort.ts` on `claude/route-speed-diag`.
- **Operator:** speed with the ball held, as a share of the receiver's own top-decile speed.
- **Data:** BDB 2025 weeks 1–9, drop-backs, charted man / zone.

| question | NFL |
|---|---|
| targeted vs not, WRs | no difference: 0.88 vs 0.89 at 2.0–2.5 s; 0.91 vs 0.90 at 2.5–3.0 s |
| targeted vs not, TEs | not targeted ease 0.04–0.08 late |
| targeted vs not, RBs | not separable |
| man vs zone | 0.03–0.04 apart |
| time since the snap | the ramp dominates: 0.33 → 0.63 → 0.79 → 0.88, then a 0.89–0.91 plateau |
| breaking routes | cruise only 0.71–0.83 of top (0.9 on gos); braking from 0.7–0.8 s / 2.6–3.1 yd before the vertex |

**What this means:**
- The NFL median sits under capacity because of the acceleration ramp and the tempo into breaks: route structure, not effort by role.
- Effort by role, as scoped below, does not show for WRs. It is not built. The model, role table and named case below are kept as the record of what was proposed and why. They are not a plan.
- **What the data does support is narrower:**
  - **Stem tempo on breaking routes.** Ours is already close: not-targeted man 0.74 / zone 0.89, NFL 0.71 / 0.83. It is the same plan as the break's entry speed (see the model below), and so a route-table item, not an effort mechanism.
  - **A small late ease for TEs** who are not the target: 0.04–0.08, too small to build now.
- **ROUTE_EFFORT:** keep its break table's `s` column as a route-table item, measured break by break against the NFL's entry speed. Its other half, every stem at effort 1, has no support here and can be retired. ROUTE_FILLET already carries the cut / roll column on develop.
  - One exception: if the staged window-settle read shows a zone window run through at full pace, the stem half has a case. That read has not been made.
- **The larger finding** in the same table is the QB lane's, not this note's (Integration has sent it on). Our targeted receiver has slowed to 0.77 / 0.68 / 0.45 of his top speed at 2.0 / 2.5–3.0 / 3.5 s before the throw, where the NFL's is still at 0.88–0.91. Our QB throws to receivers who have already settled.

## Why it was proposed

- **The route package as an arm on the card** (ROUTE_EFFORT + PLAN_ROLES + ROUTE_FINISH, seeds 11 / 23, Integration 2026-11-15):
  - completion −3.8 / −2.3;
  - yards per attempt −0.51 / −0.54;
  - 20+ yd completions −1.6 / −1.7.
- It gains in staged play and loses in games.
- **Tools' go measurement:** capacity matches the NFL's, and the NFL median runs under capacity late in the down.
- ROUTE_EFFORT sets every route's stem to effort 1, everyone and all down long. The NFL's receivers don't run that way.
- Before ROUTE_EFFORT, the per-family constants (0.78-0.94, 2026-10-08 movement calibration) were also under capacity. They had no coached reason, and nothing chose them from the play.

## What the sources say

Tags: **page** = checked against the page; **unverified** = the page could not be retrieved, so the point is paraphrased and not cited for the build.

**1. Speed control against the coverage he sees (the common case).** This is not less effort: it is the speed he chooses for what the coverage lets him do.
- Coiner (PlaybookTech, Teach Receiver Tempo, 2021; page):
  - against man, "staying on the move with speed is the correct thing";
  - against zone, "a good receiver will come across with a little pace" so "he does not run out of the opening".
- USA Football's receiver series (unverified: the pages timed out): against zone the speed cut is tempoed so he settles in the defender's hip pocket before breaking; a tight break is not run at maximum speed unless he keeps his efficiency in the break.

**2. Selling the route.**
- "The Y must get his depth and sell a vertical route" (Coiner; page).
- A clear-out runs deeper than the route it clears for (route explainers; unverified, general).

**3. Effort on a late or backside role.** Full speed is the coaches' rule. Players don't always give it.
- Aikman on the Cowboys' receivers: "As a quarterback, if you're not certain where guys are going to be consistently, it's hard to play the position" (PFT, Charean Williams, 2024-10-17; page).
- Pickens, October 2024: reporting described him jogging on some routes, and Tomlin said his effort was not in question. One film piece (Steelers Depot, unverified: 403) is reported to say his effort followed whether he was in the progression.
- Small and optional: see the role table.

## The model this suggests

Effort is the receiver's intent, chosen by the player from what he knows and sees, not a per-family constant and not a flat 1.
- **What he knows.** The call is his to know: his route, his role in the concept (clear-out, the high or low of a key, a progression number, the backside alert), and the timing the play is installed with. That is coached knowledge, not another player's private assignment.
- **What he sees.** The coverage he is reading (man or zone, from his own picture, as ROUTE_END already reads it), whether the ball is gone and where, and the quarterback when he looks at him. The quarterback's body facing is not his gaze.

**Speed control first.** The common case is row 2 of the table below, and it carries the first build:
- He stays on the move against man.
- He comes into a zone window with a little pace and settles in it (ROUTE_END's window).
- He comes into a break under control and goes out of it fast.

**The stem's tempo and the break's entry are one decision:** the speed he can carry into the cut he has to make.
- The break's type (a plant or a rolled bend) and his body set that speed. ROUTE_EFFORT's break table declares it per route point, and ROUTE_FILLET's planned entry (`speedAfter`, `lateralEnvelope`) computes it.
- The stem's pace then follows from it: he runs the stem at the pace from which he can still slow to that entry speed by the vertex, and no faster.
- So the stem's effort is not a second number beside the break table. It is the same plan read backwards from the cut.
- Tools' plant-brake row shows the cost today: ours arrive at the vertex too fast and short of it (1.5 yd out at 2.5 yd/s, against the NFL's 0.5 yd at 1.4). A stem paced to the cut is what fixes that.
- Against zone, the "cut" is the window: the speed he can stop at inside the opening.
- Against man, it is the break he wins on.

**By role** (the coached intent; execution and freedom follow below):

| role | coached intent | what changes it |
|---|---|---|
| clear-out (declared, PLAN_ROLES) | full pace until his defender must carry him, then stay deeper than the money route | the defender passes him off or turns his back: the sell has done its job |
| a key's high or low, early progression | full pace through the stem, burst out of the break (ROUTE_EFFORT's break table) | zone seen: tempo into the window and settle (ROUTE_END's window); man: stay on the move |
| late progression or backside alert (small, optional tail) | the coach's rule is still full pace | the player's own freedom (next section); not in the first build |
| ball thrown elsewhere (observable) | not a route any more: block or pursue | already its own behaviour |

**Execution and freedom: never ban, never script.**
- Coaches demand full speed from every role. The player decides how much of that he gives.
- The model should give that decision a cost and a benefit, not a script.
  - **Cost of full pace:** energy and fatigue, already in the body (`fatigueFactor`); late in a drive it is real.
  - **Benefit:** the defender reads his speed. Our coverage reads velocity (`reads.ts` release classes, the Topper's "still climbing past 8 yd"), so a clear-out that eases is passed off sooner. That emerges, and is not authored.
  - **The quarterback:** his forecast uses the route law (`receiver-forecast.ts`). A receiver who eases off what the forecast assumes costs the timing throw. That is Aikman's point, and it should emerge too.
- **What the player uses to decide:** his role and the time since his read in the installed timing (he knows both), the ball, and the coverage he sees.
- **Who decides differently:** a player trait could set how much the late roles ease (none exists today; `routeRunning` is technique, not effort). It is left out of the first build. It is a roster decision, and Integration is putting it to the user once the mechanism exists.
- **What must not happen:** no role is capped below what works. If easing off on the backside never pays, the player keeps running.

## Named case: the tight end releasing inside past an end

The mesh play: gun_doubles_11 mesh, cover 1, seed 2, roster 19.
- The mesh_under Y lines up 1.06 yd off the ball. The end is 1.1 yd outside him and rushes inside across his face from 0.4-0.6 s. They meet at 0.9 s.
- The receiver has the end in his picture throughout (0.06-0.30 yd error, 0.25 s old). He cannot act on the end's rush before about 0.85 s.
- On develop Y is at 2.3 yd/s at the contact, still coming out of his stance. That is football.
- Under ROUTE_EFFORT his ask is a full-pace stem through it.
- He knows the call: his release is inside, past an end aligned on him, so he goes through traffic in the first second. The coached intent there is a release, not a sprint: get through clean, then run.
- So the role model's effort follows what the release asks for, and the stem's full pace starts once he is clear.
- The test is this play: no full-pace ask in the first second through the end, then full pace on the stem.

## Measure before building

Each item needs the operator checked on a few plays first:
- **NFL route speed by role** (BDB 2025, ball held): targeted vs not; within a concept's declared roles where the concept is identifiable; early vs late in the down.
  - Strong evidence: direct speed and targeting.
  - Weaker: role and concept inferred from tracking.
  - This is Tools' go measurement, split by role.
- **The same split on the sim:** off (per-family constants), on (ROUTE_EFFORT), and the role model, if built.
- **The package split in games** (next item for me): which of ROUTE_EFFORT / PLAN_ROLES / ROUTE_FINISH carries the completion drop.
  - If it is ROUTE_EFFORT, check two places where the throws change:
    - zone windows run through at full pace (Coiner's point);
    - timing throws to routes that arrive early.
- **NFL split** (Tools, asked by Integration): route speed with the ball held, by targeted or not, man or zone, early or late in the down, and into the break. The same operator runs on ours, off and with ROUTE_EFFORT.

## Open

- Whether the coverage's read of a receiver's speed is strong enough for an eased clear-out to cost anything. If it never does, the model has no reason to keep him running, and the right repair is in coverage, not in the receiver.
- The quarterback's side, decided (Integration): his forecast uses the coached route and installed timing, not the receiver's tendency. A receiver who eases off it costs the timing throw.
- The unverified sources above need checking in a browser before the build cites them.

## Sources

- Charlie Coiner, "Teach Receiver Tempo", PlaybookTech First Down, 2021-08-06 (page): https://firstdown.playbooktech.com/coaches-community/teach-receiver-tempo
- Charean Williams, "Troy Aikman calls Cowboys wide receivers lazy in criticism of their route running", PFT, 2024-10-17 (page): https://www.nbcsports.com/nfl/profootballtalk/rumor-mill/news/troy-aikman-calls-cowboys-wide-receivers-lazy-in-criticism-of-their-route-running
- Taylor Kolste, "WR Play: the art of route running" (page; speed cut and speed release only): https://rileykolstefootball.com/2018/05/18/wr-play-the-art-of-route-running/
- USA Football, "The Speed Cut" and "The Tight Break" (unverified; timed out): https://blogs.usafootball.com/blog/7085/coaching-the-wide-receiver-the-speed-cut, https://blogs.usafootball.com/blog/7066/blank
- Steelers Depot, Pickens effort piece, 2024-10 (unverified; 403): https://steelersdepot.com/2024/10/george-pickens-dismisses-questions-about-effort-i-wouldnt-be-able-to-get-past-dbs-running-go-balls-if-i-was-actually-lazy
- Tomlin on Pickens' effort, ESPN, 2024-10 (search result; not fetched): https://global.espn.com/nfl/story/_/id/41683856/steelers-tomlin-says-question-george-pickens-effort
