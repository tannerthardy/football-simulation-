# Completed passes (BDB 2025): one record per reception, the same shape as the sim's out/yacrec.ts.
# Frames 0.1 s from the catch (pass_outcome_caught) to the play's end (tackle / out_of_bounds / touchdown / last frame).
# Contact = a defender's centre within 1.0 yd of the carrier (geometric, both sides).
import csv, sys, json, math, collections
D=sys.argv[1]; weeks=sys.argv[2].split(','); out=open(sys.argv[3],'w')
plays={(r['gameId'],r['playId']):r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['passResult']=='C'}
tgt={}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  if r['wasTargettedReceiver'] in ('1','TRUE','True'): tgt[(r['gameId'],r['playId'])]=r['nflId']
for w in weeks:
  P=collections.defaultdict(lambda: collections.defaultdict(dict)); ev={}; dirn={}; club={}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k=(r['gameId'],r['playId'])
    if k not in plays: continue
    f=int(r['frameId'])
    if r['event'] not in ('','NA'): ev.setdefault(k,{}).setdefault(r['event'],f)
    if r['nflId'] in ('','NA'): continue
    dirn[k]=r['playDirection']; club[(k,r['nflId'])]=r['club']
    P[k][r['nflId']][f]=(float(r['x']),float(r['y']),float(r['s']),float(r['dir']) if r['dir'] not in ('','NA') else 0.0)
  for k,T in P.items():
    e=ev.get(k,{}); c=e.get('pass_outcome_caught'); rid=tgt.get(k)
    if c is None or rid not in T or c not in T[rid]: continue
    p=plays[k]; sg=1 if dirn[k]=='right' else -1; off=p['possessionTeam']
    end=min([e[x] for x in ('tackle','out_of_bounds','touchdown','pass_outcome_touchdown','fumble') if x in e and e[x]>=c] or [max(T[rid])])
    los=float(p['absoluteYardlineNumber']); R=T[rid]
    air=(R[c][0]-los)*sg; yac=float(p['yardsGained'] or 0)-air
    defs={i:tr for i,tr in T.items() if club.get((k,i))!=off}
    def vel(tr,f): s,dg=tr[f][2],math.radians(tr[f][3]); return (s*math.sin(dg), s*math.cos(dg))  # NGS dir: 0 = +y
    frames=[]
    for f in range(c,end+1):
      if f not in R: break
      cx,cy=R[f][0],R[f][1]; ds=sorted((math.hypot(tr[f][0]-cx,tr[f][1]-cy),i) for i,tr in defs.items() if f in tr)
      frames.append((f,ds))
    if not frames: continue
    cx,cy=R[c][0],R[c][1]; ds=frames[0][1]
    deeper=sum(1 for i,tr in defs.items() if c in tr and (tr[c][0]-cx)*sg>0)
    nd,ni=ds[0] if ds else (99,None)
    cv=vel(R,c); 
    if ni: dv=vel(defs[ni],c); ux,uy=(cx-defs[ni][c][0])/max(nd,1e-6),(cy-defs[ni][c][1])/max(nd,1e-6); closing=(dv[0]-cv[0])*ux+(dv[1]-cv[1])*uy
    else: closing=0
    first=next(((f,d) for f,d in frames if d and d[0][0]<1.0),None)
    rec={'air':air,'yac':yac,'deeper':deeper,'near':nd,'closing':closing,'n3':sum(1 for d,_ in ds if d<3),'n5':sum(1 for d,_ in ds if d<5),'man':p.get('pff_manZone','')}
    if first:
      f,d=first; rec['tContact']=(f-c)/10; rec['ydsToContact']=(R[f][0]-R[c][0])*sg; rec['afterContact']=(R[end][0]-R[f][0])*sg if end in R else None
      rec['endAfter']=(end-f)/10; rec['n3c']=sum(1 for x,_ in d if x<3)
      sec=next((g for g,dd in frames if g>f and len([1 for x,_ in dd if x<1.0])>=2),None); rec['tSecond']=(sec-c)/10 if sec else None
    else: rec['tContact']=None
    # pursuit of the nearest two at the catch: speed and angle between their velocity and the line to the carrier
    pur=[]
    for d0,i in ds[:2]:
      dv=vel(defs[i],c); s=math.hypot(*dv); ux,uy=cx-defs[i][c][0],cy-defs[i][c][1]; L=math.hypot(ux,uy) or 1
      pur.append((s, math.degrees(math.acos(max(-1,min(1,(dv[0]*ux+dv[1]*uy)/(L*s))))) if s>0.3 else None))
    rec['pursuit']=pur
    # flight: the nearest two at the catch, from the throw to the catch: distance to the catch point and speed toward it
    th=e.get('pass_forward')
    if th is not None and th<c:
      fl=[]
      for d0,i in ds[:2]:
        tr=defs[i]; row=[]
        for f in (th, (th+c)//2, c):
          if f not in tr: row.append(None); continue
          lx,ly=cx-tr[f][0],cy-tr[f][1]; L=math.hypot(lx,ly) or 1; v=vel(tr,f)
          row.append((L,(v[0]*lx+v[1]*ly)/L,math.hypot(*v)))
        fl.append(row)
      rec['flight']=fl; rec['flightT']=(c-th)/10
      i=ds[0][1] if ds else None
      if i:
        tr=defs[i]; prof={}
        for dt in (-6,-4,-2,0,2,4):
          f=th+dt
          if f in tr and f<=c:
            lx,ly=cx-tr[f][0],cy-tr[f][1]; L=math.hypot(lx,ly) or 1; v=vel(tr,f); prof[dt]=((v[0]*lx+v[1]*ly)/L, math.hypot(*v))
        rec['onset']=prof
    out.write(json.dumps(rec)+'\n')
