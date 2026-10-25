# Coverage and pressure terminology: per-player specifications

Research notes for the simulation engine, written 2026-10-08 from web sources (listed at the
end). Reference material, not project instructions; claims marked "(snippet)" rest on search
snippets only. The engine's use of it is recorded in docs/reviews/coverage-engine-and-playbook-depth.md.

**How to read this file**

- It adds to the user-supplied textbook (`docs/references/football_coverage_mechanics_textbook.pdf`,
  text dump `out/refs/coverage.txt`). The textbook explains *why* (ch. 5 Cover 0/1, ch. 6 Cover 2 /
  Tampa / 2-Man, ch. 7 Cover 3 and Rip/Liz, ch. 8 Quarters and MOD/MEG, ch. 9 Palms/2-Read/Clamp,
  ch. 10 Cover 7, ch. 11 Cover 6/8, ch. 12 trips checks, ch. 13 empty/bunch/motion, ch. 15 LB
  coverage, ch. 17 fronts and pressure). It deliberately gives no yard depths or trigger
  thresholds ("vary by installation"). This file supplies concrete depths, triggers, handoff
  points, system-specific call names, and NFL frequencies, with the source for each.
- Citations are inline links such as [Soran][soran]. The full index of URLs is at the end.
  "(snippet)" means the page refused direct access (HTTP 403 or paywall) and the claim comes
  only from a search-engine summary. Treat those as weaker.
- Where coaching sources contradict each other, a **Sources disagree** note says so. Most
  names are local to one coaching tree. The engine should store the *rule*, not the name.
- Repo-derived frequencies come from `out/nfl-ref/defense-calls.json` (produced by
  `scripts/data/bdb2025_defense_calls.py`, Big Data Bowl 2025 = NFL 2022 weeks 1–9, PFF
  charting labels, 9,713 dropbacks) and the committed `data/bdb2026-summary.json` (2023
  season pass plays). These are labelled [repo BDB2025] and [repo BDB2026].

**Access limits.** The WebFetch tool failed DNS in this sandbox, so pages were fetched with
`curl` and converted to text. MatchQuarters (Cody Alexander) posts are paywalled after a
free preview, so many of his exact rules were not visible. X&O Labs, Steelers Depot and
MGoBlog returned 403. Ted Nguyen (The Athletic), Seth Galina and Brett Kollmann material
was not reached (paywall or video); none of the claims below depend on them.

---

## 0. Conventions and shared trigger definitions

### 0.1 Landmarks (parameterise these)

| Item | Value | Source |
|---|---|---|
| NFL hash marks | 70 ft 9 in (23.6 yd) from each sideline, 18 ft 6 in (6.2 yd) apart | [Wikipedia field][wikifield] |
| Saban "position maintenance" line | 1 yd inside the top of the numbers = 10 yd from the sideline (implies top of numbers ≈ 9 yd in from the sideline on the field he describes). NFL numerals may sit ~1 yd differently; make it a parameter | [Soran][soran] |
| Rip/Liz "divider" (5/1/bottom) | Ball on the far hash: 5 yd inside the top of the numbers. Ball in the middle (between the goal posts): 1 yd inside the top of the numbers. Ball on the near hash: bottom of the numbers. Receiver inside the divider = has middle-safety help, so play outside/trail. Outside it = no help, so play inside and on top | [USA Football Rip/Liz][usa-ripliz] |
| "No-cover zone" | Area within 5 yd of the LOS (Saban glossary) | [MQ glossary][mq-gloss] |
| Hook area (Aranda/Roberts) | Over a typical TE alignment, 9–15 yd deep, from the TE to the OT | [MQ glossary][mq-gloss] |
| Curl / Out areas (Aranda/Roberts) | 8–15 yd deep, curl inside any WR and out area outside the WR to the sideline | [MQ glossary][mq-gloss] |
| Poach area | 10–14 yd deep, from the hash to the midpoint (Gregg Williams) | [MQ glossary][mq-gloss] |

### 0.2 Receiver numbering and strength

- Count eligibles outside-in on each side (#1 is widest). The back is #3 to his side in 2x2,
  or #4 when trips is to the other side. Track the *final* #3 after motion and releases (see
  textbook §7.2 and §13.5).
- **Passing strength** is the side with more or better eligibles, ranked WR > TE > RB. The nickel
  "almost always" aligns to it, so the nickel's side is the quickest tell
  ([Sumer week 1][sumer1], [Syed][syed]). Fangio sets the secondary by passing strength, not
  field/boundary, because NFL hashes leave nearly equal width to each side ([Syed][syed]).

### 0.3 Route-release triggers used throughout

