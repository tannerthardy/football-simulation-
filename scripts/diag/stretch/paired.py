"""Paired outcome transitions between two lab arms run on the same cases
(same concept/direction/formation/look/roster/seed ids). For each threshold
(gain >= T, and gain < 0), counts plays reaching it in both arms, only in A,
only in B, or neither, and the exact two-sided McNemar (binomial) p-value on
the discordant pairs. Unmatched ids are counted, not dropped silently.
usage: paired.py ARM_A ARM_B [--concept C] [--thresholds 4,10,20,40]"""
import gzip, json, math, sys
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
A, B = sys.argv[1], sys.argv[2]
concept = opt('--concept'); T = [float(x) for x in opt('--thresholds', '4,10,20,40').split(',')]
load = lambda l: {r['id']: r['gain'] for r in map(json.loads, gzip.open(f'out/open-field/all/{l}.jsonl.gz', 'rt'))
                  if 'error' not in r and (concept is None or r['concept'] == concept)}
a, b = load(A), load(B)
ids = sorted(set(a) & set(b))
def mcnemar(x, y):
    n = x + y
    if n == 0: return 1.0
    k = min(x, y)
    p = sum(math.comb(n, i) for i in range(0, k + 1)) / 2 ** n
    return min(1.0, 2 * p)
print(f"{A} vs {B}{' ' + concept if concept else ''}: paired {len(ids)} (only in {A}: {len(set(a) - set(b))}, only in {B}: {len(set(b) - set(a))})")
for name, f in [(f'>= {t:g}', (lambda t: lambda g: g >= t)(t)) for t in T] + [('< 0', lambda g: g < 0)]:
    both = sum(1 for i in ids if f(a[i]) and f(b[i])); oa = sum(1 for i in ids if f(a[i]) and not f(b[i]))
    ob = sum(1 for i in ids if f(b[i]) and not f(a[i]))
    print(f"  {name:6s}: {A} {both + oa:4d} -> {B} {both + ob:4d} | both {both}, only {A} {oa}, only {B} {ob} | McNemar exact p {mcnemar(oa, ob):.3f}")
