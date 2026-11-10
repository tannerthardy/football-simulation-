# Non-PA dropbacks. (1) Ground covered from the snap position (straight-line displacement) at 0.5 / 1.0 s, by group:
# WR running a route, outside WR on GO/POST/CORNER, TE running a route, RB running a route, initial pass rusher (DL), CB.
# (2) Outside verticals 1.0-2.0 s: speed / own top speed (max s over weeks 1-3, all plays), and straightness (displacement / path).
# (3) Alignment: WR / TE body-centre depth behind the ball at the snap (yd), by rank from the sideline on each side. Depth is
#     measured from the tracked football's x at the snap frame, not absoluteYardlineNumber (an integer yard line, which
#     adds about 0.45 yd: WR #1 p50 1.27 against 0.82 from the ball).
import csv, sys, collections, math
D=sys.argv[1]; weeks=sys.argv[2].split(',')
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays={(r['gameId'],r['playId']):r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE','True','1') and r['playAction'] in ('FALSE','False','0')}
pp={}
for r in csv.DictReader(open(f'{D}/player_play.csv')): pp[(r['gameId'],r['playId'],r['nflId'])]=r
P=collections.defaultdict(lambda: collections.defaultdict(dict)); ev=collections.defaultdict(dict); dirn={}; top=collections.defaultdict(float); ballx={}
for w in weeks:
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    if r['nflId'] in ('','NA'):
      k=(r['gameId'],r['playId'])
      if k in plays and r['event']=='ball_snap': ballx[k]=float(r['x'])
      continue
    try: top[r['nflId']]=max(top[r['nflId']],float(r['s']))
    except: pass
    k=(r['gameId'],r['playId'])
    if k not in plays: continue
    f=int(r['frameId'])
    for e in ('ball_snap','pass_forward'):
      if r['event']==e and e not in ev[k]: ev[k][e]=f
    dirn[k]=1 if r['playDirection']=='right' else -1
    P[k][r['nflId']][f]=(float(r['x']),float(r['y']),r['club'],float(r['s']))
G=collections.defaultdict(list); S=collections.defaultdict(list); A=collections.defaultdict(list)
for k,T in P.items():
  s=ev[k].get('ball_snap'); fr=ev[k].get('pass_forward')
  if s is None or fr is None: continue
  if k not in ballx: continue
  d=dirn[k]; los=ballx[k]; off=plays[k]['possessionTeam']
  ys=[tr[s][1] for i,tr in T.items() if s in tr and tr[s][2]==off]; cy=sorted(ys)[len(ys)//2] if ys else 26.65
  outside=set()
  for side in (1,-1):
    W=[(i,tr) for i,tr in T.items() if s in tr and tr[s][2]==off and pos.get(i)=='WR' and (tr[s][1]-cy)*side>0]
    W.sort(key=lambda it: -abs(it[1][s][1]-cy))
    for rank,(i,tr) in enumerate(W): A[f'WR #{rank+1} from sideline'].append((los-tr[s][0])*d)
    if W: outside.add(W[0][0])
  for i,tr in T.items():
    if s not in tr: continue
    p=pos.get(i); r=pp.get(k+(i,),{}); route=r.get('routeRan'); running=r.get('wasRunningRoute') in ('1','TRUE','True')
    if tr[s][2]==off and p=='TE': A['TE'].append((los-tr[s][0])*d)
    grp=None
    if tr[s][2]==off:
      if p=='WR' and running: grp='WR route'
      elif p=='TE' and running: grp='TE route'
      elif p=='RB' and running: grp='RB route'
    else:
      if r.get('wasInitialPassRusher') in ('1','TRUE','True') and p in ('DE','DT','NT','OLB'): grp='pass rusher'
      elif p=='CB': grp='CB'
    groups=[grp] if grp else []
    if i in outside and route in ('GO','POST','CORNER'): groups.append('outside vertical')
    for g_ in groups:
      for t in (0.5,1.0):
        g=s+int(t*10)
        if g<=fr and g in tr: G[(g_,t)].append(math.hypot(tr[g][0]-tr[s][0],tr[g][1]-tr[s][1]))
    if i in outside and route in ('GO','POST','CORNER') and s+20<=fr and all(s+h in tr for h in range(10,21)) and top[i]>5:
      sp=[tr[s+h][3] for h in range(10,21)]; S['speed/top'].append(sum(sp)/len(sp)/top[i])
      path=sum(math.hypot(tr[s+h+1][0]-tr[s+h][0],tr[s+h+1][1]-tr[s+h][1]) for h in range(10,20)); disp=math.hypot(tr[s+20][0]-tr[s+10][0],tr[s+20][1]-tr[s+10][1])
      S['straightness'].append(disp/path if path>0 else 1); S['top'].append(top[i])
q=lambda v,p: sorted(v)[int(p*(len(v)-1))] if v else float('nan')
for g_ in ('WR route','outside vertical','TE route','RB route','pass rusher','CB'):
  print(f"NFL {g_:16s} ground from snap p50 at 0.5 s {q(G[(g_,0.5)],.5):.2f} (n {len(G[(g_,0.5)])}) | 1.0 s {q(G[(g_,1.0)],.5):.2f}")
print(f"NFL outside vertical 1.0-2.0 s: speed / own top p25/50/75 {q(S['speed/top'],.25):.2f}/{q(S['speed/top'],.5):.2f}/{q(S['speed/top'],.75):.2f} | straightness p50 {q(S['straightness'],.5):.3f} | top speed p50 {q(S['top'],.5):.2f} yd/s (n {len(S['top'])})")
for a in sorted(A): print(f"NFL align {a:20s} depth behind ball line p25/50/75 {q(A[a],.25):.2f}/{q(A[a],.5):.2f}/{q(A[a],.75):.2f} (n {len(A[a])})")
