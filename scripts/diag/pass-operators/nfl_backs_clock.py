# Non-PA dropbacks. (a) Backfield RB/FB at the snap (behind the LOS by >= 3 yd): ran a route or not; for routes, time from the tag until he
# is 1 yd past his snap depth toward the LOS or 3 yd lateral from his snap spot (leaves the pocket): immediate < 0.8 s, delayed >= 0.8 s.
# (b) Time from the tag to the play's end event for sacks, scrambles and throwaways (incomplete with no target).
import csv, sys, collections, math
D=sys.argv[1]; weeks=sys.argv[2].split(',')
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays={(r['gameId'],r['playId']):r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE','True','1') and r['playAction'] in ('FALSE','False','0')}
pp={}; hast=set()
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  pp[(r['gameId'],r['playId'],r['nflId'])]=r
  if r['wasTargettedReceiver'] in ('1','TRUE','True'): hast.add((r['gameId'],r['playId']))
P=collections.defaultdict(lambda: collections.defaultdict(dict)); ev=collections.defaultdict(dict); dirn={}
for w in weeks:
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k=(r['gameId'],r['playId'])
    if k not in plays: continue
    f=int(r['frameId'])
    if r['event'] not in ('','NA') and r['event'] not in ev[k]: ev[k][r['event']]=f
    dirn[k]=1 if r['playDirection']=='right' else -1
    if r['nflId'] not in ('','NA') and pos.get(r['nflId']) in ('RB','FB'): P[k][r['nflId']][f]=(float(r['x']),float(r['y']))
cnt=collections.Counter(); rel=[]; end=collections.defaultdict(list)
for k,T in P.items():
  s=ev[k].get('ball_snap')
  if s is None: continue
  los=float(plays[k]['absoluteYardlineNumber']); d=dirn[k]
  for i,tr in T.items():
    if s not in tr or (los-tr[s][0])*d<3: continue
    route=pp.get(k+(i,),{}).get('wasRunningRoute') in ('1','TRUE','True')
    if not route: cnt['stays in']+=1; continue
    t=None
    for g in range(s,s+40):
      if g in tr and ((tr[g][0]-tr[s][0])*d>1 or abs(tr[g][1]-tr[s][1])>3): t=(g-s)/10; break
    if t is None: cnt['route, late (>4 s)']+=1; continue
    rel.append(t); cnt['route, immediate (<0.8 s)' if t<0.8 else 'route, delayed (>=0.8 s)']+=1
for k,e in ev.items():
  s=e.get('ball_snap'); r=plays[k]['passResult']
  if s is None: continue
  if r=='S' and 'qb_sack' in e: end['sack'].append((e['qb_sack']-s)/10)
  if r=='R': end['scramble (start)'].append(((e.get('run') or e.get('qb_slide') or e.get('out_of_bounds') or s)-s)/10)
  if r=='I' and k not in hast and 'pass_forward' in e: end['throwaway'].append((e['pass_forward']-s)/10)
  if 'pass_forward' in e: end['all throws'].append((e['pass_forward']-s)/10)
q=lambda v,p: sorted(v)[int(p*(len(v)-1))] if v else float('nan')
n=sum(cnt.values()); print('NFL backfield backs on dropbacks n',n,{k:f'{v/n*100:.1f}%' for k,v in cnt.items()},'| route leave-pocket p50 %.2f'%q(rel,.5))
for k,v in end.items(): print(f'NFL {k:18s} n {len(v):4d} time p25/50/75/90 {q(v,.25):.2f}/{q(v,.5):.2f}/{q(v,.75):.2f}/{q(v,.9):.2f}')
