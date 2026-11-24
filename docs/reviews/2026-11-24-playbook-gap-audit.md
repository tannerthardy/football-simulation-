# Passing playbook gap audit (2026-11-24)

Read-only audit. Repo state: branch `claude/laughing-cray-4vqegz` at `c63fa7471` (contains `src/playbook/calls/`).
The call-composition design note is not on this branch; it was read from
`origin/rules/call-composition:docs/reviews/2026-11-24-call-composition.md`. No file named
`2026-11-24-call-compose-step2.md` exists on any fetched ref. There are no files named `call-axes`,
`call-compose`, `read-plans`, `motions` or `protections` in `src/playbook/`.

Verification marks used below:
- **[V]** name seen in a public guide or list this session (sources at the end).
- **[M]** from general knowledge of Madden playbooks and NFL systems; not confirmed by a source this session.
- "Commonness" is my judgment of real NFL use, not a measured number.

## 1. What we have

### Formations: `src/playbook/formations.ts` (24)

| Personnel | Formations |
|---|---|
| 11 | Gun Doubles, Gun Trips, Gun Trey (TE attached), Gun Bunch, Gun Empty (3x2, back as inner slot), Gun Split, Gun Split Y-Off, Singleback Ace, Pistol Doubles, Singleback Trips |
| 10 | Gun Spread (2x2), Gun Trips Open |
| 12 | Singleback Twin TE, Gun Wing, Gun Split Close, Pistol Twin TE |
| 21 | I-Form Pro, I-Form Twins, Strong Offset I, Gun Split Pro, Gun Split Twins |
| 20 | Gun Split Backs |
| 22 | I-Form Jumbo |
| 13 | Heavy Wing |

- Personnel groups (`OFF_PERSONNEL`, `src/playbook/types.ts`): 10, 11, 12, 13, 20, 21, 22. No 00, 01, 02, 23, no
  six-linemen group.
- QB alignment: `under`, `gun`, `pistol`.
- Split classes (`Split` in `types.ts`): `wide`, `slot`, `slot2`, `inline`, `wing`, `core`, or explicit yards. Only
  Gun Bunch uses explicit receiver yards (6.2 / 7.5 / 9).
- Automatic alignment adjustments in `src/playbook/alignment.ts`: `ROUTE_ROOM` moves the #1's split by his route
  (reduced for out-breakers and crossers, wide for verticals); `TE_OFF` sometimes sets an attached end off the ball on
  zone runs. These are per-route nudges, not a callable tight/plus/minus split.
- `src/playbook/structure.ts` lets the defense recognize bunch, stack, nub, reduced, quads, empty and two-back
  structures. The offense has no stack, nub or quads formation to trigger most of them.
- Back alignments: gun offset (one side), pistol, under-center dot, I, strong offset I, gun split backs. No weak
  offset I, no near/far, no sidecar strong/weak choice, no back flexed wide as a base alignment.
- `docs/FORMATION_CATALOG_PLAN.md` is a proposal for a larger catalog; not implemented.

### Routes: `src/playbook/routes.ts` (35 ids)

- Vertical: `go`, `fade`, `seam`, `seam_read` (post or under by the middle safety).
- Quick: `hitch`, `quick_hitch`, `slant`, `quick_out`, `stick`, `short_in`.
- Flat: `flat`, `arrow`.
- Intermediate: `out`, `dig`, `curl`, `comeback`, `hook`, `deep_out`.
- Deep breaking: `post`, `corner`.
- Crossers: `shallow`, `shallow_high`, `mesh_under` (flagged), `cross`.
- Back: `swing`, `checkdown`, `angle`, `back_flat`, `back_out`, `wheel`.
- Screen paths: `slip_screen`, `te_screen`, `bubble`, `now_screen`, `tunnel`.
- Read routes: only `stick` and `hook` (sit versus zone) and `seam_read`. `RouteRead` supports keys `underneath` and
  `middle` only.
- No double-move route of any kind. No pivot/whip/return. No receiver wheel (the wheel is in the back family).

### Pass concepts: `src/playbook/concepts.ts`, `src/playbook/calls/`

- 32 pool concepts (`PASS_CONCEPTS`): 17 base plus 15 menu (`CONCEPT_MENU`, on).
  - Quick: Slant-Flat, Stick, Speed Outs, All Hitch, Double Slants, Hitch-Out, Seam-Slant, Trips Hitch-Flat.
  - Dropback: Smash, Curl-Flat, Mesh, Four Verticals, Flood, Dagger, Drive, Y-Cross, Levels, Comebacks, Fade-Flat,
    Hitch-Post, Double Outs, Hitch-Cross, Post-Cross, Corner-Out, Corner-Flat, Trips Sail, Seam-Hitch, Trips Outs,
    Verticals-Hitch.
  - Play action: PA Post-Dig, PA Flood, PA Shot (fakes: inside zone, outside zone).
