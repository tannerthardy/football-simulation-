"""The flat's pace, NFL against ours by one operator (Rules + Coaching, 2026-11-24; the QB lane's flat timing point).
Every route runner on a FLAT route (NFL routeRan; ours by the route chart's SIM map: flat, back_flat, swing), non-PA
dropbacks, split into WR/TE against backs (RB/FB/HB). At 1.0 / 1.5 / 2.0 / 2.5 s from the snap, p50:
- depth past the line (x);
- width outward from his snap spot (away from the ball);
- lateral speed outward over the previous 0.5 s;
- the time he first reaches 3 yd outward and his depth then.
Then, for plays thrown to a flat, where he is at the release (the timing point routes.ts declares).
  python3 -I flat_pace.py NFL=nfl-routes.jsonl.gz OURS=sim.jsonl.gz"""
import gzip, json, sys
import numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from route_chart import SIM
BACKS = {'RB', 'FB', 'HB'}
T = (10, 15, 20, 25)


def rows(path, nfl):
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        if p.get('pa') or p.get('qb') is None: continue
        X = np.array(p['x'], float); Y = np.array(p['y'], float); ball = Y[p['qb'], 0]
        for i, r in enumerate(p['players']):
            if r['side'] != 'O': continue
            if nfl: lab = r.get('routeRan') if r.get('route') else None
            else:
                rid = ((p.get('routes') or {}).get(str(i)) or {}).get('id'); lab = SIM.get(rid, rid) if rid else None
            if lab != 'FLAT': continue
            s = 1.0 if Y[i, 0] >= ball else -1.0
            w = (Y[i] - Y[i, 0]) * s
            k3 = next((k for k in range(len(w)) if w[k] >= 3), None)
            yield dict(back=r.get('pos') in BACKS, x=X[i], w=w, k3=k3)


def at(v, k): return v[k] if len(v) > k else None
def med(a): a = [x for x in a if x is not None]; return f'{np.median(a):.1f}' if len(a) >= 8 else '-'


args = dict(a.split('=', 1) for a in sys.argv[1:] if '=' in a)
print('| side | who | n | depth past LOS @1.0/1.5/2.0/2.5 s | width outward @1.0/1.5/2.0/2.5 s | outward speed @1.0/1.5/2.0/2.5 s | time to 3 yd wide / depth then |')
print('|---|---|---|---|---|---|---|')
for k in ('NFL', 'OURS'):
    if k not in args: continue
    R = list(rows(args[k], k == 'NFL'))
    for who, S in (('WR/TE', [r for r in R if not r['back']]), ('back', [r for r in R if r['back']])):
        if not S: continue
        dep = ' / '.join(med([at(r['x'], t) for r in S]) for t in T)
        wid = ' / '.join(med([at(r['w'], t) for r in S]) for t in T)
        spd = ' / '.join(med([(at(r['w'], t) - at(r['w'], t - 5)) / 0.5 if at(r['w'], t) is not None else None for r in S]) for t in T)
        t3 = med([r['k3'] / 10 if r['k3'] is not None else None for r in S]); d3 = med([r['x'][r['k3']] if r['k3'] is not None else None for r in S])
        print(f'| {k} | {who} | {len(S)} | {dep} | {wid} | {spd} | {t3} s / {d3} yd |')

# Where targeted flats are thrown (the timing point): plays whose one target ran FLAT, at the release, p25 / p50 / p75.
print('\n| side | who | n | release s | depth past LOS yd | outward from snap spot yd |')
print('|---|---|---|---|---|---|')
for k in ('NFL', 'OURS'):
    if k not in args: continue
    nfl = k == 'NFL'; R = {}
    for l in gzip.open(args[k], 'rt'):
        p = json.loads(l)
        if p.get('pa') or p.get('rel') is None or p.get('qb') is None: continue
        ti = [i for i, r in enumerate(p['players']) if r.get('target') and r['side'] == 'O']
        if len(ti) != 1: continue
        i = ti[0]; r = p['players'][i]
        lab = r.get('routeRan') if nfl else SIM.get(((p.get('routes') or {}).get(str(i)) or {}).get('id'), None)
        if lab != 'FLAT': continue
        X = np.array(p['x'], float); Y = np.array(p['y'], float); kk = min(p['rel'], X.shape[1] - 1)
        s = 1.0 if Y[i, 0] >= Y[p['qb'], 0] else -1.0
        R.setdefault('back' if r.get('pos') in BACKS else 'WR/TE', []).append((p['rel'] / 10, X[i, kk], (Y[i, kk] - Y[i, 0]) * s))
    for who, v in R.items():
        a = np.array(v); q = lambda c: ' / '.join(f'{np.quantile(a[:, c], t):.1f}' for t in (.25, .5, .75))
        print(f'| {k} | {who} | {len(v)} | {q(0)} | {q(1)} | {q(2)} |')
