"""Curl-flat (and hook) seats with a flat threat on their side (Integration, 2026-11-23, open-flat class (a)): non-PA
dropbacks, pre-throw, flat-seat rows (NFL and sim). A flat threat at time t: an eligible receiver on the seat's side of the
ball, under 2 yd past the line, 6+ yd from the ball laterally and outside the seat. At 1.0 / 1.5 / 2.0 / 2.5 s: the seat's
depth, how far inside the flat receiver he is (lateral, + = nearer the ball), his distance to him, and his lateral speed
toward him (yd/s over 0.2 s). p50 (p25-p75).
usage: python3 -I scripts/diag/flat-seat/flat_threat_relation.py NFL.jsonl SIM.jsonl [...]"""
import json, sys, math
import numpy as np
def q(v, f=.5): return float(np.percentile(v, f * 100)) if v else float('nan')
def f3(v): return f'{q(v):5.1f} ({q(v, .25):5.1f}-{q(v, .75):5.1f})'
for lab, P in (('NFL', sys.argv[1:2]), ('sim', sys.argv[2:])):
    A = [r for p in P for l in open(p) for r in [json.loads(l)] if not r['pa'] and r['cls'] in ('curl_flat', 'hook')]
    for cls in ('curl_flat', 'hook'):
        print(f'\n{lab} {cls}: with a flat threat outside him on his side')
        print('  t    n      his depth             inside the flat receiver by   distance              lateral speed toward him   share none (no threat)')
        for t in (1.0, 1.5, 2.0, 2.5):
            i = int(round(t * 10)); dd, ins, ds, vl = [], [], [], []; none = tot = 0
            for r in A:
                if r['cls'] != cls or not (r['throw'] is None or r['throw'] > t) or r['d'][i] is None or r['d'][i - 2] is None: continue
                me = r['d'][i]; by = r['ballY']; s = 1 if me[1] > by else -1; tot += 1
                F = [x for x in r['rec'] if x[i] is not None and x[i - 2] is not None and (x[i][1] - by) * s > 6 and x[i][0] < 2 and abs(x[i][1] - by) > abs(me[1] - by)]
                if not F: none += 1; continue
                x = min(F, key=lambda x: math.dist(x[i], me))
                dd.append(me[0]); ins.append(abs(x[i][1] - by) - abs(me[1] - by)); ds.append(math.dist(x[i], me))
                vl.append(((me[1] - r['d'][i - 2][1]) / 0.2) * s)
            print(f'  {t:.1f} {len(dd):5d}  {f3(dd)}  {f3(ins)}           {f3(ds)}  {f3(vl)}       {none / max(1, tot):.2f}')
