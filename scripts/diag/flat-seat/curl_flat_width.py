"""The curl-flat seat's width against the receivers he must reach (Integration, 2026-11-24, open-flat class (c)):
non-PA dropbacks, pre-throw, flat-seat rows (NFL PFF CFL / CFR; ours curl_flat_*). At 0.0 / 1.0 / 1.5 / 2.0 / 2.5 s:
his width from the ball and from the sideline; how far inside the widest receiver on his side who is shallower than 6 yd
(+ = inside, nearer the ball), and inside #2 (the second receiver from the outside on his side at the snap, wherever he
is now); and the share with no shallow receiver outside him.
usage: python3 -I scripts/diag/flat-seat/curl_flat_width.py NFL.jsonl SIM.jsonl [...]"""
import json, sys
import numpy as np
def q(v, f=.5): return float(np.percentile(v, f * 100)) if v else float('nan')
def f3(v): return f'{q(v):5.1f} ({q(v, .25):5.1f}-{q(v, .75):5.1f})'
for lab, P in (('NFL', sys.argv[1:2]), ('sim', sys.argv[2:])):
    A = [r for p in P for l in open(p) for r in [json.loads(l)] if not r['pa'] and r['cls'] == 'curl_flat']
    print(f'\n## {lab}: curl-flat seats, n {len(A)}')
    print('  t    n     width from ball        from sideline          inside widest shallow   inside #2             none outside him')
    for t in (0.0, 1.0, 1.5, 2.0, 2.5):
        i = int(round(t * 10)); w, sl, iw, i2, none, n = [], [], [], [], 0, 0
        for r in A:
            if not (r['throw'] is None or r['throw'] > t) or r['d'][i] is None: continue
            me = r['d'][i]; by = r['ballY']; s = 1 if me[1] > by else -1; n += 1
            w.append(abs(me[1] - by)); sl.append(min(me[1], 53.33 - me[1]))
            R0 = [x for x in r['rec'] if x[0] is not None and (x[0][1] - by) * s > 0]
            R0.sort(key=lambda x: -abs(x[0][1] - by))
            if len(R0) >= 2 and R0[1][i] is not None: i2.append(abs(R0[1][i][1] - by) - abs(me[1] - by))
            sh = [x[i] for x in r['rec'] if x[i] is not None and (x[i][1] - by) * s > 0 and x[i][0] < 6]
            if sh:
                wid = max(abs(p[1] - by) for p in sh); iw.append(wid - abs(me[1] - by))
                if wid < abs(me[1] - by): none += 1
            else: none += 1
        print(f'  {t:.1f} {n:5d}  {f3(w)}  {f3(sl)}  {f3(iw)}   {f3(i2)}  {100 * none / max(1, n):5.1f}%')
