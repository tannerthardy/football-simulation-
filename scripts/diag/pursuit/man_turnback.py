"""The turn back of a man defender who is running away with his own receiver when the ball is caught, NFL vs ours, one operator (positions; the sim also has the request).
  python3 -I scripts/diag/pursuit/man_turnback.py NFLCATCH.jsonl.gz LABEL=SIM1.jsonl.gz[,SIM2...] [--out report.md] [--minD 8] [--tsv rows.tsv]
Plays: completions in the open-census play format through the end of the play (catch = the frame the ball is caught, recv = the catcher), man-coverage calls only
(NFL: PFF manZone == Man; sim: the call's man flag). The defender: side D at the catch frame c, at least minD (8) yd from the catcher, running at 4 yd/s or more with his
velocity (0.2 s centred displacement) at least 100 degrees off the direction to the catcher (away from him), and a non-catcher offensive player (not the QB or a lineman)
within 3 yd of him: his own man. Measured from c:
  speed at the catch; start = the first frame from c where the velocity heading is 20 degrees or more off its heading at c (latency); turned = the first frame from c where
  the velocity points within 45 degrees of the direction to the catcher at a speed of 2 yd/s or more (observed for 3 s: a play with less than 3 s of track after the catch is left out); speed when turned;
  the lowest speed from c to turned; the turn time = turned - start; the catcher's distance at turned.
The sim also has the request: the first frame from c where the REQUEST points within 45 degrees of the catcher at a request of 2 yd/s or more (the decision), against the velocity's."""
import gzip, json, sys, math, collections
import numpy as np
argv = sys.argv[1:]
def opt(n, d=None):
    if n in argv:
        i = argv.index(n); v = argv[i + 1]; del argv[i:i + 2]; return v
    return d
OUT = opt('--out'); MIND = float(opt('--minD', '8')); TSV = opt('--tsv')
nfl_path = [a for a in argv if '=' not in a][0]
sims = {a.split('=', 1)[0]: a.split('=', 1)[1].split(',') for a in argv if '=' in a}
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
OL = {'T', 'G', 'C', 'OT', 'OG', 'QB'}
def vel(X, Y, i, f, nf):
    a, b = max(0, f - 1), min(nf - 1, f + 1)
    return ((X[i, b] - X[i, a]) / ((b - a) / 10.0), (Y[i, b] - Y[i, a]) / ((b - a) / 10.0))
def rows_of(paths, src):
    rows = []
    for path in paths:
        for l in gzip.open(path, 'rt'):
            p = json.loads(l)
            man = (p.get('manzone') == 'Man') if src == 'NFL' else bool(p.get('man'))
            c, r = p.get('catch'), p.get('recv')
            if not man or c is None or r is None or r < 0: continue
            X = np.array(p['x']); Y = np.array(p['y']); nf = X.shape[1]; pl = p['players']
            if c + 31 >= nf: continue  # 3 s of track after the catch on every row
            for i, q in enumerate(pl):
                if q['side'] != 'D': continue
                D = math.hypot(X[i, c] - X[r, c], Y[i, c] - Y[r, c])
                vx, vy = vel(X, Y, i, c, nf); sp = math.hypot(vx, vy)
                if D < MIND or sp < 4.0: continue
                dirc = math.atan2(Y[r, c] - Y[i, c], X[r, c] - X[i, c])
                if abs(math.degrees(wrap(math.atan2(vy, vx) - dirc))) < 100: continue
                own = [j for j, o in enumerate(pl) if o['side'] == 'O' and j != r and o['pos'] not in OL and math.hypot(X[j, c] - X[i, c], Y[j, c] - Y[i, c]) <= 3.0]
                if not own: continue
                h0 = math.atan2(vy, vx); start = None; turned = None; mn = sp; reqt = None
                for f in range(c, c + 31):
                    vx, vy = vel(X, Y, i, f, nf); s = math.hypot(vx, vy)
                    if start is None and s > 1.0 and abs(math.degrees(wrap(math.atan2(vy, vx) - h0))) >= 20: start = f
                    d = math.atan2(Y[r, f] - Y[i, f], X[r, f] - X[i, f])
                    if turned is None and s >= 2.0 and abs(math.degrees(wrap(math.atan2(vy, vx) - d))) <= 45: turned = f
                    if turned is None: mn = min(mn, s)
                    if p.get('qx') and reqt is None:
                        qx, qy = p['qx'][i][f], p['qy'][i][f]
                        if math.hypot(qx, qy) >= 2.0 and abs(math.degrees(wrap(math.atan2(qy, qx) - d))) <= 45: reqt = f
                row = dict(src=src, id=p.get('id'), pos=q['pos'], D=D, sp=sp, cens=turned is None, req=(reqt - c) / 10.0 if reqt is not None else None, n_own=len(own))
                row['start'] = (start - c) / 10.0 if start is not None else None
                if turned is not None:
                    vx, vy = vel(X, Y, i, turned, nf); row.update(t=(turned - c) / 10.0, sp_t=math.hypot(vx, vy), mn=mn, Dt=math.hypot(X[i, turned] - X[r, turned], Y[i, turned] - Y[r, turned]),
                                                              turn=((turned - start) / 10.0) if start is not None else None)
                rows.append(row)
    return rows
