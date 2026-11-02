# Formation and alignment catalog: plan

Status: proposal, requested by Tanner on 2026-11-02. No engine behavior changes
in this document or in its PR. Base: develop `f476187d`.

## What Tanner asked for

> Go very in depth in formations on offense and defense... Implement a lot more
> of them... a good system for labeling these formations and alignments...
> Personnel (base, nickel, dime...) then front then coverage. Modular, but
> flexible, AND THE ALIGNMENTS STILL NEED TO MAKE SENSE... check for glaring
> issues (like defenders stacked on top of each other).

The aim is a much larger set of legal, sensible pre-snap pictures, so the
existing concepts are tested against more of football. It is not a new outcome
target. Per CLAUDE.md, a formation never awards a result. More looks are useful
because they change who the bodies are, where they stand and what each player
can see.

## 1. Where we are

### Inventory

| Catalog | Count | Source |
|---|---|---|
| Offensive formations | 18, written out one by one | `src/playbook/formations.ts` |
| Offensive personnel | 6 (10, 11, 12, 13, 21, 22) | `OFF_PERSONNEL` in `types.ts` |
| Defensive personnel | 6 (base43, base34, nickel, dime, goalline, heavy) | `DEF_PERSONNEL` |
| Fronts | 9 | `src/playbook/defense.ts` |
| Coverages | 47 (with checks, matches, rotations) | `src/playbook/coverages.ts` |
| Pressures | 10 | `defense.ts` |
| Pass / run concepts | 17 / 13 (plus Counter GH) | `concepts.ts` |

The film editor (`lab-app/engine.ts` catalog) lists exactly these. That is why
the menus feel thin. The coverage side is already deep; formations and fronts
are not.

The structure Tanner proposed already exists in `DefensivePlayCall`:
**personnel → front → coverage**, plus pressure, disguise (`shown`), front
stem, creep, mug, edge and strength calls. Offense alignment
(`alignOffense`) is already a function of data: side, split class and depth
per slot, with receiver numbering, strength and core edge derived. So most new
formations really are just data. The exceptions are in section 6.

### Alignment audit on develop (the "glaring issues" check)

`scripts/diag/align/alignment-audit.mts` aligns:
- every formation × flip × hash (left, middle, right);
- against every defensive personnel × installable front × coverage, with no
  pressure.

That is 108 offensive looks and **76,248 defensive alignments**. It is
observation only and takes about 4 s. Some of these combinations the
callers never make (for example base 4-3 against 10 personnel), so counts are
upper bounds.

| Finding | Count | Notes |
|---|---|---|
| Offense: two bodies within 0.9 yd | 0 | clean |
| Offense: fewer than 7 on the line | 0 | X/Y on the line in every set |
| Defense: two bodies within 0.9 yd | 9,881 pairs in 1,787 call/look combinations | 2,826 of them at **0.00 yd: exactly the same spot** |
| A shell that shows no deep player pre-snap but isn't Cover 0 | 1,620 | all `cover1_lurk` |

**Three causes behind most of it:**

1. **Man defenders on backs stand at a fixed spot.**
   - Where: `alignDefense`, "Pre-snap: man defenders align on their man".
   - A defender with a back stands 5 yd off the ball at the back's lateral
     position, shaded 0.7 yd toward the ball.
   - In I-form both backs sit on the ball, so two defenders get the identical
     spot. Example: I-Pro vs base 4-3 Over Cover 1 puts LB_S (on the RB) and
     LB_W (on the F) both at (5.0, +0.70).
   - **All 2,826 same-spot cases are this rule:** I-Pro, I-Twins and I-Jumbo
     against man calls.
   - The same rule pulls a backer or a safety out of his front spot onto a
     back's lateral position. That accounts for about 1,900 more near pairs in
     man calls: LB–LB, FS/SS–LB, DB–LB.
   - NFL backers who have a back in man keep their front alignment and key
     him. They don't walk to him.
