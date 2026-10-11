# Visualizer plan: views into the engine

Status: **first recording and inspection tranche implemented** (2026-10-09).
The remaining sections still describe the broader design, not completed views.
See [the recording/export handoff](archive/reviews/replay-telemetry-and-export.md).

Implemented: opt-in light/standard/full recording; source snapshots of jobs,
targets, movement intents, man technique, run fits and protection/block plans;
full body/support, engagement, grasp, actual requested perception and QB state;
exact coverage-job changes with causal attribution explicitly unavailable.
The standalone viewer supports player selection, an inspector, assignment,
intent, contact and perception layers, detailed events, and ranged WebM video
export. Legacy position-only files remain readable and label missing channels.
Optional telemetry is stored losslessly as per-play gzip/base64 and decoded
locally on selection, with at most three decoded plays retained. Positions and
events remain immediately available in the standalone HTML.

Still pending: complete decision instrumentation, compact columnar channels,
a TypeScript viewer build sharing the engine's types, camera presets, full
pre-snap art, carrier lane scoring, pitch control, swimlanes, automatic diagnoses
and paired comparisons. Snapshots currently use versioned JSON at replay cadence,
inside the per-play gzip channel. Six full inspection fixtures use 92–176 KB per
play gzipped, so the proposed 150 KB budget is not yet consistently met.

## 1. Goal and principles

The viewer (`viewer/replay.template.html`, the film room) draws a top-down
replay from frames that hold only each player's position and facing, the ball
and the carrier, plus a list of events. That shows *where* everyone went. It
can't show *why*: what a player saw, what he thought the play was, which rule
he was running, how a block was being won or lost, or why a tackle took 1.4 s.

The goal is a set of switchable views over one play timeline, each answering
one question about what happened under the hood.

Principles:

1. **Show engine truth, recorded at the source.** Every overlay draws state the
   engine actually used at that tick (a defender's believed receiver
   position, a block's hand control, a QB's coverage belief). The viewer never
   re-derives or guesses it. If the engine doesn't record it, the view can't
   show it — that gap is itself a finding.
2. **Separate truth from perception.** Players act on what they perceive (lag,
   vision, belief). The most revealing overlays put the two side by side: the
   real receiver and a ghost where the corner *thinks* he is.
3. **Every decision is inspectable.** When a player changes what he's doing,
   the viewer can say what he chose, what else he considered, and what cue
   triggered it — without a timer-based reason unless the engine really uses
   one.
4. **Layers, not modes.** A view is a named preset of layers plus a camera and
   panels. Users can mix layers freely ("coverage responsibilities + QB eyes").
5. **Cost is opt-in.** Light replays stay small for browsing thousands of plays;
   full telemetry is recorded on demand (one play, a lab run, a flagged play).
6. **Built for 2D, ready for 3D.** Record heights and postures (ball z, pad
   level, lean, arm extension) now, draw them with side strips and glyphs in
   2D, so a later 3D renderer can use the same data.

## 2. What existed before this tranche

| Piece | State |
|---|---|
| Frames | `t`, `[x, y, facing] × 22`, ball `[x, y, z]`, carrier index, carrier posture |
| Events | snap, handoff, throw, catch, contact, shed, pressure, wrap, tackle, … with actor/target and a note |
| Film room | searchable library of plays, filters, top-down canvas, play controls, slot labels toggle |
| Under-the-hood state not recorded | behaviors and jobs, targets and landmarks, perception and beliefs, QB reads, engagement state (control, phi, base, push, moves), tackle bonds (grip, topple), run fits, protection assignments, carrier vision, rule decisions |

Coverage defenders already kept a job history (`CoverageDefender.history`),
and engagements, bonds and the QB mind held rich state in memory. The new
opt-in recorder copies this state at the replay boundary; it does not request
new observations or evaluate alternative decisions to fill a panel.

## 3. Foundation: the telemetry layer

The first portion is implemented in `src/sim/telemetry.ts` and the shared
types in `src/sim/types.ts`. The proposed API and complete channel inventory
below remain the broader target; they are not claims that every source emits
each listed channel or a complete causal explanation today.

