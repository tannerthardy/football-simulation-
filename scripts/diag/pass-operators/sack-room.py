"""Where sacks come from and how much room the QB had behind him (Integration, 2026-11-12: verify 'a tackle who no
longer drifts deep leaves the QB less room' on the plays before quoting it). Same code on NFL and sim.

usage: python3 -I scripts/diag/pass-operators/sack-room.py <plays.jsonl.gz> [...]

Sacked: a dropback with no pass_forward and the QB behind the line at the end (as free-rush.py). The sacker: the
defender nearest the QB at the end. His origin: 'edge' if his snap y is outside the outermost OL, else 'inside'.
At the first frame any defender is within 2.0 yd of the QB (pressure): the QB's depth, the deeper tackle's depth
relative to the QB (tackle x minus QB x; negative = the tackle deeper than the QB), and the QB's retreat from then to
the end (positive = he went deeper). For comparison the same pressure-moment measures on pressured plays that were
not sacks. Limits: the nearest defender at the end is a proxy for the sacker; 0.1 s frames.
"""
import sys, os, json, gzip, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
pct = lambda a, b: f"{100 * a / b:.0f}%" if b else '-'

for path in sys.argv[1:]:
    rows = []; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]; n += 1
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        ys = [p.pos(o, 0)[1] for o in OL]; tks = [min(OL, key=lambda o: p.pos(o, 0)[1]), max(OL, key=lambda o: p.pos(o, 0)[1])]
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        if p.pos(qb, kend)[0] is None: continue
        sacked = fw is None and p.pos(qb, kend)[0] <= 0
        kp = next((k for k in range(kend + 1) if p.pos(qb, k)[0] is not None and any(p.pos(d, k)[0] is not None and p.dist(qb, d, k) <= 2.0 for d in p.who('D'))), None)
        if kp is None: continue
        qx = p.pos(qb, kp)[0]
        tx = min(p.pos(t, kp)[0] for t in tks if p.pos(t, kp)[0] is not None)
        r = {'sacked': sacked, 'qbx': qx, 'tvq': tx - qx, 'retreat': qx - p.pos(qb, kend)[0]}
        if sacked:
            D = [d for d in p.who('D') if p.pos(d, kend)[0] is not None]
            s = min(D, key=lambda d: p.dist(qb, d, kend)); y0 = p.pos(s, 0)[1]
            r['origin'] = 'edge' if y0 is not None and (y0 < min(ys) or y0 > max(ys)) else 'inside'
        rows.append(r)
    S = [r for r in rows if r['sacked']]; P = [r for r in rows if not r['sacked']]
    c = C.Counter(r['origin'] for r in S)
    print(f"== {os.path.basename(path)}: dropbacks {n} | sacked {len(S)} ({pct(len(S), n)}): sacker from the edge {pct(c['edge'], len(S))}, inside {pct(c['inside'], len(S))}")
    for lab, g in (('sacked', S), ('pressured, not sacked', P)):
        if g: print(f"   {lab:22s} n {len(g):5d}: at pressure QB depth p50 {q([r['qbx'] for r in g]):+.2f} | deeper tackle vs QB p50 {q([r['tvq'] for r in g]):+.2f} (tackle deeper than the QB {pct(sum(r['tvq'] < 0 for r in g), len(g))}) | QB retreat after p25/50/75 {q([r['retreat'] for r in g], .25):+.2f}/{q([r['retreat'] for r in g]):+.2f}/{q([r['retreat'] for r in g], .75):+.2f}")
