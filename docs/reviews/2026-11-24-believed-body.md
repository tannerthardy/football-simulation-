# The believed body: what a player believes about an opponent's physical capacities (design note)

Flex with the QB lane, 2026-11-24, for Integration's review with the user. Design only; no code. It generalises the QB
lane's `QB_SCOUT` (and replaces develop's `QB_BELIEVED_DEF`) into one belief that every decision reading another player's
capacities goes through. The requirements are the user's:
- speed comes from build, then film, then watching him move;
- strength is learned by feel, in contact;
- learning is fast and step-like on a clear look or one rep ("that guy can run", "strong as an ox");
- teammates and coaches tell each other.
- The structure must carry the later information-and-communication system (coaches watching, noticing and relaying, with
  real friction) without a rewrite.

Numbers marked *measured* come from the engine's own generated population (§4.1); numbers marked *chosen* are stated
design choices, to be checked by the gates in §10, not fitted to any outcome.

## 1. The structure: holders, sources, channels

Nothing is known by "the defense" as one mind. Every belief has a **holder** and every piece of it a **source**. Sharing
is an explicit **message** over a **channel**.

- **Holder:** whoever believes it. In the first build, a player. Later, a coach (head coach, coordinators, position coaches
  and assistants), who watches different things and relays to others.
- **Belief** `belief[holder][B]`: per capacity c, a `mean`, an `sd` and a `floor` (what B has been seen or felt to do at
  least), and the list of evidence entries that produced it.
- **Evidence entry:** `{ capacity, value, sd, kind: 'floor' | 'measure', source, at }`. The source is one of:
  - `appearance`: his build, seen;
  - `film`: a pre-game report, and from whom;
  - `saw`: his own picture, which play and when;
  - `felt`: his own body in contact, which play and which rep;
  - `told`: by whom, over which channel, at what time, carrying the teller's entry.

  The belief is the precision-weighted combination of its entries, and the floor is their maximum. Keeping entries rather
  than only a running mean is what lets a later system answer "who told you that" and drop or reweight a bad source.
- **Message:** `{ from, to, about B, entries, channel, sentAt }`.
- **Channel:** `{ name, delay, capacity (items per send), pLost, pWrong }`. A message arrives after the channel's delay,
  or not at all (pLost), or with its value distorted (pWrong; *chosen*: a told value carries the teller's sd plus a
  telling sd of 0.1 yd/s for speed, and is marked `told`).
- **Accessor:** decisions read only `believed(holder, B)`, which returns:
  - `mean(c)`, `sd(c)` and `floor(c)`;
  - `q(c, p)`, a quantile, so a decision can plan for the fast or strong case (a corner's cushion, a tackle's set) or the
    likely one (a pursuit angle). How cautious to be is the player's choice.
  - `asProfile()`, the means raised to their floors, for code that takes a PhysicalProfile.

No decision reads B's true profile.

## 2. The minimal first build, and what it leaves open

**Built first:**
- Holders are players only.
- Two channels:
  1. **own**, the player's own observation (saw, felt): no delay, nothing lost;
  2. **unit between plays** (the huddle): each player on the field who added a `saw` or `felt` entry this play sends it
     to every teammate on the field.
     - Delay: until the next snap.
     - Capacity: 2 items per player per huddle. **Stated choice, not measured:** the opponents he noticed most, by the
       size of the step.
     - pLost = 0.15 − 0.13 × the receiver's awareness. **Stated choice, not measured.**
     - pWrong = 0 in the first build.
     - **He tells what he saw, not what he believes:** only his own entries from this play (floors and measurements),
       re-sourced as `told`. Passing his whole belief would hand the hearer his build prior and film a second time.
       Step 2's first version did that, and the hearer's sd halved with no new evidence.
     - It reaches only that unit. The defense's players learn about the opposing offense and do not pass it to their
       own offense (Integration's default, 2026-11-24).
- **Pre-game film** enters each player's belief at kickoff as a `film` entry from "the staff": one report per (team, B,
  game), the same for every player on the team (§4.2). It is not a runtime channel yet. It is the coaches' message,
  delivered without friction until coaches are holders.
