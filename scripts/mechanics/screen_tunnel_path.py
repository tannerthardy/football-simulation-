#!/usr/bin/env python3
"""The tunnel (WR-in) receiver's path, NFL vs sim, same code: his alignment (width from the ball, depth) and his position
relative to his start (and his room to his sideline, alone or with other detached receivers on his side; d = yd past the LOS, l = yd from his start toward his sideline, so inside is negative, as route
points are written) at 0.5 s steps, at the throw and at the catch. Types by screen_scorecard.classify.
    python3 -I scripts/mechanics/screen_tunnel_path.py NFL.jsonl.gz SIM.jsonl.gz"""
import gzip, json, sys, collections
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from screen_scorecard import classify
def q(v):
    v = sorted(v); return f"{v[len(v)//4]:.1f}/{v[len(v)//2]:.1f}/{v[3*len(v)//4]:.1f}" if len(v) >= 4 else '-'
for f in sys.argv[1:]:
    R = collections.defaultdict(list); n = 0
    for l in gzip.open(f, 'rt'):
        p = json.loads(l); sc = p.get('screen') or {}; r = sc.get('receiver'); ev = p['events']
        if r is None or 'pass_forward' not in ev: continue
        t = classify(p, r) or {"tunnel_screen": "WR-in"}.get(sc.get('type'))
        if t != 'WR-in': continue
        n += 1; xy = p['xy']; dt = p.get('dt', .1); by = p.get('ball_y', 26.65)
        x0, y0 = xy[0][2 * r], xy[0][2 * r + 1]; out = 1 if y0 > by else -1
        R['align width from ball'].append(abs(y0 - by)); R['align depth'].append(x0)
        room = (53.33 - y0) if out > 0 else y0
        others = sum(1 for j, pl in enumerate(p['players']) if j != r and pl['side'] == 'O' and pl['group'] in ('WR', 'TE', 'RB')
                     and (xy[0][2 * j + 1] - by) * out > 4 and xy[0][2 * j] > -2)
        R[f"room to his sideline ({'with others' if others else 'alone'})"].append(room)
        marks = [(f'{tt:.1f} s', tt) for tt in (0.5, 1.0, 1.5, 2.0)] + [('throw', ev['pass_forward'])] + ([('catch', ev['pass_arrived'])] if 'pass_arrived' in ev else [])
        for name, tt in marks:
            k = int(round(tt / dt))
            if k >= len(xy): continue
            x, y = xy[k][2 * r], xy[k][2 * r + 1]
            R[f'{name} d'].append(x); R[f'{name} l'].append((y - y0) * out)
        R['throw t'].append(ev['pass_forward'])
        if 'pass_arrived' in ev: R['flight'].append(ev['pass_arrived'] - ev['pass_forward'])
    print(f, 'n', n)
    for k, v in R.items(): print(f'   {k:24} {q(v)}')
