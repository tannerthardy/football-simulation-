# RPO design: a run call with a throw attached (2026-11-24, Rules + Coaching, design only)

Status: **proposal for review**, with Run Game and the QB lane. No code, flag or games. It builds on the call shape in
docs/reviews/2026-11-24-call-composition.md (§3): an RPO is a `RunCall` that carries a half-field throw.

## 1. Why

**NFL (BDB 2025):**
- RPOs are 10.1% of plays (1,634 tagged).
- Outcomes: 70% are handed off, 30% thrown.
- Targets on the throws: screen 35%, flat 18.5%, slant 11%, out 9.7%, hitch 8%, go 7.5%, cross 5.6%.
- Release time p50 is 1.57 s.
- 83% are from the gun.

**Ours:** one RPO. `iz_now_rpo` (concepts.ts) is inside zone strong with a now screen to the single-receiver side, called
only from 11 personnel.
- The decision is pre-snap only (`QBMind.rpoRead`): throw unless the receiver is pressed, the corner clouds, or there
  are more defenders outside than receivers.
- Thrown, the line keeps blocking the run. `RpoRunBlocker` keeps an unengaged lineman within 0.7 yd of the line until
  the ball is out, per NFL 8-3.

**What is missing:**
- post-snap reads of a conflict defender;
- the quick-game throws (slant, stick, glance, hitch, out), which are the other 65% of RPO targets;
- other runs paired with the throw;
- the zone-read three-way.

## 2. What coaches teach

Sources: 147 quotes, each checked word for word against the saved page (scratchpad pages4, quotes4-status.tsv; 0
misses). [CLINIC] marks a coach's own lecture; [PRESS] journalism; [BLOG] analyst or fan; [LOW] generated or tertiary.

### Two kinds of decision

- **Pre-snap: a count or a look.**
  - DeFilippo "estimates about 70 percent of the quarterback's choices on an RPO are made before a play begins" (The
    Ringer [PRESS]).
  - Morrell: with the "box loaded with six or seven defenders… we simply go to the bubble screen" [CLINIC].
  - Lamb: on pre-snap RPOs "we don't want to ride the mesh point… no reason to ride the wave before throwing" (AFCA
    [CLINIC]).
  - Bowen: a "one-step slant (sight adjust read) if he identifies off-man coverage plus a throwing window"
    (Bleacher Report [PRESS]).
- **Post-snap: ride and read one defender.**
  - "Post-snap RPOs are traditional 'ride and decide' designs" (Lamb, AFCA [CLINIC]).
  - The key is the conflict defender, the one with both a run fit and a pass drop:
    - Galina (USA Football [BLOG]): "read the linebacker inside the first slant route". If he "runs with the running
      back… he removes the ball from the runner's gut and throws it". If he "stays in the slant window… hand the ball
      to the runner."
    - Hargitt, 2019 COY clinic [CLINIC]: "read the middle linebacker. If the middle linebacker plays downhill…
      disengage and throw… if [he] expands to take away the Stick Concept, then… hand the ball off".
    - Glance: "In one-safety looks, the quarterback will see what the outside linebacker does. In two-high safety
      looks, the quarterback will read the safety with run responsibilities" (Stanford Daily [BLOG]). Kiffin reads the
      boundary safety: "if he comes down then he throws the post" (Coaches Insider summary).
    - Pop: "Foles reads the SAM linebacker for a fill read. If he steps up to fill, Foles pulls the ball and throws the
      seam route" (NE Football Journal [PRESS]).
  - "Do not let the overhang players serve two masters… If he does not come out and cover the receiver, throw the
    bubble screen immediately" (Morrell, quoting Stamilio [CLINIC]).
- **Coaches disagree on what to read.**
  - Lamb's "read the grass" and Wilhite's "numbers, space, and leverage rather than conflict defenders" reject the
    single-defender key that PFF and Morrell use.
  - Locked RPOs (the QB gives the ball or throws; Hargitt) read a linebacker. Unlocked ones read the end first.
  - The design keeps both options (§3).

### The throw is quick, and the line is why

- **The rule.** NFL 8-3: "it is a foul if the entire body of an ineligible offensive player… is more than one yard
  beyond the line of scrimmage before the pass has been thrown", unless he is engaged in a block. The college limit is
  3 yd. "The 3-yard limit is unique to the college game and is considered the foundation of the run-pass option play"
  (CBS [PRESS]).
