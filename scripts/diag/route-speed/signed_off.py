import csv, sys, math, statistics as st, collections as C
D='data/raw/bdb2025/big-data-bowl-data'
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
play={}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['isDropback'] in ('TRUE','True'): play[(r['gameId'],r['playId'])]=r['possessionTeam']
def wrap(a): return (a+180)%360-180
res=C.defaultdict(list)   # (side) -> signed away-from-QB deviation
for w in sys.argv[1:]:
    fr=C.defaultdict(lambda: C.defaultdict(dict)); snap={}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k=(r['gameId'],r['playId'])
        if k not in play or r['displayName']=='football' or r['o'] in ('','NA'): continue
        f=int(r['frameId'])
        if r['event']=='ball_snap': snap.setdefault(k,f)
        fr[k][f][r['nflId']]=(float(r['x']),float(r['y']),float(r['s']),float(r['o']),r['club'])
    for k,F in fr.items():
        if k not in snap: continue
        s0=snap[k]; poss=play[k]
        for f in range(s0+8,s0+35):
            if f not in F: continue
            qb=[a for i,a in F[f].items() if pos.get(i)=='QB' and a[4]==poss]
            if not qb: continue
            q=qb[0]
            for i,a in F[f].items():
                if pos.get(i)!='T' or a[4]!=poss or a[2]>3: continue
                best=None
                for j,b in F[f].items():
                    if b[4]==poss: continue
                    d=math.hypot(a[0]-b[0],a[1]-b[1])
                    if d<1.5 and (best is None or d<best[0]): best=(d,b)
                if not best: continue
                b=best[1]
                brg=math.degrees(math.atan2(b[0]-a[0], b[1]-a[1]))%360       # compass bearing to the man (clockwise from +y)
                d=wrap(brg-a[3])                                              # + : the man is clockwise of his chest
                qbrg=math.degrees(math.atan2(q[0]-a[0], q[1]-a[1]))%360
                qside=wrap(qbrg-brg)                                          # + : the QB is clockwise of the man
                if abs(qside)<20: continue                                    # QB nearly behind the man: no side
                away = -d if qside>0 else d                                   # + : the man sits on the side away from the QB relative to his chest = chest points toward the QB side of him
                lr = 'QB clockwise of man' if qside>0 else 'QB counter-clockwise of man'
                res[lr].append(away)
for lr,v in res.items():
    v=sorted(v); print(f'{lr:30s} n {len(v):5d} signed (chest on the QB side of the man = +) median {v[len(v)//2]:+.1f} mean {st.mean(v):+.1f} p25/p75 {v[len(v)//4]:+.1f}/{v[3*len(v)//4]:+.1f}')