- **Between series:** the players coming on get the unit's entries over the same huddle channel, run once on the sideline.
  This stands in until the sideline is its own channel.

**Left open for the communication system** (it sits on these types with no rewrite):
- **Coaches as holders**, each watching a part of the field, with their own notice rate and their own errors.
- **Channels:** the sideline between series (its own delay and capacity), at the line (calls and alerts before the snap),
  the headset (coordinator to the green-dot player), and coach-to-player.
- **Friction:** finite capacity, lost and wrong messages, and a message's value decaying with its age.
- **Choosing what to say** (which opponent and which capacity is worth a slot), and **trust per source** (a holder
  weighting a teller by his record).
- **The same structure for things that are not bodies.** A recount of the receivers after motion is a message on the
  "at the line" channel. Today's stale numbering after motion is that message not yet modelled. A coverage check, a
  protection slide call and a run-fit adjustment are the same.

## 3. What is not a belief

- **His own body:** proprioception. What he feels of his own effort in contact is exact.
- **Visible build:** height, weight / frame, and so size and radius. This is appearance, seen with a small error (§4.1).
- **His teammates' capacities:** known exactly, from practice (Integration's default, 2026-11-24; reversible).
- **Physics and officials:** contact resolution (tackle.ts, engagement.ts force terms) is not a decision. Officials'
  true-speed reads (contact-holding.ts 506/511) are out of scope (Integration's default).

## 4. Sources of evidence

### 4.1 Appearance prior (every holder, from the first sight)

The prior is the engine's own population relation between build and capacity: an OLS fit over a generated league (64
teams, 3264 players; generator + `derivePhysical`; `scripts/diag/belief/body-prior-fit.mts`). There is no position table,
so it works for anyone, a ball carrier included. *Measured*, with u = (weight − 250) / 50 and h = (height − 74) / 2:

| capacity | prior mean | sd left after build | sd across all players |
|---|---|---|---|
| vmax (yd/s) | 8.92 − 0.85u − 0.053u² − 0.02h | 0.22 (0.17–0.25 by weight band) | 0.87 |
| accel = vmax/tau (yd/s²) | 7.04 − 0.72u − 0.15u² − 0.05h | 0.81 | 1.12 |
| brake (yd/s²) | 6.28 − 0.52u − 0.086u² − 0.05h | 0.38 | 0.68 |
| lateral (yd/s²) | 6.38 − 0.57u − 0.14u² − 0.02h | 0.42 | 0.73 |
| power (kg-g) | 113.2 + 38.3u + 0.8u² − 2.0h | 9.1 | 36.0 |
| power per kg | 1.00 + 0.145u − 0.017u² − 0.019h | 0.081 | 0.143 |

**What the numbers say:**
- Build tells a holder most of a man's top speed and most of his raw power, because both are largely mass.
- It tells him little about burst and cutting.
- It leaves about ±8% (1 sd) of strength for his size. A man two sd strong for his frame is the surprise "strong as an
  ox" describes.

The coefficients are constants in code. A test re-fits them on a generated league and fails if they drift beyond
tolerance, so the prior follows the generator.

**Appearance error:** each holder sees B's weight off by one draw (sd 8 lb, *chosen*), fixed per (holder, B, game). That
adds about 0.14 yd/s to vmax's sd (≈ 0.26 in all) and about 6 kg-g to power's.

### 4.2 Film: the staff's pre-game report

What film may be derived from: B's true in-pads vmax, accel, brake and lateral, and his power only vaguely (film shows a
man moving people, not the force). Nothing else.

How: one report per (team, B, game), `film = true + e`, e ~ N(0, σ_film), drawn once from the game's seeded stream. It is
never truth × rating.

- σ_film = σ₀ / √(1 + n / n₀).
- n = B's snaps on film. Until the management layer counts snaps, n ≈ 500 × experience years (*chosen*).
- n₀ = 150 × the staff's `study` (a new coach attribute, default 0.5; a management knob).
- σ₀ (*chosen*): vmax 0.30 yd/s, accel 0.8, brake / lateral 0.4, power per kg 0.08 (no better than appearance until
  many snaps).

