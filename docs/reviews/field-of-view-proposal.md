# Field of view: a design proposal (G10)

Flex, 2026-11-09. Main Engine's G10 queue, INFO-1 "player sight has no field of
view". **Nothing is built. This asks Tanner for a design call.**

## The seam

`PlaySim.see(observer, target)` returns every opponent's position on the
observer's reaction delay, projected along the target's velocity, wherever the
observer faces. Only the ball (`throw-sight.ts`), the QB's eyes and a carrier's
run keys model where a player looks.

## How much it is used

One captured whole game (seed 9, current base, 144 snaps). Opponent lookups after
the snap, with the bearing of the target relative to the observer's **body
facing**:

| Observer | Lookups (pass / run) | > 90° behind (pass / run) | > 120° behind (pass / run) |
|---|---|---|---|
| CB | 1.09 M / 0.61 M | 40% / 25% | 29% / 17% |
| S | 0.72 M / 0.45 M | 28% / 17% | 20% / 11% |
| LB | 0.62 M / 0.39 M | 32% / 27% | 22% / 20% |
| DL | 1.10 M / 0.84 M | 29% / 35% | 19% / 22% |
| OL | 0.23 M / 0.20 M | 20% / 23% | 9% / 14% |
| WR/TE | 0.31 M / 0.20 M | 42% / 26% | 23% / 13% |
| RB | 0.10 M / 0.10 M | 26% / 45% | 16% / 33% |
| QB | 0.20 M / 0.05 M | 7% / 66% | 3% / 52% |

The probe is `out/flex/fov-census.mts` on a scratch tree; it can be committed on
request.

A lookup is not a decision. Many are incidental scans. But a fifth to a third of
everything defenders know about opponents comes from behind their bodies, and
it costs nothing.

## Why not a body-facing cone

Per `CLAUDE.md`, body facing is not gaze. A corner in off-man faces the QB and
turns his head to check his man, and a defensive lineman feels a down block
before he sees it. A cone on body facing would replace free omniscience with
false blindness:
- corners losing receivers they would actually check;
- linemen blind to blocks they would feel.

## Options

