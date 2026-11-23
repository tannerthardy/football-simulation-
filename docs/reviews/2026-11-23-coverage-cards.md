# Coverage assignment cards, as taught (2026-11-23)

The user's request, through Integration: "do a lot of research in a lot of coverages and their rules again, as well as
any adjustments coaches make in these coverages against certain formations or motions". Every defender has an
assignment that is more than his coverage job: where he aligns, what he keys, whether he reads the QB's eyes or a man,
how hard he fits the run, and what play action does to him.

These cards are the taught side: what coaches teach for each coverage our engine can call, seat by seat. Coverage's
audit fills the same cards from our code (`docs/reviews/2026-11-23-coverage-cards-engine.md`), so the two diff field
for field. Flex measures the alignment, run-fit and play-action rows against NFL tracking. Research and writing
only; develop is frozen at engine-91 (0226f0d3) while the diagnosis runs.

The user's film notes (`docs/reviews/2026-11-18-film-room-notes.md`) point the work, especially:
- F09: quarters and the flat;
- F13, F15: Deuce, Deuce DOT, empty and motion to empty;
- F16: the corner and safety vs a vertical;
- F61, F68: play action and backs who fake.

## How to read a card

The heading is `### <coverage id> × <seat>`.
- The coverage id is from `src/playbook/coverages.ts`. A pressure card is `cover3+<pressure id> × <seat>`.
- Seats use the engine's slot names: CB_S, CB_W, NB, DB, SS, FS, LB_S, LB_M, LB_W, and a dropping lineman as DE_S /
  DE_W / DT.
- Strong / weak are the call's strength. Receivers are #1 / #2 / #3 outside-in on a side; B is the back.

Every card has the same rows, in the same order:

| # | field |
|---|---|
| 1 | alignment & shell shown: depth (yd off the LOS), leverage on whom, the shell shown vs played, disguise and rotation |
| 2 | run/pass key: what he reads first, when he declares |
| 3 | run fit: gap, force, alley, cutback, fold or deep; how aggressive |
| 4 | play-action rule: what keeps him honest, how far he may step, whose release overrides the run key, how he recovers, who covers if he bites |
| 5 | pass job: zone landmark or man, by #1 / #2 / #3's release (vertical / out / flat / in / under / stop / block) |
| 6 | relation to threats in his window: whom he squeezes, walls, carries or sinks under, from which side, at what cushion |
| 7 | eyes: QB, man or a sequence; when they change |
| 8 | pass-off: what he hands on, to whom, on what call; what he takes next |
| 9 | break trigger: what makes him leave his landmark or man for the ball |
| 10a | formation adjustments: 2×2, 3×1, empty, bunch / stack, nub / tight splits, back out wide |
| 10b | motion adjustments: across / bump / lock, return / rock-and-roll, spin, to empty |
| 10c | back release: check, swing, wheel or free release: who has him |
| 11 | notes |

Each rule carries a source (a short name and URL, with a short quoted phrase where there is one) and a confidence:
- high: a coaching source states it;
- med: inferred from a source's diagram or description;
- low: reasoning only.

Where coaches differ, the common NFL version comes first and "alt:" gives the other. A variant id carries only the
seats whose job differs from its base; the rest read "as <base>".

Each family opens with:
- the day-one install, the simple version a coach teaches first;
- the common NFL version against college forms;
- shell shown → played for each id, and what it is built to beat.

Families follow in this order: quarters and Cover 6; Cover 3 forms; Cover 2 and Tampa 2; man; fire zones; Deuce.
A short second tier lists NFL coverages the engine lacks.

Quotes are short and paraphrased; nothing downloaded is in the repository.

# Family 1: quarters and Cover 6



Research notes for coverage assignment cards. Nothing here is implemented; these are coaching rules paraphrased from web sources for the engine's controller.
Quotes are short phrases as they appeared in the fetched text. Several key sources (MatchQuarters, X&O Labs, Steelers Depot, Weekly Spiral) are
paywalled or returned 403. For those, only the visible introduction or a search-result excerpt was available, and those cells are marked `med` or `low`.

## Sources (level in brackets)

| key | source | level |
|---|---|---|
| [PFN] | Pro Football Network, "What is Quarters Coverage? … NFL's Two-High Revolution" | NFL-oriented explainer |
| [Bowen] | Matt Bowen (former NFL safety), Bleacher Report "NFL 101: Introducing the Basics of Cover 4" | NFL |
| [USAF-7] | USA Football blog, "College Coach details Quarters coverage" (Saban-style Cover 7: Box/MOD/MEG/Cone/Switch) | college |
| [USAF-7b] | USA Football blog, "… Quarters coverage (Part 2)" (Bracket/CC/Cut/Push, Iowa/Oklahoma safety) | college |
| [TDP-2R] | Throw Deep Publishing, "2 Read Coverage: One Coverage that solves a TON of Problems" | HS/college |
| [Viq-C4] | Viqtory Sports, "Cover 4 Defense Install Guide" | HS install |
| [Viq-SF] | Viqtory Sports, "How To Install Split Field Coverages" | HS install |
| [Bullock] | Mark Bullock (film analyst), "Commanders scheme breakdown: Quarters" | NFL film |
| [MQ-C8] | Cody Alexander, MatchQuarters "Fangio's Cover 8 Trix/Poach mechanics" (intro visible) | NFL |
| [MQ-Poach] | MatchQuarters "Coverage 101: Poach vs Solo (Jets)" (intro visible) | NFL |
| [MQ-Stub] | MatchQuarters "What is Stubbie coverage (Special/Mini/Lock-X)" (episode topic list only) | college/NFL |
| [MQ-Disg] | MatchQuarters Fangio/Eagles two-high disguise; Rams "closed-to-open Cover 2 traps"; Cowboys/Quinn (search excerpts) | NFL |
| [Kou] | Coach Kou, "Pass Defense: Different coverage concepts on defending trips" | college/NFL survey |
| [WRoss] | Wesley Ross, "Defeating Stubbie and Stump coverage" (search excerpt) | college |
| [XOL-key] | X&O Labs / Mike Kuchar, safety run-pass key ("pane of glass", Adam Waugh) (search excerpt; page 403) | HS/college |
| [XOL-empty] | X&O Labs / Kuchar empty-formation survey (search excerpt; page 403) | HS/college survey |
| [CI-425] | Coaches Insider, "Cover 4 from the 4-2-5" (search excerpt) | HS/college |
| [C6-snip] | Cover 6 explainer, search excerpt (likely Weekly Spiral "Cover 6"; page 403) | general |
| [MEG-def] | Football Advantage / Unanswered.io Cover 7 explainers (search excerpts) | general |