- Composition tables (`CALL_COMPOSE`, off): `calls/halves.ts` has 34 half concepts and 9 full-field concepts;
  `calls/compositions.ts` rebuilds the same 32. `calls/types.ts` declares `PassCall` (formation, motion, protection,
  routes, tags, back job, drop, snap, alert, kill, fake) but the play-caller does not build one yet.
- Read plans: `src/playbook/read-compiler/` (candidates, motifs, features, compile, runtime).

### Screens, RPO, play action, movement

- `SCREEN_CONCEPTS` (6): RB Slip, TE Screen, Trips Bubble, Bunch Now, Now (wide), Tunnel.
  The play-caller only calls the four quick receiver screens (`quickScreensFor`, `SCREEN_CALL` on). The RB slip and TE
  screen are lab-only (`scripts/diag/screen-lab.mts`).
- `RPO_CONCEPTS` (1): Inside Zone / Now, from Gun Doubles only. Pre-snap count read (`QBMind.rpoRead`). No post-snap
  conflict-defender read.
- Play action: three concepts. `DropType` includes `boot`, but `src/sim/called-drop.ts` treats it the same as `pa`
  and no concept uses it. `read-compiler/runtime.ts` says a bootleg is something "ours is not".
- No rollout, sprint-out, bootleg, naked, waggle or designed pocket movement anywhere in `src`.

### Motion: `src/sim/motion.ts`, `src/game/playcaller.ts` (`MOTION` on)

- `MotionKind`: `across`, `jet`, `empty` (back out of the backfield), `return` (yo-yo). One man only.
- No orbit, no short/in motion that changes a split without crossing, no motion into a bunch or stack as a named
  call, no shifts (two or more players resetting), no trade of the TE, no double motion.
- Jet is a path and a snap timing; I found no jet sweep, touch pass or jet-fake pass concept that uses the motion man.
  Screens are called without motion.

### Protection

- `ProtectionCall` in `calls/types.ts` declares `half_slide`, `full_slide`, `man`, `jet`, `max` and TE
  `stay/check/release`; declared for a later step and not read.
- Today the back's job is per concept: stay, check-release, or an assigned route (`BackJob`). `PassAssignment` has
  `chip`. `docs/reviews/2026-11-11-protection.md` records that our protection size sits near six in every situation.
- Hot throws exist in the QB (`src/sim/behaviors/qb.ts`), as "the quickest-breaking route on that side". No receiver
  sight adjust or built-in hot route conversion.

## 2. Reference inventory (names and categories only)

### Formation families

- Gun: Doubles, Doubles Y-Off, Trips, Trips TE, Trips TE Offset, Trey, Trey Open, Trey Y-Flex, Trio / Y-Off Trio,
  Bunch, Bunch Offset, Bunch Wk, Bunch Str Nasty, Tight (Tight Open, Tight Offset TE, Tight Doubles, Tight Y-Off),
  Stack variants, Spread, Spread Y-Slot, Empty (Trey, Base, Bunch, Quads), Split Close, Split Slot, Deuce Close,
  Wing / Wing Slot Offset, Normal Y-Off, Trips HB Wk, Y-Off Trips Nasty. [V for most; Stack and Empty sub-variants M]
- Singleback: Ace, Ace Pair, Deuce / Deuce Close / Deuce Y-Flex, Doubles, Bunch / Bunch TE / Bunch X Nasty, Wing /
  Wing Slot / Wing Pair, Trips, Tight Slots, Dice Slot, Jumbo, Tackle Over. [Ace, Wing, Bunch, Doubles, Deuce V; rest M]
- Pistol: Ace, Doubles, Trips Open, Bunch, Wing, Strong / Weak I, Tight Y-Off Flex, Full House. [partly V]
- I-Form and offset: I Pro, I Twins / Slot, I Close, I Tight, I Hulk (heavy), Strong I, Weak I, Strong Close, Near /
  Far (older editions), Full House, Power I. [V for Close, Slot, Hulk, Strong, Weak, Near, Far, Full House]
- Other: Goal Line, Wildcat, two-back gun "Duo" sets. [V]
- Name modifiers that recur: Nasty (reduced split), Tight, Close, Flex (TE detached), Y-Off (TE off the ball), Offset
  / Wk / Str (back side), Open (no TE to that side), Slot, Wing, Pair, Stack, Bunch, Trey vs Trio vs Trips (who the
  three are), Over (unbalanced line).

