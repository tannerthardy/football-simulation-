# The receivers' scramble rule (SCRAMBLE_RULE, 2026-11-15)

Rules + Coaching, for Integration. This is item (4), the receivers' side of QB_BREAK.

## What the engine does today, and why it is an information problem

- The receivers' scramble drill (`receiver.ts` `scrambleDrill`) runs when `sim.scrambleDrill` is set.
- `qb.ts` sets that flag in one place: when the quarterback's internal clock expires (`clockUrgency >= 1`).
- So every receiver switches on his quarterback's **private** clock, whether or not he has left the pocket, and none of
  them sees anything to switch on.
- A quarterback who breaks the pocket on QB_BREAK's reads trigger ("his reads are done and nothing is there") never sets
  the flag, so his receivers keep running their routes while he runs.
- The drill picks open grass by scoring every defender's **true** position.

All three of these break the rule that players act on what they perceive. SCRAMBLE_RULE (off) replaces them for the
receivers.

## What coaches teach

Sources are listed below, per claim. Every program teaches its own version, but the parts most of them share are these:

- **The trigger is seeing the quarterback leave the pocket** ("breaks contain").
  - The rule is anchored to the receiver's depth at that moment.
  - No coaching source uses a timer or the QB's clock: Baldwin "worked back when he saw Wilson moving".
- **Short goes deep.** ODU's threshold: a route under 10 yd goes deep, 10 yd or more comes back.
- **Intermediate routes** stay on their level and work in the quarterback's direction, toward the sideline he scrambles
  to. Sources: TXHS (KP Kelly), Gridiron Strategies (Ratledge), Maurek.
- **The deep receiver on the scramble side:** the sources split here.
  - Most say he comes back toward the QB.
  - A team slide deck, Gridiron Strategies and Kirkpatrick keep the deep third.
  - Football Toolbox (Campbell) resolves it for two receivers on one side: one keeps the deep third, the other works
    back.
  - Maurek: a deep receiver must not "out run your QB's ARM".
  - The split is real coaching variety, so the build does not pick one. It is the coordinator's install, carried on
    the call (`offCall.scrambleDeep`).
    - 'back' is the default, the majority ("short goes deep, deep comes back", at about 10 yd).
    - 'stay': the outermost deep man keeps the deep third; the other deep men come back.
- **The backside** comes across toward the quarterback at its depth: ODU, TXHS, Football Toolbox (about 15 yd through
  the middle), and the slide deck ("in front of the QB's hand").
  - The quarterback is told never to throw back across to the middle (McDaniels; Gridiron Strategies).
  - So the backside's target stays short of his line of travel.
- **Backs** flow with the QB underneath, or stay in and block (Football Toolbox, Gridiron Strategies, TXHS).
- **Spacing.** McDaniels: not "two or three guys standing in the same area". Maye: a deep, an intermediate and an
  outlet. Find grass in the QB's vision.

## The build

Each receiver checks his own picture of the quarterback (`sim.see`) every tick.
- **Trigger:** the QB is more than 4.5 yd off the ball. That is the tackle box, the same edge the QB's own
  `outsidePocket` uses.
- **He has to be looking:** the QB must be inside what his shoulders and neck can bring into view (`neckRange` plus
  half the head cone). A man running straight away from the QB does not see him leave until he turns.
- **Reaction:** the picture has to hold, while he is looking, for the receiver's reaction time.
- **Role:** at that moment the receiver takes a role from his depth and side, against the scramble direction he saw:

| role | who | spot |
|---|---|---|
| deep | 'stay' install only: scramble side, 10 yd or deeper, the outermost (in his pictures of teammates out on routes) | upfield 5, 8 yd from the sideline |
| level | scramble side, 10-18 yd (with 'back', the outermost too) | his depth, 4 yd toward the sideline |
| back_to | scramble side, deeper than 18 (with 'stay', not the outermost) | back to 15 yd, a third of the way toward the QB |
| up | scramble side, under 10 yd | 12 yd, 3 yd toward the sideline |
| across | backside | his depth (6-15 yd), 3 yd short of the QB's line |
| flow | a back from the backfield | 4 yd past the line, 4 yd ahead of the QB |

- **Spot:** chosen from seven candidates around the base spot, every 0.5 s.
  - The score uses distance to the defenders he sees (capped at 6 yd), less crowding by the teammates he sees within
    5 yd, less a small cost for distance.
  - He stays 3 yd inside the sideline.
  - He runs at 0.9 with his eyes on the quarterback.
- **Off:** unchanged.
- **The QB's side:** not part of this flag. Whether he throws back across, his deep-to-short scan on the run, and the
  throwaway are QB_BREAK's (the QB lane's).

## Not built, and open

- **Hands up:** the sources disagree.
- **Blocking for the runner:** a receiver becomes a blocker after the QB's "Go!" when he tucks. That is the next piece.
- **Red-zone landmarks:** the back corner of the end zone and the goal post.
- **The numbers** (10 / 12 / 15 / 18 yd, 4.5 yd box) are the sources' thresholds where there is one. The rest are
  chosen.

## Measured

`scripts/diag/scramble/scramble-pair.ts`, QB_BREAK on in both arms, SCRAMBLE_RULE off vs on. Ten dropback concepts ×
8 coverages × 4 rosters × 6 seeds = 1,920 plays from gun doubles, same bodies, call and seed in each arm.

- **The QB leaves the pocket rarely on this set:** 29 plays (off) and 27 (on) of 1,920, most of them after 5 s (QB_BREAK's
  reads trigger, late in the down). So this is a mechanism check, not an outcome measurement. 1,899 plays are
  identical.
- **The rule fires as designed** on those 27 plays: 42 receivers take a rule (17 up, 15 across, 9 flow, 1 level), 0.30 s
  / 0.35 s / 0.40 s (p25 / p50 / p75) after the QB leaves the box. The rest were not looking at him.
- **Outcomes, off → on, on the 27 plays where he left in both arms:**

| measure | off | on |
|---|---|---|
| thrown live out there | 7 (3 complete) | 7 (4 complete) |
| thrown away | 6 | 6 |
| sacked | 2 | 2 |
| interceptions | 0 | 0 |
| yards a play | 8.16 | 9.01 |

  Too few plays to read.
- **Whole set:** 8.56 → 8.52 yards a play, sacks 168 → 169, interceptions 28 → 28.

An outcome reading needs a set where the QB leaves the pocket at the NFL's rate. That is the QB lane's QB_BREAK
measurement, and this flag should be carded with it.

## Sources

The sourcing report (quotes tagged as checked against the page, tool-summarised, or search snippet only) is kept with
the PR description.
- **Checked against the page:**
  - The Patriots piece, Oct 2026: McDaniels, Maye, Vrabel, Chism, Douglas, Henry.
  - Football Toolbox (Jerry Campbell); TexasHSFootball (KP Kelly); Gridiron Strategies (Kenny Ratledge);
    High Speed Spread (John Maurek); a team slide deck on slideserve; Field Gulls.
- **Snippet only:** Old Dominion's rules (Brian Scott) and Kuchar (both X&O Labs, which refused the fetch). Check
  them in a browser before quoting them further.