1. **Last in-view sighting** (`KNOWN_PROBLEMS`' proposal). Outside a cone on
   body facing, a player keeps his last in-view sighting and projects it
   forward.
   - Cheap.
   - Ties gaze to body facing, which is the error above.
2. **Controller-chosen gaze with a head-turn budget.** Each controller names
   what it is watching: the QB, the man, a key, the ball.
   - The head turns toward it within a neck range (about ±90° of body facing)
     at a finite rate.
   - Everything inside a peripheral cone around the gaze is seen on the normal
     delay.
   - Outside it, the last sighting is projected forward, with uncertainty
     growing with time since the last look.
   - Touch keeps its own channel: a loaded hand or body contact gives the
     contact partner (`RUN_FEEL` and `PASS_FEEL` already do this).
   - This is the shape the QB's eyes and `throw-sight` already use.
3. **Option 2, staged by role.** Start where hidden information most plausibly
   changes outcomes and tracking can check it:
   - man coverage (looking back for the ball versus trailing the man);
   - backside pursuit (a defender running down the line can't see a cutback
     behind him);
   - run-defense DL against blocks from behind or the side: cracks, kick-outs
     and pullers.

## Recommendation

Option 2, staged as option 3, behind default-off flags, one role at a time:
1. **Backside pursuit first.** It is the largest plausible yardage effect
   (cutbacks) and the simplest gaze (the carrier).
2. **Man coverage second.** Coverage owns it, and it needs the head-turn
   "check" behavior.
3. **Line play last.** Touch covers most of it already.

Each stage gets a matched restage, the same-operator NFL comparison where one
exists, and before/after film of the changed decisions. Per the PLAN's seam
rule, the controllers keep their logic. Only what they can know changes.

## Decision needed

1. Is option 2 (controller gaze with a head-turn budget) the model, or option 1?
2. Approve stage 1, backside pursuit. Defense owns pursuit, so it would be a
   joint change: the gaze channel in `PlaySim.see` (engine) plus pursuit's gaze
   target (Defense).

## Stage 1 built: `GAZE` (off), chasing defenders (2026-11-09)

Tanner approved option 2 and stage 1: "we desperately need to build on this
model". Anticipation is deliberately simple in this stage. Tanner's note that
"projects in a straight line" is too simple a worst case stands; richer,
experience-based anticipation is later work.

**The law** (`src/sim/playsim.ts`; `lookAt`, `inView`, `remembered`):
- `chase()` names the man a defender is chasing as his gaze target. Stage 1
  opts in only while he chases.
- The head turns toward his delayed picture of that man at 6 rad/s, within
  ±90° of body facing.
- An opponent is seen on the ordinary delay if he is:
  - the watched man;
  - inside ±90° of gaze, judged from the delayed picture;
  - or in contact (engagement, bond, or last-step body contact).
- Otherwise the observer has his last in-view picture. It is projected along
  its velocity for 0.2 + 0.8·(read skill) s, then held, with velocity zero.
  Read skill is the mean of play recognition and awareness.
- A lapsed watch restarts from body facing with no older memories.
- Constants are model assumptions, not measured.

**Results**, restaged runs (1,310, seeds 7–29 odd, current base):
- Chasers answer **30.5%** of opponent lookups from memory.
- **Outcomes barely move:** 67 plays change, paired yards +0.003 (SE 0.015),
  10+ runs 12.2% → 12.3%, 20+ unchanged.
- **Reading:** a chaser watches the carrier, so he still sees cutbacks, and
  chase decisions use few other opponents. The large effects should come
  where the gaze target is a real choice:
  - man coverage (his man or the QB);
  - backside defenders and reverses (the gaze is on the play, not the second
    back);
  - blockers coming from outside the view.

**Tests:** `npm test` 3,741/3,741 with `GAZE` off and on (Node 22.23.3).
`test/gaze-field-of-view.test.ts` covers:
- the watched man is seen live;
- a man moving behind a chaser stays at his last in-view position;
- off, he is seen.

**Next stages:**
- **Stage 2, man coverage** (Coverage lane). The controller chooses between
  the man and the QB, which needs a head-turn "check" behavior.
- **Stage 3,** run-defense reads of second-level and backside threats.
- **Anticipation:** richer, experience-based anticipation (route and concept
  priors from scouting reports, sharper with play recognition) replaces the
  dead-reckoned horizon there.

## Anticipation from NFL tracking (2026-11-09)

`scripts/diag/anticipation-bound.py`, the same operator on NFL 2022 (Run Game,
1.93 M samples) and sim. It predicts an unwatched player's position from his
own past motion only. Median error in yd, all players:

| Horizon | Freeze, NFL / sim | Constant acceleration, NFL | Best of the honest predictors, NFL / sim |
|---|---|---|---|
| 0.3 s | 0.79 / 0.83 | 0.10 | 0.09 / 0.12 |
| 0.6 s | 1.64 / 1.68 | 0.34 | 0.28 / 0.33 |
| 1.0 s | 2.77 / 2.77 | 1.04 | 0.75 / 0.83 |
| 1.5 s | 4.06 / 3.95 | 2.53 | 1.59 / 1.73 |

- **The sim's motion predictability matches NFL.**
- **Constant acceleration is the best single honest predictor to about
  1.0 s.** Beyond that, motion alone gains little (about 2.5 yd vs freeze 4.1
  at 1.5 s).
- **Hardest to predict:** WR, RB and TE. **Easiest:** OL.

**The law now in `remembered()`, replacing the placeholder:**
- The projected displacement is skill × (constant-acceleration displacement
  from the last in-view picture), up to `ANTICIPATION_HORIZON` = 1.0 s, then
  held. Speed is capped at 10 yd/s.
- Skill is the mean of play recognition and awareness, 0–1.
- Skill 0 is the no-anticipation bound (frozen picture). Skill 1 is the
  measured best single predictor.
- Acceleration comes from two in-view pictures within 0.3 s.
- Tests cover skill 0 / skill 1 / the horizon hold.
- Suites: 3,743 / 3,743 with `GAZE` off and on.

**Still to do:** role, route and concept priors, the headroom between
constant acceleration and the "best" oracle (about 0.3 yd at 1.0 s, about
0.9 yd at 1.5 s). That is where an experienced player's anticipation beyond
motion would come from, from scouting and formation knowledge, never from
the live assignment.

**Stage 3 hooks** that Defense already names (they will wire them behind
`GAZE`):
- unsure box backers → QB;
- interior DL key → the man in front;
- run-fit backers → the carrier they track;
- zone droppers → QB.

The API is `sim.lookAt(player, target)` each tick.

## Anticipation by assignment (2026-11-09)

Tanner asked for anticipation that depends on each player's assignment on the
snap, and noted that the frozen-picture worst case is worse than almost any NFL
player. Both change the law in `remembered()` (still behind `GAZE`, off).

**The ladder.** Read skill is the mean of play recognition and awareness:
1. **Motion is basic perception.** The constant-acceleration projection now
   saturates at skill 0.5 (weight `min(1, 2·skill)`). Generated players run
   0.29–1.0 (median about 0.6), so the frozen picture is only a hypothetical
   zero-rated player. The weakest real players keep about 60% of the motion
   projection; the median player keeps all of it. The 0.5 knee is a model
   assumption to tune.
2. **Experience is for his own responsibilities.** Above 0.5, the tracking
   prior (`src/sim/anticipation-prior.ts`) takes over with weight
   `2·skill − 1`, but only for opponents his assignment makes his.
   - `sim.assignedTo(observer, targets)` lets a controller declare them: his
     man, his zone's receivers, the back his fit reads, the puller he keys.
   - Without a declaration, role defaults apply:

     | Observer | Default responsibilities |
     |---|---|
     | DB | WR, TE, RB |
     | LB | RB, TE, QB |
     | DL | OL, RB, QB |
     | OL | DL, LB |
     | RB | LB, DL |
     | TE | LB, DB, DL |
     | WR | DB |
     | QB | DL, LB, DB |

   - Everyone else gets motion only, whatever his skill.
3. **What he believes the play is.** The prior is conditioned on the
   observer's belief:
   - the offense knows its own call;
   - a defender uses his own `Recognition.read` (run, pass or unsure), which
     play action and draws can make wrong;
   - unsure uses the unconditioned prior.

   An expert who has been fooled projects his man the wrong way.

**What the prior is.** It is the mean future displacement of players who
looked the same at that moment: group, speed, heading, depth, width and time
since the snap. It is learned from tracking by the same operator
(`anticipation-bound.py --export`) and written by
`scripts/diag/write-anticipation-prior.py`. No route, assignment or concept of
the opponent is used; the conditioning is only the observer's own belief. The
committed table is empty until Run Game runs the NFL export, so anticipation
tops out at motion until then.

**What a read is worth.** Sim export, held-out half, median error in yd at 1.0
/ 1.5 s:

| Predictor | 1.0 s | 1.5 s |
|---|---|---|
| Constant acceleration | 1.64 | 3.58 |
| Context prior | 1.10 | 1.94 |
| With a correct read | 1.04 | 1.82 |
| With a wrong read | 1.25 | 2.22 |

- **Being fooled costs about three times what a right read gains.**
- A fooled elite reader projects a WR worse than motion at 1.0 s (1.39 vs
  1.25).
- The TE is where the read matters most: 1.37 context, 1.21 right, 1.57 wrong.
  He blocks on runs and releases on passes.