- **How fast.**
  - "the ball comes out hot" (Bowen).
  - "puts the ball in the tailback's pocket and rides him. If the key attacks… pulls the ball and 'turns-two'… throwing
    the ball as quickly as he can" (Oelschlagel, COY clinic [CLINIC]).
  - Zone/stick "happens so fast that the linemen will not be down the field far enough to cause a penalty" (Hargitt,
    Gridiron Strategies [CLINIC]).
  - Galina: against a blitz, "skip the ride fake and throw directly to the slant".
- **Deep throws are rare.** "a 12-yard corner route from an inside zone play is probably not going to happen"
  (McMaster, USA Football [BLOG]).
- **NFL runs are lateral.** "The outside zone RPO is the NFL's bread and butter concept because of the horizontal
  movement of the offensive line before heading up field" (Galina).
- **Half-line blocking** is another option: "the front side of the play [blocks] the run… while the backside pass sets"
  (breakdownsports [BLOG]).

### Pairings

- **Inside zone** with bubble, slant, stick, glance or pop: Hargitt, Galina, Kiffin, Morrell, NEFJ.
- **Outside zone** with quick game: Galina.
- **Power and counter** with fast screens or glance: Morrell, Stanford Daily, Hargitt.
- **Duo** with a backside slant read off the safety (USA Football [BLOG]).
- **Zone read plus bubble** (three-way): "The quarterback will read the backside end… the quarterback can always pull
  the ball and throw the bubble" (Chris Brown, smartfootball).

### What beats an RPO

These are things the defense must be able to do, not caps on the offense.
- **Man coverage.** "beat man-to-man coverage. That is the universal way to stop the RPO" (Sarkisian [CLINIC]). In man,
  conflict players "either don't exist, or have much more defined reads" (PFF [PRESS]).
- **Cloud corners** against screens; the corner dropping inside against the glance (Morrell).
- **Fitting gaps without the conflict defender.** "cancel the gaps inside… so a linebacker doesn't have to come down"
  (Grugier-Hill, Inquirer [PRESS]).
- **Blitzing the read defender**, which forces the handoff. Then "The run-pass option has already achieved its goal"
  (The Ringer).

## 3. Proposed shape

```ts
interface RunCall {                      // the run side of the call-composition shape
  formation: FormationId; motion?: MotionId; run: RunConceptId;
  line?: 'full' | 'half';                // half: the backside sets to pass (Run Game decides support)
  rpo?: RpoTag;
  kill?: { other: PassCall | RunCall; rule: KillRule };
}

interface RpoTag {
  throw: { side: 'strong' | 'weak'; half: HalfConceptId | ScreenId };  // a half from the call tables, or a screen
  when: 'pre' | 'post' | 'both';
  pre?: AlertCond | AlertCond[];         // pre-snap throw rule: box count, press, cushion, leverage, numbers outside
  post?: { key: ConflictKey; throwOn: KeyCue[] };  // post-snap: the defender read during the ride
  first?: { key: 'backside_end'; keepOn: KeyCue[] };  // three-way: give/keep off the end, then the post read
}

type ConflictKey =                       // identified from what he sees at the snap, not from the defense's call
  | { role: 'apex' | 'hook' | 'mike' | 'overhang' | 'safety'; side?: 'strong' | 'weak' }
  | { role: 'inside_of'; ref: ReceiverRef };   // "the linebacker inside the first slant route"
```

**Pre-snap (`pre`).**
- Flex's module B evaluates it on the same scan as alerts and kills, with the same AlertCond vocabulary.
- Today's `rpoRead` is this case: numbers outside, press and cloud.
- New: `boxAtLeast` for the throw ("box loaded with six or seven"), and cushion or leverage for the sight-adjust slant
  or hitch.
- When the pre-snap rule picks the throw, there is no ride. He catches and throws, as Lamb teaches.

**Post-snap (`post`).** The QB lane's cycle runs it during the mesh:
1. From the snap, he rides the back and watches the key, using the same delayed, acquired perception as a
   KeyCue read. He reads the defender's movement, never his assignment.
2. A `throwOn` cue (e.g. `jumps` or a new `fills`, meaning he triggers downhill into the run fit) before the handoff
   deadline: he pulls the ball and throws ("turns-two").
