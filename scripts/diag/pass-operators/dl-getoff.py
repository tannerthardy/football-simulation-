"""The defensive line's get-off on pass plays (Integration, 2026-11-15): each DL's speed at 0.1 / 0.2 / 0.3 / 0.5 /
0.8 s after the snap (central difference of tracked positions, 0.1 s frames), and the time he first exceeds 1 yd/s.
Interior (snap spot between the offensive tackles) and edge (outside them). Same code on NFL tracking and sim exports.

usage: python3 -I scripts/diag/pass-operators/dl-getoff.py <plays.jsonl.gz> [...]
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
T = [0.1, 0.2, 0.3, 0.5, 0.8]
for path in sys.argv[1:]:
    S = {c: {t: [] for t in T} for c in ('interior', 'edge')}; first = {c: [] for c in ('interior', 'edge')}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw)
        OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
        if len(OL) < 5: continue
        lo, hi = p.pos(OL[0], 0)[1], p.pos(OL[-1], 0)[1]
        for d in p.who('D'):
            if p.players[d]['group'] != 'DL' or p.pos(d, 0)[0] is None: continue
            c = 'interior' if lo < p.pos(d, 0)[1] < hi else 'edge'
            sp = lambda k: (math.hypot(p.pos(d, k + 1)[0] - p.pos(d, k - 1)[0], p.pos(d, k + 1)[1] - p.pos(d, k - 1)[1]) / (2 * p.dt)) if k >= 1 and k + 1 < p.frames and p.pos(d, k - 1)[0] is not None and p.pos(d, k + 1)[0] is not None else None
            for t in T:
                v = sp(p.k(t))
                if v is not None: S[c][t].append(v)
            for k in range(1, min(p.frames - 1, p.k(1.0))):
                v = sp(k)
                if v is not None and v > 1.0: first[c].append(k * p.dt); break
    print(f"== {os.path.basename(path)}")
    for c in ('interior', 'edge'):
        print(f"   {c}: speed p50 at " + ' | '.join(f"{t:.1f} s {q(S[c][t]):.2f}" for t in T) + f" yd/s | first past 1 yd/s p50 {q(first[c]):.2f} s (n {len(first[c])})")
