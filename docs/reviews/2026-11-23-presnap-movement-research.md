# Pre-snap defensive movement, as taught (2026-11-23)

The user's request, through Integration: "We need a lot more movement pre-snap." Defenders, most of all the secondary
and linebackers, keep shifting a little for leverage and anticipation until the QB looks ready to snap. Disguised
blitzes go beyond mug looks: a backer or safety walks up as if to blitz, backs off if the ball is not snapped, sometimes
comes again and blitzes, sometimes bails into coverage. Defenders answer motion with small rotations and gap changes.
"We need to do a whole lot of research on pre-snap movement!"

This is the taught side: what coaches and film analysts say, behaviour by behaviour. Research and writing only. No
engine code was changed and no games were run. develop is frozen at engine-91 (0226f0d3). Flex measures the same named
behaviours (1-9 below) in NFL and sim pre-snap tracking, so the names and numbers are fixed. Read with the
coverage cards (`docs/reviews/2026-11-23-coverage-cards.md`, branch `rules/coverage-cards`). Those cards hold each
coverage's motion rows (10b). This doc does not repeat them.

## How to read

- Each behaviour has one card. The **STANDARD** version comes first: the simplest common NFL form. Other forms are
  tagged **later scheme option (not built now)**. The aim is "as standard as we can" before adding options.
- Every factual row has a source key (defined at the end) and a confidence:
  - **H**: a coaching or film source states it directly.
  - **M**: inferred, or from a single weak, paywalled or search-excerpt source.
  - **L**: unsourced reasoning, marked "reasoning".
- Card fields: who, when (relative to cadence and play clock), why, hide vs tip, down and distance, cost, and the
  **observable cue**. The cue is what the defender can see to time the move. The project's rule is that a cue needs
  visible evidence, not a timer or another player's private assignment.
- "Internal" sources are this repo's own 2022 NFL tracking measurements, quoted from code comments. They are
  measurement, not coaching, so they are rated M at most.

## The STANDARD pre-snap picture, in one table

| # | behaviour | STANDARD version | conf |
|---|---|---|---|
| 1a | settle to formation | Every DB and backer re-aligns to splits, stacks, bunch and back set once the offense sets. Small leverage steps continue through the cadence | H |
| 1b | anticipate | Small drift toward what film or situation predicts (run strength, a pressure side). Held inside the shown shell | M |
| 1c | edge width | The edge sets on the surface (tackle or attached TE), wider on passing downs. A wing changes his technique; a tight slot or nasty split does not move him | H (surface), M (wing) |
| 2 | walk-up (creep) | A backer or safety cheats toward the line late in the cadence and arrives as the ball is snapped. A-gap mug as a tag | H |
| 3 | walk-up and bail | One look, several plays: same walk-up, then rush or drop. Cycles (up, back, up) exist but are rarer | H (concept), M (cycles) |
| 4 | safety rotation | Two-high shown, rotate to one-high immediately before or at the snap (about 30% of NFL snaps rotate a safety) | H |
| 5 | front stem | Line aligns in one front and moves to the called front on a "move" call in mid-cadence | H |
| 6 | motion response | Man: lock (travel). Zone: bump; safeties roll on a change of strength. Front stays | H (man), M (zone) |
| 7 | shift response | Re-set to the new formation, re-declare strength, re-check the coverage. Front moves only if an attached TE moves | M |
| 8 | timing cue | Off-ball men time the cadence and the QB's visible readiness (hands, head, leg lift). Linemen go on the ball | H |
| 9 | caught moving | A defender in motion at the snap gives ground, gives away the call or jumps offside. Hard counts and dummy counts make this the cost | H |

---

## 1. Settling / leverage adjustment

### 1a. To formation (splits, stacks, bunch, backfield set)

| field | STANDARD | source | conf |
|---|---|---|---|
| who | All DBs and off-ball backers. Linemen adjust only their shade (slightly wider when they expect a run) | [Bowen C1]; [AFCA DL] | H |
| when | After the offense sets, and again after every shift or motion. Continues until the defender's real spot is held | [Bowen C1] ("Whether that is by alignment or motion, you will see safeties, cornerbacks and linebackers adjust") | H |
| what | Apex re-splits a wide #2: "the Will linebacker splits the difference as an apex player". Cover 1 "jump" answers a reduced split. The corner on a lone backside receiver gets a "bounce" (man) call vs trips | [CI 4-2-5]; [Bowen C1] | H |
| why | Keep leverage on the man or zone the call owns, and keep gap fits aligned to the new surface | [Bowen C1]; reasoning | H/L |
| hide vs tip | Leverage must match the shown shell: "if ten guys are showing Cover 2 but one Corner is 'cheating' his leverage for a Cover 3 roll, the illusion is dead" | [AllEyes] | H |
| down and distance | Safety depth tightens in short yardage and sits deeper on long downs | [Bowen C3] | H |
| cost | Every re-align spends time and attention. Motion and tempo shrink that time | [PFF rot]; reasoning | M |
| observable cue | The formation itself: receivers' set positions and splits, back set, and the TE attached or detached. All visible | reasoning | L |

### 1b. Anticipating (drift toward a read of the play)

| field | STANDARD | source | conf |
|---|---|---|---|
| who | Mostly safeties and box backers; the star safety is the classic case | [Steelers PT]; [Yardbarker PT] | H |
| what | Small shifts to where he expects the play: "OK, they're going to run this play, so I'm going to take this position over here" (Polamalu) | [Steelers PT] | H |
| linemen | "slightly looser or wider on the outside shoulder of the guard" when a run is expected | [AFCA DL] | H |
| box backers (tracking) | NFL box LBs, last 0.1 s before the snap: 37-38% move faster than 0.5 yd/s, about 60% of those downhill (median +0.4 yd/s), on runs and dropbacks alike | Internal: `src/sim/backer-creep.ts` | M |
| why | Gain a step on the expected play | [Steelers PT] | H |
| hide vs tip | A drifting safety is a tell: a safety cheating down raises the odds of pressure from that side (QB teaching) | [FirstDown] (search excerpt) | M |
| down and distance | Not found as a sourced rule. Reasoning: run-strength drift on early downs, pressure-side drift on passing downs | reasoning | L |
| cost | Wrong guess: out of position. A visible lean gives the QB the read and invites a check | [AllEyes]; [Gridiron saint] | H |
| observable cue | Personnel, formation, down and distance, the opponent's tendencies, and visible tips (back depth, OL stance). Never the called play | handbook `docs/football-handbook/defense-and-perception.md` §9; reasoning | M |

### 1c. Edge width: a wide-9 end against a wing, a tight slot or a nasty split

The user's question: does the edge widen with the receiver, tighten, or align on the tackle and ignore him? And is
the receiver taught to change his split, block him, or crack him? Flex is measuring NFL edge width against the
nearest eligible receiver.

**Short answer.** The taught reference is the **surface**: the last man attached to the line (the tackle, or an
inline TE). A detached receiver is not the reference. The 9 / wide 9 is defined against the tackle and TE. A wing
(off the line but attached, about 1.3 yd outside the TE) changes the end's technique. A tight slot or a nasty split
does not move the end; it is a crack and force problem for the overhang and the corner. No source teaches the end to
follow a split receiver out.

