"""Summarize open-field traces: long-run tail, and what happened at each
open-field tackle opportunity. usage: summary.py 'out/open-field/X-*.jsonl.gz'"""
import glob, gzip, json, sys, statistics as st
from collections import Counter
rows = [json.loads(l) for f in sorted(glob.glob(sys.argv[1])) for l in gzip.open(f, 'rt') if l.strip()]
rows = [r for r in rows if 'error' not in r]
n = len(rows)
g = [r['gain'] for r in rows]
def pct(p): return 100 * sum(p(x) for x in g) / n
print(f"plays {n}  mean {st.mean(g):.2f} median {st.median(g):.2f}  10+ {pct(lambda x: x>=10):.1f}%  20+ {pct(lambda x: x>=20):.1f}%  40+ {pct(lambda x: x>=40):.1f}%")
opn = [r for r in rows if r['openAt'] is not None]
print(f"reached open field (5+): {len(opn)} ({100*len(opn)/n:.1f}%); of those gain>=20: {sum(r['gain']>=20 for r in opn)}, >=40: {sum(r['gain']>=40 for r in opn)}")
# Conditional: after reaching depth D, how often does it go 40+?
for D in (10, 15, 20, 25):
    k = [x for x in g if x >= D]
    print(f"  P(40+ | {D}+) = {sum(x>=40 for x in k)}/{len(k)}")
long = [r for r in opn if r['gain'] >= 40]
def summarize(sel, label):
    ev = Counter(); holds = []; skip = 0; att = 0
    for r in sel:
        for e in r['events']:
            ev[e['type'] + (':' + e.get('note','') if e.get('note') and e['type'] in ('missed_tackle',) else '')] += 1
        holds += [h for h in r['holds'] if h['open']]
        skip += sum(a['inRange'] for a in r['approach']); att += sum(a['attempts'] for a in r['approach'])
    print(f"\n== {label}: {len(sel)} plays; events per play:", {k: round(v/len(sel), 2) for k, v in sorted(ev.items())})
    if not holds: return
    br = [h for h in holds if 'broke' in h]
    print(f"   open-field holds {len(holds)}, broken {len(br)} ({100*len(br)/len(holds):.0f}%)")
    def q(xs, f): xs = sorted(f(x) for x in xs); return xs[len(xs)//2] if xs else None
    for name, f in [('grip0', lambda h: h['grip0']), ('cap0', lambda h: h['cap0']), ('legs0', lambda h: h['legs0']), ('cosA', lambda h: h['cosA']), ('cs', lambda h: h['cs']), ('ds', lambda h: h['ds']), ('hold0', lambda h: h['hold0']), ('minDist', lambda h: h['minDist'])]:
        print(f"   {name:8s} broken median {q(br, f)}  held median {q([h for h in holds if 'broke' not in h], f)}")
    print("   broken by origin", Counter(h['origin'].split('+')[0] for h in br), " all", Counter(h['origin'].split('+')[0] for h in holds))
    print("   broken fromBehind", sum('behind' in h['origin'] for h in br), "/", len(br), "; assist", sum(h['others'] > 0 for h in br))
    print("   broke after (s) median", q(br, lambda h: h['broke']), " holder state", Counter(h['dSup'] for h in br), " slipping", sum(h['slipping'] for h in br))
summarize(long, '40+ runs')
summarize([r for r in opn if 10 <= r['gain'] < 20], '10-20 runs')