| B | film sd on vmax | belief at kickoff (with appearance) |
|---|---|---|
| rookie | none | appearance only, about 0.26 |
| one season (n ≈ 500) | 0.11 | about 0.10 |
| veteran (n ≈ 2500) | 0.05 | about 0.05 |

This is "coaches warn the unit about a known burner": a veteran's speed is known going in, a rookie's only by his build.

A holder who studies more could later hold a sharper copy of his own (a quarterback's film work). That is a per-holder
film entry, which the structure allows; the first build has only the staff's report.

### 4.3 Saw: clear looks at speed and burst (in-game)

**Observations** come only from the holder's own perceived picture: `sim.see` / `sim.track`, delayed, noisy, with acuity
worse off his gaze (PERIPH_ACUITY).

**A clear look at top speed:**
- B runs near-straight for at least 0.6 s, his seen speed on a plateau (seen acceleration under 1 yd/s²);
- B is within the holder's useful view;
- the holder is not engaged with someone else.

That gives a measurement v̂ with sd σ_obs = his velocity noise / √samples.

- **Always a floor:** max(floor, v̂ − 2σ_obs). He has seen B do at least this. It never goes down.
- **A full-effort context makes it a measurement,** not just a floor. The context is B carrying the ball at 90% or more
  of the top speed the holder believes (*chosen*). The measurement's sd is √(σ_obs² + σ_effort²), σ_effort = 0.15 yd/s
  (*chosen*).
- **A route is not full effort here.** This was corrected by step 2's gates (2026-11-24).
  - A go-route receiver with true vmax 10.87 is seen at 8.7 yd/s by 4.5 s: routes run at 0.94 of vmax, and in-pads
    burst is slow.
  - Treating a vertical stem as a measurement pulled beliefs down.
  - So a route's plateau is a floor only, and so is a carry under 90% of the believed speed.
- **One or two clear looks bring vmax's sd to about 0.1–0.15.** That is the step the user describes; there is no drift.
- **Being outrun on a fair angle:** while the holder runs at 90%+ of his own known top speed on a closing angle, B
  gaining ground is a floor from his own body. B's speed ≥ his own plus the gain rate.

**A clear look at burst:** B's seen speed rising out of a near-stop while he carries the ball gives a measurement of
accel. Route releases are excluded: over 2 games they made the burst belief worse (error 0.18 → 0.22), the same effort
bias as speed. Until a burst is seen, accel stays at its prior and film value. What he has not shown stays uncertain.

**Ratings act only here:** perception quality (existing acuity and reaction) sets σ_obs; awareness sets the chance he
registers a clear look at all (*chosen*: 0.7 + 0.3 × awareness).

### 4.4 Felt: strength in contact (in-game; the user's addition)

Strength is learned by feel, faster and more reliably than speed by sight. The evidence is the holder's own body in
contact, which he knows exactly: his own effort and his own displacement. It is not B's force, which he cannot sense.

**A rep is an engagement or a tackle contact lasting at least 0.3 s** (*chosen*). Over the rep he knows:
- his own push effort as a share of his own capacity;
- his own displacement, and its direction relative to where he was driving;
- whether his anchor held: he did not give more than 0.5 yd against B's drive.

**What a rep says:**
- **"Moved me while I gave full effort":** the outcome he felt, set against what his belief of B's power predicted for
  that effort. Put through the same contact relation the engine uses, it gives a measurement of B's effective power
  relative to his own.
  - sd: 0.06 power-per-kg units for a full rep (*chosen*: tighter than one clear look at speed, so one rep almost
    settles it).
- **"My anchor held / he could not move me":** a ceiling-side measurement of B's drive. **"I moved him":** a floor-side
  one of his anchor.
- **Contact is noisy evidence** of power, mixed with leverage, footing and technique. So only reps in which the holder
  himself was square and set count as full; others count at double the sd. That is his judgment of the rep, from his
  own body.

**What he learns is what the physics delivers.** The belief estimates B's effective strength as felt, whatever the
engine's contact law produces.
- **Dependency (re-measured on develop d31271e42 with `scripts/diag/effective-mass/anchor-staged.mts`):** both legs
  already push at the traction limit.
  - Power ×1.15 leaves the walk-back unchanged (1.16 → 1.16 yd/s).
  - Blocker mass ×0.9 raises it to 1.57.
  - The NFL's held pairs walk back 1.3–1.6 yd/s whatever the weights (3df1b2639).

  Until the push contest stops being traction-capped, "felt" will mostly confirm mass and rarely surprise. The belief is
  still right; the surprise arrives when the physics does. This went to Integration and Defense as a physics gap,
  2026-11-24.

**Consumers of felt strength** (each a decision a player makes on what he believes):
- the pass blocker's set and the rusher's choice of move (a tackle walked back once sets deeper and anchors earlier; a
  rusher who felt a soft anchor goes to power);
- the run blocker's and the defender's choice to stack or to escape;
- the tackler's aim (high and wrap against a man he felt run through him, low against one he can stand up);
- the carrier's choice to run through or around a man.

## 5. Commitment

A belief changes only by an entry: a clear look, a rep, or a message at the huddle. All are perceived changes. A decision
that re-plans because its belief stepped is deciding on a new picture, which the commit rule allows. Nothing is
re-estimated per tick, so it adds no dither. It goes through the dither-budget test as a gate.

## 6. Memory

Within a game, entries do not decay. Across games is the management layer's question. The first build drops all entries
at the end of a game except the staff's film.

## 7. Cost

- **Beliefs:** one per (holder, opponent the holder has an entry about). In practice each player holds entries about the
  few opponents he saw, felt or was told about. That is about 22 × 11 at most, and far fewer actually filled.
- **Entries:** a handful per belief. The combination is cached and recomputed only when an entry is added.
- **Observation checks:** only for opponents he attends to (his man, his key, the carrier, the man he is engaged with).
- **Huddle:** at most 2 items per player per play.
- **Expected overhead:** under 1% of tick time. A one-game profile is a gate.

## 8. Consumers: the current true-state reads this replaces (migration)

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
| `behaviors/qb.ts` 1521, 2643, 2911, 3134–3150 | QB_BELIEVED_DEF / QB_SCOUT `believe`, `bodyFor` | his belief of a defender (§12) |
| `behaviors/blocking.ts` 612 | r.profile.vmax | a rusher's forecast path in the protection |
| strength consumers (§4.4) | engagement / blocking / tackle decision code | set, move choice, aim, through-or-around: the reads are listed as each is migrated (most use the actor's own power today and an implicit guess of the opponent's) |

Reads that stay:
- radius, massKg and heightYd of others (visible build);
- reach (roughly visible; truth for now, a later capacity);
- the actor's own profile;
- a teammate's (practice), e.g. `qb.ts` 3000–3001 for his own receiver.

Out of scope as non-decisions: tackle.ts 366/376 (physics), engagement.ts' own-body reads.

The migration runs one consumer per step, each behind its own flag, with the scan rows falling as each lands. The
order: coverage (the cushion, the user's example), then pursuit, then the QB (QB_SCOUT onto the shared type), then the
strength consumers. The strength consumers follow the anchor physics fix, or measure what felt learns before it.

## 9. Example of the same structure: the receiver recount after motion

Today a defender's numbering of the receivers (who is #2, #3) is not updated as a communication event after motion. In
this structure:
- a recount is an entry (`saw` for the man who sees the motion), followed by a message on the "at the line" channel to
  the defenders whose assignment depends on it;
- its delay is the time left before the snap, its capacity is one call, and its loss is real (the busted coverage after
  late motion).

The first build does not add this channel; it is the template for it.

## 10. Gates

1. **Belief error over a game:** per capacity, |mean − true| and sd by play index, per holder, on 8 games.
   - vmax starts near 0.26 for rookies and 0.05–0.10 with film.
   - It steps to about 0.1–0.15 after the first clear looks.
   - accel stays wide until a burst has been seen.
   - Power per kg steps to about 0.06 after one full rep.
   - The share of opponents with a clear look or rep by the end of Q1 is reported, not targeted.
2. **No true-state read:** the new scan key's rows fall to zero for the migrated consumers.
   - **Permutation test:** swap the true profiles of two opponents with the same build. Before either has been seen or
     felt (film off), no belief and no decision changes.
3. **Staged cushion:** an off corner against a receiver whose true vmax is 0.6 yd/s above his build's prior.
   - Rep 1 (go route): the cushion is planned on the prior.
   - Rep 2, after he has run by the corner once: the corner's cushion and bail point grow.
   - A teammate's grows one play later if the huddle message reaches him, and not if it is lost.
4. **Staged anchor:** a tackle against a rusher two sd strong for his size. After one bull rep that walks him back, the
   tackle's next set is deeper and he anchors earlier; a teammate guard told in the huddle shades his help.
5. **The mis-scouted fast player:** a staged series. He gains more separation on his first deep route than on later ones.
   We report the gap; we do not tune it.
6. **Dither:** a dither-budget pass. **Cost:** a one-game profile, under 1% tick overhead.

## 11. Decisions (Integration's defaults put to the user, 2026-11-24; reversible)

1. Teammates' capacities are known exactly (practice).
2. There is no team-wide record. The first build has players as holders, their own observation and the unit's
   between-plays channel; the defense does not pass what it learns to its own offense.
3. Officials' true-speed reads are out of scope.
4. Film quality comes from experience years plus a staff `study` knob, a labelled stand-in until snaps are counted.

Build order: step 1 adds the decision-information scan key for reads of another agent's capacity, so each later step
lowers a counted row. Then one consumer per flagged step: coverage (DeepCoverage's cushion and the release-burst reads),
then pursuit with Defense, then the QB with the QB lane, replacing QB_SCOUT's blend.

## 12. QB_SCOUT today and how it maps (QB lane)

**What it is.** QB_SCOUT is the QB lane's per (passer, defender) report: `scoutReport(a, d)` in `src/sim/behaviors/qb.ts`
(patch `docs/reviews/patches/engine71-footwork/qb-scout-screen-seen-on-703fc628.patch`, e0731a3a8; `test/qb-scout.test.ts`).
- report = typical(position) + k · (truth + film error − typical);
- k = clamp(SCOUT0 + SCOUT_AWARE · playRecognition + SCOUT_EXP · min(1, experience / 8));
- film error sd = FILM_ERR · |typical| · √(FLOOR² + (1 − FLOOR²) / (1 + defender experience / FILM_YEARS)), drawn from
  Rng(hash(passer | defender)): fixed per pair and game, new for a substituted man;
- ballSkills and manCoverage the same way, with an absolute error;
- `bodyFor(a, d)` is the helper every reach estimate uses.

**What carries over:**
- The per-pair seeded draw becomes the staff film entry and the holder's appearance error. Both are seeded per (team or
  holder, B, game) the same way.
- The film error shrinking with the defender's experience is §4.2's σ_film(n).
- `bodyFor` becomes `believed(qb, d).asProfile()`.

**What changes:**
- The typical-by-position mean becomes the appearance prior from build (§4.1). This also removes its fallback to truth
  for a position with no typical entry, which the QB lane flagged as a weak spot.
- The k-weighted blend toward truth by the passer's ratings goes. A rating may not scale the truth. The passer's
  recognition and experience act instead on his own perception (σ_obs, registering a look) and, later, on a film entry
  of his own (§4.2).
- In-game looks (§4.3) now update what he believes about a defender's speed. Today it is fixed for the game.

**Skills, not bodies.** ballSkills and manCoverage are skills; the same holder / source / channel types carry them later
(film, then what he sees the man do). This note covers bodies; QB_SCOUT's skill fields stay as they are until a skills
note.
