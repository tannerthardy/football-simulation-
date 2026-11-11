# Task 1 measurement, NFL side (BDB 2025, non-PA dropbacks, weeks given). Depth from the football's x at the snap.
# A cut per route (all routes run); B throw by air distance x pressure; C time as a cost (plays with a 10-15 yd break vs
# quick plays); D interception origins. Speeds from the tracking 's'; heading from 0.2-0.3 s displacement windows.
import csv, sys, collections, math, json
D=sys.argv[1]; weeks=sys.argv[2].split(','); OUT=open(sys.argv[3],'w')
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays={(r['gameId'],r['playId']):r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE','True','1') and r['playAction'] in ('FALSE','False','0')}
route={}; tgt={}; intc={}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k=(r['gameId'],r['playId'])
  if r['routeRan'] not in ('','NA') and r['wasRunningRoute'] in ('1','TRUE','True'): route[(k,r['nflId'])]=r['routeRan']
  if r['wasTargettedReceiver'] in ('1','TRUE','True'): tgt[k]=r['nflId']
  if r['hadInterception'] in ('1','TRUE','True'): intc[k]=r['nflId']
for w in weeks:
  P=collections.defaultdict(dict); ev={}; dirn={}; ball={}; club={}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k=(r['gameId'],r['playId'])
    if k not in plays: continue
    f=int(r['frameId'])
    if r['event'] not in ('','NA'): ev.setdefault(k,{}).setdefault(r['event'],f)
    if r['displayName']=='football': ball[(k,f)]=(float(r['x']),float(r['y'])); continue
    if r['nflId'] in ('','NA'): continue
    dirn[k]=r['playDirection']; club[(k,r['nflId'])]=r['club']
    P[k][(r['nflId'],f)]=(float(r['x']),float(r['y']),float(r['s']))
  for k,T in P.items():
    e=ev.get(k,{}); s0=e.get('ball_snap'); p=plays[k]
    if s0 is None or (k,s0) not in ball: continue
    sg=1 if dirn[k]=='right' else -1; los=ball[(k,s0)][0]; off=p['possessionTeam']
    ids={i for i,_ in T}; qb=next((i for i in ids if pos.get(i)=='QB'),None)
    th=e.get('pass_forward'); ar=e.get('pass_arrived') or e.get('pass_outcome_caught') or e.get('pass_outcome_incomplete') or e.get('pass_outcome_interception')
    sack=('qb_sack' in e) or ('qb_strip_sack' in e)
    g=lambda i,f: T.get((i,f))
    def disp(i,a,b):
      A,B=g(i,a),g(i,b)
      return None if not A or not B else (B[0]-A[0],B[1]-A[1])
    end=th if th else (e.get('qb_sack') or s0+50)
    # A: cuts on every route
    breaks=[]
    for i in ids:
      if (k,i) not in route: continue
      b=None; lim=(ar or end)
      for f in range(s0+6,lim):
        A_=g(i,f)
        if not A_ or (A_[0]-los)*sg<1: continue
        st=disp(i,f-5,f-2); nx=disp(i,f,f+2)
        if not st or not nx: continue
        ss=math.hypot(*st)/0.3
        if ss<2: continue
        turn=abs(math.degrees(math.atan2(st[0]*nx[1]-st[1]*nx[0], st[0]*nx[0]+st[1]*nx[1])))
        if turn>30 or math.hypot(*nx)/0.2<0.65*ss: b=f; break
      if b is None: continue
      sp=lambda f: g(i,f)[2] if g(i,f) else None
      st=disp(i,b-5,b-2); af=disp(i,b,b+4)
      hc=abs(math.degrees(math.atan2(st[0]*af[1]-st[1]*af[0], st[0]*af[0]+st[1]*af[1]))) if st and af else None
      win=[(f,sp(f)) for f in range(b-10,b+1) if sp(f) is not None]
      pk=max(win,key=lambda x:x[1]) if win else None
      mins=[sp(f) for f in range(b-2,b+5) if sp(f) is not None]
      depth=(g(i,b)[0]-los)*sg
      breaks.append(depth)
      OUT.write(json.dumps({'k':'cut','route':route[(k,i)],'depth':depth,'in':sp(b-4),'min':min(mins) if mins else None,'p4':sp(b+4),'p8':sp(b+8),'turn':hc,'gear_t':(b-pk[0])/10 if pk else None,'gear_drop':(pk[1]-sp(b)) if pk and sp(b) is not None else None})+'\n')
    # C: time as a cost
    kind='deep-break' if any(10<=d<=15 for d in breaks) else 'quick' if breaks and max(breaks)<=6 else 'other'
    press=None
    if qb and th and g(qb,th):
      qx,qy,_=g(qb,th); press=any(club.get((k,j))!=off and g(j,th) and math.hypot(g(j,th)[0]-qx,g(j,th)[1]-qy)<2 for j in ids)
    OUT.write(json.dumps({'k':'play','kind':kind,'ttt':(th-s0)/10 if th else None,'sack':sack,'press':press,'res':p['passResult']})+'\n')
    # B: the throw
    t_=tgt.get(k)
    if th and ar and t_ and (k,th) in ball and (k,ar) in ball and g(t_,ar):
      b0,b1=ball[(k,th)],ball[(k,ar)]; air=math.hypot(b1[0]-b0[0],b1[1]-b0[1]); fl=(ar-th)/10
      tp=g(t_,ar); depth=(tp[0]-los)*sg
      OUT.write(json.dumps({'k':'throw','air':air,'depth':depth,'flight':fl,'speed':air/fl if fl>0 else None,'place':math.hypot(b1[0]-tp[0],b1[1]-tp[1]),'press':press,'res':p['passResult']})+'\n')
    # D: interceptions
    if p['passResult']=='IN' and th:
      ic=intc.get(k); fin=e.get('pass_outcome_interception') or ar
      # ball path change during flight
      defl=None
      for f in range(th+2,(fin or th+20)-3):
        a,b_,c=ball.get((k,f-2)),ball.get((k,f)),ball.get((k,f+2))
        if not a or not b_ or not c: continue
        v1=(b_[0]-a[0],b_[1]-a[1]); v2=(c[0]-b_[0],c[1]-b_[1])
        if math.hypot(*v1)<0.2 or math.hypot(*v2)<0.05: continue
        turn=abs(math.degrees(math.atan2(v1[0]*v2[1]-v1[1]*v2[0], v1[0]*v2[0]+v1[1]*v2[1])))
        if turn>25 or math.hypot(*v2)<0.5*math.hypot(*v1): defl=f; break
      near=None; who=None
      if defl:
        bb=ball[(k,defl)]; cand=[(math.hypot(g(j,defl)[0]-bb[0],g(j,defl)[1]-bb[1]),j) for j in ids if g(j,defl)]
        if cand: near=min(cand); who='receiver' if near[1]==t_ else ('interceptor' if near[1]==ic else 'defender' if club.get((k,near[1]))!=off else 'offense')
        if who=='interceptor': defl=None
      dI=cI=None
      if ic and t_ and g(ic,th) and ar and g(t_,ar):
        tp=g(t_,ar); q=g(ic,th); dI=math.hypot(q[0]-tp[0],q[1]-tp[1])
        q2=g(ic,th+3)
        if q2: cI=(dI-math.hypot(q2[0]-tp[0],q2[1]-tp[1]))/0.3
      nearest_at_rel=None
      if t_ and g(t_,th):
        dd=[(math.hypot(g(j,th)[0]-g(t_,th)[0],g(j,th)[1]-g(t_,th)[1]),j) for j in ids if club.get((k,j))!=off and g(j,th)]
        if dd: nearest_at_rel=min(dd)[1]==ic
      OUT.write(json.dumps({'k':'int','defl':defl is not None,'touch':who,'defl_air':((fin-defl)/10) if defl and fin else None,'ic_dist_rel':dI,'ic_close':cI,'ic_nearest':nearest_at_rel,'press':press,'depth':((g(t_,ar)[0]-los)*sg) if t_ and ar and g(t_,ar) else None})+'\n')
