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


Research notes for engine coverage ids. This is not a repository file. It
paraphrases coaching sources. Phrases in quotation marks are short quotes as
extracted from the cited page by a web fetch, so recheck the wording before
anything is published. Where no source spoke to a field, the row says
"reasoning" and is rated **low**.

Template: the coordinator's 11-row update (`### id × seat`, rows 1-9, 10a/b/c, 11).

## Conventions and sources (families 2 and 3)

* **Strength** is the call's strength (passing strength unless a card says otherwise). #1/#2/#3 count outside-in on each side; B is the back.
* **Seat mapping.** The engine has 9 seats, but only 7 are on the field in a given personnel group. The cards assume these occupants:
  * 4-3 base (CB_S, CB_W, SS, FS, LB_S, LB_M, LB_W) is the base reading.
  * Nickel replaces LB_S with NB.
  * Dime replaces one more LB (LB_M or LB_W, per the engine's personnel) with DB, and DB takes that LB's zone and rules.
  
  Each card says which zone the seat inherits in nickel.
* **Underneath names.** Curl-flat (C/F): apex, roughly 10-12 yd at the top of the numbers. Hook (hook-curl): roughly 10-12 yd outside the hash. In Cover 2, "middle hole" is the zone between the hooks.
* **"Sky / Buzz / Cloud" collide between sources** (see the Cover 3 family section). The engine names follow the most common NFL usage:
  * Sky: the down safety goes to the curl-flat.
  * Buzz: the down safety goes to the hook, and a linebacker or nickel takes the curl-flat.
  * Cloud: the corner plays the flat, and a safety takes his deep third.

### Sources (level noted)

| key | source | level |
|---|---|---|
| [Bowen C3][b3] | Matt Bowen, *NFL 101: Basics of Cover 3*, Bleacher Report | NFL (ex-NFL safety) |
| [Bowen C2][b2] | Matt Bowen, *NFL 101: Basics of Cover 2* (Tampa 2 / Red 2 / Green 2) | NFL |
| [SI Buzz/Sky][sibz] | SI All Seahawks, *Seahawks losing the 'Tuff' Cover 3 Buzz and Sky battle* | NFL (Seattle) |
| [SI Kam][sikam] | SI All Seahawks, *Kam Chancellor SB XLVIII and how Seattle plays Cover 3* | NFL (Seattle) |
| [Soft Sky][softsky] | USA Football blog, *Soft Sky: how Pete Carroll defends four verts* | NFL (Seattle) |
| [Bullock C3][bul3] | Mark Bullock, *Washington coverages part 1: Cover-3* | NFL |
| [Bullock T2][bult2] | Mark Bullock, *Commanders scheme breakdown: Tampa 2* | NFL |
| [MQ Cover 9][mq9] | Cody Alexander, MatchQuarters, *Fangio Cover 9 – Eagles two-high disguise* (free part only) | NFL |
| [MQ weak rot.][mqwr] | MatchQuarters, *Weak-rotation Cover 3, Raiders (P. Graham)* (teaser) | NFL |
| [MQ trap/base][mqtrap] | MatchQuarters, *DB 101: Trap vs base technique, Cover 2* (teaser) | NFL (Chargers) |
| [Saban USAF][sabanusaf] | USA Football blog, *How to understand Nick Saban's pattern-match Cover 3* | college (NFL-origin) |
| [Brophy Rip/Liz][brophy] | Brophy Football, *Nick Saban Cover 3 adaptation: Rip/Liz* | college (Belichick/Saban origin) |
| [Saban Mable][mable] | blog mirror of the Brophy Saban Cover 3 adaptation (3x1 "Mable") | college |
| [TD Saban][tdsaban] | Throw Deep Publishing, *Complete guide to Nick Saban coverages* | college |
| [HS Rip/Liz][hsripliz] | USA Football blog, *High-school coordinator explains Rip/Liz* | high school |
| [Dunn C3 pressure][dunn] | USA Football blog, *How to play Cover 3 behind a simulated pressure* | college/HS |
| [Cassity C/F][cassity] | Glazier, Skyler Cassity, *Elite curl/flat defender techniques* (summary page) | HS/college |
| [TD Cover 3][td3] / [TD Cover 2][td2] | Throw Deep Publishing glossary | generic install |
| [TD Trap][tdtrap] | Throw Deep, *Installing trap coverage* (Coach Owen) | HS/college |
| [Kou Michigan][kou] | Coach Kou, *Michigan (Minter) Cover 3 variations* | college |
| [Viqtory T2][viqt2] | Viqtory Sports, *Tampa 2 install guide* | generic |
| [Wiki T2][wikit2] | Wikipedia, *Tampa 2* | secondary (history) |
| [Wilhite][wilhite] | Emory Wilhite, *How to throw down the middle against Tampa 2* | NFL film |
| [Glazier Match 3][glazm3] | Glazier, Gelsomino, *Match 3 when you load the box* (summary) | high school |

Several fetched pages were paywalled or teasers (MatchQuarters Cover 9 and weak rotation; X&O Labs Tampa; Steelers Depot Tampa Mike rules returned 403). No open source gave rules for **Cover 9 Strap/Clue/Grab**, **Cover 3 Clue**, or **Cover 2 Match Wild**; those cards are reasoning (**low**).

---

# Family 2: Cover 3 forms

## (i) Day-one install (spot-drop Cover 3)

* **Deep thirds.** The field divides at the hashes: corner from the sideline to the hash, the middle-third safety between the hashes ([TD Cover 3][td3]).
  * Corners align 7-8 yd off, or press-bail, and play the "outside third" ([Bowen C3][b3]).
  * Deep players stay "deeper than the deepest", and the vertical comes first even if an underneath route opens ([TD Cover 3][td3]).
  * The FS gains depth so he has a "downhill, 45-degree angle" to the post/dig and can still reach the "bottom of the numbers" vs an outside 9 ([Bowen C3][b3]).
* **Four underneath zones,** spaced "Hook-to-Curl" and "Curl-to-Flat" so the middle and depth are covered first ([TD Cover 3][td3]).
  * Curl-flat (SS / Will in a 4-3): key TE/open-side tackle, drop to 10-12 yd at the top of the numbers, sink into the curl throwing lane, then widen. Must not be "out-leveraged to the flat" and must run with a #2 wheel ([Bowen C3][b3]). Aim "12 yards, top of numbers"; "Break to flat when quarterback's shoulders cross defender's face"; run responsibility is outside #2 ([Cassity C/F][cassity]).
  * Hooks (Sam/Mike in a 4-3): read the guard-center-guard triangle, sink to 10-12 yd outside the hash, cushion seam and dig, drive downhill on shallow crossers and checkdowns ([Bowen C3][b3]).
  * Saban form: hook at about 10 yd, 2 yd inside the hash ([Saban USAF][sabanusaf]).
* **Run:** the curl-flat on the strength is the force player; Bowen's SS "hammer" spills the lead block with his inside shoulder ([Bowen C3][b3]).

## (ii) Common NFL version vs college forms

* **Pattern-match Cover 3 (Rip/Liz/Mable).** Belichick/Saban built it in the 1990s against four verticals vs spot-drop Cover 3 ([Brophy Rip/Liz][brophy]).
  * Rip/Liz names the side the safety comes down to.
  * The C/F player controls #2 in the seam, carrying #2 vertical or outside past 12-15 yd. If #2 goes inside or under, the call is "Under": hooks cut him and the safety robs #1 underneath.
  * Hooks match #3 ("final 3").
  * Mable (3x1): the safety drops to the passing strength and the backside is manned ([TD Saban][tdsaban], [Saban Mable][mable]). Skate is the same with the safety dropping away from strength.
  * The sources are college/HS writeups of an NFL-origin system. It is used widely in the NFL (Saban tree, Seattle, Fangio tree).
* **Seattle Cover 3 (Carroll).**
  * Sky: the down safety goes to a curl-flat (calls "Roger/Lou").
  * Buzz: the down safety goes to a hook (calls "Rita/Linda") and the inside hooks stagger in depth.
  * Either way the down safety is expected to match the second seam ("seam alert"). Against 2x2 this is "Soft Sky" ([SI Buzz/Sky][sibz], [SI Kam][sikam], [Soft Sky][softsky]).
  * Corners play "1/3 Read" (man on any route entering the deep third). With multiple threats they use "Zebra 1/3" (zone) ([SI Buzz/Sky][sibz]).
  * Caution: Carroll also calls his curl-flat player a "buzz" defender ([SI Buzz/Sky][sibz] search summary).
* **Seam / hook rules (common NFL Cover 3 "seam-flat").**
  * The C/F player owns #2's seam and converts to curl-flat when #2 is not vertical.
  * The hooks own #3 and the dig.
  * The FS leans to the open seam ([SI Kam][sikam], [Brophy Rip/Liz][brophy]).
* **College / HS forms.** The HS sources ([HS Rip/Liz][hsripliz], [Glazier Match 3][glazm3]) use press-bail corners, "scootch" C/F steps and number counts (3 steps to declare a seam). Michigan (Minter) treats "3 weak" (rotation away from strength) as a main form ([Kou Michigan][kou]).

## (iii) Shell shown → played, and what each id is built to beat

| id | shell shown → played | built to beat |
|---|---|---|
| cover3 (Sky) | two-high (or MOFC with SS walked down) → strong safety spins to strong C/F, FS to post | base run with 8-man front and an extra force player; spot-drop answer to curl/flat and three-step |
| cover3_trips | two-high/MOFC → Cover 3 vs 3x1 with zone corner, curl-flat on #2, hooks on #3, FS leaning on #3 | trips flood / #3 vertical without leaving 3-on-2 underneath |
| cover3_match (Rip/Liz) | two-high → down safety to call side as seam-flat; MOD corners; hooks on #3 | four verticals vs 2x2, smash, hitch-seam (holes of spot-drop 3) ([Brophy][brophy], [Glazier Match 3][glazm3]) |
| cover3_clue | two-high → Cover 3 match with a bunch "clue" rule (first out / first in / first vertical) | bunch rubs, mesh/snag from compressed sets (reasoning) |
| cover3_seam | MOFC or two-high → Cover 3 where curl-flat carries #2 seam ("seam alert"/Soft Sky) and FS overlaps the other seam | four verticals and seam shots from 2x2 ([SI Kam][sikam], [Soft Sky][softsky]) |
| cover3_buzz | two-high → down safety to a hook (low-hole/"robber"), backer/nickel bumps to curl-flat | intermediate crossers, dig/over, three-level PA crossers ([Bowen C3][b3], [SI Buzz/Sky][sibz]) |
| cover3_cloud | two-high (or press corner) → call-side corner squats curl-flat, call-side safety rolls to that deep third, FS middle | quick outs, flat throws and perimeter run to the cloud side; jam #1 ([Bowen C3][b3]) |
| cover3_mable | two-high → 3x1: safety down to passing strength, match on trips side, backside corner man on X | trips with a single receiver X isolated; trips sail/flood ([Saban Mable][mable], [TD Saban][tdsaban]) |
| cover9 | two-high (≈90% in Fangio's Eagles) → *weak* safety down, strong safety spins to post | strong-side run reads that count a two-high box; crossers into the weak side; QB pre-snap MOF read ([MQ Cover 9][mq9], [Kou Michigan][kou]) |
| cover9_strap | two-high → weak rotation vs 3x1 with X side "strapped" (man) | isolated X vs a rotated safety (reasoning) |
| cover9_clue | two-high → weak rotation with bunch/stack clue rules | stack/bunch releases (reasoning) |
| cover9_grab | two-high → weak rotation vs empty, a hook "grabs" the #3 of trips | empty quick game with no back to account for (reasoning) |

## (iv) Disguise and rotation norms

* **NFL pattern: two-high pre-snap, rotate at the snap.**
  * Saban: in one-high calls "the safeties will rotate to their assigned positions" from a two-high alignment as the ball is snapped ([TD Saban][tdsaban]).
  * Washington: the SS sometimes starts deep in two-high and becomes the down player post-snap ([Bullock C3][bul3]).
  * Bowen's Buzz: the safety comes from depth into the middle hook ([Bowen C3][b3]).
  * Fangio Cover 9 is weak rotation from a two-high shell used about 90% of the time, with late safety movement ([MQ Cover 9][mq9]).
* **Who and when.**
  * Strong rotation: the strong-side safety (SS) drops to C/F (Sky) or hook (Buzz), and the weak safety (FS) spins to the middle third.
  * Weak rotation (Cover 9 / "3 weak"): the weak safety drops, and the strong safety spins to the post ([Kou Michigan][kou]).
  * Timing is "as the ball is snapped" ([TD Saban][tdsaban]). Some teams creep on the cadence. Michigan checks from Cover 4 to Cover 3 on motion to the boundary ([Kou Michigan][kou]).
  * Engine rule: hold the two-high shell until the snap (or until the snap count's last movement). The rotating player moves at the snap, and the post safety takes a 45° angle to the MOF and squares up ([HS Rip/Liz][hsripliz], "From a 2-high look ... 45-degree").
* **Seattle (2013-era) alt:** single-high shown, with the SS walked down and the FS 60/40 toward one seam ([SI Kam][sikam]).

## Cover 3 family notes on the user's film items

* **F16 (corner does not sink under a vertical).** In Cover 3 the corner is a deep-third player.
  * He stays "deeper than the deepest" and splits two verticals ([TD Cover 3][td3], [Bowen C3][b3]).
  * He never squats with nothing in his flat. The flat belongs to the C/F defender, so a corner who squats leaves the third empty.
  * If two verticals enter his third, Seattle's corner goes from "1/3 Read" man to "Zebra 1/3" zone (stay between and deeper) ([SI Buzz/Sky][sibz]). The C/F/seam player carries #2 ([Brophy][brophy]).
  * The FS is not his help on #1. The FS only takes dig/post funneled inside ([Bowen C3][b3]).
* **F61 (PA pulls the C/F defender out of position).** The C/F's run key is the TE/open-side tackle ([Bowen C3][b3]) and his run job is "outside of number two" ([Cassity C/F][cassity]).
  * A #2 that releases (not blocks) overrides the backfield action: get width and depth to the curl first.
  * Saban's "pane of glass" read of uncovered OL separates PA (OL "bump") from run (OL "break through") ([Saban USAF][sabanusaf]).
  * See each C/F card, row 4.
* **F64 (Will far from his zone; three defenders on one receiver).**
  * The weak hook drops straight back just outside the hash to about 10 yd ([Dunn C3 pressure][dunn]).
  * One underneath matcher per receiver. Others "find work" after delivering ([Brophy][brophy], [HS Rip/Liz][hsripliz]).
  * The corner funnels dig/post to the FS and does not chase inside ([Bowen C3][b3]).
* **Match pass-offs busting.**
  * The "under" call must come inside the first 5 yards ([Saban USAF][sabanusaf]).
  * The hooks play "on a string" ([HS Rip/Liz][hsripliz]).
  * The MOF safety must not drift far from the midpoint or the "divider rules fracture" ([HS Rip/Liz][hsripliz]).

---

## cover3 "Cover 3 (Sky)": full cards

Base occupant per seat: CB_S/CB_W deep thirds; FS middle third; SS strong C/F (sky). In a 4-3: LB_S strong hook, LB_M weak hook (middle-to-weak), LB_W weak C/F ([Bowen C3][b3], [TD Cover 3][td3]). In nickel 2x2: NB weak-side C/F over the weak #2, LB_M strong hook, LB_W weak hook. In dime: DB takes the hook of the LB he replaces.

### cover3 × CB_S
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 7-8 yd off with outside leverage on #1 (about 1 yd), or press-bail. Show the same stance as the two-high shell. Bail at the snap. | [Bowen C3][b3]; press-bail: [Bullock C3][bul3] | high |
| 2 | run/pass key | #1's release, then the QB through 3 steps. Seattle's press corner reads #1 ("read 1/3"). Pass is the default: commit only when #1 blocks *and* the ball crosses the LOS. | [SI Kam][sikam]; commit timing reasoning | med |
| 3 | run fit | Not force (the SS/C-F is force). Alley/secondary contain *after* the ball crosses the LOS, and he takes the cutback-deep pursuit angle. Low aggression. | role from [Bowen C3][b3]; fit reasoning | med |
| 4 | play-action rule | Ignores the backfield. #1's release overrides any run key: if #1 releases he plays pass. Recovery is not needed if he never steps up. If he bites, the FS cannot cover the outside third, so the cost is a vertical touchdown. | [TD Cover 3][td3] ("deeper than the deepest"); rest reasoning | med |
| 5 | pass job by release | #1 vertical: carry in phase, outside-third man ("1/3 Read"). #1 out/comeback: stay deeper, break on the throw. #1 in (dig/post): funnel inside to the FS and stay over the top. #1 under or hitch (<5 yd): zone his third, call "under". #1 blocks: see run. Two verticals in the third: "split two verticals" / Zebra zone. | [Bowen C3][b3]; [SI Buzz/Sky][sibz]; under call [Saban USAF][sabanusaf] | high |
| 6 | relation to threats in window | Sinks under nothing: he stays *over* the deepest threat in his third. Cushion 2-3 yd over the top. Walls #1 from the outside-in; works to the "bottom of the numbers" vs a 9. | [Bowen C3][b3]; cushion reasoning | med |
| 7 | eyes | #1 ("chin on the shoulder looking at #1") through about 3 steps. Then, if #1 is not vertical, the QB. Alt (HS Rip/Liz): vision #2 after the under call. | [HS Rip/Liz][hsripliz] | high |
| 8 | pass-off | Inside breakers (dig/post) to the FS. Under routes to the C/F/hook. He takes the next vertical entering his third (#2 wheel/seam that widens). | [Bowen C3][b3] | high |
| 9 | break trigger | Ball out / QB front shoulder for throws in front of him. On a vertical he plays the man's hands. | reasoning (deep-third norm) | low |
| 10a | formation adj. | Trips: same third. #1 may be manned "1/3 read", but with two outside threats he plays zone ("Zebra"). Nub/tight split: align tighter, inside-shade fade. Back out wide: treat the back as #1. | [SI Buzz/Sky][sibz]; nub reasoning | med |
| 10b | motion adj. | Bump: keep the side, re-count #1. If #1 motions across, the third stays his: he does not travel. | reasoning | low |
| 10c | back release | Not his unless the wheel climbs into his third (then carry it). | [Bowen C3][b3] (C/F runs the wheel first) | med |
| 11 | notes | F16: a Cover 3 corner never squats an empty flat. If he does, the third is open and the FS cannot cover it. | | |

### cover3 × CB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | As CB_S, on the weak #1. Off 7-8 or press-bail. | [Bowen C3][b3] | high |
| 2 | run/pass key | #1 then the QB. On the weak side, a quick-game hitch/slant is common: stay over the top. | reasoning | med |
| 3 | run fit | Alley after the ball crosses. On weak runs the LB_W/NB C/F is force and he is the deep cutback/contain behind. | [Bowen C3][b3] roles; fit reasoning | med |
| 4 | play-action rule | As CB_S. Boot/naked to his side: stay in the third. The weak C/F takes the flat release. | reasoning | med |
| 5 | pass job by release | As CB_S. | [Bowen C3][b3] | high |
| 6 | relation to threats in window | As CB_S. | | med |
| 7 | eyes | As CB_S. | | high |
| 8 | pass-off | As CB_S. A weak #1 dig crosses toward the strong hook/FS. | | high |
| 9 | break trigger | As CB_S. | | low |
| 10a | formation adj. | 3x1 single X side: zone third. Some teams press X and carry ("1/3 Read"). | [SI Buzz/Sky][sibz] | med |
| 10b | motion adj. | If motion empties his side (no #1), he aligns at the third's landmark at about 12 yd on the numbers and helps vs the #2 seam from the other side (reasoning). | reasoning | low |
| 10c | back release | Wheel from the weak-side back into the third: carry it. | reasoning | med |
| 11 | notes | | | |

### cover3 × FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Shown: two-high half spot (≈12-14 yd, hash). Played: rotate at the snap to the middle third, 45° to the MOF, then backpedal to about 20 yd. MOF safety in Rip/Liz aligns at 14 yd in the middle. | [TD Saban][tdsaban]; [HS Rip/Liz][hsripliz] | high |
| 2 | run/pass key | Rotate first (pass-first). Then read through the near #2 / OL hats. Commit to the run only after the line of scrimmage is clear ("pane of glass" break-through). | [Saban USAF][sabanusaf]; timing reasoning | med |
| 3 | run fit | Alley / last line: fit inside-out on the ball, cutback runs. Low aggression. | [Bowen C3][b3] (FS deep middle) | med |
| 4 | play-action rule | The deep middle never bites. His eyes are on the QB and #2s; he gives no ground-to-run steps until the ball crosses. If he bites, the post/dig is open behind the hooks. Nobody covers for him. | reasoning; PA-post risk in [Soft Sky][softsky] (MOF bit on dig) | med |
| 5 | pass job by release | Deep middle. Post from any side: take it. Dig from #1: drive downhill at 45° on the throw. #2 seams: shade 60/40 to the uncovered seam; with "seam alert" stay over the boundary seam and "prevent any post". Outside 9: help to the bottom of the numbers. | [Bowen C3][b3]; [SI Kam][sikam]; [Soft Sky][softsky] | high |
| 6 | relation to threats in window | Stay deeper than the deepest inside vertical. Overlap the corner's inside shoulder. | [TD Cover 3][td3] | med |
| 7 | eyes | The QB: "melt" toward the first look, break on the second ("MOF principle"). | [HS Rip/Liz][hsripliz] | high |
| 8 | pass-off | Takes posts/digs funneled by the corners. Does not chase a seam that the down safety/C-F is carrying. | [Bowen C3][b3]; [SI Kam][sikam] | high |
| 9 | break trigger | QB's front shoulder / second look; ball out. | [HS Rip/Liz][hsripliz] | med |
| 10a | formation adj. | Trips: lean to #3 ("lean post"), splitting the formation to reach the outside 9. Do not drift far from the midpoint. | [Dunn C3 pressure][dunn]; [Bowen C3][b3]; [HS Rip/Liz][hsripliz] | high |
| 10b | motion adj. | Motion that changes strength: he becomes the rotating player only if the call says so. Otherwise re-center. Michigan: the safety makes the motion check to Cover 3. | [Kou Michigan][kou] | med |
| 10c | back release | Not his. | | high |
| 11 | notes | F64: the FS should not be underneath on the same receiver as the Will and the corner. His target is the deepest middle route. | | |

### cover3 × SS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Shown: two-high (strong half). Played (Sky): spin down at the snap to the strong curl-flat, 10-12 yd at the top of the numbers, outside leverage on #2. Seattle alt: walked down pre-snap. | [TD Saban][tdsaban]; [SI Buzz/Sky][sibz]; [Bowen C3][b3] | high |
| 2 | run/pass key | TE / open-side tackle (high hat = pass). Seattle: OL hats and the TE's vertical release. | [Bowen C3][b3]; [SI Kam][sikam] | high |
| 3 | run fit | Primary force on the strong side. "Hammer" the lead block with his inside shoulder; squeeze; keep everything inside. Seattle: SS has an A-gap fit when in the box (scheme-dependent). | [Bowen C3][b3]; [SI Kam][sikam]; [Cassity C/F][cassity] | high |
| 4 | play-action rule | #2's release overrides the backfield. If the TE/#2 releases, he plays pass first. Depth and width to the curl before stepping up. He may only fill on low hats *plus* #2 blocking. Recovery: open, retreat to the curl window under #1, then react to the flat. If he bites, the curl throw behind him is open: the strong hook can widen but no one fully replaces him. | keys [Bowen C3][b3], [SI Kam][sikam]; rule reasoning | med |
| 5 | pass job by release | #2 vertical: wall/collision, carry to 12-15 yd (seam alert), then release to the FS. #2 out/flat: sink under #1's curl, then break to the flat when the QB's shoulders cross his face. #2 in/under: wall, then take #1 curl ("rob #1"). #2 stop: sit inside him. #2 blocks: force. #2 wheel: run with it. | [Bowen C3][b3]; [Cassity C/F][cassity]; [Brophy][brophy]; [SI Kam][sikam] | high |
| 6 | relation to threats in window | Squeezes the curl from the inside-under. Walls #2 from the outside. Must not be out-leveraged to the flat. | [Bowen C3][b3] | high |
| 7 | eyes | #2 through his release (≈3 steps), then the QB. Classic spot-drop alt: the QB throughout. | [HS Rip/Liz][hsripliz] (3 scootch steps); [Cassity C/F][cassity] | med |
| 8 | pass-off | Seam #2 to the FS at about 12-15 yd. Inside #2 to the hooks. Takes the next threat to the flat (#3/back). | [Brophy][brophy]; [Saban USAF][sabanusaf] | high |
| 9 | break trigger | QB's shoulders crossing his face for the flat. Ball out for the curl. | [Cassity C/F][cassity] | high |
| 10a | formation adj. | Trips: see cover3_trips / cover3_mable. Nub TE: tighter alignment, still force. Back out wide: he relates to the widest inside receiver as #2. | reasoning | low |
| 10b | motion adj. | Motion away: rotation can flip, re-declared by the safeties. Motion toward: re-count #2. | [Kou Michigan][kou] | low |
| 10c | back release | Back to his side, flat/swing: his after #2 declares not vertical. Wheel: run with it. | [Bowen C3][b3]; [Saban USAF][sabanusaf] | high |
| 11 | notes | F61 lives here and with the weak C/F. | | |

### cover3 × LB_S
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 4-3: strong-side LB, 4.5-5 yd. Played: strong hook, 10-12 yd outside the hash. (In nickel, NB replaces him; see NB.) | [Bowen C3][b3]; [TD Cover 3][td3] | high |
| 2 | run/pass key | Guard-center-guard triangle. | [Bowen C3][b3] | high |
| 3 | run fit | His front gap (scheme), fast flow; spill vs SS force. | reasoning | low |
| 4 | play-action rule | Backside eye is on the guard: a pulling or high guard means pass. Take two read steps max before stepping up. If #3/TE releases into his window, the release wins. Recover by opening to the hook depth on the line of the seam. If he bites, the dig/seam window behind him opens and the FS drives on it. | triangle key [Bowen C3][b3]; rest reasoning | low |
| 5 | pass job by release | #3 vertical: carry/wall to the hook depth (cushion inside seam). #3 out: let him go to the C/F, then take #2 in. #2 in (dig) crossing his face: match bottom-up. Shallow crosser: drive downhill. #3/back block: robot to the middle. | [Bowen C3][b3]; [HS Rip/Liz][hsripliz] | med |
| 6 | relation to threats in window | Walls seam inside-out; sits under the dig. | [Bowen C3][b3] | med |
| 7 | eyes | QB, peeking at #3/#2 crossing. | [Bowen C3][b3] | med |
| 8 | pass-off | Shallow crosser leaving: hands to the weak hook. Flat release: to the C/F. | reasoning | low |
| 9 | break trigger | QB's front shoulder / ball out. | reasoning | low |
| 10a | formation adj. | Trips: becomes the strong hook outside #3 with "no vertical responsibility" when the FS leans post on #3 (see cover3_trips). | [Dunn C3 pressure][dunn] | med |
| 10b | motion adj. | Bump with the TE when the strength changes. | reasoning | low |
| 10c | back release | Back to his side releasing flat: the C/F after #2 declares. Back check-releasing up the middle: hook. | [Saban USAF][sabanusaf] | med |
| 11 | notes | | | |

### cover3 × NB
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Nickel 2x2: apex/head-up on the weak-side #2 at about 5-6 yd. Played: weak curl-flat (with the SS taking the strong C/F). Saban's "Star" rotates to strength when the safety goes weak. | [Saban USAF][sabanusaf]; seat mapping reasoning | med |
| 2 | run/pass key | #2 / EMLOS. | [HS Rip/Liz][hsripliz] (EMLOS to near back) | med |
| 3 | run fit | Force/contain on his side. | [Cassity C/F][cassity] | med |
| 4 | play-action rule | As SS row 4 on his side: #2's release overrides the backfield; curl depth before stepping up. If he bites, the hook widens late. | reasoning | med |
| 5 | pass job by release | As SS row 5 (curl-flat). | [Bowen C3][b3]; [Cassity C/F][cassity] | high |
| 6 | relation to threats in window | As SS. | | high |
| 7 | eyes | As SS. | | med |
| 8 | pass-off | As SS. | | high |
| 9 | break trigger | As SS. | | high |
| 10a | formation adj. | Trips with NB on the trips side: NB takes the C/F on #2, and the SS becomes the strong hook (Buzz look); see cover3_trips. | reasoning | low |
| 10b | motion adj. | Travels with the slot across only if the call is "lock"; default is bump and re-declare. | reasoning | low |
| 10c | back release | Back swing to his side: his. | [Bowen C3][b3] | med |
| 11 | notes | | | |

### cover3 × DB
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Dime: replaces LB_M or LB_W and plays that seat's hook (straight back, 10-12 yd outside the hash). | seat mapping reasoning | low |
| 2-10 | (all) | As the LB seat he replaces. | | low |
| 11 | notes | | | |

### cover3 × LB_M
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 4-3: weak/middle hook, 10-12 yd outside the weak hash. Nickel: strong hook. | [Bowen C3][b3] | high |
| 2 | run/pass key | Triangle (G-C-G). | [Bowen C3][b3] | high |
| 3 | run fit | Front gap; fast flow; cutback. | reasoning | low |
| 4 | play-action rule | Guard's hat first. Two read steps, then depth. A #3 release overrides the run key. If he bites, the dig behind him is the PA throw. The FS overlaps downhill (if he hasn't bitten). | reasoning; [Bowen C3][b3] FS downhill on dig | low |
| 5 | pass job by release | As LB_S, mirrored. Dig from the weak #1: zone-turn and play it. Bender from #3: man-turn and carry. | [Dunn C3 pressure][dunn] | med |
| 6 | relation to threats in window | Cushions the inside seam, sits on the dig. | [Bowen C3][b3] | med |
| 7 | eyes | QB. | [Bowen C3][b3] | med |
| 8 | pass-off | Hooks play "on a string": when one hook is pulled, the other "melts" to the middle. | [HS Rip/Liz][hsripliz] | high |
| 9 | break trigger | QB front shoulder. | reasoning | low |
| 10a | formation adj. | Trips: weak hook "straight back just outside hash" at 10 yd; dig of weak #1 vs bender of #3. | [Dunn C3 pressure][dunn] | high |
| 10b | motion adj. | Re-set the strength call. | reasoning | low |
| 10c | back release | Back to the middle/check: his. | reasoning | low |
| 11 | notes | | | |

### cover3 × LB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 4-3: weak curl-flat (the Will is a C/F player in Bowen/Throw Deep). Nickel: weak hook (NB has the C/F). | [Bowen C3][b3]; [TD Cover 3][td3] | high |
| 2 | run/pass key | 4-3: open-side tackle (C/F key). Nickel: triangle. | [Bowen C3][b3] | high |
| 3 | run fit | 4-3: weak force/contain. Nickel: fold/scrape, weak-side cutback. | [Bowen C3][b3]; reasoning | med |
| 4 | play-action rule | 4-3 C/F: as SS row 4 (#2 release overrides; curl depth before stepping up). Nickel hook: guard read, two steps, weak dig window. | reasoning | low |
| 5 | pass job by release | 4-3: C/F rules (SS row 5). Nickel: weak hook: straight back to about 10 yd outside the hash; #1 weak inside release means the dig; #1 outside release means the bender of #3. | [Bowen C3][b3]; [Dunn C3 pressure][dunn] | high |
| 6 | relation to threats in window | As his zone. | | med |
| 7 | eyes | C/F: #2 then QB. Hook: QB. | | med |
| 8 | pass-off | As his zone. Never goes past the corner to double #1 (F64). | [Bowen C3][b3] | med |
| 9 | break trigger | As his zone. | | med |
| 10a | formation adj. | Trips: weak hook as above. | [Dunn C3 pressure][dunn] | high |
| 10b | motion adj. | Motion to empty from the weak side: becomes the weak C/F vs a new #2. | reasoning | low |
| 10c | back release | Back to his side: C/F takes the swing; hook takes the check/angle. | [Saban USAF][sabanusaf] | med |
| 11 | notes | F64: his landmark is about 10 yd outside the weak hash, not with the corner on #1. | | |

---

## Cover 3 variants (only seats that differ; others "as cover3")

### cover3_trips: shell two-high → Cover 3 zone vs 3x1, FS leans on #3. Beats trips #3 vertical and floods.
Seats not listed: as cover3. Mapping: trips side has CB_S, the C/F (SS in 4-3, NB in nickel) and the strong hook. Per [Dunn C3 pressure][dunn]:

### cover3_trips × CB_S
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | Loose man on #1. If #1 is shallow inside about 2-3 yd, zone into the deep third. | [Dunn C3 pressure][dunn] | high |
| 11 | notes | Other rows as cover3. | | |

### cover3_trips × SS (or NB in nickel: the trips C/F)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | #2 vertical, out, or in-breaking deeper than LB depth: man. #2 inside-underneath: zone to the C/F and pick up #3. | [Dunn C3 pressure][dunn] | high |
| 11 | notes | Other rows as cover3 SS. | | |

### cover3_trips × LB_M (strong hook vs trips; LB_S in 4-3)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Outside #3 at about 10 yd. | [Dunn C3 pressure][dunn] | high |
| 5 | pass job by release | "No vertical responsibility". Takes #3 stick, #2 dodge/5-yd in, and the weak #1 shallow. | [Dunn C3 pressure][dunn] | high |

### cover3_trips × LB_W (weak hook)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | Straight back, outside the hash, about 10 yd. Weak #1 inside release: dig (zone-turn). Weak #1 outside release: bender of #3 (man-turn). | [Dunn C3 pressure][dunn] | high |

### cover3_trips × FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | "Lean post" on #3: over the top of #3 vertical or corner. The C/F can step off #2 once he breaks inside to help. | [Dunn C3 pressure][dunn] | high |
| 11 | notes | Weak point: #3 corner route. | [Dunn C3 pressure][dunn] | high |

---

### cover3_match "Rip/Liz": shell two-high → down safety to the call side as seam-flat, MOD corners, hooks on #3. Beats four verts, smash, hitch-seam.
Seats that differ from cover3: CB_S, CB_W, the down safety (SS on Rip-strong), the far-side C/F (NB/LB_W), hooks (LB_M, LB_W/LB_S), FS. Sources [Brophy][brophy], [HS Rip/Liz][hsripliz], [Saban USAF][sabanusaf].

### cover3_match × CB_S
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Press or off, then bail with a sideways shuffle (not a backpedal). | [HS Rip/Liz][hsripliz]; [Saban USAF][sabanusaf] | high |
| 5 | pass job by release | MOD: man on #1 vertical (divider rules). #1 breaks at ≤5 yd: zone his third and call "Under" (or "Smash" vs a hitch/smash). | [HS Rip/Liz][hsripliz]; [TD Saban][tdsaban] ("except when #1 breaks at 5 yards or less") | high |
| 6 | relation to threats in window | Divider: if #1 is inside the divider, outside-trail; if outside, "inside and on top". | [HS Rip/Liz][hsripliz] | high |
| 7 | eyes | #1 ("chin on the shoulder"). After the call: vision #2. | [HS Rip/Liz][hsripliz] | high |
| 8 | pass-off | Under/smash: #1 is passed to the C/F ("Hunt 1" on smash, rob #1 on under). Corner takes #2 vertical/flag. | [HS Rip/Liz][hsripliz]; [Saban USAF][sabanusaf] | high |

### cover3_match × CB_W
As CB_S on the other side. Backside vs a 2x2 smash: "the corner matches a vertical #1, and the safety takes the speed out #2 man-to-man" ([Brophy][brophy]). **high**

### cover3_match × SS (Rip/Liz safety when the call is to the strong side)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Two-high → down at the snap over #2, square, "scootch" back. | [HS Rip/Liz][hsripliz]; [TD Saban][tdsaban] | high |
| 4 | play-action rule | As cover3 SS row 4 (pass-first on a #2 release). | reasoning | med |
| 5 | pass job by release | "2 in the Seam": after about 3 steps, if #2 is still vertical he is in the seam and the safety carries him with low-shoulder outside leverage to 12-15 yd. #2 out ("Fast 3"/sail): stay outside, fight for width, flip and rally to the flat. #2 in/under: call "Under", rob #1 underneath (wall #1's curl). Smash (#1 hitch): "Hunt 1". | [HS Rip/Liz][hsripliz]; [Brophy][brophy] | high |
| 7 | eyes | #2 for 3 steps, then QB/#1. | [HS Rip/Liz][hsripliz] | high |
| 8 | pass-off | Under: #2 to the hooks ("cut"). Then takes #1 or #3 to the flat. | [Brophy][brophy] | high |

### cover3_match × NB (and LB_W in 4-3: the non-call-side C/F)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | The backers away from the call declare "Match" and take their quick threat. Saban's Star matches #2 vertical/out, or helps on curl/flat after an under call. | [Brophy][brophy]; [Saban USAF][sabanusaf] | high |

### cover3_match × LB_M / LB_S (hooks)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | Hook and "Final 3 Through": match #3 (third receiver from the outside after distribution, backs included). Carry #3 through to the flat on a check-release if the C/F is on #2 vertical. Under call: one hook cuts the crosser, the other "Robot"s to the middle and matches the dig bottom-up. Vs mesh: both robot and finish back in the hook. | [HS Rip/Liz][hsripliz]; [Brophy][brophy]; [Saban USAF][sabanusaf] | high |
| 6 | relation to threats in window | Two hooks "on a string". Strong hook vs Fast 3: expand to the curl, push to the low-inside hip of #2. Weak hook: "bingo" drop, vision weak #2, push back strong if #2 does not break in. | [HS Rip/Liz][hsripliz] | high |
| 10c | back release | The Sam (strong hook) has a back releasing to his side, not the Mike. | [Saban USAF][sabanusaf] | high |

### cover3_match × FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 14 yd MOF, pedal to 20. | [HS Rip/Liz][hsripliz] | high |
| 7 | eyes | QB, first look then second. "Do not move far from the midpoint" or the dividers fracture. | [HS Rip/Liz][hsripliz] | high |

---

### cover3_clue "vs bunch": two-high → match-3 with bunch clue rules. Beats bunch rubs, snag, flat-wheel.
**No open source found** for a Cover 3 "Clue". Saban's "1 Clue" is a Cover 1 call where the safety opposite the back drops to the hook ([TD Saban][tdsaban]), which is different. The cards below are reasoning, modeled on generic box/banjo rules: "point" receivers can be #1, #2 or #3 depending on the formation. That fact comes from a search summary of a box-coverage article that was not fetched.

### cover3_clue × CB_S (bunch side)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Off about 7 yd, 1-2 yd outside the outermost bunch receiver. No press. | reasoning | low |
| 5 | pass job by release | First vertical outside the bunch: man/third. First out with no vertical: sink to depth (third) and let the C/F take the out. | reasoning | low |
| 8 | pass-off | First in to the hook. Second vertical inside to the FS. | reasoning | low |

### cover3_clue × SS / NB (bunch-side C/F)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 5-6 yd, outside the bunch, depth over the point. | reasoning | low |
| 5 | pass job by release | First out (flat/arrow/wheel start): man. Nothing out: curl window. | reasoning | low |

### cover3_clue × LB_M (strong hook)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | First in (under/shallow/snag-in): man to the hook. Nothing in: hook. | reasoning | low |

### cover3_clue × FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | Second vertical/inside vertical from the bunch: over the top. | reasoning | low |
| 11 | notes | All cover3_clue cards are low. The engine should treat "clue" as "first out / first in / first vertical" until a source is found. | | |

---

### cover3_seam: MOFC or two-high → curl-flat carries the #2 seam ("seam alert", Soft Sky); FS stays over the other seam. Beats four verts and 2x2 seam shots.

### cover3_seam × SS (call-side curl-flat / down safety)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | #2 vertical: carry the seam (Seattle: the down safety "match[es] the second seam"). #2 not vertical: curl-flat rules. | [SI Kam][sikam]; [SI Buzz/Sky][sibz]; [Soft Sky][softsky] | high |
| 11 | notes | Seattle's weakness: no buzz/flat defender to the Soft Sky side. The flat is left to rallying. On PA (inverted veer to dig-seam-flat), the down safety ran with the seam and the flat was open. | [Soft Sky][softsky] | high |

### cover3_seam × NB / LB_W (other-side C/F)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | Carries his #2 seam too, if the call is seam-both. Otherwise wall #2 and the FS takes that seam. | [Bullock C3][bul3] (one underneath carries one seam vs 2x2); reasoning | med |

### cover3_seam × FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 60/40 shade away from the down safety. | [Soft Sky][softsky] | high |
| 5 | pass job by release | "Stay over his boundary seam and prevent any post." | [Soft Sky][softsky] | high |

### cover3_seam × CB_S / CB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | "1/3 Read" man on any route into his third (#1 vertical) since the seam is carried underneath. | [SI Buzz/Sky][sibz] | high |

---

### cover3_buzz: two-high → down safety to a hook (low hole/"robber"), linebacker or nickel bumps to the curl-flat. Beats crossers, digs, three-level PA.
Sources: [Bowen C3][b3] (the SS or FS drops inside the numbers as a middle hook, a "robber"; tighter on 3rd-and-2-6, deeper on long downs); [SI Buzz/Sky][sibz] (Rita/Linda; hooks staggered); [Bullock C3][bul3] (the LB must "race outside to cover the flat").

### cover3_buzz × SS (buzz safety)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Shown two-high. At the snap, drops inside the numbers to the strong hook/low hole. Depth by situation: shallower on 3rd and short, deeper (≈12+ yd) on long. | [Bowen C3][b3] | high |
| 2 | run/pass key | OL hats / TE; Seattle "Tuff" alt reads the OL high hat. | [SI Kam][sikam] | med |
| 3 | run fit | Alley player inside the force, arriving from depth. Not force (the bumped LB/NB is force). | reasoning (Buzz SS inside) | low |
| 4 | play-action rule | Stays at depth until the run is confirmed by OL break-through. His job vs PA *is* the intermediate crosser: never fill on flow alone. If he bites, the dig/over window is open (F07). | [SI Buzz/Sky][sibz] (Buzz handles PA crossers); reasoning | med |
| 5 | pass job by release | Inside hook / "robber" for #1 and #2 digs crossing from the strong side. Dig crossing his face: wall it from underneath at the dig's depth; do not jump a shallow in front of him. #2 seam: match the second seam (Seattle), then release to the FS. | [Bowen C3][b3]; [SI Kam][sikam]; dig-behind-hook trap from search summary; [HS Rip/Liz][hsripliz] robot-to-dig | med |
| 6 | relation to threats in window | Sits under the dig's throwing lane at 10-12 yd. Squeezes crossers inside-out. | reasoning | low |
| 7 | eyes | QB, peeking at the #1/#2 inside release. | [Bowen C3][b3] ("robber") | med |
| 8 | pass-off | Shallow crossers to the weak hook / other hook in a staggered depth. Seam to the FS. | [SI Buzz/Sky][sibz] | med |
| 9 | break trigger | QB's front shoulder to the dig. | reasoning | low |
| 10a | formation adj. | 3x1: buzz to the trips hook ("Mable"-like). | [TD Saban][tdsaban] | low |
| 10b | motion adj. | Re-call Rita/Linda to the new strength. | [SI Buzz/Sky][sibz] | low |
| 10c | back release | Not his unless the back checks up the middle. | reasoning | low |
| 11 | notes | **F07 (X open on a dig):** X's dig must be walled by the buzz safety or robot hook *underneath* and capped by the FS downhill from above ([Bowen C3][b3]). The usual bust is the buzz safety or hook jumping a shallow, which opens the dig behind him. | | |

### cover3_buzz × LB_S / NB (bump to the strong curl-flat)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Aligns as in base, then at the snap races outside to the strong C/F. | [Bullock C3][bul3] | high |
| 4-9 | | As cover3 SS curl-flat rows. | [Bowen C3][b3] | med |
| 11 | notes | Seattle: the force LB struggled to drop to the curl-flat, a run-pass conflict. | [SI Buzz/Sky][sibz] | high |

### cover3_buzz × LB_M / LB_W (hooks)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Strong hook becomes the middle hook; weak hook stays. Staggered depths vs the buzz safety. | [SI Buzz/Sky][sibz] | med |
| 5 | pass job by release | Weak #1 dig (X dig) crossing: the weak hook zone-turns and walls it until the buzz safety/middle hook takes it. Robot to the middle on an under call. | [Dunn C3 pressure][dunn]; [HS Rip/Liz][hsripliz] | med |

---

### cover3_cloud: two-high → call-side corner squats the curl-flat (jam #1, sink to cushion a 7), call-side safety rolls to that deep third, FS middle, other corner bails. Beats outs, flats, perimeter run, quick game to that side.

### cover3_cloud × CB_S (cloud corner; call side)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Press/hard corner. | [Bowen C3][b3] | high |
| 3 | run fit | Force/contain on his side (hard corner). | [TD Cover 2][td2] (hard corner helps outside runs); reasoning | med |
| 4 | play-action rule | #1's release first. A vertical #1 means sink, regardless of backfield. Squats only once #1 shows a stop/out or #2 breaks to the flat. | reasoning | low |
| 5 | pass job by release | Jam #1 and sink to cushion the 7 (corner). #2 to the flat: break when the QB's shoulders turn. No flat threat: keep sinking under #1. | [Bowen C3][b3]; F16 logic matches Cover 2 corner (see Cover 2) | med |
| 8 | pass-off | #1 vertical to the rolled safety (deep third). | [Bowen C3][b3] | high |

### cover3_cloud × SS (call-side safety rolls deep)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Rolls at the snap to the deep outside third. | [Bowen C3][b3] | high |
| 5 | pass job by release | Third rules (as cover3 CB row 5). | | med |

### cover3_cloud × FS / CB_W
FS: deep middle. Open-side CB_W: bails to the outside third ([Bowen C3][b3]). As cover3 otherwise. Note: "Cloud" also names a Cover 2/Palms corner-flat technique in Saban terms ([TD Saban][tdsaban]). **med**

---

### cover3_mable "vs trips": two-high → 3x1, safety drops to passing strength, match on trips, backside corner man on X. Beats trips flood/sail and an isolated X.
Rules from [Saban Mable][mable] and [TD Saban][tdsaban]. Relation is by receiver *after distribution*.

### cover3_mable × CB_W (backside, X)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | Mable means "manning the single-receiver backside": man on X, all routes. | [Saban Mable][mable] | high |

### cover3_mable × CB_S (trips corner)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | "Old 2-to-1 read Cover 3": match the first vertical threat into his third. | [Saban Mable][mable] | high |

### cover3_mable × SS (rotated to trips; relates to #1)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | #2 outside: "jump it". #2 inside: he has #1 underneath and buzzes. | [Saban Mable][mable] | high |

### cover3_mable × LB_S / NB (relates to #2)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | #3 inside: the Mike has him, so play depth and jump #2. #3 outside: carry the inside-underneath route. | [Saban Mable][mable] | high |

### cover3_mable × LB_M (relates to #3)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | #3 inside: "ROBOT", depth, jump the underneath inside breaker. #3 outside: push to the strong hook. | [Saban Mable][mable] | high |

### cover3_mable × LB_W (single side)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 10c | back release | Back flows to trips: match it, "jump the flare". Flows away: "cut the 1st crosser". | [Saban Mable][mable] | high |

### cover3_mable × FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | Not stated. Inference: middle third leaning to the #3 vertical (as cover3_trips). | reasoning; [Dunn C3 pressure][dunn] | low |

---

### cover9 "weak rotation": two-high → *weak* safety down, *strong* safety to the post. Beats a two-high box count, strong runs, weak-side crossers and a QB's MOF read.
Sources: [MQ Cover 9][mq9] (Fangio's weak-rotation Cover 3, mostly from two-high with late safety movement); [Kou Michigan][kou] ("3 weak", effective with the TE to the boundary); [MQ weak rot.][mqwr] ("3-Hook", rotation to smother crossers on 3rd down). Detailed seat rules were paywalled. Rows below are med/low.

### cover9 × FS (weak safety → down)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Two-high, weak half. At the snap, drops to the weak hook ("3-Hook") or weak C/F per the call. | [MQ weak rot.][mqwr]; [Kou Michigan][kou] | med |
| 3 | run fit | Unblocked weak-side fill / cutback player. Michigan's rolled-weak safety made an unblocked tackle. | [Kou Michigan][kou] | med |
| 4 | play-action rule | As the buzz safety (cover3_buzz SS row 4). | reasoning | low |
| 5 | pass job by release | Weak hook: crossers from strength, the dig of weak #1. Weak C/F form: curl-flat rules on weak #2. | [MQ weak rot.][mqwr]; reasoning | low |

### cover9 × SS (strong safety → post)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Two-high strong half. At the snap, rotates to the middle third. | [Kou Michigan][kou] | med |
| 5-9 | | As cover3 FS rows 5-9. | | med |

### cover9 × NB / LB_S (strong curl-flat)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | Strong C/F (as cover3 SS row 5), since no safety rotates to strength. | reasoning | low |

### cover9 × LB_M / LB_W
Strong hook and the other hook. In 4-3 the Will may become the weak C/F if the FS takes the hook. Otherwise as cover3 hooks. **low**

### cover9_strap "vs x1": two-high → weak rotation vs 3x1, X side strapped (man). Beats an isolated X. No source; reasoning.

### cover9_strap × CB_W (X side)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | Man on X with the rotated weak safety under/inside as a bracket. | reasoning (parallel to Mable backside man) | low |

### cover9_strap × FS (weak safety)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | Weak hook: cuts X's in-breakers and helps the corner. | reasoning | low |

### cover9_clue "vs bunch/stack": as cover9 with cover3_clue rules on the bunch side (first out / first in / first vertical). **low**

### cover9_grab "vs empty": no back, so the hooks have no #3 back.
* Weak safety down "grabs" the #3 of trips (or the inside #2 of 2-weak). The strong safety is the post. Hooks wall the inside seams.
* **low, reasoning.**

---

# Family 3: Cover 2 and Tampa 2

## (i) Day-one install (spot-drop Cover 2)

* **Five underneath, two deep:** left flat, left hook/curl, middle hole, right hook/curl, right flat. Corners take the flats, safeties the deep halves, Sam/Will hook/curl, Mike the middle hole ([TD Cover 2][td2], [Viqtory T2][viqt2]).
* **Corners are "hard":** they do not bail at the snap, and they help vs outside runs ([TD Cover 2][td2]).
* **Safeties:** 15 yd, working to 18 at the snap, with the top of the numbers as the landmark. They read #1's release and play "top-down" ([Bowen C2][b2]).
  * #1 outside release: fade/comeback.
  * #1 inside release vertical: dig/7/post.
  * #1 flat inside release: quick game.
  * #1 blocks: eyes back inside to fill the alley.
* **Hook players (Sam/Will):** 10-12 yd between the numbers and the hash, reading the QB ([Bowen C2][b2]).
* **The "hole shot"** behind the corner and in front of the safety (≈10-12 yd) is the weakness every Cover 2 must answer ([TD Trap][tdtrap], [Wilhite][wilhite]).

## (ii) Common NFL version vs college forms

* **Tampa 2 (Dungy/Kiffin, from the 1970s Steelers/Bud Carson).**
  * The Mike runs the deep middle so the two-high hole is closed ([Wiki T2][wikit2]).
  * Bowen: the Mike opens to the passing strength, carries/matches the inside seam, and redirects if the QB comes back weak. Corners press, force #1 inside, "sink hard at a 45-degree angle", then react to the flat. Safeties 15→18 ([Bowen C2][b2]).
  * Bullock: the Mike "takes his zone a little deeper than the rest". Safeties get "a bit more width" ([Bullock T2][bult2]).
  * Viqtory: tempo drop. The Mike "will only sprint through the middle of the field if a receiver is threatening him"; otherwise he slows and robs ([Viqtory T2][viqt2]).
* **Tampa 2 Mike's middle-run rule:**
  * Run first through the OL hats (high/low), since it is a one-gap scheme that funnels to the Will ([Wiki T2][wikit2]).
  * On pass, run the middle only vs a vertical threat (the #2/#3 seam). With no vertical, slow and rob the dig/cross ([Viqtory T2][viqt2]).
  * "When the Mike attaches to a vertical, it's like man coverage" ([Wilhite][wilhite]).
* **Red 2 / Green 2** are other NFL corner techniques ([Bowen C2][b2]). Red 2 is a soft squat: open and sink to carry the fade, react to the flat. Green 2: jam and trail #1 down the field, react late to the flat.
* **Cover 2 Match.** Pattern-matched Cover 2 (Saban's "Cut") ([TD Saban][tdsaban]). Rules were not public. The trap/base corner split appears in NFL (Chargers/Minter) and HS sources ([MQ trap/base][mqtrap], [TD Trap][tdtrap]).
* **Inverted Cover 2 / "Cover 2 Switch":** the corners bail to the halves and the safeties play the flats ([TD Cover 2][td2]).

## (iii) Shell shown → played

| id | shell → played | built to beat |
|---|---|---|
| cover2 | two-high → two-high, hard corners in the flats, five underneath | quick outs, flats, outside run; caps deep halves |
| cover2_match | two-high → two-high with match rules (corner on #1 short/flat, safety divider on #1/#2 vertical, hooks wall #2) | smash, four verts' seams, hole shot |
| cover2_wild | two-high → 3x1 match with trips-side rules and backside isolation | trips flood vs a two-high (reasoning) |
| cover2_invert | two-high or single-high shown → corners bail to the halves, safeties come down to the flats | QB pre-snap read; a pressing/flat-corner read; gives downhill run-support safeties ([TD Cover 2][td2]) |
| tampa2 | two-high → two-high plus the Mike in the deep middle (3-deep look). Commanders "Tampa 2 Sky": shown one-high, rotated into Tampa | seams and posts that beat Cover 2; 3rd and long ([Bullock T2][bult2]) |

## (iv) Disguise and rotation norms

* Cover 2 is usually shown honestly from two-high. NFL teams vary safety depth, and the Commanders' "Tampa 2 Sky" rotates from one-high into two-high at the snap ([Bullock T2][bult2]).
* Inverted Cover 2 is often shown as single-high/Cover 3 with the corners off, then the corners bail and the safeties come down at the snap ([TD Cover 2][td2]).

## Cover 2 notes on the user's film items

* **F16 (corner does not sink under a vertical with nobody threatening his flat; the safety does not pick him up).** This is the Cover 2 corner rule.
  * With no flat threat (#2 not out), the corner sinks under #1's vertical/7 at 45° to cushion the hole shot. He reacts to the flat only when a flat threat appears ([Bowen C2][b2]: Tampa 2 and Green 2; Red 2 opens and sinks with the fade).
  * Trap/base: if #2 goes vertical, the corner shuffles/sinks. On #2 out he squats ("Q flat you freeze") ([TD Trap][tdtrap]).
  * The safety is still responsible for #1's vertical in his half. He plays a "divider half" between #1 and #2 ([TD Trap][tdtrap]) and must stay over #1 if #2 is not vertical ([Bowen C2][b2] read of #1's release).
  * Both failing at once is two missing rules, not one.
* **Play action vs Cover 2 hook players.** Safeties key #1's release, so a #1 release means pass ([Bowen C2][b2]). For hooks, see the cards (reasoning).

## cover2 "Cover 2": full cards

Occupants: CB_S/CB_W flats; SS/FS deep halves. 4-3: LB_S strong hook/curl, LB_M middle hole, LB_W weak hook/curl. Nickel: NB = strong hook/curl (over #2), LB_M middle hole/strong hook, LB_W weak hook/curl ([TD Cover 2][td2]; nickel mapping reasoning).

### cover2 × CB_S
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Hard corner: press or about 5 yd, outside leverage on #1, forcing an inside release. | [TD Cover 2][td2]; [Bowen C2][b2] | high |
| 2 | run/pass key | EMLOS/OT hat → QB → #2 → #1 (trap form). Base: #2's release. | [TD Trap][tdtrap] | med |
| 3 | run fit | Force/contain: squeeze from the outside-in, spill. High aggression. | [TD Cover 2][td2]; [Bowen C2][b2] (closed-side edge support) | high |
| 4 | play-action rule | Run key is the EMLOS. A #1 release with a vertical stem plus no #2 flat means sink (he has the hole). Pull hard only if #1 blocks. If he bites, the safety has the 9 but the hole/7 opens; no one replaces him. | reasoning; [Bowen C2][b2] | low |
| 5 | pass job by release | #1 vertical and #2 not to the flat: jam, sink at 45° under #1 to cushion the 9/7. #2 out/flat: squat/break to the flat. #1 out (quick): break. #1 in: release inside to the hook, stay in the flat area. #2 vertical: shuffle, glance at #1, punch, sink (trap). | [Bowen C2][b2]; [TD Trap][tdtrap] | high |
| 6 | relation to threats in window | Under #1 and inside the sideline. Wall the flat from the outside. Cushion the hole at 10-12 yd until the flat threat appears. | [TD Trap][tdtrap] | med |
| 7 | eyes | #1 through the jam, then #2/QB. Trap form: QB ("strings on the QB's eyes"). | [TD Trap][tdtrap] | med |
| 8 | pass-off | #1 vertical to the safety at about 12-15 yd (the safety overlaps). Takes the next flat threat. | [Bowen C2][b2] | med |
| 9 | break trigger | QB's eyes/shoulders to the flat; ball out. "Q flat you freeze" (hold for the safety on the hole shot). | [TD Trap][tdtrap] | med |
| 10a | formation adj. | Trips: he stays on the closed side or with the passing strength. Nub: soft squat, edge. Back out wide: treat him as #1. | [Bowen C2][b2] (TE-side vs slot) | med |
| 10b | motion adj. | Stays on his side (zone). Re-count #1/#2. | reasoning | low |
| 10c | back release | Swing/flat by the back: his (flat). Wheel: sink with it into the safety's half. | reasoning | low |
| 11 | notes | **F16 rule lives here.** | | |

### cover2 × CB_W
As CB_S, weak side ([Bowen C2][b2]). Single-receiver weak side: soft squat, sink under the fade ([Bowen C2][b2] Red 2). **med**

### cover2 × SS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | About 15 yd, on or slightly outside the hash. Works to 18 at the snap; landmark the top of the numbers. | [Bowen C2][b2] | high |
| 2 | run/pass key | #1's release. | [Bowen C2][b2] | high |
| 3 | run fit | Alley inside the corner force. Vs a slot/TE set: closed-side C gap. | [Bowen C2][b2] | high |
| 4 | play-action rule | #1's release overrides the backfield. A vertical #1 means he stays deep. If he bites, the 9/hole is open: no help. | [Bowen C2][b2] | med |
| 5 | pass job by release | #1 outside release: fade/comeback (over the top). #1 inside vertical: dig/7/post. #2 vertical: divider half between #1 and #2, shade to the bigger threat. #1 blocks: alley. | [Bowen C2][b2]; [TD Trap][tdtrap] | high |
| 6 | relation to threats in window | Over the top of the deepest in the half. Overlap the hole behind the sinking corner. | [Bowen C2][b2] | med |
| 7 | eyes | #1, then the QB ("top-down"). | [Bowen C2][b2] | high |
| 8 | pass-off | Seam/post inside to the Mike in Tampa only. In base Cover 2 the seam is his. | [Viqtory T2][viqt2] (Cover 2 seam out-leverages the safety) | med |
| 9 | break trigger | Ball out; drive top-down. | [Bowen C2][b2] | med |
| 10a | formation adj. | Trips: tax on the half safety; widen. | [TD Cover 2][td2] | med |
| 10b | motion adj. | Re-set #1. | reasoning | low |
| 10c | back release | Not his. | | high |
| 11 | notes | F16: he must stay over a #1 vertical when the corner sinks or squats. | | |

### cover2 × FS
As SS on the other half ([Bowen C2][b2]). **high**

### cover2 × LB_S
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 4-3 Sam on the TE side. Drops to 10-12 yd between the numbers and the hash. | [Bowen C2][b2] | high |
| 2 | run/pass key | TE/OT hat. | reasoning | low |
| 3 | run fit | Gap per front; spill to the corner force. | [Wiki T2][wikit2] (one-gap) | med |
| 4 | play-action rule | Two read steps. A #2/TE release overrides the backfield. If he bites, the curl/hole opens. The corner holds ("freeze") for the hole. | reasoning | low |
| 5 | pass job by release | #2 vertical: cushion the inside seam (wall). #2 in: wall, then take it. #2 out: widen toward the curl/hole. Read the QB at the landmark and "cheat" to the throw. | [Bowen C2][b2] | high |
| 6 | relation to threats in window | Under the curl, inside the hole. | [Bowen C2][b2] | med |
| 7 | eyes | QB. | [Bowen C2][b2] | high |
| 8 | pass-off | Crossers to the middle/weak hook. | reasoning | low |
| 9 | break trigger | QB's front shoulder. | reasoning | low |
| 10a | formation adj. | Trips: Sam moves out of the box; Will moves in. | [TD Cover 2][td2] | high |
| 10b | motion adj. | Bumps with the TE. | reasoning | low |
| 10c | back release | Back to his side: wall, then let the corner take the flat. | reasoning | low |
| 11 | notes | | | |

### cover2 × NB
Nickel: strong hook/curl (as LB_S). Red 2 nickel/Will: shorten drops, read the QB, widen vs #2 to the flat, cushion intermediate throws ([Bowen C2][b2]). **med**

### cover2 × LB_M
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Middle hole, about 10-12 yd. | [TD Cover 2][td2] | med |
| 2 | run/pass key | Triangle. | reasoning | low |
| 3 | run fit | Gap per front. | [Wiki T2][wikit2] | med |
| 4 | play-action rule | Two steps. The #3 release overrides. If he bites, the dig opens. | reasoning | low |
| 5 | pass job by release | Middle hole: the deepest inside threat underneath. No deep middle in plain Cover 2. | [TD Cover 2][td2] | med |
| 6 | relation to threats in window | Walls #3 vertical. | reasoning | low |
| 7 | eyes | QB. | | med |
| 8 | pass-off | Seams to the safeties. | | med |
| 9 | break trigger | QB. | | low |
| 10a | formation adj. | Trips: slides to #3. | reasoning | low |
| 10b | motion adj. | — | | |
| 10c | back release | Back up the middle: his. | reasoning | low |
| 11 | notes | | | |

### cover2 × LB_W
As LB_S on the weak side (hook/curl). Trips: moves into the box ([TD Cover 2][td2]); the weak side has no overhang ([TD Cover 2][td2]). **med**

### cover2 × DB
Takes the LB seat he replaces. **low**

---

### cover2_match: two-high → two-high with match rules. Beats smash, the hole shot and seams.

### cover2_match × CB_S / CB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | Trap/base: on #2 vertical, sink under #1. On #2 out, squat ("Q flat you freeze" until the hole is clear). | [TD Trap][tdtrap]; [MQ trap/base][mqtrap] | med |

### cover2_match × SS / FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | "Divider half" between #1 and #2: take the vertical of #1 if outside, #2 if inside. | [TD Trap][tdtrap] | med |

### cover2_match × hooks (LB_S/NB, LB_W, LB_M)
| # | field | rule | source | conf |
|---|---|---|---|---|
| 5 | pass job by release | Wall #2 vertical and carry to about 12-15 yd until the safety takes him. Mike on #3. | reasoning, from Rip/Liz pattern | low |

### cover2_wild "vs trips": reasoning only. Trips side matches #1/#2/#3. The backside corner and safety play "2-man" on X. **low**

### cover2_invert: shown single- or two-high → corners bail to the deep halves, safeties come down to the flats/force. Beats the QB's shell read and gives a downhill safety vs the run.

### cover2_invert × CB_S / CB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Off, then bail to the deep half at the snap. | [TD Cover 2][td2] | med |
| 5 | pass job by release | Deep half: as cover2 SS row 5 from a wide start. | reasoning | low |

### cover2_invert × SS / FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Shown deep; down to the flat at the snap. | [TD Cover 2][td2] | med |
| 3 | run fit | Force, coming downhill. | [TD Cover 2][td2] | med |
| 5 | pass job by release | Flat rules: as cover2 CB row 5 without the jam. | reasoning | low |

---

## tampa2 "Tampa 2": full cards (differences from cover2)

### tampa2 × LB_M
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | About 5 yd. Drops to a zone a little deeper than the others; the deep middle is about 11-20 yd. | [Bullock T2][bult2]; [Wiki T2][wikit2] | high |
| 2 | run/pass key | OL hats (high/low). | Steelers Depot (403; search summary only) | low |
| 3 | run fit | One-gap; plays the run first. | [Wiki T2][wikit2] | med |
| 4 | play-action rule | Reads the hats. A vertical #2/#3 release overrides the run key: open to the passing strength and run the middle. If he bites, the seam/post is open between the safeties. | [Bowen C2][b2]; [Wilhite][wilhite]; reasoning | med |
| 5 | pass job by release | Vertical threat (#2/#3 inside seam): carry it, man-like. No vertical: tempo drop, then rob the dig/cross. A cross from the trips side: gain depth reading the outside receiver, match the route when it breaks inside. | [Bowen C2][b2]; [Viqtory T2][viqt2]; [Bullock T2][bult2]; [Wilhite][wilhite] | high |
| 6 | relation to threats in window | Over the inside seam, under the safeties. | [Bowen C2][b2] | med |
| 7 | eyes | Head on a swivel; peeks at the QB. Redirects if the QB comes back weak. | [Viqtory T2][viqt2]; [Bowen C2][b2] | high |
| 8 | pass-off | Seams that widen go to the safeties. | reasoning | low |
| 9 | break trigger | QB's front shoulder. | reasoning | low |
| 10a | formation adj. | Opens to the passing strength. | [Bowen C2][b2] | high |
| 10b | motion adj. | Re-set the strength. | reasoning | low |
| 10c | back release | A check-down is not his: the hooks rally. | reasoning | low |
| 11 | notes | Middle-run rule: run first; sprint the middle only when threatened. | [Viqtory T2][viqt2] | high |

### tampa2 × CB_S / CB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Press. Jam #1 to force an inside release. | [Bowen C2][b2] | high |
| 5 | pass job by release | Sink hard at 45° to cushion the safety vs the 9/7, then react to the flat. | [Bowen C2][b2] | high |
| 11 | notes | Primary tacklers; reliable tacklers are required. | [Wiki T2][wikit2] | high |

### tampa2 × SS / FS
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | 15 yd, to 18; landmark the top of the numbers. Width a bit more than in Cover 2. | [Bowen C2][b2]; [Bullock T2][bult2] | high |
| 5 | pass job by release | #1's release read; overlap any throw to the deep middle. | [Bowen C2][b2] | high |

### tampa2 × LB_S / NB / LB_W
| # | field | rule | source | conf |
|---|---|---|---|---|
| 1 | alignment & shell shown | Seam-hook at 10-12 yd, between the numbers and the hash. | [Bowen C2][b2] | high |
| 5 | pass job by release | Cushion the inside seam, react underneath. Read the QB at the landmark and cheat to the throw. Get tight to a receiver when the QB looks there. | [Bowen C2][b2]; [Bullock T2][bult2] | high |
| 3 | run fit | The Will is the funnel tackler. | [Wiki T2][wikit2] | med |

[b3]: https://bleacherreport.com/articles/2047445-nfl-101-introducing-the-basics-of-cover-3
[b2]: https://bleacherreport.com/articles/2039934-nfl-101-introducing-the-basics-of-cover-2
[sibz]: https://www.si.com/nfl/seahawks/news/seahawks-losing-the-tuff-cover-3-buzz-and-sky-scheme-battle
[sikam]: https://www.si.com/nfl/seahawks/onsi/gm-report/analysis-kam-chancellor-super-bowl-xlviii-and-how-seahawks-play-cover-3
[softsky]: https://blogs.usafootball.com/blog/7141/soft-sky-how-pete-carroll-defends-four-verts-from-middle-of-the-field-close
[bul3]: https://markbullock.substack.com/p/washington-coverages-part-1-cover
[bult2]: https://markbullock.substack.com/p/commanders-scheme-breakdown-tampa
[mq9]: https://www.matchquarters.com/p/fangio-cover-9-eagles-two-high-disguise
[mqwr]: https://www.matchquarters.com/p/weak-rotation-cover-3-defending-the-sticks-3rd-down-raiders-patrick-graham
[mqtrap]: https://www.matchquarters.com/p/db-101-trap-vs-a-base-technique-cover-2-la-chargers-jesse-minter
[sabanusaf]: https://blogs.usafootball.com/blog/5615/blank
[brophy]: https://brophyfootball.blogspot.com/2010/08/nick-saban-cover-3-adaptation-ripliz-to.html
[mable]: https://ytttr.blogspot.com/2010/08/nick-saban-cover-3-adaptation.html
[tdsaban]: https://throwdeeppublishing.com/blogs/news/nick-saban-s-alabama-pass-coverages
[hsripliz]: https://blogs.usafootball.com/blog/7272/high-school-coordinator-explains-the-details-of-rip-liz-coverage
[dunn]: https://blogs.usafootball.com/blog/7544/how-to-play-cover-3-behind-a-simulated-pressure
[cassity]: https://www.glazierclinics.com/football-coach-resources/cover-3-breakdown-elite-curl/flat-defender-techniques
[td3]: https://throwdeeppublishing.com/blogs/football-glossary/what-is-cover-3-in-football
[td2]: https://throwdeeppublishing.com/blogs/football-glossary/what-is-cover-2-in-football
[tdtrap]: https://throwdeeppublishing.com/blogs/news/installing-trap-coverage-techniques-and-coaching-points
[kou]: https://coachkoufootball.substack.com/p/michigan-football-defense-cover-3
[viqt2]: https://www.viqtorysports.com/tampa-2-coverage-in-football-explained-with-images/
[wikit2]: https://en.wikipedia.org/wiki/Tampa_2
[wilhite]: https://emorywilhite.substack.com/p/how-to-throw-down-the-middle-against
[glazm3]: https://glazierclinics.com/football-coach-resources/cover-easy-throws-with-match-3-when-you-load-the-box-to-stop-the-run
