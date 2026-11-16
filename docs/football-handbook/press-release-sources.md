# Receiver release vs press: techniques as taught (sources)

Run Game for Integration, 2026-11-14. Coaching sources, not measurements. They are clinic and blog pieces, one staff's
view each; where they disagree it is said. The measured NFL side is in
[the press-release review](../reviews/2026-11-14-press-release.md).

## The structure every source shares

1. **A plan before the snap.** The receiver chooses his release from the corner's alignment (shade, depth) and his
   route ("have a plan", "have a counter plan"; USA Football part 1). Stop routes take a deliberately modest release:
   the win is at the break, and beating the corner badly on a hitch leaves a trailing defender who runs into him.
2. **Feet first, then hands.** The release is won with the feet. Hands come once the corner is off balance, at the
   moment he shoots his own hands: "99% of the time when a DB shoots his hands, he will also stop his feet"
   (USA Football part 2). The receiver is a counter-puncher.
3. **Foot fire / jab is the read.** At the snap the back foot comes even and the feet fire three or four quick
   times. The corner's first move shows his technique, and the receiver picks the release side in that window
   (Gridiron Strategies). Against a square corner: jab opposite the intended release. Against a shaded corner: jab
   toward his leverage to threaten it, then take the easiest way. A "just go" (speed release) skips the foot fire.
