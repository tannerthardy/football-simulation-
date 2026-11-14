"""Sack rate and time to pressure on dropbacks (Integration, 2026-11-12: TACKLE_SET / EDGE_ARC gates). Same code on NFL
tracking and sim exports (common play format).

usage: python3 -I scripts/diag/pass-operators/pressure-time.py <plays.jsonl.gz> [...]

Population: dropbacks (kind pass) with a QB. Sacked: no pass_forward and the QB behind the line at the end (as
free-rush.py; a scramble past the line is not a sack). Pressure: the first frame, before the ball is out, at which any
defender is within 2.0 yd of the QB; split by whether that defender started outside the outermost OL at the snap (edge)
or not. Time to throw for thrown balls. Limits: 0.1 s frames; 'pressure' is a distance proxy, not a charted hurry.
"""
import sys, os, json, gzip, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
pct = lambda a, b: f"{100 * a / b:.1f}%" if b else '-'

for path in sys.argv[1:]:
    n = sk = 0; pt = []; side = C.Counter(); thr = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]; n += 1
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        if fw is None:
            xe = p.pos(qb, kend)[0]
            if xe is not None and xe <= 0: sk += 1
        else: thr.append(fw)
        ys = [p.pos(o, 0)[1] for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        for k in range(kend + 1):
            if p.pos(qb, k)[0] is None: continue
            hit = next((d for d in p.who('D') if p.pos(d, k)[0] is not None and p.dist(qb, d, k) <= 2.0), None)
            if hit is not None:
                pt.append(k * p.dt); y0 = p.pos(hit, 0)[1]
                side['edge' if ys and y0 is not None and (y0 < min(ys) or y0 > max(ys)) else 'inside'] += 1
                break
    print(f"== {os.path.basename(path)}: dropbacks {n} | sacked {pct(sk, n)} | pressured (a defender within 2 yd before the ball is out) {pct(len(pt), n)}"
          f" (from the edge {pct(side['edge'], len(pt))}) | time to pressure p25/50/75 {q(pt, .25):.2f}/{q(pt):.2f}/{q(pt, .75):.2f} s"
          f" | by 2.5 s {pct(sum(t <= 2.5 for t in pt), n)} | time to throw p50 {q(thr):.2f} s")
