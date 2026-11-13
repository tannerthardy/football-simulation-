# Throw timing against the receiver's own break (BDB 2025 non-PA dropbacks, targeted WR/TE/RB). Break: from 0.6 s after
# the snap, once he is 1+ yd downfield, the first frame where his heading over the next 0.2 s turns > 30 deg from his stem
# heading (the 0.3 s ending 0.2 s earlier) or his speed over the next 0.2 s drops under 65% of his stem speed. Searched
# through ball arrival, so breaks after the release count (negative lead). Lead = release - break (s).
import csv, sys, collections, math
D=sys.argv[1]; weeks=sys.argv[2].split(',')
plays={(r['gameId'],r['playId']) for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE','True','1') and r['playAction'] in ('FALSE','False','0') and r['passResult'] in ('C','I','IN')}
route={}; tgt={}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k=(r['gameId'],r['playId'])
  if r['wasTargettedReceiver'] in ('1','TRUE','True'): tgt[k]=r['nflId']; route[k]=r['routeRan']
L=collections.defaultdict(list); NB=collections.Counter()
for w in weeks:
  P=collections.defaultdict(dict); ev={}; dirn={}; ball={}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k=(r['gameId'],r['playId'])
    if k not in plays: continue
    f=int(r['frameId'])
    if r['event'] not in ('','NA'): ev.setdefault(k,{}).setdefault(r['event'],f)
    if r['displayName']=='football': ball[(k,f)]=float(r['x']); continue
    if r['nflId']!=tgt.get(k): continue
    dirn[k]=r['playDirection']; P[k][f]=(float(r['x']),float(r['y']))
  for k,T in P.items():
    e=ev.get(k,{}); s0=e.get('ball_snap'); th=e.get('pass_forward'); ar=e.get('pass_arrived') or (th+15 if th else None)
    if s0 is None or th is None or (k,s0) not in ball: continue
    sg=1 if dirn[k]=='right' else -1; los=ball[(k,s0)]; rt=route.get(k,'NA')
    def v(a,b):
      A,B=T.get(a),T.get(b)
      return None if not A or not B else ((B[0]-A[0])/((b-a)/10),(B[1]-A[1])/((b-a)/10))
    b=None
    for f in range(s0+6, ar):
      if f not in T or (T[f][0]-los)*sg<1: continue
      st=v(f-5,f-2); nx=v(f,f+2)
      if not st or not nx: continue
      ss=math.hypot(*st)
      if ss<2: continue
      turn=abs(math.degrees(math.atan2(st[0]*nx[1]-st[1]*nx[0], st[0]*nx[0]+st[1]*nx[1])))
      if turn>30 or math.hypot(*nx)<0.65*ss: b=f; break
    if b is None: NB[rt]+=1; continue
    L[rt].append(((th-b)/10, (T[b][0]-los)*sg, (b-s0)/10))
def q(v,p): v=sorted(v); return v[int(p*(len(v)-1))] if v else float('nan')
print('NFL route | n with a break / without | break depth p50 | break time p50 | release - break p25/50/75 | share thrown before the break')
for rt in sorted(L,key=lambda r:-len(L[r])):
  X=L[rt]; print(f"{rt:8s} | {len(X)} / {NB[rt]} | {q([x[1] for x in X],.5):.1f} | {q([x[2] for x in X],.5):.2f} | {q([x[0] for x in X],.25):+.2f}/{q([x[0] for x in X],.5):+.2f}/{q([x[0] for x in X],.75):+.2f} | {sum(x[0]<0 for x in X)/len(X):.2f}")
