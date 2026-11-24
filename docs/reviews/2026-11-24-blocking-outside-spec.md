# Blocking: outside reviewer's verified sources, statics with lean and step, arm/hand spec, technique check (2026-11-24)

Recorded by Integration from the outside reviewer's (Gemini) second package, for Tools / Physics and the line-play
work. It supplements `2026-11-24-blocking-physics-plan.md` §7. This is a proposal to critique, not a design of
record: every constant marked "choice" is a stated choice, and Tools still re-opens the sources it quotes.

## 1. Sources, after the reviewer re-opened each one

Five of its first-draft attributions were wrong and are corrected here.

| Quantity | Figure | Source | Status |
|---|---|---|---|
| Cleat traction, natural grass, 2.8 kN preload | peak 2.8–4.2 kN (ratio 1.0–1.5); the sod tears and limits force | Kent, Forman, Lessley, Crandall 2015, Sports Biomech | Verified, full text. The ratio is our division. |
| Cleat traction, infill turf, same preload | 18 of 19 cleats held to the machine's 4.8 kN limit (≥ 1.71); one released at 3.9 kN | same | Verified |
| Grass species | bermuda 3.86 ± 0.45 kN, Kentucky bluegrass 2.66 ± 0.23 kN (fore-aft) | Kent et al. 2021, J Biomech | Abstract verified; preload not verified |
| No-slip floor | traction ratio > 0.8 | Valiant 1990, via Loud et al., Sci Med Football | Verified second-hand |
| Individual scrum push | group means 1,000–2,000 N sustained; best near 40% of height, knee and hip near 120° included | Martin & Beckham 2020 (review), BMC Sports Sci Med Rehabil | Verified. Per-body-weight not tabulated; about 0.9–2.0 by arithmetic. The "182% body weight" figure in the first draft was an eight-man pack difference, not one man: withdrawn. |
| Eight-man pack | sustained 0.93–0.97 × pack weight; engagement peak 1.88–1.94 × | Preatoni et al. 2015, Br J Sports Med | Verified |
| Sprint horizontal force at zero speed | 0.69–0.85 body weights; force falls linearly with speed | Šarabon et al. 2021; Stavridis et al. 2020 (applying Samozino 2016) | Verified |
| Knee angle | isometric quadriceps torque highest at 70° flexion of those tested | Pincivero et al. 2004, J Biomech | Abstract verified; drop-off sizes not verified |
| Arm pull by elbow | extended pull 29% over flexed; flexed pull 26% over flexed push | Seo, Armstrong, Young 2010, Ergonomics | Verified. Seated, one hand, n = 8; extended push not tested. |
| Hand on surface friction | 0.40–1.10 by material (bare on rubber 1.10; cotton on rubber 0.61) | same | Verified |
| Push against pull | standing push 251 N, pull 400 N; push 71% of pull | Das & Wang 2004, Int J Occup Saf Ergon | Abstract verified; general students, overhead reach |
| Press by elbow angle | sticking point near 90° | Lum, Haff, Barbosa 2020, Sports | Verified; force ratio 90° to 120° not reported |
| Punch speed | single maximal 9.26 ± 2.09 m/s; in combination 7.5–8.0 | Piorkowski, Lees, Barton 2011, Sports Biomech | Abstract verified; per-punch sub-figures not verified |

Gaps, stated plainly: no public study of a lineman's sustained push per body weight, of two-handed standing push by
elbow angle, or of a lineman's punch speed. A lineman's punch at 4–6 m/s is a choice bounded by boxing.

## 2. Statics with both men leaning and stepping

Lean α moves a man's centre forward of his rear foot: b(α) = b0 + h0·sin α; contact height z(α) = z0·cos α. A
recovery step of length d replaces b with b + d; continuous stepping at speed v replaces it with b + v/ω0,
ω0 = √(g/h), which is our `criticalDeviation`.

For 140 kg, h0 0.95 m, z0 1.10 m, b0 0.35 m, level pads, step 0.45 m in 0.20 s:

| Lean | Tip limit, no step | With a planted step | Continuous stepping | Binds first |
|---|---|---|---|---|
| 0° (upright set) | 0.32 BW | 0.73 | 0.95 | balance, at any grip |
| 15° (pass set) | 0.56 | 0.98 | 1.21 | balance on grass and turf |
| 25° (anchor, drive) | 0.75 | 1.21 | 1.42 | grip at our 1.1; balance on infill turf |
| 35° (low drive) | 0.99 | 1.49 | 1.70 | grip on grass |