4. **Attack the short arm.** Aim 1–2 yd past the corner's leverage, which makes him declare. If he jumps it, win
   the other way; if he sits, the path past the leverage is open (USA Football part 1). Inside leverage: attack
   inside; outside or head-up: attack outside (that source's default).
5. **Eat space, don't dance.** Side-to-side movement lets the corner reset and control the rep. Hopping and parallel
   feet are errors: parallel feet force a step around him that gives him time; a hop leaves no base to take a hit.

## Techniques: what each beats and what it costs

| Technique | Mechanics as taught | Beats | Costs |
|---|---|---|---|
| Speed release ("just go") | Hard to one side from the snap, no hesitation; chest turned away, violent hands | A corner already shaded away from that side; a corner who sits | Lets a patient, square corner mirror and ride him; widens a go |
| Single jab / foot fire | Short quick steps (back foot not crossing), one jab, push off the instep the other way | A corner who bites on the first step (opens, shoots hands, shifts weight) | Time at the line; quick steps eat less space; vs a patient corner it buys nothing |
| Full steps | Back foot crosses for a full step | A corner with cushion (eats space) | Slower against tight press |
| Swipe / club | Short sharp strike at his elbow or wrist, like a counter jab | A corner's punch that has landed or is arriving | Needs the feet to have won first; long swings give him the chest |
| Chop | Flat hand down on the near arm, shoulders turned away | A leveraged corner's extended near arm | Same; a missed chop leaves the chest open |
| Rip | Break his outside elbow, rip the inside arm through, step through, hips past his hips | A two-hand jam on the body | Contact and time; requires getting square to his hip |
| Push-by / push-off | At the top of the route, use the arm on a defender in phase | A corner who carried him inside/outside | Legality (offensive pass interference if extended) |

## Corner side (what the release plays against)

The press corner's eyes are on the bottom of the numbers at the line, then on the hip once his own hips open. He is
taught patience: when the receiver buzzes his feet and moves his hips at the line, wait for a declared release, then
jam with the off hand. Over-extending (the two-hand jam) loses leverage. Double moves beat him (USA Football, DB eyes).

## What this means for a model (not implemented)

- The side is a read of the corner from the receiver's own picture, after a jab that costs real steps; a speed
  release is the same choice without the read.
- The cost is time and space at the line: short steps and a lateral move instead of upfield drive.
- A patient corner makes the jab worthless; a reactive one makes it pay. That is the corner's control and his own
  delayed picture, not a roll.
- Ratings move how quick the feet are, how quickly the receiver reads the corner, how sharp the push-off is, and the
  corner's patience and mirror. They do not decide who wins the release.

## Sources

- Gridiron Strategies, "Defeating press coverage": stance, foot fire, jab vs leverage, rip/chop/push-by/push-off,
  "just go". https://gridironstrategies.com/article/defeating-press-coverage
- USA Football, "Coaching the Wide Receiver – The Press Release" (part 1): plan, counter plan, eat space, attack
  the short arm, stop-route release. https://blogs.usafootball.com/blog/7121/coaching-the-wide-receiver-the-press-release
- USA Football, part 2: full vs quick steps, insteps, low to lower, one foot grounded, hands after feet.
  https://blogs.usafootball.com/blog/7150/coaching-the-wide-receiver-the-press-release-part-2
- USA Football, "Training the eyes of a defensive back in press coverage": corner's keys and patience.
  https://blogs.usafootball.com/blog/952/training-the-eyes-of-a-defensive-back-in-press-coverage
- Viqtory Sports, "How to beat press coverage" (speed release = no hesitation): https://www.viqtorysports.com/?p=543
- CoachUp (hesitation first step to make the corner bite): https://www.coachup.com/nation/?p=6317
- XandOLabs, survey on stance and hands vs press (inside foot up ~74%): https://www.xandolabs.com/?p=5574

## The release path: when the width is taken (for the path-shape design), 2026-11-16

What coaches teach about the shape of the release, not its side:

- **Close the space first.**
  - Against press, soft press or a squat defender, the receiver closes the space to set his release point. Against
    an off or bailing defender he bursts and closes the cushion (Kolste).
  - Full steps (the back foot crosses) eat up space against cushion. Quick steps (it does not) for tighter press,
    "while still attacking vertically" (USA Football, part 2).
- **Win vertically, don't run around him.** The two-hand-jam release is a step through and a stack, getting on top of
  the defender; the fault is "running the hump", a release around him that lets the defender catch up (Gridiron
  Strategies). Parallel feet "must step out and around the DB, which is less efficient" and give him time to recover
  (USA Football, part 2).
- **The width is aimed at his leverage, at short range.** "Attack the short arm": aim 1–2 yd beyond the defender's
  leverage, which makes him declare (USA Football, part 1 and the slot-release piece). The stem neutralises the
  defender's leverage within the first five yards and keeps his hips square (Viqtory, stem and stack).
- **After the release, stack.** Work back onto the defender's line so he ends up behind; without the stack the
  defender sits between the receiver and the ball (AFCA, "Winning vertically"; Viqtory).
- **Against loose coverage, the same rule at a distance.** Take the blind spot he gives: if he turns his shoulders,
  attack the near hip (USA Football, "Beating loose coverage").

What this means for a model (not implemented):

- The lateral part of the release is taken as a function of the defender as he sees him (distance ahead, the
  defender's hands and hips), not from the first step and not at a fixed depth.
- Far from him the receiver drives upfield, closing the cushion. Inside the defender's reach he takes the width past
  the leverage he sees. Past him he stacks.
- The same rule covers a corner at 4–6 yd. Rules' drift by cushion shows NFL gos widen against any defender inside
  about 7 yd, steadily with depth.

Sources:

- USA Football, "Coaching the Wide Receiver – The Press Release" parts 1 and 2:
  https://blogs.usafootball.com/blog/7121/coaching-the-wide-receiver-the-press-release ,
  https://blogs.usafootball.com/blog/7150/coaching-the-wide-receiver-the-press-release-part-2
- USA Football, "2nd level slot releases" (short arm, 1–2 yd past leverage):
  https://blogs.usafootball.com/blog/7237/coaching-the-wide-receiver-2nd-level-slot-releases
- USA Football, "Beating loose coverage": https://blogs.usafootball.com/blog/7192/here
- Gridiron Strategies, "Defeating press coverage": https://gridironstrategies.com/article/defeating-press-coverage
- AFCA, "Winning vertically at the WR position": https://www.afca.com/winning-vertically-at-the-wr-position/
- Viqtory Sports, "Learn to stem & stack": https://www.viqtorysports.com/?p=463
- Riley Kolste, "WR play: the art of route running":
  https://rileykolstefootball.com/2018/05/18/wr-play-the-art-of-route-running/
