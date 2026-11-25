# Fatigue across a game: sources and how the engine already covers them

Read this first, then the dossier below. The dossier (research pack, 2026-11-13)
audited an older picture of the code. It missed the 2026-10-25 fatigue audit and
#298, which already did most of what it asks for. Tested against `develop`
`d90dcb96`:

| Dossier recommendation | Engine today | Gap |
|---|---|---|
| Fast pool plus slow reserve, work-based spend, refill between snaps | `Body.energy` fast pool, `Game.reserve` slow ceiling (1% of each play's spend, half back at halftime), `fastRefillRate = 0.006 + 0.010·stamina`; [FAT-2](../KNOWN_PROBLEMS.md#fat-2) | Reserve share is uncalibrated; no tracking can set it. |
| Repeated-effort tests (10 rushes at 15/25/45 s) | `scripts/diag/fatigue-probe.ts` measures consecutive-snap fade with the NFL rush-rep operator (speed 2.5–4.0 s −0.053 vs NFL −0.039 yd/s per snap) | A controlled isolated-rest series (fixed blocker, fixed seeds, only rest varied) does not exist. |
| Rotation from observable work, not hidden energy | Coach counts snaps, forgets over ~10 min, position weights, extra cost inside a series; [FAT-1](../KNOWN_PROBLEMS.md#fat-1) | No visible-fade cue. |
| Fatigue must show in the body, not as a roll | `fatigueFactor` scales top speed, drive acceleration, braking and cut force; it also feeds support availability in `tackle.ts`, `blocking.ts`, `run-block-fit.ts`, `catch-approach.ts` | Burst, top speed and braking share one curve; the dossier's separation is untested. |
| Contact work charged as work | `spendEnergy` charges mechanical, speed and isometric work; [FAT-3](../KNOWN_PROBLEMS.md#fat-3) (no fade inside a long engaged rep, waits on `world.ts`) | Open. |
| No-huddle limits defensive substitution; tempo as an offensive choice | Double substitution cost under hurry-up; [FAT-4](../KNOWN_PROBLEMS.md#fat-4) | Open: not a procedure limit, no tempo choice. |
| Warm-up readiness of a cold bench player | None | New. Newton 2002 is one small pilot; do not build it on that alone. |
| Heat strain, cramps, between-game recovery | None | New, and only matters for weather or a management season. |
| Task-specific cognitive fatigue | `qb.ts` throw dispersion `1 + 0.25·(1 − energy)` only | New, and the dossier itself says no NFL coefficient exists. |

## What to take from it

- Keep fatigue as work, rest and rotation. The EdgeDesk null result (+0.001 EPA
  per five extra first-half snaps) is a reason not to add a late-game debuff,
  not a reason to remove the repeated-effort mechanism.
- Compare against matched fresh controls on the same snap; a slower play is not
  fatigue by itself.
- Cognitive and heat terms need football-specific evidence before they reach
  the field. Defensive soccer mental-fatigue effect sizes are not football
  ratings.

Treat the numbers below as sources, not coefficients. The Jordan Davis, Kenny
Clark, Foerster and Gates accounts are the most useful qualitative evidence.

---

## Research dossier (as received, 2026-11-13)

**Research dossier — November 13, 2026**  
**Scope:** NFL and collegiate American football, physical exertion and collision load, within-drive recovery, within-game cumulative changes, position and role asymmetry, cognition, heat, cramping, between-game recovery, substitutions, and a proposed implementation and validation plan for `tannerthardy/football-simulation-`.

## Executive conclusions

1. **No universal 'fourth-quarter slowdown' law is justified.** Players may lose repeated-burst ability and specific technical margins, but team scoring depends strongly on selection, situation, tactics, substitution and matchup. A controlled team-level study of NFL/CFB first-half defensive workload found little evidence for a broad second-half EPA penalty from added first-half snaps; it cannot rule out individual transient fatigue.
2. **Position and task are essential.** Tracking establishes that WR, DB and LB movement demands differ substantially from OL/DL, while wearable accelerometers show that the collision profiles of DT, RB and other positions differ. Sprint distance is particularly poor as a proxy for lineman effort.
3. **Two clocks should be separated: within-series short recovery and game-long burden.** High-power repeated efforts partially recover in tens of seconds; repeated efforts do not always recover completely. Collision/neuromuscular strain and thermal load have longer timescales; game-to-game soreness and readiness persist for days.
4. **Rotation is rational but not a proof of a numerical fatigue curve.** Jets DC Jeff Ulbrich and HC Robert Saleh, Packers players/coaches, 49ers OL coach Chris Foerster and multiple NFL linemen describe strategic rest and the strain of repeated snaps. Specific snap targets are system- and roster-dependent.
5. **The sim already has a foundation.** As of `develop` head `d90dcb96d4dcfa6bd4505c36a8b60a6efb7daa0c`, it maintains a fast energy pool, slow reserve, sprintLoad, work-based spend, between-snap replenishment, and staff-controlled line rotation. Research supports evolving these, not replacing them with arbitrary position-specific endgame penalties.
6. **Do not infer a precise stamina-decrement coefficient from any of these papers.** The strongest NFL tracking study measures *movement demands*, not a randomized fatigue effect or the within-player maximum available effort as fatigue increases. Estimates below are hypotheses or calibration targets, not universal physiological constants.

---

## 1. Understanding the football work/rest structure

**Primary research:** Gabbett / competition model: *Competition modeling of American football: observational data and implications for high school, collegiate, and professional player conditioning* ([PubMed PMID 16503692](https://pubmed.ncbi.nlm.nih.gov/16503692/)). Thirty games observed; high-school plays 5.6 ± 2.0 s, college and NFL plays about 0.4–0.5 s shorter, with average work-to-recovery ratios near 1:5.5, 1:6.1 and 1:6.2, respectively. Average NFL rest is longer than that of the other levels.

**Intermittent-sports framework:** *Testing in Intermittent Sports—Importance for Training and Performance Optimization in Adult Athletes* ([Medicine & Science in Sports & Exercise](https://doi.org/10.1249/MSS.0000000000003442)). The American-football summary approximates ~5 s hard work, ~25–40 s recovery and much longer rests at times; hurry-up sequences can shrink the recovery ratio. It explicitly says end-game fatigue evidence is inadequate.

**Practical implication:** A hard 5-second pass rush and a 28-second reset differ from a hard 5-second rush followed by 15 seconds and another 5-second rush; a timeout or end of quarter should not simply erase the previous repetitions.

**Do not confuse:** Game clock is not active time. Two players in the same quarter may have drastically different work histories depending on play calls, alignments, routes, coverage, engagements, and substitutions.

---

## 2. NFL and NCAA positional load: the best direct evidence

### A. Large NFL NGS study: Sanchez et al. (2023)

**[Positional Movement Demands during NFL Football Games: A 3-Year Review](https://www.mdpi.com/2076-3417/13/16/9278)** — peer-reviewed, open access. NGS movement over **768 NFL regular-season games, 2018–2020**; analyzed distances, max velocities, high-velocity efforts, accelerations and decelerations, including movement on the field between snaps. Players classified by position: 455 CB, 450 S, 732 DL, 667 LB, 779 OL, 182 QB, 418 RB, 325 TE, 663 WR; these are player records, not one unique person per game or an experiment on fatigue.

- WR and DB cover relatively long distances and have high maximum velocities, accelerations and decelerations.
- LB recorded especially frequent high-velocity efforts/distance using the study's position-specific thresholds.
- OL and DL rank lower for *running* quantities. The authors explicitly state this omits the important physical demands of blocking/hitting, so it does not prove their work is less strenuous.
- Defenders often decelerate more than their offensive analogues; reactive movement can require braking and changing direction.

**Simulation implication:** Score workload by **task**: high-intensity running and direction change for skill/secondary; contact impulse, isometric effort, angular hand fighting and re-anchors for trench positions. The same measured sprint distance should not generate the same fatigue burden for all positions.

**Crucial limitation:** It does not prove players *got slower during a game*. Positional differences in observed maximum speed are not within-player pre/post loss of physical capacity.

### B. Collegiate game GPS: [Global Positioning System Monitoring of Selected Physical Demands of NCAA Division I Football Players During Games](https://pubmed.ncbi.nlm.nih.gov/30908375/)

43 monitored players in four position clusters: OL 14, DL 9, WR 10, DB 10. DB traveled farther than OL and WR in the selected sample; DB and WR reached greater speeds; WR accumulated the most distance in the highest acceleration band, with DB above OL and DL. Measured variables include distance, maximum velocity and acceleration/deceleration intensities. This corroborates the need for position-dependent load definitions, not necessarily late-game capability loss.

### C. Collision profile: [Quantification of Accelerometer Derived Impacts Associated With Competitive Games in NCAA Division I College Football Players](https://pubmed.ncbi.nlm.nih.gov/27227790/)

33 athletes; **294 player-game records across 12 games**. DT had relatively more 7.1–10 g heavy/very-heavy impacts than other defensive position groups. RB were involved in more >10 g impacts than most other offensive groups (QB exception); distribution differed greatly between positions. Be very careful: torso accelerometer 'g' is **not** a directly measured tackle contact force in newtons and is sensitive to placement and event classification.

**Simulation implication:** Add contact-exposure *features*, not crude hits-as-sprint-distance equivalents. Consider impulse, work against an opponent, player mass, duration and repetition; do not convert g bins directly to fatigue decrements without calibration.

### D. In-game power/force pilot: [Changes in Maximal Power and Force Over the Course of a Competitive Collegiate Football Game](https://orthoarchives.com/en/orthoscience/article/changes-in-maximal-power-and-force-over-the-course-of-a-competitive-collegiate-oarc-a0010804465) (Newton et al., 2002)

The pilot/abstract reports that playing athletes lost maximal power early in a particular game but partly recovered as game intensity eased; substitutes who did not play experienced declines consistent with waning warm-up. Small, situational evidence. Its lesson is vital: **a player on the sideline can lose readiness to perform explosively even as his metabolic fatigue recovers**. Fresh does not automatically mean warmed up.

---

## 3. What acute fatigue could actually consist of

### A. Fast-burst energy and phosphocreatine availability

- **[Muscle phosphocreatine repletion following single and repeated short sprint efforts](https://pubmed.ncbi.nlm.nih.gov/9241025/)**: in trained subjects, one 6-s maximal cycling sprint left PCr at 55% after 10 seconds of recovery, 69% at 30 s and 90% at 3 min; following repeated 6-s sprints every 30 s, PCr was only 27%, 45% and 84% at the same post-exercise checkpoints. These are **muscle biopsies in controlled cycling**, not NFL pass-rush measurements or universal parameters. They establish plausibility of incomplete recovery after repeated maximal efforts.
- **[Contribution of phosphocreatine and aerobic metabolism to energy supply during repeated sprint exercise](https://pubmed.ncbi.nlm.nih.gov/8964751/)**: after a 30-s all-out cycle sprint PCr was ~17% of resting; 3.8 min later ~79%. Not directly a football-play dose, but it underscores that different work intensities and durations have very different recovery curves.
- **[Testing in Intermittent Sports](https://doi.org/10.1249/MSS.0000000000003442)**: shorter between-play rests in high-tempo situations challenge energy-system recovery.

**Model:** fast exertion/readiness driven by actual delivered work and high-intensity contraction, with exponential or biexponential recovery that depends on conditioning and recent repetition. A player's 10th uninterrupted hard rush should begin at lower instantaneous reserve than the first if rest intervals are too short; mild plays may produce little decline. A 'hurry' flag should shorten the rest and limit substitution opportunities, not directly deduct stamina.

### B. Local force production / eccentric braking

Repeated accelerations, sharp decelerations, re-anchors, resisting a bull rush and tackles place different demands on muscle-tendon units. A broad speed multiplier will often erase important differences. If fatigue has to manifest somewhere first, plausible observable domains include **initial acceleration, ability to repeat maximal bursts, maintaining posture/anchor under repeated load, and precision when cutting or re-aiming**. These are physically plausible simulation hypotheses, not validated NFL percentage penalties.

### C. Effort regulation and pacing

A 50% jog is not a 100% sprint with the same energy spend. Players may deliberately throttle down on distant pursuit, preserving energy or controlling leverage. A defender's *choice* of effort is separate from his *available capacity*. Distinguish `requested_effort` from `actual_output` and prevent fatigue from being inferred from slow movement when the player did not need to sprint.

### D. Slow reserve / residual strain

Contact damage, neuromuscular power loss, soreness, pain and thermal stress are not necessarily cleared by 60 seconds of sideline rest. A second reservoir or task-specific strain state can preserve longer-lived costs. Its effect need not be uniform and should depend on role, exposure, previous week and recovery.

---

## 4. Firsthand voices from NFL players and coaches

### Defensive rotation and finishing power

1. **[Robert Saleh / Jeff Ulbrich, New York Jets: rotation 'math'](https://www.newyorkjets.com/news/robert-saleh-on-the-math-that-leads-to-a-killer-defensive-line-rotation)** (2022). Ulbrich floated roughly 30–35 DL snaps in an aggressive attack scheme; Saleh says optimal total is closer to a share of snaps (roughly 70%) and varies by total play count, using tactical rotation to place key rushers on third down. This is firsthand coaching philosophy, not experimental proof that a rusher degrades at snap 36.
2. **[Jeff Hafley, Kenny Clark and Kingsley Enagbare: Packers rotation](https://www.si.com/nfl/packers/onsi/packers-deeper-defensive-line-rotation-provides-relentless-pressure-01jb0x85xejd)** (2024). Clark says the fourth quarter feels substantially fresher with reduced snaps; Hafley argues rotating four rushers against tackles who play every snap creates late-game leverage. Enagbare describes feeling capable of playing much longer. Direct player experience and actual rotation, but not an identified causal model.
3. **[Jonathan Allen: Bengals defensive-line rotation](https://www.bengals.com/news/quick-hits-al-golden-jonathan-allen-dexter-lawrence-boye-mafe-age-of-rotation-for-bengals-d-line)** (2026). Allen contrasts approximately 32 snaps with his historical high-40s workload and says the line felt fresh in the third and fourth quarters.
4. **[Jordan Davis: training camp long-drive conditioning](https://www.inquirer.com/eagles/jordan-davis-every-down-player-diet-conditioning-jt-alphabet-clint-hurtt-20250926.html)** (2025). Davis describes a progression from roughly 10 to 13 consecutive practice snaps, then 16–18-play simulated drives; normal 8–9-play game drives felt more manageable. Conditioning therefore affects repeated-effort tolerance and confidence, not just nominal top speed.
5. **[NFL.com: playing-time projection and pass-rush quality](https://www.nfl.com/news/five-ways-mike-mccarthy-and-a-new-coaching-staff-changed-the-steelers-in-week-1)** (2026). McCarthy describes workload projections and trying to preserve a useful number of quality rushes late in games. Useful for a tactical rotation policy, not a universal 20–25-rush physiological ceiling.

### Offensive line: very different substitution economics

6. **[49ers offensive-line coach Chris Foerster interview](https://49ers.1rmg.com/transcripts/offensive-line-run-game-coordinator-chris-foerster-press-conference-8-8-24/)** (2024). Foerster says players are frequently most tired after the first full-speed drive of opening week; describes former players Joe Staley and Mike McGlinchey becoming severely fatigued after ~30–40 snaps when returning from inadequate game-specific preparation, and Trent Williams acknowledging that he was effectively spent early in a game after injury. The striking distinction is *game-speed contact/strain vs. practice conditioning*, especially after reduced preparation. Do not generalize his anecdotes as an exact snap-based threshold.
7. **[Nick Gates, New York Giants, firsthand press remarks](https://www.giants.com/news/brian-daboll-leonard-williams-nick-gates)** (2022). Gates says run blocking may tire a lineman more than pass protection due to sustained offensive effort and finishing blocks; actual game conditioning differs from running drills. This is a player's personal report, not a universal finding for every scheme.
8. **[Joel Bitonio on the burden of offensive-line snaps](https://sports.yahoo.com/article/cleveland-browns-guard-joel-bitonio-210257688.html)** (2025). Bitonio describes OL workloads of 55–85 snaps/game versus defensive-line rotations with fewer snaps, plus the weekly cumulative burden. This is strong evidence of different *exposure patterns*.
9. **[Kyle Long discussing exhausted two-minute drives](https://podscripts.co/podcasts/pardon-my-take/kyle-long-in-studio-1-question-with-blake-bortles-cfb-talk-bring-your-lunchpail-with-jersey-jerry)** (written podcast transcript). Long recalls having to sprint back to the line during fourth-quarter two-minute drives while tired. Note: source is a transcript of an audio interview, not a written interview; the user requested written sources/no videos.

**Translation:** Rotating high-effort defensive linemen should have meaningful opportunity value. Offensive linemen often cannot substitute casually because cohesion, communication, technique and depth-chart quality matter. Fatigue can advantage a fresh DL against a highly used OL, but no study establishes the size of that matchup advantage.

---

## 5. Does a tired defense actually collapse late? A crucial negative result

**[Do tired defenses break late? — EdgeDesk independent observational analysis](https://edgedesksports.com/research/environment/defensive-fatigue/)** (updated October 2026). Analysis of 9,710 NFL and 16,299 CFB defensive game-performances; uses offense/defense team-season effects, score and 1H defensive effectiveness. Estimated second-half EPA allowed change per five additional first-half snaps was **+0.001 NFL (95% CI −0.005 to +0.007)** and **0.000 CFB (−0.004 to +0.005)**. Also tested Q4 EPA, no-huddle exposure, long drives and limited instrumental-variable logic using offense three-and-outs; general results near zero.

**Interpretation:** This strongly challenges a sim rule like `defense_all_stats *= 0.95 after 35 snaps`. But it is an observational sports-analytics report, not a peer-reviewed physiology study. Aggregate EPA cannot observe effort within a rep, because coaches rotate tired players, adjust schemes and personnel, and scores induce different play calling. Confidence intervals bound *average team-level association under these controls*, not the existence of any individual fatigue.

**Design implication:** Let fatigue arise from observed work, tactical rotation and individual state. Validate both (a) high-frequency repeated-effort degradation in defined drills and (b) no large unexplained game-wide second-half defensive EPA collapse in simulations. Distinguish drive length from tempo, quality, down/distance and personnel.

---

## 6. Heat, equipment, hydration and cramps

### Best American-football thermal studies

- **[Thermoregulation, Fluid Balance, and Sweat Losses in American Football Players](https://pubmed.ncbi.nlm.nih.gov/27071988/)** (2016 review). Large players, particularly linemen, are at greater heat risk due to body mass, reduced surface-area-to-mass ratio and equipment. Reported football sweat rates typically ~1.0–2.9 L/h, sometimes ≥3.0 L/h; context matters and these are not NFL game measurements.
- **[Sweat rates and fluid turnover in professional football players: NFL linemen and backs](https://pmc.ncbi.nlm.nih.gov/articles/PMC2267333/)** (Godek et al., 2008). Eight linemen and four backs/receivers in preseason practices: mean linemen 2.385 ± 0.520 L/h vs backs 1.410 ± 0.660 L/h. Percentage body mass loss ~1.15% vs 1.06%, not meaningfully different because linemen consumed more fluids. *Do not equate sweat rate to dehydration burden.*
- **[Sweat Rates and Fluid Turnover in Three Groups of Professional Football Players](https://pubmed.ncbi.nlm.nih.gov/20617911/)** (2010). Extends positional comparisons of sweat and sodium loss.
- **[Metabolic and thermoregulatory responses to a simulated American football practice in heat](https://pubmed.ncbi.nlm.nih.gov/17685718/)**. Five college OL; 60-min simulated blocking session in gear conditions; average intensity ~55% VO2max, lactate >5 mmol/L and heart rate ~79% maximum. Shoulder pads increased recovery-period energy cost and some core temperature measures. Important rebuttal to the assumption that linemen have low metabolic load simply because they run less.
- **[Sweat rates and fluid turnover in American football vs runners](https://pmc.ncbi.nlm.nih.gov/articles/PMC1725187/)** (2005). Football mean ~2.14 L/h during hot/humid practices; several methodological limitations, but illustrates thermal stress.
- **[Sweating is greater in NCAA football linemen independently of heat production](https://pubmed.ncbi.nlm.nih.gov/21796051/)** (2012). Lab climate chamber, six linemen versus six backs with normalized heat load, cautioning against simplistic size scaling.
- **[Normative sweating by sport, 1,303 athletes](https://pubmed.ncbi.nlm.nih.gov/31230518/)** (2019). Average measured American football sweat rate ~1.51 ± 0.70 L/h, highest among the sports included. Individual variability substantial.

**Simulation:** Environmental heat stress should be distinct from a fast muscle-energy pool. WBGT/heat/humidity, gear, body size, air movement, pace and fluid opportunity all matter. For ordinary cool games, do not add arbitrary thermal penalties. Heat illness must not be reduced to a benign ratings modifier: in real life it is a medical danger; in a game sim, severe conditions may warrant player removal and medical event rules, not a hidden performance degradation.

### Cramping: do not simulate dehydration as a certain cause

- **[An Evidence-Based Review of Exercise-Associated Muscle Cramps](https://pmc.ncbi.nlm.nih.gov/articles/PMC8775277/)** (2022, National Athletic Trainers' Association) finds multiple interacting mechanisms, with fatigue and altered neuromuscular control important; blanket 'drink more' prescriptions are not justified.
- **[Risk Factors for Exercise-Associated Muscle Cramps: Systematic Review with Meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC13644889/)** (2026) found *prior personal cramp history* was the clearest reproducible predictor (odds ~4.4×); studies did not establish universal global dehydration, sodium or exercise-load predictors. This is cross-sport evidence and requires caution.

**Model:** Cramp can be a separate low-frequency event conditional on susceptibility, muscle-specific effort, context and uncertainty; do not compute `crampChance = dehydration * constant` and claim scientific validation.

---

## 7. Recovery: hours, days and across the season

- **[Time Course of Perceptual Recovery Markers After Match Play in Division I-A College American Football](https://pubmed.ncbi.nlm.nih.gov/27967293/)**: two seasons of self-reported sleep, soreness, energy and wellness; measures remain worse GD+3 and GD+4 than day before the game, with small standardized effect sizes. Distinct from an instantaneous 'energy' score.
- **[Utility of the Countermovement Rebound Jump for Assessing Neuromuscular Status in NCAA D1 American Football Players](https://pubmed.ncbi.nlm.nih.gov/41665606/)** (2026): 29 players, two matches; rebound-jump power, modified reactive strength index and jump height decline 24h after game, with substantial recovery by 72h; load moderates some recovery outcomes.
- **[Characterizing Biomarkers of Muscle Damage in Collegiate Football Players](https://pmc.ncbi.nlm.nih.gov/articles/PMC13073919/)** (2026): 17 football players after scrimmage; CPK ~992 IU/L immediately and ~739 at 24h vs ~268 following 48h non-exertion comparator. CPK is a noisy biochemical marker and not a direct in-game strength scalar.
- **[Multimodal indicators of non-functional overreaching in NCAA D1 American football](https://pmc.ncbi.nlm.nih.gov/articles/PMC13433165/)** (2026): starters and nonstarters show distinct subjective, endocrine and neuromuscular adaptation across a season; jump height can dip midseason and rebound. Observational correlations are not direct coaching-rule parameters.
- **[Biochemical and hormonal responses during an intercollegiate football season](https://pubmed.ncbi.nlm.nih.gov/16015144/)** (2005): CK rises sharply through camp and returns toward baseline during season, suggesting adaptation rather than monotonic accumulation. This is an important counterexample to 'more weeks played = necessarily more fatigued'.
- **[The Association Between Redox, Cortisol and Fatigue Markers in American Collegiate Football](https://pubmed.ncbi.nlm.nih.gov/34051699/)** (2021): 23 players over ten weeks, relationships between wellness/soreness, jump metrics and biomarkers. Best as conceptual support for multidimensional state.
- **[Creatine kinase and neuromuscular fatigue in contact codes: systematic review/meta-analysis](https://pubmed.ncbi.nlm.nih.gov/29870313/)** (2018): increases in CK and declines in countermovement-jump power after matches and at 24h. Cross-sport; adequate for recovery plausibility, not a football-game coefficient.

**Model:** If league/season play is relevant, maintain readiness on a weekly calendar with training, sleep, previous exposures and health. Avoid a simple permanent fatigue debt each game; the 2005 football-season result shows adaptation can reverse trends despite continued competition.

---

## 8. Mental fatigue, perception and skill execution

**Distinguish task-specific evidence from direct NFL evidence.** Most experimentally controlled work below comes from association football (soccer) and other sports, not professional American football.

- **[Effects of mental fatigue on sport-related reaction time, technical and decision-making performance](https://pmc.ncbi.nlm.nih.gov/articles/PMC13418146/)** (2026 systematic review/meta-analysis). Experiments indicate poorer decision-making (Hedges' g ~0.67), technical performance (~0.61) and reaction-time outcomes (~0.50), with meaningful differences in certainty/heterogeneity. Effect sizes are standardized group differences in research tasks, **not** football ratings penalties or 0.67-second delays.
- **[Mental fatigue impairs soccer-specific decision-making](https://pubmed.ncbi.nlm.nih.gov/26949830/)** (2016): randomized crossover, 12 players; poorer accuracy and slower responses after cognitive-fatigue induction, without a clearly established change in visual-search pattern.
- **[Assessing mental fatigue in football: a systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC13286965/)** (2026): 28 studies, lack of standard monitoring, varying effects across technical, tactical and attentional measures. 'Football' in this paper means association football.
- **[Exploring a Mental Fatigue Signal Hidden in GPS Data](https://pubmed.ncbi.nlm.nih.gov/42506804/)** (2026): professional soccer player-match observations with pre/post slowing and poorer psychomotor precision; weak associations with acceleration events.
- **[Mental fatigue and soccer technical performance: meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC9354787/)** (2022): impairment not uniform by task; tackle success and errors show effects, while some passing variables do not.

**For our sim:** Hypothesize that cognition affects the *decision process* (elapsed time to confirm a key, maintaining assignment under disguise, misidentifying a leverage cue, anticipating a throw, hot read) rather than converting fatigue into universally worse 'awareness'. A healthy high-load QB might maintain accuracy on routine throws while needing extra time to resolve ambiguous protection or late rotation. This is a proposed mechanism requiring specific football validation; the literature does not demonstrate that every QB becomes poor at reading coverages in Q4.

---

## 9. A position-by-position fatigue and substitution matrix

| Role | Highest measured/credible workload | Where to **hypothesize** a performance cost | Rest/rotation caveat |
|---|---|---|---|
| EDGE | 4–6 s burst + hand-fight + high-force finish, repeated | Later move onset, lower repeat burst, late shed recovery, diminished closing surge | Coaches rotate for high-quality late rushes; matchup and starter skill matter |
| DT | Forceful collision, sustained leverage, double teams, repeat surges | Hip/pad recovery, re-anchor strength, shed continuation, high-output burst | Frequent substitution; high sensor-impact exposure |
| OT/OG/C | Nearly every offensive snap; push/pull/isometric and short footwork | Anchor under repeated loads, re-steps, punch maintenance, combo finish | Rare substitution; group communication and backup quality often outweigh small benefit of rest |
| WR | High-velocity running and acceleration; coverage-fighting releases | Later sustained high-speed leg, repeat vertical acceleration, cutting precision | Substitutions, route effort, real tempo and receiver usage are large confounders |
| CB/S | High-speed chase, braking/reversal, reactive acceleration | Break/close quality and repeat effort after deep routes, footwork on transition | May remain on field nearly all snaps; not every shell requires maximum pursuit |
| LB/NB | Frequent high-velocity efforts, short burst, contact, reaction | Recovery/reposition, tackling geometry, zone-to-pursuit transition | Role/coverage alignment matters greatly |
| RB | High-impact collisions, acceleration and pass pro | Re-acceleration through contact, lateral cuts, pass block anchor after hits | Rotations common; carrying volume different from pass protection |
| TE | Hybrid: stalk/drive blocking + routes + contact | Repeated block finish and route burst | Varies by package |
| QB | Short burst/throwing, intermittent hits, high cognitive demand | Throwing under pressure when actively exhausted, reaction/decision process | QB typically plays most snaps; mental-fatigue football-specific numerical evidence sparse |
| K/P | Very low game work; high skill-specific readiness | Reduced warm-up readiness rather than classic cumulative fatigue | Warmup and situational routine more important than snap count |

**Status of this table:** The workload columns are supported qualitatively by direct tracking and interviews. The 'performance cost' column lists **engineering hypotheses**, not established within-game effect estimates. Implement as A/B-experiments and only promote terms after tracking or controlled mechanics evidence.

---

## 10. Audit of the simulation as of November 13, 2026

Repository: [tannerthardy/football-simulation-](https://github.com/tannerthardy/football-simulation-), `develop` head observed `d90dcb96d4dcfa6bd4505c36a8b60a6efb7daa0c` during this research. Inspect the current code again before modifying it; source hashes may advance.

**Already implemented:**

- [src/physics/kinematics.ts](https://github.com/tannerthardy/football-simulation-/blob/develop/src/physics/kinematics.ts): `Body.energy` (0–1), `sprintLoad`, `fatigueFactor` with `FATIGUE_MAX_LOSS = 0.3`, `FATIGUE_SHAPE = 2.5`; `enduranceFactor` begins fading after ~3.5 s near top speed and can reduce it up to 10%; `spendEnergy` charges mechanical work, speed and isometric work. `FAST_DRAIN = 3` was observed in file (not a biological constant).
- [src/game/game.ts](https://github.com/tannerthardy/football-simulation-/blob/develop/src/game/game.ts): `energy` fast pool and `reserve` slow ceiling; `RESERVE_SHARE = 0.01`, halftime reserve refill = 0.5, per-player `fastRefillRate = 0.006 + 0.010 * staminaNormalized` per second; between-snap accounting avoids giving rest credit for a snap someone worked; no-huddle shorter rests; reserve replenishment at long breaks.
- [src/league/team.ts](https://github.com/tannerthardy/football-simulation-/blob/develop/src/league/team.ts): staff tracks recent `workload`, fading off field; rotation penalty by position (`DT=20`, `EDGE=12`, `RB=12`, `TE=5`, `WR=2`, `LB=1.5`, `CB=1`, `S=1.5`) and substitution-cost penalty to avoid unrealistic one-snap swaps. Staff observes workload, not hidden body energy. The current priority of DL/RB rotation is directionally consistent with coaching practice.
- [src/sim/engagement.ts](https://github.com/tannerthardy/football-simulation-/blob/develop/src/sim/engagement.ts): pad level and hand leverage are modified by body energy in some engagement paths; long reps can accumulate wear.
- [src/sim/behaviors/qb.ts](https://github.com/tannerthardy/football-simulation-/blob/develop/src/sim/behaviors/qb.ts): QB throw dispersion includes a factor `1 + 0.25 * (1 - body.energy)` alongside urgency/movement.

**Potential risks to audit, not proven bugs:**

1. **Single energy factor for unlike tasks:** `fatigueFactor` can affect speed and acceleration simultaneously. Need compare burst, maintenance, braking, angular changes and contact separately. Don't impose the full 30% extreme loss on all capacities if not observable in NFL.
2. **Effective repeated sprint factor:** `sprintLoad` accrues while speed >85% vmax and bleeds slowly below 70%; test its reset and behavior over successive snaps. Confirm no unrealistic preservation or decay.
3. **Energy-work accounting:** Does `spendEnergy` undercharge heavy blockers when stationary, overcharge jogging, or double count forces transferred through contact? Test delivered mechanical work vs requested effort and local muscle load.
4. **Slow reserve:** `RESERVE_SHARE=0.01` may be too small or too large; no NFL data directly calibrates it. Need independent task-level outcomes and careful sensitivity testing.
5. **Heat/thermal load:** No separate temperature state identified in the inspected files. Unless another module handles it, heat seems to be a missing independent fatigue pathway.
6. **Warm-up/readiness:** A bench player may have full fast/slow pools but be insufficiently warmed up, as the Newton pilot warns. Distinguish metabolic recovery from activation/readiness.
7. **Cognition:** QB dispersion responds to energy, but fatigue effects on attention/recognition are not established from inspected snippets. Avoid making these global until tested.
8. **Rotation economics:** The design correctly avoids raw hidden-energy reads by the coach, but per-position weights and recent-snap memory are heuristic; validate substituting strategically vs one-play shuffling and against observed NFL play shares.

---

## 11. Recommended implementation architecture: tasks, time scales, and effort

**Preserve the current engine and evolve the mechanisms in stages.** A practical state per player might include:

```
fastReserve       # depleted by high-power output; recovers between snaps
slowReserve       # longer-duration ability to recreate bursts; recovers during major breaks/days
localStrain[]     # optional task-linked burden: push/anchor, decelerate/cut, sprint, contact
heatStrain        # relevant in hot environments; not a proxy for sweat volume
readiness         # warm-up/activation, can fall while sitting cold
cognitiveLoad     # optional; task-related demand, not a universal 'awareness' debuff
```

Avoid exposing these authoritative physiological states to an AI coach. Coaches observe repetitions, pace, subjective signals, snaps, time off field and possibly instrumented sideline estimates.

**Candidate mathematical form (engineering proposal, not scientific coefficients):**

```
fast(t+dt) = clamp( fast(t) - cost_delivered_work(task, dt)
                    + k_fast * (ceiling - fast) * dt, 0, ceiling )
slow(t+dt) = clamp( slow(t) - k_slow * weighted_intense_exposure, 0, 1 )
local_strain_i(t+dt) = decay_i(local_strain_i, rest, cooling) + load_i(task)

available_capability(task) = base_capability(task) * taskResponse(
    fast, slow, local_strain_i, heat, readiness, injury
)

actual_action = controller_choice(available_capability, tactical_need, perceived_world)
```

Physical fatigue should affect **the body and the time required to complete an action** before altering the action's outcome. For example a tired defender who decides to drive on a throw might plant later, reach lower speed, or fail to sustain his angle; don't roll an unrelated 'fatigue missed tackle' Bernoulli outcome if physical mechanics already determine contact.

### Preserve important nonlinearities

- Fast energy can recover sharply between snaps with a big jump from 15 to 45 sec.
- Hard repetitions cause carryover despite small intervals; pacing and moderate-effort plays spare energy.
- Long, quiet breaks improve fast reserve but can lower warm-up readiness for certain roles.
- Repeated collisions may reduce technique or recovery ability independently of sprint speed.
- Backup skill, game plan and matchup can dominate a small fatigue advantage.
- A player can perform a heroic high effort late in a game by expending remaining reserve, without having magically recovered.

---

## 12. Tests and calibration—don't fit from EPA first

### Test suite A: standardized isolated effort

1. **Single 5-s max acceleration** from rest, body unloaded. Compare fresh vs after repeated 5-s/25-s bursts; capture 0–5yd, 5–10yd, vmax, achieved force, energy. Do not assert direct NFL decrement until data exists.
2. **Ten 5-s pass-rush efforts 25 s apart** vs identical blocker; hold alignment, hand skill, pressure caller and seeds fixed. Separate capability from alternative rush-move selection. Test fast-pool recovery and the margin between early and late reps.
3. **Ten 5-s pass-rush efforts 15 s apart** (hurry); isolate tempo without changing defensive scheme.
4. **Ten 5-s pass-rush efforts 45 s apart** (normal/slow play); test separation of work/rest pattern.
5. **Long 14-play drive with contact burden varied**: identical durations, but low/high blocking force and pursuit. Game-clock snap count alone should not fully explain measured fatigue.
6. **60-second sideline reset versus a 10-minute absence**; assert that fast pool recovers, slow pool may not, and warm-up readiness can be independent.
7. **Halftime re-entry**: do not assume all physiological components return to baseline; first-step readiness must be measured separately.

### Test suite B: football behavior

1. EDGE burst, club and re-rush timing, and pocket closing after 2, 5, 10 successive rushes.
2. OT/OG anchor loss and re-step time after repeated loaded engagements, keeping incoming defender strength constant.
3. CB first 0.5-s break acceleration and ability to recover after a 35-yard chase; check if phase-aware ball tracking is preserved.
4. RB cut and second acceleration after several high-contact carries, with identical initial field geometry.
5. QB forced throw under genuine physical pressure, separating actual release mechanics from rating-based dispersion.
6. Same player under neutral/cool/hot conditions with thermal factor but constant field speed; prioritize safe empirical validation.

### Test suite C: game-scale falsification

- Compare league outcomes with fatigue ON/OFF at **the same lineup policies**, and then with endogenous staff substitutions.
- Match actual role distributions (OL near-all snaps; many DL roughly partial rotations; CB high share; RB/WR variable). These are broad qualitative targets, not position-specific fixed quotas.
- Regress success/pressure on `player_id`, play role, opponent, time since prior play, number of consecutive high-effort snaps, and task intensity—do not treat clock or number of plays alone as physiology.
- Check that a 10+ play drive does not generate an implausible automatic touchdown or a systematic 4Q loss in defensive EPA beyond the ambiguous real-world evidence.
- Test **no-huddle preventing substitution** separately from a physiological penalty. Both can matter, and they are not the same causal mechanism.
- Include 'negative controls': a bench defender entering after a full quarter but with inadequate warm-up; an OL on 50 low-contact pass plays; an EDGE on 25 extremely heavy rushes; same snap count, different burden.
- Do not set a fatigue multiplier just to pull late scoring or run YPC down; it can hide a coverage or physical-model problem.

### Recommended outcomes to log per snap

- `time_since_last_effort`, `time_since_last_snap`, `consecutive_snaps`, `max_effort_exposure_last_2min`, `engagement_impulse`, `sustained_contact_seconds`, `eccentric_braking`, `sprint_distance`, `pursuit_distance`, `high_urgency_pressure`, `heat_estimate`, `warmup_readiness`, `substitution_reason`.
- Compare pre- and post-exposure *standardized ability* to a matched fresh control; a lower observed running speed on a given play is not sufficient evidence of fatigue.
- Keep raw 'physics available' distinct from 'coaching intent' and 'what actually happened'.

---

## 13. Ranked reading list (no videos)

### Tier A — essential direct football evidence

1. Sanchez et al. (2023), NFL 768-game NGS demands — https://www.mdpi.com/2076-3417/13/16/9278
2. NCAA games GPS positional demands (2019) — https://pubmed.ncbi.nlm.nih.gov/30908375/
3. NCAA accelerometer game impacts (2016) — https://pubmed.ncbi.nlm.nih.gov/27227790/
4. American football play/rest observation (2006) — https://pubmed.ncbi.nlm.nih.gov/16503692/
5. NFL simulated practice OL metabolic/thermal costs (2007) — https://pubmed.ncbi.nlm.nih.gov/17685718/
6. NFL linemen and backs sweat study (2008) — https://pmc.ncbi.nlm.nih.gov/articles/PMC2267333/
7. Collegiate force/power during game (2002) — https://orthoarchives.com/en/orthoscience/article/changes-in-maximal-power-and-force-over-the-course-of-a-competitive-collegiate-oarc-a0010804465
8. D1-A recovery wellness trajectory (2017) — https://pubmed.ncbi.nlm.nih.gov/27967293/
9. D1 football rebound-jump monitoring (2026) — https://pubmed.ncbi.nlm.nih.gov/41665606/
10. D1 football biomarkers after scrimmage (2026) — https://pmc.ncbi.nlm.nih.gov/articles/PMC13073919/

### Tier B — firsthand NFL coaches and players

11. Jets Saleh and Ulbrich on rotation — https://www.newyorkjets.com/news/robert-saleh-on-the-math-that-leads-to-a-killer-defensive-line-rotation
12. Packers Hafley/Clark/Enagbare — https://www.si.com/nfl/packers/onsi/packers-deeper-defensive-line-rotation-provides-relentless-pressure-01jb0x85xejd
13. 49ers Chris Foerster (written interview transcript) — https://49ers.1rmg.com/transcripts/offensive-line-run-game-coordinator-chris-foerster-press-conference-8-8-24/
14. Eagles Jordan Davis — https://www.inquirer.com/eagles/jordan-davis-every-down-player-diet-conditioning-jt-alphabet-clint-hurtt-20250926.html
15. Giants Nick Gates — https://www.giants.com/news/brian-daboll-leonard-williams-nick-gates
16. Browns Joel Bitonio — https://sports.yahoo.com/article/cleveland-browns-guard-joel-bitonio-210257688.html
17. Bengals Jonathan Allen — https://www.bengals.com/news/quick-hits-al-golden-jonathan-allen-dexter-lawrence-boye-mafe-age-of-rotation-for-bengals-d-line
18. NFL.com 2026 playing-time projection / rushers — https://www.nfl.com/news/five-ways-mike-mccarthy-and-a-new-coaching-staff-changed-the-steelers-in-week-1
19. Kyle Long written transcript (audio source, no video required) — https://podscripts.co/podcasts/pardon-my-take/kyle-long-in-studio-1-question-with-blake-bortles-cfb-talk-bring-your-lunchpail-with-jersey-jerry

### Tier C — recovery and metabolism

20. PCr single vs repeated 6s sprint biopsy (1997) — https://pubmed.ncbi.nlm.nih.gov/9241025/
21. PCr and aerobic metabolism repeated sprint (1996) — https://pubmed.ncbi.nlm.nih.gov/8964751/
22. Intermittent sports exercise testing review — https://doi.org/10.1249/MSS.0000000000003442
23. Contact-football codes muscle damage meta-analysis (2018) — https://pubmed.ncbi.nlm.nih.gov/29870313/
24. Football season overreaching/recovery roles (2026) — https://pmc.ncbi.nlm.nih.gov/articles/PMC13433165/
25. Football camp-to-season endocrine/CK adaptation (2005) — https://pubmed.ncbi.nlm.nih.gov/16015144/
26. Football cortisol/redox/subjective wellness (2021) — https://pubmed.ncbi.nlm.nih.gov/34051699/

### Tier D — thermal, cramps and cognition

27. American football thermal review — https://pubmed.ncbi.nlm.nih.gov/27071988/
28. NFL sweat sodium group profiles — https://pubmed.ncbi.nlm.nih.gov/20617911/
29. Collegiate lineman sweat study at normalized heat — https://pubmed.ncbi.nlm.nih.gov/21796051/
30. Football players vs runners sweating in heat — https://pmc.ncbi.nlm.nih.gov/articles/PMC1725187/
31. Sweat rate across 1,303 athletes — https://pubmed.ncbi.nlm.nih.gov/31230518/
32. 2022 cramp evidence review — https://pmc.ncbi.nlm.nih.gov/articles/PMC8775277/
33. 2026 cramp risk meta-analysis — https://pmc.ncbi.nlm.nih.gov/articles/PMC13644889/
34. 2026 sport mental fatigue meta-analysis — https://pmc.ncbi.nlm.nih.gov/articles/PMC13418146/
35. 2026 soccer mental-fatigue assessment review — https://pmc.ncbi.nlm.nih.gov/articles/PMC13286965/
36. 2016 soccer decision fatigue experiment — https://pubmed.ncbi.nlm.nih.gov/26949830/
37. 2022 soccer technical skills mental fatigue meta-analysis — https://pmc.ncbi.nlm.nih.gov/articles/PMC9354787/
38. 2026 professional soccer psychomotor fatigue — https://pubmed.ncbi.nlm.nih.gov/42506804/
39. 2026 team fatigue study with controls (unreviewed analytic report) — https://edgedesksports.com/research/environment/defensive-fatigue/

### Interpretive hierarchy

- **Strongest for football workload:** NFL NGS movement, NCAA impact sensors, repeated primary player/coach interviews for qualitative mechanisms.
- **Strongest for physical recovery:** controlled sprint/biopsy physiology, football postgame jump/recovery measures.
- **Weak or missing:** in-game within-player causal relationship between accumulated force and pass-rush win probability; realistic OL anchor decrement per consecutive rep; standardized league fatigue-by-quarter curve; direct NFL QB late-game cognitive error due to mental fatigue.
- **Do not confuse:** evidence that rotation is common with evidence of a particular physiologic rate, evidence of harder work with evidence of worse output, or a time-dependent change in scoring with fatigue causation.

---

## Final implementation recommendation

For the next engineering pass, prioritize **measuring and validating the existing fast-reserve and contact-work model**, not bolting on a fourth-quarter debuff. Add task-level logging and separate observed exertion from exertion capacity. Introduce local strain and environmental heat only when a concrete test can distinguish them from the two existing reserves. Treat tactical rotation as part of the causal pathway rather than fixing playing time externally. Then run matched, controlled series where an agent can demonstrate that the *mechanism* of a failed reach, pass-rush finish or anchor changed due to load.

The best single paired sources are **Sanchez et al. NFL movement study** (what different bodies do), **NCAA accelerometer impact study** (what running data misses), **PCr repeated sprint paper** (why tempo matters), **Foerster and Saleh firsthand comments** (why game conditioning and rotation matter), and the **EdgeDesk null-result analysis** (why not to force an implausible automatic team-level collapse).
