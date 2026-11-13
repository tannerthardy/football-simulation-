"""Gate 1 feasibility (effective-mass plan, Phase 1): does a two-part body with sourced parameters keep the NFL's runner
speed through the first exchange of a front-on hit? Stand-alone, no engine code.

Each player is a planar sagittal chain with three coordinates: hip horizontal position x, lower-link pitch a (pelvis
and legs about the hip) and upper-link pitch b (head, arms, upper and middle trunk about the hip). Small angles, so
horizontal motion only. The links are joined at the hip by a torsional spring-damper (trunk stiffness k, damping c).
The legs stand on the ground; in this first check there is no ground force (feet free), which isolates the exchange.
Pitch of the legs about the hip has its own inertia; the legs carry no restoring torque from the ground here.

Contact: a compression-only spring-damper between the two pad points (upper link, height zp above the ground). It is
critically damped at the engine's torso-contact frequency (9 Hz on the pair's reduced mass), so the only change from
today's engine is that each body is two links instead of one point mass. Collapsing both links into one rigid body
must reproduce the point-mass exchange: that is the identity case below.

Sources (docs/reviews/effective-mass.md, parameter table):
- segment mass shares and centres: de Leva 1996, Table 4. Upper = head + arms + upper and middle trunk, 49.1% of body
  mass; lower = lower trunk (pelvis) + legs, 50.9%;
- trunk stiffness: Cholewicki et al. 2000, 1028-2218 N m/rad with reflexes, damping small (42 +- 64 N m s/rad);
  Brown & McGill 2009, about 110 N m/rad without reflexes;
- hip-extension torque: Harrison et al. 2013, 2.03 +- 0.45 N m/kg (a ceiling the spring torque is clipped to).
Geometry fractions of stature are this note's estimates from de Leva's segment lengths, marked as such in the output.
usage: python3 -I chain.py"""
import math

YD = 0.9144


def body(mass, stature, k_trunk, c_trunk):
    H = stature
    hip = 0.53 * H                         # greater-trochanter height (estimate from de Leva segment lengths)
    mu, ml = 0.491 * mass, 0.509 * mass
    du = 0.21 * H                          # upper-link COM above the hip (head, arms, upper/mid trunk; estimate)
    dl = 0.22 * H                          # lower-link COM below the hip (pelvis + legs; estimate)
    ku, kl = 0.12 * H, 0.17 * H            # radii of gyration about each link's own COM (estimate)
    return dict(m=mass, H=H, hip=hip, mu=mu, ml=ml, du=du, dl=dl, Iu=mu * ku * ku, Il=ml * kl * kl,
                k=k_trunk, c=c_trunk, tmax=2.03 * mass)


def mass_matrix(b):
    # coordinates q = (x_hip, a_lower, b_upper); horizontal COM positions:
    #   upper COM  x + du * b      lower COM  x - dl * a
    mu, ml, du, dl = b['mu'], b['ml'], b['du'], b['dl']
    return [[mu + ml, -ml * dl, mu * du],
            [-ml * dl, ml * dl * dl + b['Il'], 0.0],
            [mu * du, 0.0, mu * du * du + b['Iu']]]


def solve3(M, f):
    a = [row[:] + [f[i]] for i, row in enumerate(M)]
    for i in range(3):
        p = max(range(i, 3), key=lambda r: abs(a[r][i])); a[i], a[p] = a[p], a[i]
        for r in range(3):
            if r != i:
                k = a[r][i] / a[i][i]
                a[r] = [x - k * y for x, y in zip(a[r], a[i])]
    return [a[i][3] / a[i][i] for i in range(3)]