### Pass concept categories

- Quick game: slant-flat, stick, spacing, snag/spot, hitches, speed outs, double slants, drag/"Texas", tosser,
  quick fade, smoke/now. [M, standard]
- Dropback: smash, flood/sail, mesh, drive, levels, dagger, Y-cross, shallow cross, four verticals, verts switch,
  curl-flat, China/smash return, post-wheel, scissors, mills (post-dig), Yankee, bench, follow, drive-corner, HB
  angle/Texas, choice/option, deep over shots. [M, standard; "return-route concepts" V]
- Play action: PA boot / boot over, naked, rollout, PA crossers, PA post shots, PA from under center and gun, PA
  screen (PA Jailbreak Screen), fake-swing wheel. [PA Boot, PA Rollout, PA Jailbreak Screen V]
- Screens: HB slip, HB/TE/WR screen, bubble, smoke/now, tunnel, jailbreak, double screen, swing screen, TE screen,
  middle screen, throwback. [HB Slip, Bubble, Double Screen, Dbl WR Screen, Jailbreak V; rest M]
- RPO: tagged Read, Peek, Alert, Walk, Glance, with the route named (Bubble, Slant, Quick Out, Hitch, Glance,
  Stick). [V for the tag types and Bubble/Slant/Out/Hitch/Glance; Stick M]
- Motion: jet (incl. Jet Touch Pass), orbit, return, exit (back out wide), across, short, double motion, shifts.
  [jet, orbit, return, exit, double motion V in general guides; exact Madden menu labels not verified]

### Route set beyond the basic tree

Hot-route lists [V]: out, in, curl, post, corner, slant, drag, deep over, sluggo, post sit, return, comeback, smoke
screen (outside WR); streak, speed out, deep cross, zig, short cross, slot fade, flat (slot); wheel, stick nod (TE);
swing, Texas, wheel, block and release (RB).
Other route names [M]: whip/pivot [V], angle [V], stutter, hitch-and-go, out-and-up, blaze out, bench, follow, spot,
snag, option/choice, sit, dig, shallow, deep in, post-corner, corner-post, skinny post, back-shoulder fade, seam
bender, jerk, juke, whip-in.

## 3. Structural gaps (things we lack entirely)

1. **Movement passes.** No bootleg, naked, rollout or sprint-out; `boot` is an alias of the PA drop. A large share
   of under-center play action in the wide-zone systems is boot, so this is the biggest single hole.
2. **Double moves and return routes.** No sluggo, hitch-and-go, out-and-up, stutter, post-corner, corner-post, and
   no whip/pivot/return/zig. The whole "break, then break again" class is absent.
3. **Option/choice routes.** Only sit-versus-zone and one seam read. No two- or three-way option route by leverage,
   no sight adjust, no hot conversion.
4. **Condensed offense.** One explicit bunch. No stack, no tight/nasty splits as a call, no tight doubles, no
   reduced trips, no plus/minus split modifier. Split is tied to the formation row (plus the `ROUTE_ROOM` nudge).
5. **Formation modifiers as an axis.** Formations are 24 hand-written rows. There is no way to say "Trips, Y-off,
   back weak, nasty". Back side (strong/weak), TE on/off/flexed, and split width are not separately callable.
6. **Motion vocabulary.** Four single-man motions. No orbit, short motion, shifts, TE trade, or motion to and from
   bunch/stack; no pass or run concept built on the jet man (touch pass, jet-fake boot).
7. **Screens in the called game.** RB slip and TE screens exist but are lab-only. No swing screen, jailbreak, double
   screen, middle screen, or PA screen.
8. **RPO.** One RPO from one formation with a pre-snap count. No post-snap read RPO (glance, slant, stick, pop).
9. **Protection as a call.** Declared type only. No called slide side, max protect, six- versus seven-man choice,
   or scat/free release word driving who is out.
10. **Empty and quads.** One empty (3x2 with the back as inner slot). No empty with a TE attached, no 4x1 quads, no
    10-personnel empty.
11. **Missing staple concepts.** Spacing, snag/spot, scissors, post-wheel, mills, Yankee, switch verticals, China,
    sail from two-receiver sides with a back, shallow-cross series beyond drive/mesh.

## 4. Gap table (ordered by commonness in real NFL use; commonness is judgment)

Have: yes / partial / no. File is where it is or would go.

