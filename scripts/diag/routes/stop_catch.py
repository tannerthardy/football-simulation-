"""Catches on stop routes, NFL vs ours, same operator. NFL: PFF HITCH (covers hitch/curl/comeback); ours: hitch,
quick_hitch, curl, comeback. Binned by catch depth (yd past the line). At the catch frame: speed, velocity along x
(negative = coming back toward the line), share standing (< 1 yd/s), share coming back (vx < -1 yd/s), nearest defender
distance, yards from the catch to the end of the play.
usage: python3 -I stop_catch.py nfl-plays.jsonl.gz NFL=nfl-catches.jsonl.gz LABEL=sim.jsonl.gz [...]"""
import gzip, json, math, sys
import numpy as np
SIM = {'hitch', 'quick_hitch', 'curl', 'comeback'}
ROUTE = {}
def load_routes(path):
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        for r in p['players']:
            if r.get('routeRan') and r.get('id'): ROUTE[(p['id'], r['id'])] = r['routeRan']
def rows(path, nfl):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); k = p.get('catch'); i = p.get('recv')
        if k is None or i is None or i < 0: continue
        X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; nf = X.shape[1]
        if k < 2 or k + 1 >= nf: continue
        r = pl[i]
        if r['pos'] != 'WR': continue
        if nfl:
            if ROUTE.get((p['id'], r.get('id'))) != 'HITCH': continue
        else:
            rid = ((p.get('routes') or {}).get(str(i)) or {}).get('id')
            if rid not in SIM or p.get('screen'): continue
        vx = (X[i, k + 1] - X[i, k - 1]) / 0.2; vy = (Y[i, k + 1] - Y[i, k - 1]) / 0.2
        d = [math.hypot(X[j, k] - X[i, k], Y[j, k] - Y[i, k]) for j, q in enumerate(pl) if q['side'] == 'D']
        out.append(dict(dep=X[i, k], s=math.hypot(vx, vy), vx=vx, sep=min(d) if d else None, yac=X[i, nf - 1] - X[i, k]))
    return out
def rep(lab, R):
    print(f"| {lab} | catch depth | n | speed p25/p50/p75 | vx p50 | standing | coming back | nearest defender p50 | yards after the catch p50 / mean |")
    print('|---|---|---|---|---|---|---|---|---|')
    for a, b in ((0, 8), (8, 14), (14, 25), (0, 25)):
        v = [r for r in R if a <= r['dep'] < b]
        if len(v) < 5: continue
        s = np.array([r['s'] for r in v])
        print(f"| {lab} | {a}-{b} | {len(v)} | {' / '.join(f'{np.quantile(s, q):.1f}' for q in (.25, .5, .75))} | {np.median([r['vx'] for r in v]):+.1f} | "
              f"{np.mean(s < 1):.2f} | {np.mean([r['vx'] < -1 for r in v]):.2f} | {np.median([r['sep'] for r in v]):.1f} | {np.median([r['yac'] for r in v]):.1f} / {np.mean([r['yac'] for r in v]):.1f} |")
    print()
load_routes(sys.argv[1]); args = sys.argv[2:]
for a in args:
    lab, p = a.split('=', 1); rep(lab, rows(p, lab == 'NFL'))