def run(v_yd, zp_frac, rigid=False, k_trunk=1600.0, c_trunk=40.0, mr=96.0, mh=117.0, Hr=1.80, Hh=1.88, T=0.5, dt=2e-5, hz=9.0):
    v = v_yd * YD
    R, Hb = body(mr, Hr, k_trunk, c_trunk), body(mh, Hh, k_trunk, c_trunk)
    if rigid:  # identity case: one rigid body each (stiff trunk, no relative pitch), point-mass-like exchange
        R['k'] = Hb['k'] = 1e6; R['c'] = Hb['c'] = 2e3; R['tmax'] = Hb['tmax'] = 1e12
    zr, zh = zp_frac * Hr, zp_frac * Hh       # pad heights above ground
    MR, MH = mass_matrix(R), mass_matrix(Hb)
    # Jacobian of a pad point (height z) on the upper link: x_pad = x + (z - hip) * b
    JR, JH = [1.0, 0.0, zr - R['hip']], [1.0, 0.0, zh - Hb['hip']]
    qR, dqR = [0.0, 0.0, 0.0], [v, 0.0, 0.0]
    qH, dqH = [0.62 * YD, 0.0, 0.0], [0.0, 0.0, 0.0]   # pads start just touching (sep = 0.62 yd)
    mu_pair = mr * mh / (mr + mh); w = 2 * math.pi * hz
    kc, cc = mu_pair * w * w, 2 * mu_pair * w          # 9 Hz critically damped, as the engine's torso row
    out, t, contact_t, peak = {}, 0.0, 0.0, 0.0
    marks = [0.05, 0.1, 0.2, 0.3, 0.5]
    padR = lambda q: sum(j * x for j, x in zip(JR, q))
    padH = lambda q: sum(j * x for j, x in zip(JH, q))
    gap0 = padH(qH) - padR(qR)
    while t < T + 1e-12:
        comp = gap0 - (padH(qH) - padR(qR))
        rel = sum(j * x for j, x in zip(JR, dqR)) - sum(j * x for j, x in zip(JH, dqH))
        F = max(0.0, kc * comp + cc * rel) if comp > 0 else 0.0
        peak = max(peak, F)
        def gen(b, q, dq, J, sign):
            tau = -b['k'] * (q[2] - q[1]) - b['c'] * (dq[2] - dq[1])
            tau = max(-b['tmax'], min(b['tmax'], tau))
            f = [sign * F * J[0], sign * F * J[1], sign * F * J[2]]
            f[2] += tau; f[1] -= tau
            return f
        fR, fH = gen(R, qR, dqR, JR, -1.0), gen(Hb, qH, dqH, JH, +1.0)
        aR, aH = solve3(MR, fR), solve3(MH, fH)
        for i in range(3):
            dqR[i] += aR[i] * dt; qR[i] += dqR[i] * dt
            dqH[i] += aH[i] * dt; qH[i] += dqH[i] * dt
        t += dt
        for m in marks:
            if m not in out and t >= m - 1e-12:
                padv = sum(j * x for j, x in zip(JR, dqR)) / YD
                com = (R['mu'] * (dqR[0] + R['du'] * dqR[2]) + R['ml'] * (dqR[0] - R['dl'] * dqR[1])) / mr / YD
                hcom = (Hb['mu'] * (dqH[0] + Hb['du'] * dqH[2]) + Hb['ml'] * (dqH[0] - Hb['dl'] * dqH[1])) / mh / YD
                out[m] = (padv, com, hcom, math.degrees(qR[2] - qR[1]))
    out['peak'] = peak
    return out


print('Two-part body, no ground force; runner 96 kg 1.80 m, hitter 117 kg 1.88 m; contact at pad height (fraction of')
print('stature); 9 Hz critically damped pad contact as today. Geometry fractions are estimates (see header).')
print('Speeds in yd/s: runner pad | runner COM | hitter COM | runner trunk pitch (deg, + = upper body back)')
for label, kw in (('rigid (identity: point-mass-like)', dict(rigid=True)),
                  ('two-part, k 1600 N m/rad (Cholewicki mid)', dict()),
                  ('two-part, k 2200 (braced, Cholewicki top)', dict(k_trunk=2200)),
                  ('two-part, k 1000 (Cholewicki low)', dict(k_trunk=1000)),
                  ('two-part, k 110 (no reflexes, Brown & McGill)', dict(k_trunk=110))):
    for zp in (0.67, 0.60):
        o = run(4.0, zp, **kw)
        cells = '  '.join(f"+{m:.2f}s {o[m][0]:4.2f}/{o[m][1]:4.2f}/{o[m][2]:4.2f}/{o[m][3]:+5.1f}" for m in (0.05, 0.1, 0.2, 0.3))
        print(f"  {label:44} pads {zp:.2f}H | {cells} | kept @0.1 {100*o[0.1][0]/4.0:3.0f}% @0.2 {100*o[0.2][0]/4.0:3.0f}% | peak pad force {o['peak']/1000:.1f} kN")
print('NFL (Gate 0, 3-5 yd/s, pad speed): kept 94% at +0.1 s, 86% at +0.2 s.')
print('Measured tackle peak force: 1.66 kN (lab) to 2.0 kN (field), Usman 2011; 2.44-3.40 kN, Seminati (rugby; abstracts).')
print()
print('Contact stiffness sweep (two-part, k 1600, pads 0.67H, 4 yd/s): the natural frequency of the pad contact')
for hz in (9.0, 6.0, 4.0, 3.0, 2.0, 1.5):
    o = run(4.0, 0.67, hz=hz)
    print(f"  {hz:4.1f} Hz | runner pad +0.1 {o[0.1][0]:4.2f} +0.2 {o[0.2][0]:4.2f} +0.3 {o[0.3][0]:4.2f} +0.5 {o[0.5][0]:4.2f} yd/s | kept @0.1 {100*o[0.1][0]/4.0:3.0f}% @0.2 {100*o[0.2][0]/4.0:3.0f}% | hitter COM +0.2 {o[0.2][2]:4.2f} +0.5 {o[0.5][2]:4.2f} | peak {o['peak']/1000:.1f} kN")