2. **Extra DBs against heavy and wing looks land on another defender.**
   - Nickel or dime against 12/21: the slot defender is placed over the
     strong side where the SS rolls down (NB–SS, 1,444 pairs; DB–SS, 360).
   - Against a wing, he lands on the strong end (DE_S–NB, 945).
   - Base Over's Sam, tightened onto a wing, ends up next to the end
     (DE_S–LB_S, 324).
   - Several placement rules each pick "over the strong side" without seeing
     who is already there.
3. **Cover 1 Lurk shows no one deep.**
   - The note says one safety "spins to the post", but the call has no
     two-high `look`.
   - Its deep-middle SS is placed at about 5 yd over the strong end.
   - So the shell shows nobody past 8 yd before the snap, and the post player
     starts 10 yd short of his landmark.
   - This needs Coverage's confirmation that it isn't intended.

All three are defects in alignment rules, not formation data. They belong to
the alignment owners (section 8). They are listed here because Tanner asked for
exactly this check, and the validator in section 5 makes them impossible to
reintroduce.

## 2. The defensive call: agree, with four refinements

Personnel → front → coverage is the right order for the film editor and for the
coordinator. It's also how NFL staffs name a call ("Nickel, Over, Cover 3"). The
refinements:

1. **Split "front" into two layers.**
   - **Line front:** who is down and in which technique.
   - **Second level:** stack, 30/50, apex, overhang, walk-out, mug, Sam on the
     line.
   - The same 4-down line pairs with different backer and overhang pictures by
     personnel and by the offense's look. Today these are mixed in one
     `Front.slots` table, and `FRONT_MENU` already overrides the backers
     separately.
   - Making that split explicit is what keeps a "front" reusable across base,
     nickel and dime.
2. **Adjustment is a rule layer, not a fourth choice.**
   - The call is made before the offense is fully seen: personnel at
     substitution, front and coverage in the huddle.
   - Alignment is then resolved against the set the defenders actually see:
     strength rule, trips, bunch, stack, empty, two backs, nub, nasty splits,
     and later motion.
   - That layer must use acquired information (CLAUDE.md model rules). It
     already exists in pieces: `structureChecks`, `FRONT_STRENGTH`,
     `BOX_ALIGN`, `WR_ALIGN`.
3. **Front and coverage are chosen in order but validated together.**
   - A one-high coverage adds a box defender. A two-high shell pairs with a
     light box, and the front has to own one more gap.
   - Picking independently is fine; installing must check the pair (gap
     ownership, box count, force player).
   - `call-integrity.ts` already does this for pressures; extend it to
     front × coverage.
4. **Personnel is counts, not names.**
   - 4-2-5, 3-3-5, big nickel (three safeties), 4-1-6, 3-2-6, 3-1-7, 5-3-3,
     6-2-3 and so on.
   - Fronts declare what they need (number down, number off the ball, which
     ones can be stand-up edges).
   - A front then works with any personnel that can field it, rather than the
     hand-kept `personnel: [...]` list on each front today.

Pressure stays the last layer, as now (`pressureIsInstallable`).

## 3. Labeling system

Store structure, render names. Never parse a name back into a formation.

### Offense

Canonical fields per formation:
- `personnel`: counts by role (RB, FB, TE, WR), so 20 / "pony" is not confused
  with 21.
- `backfield`: under / pistol / gun, plus back placements:
  - none / single / I / offset I strong or weak;
  - split / near / far;
  - gun offset strong or weak;
  - pony (two RBs either side of the QB);
  - diamond;
  - full house.
- `surface` per side:
  - attached TEs;
  - wing;
  - sniffer / Y-off.
- `distribution` per side:
  - `wide` / `slot` / `slot2` / `flex`;
  - tight / normal / wide splits;
  - nasty;
  - stack;
  - bunch (point on the line);
  - backfield wing.
- `strength rule`: what the offense calls strength (the Y side by default).
  The defense computes its own.

Derived on every alignment, as `alignOffense` already does: distribution (2x2,
3x1, 3x2, 4x1), numbering, eligibility and the legality report.

Rendered label, one grammar for all:
`<personnel> <QB> <set> <direction> [tags], <back detail>`, for example:
- "11 Gun Trey Rt Nasty, RB weak";
- "12 Under Ace Twins Lt, Y-off strong";
- "21 Under Offset-I Strong Pro Rt";
- "10 Gun Empty 3x2 Lt, Bunch tight".

