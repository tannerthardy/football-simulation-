import json,math,sys,collections
def q(v,p=.5): v=sorted(x for x in v if x is not None); return v[int(p*(len(v)-1))] if v else float('nan')
STOP={'hitch','quick_hitch','curl','hook','comeback','stick'}
def brk(tr,stop):
    if not tr or len(tr)<10: return None
    T=[x[0] for x in tr]; sp=[math.hypot(x[1],x[2]) for x in tr]
    if stop:
        k0=next((i for i,t in enumerate(T) if t>=0.3),0); kp=max(range(k0,len(sp)),key=lambda i:sp[i])
        kb=next((i for i in range(kp+1,len(sp)) if sp[i]<0.5*sp[kp]),None); return T[kb] if kb is not None else None
    best,kb=0,None
    for i in range(4,len(tr)-4):
        if sp[i-4]<2 or sp[i+4]<2: continue
        d=abs((math.atan2(tr[i+4][2],tr[i+4][1])-math.atan2(tr[i-4][2],tr[i-4][1])+math.pi)%(2*math.pi)-math.pi)
        if d>best: best,kb=d,i
    return T[kb] if kb is not None and best>math.radians(25) else None
for arm in sys.argv[1:]:
    print(f"== {arm}")
    print("  level | plays thrown cmp  INT sacks away | TTT p50 | reads reached p50 (mean) | dwell/read p50 p90 | left with <0.2 s eyes-on | read 1 past its step | release - break p50 (n)")
    import os
    for L in ('35','60','88','stare','dart'):
        if not os.path.exists(f'{arm}_{L}.jsonl') or os.path.getsize(f'{arm}_{L}.jsonl')==0: continue
        R=[json.loads(l) for l in open(f'{arm}_{L}.jsonl')]
        thr=[r for r in R if r['release'] and not r['release']['away']]
        reached=[];dw=[];abandon=0;segs=0;stuck=0;rb=[];
        for r in R:
            S=[x for x in r['ticks'] if x['ph']=='set']
            if not S: continue
            reached.append(max(x['idx'] for x in S)+1)
            # segments
            seg=[]; 
            for x in S:
                if not seg or seg[-1]['cur']!=x['cur']: seg.append({'cur':x['cur'],'t0':x['t'],'t1':x['t'],'eyes':0})
                seg[-1]['t1']=x['t']; seg[-1]['eyes']+= 0.05 if (x['ang'] is not None and x['ang']<=15) else 0
            for i,sg in enumerate(seg):
                dw.append(sg['t1']-sg['t0']+0.05)
                if i<len(seg)-1: segs+=1; abandon+= sg['eyes']<0.2
            due=(r['snapAt'] or 0)+(r['dropTime'] or 0)+(r['stride'] or 0)+0.05
            if any(x['idx']==0 and x['t']>due for x in S): stuck+=1
            if r['release'] and r['release']['slot'] and not r['release']['away']:
                b=brk(r['track'],r['release']['route'] in STOP)
                if b is not None: rb.append(r['release']['t']-b)
        n=len(R); nS=len(reached)
        print(f"   {L:>5s} | {n:4d} {len(thr):5d} {sum(r['cmp'] for r in R):4d} {sum(r['int'] for r in R):3d} {sum(r['sack'] for r in R):4d} {sum(1 for r in R if r['release'] and r['release']['away']):4d} | {q([r['release']['t'] for r in thr]):.2f} | {q(reached):.0f} ({sum(reached)/max(1,nS):.2f}) | {q(dw):.2f} {q(dw,.9):.2f} | {abandon}/{segs} ({abandon/max(1,segs):.0%}) | {stuck}/{nS} ({stuck/max(1,nS):.0%}) | {q(rb):+.2f} ({len(rb)})")
