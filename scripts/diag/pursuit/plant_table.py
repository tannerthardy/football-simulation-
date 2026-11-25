"""Bench composite by strategy (plant_bench.mts CSV): mean time / path to reach the point over 4 bodies x 2 turn directions, for arc, the plants and the slow requests, and which is best.
  python3 -I scripts/diag/pursuit/plant_table.py out/pursuit/plant-composite.csv [LABEL=other.csv ...]"""
import csv, sys, collections, statistics as st
def load(p):
    by = collections.defaultdict(lambda: collections.defaultdict(list)); allc = collections.defaultdict(lambda: collections.defaultdict(int))
    for r in csv.DictReader(open(p)):
        k = (float(r['v0']), int(r['dist']), abs(int(r['ang']))); allc[k][r['strategy']] += 1
        if r['reached'] == '1': by[k][r['strategy']].append((float(r['T']), float(r['path'])))
    return by, allc
def row(by, allc, k):
    m = {s: (st.mean(x[0] for x in v), st.mean(x[1] for x in v), len(v)) for s, v in by[k].items() if len(v) >= 4}
    arc = m.get('arc'); pl = {s: v for s, v in m.items() if s.startswith('plant')}; sl = {s: v for s, v in m.items() if s.startswith('slow')}
    bp = min(pl, key=lambda s: pl[s][0]) if pl else None; bs = min(sl, key=lambda s: sl[s][0]) if sl else None
    best = min(m, key=lambda s: m[s][0]) if m else None
    return arc, bp, pl.get(bp), bs, sl.get(bs), best, m.get(best), allc[k]['arc'] - (arc[2] if arc else 0)
out = []
files = [('base', sys.argv[1])] + [tuple(a.split('=', 1)) for a in sys.argv[2:]]
for lab, p in files:
    by, allc = load(p)
    out.append(f'#### {lab}\n'); out.append('| entry | d | off travel | arc: time / path (n of 8 reach it) | best plant: time / path (plant speed) | best slow request: time / path | best overall | plant minus arc (s) |'); out.append('|---|---|---|---|---|---|---|---|')
    for k in sorted(by):
        arc, bp, bpv, bs, bsv, best, bv, miss = row(by, allc, k)
        f = lambda v: f'{v[0]:.2f} / {v[1]:.1f}' if v else '-'
        out.append(f'| {k[0]:g} | {k[1]} | {k[2]} | {f(arc)} ({arc[2] if arc else 0} of 8) | {f(bpv)} ({bp.replace("plant", "") if bp else "-"}) | {f(bsv)} ({bs.replace("slow", "") if bs else "-"}) | {best} {bv[0]:.2f} | {(bpv[0] - arc[0]):+.2f} |' if arc and bpv else f'| {k[0]:g} | {k[1]} | {k[2]} | {f(arc)} ({arc[2] if arc else 0} of 8) | {f(bpv)} | {f(bsv)} | {best} {bv[0]:.2f} | - |')
    out.append('')
print('\n'.join(out))