Alternate renderers can be data tables over the same structure:
- Madden-style names ("Gun Trips TE", "Singleback Ace Pair", "I-Form Tight
  Pair", "Gun Bunch", "Empty Base Flex"), for the film editor;
- West Coast words (Ace / Deuce / Trey, Strong / Weak / Twins / Tight / Flex /
  Nasty, Near / Far backs).

Existing ids (`gun_trey_11`, ...) stay as stable aliases so receipts and tests
keep working.

### Defense

`<personnel> <line front> [second-level tag] <coverage> [pressure] [disguise]`,
for example:
- "Nickel 4-2-5 Over, Sam apex, Cover 3 Buzz";
- "Odd Nickel 3-3-5 Tite, 2 mug, Quarters (shows Cover 2)".

Techniques use the modern map (6 = head-up TE, 7 = inside TE, 9 = outside
TE). Bryant's older 6/7 is a label table only. Backers use tens (10, 20, 30,
40, 50) plus depth.

## 4. Catalog targets

All as data on the shared alignment rules. Counts are targets, not
requirements.

### Offense (~70 formations, up from 18)

| Personnel | New sets (examples) |
|---|---|
| 10 | Gun Quads 4x1, Gun Empty 3x2 / 4x1, Gun Bunch Open, Gun Doubles Stack, Pistol Spread |
| 11 | Gun Trips TE (closed), Gun Bunch TE (Y as the point), Gun Twins Stack, Gun Y-off / Sniffer, Gun Wing, Gun Nasty Twins, Gun Tight (reduced Z), Gun Empty with Y as #3, Pistol Trips, Singleback Bunch, Singleback Y-off, Singleback Tight Slot, Singleback Twins Flex, Under Wing |
| 12 | Ace Pair / Deuce (both TEs one side), Gun Trey 12, 12 Y-off plus attached, 12 Twins (nub TE), 12 Bunch, Empty 12 (both TEs flexed), Pistol Wing, Under Tight Wing |
| 13 | Tank / Trey (two TEs one side, wing), Heavy Tight (three attached), 13 Twins Y-off |
| 20 (new) | Gun Pony split backs, Pistol Pony, Split Backs 3 WR |
| 21 | I-Slot, Offset I Weak, Split (Pro / Red), Near and Far (Blue / Brown), Strong Close, Weak, Gun Split, Gun FB offset |
| 22 | Offset I Tight Pair, Wing Jumbo, Ace Jumbo (FB offset) |
| 23 (new) | Goal-line Jumbo |
| 01 / 00 (new) | Empty with an attached Y, Empty 5-wide |
| Later | Unbalanced (tackle over), six-OL Jumbo, Diamond, Full house: these move OL slots and need blocking-rule work first |

### Defense

- **Personnel:** base 4-3, base 3-4, nickel 4-2-5, nickel 2-4-5 (3-4 teams),
  odd nickel 3-3-5, big nickel (third safety), dime 4-1-6, dime 3-2-6,
  quarter 3-1-7, goal line 5-3-3 / 6-2-3, heavy 5-2-4 (exists), 46.
- **Line fronts:**
  - 4-down: Over, Under, Even, Wide-9 (exist); Bear/46 (3-0-3 plus two
    edges); Okie Under; Tite-4.
  - 3-down: Odd/Okie 5-0-5, Tite 4i-0-4i, Mint, Bear 3-0-3, Under 3-4 (exist
    or partly); Over 3-4.
  - 2-down: 2-4-5.
  - 5- and 6-down goal line.
- **Second level:** stack, 30/50, apex, overhang, walk-out, mug 1/2 (exists),
  Sam on the line, SS in the box (46).
- **Strength rules:** to the TE, the field, the passing strength, the back or
  the boundary. `FRONT_STRENGTH` exists for two of these.