data = {'NFL': rows_of([nfl_path], 'NFL')}
for lab, ps in sims.items(): data[lab] = rows_of(ps, lab)
m = lambda v: float(np.mean(v)) if len(v) else float('nan')
q = lambda v, k: float(np.percentile(v, k)) if len(v) else float('nan')
lines = []; P = lambda s='': lines.append(s)
P(f'## A man defender running away with his own man at the catch: the turn back (defender at least {MIND:g} yd from the catcher, 4 yd/s or more, 100+ degrees off the catcher; man calls)\n')
P('| sample | band | n | speed at the catch | catch to heading change of 20 degrees (s, p50) | catch to velocity within 45 deg of the catcher (s, p25 / p50 / p75) | not turned in 3 s | speed when turned / at the catch | lowest speed on the way / at the catch | turn time from the start (s) | distance to the catcher then (yd) |')
P('|---|---|---|---|---|---|---|---|---|---|---|')
for lab, R in data.items():
    for name, lo, hi in (('8-15 yd', 8, 15), ('15+ yd', 15, 99), ('8+ yd', 8, 99)):
        S = [r for r in R if lo <= r['D'] < hi]
        if len(S) < 8: P(f'| {lab} | {name} | {len(S)} | | | | | | | | |'); continue
        T = [r for r in S if not r['cens']]; st = [r['start'] for r in S if r['start'] is not None]
        P(f'| {lab} | {name} | {len(S)} | {m([r["sp"] for r in S]):.1f} | {q(st, 50):.2f} | {q([r["t"] for r in T], 25):.2f} / {q([r["t"] for r in T], 50):.2f} / {q([r["t"] for r in T], 75):.2f} | {1 - len(T) / len(S):.2f} | {m([r["sp_t"] / r["sp"] for r in T]):.2f} | {m([r["mn"] / r["sp"] for r in T]):.2f} | {m([r["turn"] for r in T if r["turn"] is not None]):.2f} | {m([r["Dt"] for r in T]):.1f} |')
P('')
P('Share of those defenders whose velocity is within 45 degrees of the catcher by (all rows, 8+ yd):\n')
P('| sample | n | 1.0 s | 1.5 s | 2.0 s | 2.5 s | 3.0 s |'); P('|---|---|---|---|---|---|---|')
for lab, R in data.items():
    S = [r for r in R if r['D'] >= MIND]
    if S: P(f'| {lab} | {len(S)} | ' + ' | '.join(f'{sum(1 for r in S if not r["cens"] and r["t"] <= x) / len(S):.2f}' for x in (1.0, 1.5, 2.0, 2.5, 3.0)) + ' |')
P('')
for lab, R in data.items():
    if lab == 'NFL': continue
    S = [r for r in R if r['D'] >= MIND and r['req'] is not None]
    if len(S) >= 8:
        T = [r for r in S if not r['cens']]
        P(f'{lab}: the request points within 45 degrees of the catcher at p25 / p50 / p75 {q([r["req"] for r in S], 25):.2f} / {q([r["req"] for r in S], 50):.2f} / {q([r["req"] for r in S], 75):.2f} s after the catch (n {len(S)}); the velocity does at {q([r["t"] for r in T], 25):.2f} / {q([r["t"] for r in T], 50):.2f} / {q([r["t"] for r in T], 75):.2f} s: the body adds {q([r["t"] - r["req"] for r in T if r["req"] is not None], 50):.2f} s at the median.')
P('')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
if TSV:
    with open(TSV, 'w') as f:
        f.write('src\tid\tpos\tD\tsp\tstart\tt\tsp_t\tmin\treq\n')
        for lab, R in data.items():
            for r in R: f.write(f'{lab}\t{r["id"]}\t{r["pos"]}\t{r["D"]:.1f}\t{r["sp"]:.2f}\t{r["start"]}\t{r.get("t","")}\t{r.get("sp_t","")}\t{r.get("mn","")}\t{r["req"]}\n')
print(txt)