| field | STANDARD | source | conf |
|---|---|---|---|
| reference | The 9 "lines up well wide of the offensive tackle," and outside "even the tight end if there is one to that side of the formation" | [PFF 9T] | H |
| wide 9 width | A wide 9 is "about two or three yards off the Y-receiver" (the attached TE) | [49WZ] | M |
| no TE | With no TE the end keeps his width to rush the passer: "the alignment can look completely ridiculous" | [PFF 9T] | H |
| tracking, width | Ends outside an attached end form one hump at 1.65 yd outside him (IQR 1.20-2.14), with no peak at the shoulder. The open side stands about 2.4 yd outside the tackle. The end man widens about 0.4 yd on 3rd and 3+ (median 2.4 yd outside the surface vs 1.9-2.1 on early downs) | Internal: `FRONT_ALIGN`, `BOX_ALIGN` comments, `src/playbook/alignment.ts` | M |
| width by matchup | Survey: 46.4% of coaches have the 9 split the crotch of the TE; 40.5% set his inside foot outside the TE's outside foot. One coach goes tighter when the 9 is the better athlete and wider when the TE is, always wide enough to play a reach and still squeeze a down block | [XOL 9T] (403; search excerpt only) | M |
| vs a wing | Glossaries number a 9 as the "outside shade on the wing" (8 head-up, 8i inside shade). An NFL install has the end play a 9 against a pair of ends, on the inline end's outside shoulder and inside the wing. **Sources differ** on whether the wing or the TE is the reference | [Glossary] (search excerpt); Internal: 2017 Colts install via `src/playbook/alignment.ts` | M |
| vs a wing, wider | One team rule: outside shoulder of the wing up to 5 yd; a wing or slot wider than 5 yd gets a different (off-ball) technique | [CBSD] (search excerpt; PDF 404) | M |
| vs a tight slot / nasty split | No source has the end widen to a detached receiver. The receiver is the overhang's or corner's (apex, force). Coaching on a nasty split, from one excerpt: the force defender widens while keeping the end outside the receiver; vs a tight split he tightens. The excerpt is ambiguous about which defender | [Glossary] (search excerpt) | L/M |
| why width | Width isolates the tackle and gives a straight rush path. It costs room inside: it "comes at the expense of opening up space inside that can be exploited in the run game" | [PFF 9T]; [ITP W9] | H |
| down and distance | Wide 9 is mainly a passing-down, sub-package alignment in today's NFL | [PFF 9T] (search excerpt: "very much a sub-package alignment in today's NFL") | M |
| observable cue | The surface (TE attached or not, wing set) and the split are visible after the set. A reduced split is a visible crack tell | [FNUSA crack] | M |

What the offense is taught against it:

| offense answer | detail | source | conf |
|---|---|---|---|
| run inside him | Wide ends become "easy marks for traps, draws and counter plays"; "the OTs are free to block the linebackers" | [Philly W9]; [BR W9] | H |
| block him with the TE or wing | When the TE blocks a 9 he aims at the play-side pec and runs his back hand through the inside number "to widen him". Split zone blocks the backside edge with a TE, H-back or fullback | search excerpts (X&O Labs / USA Football) | M |
| help the tackle in protection | Chips and slides help the tackle, but cost a route or open a gap. "Tug" and "Tag" swap tackle and guard jobs | [49WZ] | M |
| crack him (receiver) | A crack comes from a receiver near the edge. The tell: "A receiver who suddenly reduces his split and turns his shoulders toward an inside defender is a crack indicator." The answer is crack-replace: the corner becomes the force | [FNUSA crack] | M |
| change the split to get around him | **Not found.** No source teaches a receiver to take a wider or tighter split to get around a wide-9 end. Tight splits are taught for crossers and crack angles | [FirstDown splits] (crossers) | — |

Engine today: `FRONT_ALIGN` sets the end man's width from the surface (tracked 9 at 1.5 yd and wide 9 at 2.5 yd
outside an attached end) and from his build. Against a wing he plays a 9 on the inline end's outside shoulder, inside
the wing. Detached receivers do not move him.

---

## 2. Walk-up (creep) to the line by a backer or safety

| field | STANDARD | source | conf |
|---|---|---|---|
| who | A backer, or a safety, who is part of the call (a blitzer, or a sim dropper) | [Hoover]; [Gridiron saint] | H |
| when | Late in the cadence, timed to arrive at the snap: "He must time his blitz so that he cheats up just prior to the snap to help disguise the blitz" | [Gridiron saint] | H |
| why (blitz) | Hit the line at or near the snap: "On a short yardage play … the Linebacker probably wants to hit the line of scrimmage at the snap." Timing the count gives "an extra step ahead of the offensive lineman" | [LBChalk]; [Viq LB] | H |
| why (from depth) | "if you're blitzing the Quarterback, you might want to blitz from depth. This forces the blocking scheme to declare itself before you attack." So a passing-down blitzer may *not* walk up | [LBChalk] | H |
| hide vs tip | Early movement tips: "Shuffling or creeping too early gives the QB exactly what he wants." "Poor timing can tip the blitz to the offense and result in an audible or an adjustment of routes" | [AllEyes]; [Gridiron saint] | H |
| down and distance | Short yardage: at the line at the snap. Long yardage: blitz from depth, or mug (below) | [LBChalk] | H |
| cost | Closer and moving forward when a pass shows. A hard count can catch him | [Gridiron saint]; internal `src/sim/backer-creep.ts` | M |
| observable cue | The cadence and the QB's visible readiness (section 8) | [Viq LB]; [Gridiron saint] | H |
| tracking | A rushing backer stands about 2.4 yd deep at the snap | Internal: `BLITZ_CREEP`, `src/playbook/alignment.ts` | M |

### Tag: A-gap mug (both inside backers on the centre's shoulders)

| field | STANDARD | source | conf |
|---|---|---|---|
| what | Backers "mug and walk … up on the LOS" in the A or B gaps. The double mug puts one over each centre shoulder, often from a "Jet"/wide front | [Hoover]; [MQ DblMug] | H |
| when (down) | "a standard way defenses attack 3rd Downs and passing downs in the NFL" | [MQ DblMug] | H |
| tracking, rate | Nickel snaps with at least one backer in an A gap: 1.3% on 1st down, 2.6% on 2nd, 7.2% on 3rd-and-short, 19% on 3rd-and-4+. Two backers: 0.1-6.8% over the same downs | Internal: `MUG_RATES`, `src/game/playcaller.ts` | M |
| rule | "The standard rule is to show inside pressure with an outside blitz and vice versa" | [MQ DblMug] | H |
| protection | Typical answer: Combo protection. The centre slides to one mugger and the back takes the other. "if the defense drops a seventh defender to the line of scrimmage, the QB is responsible for him" | [MQ DblMug] | H |
| NFL example | Patriots vs Broncos: six on the line, Hightower and Collins "each threatening the A-gap blitz". Hightower and Ninkovich dropped on the interception. Each backer rushed 12 times (PFF) | [BR Pats] | H |
| front | A double mug needs both A gaps open (two 3-techniques); from an Over or Under only one backer can mug | Internal: `MUG_PRESSURES` comment, `src/game/playcaller.ts` | M |

