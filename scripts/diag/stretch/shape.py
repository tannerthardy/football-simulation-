"""Whole-distribution comparison of run gains with NFL60 (runs 60+ yd from
the goal), by concept and overall: total variation distance over fixed gain
bins (0 = identical shape, 1 = disjoint). A summary for comparing arms, not
a target. usage: shape.py LABEL [LABEL ...] (out/open-field/all/LABEL.jsonl.gz)"""
import gzip, json, sys
ytg = json.load(open('out/mechanics/nfl-ytg.json'))
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
nfl = [r for r in nfl if r.get('kind') == 'run' and r.get('carrier') is not None and ytg.get(r['id'], 0) >= 60]
EDGES = [-99, -2, 0, 1, 2, 3, 4, 6, 10, 20, 40, 999]
NFLC = {'iz': 'INSIDE ZONE', 'oz': 'OUTSIDE ZONE', 'wz': 'OUTSIDE ZONE', 'power': 'POWER', 'counter': 'COUNTER', 'trap': 'TRAP', 'duo': 'MAN'}
def hist(g):
    h = [sum(EDGES[i] <= x < EDGES[i + 1] for x in g) for i in range(len(EDGES) - 1)]
    n = max(1, len(g)); return [v / n for v in h]
def tvd(a, b): return 0.5 * sum(abs(x - y) for x, y in zip(hist(a), hist(b)))
ref_all = [r['yards'] for r in nfl]
for L in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(f'out/open-field/all/{L}.jsonl.gz', 'rt')]
    rows = [r for r in rows if 'error' not in r]
    parts = [f"all {tvd([r['gain'] for r in rows], ref_all):.3f}"]
    for c in sorted({r['concept'] for r in rows}):
        ref = [r['yards'] for r in nfl if (r.get('cell') or {}).get('concept') == NFLC.get(c)]
        parts.append(f"{c} {tvd([r['gain'] for r in rows if r['concept'] == c], ref):.3f}")
    print(f"{L:8s} n {len(rows):5d} | TVD vs NFL60: " + ' '.join(parts))
