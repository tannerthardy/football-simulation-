"""When a trailing man defender starts closing on his receiver, and when the receiver turns back for the ball. Same code
on NFL (trail_nfl.py) and sim (scripts/diag/risk/trail-export.ts) records. Observation only.
Population: man-coverage targeted throws (caught or not), the receiver 3-12 yd downfield of his snap spot at the ball's
arrival; his defender is the defender nearest him at -0.6 s from the arrival, within 3 yd, behind him along his run
(< -0.3 yd) and in phase (headings within 45 deg, both >= 3 yd/s). Not facing the QB: the defender's orientation more
than 90 deg off the direction to the QB on average over -1.0 to -0.3 s.
Closing: the rate his distance to the receiver shrinks (central differences, 10 Hz); onset = the first frame from -1.0 s
to +0.5 s with closing >= 1.0 yd/s for two frames running, relative to the arrival.
The receiver's look-back: the first frame from -1.5 s with his orientation (tracking: shoulder pads, the chest; the head
is not recorded) more than 90 deg off his running direction for two frames running, at >= 1 yd/s.
usage: python3 -I scripts/diag/pass-operators/trail_look.py name=a.jsonl.gz[,b] ..."""
import sys, gzip, json, math


def angdiff(a, b): return abs((a - b + math.pi) % (2 * math.pi) - math.pi)


def q(v, f):
    v = sorted(x for x in v if x is not None)
    return '-' if not v else f'{v[int(f * (len(v) - 1))]:+.1f}'


def rows(paths):
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            p = json.loads(line); xy, fo = p['xy'], p.get('fo'); t, qb, ka = p['target'], p['qb'], p['arrive']
            if fo is None: continue
            pos = lambda i, k: (xy[k][2 * i], xy[k][2 * i + 1]) if 0 <= k < len(xy) and xy[k][2 * i] is not None else (None, None)
            def vel(i, k):
                (a, b), (c, e) = pos(i, k - 1), pos(i, k + 1)
                return (None, None) if a is None or c is None else ((c - a) / 0.2, (e - b) / 0.2)
            dist = lambda i, j, k: None if pos(i, k)[0] is None or pos(j, k)[0] is None else math.hypot(pos(i, k)[0] - pos(j, k)[0], pos(i, k)[1] - pos(j, k)[1])
            k6, k10, k15 = ka - 6, ka - 10, ka - 15
            if k10 < 1 or ka + 3 >= len(xy) or pos(t, ka)[0] is None or pos(t, 0)[0] is None: continue
            if not (3 <= pos(t, ka)[0] - pos(t, 0)[0] <= 12): continue
            D = [d for d, a in enumerate(p['players']) if a['side'] == 'D' and dist(t, d, k6) is not None]
            if not D: continue
            d = min(D, key=lambda x: dist(t, x, k6))
            if dist(t, d, k6) > 3: continue
            (tvx, tvy), (dvx, dvy) = vel(t, k6), vel(d, k6)
            if tvx is None or dvx is None: continue
            ts, ds = math.hypot(tvx, tvy), math.hypot(dvx, dvy)
            if ts < 3 or ds < 3 or (tvx * dvx + tvy * dvy) / (ts * ds) < math.cos(math.radians(45)): continue
            (tx, ty), (dx, dy) = pos(t, k6), pos(d, k6)
            if ((dx - tx) * tvx + (dy - ty) * tvy) / ts >= -0.3: continue
            aq = []
            for k in range(k10, k6 + 4):
                f = fo[k][d] if k < len(fo) else None; (x, y), (qx, qy) = pos(d, k), pos(qb, k)
                if f is not None and x is not None and qx is not None: aq.append(math.degrees(angdiff(f, math.atan2(qy - y, qx - x))))
            if not aq: continue
            facingQB = sum(aq) / len(aq) <= 90
            def closing(k):
                a, b = dist(t, d, k - 1), dist(t, d, k + 1)
                return None if a is None or b is None else -(b - a) / 0.2
            onset = None
            for k in range(k10, min(ka + 5, len(xy) - 2)):
                c1, c2 = closing(k), closing(k + 1)
                if c1 is not None and c2 is not None and c1 >= 1 and c2 >= 1: onset = (k - ka) * 0.1; break
            look = None
            for k in range(max(1, k15), min(ka + 5, len(xy) - 2)):
                ok = True
                for kk in (k, k + 1):
                    f = fo[kk][t] if kk < len(fo) else None; vx, vy = vel(t, kk)
                    if f is None or vx is None or math.hypot(vx, vy) < 1 or angdiff(f, math.atan2(vy, vx)) <= math.radians(90): ok = False; break
                if ok: look = (k - ka) * 0.1; break
            prof = {o: closing(ka - o) for o in (8, 6, 4, 2, 0)}
            yield dict(facingQB=facingQB, onset=onset, look=look, prof=prof, caught=p.get('catch') is not None)


for arg in sys.argv[1:]:
    name, paths = arg.split('=')
    R = list(rows(paths))
    print(f'== {name}: man targets 3-12 yd with a trailing defender within 3 yd at -0.6 s, n {len(R)}')
    for lab, V in (('not facing the QB', [r for r in R if not r['facingQB']]), ('facing the QB', [r for r in R if r['facingQB']]), ('all', R)):
        if not V: continue
        on = [r['onset'] for r in V]; lk = [r['look'] for r in V]
        mean = lambda o: (lambda v: f'{sum(v) / len(v):+.2f}' if v else '-')([r['prof'][o] for r in V if r['prof'][o] is not None])
        print(f'  [{lab}] n {len(V)} ({100 * len(V) / len(R):.0f}%)')
        print(f'    closing onset vs arrival p25/p50/p75 {q(on, .25)} / {q(on, .5)} / {q(on, .75)} s | before -0.5 s {100 * sum(1 for x in on if x is not None and x < -0.5) / len(V):.0f}% '
              f'| -0.5 to -0.2 s {100 * sum(1 for x in on if x is not None and -0.5 <= x < -0.2) / len(V):.0f}% | after -0.2 s {100 * sum(1 for x in on if x is not None and x >= -0.2) / len(V):.0f}% | none {100 * sum(1 for x in on if x is None) / len(V):.0f}%')
        print(f'    mean closing at -0.8 / -0.6 / -0.4 / -0.2 / 0 s: {mean(8)} / {mean(6)} / {mean(4)} / {mean(2)} / {mean(0)} yd/s')
        print(f'    receiver turns his chest back (look-back) vs arrival p25/p50/p75 {q(lk, .25)} / {q(lk, .5)} / {q(lk, .75)} s | none {100 * sum(1 for x in lk if x is None) / len(V):.0f}%'
              f' | onset after his look-back: {100 * sum(1 for r in V if r["onset"] is not None and r["look"] is not None and r["onset"] >= r["look"]) / max(1, sum(1 for r in V if r["onset"] is not None and r["look"] is not None)):.0f}% of plays with both')
