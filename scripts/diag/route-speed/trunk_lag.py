# How late the NFL tackle's shoulders (`o`) follow the bearing to the man he is blocking, BDB 2025 drop-backs.
# Runs of at least 1.2 s where a tackle has the same nearest defender within 1.5 yd (snap + 0.5 s onward). For each lag L (frames, 10 Hz) the unsigned error
# |wrap(o(t) - bearing(t - L))|; the lag with the smallest median error is the delay of the shoulders behind the man. Also the median |d bearing / dt|.
#   python3 -I scripts/diag/route-speed/trunk_lag.py WEEK [WEEK ...]      (from the repo root)
import csv, sys, math, collections as C
D='data/raw/bdb2025/big-data-bowl-data'
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
play={}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['isDropback'] in ('TRUE','True'): play[(r['gameId'],r['playId'])]=r['possessionTeam']
wrap=lambda a:(a+180)%360-180
err=C.defaultdict(list); rate=[]
for w in sys.argv[1:]:
    fr=C.defaultdict(lambda: C.defaultdict(dict)); snap={}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k=(r['gameId'],r['playId'])
        if k not in play or r['displayName']=='football' or r['o'] in ('','NA'): continue
        f=int(r['frameId'])
        if r['event']=='ball_snap': snap.setdefault(k,f)
        fr[k][f][r['nflId']]=(float(r['x']),float(r['y']),float(r['o']),r['club'])
    for k,F in fr.items():
        if k not in snap: continue
        s0=snap[k]; poss=play[k]
        for i in {i for f in range(s0+5,s0+40) if f in F for i,a in F[f].items() if pos.get(i)=='T' and a[3]==poss}:
            run=[]
            def flush():
                if len(run)>=12:
                    ob=[(o,b) for o,b in run]
                    for L in range(0,8):
                        for t in range(L,len(ob)): err[L].append(abs(wrap(ob[t][0]-ob[t-L][1])))
                    for t in range(1,len(ob)): rate.append(abs(wrap(ob[t][1]-ob[t-1][1]))*10)
            last=None
            for f in range(s0+5,s0+40):
                a=F.get(f,{}).get(i)
                if not a: flush(); run=[]; last=None; continue
                best=None
                for j,b in F[f].items():
                    if b[3]==poss: continue
                    d=math.hypot(a[0]-b[0],a[1]-b[1])
                    if d<1.5 and (best is None or d<best[0]): best=(d,j,b)
                if not best or (last is not None and best[1]!=last): flush(); run=[]; last=best[1] if best else None; 
                if best:
                    last=best[1]; b=best[2]; run.append((a[2], math.degrees(math.atan2(b[0]-a[0], b[1]-a[1]))%360))
            flush()
med=lambda v: sorted(v)[len(v)//2]
for L in range(0,8): print(f'lag {L*0.1:.1f} s: median |o(t) - bearing(t-lag)| {med(err[L]):5.1f} deg  (n {len(err[L])})')
print('median |d bearing/dt| deg/s', round(med(rate),1), 'p90', round(sorted(rate)[int(.9*len(rate))],1), 'n', len(rate))
