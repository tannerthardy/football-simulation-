# usage: python3 -I nfl_routes.py <bdb dir> 1,2,3 [routes|dd]   (dd: routes-run share per route by down & distance, non-PA / PA)
# Routes by BDB label (non-PA dropbacks, weeks given): every route run by a WR/TE/RB. Depth is downfield of the football's
# x at the snap frame. Break = first frame >= 0.8 s after the snap where the heading turns > 45 deg across 0.4 s (speed
# > 2 before) or speed 0.3 s later < 60% of speed at the frame. Per route: share of routes, share targeted, break depth and
# time; on throws to him: depth, downfield speed and time at the release (pass_forward), release minus break, speed at
# arrival (pass_arrived).
import csv, sys, collections, math
D=sys.argv[1]; weeks=sys.argv[2].split(',')
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
MODE=sys.argv[3] if len(sys.argv)>3 else 'routes'
PLAYS={(r['gameId'],r['playId']):r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE','True','1')}
plays={k for k,r in PLAYS.items() if r['playAction'] in ('FALSE','False','0')}
if MODE=='dd':
  def bucket(r):
    d=int(r['down']); y=int(r['yardsToGo']); s='short' if y<=3 else 'medium' if y<=7 else 'long'
    return '1st' if d==1 else f'2nd {s}' if d==2 else f'3rd/4th {s}'
  C=collections.defaultdict(collections.Counter)
  for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k=(r['gameId'],r['playId'])
    if k not in PLAYS or r['routeRan'] in ('','NA') or r['wasRunningRoute'] not in ('1','TRUE','True'): continue
    p=PLAYS[k]; pa='PA' if p['playAction'] in ('TRUE','True','1') else 'non-PA'
    C[(pa,bucket(p))][r['routeRan']]+=1
  routes=sorted({rt for c in C.values() for rt in c})
  print('dropbacks | bucket | n routes | '+' | '.join(routes))
  for key in sorted(C):
    c=C[key]; n=sum(c.values()); print(f"{key[0]} | {key[1]} | {n} | "+' | '.join(f"{c[rt]/n:.3f}" for rt in routes))
  sys.exit(0)
route={}; tgt={}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k=(r['gameId'],r['playId'])
  if r['routeRan'] not in ('','NA') and r['wasRunningRoute'] in ('1','TRUE','True'): route[(k,r['nflId'])]=r['routeRan']
  if r['wasTargettedReceiver'] in ('1','TRUE','True'): tgt[k]=r['nflId']
RUN=collections.Counter(); TG=collections.Counter(); BR=collections.defaultdict(list); TH=collections.defaultdict(list)
for w in weeks:
  P=collections.defaultdict(dict); ev={}; dirn={}; ball={}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k=(r['gameId'],r['playId'])
    if k not in plays: continue
    f=int(r['frameId'])
    if r['event'] not in ('','NA'): ev.setdefault(k,{}).setdefault(r['event'],f)
    if r['displayName']=='football': ball[(k,f)]=float(r['x']); continue
    if r['nflId'] in ('','NA') or (k,r['nflId']) not in route: continue
    dirn[k]=r['playDirection']; P[k][(r['nflId'],f)]=(float(r['x']),float(r['y']),float(r['s']))
  for k,T in P.items():
    e=ev.get(k,{}); s0=e.get('ball_snap'); th=e.get('pass_forward'); ar=e.get('pass_arrived')
    if s0 is None or (k,s0) not in ball: continue
    sg=1 if dirn[k]=='right' else -1; los=ball[(k,s0)]
    for i in {i for i,_ in T}:
      rt=route[(k,i)]; RUN[rt]+=1; tg=tgt.get(k)==i
      if tg: TG[rt]+=1
      g=lambda f: T.get((i,f))
      def v(f,a,b):
        A,B=g(f+a),g(f+b)
        return None if not A or not B else ((B[0]-A[0])/((b-a)/10),(B[1]-A[1])/((b-a)/10))
      b=None; end=th if th else s0+60
      for f in range(s0+8,end-2):
        v1,v2,v3=v(f,-2,0),v(f,0,2),v(f,2,4)
        if not v1 or not v2 or not v3: continue
        s1=math.hypot(*v1)
        if s1<2: continue
        turn=abs(math.degrees(math.atan2(v1[0]*v2[1]-v1[1]*v2[0], v1[0]*v2[0]+v1[1]*v2[1])))
        if turn>45 or math.hypot(*v3)<0.6*s1: b=f; break
      if b is not None: BR[rt].append(((g(b)[0]-los)*sg,(b-s0)/10))
      if tg and th and g(th):
        vt=v(th,-1,1)
        TH[rt].append(((g(th)[0]-los)*sg, vt[0]*sg if vt else None, (th-s0)/10, ((th-b)/10) if b is not None else None, g(ar)[2] if ar and g(ar) else None))
def q(v,p): v=sorted(x for x in v if x is not None); return v[int(p*(len(v)-1))] if v else float('nan')
tot=sum(RUN.values()); tt=sum(TG.values())
print(f"NFL routes run {tot}, targeted {tt}")
print("route | share of routes | share of targets | target/route | break depth p50 / time p50 | thrown to: depth p50, downfield speed p50, release time p50, release - break p25/50/75, speed at arrival p50")
for rt,n in RUN.most_common():
  B=BR[rt]; X=TH[rt]
  print(f"{rt:8s} | {n/tot:.3f} | {TG[rt]/max(1,tt):.3f} | {TG[rt]/n:.3f} | {q([b[0] for b in B],.5):.1f} / {q([b[1] for b in B],.5):.2f} (n {len(B)}) | {q([x[0] for x in X],.5):.1f}, {q([x[1] for x in X],.5):.2f}, {q([x[2] for x in X],.5):.2f}, {q([x[3] for x in X],.25):+.2f}/{q([x[3] for x in X],.5):+.2f}/{q([x[3] for x in X],.75):+.2f}, {q([x[4] for x in X],.5):.2f} (n {len(X)})")
