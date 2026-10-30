"""Draw combo releases (block_climb): release time, distance to installed backer then, whether the climber gets within
1.5 yd before the carrier does, climber speed / upfield speed in the 0.5 s after release, backer motion."""
import json, math, sys
rows=[]
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        st=p['setup']
        if st.get('scheme')!='draw' or p['nullified'] or not p['frames']: continue
        ag=st['agents']; slot={a['slot']:a['i'] for a in ag}; los=st['los']; fr=p['frames']
        dfn=[a['i'] for a in ag if a['team']=='D']; dirx=1 if sum(fr[0]['a'][i][0] for i in dfn)/len(dfn)>los else -1
        car=slot['RB']
        for e in p['events']:
            if e['type']!='block_climb': continue
            a=ag[e['a']]; lb=a['climb'] if a['climb'] in slot else None
            if not lb: continue
            i=e['a']; b=slot[lb]; k=min(len(fr)-1,int(round(e['t']/.1))); k5=min(len(fr)-1,k+5)
            D=lambda q,u,v: math.dist(fr[q]['a'][u][:2],fr[q]['a'][v][:2])
            ka=next((q for q in range(k,len(fr)) if D(q,i,b)<1.5),None); kc=next((q for q in range(len(fr)) if D(q,car,b)<1.5),None)
            sp=[math.hypot(*fr[q]['a'][i][2:4]) for q in range(k,k5+1)]; up=[fr[q]['a'][i][2]*dirx for q in range(k,k5+1)]
            rows.append(dict(t=e['t'],d=D(k,i,b),d5=D(k5,i,b),arr=ka is not None and (kc is None or ka<=kc),ta=ka*.1 if ka is not None else None,
                sp=sum(sp)/len(sp),up=sum(up)/len(up),bvx=fr[k]['a'][b][2]*dirx,bdep=(fr[k]['a'][b][0]-los)*dirx,cx=(fr[k]['a'][car][0]-los)*dirx,
                eng=fr[k5]['a'][i][5] if len(fr[k5]['a'][i])>5 else None))
med=lambda v: (lambda s: round(s[len(s)//2],2) if s else None)(sorted(x for x in v if x is not None))
print(f"releases {len(rows)}: t {med([r['t'] for r in rows])} | dist at release {med([r['d'] for r in rows])} -> +0.5 s {med([r['d5'] for r in rows])} | "
      f"climber speed {med([r['sp'] for r in rows])} (upfield {med([r['up'] for r in rows])}) | backer depth {med([r['bdep'] for r in rows])} vx {med([r['bvx'] for r in rows])} | carrier x {med([r['cx'] for r in rows])}")
print(f"  reaches backer before carrier {sum(r['arr'] for r in rows)/len(rows):.2f}, arrival t {med([r['ta'] for r in rows])}; early (t<2.0) releases {sum(r['t']<2 for r in rows)}, of those arrive first {sum(r['arr'] for r in rows if r['t']<2)}")
