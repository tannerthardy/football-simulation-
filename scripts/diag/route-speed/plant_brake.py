# How a receiver brakes into a plant (hitch / curl / comeback, out, dig-in): the speed and the distance to the break vertex over the last 1.5 s, by one operator for NFL
# tracking (BDB 2025, ball still held) and for the sim's 10 Hz paths (sim_route_speed.ts with BREAKS=1, same JSON shape as route_break.py takes).
#   NFL: python3 -I plant_brake.py nfl DATA_DIR WEEK[,WEEK...] OUT.json      sim: python3 -I plant_brake.py sim PATHS.json OUT.json      both: python3 -I plant_brake.py report A.json [B.json ...]
# Break and vertex V: route_break.py's (the largest turn of the smoothed heading in [1.0, tend-0.8], >= 35 deg; stem line and exit line meet at V; imported, not copied).
#   v(t)     speed over +/-0.1 s on the smoothed track (route_break.smooth); d(t) distance from the smoothed position to V
#   cruise   median speed over [tb-1.6, tb-1.1]; the path must have been that fast (>= 3 yd/s) and straight (no other break there is checked by the 35 deg gate only)
#   onset    the last time before the closest approach to V at which he was still at >= 90% of cruise (he has not started to brake)
#   arrive   the closest approach to V in [tb-0.8, tb+0.8]; v_arrive his speed then
#   brake    onset -> arrival: time, distance travelled, mean deceleration (cruise - v_arrive) / time
import sys, json, glob, math, statistics as st, csv, collections as C
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import route_break as rb
def vertex(tr, tend):
    tr = rb.smooth(tr); at = {round(t * 10): (x, y) for t, x, y in tr}
    p = lambda t: at.get(round(t * 10))
    res = rb.analyse([(t, x, y) for t, x, y in rb.smooth(tr)] if False else tr, tend)
    return tr, at, res
def profile(raw, tend):
    tr = rb.smooth(raw); at = {round(t * 10): (x, y) for t, x, y in tr}
    res = rb.analyse(raw, tend)
    if not res: return None
    tb = res['tb']; p = lambda t: at.get(round(t * 10))
    A0, A1, B0, B1 = p(tb - 0.8), p(tb - 0.3), p(tb + 0.3), p(tb + 0.8)
    if None in (A0, A1, B0, B1): return None
    ux, uy = A1[0] - A0[0], A1[1] - A0[1]; un = math.hypot(ux, uy) or 1; ux, uy = ux / un, uy / un
    vx, vy = B1[0] - B0[0], B1[1] - B0[1]; vn = math.hypot(vx, vy) or 1; vx, vy = vx / vn, vy / vn
    den = ux * vy - uy * vx
    if abs(den) < 0.2: return None
    s = ((B0[0] - A1[0]) * vy - (B0[1] - A1[1]) * vx) / den; V = (A1[0] + s * ux, A1[1] + s * uy)
    def spd(t):
        a, b = p(round(t - 0.1, 1)), p(round(t + 0.1, 1))
        return None if a is None or b is None else math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2
    d = lambda t: (math.hypot(p(t)[0] - V[0], p(t)[1] - V[1]) if p(t) else None)
    ks = [round(tb + k / 10, 1) for k in range(-16, 9)]
    cr = [spd(t) for t in ks if tb - 1.6 <= t <= tb - 1.1 and spd(t) is not None]
    if len(cr) < 4: return None
    cruise = st.median(cr)
    if cruise < 3: return None
    ar = [(d(t), t) for t in ks if tb - 0.8 <= t <= tb + 0.8 and d(t) is not None]
    if not ar: return None
    _, ta = min(ar)
    vs = [(t, spd(t)) for t in ks if t <= ta and spd(t) is not None and t >= tb - 1.5]
    on = [t for t, v in vs if v >= 0.9 * cruise]
    if not on: return None
    to = max(on)
    va = spd(ta)
    if va is None or ta <= to: return None
    # path distance travelled from onset to arrival
    pts = [p(round(to + k / 10, 1)) for k in range(0, int(round((ta - to) * 10)) + 1)]
    pts = [q for q in pts if q]
    dist = sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))
    return dict(route=None, turn=res['turn'], cruise=cruise, onset_before=ta - to, onset_dist=d(to), brake_dist=dist, v_arrive=va, decel=(cruise - va) / (ta - to), vmin=res['vmin'], vout=res['vout'],
                prof=[(round(k, 2), spd(round(tb + k, 1)), d(round(tb + k, 1))) for k in (-1.5, -1.0, -0.75, -0.5, -0.25, 0.0)], ta_off=ta - tb)