- **Formation adjustments,** most already partly coded:
  - trips: solo / mable / poach (exist), plus "always someone over #2 and #3";
  - bunch: point / in / out;
  - stack: in / out;
  - empty: walk out;
  - two backs: down safety or fitting safeties;
  - nub;
  - nasty: the overhang widens, crack alert.

## 5. The alignment contract (validator)

One pure function, `validateAlignment(off, def)`, run on every alignment the
catalog can produce, as a core test over the whole cross product. It is cheap:
no physics.

- **Offense legality reuses `src/game/presnap-rules.ts`,** which already
  implements the NFL-2026 snap laws on represented facts. The validator calls
  it rather than restating rules:
  - 7 on the line, at most 4 backs;
  - ends eligible, covered players ineligible;
  - nobody between the line plane and 1 yd deep;
  - QB placement per backfield.
- **Hard checks, both teams:**
  - 11 bodies;
  - in bounds with room, at least 1 yd from the sideline;
  - body centres at least 0.9 yd apart (from body radii, not a guess);
  - defense outside the neutral zone;
  - each man-coverage eligible matched exactly once, or declared free;
  - no defender carrying two man targets;
  - the deep count shown matches the call's `look ?? shell` (Cover 0 = 0, one
    high = 1, two high = 2);
  - every gap from the actual surface (A–D plus one per attached TE or wing)
    has a fit owner.
- **Soft checks, reported with counts and reasons (TESTING_COSTS):**
  - depth bands: DL 0.3–1.5, LB 3.5–7 (mug 0.5–2), overhang 3–7, CB 0–10,
    S 6–16;
  - leverage matches the call;
  - box count vs blockers (flag a deficit of 2 or more);
  - nobody stacked directly behind a DL by less than 3 yd unless the call says
    stack.
- **NFL reference, not targets:**
  - the 2022–2025 tracking snap frames the repo already reads
    (`scripts/diag/align/nfl_snapframe.py`; BDB2025 carries
    `offenseFormation`, `receiverAlignment` and personnel);
  - these give the minimum defender spacing and depth bands at the snap.
  - The validator's thresholds are checked against them once and then left
    alone.

## 6. What is not "just moving guys"

Placement is easy. These parts aren't, and they are where the stress-test value
is:

1. **Slot names carry assumptions.**
   - `F` is treated as a fullback.
   - `H` is the Counter-GH puller.
   - `Y`/`H` decide split-zone eligibility (`chooseRun`).
   - Run and pass concepts key on S1–S4 / W1–W4 and B / B2.
   - 20, 23, 01 and 00 personnel need `OFF_PERSONNEL` to allow any role in
     any skill slot. They also need concept requirements ("needs a back",
     "needs an attached TE playside") declared on each concept, rather than
     implied by slot names.
2. **Defensive controllers key on slot names too:** run fits by technique,
   `LB_S` presence meaning "base", NB and DB. New personnel (third safety,
   seventh DB, sixth DL) need roles, not new hard-coded names.
3. **Blocking rules against new fronts.**
   - Tite, Mint, 3-0-3 Bear, 2-4-5, mugs and 46 change who is covered and
     uncovered.
   - Zone, gap and protection rules must count the actual front.
   - Expect assignment gaps to show up. Each one is a controller task for its
     owner, not a reason to drop the front.
4. **Unbalanced lines and six OL** move OL slots. They come last.
5. **Motion and shifts** re-run strength and adjustments. Motion exists behind
   `MOTION`; adjustments to it need the acquired-information path.

## 7. Phases

Each phase is one bounded PR with focused evidence (TESTING_COSTS). Nothing
reaches the automatic callers until phase 5, so game receipts stay comparable
until then.