| Item | Category | Have | Where | NFL use |
|---|---|---|---|---|
| PA boot / naked (flood off the boot) | play action | no | `concepts.ts`, `called-drop.ts` (`boot` is a PA alias) | high |
| Called protection (slide side, 5/6/7-man, max) | protection | partial (type only) | `calls/types.ts` `ProtectionCall` | high |
| Back release words (scat, slow, check) | protection | partial (`check`, stay, route) | `calls/types.ts` `BackJob` | high |
| Option / choice route (slot or back, 2-3 way) | route | no | `routes.ts` `RouteRead` | high |
| Hot route / sight adjust by receiver | route | partial (QB hot only) | `behaviors/qb.ts`; `routes.ts` | high |
| RB slip / HB screen in the called pool | screen | partial (lab only) | `concepts.ts` `SCREEN_CONCEPTS`, `playcaller.ts` | high |
| Tight / nasty (reduced) splits as a call | alignment | partial (`ROUTE_ROOM` nudge) | `alignment.ts`, `types.ts` `Split` | high |
| Bunch variants (under center, weak, tight bunch, bunch offset) | formation | partial (1 gun bunch) | `formations.ts` | high |
| Stack alignments (two-man stack, stack slot) | formation | no (defense recognizes it) | `formations.ts`; `structure.ts` | high |
| Short motion / motion to stack or bunch | motion | no | `sim/motion.ts` `MotionKind` | high |
| Shifts (two or more men reset), TE trade | motion | no | `sim/motion.ts` | high |
| TE off the ball / Y-off as a modifier in any set | alignment | partial (2 rows + `TE_OFF` on zone runs) | `formations.ts`, `alignment.ts` | high |
| Back strong/weak offset as a choice in gun | back alignment | partial (fixed per row) | `formations.ts` | high |
| Spacing / snag / spot (triangle quick game) | concept | no | `calls/halves.ts` | high |
| Whip / pivot / return | route | no | `routes.ts` | high |
| Deep over (PA crosser at 18-22) | route | partial (`cross` reaches 21) | `routes.ts` | high |
| PA crossers / PA boot over | play action | partial (PA Flood has a cross) | `concepts.ts` | high |
| Glance / slant RPO (post-snap read) | RPO | no | `concepts.ts` `RPO_CONCEPTS`, `qbmind.ts` | high |
| Bubble / now RPO from more sets (trips, 3x1) | RPO | partial (1 formation) | `concepts.ts` | high |
| Under-center 12 and 21 PA shots beyond three | play action | partial (3 concepts) | `concepts.ts` | high |
| Back-shoulder fade / slot fade | route | partial (`fade` only) | `routes.ts` | high |
| Swing screen / swing as a quick throw | screen | partial (`swing` route, no screen) | `concepts.ts` | medium |
| Orbit motion (and orbit return) | motion | no | `sim/motion.ts` | medium |
| Jet-motion concepts (touch pass, jet-fake pass) | motion | partial (path only) | `sim/motion.ts`, `concepts.ts` | medium |
| Empty variants (TE attached, 10 empty, empty bunch) | formation | partial (1) | `formations.ts` | medium |
| Tight doubles / condensed 2x2 | formation | no | `formations.ts` | medium |
| Trips with nub TE / closed backside | formation | partial (Gun Trey has TE in trips, no nub) | `formations.ts` | medium |
| Trio / Y-off trips (TE as #3 off the ball) | formation | no | `formations.ts` | medium |
| Singleback Wing / Wing Pair, Deuce (12, 2x2 TE each side, flexed) | formation | partial (Twin TE, Gun Wing) | `formations.ts` | medium |
| Pistol variants (trips, wing, strong/weak) | formation | partial (2) | `formations.ts` | medium |
| Weak I / offset weak | formation | no | `formations.ts` | medium |
| Sluggo (slant-and-go) | route | no | `routes.ts` | medium |
| Hitch-and-go / stutter-go | route | no | `routes.ts` | medium |
| Out-and-up | route | no | `routes.ts` | medium |
| Post-corner / corner-post | route | no | `routes.ts` | medium |
| Receiver wheel (slot or TE) | route | partial (back wheel) | `routes.ts` | medium |
| Texas / angle by the back as a concept | concept | partial (`angle` route, used as a back tag) | `calls/compositions.ts` | medium |
| Zig (in-then-out by the slot) | route | no | `routes.ts` | medium |
| Skinny post / bang 8 / glance | route | no | `routes.ts` | medium |
| Scissors (post-corner switch) | concept | no | `calls/halves.ts` | medium |
| Post-wheel | concept | no | `calls/halves.ts` | medium |
| Mills (post over dig) | concept | partial (PA Post-Dig) | `calls/halves.ts` | medium |
| Yankee (deep over + post, max protect) | concept | partial (PA Shot is close) | `calls/halves.ts` | medium |
| Switch verticals / switch release | concept | no | `calls/halves.ts` | medium |
| Shallow cross series (shallow + dig + sit) | concept | partial (Drive, Mesh) | `calls/halves.ts` | medium |
| Sail from a two-receiver side with the back | concept | partial (Flood, Trips Sail) | `calls/halves.ts` | medium |
| Tosser (double slants) + mixed halves | concept | partial (step 1 keeps today's pairs) | `calls/compositions.ts` | medium |
| Tunnel / jailbreak with motion | screen | partial (tunnel, no motion) | `concepts.ts`, `playcaller.ts` | medium |
| TE screen / TE delay in the called pool | screen | partial (lab only) | `concepts.ts` | medium |
| Stick RPO / pop pass RPO | RPO | no | `concepts.ts` | medium |
| Sprint-out / rollout (half-field) | movement | no | `concepts.ts`, `called-drop.ts` | medium |
| Chip-and-release by TE or back | protection | partial (`chip` assignment exists) | `types.ts` `PassAssignment` | medium |
| Alert / kill (two plays in one call) | call | partial (declared; screens have `kill`) | `calls/types.ts` | medium |
| Plus / minus split, WR on vs off the ball | alignment | no | `types.ts` `Split` | medium |
| Back flexed wide as base alignment | back alignment | partial (`empty` motion, Gun Empty) | `formations.ts` | medium |
| China / smash return | concept | no | `calls/halves.ts` | low |
| Bench (double deep outs) | concept | partial (Double Outs) | `calls/halves.ts` | low |
| Follow (two in-breakers stacked) | concept | partial (Levels) | `calls/halves.ts` | low |
| Blaze out (post stem to out) | route | no | `routes.ts` | low |
| Double screen / middle screen / throwback | screen | no | `concepts.ts` | low |
| PA screen | screen | no | `concepts.ts` | low |
| Quads (4x1) | formation | no (defense has a `quads` tag) | `formations.ts` | low |
| Tackle over / unbalanced, six linemen | formation | no | `formations.ts`, `OFF_PERSONNEL` | low |
| Full house, Power I, Near/Far | formation | no | `formations.ts` | low |
| Wildcat | formation | no | `formations.ts` | low |
| 00 / 01 / 02 personnel | personnel | no | `types.ts` `PersonnelId` | low |
| Double motion | motion | no | `sim/motion.ts` | low |
| Trick passes (double pass, flea flicker) | concept | no | `concepts.ts` | low |

## 5. Could not verify

- A full official Madden formation list. EA's playbook pages and civil.gg returned no content to the fetcher; the
  formation names above come from search summaries of several guides across Madden 17 to 27 and from memory.
- Exact Madden labels for motion plays ("PA Orbit", "Cheat", "Shift"), for stutter, blaze out, bench, follow, and for
  "Stack", "Tackle Over" and "Wing Pair" as formation names in a specific edition.
- "Tunnel Screen" and "TE Screen" as exact Madden play names (a "PA GT Z Tunnel" was listed).
- Whether any repo branch other than the two read here holds call-compose step 2 work. `calls/halves.ts` says step 2
  adds the alternate half versions.
- Repo items were checked by reading the tables and by grep, not by running the sim.

## Sources

- Hot-route lists by position: https://www.u4gm.com/madden-nfl-26/blog-unlock-every-hot-route-in-madden-26
- Formation names: https://maddenturf.com/formation-database/ ; https://operationsports.com/10-best-madden-25-offensive-playbooks-ranked ;
  https://madden-school.com/14-new-formations-and-300-new-plays-added-to-madden-22 ; https://madden-school.com/5-best-offensive-playbooks-in-madden-24 ;
  https://game8.co/games/Madden-NFL-25/archives/468766 ; https://www.ea.com/games/madden-nfl/madden-nfl-26/tips-and-tricks-hub/m26-best-offensive-playbooks
- Play names (search summaries of formation pages): https://civil.gg/playbooks/madden/plays/gun/trips-hb-wk ;
  https://civil.gg/playbooks/madden/plays/singleback/wing-slot
- RPO tag types: https://realsport101.com/article/madden-21-how-to-dominate-with-rpo-plays-run-pass-option-alert-peek-read ;
  https://operationsports.com/ea-sports-college-football-25-rpo-explainer-guide
- Route descriptions: https://www.mmoexp.com/News/madden-24-must-know-pass-routes.html
- Motion types: https://www.viqtorysports.com/pre-snap-movement-in-the-offense/ ; https://civil.gg/tips/cfb-26-new-motion-plays
- Current-edition concept names: https://games.gg/madden-nfl-27/guides/madden-nfl-27-offensive-playbook-guide/
