"""How the defender plays a ball in flight (same code on NFL trail_nfl.py cov=all and sim trail-export.ts COV=all
records). Observation only. Targeted throws (caught or not); flight = release (pass_forward) to arrival (pass_arrived);
the landing point = the target's position at the arrival. Any defender: the nearest at the arrival, the second, and how
many are within 3 yd. The defender: the one nearest the landing point at the
release. For him: distance to the landing point at the release and at the arrival; his closing on the landing point
(velocity . unit vector, central differences) at 0 / 0.2 / ... s into the flight; his reaction = the first frame after
the release where that closing has risen >= 1.0 yd/s over its value at the release, for two frames; aim at 0.4 s =
whether his velocity points closer to the landing point than to the receiver's current spot. Split by flight band
(< 0.8 / 0.8-1.2 / 1.2-1.8 / 1.8+ s), and in each by his position on the receiver at the release (on top: > 1 yd deeper
within 6 yd; hip: within 1 yd of level within 4 yd; trailing: > 1 yd shallower within 6 yd; off: farther) and by his
orientation over the 0.5 s before the release (facing the QB / facing the receiver / other; body, not gaze).
usage: python3 -I scripts/diag/pass-operators/flight_close.py name=a.jsonl.gz[,b] ..."""
import sys, gzip, json, math, collections as C


def angdiff(a, b): return abs((a - b + math.pi) % (2 * math.pi) - math.pi)


def q(v):
    v = sorted(x for x in v if x is not None)
    return '-' if len(v) < 5 else f'{v[len(v) // 2]:.1f}'


def mean(v):
    v = [x for x in v if x is not None]
    return '-' if len(v) < 5 else f'{sum(v) / len(v):+.1f}'


def band(f): return '<0.8' if f < 0.8 else '0.8-1.2' if f < 1.2 else '1.2-1.8' if f < 1.8 else '1.8+'


