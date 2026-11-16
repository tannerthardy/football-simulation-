# Route break sharpness by one operator, for NFL tracking (BDB 2025) and for sim path dumps (same JSON shape).
#   NFL:  python3 -I route_break.py nfl DATA_DIR WEEK OUT.json     (tracks of route runners on drop-backs, ball still held)
#   sim:  produced by sim_route_speed.ts (BREAKS=1) as a list of {route, tr: [[t, x, y], ...]} at 10 Hz, offense moving +x
#   both: python3 -I route_break.py report OUT_DIR_OR_FILES...      (pools and prints the table)
# For each track (10 Hz, t since the snap, x downfield, y across) after smoothing over 0.3 s:
#   heading h(t) from the 0.3 s displacement (speed above 2 yd/s only); the break tb is the t in [1.0, tend - 0.8] with the
#   largest turn between the mean heading over [t-0.8, t-0.3] and over [t+0.3, t+0.8], and it counts as a break at 35 deg or more.
#   Stem line = through p(tb-0.8) and p(tb-0.3); exit line = through p(tb+0.3) and p(tb+0.8); the vertex V is their intersection.
#   v_in = mean speed over [tb-0.8, tb-0.4]; v_min = lowest speed over [tb-0.4, tb+0.6] and its time relative to tb;
#   v_out = mean speed over [tb+0.6, tb+1.0] (if the track lasts); round = distance from V to the nearest point of the path
#   within 0.8 s of tb (how much of the corner is cut); past = how far the path goes beyond V along the stem direction
#   (+ means it ran past the vertex before turning, - means it turned short); radius = v_min / omega, omega the turn rate over the break.
import csv, sys, math, json, glob, statistics as st, collections as C

def smooth(tr):
    out = []
    for i, (t, x, y) in enumerate(tr):
        j = [k for k in (i - 1, i, i + 1) if 0 <= k < len(tr)]
        out.append((t, sum(tr[k][1] for k in j) / len(j), sum(tr[k][2] for k in j) / len(j)))
    return out

def analyse(tr, tend):
    tr = smooth(tr)
    at = {round(t * 10): (x, y) for t, x, y in tr}
    def p(t): return at.get(round(t * 10))
    def speed(t):
        a, b = p(t - 0.15 if False else t - 0.1), p(t + 0.1)
        return None if a is None or b is None else math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2
    def heading(t):
        a, b = p(t - 0.2), p(t + 0.2)
        if a is None or b is None or math.hypot(b[0] - a[0], b[1] - a[1]) < 0.4 * 2: return None
        return math.atan2(b[1] - a[1], b[0] - a[0])
    def mh(t0, t1):
        hs = [heading(round(k / 10, 1)) for k in range(round(t0 * 10), round(t1 * 10) + 1)]
        hs = [h for h in hs if h is not None]
        if len(hs) < 3: return None
        return math.atan2(sum(math.sin(h) for h in hs), sum(math.cos(h) for h in hs))
    best = None
    k0, k1 = 10, int((tend - 0.8) * 10)
    for k in range(k0, k1 + 1):
        t = k / 10
        a, b = mh(t - 0.8, t - 0.3), mh(t + 0.3, t + 0.8)
        if a is None or b is None: continue
        d = (b - a + math.pi) % (2 * math.pi) - math.pi
        if best is None or abs(d) > abs(best[1]): best = (t, d, a, b)
    if best is None or abs(best[1]) < math.radians(35): return None
    tb, dth, ha, hb = best
    A0, A1, B0, B1 = p(tb - 0.8), p(tb - 0.3), p(tb + 0.3), p(tb + 0.8)
    if None in (A0, A1, B0, B1): return None
    ux, uy = A1[0] - A0[0], A1[1] - A0[1]; un = math.hypot(ux, uy) or 1; ux, uy = ux / un, uy / un
    vx, vy = B1[0] - B0[0], B1[1] - B0[1]; vn = math.hypot(vx, vy) or 1; vx, vy = vx / vn, vy / vn
    den = ux * vy - uy * vx
    if abs(den) < 0.2: return None
    s = ((B0[0] - A1[0]) * vy - (B0[1] - A1[1]) * vx) / den
    V = (A1[0] + s * ux, A1[1] + s * uy)
    near = [p(round(k / 10, 1)) for k in range(round((tb - 0.8) * 10), round((tb + 0.8) * 10) + 1)]
    near = [q for q in near if q is not None]
    rnd = min(math.hypot(q[0] - V[0], q[1] - V[1]) for q in near)
    # arc: path length between 10% and 90% of the heading change (short = a plant, long = a rounded bend)
    arc = None; ser = []
    for k in range(round((tb - 0.8) * 10), round((tb + 0.8) * 10) + 1):
        h = heading(round(k / 10, 1)); q = p(round(k / 10, 1))
        if h is None or q is None: continue
        ser.append((k, q, ((h - ha + math.pi) % (2 * math.pi) - math.pi) / dth))
    lo = next((i for i, e in enumerate(ser) if e[2] >= 0.1), None); hi = next((i for i, e in enumerate(ser) if e[2] >= 0.9), None)
    if lo is not None and hi is not None and hi > lo: arc = sum(math.hypot(ser[i + 1][1][0] - ser[i][1][0], ser[i + 1][1][1] - ser[i][1][1]) for i in range(lo, hi))
    def avg(t0, t1):
        v = [speed(round(k / 10, 1)) for k in range(round(t0 * 10), round(t1 * 10) + 1)]
        v = [x for x in v if x is not None]
        return sum(v) / len(v) if v else None
    vin = avg(tb - 0.8, tb - 0.4)
    mins = [(speed(round(k / 10, 1)), round(k / 10 - tb, 1)) for k in range(round((tb - 0.4) * 10), round((tb + 0.6) * 10) + 1)]
    mins = [m for m in mins if m[0] is not None]
    if vin is None or not mins: return None
    vmin, tmin = min(mins)
    vout = avg(tb + 0.6, min(tb + 1.0, tend)) if tb + 0.6 <= tend else None
    omega = abs(dth) / 1.1
    return {'tb': tb, 'turn': math.degrees(abs(dth)), 'vin': vin, 'vmin': vmin, 'tmin': tmin, 'vout': vout, 'round': rnd, 'arc': arc,
            'radius': vmin / omega if omega > 0.1 else None, 'depth': (A1[0] - tr[0][1])}

