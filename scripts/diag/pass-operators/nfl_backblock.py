# Non-PA dropbacks: backfield RB/FB (>= 3 yd behind LOS at snap). Contact = a defender within 1.0 yd of him for >= 2 consecutive frames
# before he crosses the LOS / the throw. Report: share with contact, contact duration p50, contact start p50; release = first frame he is
# past the LOS or > 5 yd lateral from snap spot, p50; for backs with no route, contact share.
import csv, sys, collections, math
D=sys.argv[1]; weeks=sys.argv[2].split(',')
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays={(r['gameId'],r['playId']):r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE','True','1') and r['playAction'] in ('FALSE','False','0')}
route=set((r['gameId'],r['playId'],r['nflId']) for r in csv.DictReader(open(f'{D}/player_play.csv')) if r['wasRunningRoute'] in ('1','TRUE','True'))
P=collections.defaultdict(lambda: collections.defaultdict(dict)); ev=collections.defaultdict(dict); dirn={}
for w in weeks:
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k=(r['gameId'],r['playId'])
    if k not in plays or r['nflId'] in ('','NA'): continue
    f=int(r['frameId'])
    for e in ('ball_snap','pass_forward','qb_sack'):
      if r['event']==e and e not in ev[k]: ev[k][e]=f
    dirn[k]=1 if r['playDirection']=='right' else -1
    P[k][r['nflId']][f]=(float(r['x']),float(r['y']),r['club'])
out=collections.defaultdict(list); cnt=collections.Counter()
for k,T in P.items():
  s=ev[k].get('ball_snap'); end=ev[k].get('pass_forward') or ev[k].get('qb_sack')
  if s is None or end is None: continue
  d=dirn[k]; los=float(plays[k]['absoluteYardlineNumber']); off=plays[k]['possessionTeam']
  defs=[tr for i,tr in T.items() if s in tr and tr[s][2]!=off]
  for i,tr in T.items():
    if pos.get(i) not in ('RB','FB') or s not in tr or (los-tr[s][0])*d<3: continue
    rt=k+(i,) in route; grp='route' if rt else 'stays in'
    rel=None
    for g in range(s,end+1):
      if g in tr and ((tr[g][0]-los)*d>0 or abs(tr[g][1]-tr[s][1])>5): rel=g; break
    stop=rel if rel else end
    run=0; best=0; start=None; first=None
    for g in range(s,stop+1):
      if g in tr and any(g in dt and math.hypot(dt[g][0]-tr[g][0],dt[g][1]-tr[g][1])<1.0 for dt in defs):
        run+=1
        if run==2 and first is None: first=(g-1-s)/10
        best=max(best,run)
      else: run=0
    cnt[(grp,'n')]+=1
    if best>=2: cnt[(grp,'contact')]+=1; out[(grp,'dur')].append(best/10); out[(grp,'start')].append(first)
    if rt and rel: out[('route','rel')].append((rel-s)/10)
q=lambda v,p: sorted(v)[int(p*(len(v)-1))] if v else float('nan')
for grp in ('route','stays in'):
  n=cnt[(grp,'n')]; print(f"NFL back {grp:8s} n {n} | contact before release {cnt[(grp,'contact')]/n*100:.0f}% | contact start p50 {q(out[(grp,'start')],.5):.2f} s, longest contact p50 {q(out[(grp,'dur')],.5):.2f} s" + (f" | release (past LOS or 5 yd wide) p50 {q(out[('route','rel')],.5):.2f}" if grp=='route' else ''))
