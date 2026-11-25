# Call composition: building a pass call from its parts (2026-11-24, Rules + Coaching, design only)

Status: **approved by the user 2026-11-24 ("yes to both, go ahead and build it")**; being built in steps, each its own draft PR.
Original status: proposal for review. Nothing is restructured until Integration and the user have reviewed it. No code, no
flag and no games in this note. Concept and variant authoring, and #896's re-cut, are on hold until the shape is agreed.

## 1. Why

Today a pass play is one name. `choosePass` (src/game/playcaller.ts) picks one of 32 `PassConcept`s after the formation.
Each concept fixes:
- both sides' routes;
- the back's job;
- the drop;
- one progression.

Real offenses don't call plays that way. A call is built from parts: formation, motion, protection, a concept per side
or one full-field concept, tags, the back's job, and the snap count. The tracking data shows our single-name calls
distort three things.

| what the data shows | NFL | ours | where |
|---|---|---|---|
| a quick-out side has a quick out on the other side too | 18% | 98% | 7,207 NFL / 1,545 ours non-PA dropbacks (§7) |
| a curl-flat side is mirrored | 13% | 48% | same |
| a verticals side is mirrored | 17% | 37% | same |
| the back protects when one side runs quick outs | 23% | 85% | same |
| four verticals called | 0.9% | 5.6% | concept census (rules/route-chart #876) |

The first three are one cause: our concepts are drawn on both sides, while NFL offenses pair two different halves. The
fourth: the back's job is a separate axis in the NFL but fixed per concept for us. The fifth: every concept has weight 1
before the situation multipliers, so a rare call gets the same base share as stick.

The variants found for #896 fit the same picture. Each one is a different setting of one axis on the same core, not a
correction:
- levels' outside in;
- slant-flat's and quick outs' back;
- flood's backside;
- mesh's backside #1.

## 2. How the three NFL systems build a call

Sources: 108 quotes, each checked verbatim against its saved page (scratchpad pages5, quotes5.tsv; the check reported
0 misses). [LOW] marks fan or amateur pages. Where these sources say different things, that is noted rather than
resolved.

### Coryell (numbers)

- **The routes are digits.** "a three-digit number that gives assignments to each of three pass receivers"
  (Wikipedia, Play calling system).
  - Bullock (Commanders breakdown) gives a different digit order: "the first digit called is for the receiver aligned
    to the single side of the formation".
- **Other receivers get word tags.** Chris Brown (Grantland, "Speak My Language") on "896": calling a pass means "using
  both numbers and words ('896 H-Shallow F-Curl')".
- **Protection is its own word, after the formation.** Bullock decodes "Gun Trade Right Vacant Gone Right 968 H Pivot
  F 9":
  - "'Gone Right' is one of the base five-man protection calls in the Air Coryell system";
  - "The F receiver and running back get their routes tagged separately".

### West Coast (words, in a fixed order)

- **The order of the call.** Bullock ("Breaking down the West Coast offense"): "all west coast offense calls typically
  follow the same structure and order":
  1. shift;
  2. formation and strength;
  3. formation variation;
  4. motion;
  5. protection, "called by a number followed by the pass or run concept";
  6. the concept;
  7. the snap count.
- **Protection encodes the drop and the back's release.**
  - "200 Jet is the protection, which is a six-man slide protection involving the running back reading for potential
    extra rushers before releasing into a route."
  - The 1985 49ers book (queerfootballbreakdowns [LOW]): "100 ... means the QB takes a 3-step drop".
- **Only the primary is named.** Chris Brown: plays are "denoted by the primary receiver's route, such as Z-In, X-Hook,
  while the rest of the players are required to memorize their tasks."
- **Two plays in one call.** "Can tells the team that a second play is about to be called and the quarterback can
  switch ... by shouting 'Kill, Kill' or 'Can, Can'". Also, "the formation and motion will typically stay the same"
  (Bullock).

### Erhardt-Perkins (a concept per side)

- **Concepts, not route trees.** Plays "are not organized by a route tree or by calling a single receiver's route, but
  by what coaches refer to as 'concepts'", and "the concept can be called from almost any formation or set" (Chris
  Brown, Grantland).
- **One concept per side.** "'ghost/tosser,' which has the Patriots run the ghost concept to one side and the tosser
  concept to the other."
- **The QB picks the side.** Changes of formation "only affect which side Brady prefers or which receiver he expects to
  be open."
