# The believed body: what a player believes about an opponent's physical capacities (design note)

Flex with the QB lane, 2026-11-24, for Integration's review with the user. Design only; no code. It generalises the QB
lane's `QB_SCOUT` (and replaces develop's `QB_BELIEVED_DEF`) into one shared belief that every decision reading another
player's capacities goes through. The user's brief and correction are the requirements:
- speed comes from build, then film, then watching him move;
- learning is fast and step-like on a clear look ("oh, that guy can run");
- teammates and coaches share what they learn.

Numbers marked *measured* come from the engine's own generated population (§3.1); numbers marked *chosen* are stated
design choices, to be checked by the gates in §8, not fitted to any outcome.

## 1. What it is

For each team T and each opponent B in the game, one record `belief[T][B]`, holding for each capacity c:
- `mean`, his best estimate;
- `sd`, how unsure he is;
- `floor`, what he has seen B do at least.

Capacities, in the order we need them: top speed `vmax`, burst `accel` (= vmax / tau), `brake`, `lateral` (cutting),
`power`, and later `reach`.

Each player keeps his own copy. It is the team record as of the last time he heard it (§5), plus whatever he has seen
himself during the current play.

Decisions read the copy through one accessor, `believed(observer, B)`, which returns:
- `mean(c)`, `sd(c)` and `floor(c)`;
- `q(c, p)`, a quantile, so a decision can plan for the fast case (a corner's cushion) or the likely one (a pursuit
  angle). How cautious to be is the player's choice.
- `asProfile()`, a PhysicalProfile of the means, each raised to its floor, for code that takes a profile.

No decision reads B's true profile.

## 2. What is not a belief

- **Visible build:** height, weight / frame, and so body radius and size. These are appearance, seen directly (with a
  small error, §3.1).
- **His own body:** proprioception.
- **His teammates' capacities:** known from practice. We propose truth here; the user should confirm (§9).
- **Physics and officials:** contact resolution (tackle.ts, engagement.ts force terms) is not a decision. Officials
  (contact-holding.ts 506/511 reads true vmax) are a separate question (§9).

## 3. The three sources

### 3.1 Appearance prior (everyone, from the first snap)

The prior is the engine's own population relation between build and capacity: a regression over a generated league
(64 teams, 3264 players; generator + `derivePhysical`; `scripts/diag/belief/body-prior-fit.mts`). There is no position table, so it works for anyone, a ball
carrier included. *Measured*, with u = (weight − 250) / 50 and h = (height − 74) / 2:

| capacity | mean | sd of the residual | sd across all players |
|---|---|---|---|
| vmax (yd/s) | 8.92 − 0.85u − 0.053u² − 0.02h | 0.22 (0.17–0.25 by weight band) | 0.87 |
| accel (yd/s²) | 7.04 − 0.72u − 0.15u² − 0.05h | 0.81 | 1.12 |

Build tells a lot about top speed (it explains three quarters of the spread) and little about burst. So what stays
uncertain after appearance is mostly how quick a man is out of a stance or a cut, not how fast he runs. That is the
user's point in numbers.

`brake`, `lateral` and `power` get the same fit (shuttle / cone / bench drive them); we fit those at build time.

The coefficients are constants in code. A test re-fits them on a generated league and fails if they drift beyond
tolerance, so the prior follows the generator if it changes.

**Appearance error:** each team sees B's weight off by one draw (sd 8 lb, *chosen*), fixed per (team, B, game). Through
the slope (≈ 0.017 yd/s per lb) that adds about 0.14 yd/s, so the vmax prior's sd is about 0.26.

### 3.2 Film: the coaches' pre-game report (per team, shared by the unit)

What film may be derived from: B's true in-pads capacities (the same profile he plays with) for vmax, accel, brake and
lateral. Power is left vague. Nothing else.

How: one measurement per (team, B, game), `film = true + e`, with e ~ N(0, σ_film(n)), drawn once from the game's seeded
stream. It is combined with the prior by precision weighting. It is never truth × rating.

- n = B's snaps on film. The engine has no snap count yet, so until the management layer tracks one, we use
  experience: n ≈ 500 × years (*chosen*).
- σ_film(n) = σ₀ / √(1 + n / n₀), with σ₀ = 0.30 yd/s, n₀ = 150 × study (*chosen*).
- study = the staff's scouting quality. This is a new coach attribute, 0.5 by default; it is a management-layer knob.