def nfl(D, weeks, OUT):
    play = {}
    for r in csv.DictReader(open(f'{D}/plays.csv')):
        if r['isDropback'] in ('TRUE', 'True'): play[(r['gameId'], r['playId'])] = float(r['absoluteYardlineNumber'])
    route = {}
    for r in csv.DictReader(open(f'{D}/player_play.csv')):
        k = (r['gameId'], r['playId'])
        if k in play and r['routeRan'] not in ('', 'NA') and r['wasRunningRoute'] in ('1', '1.0', 'TRUE', 'True'): route[(k, r['nflId'])] = r['routeRan']
    rows = []
    for W in weeks.split(','):
        tr = C.defaultdict(list); snap = {}; thrown = {}
        for r in csv.DictReader(open(f'{D}/tracking_week_{W}.csv')):
            k = (r['gameId'], r['playId'])
            if k not in play or r['displayName'] == 'football': continue
            ev = r['event']
            if ev == 'ball_snap': snap.setdefault(k, int(r['frameId']))
            if ev in ('pass_forward', 'qb_sack', 'qb_strip_sack', 'run', 'handoff'): thrown.setdefault(k, int(r['frameId']))
            key = (k, r['nflId'])
            if key in route and route[key] in ('HITCH', 'OUT', 'IN'): tr[key].append((int(r['frameId']), float(r['x']), float(r['y']), r['playDirection']))
        for (k, i), F in tr.items():
            if k not in snap: continue
            s0 = snap[k]; end = thrown.get(k, 10 ** 9); sgn = 1 if F[0][3] == 'right' else -1
            pts = sorted((f, x, y) for f, x, y, d in F if s0 <= f < end)
            if len(pts) < 25: continue
            T = [((f - s0) / 10, sgn * (x - play[k]), sgn * y) for f, x, y in pts]
            if T[-1][0] < 2.4: continue
            res = profile(T, min(T[-1][0], 4.5))
            if res: res['route'] = route[(k, i)]; rows.append(res)
        print('week', W, len(rows), file=sys.stderr)
    json.dump(rows, open(OUT, 'w'))
def sim(IN, OUT):
    rows = []
    for r in json.load(open(IN)):
        T = [tuple(q) for q in r['tr']]
        if len(T) < 25: continue
        res = profile(T, min(T[-1][0], 4.5))
        if res: res['route'] = r['route']; rows.append(res)
    json.dump(rows, open(OUT, 'w')); print(len(rows), 'plants')
def report(files):
    R = []
    for f in files: R += [dict(r, src=f) for r in json.load(open(f))]
    groups = (('hitch/curl/comeback plants (turn >= 120)', lambda r: r['route'] in ('HITCH', 'hitch', 'curl', 'comeback') and r['turn'] >= 120),
              ('hitch only (turn >= 120)', lambda r: r['route'] in ('HITCH', 'hitch') and r['turn'] >= 120), ('curl only (turn >= 120)', lambda r: r['route'] == 'curl' and r['turn'] >= 120),
              ('comeback only (turn >= 120)', lambda r: r['route'] == 'comeback' and r['turn'] >= 120),
              ('out (turn 60-120)', lambda r: r['route'] in ('OUT', 'out', 'quick_out') and 60 <= r['turn'] < 120), ('dig / in (turn 60-120)', lambda r: r['route'] in ('IN', 'dig', 'short_in') and 60 <= r['turn'] < 120))
    for src in sorted({r['src'] for r in R}):
        print(f'== {src}')
        for nm, f in groups:
            S = [r for r in R if r['src'] == src and f(r)]
            if len(S) < 8: continue
            m = lambda k: st.median(r[k] for r in S)
            pf = ' '.join(f'{k:+.2f}s:{st.median(r["prof"][i][1] for r in S if r["prof"][i][1] is not None):4.1f}/{st.median(r["prof"][i][2] for r in S if r["prof"][i][2] is not None):4.1f}' for i, k in enumerate((-1.5, -1.0, -0.75, -0.5, -0.25, 0.0)))
            print(f'  {nm:42s} n {len(S):4d} | cruise {m("cruise"):4.1f} | onset {m("onset_before"):.2f} s / {m("onset_dist"):.1f} yd before the vertex ({m("brake_dist"):.1f} yd of path), arrival speed {m("v_arrive"):.1f}, mean decel {m("decel"):.1f} yd/s2, v_min {m("vmin"):.1f}'
                  f' | speed/dist-to-vertex at tb: {pf}')
if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'nfl': nfl(a[1], a[2], a[3])
    elif a[0] == 'sim': sim(a[1], a[2])
    else: report(a[1:])
