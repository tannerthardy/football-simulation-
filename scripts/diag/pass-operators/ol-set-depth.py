"""The interior pass set's depth by time (Integration, 2026-11-15; the meeting): each of the three middle OL's depth
behind the line of scrimmage (his snap spot) at 0.3 / 0.5 / 0.8 / 1.0 / 1.5 / 2.0 s after the snap, and his retreat
speed (toward his own goal) over 0-0.5 / 0.5-1.0 / 1.0-1.5 s, on dropbacks to the throw. Same code on NFL tracking and
sim exports. (Offense attacks +x in the common format.)

usage: python3 -I scripts/diag/pass-operators/ol-set-depth.py [--tackles | --uncovered] <plays.jsonl.gz> [...]
--uncovered (2026-11-15, Integration: is the walk-back his set or the push?): the three middle OL split into the
uncovered (no defender within 1.2 yd of him from the snap through 2.0 s, or the throw if earlier) and the engaged (one
was), each reported separately.
--tackles (2026-11-15, SET_SPOT's tackle half): the two outside OL instead, and also each one's depth relative to the
QB at the same times (tackle depth minus QB depth behind the line: negative = the tackle shallower than the QB).
"""
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
T = [0.3, 0.5, 0.8, 1.0, 1.5, 2.0]; W = [(0, .5), (.5, 1.0), (1.0, 1.5)]
TK = '--tackles' in sys.argv; UNC = '--uncovered' in sys.argv
for path in [a for a in sys.argv[1:] if not a.startswith('--')]:
    D = {t: [] for t in T}; R = {w: [] for w in W}; Q = {t: [] for t in T}
    DU = {t: [] for t in T}; NU = [0, 0]
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw.get('events', {}); fw = ev.get('pass_forward')
        OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
        if len(OL) < 5: continue
        end = fw if fw is not None else p.end
        qb = (p.who('O', 'QB') or [None])[0]
        Dz = [i for i in p.who('D')]
        for b in ([OL[0], OL[4]] if TK else OL[1:4]):
            x0 = p.pos(b, 0)[0]
            if UNC:
                kend = min(p.k(2.0), p.k(end))
                covered = any(p.pos(b, k)[0] is not None and any(p.pos(d, k)[0] is not None and p.dist(b, d, k) <= 1.2 for d in Dz) for k in range(0, kend + 1))
                NU[0 if covered else 1] += 1
                if not covered:
                    for t in T:
                        if t > end: continue
                        x = p.pos(b, p.k(t))[0]
                        if x is not None: DU[t].append(x0 - x)
                    continue
            for t in T:
                if t > end: continue
                x = p.pos(b, p.k(t))[0]
                if x is not None: D[t].append(x0 - x)
                xq = p.pos(qb, p.k(t))[0] if qb is not None else None
                if TK and x is not None and xq is not None: Q[t].append(xq - x)
            for a, c in W:
                if c > end: continue
                xa, xc = p.pos(b, p.k(a))[0], p.pos(b, p.k(c))[0]
                if xa is not None and xc is not None: R[(a, c)].append((xa - xc) / (c - a))
    if UNC: print(f"   {os.path.basename(path)}: UNCOVERED interior OL (n {NU[1]} of {NU[0] + NU[1]}) depth behind his snap spot p50 (yd) " + ' | '.join(f"{t:.1f} s {q(DU[t]):.2f} (n {len(DU[t])})" for t in T))
    if TK: print(f"   {os.path.basename(path)}: tackle depth minus QB depth p50 (yd) " + ' | '.join(f"{t:.1f} s {q(Q[t]):.2f}" for t in T))
    print(f"== {os.path.basename(path)}: {'tackle' if TK else 'covered interior OL' if UNC else 'interior OL'} depth behind his snap spot p50 (yd) " + ' | '.join(f"{t:.1f} s {q(D[t]):.2f}" for t in T)
          + " || retreat speed p50 (yd/s) " + ' | '.join(f"{a:.1f}-{c:.1f} s {q(R[(a, c)]):.2f}" for a, c in W))