| B | film sd on vmax | unit starts at (with the appearance prior) |
|---|---|---|
| rookie | none | appearance only, about 0.26 |
| one season (n ≈ 500) | 0.11 | about 0.10 |
| veteran (n ≈ 2500) | 0.05 | about 0.05 |

This is the user's "coaches warn the unit about a known burner": a veteran's speed is known going in, a rookie's only
by his build. Film on acceleration uses the same form with σ₀ = 0.8. It tightens a little; most of what film shows is
straight-line speed.

### 3.3 In-game observation: step updates on clear looks

**Observations** come only from the observer's own perceived picture of B: `sim.see` / `sim.track`, delayed, noisy, with
acuity worse off his gaze (PERIPH_ACUITY). Ratings act through that picture's quality and through whether he registers
the look. They never act on the truth.

**A clear look at top speed:**
- B runs near-straight for at least 0.6 s with his seen speed on a plateau (seen acceleration under 1 yd/s²);
- B is within the observer's useful view (foveal, or near it);
- the observer is not engaged with someone else.

That gives one measurement v̂ (the plateau's mean seen speed) with sd σ_obs = his velocity noise / √samples.

- **Always a floor:** floor_vmax = max(floor, v̂ − 2σ_obs). He has seen B do at least this. It never goes down.
- **A full-effort context makes it a measurement of vmax**, not just a floor. The contexts are: B carrying in the open
  and chased; B on a vertical route; B chasing a carrier. Then the belief updates by precision weighting, with the
  measurement's sd √(σ_obs² + σ_effort²), σ_effort = 0.15 yd/s (*chosen*: a man in a full-effort context is not always
  at 100%).
- **One or two clear looks bring vmax's sd to about 0.1–0.15.** That is the step the user describes. There is no
  per-tick drift and no slow learning over a half.
- **Being outrun on a fair angle** is the strongest case. The observer knows his own speed exactly; if B gains ground
  while he runs at 90%+ of his own top speed on a closing angle, then B's speed ≥ his own plus the gain rate. That is a
  floor from his own body.

**A clear look at burst:** B's seen speed rising out of a near-stop or a cut (a release from a stance, out of a break, a
carrier out of a cut). It gives a measurement of accel with sd from the same noise model. Until burst has been seen,
accel stays at its prior and film value. "What he has not shown stays uncertain."

**Ratings act only here:**
- the observer's perception quality (existing acuity and reaction) sets σ_obs;
- awareness sets the chance he registers a clear look at all (*chosen*: 0.7 + 0.3 × awareness).

**Memory:** within a game, nothing decays. Across games is the management layer's question.

## 4. Commitment

A belief changes only on a clear look, a step, or at the huddle sync (§5). Both are perceived changes. A decision that
re-plans because the belief stepped is a decision on a new picture, which the commit rule allows. Nothing is
re-estimated per tick, so it adds no dither. It goes through the dither-budget test as a gate.

## 5. Sharing (the user's correction)

- **Pre-game:** the coaches' film goes to the whole unit, so `belief[T][B]` starts as appearance plus film, shared.
- **Within a play:** a player's own clear looks update his own copy at once. He reacts to "that guy can run" on the
  same play.
- **Between plays (the huddle):** what any player saw goes into the team record at the play's end. Each player on the
  field picks up the team record before the next snap, with probability p_comm = 0.85 + 0.13 × awareness (*chosen*).
  Otherwise his copy stays one play behind; he missed the message.
- **Between series:** everyone, including players coming on, syncs on the sideline.

**One record per team, not per unit or per pair.** The defense and special teams on the same sideline share it; the
per-player copies give the realistic lag.

## 6. Cost

- **Records:** one per (team, opponent player who has been on the field): at most about 2 × 53 per game. Each holds 6
  capacities × 3 numbers.
- **Per-player copies:** only the version index he last synced, plus his within-play deltas, kept sparse for the few
  opponents he looked at.
- **Observation checks:** only for opponents he is attending to (his man, his key, the carrier, a rusher on him). That
  is O(1) per observer per tick and runs only while a plateau or burst is being tracked.
- **Expected overhead:** under 1% of tick time. A profile of one game is a gate.

## 7. Consumers: the current true-state reads this replaces (migration)

