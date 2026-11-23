"""Underneath zone seats (hook, curl_flat, hole), non-PA dropbacks: depth by the deepest receiver within 6 yd laterally and short of 12 yd, at 1.5 / 2.0 / 2.5 s (pre-throw), NFL vs sim, flat-seat rows.
 usage: python3 -I scripts/diag/flat-seat/zone_relation.py NFL.jsonl SIM.jsonl [...]"""
import json, sys, math, glob
def q(v,f=.5):
    v=sorted(v); return v[int(f*(len(v)-1))] if v else float('nan')
for lab, P in (('NFL', [sys.argv[1]]), ('sim', sys.argv[2:])):
    A=[r for p in P for l in open(p) for r in [json.loads(l)] if not r['pa'] and r['cls'] in ('hook','curl_flat','hole')]
    print(f'\n{lab}: underneath zone (hook, curl_flat, hole) depth by the deepest receiver within 6 yd laterally and short of 12 yd (rows: that receiver depth band)')
    for t in (1.5, 2.0, 2.5):
        i=int(t*10); B={}
        for r in A:
            if not (r['throw'] is None or r['throw']>t) or r['d'][i] is None: continue
            me=r['d'][i]; R=[x[i] for x in r['rec'] if x[i] is not None]
            F=[p for p in R if abs(p[1]-me[1])<=6 and p[0]<12]
            k='none' if not F else min(10, int(max(p[0] for p in F)//2*2)) if max(p[0] for p in F)>=0 else -2
            B.setdefault(k,[]).append(me[0])
        print(f'  t {t}: ' + ' | '.join(f"{k if k=='none' else str(k)+'+'}: {q(v):.1f} (n {len(v)})" for k,v in sorted(B.items(), key=lambda kv: (kv[0]=='none', kv[0] if kv[0]!='none' else 0))))