| Trigger | Definition in the sources | Source |
|---|---|---|
| **Under** (#1 or #2) | Breaks inside and short within the first 5 yd. The defender calls "Under!" and zones off | [Soran][soran] |
| Under, step-count version | The corner counts his own steps: three steps without a move to the shallow means the receiver is vertical and he mans him up. Counting steps rather than receiver yards removes grey areas | [USA Football Cover 7 pt 1][usa-c7a] |
| **#2 in the seam** | The overhang uses a "scootch" (square shuffle back). If #2 is still vertical after 3 scootch steps, he is in the seam and the overhang matches him | [USA Football Rip/Liz][usa-ripliz] |
| **OVO** | Vertical means "over the overhang" (MatchQuarters' zone-match Cover 2 definition) | [MQ Unlocking][mq-unlock] |
| **#2 out** (trap trigger) | #2 breaks out within the first 5 yd: the Clamp/Palms corner takes him | [Soran][soran] |
| Quarters safety's #2-vertical handoff | Safety takes #2 vertical past 12 yd (Bowen) | [Bowen Cover 4][bowen-c4] |
| **Fist** check (Saban glossary) | The inside DB will not carry #2 vertically past 12 yd | [MQ glossary][mq-gloss] |
| **Fast 3** | #3 (usually the back) goes directly to the flat at the snap (arrow, swing). It triggers "push" or "sail" rules | [USA Rip/Liz][usa-ripliz], [USA Cover 7 pt 1][usa-c7a] |
| **Smash call** | #1 runs a hitch while #2 continues vertical. The corner bails under #2's corner route and the apex takes the hitch | [Soran][soran] |

**Sources disagree on the #2-vertical depth.** [Bowen][bowen-c4] (a former NFL safety) says
the Cover 4 safety plays #2 vertical past 12 yd. A Substack explainer [Nate][nate] says the
quarters safety takes #2 man "if he runs past 8 yards". Use 8–12 yd as a parameter range. The
textbook (§8.3) leaves it unspecified.

**MOD has three expansions.** "Man On Deep" (textbook §8.2); "Man Only Deep (don't cover routes
under 5 yards)" (Fangio glossary); "Man on Demand" (Saban glossary entry), all in
[MQ glossary][mq-gloss]. The rule is the same in all three: the corner is man on #1 only if #1
declares vertical or deep, typically beyond 5 yd or 3 corner steps.

### 0.4 NFL frequency baseline

| Coverage (PFF label) | 2022 wk 1–9, share of dropbacks [repo BDB2025] | 2023, share of pass plays [repo BDB2026] | Later published figures |
|---|---|---|---|
| Cover 3 family (Cover-3 + Seam + Cloud L/R + Double Cloud) | 31.8% (Cover-3 26.0, **Cover-3 Seam 5.3**, Cloud ≈0.5) | 31.5% | ≈28% of all snaps in 2025 (FTN, cited by [MQ Rams][mq-rams2]). "Primary coverage is still Cover 3 (35%)" ([MQ Cover 9][mq-c9]): the denominators differ |
| Cover 1 (+ Cover-1 Double) | 21.2% (Double 0.5) | 22.8% | Cover 1 + Cover 3 = 52% of 2025 calls (FTN via [MQ Rams][mq-rams2]) |
| Cover 2 (includes Tampa and non-traditional Tampa) | 14.0% | 14.0% | 14.8% in 2024 ([MQ Eagles][mq-eagles4]); 9% in 2026 week 1 (PFF via [MQ Macdonald][mq-mac6]) |
| Quarters | 13.1% | 15.9% (COVER_4) | 14% in 2024 ([MQ Eagles][mq-eagles4]); 15% in 2025 ([MQ Cover 8][mq-c8]); 17.5% in 2026 week 1 ([MQ Macdonald][mq-mac6]) |
| Cover 6 (Left 4.8 + Right 4.8) | 9.6% | 9.4% | 2025: ~6% (FTN) or ~9% (PFF); 14.4% in 2026 week 1 ([MQ Macdonald][mq-mac6]) |
| Cover 0 | 3.6% | 4.3% | — |
| Red Zone / Goal Line | 3.6% | — | — |
| 2-Man | 1.8% | 1.8% | — |
| Bracket | 0.74% | — | — |
| Man / zone | 26.6% man, 68.4% zone | 29.0% man | 22.6% man in 2025, down from more than a third seven seasons earlier (PFF, snippet: [PFF trends][pff-trends]) |

Shell context: the league was in a pre-snap open (two-high) shell on 57.5% of 2025 snaps.
Static two-high coverages (36.5%) outnumbered static single-high (33%). About 30% of snaps
were disguised, and fewer than 10% were closed-to-open ([MQ Cover 9][mq-c9],
[MQ Rams][mq-rams2]). Split-field coverage was 43% of 2025 snaps by FTN's count and 36% by
PFF's ([MQ Macdonald][mq-mac6]).

---

## 1. Cover 2 Match, stock Cover 2, Tampa 2, and 2-Man

### 1.1 What separates them

| Call | Deep | Underneath | Key difference |
|---|---|---|---|
| Stock (spot) Cover 2 | 2 safeties in halves | 5 zone: two flat corners and three hook/curl players | Territorial. Defenders drop to areas and read the QB ([Nate][nate], [MQ Unlocking][mq-unlock]) |
| Tampa 2 | 2 halves plus a Mike "pole runner" in the deep middle, so it plays like three deep | 4 zone | The Mike opens to the strong side and runs with any inside vertical by #2 ([Bowen Tampa 2][bowen-t2]) |
| Cover 2 Match (zone-match: "Cloud", "Palms", Saban "Cut") | 2 halves, each reading 2-to-1 | Corner, overhang and safety match #1/#2 by release | Who takes #2 vertical and who takes the flat is decided by the releases (tables below) |
| Hard "Trap" Cover 2 | 2 halves; the safety works to the midpoint of #1 and #2 | The corner steps to the slot and takes anything out | Aggressive flat trap ([MQ Unlocking][mq-unlock]); see §3 |
| 2-Man (Saban "Cover 5", Fangio "Fist/Pounder/Finger") | 2 halves | 5 man defenders in inside trail | Man underneath. The safeties are pure QB readers who cap verticals ([Bowen 2-Man][bowen-2m], [Soran][soran], [BGN pt 2][bgn2]) |

**Sources disagree on what "Cover 2 Match" is.** MatchQuarters calls zone-match Cover 2
"Cloud or Palms": the corner and safety play man-match while the overhang is a zone "Wall-2"
player ([MQ Unlocking][mq-unlock]). Saban's pattern-match Cover 2 is called **Cut**, and it
reverses the roles. The *corner* takes first-to-flat and the *apex* carries #2 vertical
([Soran][soran]). MatchQuarters' Cover 2 episode files Palms/2-Read under the *Quarters*
family ([MQ Cover 2][mq-c2]), while Steelers Depot (snippet, 403) equates "2 Trap" with Palms.
PFF has no match label and charts all of these as "Cover-2". The engine needs
two distinct match variants: **Cut-style** (the corner squats) and **Cloud/Palms-style** (the
corner reads #2).

### 1.2 Stock Cover 2 and Tampa 2: alignment and drops (Bowen, 4-3 base vs 21 personnel)

| Player | Pre-snap | Post-snap rule | Source |
|---|---|---|---|
| Corners | Press or about 5 yd off. Force an **inside** release by #1 | Jam and reroute #1 inside. Drop to **12 yd** with zone technique (back to the sideline) to protect the 7 (corner) route. Rally to any flat throw. Against an inside release, sink at 45° | [Bowen Tampa 2][bowen-t2], [Bowen C2 safety][bowen-c2s], [Ilkin][ilkin] |
| Safeties | **12–14 yd deep, 3–4 yd outside the hash**, same landmarks wherever the ball is | Read #1's release (run/pass key). Drop to **15–18 yd at the top of the numbers**. Protect the 9 (fade) and react to inside verticals. Against two verticals, gain depth and break on the throw. If #1 releases outside, widen off the landmark; that is when the hole shot opens. If #1 has not broken by 12–15 yd, play the fade | [Glazier clinic][glaz-c2s], [Bowen Tampa 2][bowen-t2], [Bowen C2 safety][bowen-c2s] |
| Sam / Will (hook) | Normal LB depth | Read run/pass. Drop to the hook, **10–12 yd between the numbers and the hash**. Slide with the QB's eyes | [Bowen Tampa 2][bowen-t2] |
| Mike: stock Cover 2 | — | Middle hook at 10–12 yd (stock 5-under) | [Nate][nate] |
| Mike: **Tampa 2** | — | Open to the strong side. **Run with any inside vertical by #2**. With no vertical by #2, drop to **15 yd** and react to underneath throws. Gets safety help only at the throw. Some sources say 15–20 yd; one older explainer says ~11 yd (snippet) | [Bowen Tampa 2][bowen-t2] |
| Front | 4-man rush. Bowen's example uses a TEX stunt (T-E game) | Contain rush | [Bowen Tampa 2][bowen-t2] |

Weak spots: the **hole shot** between a sinking corner and the half safety near the sideline,
about **10–12 yd** deep ([Owen trap][owen-trap]). The **Flat-7** (corner-flat) combination is
"the top Cover 2 beater in the NFL" ([Bowen C2 safety][bowen-c2s]). Four verticals splits the
safeties. If the corner fails to force #1 inside, the safety widens off his landmark
([Bowen Tampa 2][bowen-t2]).

**Non-traditional Tampa (NTT).** Modern versions replace the Mike pole-runner with a DB (a safety
or nickel) and reach it from varied pre-snap contours: closed-to-open or open-to-open rotation
([MQ Tampa][mq-tampa], [MQ NTT][mq-ntt]). Two examples: the Bills' "Cover 2 hole" puts the
weak safety in the middle hole at **18 yd**. The Lions' version drops the free safety to the
hole while two safeties aligned at 6 yd in the curl become the deep-half players
([Kou trips][kou-trips]). MatchQuarters attributes the 2024 rise of Cover 2 to NTTs on passing
downs ([MQ Eagles][mq-eagles4]).

Repo data: PFF assigns about 0.92 middle **HOL** (hole) players per Cover-2 dropback: about
0.78 LBs and 0.14 safeties. That puts DB-as-middle-player (NTT-like) snaps at roughly a seventh
of Cover-2. PFF does not separate Tampa-depth running from a 10-yard hook. The most common role
set is `2L 2R FL FR HCL HCR HOL RUSHx4` (77%) [repo BDB2025].

### 1.3 Cover 2 Match: Saban "Cut" (pattern-match Cover 2), per player

| Player | Alignment | Rule | Source |
|---|---|---|---|
| Corner | Off (soft). In Bartee's Cover 7 version: "flat defender aligned 4–5 yd inside #1" | **First man to the flat**: #1 if he runs a ≤5-yd hitch, #2 if he runs out or bubble, #3 if the RB swings. Reroute #1 inside-out, inside foot first. If nobody shows in the flat, take #1 through (for example on a sneak) | [Soran][soran], [USA Cover 7 pt 2][usa-c7b] |
| Apex (Will / Money / nickel) | Over #2 | If #3 releases to his side: **man on #2 for everything**. Otherwise: man on #2 (up and in, inside trail), **except #2 out to the flat, then cut (rob) #1**. Plays like a safety robber technique, but from the bottom up | [Soran][soran], [USA Cover 7 pt 2][usa-c7b] |
| Half safety | 2-high | **Take all of #1 vertical. If #1 is not vertical, bracket #2.** Read 2-to-1, gain width, midpoint #1 and #2 (outside-in on #2), and favour #1 when both are vertical, since nobody else matches #1 | [Soran][soran], [USA Cover 7 pt 2][usa-c7b] |
| Mike | Box | Against a Fast 3, he cuts the original #1. If #1 runs a climbing over route across the formation, the half safety mans him across and the corner becomes the new half player | [USA Cover 7 pt 2][usa-c7b] |

Corner alerts inside Cut ([Soran][soran]):

- **Alert Smash:** #1 hitch with #2 vertical. The corner bails under #2's corner route and the
  apex takes the hitch.
- **Push Alert:** #1 in a minus (compressed) split with no near offset back. The apex takes
  all of #1 under.
- **Tokyo:** #1 in a plus (wide) split with no near offset back. The corner takes all of #1
  under.
- **Leach:** play Cut to the two-receiver side (by default Saban plays Cut to the TE/flanker
  side).

### 1.4 Cover 2 Match: zone-match "Cloud/Palms" and hard "Trap" (MatchQuarters)

| Variant | Corner | Safety | Overhang ("Wall-2") |
|---|---|---|---|
| Zone-match Cover 2 (Cloud/Palms) | Takes #2 **only if #2 breaks out**. If #1 and #2 are both vertical, the corner and safety carry them man-to-man | Carries #2 vertical, or #1 if the corner takes the out | Zone player. **Carries #2 vertical and does not push to the flat unless #3 is to his side** |
| Hard Trap | Steps aggressively toward the slot and takes **anything out** | Works **immediately to the midpoint of #1 and #2** | Wall-2, carrying #2's vertical. The corner and overhang play **trail** technique, forcing throws deep to the safety |

Source: [MQ Unlocking][mq-unlock]. Fangio's Cover 2-side corner techniques
([MQ Zeus][mq-zeus]):

- **Smash:** the corner aligns *inside* and reroutes #1 until someone threatens his flat.
- **Squat:** the corner reroutes #1 from an *outside* alignment. Squat is the base technique in
  Stuff and Cover 8.
- **Patty:** a call telling the LB he has the RB to the flat.

### 1.5 2-Man (two-high man): per player

| Player | Rule | Source |
|---|---|---|
| Underneath man defenders (5 in nickel/dime) | **Inside trail-man**, on the receiver's inside hip ("Dog" technique: trail any vertical because help is over the top). Takes away slants and digs | [Bowen 2-Man][bowen-2m], [Soran][soran] |
| Safeties | Deep halves on Cover 2 landmarks. Pure QB readers who break downhill | [Bowen 2-Man][bowen-2m] |
| Fangio safety techniques | **Fist**: both safeties read outside-in, so the corners play inside leverage. **Pounder**: safeties read inside-out with quarters "2-1" reads and the man defenders shade outside; better against crossers. **Finger**: one side Fist, the other Pounder (notes put Fist to the nickel side) | [BGN pt 2][bgn2], [MMM Ring][mmm-ring] |
| LB on the RB (Belichick) | "No blitz engage": if the RB stays in, the LB becomes a middle hole player instead of green-dogging | [Kou Patriots][kou-pats] |
| Saban variants | **5 Cougar**: if #2 is out in the first 5 yd, the corner takes him and the apex cuts #1. The corner man-turns on a vertical #1 while eyeing #2 (a Palms trap inside 2-Man). **55**: each safety brackets the most dangerous receiver on his side | [Soran][soran] |
| Ravens "Choke" | Man with trail technique and two deep safeties over the top | [MQ glossary][mq-gloss] |

Beaters: the middle of the field. Outside releases by #1 widen both safeties, then an inside
seam or post splits them (the "Middle Read" concept) ([Bowen 2-Man][bowen-2m]). Also QB runs,
since there is no free safety to fit (textbook §6.3).

### 1.6 Formation checks (two-high match family)

- **3x1:** Cut becomes **Clip** (Saban) ([Soran][soran]):
  - Strong corner: first to the flat.
  - Strong apex: man on #2 unless #2 goes out with no #3 to the flat, then rob #1.
  - Hook: man on #3 unless #3 goes to the flat (then curl) or runs a deep cross (then carry to
    the weak safety).
  - Strong safety: all of #1 vertical, else bracket #2.
  - Weak safety: **poach #3 vertical**, else poach backside #1 vertical.
  - Weak corner: MEG on #1.
- **Tampa against 3x1:** "Mike is walling #3 to #2" ([Kou trips][kou-trips]).
- **Taser** (MatchQuarters tag): locks the Mike on #3, which fits Y-empty or a pop-pushed back.
  MatchQuarters calls it "an extension of the Cover 2 family" that removes the Mike's
  pole-running ([MQ Taser][mq-taser]).

### 1.7 Usage

Cover 2 is about 14% of dropbacks (2022 and 2023) and 2-Man about 1.8% [repo BDB2025, BDB2026].
Behind Cover 2 the defense rushes 4 on 82.6% of plays and 5+ on 9.7%; behind 2-Man, 4 on
78% and 5+ on 13% [repo BDB2025]. Match versus spot is not charted publicly.

---

## 2. Inverted Cover 2 ("2 Invert")

### 2.1 Definitions found (several distinct things share the name)

| Name / system | What happens | Source |
|---|---|---|
| Classic "Cover 2 Invert" | Safeties align on the hashes, possibly shallower at **10–12 yd** (a Cover 4 look). At the snap the **safeties drive to the flats** and the **corners retreat back and slightly in, reaching the hashes to play deep halves**. Other underneath players are unchanged | [All Eyes 2 Invert][alleyes-inv] |
| "2 Invert" (NFL usage) | The corner takes the deep half and the flat player is a safety or another defender. It can be played to one side or both, usually with a quick rotation, and is "often paired with pressure", not an every-down call. Ravens and Bengals examples | [Sumer week 2][sumer2] |
| "Tampa-2 invert / 2-robber" (Packers 2021, Joe Barry) | Swaps a **nickel** with a deep safety: the slot DB rotates to the deep half and a safety rotates down to the robber (hole) zone, walling the dig. A corner can be the deep-half player instead. Shown from double A-gap mug looks; the mugged LBs bail to shallow zones | [APC invert][apc-inv] |
| Venables **"Slice"** | Any coverage with deep halves to the boundary can be "sliced" into an inverted half, where the **CB becomes the deep-half player** | [MQ glossary][mq-gloss] |
| Knowles **"2-steal" blitz** (Ohio State) | 5-man zone pressure with 2-deep/4-under. Field side: CB flat, Will seam, field safety deep half. Boundary side: DE drops to the flat, **boundary safety down as the seam player, boundary CB deep half** | [Buckeye Huddle][bh-2steal] |
| Heacock **"Cali Blaze"** | 4-under, 2-deep pressure from a 3-high look. The boundary CB blitzes, and the **STAR and SS play the deep halves** | [MQ glossary][mq-gloss] |
| FSU "Two-Match with invert principles" | "Similar to robber but true match". The weak safety and field corner are the deep-half players and everyone else switches (snippet; X&O Labs 403) | [X&O FSU][xol-fsu] |

**Naming collisions.** Saban's **"1 Invert"** is not an inverted Cover 2. It is Cover 1 with the
TE-side safety coming down to play the apex ([Soran][soran]). An older glossary calls
"Cover 8" an inverted Cover 2; this is the meaning sometimes seen in college or older sources
(snippet). Abilene Christian's "Cover 8" (Dulin) swaps OLB and safety roles inside quarters
(snippet: [X&O Dulin][xol-dulin]).

**Fangio/Staley.** I found **no source** that uses "Cover 2 Invert" as a Fangio or Staley call
name. The Fangio-tree Cover 2 calls found are **Wild (2)** (5-under, 2-deep match zone),
**Buster** (Cover 2 match where underneath defenders match by release), **Chicago** (4-man-rush
Tampa 2) and **River/Lake**, a Cover 2 call telling the deep-half safety which way to rotate
([MQ glossary][mq-gloss]). The Rams under Chris Shula, a Fangio-adjacent system, reach Cover 2
closed-to-open through a boundary **"roll" ("2-Roll")** from a Cover 3 look. 83% of Shula's
closed-to-open disguises ended as Cover 2 concepts ([MQ Rams][mq-rams2]).

### 2.2 Per-player specification (classic invert, one or both sides)

| Player | Pre-snap | Post-snap |
|---|---|---|
| Inverting corner | Soft, outside shade (a tell); "retreats back and slightly in" before the snap | Bail at the snap to the **hash** and play the deep half like a Cover 2 safety: 9 route first, react to inside verticals. Depth is not given in the sources; the stock half landmark of 15–18 yd (§1.2) is an *inferred* default |
| Inverted safety | 10–12 yd over the hash, a quarters look | Drive to the flat. He becomes the Cover 2 "hard/cloud" flat player: reroute #2 or #1, first-to-flat, force on outside runs |
| Hook/curl, Mike | Unchanged stock Cover 2 or Tampa | Unchanged |

Sources: [All Eyes 2 Invert][alleyes-inv], [Sumer week 2][sumer2]; the madden.tools page lists
the soft outside corner and the cheating safety as tells (game guide, low weight).

**Designed to:** disguise; discourage quick verticals to #1 while a different defender plays
low; and put a safety in run support from a two-high look. Against heavier personnel some teams
invert both sides so the safeties fit the run ([Sumer week 2][sumer2]; snippet from
breakdownsports). **Beaten by:** the deep middle (both corners on the hashes); throws between a
late-bailing corner and the sideline; and corner routes in front of a rotating safety. The
Packers gave up a corner route when the corner was occupied by a crosser and could not sink
([APC invert][apc-inv]).

**Usage (derived estimate).** PFF charts inverts as "Cover-2". In 2022, CBs (roster CB,
including nickels) held a deep-half assignment about **0.29 times per Cover-2 dropback**, or
about 10% of CB snaps in Cover-2. That is an upper bound of roughly 4% of all dropbacks for
"a CB playing a half" [repo BDB2025]. In Cover 6 the CB deep-half rate is about 0.02 per play.

---

## 3. Trap coverages (Cover 2 trap, Cloud/Kathy, corner trap vs #2 out, Palms trap)

### 3.1 The family

Trap is "a double read for the cornerback versus a two-receiver side". A safety plays over the
top and an inside defender matches #2 up the field. The corner reads #2 and "lies in the weeds
to jump the first outside-breaking route". Terminology varies: **"Gold"** (Gregg Williams),
**"2-Trap"**, **"Kathy"** ([Bowen trap][bowen-trap]). In Saban's glossary **Kathy** means Cover 2
with a "rail" technique reading #1 ([MQ glossary][mq-gloss]). The Palms/Clamp/2-Read #2-out
trap is in textbook ch. 9. Specifics below.

### 3.2 Trap corner technique (Dan Owen, Presbyterian DC, clinic)

| Phase | Rule |
|---|---|
| Alignment | **7 yd off, 2 yd inside the numbers**. Quarter turn toward the sideline. First move is a 6-inch back-foot step |
| Key | EMOL (end man on the line) → QB → #2 → #1. "High hat" EMOL = pass, "low hat" = run |
| Pass, #2 out | Slow-play against the QB's read. "**Q flat, you freeze**": hold to protect the safety's hole shot (10–12 yd, near the sideline), then take #2 out |
| Pass, #2 vertical before the 5-yd marker | Shuffle out, glance at #1, punch #1, then shuffle-pivot-sink (sail) with eyes on the QB |
| 2 out-and-up (wheel) | Curl/flat players always run with the wheel, take outside leverage and squeeze it back in. The deep half plays a divider half between #1 and #2. The corner lets the receiver get on top because the safety is coming over |
| Run | Trigger downhill inside #1 and outside #2, with a wall/carry player inside |

Source: [Owen trap][owen-trap]. Owen pairs trap with fire-zone thirds and likes it in the red
zone.

### 3.3 Trap in split-field and pressure calls (NFL film)

| Call | Rules | Source |
|---|---|---|
| Iowa (Norm Parker) Cover 6 with "Kathy" to the open side | Closed side: Cover 4, with the SS and CB matching vertical #1/#2. Open side: the corner reads **#2 (H)** while the **Will matches #2**. #2 out: the corner drops #1 to the FS ("top" the fade) and jumps the out. #2 vertical: the corner sinks (protecting the 7 route) and breaks on throws underneath. Corner technique is a "**soft squat**" (sink, clue inside to #2) | [Bowen trap][bowen-trap] |
| Gregg Williams "Gold" (Ruby dime) | Nickel and dime blitz and the LBs drop to match #2. The corners play off with eyes on #2. The safeties "flat-foot" read (no backpedal) and get over the top of #1, a quarters technique against two verticals | [Bowen trap][bowen-trap] |
| Williams overload + "Fist" | Trap to the closed side (SS rolls over #1, CB squats) with Fist (2-Man) to the open side. The open-side corner drops to the deep half, with two "vertical hook" defenders ("swipe") matching #1 and #2 | [Bowen trap][bowen-trap] |
| Chargers 2013 playoff interception | From a single-high man-pressure look, the FS rolls from the deep middle to top #1. The CB releases #1 outside to him and traps #2's out | [Bowen trap][bowen-trap] |
| "Weak Cat Gold" (Bowen's Redskins) | CB and Sam blitz. The FS drops as the trap defender and the SS rolls to top #1. The nickel shows over the slot then plays over the top of #1 on the open side | [Bowen trap][bowen-trap] |

### 3.4 Cover 3 Cloud (and "Cloud trap")

| Player | Rule ([Bowen Cover 3][bowen-c3]) |
|---|---|
| Pre-snap | Two-high, corners in press. Rotates at the snap |
| Closed-side (cloud) CB | Jam #1 to force an inside release, then **sink to cushion the 7 route** (Cover 2 technique). He is the flat player and the force on that side |
| Closed-side SS | Rolls to the **deep outside third** over the cloud corner |
| FS | Deep middle third |
| Open-side CB | Bail to the outside third |
| Nickel (open side) | Curl/flat |
| Two ILBs | Middle-hook landmarks |

Use it to jam and reroute an elite deep threat with help over the top. MatchQuarters' glossary
(Heacock) defines **Cloud** as a corner technique: flat zone plus primary run support, often
called to the boundary or to a nub-TE side ([MQ glossary][mq-gloss]). Gregg Williams separates
**Cleo** (corner force from an inside alignment, forcing an outside release) from **Cloud**
(from an outside alignment, forcing an inside release) ([MQ glossary][mq-gloss]).

**"Cover 3 Cloud trap"** was not found as a named NFL call. X&O Labs coaches describe "trapping"
the corner strong or weak in Cover 3, which makes him a primary run defender "much like Tampa 2"
(snippet; X&O Labs 403). PFF labels Cloud as "Cover-3 Cloud Left/Right" and "Cover-3 Double
Cloud": **≈0.5% of dropbacks combined** in 2022 [repo BDB2025].

### 3.5 Name collisions for "Trap"

- **Venables "Trap":** a *fire-zone* coverage that plays a Cover 2 concept against 3x1.
- **Heacock "Trap":** a combination that plays **Hard** (3-high, Tampa-technique safeties) to
  the field and **Special** to the boundary.

Both are in [MQ glossary][mq-gloss]. Store "trap" as a corner *technique* (read #2, squat
the out, safety over the top), not as a coverage name.

### 3.6 What beats trap

- Out-and-up or wheel by #2, and corner-routes behind a squatting corner. Some coaches tag a
  softer "squat" or withhold the bubble trap (textbook §9.2).
- The hole shot, if the corner jumps early ([Owen trap][owen-trap]).
- Smoke or hitch to #1 when the trap defender comes from depth ([Bowen trap][bowen-trap]).

---

## 4. Split-field man/zone (man on one side, zone on the other)

Split-field calls assign each side its own coverage. They are built from two-high because the
two sides do not share a post safety ([Tomahawk Nation split field][tn-split]). Saban's
**Cover 7** call grammar is a model for an engine call system ([Soran][soran]):

- "**7 X**": play triangle X against two detached receivers, **Cut** to the one-detached
  (TE/flanker) side, and **Stubbie** against 3x1 by default.
- "**77 X**": X on both sides against 2x2.
- "**Triple 7 Y**": Y as the box coverage against 3x1.

Bartee calls Cover 7 "flank dependent": the call per side follows how many receivers are to
that side ([USA Cover 7 pt 1][usa-c7a]).

### 4.1 Backside (single-receiver side) man and bracket options

| Option | Corner | Safety | Other | When | Source |
|---|---|---|---|---|---|
| **MEG** (Lock / Solo) | Man on #1 for everything | Free to poach #3 (Trix/Poach) or rob | LB man on the back | Wide split (inside routes likely), poach needed | [Soran][soran], [Bowen Cover 4][bowen-c4] |
| **Dog** (2-Man side) | Trail on #1 | Deep half over #1 | — | Cap a deep threat | [Soran][soran] |
| **Cone** (Saban) | #1 **short and outside** | #1 **deep and inside** | Backer to the Cone side mans the back and adds to the rush if the back blocks ("hugging the LOS") | Compressed #1 split or elite receiver | [Soran][soran], [USA Cover 7 pt 1][usa-c7a] |
| Cone (Bartee/Cover 7) | If #1 runs a sneak or cross to the field, the safety robs and mans #1 while the corner bails with MOD rules. Otherwise the corner mans #1 | — | Same backer rule | — | [USA Cover 7 pt 1][usa-c7a] |
| Cone (Baylor, single side) | #1 releases inside: has safety help. #1 outside: "yours, expect no help" | #1 inside: help on him. #1 outside: help the other way on #3 vertical | — | Quarters to 3x1 + Cone to the single side | [Kou trips][kou-trips] |
| **Tuff** (Saban) | First to the deep third | **First man to the flat**. If there is no #2, the safety cuts (robs) #1 underneath | — | Bait the QB to the backside | [Soran][soran] |
| **Cut** (backside) | Squat on the flat (the RB as #2 mostly releases to the flat) | Bracket #1 over the top | Apex cuts #1 underneath and inside | Backside of 3x1 with the RB as #2 | [Soran][soran] |
| Fangio **Cut** | Outside | Inside | — | A bracket call to double **#1** | [MQ glossary][mq-gloss] |
| Fangio **Cone** | Nickel outside | Safety inside | — | A bracket call to double **#2** | [MQ glossary][mq-gloss] |
| Patriots "Cut concept" (man free) | Corner and weak FS read #1. #1 releases across: the **safety takes #1** and the CB plays crossers. #1 releases outside: the CB takes him and the safety takes the crosser | — | — | 1-WR side | [Kou Patriots][kou-pats] |
| Bowen Cover 4 **"Cut"** | Corner replaces deep in the quarter | FS drives downhill on a shallow or over route by a reduced-split X (plays the upfield shoulder) | — | X in a nasty split | [Bowen Cover 4][bowen-c4] |
| Bowen Cover 1 **"Jump"** | Corner replaces the FS in the deep middle | FS "cuts" a receiver on short divide motion or a shallow cross | — | Hi-Lo or motion to the core | [Bowen Cover 1][bowen-c1] |

**Sources disagree on "Cut", "Cone" and "Tuff".** Fangio's **Cut** brackets #1. Saban's
**Cut** is a pattern-match Cover 2 triangle. Bowen's **Cut** is a safety driving down on a
crosser. Gregg Williams' **CUT** is a corner-safety exchange against tight splits (the safety
takes the man, the corner replaces deep) ([MQ glossary][mq-gloss]). Fangio's **Cone** brackets
#2; Saban's **Cone** brackets #1. **Tuff** is a Saban backside zone concept in
[Soran][soran], but Saban's glossary defines it as "a leverage technique used in man coverage
against tight splits", and elsewhere "Tuff front" means both DTs in 2-techniques
([MQ glossary][mq-gloss]).

### 4.2 Man one side, quarters the other (Fangio "Ring" / "Finger", Staley)

| Side | Coverage | Rule |
|---|---|---|
| Target's side, target at #1 (not stacked) | **Fist** (2-Man) | Corner in man with inside leverage. The safety plays a **deep-half** technique over the top, reading outside-in |
| Away side, or all sides when the target is inside | **Pounder** | Man underneath with outside shade. The safety plays a **quarters technique** (2-1 read, inside-out) |

Sources: [Sumer week 2][sumer2], [MMM Ring][mmm-ring], [BGN pt 2][bgn2]. Staley's stated
philosophy: "lock the back side in man and flood the frontside in zone" ([Syed][syed]).

**Gregg Williams' Rams** played trap (zone) to the closed side and Fist (2-Man) to the open side
behind overload pressure ([Bowen trap][bowen-trap]). Michigan (Minter) "42" is Cover 4 to the
field and 2 to the boundary ([Kou Minter Cover 3][kou-minter3]). Venables' **Lock** is Bracket
to the field and halves to the boundary, and **2 Bracket** is Cover 2 field with Bracket to the
boundary ([MQ glossary][mq-gloss]).

### 4.3 "Cover 5" meanings found

| Meaning | Source |
|---|---|
| 2-Man (five underneath in man, two deep halves). Saban's base two-high man | [Soran][soran]; "some people refer to Cover 2 Man as Cover 5" ([BGN pt 2][bgn2]); viqtorysports (snippet) |
| Venables "Cover 5 (Smash/Cloud)": a Cover 2 field coverage with no low safety | [MQ glossary][mq-gloss] |
| Saban "Cougar", "Tango" and "Trio" are listed as forms of Cut or Cover 5: Tango is 3-on-2 vs a stack, Trio is 3-on-2 on #2 and #3 vs trips | [MQ glossary][mq-gloss] |

I found **no source** that uses "Cover 5" for "Cover 1 boundary / quarters field". Treat a
split man/zone call as two side calls, not as a number.

### 4.4 Frequency

PFF does not label man/zone splits. The related PFF labels are "Bracket" (0.74% of 2022
dropbacks) and "Cover-1 Double" (0.51%) [repo BDB2025]. Most split-field snaps chart as
Cover-6.

---

## 5. Cover 6, Cover 8 and Cover 9: meanings by system

### 5.1 The naming table

| System | "6" | "8" | "9" | Source |
|---|---|---|---|---|
| **Generic / PFF / most NFL analysts** | **Quarter-quarter-half (QQH)**, also "42". The quarters side usually goes to the passing strength or the field, and switches if the offense overloads the boundary | Rarely used | Rarely used | [TN split][tn-split], [Bowen trap][bowen-trap], [MQ Cover 6/8][mq-6v8] |
| PFF labels (BDB) | "Cover-6 Right" / "Cover 6-Left". **The label names the side of the deep half**: Cover-6 Right role set = `2R 4IL 4OL CFL FR HCL HCR` | — | — | [repo BDB2025] |
| **Fangio tree** (Fangio, Staley, Evero, Shula, Campanile) | **"Stuff" (6)**: quarters to the nickel/passing strength, Cover 2 (Roy/Lou) away. Used to zone-double the single-receiver X | **"8" / "Trix" (HQQ)**: Cover 2 **to** the nickel/passing strength, quarters away. The weak safety is a quarters defender who can **poach** vs 3x1 or play vision. Fangio's favourite split-field coverage, aligns almost identically to his Cover 9 | **"9"**: 4-under, 3-deep **match** zone with **rotation away from the nickel (weak rotation)**, from a two-high shell | [MQ glossary][mq-gloss], [MQ Zeus][mq-zeus], [MQ Cover 8][mq-c8], [MQ Macdonald][mq-mac6], [BGN pt 2][bgn2], [BGN pt 3][bgn3], [Syed][syed], [All Eyes Cover 9][alleyes9] |
| **Saban** | **"6"**: Cover 3 with the safety rotating **away** from the passing strength ("3" = toward it). "6 Buzz" = the weak safety drops to the weak hook | **"8"** (Saban glossary): QQH, i.e. **Nail** (zone-matched quarters) to the passing strength + **Kathy** (Cover 2) weak. This is Fangio's **Stuff** | "9 Rat" (the safety rotates down to the split-end side) and "9 Double" are Cover 1-family calls in the glossary | [Soran][soran], [MQ glossary][mq-gloss] |
| **Ravens 2.0** (Macdonald, Minter, Orr) | **"Pack"**: quarters one side, Cover 2 away. **"Stuff"**: the inverse of Pack. "Pound" = Cover 4 | — | — | [MQ glossary][mq-gloss] |
| Madden (EA) | Cover 6 = Fangio Stuff | — | Madden "Cover 9" = **Fangio Cover 8** (half to strength) | [MMM King][mmm-king] |
| Substack explainer | QQH, quarters strong / half weak | — | "Inverse of Cover 6": Cover 2 strong, Cover 4 weak | [Nate][nate] |
| Abilene Christian (Dulin) | — | Quarters variant: OLBs walked out on #2 and the safeties play closer, swapping jobs | — | (snippet) [X&O Dulin][xol-dulin] |
| Older glossary | — | Inverted Cover 2 (corners and safeties switch) | — | (snippet) thegamehaus 2016 |

**Sources disagree on Fangio's "Stuff" orientation.** MatchQuarters (article and glossary),
Bleeding Green Nation and Shawn Syed all say Stuff = **quarters to the passing strength, half
away**. The MGoBlog forum (snippet only, 403) says "Stuff = Cov2 over the strong side". I go
with the majority. Syed also writes "Cover 6" for Fangio's Stuff, while [MQ Zeus][mq-zeus]
says "Cover 8 in the Fangio system is mainly known as Cover 6 (4+2)", meaning the *family*.

**Which meaning modern NFL analysts use:**

- **Cover 6** almost always means generic QQH in either orientation. PFF, FTN, Sumer and
  MatchQuarters all use it that way.
- **Cover 8** almost always means Fangio's half-to-strength version, with "Trix" or a poach
  away.
- **Cover 9** in Fangio-tree analysis (MatchQuarters, Bleeding Green Nation, Syed, All Eyes DB)
  means **weak-rotation Cover 3**. In Madden and some fan Substacks it means half-to-strength
  QQH. PFF has no Cover 8 or 9 label: Fangio's 6 and 8 chart as "Cover-6" and 9 charts as
  "Cover-3" (or "Cover-3 Seam").

### 5.2 Per-player rules: QQH (either orientation)

| Player | Quarters side | Half side |
|---|---|---|
| Corner | CB at 7–8 yd, outside shade. **MOD on #1**: man any vertical stem. If #1 breaks ≤5 yd (hitch, shallow), sink and help inside on #2's corner route ([Bowen Cover 4][bowen-c4], [Soran][soran]) | **Squat / cloud corner**: reroute #1 (outside alignment), take first-to-flat, and sink to cushion the 7 route if nothing threatens the flat. Primary force against outside runs ([MQ Zeus][mq-zeus], textbook §11.2) |
| Safety | Flat-foot read at **10–12 yd** on the inside eye of #2. #2 blocks: fill alley/C/D. **#2 vertical past ~12 yd: carry him**. No inside vertical: bracket or rob #1 (curl, dig, post) ([Bowen Cover 4][bowen-c4]) | **Deep half**: midpoint #1 and #2 and favour #1 vertical. Top of the numbers at 15–18 yd as in §1.2 |
| Apex / nickel | Fangio's nickel "**quarter-flat**": carry #2's vertical and **push to the flat if any WR attacks it**. Saban Mod apex: "take the first man to the flat", rerouting #2 first if he goes vertical ([MQ Zeus][mq-zeus], [Soran][soran]) | **Wall-2** overhang: carry #2 vertical, no push to the flat unless #3 is to his side ([MQ Zeus][mq-zeus]) |
| Mike | Wall crossers, carry or cushion #3 to protect the quarters safety ([Bowen Cover 4][bowen-c4]) | **Patty**: the LB has the RB to the flat ([MQ Zeus][mq-zeus]) |

Typical front: a 4-man rush on 90% of 2022 Cover-6 dropbacks [repo BDB2025]. Bowen's Iowa
example adds a Kathy trap to the half side ([Bowen trap][bowen-trap]).

### 5.3 Formation checks

| Formation | Cover 6 (quarters to strength) | Cover 8 (half to strength) |
|---|---|---|
| 2x2 | Box over the passing-strength pair; zone double on the backside X | Cloud corner and half safety to the strength; quarters away. Lets the strength-side corner press aggressively |
| **3x1** | Backside: **corner in the flat and safety over the top of the isolated #1**. Trips side: Cover 4, "with an adjustment to avoid ending up with the offense's best receiver on a linebacker" (the Mike carrying #3) ([Sumer week 1][sumer1]) | Backside: **corner and LB locked in man on #1 and the RB**. The backside safety works frontside for #3 vertical (**Trix**), which gives "5 defenders over 3 receivers". Commonly from a Penny front ("Penny Sam 8") ([Sumer week 1][sumer1], [Syed][syed]) |
| Trix (in Quads or 8) | — | The weak safety reads the releases of #3 and #2 to the trips side for verticals or deep crossers. **LB man on the RB, backside CB MEG on X**. With no vertical threat, he zones his quarter or "hangs in the window" to rob a backside dig ([Syed][syed], [BGN pt 2][bgn2]) |
| Empty / 2x2 | MatchQuarters says Cover 8 is structured against 2x2 and empty, but the detail is paywalled ([MQ Cover 8][mq-c8]) | — |

### 5.4 Purpose, beaters, usage

- **Designed to:** layer the intermediate zones and backstop deep crossers ([MQ Macdonald][mq-mac6]),
  and zone-double an X or a slot. Fangio's split-field calls have a "high" (Cover 2) side and a
  "low" (quarters) side, and the quarters safety can cap a vertical or backstop a crosser
  ([MQ Eagles][mq-eagles4]).
- **Beaten by:** vertical stress on the half side. "The trade-off for Cover 6 was vertical
  exposure… easy to manipulate" once identified. Philadelphia's explosive rate dropped by more
  than 5% when Fangio called Quarters instead of Cover 8 ([MQ Cover 8][mq-c8]). Backside 1-on-1s
  in Trix or 8 can also beat it (X on MEG, LB on RB) ([BGN pt 2][bgn2], [Syed][syed]).
- **Usage:**
  - 2022: 9.6% of dropbacks. 2023: 9.4% [repo].
  - 2025: about 6% (FTN) or about 9% (PFF), and the only coverage family with negative EPA
    (−0.025) ([MQ Macdonald][mq-mac6]).
  - Fangio-tree coaches use the Cover 6 family on 18–25% of calls, more than double the league
    average. Cover 8 exceeded 12% for LAC, DAL, DET, GB and MIN in 2025, with GB at 20%. The
    Saleh tree (GB, HOU, SF, ATL) plays traditional Cover 6 ([MQ Cover 8][mq-c8]).
  - Seattle was the league leader in 2025 (23%) and used it on 41% of snaps in 2026 week 1
    ([MQ Macdonald][mq-mac6]).
  - Staley's 2020 Rams played QQH on a league-leading 18.6% ([PFF Staley][pff-staley]).

---

## 6. The Fangio / Staley system

### 6.1 Philosophy and the two-high disguise

- **Two-high shell.** In 2020 the Rams (Staley) and Broncos (Fangio) showed a two-high shell
  pre-snap on **more than 75%** of snaps. No other team was above 60% (SIS data). Yet the Rams
  ranked only 10th in actual two-high *coverage* and the Broncos 14th, because they rotate to
  single-high after the snap ([Sharp 2-high][sharp-2high]).
- **2025 Eagles (Fangio).**
  - Pre-snap open on **87%** of plays (1,012), the league lead. Closed-post coverages were
    disguised on 41% of those snaps.
  - **98% of 488 disguised snaps were open-to-closed**; they were last in the league in
    closed-to-open (8 snaps).
  - Coverage menu: **Cover 3 34%** (including man-match "3-Seam", where the Eagles led the
    league at 11.6%; 96% of their 3-Seam came from open-to-closed), **Quarters and Cover 6/8
    33%**, **Cover 1 18%** (late "down" safety to rob crossers or bracket).
  - They led the NFL in off-ball simulated pressure at 37% (the denominator is not stated).
  - Sources: [MQ Cover 9][mq-c9], [MQ Cover 8][mq-c8].
- **Sources disagree on Fangio's 2025 man rate.** One MatchQuarters article says "In 2025,
  Fangio pivoted to a more man-centric style, leading the NFL in man coverage usage (44%)"
  ([MQ Panthers][mq-panthers]). Another gives the Eagles' Cover 1 as 18%
  ([MQ Cover 9][mq-c9]), and a PFF trends snippet gives the Browns the league lead at 45.1% man.
  The definitions or denominators evidently differ.
- **Trend over time.** Fangio's Quads (quarters) rose from 12% (2023 MIA) to almost 20% (2024),
  while Cover 6/8 fell from 21%. Fangio rarely plays quarters behind pressure (2.5%)
  ([MQ Eagles][mq-eagles4], [MQ Cover 8][mq-c8]).
- **Run fits.** The defense uses light boxes and "gap-and-a-half" front play, with a safety
  coming "off the roof" late to fit ([NO Staley][no-staley], [PFF Staley][pff-staley]).
- **Who runs it.** Staley (now NO), Ejiro Evero and Jonathan Cooley (CAR) stay two-high and
  zone-centric. Carolina keeps a nearly 1:1 split between static two-high and rotated
  (397 vs 375) and disguises 41.5% of snaps ([MQ Panthers][mq-panthers]). Shula (LAR) adds
  closed-to-open (13%), mostly to Cover 2 ([MQ Rams][mq-rams2]).

### 6.2 Call-name glossary (Fangio tree unless noted)

| Name | Meaning | Source |
|---|---|---|
| **Quads (4)** | Quarters across the board. Tools: Box, Buster, Trix | [MQ glossary][mq-gloss], [BGN pt 2][bgn2] |
| **Stuff (6)** | Roy/Lou (half) away from the nickel, so quarters to the nickel. Cover 2 "over a designated player or side" | [MQ glossary][mq-gloss] |
| **8 / Trix** | Roy/Lou (half) to the nickel side, quarters away with the weak safety poaching | [MQ glossary][mq-gloss], [MQ Cover 8][mq-c8] |
| **9** | 4-under, 3-deep match zone, weak rotation | [MQ glossary][mq-gloss] |
| **Wild (2)** | 5-under, 2-deep match zone | [MQ glossary][mq-gloss] |
| **Buster** | Cover 2 match concept: underneath defenders match by release | [MQ glossary][mq-gloss] |
| **Chicago** | 4-man-rush Tampa 2 | [MQ glossary][mq-gloss] |
| **Pillow** | 3-man rush, 5-under, 3-deep | [MQ glossary][mq-gloss] |
| **Will 6 / Will 2 / Will-Mike-Jack 4** | Base-personnel names. The named LB is the 4th rusher: Will 6 = QQH, Will 2 = 5-under Buster, X 4 = quarters | [MQ glossary][mq-gloss] |
| **Wasp** | 4-man rush with the Jack as 4th rusher. Plays Quads vs 2x2 or empty, Sally/Rose (Cover 3) otherwise | [MQ glossary][mq-gloss] |
| **Whip / Slug** | 4-under, 3-deep **simulated** zone pressure away from (Whip) or from (Slug) the nickel side | [MQ glossary][mq-gloss] |
| **Robber / Lurk / Hole** | Cover 1 variants by who is the low hole player. **Robber**: low *and* deep-middle help. A safety or LB becomes the hole player depending on the RB's release (BGN). **Lurk**: an LB in the low hole and a safety deep; the safety mans a WR or TE and the LB can double as a QB spy. **Hole**: one deep middle safety, the other safety always rotates to the low hole (others call this Robber or Cross) | [MQ glossary][mq-gloss], [BGN pt 3][bgn3] |
| **Thief / Stealer** | Man with a double rat (Thief); red-zone man that doubles a receiver (Stealer) | [MQ glossary][mq-gloss] |
| **Cover 1 Dog** | 5-man rush, five in man, deep safety, **no hole player**. Often from a 5-man front | [BGN pt 3][bgn3] |
| "Switch" in Cover 1 | The hole defender takes an inside-leveraged crosser and stays in man; the corner who had him becomes the hole player | [BGN pt 3][bgn3] |
| **Fist / Pounder / Finger** | 2-Man safety techniques (§1.5). The glossary also lists Fist as "5-under, 2-deep man with split-safety tools (Cut, Buster, Trix)" | [BGN pt 2][bgn2], [MQ glossary][mq-gloss] |
| **Bracket** | Man in/out bracket on designated alignments, mainly in the red zone | [MQ glossary][mq-gloss] |
| **Zeus #, Lord #, Ring #** | Receiver-targeting packages (§6.3) | below |
| **Roll Luggage** | Call naming a player number or direction for the secondary rotation ("roll to #88", "roll left") | [MQ glossary][mq-gloss] |
| **Roy / Lou** | Cover 6/8: which way the half safety rotates | [MQ glossary][mq-gloss] |
| **River / Lake** | Cover 2: which way the half safety rotates | [MQ glossary][mq-gloss] |
| **Sally / Rose** | Cover 3: which way the split safeties rotate | [MQ glossary][mq-gloss] |
| **Rip / Liz (Fangio)** | **Front** call: which edge is the 4th rusher. Conflicts with Saban's Rip/Liz, the Cover 3 safety rotation and match call | [MQ glossary][mq-gloss], [Soran][soran] |
| **Cut / Cone** | Bracket #1 (CB outside, S inside) / bracket #2 (nickel outside, S inside) | [MQ glossary][mq-gloss] |
| **Trix** | Weak-side tool vs 3x1: the safety helps on #3 vertical | [MQ glossary][mq-gloss] |
| **MEG / MOD** | Man Everywhere he Goes / Man Only Deep (don't cover routes under 5 yd) | [MQ glossary][mq-gloss] |
| **Smash / Squat** | Cover 2-side corner technique: inside vs outside alignment reroute | [MQ Zeus][mq-zeus] |
| **Patty** | LB has the RB to the flat. In Saban terms, an alert to pass crossers off | [MQ Zeus][mq-zeus], [MQ glossary][mq-gloss] |
| **Site** | 3x1 tag, similar to Saban's, used with Cover 9 when the RB is away from trips: the **down safety rotates to the RB side** (details in §6.4) | [Syed][syed] |
| **Penny** | Front family Cover 8 is commonly called from ("Penny Sam 8") | [Syed][syed] |

Other names the request asked about:

| Name | Finding |
|---|---|
| **Nail** | Saban terminology: quarters to the passing strength, zone-matched. Not found as a Fangio term ([MQ glossary][mq-gloss]) |
| **Tuff** | Saban, see §4.1. Not found as a Fangio term |
| **Hook** | The second underneath defender inside the corner (Soran's definition), usually an LB keying the RB in 2x2. There are two hooks in single-high and one in split-safety ([Soran][soran]). Fangio's man variant is called "Hole" |
| **Wall** | MatchQuarters "Wall-2" overhang (§1.4); textbook ch. 15 "wall/carry" |
| **Sky / Buzz / Cloud** | §7 |
| **Rat** | The low-hole robber who cuts the first crosser |

### 6.3 Zeus, Lord and Ring: what they are precisely

**Zeus** is a Fangio-tree **pre-snap targeting coverage package**: a zone call tag tied to an
opposing jersey number. It is not a pressure and not a single coverage. MatchQuarters titles it
"Fangio's **Sub** 'Zeus' Tag", where Sub is the nickel/sub package ([MQ Zeus][mq-zeus]). The
defense calls "**Zeus [jersey #]**", for example "Zeus 18" for Justin Jefferson or "Zeus 1" for
Ja'Marr Chase. The final coverage is **one of three** Fangio coverages, chosen by where the
target aligns ([Sumer week 2][sumer2], [MMM King][mmm-king]):

| Target aligns at | Coverage played | Effect |
|---|---|---|
| **#1 (outermost) to the passing strength** | **Cover 8**: half to his side, quarters away | Squat corner under and half safety over: a "natural double" without extra bodies |
| **#1 on the weak, single-receiver side** (X) | **Stuff (Cover 6)**: half to his side, quarters to the strength | Same double on the backside |
| **Inside (#2 or #3)** | **Quads (Quarters)**, or Palms in the Madden version | The quarter-flat overhang plus the quarters safety keying #2 "functionally bracket" him |

- **Who used it.** Sumer attributes it, with **Ring**, to the **2023 Eagles under Sean Desai**
  against Justin Jefferson, calling both "Fangio world classics". It cautions that it "cannot
  say with 100% certainty" from film alone ([Sumer week 2][sumer2]).
- **Lord #:** same targeting, but it **always plays the 2-Match (half) side to the target**,
  inside or out, so it resolves to Cover 6 or Cover 8 only and never Quads. Use it when
  offenses beat the quarters safety's inside leverage with vertical out-breakers
  ([MMM King][mmm-king]).
- **Ring #:** the man version ([Sumer week 2][sumer2], [MMM Ring][mmm-ring], Honest NFL tweet:
  "basically the man version of Zeus" (snippet)).
  - Target is #1 and not stacked: **Fist** (2-Man with a deep-half safety over him) to his
    side and **Pounder** (man with a quarters-technique safety) away, which makes the call
    "Finger".
  - Target inside: Pounder.
- **Sources disagree on Lord vs Ring.** MGoBlog (snippet) says "the man version of Zeus is called
  Lord" and that "the man version of Quads is Pounder". Man Match Madden says Lord is a zone
  variant of Zeus, and Sumer and Honest NFL name **Ring** as the man version. The majority view
  is Ring = man and Lord = always-half zone.
- **Engine implication.** Zeus is a *resolver*: (target id, formation, passing strength) →
  {Cover 8, Stuff, Quads}. It must run after motion and shifts settle. Late motion that moves the
  target from #1 to #2 changes the call.

### 6.4 Cover 9 (weak-rotation Cover 3) with "Site": per-player rules

| Player | Rule | Source |
|---|---|---|
| Pre-snap | Two-high shell, the nickel to the passing strength | [MQ Cover 8][mq-c8], [BGN pt 3][bgn3] |
| Weak safety (away from the nickel) | Rotates **down** as an underneath defender (the weak curl/flat or hook, by call) | [BGN pt 3][bgn3] |
| Strong safety | Rotates to the deep middle third | [BGN pt 3][bgn3] |
| Corners | Deep thirds with match rules (MOD on #1) | [BGN pt 3][bgn3], [Soran][soran] |
| Nickel / down safety | "**Seam/flat**" defenders, not curl/flat: they **carry #2 vertical**, so four verticals does not outnumber the three deep | [BGN pt 3][bgn3] |
| Weak hook vs 3x1 | "**3 up is 3**": the weak hook turns to man if #3 goes vertical | [Syed][syed], [MQ glossary][mq-gloss] |

**Site, against 3x1 with the RB away from trips** ([Syed][syed]):

- The down safety rotates to the RB's side.
- RB likely to block (six-man protection, deeper pass expected): the **LB takes the RB** and the
  down safety becomes the 3-up player.
- RB a receiving threat or fast to the flat (empty protection, quick pass): the **safety takes
  the RB** and the LB plays his normal 3-up job.

The Ravens 2.0 equivalent is **"3 Lock / 3 Site"**, their primary pattern-match Cover 3. 3 Site
handles 3x1 with M.U.S.H. ("Man Unless Shallow") rules ([MQ glossary][mq-gloss]).

### 6.5 Trips and empty checks (names as used in the Fangio, Saban and MatchQuarters sources)

| Check | Rule | Source |
|---|---|---|
| **Solo** (MatchQuarters) | The backside safety owns #3 vertical. CB, nickel and frontside safety play Sky or Cloud over #1 and #2. The backside CB is "locked" (MEG) | [MQ Zeus][mq-zeus] |
| **Solo / Lock** (Bowen) | The backside corner gets a "lock" call (man, possibly no inside help), so the FS can overlap #3 up the seam while the SS widens over #2 | [Bowen Cover 4][bowen-c4] |
| **Poach** (Saban Palms/Clip) | Weak safety: **poach #3 vertical**. If #3 is not vertical, poach backside #1 vertical. Weak CB MEG | [Soran][soran] |
| **Special / Stubbie** (MatchQuarters) | Trips CB "locks" on #1 (MEG). Nickel, safety and LB play a **Cloud triangle** over #2 and #3, bracketing #2 and supporting the LB on #3 ("Stubbie is a Saban term") | [MQ Zeus][mq-zeus] |
| **Stubbie** (Saban) | CB press MEG on #1. Strong apex: man on #2 except when #3 goes out (then man #3) or #2 runs under (then zone off). Hook: match any #2/#3 under-crosser, otherwise wall #3 and deliver him to the safety if he goes vertical. Safety: all of #3 vertical, else #2 vertical. **Stomp** = Stubbie with a built-in smash alert | [Soran][soran] |
| **Zeke / In-Out** (Saban, compressed #2/#3) | Apex takes the first out of #2/#3 and the hook takes the first in. If both go vertical, the apex has #2 and the hook #3. The safety plays deep half (In-Out: the corner takes first-to-flat and the safety always takes #1 vertical) | [Soran][soran] |
| **Mable** | Saban: Cover 3/6 against 3x1 when the safety drops **to** the passing strength. **Skate** is the same rules when he drops away. Glossary: "push the coverage strong, man on the backside receiver" | [Soran][soran], [MQ glossary][mq-gloss] |
| **Squeeze** (Aranda/Roberts) | The corner plays the flat from an inside-leverage position on #1, and the half safety has #1 vertical | [MQ glossary][mq-gloss] |
| **Stress** | Not found beyond the textbook (§12.4) | — |
| **Taser** | Mike locked on #3 (Y-empty, pop-push back) | [MQ Taser][mq-taser] |
| Empty, 3x2 | Play Special (Stubbie/Mini) over the slot and TE; the Mike must "find your three" | [MQ Taser][mq-taser] |

**Sources disagree on "Special" and "Solo".** In Heacock's Iowa State terminology **Special** is
the base **3-high-safety** package (Cover 4 concepts with apex Sam and Will) and **Solo** is a
safety man-rule inside the Uno, Seattle and City packages. Gregg Williams' Solo is "inside man,
no help". Aranda's Solo is a 1-back man adjustment ([MQ glossary][mq-gloss]).

### 6.6 What beats the Fangio structure

- Light-box runs against the two-high shell. The answer is late safety fits ([Sharp 2-high][sharp-2high]).
- Backside isolations created by Trix or 8 (X on MEG, RB on LB) ([BGN pt 2][bgn2]).
- Vertical stress on the Cover 6/8 half side ([MQ Cover 8][mq-c8]).
- Fast, short out-motion that leaves no time to re-roll. Miami did this to Staley in 2023
  week 1 ([Sumer week 1][sumer1]).
- Concepts that break Cover 8's rules, such as the Jaguars' touchdown ([Sumer week 1][sumer1]).

---

## 7. Cover 3 variants

### 7.1 Base Cover 3 (4 under, 3 deep): depths

| Player | Pre-snap | Post-snap | Source |
|---|---|---|---|
| Corners | 7–8 yd off, or press-bail | Deep outside third. Funnel the dig and post inside to the FS, and play any two verticals to the same side | [Bowen Cover 3][bowen-c3] |
| Corner leverage (Saban single-high) | — | #1 inside the line 1 yd inside the top of the numbers: keep **outside** leverage (help inside). #1 outside that line: keep **inside** leverage | [Soran][soran] |
| FS (middle third) | Middle, often rolled from two-high late | Initial drop to about **15 yd**. Area runs from **6 yd outside each hash**. Eyes on the #2 releases (2x2) or #2/#3 (3x1) **before** the QB. Deny seams first, posts second. Rip/Liz version: align at **14 yd**, pedal to **20 yd**, drift to the QB's first look and break on the second. From two-high, run a 45° angle to the middle and square up | [Soran][soran], [USA Rip/Liz][usa-ripliz], [Bowen Cover 3][bowen-c3] |
| Curl/flat (SS, nickel or Will) | Over #2 | Run/pass key, then drop to **10–12 yd at the top of the numbers**. Hold off the curl then widen with the flat, never out-leveraged, and run with a #2 wheel | [Bowen Cover 3][bowen-c3] |
| Hooks (two LBs) | Box | Key guard-center-guard, then sink to **10–12 yd just outside the hashes**. Cushion seam and dig, drive on the shallow and checkdown | [Bowen Cover 3][bowen-c3] |

### 7.2 Rotation names

| Name | Who rotates | Run force | Source |
|---|---|---|---|
| **Sky** | Strong safety down **outside** the Sam, to the curl/flat | Safety force ("Sky" = safety tells the LB he has force) | [MQ glossary][mq-gloss] (Venables, Saban), [Bowen Cover 3][bowen-c3] |
| **Buzz** | A safety down **inside**, to the hook. The LB bumps to the curl/flat and has force. Disguised from two-high; the safety's depth varies by down (tighter on 3rd and 2–6, near the sticks on 3rd and 7+) | LB ("backer") force | [Bowen Cover 3][bowen-c3], [MQ glossary][mq-gloss] |
| **Cloud** | The corner squats the flat and a safety rolls over to the deep third | Corner force | [Bowen Cover 3][bowen-c3] (§3.4) |
| **Weak / "6" (Saban) / "9" (Fangio)** | Safety rotates away from the passing strength | — | [Soran][soran], [MQ glossary][mq-gloss] |
| Saban **3 / 3 Buzz / 6 / 6 Buzz** | Strong apex / strong hook / weak apex / weak hook | — | [Soran][soran] |
| Saban **Zone Open / Zone Alert** | The safety away from the TE becomes the apex (strong hook in 2x2 with TE and slot) / the safety to the fullback-flow side becomes the apex | — | [Soran][soran] |
| Saban rotation calls | **Rita / Linda**: the safety rotates right or left | — | [MQ glossary][mq-gloss] |
| Ravens **Wasp vs Buzz** | Wasp = outside rotation (Rob/Lou); Buzz = inside rotation (Rita/Linda); **Sting** keys LB rotations off the Sam | — | [MQ glossary][mq-gloss] |
| Bradley **Zone X / Zone Y** | SS to the X side (as flat player) or the TE side (as hook). Only the SS and Will exchange jobs | — | [Bradley][bradley] |
| Fangio **Sally / Rose** | Cover 3 rotation direction calls | — | [MQ glossary][mq-gloss] |

### 7.3 Rip/Liz match (Saban/Belichick, 1990s Browns), rules vs 2x2

Origin: Saban and Belichick built it to play Cover 3 against Marino's four verticals while
keeping 8 in the box ([USA Rip/Liz][usa-ripliz], [Bradley][bradley]). "Match Right/Left" is the
same rules called to the opposite side ([MQ glossary][mq-gloss]).

| Player | Rule | Source |
|---|---|---|
| Corner | Press, then bail with a sideways shuffle, chin on the shoulder. **MOD on #1**: if #1 goes under within 5 yd, call "Under!" and zone to the deep third, eyeing #2. On a hitch with #2 vertical, call "**Smash**" | [Soran][soran], [USA Rip/Liz][usa-ripliz] |
| Apex (curl/flat) | **Man on #2 unless #2 goes under within 5 yd**: then call "Under", zone to the curl and rob #1. "**2 in the seam**": still vertical after 3 scootch steps. Eyes go EMOL → near back. **Fast 3** with #2 vertical or out: "**Sail**" (zone turn, fight for width not depth, flip to the flat once #3 out-leverages him). **Smash** call: leave #2 and "**Hunt 1**" (upfield hip of the hitch). Under call from #1: squeeze to the hook | [Soran][soran], [USA Rip/Liz][usa-ripliz] |
| Hooks | The only "zone-ish" players. Drop to about **10 yd inside #2**. If **#1 and #2 are both vertical, they have #3 to their side**; otherwise defend the hook deep to short. "**Final 3 through**": carry a check-releasing #3 to the flat. Against Fast 3 the strong hook floods to the curl and relates to the low-inside hip of #2, while the weak hook uses a "**bingo**" drop (open to the weak hook vs early in-routes, then push back strong). On an Under call: "**robot**" (roll to the middle to find the dig, match bottom-up) | [Soran][soran], [USA Rip/Liz][usa-ripliz] |
| Middle safety | 14 yd, pedal to 20, "MOF principle", stay near the midpoint so the divider rules hold | [USA Rip/Liz][usa-ripliz] |
| Against mesh / double under | Both hooks robot back to the hook area | [USA Rip/Liz][usa-ripliz] |

### 7.4 Cover 3 against trips

| Check | Rule | Source |
|---|---|---|
| **Mable / Skate** (Saban) | Strong CB: bail, man on all #1 vertical; if #1 is not vertical, take all of #2 vertical. Strong apex: man on #2 except under (then buzz to the flat); if #2 goes out, cut him underneath. Strong hook: takes #3 if he goes outside; if #3 is inside, push to the hook and take #2. Weak hook: defend all inside and deep cross by #3; if #3 is out, push to the hook. Weak apex: man on the RB if he flows weak; otherwise cut the first crosser. Weak CB: **MEG** | [Soran][soran] |
| **"3 up is 3"** | Against 3x1 the weak hook turns to man if #3 goes vertical. Bradley installs it on day 1: the hook opposite the passing strength **always** takes #3 vertical | [MQ glossary][mq-gloss], [Bradley][bradley] |
| Pettine trips Cover 3 (behind the "Favre" sim pressure) | Trips CB: loose man on #1 unless #1 runs a shallow within **2–3 yd**, then zone the deep third. Curl/flat: "Rip/Liz or **gone**", meaning man on #2 if he is vertical, outside, or breaking inside deeper than the LBs, and zoning off on an under break of 5 yd or less. Strong hook: outside #3, angle pedal to **~10 yd**, underneath only (stick, #3 option, #2's 5-yd in, shallow from weak #1), **no vertical job**. Weak hook: straight back just outside the hash to **~10 yd**, plays #3's bender (**man turn**) or the weak #1 dig (**zone turn**); by game plan he reads weak #1's release first. FS: **lean post on #3**, owning #3 vertical and #3's corner route, the "most unfavourable" combination | [USA 3 sim][usa-3sim] |
| Weak-hook layering | MatchQuarters' Texans clinic covers "3-up" vs "2-up / vertical hook" defenders (paywalled) | [MQ weak hook][mq-weakhook] |
| Robot | The LB away from trips turns and runs with #3's deep over, blind to the QB | [Bullock Cover 3][bullock-c3] |
| **Tex** | **Not found** as a Cover 3 trips check. "TEX" is a DL stunt (§9.5). If the request meant a specific playbook, the term is local | — |

### 7.5 Cover 3 Seam (PFF label) and seam alerts

- **PFF "Cover-3 Seam":** Cover 3 in which curl/flat defenders key #2 and carry him on vertical
  or out-breaking routes (Fantasy Points' description, page 404 at fetch time, snippet). Repo
  data: 5.3% of 2022 dropbacks. Its most common role set (64%) is the base 4-under/3-deep
  `3L 3M 3R CFL CFR HCL HCR RUSHx4`, and the safeties play curl/flat on 42% of their Seam
  snaps, against 36% in plain Cover-3 [repo BDB2025]. It is the label closest to Rip/Liz match and Fangio's 9.
- **Bradley's "Seam" alert:** with two verticals to his side, the SS tells the near LB the flat
  is open and tells the FS to cheat to the other side ([Bradley][bradley]).
- **Bradley corner techniques:** "**Read**" is MOD against a single receiver: man-turn on any
  vertical, zone off if he goes under. Bradley notes this is often a separate call elsewhere,
  "most commonly … 'Cover 3 Mable'". "**Zebra**" is true zone against multiple vertical threats
  ([Bradley][bradley]).

### 7.6 Cover 3 "Hole" (3-under, 3-deep)

PFF's role sets show a distinct Cover 3 shape, `3L 3M 3R CFL CFR HOL RUSHx5`: two seam/curl-flat
players and one middle hole defender behind **5 rushers**. It is **24.8% of PFF Cover-3**
dropbacks [repo BDB2025]. This is the fire-zone coverage in §9. The base 4-under shape is 45%.

### 7.7 What beats Cover 3

Four verticals and seams; floods (three levels to one side); the sail route against a flat
defender who doesn't sink ("sail technique" counter); Y-cross; and #3 on a corner route against
trips ([Bullock Cover 3][bullock-c3], [USA 3 sim][usa-3sim]).

**Usage:** about 32% of dropbacks in 2022–23 and about 28% in 2025 (§0.4). Cover 3 runs with a
5+ rush on 34% of its snaps [repo BDB2025]. In 2020, Bradley's Chargers played Cover 3 on 55.7%
of snaps and Staley's Rams on 35.2% ([PFF Staley][pff-staley]).

---

## 8. Cover 1 variants (and Cover 0, 2-Man)

### 8.1 Base Cover 1 (man-free) and leverage

| Player | Rule | Source |
|---|---|---|
| Corners | **Outside** shade, funneling inside to the FS and the hole player. Off-man at **7–8 yd** with a **flat-foot read** (no backpedal until the 3-step threat clears). Against a "**plus**" split (#1 2–3 yd outside the top of the numbers), align with an **inside** shade and use the sideline | [Bowen Cover 1][bowen-c1] |
| FS | Deep middle. Gain depth, split the formation, close the seam/post, and get over the 9 route by the **bottom of the numbers** | [Bowen Cover 1][bowen-c1], [Bowen man pressure][bowen-manp] |
| SS / nickel | Man #2 or the TE from outside leverage, driving to the TE's hip | [Bowen Cover 1][bowen-c1] |
| LBs | "First back strong, first back weak". If their back blocks: green dog (rush) or zone up | [Bowen Cover 1][bowen-c1] |
| Hole player | The Mike or a robber safety, against inside crossers and Hi-Lo | [Bowen Cover 1][bowen-c1] |

### 8.2 Variants

| Variant | Who is the free (hole) player | Source |
|---|---|---|
| **Saban "1" (Robber)** | A **Rat** in the hook area eyeing the QB. On a scramble he mirrors the QB horizontally until the QB crosses the LOS, then plays run. **Funnel** in one-back sets: two players eye the RB, the near-side player takes him and the other becomes the Rat (the Rat drops from the side the QB isn't reading). **Cut rules**: the Rat cuts the first crosser | [Soran][soran], [MQ glossary][mq-gloss] |
| Saban 2x2 / 3x1 assignments | 2x2: CBs on #1, apexes on #2 (outside leverage), hooks Funnel. 3x1: CBs on #1, strong apex on #2, strong hook on #3 (outside leverage), weak hook and weak apex Funnel | [Soran][soran] |
| Saban **1 Invert / 1 Funnel / 1 Clue / 1 Cross / 1 Alert** | TE-side safety down to the apex / TE-side safety down to the hook / safety opposite the RB down to the hook / safety opposite the RB as **robber at the sticks** / safety to the fullback-flow side down to the apex | [Soran][soran] |
| Fangio **Robber / Lurk / Hole / Thief** | See §6.2 | [MQ glossary][mq-gloss], [BGN pt 3][bgn3] |
| **Cover 1 Double / 1 Double / Vice / Stealer** | A safety (or the hole player) **doubles a designated receiver** while the other safety plays the middle third. Belichick: "match your best on their second-best and double their best", using game-plan labels by jersey (13, 14, 84, 87). Venables "Vice" is man-free with a pre-set double. PFF label "Cover-1 Double" = 0.5% of 2022 dropbacks | [Kou Patriots][kou-pats], [Kou UW][kou-uw], CBS (snippet), [MQ glossary][mq-gloss], [repo BDB2025] |
| **Cover 1 Cross** | Saban: the safety opposite the RB comes down as a robber at the sticks ([Soran][soran]). Saban glossary: the safety opposite the STAR or trips becomes the Rat ([MQ glossary][mq-gloss]). BGN: what Fangio calls "Hole", "many other teams call Robber or Cross" ([BGN pt 3][bgn3]) | — |
| **Cover 1 "Jump"** | The FS cuts a short-motion or shallow receiver and the corner replaces him deep middle | [Bowen Cover 1][bowen-c1] |
| Patriots menu | Man free with 5-man rush; 3-man rush with 2 rats and a middle-third safety; CB as robber on the 1-WR side; safety and Sam exchange on #2 crossing; Cover 0 six-man with a late dropper | [Kou Patriots][kou-pats] |
| 49ers "**Cover-1 rat**" from a quarters shell | The Mike mugged in the A gap becomes the low-hole rat; a wide-5 LB as the 4th rusher (sim) | [WCF 49ers][wcf-49] |

### 8.3 Rush-coverage interaction terms

| Term | Rule | Source |
|---|---|---|
| **Green dog** | The man defender on a back or TE rushes when his man blocks. Cover 0/1. Can turn a 5-man call into 7 rushers | [Bowen man pressure][bowen-manp] |
| **Hug / hug rush** | Man pressure that attacks the back in protection ("spike" path, spilling slide-lock protection). Bartee's Cone backer adds to the rush "hugging the LOS" if the back blocks. Kuchinski (X&O, snippet): the hug rusher is the blitzer assigned to the RB who fits inside him | [MQ Hug][mq-hug], [USA Cover 7 pt 1][usa-c7a] |
| **Peel** | An edge rusher buys the RB in coverage if the back releases (swing), otherwise keeps rushing. Built into many zero pressures. Saban/Venables "peel rules" | [Bowen man pressure][bowen-manp], [USA Mug][usa-mug] |
| **Share rush** | Edge rushers "peel and eat" flaring backs without losing contain (title-level only, paywalled) | [MQ Hug][mq-hug] |
| **Hot / sight adjust** | The receiver converts to a quick route (slant, hitch, quick out, smoke) against pressure. DBs use a flat-foot read to drive on it | [Bowen man pressure][bowen-manp] |

### 8.4 Cover 0

- **Leverage:** inside shade, no middle help, the sideline is the help. Under Strike Closed Zero
  example: a 6-man rush, the FS on the TE, Mike and Will on the backs, and the corners on the
  WRs from inside ([Bowen man pressure][bowen-manp]).
- **Disguise:** shown from a Cover 4 look. The 49ers dropped a **DT into the underneath hole**
  while both LBs blitzed ([Bowen man pressure][bowen-manp]).
- **Usage:** 3.6% (2022) and 4.3% (2023) of dropbacks. **33.6% of goal-to-go (≤5)** and 7.7% of
  3rd/4th-short dropbacks. Rushers: 6+ on 55%, 5 on 31%, and **4 on 14%** (zero with
  droppers) [repo BDB2025, BDB2026]. Top role sets: `MANx5 RUSHx6` 30%, `MANx4 RUSHx7` 15%,
  `HOL MANx5 RUSHx5` 14% [repo BDB2025].

### 8.5 Usage of Cover 1

20.6% of dropbacks plus Double 0.5% in 2022, and 22.8% in 2023 [repo]. The rush is 4 on
53.5%, 5 on 33.1% and 6+ on 10.3%. Top role sets are `DF HOL MANx5 RUSHx4` (41%) and
`DF MANx5 RUSHx5` (27%) [repo BDB2025]. Cover 1 is **43.1%** of 3rd/4th-and-medium dropbacks
and 39.1% of 3rd/4th-and-short (situation buckets in `data/bdb2025-summary.json`).

---

## 9. Pressure: fronts, blitzes, simulated pressure, and stunts

### 9.1 How often NFL defenses pressure

| Measure | Value | Source |
|---|---|---|
| 5+ rushers, 2022 wk 1–9 | **28.0%** of dropbacks. 6+ = 5.8%, exactly 4 = 67.5%, ≤3 = 4.4% | [repo BDB2025] |
| 5+ rushers, 2024 / 2025 | **26.8% / 28.9%** (5,390 plays in 2025) | [FTN rushers][ftn-rush] |
| FTN blitz, new 2025 definition (any off-ball LB or DB rushes) | **29.5%**; 1,047 "blitzes" that rushed only four | [FTN rushers][ftn-rush] |
| PFF blitz rate by personnel, 2025 | Base 30.2%, nickel 29.6%, dime 22.6% | [PFF blitz][pff-blitz] |
| Four-man rush share, long run | 62% of pass plays (2006) → 65% (2020). Rushes of 3 or fewer were about 6% of snaps in the early 2000s | [PFF 3-man][pff-3man] |
| Simulated pressure | Team frequency leaders about **12%** (TB, BAL, MIA 12.4%; MIN 12.1%; JAX 11.1%; LAR 10.8%; SEA 9.8%; PHI 9.3%). Raiders 2.3%. Sim = at least one LB or DB rushes **and** at least one DL/edge drops | [FTN rushers][ftn-rush] |
| Simulated pressure, 2022 (repo definition: ≤4 rushers, an off-ball LB/CB/S rusher, a front player dropping) | 1.5% of dropbacks when the dropper must be a DE/DT/NT; **5.2%** when edge OLBs count as droppers | [repo BDB2025] |
| Highest blitz rate | Vikings (Flores) **51.2%** in 2025 (FTN; he led in 2021, 2023, 2024 and 2025) | [FTN rushers][ftn-rush] |
| Pressure rate by call, 2022 | 4-man standard 30.7%; sim 36.1% (n=144); 5+ blitz 42.6% | [repo BDB2025] |

### 9.2 Pressure taxonomy (per-player structure)

| Pressure | Rush | Coverage behind it | Per-player structure | Source |
|---|---|---|---|---|
| **Fire zone** (zone blitz) | 5 | **3 deep, 3 under** (§7.6) | Corners: "Fire Zone 1/3", keep outside leverage; buy #1 vertical "no questions asked", otherwise pass him to the seam/flat player and wait for #2 vertical. Rotated safety: deep middle, **owns #3 vertical**. Two **seam/flat** players (often a dropping DE and an LB): take #2 and carry him vertically until #3 threatens the flat, then hand #2 to the hook and run to the flat. Hook: plays #3 to both sides. Example timing: the FS hits the weak B gap only after the DE's long scoop clears | [Bowen zone blitz][bowen-zb] |
| Saban "Fire Zone" | 5 | Corners **man** on #1 (aggressive on hot routes), the rest Cover 3/6 rules | Apex: man on #2 unless under within 5 yd, must wall #2's inside release; against 3x1 with #3 out, takes #3 to the flat and passes #2 to the hook. Hook: middle hook in 2x2; in 3x1, drops to the trips side with all of #3 vertical (or #2 man if #3 goes out) | [Soran][soran] |
| **2-deep fire zone** ("2-steal") | 5 | 2 deep, 4 under | See §2.1 (Knowles). Heacock Cali Blaze and Wyoming Blaze are 4-under, 2-deep pressures. Venables "Trap" is a fire-zone Cover 2 against 3x1 | [Buckeye Huddle][bh-2steal], [MQ glossary][mq-gloss] |
| **Hot** | 6 | **3 deep, 2 under**, vision-based; it "shifts based on how the QB opens" | Narduzzi/Dantonio (Michigan State); Flores's "Hawk" is an updated version | [USA Mug][usa-mug], [MQ Flores][mq-flores], [MQ glossary][mq-gloss] |
| **Simulated pressure / creeper** | 4 | A full 7-man shell (Cover 3 match, Quarters, Cover 1, Tampa, Cover 6) | An LB or DB rushes in exchange for dropping a DL. **Fire 3**: the **SS comes off the edge and the boundary DE/OLB drops**. Toney: "the quarterback feels like he's being rushed… but it's really a four-man rush" | [USA Fire 3][usa-fire3], [Hoover Fire 3][hoover-fire3], [Hogs Haven][hogs-creep] |
| Sim behind Cover 3 ("Favre", Pettine/Rex Ryan) | 4 | Cover 3 with trips rules (§7.4) | "F" = field pressure | [USA 3 sim][usa-3sim] |
| Fangio **Whip / Slug** | 4 | 4-under, 3-deep | Simulated zone pressure away from / from the nickel side | [MQ glossary][mq-gloss] |
| **Zero blitz** | 6+ | Cover 0 | §8.4 | [Bowen man pressure][bowen-manp] |
| **Cover 1 pressure** | 5–6 | Man free | Outside leverage funneling to the post | [Bowen man pressure][bowen-manp] |

**Sources disagree on creeper vs sim.** Hoover ([Hoover Fire 3][hoover-fire3]) treats
"Creeper/Simulated Pressure" as one term. Hogs Haven credits Dave Aranda with the creeper and
says fire zones go back to LeBeau ([Hogs Haven][hogs-creep]). FTN counts a sim only when a
lineman drops, which is narrower than "any non-traditional rusher" ([FTN rushers][ftn-rush]).

### 9.3 Mug fronts and protection stress

- **Mug:** an LB aligned over the center in an A gap, creating a 5- or 6-man front look.
  **Double mug:** two off-ball defenders in the A gaps ([MQ glossary][mq-gloss],
  [MQ Flores][mq-flores]).

| Offense's answer | Defensive counter | Source |
|---|---|---|
| **Fan** the OL and put the RB on an A-gap LB | Bull-rush the back. Use a "**Double Gum**" (DTs in the A gaps, LBs in the B gaps) so a bigger body hits the RB. **Read blitz**: both ILBs read the center; the one he pops toward jab-steps and drops while the other runs through the open A gap. **X-read**: the looper goes around and the other LB "picks the center's hip" | [USA Mug][usa-mug] |
| **Full slide** and put the RB on the DE | Drop both mugged LBs, leaving 5 OL sliding on 3 DL and the back on your best rusher | [USA Mug][usa-mug] |
| Middle screen or RB leak | DE peel rule; the blitzing LB stays square on the back | [USA Mug][usa-mug] |

- **Coverage behind mugs:** Cover 1 against 6, off-man DBs (speed outs and slants allowed, then
  tackle), or Hot (3-deep, 2-under) ([USA Mug][usa-mug]).
- **Flores data:** blitzed on **44%** of mugged presentations in 2023 (6+ rushers 44% → about a
  third in 2024 → 18% in 2025); 63% blitz on early downs vs 43% on 3rd down (2023); about 50%
  blitz on every down in 2025; 80 early-down double mugs in 2025 vs Baltimore's 78 total; 83%
  of double-mug looks in 11 personnel, with a 72% blitz rate ([MQ Flores][mq-flores]).
- **Bear front:** covered center and both guards (0-tech nose and two 3-techs) plus two edge
  rushers ([MQ glossary][mq-gloss]). The textbook (§17.3) covers its fits.

### 9.4 Edge and overload terms (selected)

- **Cat:** corner blitz, usually from the boundary.
- **Hawk:** both OLBs rush.
- **Smack / Slam:** Sam from outside the TE (Slam through the B gap) with Silver (man-free).
- **Fire:** all LBs blitz their gaps (Venables).
- **Ringo / Lucky:** direction of the zone pressure (Saban glossary).
- **Overload:** more rushers than blockers to one side; Bowen's Williams examples (§3.3) pair
  overloads with trap.

Sources: [MQ glossary][mq-gloss], [Bowen trap][bowen-trap].

### 9.5 Stunts and games

**Mechanics.** The **penetrator** goes first, attacking a gap or blocker to make adjacent
linemen commit or turn. The **looper** waits about a beat, crosses behind, and accelerates
through the lane. If the looper leaves too early the OL sees the exchange; too late and the ball
is out. The offense counters with square shoulders, connected spacing, a clean pass-off, quick
throws, screens and moving launch points ([Football Nation stunts][fn-stunt]). Stunts are
weaker against the run because they risk gap integrity ([Wikipedia stunt][wiki-stunt],
[Football Nation stunts][fn-stunt]).

| Name | Definition | Source |
|---|---|---|
| **T-E** (often called **TEX**) | Tackle first (penetrates or contains outside), end loops inside. Bowen's Tampa 2 diagram: "T: TEX with DE, contain rush, tackle stunts first. DE: scoop to the strong B gap". The Rock M Nation diagram has the tackle slant to C and the end loop to B | [Bowen Tampa 2][bowen-t2], [RMN stunts][rmn-stunt], [Football Nation stunts][fn-stunt] |
| **E-T** | End first (crashes inside, makes the OT turn), tackle loops outside | [Football Nation stunts][fn-stunt], [RMN stunts][rmn-stunt] |
| **T-N / N-T** (interior), **Nut** | Interior exchanges. Nut: nose and tackle penetrate the A and B gaps | [RMN stunts][rmn-stunt], [MQ glossary][mq-gloss] |
| **E/T/N** three-man loop | The end and tackle slant inside and the nose loops wide | [RMN stunts][rmn-stunt] |
| **Pirate** | 3-man: the end and tackle away from the call slant toward it and the nose loops for contain (Venables). Hoover: the 3- and 5-techs slant inside, the 1-tech checks run then loops for pass-rush contain; the LB must scrape over the top to C | [MQ glossary][mq-gloss], [Hoover DL3][hoover-dl3] |
| **Loop** | A DT takes 2 quick steps into his gap then loops across outside the 1-tech and 9-tech. He must come tight off the slanting DL against the run | [Hoover DL3][hoover-dl3] |
| **Pinch** | Two wide 5-techs pinch inside to the B gaps (aim at the OT's hip and run through him) while outside rushers come free | [Hoover DL3][hoover-dl3] |
| **Hi-Lo** | One edge takes an inside move, the other speed-rushes and comes back around behind | [Hoover DL3][hoover-dl3] |
| **Slash** | DL slant with the OLB vertical (e.g., "Lightning" from Under) | [Hoover DL3][hoover-dl3] |
| **Coffee house** | A change-up to T-E/E-T: a third lineman over the center loops to the backside so the center can't help the guard | [USA Football coffee house][usa-coffee] (snippet) |
| **Ram / Lion** | Aranda/Roberts and Todd Orlando: a **slant** right (Ram) or left (Lion) to strengthen run defense. Not a two-man twist | [MQ glossary][mq-gloss] |
| **Tag** | Stem to a 3-tech pre-snap, then spike to the A gap (Muschamp). Elsewhere, "TAG" or "Pirate" names a tackle's inside move (snippet) | [MQ glossary][mq-gloss] |
| **Twist** | A generic synonym for stunt or game; also called a "trade", or "having a game on" | [Wikipedia stunt][wiki-stunt] |
| **Pick** | The penetrator's job is to engage or obstruct the blocker who would pass the looper off. USA Football's X-read has the second LB "pick the center's hip". It must be legal: no holding | [USA Mug][usa-mug], [Football Nation stunts][fn-stunt] |
| Jimmy / Pony (Cover 7 tree) | Start in the gap of origin, then play the next gap inside once the ball declares (5-tech C→B; Pony: the 3- and 5-techs both) | [USA Cover 7 pt 2][usa-c7b] |

**Stunt frequency:** PFF charted stunts on **29.1%** of passing plays in 2017, then 28.0%,
28.7%, 25.5%, and **24.8%** in 2021. Offensive success rate was lower on stunt plays than on
non-stunt plays in every season (45.4% vs 48.5% in 2021), and offensive EPA was lower in
2017–2020; the 2021 EPA row was incomplete in the fetched table ([PFF stunts 2021][pff-stunt21]). Summing PFF's 2024 weeks 1–5 table together with the 2023 table
printed beside it gives about **27%** of dropbacks (derived from [PFF stunts 2024][pff-stunt24]).

---

## 10. Gaps and unverified points

1. **Zeus:** the exact rule against stacked or bunched targets and against empty was not found;
   the MatchQuarters detail is paywalled. Treat "target at #1 but in a stack" as Quads per
   Sumer's Ring note ("not in a stack"). This is an inference.
2. **Fangio Cover 8 vs 2x2 and empty**, and **Cover 9 Site/Quarters tools**: paywalled at
   [MQ Cover 8][mq-c8] and [MQ Cover 9][mq-c9].
3. **Tex** (Cover 3 trips check), **Nail** and **Tuff** as Fangio terms, **Stress** beyond the
   textbook, and **Cover 2 Invert as a Fangio/Staley call** were not found. **Cover 5** as split
   man/zone was not found.
4. **PFF "Cover-3 Seam"** is defined only through a snippet of a Fantasy Points glossary (the
   page returned 404 when fetched).
5. The **"37% off-ball sim pressure"** figure for the Eagles has no stated denominator. Fangio's
   2025 man rate conflicts between sources (44% vs Cover 1 18%).
6. The NFL numeral position relative to the sideline was not confirmed. The engine should
   parameterise "top of numbers".
7. Repo frequencies come from 2022 weeks 1–9 (PFF labels) and 2023 (BDB 2026). Both predate the
   2025 rise in Cover 6, which reached 14% in 2026 week 1 in PFF data cited by MatchQuarters.

### Mapping hints for the engine vocabulary (`src/playbook/types.ts`, read-only check)

These are behaviours from this file that the current `MatchRule` and `ZoneId` lists (which
include `palms_*`, `cloud_corner`, `sink_corner`, `tampa_mike`, `poach_safety`,
`stubbie_safety`, `invert_safety`, `rat`, `robber`) do not obviously cover:

| Proposed rule | Behaviour | Section |
|---|---|---|
| `cut_corner` | First-to-flat corner, Saban Cut | §1.3 |
| `wall2_apex` | Overhang carries #2 vertical, no flat push unless #3 is to his side | §1.4, §5.2 |
| `quarter_flat` | Fangio nickel: carry #2 vertical, push to the flat | §5.2 |
| `trix_safety` / `site_safety` | Backside safety reading #3/#2 or rotating to the RB | §5.3, §6.4 |
| `fist` / `pounder` | 2-Man safety reading direction | §1.5, §4.2 |
| `tuff` | Backside safety first-to-flat, corner deep third | §4.1 |
| `cone_safety` | Over-top-inside bracket on #1 or #2 | §4.1 |
| `jump` / `cut` FS | Cut the crosser, corner replaces deep | §4.1, §8.2 |
| `seam_flat` (fire zone) | Carry #2 until #3 threatens the flat | §9.2 |
| target resolver (Zeus / Lord / Ring) | Picks the coverage from where a jersey number aligns | §6.3 |

The 5-yard "under" window, 3-step counts, 12-yard handoff, the 5/1/bottom divider and the
position-maintenance line (§0) are natural tunable parameters.

---

## Source index

Fetched pages (curl to text, 2026-10-08) unless marked (snippet).

- [soran]: Cameron Soran, "Saban Pass Coverages" (reposted from riley-kolste football): https://sportstreatise.com/2021/01/saban-pass-coverages/
- [mq-gloss]: Cody Alexander, "Comprehensive Defensive Football Glossary" (Saban/Smart/Lanning, Muschamp, Fangio, Aranda/Roberts, Orlando, Heacock, Ravens 2.0, Gregg Williams, Venables sections): https://www.matchquarters.com/p/comprehensive-defensive-football-glossary
- [mq-zeus]: MatchQuarters, "What is the 'Zeus' Tag? Fangio Split-Field Defense Explained" (preview only): https://www.matchquarters.com/p/explaining-fangios-sub-zeus-tag
- [mq-c9]: MatchQuarters, "Fangio's Cover 9: The Eagles' Weak-Rotation Cover 3" (preview): https://www.matchquarters.com/p/fangio-cover-9-eagles-two-high-disguise
- [mq-c8]: MatchQuarters, "Fangio's Cover 8: Solving 3x1 Crossers from Two-High Shells" (preview): https://www.matchquarters.com/p/fangios-cover-8-trix-poach-mechanics
- [mq-6v8]: MatchQuarters, "What is Cover 6? Explaining Quarter-Quarter-Half and its Sister, Cover 8" (outline): https://www.matchquarters.com/p/what-is-cover-6-vs-cover-8-nfl-defense-explained-vic-fangio
- [mq-mac6]: MatchQuarters, "Mike Macdonald's Cover 6 Blueprint Against Drake Maye" (preview): https://www.matchquarters.com/p/mike-macdonald-cover-6-blueprint-drake-maye
- [mq-unlock]: MatchQuarters, "Unlocking the Fangio coverage system" (preview): https://www.matchquarters.com/p/unlocking-the-fangio-coverage-system
- [mq-c2]: MatchQuarters, "What is Cover 2?" (outline): https://www.matchquarters.com/p/what-is-cover-2-explaining-country-palms-and-tampa-cover-2
- [mq-eagles4]: MatchQuarters, "The Fangio Evolution: How Quarters Coverage Was Critical…" (preview): https://www.matchquarters.com/p/vic-fangio-quarters-coverage-eagles-scheme-2024
- [mq-rams2]: MatchQuarters, "How the Rams Use Closed-to-Open Cover 2 Traps" (preview): https://www.matchquarters.com/p/rams-closed-to-open-cover-2-traps
- [mq-panthers]: MatchQuarters, "Using Static Two-High Shells to Erase Pre-Snap Tells" (preview): https://www.matchquarters.com/p/panthers-defense-disguise-entropy-safety-steals
- [mq-taser]: MatchQuarters, "Locking the Mike in 3x1 Coverage" (Taser): https://www.matchquarters.com/p/locking-the-mike-in-3x1-coverage
- [mq-tampa]: MatchQuarters, "What is Tampa 2 Coverage?" (outline): https://www.matchquarters.com/p/what-is-tampa-2-coverage-and-nontraditional-tampas-ntts
- [mq-ntt]: MatchQuarters, "Explaining Non-Traditional Tampa 2's with the Minnesota Vikings" (outline): https://www.matchquarters.com/p/explaining-non-traditional-tampas-vikings-flores
- [mq-flores]: MatchQuarters, "Brian Flores and the Evolution of Vision Pressures" (preview): https://www.matchquarters.com/p/brian-flores-vikings-all-up-hawk-coverage
- [mq-hug]: MatchQuarters, "How to Build Hug and Shared Rush Mechanics" (outline): https://www.matchquarters.com/p/hug-rush-shared-rush-man-pressure-mechanics
- [mq-weakhook]: MatchQuarters, "Teaching the Weak Hook Defender" (outline): https://www.matchquarters.com/p/teaching-the-weak-hook-defender-houston-texans-buffalo-bills-demeco-ryans-nfl
- [syed]: Shawn Syed, "The Book of Fangio: Part II — Coverages & Pressures", The Read Optional (preview): https://www.readoptional.com/p/the-book-of-fangio
- [bgn2]: Bleeding Green Nation, "Vic Fangio Defense 101: Part 2 — MFO Coverages": https://www.bleedinggreennation.com/2024/8/15/24211869/vic-fangio-defense-101-part-2-mfo-coverages-eagles-defensive-coordinator-scheme-nfl
- [bgn3]: Bleeding Green Nation, "Vic Fangio's Defense 101: Part 3 — MFC Coverages": https://www.bleedinggreennation.com/2024/8/30/24215903/vic-fangio-defense-101-part-3-mfc-coverages-philadelphia-eagles-defensive-coordinator-scheme-nfl
- [sumer1]: SumerSports, "The Thursday Three — Week 1" (Cover 6 vs Cover 8): https://sumersports.com/the-zone/the-thursday-three-week-1/
- [sumer2]: SumerSports, "The Thursday Three — Week 2" (Zeus, Ring, Cover 2 Invert): https://sumersports.com/the-zone/the-thursday-three-week-2/
- [mmm-king]: Man Match Madden, "What is Roll King in Madden?" (Fangio Zeus/Lord mapping): https://manmatchmadden.substack.com/p/what-is-roll-king-in-madden
- [mmm-ring]: Man Match Madden, "What is Roll Ring in Madden?" (Ring, Fist, Pounder, Finger): https://manmatchmadden.substack.com/p/what-is-roll-ring-in-madden
- MGoBlog forum "What's 'Fangio'?" (403; snippet only): https://mgoblog.com/mgoboard/what%27s-fangio
- Honest NFL tweet on Ring (snippet only): https://x.com/TheHonestNFL/status/1962292890006102269
- [nate]: "Coverages", Nate S (Substack): https://nates441423.substack.com/p/coverages
- [alleyes9]: All Eyes DB Camp, "Cover 9 Explained": https://alleyesdbcamp.com/cover-9-explained/
- [alleyes-inv]: All Eyes DB Camp, "Coverages Explained: 2 Invert": https://alleyesdbcamp.com/coverages-explained-2-invert/
- [bowen-t2]: Matt Bowen, "Inside the playbook: the Tampa 2", NFP (article dated 2010): https://www.nationalfootballpost.com/2026/05/29/inside-the-playbook-the-tampa-2
- [bowen-c2s]: Matt Bowen, "NFL Draft: Breaking down the 'Cover 2' safety", NFP: https://www.nationalfootballpost.com/nfl-draft-breaking-down-the-cover-2-safety
- [bowen-2m]: Matt Bowen, "Breaking down Rodgers vs. the Giants 2-Man", NFP: https://www.nationalfootballpost.com/breaking-down-rodgers-vs-the-giants-2man
- [bowen-zb]: Matt Bowen, "Inside the playbook: the zone blitz", NFP: https://www.nationalfootballpost.com/inside-the-playbook-the-zone-blitz
- [bowen-c1]: Matt Bowen, "NFL 101: Introducing the Basics of Cover 1", Bleacher Report: https://bleacherreport.com/articles/2032934-nfl-101-introducing-the-basics-of-cover-1
- [bowen-c3]: Matt Bowen, "NFL 101: Introducing the Basics of Cover 3": https://bleacherreport.com/articles/2047445-nfl-101-introducing-the-basics-of-cover-3
- [bowen-c4]: Matt Bowen, "NFL 101: Introducing the Basics of Cover 4": https://bleacherreport.com/articles/2094989-nfl-101-introducing-the-basics-of-cover-4
- [bowen-trap]: Matt Bowen, "NFL 101: Introducing Trap Coverage": https://bleacherreport.com/articles/2486941-nfl-101-introducing-trap-coverage
- [bowen-manp]: Matt Bowen, "NFL 101: Breaking Down the Basics of Man Pressure": https://bleacherreport.com/articles/2140586-nfl-101-breaking-down-the-basics-of-man-pressure
- [owen-trap]: Throw Deep Publishing, "Installing Trap Coverage: Techniques and Coaching Points" (Dan Owen clinic): https://throwdeeppublishing.com/blogs/news/installing-trap-coverage-techniques-and-coaching-points
- [glaz-c2s]: Glazier Clinics, "Cover 2 Safety Play Mastery" (Josh Christian-Young): https://glazierclinics.com/football-coach-resources/cover-2-safety-play-mastery-5-essential-drills-that-prevent-big-plays
- [ilkin]: Steelers.com, "Ilkin explains cover-2 concepts": https://www.steelers.com/news/ilkin-explains-cover-2-concepts-15585561
- [usa-ripliz]: USA Football, "High School Coordinator Explains the Details of Rip/Liz Coverage" (Kyle Cogan): https://blogs.usafootball.com/blog/7272/high-school-coordinator-explains-the-details-of-rip-liz-coverage
- [usa-c7a]: USA Football, "College Coach details Quarters coverage" (Dante Bartee, Cover 7 part 1): https://blogs.usafootball.com/blog/7382/college-coach-details-quarters-coverage
- [usa-c7b]: USA Football, "College Coach details Quarters coverage (Part 2)": https://blogs.usafootball.com/blog/7422/blank
- [usa-3sim]: USA Football, "How to play Cover 3 behind a Simulated Pressure": https://blogs.usafootball.com/blog/7544/how-to-play-cover-3-behind-a-simulated-pressure
- [usa-fire3]: USA Football, "Fire 3 Simulated Pressure" (Barry Hoover): https://blogs.usafootball.com/blog/7377/fire-3-simulated-pressure
- [usa-mug]: USA Football, "Using Double Mug Pressure to Create Strategic Advantages": https://blogs.usafootball.com/blog/6893/using-double-mug-pressure-to-create-strategic-advantages
- [usa-coffee]: USA Football, "How the coffeehouse stunt can help your defense" (snippet): https://blogs.usafootball.com/blog/6442/how-the-coffeehouse-stunt-can-help-your-defense
- [hoover-fire3]: Coach Hoover, "Fire 3 Creeper/Simulated Pressure": https://coachhoover.blogspot.com/2019/07/fire-3-simulated-pressure.html
- [hoover-dl3]: Coach Hoover, "DL Stunts — Part 3": https://coachhoover.blogspot.com/2014/06/dl-stunts-part-3.html
- [bradley]: Tape Don't Lie, "Gus Bradley Defense Primer: Part 1": https://tapedontlie.substack.com/p/gus-bradley-defense-primer-part-1
- [bullock-c3]: Mark Bullock, "Washington Coverages Part 1: Cover-3": https://markbullock.substack.com/p/washington-coverages-part-1-cover
- [apc-inv]: Acme Packing Company, "Packers film room: Breaking down the defense's use of Cover-2 Invert": https://www.acmepackingcompany.com/2022/1/8/22873245/packers-film-room-breaking-down-the-defenses-use-of-cover-2-invert
- [wcf-49]: West Coast Football, "49ers 2 deep coverages and disguised 2 deep coverages…": https://westcoastfootball.substack.com/p/week-2-49ers-2-deep-coverages-versus-seattle
- [kou-trips]: Coach Kou, "Defending Trips — Defending 3x1 with Zone Coverage Concepts": https://coachkoufootball.substack.com/p/defending-trips-defending-3x1-with
- [kou-minter3]: Coach Kou, "Michigan Football Jesse Minter Defense — Cover 3 Variations": https://coachkoufootball.substack.com/p/michigan-football-defense-cover-3
- [kou-pats]: Coach Kou, "Bill Belichick: Patriots Pass Defense: Man to Man Coverage Concepts": https://coachkoufootball.substack.com/p/patriots-pass-defense-concepts-man-to
- [kou-uw]: Coach Kou, "Some Concepts of the Washington Huskies Football Defense under Coach Belichick": https://coachkoufootball.substack.com/p/some-concepts-of-the-washington-huskies
- [tn-split]: Tomahawk Nation, "Whiteboard Wednesday: Split Field Coverage": https://www.tomahawknation.com/florida-state-football-fsu-noles/2020/4/1/21200575/whiteboard-wednesday-split-field-coverages-fsu-florida-state-seminoles-football-scouting-analysis
- [bh-2steal]: Buckeye Huddle, "Defensively Speaking: Purdue" (2-steal blitz): https://buckeyehuddle.com/2024/11/14/defensively-speaking-purdue
- [ftn-rush]: FTN, "2025 Defense by Number of Pass Rushers: The Vikings Go Nuts": https://ftnfantasy.com/nfl/2025-defense-by-number-of-pass-rushers-the-vikings-go-nuts
- [pff-blitz]: PFF, "NFL Blitz Rates and Pressure Trends: 2026 Analysis": https://www.pff.com/news/fantasy-football-emerging-blitz-trends-and-scheme-rates
- [pff-3man]: PFF (Seth Galina), "The three-man rush is changing football as we know it": https://www.pff.com/news/nfl-galina-the-three-man-rush-is-changing-football-as-we-know-it
- [pff-stunt21]: PFF, "How effective are stunts and should NFL defenses be using them more?": https://www.pff.com/news/nfl-how-effective-are-stunts-and-should-nfl-defenses-be-using-them-more
- [pff-stunt24]: PFF, "Stunt Success Rate through Week 5": https://www.pff.com/news/nfl-stunt-success-rate-week-5
- [pff-staley]: PFF, "Multiple and Aggressive: How Brandon Staley will fit the Los Angeles Chargers' personnel": https://pff.com/news/nfl-brandon-staley-los-angeles-chargers-personnel-defensive-scheme
- [pff-trends]: PFF, "How the NFL is Evolving: Five schematic trends that have shaped the 2025 season" (snippet): https://www.pff.com/news/nfl-is-evolving-five-schematic-trends-that-have-shaped-the-2025-season
- [sharp-2high]: Sharp Football Analysis, "What NFL Defenses Need To Learn From Brandon Staley & Vic Fangio…": https://www.sharpfootballanalysis.com/analysis/two-high-shell-staley-fangio-nfl-defense-2021/amp/
- [no-staley]: neworleans.football, "Brandon Staley's defense could give the Saints…": https://neworleans.football/article/staley-defense-scheme
- [fn-stunt]: Football Nation, "What Is a Defensive Stunt in Football? T-E Games Explained": https://www.footballnationusa.com/post/what-is-a-defensive-stunt-in-football
- [rmn-stunt]: Rock M Nation, "Film Room: Defense 2020 Part Two — Stunts": https://www.rockmnation.com/2020/5/21/21190196/film-room-defense-2020-part-two-stunts-twists-trap-spill-box-line-linemen-end-tackle-nose-game
- [wiki-stunt]: Wikipedia, "Stunt (gridiron football)": https://en.wikipedia.org/wiki/Stunt_(gridiron_football)
- [hogs-creep]: Hogs Haven, "Jeepers, creepers and the future of defensive obfuscation": https://www.hogshaven.com/2020/3/30/21196545/jeepers-creepers-and-the-future-of-defensive-obfuscation
- [wikifield]: Wikipedia, "American football field" (hash dimensions; via search summary): https://en.wikipedia.org/wiki/American_football_field
- [xol-fsu]: X&O Labs, "Florida State's Two-Match Coverage with Invert Principles" (403; snippet): https://www.xandolabs.com/?p=139898
- [xol-dulin]: X&O Labs, Abilene Christian "Cover 8" (Darian Dulin) (403; snippet): https://www.xandolabs.com/?p=9644
- [repo BDB2025]: `out/nfl-ref/defense-calls.json` (ignored; from `scripts/data/bdb2025_defense_calls.py`) and committed `data/bdb2025-summary.json`, NFL 2022 weeks 1–9, PFF labels.
- [repo BDB2026]: committed `data/bdb2026-summary.json`, NFL 2023 pass plays.

[soran]: https://sportstreatise.com/2021/01/saban-pass-coverages/
[mq-gloss]: https://www.matchquarters.com/p/comprehensive-defensive-football-glossary
[mq-zeus]: https://www.matchquarters.com/p/explaining-fangios-sub-zeus-tag
[mq-c9]: https://www.matchquarters.com/p/fangio-cover-9-eagles-two-high-disguise
[mq-c8]: https://www.matchquarters.com/p/fangios-cover-8-trix-poach-mechanics
[mq-6v8]: https://www.matchquarters.com/p/what-is-cover-6-vs-cover-8-nfl-defense-explained-vic-fangio
[mq-mac6]: https://www.matchquarters.com/p/mike-macdonald-cover-6-blueprint-drake-maye
[mq-unlock]: https://www.matchquarters.com/p/unlocking-the-fangio-coverage-system
[mq-c2]: https://www.matchquarters.com/p/what-is-cover-2-explaining-country-palms-and-tampa-cover-2
[mq-eagles4]: https://www.matchquarters.com/p/vic-fangio-quarters-coverage-eagles-scheme-2024
[mq-rams2]: https://www.matchquarters.com/p/rams-closed-to-open-cover-2-traps
[mq-panthers]: https://www.matchquarters.com/p/panthers-defense-disguise-entropy-safety-steals
[mq-taser]: https://www.matchquarters.com/p/locking-the-mike-in-3x1-coverage
[mq-tampa]: https://www.matchquarters.com/p/what-is-tampa-2-coverage-and-nontraditional-tampas-ntts
[mq-ntt]: https://www.matchquarters.com/p/explaining-non-traditional-tampas-vikings-flores
[mq-flores]: https://www.matchquarters.com/p/brian-flores-vikings-all-up-hawk-coverage
[mq-hug]: https://www.matchquarters.com/p/hug-rush-shared-rush-man-pressure-mechanics
[mq-weakhook]: https://www.matchquarters.com/p/teaching-the-weak-hook-defender-houston-texans-buffalo-bills-demeco-ryans-nfl
[syed]: https://www.readoptional.com/p/the-book-of-fangio
[bgn2]: https://www.bleedinggreennation.com/2024/8/15/24211869/vic-fangio-defense-101-part-2-mfo-coverages-eagles-defensive-coordinator-scheme-nfl
[bgn3]: https://www.bleedinggreennation.com/2024/8/30/24215903/vic-fangio-defense-101-part-3-mfc-coverages-philadelphia-eagles-defensive-coordinator-scheme-nfl
[sumer1]: https://sumersports.com/the-zone/the-thursday-three-week-1/
[sumer2]: https://sumersports.com/the-zone/the-thursday-three-week-2/
[mmm-king]: https://manmatchmadden.substack.com/p/what-is-roll-king-in-madden
[mmm-ring]: https://manmatchmadden.substack.com/p/what-is-roll-ring-in-madden
[nate]: https://nates441423.substack.com/p/coverages
[alleyes9]: https://alleyesdbcamp.com/cover-9-explained/
[alleyes-inv]: https://alleyesdbcamp.com/coverages-explained-2-invert/
[bowen-t2]: https://www.nationalfootballpost.com/2026/05/29/inside-the-playbook-the-tampa-2
[bowen-c2s]: https://www.nationalfootballpost.com/nfl-draft-breaking-down-the-cover-2-safety
[bowen-2m]: https://www.nationalfootballpost.com/breaking-down-rodgers-vs-the-giants-2man
[bowen-zb]: https://www.nationalfootballpost.com/inside-the-playbook-the-zone-blitz
[bowen-c1]: https://bleacherreport.com/articles/2032934-nfl-101-introducing-the-basics-of-cover-1
[bowen-c3]: https://bleacherreport.com/articles/2047445-nfl-101-introducing-the-basics-of-cover-3
[bowen-c4]: https://bleacherreport.com/articles/2094989-nfl-101-introducing-the-basics-of-cover-4
[bowen-trap]: https://bleacherreport.com/articles/2486941-nfl-101-introducing-trap-coverage
[bowen-manp]: https://bleacherreport.com/articles/2140586-nfl-101-breaking-down-the-basics-of-man-pressure
[owen-trap]: https://throwdeeppublishing.com/blogs/news/installing-trap-coverage-techniques-and-coaching-points
[glaz-c2s]: https://glazierclinics.com/football-coach-resources/cover-2-safety-play-mastery-5-essential-drills-that-prevent-big-plays
[ilkin]: https://www.steelers.com/news/ilkin-explains-cover-2-concepts-15585561
[usa-ripliz]: https://blogs.usafootball.com/blog/7272/high-school-coordinator-explains-the-details-of-rip-liz-coverage
[usa-c7a]: https://blogs.usafootball.com/blog/7382/college-coach-details-quarters-coverage
[usa-c7b]: https://blogs.usafootball.com/blog/7422/blank
[usa-3sim]: https://blogs.usafootball.com/blog/7544/how-to-play-cover-3-behind-a-simulated-pressure
[usa-fire3]: https://blogs.usafootball.com/blog/7377/fire-3-simulated-pressure
[usa-mug]: https://blogs.usafootball.com/blog/6893/using-double-mug-pressure-to-create-strategic-advantages
[usa-coffee]: https://blogs.usafootball.com/blog/6442/how-the-coffeehouse-stunt-can-help-your-defense
[hoover-fire3]: https://coachhoover.blogspot.com/2019/07/fire-3-simulated-pressure.html
[hoover-dl3]: https://coachhoover.blogspot.com/2014/06/dl-stunts-part-3.html
[bradley]: https://tapedontlie.substack.com/p/gus-bradley-defense-primer-part-1
[bullock-c3]: https://markbullock.substack.com/p/washington-coverages-part-1-cover
[apc-inv]: https://www.acmepackingcompany.com/2022/1/8/22873245/packers-film-room-breaking-down-the-defenses-use-of-cover-2-invert
[wcf-49]: https://westcoastfootball.substack.com/p/week-2-49ers-2-deep-coverages-versus-seattle
[kou-trips]: https://coachkoufootball.substack.com/p/defending-trips-defending-3x1-with
[kou-minter3]: https://coachkoufootball.substack.com/p/michigan-football-defense-cover-3
[kou-pats]: https://coachkoufootball.substack.com/p/patriots-pass-defense-concepts-man-to
[kou-uw]: https://coachkoufootball.substack.com/p/some-concepts-of-the-washington-huskies
[tn-split]: https://www.tomahawknation.com/florida-state-football-fsu-noles/2020/4/1/21200575/whiteboard-wednesday-split-field-coverages-fsu-florida-state-seminoles-football-scouting-analysis
[bh-2steal]: https://buckeyehuddle.com/2024/11/14/defensively-speaking-purdue
[ftn-rush]: https://ftnfantasy.com/nfl/2025-defense-by-number-of-pass-rushers-the-vikings-go-nuts
[pff-blitz]: https://www.pff.com/news/fantasy-football-emerging-blitz-trends-and-scheme-rates
[pff-3man]: https://www.pff.com/news/nfl-galina-the-three-man-rush-is-changing-football-as-we-know-it
[pff-stunt21]: https://www.pff.com/news/nfl-how-effective-are-stunts-and-should-nfl-defenses-be-using-them-more
[pff-stunt24]: https://www.pff.com/news/nfl-stunt-success-rate-week-5
[pff-staley]: https://pff.com/news/nfl-brandon-staley-los-angeles-chargers-personnel-defensive-scheme
[pff-trends]: https://www.pff.com/news/nfl-is-evolving-five-schematic-trends-that-have-shaped-the-2025-season
[sharp-2high]: https://www.sharpfootballanalysis.com/analysis/two-high-shell-staley-fangio-nfl-defense-2021/amp/
[no-staley]: https://neworleans.football/article/staley-defense-scheme
[fn-stunt]: https://www.footballnationusa.com/post/what-is-a-defensive-stunt-in-football
[rmn-stunt]: https://www.rockmnation.com/2020/5/21/21190196/film-room-defense-2020-part-two-stunts-twists-trap-spill-box-line-linemen-end-tackle-nose-game
[wiki-stunt]: https://en.wikipedia.org/wiki/Stunt_(gridiron_football)
[hogs-creep]: https://www.hogshaven.com/2020/3/30/21196545/jeepers-creepers-and-the-future-of-defensive-obfuscation
[wikifield]: https://en.wikipedia.org/wiki/American_football_field
[xol-fsu]: https://www.xandolabs.com/?p=139898
[xol-dulin]: https://www.xandolabs.com/?p=9644
