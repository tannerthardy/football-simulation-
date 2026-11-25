# FLIGHT_BREAK alone on the open census (coverage/C14-flight-break, a771ec841, base develop 7689bc4e7)

Tools/Physics, 2026-11-24, for Coverage (and Integration). The same 24 games and operators as the census, two arms of the branch: `FLIGHT_BREAK=0` and the default (on). Each arm is its own draw (plays diverge), not a paired test. Tables: `data/reviews/census/flight-break-census.md`; `outcomes.mts` for the per-throw table.

1. **FLIGHT_BREAK alone does not over-close the 10-15 yd window.** Wide-open share of receiver-moments, fixed | release, off -> on (NFL): Cover 2 .484 | .321 -> .420 | .303 (NFL .177 | .188); Cover 6 .235 | .233 -> .329 | .250 (NFL .096 | .097). Cells n 152-382; the Cover 6 fixed rise (+.09, n 255-272) is about three standard errors of a share near .3 and the rest are inside one. So the package's .057-.079 came from SQUAT_SINK (the sink's hole depth, as Coverage said), not from FLIGHT_BREAK.
2. **Aggregate wide-open:** dropbacks with a wide-open receiver at the release off | on .378 | .368 (NFL .338); at any fixed time .553 | .547 (NFL .550). By family at the release (dropbacks with a wide-open receiver, off -> on): Cover-2 0.620 -> 0.609; Cover-6 0.511 -> 0.569; Cover-3 0.398 -> 0.378; Cover-1 0.087 -> 0.076; Quarters 0.466 -> 0.440 (NFL Cover 2 .530, Cover 6 .418, Cover 3 .409, Cover 1 .098, Quarters .404).
3. **Corner on top / level / trailing at #1's break**, off -> on (n): Cover 2 .15/.04/.81 (110) -> .08/.17/.75 (130) (NFL .40/.23/.36); Cover 6 .14/.11/.75 (57) -> .25/.12/.63 (57) (NFL .40/.20/.40); Cover 3 .51/.16/.34 (95) -> .49/.09/.42 (108) (NFL .51/.09/.39); Cover 1 .38/.42/.20 -> .33/.55/.12 (NFL .59/.26/.15); Quarters .57/.07/.36 (42) -> .50/.04/.46 (28) (NFL .53/.12/.35). The Cover 2 and 6 corner is still trailing (.75-.81, .63-.75) with FLIGHT_BREAK alone: the sink is what the package changed. Distance at the break p50: Cover 2 3.2 -> 3.0, Cover 6 3.3 -> 3.8 (NFL 4.2 and 5.3).
4. **Per throw** (completions, incompletions, breakups, interceptions; sacks and scrambles out), off -> on: all families 1,970 -> 1,883 throws: completion .761 -> .742, incompletion .138 -> .143, PBU .083 -> .097 (163 -> 182), INT .018 -> .018. By family PBU per throw: Cover 2 .074 -> .081, Cover 6 .062 -> .103 (13 -> 21), Cover 3 .071 -> .078, Cover 1 .107 -> .132, Quarters .086 -> .078; INT: Cover 2 .026 -> .019, Cover 6 .019 -> .020, Cover 3 .011 -> .009, Cover 1 .021 -> .022, Quarters .014 -> .025. The completion rate falls about two points and breakups rise about 1.4 points with FLIGHT_BREAK alone, the opposite of the package's direction (+.016 completion, -.008 PBU); each is about one standard error (n about 1,900), so the honest reading is no detectable effect on breakups or interceptions at this sample, not a reduction.

## Rerun of the ON arm at 2de8a3c98 (the pump fix), Cover 2 and Cover 6, cells (4) and (1) (Coverage's ask)

Same 24 games, seeds and operators; ON arm only (the fix is behind the flag, so the off arm is the same fb0 data). `2de8a3c98` ("a pump he has seen pulled down ends the break") against the first ON arm `a771ec841`. Each arm is its own draw (the plays diverge), not a paired test; `data/reviews/census/flight-break-rerun.md`, `quarters_cells.py --fam Cover-2|Cover-6`, `outcomes.mts`.

**(4) Wide-open share of receiver-moments at 10-15 yd** (NFL | off | on a771ec841 | on 2de8a3c98; n in brackets):

| | fixed times | at the release |
|---|---|---|
| Cover 2 | .177 \| .484 (382) \| .420 (352) \| **.459 (329)** | .188 \| .321 (234) \| .303 (238) \| **.304 (217)** |
| Cover 6 | .096 \| .235 (272) \| .329 (255) \| **.301 (272)** | .097 \| .233 (163) \| .250 (152) \| **.211 (152)** |

