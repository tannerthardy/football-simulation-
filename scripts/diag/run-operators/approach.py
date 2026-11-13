"""Who brings the sideways slip into a front-on contact (Integration, 2026-11-10)? Same code on NFL tracking and sim
dumps, same contacts as frontcourse.py: first defender within 1.0 yd of the carrier after the handoff, carrier depth
-1..3 yd, hitter within 45 deg ahead of the carrier's travel.

At first proximity (velocities by backward difference over 0.1 s, as frontcourse):
- relative velocity (runner minus hitter) split along the line of centres (closing) and across it (tangential, |.|);
  the tangential part split into each man's own velocity across that line, signed + in the sense of the slip, so
  runner + hitter = the slip;
- runner: speed; angle between his velocity and the line to the hitter (0 = running straight at him); how much his
  heading turned over the last 0.5 s; the same angle 0.5 s earlier;
- hitter: speed; angle between his velocity and the line to the runner (0 = closing straight at him);
- sanity (is the event the same stage of contact?): centre distance at the event and the frame before.
usage: python3 -I approach.py <nfl.jsonl.gz | sim zone dump with off> [...]"""
import sys, math, os, statistics as st
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_argv, sys.argv = sys.argv, sys.argv[:1]   # frontcourse reports on its argv at import
import frontcourse as fc  # noqa: E402
sys.argv = _argv


def ang(ax, ay, bx, by):
    na, nb = math.hypot(ax, ay), math.hypot(bx, by)
    if na < 1e-9 or nb < 1e-9:
        return None
    return math.degrees(math.acos(max(-1.0, min(1.0, (ax * bx + ay * by) / (na * nb)))))


def rows(path):
    for C, D, O, ho, e, *_ in fc.plays(path):
        h = max(1, int(round(ho * 10)))
        hit = next((f for f in range(h, e) if min(math.dist(d, C[f]) for d in D[f]) <= 1.0), None)
        if hit is None or e - hit < 2 or hit < 6 or not (-1 <= C[hit][0] < 3):
            continue
        j = min(range(len(D[hit])), key=lambda j: math.dist(D[hit][j], C[hit]))
        vel = lambda P, f: ((P[f][0] - P[f-1][0]) * 10, (P[f][1] - P[f-1][1]) * 10)
        H = [d[j] for d in D]
        vr, vh = vel(C, hit), vel(H, hit)
        rx, ry = H[hit][0] - C[hit][0], H[hit][1] - C[hit][1]; rd = math.hypot(rx, ry) or 1e-9
        nx, ny = rx / rd, ry / rd
        if math.hypot(*vr) < 0.5 or (nx * vr[0] + ny * vr[1]) / math.hypot(*vr) < math.cos(math.radians(45)):
            continue
        tx, ty = -ny, nx
        relx, rely = vr[0] - vh[0], vr[1] - vh[1]
        vt = relx * tx + rely * ty; s = 1 if vt >= 0 else -1
        vr5 = vel(C, hit - 5)
        r5x, r5y = H[hit-5][0] - C[hit-5][0], H[hit-5][1] - C[hit-5][1]
        yield dict(closing=relx * nx + rely * ny, slip=abs(vt), run_t=s * (vr[0] * tx + vr[1] * ty), hit_t=-s * (vh[0] * tx + vh[1] * ty),
                   rs=math.hypot(*vr), r_ang=ang(vr[0], vr[1], rx, ry), r_turn=ang(vr[0], vr[1], *vr5), r_ang5=ang(vr5[0], vr5[1], r5x, r5y),
                   hs=math.hypot(*vh), h_ang=ang(vh[0], vh[1], -rx, -ry) if math.hypot(*vh) > 0.5 else None,
                   dist=rd, dist_prev=math.dist(C[hit-1], H[hit-1]))


def med(v):
    v = [x for x in v if x is not None]
    return st.median(v) if v else float('nan')


def mean(v):
    v = [x for x in v if x is not None]
    return sum(v) / len(v) if v else float('nan')


for p in sys.argv[1:]:
    R = list(rows(p))
    m = lambda k: med([r[k] for r in R]); a = lambda k: mean([r[k] for r in R])
    print(f"== {os.path.basename(p)}: {len(R)} front-on first contacts")
    print(f"   at proximity: closing {m('closing'):.2f} yd/s, slip |tangential| {m('slip'):.2f} (mean {a('slip'):.2f}) = runner {a('run_t'):+.2f} + hitter {a('hit_t'):+.2f} (means, + = into the slip)")
    print(f"   runner: speed {m('rs'):.2f}, angle to the line to the hitter {m('r_ang'):.0f} deg (0.5 s earlier {m('r_ang5'):.0f}), heading turned over 0.5 s {m('r_turn'):.0f} deg")
    print(f"   hitter: speed {m('hs'):.2f}, angle of his velocity to the line to the runner {m('h_ang'):.0f} deg (moving > 0.5 yd/s)")
    print(f"   sanity: centre distance at the event {m('dist'):.2f} yd, the frame before {m('dist_prev'):.2f}")
