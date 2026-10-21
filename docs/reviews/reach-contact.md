# Reach contact: gentler first load, worse finishing

The arm’s-length proposal is implemented as `REACH_CONTACT=1`, **default-off**.
It can absorb a modest arrival through finite arm/grip force and still allows
an overpowering torso collision. It is not ready for promotion: matched and
fresh inputs both lose completed tackles. Production behavior reproduces the
pre-change native panels exactly; RB-read and the other physics defaults stay
unchanged. No offensive-line changes are included.

Base: `1ac71650b6dc41812e782656792f884a669d696b`, after the roll mirror correction,
combined brace/roll/binding review and arrival diagnostics. Final runtime hash:
`a5a38a3cbe9afe3a8d8728141f20da0a4487b7cd9db16f513e3895fddf26ef01`.
The [receipt](https://github.com/tannerthardy/football-simulation-/blob/67301d24ef56a72b4a205185fb6c76b6dd845c7b/data/reviews/current/reach-contact.json) records full input,
source, observer, operator and raw-output identifiers. The quoted NFL arrival
finding motivated this test; this panel is not a fresh NFL measurement or a
calibration to the reported 3.5/4.2 yd/s difference.

## What causes the hard arrival

The old grasp resists separation but supplies no compressive arm contact.
Its active reel pulls the holder inward; the attained hold distance then
ratchets toward body contact. Acquisition can also wait for a better wrap
while a defender is already within standing reach. Those mechanisms leave
the arriving bodies to absorb momentum before a useful arm brace exists.
The chase and strike requests still ask for the hard arrival. The earlier
front-drive ablation does not establish that every later request is harmless.

The experiment allows the existing tackle attempt within standing reach
instead of waiting for improved wrap quality. It retains occlusion, actual
reach, execution/miss rolls and out-of-reach last-opportunity constraints.
For a successfully acquired, unengaged standing hold outside torso contact,
it adds an acquired span and stops the automatic reel. Compression is bounded
by the lesser of existing grip and arm force, with the same shared allocation,
work accounting and equal/opposite transmitted impulses. Ordinary torso
collisions remain active. No force, traction, grip rating, support integrator,
approach speed or physical player capacity is increased.

This is an early-acquisition **and** contact-law experiment. Once a hold is
acquired earlier, native bond behavior and the attempt’s strike occur earlier
too. It would be incorrect to claim every subsequent movement request or RNG
draw is unchanged. The input state, roster and seed are matched; intervening
physical and controller histories are outcomes.

## Two bounded trials

The first brace kept its original span. It reduced early speed loss but fought
the holder’s attempt to close his wrap: unfinished holds increased from 20 to
82 of 144 in the combined physics arm. Its raw outputs and source pin remain
under `out/reach-contact/fixed-span-*` and in the receipt.

The second trial lets that span shorten only through achieved body compression,
down to the existing contact distance. It never restores separation, prescribes
a speed or teleports a wrap. That reduces unfinished holds to 56, still well
above 20. No third technique or phase heuristic was added. A separate budget
integrity check found that a tiny-capacity brace could starve another hand
claim; allocation now reserves only the brace’s bounded force request. That
correction leaves every native panel result and recorded frame identical.

## Matched and fresh results

“Finish controls” means `LEG_BRACE=1 TACKLE_ROLL=1 WRAP_BIND=1`, all still
experimental. The diagnostic ablation removes the compression brace before
World executes but retains earlier acquisition and no reel. It is not an
additional production option.

| 144 matched inputs | Physical falls | Stopped progress | Escapes | Censored | Median speed change at load +0.2 s |
| --- | ---: | ---: | ---: | ---: | ---: |
| Production defaults | 122 | 0 | 20 | 2 | −1.247 yd/s |
| Finish controls | 100 | 4 | 20 | 20 | −1.004 yd/s |
| Reach alone | 90 | 4 | 22 | 28 | −0.379 yd/s |
| Reach + finish controls | 58 | 10 | 20 | 56 | −0.331 yd/s |
| Earlier acquisition/no reel, compression ablated | 112 | 0 | 20 | 12 | −0.581 yd/s |

All 126 force-loaded matched reps have the +0.2 and +0.4 samples. The other
18 reps are reported as having no transmitted contact, not dropped from the
outcome denominator. Median first-load separation increases from 0.978 to
1.480 yd. Median actual torso impulse during the first 0.2 s falls from 49.84
to zero kg·yd/s; zero is a median, not a guarantee. Across the entire rep,
torso-loaded pairs fall from 98 to 52 of 144.

Relative to finish controls, reach contact loses 40 finishes and gains four.
The no-compression ablation loses eight and gains 16; its net improvement
does not erase the eight adverse controls. Every changed finish and observed
completed-grip advance is retained in the receipt.

| 96 fresh inputs | Physical falls | Stopped progress | Escapes | Censored | Median speed change at load +0.2 s |
| --- | ---: | ---: | ---: | ---: | ---: |
| Finish controls | 74 | 0 | 22 | 0 | −1.030 yd/s |
| Reach + finish controls | 36 | 12 | 22 | 26 | −0.504 yd/s |
| Earlier acquisition/no reel, compression ablated | 66 | 4 | 22 | 4 | −0.550 yd/s |

All 82 force-loaded fresh reps have +0.2 samples. Reach contact loses 26
finishes without gaining any; the ablation loses four without gaining any.
The apparent matched ablation improvement does not generalize cleanly.

These are speeds measured from each arm’s first actual transmitted load, not
paired samples at an identical time after snap. Earlier acquisition changes
that clock. At +0.4 s, matched median changes are −1.375 versus −1.078 yd/s;
the gap narrows. At the actual torso-contact clock, +0.2 changes are −0.541
versus −1.769 yd/s on different surviving contact populations (98 versus 52).
The bodies that still collide have not been made benign. Later live-sample
counts, contact clocks and censoring remain explicit in the receipt. No terminal
sample is extended to manufacture a late observation.

## Representative mechanism and controls

For the mirrored 45°/6 yd/s, no-cut rep, seed 3001, roster 61/62, the first
requested and achieved differences occur at World interval 2.55 s. Reach
contact acquires at 1.559 yd with the same pre-acquisition chase history; the
original finish-control hold first bears load at 2.65 s and 0.984 yd.

The corrected reach span compresses to 0.706 yd by 2.75 s but does not reach
the original 0.522 yd wrap distance. There is no torso impulse in this rep.
The runner remains upright at the time limit, advancing an observed 13.53 yd
after acquisition. The finish control physically falls; the no-compression
ablation also physically falls. Compression/slip classification, earlier wrap
quality and the permanently disabled reel all change the eventual hold and
recovery load. This isolates a failure of the proposed contact/closure sequence;
it does not identify one of those components as the sole cause.

The 90°/6 yd/s diving control, same seed and its mirror, is exactly unchanged
in result, requests and recorded movement across all three arms. The 0°/8 yd/s
standing arrival still overwhelms the brace, makes actual torso contact and
ends in a physical fall. The finite brace does not award separation or a tackle.

## Verification and limits

Sixteen new law tests cover modest and overpowering arrivals, zero/tiny grip
limits, mixed hand allocation, duplicate contacts at grip- and arm-limited
capacities, reflected patch contact and lower attachment. Momentum includes
actual external ground impulses; closed-system angular momentum is checked
where external ground force and torque are absent. Passive work, arm impulse,
arm work and support motor budgets stay bounded.

Each native panel rep runs observed and plain with exact endpoint/RNG/state
equality. The carrier’s vector momentum closes against actual ground, torso,
grasp and other executed channels (largest residual below 7e−13 kg·yd/s).
The collector does not add perception calls or random draws. Acquisition is
separate from positive force and torso contact; proximity or a held joint alone
does not count as contact.

Eight native center/patch cases then replay their own recorded decision tapes
at 12/24/48/96 World substeps. Initial bodies and decision hashes are identical
within each tape; acquired compression, slip, break and fall remain physical
outcomes, not imposed recorded states. Different arms acquire at different
times, so their first-grip bodies are not claimed identical. The 45°/6 loss
remains upright at every resolution; maximum position differences from 96
steps shrink 0.312→0.128→0.036 yd. The unchanged side control still falls at
every resolution. The fast patch control still escapes; the retained rear
control still does not finish. Finer stepping does not repair the finishing loss.

Whole-game averages were not used to rescue a candidate that fails ordinary
contact controls. Raw outputs are ignored local evidence; regenerate them with
the committed scripts and input manifest. The mirrored losing tapes and diving
control are also committed as a small compressed packet. Replay without another
native panel collection:

```sh
LEG_BRACE=1 TACKLE_ROLL=1 WRAP_BIND=1 REACH_CONTACT=1 \
  node --import tsx scripts/diag/physics/reach-contact-replay.ts
```

Full defaults: **1,612 tests pass, only the existing Tite assertion fails**;
141 Python checks, typecheck and build pass. With all four experiments enabled,
187 focused checks pass and two preserved assertions fail: the approach-tackle
finish control and the old standing-command waiting expectation. The latter
expresses behavior intentionally changed by earlier acquisition; the former
is a genuine promotion blocker. Neither assertion is weakened or repinned.
Logs and their hashes are recorded with the receipt.

## Single best next step

Give the physics owner the mirrored 45°/6 tape and its diving/fast-front
controls. Diagnose the first force-bearing compression interval through wrap
closure: distinguish compression absorption from tangential grip slip, then
test whether finite-force, finite-work arm shortening can close a wrap after
absorbing arrival. The current prototype permanently disables reeling; that
is not a complete model of this sequence. Keep capacities and pre-contact
approach requests fixed. Do not promote the brace, strengthen it, or slow the
defender to improve the early speed average.
