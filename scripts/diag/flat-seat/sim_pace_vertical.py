"""pace_driver.py's threat split on flat-seat rows (ours, or the NFL's flat-seat rows): underneath droppers (hook / curl_flat
/ hole), non-PA dropbacks before the throw; pace = depth speed over the 0.5 s ending at t; split by whether the deepest
eligible receiver within 6 yd laterally is climbing over 3 yd/s (a vertical in his area), and by that receiver's depth
relative to him (2+ yd deeper = past him).
usage: python3 -I scripts/diag/flat-seat/sim_pace_vertical.py ROWS.jsonl [...]"""
import json, sys
import numpy as np
def q(v): return f'{np.median(v):4.2f} (n {len(v)})' if v else '-'
A = [r for p in sys.argv[1:] for l in open(p) for r in [json.loads(l)] if not r['pa'] and r['cls'] in ('hook', 'curl_flat', 'hole')]
for t in (1.0, 1.5, 2.0, 2.5):
    i, j = int(round(t * 10)), int(round((t - 0.5) * 10)); V, N, P = [], [], []
    for r in A:
        if not (r['throw'] is None or r['throw'] > t) or r['d'][i] is None or r['d'][j] is None: continue
        me = r['d'][i]; pace = (me[0] - r['d'][j][0]) / 0.5
        F = [x for x in r['rec'] if x[i] is not None and x[j] is not None and abs(x[i][1] - me[1]) <= 6]
        if not F: continue
        th = max(F, key=lambda x: x[i][0]); up = (th[i][0] - th[j][0]) / 0.5
        (V if up > 3 else N).append(pace)
        if th[i][0] - me[0] > 2: P.append(pace)
    print(f't {t}: pace with a vertical in his area {q(V)} | without {q(N)} | deepest receiver 2+ yd past him {q(P)}')
