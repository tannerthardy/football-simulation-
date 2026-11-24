"""Sideline tackle geometry, NFL vs sim, from tackle_geometry.py rows. python3 side.py NFL.rows.jsonl SIM.rows.jsonl"""
import json, sys
def load(p): return [r for r in map(json.loads, open(p)) if not r.get('dropped')]
N, S = load(sys.argv[1]), load(sys.argv[2])
ZONES = [('within 3 yd', lambda r: r['sideline'] < 3), ('3-6 yd (control)', lambda r: 3 <= r['sideline'] < 6), ('6+ yd', lambda r: r['sideline'] >= 6)]
def band(v, edges):
    if v is None: return 'n/a'
    for a, b in zip(edges, edges[1:]):
        if a <= v < b: return f'{a:g}-{b:g}'
    return f'{edges[-1]:g}+'
AP = [0, 30, 56, 80, 110, 145, 181]
FEAT = [('approach angle, deg (0 chase, 180 head-on)', lambda r: band(r['approach'], AP), [f'{a:g}-{b:g}' for a, b in zip(AP, AP[1:])] + ['n/a']),
        ('bearing in the carrier frame', lambda r: r['bearing'], ['ahead', 'level', 'behind']),
        ('tackler side of the carrier', lambda r: 'outside (sideline side)' if r['outside'] else 'inside', ['inside', 'outside (sideline side)']),
        ('closing speed 0.3 s before, yd/s', lambda r: band(r['closing'], [-50, 0, 3, 5, 7, 9]), ['-50-0', '0-3', '3-5', '5-7', '7-9', '9+', 'n/a']),
        ('distance 0.3 s before, yd', lambda r: band(r['dist'], [0, 1.5, 2.5, 3.5, 5]), ['0-1.5', '1.5-2.5', '2.5-3.5', '3.5-5', '5+'])]
miss = lambda r: r['kind'] == 'missed'
pct = lambda a, b: f'{100*a/b:.0f}%' if b else '-'
def cell(v, key, k):
    sub = [r for r in v if key(r) == k]
    m = sum(map(miss, sub))
    return f"{pct(len(sub), len(v))} · {pct(m, len(sub)) if len(sub) >= 8 else '(n%d)' % len(sub)}"
for zn, zf in ZONES[:2]:
    n, s = [r for r in N if zf(r)], [r for r in S if zf(r)]
    sb = sum(r.get('how') == 'broken' for r in s); sr = sum(r.get('how') == 'reach' for r in s)
    print(f"\n### Attempts {zn} of the sideline: NFL n {len(n)}, miss {pct(sum(map(miss,n)),len(n))}; sim n {len(s)}, miss {pct(sum(map(miss,s)),len(s))} (broken hold {pct(sb,len(s))}, reach/grab {pct(sr,len(s))})\n")
    for title, key, keys in FEAT:
        print(f"| {title} | NFL share · miss | sim share · miss | sim broken · reach (share of the bin) |\n|---|---|---|---|")
        for k in keys:
            sub = [r for r in s if key(r) == k]
            if not any(key(r) == k for r in n) and not sub: continue
            br = sum(r.get('how') == 'broken' for r in sub); re_ = sum(r.get('how') == 'reach' for r in sub)
            print(f"| {k} | {cell(n, key, k)} | {cell(s, key, k)} | {pct(br, len(sub))} · {pct(re_, len(sub))} |")
        print()
    dcell = lambda r: r['approach'] is not None and 56 <= r['approach'] < 80 and r['closing'] is not None and 5 <= r['closing'] < 9 and not r['outside'] and r['bearing'] == 'level' and 1.5 <= r['dist'] < 2.5
    dn, ds = [r for r in n if dcell(r)], [r for r in s if dcell(r)]
    print(f"Defense's cell (approach 56-80, closing 5-9, inside, level, 1.5-2.5 yd): NFL {pct(len(dn),len(n))} of attempts (n {len(dn)}, miss {pct(sum(map(miss,dn)),len(dn))}); sim {pct(len(ds),len(s))} (n {len(ds)}, miss {pct(sum(map(miss,ds)),len(ds))}, broken {sum(r.get('how')=='broken' for r in ds)})")
    # where NFL sideline attempts come from: approach x bearing, inside/outside
    print("\n| approach band x bearing (share of attempts) | NFL ahead / level / behind | sim ahead / level / behind |\n|---|---|---|")
    for k in [f'{a:g}-{b:g}' for a, b in zip(AP, AP[1:])]:
        f = lambda v: ' / '.join(pct(sum(1 for r in v if band(r['approach'], AP) == k and r['bearing'] == b), len(v)) for b in ('ahead', 'level', 'behind'))
        print(f"| {k} | {f(n)} | {f(s)} |")
