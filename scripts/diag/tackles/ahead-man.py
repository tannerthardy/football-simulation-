"""Classify uncontacted catches by the man ahead (ahead-man.mts output). Usage: python3 -I ahead-man.py OUT.json
The man ahead: the nearest unengaged defender downfield of the carrier at the catch. tSee: the first frame his picture
shows the carry. Feasible: some later frame k where the run he can make by then at his own top speed and tau (from his
speed along the line at tSee: s = vmax t - (vmax - v0)(1 - exp(-t/tau)) tau) covers the distance from where he stood at
tSee to the carrier's actual position minus his arm (carrier radius + his reach). Classes, for feasible men: gather (his
command below 0.6 of top for 0.2 s while more than 3 yd away, after tSee), angle (his command more than 30 deg off the
direction to the earliest feasible meeting point while within 15 deg of the line to the carrier's position), other;
late (feasible from the catch but not from tSee); not feasible; nobody ahead."""
import json, math, sys, statistics as st
from collections import Counter
J = json.load(open(sys.argv[1])); R = J['rows']
def ang(ax, ay, bx, by):
    na, nb = math.hypot(ax, ay), math.hypot(bx, by)
    if na < 1e-6 or nb < 1e-6: return None
    return math.degrees(math.acos(max(-1, min(1, (ax * bx + ay * by) / (na * nb)))))
def feasible(r, i, k0):
    F = r['frames']; d = r['def'][i]; f0 = F[k0]; p = f0[5][i]
    arm = r['carRadius'] + d['reach']
    cx, cy = f0[3], f0[4]
    for k in range(k0 + 1, len(F)):
        t = F[k][0] - f0[0]
        tx, ty = F[k][1] - p[0], F[k][2] - p[1]; D = math.hypot(tx, ty) - arm
        v0 = max(0.0, (p[2] * tx + p[3] * ty) / (math.hypot(tx, ty) or 1))
        s = d['vmax'] * t - (d['vmax'] - v0) * d['tau'] * (1 - math.exp(-t / d['tau']))
        if s >= D: return k
    return None