- **Pair a man beater with a zone beater.**
  - "Put man combinations to one side and zone combinations to the other" (smartfootball, "Organizing pass plays as
    concepts").
  - The 49ers version (widezonewarriors [LOW], a high-school coach): "Based on the coverage shell, the QB is going to
    decide which concept he is going to throw ... Disk is a middle open beater, and Dragon is a middle closed beater."
- **Kills between two pairs.** Example: "UTAH KILL KILL KILL, POKER POKER, POKER BOW" (writeforcalifornia [LOW],
  showing 2004 Patriots playbook pages).

### Protections (common to all three)

- **Three families** (smartfootball, "Pass protection"):
  - "Area Schemes ... pick-up whatever 'trash' comes through";
  - "Man Schemes" (BOB, "Big on Big and Back on Backer");
  - "Combo protection: ... area block one side of the line and man block the other side".
- **Half-slide is the default.** "the most common dropback protection at all levels of football, is six man half-slide
  protection" (alexbyrne [LOW]).
- **The back's release words** (queerfootballbreakdowns [LOW]):
  - backs and TEs default to "check-release";
  - "Scat means a back 'free releases'";
  - "Stay means ... does not release";
  - "Slow means ... releases only if their assigned linebacker ... does not blitz."
- **Hot.**
  - "He only has to read 'hot' – i.e. an expedited throw – if both blitz" (smartfootball).
  - Sight adjust: "the receiver will replace the area the blitz is coming from, and that route is automatically hot"
    (USA Football).
- **Every rusher must be accounted for.** "if the defense rushes five or six guys, you can pick them up, but your
  blockers will have to be able to block at least one defender one-on-one" (smartfootball).

### What all three share

Each system puts the same pieces in the same order:
1. formation (strength set by it);
2. motion;
3. protection, which says who is in and how the back releases, and sometimes the drop;
4. routes: a number, a named primary, or a concept per side;
5. tags for the receivers the routes leave out;
6. snap count;
7. optionally a second play with kill/can, or an alert.

The systems differ in how they *name* the routes, not in what a call contains.

## 3. Proposed data shape

```ts
interface PassCall {
  formation: FormationId;              // existing ids; sets strength (Flex)
  motion?: MotionId;
  protection: ProtectionCall;
  routes: { strong: HalfConceptId; weak: HalfConceptId } | { full: FullConceptId };
  tags?: Tag[];                        // replace one receiver's route
  back: BackJob;                       // the back's route, or his protection word
  drop: 'derived' | DropType;          // derived from the primary (below)
  snap?: SnapCount;                    // carried, no effect until a snap-timing model exists
  alert?: { half: 'strong' | 'weak'; read: number; when: AlertCond | AlertCond[] };  // QB_V2's AlertCond
  kill?: { other: PassCall | RunCall; rule: KillRule };  // same formation and motion
  // KillRule = AlertCond | AlertCond[] (shell, press, cushion, leverage, boxAtLeast): one evaluator in Flex's module B
  fake?: RunConceptId;                 // play action, as today
}

interface ProtectionCall {
  family: 'half_slide' | 'full_slide' | 'man' | 'jet' | 'max';
  slide?: 'strong' | 'weak';
  te?: 'stay' | 'check' | 'release';   // per inline TE
  // the back's word lives in BackJob so the route and the release are one choice
}

type BackJob =
  | { stay: true }                                     // in protection
  | { release: 'check' | 'slow' | 'scat'; route: RouteId };  // check-release, release if his man doesn't blitz, free

interface HalfConcept {                // e.g. stick, slant_flat_half, quick_out, smash, curl_flat, levels, flood
  id: string;
  routes: Partial<Record<1 | 2 | 3, RouteId>>;  // receiver numbers outside-in, as today
  backAs?: number;                     // the back is this number when the side is short (BACK_AS_THREE)
  plan: HalfPlan;                      // its own reads, authored on the strong side; flipped for the weak side
  hot?: HotRule[];                     // its side's hot / sight adjust
  needs: ReceiverRef[]; beats: string[];
}

interface FullConcept {                // mesh, y_cross, drive, four_verts, and the PA shots
  id: string; strong: ...; weak: ...;  // as PassConcept today
  plan: QbReadPlan;                    // one full-field plan, as on #893
}

interface Tag { who: ReceiverRef; route: RouteId; asRead?: number }  // asRead: the read it plays, if the plan reads him
```

Notes on the shape:
- **Half concepts are routes on receiver numbers,** so they run from any formation, as concepts.ts already does.
  Twenty-three of the 32 concepts are already two halves in one record (§6).
- **Full-field concepts stay whole.** Mesh, Y-cross and drive read across the field by design. Their halves only make
  sense together.
- **The back has one choice.** His route and his release word are chosen together. The protection's count follows from
  it.
- **Tags cover named variants.** "Mesh Z Post" is the concept plus a tag, which is how coaches name them. Where two real
  versions of a half exist (levels: outside short in, or outside deep in), both are named versions and neither is the
  core. They are called by NFL share (user decision, 2026-11-24).
  - A tag on a receiver the plan reads must say which read it plays (`asRead`).
  - Otherwise the tag only moves clear-out or backside routes.
- **Two fields carry no behaviour yet.**
  - `snap` carries the count, but nothing in the engine models snap timing.
  - `kill`'s rule must use information the quarterback has acquired: the shell seen from the safeties, the box count, a
    corner's leverage. It may not use the call sheet's knowledge of the defense's call.

## 4. Combining two half plans into one QbReadPlan (for the QB lane and Flex)

The cycle needs one ordered list of reads on one footwork clock. The QB lane asked three things of the combination.

**1. Which side he starts on.** The call carries `start: 'pick' | 'strong' | 'weak'`.
- **`pick`:** the quarterback chooses before the snap, from what he has seen. The choice uses the existing
  `pick: 'shell' | 'leverage' | 'cushion'`, and each half's `beats` against the shell he reads. This is Brady's "which
  side he prefers" and the Disk/Dragon choice.
- **`strong` / `weak`:** the call fixes the side, as when the primary is named ("Z-In").
- **Default:** `pick` when the two halves' `beats` differ (a man beater with a zone beater); else the side with more
  receivers.

**2. When he crosses, and on which step.**
- The front half's reads keep their authored steps.
- The backside's first read is on the step after the front half's last read: `cross = front.lastStep + 1`. On a five-
  or seven-step drop, that is the hitch.
- The compiler rejects a call whose crossing step lies beyond the drop's top plus one hitch. A deep front half on a
  quick drop leaves no time to cross.

**3. Full backside progression, or a single reset read.**

| drop | front half has | backside |
|---|---|---|
| catch, quick, gun3 | any | **reset:** one read, the backside half's first read (its #1 alone, or its alert) |
| five, gun5, seven | three or more reads | **reset** |
| five, gun5, seven | one or two reads | **progression:** the backside half's reads in order, from `cross` on |

After the backside comes the checkdown, the back's route when he is released.

**Compiled result.**
- **Reads:** the front half's reads, then the backside's, each with its step.
- **Hot:** the union of the two halves' hot rules. Each half authors its own side's hot.
- **Checkdown:** the back, from step max(authored, cross).
- **Flip:** for `pick`, the compiler emits both orders, strong-first and weak-first. The pre-snap pick selects one. So
  `PreSnapState.flip` is not used to swap two different halves; it still mirrors a half authored on the strong side.

The cycle and `QbReadPlan` do not change. Only the compiler that produces the plan is new.

**The QB lane's answers (2026-11-24):**
- **Two compiled plans plus a pick.** The cycle runs one QbReadPlan. A `sides` field would put the combination logic in
  the cycle. The pre-snap decision (Flex's module B) hands the cycle the chosen plan.
- **The reset/progression table fits the footwork clock.** On a catch or quick drop, the crossing step is one hitch
  (about a stride, 0.35-0.45 s) after the front half's last read, which is right for a reset.
- **The checkdown waits for the backside.** The compiler sets the checkdown's `fromStep` to max(authored, cross), so he
  cannot check down before the backside is read.
- **Kill/can is pre-snap.** It belongs in Flex's module B, beside the pick and the alert, on the same scan. The cycle
  receives the resulting plan.

**Flex's answer (2026-11-24): no new formation field is needed.**
- **Placing a half by number.** After motion, alignOffense gives `OffenseAlignment.numbering` (S1..S4, W1..W4).
  formationStructure (src/playbook/structure.ts) gives each side's count and attached/detached, bunch/stack and
  reduced-split structure. That is enough to place a half outside-in, and to enforce that a trips half pairs only with
  a one-receiver side.
- **The back as a number (`backAs`).** The spot's `backfield` flag and its side relative to the ball.
- **Legality.** Reuse `eligibilityAtSnap` (src/game/presnap-rules.ts) on the aligned spots after motion: seven on the
  line, the two ends and the backfield eligible. A tag that gives a route to a covered player is refused. Flex offered
  the small adapter from OffenseAlignment to SnapPlayerFacts.

## 5. What the play-caller chooses, and the constraints

**The order** follows the coordinator's own order ("Personnel. Play. Snap count. ... Kill? Protection?", the Fox Sports
headset piece) and the West Coast call order. Personnel and formation are already chosen before the pass today.
1. Personnel: the sideline's choice, as now.
2. Formation.
3. Motion.
4. Protection and the back's job.
5. Routes: two halves, or one full-field concept.
6. Tags.
7. Drop, derived unless called.
8. Optionally a kill pair or an alert.

**Weights.** Each axis gets NFL shares as a labelled default (§7), multiplied by the existing situation terms (CALL_MIX,
down and distance). This replaces the flat weight of 1 per concept. With it, four verticals' base share follows its NFL
share instead of equalling stick's.

**Constraints, checked when the call is built** (a call that fails is not drawn):
1. **Legal formation.** "at least seven players lined up on the line of scrimmage", and only the end players are eligible
   (Wikipedia, Eligible receiver). A tag cannot give a route to an ineligible player. It reuses `eligibilityAtSnap`
   (src/game/presnap-rules.ts) on the spots aligned after motion.
2. **Protection accounts for the released routes.** Blockers = five linemen + each `stay` back or TE + each `check` /
   `slow` player (counted as in, while his man rushes).
   - With fewer than six blockers (a scat back, or empty), each side needs a hot or sight-adjust route in its half's
     `hot`. "When both defenders blitz, the quarterback will be hot".
   - The post-snap count stays PRO_CALL's job. The call states only who may release.
3. **The drop fits the deepest primary.**
   - A derived drop is the shortest drop whose top-of-drop time covers the break of the front half's first two reads.
     The QB lane owns the times, and `catch` falls back by alignment as agreed.
   - A called drop (a "100"-style quick call) is allowed only if it also covers those breaks.
4. **The halves fit the formation.** Each half's `needs` must be on its side at the snap after motion (CONCEPT_FIT).
   - The back may stand in as a number (`backAs`).
   - A trips half pairs only with a one-receiver half on the other side.
5. **The back's route agrees with protection.** A released back's route must start on the side his check (if any)
   allows. A `stay` back has no route, and the plan has no checkdown read for him.

## 6. Migration of the 32 concepts

**One flag, `CALL_COMPOSE`, off and registered in the three places.**
- **Off:** the 32 `PassConcept`s run exactly as today.
- **On:** the play-caller composes calls. Each existing concept also exists as a fixed composition, so every current
  play is still callable as it stands.
- **Golden test:** each composition compiles to the same routes, back, drop and progression as its `PassConcept`.

Nothing is deleted. Each concept becomes a composition:

| concept | composition (strong half × weak half, or full) | back |
|---|---|---|
| slant_flat | slant-flat × slant-flat | stay (variant: check → flat) |
| stick | stick × slant-stick | check |
| quick_outs | quick-out × quick-out | stay (variant: release → shoot) |
| hitches | hitches × hitches | check |
| smash | smash × smash | check |
| curl_flat | curl-flat × curl-flat | check |
| comebacks | comeback-dig × comeback-seam | check |
| flood | flood × dig-shallow (variant: slant backside) | check, `backAs` 3 |
| dagger | dagger × go-hook | check |
| levels | levels, outside-deep-in version × go-hook | check |
| double_slants | double slants (+flat) × go-hitch | stay |
| fade_flat | fade-flat × hitch-go | check |
| hitch_post | hitch-post × go-hitch | angle |
| double_outs | double outs × hitch-out | angle |
| hitch_out | hitch-out × slant-hitch | back_out |
| seam_slant | seam-slant × slant-go | stay |
| sail_corner | corner-out × hitch-go | check |
| corner_flat | corner-flat × slant-hitch | check |
| trips_stick, trips_sail, trips_outs | trips half × single go / hitch-hitch / hitch-go | angle / back_out / stay |
| seam_hitch | seam-hitch × hitch-seam | wheel |
| verts_hitch | verts-hitch × go-hitch | check |
| mesh | **full** (variants: W1 corner tag; back flat / swing / wheel / stay) | swing |
| drive, y_cross, four_verts, hitch_cross, post_cross | **full** | as today |
| pa_post_dig, pa_flood, pa_shot | **full**, with `fake` and the current protection | as today |

**#896's five changes, re-cut as additions:**

| concept | #896 change | becomes |
|---|---|---|
| levels | outside receiver on the short in | two named versions of the `levels` half: outside-short-in (NFL 69%) and outside-deep-in (ours, 31%). Neither is the core. Both are called by NFL share. |
| slant_flat | back check-releases | a back-axis setting (`check` → flat) beside `stay` |
| quick_outs | back runs the shoot | a back-axis setting (release → shoot) beside `stay` |
| flood | backside slant | a different weak half (slant) beside today's dig-shallow. The NFL backside has a dig 36% and a slant 12%. |
| mesh | backside #1 on the corner | a W1 tag (corner) beside today's go |

`CONCEPT_TAUGHT` would not be needed: its five switches become choices on the axes, weighted by NFL share.

**Ownership** (to agree):
- Rules + Coaching: the half and full concept tables, tags, the call-sheet weights, and the golden test.
- QB lane: the plan compiler (§4).
- Flex: the pre-snap decision (module B): the pick, the alert, and the kill at the line.
- Flex: formations, motion and legality.
- The protection count stays with PRO_CALL's owner.

## 7. Evidence

Operator: halves.py on the route chart (out/chart; 2022 BDB tracking, 7,207 NFL non-PA dropbacks; ours 1,545 from the
#876 sim set).
- A side's receivers are ordered outside-in, and the back counts with the side he releases to.
- Each side is classed by the first family whose rule matches.

**Limit:** the class rules name only the common families. 48% of NFL sides fall under "other", against 33% of ours. So
the NFL tables understate how varied its halves are. The finding (NFL pairs different halves, we mirror) is
conservative.

### What the other side runs

| half | NFL: share of sides | NFL: same half on the other side | ours: share | ours: same half on the other side |
|---|---|---|---|---|
| quick out | 3.8% | 18% | 2.8% | 98% |
| curl-flat | 1.3% | 13% | 2.6% | 48% |
| verticals | 2.6% | 17% | 7.8% | 37% |
| smash | 0.9% | under 4% (not in the top four) | 2.4% | 70% |
| slant-flat | under 0.9% | (not in the top 18) | 1.7% | 74% |
| stick | 2.2% | under 7% (other 41%, single slant 9%) | 8.1% | 10% (single slant 26%) |
| shallow/mesh side | 13.5% | 24% | 10.5% | 39% |

### The back's job on a side with that half

| half | NFL | ours |
|---|---|---|
| quick out | flat 29%, angle 27%, protect 23%, empty 13% | protect 85%, empty 14% |
| slant-flat (ours) / double slants (NFL) | NFL double slants: flat 36%, empty 21%, angle 19%, protect 16% | protect 87%, empty 13% |
| stick | flat 79%, empty 9% | flat 61%, angle 18%, empty 14% |
| curl-flat | flat 54%, empty 24%, angle 11% | angle 46%, flat 43% |

### Variant shares within a core (concept census, #876 scripts)

| core | NFL share of plays | its variants (share within the core) |
|---|---|---|
| stick | 8.6% | back is the flat 83% |
| mesh | 3.3% | back: flat 38%, empty 23%, wheel 13%, protect 12%. Over the crossers: go 38%, dig 22%, third shallow 22%, post 20%, corner 19%, sit 18% |
| levels | 2.0% | outside on the short in 69%; ours, outside on the dig, 31% |
| smash | 1.9% | back flat 48%; usually one side only |
| slant-flat | 1.8% | back released or absent 79%; ours protects 80% |
| flood | 1.7% | the back's flat 76%; backside dig 36%, slant 12% |
| four verticals | 0.9% (ours 5.6%) | |

These shares are the labelled defaults for the axis weights in §5. They are a starting call sheet, not a target. Game
outcomes are judged as usual, not by matching them.

## 8. Next decisions

1. **Integration and the user:** is this the shape? In particular:
   - halves × halves plus full-field concepts;
   - the back as his own axis;
   - variants as tags or axis settings, not new concepts.
2. **The QB lane:** answered in §4. Two compiled plans plus a pick, and the table as written.
3. **Flex:** answered in §4. No new field; legality reuses `eligibilityAtSnap` after motion.
4. **Then, in order:** build the tables and compiler behind `CALL_COMPOSE` (off), re-cut #896 as above, and go on to
   the RPO note (b).
