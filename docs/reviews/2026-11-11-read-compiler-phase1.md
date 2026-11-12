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

## Addendum: protection-pressure answers (HonestNFL, 6 sheets) — for the hot answer, not built

This is for the plan's hot/sight answer, to be built once the QB can see a free rusher as free (Integration is
splitting QB_FEEL's perception half for the QB lane). Everything here is paraphrased; the sheet ids are in brackets.

**When the QB is "hot."** He is responsible for a free rusher whom the called 5- or 6-man protection does not
account for. The protection is split into a call (strong) side and an away (weak) side, each owning three or four
rushers [353].

- **Standard count:** one extra rusher to a side makes him hot (+1). In some protections it takes two (+2): when a
  guard is uncovered, when the extra man comes to the dual side, or in "Rip/Liz" against a weak Mike [353, 299].
- **Not hot:** quick (3-digit) protections, where the ball is out on time anyway, and 7- or 8-man protections
  [353, 344].
- **Known vs unknown rushers:** known rushers are picked up by the line or the backs. Hot is the secondary answer
  for unknown ones. The first goal is to block it and make the defense pay downfield [353].
- **The QB's job:** get the ball to the built-in hot route before the free man arrives, "like a hot potato" [344].
- **Where it applies:** the hot system is mainly for man pressure, such as Cover 0 or Cover 1 overloads [344].

**The hot route.** Most hot routes cut the stem by 1–3 yd so the receiver is ready on hot timing [353]. If the
called play has no hot route, or a poor one for the look, the audible system checks to a concept that has one
[344, 353].

**Sight adjustment.** A route converts by alignment and by where the pressure comes from, into the void the
blitzer left [343, 344]:

- against zone-replacement pressure and soft or free-access Cover 0: seam, flat leverage, filling the void against
  8+ yd of cushion, "find the QB's eyes";
- only against the right look, or when the pressure comes as inferred from context clues; otherwise the route is
  run as called [343].

**Peek rule.** If the defender aligned over a receiver blitzes, the receiver looks back to the QB within 4 yd.
A "Q" call alerts the innermost eligible receiver to a quick throw [344].

**Protection rules relevant to the back** [299, 128]:

- In 6-man dual protection the line takes four down plus the Mike.
- The strong back checks "Buck" (the spot) to the strong perimeter, and releases if neither rushes.
- "Squeeze" applies if his man is in the A gap (under center only).
- The tight end may have a "scat" hot release to the weak side.
- Who becomes hot changes with Rip/Liz/Base and the front alerts ("5 down", "Fan" against a two look).

**Pre-snap pressure communication.** The detached innermost receiver points out a slot ("Cat") blitzer and
confirms it with a call. Against zone pressure or loose Cover 0 he sight-adjusts and sits in the void [004].

**What this means for the plan's answer** (a design note, not built):

- Hot is a protection count: the free man the called protection cannot account for. It is not "any rusher close
  to the QB."
- The answer is pre-wired: the designated hot route (often the inside receiver on a cut-down stem, or the back's
  release into the vacated area). It is thrown when he sees the free man, not after the order runs out.
- The QB must see the free man. That is the perception half Integration is splitting out of QB_FEEL; a hot rule
  on top of a QB who reads a free end as blocked would be designing around the blind spot.

## Update: BACK_RELEASE, the back first, the vertical peek (engine-32)

### BACK_RELEASE (Run Game's flag, off), as read by back-probe.ts in 16 league games

| | engine-32 | + BACK_RELEASE | NFL |
|---|---|---|---|
| Release p25 / p50 / p75 | 1.80 / 2.40 / 2.80 s | 1.45 / 1.65 / 1.90 s | 1.30 / 1.60 / 2.10 s |
| (b) releases after 2.0 s | .432 | .133 | |
| (c) out and open at 2.6 s, never read | .102 | .260 | |
| Back share of attempts | .125 | .124 | .193 |
| Sacks per drop-back | .012 | .015 | |
| Free first pressure per drop-back | .078 | .096 | |

