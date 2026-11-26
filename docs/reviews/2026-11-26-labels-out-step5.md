# Step 5: labels out, the top three (2026-11-26)

Rules + Coaching, for Integration. Base: develop 47d38ca5f. There is no flag: each change was required to leave
today's football identical.

## Results
| item | identical (8 game digests) | how |
|---|---|---|
| 1. The back | **yes** | the description's `roles` |
| 2. Linemen by place | **yes** | `linePlace` from the snap's line |
| 3a. Re-described lowered calls (stem, motion re-check, passer's look model) | **yes** | `describeOver` |
| 3b. The climber's surface picture (blocking.ts 2256) | **no: stopped and reverted** | see the finding below |

**Digest method** (as in step 4): seeds 1-8, sim-game teams, `simulateGame`. The digest is the SHA-256 of
`JSON.stringify({ log: g.log, score: g.score })`. It was checked after each item against develop's digests:
`29de518b…`, `8b885f84…`, `23eeac49…`, `8f32e403…`, `fdae7b32…`, `805cd331…`, `72239623…`, `643df4fb…`.

### 1. The back: description roles, not the `RB` label
- `OffenseSnapDescription.roles: { carrier?, back?, outlet? }`. `PlaySim.role(name)` gives the player.
  - **carrier:** the run's ball carrier. It is used for the mesh and the handoff (assign.ts), the runner the blockers
    key and the wing/stalker exclusions (blocking.ts), and the held-ball check.
  - **back:** the back in protection, the play-action fake and blitz pick-up (qb.ts 1125, 1807; assign.ts PA; the
    qbmind run-down check).
  - **outlet:** the passer's checkdown (qb.ts 1971-1972).
- The catalog's describer writes today's football: the RB slot holds all three whenever the formation has one.
- Two backs, no back (empty) and a carrier not in the RB slot are all expressible.
- **Finding: what the label carried that the backfield fact does not.**
  - Today "the back" is the RB body *wherever he aligns*. An empty set's detached RB (gun empty, or an "empty"
    motion) is still the outlet, still the handoff target's slot, and never a stalker.
  - `numbering.B` (the backfield fact) would differ on exactly those snaps and break identity.
  - So the describer writes `roles` from the RB slot, as data, rather than deriving it from the backfield flag. A
    description can say otherwise.