[PFN]: https://www.profootballnetwork.com/what-is-quarters-coverage-the-basic-xs-and-os-behind-the-nfls-two-high-revolution/
[Bowen]: https://bleacherreport.com/articles/2094989-nfl-101-introducing-the-basics-of-cover-4
[USAF-7]: https://blogs.usafootball.com/blog/7382/college-coach-details-quarters-coverage
[USAF-7b]: https://blogs.usafootball.com/blog/7422/college-coach-details-quarters-coverage-part-2
[TDP-2R]: https://throwdeeppublishing.com/blogs/news/one-coverage-that-solves-a-ton-of-problems
[Viq-C4]: https://www.viqtorysports.com/cover-4-in-football-coverage-guide/
[Viq-SF]: https://www.viqtorysports.com/split-field-coverage-in-football/
[Bullock]: https://markbullock.substack.com/p/commanders-scheme-breakdown-quarters
[MQ-C8]: https://www.matchquarters.com/p/fangios-cover-8-trix-poach-mechanics
[MQ-Poach]: https://www.matchquarters.com/p/coverage-101-poach-vs-solo-quarters-jets
[MQ-Stub]: https://www.matchquarters.com/p/what-is-stubbie-coverage-special-mini-lock-x-trips-coverages
[MQ-Disg]: https://www.matchquarters.com/p/fangio-cover-9-eagles-two-high-disguise
[MQ-C2O]: https://www.matchquarters.com/p/rams-closed-to-open-cover-2-traps
[MQ-Fangio]: https://www.matchquarters.com/p/unlocking-the-fangio-coverage-system
[Kou]: https://coachkoufootball.substack.com/p/pass-defense-different-coverage-concepts
[WRoss]: https://wesleyrossfootball.substack.com/p/defeating-stubbie-and-stump-coverage
[XOL-key]: https://www.xandolabs.com/?p=7544
[XOL-empty]: https://www.xandolabs.com/?p=11499
[CI-425]: https://coachesinsider.com/football/cover-4-from-the-4-2-5-defense-article/
[C6-snip]: https://weeklyspiral.com/2021/08/16/cover-6
[MEG-def]: https://footballadvantage.com/?p=3415

Seat mapping used throughout:
- **Base 2x2 (4-3, 21/12 personnel):** LB_S is the strong apex and curl-flat player, LB_W is the weak apex, LB_M is the hook.
- **Nickel (11 personnel):** NB replaces LB_S as the strong apex. LB_W is the weak apex when weak #2 is detached, or plays a box/hook seat when #2 is attached.
- **Dime:** DB takes the weak apex and LB_W leaves the field. Low confidence; this is reasoning only, and no source assigns the dime seat in quarters.
- **SS/FS** are the strong and weak quarter safeties. "Apex" means the overhang defender between the end man on the line (EMLOS) and #2.

---

## Family section

### (i) Day-one install

1. **Spot-drop Cover 4** is the first teaching step: a "4-deep, 3-under coverage" ([PFN]).
   - Corners and safeties each take a deep quarter.
   - The two flat defenders take curl-flat, and the Mike takes the middle hook ([Bowen]; [Viq-C4]).
2. **First pattern-read rules**, taught next ([Viq-C4]; [PFN]):
   - **Corner:** man on #1 if he goes deep. If #1 goes short or inside, he "zone[s] off to his deep 4th".
   - **Safety:** reads #2. If #2 goes vertical past the defense's vertical point, he takes #2 man. If #2 is not vertical, he robs #1 and helps the corner.
   - **Apex:** walls #2 from an inside vertical release, then checks the flat. With no flat threat he gains depth and reads the QB like a spot-drop.
   - **Hook (Mike):** takes the back. If the back stays in, he is the middle hole player.
3. **Vertical point.** Each defense defines it: "five, seven, or 10 yards" ([PFN]).
4. **Run support.** Safeties take a "flat-foot read" through their run/pass keys and "fill downhill versus the run". That gives nine potential run fitters versus 2x2 ([Bowen]; [Viq-C4]).

### (ii) Common NFL version vs college forms

- **NFL (Fangio/Staley family, Belichick lineage).**
  - Coverages: "Quarters" (Quads); Cover 6, which is quarters to one side and half to the other; Cover 8, Fangio's version with the half toward the passing strength; and Cover 9.
  - All are played from the same two-high look ([MQ-C8]; [MQ-Fangio]).
  - Bowen (NFL) says he sees more Cover 6 than straight Cover 4 on NFL tape ([Bowen]).
  - NFL calls named in Bowen's piece:
    - **Lock:** the backside corner plays solo on X.
    - **Cut:** the backside corner reads the QB and helps to the strength.
    - **Push:** the SS reads the TE release and pushes.
    - **Box:** a hand-signalled call.
    - **Zorro:** the corner sinks outside to take the TE's 7 (corner) route.
- **College / Saban "Cover 7" (match quarters).** Corner techniques ([USAF-7]):
  - **Box:** inside leverage, counting the corner's own steps (default 3) before manning #1.
  - **MOD:** press-bail, man on #1 unless #1 goes under (short and inside), which gets an "Under" call.
  - **MEG:** man on #1 "everywhere he goes", including sitting on his hitch.
  - **Cone:** man on #1 outside, MOD rules if #1 sneaks or crosses.
  - **Switch:** man on #1 unless #1 goes behind #2, then switch to #2.
  - The acronym MOD is given variously as "Man On Demand", "Man Outside and Deep" or "man other than drag" ([MEG-def]; [PFN]). The rule is the same in all of them.
