import json,math,sys,collections
def q(v,p=.5): v=sorted(x for x in v if x is not None); return v[int(p*(len(v)-1))] if v else float('nan')
def brk(tr,cls):
    sp=[math.hypot(x['v']['x'],x['v']['y']) for x in tr]; T=[x['t'] for x in tr]
    if cls=='stop':
        k0=next((i for i,t in enumerate(T) if t>=0.3),0)
        kp=max(range(k0,len(sp)),key=lambda i:sp[i])
        kb=next((i for i in range(kp+1,len(sp)) if sp[i]<0.5*sp[kp]),None)
        return T[kb] if kb is not None else None
    best,kb=0,None
    for i in range(4,len(tr)-4):
        if sp[i-4]<2 or sp[i+4]<2: continue
        h1=math.atan2(tr[i-4]['v']['y'],tr[i-4]['v']['x']); h2=math.atan2(tr[i+4]['v']['y'],tr[i+4]['v']['x'])
        d=abs((h2-h1+math.pi)%(2*math.pi)-math.pi)
        if d>best: best,kb=d,i
    return T[kb] if kb is not None and best>math.radians(25) else None
def lane(p,a,b):
    dx,dy=b['x']-a['x'],b['y']-a['y']; L=dx*dx+dy*dy or 1
    t=((p['x']-a['x'])*dx+(p['y']-a['y'])*dy)/L
    tc=max(0,min(1,t)); return math.hypot(p['x']-(a['x']+tc*dx),p['y']-(a['y']+tc*dy)), t