STEPS = (0, 2, 4, 6, 8, 10, 12, 14)
for arg in sys.argv[1:]:
    name, paths = arg.split('=')
    R = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            p = json.loads(line); xy, fo = p['xy'], p.get('fo'); t, qb, kr, ka = p['target'], p['qb'], p['release'], p['arrive']
            if ka is None or kr is None or ka <= kr or ka + 1 >= len(xy) or kr < 6: continue
            pos = lambda i, k: (xy[k][2 * i], xy[k][2 * i + 1]) if 0 <= k < len(xy) and xy[k][2 * i] is not None else (None, None)
            def vel(i, k):
                (a, b), (c, e) = pos(i, k - 1), pos(i, k + 1)
                return (None, None) if a is None or c is None else ((c - a) / 0.2, (e - b) / 0.2)
            lx, ly = pos(t, ka)
            if lx is None: continue
            D = [d for d, pl in enumerate(p['players']) if pl['side'] == 'D' and pos(d, kr)[0] is not None]
            if not D: continue
            d = min(D, key=lambda i: math.hypot(pos(i, kr)[0] - lx, pos(i, kr)[1] - ly))
            def closing(k):
                (x, y), (vx, vy) = pos(d, k), vel(d, k)
                if x is None or vx is None: return None
                L = math.hypot(lx - x, ly - y) or 1; return (vx * (lx - x) + vy * (ly - y)) / L
            c0 = closing(kr)
            react = None
            for k in range(kr, ka):
                a, b = closing(k), closing(k + 1)
                if c0 is not None and a is not None and b is not None and a - c0 >= 1 and b - c0 >= 1: react = (k - kr) * 0.1; break
            aim = None; k4 = min(kr + 4, ka)
            (x4, y4), (vx4, vy4), (rx4, ry4) = pos(d, k4), vel(d, k4), pos(t, k4)
            if x4 is not None and vx4 is not None and rx4 is not None and math.hypot(vx4, vy4) > 1:
                h = math.atan2(vy4, vx4); aim = 'ball' if angdiff(h, math.atan2(ly - y4, lx - x4)) < angdiff(h, math.atan2(ry4 - y4, rx4 - x4)) else 'receiver'
            (dx0, dy0), (rx0, ry0) = pos(d, kr), pos(t, kr)
            over = (dx0 - rx0) if rx0 is not None else None; dist = math.hypot(dx0 - rx0, dy0 - ry0) if rx0 is not None else 99
            posc = 'off' if over is None else 'on top' if over > 1 and dist <= 6 else 'hip' if abs(over) <= 1 and dist <= 4 else 'trailing' if over < -1 and dist <= 6 else 'off'
            orient = 'other'
            if fo:
                aq, ac = [], []
                for k in range(kr - 5, kr + 1):
                    f = fo[k][d] if k < len(fo) else None; (x, y), (qx, qy), (tx, ty) = pos(d, k), pos(qb, k), pos(t, k)
                    if f is None or x is None or qx is None or tx is None: continue
                    aq.append(math.degrees(angdiff(f, math.atan2(qy - y, qx - x)))); ac.append(math.degrees(angdiff(f, math.atan2(ty - y, tx - x))))
                if aq:
                    mq, mc = sum(aq) / len(aq), sum(ac) / len(ac)
                    orient = 'facing QB' if mq <= 60 else 'facing receiver' if mq > 90 and mc <= 60 else 'other'
            (xa, ya) = pos(d, ka)
            DA = [math.hypot(pos(i, ka)[0] - lx, pos(i, ka)[1] - ly) for i in D if pos(i, ka)[0] is not None]
            DA.sort()
            near_other = next((i for i in sorted(D, key=lambda i: math.hypot(pos(i, ka)[0] - lx, pos(i, ka)[1] - ly) if pos(i, ka)[0] is not None else 99) if i != d), None)
            o0 = math.hypot(pos(near_other, kr)[0] - lx, pos(near_other, kr)[1] - ly) if near_other is not None and pos(near_other, kr)[0] is not None else None
            R.append(dict(band=band((ka - kr) * 0.1), d0=math.hypot(dx0 - lx, dy0 - ly), da=math.hypot(xa - lx, ya - ly) if xa is not None else None,
                          prof={s: closing(kr + s) if kr + s <= ka else None for s in STEPS}, react=react, aim=aim, posc=posc, orient=orient,
                          caught=p.get('catch') is not None, fam=p.get('manzone') or '?',
                          any_a=DA[0] if DA else None, n3=sum(1 for x in DA if x <= 3), second_a=DA[1] if len(DA) > 1 else None, other0=o0, grp=p['players'][d]['group'], over0=over, cov=(p.get('coverage') or '?')))
    print(f'== {name}: the defender nearest the landing point at the release (n {len(R)})')
    for b in ('<0.8', '0.8-1.2', '1.2-1.8', '1.8+'):
        V = [r for r in R if r['band'] == b]
        if len(V) < 10: continue
        print(f'   flight {b:<7} n {len(V):4d} | complete {100 * sum(r["caught"] for r in V) / len(V):.0f}% | to the landing point at the release {q([r["d0"] for r in V])} -> at the arrival {q([r["da"] for r in V])} yd'
              f' | reaction {q([r["react"] for r in V])} s (none {100 * sum(r["react"] is None for r in V) / len(V):.0f}%) | aimed at the ball at 0.4 s {100 * sum(r["aim"] == "ball" for r in V) / max(1, sum(r["aim"] is not None for r in V)):.0f}%')
        print(f'      any defender: nearest to the landing point at the arrival {q([r["any_a"] for r in V])} yd | second {q([r["second_a"] for r in V])} | defenders within 3 yd: 0 {100 * sum(r["n3"] == 0 for r in V) / len(V):.0f}% / 1 {100 * sum(r["n3"] == 1 for r in V) / len(V):.0f}% / 2+ {100 * sum(r["n3"] >= 2 for r in V) / len(V):.0f}% | the nearest at the arrival, when not our man: from {q([r["other0"] for r in V])} yd at the release')
        print('      closing on the landing point at 0 / 0.2 / 0.4 / 0.6 / 0.8 / 1.0 / 1.2 / 1.4 s: ' + ' / '.join(mean([r['prof'][s] for r in V]) for s in STEPS))
        for key, vals in (('posc', ('on top', 'hip', 'trailing', 'off')), ('orient', ('facing QB', 'facing receiver', 'other'))):
            for v in vals:
                W = [r for r in V if r[key] == v]
                if len(W) < 8: continue
                print(f'        {v:<16} n {len(W):4d} ({100 * len(W) / len(V):3.0f}%) | at the release {q([r["d0"] for r in W])} -> arrival {q([r["da"] for r in W])} yd | reaction {q([r["react"] for r in W])} s | closing 0 / 0.4 / 0.8 s {mean([r["prof"][0] for r in W])} / {mean([r["prof"][4] for r in W])} / {mean([r["prof"][8] for r in W])} | aim ball {100 * sum(r["aim"] == "ball" for r in W) / max(1, sum(r["aim"] is not None for r in W)):.0f}%')

    # Deep and medium balls (1.2 s+ flights): by who the defender nearest the landing point at the release is and where
    # he is on the receiver, and completion by separation at the arrival (any defender to the landing point).
    W = [r for r in R if r['band'] in ('1.2-1.8', '1.8+')]
    if W:
        print(f'   1.2 s+ flights n {len(W)}: complete {100 * sum(r["caught"] for r in W) / len(W):.0f}%')
        for lab, F in (('DB on top (1-6 yd deeper)', lambda r: r['grp'] == 'DB' and r['posc'] == 'on top'), ('DB over the top (6+ yd off, deeper)', lambda r: r['grp'] == 'DB' and r['posc'] == 'off' and (r['over0'] or 0) > 1),
                       ('DB on the hip', lambda r: r['grp'] == 'DB' and r['posc'] == 'hip'), ('DB trailing', lambda r: r['grp'] == 'DB' and r['posc'] == 'trailing'),
                       ('DB off, not deeper', lambda r: r['grp'] == 'DB' and r['posc'] == 'off' and (r['over0'] or 0) <= 1), ('LB / DL', lambda r: r['grp'] != 'DB')):
            X = [r for r in W if F(r)]
            if X: print(f'      {lab:<36} n {len(X):4d} ({100 * len(X) / len(W):3.0f}%) | complete {100 * sum(r["caught"] for r in X) / len(X):3.0f}% | at the release {q([r["d0"] for r in X])} -> his own at the arrival {q([r["da"] for r in X])} | any defender at the arrival {q([r["any_a"] for r in X])} yd')
        for lo, hi in ((0, 1), (1, 2), (2, 3), (3, 99)):
            X = [r for r in W if r['any_a'] is not None and lo <= r['any_a'] < hi]
            if X: print(f'      any defender {lo}-{hi if hi < 99 else "+"} yd from the landing point at the arrival: n {len(X):4d} ({100 * len(X) / len(W):3.0f}%) | complete {100 * sum(r["caught"] for r in X) / len(X):3.0f}%')
        for fam in ('Man', 'Zone'):
            X = [r for r in W if r['fam'] == fam]
            if X: print(f'      {fam}: n {len(X)} | complete {100 * sum(r["caught"] for r in X) / len(X):.0f}% | any defender at the arrival {q([r["any_a"] for r in X])} yd | within 3 yd {100 * sum(r["n3"] >= 1 for r in X) / len(X):.0f}%')
