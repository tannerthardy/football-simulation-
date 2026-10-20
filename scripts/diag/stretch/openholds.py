"""Open-field solo holds (open-field tracer records): how often the initial
hold breaks, by tackler group, approach angle, tackler speed and hold
origin, with the share of those plays that went 20+; and how first open-field
encounters (runner 5+ yd past the line) end.
usage: openholds.py LABEL [LABEL ...]  (out/open-field/all/LABEL.jsonl.gz)"""
import gzip, json, sys, collections
grp = lambda s: 'DL' if s.startswith(('DE','DT','NT')) else 'LB' if s.startswith('LB') else 'DB'
for label in sys.argv[1:]:
    rows=[r for r in map(json.loads, gzip.open(f'out/open-field/all/{label}.jsonl.gz','rt')) if 'error' not in r]
    H=[]; E=[]
    for r in rows:
        for h in r.get('holds') or []: h['gain']=r['gain']; H.append(h)
        for e in (r.get('enc') or []): e['gain']=r['gain']; E.append(e)
    print('==',label,'plays',len(rows),'holds',len(H),'enc',len(E))
    op=[h for h in H if h['open'] and h['others']==0]
    def show(name, sel):
        if not sel: return
        b=sum(1 for h in sel if h.get('broke') is not None)
        print(f"  {name:28s} n {len(sel):4d} broken {100*b/len(sel):5.1f}%  run 20+ {100*sum(1 for h in sel if h['gain']>=20)/len(sel):5.1f}%  grip0 p50 {sorted(h['grip0'] for h in sel)[len(sel)//2]:.2f} ds p50 {sorted(h['ds'] for h in sel)[len(sel)//2]:.1f} cs p50 {sorted(h['cs'] for h in sel)[len(sel)//2]:.1f}")
    show('open solo initial all', op)
    for g in ('DL','LB','DB'): show(' by '+g, [h for h in op if grp(h['d'])==g])
    for nm,f in (('front cosA>.3',lambda h:h['cosA']>.3),('side',lambda h:-.3<=h['cosA']<=.3),('behind cosA<-.3',lambda h:h['cosA']<-.3)):
        show(' '+nm, [h for h in op if f(h)])
    for nm,f in (('ds<3',lambda h:h['ds']<3),('ds 3-6',lambda h:3<=h['ds']<6),('ds 6+',lambda h:h['ds']>=6)):
        show(' '+nm, [h for h in op if f(h)])
    orig=collections.Counter(h['origin'].split('+')[0] for h in op)
    for o,_ in orig.most_common(): show(' origin '+o, [h for h in op if h['origin'].split('+')[0]==o])
    # encounters
    oe=[e for e in E if e['depth']>5 and not e['bond']]
    c=collections.Counter(e['out'] for e in oe)
    print('  open encounters (depth>5, no bond):', len(oe), dict(c))
    for g in ('LB','DB'):
        s=[e for e in oe if grp(e['d'])==g]; c=collections.Counter(e['out'] for e in s)
        print(f"   {g} n {len(s)} ", {k:f"{100*v/len(s):.0f}%" for k,v in c.items()})