With BACK_RELEASE the back leaves on NFL timing, but he is mostly not read: what was (b) becomes (c).

**Cause (a) is not a gap.**

| | NFL | Sim |
|---|---|---|
| Empty formation / no back in the backfield | .160 | .16 |
| Back on the field who stays in, or called to block | .229 | .16–.18 called to block, plus .02–.05 that check and never leave |

The NFL's back share counts RBs by position, so it includes backs split out in empty sets.

### The back as a read

Two changes:

- **(a) Back-first:** the back may now be the first read, when his window is the start side's earliest.
- **(b) Vertical peek:** two or more verticals on the start side and a released back are read as one picture,
  with one look, then the back (HonestNFL 001, 112, 150, 327).

**Forced-concept panel, `BACK_RELEASE` on:**

| Arm | Back share | Back time p50 | Sacks | INT | Yards a play |
|---|---|---|---|---|---|
| alone | .141 | 3.00 s | 74 | 45 | 9.67 |
| + READ_PLAN, attempt 3 | .096 | 3.40 s | 79 | 43 | 9.73 |
| + READ_PLAN with (a) and (b) | .137 | 3.05 s | 61 | 41 | 10.06 |

On the 168 vertical-peek plays: back share .26 → .58, sacks 20 → 7, yards a play 9.52 → 10.72. .58 to the back may
be too ready a check-down, since the look is a single dwell; it needs checking on film.

**16 league games:**

| Arm | Back share | Back time p50 | Sacks per drop-back | Free first pressure | (c) out, open, never read |
|---|---|---|---|---|---|
| alone | .124 | 2.70 s | .015 | .096 | .260 |
| + READ_PLAN with (a) and (b) | .165 | 2.65 s | .019 | .089 | .249 |
| NFL | .193 | 2.57 s | | | |

**Gate** (back share .193 at 2.57 s; sacks no higher than `BACK_RELEASE` alone): close on the back's share and
timing. Sacks are better than `BACK_RELEASE` alone on the paired panel, but slightly worse in unpaired league
games.

### The sacks traced

Of 38 new sacks with `BACK_RELEASE` + `READ_PLAN` (attempt 3), 10 were looked at:

- In 9 of them, a free defensive end is within 2 yd of the QB at 2.5 s, and the QB keeps reading for another
  0.9–1.2 s.
- The QB's own pressure estimate has the end 0.76 s away and rising to 1.95 s while he stands 1.6 yd from him: he
  reads the end as held by a blocker who is not there. With his urgency under 0.5, QB_RHYTHM's pressure jump never
  fires.
- Without a plan, QB_RHYTHM's rhythm outlet had been taking the open back incidentally.

This is a perception defect, the "blocked rusher" half of QB_FEEL. Integration has handed the fixture to the QB
lane: hitches from 2x2 against Cover 2, seed 2, roster 2, flipped.

## Four verticals: the standing stress test (engine-34)

`scripts/diag/four-verts/` (sim.ts, nfl.py, report.py) is diagnostics only, and any lane can run it.

**Sim:** four verticals from 2x2 and 3x1 against Cover 1, 2, 3 and 4, 200 plays a cell (1,600 an arm), READ_PLAN
off and on.

**NFL:** BDB 2025 drop-backs with 3+ GO routes, weeks 1–9 (242 plays; 32–59 attempts a coverage), the same
operators. This is a route population, not the four-verticals call.

**Operators:**

- **seam / go:** a vertical from an inside alignment is a seam; one from the widest alignment on his side is the
  outside go.
- **open:** 8 yd or more deep, with the nearest defender 2.5 yd or more away.
- **open early:** a seam open by 2.6 s.

### All coverages

| | NFL | READ_PLAN off | READ_PLAN on |
|---|---|---|---|
| Attempts | 211 | 1,291 | 1,438 |
| To the seam | .109 | .420 | .449 |
| To the outside go | .327 | .073 | .102 |
| To the back | .322 | .503 | .446 |
| Time to throw p50 | 2.54 s | 2.80 s | 3.10 s |
| Seam completion | .565 | .620 | .664 |
| Sacks per play | .070 | .074 | .061 |
| Seam separation at the throw p50 | 2.56 yd | 1.85 yd | 1.80 yd |
| A seam open early | .388 | .352 | .331 |
| ... then thrown to a seam | .096 | .374 | .448 |
| ... delay from open to throw p50 | 0.44 s | 0.35 s | 0.30 s |

