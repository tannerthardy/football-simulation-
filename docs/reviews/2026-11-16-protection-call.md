# The protection call, as taught, against what PRO_CALL does (design note, 2026-11-16)

Rules + Coaching, for Integration and Flex. Report only: nothing is built. It is parked behind the pocket work and gets
built with Flex later.

## Why now

Flex's BOX_DEPTH (counting the box to 5 yd, on BACK_CHECK) failed its blitz gate twice and is stopped. The record is in
`docs/reviews/patches/box-depth-846bebd4-attempts1-2-STOPPED.patch` on `claude/quirky-franklin-9lbwbp`.
- **Attempt 1** declared the 3.5-5 yd backers with the line, big on big, at the snap. Lineman pickups went 66 → 28% and free
  blitzers 3 → 23% (576 staged blitz plays).
- **Attempt 2** changed only the count. The coordinator handed a coming Will to the counted-in back, who could not get
  there: will_b sacks 1 → 7, lineman pickups of the Will 93 → 79%.
- **NFL** (`back-release.py`): a backer at 1.5-5 yd barely changes whether or when a back releases (route 65 vs 68%,
  release p50 1.80 vs 1.70 s).

So the missing piece is not the depth of the count. It is the call: who has whom, by what rule.

## Sources and their strength

- **Page:** checked against the page this session; the quote is exact.
- **Summary:** a search summary only (the page was paywalled, blocked or not fetched); not cited for a build.

| source | strength | what it gives |
|---|---|---|
| Queer Football Breakdowns, "Half Slide Protection Review" (Substack) | page | half slide's sides, the back's dual read, the Mike call, hot and sight |
| Mark Ring, "Pass Protection Scheme 101, Part 2" (blog, 2014) | page | full slide vs half slide; the slide's gap ownership; the back's inside-out read |
| Youth Football Online, "Protect Your Quarterback With the Half Slide" | page | the slide side includes the centre; the back's job; "avoid setting to no body" |
| XandOLabs (Ellis; "Identifying and Blocking Pressure in 6-Man Protection"; Sight Adjustment Study), First Down Playbook ("Hot: you better know how"), Eleven Warriors forum | summary | the hot/sight receiver knows which defender makes him hot; the centre usually carries the Mike in man protection |

## What is taught

### 1. Three families: slide, man (big on big / BOB), and half slide

- **Full slide (zone):** "a six-man protection where the entire offensive line 'slides' in one direction or another"
  (Ring). Each lineman is "responsible for the space 'from their nose to the nose of their partner'" (Ring). He blocks a
  gap, whoever comes through it. "Normally, a RB/FB will fill on the side away from the slide" (Ring).
- **Man / BOB:** "Offensive linemen will block the nearest defensive player on the line"; "the BOB side will primarily
  step towards wherever the nearest defensive lineman is" (QFB). The backs take the backers.
- **Half slide:** "A combination of man on one side, and slide on the other" (Ring).
  - "To your call side, or play side, your offensive line and the lone back will execute BOB or man protection. To the
    backside of your call, the line will slide protect" (QFB).
  - "There is a slide side and a man side. The slide side includes the Center" (YFO).
  - Who is in the slide: "Whoever is inside of that first open gap is in the slide. Whoever is outside of that first open
    gap is BOB protecting" (QFB); "the slide would start with the first uncovered OL" (Ring).

### 2. The Mike identification sets who has whom

- "This is a protection where calling a 'Mike' or middle linebacker-type is necessary in most situations"; "Changing who
  the Mike is can be as easy as simply saying 'Number X is the Mike!'" (QFB).
- The ID moves the line and the back together. With the base call "the line now 'slides to' the Mike, and they are
  responsible for that defender"; "The back will read Will to Sam, instead of Mike to Sam" (QFB).
- In man protection the centre usually carries the Mike (summary).

### 3. The back: a side, and a dual read inside-out

- "The back reads the inside or Mike backer through the outside linebacker (always protect the inside first)" (QFB);
  "The RB would have the Mike to the Will inside out" (Ring).
