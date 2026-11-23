"""Underneath zone seats (hook, curl_flat, hole) carrying or walling a receiver, non-PA dropbacks, pre-throw (flat-seat rows,
NFL and sim): at 1.0 / 1.5 / 2.0 / 2.5 s, for the nearest eligible receiver when he is within 5 yd of the defender and
climbing (upfield over 2 yd/s over the last 0.2 s): the defender's depth over him (+ = deeper), how far inside him (+ = nearer
the ball), distance, and the defender's own upfield speed against the receiver's. p50 (p25-p75).
usage: python3 -I scripts/diag/flat-seat/carry_relation.py NFL.jsonl SIM.jsonl [...]"""
import json, sys, math
import numpy as np
def q(v, f=.5): return float(np.percentile(v, f * 100)) if v else float('nan')
def f3(v): return f'{q(v):5.1f} ({q(v, .25):5.1f}-{q(v, .75):5.1f})'
for lab, P in (('NFL', sys.argv[1:2]), ('sim', sys.argv[2:])):
    A = [r for p in P for l in open(p) for r in [json.loads(l)] if not r['pa'] and r['cls'] in ('hook', 'curl_flat', 'hole')]
    print(f'\n{lab}: underneath zone seat with the nearest receiver within 5 yd and climbing (> 2 yd/s upfield)')
    print('  t    n      depth over him          inside him (+ nearer ball)   distance              his upfield speed     receiver upfield')
    for t in (1.0, 1.5, 2.0, 2.5):
        i = int(round(t * 10)); ov, ins, ds, vd, vr = [], [], [], [], []
        for r in A:
            if not (r['throw'] is None or r['throw'] > t) or r['d'][i] is None or r['d'][i - 2] is None: continue
            me = r['d'][i]; R = [x for x in r['rec'] if x[i] is not None and x[i - 2] is not None]
            if not R: continue
            x = min(R, key=lambda x: math.dist(x[i], me))
            if math.dist(x[i], me) > 5: continue
            up = (x[i][0] - x[i - 2][0]) / 0.2
            if up <= 2: continue
            ov.append(me[0] - x[i][0]); ins.append(abs(x[i][1] - r['ballY']) - abs(me[1] - r['ballY'])); ds.append(math.dist(x[i], me))
            vd.append((me[0] - r['d'][i - 2][0]) / 0.2); vr.append(up)
        print(f'  {t:.1f} {len(ov):5d}  {f3(ov)}  {f3(ins)}       {f3(ds)}  {f3(vd)}  {f3(vr)}')