The decision-information scan has no `profile` rows today, so these reads are not tracked. Step 1 of the migration adds
a scan key for reads of another agent's capacity, `X.profile.(vmax|tau|brake|lateral|power|press)` with X not the
actor. These are the reads it finds in decision code (develop d31271e42):

| file:line | read | decision |
|---|---|---|
| `behaviors/common.ts` 156, 160, 195 | target.profile.vmax / brake / tau | pursuitPoint's carrier forecast and the pursuit capacity |
| `behaviors/defense.ts` 1454 | R.profile.vmax (SLOW_SPRINT) | DB_SLOWPLAY: is the receiver sprinting |
| `behaviors/defense.ts` 1531, 1564 | R.profile.vmax / tau | release and upfield burst expectation |
| `behaviors/defense.ts` 1632, 2280 to `coverage-leverage.ts` 21–27, 50–76 | R.profile, as `receiver: PhysicalProfile` | DeepCoverage.observe / choose clamp to receiver.vmax / tau: the cushion |
| `behaviors/defense.ts` 3261 | r.profile.vmax | which receivers can reach a ball in the air |
| `behaviors/qb.ts` 874 | mover.profile.vmax | a defender's reaction lag in his interception estimate |
| `behaviors/qb.ts` 1521, 2643, 2911, 3134–3150 | QB_BELIEVED_DEF `believe` / `bodyOf` | his belief of a defender: `believedProfile(truth, typicalAt(position), k(awareness, experience))`. A blend of truth by a rating, keyed on position, which this note replaces |
| `behaviors/blocking.ts` 612 | r.profile.vmax | a rusher's forecast path in the protection |
| QB lane's `QB_SCOUT` (claude/exciting-cori-hc8l4u) | defender beliefs, a per-pair per-game draw | becomes `believed(qb, d)`. The QB lane maps its fields (§10) |

Reads that stay:
- radius, massKg and heightYd of others (visible build);
- reach (arm length is roughly visible; we keep truth for now and list it as a later capacity);
- the actor's own profile;
- a teammate's (practice), e.g. `qb.ts` 3000–3001 for his own receiver.

Out of scope as non-decisions: tackle.ts 366/376 (physics), engagement.ts' own-body reads.

The migration runs one consumer per step, each behind its own flag, with the scan rows falling as each lands. The
order: coverage first (the cushion is the user's example), then pursuit, then the QB.

## 8. Gates

1. **Belief error over a game:** per capacity, |mean − true| and sd by play index, on 8 games.
   - vmax starts near 0.26 for rookies and 0.05–0.10 with film.
   - It steps to about 0.1–0.15 after the first clear looks.
   - accel stays wide until a burst has been seen.
   - The fraction of opponents with a clear vmax look by the end of Q1 is a reported number, not a target.
2. **No true-state read:** the new scan key's rows fall to zero for the migrated consumers.
   - **Permutation test:** swap the true profiles of two opponents with the same build. Before either has been seen
     (film off), no belief and no decision changes.
3. **Staged cushion:** an off corner against a receiver whose true vmax is 0.6 yd/s above his build's prior.
   - Rep 1 (go route): the cushion is planned on the prior.
   - Rep 2, after he has run by the corner once (a clear look): the corner's cushion and bail point grow.
   - The same with the corner's teammate as the next rep's man: it grows one play later if the huddle sync reaches him,
     and not if p_comm misses.
4. **The mis-scouted fast player:** a staged series. He gains more separation on his first deep route than on later ones
   (under-covered early, adjusted to later). We report the gap; we do not tune it.
5. **Dither:** a dither-budget pass. **Cost:** a one-game profile, under 1% tick overhead.

## 9. Questions for the user

1. Teammates' capacities known exactly (practice)? Proposed yes.
2. One record per team, shared through the huddle and the sideline with a per-player lag, as §5 proposes. Or keep the
   defense and special teams apart?
3. Officials' judgements that read true speed today (contact-holding.ts 506/511): in this scope, or a separate officials
   note?
4. Snaps on film from experience years until the management layer counts snaps; a new staff `study` attribute at 0.5
   default. Acceptable?

## 10. QB_SCOUT (QB lane to complete)

The QB lane fills this in: what QB_SCOUT holds per (QB, defender) today, which of its fields map to §3.2 (its draw:
fixed per pair per game) and §3.3, and which QB decisions read it.
