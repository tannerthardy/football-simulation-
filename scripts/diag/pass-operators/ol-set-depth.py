"""The interior pass set's depth by time (Integration, 2026-11-15; the meeting): each of the three middle OL's depth
behind the line of scrimmage (his snap spot) at 0.3 / 0.5 / 0.8 / 1.0 / 1.5 / 2.0 s after the snap, and his retreat
speed (toward his own goal) over 0-0.5 / 0.5-1.0 / 1.0-1.5 s, on dropbacks to the throw. Same code on NFL tracking and
sim exports. (Offense attacks +x in the common format.)

usage: python3 -I scripts/diag/pass-operators/ol-set-depth.py <plays.jsonl.gz> [...]
"""
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
T = [0.3, 0.5, 0.8, 1.0, 1.5, 2.0]; W = [(0, .5), (.5, 1.0), (1.0, 1.5)]
for path in sys.argv[1:]:
    D = {t: [] for t in T}; R = {w: [] for w in W}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw.get('events', {}); fw = ev.get('pass_forward')
        OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
        if len(OL) < 5: continue
        end = fw if fw is not None else p.end
        for b in OL[1:4]:
            x0 = p.pos(b, 0)[0]
            for t in T:
                if t > end: continue
                x = p.pos(b, p.k(t))[0]
                if x is not None: D[t].append(x0 - x)
            for a, c in W:
                if c > end: continue
                xa, xc = p.pos(b, p.k(a))[0], p.pos(b, p.k(c))[0]
                if xa is not None and xc is not None: R[(a, c)].append((xa - xc) / (c - a))
    print(f"== {os.path.basename(path)}: interior OL depth behind his snap spot p50 (yd) " + ' | '.join(f"{t:.1f} s {q(D[t]):.2f}" for t in T)
          + " || retreat speed p50 (yd/s) " + ' | '.join(f"{a:.1f}-{c:.1f} s {q(R[(a, c)]):.2f}" for a, c in W))
