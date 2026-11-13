"""Check 2 for attempt two (Integration, 2026-11-10): torso contact shape and yaw at the NFL's offset. Stand-alone planar
rigid bodies, no engine code, no ground force (isolates the exchange, as chain.py).

Each player is a rigid planar body (x, y, yaw) with mass m and yaw inertia m k^2. Its torso contact shape is either:
- disc: radius 0.24 + (lb - 180) / 1100 yd, the engine's own law (src/players/physical.ts);
- capsule: a segment along the shoulder line with half-length (a - r) and radius r, so lateral half-extent a and depth
  half-extent r. Shoulder half-width a = 0.27 yd, depth r = 0.15 yd (anthropometric estimate with pads: biacromial
  breadth plus pads, chest depth; see docs/reviews/effective-mass.md).
Contact: penetration of the two shapes along the closest-point normal, a compression-only spring-damper critically
damped at 9 Hz on the pair's reduced mass (the engine's torso row), and Coulomb friction mu at the contact point
(regularized). Yaw is either fixed (facing held) or free (the contact can turn the bodies).

The runner (96 kg, 210 lb) runs along +x at v; the hitter (117 kg, 258 lb) stands with his centre offset `off` to the
side of the runner's path. Speeds are reported from first touch of the shapes, which is the aligned zero.
usage: python3 -I shape.py"""
import math

YD_M = 0.9144


def disc_r(lb):
    return min(0.42, max(0.22, 0.24 + (lb - 180) / 1100))


def closest_seg_seg(p1, q1, p2, q2):
    # closest points between segments p1q1 and p2q2 (2D)
    d1 = (q1[0] - p1[0], q1[1] - p1[1]); d2 = (q2[0] - p2[0], q2[1] - p2[1]); r = (p1[0] - p2[0], p1[1] - p2[1])
    a = d1[0]**2 + d1[1]**2; e = d2[0]**2 + d2[1]**2; f = d2[0]*r[0] + d2[1]*r[1]
    if a < 1e-12 and e < 1e-12:
        return p1, p2
    if a < 1e-12:
        s, t = 0.0, max(0.0, min(1.0, f / e))
    else:
        c = d1[0]*r[0] + d1[1]*r[1]
        if e < 1e-12:
            t, s = 0.0, max(0.0, min(1.0, -c / a))
        else:
            b = d1[0]*d2[0] + d1[1]*d2[1]; den = a*e - b*b
            s = max(0.0, min(1.0, (b*f - c*e) / den)) if den > 1e-12 else 0.0
            t = (b*s + f) / e
            if t < 0: t, s = 0.0, max(0.0, min(1.0, -c / a))
            elif t > 1: t, s = 1.0, max(0.0, min(1.0, (b - c) / a))
    return (p1[0] + d1[0]*s, p1[1] + d1[1]*s), (p2[0] + d2[0]*t, p2[1] + d2[1]*t)


class Body:
    def __init__(self, m, lb, x, y, vx, yaw, shape, k_yaw=0.16):
        self.m, self.I = m, m * k_yaw * k_yaw
        self.x, self.y, self.vx, self.vy, self.yaw, self.w = x, y, vx, 0.0, yaw, 0.0
        if shape == 'disc':
            self.half, self.r = 0.0, disc_r(lb)
        else:
            self.half, self.r = 0.27 - 0.15, 0.15

    def segment(self):
        # shoulder line is perpendicular to facing (yaw)
        sx, sy = -math.sin(self.yaw) * self.half, math.cos(self.yaw) * self.half
        return (self.x - sx, self.y - sy), (self.x + sx, self.y + sy)


G = 10.72          # yd/s^2
TRACTION = 1.25    # ground-force limit as a multiple of weight: the engine's limit measured in game (1287 kg yd/s^2 on 96 kg)
D0 = 0.13          # compliant layer depth, yd (0.12 m: pads, tissue and arms yielding before the stiff core)


