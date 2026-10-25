# COV-7: leave my man to help on a run I believe in, or stay

Design for one role-local choice for a perimeter man defender. No engine code
here. The code waits until COV-6 (#283) merges and gets its own PR. Fixture,
re-qualification and pre-declared variation are below; raw output stays in
ignored `out/`.

## The fixture today

The accepted cost pair ([#271](https://github.com/tannerthardy/football-simulation-/pull/271),
[review](cov7-abandonment-cost.md), `scripts/diag/cov7-abandonment.ts`):
Cover 1 Off, ace_11 with Z split 8⅓ yd, roster 7, snap seed 1, flip false.
CB_S (DEF-CB3, index 17) marks Z (OFF-WR2, index 9); installed fit alley,
D gap, side −1 (not force). Z runs a called non-contact stalk look until 1.0 s,
then his route (PA Shot) or his run block (Toss). The compared arms are
**retain man** (the default, `PASS_FIRST`) and the **permissive diagnostic**
(this corner alone runs with `PASS_FIRST=0`, so the existing gate admits his
installed alley support).

### Re-qualified on develop `b559fdc5`

Setup bytes are unchanged since #271: run `d1a6a118…`, deception `26e878e2…`.
Both arms still activate, and admission is identical on both calls.

`test/cov7-abandonment.test.ts` pins **`EDGE_CONTAIN=0 SEAL_HOLD=0`**: the
corner's run participation was staged on unbounded edge widening, before
#275 added those switches (now on, and `docs/FLAGS.md` says review 2 drops
their off paths). So the run arm is reported both ways. The PA arm is the same
under both.

| | Toss (run) | PA Shot (deception) |
| --- | --- | --- |
| Support admitted | 0.65 s | 0.65 s |
| First changed command (CB_S, 0.65 s) | man `trackReceiver` (−0.320, 0.517) → support `blockingSupport` (−1.375, 4.852) yd/s | (−0.320, 0.517) → (−0.919, 6.334) |
| His picture at admission | Z low, x 39.187, vx 0.806, age 0.35; QB carrying = true; RB carrying = false | same Z picture and own body; QB carrying = true; RB carrying = false |
| Run belief at admission | run (log-odds −1.093) | run (−0.784) |
| Back to man | — | first upright Z picture 1.4 s; inward motion arrested 2.0 s |
| Same clock 2.4 s, separation from Z | — | man 1.343 yd, support 3.042 yd (lateral gap 0.886 → 3.042) |
| Result, man → support, **fixture settings** | tackle 6.26 → tackle 4.85 yd; corner wraps at 3.35 s, LB_W tackles at 3.95 s | incomplete → incomplete (throws to Z at 2.65 / 2.70 s) |
| Result, man → support, **today's defaults** | tackle 4.37 → tackle 2.25 yd; corner never touches the runner | same |

**The PA arm is unchanged from #271.** Same admission, return and arrest
times, the same 2.4 s geometry, both throws to Z incomplete, no foul, and no
contact on Z before the release.

**Under the fixture's settings the run arm works as #274 described.** The
corner's wrap is an assist and LB_W finishes the tackle 1.4 yd shorter. The
fixture test passes on `b559fdc5` (9/9).

**Under today's defaults the corner no longer makes the play.** Bisected with
defaults:

| develop | Retain man | Support | Corner in support |
| --- | --- | --- | --- |
| #271 merge `211db9cc` | TD, 70 yd | tackle 7.56 | wraps 3.60, tackles 4.25 |
| #275 merge `b18a43bb` | tackle 2.58 (LB1) | tackle 2.44 (LB1) | no contact |
| #274 merge `f2199c78` | tackle 3.53 | tackle 2.41 | no contact |
| `b559fdc5` (today) | tackle 4.37 | tackle 2.25 | no contact |

- The change came with **#275** (`EDGE_CONTAIN`: "edge widens with a reach
  only as far as containing the back needs"). The edge now contains the toss
  and LB1 makes the tackle in both arms. Admission time and pictures are
  unchanged since #271.
- In support the corner is 2.2–2.9 yd closer to the carrier than in man
  from 2.0 to 3.5 s, and 1.77 yd away when LB1 tackles at 3.75 s. He gets no
  tackle event and no assist. In man, Z blocks him at 3.4 s and he gets no
  closer than 2.85 yd.
- The carriers' paths first differ at 2.95 s. The 2.12 yd difference is
  his presence in the alley plus divergence after that, not a measured
  value of his decision.
- Each run arm has one **unresolved, uncalled** holding record, the same in
  both arms and away from the corner: OFF-OG1 on DT3 under the fixture's
  settings, OFF-C1 at 1.65 s under defaults.

So the PA cost is clear under both settings. The run benefit is real only
where the edge widens without bound, a path due for removal. The code PR
needs a run arm where the corner's support matters on default switches.
That is a re-recording question for the fixture (see "Evidence" below), not a
reason to change the gate.

### Play Lab

`scripts/diag/cov7-lab-scenarios.ts` writes the four arms as Play Lab
scenarios (the fixture's pinned switches by default, `--defaults` for
today's), measuring each expected result in a fresh process.
`npm run lab:replay -- out/lab/scenarios/cov7-deception-support.json --at 0.65 --players D:CB_S,O:Z`
reproduces each one. The Lab's switches are global, so the support
scenarios use global `PASS_FIRST=0`. For PA the frames match the per-corner
switch exactly. For Toss the result matches under both settings (4.85 / 2.25)
but the frames don't, because another man defender also changes. The
per-corner script is the authority.

## The information boundary

The choice may read only the defender's own delayed pictures and his own
belief:

1. **Run belief:** his recognition read (`believesRun`), from his own cues.
2. **An observed block look on his man:** `showsBlock` / `observedBlocking` on
   his picture of the receiver, i.e. low stance with closing velocity within 2 yd
   of the line, or facing-contact geometry.
3. **An unconfirmed exchange:** no acquired non-QB holder. His pictures show
   the QB carrying or nothing; no back with `carrying = true`. A confirmed
   exchange (an acquired carrying back, or the carrier past the line through
   `pursueIfLive`) is a different, stronger state.

**Never read:**
- the offense's `receiverBlockLook` tag or its `until` clock;
- the receiver's behavior object (`ReceiverBlockLook`, `RouteRunner`);
- the play call or concept;
- `sim.carrier`, `scrambled`, `catchAt`, `handoffAt`, `throwAt`, which
  `test/decision-information-guard.test.ts` already enforces.

The code PR adds a guard line so no defensive file reads `receiverBlockLook`.

## The choice

Three ways to answer the same gate:

| | Gate fires (run belief + block look + unconfirmed exchange) | Release cue (his picture of the receiver turns upright and runs) | Confirmed exchange |
| --- | --- | --- | --- |
| **Retain man** (today's default) | stays in man until the runner crosses the line | — | pursuit once the carrier is past the line |
| **Permissive diagnostic** | leaves for the installed alley fit at once | back to man (1.4 s), but laterally committed | fit, then chase |
| **Candidate: squeeze the stalk** | attacks the stalk through the receiver: closes the cushion downhill on the alley side of his man, keeping lateral offset from the receiver within contact reach | back to man with the receiver still in front | releases to the installed alley fit |

### The candidate in football terms

A man corner who reads run and sees his receiver stalk him doesn't leave the
receiver; he plays *through* him. He closes the cushion, gets hands on the
blocker on the side of his fit, and keeps his eyes on the receiver and the
backfield. Only when the exchange is confirmed (he sees the back with the
ball, or the runner breaking toward his alley past the line) does he come
off the block and fill.

- **What he gains:** he's closer to the run fit than in man by the time the
  exchange confirms, and he plays the blocker instead of running around him.
- **What it costs:** depth. A stalk-and-go beats a corner who came downhill.
  That's the honest risk of the technique, paid in recovery speed, not
  forbidden.
- **What it avoids:** the permissive diagnostic's lateral abandonment, where
  on PA he runs 3 yd inside and needs 0.6 s to arrest that momentum.

The rule names no time, no route and no call. Its three states come only from
his pictures: release on an upright receiver, fit on a confirmed exchange,
squeeze while the gate holds. A force player keeps his existing rule; the
permissive branch for him is unchanged.

### Honest fooling

The PA arm can fool him, and the design must neither force nor prevent it.

- **Not forced:** nothing in the fixture or the rule scripts his bite. The
  gate fires only because his own pictures show what a run looks like: QB
  carrying, receiver low and closing, his own run read.
- **Not prevented:** the rule can't use the tag, the release clock, or the
  fact that it's a PA call. If the picture sells, he bites. He pays in
  recovery time that the body physics decides, not in a scripted penalty.
- What separates the arms afterwards is only what he sees next: the receiver
  coming upright into a route, the back without the ball, the QB's drop.

## Evidence the code PR must bring

On the same fixtures (exact setup bytes), each arm against retain man and the
permissive diagnostic:

1. **Activation:** the gate fires on both Toss and PA at the same time and
   with the same pictures. It never fires on untagged ordinary passes: count
   activations over the paired-play grid (`scripts/diag/paired-plays.ts`).
2. **First changed command,** with the picture and belief that changed it.
3. **PA cost:** at the same clock 2.4 s and at the QB's release, depth
   leverage, lateral gap and separation from Z, the QB's consumed evaluations
   of Z, and the outcome.
4. **Run benefit:** his closest approach to the carrier, time into the alley,
   tackle events, and the play's yards. Yards alone don't decide it.
5. **The strongest adverse case** among all arms, named.
6. **A run arm on default switches** where the corner's support decides
   something: re-record the fixture (a wider split, or a run toward Z's side)
   with the variation declared before it runs. Until then the run benefit is
   judged under `EDGE_CONTAIN=0 SEAL_HOLD=0` and said so.
7. **Information:** the decision-information guard plus the new
   `receiverBlockLook` line, and observer equality (the trace changes nothing).
8. **Turns:** big facing swings for this corner (COV-6's operator), since the
   permissive branch turns him inside and back.

## Pre-declared variation

Declared before running. **Release variation: the stalk look is sold until
1.3 s instead of 1.0 s** (`--until 1.3`). It's the same call, side and personnel,
with a later release, as a stalk-and-go sold longer. It tests that the choice
uses no release clock, and it lengthens the window in which the corner can
commit.

Run under the fixture's settings (`EDGE_CONTAIN=0 SEAL_HOLD=0`), with
today's defaults reported alongside:

```sh
EDGE_CONTAIN=0 SEAL_HOLD=0 node --import tsx scripts/diag/cov7-abandonment.ts out/cov7-until1.3 --until 1.3
node --import tsx scripts/diag/cov7-abandonment.ts out/cov7-until1.3-defaults --until 1.3
```

Predictions for retain man vs the permissive diagnostic:
1. Support is admitted at 0.65 s in both Toss and PA, with the same pictures
   as the 1.0 s fixture (the look is the same until 1.0 s).
2. PA: his first upright picture of Z, and the return to man, come later than
   1.4 s, about 1.65–1.75 s (release 1.3 plus picture age).
3. PA: at the QB's release the support arm's lateral gap from Z is at least
   3.0 yd; the retained-man arm's is at most 1.5 yd.
4. Toss, fixture settings: each arm's result changes by less than 1 yd
   against the 1.0 s fixture (Z's run block starts later; the edge and LB_W
   still decide the play), and the corner still wraps in support.

No prediction on completion. Results are recorded below, whichever way they
go.

### Results

*(to be filled from the run of `--until 1.3`)*
