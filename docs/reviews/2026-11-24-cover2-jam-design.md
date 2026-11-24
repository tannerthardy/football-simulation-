# The Cover 2 corner's jam: design note (Coverage C14, 2026-11-24)

This note asks for Integration's review before any code. It answers Integration's direction after the coaching
research on the Cover 2 corner (2026-11-24):
- SQUAT_SINK v2 is the taught corner.
- The flat is conceded by design.
- The jam is the missing technique.

## 1. The technique as taught (standard version)

This section is paraphrased from Integration's research summary (Bowen's NFL pieces on the Cover 2 corner and safety;
Ratledge's 4-3 playbook excerpt; throwdeeppublishing on trap / 2-read; winwiththepass). It is to be recorded in the
handbook with the PR.

1. **Alignment.** About 5 yd off #1, outside shade.
2. **Jam.** He jams #1 to force an inside release. The purpose is to disrupt timing and buy the half safety his
   cushion. An outside release pulls the safety off his landmark.
3. **Sink.** At about 45° with a zone turn (back to the sideline, eyes through the QB), under #1 and under any 7 route.
4. **The flat.** He does not cover it before a threat appears. He comes down when the ball is thrown there (Bowen:
   "deep to short"), or, in the other taught version, when #2 or the back actually breaks to the flat. The flat is
   conceded by design: force the ball underneath, rally and tackle.
5. **Blame.** A completed corner route or one-step fade is on the corner, for not getting enough depth.

Not found in the research: jam duration, sink depth in yards, Cover 6 cloud-side specifics.

## 2. What exists

**The press jam is real contact, but only for press-man.** `RouteRunner.handleRelease` (receiver.ts):
- A press corner (`defAlign.spots[d].press` with `manTarget` = this receiver) within reach and facing him puts a World
  `hands` joint on the receiver.
- The joint's push and steer are resolved by the World.
- The palm follows the chest at the corner's hand speed (`press` rating). The receiver's swipe (`releaseVsPress`)
  slides it off. Contact ends past 5 yd, at the throw, or when the hand slides off.
- `pass-interference.ts` calls 8-4-2 / 8-4-3 illegal contact on continued force beyond five or against an escaping
  receiver.

**What's wrong with it for our use:**
- The corner's decision to jam lives in the receiver's controller, keyed on the defense's call (press and
  manTarget), not in the corner's behaviour.
- A Cover 2 hard corner (zone, about 5 yd off) never jams.
- The receiver's release plan (PRESS_RELEASE / RELEASE_SEEN) only plans around a defender seen tight over him at the
  snap (2.5 yd). A corner 5 yd off who sits and jams at 3–5 yd is not in that set.

**The sink exists.** SQUAT_SINK v2 (defense.ts `squatCorner`, off on develop) handles the zone turn and the sink under
#1 to the hole depth, with a minimax between the hole and flat windows.

## 3. Design

One flag, `C2_JAM`, off, requiring SQUAT_SINK. Three parts, each owned where the decision is made.

**A. The jam decision moves to the defender.**
- A shared `PressContact` module (lifted from receiver.ts, behaviour unchanged for press-man) owns the hand joint's
  life: making it, the palm-follow and slide, and its end.
- The corner's controller requests it:
  - press-man as today;
  - and the Cover 2 corner (squatSinkCall seats, flat_s / flat_w) when #1, as he sees him, is within his reach and
    in front of him, with the receiver inside 5 yd past the line he sees.
- The receiver's controller keeps its side: the swipe and the release path.
- No outcome is awarded. The World resolves push and steer through the joint. The receiver's feet and mass decide
  how far he is moved.

**B. The corner's feet before the jam.**
- From his alignment he holds outside shade on #1 as he sees him.
- He sits square with patient feet, with a small rate of retreat set by #1's seen pace (catch technique, handbook
  §5 "Press and catch"). The stem reaches him rather than him lunging.
- The strike is aimed at the receiver's outside half, which is what forces the inside release.
- A missed strike is a physical miss: the hand doesn't reach the surface, or the receiver is already by. Nothing
  is awarded.
- The jam ends at the earliest of:
  - #1 passing him;
  - the hand sliding off (the existing slide);
  - #1 reaching 5 yd past the line as he sees it (he lets go; the official still judges the achieved contact);
  - a throw.
- Then the zone turn and SQUAT_SINK v2's sink.

**C. The receiver's release against it** (Rules / receiver side). What the receiver needs, so the contest is two
techniques:
1. His release plan must see a defender who will be in his path at the jam point, not only one tight at the snap.
   He sees the corner's alignment and shade before the snap and plans a release side for his route: outside for a
   go or fade, inside for an in-breaker.
2. Against a hand on his outside half, he can work through it, or work off it to his side (the existing swipe),
   at a cost in time and width set by `releaseVsPress` and his strength through the World.
3. His stem after a forced inside release must not snap back outside on a timer. RELEASE_THROUGH's rule already
   covers this for press: he runs on from where the release put him.

Rules lane to confirm or own C1; C2 and C3 exist.

**D. Coming down: one standard trigger.**
1. The ball thrown to the flat: FLIGHT_BREAK's break, already on.
2. Or a receiver he sees arriving in his flat (under 6 yd, outside him, moving out) when no deep threat is left on
   him: #1 has stopped climbing, has broken in under the safety, or is out of his area.

Both are on his own picture. The eyes-on-#2 version is a later option. This replaces SQUAT_SINK v2's pre-throw
minimax pull toward the flat threat under C2_JAM, since the flat is conceded until a threat shows. The minimax stays
for the trap and palms variants if they are un-parked.

## 4. Information honesty
- **Corner:** #1's position, pace and side as he sees them, and the line as he sees it.
- **Receiver:** the corner's alignment and shade as he sees them before the snap, and the hand as felt contact (the
  joint). He gets nothing from the call.
- The existing jam's initiation reads `spot.press` and `manTarget`, which is the corner's own call: fine for the
  corner, but it must not stay in the receiver's code path.
- RELEASE_SEEN is on, so the receiver's release side already avoids the call.

## 5. Measurement

**Engine side:** Tools' census frame plus a jam tap.
- Release side of #1 against Cover 2: inside / outside share.
- Jam rate, contact duration, and where contact ends (yd past the line).
- #1's time to 10 yd and to the hole depth.
- Corner depth at 2.0 / 3.0 s and his relation to #1 at the break.
- The hole shot: 10–15 window, on top / level / trailing, completions over the corner.
- Flat cost: catch to first contact, YAC.
- Illegal-contact calls per game.

**NFL side** (BDB, same operator):
- Cover 2 plays with the corner within about 6 yd of #1 at the snap.
- #1's release side.
- Time to 10 yd against press and off.
- Corner depth at 3.0 s.

A gap is a place to look, not a target. Jam duration isn't measured on the NFL side (no contact data); its effect
shows up as #1's time to 10 yd and his release side.

## 6. Order and attempts
1. Lift PressContact (pure refactor, press-man bit-identical: seed digest and red-diff).
2. A (decision) and B (feet and strike) behind C2_JAM.
3. D (the coming-down trigger).
4. Measure.

Two attempts on the mechanism, then stop and re-diagnose. Nothing here tunes toward a release-side share.
