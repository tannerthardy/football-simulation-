# Corner routes, NFL vs sim, one operator. usage:
#   python3 -I corner.py nfl <bdb dir> 1,2,3 > out/corner/nfl.jsonl      (extract BDB CORNER routes, non-PA dropbacks)
#   python3 -I corner.py report out/corner/nfl.jsonl out/corner/sim.jsonl
# A track: frames from the snap at 10 Hz of [downfield yd from the ball, outward yd from the ball (toward his
# sideline), speed]; slot = not the widest route runner on his side at the snap; the targeted receiver's frames end
# at the throw, the others' at the ball's arrival (or 6 s); in the sim, also when he stops running his route.
# Break: nfl_routes.py's rule (first frame >= 0.8 s, speed over the previous 0.2 s >= 2, heading turn > 45 deg between
# the 0.2 s before and after, or speed 0.2-0.4 s later < 60% of the speed before); variant B: turn > 20 deg and >= 5 yd deep.
import csv, sys, json, math, collections
def nfl(D, weeks):
  plays={(r['gameId'],r['playId']) for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE','True','1') and r['playAction'] in ('FALSE','False','0')}
  route={}; tgt={}
  for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k=(r['gameId'],r['playId'])
    if k in plays and r['routeRan'] not in ('','NA') and r['wasRunningRoute'] in ('1','TRUE','True'): route[(k,r['nflId'])]=r['routeRan']
    if r['wasTargettedReceiver'] in ('1','TRUE','True'): tgt[k]=r['nflId']
  keys={k for k,_ in route if route[(k,_)]=='CORNER'}
  for w in weeks:
    P=collections.defaultdict(dict); ev={}; dirn={}; ball={}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
      k=(r['gameId'],r['playId'])
      if k not in keys: continue
      f=int(r['frameId'])
      if r['event'] not in ('','NA'): ev.setdefault(k,{}).setdefault(r['event'],f)
      if r['displayName']=='football': ball[(k,f)]=(float(r['x']),float(r['y'])); continue
      if (k,r['nflId']) not in route: continue
      dirn[k]=r['playDirection']; P[k][(r['nflId'],f)]=(float(r['x']),float(r['y']),float(r['s']))
    for k,T in P.items():
      e=ev.get(k,{}); s0=e.get('ball_snap'); th=e.get('pass_forward')
      if s0 is None or (k,s0) not in ball: continue
      sg=1 if dirn[k]=='right' else -1; bx,by=ball[(k,s0)]
      ids={i for i,_ in T}
      at0={i:T.get((i,s0)) for i in ids}
      for i in ids:
        if route[(k,i)]!='CORNER' or not at0[i]: continue
        side=1 if at0[i][1]>by else -1
        slot=any(j!=i and at0[j] and (1 if at0[j][1]>by else -1)==side and abs(at0[j][1]-by)>abs(at0[i][1]-by)+0.5 for j in ids)
        # The targeted receiver's track ends at the throw (he plays the ball after it); the others run on until the
        # ball arrives (then the play has become something else), or 6 s.
        arr=min([f for n,f in e.items() if n=='pass_arrived' or n.startswith('pass_outcome')] or [s0+60])
        end=th if (th and tgt.get(k)==i) else min(arr,s0+60); fr=[]
        for f in range(s0,end+1):
          p=T.get((i,f))
          if not p: break
          # downfield and outward; on a left-going play the field's y is mirrored relative to the offense's view, but
          # outward (away from the ball, toward his sideline) is measured from the ball either way.
          fr.append([(p[0]-bx)*sg,(p[1]-by)*side,p[2]])
        print(json.dumps({'src':'nfl','game':k[0],'play':k[1],'id':i,'slot':slot,'f':fr}))
def brk(F, mode):
  v=lambda f,a,b: None if f+b>=len(F) or f+a<0 else ((F[f+b][0]-F[f+a][0])/((b-a)/10),(F[f+b][1]-F[f+a][1])/((b-a)/10))
  for f in range(8,len(F)-4):
    v1,v2,v3=v(f,-2,0),v(f,0,2),v(f,2,4)
    if not v1 or not v2 or not v3: continue
    s1=math.hypot(*v1)
    if s1<2: continue
    turn=abs(math.degrees(math.atan2(v1[0]*v2[1]-v1[1]*v2[0], v1[0]*v2[0]+v1[1]*v2[1])))
    if mode=='A' and (turn>45 or math.hypot(*v3)<0.6*s1): return f
    if mode=='B' and F[f][0]>=5 and (turn>20 or math.hypot(*v3)<0.6*s1): return f
  return None
def head(F,a,b):
  if a<0 or b>=len(F): return None
  dx,dy=F[b][0]-F[a][0],F[b][1]-F[a][1]
  return math.degrees(math.atan2(dy,dx)) if math.hypot(dx,dy)>0.3 else None
def depart(F):
  # Rule C, for a rounded turn: the first frame >= 0.8 s and >= 5 yd deep where his heading over the next 0.3 s is
  # more than 10 deg further outward than over the 0.5 s before (the point he leaves his stem).
  for f in range(8,len(F)-3):
    if F[f][0]<5: continue
    h0,h1=head(F,f-5,f),head(F,f,f+3)
    if h0 is None or h1 is None: continue
    if h1-h0>10: return f
  return None
def ang(F,a,b):
  if b>=len(F): return None
  dx,dy=F[b][0]-F[a][0],F[b][1]-F[a][1]
  return math.degrees(math.atan2(dy,dx)) if math.hypot(dx,dy)>0.5 else None
def spd(F,f):
  if 0<f<len(F)-1: return math.hypot(F[f+1][0]-F[f-1][0],F[f+1][1]-F[f-1][1])/0.2
def measure(r, mode):
  F=r['f']; b=depart(F) if mode=='C' else brk(F,mode)
  if b is None: return None
  m={'slot':r['slot'],'depth':F[b][0],'t':b/10,'stem':ang(F,max(0,b-5),b),'a05':ang(F,b,b+5),'a10':ang(F,b,b+10),'a1015':ang(F,b+10,b+15),
     'h3_6':head(F,b+3,b+6),'hmax':max((h for h in (head(F,f,f+3) for f in range(b,min(b+15,len(F)-3))) if h is not None), default=None),
     't30':next(((f-b)/10 for f in range(b,min(b+15,len(F)-3)) if (head(F,f,f+3) or -99)>=30), None),
     'vin':sum(spd(F,f) or 0 for f in range(b-3,b+1))/4,'vmin':min((spd(F,f) for f in range(b,b+6) if spd(F,f) is not None), default=None),'v05':spd(F,b+5)}
  if r.get('src')!='nfl' and len(F[b])>3:
    rq=[math.degrees(math.atan2(F[f][4],F[f][3])) for f in range(b,min(b+6,len(F))) if F[f][3]==F[f][3] and F[f][5]==1]
    m['req05']=sum(rq)/len(rq) if rq else None
    m['req_at_b']=math.degrees(math.atan2(F[b][4],F[b][3])) if F[b][3]==F[b][3] else None
  return m
def q(v,p):
  v=sorted(x for x in v if x is not None)
  return v[int(p*(len(v)-1))] if v else float('nan')
def report(paths):
  for mode in ('A','B','C'):
    print(f"\n## break rule {mode}" + {'A':" (nfl_routes.py: turn > 45 deg or slow-down)",'B':" (turn > 20 deg or slow-down, >= 5 yd deep)",'C':" (departure from the stem: heading 10 deg further out, >= 5 yd deep)"}[mode])
    print("Angles are degrees outward from straight downfield, of his displacement over the window after the break.")
    print("source | align | routes | break found | break depth p50 | break t p50 | stem angle p50 | angle 0-0.5 s p25/50/75 | angle 0-1.0 s p25/50/75 | heading 0.3-0.6 s p50 | max heading in 1.5 s p25/50/75 | time to 30 deg p50 (reached) | speed in p50 | min speed 0-0.5 s p50 | speed at +0.5 s p50 | requested 0-0.5 s p50")
    for path in paths:
      R=[json.loads(l) for l in open(path)]
      src='NFL' if R and R[0].get('src')=='nfl' else 'sim'
      for al in (True,False):
        rs=[r for r in R if r['slot']==al]; M=[m for m in (measure(r,mode) for r in rs) if m]
        g=lambda k,p=.5: q([m.get(k) for m in M],p)
        print(f"{src} | {'slot' if al else 'outside'} | {len(rs)} | {len(M)} | {g('depth'):.1f} | {g('t'):.2f} | {g('stem'):.0f} | {g('a05',.25):.0f}/{g('a05'):.0f}/{g('a05',.75):.0f} | {g('a10',.25):.0f}/{g('a10'):.0f}/{g('a10',.75):.0f} | {g('h3_6'):.0f} | {g('hmax',.25):.0f}/{g('hmax'):.0f}/{g('hmax',.75):.0f} | {g('t30'):.1f} ({sum(m['t30'] is not None for m in M)}) | {g('vin'):.2f} | {g('vmin'):.2f} | {g('v05'):.2f} | {g('req05'):.0f}")
def simconv(path):
  for l in open(path):
    r=json.loads(l); F=[]
    for i,x in enumerate(r['f']):
      if x is None: continue
      if r['targeted'] and r['throwF']>0 and i>r['throwF']: break
      if x[5]!=1: break   # no longer running his route (the play became something else)
      F.append(x)
    print(json.dumps({'src':'sim','slot':r['slot'],'f':F,'rr':r['rr'],'vmax':r['vmax'],'lateral':r['lateral']}))
if sys.argv[1]=='nfl': nfl(sys.argv[2], sys.argv[3].split(','))
elif sys.argv[1]=='sim': simconv(sys.argv[2])
else: report(sys.argv[2:])
