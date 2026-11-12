# Read compiler, Phase 1: the quarterback runs a compiled read plan (2026-11-11)

Scope is Integration's, with the owner's go-ahead. Background: [the Phase 0 report and its HonestNFL addendum](2026-11-11-read-compiler-phase0.md).

Everything here is behind `READ_PLAN` (off by default). It needs `FORECAST_BREAK` (#593) to execute flats: without
it the QB never thinks a flat is ready. The reference is the HonestNFL sheets; agreement with the hand-written
reads is reported as information, not as the target.

## What was built

**Compiler** (`src/playbook/read-compiler/`).

`select()` chooses a plan by structural rules, never by concept name. The first rule that applies wins:

1. **Defender key.** On the side the read starts, a high-low on one defender where:
   - the low route is ready within a beat of the QB's set;
   - the high route declares at least 0.5 s later, and has a break (not a go, seam or clear-out; a corner counts
     though it rounds);
   - the two are live together for at least 0.4 s.

   Or a clear-and-void pair (the dagger family): a vertical that takes the deep defender away, with an in-breaker
   coming in under him.
2. **Triangle.** Three routes on the start side, all ready within 0.9 s of the set, read as one picture top-down.
3. **Alert.** An isolated vertical on the other side, checked with a yes/no look at the set.
4. **Pure progression** otherwise.

Three repairs from Phase 0 are included:

- the key's role is named from where the low route goes;
- the high-low lane is judged by where the high route is going (this fixes the 2x2 smash miss);
- the new clear-and-void motif.

The pure order:

- reads the start side through, then the other side, and never comes back;
- within a beat, reads the breaking route before the settling one.

**Plans across the audit's 320 plays:**

| Plan | Plays |
|---|---|
| Pure progression | 136 |
| Defender key | 74 |
| Alert, then progression | 66 |
| Triangle | 44 |

Agreement with the hand-written first read rose from 110 to 134 of 320.

**Runtime.** `read-compiler/runtime.ts` compiles each plan once per concept and formation and caches it. A
compile takes about 0.3 s (two engine runs with generic teams and parked defenders), so the plan never sees the
defensive call. A guard stops the sampling run's own quarterback from compiling a plan in turn.

**Quarterback** (`behaviors/qb.ts`). Functions touched: `init`/`initPlan`, `readKey`, `gazePoint`, the drop's
rhythm throw, and the set's read loop. Nothing touches the throw body, THROW_BODY, SHOULDERS_SET or SET_DECIDE.

- **Reads:** the plan's order, any other route runner, and the back last.
- **Key:**
  - Eyes go to the stretch from the drop (HonestNFL 135).
  - At the cue (the top of the drop for a high-low), he takes the defender in his own delayed picture nearest
    where the two routes are going. He places that defender between them by where the defender is heading, with
    noise from his decision-making and awareness.
  - Playing the high route gives the low throw on rhythm; playing the low one gives the high throw. With nobody in
    the stretch, the order stands.
  - He does not throw the low route on rhythm before the key is read.
- **Triangle:** eyes on the middle of the three, and the best open route that clears his bar is thrown.
- **Alert:** a glance, not a full read.
- **Outlet:** under a plan, QB_RHYTHM's rhythm outlet waits until the plan's field reads are done. Pressure still
  sends him there. See "The outlet" below.

**Questions you asked mid-build (drops, rhythm, anticipation).**

- **Drops:** each concept already names one (quick, gun 3, gun 5, under-center 5 and 7, play-action), which sets
  the depth and time. A rhythm throw comes off the last step of the drop.
- **Not modelled:** hitch steps and footwork. The plan's rhythm labels (drop, hitch 1, hitch 2) are not yet tied
  to his feet. That is a natural next step.
- **Anticipation:** he throws to where the route will be and may release up to about 0.3 s before the break. The
  key is read from where the defender is heading. What he does not yet anticipate is a defender's coverage
  landmark from the shell; that waits for the coverage work.

## Fixtures

All on the current engine; the files are `test/read-plan.test.ts` and `test/read-compiler.test.ts`.

| Fixture | Setup | Result |
|---|---|---|
| Key, flat defender sinks | Corner-flat vs Cover 2, the corner (the key) scripted to sink | He reads low 3/3 and throws the flat on rhythm by 2.4 s |
| Key, flat defender jumps the flat | Same, the corner jumps the flat | He reads high 2/3 (the third is a misread from his own noise). Read high, he holds for the corner rather than taking the flat on rhythm: he throws the corner, or comes back down to the flat later when the corner is covered |
| Covered first read | Press-man quick outs, #1 covered | He moves off #1 at the set (about 1.9 s) and throws #2 by 2.35–2.55 s |
| Cache | The same play with a cold and a warm plan cache | Identical play |
| Compiler | Every concept, 2x2 and 3x1 | Every plan finishes one side before the other; a pure plan never starts on a settling route with a breaking one in the beat; corner_flat, curl_flat, sail_corner and dagger get keys on the defenders the sheets name |

## Forced-concept panel

**Setup:** `scripts/diag/read-plan/panel.ts` and `report.py`. Every ordinary concept (32) from 2x2 and 3x1 against
Cover 1, 2, 3 and 4, seeds and rosters 1–3, both flips: 1,536 plays per arm.

**After the outlet change:**

| Arm | Completion | Time to throw p50 / p75 | Sacks | INT | Yards a play | Back share of targets |
|---|---|---|---|---|---|---|
| off | 0.526 | 2.75 / 3.30 s | 42 | 48 | 7.18 | 0.167 |
| READ_PLAN | 0.530 | 2.85 / 3.45 s | 58 | 60 | 7.36 | 0.090 |
| FORECAST_BREAK | 0.522 | 2.75 / 3.15 s | 37 | 50 | 7.75 | 0.149 |
| both | 0.532 | 2.70 / 3.30 s | 46 | 59 | 8.40 | 0.064 |

**By plan style, on the same plays** (yards a play / INT / sacks / back share):

| Plan (plays) | FORECAST_BREAK only | Both flags |
|---|---|---|
| Pure (744) | 7.12 / 33 / 17 / 0.13 | 7.38 / 34 / 25 / 0.06 |
| Key (408) | 7.84 / 11 / 11 / 0.21 | 8.87 / 17 / 15 / 0.05 |
| Triangle (192) | 9.21 / 3 / 5 / 0.07 | 10.92 / 4 / 2 / 0.02 |
| Alert (192) | 8.53 / 3 / 4 / 0.13 | 8.83 / 4 / 4 / 0.13 |

Key reads: high 241, low 113, nobody in the stretch 54 (of 408).

**Against the sheets' answer** (share of attempts thrown there):

| Concept, coverage → answer | FORECAST_BREAK only | Both flags | Sheets |
|---|---|---|---|
| dagger, Cover 2 → dig | 0.33 | 0.64 | 294/328 |
| curl_flat, Cover 3 → curl or flat | 0.75 | 1.00 | 111, 123 |
| sail_corner, Cover 3 → corner or out | 0.50 | 0.91 | 329 |
| flood, Cover 3 → out | 1.00 | 1.00 | 307, 327, 111 |
| quick_outs, Cover 4 → quick out | 1.00 | 0.92 | 142/191/361 |
| four_verts, Cover 3 → seam | 0.80 | 0.70 | 001, 111 |
| corner_flat, Cover 2 → corner | 0.33 | 0.17 | 161, 111 |
| smash, Cover 2 → corner | 0.08 | 0.09 | 294/328, 135, 311 |

In the last two rows the corner is barely reached in any arm.

**Reading it:**

- **Triangles and keys gain the most yards.** The plan sends the ball where the sheets do on dagger (the dig doubles),
  sail-corner (0.50 → 0.91) and curl-flat (0.75 → 1.00).
- **corner_flat, sail_corner and smash against Cover 2 rarely reach the corner.** The key mostly reads high on
  corner-flat against Cover 2 (9/12), and the corner is still not thrown. The corner route is covered by the
  half safety in our engine, or judged so. Phase 0 and the corner diagnosis found our slot corner leaves its stem
  late (11.2 vs 9.3 yd). That is the next thing to look at for these concepts.
- **Sacks and interceptions rise.** Against FORECAST_BREAK alone: +30 / −21 sacks and +26 / −17 interceptions.
  - The interceptions are scattered: 5 are keyed digs.
  - The sacks are mostly pure plans, where the QB now holds through every field read before the outlet.

## The outlet: two attempts, stopped

| Attempt | Throws to the back | Time to throw to him p50 | Sacks (READ_PLAN / both) |
|---|---|---|---|
| Off | 0.167 | 3.00 s | 42 |
| 1: QB_RHYTHM unchanged | 0.284 | 2.95 s | 37 / 30 |
| 2: outlet waits for the plan's field reads | 0.090 | 4.05 s | 58 / 46 |
| NFL | 0.181 | 2.50 s | — |

In the hand-written orders, any route runner not in the progression is appended after B, so QB_RHYTHM's "last
read" outlet is usually a go that is never open. In a plan, B really is last.

- **Attempt 1:** the outlet fired on the QB's first move-off. On stick, he skipped the weak-side slant for the
  checkdown at 2.05 s.
- **Attempt 2:** the outlet waits for the plan's field reads, so the back comes too late (4.05 s) and sacks rise.

Neither matches the NFL's 18% at 2.50 s. Per the two-attempt rule I stopped there. My diagnosis is that the back is
not "last" or "first move-off": he is a read with his own window, on the side he releases to. The sheets bear
this out:

- stick-flat-back on one side (224);
- "finish to the back" after the front side (107, 133).

That implies a structural change: the compiler places the back in the order by his window and side, like any other
route, and the outlet becomes his place in the plan, not a separate rule. That is Integration's call before a
third attempt. The branch carries attempt 2.

## Sixteen league-sampled games

Running now: `scripts/diag/call-mix/collect.ts --seed 101 --games 16`, four arms. Results will follow in the PR.

## Not in Phase 1

- Reads dictated by the defensive shell.
- Telling fade_flat's high route from stick's go (that needs the coverage).
- Read direction as a coached choice.
- Footwork tied to the plan's rhythm.

---

## Update 2026-11-12: engine-31/32, the back, attempt 3

**Rebase.** The branch is merged with develop at engine-32, where `FORECAST_BREAK` is on (from #593) and
CATCH_POINT is in. The panel arms below are on engine-31 with `FORECAST_BREAK` set explicitly, so the
`FORECAST_BREAK` arm is engine-32's default.

### Why the back is not thrown to

**NFL** (`scripts/diag/read-plan/nfl_back.py`, BDB 2025 drop-back population):

- The back runs a route on 0.769 of drop-backs.
- He gets 0.193 of targets, thrown at 2.16 / 2.57 / 3.00 s (p25 / p50 / p75).
- He leaves the backfield (past the line or 3 yd lateral) at 1.30 / 1.60 / 2.10 s (week 1, n 596).

His routes, as share of routes run / share of back targets:

| Route | Share of routes / of targets |
|---|---|
| flat | .50 / .52 |
| angle | .21 / .24 |
| out | .11 / .12 |
| go | .06 / .02 |
| hitch | .04 / .03 |
| wheel | .03 / .04 |

**Sim** (`back-probe.ts`): 16 league-sampled games, one drop-back per row, each row assigned the first cause that
applies:

| Cause | off | FORECAST_BREAK | both (attempt 3) |
|---|---|---|---|
| (a) no route (blocks, or checks and stays in) | .391 | .381 | .377 |
| (b) runs a route but releases after 2.0 s | .431 | .425 | .430 |
| (c) never read, though out and open at 2.6 s | .093 | .106 | .100 |
| (c) never read, not open | .053 | .056 | .039 |
| (d) read, not thrown | .010 | .012 | .018 |
| The back runs a route (NFL .769) | .609 | .619 | .623 |
| His release p50 (NFL 1.60 s) | 2.45 s | 2.40 s | 2.40 s |

His assignments across drop-backs: check 54%, block 19%, back_out 11%, angle 9%, wheel 5%, swing 4%.

The back's missing targets are mostly (a) and (b): he does not release, or he releases 0.8 s later than an NFL
back, mostly off a check. A read plan cannot put him at 2.5 s while he leaves the backfield at 2.4 s. That is the
check-release / BACK_RELEASE work, outside this flag.

### Attempt 3: the back as a read

The back is placed in the order by his window, on the side he releases to. The separate rhythm outlet is off;
pressure still jumps the eyes to him.

Panel, engine-31, `FORECAST_BREAK` on in every arm:

| Arm | Back share | Back time p50 | In rhythm | Pressured | Sacks | INT | Yards a play |
|---|---|---|---|---|---|---|---|
| FORECAST_BREAK only | .146 | 3.00 s | 209 at 3.00 s | 7 at 3.95 s | 37 | 43 | 9.03 |
| + READ_PLAN, attempt 2 | .064 | 4.05 s | 78 at 4.05 s | 15 at 4.20 s | 46 | 53 | 9.61 |
| + READ_PLAN, attempt 3 | .099 | 3.65 s | 130 at 3.60 s | 16 at 4.20 s | 40 | 53 | 9.61 |

In 16 league games, attempt 3's back share is .120 at 3.05 s, against .133 at 2.80 s with `FORECAST_BREAK` only;
sacks are 31 against 25.

**Gate:** back share .181 at 2.50 s, and sacks no higher than `FORECAST_BREAK` alone. **Not met**, for the reason
in the table above.

Attempt 3 matches what the sheets say. It brought pure-plan sacks back down: 25 under attempt 2, 21 under attempt
3, against 17 with `FORECAST_BREAK` only. It stays as the branch's state.

### Looks at plays

**Pure-plan sacks** (attempt 2, 12 plays):

- 7 came at the back read, after the four field reads, at 3.35–5.3 s: the outlet arriving late, which attempt 3
  addresses.
- 4 were sacks in both arms.

**Keyed interceptions** (13 plays):

| What happened | Plays | Examples | Fix it points to |
|---|---|---|---|
| Correct read, picked by a defender he was not reading | ~6 | A safety or robber on the dig or hook: flood (SS), comebacks (SS), pa_post_dig (FS, LB_M, SS); a W1 hitch picked by CB_W | A second key, or a triangle |
| Misread: the key defender himself picks it | 3 | drive ×2 (a linebacker placed at the low end who then carried), comebacks (SS) | The key read |
| No key defender in the stretch | 3 | dagger, pa_shot ×2 | An ordinary progression interception |

Several of these were also late, at 4.0 s or later.

### The flat throw on engine-31

| | n | Completion | Air yards p50 | Ball vs runner along: p25 / p50 / p75 | Across p50 | Distance p50 |
|---|---|---|---|---|---|---|
| FORECAST_BREAK only | 130 | .769 | 5.8 | −0.38 / −0.06 / +0.19 yd | 0.28 yd | 0.65 yd |
| Both flags | 220 | .745 | 5.9 | −0.37 / −0.08 / +0.17 yd | 0.24 yd | 0.51 yd |

"Along" is where the ball passes him at its closest approach, ahead (+) or behind (−) along his motion. Completion
was .55 on engine-30. Of 30 incomplete flats, 1 was more than a yard behind.

On this measure the ball is not 1.7 yd behind the runner, as Coverage's #567 reports. Closest approach includes his
own adjustment to the ball, so it is not the same operator as #567's forecast error.

### The owner's points

1. **The back as the first read.** The rule allows it once he is the earliest answer on the start side in a
   stretch. He is held out of the first read today because, with a 2.4 s release, he never is the earliest. One
   line lifts that once his release is NFL-like.
2. **Verticals, then the back.** The sheets read the verticals inside-out off the deep defenders' squeeze, then the
   back:
   - 001: the seam away from the rotation, then the go, then reset to the back;
   - 112: the verticals, or check down to the back against man;
   - 150, 327: inside-out off the squeeze.

   The grammar can express this as a "vertical peek": the verticals read as one picture (the triangle's group
   read), one look, then the back. It is not built: the same blocker applies, since there is no back at 2.5 s to
   check down to.