### 3.1 Recording API in the engine

A single `sim.trace` object (no-op unless recording is on) with three calls:

- `trace.state(channel, agent?, value)` — per-tick continuous state (sampled
  at the replay rate, quantized).
- `trace.decide(agent, kind, { chose, options?, cue, detail? })` — a decision
  record when a choice changes (job switch, read change, cut, throw,
  shed attempt, rush move, gap choice, tackle attempt).
- `trace.link(kind, a, b, value?)` — relationships with a lifetime: block
  engagement, man assignment, bracket, tackle bond, combo block, double team,
  protection declaration.

Modules call these where the state already lives; nothing is reconstructed.

### 3.2 Channels (what gets recorded)

| Channel | Source module | Contents |
|---|---|---|
| Kinematics | `playsim`, `physics/kinematics` | position, velocity, acceleration, facing (head) and hips/shoulders, % of top speed, energy |
| Body | `physics/bodyshape`, `engagement`, `tackle` | pad level, lean, base, arm extension, on the ground |
| Ball | `playsim`, `catching` | x, y, z, spin/tumble, carrier and how secure, predicted catch point and arrival time |
| Intent | each behavior, `coverage/defender` | behavior kind, current job and target (agent or point), landmark, rule mode |
| Perception | `perception`, `coverage/reads`, `recognition` | for a selected player: perceived positions of key players and their lag; gaze direction; vision cone |
| Belief | `recognition`, `qbmind`, `coverage/reads` | run/pass belief, coverage-family belief distribution, receiver release reads, pressure estimate |
| Decisions | all behaviors | decision records (3.1) |
| Engagements | `engagement` | blocker, defender, helpers, control, phi, side, both bases, impulse, current move and whether it landed, push vector, win |
| Bonds | `tackle` | carrier, tacklers and grips, topple, stalled time, forward progress |
| Run game | `run-fits`, `blocking` (run plans), `carrier` | gap ownership and fit kind per defender, blocking plan per lineman (drive, reach, combo, climb, pull), aiming point, the carrier's candidate lanes with scores |
| Protection | `blocking` (ProtectionCoordinator) | declared assignments, cut-off points, ride state, free rushers |
| QB | `behaviors/qb`, `qbmind` | phase, current read, throw evaluations per receiver, internal clock, pocket movement intent |
| Pre-snap | `alignment`, `playcaller` | formation, personnel, call names, shown vs played coverage, checks, motion, box count, ratings and roles |

### 3.3 Format and size

- A versioned, columnar replay format: typed arrays per channel, quantized
  (positions to 0.05 yd, angles to 1°), sampled at 10 Hz for state and exact
  times for decisions/events; gzip.
- Three recording levels: **light** (today's frames + events, for the
  library), **standard** (+ intent, links, decisions), **full** (+ perception,
  beliefs, engagement internals, run-game and QB detail).
- Budget target: full telemetry under about 150 KB per play compressed, so a
  game's flagged plays fit in one file.
- Shared TypeScript types between the engine and viewer, so a renamed field
  breaks the build, not the viewer.

## 4. Viewer architecture

- **Timeline core:** one clock, scrub, step by tick, play rates (0.1×–2×),
  loop a range, bookmarks; event and decision markers on the scrub bar.
- **Layers:** a registry of drawable layers, each declaring which channels it
  needs and its legend. Layers grey out when the replay lacks their channels.
- **Views:** named presets (layers + camera + panels), switchable with keys.
- **Selection:** click a player to focus; most layers can be filtered to the
  selected player, his unit, or all 22.
- **Cameras:** all-22 (now), end zone, sideline, follow the ball, trench zoom
  (box around the line), receiver isolation (one route vs its defenders).
- **Panels:** player inspector (ratings, role, live state), decision log,
  swimlanes timeline (section 5.12), play summary.
- **Rendering:** Canvas 2D in separate stacked canvases (static field,
  players, overlays, text) to keep redraws cheap; revisit WebGL (PixiJS) only
  if full-22 overlays at 60 fps need it.