### By coverage

Ball to seam / go / back, time to throw p50, and the share of plays with a seam open early:

| | NFL | READ_PLAN off | READ_PLAN on |
|---|---|---|---|
| Cover 1 | .03 / .62 / .12, 2.29 s, .10 | .35 / .26 / .38, 3.10 s, .03 | .30 / .31 / .38, 3.20 s, .03 |
| Cover 2 | .09 / .20 / .39, 2.67 s, .56 | .55 / .00 / .44, 2.70 s, .68 | .74 / .01 / .25, 2.60 s, .57 |
| Cover 3 | .12 / .29 / .39, 2.57 s, .41 | .64 / .00 / .36, 2.60 s, .67 | .56 / .00 / .44, 2.75 s, .69 |
| Cover 4 | .15 / .29 / .35, 2.52 s, .35 | .11 / .00 / .89, 2.85 s, .04 | .17 / .09 / .74, 3.35 s, .04 |

### The defense: nearest defender to each seam

| | At 12 yd: distance p50 (share ≥ 3 yd) | Nearest | At 18 yd: distance p50 (share ≥ 3 yd) | Nearest |
|---|---|---|---|---|
| NFL | 2.46 yd (.39) | CB .48, ILB .18, SS .13 | 3.19 yd (.52) | CB .41, SS .19, ILB .15 |
| Sim | 1.48–1.49 yd (.21–.23) | NB .41, LB_M .25, SS .24 | 3.80–3.90 yd (.66–.68) | SS .39, FS .17–.19 |

### Reading it

1. **The owner's check: a fairly open seam, early. Does he pull the trigger?** Yes, more readily than the NFL.
   Given an open-early seam, ours throws it .37 (off) and .45 (on) of the time at 0.30–0.35 s, against the NFL's
   .10 at 0.44 s. Hesitation is not our failure.

   Caution: 2.5 yd at 8 yd deep is a loose bar. The NFL's .10 says NFL QBs do not treat it as "open". Before
   reading this as over-eagerness, raise the operator (3.5 yd, or separation closing vs opening) and re-read.
2. **The outside go is missing.** The NFL throws it on .33 of attempts (.62 against Cover 1, the 1-on-1 man
   beater); ours .07–.10 (.26–.31 against Cover 1). The ball goes to the seam or the back instead.