def run(v, off, shape, hitter_yaw, free_yaw, mu=0.4, T=1.0, dt=2e-5, law='today', drive=(0.0, 0.0)):
    R = Body(96, 210, 0.0, 0.0, v, 0.0, shape)
    H = Body(117, 258, 1.2, off, 0.0, hitter_yaw, shape)
    mu_pair = R.m * H.m / (R.m + H.m); w = 2 * math.pi * 9.0
    kn, cn = mu_pair * w * w, 2 * mu_pair * w
    t, touch, peak, marks, out = 0.0, None, 0.0, [0.1, 0.2, 0.3, 0.5, 1.0], {}
    while t < 3.0:
        (a1, b1), (a2, b2) = R.segment(), H.segment()
        pr, ph = closest_seg_seg(a1, b1, a2, b2)
        dx, dy = ph[0] - pr[0], ph[1] - pr[1]; d = math.hypot(dx, dy) or 1e-9
        pen = R.r + H.r - d
        fx = fy = 0.0
        if pen > 0:
            if touch is None:
                touch = t; v0 = R.vx
            nx, ny = dx / d, dy / d
            # contact point: midway between the two surfaces
            cx, cy = pr[0] + nx * (R.r - pen / 2), pr[1] + ny * (R.r - pen / 2)
            rRx, rRy, rHx, rHy = cx - R.x, cy - R.y, cx - H.x, cy - H.y
            vRx, vRy = R.vx - R.w * rRy, R.vy + R.w * rRx
            vHx, vHy = H.vx - H.w * rHy, H.vy + H.w * rHx
            rvx, rvy = vRx - vHx, vRy - vHy          # runner relative to hitter at the contact
            vn = rvx * nx + rvy * ny                 # closing along the normal (+ = closing)
            if law == 'today':      # the engine's torso row: 9 Hz, critically damped
                Fn = max(0.0, kn * pen + cn * vn)
            elif law == 'hunt':     # ramped damper (Hunt-Crossley): damping grows with compression, none at first touch
                Fn = max(0.0, kn * pen * (1 + 1.5 * 0.3 / YD_M * vn))
            else:                   # compliant layer: soft over D0 (k_s), then the stiff core; ramped damping
                ks = 2 * 0.5 * mu_pair * (4.0 * YD_M) ** 2 / (0.12 ** 2) * 1.0   # N/m: peak ~ KE / D0 at 4 yd/s
                ks = ks  # kg/s^2, the same number in yd units
                spring = ks * min(pen, D0) + kn * max(0.0, pen - D0)
                Fn = max(0.0, spring * (1 + 1.5 * 0.3 / YD_M * vn))
            tx, ty = -ny, nx; vt = rvx * tx + rvy * ty
            Ft = -max(-mu * Fn, min(mu * Fn, cn * vt))   # regularized Coulomb friction on the runner
            fx, fy = -Fn * nx + Ft * tx, -Fn * ny + Ft * ty   # force on the runner
            peak = max(peak, math.hypot(fx, fy))
            if free_yaw:
                R.w += (rRx * fy - rRy * fx) / R.I * dt
                H.w += (rHx * -fy - rHy * -fx) / H.I * dt
        # Leg drive: a share of each body's ground-force limit, the runner forward while under his 4 yd/s request,
        # the hitter toward the runner while he is not already moving that way faster than 0.5 yd/s.
        gr = drive[0] * TRACTION * R.m * G if R.vx < v else 0.0
        gh = drive[1] * TRACTION * H.m * G if H.vx > -0.5 else 0.0
        R.vx += (fx + gr) / R.m * dt; R.vy += fy / R.m * dt
        H.vx += (-fx - gh) / H.m * dt; H.vy -= fy / H.m * dt
        for b in (R, H):
            b.x += b.vx * dt; b.y += b.vy * dt; b.yaw += b.w * dt
        t += dt
        if touch is not None:
            for m_ in marks:
                if m_ not in out and t - touch >= m_:
                    out[m_] = (R.vx, H.vx, math.hypot(H.x - R.x, H.y - R.y), math.degrees(H.yaw - hitter_yaw))
            if len(out) == len(marks):
                break
    if touch is None:
        return None
    return dict(kept={m_: out[m_][0] / v0 for m_ in marks}, hv={m_: out[m_][1] for m_ in marks},
                sep={m_: out[m_][2] for m_ in marks}, yaw={m_: out[m_][3] for m_ in marks}, peak=peak * YD_M)


