# Coverage technique build queue (Coverage C14, 2026-11-23)

The 71-row technique inventory (`technique-inventory.md`: 13 modeled, 37 partly, 21 absent) turned into the order the
lanes work down after the current builds. Standard techniques only (Rules' STANDARD rows; one-staff checks and system
options deferred). Ordered by the wide-open receivers and yards each plausibly touches.

**Sources for the order:**
- the 8-game wide-open census (121 wide-open past the line, 553 yd to them; F0, F7);
- Tools' 24-game open census and its cells (Cover 2/6 10-15 yd, corner leverage at the break);
- the F6 corner measurement.

The shares are estimates: say so when quoting them.

**Lanes.**
- **Coverage:** coverage seats, technique, fill.
- **Flex:** underneath depth (hook / curl-flat / flat drops, man-on-back depth).
- **Defense:** rally and tackle leverage, pursuit.
- **Rules:** taught cards and receiver-side technique.
- **Tools:** operators and film.

**Physical means:**
- **today:** the engine has the contact, facing, head or hands it needs;
- **capability first:** a body capability must be built before the technique can exist.

| # | technique (standard, taught) | seats | est. share of wide-open / yards | lane | builds on | physical means | measurement that shows it working |
|---|---|---|---|---|---|---|---|
| 0 | **in progress:** squat-corner sink (zone turn off #1's release, side-on, level-to-outside, to the 10-12 yd hole, deep-to-short) | C2 / Tampa / C6 half / cloud corners | the Cover 2/6 10-15 yd excess (2.2-2.5x the NFL) | Coverage | SQUAT_SINK (built) | today | the 10-15 yd window vs NFL (.177 / .096); corner depth and under-#1 at 2.0 / 2.5 / 3.0 s vs Tools' NFL seat table; Cover 6 flat yd/att |
| 1 | **hard-corner jam** at the snap inside 5 yd (reroute #1 inside, spoil timing; then let him go and sink; misses cost him) | C2 / Tampa / cloud corners (also the Cover 1 press corner) | part of row 0's window, plus the quick game to #1 vs Cover 2 | Coverage (+ Rules for receiver release counters) | man-press contact in receiver.ts `handleRelease` (HandJoint); JAM_SQUARE (#860) and PRESS_ALIGN (#864), parked | today for contact. The corner's jam decision and timing are new (the receiver's controller starts contact now) | #1's release time to 5 yd and his release side vs Cover 2; corner on top / level / trail at the break; missed-jam rate and the outside release it gives up |
| 2 | **calls between underneath defenders:** Under (curl-flat robs #1, hook takes #2 in), in-breaking #2 carry with the Mike's Push, robot / dig bottom-up at 7-14 yd | Cover 3 match, quarters apex and Mike, fire-zone seam-flat and 3-hook | P1 + P3: about 17% / 12% (F09, F61) | Coverage | rules.ts `seamCurlFlatDeclared`, `quarterFlat` / `wallTwo`, `c3Hook`, `mike3`, `cutWall`; coordinated hand-offs (D2) | today (a read of a teammate's call is a seen cue: the partner's movement or a verbal call is a stated assumption) | P1 / P3 counts and yards; #2 dig / Y-cross open rate vs Cover 3 match and quarters; F09 / F61 film |
| 3 | **off-man break on the stop** (flat-foot QB read on 3-step, then hips / feet; drive on the plant) | Cover 1 / 2-Man off corners and slot | the owned-trailing short rows; Cover 1 corner on top at the break .39 vs NFL .59 | Coverage | OFF_DRIVE (built) | today for the drive; the flat-foot 3-step read needs a QB-drop cue from his picture (QB depth / footwork seen: available) | corner distance at the throw on hitch / out / stop vs Cover 1 Off; on top / level / trail at the break (Tools); double-move completions (cost) |
| 4 | **underneath seat fill** by role, non-crossing (Mike to hooks, Sam / Will / SS / NB to curl-flats); Grab's rotator to his own side's hook | all zone calls | 15% of underneath seats far or crossing; pre-snap collisions 10.6% vs NFL 0.9% (Flex) | Coverage | SEAT_FILL (built, measuring) | today | seat-travel share; crossings; Flex's pre-snap collision rate; F54 |
| 5 | **back and formation answers:** Funnel / release-side backer on backs, backs by release not slot, DOT check on any 3x1 including a flexed back | Cover 1 backers, Deuce, hooks | P10 + P6: about 5% past the line, most of the behind-the-line backs (F15, F68) | Coverage | alignment.ts man matching (≈1250-1316), `backTo`, coverages.ts checks | today | P6 / P10 counts; RB / FB wide-open behind the line; F15 / F68 film |
| 6 | **play-action leash** (a #2 / #3 release overrides the run key; curl depth before stepping up; pass-first on two-high safeties) | every underneath seat; halves | P5 about 1-3% here, more on film (F61) | Coverage (run fit hand-off: Defense) | `ZoneCoverage.zonePlay` → `runFit`; recognition.ts KEYS (LB WR 0); PASS_FIRST in ManCoverage | today | PA concept wide-open and yd/att; seat depth at the throw on PA |
| 7 | **man press technique:** kick-step / patience, catch or soft-shoe, ride in the hip, trail vs on top by phase, funnel leverage by help (help inside → outside leverage) | Cover 1 / 2-Man / Cover 0 corners and slot | Cover 1 wide-open is low (0.11 / set throw); the leverage rule fixes the slot's inside alignment (Flex: ours +0.17, NFL −0.33) | Coverage | MAN_TURN (C14-man-turn), MAN_PHASE (off), PRESS_MIRROR, `trackReceiver` leverage | today (facing, contact); in-phase ball look needs the man-defender head (BALL_EST man look, off) | Cover 1 corner on top at the break vs NFL; slot leverage vs Flex's NFL number; fade and out completion vs Cover 1 |
| 8 | **half-safety cap and depth:** divider on #1 / #2, cap a turned-up route, depth as turn-and-run cushion | Cover 2 / 6 / 2-Man halves | wait: Tools' seat table shows our half 1.7-1.9 yd shallower than the NFL with matching width | Coverage | HALF_KEY (on), HALF_CAP (parked), DEEP_CUSHION (C40) | today | half safety depth and width vs Tools' table; hitch-and-go / flat-up completions vs Cover 2 |
| 9 | **hooks "on a string", melt, Final 3 through** | Cover 3 / 2 hooks | partly in P1; small | Coverage (drop depth: Flex) | ZONE_LADDER (not landed, COV-12); `zoneBand` | today | hook-to-hook seam / curl open rate 10-15 yd vs Cover 3 / 2 |
| 10 | **robber and rat keys:** QB through the dig, drive on the crosser; hole cut in base Cover 1; Funnel / double lurk | Cover 1 robber / hole / rat | P9 / P11: 0 in the sample; crossers vs Cover 1 | Coverage | rules.ts `cut` (rat), `runRule('robber')` = zoneOf | today | crosser and dig open rate vs Cover 1 |
| 11 | **Lock / Cut / Jump on motion; In / Out and switch on rubs and stacks** | man calls | F05; rubs (mesh, snag, stack slant) | Coverage (+ Tools for motion operators) | motion.ts MotionRuntime (random lock); rules.ts `banjo` | today (the call is pre-set) | motion-to-flat and rub completions vs man |
| 12 | **underneath drop depth:** flat defender 2 yd deeper than the NFL at the throw; man on a back | flat, curl-flat, hook; backers on backs | Flex's measurement | **Flex** | zoneLandmark depths, spot-style sink, ManCoverage back depth | today | Flex's depth tables vs NFL |
| 13 | **rally and leverage tackling** by where help is; plant-and-drive angle on the catch | all | YAC, not openness | **Defense** | open-field.ts `onTopPoint`, common.ts `leverage`, tackle.ts | today | YAC after short completions vs NFL by coverage |
| 14 | **zone corner flat-foot drive on the 3-step set** (Cover 3, quarters) | Cover 3 / quarters / fire-zone corners | owned-on-top short rows are NFL-normal (Tools' aggregate): low | Coverage | DEEP_GATE, CORNER_DROP, `shoulderTarget` | today | hitch / out completion vs Cover 3 at 4-8 yd |
| 15 | **disguise and late-rotation footwork** (cadence creep, roll on the snap, 60/40 post shade, trips lean) | post safety, rotators | a disguise cost, little open | Coverage | `alignDisguised`, `look`, SHELL_SHOW | today | QB shell-read errors; rotation-late P8 / P4 rows |

**Receiver side (Rules / Flex).** Row 1's jam needs release counters, and row 3's drive needs double moves that sell (a
chop that looks like a hitch). The jam does not exist without a release that can beat it, and the drive does not exist
without a stop-and-go that can punish it. Both already exist in part (receiver.ts `handleRelease`, route breaks):
confirm them before row 1 and row 3 land.

**Deferred (scheme options, not standard):**
- the eight one-staff check variants;
- Screw and the Book trap;
- trip-check preference by system;
- Zeus;
- per-coach style mixing;
- the 2-Man bracket and Hot fire zones of the second tier.