- **Build:** move from the single template file to a small TypeScript viewer
  (Vite) that still exports one self-contained HTML file for sharing.

## 5. The views

Each entry: what question it answers, what it draws, which channels it needs.

### 5.1 Pre-snap presentation ("play art")

*Who's out there and what's called?*

- Player cards over each player: name, number, position, role, overall and
  two or three relevant ratings, fatigue. Optional portrait/silhouette art
  (generated per player; CFB/Madden style) — presentation only.
- Personnel, formation and front labels; offensive play art drawn like a
  playbook (designed routes, blocking assignments, protection, the read
  progression numbered); defensive call art (coverage shell, zones,
  man arrows, blitz paths, the shown look vs what is played).
- Toggle: designed art vs what actually happened (art fades, real paths draw).
- Needs: pre-snap, intent (designed routes/assignments already exist in the
  playbook).

### 5.2 Assignments and responsibilities

*Who is responsible for whom and where, at every moment?*

- Man lines (defender → receiver), bracket pairs, zone landmarks and their
  areas, curl/flat/hook labels; rule mode tags ("carry #2", "zoned off",
  "trap", "cut").
- Run fits: each defender's gap and fit kind (force, alley, cutback, spill)
  drawn as colored gap markers on the line.
- Protection: who has whom, free rushers flagged, the back's scan.
- Changes flash when they happen and link to the decision record.
- Needs: intent, links, run game, protection.

### 5.3 Leverage

*Who has the better position in each matchup?*

- For each defender-receiver pair: shade (inside/outside), cushion, the
  receiver's stem direction, in or out of phase, and where help is.
- Coloured by advantage, with a timeline of separation for the selected pair.
- Needs: kinematics, intent, links.

### 5.4 Perception and thought process ("mind view")

*What does this player think is happening?*

- Ghosts: where the selected player perceives others to be (with their lag),
  next to where they really are.
- Vision cone and gaze target; blind side shaded.
- Belief meters: run/pass, the release he's read for each key receiver,
  coverage family (for the QB).