- His keys are two backers on his side, read inside first, not one named man. "If both blitz, the back picks up the
  Mike, and the Sam goes free" (QFB).
- Against an inside blitz on the slide's seam, "the RB must be a stud and forcefully step up to meet the inside blitz"
  (Ring).
- In a slide protection: "The Running Back will fill in and take any blitzing threat or the third down lineman" (YFO).

### 4. One more than the call can take: hot and sight

- When the rush outnumbers the protection, "the QB needs to know to throw 'hot' or throw to the hot read receiver"
  (QFB).
- A sight adjustment: "If that defender blitzes, the QB immediately throws to that receiver" (QFB). In empty, "The QB now
  has to throw hot off the Mike, then Sam" (QFB).
- The hot receiver knows which defender makes him hot, and the ball goes where that blitzer came from (summary).
- The defender the back leaves free is the hot defender: the outside one of his two, once both come.

### 5. The man who does not come, comes late, or loops

- "The general rule is all linemen need to avoid setting to no body": the slide-side guard, "if he does not have an
  immediate or imminent threat he should help the Center against any A gap player" (YFO).
- On the slide side a late or looping backer is the gap's, whoever he is. The slide owns space, so a backer who comes
  late through a slide-side gap is picked up by whoever owns that gap (Ring's nose-to-nose rule).
- On the man side a late backer is still the back's, if he is one of his two.
- No checked source gives a separate rule for a delayed blitz; QFB names delayed blitzes and twists only as what a play
  action's aggressive set handles poorly. This is the thinnest part of the note.

## What PRO_CALL and assign.ts do today (develop e90c204c, `blocking.ts`, `assign.ts`)

| taught | ours |
|---|---|
| A family: slide side by gap, man side by man | **Neither.** `declare` is one ordered match of all five linemen to the rushers by lateral distance (a DP: a lineman matched to a rusher costs his lateral offset, +6 outside his zone of 2.8 yd, or 5.5 for a tackle). No lineman owns a gap; every match is a man. |
| The Mike ID moves line and back together | **None.** `boxThreats` counts every defender within 3.5 yd of the line and the linemen's width ±3.5 yd at the snap. The walked-up ones are "called" and enter the match with the down men. |
| The back's side and dual read, inside first | **One man, by distance.** A threat the match leaves over goes to the nearest free back (`left` → `sticky`). There is no side and no order. BACK_CHECK's keys (on its branch) are "up to two defenders off the line near his check gap", the nearest to his gap, not his side's two inside-out. |
| Hot when the rush is one more than the call | **No hot.** The QB has no count of who is left free. |
| The man who doesn't come: help ("not to no body"); late or looping: the gap's | **Partly.** A lineman the match leaves without a man helps (`how = 1`). A called threat stays his blocker's man until seen leaving or `CALL_HOLD` (0.6 s); then that lineman helps. A late backer is whoever the coordinator re-matches on the next solve (BLITZ_READ's "comes" rule), so there is no gap owner. |

## Why BOX_DEPTH failed, in these terms

- **Attempt 1** made the 3.5-5 yd backers men in the line's match. In the taught structure a backer is a man only for a
  back (man side) or nobody's until he enters a gap (slide side). Matching him to a lineman at the snap took that lineman
  off the down man he would have blocked, and off the gap the backer actually came through. Free blitzers rose 3 → 23%.
- **Attempt 2** counted the backers in and left them to the back. The coordinator's leftover rule gave the back whichever
  backer came, including the Will on the far side. Taught, the far-side backer is the slide's (his gap's owner) and the
  back has his side's two inside-out. Hence will_b's sacks.
- The NFL row fits the taught version: a backer in the box barely changes the back's release, because in half slide the
  back is already the man side's reader, and he leaves when his two don't come.

## The design this suggests (for the build with Flex; nothing built)

Everything below is from what the offence sees before the snap or reads after it. Nothing uses the defence's call.

