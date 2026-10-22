# Coverage checks and adjustments: sources and implementation status

Two research indexes, compiled 2026-10-22 for the coverage-rules work on
`claude/friendly-bardeen-56kqo2` (PR #193):

- [honestnfl-index.md](honestnfl-index.md): every coverage check, motion
  adjustment and pattern-match call in the in-repo HonestNFL library (~140
  coverage sheets, 20 originals viewed), the Coverage Operating System
  manuscript and the handbook. Tags: [S] stated, [D] read from the diagram,
  [I] inferred.
- [fangio-system.md](fangio-system.md): the Vic Fangio two-high system and
  its NFL descendants: principles, the coverage tree defender by defender,
  rotations, run fits, pressure family, usage data (NGS/PFF/BDB), and a
  prioritized gap list against this repo (section E).
- [web-sources.md](web-sources.md): public coaching sources (Saban's
  coverage manual transcription, Kirby Smart, Pruitt, Cover 7, MatchQuarters
  previews, Fangio write-ups, USA Football, Brophy), with URLs. Tags: [S],
  [I], [C] conflicting.

Both are syntheses by research agents; quotes are short and cited, and
anything inferred is marked. Where systems disagree (Cone, Trix, Lock, Trap,
Box safety, In-call ownership), the conflict sections list both versions.
The engine implements one coherent version per call and names its source.

Shared thresholds the engine uses: the **no-cover zone is 5 yards**
(HNFL-093/201, Saban "under in the first 5 yards", Michigan "past 5"); a
route "clears" it when the receiver has been seen deeper than 5. A corner's
inside "In/Under" call becomes final once the break has held **0.35 s**
(HNFL-079 "truly declares"). Every rule reads the receivers it keys every
tick, because a declaration is believed only after it persists in the
defender's own reads.

## How it fits together

1. **Call.** The defensive coordinator calls a coverage from the situation
   and its tree (`src/game/playcaller.ts`), and ranks the checks it wants
   this snap (`checkPrefer`): Trix on passing downs, Book/Stubbie when the
   backside must stay 3-over-2; Saban-style quarters trees default to
   Stubbie, Fangio-style two-high trees lean Trix; a check the offense keeps
   beating gives way (learned from the installed call the game feeds back).
2. **Identify.** At the snap the secondary reads the aligned offense
   (`formationStructure`, `src/playbook/structure.ts`): trips open/closed,
   bunch, stack, nub, empty 3x2, quads, two-back, isolated X, reduced splits,
   field side.
3. **Check.** `checkCall` (`src/playbook/coverages.ts`) applies the first
   structure check whose tags match, then the old distribution checks. A
   check is a whole installed call, made only when every player it names is
   on the field and not spent by the pressure. The play log records the
   structure checked on (`checkedOn`).
4. **Play.** Each coverage seat runs its pattern-match rule
   (`src/sim/coverage/rules.ts`) on its own delayed reads, including the
   post-snap calls below.

Film any scene with `node --import tsx scripts/coverage-rule-film.ts
<formation> <coverage> S1=go,S2=seam,W1=slant,B=flat`.

## Implementation status

| Area | Rule (source) | Status / test |
| --- | --- | --- |
| Corner vs #1 | MOD/Cover 3 corner: man on #1 unless he declares shallow; short stop/out/flat reversible; In/Under final after 0.35 s (HNFL-079, Michigan, Saban) | Done; `corner-one-release` |
| Corner vs x1 | Tight 1/4: no China vs a lone #1, only In (HNFL-095) | Done; `quarters-trips-rules` |
| Quarter Flat | China push to #1; #3-away carry of #2 shallow; first flat of #2 (HNFL-094/365) | Done; `quarters-trips-rules` |
| Trix/Poach | Backside safety keys #3 to X, squeezes X when #3 cancels; read hook walls #3 (HNFL-197) | Done; `quarters-trips-rules` |
| Stubbie/Book | MEG #1, MUSH #2, read hook, 3/2 safety #3 first (HNFL-270/309, Saban, Pruitt) | Done; `quarters-trips-rules` |
| Cover 3 Push | Fast #3/back to the flat: seam/flat chases, hook pushes to #2 (HNFL-203/065) | Done; `cover3-cover2-rules` |
| Cover 3 Smash | #1 short with #2 vertical: overhang hunts #1 (HNFL-016, Rip/Liz) | Done; `cover3-cover2-rules` |
| Squat corner | No flat threat: man under #1 on any route (HNFL-099/255) | Done; `cover3-cover2-rules` |
| Vertical curl | Halves apex matches #2 up and in (HNFL-097) | Done; `cover3-cover2-rules` |
| Pre-snap structure | trips open/closed, bunch, stack, nub, empty, two-back, iso X, reduced, field side | Done; `formation-structure` |
| Check framework | Ordered structure checks, installability guard, recorded check | Done; `presnap-coverage-checks` |
| Quarters checks | Trix/Stubbie vs trips, Box vs bunch, Book/Read vs empty (HNFL-194) | Done; `presnap-coverage-checks` |
| Cover 2 Wild | Vs trips the middle hook carries #3 (HNFL-131/334) | Done; `cover3-cover2-rules` |
| Cover 6 checks | Book vs trips, Box vs bunch (HNFL-324) | Done; `presnap-coverage-checks` |
| Cover 1 Banjo | Vs bunch: point locked, corner/safety trade #1/#3 by release (HNFL-074) | Done; `presnap-coverage-checks` |
| Cover 3 Clue | Vs bunch: Clue 1/3 corner keying #2 to #1, bunch side spot-drops (HNFL-091/203) | Done; `presnap-coverage-checks` |
| Coordinator menu | Trix vs Book by down, tree and learned results (HNFL-195) | Done; `defensive-check-menu` |
| Cover 9 tree | Weak rotation as the two-high tree's Cover 3; Strap (#3 receiver hook, bonus hook), Clue, Grab (HNFL-054/056/203) | Done; `fangio-tree` |
| Cover 6/8 | Squat half side; Cover 8 Trix vs trips (HNFL-324/325/336) | Done; `fangio-tree` |
| Cover 6 Area | Vs trips with #2/#3 close (`close_23`): China corner, triangle pickups over #2/#3, Topper safety (HNFL-073/052/195) | Done; `cover6-half-side` |
| Half-side curl | Cover 6/8 half-side apex plays vertical curl: wall #2 to 12, match #2 up and in (HNFL-097) | Done; `cover6-half-side` |
| Zeus | Resolved by where the target stands, then the structure check (trips #1 → Cover 8 Trix) | Done; `fangio-tree` |
| Sim pressures | Whip, Slug, Sting; dropped linemen with match rules; promised rush counts (HNFL-057/060/242) | Done; `sim-pressures` |
| Home shell | Two-high tree disguises from one quarters look | Done; `fangio-tree` |
| Cover 1 Lurk | Down safety by formation, lurker in the hole (HNFL-240) | Done; `fangio-tree` |
| Hands family | Pounder, Finger, Rolex (HNFL-074/208/261) | Done; `fangio-tree` |
| Hands vs bunch | Mini Fist/Pounder: nickel locks the point, corner and Mike banjo #1/#3, safeties as called; nickel personnel only (HNFL-074) | Done; `hands-bunch` |
| Deuce | Five-man zone pressure from two-high that installs its own 2-deep/4-under coverage; soft-squat corners trap #2's quick flat, apexes wall #2, halves safeties take #2 deep; DOT backside vs trips (HNFL-302/373); `DEUCE=1`, off by default | Done; `deuce` |
| Motion | Across, jet, empty, return; final-formation check; provisional bump (MOTION=1) | Done; `offensive-motion` |

In two seeded games (seeds 3 and 7, 262 snaps) checks fired on 41 snaps:
Mable 9, Poach/Trix 7, Wild 5, Cover 6 Book 4, Banjo 6, Clue 3, Stubbie 4,
Box 2, Book/Read 1. Trips-family formations were about 40% of snaps and
bunch about 10%, so these answers are exercised in ordinary games.

## Fangio items still open

From [fangio-system.md](fangio-system.md) section E:
- **E1, owned by the pre-snap alignment work:** orient strength to the
  nickel side. Ties go to the field, and the nickel travels only on a
  change-of-strength motion.
- **E3, owned by the pre-snap alignment work:** real rotation timing (late
  pre-snap, at the snap, or post-snap), with the rotating safety fitting
  from where he actually is.
- **E4 rest:** half-side Smack, Read and Patty. Smack keys an oversplit #1, but
  our formations use fixed splits. Read and Patty differ from Squat mainly in
  alignment and in who owns the back's flat.
- **E7:** Lord, Ring, Chicago.
- **E8:** run-fit force table per coverage (Run owner).
- **E9:** Cut/Cone/Inc bracket tags.
- **E10 rest:** Tampa variants (Tupac, Boca, Miami). Deuce is installed behind `DEUCE=1`.
- **E11:** red-zone versions.

## Known limits

- **Box vs three verticals** from the bunch leaves the middle one to the
  deep zone; HNFL-194 answers this with Box Trix, not installed.
- **Banjo** is installed as a match call (`man: false`) so the pair can
  trade; receivers' option routes therefore read it as zone.
- **Push** is post-snap only; some sheets also make it pre-snap vs a fast #3.
- **Stack** checks (Lock, Top Hat, Zorro), **quads** checks, Cover 3 Grab vs
  empty and red-zone tools (Red 7 Bracket etc.) are not installed: the
  offense has no stack or quads formation and no red-zone package yet.

## Motion (MOTION=1, off by default)

`src/sim/motion.ts`. The offensive coordinator puts one off-ball player in
motion on about half its snaps:
- **across:** sets as the far side's new slot, tight inside a lone #1 (tracked median 5.4 yd from the ball), so 2x2 becomes 3x1;
- **jet:** still running parallel to the line at the snap, short of the ball. The snap is timed so he reaches the mesh about 0.6 s later; tracked jets snap a median 5 yd from the ball. A jet needs a run-up: only a man aligned at least 7 yd from the ball (slots and wideouts) runs one;
- **empty:** the back motions out to the weak side;
- **return:** yo-yo back to his spot.

Plans are timed by integrating the mover's sprint law along the path (start-up, braking, stops), so the planned snap spot matches where he is to within about half a yard. A set motion too long for 5.5 s runs faster, up to 0.9 of top speed, or is not called. Each motion plays out in the existing pre-snap timeline, alongside front
stems and creepers. Every plan is legal by construction under the installed
snap law: one man, off the line, not moving toward it at the snap. At the
snap the offense is renumbered from where players stand. Routes, the
coverage check (Zeus or the structure check) and all match rules then use
the final formation ("defend the final formation"; "any motion to 3x1 is
handled with a TRIX adjustment", HNFL-193).

**Defense, provisional default.** The secondary "bumps"
(HNFL-063, scouted 85%, HNFL-186):
- every 0.2 s it re-sorts to the alignment for the formation it saw 0.3 s
  earlier, and moves there at up to 0.75 of top speed;
- so a man defender keeps or trades his man the way the call's man
  preferences say, and the nickel runs with a change of strength;
- it never sees the motion's endpoint in advance.

Richer answers (lock/travel, spin or rock-and-roll safeties, linebackers
walking out over an emptied back) are pre-snap defender positioning. That
belongs to the defensive alignment owner (PR #190). `MotionRuntime.respond`
is the single seam to replace.

Tests: `test/offensive-motion.test.ts`, covering default-off parity, the
structure and check per kind, snap-law legality and the bump.
