"""NFL safeties by PFF seat (defense-film rows, BDB 2025): first committed move direction (0.5 yd from the snap spot at over
1 yd/s; downhill / lateral in (toward the ball) / lateral out / backward) and depth / width change from the snap spot at
0.5 / 1.0 / 1.5 / 2.0 s (width + = outward), by seat group (deep middle 3M; deep half 2L/2R; quarter 4IL/4IR/4OL/4OR;
man MAN; underneath HOL/HCL/HCR/CFL/CFR/FL/FR; other) and play type (run / play action / dropback).
usage: python3 -I scripts/diag/defense-film/nfl_safety_seat.py FILM.jsonl"""
import json, sys, math, collections
import numpy as np
SEAT = {'3M': 'deep middle', '2L': 'deep half', '2R': 'deep half', '4IL': 'quarter', '4IR': 'quarter', '4OL': 'quarter', '4OR': 'quarter', 'MAN': 'man',
        '3L': 'deep third', '3R': 'deep third'}
A = collections.defaultdict(list)
for l in open(sys.argv[1]):
    r = json.loads(l); T = r['t']; k0 = min(range(len(T)), key=lambda k: abs(T[k]))
    if abs(T[k0]) > 0.06: continue
    pt = 'run' if r['kind'] == 'run' else 'play action' if r.get('pa') else 'dropback'
    by = r.get('ballY', 26.67); X = lambda i, k: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1])
    for i, p in enumerate(r['players']):
        if p['side'] != 'D' or p['pos'] not in ('S', 'SS', 'FS'): continue
        g = SEAT.get(p.get('assign')) or ('underneath / other' if p.get('assign') else 'none')
        x0, y0 = X(i, k0); s = 1 if y0 >= by else -1
        first = None
        for k in range(k0 + 2, len(T) - 2):
            if T[k] > 3: break
            dx, dy = X(i, k)[0] - x0, (X(i, k)[1] - y0) * s
            v = math.dist(X(i, k + 2), X(i, k - 2)) / max(1e-6, T[k + 2] - T[k - 2])
            if math.hypot(dx, dy) > 0.5 and v > 1:
                first = ('lateral-out' if dy > 0 else 'lateral-in') if abs(dy) > abs(dx) else 'downhill' if dx < 0 else 'backward'; break
        path = {}
        for t in (0.5, 1.0, 1.5, 2.0):
            k = min(range(len(T)), key=lambda kk: abs(T[kk] - t)); path[t] = (X(i, k)[0] - x0, (X(i, k)[1] - y0) * s)
        A[(pt, g)].append((first, path))
for pt in ('run', 'play action', 'dropback'):
    print(f'\n## {pt}')
    for g in ('deep middle', 'deep half', 'quarter', 'deep third', 'man', 'underneath / other'):
        G = A[(pt, g)]
        if len(G) < 20: continue
        F = [f for f, _ in G if f]; C = collections.Counter(F)
        dd = ' / '.join(f"{np.median([p[t][0] for _, p in G]):+.1f}" for t in (0.5, 1.0, 1.5, 2.0))
        ww = ' / '.join(f"{np.median([p[t][1] for _, p in G]):+.1f}" for t in (0.5, 1.0, 1.5, 2.0))
        print(f'  {g:18s} n {len(G):5d}: first ' + ', '.join(f'{k} {100 * v / len(F):.0f}%' for k, v in C.most_common()) + f' | depth {dd} | width {ww}')
