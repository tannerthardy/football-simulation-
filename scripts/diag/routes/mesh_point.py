"""When mesh's crossers meet: NFL against ours by one operator (Rules + Coaching, 2026-11-24; the call-theory matrix's cell 5).
Non-PA dropbacks with a shallow cross (CROSS under 7 yd at 2.0 s, call_shares' tag) from each side of the ball. For the
pair, it measures:
- the receivers' lateral distance apart at the snap;
- the time of their closest approach (from the snap, 10 Hz, to the release + 0.5 s);
- the gap and both receivers' depth there;
- each crosser's nearest defender there (a trail distance; tracking has no assignment);
- the release time.
  python3 -I mesh_point.py NFL=nfl-routes.jsonl.gz OURS=sim.jsonl.gz"""
import sys, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import call_shares as C


def pairs(path, nfl):
    import gzip, json
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        if p.get('pa') or p.get('qb') is None or p.get('rel') is None: continue
        X = np.array(p['x'], float); Y = np.array(p['y'], float); ball = Y[p['qb'], 0]; pl = p['players']
        defs = [i for i, r in enumerate(pl) if r['side'] == 'D']
        sh = []
        for i, r in enumerate(pl):
            if r['side'] != 'O' or i == p['qb']: continue
            if nfl: lab = r.get('routeRan') if r.get('route') else None
            else:
                rid = ((p.get('routes') or {}).get(str(i)) or {}).get('id'); lab = C.SIMX.get(rid) if rid else None
            if lab != 'CROSS': continue
            if X[i, min(20, X.shape[1] - 1)] >= 7: continue
            sh.append(i)
        L = [i for i in sh if Y[i, 0] > ball]; R = [i for i in sh if Y[i, 0] < ball]
        if not L or not R: continue
        a, b = L[0], R[0]; end = min(X.shape[1], p['rel'] + 6)
        d = np.hypot(X[a, :end] - X[b, :end], Y[a, :end] - Y[b, :end]); k = int(np.argmin(d))
        # Each crosser's nearest defender at the mesh point (the trail distance: tracking has no assignment).
        near = lambda i: float(min(np.hypot(X[j, k] - X[i, k], Y[j, k] - Y[i, k]) for j in defs)) if defs else None
        yield dict(split=abs(Y[a, 0] - Y[b, 0]), t=k / 10, gap=float(d[k]), da=float(X[a, k]), db=float(X[b, k]), rel=p['rel'] / 10,
                   na=near(a), nb=near(b))


def q(v): return ' / '.join(f'{np.quantile(v, x):.2f}' for x in (.25, .5, .75)) if len(v) >= 5 else '-'


args = dict(a.split('=', 1) for a in sys.argv[1:] if '=' in a)
print('| side | plays | split at snap yd | closest approach s | gap there yd | depths there yd | nearest defender to each crosser there yd | release s |')
print('|---|---|---|---|---|---|---|---|')
for k in ('NFL', 'OURS'):
    if k not in args: continue
    R = list(pairs(args[k], k == 'NFL'))
    if not R: print(f'| {k} | 0 |'); continue
    print(f"| {k} | {len(R)} | {q([r['split'] for r in R])} | {q([r['t'] for r in R])} | {q([r['gap'] for r in R])} | {q([min(r['da'], r['db']) for r in R])} (lower) / {q([max(r['da'], r['db']) for r in R])} (higher) | {q([x for r in R for x in (r['na'], r['nb']) if x is not None])} | {q([r['rel'] for r in R])} |")
