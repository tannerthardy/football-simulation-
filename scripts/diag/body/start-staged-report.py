"""Paired report for start-staged.ts outputs. Usage: python3 -I start-staged-report.py OFF.jsonl ON.jsonl [by=cov|concept]"""
import json, math, statistics as S, sys, collections
def L(p): return {r['k']: r for r in map(json.loads, open(p))}
a, b = L(sys.argv[1]), L(sys.argv[2]); ks = sorted(set(a) & set(b)); n = len(ks)
def rate(d, f): return sum(1 for k in ks if f(d[k])) / n
print('plays', n)
for lab, f in [('complete', lambda r: r['completed']), ('sacked', lambda r: r['sacked']), ('pressured', lambda r: r['pressured']), ('pbu', lambda r: r['pbu']), ('int', lambda r: r['int']), ('td', lambda r: r['td'])]:
    pa, pb = rate(a, f), rate(b, f); disc = sum(1 for k in ks if f(a[k]) != f(b[k]))
    se = math.sqrt(max(disc, 1)) / n
    print(f'{lab:10s} off {pa:.3f} on {pb:.3f} d {pb-pa:+.3f} (paired se ~{se:.3f}, discordant {disc})')
sp = [k for k in ks if a[k]['pressured']]; print('sack | pressured: off', round(sum(a[k]['sacked'] for k in ks) / max(sum(a[k]['pressured'] for k in ks), 1), 3), 'on', round(sum(b[k]['sacked'] for k in ks) / max(sum(b[k]['pressured'] for k in ks), 1), 3))
def pm(key):
    v = [(a[k][key], b[k][key]) for k in ks if a[k].get(key) is not None and b[k].get(key) is not None]
    if not v: return
    d = [y - x for x, y in v]; print(f'{key:8s} off {S.mean(x for x,_ in v):.3f} on {S.mean(y for _,y in v):.3f} paired {S.mean(d):+.3f} se {S.stdev(d)/math.sqrt(len(d)):.3f} n {len(d)}')
for key in ('ttt', 'sepCatch', 'sep10', 'sep20', 'yards'): pm(key)
if len(sys.argv) > 3:
    idx = {'cov': 2, 'concept': 1}[sys.argv[3]]
    g = collections.defaultdict(list)
    for k in ks: g[k.split('|')[idx]].append(k)
    for c, kk in g.items():
        f = lambda d, fn: sum(1 for k in kk if fn(d[k])) / len(kk)
        print(f'  {c:14s} n={len(kk):4d} compl {f(a,lambda r:r["completed"]):.3f}->{f(b,lambda r:r["completed"]):.3f} sack {f(a,lambda r:r["sacked"]):.3f}->{f(b,lambda r:r["sacked"]):.3f} press {f(a,lambda r:r["pressured"]):.3f}->{f(b,lambda r:r["pressured"]):.3f}')
