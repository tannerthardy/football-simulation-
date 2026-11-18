# Quarters tree: checks, tags and calls vs the engine (2026-11-18)

Quarters is a tree of checks, tags and calls. This inventory lists each one: what triggers it, what each seat does differently, what it gives up, where it comes from, and whether the engine has it.
It builds on the Quarters section of [the coverage position table](2026-11-17-coverage-position-table.md), which already audits the per-seat rules of MOD, MEG, Palms, Box, Book/Stubbie, Poach and Cover 6/8 cell by cell. This doc does not repeat those cells. It covers the branches between calls and who picks them.
Document only. Code read at the worktree head (rules/tampa-mike); no runs, no code changes.

**Source tags.** HNFL-### = OCR sheets in `docs/references/honest-nfl/text/`. I checked the sheet image for HNFL-050, 077, 114, 139, 194 and 195; other HNFL lines come from the OCR text or the index (`docs/references/coverage-checks/honestnfl-index.md`). WS = `docs/references/coverage-checks/web-sources.md` (gathered earlier, with its codes: SAB-TD, BRO, KS-TD, PRU, ROSS, USAF-Q, MQ). Pages I fetched today: USA Football 7382 and 7422, Wesley Ross "Defeating Stubbie and Stump", PFN "What is quarters coverage", Bleacher Report/Bowen NFL 101 Cover 4, Throw Deep "Installing Trap coverage" and "2 Read coverage". Smart Football returned 403, the Brophy Cover 7 URL returned 404, MatchQuarters and X&O Labs are paywalled previews; I did not invent their contents. COS = `docs/references/Coverage_Operating_System_Manuscript.md`.
**TC** = taught consistently (two or more independent sources agree). **VS** = varies by staff (both sides given).
**Engine paths.** C = src/playbook/coverages.ts; R = src/sim/coverage/rules.ts; A = src/playbook/alignment.ts; D = src/sim/behaviors/defense.ts; PC = src/game/playcaller.ts; CI = src/playbook/call-integrity.ts; ST = src/playbook/structure.ts; RF = src/sim/run-fits.ts; MO = src/sim/motion.ts.

## Who chooses a check: engine vs staff

**Engine today.**
- **The call.** `PC:call` draws a family from NFL shares. Weights move with down and distance, distance to goal, hurry, the seen formation (under center or empty, `CALL_CHECK`), the coach's system (`SYSTEM`) and what the offense has beaten today (`learned`). It then draws a variant at random within the family (`VARIANTS`: `cover4` 0.45, `cover4_meg` 0.15-0.3, `cover4_palms` 0.2-0.4; `cover6` and `cover6_rev` 0.45 each; `split_quarters_2man` 0.08-0.25). `CI:coverageHasNamedZonePlayers` filters out variants the personnel cannot man.
- **Formation checks.** These are automatic. `C:installCoverage` → `C:checkCall` runs at the snap (`playsim.ts`), and again after motion (`MO`), on the final formation's `ST` tags. Cover 4 calls: bunch → `cover4_box`, empty 3x2 → `cover4_book_read`, 3x1 → Poach or Stubbie. Cover 6: bunch → Box, close #2/#3 → Area, trips → Book. Cover 8: trips → Trix.
- **The 3x1 choice.** Between Trix and Stubbie it is `PC:checkPrefer`: a quarters-system coach picks Stubbie, a two-high coach Trix. Otherwise it is Trix on passing downs and Book on the rest. A check the offense has been beating gives way. Otherwise the team's fixed `checkPick` decides.
- **Zeus.** A two-high coach who shadows tags his opponent's best WR half the time (`PC:call`). `C:resolveZeus` then picks Cover 8, Stuff or Quads by where that WR lines up.
- **Post-snap calls.** In, Under, China, Out, Push and Smash are not spoken. Each defender reaches the same picture from his own read in `R`. Nobody hears a call, so a late or wrong read by one defender is not corrected by another's voice.

**A staff.** A staff sets the menu in the game plan: which tool goes with which formation and personnel, which side the half goes to (field, boundary, stud, matchup), and down-and-distance packages (Trix on passing downs, Book when the backside must stay 3-over-2 for the run). On the field, the secondary checks to the call by formation and split. The corner calls In, Under and China, the apex calls Out, the Mike calls Push, and the safety calls Wheel or Sink. Opponent tendency also changes the call: Saban's staff goes to Clip when an offense keeps running Stubbie beaters (ROSS).