The pump fix moves Cover 6 at the fixed times from .329 to .301 (-.03, about one standard error of a share near .3 on n 255-272), so the +.09 over off the first arm showed becomes +.07 (about two standard errors); at the release it takes it from .250 to .211, below off. Cover 2 fixed goes .420 -> .459, back toward off (.484): inside one standard error either way. The 10-15 yd window is not closed by the fix; with the sampling the rise Coverage saw is partly pump-hold and partly noise, and I cannot resolve more from 24 games.

**(1) Per throw** (off | on a771ec841 | on 2de8a3c98; breakups and interceptions with counts):

| family | throws | PBU per throw | INT per throw |
|---|---|---|---|
| Cover 2 | 243 \| 227 \| 226 | .078 (19) \| .084 (19) \| **.133 (30)** | .021 (5) \| .022 (5) \| .018 (4) |
| Cover 6 | 208 \| 203 \| 208 | .062 (13) \| .103 (21) \| **.077 (16)** | .019 (4) \| .020 (4) \| **.000 (0)** |
| all families | 1,970 \| 1,883 \| 1,988 | .083 (163) \| .097 (182) \| **.103 (205)** | .018 (35) \| .018 (33) \| .018 (35) |

Completion per throw, all: .761 | .742 | .732. With the fix Cover 6's breakup rate falls back from .103 to .077 (16 against 21 on a similar number of throws) and its interceptions go to none (0 of 208, against 4 | 4); Cover 2's breakups rise to .133 (30 of 226, against 19 | 19), the largest move of the three arms and about 2 standard errors above off. These cells hold 13-30 events; read as direction only. The all-family breakup rate keeps rising (.083 -> .097 -> .103, 163 -> 182 -> 205), the interception rate does not move.

**Split by the gap to the release (Coverage's follow-up; `fixed_split.py`, `data/reviews/census/flight-break-split.md`).** The census's fixed moments (1.5 / 2.0 / 2.5 / 3.0 s) are taken only while the ball is still held (frame before the release), so **every fixed moment is before the release by construction; none is after it**. Split by release minus the moment, 10-15 yd, off | a771ec841 | 2de8a3c98 (NFL):

| | all | 0.5 s or less before the release | 0.6-1.0 s | over 1.0 s | no release in the window |
|---|---|---|---|---|---|
| Cover 6 | .235 \| .329 \| .301 (.096) | .286 (98) \| .318 (85) \| .279 (111) (.075) | .169 \| .357 \| .278 (79) (.103) | .238 \| .300 \| .364 (44) (.120) | .236 \| .367 \| .342 (38) (.089) |
| Cover 2 | .484 \| .420 \| .459 (.177) | .514 \| .391 \| .460 (139) (.164) | .547 \| .482 \| .494 (87) (.181) | .467 \| .545 \| .586 (58) (.176) | .280 \| .240 \| .222 (45) (.212) |

So the Cover 6 rise over off is **not in the last 0.5 s before the throw** (.286 off, .279 on at 2de8a3c98) and sits in moments more than 0.6 s before it and on plays with no throw in the window (.169 -> .278, .238 -> .364, .236 -> .342; cells of 38-79, standard errors .05-.07, so none is individually significant). It cannot be defenders leaving receivers after the ball is out, because no moment here is after the release; whether a defender who has seen a pump or a looked-off throw leaves early, before it, is what the "no release" and earlier cells would show, and they are the cells that moved. After-release moments are not in the open census (the sim export stops at the release, and the full-track export holds completions of the default arm only); that would be a new measurement.

## Both arms at aa952b84d (HEAD_FOLLOW on: an undriven head follows the body), FLIGHT_BREAK=0 vs on (Coverage's follow-up)

Same 24 games, seeds and operators; two new independent draws (`hf0` / `hf1`; plays diverge, not paired). `data/reviews/census/flight-break-headfollow.md`.

| 10-15 yd, wide-open share (off \| on; NFL) | fixed times | at the release |
|---|---|---|
| Cover 6 | .206 (253) \| .225 (289); .096 | .163 (141) \| .121 (190); .097 |
| Cover 2 | .465 (374) \| .427 (368); .177 | .364 (239) \| .330 (221); .188 |

**With the head leak fixed, FLIGHT_BREAK no longer adds to the 10-15 yd window:** Cover 6 fixed .206 -> .225 (+.02, the earlier arms had +.07 to +.09), Cover 2 .465 -> .427 (-.04); at the release both are lower with it on (Cover 6 .163 -> .121, Cover 2 .364 -> .330). By the gap to the release (off \| on): Cover 6 within 0.5 s .157 \| .184, 0.6-1.0 s .176 \| .233, over 1.0 s .275 \| .351, no throw .258 \| .222; Cover 2 .409 \| .459, .571 \| .402, .593 \| .438, .333 \| .396 (cells 37-159; standard errors .04-.08, none significant). The earlier excess was therefore compatible with composition plus the frozen-head leak; both arms stay well above the NFL (.096, .177), which belongs to the sink, not the break. Each arm is its own draw, and the off arm itself dropped with HEAD_FOLLOW (Cover 6 .235 -> .206).