Without a step, balance binds until leans of 39° (grip 1.1) to 54° (grip 1.7).

The reviewer's verdict: both matter, at different postures. A leaning, stepping man hits our 1.1 grip ceiling before
he tips, so the grip limit and the force-velocity relation come first to make leg strength show; an upright pass
setter, or a man with a rusher under his pads, is limited by balance, so the base and recovery fix goes in the same
phase. This agrees with the plan's Phase 1 holding both. The bench's per-tick "which limit binds" decides.

## 3. One arm and one hand: a spec to critique

Inputs per arm: shoulder point; hand point on the other man's torso (across the chest y, height z; frame half-width
and shoulder edge); reach d ≤ arm length L; arm direction u; surface normal n. Derived: elbow angle
θ = 2·asin(d/L); flare φ = angle of the arm off his facing in the horizontal plane (inside hands about 0–15°,
outside 25–45°). Capacities: axial push at lockout; grip tension; shoulder transverse torque; hand-on-pad friction
(0.6–1.0); hand speed; effective punch mass 4–8 kg (choice).

- Axial push: F = F_lockout · f(θ) · cos φ, with f lowest near 90° (about 0.75–0.80, choice), 1 near lockout, falling
  when the elbow is jammed below 60°.
- Axial pull (grip only): F = F_grip · (0.775 + 0.225·(sin(θ/2) − 0.707)/0.293) · cos φ, which reproduces the 29%.
- Transverse limit at the hand: F = τ_shoulder / d · cos φ. Strong in tight, weak at lockout and with wide elbows.
- Combined envelope: (axial/axial cap)² + (transverse/transverse cap)² ≤ 1.
- Open hand: pushes only; sideways hold ≤ friction × normal force; past that it slides, and past the shoulder edge
  or pad band it is off.
- Grip: adds tension and sideways hold with no pressure, up to the grip limit (shear factor about 0.8, choice);
  breaks past the limit, past arm's length, or when struck off. A holding signal follows directly: grip with tension
  on a separating man, or grip shear outside the frame.
- Punch: impulse J = min((1 + e) · m_arm·m_other/(m_arm + m_other) · closing speed, structural cap · cos φ · Δt),
  e about 0.15, Δt about 0.03 s (choices), applied at the hand point.
- Chop on the forearm at fraction λ of its length: the hand is displaced only if
  λ·F_chop > friction × normal force (+ grip hold) + τ_shoulder/d · cos φ, with enough impulse left to clear the pad.
  A loaded inside hand in tight is hard to move; a light, extended or wide hand is easy. The reviewer offers this as
  the reason `RUSH_HANDS` let clubs beat set hands.
- States: free, on (open), on (grip), slipped, displaced, with re-fit time = travel / hand speed.
- Both men's contacts solved together each substep.

Integration's notes for Tools: this is a reasonable starting shape. Question the equal-segment elbow geometry, the
cos φ on every term, where shoulder torque comes from (a rating-fed capacity, by what map), and whether the trunk's
own yaw and the feet should carry part of the transverse load (a man steers a rusher with his feet and trunk as much
as his shoulder).

## 4. Technique check against the plan's §3

Additions accepted into the plan's table (the plan's row stands where not listed):

- **Bull rush / drive block:** also stopped by an inside lockout that denies the low position, with no better base.
  A run defender can also slant across the blocker's lean.
- **Long arm:** also fails when the blocker turns or steps to an angle; a single arm at lockout has the least
  sideways hold.
- **Dip:** the lowered shoulder is a steep surface a punch slides off; it fails when the tackle strikes the hip or
  ribs instead.
- **Club, chop:** a loaded open hand resists without gripping (see the chop condition).
- **Swim:** raises the rusher's own centre and opens his ribs; it fails against a balanced blocker who has not
  leaned.
- **Snatch:** needs grip tension, not only removal of the push.
- **Spin:** two inside hands cancel the turn even while the blocker pushes.
- **Counter:** needs the blocker to have over-set on the first move.
- **Punch:** fails when thrown while lunging.
- **Double team:** splitting it works by forcing both blockers' arms wide so their pushes cancel sideways.
- **Lockout:** keeps the blocker off the chest, not off the defender's feet; a large mismatch still drives him.
- **Shed:** needs extension room first (stack, then shed) and purchase.
- **Hold:** the grip's physical break is separate from whether the official sees it.