3. **The defense carries seams tight early and loose late, the reverse of the NFL.**
   - At 12 yd our nearest defender is 1.5 yd away (NFL 2.5), mostly the nickel or Mike.
   - At 18 yd he is 3.8–3.9 yd away (NFL 3.2): the hand-off to the deep defender leaves the seam looser than
     the NFL's.
   - Cover 4 smothers the seam (open early .04, against the NFL's .35), and the ball goes to the back on .74–.89.
4. **READ_PLAN on vs off:**
   - more seam against Cover 2 (.55 → .74), with less back;
   - more back against Cover 3;
   - less back against Cover 4 (.89 → .74);
   - time to throw +0.3 s (the peek holds for the squeeze);
   - sacks 118 → 98.

These are diagnostic flags to look at, not targets.

### The outside go: why ours rarely throws it (four-verts follow-up)

**NFL** (`nfl.py`, GO targets from the widest alignment on 3+ GO drop-backs, n 69):

| | p25 / p50 / p75 |
|---|---|
| Time to throw | 2.30 / 2.74 / 3.30 s (Cover 1: 2.30) |
| Air yards | 16 / 25 / 31 |
| Separation at the throw | 1.32 / 1.75 / 3.04 yd (Cover 1: 1.25) |

Completion is .232 and INT .043. These are contested deep balls thrown on purpose.

**Ours** (`go-eval.ts`, READ_PLAN off, engine-34): the QB's evaluation of each outside go every 0.1 s, split into its
terms. At NFL-like moments (2.3–3.0 s, separation 1.0–2.5 yd, n 658):

| | p25 / p50 / p75 |
|---|---|
| Receiver depth | 6.7 / 7.4 / 11.1 yd |
| Ahead of his nearest defender | −1.71 / −1.23 / −0.90 yd (trailing; 5 of 658 samples even or ahead) |
| P | .10 / .14 / .24 |
| pAcc | .26 / .52 / .66 |
| pOpen | .22 / .30 / .94 |
| pClear | 1.00 |
| Interception risk | .01 / .18 / .36 (cap about .04) |

P = pAcc × pOpen × pClear × hands. Only .03 of samples clear both his bar (about .56) and the risk cap, yet his own
value is positive on .35.

By coverage, 2.3–3.0 s:

| Coverage | Depth | Ahead | pAcc | pOpen | Interception risk | Value > 0 |
|---|---|---|---|---|---|---|
| Cover 1 | 6.8 yd | −0.9 yd | .60 | .25 | .30 | .21 |
| Cover 3 | 12.7 yd | −4.6 yd | .25 | .69 | | .49 |
| Cover 4 | 12.3 yd | −3.2 yd | .27 | .83 | .03 | .76 |

**Two separable causes, neither READ_PLAN's:**

1. **In man, the go route is not even with the corner** at throw time (6.8 yd deep, trailing by 0.9 yd): a release
   and stem question for ROUTE_CRAFT and PRESS_RELEASE.
2. **The throw gate (P ≥ about .56) excludes a contested deep shot by design.** His deep accuracy alone caps a
   25-yard go near .25, and he does not throw even when his own value formula is positive. That belongs to the risk
   work: a value-judged deep shot. First check `missSigma` at 35–40 yd against NFL deep-ball accuracy.

## BACK_FRONT (off): the back read with the front side (engine-35)

**Sheets:** where a HonestNFL order lists the back at all (10 of 54 orders with 2+ reads), he comes after the front
side's 2–3 reads (drive 133/166/172/173, post-cross 107, y-cross 039/134, four verts 001). He is a reset, not a read
after the other side too.

**NFL:** on drop-backs with fewer than 2 GO and the back running a route, the back gets .221 of targets, thrown at
2.13 / 2.60 / 3.06 s (p25 / p50 / p75). That is in rhythm: all throws on those plays leave at 2.57 s.

**Change:** in `pure()` the back's side for reading is the start side, so he is read within the front side at his
window, before the eyes cross.

**Paired forced-concept panel** (engine-35, 1,536 plays a side):

| | engine-35 | BACK_FRONT |
|---|---|---|
| Back share, all concepts | .122 at 3.35 s | .241 at 2.90 s |
| Back share, non-vertical concepts | .098 at 3.40 s | .240 at 2.80 s |
| Sacks | 74 | 61 |
| INT | 37 | 33 |
| Yards a play | 9.46 | 9.30 |
| Completion | .655 | .632 |

**16 league games** (`back-probe.ts`):

| | engine-35 | BACK_FRONT |
|---|---|---|
| Back share | .163 at 2.85 s | .230 at 2.70 s |
| In-rhythm back throws | 234 at 2.80 s | 332 at 2.60 s |
| Sacks per drop-back | .018 (29) | .019 (30) |
| Free first pressure | .108 | .106 |
| (c) out, open and unread | .253 | .182 |

**Gate** (.221 at 2.60 s on these concepts; sacks no higher than engine-35): met. The panel's non-vertical back
share is .240 at 2.80 s, and in league games the in-rhythm throws to him leave at 2.60 s. Sacks are lower on the
paired panel and level in games.

**Cost:** 0.16 yards a play on the panel. The checkdown replaces some longer throws, and completion is a little
lower.

**Fixture:** `test/back-front.test.ts`.

## The throw window against what happened: the risk-model diagnosis (engine-35)

`scripts/diag/read-plan/window-probe.ts` is diagnosis only; the fix belongs to the risk work.

**Setup.** At the moment he decides to throw, the probe recomputes the window's terms for every defender exactly as
`window()` does:

- where the QB thinks the man is;
- **blind:** the time the window assumes a defender keeps his course before reacting;
- **reaction:** his reaction time, ×1.8 for a defender not facing the QB;
- **run:** the defender's time to reach the catch point (`timeToReach`);
- the ball's arrival.

It then records what each defender did: when he broke toward the catch point, and when he got within reach of it.
The run covers the forced-concept panel, seeds 1–4: 2,048 plays and 1,903 throws, of which 1,748 left the hand on
the decision, with no pump. There were 43 interceptions; every interceptor was among the four defenders the window
rated closest.

**Comparison.** The interceptor against the closest defender on 1,187 non-intercepted throws whose predicted margin
lay in the interceptors' p10–p90 band (+0.11 to +0.76 s). Values are p25 / p50 / p75; "actual − predicted" is
negative when the defender was early.

| | Interceptor (n 43) | Matched, no INT (n 1,187) |
|---|---|---|
| Predicted margin (his arrival − the ball's) | +0.23 / +0.36 / +0.59 s | +0.31 / +0.45 / +0.59 s |
| The QB's picture of him: error | 0.11 yd | 0.16 yd |
| Facing the QB | .74 | .68 |
| **Start:** predicted (blind + reaction) | 0.38 / 0.43 / 0.60 s | 0.37 / 0.38 / 0.58 s |
| Start: actual break | 0.05 / 0.20 / 0.60 s | 0.05 / 0.45 / 1.05 s |
| **Start: actual − predicted** | **−0.38 / −0.32 / +0.23 s** | −0.34 / +0.07 / +0.66 s |
| **Run: actual − predicted** | **−0.88 / −0.44 / −0.01 s** | −0.55 / −0.24 / +0.17 s |
| Total: actual reach − predicted | −0.70 / −0.56 / −0.34 s | −0.59 / −0.26 / +0.16 s |
| Reached the catch point by the ball's arrival | .35 | .12 |
| Achieved speed on the run (vmax about 9.7) | 4.2 yd/s | 5.0 yd/s |

**Split by where the ball was picked:**

| | At the catch point (n 22) | On the path, before the catch point (n 21) |
|---|---|---|
| Start error p50 | −0.23 s | −0.33 s |
| Facing the QB | .86 | .62 |
| The QB's P / intRisk | .69 / .03 | .70 / .03 |

**Which term carries the error:**

1. **The start, about −0.3 s.** Interceptors break about 0.20 s after his decision, inside the 0.37 s windup. The
   window has them start at 0.43 s: blind plus reaction, which for a defender facing him is the THROW_REACT
   assumption (zone keys the motion start plus a reaction, man waits for the release).
   - On the matched clean throws the start is right on average (+0.07 s), so the window is calibrated for a typical
     defender.
   - It is wrong for the ones who jump the throw: they read him (engine-35's defenders read the QB they see) and
     go during the motion.
   - This matches Defense's question of whether NFL defenders move off the throwing motion before the release.
2. **The run, −0.44 s for interceptors against −0.24 s for matched throws.** `timeToReach` is conservative for
   everyone, by about 0.24 s. For an interceptor the error doubles, partly because a man who broke early already
   has speed when the window's model has him starting.
   - Measuring to within reach + 0.3 yd of the catch point understates the defenders who undercut the path (21 of
     43 never reached the point).
3. **Not the picture.** He sees the interceptor within 0.11 yd. Facing or not changes little: three quarters
   were facing him.

**For the risk work.** The window's reaction model treats every facing defender alike. The defenders who intercept
are the ones who start during the windup, about 0.3 s early, and arrive about 0.5 s sooner than the window says.
The candidate fix is a reaction term that reflects defenders reading the QB's eyes and shoulders. A blanket
reduction would mis-price every throw, since the window is calibrated for the typical defender. Two things should
be checked first:

- Defense's NFL measurement (do defenders move before the release?), which decides how early is real;
- the 0.24 s conservative run, which is common to all throws.