- **Palms / 2-Read (HS/college, also NFL).** The corner reads #2 and "hammers" a quick out-breaking #2; the safety then caps #1 ([TDP-2R]). Keith Butler's Steelers ran "Palms" (Steelers Depot film room; page 403, so the NFL use is cited from the title only).
- **Trips forms.**
  - College: Stubbie/Special (Saban term) is the most popular split-field trips check outside the NFL ([MQ-Stub]; [WRoss]).
  - NFL: Fangio teams use Poach/Trix. The weak safety poaches the trips side to "backstop deep crossers", which leaves the X solo ([MQ-C8]).

### (iii) Shell shown → played, and what each is built to beat

| id | shell shown → played | built to beat | source / conf |
|---|---|---|---|
| cover4 | two-high (safeties 10-12) → 4-deep/3-under match quarters, MOD corners | 2x2 verticals and seams; gives safeties a run fit (9-man box vs 2x2); weak vs flats and quick game, and vs play action on safeties | [PFN] [Bowen] [Bullock] high |
| cover4_meg | two-high → quarters with corner MEG on #1 | a dominant or quick-game #1 (hitch, slant, comeback) that MOD's bail technique concedes; safety then free on #2 / robbing | [USAF-7] high (rule), med (purpose) |
| cover4_palms | two-high → 2-Read: corner keys #2, cloud-like if #2 out fast | quick outs, bubbles and arrows by #2, "smash" high-low on the corner, RPO perimeter throws | [TDP-2R] high |
| cover4_box | two-high → bunch side 4-over-3 (CB, S, apex, LB) with outside and inside vertical caps | bunch rubs, switch releases, and stacked releases that screen a man-matcher | Box-vs-bunch search excerpt (footballnationusa "What is Box coverage"), [USAF-7] med |
| cover4_book_read | two-high → quarters to both sides of empty with LB_M carrying #3 vertical (engine "Book/Read" name not found in sources) | 3x2 empty 4 verticals and option routes without a back to key | [XOL-empty] med/low |
| cover4_poach | two-high → trips side quarters, weak safety poaches #3 vertical, X solo | 3x1 #3 seam / deep crossers / trips-side flood | [MQ-C8] [MQ-Poach] [Kou] med |
| cover4_stubbie | two-high → trips side: CB locks #1, S/NB/LB share #2/#3 ("Palms of trips"), backside quarters or lock | trips switch/flood, #2/#3 vertical combos with a 2-read style exchange | [MQ-Stub] [WRoss] [Kou] med |
| cover6 | two-high → quarters to strength/field, Cover 2 (half) to weak/boundary ("quarter, quarter, half") | 3x1 or field-heavy formations while keeping a run fitter; boundary hard corner takes the flat | [Viq-SF] [Bowen] high |
| cover6_area | two-high → Cover 6 with zone ("area") exchanges on the trips side for crossers | trips crossing/switch releases (engine purpose; not found in sources) | low (reasoning only) |
| cover6_book | two-high → Cover 6 with a trips-side "book" (read) check | trips (engine term not found in sources) | low (reasoning only) |
| cover6_rev | two-high → Cover 8: half (Cover 2) toward strength, quarters weak | gives a "leveraged flat defender" and deep cap to the passing strength; Fangio favourite | [MQ-C8] med |
| cover8_trix | two-high → Cover 8 vs 3x1; weak safety quarters/poach front side | 3x1 deep crossers and #3 vertical while the strong-side half caps #1 | [MQ-C8] med |
| split_quarters_2man | two-high → quarters strong, 2-Man weak (man under, safety half over) | backside isolation routes in 2x2/3x1; frees the backside LB for the box | [Viq-SF] med; [Kou] ("Cover 4 man backside … cone") med |

### (iv) Disguise: is two-high the NFL norm? The user's view is confirmed

- **NFL defenses show two-high before the snap.**
  - Fangio and Staley started the "Two-High Revolution" in 2020, showing a two-high shell on more than 80% of their snaps; that is now the norm ([MQ-Disg] search excerpt).
  - Cover 6, Cover 8, Quads and Cover 9 all show the same two-high look ([MQ-Fangio]; [MQ-C8]).
- **The common rotation is open-to-closed: two-high shown, rotating late to single-high.**
  - MatchQuarters reports the Eagles' disguised snaps were "98% open-to-closed" ([MQ-Disg]).
  - Dan Quinn's Cowboys showed two-high and snapped to Cover 3 ([MQ-Disg] search excerpt).