---

## 3. Walk-up and bail; cycles; "shown vs played"

| field | STANDARD | source | conf |
|---|---|---|---|
| definitions | "A Creeper does not show pressure pre-snap. A Simulated Pressure shows pressure pre-snap." A sim is "giving the illusion of bringing 6 and only rushing 4" | [Hoover] (quoting Roberts) | H |
| STANDARD | One look, several plays: from the same walk-up or mug, a backer rushes on one call and drops on another. "Not every snap of a Double Mug presentation needs to be a pressure"; defenses "carry multiple calls that send a different number of pass rushers each time" | [MQ DblMug] | H |
| tracking, shown vs played | Nickel dropbacks with a double mug at the snap: neither mugger rushes 42%, one 32%, both 25% (a lineman drops 14%). With a single mug, the mugger rushes about half the time | Internal: `MUG_PRESSURES` comment, `src/game/playcaller.ts` | M |
| disguised drop | A backer can show blitz and run to his man at the snap ("hug"): "the quarterback will see the linebacker's pre-snap demeanor and expect a blitz" | [Andscape] | H |
| cycles (up, back, up) | Ravens: "The Ravens' linebackers dance around pre-snap and show blitz, back off, etc., before rushing" (untouched rusher, interception) | [BR Ravens] | H (exists) |
| walk up, turn away, come | Polamalu "walked up to the line, then turned his back to the line of scrimmage" … "only to pivot at the snap of the ball" (sack, 2005) | [Steelers PT bio] | H (exists) |
| how often cycles happen | Not found. No source or tracking rate for up-back-up cycles | none | — |
| off-ball sim | A sim can also come with "no pre-snap presentation of pressure" (off-ball sims) | [MQ Roberts] | H |
| why | Make the protection account for threats who may not come, force a quick throw, free a fourth rusher. "their real purpose is to stop the run" (Roberts) | [Hoover]; [MQ Roberts]; [MQ DblMug] | H |
| down and distance | Mostly 3rd and passing downs (see mug rates). Roberts says sims serve run downs too | [MQ DblMug]; [MQ Roberts] | H |
| hide vs tip | A look that is always the same play is read: "the offense knows something is up when you line up in that formation" | [Gridiron sets] | H |
| cost | A dropping mugger starts at the line, far from his zone. QB "hot" reads punish a shown blitz that comes. A backer who backs off late is moving at the snap (section 9) | [MQ DblMug]; reasoning | M/L |
| observable cue | The same as section 2: cadence and QB readiness. "Back off" is triggered by the snap *not* coming on the expected beat (the QB re-checks, looks to the sideline, or resets) | reasoning | L |

Later scheme option (not built now): bluff to one side to slide the protection, then pressure the other. Miami's
"bluff look to the opposite side of the pressure to get the OL to slide that way" ([USAF Fire3], M).

### Value check

PFF's 2019 data found that "there is no real difference, based on what a defense showed pre-snap and what it ended
up playing post-snap" in EPA allowed ([PFF 3S], M; the chart values were not readable). CMU's tracking study (BDB 2025
semifinal): "If teams don't disguise their pressures, they aren't going to get pressure without a key rusher" ([CMU],
M). The evidence on what disguise is worth is mixed. Value should come from the mechanism (protection and QB
read), not from a bonus.

---

## 4. Safety rotation pre-snap; late rotation

