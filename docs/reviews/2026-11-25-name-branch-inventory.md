# Name-branch inventory (2026-11-25)

Rules + Coaching, for Integration (Tanner's call-description rebuild). This is a read-only map of develop 039662744.
It lists every place in `src/` that branches on a call name, looks something up by one, or special-cases one. It
proposes no grammar and no migration.

**Method.** A scanner (scratchpad `names.py`) took the vocabularies from the code itself:
- concepts and halves, routes, coverages, fronts, pressures and run concepts (at run time);
- formations, zones, DefSlot, offensive slots and receiver refs, drop types, personnel and run schemes (from the type
  unions).

It then found every string literal from those sets in code (comments stripped) and classed each one by position:
compare (`===`, `!==`, `case`), lookup (`has`, `includes`, `[ ]`), table key, or set/list. Short tokens are shared
between kinds: `under` is both a front and a release class, `C` both a gap and the center, `power` both a run scheme and
a rush plan, `flat` both a route and a zone. So the per-kind counts below were checked by hand. The heavy files were
read directly.

**Protection** has no names: protections are computed by `ProtectionCoordinator` (sim/behaviors/blocking.ts) from the
box count and the back's job. Nothing branches on a protection id.

## Headline counts

| | literals | in a branch position | distinct lines | files |
|---|---|---|---|---|
| all of `src/` | 4,285 | 2,494 | 1,012 | 68 |
| player (sim) | | | 403 | 36 |
| coach (game) | | | 94 | 6 |
| validator | | | 5 (plus game/presnap-rules and call-eligibility, counted under coach) | 1 |
| playbook definitions / compile (data tables keyed by name) | | | 479 | 22 |
| lab, league, physics | | | 31 | 3 |

**The sim's name branches by kind**, counted by hand by meaning (rows are lines that test a name):

| kind | lines | where (lines) |
|---|---|---|
| run scheme | 61 | blocking 43, assign 12, carrier 3, engagement 2, qbmind 1 |
| offensive slot label (LT/RT/C/G, RB, H, F, X/Z/Y) | about 45 | blocking 24, qbmind 4, motion 3, qb 3, snap-count 2, run-fits 2, live-gaps 2, engagement 2, others 1 each |
| zone id | 23 | behaviors/defense 18, zone-eyes 2, run-fits 2, assign 1 |
| route id (through tables) | 17 direct | receiver 7, receiver-forecast 5, assign 3, screen-spot 1, route-read 1; plus every BREAK_DECL / getRoute lookup |
| defensive slot label | 12 | qbmind 3, run-fits 2, motion 2, coverage/rules 2, recognition 1, lineup 1, blocking 1 |
| personnel | 7 | qbmind 3, qbv2/roles 2, qbv2/drive 1, assign 1 |
| drop type | 4 | qb 3, defense 1 |
| concept id | 4 | qb.ts QB_V2_STAGED and qbV2Call (64, 67, 1634); qbmind 852 |
| coverage id / family | 3 | qbmind 2 (297, 387), coverage/rules 1 (420) |
| front / pressure id | 1 | qbmind 297 (`cover0` → `zero_6`) |
| formation id | 2 | playsim 1, qb 1 |

**The sim also reads names indirectly.** These sit outside the counts above:
- *Coverage/rules' match states:* `mode === 'smash' | 'trap' | 'flat' | 'under' | 'zoned'`, which are coverage-technique
  names. About 64 lines in sim/coverage/rules.ts.
- *The receivers' release classes:* `release === 'flat' | 'out' | 'under' | 'in' | 'stop' | 'vertical'`, which are
  route-family names read off his picture.

Both are vocabularies of their own, not call names, but they are where coverage knowledge lives.

## Inventory by reader

### Player (sim): reads names at run time

| file:line | branches on | football knowledge hidden there |
|---|---|---|
| sim/behaviors/blocking.ts:988-1280 (43 lines) | `concept.scheme` (insideZone, outsideZone, wideZone, splitZone, power, counter, duo, trap, draw, qbDraw, toss) | Each scheme's blocking rules: reach or drive and the reach's lateral aim (×1.8 wide zone, ×1.1 reach, ×0.6 inside), inside-first doubles, backside combo and cutoff, scoop, wing workers, draw's pass set, duo's doubles, counter's H puller. The split-zone slicer is required (throws without a TE/FB). |
| sim/behaviors/blocking.ts:155-631 (24 lines) | OL slot label (`LT`/`RT` = tackle; `LG`/`C`/`RG` = interior), `pullers.includes('H')` | Position technique by label: the tackle's pass-set zone (5.5 yd against 2.6-2.8), the outside set; which body pulls on counter. |
| sim/assign.ts:190-463 (12 scheme + 3 route + others) | `scheme`, `aim` (A/B/C), `back` ('block', 'check'), `teBlock`, ref 'B'/'B2' | How a call turns into each player's job: who counts in protection, the back's path and mesh per scheme (toss, draw, stretch mesh, IZ gun backside), the aim's gap. |
| sim/behaviors/carrier.ts, engagement.ts, run-read.ts, pa-look.ts (about 10) | `scheme` | The carrier's read and cut by scheme; the run-fake look. |
| sim/behaviors/defense.ts:1925-2557 (18 zone lines + about 15 numbering lookups) | zone id (`robber`, `hook_mid`, `hole`, `*flat*`, `deep_half_s/w`) | A zone's radius (6.5 / 7 / 11 yd), its style (robber and hole are always match), the half-field safety's two-receiver key, the flat's sink. The zone name carries the technique. |
| sim/coverage/rules.ts:91-683 (about 64) | match `mode` names and receiver release classes; `fam === 'cover4'/'cover6'` (420) | The pattern-match rules per coverage family: Mike's widen in quarters, corner-takes-flat, carry or wall the under, the smash rule. |
| sim/coverage/defender.ts, reads.ts | `offAlign.spots[slot].backfield`, `numbering[S1..]` | Who #1/#2/#3 is by the offense's own numbering. |
| sim/behaviors/qb.ts:64, 67, 1634 | concept id (`QB_V2_STAGED`: quick_outs, slant_flat, stick) | Which calls the new passer runs. |
| src/playbook/read-plans.ts (read by qb.ts through `planFor`) | concept id → `READ_PLANS[id]`; half routes → `BACKSIDE_RESET` | The whole read: key, cues, answers, hot, checkdown, side pick per concept; resets per backside half. |
| src/playbook/read-compiler/runtime.ts:134 (`KEYS`, read by the old passer) | concept id | Each concept's high-low pair, key role and danger defender. |
| src/playbook/route-breaks.ts:31 (`BREAK_DECL`), routes.ts:200 (`SHAPED`), 237 (`BREAK_CUTS`) | route id | Where a route breaks, cut or roll, through-speed, shape. The receiver, his forecast and the passer read them. |
| sim/receiver-forecast.ts, behaviors/receiver.ts (12) | route id / family | The forecast's break point and timing, the sit, the flat's end. |
| sim/qbmind.ts:290-424, 852 | coverage ids (`cover0` → pressure `zero_6`; shell), `DEF_PERSONNEL[personnel]`, `isDbSlot`, fallback `CB_S`/`CB_W` | The passer's coverage belief: canonical looks of every coverage against this formation; which bodies are DBs. |
| sim/qbv2/roles.ts, drive.ts | route ids (9), `isDbSlot(defCall.personnel, slot)` | The key roles by route landmarks; DB or not. |
| sim/behaviors/qb.ts (3), called-drop.ts (7) | drop type | Drop footwork and timing per drop name. |
| sim/run-fits.ts, motion.ts, lineup.ts, recognition.ts (about 20) | DefSlot, OffSlot labels; recognition `KEYS` by group (176) | Run-fit ownership by slot; motion adjustments by label; read keys per defender group (OL, pull, QB, RB, WR weights). |

### Coach (game): playcaller, call-mix, presnap rules, eligibility

| file:line | branches on | knowledge |
|---|---|---|
| game/playcaller.ts (about 81 lines) | personnel ids (64 literals), coverage ids (77), front ids (18: wide9, over, under), pressure ids (mug_*), run schemes (10), concept ids (`four_verts`, `pa_shot`, `comebacks` at 603-604) | The call sheet: personnel by situation and scheme; fronts by personnel and down; pressures by look; run scheme weights by formation (`RUN_FORM_RATIO` at 168, split zone needs an F); deep-shot and hurry tilts by concept id. |
| game/call-mix.ts (25) | route ids, drop | NFL call-mix buckets by route family. |
| game/presnap-rules.ts (9), call-eligibility.ts (6) | OffSlot labels, front | Legality: seven on the line, eligible numbers. |
| game/concept-fit.ts (5) | refs | Whether the formation fields the concept's refs. |

### Validator

| file | branches on | knowledge |
|---|---|---|
| playbook/call-integrity.ts (12) | DefSlot (9), pressure id | A defensive call is coherent: roles cover the slots; the pressure's rushers are fielded. |
| game/call-eligibility.ts, presnap-rules.ts | listed above | Offensive legality. |

### Playbook definitions and compile (the presets themselves)

These are the tables a description would replace or generate; they are data keyed by name.

| file | literals in table position | what it holds |
|---|---|---|
| playbook/coverages.ts | 334 (zone ids 143, refs 154) | Per coverage: each DefSlot's role (man on a ref, or a zone id), press, the shell, structure checks. |
| playbook/concepts.ts, calls/compositions.ts, calls/halves.ts | 295 + 283 + 35 halves | Per concept: routes on S1-S3, W1-W2, the back, drop, family, progression, beats (coverage ids), read line. |
| playbook/read-plans.ts | 172 (refs 169) | Read plans by concept. |
| playbook/alignment.ts | 181 (DefSlot 85, zone 32) | Fronts and coverages to alignment spots. Fronts already run from data (technique, side, depth); `FAMILY` (224) maps front ids to families. |
| playbook/defense.ts | 55 | Fronts and pressures (pressure: who rushes, who drops where). |
| playbook/formations.ts | | Formations: slot to spot, depth, inline, backfield. |

## Findings

**(1) What the sim actually reads from a call today.** This is the minimum a per-player description would have to
carry to reproduce today's football.

- **Offense, per player:**
  - slot and spot (alignment: depth, width, inline or backfield, QB depth);
  - route id, or a block or check, through `assign`;
  - for the call: drop, family (quick, dropback, play action, screen), `teBlock`, fake, screen receiver, and the read
    plan (key role, cues, answers, hot, checkdown, side pick);
  - for a run, scheme, aim (A/B/C), direction, pullers and mesh time. The blocking and back rules come from the
    scheme name.
  - Computed from the alignment and read by everyone: `offAlign.numbering` (#1/#2/#3 per side), `strongSign`,
    `hasTE`, `coreEdge`.
- **Defense, per player:**
  - spot and technique (front and coverage alignment);
  - role: man on a numbered receiver, or a zone id. The zone id implies radius, style and keys.
  - press;
  - for the call: coverage family and shell, zone style, structure checks, the pressure's rushers and droppers, DL
    game, gap exchange, run policy, front stem, creep, flat threat, drop start.
- **Field counts:** `offAlign.spots` is read 78 times, `strongSign` 41, `numbering` 17, `defAlign.spots` 37,
  `offCall.run` 51, `concept.scheme` 26, `concept.family` 17, `screen` 12, `pullers` 9.

**(2) The heaviest knots** (most football behind one name):
1. **Run scheme → blocking** (blocking.ts:988-1280, assign.ts:308-463). Every lineman's and the back's rule is chosen
   by the scheme name, with scheme-specific constants (reach ×1.8 for wide zone).
2. **Coverage family → match rules** (sim/coverage/rules.ts, about 64 lines). Quarters, Cover 6 and the smash, trap
   and flat modes are code paths, not data.
3. **Zone id → technique** (behaviors/defense.ts:1925-2557). The name decides radius, match or spot, and which
   receivers he keys.
4. **Concept id → read** (read-plans.ts READ_PLANS and planFor, read-compiler KEYS, QB_V2_STAGED). The read is data,
   but keyed by the concept name and gated by a name set.
5. **Route id → break** (route-breaks.ts BREAK_DECL, routes.ts SHAPED and BREAK_CUTS). Where a route breaks and how is
   a table by name, read by the receiver, the forecast and the passer.
6. **Coverage id → canonical look** (qbmind.ts:290-424). The passer's belief model enumerates the named coverages and
   special-cases `cover0` to pressure `zero_6`.
7. **Playcaller tables** (playcaller.ts). Personnel, front, pressure and run-scheme weights keyed by name, with
   concept-id tilts (`four_verts`, `pa_shot`, `comebacks`).
8. **OL slot label → technique** (blocking.ts, 24 lines). Tackle or interior by label, not by where the body stands.

**(3) Already data, against still code.**
- **Data:**
  - fronts: technique, side and depth per DefSlot (alignment.ts), with only `FAMILY` as a name map;
  - coverages: roles per DefSlot (coverages.ts);
  - concepts: routes per ref (concepts, compositions, halves);
  - formations: spots;
  - routes: points, plus BREAK_DECL by id;
  - read plans: data, keyed by concept id;
  - pressures: rushers and droppers.
- **Code:**
  - run schemes (blocking and back rules);
  - coverage-family match rules;
  - zone-id technique;
  - drop footwork (called-drop.ts);
  - the playcaller's situational weights;
  - the QB_V2 gate;
  - the passer's canonical-look model;
  - OL technique by slot label.

**(4) Surprises, including information a player could not observe.**
- **The receiver reads the defense's call.** behaviors/receiver.ts:864 and 900 read
  `sim.defAlign.spots[d.slot]` and use `spot.press && spot.manTarget === a.slot` to find the corner pressing him, which
  is the defender's private man assignment. A real receiver sees who is tight over him, not whom the defender was told
  to cover. Under a disguise or a banjo the two differ.
- **The passer knows bodies by label.**
  - qbv2/drive.ts:167, qbmind.ts:424 and 842: `isDbSlot(sim.defCall.personnel, slot)`. He knows which bodies are DBs
    from the defense's personnel package and slot label, not from their bodies.
  - qbmind.ts:290-296 reads `dc.personnel` (the package by name) and `dc.front` for the canonical looks. QB_CANON_SEEN
    marks this as "the personnel he sees".
  - With QB_CANON_SEEN off, the fallback names `CB_S`/`CB_W` (424).
  - Personnel is observable by counting; the label is not.
- **Defenders read the offense's numbering and installed spots.**
  - `offAlign.numbering` and `offAlign.spots[slot].backfield/pos`: behaviors/defense.ts 427, 890, 1466-1539,
    1949-2557; coverage/defender.ts:124; coverage/reads.ts:162.
  - The numbering is computed from the alignment, so it is observable. The installed spot (`home`) is the call's
    intended spot, not where the man stood: equal at the snap, but read after motion as well.
- **A structural requirement is a crash.** blocking.ts:1001 throws when split zone has no slicer (TE, FB or second
  back). Nothing in the call validates it beforehand: the playcaller weighs split zone down without an F (641-643),
  but the validator does not refuse it.
- **One name, three meanings.** `under` is a front, a receiver release class and a coverage-rules mode; `flat` a route,
  a zone and a match mode; `power` a run scheme and a rush plan (behaviors/defense.ts:508). A grammar would need
  separate namespaces.
- **The new passer is gated by a name set.** `QB_V2_STAGED` covers three concepts, so a description that composes the
  same routes under another name would not reach the new passer.