def nfl(D, W, OUT):
    play = {}
    for r in csv.DictReader(open(f'{D}/plays.csv')):
        if r['isDropback'] in ('TRUE', 'True'): play[(r['gameId'], r['playId'])] = (float(r['absoluteYardlineNumber']), r['pff_manZone'])
    route = {}
    for r in csv.DictReader(open(f'{D}/player_play.csv')):
        k = (r['gameId'], r['playId'])
        if k in play and r['routeRan'] not in ('', 'NA') and r['wasRunningRoute'] in ('1', '1.0', 'TRUE', 'True'): route[(k, r['nflId'])] = r['routeRan']
    tr = C.defaultdict(list); snap = {}; thrown = {}
    for r in csv.DictReader(open(f'{D}/tracking_week_{W}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in play or r['displayName'] == 'football': continue
        ev = r['event']
        if ev == 'ball_snap': snap.setdefault(k, int(r['frameId']))
        if ev in ('pass_forward', 'qb_sack', 'qb_strip_sack', 'run', 'handoff'): thrown.setdefault(k, int(r['frameId']))
        key = (k, r['nflId'])
        if key in route: tr[key].append((int(r['frameId']), float(r['x']), float(r['y']), r['playDirection']))
    rows = []
    for (k, i), F in tr.items():
        if k not in snap: continue
        s0 = snap[k]; end = thrown.get(k, 10 ** 9)
        sgn = 1 if F[0][3] == 'right' else -1
        pts = sorted((f, x, y) for f, x, y, d in F if s0 <= f < end)
        if len(pts) < 25: continue
        T = [((f - s0) / 10, sgn * (x - play[k][0]), sgn * y) for f, x, y in pts]
        tend = T[-1][0]
        if tend < 2.4: continue
        res = analyse(T, min(tend, 4.5))
        if res: res.update({'route': route[(k, i)], 'cov': play[k][1]}); rows.append(res)
    json.dump(rows, open(OUT, 'w'))
    print(len(rows), 'breaks')

def report(files):
    R = []
    for f in files: R += json.load(open(f))
    def row(label, rows):
        if len(rows) < 8: return
        m = lambda key: st.median([r[key] for r in rows if r.get(key) is not None] or [float('nan')])
        print(f'{label:26s} n {len(rows):4d} | turn {m("turn"):4.0f} | v_in {m("vin"):4.1f} v_min {m("vmin"):4.1f} (at {m("tmin"):+.1f}s) v_out {m("vout"):4.1f} | min/in {m("vmin") / m("vin"):.2f} | cut {m("round"):.2f} yd arc {m("arc"):.1f} yd | radius {m("radius"):.1f} yd')
    for rt in sorted({r['route'] for r in R}):
        row(rt, [r for r in R if r['route'] == rt])
        for lo, hi in ((35, 75), (75, 110), (110, 181)):
            row(f'  turn {lo}-{hi}', [r for r in R if r['route'] == rt and lo <= r['turn'] < hi])

def simtracks(IN, OUT):
    rows = []
    for r in json.load(open(IN)):
        T = [tuple(q) for q in r['tr']]
        if len(T) < 25: continue
        res = analyse(T, min(T[-1][0], 4.5))
        if res: res.update({'route': r['route'], 'cov': 'sim'}); rows.append(res)
    json.dump(rows, open(OUT, 'w')); print(len(rows), 'breaks of', len(json.load(open(IN))))

if __name__ == '__main__':
    if sys.argv[1] == 'sim': simtracks(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == 'nfl': nfl(sys.argv[2], sys.argv[3], sys.argv[4])
    else: report([f for a in sys.argv[2:] for f in (sorted(glob.glob(a + '/w*.json')) if not a.endswith('.json') else [a])])
