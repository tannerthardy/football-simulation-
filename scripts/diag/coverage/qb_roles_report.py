# Summary of qb-roles.mts rows: coverer by technique (relation at the receiver break, response, separation) and
# drivers within 2.5 yd of the catch point at the arrival. python3 scripts/diag/coverage/qb_roles_report.py out/diag/coverage/qb-roles-*.jsonl
import sys,json,collections,glob,statistics as st
rows=[json.loads(l) for f in sys.argv[1:] for l in open(f)]
def grp(lab):
    if not lab: return '?'
    k,t=(lab.split('|')+[''])[:2]
    kind,_,z=k.partition(':')
    zg=''
    for p in ['hook_mid','hook','curl_flat','flat','deep_third','deep_half','deep_mid','quarter','robber','hole','deep']:
        if z.startswith(p): zg=p; break
    if kind=='zone' and t.startswith('man'): t='man-carry'
    tg = 'carry' if 'carry' in t else t or '-'
    return f"{kind}{(':'+zg) if zg else ''} {tg}"
def q(v,p):
    v=sorted(x for x in v if x is not None)
    return round(v[min(len(v)-1,int(p*(len(v)-1)))],2) if v else None
print(f"throws {len(rows)}")
G=collections.defaultdict(list)
for r in rows:
    if r['coverer']['lab'].startswith(('rush','blitz')): continue
    G[grp(r['coverer']['lab'])].append(r)
print("coverer group | n | break before rel p50 | cushion/lev/sep at break p50 | lag p50/p90 (none%) | sep rel p50 | sep arr p50 | comp")
for k,v in sorted(G.items(), key=lambda x:-len(x[1])):
    if len(v)<8: continue
    b=[r for r in v if r['atBreak']]
    alr=sum(1 for r in b if r.get('already')); stops=sum(1 for r in b if r.get('brkKind')=='stop')
    lags=[r['lag'] for r in b if not r.get('already')]; none=sum(1 for x in lags if x is None)
    comp=sum(1 for r in v if r['outcome']!='incomplete')/len(v)
    print(f"{k:28s} {len(v):4d} | {q([r['brk'] for r in b],.5)} | {q([r['atBreak']['cushion'] for r in b],.5)} / {q([r['atBreak']['lev'] for r in b],.5)} / {q([r['atBreak']['sep'] for r in b],.5)} | brk {len(b)} stop {stops} already {alr} lag {q(lags,.5)}/{q(lags,.9)} (none {none}) | {q([r['atRel']['sep'] for r in v],.5)} | {q([r['atArr']['sep'] for r in v],.5)} | {comp:.2f}")
print()
D=collections.defaultdict(list); pre=collections.Counter(); nthrow=len(rows)
for r in rows:
    for d in r['drivers']:
        if d['dArr']>2.5: continue
        D[(grp(d['lab']).split(' ')[0], d['via'], d['src'])].append(d)
        if d['start']<0: pre[grp(d['lab']).split(' ')[0]]+=1
print("drivers within 2.5 yd of the catch point at the arrival (not the coverer): group | via | cue | n (per 100 throws) | start-rel p10/p50/p90 | dist at start p50/p90 | dist at arrival p50")
for k,v in sorted(D.items(), key=lambda x:-len(x[1])):
    if len(v)<5: continue
    print(f"{k[0]:16s} {k[1]:10s} {str(k[2]):5s} {len(v):4d} ({100*len(v)/nthrow:.1f}) | {q([d['start'] for d in v],.1)}/{q([d['start'] for d in v],.5)}/{q([d['start'] for d in v],.9)} | {q([d['d0'] for d in v],.5)}/{q([d['d0'] for d in v],.9)} | {q([d['dArr'] for d in v],.5)}")
print("pre-release breaks among those:", dict(pre))
