# Automatic QB Read-Plan Compiler

**A research-backed design for deriving multiple realistic quarterback progressions from arbitrary pass concepts without per-concept hand tagging**

**Prepared:** November 11, 2026  
**Target:** `tannerthardy/football-simulation-`  
**Status:** Technical research and proposed design; **not an implemented feature**  
**Primary requirement:** A newly authored route concept should automatically receive several plausible, executable read plans. Coaching philosophy should control the preferred installation while the quarterback executes that installation from its own information, at realistic rhythm and with imperfect recognition.

---

## Executive recommendation

Build an **offline/deterministic read-plan compiler** that accepts existing route geometry, formation, receiver numbering, route options, release timing, drop/protection and a coaching profile. It first computes **spatiotemporal route relationships**, then creates a handful of **valid decision graphs** using a compact library of generic patterns, and finally ranks these graphs with a **modern-NFL-informed prior favoring pure progression while retaining meaningful hybrid, pick-a-side, key-defender and matchup styles**.

Crucially, the compiler **must not inspect the actual defensive play call or the simulation's eventual outcome**. It may use generic defensive role templates and scouting priors to evaluate robustness. It outputs an *installed plan*, not an omniscient target chooser. At runtime, the QB perceives the defense through existing `QBMind` and `ReceiverForecast`, follows the graph with realistic scan/footwork budgets, and may misidentify cues or miss timing windows.

**The one-sentence architecture:**

> **Routes → geometry/timing graph → generic football read motifs → candidate QB plans → coach-ranked installed plan → QB's imperfect execution.**

A sensible first version generates three candidates per ordinary pass concept: (1) a **pure progression** with alerts and an outlet; (2) a **half-field / coverage-conditioned plan** if its route distribution supports one; and (3) a **local conflict-key plan** only if the offense's routes genuinely stress a recognizable defender role. It then uses a default **pure-progression-leaning hybrid** coach profile. Other candidates remain available for other coaches, practices, future league generation, and experiments. It must also be allowed to produce **one** candidate when only one is credible.

The work should be implemented in stages, with no broad pass-efficiency tuning during the compiler's initial validation. Read assignments should be inspectable and explainable: why a particular receiver is first, which routes are alerts versus primary targets, what defender is keyed, which throw window is intended, and why a competing read-plan candidate lost.

---

# Part I — What the NFL evidence really says

## 1. Is pure progression the NFL meta in 2025–26?

**Best reading of the available firsthand evidence: yes, it is highly influential and arguably the modal teaching orientation in several prominent offensive trees; no, there is not a published league-wide classification that permits a precise frequency claim.** The underlying distinction is also more nuanced than the online debate suggests.

