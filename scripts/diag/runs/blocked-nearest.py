"""Blocked defenders near a designed run (Run Game, 2026-11-24), measurement only, from run-approach.mts rows.
(a) Never-grasped runs: the nearest defender at his closest approach, and whether he was engaged then.
(b) Every defender engaged at his closest approach before the first hold, 0.8-1.4 yd: what he did (a hold with him in
it, a missed or broken event on him, nothing). Usage: python3 -I blocked-nearest.py RUN_APPROACH.json"""
import json, math, sys
from collections import Counter
d = json.load(open(sys.argv[1])); R = d['rows']
never, rows = [], []
for r in R:
    held_ts = [float(t) for t, h in r['held'].items() if h]
    t_hold = min(held_ts) if held_ts else 1e9
    best = {}
    for f in r['frames']:
        if f['t'] > t_hold + 1e-9: break
        cx, cy = f['car'][0], f['car'][1]
        for k, v in f['d'].items():
            dd = math.hypot(v['pos'][0] - cx, v['pos'][1] - cy)
            if k not in best or dd < best[k][0]: best[k] = (dd, f['t'])
    def eng_at(k, t):
        key = f"{t:.2f}"; return k in r['eng'].get(key, [])
    evs = Counter((e[1], e[3]) for e in r['ev'])
    held_any = set(x for h in r['held'].values() for x in h)
    for k, (dd, t) in best.items():
        if eng_at(k, t) and 0.8 <= dd <= 1.4:
            out = 'hold' if k in held_any else 'missed' if evs[('missed_tackle', k)] else 'broken' if evs[('broken_tackle', k)] else 'nothing'
            rows.append((r['pos'][k], round(dd, 2), out, r['concept']))
    if not held_ts and best:
        k, (dd, t) = min(best.items(), key=lambda kv: kv[1][0])
        never.append((r['pos'][k], round(dd, 2), eng_at(k, t), r['endX']))
print(f"{sys.argv[1]}: runs {len(R)}, never grasped {len(never)} ({len(never)/len(R):.1%}); nearest engaged there {sum(x[2] for x in never)}")
for x in sorted(never, key=lambda x: -x[2]): print('  never:', x)
print(f"engaged at closest approach, 0.8-1.4 yd, before the first hold: {len(rows)}; outcomes {Counter(x[2] for x in rows)}")
for x in rows: print('  ', x)
