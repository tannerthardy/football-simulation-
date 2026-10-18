"""Trench timeline on runs, one operator for NFL and sim (common play format):
box defenders' and OL depth past the line at the snap and at 0.3-2.0 s, and the
OL-DL meeting depth (DL engaged within 1.5 yd of an OL).
usage: trench.py FILE.jsonl.gz [--sim-trace]"""
import gzip, json, sys
med = lambda xs: round(sorted(xs)[len(xs) // 2], 2) if xs else None
trace = '--sim-trace' in sys.argv
T = (0.0, 0.3, 0.5, 0.7, 1.0, 1.5, 2.0)
dl = {t: [] for t in T}; ol = {t: [] for t in T}; dlv = {t: [] for t in T}
n = 0
for line in gzip.open(sys.argv[1], 'rt'):
    r = json.loads(line)
    if trace: r = r.get('common')
    if not r or r.get('kind') != 'run' or r.get('carrier') is None: continue
    xy = r['xy']; dt = r.get('dt', .1); by = r['ball_y']
    P = r['players']
    O = [i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL']
    box = [i for i, p in enumerate(P) if p['side'] == 'D' and xy[0][2*i] is not None and -0.5 <= xy[0][2*i] <= 2.0 and abs(xy[0][2*i+1] - by) <= 4.5]
    if not O or not box: continue
    n += 1
    for t in T:
        k = int(round(t / dt))
        if k + 1 >= len(xy): continue
        for d in box:
            if xy[k][2*d] is not None: dl[t].append(xy[k][2*d])
            if k > 0 and xy[k-1][2*d] is not None: dlv[t].append((xy[k][2*d] - xy[k-1][2*d]) / dt)
        for o in O:
            if xy[k][2*o] is not None: ol[t].append(xy[k][2*o])
print(sys.argv[1], 'runs', n)
for t in T: print(f"  t={t:.1f}  box-DL depth {med(dl[t])}  (dx/dt {med(dlv[t]) if t else '-'})   OL depth {med(ol[t])}   gap {round(med(dl[t]) - med(ol[t]), 2)}")