- **Left by label** (outside this item's list; for later):
  - defenders keying "the back" by slot (defense.ts 886, 1481, 1535; run-fits.ts 517, 525; engagement.ts 2232,
    2239; recognition.ts 384);
  - the screen spot (`B` → `RB`, screen-spot.ts 17);
  - pass-interference receiving slots;
  - motion's back sort.

  The defenders' reads are also an information question: a defender should key the back he sees in the backfield, not
  the offense's designated role.

### 2. Linemen by place on the snap's line
- `linePlace(sim, a)` (blocking.ts) gives:
  - the **snapper** (the lineman nearest the ball);
  - on each side, each man's **order out** from the snapper, and whether he is that side's **end man**.
- Tackle technique is the end man of a side with at least two linemen. A lone man on a side is a guard. The guards
  are the first men out; the interior is everyone but the tackles.
- Sites replaced:
  - blocking.ts 155, 209, 231, 315, 365, 375 and 400: tackle zone widths, the pass-set outside sign, sets and the
    kick-slide;
  - 631: the run look's interior;
  - 1258-1259: the gap scheme's guards and tackles;
  - the centre covering a pull: the snapper.
- In the catalog these are exactly LT/RT, LG/RG and C.

### 3a. Paths that re-describe a lowered call
- `describeOver(base, call)` (ir/entry.ts): the call's description over the defense's own description.
  - With no base (every catalog call) it is `describeDefense(call)`.
  - With a described defense and the same front, it keeps the description's front, alignment data and each player's
    spot and fit, and takes coverage, pressure and the call's other fields from the call.
- Used by:
  - the stem's shown front (playsim.ts 555);
  - the motion re-check (motion.ts; `MotionHost.defDesc`; a described defense skips `installCoverage`, as at the
    snap);
  - the passer's look model (qbmind.ts 300, 389, 394).

### 3b. The climber's surface picture: not identical, stopped (finding)
- **Today.** blocking.ts 2256 counts `['DE_W','DE_S','DT_W','DT_S','NT']` as surfaces a climbing blocker steers
  around.
- **What I tried.** "A defender whose spot is within 2 yd of the line, by where he stands."
- **Result.** It changed 6 of 8 game digests.
- **Why the label and the fact differ:**
  - the label set includes the okie front's stand-up rover (DT_W at 2.6 yd) and any lineman whose spot is deeper than
    2 yd;
  - "on the line" adds walked-up backers (mugs, Sam-on, a 5-1's Will) and drops the rover.
- So the label carries "a front lineman's body, wherever he stands", not "a man on the line".
- **Reverted.** The taught rule is probably "a man in a stance on or near the line, within the rover's depth". That
  changes today's football, so it needs a ruling and a staged case, not this identity pass.

## The new looks, before (develop 47d38ca5f) and after (this branch), 16 seeds each
Lab: `scripts/diag/ir/new-looks-5.ts`, run unchanged on both trees.

**(1) Bunch + stack, empty: `roles: {}` (no back, no outlet), stick vs Over nickel cover 3.**
- Before: 4.44 yd; targets RB 10, H 4, X 1.
- After: 4.79 yd; targets RB 11, H 3, X 1.
- There is now no checkdown: the outlet is gone. The ball still goes to the stacked player (the RB body), because he
  is #2 on the stack side with a stick-concept route, his read, not an outlet.

**(2) Tackle over, inside zone to the heavy (two-tackle) side vs Over base.** The description now names its carrier as
data (`roles.carrier: 'RB'`).
- Identical before and after: 2.80 yd.
- First blocks:
  - the outside LT, the end man, engages DE_W 15/16;
  - LG engages DT_S 14/16;
  - the covered RT makes no first block on 7/16, engages DE_W 6/16 and LB_W 2/16.
- The tackle-technique reads replaced in item 2 are pass-protection and zone-width rules that this inside zone does
  not reach, so a covered tackle's run blocking still needs its own look.

**(3) The 5-1 nickel through a stem (shown Over, 1.0 s) and a Z-across motion, inside zone, gun doubles.**
- Shape at the snap is identical before and after.
- Defenders on the line: 5 on 6/16, 4 on 10/16.
- The Will is 1.8-5.1 yd deep against his 1.0 yd spot. The Mike is 3.1-6.4 yd.
- The 5-1 does not hold its shape through a 1.0 s stem plus the motion response.
- Item 3a keeps the description's data (unchanged here), so the cause lies in the stem walk and the motion answer, not
  lost data.
- Yards: 5.36 before, 4.04 after. The snap shape is the same, so the difference comes after the snap, most likely from
  the passer's look model now seeing the described 5-1 (item 3a). That is not verified.

**(4) New look for item 1: I pro, inside zone, the second back (F) carries.** Roles are carrier F, back RB, outlet RB.
- Before: the RB carried on 16/16, so the description could not say otherwise; 6.77 yd.
- After: F carried on 15/16 (1/16 records LB_M as the carrier); 3.00 yd.
- No new verb was needed: the handoff, mesh and runner keys all follow the role.

## Checks
- **IR suites:** 16 tests pass (round-trip, align, offense, check, fits).
- **Clean full red-diff on the head:** 4,625 tests, 36 failing, all on the ledger. **New red 0.** Fixed 4: concept-menu
  and three baseline-runner tests.

## Not started (items 4-7 of the step-4 list stay for later)
- Stance and read time by label.
- A Formation cannot hold a line.
- Personnel as slot maps.
- Coverage rules.
