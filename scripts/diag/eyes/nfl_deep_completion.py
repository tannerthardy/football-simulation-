"""Deep-route completion vs separation at the throw (BDB 2025, weeks 1-3).
Run: python3 -I nfl_deep_completion.py [datadir] [outdir]"""
import csv, sys, os, math, collections, json
import os
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')), 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')), 'out', 'eyes')
os.makedirs(OUT, exist_ok=True)
WEEKS = (1, 2, 3)
GO = {'GO', 'POST', 'SEAM'}
games = {r['gameId'] for r in csv.DictReader(open(f'{D}/games.csv')) if int(r['week']) in WEEKS}
plays = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['gameId'] in games and r['isDropback'] == 'TRUE' and r['playAction'] == 'FALSE' and r['passResult'] in ('C', 'I', 'IN'):
        plays[(r['gameId'], r['playId'])] = r
route_labels = collections.Counter()
target, passer = {}, {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k not in plays: continue
    if r['wasTargettedReceiver'] == '1':
        route_labels[r['routeRan']] += 1
        if r['routeRan'] in GO or r['routeRan'] == 'HITCH':
            target[k] = (r['nflId'], r['routeRan'])
    if r['hadDropback'] == '1': passer[k] = r['nflId']
ARR = ['pass_arrived', 'pass_outcome_caught', 'pass_outcome_incomplete', 'pass_outcome_interception', 'pass_outcome_touchdown', 'pass_tipped']
EV = {'ball_snap', 'pass_forward', *ARR}
fr = collections.defaultdict(lambda: collections.defaultdict(list))  # key -> event -> rows
for w in WEEKS:
    with open(f'{D}/tracking_week_{w}.csv') as f:
        rd = csv.reader(f); h = next(rd); ix = {c: i for i, c in enumerate(h)}
        g, p, n, fi, cl, pd, x, y, e = (ix[c] for c in ('gameId', 'playId', 'nflId', 'frameId', 'club', 'playDirection', 'x', 'y', 'event'))
        for row in rd:
            ev = row[e]
            if ev not in EV: continue
            k = (row[g], row[p])
            if k not in target: continue
            fr[k][ev].append((row[n], row[cl], int(row[fi]), float(row[x]), float(row[y]), row[pd]))
recs = []
drops = collections.Counter(); arrsrc = collections.Counter()
for k, (tid, route) in target.items():
    evs = fr.get(k)
    if not evs: drops['no_frames'] += 1; continue
    pos = plays[k]['possessionTeam']
    ball = {v: [r for r in evs.get(v, []) if r[1] == 'football'] for v in EV}
    arr = [v for v in ARR if ball[v]]
    if not ball['ball_snap'] or not ball['pass_forward'] or not arr: drops['missing_event'] += 1; continue
    arrsrc[arr[0]] += 1; ball['pass_arrived'] = sorted((b for v in arr for b in ball[v]), key=lambda b: b[2])
    los = ball['ball_snap'][0][3]; sgn = 1 if ball['ball_snap'][0][5] == 'right' else -1
    pf = [r for r in evs['pass_forward'] if r[1] != 'football']
    tr = [r for r in pf if r[0] == tid]; df = [r for r in pf if r[1] != pos]
    if not tr or not df: drops['no_target_or_def'] += 1; continue
    t = tr[0]; tdep = sgn * (t[3] - los)
    sep = min(math.hypot(d[3] - t[3], d[4] - t[4]) for d in df)
    ott = any(sgn * (d[3] - los) > tdep and abs(d[4] - t[4]) <= 5 for d in df)
    flight = (ball['pass_arrived'][0][2] - ball['pass_forward'][0][2]) / 10
    qb = [r for r in pf if r[0] == passer.get(k)]
    q = qb[0] if qb else ball['pass_forward'][0]
    a = ball['pass_arrived'][0]; dist = math.hypot(a[3] - q[3], a[4] - q[4])
    recs.append(dict(k=k, fam='GO' if route in GO else 'HITCH', route=route, res=plays[k]['passResult'],
                     sep=sep, depth=tdep, ott=ott, flight=flight, dist=dist))
json.dump(recs, open(f'{OUT}/nfl_deep_completion.json', 'w'), default=str)
def q(v, p):
    v = sorted(v); i = (len(v) - 1) * p; lo = int(i); return v[lo] + (v[min(lo + 1, len(v) - 1)] - v[lo]) * (i - lo)
def row(lbl, rs):
    n = len(rs)
    if not n: return f'| {lbl} | 0 | - | - |'
    c = sum(r['res'] == 'C' for r in rs); i = sum(r['res'] == 'IN' for r in rs)
    return f'| {lbl} | {n} | {100*c/n:.0f}% | {100*i/n:.1f}% |'
SB = [('<1', 0, 1), ('1-2', 1, 2), ('2-3', 2, 3), ('3-5', 3, 5), ('5+', 5, 1e9)]
DB = [('<10', -1e9, 10), ('10-20', 10, 20), ('20+', 20, 1e9)]
L = [f'Kept {len(recs)} of {len(target)}; drops {dict(drops)}; arrival event used {dict(arrsrc)}', f'Targeted route labels (all, sample): {dict(route_labels.most_common())}']
for fam in ('GO', 'HITCH'):
    rs = [r for r in recs if r['fam'] == fam]
    L.append(f'\n## {fam} family (n={len(rs)}; routes {dict(collections.Counter(r["route"] for r in rs))})')
    if not rs: continue
    s = [r['sep'] for r in rs]
    L.append(f'sep p25/p50/p75 = {q(s,.25):.2f}/{q(s,.5):.2f}/{q(s,.75):.2f} yd; depth p50 {q([r["depth"] for r in rs],.5):.1f}; '
             f'flight p50 {q([r["flight"] for r in rs],.5):.1f}s; air dist p50 {q([r["dist"] for r in rs],.5):.1f} yd; '
             f'share sep<1.5 = {100*sum(x<1.5 for x in s)/len(s):.0f}%; over-top = {100*sum(r["ott"] for r in rs)/len(rs):.0f}%')
    L.append('| sep bin | n | comp | INT |\n|---|---|---|---|')
    L += [row(b, [r for r in rs if lo <= r['sep'] < hi]) for b, lo, hi in SB]
    if fam == 'GO':
        for o in (True, False):
            L.append(f'\nOver-the-top={"yes" if o else "no"}\n| sep bin | n | comp | INT |\n|---|---|---|---|')
            L.append(row('all', [r for r in rs if r['ott'] == o]))
            L += [row(b, [r for r in rs if r['ott'] == o and lo <= r['sep'] < hi]) for b, lo, hi in SB]
        for b, dlo, dhi in DB:
            sub = [r for r in rs if dlo <= r['depth'] < dhi]
            L.append(f'\nDepth {b} yd\n| sep bin | n | comp | INT |\n|---|---|---|---|')
            L.append(row('all', sub))
            L += [row(sb, [r for r in sub if lo <= r['sep'] < hi]) for sb, lo, hi in SB]
txt = '\n'.join(L); print(txt); open(f'{OUT}/nfl_deep_completion.md', 'w').write(txt + '\n')
