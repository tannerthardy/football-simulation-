# Loose-ball recovery and physical tackle evidence

## Recommendation

Keep the reduced shared World. Remove the independent random whistle that
declared an upright loose-ball recoverer tackled, then let the existing carrier,
pursuit, collision, grip and support lifecycle execute the next interaction.
No new foot solver, force constant, strength bonus or grip change is needed.

This repair addresses an unsupported terminal outcome, not the main cause of
the eight-game rushing tails. High passing YAC in the retained packet mostly
comes from late/no contact or early weak holds that slip, rather than prolonged
secure dragging. Assignment, recognition and approach still need investigation.

## What was wrong

`PlaySim.updateBall()` acquires loose-ball possession only for an eligible
upright player within one yard and below the ball's recovery-height limit. Its
existing acquisition chance remains. After `possess(best, 'recovery')`, the
old code separately drew a 75% chance and immediately whistled `tackle` because
the recovering player supposedly fell on the ball. The body performed no fall
and the result contained no tackle event.

That conflated possession, a possible decision to cover the ball and actual
down. The small repair deletes that second draw/whistle. Upright recoverers can
scoop and advance; the existing physical tackle, boundary and scoring rules
remain authoritative. An explicit voluntary cover/surrender technique and
grounded recovery rules remain future work. The current exclusion of falling,
down and rising recoverers is preserved rather than silently expanded.

## Source-pinned native witness

The previously unclassified `TA-R2-iz_strong-over-L-S3` is Inside Zone against
Over/Cover3, roster seeds 41/42, snap seed 3, LOS40, no audibles. Published
source is `9c3c809`, whole-src SHA
`8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942`.
Its running back fumbles at2.65; the center recovers at3.35 while upright,
moving1.39yd/s, with no tackle bond. The old recovery coin immediately ends
the play for3.47yd at3.40.

An isolated archive deletes only that coin/whistle. Its whole-src SHA is
`0863dc038fd1f5046cf47bb6ff49096dc554807cbdcf1f50039b94e011c6e74c`.
Initial profiles, bodies and commands match. Every recorded state agrees
through pre3.35 and physical bodies remain identical immediately after that
tick. The old next draw is the recovery-whistle `.75`; after removal the same
random value goes to a legitimate tackle miss draw `.01`. Subsequent draws
intentionally diverge; these are not paired random future outcomes.

DT_S, LB_M and LB_S acquire genuine grips on the recovered center. He loses
support during3.70–3.75, reaches physical down during4.10–4.15 and finishes
for3.72yd at4.15. His bond age is.75s and stall is.50s, below both the four-second
cap and forward-progress threshold. No fall, tackle or final gain is imposed.

The final combined source
`c2b65e9f02a95a80dde97625d6e2dd1bdf89da327eb15f2eb093860af08e1ff8`
reproduces the isolated result and recorded tick/body/bond/RNG/choice fields
exactly, excluding archive-specific caller paths. All three recorded executions
match plain unrecorded complete result/body/intent/mind/RNG controls. This is
one retained causal witness, not an NFL recovery or rushing-rate estimate.

## Controls and remaining support questions

[The recovery tests](../../../test/loose-ball-recovery.test.ts) contain15 contracts.
Identical test bytes fail two upright-scoop cases and pass13 controls on the
published source; the repaired candidate passes15/15. Controls preserve
acquisition probabilities, maturity/reach and off-feet exclusions. Actual
World execution produces later physical tackles for offensive and defensive
recoverers in both mirrors. Defensive scoops can advance while offensive yards
stay credited at the fumble spot and return segments retain their meaning.
Tests do not create a fall or force an artificial whistle to finish a tackle.

The independent nine-native-play audit retains ordinary, adverse and largest
YAC cases. Four secured passing controls finish with actual carrier down at
bond ages.70–1.00s; a pocket-QB control correctly finishes upright in grasp.
Three largest YAC touchdowns have no grip or lose weak holds after.15–.20s.
The audit copies existing entrypoint state only and all observer controls pass.

The published162-run,96-pass and separate32-approach packet has no terminal
event at least four seconds after its earliest recorded acquisition. The
conservative3.5s screen retains one scramble: its first dive breaks, a later
bond forms, then the carrier falls physically before finishing. These panels
overlap and must not be pooled as independent football evidence. The inherited
hold cap remains a modeling debt; it does not explain these current tails.

Retain terminal provenance in diagnostics: physical down, QB grasp, stopped
forward progress, hold cap, recovery shortcut, boundary/score and timeout are
different mechanisms. A `tackle` outcome alone does not prove physical support
failure. Reopen the support/contact solver when a current achievable request
demonstrates unexplained force, work or a numerical transition. Historical
hand-fight fall disagreements have already fallen to0/9; remaining roughly
.182yd trajectory error is a local numerical-reference limit, not evidence to
restart an anatomical-model campaign.

The ignored research tools and raw receipts are under `out/contact-follow-up/`:
`terminal-contact-audit.ts`, `recovery-native-follow-up.ts`, native baseline,
isolated and final gzip reports, first-fork comparison, ending screen and
same-test-byte feature receipt. The tools preserve the exact archive locations
and require an announced frozen source SHA before collection.
