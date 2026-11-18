"""Route timing, one operator for NFL tracking and the sim (Integration's route-timing table, 2026-11-18).

Input: JSONL, one route per line: {"route": label, "t": [s after snap], "d": [yd past the LOS], "w": [yd lateral,
signed toward the sideline he releases to], "throw": s or null}. Only frames before the throw are used.
Per route: depth at 1.0/1.5/2.0/2.5/3.0 s (if not yet thrown); the break, the first time after 0.8 s at which the path's
heading turns more than 35 deg off the stem's heading (0.5-0.8 s) and stays turned for 0.3 s; its depth and time; and
the speed over the 0.3 s before the break.
  python3 -I route_timing.py nfl  <bdb2025 dir> <out.jsonl> [weeks]   # extract NFL routes (traditional, no PA)
  python3 -I route_timing.py table <nfl.jsonl> <sim.jsonl>             # the side-by-side table
"""
import csv, json, math, sys, statistics as st
from collections import defaultdict

TIMES = (1.0, 1.5, 2.0, 2.5, 3.0)
FAMILIES = ['corner', 'post', 'dig', 'out', 'comeback', 'curl', 'sail', 'over', 'hitch']


def at(r, t):
    ts = r['t']
    thr = r.get('throw')
    if thr is not None and t > thr:
        return None
    for i in range(1, len(ts)):
        if ts[i] >= t:
            f = (t - ts[i - 1]) / max(1e-9, ts[i] - ts[i - 1])
            return r['d'][i - 1] + f * (r['d'][i] - r['d'][i - 1])
    return None


def heading(r, i, j):
    return math.atan2(r['w'][j] - r['w'][i], r['d'][j] - r['d'][i])


def brk(r):
    ts, thr = r['t'], r.get('throw')
    idx = [i for i, t in enumerate(ts) if (thr is None or t <= thr)]
    if len(idx) < 10:
        return None
    def near(t):
        return min(idx, key=lambda i: abs(ts[i] - t))
    a, b = near(0.5), near(0.8)
    if b <= a:
        return None
    stem = heading(r, a, b)
    for i in idx:
        if ts[i] < 0.8:
            continue
        j = near(ts[i] + 0.1)
        if j <= i:
            continue
        h = heading(r, i, j)
        dev = abs((h - stem + math.pi) % (2 * math.pi) - math.pi)
        if dev > math.radians(35):
            k = near(ts[i] + 0.3)
            if k > j and abs((heading(r, j, k) - stem + math.pi) % (2 * math.pi) - math.pi) > math.radians(35):
                p = near(ts[i] - 0.3)
                v = math.hypot(r['d'][i] - r['d'][p], r['w'][i] - r['w'][p]) / max(1e-9, ts[i] - ts[p])
                q = near(ts[i] + 0.5)
                vo = math.hypot(r['d'][q] - r['d'][k], r['w'][q] - r['w'][k]) / max(1e-9, ts[q] - ts[k]) if q > k else float('nan')
                return ts[i], r['d'][i], v, vo
    return None


def summarize(rows):
    out = {}
    for t in TIMES:
        v = [x for x in (at(r, t) for r in rows) if x is not None]
        out[t] = (st.median(v), len(v)) if len(v) >= 5 else None
    b = [x for x in (brk(r) for r in rows) if x]
    vo = [x[3] for x in b if x[3] == x[3]]
    out['brk'] = (st.median([x[0] for x in b]), st.median([x[1] for x in b]), st.median([x[2] for x in b]), len(b),
                  st.median(vo) if vo else float('nan')) if len(b) >= 5 else None
    return out


def family_nfl(route, brk_depth):
    m = {'CORNER': 'corner', 'POST': 'post', 'IN': 'dig', 'CROSS': 'over', 'HITCH': 'hitch'}
    if route == 'OUT':
        return 'out' if brk_depth is None or brk_depth < 10 else 'sail'
    if route == 'HITCH' and brk_depth is not None and brk_depth >= 9:
        return 'curl'
    return m.get(route)


