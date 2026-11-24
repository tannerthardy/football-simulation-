"""How a deep half sets his width at the snap (Coverage, 2026-11-24, after half_timing.py: in the #1-vertical / #2-under
state the NFL half stands 4.5 yd inside #1 at the snap, ours 8.4-8.9; the taught Cover 2 / quarters rule: the half aligns
off #1's split, cheating toward a tight #1 and staying inside a wide one). Positions only, the same code on defense-film
rows (NFL nfl-stop-lane.py, PFF 2L / 2R; ours sim-stop-lane.mts, roles deep_half_s / _w), dropbacks and play action. At the
snap, on his side of the ball: #1 (the widest receiver outside the backfield) and #2 (the next, if any); widths are yards
from the ball laterally. Bins: #1's split tight (< 10) / normal (10-15) / wide (15+); #2 on his side or not; his side to the
field or the boundary (more / less room to that sideline than the other); the ball on a hash or in the middle (more than
2 yd off the centre line). Prints his width p50 (p25-p75), his width minus #1's split, his share of #1's split, and a least
squares fit of his width on #1's split, #2's split and the room to his sideline.
usage: python3 -I scripts/diag/defense-film/half_align.py LABEL 'glob' [LABEL 'glob' ...]"""
import json, sys, glob, collections
import numpy as np
OL = {'C', 'G', 'T', 'OT', 'OG', 'OL', 'QB'}


def q(v, f=.5): return float(np.percentile(v, f * 100)) if len(v) else float('nan')


def rows(paths):
    out = []
    for f in paths:
        for l in open(f):
            r = json.loads(l)
            if r['kind'] != 'pass': continue
            T = r['t']; k0 = min(range(len(T)), key=lambda k: abs(T[k]))
            if abs(T[k0]) > 0.06: continue
            src = r['src']; by = r['ballY']; P = lambda i: (r['xy'][k0][2 * i], r['xy'][k0][2 * i + 1]); pl = r['players']
            rec = [i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] not in OL and not (P(i)[0] < -2.5 and abs(P(i)[1] - by) < 4.5)]
            for h, p in enumerate(pl):
                ok = (p.get('assign') in ('2L', '2R')) if src == 'nfl' else (p.get('role') in ('deep_half_s', 'deep_half_w'))
                if p['side'] != 'D' or not ok: continue
                s = 1 if P(h)[1] > by else -1
                side = sorted([i for i in rec if (P(i)[1] - by) * s > 0], key=lambda i: -abs(P(i)[1] - by))
                if not side: continue
                room = (53.33 - by) if s > 0 else by
                other = by if s > 0 else (53.33 - by)
                out.append(dict(w=abs(P(h)[1] - by), w1=abs(P(side[0])[1] - by), w2=abs(P(side[1])[1] - by) if len(side) > 1 else None,
                                field=room > other + 1e-9, hash=abs(by - 26.67) > 2, room=room))
    return out


args = sys.argv[1:]
for lab, pat in zip(args[::2], args[1::2]):
    A = rows(sorted(glob.glob(pat)))
    print(f'\n## {lab}: deep halves at the snap {len(A)}')
    print('| #1 split | #2 on his side | side | n | his width p50 (p25-p75) | #1 split p50 | his width minus #1 | his share of #1 split | #2 split p50 | his width minus #2 |')
    print('|---|---|---|---|---|---|---|---|---|---|')
    for b, lo, hi in (('tight <10', 0, 10), ('normal 10-15', 10, 15), ('wide 15+', 15, 99)):
        for two in (True, False):
            for fs in ('field', 'boundary'):
                S = [r for r in A if lo <= r['w1'] < hi and (r['w2'] is not None) == two and r['field'] == (fs == 'field')]
                if len(S) < 8: continue
                W2 = [r for r in S if r['w2'] is not None]
                print(f"| {b} | {'yes' if two else 'no'} | {fs} | {len(S)} | {q([r['w'] for r in S]):.1f} ({q([r['w'] for r in S], .25):.1f}-{q([r['w'] for r in S], .75):.1f}) | {q([r['w1'] for r in S]):.1f} | {q([r['w'] - r['w1'] for r in S]):+.1f} | {q([r['w'] / r['w1'] for r in S]):.2f} | "
                      + (f"{q([r['w2'] for r in W2]):.1f} | {q([r['w'] - r['w2'] for r in W2]):+.1f} |" if W2 else '- | - |'))
    for hs in (True, False):
        S = [r for r in A if r['hash'] == hs]
        if S: print(f"  ball {'on a hash' if hs else 'in the middle'}: n {len(S)}, his width p50 {q([r['w'] for r in S]):.1f}; field side {q([r['w'] for r in S if r['field']]):.1f}, boundary {q([r['w'] for r in S if not r['field']]):.1f}")
    Z = [r for r in A if r['w2'] is not None]
    if len(Z) > 30:
        X = np.column_stack([np.ones(len(Z)), [r['w1'] for r in Z], [r['w2'] for r in Z], [r['room'] for r in Z]]); y = np.array([r['w'] for r in Z])
        b, *_ = np.linalg.lstsq(X, y, rcond=None); res = y - X @ b
        print(f"  least squares (n {len(Z)}): his width = {b[0]:.2f} + {b[1]:.2f} x #1 split + {b[2]:.2f} x #2 split + {b[3]:.2f} x room to his sideline; R2 {1 - res.var() / y.var():.2f}")
