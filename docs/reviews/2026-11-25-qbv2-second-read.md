# QB_V2: second cold read of the landed code, backside resets, the next quick concepts (2026-11-25)

Recorded by Integration from the outside reviewer's (Gemini) second package, read against develop 890558713. Rows
marked **confirmed** were checked in code by Integration. The rest are for the owning lane to check by a staged case.
Coaching sources are the reviewer's, several tertiary; Rules re-opens what is quoted.

## 1. The landed passer against the card spec

**The six read-cycle findings.**

| # | Finding | Status |
|---|---|---|
| 1 | Throw state that cannot be left | Closed: `uncommit()` restores the state when the throw cannot start. |
| 2 | Read 1 left before the key declares | Closed: answered-no needs a cue. |
| 3 | On-break throw locked out when re-routed | Closed: the gate is progress along the stem. |
| 4 | Contact throwaway unreachable; hot side null | Hot side wired. **Open edge, confirmed:** `qb.ts:1660` returns `stand()` when he is held at 0.6 or more, before the V2 step runs, so the in-pocket throwaway only exists while he is lightly held. The unit test passed `contact` straight to the cycle and did not go through this line. |
| 5 | Escape one-way | He re-enters inside 3.75 yd. **Open, confirmed:** while outside, `onEscape` (`cycle.ts:211–214`) never looks at the checkdown, never moves his looks, and throws it away as soon as the rush is felt. |
| 6 | Checkdown's `fromStep`; handoff and checkdown intents | `fromStep` checked. Handoff and checkdown intents still unhandled (deferred to the RPO work, as noted). |

**The boundary.** `host.ts` is clean and scanned. Still behind the view or in `drive.ts`:
- who is a defensive back comes from the defense's call personnel and the slot label (`drive.ts:163`, **confirmed**);
- head and pose come from `sim.see`, which has no cone gate, so a man behind him still updates;
- the believed body still reads roster position, and blends toward the true profile and ball skills, with the flag on;
- the scramble test reads every defender's true down state;
- the seen-receiver fallback in `evaluate` remains (safe by default).
The scan test was not widened to reject the call, `.slot`, roster position, `.profile` or rating reads.

**The invariants.**
1. No throw lock: holds.
2. **No stale-picture flip: broken, three ways.**
   - The lane's rule (age left out of the spread for a man arriving early) covers only its own term. The picture's
     own spread still grows with age (`qbmind.ts:582–587`, **confirmed**), and it feeds the same sigma, so an ageing
     picture of a covering man still lowers his arrival chance. The unit test held the spread constant.
   - **A defender whose picture is 1.5 s old is dropped from the judgment altogether** (`drive.ts:265`,
     **confirmed**): the throw's estimate jumps the moment he is forgotten.
   - In the lane test, the spread for the near-catch chance is gated on the mid-flight margin, not its own.
3. No hidden-state read: broken, by the boundary rows above.
4. Throwaway reachable, escape undoable: partly, by the two open edges above.

**The landing note against the code.** Four of its "fixed" or "default-safe" rows do not match: the contact
throwaway (blocked at a firm hold), escape (still no checkdown outside), the believed body (reads roster position with
the flag on), and the picture-age rule (as above).

**What closes invariant 2:** the card spec's §1 as written: a one-sided advance on the arrival time against a fresh
spread built from the look's position error only; and no cut-off that erases an old picture. A man last seen covering
stays in the judgment until seen elsewhere.

## 2. Backside resets as taught

The principle: reads are tied to the feet (the first at the top of the drop, the second with a hitch, the third with
another); a late arrival on a timing route is a throw into a closing window.

| Backside half | Coming to it late |
|---|---|
| Slant-flat | The slant window closes with each hitch; late, take the flat or the checkdown. |
| Double slants | No taught late reset found; it is chosen before the snap. Late slants invite the undercut. |
| Outside quick hitch | **Do not throw it late:** the corner plants and drives. An interior settle (spacing) can be a reset. |
| Quick out | **Do not reset to it:** any hesitation lets the corner undercut it. |
| Stick | **Never come back to it** once left; if he must hitch, go to the backside or the checkdown. |
| Curl-flat | A workable reset: its depth fits a later clock. Read the flat defender: curl if he widens, flat if he sits. |
| Fade-flat | No taught late reset found; a pre-snap cushion choice. |
| Go or seam pair | A pre-snap alert only; dead after the snap if a safety caps it. |

When the back is the answer: one reset, not three ("the first hitch is downfield, the second is a checkdown"); and
when a quick-game read is unclear.

## 3. The next quick-game concepts

Footwork in all: three steps under center and the ball off the third; from the gun, one step for 0–5 yd routes and
three quick steps for 5–7 yd outs; no extra hitch.

- **Hitch-out (out-stick).** Before the snap, the corner's cushion and leverage. After, the flat defender: he widens,
  the inside hitch or stick; he sits inside, the out. Corner squats or traps: off the out.
- **Double outs.** Pick the softer corner or better leverage before the snap; the out on rhythm; taken away, come
  inside to the checkdown or the other side. Not into a squat or trap corner.
- **Double slants.** Chosen against two-high or man. Read inside-out, or key the defender inside the innermost slant:
  he sits or takes the inside slant, throw the outside one behind him; he widens, throw the inside one.
- **Seam-slant.** Mostly taught as a man-beater or RPO side. Read the inside backer, then the safety: the safety
  pedals, the slant; he drives on the slant, the seam behind him.
- **Trips outs.** Rarely three outs; taught as #1 vertical with #2 and #3 out (or #3 stick). Corner bails: the out in
  the flat he left; he squats: #1 vertical in front of the safety. Flat defender between the out and the stick decides
  which.
- **Trips hitch-flat.** Backside gift first if it is one on one; then the apex over #2 and #3: he widens with the
  flat, the hitch inside; he sits on the hitch, the flat.

Where coaches differ: which defender is keyed on double slants; whether the trips version peeks the vertical first;
one step or three quick steps from the gun on short outs.