SQUARE, SIDE = math.pi, math.pi / 2     # hitter faces the runner (square) or presents his side (side-on)
print('Runner 96 kg (210 lb) at 4 yd/s along +x; hitter 117 kg (258 lb) offset from the path; no ground force; mu 0.4.')
print('Speed kept from first touch (runner along his path), hitter speed, centre separation, hitter yaw, peak force.')
print('disc radii (engine law): runner %.3f, hitter %.3f yd (sum %.3f); capsule: half-width 0.27, depth 0.15 yd' % (disc_r(210), disc_r(258), disc_r(210) + disc_r(258)))
cases = [('disc (today)', 'disc', SQUARE, False),
         ('capsule, hitter square, yaw fixed', 'capsule', SQUARE, False),
         ('capsule, hitter square, yaw free', 'capsule', SQUARE, True),
         ('capsule, hitter side-on, yaw fixed', 'capsule', SIDE, False),
         ('capsule, hitter side-on, yaw free', 'capsule', SIDE, True)]
for off in (0.1, 0.2, 0.31, 0.4):
    print(f'-- offset {off:.2f} yd')
    for label, shape, yaw, free in cases:
        o = run(4.0, off, shape, yaw, free)
        if o is None:
            print(f'   {label:36} no contact'); continue
        print(f"   {label:36} kept +0.1 {100*o['kept'][0.1]:3.0f}% +0.2 {100*o['kept'][0.2]:3.0f}% +0.3 {100*o['kept'][0.3]:3.0f}% +0.5 {100*o['kept'][0.5]:3.0f}%"
              f" | hitter +0.2 {o['hv'][0.2]:4.2f} yd/s | sep +0.3 {o['sep'][0.3]:.2f} +1.0 {o['sep'][1.0]:.2f} | hitter yaw +0.3 {o['yaw'][0.3]:+4.0f} deg | peak {o['peak']/1000:4.1f} kN")
print()
print('Ground force and contact law at the NFL median offset (0.31 yd) and 0.20 yd; leg drive as a share of each ground-force limit')
print('(runner, hitter): none; observed in game (0.14, 0.28); runner at full limit (1.0, 0.28); both full (1.0, 1.0).')
for off in (0.31, 0.20):
    for law in ('today', 'hunt', 'layer'):
        for label, shape, yaw, free in (('disc', 'disc', SQUARE, False), ('capsule square, yaw free', 'capsule', SQUARE, True), ('capsule side-on, yaw free', 'capsule', SIDE, True)):
            cells = []
            for dr in ((0.0, 0.0), (0.14, 0.28), (1.0, 0.28), (1.0, 1.0)):
                o = run(4.0, off, shape, yaw, free, law=law, drive=dr)
                cells.append(f"{100*o['kept'][0.1]:3.0f}/{100*o['kept'][0.2]:3.0f}/{100*o['kept'][0.3]:3.0f}% {o['peak']/1000:4.1f}kN")
            print(f"  off {off:.2f} {law:6} {label:26} | " + ' | '.join(cells))
print('  (each cell: speed kept at +0.1/+0.2/+0.3 s from first touch, peak contact force)')
print('NFL from torso distance: about 0.3 yd/s lost per tenth at 3-5 yd/s (~92% kept at +0.1 s); separation reopens 0.49 -> 0.92 by +1.0 s; measured tackle peaks 1.7-3.4 kN.')