1. **The call names a slide direction and a Mike.**
   - The Mike is the backer the centre identifies: the most dangerous second-level man in the box (QFB, Ring).
   - The slide goes toward the Mike or away from the back by concept (half slide: the back on the man side).
   - The call is made before the snap from alignment, and re-made on a late shift if the centre sees it (QFB's "Number X
     is the Mike!").
2. **The slide side owns gaps.** Each slide-side lineman owns the gap from his nose to his partner's (Ring). He blocks
   whoever enters it: a down man, a twister, a late or looping backer. With no one in his gap he helps inward, "not to no
   body" (YFO). This is the half that stopped attempt 1's failure: the line never chases a man off its gap.
3. **The man side is big on big.** Each man-side lineman has the nearest down man (QFB). The back has the man side's two
   backers, read inside first, Mike then Sam (or Will then Sam on the base call).
   - Under BACK_CHECK these two are his keys: the call hands them to him, in place of the nearest two to his gap.
   - He takes the inside one if both come.
4. **Hot.** When both of the back's two come, the outside one is free by the call (QFB: "the Sam goes free").
   - The QB knows that from the call, not from the defence: when he sees the outside backer come, the hot receiver on
     that side is his throw.
   - The receiver knows it too: his route converts to the hot from his own picture (First Down Playbook, summary).
   - This is the defence bringing one more than the call takes. It is answered by the throw, not by another blocker.
5. **Late, looping, and dropping.** These need no extra rule.
   - On the slide side, a late or looping backer is the gap owner's.
   - On the man side, a backer who drops frees the back (BACK_CHECK's "dropping"); one who comes late is still the back's
     (his count runs, then any "comes" brings him back).
   - BLITZ_READ's first-downhill-step rule stays the definition of "comes".

## Measure before building (each operator checked on a few plays first)

- **Protection family in the NFL** (BDB 2025, dropbacks with a back in protection): for each lineman, is his first
  contact the down man nearest him at the snap (man) or a man in the gap to one side (slide)? Do the five split into a
  slide side and a man side? This is an inferred category, so weaker evidence; check it on film first.
- **Who picks up a backer who blitzes**, by side of the back: the back, a slide-side lineman, or nobody. This is the
  direct test of attempt 2's failure.
- **Hot throws:** when two backers on the back's side both rush, how often the ball is out within 1.0 s, and to whom.
- **The same on the sim, off and with the build.** The gates are Flex's blitz set (`box-depth-blitz.mts`: mike_a, will_b,
  zero_6, fire_zone) and base set (`box-depth.mts`), unchanged.

## Open

- The slide direction's rule by concept (away from the back's release side; toward the strength or the Mike) varies by
  install. One coached rule should be chosen and stated, not fitted.
- Five-man protection (empty) has no back. Its hot is the QB's "off the Mike, then Sam" (QFB), so it belongs with the QB
  lane's hot read.
- A delayed or looping blitz has no checked source of its own. The gap rule covers it on the slide side; on the man side
  it is BACK_CHECK's count.

## Sources

- Queer Football Breakdowns, "Half Slide Protection Review and ..." (page): https://queerfootballbreakdowns.substack.com/p/half-slide-protection-review-and
- Mark Ring, "Pass Protection Scheme 101, Part 2" (page): https://markring1961.blogspot.com/2014/01/pass-protection-scheme-101-part-2.html
- Youth Football Online, "Protect Your Quarterback With the Half Slide Pass Protection" (page): https://youthfootballonline.com/protect-your-quarterback-with-the-half-slide-pass-protection/
- XandOLabs, Dan Ellis (summary): https://www.xandolabs.com/?p=15821; "Identifying and Blocking Pressure in 6-Man Protection Schemes" (summary): https://www.xandolabs.com/?p=82241; "The Sight Adjustment Study" (summary): https://www.xandolabs.com/?p=5611
- First Down Playbook, "Hot: you better know how" (summary): https://firstdown.playbooktech.com/coaches-community/hot-you-better-know-how
- Eleven Warriors forum, "Intro to pass protection" (summary): https://www.elevenwarriors.com/forum/college-sports/2019/10/107387/intro-to-pass-protection-for-us-junkies