| field | STANDARD | source | conf |
|---|---|---|---|
| STANDARD | Two-high shown, rotating to one-high (open-to-closed): "NFL defenses will often roll from a two-deep look to disguise Cover 3" | [Bowen C3]; cards doc §(iv) ([MQ-Disg]: Eagles' disguised snaps "98% open-to-closed") | H |
| rate | "Across the 2025 regular season and playoffs, defenses rotated a safety on 30.2% of snaps" (preseason 32.8%) | [PFF rot] | H |
| when ("late rotation") | "rotating a safety immediately before or at the snap". Coaching: "We want to disguise the coverage and move the free safety late." "Hold your water until the cadence or the snap forces your move" | [PFF rot]; [CI 4-2-5]; [AllEyes] | H |
| at the snap | Cloud: "the defense will roll the coverage at the snap to create a three-deep look." Bills: "Once the ball is snapped, the Bills will spin to the three WR side" | [Bowen C3]; [MQ Collide] | H |
| why | Make the QB process after the snap: "the majority of his processing only after the play has started"; "The QB is blind to the post-snap movement" on play action | [FFR]; [MQ Collide] | H |
| direction | "It is much easier to work down than back." Closed-to-open exists as a rarer trap call | [MQ Collide]; cards doc [MQ-C2O] | H |
| NGS definition | NGS flags a play as disguised if a defense "shows split-safety zone and rotates to single-high man" (or spins to Cover 0) | [NGS 2025] | H |
| hide vs tip | Moving early shows the shell. A rotation that starts as the QB looks gives him the read | [AllEyes]; [PFF rot] | H |
| down and distance | Not found as a rate by down. Tempo cuts rotation: "Regular-season offenses are more likely to hurry to the line, leaving defenses with less time to rotate at the snap" | [PFF rot] | H |
| cost | Distance. A safety rotating from another shell spends time and momentum reaching his job, so a late spin cannot reach every landmark | handbook §9; [MQ Collide] | M |
| observable cue | The cadence and QB readiness (section 8) for "late". The ball's movement for "on the snap" | [AllEyes]; reasoning | M |
| tracking, shown shell | Dropbacks, deep men at the snap vs PFF coverage: Cover 3 shows two high 42%, Cover 1 26%, Cover 0 shows someone deep 36%; Cover 2 shows one high 28%, quarters 16%, Cover 6 11%, 2-man 12% | Internal: `SHELL_SHOW`, `src/game/playcaller.ts` | M |

Tags (cards doc has the full rules for each):
- **spin**: from two-high, one safety drops into the box or the hook and the other goes to the middle. MatchQuarters: "spin down a Safety to the TE side to get more numbers near the box" ([MQ Collide], H).
- **buzz**: the down safety goes to the hook and a backer or nickel takes the curl-flat ([Bowen C3]; cards doc naming, H).
- **sky / cloud**: who takes the flat. Cloud is the corner, rolled at the snap ([Bowen C3], H).
- Later scheme option (not built now): closed-to-open (one-high shown, two-high played) as a trap call ([MQ-C2O], M).

---

## 5. Front stem / DL slide

| field | STANDARD | source | conf |
|---|---|---|---|
| what | The line aligns in one front and moves to the called front on a "MOVE" or "SLIDE" call | [Viq stem] | H |
| who calls | A linebacker makes the call: "MOVE" or "SLIDE", and never "GO" or any word the offense uses | [Viq stem] | H |
| when | "We always like to move the front in the middle of the quarterback's cadence" | [Viq stem] | H |
| timing rule | "If you do it too soon, the offense can adjust. If you do it too late, your players will be out of position." "earlier is always better than later" | [Viq stem] | H |
| why | Confuse the line's blocking calls. In short yardage, draw a false start: "a great way for the defensive coordinator to steal 5 yards" | [Viq stem] | H |
| bump / under | Bump: "The defensive linemen move one full gap to the next adjacent gap". In Under, "the nickel will walk up to the line of scrimmage" | [Glazier bump] | H |
| practice | "practice the opponent's cadence so you know exactly when to move the defensive front"; one-word calls help against tempo | [Viq stem] | H |
| hide vs tip | Moving too far opens a bubble: linemen moved "too far in or too far out" let the offense run at the weakness. A TE motion "creates a problem for your front stem" | [Gridiron sets] | H |
| down and distance | Short yardage for the false start. No sourced rate by down | [Viq stem] | H/L |
| cost | Moving at the snap means a poor stance and a late get-off. The offense can snap on the move (section 9) | [Viq stem]; reasoning | M |
| rules | Calls that move the line are legal. NFL "disconcerting acts or signals" is 12-3-1(i) (index only seen). Signals that imitate the offense's cadence are fouls; "telling defensive linemen to shift or stunt" is listed as legitimate | [NFL rules idx]; [ESPN tush] (search excerpt) | M |
| observable cue | The cadence (mid-count), heard or seen. The linebacker times the call to it | [Viq stem] | H |
| post-snap (not pre-snap) | Slants, angles, pinches and twists are post-snap line games. They are tracked separately (`DL_GAMES`) and are out of scope here | [AFCA DL]; internal | M |

Later scheme option (not built now): stems that are not on a call (each lineman on his own), and repeat stems (two moves).

---

## 6. Responses to motion, by coverage family

The project's man-motion rules exist already (`MOTION_CHECK`, `src/sim/motion.ts`). They are not re-derived here.
Man: the line-set defender **locks** on the motion man (travels or trails a jet), or **trades** him to whoever the new
formation puts there. Tracked lock shares: across 51%, jet 66%, empty 69%, in-and-back 58%. Zone: jobs **bump** to the
nearest defender; safeties **spin** on a change of strength; the front stays.

| family | STANDARD response | later scheme option (not built now) | source | conf |
|---|---|---|---|---|
| Cover 0 / Cover 1 (man) | Lock (travel): simplest, only one defender reacts. Cost: "signals man coverage early" | Switch/trade ("Any mistakes on the SWITCH could result in an uncovered Receiver"); "jump" vs reduced split | [Svec man]; [Bowen C1] | H |
| man vs zone tell | Motion "forces the defense to show man or zone": a defender who runs with the motion shows man | Mix lock and bump to hide the family | [Bowen C1]; [Gridiron sets] | H |
| Cover 3 | Underneath bump. On a change of strength, the safeties roll toward the motion and the down safety re-sets to the new strength ("rack-n-roll" vs jet) | Track the jet with one defender | [Svec jet] (Canadian football); forum excerpt; internal `MOTION_CHECK` | M |
| Cover 2 / Tampa 2 | Bump underneath; corners keep their sides; the free safety "will just change his read call" | — | playbook excerpt (search only) | L/M |
| Cover 4 / quarters | Re-number: "As the motion back leaves in motion, the free safety starts to move with him." Jet across: "we tell the Will linebacker he has the motion man." Motion to 3x1 brings the trips check (bounce, poach, stubbie: cards doc) | Rotate to Cover 3 on motion (Michigan "roll from 4 … to cover 3 with motion") | [CI 4-2-5]; [Kou Mich] (search excerpt) | H / M |
| Cover 6 | A strength change flips the half and quarter sides (re-call at the line) | — | cards doc 10b (reasoning) | L |
| spin / rotate | FS slides toward the jet; the far safety "will go high to replace the Free Safety". Easier to disguise than a track | — | [Svec jet] | M |
| buzz | No sourced motion-specific buzz rule found. Reasoning: buzz is the rotation that keeps the hook covered when the down safety spins | — | reasoning | L |
| push the front | STANDARD: the front stays ("Stay"/"Play It"); only coverage jobs move. A team rule: "only a TE trade will switch a strength call- motion DOES NOT change the strength" | Push or kick the front (3-tech to shade, nose to 3) on TE motion | internal `MOTION_CHECK` comment (2002 Bengals, 1998 Bears); playbook excerpt (search only) | M |
| gap exchange | Backers re-fit: on a jet, the Sam bounces out and the Mike, Will and backside half each "shift one gap over" | — | [Svec jet] (reader comment) | M |
| tracking | Zone defenses put someone across the ball on 19% of across motions. Man coverage puts a defender with the jet on 47% of jets | internal `MOTION_CHECK`, `src/sim/motion.ts` | M |

Timing and cost of motion responses:
- Median time from motion start to snap is 1.7 s, and 95% of snaps come within 5.0 s. More variable snap timing goes
  with fewer "havoc" plays by the defense ("lower snap timing variability corresponds to higher rate of facing havoc
  events") ([arXiv snap], H). That defenders anticipate predictable timing is the paper's hypothesis, not a
  measurement.
- Man coverage holds closer spacing to the offense through motion (overlap 0.51 vs 0.38 for zone) ([Grifka], M:
  the measure is not defined on the page).
- NFL offenses "window dress their pre-snap looks, as it forces the defense to show man or zone" ([Bowen C1], H).

---

## 7. Responses to a shift or formation change

| field | STANDARD | source | conf |
|---|---|---|---|
| purpose (offense) | "Offensive shifts and motions help uncover disguise — they make the defense declare." They also "set defensive strength, adjust 3-tech or nickel positioning" | [C&C Carney] | H |
| STANDARD response | Re-align to the new formation (1a), re-declare strength, and re-check the coverage (trips checks, cards doc 10a) | [CI 4-2-5]; [Bullock] (via cards doc) | M |
| front | Moves when the attached surface moves (a TE trade or shift). Receiver-only shifts leave the front | playbook excerpt (search only); internal `MOTION_CHECK` | M |
| who calls | The Mike sets front and strength; the safety relays the coverage check (section 8) | [Viq LB guide] (search excerpt) | M |
| cost | Each shift resets the clock on disguise. The defense must re-show its look, and a late check can leave a man moving at the snap | [C&C Carney]; reasoning | M/L |
| observable cue | The shift itself and the reset (all eleven set for a second: NFL Rule 7 shift rules) | handbook §9 (Rule 7 reference) | M |

---

## 8. Timing cue and communication

Most of these cues are **not observable in positional tracking**: sound, hands, head turns, ball twitches, signals.
Tracking sees only the result (defender velocity relative to the snap frame). Flex can measure timing against
the snap frame, but not the cue.

| cue | what the defender reads | source | conf | in tracking? |
|---|---|---|---|---|
| cadence (sound) | Linebackers and linemen learn the count; "press the line of scrimmage on the second color" | [Viq LB] | H | no |
| QB hands (shotgun) | "Raising their hands right before they receive a shotgun snap" | [Viq LB] | H | no |
| QB head (under center) | "Quarterbacks who are under center will often look to the left, look to the right, and then center their head" | [Viq LB] | H | no (head yaw is not in BDB tracking) |
| QB leg lift (silent count) | The lift tells the centre to snap ("the second he sees movement snaps the football"). A fake lift can make the defense reveal its look | [Viq lift] | H | no |
| the ball | Linemen: "A ball key is the fastest way for a defensive lineman to get off the ball." Ware: "watch the ball", against noise and hard counts | [AFCA DL]; [Broncos AR] | H | partly (snap frame) |
| play clock | Not found as a sourced cue for defenders. Reasoning: a low clock means the snap is near | reasoning | L | no (clock not in tracking) |
| motion timing | Motion-to-snap median 1.7 s; predictable timing may be anticipated (hypothesis) | [arXiv snap] | H (number), M (anticipation) | yes |

Communication:

| item | STANDARD | source | conf |
|---|---|---|---|
| call in | Coaches signal the call by hand signals or wristbands. "The quicker the information is signaled, the more confident the unit will be" | [HK signal] | H |
| front and strength | The Mike relays the call, sets the strength and makes front adjustments. Who calls strength varies by team (Mike or Sam) | [Viq LB guide] and playbook excerpts (search only) | M |
| stem call | A linebacker calls "MOVE" or "SLIDE" in mid-cadence | [Viq stem] | H |
| coverage check | The safety makes the coverage check, to strength. Coaches may also yell calls: Whitt "yells multiple calls … before and after the ball is snapped" | playbook excerpt (search only); [NBC DFW] | M |
| motion | Bump and switch "take a lot of communication"; a missed switch leaves a receiver uncovered | [Svec jet]; [Svec man] | H |

Proposal note (project rule): a defender's last move must key something he can see or hear: the QB's hands or head,
the leg lift, the snap count's rhythm, or the ball. It must not key the engine's snap time. `SNAP_REACT` already models
the cadence and ball as the cue for the start. A late rotation or creep should use the same cue.

---

## 9. Caught moving: the cost that keeps defenders honest

| field | STANDARD | source | conf |
|---|---|---|---|
| cost 1: ground and stance | A defender moving at the snap is late to his landmark or flat-footed. Stem "too late, your players will be out of position" | [Viq stem] | H |
| cost 2: giving it away | Early movement shows the call. "Shuffling or creeping too early gives the QB exactly what he wants"; poor blitz timing brings "an audible or an adjustment of routes" | [AllEyes]; [Gridiron saint] | H |
| cost 3: offside, free play | A hard count draws a jump. Rodgers drew opponents offside nine times in six games and threw deep on eight free plays. Deep completions came "one every 1.6 attempts" on free plays vs "one every 17.6" otherwise | [Broncos AR] | H |
| hard count | An irregular, accented cadence used to draw a jump and keep blitzers unsure of the snap | [Wiki HC] | M |
| dummy count | Fake calls to make safeties show: Whitt "uses an array of 'dummy' snap count calls, hoping to fool the safeties by getting them to show their hand" | [NBC DFW] | H |
| fake leg lift | One or several lifts before the real one, to make the defense reveal coverage or blitz | [Viq lift] | H |
| double cadence / check-with-me | Run the cadence, then look to the sideline after the defense has shown its look. A double cadence gives "a little extra time" to study the defense | [Gridiron sets]; check-with-me search excerpts | M |
| quick snap / tempo | A quick count gives no time to change, at the cost of the offense's pre-snap read. Tempo cuts rotation rates (PFF) | [Gridiron sets]; [PFF rot] | H |
| freeze play | Not found as a sourced, described play in this pass | none | — |
| defensive answer | Discipline: "without jumping offside or without trying to jump the count" (Phillips); key the ball (Ware). Safeties who "don't bite and stand still in their original pre-snap location" | [Broncos AR]; [NBC DFW] | H |
| tracking | No NFL tracking rate found for "defender moving at the snap" costs. Flex can measure velocity at the snap frame vs the result | none | — |

The rule this section supports: do not cap pre-snap movement. Its price is that the movement can be seen, timed or
caught: a QB who reads it, a cadence that catches it, and a snap that comes while a man is in transit.

---

## NFL tracking studies of pre-snap disguise (what was reachable)

| study | finding | source | conf |
|---|---|---|---|
| BDB 2025 winner: Bajaj and Sandwar (NYU), "Exposing Coverage Tells in the Presnap" | A transformer model of the pre-snap read. It inspired NGS's 2025 disguise model. **No numbers reachable**: the Kaggle notebook did not render and the NFL finalist pages returned 404 | [NYU]; [NGS 2025]; [Sumer] | H (exists), — (numbers) |
| BDB 2025 finalist "CAMO: The Art of Pre-Snap Disguise" (Gurol et al.) | **Not reachable** (only the Kaggle title loaded) | [CAMO] | — |
| BDB 2025 semifinal "Trench Chess" (CMU) | Measured disguised pressures and stunts. Undisguised pressures do not get home without a key rusher. No numbers in the article | [CMU] | M |
| BDB 2025 entry, Grifka | Motion and defender spacing: man overlap 0.51 vs zone 0.38. Zone shows negative overlap change about 91% of the time | [Grifka] | M |
| NGS 2025 | Pre-snap "what the QB sees" model vs post-snap coverage; 19 motion types; disguise = split-safety zone shown, rotated to single-high man or Cover 0 | [NGS 2025] | H |
| PFF 2025-26 | Safety rotated on 30.2% of snaps (regular season and playoffs), 32.8% in preseason | [PFF rot] | H |
| Sumer via FanSided | Flores's Vikings "simulated pressure" on 56.9% (2024) and 63.1% (2025) of dropbacks; blitz rate 39.7% and 47.7%. The definition is not given and may count shown pressure looks | [FanSided] | M |
| PFF 2025 | League pass-blitz rate "around 33%"; pressure on blitzes 42.3%; the Eagles led in simulated pressures | [PFF blitz] | H |
| arXiv 2502.16313 | Motion-to-snap median 1.7 s; lower timing variability goes with more defensive havoc | [arXiv snap] | H |
| Internal (2022 tracking) | Box-LB creep, mug rates and packages, shown shells, motion locks (rows above) | code comments as cited | M |

---

## Measured: NFL against ours (Flex, 2026-11-23)

These are Flex's pre-snap tracking tables (BDB 2025 against our pre-snap frames, same operator) on branch
`claude/quirky-franklin-9lbwbp` (a867810d, 3a978178), in `docs/reviews/data/2026-11-23-presnap/`
(`presnap-tables.txt`, `presnap2-tables.txt`, `edge-width.txt`). Numbers are as reported by Flex; they are not
re-run here.

| card | NFL | ours | reading |
|---|---|---|---|
| 4 late rotation | 11% of deep safeties start their last move in the final 1.0 s; 0.2% start it in the final 0.5 s | 0.1% | "Show late" is real but is not a last-instant move: it begins 0.5-1.5 s out and runs into the snap |
| 9 caught moving | over 1 yd/s at the snap: safeties 30%, CBs 16%, LBs 13% | (see tables) | Movement into the snap is ordinary in the NFL |
| 3 shown vs played | of LB/S walk-ups still up at the snap, 77% drop and 23% rush; 17% back off before the snap; 0.8% cycle up-back-up | creep is always a blitz | The STANDARD walk-up is mostly a disguise; the cycle is rare (keep it a later option) |
| 2 tag, A-gap mug | 2.0% of plays; a backer rushes on 49% | 5.3%; rushes on 93% | Ours is shown more often and is nearly always real |
| 1c edge vs wing | the wing aligns 0.3 yd inside the edge, 1.9 yd deep; the edge does not widen for him (0.0 yd in the last 3 s); the wing releases inside 51% | similar alignment | Matches the card (the edge sets on the surface). Contact between them: ours 52% vs 14%, because our edges rush 92% vs 39% |

## Engine today (develop 0226f0d3, read only)

- **frontStem** (`src/game/playcaller.ts`, `src/sim/playsim.ts` `stageDefense`). With chance `coach.disguise × 0.35`,
  the call draws another front from the same menu. The defense aligns in that front and moves to the called one,
  starting 0.4-1.6 s before the snap. It moves every defender. One stem per snap; no call word or cadence cue.
- **creep** (same files). With chance `coach.disguise × 0.5`, one participant in the called pressure starts at
  least 4 yd deep. He walks to 0.65 yd off the line in his gap, starting 0.3-1.2 s before the snap. It must be a
  called blitzer, so a creep is always a real blitz: no bail, no cycle.
- **BACKER_CREEP** (`src/sim/backer-creep.ts`; experimental: `0` in `config/baseline.json`, on in
  `config/reference-stack.json`). Each box backer who is not blitzing (2.5-7 yd deep, within 6 yd of the ball)
  creeps with chance 0.2 + 0.4 × anticipation. He walks downhill at 0.4-0.8 yd/s from 0.3-0.6 s before the snap. His
  start is the snap, and he carries the pace into his read step (`src/sim/behaviors/defense.ts`). It is not used
  under a stem.
- **ZONE_MUG** (`src/sim/behaviors/blocking.ts`; `0` in baseline, on in reference-stack). An offensive blocking rule,
  not a defensive movement. A box backer within 3 yd of the line, inside the surface and not stacked within 1 yd of a
  down lineman, counts as a front man for zone ownership. Mugs are placed by `MUG_CALLS`/`MUG_PRESSURES` (`0` in
  baseline, on in reference-stack) at tracked rates; they stand there from the start.
- **Man-motion lock/trade** (`MOTION_CHECK`, `src/sim/motion.ts`; `1` in baseline). Man defenders lock or trade at
  tracked rates. Zone jobs bump to the nearest eligible defender; safeties spin on a change of strength; the front
  stays.
- Also present, for completeness:
  - `SHELL_SHOW` / `alignDisguised` (`src/playbook/alignment.ts`): the secondary stands in the shown shell and
    rotates at the snap. There is no pre-snap rotation movement.
  - `SNAP_REACT` (`src/sim/snap-count.ts`): cadence with hard counts. Defenders who time the count can be drawn.
  - `OFFBALL_TIMING`: lets an off-ball defender time the count (`0` in baseline).
  - `BLITZ_CREEP`: depth of a rushing backer at the snap.
  - `DL_GAMES`: post-snap line games.

## Gaps: what the engine lacks, by behaviour (proposal list only; nothing is built)

| # | behaviour | STANDARD version | engine has | missing | observable cue to use |
|---|---|---|---|---|---|
| 1a | settle to formation | Continuous small re-leverage after set, shift, motion | Static alignment to the set formation; motion bump re-sorts | Small leverage steps through the cadence; re-settle after every change | Formation as perceived, with delay |
| 1b | anticipate | Drift toward a predicted play inside the shown shell | BACKER_CREEP (box LBs downhill only, flag) | Lateral and safety drift; drift from the defender's own prior; drift as a visible tell for the QB | Personnel, formation, situation, tendencies |
| 1c | edge width | Edge on the surface; wing changes the technique; detached receivers are the overhang's | FRONT_ALIGN (surface, build, wing rule, 3rd-down widening) | Crack tell from a reduced split; the force player's widen/tighten vs nasty and tight splits (sources thin) | Surface, wing and split after the set |
| 2 | walk-up | Late cheat that arrives at the snap; depth by down | `creep` (one blitzer, fixed window); BLITZ_CREEP depth | Safety walk-up; timing keyed to cadence or QB readiness, not a seconds window | QB hands or head, leg lift, count rhythm |
| 2 tag | A-gap mug | Both inside backers on the centre's shoulders on passing downs | MUG_CALLS/MUG_PRESSURES (static at the snap, flag); ZONE_MUG (offense) | The walk-up into the mug; protection slide answer (Combo) as a visible offensive check | Same as 2 |
| 3 | walk-up and bail | One look, rush or drop; occasional up-back-up cycle | Mug package shares (rush or drop from a static mug); creep is always a blitz | Creep that drops; back-off when the snap does not come; re-walk; disguised drop from a walk-up | Snap not on the expected beat; QB reset or look to the sideline |
| 4 | safety rotation | Two-high shown, rotate immediately before or at the snap (~30%) | SHELL_SHOW: stand in shown shell, rotate after the snap | Pre-snap rotation in the last ~1 s; reverse or abort if the snap is delayed; tempo cutting rotation | Cadence and QB readiness; the ball for "on the snap" |
| 5 | front stem | Move call in mid-cadence; bump or under one gap | frontStem: one whole-front move in a 0.4-1.6 s window | Stem keyed to the cadence (call word); partial slides (one gap); false-start pull in short yardage via the OL's perception | Mid-cadence beat (sound) |
| 6 | motion response | Man lock; zone bump plus roll on a strength change; front stays | MOTION_CHECK (lock/trade, bump, spin, stay) | Visible man/zone tell to the QB from the response; gap-exchange re-fits; push-the-front option | The motion man as perceived |
| 7 | shift response | Re-align, re-declare strength, re-check | Not found as a separate rule (reasoning: alignment re-runs on the final formation) | Re-declare and check with a communication delay; men caught mid-check at the snap | The shift and the reset |
| 8 | timing cue / calls | Cadence, QB readiness, ball; Mike and safety relay | SNAP_REACT (cadence, hard count, ball cue); OFFBALL_TIMING (flag) | One shared readiness cue for all late pre-snap moves; call relay delay (Mike to line, safety to secondary) | As listed in section 8 |
| 9 | caught moving | Movement costs ground, gives the call away, draws offside | SNAP_REACT hard count (line jumps); creepers keep moving into the snap | QB reads pre-snap movement (tells); dummy counts and fake lifts that make defenders show; quick snap while men are in transit | The defender's visible movement, as the QB perceives it |

Notes for whoever builds from this list:
- Do not cap movement. Let it be seen and timed, and let the cadence and the QB's read punish it (section 9).
- Keep the ratings out of results. Anticipation or awareness may change *when* a defender moves and how well he
  times the cue, not whether the disguise "works".
- Fewest options first. One walk-up that can rush or drop, one late rotation, one cadence-keyed stem. Cycles and
  bluff sides come later.

## Not found or not reachable

- Up-back-up cycles: they exist (Ravens, Polamalu), but no frequency or timing source was found.
- Numbers from the BDB 2025 winner and from CAMO: Kaggle notebooks did not render; NFL finalist pages returned 404.
- A sourced, described "freeze play".
- The play clock as a defender's cue.
- A sourced rate of front stems in the NFL. One search excerpt claimed "10% to 50%" for one staff; it is unverified
  and not used.
- A Cover 2 / Tampa 2 motion rule from a primary source (only a playbook excerpt).
- A buzz-specific motion rule.
- 1c: a primary source on the edge versus a nasty split or tight slot, and any teaching that a receiver changes his
  split to get around a wide-9 end. The X&O Labs 9-technique survey (403) and the team playbook PDF (404) were seen
  only as search excerpts.
- Most MatchQuarters and X&O Labs clinics: paywalled; only the free parts were used.

## Sources

| key | source | level |
|---|---|---|
| [AFCA DL] | AFCA, "The Fundamentals of Defensive Line" | college clinic |
| [AllEyes] | All Eyes DB Camp, "Stop being an open book: the art of the disguise as a DB" | DB coaching |
| [Andscape] | Andscape, "NFL conversation domination playbook: bunches, hugs" | NFL film |
| [arXiv snap] | "A multilevel model with heterogeneous variances for snap timing in the NFL" (arXiv 2502.16313) | tracking study |
| [Bowen C1] | Matt Bowen, NFL 101: Cover 1, Bleacher Report | NFL (ex-safety) |
| [Bowen C3] | Matt Bowen, NFL 101: Cover 3, Bleacher Report | NFL |
| [BR Pats] | Bleacher Report, "Controlling the A gap key to Patriots win over Broncos" | NFL film |
| [BR Ravens] | Bleacher Report, "X's and O's: genius, insanity and the zone blitz" | NFL film |
| [Broncos AR] | Denver Broncos, "To contain Aaron Rodgers, start with limiting the free stuff" | NFL team |
| [C&C Carney] | Coach and Coordinator, Mark Carney, "Utilizing shifts and motions" | college clinic |
| [CAMO] | Kaggle, "CAMO: The Art of Pre-Snap Disguise" (title only) | BDB 2025 |
| [CI 4-2-5] | Coaches Insider, "Cover 4 from the 4-2-5 defense" | clinic |
| [CMU] | Carnegie Mellon, "Trench Chess" | BDB 2025 semifinal |
| [ESPN tush] | ESPN, tush push and disconcerting signals (search excerpt) | news |
| [FanSided] | FanSided, "The Vikings are thriving under blitz king Brian Flores" (Sumer data) | analytics, secondary |
| [FFR] | Football Film Room, "Disguising coverage out of 2-deep" (free part) | film |
| [FirstDown] | FirstDown PlayBook, coaches community (search excerpt) | HS coaching |
| [Glazier bump] | Glazier, Brian Nix, "Bump and under defensive line shifts" | HS clinic |
| [Grifka] | D. Grifka, BDB 2025 motion and coverage overlap (GitHub README) | BDB 2025 entry |
| [Gridiron saint] | Gridiron Strategies, "Saint blitz confuses pass protection schemes" | coaching |
| [Gridiron sets] | Gridiron Strategies, "Disguising defensive sets send offenses into a panic" | coaching |
| [HK signal] | Human Kinetics, "Signaling calls to the defense" | coaching book excerpt |
| [Hoover] | Barry Hoover, "Creepers vs simulated pressures" (quotes Ron Roberts) | coaching |
| [Kou Mich] | Coach Kou, "Michigan football defense: Cover 3" (search excerpt) | college film |
| [LBChalk] | LB Chalk Talk, "LB 101 part 7: blitzing" | LB coaching |
| [MQ Collide] | MatchQuarters, "Where single-high and two-high collide" (free part) | NFL/college |
| [MQ DblMug] | MatchQuarters, "The NFL's favorite double mug pressure" (free part) | NFL |
| [MQ Roberts] | MatchQuarters, "Ron Roberts puts on a creeper/sim clinic" (free part) | college/NFL clinic |
| [NBC DFW] | NBC DFW, "Mental assault: how the Cowboys defense uses disguise" | NFL practice report |
| [NFL rules idx] | NFL Rulebook index (12-3-1(i)) | rules |
| [NGS 2025] | NFL.com, "Next Gen Stats: new advanced metrics for the 2025 season" | league tracking |
| [NYU] | NYU Stern news, BDB 2025 winners | news |
| [PFF 3S] | PFF, "How the three-safety defense is taking over the Big 12" (2019 data) | analytics |
| [PFF blitz] | PFF, "5 most effective blitzers from the 2025 NFL season" | analytics |
| [PFF rot] | PFF, "NFL preseason 2026: do NFL defenses really show their hand?" | analytics |
| [Steelers PT] | Steelers.com, "He's got a unique skillset" (Polamalu) | NFL team |
| [Steelers PT bio] | Steelers.com, Troy Polamalu bio | NFL team |
| [Sumer] | Sumer Sports, "The data that helped a Big Data Bowl win" | analytics |
| [Svec jet] | Jon Svec, "Defensive reactions to jet motion" (Canadian football) | coaching |
| [Svec man] | Jon Svec, "Adjusting to motion in man coverage" | coaching |
| [USAF Fire3] | USA Football, "Fire 3 simulated pressure" | clinic |
| [Viq LB] | Viqtory Sports, "How to coach your linebackers to blitz" | coaching |
| [Viq LB guide] | Viqtory Sports, "How to coach linebackers (complete guide)" (search excerpt) | coaching |
| [Viq lift] | Viqtory Sports, "Different types of offensive cadences in the shotgun" | coaching |
| [Viq stem] | Viqtory Sports, "How to stem the defensive front" | coaching |
| [Wiki HC] | Wikipedia, "Hard count" | general |
| [Yardbarker PT] | Yardbarker, Cowher on Polamalu's disguise vs Carson Palmer | NFL anecdote |
| [PFF 9T] | PFF, "Defensive prototypes: 9-technique" | analytics |
| [49WZ] | 49ers Webzone, "Wide-9: what it means for the 49ers defense" | NFL fan analysis |
| [Philly W9] | Philadelphia Magazine, "All-22: Jim Schwartz's Eagles defense" | NFL film |
| [BR W9] | Bleacher Report, "Eagles wide nine defense: what is this?" | NFL |
| [ITP W9] | Inside the Pylon glossary, "Wide 9 technique" | glossary |
| [XOL 9T] | X&O Labs, Mike Kuchar, 9-technique survey (403; search excerpt only) | clinic survey |
| [Glossary] | Coaching glossary forum (jcfb), technique numbers and splits (406; search excerpt only) | HS coaching |
| [CBSD] | Multiple 3-4 team playbook PDF (404; search excerpt only) | HS playbook |
| [FNUSA crack] | Football Nation USA, "What is crack replace" | coaching |
| [FirstDown splits] | FirstDown PlayBook, "Bait the defense with your receiver splits" | HS coaching |

Cards-doc keys used here ([MQ-Disg], [MQ-C2O], [Bullock]) resolve in `docs/reviews/2026-11-23-coverage-cards.md`.

[MQ-Disg]: https://www.matchquarters.com/p/fangio-cover-9-eagles-two-high-disguise
[MQ-C2O]: https://www.matchquarters.com/p/rams-closed-to-open-cover-2-traps
[Bullock]: https://markbullock.substack.com/p/commanders-scheme-breakdown-quarters
[AFCA DL]: https://www.afca.com/the-fundamentals-of-defensive-line/
[AllEyes]: https://alleyesdbcamp.beehiiv.com/p/stop-being-an-open-book-the-art-of-the-disguise-as-a-db
[Andscape]: https://andscape.com/features/the-nfl-conversation-domination-playbook-on-bunches-hugs-and-why-you-aint-that-good/
[arXiv snap]: https://arxiv.org/abs/2502.16313
[Bowen C1]: https://bleacherreport.com/articles/2032934-nfl-101-introducing-the-basics-of-cover-1
[Bowen C3]: https://bleacherreport.com/articles/2047445-nfl-101-introducing-the-basics-of-cover-3
[BR Pats]: https://bleacherreport.com/articles/2255428-controlling-the-a-gap-key-to-patriots-win-over-broncos
[BR Ravens]: https://bleacherreport.com/articles/444112-xs-and-os-genius-insanity-and-the-zone-blitz
[Broncos AR]: https://www.denverbroncos.com/news/to-contain-aaron-rodgers-start-with-limiting-the-free-stuff-16187870
[C&C Carney]: https://coachandcoordinator.com/offensive-shifts-and-motions-mark-carney/
[CAMO]: https://www.kaggle.com/code/brochillington/camo-the-art-of-pre-snap-disguise
[CI 4-2-5]: https://coachesinsider.com/football/cover-4-from-the-4-2-5-defense-article/
[CMU]: https://www.cmu.edu/dietrich/news/news-stories/2025/cmu-sophomore-uses-nfl-data
[ESPN tush]: https://www.espn.com/nfl/story/_/id/46356840/nfl-tush-push-rule-disconcerting-signals-officiating-philadelphia-eagles-kansas-city-chiefs
[FanSided]: https://fansided.com/nfl/nfl-stat-of-the-week-the-vikings-are-thriving-under-the-blitz-king-brian-flores
[FFR]: https://www.footballfilmroom.com/p/disguising-coverage-out-of-2-deep
[FirstDown]: https://firstdown.playbooktech.com/coaches-community/dial-up-odd-front-pressure-away-from-rotation
[Glazier bump]: https://www.glazierclinics.com/football-coach-resources/solidify-your-edges-with-bump-and-under-defensive-line-shifts
[Grifka]: https://github.com/dgrifka/nfl_motion_coverage_overlap
[Gridiron saint]: https://gridironstrategies.com/article/saint-blitz-confuses-pass-protection-schemes
[Gridiron sets]: https://gridironstrategies.com/article/disguising-defensive-sets-send-offenses-into-a-panic
[HK signal]: https://us.humankinetics.com/blogs/excerpt/signaling-calls-to-the-defense
[Hoover]: https://coachhoover.blogspot.com/2019/08/creepers-vs-simulated-pressures.html
[Kou Mich]: https://coachkoufootball.substack.com/p/michigan-football-defense-cover-3
[LBChalk]: https://lbchalktalk.substack.com/p/lb-101-part-7-blitzing
[MQ Collide]: https://www.matchquarters.com/p/where-single-high-and-two-high-collide
[MQ DblMug]: https://www.matchquarters.com/p/the-nfls-favorite-double-mug-pressure-texans-broncos-vikings
[MQ Roberts]: https://www.matchquarters.com/p/ron-roberts-puts-on-a-creeper-sim-clinic-auburn
[NBC DFW]: https://nbcdfw.com/news/sports/mental-assault-how-the-cowboys-defense-uses-disguise-versatility-to-confuse-qbs/2994613
[NFL rules idx]: https://operations.nfl.com/the-rules/nfl-rulebook/index.html
[NGS 2025]: https://www.nfl.com/news/next-gen-stats-new-advanced-metrics-you-need-to-know-for-the-2025-nfl-season
[NYU]: https://www.stern.nyu.edu/experience-stern/news/undergraduate-college-alumnus-vishakh-sandwar-bs-25-featured-indian-origin-nyu-students-win-nfls-big.md
[PFF 3S]: https://www.pff.com/news/college-football-college-football-how-the-three-safety-defense-is-taking-over-the-big-12-and-beyond
[PFF blitz]: https://www.pff.com/news/nfl-5-most-effective-blitzers-from-the-2025-nfl-season
[PFF rot]: https://www.pff.com/news/nfl-preseason-2026-do-nfl-defenses-really-show-their-hand
[Steelers PT]: https://www.steelers.com/news/he-s-got-a-unique-skillset
[Steelers PT bio]: https://steelers.com/history/bios/polamalu_troy
[Sumer]: https://sumersports.com/the-zone/sumersports-big-data-bowl-2026/
[Svec jet]: https://jonsvec.substack.com/p/defensive-reactions-to-jet-motion
[Svec man]: https://jonsvec.substack.com/p/adjusting-to-motion-in-man-coverage
[USAF Fire3]: https://blogs.usafootball.com/blog/7377/here
[Viq LB]: https://www.viqtorysports.com/?p=31814
[Viq LB guide]: https://www.viqtorysports.com/how-to-play-linebacker-in-football-complete-guide/
[Viq lift]: https://www.viqtorysports.com/quarterbacks-lift-leg/
[Viq stem]: https://www.viqtorysports.com/how-to-stem-the-defensive-front/
[Wiki HC]: https://en.wikipedia.org/wiki/Hard_count
[PFF 9T]: https://www.pff.com/news/defensive-prototypes-9-technique
[49WZ]: https://www.49erswebzone.com/news/125781-wide-9-what-means-49ers-defense/
[Philly W9]: https://www.phillymag.com/birds247/2016/01/25/all-22-jim-schwartz-philadelphia-eagles-new-defense/
[BR W9]: https://bleacherreport.com/articles/863056-philadelphia-eagles-wide-nine-defense-what-is-this
[ITP W9]: https://scoutingacademy.com/itp-glossary-wide-9-technique/
[XOL 9T]: https://www.xandolabs.com/?p=14167
[Glossary]: https://jcfb.forums.net/thread/18536/football-coaches-directory-glossary
[CBSD]: https://www.cbsd.org/cms/lib/PA01916442/Centricity/Domain/1949/Multiple%2034%208%2025%2014.pdf
[FNUSA crack]: https://www.footballnationusa.com/post/what-is-crack-replace-how-corners-restore-the-edge
[FirstDown splits]: https://firstdown.playbooktech.com/coaches-community/bait-the-defense-with-your-receiver-splits
[Yardbarker PT]: https://www.yardbarker.com/nfl/articles/he_loved_disguising_sb_winning_steelers_hc_recalls_troy_polamalus_mind_games_with_carson_palmer/s1_17667_42687872
