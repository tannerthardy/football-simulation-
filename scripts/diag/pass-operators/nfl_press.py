# Non-PA dropbacks: outside WR (widest each side) with the nearest CB within 2.5 yd depth and 2 yd lateral at the snap (pressed).
# Contact = CB within 1.2 yd for >= 2 consecutive frames in the first 1.5 s; longest contact; WR speed at 0.5/1.0 s; |lateral| at 1.0 s.
import csv, sys, collections, math
D=sys.argv[1]; weeks=sys.argv[2].split(',')
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays={(r['gameId'],r['playId']):r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE','True','1') and r['playAction'] in ('FALSE','False','0')}
P=collections.defaultdict(lambda: collections.defaultdict(dict)); snap={}
for w in weeks:
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k=(r['gameId'],r['playId'])
    if k not in plays or r['nflId'] in ('','NA'): continue
    f=int(r['frameId'])
    if r['event']=='ball_snap' and k not in snap: snap[k]=f
    P[k][r['nflId']][f]=(float(r['x']),float(r['y']),r['club'],float(r['s']))
out=collections.defaultdict(list); n=0; c=0
for k,T in P.items():
  s=snap.get(k)
  if s is None: continue
  off=plays[k]['possessionTeam']; ys=[tr[s][1] for tr in T.values() if s in tr and tr[s][2]==off]
  if not ys: continue
  cy=sorted(ys)[len(ys)//2]
  for side in (1,-1):
    W=[(i,tr) for i,tr in T.items() if s in tr and tr[s][2]==off and pos.get(i)=='WR' and (tr[s][1]-cy)*side>0]
    if not W: continue
    i,tr=max(W,key=lambda it: abs(it[1][s][1]-cy))
    cbs=[t2 for j,t2 in T.items() if s in t2 and t2[s][2]!=off and pos.get(j)=='CB']
    if not cbs: continue
    cb=min(cbs,key=lambda t2: math.hypot(t2[s][0]-tr[s][0],t2[s][1]-tr[s][1]))
    if not (abs(cb[s][0]-tr[s][0])<2.5 and abs(cb[s][1]-tr[s][1])<2): continue
    n+=1; run=best=0; out['off0'].append(abs(cb[s][1]-tr[s][1]))
    for g in range(s,s+16):
      if g in tr and g in cb and math.hypot(cb[g][0]-tr[g][0],cb[g][1]-tr[g][1])<1.2: run+=1; best=max(best,run)
      else: run=0
    if best>=2: c+=1; out['dur'].append(best/10)
    for t in (0.5,1.0):
      g=s+int(t*10)
      if g in tr: out[f'v{t}'].append(tr[g][3])
    if s+10 in tr: out['lat'].append(abs(tr[s+10][1]-tr[s][1]))
    for t in (0.3,0.6,1.0):
      g=s+int(t*10)
      if g in cb and s in cb and g in tr: out[f'cbx{t}'].append(abs(cb[g][0]-cb[s][0])); out[f'gap{t}'].append(abs(cb[g][0]-tr[g][0]))
q=lambda v,p: sorted(v)[int(p*(len(v)-1))] if v else float('nan')
print(f"NFL pressed CB lateral offset from WR at snap p25/50/75 {q(out['off0'],.25):.2f}/{q(out['off0'],.5):.2f}/{q(out['off0'],.75):.2f}"); print(f"NFL pressed CB ground given at 0.3/0.6/1.0 s p50 {q(out['cbx0.3'],.5):.2f}/{q(out['cbx0.6'],.5):.2f}/{q(out['cbx1.0'],.5):.2f} | depth gap CB-WR p50 {q(out['gap0.3'],.5):.2f}/{q(out['gap0.6'],.5):.2f}/{q(out['gap1.0'],.5):.2f}"); print(f"NFL pressed outside WR n {n} | contact {c/n*100:.0f}% longest p50 {q(out['dur'],.5):.2f} s (p75 {q(out['dur'],.75):.2f}) | WR speed at 0.5/1.0 s p50 {q(out['v0.5'],.5):.2f}/{q(out['v1.0'],.5):.2f} | lateral at 1.0 s p50 {q(out['lat'],.5):.2f}")