## 1. Base calls vs 2x2

| Check/tag | Trigger | Seat | What he does differently | Gives up | Source [TC/VS] | Engine (file:function) | Status |
|---|---|---|---|---|---|---|---|
| **MOD** (Saban; HNFL "Quads" from Clue alignment) | Default vs 2x2 detached. Also "Man Outside & Deep" (HNFL-031), "man other than drag" (PFN), Box with press-bail (USAF 7382) | Corner | Man on #1 outside and deep. Zones off to his ¼ on In, Under or China (#1 short inside the 5-yd no-cover zone) | Hitch/out underneath by #1. Post by #1 when the safety is pulled by #2 ("Alert Post", HNFL-194) | HNFL-031/093/201; SAB-TD; PFN; USAF 7382 [TC rule; the acronym's expansion VS] | C:`cover4`; R:qCorner(meg=false), zoneOffOne | have (China plays over, not under: position table item 6) |
| MOD | same | Apex | Wall #2. Take the first flat by #2 or #3, or the final #2 underneath | Immediate flat outside him is soft; he carries wheels in a poor matchup (HNFL-194) | HNFL-094/196/200; SAB-TD "first man to the flat" [TC] | R:quarterFlat, wallTwo, apexWall; Q_APEX off | partly (no #3/back to the flat match with Q_APEX off) |
| MOD | same | Safety | Key #2 to #1. #2 vertical: carry over the top. #2 cancels: zone the ¼ and squeeze #1 (post before curl) | #2's vertical occupies him, so the deep inside ¼ empties; safety collapses on play action | HNFL-077/202; SAB-TD "all vertical #2, else bracket #1"; Bowen [TC] | R:qSafety, helpOne | partly (no declare phase; robs before #1 declares: table items 3-4) |
| MOD | same | Mike | Key 3-2-1. Relate to the final #3 and carry him vertical | Dig behind him once #3 goes flat | HNFL-096/198; USAF 7382 [TC] | R:mike3 (keys the back only), mikeWiden | partly |
| **MEG** | By call (wide #1 split, a corner who can lock) | Corners | Man everywhere he goes. No In, Under or China. 5-over-3 inside with normal Quads rules | Corner on an island: crossers and rubs with no zone-off | HNFL-031/033/192; SAB-TD; USAF 7382 [TC] | C:`cover4_meg`; R:qCorner(meg=true) | have (leverage always outside, not set by split) |
| **Saban Box** (2x2 base, soft corner) | Base 2x2 call in USAF-Q's version | Corner | Off, inside leverage. Counts about three steps; with no shallow move he mans #1, otherwise calls Under | Corner can't press | USAF 7382 [VS: HNFL "Box" is a bunch zone-pickup tool, section 7] | none (`cover4_box` is the HNFL bunch Box) | lack |
| Saban Box | same | Safety | Robber, 2-to-1. #2 up: he takes **#3** on top. #2 in or out: rob #1 | #3 vertical vs a Mike who has no carry | USAF 7382 [VS: SAB-TD's Mod safety takes #2 vertical] | none (the Mike carries the back, R:mike3) | lack |
| Saban Box | same | Apex / Mike | Apex: first to the flat, and #1 man on Under. Mike: eyes on #3 and calls Push on a fast 3 | as MOD | USAF 7382 [single] | R:quarterFlat oneShallow (from his own read) | partly |
| **Read / Palms / 2-Read / Clamp** (Saban = Clamp, Manes = Rambo, Aranda = Nail) | Detached #2, mostly when #2 is the bigger threat (HNFL-195). Field side or 2-removed | Corner | Key #2 to #1. #2 out/flat inside 5 yd: trap it. #2 up/in: #1 with depth | Wheel (#2 out-and-up) and the hole shot behind a trapping corner | HNFL-051/195; Throw Deep 2-Read; CC; COS §11.1 [TC; trigger depth VS: HNFL 5 yd, SAB-TD "out in 5", engine 7.5] | C:`cover4_palms`; R:palmsCorner | partly (random variant, not a check vs detached #2; 7.5-yd trigger; no wheel phase) |
| Read/Palms | same | Safety | #2 vertical: ¼ technique. #2 out/flat: width to #1 with depth. #2 under: squeeze #1 | Post by #1 when he widens | HNFL-051; CC table [TC] | R:palmsSafety | have |
| Read/Palms | same | Apex (Read Curl) | #2 up: wall. #2 out: zone the curl and find the new #2 coming back in | Flat behind a trapped corner | HNFL-051/195; CC "squeeze #2, eyes to #1" [TC] | R:quarterFlatTaught (Q_APEX, off) | partly (off by default) |
| **Trap** (quarters) | Detached #2; often red zone | Corner | 7 off, 2 inside the numbers. Read EMOL then #2. "Hammer" any immediate out-breaker | Hole shot 10-12 yd at the sideline | Throw Deep Trap (Owen) [VS: HNFL-068 Trap = lock #1 + Read inside; HNFL-075 Cover 5 Trap is man-match; four meanings, index conflict 4] | R:palmsCorner + techniques Trap | partly (as Palms) |
| **Bracket / CC** (Saban 7 Bracket) | Strength side, Saban's most-used Cover 7 vs 2-detached (KS-TD order: Bracket, Switch, Clamp) | CB / Apex / Safety | CB man #1. Apex man #2 (sail to #3 on Push). Safety robber, bracketing the deeper of #1/#2. CC = the weak-side copy | Run support weaker (apex in man); crossers vs the Mike | SAB-TD; KS-TD; USAF 7422 [TC within Saban tree; HNFL-190 Bracket VS: "plays as Cone unless #3 fast flat, then MEG"] | C:`pounder` (man under with q_safety) is the nearest | partly (whole field man; no robber/bracket-the-deeper rule; no "sail") |
| **Switch** | #2 on the ball / stacks; Red 7 Switch in the red zone | CB / Apex / Safety | CB press #1; switches to #2 if #1 goes behind #2. Apex inside trail on #2; safety outside trail; Mike #3 | Any mistake leaves a man uncovered (SVEC) | USAF 7382; SAB-TD [TC in Saban tree] | none (banjo exists only for bunch: R:banjo) | lack |
| **Screw / Mix** (play-action rule) | Any mesh between QB and back. HNFL: when #2's split makes Read useless | Apex | Keys mesh-2-1. Mesh: triggers and becomes force. No mesh: ¼ flat and reroute #2 (no carry) | Pass after a fake to #2 if the safety is late | HNFL-114 [single]; USAF 7422 "Mix": MOD unless mesh, apex folds in [VS name: HNFL-050 lists "Mix" as a Book alias] | none as a call. Generic: D underneath plant on seen motion; RF force job | lack |
| Screw / Mix | same | Safety | On a mesh he takes #2 up and out (man), not robber | — | HNFL-114; USAF 7422 [TC between the two] | none (R:qSafety unchanged by a fake) | lack |
| Safety alignment by #2 | Attached vs detached #2; #2's split | Safety | Attached #2: curl-to-post mindset. Detached: post-to-curl. 2 yd inside a normal #2, 2 yd outside a tight #2 | — | HNFL-077 [single]; X&O Labs snippet via WS [single]; depth VS 10-12 / 12-14 | A:alignDefense fixed 6.65 off the middle, 12 deep | lack |
| Corner leverage by split | #1 oversplit vs minus split; Saban divider 1 yd inside the numbers | Corner | Oversplit: inside position. Minus split: outside and widen | — | HNFL-093/201; SAB-TD divider [TC that split sets it; the exact line VS] | A:placeCorner fixed 0.8 outside | lack |

## 2. Post-snap calls inside Quarters

| Check/tag | Trigger | Seat | What he does differently | Gives up | Source [TC/VS] | Engine (file:function) | Status |
|---|---|---|---|---|---|---|---|
| **In** ("In, In, In") | #1 runs shallow across the 5-yd no-cover zone and truly declares | Corner (calls it) | Zone the ¼ top-down on the new #1; find work | Double move if he calls it early ("not just getting us to zone off, then running upfield", HNFL-079) | HNFL-063/079/093/194 [TC; who calls it VS: CB HNFL-063 vs Nickel HNFL-202] | R:zoneOffOne (inside break, 0.35 s DECLARE) | have (own read, not heard) |
| In | same | Safety | Zone the ¼, shift to #1, protect inside breaks: post > curl | — | HNFL-202 [single] | R:qSafety → helpOne | partly (helpOne robs, no post-first) |
| **Under** ("Under, Under") | #1 fails to clear 5 yd, or crosses under #2 (Crash/Pirate) | Corner | Zone the ¼; under on Crash "sink to the 7" | — | HNFL-077/079/194; ROSS; USAF 7382 [TC] | R:zoneOffOne | partly (sinks to landmark; QCORNER bit 4 off) |
| Under | same | Apex | Now responsible for #1 ("you are now responsible for #1!") | Flat by #2/#3 | HNFL-078; USAF 7382; PFN [TC] | R:quarterFlat oneShallow → man #1 | have (own read) |
| Under | same | Safety | "Under = CB help": stays top-down inside-out on #2 | — | HNFL-077 [single] | R:qSafety | have |
| **China** | #1 short (stop, out, hitch) inside 5 yd with a #2 to that side | Corner | Sink under #2's corner route, reading corner > seam/fade > dig | Hitch/out by #1 if the apex is late | HNFL-079/085/093; SAB-TD "Alert Smash: CB bails under #2" [TC] | R:zoneOffOne(china) → deep zone | partly (plays **over** #2, not under; QCORNER bit 4 off) |
| China | same | Apex | Push to #1's route so the corner can sink | Flat by #2 | HNFL-094/194/200 [TC] | R:quarterFlat oneShallow | have |
| China | same | Safety | Play #2 from his top shoulder inside; corner > seam > post | — | HNFL-092/202 [single] | R:qSafety mode `two` | have |
| China not available | vs x1, MEG, backside of Trix, #2 in the backfield | Corner | Tight ¼: man #1 unless shallow across (In only) | Smash-type high-low has no answer by the corner | HNFL-093/095/194/199 [TC] | R:zoneOffOne `china = !!ref(c,2)` | have (MEG and Poach CB are locked man) |
| **Smash** | #1 short with #2's corner route behind | Corner / Apex | Quarters: same as China. Saban/HS: corner bails under #2, apex "hunts 1" | Hitch window | USAF 7272/RL; SAB-TD; PFN [TC]; Book: "no Smash rule" (HNFL-050), Area: Smash = push to #1 (HNFL-052) [VS by call] | as China; R:area flat `oneShallow` | partly |
| **Out** ("Out! Out!") | #2 out/flat early (Palms) | Apex calls; corner, safety hear | Corner traps #2; safety pushes to #1; apex zones the curl | Wheel; hole shot | HNFL-051/292; SAB "Cougar/Clamp" [VS: only in Read/Palms family] | R:palmsCorner, palmsSafety, quarterFlatTaught | partly (each from own read) |
| **Push / Fast 3** | Back or #3 straight to the flat | Mike calls it | Each man shifts one over: apex to #3 in the flat, Mike to the new #3, hook to #2 | Seam by #2 if the apex leaves early; "fast 4" pushes again (HNFL-270) | USAF 7382; HNFL-065/196; PFN [TC]; timing VS: pre-snap (HNFL-193/278) vs live (HNFL-203) | R:readHook `four` (Book/Stubbie/Trix hook only); R:quarterFlatTaught flat3 (Q_APEX off); mikeWiden; D CURL_FLAT_BACK | partly (no general Push in MOD; no pre-snap Push) |
| **Rob** (post / dig) | By game plan, or #2 cancels | Safety | Rob the post or the dig instead of squeezing #1 | Post-corner / double move by #1 | HNFL-077 "by G.P."; PFN "robs No. 1"; Bowen [TC as a rule; when VS] | R:helpOne → techniques Rob (default, not a tag) | partly (always on; robs before #1 declares) |
| **Zone It** | Deep exchanges (snakes, scissors) between #1 and #2 | Corner + safety | Zone off the deep exchange rather than man it | Underneath | HNFL-016/092/196 [TC] | none in Quarters (R:box deep exchange only) | lack |
| **Wheel** | #2 out then up | Safety warns; apex / corner | Apex chases the flat, "don't beat it", keeps depth for the wheel | — | HNFL-078/276; WS snippet [TC] | R:quarterFlat `flat` man over the top | have (no spoken warning) |
| **Shove** | #2 cancels; by formation | Safety | Shove across to the other side's threat | Own side's #1 post | HNFL-092/194 [single] | none | lack |

## 3. Trips (3x1) tools

| Check/tag | Trigger | Seat | What he does differently | Gives up | Source [TC/VS] | Engine (file:function) | Status |
|---|---|---|---|---|---|---|---|
| **Quads vs 3x1** (no check) | #3 not a vertical threat for the Mike | Mike | Must carry #3 vertical | #3 seam or "999" vs a linebacker | HNFL-096/190/333; Bowen "999" [TC: "typically not played vs 3x"] | C:`cover4` with no installable check | partly (always checks away when installable) |
| **Stubbie / Special / Book / Mini / Erase** | Trips/trey, backside must stay 3-over-2 (run downs); Saban default vs all 3x1; "Trey with speed at #3" | Trips CB | Lock #1, MEG, Fist technique; Ross: press with inside leverage | CB on an island | HNFL-050 (image), 195, 270, 309; SAB-TD; ROSS; PRU [TC] | C:`cover4_stubbie`, `cover6_book`, `cover4_book_read`; CB man S1 **outside** | partly (leverage) |
| Stubbie / Book | same | Nickel (Soft Squat / MUSH) | #3 up/in: match #2. #2 fast flat: match it. **#3 out/flat: trap it** (image-verified seat) | Four verticals: #2 from outside leverage with no help (PRU, ROSS) | HNFL-050; ROSS "if #3 runs an out, he traps it"; SAB-TD "man on #3 if #3 goes out" [TC] | R:mush (zones the curl-flat on #3's flat) | partly |
| Stubbie / Book | same | Safety (Read #3) | #3 up: match (¼ tech). #3 out: width to #2 with depth (top #2) | Post by #2 when #3 holds him | HNFL-050 (image); SAB-TD; ROSS [TC] | R:stubbieSafety | have |
| Stubbie / Book | same | Mike (Wall #3 / Read Hook) | #3 up: wall, see #2, hand #3 to the safety. #3 out: zone the hook. First in from #2/#3; never carry #3 | Dig behind him | HNFL-050 (image), 270; ROSS [TC] | R:readHook | have |
| Book | same | Nickel + Mike | "If #2/#3 both out fast, Nickel/Mike latch on"; "1st in or 2nd out" | — | HNFL-050 (image) [single] | none (mush zones, readHook pushes to a fast back only) | lack |
| Book China/In | — | Nickel | HNFL-190/284: no China or In in Book. HNFL-309: China and In apply | — | [VS] | none | n/a |
| **Stump / Stomp** | Stubbie with Smash built in; trips exchanges where #1 is not a vertical threat; staffs less sure of the field corner | Trips CB | Off 1x8; man #1 unless short, then Under and sink to help on #2 vertical | Mills with outside-leverage bail ("quarters killer"); scissors is "even more deadly" | PRU; ROSS; HNFL-026/190 [TC] | none | lack |
| Stump | same | Star / Nickel | 1 outside 6 off #2; flat unless all three go vertical; takes #1 on Under | — | PRU; ROSS [TC] | none | lack |
| **Poach / Trix / Solo / Steal** | Pass downs from Cover 4/8 vs most 3x1; #3 a vertical mismatch for the Mike | FS (backside) | Key #3 to X: overtake #3 up or over, else squeeze X ("who becomes 3") | Weak corner alone; weak run fit slow until his #3 read settles (COS) | HNFL-021/030/195/197; RO; MQ [TC; Solo cheat vs Poach stay VS] | C:`cover4_poach`; R:poachSafety | have (no "new #3") |
| Trix | same | Mike | Match the final #3 underneath aggressively; no vertical | — | HNFL-085/197 [TC] | R:readHook in `hook_s` | have |
| Trix | same | Weak apex | Seam/flat on #2: match anything up or out | — | HNFL-094/095 [TC] | C:`cover4_poach` `curl_flat_w` plain seat | lack |
| Trix | same | Weak CB | Tight ¼: man #1 unless shallow; no China | Isolation | HNFL-194/244 [TC] | C:`cover4_poach` CB_W locked man, inside | partly (no In) |
| **Trip** (#3 to post) | Trips; backside Freeze/Cover 1 | FS | Take #3 deep or zone the post | — | HNFL-030/190/292 [single family] | none | lack |
| **Area** (Triangle) | Trips exchanges or #2/#3 close; HB/TE at #1 | CB / N / M / SS | CB soft ¼ with China built in; N/M/SS triangle on #2/#3 | — | HNFL-052/195 [TC] | C:`cover6_area` (Cover 6 only); R:area | partly (no Cover 4 Area) |
| **Clip** (3 Cloud man-match) | Offense keeps running Stubbie beaters (levels, stick, scissors) | Strong CB / Star / SS / ILB | CB first to the flat; Star cuts #2; SS all #1 vertical else #2; ILB #3 | — | PRU; SAB-TD; ROSS [TC in Saban tree] | none | lack |
| **Cloud / Sky rotation vs trips** | Trips, by game plan; BAL Stuff 3x1 "Cloud, Read, Trix" | Strong CB / SS | Cloud: CB is the flat and force, SS deep half. Sky: safety rotates down | — | HNFL-230, 212; RO [VS] | `cover8_trix` (halves to trips); cover3_cloud/cover9 only as separate families | partly |
| **Cover 8 Trix / Squat Trix** | Pass downs from Cover 8 vs 3x1 (bunch with multiple deep threats for Squat) | as table rows | Squat corner + half to trips; FS Trix; Mike has no vertical | Weak X | HNFL-195/325/336 [TC] | C:`cover8_trix` | have (half SS has no "#2 is mine": table) |
| Seahawk / Steeler / Zeke / In-Out | Saban 3x1 and empty options | — | Seahawk: safety brackets the deeper of #2/#3. Steeler: man #1-#3 with a half safety midpointing. Zeke: first out / first in | — | SAB-TD; BRO [single] | none | lack (low frequency) |

## 4. Backside isolated #1 (x1 side)

| Check/tag | Trigger | Seat | What he does differently | Gives up | Source [TC/VS] | Engine (file:function) | Status |
|---|---|---|---|---|---|---|---|
| **Tight ¼ / MEG** | Wide X split; backside of Trix | Weak CB | Man #1 unless shallow; no China | One-on-one | HNFL-095/194; SAB-TD [TC] | R:qCorner china=false; Poach CB locked man | have |
| **Cone** | Slightly compressed split, or a dangerous X | Weak CB / FS | CB short and outside; FS deep and inside. X inside → double | Weak run fit; trips side has no extra help | SAB-TD; PRU; ROSS; USAF 7422 [TC in Saban; Fangio Cone = bracket #2, VS] | Cover 6 Book backside (sink corner + half FS) is the nearest | partly |
| **Connie** | Tight X split | Weak CB / Will | CB first outside route; Will first inside route | — | ROSS; PRU [TC] | none | lack |
| **Cut** | 1-detached side (Saban default) | Apex / Safety | Apex cuts #1 underneath inside; safety brackets over the top | — | SAB-TD; USAF 7422 [TC in Saban tree] | none | lack |
| Dog / Tuff | By call | CB / Safety | Dog: trail with a half over. Tuff: safety first to the flat, CB deep | — | SAB-TD [single] | `split_quarters_2man` backside is Dog-like | partly |
| **Smack** | Oversplit weak #1 | Weak CB | Aggressive reroute funnelling #1 wide | — | HNFL-231/241/363 [TC] | none (no split-driven tool) | lack |

## 5. Split-field calls (quarter-quarter-half)

| Check/tag | Trigger | Seat | What he does differently | Gives up | Source [TC/VS] | Engine (file:function) | Status |
|---|---|---|---|---|---|---|---|
| **Cover 6 / Stuff** (QQH: quarters strong) | Most dangerous threat to one side; 2x2 or 3x1 to the strength | Weak CB / FS | Cloud/squat corner and a half safety over the isolated X | Smash vs the half side; the hole shot | HNFL-073/097/324; RO; MQ [TC; names VS: 2026 sheets call it "Pack" (HNFL-280)] | C:`cover6` | have |
| **Cover 8 / Quarter-Quarter-Half reversed** | Half to the passing strength, common vs 3x1 | Strong CB / SS | Squat corner under, half safety over strong #1 (a natural double) | Weak side 3-over-2 | HNFL-195/325; RO [TC] | C:`cover6_rev` | have |
| **Roy/Lou, field/boundary direction** | Half to the stud, the field, the offset back, or to protect a corner | Coordinator | Points the half side by game plan, not by count | — | HNFL-085/229/260; MQ [TC that it is game-planned] | PC:VARIANTS random 0.45/0.45; ST tag `strongToField` unused | lack |
| **Zeus / Ring #** | Tagged receiver | Coordinator | Cover 8 on a strong #1, Stuff on the weak #1, Quads inside | — | MQ; HNFL-261 [single family] | C:resolveZeus; PC:call 50% for shadow two-high coaches | have |
| **Split quarters / 2-Man** | Quarters strong, trail man under a half weak | Weak CB / FS | Trail man with half over | Run fit weak side | HNFL-074 Finger-type [TC] | C:`split_quarters_2man` | have |
| Stuff → Sink | Stuff vs certain trips | Weak CB / FS | CB converts Squat to Sink (owns #1 upfield); FS to tight ½ | Flat | HNFL-273 [single] | none | lack |

## 6. Man-under quarters

| Check/tag | Trigger | Seat | What he does differently | Gives up | Source [TC/VS] | Engine (file:function) | Status |
|---|---|---|---|---|---|---|---|
| **Pounder** (4-Man) | 3rd and extra-long; by game plan | Safeties | Inside quarters keying #2 to #1, doubling the vertical; man under with inside leverage | Crossers and rubs underneath; run | HNFL-074/206/208 [TC] | C:`pounder`; R:qSafety | have |
| **Finger** | Fist strong, Pounder weak | SS half / FS quarter | Half over strong; quarter safety weak | — | HNFL-074 [TC within HNFL] | C:`finger` | have |
| **Rolex** | Pounder strong, Fist weak ("safety rolls to X") | SS quarter / FS half | — | — | HNFL-074 [single] | C:`rolex` | have |
| Mini Pounder (bunch) | Bunch | N / CB / Mike | Nickel locks the point; CB and Mike banjo #1/#3 | — | HNFL-074 [single] | C:`pounder_banjo` (built in a loop) | have |

## 7. Bunch, stack, empty and quads

| Check/tag | Trigger | Seat | What he does differently | Gives up | Source [TC/VS] | Engine (file:function) | Status |
|---|---|---|---|---|---|---|---|
| **Box** (zone pickups) | Bunch with quarters structure strong | CB / SS / N / M | Outermost upfield, innermost upfield, first out, first in | CB out-leveraged inside; Sam must expand on #3's flat (MQ) | HNFL-053/194/195/331 [TC; the details VS: index conflict 12] | C:`cover4_box`; R:box | have |
| **Box Trix** | Pass downs, 3x1 bunch with multiple deep threats | FS | Trix on final #3; plays 5-over-3 strong if #3 is up | Weak side plays like Fire Zone | HNFL-053/194/195 [TC] | C:`cover4_box` backside is plain quarters | lack |
| **Buster** (Me/You) | Bunch on passing downs when the backside must stay 3-over-2 | CB / N / M / SS | Sink corner, Me/You apex-Mike, tight ½ over #2/#3 | — | HNFL-069/131/195 [TC] | none | lack |
| **Zorro / Zone It** (stack, reduced #1) | #1 stacked or reduced; any close split | CB / SS / apex | Zone it off: corner and safety take the first vertical; apex takes the first in back across | — | HNFL-024/193/194/324 [TC] | none (Cover 4 has no stack check; only Cover 9 → Clue) | lack |
| **Book/Read** (empty 3x2) | Empty | 3-side / 2-side | Book to the three; Read to the two | — | HNFL-085/194/244 [TC]; Saban Steeler [VS] | C:`cover4_book_read` (Cover 4 calls only) | partly (Cover 6/8 empty not checked) |
| **Quads (4x1)** | 4x1 | Will / CB | Push the Will to the quads side, or bring the backside safety over with MEG on X; #4 in the slot → MEG becomes MOD | — | MQ glossary; BRO; SVEC [VS] | none (no `4x1` check) | lack |

## 8. Run checks and fits

| Check/tag | Trigger | Seat | What he does differently | Gives up | Source [TC/VS] | Engine (file:function) | Status |
|---|---|---|---|---|---|---|---|
| **Apex force** (Quads) | Run read; flow to him | Playside apex | Primary force, ball outside-in | Flat vs play action | HNFL-139 (image) [TC with Bowen "flat defenders buzz"] | RF:buildRunFits force goes to the curl-flat seat | have |
| Apex force | same | Playside safety | Alley ("inside ¼ (alley)") | Post on play action | HNFL-139; Bowen "flat-foot read, fill downhill" [TC] | RF alley; SAFETY_TEMPO eases down until the back declares | partly (eases; no flat-foot fill tempo) |
| Apex force | same | Playside corner | Secondary force: think pass, react to run | — | HNFL-139 [TC with Bowen] | RF alley (default DB job) | partly (alley, not secondary force) |
| Apex force | same | Mike | Scrape and fit the playside A-C gap | — | HNFL-139 [single] | RF insert | have |
| Apex force | same | Backside apex | Cutback, boot and reverse player | Boot | HNFL-139 [single] | RF assigns a force on each side; I did not find a cutback-boot-reverse duty for the backside apex | unverified / partly |
| **Sky force tag** | Safety force (e.g. 9-man box vs TE + removed WR) | Safety | Safety is the primary force, corner secondary | Seam | HNFL-139; X&O Labs snippet (via WS) [VS] | RF force always the curl-flat seat | lack |
| **Screw / Mix** | Mesh | Apex, safety | See section 1 | — | — | — | lack |
| 9-man box | Two safeties at 10-12 yd | Both safeties | Fit the run as 8th and 9th defenders | Play action | HNFL-194 strengths; Bowen [TC] | RF alley for each safety | partly |

## 9. Situational and game-plan calls

| Check/tag | Trigger | Seat | What he does differently | Gives up | Source [TC/VS] | Engine (file:function) | Status |
|---|---|---|---|---|---|---|---|
| **Red 4 MOD** | Inside the +15 | All | Plays more like Bracket; the back line of the end zone is a 12th defender | — | HNFL-287/290 [single]; Georgia "4 Man" for red zone (KS-TD) | PC:call weight changes only (Cover 4 ×0.7 inside the 5) | lack |
| Passing downs → Trix | 3rd and long | FS | See Trix | — | HNFL-195 [TC] | PC:checkPrefer | have |
| Run downs → Book | Early downs | — | Backside stays 3-over-2 for the run | — | HNFL-195 [TC] | PC:checkPrefer | have |
| Opponent tendency → Clip | Stubbie beaters seen | — | Change the trips check | — | ROSS [single] | PC:learned shifts checks the offense beats | partly (between Trix and Stubbie only) |
| Matchup tags (stud, vertical mismatch at #3) | Personnel | — | Book "usually when #2 weak is a stud"; Trix when #3 is a vertical mismatch | — | HNFL-197/204/270 [TC] | none (checks key on formation, not on who is #3) | lack |

## Lacks, ranked by how common the check is and how big the hole

1. **Spoken calls are not heard** (In, Under, China, Out, Push, Wheel). Every Quarters exchange depends on them, and every staff uses them. Today each defender reaches the call alone, so one late read busts it with no correction.
2. **Field/boundary and game-plan direction of split-field calls.** Cover 6 vs Cover 8 is a coin flip, not field, stud or matchup. These are among the most common two-high calls in the NFL.
3. **Play-action rule: Screw/Mix** (the apex triggers, the safety takes #2). Play action is quarters' main stressor, and two independent sources name the answer.
4. **Stump and Clip,** the trips answers when Stubbie is beaten. Stubbie's isolated corner and four-verticals hole have no in-game alternative.
5. **Stack/reduced Zorro and Zone It, and bunch Buster/Box Trix.** Cover 4 meets a stack or a deep exchange with man-match rules.
6. **Backside bracket tools: Cone, Connie, Cut, Smack.** Saban's default backside to a 1-detached side has no counterpart beyond Cover 6's cloud.
7. **Split-driven alignment.** Corner leverage by #1's split and safety width by #2's split feed every other rule.
8. **Saban Box/Bracket** (robber safety on #3, apex man on #2). These are the most-used Cover 7 calls in the Saban tree, and we have only Pounder as a whole-field man version.
9. **Read/Palms as a check vs a detached #2** (today a random variant), plus the general Push vs a fast #3 in MOD.
10. **4x1 quads and red-zone quarters (Red 4 MOD).** Less common, but no rule exists for them.
