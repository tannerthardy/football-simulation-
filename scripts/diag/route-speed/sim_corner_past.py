# How far past each declared route corner the sim body carries on its incoming direction, and how far it swings outside the next leg.
# Reads the BREAKS=1 dump of sim_route_speed.ts (paths with their declared waypoints, 10 Hz).  python3 -I sim_corner_past.py DUMP.json
import json, sys, math, statistics as st, collections as C
R = json.load(open(sys.argv[1])); g = C.defaultdict(list)
for r in R:
    wp, tr = r.get('wp') or [], r['tr']
    if len(tr) < 20 or len(wp) < 2: continue
    pts = [(x0, y0) for x0, y0 in [(r['x0'] - 40, r['y0'])]] + [(w[0], w[1]) for w in wp]
    for i in range(1, len(wp)):          # corner = waypoint i (index in pts: i), incoming leg pts[i-1]->pts[i], outgoing pts[i]->pts[i+1]
        if i + 1 >= len(pts): break
        a, b, c = pts[i - 1], pts[i], pts[i + 1]
        ux, uy = b[0] - a[0], b[1] - a[1]; un = math.hypot(ux, uy); vx, vy = c[0] - b[0], c[1] - b[1]; vn = math.hypot(vx, vy)
        if un < 1 or vn < 1: continue
        ux, uy, vx, vy = ux / un, uy / un, vx / vn, vy / vn
        turn = math.degrees(math.acos(max(-1, min(1, ux * vx + uy * vy))))
        if turn < 25: continue
        k0 = min(range(len(tr)), key=lambda k: math.hypot(tr[k][1] - b[0], tr[k][2] - b[1]))
        if math.hypot(tr[k0][1] - b[0], tr[k0][2] - b[1]) > 1.5 or k0 + 10 >= len(tr): continue
        sgn = 1 if ux * vy - uy * vx > 0 else -1
        past = 0; swing = 0; after = tr[k0:k0 + 11]  # one second after the closest approach
        for t, x, y in after:
            past = max(past, (x - b[0]) * ux + (y - b[1]) * uy)
            swing = max(swing, -sgn * ((x - b[0]) * -vy + (y - b[1]) * vx) * -1 * -1)
        sp = math.hypot(tr[k0 + 1][1] - tr[k0 - 1][1], tr[k0 + 1][2] - tr[k0 - 1][2]) / 0.2 if k0 >= 1 else float('nan')
        g[(r['route'], i)].append((turn, sp, past, swing))
print('route corner |  turn  | speed at corner | past the corner along the incoming leg (max in the next 1 s) | outside the next leg (max)')
for (rt, i), v in sorted(g.items()):
    if len(v) < 6: continue
    m = lambda j: st.median(x[j] for x in v)
    print(f'{rt:13s} {i} n {len(v):3d} | {m(0):4.0f}° | {m(1):4.1f} yd/s | past {m(2):4.2f} yd (p90 {sorted(x[2] for x in v)[int(.9 * len(v))]:.2f}) | outside {m(3):4.2f} yd')
