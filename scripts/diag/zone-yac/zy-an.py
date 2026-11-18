import json, sys, statistics as S
def q(v, p):
    v = sorted(x for x in v if x is not None)
    return v[min(len(v)-1, int(p*len(v)))] if v else float('nan')
def C2(r): return r['cov'] in ('Cover-2','Cover-2 Sink','cover2')
def row(name, R):
    n = len(R)
    if not n: return
    con = [r for r in R if r['contact']]
    brk = [r for r in con if r['after'] is not None and r['after'] >= 5]
    print(f"{name:14s} n{n:5d} YAC p50 {q([r['yac'] for r in R],.5):5.1f} p75 {q([r['yac'] for r in R],.75):5.1f} mean {S.mean(r['yac'] for r in R):5.2f} | untouched p50 {q([r['untouched'] for r in R],.5):4.1f} p75 {q([r['untouched'] for r in R],.75):4.1f} tfc p50 {q([r['tfc'] for r in con],.5):4.2f} | nocontact {100*(n-len(con))/n:4.1f}% after>=5 {100*len(brk)/max(1,len(con)):4.1f}% oob {100*sum(r['oob'] for r in R)/n:4.1f}% td {100*sum(r.get('td',0) for r in R)/n:4.1f}%")
for f in sys.argv[1:]:
    D = json.load(open(f)); print('==', f)
    row('all', D)
    for p in ('front','level','behind'):
        row(p, [r for r in D if r['pos']==p])
    print(' share', {p: round(100*sum(r['pos']==p for r in D)/len(D)) for p in ('front','level','behind')}, 'ndist p50 %.1f' % q([r['ndist'] for r in D], .5))
    for p in ('front','level','behind'):
        con = [r for r in D if r['pos']==p and r['contact']]
        for lo, hi in ((0,3),(3,5),(5,99)):
            c = [r for r in con if lo <= r['s'] < hi]
            if c: print(f"  {p:6s} s{lo}-{hi} n{len(c):4d} after p50 {q([r['after'] for r in c],.5):4.1f} p75 {q([r['after'] for r in c],.75):4.1f} >=5 {100*sum(r['after']>=5 for r in c)/len(c):4.1f}%")
    row('cover2', [r for r in D if C2(r)])
    for p in ('front','level','behind'):
        row(' c2 '+p, [r for r in D if C2(r) and r['pos']==p])