- Thought bubble: current job and the cue that put him in it ("#2 declared
  out at 5 yd → trap").
- Needs: perception, belief, decisions.

### 5.5 QB view

*Why did he throw it there, then?*

- Vision cone, current read highlighted in the progression, eyes moving
  through it.
- Throwing windows: for each receiver, the throw evaluation (completion,
  catch-point separation, risk) shown on the field and in a panel.
- Coverage belief before and after the snap; disguise tells.
- Pocket: pressure estimate (time to the nearest threat), internal clock
  state, pocket movement intent (climb, slide, escape lanes).
- Needs: QB, belief, perception.

### 5.6 Trench view

*How is each block being won or lost?*

This is where 2D hides the most. Use a zoomed camera plus glyphs and a side
strip:

- Engagement glyph per pair: hand control (who has inside hands), phi (how
  far around the blocker the rusher has worked), each player's base, the
  push vector and its strength, the current move (bull, swim, rip…) and
  whether it landed, a win meter.
- Pocket polygon: the shape of the pocket over time, its depth, and the QB's
  space.
- Side-elevation strip: for the selected pair, pad level and lean drawn side-on
  (who is lower), with depth behind the line on the x-axis.
- Pressure: attached vs free pressure markers (NFL comparison from
  `nfl-pocket-push.json`).
- Needs: engagements, body, protection.

### 5.7 Ball and possession

*Who has it, how secure is it, where is it going?*

- Carrier highlight and ball security meter; handoffs and pitches as
  transfers.
- Ball flight with a height shadow and an elevation strip (z over distance),
  predicted catch point and arrival time, contested catch outcome.
- Needs: ball, events.

### 5.8 Contact and tackling

*Why did the runner get those yards after contact?*

- Tackle bonds: each tackler's grip, topple progress, stalled time, forward
  progress line.
- Momentum vectors at contact, missed/broken tackles marked with the reason
  (angle, grip, balance).
- YAC split: yards before and after first contact.
- Needs: bonds, kinematics, decisions.

### 5.9 Run game

*Where was the hole and why did he cut there?*

- Blocking plan per lineman (drive, reach, combo, climb, pull path), combo
  hand-offs to the second level.
- The carrier's candidate lanes with scores at each decision, the lane chosen.
- Defender fits filling or failing.
- Needs: run game, decisions.

### 5.10 Space and geometry

*Where is the space?*

- Pitch control (who can reach each point first), open windows, separation
  lines, pursuit angles and intercept points.
- Computed in the viewer from kinematics with the engine's own time-to-reach
  function (shared code), so it matches what players use.

### 5.11 Physics

*Is the movement physically right?*

- Velocity and acceleration vectors, % of top speed, fatigue, traction use
  (cut sharpness vs limit), collision normals.
- Mostly for engine debugging.

### 5.12 Timeline and decisions panel

*What happened, in order?*

- Swimlanes: one row per player, coloured bars for jobs and techniques, ticks
  for decisions and events, links drawn between lanes (engagement, man,
  bond).
- Click a mark to jump the clock there and open the decision record.

### 5.13 Diagnostics ("why did this happen")

*What broke on this play?*

- Automatic flags with a jump-to: free rusher, blown coverage (a receiver with
  nobody responsible), missed fit, late rotation, broken tackle, QB hold time
  outlier.
- Each flag compares to the NFL reference where one exists.
- Feeds the film-room filters so you can search for "plays with a free rusher
  against Tite".

### 5.14 Comparison

*What changed?*

- Paired replays (same seed, a changed rule or call) side by side or as a ghost
  overlay.
- NFL tracking reference clips where the data allows (positions only).

## 6. The 3D question

Keep the engine's 2D movement for now, but record heights and postures
(ball z, pad level, lean, arm extension, on the ground) in the body channel.
In 2D they appear as glyphs and side strips (trench, ball flight). A 3D
renderer (three.js) can later consume the same telemetry without engine
changes.

## 7. Build order

Current phase status: 0 is partial (truth snapshots, levels and lazy per-play
compression complete; columnar format and complete decisions pending). Phase 1 has player selection,
inspector/layers and assignments, man technique and ball detail; named presets,
cameras and a typed viewer build remain pending. Early phase 2/3 data and
inspection panels expose real block/grip/body/QB values without claiming the
full proposed trench glyphs or QB candidate evaluations. Phases 4–6 remain
planned, apart from basic fit/block-plan inspection and event/decision lists.

| Phase | Deliverable | Done when |
|---|---|---|
| 0 | Telemetry API + format + light/standard/full levels; shared types | A full replay of one play records intent, links and decisions for all 22 within budget |
| 1 | Viewer shell (timeline, layers, views, selection, cameras, panels) + Assignments, Leverage, Ball views | Switching views on a recorded play shows each player's job and target at every tick |
| 2 | Trench and Contact views | Engagement glyphs and bonds match the engine values tick by tick (checked by a test that reads the trace) |
| 3 | Mind and QB views | Ghosts, beliefs and throw evaluations drawn for any selected player |
| 4 | Run game, Space and Physics views | Carrier lane scores and pitch control drawn |
| 5 | Pre-snap presentation (player cards, play art, art assets) | Pre-snap screen with cards and both play arts |
| 6 | Timeline panel, Diagnostics, Comparison | Flags searchable in the film room; paired ghost replays |

Phases 0 and 1 are the foundation; after that the order can follow whichever
engine area is being worked on (trench work → phase 2 first).

## 8. Open questions for the user

1. Player art: generated illustrated portraits, silhouettes by body type, or
   plain cards? (Affects only phase 5.)
2. Should the viewer stay a single shareable HTML file, or is a local app (dev
   server) fine for the full-telemetry views?
3. Priority among the views — the default order above starts with
   assignments and the trenches.
4. Any NFL-broadcast style overlays wanted (first-down line, down and
   distance bug, Next Gen Stats style cards)?
