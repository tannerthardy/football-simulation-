"""Per-throw outcomes by coverage family, summed over an arm's outcomes.mts files.
  python3 -I scripts/diag/census/outcomes_table.py out/census/oc-ARM-*.json [--vs out/census/oc-OTHER-*.json ...]   (first group = arm; files after --vs = comparison arm)
Rows: complete / incomplete / PBU / INT / sack per family; throws = comp+inc+pbu+int (sack, scramble and other excluded)."""
import json, sys, glob
def load(paths):
    t = {}
    for p in paths:
        for fam, d in json.load(open(p)).items():
            for k, v in d.items(): t.setdefault(fam, {}).setdefault(k, 0); t[fam][k] += v
    return t
a = sys.argv[1:]
groups = [[]]
for x in a:
    if x == '--vs': groups.append([])
    else: groups[-1].append(x)
tabs = [load(g) for g in groups]
fams = sorted({f for t in tabs for f in t})
def row(d):
    n = sum(d.get(k, 0) for k in ('comp', 'inc', 'pbu', 'int'))
    if not n: return 'n 0'
    return f"n {n}: comp {d.get('comp',0)/n:.3f} | inc {d.get('inc',0)/n:.3f} | PBU {d.get('pbu',0)/n:.3f} | INT {d.get('int',0)/n:.3f}"
for f in fams + ['ALL']:
    parts = []
    for t in tabs:
        d = {k: sum(t[x].get(k, 0) for x in t) for k in ('comp', 'inc', 'pbu', 'int')} if f == 'ALL' else t.get(f, {})
        parts.append(row(d))
    print(f"{f}: " + '  ||  '.join(parts))
