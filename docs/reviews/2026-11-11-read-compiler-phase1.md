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
