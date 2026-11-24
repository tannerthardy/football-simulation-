"""What sets an NFL underneath dropper's pace (Integration, 2026-11-24): the drop the passer shows, the threat in front of
him, both, or neither. BDB 2025 defense-film rows (nfl-defense-film.py; weeks as given) joined with plays.csv; PFF HCL /
HCR / CFL / CFR / HOL seats; dropbacks before the throw. Pace: his depth speed over the 0.5 s ending at t (yd/s), at
t = 1.0 / 1.5 / 2.0 / 2.5 s, and his depth gain from the snap.
  by the drop shown: gun (SHOTGUN / EMPTY / PISTOL) vs under centre; dropbackDistance band (< 2.5, 2.5-4, 4+ yd);
    play action vs not;
  by the threat in front: the deepest eligible receiver within 6 yd of him laterally at t: no receiver there; his depth
    relative to the dropper (2+ yd shallower / within 2 / 2+ deeper); and whether a vertical is in his area (that
    receiver climbing over 3 yd/s);
  and least squares of pace on the drop features and the threat features together (standardised slopes, R^2 each).
usage: python3 -I scripts/diag/flat-seat/pace_driver.py FILM.jsonl"""
import json, sys, math, csv, os, collections
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
D = os.path.join(ROOT, 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
P = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(D + '/plays.csv'))}
SEAT = {'HCL', 'HCR', 'CFL', 'CFR', 'HOL'}
GUN = {'SHOTGUN', 'EMPTY', 'PISTOL'}
rows = []
for l in open(sys.argv[1]):
    r = json.loads(l)
    if not r.get('dropback'): continue
    pl_ = P.get(r['id'])
    if pl_ is None: continue
    T = r['t']; k0 = min(range(len(T)), key=lambda k: abs(T[k])); thr = r.get('throw') or 9.0
    X = lambda i, k: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1])
    pl = r['players']; rec = [i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] in ('WR', 'TE', 'RB', 'FB')]
    try: dd = float(pl_['dropbackDistance'])
    except ValueError: dd = None
    gun = (pl_['offenseFormation'] in GUN)
    for i, p in enumerate(pl):
        if p['side'] != 'D' or p.get('assign') not in SEAT: continue
        for t in (1.0, 1.5, 2.0, 2.5):
            if t >= thr: continue
            k = min(range(len(T)), key=lambda kk: abs(T[kk] - t)); kb = min(range(len(T)), key=lambda kk: abs(T[kk] - (t - 0.5)))
            if abs(T[k] - t) > 0.06 or abs(T[kb] - (t - 0.5)) > 0.06: continue
            me = X(i, k); pace = (me[0] - X(i, kb)[0]) / 0.5; gain = me[0] - X(i, k0)[0]
            F = [j for j in rec if abs(X(j, k)[1] - me[1]) <= 6]
            th = max(F, key=lambda j: X(j, k)[0]) if F else None
            tdep = X(th, k)[0] - me[0] if th is not None else None
            tup = (X(th, k)[0] - X(th, kb)[0]) / 0.5 if th is not None else None
            rows.append(dict(t=t, pace=pace, gain=gain, gun=gun, dd=dd, pa=bool(r.get('pa')), tdep=tdep, tup=tup))


def q(v): return float(np.median(v)) if len(v) else float('nan')
def cell(S): return f"pace {q([s['pace'] for s in S]):4.2f}, gain {q([s['gain'] for s in S]):4.2f} (n {len(S)})"


for t in (1.0, 1.5, 2.0, 2.5):
    A = [r for r in rows if r['t'] == t]; N = [r for r in A if not r['pa']]
    print(f'\n## t {t} s ({len(A)} dropper-moments)')
    print('  drop shown (no play action): gun ' + cell([r for r in N if r['gun']]) + ' | under centre ' + cell([r for r in N if not r['gun']]))
    print('  dropbackDistance (no PA): ' + ' | '.join(f'{lab} ' + cell([r for r in N if r['dd'] is not None and lo <= r['dd'] < hi]) for lab, lo, hi in (('< 2.5', 0, 2.5), ('2.5-4', 2.5, 4), ('4+', 4, 99))))
    print('  play action: yes ' + cell([r for r in A if r['pa']]) + ' | no ' + cell(N))
    print('  threat in front (no PA): none within 6 yd ' + cell([r for r in N if r['tdep'] is None]) + ' | deepest 2+ shallower ' + cell([r for r in N if r['tdep'] is not None and r['tdep'] < -2])
          + ' | within 2 ' + cell([r for r in N if r['tdep'] is not None and -2 <= r['tdep'] <= 2]) + ' | 2+ deeper ' + cell([r for r in N if r['tdep'] is not None and r['tdep'] > 2]))
    print('  vertical in his area (deepest there climbing > 3 yd/s): yes ' + cell([r for r in N if r['tup'] is not None and r['tup'] > 3]) + ' | no ' + cell([r for r in N if r['tup'] is None or r['tup'] <= 3]))
    # least squares on standardised features (rows with all features)
    Z = [r for r in N if r['dd'] is not None and r['tdep'] is not None]
    if len(Z) > 50:
        y = np.array([r['pace'] for r in Z])
        def fit(cols):
            Xm = np.column_stack([np.ones(len(Z))] + [(np.array(c) - np.mean(c)) / (np.std(c) or 1) for c in cols])
            b, *_ = np.linalg.lstsq(Xm, y, rcond=None); res = y - Xm @ b
            return b[1:], 1 - res.var() / y.var()
        drop = [[float(r['gun']) for r in Z], [r['dd'] for r in Z]]
        thr_ = [[r['tdep'] for r in Z], [r['tup'] for r in Z]]
        bd, r2d = fit(drop); bt, r2t = fit(thr_); bb, r2b = fit(drop + thr_)
        print(f'  least squares (n {len(Z)}): drop shown R2 {r2d:.3f} (gun {bd[0]:+.2f}, dropback distance {bd[1]:+.2f}); threat R2 {r2t:.3f} (its depth over him {bt[0]:+.2f}, its upfield speed {bt[1]:+.2f}); both R2 {r2b:.3f}')