3. No cue by the deadline: he hands off.
4. A blitz: Galina's "skip the ride fake and throw directly" is the `blitzes` cue with `throwOn` at the snap.

**The deadline is physics, not a timer.**
- It is the point in the mesh where the back has to take the ball: the back's path and the ride, which are Run Game's.
- The throw must also leave while unengaged linemen are within the legal yard. `RpoRunBlocker` already keeps them
  there, so a late pull is legal but finds a line that has stopped climbing. That is the real cost: the late throw
  isn't banned, it loses its blocking.
- The NFL's 1.57 s release p50 is the check on the result, not a target.

**Three-way (`first`).** The zone read first (give or keep off the backside end), then the post read on the keep.
This is later work: it needs the QB-run keep, which belongs to Run Game.

**The line.** The run is blocked as called. `line: 'half'` lets the backside pass-set.
- Run Game decides whether half-line is supported and with which runs.
- The 1-yard rule stays in `RpoRunBlocker`, and the ineligible-downfield foul stays a rule check, not a ban.

## 4. Constraints the play-caller checks

1. **The throw is quick.** The half's first read must break under 7.5 yd or be a screen, a glance or a seam/pop. Deep
   halves are not RPO throws (McMaster).
2. **The throw side's receivers are not needed by the run.** A receiver on a route cannot be the run's crack or stalk
   blocker.
3. **The key exists in the formation's structure.** If the formation (from Flex's numbering) has no defender to the
   throw side, a post RPO has nothing to read, and only `pre` applies. This is checked at the line on what he sees,
   not on the defense's call.
4. **Pairings** follow the sourced list in §2 (zone with anything quick; gap runs with screens and the glance), with
   NFL shares as the labelled default weights.

## 5. Proposed first set (by NFL target share)

| RPO | run | throw | when | read |
|---|---|---|---|---|
| IZ / now (ours today) | iz_strong | now screen, weak #1 | pre | numbers outside, press, cloud |
| IZ / bubble | iz | bubble, trips side | pre + post | numbers; post: the apex/overhang (Morrell/Stamilio) |
| IZ / slant | iz | slant (or slant-flat half), backside | post | the linebacker inside the slant (Galina) |
| IZ / stick | iz | stick half, backside | post | the mike: downhill → throw, expands → give (Hargitt) |
| OZ / quick | oz | slant or hitch half, backside | pre + post | leverage or cushion pre; hook defender post |
| Power / glance | power | glance (skinny post), boundary | post | the run-support safety, or the OLB in a one-high shell (Stanford Daily) |
| IZ / pop | iz | TE seam | post | the SAM or the mike filling (NEFJ, Oelschlagel) |

The glance and pop need routes we do not have:
- the glance: a five-step skinny post that "finds grass" and splits the zone, "not a slant and… not a snag" (Morrell);
- the TE pop seam.

They are the route work for item (c).

## 6. Ownership (to agree)

- **Rules + Coaching:** the RpoTag tables, pairings, weights and sources; the glance and pop routes.
- **Flex:** the pre-snap read in module B.
- **QB lane:** the post-snap ride-and-read in the cycle; the pull and the "turns-two" throw footwork.
- **Run Game:** the mesh and its deadline; half-line support; the zone-read keep for the three-way.
- **Defense:** the conflict defenders' honest choice between run fit and pass drop, which is what the read reads.
  Also the answers in §2 (man, cloud, gap cancel, blitz the key). If an RPO proves too strong, the fix is a missing
  defensive mechanism, never a cap on the RPO.

## 7. Migration and checks

- One flag, `RPO_COMPOSE`, off. When on, `iz_now_rpo` becomes a RunCall with `rpo: {throw: now screen weak, when:
  'pre'}` and runs exactly as today (golden test). The new RPOs are added beside it.
- First focused check after building: a pre-snap and a post-snap RPO, a few snaps each, against a conflict defender who
  fills and one who drops. The question is whether the quarterback throws on what he saw, before the deadline, with
  linemen legal. Games come only after that.

## 8. Decisions

1. **Integration and the user:**
   - the shape (a run call with an RpoTag; pre, post or both);
   - the first set in §5.
2. **Run Game:** what sets the mesh deadline, and whether half-line is supported.
3. **QB lane:** the ride-and-read in the cycle, and whether `fills` is a new KeyCue or the existing `jumps`.
4. **Defense:** are the conflict defenders' run-or-drop choices made from what they see, so the read is honest?
