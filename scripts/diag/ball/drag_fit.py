"""In-flight deceleration of the thrown ball from BDB 2025 tracking, by air-distance band, with intervals, and the NFL flight times by distance.
  python3 -I scripts/diag/ball/drag_fit.py OUT.json [weeks=1,2,...,9]

Per pass (pass_forward .. pass_arrived, the football's rows): the horizontal speed of each 0.1 s interval s_j = |P(j+1) - P(j)| / 0.1 and the horizontal distance flown d_j at its midpoint. The first two intervals (the release frames: the QB lane
found their speeds noisy, p90 above 30 yd/s) and the last interval (it ends on the arrival frame) are dropped. k = -d ln(s) / d(d) by least squares within the pass (at least 5 intervals), in /yd of HORIZONTAL distance; the path of a lofted ball is a few percent longer
than its horizontal distance (arc length of the parabola from the flight time), so k per yard of path is that times horizontal/path (printed). Also the QB lane's three speeds (release = the first 0.2 s, mid = 0.2 s around the middle, arrival = the 0.2 s ending
one frame before pass_arrived) and the travel and flight time, so the table reproduces their operator. Air distance = the arrival point's yards past the line of scrimmage."""
import os, sys, math, json, csv, random
import numpy as np
D = '/home/user/football-simulation-/data/raw/bdb2025/big-data-bowl-data'
weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3,4,5,6,7,8,9').split(',')]
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv'))}
rows = []
for w in weeks:
    cur, ball, ev = None, [], {}
    def done():
        if not cur or 'pass_forward' not in ev or 'pass_arrived' not in ev: return
        p = plays.get(cur)
        if not p or not p['absoluteYardlineNumber']: return
        f0, f1 = ev['pass_forward'], ev['pass_arrived']
        P = [(x, y) for f, x, y, _ in ball if f0 <= f <= f1]
        n = len(P) - 1
        if n < 6: return
        los = float(p['absoluteYardlineNumber']); dirn = 1 if ball[0][3] == 'right' else -1
        air = (P[-1][0] - los) if dirn == 1 else (los - P[-1][0])
        sp = [math.hypot(P[j + 1][0] - P[j][0], P[j + 1][1] - P[j][1]) / 0.1 for j in range(n)]
        cum = [0.0]
        for j in range(n): cum.append(cum[-1] + sp[j] * 0.1)
        mid = [(cum[j] + cum[j + 1]) / 2 for j in range(n)]
        use = list(range(2, n - 1))
        k = None
        if len(use) >= 5 and min(sp[j] for j in use) > 3:
            xs = np.array([mid[j] for j in use]); ys = np.log([sp[j] for j in use])
            xs = xs - xs.mean(); k = float(-(xs * (ys - ys.mean())).sum() / (xs ** 2).sum())
        m = n // 2
        spd = lambda a, b: math.hypot(P[b][0] - P[a][0], P[b][1] - P[a][1]) / ((b - a) * 0.1)
        rows.append(dict(air=air, T=n * 0.1, travel=cum[-1], k=k, rel=spd(0, 2), mid=spd(max(0, m - 1), min(n, m + 1)), arr=spd(max(0, n - 3), n - 1), n=n,
                         span=cum[n - 1] - cum[2] if n > 3 else 0, res=p['passResult'], sp=[round(v, 2) for v in sp]))
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        if r['displayName'] != 'football': continue
        key = (r['gameId'], r['playId'])
        if key != cur:
            done(); cur, ball, ev = key, [], {}
        f = int(r['frameId']); ball.append((f, float(r['x']), float(r['y']), r['playDirection']))
        if r['event'] and r['event'] not in ev: ev[r['event']] = f
    done(); print('week', w, len(rows), file=sys.stderr)
json.dump(rows, open(sys.argv[1], 'w'))
