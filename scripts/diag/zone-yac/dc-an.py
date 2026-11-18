import json, sys, statistics as S, collections
def q(v, p):
    v = sorted(x for x in v if x is not None); return v[min(len(v)-1, int(p*len(v)))] if v else float('nan')
def fam(c):
    c = c.lower()
    return 'c2' if 'cover-2' in c or c == 'cover2' else 'c3' if 'cover-3' in c or c == 'cover3' else 'c4' if 'quarters' in c or c == 'cover4' else 'c6'
def tab(name, R):
    if not R: return
    v = lambda i: [r['v'][i] for r in R]
    print(f"{name:12s} n{len(R):4d} air {q([r['air'] for r in R],.5):4.1f} flight {q([r['flight'] for r in R],.5):4.2f} d0 {q([r['d0'] for r in R],.5):4.1f} depth {q([r['depth'] for r in R],.5):4.1f} | back@rel {q([r['back'] for r in R],.5):4.1f} spd {q([r['speed'] for r in R],.5):4.1f} faceLOS<60 {100*sum((r['faceLOS'] or 999)<60 for r in R)/len(R):3.0f}% >120 {100*sum((r['faceLOS'] or 0)>120 for r in R)/len(R):3.0f}% | toward 0/.4/.8/1.2: {q(v(0),.5):5.1f} {q(v(1),.5):5.1f} {q(v(2),.5):5.1f} {q(v(3),.5):5.1f} (p75 .8 {q(v(2),.75):4.1f}) | dArr p25/50 {q([r['dArr'] for r in R],.25):4.1f} {q([r['dArr'] for r in R],.5):4.1f} within2 {100*sum(r['dArr']<2 for r in R)/len(R):3.0f}% | comp {100*sum(r['caught'] for r in R)/len(R):3.0f}% int {100*sum(r['int'] for r in R)/len(R):3.1f}%")
for f in sys.argv[1:]:
    D = json.load(open(f)); print('==', f)
    tab('all', D)
    for fm in ('c2', 'c3', 'c4', 'c6'): tab(fm, [r for r in D if fam(r['coverage']) == fm])
    for lo, hi in ((0, 6), (6, 12), (12, 99)): tab(f'd0 {lo}-{hi}', [r for r in D if lo <= r['d0'] < hi])
    tab('facing QB', [r for r in D if (r['faceLOS'] or 999) < 60]); tab('turned', [r for r in D if (r['faceLOS'] or 0) >= 60])
    if 'tags' in D[0]:
        c = collections.Counter(t for r in D for t in r['tags']); print(' tags@rel', c.most_common(10))
        c = collections.Counter(r['kindArr'] for r in D); print(' kind@arr', c.most_common(6))