- **Closed-to-open exists, but as a deliberate trap call, not a habit.** Example: "Rams closed-to-open Cover 2 traps" ([MQ-C2O]; title and excerpt only).
- **Conclusion:** for every id in this family, the default card shows two-high (safeties 10-12, about 2 inside #2). Do not show single-high and rotate back to quarters by default. If the engine wants closed-to-open, it should be a separate disguise tag used rarely. Confidence is high for the direction; the percentages come from a single paywalled analyst.

### Film-note answers (cross-referenced in the cards)

- **F09: nobody takes the flat; NB and LB_W both on H; Y (#3) free to the flat.**
  - The apex is "first to flat" (F2F). He expects #2, but when #2 goes inside or under and #3 releases to the flat, he releases #2 to the hook player and takes #3. With a "Fast 3", the Mike gives a "Push" call ([USAF-7]).
  - PFN: the apex walls #2, then "checks for flat threats" ([PFN]).
  - The hook player matches the in-breaking #2 or #3 crossing his face.
  - So the two defenders doubling H is an apex pass-off failure, and Y going free is a missing first-to-flat rule. See the cover4 NB/LB_W row 8 and the LB_M row 5.
  - Bullock (NFL): "The flats are the weakness of this coverage". Real quarters does concede flat time and space, but it still assigns a flat player.
- **F16: corner does not sink under the vertical with no flat threat; the safety does not pick up the vertical.**
  - In base quarters (MOD) the corner is already deep: he mans a vertical #1 with the safety inside, so there is nothing to "sink" under.
  - The sink rule belongs to the half-field corner in Cover 6 or Cover 8 and to the Palms corner. That corner funnels #1 inside, "sink[s] and collect[s]" routes entering the flat, and carries a vertical to help the half safety get width ([C6-snip]). The half safety owns #1 vertical over the top.
  - Cards: cover6 CB_W, cover6_rev CB_S, palms CB/SS/FS.
- **F61/F68: play action drags the curl-flat defender out; a safety picks up a back who is not running a route.**
  - Quarters safeties are run players who read through #2 ([Bowen]; [XOL-key]: #2-keying safeties are "a tad bit slower" in the run fit).
  - **#2's release overrides the backfield action.** If #2 releases vertical, the safety stays on #2 whatever the mesh shows. If #2 blocks or is low, the safety may fit the alley.
  - A back on a fake is never the safety's man. The back belongs to the hook (LB_M), per PFN ("Hook … generally takes the running back").
  - Bowen: "play action baits safeties" and leaves corners exposed. That is the documented vulnerability the defense accepts in exchange for run support, not a rule to ban.
  - The apex/curl-flat player plays outside-in on #2 first. His run responsibility is force/contain from outside, so a fake inside should not pull him inside past #2's stem.

---

## cover4 — Quarters (MOD), base: full cards

### cover4 × CB_S
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 7-8 yd off ("seven to eight yards off the ball"), outside shade/leverage on #1 (~1 yd outside); may press-bail. Shell shown: two-high. No rotation. alt (college Box): inside leverage, counting his own steps | [Bowen]; [PFN]; [USAF-7] | high |
| 2 | run/pass key | #1's release (block/stalk = run, release = pass) through to the near tackle and back. Pass-first: commits to run only after #1 blocks *and* the ball shows outside | [Bowen] ("pattern-matches the vertical release of No. 1"); run timing is reasoning | med |
| 3 | run fit | Secondary/deep contain outside the apex (force) and safety (alley); last man outside, slow-play downhill, keep the ball inside | [Bowen] (flat defenders "cannot be outleveraged"; safeties fill); corner role inferred | med |
| 4 | play-action rule | Pass-first: never bites on backfield action; PA is aimed at the safety, so expect a vertical #1 with no safety help on PA and stay on top | [Bowen] (PA "baits safeties, leaving cornerbacks exposed") | high |
| 5 | pass job by #1/#2/#3 release | #1 vertical → man, outside-in, safety inside. #1 under/drag (short, inside) → "Under" call, zone off to deep quarter, look for #2 vertical/post. #1 stop (hitch/curl) → "smash" call, gain depth and look for #2's corner route (apex takes #1). #1 out (deep) → man. #1 block → read #2: pick up #2's corner/out-and-up | [PFN]; [Viq-C4]; [USAF-7] | high |
| 6 | relation to threats in window | Carries vertical #1 with outside-in leverage (safety caps inside); squeezes #2's corner/7 route from on top after a stop/under call | [PFN]; [Bowen] | med |
| 7 | eyes | #1 through his first 5-7 yd (vertical point), then man (vertical) or QB (after Under/Smash) | [PFN]; [USAF-7] | med |
| 8 | pass-off | Hands #1 to the apex on Under (#1 short inside) or Smash (stop); then becomes the deep-quarter player on the next vertical (#2 corner/post) | [PFN] | high |
| 9 | break trigger | Man: the receiver's break. Zone (after Under/Smash): QB's front shoulder/ball out | reasoning on standard DB technique | low |
| 10a | formation adj. | Nub/no #1: plays the deep quarter, reads #2 (TE) for a corner route; vs bunch → cover4_box; vs trips → poach/stubbie/cover6 check; stack: off, step for the point (#1 = outside release) | [Bowen] (Zorro: sink outside for TE's 7); reasoning | med |
| 10b | motion adj. | Motion across: keeps #1 (whoever is outermost after the set); jet across: rule re-counts; if his side becomes nub, see 10a | reasoning | low |
| 10c | back release | No responsibility; a wheel by the back up the sideline becomes his vertical if #1 goes under | reasoning | low |
| 11 | notes | MOD vs MEG is a per-call corner technique; the "vertical point" yardage is a team setting (5/7/10) | [PFN] | high |

### cover4 × CB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1-9 | all | As CB_S, relating to weak #1/#2 | [PFN]; [Bowen] | high |
| 10a | formation adj. | vs 3x1 the backside corner gets a call: Lock (solo man on X, no inside help) or Cut (reads the QB and helps toward the strength) | [Bowen] | high |
| 10b–11 | | As CB_S | | |

### cover4 × SS (strong quarter safety)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 10-12 yd, on the inside eye of #2 (~2 yd inside). Two-high shown, played two-high. alt: 8-9 yd vs a 2-back run look ("Aggressor", Lock call at 6-8 vs a TE in the core) | [Bowen]; [TDP-2R] | high |
| 2 | run/pass key | Flat-foot read through #2 to the near OL/TE ("pane of glass": tackle crosses the line = run, sets = pass). #2 releasing past the vertical point = pass, overriding any backfield action. Commits on the 1st-2nd step | [Bowen]; [XOL-key] | high (key), med (timing) |
| 3 | run fit | Alley player: fits downhill inside the force (apex) and outside the LBs; flat-foot, no backpedal; aggressive once #2 blocks | [Bowen] ("fill downhill"); [CI-425] (SS "alley runner") | high |
| 4 | play-action rule | May trigger on run only when #2 blocks or is low. If #2 releases vertical, stay on #2 regardless of the mesh or OL. Recover: open and run to #2's inside hip; the corner has no help on #1 in the meantime. Never picks up a back on a fake; the back belongs to the hook (F61/F68) | [Bowen] (PA "baits safeties"); [PFN] (hook takes the back); #2-override rule from [Viq-C4]/[PFN] | high (rule), med (recovery) |
| 5 | pass job by #1/#2/#3 release | #2 vertical (past 5/7/10) → man #2, inside-on-top. #2 out/flat → robs #1 (curl, dig, post). #2 in/under → robs #1, eyes back inside for the next #3 vertical (Box: "if No. 2 is up, he mans No. 3"). #2 block → run alert, then #1 rob vs PA | [PFN]; [USAF-7]; [Viq-C4] | high |
| 6 | relation to threats in window | Caps #2's seam from inside-on-top; undercuts #1's dig/post from inside ("snap your hips and eyes to the receiver") | [USAF-7] | high |
| 7 | eyes | #2 (with OL in the read) until #2 declares; then man (vertical) or #1/QB when robbing | [USAF-7]; [TDP-2R] | high |
| 8 | pass-off | Gives #2's out/flat to the apex; receives #1 inside breaks from the corner on Under; takes #3 vertical only in Box/Push variants | [PFN]; [USAF-7] | med |
| 9 | break trigger | Rob: QB's front shoulder/hitch onto #1's break. Man: receiver's break | reasoning | low |
| 10a | formation adj. | Trips → poach/stubbie/cover6 checks (below). Tight split/nub TE → alignment tighter, read TE release (Push in red zone). Bunch → Box. Empty → cover4_book_read | [Bowen]; [PFN] | med |
| 10b | motion adj. | Re-number #2 after motion; the SS realigns to the new #2's inside eye; motion to 3x1 triggers the trips check | reasoning | low |
| 10c | back release | Not his man unless the back becomes #2/#3 vertically through his window after #2 goes out (Box rule); the hook carries the back's wheel/seam first | [USAF-7]; [PFN] | med |
| 11 | notes | The run-fit safety is the coverage's purpose; PA cost is accepted. A #2-keying safety is "a tad bit slower" to fit | [XOL-key] | med |

### cover4 × FS (weak quarter safety)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1-9 | all | As SS, keyed on weak #2 (weak apex/LB_W outside, LB_M inside) | [PFN]; [Bowen] | high |
| 10a | formation adj. | vs 3x1: per check. Poach: becomes the trips-side #3 vertical player. Solo: stays home on X/back. Cover 6: half over X | [MQ-C8]; [Kou] | med |
| 10b–11 | | As SS | | |

### cover4 × NB (strong apex in nickel; LB_S holds this seat in base)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Apex between the EMLOS and #2, about 5 yd deep; if #2 is attached, 3x5 outside him. Shell shown: two-high | [USAF-7]; [TDP-2R] | high |
| 2 | run/pass key | EMLOS/near OL high-low hat, through #2. Fast commit on run to his side; slower vs #2 releases | [TDP-2R] (eyes EMOL "high/low hat") | high |
| 3 | run fit | Force/contain: outside-in, "cannot be outleveraged", spill-to-alley safety; vs RPO/bubble he plays the bubble when the safety fills | [Bowen]; [Viq-C4] | high |
| 4 | play-action rule | Fit only after confirming #2 is not releasing outside or to the flat. On the run fake, first step is up-and-out, never inside past #2's stem; recover to the flat or curl. If he bites, the flat or curl is open (corner deep, safety on #2) and no one covers for him | [PFN] (wall #2, then flat); reasoning on the cost | med |
| 5 | pass job by #1/#2/#3 release | #2 vertical → wall inside release, carry to the safety's vertical point, then flat. #2 out/flat → man him (first to flat). #2 in/under → wall, pass to hook, look for #3/#1 to the flat. #1 under (Under call) → carry #1. #1 stop (Smash) → cover #1. Nothing → gain depth, read QB (curl-flat) | [PFN]; [USAF-7] | high |
| 6 | relation to threats in window | Inside leverage on #2 (wall); outside-in on flat routes; sinks under #1's curl when no flat threat | [PFN]; [TDP-2R] (stay under #1 to help the corner) | high |
| 7 | eyes | #2 → flat threat → QB | [PFN] | high |
| 8 | pass-off | Passes an in-breaking #2 to the hook (LB_M); takes the first threat to the flat (#3 included: F09) | [USAF-7] (F2F, Push); [PFN] | high |
| 9 | break trigger | QB's front shoulder in zone; receiver's break in man | reasoning | low |
| 10a | formation adj. | Trips: per check (poach: man #2; stubbie: share #2/#3). Bunch: Box. Attached #2: plays 5/7-tech-like tight alignment | [TDP-2R]; [MQ-Stub] | med |
| 10b | motion adj. | Bump with #2 on motion across, or a "lock" call to stay; if #2 leaves, he re-apexes the new #2 | reasoning | low |
| 10c | back release | Back to the flat on his side = first to flat (push from Mike if fast) | [USAF-7] | high |
| 11 | notes | F09 fix: one player per flat. The apex owns the flat unless #2 is vertical and nobody is there | [USAF-7] | high |

### cover4 × LB_S (base 4-3 personnel)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1-11 | all | As NB when he is the strong apex; vs an attached TE he aligns tight (5/7 tech) and is the force player with curl-flat on the pass | [TDP-2R] | med |

### cover4 × LB_M (hook)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 4-5 yd, box, stacked over guard/center (30-tech area) | [TDP-2R] (ILBs at 30 tech) | med |
| 2 | run/pass key | Guards/backfield flow (standard); pass key: #3 (usually the back) | [USAF-7] ("Relates to No. 3 … eyes on No. 3") | high (pass), med (run) |
| 3 | run fit | Front's assigned A/B gap; with two-high fitters he can play fast and downhill | reasoning; [Viq-C4] (9-man fits) | med |
| 4 | play-action rule | He is the most exposed to the mesh; he must not run through the PA fake past ~2 yd without OL low hat. Recover to hook depth (10-12) to wall crossers; the back is his man on release | [PFN] (hook takes the back); reasoning | med |
| 5 | pass job by #1/#2/#3 release | #3 (back) releases → man him (flat: push to apex if "Fast 3"; vertical: carry). Back stays in → middle hole/hook, wall #2's in-breaking routes. #2 in → match. Push call → takes the apex's man (#2) | [PFN]; [USAF-7] | high |
| 6 | relation to threats in window | Walls/reroutes #3 at the top of the route; inside-out on crossers; keeps leverage with the safety | [USAF-7b] | high |
| 7 | eyes | #3 → QB | [USAF-7] | high |
| 8 | pass-off | Push call on a fast #3 to the flat: hands #3 to the apex, takes #2 (F09) | [PFN]; [USAF-7] | high |
| 9 | break trigger | QB front shoulder (zone); man break (#3) | reasoning | low |
| 10a | formation adj. | Trips: carries #3 vertical (stubbie/solo); empty: carries #3 vertical | [XOL-empty]; [Kou] | med |
| 10b | motion adj. | Back motion out → no #3 in backfield: becomes hook/#3 of the new formation | reasoning | low |
| 10c | back release | His man: check-release, swing (push to apex), wheel (carry until the apex/safety take over at depth) | [PFN] | high |
| 11 | notes | Saban "Cone": he mans the back and hugs the LOS if the back blocks | [USAF-7] | high |

### cover4 × LB_W (weak apex or weak hook)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1-11 | all | Weak #2 detached: as NB on the weak side (apex, first to flat). Weak #2 attached / no weak #2: weak hook, B-gap, back to his side | [PFN]; [USAF-7b] (weak Money mans #2 unless Fast 3) | med |
| 8 | pass-off | Passes an in-breaking weak #2 to the Mike; takes the flat (back's swing on his side). Must not follow #2 inside when the NB/Mike already have him (F09) | [USAF-7] | high |

### cover4 × DB (dime)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1-11 | all | Takes the weak apex seat (as LB_W apex); or vs empty a hook/#3 carrier. No source assigns the dime seat in quarters | reasoning only | low |

---

## cover4_meg — Quarters MEG
Shell shown → played: two-high → quarters, corners MEG. Built to beat a dominant #1 or quick game that MOD concedes.

### cover4_meg × CB_S / CB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | As MOD (press or off) | [USAF-7] | high |
| 5 | pass job by #1/#2/#3 release | Man on #1 "everywhere he goes"; sits on his hitch; no Under/Smash handoff | [USAF-7]; [MEG-def] | high |
| 8 | pass-off | None (pure man) | [MEG-def] | high |
| 2-4, 6-7, 9-11 | | As cover4 CB | | |

### cover4_meg × NB / LB_W (apex)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | No Under/Smash takeovers of #1; otherwise as cover4 (wall #2, first to flat) | inferred from [USAF-7] | med |

### cover4_meg × SS / FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | No corner help duty on #1's in-breakers is required. Rob/#2 as cover4, but robbing #1 is a bonus, not a must | reasoning | low |

LB_M, DB: as cover4.

---

## cover4_palms — Palms (2-Read)
Shell shown → played: two-high → 2-Read. The corner keys #2 and squats a fast out by #2; the safety caps #1. Built to beat #2's quick out, bubble or arrow, smash, and perimeter RPOs.

### cover4_palms × CB_S / CB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | "6-8 yards of depth with outside leverage on #1" | [TDP-2R] | high |
| 2 | run/pass key | Slow pedal, read #2 | [TDP-2R] | high |
| 3 | run fit | Quick force vs perimeter runs and bubbles when #2 goes out (the corner is a flat/force player when he hammers) | [TDP-2R]; reasoning on force | med |
| 4 | play-action rule | Hammer only on a #2 *route* out (not a block). With #2 blocking or vertical, stay on #1 | [TDP-2R] | med |
| 5 | pass job by #1/#2/#3 release | #2 out/flat immediately (or a break within his first 4 vertical steps) → "hammer" #2. #2 vertical or in → man #1, quarters technique. alt (forum): rob the out, same effect | [TDP-2R] | high |
| 6 | relation to threats in window | When #2 goes vertical or in and #1 is vertical, he carries #1 (no flat threat → sink under #1, safety over the top): addresses F16 | [TDP-2R]; reasoning | med |
| 7 | eyes | #2 → (hammer) #2 / (no hammer) #1 | [TDP-2R] | high |
| 8 | pass-off | On a hammer, #1 goes to the safety | [TDP-2R] | high |
| 9 | break trigger | #2's out-break | [TDP-2R] | high |
| 10a, 10b, 10c, 11 | | As cover4; Palms is usually a 2x2 call | | med |

### cover4_palms × SS / FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | "10-12 yards depth, 2 yards inside of the #2 receiver" ("Protector"); "Aggressor" at 6-8 vs an 11-personnel TE-in-core look with a "LOCK" call | [TDP-2R] | high |
| 5 | pass job by #1/#2/#3 release | #2 out fast → over the top of #1 and any vertical. #2 vertical → man #2. #2 in / not vertical → "fox the post" (plays under the opposite post) or robs #1's dig once the opposite #2 is not a vertical threat | [TDP-2R] | high |
| 4 | play-action rule | As cover4: #2's release overrides. Note that #2-keying makes him "a tad bit slower" in run fits | [XOL-key] | med |
| 2-3, 6-11 | | As cover4 safety | | |

### cover4_palms × NB / LB_W (apex)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Apex if #2 is split; tight 5/7 tech if #2 is in the core | [TDP-2R] | high |
| 5 | pass job by #1/#2/#3 release | Reroute #2 inside, drop to curl-flat; match underneath flat threats while staying under #1 to help the corner; rally on checkdowns | [TDP-2R] | high |

LB_M: hook-to-curl, reroute crossers ([TDP-2R], high); otherwise as cover4. DB: as cover4.

---

## cover4_box — Quarters Box (vs bunch)
Shell shown → played: two-high → bunch side four over three (CB and S as vertical caps outside and inside; apex and LB underneath, outside and inside).

### cover4_box × CB (bunch side)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Off, outside of the bunch (point-man aware) | box excerpt; reasoning | low |
| 5 | pass job by #1/#2/#3 release | Outside vertical cap: first receiver outside and vertical. alt (college Box): inside leverage, counts 3 steps, then mans #1 or gives Under | Box-bunch excerpt; [USAF-7] | med |

### cover4_box × SS (bunch side)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Inside vertical cap: first receiver vertical inside; if nothing, robs. Box: "If No. 2 is up, he mans No. 3" | [USAF-7] | med |

### cover4_box × NB (or LB_S)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | First to the flat (outside, underneath) | [USAF-7] (F2F) | med |

### cover4_box × LB_M
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | First inside, underneath (the bunch receiver breaking inside) | box excerpt | low |

Backside seats: as cover4 (2x? or solo/Lock call on X). Overall low/med: no full source rule set; the 4-on-3 concept is high.

---

## cover4_book_read — Quarters Book/Read (vs empty)
Shell shown → played: two-high → quarters to both sides of empty, with LB_M carrying #3 vertical. alt: quarters to the 3 side and read Cover 2 to the 2 side. The engine term "Book/Read" was not found in any source.

### cover4_book_read × LB_M
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Walks out toward the trips #3 (inside eye), 5-6 yd | reasoning | low |
| 5 | pass job by #1/#2/#3 release | Carries #3 vertical (32.9% of surveyed coaches: "quarters to both sides" with "Mike carry #3 vertical"); #3 in → wall; #3 out → push to apex | [XOL-empty] | med |
| 10c | back release | No back (empty); motion to empty → assumes the new #3 | reasoning | low |

### cover4_book_read × SS / FS (2 side safety in alt)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | alt (2-receiver side): read Cover 2: half over #1 / #2 vertical, corner squats on #1 or #2 out | [XOL-empty] (search excerpt) | low |
| 4 | play-action rule | No back → no PA by a back; a QB run/draw: #2-key rule unchanged | reasoning | low |

### cover4_book_read × NB, LB_W (or DB)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Each is the apex over his side's #2 (wall, first to flat). Empty removes the hook's back, so the flats rest entirely on the apexes; this is where F09 empty/motion errors appear | [PFN]; reasoning | med |

---

## cover4_poach — Quarters Poach/Trix (vs trips)
Shell shown → played: two-high → trips-side quarters; the weak safety poaches #3 vertical and the X is solo. Built to beat the 3x1 #3 seam and deep crossers.

### cover4_poach × FS (weak / poach safety)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Normal two-high, slightly cheated toward the ball; moves post-snap. Poach vs Solo differ in the backside safety's post-snap movement | [Kou]; WRoss/MQ excerpt | med |
| 5 | pass job by #1/#2/#3 release | Reads #3: #3 vertical → takes #3 man/cap. #3 not vertical → backstop deep crossers from the trips side ("backstops for deep crossers"); otherwise helps over X's post | [MQ-C8]; [Kou] | med |
| 4 | play-action rule | Reads #3, not the backfield; deep cross/post off play action is exactly what he backstops: no run fit before #3 declares | reasoning from [MQ-C8] | low |

### cover4_poach × CB_W (solo on X)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Solo man on X (Lock), little or no inside help; vs cross-and-post he is isolated on the post | [Bowen] (Lock); [Kou] ("the weakness of poach coverage is the backside") | high |

### cover4_poach × LB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 10c | back release | Has the back (backside) | [Kou] ("will linebacker covering the back") | med |

### cover4_poach × SS / NB / LB_M (trips side)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | SS on #2 (quarter rules); NB apex on #2/flat; LB_M walls #3 underneath and passes #3 vertical to the poach safety | inferred | low/med |

---

## cover4_stubbie — Quarters Stubbie (vs trips)
Shell shown → played: two-high → trips side: CB locks #1; S, NB and LB_M share #2 and #3 ("Palms of trips"). Backside: quarters, Cover 2 or lock.

### cover4_stubbie × CB_S
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Man on #1 ("corner locks #1"), no takeovers | [WRoss]; [Kou] (Special: "#1: Man-to-man") | high |

### cover4_stubbie × SS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Takes the first of #2/#3 vertical ("The safety will take 2 or 3 vertically"); otherwise robs inside | [Kou] | high |

### cover4_stubbie × NB
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Reads #2/#3 with the safety: takes the first out-breaker / flat from #2 or #3 (2-read style) | [Kou] ("Sam and safety read them"); [MQ-Stub] | med |

### cover4_stubbie × LB_M
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Hook: the #2/#3 inside breaker; carries #3 vertically when the safety took #2 | [Kou]; reasoning | med |

### cover4_stubbie × FS / CB_W / LB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Backside: quarters (FS over X/back) or Cover 2 or lock on X per the call; LB_W has the back | [Kou] | med |

---

## cover6 — Cover 6 / Stuff (quarters strong, half weak)
Shell shown → played: two-high → quarters strong (CB_S, SS, NB/LB_S, LB_M) and Cover 2 weak (CB_W hard corner, FS half, LB_W curl/hook).

### cover6 × CB_W (half-side hard corner)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Press or 5 yd, outside leverage on #1 (Cover 2 hard corner); shown two-high, same as the quarters side | [C6-snip]; [Viq-SF] | med |
| 2 | run/pass key | #1 → #2/back (flat threat) | reasoning | low |
| 3 | run fit | Primary force on his side (hard corner) | [C6-snip] ("excellent position to cover outside runs and flat passes") | med |
| 4 | play-action rule | Holds force/flat on a fake run toward him; must not fly up on PA until #1 declares; the half safety covers deep | reasoning | low |
| 5 | pass job by #1/#2/#3 release | Funnels #1 inside with hands. #1 vertical and no flat threat → sink under #1 to squeeze the hole between him and the half safety, carrying to help the safety get width. Flat threat (#2/back) → sit on the flat. #1 in → zone flat. #1 out → squat | [C6-snip] ("funnel … inside, sink and collect … carry any vertical") | med |
| 6 | relation to threats in window | Under #1's vertical from outside; sink depth set by the flat threat (F16) | [C6-snip] | med |
| 7 | eyes | #1 → backfield/flat → QB | [C6-snip] ("eyes in the backfield") | med |
| 8 | pass-off | #1 vertical over the top to the FS (half); #1 in to LB_W | [C6-snip] | med |
| 9 | break trigger | QB's front shoulder / ball out (zone) | reasoning | low |
| 10a | formation adj. | 3x1 with X solo → cloud/half side is the X side (Cover 6 to 3x1 is common) | [Viq-SF] | med |
| 10b | motion adj. | Motion that flips strength flips the quarters/half sides (re-call at the line) | reasoning | low |
| 10c | back release | Back to his flat → his | reasoning | low |
| 11 | notes | Corner/flat and curl/flat combos are the documented weakness to the half side | [C6-snip] | med |

### cover6 × FS (half safety)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 12-13 yd, splitting #1 and the hash (shown as two-high; same as quarters depth) | reasoning (standard Cover 2 depth) | low |
| 3 | run fit | Late alley after the corner's force; pass-first | reasoning | low |
| 4 | play-action rule | Deep-half player: no trigger on a run fake; keeps width over #1 | reasoning | low |
| 5 | pass job by #1/#2/#3 release | Deep half: the widest vertical (#1), then #2 seam. Picks up #1 vertical over the corner's sink (F16) | [C6-snip]; [Viq-SF] | med |

### cover6 × LB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Weak seam/curl and hook (Cover 2 hook-curl); helps on the curl vs a curl/flat combo | [C6-snip] (Ravens sheet: Will weak curl-flat); [Kou] ("LB playing seam curl") | med |

Strong-side seats (CB_S, SS, NB/LB_S, LB_M): as cover4.

---

## cover6_area — Cover 6 Area (vs trips exchanges)
Shell shown → played: two-high → Cover 6, with the trips side playing zone ("area") exchanges on crossing and switch releases. The engine term was not found in any source.

### cover6_area × SS / NB / LB_M (trips side)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Zone landmark (deep quarter / curl-flat / hook) with "match the receiver in your area" handoffs instead of man-carrying across | reasoning only | low |
| 8 | pass-off | Crossers handed across zones with a call (like Bullock's "cross" call to the curl defender) | [Bullock] | med |

Other seats: as cover6.

---

## cover6_book — Cover 6 Book (vs trips)
Shell shown → played: two-high → Cover 6 with a trips-side read check. The engine term was not found in any source. The closest sourced match is Stubbie/Special to trips with half or quarters to the single receiver ("Utah variation") [Kou].

### cover6_book × SS / NB / LB_M
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | As cover4_stubbie trips side (CB lock #1; S takes first of #2/#3 vertical; NB flat; LB_M hook/#3) | [Kou] | low |

Other seats: as cover6.

---

## cover6_rev — Cover 8 (half strong, quarters weak)
Shell shown → played: two-high → Cover 2 toward the strength (CB_S hard corner, SS half), quarters to the weak side. Fangio's "favorite split-field coverage" [MQ-C8]. Built to put a "leveraged flat defender" and a deep cap toward the passing strength.

### cover6_rev × CB_S
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | As cover6 CB_W (hard corner, funnel #1, sink under vertical with no flat threat, carry vertical to help the half safety: F16) | [MQ-C8]; [C6-snip] | med |

### cover6_rev × SS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Deep half to the strength (as cover6 FS) | [MQ-C8] | med |

### cover6_rev × NB / LB_S
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Curl/seam underneath on #2 (Cover 2 curl-flat inside the hard corner) | reasoning | low |

### cover6_rev × FS, CB_W, LB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1-11 | all | As cover4 on the weak side | [MQ-C8] | med |

---

## cover8_trix — Cover 8 Trix (vs trips)
Shell shown → played: two-high → Cover 8 versus 3x1 (half to the passing strength or nickel). The weak safety plays quarters and can poach the front side.

### cover8_trix × FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Quarters defender who poaches #3 vertical / deep crossers from the trips side ("backstops for deep crossers"); X then solo or with cut help | [MQ-C8] | med |

### cover8_trix × CB_S / SS / NB
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Cover 2 side to the trips: CB_S hard corner/flat, SS deep half over #1/#2, NB "leveraged flat defender" / curl. Exact split not visible behind the paywall | [MQ-C8] | low/med |

### cover8_trix × CB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Solo on X (Lock-like) | [MQ-C8] (implied); [Bowen] (Lock) | med |

LB_M: hook, carries #3 until the FS poach takes him (reasoning, low). LB_W: back ([Kou], med).

---

## split_quarters_2man — Quarters / 2-Man split
Shell shown → played: two-high → quarters to the strength or field; the weak side plays man underneath with the weak safety deep half over the top. Built to beat weak-side isolation, and frees the backside linebacker for the box ([Viq-SF]: "cover 4 to the field side and then man the backside"). Related source: Baylor "Cover 4 man backside / cone" [Kou].

### split_quarters_2man × CB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Press/trail on #1, inside leverage (safety over the top) | reasoning (2-Man technique) | low |
| 5 | pass job by #1/#2/#3 release | Man on #1, trail technique underneath; deep help from FS | [Viq-SF] | med |

### split_quarters_2man × FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Deep half over the weak side (Baylor: "Deep 1/2") | [Kou] | med |
| 4 | play-action rule | Deep-half player: no run trigger | reasoning | low |

### split_quarters_2man × LB_W (or DB)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by #1/#2/#3 release | Man on weak #2 (or the back if no weak #2). alt: dedicated to the box, with the back man-handled by LB_M | [Viq-SF]; [Kou] | med |
| 10c | back release | Weak-side back release = his if he is on #2/back | reasoning | low |

Strong-side seats: as cover4.