cls = Counter(); det = []; trail = []
for r in R:
    F = r['frames']; f0 = F[0]; dirx = r['dir']
    cand = []
    for i, p in enumerate(f0[5]):
        if p[7] or p[8]: continue
        if (p[0] - f0[1]) * dirx > 0: cand.append((math.hypot(p[0] - f0[1], p[1] - f0[2]), i))
    behind = [(math.hypot(p[0] - f0[1], p[1] - f0[2]), i) for i, p in enumerate(f0[5]) if not p[7] and not p[8] and (p[0] - f0[1]) * dirx <= 0]
    if behind:
        _, j = min(behind); trail.append((r, j))
    if not cand: cls['nobody ahead'] += 1; continue
    dist0, i = min(cand)
    kSee = next((k for k, f in enumerate(F) if f[5][i][6]), None)
    if kSee is None: cls['never saw the carry'] += 1; continue
    k0f = feasible(r, i, 0); kf = feasible(r, i, kSee)
    if kf is None:
        stopped = k0f is not None and any(math.hypot(F[k][5][i][2], F[k][5][i][3]) < 1.5 for k in range(0, kSee + 1))
        cls[('row6 stopped at the landing area (late, stood)' if stopped else 'late (feasible at the catch, not when he saw it)') if k0f is not None else 'not feasible'] += 1
        det.append(('late' if k0f is not None else 'nf', r['def'][i]['pos'], round(dist0, 1), F[kSee][0], r.get('seed'), r.get('play'), r.get('catchT'), r['def'][i].get('slot'), r['yac'])); continue
    d = r['def'][i]; mx, my = F[kf][1], F[kf][2]
    # Per tick from tSee to his closest approach: the audit's rows (docs/reviews/2026-11-25-pursuit-squat-corner-outside-audit.md 1).
    kc = min(range(kSee, len(F)), key=lambda k: math.hypot(F[k][1] - F[k][5][i][0], F[k][2] - F[k][5][i][1]))
    closest = math.hypot(F[kc][1] - F[kc][5][i][0], F[kc][2] - F[kc][5][i][1])
    f = Counter()
    for k in range(kSee, kc + 1):
        p = F[k][5][i]
        if p[4] is None: continue
        rx, ry = F[k][1] - p[0], F[k][2] - p[1]; dd = math.hypot(rx, ry); cmd = math.hypot(p[4], p[5]); cvx, cvy = F[k][3], F[k][4]; cs = math.hypot(cvx, cvy)
        # carrier's motion relative to the line to the defender: head-on (coming at him) below 60 deg, else across / away
        a_c = ang(cvx, cvy, -rx, -ry) if cs > 1.5 else 0
        crossing = a_c is not None and a_c > 60
        if dd > 2.5 and cmd < 0.6 * d['vmax']:
            f['gather'] += 1
            if crossing: f['gather across/away'] += 1
            else: f['gather head-on'] += 1
            if abs(cmd - cs) < 1.0: f['matched speed'] += 1
        a1 = ang(p[4], p[5], mx - p[0], my - p[1]); a2 = ang(p[4], p[5], rx, ry)
        if a1 is not None and a2 is not None and a1 > 30 and a2 < 15: f['aims at him'] += 1
        # behind: his command points behind the carrier's position (opposite side of the carrier's velocity)
        if cs > 2 and cmd > 1 and (p[4] * cvx + p[5] * cvy) / (cmd * cs) < -0.2 and dd > 2.5: f['aims behind'] += 1
        if dd > 12 and cmd < 0.97 * d['vmax'] and cmd > 0.7 * d['vmax']: f['12 yd effort'] += 1
    arm = r['carRadius'] + d['reach']
    if f['gather across/away'] >= 4: c = 'row1 gathered on a crossing / going-away angle'
    elif f['gather head-on'] >= 4 and closest > arm: c = 'row2 mirrored on top outside the arm'
    elif f['matched speed'] >= 4: c = 'row5 matched speed early'
    elif f['aims behind'] >= 4: c = 'row4 aimed behind'
    elif f['aims at him'] >= 4: c = 'angle: aimed at the carrier, not ahead'
    elif f['12 yd effort'] >= 4: c = 'row3 12 yd effort step'
    else: c = 'feasible: other'
    cls[c] += 1; det.append((c.split(' ')[0], d['pos'], round(dist0, 1), F[kSee][0], round(closest, 2), dict(f), r.get('seed'), r.get('play'), r.get('catchT'), d.get('slot'), r.get('offLabel'), r.get('defLabel'), r['yac']))
n = len(R)
print(f"{sys.argv[1]}: uncontacted {n} of {J['catches']}")
for k, v in cls.most_common(): print(f"  {k:55} {v}")
print('  details (class, pos, dist at catch, t saw, gather ticks, angle ticks, ticks):')
for x in det: print('   ', x)
# trailer: why slower
rs = []
for r, j in trail:
    F = r['frames']; d = r['def'][j]
    cs = [math.hypot(f[3], f[4]) for f in F[:21]]; ds = [math.hypot(f[5][j][2], f[5][j][3]) for f in F[:21]]
    rs.append((r['carVmax'], d['vmax'], cs[0], max(cs), ds[0], max(ds), r['carEnergy'], d['energy'], d['pos']))
if rs:
    print(f"  trailer (nearest behind at the catch, n {len(rs)}): top speed carrier p50 {st.median([x[0] for x in rs])} vs trailer {st.median([x[1] for x in rs])}; trailer top below carrier's {sum(x[1] < x[0] for x in rs)}")
    print(f"    speed at the catch carrier p50 {st.median([x[2] for x in rs]):.2f} vs trailer {st.median([x[4] for x in rs]):.2f}; max in the first 1 s carrier {st.median([x[3] for x in rs]):.2f} vs trailer {st.median([x[5] for x in rs]):.2f}; energy carrier {st.median([x[6] for x in rs])} vs trailer {st.median([x[7] for x in rs])}")