def nfl(src, out_path, weeks='1'):
    plays = {}
    for p in csv.DictReader(open(f'{src}/plays.csv')):
        if p['dropbackType'] == 'TRADITIONAL' and p['playAction'] == 'FALSE' and p['passResult'] not in ('', 'NA', 'R'):
            plays[(p['gameId'], p['playId'])] = p
    routes = {}
    for r in csv.DictReader(open(f'{src}/player_play.csv')):
        k = (r['gameId'], r['playId'])
        if k in plays and r['routeRan'] in ('CORNER', 'POST', 'IN', 'OUT', 'CROSS', 'HITCH'):
            routes[(k, r['nflId'])] = r['routeRan']
    keys = {k for k, _ in routes}
    frames = defaultdict(list)
    for w in weeks.split(','):
        for f in csv.DictReader(open(f'{src}/tracking_week_{w}.csv')):
            k = (f['gameId'], f['playId'])
            if k not in keys:
                continue
            if f['displayName'] == 'football' or (k, f['nflId']) in routes:
                frames[k].append(f)
    with open(out_path, 'w') as o:
        for k, fs in frames.items():
            fs.sort(key=lambda f: int(f['frameId']))
            snap = next((int(f['frameId']) for f in fs if f['frameType'] == 'SNAP'), None)
            if snap is None:
                continue
            ball = next((f for f in fs if f['displayName'] == 'football' and int(f['frameId']) == snap), None)
            if not ball:
                continue
            dirn = 1 if fs[0]['playDirection'] == 'right' else -1
            los = float(ball['x'])
            thr = next((int(f['frameId']) for f in fs if f['event'] in ('pass_forward', 'pass_shovel')), None)
            by = defaultdict(list)
            for f in fs:
                if f['displayName'] != 'football' and int(f['frameId']) >= snap:
                    by[f['nflId']].append(f)
            for nid, pf in by.items():
                rt = routes.get((k, nid))
                if not rt or not pf:
                    continue
                y0 = float(pf[0]['y'])
                side = 1 if y0 > float(ball['y']) else -1
                t = [(int(f['frameId']) - snap) / 10 for f in pf]
                d = [(float(f['x']) - los) * dirn for f in pf]
                wv = [(float(f['y']) - y0) * side * dirn for f in pf]
                r = {'route': rt, 't': t, 'd': d, 'w': wv, 'throw': (thr - snap) / 10 if thr else None}
                b = brk(r)
                r['family'] = family_nfl(rt, b[1] if b else None)
                if r['family']:
                    o.write(json.dumps(r) + '\n')


def table(nfl_path, sim_path):
    def load(p):
        g = defaultdict(list)
        for line in open(p):
            r = json.loads(line)
            if r.get('family'):
                g[r['family']].append(r)
        return g
    a, b = load(nfl_path), load(sim_path)
    head = '| route | src | n | ' + ' | '.join(f'd@{t:g}s' for t in TIMES) + ' | break t | break d | v into | v out (0.3-0.5 s after) |'
    print(head)
    print('|' + '---|' * (head.count('|') - 1))
    for fam in FAMILIES:
        for name, g in (('NFL', a), ('sim', b)):
            rows = g.get(fam, [])
            if not rows:
                continue
            s = summarize(rows)
            cells = [f'{s[t][0]:.1f}' if s[t] else '-' for t in TIMES]
            bk = s['brk']
            bc = [f'{bk[0]:.2f}', f'{bk[1]:.1f}', f'{bk[2]:.1f}', f'{bk[4]:.1f}'] if bk else ['-', '-', '-', '-']
            print(f'| {fam} | {name} | {len(rows)} | ' + ' | '.join(cells) + ' | ' + ' | '.join(bc) + ' |')


if __name__ == '__main__':
    if sys.argv[1] == 'nfl':
        nfl(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else '1')
    elif sys.argv[1] == 'table':
        table(sys.argv[2], sys.argv[3])


def banded(nfl_path, sim_path):
    """NFL routes of the same PFF label whose break depth lies within 1.5 yd of the sim family's median break depth."""
    label = {'corner': 'CORNER', 'post': 'POST', 'dig': 'IN', 'out': 'OUT', 'comeback': 'OUT', 'curl': 'HITCH', 'over': 'CROSS', 'hitch': 'HITCH'}
    nfl = [json.loads(l) for l in open(nfl_path)]
    sim = defaultdict(list)
    for l in open(sim_path):
        r = json.loads(l)
        sim[r['family']].append(r)
    for fam in FAMILIES:
        rows = sim.get(fam)
        if not rows:
            continue
        b = [x for x in (brk(r) for r in rows) if x]
        if len(b) < 5:
            # no detected break (a gradual settle): band on the deepest depth reached before the throw
            ref = st.median([max(d for d, t in zip(r['d'], r['t']) if r.get('throw') is None or t <= r['throw']) for r in rows])
        else:
            ref = st.median([x[1] for x in b])
        sel = []
        for r in nfl:
            if r['route'] != label[fam]:
                continue
            x = brk(r)
            if x and abs(x[1] - ref) <= 1.5:
                sel.append(r)
        s = summarize(sel) if sel else None
        if not s:
            print(f'| {fam} | NFL@{ref:.1f}yd | {len(sel)} | (too few) |')
            continue
        cells = [f'{s[t][0]:.1f}' if s[t] else '-' for t in TIMES]
        bk = s['brk']
        bc = [f'{bk[0]:.2f}', f'{bk[1]:.1f}', f'{bk[2]:.1f}', f'{bk[4]:.1f}'] if bk else ['-', '-', '-', '-']
        print(f'| {fam} | NFL@{ref:.1f}yd | {len(sel)} | ' + ' | '.join(cells) + ' | ' + ' | '.join(bc) + ' |')


if __name__ == '__main__' and sys.argv[1] == 'banded':
    banded(sys.argv[2], sys.argv[3])