- **Kyle Shanahan (December 20, 2025 press conference):** says his offenses increasingly *majored* in across-the-board progressions around **2015**, describing the evolution from pre-snap one-high/two-high side selections. This is one of the strongest direct chronological confirmations of the trend. [Shanahan transcript](https://49ers.1rmg.com/transcripts/head-coach-kyle-shanahan-press-conference-12-20-25/).
- **Joshua Dobbs (February 2026, quoted by *The Ringer*):** describes how Shanahan-system quarterbacks often start their eyes and feet in the same place regardless of coverage; progression takes them toward the answer. [The Ringer](https://www.theringer.com/2026/02/05/nfl/drake-maye-sam-darnold-super-bowl-quarterback-progressions).
- **Kirk Cousins (December 2025):** contrasts his early-career coverage-based, pick-a-side system with a subsequent shift to full-field progression, in part because defenses disguise the shell until well into the drop. He also emphasizes the downside: quarterbacks cannot mechanically stare at five reads while the rush arrives. [Sports Illustrated account of his remarks](https://www.si.com/nfl/kirk-cousins-masterclass-explaining-how-to-play-qb-in-nfl); [extended reporting](https://sports.yahoo.com/articles/pure-progression-reads-why-everybody-105800449.html).
- **Wes Phillips and Kevin O'Connell (December 2025 reporting):** Phillips describes much of Minnesota's dropback passing as pure progression; O'Connell stresses that a QB *still* reads defenders inside that progression and that knowing coverage can accelerate decisions. [Star Tribune](https://www.startribune.com/minnesota-vikings-jj-mccarthy-pure-progression-reads-nfl-qbs/601539469).
- **Grant Udinski (December 2025 remarks):** Jacksonville uses a **mixture** of coverage reads and progressions according to play, situation, and the quarterback. [Contemporaneous reporting](https://sports.yahoo.com/articles/pure-progression-reads-why-everybody-105800449.html).
- **Mike Kafka (December 2025 remarks):** notes coverage-based, pure progression, half-field, and favorable one-on-one reads within the same offensive teaching discussion; stresses synchronizing the route, QB feet and protection. [Sports Illustrated](https://www.si.com/nfl/giants/onsi/big-blue-plus/giants-ihc-mike-kafka-dives-into-detail-about-progression-vs-coverage).
- **Drake Maye / Kurt Warner (February 2026):** distinguish the benefits of simplifying the order from the benefits of recognizing the coverage early enough to bypass dead reads; they explicitly describe hybrid approaches. [The Ringer](https://www.theringer.com/2026/02/05/nfl/drake-maye-sam-darnold-super-bowl-quarterback-progressions).
- **Joe Moorhead's 2026 clinic:** explicitly teaches *both* progression-read concepts and coverage-read concepts, including a pre-snap coverage checklist and post-snap confirmation; route reads, rhythm/hitch timing and protection remain connected. [Clinic overview](https://coachandcoordinator.com/joe-moorhead-dropback-pass-game-lfg-clinic/); [pre-snap framework](https://coachandcoordinator.com/qb-pre-snap-coverage-recognition-joe-moorhead/).

**Conclusion for this engine:**

1. A **pure progression baseline** is more defensible than forcing every play to first determine Cover 1 versus Cover 3 versus Cover 4.
2. Pure progression **does not mean ignoring coverage**. The eyes start in a stable place; the receiver's actual leverage, likely closing defender, separation and route window still decide *take versus advance*.
3. A scheme-wide coach should **lean** toward an approach, not decree one immutable read family for every concept.
4. The compiler should support **alert + fixed progression**, which is probably a more useful baseline than a naively fixed `1→2→3→4→5` list.
5. **No researched percentage** proves that 65%, 75%, or 90% of NFL pass calls are pure progression. Any numerical percentages used initially are simulation priors to be tested and replaced when a sufficiently trustworthy film-label sample exists.

### The danger of over-learning the social-media debate

"Pure" and "coverage based" are **install language**, not observable labels that automatically appear in tracking data. One cannot reliably infer the quarterback's coached read solely from the identity of the targeted receiver, gaze direction, or whether a safety rotated. The available public evidence is strong on *existence and trends*, weaker on *league-wide incidence*. This matters for calibration: do **not** make a coach's style distribution an allegedly measured NFL fact.

## 2. A taxonomy of teachable read systems

The following families can coexist inside one coaching staff and sometimes inside one play.

| Family | Fundamental QB instruction | What compiler must detect | Main failure mode |
|---|---|---|---|
| Pure progression | Work these eligible targets in order, rhythmically | Target-ready times, primary/clearout roles, eye-travel cost | Too many late reads, fails to exploit obvious structure |
| Pure progression with alerts | Check special access/vertical/matchup, then work sequence | Isolated opportunities + normal progression | Alert overused, destroys rhythm |
| Coverage-conditioned pick-a-side | Read shell/rotation, choose half, then run local sequence | Two viable side concepts and an observable branch cue | Wrong recognition sends QB to wrong side |
| Local defender key | Read a specified conflict defender; throw where he leaves | Two routes stress one *role* | Guesses defender ID or assumes coverage truth |
| Triangle / 3-level | Read a local three-route geometry, often high-low or middle-out | Three routes with useful depth/width separation | Confuses clearout with primary |
| Scan / macro-to-micro | Choose region/side first, then key or sequence within it | Cross/flow structure, feasible line of sight | Excessive scan time, unstable region selection |
| Matchup / isolation | Check designed isolated receiver, then progress | Valid isolation and access, route eligible | Chooses star receiver with no structural justification |
| Choice/option-based | Shared route options, QB reads receiver and leverage | Installed route options and their key defenders | QB accesses receiver's private chosen branch |
| Hot / sight adjustment | On credible extra pressure, take installed immediate answer | Actual protection capacity and hot-eligible route | Arbitrarily selects fastest receiver, ignoring sight rules |
| Screen / RPO special | Execute called screen or pre-snap/mesh decision | Called constraint and release/block timing | Screen becomes conventional progression |

A clinic explicitly organizes QB training into **progressions, defender reads, matchups and combination approaches**, and uses **weak/strong/middle triangles** to reuse instruction across formations. [X&O Labs: Using Read Families to Train QB Progressions](https://xandolabs.com/the-lab/position-groups/quarterback/pass-game-mechanics-quarterback/using-read-families-to-train-qb-progressions/). It supports the core idea that **the same few read families can be applied to many route combinations**.

## 3. Why timing, feet and the pocket are part of the read

A proper read is a *scheduled opportunity*, not simply a receiver on a list. Mike Kafka and Joe Moorhead both stress that protection, drop, route depth and the quarterback's footwork interact. [Kafka](https://www.si.com/nfl/giants/onsi/big-blue-plus/giants-ihc-mike-kafka-dives-into-detail-about-progression-vs-coverage); [Moorhead](https://coachandcoordinator.com/qb-pre-snap-coverage-recognition-joe-moorhead/).

Every plan therefore needs:

- **Pre-snap preparation**: what the QB checks *before* the snap; can be an alert, shell prior, pressure count, isolated matchup.
- **Post-snap scan path**: which *region* or *defender* receives the initial gaze.
- **Rhythm schedule**: when a target enters and exits the plausible throw window relative to drop/set/hitches.
- **Advance conditions**: covered, window expired, keyed defender moved, QB has insufficient time, or the progression's planned read count is exhausted.
- **Outlet conditions**: available back release, immediate pressure, late pocket clock.
- **Fallback when branch unresolved**: a stable, installed sequence instead of omniscient targeting.

**Do not reinterpret pure progression as "never seeing defenders."** It means the *ordering* normally does not require successfully labeling the coverage. Defender leverage still determines whether a receiver is viable at his read.

---

# Part II — Design constraints from the real repository

## 4. Current architecture inspected on `develop` (November 11, 2026)

Relevant live files:

- [`src/playbook/types.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/playbook/types.ts): `PassConcept` includes route maps by strong/weak receiver number, `back`, `drop`, `family`, and a required `progression: ReceiverRef[]`. Route definitions include waypoints, depth, family, and possible `RouteRead` branches.
- [`src/playbook/concepts.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/playbook/concepts.ts): **17 ordinary pass concepts** (counted from the inspected array) with hand-written `progression` arrays, plus separate screen concepts. Y-Cross has strong-side go/cross/flat, weak-side post/hook, check back, and `['S2','S3','W1','B']` currently.
- [`src/sim/behaviors/qb.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/sim/behaviors/qb.ts): `QBPass.init()` maps progression refs to agents, appends other available routes as late options and constructs an ordered list. `orderReads()` can move a fast route first if blitz expected or prioritize a favorable man matchup. It then uses `readIdx`, `readStart`, `ready()`, `evaluate()`, and `window()` to act. A current `QB_RHYTHM` path provides outlet timing behavior.
- [`src/sim/qbmind.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/sim/qbmind.ts): QB has coverage beliefs and observer-local acquired pictures, sector-limited looks and late confirmation. `receiverLook()` and `routeKeyPictures()` are suitable perception inputs to a read-plan executor.
- [`src/game/playcaller.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/game/playcaller.ts): play caller uses `concept.progression[0]` as a proxy for featured receiver. That assumption must be replaced or adapted because an alert, key or branch can make "first" conditional.

**Important correction:** the sim already has a rudimentary numbered progression. The missing capability is **automated derivation of multiple football-coherent, timing-aware, conditionally branching plans**. We should not redesign `QBMind` or the throw-window system merely to support the compiler.

### Existing hidden coupling to guard

1. A list of receivers is also a *priority order* used in playcalling.
2. A changing list can influence *where the QB looks*, which affects his acquired defensive picture and therefore later coverage belief.
3. Choosing a different plan can alter receiver forecast acquisition and route-option agreement.
4. Blindly enumerating alternatives during a snap could consume random draws, change perception calls, or violate deterministic controls.
5. Existing `progression` arrays provide a valuable *temporary control arm* and audit benchmark, but must not remain the production source of new read metadata.

Recommendation: retain existing arrays for comparison while `READ_COMPILER=0`; compile plans *before* gameplay, and execute only one selected plan with no per-tick search over hypothetical plans.

---

# Part III — Compiler input and geometry model

## 5. Inputs: data we already have, not hand-created metadata

The compiler input should be **the instantiated passing play**, not the abstract concept label alone:

```text
PassConcept
  strong/weak receiver-number → route IDs
  back assignment; TE block; drop; play-action; screen
        +
Formation + personnel + actual receiver numbering + flip
        +
Route definitions and option branches (waypoints + expected depths)
        +
Protection expectation (blockers in / time risk) and QB drop
        +
Coach philosophy profile (read-style priors, complexity, preferred rhythm)
        ↓
CompiledReadPlan[]
```

No `if (concept.id === 'y_cross')` or similar one-off code in production. Concept names may be included in debug output; they must not be used as the principal selection logic.

The compiler should work unchanged when:

- The same route combination is flipped.
- The strong side is on the offense's left or right.
- Receiver roles are shifted by formation.
- The concept is called in 2×2 or 3×1.
- Routes move in/out of stacks or bunches.
- A tight end stays in to protect, changing eligible routes.
- A receiver has an option branch.
- A new concept is added with valid route geometry but no manual progression.

## 6. Instantiate trajectories, not merely route-name categories

For each eligible receiver `r`, derive a set of expected paths `P_r^k(t)` for the installed base and legitimate option branches `k`.

Use the engine's actual route engine and approximated speed/acceleration capabilities to produce a **planned, observer-free route schedule**. This is *not* a prediction of what that receiver secretly chooses at runtime; it is the team's installed menu.

Proposed features:

```ts
interface RouteDescriptor {
  ref: ReceiverRef;
  slot: SkillSlot;
  start: Vec2;
  startSide: 'L' | 'R' | 'C';
  startDepth: number;
  startWidth: number;
  paths: PlannedRouteBranch[];
  releaseDelay: number;
  routeFamily: 'quick' | 'intermediate' | 'deep' | 'flat' | 'cross' | 'back';
  eligibleAtSnap: boolean;
  hasDelayedRelease: boolean;
  roleCandidates: Array<
    'alert' | 'primary' | 'secondary' | 'clearout' | 'outlet' | 'checkdown'
  >;
  approximateReadiness: { first: number; best: number; last: number };
}

interface PlannedRouteBranch {
  id: string;
  trajectory: Array<{ t: number; x: number; y: number; speed: number }>;
  settle: boolean;
  plannedBreaks: Array<{ t: number; x: number; y: number }>;
  keyKind?: 'underneath' | 'middle';
}
```

All time numbers should derive from the call's actual formation/drop and nominal player profiles—not hard-coded from a route word such as `corner`.

**Key difference:** a `go` receiver may be a clearout under one candidate plan, but an alert under another. That role belongs to the **read-plan candidate**, not to the route descriptor permanently.

## 7. Sample the play at multiple landmarks

Use enough time resolution to detect route interactions without running the full physics world for every possible graph. A practical deterministic sketch:

- `t = 0.0–4.0 s` in 0.1–0.2 s increments, adjusted for quick versus deep routes.
- Receiver paths begin at release timing and evolve through break/settle.
- Representative target windows are derived using quarterback release latency and flight time.
- For each receiver, find *time of workable throw*, not merely maximum depth.

For route pair `(a,b)` define candidate relationships:

- `depth separation(t) = |x_a(t) - x_b(t)|`
- `lateral separation(t) = |y_a(t) - y_b(t)|`
- `target-time overlap = duration(both routes have plausible throw windows)`
- `proximity across time = min_t ||P_a(t)-P_b(t)||`
- `crossing geometry = whether paths cross laterally near overlapping times`
- `clearout geometry = whether a deep path draws an archetypal defender from a shallower target space`

Don't use these distances in isolation. Require the pair's route windows to occur in a meaningful sequence and to stress a **consistent defensive role** under generic defensive looks.

## 8. Build a route-interaction graph

```text
Graph vertices: eligible receiver + planned path branches
Graph edges: vertical stretch / horizontal stretch / triangle /
             flood / mesh / high-low / clearout / isolation / outlet
Graph hyperedges: three-level flood or triangle using three routes
```

Candidate motif detectors:

| Motif | General geometric requirements | Typical generated reads | Potential error |
|---|---|---|---|
| Horizontal stretch | Two throw windows laterally separate across one underneath seat | key-defender or outside/inside sequence | Pair isn't stressed by *same* defender |
| Vertical high-low | Routes at different depths within one defender's coverage reach, workable in related timing | shallow/deep conditional | Deep route never actually viable at QB timing |
| Flood / sail | ≥3 routes distributing deep / intermediate / flat toward one side | 3-level ordered sequence; 2-key | Deep go only a clearout; don't force throw |
| Triangle | Three window locations enclosing useful width/depth and timing | weak/strong/middle pure progression | Geometric triangle is not tactically meaningful |
| Cross + post | Cross traverses middle, post attacks coverage above | cross-first; safety-key branch | Safety responsible for neither against a look |
| Drive / levels | Shallow + deeper in-breaking route with convergent middle window | shallow → dig; hook key | Traffic and spacing may invalidate |
| Mesh | Two shallow routes cross/opposite leverage, with optional third route | first/second shallow + settle/corner | Might miss that second crosser is blocked or delayed |
| Smash | Short sit/hitch with deeper corner attacking sideline | corner/hitch high-low or progression | Different Cover 2/quarters rules need distinct keys |
| Vertical seams | Multiple routes occupying seam/deep zones | pure across or safety-dependent alert | Naively selecting every seam as eligible first read |
| Isolation | Receiver on detached side has separation from other same-team routes | pre-snap matchup alert | Isolation ≠ guaranteed favorable matchup |
| Back outlet | Back has delayed release or quick flat | outlet after feasible release | Assigns blocked back a checkdown |

**Role-template test:** To admit a conflict-key motif, run the geometry against several *generic* coverage templates (e.g., Cover 3 spot, Cover 2, quarters, man). Ask whether there is at least one defender role whose plausible response to route A opens a distinct passing region for route B. The template can label roles (`curl-flat`, `deep half`, `hook`, `quarter safety`, `apex`) but **must not select the actual defense**. A role that can't be reliably resolved from the quarterback's eventual visible picture should fail the condition and fall back to a pure read.

## 9. Avoid dynamic receiver optimization disguised as coaching

**Wrong:** at runtime, rank all receivers on projected completion × yards and call that the QB's progression.

**Right:** before the game, choose and install a *small decision graph* derived from routes and philosophy; the QB only looks where that graph directs, may use a limited scan, then evaluates the current receiver with its existing imperfect window system.

The distinction is substantive: coaches teach a plan for **where to look** and **why**, not a continuously refreshed omniscient solution to the play.

---

# Part IV — Generate multiple viable reads without enumerating concept IDs

## 10. Candidate generator: small grammar of read patterns

An initial grammar needs roughly **eight constructors**. These are **generic generators**, not per-concept assignments.

```text
READ_PLAN := PRECHECK? → CORE → OUTLET?
PRECHECK  := ACCESS_ALERT | VERTICAL_ALERT | ISOLATION_ALERT | PRESSURE_KILL
CORE      := PURE_SEQUENCE
           | HALF_FIELD_SELECT(LEFT_SEQUENCE, RIGHT_SEQUENCE)
           | ROLE_KEY(defender_role, A, B, fallback)
           | TRIANGLE_SEQUENCE(A, B, C)
           | CROSS_FIELD_SCAN(start_region, sequence)
           | MATCHUP_START(primary, sequence)
OUTLET    := DELAYED_BACK | NEAREST_UNDERNEATH | THROWAWAY_OR_SCRAMBLE
```

**Not every candidate is legal for every concept.** For example:

- No useful half-field alternatives → do not generate `HALF_FIELD_SELECT`.
- No stable two-route conflict → do not generate `ROLE_KEY`.
- No receiver with a viable immediate access throw → no `ACCESS_ALERT`.
- Back stays in and never releases → cannot install back checkdown.
- Screen call → use its screen timing and kill rules, not the generic compiler.

### A. Pure progression constructor (mandatory fallback)

Inputs: route descriptors + target-time windows + QB drop and expected protection time.

Procedure:

1. Identify route-role candidates (primary, clearout, outlet).
2. Rank plausible *starting areas*, not merely individual receivers, by ready-time alignment and reachable eye/foot sequence.
3. Search bounded receiver permutations (typically no more than four meaningful early reads plus outlet) for feasibility.
4. Penalize oscillating across the field, going deep → flat → deep without time to reset, reading a late-breaking route before the QB could throw it, and leaving an early-dead route in the front of the list.
5. Reserve an explicit **late outlet** and optional **pre-snap alert**.
6. Ensure every receiver with a genuine route but not early-read priority may remain a late emergency option, without forcing it into the main numbered progression.

Use a small beam search (e.g., beam 16–32), not factorial enumeration for every combination.

### B. Triangle constructor

Find 3-route groups occupying a useful strong / weak / middle triangle across target windows. Produce a progression consistent with those windows and the coach's preferred ordering (deep-to-shallow, shallow-to-deep, middle-out). **Coach choice is among feasible sequences**, not permission to reverse time.

### C. Role-key constructor

For each plausible pair `(A,B)` and defensive role `d`:

1. Determine whether a role's two plausible reactions (e.g., widen or stay; sink or drive) create different windows.
2. Require an observable motion cue before the relevant receiver windows close.
3. Create a conditional read with a default branch if the defender cannot be identified or the motion is ambiguous.
4. Add a normal progression after the key-derived primary answer.

**Important:** `role = curl_flat_playside`, not `defender = NB_42`. Runtime must match this role to a defender from the QB's acquired picture. It can get it wrong. A role can also be temporarily ambiguous during rotation.

### D. Coverage-side constructor

Generate only when the formation and routes supply two **meaningful, independent** halves. Each half needs at least one early target and a supporting answer, or a robust alert plus primary. Choose side by **belief about middle open/closed, man/zone, or pressure**, not by true coverage.

If one side is a lone go clearout with no second viable answer, reject the branch; don't call that "pick-a-side" merely because the formation has two sides.

### E. Alert constructor

Eligible if an immediate route has a plausible access window under common alignments: isolated hitch with cushion, detached quick out, favorable fade, glance, or attached quick screen with actual call support. At runtime the cue must be read from the visible defender alignment and available safety help. Make the alert **disposable**: if the condition isn't met in its intended time, it is *not* a normal #1 that the QB waits on.

### F. Pressure/hot constructor

**Do not choose simply the fastest-break route** from the first four receivers. A hot answer depends on the **installed protection** and whether a receiver is free and sight-adjusted. Compiled read plans should expose their hot-capable alternatives, but actual selection awaits a believable `PRO_CALL`/slide/back-scan model. Until then, limited pressure fallback can retain the existing simple emergency logic with explicit diagnostic labels rather than claiming NFL-accurate hots.

### G. Option-route constructor

Use the installed `RouteRead` alternatives. A `RouteRead` branch is shared between QB and receiver as a **coached menu**; at runtime each observes and infers independently. Compile the quarterback's branch *expectation*, never access the receiver's actual private answer.

### H. Screen / RPO constructor

Bypass generic route ordering for explicitly called screens and RPOs. Their read structures follow the already-installed call's screen target and timing (plus legitimate kills/checks), rather than treating decoy go routes as QB reads.

## 11. Candidate scoring, with hard validity gates

A candidate graph should be admitted only if it passes:

- **Eligibility:** reads actual route-running receivers that exist in this personnel/formation.
- **Information:** any conditional key is observable or has an explicit unresolved fallback.
- **Timing:** throw windows and eye movement can fit within the expected pocket/read clock.
- **Topology:** conditions target meaningful region/defender conflicts; no route-priority contradictions.
- **Physical coherence:** QB cannot instantaneously switch gaze, body and throwing arm; preserve existing load/delivery timing.
- **No future knowledge:** score without real defensive play call, eventual throws, coverage leverage after the snap, or future receiver choices.

Among valid candidates, score:

```text
score(plan | coach, concept) =
  coach_style_fit
+ route_relationship_quality
+ nominal_rhythm_feasibility
+ robustness_across_generic_defenses
+ protection_compatibility
+ reasonable_player_fit
- scan_cost
- complexity_cost
- dead_read_penalty
```

The weights are **engine calibration parameters, not verified NFL numbers**. In the initial version the default coach puts the largest weight on rhythm-feasible pure progression, then allows coverage/hybrid candidates where clearly supported. The ranking should be deterministic for identical installed inputs.

### A necessary safeguard against yards-based overfitting

Do **not** pick the read plan by replaying it against the exact upcoming defense and maximizing yards. Nor should the team compiler optimize a candidate to recreate target distribution measured from those same simulated games. Rank by football principles and held-out generic defender templates; later test resulting play outcomes without back-solving the route order.

---

# Part V — Represent plan as a decision graph

## 12. Suggested schema

```ts
type ReadPlanStyle =
  | 'pure'
  | 'pure_with_alert'
  | 'half_field'
  | 'defender_key'
  | 'triangle'
  | 'scan'
  | 'matchup';

type DefenderRole =
  | 'playside_apex'
  | 'playside_curl_flat'
  | 'weak_hook'
  | 'middle_hook'
  | 'weak_safety'
  | 'middle_safety'
  | 'deep_half'
  | 'quarter_safety'
  | 'deep_third_corner';

type ReadNode =
  | {
      id: string;
      kind: 'alert';
      target: ReceiverRef;
      test: 'cushion' | 'isolation' | 'vertical_access';
      take: string;
      pass: string;
      deadline: number;
    }
  | {
      id: string;
      kind: 'coverage_choice';
      key: 'single_high' | 'split_safety' | 'man_zone';
      branchA: string;
      branchB: string;
      fallback: string;
    }
  | {
      id: string;
      kind: 'defender_key';
      role: DefenderRole;
      cue: 'widens' | 'sinks' | 'drives' | 'rotates_inside';
      onCue: string;
      otherwise: string;
      unresolved: string;
      evidenceDeadline: number;
    }
  | {
      id: string;
      kind: 'target';
      receiver: ReceiverRef;
      rhythm: 'drop' | 'hitch1' | 'hitch2' | 'late';
      openWindow: [number, number];
      ifCovered: string;
      ifExpired: string;
    }
  | {
      id: string;
      kind: 'outlet';
      receiver?: ReceiverRef;
      onUnavailable: 'scramble_or_throwaway';
    };

interface CompiledReadPlan {
  id: string;                       // stable hash of geometry + coach + version
  style: ReadPlanStyle;
  root: string;
  nodes: Record<string, ReadNode>;
  rationale: string[];              // machine-readable reason codes preferred
  validation: {
    valid: boolean;
    score: number;
    hardFailures: string[];
    qualityWarnings: string[];
  };
  compilerVersion: string;
}

interface ReadInstallation {
  selected: CompiledReadPlan;
  alternatives: CompiledReadPlan[];  // available to coaches, not runtime QB
  coachProfileId: string;
  conceptGeometryHash: string;
}
```

Better production shape: nodes should reference a compiled **role resolver** and **conditional evidence source** rather than hardcoding position labels. The above is intentionally small enough to audit.

### Runtime must not execute hypothetical alternatives

All candidate ranking and plan selection occur at installation/game-plan time. QB runtime gets **one** `ReadInstallation.selected` graph and only traverses that graph using `QBMind` and timing. The full alternatives collection is for debug and future coaching systems, **not** something the QB can interrogate mid-snap.

## 13. Example: compiled graph for a generic Cross/Post/Flat concept

This is an **illustrative output of generic motifs**, not a hand-coded rule for the name `Y-Cross`.

```text
PRE-SNAP
  ├─ If isolated vertical is truly accessible: VERTICAL ALERT
  └─ Otherwise: main installed plan

MAIN (PURE BASELINE)
  Cross at first viable intermediate window
     ├─ take if sound
     └─ else Flat at next viable window
                   └─ Post if still timely
                             └─ RB when released → pocket response

ALTERNATE (SAFETY KEY)
  Read safety related to Cross and Post
     ├─ safety drives down: Post
     ├─ safety stays high: Cross → Flat
     └─ key unresolved: Cross → Flat → RB
```

Either can be generated because the geometry yields a cross/post conflict plus an underneath outlet. If the post is too late to throw when the safety cue becomes available, the *key* candidate must fail validation. If the weak-side safety is not a meaningful conflict defender under representative looks, the candidate should be rejected or downgraded.

## 14. The exact same concept can have different coach installs

The following values are **illustrative defaults** for model design, not empirically estimated NFL frequencies:

```yaml
coach_profiles:
  modern_pure_leaning:
    pure: 0.60
    pure_with_alert: 0.20
    half_field: 0.08
    defender_key: 0.07
    triangle_or_scan: 0.05
  coverage_key_leaning:
    pure: 0.25
    pure_with_alert: 0.15
    half_field: 0.25
    defender_key: 0.25
    triangle_or_scan: 0.10
  air_raid_leaning:
    pure: 0.45
    pure_with_alert: 0.20
    half_field: 0.10
    defender_key: 0.10
    triangle_or_scan: 0.15
```

**Do not blindly sample these probabilities per play call.** They are style *preference weights* conditional on the candidate set. If a concept yields no defensible half-field candidate, that probability should not force one into existence. The same team should usually install **stable reads for a given concept**, not randomly change the QB's progressions every time it calls the same play. A genuine alternative install may be introduced by practice/game planning, with player familiarity consequences later.

### Important distinction: variety *across concepts* versus randomness *within a concept*

An NFL playbook can have a high share of pure-progressions **while still using defender keys on its best Stick or Smash calls**. A coach profile is a prior, not a decree. Prefer deterministic conditional ranking such as:

```text
P(plan | coach, concept) ∝
  [plausible coach style prior]
  × [football/geometry validity]
  × [timing and protection compatibility]
  × [QB install familiarity]
```

Here `P` is a conceptual scoring distribution, not a claim of a calibrated behavioral probability. For reproducible engine gameplay, select the best viable plan or a seeded choice at **install time** and keep it stable over repeated reps.

---

# Part VI — What the first compiler would do to the current playbook

## 15. Automatic candidate examples (not hand-authored mappings)

The table below demonstrates generic motif detections on routes in the inspected playbook. **It is an evaluation oracle, not a production `switch (concept.id)` table.** A passing outcome of the compiler can be checked against it, but the compiler must arrive there through route shape and timing.

| Existing concept | Geometry likely found | Pure candidate | Conditional / alternative candidate | Caveat |
|---|---|---|---|---|
| Slant-Flat | Slant/flat horizontal stress | slant → flat → backside | apex/key → inside or outside | Strong and weak slant-flats duplicate; need stable starting side |
| Stick | stick/flat horizontal triangle + go clear | stick → flat → weak | apex key → stick/flat | Don't count the go automatically as primary |
| Speed Outs | paired quick outs + hitches | chosen quick out → hitch → opposite | access/matchup alert | Timing makes full cross-field sequence limited |
| All Hitch | mirrored short stops | chosen hitch → opposite hitch → outlet | coverage/cushion-conditioned side | No deep threat; key candidate may not exist |
| Smash | hitch/corner vertical stretch | corner → hitch → backside | deep-half or squat corner key | Cover 2 versus quarters conflict roles differ |
| Curl-Flat | curl + flat | curl → flat → opposite | curl-flat role key | Requires matching release times |
| Mesh | crossing shallows + corner and back | near shallow → far shallow → corner/back | man-matchup/mesh-local variation | Traffic and settling are receiver-specific |
| Four Verts | seams + outside verticals | first seam → second seam → outside | safety-shell-conditioned emphasis | No simplistic assumption all seams are equally available |
| Flood | deep/out/flat level distribution | intermediate → flat → deep alert | 3-level role-key/triangle | Go may be clearout, not delayed third read |
| Dagger | clear seam + dig + shallow | dig → shallow → outlet | safety influence on dig | Seam as clearout unless alert conditions hold |
| Drive | shallow/dig levels | shallow → dig → outlet | hook LB high-low | Cross-field eye movement must fit pocket clock |
| Y-Cross | cross/post/flat plus vertical | cross → flat → post/back | safety-key or boundary alert | Distinguish versions; names are not unique installs |
| Levels | dig/short in + vertical clear | dig → short in → outlet | hook key | Need check which route receives favorable window first |
| Comebacks | outside comeback pair + intermediate dig | chosen comeback → opposite/dig | isolated sideline alert | One seven-step concept may demand stronger protection |
| PA Post-Dig | deep post/dig crossing vertical levels | post alert → dig | safety leverage branch | Fake delays timetable |
| PA Flood | deep/intermediate/flat with weak cross | sail/out → flat → cross | 3-level flood role keys | Deep route often changes only defender positioning |
| PA Shot | multiple deep posts/go | isolated shot → opposite vertical | safety split/rotation alert | Must reject overly long sequences |
| Screens | called target with decoys | called target | pre-snap kill only if installed | **Bypass generic compiler** |

### Automatic coverage of unseen playbooks

To prove generality, add **held-out synthetic concepts** (generated route combinations never named in source). Compile each without new annotations. A plan is successful if it (a) references existing eligible routes; (b) has physically plausible timing; (c) has coherent eyes/feet; (d) makes no impossible reads; and (e) yields a recognizable family explanation. Avoid comparing outputs only to a list that we manually encoded for the current 17 concepts.

## 16. Y-Cross case study: multiple coherent reads from identical routes

Historical coaching shows that crossing concepts do admit several real teaching systems:

- **Older Air Raid / Y-Cross 95:** reports describe a sequence beginning with a vertical, then cross, out, backside post/dig, swing. [USA Football H-Cross](https://blogs.usafootball.com/blog/6838/breaking-down-the-h-cross-concept).
- **Stan Hodgin H-Cross variant:** safety leverage across a cross/post relationship promotes the post from a late answer to an important read. [USA Football](https://blogs.usafootball.com/blog/6838/breaking-down-the-h-cross-concept).
- **Modern pure progression:** can keep a consistent ordered path through cross/flat/post regardless of the shell, with the actual pass chosen from observed window and timing.
- **Coverage-key macro choice:** when the installed geometry truly supports it, a safety's movement determines whether to pursue cross versus post first.

The compiler should emit multiple candidates from the **same route graph** and let coach policy choose. One improvement over the earlier conceptual examples is to reject the tempting **"throw post whenever safety drives cross"** key when another safety/inside defender makes that post infeasible or when the cue arrives after the timing window. A read branch is not an instruction to throw into coverage; it directs the QB's next look and window evaluation.

---

# Part VII — NFL-informed coach priors without false certainty

## 17. A default model for the 2026 NFL

Recommended **initial default**:

- **Pure progression is the *strongest prior*** for ordinary dropback concepts.
- **Pure progression with alerts** is frequently competitive and should probably be the *typical compiled graph* when the route structure supports an alert.
- **Defender-key and pick-a-side** candidates should be naturally selected for concepts with unambiguous conflicts and viable two-side answers.
- **Screen, RPO, true hot/sight adjustments** are their own special install families.
- **QB coverage recognition remains useful under every style**, but its influence on initial ordering depends on the installed method.

**Why:** the direct testimony of Shanahan, Cousins, Dobbs, Phillips, O'Connell and recent QB coaching interviews demonstrates a widespread progression emphasis and sustained mixed use. It does **not** establish an exact NFL share. [Shanahan](https://49ers.1rmg.com/transcripts/head-coach-kyle-shanahan-press-conference-12-20-25/); [Cousins](https://www.si.com/nfl/kirk-cousins-masterclass-explaining-how-to-play-qb-in-nfl); [Dobbs/Warner/Maye](https://www.theringer.com/2026/02/05/nfl/drake-maye-sam-darnold-super-bowl-quarterback-progressions); [Phillips/O'Connell](https://www.startribune.com/minnesota-vikings-jj-mccarthy-pure-progression-reads-nfl-qbs/601539469); [Moorhead](https://coachandcoordinator.com/joe-moorhead-dropback-pass-game-lfg-clinic/).

### Better future calibration than guessing a fixed percentage

1. Obtain a deliberately sampled set of **NFL coaches/QBs explaining particular plays** (film room, clinic, interviews), with *clear* labels for pure, coverage-based, defender key, alert or hybrid. Do not infer from target alone.
2. Treat label reliability explicitly (`direct coach statement > trusted clinic breakdown > analyst inference > geometry guessed from film`).
3. Estimate broad coach-tree priors with uncertainty; because the sample is selected and small, don't call these league prevalence measures.
4. In a second layer, use NFL film/tracking to constrain **observable consequences**: distribution of first-read targets, eye/throw timing if available, short versus deep targets, coverage dependence and time-to-throw.
5. Keep uncertain philosophy priors adjustable independently from hard football mechanics.

### What *not* to do

- Do not default **every** concept to a mechanically fixed cross-field `1–5` sequence.
- Do not make a coach's preferred plan change randomly each snap.
- Do not call `pSingleHigh()` and pick an opposite-side receiver on every play when the installed plan is pure progression.
- Do not give the QB knowledge of the actual coverage call, which safety is "right," or which route option a receiver ultimately chose.
- Do not optimize style shares to reduce overall yards/attempt by fiat.

---

# Part VIII — Runtime execution: a very small, principled change

## 18. Plan execution state machine

The existing `QBPass` can be adapted from `(reads[], readIdx)` to `(readPlan, currentNode, readStart, evidenceMemory)` while retaining route forecasts, window evaluation, throwing, pocket movement and normal pressure behavior.

**Before snap:**

1. Attach the selected precompiled plan to the offensive play call, based on coach and formation.
2. Read accessible pre-snap cues via the existing QB mind (shell, cushion, man hint, possible blitz).
3. Decide immediate alerts or store probabilistic macro expectation as allowed by plan.

**After snap:**

1. Set gaze on specified region, key defender, or target route.
2. Accumulate a cue only from `QBMind`'s acquired, aged observations.
3. Advance an alert, key or target graph node when its defined observable condition or deadline fires.
4. For a `target` node, call existing `ready()` and `evaluate()` only when the QB is permitted to attend to that receiver.
5. If the receiver is covered or the route window expires, advance in rhythm rather than waiting indefinitely.
6. If rush and pocket clock force an early answer, use only valid installed hot/outlet or emergency handling.
7. Preserve all current throwing-body mechanics and physical consequences.

### A read to a *defender* is not the same as a read to a *receiver*

A key-defender node should place the gaze on the **conflict area** and maintain the QB's picture of the relevant routes. The runtime must avoid an impossible situation where staring at the linebacker gives perfect information about a receiver far outside the visual sector. Existing peripheral observation / route forecast can be used, but only within documented limits.

### Read elimination is a genuine skill

Real quarterbacks often rule out reads quickly from the coverage picture and route timing. Model this as **observable elimination**, not instantaneous skipping to whichever receiver would be open. A defender occupying the relevant lane, the route window expiring, or a pre-snap access rejection can eliminate a read. Better recognition reduces *decision latency* and false elimination, not the need to see evidence.

## 19. Timing and eye movement

Each node should carry:

- expected launch-window range, derived from intended route break + estimated ball flight + QB delivery;
- minimum credible look time, affected by player recognition and familiarity;
- maximum dwell time before skipping an expired route;
- expected scan distance/angle between previous and next key;
- a penalty or time cost for crossing the field with eyes/feet;
- a **pressure deadline**, derived from the QB's imperfect perception rather than the defense's hidden rush plan.

The compiler should **choose sequences feasible under an expected pocket budget**. Runtime may still face unusually fast pressure, and then fail—that is football.

## 20. Learning and coaching later

The read compiler is a perfect management-system hook:

- Coach style chooses the installed candidate.
- QB familiarity changes how efficiently he moves through the *same installed* graph.
- Practice can improve recognition of the specific key cue or transfer timing.
- Opponent planning can influence pre-snap priors or suggest which *already generated* candidate to install for the week.
- Bad coaching may install a valid but suboptimal plan, rather than imposing an arbitrary success penalty.
- A QB's strengths may favor a simpler or more coverage-oriented plan without introducing omniscient reading.

**Avoid per-player outcome bonuses.** Management operates on selection, perception, preparation, timing and physical execution. This is compatible with the broader engine philosophy.

---

# Part IX — A practical implementation roadmap

## 21. Phase 0: Diagnostics and baseline (no behavior change)

**Files to add (illustrative):**

- `src/playbook/read-compiler/features.ts` — derive instantiated route features.
- `src/playbook/read-compiler/motifs.ts` — detect interaction motifs.
- `src/playbook/read-compiler/candidates.ts` — generate valid read graphs.
- `src/playbook/read-compiler/score.ts` — coach-independent and coach-specific ranking.
- `src/playbook/read-compiler/types.ts` — graph schema and reason codes.
- `scripts/diag/qb-read-compiler.ts` — output complete per-concept candidate audit.

Run the generator over all ordinary pass concepts × every compatible formation × flip × representative personnel. **Do not change `QBPass`.** Produce a report:

```text
play / formation / mirror
eligible routes and branch windows
motifs found and confidence
candidate A, B, C (or fewer)
why each candidate was accepted / rejected
coach preference rank
unreachable receivers / impossible timing
```

Count coverage: percentage of legal plays receiving at least one plan (target **100%** through pure fallback), percentage with 2+ plans (descriptive—not 100% target), invalid key-defender reads (target zero), and duplicate or impossible receivers (zero).

## 22. Phase 1: Pure progression compiler

Implement only `PURE_SEQUENCE`, late outlet and optional pre-snap alert. Put behind `AUTO_READ=1`, **off by default**, retaining existing `progression` as control.

Test:

- All eligible routes recognized; no blocked TE/back included.
- Same geometry under flip creates equivalent mirrored plan.
- Reordering the array input without changing route geometry does not change compiled plan.
- New unnamed route combination receives a valid plan.
- Reads are timing-feasible under the configured drop.
- Generated target **opportunity order** is stable under repeated play calls.
- Screen plans bypass the generic compiler.

The first runtime implementation should only swap the source of `reads[]`, keeping all other QB logic. This gives a clean experiment on **automatic tagging** before adding conditional branch complexity.

## 23. Phase 2: Conditional read nodes

Add `ALERT`, `KEY`, `COVERAGE_CHOICE`, and `TRIANGLE` support in that order. Use generic defensive-role resolver based on acquired picture. Maintain a fallback pure sequence for ambiguous keys.

**Required adversarial tests:**

- Defense rotates late: QB may begin on wrong side.
- Defender key is obscured: fallback rather than true-state lookup.
- Man and zone both present similar pre-snap pictures: no secret coverage ID.
- Key moves to deny option A: QB moves to B *only if its window remains viable*.
- QB stares elsewhere: key cannot be updated via private-state observation.
- Receiver and QB disagree on option branch: physical incompletion can occur.
- Fake pressure: alert/hot cannot teleport to the actual open man.
- QB under fast rush: doesn't finish five impossible reads.

## 24. Phase 3: Coaching profiles and persistence

Introduce coaches' **read philosophy priors**, but keep selected read plan stable per concept/formation/week unless the team intentionally changes installation. Start with only two explicit profiles:

1. **Modern pure-leaning hybrid**, default, based on current NFL testimony.
2. **Coverage-key leaning hybrid**, useful for an AB experiment.

Later add Air Raid, matchup-first and simplified QB-development variants only when they generate meaningfully distinguishable behavior.

At no stage should a coach automatically receive more yards because of his profile. His effect is a preference over valid installations and (later) preparation and teaching.

## 25. Phase 4: Evaluate against the actual NFL and sim baseline

The strongest early targets are **mechanism measures**:

| Measure | Why it matters |
|---|---|
| Initial QB gaze region / first read time | Does installed plan actually direct QB eyes? |
| Proportion of targets thrown as read 1/2/3/outlet | Does style produce plausible sequential reads? |
| Read dwell time and scan-angle histogram | No instant full-field vision; no excessive waiting |
| Time to release by concept class | Preserve realistic throw rhythm |
| Throw-before-route-break frequency | Avoid suppressing anticipation throws |
| First-read option eliminated from observed evidence | No hidden coverage shortcut |
| Coverage belief versus real coverage confusion | Errors remain possible |
| Open flat accessed when available | Critical current sim gap |
| Pocket exit, sacks and checkdowns | Don't increase five-read sacks artificially |
| Completion by separation class | Don't paper over known catch-window realism problem |
| Target route/air-yard distribution | Avoid making every play intermediate/deep |
| YPA, YAC, INT and sacks | Guardrails, not direct per-play optimization objectives |

**Important context:** earlier project work found read order and release timing relatively close to NFL samples, while short throws and flat opportunities are underused. The compiler must not be judged successful simply because it rearranges the QB's targets. The short-pass *catch-point, lead and release* defects must be measured independently. If a new read plan causes late flat throws, that's a negative result even if the concept is technically receiving a progression.

## 26. Phase 5: Held-out robustness / league test

Use several layers:

**A. Static compiler property tests:** new synthetic routes, mirrored formation, duplicates, incompatible personnel, no back release, odd compressed sets.

**B. Native matched plays:** legacy progression versus generated pure versus generated hybrid, with identical saved constructors; film inspect adverse and favorable switches.

**C. League-sampled games:** different rosters, coaches, formations and opponents (not the same two team identities). Check YPA, air yards, throw timing, sacks, checkdowns, first-read targets and scoring as **bands**.

**D. Policy swap:** same roster/concept against same opponent; pure-leaning versus coverage-key coach. Confirm *read direction* changes while physical rules stay identical.

**E. Neutral identity:** with compiler disabled, game output must be identical to baseline. No extra draw or vision query in the off path.

**F. Full-game causal traces:** log `read_plan_id`, `node_id`, `observation_age`, `reason_advanced`, `reason_thrown`, `read_window_expired`, `pressure_override`, and whether target forecast was actually acquired.

A proposed ranking of candidate graphs is a **hypothesis**. The tests can reject it; do not adjust physics or completion rules just to make the compiler's preferred plan look good.

---

# Part X — Failure modes and non-negotiables

## 27. Failure modes that would ruin this design

1. **A disguised manual tagger:** `if concept.name === 'Stick' then key apex`. This fails the core requirement. Only generic motif detectors should be in production.
2. **Over-classification:** every deep/short pair becomes a high-low even when different defenders own them.
3. **Future defense cheat:** compile based on the opposing defense's actual post-snap call, or key a defender by private coverage assignment.
4. **Route-branch cheat:** QB reads the actual option choice selected by the receiver before seeing it.
5. **Per-snap random coaching:** identical play and coach suddenly change the installation for no football reason.
6. **No timing:** an arbitrary target list asks for a two-second hitch after the pocket has collapsed.
7. **No scan cost:** a QB evaluates all five eligible receivers in a single frame.
8. **Wrong clearout priority:** a go that only clears an out route becomes an automatic first throw.
9. **Protection ignorance:** 7-step read with five-man protection and 0.9-second free edge rusher always chooses the late crosser.
10. **Screen pollution:** decoy go routes become targets on screens.
11. **False meta precision:** initial coach weights labeled as measured 2026 NFL percentages.
12. **Outcome fitting:** candidate selected for most simulated YPA rather than playbook/football rationale.
13. **No fallback:** ambiguous coverage cue freezes QB or causes impossible reversal.
14. **Code-output discrepancy:** compiled graph says one thing while `QBPass` still uses `concept.progression` elsewhere.
15. **Evaluation leakage:** hand-curated expectation tables cause the compiler to secretly reproduce existing concept IDs.

## 28. Explainability requirements

Each selected plan should emit an explanation such as:

```yaml
concept: unnamed_crossing_17
formation: gun_trips_right
coach: modern_pure_leaning
chosen_style: pure_with_alert
primary: receiver_S2
secondary: receiver_S3
outlet: RB
alerts:
  - receiver_S1
    condition: isolated_vertical_access
    deadline: 1.3
motifs:
  - crossing_midfield
  - intermediate_underneath_separation
  - back_check_release
rejected:
  - style: half_field
    reason: weak_side_has_no_second_timely_answer
  - style: defender_key
    reason: weak_safety_cue_not_observable_before_post_window
```

The numbers in this example are demonstrative and must be derived in real implementation. **A reviewer should be able to inspect the output and tell whether the installed plan makes coaching sense before running a single snap.**

---

# Part XI — Research questions and future improvements

## 29. What we cannot honestly infer automatically

- A coach's exact internal language for a play (e.g., "95" does not universally mean the same read).
- Which of several equally plausible progression variants a specific 2026 NFL coordinator would install.
- Whether a receiver is a clearout or genuine first look from geometry alone in every coverage.
- The intended cadence of each read from route endpoints alone, unless drop and QB footwork are modeled.
- Every hot/sight-adjustment rule without a protection-install model.
- Precise 2026 league-wide pure-versus-coverage share from public play outcomes.

The system should acknowledge these limitations through **candidate multiplicity and confidence**, not hide them with falsely precise rules.

## 30. What would improve the compiler most over time

1. A manually *reviewed small library of generic motifs* with clinic diagrams, rather than hand tags for every play. That is a one-time investment with high leverage.
2. A generic route-time extractor using our actual receiver kinematics and QB drop timing.
3. A **role resolver** with explicit perception constraints, compatible with the evolving zone-coverage read logic.
4. Better protection-family calls so hot reads are meaningful rather than the fastest available route.
5. A labeled set of **firsthand coach explanations** for a few concepts (Y-Cross, Smash, Mesh, Dagger, Stick, Four Verts) to test the generalization of the grammar.
6. Better film traces of QB eye focus and elimination; even partial human review would catch bizarre generated plans.
7. Future management hooks: practice reps, QB familiarity, coordinator philosophy and opponent preparation.

### The high-leverage manual effort we *should* allow

The user requirement is **no manually tagging each concept**. It does **not** prohibit a *small, generic rule library*, because football itself has reusable coached read motifs. We should spend manual research effort on **the grammar** (what constitutes a high-low, when it is observable, what makes a pure progression coherent), not on an ever-growing per-concept truth table.

This is the central design trade-off: a 20–40-pattern generic grammar is manageable and extensible; 500 hand-tagged plays are not. The exact grammar size should emerge from validation, not be targeted arbitrarily.

---

# Part XII — Proposed implementation contract and acceptance bar

## 31. Minimal acceptable v1

**Do build:**

- Automatic extraction of route roles and timing from current formation/route geometry.
- Generic crossing, stretch, triangle, isolation, clearout and outlet motif detection.
- Automatic **pure progression** candidate for every ordinary passing concept.
- Optional pre-snap alerts where warranted.
- At least one valid alternative candidate where route geometry clearly supports a key or half-field read.
- Coach-specific ranking with a pure-leaning default.
- Stable installation and compiler-version/hash caching.
- One per-play selected plan executed with the QB's current observation and throw-window machinery.
- Full explanation/diagnostic output and neutral-state test.

**Do not require for v1:**

- Precise 2026 league-wide progression share.
- Perfect replication of any named NFL team's Y-Cross progression.
- Every advanced option-route adjustment.
- Arbitrary pre-snap audible tree for every coverage.
- Complete Mike/slide/hot pass-protection integration (but do not claim accurate hots until implemented).
- A learned model or LLM per play.

### Acceptance checks

- [ ] 100% of legal ordinary pass concepts compile automatically to ≥1 valid plan without per-concept annotation.
- [ ] Mirroring any legal play mirrors the plan rather than changing its conceptual read.
- [ ] Added unfamiliar legal concept compiles successfully without special-case code.
- [ ] Same installed play/coach uses same plan in repeated games absent a deliberate install change.
- [ ] No false actual coverage or receiver-choice access.
- [ ] No impossible timing windows / duplicate route nodes / blocked-receiver targets.
- [ ] Realistic gaze timing and read count; ambiguous defender keys have fallbacks.
- [ ] Screens and RPOs maintain call-specific behavior.
- [ ] Off-state results are byte/semantic identical as appropriate, including RNG and observation counts.
- [ ] League-sampled pass card logged with all major output regressions and favorable effects, not tuned to a desired YPA.
- [ ] Human reviewer can inspect at least 20 selected compiled plans, including synthetic held-outs, and identify no obviously nonsensical read paths.

## 32. Decision: architecture to choose now

**Recommended plan:**

1. **Compile valid candidates at play/install time** using route geometry and deterministic generic motifs.
2. **Choose a modern pure-progression-leaning hybrid** by default, without pretending there is a proven league-wide frequency.
3. **Allow multiple read installations for the same concept**, ranked by different coach profiles. Keep selection stable for a coach unless the team changes installation.
4. **Keep runtime execution simple**: one graph, acquired defender/receiver observations, timing gates, existing throw windows and pocket responses.
5. **Validate how the QB plays**, not just whether a generated receiver list looks familiar.

The design target is not to reverse engineer the exact handwritten progression from every real team's playbook. It is to give **any legal passing concept a small, football-coherent set of coachable reads**—with enough variation for different coaching philosophies, and without building a different manual tagger for every play.

---

# Source notes and reading list

### Direct NFL coach / QB statements (highest weight for current trend)

1. [Kyle Shanahan, December 20, 2025 press conference](https://49ers.1rmg.com/transcripts/head-coach-kyle-shanahan-press-conference-12-20-25/) — personal timeline of broader progression usage, starting around 2015.
2. [*The Ringer*, February 5, 2026: Dobbs, Warner and Maye on pure versus coverage reads](https://www.theringer.com/2026/02/05/nfl/drake-maye-sam-darnold-super-bowl-quarterback-progressions) — firsthand QB perspectives in a reported article.
3. [Kirk Cousins remarks, reported December 2025](https://www.si.com/nfl/kirk-cousins-masterclass-explaining-how-to-play-qb-in-nfl) — firsthand evolution from pre-snap pick-a-side to broader progression.
4. [Kevin O'Connell and Wes Phillips, Minnesota Star Tribune, December 2025](https://www.startribune.com/minnesota-vikings-jj-mccarthy-pure-progression-reads-nfl-qbs/601539469) — pure progression dominance within that offense while still using coverage cues.
5. [Mike Kafka interview, December 2025](https://www.si.com/nfl/giants/onsi/big-blue-plus/giants-ihc-mike-kafka-dives-into-detail-about-progression-vs-coverage) — both families and eye/foot/protection timing.
6. [Joe Moorhead LFG Clinic, 2026](https://coachandcoordinator.com/joe-moorhead-dropback-pass-game-lfg-clinic/) — formal teaching distinction and pre-snap/post-snap recognition.
7. [Moorhead coverage-recognition clinic detail](https://coachandcoordinator.com/qb-pre-snap-coverage-recognition-joe-moorhead/) — three phases, rhythm/hitch structure, progression and coverage read examples.

### Coaching-clinic / concept evidence

8. [X&O Labs: Using Read Families to Train QB Progressions](https://xandolabs.com/the-lab/position-groups/quarterback/pass-game-mechanics-quarterback/using-read-families-to-train-qb-progressions/) — families of progression, key, matchup and combination reads; triangles.
9. [USA Football: Breaking down H-Cross](https://blogs.usafootball.com/blog/6838/breaking-down-the-h-cross-concept) — contrast between old Y-Cross progression and safety-key variant.
10. [Joe Moorhead 2026 audio excerpt](https://www.youtube.com/watch?v=4LK8V5FWEJs) — primary coaching presentation on pre-snap recognition, progression and coverage reads.
11. [*Sports Yahoo*: Cousins and Grant Udinski on mixed modern NFL reads](https://sports.yahoo.com/articles/pure-progression-reads-why-everybody-105800449.html) — firsthand remarks collected in journalism.

### Repository files inspected (November 11, 2026)

12. [`src/playbook/types.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/playbook/types.ts).
13. [`src/playbook/concepts.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/playbook/concepts.ts).
14. [`src/sim/behaviors/qb.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/sim/behaviors/qb.ts).
15. [`src/sim/qbmind.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/sim/qbmind.ts).
16. [`src/game/playcaller.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/game/playcaller.ts).

**Evidence convention:** Quotations and factual observations from coaches are sourced in the relevant sections. The compiler grammar, weights, candidate graphs and acceptance criteria are engineering proposals, *not* established NFL coaching standards. Any numerical prior or threshold supplied as an example must be calibrated and validated before promotion.