for f in sys.argv[1:]:
    R=[json.loads(l) for l in open(f)]
    out=collections.defaultdict(list); reac=collections.defaultdict(list); shown=0
    for r in R:
        b=brk(r['track'],r['cls'])
        if b is None or not r['ticks']: continue
        tk=min(r['ticks'],key=lambda x:abs(x['t']-(b-0.3)))
        if abs(tk['t']-(b-0.3))>0.06: continue
        cl=tk['need'] is not None and tk['P']>=tk['need'] and tk['iR']<=tk['risk']
        rows=[x for x in tk['rows'] if x['iPath']>0.001] 
        top=max(rows,key=lambda x:x['iPath']) if rows else (max(tk['rows'],key=lambda x:x['contest']) if tk['rows'] else None)
        o={'clears':cl,'P':tk['P'],'iR':tk['iR'],'pClear':tk['parts'].get('pClear'),'pOpen':tk['parts'].get('pOpen')}
        if top:
            d=next(x for x in tk['defs'] if x['slot']==top['slot']); dirx=r['dir']; rv=tk['recv']
            lt,at=lane(d['p'],tk['qb'],tk['point']); ls,as_=lane(d['seen'],tk['qb'],tk['point'])
            mid=26.65
            o.update(path=bool(rows),slot=d['slot'],role=('man-on-him' if d['man']==r['slot'] else 'man-other' if d['kind']=='man' else 'zone:'+str(d['zone']) if d['kind']=='zone' else d['kind']),
              laneTrue=lt,laneSeen=ls,alongTrue=at,errSeen=math.hypot(d['seen']['x']-d['p']['x'],d['seen']['y']-d['p']['y']),
              depthOver=(d['p']['x']-rv['p']['x'])*dirx, outside=abs(d['p']['y']-mid)-abs(rv['p']['y']-mid), cushion=math.hypot(d['p']['x']-rv['p']['x'],d['p']['y']-rv['p']['y']),
              vAlongRoute=((d['v']['x']*rv['v']['x']+d['v']['y']*rv['v']['y'])/(math.hypot(rv['v']['x'],rv['v']['y']) or 1)),
              vToPoint=((d['v']['x']*(tk['point']['x']-d['p']['x'])+d['v']['y']*(tk['point']['y']-d['p']['y']))/(math.hypot(tk['point']['x']-d['p']['x'],tk['point']['y']-d['p']['y']) or 1)),
              blind=top['blind'],react=top['react'],iPath=top['iPath'],contest=top['contest'])
        out[r['cls']].append(o)
        if shown<0: pass
        # measured reaction on plays thrown to him
        if r['release'] is not None and r['release']<100 and r['catchPt'] and r['decision'] is not None:
            cp=r['catchPt']; rel=r['release']; dec=r['decision']
            atRel={s:min(tr,key=lambda x:abs(x['t']-rel)) for s,tr in r['dtrack'].items() if tr}
            if not atRel: continue
            s=min(atRel,key=lambda s:math.hypot(atRel[s]['p']['x']-cp['x'],atRel[s]['p']['y']-cp['y']))
            tr=r['dtrack'][s]; turn=None
            for x in tr:
                if x['t']<dec-0.5: continue
                ux,uy=cp['x']-x['p']['x'],cp['y']-x['p']['y']; L=math.hypot(ux,uy) or 1; sp=math.hypot(x['v']['x'],x['v']['y'])
                vt=(x['v']['x']*ux+x['v']['y']*uy)/L
                if vt>=1.5 and sp>0 and vt/sp>=0.7: turn=x['t']; break
            reac[r['cls']].append({'dec':dec,'rel':rel,'brk':b,'turn':turn,'already':turn is not None and turn<=dec-0.45})
    print(f"== {f}")
    for c in ('stop','out'):
        O=out[c]; P=[o for o in O if o.get('slot')]
        print(f"  {c}: plays with a break and a tick at -0.3 s: {len(O)}; clears his bar {sum(o['clears'] for o in O)} | P p50 {q([o['P'] for o in O]):.2f} pick risk p50 {q([o['iR'] for o in O]):.3f} pClear {q([o['pClear'] for o in O]):.2f} pOpen {q([o['pOpen'] for o in O]):.2f}")
        print(f"     the defender who sets it (max path pick; else contest): path term {sum(o['path'] for o in P)}/{len(P)}; roles {dict(collections.Counter(o['role'] for o in P).most_common(6))}")
        print(f"     off the lane to the expected catch point: truth p50 {q([o['laneTrue'] for o in P]):.2f} yd (in lane <1 yd: {sum(o['laneTrue']<1 for o in P)}), his picture p50 {q([o['laneSeen'] for o in P]):.2f} (<1: {sum(o['laneSeen']<1 for o in P)}); picture error p50 {q([o['errSeen'] for o in P]):.2f} p90 {q([o['errSeen'] for o in P],.9):.2f}; along the lane p50 {q([o['alongTrue'] for o in P]):.2f}")
        print(f"     leverage vs the receiver (truth): over the top p50 {q([o['depthOver'] for o in P]):+.1f} yd (deeper: {sum(o['depthOver']>0 for o in P)}), outside p50 {q([o['outside'] for o in P]):+.1f} (outside: {sum(o['outside']>0 for o in P)}), cushion p50 {q([o['cushion'] for o in P]):.1f}; momentum along the route p50 {q([o['vAlongRoute'] for o in P]):+.1f} yd/s, toward the catch point p50 {q([o['vToPoint'] for o in P]):+.1f}")
        print(f"     priced: blind p50 {q([o['blind'] for o in P]):.2f} s, reaction p50 {q([o['react'] for o in P]):.2f} s")
        X=reac[c]
        if X:
            T=[x for x in X if x['turn'] is not None]
            print(f"     measured, thrown to him (n {len(X)}, turned {len(T)}; already moving to the spot 0.45 s before the windup {sum(x['already'] for x in X)}): turn - windup p50 {q([x['turn']-x['dec'] for x in T]):+.2f}, turn - release {q([x['turn']-x['rel'] for x in T]):+.2f}, turn - break {q([x['turn']-x['brk'] for x in T]):+.2f}; windup - break {q([x['dec']-x['brk'] for x in X]):+.2f}")
