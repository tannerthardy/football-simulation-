"""Pair two arms of scripts/diag/paired-plays.ts by play key. On plays where
both arms threw:
  - per band (call family x nearest defender under/deep 8 yd): closing in
    flight in each arm, the mean paired difference and its standard error, and
    how many plays are unchanged;
  - deep man: depth over a 10+ yd target at the release;
  - yards per attempt, paired, by call family and target depth (under 10 / 10+).
usage: paired-compare.py A.jsonl B.jsonl"""
import json, math, sys
load = lambda p: {r['key']: r for r in map(json.loads, open(p)) if not r.get('none')}
A, B = load(sys.argv[1]), load(sys.argv[2])
keys = sorted(set(A) & set(B))
print(f"{sys.argv[1].split('/')[-1]} vs {sys.argv[2].split('/')[-1]}: both threw {len(keys)}, A only {len(set(A)-set(B))}, B only {len(set(B)-set(A))}")
def stat(v):
    n = len(v); m = sum(v) / n; sd = math.sqrt(sum((x - m) ** 2 for x in v) / max(1, n - 1)); return m, sd / math.sqrt(n)
bands = {}
for k in keys:
    a, b = A[k], B[k]
    band = f"{'man' if a['man'] else 'zone'} {'deep' if a['deep'] else 'under'}"
    bands.setdefault(band, []).append((a['d0'] - a['d1'], b['d0'] - b['d1'], a, b))
for band, rows in sorted(bands.items()):
    ca, cb = [r[0] for r in rows], [r[1] for r in rows]; d = [y - x for x, y in zip(ca, cb)]
    m, se = stat(d); same = sum(1 for x in d if abs(x) < 1e-6)
    print(f"  {band:10s} n {len(rows):4d} | closing A {sum(ca)/len(ca):+.2f} B {sum(cb)/len(cb):+.2f} | paired diff {m:+.3f} ± {se:.3f} | unchanged {same}")
dm = [(A[k], B[k]) for k in keys if A[k]['man'] and A[k]['rdeep'] >= 10 and B[k]['rdeep'] >= 10]
if dm:
    oa, ob = sorted(x['over'] for x, _ in dm), sorted(y['over'] for _, y in dm)
    md = lambda v: v[len(v) // 2]
    print(f"  man, target 10+ yd: n {len(dm)} | over at release median A {md(oa):+.2f} B {md(ob):+.2f}")

def show(name, ks):
    d = [B[k]['yds'] - A[k]['yds'] for k in ks]; n = len(d)
    if n < 5: return
    m = sum(d) / n; se = math.sqrt(sum((x - m) ** 2 for x in d) / (n - 1) / n)
    ca = sum(A[k]['comp'] for k in ks) / n; cb = sum(B[k]['comp'] for k in ks) / n
    print(f"  {name:22s} n {n:4d} | YPA {sum(A[k]['yds'] for k in ks)/n:5.2f} -> {sum(B[k]['yds'] for k in ks)/n:5.2f} ({m:+.2f} ± {se:.2f}) | comp {ca:.3f} -> {cb:.3f} | changed {sum(1 for x in d if x)}")
show('all', keys)
for fam in (True, False):
    for deep in (False, True):
        show(f"{'man' if fam else 'zone'} target {'10+' if deep else '<10'}", [k for k in keys if A[k]['man'] == fam and (A[k]['rdeep'] >= 10) == deep])
