"""Defenders near the eventual catch point at the throw (3-8 yd): their speed, downfield component and speed toward
the catch point in the first 0.4 s of the ball's flight, sim and NFL, same code (common play format).
  python3 -I flight.py <plays.jsonl.gz> [...]"""
# For defenders 3-8 yd from the catch point at the throw: speed and its components in the first 0.4 s of flight.
for path in sys.argv[1:]:
    sp=[];vx=[];tow=[];k=0
    for l in gzip.open(path,'rt'):
        p=json.loads(l)
        if p.get('kind')!='pass': continue
        ev=p['events']; t=p.get('target'); thr=ev.get('pass_forward'); arr=ev.get('pass_arrived')
        if t is None or thr is None or arr is None: continue
        X=p['xy']; f0=int(round(thr/0.1)); f1=min(len(X)-1,int(round(arr/0.1)))
        if f1-f0<5: continue
        cp=(X[f1][2*t],X[f1][2*t+1])
        for d,a in enumerate(p['players']):
            if a['side']!='D': continue
            P0=(X[f0][2*d],X[f0][2*d+1]); P4=(X[f0+4][2*d],X[f0+4][2*d+1])
            if not 3<=math.dist(P0,cp)<8: continue
            v=((P4[0]-P0[0])/0.4,(P4[1]-P0[1])/0.4); sp.append(math.hypot(*v)); vx.append(v[0])
            u=((cp[0]-P0[0]),(cp[1]-P0[1])); n=math.hypot(*u); tow.append((v[0]*u[0]+v[1]*u[1])/n)
    print(path.split('/')[-1], 'n',len(sp),'speed',round(S.mean(sp),2),'downfield vx',round(S.mean(vx),2),'toward catch',round(S.mean(tow),2),
          'share moving away from the catch point', round(sum(t<0 for t in tow)/len(tow),2))