| Phase | Work | Evidence | Behavior change |
|---|---|---|---|
| 0 | `validateAlignment` plus the audit as a core test, with today's violations recorded as known failures (counts by cause). Fix the three causes in section 1 | Audit counts before and after. One matched restage only for the man-on-back fix, because it moves real pre-snap spots in two-back looks | Yes (alignment owners) |
| 1 | Structured formation spec and label renderers. Re-express the 18 existing formations; their alignments must come out byte-identical | Identity test on all 108 looks | No |
| 2 | ~50 new offensive formations and new personnel (20, 23, 01, 00), as data, tagged `catalog` (lab and film editor only) | Validator passes. One smallest-reproducer snap per formation family on IZ / Power / Stick / Four Verts. We're looking for breakage (unblocked defenders, frozen players, illegal snaps, assignment holes), not yards | No (lab only) |
| 3 | Defense: personnel as counts; line front split from second level; new fronts and strength rules; front × coverage install check | Validator plus `call-integrity` across the cross product. The same smallest-reproducer screen against the 18 existing formations | No (lab only) |
| 4 | Stress screen: each new family against a few concepts and defenses, one seed each. Name the controller gaps found, ranked by frequency and consequence | List of gaps with owners | No |
| 5 | Caller adoption: offense and defense pick from the catalog at NFL-shaped frequencies (BDB2025 formation and personnel fields; PFF/Sharp splits are a final-exam check only) | Matched restage and the 16-game run-only gate, as for #353 | Yes |

## 8. Owners (to confirm)

| Area | Owner (per WORKBOARD) |
|---|---|
| `alignOffense`, offensive formations, offensive caller | Run Game (offensive alignment) |
| `alignDefense` front/backer placement, defensive caller | Defense (run-defense session claim) |
| Coverage alignment, Cover 1 Lurk, nickel/SS placement, structure checks | Coverage |
| Validator, labeling, audit, cross-owner coordination of this plan | Main Engine (proposed) |
| Film-editor menus (`lab-app`) | Play Lab owner |

## 9. Decisions (Tanner, 2026-11-02)

1. **The section 2 refinements are approved,** with these additions:
   - **Run-fit spacing.**
     - 7-, 8- and 9-man spacing is how many defenders are committed to run
       gaps.
     - A light box is out-gapped unless it cancels a gap: twists or stunts,
       gap exchanges, two-gapping, or a safety fit.
     - Whether a front, coverage and alignment are sound together depends on
       this. The simulated coordinators must weigh it.
     - Stunts are a later, separate body of work.
   - **How defensive coordinators really call plays.** Research what a call
     contains, who decides what, and what's realistic, before designing the
     coordinator.
   - **DB alignment and leverage for every coverage.**
     - Press or off, technique, depth.
     - Leverage toward help: in Cover 1 a slot corner with a robber or rat
       inside plays outside leverage to funnel the receiver to that help.
   - **Adjustment and disguise differ by defense.** Each defense has its own
     profile, so motion doesn't give the coverage away.
2. **The phase 0 alignment fixes go first.** Main Engine does them.
3. **New formations stay out of games** until they pass the screen.
4. **Main Engine drives most of this.** The other agents stay on their
   current work. Start small and do the easy things first. Film-editor menus
   come at the very end.

Research for these additions: [defensive calls, spacing, leverage and disguise](references/defensive-calls-and-leverage.md).

## Sources

- **NFL rule references:** NFL video rulebook, illegal formation (Rule 7-5-1,
  seven on the line) and illegal motion/shift; 2021 jersey-number rule
  (nfl.com). The current local summary is `docs/NFL_RULES.md`.
  `presnap-rules.ts` remains the authority in code. Exact rulebook text should
  be checked against the official PDF before any new legality code is added;
  operations.nfl.com was unreachable from this session.
- **Terminology:** Erhardt-Perkins and West Coast systems (Smart Football;
  Wikipedia, Formation (American football)); Madden playbook formation names
  (Operation Sports, Madden School, Game8). Staffs differ, so names are label
  tables, not semantics.
- **Defensive structure and adjustments:** MatchQuarters (nickel fronts;
  split-field and iso checks; 12/13 personnel); the HonestNFL and 2017 Colts
  install references already cited in `alignment.ts` and `coverages.ts`.
- **Usage, final exam only:**
  - PFF and Sharp Football personnel frequencies (11 personnel about 56–60%,
    12 personnel 22% in 2024);
  - PFF defensive personnel (nickel 59–67%, 2023–2025);
  - NFL.com split-safety rate (about 40%);
  - under-center rate rising to about 35–42% (2025–26 reports).
