# Effort as the receiver's role in the declared plan (design note, 2026-11-15)

Rules + Coaching, for Integration. Design only: nothing here is built. This note sits behind the release work.

## Why now

- **The route package as an arm on the card** (ROUTE_EFFORT + PLAN_ROLES + ROUTE_FINISH, seeds 11 / 23, Integration 2026-11-15):
  - completion −3.8 / −2.3;
  - yards per attempt −0.51 / −0.54;
  - 20+ yd completions −1.6 / −1.7.
- It gains in staged play and loses in games.
- **Tools' go measurement:** capacity matches the NFL's, and the NFL median runs under capacity late in the down.
- ROUTE_EFFORT sets every route's stem to effort 1, everyone and all down long. The NFL's receivers don't run that way.
- Before ROUTE_EFFORT, the per-family constants (0.78-0.94, 2026-10-08 movement calibration) were also under capacity. They had no coached reason, and nothing chose them from the play.

## What the sources say

Tags: **page** = checked against the page; **snippet** = search summary only, check before quoting further.

- **Coaches teach full speed as the rule, and selling as the reason.**
  - "Routes must be ran at full speed" (route-effort review, 2026-11-14).
  - A go route's receiver "should always be trying his hardest to get open -- whether he's serving as a decoy or the primary receiving target" (snippet; route explainer).
  - The clear-out "has to go DEEPER than your money route", and "the deep receiver is a bodyguard" for the route underneath (snippet).
  - "The Y must get his depth and sell a vertical route" (Coiner, PlaybookTech, Teach Receiver Tempo; page).
- **Coaches also teach tempo, from the coverage he sees.**
  - Against man, "staying on the move with speed is the correct thing". Against zone, "a good receiver will come across with a little pace ... so he does not run out of the opening" (Coiner; page).
  - Speed cut against zone: "tempo his speed and settle right in the DBs hip pocket before breaking" (USA Football, The Speed Cut; snippet).
  - Tight break: not a route for "maximum speed unless he can maintain his efficiency in the break area" (USA Football, The Tight Break; snippet; the page timed out).
  - Speed work: "controlled and relaxed on the way in, fast on the way out" (Gifford, SimpliFaster; snippet).
- **What players do: effort follows the player's own reading of his role.**
  - All-22 of George Pickens, 2024: "When he was part of Fields' core progression, Pickens ran his routes hard, and when he didn't expect the ball to be thrown his way he jogged through his routes" (Steelers Depot; snippet; the page refused the fetch).
  - Aikman on lazy Cowboys route running: it made quarterbacking harder because routes were not run as expected (PFT; snippet).
  - Coaches criticise this. It still happens, and it costs the play: the defender reads it, and the quarterback cannot trust the timing.

## The model this suggests

Effort is the receiver's intent, chosen by the player from what he knows and sees, not a per-family constant and not a flat 1.
- **What he knows.** The call is his to know: his route, his role in the concept (clear-out, the high or low of a key, a progression number, the backside alert), and the timing the play is installed with. That is coached knowledge, not another player's private assignment.
- **What he sees.** The coverage he is reading (man or zone, from his own picture, as ROUTE_END already reads it), whether the ball is gone and where, and the quarterback when he looks at him. The quarterback's body facing is not his gaze.

**By role** (the coached intent; execution and freedom follow below):

| role | coached intent | what changes it |
|---|---|---|
| clear-out (declared, PLAN_ROLES) | full pace until his defender must carry him, then stay deeper than the money route | the defender passes him off or turns his back: the sell has done its job |
| a key's high or low, early progression | full pace through the stem, burst out of the break (ROUTE_EFFORT's break table) | zone seen: tempo into the window and settle (ROUTE_END's window); man: stay on the move |
| late progression or backside alert | the coach's rule is still full pace | the player's own freedom (next section) |
| ball thrown elsewhere (observable) | not a route any more: block or pursue | already its own behaviour |

**Execution and freedom: never ban, never script.**
- Coaches demand full speed from every role. The player decides how much of that he gives.
- The model should give that decision a cost and a benefit, not a script.
  - **Cost of full pace:** energy and fatigue, already in the body (`fatigueFactor`); late in a drive it is real.
  - **Benefit:** the defender reads his speed. Our coverage reads velocity (`reads.ts` release classes, the Topper's "still climbing past 8 yd"), so a clear-out that eases is passed off sooner. That emerges, and is not authored.
  - **The quarterback:** his forecast uses the route law (`receiver-forecast.ts`). A receiver who eases off what the forecast assumes costs the timing throw. That is Aikman's point, and it should emerge too.
- **What the player uses to decide:** his role and the time since his read in the installed timing (he knows both), the ball, and the coverage he sees.
- **Who decides differently:** a player trait could set how much the late roles ease (none exists today; `routeRunning` is technique, not effort). Adding one is a roster decision for Integration, not part of this note.
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
  - If it is ROUTE_EFFORT, check where the throws change: the timing throw to a late role, or the clear-out not passed off.

## Open

- Whether the coverage's read of a receiver's speed is strong enough for an eased clear-out to cost anything. If it never does, the model has no reason to keep him running, and the right repair is in coverage, not in the receiver.
- The quarterback's side: whether his forecast should use the receiver's tendency or the coached route. The coached route is the installed timing, and that is what the QB is taught.
- The snippet-only sources above need checking in a browser before they are quoted again.

## Sources

- Charlie Coiner, "Teach Receiver Tempo", PlaybookTech First Down, 2021-08-06 (page): https://firstdown.playbooktech.com/coaches-community/teach-receiver-tempo
- USA Football, "Coaching the Wide Receiver - The Speed Cut" (snippet): https://blogs.usafootball.com/blog/7085/coaching-the-wide-receiver-the-speed-cut
- USA Football, "Coaching the Wide Receiver - The Tight Break" (snippet; timed out): https://blogs.usafootball.com/blog/7066/blank
- Steelers Depot, Pickens effort piece, 2024-10 (snippet; 403): https://steelersdepot.com/2024/10/george-pickens-dismisses-questions-about-effort-i-wouldnt-be-able-to-get-past-dbs-running-go-balls-if-i-was-actually-lazy
- PFT, Aikman on Cowboys receivers' route running (snippet): https://www.nbcsports.com/nfl/profootballtalk/rumor-mill/news/troy-aikman-calls-cowboys-wide-receivers-lazy-in-criticism-of-their-route-running
- SimpliFaster, Gifford on coaching speed (snippet): https://simplifaster.com/?p=44178
- Taylor Kolste, "WR Play: the art of route running" (page; speed cut and speed release only): https://rileykolstefootball.com/2018/05/18/wr-play-the-art-of-route-running/
