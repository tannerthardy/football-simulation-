"""Cover 2/6 10-15 yd window and throws, two arms (c26-window.mts output dirs).  python3 scripts/diag/coverage/c26_arms.py w0 w1"""
import json, sys, statistics as st, collections as C
for d in sys.argv[1:]:
    rows = [json.loads(l) for l in open(f'out/diag/coverage/{d}/all.jsonl')]
    th = [json.loads(l) for l in open(f'out/diag/coverage/{d}/throws.jsonl')]
    print(f'== {d}')
    for g, fams in (('Cover-2', ('cover2', 'tampa2')), ('Cover-6', ('cover6',))):
        for k in ('fix', 'rel'):
            v = [r for r in rows if r['fam'] in fams and r['kind'] == k]
            print(f'  {g} {k} 10-15 yd wide share: {sum(r["wide"] for r in v)}/{len(v)} = {sum(r["wide"] for r in v)/max(1,len(v)):.3f}')
        T = [t for t in th if t['fam'] in fams]
        def summ(lab, V):
            if not V: return
            comp = [t for t in V if t['outcome'] not in ('incomplete', 'interception')]
            print(f'    {lab}: throws {len(V)}, complete {len(comp)/len(V):.2f}, yards/att {sum(t["yards"] for t in V)/len(V):.1f}, int {sum(t["outcome"]=="interception" for t in V)}')
        summ('all throws', T)
        summ('#1 at 8+ yd', [t for t in T if t['ref'][1:] == '1' and t['depth'] >= 8])
        summ('flat / short outside (depth < 5, within 15 of the sideline, not #1)', [t for t in T if t['depth'] < 5 and t['w'] < 15 and t['ref'][1:] != '1'])
        summ('#1 short (< 8 yd)', [t for t in T if t['ref'][1:] == '1' and t['depth'] < 8])
